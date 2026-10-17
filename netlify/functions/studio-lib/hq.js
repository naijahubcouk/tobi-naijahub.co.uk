'use strict';
/*
 * Auntie Tobi HQ — Auntie Tobi's private Content Hub (/hq). Admin only. No AI.
 * Paste content ideas from ChatGPT (split into cards in the browser by /hq-split.js), review, plan, post, track.
 *
 *   hq/content    { items: { <id>: card } }
 *   hq/img/<id>   { dataUrl, at }     (images on cards, resized in the browser)
 *
 * card: { id, title, type, topic, script, caption, hashtags: [], keywords, notes, status, starred, source,
 *         planDate, planTime, postedAt, postLink, imgs: [], createdAt, updatedAt, deletedAt? }
 * status: idea | drafting | ready | scheduled | posted | archived
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, cas, getJson, setJson, cleanText } = core;

const KEY = 'hq/content';
const TEAM_KEY = 'hq/team';   // { emails: [] } — people who can sign in to HQ only (not Admin)
const DEFAULT_TEAM = ['hellofavouradentan@gmail.com'];
const DEFAULT_NAMES = { 'hellofavouradentan@gmail.com': 'Favour' };
const TYPES = ['post', 'reel', 'carousel', 'story', 'blog'];
const TOPICS = ['discovery', 'uk-info', 'community', 'promo', 'event', 'motivation'];
const STATUSES = ['idea', 'drafting', 'ready', 'scheduled', 'posted', 'archived'];
const SOURCES = ['chatgpt', 'me'];
const MAX_ITEMS = 3000, TRASH_DAYS = 30;
const newId = p => `${p}${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const isTime = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t || ''));
const multi = (s, n) => String(s || '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);

function clean(raw, prev) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const p = prev || {};
  const pick = (k, list, def) => (list.includes(raw[k]) ? raw[k] : (raw[k] === undefined ? (p[k] || def) : def));
  const out = {
    title: raw.title !== undefined ? cleanText(raw.title, 140) : (p.title || ''),
    type: pick('type', TYPES, 'post'),
    topic: pick('topic', TOPICS, 'community'),
    script: raw.script !== undefined ? multi(raw.script, 8000) : (p.script || ''),
    caption: raw.caption !== undefined ? multi(raw.caption, 8000) : (p.caption || ''),
    hashtags: raw.hashtags !== undefined ? [...new Set((Array.isArray(raw.hashtags) ? raw.hashtags : String(raw.hashtags || '').split(/[\s,]+/))
      .map(t => String(t).trim()).filter(Boolean).map(t => (t.startsWith('#') ? t : `#${t}`)).filter(t => /^#[0-9A-Za-z_À-ɏ]{1,60}$/.test(t)))].slice(0, 40) : (p.hashtags || []),
    keywords: raw.keywords !== undefined ? cleanText(raw.keywords, 300) : (p.keywords || ''),
    notes: raw.notes !== undefined ? multi(raw.notes, 4000) : (p.notes || ''),
    status: pick('status', STATUSES, 'idea'),
    starred: raw.starred !== undefined ? !!raw.starred : !!p.starred,
    planDate: raw.planDate !== undefined ? (isDay(raw.planDate) ? raw.planDate : '') : (p.planDate || ''),
    planTime: raw.planTime !== undefined ? (isTime(raw.planTime) ? raw.planTime : '') : (p.planTime || ''),
    postLink: raw.postLink !== undefined ? (/^https?:\/\/\S{3,300}$/i.test(String(raw.postLink).trim()) ? String(raw.postLink).trim() : '') : (p.postLink || ''),
    imgs: raw.imgs !== undefined ? (Array.isArray(raw.imgs) ? raw.imgs : []).filter(id => /^i[a-z0-9]{6,30}$/.test(String(id))).slice(0, 6) : (p.imgs || []),
  };
  if (!out.title) out.title = ((out.caption || out.script).split('\n').find(l => l.trim()) || 'Untitled idea').replace(/[*_#>]/g, '').trim().slice(0, 80) || 'Untitled idea';
  // A date on the plan makes it "scheduled"; taking the date off sends it back to "ready".
  if (raw.planDate !== undefined) {
    if (out.planDate && ['idea', 'drafting', 'ready'].includes(out.status)) out.status = 'scheduled';
    if (!out.planDate && out.status === 'scheduled') out.status = 'ready';
  }
  if (out.status === 'posted' && p.status !== 'posted') out.postedAt = raw.postedAt && isDay(String(raw.postedAt).slice(0, 10)) ? String(raw.postedAt) : core.nowIso();
  else if (out.status === 'posted') out.postedAt = p.postedAt || core.nowIso();
  else out.postedAt = '';
  return out;
}

async function load() { return (await getJson(KEY)) || { items: {} }; }
function live(items) { return Object.values(items).filter(c => !c.deletedAt); }

async function list() {
  const s = await load();
  return live(s.items).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

async function save(raw, by) {
  raw = raw && typeof raw === 'object' ? raw : {};
  by = by ? String(by).slice(0, 200) : '';
  let out;
  await cas(KEY, cur => {
    const s = cur ? { items: { ...cur.items } } : { items: {} };
    const now = core.nowIso();
    if (raw.id) {
      const prev = s.items[raw.id];
      if (!prev || prev.deletedAt) throw new HttpError(404, 'not_found', 'That card no longer exists.');
      out = { ...prev, ...clean(raw, prev), id: prev.id, source: prev.source, createdAt: prev.createdAt, updatedAt: now, updatedBy: by || prev.updatedBy || '' };
    } else {
      if (live(s.items).length >= MAX_ITEMS) throw new HttpError(400, 'too_many', 'You have a lot of cards — delete or archive some first.');
      const c = clean(raw);
      if (!c.caption && !c.script && c.title === 'Untitled idea') throw new HttpError(400, 'invalid', 'Type or paste the idea first.');
      out = { id: newId('k'), ...c, source: SOURCES.includes(raw.source) ? raw.source : 'me', createdAt: now, updatedAt: now, createdBy: by, updatedBy: by };
    }
    s.items[out.id] = out;
    return tidy(s);
  });
  return out;
}

// Several cards at once (from the paste preview).
async function saveMany(cards, source, by) {
  by = by ? String(by).slice(0, 200) : '';
  cards = (Array.isArray(cards) ? cards : []).slice(0, 60);
  if (!cards.length) throw new HttpError(400, 'invalid', 'Nothing to save.');
  const out = [];
  await cas(KEY, cur => {
    const s = cur ? { items: { ...cur.items } } : { items: {} };
    if (live(s.items).length + cards.length > MAX_ITEMS) throw new HttpError(400, 'too_many', 'You have a lot of cards — delete or archive some first.');
    const base = Date.now();
    out.length = 0;
    cards.forEach((raw, i) => {
      const c = clean({ ...raw, status: 'idea' });
      if (!c.caption && !c.script && c.title === 'Untitled idea') return;
      // Newest first on the Board, so the first card of the paste gets the latest time — keeps the paste's order.
      const at = new Date(base - i).toISOString();
      const card = { id: newId('k'), ...c, source: SOURCES.includes(source) ? source : 'chatgpt', createdAt: at, updatedAt: at, createdBy: by, updatedBy: by };
      s.items[card.id] = card; out.push(card);
    });
    return tidy(s);
  });
  return out;
}

// Delete goes to a 30-day bin so it can be undone.
async function remove(ids, restore, by) {
  ids = (Array.isArray(ids) ? ids : [ids]).map(String).slice(0, 200);
  let n = 0;
  await cas(KEY, cur => {
    if (!cur) return undefined;
    const s = { items: { ...cur.items } };
    for (const id of ids) {
      const c = s.items[id]; if (!c) continue;
      if (restore ? !c.deletedAt : c.deletedAt) continue;
      s.items[id] = restore ? (() => { const x = { ...c }; delete x.deletedAt; delete x.deletedBy; if (by) { x.restoredBy = String(by).slice(0, 200); x.restoredAt = core.nowIso(); } return x; })() : { ...c, deletedAt: core.nowIso(), deletedBy: by ? String(by).slice(0, 200) : '' };
      n++;
    }
    return tidy(s);
  });
  return n;
}

// The Bin: deleted cards, newest first, with days left before they go for good.
async function bin() {
  const s = await load();
  const now = Date.now();
  return Object.values(s.items).filter(c => c.deletedAt).map(c => ({ ...c, daysLeft: Math.max(0, Math.ceil((Date.parse(c.deletedAt) + TRASH_DAYS * core.DAY - now) / core.DAY)) }))
    .filter(c => c.daysLeft > 0).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

// Delete forever (only cards already in the Bin).
async function purge(ids) {
  ids = (Array.isArray(ids) ? ids : [ids]).map(String).slice(0, 500);
  let n = 0; const imgs = [];
  await cas(KEY, cur => {
    if (!cur) return undefined;
    const s = { items: { ...cur.items } }; n = 0; imgs.length = 0;
    for (const id of ids) { const c = s.items[id]; if (!c || !c.deletedAt) continue; imgs.push(...(c.imgs || [])); delete s.items[id]; n++; }
    return s;
  });
  for (const img of imgs) await core.del(`hq/img/${img}`).catch(() => {});
  return n;
}

function tidy(s) {
  const cutoff = Date.now() - TRASH_DAYS * core.DAY;
  for (const [id, c] of Object.entries(s.items)) {
    if (c.deletedAt && Date.parse(c.deletedAt) < cutoff) {
      delete s.items[id];
      for (const img of c.imgs || []) core.del(`hq/img/${img}`).catch(() => {});
    }
  }
  return s;
}

async function saveImage(dataUrl) {
  if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(String(dataUrl || ''))) throw new HttpError(400, 'invalid', 'Please upload a PNG, JPG or WebP image.');
  if (dataUrl.length > 2200000) throw new HttpError(413, 'too_large', 'That image is too large.');
  const id = newId('i');
  await setJson(`hq/img/${id}`, { dataUrl, at: core.nowIso() });
  return id;
}
async function getImage(id) { if (!/^i[a-z0-9]{6,30}$/.test(String(id || ''))) return null; return getJson(`hq/img/${id}`); }

// For the Admin Today list: posts planned for today that aren't posted yet.
async function plannedToday() {
  const day = core.dayKey();
  return live((await load()).items).filter(c => c.status === 'scheduled' && c.planDate === day).map(c => ({ id: c.id, title: c.title, time: c.planTime || '' }));
}

// ── HQ team (sign in to HQ only) ──
async function teamFull() { const t = await getJson(TEAM_KEY); return t && Array.isArray(t.emails) ? { emails: t.emails, names: t.names || {} } : { emails: DEFAULT_TEAM.slice(), names: { ...DEFAULT_NAMES } }; }
async function team() { return (await teamFull()).emails; }
// Display names: team names + "Auntie Tobi" for admins.
async function names() { const t = await teamFull(); const out = { ...t.names }; for (const e of core.adminEmails()) out[e] = 'Auntie Tobi'; return out; }
async function setTeam(emails, nameMap) {
  const raw = (Array.isArray(emails) ? emails : []).map(e => String(e || '').trim()).filter(Boolean);
  for (const e of raw) if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || !core.normalizeEmail(e)) throw new HttpError(400, 'invalid', `“${e.slice(0, 80)}” doesn’t look like an email address.`);
  const list = [...new Set(raw.map(e => core.normalizeEmail(e)))];
  const nm = {}; const given = nameMap && typeof nameMap === 'object' ? nameMap : {};
  for (const [k, v] of Object.entries(given)) { const e = core.normalizeEmail(k); const n = cleanText(v, 40); if (e && list.includes(e) && n) nm[e] = n; }
  if (list.length > 20) throw new HttpError(400, 'invalid', 'Up to 20 people.');
  await setJson(TEAM_KEY, { emails: list, names: nm, updatedAt: core.nowIso() });
  return { emails: list, names: nm };
}

module.exports = { team, teamFull, names, setTeam, bin, purge, TRASH_DAYS, list, save, saveMany, remove, saveImage, getImage, plannedToday, TYPES, TOPICS, STATUSES };
