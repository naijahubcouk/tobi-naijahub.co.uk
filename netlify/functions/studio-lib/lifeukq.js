'use strict';
/*
 * 🇬🇧 Life in the UK questions — HQ review.
 * The question bank is /lifeuk-q.json (in the repo). HQ can fix a question or change its status without a code change:
 * those fixes are kept in hq/lifeuk/fix and the app reads them from app-content?luq=1 and lays them over the bank.
 * Status: v = Verified (used in the app), r = Needs Review, o = Outdated, d = Duplicate (not used in the app).
 */
const core = require('./core');
const { HttpError, getJson } = core;
const KEYS = { lifeuk: 'hq/lifeuk/fix', drive: 'hq/drive/fix' };   // 🇬🇧 Life in the UK and 🚗 Driving Theory
const keyOf = b => KEYS[b] || KEYS.lifeuk;
const STAT = ['v', 'r', 'o', 'd'];

async function fixes(bank) { const f = await getJson(keyOf(bank)).catch(() => null); return (f && f.fix) || {}; }

function clean(p, bank) {
  const stKey = bank === 'drive' ? 'st' : 's', maxC = bank === 'drive' ? 14 : 5;
  const out = {}, str = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
  const st = p.st != null ? p.st : p.s;
  if (st != null) { if (!STAT.includes(st)) throw new HttpError(400, 'invalid', 'Choose a status.'); out[stKey] = st; }
  if (bank === 'drive') out.rv = new Date().toISOString().slice(0, 10);   // last reviewed
  if (p.q != null) { out.q = str(p.q, 300); if (out.q.length < 5) throw new HttpError(400, 'invalid', 'The question is too short.'); }
  if (p.e != null) out.e = str(p.e, 500);
  if (p.x != null) out.x = str(p.x, 300);
  if (p.c != null) { out.c = parseInt(p.c, 10); if (!(out.c >= 1 && out.c <= maxC)) throw new HttpError(400, 'invalid', 'Topic must be 1 to ' + maxC + '.'); }
  if (p.a != null) out.a = !!p.a;
  if (p.o != null) {
    if (!Array.isArray(p.o) || p.o.length !== 4) throw new HttpError(400, 'invalid', 'A question needs four answers.');
    out.o = p.o.map(x => str(x, 140));
    if (out.o.some(x => !x)) throw new HttpError(400, 'invalid', 'Fill in all four answers.');
    if (new Set(out.o.map(x => x.toLowerCase())).size !== 4) throw new HttpError(400, 'invalid', 'The four answers must all be different.');
  }
  return out;
}

async function setFix(id, patch, email, bank) {
  bank = KEYS[bank] ? bank : 'lifeuk';
  id = parseInt(id, 10); if (!(id > 0 && id < 5000)) throw new HttpError(400, 'invalid', 'Which question?');
  const reset = patch === null;
  const p = reset ? null : clean(patch || {}, bank);
  const r = await core.cas(keyOf(bank), cur => {
    const f = Object.assign({}, (cur && cur.fix) || {}), log = ((cur && cur.log) || []).slice(-199);
    if (reset) delete f[id]; else f[id] = Object.assign({}, f[id] || {}, p);
    log.push({ id, at: core.nowIso(), by: email || '', what: reset ? 'reset' : Object.keys(p).join(',') });
    return { fix: f, log };
  });
  return { fix: r.fix[id] || null };
}

// public (app): just the fixes, small and cached
async function publicFix(bank) {
  const fix = await fixes(bank);
  return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=120, s-maxage=300', 'X-Content-Type-Options': 'nosniff' }, body: JSON.stringify({ fix }) };
}

module.exports = { fixes, setFix, publicFix };
