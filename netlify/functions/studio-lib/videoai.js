'use strict';
/*
 * Auntie Tobi HQ — 🎬 "Make the whole video" (Video Ad Studio) — AI video, voice and music through fal.ai.
 * Long jobs go through fal's queue: we submit, the browser polls status through HQ, and the finished
 * files stay on fal's CDN (the browser downloads them to edit the final video).
 *
 *   hq/videoai              { falKey, capGbp, models: { budget, premium, top }, voice }   (admin only; key never sent back)
 *   hq/videoai-spend/<YYYY-MM>   { gbp, items: n }          estimated spend (checked against the cap before each job)
 */
const core = require('./core');
const { HttpError, cas, getJson, setJson, env } = core;

const KEY = 'hq/videoai';
const USD_GBP = 0.79;
const TIERS = {
  draft:   { label: '📝 Draft — pictures with motion (no clip cost)', model: '', family: 'none', usdPerSec: 0 },
  budget:  { label: '💚 Budget — Kling 2.6 Pro', model: 'fal-ai/kling-video/v2.6/pro/image-to-video', family: 'kling', usdPerSec: 0.07 },
  premium: { label: '⭐ Premium — Veo 3.1 Fast', model: 'fal-ai/veo3.1/fast/image-to-video', family: 'veo', usdPerSec: 0.10 },
  top:     { label: '💎 Top — Veo 3.1', model: 'fal-ai/veo3.1/image-to-video', family: 'veo', usdPerSec: 0.20 },
};
const TTS_MODEL = 'fal-ai/elevenlabs/tts/multilingual-v2', TTS_USD_PER_1K = 0.10;
const EXTRA = { lipsync: 'fal-ai/kling-video/lipsync/audio-to-video', sfx: 'fal-ai/elevenlabs/sound-effects/v2' };
const LIPSYNC_USD_PER_5S = 0.07, SFX_USD = 0.03;
const MUSIC_MODEL = 'fal-ai/elevenlabs/music', MUSIC_USD_PER_MIN = 0.80;
const VOICES = ['Aria', 'Sarah', 'Laura', 'Charlotte', 'Alice', 'Matilda', 'Jessica', 'Lily', 'Roger', 'Charlie', 'George', 'Callum', 'River', 'Liam', 'Will', 'Eric', 'Chris', 'Brian', 'Daniel', 'Bill'];
const isModelId = v => /^[a-z0-9][a-z0-9._\-/]{3,120}$/i.test(String(v || ''));
const isQueueUrl = v => /^https:\/\/queue\.fal\.run\/[A-Za-z0-9._\-/]+$/.test(String(v || ''));

async function settings() {
  const s = (await getJson(KEY)) || {};
  const models = {};
  Object.keys(TIERS).forEach(k => { if (k !== 'draft') models[k] = isModelId(s.models && s.models[k]) ? s.models[k] : TIERS[k].model; });
  Object.keys(EXTRA).forEach(k => { models[k] = isModelId(s.models && s.models[k]) ? s.models[k] : EXTRA[k]; });
  return { falKey: s.falKey || env('FAL_KEY', ''), capGbp: Number(s.capGbp) > 0 ? Number(s.capGbp) : 50, models, voice: VOICES.includes(s.voice) || /^[A-Za-z0-9]{16,40}$/.test(String(s.voice || '')) ? s.voice : 'Aria', anthropicKey: s.anthropicKey || '', claudeModel: s.claudeModel || 'claude-haiku-5-5', writer: s.writer === 'claude' ? 'claude' : 'standard' };
}
function monthKey() { return `hq/videoai-spend/${core.monthKey()}`; }
async function spent() { const s = (await getJson(monthKey())) || {}; return Math.round((Number(s.gbp) || 0) * 100) / 100; }
async function publicSettings(isAdmin) {
  const s = await settings();
  return {
    ready: !!s.falKey, keyHint: s.falKey ? '••••' + s.falKey.slice(-4) : '', capGbp: s.capGbp, spentGbp: await spent(), models: s.models, voice: s.voice, voices: VOICES,
    tiers: Object.keys(TIERS).map(k => ({ id: k, label: TIERS[k].label, gbpPerSec: Math.round(TIERS[k].usdPerSec * USD_GBP * 1000) / 1000 })), isAdmin: !!isAdmin,
    extraModels: Object.keys(EXTRA), claude: { ready: !!s.anthropicKey, keyHint: s.anthropicKey ? '••••' + s.anthropicKey.slice(-4) : '', model: s.claudeModel, on: s.writer === 'claude' && !!s.anthropicKey }, lipsyncGbpPer5s: Math.round(LIPSYNC_USD_PER_5S * USD_GBP * 100) / 100, sfxGbp: Math.round(SFX_USD * USD_GBP * 100) / 100,
  };
}
async function saveSettings(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  await cas(KEY, cur => {
    cur = cur || {};
    const out = { ...cur };
    if (typeof raw.falKey === 'string' && raw.falKey.trim()) {
      const k = raw.falKey.trim();
      if (!/^[A-Za-z0-9:_\-.]{20,200}$/.test(k)) throw new HttpError(400, 'bad_key', 'That doesn’t look like a fal.ai API key — copy it again from fal.ai → Dashboard → Keys.');
      out.falKey = k;
    }
    if (raw.removeKey) delete out.falKey;
    if (raw.capGbp != null) out.capGbp = Math.max(1, Math.min(2000, Math.round(Number(raw.capGbp) || 50)));
    if (raw.models && typeof raw.models === 'object') { out.models = { ...(cur.models || {}) }; Object.keys(TIERS).concat(Object.keys(EXTRA)).forEach(k => { if (isModelId(raw.models[k])) out.models[k] = raw.models[k]; }); }
    if (typeof raw.anthropicKey === 'string' && raw.anthropicKey.trim()) { const k = raw.anthropicKey.trim(); if (!/^sk-ant-[A-Za-z0-9_\-]{20,200}$/.test(k)) throw new HttpError(400, 'bad_key', 'That doesn’t look like an Anthropic API key (it starts with sk-ant-).'); out.anthropicKey = k; }
    if (raw.removeAnthropic) { delete out.anthropicKey; out.writer = 'standard'; }
    if (raw.writer) out.writer = raw.writer === 'claude' ? 'claude' : 'standard';
    if (raw.claudeModel && /^claude-[a-z0-9.\-]{3,60}$/.test(raw.claudeModel)) out.claudeModel = raw.claudeModel;
    if (raw.voice && (VOICES.includes(raw.voice) || /^[A-Za-z0-9]{16,40}$/.test(raw.voice))) out.voice = raw.voice;
    return out;
  });
  return true;
}

// ── spending cap ──
async function charge(gbp, what) {
  const s = await settings();
  await cas(monthKey(), cur => {
    cur = cur || { gbp: 0, items: 0 };
    if ((cur.gbp || 0) + gbp > s.capGbp) throw new HttpError(402, 'cap_reached', `This would go over the £${s.capGbp} monthly video AI cap (£${(cur.gbp || 0).toFixed(2)} used so far). An admin can raise the cap in ⚙️ Video AI settings.`);
    return { gbp: Math.round(((cur.gbp || 0) + gbp) * 1000) / 1000, items: (cur.items || 0) + 1, last: what, at: core.nowIso() };
  });
}
async function refund(gbp) { await cas(monthKey(), cur => { if (!cur) return undefined; return { ...cur, gbp: Math.max(0, Math.round(((cur.gbp || 0) - gbp) * 1000) / 1000) }; }); }

// ── fal.ai ──
async function falFetch(url, opts, key) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), (opts && opts.timeout) || 9000);
  let res, data;
  try {
    res = await fetch(url, { method: (opts && opts.method) || 'GET', signal: ctrl.signal, headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' }, body: opts && opts.body ? JSON.stringify(opts.body) : undefined });
    data = await res.json().catch(() => null);
  } catch (e) { throw new HttpError(504, 'fal_timeout', 'fal.ai took too long to answer — please try again.'); }
  finally { clearTimeout(timer); }
  if (res.status === 401 || res.status === 403) throw new HttpError(400, 'fal_key', 'fal.ai didn’t accept the API key — check it in ⚙️ Video AI settings.');
  if (res.status === 402 || (data && /balance|credit|payment/i.test(JSON.stringify(data.detail || '')))) throw new HttpError(402, 'fal_credit', 'Your fal.ai account needs more credit — top up at fal.ai → Billing.');
  if (!res.ok) {
    const msg = data && (typeof data.detail === 'string' ? data.detail : Array.isArray(data.detail) ? data.detail.map(d => d.msg).join('; ') : '');
    throw new HttpError(502, 'fal_error', `fal.ai said: ${String(msg || res.status).slice(0, 200)}`);
  }
  return data;
}
async function needKey() { const s = await settings(); if (!s.falKey) throw new HttpError(400, 'no_key', 'Add your fal.ai API key in ⚙️ Video AI settings first.'); return s; }

// One scene clip. image = data URL of the start frame.
function clipLength(family, seconds) {
  seconds = Number(seconds) || 5;
  if (family === 'veo') return seconds <= 4 ? 4 : seconds <= 6 ? 6 : 8;
  return seconds <= 5 ? 5 : 10;
}
async function submitClip({ tier, imgId, prompt, seconds, negative, aspect }) {
  const s = await needKey();
  const img = await require('./eventsub').getImage(imgId), image = img && img.dataUrl;
  const t = TIERS[tier] && tier !== 'draft' ? tier : 'budget', T = TIERS[t], model = s.models[t];
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(String(image || ''))) throw new HttpError(400, 'no_frame', 'This scene needs a start picture first.');
  const len = clipLength(T.family, seconds), gbp = Math.round(len * T.usdPerSec * USD_GBP * 100) / 100;
  const p = String(prompt || '').slice(0, 2400);
  const body = T.family === 'veo'
    ? { prompt: p, image_url: image, aspect_ratio: aspect === '16:9' ? '16:9' : aspect === '9:16' || !aspect ? '9:16' : 'auto', duration: `${len}s`, resolution: '720p', generate_audio: false, negative_prompt: String(negative || '').slice(0, 500) || undefined }
    : { prompt: p, start_image_url: image, duration: String(len), generate_audio: false, negative_prompt: String(negative || 'blur, distort, low quality, text, watermark').slice(0, 500) };
  await charge(gbp, `clip ${model}`);
  try {
    const r = await falFetch(`https://queue.fal.run/${model}`, { method: 'POST', body, timeout: 9000 }, s.falKey);
    if (!r || !isQueueUrl(r.status_url) || !isQueueUrl(r.response_url)) throw new HttpError(502, 'fal_error', 'fal.ai didn’t start the job — please try again.');
    return { requestId: r.request_id, statusUrl: r.status_url, responseUrl: r.response_url, model, seconds: len, gbp };
  } catch (e) { await refund(gbp); throw e; }
}
async function submitMusic({ prompt, seconds }) {
  const s = await needKey();
  const secs = Math.max(10, Math.min(120, Number(seconds) || 30)), gbp = Math.round(secs / 60 * MUSIC_USD_PER_MIN * USD_GBP * 100) / 100;
  await charge(gbp, 'music');
  try {
    const r = await falFetch(`https://queue.fal.run/${MUSIC_MODEL}`, { method: 'POST', body: { prompt: `${String(prompt || 'Upbeat warm Afrobeats-inspired background music for an advert').slice(0, 500)}. Instrumental only, no vocals. About ${secs} seconds long, with a clean ending.`, instrumental: true } }, s.falKey);
    if (!r || !isQueueUrl(r.status_url) || !isQueueUrl(r.response_url)) throw new HttpError(502, 'fal_error', 'fal.ai didn’t start the music — please try again.');
    return { requestId: r.request_id, statusUrl: r.status_url, responseUrl: r.response_url, gbp };
  } catch (e) { await refund(gbp); throw e; }
}
// status for several jobs at once → [{ status, url?, error? }]
async function status(jobs) {
  const s = await needKey();
  const list = (Array.isArray(jobs) ? jobs : []).slice(0, 16);
  return Promise.all(list.map(async j => {
    if (!j || !isQueueUrl(j.statusUrl) || !isQueueUrl(j.responseUrl)) return { status: 'ERROR', error: 'Unknown job' };
    try {
      const st = await falFetch(j.statusUrl, { timeout: 6000 }, s.falKey);
      const state = st && st.status;
      if (state !== 'COMPLETED') return { status: state || 'IN_QUEUE', position: st && st.queue_position };
      const out = await falFetch(j.responseUrl, { timeout: 8000 }, s.falKey);
      const url = out && ((out.video && out.video.url) || (out.audio && out.audio.url) || (out.audio_file && out.audio_file.url));
      if (!url) return { status: 'ERROR', error: String((out && out.detail && JSON.stringify(out.detail)) || 'No file came back').slice(0, 200) };
      return { status: 'COMPLETED', url };
    } catch (e) { return { status: 'ERROR', error: e.message }; }
  }));
}
// Voiceover line (fast, done straight away)
async function tts({ text, voice }) {
  const s = await needKey();
  text = String(text || '').replace(/\[pause\]/gi, '…').replace(/\s+/g, ' ').trim().slice(0, 800);
  if (!text) throw new HttpError(400, 'empty', 'No voiceover text.');
  const gbp = Math.max(0.01, Math.round(text.length / 1000 * TTS_USD_PER_1K * USD_GBP * 100) / 100);
  await charge(gbp, 'voice');
  try {
    const v = VOICES.includes(voice) || /^[A-Za-z0-9]{16,40}$/.test(String(voice || '')) ? voice : s.voice;
    const r = await falFetch(`https://fal.run/${TTS_MODEL}`, { method: 'POST', body: { text, voice: v, stability: 0.45, similarity_boost: 0.75, style: 0.3 }, timeout: 9500 }, s.falKey);
    const url = r && r.audio && r.audio.url;
    if (!url) throw new HttpError(502, 'fal_error', 'The voice didn’t come back — please try again.');
    return { url, gbp };
  } catch (e) { await refund(gbp); throw e; }
}

// 🎤 Your own voice recordings (one per scene, or one for the whole ad)
const crypto = require('crypto');
async function saveAudio(dataUrl, by) {
  const m = /^data:(audio\/(?:webm|ogg|mpeg|mp3|mp4|wav|x-wav|x-m4a|aac|m4a))(?:;codecs=[^;,]+)?;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new HttpError(400, 'bad_audio', 'Please use an MP3, M4A, WAV or WebM sound file.');
  if (dataUrl.length > 2300000) throw new HttpError(413, 'too_large', 'That recording is too long — keep it under about 2 minutes (or 1.6 MB).');
  const id = 'a' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
  await setJson(`hq/vaudio/${id}`, { dataUrl: `data:${m[1]};base64,${m[2]}`, by, at: core.nowIso() });
  return id;
}
async function getAudio(id) { return /^a[a-z0-9]{8,30}$/.test(String(id || '')) ? getJson(`hq/vaudio/${id}`) : null; }

// Writer: Claude (optional) — used by videoad.ask when switched on
async function claudeConfig() {
  const s = await settings();
  if (s.writer !== 'claude' || !s.anthropicKey) return null;
  const haiku = /haiku/.test(s.claudeModel);
  return { key: s.anthropicKey, model: s.claudeModel, inUsdPerM: haiku ? 1 : 3, outUsdPerM: haiku ? 5 : 15 };
}
async function addCost(usd, what) { const gbp = Math.max(0, Number(usd) || 0) * USD_GBP; if (gbp > 0) await cas(monthKey(), cur => { cur = cur || { gbp: 0, items: 0 }; return { ...cur, gbp: Math.round(((cur.gbp || 0) + gbp) * 1000) / 1000, last: what }; }); }

// 👄 Lip sync one clip to one voice line (Kling LipSync)
async function submitLipsync({ videoUrl, audioUrl, seconds }) {
  const s = await needKey();
  const ok = u => /^https:\/\/[A-Za-z0-9.\-]+\.(fal\.media|googleapis\.com)\/[^\s"'<>]{3,600}$/.test(String(u || ''));
  if (!ok(videoUrl) || !ok(audioUrl)) throw new HttpError(400, 'bad_media', 'Lip sync needs the AI clip and an AI voice line for this scene.');
  const gbp = Math.round(Math.ceil(Math.max(2, Number(seconds) || 5) / 5) * LIPSYNC_USD_PER_5S * USD_GBP * 100) / 100;
  await charge(gbp, 'lip sync');
  try {
    const r = await falFetch(`https://queue.fal.run/${s.models.lipsync}`, { method: 'POST', body: { video_url: videoUrl, audio_url: audioUrl } }, s.falKey);
    if (!r || !isQueueUrl(r.status_url) || !isQueueUrl(r.response_url)) throw new HttpError(502, 'fal_error', 'fal.ai didn’t start the lip sync — please try again.');
    return { requestId: r.request_id, statusUrl: r.status_url, responseUrl: r.response_url, model: s.models.lipsync, gbp };
  } catch (e) { await refund(gbp); throw e; }
}
// 🔊 One sound effect
async function submitSfx({ text, seconds }) {
  const s = await needKey();
  const t = String(text || '').trim().slice(0, 300); if (!t) throw new HttpError(400, 'empty', 'No sound effect described.');
  const gbp = Math.round(SFX_USD * USD_GBP * 100) / 100;
  await charge(gbp, 'sound effect');
  try {
    const r = await falFetch(`https://queue.fal.run/${s.models.sfx}`, { method: 'POST', body: { text: t, duration_seconds: Math.max(0.5, Math.min(10, Number(seconds) || 3)), prompt_influence: 0.4 } }, s.falKey);
    if (!r || !isQueueUrl(r.status_url) || !isQueueUrl(r.response_url)) throw new HttpError(502, 'fal_error', 'fal.ai didn’t start the sound effect — please try again.');
    return { requestId: r.request_id, statusUrl: r.status_url, responseUrl: r.response_url, model: s.models.sfx, gbp };
  } catch (e) { await refund(gbp); throw e; }
}
// 💾 Finished videos are kept in HQ in pieces (each under the function size limit)
async function saveFinalPart(fid, idx, b64) {
  if (!/^f[a-z0-9]{8,30}$/.test(String(fid)) || !(idx >= 0 && idx < 80)) throw new HttpError(400, 'bad_part', 'Bad file part.');
  if (!/^[A-Za-z0-9+/=]+$/.test(String(b64 || '')) || b64.length > 2000000) throw new HttpError(400, 'bad_part', 'Bad file part.');
  await setJson(`hq/vfinal/${fid}/${idx}`, { b64 });
  return true;
}
async function getFinalPart(fid, idx) { return /^f[a-z0-9]{8,30}$/.test(String(fid)) && /^\d{1,2}$/.test(String(idx)) ? getJson(`hq/vfinal/${fid}/${idx}`) : null; }
async function deleteFinal(fid, parts) { if (!/^f[a-z0-9]{8,30}$/.test(String(fid))) return; for (let i = 0; i < Math.min(80, Number(parts) || 0); i++) await core.del(`hq/vfinal/${fid}/${i}`).catch(() => {}); }

module.exports = { claudeConfig, addCost, submitLipsync, submitSfx, saveFinalPart, getFinalPart, deleteFinal, saveAudio, getAudio, publicSettings, saveSettings, submitClip, submitMusic, status, tts, spent, TIERS, VOICES, clipLength };
