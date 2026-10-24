'use strict';
/*
 * Auntie Tobi HQ — 🎥 Video Ad Studio.
 * AI plans a whole video advert (strategy, script, storyboard, Dzine prompts, voiceover, music, editing
 * guide, caption) for a business or for Auntie Tobi itself. Nothing is published; the team makes the clips in Dzine.
 *
 *   hq/videoads   { items: { <id>: project } }
 *   project: { id, status, brief: {...}, plan: {...}, frames: { <sceneIndex>: imgId }, createdBy, createdAt, updatedAt }
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, cas, getJson, cleanText } = core;
const gen = require('./generate');

const KEY = 'hq/videoads';
const MAX = 300;
const STATUSES = ['idea', 'scripted', 'generating', 'editing', 'ready', 'posted'];
const LENGTHS = [15, 30, 60];
const PLATFORMS = { reels: 'Instagram Reels (9:16)', tiktok: 'TikTok (9:16)', stories: 'Instagram/WhatsApp Stories (9:16)', shorts: 'YouTube Shorts (9:16)', feed: 'Instagram/Facebook feed (4:5)' };
const TONES = ['warm', 'funny', 'premium', 'urgent', 'inspiring', 'friendly'];
const LANGS = { english: 'British English', pidgin: 'British English with a light touch of Nigerian Pidgin', yoruba: 'British English with a few Yoruba phrases', igbo: 'British English with a few Igbo phrases' };
const GOALS = ['bookings', 'orders', 'visits', 'follows', 'enquiries', 'downloads', 'awareness'];
const DZINE_VIDEO = ['Kling', 'Veo 3.1', 'Hailuo', 'Sora 2', 'Wan', 'Seedance'];
const multi = (s, n) => String(s == null ? '' : s).replace(/\r/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);
const str = (v, n) => multi(v, n || 400);
const arr = (v, n, len) => (Array.isArray(v) ? v : []).map(x => str(x, len || 200)).filter(Boolean).slice(0, n);

function cleanBrief(b) {
  b = b && typeof b === 'object' ? b : {};
  return {
    forWho: b.forWho === 'auntietobi' ? 'auntietobi' : 'business',
    bizSlug: /^[a-z0-9-]{2,120}$/.test(String(b.bizSlug || '')) ? b.bizSlug : '',
    business: cleanText(b.business, 100),
    about: str(b.about, 1500),
    offer: str(b.offer, 400),
    audience: str(b.audience, 300),
    location: cleanText(b.location, 100),
    contact: cleanText(b.contact, 120),
    link: cleanText(b.link, 300),
    goal: GOALS.includes(b.goal) ? b.goal : 'enquiries',
    length: LENGTHS.includes(Number(b.length)) ? Number(b.length) : 30,
    platform: PLATFORMS[b.platform] ? b.platform : 'reels',
    tone: TONES.includes(b.tone) ? b.tone : 'warm',
    lang: LANGS[b.lang] ? b.lang : 'english',
    notes: str(b.notes, 2000),
  };
}
function cleanScene(s, i) {
  s = s && typeof s === 'object' ? s : {};
  return {
    n: i + 1,
    title: str(s.title, 80),
    seconds: Math.max(1, Math.min(15, Number(s.seconds) || 3)),
    purpose: str(s.purpose, 160),
    visual: str(s.visual, 600),
    shot: str(s.shot, 120),
    camera: str(s.camera, 160),
    vo: str(s.vo, 400),
    onScreen: str(s.onScreen, 120),
    sfx: str(s.sfx, 160),
    transition: str(s.transition, 80),
    imagePrompt: str(s.imagePrompt, 1200),
    videoPrompt: str(s.videoPrompt, 1200),
    model: str(s.model, 40),
    clipSeconds: [5, 10].includes(Number(s.clipSeconds)) ? Number(s.clipSeconds) : 5,
    lipSync: !!s.lipSync,
    character: !!s.character,
  };
}
function cleanPlan(p) {
  p = p && typeof p === 'object' ? p : {};
  const st = p.strategy && typeof p.strategy === 'object' ? p.strategy : {};
  const lb = p.lookbook && typeof p.lookbook === 'object' ? p.lookbook : {};
  const vo = p.voice && typeof p.voice === 'object' ? p.voice : {};
  const mu = p.music && typeof p.music === 'object' ? p.music : {};
  const po = p.post && typeof p.post === 'object' ? p.post : {};
  return {
    title: cleanText(p.title, 120),
    strategy: {
      hooks: arr(st.hooks, 5, 160), chosenHook: Math.max(0, Math.min(4, Number(st.chosenHook) || 0)),
      framework: str(st.framework, 80), angle: str(st.angle, 400), emotion: str(st.emotion, 120), whyItWorks: str(st.whyItWorks, 500),
      cta: str(st.cta, 160),
    },
    lookbook: {
      character: str(lb.character, 700), characterSheetPrompt: str(lb.characterSheetPrompt, 1200), wardrobe: str(lb.wardrobe, 300),
      setting: str(lb.setting, 400), palette: str(lb.palette, 200), lighting: str(lb.lighting, 200), style: str(lb.style, 300), negative: str(lb.negative, 400),
    },
    scenes: (Array.isArray(p.scenes) ? p.scenes : []).slice(0, 14).map(cleanScene),
    voice: { direction: str(vo.direction, 500), script: str(vo.script, 2000), elevenlabs: str(vo.elevenlabs, 400) },
    music: { mood: str(mu.mood, 200), bpm: str(mu.bpm, 40), search: arr(mu.search, 6, 80), trending: str(mu.trending, 300), sfx: arr(mu.sfx, 10, 80) },
    editing: arr(p.editing, 20, 300),
    post: { caption: str(po.caption, 2200), hashtags: str(po.hashtags, 600), endCard: str(po.endCard, 160), pinnedComment: str(po.pinnedComment, 300), bestTime: str(po.bestTime, 120) },
    checklist: arr(p.checklist, 20, 200),
  };
}

async function list() {
  const cur = (await getJson(KEY)) || { items: {} };
  return Object.values(cur.items).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
async function save(raw, by) {
  raw = raw && typeof raw === 'object' ? raw : {};
  let out;
  await cas(KEY, cur => {
    cur = cur || { items: {} };
    const prev = raw.id ? cur.items[raw.id] : null;
    if (raw.id && !prev) throw new HttpError(404, 'not_found', 'That project no longer exists.');
    const now = core.nowIso();
    const frames = {};
    Object.entries(raw.frames && typeof raw.frames === 'object' ? raw.frames : {}).forEach(([k, v]) => { if (/^\d{1,2}$/.test(k) && /^e[a-z0-9]{6,30}$/.test(String(v))) frames[k] = v; });
    out = {
      ...(prev || { id: `v${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`, createdBy: by, createdAt: now }),
      status: STATUSES.includes(raw.status) ? raw.status : 'scripted',
      brief: cleanBrief(raw.brief), plan: cleanPlan(raw.plan), frames, updatedAt: now, updatedBy: by,
      done: (Array.isArray(raw.done) ? raw.done : []).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 50).slice(0, 50),
    };
    cur.items[out.id] = out;
    Object.values(cur.items).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(MAX).forEach(x => { delete cur.items[x.id]; });
    return cur;
  });
  return out;
}
async function remove(id) { await cas(KEY, cur => { if (!cur || !cur.items[id]) return undefined; delete cur.items[id]; return cur; }); return true; }

function briefText(b) {
  return [
    b.forWho === 'auntietobi' ? 'ADVERT FOR: Auntie Tobi itself — the free AI-powered UK guide app for Nigerians in the UK (auntietobi.co.uk): ask Auntie Tobi anything about UK life, find trusted Nigerian businesses, events, jobs, news. Handle @auntietobi_uk.' : `ADVERT FOR: ${b.business || 'a Nigerian-owned business in the UK'}`,
    b.about && `About: ${b.about}`, b.offer && `Offer / what to push: ${b.offer}`, b.audience && `Audience: ${b.audience}`,
    b.location && `Location: ${b.location}`, b.contact && `How to contact/book: ${b.contact}`, b.link && `Link: ${b.link}`,
    `Goal: get ${b.goal}`, `Length: ${b.length} seconds`, `Platform: ${PLATFORMS[b.platform]}`, `Tone: ${b.tone}`, `Language: ${LANGS[b.lang]}`,
    b.notes && `Extra notes from the team:\n${b.notes}`,
  ].filter(Boolean).join('\n');
}

// ✨ The production plan is written in 3 short AI steps (so each call stays fast):
//   1 · strategy + lookbook + scene outline   2 · Dzine prompts for a few scenes at a time   3 · voice, music, editing, posting
const DZINE = `The team produces the footage in DZINE (dzine.ai): they first create a CONSISTENT CHARACTER from a character-sheet image, then make each scene's START FRAME with text-to-image (Nano Banana Pro / Seedream / Flux) using that character, then animate it with IMAGE-TO-VIDEO (${DZINE_VIDEO.join(', ')}), use Lip Sync for talking scenes (with an ElevenLabs voiceover), and edit in CapCut.`;
const ROLE = 'You are an award-winning short-form video ad creative director and storyteller who makes scroll-stopping ads for Nigerian-owned businesses in the UK (and for Auntie Tobi, a UK guide app for Nigerians). You write for real people: warm, culturally true (Naija warmth, UK setting), never cringe or stereotyped. Use ONLY facts from the brief for prices, offers, dates, addresses and claims — never invent prices, awards, reviews or numbers.';
async function ask(system, user, maxTokens) {
  const settings = await core.getSettings();
  const out = await gen.callModel([{ role: 'system', content: system }, { role: 'user', content: user }], maxTokens, settings, { json: true, raw: true });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  try { return JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { throw new HttpError(502, 'ai_error', 'The AI reply came back garbled — please try again.'); }
}
function aspectOf(b) { return b.platform === 'feed' ? '4:5' : '9:16'; }

async function planStep1(brief, extra) {
  const b = cleanBrief(brief);
  if (b.forWho === 'business' && !b.business && !b.about) throw new HttpError(400, 'too_short', 'Pick a business or describe it first.');
  const scenesN = b.length === 15 ? '4–5' : b.length === 30 ? '6–8' : '9–11';
  const j = await ask(`${ROLE}
${DZINE}
Plan the advert. Hook in the first 1–2 seconds. One idea per scene. Show, don't tell. End with a clear CTA matching the goal. Use ${scenesN} scenes whose seconds add up to about ${b.length}. Voiceover must fit each scene (about 2.5 words per second; some scenes can have no VO). On-screen text max 6 words.
Return ONLY JSON:
{"title": string,
 "strategy": {"hooks": [3 short alternative hook lines], "chosenHook": 0, "framework": e.g. "Problem → Solution", "angle": string, "emotion": string, "whyItWorks": 1–2 sentences, "cta": string},
 "lookbook": {"character": detailed description of the main character (age, skin tone, hair, face, build, vibe), "characterSheetPrompt": a Dzine text-to-image prompt for a character reference sheet (front, 3/4 and side views, full body, plain light-grey studio background, same outfit, photorealistic), "wardrobe": string, "setting": string, "palette": string, "lighting": string, "style": e.g. "photorealistic, cinematic, shallow depth of field", "negative": negative prompt},
 "scenes": [{"title","seconds","purpose","visual","shot","camera","vo","onScreen","sfx","transition","character": true if the main character appears,"lipSync": true if they speak to camera}]}`,
    briefText(b) + (extra ? `\n\nDIRECTION FOR THIS VERSION: ${String(extra).slice(0, 500)}` : ''), 2600);
  const p = cleanPlan(j);
  if (p.scenes.length < 2) throw new HttpError(502, 'ai_error', 'The AI couldn’t plan that just now — please try again.');
  return { brief: b, plan: p };
}
async function planPrompts(brief, plan, from, to) {
  const b = cleanBrief(brief), p = cleanPlan(plan), aspect = aspectOf(b);
  const scenes = p.scenes.slice(from, to);
  if (!scenes.length) return { scenes: [] };
  const j = await ask(`${ROLE}
${DZINE}
Write Dzine prompts for the scenes given.
- "imagePrompt" (start frame, text-to-image): ONE rich paragraph — subject + action + setting + composition + camera/lens + lighting + mood + colour palette + style + "${aspect} vertical". Reuse the LOOKBOOK exactly so every scene matches. If the main character is in the scene, start with "The same character (Dzine consistent character): " then their look and wardrobe. NO text, words, signs, logos or brand names in the image.
- "videoPrompt" (image-to-video): MOTION only — what moves, camera movement, speed, expression change; 1–2 actions; natural physics; no cuts. Mention duration.
- "model": best Dzine video model for the scene: Kling (realistic people & hands), Veo 3.1 (cinematic, native sound), Hailuo (expressive faces, dynamic), Sora 2 (complex scenes), Wan or Seedance (budget, simple motion).
- "clipSeconds": 5 or 10 (enough to cover the scene seconds).
Return ONLY JSON: {"scenes": [{"n","imagePrompt","videoPrompt","model","clipSeconds"}]}`,
    `${briefText(b)}\n\nLOOKBOOK: ${JSON.stringify(p.lookbook)}\n\nSCENES:\n${JSON.stringify(scenes.map(s => ({ n: s.n, title: s.title, seconds: s.seconds, visual: s.visual, shot: s.shot, camera: s.camera, character: s.character, lipSync: s.lipSync })))}`, 2600);
  const got = Array.isArray(j.scenes) ? j.scenes : [];
  return { scenes: scenes.map((s, k) => { const g = got.find(x => Number(x && x.n) === s.n) || got[k] || {}; return { n: s.n, imagePrompt: str(g.imagePrompt, 1200), videoPrompt: str(g.videoPrompt, 1200), model: str(g.model, 40), clipSeconds: [5, 10].includes(Number(g.clipSeconds)) ? Number(g.clipSeconds) : (s.seconds > 5 ? 10 : 5) }; }) };
}
async function planFinish(brief, plan) {
  const b = cleanBrief(brief), p = cleanPlan(plan);
  const j = await ask(`${ROLE}
${DZINE}
Finish the production pack for this advert.
Return ONLY JSON:
{"voice": {"direction": voice direction (accent e.g. warm British-Nigerian, age, pace, energy), "script": the full voiceover in scene order with [pause] marks, "elevenlabs": suggested ElevenLabs voice type + settings (stability, style)},
 "music": {"mood": string, "bpm": e.g. "100–110", "search": [4–6 royalty-free music search terms, e.g. "afrobeats upbeat corporate"], "trending": when/how to use a trending Instagram/TikTok sound instead, "sfx": [sound effects in order]},
 "editing": [10–16 step-by-step CapCut assembly lines: import order, trims to scene seconds, voiceover, captions style (big, bold, safe area), on-screen text timing, transitions, music ducking under VO, end card, export 1080p ${aspectOf(b) === '9:16' ? '1080×1920' : '1080×1350'} 30fps],
 "post": {"caption": Instagram/TikTok caption (50–120 words, ends with a question or CTA), "hashtags": 10–15 hashtags as one string, "endCard": end-card text, "pinnedComment": string, "bestTime": best time to post for Nigerians in the UK},
 "checklist": [production checklist in order: character sheet in Dzine → start frames → videos → lip sync → voiceover → edit → captions → post]}`,
    `${briefText(b)}\n\nPLAN:\n${JSON.stringify({ strategy: p.strategy, scenes: p.scenes.map(s => ({ n: s.n, seconds: s.seconds, title: s.title, vo: s.vo, onScreen: s.onScreen, sfx: s.sfx })) })}`, 2600);
  const c = cleanPlan(Object.assign({}, p, j));
  return { voice: c.voice, music: c.music, editing: c.editing, post: c.post, checklist: c.checklist };
}

// ✏️ Rewrite one piece (a hook, a VO line, a prompt…) with an instruction
async function rewrite(brief, field, text, how, context) {
  text = str(text, 1500); if (!text) throw new HttpError(400, 'empty', 'Nothing to rewrite.');
  const settings = await core.getSettings();
  const messages = [
    { role: 'system', content: 'You improve one piece of a short-form video advert for a Nigerian-owned UK business (or the Auntie Tobi app). Keep facts exactly as given — never invent prices, offers or claims. Keep it the same kind of thing and similar length unless asked. Reply with ONLY the rewritten text, no quotes or notes.' },
    { role: 'user', content: `${briefText(cleanBrief(brief))}\n\nPIECE (${cleanText(field, 40)}): ${text}\n${context ? `\nCONTEXT: ${str(context, 800)}` : ''}\n\nINSTRUCTION: ${cleanText(how, 200) || 'Make it punchier and more engaging.'}` },
  ];
  const out = await gen.callModel(messages, 700, settings, { raw: true });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  return String(out.text || '').replace(/^["“]|["”]$/g, '').trim().slice(0, 1500);
}

module.exports = { list, save, remove, planStep1, planPrompts, planFinish, rewrite, STATUSES, PLATFORMS, TONES, LANGS, GOALS, DZINE_VIDEO };
