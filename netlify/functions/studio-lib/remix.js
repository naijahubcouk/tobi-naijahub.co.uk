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
 *   hq/remix/job/<id>, hq/remix/packs, hq/remix/pk/<id>                   ⏳ background reading jobs and 🎬 Recreate Packs (see below)
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

async function analyse(b, long) {
  const frames = (Array.isArray(b.frames) ? b.frames : []).filter(u => /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(String(u || '')) && u.length < 400000).slice(0, 18);
  const times = (Array.isArray(b.times) ? b.times : []).map(Number);
  if (frames.length < 2) throw new HttpError(400, 'no_frames', 'The video didn’t give any pictures — try another file.');
  const dur = num(b.dur, 1, 120, 15), topic = str(b.topic, 1500).trim();
  const settings = await core.getSettings();
  const content = [{ type: 'text', text: `${GUIDE}\n\nThe video is ${dur.toFixed(1)} seconds long. Snapshot times (seconds): ${frames.map((_, i) => (times[i] || 0).toFixed(1)).join(', ')}.\n\n` +
    (topic ? `OUR VERSION: keep the same structure, rhythm, fonts, colours, positions and animations, but write the text ("t") for this topic instead:\n${topic}\nYou may change the number of list items/scenes if the topic needs it (keep the same pattern). For each scene, "want" describes the background picture or footage our version needs (no text in it).` : 'For now set "t" to the same words as "orig", and "want" to a short description of the background.') +
    `\n\n${SHAPE}` }].concat(frames.map(u => ({ type: 'image_url', image_url: { url: u } })));
  const out = await gen.callModel([{ role: 'system', content: 'You are a senior short-form video editor and motion designer. ' + WHO + ' Answer with JSON only.' }, { role: 'user', content }], 4000, settings, { json: true, raw: true, timeoutMs: long ? 600000 : 26000, detail: !!long });
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
  const ar = ['4:5', '1:1', '9:16'].includes(b.aspect) ? b.aspect : '9:16';
  const prompt = `A beautiful, photorealistic ${ar === '9:16' ? 'vertical (9:16)' : ar === '4:5' ? 'portrait (4:5)' : 'square'} photo for a social media ${ar === '9:16' ? 'video' : 'post'}: ${want}. Natural light, rich colours, real-looking people and places, shot on a modern phone or camera. Leave calm space in the middle and top for text. ABSOLUTELY NO text, letters, signs with writing, logos or watermarks.`;
  // 👥 picked characters: their reference photos go with the prompt so they look the same in every scene
  const ch = await require('./characters').refs(b.chars);
  if (ch.refs.length) {
    const legend = 'Reference photos, in order:\n' + ch.labels.map((l, i) => `${i + 1}. ${l}`).join('\n');
    const url = await require('./eventmedia').generateImage(`${legend}\n\nShow ${ch.names.join(' and ')} in this scene. Keep every person EXACTLY as in their reference photo — same face, skin tone, hair, build, age and outfit (unless the scene says otherwise). Only the setting, pose and camera angle change.\n\n${prompt}`, ar, ch.refs);
    return { img: await require('./hq').saveImage(url) };
  }
  const url = await require('./eventmedia').generateImage(prompt, ar);
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


// ───────────── ⏳ slow AI jobs (run in the background function remix-background, up to 15 minutes) ─────────────
//   hq/remix/job/<id>   { id, t, kind ('style'|'pack'), by, at, frames, times, cuts, dur, topic, status, result, error }
const JOBRE = /^j[a-f0-9]{12}$/;
const okFrames = (list, n) => (Array.isArray(list) ? list : []).filter(u => /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(String(u || '')) && u.length < 400000).slice(0, n);
async function jobStart(b, email) {
  const kind = b.kind === 'pack' ? 'pack' : 'style';
  const frames = okFrames(b.frames, kind === 'pack' ? 24 : 18);
  if (frames.length < 2) throw new HttpError(400, 'no_frames', 'The video didn’t give any pictures — try another file.');
  const id = 'j' + crypto.randomBytes(6).toString('hex'), t = crypto.randomBytes(16).toString('hex');
  await setJson(`hq/remix/job/${id}`, { id, t, kind, by: email || '', at: core.nowIso(), frames, times: (Array.isArray(b.times) ? b.times : []).slice(0, 24).map(Number),
    cuts: (Array.isArray(b.cuts) ? b.cuts : []).slice(0, 80).map(x => Math.round(Number(x) * 10) / 10).filter(Number.isFinite), dur: num(b.dur, 1, 125, 15), topic: str(b.topic, 1500).trim(),
    name: str(b.name, 80), status: 'waiting' });
  return { job: id, t };
}
async function jobRun(id, t) {
  if (!JOBRE.test(String(id || '')) || !/^[a-f0-9]{32}$/.test(String(t || ''))) return;
  const key = `hq/remix/job/${id}`, j = await getJson(key).catch(() => null);
  if (!j || j.t !== t || j.status !== 'waiting') return;
  j.status = 'working'; j.started = core.nowIso(); await setJson(key, j);
  try {
    if (j.kind === 'pack') { const pack = await makePack(j); const saved = await packSave({ pack, frames: j.frames, times: j.times, name: pack.title }, j.by); j.result = { id: saved.id }; }
    else j.result = await analyse({ frames: j.frames, times: j.times, dur: j.dur, topic: j.topic }, true);
    j.status = 'done';
  } catch (e) { j.status = 'error'; j.error = (e && e.message) || 'Something went wrong — please try again.'; }
  delete j.frames; j.ended = core.nowIso(); await setJson(key, j);
}
async function jobCheck(id) {
  if (!JOBRE.test(String(id || ''))) throw new HttpError(400, 'invalid', 'Which job?');
  const j = await getJson(`hq/remix/job/${id}`).catch(() => null); if (!j) throw new HttpError(404, 'not_found', 'That job has gone — please try again.');
  const age = (Date.now() - Date.parse(j.at)) / 1000;
  if (j.status === 'waiting' && age > 90) return { status: 'error', error: 'The reading job didn’t start — please try again.' };
  if (j.status === 'working' && age > 16 * 60) return { status: 'error', error: 'That took too long — please try again with a shorter video.' };
  return { status: j.status, result: j.result || null, error: j.error || '' };
}

// ───────────── 🎬 Recreate Pack: shot list + Seedance 2.5 prompts + how to make it ─────────────
//   hq/remix/packs     { items: [{ id, name, at, by, n, dur }] }
//   hq/remix/pk/<id>   { id, name, at, by, pack, frames }
const PLIST = 'hq/remix/packs';
const PACKGUIDE = `You are looking at snapshots of a short vertical social media video (often a screen recording — IGNORE the app's own buttons, usernames, progress bars, captions under the video and phone status bars).
Your job: write a "Recreate Pack" so our team can make a video in the SAME style with Seedance 2.5 (ByteDance's AI video model), then finish it in an editor.

What you know about Seedance 2.5:
- It makes up to about 30 seconds of 9:16 video with sound in ONE generation ("one take"), including several shots with cuts between them. Longer videos are made in parts and extended.
- You can upload references and tag them in the prompt: @Video 1, @Video 2… (up to 10 clips, 30 s in total), @Image 1… (up to 30 pictures), @Audio 1… State each reference's ROLE in plain words, e.g. "@Video 1 sets the camera movement, pacing and cuts. @Image 1 is the woman's face, hair and outfit. Do not copy the people from @Video 1."
- Best prompt order: subject + action → setting → visual style → camera → sound. Be concrete (lens feel, light, colours, textures). For several shots, write time-stamped beats with a clear end state, e.g. "[0-3s] … [3-6s] …", and say "cut to" between shots.
- Sound inside prompts: music in round brackets (upbeat Afrobeats, soft log drum), sound effects in angle brackets <sizzling pan>, spoken words in curly brackets {"Hello everyone!"}.
- Seedance often misspells on-screen words, so NEVER ask it for written text, captions, logos or signs: those are added afterwards in HQ or CapCut.

Rules:
- People in our version are Nigerian (e.g. "a Nigerian woman in her 30s in an Ankara wrap dress"), never "African". Do not describe or copy the real people, faces, brand names, logos, watermarks or exact words of the original creator — recreate the STYLE, structure, camera work and pacing, not their identity.
- If OUR TOPIC is given, every prompt, picture prompt and on-screen text is for our topic, keeping the original's structure and rhythm. If no topic is given, write prompts that make a close copy of the style with neutral, Nigerian-UK-flavoured content.
- Shot timings must follow the video (use the cut times given) and add up to its length.
- On-screen text: "text" is what the original shows (exact words, so we can see the pattern); "ourText" is our version (British English, short, punchy; [square brackets] for facts we must fill in — never invent prices, addresses, dates or opening hours).
- Write everything in plain, friendly English for a non-technical creator.`;
const PACKSHAPE = `Return ONLY JSON:
{"title":"short name for our version","summary":"2 sentences: what the original video is and why it works","format":"e.g. talking head + b-roll list video","look":{"style":"…","colour":"…","light":"…","camera":"lens / movement feel","pace":"…","edit":"cuts, transitions, text style"},
"shots":[{"from":0,"to":2.4,"snap":0,"framing":"close-up / medium / wide…","camera":"…","action":"what happens","text":"original on-screen text or ''","ourText":"our on-screen text or ''","textStyle":"font look, colour, position, how it appears","sound":"…","prompt":"a complete Seedance 2.5 prompt for THIS shot alone (no on-screen text)"}],
"withRef":{"uploads":[{"tag":"@Video 1","what":"the reference video (trim to ≤30 s)","role":"…"},{"tag":"@Image 1","what":"…","role":"…"}],"prompt":"one Seedance 2.5 prompt using the tags, time-stamped beats for the whole video (or part 1 if longer than 30 s)"},
"oneTake":"one Seedance 2.5 prompt with NO uploads that makes the whole video (or part 1) with time-stamped beats",
"parts":["only if the video is longer than 30 s: a follow-on prompt for each extra part, saying 'continue from the last frame'"],
"audio":{"music":"…","sfx":"…","voice":"voice-over or spoken lines for our version, or ''"},
"pictures":[{"for":"@Image 1 — main character (or a start frame)","prompt":"a detailed image prompt (photo-real, 9:16, no text)"}],
"steps":["numbered, practical steps from start to finished post: making the pictures, where to run Seedance 2.5 (Dreamina/CapCut, Jimeng, Higgsfield or fal), settings to choose (9:16, length, resolution), what to upload as each tag, how many takes to try, then editing: trimming, adding the on-screen text, music, captions, export"],
"edit":["how to add the on-screen text in HQ Video Remix or CapCut so it matches the original's text style and timing"],
"tips":["3-6 short tips to get closer to the original"],
"caption":"Instagram caption for our version with 3-6 hashtags"}`;
const arr = (v, n, m) => (Array.isArray(v) ? v : []).slice(0, n).map(x => str(x, m)).filter(Boolean);
function cleanPack(p, dur, nSnaps) {
  p = p && typeof p === 'object' ? p : {};
  const lk = p.look && typeof p.look === 'object' ? p.look : {}, wr = p.withRef && typeof p.withRef === 'object' ? p.withRef : {}, au = p.audio && typeof p.audio === 'object' ? p.audio : {};
  const shots = (Array.isArray(p.shots) ? p.shots : []).slice(0, 40).map(x => ({
    from: num(x && x.from, 0, 125, 0), to: num(x && x.to, 0, 125, 0), snap: Math.round(num(x && x.snap, 0, Math.max(0, nSnaps - 1), 0)),
    framing: str(x && x.framing, 120), camera: str(x && x.camera, 200), action: str(x && x.action, 500), text: str(x && x.text, 300), ourText: str(x && x.ourText, 300),
    textStyle: str(x && x.textStyle, 300), sound: str(x && x.sound, 300), prompt: str(x && x.prompt, 2000),
  })).filter(x => x.prompt || x.action);
  return {
    title: str(p.title, 80) || 'Recreate pack', summary: str(p.summary, 600), format: str(p.format, 160), dur: num(dur, 1, 125, 15),
    look: { style: str(lk.style, 300), colour: str(lk.colour, 300), light: str(lk.light, 300), camera: str(lk.camera, 300), pace: str(lk.pace, 300), edit: str(lk.edit, 400) },
    shots,
    withRef: { uploads: (Array.isArray(wr.uploads) ? wr.uploads : []).slice(0, 12).map(u => ({ tag: str(u && u.tag, 30), what: str(u && u.what, 300), role: str(u && u.role, 400) })).filter(u => u.tag), prompt: str(wr.prompt, 5000) },
    oneTake: str(p.oneTake, 5000), parts: arr(p.parts, 6, 4000),
    audio: { music: str(au.music, 400), sfx: str(au.sfx, 400), voice: str(au.voice, 2000) },
    pictures: (Array.isArray(p.pictures) ? p.pictures : []).slice(0, 10).map(x => ({ for: str(x && x.for, 160), prompt: str(x && x.prompt, 2000) })).filter(x => x.prompt),
    steps: arr(p.steps, 20, 600), edit: arr(p.edit, 10, 600), tips: arr(p.tips, 8, 400), caption: str(p.caption, 2200),
  };
}
async function makePack(j) {
  const settings = await core.getSettings();
  const content = [{ type: 'text', text: `${PACKGUIDE}\n\nThe video is ${j.dur.toFixed(1)} seconds long.\nSnapshots, in order (number: time in seconds): ${j.frames.map((_, i) => i + ': ' + (j.times[i] || 0).toFixed(1)).join(', ')}.\nScene changes were detected at: ${(j.cuts || []).join(', ') || 'none detected'} seconds.\nFor each shot, "snap" is the number of the snapshot that best shows it.\n\n` +
    (j.topic ? `OUR TOPIC:\n${j.topic}\n\n` : 'No topic given — recreate the style with neutral Nigerian-UK content.\n\n') + PACKSHAPE }]
    .concat(j.frames.map(u => ({ type: 'image_url', image_url: { url: u } })));
  const out = await gen.callModel([{ role: 'system', content: 'You are a senior short-form video director and an expert at prompting Seedance 2.5. ' + WHO + ' Answer with JSON only.' }, { role: 'user', content }], 9000, settings, { json: true, raw: true, timeoutMs: 600000, detail: true });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  const pack = cleanPack(parseJson(out.text, 'Couldn’t read that video — please try again.'), j.dur, j.frames.length);
  if (!pack.shots.length && !pack.oneTake) throw new HttpError(502, 'ai_error', 'Couldn’t find the shots in that video — try a clearer recording.');
  pack.topic = j.topic;
  return pack;
}
const PKRE = /^k[a-f0-9]{12}$/;
async function packSave(b, email) {
  const id = PKRE.test(String(b.id || '')) ? b.id : 'k' + crypto.randomBytes(6).toString('hex');
  const prev = b.id ? await getJson(`hq/remix/pk/${id}`).catch(() => null) : null;
  const pack = b.pack ? Object.assign(cleanPack(b.pack, b.pack.dur, 24), { topic: str(b.pack.topic, 1500) }) : prev && prev.pack;
  if (!pack) throw new HttpError(400, 'invalid', 'Nothing to save.');
  const frames = b.frames ? okFrames(b.frames, 24) : (prev && prev.frames) || [];
  const name = str(b.name, 80).trim() || (prev && prev.name) || pack.title, at = core.nowIso();
  const times = b.frames ? (Array.isArray(b.times) ? b.times : []).slice(0, 24).map(Number) : (prev && prev.times) || [];
  await setJson(`hq/remix/pk/${id}`, { id, name, at, by: email || (prev && prev.by) || '', pack, frames, times });
  await cas(PLIST, cur => { const l = ((cur && cur.items) || []).filter(x => x.id !== id); l.unshift({ id, name, at, by: email || '', n: pack.shots.length, dur: pack.dur }); return { items: l.slice(0, 200) }; });
  return { id, name, at };
}
async function packList() { const l = await getJson(PLIST).catch(() => null); return (l && l.items) || []; }
async function packLoad(id) {
  if (!PKRE.test(String(id || ''))) throw new HttpError(400, 'invalid', 'Which pack?');
  const r = await getJson(`hq/remix/pk/${id}`); if (!r) throw new HttpError(404, 'not_found', 'That pack has gone.'); return r;
}
async function packDel(id) {
  if (!PKRE.test(String(id || ''))) throw new HttpError(400, 'invalid', 'Which pack?');
  await core.del(`hq/remix/pk/${id}`).catch(() => {});
  await cas(PLIST, cur => ({ items: ((cur && cur.items) || []).filter(x => x.id !== id) }));
  return { ok: true };
}

module.exports = { analyse, write, picture, save, list, load, remove, cleanTpl, jobStart, jobRun, jobCheck, packSave, packList, packLoad, packDel, cleanPack };
