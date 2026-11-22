'use strict';
/*
 * ✅ Finished videos (HQ) — every MP4 made in 🎙️ Voiceover Video, 🎞️ Video Remix and 🎬 Quiz videos is kept here,
 * so it can be played, downloaded again on any device, marked as posted, or traced back to the draft it came from.
 * The MP4 is stored in pieces (each well under the function size limit), plus a small cover picture.
 *   hq/fin/list            { items: [{ id, tool, name, draftId, at, secs, size, parts, done, posted, caption }] }
 *   hq/fin/<id>/<n>        { b64 }   one piece of the MP4
 *   hq/fin/<id>/thumb      { dataUrl }
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, getJson, setJson, cas } = core;

const LIST = 'hq/fin/list', TOOLS = { vv: '🎙️ Voiceover Video', rx: '🎞️ Video Remix', qv: '🎬 Quiz videos' };
const MAX_PARTS = 240, PART_B64 = 2000000;   // ≈ 1.5 MB per piece, up to ≈ 350 MB per video
const okId = id => /^n[a-f0-9]{12}$/.test(String(id || ''));
const str = (v, n) => String(v == null ? '' : v).slice(0, n);

async function start(b, email) {
  const tool = TOOLS[b.tool] ? b.tool : 'vv', parts = parseInt(b.parts, 10);
  if (!(parts > 0 && parts <= MAX_PARTS)) throw new HttpError(400, 'too_big', 'That video is too big to keep in HQ — download it instead.');
  const id = 'n' + crypto.randomBytes(6).toString('hex');
  if (b.thumb && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(String(b.thumb)) && b.thumb.length < 200000) await setJson(`hq/fin/${id}/thumb`, { dataUrl: b.thumb });
  const item = { id, tool, name: str(b.name, 80).trim() || 'Video', draftId: str(b.draftId, 30), at: core.nowIso(), by: email || '', secs: Math.round(Number(b.secs) || 0), size: Math.round(Number(b.size) || 0), parts, done: false, posted: '', caption: str(b.caption, 2200) };
  await cas(LIST, cur => { const l = ((cur && cur.items) || []); l.unshift(item); return { items: l.slice(0, 300) }; });
  return { id };
}
async function part(id, idx, b64) {
  if (!okId(id) || !(idx >= 0 && idx < MAX_PARTS)) throw new HttpError(400, 'bad_part', 'Bad file part.');
  if (!/^[A-Za-z0-9+/=]+$/.test(String(b64 || '')) || b64.length > PART_B64) throw new HttpError(400, 'bad_part', 'Bad file part.');
  await setJson(`hq/fin/${id}/${idx}`, { b64 });
  return { ok: true };
}
async function patch(id, fn) {
  if (!okId(id)) throw new HttpError(400, 'invalid', 'Which video?');
  let found = null;
  await cas(LIST, cur => { const l = ((cur && cur.items) || []).map(x => { if (x.id !== id) return x; found = Object.assign({}, x); fn(found); return found; }); return { items: l }; });
  if (!found) throw new HttpError(404, 'not_found', 'That video has gone.');
  return { item: found };
}
const done = id => patch(id, x => { x.done = true; });
const posted = (id, on) => patch(id, x => { x.posted = on ? core.nowIso() : ''; });
const rename = (id, name, caption) => patch(id, x => { if (name != null) x.name = str(name, 80).trim() || x.name; if (caption != null) x.caption = str(caption, 2200); });
async function list() {
  const l = await getJson(LIST).catch(() => null), items = ((l && l.items) || []);
  // half-uploaded videos older than a day are tidied away
  const stale = items.filter(x => !x.done && Date.now() - Date.parse(x.at) > 86400000);
  for (const x of stale) await remove(x.id).catch(() => {});
  const live = items.filter(x => x.done || Date.now() - Date.parse(x.at) <= 86400000);
  return { items: live.filter(x => x.done), totalMb: Math.round(live.reduce((a, x) => a + (x.size || 0), 0) / 1e6), tools: TOOLS };
}
async function remove(id) {
  if (!okId(id)) throw new HttpError(400, 'invalid', 'Which video?');
  let it = null;
  await cas(LIST, cur => ({ items: ((cur && cur.items) || []).filter(x => { if (x.id === id) it = x; return x.id !== id; }) }));
  const n = it ? it.parts : MAX_PARTS;
  for (let i = 0; i < n; i++) await core.del(`hq/fin/${id}/${i}`).catch(() => {});
  await core.del(`hq/fin/${id}/thumb`).catch(() => {});
  return { ok: true };
}
async function getPart(id, idx) { return okId(id) && /^\d{1,3}$/.test(String(idx)) ? getJson(`hq/fin/${id}/${idx}`) : null; }
async function getThumb(id) { return okId(id) ? getJson(`hq/fin/${id}/thumb`) : null; }

module.exports = { start, part, done, posted, rename, list, remove, getPart, getThumb, TOOLS };
