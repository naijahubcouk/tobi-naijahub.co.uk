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
Reply with ONE JSON object only — no markdown, no commentary. Keep every text value concise.`;

async function writerModel() { try { return (await require('./videoai').settings()).dramaModel; } catch (_) { return require('./videoai').DRAMA_MODEL; } }
// Claude sometimes wraps the JSON in words, leaves a quote unescaped or runs out of room — repair it.
function parseJson(text) { return require('./jsonfix').parseLoose(text); }
async function write(system, user, maxTokens, temperature) {
  const settings = await core.getSettings();
  const model = await writerModel();
  const sys = system + '\nReply with valid JSON only: no markdown, no notes. Inside text values never use the " character — use ‘single quotes’ or “curly quotes” for speech.';
  let last = null, partial = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await gen.callModel([{ role: 'system', content: sys + (attempt ? '\nYOUR LAST REPLY WAS NOT VALID JSON. Keep every text short and reply with ONE valid JSON object.' : '') }, { role: 'user', content: user }], Math.round(maxTokens * (attempt ? 1.4 : 1)), Object.assign({}, settings, { model }), { raw: true, temperature: temperature == null ? 0.8 : temperature, timeoutMs: 55000, detail: true });
    gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
    const j = parseJson(out.text);
    if (j && (out.finish !== 'length' || attempt)) return j;
    if (j) { partial = j; last = out; continue; } // cut short — once more with more room
    last = out;
    console.error('[minidrama] unreadable reply', model, out.finish, out.outTok, JSON.stringify(String(out.text).slice(0, 300)), '…', JSON.stringify(String(out.text).slice(-200)));
  }
  if (partial) return partial;
  throw new HttpError(502, 'ai_error', last && last.finish === 'length' ? 'The story was too long for one reply — try a shorter length, or switch the writer in ⚙️ Video AI settings.' : 'The writer’s reply came back garbled twice — please try again (or switch the writer in ⚙️ Video AI settings).');
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
Return: {"concepts": [{"title": catchy film title, "genre": short genre label, "logline": 1–2 sentences, "cast": [{"name": Nigerian/UK name, "age": number, "personality": a few words}], "beats": {"hook": opening moment, "conflict": the problem, "twist": the turn, "resolution": how it ends, "reveal": the brand reveal moment}, "productMoment": how the product enters the story naturally, "why": why viewers will watch to the end}]}`, 2400, 0.95);
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
 "cast": [{"name", "role" (their part in the story), "personality": how they act and talk, "description": detailed consistent look (age, skin tone, hair, face, build), "outfit": the ONE outfit they wear all through (unless the story changes it), "sheetPrompt": text-to-image prompt for a full-body reference photo of this person (single person, plain light-grey studio background, photorealistic), "gender": "female" or "male", "voiceHint": voice style}],
 "lookbook": {"setting": main locations, "wardrobe": string, "palette": string, "lighting": string, "style": e.g. "cinematic, photorealistic, shallow depth of field, film grain", "negative": negative prompt},
 "locations": [{"name": short place name e.g. "Living room", "description": detailed fixed look so every shot matches (layout, wall colour, flooring, furniture, key props, windows, light), "sheetPrompt": text-to-image prompt for an EMPTY wide establishing shot of this set (no people, eye level, photorealistic)}],
 "reveal": {"tagline": a short memorable brand line for the final title card (max 8 words)},
 "music": {"mood": music style that fits the story, "bpm": e.g. "90–100"},
 "scenes": [{"heading": e.g. "INT. MUM'S KITCHEN – NIGHT", "beat", "title": 2–4 words, "summary": what happens (max 25 words), "seconds": 3–7, "cast": [names in the scene], "location": one of the location names, "product": boolean, "shot": e.g. "close-up", "camera": camera move}]}
LOCATIONS: as few places as the story needs (1–4), reused — every scene in the same place must look identical.`, 3000, 0.8);
  const plan = va.cleanPlan({ title: j.title, cast: j.cast, locations: j.locations, lookbook: j.lookbook, reveal: j.reveal, music: j.music, scenes: (Array.isArray(j.scenes) ? j.scenes : []).map(s => Object.assign({}, s, { visual: s && s.summary })) });
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
Return: {"scenes": [${SCENE_FIELDS}]}`, 2000, 0.8);
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
Return: {"score": 1–10, "issues": [{"n": scene number (0 for the whole film), "problem": short, "fix": a concrete fix}]} — only real problems, max 8, empty list if it's great.`, 1200, 0.3);
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
Return: {"scenes": [${SCENE_FIELDS}]}`, 1800, 0.75);
  mergeScenes(plan, j.scenes);
  return { scenes: plan.scenes.filter(s => set.includes(s.n)) };
}

// 📋 The team's own ready script. The script is split into numbered pieces HERE (not by AI): every action line,
// every spoken line and the final text card. AI only groups the pieces into scenes (in order, none skipped) and adds
// looks, camera and timings — the dialogue in each scene is copied from the script word for word by this code.
const KEEP = `The team has ALREADY WRITTEN this story. Respect it completely: same plot, same order, same characters, same words. Do not add, remove, merge-away or reorder story moments; do not invent dialogue. You only plan the production.`;
const META = /^(business|brand|product|products|genre|duration|length|characters?|cast|locations?|setting|settings|title|music|style|tone|platform|cta|call to action|audience|goal|format|note|notes)$/i;
const SPEECH = /^\s*(?:[-*•]\s*)?([A-Za-zÀ-ÿ][\wÀ-ÿ .'’\-]{0,34}?)\s*(\([^)]{1,40}\))?\s*:\s*(.+)$/;
function unquote(t) { return String(t).trim().replace(/^[“"‘']+|[”"’']+$/g, '').trim(); }
function splitScript(text) {
  const units = [], meta = [], card = []; let inCard = false;
  String(text || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean).forEach((line, idx) => {
    const clean = line.replace(/^[-*•]\s*/, '');
    if (/^the storyline\b|^storyline\b|^story\b:?$|^script\b:?$/i.test(clean)) return;
    const m = SPEECH.exec(clean), key = m ? m[1].trim() : '';
    if (/^final (text|card|title|caption)s?$/i.test(key) || /^(end card|end text|final text|closing text)\s*:?\s*$/i.test(clean)) { inCard = true; if (m && m[3].trim()) card.push(unquote(m[3])); return; }
    if (inCard) { card.push(unquote(clean)); return; }
    if (m && META.test(key)) { meta.push(clean); return; }
    if (!units.length && idx === 0 && !m && clean.length < 90 && /—|–|-|“|"/.test(clean) && !/[.!?]$/.test(clean)) { meta.push('Title: ' + clean); return; }
    if (/^(INT|EXT|INT\/EXT)[.\s]/i.test(clean)) { units.push({ type: 'heading', text: clean }); return; }
    if (m && !/^(final scene|scene \d+|scene|shot \d+|cut to|fade (in|out))$/i.test(key) && key.split(/\s+/).length <= 4 && !/[.!?]$/.test(key)) {
      units.push({ type: 'line', who: key, emotion: m[2] ? m[2].replace(/[()]/g, '').trim() : '', text: unquote(m[3]) }); return;
    }
    units.push({ type: 'action', text: m && /^final scene$/i.test(key) ? 'FINAL SCENE: ' + m[3].trim() : clean });
  });
  units.forEach((u, i) => { u.id = i + 1; });
  return { units, meta, card };
}
function scriptBlock(b) { return `THE SCRIPT:\n<<<\n${b.script}\n>>>`; }
function wordsOf(t) { return String(t || '').split(/\s+/).filter(Boolean).length; }
async function importOutline(brief) {
  const b = va.cleanBrief(Object.assign({}, brief, { mode: 'drama' }));
  if (String(b.script || '').trim().length < 40) throw new HttpError(400, 'too_short', 'Paste the script first (a few lines at least).');
  const sp = splitScript(b.script);
  if (sp.units.length < 2) throw new HttpError(400, 'too_short', 'Couldn’t find the story in that script — paste the scenes and dialogue too.');
  const speakers = [...new Set(sp.units.filter(u => u.type === 'line').map(u => u.who))];
  const list = sp.units.map(u => `${u.id}. ${u.type === 'line' ? `${u.who}${u.emotion ? ` (${u.emotion})` : ''}: ${u.text}` : u.type === 'heading' ? `[HEADING] ${u.text}` : `[ACTION] ${u.text}`}`).join('\n');
  const j = await write(ROLE + '\n' + KEEP, `${dramaBrief(Object.assign({}, b, { notes: [b.notes, sp.meta.join('\n')].filter(Boolean).join('\n') }))}

THE SCRIPT, split into ${sp.units.length} numbered pieces in story order:
${list}
${sp.card.length ? `\nFINAL TEXT CARD (shown at the very end, not a scene): ${sp.card.join(' / ')}` : ''}

Plan the shots. Group the pieces into scenes IN ORDER: every piece from 1 to ${sp.units.length} must be in exactly one scene, no gaps, no reordering. A scene is one shot of 3–7 seconds: usually 1–2 pieces (a spoken line and the reaction/action next to it); never more than 2 spoken lines in a scene. Each action piece becomes something we SEE.
The speakers are: ${speakers.join(', ') || '(no dialogue)'} — keep these exact names for the cast. Add any non-speaking characters the script mentions.
Return: {"title": the script's title, "logline": 1 sentence,
 "cast": [{"name": exact speaker name from the script, "role", "personality", "description": detailed consistent look (age, skin tone, hair, face, build), "outfit": the ONE outfit they wear all through (unless the story changes it) — from the script, else a fitting choice, "sheetPrompt": text-to-image prompt for a full-body reference photo (single person, plain light-grey studio background, photorealistic), "gender": "female" or "male", "voiceHint": voice style}],
 "lookbook": {"setting", "wardrobe", "palette", "lighting", "style", "negative"},
 "locations": [{"name": short place name e.g. "Living room", "description": detailed fixed look so every shot matches (layout, wall colour, flooring, furniture, key props, windows, light), "sheetPrompt": text-to-image prompt for an EMPTY wide establishing shot of this set (no people, eye level, photorealistic)}] — the places in the script (e.g. living room, kitchen), reused across scenes,
 "music": {"mood", "bpm"},
 "scenes": [{"from": first piece number, "location": one of the location names, "to": last piece number, "heading": e.g. "INT. KITCHEN – DAY", "beat": one of ${BEATS.join('/')}, "title": 2–4 words, "visual": what we SEE — 1–2 sentences that show exactly these pieces, "emotions": {"piece number": emotion for each spoken line}, "cast": [names in shot], "product": true if the cookware/product is visible, "shot", "camera" (vary them), "sfx": one sound or ""}]}`, 3600, 0.3);
  // rebuild the scenes from the pieces — the AI only chose the grouping
  const got = (Array.isArray(j.scenes) ? j.scenes : []).map(s => s && typeof s === 'object' ? s : null).filter(Boolean);
  const owner = new Array(sp.units.length + 1).fill(-1);
  got.forEach((s, k) => { const a = Math.max(1, Number(s.from) || 0), z = Math.min(sp.units.length, Number(s.to) || a); for (let i = a; i <= z; i++) if (owner[i] < 0) owner[i] = k; });
  const groups = []; let cur = null;
  for (let i = 1; i <= sp.units.length; i++) {
    const k = owner[i];
    if (!cur || k !== cur.k) { cur = { k, ids: [], lines: 0 }; groups.push(cur); }
    cur.ids.push(i); if (sp.units[i - 1].type === 'line') cur.lines++;
  }
  // a scene never holds more than 2 spoken lines — split if the AI grouped too much
  const final = [];
  groups.forEach(g => { let part = { k: g.k, ids: [], lines: 0 }; g.ids.forEach(id => { const u = sp.units[id - 1]; if ((u.type === 'line' && part.lines >= 2) || part.ids.length >= 3) { final.push(part); part = { k: g.k, ids: [], lines: 0, cont: true }; } part.ids.push(id); if (u.type === 'line') part.lines++; }); final.push(part); });
  const castNames = (Array.isArray(j.cast) ? j.cast : []).map(c => c && c.name).filter(Boolean);
  const nameFor = who => castNames.find(n => n.toLowerCase() === String(who).toLowerCase()) || who;
  let lastHeading = '', lastLoc = '';
  const scenesOut = final.map((g, idx) => {
    const prev = final[idx - 1], s = g.k >= 0 ? got[g.k] : { heading: lastHeading, beat: prev && prev.k >= 0 ? got[prev.k].beat : '', cast: [] }, us = g.ids.map(id => sp.units[id - 1]), emo = s.emotions && typeof s.emotions === 'object' ? s.emotions : {};
    const head = us.find(u => u.type === 'heading'); if (head) lastHeading = head.text;
    const lines = us.filter(u => u.type === 'line').map(u => ({ who: nameFor(u.who), emotion: u.emotion || str(emo[u.id] || emo[String(u.id)] || '', 40), text: u.text }));
    const acts = us.filter(u => u.type === 'action').map(u => u.text).join(' ');
    const words = lines.reduce((n, l) => n + wordsOf(l.text), 0);
    const nActs = us.filter(u => u.type === 'action').length;
    const secs = Math.max(3, Math.min(8, Math.round(words / 2.5 + 1.5 * nActs + (lines.length ? 1 : 0))));
    const castIn = [...new Set((Array.isArray(s.cast) ? s.cast : []).map(nameFor).concat(lines.map(l => l.who)))];
    if (s.location) lastLoc = s.location;
    return { location: s.location || lastLoc, heading: str(s.heading, 100) || (head ? head.text : lastHeading), beat: s.beat, title: g.cont ? (str(s.title, 60) || 'Scene') + ' (cont.)' : (s.title || `Scene ${idx + 1}`),
      visual: acts ? (acts + (!g.cont && s.visual ? ` — ${s.visual}` : '')) : (!g.cont && s.visual ? s.visual : `${lines.map(l => l.who).join(' and ')} talking.`),
      seconds: secs, cast: castIn, product: !!s.product, shot: s.shot, camera: s.camera, sfx: s.sfx || '', transition: 'cut', lines, lipSync: lines.length === 1 && words >= 3 && words <= 20, script: us.map(u => u.id) };
  });
  const plan = va.cleanPlan({ title: j.title || (sp.meta.find(m => /^Title:/.test(m)) || '').replace(/^Title:\s*/, ''), cast: j.cast, locations: j.locations, lookbook: j.lookbook, music: j.music, scenes: scenesOut });
  plan.scenes.forEach((sc, i) => { sc.vo = sc.lines.map(l => l.text).join(' ').slice(0, 400); if (!sc.beat) sc.beat = i === plan.scenes.length - 1 ? 'reveal' : ''; });
  if (plan.scenes.length < 2) throw new HttpError(502, 'ai_error', 'Couldn’t break that script into scenes — check it pasted fully and try again.');
  plan.reveal = { tagline: str(sp.card[0] || '', 120), sub: str(sp.card.slice(1).join(' · '), 160) };
  plan.concept = { title: plan.title, genre: GENRES[b.genre], logline: str(j.logline, 400), beats: [], productMoment: '' };
  plan.post.endCard = plan.reveal.tagline;
  plan.lookbook.character = plan.cast.map(c => `${c.name}: ${c.description}`).join('\n').slice(0, 700);
  return { brief: b, plan, complete: true, pieces: sp.units.length };
}
// kept for older pages that still call it: the scenes are already complete
async function importScenes(brief, rawPlan, from, to) { const plan = va.cleanPlan(rawPlan); return { scenes: plan.scenes.slice(from, to) }; }

module.exports = { concepts, outline, scenes, check, fix, ruleIssues, importOutline, importScenes, splitScript };
