'use strict';
/*
 * 🚶 Walk-through carousel walkers (Carousel Studio).
 * A "walker" is a short clip of a person walking, with the background removed by fal.ai (BiRefNet v2 video).
 * We keep fal's result video AND its mask video (black/white), so the browser can cut the person out reliably on any browser.
 * Clips come from: an AI video made in HQ (Kling, via the existing 🎬 Video ads tools — its fal.ai URL is passed in),
 * or a clip the user uploads (made in Dzine / filmed on a phone) — stored here in pieces and shown to fal.ai through a
 * private, unguessable link (?wsrc=…&t=…) that only works for 2 hours.
 * Storage: hq/walk/list · hq/walk/src/<sid>(+/n) · hq/walk/p/<id>/<v|m><n>
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, getJson, setJson } = core;
const vai = require('./videoai');

const LIST = 'hq/walk/list', MODEL = 'fal-ai/birefnet/v2/video';
const PART_B64 = 2000000, MAX_SRC_PARTS = 4;   // uploads up to ≈ 4.3 MB (what one public link can serve)
const okId = (v, p) => new RegExp('^' + p + '[a-f0-9]{12}$').test(String(v || ''));
const newId = p => p + crypto.randomBytes(6).toString('hex');
const isJob = v => /^https:\/\/queue\.fal\.run\/fal-ai\/birefnet\/[A-Za-z0-9._\-/]+$/.test(String(v || ''));
const isFalMedia = v => /^https:\/\/([a-z0-9-]+\.)*fal\.(media|run|ai)\/[A-Za-z0-9._\-/%]+$/.test(String(v || ''));

async function key() { const s = await vai.settings(); if (!s.falKey) throw new HttpError(400, 'fal_key', 'Removing backgrounds needs fal.ai — add the key in ⚙️ Video AI settings first.'); return s.falKey; }
async function list() { const l = await getJson(LIST).catch(() => null); return { items: (l && l.items) || [] }; }

// ── 📤 an uploaded clip, in pieces ──
async function srcStart(b) {
  const parts = parseInt(b.parts, 10), mime = String(b.mime || '');
  if (!/^video\/(mp4|webm|quicktime)$/.test(mime)) throw new HttpError(400, 'bad_video', 'Please use an MP4, MOV or WebM video.');
  if (!(parts > 0 && parts <= MAX_SRC_PARTS)) throw new HttpError(400, 'too_big', 'That clip is too big — keep it under about 4 MB (5 seconds, 720p is plenty).');
  const sid = newId('s'), t = crypto.randomBytes(16).toString('hex');
  await setJson(`hq/walk/src/${sid}`, { parts, mime, t, at: core.nowIso(), got: 0 });
  return { sid };
}
async function srcPart(b) {
  const idx = parseInt(b.idx, 10); if (!okId(b.sid, 's') || !(idx >= 0 && idx < MAX_SRC_PARTS)) throw new HttpError(400, 'bad_part', 'Bad file part.');
  if (!/^[A-Za-z0-9+/=]+$/.test(String(b.b64 || '')) || b.b64.length > PART_B64) throw new HttpError(400, 'bad_part', 'Bad file part.');
  await setJson(`hq/walk/src/${b.sid}/${idx}`, { b64: b.b64 });
  return { ok: true };
}
// the private link fal.ai downloads the uploaded clip from (no sign-in, but needs the secret and expires)
async function srcPublic(sid, t) {
  if (!okId(sid, 's') || !/^[a-f0-9]{32}$/.test(String(t || ''))) return null;
  const info = await getJson(`hq/walk/src/${sid}`).catch(() => null);
  if (!info || info.t !== t || Date.now() - Date.parse(info.at) > 2 * 3600 * 1000) return null;
  const bufs = []; for (let i = 0; i < info.parts; i++) { const p = await getJson(`hq/walk/src/${sid}/${i}`).catch(() => null); if (!p) return null; bufs.push(Buffer.from(p.b64, 'base64')); }
  return { mime: info.mime, b64: Buffer.concat(bufs).toString('base64') };
}

// ── ✂️ remove the background ──
async function cut(b) {
  let url = '';
  if (b.sid) {
    if (!okId(b.sid, 's')) throw new HttpError(400, 'invalid', 'Which clip?');
    const info = await getJson(`hq/walk/src/${b.sid}`).catch(() => null); if (!info) throw new HttpError(404, 'not_found', 'That upload has gone — please upload it again.');
    const base = String(process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/$/, ''); if (!/^https:\/\//.test(base)) throw new HttpError(500, 'no_site_url', 'The site address isn’t set — redeploy on Netlify and try again.');
    url = `${base}/.netlify/functions/studio-hq?wsrc=${b.sid}&t=${info.t}`;
  } else if (isFalMedia(b.url)) url = b.url;
  else throw new HttpError(400, 'invalid', 'Which clip?');
  const r = await vai.falFetch(`https://queue.fal.run/${MODEL}`, { method: 'POST', timeout: 9500, body: { video_url: url, model: 'General Use (Heavy)', operating_resolution: '1024x1024', refine_foreground: true, output_mask: true, video_output_type: 'X264 (.mp4)', video_quality: 'high', video_write_mode: 'balanced' } }, await key());
  if (!r || !isJob(r.status_url) || !isJob(r.response_url)) throw new HttpError(502, 'fal_error', 'fal.ai didn’t start removing the background — please try again.');
  return { job: { s: r.status_url, r: r.response_url } };
}
async function grab(url) {
  if (!isFalMedia(url)) throw new HttpError(502, 'fal_error', 'fal.ai didn’t send the clip back — please try again.');
  const ctrl = new AbortController(), tm = setTimeout(() => ctrl.abort(), 12000);
  try { const res = await fetch(url, { signal: ctrl.signal }); if (!res.ok) throw new Error(String(res.status)); return Buffer.from(await res.arrayBuffer()); }
  catch (e) { throw new HttpError(502, 'fal_error', 'Couldn’t fetch the cut-out clip — press “Check again”.'); }
  finally { clearTimeout(tm); }
}
async function check(b, email) {
  const job = b.job || {}; if (!isJob(job.s) || !isJob(job.r)) throw new HttpError(400, 'bad_job', 'That job isn’t recognised — please try again.');
  const k = await key(), st = await vai.falFetch(job.s, { timeout: 8000 }, k), status = String((st && st.status) || '');
  if (status !== 'COMPLETED') return { status: status === 'IN_PROGRESS' ? 'working' : 'waiting' };
  const out = await vai.falFetch(job.r, { timeout: 8000 }, k), v = out && out.video, m = out && out.mask_video;
  if (!v || !v.url) throw new HttpError(502, 'fal_error', 'fal.ai didn’t send the clip back: ' + JSON.stringify((out && out.detail) || '').slice(0, 160));
  const [vb, mb] = await Promise.all([grab(v.url), m && m.url ? grab(m.url) : Promise.resolve(null)]);
  const id = newId('w'), save = async (buf, tag) => { const b64 = buf.toString('base64'), n = Math.ceil(b64.length / PART_B64); if (n > 12) throw new HttpError(413, 'too_big', 'That clip came back too big — try a shorter one.'); for (let i = 0; i < n; i++) await setJson(`hq/walk/p/${id}/${tag}${i}`, { b64: b64.slice(i * PART_B64, (i + 1) * PART_B64) }); return n; };
  const vp = await save(vb, 'v'), mp = mb ? await save(mb, 'm') : 0;
  const item = { id, name: String(b.name || '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'My walker', at: core.nowIso(), by: email || '', src: b.src === 'ai' ? 'ai' : 'upload', vp, mp, w: v.width || 0, h: v.height || 0, dur: v.duration || 0 };
  await core.cas(LIST, cur => { const l = ((cur && cur.items) || []).filter(x => x.id !== id); l.unshift(item); return { items: l.slice(0, 60) }; });
  if (b.sid && okId(b.sid, 's')) { const info = await getJson(`hq/walk/src/${b.sid}`).catch(() => null); if (info) { for (let i = 0; i < info.parts; i++) await core.del(`hq/walk/src/${b.sid}/${i}`).catch(() => {}); await core.del(`hq/walk/src/${b.sid}`).catch(() => {}); } }
  return { status: 'done', walker: item };
}
async function part(id, tag, idx) {
  if (!okId(id, 'w') || !/^[vm]$/.test(String(tag)) || !/^\d{1,2}$/.test(String(idx))) return null;
  return getJson(`hq/walk/p/${id}/${tag}${idx}`).catch(() => null);
}
async function rename(b) { const name = String(b.name || '').replace(/\s+/g, ' ').trim().slice(0, 60); if (!okId(b.id, 'w') || !name) throw new HttpError(400, 'invalid', 'Give it a name.'); await core.cas(LIST, cur => ({ items: ((cur && cur.items) || []).map(x => x.id === b.id ? Object.assign({}, x, { name }) : x) })); return list(); }
async function remove(b) {
  if (!okId(b.id, 'w')) throw new HttpError(400, 'invalid', 'Which walker?'); let it = null;
  await core.cas(LIST, cur => { const l = (cur && cur.items) || []; it = l.find(x => x.id === b.id); return { items: l.filter(x => x.id !== b.id) }; });
  if (it) { for (let i = 0; i < (it.vp || 0); i++) await core.del(`hq/walk/p/${it.id}/v${i}`).catch(() => {}); for (let i = 0; i < (it.mp || 0); i++) await core.del(`hq/walk/p/${it.id}/m${i}`).catch(() => {}); }
  return list();
}
module.exports = { list, srcStart, srcPart, srcPublic, cut, check, part, rename, remove };
