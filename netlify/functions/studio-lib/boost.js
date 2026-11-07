'use strict';
/*
 * 🚀 After posting (HQ, admin only): a timed checklist for each Instagram post, its link, and its 24-hour numbers,
 * so HQ can say how a post compares with your usual and list your best posts.
 *   hq/boost   { items: [{ key, kind: 'disc' | 'hub', ref, title, url, postedAt, steps: { <stepId>: iso }, stats: { views, likes, comments, shares, saves, at }, updatedAt }] }
 * key = '<kind>:<ref>' (the Discovery part id or the Content Hub card id). Nothing is posted for you.
 */
const core = require('./core');
const { HttpError, cas, getJson, cleanText } = core;

const KEY = 'hq/boost', MAX = 500;
const STEP = /^[a-z0-9_]{2,24}$/;
const okKey = k => /^(disc|hub):[A-Za-z0-9_-]{4,60}$/.test(String(k || ''));
const okUrl = u => !u || /^https:\/\/(www\.)?instagram\.com\//i.test(u);
const n = v => { const x = Math.round(Number(String(v == null ? '' : v).replace(/[,\s]/g, ''))); return isFinite(x) && x >= 0 && x < 1e9 ? x : null; };

async function list() { return ((await getJson(KEY).catch(() => null)) || { items: [] }).items; }

// Merge one post's changes: { key, kind, ref, title, url, postedAt, steps: { id: true|false }, stats: {…} }
async function save(raw) {
  raw = raw || {};
  if (!okKey(raw.key)) throw new HttpError(400, 'invalid', 'That post can’t be found.');
  const url = raw.url === undefined ? undefined : String(raw.url || '').trim();
  if (url !== undefined && !okUrl(url)) throw new HttpError(400, 'invalid', 'Paste the Instagram post link (instagram.com/p/… or /reel/…).');
  let out;
  await cas(KEY, cur => {
    cur = cur || { items: [] };
    let x = cur.items.find(i => i.key === raw.key);
    if (!x) { x = { key: raw.key, kind: raw.key.split(':')[0], ref: raw.key.split(':')[1], title: '', url: '', postedAt: core.nowIso(), steps: {}, stats: null }; cur.items.push(x); }
    if (raw.title !== undefined) x.title = cleanText(raw.title, 160);
    if (url !== undefined) x.url = url;
    if (raw.postedAt && !isNaN(Date.parse(raw.postedAt))) x.postedAt = new Date(raw.postedAt).toISOString();
    if (raw.steps && typeof raw.steps === 'object') Object.keys(raw.steps).slice(0, 30).forEach(id => { if (!STEP.test(id)) return; if (raw.steps[id]) x.steps[id] = x.steps[id] || core.nowIso(); else delete x.steps[id]; });
    if (raw.stats && typeof raw.stats === 'object') {
      const s = { views: n(raw.stats.views), likes: n(raw.stats.likes), comments: n(raw.stats.comments), shares: n(raw.stats.shares), saves: n(raw.stats.saves) };
      x.stats = Object.values(s).some(v => v !== null) ? Object.assign(s, { at: core.nowIso() }) : null;
    }
    x.updatedAt = core.nowIso();
    cur.items.sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt)));
    cur.items = cur.items.slice(0, MAX);
    out = x;
    return cur;
  });
  return out;
}

module.exports = { list, save };
