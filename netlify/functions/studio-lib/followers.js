'use strict';
/*
 * 📈 Auntie Tobi growth tracker (HQ, admin only): Instagram (@auntietobi_uk) and WhatsApp Channel followers.
 *   Typed in by Auntie Tobi (no free way to read them automatically), one entry per day.
 *   followers/log  { items: { 'YYYY-MM-DD': { ig, ch, at } }, targets: { ig: { n, by }, ch: { n, by } } }
 */
const core = require('./core');
const { HttpError, cas, getJson } = core;
const KEY = 'followers/log';
const KINDS = ['ig', 'ch'];
const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && !isNaN(Date.parse(d + 'T12:00:00Z'));
const num = v => { if (v === '' || v == null) return null; const n = Math.round(Number(String(v).replace(/[,\s]/g, ''))); if (!Number.isFinite(n) || n < 0 || n > 1e9) throw new HttpError(400, 'bad_number', 'Please type a whole number, e.g. 1250.'); return n; };

async function get() {
  const cur = (await getJson(KEY).catch(() => null)) || {};
  return { items: cur.items || {}, targets: cur.targets || {} };
}
async function add(day, ig, ch) {
  if (!isDay(day)) throw new HttpError(400, 'bad_date', 'Pick a date.');
  if (day > new Date(Date.now() + 864e5).toISOString().slice(0, 10)) throw new HttpError(400, 'bad_date', 'That date is in the future.');
  const v = { ig: num(ig), ch: num(ch) };
  if (v.ig == null && v.ch == null) throw new HttpError(400, 'empty', 'Type at least one number.');
  await cas(KEY, cur => {
    cur = cur || { items: {}, targets: {} }; cur.items = cur.items || {};
    const old = cur.items[day] || {};
    cur.items[day] = { ig: v.ig != null ? v.ig : (old.ig != null ? old.ig : null), ch: v.ch != null ? v.ch : (old.ch != null ? old.ch : null), at: core.nowIso() };
    return cur;
  });
  return get();
}
async function del(day) {
  if (!isDay(day)) throw new HttpError(400, 'bad_date', 'Pick a date.');
  await cas(KEY, cur => { if (!cur || !cur.items || !cur.items[day]) return undefined; delete cur.items[day]; return cur; });
  return get();
}
async function target(kind, n, by) {
  if (KINDS.indexOf(kind) < 0) throw new HttpError(400, 'bad_kind', 'Unknown tracker.');
  const t = n === '' || n == null ? null : num(n);
  if (t != null && !isDay(by)) throw new HttpError(400, 'bad_date', 'Pick the date you want to reach it by.');
  await cas(KEY, cur => { cur = cur || { items: {}, targets: {} }; cur.targets = cur.targets || {}; if (t == null) delete cur.targets[kind]; else cur.targets[kind] = { n: t, by }; return cur; });
  return get();
}
module.exports = { get, add, del, target };
