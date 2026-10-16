'use strict';
/*
 * Admin daily to-do list.
 *   admin-todo/state  { since, items: { <key>: item }, lastGen }
 *   admin-todo/defs   { defs: [ { id, title, repeat: once|daily|weekdays|weekly, date, dow, createdAt } ] }
 * An item: { key, title, kind, due (YYYY-MM-DD), createdAt, doneAt, skippedAt, autoDone, auto, meta }
 * Anything not done (or skipped) by the end of its day shows as overdue until it is marked.
 * Automatic items are created from what's happening in the Business Studio and tick themselves
 * once the thing is dealt with (review done, weekly shares met, alert dismissed …).
 */
const crypto = require('crypto');
const ukDay = iso => (iso ? core.dayKey(new Date(iso)) : ''); // UK date of a timestamp (ticks just after midnight count for the right day)
const core = require('./core');
const { HttpError, cas, getJson, cleanText } = core;
const benefits = require('./benefits');
const market = require('./market');

const STATE = 'admin-todo/state', DEFS = 'admin-todo/defs';
const SHARE_SLOTS = 5;           // members owed shares, longest-waiting first
const RENEW_DAYS = 14;
const REPEATS = ['once', 'daily', 'weekdays', 'weekly'];
const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const dow = day => new Date(`${day}T12:00:00Z`).getUTCDay();
const addDays = (day, n) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

async function getDefs() { return ((await getJson(DEFS)) || { defs: [] }).defs; }
async function addDef(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const title = cleanText(raw.title, 160);
  if (title.length < 2) throw new HttpError(400, 'invalid', 'Please type the task.');
  const repeat = REPEATS.includes(raw.repeat) ? raw.repeat : 'once';
  const def = { id: `d${crypto.randomBytes(5).toString('hex')}`, title, repeat, createdAt: core.nowIso() };
  if (repeat === 'once') { def.date = isDay(raw.date) ? raw.date : core.dayKey(); }
  if (repeat === 'weekly') { const n = Number(raw.dow); def.dow = Number.isInteger(n) && n >= 0 && n <= 6 ? n : dow(core.dayKey()); }
  await cas(DEFS, cur => ({ defs: [...((cur && cur.defs) || []), def].slice(-200) }));
  return def;
}
async function deleteDef(id) {
  await cas(DEFS, cur => ({ defs: ((cur && cur.defs) || []).filter(d => d.id !== id) }));
  // Remove its open (not done) items, including overdue ones; keep what was done.
  await cas(STATE, cur => {
    if (!cur) return undefined;
    const items = { ...cur.items };
    for (const [k, it] of Object.entries(items)) if (it.meta && it.meta.def === id && !it.doneAt) delete items[k];
    return { ...cur, items };
  });
}
function defAppliesOn(def, day) {
  if (def.createdAt.slice(0, 10) > day && def.repeat !== 'once') return false;
  if (def.repeat === 'once') return def.date === day;
  if (def.repeat === 'daily') return true;
  if (def.repeat === 'weekdays') return dow(day) >= 1 && dow(day) <= 5;
  if (def.repeat === 'weekly') return dow(day) === def.dow;
  return false;
}

/*
 * Brings the list up to date. `data` = { members, settings, alerts, lessonsReady }.
 * Returns the view: { today, overdue, todayItems, doneToday, counts }.
 */
async function refresh(data) {
  const day = core.dayKey();
  const defs = await getDefs();
  const targets = await benefits.getTargets();

  // ── what the Business Studio currently needs ──
  const want = {};   // key → item (auto)
  const still = new Set(); // auto keys whose condition is still true right now
  const add = (key, kind, title, meta) => { still.add(key); want[key] = { key, kind, title, auto: true, meta: meta || {} }; };

  // Marketplace reviews
  for (const r of await market.all()) {
    const st = market.status(r);
    if (st === 'pending' || st === 'live_change_pending') {
      const f = r.draft || {};
      add(`market:${r.id}:${r.submittedAt || r.updatedAt}`, 'market', `Review Marketplace ${r.live ? 'change' : 'listing'}: ${f.name || 'listing'} (${f.business || ''})`, { id: r.id });
    }
  }
  // Business Club members: verification, shares owed, Spotlight today, renewals
  const club = data.members.filter(m => core.access(m, data.settings).membershipActive);
  const owed = [];
  for (const m of club) {
    const { year: y } = await benefits.getYear(m.email, m);
    const p = (data.profiles && data.profiles[m.email]) || null;
    const name = (p && p.businessName) || m.name || m.email;
    if (y && y.verify && y.verify.status === 'pending') add(`verify:${m.email}:${y.verify.at}`, 'verify', `Check ${name} on Companies House (${y.verify.number})`, { email: m.email, number: y.verify.number });
    if (y && y.spotlight && y.spotlight.status === 'scheduled' && y.spotlight.date && y.spotlight.date <= day) add(`spotlight:${m.email}:${y.spotlight.date}`, 'spotlight', `Business Spotlight for ${name} (scheduled ${y.spotlight.date})`, { email: m.email });
    const left = daysBetween(day, m.membershipExpiresAt);
    if (left >= 0 && left <= RENEW_DAYS) add(`renew:${m.email}:${m.membershipExpiresAt}`, 'renew', `${name}’s membership ends ${m.membershipExpiresAt} — send a renewal message`, { email: m.email, expires: m.membershipExpiresAt, whatsapp: p && p.whatsapp });
    const pr = benefits.progress(y, targets, day);
    const due = { stories: pr.stories.due, reposts: pr.reposts.due, discovery: pr.discovery.due };
    const types = {};
    for (const t of SHARE_TYPES) if (pr[t].due) types[t] = { n: pr[t].n, target: pr[t].target, period: t === 'discovery' ? day.slice(0, 7) : pr.weekStart };
    if (Object.keys(types).length) owed.push({ email: m.email, name, due, types, lastShared: y ? benefits.lastShared(y) : '', weekStart: pr.weekStart, month: day.slice(0, 7) });
  }
  // Lessons ready for approval
  const ready = data.lessonsReady || [];
  if (ready.length === 1) add(`lesson:${ready[0].id}`, 'lesson', `Approve lesson: ${ready[0].title}`, { id: ready[0].id });
  else if (ready.length > 1) {
    const sig = crypto.createHash('sha256').update(ready.map(l => l.id).sort().join(',')).digest('hex').slice(0, 10);
    add(`lessons:${sig}`, 'lesson', `Approve ${ready.length} lessons waiting in Resources: ${ready.slice(0, 3).map(l => l.title).join(', ')}${ready.length > 3 ? '…' : ''}`, { ids: ready.map(l => l.id) });
  }

  let view;
  await cas(STATE, cur => {
    const s = cur ? { ...cur, items: { ...cur.items } } : { since: core.nowIso(), items: {} };
    const items = s.items;
    const now = core.nowIso();
    // Alerts since the to-do list started (old history isn't dumped on you). Covered kinds are skipped.
    for (const a of data.alerts || []) {
      if (!a || ['market_review', 'verify_request'].includes(a.kind)) continue;
      if (new Date(a.ts).toISOString() < s.since) continue;
      add(`alert:${a.key}`, 'alert', a.message, { alertKey: a.key });
    }
    // Shares: one row per member per type (Story / repost / discovery), for up to 5 members at a time,
    // topped up from the longest-waiting members. A row stays open (and overdue) until that type is met.
    const owedBy = new Map(owed.map(o => [o.email, o]));
    const taken = new Set();
    for (const [k, it] of Object.entries(items)) {
      if (it.kind !== 'share' || it.doneAt || it.skippedAt) continue;
      if (!it.meta || !it.meta.type) { delete items[k]; continue; } // old combined task → replaced by one row per type
      const o = owedBy.get(it.meta.email), ty = o && o.types[it.meta.type];
      if (ty && ty.period === it.meta.period) { still.add(k); Object.assign(it.meta, { n: ty.n, target: ty.target }); it.title = shareRowTitle(o.name, it.meta.type, ty); taken.add(o.email); }
    }
    const addRows = o => {
      for (const [type, ty] of Object.entries(o.types)) {
        const key = `share:${o.email}:${type}:${ty.period}`, ex = items[key];
        if (ex && !ex.doneAt && !ex.skippedAt) continue;           // already open
        if (ex && (ex.skippedAt || ex.doneAt) && ex.due === day) continue; // skipped (or finished) today
        still.add(key);
        items[key] = { key, kind: 'share', title: shareRowTitle(o.name, type, ty), auto: true, due: day, createdAt: now, meta: { email: o.email, type, period: ty.period, n: ty.n, target: ty.target } };
      }
    };
    for (const email of taken) addRows(owedBy.get(email)); // e.g. a new week started for a member already on the list
    const queue = owed.filter(o => !taken.has(o.email)).sort((a, b) => (a.lastShared || '0').localeCompare(b.lastShared || '0'));
    let slots = Math.max(0, SHARE_SLOTS - taken.size);
    for (const o of queue) {
      if (!slots) break;
      const before = still.size; addRows(o);
      if (still.size > before) slots--;
    }
    // Add new automatic items (due today) and your own tasks for today.
    for (const [k, w] of Object.entries(want)) if (!items[k]) items[k] = { ...w, due: day, createdAt: now };
    // Your tasks: today, plus any days missed since the list was last opened (up to 14), so missed ones show as overdue.
    const lastDay = s.lastGen ? s.lastGen.slice(0, 10) : day;
    const from = lastDay < day ? (daysBetween(lastDay, day) > 14 ? addDays(day, -14) : addDays(lastDay, 1)) : day;
    for (const d of defs) {
      const days = [];
      if (d.repeat === 'once') { if (d.date <= day && d.date >= addDays(day, -30)) days.push(d.date); }
      else for (let x = from; x <= day; x = addDays(x, 1)) if (defAppliesOn(d, x)) days.push(x);
      for (const x of days) {
        const k = `c:${d.id}:${x}`;
        if (!items[k]) items[k] = { key: k, kind: 'task', title: d.title, auto: false, due: x, createdAt: now, meta: { def: d.id, repeat: d.repeat } };
      }
    }
    // Automatic items tick themselves once dealt with.
    for (const [k, it] of Object.entries(items)) {
      if (!it.auto || it.doneAt || it.skippedAt) continue;
      if (!still.has(k)) { it.doneAt = now; it.autoDone = true; }
    }
    // Tidy: forget finished items after 30 days.
    const cutoff = addDays(day, -30);
    for (const [k, it] of Object.entries(items)) if ((it.doneAt || it.skippedAt) && ukDay(it.doneAt || it.skippedAt) < cutoff) delete items[k];
    s.lastGen = now;
    view = makeView(s, day);
    return s;
  });
  return view;
}

const SHARE_TYPES = ['stories', 'reposts', 'discovery'];
const SHARE_WORD = { stories: 'Story', reposts: 'repost', discovery: 'discovery feature' };
function shareRowTitle(name, type, ty) {
  return `Share ${name}: ${SHARE_WORD[type]} (${ty.n} of ${ty.target} done this ${type === 'discovery' ? 'month' : 'week'})`;
}
function shareTitle(o) {
  const parts = [];
  if (o.due.stories) parts.push(`${o.due.stories} Stor${o.due.stories === 1 ? 'y' : 'ies'}`);
  if (o.due.reposts) parts.push(`${o.due.reposts} repost${o.due.reposts === 1 ? '' : 's'}`);
  if (o.due.discovery) parts.push(`${o.due.discovery} discovery feature${o.due.discovery === 1 ? '' : 's'} this month`);
  return `Share ${o.name}: ${parts.join(', ')} still due`;
}

const ORDER = { verify: 1, market: 2, alert: 3, renew: 4, spotlight: 5, lesson: 6, share: 7, task: 8 };
function makeView(s, day) {
  const all = Object.values(s.items);
  const sort = (a, b) => (a.due || '').localeCompare(b.due || '') || (ORDER[a.kind] || 9) - (ORDER[b.kind] || 9) || (a.createdAt || '').localeCompare(b.createdAt || '');
  const open = all.filter(it => !it.doneAt && !it.skippedAt);
  const overdue = open.filter(it => it.due < day).sort(sort).map(it => ({ ...it, daysOverdue: daysBetween(it.due, day) }));
  const todayItems = open.filter(it => it.due >= day).sort(sort);
  const doneToday = all.filter(it => ukDay(it.doneAt) === day || ukDay(it.skippedAt) === day)
    .sort((a, b) => (b.doneAt || b.skippedAt).localeCompare(a.doneAt || a.skippedAt));
  return { today: day, overdue, todayItems, doneToday, counts: { overdue: overdue.length, today: todayItems.length, done: doneToday.filter(i => i.doneAt).length } };
}

async function mark(key, how) {
  let item;
  await cas(STATE, cur => {
    if (!cur || !cur.items[key]) throw new HttpError(404, 'not_found', 'That task isn’t on the list any more.');
    const it = { ...cur.items[key] };
    const now = core.nowIso();
    if (how === 'done') { it.doneAt = now; delete it.skippedAt; it.autoDone = false; }
    else if (how === 'skip') { it.skippedAt = now; delete it.doneAt; }
    else if (how === 'undo') { delete it.doneAt; delete it.skippedAt; delete it.autoDone; }
    else throw new HttpError(400, 'invalid', 'Invalid action.');
    item = it;
    return { ...cur, items: { ...cur.items, [key]: it } };
  });
  return item;
}

async function get(key) { const s = await getJson(STATE); return (s && s.items && s.items[key]) || null; }

async function summary() {
  const s = await getJson(STATE);
  if (!s) return null;
  const v = makeView(s, core.dayKey());
  return v.counts;
}

module.exports = { refresh, mark, get, addDef, deleteDef, getDefs, summary, defAppliesOn, SHARE_SLOTS, SHARE_TYPES };
