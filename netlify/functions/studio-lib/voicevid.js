'use strict';
/*
 * 🎙️ Voiceover Video (HQ) — the server side.
 *  • script(topic)  GPT-6 Luna writes a short voiceover script in Auntie Tobi's voice (you edit it)
 *  • speak(line)    ElevenLabs (your own subscription, key stays on the server) with word timings, so captions match the voice.
 *                   Each line is saved (hq/vv/tts/<hash>) — the same line with the same voice never uses credits twice.
 *  • save/list/load/remove   saved voiceover videos (hq/vv/saved, hq/vv/p/<id>) · prefs: the default voice
 * Pictures use Video Remix's picture maker (rx-pic); AI clips use Video Ad Studio (vm-clip). The video is made in the browser.
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, getJson, setJson, cas } = core;
const gen = require('./generate');
const qv = require('./quizvideo');

const str = (v, n) => String(v == null ? '' : v).replace(/\r/g, '').slice(0, n);
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toUpperCase() : d);
const okVoice = v => /^[A-Za-z0-9]{10,40}$/.test(String(v || ''));

// ✍️ a short script, one line per scene
async function script(b) {
  const topic = str(b.topic, 1500).trim(); if (topic.length < 4) throw new HttpError(400, 'too_short', 'Tell Auntie Tobi what the video is about.');
  const secs = num(b.secs, 15, 90, 35);
  const settings = await core.getSettings();
  const out = await gen.callModel([
    { role: 'system', content: 'You write voiceover scripts for short vertical videos (Reels/TikTok) for Auntie Tobi (@auntietobi_uk), a warm, trusted UK guide for Nigerians living in the UK. Never say "Africans". British English. Warm, direct, a little playful, like a wise Nigerian auntie. Never invent facts, prices, dates, rules or links — if something must be checked, write it in [square brackets]. Answer with JSON only.' },
    { role: 'user', content: `Write a voiceover script of about ${secs} seconds (roughly ${Math.round(secs * 2.4)} words) about:\n${topic}\n\nStart with a strong hook line that stops the scroll. One short sentence per line (each line becomes one scene). End with a simple call to action (e.g. follow @auntietobi_uk or save this).\nFor each line also describe the background picture that fits it (no text in the picture).\nReturn ONLY JSON: {"lines":[{"t":"spoken line","want":"background picture"}],"caption":"Instagram caption, 40-100 words, ending with 5-8 hashtags","name":"short name for this video"}` },
  ], 1800, settings, { json: true, raw: true, timeoutMs: 26000 });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  let j; try { j = JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { throw new HttpError(502, 'ai_error', 'The script came back garbled — please try again.'); }
  const lines = (Array.isArray(j.lines) ? j.lines : []).slice(0, 30).map(x => ({ t: str(x && x.t, 300).trim(), want: str(x && x.want, 400).trim() })).filter(x => x.t);
  if (!lines.length) throw new HttpError(502, 'ai_error', 'Couldn’t write it just now — please try again.');
  return { lines, caption: str(j.caption, 2200), name: str(j.name, 60) };
}

// 🎙️ one line → MP3 + word timings [[word, start, end], …]
function wordsFrom(al) {
  const ch = (al && al.characters) || [], st = (al && al.character_start_times_seconds) || [], en = (al && al.character_end_times_seconds) || [];
  const out = []; let w = '', s = null, e = 0;
  for (let i = 0; i < ch.length; i++) {
    if (/\s/.test(ch[i])) { if (w) out.push([w, s, e]); w = ''; s = null; continue; }
    if (s == null) s = st[i] || 0; w += ch[i]; e = en[i] || e;
  }
  if (w) out.push([w, s, e]);
  return out.map(x => [x[0], Math.round(x[1] * 1000) / 1000, Math.round(x[2] * 1000) / 1000]);
}
async function speak(b) {
  const text = str(b.text, 600).replace(/\s+/g, ' ').trim(); if (!text) throw new HttpError(400, 'empty', 'Nothing to say.');
  const voice = String(b.voice || ''); if (!okVoice(voice)) throw new HttpError(400, 'invalid', 'Choose a voice first.');
  const model = qv.MODELS[b.model] || qv.MODELS.flash, speed = num(b.speed, 0.8, 1.2, 1);
  const h = crypto.createHash('sha1').update(['vv', voice, model, speed, text].join('|')).digest('hex').slice(0, 32);
  const hit = await getJson(`hq/vv/tts/${h}`).catch(() => null);
  if (hit && hit.dataUrl) return { dataUrl: hit.dataUrl, words: hit.words || [], cached: true };
  const r = await qv.el(`/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, { method: 'POST', timeout: 25000, body: { text, model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.25, speed } } });
  if (!r.ok) {
    const j = await r.json().catch(() => null), why = JSON.stringify((j && j.detail) || j || {}).slice(0, 300);
    console.error('[voicevid] tts', r.status, why);
    if (/quota|credit|limit/i.test(why)) throw new HttpError(402, 'no_credits', 'Your ElevenLabs credits have run out for this month.');
    if (r.status === 401) throw new HttpError(401, 'voice_key', 'ElevenLabs didn’t accept the key — check it in Netlify.');
    throw new HttpError(502, 'voice_error', 'The voice didn’t come back — please try again.');
  }
  const j = await r.json().catch(() => null);
  if (!j || !j.audio_base64 || j.audio_base64.length > 2200000) throw new HttpError(502, 'voice_error', 'The voice didn’t come back — please try again.');
  const dataUrl = 'data:audio/mpeg;base64,' + j.audio_base64, words = wordsFrom(j.alignment || j.normalized_alignment);
  await setJson(`hq/vv/tts/${h}`, { dataUrl, words, at: core.nowIso(), chars: text.length }).catch(() => {});
  return { dataUrl, words, cached: false };
}

// 💾 saved voiceover videos
const LIST = 'hq/vv/saved', PREFS = 'hq/vv/prefs';
function clean(v) {
  v = v && typeof v === 'object' ? v : {};
  const scenes = (Array.isArray(v.scenes) ? v.scenes : []).slice(0, 40).map(s => {
    s = s && typeof s === 'object' ? s : {};
    const o = { t: str(s.t, 300), gap: num(s.gap, 0, 3, 0.35), media: ['photo', 'video', 'color'].includes(s.media) ? s.media : 'photo', color: hex(s.color, '#0F1E36'), want: str(s.want, 400), title: str(s.title, 120) };
    if (/^i[a-z0-9]{6,30}$/.test(String(s.img || ''))) o.img = s.img;
    if (/^https:\/\/[a-z0-9.-]*fal\.media\//i.test(String(s.clip || ''))) o.clip = str(s.clip, 500);
    return o;
  });
  const c = v.cap && typeof v.cap === 'object' ? v.cap : {};
  return {
    name: str(v.name, 80), topic: str(v.topic, 1500), voice: okVoice(v.voice) ? v.voice : '', model: v.model === 'natural' ? 'natural' : 'flash', speed: num(v.speed, 0.8, 1.2, 1),
    scenes, cap: { on: c.on !== false, style: ['yellow', 'white', 'box', 'green'].includes(c.style) ? c.style : 'yellow', y: num(c.y, 0.15, 0.9, 0.72), size: num(c.size, 50, 110, 76) },
    music: ['upbeat', 'calm', 'suspense', 'own', 'none'].includes(v.music) ? v.music : 'calm', musicVol: num(v.musicVol, 0, 100, 20), voiceVol: num(v.voiceVol, 0, 100, 100),
    kb: v.kb !== false, dim: num(v.dim, 0, 0.6, 0.15), caption: str(v.caption, 2200),
  };
}
async function save(b, email) {
  const data = clean(b.data); if (!data.scenes.length) throw new HttpError(400, 'invalid', 'Add your script first.');
  const id = /^v[a-z0-9]{6,20}$/.test(String(b.id || '')) ? b.id : 'v' + crypto.randomBytes(6).toString('hex');
  const name = str(b.name, 80).trim() || data.name || 'Voiceover video', at = core.nowIso();
  await setJson(`hq/vv/p/${id}`, { id, name, at, by: email || '', data });
  await cas(LIST, cur => { const l = ((cur && cur.items) || []).filter(x => x.id !== id); l.unshift({ id, name, at, by: email || '', n: data.scenes.length }); return { items: l.slice(0, 200) }; });
  return { id, name, at };
}
async function list() { const l = await getJson(LIST).catch(() => null); return (l && l.items) || []; }
async function load(id) {
  if (!/^v[a-z0-9]{6,20}$/.test(String(id || ''))) throw new HttpError(400, 'invalid', 'Which video?');
  const r = await getJson(`hq/vv/p/${id}`); if (!r) throw new HttpError(404, 'not_found', 'That video has gone.'); return r;
}
async function remove(id) {
  if (!/^v[a-z0-9]{6,20}$/.test(String(id || ''))) throw new HttpError(400, 'invalid', 'Which video?');
  await core.del(`hq/vv/p/${id}`).catch(() => {});
  await cas(LIST, cur => ({ items: ((cur && cur.items) || []).filter(x => x.id !== id) }));
  return { ok: true };
}
async function prefs() { const p = await getJson(PREFS).catch(() => null); return { voice: (p && p.voice) || '' }; }
async function setVoice(voice) { if (!okVoice(voice)) throw new HttpError(400, 'invalid', 'Which voice?'); await setJson(PREFS, { voice, at: core.nowIso() }); return { voice }; }

module.exports = { script, speak, save, list, load, remove, prefs, setVoice, wordsFrom };
