'use strict';
/*
 * ✨ Instagram Glow-Up — the paid page-revamp service, run from Auntie Tobi HQ (admin only).
 *   glowup/clients  { items: { <id>: client } }
 *   glowup/lib      { cats: { <category>: [ { h, works, copy, at } ] } }   competitor notes reused between clients
 *   client = { id, name, handle, pkg, price, phone, email, cat, paidAt, due, token, done: { '1': iso … '10': iso },
 *              form: { answers, at }, audit: { <area>: { s: 'good'|'fix'|'missing', note } }, auditNote,
 *              comps: [ { h, works, copy } ], notes, after: { followers, views, enquiries, at }, createdAt, updatedAt }
 *   The client's form: /glowup-form?t=<token>  (public, no sign-in; answers only, once per token unless reopened)
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, cas, getJson } = core;
const KEY = 'glowup/clients', LIB = 'glowup/lib';

const PKGS = { starter: { name: 'Starter', price: 35, days: 3 }, glowup: { name: 'Glow-Up', price: 75, days: 5 }, dfy: { name: 'Glow-Up + Done for you', price: 150, days: 7 } };
const STEPS = ['Enquiry', 'Paid', 'Form', 'Audit', 'Competitors', 'Plan', 'Report', 'Send', 'Check-in', 'Review'];
const AREAS = [
  ['photo', 'Profile photo', 'Clear logo or face, readable at small size'],
  ['name', 'Name field', 'Includes a search word (e.g. “Perfume Oils UK”)'],
  ['bio', 'Bio', 'What they sell, who for, where, one clear next step'],
  ['link', 'Link', 'One link that leads to ordering, and it works'],
  ['highlights', 'Highlights', 'Prices, Reviews, How to order, Delivery, About'],
  ['grid', 'Grid (last 12 posts)', 'Consistent; you can tell what they sell in 3 seconds'],
  ['mix', 'Content mix', 'Entertaining, teaching, trust and selling posts'],
  ['reels', 'Reels', 'How many in 30 days, best views, strong first 3 seconds'],
  ['people', 'Real people', 'Owner or customers seen anywhere'],
  ['captions', 'Captions', 'Call to action, prices mentioned, sensible hashtags'],
  ['journey', 'Sales journey', 'From a Reel to a paid order: steps, dead ends'],
  ['numbers', 'Numbers', 'Followers, posts in 30 days, average views, best post'],
];
const QUESTIONS = [   // short on purpose: name, Instagram, town and contact come from their Auntie Tobi listing
  ['goal', 'What’s your main goal?', 'choice', ['More followers', 'More enquiries', 'More sales']],
  ['products', 'Your top 3 products or services, with prices', 'long'],
  ['customers', 'Who are your best customers? (age, where they live, what they buy)', 'long'],
  ['film', 'Are you happy to film yourself for Reels?', 'choice', ['Yes', 'A little', 'No — faceless content please']],
  ['now', 'Your numbers now: followers, and roughly how many enquiries a week', 'short'],
  ['share', 'Can we share your before-and-after as an example?', 'choice', ['Yes', 'No']],
]
const clean = (v, n) => core.cleanText(String(v == null ? '' : v), n || 200);
const day = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const addDays = (d, n) => { const x = new Date((d || core.nowIso().slice(0, 10)) + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

async function all() { return ((await getJson(KEY).catch(() => null)) || { items: {} }).items || {}; }
async function list() { const it = await all(); return { clients: Object.values(it).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), pkgs: PKGS, steps: STEPS, areas: AREAS, questions: QUESTIONS }; }

function cleanComp(c) { return { h: clean(c && c.h, 60).replace(/^@?/, '@').replace(/^@$/, ''), works: clean(c && c.works, 240), copy: clean(c && c.copy, 240) }; }
// create or update a client (only the fields sent change)
async function save(raw, by) {
  raw = raw || {};
  let out = null;
  await cas(KEY, cur => {
    cur = cur || { items: {} }; cur.items = cur.items || {};
    const id = raw.id && cur.items[raw.id] ? raw.id : null;
    if (!id && !clean(raw.name, 80)) throw new HttpError(400, 'name', 'Add the business name.');
    const c = id ? Object.assign({}, cur.items[id]) : { id: crypto.randomBytes(6).toString('hex'), token: crypto.randomBytes(12).toString('base64url'), done: {}, audit: {}, comps: [], createdAt: core.nowIso(), by };
    const has = k => Object.prototype.hasOwnProperty.call(raw, k);
    if (has('name')) c.name = clean(raw.name, 80);
    if (has('handle')) c.handle = clean(raw.handle, 40).replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '');
    if (has('pkg')) c.pkg = PKGS[raw.pkg] ? raw.pkg : 'glowup';
    if (has('price')) c.price = Math.max(0, Math.min(5000, Math.round(Number(raw.price) || 0)));
    if (has('phone')) c.phone = clean(raw.phone, 30);
    if (has('email')) c.email = clean(raw.email, 120).toLowerCase();
    if (has('cat')) c.cat = clean(raw.cat, 40).toLowerCase();
    if (has('notes')) c.notes = clean(raw.notes, 2000);
    if (has('paidAt')) c.paidAt = day(raw.paidAt);
    if (has('due')) c.due = day(raw.due);
    if (has('auditNote')) c.auditNote = clean(raw.auditNote, 1000);
    if (has('audit') && raw.audit && typeof raw.audit === 'object') {
      c.audit = {};
      AREAS.forEach(([k]) => { const a = raw.audit[k]; if (a && (a.s || a.note)) c.audit[k] = { s: ['good', 'fix', 'missing'].indexOf(a.s) >= 0 ? a.s : '', note: clean(a.note, 240) }; });
    }
    if (has('comps') && Array.isArray(raw.comps)) c.comps = raw.comps.slice(0, 8).map(cleanComp).filter(x => x.h || x.works);
    if (has('listing') && raw.listing) { const L = raw.listing; c.listing = L.slug ? { slug: clean(L.slug, 80), url: clean(L.url, 200), loc: clean(L.loc, 80), desc: clean(L.desc, 600), website: clean(L.website, 200) } : null; }
    if (has('answers') && raw.answers && typeof raw.answers === 'object') {   // answers typed in by Auntie Tobi (asked on WhatsApp)
      const a = {}; QUESTIONS.forEach(([k, , type, opts]) => { const v = raw.answers[k]; if (v) a[k] = type === 'choice' ? (opts.indexOf(v) >= 0 ? v : '') : clean(v, type === 'long' ? 1200 : 300); });
      c.form = { answers: a, at: core.nowIso(), by: 'hq' }; c.done = c.done || {}; if (Object.keys(a).length) c.done['3'] = c.done['3'] || core.nowIso();
    }
    if (has('after') && raw.after) c.after = { followers: clean(raw.after.followers, 20), views: clean(raw.after.views, 20), enquiries: clean(raw.after.enquiries, 20), at: core.nowIso() };
    if (!c.pkg) c.pkg = 'glowup';
    if (c.price == null) c.price = PKGS[c.pkg].price;
    if (c.paidAt && !c.done['2']) { c.done['1'] = c.done['1'] || core.nowIso(); c.done['2'] = core.nowIso(); }
    if (c.paidAt && !c.due) c.due = addDays(c.paidAt, PKGS[c.pkg].days);
    if (!id) c.done['1'] = core.nowIso();
    c.updatedAt = core.nowIso();
    cur.items[c.id] = c; out = c;
    return cur;
  });
  return out;
}
// tick a step done (or not). Step 8 (Send) needs the report ready first; done step 8 sets the 30-day check-in date.
async function step(id, n, on) {
  n = String(Math.round(Number(n))); if (!(+n >= 1 && +n <= 10)) throw new HttpError(400, 'step', 'Unknown step.');
  let out = null;
  await cas(KEY, cur => {
    const c = cur && cur.items && cur.items[id]; if (!c) throw new HttpError(404, 'not_found', 'That client no longer exists.');
    c.done = c.done || {};
    if (on) { c.done[n] = core.nowIso(); if (n === '8') c.checkin = addDays(core.nowIso().slice(0, 10), 30); }
    else delete c.done[n];
    c.updatedAt = core.nowIso(); out = c; return cur;
  });
  return out;
}
async function del(id) { await cas(KEY, cur => { if (!cur || !cur.items || !cur.items[id]) return undefined; delete cur.items[id]; return cur; }); return { ok: true }; }
async function reopenForm(id) { let out = null; await cas(KEY, cur => { const c = cur && cur.items && cur.items[id]; if (!c) return undefined; c.formOpen = true; out = c; return cur; }); return out; }

// 📚 competitor notes by category, so the next client in the same category starts with them
async function lib() { return ((await getJson(LIB).catch(() => null)) || { cats: {} }).cats || {}; }
async function libAdd(cat, comps) {
  cat = clean(cat, 40).toLowerCase(); if (!cat) throw new HttpError(400, 'cat', 'Pick a category first.');
  const add = (comps || []).map(cleanComp).filter(x => x.h);
  await cas(LIB, cur => {
    cur = cur || { cats: {} }; cur.cats = cur.cats || {};
    const have = cur.cats[cat] || [];
    add.forEach(x => { const i = have.findIndex(y => y.h.toLowerCase() === x.h.toLowerCase()); const v = Object.assign({}, x, { at: core.nowIso() }); if (i >= 0) have[i] = v; else have.push(v); });
    cur.cats[cat] = have.slice(-40); return cur;
  });
  return lib();
}

// ── the client's form (public) ──
async function byToken(t) { t = String(t || ''); if (!/^[A-Za-z0-9_-]{10,40}$/.test(t)) return null; return Object.values(await all()).find(c => c.token === t) || null; }
async function formGet(t) {
  const c = await byToken(t); if (!c) throw new HttpError(404, 'not_found', 'This link isn’t valid. Please message Auntie Tobi.');
  return { name: c.name, handle: c.handle || '', questions: QUESTIONS, done: !!(c.form && c.form.at && !c.formOpen), answers: (c.form && c.form.answers) || {} };
}
async function formSend(t, answers, ip) {
  await core.rateLimit('glowup-form', ip || 'x', 20, 60 * 60 * 1000, 'Please try again in a little while.');
  const c0 = await byToken(t); if (!c0) throw new HttpError(404, 'not_found', 'This link isn’t valid. Please message Auntie Tobi.');
  const a = {};
  QUESTIONS.forEach(([k, , type, opts]) => { const v = answers && answers[k]; if (v == null) return; a[k] = type === 'choice' ? (opts.indexOf(v) >= 0 ? v : '') : clean(v, type === 'long' ? 1200 : 300); });
  if (!a.products) throw new HttpError(400, 'missing', 'Please tell us your top products or services.');
  await cas(KEY, cur => {
    const c = cur && cur.items && cur.items[c0.id]; if (!c) return undefined;
    if (c.form && c.form.at && !c.formOpen) throw new HttpError(400, 'done', 'Thank you — we already have your answers. Message Auntie Tobi to change anything.');
    c.form = { answers: a, at: core.nowIso() }; c.formOpen = false; c.done = c.done || {}; c.done['3'] = core.nowIso(); c.updatedAt = core.nowIso();
    return cur;
  });
  return { ok: true };
}
module.exports = { list, save, step, del, reopenForm, lib, libAdd, formGet, formSend, PKGS, STEPS, AREAS, QUESTIONS };
