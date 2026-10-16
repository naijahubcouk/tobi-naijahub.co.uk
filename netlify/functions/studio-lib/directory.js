'use strict';
/*
 * Auntie Tobi business directory lookup for the Studio.
 *
 * Two sources are merged:
 *  1. The live list in the app (AUNTIE_TOBI_DIRECTORY inside /index.html) — all current listings,
 *     read from this site and cached for 6 hours.
 *  2. netlify/functions/directory.json — older list, but it holds email addresses and websites.
 * Email matching ("Is this your business?") only works for listings that have an email in source 2.
 */
const core = require('./core');
const { HttpError, getJson, setJson, env } = core;

let bundled = [];
try { bundled = require('../directory.json'); } catch (_) { bundled = []; }

const CACHE_KEY = 'config/directory-cache';
const CACHE_MS = 6 * 60 * 60 * 1000;
let memo = null;

function unescapeJs(s) { return s.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, ' '); }

// Parses `{name:'…', slug:'…', …}` object literals without evaluating code.
function parseIndexDirectory(html) {
  const start = html.indexOf('AUNTIE_TOBI_DIRECTORY = [');
  if (start < 0) return [];
  const end = html.indexOf('\n];', start);
  const block = html.slice(start, end > 0 ? end : start + 500000);
  const out = [];
  const entryRe = /\{([^{}]*?slug\s*:[^{}]*?)\}/g;
  let m;
  while ((m = entryRe.exec(block))) {
    const e = {};
    const fieldRe = /(\w+)\s*:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|(true|false))/g;
    let f;
    while ((f = fieldRe.exec(m[1]))) {
      e[f[1]] = f[4] !== undefined ? f[4] === 'true' : unescapeJs(f[2] !== undefined ? f[2] : f[3]);
    }
    if (e.slug && e.name) out.push(e);
  }
  return out;
}

function siteBase(event) {
  const configured = env('STUDIO_SITE_URL');
  if (configured) return configured.replace(/\/$/, '');
  return `https://${core.header(event, 'host')}`;
}

async function fetchLive(event) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`${siteBase(event)}/index.html`, { signal: ctrl.signal, headers: { 'User-Agent': 'AuntieTobiStudio/1.0' } });
    if (!res.ok) return [];
    return parseIndexDirectory(await res.text());
  } catch (_) { return []; } finally { clearTimeout(timer); }
}

function merge(live) {
  const bySlug = new Map();
  const norm = s => String(s || '').trim();
  for (const b of bundled) if (b && b.slug) bySlug.set(b.slug, { ...b });
  for (const l of live) {
    const prev = bySlug.get(l.slug) || {};
    bySlug.set(l.slug, { ...prev, ...l, email: prev.email || l.email || '', website: prev.website || l.website || '' });
  }
  return [...bySlug.values()].map(b => ({
    name: norm(b.name), slug: norm(b.slug), cat: norm(b.cat), loc: norm(b.loc), desc: norm(b.desc),
    wa: norm(b.wa), ig: norm(b.ig).replace(/^@/, ''), website: norm(b.website), email: core.normalizeEmail(b.email),
    verified: !!b.verified,
  }));
}

async function load(event) {
  const now = Date.now();
  if (memo && now - memo.at < 10 * 60 * 1000) return memo.list;
  const cached = await getJson(CACHE_KEY).catch(() => null);
  if (cached && now - cached.at < CACHE_MS && Array.isArray(cached.list) && cached.list.length) {
    memo = cached; return cached.list;
  }
  const live = await fetchLive(event);
  const list = merge(live);
  memo = { at: now, list, liveCount: live.length };
  if (live.length) await setJson(CACHE_KEY, memo).catch(() => {});
  return list;
}

function listingUrl(slug) { return `https://www.auntietobi.co.uk/biz/${slug}`; }

// Public view of a listing (email never returned).
function publicListing(b) {
  if (!b) return null;
  return { name: b.name, slug: b.slug, cat: b.cat, loc: b.loc, desc: b.desc, wa: b.wa, ig: b.ig, website: b.website, url: listingUrl(b.slug) };
}

async function bySlug(event, slug) {
  slug = String(slug || '').toLowerCase().trim();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  return (await load(event)).find(b => b.slug === slug) || null;
}

async function byEmail(event, email) {
  email = core.normalizeEmail(email);
  if (!email) return null;
  return (await load(event)).find(b => b.email && b.email === email) || null;
}

// Accepts "auntietobi.co.uk/biz/slug", a full URL, "/biz/slug" or just "slug".
function slugFromLink(link) {
  const s = String(link || '').trim();
  if (!s) return '';
  const m = s.match(/\/biz\/([A-Za-z0-9-]+)/);
  if (m) return m[1].toLowerCase();
  if (/^[A-Za-z0-9-]{1,80}$/.test(s)) return s.toLowerCase();
  if (/^(https?:\/\/)?(www\.)?auntietobi\.co\.uk/i.test(s)) return '';
  throw new HttpError(400, 'invalid_link', 'That doesn\u2019t look like an Auntie Tobi listing link. It should look like auntietobi.co.uk/biz/your-business');
}

module.exports = { load, bySlug, byEmail, slugFromLink, publicListing, listingUrl, parseIndexDirectory };
