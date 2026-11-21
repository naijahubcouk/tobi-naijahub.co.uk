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
    if (r.status === 401) throw new HttpError(401, 'voice_key', 'ElevenLabs didn’t accept the key — check it in Netlify.');
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
  const q = String(raw.q || '').slice(0, 300), a = String(raw.a || '').slice(0, 120), hint = String(raw.hint || '').slice(0, 300);
  const prompt = [
    'A beautiful, photorealistic vertical (9:16) background photo for a social media quiz video about the ' + BANKS[bank] + '.',
    'The scene should clearly suggest the topic of this question, without giving away the answer in words: "' + q + '"' + (a ? ' (the topic is: ' + a + ')' : '') + '.',
    hint ? 'Scene idea: ' + hint + '.' : '',
    'Set in the UK where it fits. Cinematic, warm, rich colours, soft depth of field, slightly moody sky. The top quarter and the middle should be calm and uncluttered so white text can sit on top.',
    'ABSOLUTELY NO text, letters, numbers, signs with writing, logos, watermarks or captions anywhere in the image. No close-up faces.',
  ].filter(Boolean).join(' ');
  const url = await require('./eventmedia').generateImage(prompt, '9:16');
  const img = await require('./hq').saveImage(url);
  await setJson(slot, { img, at: core.nowIso() });
  return { img, cached: false };
}
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

module.exports = { status, speak, background, setBackground, savedBackgrounds };
