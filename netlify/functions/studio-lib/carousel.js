'use strict';
/*
 * Auntie Tobi HQ — 🎬 Animated Carousel Maker.
 * The slides are drawn and turned into videos in the browser (hq-carousel.js); this file only
 * stores the carousels and asks the AI to write the slides.
 *
 *   hq/carousels   { items: { <id>: carousel } }
 *   carousel: { id, title, theme, anim, handle, slides: [slide], caption, hashtags, coverImg, status: draft|posted,
 *               createdBy, createdAt, updatedAt, postedAt? }
 *   slide: { layout: cover|points|fact|steps|stat|quote|cta, title, text, bullets: [], emoji, stat: { value, prefix, suffix, label } }
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, cas, getJson, cleanText } = core;
const gen = require('./generate');

const KEY = 'hq/carousels';
const MAX = 300;
const LAYOUTS = ['cover', 'points', 'fact', 'steps', 'stat', 'quote', 'cta'];
const THEMES = ['green', 'navy', 'cream', 'gold', 'purple'];
const ANIMS = ['pop', 'type', 'highlight', 'calm'];
const multi = (s, n) => String(s == null ? '' : s).replace(/\r/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);

function cleanSlide(x) {
  x = x && typeof x === 'object' ? x : {};
  const st = x.stat && typeof x.stat === 'object' ? x.stat : {};
  const val = Number(String(st.value == null ? '' : st.value).replace(/[^\d.-]/g, ''));
  return {
    layout: LAYOUTS.includes(x.layout) ? x.layout : 'points',
    title: multi(x.title, 140),
    text: multi(x.text, 400),
    bullets: (Array.isArray(x.bullets) ? x.bullets : []).map(b => multi(b, 120)).filter(Boolean).slice(0, 5),
    emoji: cleanText(x.emoji, 12),
    stat: { value: Number.isFinite(val) ? val : 0, prefix: cleanText(st.prefix, 6), suffix: cleanText(st.suffix, 12), label: multi(st.label, 120) },
    img: /^e[a-z0-9]{6,30}$/.test(String(x.img || '')) ? x.img : '',
  };
}
function clean(raw, prev) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const slides = (Array.isArray(raw.slides) ? raw.slides : []).slice(0, 10).map(cleanSlide);
  if (!slides.length) throw new HttpError(400, 'no_slides', 'Add at least one slide.');
  return {
    title: cleanText(raw.title, 140) || slides[0].title.slice(0, 140) || 'Untitled carousel',
    theme: THEMES.includes(raw.theme) ? raw.theme : 'green',
    anim: ANIMS.includes(raw.anim) ? raw.anim : 'pop',
    handle: raw.handle !== false,
    motion: raw.motion !== false,
    slides,
    caption: multi(raw.caption, 2200),
    hashtags: multi(raw.hashtags, 600),
    coverImg: /^e[a-z0-9]{6,30}$/.test(String(raw.coverImg || '')) ? raw.coverImg : '',
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
    out = { ...(prev || { id: `c${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`, createdBy: by, createdAt: now }), ...clean(raw, prev), updatedAt: now, updatedBy: by };
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

// ✨ AI writes the slides
async function write(notes, opts) {
  notes = String(notes || '').replace(/\r/g, '').trim().slice(0, 6000);
  if (notes.length < 15) throw new HttpError(400, 'too_short', 'Paste a bit more information first.');
  const n = Math.min(9, Math.max(4, Number(opts && opts.count) || 6));
  const settings = await core.getSettings();
  const messages = [
    { role: 'system', content:
`You write Instagram carousels for Auntie Tobi (@auntietobi_uk) — a warm, trusted UK guide for Nigerians living in the UK. Voice: friendly, clear, practical, British English, a little Naija warmth, never over-the-top.
STRICT: use ONLY facts in the notes. Never invent dates, prices, numbers, eligibility or links. Ignore working notes like "Priority:" or "Content angle:".
Write ${n} slides that are easy to read on a phone — short lines, no paragraphs.
Slide layouts:
- "cover": slide 1 only. A scroll-stopping hook title (max 8 words) + optional short "text" subline (max 10 words) + one fitting emoji.
- "points": a title (max 6 words) + 2–4 bullets (max 9 words each).
- "steps": a title + 2–4 numbered steps as bullets (max 9 words each).
- "fact": a "Did you know?"-style slide: title (max 6 words) + text (max 22 words).
- "stat": ONLY if the notes contain a real number/amount: stat.value (number), stat.prefix (e.g. "£"), stat.suffix (e.g. "%", " days"), stat.label (max 12 words), plus a title.
- "quote": a short powerful line in "text" (max 16 words), title optional.
- "cta": the LAST slide: title like "Save this for later 💚" and text inviting people to share/follow (max 14 words).
Wrap 1–2 key words per slide in **double asterisks** to highlight them. Use one emoji per slide in "emoji".
Also write an Instagram caption (60–140 words, ends with a question to drive comments) and 8–12 relevant hashtags (space-separated, include #NigeriansInUK #AuntieTobi).
Return ONLY JSON: {"title": string, "slides": [{"layout","title","text","bullets":[],"emoji","stat":{"value","prefix","suffix","label"}}], "caption": string, "hashtags": string}` },
    { role: 'user', content: `NOTES:\n${notes}` },
  ];
  const out = await gen.callModel(messages, 2000, settings, { json: true, raw: true });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  let j;
  try { j = JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { throw new HttpError(502, 'ai_error', 'The AI reply came back garbled — please try again.'); }
  const slides = (Array.isArray(j.slides) ? j.slides : []).slice(0, 10).map(cleanSlide).filter(s => s.title || s.text || s.bullets.length);
  if (slides.length < 2) throw new HttpError(502, 'ai_error', 'The AI couldn’t write that just now — please try again.');
  slides[0].layout = 'cover';
  return { title: cleanText(j.title, 140) || slides[0].title, slides, caption: multi(j.caption, 2200), hashtags: multi(j.hashtags, 600) };
}

module.exports = { list, save, remove, write, LAYOUTS, THEMES, ANIMS };
