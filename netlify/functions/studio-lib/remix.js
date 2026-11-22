'use strict';
/*
 * 🎞️ Video Remix (HQ) — show HQ a short video whose style you like (a screen recording is fine). The browser takes
 * snapshots; GPT-6 Luna reads them into a "template": the scenes, timings, every piece of on-screen text (font kind,
 * size, colour, outline, position, how it animates) and what is behind each scene. It then writes Auntie Tobi's own
 * version for the topic you give. HQ draws and encodes the video itself in the browser (crisp text, no spelling mistakes).
 * Backgrounds: your own photos/videos, a picture made with HQ's image model, an AI clip (Video Ad Studio), or a colour.
 *
 *   hq/remix/saved       { items: [{ id, name, at, by, n, kind }] }      list of saved remixes
 *   hq/remix/p/<id>      { id, name, at, by, tpl }                        one saved remix (template + picture ids)
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, getJson, setJson, cas } = core;
const gen = require('./generate');

const FONTS = ['heavy', 'condensed', 'serif', 'script', 'elegant', 'hand', 'rounded', 'marker', 'sans'];
const ANIMS = ['none', 'fade', 'pop', 'slideup', 'word', 'type', 'zoom', 'drop'];
const MEDIA = ['photo', 'video', 'color'];
const TRANS = ['cut', 'fade', 'flash'];
const MUSIC = ['upbeat', 'calm', 'suspense', 'none'];
const hex = (v, d) => { let t = String(v || '').trim(); if (/^#[0-9a-f]{3}$/i.test(t)) t = '#' + t.slice(1).split('').map(c => c + c).join(''); return /^#[0-9a-f]{6}$/i.test(t) ? t.toUpperCase() : d; };
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
const one = (v, list, d) => (list.includes(v) ? v : d);
const str = (v, n) => String(v == null ? '' : v).replace(/\r/g, '').slice(0, n);

function cleanLayer(l) {
  l = l && typeof l === 'object' ? l : {};
  return {
    t: str(l.t, 300), orig: str(l.orig, 300), f: one(l.f, FONTS, 'heavy'), s: Math.round(num(l.s, 18, 260, 80)),
    c: hex(l.c, '#FFFFFF'), o: l.o ? hex(l.o, '') : '', sh: !!l.sh, ghost: !!l.ghost,
    x: num(l.x, 0.02, 0.98, 0.5), y: num(l.y, 0.03, 0.97, 0.5), w: num(l.w, 0.3, 0.96, 0.86), al: l.al === 'left' ? 'left' : 'center',
    a: one(l.a, ANIMS, 'fade'), at: num(l.at, 0, 30, 0), up: !!l.up,
  };
}
function cleanScene(s) {
  s = s && typeof s === 'object' ? s : {};
  const out = {
    d: num(s.d, 0.4, 20, 2.5), media: one(s.media, MEDIA, 'photo'), color: hex(s.color, '#E8E2D6'), want: str(s.want, 400),
    layers: (Array.isArray(s.layers) ? s.layers : []).slice(0, 12).map(cleanLayer).filter(l => l.t || l.orig),
  };
  if (/^i[a-z0-9]{6,30}$/.test(String(s.img || ''))) out.img = s.img;   // a saved picture
  if (/^https:\/\/[a-z0-9.-]*fal\.media\//i.test(String(s.clip || ''))) out.clip = str(s.clip, 500);   // an AI clip
  const chars = (Array.isArray(s.chars) ? s.chars : []).filter(x => /^c[a-f0-9]{12}$/.test(String(x))).slice(0, 3); if (chars.length) out.chars = chars;   // 👥 who's in it
  return out;
}
function cleanTpl(t) {
  t = t && typeof t === 'object' ? t : {};
  const b = t.base && typeof t.base === 'object' ? t.base : {};
  const scenes = (Array.isArray(t.scenes) ? t.scenes : []).slice(0, 30).map(cleanScene);
  return {
    name: str(t.name, 60) || 'My remix', kind: str(t.kind, 30), notes: str(t.notes, 400), topic: str(t.topic, 1500),
    base: { dim: num(b.dim, 0, 0.7, 0.18), kb: b.kb !== false, tr: one(b.tr, TRANS, 'cut'), music: one(b.music, MUSIC, 'upbeat') },
    scenes, caption: str(t.caption, 2200),
  };
}

const GUIDE = `You are looking at snapshots of a short vertical social media video (often a screen recording). Work out exactly how it is built so it can be recreated with different content.
IGNORE the app's own interface: usernames at the top, timers, progress bars, like/comment/share buttons, captions under the video, phone status bars.
Describe every SCENE (a scene changes when the background or the main text changes). For each scene give its length in seconds (they must add up to the video length), what kind of background it has, and EVERY piece of on-screen text.
For each piece of text: the exact words ("orig"), the font kind, the size in pixels on a 1080-pixel-wide frame, the colour, an outline colour if the letters have an outline (else ""), whether it has a drop shadow, its centre position (x and y from 0 to 1 of the frame), maximum width (0 to 1), alignment, whether it is in CAPITALS, how it appears (animation) and when it appears (seconds after the scene starts).
Font kinds: heavy (very bold sans-serif), condensed (tall narrow bold), serif (classic/elegant serif), script (bold brush handwriting), elegant (thin flowing calligraphy), hand (hand-drawn heavy capitals), rounded (rounded bold sans), marker (felt-tip), sans (plain sans-serif).
Animations: none, fade, pop (bounces in), slideup, word (words appear one by one), type (letters appear one by one), zoom (shrinks into place), drop (falls in).
If unrevealed words are shown faintly before they appear, set "ghost": true on that text.
Background kinds: photo (a still picture), video (moving footage), color (plain colour; give it).
Also: how scenes change (cut, fade or flash), how dark the background is dimmed behind the text (0 to 0.7), whether still pictures slowly zoom ("kb"), and the music mood (upbeat, calm, suspense, none).`;

function parseJson(text, msg) {
  try { return JSON.parse(String(text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { throw new HttpError(502, 'ai_error', msg); }
}
const WHO = 'You write for Auntie Tobi (@auntietobi_uk), a warm, trusted UK guide for Nigerians living in the UK (never say "Africans"). British English, short punchy lines. Never invent facts, prices, opening hours, addresses, dates or links: if you don\'t know them, write a clear placeholder in square brackets, e.g. [address] or [£ price], so the team fills them in.';
const SHAPE = `Return ONLY JSON: {"name":"short style name","kind":"words|list|countdown|showcase|other","notes":"one sentence describing the style","base":{"dim":0.2,"kb":true,"tr":"cut","music":"upbeat"},"scenes":[{"d":2.5,"media":"photo|video|color","color":"#hex","want":"what the background should show for OUR version","layers":[{"orig":"their exact text","t":"our text","f":"heavy","s":120,"c":"#FFFFFF","o":"","sh":true,"x":0.5,"y":0.3,"w":0.86,"al":"center","up":true,"a":"pop","at":0,"ghost":false}]}],"caption":"Instagram caption for our version, 40-100 words, ending with 5-8 hashtags"}`;

async function analyse(b) {
  const frames = (Array.isArray(b.frames) ? b.frames : []).filter(u => /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(String(u || '')) && u.length < 400000).slice(0, 18);
  const times = (Array.isArray(b.times) ? b.times : []).map(Number);
  if (frames.length < 2) throw new HttpError(400, 'no_frames', 'The video didn’t give any pictures — try another file.');
  const dur = num(b.dur, 1, 120, 15), topic = str(b.topic, 1500).trim();
  const settings = await core.getSettings();
  const content = [{ type: 'text', text: `${GUIDE}\n\nThe video is ${dur.toFixed(1)} seconds long. Snapshot times (seconds): ${frames.map((_, i) => (times[i] || 0).toFixed(1)).join(', ')}.\n\n` +
    (topic ? `OUR VERSION: keep the same structure, rhythm, fonts, colours, positions and animations, but write the text ("t") for this topic instead:\n${topic}\nYou may change the number of list items/scenes if the topic needs it (keep the same pattern). For each scene, "want" describes the background picture or footage our version needs (no text in it).` : 'For now set "t" to the same words as "orig", and "want" to a short description of the background.') +
    `\n\n${SHAPE}` }].concat(frames.map(u => ({ type: 'image_url', image_url: { url: u } })));
  const out = await gen.callModel([{ role: 'system', content: 'You are a senior short-form video editor and motion designer. ' + WHO + ' Answer with JSON only.' }, { role: 'user', content }], 4000, settings, { json: true, raw: true, timeoutMs: 26000 });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  const tpl = cleanTpl(Object.assign(parseJson(out.text, 'Couldn’t read the video’s style — please try again.'), { topic }));
  if (!tpl.scenes.length) throw new HttpError(502, 'ai_error', 'Couldn’t find the scenes in that video — try a clearer recording.');
  return { tpl };
}

// ✍️ the same template, new words for a new topic
async function write(b) {
  const tpl = cleanTpl(b.tpl), topic = str(b.topic, 1500).trim();
  if (topic.length < 4) throw new HttpError(400, 'too_short', 'Tell Auntie Tobi what this video is about.');
  const slim = { kind: tpl.kind, notes: tpl.notes, scenes: tpl.scenes.map(s => ({ d: s.d, media: s.media, layers: s.layers.map(l => ({ role_example: l.orig || l.t, f: l.f, s: l.s, y: l.y })) })) };
  const settings = await core.getSettings();
  const out = await gen.callModel([
    { role: 'system', content: 'You write on-screen text for short vertical videos. ' + WHO + ' Answer with JSON only.' },
    { role: 'user', content: `Here is a video template (scenes and the text pieces in each, with an example of what each piece said):\n${JSON.stringify(slim)}\n\nWrite our version about:\n${topic}\n\nKeep the same pattern: the same kinds of text pieces in the same order and of similar length (a big number stays a number, a short label stays short, an info line with an emoji keeps its emoji). You may repeat or remove middle scenes so the number of list items fits the topic (keep the first and last scenes).\nReturn ONLY JSON: {"scenes":[{"from":index of the template scene this copies,"want":"background our version needs (no text in it)","texts":["text for each piece, in order"]}],"caption":"Instagram caption, 40-100 words, ending with 5-8 hashtags"}` },
  ], 3000, settings, { json: true, raw: true, timeoutMs: 26000 });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  const j = parseJson(out.text, 'The words came back garbled — please try again.');
  const scenes = (Array.isArray(j.scenes) ? j.scenes : []).slice(0, 30).map(x => {
    const src = tpl.scenes[Math.max(0, Math.min(tpl.scenes.length - 1, parseInt(x.from, 10) || 0))];
    const s = JSON.parse(JSON.stringify(src)); delete s.img; delete s.clip;
    const tx = Array.isArray(x.texts) ? x.texts : [];
    s.layers.forEach((l, i) => { if (tx[i] != null) l.t = str(tx[i], 300); });
    s.want = str(x.want, 400) || s.want;
    return cleanScene(s);
  }).filter(s => s.layers.length || s.media !== 'color');
  if (!scenes.length) throw new HttpError(502, 'ai_error', 'Couldn’t write it just now — please try again.');
  return { scenes, caption: str(j.caption, 2200) };
}

// 🖼️ one background picture for a scene (HQ's chosen image model), saved in HQ
async function picture(b) {
  const want = str(b.want, 500).trim(); if (want.length < 3) throw new HttpError(400, 'too_short', 'Describe the picture first.');
  const prompt = `A beautiful, photorealistic vertical (9:16) photo for a social media video: ${want}. Natural light, rich colours, real-looking people and places, shot on a modern phone or camera. Leave calm space in the middle and top for text. ABSOLUTELY NO text, letters, signs with writing, logos or watermarks.`;
  // 👥 picked characters: their reference photos go with the prompt so they look the same in every scene
  const ch = await require('./characters').refs(b.chars);
  if (ch.refs.length) {
    const legend = 'Reference photos, in order:\n' + ch.labels.map((l, i) => `${i + 1}. ${l}`).join('\n');
    const url = await require('./eventmedia').generateImage(`${legend}\n\nShow ${ch.names.join(' and ')} in this scene. Keep every person EXACTLY as in their reference photo — same face, skin tone, hair, build, age and outfit (unless the scene says otherwise). Only the setting, pose and camera angle change.\n\n${prompt}`, '9:16', ch.refs);
    return { img: await require('./hq').saveImage(url) };
  }
  const url = await require('./eventmedia').generateImage(prompt, '9:16');
  return { img: await require('./hq').saveImage(url) };
}

// 💾 saved remixes (shared by the HQ team)
const LIST = 'hq/remix/saved';
async function save(b, email) {
  const tpl = cleanTpl(b.tpl); if (!tpl.scenes.length) throw new HttpError(400, 'invalid', 'Add at least one scene.');
  const id = /^r[a-z0-9]{6,20}$/.test(String(b.id || '')) ? b.id : 'r' + crypto.randomBytes(6).toString('hex');
  const name = str(b.name, 80).trim() || tpl.name, at = core.nowIso();
  await setJson(`hq/remix/p/${id}`, { id, name, at, by: email || '', tpl });
  await cas(LIST, cur => { const l = ((cur && cur.items) || []).filter(x => x.id !== id); l.unshift({ id, name, at, by: email || '', n: tpl.scenes.length, kind: tpl.kind }); return { items: l.slice(0, 200) }; });
  return { id, name, at };
}
async function list() { const l = await getJson(LIST).catch(() => null); return (l && l.items) || []; }
async function load(id) {
  if (!/^r[a-z0-9]{6,20}$/.test(String(id || ''))) throw new HttpError(400, 'invalid', 'Which remix?');
  const r = await getJson(`hq/remix/p/${id}`); if (!r) throw new HttpError(404, 'not_found', 'That remix has gone.'); return r;
}
async function remove(id) {
  if (!/^r[a-z0-9]{6,20}$/.test(String(id || ''))) throw new HttpError(400, 'invalid', 'Which remix?');
  await core.del(`hq/remix/p/${id}`).catch(() => {});
  await cas(LIST, cur => ({ items: ((cur && cur.items) || []).filter(x => x.id !== id) }));
  return { ok: true };
}

module.exports = { analyse, write, picture, save, list, load, remove, cleanTpl };
