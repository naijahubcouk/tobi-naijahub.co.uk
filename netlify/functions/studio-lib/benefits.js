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
const LOG_KINDS = ['stories', 'reposts', 'discovery'];
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
    stories: [], reposts: [], discovery: [],
    checkup: { done: false, date: '', notes: '', priorities: [] },
    prioritiesDone: [],
  };
}

function yearKeyOf(member) { return member && validDate(member.membershipExpiresAt) ? member.membershipExpiresAt : ''; }

async function getYear(email, member) {
  const yk = yearKeyOf(member);
  const data = (await getJson(key(email))) || { years: {} };
  return { yearKey: yk, year: yk ? { ...emptyYear(), ...(data.years[yk] || {}) } : null, pastYears: Object.keys(data.years).filter(k => k !== yk).sort().reverse() };
}

async function change(email, member, fn) {
  const yk = yearKeyOf(member);
  if (!yk) throw new HttpError(400, 'no_membership', 'This member has no membership expiry date, so there is no membership year to record against.');
  let out;
  await cas(key(email), cur => {
    const data = cur || { years: {} };
    const y = { ...emptyYear(), ...(data.years[yk] || {}) };
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
      y.spotlight = { status: SPOTLIGHT.includes(s.status) ? s.status : y.spotlight.status, date: validDate(s.date) ? s.date : '', link: httpsUrl(s.link) };
    }
    for (const k of ['featured', 'marketplace']) {
      if (raw[k]) y[k] = { done: !!raw[k].done, date: raw[k].done ? (validDate(raw[k].date) ? raw[k].date : core.dayKey()) : '' };
    }
    if ('badge' in raw) y.badge = BADGE.includes(raw.badge) ? raw.badge : y.badge;
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
async function log(email, member, kind, note, date) {
  if (!LOG_KINDS.includes(kind)) throw new HttpError(400, 'invalid', 'Invalid type.');
  return change(email, member, y => {
    y[kind] = [{ at: validDate(date) ? date : core.dayKey(), note: cleanText(note, 200) }, ...(y[kind] || [])].slice(0, 200);
  });
}
async function unlog(email, member, kind, index) {
  if (!LOG_KINDS.includes(kind)) throw new HttpError(400, 'invalid', 'Invalid type.');
  return change(email, member, y => { const i = Number(index); if (Number.isInteger(i) && i >= 0) y[kind].splice(i, 1); });
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
  const all = [...(y.stories || []), ...(y.reposts || []), ...(y.discovery || [])].map(e => e.at);
  if (y.spotlight && y.spotlight.status === 'done' && y.spotlight.date) all.push(y.spotlight.date);
  return all.sort().pop() || '';
}

// What the member sees (no admin notes).
function forMember(yearKey, y) {
  if (!y) return null;
  return {
    yearKey,
    spotlight: { status: y.spotlight.status, date: y.spotlight.date, link: y.spotlight.link },
    featured: y.featured, marketplace: y.marketplace, badge: y.badge,
    counts: { stories: (y.stories || []).length, reposts: (y.reposts || []).length, discovery: (y.discovery || []).length },
    checkup: { done: y.checkup.done, date: y.checkup.date, priorities: y.checkup.priorities || [] },
    prioritiesDone: y.prioritiesDone || [],
  };
}

module.exports = { getYear, update, log, unlog, setPriorityDone, forMember, lastShared, yearKeyOf, emptyYear, LOG_KINDS };
