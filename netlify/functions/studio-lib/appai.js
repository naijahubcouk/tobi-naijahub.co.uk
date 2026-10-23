'use strict';
/*
 * Auntie Tobi HQ — "✨ Write with AI" for Publish to App.
 * Turns rough notes into a ready-to-check draft (update, news, article or event). Nothing is published here:
 * the draft goes back to the HQ editor, where a person checks it and taps Publish.
 * Uses the same AI set-up as Business Studio (callModel) and counts towards the same monthly spend warning.
 */
const core = require('./core');
const { HttpError } = core;
const gen = require('./generate');
const apppub = require('./apppub');

const KINDS = ['update', 'news', 'article', 'event'];
const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));

// Removes tracking bits (utm_*, fbclid, gclid…) from a link.
function cleanLink(u) {
  try {
    const url = new URL(String(u || '').trim());
    if (!/^https?:$/.test(url.protocol)) return '';
    for (const k of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid|mc_|igshid|si$)/i.test(k)) url.searchParams.delete(k);
    return url.toString().replace(/\?$/, '');
  } catch (_) { return ''; }
}
function cleanLinksIn(text) { return String(text || '').replace(/https?:\/\/[^\s)\]]+/g, m => cleanLink(m) || m); }

const STYLE = {
  update: 'a short, urgent community update (about 80–150 words): what is happening, who it affects, what to do.',
  news: 'a news post (about 150–300 words): what happened or is changing, when, who it affects, and what it means for Nigerians in the UK.',
  article: 'a helpful blog article (about 300–550 words) with clear headings and practical steps.',
  event: 'an event write-up (about 120–250 words): what it is, what is on, who it is for and how to book.',
};

function prompt(notes, kind, category, today) {
  return [
    { role: 'system', content:
`You write posts for the Auntie Tobi app — a warm, trusted UK guide for Nigerians living in the UK. Write as "Auntie Tobi": friendly, clear, practical, British English, a little warmth, never over-the-top. Never mention any person behind Auntie Tobi.

STRICT RULES
- Use ONLY facts in the notes. Never invent dates, times, prices, places, names, numbers, eligibility or links. If something is not in the notes, leave it out.
- Ignore working notes such as "Priority:", "Content angle:", "Caption idea:", hashtags or instructions to the writer.
- Today is ${today}. Dates without a year are the next upcoming date.

BODY FORMAT (plain text, not markdown headings):
- Short paragraphs separated by a blank line.
- A short heading is its own line ending with "?" or ":" (e.g. "What's happening?", "Good to know:").
- Bullet lines start with "• ". Use **bold** sparingly for key facts.
- One or two relevant emojis at most per section.
- End with a line starting "💚 **Auntie Tobi Tip:**" and then a short line encouraging people to share it with someone it would help.
- For events, do NOT repeat date/time/place lines at the top — the app shows them separately.

Return ONLY a JSON object with these keys:
{"title": string (max 90 chars, starts with ONE fitting emoji, Title Case, not all caps),
 "summary": string (one sentence, max 200 chars),
 "body": string,
 "category": one of ${JSON.stringify(apppub.CATEGORIES)} (best fit; use "News" for news),
 "link": the official/source/booking URL from the notes or "",
 "eventDate": "YYYY-MM-DD" or "",
 "eventTime": e.g. "10:30am – 2pm" or "",
 "location": full venue/address from the notes or "",
 "relevantUntil": "YYYY-MM-DD" — the last day this matters (the date of the thing, or "" if it doesn't expire)}` },
    { role: 'user', content: `Write ${STYLE[kind]}${kind === 'article' && category ? ` Category: ${category}.` : ''}\n\nNOTES:\n${notes}` },
  ];
}

async function write(notes, kind, category) {
  notes = String(notes || '').replace(/\r/g, '').trim().slice(0, 6000);
  if (notes.length < 15) throw new HttpError(400, 'too_short', 'Paste a bit more information first.');
  kind = KINDS.includes(kind) ? kind : 'update';
  category = apppub.CATEGORIES.includes(category) ? category : '';
  const settings = await core.getSettings();
  const today = core.dayKey();
  const out = await gen.callModel(prompt(notes, kind, category, today), 1400, settings, { json: true, raw: true });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  let j;
  try { j = JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { throw new HttpError(502, 'ai_error', 'The AI reply came back garbled — please try again.'); }

  const until = isDay(j.relevantUntil) && j.relevantUntil >= today ? j.relevantUntil : '';
  const draft = {
    kind: kind === 'news' ? 'article' : kind,
    title: core.cleanText(j.title, 160),
    summary: core.cleanText(j.summary, 400),
    body: cleanLinksIn(String(j.body || '').replace(/\r/g, '').trim()).slice(0, 12000),
    category: kind === 'news' ? 'News' : (category || (apppub.CATEGORIES.includes(j.category) ? j.category : 'News')),
    link: cleanLink(j.link),
    eventDate: kind === 'event' && isDay(j.eventDate) ? j.eventDate : '',
    eventTime: kind === 'event' ? core.cleanText(j.eventTime, 60) : '',
    location: kind === 'event' ? core.cleanText(j.location, 120) : '',
    // An update stays up until the day after the thing it's about
    showUntil: kind === 'update' && until ? new Date(Date.parse(until + 'T12:00:00Z') + 864e5).toISOString().slice(0, 10) : '',
  };
  if (!draft.title || !draft.body) throw new HttpError(502, 'ai_error', 'The AI couldn\'t write that just now — please try again.');
  return draft;
}

module.exports = { write, cleanLink, KINDS };
