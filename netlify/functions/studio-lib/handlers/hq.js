'use strict';
/*
 * Auntie Tobi HQ Content Hub — /.netlify/functions/studio-hq
 * Who can use it: admins (STUDIO_ADMIN_EMAILS) and the HQ team (hq/team — e.g. an assistant).
 * The HQ team signs in with an "hq" session, which never works in Business Studio Admin.
 *   POST { action: 'login-request' | 'login-verify' | 'logout' }                 (no session needed)
 *   POST { action: 'boot' | 'save' | 'save-many' | 'delete' | 'restore' | 'img' }
 *   POST { action: 'team-save', emails: [] }                                      (admins only)
 *   GET  ?img=<id>     a card image
 */
const core = require('../core');
const { HttpError, handler } = core;
const hq = require('../hq');

function requireEmail(e) {
  const email = core.normalizeEmail(e);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'invalid_email', 'Please enter a valid email address.');
  return email;
}

// Admin cookie (admins) or HQ cookie (HQ team, re-checked against the team list every time).
async function requireHq(ctx) {
  const cookies = core.parseCookies(ctx.event);
  if (cookies[core.COOKIE_ADMIN]) {
    try { const a = await core.requireAdmin(ctx); return { email: a.email, isAdmin: true }; } catch (e) { /* fall through to HQ cookie */ }
  }
  const token = cookies[core.COOKIE_HQ];
  if (token && token.length <= 100) {
    const sess = await core.getJson(`sess/${core.sha256(token)}`);
    if (sess && sess.role === 'hq' && sess.expiresAt > Date.now() && (await hq.team()).includes(sess.email)) return { email: sess.email, isAdmin: false };
    ctx.cookiesOut.push(core.clearCookie(core.COOKIE_HQ));
  }
  throw new HttpError(401, 'signed_out', 'Please sign in.');
}

exports.handler = handler(async (ctx) => {
  const { event, body } = ctx;
  if (event.httpMethod === 'GET') {
    await requireHq(ctx);
    const img = await hq.getImage((event.queryStringParameters || {}).img);
    if (!img) throw new HttpError(404, 'not_found', 'Not found.');
    const m = /^data:([^;]+);base64,(.*)$/.exec(img.dataUrl);
    return { statusCode: 200, headers: { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=86400' }, body: m[2], isBase64Encoded: true };
  }

  // ── sign-in ──
  if (body.action === 'login-request') {
    const email = requireEmail(body.email);
    await core.rateLimit('hq-otp-ip', ctx.ip, 10, 60 * 60 * 1000);
    if (core.adminEmails().includes(email)) await core.issueOtp(email, 'admin');
    else if ((await hq.team()).includes(email)) await core.issueOtp(email, 'hq');
    else await core.sleep(300 + Math.random() * 400);
    return { ok: true, message: 'If that address has HQ access, a code is on its way.' };
  }
  if (body.action === 'login-verify') {
    const email = requireEmail(body.email);
    await core.rateLimit('hq-verify-ip', ctx.ip, 20, 60 * 60 * 1000);
    const role = core.adminEmails().includes(email) ? 'admin' : (await hq.team()).includes(email) ? 'hq' : '';
    if (!role || !(await core.checkOtp(email, role, body.code))) throw new HttpError(400, 'invalid_code', 'That code is incorrect or has expired.');
    const s = await core.createSession(email, role, event);
    ctx.cookiesOut.push(s.cookie);
    await core.audit(email, role === 'admin' ? 'admin_login' : 'hq_login', { ip: ctx.ip, via: 'hq' });
    return { ok: true };
  }
  if (body.action === 'logout') {
    const c = core.parseCookies(event);
    for (const name of [core.COOKIE_HQ, core.COOKIE_ADMIN]) {
      if (c[name]) await core.del(`sess/${core.sha256(c[name])}`).catch(() => {});
      ctx.cookiesOut.push(core.clearCookie(name));
    }
    return { ok: true };
  }

  const who = await requireHq(ctx);
  await core.rateLimit('hq', who.email, 1200, 60 * 60 * 1000);
  switch (body.action) {
    case 'boot': return { admin: who.email, me: who.email, isAdmin: who.isAdmin, names: await hq.names(), team: who.isAdmin ? await hq.teamFull() : undefined, items: await hq.list(), bin: await hq.bin(), trashDays: hq.TRASH_DAYS, today: core.dayKey(), types: hq.TYPES, topics: hq.TOPICS, statuses: hq.STATUSES };
    case 'save': return { item: await hq.save(body.item, who.email) };
    case 'save-many': return { items: await hq.saveMany(body.items, body.source, who.email) };
    case 'delete': return { n: await hq.remove(body.ids || body.id, false, who.email) };
    case 'restore': return { n: await hq.remove(body.ids || body.id, true, who.email), items: await hq.list() };
    case 'bin': return { bin: await hq.bin() };
    case 'purge': {
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can delete cards forever.');
      const n = await hq.purge(body.ids || body.id);
      await core.audit(who.email, 'hq_purge', { n });
      return { n, bin: await hq.bin() };
    }
    case 'img': return { id: await hq.saveImage(body.dataUrl) };
    case 'team-save': {
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can change who has access.');
      const t = await hq.setTeam(body.emails, body.names);
      await core.audit(who.email, 'hq_team', { n: t.emails.length });
      return { team: t };
    }
    default: throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
}, { allowGet: true, maxBody: 2.5 * 1024 * 1024 });
