'use strict';
/*
 * Auntie Tobi Business Studio — shared server library.
 * Used only by netlify/functions/studio-*.js. Nothing here touches the public app.
 *
 * Storage: Netlify Blobs store "auntie-tobi-studio" (strong consistency).
 * Every read-modify-write goes through cas(), which uses ETag conditional writes,
 * so simultaneous requests can never double-spend an allowance.
 */
const crypto = require('crypto');

const STORE_NAME = 'auntie-tobi-studio';
const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;

// ───────────────────────── configuration ─────────────────────────
const DEFAULT_SETTINGS = {
  standardLimit: 20,            // generations per DAY, Business Club only
  powerLimit: 100,              // generations per DAY with AI Power (with or without Club)
  perMinuteLimit: 6,            // burst protection per member
  spendWarnGbp: 30,             // email + admin alert when monthly AI spend passes this (and 2x). Never blocks.
  model: '',                    // blank = STUDIO_MODEL env or openai/gpt-4o-mini
  inputPricePerMUsd: 0.15,      // used only when the provider does not report cost
  outputPricePerMUsd: 0.60,
  usdToGbp: 0.79,
};

const SESSION = {
  idleMs: 30 * DAY,        // signed out after 30 days without use
  absoluteMs: 90 * DAY,    // always re-verify by email at least every 90 days
  rotateMs: 7 * DAY,       // session token is replaced weekly
  renewEveryMs: 12 * 60 * MIN,
  freshBillingMs: 24 * 60 * MIN, // billing needs an email code from the last 24h
  adminMs: 12 * 60 * MIN,  // admin sessions last 12 hours, no renewal
};

const COOKIE_MEMBER = '__Host-studio_sid';
const COOKIE_ADMIN = '__Host-studio_admin';

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function secret() {
  const s = env('STUDIO_SECRET');
  if (!s || s.length < 32) throw new HttpError(500, 'server_misconfigured', 'Studio is not configured yet (STUDIO_SECRET).');
  return s;
}

function adminEmails() {
  return String(env('STUDIO_ADMIN_EMAILS', ''))
    .split(',').map(normalizeEmail).filter(Boolean);
}

// ───────────────────────── errors & responses ─────────────────────────
class HttpError extends Error {
  constructor(status, code, message, extra) {
    super(message || code);
    this.status = status; this.code = code; this.extra = extra || {};
  }
}

const SECURITY_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
};

function respond(status, body, cookies) {
  const res = { statusCode: status, headers: { ...SECURITY_HEADERS }, body: JSON.stringify(body) };
  if (cookies && cookies.length) res.multiValueHeaders = { 'Set-Cookie': cookies };
  return res;
}

function errorResponse(err, cookies) {
  if (err instanceof HttpError) {
    return respond(err.status, { error: err.code, message: err.message, ...err.extra }, cookies);
  }
  console.error('[studio] unexpected error', err && err.stack || err);
  return respond(500, { error: 'server_error', message: 'Something went wrong. Please try again.' }, cookies);
}

// Wraps a handler: method + CSRF checks, JSON parsing, error handling.
function handler(fn, opts) {
  opts = opts || {};
  return async function (event, context) {
    const ctx = { event, context, cookiesOut: [] };
    try {
      connectBlobs(event);
      if (!opts.allowGet && event.httpMethod !== 'POST') throw new HttpError(405, 'method_not_allowed');
      if (event.httpMethod === 'POST' && !opts.skipCsrf) checkSameOrigin(event);
      ctx.body = event.httpMethod === 'POST' && !opts.rawBody ? parseJson(event) : {};
      ctx.ip = clientIp(event);
      const out = await fn(ctx);
      if (out && out.statusCode) {
        if (ctx.cookiesOut.length) out.multiValueHeaders = { 'Set-Cookie': ctx.cookiesOut };
        return out;
      }
      return respond(200, out || { ok: true }, ctx.cookiesOut);
    } catch (err) {
      return errorResponse(err, ctx.cookiesOut);
    }
  };
}

function parseJson(event) {
  let raw = event.body || '';
  if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');
  if (raw.length > 64 * 1024) throw new HttpError(413, 'too_large', 'Request is too large.');
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('not an object');
    return v;
  } catch (_) { throw new HttpError(400, 'bad_json', 'Invalid request.'); }
}

function header(event, name) {
  const h = event.headers || {};
  const lower = name.toLowerCase();
  for (const k of Object.keys(h)) if (k.toLowerCase() === lower) return h[k];
  return undefined;
}

// Blocks cross-site requests: a custom header can't be sent cross-origin without CORS,
// and we never send CORS headers. Origin, when present, must match the host.
function checkSameOrigin(event) {
  if (header(event, 'x-studio') !== '1') throw new HttpError(403, 'forbidden', 'Request blocked.');
  const origin = header(event, 'origin');
  if (origin) {
    let host;
    try { host = new URL(origin).host; } catch (_) { throw new HttpError(403, 'forbidden', 'Request blocked.'); }
    if (host !== header(event, 'host')) throw new HttpError(403, 'forbidden', 'Request blocked.');
  }
}

function clientIp(event) {
  return header(event, 'x-nf-client-connection-ip') ||
    String(header(event, 'x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

// ───────────────────────── storage ─────────────────────────
let blobsLib = null;
function blobs() {
  if (!blobsLib) blobsLib = require('@netlify/blobs');
  return blobsLib;
}
function connectBlobs(event) {
  if (event && event.blobs && blobs().connectLambda) blobs().connectLambda(event);
}
function store() {
  return blobs().getStore({ name: STORE_NAME, consistency: 'strong' });
}

async function getJson(key) {
  return (await store().get(key, { type: 'json' })) || null;
}
async function setJson(key, value) {
  await store().setJSON(key, value);
}
async function del(key) {
  await store().delete(key);
}
async function listKeys(prefix) {
  const out = [];
  const res = await store().list({ prefix, paginate: true });
  if (res && typeof res[Symbol.asyncIterator] === 'function') {
    for await (const page of res) for (const b of page.blobs) out.push(b.key);
  } else if (res && res.blobs) {
    for (const b of res.blobs) out.push(b.key);
  }
  return out;
}

class Abort extends Error { constructor(value) { super('abort'); this.value = value; } }

/*
 * Compare-and-swap update. mutate(current|null) returns the new value,
 * or throws (HttpError / Abort) to stop without writing.
 * Returns the value written.
 */
async function cas(key, mutate, opts) {
  opts = opts || {};
  const s = store();
  for (let attempt = 0; attempt < (opts.attempts || 12); attempt++) {
    const found = await s.getWithMetadata(key, { type: 'json' });
    if (found && !found.etag) {
      // Without an ETag the write below would be unconditional — refuse rather than risk double-spending.
      throw new HttpError(500, 'storage_unsupported', 'Storage does not support safe updates.');
    }
    const current = found ? found.data : null;
    const next = await mutate(current ? JSON.parse(JSON.stringify(current)) : null);
    if (next === undefined) return current;
    const cond = found ? { onlyIfMatch: found.etag } : { onlyIfNew: true };
    const result = await s.setJSON(key, next, cond);
    if (!result || typeof result.modified !== 'boolean') {
      // Fail closed if the Blobs runtime can't do conditional writes.
      throw new HttpError(500, 'storage_unsupported', 'Storage does not support safe updates.');
    }
    if (result.modified) return next;
    await sleep(15 + Math.random() * 40 * (attempt + 1));
  }
  throw new HttpError(503, 'busy', 'The studio is busy. Please try again in a moment.');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ───────────────────────── small helpers ─────────────────────────
const EMAIL_RE = /^[^\s@"<>(),;:\\[\]]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/;
function normalizeEmail(e) {
  const v = String(e || '').trim().toLowerCase();
  return v.length <= 254 && EMAIL_RE.test(v) ? v : '';
}
function requireEmail(e) {
  const v = normalizeEmail(e);
  if (!v) throw new HttpError(400, 'invalid_email', 'Please enter a valid email address.');
  return v;
}
function enc(email) { return encodeURIComponent(email); }
function sha256(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function hmac(s) { return crypto.createHmac('sha256', secret()).update(String(s)).digest('hex'); }
function safeEqualHex(a, b) {
  const x = Buffer.from(String(a), 'hex'), y = Buffer.from(String(b), 'hex');
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}
function randomToken(bytes) { return crypto.randomBytes(bytes || 32).toString('base64url'); }
function nowIso() { return new Date().toISOString(); }

// Strip control characters and cap length.
function cleanText(v, max) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max || 500);
}

// UK calendar day, e.g. "2026-10-15". Allowances reset at midnight UK time.
function dayKey(date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(date || new Date());
  const get = t => parts.find(p => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
// UK calendar month, e.g. "2026-10" — used for cost reporting.
function monthKey(date) { return dayKey(date).slice(0, 7); }

// ───────────────────────── rate limiting ─────────────────────────
// Fixed-window counter. Throws 429 when exceeded.
async function rateLimit(bucket, id, max, windowMs, message) {
  const win = Math.floor(Date.now() / windowMs);
  const key = `rl/${bucket}/${sha256(id).slice(0, 24)}/${win}`;
  await cas(key, cur => {
    const n = (cur && cur.n) || 0;
    if (n >= max) throw new HttpError(429, 'rate_limited', message || 'Too many attempts. Please wait a little and try again.');
    return { n: n + 1, exp: (win + 1) * windowMs };
  });
}

// ───────────────────────── settings ─────────────────────────
async function getSettings() {
  const s = await getJson('config/settings');
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}
function modelFor(settings) {
  return settings.model || env('STUDIO_MODEL', 'openai/gpt-4o-mini');
}

// ───────────────────────── members & access ─────────────────────────
async function getMember(email) { return getJson(`members/${enc(email)}`); }

// Membership is valid through the whole of its expiry date (stored as YYYY-MM-DD).
// Uses end of day UTC, i.e. up to one hour of grace during British Summer Time.
function endOfDayUk(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return NaN;
  return Date.parse(`${dateStr}T23:59:59Z`);
}

const LIVE_SUB_STATUSES = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused'];

/*
 * Access rules
 *  - Business Club (admin-managed, annual):  20 a day
 *  - AI Power (paid via Stripe, monthly or yearly), with or without Club: 100 a day
 *  - AI Power is independent of Club: one ending does not affect the other.
 *  - Someone whose AI Power ended (and has no active Club) can still sign in read-only
 *    to view and copy their library.
 *  - "blocked" (admin) removes all access.
 */
function access(member, settings, now) {
  now = now || Date.now();
  const blocked = !!(member && member.blocked);
  const membershipActive = !blocked && !!member && member.status === 'active' &&
    !!member.membershipExpiresAt && endOfDayUk(member.membershipExpiresAt) >= now;
  const addon = (member && member.addon) || null;
  const powerActive = !blocked && !!addon && (addon.status === 'active' || addon.status === 'trialing');
  const canCreate = membershipActive || powerActive;
  const canView = canCreate || (!blocked && !!addon);
  let limit = powerActive ? settings.powerLimit : settings.standardLimit;
  if (member && Number.isInteger(member.allowanceOverride) && member.allowanceOverride >= 0) limit = member.allowanceOverride;
  return {
    blocked,
    membershipActive,          // Business Club
    powerActive,               // AI Power paid and current
    canCreate,
    canView,
    readOnly: canView && !canCreate,
    addonStatus: addon ? addon.status : null,
    addonInterval: addon ? addon.interval || null : null,
    addonLive: !!addon && LIVE_SUB_STATUSES.includes(addon.status),
    plan: powerActive ? 'power' : membershipActive ? 'club' : 'none',
    limit: canCreate ? limit : 0,
  };
}

// ───────────────────────── cookies & sessions ─────────────────────────
function parseCookies(event) {
  const raw = header(event, 'cookie') || '';
  const out = {};
  raw.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function cookie(name, value, maxAgeSec) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`;
}
function clearCookie(name) { return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }

async function createSession(email, role, event) {
  const token = randomToken(32);
  const now = Date.now();
  const member = role === 'member' ? await getMember(email) : null;
  const sess = {
    email, role,
    createdAt: now, lastSeen: now, verifiedAt: now,
    expiresAt: role === 'admin' ? now + SESSION.adminMs : now + SESSION.idleMs,
    absoluteExpiry: role === 'admin' ? now + SESSION.adminMs : now + SESSION.absoluteMs,
    epoch: member ? (member.sessionEpoch || 0) : 0,
    device: cleanText(header(event, 'user-agent'), 160),
  };
  await setJson(`sess/${sha256(token)}`, sess);
  const name = role === 'admin' ? COOKIE_ADMIN : COOKIE_MEMBER;
  return { token, sess, cookie: cookie(name, token, (sess.expiresAt - now) / 1000) };
}

/*
 * Loads the member session, enforcing expiry, revocation and access level.
 *   opts.level = 'create' (default) — Club or AI Power active
 *              = 'view'   — also allows read-only (AI Power ended) accounts
 *              = 'buyer'  — also allows a verified email with no account yet (buying AI Power)
 * Renews idle expiry and rotates the token weekly (old token gets a 2-minute grace).
 */
async function requireMember(ctx, opts) {
  opts = opts || {};
  const level = opts.level || 'create';
  const token = parseCookies(ctx.event)[COOKIE_MEMBER];
  if (!token || token.length > 100) throw new HttpError(401, 'signed_out', 'Please sign in.');
  const key = `sess/${sha256(token)}`;
  const sess = await getJson(key);
  const now = Date.now();
  if (!sess || sess.role !== 'member' || sess.expiresAt < now || sess.absoluteExpiry < now) {
    ctx.cookiesOut.push(clearCookie(COOKIE_MEMBER));
    throw new HttpError(401, 'signed_out', 'Your session has ended. Please sign in again.');
  }
  const member = await getMember(sess.email);
  const settings = await getSettings();
  const acc = access(member, settings, now);
  if ((member && (member.sessionEpoch || 0) !== (sess.epoch || 0)) || (!member && sess.epoch)) {
    await del(key).catch(() => {});
    ctx.cookiesOut.push(clearCookie(COOKIE_MEMBER));
    throw new HttpError(401, 'signed_out', 'Please sign in again.');
  }
  if (acc.blocked) throw new HttpError(403, 'account_blocked', 'This account has been suspended. Please contact Auntie Tobi.');
  const allowed = level === 'buyer' ? true : level === 'view' ? acc.canView : acc.canCreate;
  if (!allowed) {
    throw new HttpError(403, acc.readOnly ? 'read_only' : 'no_access',
      acc.readOnly ? 'Your AI Power has ended. Renew it to create new content — your library is still here.'
        : 'You need an active Business Club membership or AI Power to use the Studio.');
  }
  // Renew / rotate
  if (!sess.rotatedAt && now - sess.createdAt > SESSION.rotateMs) {
    const fresh = await createSession(sess.email, 'member', ctx.event);
    fresh.sess.verifiedAt = sess.verifiedAt;
    fresh.sess.absoluteExpiry = sess.absoluteExpiry;
    fresh.sess.expiresAt = Math.min(fresh.sess.expiresAt, sess.absoluteExpiry);
    await setJson(`sess/${sha256(fresh.token)}`, fresh.sess);
    await setJson(key, { ...sess, rotatedAt: now, expiresAt: now + 2 * MIN });
    ctx.cookiesOut.push(cookie(COOKIE_MEMBER, fresh.token, (fresh.sess.expiresAt - now) / 1000));
    return { sess: fresh.sess, sessKey: `sess/${sha256(fresh.token)}`, member, settings, access: acc };
  }
  if (!sess.rotatedAt && now - sess.lastSeen > SESSION.renewEveryMs) {
    sess.lastSeen = now;
    sess.expiresAt = Math.min(now + SESSION.idleMs, sess.absoluteExpiry);
    await setJson(key, sess);
    ctx.cookiesOut.push(cookie(COOKIE_MEMBER, token, (sess.expiresAt - now) / 1000));
  }
  return { sess, sessKey: key, member, settings, access: acc };
}

function requireFresh(auth, maxAgeMs) {
  if (Date.now() - auth.sess.verifiedAt > maxAgeMs) {
    throw new HttpError(403, 'reauth_required', 'For your security, please confirm it\'s you with a new email code.');
  }
}

async function requireAdmin(ctx) {
  const token = parseCookies(ctx.event)[COOKIE_ADMIN];
  if (!token || token.length > 100) throw new HttpError(401, 'signed_out', 'Please sign in.');
  const sess = await getJson(`sess/${sha256(token)}`);
  const now = Date.now();
  if (!sess || sess.role !== 'admin' || sess.expiresAt < now || !adminEmails().includes(sess.email)) {
    ctx.cookiesOut.push(clearCookie(COOKIE_ADMIN));
    throw new HttpError(401, 'signed_out', 'Please sign in.');
  }
  return { sess, email: sess.email };
}

// ───────────────────────── one-time codes ─────────────────────────
const OTP_TTL = 10 * MIN, OTP_MAX_ATTEMPTS = 5, OTP_RESEND_MS = 60 * 1000;

function otpHash(email, purpose, code) { return hmac(`otp:${purpose}:${email}:${code}`); }

// Creates and emails a code. Silent no-op inside the cooldown window.
async function issueOtp(email, purpose) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const now = Date.now();
  let send = true;
  await cas(`otp/${purpose}/${enc(email)}`, cur => {
    if (cur && !cur.used && now - cur.sentAt < OTP_RESEND_MS && cur.exp > now) { send = false; return undefined; }
    return { hash: otpHash(email, purpose, code), exp: now + OTP_TTL, attempts: 0, sentAt: now };
  });
  if (send) await sendCodeEmail(email, code, purpose);
}

// Returns true on success (code consumed). Wrong codes count towards the attempt limit.
async function checkOtp(email, purpose, code) {
  code = String(code || '').replace(/\D/g, '');
  if (code.length !== 6) return false;
  const key = `otp/${purpose}/${enc(email)}`;
  let ok = false;
  await cas(key, cur => {
    if (!cur) return undefined;
    if (cur.exp < Date.now() || cur.attempts >= OTP_MAX_ATTEMPTS || cur.used) return { ...cur, used: true };
    if (safeEqualHex(cur.hash, otpHash(email, purpose, code))) { ok = true; return { ...cur, used: true }; }
    return { ...cur, attempts: cur.attempts + 1 };
  });
  if (ok) await del(key).catch(() => {});
  return ok;
}

// ───────────────────────── email ─────────────────────────
async function sendCodeEmail(email, code, purpose) {
  const subject = purpose === 'admin'
    ? `${code} is your Studio admin code`
    : `${code} is your Auntie Tobi Business Studio code`;
  const text = `Your one-time code is ${code}\n\nIt expires in 10 minutes. If you didn't ask for this, you can ignore this email — nobody can sign in without the code.\n\nAuntie Tobi Business Studio`;
  const html = `<!doctype html><html><body style="margin:0;background:#FBF6EC;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0F1E36">
<div style="max-width:440px;margin:0 auto;padding:32px 20px">
<div style="background:#057A44;color:#FBF6EC;border-radius:16px 16px 0 0;padding:18px 22px;font-weight:700;font-size:16px">Auntie Tobi Business Studio</div>
<div style="background:#fff;border-radius:0 0 16px 16px;padding:24px 22px;border:1px solid #eadfc8;border-top:0">
<p style="margin:0 0 12px;font-size:15px">Here's your one-time code:</p>
<p style="margin:0 0 16px;font-size:34px;letter-spacing:8px;font-weight:800;color:#0F1E36">${code}</p>
<p style="margin:0 0 8px;font-size:13px;color:#5b6475">It expires in 10 minutes and can only be used once.</p>
<p style="margin:0;font-size:13px;color:#5b6475">Didn't ask for this? Ignore this email — nobody can sign in without the code.</p>
</div><p style="font-size:12px;color:#8a8f99;text-align:center;margin-top:16px">auntietobi.co.uk</p></div></body></html>`;

  if (!env('RESEND_API_KEY') && env('STUDIO_EMAIL_MODE') === 'log') {
    // Preview-only testing aid. Never set STUDIO_EMAIL_MODE=log for production.
    console.log(`[studio] EMAIL_MODE=log — code for ${email} (${purpose}): ${code}`);
    return;
  }
  const ok = await sendEmail([email], subject, text, html);
  if (!ok) throw new HttpError(502, 'email_failed', 'We couldn\'t send your code just now. Please try again shortly.');
}

async function sendEmail(to, subject, text, html) {
  const key = env('RESEND_API_KEY');
  if (!key) {
    if (env('STUDIO_EMAIL_MODE') === 'log') { console.log(`[studio] EMAIL_MODE=log — to ${to.join(',')}: ${subject}`); return true; }
    throw new HttpError(500, 'email_not_configured', 'Email sending is not configured yet.');
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env('STUDIO_EMAIL_FROM', 'Auntie Tobi Studio <studio@auntietobi.co.uk>'),
      to, subject, text, ...(html ? { html } : {}),
    }),
  });
  if (!res.ok) console.error('[studio] email send failed', res.status, (await res.text()).slice(0, 300));
  return res.ok;
}

// Notifies every admin by email (best effort — never throws).
async function emailAdmins(subject, text) {
  const to = adminEmails();
  if (!to.length) return;
  try { await sendEmail(to, `[Business Studio] ${subject}`, text); }
  catch (e) { console.error('[studio] admin email failed', e && e.message); }
}

// ───────────────────────── admin audit & alerts ─────────────────────────
async function audit(actor, action, detail) {
  const ts = Date.now();
  await setJson(`audit/${new Date(ts).toISOString()}-${randomToken(4)}`, { ts, actor, action, detail: detail || {} })
    .catch(e => console.error('[studio] audit failed', e));
}
async function alert(kind, message, detail) {
  const ts = Date.now();
  await setJson(`alerts/${new Date(ts).toISOString()}-${randomToken(4)}`, { ts, kind, message, detail: detail || {}, resolved: false })
    .catch(e => console.error('[studio] alert failed', e));
}

module.exports = {
  STORE_NAME, DAY, MIN, SESSION, DEFAULT_SETTINGS, LIVE_SUB_STATUSES,
  COOKIE_MEMBER, COOKIE_ADMIN,
  env, adminEmails, HttpError, Abort, respond, handler, header,
  store, getJson, setJson, del, listKeys, cas, sleep,
  normalizeEmail, requireEmail, enc, sha256, hmac, randomToken, nowIso, cleanText,
  dayKey, monthKey, rateLimit, getSettings, modelFor, sendEmail, emailAdmins,
  getMember, access, endOfDayUk,
  parseCookies, cookie, clearCookie, createSession, requireMember, requireFresh, requireAdmin,
  issueOtp, checkOtp, audit, alert,
};
