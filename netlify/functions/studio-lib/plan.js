'use strict';
/*
 * Plan — the member's content hub (like Auntie Tobi HQ): content cards on a board, a calendar and a posted list.
 * Cards live in the existing calendar blob so the 7/30-day planner, Today and the dashboard keep working.
 *   calendar/<email>        { items: [card] }
 *   planimg/<email>/<id>    { dataUrl }  (one photo per card, resized on the phone)
 * card: { id, title, type, caption, hashtags, notes, date, time, status, hook, cta, format, contentId,
 *         postedAt, postLink, postCounted, hasImg, fromPlanner, edited, createdAt, updatedAt }
 * status: idea → drafting → ready → scheduled (has a date) → posted
 */
const core = require('./core');
const { HttpError, cas, getJson, setJson, del, enc, cleanText } = core;

const TYPES = ['post', 'reel', 'carousel', 'story', 'whatsapp'];
const STATUSES = ['idea', 'drafting', 'ready', 'scheduled', 'posted'];
const MAX = 400;
const key = email => `calendar/${enc(email)}`;
const imgKey = (email, id) => `planimg/${enc(email)}/${id}`;
const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && !isNaN(Date.parse(d));
const isTime = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t || ''));
const multi = (s, n) => String(s || '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);
const newId = () => `k${Date.now().toString(36)}${core.randomToken(4).replace(/[^A-Za-z0-9]/g, '').slice(0, 5)}`;

function typeOf(x) {
  if (TYPES.includes(x)) return x;
  const f = String(x || '').toLowerCase();
  return /reel|video|tiktok/.test(f) ? 'reel' : /carousel/.test(f) ? 'carousel' : /stor/.test(f) ? 'story' : /whatsapp/.test(f) ? 'whatsapp' : 'post';
}
// Older calendar items (todo / drafted / posted / done) shown as cards.
function normalize(i) {
  let status = i.status;
  if (status === 'posted' || status === 'done') status = 'posted';
  else if (!STATUSES.includes(status)) status = i.date ? 'scheduled' : (status === 'drafted' ? 'drafting' : 'ready');
  if (status !== 'posted' && i.date && status !== 'scheduled') status = 'scheduled';
  if (status === 'scheduled' && !i.date) status = 'ready';
  return {
    ...i, status, type: typeOf(i.type || i.format), caption: i.caption || '', hashtags: i.hashtags || '', time: i.time || '',
    notes: i.notes != null ? i.notes : [i.hook ? `Hook: ${i.hook}` : '', i.cta ? `CTA: ${i.cta}` : ''].filter(Boolean).join('\n'),
    drafted: !!i.drafted || i.status === 'drafted',
  };
}

async function list(email) {
  const items = (((await getJson(key(email))) || {}).items || []).map(normalize);
  return items.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.time || '').localeCompare(b.time || '') || (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
}

function clean(raw, prev) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const p = prev || {};
  const has = k => raw[k] !== undefined;
  const title = has('title') ? cleanText(raw.title, 140) : p.title || '';
  if (title.length < 2) throw new HttpError(400, 'missing_field', 'Give the card a short title.');
  const date = has('date') ? (isDay(raw.date) ? raw.date : '') : p.date || '';
  let status = has('status') ? (STATUSES.includes(raw.status) ? raw.status : 'idea') : p.status || 'idea';
  if (status !== 'posted') { if (date) status = 'scheduled'; else if (status === 'scheduled') status = 'ready'; }
  return {
    title, date, status,
    type: has('type') ? typeOf(raw.type) : p.type || 'post',
    time: has('time') ? (isTime(raw.time) ? raw.time : '') : p.time || '',
    caption: has('caption') ? multi(raw.caption, 4000) : p.caption || '',
    hashtags: has('hashtags') ? multi(raw.hashtags, 600) : p.hashtags || '',
    notes: has('notes') ? multi(raw.notes, 1500) : p.notes || '',
    contentId: has('contentId') ? (/^[A-Za-z0-9_-]{4,40}$/.test(String(raw.contentId || '')) ? String(raw.contentId) : '') : p.contentId || '',
    postLink: has('postLink') ? safeLink(raw.postLink) : p.postLink || '',
  };
}
function safeLink(v) {
  const s = String(v || '').trim(); if (!s) return '';
  try { const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); return u.protocol === 'https:' && u.hostname.includes('.') ? u.toString().slice(0, 500) : ''; } catch { return ''; }
}

async function save(email, raw) {
  const id = raw && raw.id ? String(raw.id).slice(0, 40) : '';
  let out = null, becamePosted = false;
  await cas(key(email), cur => {
    const items = ((cur && cur.items) || []).slice();
    const now = core.nowIso();
    if (id) {
      const i = items.findIndex(x => x.id === id);
      if (i < 0) throw new HttpError(404, 'not_found', 'That card no longer exists.');
      const prev = normalize(items[i]);
      const c = clean(raw, prev);
      out = { ...items[i], ...c, edited: true, updatedAt: now };
      if (c.status === 'posted' && prev.status !== 'posted') { out.postedAt = now; becamePosted = !items[i].postCounted; out.postCounted = true; }
      if (c.status !== 'posted') out.postedAt = '';
      items[i] = out;
    } else {
      if (items.length >= MAX) throw new HttpError(400, 'too_many', 'Your plan is full — delete some old cards first.');
      const c = clean(raw, null);
      out = { id: newId(), ...c, createdAt: now, updatedAt: now };
      if (c.status === 'posted') { out.postedAt = now; out.postCounted = true; becamePosted = true; }
      items.push(out);
    }
    return { items };
  });
  if (becamePosted) await countPost(email);
  return normalize(out);
}
async function countPost(email) {
  const growth = require('./growth');
  await growth.addPost(email).catch(() => {});
  await growth.pilotBump(email, 'postsMarked').catch(() => {});
}

// Mark as posted (with an optional link to the post). Counts once in Track.
async function posted(email, id, link) {
  return save(email, { id, status: 'posted', postLink: link || '' });
}

async function remove(email, id) {
  await cas(key(email), cur => (cur ? { items: cur.items.filter(i => i.id !== id) } : undefined));
  await del(imgKey(email, id)).catch(() => {});
}

async function setImage(email, id, dataUrl) {
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(dataUrl || ''))) throw new HttpError(400, 'invalid', 'Please choose a JPG, PNG or WebP photo.');
  if (dataUrl.length > 1400000) throw new HttpError(413, 'too_large', 'That photo is too large.');
  let found = false;
  await cas(key(email), cur => {
    if (!cur) return undefined;
    const items = cur.items.map(i => (i.id === id ? (found = true, { ...i, hasImg: true, updatedAt: core.nowIso() }) : i));
    return { items };
  });
  if (!found) throw new HttpError(404, 'not_found', 'That card no longer exists.');
  await setJson(imgKey(email, id), { dataUrl, at: core.nowIso() });
  return { ok: true };
}
async function getImage(email, id) { const r = await getJson(imgKey(email, id)); return r ? r.dataUrl : ''; }
async function deleteImage(email, id) {
  await del(imgKey(email, id)).catch(() => {});
  await cas(key(email), cur => (cur ? { items: cur.items.map(i => (i.id === id ? { ...i, hasImg: false } : i)) } : undefined));
}

module.exports = { list, save, posted, remove, setImage, getImage, deleteImage, normalize, countPost, TYPES, STATUSES };
