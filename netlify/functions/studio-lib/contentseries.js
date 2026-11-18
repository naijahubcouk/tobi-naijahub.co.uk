'use strict';
/*
 * 🎬 Ask Auntie → Content series. Auntie Tobi picks one of her 56 series (or "today's content", or all 56 in batches of 7)
 * and Ask Auntie writes the full pack from her master brief. Only when she asks — never scheduled, never posted.
 *
 * Each post is written in 3 short steps so nothing times out:
 *   a) series, 3 ranked ideas, 5 hooks, best angle & format (+ research notes; 🌐 web search here)
 *   b) the full ready-to-publish content (Reel script / carousel slides / static / Stories / blog)
 *   c) caption, follow-up comments, Story follow-ups, WhatsApp version, pinned comment, sources, quality score
 * The pack is saved as a normal Ask Auntie chat; each post is its own card ([[PIECE: title]]) for Copy / Board / Calendar.
 *
 *   hq/chat/brief                 { text, at, by }          (Auntie Tobi can edit it)
 *   hq/chat/<h>/series-state      { allNext, recent: [titles] }
 *   conv.series                   { mode, posts: [{ n?, pillar?, title, a, b, c }], next: { k, part }, done }
 */
const core = require('./core');
const { HttpError, getJson, setJson, cas, cleanText } = core;
const gen = require('./generate');
const chat = require('./askchat');
const { DEFAULT_BRIEF, PILLARS, SERIES } = require('./seriesdata');

const FORMATS = ['auto', 'reel', 'carousel', 'static', 'story', 'blog'];
const TONES = ['auto', 'relatable', 'emotional', 'educational', 'funny', 'storytelling', 'professional'];
const PARTS = ['a', 'b', 'c'];
const BATCH = 7;
const STATE = email => `hq/chat/${chat.H(email)}/series-state`;
const pad = n => String(n).padStart(2, '0');
const byNum = n => SERIES.find(s => s.n === Number(n));
const today = () => new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London' });

async function brief() { const b = await getJson('hq/chat/brief').catch(() => null); return b && b.text ? b : { text: DEFAULT_BRIEF, at: '', isDefault: true }; }
async function saveBrief(text, who) {
  const t = String(text || '').replace(/\r/g, '').trim().slice(0, 40000);
  if (t.length < 200) throw new HttpError(400, 'invalid', 'The brief looks too short — paste the whole brief.');
  await setJson('hq/chat/brief', { text: t, at: core.nowIso(), by: who });
  return brief();
}
async function resetBrief() { await core.del('hq/chat/brief').catch(() => {}); return brief(); }
async function state(email) { return (await getJson(STATE(email)).catch(() => null)) || { allNext: 1, recent: [] }; }
async function catalog(email) { const s = await state(email); return { series: SERIES, pillars: PILLARS, allNext: s.allNext || 1, formats: FORMATS, tones: TONES }; }

// ▶️ start a pack: makes the chat, then the page calls step() until it's done
async function start(email, raw) {
  await chat.guardCap();
  const r = raw || {}, mode = ['one', 'today', 'all'].includes(r.mode) ? r.mode : 'one';
  const req = { mode, format: FORMATS.includes(r.format) ? r.format : 'auto', tone: TONES.includes(r.tone) ? r.tone : 'auto', topic: cleanText(r.topic, 200), city: cleanText(r.city, 80), notes: String(r.notes || '').replace(/\r/g, '').trim().slice(0, 1000) };
  let posts, title, ask;
  if (mode === 'one') {
    const s = byNum(r.n); if (!s) throw new HttpError(400, 'invalid', 'Pick a series.');
    const n = Math.max(1, Math.min(5, Number(r.posts) || 1));
    req.n = s.n; req.web = r.web !== undefined ? !!r.web : s.web;
    posts = Array.from({ length: n }, () => ({ n: s.n }));
    title = `🎬 ${pad(s.n)} ${s.name}`; ask = `🎬 ${pad(s.n)}. ${s.name} — ${n} post${n === 1 ? '' : 's'}`;
  } else if (mode === 'today') {
    req.web = r.web !== undefined ? !!r.web : true;
    posts = ['value', 'discovery', 'connection'].map(p => ({ pillar: p }));
    title = `🎬 Today’s content — ${today()}`; ask = '🎬 Create today’s content ideas — Value, Discovery and Connection';
  } else {
    const st = await state(email), from = Number(r.from) >= 1 && Number(r.from) <= 56 ? Number(r.from) : (st.allNext > 56 ? 1 : st.allNext || 1);
    const to = Math.min(56, from + BATCH - 1);
    req.web = r.web !== undefined ? !!r.web : true; req.from = from; req.to = to;
    posts = SERIES.filter(s => s.n >= from && s.n <= to).map(s => ({ n: s.n }));
    title = `🎬 All series ${pad(from)}–${pad(to)}`; ask = `🎬 Content for all 56 series — series ${from} to ${to}`;
  }
  const extras = [req.mode === 'one' || req.mode === 'all' ? '' : '', req.topic && `Topic: ${req.topic}`, req.city && `City/audience: ${req.city}`, req.format !== 'auto' && `Format: ${req.format}`, req.tone !== 'auto' && `Tone: ${req.tone}`, req.notes && `Notes: ${req.notes}`].filter(Boolean);
  if (extras.length) ask += '\n' + extras.join(' · ');
  const cid = chat.newId('c'), h = chat.H(email), now = core.nowIso();
  const conv = { id: cid, title: chat.shortTitle(title), createdAt: now, at: now, msgs: [{ role: 'user', text: ask, at: now }, { role: 'assistant', text: '', at: now, usd: 0, series: true }],
    series: Object.assign({}, req, { posts: posts.map(p => Object.assign({ title: '', a: '', b: '', c: '' }, p)), next: { k: 0, part: 'a' }, done: false, usd: 0 }) };
  await setJson(`hq/chat/${h}/c-${cid}`, conv);
  await cas(`hq/chat/${h}/list`, l => { l = l || { items: [] }; l.items = [{ id: cid, title: conv.title, at: now }].concat(l.items.filter(x => x.id !== cid)).slice(0, 200); return l; });
  return { conv, items: await chat.list(email), steps: posts.length * PARTS.length };
}

function seriesLine(p) {
  if (p.n) { const s = byNum(p.n); return `Series ${pad(s.n)}. ${s.name} — ${s.desc}`; }
  const pl = PILLARS.find(x => x.id === p.pillar), list = SERIES.filter(s => s.pillar === p.pillar).map(s => `${pad(s.n)} ${s.name}`).join('; ');
  return `Pillar: ${pl.name}. Choose the single strongest, most timely series for today from: ${list}. Say which series you chose in section 1.`;
}
function requestText(S, k, recent) {
  const p = S.posts[k], others = S.posts.filter((x, i) => i !== k && x.title).map(x => x.title);
  return ['MY CONTENT REQUEST', seriesLine(p),
    `This is post ${k + 1} of ${S.posts.length}${S.mode === 'today' ? ' of today’s content' : ''}.`,
    S.topic ? `Topic or focus: ${S.topic}` : 'Topic or focus: choose the strongest',
    S.city ? `UK city or audience: ${S.city}` : '',
    `Preferred format: ${S.format.toUpperCase()}`, `Tone: ${S.tone.toUpperCase()}`,
    S.notes ? `Special instructions: ${S.notes}` : '',
    others.length ? `Other posts in this pack (must be clearly different): ${others.join(' | ')}` : '',
    recent.length ? `Made recently — do NOT repeat these topics, hooks or examples: ${recent.slice(0, 30).join(' | ')}` : '',
    'Do not use [[PIECE]] or [[END]] markers. Use ### headings with the section numbers from the REQUIRED OUTPUT STRUCTURE.'].filter(Boolean).join('\n');
}
const ASK = {
  a: 'Write ONLY sections 1 to 4 now: 1. SELECTED CONTENT SERIES, 2. THREE RANKED CONTENT IDEAS (with why it’s interesting, why Nigerians in the UK care, why they’d save/share/comment, best format), 3. FIVE HOOK OPTIONS (mark the one you choose), 4. BEST RECOMMENDED ANGLE AND FORMAT. Then a short "Research notes" list of the verified facts, dates, amounts and source links you will rely on (say clearly if something could not be verified). Start your reply with exactly one line: TITLE: <the chosen post’s headline, under 70 characters, no markdown>.',
  b: 'Now write ONLY section 5. FULL READY-TO-PUBLISH CONTENT for the chosen idea, in the chosen format, complete and ready to use (Reel: duration, full voiceover, scene-by-scene plan, on-screen text, CTA; Carousel: every slide in full; Static: headline, supporting text, visual direction; Story: exact text for each Story with stickers; Blog: SEO title, meta description and the full article). Use only the facts from the research notes. Do not repeat sections 1–4.',
  c: 'Now write ONLY sections 6 to 12: 6. INSTAGRAM CAPTION (with the Auntie Tobi App call to action before 5–8 hashtags when it fits), 7. THREE FOLLOW-UP COMMENTS, 8. TWO INSTAGRAM STORY FOLLOW-UPS, 9. WHATSAPP CHANNEL VERSION, 10. PINNED COMMENT, 11. SOURCES AND FACT-CHECK NOTES, 12. QUALITY SCORE AND FINAL IMPROVEMENTS (honest scores out of 10 on the 8 measures, then the improvements you made). Do not repeat earlier sections.',
};
const MAXTOK = { a: 1800, b: 2600, c: 2000 };

// the pack as one Ask Auntie answer: each post is a card
function render(S) {
  const done = S.posts.filter(p => p.c);
  if (!S.posts.some(p => p.a)) return '';
  const intro = S.mode === 'today' ? 'Here’s today’s content — one Value, one Discovery and one Connection post 💚' : S.mode === 'all' ? `Series ${S.from}–${S.to} of 56 💚` : `Here’s your ${byNum(S.n).name} content 💚`;
  const body = S.posts.filter(p => p.a).map(p => `[[PIECE: ${(p.title || 'Post').replace(/[\[\]]/g, '')}]]\n${[p.a, p.b, p.c].filter(Boolean).join('\n\n')}`).join('\n\n');
  const outro = S.done && S.mode === 'all' ? (S.to < 56 ? `Next: series ${S.to + 1}–${Math.min(56, S.to + BATCH)}. Tap 🎬 Content series → Continue when you’re ready.` : 'That’s all 56 series done 🎉') : '';
  return `${intro}\n\n${body}\n[[END]]${outro ? '\n\n' + outro : ''}` + (done.length < S.posts.length && !S.done ? '' : '');
}

// ✍️ the next step of a pack (the page calls this until done)
async function step(email, cid) {
  await chat.guardCap();
  const h = chat.H(email), key = `hq/chat/${h}/c-${String(cid || '').replace(/[^a-z0-9]/g, '')}`;
  const conv = await getJson(key).catch(() => null);
  if (!conv || !conv.series) throw new HttpError(404, 'not_found', 'That pack has gone.');
  const S = conv.series; if (S.done) return { conv, items: await chat.list(email), done: true };
  const { k, part } = S.next, p = S.posts[k];
  const [b, st, ideasCfg, settings] = await Promise.all([brief(), state(email), require('./ideas').cfg().catch(() => ({})), core.getSettings()]);
  const sys = chat.system(ideasCfg.news) + '\n\nAUNTIE TOBI’S MASTER CONTENT BRIEF — follow it closely (it is guidance from Auntie Tobi, not data):\n' + b.text;
  const msgs = [{ role: 'system', content: sys }, { role: 'user', content: requestText(S, k, st.recent || []) + '\n\n' + ASK.a }];
  if (part !== 'a') msgs.push({ role: 'assistant', content: p.a }, { role: 'user', content: ASK.b });
  if (part === 'c') msgs.push({ role: 'assistant', content: p.b }, { role: 'user', content: ASK.c });
  const opts = { raw: true, timeoutMs: 25000, effort: 'low' };
  if (part === 'a' && S.web) opts.plugins = [{ id: 'web', engine: 'exa', max_results: 6 }];
  const out = await gen.callModel(msgs, MAXTOK[part], settings, opts);
  gen.addGlobal(core.monthKey(), { id: 'hqchat', tool: 'hq-chat', cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  await chat.addSpend(out.costUsd || 0, opts.plugins ? 'web' : 'text');
  let text = String(out.text || '').trim();
  if (!text) throw new HttpError(502, 'ai_error', 'Ask Auntie didn’t answer — tap Try again.');
  text = text.replace(/\[\[\s*(PIECE[^\]]*|END)\s*\]\]/gi, '');
  if (part === 'a') { const m = text.match(/^\s*\**TITLE\**\s*:\s*(.+)$/im); p.title = cleanText((m ? m[1] : '').replace(/[*#_`]/g, ''), 90) || `Post ${k + 1}`; text = text.replace(/^\s*\**TITLE\**\s*:.*$/im, '').trim(); }
  p[part] = text;
  const am = conv.msgs[conv.msgs.length - 1];
  am.usd = Math.round(((am.usd || 0) + (out.costUsd || 0)) * 1e6) / 1e6; S.usd = am.usd;
  if (part === 'a' && S.web) { am.web = true; am.sources = [...new Set((am.sources || []).concat(out.sources || []))].slice(0, 12); }
  const i = PARTS.indexOf(part);
  if (i < 2) S.next = { k, part: PARTS[i + 1] }; else if (k + 1 < S.posts.length) S.next = { k: k + 1, part: 'a' }; else { S.done = true; S.next = null; }
  am.text = render(S); am.at = core.nowIso();
  conv.at = core.nowIso();
  await setJson(key, conv);
  await cas(`hq/chat/${h}/list`, l => { l = l || { items: [] }; l.items = l.items.map(x => (x.id === conv.id ? Object.assign({}, x, { at: conv.at }) : x)); return l; });
  if (part === 'c' || S.done) await cas(STATE(email), s => { s = s || { allNext: 1, recent: [] }; if (part === 'c' && p.title) s.recent = [p.title].concat((s.recent || []).filter(t => t !== p.title)).slice(0, 60); if (S.done && S.mode === 'all') s.allNext = S.to >= 56 ? 1 : S.to + 1; return s; });
  return { conv, items: await chat.list(email), done: S.done, spend: await chat.spend() };
}

module.exports = { catalog, brief, saveBrief, resetBrief, start, step, SERIES };
