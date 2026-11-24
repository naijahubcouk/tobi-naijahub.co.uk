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

// One-off listings added for the admin by the developer (the photo is fetched from the seller's own site once and stored here).
const ADDED = [
  { id: 'l_abbycookware1', key: 'market/added-abby-cookware',
    live: { business: 'Abbystore', name: 'MGC Ceramic Coating Cookware Set', category: 'Other', price: '£115',
      desc: 'A stylish non-stick ceramic coating cookware set for everyday cooking — food doesn’t stick and cleaning up is easy. Durable, with comfortable handles. Great for frying eggs and fish, soups, sauces, stews, pasta and noodles.',
      btnText: 'Buy Now', link: 'https://abbystoreltd.com/product/mgc-ceramic-coating-cookware-set/', wa: '447761572072', endsAt: '', bizSlug: 'abbystoreltd', imgs: [] },
    photos: ['https://abbystoreltd.com/wp-content/uploads/2026/10/IMG_20261011_065730_514-1-600x600.jpg',
      'https://abbystoreltd.com/wp-content/uploads/2026/10/IMG_20261011_065730_514-1-768x768.jpg',
      'https://abbystoreltd.com/wp-content/uploads/2026/10/IMG_20261011_065730_514-1.jpg',
      'https://abbystoreltd.com/wp-content/uploads/2026/10/IMG_20261011_065730_514-1-300x300.jpg'] },
];
async function fetchPhoto(url) {
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'AuntieTobiBot/1.0 (+https://auntietobi.co.uk)' } }).finally(() => clearTimeout(t));
    const type = ((r.headers.get('content-type') || '').match(/image\/(jpeg|png|webp)/) || [])[1];
    if (!r.ok || !type) return '';
    const buf = Buffer.from(await r.arrayBuffer());
    const dataUrl = `data:image/${type};base64,${buf.toString('base64')}`;
    return dataUrl.length <= 380000 ? dataUrl : '';
  } catch (_) { return ''; }
}
async function addListings() {
  for (const a of ADDED) {
    const done = await getJson(a.key);
    if (done && done.ok) continue;
    const tries = (done && done.tries) || 0;
    if (done && done.at && Date.now() - Date.parse(done.at) < 10 * 60 * 1000) continue; // wait 10 minutes between tries
    let img = '';
    for (const u of a.photos) { img = await fetchPhoto(u); if (img) break; }
    if (!img && tries < 5) { await setJson(a.key, { tries: tries + 1, at: core.nowIso() }); continue; } // try again later
    const imgs = img ? [await saveImage(img, 'admin:seed')] : [];
    await cas(lkey(a.id), cur => {
      if (cur) return undefined;
      return { id: a.id, source: 'admin', owner: '', contact: {}, live: { ...a.live, imgs }, draft: null, link: null, state: '', note: '', pinned: false, hidden: false, createdAt: core.nowIso(), approvedAt: core.nowIso(), updatedAt: core.nowIso() };
    });
    await setJson(a.key, { ok: true, at: core.nowIso(), photo: !!img });
  }
}

async function all() {
  await ensureSeed();
  await retireOld();
  await recatServices();
  await addListings();
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
  return { id: r.id, status: status(r), url: r.live ? urlOf(r) : '', live: r.live, draft: r.draft, link: r.link || null, note: r.state === 'changes' || r.state === 'rejected' ? r.note || '' : '', submittedAt: r.submittedAt || '', approvedAt: r.approvedAt || '' };
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
    img: imgs[0] || '', imgs, url: pathOf(r), price: escH(f.price), desc: escH(f.desc), link: f.link, btnText: escH(f.btnText), wa: f.wa, expires, pinned: !!r.pinned,
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


// ───── 🔗 a page for every product: /marketplace/<name>-<6 characters of its id> ─────
// The last part finds the product, so the link keeps working if the name changes (it then moves to the new address).
const slugify = v => String(v || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50).replace(/-+$/, '');
const idTail = id => String(id || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(-6);
function pathOf(r) { const f = r.live || r.draft || {}, n = slugify(f.name); return `/marketplace/${n ? n + '-' : ''}${idTail(r.id)}`; }
function urlOf(r) { return core.siteBase() + pathOf(r); }
function orderLink(f, name) {
  const txt = `Hi, I saw your ${name} on Auntie Tobi and I'd like to ${f.btnText === 'Buy Now' ? 'order' : 'enquire'} 💚`;
  const wa = `https://wa.me/${String(f.wa || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(txt)}`;
  if (f.wa && !f.link) return wa;
  if (f.link && /wa\.me/.test(f.link)) return f.link + (f.link.includes('?') ? '&' : '?') + 'text=' + encodeURIComponent(txt);
  return f.link || '';
}
const absImg = ref => { const u = imgUrl(ref); return /^https?:/.test(u) ? u : core.siteBase() + u; };
async function productPage(slug) {
  slug = String(slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  const tail = slug.split('-').pop(), cards = await feed(), recs = await all();
  const live = recs.filter(r => cards.some(c => c.id === r.id));
  const hits = tail && tail.length >= 3 ? live.filter(r => idTail(r.id) === tail) : [];
  const r = hits.find(x => pathOf(x) === '/marketplace/' + slug) || hits[0] || null;
  if (r && pathOf(r) !== '/marketplace/' + slug) return { statusCode: 301, headers: { Location: pathOf(r), 'Cache-Control': 'public, max-age=300' }, body: '' };
  const card = id => cards.find(c => c.id === id), mini = x => { const c = card(x.id); return `<a class="mc" href="${pathOf(x)}">${c.img ? `<img src="${escH(c.img)}" alt="" loading="lazy">` : '<span>🛍️</span>'}<b>${c.name}</b><em>${c.price}</em></a>`; };
  const others = (list, n) => list.slice().sort(() => Math.random() - 0.5).slice(0, n);
  let body, title, desc, img = '', status = 200, ld = '';
  if (!r) {
    status = 404; title = 'This product isn’t available any more · Auntie Tobi Marketplace'; desc = 'See what Nigerian businesses across the UK are selling on the Auntie Tobi Marketplace.';
    body = `<div class="card gone"><div style="font-size:40px">🛍️</div><h1>This product isn’t available any more</h1><p>It may have sold out or ended. Have a look at what else is on the Marketplace 👇</p></div>` +
      (live.length ? `<h2>On the Marketplace now</h2><div class="more">${others(live, 6).map(mini).join('')}</div>` : '');
  } else {
    const f = r.live, c = card(r.id), link = orderLink(f, f.name), url = urlOf(r);
    title = `${f.name}${f.price ? ' · ' + f.price : ''} · ${f.business}`; desc = String(f.desc || '').replace(/\s+/g, ' ').slice(0, 180) || `${f.name} from ${f.business} on the Auntie Tobi Marketplace.`;
    img = f.imgs[0] ? absImg(f.imgs[0]) : '';
    const same = live.filter(x => x.id !== r.id && ((f.bizSlug && x.live.bizSlug === f.bizSlug) || (x.live.business || '').toLowerCase() === (f.business || '').toLowerCase()));
    const rest = live.filter(x => x.id !== r.id && !same.includes(x));
    const imgs = c.imgs.length ? c.imgs : [];
    ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: f.name, description: f.desc || undefined, image: f.imgs.map(absImg), brand: { '@type': 'Brand', name: f.business }, url }).replace(/</g, '\\u003c');
    body = `<div class="card prod">` +
      (imgs.length ? `<div class="gal" id="gal">${imgs.map(u => `<img src="${escH(u)}" alt="${c.name}">`).join('')}</div>${imgs.length > 1 ? `<div class="cnt" id="cnt">1/${imgs.length} · swipe</div>` : ''}` : '<div class="noimg">' + (EMOJI[f.category] || '🛍️') + '</div>') +
      `<div class="pb"><div class="cat">${EMOJI[f.category] || '🛍️'} ${escH(f.category)}</div><h1>${c.name}</h1>` +
      `<div class="biz">by ${f.bizSlug ? `<a href="/?biz=${encodeURIComponent(f.bizSlug)}">${c.business}</a>` : c.business}</div>` +
      (f.price ? `<div class="price">${c.price}</div>` : '') + (f.desc ? `<p class="desc">${c.desc}</p>` : '') +
      (link ? `<a class="buy" href="${escH(link)}" target="_blank" rel="noopener">${c.btnText || 'Enquire'}</a>` : '') +
      `<div class="share"><button type="button" id="shr">📤 Share</button><button type="button" id="cpy">📋 Copy link</button></div></div></div>` +
      (same.length ? `<h2>More from ${c.business}</h2><div class="more">${same.slice(0, 6).map(mini).join('')}</div>` : '') +
      (rest.length ? `<h2>More on the Marketplace</h2><div class="more">${others(rest, 4).map(mini).join('')}</div>` : '');
    body += `<script>(function(){var u=${JSON.stringify(url)},t=${JSON.stringify(f.name + ' — ' + f.business + ' on Auntie Tobi')};var c=document.getElementById('cpy'),s=document.getElementById('shr');function cp(b){try{navigator.clipboard.writeText(u).then(function(){b.textContent='✅ Copied';setTimeout(function(){b.textContent='📋 Copy link';},1800);});}catch(e){prompt('Copy the link',u);}}c.onclick=function(){cp(c);};s.onclick=function(){if(navigator.share){navigator.share({title:t,url:u}).catch(function(){});}else cp(c);};var g=document.getElementById('gal'),n=document.getElementById('cnt');if(g&&n)g.onscroll=function(){var i=Math.round(g.scrollLeft/g.clientWidth)+1;n.textContent=i+'/'+g.children.length+(i===1?' · swipe':'');};})();</script>`;
  }
  const esc = escH, canon = r ? urlOf(r) : core.siteBase() + '/marketplace';
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canon)}">
<meta property="og:type" content="product"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canon)}"><meta property="og:site_name" content="Auntie Tobi Marketplace">${img ? `<meta property="og:image" content="${esc(img)}"><meta name="twitter:card" content="summary_large_image">` : ''}${r ? '' : '<meta name="robots" content="noindex">'}
${ld ? `<script type="application/ld+json">${ld}</script>` : ''}<link rel="icon" href="/tobi-face-128.png">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;color:#0F1E36;padding-bottom:50px}
.top{background:#0F1E36;padding:12px 16px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10}.top img{width:38px;height:38px;border-radius:50%}.top div{flex:1}.top b{display:block;color:#fff;font-size:15.5px}.top span{color:rgba(255,255,255,.6);font-size:12px}.top a{color:#fff;text-decoration:none;font-size:12.5px;font-weight:700;border:1.5px solid rgba(255,255,255,.25);border-radius:20px;padding:6px 11px;white-space:nowrap}
.wrap{max-width:560px;margin:0 auto;padding:14px;display:flex;flex-direction:column;gap:14px}.card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.gal{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;background:#f8f8f8}.gal::-webkit-scrollbar{display:none}.gal img{flex:0 0 100%;width:100%;aspect-ratio:1/1;object-fit:contain;scroll-snap-align:start;padding:10px}
.cnt{text-align:center;font-size:12px;color:#6B7280;padding:6px;background:#f8f8f8}.noimg{font-size:80px;text-align:center;padding:40px;background:#f8f8f8}
.pb{padding:16px 18px 18px}.cat{font-size:11.5px;font-weight:800;color:#057A44;text-transform:uppercase;letter-spacing:.5px}.pb h1{font-size:23px;line-height:1.25;margin:6px 0 4px}.biz{font-size:14.5px;color:#6B7280}.biz a{color:#057A44;font-weight:700;text-decoration:none}
.price{font-size:26px;font-weight:800;margin-top:10px}.desc{font-size:15.5px;line-height:1.6;color:#374151;margin-top:10px;white-space:pre-line}
.buy{display:block;text-align:center;background:#057A44;color:#fff;text-decoration:none;font-weight:800;font-size:17px;border-radius:12px;padding:15px;margin-top:16px}
.share{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.share button{border:1.5px solid #E5E1D6;background:#fff;border-radius:12px;padding:11px;font:inherit;font-weight:700;font-size:14.5px;cursor:pointer;color:#0F1E36}
h2{font-size:16px;margin:4px 2px -4px}.more{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.mc{background:#fff;border-radius:12px;overflow:hidden;text-decoration:none;color:#0F1E36;display:flex;flex-direction:column;box-shadow:0 1px 3px rgba(0,0,0,.06)}.mc img,.mc span{width:100%;aspect-ratio:1/1;object-fit:contain;background:#f8f8f8;padding:6px;display:flex;align-items:center;justify-content:center;font-size:40px}.mc b{font-size:13.5px;padding:8px 10px 0;line-height:1.35}.mc em{font-style:normal;font-weight:800;font-size:14px;padding:4px 10px 10px}
.gone{padding:26px 20px;text-align:center}.gone h1{font-size:21px;margin:8px 0}.gone p{color:#6B7280;font-size:15px}
.sell{background:#0F1E36;color:#fff;border-radius:16px;padding:18px;text-align:center}.sell b{display:block;font-size:16.5px}.sell p{font-size:13.5px;opacity:.75;margin:4px 0 12px}.sell a{display:inline-block;background:#FFB81C;color:#0F1E36;font-weight:800;text-decoration:none;border-radius:10px;padding:10px 16px;font-size:14px}
.foot{text-align:center;font-size:12.5px;color:#6B7280;line-height:1.6}</style></head><body>
<div class="top"><img src="/tobi-face-128.png" alt=""><div><b>Auntie Tobi</b><span>Marketplace</span></div><a href="/marketplace">← All products</a></div>
<div class="wrap">${body}<div class="sell"><b>🛍️ Sell on Auntie Tobi</b><p>Listing on the Marketplace is for Auntie Tobi Business Club members.</p><a href="/business-club">💚 Join the Business Club →</a></div>
<p class="foot">💚 Auntie Tobi — Your UK Guide for Nigerians<br>Products are sold by the businesses shown, not by Auntie Tobi.</p></div></body></html>`;
  return { statusCode: status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'Netlify-CDN-Cache-Control': 'public, max-age=120, stale-while-revalidate=600, durable', 'X-Content-Type-Options': 'nosniff' }, body: html };
}

module.exports = {
  pathOf, urlOf, productPage, chNumber, chUrl,
  CATS, BUTTONS, EMOJI, MAX_IMGS, clean, saveImage, getImage, all, get, status, mine, forOwner, memberSave, memberWithdraw, memberRemove,
  publicCreate, adminSave, review, adminDelete, allowanceOf, setAllowance, feed, toCard, ensureSeed, isImgId,
};
