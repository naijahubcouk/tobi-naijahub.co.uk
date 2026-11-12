'use strict';
/*
 * 💚 My Plan — the everyday planner in the Auntie Tobi app (free for everyone).
 *   Sign in with an email code (same codes as Business Studio — one Auntie Tobi account), no password.
 *   myplan/u/<h>   { email, name, town, news, createdAt, last, items: [item…] }      h = hmac(email)
 *   myplan/index   { u: { <h>: { email, at, last, n, news, town } } }                 counts for HQ (never item contents)
 *   news/subs      { s: { <h>: { email, at, src } } }                                 📰 Sunday Update sign-ups (opt-in only)
 *   mpsess/<sha>   { h, email, exp }                                                  the app's sign-in (HttpOnly cookie)
 * item: { id, t, d 'YYYY-MM-DD'|'', tm 'HH:MM'|'', rep ''|d|w|m|y, note, done, doneAt, last, ck: [{t,x}], lk, src, up, del }
 * Items are private: only the signed-in owner can read or change them; HQ sees counts only.
 */
const core = require('./core');
const { HttpError, getJson, setJson, cas, cleanText, del } = core;

const COOKIE = '__Host-atplan';
const SESS_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 1500;

const uid = email => core.hmac('myplan:' + email).slice(0, 32);
const day = () => core.dayKey();

function cleanItem(x) {
  if (!x || !/^[a-z0-9]{6,24}$/.test(String(x.id || ''))) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(x.d || '')) ? x.d : '';
  const it = {
    id: x.id, t: cleanText(x.t, 140), d, tm: d && /^([01]\d|2[0-3]):[0-5]\d$/.test(String(x.tm || '')) ? x.tm : '',
    rep: d && ['d', 'w', 'm', 'y'].includes(x.rep) ? x.rep : '', note: String(x.note || '').replace(/\r/g, '').slice(0, 1000),
    done: !!x.done, doneAt: /^\d{4}-\d{2}-\d{2}$/.test(String(x.doneAt || '')) ? x.doneAt : '', last: /^\d{4}-\d{2}-\d{2}$/.test(String(x.last || '')) ? x.last : '',
    ck: (Array.isArray(x.ck) ? x.ck : []).slice(0, 25).map(c => ({ t: cleanText(c && c.t, 120), x: !!(c && c.x) })).filter(c => c.t),
    lk: cleanText(x.lk, 24), src: cleanText(x.src, 60), up: Math.max(0, Math.min(Date.now() + 60000, +x.up || 0)), del: !!x.del,
  };
  if (!it.t && !it.del) return null;
  return it;
}

function merge(cur, incoming) {
  const map = new Map((cur || []).map(i => [i.id, i]));
  (incoming || []).slice(0, 400).forEach(raw => { const it = cleanItem(raw); if (!it) return; const old = map.get(it.id); if (!old || it.up >= old.up) map.set(it.id, it); });
  const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
  return [...map.values()].filter(i => !(i.del && i.up < cutoff)).slice(-MAX_ITEMS);
}

const live = items => (items || []).filter(i => !i.del);
function publicState(u) { return { signedIn: true, email: u.email, name: u.name || '', town: u.town || '', news: !!u.news, items: u.items || [] }; }

async function touchIndex(h, u, signup) {
  const today = day();
  await cas('myplan/index', cur => {
    cur = cur || { u: {} };
    const was = cur.u[h], n = live(u.items).length;
    if (!signup && was && was.last === today && was.n === n && was.news === !!u.news && was.town === (u.town || '')) return undefined;
    cur.u[h] = { email: u.email, at: (was && was.at) || u.createdAt || core.nowIso(), last: today, n, news: !!u.news, town: u.town || '' };
    return cur;
  });
}
async function setNews(h, email, on, src) {
  await cas('news/subs', cur => {
    cur = cur || { s: {} };
    if (on) { if (cur.s[h]) return undefined; cur.s[h] = { email, at: core.nowIso(), src: src || 'myplan' }; }
    else { if (!cur.s[h]) return undefined; delete cur.s[h]; }
    return cur;
  });
}

// ── sign-in ──
async function requestCode(email, ip) {
  email = core.requireEmail(email);
  await core.rateLimit('myplan-code-ip', ip, 20, 60 * 60 * 1000, 'Too many codes — please try again in a little while.');
  await core.rateLimit('myplan-code', email, 6, 60 * 60 * 1000, 'Too many codes for this email — please try again in a little while.');
  await core.issueOtp(email, 'myplan');
  return { sent: true };
}

async function verify(ctx) {
  const b = ctx.body;
  const email = core.requireEmail(b.email);
  await core.rateLimit('myplan-verify', ctx.ip, 30, 60 * 60 * 1000, 'Too many tries — please wait a little and try again.');
  if (!(await core.checkOtp(email, 'myplan', b.code))) throw new HttpError(400, 'bad_code', 'That code didn’t work — check it, or ask for a new one.');
  const h = uid(email), now = core.nowIso();
  let u, isNew = false;
  await cas('myplan/u/' + h, cur => {
    isNew = !cur;
    cur = cur || { email, createdAt: now, items: [] };
    cur.email = email; cur.last = day();
    if (b.name) cur.name = cleanText(b.name, 40);
    if (b.town) cur.town = cleanText(b.town, 60);
    if (typeof b.news === 'boolean' && (isNew || b.news)) cur.news = b.news;
    cur.items = merge(cur.items, b.items);
    u = cur; return cur;
  });
  await touchIndex(h, u, isNew);
  if (u.news) await setNews(h, email, true, 'myplan');
  const token = core.randomToken(32);
  await setJson('mpsess/' + core.sha256(token), { h, email, exp: Date.now() + SESS_MS });
  ctx.cookiesOut.push(`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESS_MS / 1000}`);
  await core.audit(email, isNew ? 'myplan_signup' : 'myplan_signin', {}).catch(() => {});
  return Object.assign(publicState(u), { isNew });
}

async function who(ctx, optional) {
  const token = core.parseCookies(ctx.event)[COOKIE];
  const out = () => { if (optional) return null; throw new HttpError(401, 'signed_out', 'Please sign in to save your plan.'); };
  if (!token || token.length > 100) return out();
  const s = await getJson('mpsess/' + core.sha256(token)).catch(() => null);
  if (!s || s.exp < Date.now()) { ctx.cookiesOut.push(`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`); return out(); }
  if (s.exp - Date.now() < SESS_MS - 7 * 24 * 60 * 60 * 1000) {   // renew weekly
    s.exp = Date.now() + SESS_MS; await setJson('mpsess/' + core.sha256(token), s);
    ctx.cookiesOut.push(`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESS_MS / 1000}`);
  }
  return { h: s.h, email: s.email, token };
}

async function me(ctx) {
  const w = await who(ctx, true);
  if (!w) return { signedIn: false };
  const u = await getJson('myplan/u/' + w.h);
  if (!u) return { signedIn: false };
  await touchIndex(w.h, u, false).catch(() => {});
  return publicState(u);
}

async function save(ctx) {
  const w = await who(ctx);
  await core.rateLimit('myplan-save', w.h, 600, 60 * 60 * 1000, 'Lots of changes — give it a minute.');
  let u;
  await cas('myplan/u/' + w.h, cur => {
    if (!cur) throw new HttpError(401, 'signed_out', 'Please sign in again.');
    cur.items = merge(cur.items, ctx.body.items);
    cur.last = day(); u = cur; return cur;
  });
  await touchIndex(w.h, u, false).catch(() => {});
  return { items: u.items };
}

async function prefs(ctx) {
  const w = await who(ctx), b = ctx.body;
  let u;
  await cas('myplan/u/' + w.h, cur => {
    if (!cur) throw new HttpError(401, 'signed_out', 'Please sign in again.');
    if (b.name !== undefined) cur.name = cleanText(b.name, 40);
    if (b.town !== undefined) cur.town = cleanText(b.town, 60);
    if (typeof b.news === 'boolean') cur.news = b.news;
    u = cur; return cur;
  });
  await setNews(w.h, u.email, !!u.news, 'myplan');
  await touchIndex(w.h, u, false).catch(() => {});
  return publicState(u);
}

async function signout(ctx) {
  const w = await who(ctx, true);
  if (w) await del('mpsess/' + core.sha256(w.token)).catch(() => {});
  ctx.cookiesOut.push(`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return { signedIn: false };
}

// 🗑️ everything: the plan, the HQ count and the Sunday Update sign-up
async function deleteAll(ctx) {
  const w = await who(ctx);
  await del('myplan/u/' + w.h).catch(() => {});
  await cas('myplan/index', cur => { if (!cur || !cur.u[w.h]) return undefined; delete cur.u[w.h]; return cur; });
  await setNews(w.h, w.email, false);
  await core.audit(w.email, 'myplan_deleted', {}).catch(() => {});
  return signout(ctx);
}

// 📊 HQ: counts only — never anyone's items
async function stats() {
  const idx = (await getJson('myplan/index').catch(() => null)) || { u: {} };
  const subs = (await getJson('news/subs').catch(() => null)) || { s: {} };
  const users = Object.values(idx.u), today = day();
  const ago = n => { const t = new Date(today + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() - n); return t.toISOString().slice(0, 10); };
  const days = []; for (let i = 13; i >= 0; i--) { const d = ago(i); days.push({ d, n: users.filter(u => String(u.at).slice(0, 10) === d).length }); }
  return {
    total: users.length, active7: users.filter(u => u.last >= ago(6)).length, activeToday: users.filter(u => u.last === today).length,
    items: users.reduce((a, u) => a + (u.n || 0), 0), news: Object.keys(subs.s).length, days,
    latest: users.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 50).map(u => ({ email: u.email, at: u.at, last: u.last, n: u.n || 0, news: !!u.news, town: u.town || '' })),
  };
}

module.exports = { requestCode, verify, me, save, prefs, signout, deleteAll, stats, merge, cleanItem, COOKIE };
