'use strict';
/*
 * Quotes, invoices and receipts (free — no AI).
 * Storage per member:
 *   money-settings/<email>  details printed on documents, incl. bank details (private to the member)
 *   money/<email>           { counters: {invoice, quote, receipt}, docs: [...] }  (one blob → atomic numbering)
 * Amounts are stored in pence (integers) to avoid rounding errors.
 */
const core = require('./core');
const { HttpError, cas, getJson, setJson, enc, cleanText } = core;

const TYPES = { invoice: 'INV', quote: 'QUO', receipt: 'REC' };
const STATUSES = ['draft', 'sent', 'paid', 'void'];
const MAX_DOCS = 400, MAX_ITEMS = 30;

function settingsKey(email) { return `money-settings/${enc(email)}`; }
function docsKey(email) { return `money/${enc(email)}`; }

// ───────────── document details (once) ─────────────
async function getSettings(email) { return (await getJson(settingsKey(email))) || null; }

async function saveSettings(email, raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const s = {
    displayName: cleanText(raw.displayName, 80),
    email: cleanText(raw.email, 120),
    phone: cleanText(raw.phone, 30),
    address: cleanText(raw.address, 300),
    bankAccountName: cleanText(raw.bankAccountName, 80),
    sortCode: String(raw.sortCode || '').replace(/[^\d]/g, ''),
    accountNumber: String(raw.accountNumber || '').replace(/[^\d]/g, ''),
    vatNumber: cleanText(raw.vatNumber, 20),
    paymentTermsDays: Number.isInteger(Number(raw.paymentTermsDays)) && Number(raw.paymentTermsDays) >= 0 && Number(raw.paymentTermsDays) <= 120 ? Number(raw.paymentTermsDays) : 14,
    footerNote: cleanText(raw.footerNote, 200),
  };
  if (!s.displayName) throw new HttpError(400, 'missing_field', 'Please add the business name to show on your documents.');
  if (s.email && !core.normalizeEmail(s.email)) throw new HttpError(400, 'invalid_field', 'Email address looks wrong.');
  if (s.sortCode && s.sortCode.length !== 6) throw new HttpError(400, 'invalid_field', 'Sort code should be 6 digits, e.g. 12-34-56.');
  if (s.accountNumber && s.accountNumber.length !== 8) throw new HttpError(400, 'invalid_field', 'Account number should be 8 digits.');
  if (s.sortCode) s.sortCode = s.sortCode.replace(/^(\d{2})(\d{2})(\d{2})$/, '$1-$2-$3');
  s.updatedAt = core.nowIso();
  await setJson(settingsKey(email), s);
  return s;
}

// ───────────── helpers ─────────────
function toPence(v, max) {
  const n = typeof v === 'number' ? v : Number(String(v || '0').replace(/[£,\s]/g, ''));
  if (!isFinite(n) || n < 0 || n > (max || 1000000)) throw new HttpError(400, 'invalid_field', 'Please check the amounts (numbers only, up to £1,000,000).');
  return Math.round(n * 100);
}
function validDate(d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && !isNaN(Date.parse(d)); }

function totals(doc) {
  const subtotal = doc.items.reduce((a, it) => a + Math.round(it.qty * it.pricePence), 0);
  const total = Math.max(0, subtotal + (doc.deliveryPence || 0) - (doc.discountPence || 0));
  return { subtotalPence: subtotal, totalPence: total };
}

function effectiveStatus(doc, today) {
  if (doc.type === 'invoice' && doc.status === 'sent' && doc.dueDate && doc.dueDate < today) return 'overdue';
  return doc.status;
}

function cleanDoc(raw, existing, settings) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const type = existing ? existing.type : raw.type;
  if (!TYPES[type]) throw new HttpError(400, 'invalid', 'Choose quote, invoice or receipt.');
  const today = core.dayKey();
  const items = (Array.isArray(raw.items) ? raw.items : []).slice(0, MAX_ITEMS).map(it => ({
    desc: cleanText(it && it.desc, 200),
    qty: (() => { const q = Number(it && it.qty); if (!isFinite(q) || q <= 0 || q > 100000) throw new HttpError(400, 'invalid_field', 'Quantities must be more than 0.'); return Math.round(q * 100) / 100; })(),
    pricePence: toPence(it && it.price),
  })).filter(it => it.desc);
  if (!items.length) throw new HttpError(400, 'missing_field', 'Add at least one item with a description.');
  const customer = {
    name: cleanText(raw.customer && raw.customer.name, 100),
    phone: String((raw.customer && raw.customer.phone) || '').replace(/[^\d+]/g, '').slice(0, 16),
    email: cleanText(raw.customer && raw.customer.email, 120),
  };
  if (!customer.name) throw new HttpError(400, 'missing_field', 'Add the customer’s name.');
  const issueDate = validDate(raw.issueDate) ? raw.issueDate : (existing && existing.issueDate) || today;
  let dueDate = validDate(raw.dueDate) ? raw.dueDate : '';
  if (type === 'invoice' && !dueDate) {
    const d = new Date(`${issueDate}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + ((settings && settings.paymentTermsDays) ?? 14));
    dueDate = d.toISOString().slice(0, 10);
  }
  if (type === 'receipt') dueDate = '';
  return {
    customer, items,
    deliveryPence: toPence(raw.delivery), discountPence: toPence(raw.discount),
    issueDate, dueDate, notes: cleanText(raw.notes, 500),
    paidMethod: type === 'receipt' ? cleanText(raw.paidMethod, 40) || 'Bank transfer' : (existing && existing.paidMethod) || '',
  };
}

function withTotals(doc, today) {
  return { ...doc, ...totals(doc), displayStatus: effectiveStatus(doc, today) };
}

function newId() { return `${Date.now().toString(36)}${core.randomToken(4).replace(/[^A-Za-z0-9]/g, '')}`.slice(0, 20); }

function trim(docs) {
  if (docs.length <= MAX_DOCS) return docs;
  // Remove the oldest finished documents (paid, void, receipts) first.
  const removable = docs.map((d, i) => ({ d, i })).filter(x => ['paid', 'void'].includes(x.d.status) || x.d.type === 'receipt').sort((a, b) => a.d.createdAt.localeCompare(b.d.createdAt));
  const drop = new Set(removable.slice(0, docs.length - MAX_DOCS).map(x => x.d.id));
  const out = docs.filter(d => !drop.has(d.id));
  if (out.length > MAX_DOCS) throw new HttpError(409, 'too_many', 'You have a lot of open documents — mark some as paid or delete old drafts first.');
  return out;
}

// ───────────── documents ─────────────
async function list(email) {
  const today = core.dayKey();
  const data = (await getJson(docsKey(email))) || { counters: {}, docs: [] };
  const docs = data.docs.map(d => withTotals(d, today)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unpaid = docs.filter(d => d.type === 'invoice' && (d.status === 'sent' || d.status === 'draft'));
  return {
    docs: docs.map(d => ({ id: d.id, type: d.type, number: d.number, customerName: d.customer.name, totalPence: d.totalPence, status: d.displayStatus, issueDate: d.issueDate, dueDate: d.dueDate })),
    unpaidPence: unpaid.filter(d => d.status === 'sent').reduce((a, d) => a + d.totalPence, 0),
    overdueCount: docs.filter(d => d.displayStatus === 'overdue').length,
    draftCount: docs.filter(d => d.status === 'draft').length,
  };
}

async function get(email, id) {
  const data = (await getJson(docsKey(email))) || { docs: [] };
  const d = data.docs.find(x => x.id === id);
  if (!d) throw new HttpError(404, 'not_found', 'That document no longer exists.');
  return withTotals(d, core.dayKey());
}

async function save(email, raw) {
  const settings = await getSettings(email);
  const id = raw && raw.id ? String(raw.id).slice(0, 20) : null;
  let saved = null, newSale = false;
  await cas(docsKey(email), cur => {
    const data = cur || { counters: {}, docs: [] };
    data.counters = data.counters || {};
    const now = core.nowIso();
    if (id) {
      const i = data.docs.findIndex(d => d.id === id);
      if (i < 0) throw new HttpError(404, 'not_found', 'That document no longer exists.');
      const existing = data.docs[i];
      if (existing.status === 'void') throw new HttpError(409, 'void', 'This document was cancelled.');
      saved = { ...existing, ...cleanDoc(raw, existing, settings), updatedAt: now };
      data.docs[i] = saved;
    } else {
      const type = raw && raw.type;
      const fields = cleanDoc(raw, null, settings);
      const n = (data.counters[type] || 0) + 1;
      data.counters[type] = n;
      saved = { id: newId(), type, number: `${TYPES[type]}-${String(n).padStart(4, '0')}`, status: type === 'receipt' ? 'paid' : 'draft', ...fields,
        fromId: raw.fromId ? String(raw.fromId).slice(0, 20) : '', createdAt: now, updatedAt: now, paidAt: type === 'receipt' ? now : '' };
      // A receipt on its own is a sale; a receipt made from an invoice is counted when that invoice is marked paid.
      if (type === 'receipt' && !(saved.fromId && data.docs.some(d => d.id === saved.fromId && d.type === 'invoice'))) { saved.saleTracked = true; newSale = true; }
      data.docs.push(saved);
      data.docs = trim(data.docs);
    }
    return data;
  });
  const full = withTotals(saved, core.dayKey());
  if (newSale) await recordSale(email, full.totalPence);
  return full;
}

async function setStatus(email, id, status) {
  if (!STATUSES.includes(status)) throw new HttpError(400, 'invalid', 'Invalid status.');
  let out = null, trackSale = false;
  await cas(docsKey(email), cur => {
    if (!cur) throw new HttpError(404, 'not_found', 'That document no longer exists.');
    const i = cur.docs.findIndex(d => d.id === id);
    if (i < 0) throw new HttpError(404, 'not_found', 'That document no longer exists.');
    const d = cur.docs[i];
    if (d.type === 'receipt' && status !== 'paid' && status !== 'void') throw new HttpError(400, 'invalid', 'A receipt is always paid.');
    if (d.type === 'quote' && status === 'paid') throw new HttpError(400, 'invalid', 'Turn the quote into an invoice to record payment.');
    out = { ...d, status, paidAt: status === 'paid' ? (d.paidAt || core.nowIso()) : '', updatedAt: core.nowIso() };
    if (status === 'paid' && d.type === 'invoice' && !d.saleTracked) { out.saleTracked = true; trackSale = true; }
    cur.docs[i] = out;
    return cur;
  });
  const full = withTotals(out, core.dayKey());
  if (trackSale) await recordSale(email, full.totalPence);
  return full;
}
// A paid invoice (or a receipt on its own) is added to Track automatically: 1 sale + the amount.
async function recordSale(email, pence) {
  const growth = require('./growth');
  await growth.bump(email, 'salesCount').catch(() => {});
  if (pence > 0) await growth.bump(email, 'salesGbp', pence / 100).catch(() => {});
}

// quote → invoice, invoice → receipt (marks the invoice paid)
async function convert(email, id) {
  const src = await get(email, id);
  const next = src.type === 'quote' ? 'invoice' : src.type === 'invoice' ? 'receipt' : null;
  if (!next) throw new HttpError(400, 'invalid', 'A receipt can’t be converted.');
  const raw = {
    type: next, fromId: src.id, customer: src.customer, notes: src.notes,
    items: src.items.map(it => ({ desc: it.desc, qty: it.qty, price: it.pricePence / 100 })),
    delivery: src.deliveryPence / 100, discount: src.discountPence / 100,
    issueDate: core.dayKey(),
  };
  const created = await save(email, raw);
  if (src.type === 'invoice') await setStatus(email, src.id, 'paid');
  if (src.type === 'quote' && src.status === 'draft') await setStatus(email, src.id, 'sent');
  return created;
}

async function remove(email, id) {
  await cas(docsKey(email), cur => {
    if (!cur) return undefined;
    const d = cur.docs.find(x => x.id === id);
    if (!d) return undefined;
    if (d.status !== 'draft') throw new HttpError(409, 'not_draft', 'Only drafts can be deleted. Mark it as cancelled instead.');
    cur.docs = cur.docs.filter(x => x.id !== id);
    return cur;
  });
}


// "I've sent a reminder" / "remind me later" — hides the Today reminder for 3 days.
async function markReminded(email, id) {
  await cas(docsKey(email), cur => {
    if (!cur) throw new HttpError(404, 'not_found', 'That document no longer exists.');
    const d = cur.docs.find(x => x.id === id);
    if (!d) throw new HttpError(404, 'not_found', 'That document no longer exists.');
    d.remindedAt = core.nowIso();
    return cur;
  });
  return { ok: true };
}

// Things to chase, for the Today screen and the weekly email.
async function reminders(email, opts) {
  const today = core.dayKey();
  const data = (await getJson(docsKey(email))) || { docs: [] };
  const fresh = d => (opts && opts.all) || !d.remindedAt || Date.now() - Date.parse(d.remindedAt) > 3 * core.DAY;
  const converted = new Set(data.docs.filter(d => d.fromId).map(d => d.fromId));
  const soon = (() => { const x = new Date(`${today}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + 2); return x.toISOString().slice(0, 10); })();
  const out = [];
  for (const raw of data.docs) {
    const d = withTotals(raw, today);
    if (d.status === 'void' || !fresh(d)) continue;
    let kind = null;
    if (d.displayStatus === 'overdue') kind = 'overdue';
    else if (d.type === 'invoice' && d.status === 'sent' && d.dueDate && d.dueDate <= soon) kind = 'due';
    else if (d.type === 'quote' && d.status === 'sent' && !converted.has(d.id) && Date.now() - Date.parse(d.updatedAt || d.createdAt) > 3 * core.DAY) kind = 'quote';
    if (kind) out.push({ kind, doc: { id: d.id, type: d.type, number: d.number, customer: d.customer, totalPence: d.totalPence, dueDate: d.dueDate, issueDate: d.issueDate, displayStatus: d.displayStatus } });
  }
  const rank = { overdue: 0, due: 1, quote: 2 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || (a.doc.dueDate || a.doc.issueDate).localeCompare(b.doc.dueDate || b.doc.issueDate));
}

// Customer list built from documents (no separate data entry).
async function customers(email) {
  const data = (await getJson(docsKey(email))) || { docs: [] };
  const byId = new Map(data.docs.map(d => [d.id, d]));
  const groups = new Map();
  for (const raw of data.docs) {
    if (raw.status === 'void') continue;
    const d = withTotals(raw, core.dayKey());
    const phone = String(d.customer.phone || '').replace(/\D/g, '').replace(/^0/, '44');
    const k = phone || `n:${String(d.customer.name || '').trim().toLowerCase()}`;
    if (k === 'n:') continue;
    const g = groups.get(k) || { key: k, name: '', phone: '', email: '', orders: 0, spentPence: 0, unpaidPence: 0, quotes: 0, first: d.issueDate, last: d.issueDate, lastItem: '', lastDocId: '' };
    if (!g.last || d.issueDate >= g.last) { g.last = d.issueDate; g.name = d.customer.name || g.name; g.lastItem = (d.items[0] && d.items[0].desc) || ''; g.lastDocId = d.id; }
    if (!g.phone && d.customer.phone) g.phone = d.customer.phone;
    if (!g.email && d.customer.email) g.email = d.customer.email;
    if (!g.name) g.name = d.customer.name;
    if (d.issueDate < g.first) g.first = d.issueDate;
    if (d.type === 'quote') g.quotes++;
    if (d.type === 'invoice' && d.status !== 'draft') { g.orders++; if (d.status === 'paid') g.spentPence += d.totalPence; else g.unpaidPence += d.totalPence; }
    if (d.type === 'receipt') { const src = d.fromId && byId.get(d.fromId); if (!src || src.type !== 'invoice') { g.orders++; g.spentPence += d.totalPence; } }
    groups.set(k, g);
  }
  return [...groups.values()].sort((a, b) => b.last.localeCompare(a.last));
}

module.exports = { getSettings, saveSettings, list, get, save, setStatus, convert, remove, markReminded, reminders, customers, TYPES };
