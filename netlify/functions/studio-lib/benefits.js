'use strict';
/*
 * Business Club benefits tracking (admin records what each member has received; members see a summary).
 *   benefits/<email>  { years: { <membershipExpiresAt>: yearRecord } }
 * A "membership year" is identified by the member's current expiry date, so renewing starts a fresh year
 * and earlier years are kept.
 */
const core = require('./core');
const { HttpError, cas, getJson, enc, cleanText } = core;

const key = email => `benefits/${enc(email)}`;
const LOG_KINDS = ['stories', 'reposts', 'discovery', 'collabs'];  // 'reposts' = Post/Reel reposts (one benefit)
const LABELS = { verified: 'Verification badge', stories: 'Story repost', reposts: 'Post/Reel repost', checkup: 'Business Check-Up', discovery: 'Discovery feature', collabs: 'Collab', spotlight: 'Business Spotlight', featured: 'Featured Business', marketplace: 'Marketplace listing' };

// Minimum targets per member (the aim is to over-deliver). Admin-only; members never see these.
const DEFAULT_TARGETS = { storiesWeek: 2, repostsWeek: 2, discoveryMonth: 2, collabsYear: 2, spotlightYear: 1 };
const TARGETS_KEY = 'config/benefit-targets';
async function getTargets() {
  const saved = { ...((await getJson(TARGETS_KEY)) || {}) }; delete saved.reelsWeek;
  return { ...DEFAULT_TARGETS, ...saved };
}
async function saveTargets(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const next = {};
  const cur = await getTargets();
  for (const k of Object.keys(DEFAULT_TARGETS)) {
    const v = raw[k] === undefined ? cur[k] : Number(raw[k]);
    if (!Number.isInteger(v) || v < 0 || v > 50) throw new HttpError(400, 'invalid', 'Targets must be whole numbers between 0 and 50.');
    next[k] = v;
  }
  await core.setJson(TARGETS_KEY, next);
  return next;
}
const SPOTLIGHT = ['none', 'scheduled', 'done'];
const BADGE = ['unknown', 'yes', 'no', 'not_eligible'];
const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && !isNaN(Date.parse(d));
const httpsUrl = v => { const s = String(v || '').trim(); return /^https:\/\/[^\s"<>]{3,400}$/.test(s) ? s : ''; };

function emptyYear() {
  return {
    spotlight: { status: 'none', date: '', link: '' },
    featured: { done: false, date: '' },
    marketplace: { done: false, date: '' },
    badge: 'unknown',
    stories: [], reposts: [], discovery: [], collabs: [],
    checkup: { done: false, date: '', notes: '', priorities: [] },
    prioritiesDone: [],
  };
}

// Reel reposts were briefly logged on their own (Oct 2026): they belong with Post/Reel reposts.
function mergeReels(y) {
  if (!y || !Array.isArray(y.reels)) return y;
  const out = { ...y, reposts: [...(y.reposts || []), ...y.reels].sort((a, b) => (b.at || '').localeCompare(a.at || '') || (b.loggedAt || '').localeCompare(a.loggedAt || '')) };
  delete out.reels;
  return out;
}

function yearKeyOf(member) { return member && validDate(member.membershipExpiresAt) ? member.membershipExpiresAt : ''; }

async function getYear(email, member) {
  const yk = yearKeyOf(member);
  const data = (await getJson(key(email))) || { years: {} };
  return { yearKey: yk, year: yk ? mergeReels({ ...emptyYear(), ...(data.years[yk] || {}) }) : null, pastYears: Object.keys(data.years).filter(k => k !== yk).sort().reverse() };
}

async function change(email, member, fn) {
  const yk = yearKeyOf(member);
  if (!yk) throw new HttpError(400, 'no_membership', 'This member has no membership expiry date, so there is no membership year to record against.');
  let out;
  await cas(key(email), cur => {
    const data = cur || { years: {} };
    const y = mergeReels({ ...emptyYear(), ...(data.years[yk] || {}) });
    fn(y);
    y.updatedAt = core.nowIso();
    data.years[yk] = y;
    out = y;
    return data;
  });
  return { yearKey: yk, year: out };
}

// Admin: update the fixed benefits.
async function update(email, member, raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  return change(email, member, y => {
    if (raw.spotlight) {
      const s = raw.spotlight;
      const was = y.spotlight || {};
      const status = SPOTLIGHT.includes(s.status) ? s.status : was.status;
      y.spotlight = { status, date: validDate(s.date) ? s.date : '', link: httpsUrl(s.link) };
      if (status === 'done') { y.spotlight.loggedAt = was.status === 'done' && was.loggedAt ? was.loggedAt : core.nowIso(); y.spotlight.notify = was.status === 'done' ? was.notify !== false : raw.notify !== false; }
    }
    for (const k of ['featured', 'marketplace']) {
      if (raw[k]) {
        const was = y[k] || {};
        y[k] = { done: !!raw[k].done, date: raw[k].done ? (validDate(raw[k].date) ? raw[k].date : core.dayKey()) : '' };
        if (y[k].done) { y[k].loggedAt = was.done && was.loggedAt ? was.loggedAt : core.nowIso(); y[k].notify = was.done ? was.notify !== false : raw.notify !== false; }
      }
    }
    if ('badge' in raw && BADGE.includes(raw.badge)) {
      const was = y.badge;
      y.badge = raw.badge;
      if (raw.badge === 'yes' && was !== 'yes') { y.badgeLoggedAt = core.nowIso(); y.badgeNotify = raw.notify !== false; y.badgeDate = core.dayKey(); }
      if (raw.badge !== 'yes') { delete y.badgeLoggedAt; delete y.badgeDate; }
      // Answer an open verification request.
      if (y.verify && y.verify.status === 'pending' && (raw.badge === 'yes' || raw.badge === 'not_eligible' || raw.badge === 'no')) {
        y.verify = { ...y.verify, status: raw.badge === 'yes' ? 'verified' : 'not_eligible', note: cleanText(raw.verifyNote, 400), answeredAt: core.nowIso() };
      }
    }
    if (raw.checkup) {
      const c = raw.checkup;
      const priorities = (Array.isArray(c.priorities) ? c.priorities : String(c.priorities || '').split('\n')).map(p => cleanText(p, 160)).filter(Boolean).slice(0, 5);
      const changed = JSON.stringify(priorities) !== JSON.stringify(y.checkup.priorities || []);
      y.checkup = { done: !!c.done, date: c.done ? (validDate(c.date) ? c.date : core.dayKey()) : '', notes: cleanText(c.notes, 2000), priorities };
      if (changed) y.prioritiesDone = [];
    }
  });
}

// Admin: log a Story share, repost or discovery feature.
async function log(email, member, kind, note, date, notify, link) {
  if (kind === 'reels') kind = 'reposts';
  if (!LOG_KINDS.includes(kind)) throw new HttpError(400, 'invalid', 'Invalid type.');
  return change(email, member, y => {
    const entry = { at: validDate(date) ? date : core.dayKey(), note: cleanText(note, 200), loggedAt: core.nowIso(), notify: notify !== false };
    const l = httpsUrl(link); if (l) entry.link = l;
    y[kind] = [entry, ...(y[kind] || [])].slice(0, 400);
  });
}
async function unlog(email, member, kind, index) {
  if (!LOG_KINDS.includes(kind)) throw new HttpError(400, 'invalid', 'Invalid type.');
  return change(email, member, y => { const i = Number(index); if (Number.isInteger(i) && i >= 0) y[kind].splice(i, 1); });
}

// Member: ask to be verified with their Companies House number.
async function requestVerify(email, member, number) {
  if (!number) throw new HttpError(400, 'invalid', 'Please add your Companies House link or company number.');
  return change(email, member, y => {
    if (y.badge === 'yes') throw new HttpError(409, 'already', 'Your business is already verified.');
    y.verify = { number, at: core.nowIso(), status: 'pending' };
  });
}

// Member: tick a Check-Up priority.
async function setPriorityDone(email, member, index, done) {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i > 4) throw new HttpError(400, 'invalid', 'Invalid priority.');
  return change(email, member, y => {
    if (i >= (y.checkup.priorities || []).length) throw new HttpError(404, 'not_found', 'That priority no longer exists.');
    const set = new Set(y.prioritiesDone || []);
    if (done) set.add(i); else set.delete(i);
    y.prioritiesDone = [...set].sort();
  });
}

function lastShared(y) {
  const all = LOG_KINDS.flatMap(k => y[k] || []).map(e => e.at);
  if (y.spotlight && y.spotlight.status === 'done' && y.spotlight.date) all.push(y.spotlight.date);
  return all.sort().pop() || '';
}

// Monday of the UK week containing `day` (YYYY-MM-DD).
function weekStart(day) { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); }

// Progress against the targets. `due` is what's still owed this period (never negative); `over` is how far ahead.
function progress(y, t, day) {
  y = y || emptyYear(); day = day || core.dayKey();
  const ws = weekStart(day), month = day.slice(0, 7);
  const cnt = (list, f) => (list || []).filter(e => f(e.at)).length;
  const one = (n, target, period) => ({ n, target, period, due: Math.max(0, target - n), over: Math.max(0, n - target), met: n >= target });
  return {
    weekStart: ws,
    stories: one(cnt(y.stories, a => a >= ws && a <= day), t.storiesWeek, 'week'),
    reposts: one(cnt(y.reposts, a => a >= ws && a <= day), t.repostsWeek, 'week'),
    discovery: one(cnt(y.discovery, a => a.slice(0, 7) === month), t.discoveryMonth, 'month'),
    collabs: one((y.collabs || []).length, t.collabsYear, 'year'),
    spotlight: one(y.spotlight && y.spotlight.status === 'done' ? 1 : 0, t.spotlightYear, 'year'),
  };
}

/*
 * One entry per Club benefit — never grouped. state: done | part | due | todo | na
 *   done = delivered / met for this period · part = started · due = owed now · todo = still to do this year · na = not applicable
 * forMember=true drops targets (members only see what's been done).
 */
const BOARD = [
  ['spotlight', '📣', 'Spotlight'], ['collabs', '🤝', 'Collab'], ['discovery', '💚', 'Discovery'], ['featured', '⭐', 'Featured'],
  ['marketplace', '🛍️', 'Marketplace'], ['verified', '✅', 'Verified'], ['stories', '📲', 'Story reposts'], ['reposts', '🖼️', 'Post/Reel reposts'],
  ['checkup', '📊', 'Check-Up'],
];
function board(y, t, day, daysLeft, forMember) {
  y = { ...emptyYear(), ...(y || {}) };
  const late = Number.isFinite(daysLeft) && daysLeft <= 60;
  const p = t ? progress(y, t, day) : null;
  const yearCount = k => (y[k] || []).length;
  const items = BOARD.map(([key, icon, label]) => {
    let state = 'todo', text = '';
    if (key === 'spotlight') {
      const s = y.spotlight || {};
      if (s.status === 'done') { state = 'done'; text = s.date ? 'Done ' + s.date : 'Done'; }
      else if (s.status === 'scheduled') { state = 'part'; text = s.date ? 'Booked ' + s.date : 'Booked'; }
      else { state = late ? 'due' : 'todo'; text = 'Not yet'; }
    } else if (key === 'collabs') {
      const n = yearCount('collabs'), tg = t ? t.collabsYear : 0;
      if (forMember) { state = n ? 'done' : 'todo'; text = n ? n + ' this year' : 'Not yet'; }
      else { state = n >= tg ? 'done' : n ? 'part' : (late ? 'due' : 'todo'); text = n + '/' + tg + ' this year'; }
    } else if (key === 'featured' || key === 'marketplace') {
      const done = !!(y[key] && y[key].done);
      state = done ? 'done' : 'due'; text = done ? 'Live' : 'Set up';
    } else if (key === 'verified') {
      if (y.badge === 'yes') { state = 'done'; text = 'Verified'; }
      else if (y.badge === 'not_eligible') { state = 'na'; text = 'Not eligible'; }
      else if (y.verify && y.verify.status === 'pending') { state = forMember ? 'part' : 'due'; text = 'Request waiting'; }
      else { state = 'todo'; text = forMember ? 'Not yet' : 'Not requested'; }
    } else if (key === 'checkup') {
      state = y.checkup && y.checkup.done ? 'done' : (late ? 'due' : 'todo'); text = y.checkup && y.checkup.done ? 'Done' : 'Not yet';
    } else {  // stories / reposts (week) and discovery (month)
      if (forMember) { const n = yearCount(key); state = n ? 'done' : 'todo'; text = n ? n + ' this year' : 'Not yet'; }
      else { const q = p[key]; state = q.met ? 'done' : q.n ? 'part' : 'due'; text = q.n + '/' + q.target + (q.period === 'week' ? ' this week' : ' this month'); }
    }
    return { key, icon, label, state, text, total: ['stories', 'reposts', 'discovery', 'collabs'].includes(key) ? yearCount(key) : undefined };
  });
  const counted = items.filter(i => i.state !== 'na');
  return { items, done: counted.filter(i => i.state === 'done').length, of: counted.length };
}

// Everything done for the member this year, newest first (what they see in Account).
function feed(y) {
  if (!y) return [];
  const out = [];
  for (const k of LOG_KINDS) for (const e of y[k] || []) out.push({ kind: k, label: LABELS[k], at: e.at, note: e.note || '', link: e.link || '', loggedAt: e.loggedAt || '', notify: e.notify !== false && !!e.loggedAt });
  for (const k of ['featured', 'marketplace']) if (y[k] && y[k].done) out.push({ kind: k, label: LABELS[k], at: y[k].date, note: 'Now live', link: '', loggedAt: y[k].loggedAt || '', notify: y[k].notify !== false && !!y[k].loggedAt });
  if (y.badge === 'yes' && y.badgeLoggedAt) out.push({ kind: 'verified', label: LABELS.verified, at: y.badgeDate || y.badgeLoggedAt.slice(0, 10), note: 'Your business is verified ✓', link: '', loggedAt: y.badgeLoggedAt, notify: y.badgeNotify !== false });
  if (y.checkup && y.checkup.done) out.push({ kind: 'checkup', label: LABELS.checkup, at: y.checkup.date, note: 'Done', link: '', loggedAt: '', notify: false });
  if (y.spotlight && y.spotlight.status === 'done') out.push({ kind: 'spotlight', label: LABELS.spotlight, at: y.spotlight.date, note: '', link: y.spotlight.link || '', loggedAt: y.spotlight.loggedAt || '', notify: y.spotlight.notify !== false && !!y.spotlight.loggedAt });
  return out.sort((a, b) => (b.at || '').localeCompare(a.at || '') || (b.loggedAt || '').localeCompare(a.loggedAt || ''));
}

// What the member sees (no admin notes).
function forMember(yearKey, y) {
  if (!y) return null;
  return {
    yearKey,
    spotlight: { status: y.spotlight.status, date: y.spotlight.date, link: y.spotlight.link },
    featured: y.featured, marketplace: y.marketplace, badge: y.badge,
    counts: { stories: (y.stories || []).length, reposts: (y.reposts || []).length, discovery: (y.discovery || []).length, collabs: (y.collabs || []).length },
    board: board(y, null, null, null, true),
    feed: feed(y).map(({ kind, label, at, note, link }) => ({ kind, label, at, note, link })),
    checkup: { done: y.checkup.done, date: y.checkup.date, priorities: y.checkup.priorities || [] },
    verify: y.verify ? { status: y.verify.status, number: y.verify.number, at: y.verify.at, note: y.verify.note || '' } : null,
    prioritiesDone: y.prioritiesDone || [],
  };
}

module.exports = { board, BOARD, getYear, update, log, unlog, setPriorityDone, requestVerify, forMember, lastShared, yearKeyOf, emptyYear, LOG_KINDS, LABELS, DEFAULT_TARGETS, getTargets, saveTargets, progress, feed, weekStart };
