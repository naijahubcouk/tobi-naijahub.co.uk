'use strict';
/*
 * 📺 Video quizzes in the app — saved HQ quiz videos that Auntie Tobi chose to "Show in the app".
 * The app plays them like the video (same pictures, voice and music) but stops at each question so people can answer.
 * Nothing new is made here: the pictures and voice lines are the ones HQ already saved for the video.
 *   HQ:  publish(id, lines) · unpublish(id) · publishedIds()
 *   App (app-content, public, read only): publicList(bank) · publicPack(id) · serveImg(id) · serveAudio(hash)
 * Only pictures and voice lines used by a quiz that is in the app can be fetched publicly.
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, getJson, setJson } = core;

const LIST = 'app/vq/list', ASSETS = 'app/vq/assets', PACK = id => `app/vq/p/${id}`;
const MODELS = { flash: 'eleven_flash_v2_5', natural: 'eleven_multilingual_v2' };
const okId = id => /^q[a-z0-9]{6,20}$/.test(String(id || ''));
const ttsHash = (voice, model, text) => crypto.createHash('sha1').update([voice, MODELS[model] || MODELS.flash, String(text).replace(/\s+/g, ' ').trim().slice(0, 600)].join('|')).digest('hex').slice(0, 32);

async function rebuildAssets() {
  const l = (await getJson(LIST).catch(() => null)) || { items: [] }, imgs = {}, aud = {};
  for (const it of l.items) {
    const p = await getJson(PACK(it.id)).catch(() => null); if (!p) continue;
    p.qs.forEach(q => { if (q.img) imgs[q.img] = 1; });
    Object.keys(p.vo || {}).forEach(k => { aud[p.vo[k]] = 1; });
  }
  await setJson(ASSETS, { imgs, aud, at: core.nowIso() });
}

// lines: { intro: 'text', q0: 'text', o0: 'text', a0: 'text', …, outro: 'text' } — the same lines HQ speaks in the video
async function publish(id, lines) {
  if (!okId(id)) throw new HttpError(400, 'invalid', 'Save the quiz first.');
  const s = await getJson(`hq/qv/saved/${id}`); if (!s) throw new HttpError(404, 'not_found', 'Save the quiz first.');
  const d = s.data || {}; if (!(d.qs || []).length) throw new HttpError(400, 'invalid', 'This quiz has no questions.');
  const vo = {};
  if (d.voiceOn && d.voice && lines && typeof lines === 'object') {
    const keys = Object.keys(lines).filter(k => /^(intro|outro|[qoa]\d{1,2})$/.test(k)).slice(0, 60);
    await Promise.all(keys.map(async k => { const h = ttsHash(d.voice, d.model, lines[k]); const hit = await getJson(`hq/qv/tts/${h}`).catch(() => null); if (hit && hit.dataUrl) vo[k] = h; }));
  }
  const pack = {
    id, name: s.name, bank: d.bank, at: core.nowIso(),
    h1: d.h1, h2: d.h2, outro: d.outro, cTitle: d.cTitle || '', cSub: d.cSub || '', cImg: (d.bgs || {})[d.cBg && d.qs.some(q => q.id === d.cBg) ? d.cBg : d.qs[0].id] || '', music: d.music === 'own' ? 'upbeat' : d.music, musicVol: d.musicVol, voiceVol: d.voiceVol, duck: d.duck !== false,
    qs: d.qs.map(q => ({ id: q.id, q: q.q, opts: q.opts, ans: q.ans, hl: q.hl, e: q.e, img: (d.bgs || {})[q.id] || '' })), vo,
  };
  await setJson(PACK(id), pack);
  await core.cas(LIST, cur => { const l = ((cur && cur.items) || []).filter(x => x.id !== id); l.unshift({ id, name: s.name, title: '', bank: d.bank, n: pack.qs.length, at: pack.at, voice: Object.keys(vo).length > 0 }); return { items: l.slice(0, 100) }; });
  await rebuildAssets();
  return { ok: true, voiceLines: Object.keys(vo).length };
}
async function unpublish(id) {
  if (!okId(id)) throw new HttpError(400, 'invalid', 'Which quiz?');
  await core.cas(LIST, cur => ({ items: ((cur && cur.items) || []).filter(x => x.id !== id) }));
  await core.del(PACK(id)).catch(() => {});
  await rebuildAssets();
  return { ok: true };
}
// ✏️ a renamed quiz shows its new name in the app straight away (only if it's in the app)
async function rename(id, name) {
  let hit = false;
  await core.cas(LIST, cur => { const l = ((cur && cur.items) || []).map(x => { if (x.id !== id) return x; hit = true; return Object.assign({}, x, { name, title: '' }); }); return { items: l }; });
  if (hit) { const p = await getJson(PACK(id)).catch(() => null); if (p) { p.name = name; await setJson(PACK(id), p); } }
  return { ok: true, inApp: hit };
}
async function publishedIds() { const l = await getJson(LIST).catch(() => null); return ((l && l.items) || []).map(x => x.id); }

// ── public (the app) ──
const J = (o, age) => ({ statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${age}, s-maxage=${age}`, 'X-Content-Type-Options': 'nosniff' }, body: JSON.stringify(o) });
// the name shown in the app — never the other test's name (older quizzes kept a heading from the other test)
function appName(x) {
  const n = String(x.name || x.title || '').trim(), dflt = x.bank === 'drive' ? 'UK Driving Theory Quiz' : 'Life in the UK Test Quiz';
  if (!n || (x.bank === 'drive' && /life\s*in\s*(the\s*)?uk/i.test(n)) || (x.bank !== 'drive' && /driv/i.test(n))) return dflt + (/\b0*\d{1,3}\s*$/.test(n) ? ' · ' + n.match(/(\d{1,3})\s*$/)[1] : '');
  return n;
}
async function publicList(bank) {
  const l = await getJson(LIST).catch(() => null);
  const items = ((l && l.items) || []).filter(x => !bank || x.bank === bank).map(x => ({ id: x.id, name: appName(x), bank: x.bank, n: x.n, at: x.at, voice: !!x.voice }));
  return J({ items }, 60);
}
async function publicPack(id) {
  if (!okId(id)) throw new HttpError(400, 'invalid', 'Which quiz?');
  const p = await getJson(PACK(id)).catch(() => null); if (!p) throw new HttpError(404, 'not_found', 'That quiz isn’t available any more.');
  // older quizzes could carry the other test's heading — show (and say) the right one
  const wrong = t => p.bank === 'drive' ? /life\s*in\s*(the\s*)?uk/i.test(String(t || '')) : /driv/i.test(String(t || ''));
  if (wrong(p.h1)) { p.h1 = p.bank === 'drive' ? 'QUIZ: UK Driving Theory' : 'QUIZ: Life in the UK Test'; if (p.vo) delete p.vo.intro; }
  if (wrong(p.cTitle)) p.cTitle = p.bank === 'drive' ? 'UK Driving Theory Quiz' : 'Life in the UK Test Quiz';
  if (wrong(p.name)) p.name = appName({ bank: p.bank, name: p.name });
  return J(p, 60);
}
function bin(dataUrl, age) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(String(dataUrl || '')); if (!m) throw new HttpError(404, 'not_found', 'Not found.');
  return { statusCode: 200, headers: { 'Content-Type': m[1], 'Cache-Control': `public, max-age=${age}, immutable`, 'X-Content-Type-Options': 'nosniff' }, body: m[2], isBase64Encoded: true };
}
async function serveImg(id) {
  const a = await getJson(ASSETS).catch(() => null);
  if (!a || !a.imgs || !a.imgs[id]) throw new HttpError(404, 'not_found', 'Not found.');
  const rec = await require('./hq').getImage(id); return bin(rec && rec.dataUrl, 604800);
}
async function serveAudio(h) {
  if (!/^[a-f0-9]{32}$/.test(String(h || ''))) throw new HttpError(404, 'not_found', 'Not found.');
  const a = await getJson(ASSETS).catch(() => null);
  if (!a || !a.aud || !a.aud[h]) throw new HttpError(404, 'not_found', 'Not found.');
  const rec = await getJson(`hq/qv/tts/${h}`).catch(() => null); return bin(rec && rec.dataUrl, 604800);
}

module.exports = { rename, publish, unpublish, publishedIds, publicList, publicPack, serveImg, serveAudio, ttsHash };
