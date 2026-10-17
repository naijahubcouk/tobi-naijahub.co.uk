'use strict';
/*
 * Follow-ups: members keep track of people who enquired and get reminded to follow up (free, no AI).
 *   followups/<email>  { items: [...] }
 *
 * Schedule (all adjustable per member and per person):
 *   enquiry logged → follow-up 1 after gaps[0] days (default 2) → follow-up 2 after gaps[1] days (default 7) → stop
 *   "Not now" can set a check-back date
 *   booked → thank-you (+ review link) the next day → keep in touch every keepDays (default 30, monthly)
 * Studio never sends messages itself: it reminds the member and pre-writes the WhatsApp message.
 */
const core = require('./core');
const { HttpError, cas, getJson, enc, cleanText } = core;
const growth = require('./growth');
const prefs = require('./prefs');

const MAX = 500;
const SOURCES = ['Instagram', 'WhatsApp', 'TikTok', 'Facebook', 'Auntie Tobi', 'Referral', 'Website', 'Walk-in', 'Other'];
const STAGES = ['new', 'quoted', 'booked', 'completed', 'notnow', 'lost'];
// What members see: New → Contacted → Quoted → Booked → Completed, or Not now / Lost.
const DISPLAY = ['new', 'contacted', 'quoted', 'booked', 'completed', 'notnow', 'lost'];
const isWon = s => s === 'booked' || s === 'completed';
const KEEP_DAYS = [0, 14, 30, 60, 90, 180, 365];
const KEEP_KINDS = ['ideas', 'rebook'];
const key = email => `followups/${enc(email)}`;

function addDays(day, n) { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function validDate(d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && !isNaN(Date.parse(d)); }
function newId() { return core.randomToken(8).replace(/[^A-Za-z0-9]/g, '').slice(0, 10).padEnd(8, 'x'); }
function cleanGaps(g, fallback) {
  const a = (Array.isArray(g) ? g : []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 60).slice(0, 3);
  return a.length ? a : fallback;
}
function toPence(v) { const n = Number(String(v || '').replace(/[£,\s]/g, '')); return isFinite(n) && n > 0 && n < 1e6 ? Math.round(n * 100) : 0; }

async function defaults(email) {
  const p = await prefs.get(email);
  return {
    gaps: cleanGaps(p.fuGaps, [2, 7]),
    keepDays: KEEP_DAYS.includes(Number(p.fuKeepDays)) ? Number(p.fuKeepDays) : 30,
    keepKind: KEEP_KINDS.includes(p.fuKeepKind) ? p.fuKeepKind : 'ideas',
  };
}

// Works out what is due next for one person.
// UK date of a timestamp (a date on its own is kept as it is).
const ukDate = v => { v = String(v || ''); return v.length > 10 ? core.dayKey(new Date(v)) : v.slice(0, 10); };
function schedule(it) {
  if (it.stage === 'lost') return { nextAt: '', kind: '' };
  if (isWon(it.stage)) {
    const booked = ukDate(it.bookedAt || it.createdAt);
    if (!it.thankSent) return { nextAt: addDays(booked, 1), kind: 'thanks' };
    if (!it.keepDays) return { nextAt: '', kind: '' };
    const base = ukDate(it.lastKeepAt || it.thankSentAt || it.bookedAt || it.createdAt);
    return { nextAt: addDays(base, it.keepDays), kind: 'keep' };
  }
  if (it.stage === 'notnow') return it.checkBackAt ? { nextAt: it.checkBackAt, kind: 'checkback' } : { nextAt: '', kind: '' };
  const step = it.step || 0;
  if (step >= it.gaps.length) return { nextAt: '', kind: '' };
  const base = ukDate(it.lastContactAt || it.createdAt);
  return { nextAt: addDays(base, it.gaps[step]), kind: step === 0 ? 'fu1' : 'fu2' };
}
function withNext(it) {
  const s = schedule(it);
  const nextAt = it.snoozeUntil && s.nextAt && it.snoozeUntil > s.nextAt ? it.snoozeUntil : s.nextAt;
  const display = it.stage === 'new' ? ((it.step || 0) > 0 || it.lastContactAt ? 'contacted' : 'new') : it.stage;
  return { ...it, nextAt, dueKind: s.kind, display };
}

async function load(email) { return (await getJson(key(email))) || { items: [] }; }

async function mutate(email, id, fn) {
  let out = null;
  await cas(key(email), cur => {
    const data = cur || { items: [] };
    const it = data.items.find(x => x.id === id);
    if (!it) throw new HttpError(404, 'not_found', 'That enquiry no longer exists.');
    fn(it, data);
    it.updatedAt = core.nowIso();
    out = it;
    return data;
  });
  return withNext(out);
}

function logEvent(it, what) { it.history = [{ at: core.nowIso(), what }, ...(it.history || [])].slice(0, 25); }

async function add(email, raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const d = await defaults(email);
  const name = cleanText(raw.name, 80);
  if (!name) throw new HttpError(400, 'missing_field', 'Add the customer’s name.');
  const now = core.nowIso();
  const it = {
    id: newId(), name, phone: String(raw.phone || '').replace(/[^\d+]/g, '').slice(0, 16),
    about: cleanText(raw.about, 140), source: SOURCES.includes(raw.source) ? raw.source : 'Other',
    valuePence: toPence(raw.value), notes: cleanText(raw.notes, 500),
    stage: 'new', step: 0, gaps: cleanGaps(raw.gaps, d.gaps),
    keepDays: KEEP_DAYS.includes(Number(raw.keepDays)) ? Number(raw.keepDays) : d.keepDays,
    keepKind: KEEP_KINDS.includes(raw.keepKind) ? raw.keepKind : d.keepKind,
    createdAt: now, updatedAt: now, history: [{ at: now, what: 'Enquiry logged' }],
  };
  await cas(key(email), cur => {
    const data = cur || { items: [] };
    data.items.unshift(it);
    if (data.items.length > MAX) {
      // Drop the oldest finished ones first.
      const done = data.items.map((x, i) => ({ x, i })).filter(o => o.x.stage === 'notnow' || o.x.stage === 'lost' || (isWon(o.x.stage) && !o.x.keepDays)).pop();
      data.items.splice(done ? done.i : data.items.length - 1, 1);
    }
    return data;
  });
  if (raw.countInTrack !== false) await growth.bump(email, 'enquiries').catch(() => {});
  return withNext(it);
}

async function update(email, id, raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  return mutate(email, id, it => {
    if ('name' in raw) { const n = cleanText(raw.name, 80); if (!n) throw new HttpError(400, 'missing_field', 'Add the customer’s name.'); it.name = n; }
    if ('phone' in raw) it.phone = String(raw.phone || '').replace(/[^\d+]/g, '').slice(0, 16);
    if ('about' in raw) it.about = cleanText(raw.about, 140);
    if ('source' in raw) it.source = SOURCES.includes(raw.source) ? raw.source : 'Other';
    if ('value' in raw) it.valuePence = toPence(raw.value);
    if ('notes' in raw) it.notes = cleanText(raw.notes, 500);
    if ('gaps' in raw) { it.gaps = Array.isArray(raw.gaps) && raw.gaps.length === 0 ? [] : cleanGaps(raw.gaps, it.gaps); }
    if ('keepDays' in raw) it.keepDays = KEEP_DAYS.includes(Number(raw.keepDays)) ? Number(raw.keepDays) : it.keepDays;
    if ('keepKind' in raw) it.keepKind = KEEP_KINDS.includes(raw.keepKind) ? raw.keepKind : it.keepKind;
    if ('checkBackAt' in raw) it.checkBackAt = validDate(raw.checkBackAt) ? raw.checkBackAt : '';
  });
}

// The member sent the due message.
async function sent(email, id, kind) {
  return mutate(email, id, it => {
    const now = core.nowIso();
    const k = kind || schedule(it).kind;
    it.snoozeUntil = '';
    if (k === 'thanks') { it.thankSent = true; it.thankSentAt = now; logEvent(it, 'Thank-you sent'); return; }
    if (k === 'keep') { it.lastKeepAt = now; it.keepCount = (it.keepCount || 0) + 1; logEvent(it, 'Keep-in-touch message sent'); return; }
    if (k === 'checkback') { it.stage = 'new'; it.checkBackAt = ''; it.step = it.gaps.length; it.lastContactAt = now; logEvent(it, 'Checked back in'); return; }
    it.lastContactAt = now; it.step = Math.min((it.step || 0) + 1, 9);
    logEvent(it, `Follow-up ${it.step} sent`);
  });
}

async function setStage(email, id, stage, opts) {
  if (!STAGES.includes(stage)) throw new HttpError(400, 'invalid', 'Invalid stage.');
  opts = opts || {};
  let becameBooked = false, recordSale = 0, linkedQuote = '';
  const out = await mutate(email, id, it => {
    if (isWon(stage) && !isWon(it.stage)) { it.bookedAt = core.nowIso(); becameBooked = true; it.thankSent = false; }
    if (isWon(stage) && opts.value !== undefined && opts.value !== '') { const v = toPence(opts.value); if (v) it.valuePence = v; }
    if (stage === 'completed') {
      it.completedAt = core.nowIso();
      const amt = opts.amount !== undefined && opts.amount !== '' ? toPence(opts.amount) : 0;
      if (amt) it.valuePence = amt;
      if (opts.recordSale !== false && !it.saleRecorded && amt) { recordSale = amt; it.saleRecorded = true; linkedQuote = it.quoteId || ''; }
    }
    if (stage === 'quoted' && opts.quoteId) it.quoteId = String(opts.quoteId).slice(0, 20);
    if (stage === 'notnow') it.checkBackAt = validDate(opts.checkBackAt) ? opts.checkBackAt : '';
    if (stage === 'new' || stage === 'quoted') { if (it.stage === 'notnow') it.step = 0; }
    it.stage = stage; it.snoozeUntil = '';
    logEvent(it, { new: 'Moved back to active', quoted: 'Quote sent', booked: 'Booked 🎉', completed: recordSale ? `Completed & paid — £${(recordSale / 100).toFixed(2)} added to Track` : 'Completed ✅', lost: 'Marked as lost', notnow: opts.checkBackAt ? `Not now — check back ${opts.checkBackAt}` : 'Not now' }[stage]);
  });
  if (becameBooked && opts.countInTrack !== false) await growth.bump(email, 'bookings').catch(() => {});
  if (recordSale) {
    // Don't count it twice if the linked quote's invoice was already marked paid (that records the sale itself).
    let already = false;
    if (linkedQuote) {
      const docs = ((await getJson(`money/${enc(email)}`)) || { docs: [] }).docs;
      already = docs.some(d => (d.fromId === linkedQuote || d.id === linkedQuote) && d.saleTracked);
    }
    if (!already) { await growth.bump(email, 'salesCount').catch(() => {}); await growth.bump(email, 'salesGbp', recordSale / 100).catch(() => {}); }
  }
  return out;
}

async function snooze(email, id, days) {
  const n = Math.max(1, Math.min(30, Number(days) || 1));
  return mutate(email, id, it => { it.snoozeUntil = addDays(core.dayKey(), n); });
}

async function remove(email, id) {
  await cas(key(email), cur => {
    if (!cur) return undefined;
    cur.items = cur.items.filter(x => x.id !== id);
    return cur;
  });
}

// Keeps linked quotes in step with Money: quote sent → quoted; invoice paid / receipt → booked.
async function syncWithMoney(email, data) {
  const linked = data.items.filter(it => it.quoteId && !isWon(it.stage) && it.stage !== 'notnow' && it.stage !== 'lost');
  if (!linked.length) return data;
  const docs = ((await getJson(`money/${enc(email)}`)) || { docs: [] }).docs;
  const changes = [];
  for (const it of linked) {
    const q = docs.find(d => d.id === it.quoteId);
    if (!q) continue;
    const inv = docs.find(d => d.fromId === q.id && d.type === 'invoice');
    const paid = (inv && inv.status === 'paid') || docs.some(d => d.type === 'receipt' && (d.fromId === q.id || (inv && d.fromId === inv.id)));
    if (paid) changes.push([it.id, 'booked']);
    else if (it.stage === 'new' && (q.status === 'sent' || inv)) changes.push([it.id, 'quoted']);
  }
  for (const [id, stage] of changes) await setStage(email, id, stage).catch(() => {});
  return changes.length ? load(email) : data;
}

function stats(items, month) {
  const inMonth = items.filter(i => i.createdAt.slice(0, 7) === month);
  const bookedMonth = items.filter(i => isWon(i.stage) && (i.bookedAt || '').slice(0, 7) === month);
  const bySource = {};
  for (const i of inMonth) {
    const s = bySource[i.source] || (bySource[i.source] = { source: i.source, enquiries: 0, booked: 0 });
    s.enquiries++; if (isWon(i.stage)) s.booked++;
  }
  const convertedFromMonth = inMonth.filter(i => isWon(i.stage)).length;
  return {
    month, enquiries: inMonth.length, booked: bookedMonth.length,
    rate: inMonth.length ? Math.round(convertedFromMonth / inMonth.length * 100) : 0,
    bookedValuePence: bookedMonth.reduce((a, i) => a + (i.valuePence || 0), 0),
    bySource: Object.values(bySource).sort((a, b) => b.enquiries - a.enquiries),
  };
}

async function list(email) {
  let data = await load(email);
  data = await syncWithMoney(email, data);
  const day = core.dayKey();
  const items = data.items.map(withNext);
  const due = items.filter(i => i.nextAt && i.nextAt <= day).sort((a, b) => a.nextAt.localeCompare(b.nextAt));
  const pipeline = {}; for (const s of DISPLAY) pipeline[s] = 0; for (const i of items) pipeline[i.display]++;
  return { items, due, pipeline, stats: stats(items, core.monthKey()), defaults: await defaults(email), sources: SOURCES, keepDays: KEEP_DAYS, today: day };
}

async function due(email) {
  const r = await list(email);
  return { due: r.due, linkedQuoteIds: r.items.filter(i => i.quoteId).map(i => i.quoteId) };
}

async function saveDefaults(email, raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const patch = {};
  if ('gaps' in raw) patch.fuGaps = cleanGaps(raw.gaps, [2, 7]);
  if ('keepDays' in raw) patch.fuKeepDays = KEEP_DAYS.includes(Number(raw.keepDays)) ? Number(raw.keepDays) : 30;
  if ('keepKind' in raw) patch.fuKeepKind = KEEP_KINDS.includes(raw.keepKind) ? raw.keepKind : 'ideas';
  await prefs.update(email, patch);
  return defaults(email);
}

module.exports = { add, update, sent, setStage, snooze, remove, list, due, saveDefaults, schedule, SOURCES, KEEP_DAYS, STAGES, DISPLAY };
