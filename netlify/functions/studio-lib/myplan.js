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
    dom: Math.max(0, Math.min(31, +x.dom || 0)),
  };
  // 🎉 a celebration date (birthday, anniversary…): repeats yearly
  if (x.cel && typeof x.cel === 'object') {
    const c = x.cel, yr = new Date().getFullYear();
    it.cel = { n: cleanText(c.n, 60), r: cleanText(c.r, 20), k: ['birthday', 'anniversary', 'wedding', 'other'].includes(c.k) ? c.k : 'birthday', y: (+c.y >= 1900 && +c.y <= yr) ? +c.y : 0,
      lead: (Array.isArray(c.lead) ? c.lead : [3]).map(Number).filter(n => [0, 1, 3, 7, 14].includes(n)).slice(0, 5), sent: (Array.isArray(c.sent) ? c.sent : []).map(Number).filter(n => n > 2000 && n < 2200).slice(-20) };
    it.rep = it.d ? 'y' : '';
  }
  if (!it.t && !it.del) return null;
  return it;
}

// 🛒 a shopping list: { id, name, emoji, items: [{ id, n, q, c, p, x }], up, del }   p = estimated £ (optional), x = bought
function cleanList(x) {
  if (!x || !/^[a-z0-9]{6,24}$/.test(String(x.id || ''))) return null;
  const l = { id: x.id, name: cleanText(x.name, 50) || 'Shopping list', emoji: cleanText(x.emoji, 8) || '🛒', up: Math.max(0, Math.min(Date.now() + 60000, +x.up || 0)), del: !!x.del,
    items: (Array.isArray(x.items) ? x.items : []).slice(0, 300).map(i => i && /^[a-z0-9]{4,24}$/.test(String(i.id || '')) ? { id: i.id, n: cleanText(i.n, 80), q: cleanText(i.q, 24), c: cleanText(i.c, 30), p: (+i.p >= 0 && +i.p < 100000) ? Math.round(+i.p * 100) / 100 : null, x: !!i.x } : null).filter(i => i && i.n) };
  return l;
}
function mergeLists(cur, incoming) {
  const map = new Map((cur || []).map(l => [l.id, l]));
  (incoming || []).slice(0, 60).forEach(raw => { const l = cleanList(raw); if (!l) return; const old = map.get(l.id); if (!old || l.up >= old.up) map.set(l.id, l); });
  const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
  return [...map.values()].filter(l => !(l.del && l.up < cutoff)).slice(-60);
}
function merge(cur, incoming) {
  const map = new Map((cur || []).map(i => [i.id, i]));
  (incoming || []).slice(0, 400).forEach(raw => { const it = cleanItem(raw); if (!it) return; const old = map.get(it.id); if (!old || it.up >= old.up) map.set(it.id, it); });
  const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
  return [...map.values()].filter(i => !(i.del && i.up < cutoff)).slice(-MAX_ITEMS);
}

const live = items => (items || []).filter(i => !i.del);
function publicState(u) { return { signedIn: true, email: u.email, name: u.name || '', town: u.town || '', news: !!u.news, rm: u.rm || '', items: u.items || [], lists: u.lists || [] }; }

async function touchIndex(h, u, signup) {
  const today = day();
  await cas('myplan/index', cur => {
    cur = cur || { u: {} };
    const was = cur.u[h], n = live(u.items).length;
    if (!signup && was && was.last === today && was.n === n && was.news === !!u.news && was.town === (u.town || '') && (was.rm || '') === (u.rm || '')) return undefined;
    cur.u[h] = { email: u.email, at: (was && was.at) || u.createdAt || core.nowIso(), last: today, n, news: !!u.news, town: u.town || '', rm: u.rm || '' };
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
    if (Array.isArray(b.lists)) cur.lists = mergeLists(cur.lists, b.lists);
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
    if (Array.isArray(ctx.body.lists)) cur.lists = mergeLists(cur.lists, ctx.body.lists);
    cur.last = day(); u = cur; return cur;
  });
  await touchIndex(w.h, u, false).catch(() => {});
  return { items: u.items, lists: u.lists || [] };
}

async function prefs(ctx) {
  const w = await who(ctx), b = ctx.body;
  let u;
  await cas('myplan/u/' + w.h, cur => {
    if (!cur) throw new HttpError(401, 'signed_out', 'Please sign in again.');
    if (b.name !== undefined) cur.name = cleanText(b.name, 40);
    if (b.town !== undefined) cur.town = cleanText(b.town, 60);
    if (typeof b.news === 'boolean') cur.news = b.news;
    if (b.rm !== undefined) cur.rm = ['06', '07', '08', '09', '10'].includes(b.rm) ? b.rm : '';
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

// ───── 📰 Sunday Update sign-up without a My Plan account (the News box) ─────
async function newsCode(email, ip) {
  email = core.requireEmail(email);
  await core.rateLimit('news-code-ip', ip, 20, 60 * 60 * 1000, 'Too many codes — please try again in a little while.');
  await core.rateLimit('news-code', email, 5, 60 * 60 * 1000, 'Too many codes for this email — please try again later.');
  await core.issueOtp(email, 'myplan');
  return { sent: true };
}
async function newsVerify(ctx) {
  const email = core.requireEmail(ctx.body.email);
  await core.rateLimit('myplan-verify', ctx.ip, 30, 60 * 60 * 1000, 'Too many tries — please wait a little and try again.');
  if (!(await core.checkOtp(email, 'myplan', ctx.body.code))) throw new HttpError(400, 'bad_code', 'That code didn’t work — check it, or ask for a new one.');
  await require('./sunday').subscribe(email, 'news');
  await core.audit(email, 'news_subscribe', {}).catch(() => {});
  return { subscribed: true };
}

// ───── ☀️ morning email: "what's on your plan today" (only on days with something due, only if they switched it on) ─────
async function morning(budgetMs, now) {
  const sunday = require('./sunday'), emails = require('./emails');
  const L = sunday.london(now), hh = String(L.hour).padStart(2, '0'), stop = Date.now() + (budgetMs || 20000);
  const idx = (await getJson('myplan/index').catch(() => null)) || { u: {} };
  const due = Object.entries(idx.u).filter(([, v]) => v.rm && v.rm <= hh);
  let sent = 0;
  for (const [h] of due) {
    if (Date.now() > stop) break;
    const u = await getJson('myplan/u/' + h).catch(() => null);
    if (!u || !u.rm || u.rmSent === L.day || u.rm > hh) continue;
    const daysTo = d => Math.round((new Date(d + 'T12:00:00Z') - new Date(L.day + 'T12:00:00Z')) / 864e5);
    // to-dos due today or overdue · 🎉 celebrations on the day or on a chosen "remind me" day before
    const items = (u.items || []).filter(i => !i.del && !i.done && i.d && (i.cel ? (daysTo(i.d) === 0 || (i.cel.lead || []).includes(daysTo(i.d))) : i.d <= L.day)).sort((a, b) => (a.d + (a.tm || '')).localeCompare(b.d + (b.tm || '')));
    await cas('myplan/u/' + h, cur => { if (!cur) return undefined; cur.rmSent = L.day; return cur; });
    if (!items.length) continue;
    const t12 = tm => { const x = +tm.slice(0, 2); return (x % 12 || 12) + (tm.slice(3) !== '00' ? ':' + tm.slice(3) : '') + (x < 12 ? 'am' : 'pm'); };
    const line = i => { if (i.cel) { const n = daysTo(i.d); return '- 🎉 ' + i.t + (n === 0 ? ' — today!' : n === 1 ? ' — tomorrow' : ' — in ' + n + ' days') + ` (make a card: ${core.siteBase()}/?plan=cel)`; } return '- ' + i.t + (i.d < L.day ? ' (overdue)' : i.tm ? ' at ' + t12(i.tm) : ''); };
    const list = items.slice(0, 8).map(line).join('\n') + (items.length > 8 ? '\n- …and ' + (items.length - 8) + ' more' : '');
    const off = `${core.siteBase()}/.netlify/functions/my-plan?roff=${h}.${core.hmac('roff:' + h).slice(0, 20)}`;
    const vars = { name: u.name || '', name_comma: u.name ? ', ' + u.name : '', list, count: String(items.length), plan_link: `${core.siteBase()}/?plan=1`, off_link: off };
    const text = `Good morning${vars.name_comma} ☀️\n\nHere’s what’s on your plan today:\n\n${list.replace(/^- /gm, '• ')}\n\nOpen My Plan: ${vars.plan_link}\n\nAuntie Tobi 💚\n\nYou get this because you switched on morning emails in My Plan. Turn them off: ${off}`;
    const m = await emails.system('plan.morning', vars, { subject: '☀️ Your plan for today', text, html: '' });
    const html = m.html || emails.renderWith({ subject: m.subject, body: `Good morning{name_comma} ☀️\n\nHere’s what’s on your plan today:\n\n{list}\n\n[[💚 Open My Plan|{plan_link}]]\n\nAuntie Tobi 💚` }, vars, 'You get this because you switched on morning emails in My Plan. [Turn them off](' + off + ')').html;
    const ok = await core.sendEmail([u.email], m.subject, m.text || text, html, { 'List-Unsubscribe': `<${off}>` }).catch(() => false);
    if (ok) sent++;
  }
  return { hour: hh, checked: due.length, sent };
}
async function remindOff(tok) {
  const [h, sig] = String(tok || '').split('.');
  if (!/^[a-f0-9]{32}$/.test(h || '') || sig !== core.hmac('roff:' + h).slice(0, 20)) return false;
  let u; await cas('myplan/u/' + h, cur => { if (!cur) return undefined; cur.rm = ''; u = cur; return cur; });
  if (u) await touchIndex(h, u, false).catch(() => {});
  return true;
}

module.exports = { newsCode, newsVerify, morning, remindOff, requestCode, verify, me, save, prefs, signout, deleteAll, stats, merge, cleanItem, COOKIE };
