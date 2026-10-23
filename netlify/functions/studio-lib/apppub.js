'use strict';
/*
 * Auntie Tobi HQ — "Publish to App". Updates, articles and events written in HQ and shown in the main app.
 * Written only through studio-hq (HQ sign-in). Read publicly through app-content (live items only).
 *
 *   hq/app-posts   { items: { <id>: post } }
 *
 * post: { id, kind, title, emoji, body, html, summary, category, link, linkText, imgId (flyer, from event submissions),
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
const CATEGORIES = ['News', 'Money', 'Housing', 'Lifestyle', 'Business', 'Did You Know', 'Travel', 'Family', 'Health', 'Education', 'Food'];
const MAX_ITEMS = 500;
const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const newId = () => `a${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const multi = (s, n) => String(s || '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cleanUrl = u => { u = String(u || '').trim(); return /^https?:\/\/[^\s"'<>]{3,500}$/i.test(u) ? u : ''; };

// Plain text → safe HTML. **bold**, "• " / "- " bullet lines, links, blank line = new paragraph,
// a short line ending in "?" or ":" on its own = a small heading.
function toHtml(text) {
  const link = s => s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, u => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//, '')}</a>`);
  const inline = s => link(esc(s)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const out = [];
  let list = null;
  const flush = () => { if (list) { out.push(`<ul>${list.map(li => `<li>${inline(li)}</li>`).join('')}</ul>`); list = null; } };
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const b = /^(?:[•\-*–]|\d+[.)])\s+(.*)$/.exec(line);
    if (b) { (list = list || []).push(b[1]); continue; }
    flush();
    if (line.length <= 60 && /[?:]$/.test(line) && !/https?:/.test(line)) out.push(`<h3>${inline(line.replace(/:$/, ''))}</h3>`);
    else out.push(`<p>${inline(line)}</p>`);
  }
  flush();
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
    body: has('body') ? multi(raw.body, 12000) : (p.body || ''),
    summary: has('summary') ? cleanText(raw.summary, 400) : (p.summary || ''),
    category: has('category') ? (CATEGORIES.includes(raw.category) ? raw.category : 'News') : (p.category || 'News'),
    link: has('link') ? cleanUrl(raw.link) : (p.link || ''),
    linkText: has('linkText') ? cleanText(raw.linkText, 40) : (p.linkText || ''),
    showUntil: has('showUntil') ? (isDay(raw.showUntil) ? raw.showUntil : '') : (p.showUntil || ''),
    eventDate: has('eventDate') ? (isDay(raw.eventDate) ? raw.eventDate : '') : (p.eventDate || ''),
    eventTime: has('eventTime') ? cleanText(raw.eventTime, 60) : (p.eventTime || ''),
    location: has('location') ? cleanText(raw.location, 120) : (p.location || ''),
    status: has('status') ? (raw.status === 'hidden' ? 'hidden' : 'live') : (p.status || 'live'),
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
async function publicFeed() {
  const today = core.dayKey();
  const all = (await list()).filter(p => p.status === 'live');
  const pick = p => ({ id: p.id, kind: p.kind, slug: p.slug, title: p.title, emoji: p.emoji, html: p.html, summary: p.summary,
    category: p.category, link: p.link, linkText: p.linkText, showUntil: p.showUntil, eventDate: p.eventDate,
    eventTime: p.eventTime, location: p.location, imgId: p.imgId || '', publishedAt: p.publishedAt, updatedAt: p.updatedAt });
  return {
    updates: all.filter(p => p.kind === 'update' && (!p.showUntil || p.showUntil >= today)).map(pick),
    articles: all.filter(p => p.kind === 'article').map(pick),
    events: all.filter(p => p.kind === 'event' && p.eventDate >= today).sort((a, b) => a.eventDate.localeCompare(b.eventDate)).map(pick),
    at: core.nowIso(),
  };
}

module.exports = { KINDS, CATEGORIES, list, save, remove, publicFeed, toHtml };
