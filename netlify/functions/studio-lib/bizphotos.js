'use strict';
/*
 * 📷 Auntie Tobi keeps its own copy of each business's main photo.
 * The directory website stores photos on Bunny (naijabiz.b-cdn.net) and CloudFront, which may block other sites
 * from showing them. So each photo is downloaded once, resized by the website's own image service, and saved
 * with the other business pictures (bizimg/<slug>, served at /bimg/<slug>-<ver>.jpg).
 *   b.img      → our /bimg/ address once copied
 *   b.imgFrom  → the website photo it was copied from (a new website photo is copied again)
 *   bizphotos/state { failed: { <slug>: { url, why, n, at } }, lastRun }
 * Runs: after a CSV import (from HQ), from HQ's "Copy photos now", and every day in the scheduled housekeeping.
 */
const core = require('./core');
const { getJson, cas } = core;

const SITE = () => String(core.env('DIRECTORY_SITE', 'https://directory.auntietobi.co.uk')).replace(/\/$/, '');
const KEY = 'bizphotos/state';
const MAX_TRIES = 3;
const SERVE_MAX = 4 * 1024 * 1024;   // a copied photo must stay under this to be sent to phones
const UA = 'Mozilla/5.0 (compatible; AuntieTobiBot/1.0; +https://www.auntietobi.co.uk)';

const ours = u => /^\/(bimg|biz-img)\//.test(String(u || '')) || /^https:\/\/(www\.)?auntietobi\.co\.uk\/(bimg|biz-img)\//.test(String(u || ''));
const external = u => /^https:\/\//.test(String(u || '')) && !ours(u);

async function state() { return (await getJson(KEY).catch(() => null)) || { failed: {} }; }

// fetch with a time limit; returns { type, buf } or throws
async function grab(url, ms) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms || 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': UA, Accept: 'image/jpeg,image/png,image/webp;q=0.9,*/*;q=0.5', Referer: SITE() + '/' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    let type = String(r.headers.get('content-type') || '').toLowerCase().split(';')[0];
    const buf = Buffer.from(await r.arrayBuffer());
    // some photo hosts (e.g. uploads without a file ending) don't say what they are — look at the file itself
    const sniff = buf[0] === 0xFF && buf[1] === 0xD8 ? 'image/jpeg' : buf[0] === 0x89 && buf[1] === 0x50 ? 'image/png' : buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP' ? 'image/webp' : '';
    type = sniff;   // trust the file itself, not what the server says (an error page can arrive labelled as a photo)
    if (!type) throw new Error('not a JPG, PNG or WebP photo');
    return { type, buf };
  } finally { clearTimeout(t); }
}
// The website's Next.js image service gives a resized copy (small enough to keep); the original is the fallback.
async function download(url) {
  const tries = [`${SITE()}/_next/image?url=${encodeURIComponent(url)}&w=828&q=78`, `${SITE()}/_next/image?url=${encodeURIComponent(url)}&w=640&q=75`, url];
  let last = null;
  for (const u of tries) {
    try {
      const { type, buf } = await grab(u);
      if (buf.length < 1500) throw new Error('too small');
      if (buf.length > SERVE_MAX) throw new Error('too large to show (' + Math.round(buf.length / 1024) + ' KB) — ask the business for a smaller photo');
      return `data:${type};base64,${buf.toString('base64')}`;
    } catch (e) { last = e; }
  }
  throw last || new Error('could not download');
}

async function todo() {
  const st = await state();
  return (await require('./bizdir').all()).filter(b => !b.hidden && external(b.img) && !((st.failed[b.slug] || {}).url === b.img && st.failed[b.slug].n >= MAX_TRIES));
}

async function copyOne(b) {
  const bizdir = require('./bizdir'), bizimg = require('./bizimg');
  const from = b.img;
  try {
    const dataUrl = await download(from);
    const url = await bizimg.put(b.slug, dataUrl, 'site');
    const cur = (await bizdir.all()).find(x => x.slug === b.slug);
    if (!cur || cur.img !== from) return { ok: false, why: 'changed meanwhile' };
    await bizdir.save(Object.assign({}, cur, { origSlug: cur.slug, img: url.replace(/^https?:\/\/[^/]+/, ''), imgFrom: from }), 'photo copy');
    await cas(KEY, s => { s = s || { failed: {} }; if (!s.failed[b.slug]) return undefined; delete s.failed[b.slug]; return s; }).catch(() => {});
    return { ok: true };
  } catch (e) {
    const why = String((e && e.message) || e).slice(0, 120);
    await cas(KEY, s => { s = s || { failed: {} }; const f = s.failed[b.slug]; s.failed[b.slug] = { url: from, why, n: f && f.url === from ? f.n + 1 : 1, at: core.nowIso() }; return s; }).catch(() => {});
    return { ok: false, why };
  }
}

// Copies as many photos as fit in the time given (a few at a time).
async function run(budgetMs) {
  const end = Date.now() + (budgetMs || 15000);
  const list = await todo();
  let copied = 0, failed = 0;
  for (let i = 0; i < list.length && Date.now() < end - 3000; i += 3) {
    const res = await Promise.all(list.slice(i, i + 3).map(copyOne));
    res.forEach(r => { if (r.ok) copied++; else failed++; });
  }
  await cas(KEY, s => Object.assign(s || { failed: {} }, { lastRun: core.nowIso() })).catch(() => {});
  return Object.assign({ copiedNow: copied, failedNow: failed }, await summary());
}

async function summary() {
  const all = (await require('./bizdir').all()).filter(b => !b.hidden), st = await state();
  const withPhoto = all.filter(b => b.img), copied = withPhoto.filter(b => ours(b.img)).length;
  const waiting = all.filter(b => external(b.img));
  const gaveUp = waiting.filter(b => (st.failed[b.slug] || {}).url === b.img && st.failed[b.slug].n >= MAX_TRIES);
  return { total: all.length, withPhoto: withPhoto.length, copied, left: waiting.length - gaveUp.length, gaveUp: gaveUp.map(b => ({ slug: b.slug, name: b.name, why: st.failed[b.slug].why, url: b.img })).slice(0, 40), trying: waiting.filter(b => st.failed[b.slug] && !gaveUp.includes(b)).map(b => ({ name: b.name, why: st.failed[b.slug].why })).slice(0, 40), noPhoto: all.length - withPhoto.length, lastRun: st.lastRun || '' };
}
// 🔍 Checks the copies already made: anything that isn't really a photo, or is too big to send, is copied again.
async function check(budgetMs) {
  const end = Date.now() + (budgetMs || 12000), bizdir = require('./bizdir');
  const st = await state(); let cursor = st.checkCursor || 0, fixed = 0, checked = 0;
  const list = (await bizdir.all()).filter(b => !b.hidden && b.imgFrom && ours(b.img));
  if (cursor >= list.length) cursor = 0;
  for (; cursor < list.length && Date.now() < end; cursor++) {
    const b = list[cursor]; checked++;
    const rec = await getJson('bizimg/' + b.slug).catch(() => null);
    const m = rec && /^data:image\/(jpeg|png|webp);base64,(.*)$/.exec(rec.dataUrl || '');
    let bad = !m;
    if (m) { const head = Buffer.from(m[2].slice(0, 24), 'base64'); const real = head[0] === 0xFF && head[1] === 0xD8 || head[0] === 0x89 && head[1] === 0x50 || head.slice(0, 4).toString() === 'RIFF'; bad = !real || m[2].length * 3 / 4 > SERVE_MAX; }
    if (bad) { await bizdir.save(Object.assign({}, b, { origSlug: b.slug, img: b.imgFrom, imgFrom: null }), 'photo check'); fixed++; }
  }
  await cas(KEY, s2 => Object.assign(s2 || { failed: {} }, { checkCursor: cursor >= list.length ? 0 : cursor, checkedAt: cursor >= list.length ? core.nowIso() : (s2 && s2.checkedAt) || '' }));
  return { checked, fixed, done: cursor >= list.length, total: list.length };
}
async function retry() { await cas(KEY, s => Object.assign(s || {}, { failed: {} })); }

module.exports = { run, summary, retry, check, external, ours };
