'use strict';
/*
 * 🎬 Quiz videos (HQ) — the server side.
 *  • Voice: ElevenLabs, straight from Auntie Tobi's own subscription (ELEVENLABS_API_KEY in Netlify — never sent to the browser).
 *    Every line is saved (hq/qv/tts/<hash>), so a question that comes up again costs no credits.
 *  • Backgrounds: one picture per question, made with HQ's chosen image model (🎨 Image model — GPT Image 2.6 Sunburst)
 *    and saved per question (hq/qv/bg/<bank>-<id>), so the next video reuses it for free.
 *  The questions themselves come from the checked banks (/lifeuk-q.json, /drive-q.json) — the video is put together in the browser.
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, getJson, setJson } = core;

const API = 'https://api.elevenlabs.io/v1';
const MODELS = { flash: 'eleven_flash_v2_5', natural: 'eleven_multilingual_v2' };
const key = () => process.env.ELEVENLABS_API_KEY || process.env.STUDIO_ELEVENLABS_API_KEY || '';

async function el(path, opts = {}) {
  const k = key(); if (!k) throw new HttpError(400, 'no_voice_key', 'The AI voice isn’t set up yet — add your ElevenLabs key in Netlify (see ⚙️ in Quiz videos).');
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), opts.timeout || 20000);
  try {
    return await fetch(API + path, { method: opts.method || 'GET', signal: ctrl.signal, headers: Object.assign({ 'xi-api-key': k }, opts.body ? { 'Content-Type': 'application/json' } : {}, opts.accept ? { Accept: opts.accept } : {}), body: opts.body ? JSON.stringify(opts.body) : undefined });
  } catch (e) { throw new HttpError(504, 'voice_timeout', 'ElevenLabs took too long — please try again.'); }
  finally { clearTimeout(t); }
}

// How many voice credits are left this month, and the voices to choose from (British / Nigerian / African accents first)
async function status() {
  if (!key()) return { ready: false };
  const [sr, vr] = await Promise.all([el('/user/subscription').catch(() => null), el('/voices').catch(() => null)]);
  const sub = sr && sr.ok ? await sr.json().catch(() => null) : null;
  const vj = vr && vr.ok ? await vr.json().catch(() => null) : null;
  if (!sub && !vj) return { ready: false, error: 'Couldn’t reach ElevenLabs — check the key in Netlify.' };
  const rank = v => { const a = String((v.labels && v.labels.accent) || '').toLowerCase(); return /nigeria/.test(a) ? 0 : /african/.test(a) ? 1 : /british|english/.test(a) ? 2 : 3; };
  const voices = ((vj && vj.voices) || []).map(v => ({ id: v.voice_id, name: v.name, accent: (v.labels && v.labels.accent) || '', gender: (v.labels && v.labels.gender) || '', about: (v.labels && (v.labels.description || v.labels.descriptive || v.labels.use_case)) || '', preview: v.preview_url || '' }))
    .filter(v => /^[A-Za-z0-9]{10,40}$/.test(v.id)).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)).slice(0, 40);
  return {
    ready: true, voices,
    credits: sub ? { used: sub.character_count || 0, limit: sub.character_limit || 0, left: Math.max(0, (sub.character_limit || 0) - (sub.character_count || 0)), resetAt: sub.next_character_count_reset_unix ? new Date(sub.next_character_count_reset_unix * 1000).toISOString().slice(0, 10) : '', plan: sub.tier || '' } : null,
  };
}

// One spoken line → MP3 (as a data URL). Saved, so the same line never uses credits twice.
async function speak(raw) {
  const text = String(raw.text || '').replace(/\s+/g, ' ').trim().slice(0, 600);
  if (!text) throw new HttpError(400, 'empty', 'Nothing to say.');
  const voice = String(raw.voice || ''); if (!/^[A-Za-z0-9]{10,40}$/.test(voice)) throw new HttpError(400, 'invalid', 'Choose a voice first.');
  const model = MODELS[raw.model] || MODELS.flash;
  const h = crypto.createHash('sha1').update([voice, model, text].join('|')).digest('hex').slice(0, 32);
  const hit = await getJson(`hq/qv/tts/${h}`).catch(() => null);
  if (hit && hit.dataUrl) return { dataUrl: hit.dataUrl, cached: true };
  const r = await el(`/text-to-speech/${voice}?output_format=mp3_44100_128`, { method: 'POST', accept: 'audio/mpeg', timeout: 25000, body: { text, model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2 } } });
  if (!r.ok) {
    const j = await r.json().catch(() => null), why = JSON.stringify((j && j.detail) || j || {}).slice(0, 300);
    console.error('[quizvideo] tts', r.status, why);
    if (r.status === 401 && /quota|credit|limit/i.test(why)) throw new HttpError(402, 'no_credits', 'Your ElevenLabs credits have run out for this month — the video will be made without the voice.');
    if (r.status === 401 || r.status === 403) throw new HttpError(400, 'voice_key', /permission/i.test(why) ? 'Your ElevenLabs key isn’t allowed to do this yet — in ElevenLabs open your API key settings and turn on “Text to Speech”, then try again.' : 'ElevenLabs didn’t accept the key — check it in Netlify.');
    if (/quota|credit/i.test(why)) throw new HttpError(402, 'no_credits', 'Your ElevenLabs credits have run out for this month — the video will be made without the voice.');
    throw new HttpError(502, 'voice_error', 'The voice didn’t come back — please try again.');
  }
  const buf = Buffer.from(await r.arrayBuffer());
  if (!buf.length || buf.length > 1600000) throw new HttpError(502, 'voice_error', 'The voice didn’t come back — please try again.');
  const dataUrl = 'data:audio/mpeg;base64,' + buf.toString('base64');
  await setJson(`hq/qv/tts/${h}`, { dataUrl, at: core.nowIso(), chars: text.length }).catch(() => {});
  return { dataUrl, cached: false };
}

// One background picture for a question — saved per question so it's only ever made once (unless you ask for a new one)
const BANKS = { lifeuk: 'Life in the UK Test', drive: 'UK Driving Theory Test' };
async function background(raw) {
  const bank = BANKS[raw.bank] ? raw.bank : 'lifeuk', qid = parseInt(raw.qid, 10);
  if (!(qid > 0 && qid < 5000)) throw new HttpError(400, 'invalid', 'Which question?');
  const slot = `hq/qv/bg/${bank}-${qid}`;
  if (!raw.fresh) { const hit = await getJson(slot).catch(() => null); if (hit && hit.img) return { img: hit.img, cached: true }; }
  const prompt = bgPrompt(bank, raw.q, raw.a, raw.hint);
  const url = await require('./eventmedia').generateImage(prompt, '9:16');
  const img = await require('./hq').saveImage(url);
  await setJson(slot, { img, at: core.nowIso() });
  return { img, cached: false };
}
// 📋 the exact words sent to the image AI — also shown in HQ so pictures can be made outside HQ for free
function bgPrompt(bank, q0, a0, h0) {
  bank = BANKS[bank] ? bank : 'lifeuk';
  const q = String(q0 || '').slice(0, 300), a = String(a0 || '').slice(0, 120), hint = String(h0 || '').slice(0, 300);
  return [
    'A beautiful, photorealistic vertical (9:16) background photo for a social media quiz video about the ' + BANKS[bank] + '.',
    'The scene should clearly suggest the topic of this question, without giving away the answer in words: "' + q + '"' + (a ? ' (the topic is: ' + a + ')' : '') + '.',
    hint ? 'Scene idea: ' + hint + '.' : '',
    'Set in the UK where it fits. Cinematic, warm, rich colours, soft depth of field, slightly moody sky. The top quarter and the middle should be calm and uncluttered so white text can sit on top.',
    'ABSOLUTELY NO text, letters, numbers, signs with writing, logos, watermarks or captions anywhere in the image. No close-up faces.',
  ].filter(Boolean).join(' ');
}
function bgPrompts(raw) { return { prompts: (Array.isArray(raw.qs) ? raw.qs : []).slice(0, 40).map(x => bgPrompt(raw.bank, x && x.q, x && x.a)) }; }
async function setBackground(raw) {
  const bank = BANKS[raw.bank] ? raw.bank : 'lifeuk', qid = parseInt(raw.qid, 10);
  if (!(qid > 0 && qid < 5000)) throw new HttpError(400, 'invalid', 'Which question?');
  const img = await require('./hq').saveImage(String(raw.dataUrl || ''));
  await setJson(`hq/qv/bg/${bank}-${qid}`, { img, at: core.nowIso(), own: true });
  return { img };
}
async function savedBackgrounds(bank, ids) {
  bank = BANKS[bank] ? bank : 'lifeuk';
  const out = {};
  await Promise.all((Array.isArray(ids) ? ids : []).slice(0, 20).map(async id => { const n = parseInt(id, 10); if (n > 0) { const h = await getJson(`hq/qv/bg/${bank}-${n}`).catch(() => null); if (h && h.img) out[n] = h.img; } }));
  return out;
}


// 💾 Saved quizzes — the whole set-up (questions, words, voice, pictures) so you can come back to it and remake the video.
// The MP4 itself isn't stored (too big); remaking is quick and free because the voice lines and pictures are already saved.
const LIST = 'hq/qv/saved-list';
function cleanSave(d) {
  d = d && typeof d === 'object' ? d : {};
  const str = (v, n) => String(v == null ? '' : v).slice(0, n);
  const qs = (Array.isArray(d.qs) ? d.qs : []).slice(0, 15).map(q => ({ id: parseInt(q.id, 10) || 0, q: str(q.q, 300), opts: (Array.isArray(q.opts) ? q.opts : []).slice(0, 4).map(o => str(o, 120)), ans: Math.max(0, Math.min(3, parseInt(q.ans, 10) || 0)), hl: str(q.hl, 40), e: str(q.e, 400) })).filter(q => q.id && q.opts.length === 4);
  const bgs = {}; Object.keys(d.bgs || {}).slice(0, 40).forEach(k => { const v = String(d.bgs[k]); if (/^i[a-z0-9]{6,30}$/.test(v)) bgs[parseInt(k, 10)] = v; });
  return { bank: BANKS[d.bank] ? d.bank : 'lifeuk', n: qs.length, grp: parseInt(d.grp, 10) || 0, qs, bgs,
    voiceOn: !!d.voiceOn, voice: /^[A-Za-z0-9]{10,40}$/.test(d.voice || '') ? d.voice : '', model: d.model === 'natural' ? 'natural' : 'flash', readOpts: d.readOpts !== false,
    h1: str(d.h1, 120), h2: str(d.h2, 120), cTitle: str(d.cTitle, 80), cSub: str(d.cSub, 100), cBg: parseInt(d.cBg, 10) || 0, outro: str(d.outro, 200), appOn: !!d.appOn, appT: str(d.appT, 120), sayApp: !!d.sayApp, igOn: !!d.igOn, ig: str(d.ig, 40),
    music: ['upbeat', 'calm', 'suspense', 'own', 'none'].includes(d.music) ? d.music : 'upbeat', musicVol: Math.max(0, Math.min(100, parseInt(d.musicVol, 10) || 0)), voiceVol: Math.max(0, Math.min(100, d.voiceVol == null ? 100 : parseInt(d.voiceVol, 10) || 0)), duck: d.duck !== false };
}
async function save(raw, email) {
  const data = cleanSave(raw.data); if (!data.qs.length) throw new HttpError(400, 'invalid', 'Add some questions first.');
  const id = /^q[a-z0-9]{6,20}$/.test(String(raw.id || '')) ? raw.id : 'q' + crypto.randomBytes(6).toString('hex');
  const name = String(raw.name || '').replace(/\s+/g, ' ').trim().slice(0, 80) || (data.h1 || 'Quiz video');
  const at = core.nowIso();
  await setJson(`hq/qv/saved/${id}`, { id, name, at, by: email || '', data });
  await core.cas(LIST, cur => { const l = ((cur && cur.items) || []).filter(x => x.id !== id); l.unshift({ id, name, at, bank: data.bank, n: data.qs.length, by: email || '' }); return { items: l.slice(0, 200) }; });
  return { id, name, at };
}
async function list() { const l = await getJson(LIST).catch(() => null); return (l && l.items) || []; }
async function load(id) {
  if (!/^q[a-z0-9]{6,20}$/.test(String(id || ''))) throw new HttpError(400, 'invalid', 'Which quiz?');
  const s = await getJson(`hq/qv/saved/${id}`); if (!s) throw new HttpError(404, 'not_found', 'That saved quiz has gone.'); return s;
}
async function remove(id) {
  if (!/^q[a-z0-9]{6,20}$/.test(String(id || ''))) throw new HttpError(400, 'invalid', 'Which quiz?');
  await require('./quizapp').unpublish(id).catch(() => {});   // a deleted quiz leaves the app too
  await core.del(`hq/qv/saved/${id}`).catch(() => {});
  await core.cas(LIST, cur => ({ items: ((cur && cur.items) || []).filter(x => x.id !== id) }));
  return { ok: true };
}

module.exports = { bgPrompts, bgPrompt, key, el, MODELS, status, speak, background, setBackground, savedBackgrounds, save, list, load, remove };
