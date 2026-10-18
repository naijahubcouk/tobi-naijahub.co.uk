'use strict';
/*
 * Business Club invites — follow-up system for every business listed on Auntie Tobi (Admin → Club invites).
 *   invites/state  { items: { <slug>: rec }, settings: { perDay, templates: { invite, fu1, fu2 } } }
 *   rec: { status, step, nextAt, checkBackAt, sentDays: [day…], notes, history: [{ at, what }] }
 * status: new | waiting | interested | notnow | declined | joined
 *   invite sent → waiting, follow-up 1 due in 3 days → sent → follow-up 2 due 7 days later → sent → stops (no reply).
 *   Not now → comes back on the check-back date. Not interested → never shown as due again.
 *   Businesses that are already Business Club members show as joined automatically.
 */
const core = require('./core');
const { HttpError, cas, getJson, cleanText } = core;
const directory = require('./directory');

const KEY = 'invites/state';
const GAP1 = 3, GAP2 = 7;
const STATUSES = ['new', 'waiting', 'interested', 'notnow', 'declined', 'joined'];
const STATUS_LABEL = { new: 'Not contacted', waiting: 'Waiting for reply', interested: 'Interested', notnow: 'Not now', declined: 'Not interested', joined: 'Joined' };

const DEFAULT_TEMPLATES = {
  invite: `Hi {name} 👋🏾

It’s Auntie Tobi here 💚 Your business is listed on the Auntie Tobi app — here’s your listing: {listing}

I’d love to invite you to the Auntie Tobi Business Club. Members get:
• Your business shared on Auntie Tobi’s Instagram Stories, posts and Reels every week
• Featured in our business discovery series and promotional campaigns
• A dedicated Business Spotlight or collaboration post
• Your product on the Auntie Tobi Marketplace for 12 months
• A verified badge on your listing
• Auntie Tobi Business Studio — AI tools for captions, Reels, promos and customer messages, plus a follow-up tool, tracker and business resources
• A business check-up to help you grow

Find out more and join here: {club}

Any questions, just reply here 💚`,
  fu1: `Hi {name}, just following up on my message about the Auntie Tobi Business Club 😊

Members get weekly shares on Auntie Tobi’s Stories and posts, a Business Spotlight, a Marketplace listing, a verified badge and the Business Studio tools.

Your listing: {listing}
Join here: {club}

Happy to answer any questions!`,
  fu2: `Hi {name}, one last quick check-in from Auntie Tobi 💚

If you’d like more people to discover your business, the Business Club is here for you: {club}

Your listing: {listing}

No pressure at all — wishing you a great week!`,
};

function siteUrl() { return String(core.env('STUDIO_SITE_URL', process.env.URL || 'https://www.auntietobi.co.uk')).replace(/\/$/, ''); }
const clubUrl = () => `${siteUrl()}/business-club`;
const addDays = (day, n) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const empty = () => ({ items: {}, settings: { perDay: 5, templates: {} } });

async function load() { const s = await getJson(KEY); return s ? { ...empty(), ...s, settings: { ...empty().settings, ...(s.settings || {}) } } : empty(); }
function templates(s) { return { ...DEFAULT_TEMPLATES, ...((s.settings && s.settings.templates) || {}) }; }

// Which message is next for this business.
function nextKind(rec) {
  if (!rec || rec.status === 'new') return 'invite';
  if (rec.status === 'notnow') return 'fu1';
  if (rec.status === 'waiting' || rec.status === 'interested') return (rec.step || 0) >= 2 ? 'fu2' : 'fu1';
  return 'fu1';
}
function isDue(rec, day) {
  if (!rec) return false;
  if (rec.status === 'waiting') return !!rec.nextAt && rec.nextAt <= day;
  if (rec.status === 'notnow') return !!rec.checkBackAt && rec.checkBackAt <= day;
  return false;
}
function fill(tpl, b) {
  return String(tpl).replace(/\{name\}/g, b.name || 'there').replace(/\{listing\}/g, directory.listingUrl(b.slug)).replace(/\{club\}/g, clubUrl());
}

// Club members' emails and linked listings, so they show as joined.
function joinedSet(members, profiles, settings, list) {
  const emails = new Set(), slugs = new Set();
  for (const m of members || []) {
    if (!core.access(m, settings).membershipActive) continue;
    emails.add(m.email);
    const p = profiles && profiles[m.email];
    if (p && p.listingSlug && require('./listinglinks').trusted(p)) slugs.add(p.listingSlug);
  }
  return new Set(list.filter(b => slugs.has(b.slug) || (b.email && emails.has(b.email))).map(b => b.slug));
}

// Full list for the Admin tab.
async function view(event, ctx) {
  const day = core.dayKey();
  const [list, s] = await Promise.all([directory.load(event), load()]);
  const joined = joinedSet(ctx.members, ctx.profiles, ctx.settings, list);
  const tpl = templates(s);
  const rows = list.filter(b => b.slug && b.name).map(b => {
    const rec = s.items[b.slug] || { status: 'new', step: 0, history: [] };
    const status = joined.has(b.slug) ? 'joined' : rec.status;
    const kind = nextKind(rec);
    return {
      slug: b.slug, name: b.name, cat: b.cat, loc: b.loc, wa: b.wa, ig: b.ig, email: rec.email || b.email || '', emailAdded: !!rec.email, listingEmail: b.email || '', phone: b.phone, website: b.website,
      listing: directory.listingUrl(b.slug), status, label: STATUS_LABEL[status],
      due: status !== 'joined' && isDue(rec, day), step: rec.step || 0, nextAt: rec.nextAt || '', checkBackAt: rec.checkBackAt || '',
      notes: rec.notes || '', history: (rec.history || []).slice(0, 12), lastAt: rec.lastAt || '',
      nextKind: kind, message: fill(tpl[kind], b), finished: status === 'waiting' && (rec.step || 0) >= 3,
    };
  });
  const sentToday = Object.values(s.items).filter(r => (r.sentDays || []).includes(day) && r.firstAt && core.dayKey(new Date(r.firstAt)) === day).length;
  const stats = { total: rows.length, contacted: 0, replied: 0, interested: 0, joined: 0, declined: 0, due: 0, newLeft: 0 };
  for (const r of rows) {
    if (s.items[r.slug] && s.items[r.slug].firstAt) stats.contacted++;
    if (['interested', 'notnow', 'declined'].includes(r.status)) stats.replied++;
    if (r.status === 'interested') stats.interested++;
    if (r.status === 'joined') stats.joined++;
    if (r.status === 'declined') stats.declined++;
    if (r.due) stats.due++;
    if (r.status === 'new') stats.newLeft++;
  }
  const contactedJoined = rows.filter(r => r.status === 'joined' && s.items[r.slug] && s.items[r.slug].firstAt).length;
  stats.rate = stats.contacted ? Math.round(contactedJoined / stats.contacted * 100) : 0;
  return { today: day, rows, stats, perDay: s.settings.perDay, newToday: sentToday, newTodo: Math.max(0, Math.min(s.settings.perDay - sentToday, stats.newLeft)), templates: tpl, defaults: DEFAULT_TEMPLATES, club: clubUrl() };
}

// For the Today list: follow-ups due + new invites still to send today.
async function summary(event, ctx) {
  const v = await view(event, ctx);
  return { due: v.stats.due, newTodo: v.newTodo, perDay: v.perDay };
}

const log = (rec, what) => { rec.history = [{ at: core.nowIso(), what }, ...(rec.history || [])].slice(0, 30); rec.lastAt = core.nowIso(); };

// action: sent | interested | notnow | declined | joined | reset | note
const okSlug = slug => { slug = String(slug || '').toLowerCase(); if (!/^[a-z0-9-]{1,120}$/.test(slug)) throw new HttpError(400, 'invalid', 'Invalid business.'); return slug; };
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

async function act(slug, action, opts) {
  opts = opts || {};
  slug = okSlug(slug);
  const day = core.dayKey();
  let out;
  await cas(KEY, cur => {
    const s = cur ? { ...empty(), ...cur, items: { ...cur.items } } : empty();
    out = apply(s, slug, action, opts, day);
    return s;
  });
  return out;
}

// Several businesses at once (e.g. "Mark these as sent" after adding them to a GHL campaign).
async function actMany(slugs, action, opts) {
  if (action !== 'sent') throw new HttpError(400, 'invalid', 'Invalid action.');
  slugs = [...new Set((Array.isArray(slugs) ? slugs : []).map(okSlug))];
  if (!slugs.length) throw new HttpError(400, 'invalid', 'Nothing to mark.');
  if (slugs.length > 300) throw new HttpError(400, 'invalid', 'Up to 300 at a time.');
  const day = core.dayKey();
  let n = 0;
  await cas(KEY, cur => {
    const s = cur ? { ...empty(), ...cur, items: { ...cur.items } } : empty();
    n = 0;
    for (const slug of slugs) {
      const r = s.items[slug];
      if (r && (r.status === 'declined' || r.status === 'joined' || (r.status === 'waiting' && (r.step || 0) >= 3))) continue;
      apply(s, slug, 'sent', opts || {}, day); n++;
    }
    return s;
  });
  return n;
}

function apply(s, slug, action, opts, day) {
  {
    const rec = { status: 'new', step: 0, history: [], sentDays: [], ...(s.items[slug] || {}) };
    rec.history = [...(rec.history || [])]; rec.sentDays = [...(rec.sentDays || [])];
    const via = opts.via ? ` (${cleanText(opts.via, 20)})` : '';
    if (action === 'sent') {
      const kind = nextKind(rec);
      if (kind === 'invite') { rec.status = 'waiting'; rec.step = 1; rec.firstAt = rec.firstAt || core.nowIso(); rec.nextAt = addDays(day, GAP1); log(rec, `Invite sent${via}`); }
      else if (kind === 'fu1') { rec.status = 'waiting'; rec.step = 2; rec.nextAt = addDays(day, GAP2); delete rec.checkBackAt; log(rec, `Follow-up sent${via}`); }
      else { rec.status = 'waiting'; rec.step = 3; rec.nextAt = ''; log(rec, `Last check-in sent${via}`); }
      if (!rec.sentDays.includes(day)) rec.sentDays = [day, ...rec.sentDays].slice(0, 20);
    } else if (action === 'interested') { rec.status = 'interested'; rec.nextAt = ''; log(rec, 'Replied — interested'); }
    else if (action === 'notnow') {
      const days = [30, 60, 90].includes(Number(opts.days)) ? Number(opts.days) : 30;
      rec.status = 'notnow'; rec.checkBackAt = addDays(day, days); rec.nextAt = ''; rec.step = Math.min(rec.step || 0, 1); log(rec, `Not now — check back in ${days} days`);
    } else if (action === 'declined') { rec.status = 'declined'; rec.nextAt = ''; log(rec, 'Not interested'); }
    else if (action === 'joined') { rec.status = 'joined'; rec.nextAt = ''; log(rec, 'Joined the Business Club 🎉'); }
    else if (action === 'reset') { rec.status = 'new'; rec.step = 0; rec.nextAt = ''; delete rec.checkBackAt; delete rec.firstAt; rec.sentDays = []; log(rec, 'Reset to not contacted'); }
    else if (action === 'note') { rec.notes = cleanText(opts.notes, 600); }
    else if (action === 'email') {
      // Admin-added or corrected email (used for copying and the GHL export). Empty = go back to the listing's email.
      const e = String(opts.email || '').trim().toLowerCase();
      if (e && (!EMAIL_RE.test(e) || e.length > 200)) throw new HttpError(400, 'invalid', 'That doesn’t look like an email address.');
      if (e) { if (rec.email !== e) log(rec, rec.email ? `Email changed to ${e}` : `Email added: ${e}`); rec.email = e; }
      else if (rec.email) { delete rec.email; log(rec, 'Email reset to the listing'); }
    }
    else throw new HttpError(400, 'invalid', 'Invalid action.');
    s.items[slug] = rec;
    return rec;
  }
}

async function saveSettings(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  let saved;
  await cas(KEY, cur => {
    const s = cur ? { ...empty(), ...cur } : empty();
    const st = { ...empty().settings, ...(s.settings || {}) };
    if (raw.perDay !== undefined) { const n = Number(raw.perDay); if (!Number.isInteger(n) || n < 0 || n > 50) throw new HttpError(400, 'invalid', 'Choose between 0 and 50 a day.'); st.perDay = n; }
    if (raw.templates && typeof raw.templates === 'object') {
      const t = {};
      for (const k of Object.keys(DEFAULT_TEMPLATES)) {
        const v = String(raw.templates[k] || '').replace(/\r/g, '').trim().slice(0, 2000);
        if (v && v !== DEFAULT_TEMPLATES[k]) t[k] = v;
      }
      st.templates = t;
    }
    saved = st;
    return { ...s, settings: st };
  });
  return saved;
}

module.exports = { view, summary, act, actMany, saveSettings, DEFAULT_TEMPLATES, STATUSES, GAP1, GAP2 };
