'use strict';
/*
 * Auntie Tobi HQ — 💬 Comment Assistant (Instagram Growth).
 * Reads a screenshot of someone else's Instagram post (plus optional caption/context) and drafts three short
 * comments for @auntietobi_uk to post by hand. Nothing is ever posted from here.
 * Uses the same AI set-up as Business Studio (callModel) and counts towards the same monthly spend warning.
 *
 *   hq/ig-comments   { items: { <id>: entry } }     shared by everyone who can sign in to HQ
 *
 * entry: { id, by, createdAt, link, context, style, goal, about, account, sensitive,
 *          comments: [{ kind, text }], posted: { i, text, at, by } | null }
 * Screenshots are NOT stored — they're only sent to the AI.
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, cas, getJson, cleanText } = core;
const gen = require('./generate');

const KEY = 'hq/ig-comments';
const MAX_ITEMS = 1500;
const DAILY_TARGET = 10;
const IMG_MAX = 1.8 * 1024 * 1024; // data URL length
const KINDS = ['recommended', 'conversation', 'standout'];
const STYLES = {
  friendly: 'Friendly and conversational — like a warm auntie chatting in the comments.',
  helpful: 'Helpful and informative — add a genuinely useful tip, fact or pointer related to the post.',
  playful: 'Relatable and playful — light Nigerian-UK humour that the creator and their audience would smile at.',
  supportive: 'Supportive and encouraging — cheer the person on in a specific, sincere way.',
};
const GOALS = {
  visits: 'Attract profile visits and followers: be the comment people notice and want to click on, without self-promotion.',
  conversation: 'Start a conversation: invite the creator or their audience to reply.',
  relationships: 'Build a relationship with this business owner: show you actually looked at their work and care about their business.',
};
const newId = () => `c${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const multi = (s, n) => String(s || '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);

function cleanLink(u) {
  u = String(u || '').trim();
  if (!u) return '';
  try {
    const url = new URL(u);
    if (!/^https?:$/.test(url.protocol)) return '';
    for (const k of [...url.searchParams.keys()]) if (/^(utm_|igsh|igshid|fbclid|si$)/i.test(k)) url.searchParams.delete(k);
    return url.toString().replace(/\?$/, '').slice(0, 300);
  } catch (_) { return ''; }
}

function checkImage(dataUrl) {
  if (!dataUrl) return '';
  if (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(dataUrl))) throw new HttpError(400, 'bad_image', 'Please upload a JPG, PNG or WebP screenshot.');
  if (dataUrl.length > IMG_MAX) throw new HttpError(413, 'too_large', 'That screenshot is too large — please try a smaller one.');
  return dataUrl;
}

function prompt({ context, style, goal, avoid }) {
  const sys =
`You are the Instagram Comment Assistant for Auntie Tobi (@auntietobi_uk) — a warm, trusted UK guide and business-discovery platform for Nigerians living in the UK.
You write comments that Auntie Tobi will post BY HAND on other people's Instagram posts, to get noticed in a genuine way.

VOICE
- Write as "Auntie Tobi": warm, friendly Nigerian-UK community voice, British English. Light pidgin or Nigerian expressions only where natural (e.g. "Omo", "this one sweet me", "God when") — never overdo it.
- Never mention any real person behind Auntie Tobi.

STRICT RULES
- Every comment must be specific to THIS post: refer to something actually visible or said (the food, the product, the event, the point they made, a detail in the photo). If you can't tell what the post is about, say so via "unclear".
- Never invent personal experiences ("I went there last week", "I bought this"), facts, prices or details that aren't shown.
- No generic praise ("Great post!", "Love this!", "Amazing content", "So inspiring") and never start a comment with one.
- No hashtags. At most ONE emoji per comment. No @mentions except the post's own account if useful.
- Each comment under 25 words. Short, human, easy to read on a phone.
- No promotion: do NOT mention the Auntie Tobi app, directory, website, Business Club or "check out my page" — unless the post literally asks for where to find Nigerian businesses/info in the UK, and even then only lightly in ONE comment.
- Never mock the creator, other commenters, any group or anyone's appearance.
- SERIOUS POSTS (grief, death, illness, hardship, abuse, racism, a sad announcement): set "sensitive": true and make ALL THREE comments sincere and supportive — no humour, no questions that pry, no exclamation-heavy cheerfulness.

THE THREE COMMENTS
1. "recommended": the most natural, relevant comment for the chosen style and goal.
2. "conversation": encourages the creator or their audience to reply (usually a genuine, easy-to-answer question).
3. "standout": a thoughtful, funny or useful observation that could catch attention in a busy comment section.

Return ONLY a JSON object:
{"unclear": boolean (true only if the screenshot/text doesn't show an Instagram-style post you can comment on),
 "about": string (max 80 chars, what the post is about, e.g. "Jollof rice tray reel from a Manchester caterer"),
 "account": the post's @handle if visible, else "",
 "sensitive": boolean,
 "comments": [{"kind":"recommended","text":string},{"kind":"conversation","text":string},{"kind":"standout","text":string}]}`;
  const user =
`Comment style: ${STYLES[style]}
Goal: ${GOALS[goal]}
${context ? `\nCaption / context from Auntie Tobi:\n${context}\n` : ''}${avoid.length ? `\nThese were already suggested — write DIFFERENT ones:\n${avoid.map(t => `- ${t}`).join('\n')}\n` : ''}
Write the three comments.`;
  return [sys, user];
}

async function generate(raw, by) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const image = checkImage(raw.image);
  const context = multi(raw.context, 2500);
  const link = cleanLink(raw.link);
  const style = STYLES[raw.style] ? raw.style : 'friendly';
  const goal = GOALS[raw.goal] ? raw.goal : 'visits';
  const avoid = (Array.isArray(raw.avoid) ? raw.avoid : []).map(t => cleanText(t, 300)).filter(Boolean).slice(0, 9);
  if (!image && context.length < 15) {
    throw new HttpError(400, 'need_screenshot', link
      ? 'Instagram doesn’t let us read post links — please add a screenshot of the post (or paste its caption).'
      : 'Add a screenshot of the post, or paste its caption.');
  }

  const [sys, user] = prompt({ context, style, goal, avoid });
  const userContent = image ? [{ type: 'text', text: user }, { type: 'image_url', image_url: { url: image } }] : user;
  const settings = await core.getSettings();
  const out = await gen.callModel([{ role: 'system', content: sys }, { role: 'user', content: userContent }], 700, settings, { json: true, raw: true });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});

  let j;
  try { j = JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (_) { throw new HttpError(502, 'ai_error', 'The AI reply came back garbled — please try again.'); }
  if (j.unclear) throw new HttpError(400, 'unclear', 'Auntie Tobi couldn’t make out the post — try a clearer screenshot that shows the post and caption.');

  const list = Array.isArray(j.comments) ? j.comments : [];
  const comments = KINDS.map((kind, i) => {
    const c = list.find(x => x && x.kind === kind) || list[i] || {};
    return { kind, text: cleanText(String(c.text || '').replace(/^["“]|["”]$/g, ''), 400) };
  }).filter(c => c.text);
  if (!comments.length) throw new HttpError(502, 'ai_error', 'No comments came back — please try again.');

  const entry = {
    id: newId(), by: String(by || '').slice(0, 200), createdAt: core.nowIso(),
    link, context: context.slice(0, 600), style, goal,
    about: cleanText(j.about, 120), account: /^@[\w.]{1,40}$/.test(String(j.account || '').trim()) ? String(j.account).trim() : '',
    sensitive: !!j.sensitive, comments, posted: null,
  };
  await cas(KEY, cur => {
    const s = cur ? { items: { ...cur.items } } : { items: {} };
    s.items[entry.id] = entry;
    const ids = Object.keys(s.items);
    if (ids.length > MAX_ITEMS) ids.sort((a, b) => (s.items[a].createdAt || '').localeCompare(s.items[b].createdAt || '')).slice(0, ids.length - MAX_ITEMS).forEach(id => { delete s.items[id]; });
    return s;
  });
  return entry;
}

// Mark which comment was posted (i = 0..2), or un-mark it (i = null). `text` lets you record your edited version.
async function markPosted(id, i, text, by) {
  id = String(id || '');
  let out;
  await cas(KEY, cur => {
    const e = cur && cur.items && cur.items[id];
    if (!e) throw new HttpError(404, 'not_found', 'That comment isn’t in the history any more.');
    const s = { items: { ...cur.items } };
    const next = { ...e };
    if (i === null || i === undefined || i === '') next.posted = null;
    else {
      const n = Number(i);
      if (!Number.isInteger(n) || !next.comments[n]) throw new HttpError(400, 'bad_request', 'Pick one of the comments.');
      next.posted = { i: n, text: cleanText(text, 400) || next.comments[n].text, at: core.nowIso(), by: String(by || '').slice(0, 200) };
    }
    s.items[id] = next; out = next;
    return s;
  });
  return withDay(out);
}

async function remove(id) {
  id = String(id || '');
  await cas(KEY, cur => {
    if (!cur || !cur.items || !cur.items[id]) return undefined;
    const s = { items: { ...cur.items } };
    delete s.items[id];
    return s;
  });
}

async function list(limit) {
  const s = (await getJson(KEY)) || { items: {} };
  return Object.values(s.items).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, limit || 300).map(withDay);
}
// Adds the UK day it was posted, so "today's" count matches UK midnight.
function withDay(e) { return e && e.posted ? { ...e, posted: { ...e.posted, day: core.dayKey(new Date(e.posted.at)) } } : e; }

module.exports = { generate, markPosted, remove, list, DAILY_TARGET, STYLES: Object.keys(STYLES), GOALS: Object.keys(GOALS) };
