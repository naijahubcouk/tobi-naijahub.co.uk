'use strict';
/*
 * Light-touch website check. We can't prove someone owns a website, so we flag what looks wrong for Admin:
 *   name_differs — the business name they saved doesn't look like the name on the website we read
 *   shared       — another member already uses the same website
 * Nothing is blocked. HQ won't use an Instagram that came from a flagged website until Admin confirms it.
 *   webread/<email>   { host, name, at }      (last website read during setup)
 *   website/owners    { map: { <host>: [emails] } }
 * Profile fields: websiteCheck ('ok' | 'name_differs' | 'shared'), websiteConfirmed (Admin), igSource ('website' | 'listing' | '')
 */
const core = require('./core');
const { getJson, setJson, cas, enc } = core;

const KEY = 'website/owners';
function hostOf(url) {
  try { return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
}
const STOP = new Set(['the', 'and', 'ltd', 'limited', 'uk', 'co', 'by', 'of', 'company', 'services', 'service', 'shop', 'store', 'official', 'home', 'welcome', 'to']);
const words = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(w => w.length >= 3 && !STOP.has(w));
function similar(a, b) {
  const A = words(a), B = words(b);
  if (!A.length || !B.length) return true; // nothing to compare — don't flag
  const ja = A.join(''), jb = B.join('');
  if (ja.includes(jb) || jb.includes(ja)) return true;
  return A.some(w => B.some(v => w === v || (w.length >= 4 && v.length >= 4 && (w.includes(v) || v.includes(w)))));
}

async function recordRead(email, url, site, draft) {
  const host = hostOf((site && site.url) || url);
  if (!host) return;
  await setJson(`webread/${enc(email)}`, { host, name: String((draft && draft.businessName) || (site && site.name) || '').slice(0, 120), at: core.nowIso() }).catch(() => {});
}

async function owners() {
  const o = await getJson(KEY);
  if (o && o.map) return o.map;
  const map = {};
  for (const k of await core.listKeys('profiles/').catch(() => [])) {
    const p = await getJson(k).catch(() => null); const h = p && p.website ? hostOf(p.website) : '';
    if (h) (map[h] = map[h] || []).push(core.normalizeEmail(decodeURIComponent(k.slice('profiles/'.length))));
  }
  await cas(KEY, cur => (cur && cur.map ? undefined : { map }));
  return ((await getJson(KEY)) || { map }).map;
}
async function setOwner(email, host) {
  email = core.normalizeEmail(email);
  await owners();
  await cas(KEY, cur => {
    const map = { ...((cur && cur.map) || {}) }; let changed = false;
    for (const h of Object.keys(map)) if (h !== host && map[h].includes(email)) { map[h] = map[h].filter(e => e !== email); if (!map[h].length) delete map[h]; changed = true; }
    if (host && !(map[host] || []).includes(email)) { map[host] = [...(map[host] || []), email]; changed = true; }
    return changed ? { ...(cur || {}), map } : undefined;
  });
}
async function release(email) { await setOwner(email, ''); }

// Called on profile save. Returns the check fields to store on the profile.
async function check(email, p, prev) {
  const host = p.website ? hostOf(p.website) : '';
  await setOwner(email, host).catch(() => {});
  if (!host) return { websiteCheck: '', websiteConfirmed: false };
  const sameAsBefore = prev && prev.website && hostOf(prev.website) === host;
  const others = ((await owners().catch(() => ({})))[host] || []).filter(e => e !== core.normalizeEmail(email));
  let result = 'ok';
  if (others.length) result = 'shared';
  else {
    const r = await getJson(`webread/${enc(email)}`).catch(() => null);
    if (r && r.host === host && r.name && !similar(r.name, p.businessName)) result = 'name_differs';
  }
  return { websiteCheck: result, websiteConfirmed: !!(sameAsBefore && prev.websiteConfirmed) };
}

// Trusted = HQ may use details that came from the website.
function trusted(p) { return !p || !p.website || !!p.websiteConfirmed || !p.websiteCheck || p.websiteCheck === 'ok'; }

module.exports = { hostOf, similar, recordRead, owners, check, release, trusted };
