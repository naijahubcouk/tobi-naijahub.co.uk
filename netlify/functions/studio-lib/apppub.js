'use strict';
/*
 * Auntie Tobi HQ — "Publish to App". Updates, articles and events written in HQ and shown in the main app.
 * Written only through studio-hq (HQ sign-in). Read publicly through app-content (live items only).
 *
 *   hq/app-posts   { items: { <id>: post } }
 *
 * post: { id, kind, title, emoji, body, html, summary, category, link, linkText, imgId (event flyer or post image),
 *         showUntil, eventDate, eventTime, location, status, slug, publishedAt, createdAt, updatedAt, by }
 * kind:   update | article | event
 * status: live | hidden
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, cas, getJson, cleanText } = core;

const KEY = 'hq/app-posts';
const KINDS = ['update', 'article', 'event'];
// Article categories — must match the blog's own categories exactly (never invent new ones).
const CATEGORIES = ['News', 'Money', 'Housing', 'Lifestyle', 'Business', 'Did You Know', 'Travel', 'Family', 'Health', 'Education', 'Food', 'Jobs'];
const MAX_ITEMS = 500;
const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const newId = () => `a${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const multi = (s, n) => String(s || '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cleanUrl = u => { u = String(u || '').trim(); return /^https?:\/\/[^\s"'<>]{3,500}$/i.test(u) ? u : ''; };

// Plain text → safe HTML (articles, news, updates). Written to work with how Auntie Tobi articles are laid out:
//  • **bold**, links, blank line = new paragraph
//  • "• " / "- " bullets; "1. " numbered steps (a step's first sentence is shown in bold)
//  • headings: a short line ending in "?" or ":", or an emoji + number line like "🛂 1. What Is Earned Settlement?"
//  • a longer single-sentence line ending in "?" = an FAQ question
//  • an ALL-CAPS line = a bold subtitle
//  • table: 2+ lines with "|" between the columns (first line = headings)
//  • boxes: "Important:", "Please note:", "Note:", "Warning:", "Auntie Tobi reminder:", "Auntie Tobi Tip:", "The key change:", "Key point:"
//  • "💚 Auntie Tobi Says" … a green box (until "---", the 📌/📤/📲/👇🏾 lines or the end)
//  • "📌 / 📤 / 📲 / 👇🏾 …" lines = the closing call-to-action; "Last fact-checked…" = small grey note; "---" = a line
//  • "Label: text" (a label of up to 5 words) = bold label
const BOXES = [[/^(important|warning)$/i, 'warn'], [/^(please note|note)$/i, 'note'], [/^auntie tobi (reminder|tip)$/i, 'tobi'], [/^(the key change|key change|key point|in short)$/i, 'key']];
const EMOJI_START = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]️?⃣)/u;
const CTA = /^(?:📌|📤|📲|👇|🔔|📣|💬)/u;
function toHtml(text) {
  const link = s => s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, u => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//, '')}</a>`);
  const inline = s => link(esc(s)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const plain = s => s.replace(/\*\*/g, '').trim();
  const out = [];
  let list = null, ordered = false, start = 1, table = null, says = null, faq = false;
  const LEADIN = /\b(includes?|including|are|is|was|were|for|between|who|which|that|to|of|as|like|following|these|this|below|here|such as|with|by|from|need|needs|said|says)\s*:$/i;
  const push = h => (says ? says : out).push(h);
  const step = li => { const m = /^(?:\*\*)?([^.!?]{3,70}[.!?:])(?:\*\*)?\s+(\S.*)$/.exec(li); return m && !/\*\*/.test(m[1]) ? `<strong>${inline(m[1])}</strong> ${inline(m[2])}` : inline(li); };
  const flushList = () => { if (list) { push(ordered ? `<ol${start > 1 ? ` start="${start}"` : ''}>${list.map(li => `<li>${step(li)}</li>`).join('')}</ol>` : `<ul>${list.map(li => `<li>${inline(li)}</li>`).join('')}</ul>`); list = null; } };
  const flushTable = () => {
    if (!table) return;
    if (table.length < 2) { table.forEach(l => push(`<p>${inline(l)}</p>`)); table = null; return; }
    const rows = table.map(l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim())).filter(r => !r.every(c => /^:?-{2,}:?$/.test(c) || !c));
    const n = Math.max(...rows.map(r => r.length));
    const cell = (t, c) => `<${t}>${inline(c || '')}</${t}>`;
    push(`<div class="at-tbl"><table><thead><tr>${Array.from({ length: n }, (_, i) => cell('th', rows[0][i])).join('')}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${Array.from({ length: n }, (_, i) => cell('td', r[i])).join('')}</tr>`).join('')}</tbody></table></div>`);
    table = null;
  };
  const flush = () => { flushList(); flushTable(); };
  const endSays = () => { if (says) { flush(); out.push(`<div class="at-says">${says.join('')}</div>`); says = null; } };
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) { flushTable(); continue; }   // a blank line between numbered steps keeps them in one list
    if (/\|/.test(line) && !/https?:\/\/\S*\|/.test(line) && line.split('|').filter(c => c.trim()).length >= 2) { flushList(); (table = table || []).push(line); continue; }
    flushTable();
    const b = /^(?:([•\-*–])|(\d+)[.)])\s+(.*)$/.exec(line);
    if (b && !/^[-–]{3,}$/.test(line)) { const num = !!b[2]; if (list && num !== ordered) flushList(); if (!list) { ordered = num; start = num ? parseInt(b[2], 10) || 1 : 1; } (list = list || []).push(b[3]); continue; }
    flushList();
    const t = plain(line);
    if (/^[-–—_*]{3,}$/.test(t)) { faq = false; if (says) endSays(); else out.push('<hr>'); continue; }
    if (/^💚\s*Auntie Tobi Says:?$/iu.test(t)) { endSays(); faq = false; says = [`<h3>${inline(t.replace(/:$/, ''))}</h3>`]; continue; }
    if (CTA.test(t)) { endSays(); out.push(`<p class="at-cta">${inline(line)}</p>`); continue; }
    if (/^(last (fact-)?checked|last updated|this (article|post|guide) (provides|gives|is) general information)/i.test(t)) { endSays(); out.push(`<p class="at-fact">${inline(line)}</p>`); continue; }
    if (/^sources?:$/i.test(t)) { endSays(); }
    const box = /^(?:💚\s*|⚠️\s*|📝\s*)?([A-Za-z][A-Za-z ]{2,24}):\s+(\S.*)$/u.exec(t);
    const kind = box && (BOXES.find(([re]) => re.test(box[1].trim())) || [])[1];
    if (kind) { push(`<div class="at-call at-${kind}"><strong>${inline(line.replace(/\*\*/g, '').slice(0, line.replace(/\*\*/g, '').indexOf(':') + 1))}</strong> ${inline(box[2])}</div>`); continue; }
    const words = t.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
    if (t.length >= 12 && t.length <= 140 && /\p{L}/u.test(t) && words === words.toUpperCase() && /[A-Z]{3}/.test(words)) { push(`<p class="at-kicker">${inline(t)}</p>`); continue; }
    const question = t.length <= 140 && /\?$/.test(t) && !/[.!?]\s/.test(t.slice(0, -1)) && !/https?:/.test(t);
    if (faq && question) { push(`<h4 class="at-q">${inline(t)}</h4>`); continue; }
    const heading = (t.length <= 110 && EMOJI_START.test(t) && /^\S+\s*\d{1,2}[.)]\s+\S/u.test(t)) || (t.length <= 60 && /[?:]$/.test(t) && !/https?:/.test(t) && !LEADIN.test(t));
    if (heading) { faq = /question|faq/i.test(t); push(`<h3>${inline(t.replace(/:$/, ''))}</h3>`); continue; }
    if (question) { push(`<h4 class="at-q">${inline(t)}</h4>`); continue; }
    if (/:$/.test(t) && t.length <= 160) { push(`<p class="at-lead">${inline(line)}</p>`); continue; }
    const lab = /^([A-Z][\p{L}'’ -]{1,40}):\s+(\S.*)$/u.exec(t);
    if (lab && lab[1].trim().split(/\s+/).length <= 5 && !/https?$/i.test(lab[1])) { push(`<p><strong>${inline(lab[1])}:</strong> ${inline(lab[2])}</p>`); continue; }
    push(`<p>${inline(line)}</p>`);
  }
  flush(); endSays();
  return out.join('');
}

function slugify(title, taken) {
  const base = String(title || 'post').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase()
    .replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'post';
  let s = `at-${base}`, n = 2;
  while (taken.has(s)) s = `at-${base}-${n++}`;
  return s;
}

function clean(raw, prev) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const p = prev || {};
  const has = k => raw[k] !== undefined;
  const kind = KINDS.includes(raw.kind) ? raw.kind : (p.kind || 'update');
  const out = {
    kind,
    title: has('title') ? cleanText(raw.title, 160) : (p.title || ''),
    emoji: has('emoji') ? cleanText(raw.emoji, 8) : (p.emoji || ''),
    body: has('body') ? multi(raw.body, 20000) : (p.body || ''),
    summary: has('summary') ? cleanText(raw.summary, 400) : (p.summary || ''),
    category: has('category') ? (CATEGORIES.includes(raw.category) ? raw.category : 'News') : (p.category || 'News'),
    link: has('link') ? cleanUrl(raw.link) : (p.link || ''),
    linkText: has('linkText') ? cleanText(raw.linkText, 40) : (p.linkText || ''),
    showUntil: has('showUntil') ? (isDay(raw.showUntil) ? raw.showUntil : '') : (p.showUntil || ''),
    eventDate: has('eventDate') ? (isDay(raw.eventDate) ? raw.eventDate : '') : (p.eventDate || ''),
    eventTime: has('eventTime') ? cleanText(raw.eventTime, 60) : (p.eventTime || ''),
    location: has('location') ? cleanText(raw.location, 120) : (p.location || ''),
    status: has('status') ? (raw.status === 'hidden' ? 'hidden' : 'live') : (p.status || 'live'),
    featured: kind === 'event' ? (has('featured') ? !!raw.featured : !!p.featured) : false,   // ⭐ shown on Home, Links and business pages
    imgId: has('imgId') ? (/^e[a-z0-9]{6,30}$/.test(String(raw.imgId)) ? String(raw.imgId) : '') : (p.imgId || ''),
  };
  if (!out.title) throw new HttpError(400, 'title_required', 'Please add a title.');
  if (!out.body && kind !== 'event') throw new HttpError(400, 'body_required', 'Please add the message.');
  if (kind === 'event' && !out.eventDate) throw new HttpError(400, 'date_required', 'Please add the event date.');
  if (!out.summary) out.summary = out.body.replace(/\*\*/g, '').split('\n').map(s => s.trim()).filter(Boolean).join(' ').slice(0, 220);
  out.html = toHtml(out.body);
  return out;
}

async function load() { return (await getJson(KEY)) || { items: {} }; }
function sorted(items) { return Object.values(items).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))); }
async function list() { return sorted((await load()).items); }

async function save(raw, by) {
  let saved;
  await cas(KEY, cur => {
    cur = cur || { items: {} };
    const id = raw && raw.id && cur.items[raw.id] ? raw.id : null;
    const prev = id ? cur.items[id] : null;
    if (!prev && Object.keys(cur.items).length >= MAX_ITEMS) throw new HttpError(400, 'full', 'Too many app posts — delete some old ones first.');
    const now = core.nowIso();
    const c = clean(raw, prev);
    const taken = new Set(Object.values(cur.items).filter(x => x.id !== id).map(x => x.slug));
    saved = { ...(prev || {}), ...c, id: id || newId(), updatedAt: now, by: by || '' };
    if (!prev) { saved.createdAt = now; saved.publishedAt = now; saved.slug = slugify(c.title, taken); }
    cur.items[saved.id] = saved;
    return cur;
  });
  return saved;
}

async function remove(id) {
  let gone = false;
  await cas(KEY, cur => {
    if (!cur || !cur.items[id]) return undefined;
    delete cur.items[id]; gone = true;
    return cur;
  });
  if (!gone) throw new HttpError(404, 'not_found', 'That post no longer exists.');
  return true;
}

// What the public app sees: live posts only; updates past their "show until" day and events that have
// already happened are left out automatically (UK days).
// one-off: the Summit event becomes a Featured event (Seun can switch it off in HQ afterwards)
async function onceFeature() {
  if (await getJson('app/once-summit').catch(() => null)) return;
  await cas(KEY, cur => { if (!cur || !cur.items) return undefined; let n = 0; for (const p of Object.values(cur.items)) if (p.kind === 'event' && /summit/i.test(p.title) && p.status === 'live') { p.featured = true; n++; } return n ? cur : undefined; }).catch(() => {});
  await core.setJson('app/once-summit', { at: core.nowIso() }).catch(() => {});
}
async function publicFeed() {
  await onceFeature();
  const today = core.dayKey();
  const all = (await list()).filter(p => p.status === 'live');
  const pick = p => ({ id: p.id, kind: p.kind, slug: p.slug, title: p.title, emoji: p.emoji, html: p.html, summary: p.summary,
    category: p.category, link: p.link, linkText: p.linkText, showUntil: p.showUntil, eventDate: p.eventDate,
    eventTime: p.eventTime, location: p.location, imgId: p.imgId || '', featured: !!p.featured, publishedAt: p.publishedAt, updatedAt: p.updatedAt });
  return {
    updates: all.filter(p => p.kind === 'update' && (!p.showUntil || p.showUntil >= today)).map(pick),
    articles: all.filter(p => p.kind === 'article').map(pick),
    events: all.filter(p => p.kind === 'event' && p.eventDate >= today).sort((a, b) => a.eventDate.localeCompare(b.eventDate)).map(pick),
    at: core.nowIso(),
  };
}

module.exports = { KINDS, CATEGORIES, list, save, remove, publicFeed, toHtml };
