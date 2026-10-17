'use strict';
/*
 * Members' to-do list (Business Studio → Today).
 *   mtodo/<email>  { defs: [ { id, title, repeat, date, dow, createdAt } ], items: { <key>: item }, lastGen }
 * Item: { key, title, kind: task|followup|invoice|priority, due, createdAt, doneAt, skippedAt, autoDone, auto, meta }
 * Anything not ticked by the end of its day shows as overdue until it's ticked or skipped.
 * Automatic items come from the member's own follow-ups, overdue invoices and Check-Up priorities, and tick themselves.
 */
const crypto = require('crypto');
const ukDay = iso => (iso ? core.dayKey(new Date(iso)) : ''); // UK date of a timestamp (ticks just after midnight count for the right day)
const core = require('./core');
const { HttpError, cas, getJson, cleanText, enc } = core;
const fu = require('./followups');
const money = require('./money');
const benefits = require('./benefits');
const todo = require('./todo'); // defAppliesOn

const key = email => `mtodo/${enc(email)}`;
const REPEATS = ['once', 'daily', 'weekdays', 'weekly'];
const FU_KIND = { fu1: 'Follow up', fu2: 'Second follow-up', checkback: 'Check back in with', thanks: 'Say thank you to', keep: 'Keep in touch with' };
const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const addDays = (day, n) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
const dowOf = day => new Date(`${day}T12:00:00Z`).getUTCDay();
const gbp = p => `£${(p / 100).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const empty = () => ({ defs: [], items: {}, lastGen: '' });

async function addDef(email, raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const title = cleanText(raw.title, 160);
  if (title.length < 2) throw new HttpError(400, 'invalid', 'Please type the task.');
  const repeat = REPEATS.includes(raw.repeat) ? raw.repeat : 'once';
  const def = { id: `d${crypto.randomBytes(5).toString('hex')}`, title, repeat, createdAt: core.nowIso() };
  if (raw.priority) def.priority = true;
  if (repeat === 'once') def.date = isDay(raw.date) ? raw.date : core.dayKey();
  if (repeat === 'weekly') { const n = Number(raw.dow); def.dow = Number.isInteger(n) && n >= 0 && n <= 6 ? n : dowOf(core.dayKey()); }
  await cas(key(email), cur => {
    const s = cur || empty();
    if ((s.defs || []).length >= 100) throw new HttpError(400, 'too_many', 'You have a lot of tasks set up — remove some you no longer need first.');
    return { ...s, defs: [...(s.defs || []), def] };
  });
  return def;
}
// Several one-off tasks at once (e.g. "Add to my to-do list" from a growth or weekly plan).
async function addMany(email, list) {
  list = (Array.isArray(list) ? list : []).slice(0, 35).map(r => ({ title: cleanText(r && r.title, 160), date: isDay(r && r.date) ? r.date : core.dayKey() })).filter(r => r.title.length >= 2);
  if (!list.length) throw new HttpError(400, 'invalid', 'No tasks to add.');
  const defs = list.map(r => ({ id: `d${crypto.randomBytes(5).toString('hex')}`, title: r.title, repeat: 'once', date: r.date, createdAt: core.nowIso() }));
  await cas(key(email), cur => {
    const s = cur || empty();
    if ((s.defs || []).length + defs.length > 150) throw new HttpError(400, 'too_many', 'Your to-do list is full — tick off or remove some tasks first.');
    return { ...s, defs: [...(s.defs || []), ...defs] };
  });
  return defs.length;
}
// ⭐ Priority: shown first on the list.
async function setPriority(email, id, on) {
  let found = false;
  await cas(key(email), cur => {
    if (!cur) return undefined;
    const defs = (cur.defs || []).map(d => { if (d.id !== id) return d; found = true; const n = { ...d }; if (on) n.priority = true; else delete n.priority; return n; });
    return { ...cur, defs };
  });
  if (!found) throw new HttpError(404, 'not_found', 'That task isn’t on your list any more.');
  return { id, priority: !!on };
}
async function deleteDef(email, id) {
  await cas(key(email), cur => {
    if (!cur) return undefined;
    const items = { ...cur.items };
    for (const [k, it] of Object.entries(items)) if (it.meta && it.meta.def === id && !it.doneAt) delete items[k];
    return { ...cur, defs: (cur.defs || []).filter(d => d.id !== id), items };
  });
}

const fuTitle = it => `${FU_KIND[it.dueKind] || 'Follow up'} ${it.name || 'your customer'}${it.about ? ` — ${it.about}` : ''}`;
const invTitle = (d, verb) => {
  const who = (d.customer && d.customer.name) || d.customerName || '';
  const bits = [who, d.totalPence ? gbp(d.totalPence) : ''].filter(Boolean).join(', ');
  return `${verb} invoice ${d.number}${bits ? ` (${bits})` : ''}`;
};

// Brings the list up to date and returns the view.
// opts.full → the whole list (coming up for 30 days, done for 30 days); otherwise coming up for 7 days.
async function refresh(email, member, access, opts) {
  opts = opts || {};
  const day = core.dayKey();
  const horizon = addDays(day, opts.full ? 30 : 7);
  const want = {}, upcoming = [];
  const add = (k, kind, title, meta) => { want[k] = { key: k, kind, title, auto: true, meta: meta || {} }; };

  const fl = await fu.list(email);
  for (const it of fl.items) {
    if (!it.nextAt) continue;
    if (it.nextAt <= day) add(`fu:${it.id}:${it.dueKind}:${it.nextAt}`, 'followup', fuTitle(it), { id: it.id });
    else if (it.nextAt <= horizon) upcoming.push({ key: `fu:${it.id}:${it.dueKind}:${it.nextAt}`, kind: 'followup', title: fuTitle(it), due: it.nextAt, auto: true, upcoming: true, meta: { id: it.id } });
  }
  try {
    const docs = ((await money.list(email)) || {}).docs || [];
    for (const d of docs) if (d.type === 'invoice' && d.status === 'sent' && d.dueDate && d.dueDate > day && d.dueDate <= horizon) {
      upcoming.push({ key: `invdue:${d.id}`, kind: 'invoice', title: invTitle(d, 'Payment due:'), due: d.dueDate, auto: true, upcoming: true, meta: { id: d.id } });
    }
  } catch (e) { /* money not set up */ }
  for (const r of await money.reminders(email, { all: true })) {
    if (r.kind !== 'overdue') continue;
    const d = r.doc;
    add(`inv:${d.id}`, 'invoice', invTitle(d, 'Chase'), { id: d.id });
  }
  if (access && access.membershipActive && member) {
    const b = await benefits.getYear(email, member);
    const y = b.year;
    if (y && y.checkup && (y.checkup.priorities || []).length) {
      const doneIdx = new Set(y.prioritiesDone || []);
      y.checkup.priorities.forEach((p, i) => {
        if (doneIdx.has(i)) return;
        const h = crypto.createHash('sha256').update(p).digest('hex').slice(0, 8);
        add(`prio:${b.yearKey}:${i}:${h}`, 'priority', p, { index: i });
      });
    }
  }

  let view;
  await cas(key(email), cur => {
    const s = cur ? { ...empty(), ...cur, items: { ...cur.items } } : empty();
    const items = s.items, now = core.nowIso();
    for (const [k, w] of Object.entries(want)) if (!items[k]) items[k] = { ...w, due: day, createdAt: now };
    // Your tasks: today plus days missed since the list was last opened (up to 14).
    const lastDay = s.lastGen ? s.lastGen.slice(0, 10) : day;
    const from = lastDay < day ? (daysBetween(lastDay, day) > 14 ? addDays(day, -14) : addDays(lastDay, 1)) : day;
    for (const d of s.defs || []) {
      const days = [];
      if (d.repeat === 'once') { if (d.date <= day && d.date >= addDays(day, -30)) days.push(d.date); }
      else for (let x = from; x <= day; x = addDays(x, 1)) if (todo.defAppliesOn(d, x)) days.push(x);
      for (const x of days) {
        const k = `c:${d.id}:${x}`;
        if (!items[k]) items[k] = { key: k, kind: 'task', title: d.title, auto: false, due: x, createdAt: now, meta: { def: d.id, repeat: d.repeat } };
      }
    }
    // Automatic items tick themselves once dealt with.
    for (const [k, it] of Object.entries(items)) if (it.auto && !it.doneAt && !it.skippedAt && !want[k]) { it.doneAt = now; it.autoDone = true; }
    const cutoff = addDays(day, -30);
    for (const [k, it] of Object.entries(items)) if ((it.doneAt || it.skippedAt) && ukDay(it.doneAt || it.skippedAt) < cutoff && (it.due || '') < day) delete items[k];
    s.lastGen = now;
    // Coming up: your one-off tasks with a future date, and weekly tasks on their days.
    // (Daily and weekday tasks are shown once under Repeating tasks, not on every future day.)
    const future = upcoming.slice();
    for (const d of s.defs || []) {
      const days = [];
      if (d.repeat === 'once') { if (d.date > day && d.date <= horizon) days.push(d.date); }
      else if (d.repeat === 'weekly') for (let x = addDays(day, 1); x <= horizon; x = addDays(x, 1)) if (todo.defAppliesOn(d, x)) days.push(x);
      for (const x of days) {
        const k = `c:${d.id}:${x}`, it = items[k];
        if (it && (it.doneAt || it.skippedAt)) continue;
        future.push(it ? { ...it, upcoming: true } : { key: k, kind: 'task', title: d.title, auto: false, due: x, upcoming: true, meta: { def: d.id, repeat: d.repeat } });
      }
    }
    view = makeView(s, day, future, opts.full);
    return s;
  });
  return view;
}

const ORDER = { followup: 1, invoice: 2, priority: 3, task: 4 };
function makeView(s, day, future, full) {
  const pri = new Set((s.defs || []).filter(d => d.priority).map(d => d.id));
  const mark = it => (it.meta && pri.has(it.meta.def) ? { ...it, star: true } : it);
  const all = Object.values(s.items || {}).map(mark);
  future = (future || []).map(mark);
  const sort = (a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0) || (a.due || '').localeCompare(b.due || '') || (ORDER[a.kind] || 9) - (ORDER[b.kind] || 9) || (a.createdAt || '').localeCompare(b.createdAt || '');
  const open = all.filter(it => !it.doneAt && !it.skippedAt);
  const overdue = open.filter(it => it.due < day).sort(sort).map(it => ({ ...it, daysOverdue: daysBetween(it.due, day) }));
  const todayItems = open.filter(it => it.due === day).sort(sort);
  const doneToday = all.filter(it => ukDay(it.doneAt || it.skippedAt) === day).sort((a, b) => (b.doneAt || b.skippedAt).localeCompare(a.doneAt || a.skippedAt));
  const comingUp = (future || []).sort(sort);
  const out = { today: day, overdue, todayItems, doneToday, comingUp, defs: (s.defs || []).filter(d => d.repeat !== 'once'),
    counts: { overdue: overdue.length, today: todayItems.length, done: doneToday.filter(i => i.doneAt).length, comingUp: comingUp.length } };
  if (full) out.done = all.filter(it => it.doneAt || it.skippedAt).sort((a, b) => (b.doneAt || b.skippedAt).localeCompare(a.doneAt || a.skippedAt)).slice(0, 200);
  return out;
}

async function mark(email, member, k, how) {
  let item;
  await cas(key(email), cur => {
    let base = cur && cur.items[k];
    if (!base && cur) {
      // Ticking (or skipping) one of your own tasks before its day.
      const m = /^c:([A-Za-z0-9]+):(\d{4}-\d{2}-\d{2})$/.exec(k);
      const def = m && (cur.defs || []).find(d => d.id === m[1]);
      if (def && m[2] > core.dayKey() && m[2] <= addDays(core.dayKey(), 400) && todo.defAppliesOn(def, m[2])) {
        base = { key: k, kind: 'task', title: def.title, auto: false, due: m[2], createdAt: core.nowIso(), meta: { def: def.id, repeat: def.repeat } };
      }
    }
    if (!base) throw new HttpError(404, 'not_found', 'That task isn’t on your list any more.');
    const it = { ...base }, now = core.nowIso();
    if (how === 'done') { it.doneAt = now; delete it.skippedAt; it.autoDone = false; }
    else if (how === 'skip') { it.skippedAt = now; delete it.doneAt; }
    else if (how === 'undo') { delete it.doneAt; delete it.skippedAt; delete it.autoDone; }
    else throw new HttpError(400, 'invalid', 'Invalid action.');
    item = it;
    return { ...cur, items: { ...cur.items, [k]: it } };
  });
  // Ticking a Check-Up priority here ticks it on the priorities card too.
  if (item.kind === 'priority' && (how === 'done' || how === 'undo') && member) {
    try { await benefits.setPriorityDone(email, member, item.meta.index, how === 'done'); } catch (e) { /* priority may have changed */ }
  }
  return item;
}

async function counts(email, member, access) { return (await refresh(email, member, access)).counts; }

module.exports = { addMany, refresh, mark, addDef, deleteDef, setPriority, counts };
