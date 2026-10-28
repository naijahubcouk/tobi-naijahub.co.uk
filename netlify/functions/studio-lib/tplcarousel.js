'use strict';
/*
 * Auntie Tobi HQ — 📝 Template Carousel.
 * White "bold headline" carousels (green frame, black capitals, green highlight, optional gold brush).
 * The slides are drawn and downloaded in the browser (hq-tplcarousel.js); this file only stores them
 * and asks the AI to write the slides.
 *
 *   hq/tplcars   { items: { <id>: tcar } }
 *   tcar:  { id, title, slides: [slide], numbers, handle, swipe, brush, caption, hashtags, status: draft|posted,
 *            createdBy, createdAt, updatedAt, postedAt? }
 *   slide: { kind: cover|tip|end, heading, body, align: center|left }
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, cas, getJson, cleanText } = core;
const gen = require('./generate');

const KEY = 'hq/tplcars';
const MAX = 300;
const KINDS = ['cover', 'tip', 'end'];
const multi = (s, n) => String(s == null ? '' : s).replace(/\r/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);

function cleanSlide(x) {
  x = x && typeof x === 'object' ? x : {};
  return {
    kind: KINDS.includes(x.kind) ? x.kind : 'tip',
    heading: multi(x.heading, 160),
    body: multi(x.body, 400),
    align: x.align === 'left' ? 'left' : 'center',
  };
}
function clean(raw, prev) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const slides = (Array.isArray(raw.slides) ? raw.slides : []).slice(0, 10).map(cleanSlide);
  if (!slides.length) throw new HttpError(400, 'no_slides', 'Add at least one slide.');
  return {
    title: cleanText(raw.title, 140) || slides[0].heading.replace(/\*\*/g, '').slice(0, 140) || 'Untitled carousel',
    slides,
    numbers: raw.numbers !== false,
    handle: raw.handle !== false,
    swipe: raw.swipe !== false,
    brush: raw.brush !== false,
    caption: multi(raw.caption, 2200),
    hashtags: multi(raw.hashtags, 600),
    status: raw.status === 'posted' ? 'posted' : 'draft',
    postedAt: raw.status === 'posted' ? (prev && prev.postedAt) || core.nowIso() : '',
  };
}

async function list() {
  const cur = (await getJson(KEY)) || { items: {} };
  return Object.values(cur.items).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
async function save(raw, by) {
  let out;
  await cas(KEY, cur => {
    cur = cur || { items: {} };
    const prev = raw && raw.id ? cur.items[raw.id] : null;
    if (raw && raw.id && !prev) throw new HttpError(404, 'not_found', 'That carousel no longer exists.');
    const now = core.nowIso();
    out = { ...(prev || { id: `t${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`, createdBy: by, createdAt: now }), ...clean(raw, prev), updatedAt: now, updatedBy: by };
    cur.items[out.id] = out;
    const ids = Object.values(cur.items).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).map(x => x.id);
    ids.slice(MAX).forEach(id => { delete cur.items[id]; });
    return cur;
  });
  return out;
}
async function remove(id) {
  await cas(KEY, cur => { if (!cur || !cur.items[id]) return undefined; delete cur.items[id]; return cur; });
  return true;
}

// ✨ AI writes every slide at once
async function write(notes, opts) {
  notes = String(notes || '').replace(/\r/g, '').trim().slice(0, 6000);
  if (notes.length < 10) throw new HttpError(400, 'too_short', 'Paste a bit more information first.');
  const n = Math.min(10, Math.max(3, Number(opts && opts.count) || 7));
  const end = !opts || opts.end !== false;
  const tips = n - 1 - (end ? 1 : 0);
  const settings = await core.getSettings();
  const messages = [
    { role: 'system', content:
`You write Instagram carousels for Auntie Tobi (@auntietobi_uk) — a warm, trusted UK guide for Nigerians living in the UK. Voice: friendly, clear, practical, British English, a little Naija warmth, never over-the-top.
STRICT: use ONLY facts in the notes (general everyday tips are fine if the notes ask for tips). Never invent dates, prices, numbers, eligibility or links.
The design is a bold headline template: big CAPITAL letters, with the key words in green. Mark the green words by wrapping them in **double asterisks**.
Write exactly ${n} slides:
- Slide 1, kind "cover": "heading" is a scroll-stopping hook, 6–12 words, ending with the key phrase in green, e.g. "5 small ways to make life in the UK feel **less stressful!**". If the slides are a list, start with the number (${tips}). "body" empty.
- Next ${tips} slides, kind "tip": "heading" 2–6 words with 1–3 words in **green**, e.g. "Plan your **week on Sunday**". "body" 12–30 words of practical, specific explanation (plain text, no asterisks, no emoji).
${end ? '- Last slide, kind "end": "heading" like "Save this & share with **someone who needs it!**" (vary it to fit the topic), "body": "Follow @auntietobi_uk for more".' : ''}
No emoji in headings. Also write an Instagram caption (60–140 words, ends with a question to drive comments) and 8–12 relevant hashtags (space-separated, include #NigeriansInUK #AuntieTobi).
Return ONLY JSON: {"title": string, "slides": [{"kind","heading","body"}], "caption": string, "hashtags": string}` },
    { role: 'user', content: `NOTES:\n${notes}` },
  ];
  const out = await gen.callModel(messages, 2000, settings, { json: true, raw: true });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  let j;
  try { j = JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { throw new HttpError(502, 'ai_error', 'The AI reply came back garbled — please try again.'); }
  const slides = (Array.isArray(j.slides) ? j.slides : []).slice(0, 10).map(cleanSlide).filter(s => s.heading || s.body);
  if (slides.length < 2) throw new HttpError(502, 'ai_error', 'The AI couldn’t write that just now — please try again.');
  slides.forEach((s, i) => { s.kind = i === 0 ? 'cover' : (end && i === slides.length - 1 ? 'end' : 'tip'); s.align = s.kind === 'tip' ? 'left' : 'center'; });
  return { title: cleanText(j.title, 140) || slides[0].heading.replace(/\*\*/g, ''), slides, caption: multi(j.caption, 2200), hashtags: multi(j.hashtags, 600) };
}

module.exports = { list, save, remove, write, KINDS };
