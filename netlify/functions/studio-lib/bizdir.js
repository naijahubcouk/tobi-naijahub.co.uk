'use strict';
/*
 * 🏢 Auntie Tobi business directory — one list for the app, the chat and Business Studio, managed in HQ.
 *   dir/list  { items: [ business… ], at, by }
 * Until HQ saves its first list, the copy in netlify/functions/dir-seed.json (taken from the app) is used.
 * The website directory (third-party) stays the place businesses list themselves: its CSV export is imported here.
 *
 * A business: { slug, name, cat, cats, loc, addr, desc, ig, wa, phone, email, website, featured, verified,
 *   img, lines, shop, book, label, text (app extras, kept on import), contact (website "contact name"),
 *   claimed (true unless created by Favour Adentan / Auntie Tobi; `claimedSet` = Seun's own tick, wins),
 *   status ('published' | 'pending'), hidden, src ('website' | 'hq'), updatedAt }
 */
const core = require('./core');
const { HttpError, getJson, cas } = core;

let seed = [];
try { seed = require('../dir-seed.json'); } catch (_) { seed = []; }

const KEY = 'dir/list';
const OURS = /^(favour adentan|auntie tobi)$/i;           // listings we created = unclaimed
// Featured businesses (Business Club) also show every way to reach them, the full description and their photos
const FEATURED_EXTRA = ['email', 'phone', 'website', 'fb', 'tt', 'long', 'gallery', 'addr'];
const PUBLIC = ['name', 'slug', 'cat', 'loc', 'desc', 'ig', 'wa', 'featured', 'verified', 'img', 'lines', 'shop', 'book', 'label', 'text'];
const COMPARE = ['name', 'cat', 'loc', 'desc', 'ig', 'wa', 'phone', 'email', 'website', 'featured', 'verified', 'claimed'];
const FIELD_NAMES = { name: 'name', cat: 'category', loc: 'town', desc: 'description', ig: 'Instagram', wa: 'WhatsApp', phone: 'phone', email: 'email', website: 'website', featured: 'Featured', verified: 'Verified', claimed: 'claimed' };

let memo = null;
// New featured pictures sent in (kept in /biz-img): replace the old picture, but never one chosen later in HQ
const IMG_UPDATES = {
  abbystoreltd: { from: 'https://d2rl3fject3tj8.cloudfront.net/47a0f73f-f9ba-4c98-8683-5834c3eb574a-1787256240805', to: '/biz-img/abbystoreltd.jpg' },
};
async function all() {
  if (memo && Date.now() - memo.at < 30000) return memo.items;
  const rec = await getJson(KEY).catch(() => null);
  const items = (rec && Array.isArray(rec.items) && rec.items.length ? rec.items : seed.map(normalise))
    .map(b => (typeof b.claimedSet === 'boolean' || !b.contact ? b : Object.assign({}, b, { claimed: ownerContact(b) })))
    .map(b => (IMG_UPDATES[b.slug] && (!b.img || b.img === IMG_UPDATES[b.slug].from) ? Object.assign({}, b, { img: IMG_UPDATES[b.slug].to }) : b));   // the claimed rule always applies, also to saved listings
  memo = { at: Date.now(), items };
  return items;
}
function forget() { memo = null; }

const str = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 300);
function slugify(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80); }
function igHandle(v) { const s = str(v, 200); const m = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i); return (m ? m[1] : s.replace(/^@/, '')).replace(/[^A-Za-z0-9._]/g, '').slice(0, 40); }
function waNumber(link, phone) {
  const fromLink = String(link || '').match(/(?:wa\.me\/|phone=|catalog\/|whatsapp\.com\/[a-z]*\/?)(\+?\d{10,15})/i);
  let d = fromLink ? fromLink[1] : String(phone || '');
  d = d.replace(/[^\d+]/g, '');
  if (!d) return '';
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '44' + d.slice(1);
  return /^\d{10,15}$/.test(d) ? d : '';
}
// "43 Mansfield Rd, Nottingham NG5 2BW, UK" → "Nottingham"
const POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i, OUTWARD = /\b[A-Z]{1,2}\d[A-Z\d]?\b$/i;
const STREETY = /^\d|\b(road|rd|street|st|avenue|ave|lane|ln|close|drive|dr|way|court|ct|place|pl|crescent|cres|grove|terrace|parade|hill|gardens|walk|square|sq|industrial|estate|unit|house|building|floor|flat)\b\.?$/i;
function townFrom(addr) {
  const parts = String(addr || '').split(',').map(p => p.replace(POSTCODE, '').replace(OUTWARD, '').trim()).filter(p => p && !/^(uk|united kingdom|england|scotland|wales|northern ireland|gb|great britain)$/i.test(p));
  const towns = parts.filter(p => !STREETY.test(p) && !/^\d/.test(p));
  return (towns.length ? towns[towns.length - 1] : parts[parts.length - 1] || '').slice(0, 60);
}
// Facebook page / TikTok profile → a clean link ('' if it isn't one)
function fbUrl(v) {
  const m = String(v || '').match(/(?:^|\/\/|\.)(?:facebook|fb)\.com\/((?:profile\.php\?id=\d+)|(?:people\/[^?#\s"']+)|[A-Za-z0-9.\-]{3,80})/i);
  if (!m || /^(sharer|share|plugins|tr|dialog|groups|events|login|watch|photo|photos|hashtag|policies|privacy|help|pages|home\.php|l\.php)(\b|\.php)/i.test(m[1])) return '';
  return 'https://www.facebook.com/' + m[1].replace(/\/+$/, '');
}
function ttUrl(v) {
  const m = String(v || '').match(/tiktok\.com\/@([A-Za-z0-9._]{2,40})/i) || String(v || '').trim().match(/^@([A-Za-z0-9._]{2,40})$/);
  return m ? 'https://www.tiktok.com/@' + m[1].replace(/\.$/, '') : '';
}
// Claimed = the website contact is a person (the owner), not Favour / Auntie Tobi and not just the business's own name or handle
// (listings our team created often have the business name as the contact). A tick in HQ (claimedSet) always wins.
const nk = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function ownerContact(b) {
  if (OURS.test(String(b.contact).trim())) return false;
  const c = nk(b.contact); if (!c) return false;
  for (const x of [nk(b.name), nk(b.slug), nk(b.ig)]) if (x && (c === x || (c.length >= 4 && x.includes(c)) || (x.length >= 4 && c.includes(x)))) return false;
  return true;
}
function normalise(b) {
  b = Object.assign({}, b || {});
  const out = {
    // an existing link name (slug) is never changed
    slug: b.slug ? String(b.slug).trim().replace(/[^A-Za-z0-9._~-]/g, '').slice(0, 100) : slugify(b.name), name: str(b.name, 120), cat: str(b.cat, 60).toLowerCase(), cats: Array.isArray(b.cats) ? b.cats.map(c => str(c, 120)).filter(Boolean) : [],
    loc: str(b.loc, 60), addr: str(b.addr, 200), desc: str(b.desc, 1200), ig: igHandle(b.ig), wa: String(b.wa || '').replace(/\D/g, '').slice(0, 15),
    phone: str(b.phone, 30), email: str(b.email, 120).toLowerCase(), website: str(b.website, 300), featured: !!b.featured, verified: !!b.verified,
    contact: str(b.contact, 120), status: b.status === 'pending' ? 'pending' : 'published', hidden: !!b.hidden, src: b.src === 'hq' ? 'hq' : 'website',
    updatedAt: b.updatedAt || '',
  };
  for (const k of ['img', 'shop', 'label', 'text']) if (b[k]) out[k] = str(b[k], 600);
  if (Array.isArray(b.lines) && b.lines.length) out.lines = b.lines.map(l => str(l, 200)).slice(0, 6);
  if (b.book && typeof b.book === 'object') out.book = b.book;
  if (typeof b.claimedSet === 'boolean') out.claimedSet = b.claimedSet;
  out.claimed = typeof out.claimedSet === 'boolean' ? out.claimedSet : (out.contact ? ownerContact(out) : b.claimed === true);
  if (b.notes) out.notes = str(b.notes, 1000);
  if (b.deId) out.deId = str(b.deId, 60);                 // DirectoryEasy listing id (from the website sync)
  if (typeof b.siteHidden === 'boolean') out.siteHidden = b.siteHidden; else if (b.siteHidden) out.siteHidden = true;   // hidden because the website rejected / deleted it
  if (b.contactEmail) out.contactEmail = str(b.contactEmail, 120).toLowerCase();   // the website account's email
  if (b.siteAt) out.siteAt = str(b.siteAt, 40);           // last live update from the website
  if (b.awaitSite) out.awaitSite = true;          // found by the Business Finder: kept out of the app until it's on the website
  if (typeof b.appNow === 'boolean') out.appNow = b.appNow; else if (b.appNow) out.appNow = true;                // Seun chose to show it in the app before that
  if (fbUrl(b.fb)) out.fb = fbUrl(b.fb);
  if (ttUrl(b.tt)) out.tt = ttUrl(b.tt);
  if (b.short) out.short = str(b.short, 200);
  if (b.long) out.long = String(b.long).replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 4000);   // full description (website "detailed description")
  if (Array.isArray(b.gallery) && b.gallery.length) out.gallery = b.gallery.map(u => str(u, 300)).filter(u => /^https:\/\//.test(u)).slice(0, 6);                    // one-line description (website "description")
  if (Array.isArray(b.tags) && b.tags.length) out.tags = b.tags.map(t => str(t, 40)).filter(Boolean).slice(0, 10);
  if (isFinite(+b.lat) && isFinite(+b.lng) && b.lat !== '' && b.lat != null && +b.lat !== 0) { out.lat = +b.lat; out.lng = +b.lng; }
  if (b.uploadedAt) out.uploadedAt = str(b.uploadedAt, 40);   // HQ-added business already put in a website CSV
  return out;
}

// Finder businesses stay out of the app and the chat until they're on the website (CSV marked uploaded, or the
// website export brings them back in) — unless "Show in app now" was ticked. Older Finder ones are recognised by their note.
function waitingSite(b) { return b.src === 'hq' && !b.uploadedAt && !b.appNow && (!!b.awaitSite || /Found by the Business Finder/.test(b.notes || '')); }
// ── public list for the app and the chat (no emails, no admin details) ──
async function publicList() {
  return (await all()).filter(b => !b.hidden && b.status !== 'pending' && !waitingSite(b)).map(b => {
    const o = {}; for (const k of PUBLIC.concat(b.featured ? FEATURED_EXTRA : [])) if (b[k] !== undefined && b[k] !== '' && b[k] !== false && !(Array.isArray(b[k]) && !b[k].length)) o[k] = b[k]; return o;
  });
}

// ── website CSV export → businesses ──
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  text = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = (rows.shift() || []).map(h => h.trim());
  return rows.filter(r => r.some(c => c.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] == null ? '' : r[i]])));
}
function fromCsvRow(r) {
  const cats = String(r.categories || '').split(',').map(c => c.trim()).filter(Boolean);
  const first = cats[0] || '';
  const verifiedCol = Object.keys(r).find(k => /verified by auntie tobi/i.test(k));
  return normalise({
    slug: r.slug, name: r.name, cats, cat: first.split('>').pop().trim(), addr: r.location_address, loc: townFrom(r.location_address) || 'UK',
    desc: r.description, ig: r.socialMedia_instagram, fb: r.socialMedia_facebook, tt: r.socialMedia_tiktok, wa: waNumber(r['custom_Whatsapp Link'], r.business_phone), phone: r.business_phone,
    email: r.business_email, website: r.mainLink, long: r.detailedDescription, featured: String(r.isFeatured).toLowerCase() === 'true',
    verified: !!(verifiedCol && String(r[verifiedCol]).trim()), contact: r.contact_name, status: String(r.status).toUpperCase() === 'PENDING' ? 'pending' : 'published', src: 'website',
  });
}

// A business added in HQ (e.g. by the Finder) and then uploaded to the website may come back with a different slug: match it by name.
const nameKey = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function hqTwin(items, n) { const k = nameKey(n.name); return k ? items.find(b => b.src === 'hq' && nameKey(b.name) === k) : undefined; }
function same(a, b) { return JSON.stringify(a == null ? '' : a) === JSON.stringify(b == null ? '' : b); }
// Works out what an import would change. Nothing is saved here.
async function previewImport(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length || !('slug' in rows[0]) || !('name' in rows[0])) throw new HttpError(400, 'bad_csv', 'That doesn’t look like your directory export — it needs the name and slug columns.');
  const incoming = rows.map(fromCsvRow).filter(b => b.slug && b.name);
  const cur = await all(), bySlug = new Map(cur.map(b => [b.slug, b]));
  const add = [], change = [], pending = [], seen = new Set();
  for (const n of incoming) {
    seen.add(n.slug);
    const o = bySlug.get(n.slug) || hqTwin(cur, n);
    if (n.status === 'pending') { pending.push({ slug: n.slug, name: n.name }); if (!o) continue; }
    if (!o) { add.push({ slug: n.slug, name: n.name, cat: n.cat, loc: n.loc, claimed: n.claimed }); continue; }
    const merged = mergeOne(o, n), diffs = COMPARE.filter(k => !same(o[k], merged[k]));
    if (diffs.length || o.status !== merged.status) change.push({ slug: n.slug, name: n.name, fields: diffs.map(k => FIELD_NAMES[k]).concat(o.status !== merged.status ? ['status'] : []) });
  }
  const gone = cur.filter(b => b.src === 'website' && !b.hidden && !seen.has(b.slug)).map(b => ({ slug: b.slug, name: b.name }));
  const unclaimed = incoming.filter(b => b.status !== 'pending' && !b.claimed).length;
  return { add, change, gone, pending, total: incoming.length, unclaimed, claimed: incoming.length - pending.length - unclaimed };
}
// Website fields win; app-only extras (photos for featured cards, booking buttons…), HQ notes, hidden and Seun's claimed tick are kept.
function mergeOne(o, n) {
  const keep = {}; for (const k of ['img', 'lines', 'shop', 'book', 'label', 'text', 'notes', 'claimedSet', 'hidden', 'short', 'tags', 'lat', 'lng', 'gallery']) if (o[k] !== undefined) keep[k] = o[k];
  const m = normalise(Object.assign({}, o, n, keep, { wa: n.wa || o.wa, ig: n.ig || o.ig, fb: n.fb || o.fb, tt: n.tt || o.tt, loc: n.loc && n.loc !== 'UK' ? n.loc : (o.loc || 'UK') }));
  if (o.siteHidden && n.status !== 'pending') { m.hidden = false; delete m.siteHidden; }   // hidden by the website sync, back on the website now
  return m;
}
async function applyImport(csvText, hideGone, who) {
  const rows = parseCsv(csvText).map(fromCsvRow).filter(b => b.slug && b.name);
  if (!rows.length) throw new HttpError(400, 'bad_csv', 'Nothing to import.');
  const now = core.nowIso();
  let stats;
  await cas(KEY, cur => {
    const items = cur && Array.isArray(cur.items) && cur.items.length ? cur.items.slice() : seed.map(normalise);
    const idx = new Map(items.map((b, i) => [b.slug, i])), seen = new Set();
    stats = { added: 0, changed: 0, hidden: 0 };
    for (const n of rows) {
      seen.add(n.slug);
      if (!idx.has(n.slug)) { const twin = hqTwin(items, n); if (twin) { const i = items.indexOf(twin); n.slug = twin.slug; idx.set(n.slug, i); seen.add(n.slug); } }
      if (idx.has(n.slug)) { const i = idx.get(n.slug), m = mergeOne(items[i], n); if (COMPARE.some(k => !same(items[i][k], m[k])) || items[i].status !== m.status) { m.updatedAt = now; stats.changed++; } items[i] = m; }
      else if (n.status !== 'pending') { n.updatedAt = now; items.push(n); idx.set(n.slug, items.length - 1); stats.added++; }
    }
    if (hideGone) for (const b of items) if (b.src === 'website' && !b.hidden && !seen.has(b.slug)) { b.hidden = true; b.notes = ((b.notes || '') + ' Hidden: not in the website export of ' + now.slice(0, 10) + '.').trim(); stats.hidden++; }
    return { items, at: now, by: who, lastImport: now };
  });
  forget();
  return stats;
}

// ── HQ edits ──
async function save(raw, who) {
  const b = normalise(Object.assign({}, raw, { src: raw && raw.src === 'website' ? 'website' : 'hq' }));
  if (!b.name || !b.slug) throw new HttpError(400, 'invalid', 'A business needs a name.');
  b.updatedAt = core.nowIso();
  await cas(KEY, cur => {
    const items = cur && Array.isArray(cur.items) && cur.items.length ? cur.items.slice() : seed.map(normalise);
    const i = items.findIndex(x => x.slug === (raw.origSlug || b.slug));
    if (i >= 0) items[i] = Object.assign({}, items[i], b); else items.push(b);
    return { items, at: b.updatedAt, by: who, lastImport: cur && cur.lastImport };
  });
  forget();
  return b;
}
async function remove(slug, who) {
  await cas(KEY, cur => {
    const items = (cur && Array.isArray(cur.items) && cur.items.length ? cur.items : seed.map(normalise)).filter(x => x.slug !== slug);
    return { items, at: core.nowIso(), by: who, lastImport: cur && cur.lastImport };
  });
  forget();
}
// HQ-added businesses that have gone into a website CSV (so they're not exported twice)
async function markUploaded(slugs, at) {
  const set = new Set(slugs);
  await cas(KEY, cur => { if (!cur || !Array.isArray(cur.items)) return undefined; cur.items = cur.items.map(b => set.has(b.slug) ? Object.assign({}, b, { uploadedAt: at }) : b); return cur; });
  forget();
}
async function info() { const rec = await getJson(KEY).catch(() => null); return { saved: !!(rec && rec.items), at: rec && rec.at || '', lastImport: rec && rec.lastImport || '' }; }

module.exports = { nameKey, townFrom, waNumber, igHandle, waitingSite, fbUrl, ttUrl, markUploaded, all, publicList, previewImport, applyImport, save, remove, info, parseCsv, fromCsvRow, normalise, slugify, forget };
