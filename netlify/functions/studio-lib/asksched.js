'use strict';
/*
 * ⏰ Ask Auntie → Scheduled: a prompt that runs by itself (daily / chosen weekdays / monthly, UK time).
 * Each run asks GPT-6 Luna (with 🌐 web search if on), saves the answer as a new Ask Auntie chat marked "new",
 * and can also put it on the Board as an idea or plan it on the Calendar for that day. Nothing is ever posted or emailed.
 *
 *   hq/chat/<h>/sched     { items: [schedule…] }         (each person's own)
 *   hq/chat/sched-index   { items: [{ email, id, next, paused }] }   (for the runner)
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, getJson, cas, cleanText } = core;
const chat = require('./askchat');

const H = email => core.sha256('hqchat:' + String(email || '').toLowerCase()).slice(0, 24);
const KEY = email => `hq/chat/${H(email)}/sched`;
const INDEX = 'hq/chat/sched-index';
const FREQ = ['daily', 'weekly', 'monthly'], DEST = ['chat', 'board', 'calendar'];
const DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// London clock helpers
function londonParts(ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}`, dow: DAYN.indexOf(p.weekday), dom: +p.day };
}
// a London date + "HH:MM" → the real moment (handles GMT/BST)
function londonToMs(day, hm) {
  const [y, m, d] = day.split('-').map(Number), [hh, mm] = hm.split(':').map(Number);
  let guess = Date.UTC(y, m - 1, d, hh, mm);
  for (let i = 0; i < 2; i++) { const p = londonParts(guess); const [gh, gm] = p.hm.split(':').map(Number); const diff = (gh * 60 + gm) - (hh * 60 + mm) + (p.day === day ? 0 : p.day > day ? 1440 : -1440); guess -= diff * 60000; }
  return guess;
}
const addDays = (s, n) => { const t = new Date(s + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
function nextRun(s, fromMs) {
  const from = fromMs || Date.now(), today = londonParts(from).day;
  for (let i = 0; i < 70; i++) {
    const day = addDays(today, i), t = new Date(day + 'T12:00:00Z'), dow = t.getUTCDay(), dom = t.getUTCDate();
    const ok = s.freq === 'daily' || (s.freq === 'weekly' && s.days.includes(dow)) || (s.freq === 'monthly' && dom === s.dom);
    if (!ok) continue;
    const at = londonToMs(day, s.time);
    if (at > from) return new Date(at).toISOString();
  }
  return '';
}

function clean(raw, prev) {
  const p = prev || {};
  const s = {
    id: p.id || 's' + crypto.randomBytes(6).toString('hex'),
    name: cleanText(raw.name, 60) || p.name || 'Scheduled prompt',
    prompt: String(raw.prompt || p.prompt || '').replace(/\r/g, '').trim().slice(0, 4000),
    freq: FREQ.includes(raw.freq) ? raw.freq : (p.freq || 'weekly'),
    days: (Array.isArray(raw.days) ? raw.days : p.days || [1]).map(Number).filter(n => n >= 0 && n <= 6),
    dom: Math.max(1, Math.min(28, Number(raw.dom) || p.dom || 1)),
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.time || '') ? raw.time : (p.time || '08:00'),
    web: raw.web !== undefined ? !!raw.web : p.web !== undefined ? p.web : true,
    dest: DEST.includes(raw.dest) ? raw.dest : (p.dest || 'chat'),
    paused: raw.paused !== undefined ? !!raw.paused : !!p.paused,
    lastRun: p.lastRun || '', lastCid: p.lastCid || '', lastError: p.lastError || '', runs: p.runs || 0, createdAt: p.createdAt || core.nowIso(),
  };
  if (!s.prompt) throw new HttpError(400, 'invalid', 'Write what Ask Auntie should do.');
  if (s.freq === 'weekly' && !s.days.length) throw new HttpError(400, 'invalid', 'Pick at least one day.');
  s.next = s.paused ? '' : nextRun(s);
  return s;
}

async function list(email) { return ((await getJson(KEY(email)).catch(() => null)) || { items: [] }).items; }
async function reindex(email) {
  const items = await list(email);
  await cas(INDEX, x => { x = x || { items: [] }; x.items = x.items.filter(i => i.email !== email).concat(items.map(s => ({ email, id: s.id, next: s.next, paused: s.paused }))); return x; });
  return items;
}
async function save(email, raw) {
  let out;
  await cas(KEY(email), x => {
    x = x || { items: [] };
    const prev = raw.id ? x.items.find(i => i.id === raw.id) : null;
    if (raw.id && !prev) throw new HttpError(404, 'not_found', 'That schedule has gone.');
    if (!prev && x.items.length >= 20) throw new HttpError(400, 'too_many', 'Up to 20 scheduled prompts.');
    out = clean(raw, prev);
    x.items = prev ? x.items.map(i => (i.id === out.id ? out : i)) : x.items.concat(out);
    return x;
  });
  return reindex(email);
}
async function remove(email, id) { await cas(KEY(email), x => { x = x || { items: [] }; x.items = x.items.filter(i => i.id !== id); return x; }); return reindex(email); }

// ▶️ run one schedule now (from the runner, or "Run now")
async function runOne(email, id) {
  const s = (await list(email)).find(i => i.id === id);
  if (!s) throw new HttpError(404, 'not_found', 'That schedule has gone.');
  const L = londonParts(Date.now()), label = new Date(L.day + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  let res, err = '';
  try {
    res = await chat.send(email, { text: s.prompt, web: s.web ? true : false });
    const cid = res.conv.id, title = `🕖 ${s.name.replace(/^[^A-Za-z0-9]+/, '')} — ${label}`;
    await chat.mark(email, cid, title);
    const answer = res.conv.msgs[res.conv.msgs.length - 1].text || '';
    if (s.dest !== 'chat' && answer) {
      // each piece of content becomes its own card (or one card when it's a single answer)
      const hq = require('./hq'), P = chat.pieces(answer), base = { notes: `⏰ Scheduled in Ask Auntie · ${s.name} · ${label}`, status: s.dest === 'calendar' ? 'scheduled' : 'idea', planDate: s.dest === 'calendar' ? L.day : '' };
      const cards = P.pieces.length ? P.pieces.map(p => ({ title: p.title.slice(0, 120), caption: p.body, type: chat.guessType(p.title + ' ' + p.body.slice(0, 200)) })) : [{ title: `${s.name.replace(/^[^A-Za-z0-9]+/, '')} — ${label}`.slice(0, 120), caption: answer }];
      for (const c of cards.slice(0, 15)) await hq.save(Object.assign({}, base, c), email);
    }
    res = { cid };
  } catch (e) { err = e.message || 'It didn’t run'; }
  await cas(KEY(email), x => { x = x || { items: [] }; x.items = x.items.map(i => (i.id === id ? Object.assign({}, i, { lastRun: core.nowIso(), lastCid: res ? res.cid : i.lastCid, lastError: err, runs: (i.runs || 0) + (err ? 0 : 1), next: i.paused ? '' : nextRun(i, Date.now() + 60000) }) : i)); return x; });
  await reindex(email);
  if (err) throw new HttpError(400, 'run_failed', err);
  return res;
}

// ⏱️ the runner (every 5 minutes): runs what's due, a few at a time so it never times out
async function runDue(budgetMs) {
  const t0 = Date.now(), now = new Date().toISOString(), done = [];
  const idx = ((await getJson(INDEX).catch(() => null)) || { items: [] }).items.filter(i => !i.paused && i.next && i.next <= now).sort((a, b) => a.next.localeCompare(b.next));
  for (const i of idx) {
    if (Date.now() - t0 > (budgetMs || 12000)) break;
    try { await runOne(i.email, i.id); done.push(i.id); } catch (e) { done.push(i.id + ':' + e.message); }
  }
  return { due: idx.length, done };
}

// ready-made examples
const EXAMPLES = [
  { name: '📰 7 UK Updates You May Have Missed', prompt: 'Find the 7 most useful UK updates from the past week for Nigerians living in the UK (immigration, money, cost of living, NHS, housing, work, family). For each: a short headline, 2 plain-English lines on what changed and what to do, and the source. Then write it as an Instagram carousel (cover + 7 slides + a save/share slide) and a ready caption in the Auntie Tobi voice.', freq: 'weekly', days: [0], time: '07:00', web: true, dest: 'calendar' },
  { name: '💼 UK jobs & opportunities round-up', prompt: 'Find 5–7 current UK opportunities that suit Nigerians in the UK — jobs that sponsor or hire widely (care, NHS, warehouse, admin, tech), free courses, grants or schemes — with who it’s for, deadline if any, and the official link. Write it as a carousel plus a caption for Monday.', freq: 'weekly', days: [1], time: '08:00', web: true, dest: 'board' },
  { name: '🇬🇧 Today’s UK news for Nigerians', prompt: 'What are today’s UK news stories that matter most to Nigerians living in the UK? Give 3–5, each in two plain lines with why it matters, plus the source. End with one post idea I could make from them.', freq: 'daily', days: [], time: '09:00', web: true, dest: 'chat' },
  { name: '🎉 Weekend events round-up', prompt: 'Find Nigerian and Afrobeats events happening this weekend in UK cities (London, Manchester, Birmingham, Leeds and others) — name, city, date, and link. Then write a short Friday post and caption rounding them up in the Auntie Tobi voice.', freq: 'weekly', days: [5], time: '10:00', web: true, dest: 'board' },
  { name: '💷 Money-saving deals this week', prompt: 'Find this week’s best UK money-saving deals and tips useful to Nigerian families (supermarkets, energy, travel home, kids, bills) with the source for each. Write it as a carousel and a caption for Thursday.', freq: 'weekly', days: [4], time: '08:00', web: true, dest: 'board' },
];

module.exports = { list, save, remove, runOne, runDue, nextRun, EXAMPLES, londonToMs };
