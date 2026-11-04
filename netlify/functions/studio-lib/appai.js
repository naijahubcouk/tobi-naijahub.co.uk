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
  news: 'a news explainer (about 700–1,100 words) in simple English, following the ARTICLE LAYOUT (6–8 numbered sections): what happened or is changing, when, who it affects, what it means for Nigerians in the UK, and what to do now.',
  article: 'a detailed, helpful guide article (about 1,000–1,500 words) in simple English, following the ARTICLE LAYOUT.',
  event: 'an event write-up (about 120–250 words): what it is, what is on, who it is for and how to book.',
};
const LONG = { article: true, news: true };
// Official UK sites the writer checks live for articles and news (fees, rules and steps change often)
const TRUSTED_SITES = ['gov.uk', '*.gov.uk', 'nhs.uk', '*.nhs.uk', 'citizensadvice.org.uk', '*.citizensadvice.org.uk', 'moneyhelper.org.uk', '*.moneyhelper.org.uk'];
function siteName(u) { try { const h = new URL(u).hostname.replace(/^www\./, ''); return /gov\.uk$/.test(h) ? 'GOV.UK' : /nhs\.uk$/.test(h) ? 'NHS' : /citizensadvice/.test(h) ? 'Citizens Advice' : /moneyhelper/.test(h) ? 'MoneyHelper' : h; } catch (_) { return 'Source'; } }

const VOICE = `VOICE — this is Auntie Tobi talking:
- Simple English. Short sentences (mostly under 20 words). Everyday words — write for someone who is new to the UK or whose first language is not English.
- Explain every UK term the first time you use it, in brackets — e.g. "HMRC (the UK tax office)", "GP (your local family doctor)", "council tax (a yearly bill for local services like bin collection)".
- Warm and caring, like a trusted auntie who has been in the UK for years. Speak to the reader as "you". A light touch of Naija warmth now and then ("My dear,", "Don't worry —", "No wahala,") — at most two or three in the whole piece. Never slang-heavy, never preachy.
- Be practical: tell people exactly what to do, where to go and what to have ready.`;

// Long posts (articles + news) follow the Auntie Tobi explainer style — calm, clear, answer-first.
const VOICE_LONG = `VOICE — this is Auntie Tobi explaining something clearly:
- Simple, plain English. Short sentences (mostly under 20 words). Short paragraphs — usually ONE or two sentences each.
- Calm, balanced and reassuring. Correct scary headlines and myths without being dramatic. Never hype, never preachy.
- Explain every UK term the first time, e.g. "Indefinite Leave to Remain (ILR)", "HMRC (the UK tax office)".
- Answer first, then explain: if a section asks a question, its first line is the direct answer ("No.", "Yes — but only if…", "Not necessarily.").
- Be precise: say who it applies to and who it doesn't. Separate what has been ANNOUNCED or proposed from what is actually IN FORCE now, and say "As of <date>" for anything that could change.
- Speak to the reader as "you". At most one light touch of Naija warmth in the whole piece (in "Auntie Tobi Says"). No slang.`;

const ARTICLE_LAYOUT = `ARTICLE LAYOUT — follow this shape (it is how every Auntie Tobi article reads):
1. FIRST LINE: a hook in CAPITALS that names the reader's real question, starting with one flag/emoji — e.g. "🇬🇧 UK ILR UPDATE: WILL YOU STILL QUALIFY FOR SETTLEMENT AFTER FIVE YEARS?"
2. Opening (4–6 very short paragraphs): who this matters to ("If you're a Nigerian living in the UK, especially…"); what happened and when; what it changes in one sentence; then calm the worry ("But before you start worrying about…, there's something important to understand."); end with "Here's what … and what it could mean for Nigerians in the UK."
3. 6–10 numbered sections. Each heading is its own line: ONE fitting emoji, the number, a full stop, then a Title Case heading — usually the question the reader is asking. e.g. "⏳ 2. Will Everyone Have to Wait Ten Years?". Sections cover, as relevant: what it is; who it affects / does it affect everyone; the groups most relevant to Nigerians in the UK (care workers, nurses, students, families, renters, drivers…); requirements or costs; what doesn't change; when it starts; what to do now; FAQ.
4. Inside sections use, where they help:
   • a lead-in line ending with ":" then "• " bullets
   • a comparison TABLE when there are options, groups, amounts or timelines: one line per row, columns separated by " | ", first line = column headings, e.g. "Settlement period | Who may qualify" then "5 years | People earning above £…"
   • "Label: explanation" lines for lists of requirements or definitions (e.g. "English language: …")
   • ONE short box line where it matters, starting with exactly one of: "The key change: …", "Important: …", "Please note: …"
   • a balancing "Auntie Tobi reminder: …" line, e.g. "Don't assume X. Equally, don't assume Y."
5. A "What Should Nigerians in the UK Do Now?" section (with its emoji and number) — numbered steps "1. ", "2. "…; each step starts with a short action sentence ending in a full stop (e.g. "1. Keep your employment records. Payslips, contracts…").
6. A "❓ <n>. Frequently Asked Questions" section — 4–5 questions, each its own line ending with "?", each followed by a short answer that starts "Yes.", "No.", "Some can…" or "Not necessarily."
7. A line "---", then "💚 Auntie Tobi Says" on its own line, then 4–5 warm, short paragraphs: acknowledge the feeling, correct the misleading headline, give the balanced picture, end with encouragement.
8. Then these closing lines, each on its own line:
   "📌 SAVE this guide for future reference."
   "📤 SHARE it with a Nigerian living in the UK." (adjust to the topic, e.g. "…working in social care")
   "📲 For more <topic> updates, practical guides and community information, visit the Auntie Tobi App and check our Instagram Stories regularly."
   "👇🏾 <a question inviting comments about the reader's own situation>"
9. "Last fact-checked: <today's date, e.g. 4 November 2026>. This article provides general information, not personalised <legal/immigration/financial/medical> advice. Rules may change after publication." (fit the advice type to the topic)
10. "Sources:" — bullet lines "• <site name> — <full URL>" for the official pages you used (only real URLs from the notes or official results).`;

function prompt(notes, kind, category, today, facts, rewrite) {
  const long = LONG[kind];
  const longDay = new Date(today + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
  const factRules = long
    ? `FACTS (very important)
- Use facts from: the NOTES, the OFFICIAL WEB RESULTS attached to this message (GOV.UK, NHS, Citizens Advice, MoneyHelper) and the TRUSTED FACTS below. Use those to add helpful detail.
- NEVER invent or guess dates, fees, prices, amounts, time limits, eligibility rules, names or links. If a figure is not confirmed by one of those sources, do not give it — say it can change and point to the official page.
- If the notes and an official source disagree on a figure, use the official source.`
    : `STRICT RULES
- Use ONLY facts in the notes. Never invent dates, times, prices, places, names, numbers, eligibility or links. If something is not in the notes, leave it out.`;
  return [
    { role: 'system', content:
`You write posts for the Auntie Tobi app — a warm, trusted UK guide for Nigerians living in the UK. Write as "Auntie Tobi", in British English. Never mention any person behind Auntie Tobi.

${long ? VOICE_LONG : VOICE}

${factRules}
- Ignore working notes such as "Priority:", "Content angle:", "Caption idea:", hashtags or instructions to the writer.
- Today is ${today}. Dates without a year are the next upcoming date.
${facts ? `\nTRUSTED FACTS (checked by the Auntie Tobi team — correct, and they override anything you remember):\n${facts}\n` : ''}
BODY FORMAT (plain text — no markdown "#" headings, no "**" around headings):
- Short paragraphs separated by a blank line.
${long ? '- Headings exactly as in the ARTICLE LAYOUT. Bullet lines start with "• ". Numbered steps start with "1. ". Tables use " | " between columns. Use **bold** only for a few key facts inside sentences.' : '- A short heading is its own line ending with "?" or ":" (max 60 characters).\n- Bullet lines start with "• ". Numbered steps start with "1. ", "2. ". Use **bold** sparingly for key facts.\n- One or two relevant emojis at most per section.'}
${long ? ARTICLE_LAYOUT.replace('<today\'s date, e.g. 4 November 2026>', longDay) : `- Near the end, an OPTIONAL line "💚 **Auntie Tobi Tip:** …" — ONE short sentence (max 25 words) with a practical tip directly about this topic that the reader has not already been told. If you do not have a genuinely useful, specific tip, leave the tip out completely — never add a generic one. Then a short line encouraging people to share it with someone it would help.${long ? '\n- Then "Sources:" with bullet lines "• <site name> — <full URL>" for any official pages you used.' : ''}`}
- For events, do NOT repeat date/time/place lines at the top — the app shows them separately.

Return ONLY a JSON object with these keys:
{"title": string (max 90 chars, starts with ONE fitting emoji, Title Case, not all caps, plain and clear — say what the reader will learn),
 "summary": string (one simple sentence, max 200 chars),
 "body": string,
 "category": one of ${JSON.stringify(apppub.CATEGORIES)} (best fit; use "News" for news),
 "link": the official/source/booking URL from the notes or "",
 "eventDate": "YYYY-MM-DD" or "",
 "eventTime": e.g. "10:30am – 2pm" or "",
 "location": full venue/address from the notes or "",
 "relevantUntil": "YYYY-MM-DD" — the last day this matters (the date of the thing, or "" if it doesn't expire)}` },
    { role: 'user', content: rewrite
      ? `REWRITE this existing Auntie Tobi ${kind === 'article' ? 'article' : 'post'} as ${STYLE[kind]}${category ? ` Category: ${category}.` : ''} Keep its topic, meaning, facts and links. You may add detail confirmed by the official results or trusted facts. Fix anything an official source shows is out of date.\n\nEXISTING POST:\n${notes}`
      : `Write ${STYLE[kind]}${kind === 'article' && category ? ` Category: ${category}.` : ''}\n\nNOTES:\n${notes}` },
  ];
}

async function write(notes, kind, category, opts) {
  opts = opts || {};
  notes = String(notes || '').replace(/\r/g, '').trim().slice(0, opts.rewrite ? 14000 : 6000);
  if (notes.length < 15) throw new HttpError(400, 'too_short', 'Paste a bit more information first.');
  kind = KINDS.includes(kind) ? kind : 'update';
  category = apppub.CATEGORIES.includes(category) ? category : '';
  const settings = await core.getSettings();
  const today = core.dayKey();
  const factsRec = await core.getJson('app/facts').catch(() => null);
  const msgs = prompt(notes, kind, category, today, (factsRec && factsRec.text) || '', !!opts.rewrite);
  const maxTok = LONG[kind] ? (kind === 'article' ? 6000 : 4500) : 1400;
  let out;
  if (LONG[kind]) {
    // live check of official UK sites first; if the search is down, write without it (the no-guessing rules still apply)
    try { out = await gen.callModel(msgs, maxTok, settings, { json: true, raw: true, plugins: [{ id: 'web', engine: 'exa', max_results: 5, include_domains: TRUSTED_SITES }] }); }
    catch (e) { console.log('[appai] official-site check failed, writing without it:', e.message); }
  }
  if (!out) out = await gen.callModel(msgs, maxTok, settings, { json: true, raw: true });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  let j;
  try { j = JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { throw new HttpError(502, 'ai_error', 'The AI reply came back garbled — please try again.'); }

  let body = cleanLinksIn(String(j.body || '').replace(/\r/g, '').trim());
  // make sure the official pages that were checked are listed
  const official = [...new Set((out.sources || []).map(cleanLink).filter(u => u && /(gov\.uk|nhs\.uk|citizensadvice|moneyhelper)/.test(u)))].slice(0, 4);
  const missing = official.filter(u => body.indexOf(u) < 0);
  if (LONG[kind] && missing.length) body += (/\n\s*Sources:\s*\n/i.test(body) ? '\n' : '\n\nSources:\n') + missing.map(u => `• ${siteName(u)} — ${u}`).join('\n');

  const until = isDay(j.relevantUntil) && j.relevantUntil >= today ? j.relevantUntil : '';
  const draft = {
    kind: kind === 'news' ? 'article' : kind,
    title: core.cleanText(j.title, 160),
    summary: core.cleanText(j.summary, 400),
    body: body.slice(0, 20000),
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
