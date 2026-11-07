'use strict';
/*
 * 📣 Business discovery posts (HQ → Instagram Growth → Discovery posts), admin only.
 * "Nigerian Caterers in UK – Part I": a cover + one slide per business (their photo, @handle and town), drawn in HQ.
 *   disc/parts       { items: [part] }
 *   disc/img/<id>    { dataUrl }      photos you upload (resized in HQ, ≤ ~400 KB)
 * part: { id, kind ('' | 'city' | 'general'), noPart, line ('cat' | 'town' | 'both'), cat, city, part, l1, l2, coverImg, items: [{ slug, name, handle, town, img, pos: {x,y,z} }], caption,
 *         status: 'draft' | 'posted', createdAt, updatedAt, postedAt, postUrl }
 * 🛍️ Marketplace posts (kind 'market'): one slide per Marketplace product — item.pid (product id), prod (product name), price;
 *   part.showPrice, part.end { on, t1, t2, t3 } + endImg: the editable last slide ("Shop these and more on the Auntie Tobi Marketplace").
 * Marking a part as posted adds "📣 Featured in …" to each business's timeline in the Business directory.
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, cas, getJson, setJson, cleanText } = core;

const KEY = 'disc/parts';
const MAX_PARTS = 400, MAX_ITEMS = 12;
const roman = n => { let r = ''; n = Math.max(1, Math.min(99, n | 0)); for (const [v, s] of [[90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { r += s; n -= v; } return r; };
const okId = id => /^[a-z0-9]{6,40}$/.test(String(id || ''));
const newId = () => Date.now().toString(36) + crypto.randomBytes(3).toString('hex');

async function list() { return ((await getJson(KEY).catch(() => null)) || { items: [] }).items; }

function clean(raw, prev) {
  raw = raw || {}; prev = prev || {};
  const num = (v, a, b, d) => { v = Number(v); return isFinite(v) ? Math.max(a, Math.min(b, v)) : d; };
  const items = (Array.isArray(raw.items) ? raw.items : []).slice(0, MAX_ITEMS).map(x => ({
    slug: cleanText(x.slug, 120), name: cleanText(x.name, 120), pid: /^[A-Za-z0-9_]{2,40}$/.test(String(x.pid || '')) ? x.pid : '', prod: cleanText(x.prod, 120), price: cleanText(x.price, 30), handle: cleanText(String(x.handle || '').replace(/^@+/, ''), 40), town: cleanText(x.town, 40), cat: cleanText(x.cat, 60),
    img: okId(x.img) ? x.img : '', pos: { x: num(x.pos && x.pos.x, -1, 1, 0), y: num(x.pos && x.pos.y, -1, 1, 0), z: num(x.pos && x.pos.z, 1, 3, 1) },
  })).filter(x => x.handle || x.name || x.pid);
  const mkt = raw.kind === 'market', e = raw.end || {};
  return {
    id: prev.id || newId(), kind: raw.kind === 'city' || raw.kind === 'general' || mkt ? raw.kind : '', cat: cleanText(raw.cat, 60), city: raw.kind === 'city' ? cleanText(raw.city, 60) : '', part: Math.round(num(raw.part, 1, 99, 1)),
    noPart: !!raw.noPart, line: raw.kind === 'general' && /^(cat|town|both)$/.test(raw.line) ? raw.line : '',
    l1: cleanText(raw.l1, raw.kind === 'city' || raw.kind === 'general' || mkt ? 90 : 50), l2: cleanText(raw.l2, 50), coverImg: okId(raw.coverImg) ? raw.coverImg : '',
    coverPos: { x: num(raw.coverPos && raw.coverPos.x, -1, 1, 0), y: num(raw.coverPos && raw.coverPos.y, -1, 1, 0), z: num(raw.coverPos && raw.coverPos.z, 1, 3, 1) },
    showPrice: mkt ? raw.showPrice !== false : undefined,
    end: mkt ? { on: e.on !== false, t1: cleanText(e.t1, 60), t2: cleanText(e.t2, 70), t3: cleanText(e.t3, 70) } : undefined,
    endImg: mkt && okId(raw.endImg) ? raw.endImg : '',
    items, caption: String(raw.caption || '').replace(/\r/g, '').slice(0, 2200),
    status: prev.status || 'draft', createdAt: prev.createdAt || core.nowIso(), updatedAt: core.nowIso(),
    postedAt: prev.postedAt || '', postUrl: prev.postUrl || '',
  };
}

async function save(raw) {
  let out;
  await cas(KEY, cur => {
    cur = cur || { items: [] };
    const i = cur.items.findIndex(p => p.id === raw.id);
    out = clean(raw, i >= 0 ? cur.items[i] : null);
    if (i >= 0) cur.items[i] = out; else cur.items = [out].concat(cur.items).slice(0, MAX_PARTS);
    return cur;
  });
  return out;
}
async function remove(id) {
  let gone = null;
  await cas(KEY, cur => { if (!cur) return undefined; gone = cur.items.find(p => p.id === id) || null; cur.items = cur.items.filter(p => p.id !== id); return cur; });
  // photos only used by this part
  if (gone) { const keep = new Set(); for (const p of await list()) { if (p.coverImg) keep.add(p.coverImg); if (p.endImg) keep.add(p.endImg); for (const x of p.items) if (x.img) keep.add(x.img); }
    for (const im of [gone.coverImg, gone.endImg].concat(gone.items.map(x => x.img))) if (im && !keep.has(im)) await core.del('disc/img/' + im).catch(() => {}); }
}

// photos
async function putImg(dataUrl) {
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(dataUrl || '')) || dataUrl.length > 900000) throw new HttpError(400, 'bad_image', 'That photo couldn’t be used — try another JPG or PNG.');
  const id = newId(); await setJson('disc/img/' + id, { dataUrl }); return id;
}
async function getImg(id) { if (!okId(id)) throw new HttpError(400, 'invalid', 'Invalid photo.'); const r = await getJson('disc/img/' + id).catch(() => null); if (!r) throw new HttpError(404, 'not_found', 'Photo not found.'); return r.dataUrl; }
// a business's directory picture, fetched here so HQ can draw it (other sites block drawing their pictures)
async function dirPic(slug) {
  const b = (await require('./bizdir').all()).find(x => x.slug === slug);
  if (!b || !b.img) return '';
  const m = /\/bimg\/([^?#]+)/.exec(b.img);   // a picture Auntie Tobi keeps (Finder / HQ uploads)
  if (m) { const f = decodeURIComponent(m[1]).replace(/-[a-z0-9]{1,8}\.(jpg|png|webp)$/i, ''); const r = await getJson('bizimg/' + f).catch(() => null); if (r && r.dataUrl) return r.dataUrl; }
  if (/^\//.test(b.img)) return require('./eventmedia').fetchImage(core.siteBase() + b.img);
  return require('./eventmedia').fetchImage(b.img);
}

// ⭐ Which directory listings belong to a current Business Club member (paid, active) — by the listing linked to
// their Business Studio account, or else by the same email. "Featured" on the website is NOT the same thing.
async function clubSlugs() {
  const settings = await core.getSettings();
  const members = (await Promise.all((await core.listKeys('members/')).map(k => getJson(k).catch(() => null)))).filter(m => m && m.email && core.access(m, settings).membershipActive);
  if (!members.length) return [];
  const dir = await require('./bizdir').all(), out = new Set();
  await Promise.all(members.map(async m => {
    const p = await getJson(`profiles/${core.enc(m.email)}`).catch(() => null);
    if (p && p.listingSlug) { out.add(p.listingSlug); return; }
    const em = String(m.email).toLowerCase(); dir.forEach(b => { if (b.email && String(b.email).toLowerCase() === em) out.add(b.slug); });
  }));
  return [...out];
}
// 🛍️ live Marketplace products for Marketplace posts
async function mktList() {
  const market = require('./market'), out = [];
  for (const r of await market.all()) {
    if (market.status(r) !== 'live') continue;
    const f = r.live;
    out.push({ id: r.id, name: f.name, business: f.business, bizSlug: f.bizSlug || '', category: f.category, price: f.price || '', hasImg: !!(f.imgs && f.imgs.length), at: r.approvedAt || r.updatedAt || '' });
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}
// a product's first photo, fetched here so HQ can draw it
async function mktPic(id) {
  const market = require('./market'), r = await market.get(String(id || ''));
  const im = r && r.live && r.live.imgs && r.live.imgs[0];
  if (!im) return '';
  if (market.isImgId(im)) { const x = await market.getImage(im); return (x && x.dataUrl) || ''; }
  return require('./eventmedia').fetchImage(im);
}
async function posted(id, url, who) {
  const u = String(url || '').trim();
  if (u && !/^https:\/\/(www\.)?instagram\.com\//i.test(u)) throw new HttpError(400, 'invalid', 'Paste the Instagram post link (instagram.com/p/…), or leave it empty.');
  let p = null;
  await cas(KEY, cur => { if (!cur) return undefined; const x = cur.items.find(q => q.id === id); if (!x) return undefined; x.status = 'posted'; x.postedAt = x.postedAt || core.nowIso(); x.postUrl = u.slice(0, 300); p = x; return cur; });
  if (!p) throw new HttpError(404, 'not_found', 'That post is no longer saved.');
  const title = `${[p.l1, p.l2].filter(Boolean).join(' ')}${p.noPart ? '' : ` – Part ${roman(p.part)}`}`;
  const invites = require('./invites');
  for (const x of p.items) if (x.slug) await invites.act(x.slug, 'log', { text: `📣 Featured in the discovery post "${title}"${u ? ' — ' + u : ''}` }).catch(() => {});
  await core.audit(who, 'hq_disc_posted', { id, n: p.items.length });
  return p;
}
async function unpost(id) { await cas(KEY, cur => { if (!cur) return undefined; const x = cur.items.find(q => q.id === id); if (!x) return undefined; x.status = 'draft'; return cur; }); }

module.exports = { mktList, mktPic, clubSlugs, list, save, remove, putImg, getImg, dirPic, posted, unpost };
