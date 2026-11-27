'use strict';
/*
 * 🎓 Save my progress — the free practice-test sites (lifeinuktest / ukdrivingtheorytest).
 *   Optional, no password: learners type their email and get a 6-digit code + a one-tap link (from test@…).
 *   Separate from My Plan (the Auntie Tobi app keeps using My Plan sign-in).
 *   lrn/u/<h>       { email, createdAt, last, tips, tipsAt, sess:[sha…] }            h = hmac(email)
 *   lrn/tests/<h>   { lituk: doc, drive: doc }   doc = { up, d, live, prac, p }       same shape as My Plan's tests
 *   lrn/index       { u: { <h>: { email, at, last, tips, t: { lituk:{n,m,b,pass}, drive:{…} } } } }   for HQ
 *   lrn/otp/<email> { hash, link, exp, attempts, sentAt, tips }
 *   lrn/link/<sha>  { email, exp }        the one-tap link (used once)
 *   lrn/sess/<sha>  { h, email, exp }     HttpOnly cookie, per site
 * HQ sees counts, and the emails of people who ticked "Send me study tips" (only those).
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, getJson, setJson, cas, del } = core;

const COOKIE = '__Host-lrn';
const SESS_MS = 365 * 864e5;
const CODE_MS = 15 * 60e3;
const TESTS = ['lituk', 'drive'];
const NAME = { lituk: 'Life in the UK Test Practice', drive: 'UK Driving Theory Practice' };
const PASS = { lituk: [18, 24], drive: [43, 50] };
const HOSTS = { lituk: 'lifeinuktest.auntietobi.co.uk', drive: 'ukdrivingtheorytest.auntietobi.co.uk' };
const MAIN = ['auntietobi.co.uk', 'www.auntietobi.co.uk'];

const uid = email => core.hmac('lrn:' + email).slice(0, 32);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const testOf = t => TESTS.includes(t) ? t : 'lituk';

// ── merging (the same rules run in the browser: testplan.js TestPlan.merge) ──
function mergePlan(nw, ol) {
  if (!nw) return ol || null; if (!ol) return nw;
  const out = JSON.parse(JSON.stringify(nw)), seen = {};
  out.log = [].concat(ol.log || [], nw.log || []).filter(l => Array.isArray(l) && l.length >= 3)
    .filter(l => { const k = l[0] + '|' + l[2]; if (seen[k]) return false; seen[k] = 1; return true; })
    .sort((a, b) => a[2] - b[2]).slice(-800);
  out.due = Object.assign({}, ol.due || {}, nw.due || {});
  out.flags = Object.assign({}, ol.flags || {}, nw.flags || {});
  if (!out.prefs || (ol.prefs && String(ol.prefs.at || '') > String(out.prefs.at || ''))) out.prefs = ol.prefs || out.prefs;
  if (!out.passed && ol.passed) out.passed = ol.passed;
  if (!out.bank && ol.bank) out.bank = ol.bank;
  return out;
}
function mergeTest(a, b) {   // a = saved, b = incoming; the newer one wins, but results, "seen" and the plan history are added together
  if (!a) return b; if (!b) return a;
  const newer = (b.up || 0) >= (a.up || 0) ? b : a, older = newer === a ? b : a;
  const out = JSON.parse(JSON.stringify(newer)); out.d = out.d || {};
  const od = older.d || {}, key = m => String(m.id || (m.at + '|' + m.s));
  const ms = {}; [].concat(od.mocks || [], out.d.mocks || []).forEach(m => { if (m && typeof m === 'object') ms[key(m)] = Object.assign(ms[key(m)] || {}, m); });
  out.d.mocks = Object.values(ms).sort((x, y) => (x.id || 0) - (y.id || 0) || String(x.at).localeCompare(String(y.at))).slice(-60);
  out.d.seen = Object.assign({}, od.seen || {}, out.d.seen || {});
  if (newer.p || older.p) out.p = mergePlan(newer.p, older.p);
  return out;
}
function summary(k, doc) {
  const d = (doc && doc.d) || {}, ms = d.mocks || [], pass = PASS[k][0];
  return { n: d.n || 0, m: ms.length, b: ms.reduce((a, x) => Math.max(a, +x.s || 0), 0), ok: ms.filter(x => (+x.s || 0) >= pass).length, pass: !!(doc && doc.p && doc.p.passed), date: d.date || '' };
}

// ── email ──
async function send(to, subject, text, html) {
  const key = core.env('RESEND_API_KEY');
  if (!key) {
    if (core.env('STUDIO_EMAIL_MODE') === 'log') { console.log(`[learn] email to ${to}: ${subject}\n${text}`); (global.mailLog = global.mailLog || []).push({ to, subject, text, html }); return true; }
    throw new HttpError(500, 'email_not_configured', 'Email sending is not set up yet.');
  }
  const from = [core.env('TEST_EMAIL_FROM', 'Test Practice <test@auntietobi.co.uk>'), 'Test Practice <test@mail.auntietobi.co.uk>'];
  for (let i = 0; i < from.length; i++) {   // if auntietobi.co.uk itself isn't verified in Resend, fall back to the verified mail. subdomain
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: from[i], to: [to], subject, text, html }) });
    if (r.ok) return true;
    const t = (await r.text()).slice(0, 300); console.error('[learn] email failed', from[i], r.status, t);
    if (!(r.status === 403 || r.status === 422) || !/domain|verif/i.test(t)) return false;
  }
  return false;
}
function mailHtml(k, code, link) {
  const navy = '#0B1F33', green = '#0E7C5A';
  return `<!doctype html><html><body style="margin:0;background:#F5F6F2;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${navy}"><div style="max-width:500px;margin:0 auto;padding:28px 16px">
<div style="background:#fff;border:1px solid #E4E2DA;border-radius:18px;padding:26px 24px">
<div style="font-weight:800;font-size:16px;margin-bottom:18px">${esc(NAME[k])}</div>
<p style="margin:0 0 8px;font-size:16px">Your code to save your progress:</p>
<p style="font-size:36px;letter-spacing:9px;font-weight:800;margin:0 0 18px">${code}</p>
<p style="margin:0 0 16px;font-size:15px;color:#4A5A6B">Type it on the page — or tap the button on the phone or computer you’re practising on.</p>
<a href="${esc(link)}" style="display:inline-block;background:${green};color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:13px 22px;border-radius:12px">Save my progress</a>
<p style="margin:18px 0 0;font-size:13px;color:#6B7785">The code and button work for 15 minutes. Didn’t ask for this? Ignore this email — nothing happens without the code.</p>
</div><p style="font-size:12px;color:#8A93A0;text-align:center;margin-top:14px">Free practice by Auntie Tobi · Not affiliated with the UK government</p></div></body></html>`;
}
// where the one-tap link takes them back to (only our own addresses)
function backTo(ctx, k, where) {
  const host = String(core.header(ctx.event, 'host') || '').toLowerCase().split(':')[0];
  const site = where !== 'app';
  if (site && Object.values(HOSTS).includes(host)) return `https://${host}/`;
  const base = MAIN.includes(host) || /\.netlify\.app$/.test(host) ? `https://${host}` : 'https://www.auntietobi.co.uk';
  if (site) return MAIN.includes(host) || /\.netlify\.app$/.test(host) ? `${base}/test-sites/${k === 'drive' ? 'ukdriving' : 'lifeinuk'}` : `https://${HOSTS[k]}/`;
  return `${base}/?${k === 'drive' ? 'drive' : 'lifeuk'}=1`;
}

// ── sign-in ──
async function start(ctx) {
  const b = ctx.body, email = core.requireEmail(b.email), k = testOf(b.test);
  await core.rateLimit('lrn-code-ip', ctx.ip, 20, 3600e3, 'Too many codes — please try again in a little while.');
  await core.rateLimit('lrn-code', email, 6, 3600e3, 'Too many codes for this email — please try again in a little while.');
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0'), link = core.randomToken(24), now = Date.now();
  let sendIt = true;
  await cas(`lrn/otp/${core.enc(email)}`, cur => {
    if (cur && !b.again && now - cur.sentAt < 45e3 && cur.exp > now) { sendIt = false; return undefined; }   // double tap
    return { hash: core.hmac(`lrn:${email}:${code}`), exp: now + CODE_MS, attempts: 0, sentAt: now, tips: false };   // study tips: switched off for now
  });
  if (!sendIt) return { sent: true };
  await setJson(`lrn/link/${core.sha256(link)}`, { email, exp: now + CODE_MS });
  const back = backTo(ctx, k, b.where), url = back + (back.includes('?') ? '&' : '?') + 'save=' + link;
  const ok = await send(email, `${code} is your code to save your progress`,
    `${NAME[k]}\n\nYour code to save your progress: ${code}\n\nOr open this link on the phone or computer you're practising on:\n${url}\n\nThe code and link work for 15 minutes. Didn't ask for this? Ignore this email.`, mailHtml(k, code, url));
  if (!ok) throw new HttpError(502, 'email_failed', 'We couldn’t send the email just now. Please try again.');
  return { sent: true };
}
async function signInAs(ctx, email, tips) {
  const h = uid(email), now = core.nowIso(), token = core.randomToken(32), sha = core.sha256(token);
  let u, isNew = false;
  await cas('lrn/u/' + h, cur => {
    isNew = !cur; cur = cur || { email, createdAt: now, tips: false };
    cur.email = email; cur.last = core.dayKey();
    if (tips && !cur.tips) { cur.tips = true; cur.tipsAt = now; }
    cur.sess = [].concat(cur.sess || [], sha).slice(-20);
    u = cur; return cur;
  });
  await setJson('lrn/sess/' + sha, { h, email, exp: Date.now() + SESS_MS });
  ctx.cookiesOut.push(core.cookie(COOKIE, token, SESS_MS / 1000));
  await touchIndex(h, u, null);
  await core.audit(email, isNew ? 'learner_signup' : 'learner_signin', {}).catch(() => {});
  return { signedIn: true, email, tips: !!u.tips, isNew };
}
async function verify(ctx) {
  const email = core.requireEmail(ctx.body.email), code = String(ctx.body.code || '').replace(/\D/g, '');
  await core.rateLimit('lrn-verify', ctx.ip, 30, 3600e3, 'Too many tries — please wait a little and try again.');
  if (code.length !== 6) throw new HttpError(400, 'bad_code', 'Please enter the 6-digit code from the email.');
  let ok = false, tips = false;
  await cas(`lrn/otp/${core.enc(email)}`, cur => {
    if (!cur) return undefined;
    if (cur.exp < Date.now() || cur.attempts >= 5) return Object.assign({}, cur, { exp: 0 });
    const want = core.hmac(`lrn:${email}:${code}`);
    if (want.length === cur.hash.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(cur.hash))) { ok = true; tips = !!cur.tips; return Object.assign({}, cur, { exp: 0 }); }
    return Object.assign({}, cur, { attempts: cur.attempts + 1 });
  });
  if (!ok) throw new HttpError(400, 'bad_code', 'That code didn’t work — check the latest email, or ask for a new one.');
  await del(`lrn/otp/${core.enc(email)}`).catch(() => {});
  return signInAs(ctx, email, tips);
}
async function link(ctx) {
  const t = String(ctx.body.link || '');
  await core.rateLimit('lrn-verify', ctx.ip, 30, 3600e3, 'Too many tries — please wait a little and try again.');
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(t)) throw new HttpError(400, 'bad_link', 'That link didn’t work. Please ask for a new one.');
  const key = `lrn/link/${core.sha256(t)}`, l = await getJson(key).catch(() => null);
  await del(key).catch(() => {});
  if (!l || l.exp < Date.now()) throw new HttpError(400, 'bad_link', 'That link has expired or was already used. Please ask for a new one.');
  await del(`lrn/otp/${core.enc(l.email)}`).catch(() => {});
  return signInAs(ctx, l.email, l.tips);
}
async function who(ctx, optional) {
  const token = core.parseCookies(ctx.event)[COOKIE];
  const out = () => { if (optional) return null; throw new HttpError(401, 'signed_out', 'Please save your progress again.'); };
  if (!token || token.length > 100) return out();
  const s = await getJson('lrn/sess/' + core.sha256(token)).catch(() => null);
  if (!s || s.exp < Date.now()) { ctx.cookiesOut.push(core.clearCookie(COOKIE)); return out(); }
  return { h: s.h, email: s.email, token };
}
async function me(ctx) {
  const w = await who(ctx, true); if (!w) return { signedIn: false };
  const u = (await getJson('lrn/u/' + w.h).catch(() => null)) || {};
  return { signedIn: true, email: w.email, tips: !!u.tips };
}
async function signout(ctx) {
  const w = await who(ctx, true);
  if (w) await del('lrn/sess/' + core.sha256(w.token)).catch(() => {});
  ctx.cookiesOut.push(core.clearCookie(COOKIE));
  return { signedIn: false };
}
async function tips(ctx) {
  const w = await who(ctx), on = !!ctx.body.on;
  let u; await cas('lrn/u/' + w.h, cur => { if (!cur) return undefined; cur.tips = on; if (on) cur.tipsAt = core.nowIso(); u = cur; return cur; });
  if (u) await touchIndex(w.h, u, null);
  return { tips: on };
}
// 🗑️ everything saved for this email, on every device
async function deleteAll(ctx) {
  const w = await who(ctx);
  const u = await getJson('lrn/u/' + w.h).catch(() => null);
  for (const s of (u && u.sess) || []) await del('lrn/sess/' + s).catch(() => {});
  await del('lrn/u/' + w.h).catch(() => {});
  await del('lrn/tests/' + w.h).catch(() => {});
  await cas('lrn/index', cur => { if (!cur || !cur.u[w.h]) return undefined; delete cur.u[w.h]; return cur; });
  await core.audit(w.email, 'learner_deleted', {}).catch(() => {});
  ctx.cookiesOut.push(core.clearCookie(COOKIE));
  return { signedIn: false, deleted: true };
}

// ── progress ──
async function testsGet(ctx) {
  const w = await who(ctx);
  return { tests: (await getJson('lrn/tests/' + w.h).catch(() => null)) || {} };
}
async function testsSave(ctx) {
  const w = await who(ctx), k = ctx.body.k, doc = ctx.body.doc;
  if (!TESTS.includes(k) || !doc || typeof doc !== 'object') throw new HttpError(400, 'invalid', 'Nothing to save.');
  if (JSON.stringify(doc).length > 400000) throw new HttpError(413, 'too_large', 'Too much to save.');
  await core.rateLimit('lrn-tests', w.h, 900, 3600e3, 'Lots of saves — give it a minute.');
  let out;
  await cas('lrn/tests/' + w.h, cur => { cur = cur || {}; cur[k] = mergeTest(cur[k], doc); out = cur[k]; return cur; });
  const u = await getJson('lrn/u/' + w.h).catch(() => null);
  if (u) await touchIndex(w.h, u, { k, s: summary(k, out) });
  return { doc: out };
}
async function touchIndex(h, u, t) {
  const today = core.dayKey();
  await cas('lrn/index', cur => {
    cur = cur || { u: {} };
    const was = cur.u[h] || {}, tt = Object.assign({}, was.t || {});
    if (t) tt[t.k] = t.s;
    const next = { email: u.email, at: was.at || u.createdAt || core.nowIso(), last: today, tips: !!u.tips, t: tt };
    if (JSON.stringify(next) === JSON.stringify(was)) return undefined;
    cur.u[h] = next; return cur;
  });
}

// 📊 HQ: counts, plus the emails of people who asked for study tips
async function stats() {
  const idx = (await getJson('lrn/index').catch(() => null)) || { u: {} };
  const users = Object.values(idx.u), today = core.dayKey();
  const ago = n => { const t = new Date(today + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() - n); return t.toISOString().slice(0, 10); };
  const days = []; for (let i = 13; i >= 0; i--) { const d = ago(i); days.push({ d, n: users.filter(u => String(u.at).slice(0, 10) === d).length }); }
  const per = k => { const us = users.filter(u => u.t && u.t[k]); return { users: us.length, answered: us.reduce((a, u) => a + (u.t[k].n || 0), 0), mocks: us.reduce((a, u) => a + (u.t[k].m || 0), 0), passMock: us.filter(u => u.t[k].ok).length, passed: us.filter(u => u.t[k].pass).length, booked: us.filter(u => u.t[k].date).length }; };
  return {
    total: users.length, active7: users.filter(u => u.last >= ago(6)).length, tips: users.filter(u => u.tips).length, days,
    lituk: per('lituk'), drive: per('drive'),
    list: users.filter(u => u.tips).sort((a, b) => String(b.at).localeCompare(String(a.at))).map(u => ({ email: u.email, at: String(u.at).slice(0, 10), last: u.last, tests: Object.keys(u.t || {}).filter(k => TESTS.includes(k)), passed: Object.keys(u.t || {}).filter(k => u.t[k] && u.t[k].pass) })),
  };
}

module.exports = { start, verify, link, me, signout, tips, deleteAll, testsGet, testsSave, stats, mergeTest, mergePlan, COOKIE };
