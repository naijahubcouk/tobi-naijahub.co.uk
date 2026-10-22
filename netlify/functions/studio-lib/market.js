'use strict';
/*
 * Auntie Tobi Marketplace — listings with admin review.
 *   market/listing/<id>  { id, source: member|public|admin, owner, contact, live, draft, state, note, pinned, hidden, ... }
 *     live  = the version on the Marketplace now (or null)
 *     draft = a submitted version waiting for review (or null). While a change is reviewed, `live` stays up.
 *     state = '' | 'pending' | 'changes' | 'rejected'   (review state of the draft)
 *   market-img/<imgId>   { dataUrl, mime }   photos resized on the phone (≤ ~280 KB each)
 *   market/allowance     { <email>: n }      extra listings the admin has allowed (default 1 per Club member)
 *   market/seeded        set once the 11 original hard-coded products have been imported
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, cas, getJson, setJson, enc, cleanText } = core;

const CATS = ['Events', 'Hair', 'Gift Hamper', 'Digital Product', 'Food', 'Beauty', 'Fashion', 'Services', 'Other'];
const EMOJI = { Events: '🎉', Hair: '💇🏾‍♀️', 'Gift Hamper': '🎁', 'Digital Product': '💻', Food: '🍲', Beauty: '💄', Fashion: '👗', Services: '🛠️', Other: '🛍️' };
const BUTTONS = ['Buy Now', 'Book Now', '🎟️ Get Tickets', 'Enquire', 'Learn More'];
const MAX_IMGS = 4;
const lkey = id => `market/listing/${id}`;
const ikey = id => `market-img/${id}`;
const newId = p => `${p}${crypto.randomBytes(6).toString('hex')}`;
const isImgId = v => /^i_[a-f0-9]{12}$/.test(String(v || ''));
const isCdnImg = v => /^https:\/\/naijabiz\.b-cdn\.net\/[^\s"'<>\\]{3,400}$/.test(String(v || ''));
const today = () => core.dayKey();

function httpsLink(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  let u; try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { u = null; }
  if (!u || u.protocol !== 'https:' || !u.hostname.includes('.') || s.length > 500 || /["'<>\s\\]/.test(u.toString())) throw new HttpError(400, 'invalid_link', 'Please paste the full web link (it should start with https://).');
  return u.toString();
}
// Companies House: a GOV.UK company page link or a company number → the 8-character number ('' if empty).
const CH_HOSTS = ['find-and-update.company-information.service.gov.uk', 'beta.companieshouse.gov.uk', 'www.gov.uk'];
function chNumber(v) {
  let s = String(v || '').trim();
  if (!s) return '';
  const bad = () => { throw new HttpError(400, 'invalid_companies_house', 'Please paste your company’s page from GOV.UK (find-and-update.company-information.service.gov.uk/company/…) or your 8-character company number.'); };
  if (/[./]/.test(s)) {
    let u; try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { bad(); }
    if (!CH_HOSTS.includes(u.hostname.toLowerCase())) bad();
    const m = u.pathname.match(/\/company\/([A-Za-z0-9]{6,8})(?:\/|$)/);
    if (!m) bad();
    s = m[1];
  }
  s = s.replace(/\s+/g, '').toUpperCase();
  if (/^\d{6,8}$/.test(s)) s = s.padStart(8, '0');
  if (!/^(?:\d{8}|[A-Z]{2}\d{6})$/.test(s)) bad();
  return s;
}
const chUrl = n => (n ? `https://find-and-update.company-information.service.gov.uk/company/${n}` : '');

function waNumber(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('07') && d.length === 11) d = `44${d.slice(1)}`;
  if (d.length < 10 || d.length > 15) throw new HttpError(400, 'invalid_whatsapp', 'Please check the WhatsApp number (for example 07700 900123).');
  return d;
}

// Validates what a member, the public or the admin typed. Returns clean fields.
function clean(raw, opts) {
  raw = raw && typeof raw === 'object' ? raw : {};
  opts = opts || {};
  const bad = m => { throw new HttpError(400, 'invalid', m); };
  const f = {
    business: cleanText(raw.business, 80),
    name: cleanText(raw.name, 100),
    category: CATS.includes(raw.category) ? raw.category : '',
    price: cleanText(raw.price, 24),
    desc: cleanText(raw.desc, 600),
    btnText: BUTTONS.includes(raw.btnText) ? raw.btnText : 'Enquire',
    link: httpsLink(raw.link),
    wa: waNumber(raw.wa),
    endsAt: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.endsAt || '')) ? raw.endsAt : '',
    bizSlug: /^[a-z0-9-]{2,120}$/.test(String(raw.bizSlug || '')) ? raw.bizSlug : '',
    imgs: (Array.isArray(raw.imgs) ? raw.imgs : []).filter(v => isImgId(v) || isCdnImg(v)).slice(0, MAX_IMGS),
  };
  if (!f.business) bad('Please add your business name.');
  if (f.name.length < 3) bad('Please add the name of your product or service.');
  if (!f.category) bad('Please choose a category.');
  if (f.desc.length < 10) bad('Please add a short description (a sentence or two).');
  if (!f.link && !f.wa) bad('Add a web link or a WhatsApp number so customers can reach you.');
  if (f.endsAt && f.endsAt < today() && !opts.allowPast) bad('The end date has already passed.');
  if (!f.imgs.length && !opts.allowNoImg) bad('Please add at least one photo.');
  return f;
}

// Stores a resized photo; returns its id.
async function saveImage(dataUrl, owner) {
  const url = String(dataUrl || '');
  const m = url.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || url.length > 380000) throw new HttpError(400, 'invalid_image', 'Please choose a photo (it’s resized automatically).');
  const bytes = Buffer.from(m[2].slice(0, 24), 'base64');
  const magic = { png: [0x89, 0x50, 0x4e, 0x47], jpeg: [0xff, 0xd8, 0xff], webp: [0x52, 0x49, 0x46, 0x46] }[m[1]];
  if (!magic.every((b, i) => bytes[i] === b)) throw new HttpError(400, 'invalid_image', 'That file doesn’t look like an image.');
  const id = newId('i_');
  await setJson(ikey(id), { dataUrl: url, mime: `image/${m[1]}`, owner: owner || '', at: core.nowIso() });
  return id;
}
async function getImage(id) { return isImgId(id) ? getJson(ikey(id)) : null; }
async function dropUnused(before, rec) {
  const keep = new Set([...(rec && rec.live ? rec.live.imgs : []), ...(rec && rec.draft ? rec.draft.imgs : [])]);
  for (const i of before) if (isImgId(i) && !keep.has(i)) await core.del(ikey(i)).catch(() => {});
}
const imgsOf = r => [...(r && r.live ? r.live.imgs : []), ...(r && r.draft ? r.draft.imgs : [])];

// ── seed: the products that used to be hard-coded ──
async function ensureSeed() {
  if (await getJson('market/seeded')) return;
  const seed = require('./market-seed');
  for (const p of seed) {
    await cas(lkey(p.id), cur => {
      if (cur) return undefined;
      let endsAt = '';
      if (p.expires) { const d = new Date(`${p.expires}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); endsAt = d.toISOString().slice(0, 10); }
      const live = { business: p.business, name: p.name, category: CATS.includes(p.category) ? p.category : 'Other', price: p.price, desc: p.desc, btnText: BUTTONS.includes(p.btnText) ? p.btnText : 'Enquire', link: p.link, wa: p.wa, endsAt, bizSlug: p.bizSlug, imgs: p.imgs };
      return { id: p.id, source: 'admin', owner: '', contact: {}, live, draft: null, state: '', note: '', pinned: false, hidden: false, createdAt: core.nowIso(), approvedAt: core.nowIso(), updatedAt: core.nowIso(), imported: true };
    });
  }
  await setJson('market/seeded', { at: core.nowIso(), count: seed.length });
}

// One-off removals of past seeded listings (e.g. the Mamaki 3.0 event, Oct 2026).
const RETIRED = ['mp10'];
async function retireOld() {
  if (await getJson('market/retired-v1')) return;
  for (const id of RETIRED) await core.del(lkey(id)).catch(() => {});
  await setJson('market/retired-v1', { at: core.nowIso(), ids: RETIRED });
}
// One-off: when the Services category was added (Oct 2026), move the web design listing into it.
const WEB_DESIGN = /\bweb\s*(site\s*)?design/i;
async function recatServices() {
  if (await getJson('market/recat-services-v1')) return;
  const moved = [];
  for (const k of await core.listKeys('market/listing/')) {
    await cas(k, cur => {
      if (!cur) return undefined;
      const hit = x => x && (WEB_DESIGN.test(x.name || '') || WEB_DESIGN.test(x.business || ''));
      if (!hit(cur.live) && !hit(cur.draft)) return undefined;
      moved.push(cur.id);
      return { ...cur, ...(cur.live ? { live: { ...cur.live, category: 'Services' } } : {}), ...(cur.draft ? { draft: { ...cur.draft, category: 'Services' } } : {}) };
    });
  }
  await setJson('market/recat-services-v1', { at: core.nowIso(), ids: moved });
}

async function all() {
  await ensureSeed();
  await retireOld();
  await recatServices();
  const keys = await core.listKeys('market/listing/');
  const out = [];
  for (let i = 0; i < keys.length; i += 10) out.push(...(await Promise.all(keys.slice(i, i + 10).map(k => getJson(k)))));
  return out.filter(Boolean);
}
async function get(id) {
  if (!/^[A-Za-z0-9_]{2,40}$/.test(String(id || ''))) throw new HttpError(400, 'bad_id', 'Invalid listing.');
  await ensureSeed();
  return getJson(lkey(id));
}

// What a listing looks like right now, in one word.
function status(r) {
  if (r.draft && r.state === 'pending') return r.live ? 'live_change_pending' : 'pending';
  if (r.draft && r.state === 'changes') return r.live ? 'live_changes_requested' : 'changes';
  if (!r.live) return r.state === 'rejected' ? 'rejected' : 'draft';
  if (r.hidden) return 'hidden';
  if (r.live.endsAt && r.live.endsAt < today()) return 'ended';
  return 'live';
}

// ── allowance: 1 listing per Club member, more if the admin allows ──
async function allowanceOf(email) { const a = (await getJson('market/allowance')) || {}; return Number.isInteger(a[email]) ? a[email] : 1; }
async function setAllowance(email, n) {
  n = Number(n);
  if (!Number.isInteger(n) || n < 0 || n > 50) throw new HttpError(400, 'invalid', 'Choose a number from 0 to 50.');
  await cas('market/allowance', cur => { const a = { ...(cur || {}) }; if (n === 1) delete a[email]; else a[email] = n; return a; });
  return n;
}
const counts = r => !(r.state === 'rejected' && !r.live);
async function mine(email) {
  const list = (await all()).filter(r => r.owner === email);
  const allowance = await allowanceOf(email);
  const used = list.filter(counts).length;
  return { listings: list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).map(r => forOwner(r)), allowance, used, canAdd: used < allowance };
}
function forOwner(r) {
  return { id: r.id, status: status(r), live: r.live, draft: r.draft, link: r.link || null, note: r.state === 'changes' || r.state === 'rejected' ? r.note || '' : '', submittedAt: r.submittedAt || '', approvedAt: r.approvedAt || '' };
}

// Member creates or edits their listing → goes to review. A live version stays up meanwhile.
async function memberSave(email, member, id, raw, link) {
  const fields = clean(raw);
  let out, before = [];
  if (!id) {
    const m = await mine(email);
    if (!m.canAdd) throw new HttpError(403, 'limit', m.allowance === 1 ? 'Your Business Club membership includes one Marketplace listing. You can edit it any time — or ask Auntie Tobi about adding another.' : `You can have up to ${m.allowance} listings. Edit one of them, or ask Auntie Tobi about adding another.`);
    id = newId('l_');
    out = { id, source: 'member', owner: email, contact: { email, name: member.name || '' }, live: null, draft: fields, link: link || null, state: 'pending', note: '', pinned: false, hidden: false, createdAt: core.nowIso(), submittedAt: core.nowIso(), updatedAt: core.nowIso() };
    await setJson(lkey(id), out);
  } else {
    await cas(lkey(id), cur => {
      if (!cur || cur.owner !== email) throw new HttpError(404, 'not_found', 'Listing not found.');
      before = imgsOf(cur);
      out = { ...cur, draft: fields, link: link || null, state: 'pending', note: '', submittedAt: core.nowIso(), updatedAt: core.nowIso() };
      return out;
    });
    await dropUnused(before, out);
  }
  return out;
}

// Member withdraws a pending change (keeps the live version) or deletes their listing.
async function memberWithdraw(email, id) {
  let before = [], out = null, deleted = false;
  await cas(lkey(id), cur => {
    if (!cur || cur.owner !== email) throw new HttpError(404, 'not_found', 'Listing not found.');
    before = imgsOf(cur);
    if (!cur.live) { deleted = true; return undefined; }
    out = { ...cur, draft: null, state: '', note: '', updatedAt: core.nowIso() };
    return out;
  });
  if (deleted) await core.del(lkey(id));
  await dropUnused(before, out);
  return { deleted };
}
async function memberRemove(email, id) {
  const cur = await get(id);
  if (!cur || cur.owner !== email) throw new HttpError(404, 'not_found', 'Listing not found.');
  await core.del(lkey(id));
  await dropUnused(imgsOf(cur), null);
  return { ok: true };
}

// Anyone with the link: submitted after confirming their email.
async function publicCreate(contactRaw, raw, imgIds, link) {
  const contact = {
    name: cleanText(contactRaw && contactRaw.name, 80),
    email: core.normalizeEmail(contactRaw && contactRaw.email),
    whatsapp: String((contactRaw && contactRaw.whatsapp) || '').replace(/[^\d+ ]/g, '').slice(0, 20),
    instagram: cleanText(contactRaw && contactRaw.instagram, 60).replace(/^@/, ''),
  };
  if (!contact.name) throw new HttpError(400, 'invalid', 'Please add your name.');
  const fields = clean({ ...raw, imgs: imgIds });
  const id = newId('l_');
  const rec = { id, source: 'public', owner: '', contact, live: null, draft: fields, link: link || null, state: 'pending', note: '', pinned: false, hidden: false, createdAt: core.nowIso(), submittedAt: core.nowIso(), updatedAt: core.nowIso() };
  await setJson(lkey(id), rec);
  return rec;
}

// ── admin ──
async function adminSave(id, raw, meta, link) {
  meta = meta || {};
  const fields = clean(raw, { allowPast: true });
  let out, before = [];
  if (!id) {
    id = newId('l_');
    out = { id, source: 'admin', owner: '', contact: {}, live: fields, draft: null, link: link || null, state: '', note: '', pinned: false, hidden: false, createdAt: core.nowIso(), approvedAt: core.nowIso(), updatedAt: core.nowIso() };
    applyMeta(out, meta);
    await setJson(lkey(id), out);
    return out;
  }
  await cas(lkey(id), cur => {
    if (!cur) throw new HttpError(404, 'not_found', 'Listing not found.');
    before = imgsOf(cur);
    out = { ...cur, updatedAt: core.nowIso() };
    // Edits apply to what's waiting for review if there is one, otherwise straight to the live version.
    if (out.draft && (out.state === 'pending' || out.state === 'changes')) out.draft = fields; else out.live = fields;
    if (link !== undefined) out.link = link;
    applyMeta(out, meta);
    return out;
  });
  await dropUnused(before, out);
  return out;
}
function applyMeta(r, meta) {
  if ('pinned' in meta) r.pinned = !!meta.pinned;
  if ('hidden' in meta) r.hidden = !!meta.hidden;
  if ('owner' in meta) {
    const o = meta.owner ? core.normalizeEmail(meta.owner) : '';
    if (meta.owner && !o) throw new HttpError(400, 'invalid', 'That owner email doesn’t look right.');
    r.owner = o;
    if (o && r.source === 'admin') r.source = 'admin';
  }
}

async function review(id, decision, note) {
  let out, before = [], wasLive = false;
  await cas(lkey(id), cur => {
    if (!cur) throw new HttpError(404, 'not_found', 'Listing not found.');
    if (!cur.draft) throw new HttpError(409, 'nothing_to_review', 'There’s nothing waiting for review on this listing.');
    before = imgsOf(cur); wasLive = !!cur.live;
    out = { ...cur, updatedAt: core.nowIso(), reviewedAt: core.nowIso() };
    if (decision === 'approve') { out.live = cur.draft; out.draft = null; out.state = ''; out.note = ''; out.approvedAt = core.nowIso(); out.hidden = false; }
    else if (decision === 'changes') { out.state = 'changes'; out.note = cleanText(note, 600); }
    else if (decision === 'reject') {
      out.note = cleanText(note, 600);
      if (cur.live) { out.draft = null; out.state = ''; out.lastRejectNote = out.note; } else out.state = 'rejected';
    } else throw new HttpError(400, 'invalid', 'Invalid decision.');
    return out;
  });
  await dropUnused(before, out);
  return { listing: out, wasLive };
}
async function adminDelete(id) {
  const cur = await get(id);
  if (!cur) throw new HttpError(404, 'not_found', 'Listing not found.');
  await core.del(lkey(id));
  await dropUnused(imgsOf(cur), null);
}

// ── public feed (same shape the Marketplace page and the app already use) ──
const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function imgUrl(ref) { return isImgId(ref) ? `/.netlify/functions/studio-market?img=${ref}` : ref; }
function toCard(r) {
  const f = r.live;
  const imgs = f.imgs.map(imgUrl);
  let expires = '';
  if (f.endsAt) { const d = new Date(`${f.endsAt}T23:59:00Z`); expires = d.toISOString(); }
  return {
    id: r.id, name: escH(f.name), shortName: escH(f.name), business: escH(f.business), bizSlug: f.bizSlug, category: f.category, emoji: EMOJI[f.category] || '🛍️',
    img: imgs[0] || '', imgs, price: escH(f.price), desc: escH(f.desc), link: f.link, btnText: escH(f.btnText), wa: f.wa, expires, pinned: !!r.pinned,
  };
}
async function feed() {
  const settings = await core.getSettings();
  const t = today();
  const list = (await all()).filter(r => r.live && !r.hidden && !(r.live.endsAt && r.live.endsAt < t));
  const out = [];
  for (const r of list) {
    if (r.source === 'member') {
      const m = r.owner ? await core.getMember(r.owner) : null;
      if (!m || !core.access(m, settings).membershipActive) continue; // member listings show while their Club membership is active
    }
    out.push(r);
  }
  out.sort((a, b) => (b.pinned - a.pinned) || (b.approvedAt || '').localeCompare(a.approvedAt || ''));
  return out.map(toCard);
}

module.exports = {
  chNumber, chUrl,
  CATS, BUTTONS, EMOJI, MAX_IMGS, clean, saveImage, getImage, all, get, status, mine, forOwner, memberSave, memberWithdraw, memberRemove,
  publicCreate, adminSave, review, adminDelete, allowanceOf, setAllowance, feed, toCard, ensureSeed, isImgId,
};
