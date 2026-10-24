'use strict';
/*
 * Auntie Tobi HQ — 🎭 AI Mini-Drama Creator (part of the Video Ad Studio).
 * Turns a real business / product into an ORIGINAL short vertical film: 3 story pitches → outline →
 * screenplay with dialogue (a few scenes per call, so each call stays fast) → story check → fixes.
 * Projects are saved as Video Ad Studio projects with brief.mode = 'drama'; the video maker does the rest.
 * The writer is a strong model through OpenRouter (default Claude Sonnet — editable in ⚙️ Video AI settings).
 */
const core = require('./core');
const { HttpError } = core;
const gen = require('./generate');
const va = require('./videoad');
const { str, arr, GENRES, BEATS } = va;

const SCENES_FOR = { 30: '5–6', 45: '7–8', 60: '9–11', 90: '13–15', 120: '16–20' };
const ROLE = `You are an award-winning screenwriter and director of viral vertical mini-dramas (9:16 short films — think the best Nollywood skits meets a polished UK web series). You turn real UK-Nigerian businesses into ORIGINAL, entertaining, cinematic fictional stories that feel like short films, NOT adverts.
Rules you always follow:
- A connected story with a beginning, middle and end: an attention-grabbing opening, a clear conflict or problem, humour / suspense / an unexpected twist, a satisfying ending, then a short memorable brand reveal.
- Relatable characters with DISTINCT personalities and ways of speaking. Characters react and reply to each other naturally — real conversation, emotions, interruptions — never random lines or speeches to camera.
- The product belongs to the story (it solves, saves, surprises or connects people). Never hard-sell: no prices or slogans in dialogue unless the brief insists, the brand name said at most once before the reveal.
- Culturally true UK-Nigerian life (Naija warmth, family, banter, light Pidgin where natural, UK settings) — never stereotyped, mocking or cringe. Family-friendly.
- Use ONLY facts from the brief for prices, offers, addresses and claims — never invent awards, reviews or numbers.
- Filmable with AI video: short scenes (3–7 seconds), 1–3 characters per scene, simple real locations, one clear action per scene, varied shots and camera moves (never the same camera move twice in a row).
Reply with ONE JSON object only — no markdown, no commentary.`;

async function writerModel() { try { return (await require('./videoai').settings()).dramaModel; } catch (_) { return require('./videoai').DRAMA_MODEL; } }
function parseJson(text) {
  const t = String(text || '').replace(/^```(?:json)?\s*|\s*```$/g, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new HttpError(502, 'ai_error', 'The writer’s reply came back garbled — please try again.');
  try { return JSON.parse(t.slice(a, b + 1)); } catch (_) { throw new HttpError(502, 'ai_error', 'The writer’s reply came back garbled — please try again.'); }
}
async function write(system, user, maxTokens, temperature) {
  const settings = await core.getSettings();
  const model = await writerModel();
  const out = await gen.callModel([{ role: 'system', content: system }, { role: 'user', content: user }], maxTokens, Object.assign({}, settings, { model }), { raw: true, temperature: temperature == null ? 0.8 : temperature, timeoutMs: 55000 });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  return parseJson(out.text);
}

function dramaBrief(b) {
  const brand = b.forWho === 'auntietobi' ? 'Auntie Tobi — the free AI-powered UK guide app for Nigerians in the UK (auntietobi.co.uk, @auntietobi_uk): ask Auntie Tobi anything about UK life, find trusted Nigerian businesses, events, jobs and news' : (b.business || 'a Nigerian-owned business in the UK');
  return [
    `BRAND / BUSINESS: ${brand}`,
    b.about && `What they do: ${b.about}`, b.offer && `Product / service to feature: ${b.offer}`, b.productNote && `The product: ${b.productNote}`,
    b.products && b.products.length ? `Real product photos are provided (${b.products.length}) — the product must look exactly like them. Mark scenes that show it with "product": true.` : '',
    b.audience && `Audience: ${b.audience}`, b.location && `Location: ${b.location}`, b.contact && `How people contact/book: ${b.contact}`, b.link && `Link: ${b.link}`,
    `GENRE: ${GENRES[b.genre] || GENRES.family}`, `LENGTH: ${b.length} seconds (${SCENES_FOR[b.length] || '9–11'} scenes)`, `Language: ${va.LANGS[b.lang] || 'British English'}`,
    `Humour vs tension: ${b.humour}/100 funny (0 = tense and serious, 100 = laugh-out-loud).`,
    `Brand presence: ${b.brandPush}/100 (0 = barely there until the reveal, 100 = product at the centre of the plot). Keep it feeling like a film either way.`,
    b.castNotes && `Characters wanted: ${b.castNotes}`,
    b.refStyle && `STYLE TO BORROW from a reference video — copy ONLY its techniques (storytelling structure, pacing, character interaction, camera angles, editing). NEVER copy its plot, dialogue, characters or brands:\n${b.refStyle}`,
    b.notes && `Notes from the team:\n${b.notes}`,
  ].filter(Boolean).join('\n');
}
function conceptText(c) {
  if (!c) return '';
  return `CHOSEN STORY: "${c.title}" (${c.genre}) — ${c.logline}${c.characters ? `\nCharacters: ${c.characters}` : ''}${c.beats && c.beats.length ? `\nBeats: ${c.beats.join(' | ')}` : ''}${c.productMoment ? `\nProduct moment: ${c.productMoment}` : ''}`;
}

// 1 · three original pitches
async function concepts(brief) {
  const b = va.cleanBrief(Object.assign({}, brief, { mode: 'drama' }));
  if (b.forWho === 'business' && !b.business && !b.about) throw new HttpError(400, 'too_short', 'Pick a business or describe it first.');
  const j = await write(ROLE, `${dramaBrief(b)}

Pitch THREE clearly different, original mini-drama stories for this brand (different situations, characters and twists; at least one should be in the chosen genre, the others can surprise).
Return: {"concepts": [{"title": catchy film title, "genre": short genre label, "logline": 1–2 sentences, "cast": [{"name": Nigerian/UK name, "age": number, "personality": a few words}], "beats": {"hook": opening moment, "conflict": the problem, "twist": the turn, "resolution": how it ends, "reveal": the brand reveal moment}, "productMoment": how the product enters the story naturally, "why": why viewers will watch to the end}]}`, 1700, 0.95);
  const list = (Array.isArray(j.concepts) ? j.concepts : []).slice(0, 3).map(c => {
    c = c && typeof c === 'object' ? c : {}; const be = c.beats && typeof c.beats === 'object' ? c.beats : {};
    const cast = (Array.isArray(c.cast) ? c.cast : []).slice(0, 4).map(x => x && x.name ? `${str(x.name, 30)}${x.age ? ` (${Number(x.age) || ''})` : ''}${x.personality ? ` — ${str(x.personality, 80)}` : ''}` : '').filter(Boolean);
    return {
      title: str(c.title, 120), genre: str(c.genre, 80), logline: str(c.logline, 400), characters: cast.join('; ').slice(0, 300),
      beats: [['Hook', be.hook], ['Conflict', be.conflict], ['Twist', be.twist], ['Resolution', be.resolution], ['Reveal', be.reveal]].filter(x => x[1]).map(x => `${x[0]}: ${str(x[1], 180)}`),
      productMoment: str(c.productMoment, 300), why: str(c.why, 300),
    };
  }).filter(c => c.title);
  if (!list.length) throw new HttpError(502, 'ai_error', 'The writer couldn’t pitch stories just now — please try again.');
  return list;
}

// 2 · outline: cast, look and the scene list (short fields only, so it’s quick)
async function outline(brief) {
  const b = va.cleanBrief(Object.assign({}, brief, { mode: 'drama' }));
  const j = await write(ROLE, `${dramaBrief(b)}
${conceptText(b.concept)}

Write the OUTLINE of the film: ${SCENES_FOR[b.length] || '9–11'} scenes whose seconds add up to about ${b.length}. Every scene has a beat: ${BEATS.join(', ')} (in that order overall; several scenes can share a beat; the LAST scene is the "reveal": the product in a beautiful hero moment that pays off the story).
Return: {"title": film title,
 "logline": 1–2 sentences,
 "cast": [{"name", "role" (their part in the story), "personality": how they act and talk, "description": detailed consistent look (age, skin tone, hair, face, build, outfit), "sheetPrompt": text-to-image prompt for a full-body reference photo of this person (single person, plain light-grey studio background, photorealistic), "gender": "female" or "male", "voiceHint": voice style}],
 "lookbook": {"setting": main locations, "wardrobe": string, "palette": string, "lighting": string, "style": e.g. "cinematic, photorealistic, shallow depth of field, film grain", "negative": negative prompt},
 "reveal": {"tagline": a short memorable brand line for the final title card (max 8 words)},
 "music": {"mood": music style that fits the story, "bpm": e.g. "90–100"},
 "scenes": [{"heading": e.g. "INT. MUM'S KITCHEN – NIGHT", "beat", "title": 2–4 words, "summary": what happens (max 25 words), "seconds": 3–7, "cast": [names in the scene], "product": boolean, "shot": e.g. "close-up", "camera": camera move}]}`, 2300, 0.8);
  const plan = va.cleanPlan({ title: j.title, cast: j.cast, lookbook: j.lookbook, reveal: j.reveal, music: j.music, scenes: (Array.isArray(j.scenes) ? j.scenes : []).map(s => Object.assign({}, s, { visual: s && s.summary })) });
  if (plan.scenes.length < 3) throw new HttpError(502, 'ai_error', 'The writer couldn’t outline that story just now — please try again.');
  plan.concept = b.concept ? { title: b.concept.title, genre: b.concept.genre, logline: str(j.logline, 400) || b.concept.logline, beats: b.concept.beats, productMoment: b.concept.productMoment } : { title: plan.title, genre: GENRES[b.genre], logline: str(j.logline, 400), beats: [], productMoment: '' };
  plan.strategy.cta = b.contact ? `Find ${b.business || 'us'}: ${b.contact}` : '';
  plan.post.endCard = plan.reveal.tagline;
  plan.lookbook.character = plan.cast.map(c => `${c.name}: ${c.description}`).join('\n').slice(0, 700);
  return { brief: b, plan };
}

function compact(plan) {
  return plan.scenes.map(s => ({ n: s.n, heading: s.heading, beat: s.beat, seconds: s.seconds, cast: s.cast, product: s.product, what: s.visual, shot: s.shot, camera: s.camera, lines: s.lines.map(l => `${l.who}${l.emotion ? ` (${l.emotion})` : ''}: ${l.text}`) }));
}
const SCENE_FIELDS = `{"n", "heading", "beat", "title", "visual": what we SEE happening — 1–3 vivid sentences (action, expressions, the product if shown), "lines": [{"who": cast name, "emotion": e.g. "whispering, panicked", "text": what they say}] — max 3 lines, natural back-and-forth that replies to what came before, about 2.5 words per second so it fits the scene (some scenes can be silent), "onScreen": "" (or a tiny title/time card like "3 HOURS LATER"), "sfx": one sound effect or "", "transition": e.g. "hard cut", "match cut", "whip pan", "shot", "camera": camera move (vary them), "cast": [names], "product": boolean, "lipSync": true ONLY if exactly one character speaks one line facing the camera (2–8 seconds)}`;
function mergeScenes(plan, got) {
  (Array.isArray(got) ? got : []).forEach((g, k) => {
    if (!g || typeof g !== 'object') return;
    const n = Number(g.n), i = plan.scenes.findIndex(s => s.n === n); if (i < 0) return;
    const cur = plan.scenes[i], c = va.cleanScene(Object.assign({}, cur, g, { seconds: g.seconds || cur.seconds, heading: g.heading || cur.heading, beat: g.beat || cur.beat, title: g.title || cur.title, cast: Array.isArray(g.cast) ? g.cast : cur.cast }), i);
    c.vo = c.lines.map(l => l.text).join(' ').slice(0, 400);
    if (c.lipSync && !(c.lines.length === 1 && plan.cast.some(x => x.name === c.lines[0].who))) c.lipSync = false;
    c.imagePrompt = cur.imagePrompt; c.videoPrompt = cur.videoPrompt; c.model = cur.model; c.clipSeconds = cur.clipSeconds;
    plan.scenes[i] = c;
  });
  return plan;
}

// 3 · the screenplay, a few scenes per call
async function scenes(brief, rawPlan, from, to) {
  const b = va.cleanBrief(Object.assign({}, brief, { mode: 'drama' })), plan = va.cleanPlan(rawPlan);
  const want = plan.scenes.slice(from, to); if (!want.length) return { scenes: [] };
  const before = plan.scenes.slice(Math.max(0, from - 2), from).filter(s => s.lines.length);
  const j = await write(ROLE, `${dramaBrief(b)}
${conceptText(plan.concept)}

CAST: ${JSON.stringify(plan.cast.map(c => ({ name: c.name, role: c.role, personality: c.personality })))}
FULL OUTLINE: ${JSON.stringify(plan.scenes.map(s => ({ n: s.n, heading: s.heading, beat: s.beat, seconds: s.seconds, summary: s.visual, cast: s.cast })))}
${before.length ? `THE SCENES JUST BEFORE (continue naturally from them): ${JSON.stringify(compact({ scenes: before }))}` : 'These are the opening scenes — grab attention in the first 2 seconds.'}

Write the full screenplay for scenes ${want.map(s => s.n).join(', ')} only. Keep each character's personality and voice consistent; they must respond to each other.
Return: {"scenes": [${SCENE_FIELDS}]}`, 1500, 0.8);
  mergeScenes(plan, j.scenes);
  return { scenes: plan.scenes.slice(from, to) };
}

// 4 · story check: AI review + simple rules
function ruleIssues(plan) {
  const out = [], sc = plan.scenes;
  for (let i = 1; i < sc.length; i++) if (sc[i].camera && sc[i - 1].camera && sc[i].camera.toLowerCase().trim() === sc[i - 1].camera.toLowerCase().trim()) out.push({ n: sc[i].n, problem: `Same camera move as the scene before (“${sc[i].camera}”).`, fix: 'Use a different shot or camera move.' });
  const prod = sc.filter(s => s.product).length; if (sc.length && prod / sc.length > 0.45) out.push({ n: 0, problem: `The product is in ${prod} of ${sc.length} scenes — it may feel like an advert.`, fix: 'Keep the product to the key story moments and the reveal.' });
  if (sc.length && sc[sc.length - 1].beat !== 'reveal') out.push({ n: sc[sc.length - 1].n, problem: 'The film doesn’t end on the brand reveal.', fix: 'Make the last scene the product hero moment.' });
  const names = plan.cast.map(c => c.name);
  sc.forEach(s => {
    s.lines.forEach(l => { if (!/^narrator$/i.test(l.who) && names.length && !names.includes(l.who)) out.push({ n: s.n, problem: `“${l.who}” speaks but isn’t in the cast.`, fix: 'Give the line to a cast member.' }); });
    const words = s.lines.reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0);
    if (words > s.seconds * 3.2 + 1) out.push({ n: s.n, problem: `Too much dialogue for ${s.seconds} seconds (${words} words).`, fix: 'Shorten the lines or make the scene longer.' });
  });
  return out;
}
async function check(brief, rawPlan) {
  const b = va.cleanBrief(Object.assign({}, brief, { mode: 'drama' })), plan = va.cleanPlan(rawPlan);
  const j = await write(`You are a demanding script editor for vertical mini-dramas that promote UK-Nigerian businesses. Judge it as a SHORT FILM. Reply with ONE JSON object only.`, `${dramaBrief(b)}

SCREENPLAY: ${JSON.stringify({ title: plan.title, cast: plan.cast.map(c => ({ name: c.name, personality: c.personality })), scenes: compact(plan) })}

Check: a strong opening hook; connected scenes with clear cause and effect (beginning, middle, end); a clear conflict; humour, suspense or a twist that lands; characters with distinct voices who really respond to each other (no random or repeated lines); the product appears naturally (not too often, no hard sell); a satisfying ending and a short brand reveal; dialogue that fits the scene length; varied camera moves; nothing culturally off or cringe.
Return: {"score": 1–10, "issues": [{"n": scene number (0 for the whole film), "problem": short, "fix": a concrete fix}]} — only real problems, max 8, empty list if it's great.`, 900, 0.3);
  const ai = (Array.isArray(j.issues) ? j.issues : []).slice(0, 8);
  const issues = va.cleanPlan({ storyCheck: { score: j.score, issues: ai.concat(ruleIssues(plan)) } }).storyCheck;
  issues.at = core.nowIso();
  return issues;
}

// 5 · fix flagged scenes (≤ 3 per call) or rewrite one scene with an instruction
async function fix(brief, rawPlan, nums, how) {
  const b = va.cleanBrief(Object.assign({}, brief, { mode: 'drama' })), plan = va.cleanPlan(rawPlan);
  const set = (Array.isArray(nums) ? nums : []).map(Number).filter(n => plan.scenes.some(s => s.n === n)).slice(0, 3);
  if (!set.length) return { scenes: [] };
  const issues = (plan.storyCheck && plan.storyCheck.issues || []).filter(x => set.includes(x.n) || x.n === 0);
  const j = await write(ROLE, `${dramaBrief(b)}
${conceptText(plan.concept)}

CAST: ${JSON.stringify(plan.cast.map(c => ({ name: c.name, role: c.role, personality: c.personality })))}
WHOLE SCREENPLAY: ${JSON.stringify(compact(plan))}
${how ? `INSTRUCTION FROM THE TEAM: ${String(how).slice(0, 400)}` : `PROBLEMS TO FIX: ${JSON.stringify(issues)}`}

Rewrite scenes ${set.join(', ')} only, so they fit perfectly with the scenes around them (same characters, continuity, story beats). Keep each scene's number.
Return: {"scenes": [${SCENE_FIELDS}]}`, 1300, 0.75);
  mergeScenes(plan, j.scenes);
  return { scenes: plan.scenes.filter(s => set.includes(s.n)) };
}

// 📋 The team's own ready script → the same outline + screenplay shape, keeping their story and words
const KEEP = `The team has ALREADY WRITTEN this story. Respect it: keep the plot, the order of events, the characters and every line of dialogue EXACTLY as written (fix only obvious typos). Do not add jokes, lines or plot. You only structure it for production and fill in what the script doesn't say (looks, camera, sound, timings).`;
function scriptBlock(b) { return `THE SCRIPT:\n<<<\n${b.script}\n>>>`; }
async function importOutline(brief) {
  const b = va.cleanBrief(Object.assign({}, brief, { mode: 'drama' }));
  if (String(b.script || '').trim().length < 40) throw new HttpError(400, 'too_short', 'Paste the script first (a few lines at least).');
  const j = await write(ROLE + '\n' + KEEP, `${dramaBrief(b)}

${scriptBlock(b)}

Break the script into scenes in story order (3–7 seconds each — split long moments into several shots; seconds must fit the dialogue at about 2.5 words per second). Give every scene a beat: ${BEATS.join(', ')}. If the script has no ending with the product, still mark the scene that best shows the product as "reveal" — do not invent new story.
Return: {"title": the script's title (or a short one), "logline": 1–2 sentences,
 "cast": [{"name": as in the script, "role", "personality": from how they talk and act, "description": detailed consistent look (age, skin tone, hair, face, build, outfit) — from the script, else a fitting choice, "sheetPrompt": text-to-image prompt for a full-body reference photo (single person, plain light-grey studio background, photorealistic), "gender": "female" or "male", "voiceHint": voice style}],
 "lookbook": {"setting", "wardrobe", "palette", "lighting", "style", "negative"},
 "reveal": {"tagline": short brand line for the final title card (from the script if it has one, max 8 words)},
 "music": {"mood", "bpm"},
 "scenes": [{"heading": e.g. "INT. KITCHEN – NIGHT", "beat", "title": 2–4 words, "summary": what happens (max 25 words), "seconds", "cast": [names], "product": boolean, "shot", "camera"}]}`, 2600, 0.3);
  const plan = va.cleanPlan({ title: j.title, cast: j.cast, lookbook: j.lookbook, reveal: j.reveal, music: j.music, scenes: (Array.isArray(j.scenes) ? j.scenes : []).map(x => Object.assign({}, x, { visual: x && x.summary })) });
  if (plan.scenes.length < 2) throw new HttpError(502, 'ai_error', 'Couldn’t break that script into scenes — check it pasted fully and try again.');
  plan.concept = { title: plan.title, genre: GENRES[b.genre], logline: str(j.logline, 400), beats: [], productMoment: '' };
  plan.post.endCard = plan.reveal.tagline;
  plan.lookbook.character = plan.cast.map(c => `${c.name}: ${c.description}`).join('\n').slice(0, 700);
  return { brief: b, plan };
}
async function importScenes(brief, rawPlan, from, to) {
  const b = va.cleanBrief(Object.assign({}, brief, { mode: 'drama' })), plan = va.cleanPlan(rawPlan);
  const want = plan.scenes.slice(from, to); if (!want.length) return { scenes: [] };
  const j = await write(ROLE + '\n' + KEEP, `${scriptBlock(b)}

CAST: ${JSON.stringify(plan.cast.map(c => ({ name: c.name, personality: c.personality })))}
SCENE LIST: ${JSON.stringify(plan.scenes.map(s => ({ n: s.n, heading: s.heading, beat: s.beat, seconds: s.seconds, summary: s.visual, cast: s.cast })))}

For scenes ${want.map(s => s.n).join(', ')} only: copy the dialogue that belongs to each scene WORD FOR WORD from the script (split long speeches across the scenes they cover), add the emotion from the script's directions (or a fitting one), and describe what we see.
Return: {"scenes": [${SCENE_FIELDS}]}`, 1500, 0.2);
  mergeScenes(plan, j.scenes);
  return { scenes: plan.scenes.slice(from, to) };
}

module.exports = { concepts, outline, scenes, check, fix, ruleIssues, importOutline, importScenes };

