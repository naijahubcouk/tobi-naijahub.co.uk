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
const DRAMA_LENGTHS = [30, 45, 60, 90, 120];
const GENRES = { family: 'Nigerian family comedy', romcom: 'Romantic comedy', drama: 'Emotional drama', suspense: 'Suspense', mystery: 'Mystery', action: 'Action', everyday: 'Everyday UK-Nigerian life' };
const BEATS = ['hook', 'setup', 'conflict', 'twist', 'resolution', 'reveal'];
const PLATFORMS = { reels: 'Instagram Reels (9:16)', tiktok: 'TikTok (9:16)', stories: 'Instagram/WhatsApp Stories (9:16)', shorts: 'YouTube Shorts (9:16)', feed: 'Instagram/Facebook feed (4:5)' };
const TONES = ['warm', 'funny', 'premium', 'urgent', 'inspiring', 'friendly'];
const LANGS = { english: 'British English', pidgin: 'British English with a light touch of Nigerian Pidgin', yoruba: 'British English with a few Yoruba phrases', igbo: 'British English with a few Igbo phrases' };
const GOALS = ['bookings', 'orders', 'visits', 'follows', 'enquiries', 'downloads', 'awareness'];
const DZINE_VIDEO = ['Kling', 'Veo 3.1', 'Hailuo', 'Sora 2', 'Wan', 'Seedance'];
const SIZES = ['9:16', '4:5', '1:1', '16:9'];
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
    mode: b.mode === 'drama' ? 'drama' : 'ad',
    length: (b.mode === 'drama' ? DRAMA_LENGTHS : LENGTHS).includes(Number(b.length)) ? Number(b.length) : (b.mode === 'drama' ? 60 : 30),
    genre: GENRES[b.genre] ? b.genre : 'family',
    humour: Math.max(0, Math.min(100, Number(b.humour) >= 0 ? Number(b.humour) : 60)),
    brandPush: Math.max(0, Math.min(100, Number(b.brandPush) >= 0 ? Number(b.brandPush) : 25)),
    platform: PLATFORMS[b.platform] ? b.platform : 'reels',
    tone: TONES.includes(b.tone) ? b.tone : 'warm',
    lang: LANGS[b.lang] ? b.lang : 'english',
    notes: str(b.notes, 2000),
    size: b.mode === 'drama' ? '9:16' : SIZES.includes(b.size) ? b.size : (b.platform === 'feed' ? '4:5' : '9:16'),
    products: (Array.isArray(b.products) ? b.products : []).filter(v => /^e[a-z0-9]{6,30}$/.test(String(v))).slice(0, 4),
    productNote: str(b.productNote, 300),
    logo: /^e[a-z0-9]{6,30}$/.test(String(b.logo || '')) ? b.logo : '',
    castNotes: str(b.castNotes, 300),
    refStyle: str(b.refStyle, 2500),
    script: multi(b.script, 12000),
    concept: b.concept && typeof b.concept === 'object' ? { title: str(b.concept.title, 120), genre: str(b.concept.genre, 80), logline: str(b.concept.logline, 400), beats: arr(b.concept.beats, 8, 200), characters: str(b.concept.characters, 300), productMoment: str(b.concept.productMoment, 300) } : null,
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
    character: !!s.character || (Array.isArray(s.cast) && s.cast.length > 0),
    cast: arr(s.cast, 3, 40),
    product: !!s.product,
    heading: str(s.heading, 100),
    location: str(s.location, 60),
    script: (Array.isArray(s.script) ? s.script : []).map(Number).filter(n => Number.isInteger(n) && n > 0 && n < 1000).slice(0, 16),
    beat: BEATS.includes(s.beat) ? s.beat : '',
    lines: (Array.isArray(s.lines) ? s.lines : []).map(l => l && typeof l === 'object' ? { who: str(l.who, 40) || 'Narrator', text: str(l.text, 300), emotion: str(l.emotion, 40) } : null).filter(l => l && l.text).slice(0, 4),
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
    scenes: (Array.isArray(p.scenes) ? p.scenes : []).slice(0, 24).map(cleanScene),
    cast: (Array.isArray(p.cast) ? p.cast : []).slice(0, 3).map(c => c && typeof c === 'object' ? { name: str(c.name, 40), role: str(c.role, 120), personality: str(c.personality, 300), outfit: str(c.outfit, 300), description: str(c.description, 600), sheetPrompt: str(c.sheetPrompt, 1200), gender: ['female', 'male'].includes(c.gender) ? c.gender : '', voiceHint: str(c.voiceHint, 160) } : null).filter(c => c && c.name),
    concept: p.concept && typeof p.concept === 'object' ? { title: str(p.concept.title, 120), genre: str(p.concept.genre, 80), logline: str(p.concept.logline, 400), beats: arr(p.concept.beats, 8, 200), productMoment: str(p.concept.productMoment, 300) } : null,
    locations: (Array.isArray(p.locations) ? p.locations : []).slice(0, 8).map(l => l && typeof l === 'object' ? { name: str(l.name, 60), description: str(l.description, 700), sheetPrompt: str(l.sheetPrompt, 1000) } : null).filter(l => l && l.name),
    reveal: { tagline: str(p.reveal && p.reveal.tagline, 120), sub: str(p.reveal && p.reveal.sub, 160) },
    storyCheck: p.storyCheck && typeof p.storyCheck === 'object' ? { score: Math.max(0, Math.min(10, Number(p.storyCheck.score) || 0)), at: cleanText(p.storyCheck.at, 40), issues: (Array.isArray(p.storyCheck.issues) ? p.storyCheck.issues : []).slice(0, 12).map(x => x && typeof x === 'object' ? { n: Math.max(0, Math.min(24, Number(x.n) || 0)), problem: str(x.problem, 240), fix: str(x.fix, 240) } : null).filter(x => x && x.problem) } : null,
    voice: { direction: str(vo.direction, 500), script: str(vo.script, 2000), elevenlabs: str(vo.elevenlabs, 400) },
    music: { mood: str(mu.mood, 200), bpm: str(mu.bpm, 40), search: arr(mu.search, 6, 80), trending: str(mu.trending, 300), sfx: arr(mu.sfx, 10, 80) },
    editing: arr(p.editing, 20, 300),
    post: { caption: str(po.caption, 2200), hashtags: str(po.hashtags, 600), endCard: str(po.endCard, 160), pinnedComment: str(po.pinnedComment, 300), bestTime: str(po.bestTime, 120) },
    checklist: arr(p.checklist, 20, 200),
  };
}

// "Make the whole video" state: chosen quality, voice, music, the character picture and each fal.ai job.
function cleanMake(m) {
  m = m && typeof m === 'object' ? m : {};
  const url = v => /^https:\/\/[A-Za-z0-9.\-]+\.(fal\.media|fal\.run|googleapis\.com)\/[^\s"'<>]{3,600}$/.test(String(v || '')) ? String(v) : '';
  const aid = v => /^a[a-z0-9]{8,30}$/.test(String(v || '')) ? String(v) : '';
  const q = v => /^https:\/\/queue\.fal\.run\/[A-Za-z0-9._\-/]+$/.test(String(v || '')) ? String(v) : '';
  const job = j => j && typeof j === 'object' ? { requestId: cleanText(j.requestId, 80), statusUrl: q(j.statusUrl), responseUrl: q(j.responseUrl), model: cleanText(j.model, 120), seconds: Number(j.seconds) || 0, gbp: Number(j.gbp) || 0, status: cleanText(j.status, 20), url: url(j.url), error: cleanText(j.error, 200), prompt: str(j.prompt, 200) } : null;
  const map = (o, fn) => { const out = {}; Object.entries(o && typeof o === 'object' ? o : {}).forEach(([k, v]) => { if (/^\d{1,2}$/.test(k)) { const x = fn(v); if (x) out[k] = x; } }); return out; };
  return {
    tier: ['draft', 'budget', 'premium', 'top'].includes(m.tier) ? m.tier : 'budget',
    voice: cleanText(m.voice, 40), music: m.music !== false, musicPrompt: str(m.musicPrompt, 300), musicVol: Math.max(0, Math.min(1, Number(m.musicVol) || 0.22)),
    charImg: /^e[a-z0-9]{6,30}$/.test(String(m.charImg || '')) ? m.charImg : '',
    clips: map(m.clips, job), vo: map(m.vo, v => v && (url(v.url) || aid(v.aid)) ? { url: url(v.url), aid: aid(v.aid), text: str(v.text, 600) } : null), musicJob: job(m.musicJob),
    voSource: m.voSource === 'own' ? 'own' : 'ai', voFull: aid(m.voFull), customVoices: (Array.isArray(m.customVoices) ? m.customVoices : []).filter(v => /^[A-Za-z0-9]{16,40}$/.test(String(v))).slice(0, 10),
    endCard: m.endCard !== false, captions: m.captions !== false, sfxOn: m.sfxOn !== false, logoOn: m.logoOn !== false,
    locImgs: (o => { const out = {}; Object.entries(o && typeof o === 'object' ? o : {}).forEach(([k, v]) => { if (/^\d$/.test(k) && /^e[a-z0-9]{6,30}$/.test(String(v))) out[k] = v; }); return out; })(m.locImgs),
    groupImgs: (o => { const out = {}; Object.entries(o && typeof o === 'object' ? o : {}).slice(0, 8).forEach(([k, v]) => { if (/^[0-9]{2,4}$/.test(k) && /^e[a-z0-9]{6,30}$/.test(String(v))) out[k] = v; }); return out; })(m.groupImgs),
    castImgs: (o => { const out = {}; Object.entries(o && typeof o === 'object' ? o : {}).forEach(([k, v]) => { if (/^\d$/.test(k) && /^e[a-z0-9]{6,30}$/.test(String(v))) out[k] = v; }); return out; })(m.castImgs),
    castVoices: (o => { const out = {}; Object.entries(o && typeof o === 'object' ? o : {}).slice(0, 4).forEach(([k, v]) => { const n = cleanText(k, 40); if (n && /^[A-Za-z0-9 ]{2,40}$/.test(String(v))) out[n] = String(v); }); return out; })(m.castVoices),
    lines: map(m.lines, a => Array.isArray(a) ? a.slice(0, 4).map(l => l && url(l.url) ? { url: url(l.url), who: str(l.who, 40), text: str(l.text, 300), voice: cleanText(l.voice, 40) } : null).filter(Boolean) : null),
    sfx: map(m.sfx, job), lipsync: map(m.lipsync, job),
    checks: map(m.checks, c => c && typeof c === 'object' ? { ok: !!c.ok, issues: arr(c.issues, 5, 160), clip: url(c.clip) } : null),
    approved: m.approved && typeof m.approved === 'object' ? { gbp: Number(m.approved.gbp) || 0, at: cleanText(m.approved.at, 40), sigs: (o => { const out = {}; Object.entries(o && typeof o === 'object' ? o : {}).forEach(([k, v]) => { if (/^\d{1,2}$/.test(k) && /^[a-z0-9]{1,16}$/.test(String(v))) out[k] = String(v); }); return out; })(m.approved.sigs) } : null,
    finals: (Array.isArray(m.finals) ? m.finals : []).map(f => f && /^f[a-z0-9]{8,30}$/.test(String(f.fid)) ? { fid: f.fid, parts: Math.max(1, Math.min(80, Number(f.parts) || 1)), size: Number(f.size) || 0, at: cleanText(f.at, 40), ext: f.ext === 'webm' ? 'webm' : 'mp4' } : null).filter(Boolean).slice(0, 3),
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
      make: cleanMake(raw.make),
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
    `Video size: ${b.size}`,
    b.products && b.products.length ? `PRODUCT: real product photos are provided (${b.products.length}) — ${b.productNote || 'show the product exactly as in the photos'}. Feature the product clearly in key scenes (mark them "product": true).` : (b.productNote ? `Product: ${b.productNote}` : ''),
    b.castNotes && `Characters wanted: ${b.castNotes}`,
    b.concept && `CHOSEN STORY CONCEPT: ${b.concept.title} (${b.concept.genre}) — ${b.concept.logline}${b.concept.beats && b.concept.beats.length ? `\nBeats: ${b.concept.beats.join(' → ')}` : ''}`,
    b.refStyle && `STYLE TO BORROW (from a reference video — copy only the techniques: pacing, shot types, structure, transitions; NEVER copy its characters, dialogue, brands or story):\n${b.refStyle}`,
    b.notes && `Extra notes from the team:\n${b.notes}`,
  ].filter(Boolean).join('\n');
}

// ✨ The production plan is written in 3 short AI steps (so each call stays fast):
//   1 · strategy + lookbook + scene outline   2 · Dzine prompts for a few scenes at a time   3 · voice, music, editing, posting
const DZINE = `The team produces the footage in DZINE (dzine.ai): they first create a CONSISTENT CHARACTER from a character-sheet image, then make each scene's START FRAME with text-to-image (Nano Banana Pro / Seedream / Flux) using that character, then animate it with IMAGE-TO-VIDEO (${DZINE_VIDEO.join(', ')}), use Lip Sync for talking scenes (with an ElevenLabs voiceover), and edit in CapCut.`;
const ROLE = 'You are an award-winning short-form video ad creative director and storyteller who makes scroll-stopping ads for Nigerian-owned businesses in the UK (and for Auntie Tobi, a UK guide app for Nigerians). You write for real people: warm, culturally true (Naija warmth, UK setting), never cringe or stereotyped. Use ONLY facts from the brief for prices, offers, dates, addresses and claims — never invent prices, awards, reviews or numbers.';
async function ask(system, user, maxTokens) {
  const claude = await require('./videoai').claudeConfig();
  if (claude) return askClaude(claude, system, user, maxTokens);
  return askLoose(system, user, maxTokens);
}
// ask the AI for JSON; repair small slips and try once more (with more room) if the reply can't be read
async function askLoose(system, user, maxTokens) {
  const settings = await core.getSettings();
  let out, partial = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    out = await gen.callModel([{ role: 'system', content: system + (attempt ? '\nYOUR LAST REPLY WAS CUT OFF OR NOT VALID JSON. Keep every text shorter and reply with ONE complete JSON object.' : '') }, { role: 'user', content: user }], Math.round(maxTokens * (attempt ? 1.6 : 1)), settings, { json: true, raw: true });
    gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
    const j = require('./jsonfix').parseLoose(out.text);
    if (j && (out.finish !== 'length' || attempt)) return j;
    if (j) { partial = j; continue; } // cut short — try once more with more room, keep this as a fallback
    console.error('[videoad] unreadable reply', out.model, out.finish, out.outTok, JSON.stringify(String(out.text).slice(0, 200)), '…', JSON.stringify(String(out.text).slice(-150)));
  }
  if (partial) return partial;
  throw new HttpError(502, 'ai_error', 'The AI reply came back garbled twice — please try again.');
}
async function askClaude(c, system, user, maxTokens) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 24000);
  let res, data;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: ctrl.signal, headers: { 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: c.model, max_tokens: maxTokens, system: system + '\nReply with the JSON object only — no markdown fences, no commentary.', messages: [{ role: 'user', content: user }] }) });
    data = await res.json().catch(() => null);
  } catch (_) { throw new HttpError(504, 'ai_timeout', 'Claude took too long — try again, or switch the writer back to the standard AI in ⚙️ Video AI settings.'); }
  finally { clearTimeout(timer); }
  if (!res.ok) throw new HttpError(502, 'ai_error', `Claude said: ${String((data && data.error && data.error.message) || res.status).slice(0, 200)}`);
  const text = (data.content || []).map(x => x.text || '').join('');
  const u = data.usage || {};
  require('./videoai').addCost(((u.input_tokens || 0) * c.inUsdPerM + (u.output_tokens || 0) * c.outUsdPerM) / 1e6, 'claude writing').catch(() => {});
  const fixed = require('./jsonfix').parseLoose(text); if (fixed) return fixed;
  try { return JSON.parse(text.replace(/^[\s\S]*?(\{)/, '$1').replace(/\}[^}]*$/, '}')); } catch (_) { throw new HttpError(502, 'ai_error', 'The AI reply came back garbled — please try again.'); }
}
async function visionAsk(system, content, maxTokens) { return askLoose(system, content, maxTokens); }
function aspectOf(b) { return b.size || (b.platform === 'feed' ? '4:5' : '9:16'); }

// 💡 Three different story ideas to pick from
async function concepts(brief) {
  const b = cleanBrief(brief);
  if (b.forWho === 'business' && !b.business && !b.about) throw new HttpError(400, 'too_short', 'Pick a business or describe it first.');
  const j = await ask(`${ROLE}
Pitch THREE clearly different story concepts for this ${b.length}-second advert (e.g. one comedy/drama mini-story with characters, one emotional/aspirational, one POV / day-in-the-life or problem→solution). Each must be filmable with AI video (short scenes, 1–3 characters, simple locations) and end on the CTA. If a style reference is given, use its techniques.
Return ONLY JSON: {"concepts": [{"title": short name, "genre": e.g. "Action comedy", "logline": 1–2 sentences, "beats": [4–6 short story beats], "characters": who appears (e.g. "Nigerian woman 30s, her husband"), "why": why it will stop the scroll}]}`, briefText(b), 1600);
  const list = (Array.isArray(j.concepts) ? j.concepts : []).slice(0, 3).map(c => ({ title: str(c && c.title, 120), genre: str(c && c.genre, 80), logline: str(c && c.logline, 400), beats: arr(c && c.beats, 8, 200), characters: str(c && c.characters, 200), why: str(c && c.why, 300) })).filter(c => c.title);
  if (!list.length) throw new HttpError(502, 'ai_error', 'The AI couldn’t pitch ideas just now — please try again.');
  return list;
}
// 🎞️ Study a reference video's style from a few frames (never copy its content)
async function analyseReference(frames, seconds, notes) {
  const imgs = (Array.isArray(frames) ? frames : []).filter(f => /^data:image\/(jpeg|png|webp);base64,/.test(String(f)) && f.length < 200000).slice(0, 10);
  if (imgs.length < 2) throw new HttpError(400, 'no_frames', 'Couldn’t read that video — try another file.');
  const j = await visionAsk('You are a film editor. You study a short-form video ad from evenly spaced still frames and describe its TECHNIQUES only, so a new ORIGINAL ad can borrow the style. Never describe or copy the identities of people, brand names, logos, exact dialogue or the story itself.',
    [{ type: 'text', text: `These are ${imgs.length} evenly spaced frames from a ${Math.round(Number(seconds) || 0)}-second vertical video.${notes ? ` Team notes: ${String(notes).slice(0, 300)}` : ''}\nReturn ONLY JSON: {"summary": 1 sentence on the format, "structure": the story structure (e.g. hook → conflict → twist → product reveal → CTA), "pacing": cuts per second / scene length feel, "shots": shot types and camera moves used, "transitions": string, "look": lighting/colour/grade, "text": how on-screen text and captions are used, "audio": likely music/voice style, "tips": [3–5 techniques to borrow]}` }]
      .concat(imgs.map(u => ({ type: 'image_url', image_url: { url: u } }))), 900);
  return ['Format: ' + str(j.summary, 200), 'Structure: ' + str(j.structure, 300), 'Pacing: ' + str(j.pacing, 200), 'Shots: ' + str(j.shots, 300), 'Transitions: ' + str(j.transitions, 200), 'Look: ' + str(j.look, 200), 'On-screen text: ' + str(j.text, 200), 'Audio: ' + str(j.audio, 200), 'Borrow: ' + arr(j.tips, 5, 160).join('; ')].join('\n').slice(0, 2500);
}
// 🔍 Does a finished clip still match the character and product photos?
async function checkClip(frame, refIds, scene) {
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(String(frame || '')) || frame.length > 300000) throw new HttpError(400, 'bad_frame', 'Couldn’t read that clip.');
  const es = require('./eventsub'), refs = [];
  for (const id of (Array.isArray(refIds) ? refIds : []).slice(0, 4)) { const r = await es.getImage(id); if (r && r.dataUrl) refs.push(r.dataUrl); }
  const j = await visionAsk('You check AI-generated video frames for continuity errors against reference photos. Be practical: small lighting or angle differences are fine; flag a different-looking face, skin tone, hairstyle, outfit, a different-looking room or place (layout, colours, furniture), a changed/wrong product, extra fingers/limbs, garbled text or anything that would look wrong in an advert.',
    [{ type: 'text', text: `The FIRST image is a frame from the clip for this scene: ${String(scene || '').slice(0, 300)}. The other images are the reference photos (location / characters / product). Return ONLY JSON: {"ok": true/false, "issues": [short issues, empty if ok]}` }, { type: 'image_url', image_url: { url: frame } }]
      .concat(refs.map(u => ({ type: 'image_url', image_url: { url: u } }))), 300);
  return { ok: !!j.ok, issues: arr(j.issues, 5, 160) };
}

async function planStep1(brief, extra) {
  const b = cleanBrief(brief);
  if (b.forWho === 'business' && !b.business && !b.about) throw new HttpError(400, 'too_short', 'Pick a business or describe it first.');
  const scenesN = b.script ? 'as many as the script needs (max 14)' : b.length === 15 ? '4–5' : b.length === 30 ? '6–8' : '9–11';
  const j = await ask(`${ROLE}
${DZINE}
Plan the advert. Hook in the first 1–2 seconds. One idea per scene. Show, don't tell. End with a clear CTA matching the goal. Use ${scenesN} scenes whose seconds add up to about ${b.length}. Spoken words must fit each scene (about 2.5 words per second; some scenes can have none). On-screen text max 6 words.
CAST: 1–3 named characters (Nigerian names unless told otherwise) with detailed looks so AI can keep them consistent. Each scene lists who appears in "cast".
SPOKEN WORDS: each scene has "lines": [{"who": a cast name or "Narrator", "text"}] in order (max 3 lines per scene), and "vo" = all those words joined (for subtitles). Use dialogue when the concept has characters talking; otherwise a Narrator.
LIP SYNC: set "lipSync": true ONLY when exactly one cast member speaks to camera in that scene (one line, 2–8 seconds), otherwise false.
PRODUCT: set "product": true for scenes that clearly show the product.
Return ONLY JSON:
{"title": string,
 "strategy": {"hooks": [3 short alternative hook lines], "chosenHook": 0, "framework": e.g. "Problem → Solution", "angle": string, "emotion": string, "whyItWorks": 1–2 sentences, "cta": string},
 "cast": [{"name", "role", "description": detailed look (age, skin tone, hair, face, build), "outfit": the ONE outfit they wear all through (unless the story changes it), "sheetPrompt": text-to-image prompt for a full-body reference photo of this person (plain light-grey studio background, photorealistic), "gender": "female" or "male", "voiceHint": voice style (e.g. warm Nigerian-British woman, 30s)}],
 "lookbook": {"character": detailed description of the main character (age, skin tone, hair, face, build, vibe), "characterSheetPrompt": a Dzine text-to-image prompt for a character reference sheet (front, 3/4 and side views, full body, plain light-grey studio background, same outfit, photorealistic), "wardrobe": string, "setting": string, "palette": string, "lighting": string, "style": e.g. "photorealistic, cinematic, shallow depth of field", "negative": negative prompt},
 "scenes": [{"title","seconds","purpose","visual","shot","camera","cast": [names],"lines": [{"who","text"}],"vo","onScreen","sfx": one short sound effect description or "","transition","location": one of the location names,"character": true if any cast member appears,"product": boolean,"lipSync": boolean}],
 "locations": [{"name": short place name e.g. "Living room", "description": detailed fixed look so every shot matches (layout, wall colour, flooring, furniture, key props, windows, light), "sheetPrompt": text-to-image prompt for an EMPTY wide establishing shot of this set (no people, eye level, photorealistic)}]}
LOCATIONS: use as few places as the story needs (1–4) and reuse them — every scene in the same place must look identical.`,
    briefText(b) + (b.script ? `\n\nTHE TEAM'S OWN SCRIPT — they have already written the story. Keep its story, order, spoken words and on-screen text EXACTLY as written (do not rewrite or add lines); only split it into scenes, set realistic seconds per scene (about 2.5 spoken words per second) and fill in the other fields (visuals, shots, cast, hooks, lookbook). If the script has no named characters, use a Narrator:\n<<<\n${b.script}\n>>>` : '') + (extra ? `\n\nDIRECTION FOR THIS VERSION: ${String(extra).slice(0, 500)}` : ''), 3000);
  const p = cleanPlan(j);
  p.scenes.forEach(sc => { if (!sc.vo && sc.lines.length) sc.vo = sc.lines.map(l => l.text).join(' ').slice(0, 400); if (sc.lipSync && !(sc.lines.length === 1 && sc.lines[0].who !== 'Narrator')) sc.lipSync = false; });
  if (b.concept) p.concept = { title: b.concept.title, genre: b.concept.genre, logline: b.concept.logline };
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
- "imagePrompt" (start frame, text-to-image): ONE rich paragraph — subject + action + setting + composition + camera/lens + lighting + mood + colour palette + style + "${aspect} ${aspect === '16:9' ? 'landscape' : aspect === '1:1' ? 'square' : 'vertical'}". Reuse the LOOKBOOK so every scene matches. For each cast member in the scene write "the same <Name> from the reference photo" plus their LOOK and OUTFIT copied word for word from CAST. Start the setting with "the same <location> from the location reference photo" plus its description copied word for word from LOCATIONS — never change a room's colours, furniture or props between scenes. If the scene shows the product write "the exact product from the product reference photo". NO text, words, signs, logos or brand names in the image.
- "videoPrompt" (image-to-video): MOTION only — what moves, camera movement, speed, expression change; 1–2 actions; natural physics; no cuts. Mention duration.
- "model": best Dzine video model for the scene: Kling (realistic people & hands), Veo 3.1 (cinematic, native sound), Hailuo (expressive faces, dynamic), Sora 2 (complex scenes), Wan or Seedance (budget, simple motion).
- "clipSeconds": 5 or 10 (enough to cover the scene seconds).
Keep each imagePrompt under 170 words and each videoPrompt under 50 words.
Return ONLY JSON: {"scenes": [{"n","imagePrompt","videoPrompt","model","clipSeconds"}]}`,
    `${briefText(b)}\n\nCAST: ${JSON.stringify(p.cast.map(c => ({ name: c.name, look: c.description, outfit: c.outfit })))}\n\nLOCATIONS: ${JSON.stringify(p.locations.map(l => ({ name: l.name, description: l.description })))}\n\nLOOKBOOK: ${JSON.stringify(p.lookbook)}\n\nSCENES:\n${JSON.stringify(scenes.map(s => ({ n: s.n, title: s.title, seconds: s.seconds, location: s.location, heading: s.heading, visual: s.visual, shot: s.shot, camera: s.camera, cast: s.cast, product: s.product, lines: s.lines, lipSync: s.lipSync })))}`, 3400);
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

module.exports = { cleanBrief, cleanPlan, cleanScene, briefText, ask, str, arr, GENRES, BEATS, DRAMA_LENGTHS, list, save, remove, concepts, analyseReference, checkClip, planStep1, planPrompts, planFinish, rewrite, STATUSES, PLATFORMS, TONES, LANGS, GOALS, DZINE_VIDEO };
