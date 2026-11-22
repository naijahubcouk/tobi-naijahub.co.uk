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
    if (r.status === 401 || r.status === 403) throw new HttpError(400, 'voice_key', /permission/i.test(why) ? 'Your ElevenLabs key isn’t allowed to do this yet — in ElevenLabs open your API key settings and turn on “Text to Speech”, then try again.' : 'ElevenLabs didn’t accept the key — check it in Netlify.');
    throw new HttpError(502, 'voice_error', 'The voice didn’t come back — please try again.');
  }
  const j = await r.json().catch(() => null);
  if (!j || !j.audio_base64 || j.audio_base64.length > 2200000) throw new HttpError(502, 'voice_error', 'The voice didn’t come back — please try again.');
  const dataUrl = 'data:audio/mpeg;base64,' + j.audio_base64, words = wordsFrom(j.alignment || j.normalized_alignment);
  await setJson(`hq/vv/tts/${h}`, { dataUrl, words, at: core.nowIso(), chars: text.length }).catch(() => {});
  return { dataUrl, words, cached: false };
}

// 🎧 your own audio → words with timings (ElevenLabs speech-to-text), one ~1-minute piece at a time
async function stt(b) {
  const k = qv.key(); if (!k) throw new HttpError(400, 'no_voice_key', 'ElevenLabs isn’t set up yet — use 🆓 Free instead, or add your ElevenLabs key in Netlify.');
  const b64 = String(b.b64 || ''); if (!/^[A-Za-z0-9+/=]+$/.test(b64) || b64.length > 4500000) throw new HttpError(400, 'invalid', 'That piece of audio is too big.');
  const offset = num(b.offset, 0, 3600, 0);
  const fd = new FormData();
  fd.append('model_id', process.env.ELEVENLABS_STT_MODEL || 'scribe_v2');
  fd.append('timestamps_granularity', 'word'); fd.append('tag_audio_events', 'false');
  if (b.lang === 'en') fd.append('language_code', 'eng');
  fd.append('file', new Blob([Buffer.from(b64, 'base64')], { type: 'audio/wav' }), 'piece.wav');
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 25000);
  let r;
  try { r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': k }, body: fd, signal: ctrl.signal }); }
  catch (e) { throw new HttpError(504, 'stt_timeout', 'ElevenLabs took too long — please try again.'); } finally { clearTimeout(t); }
  if (!r.ok) {
    const j = await r.json().catch(() => null), why = JSON.stringify((j && j.detail) || j || {}).slice(0, 300);
    console.error('[voicevid] stt', r.status, why);
    if (/quota|credit|limit|exceed/i.test(why)) throw new HttpError(402, 'no_credits', 'Your ElevenLabs speech-to-text allowance has run out — use 🆓 Free instead.');
    if (r.status === 401 || r.status === 403) throw new HttpError(400, 'voice_key', /permission/i.test(why) ? 'Your ElevenLabs key isn’t allowed to do this yet — in ElevenLabs open your API key settings and turn on “Speech to Text”, then try again.' : 'ElevenLabs didn’t accept the key — check it in Netlify.');
    throw new HttpError(502, 'stt_error', 'ElevenLabs couldn’t write down the words — please try again.');
  }
  const j = await r.json();
  const words = (j.words || []).filter(w => w && w.type === 'word' && w.start != null && String(w.text || '').trim()).map(w => [String(w.text).trim(), Math.round((w.start + offset) * 1000) / 1000, Math.round(((w.end != null ? w.end : w.start) + offset) * 1000) / 1000]);
  return { words, text: str(j.text, 20000) };
}
// 📝 you pasted the words: ElevenLabs works out when each one is said (forced alignment) — on the audio already kept in HQ
async function align(b) {
  const k = qv.key(); if (!k) throw new HttpError(400, 'no_voice_key', 'ElevenLabs isn’t set up yet — use 🆓 Free instead.');
  const text = str(b.text, 20000).trim(); if (text.length < 2) throw new HttpError(400, 'invalid', 'Paste the words first.');
  const info = await audInfo(b.id); if (!info) throw new HttpError(404, 'not_found', 'The audio wasn’t found — please upload it again.');
  const bufs = []; for (let i = 0; i < info.parts; i++) { const rec = await audGet(b.id, i); if (!rec) throw new HttpError(404, 'not_found', 'Part of the audio is missing — please upload it again.'); bufs.push(Buffer.from(rec.b64, 'base64')); }
  const fd = new FormData();
  fd.append('file', new Blob([Buffer.concat(bufs)], { type: info.mime || 'audio/mpeg' }), info.name || 'audio');
  fd.append('text', text);
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 25000);
  let r;
  try { r = await fetch('https://api.elevenlabs.io/v1/forced-alignment', { method: 'POST', headers: { 'xi-api-key': k }, body: fd, signal: ctrl.signal }); }
  catch (e) { throw new HttpError(504, 'stt_timeout', 'ElevenLabs took too long — try a shorter clip or 🆓 Free.'); } finally { clearTimeout(t); }
  if (!r.ok) {
    const j = await r.json().catch(() => null), why = JSON.stringify((j && j.detail) || j || {}).slice(0, 300);
    console.error('[voicevid] align', r.status, why);
    if (/quota|credit|limit|exceed/i.test(why)) throw new HttpError(402, 'no_credits', 'Your ElevenLabs allowance has run out — use 🆓 Free instead.');
    throw new HttpError(502, 'stt_error', 'ElevenLabs couldn’t match the words to the audio — check the text is what’s said, or use 🆓 Free.');
  }
  const j = await r.json();
  return { words: (j.words || []).filter(w => w && String(w.text || '').trim() && w.start != null).map(w => [String(w.text).trim(), Math.round(w.start * 1000) / 1000, Math.round((w.end != null ? w.end : w.start) * 1000) / 1000]) };
}
// ✨ a background picture idea for each scene, from what's said
async function wants(b) {
  const lines = (Array.isArray(b.lines) ? b.lines : []).slice(0, 40).map(x => str(x, 300));
  if (!lines.length) throw new HttpError(400, 'invalid', 'No scenes yet.');
  const settings = await core.getSettings();
  const out = await gen.callModel([
    { role: 'system', content: 'You pick background pictures for short vertical videos for Auntie Tobi (@auntietobi_uk), a UK guide for Nigerians living in the UK. Answer with JSON only.' },
    { role: 'user', content: `Here is what is said in each scene of the video, in order:\n${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}\n\nFor each scene, describe one photorealistic background picture (one sentence) that fits what's being said, set in the UK where it fits, showing Nigerian/Black British people where people appear. No text in the pictures. Vary the shots (close-ups, wide shots, places, hands, objects) so the video doesn't look repetitive.\nReturn ONLY JSON: {"wants":["picture for scene 1", …]}` },
  ], 1500, settings, { json: true, raw: true, timeoutMs: 26000 });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  let j; try { j = JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { throw new HttpError(502, 'ai_error', 'That came back garbled — please try again.'); }
  return { wants: (Array.isArray(j.wants) ? j.wants : []).slice(0, lines.length).map(x => str(x, 400)) };
}
// 🎧 the uploaded audio file itself, kept in pieces so a saved video reopens with its sound
async function audStart(b) {
  const parts = parseInt(b.parts, 10); if (!(parts > 0 && parts <= 40)) throw new HttpError(400, 'too_big', 'That audio file is too big to keep — please use one under 50 MB.');
  const id = 'a' + crypto.randomBytes(6).toString('hex');
  await setJson(`hq/vv/aud/${id}`, { parts, mime: /^audio\/[a-z0-9.+-]{2,30}$|^video\/[a-z0-9.+-]{2,30}$/i.test(String(b.mime || '')) ? b.mime : 'audio/mpeg', name: str(b.name, 120), at: core.nowIso() });
  return { id };
}
async function audPart(id, idx, b64) {
  if (!/^a[a-f0-9]{12}$/.test(String(id)) || !(idx >= 0 && idx < 40)) throw new HttpError(400, 'bad_part', 'Bad file part.');
  if (!/^[A-Za-z0-9+/=]+$/.test(String(b64 || '')) || b64.length > 2000000) throw new HttpError(400, 'bad_part', 'Bad file part.');
  await setJson(`hq/vv/aud/${id}/${idx}`, { b64 }); return { ok: true };
}
async function audGet(id, idx) { if (!/^a[a-f0-9]{12}$/.test(String(id)) || !/^\d{1,2}$/.test(String(idx))) return null; return getJson(`hq/vv/aud/${id}/${idx}`).catch(() => null); }
async function audInfo(id) { if (!/^a[a-f0-9]{12}$/.test(String(id))) return null; return getJson(`hq/vv/aud/${id}`).catch(() => null); }

// 💾 saved voiceover videos
const LIST = 'hq/vv/saved', PREFS = 'hq/vv/prefs';
function clean(v) {
  v = v && typeof v === 'object' ? v : {};
  const scenes = (Array.isArray(v.scenes) ? v.scenes : []).slice(0, 40).map(s => {
    s = s && typeof s === 'object' ? s : {};
    const o = { t: str(s.t, 300), gap: num(s.gap, 0, 3, 0.35), media: ['photo', 'video', 'color'].includes(s.media) ? s.media : 'photo', color: hex(s.color, '#0F1E36'), want: str(s.want, 400), title: str(s.title, 120) };
    const t = s.ts && typeof s.ts === 'object' ? s.ts : {};
    o.ts = { size: num(t.size, 50, 170, 92), y: num(t.y, 0.06, 0.9, 0.18), x: num(t.x, 0.15, 0.85, 0.5), look: ['outline', 'whitebox', 'blackbox', 'yellow', 'green'].includes(t.look) ? t.look : 'outline', font: ['heavy', 'serif', 'script', 'sans'].includes(t.font) ? t.font : 'heavy', anim: ['pop', 'fade', 'slide', 'none'].includes(t.anim) ? t.anim : 'pop', caps: t.caps !== false };
    if (/^i[a-z0-9]{6,30}$/.test(String(s.img || ''))) o.img = s.img;
    if (/^https:\/\/[a-z0-9.-]*fal\.media\//i.test(String(s.clip || ''))) o.clip = str(s.clip, 500);
    if (Number.isFinite(Number(s.a0))) { o.a0 = num(s.a0, 0, 3600, 0); o.a1 = num(s.a1, 0, 3600, o.a0 + 1); o.words = (Array.isArray(s.words) ? s.words : []).slice(0, 300).map(w => Array.isArray(w) ? [str(w[0], 60), num(w[1], 0, 3600, 0), num(w[2], 0, 3600, 0)] : null).filter(Boolean); }   // 🎧 own-audio timing
    const chars = (Array.isArray(s.chars) ? s.chars : []).filter(x => /^c[a-f0-9]{12}$/.test(String(x))).slice(0, 3); if (chars.length) o.chars = chars;   // 👥 who's in it
    return o;
  });
  const c = v.cap && typeof v.cap === 'object' ? v.cap : {};
  return {
    name: str(v.name, 80), topic: str(v.topic, 1500), voice: okVoice(v.voice) ? v.voice : '', model: v.model === 'natural' ? 'natural' : 'flash', speed: num(v.speed, 0.8, 1.2, 1),
    scenes, cap: { on: c.on !== false, style: ['yellow', 'white', 'box', 'green'].includes(c.style) ? c.style : 'yellow', y: num(c.y, 0.15, 0.9, 0.72), size: num(c.size, 50, 110, 76) },
    music: ['upbeat', 'calm', 'suspense', 'own', 'none'].includes(v.music) ? v.music : 'calm', musicVol: num(v.musicVol, 0, 100, 20), voiceVol: num(v.voiceVol, 0, 100, 100),
    audio: v.audio && /^a[a-f0-9]{12}$/.test(String(v.audio.id || '')) ? { id: v.audio.id, name: str(v.audio.name, 120), dur: num(v.audio.dur, 0, 3600, 0), trimS: num(v.audio.trimS, 0, 3600, 0), trimE: num(v.audio.trimE, 0, 3600, 0), vol: num(v.audio.vol, 0, 150, 100), parts: num(v.audio.parts, 1, 40, 1) } : null,
    vt: (t => (t && typeof t === 'object' ? { on: !!t.on, t: str(t.t, 160), size: num(t.size, 50, 170, 92), y: num(t.y, 0.06, 0.94, 0.12), x: num(t.x, 0.15, 0.85, 0.5), look: ['outline', 'whitebox', 'blackbox', 'yellow', 'green'].includes(t.look) ? t.look : 'outline', font: ['heavy', 'serif', 'script', 'sans'].includes(t.font) ? t.font : 'heavy', anim: ['pop', 'fade', 'slide', 'none'].includes(t.anim) ? t.anim : 'pop', caps: t.caps !== false, from: Math.round(num(t.from, 1, 40, 1)), to: Math.round(num(t.to, 0, 40, 0)), mode: t.mode === 'both' ? 'both' : 'replace' } : null))(v.vt),
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

module.exports = { align, stt, wants, audStart, audPart, audGet, audInfo, script, speak, save, list, load, remove, prefs, setVoice, wordsFrom };
