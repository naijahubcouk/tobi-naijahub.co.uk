'use strict';
/*
 * 🔄 Live sync from the directory website (DirectoryEasy) → HQ business list → the app.
 * DirectoryEasy's webhook says WHAT happened (event, listing id, name, status, contact), but not the details,
 * so for new / updated listings HQ reads the listing's public page (phone, WhatsApp, Instagram, photo, town…).
 *   listing.rejected / listing.deleted          → hidden in the app (siteHidden)
 *   listing.published / listing.approved        → shown again; details read from the page; new ones added
 *   listing.updated / listing.created           → details refreshed from the page (new + published ones added)
 * Never changed by the sync: photos chosen in HQ, gallery, notes, your claimed tick, Featured, and anything you hid yourself.
 *   dirhook/sync   { items: [{ at, event, name, slug, action, why }] }   last 100
 *   dirhook/needs  { items: [{ at, name, deId, url, why }] }            couldn't be read → import / retry
 *   dirhook/settings { live }                                             live updates on/off (on by default)
 */
const core = require('./core');
const { cas, getJson, setJson } = core;
const bizdir = require('./bizdir');

const SITE = () => core.env('DIRECTORY_SITE', 'https://directory.auntietobi.co.uk').replace(/\/$/, '');
const decode = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const OUR_IG = /^(auntietobi_uk|auntietobi|naija_ukhub|directoryeasy)$/i;

async function settings() { return Object.assign({ live: true }, (await getJson('dirhook/settings').catch(() => null)) || {}); }
async function setLive(on) { await setJson('dirhook/settings', { live: !!on }); }
async function logSync(e) { await cas('dirhook/sync', cur => { cur = cur || { items: [] }; cur.items = [Object.assign({ at: core.nowIso() }, e)].concat(cur.items).slice(0, 100); return cur; }).catch(() => {}); }
async function needs(add, removeName) {
  await cas('dirhook/needs', cur => {
    cur = cur || { items: [] };
    if (removeName) { const k = bizdir.nameKey(removeName); cur.items = cur.items.filter(x => bizdir.nameKey(x.name) !== k); }
    if (add) { const k = bizdir.nameKey(add.name); cur.items = [Object.assign({ at: core.nowIso() }, add)].concat(cur.items.filter(x => bizdir.nameKey(x.name) !== k)).slice(0, 100); }
    return cur;
  }).catch(() => {});
}

// ── reading a public listing page ──
async function fetchPage(url, ms) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms || 3500);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'AuntieTobiHQ/1.0 (+https://www.auntietobi.co.uk)', Accept: 'text/html' } });
    if (!r.ok) return { status: r.status, html: '' };
    return { status: r.status, html: (await r.text()).slice(0, 1500000) };
  } catch (e) { return { status: 0, html: '', err: e.name === 'AbortError' ? 'timed out' : e.message }; }
  finally { clearTimeout(t); }
}
const meta = (html, prop) => { const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i')) || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i')); return m ? decode(m[1]).trim() : ''; };
const okImage = u => { u = String(u || ''); if (!/^https:\/\//.test(u) || /tiktok\.com|instagram\.com|facebook\.com|youtube\.com|wa\.me|whatsapp\.com/i.test(u)) return false; return /\.(jpe?g|png|webp)(\?|$)/i.test(u) || /(\.b-cdn\.net|\.cloudfront\.net)\//i.test(u); };

function parse(html) {
  // the listing itself: between the site header and footer (the footer has Auntie Tobi's own phone, email and socials)
  let main = html;
  const h = main.search(/<\/header>/i); if (h > 0) main = main.slice(h);
  const f = main.search(/<footer[\s>]/i); if (f > 0) main = main.slice(0, f);
  const hrefs = [...main.matchAll(/href=["']([^"']+)["']/gi)].map(m => decode(m[1]));
  const first = re => hrefs.find(u => re.test(u)) || '';
  const out = { title: meta(html, 'og:title'), desc: meta(html, 'og:description') || meta(html, 'description') };
  const tel = first(/^tel:/i); if (tel) out.phone = tel.replace(/^tel:/i, '').trim();
  const wa = first(/api\.whatsapp\.com\/send|wa\.me\/\d/i); if (wa) out.wa = bizdir.waNumber(wa, '');
  const mail = first(/^mailto:/i); if (mail) out.email = mail.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
  const ig = hrefs.map(u => (u.match(/instagram\.com\/([A-Za-z0-9._]{2,30})\/?(?:[?#]|$)/i) || [])[1]).find(x => x && !/^(p|reel|reels|explore|stories|accounts|share)$/i.test(x) && !OUR_IG.test(x)); if (ig) out.ig = ig;
  const fb = hrefs.find(u => /facebook\.com\//i.test(u) && !/sharer|share\.php|dialog\//i.test(u)); if (fb) out.fb = fb.replace(/[?&](mibextid|rdid|share_url)=[^&#]*/g, '').replace(/#.*$/, '');
  const tt = (hrefs.find(u => /tiktok\.com\/@[A-Za-z0-9._]+/i.test(u)) || ''); if (tt) out.tt = tt;
  const site = (main.match(/href=["'](https?:\/\/[^"']+)["'][^>]*>(?:(?!<\/a>)[\s\S]){0,400}?Visit Website/i) || [])[1]; if (site) out.website = decode(site);
  const maps = hrefs.find(u => /google\.[a-z.]+\/maps|maps\.google|maps\.apple/i.test(u));
  if (maps) { const q = (maps.match(/[?&](?:q|query|destination|daddr)=([^&]+)/i) || [])[1]; if (q) out.addr = decodeURIComponent(q.replace(/\+/g, ' ')).trim(); }
  if (out.addr) out.loc = bizdir.townFrom(out.addr) || '';
  // photos: the page's main image, then any listing pictures (skip TikTok/Instagram links and the site logo)
  const imgs = [meta(html, 'og:image')].concat([...main.matchAll(/_next\/image\?url=([^&"'\s]+)/gi)].map(m => decodeURIComponent(decode(m[1])))).filter(okImage);
  const ff = html.search(/<footer[\s>]/i), fe = ff > 0 ? html.indexOf('</footer>', ff) : -1, foot = ff > 0 ? html.slice(ff, fe > ff ? fe : undefined) : '';   // pictures that are also in the footer = the site logo
  out.images = [...new Set(imgs)].filter(u => !foot.includes(encodeURIComponent(u)) && !foot.includes(u)).slice(0, 6);
  out.featured = />\s*Featured\s*</.test(main); out.claimed = />\s*Claimed\s*</.test(main);
  return out;
}
async function readListing(url) {
  const r = await fetchPage(url);
  if (!r.html) return { ok: false, url, why: r.status === 404 ? 'page not found (not published yet, or a different web address)' : r.err || ('the website answered ' + r.status) };
  const d = parse(r.html);
  if (!d.title && !d.desc && !d.phone && !d.ig) return { ok: false, url, why: 'couldn’t find the listing details on the page' };
  return Object.assign({ ok: true, url }, d);
}

// ── applying a webhook message ──
function catFrom(slugs, items) {
  const s = (Array.isArray(slugs) ? slugs : [])[0]; if (!s) return '';
  const known = [...new Set(items.map(b => b.cat).filter(Boolean))];
  return known.find(c => bizdir.slugify(c) === String(s).toLowerCase()) || String(s).replace(/-/g, ' ').toLowerCase();
}
function findBiz(items, d) {
  return (d.id && items.find(b => b.deId === d.id)) || (d.slug && items.find(b => b.slug === d.slug)) || (d.name && items.find(b => bizdir.nameKey(b.name) === bizdir.nameKey(d.name))) || null;
}
// Only fill in what the page shows; never wipe a field because the page didn't show it.
function fromPage(p) { const u = {}; for (const k of ['phone', 'wa', 'email', 'ig', 'fb', 'tt', 'website', 'addr', 'loc']) if (p[k]) u[k] = p[k]; if (p.desc) u.desc = p.desc; if (!u.wa && p.phone) u.wa = bizdir.waNumber('', p.phone); return u; }

async function apply(msg) {
  const st = await settings();
  const ev = String(msg && msg.event || ''), d = (msg && msg.data) || {};
  if (!/^listing\./.test(ev)) return { action: 'skipped', why: 'not a listing message' };
  const items = await bizdir.all(), b = findBiz(items, d), name = d.name || (b && b.name) || '';
  const base = { event: ev, name, slug: b ? b.slug : '' };
  if (!st.live) { await logSync(Object.assign(base, { action: 'skipped', why: 'live updates are switched off' })); return { action: 'skipped' }; }
  const status = String(d.status || '').toUpperCase();
  const now = core.nowIso(), who = 'website sync';
  const save = async (rec, extra) => { await bizdir.save(Object.assign({}, rec, extra, { origSlug: rec.slug, src: rec.src, siteAt: now }), who); };

  // rejected / deleted → hidden (only ones we hid can be shown again automatically)
  if (ev === 'listing.rejected' || ev === 'listing.deleted' || status === 'REJECTED') {
    if (!b) { await logSync(Object.assign(base, { action: 'skipped', why: 'not in HQ' })); return { action: 'skipped' }; }
    if (b.hidden) { await logSync(Object.assign(base, { action: 'skipped', why: 'already hidden' })); return { action: 'skipped' }; }
    await save(b, { hidden: true, siteHidden: true, deId: d.id || b.deId, notes: ((b.notes || '') + ` Hidden: ${ev === 'listing.deleted' ? 'deleted' : 'rejected'} on the website ${now.slice(0, 10)}.`).trim() });
    await logSync(Object.assign(base, { action: 'hidden' }));
    return { action: 'hidden' };
  }
  if (status === 'PENDING') { await logSync(Object.assign(base, { action: 'skipped', why: 'still pending on the website' })); return { action: 'skipped' }; }

  // published / approved / updated / created → read the page
  const url = `${SITE()}/${encodeURIComponent((b && b.src === 'website' && b.slug) || bizdir.slugify(name))}`;
  const page = await readListing(url);
  const contact = d.contact || {};
  if (b) {
    const upd = page.ok ? fromPage(page) : {};
    if (d.name && d.id && b.deId === d.id && d.name !== b.name) upd.name = d.name;          // renamed on the website
    if (Array.isArray(d.categories) && d.categories.length) { const c = catFrom(d.categories, items); if (c) upd.cat = c; }
    if (contact.name) upd.contact = contact.name;
    if (contact.email) upd.contactEmail = contact.email;
    if (!b.img && page.ok && page.images[0]) upd.img = page.images[0];
    if (b.siteHidden) { upd.hidden = false; upd.siteHidden = false; }
    if (page.ok && b.src === 'hq' && !b.uploadedAt) upd.uploadedAt = now;   // a Finder business that's now on the website → shows in the app
    await save(b, Object.assign({ deId: d.id || b.deId }, upd));
    if (page.ok) await needs(null, b.name);
    await logSync(Object.assign(base, { action: b.siteHidden ? 'shown' : 'updated', why: page.ok ? Object.keys(upd).filter(k => !/^(contact|contactEmail|deId|siteHidden|hidden|uploadedAt)$/.test(k) && String(upd[k]) !== String(b[k] == null ? '' : b[k])).join(', ') || 'no changes' : 'page not read: ' + page.why }));
    return { action: 'updated' };
  }
  // a new business
  const published = status === 'PUBLISHED' || ev === 'listing.published' || ev === 'listing.approved';
  if (!page.ok) {
    if (published) { await needs({ name, deId: d.id || '', url, why: page.why }); await logSync(Object.assign(base, { action: 'needs-import', why: page.why })); }
    else await logSync(Object.assign(base, { action: 'skipped', why: 'new listing not readable yet (' + page.why + ')' }));
    return { action: 'needs-import' };
  }
  const nb = Object.assign({ name, slug: bizdir.slugify(name), src: 'website', status: 'published', cat: catFrom(d.categories, items), loc: page.loc || 'UK', img: page.images[0] || '', featured: !!page.featured,
    contact: contact.name || '', contactEmail: contact.email || '', deId: d.id || '', siteAt: now, notes: `Added by the website sync (${now.slice(0, 10)}).` }, fromPage(page));
  await bizdir.save(nb, who);
  await needs(null, name);
  await logSync(Object.assign(base, { slug: nb.slug, action: 'added' }));
  return { action: 'added' };
}

async function overview() {
  const [st, s, n] = [await settings(), (await getJson('dirhook/sync').catch(() => null)) || { items: [] }, (await getJson('dirhook/needs').catch(() => null)) || { items: [] }];
  return { live: st.live, sync: s.items.slice(0, 40), needs: n.items };
}
// HQ: read any listing page (Test read) — or retry one that needed importing
async function testRead(url) {
  const u = String(url || '').trim();
  const full = /^https?:\/\//.test(u) ? u : `${SITE()}/${bizdir.slugify(u)}`;
  if (!full.startsWith(SITE() + '/')) throw new core.HttpError(400, 'invalid', 'Paste a listing link from your directory website.');
  return readListing(full);
}
async function retry(name) { return apply({ event: 'listing.published', data: { name, status: 'PUBLISHED' } }); }
async function dismiss(name) { await needs(null, name); }

module.exports = { apply, parse, readListing, overview, testRead, retry, dismiss, setLive, settings };
