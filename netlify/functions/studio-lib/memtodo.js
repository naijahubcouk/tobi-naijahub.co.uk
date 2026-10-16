'use strict';
/*
 * Members' to-do list (Business Studio → Today).
 *   mtodo/<email>  { defs: [ { id, title, repeat, date, dow, createdAt } ], items: { <key>: item }, lastGen }
 * Item: { key, title, kind: task|followup|invoice|priority, due, createdAt, doneAt, skippedAt, autoDone, auto, meta }
 * Anything not ticked by the end of its day shows as overdue until it's ticked or skipped.
 * Automatic items come from the member's own follow-ups, overdue invoices and Check-Up priorities, and tick themselves.
 */
const crypto = require('crypto');
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
  if (repeat === 'once') def.date = isDay(raw.date) ? raw.date : core.dayKey();
  if (repeat === 'weekly') { const n = Number(raw.dow); def.dow = Number.isInteger(n) && n >= 0 && n <= 6 ? n : dowOf(core.dayKey()); }
  await cas(key(email), cur => {
    const s = cur || empty();
    if ((s.defs || []).length >= 100) throw new HttpError(400, 'too_many', 'You have a lot of tasks set up — remove some you no longer need first.');
    return { ...s, defs: [...(s.defs || []), def] };
  });
  return def;
}
async function deleteDef(email, id) {
  await cas(key(email), cur => {
    if (!cur) return undefined;
    const items = { ...cur.items };
    for (const [k, it] of Object.entries(items)) if (it.meta && it.meta.def === id && !it.doneAt) delete items[k];
    return { ...cur, defs: (cur.defs || []).filter(d => d.id !== id), items };
  });
}

// Brings the list up to date and returns the view.
async function refresh(email, member, access) {
  const day = core.dayKey();
  const want = {};
  const add = (k, kind, title, meta) => { want[k] = { key: k, kind, title, auto: true, meta: meta || {} }; };

  for (const it of (await fu.due(email)).due) {
    const what = FU_KIND[it.dueKind] || 'Follow up';
    add(`fu:${it.id}:${it.dueKind}:${it.nextAt}`, 'followup', `${what} ${it.name || 'your customer'}${it.about ? ` — ${it.about}` : ''}`, { id: it.id });
  }
  for (const r of await money.reminders(email, { all: true })) {
    if (r.kind !== 'overdue') continue;
    const d = r.doc;
    add(`inv:${d.id}`, 'invoice', `Chase invoice ${d.number}${d.customer && d.customer.name ? ` (${d.customer.name}` : ' ('}${d.totalPence ? `, ${gbp(d.totalPence)}` : ''})`, { id: d.id });
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
    for (const [k, it] of Object.entries(items)) if ((it.doneAt || it.skippedAt) && (it.doneAt || it.skippedAt).slice(0, 10) < cutoff) delete items[k];
    s.lastGen = now;
    view = makeView(s, day);
    return s;
  });
  return view;
}

const ORDER = { followup: 1, invoice: 2, priority: 3, task: 4 };
function makeView(s, day) {
  const all = Object.values(s.items || {});
  const sort = (a, b) => (a.due || '').localeCompare(b.due || '') || (ORDER[a.kind] || 9) - (ORDER[b.kind] || 9) || (a.createdAt || '').localeCompare(b.createdAt || '');
  const open = all.filter(it => !it.doneAt && !it.skippedAt);
  const overdue = open.filter(it => it.due < day).sort(sort).map(it => ({ ...it, daysOverdue: daysBetween(it.due, day) }));
  const todayItems = open.filter(it => it.due >= day).sort(sort);
  const doneToday = all.filter(it => ((it.doneAt || it.skippedAt) || '').slice(0, 10) === day).sort((a, b) => (b.doneAt || b.skippedAt).localeCompare(a.doneAt || a.skippedAt));
  return { today: day, overdue, todayItems, doneToday, defs: (s.defs || []).filter(d => d.repeat !== 'once'), counts: { overdue: overdue.length, today: todayItems.length, done: doneToday.filter(i => i.doneAt).length } };
}

async function mark(email, member, k, how) {
  let item;
  await cas(key(email), cur => {
    if (!cur || !cur.items[k]) throw new HttpError(404, 'not_found', 'That task isn’t on your list any more.');
    const it = { ...cur.items[k] }, now = core.nowIso();
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

module.exports = { refresh, mark, addDef, deleteDef, counts };
