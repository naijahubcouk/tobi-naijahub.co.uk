'use strict';
/*
 * Business Studio member sign-in (passwordless).
 * POST /.netlify/functions/studio-auth  { action, ... }
 *   request-code  { email }          → always the same reply (no account enumeration)
 *   verify-code   { email, code }    → sets an HttpOnly session cookie
 *   stepup-request {}                → emails a fresh code to the signed-in member
 *   stepup-verify  { code }          → marks this session as freshly verified
 *   logout        {}                 → ends this device's session
 *   logout-all    {}                 → signs out every device
 */
const core = require('./studio-lib/core');
const { HttpError, handler, requireEmail, rateLimit, getMember, getSettings, access } = core;

const GENERIC = 'If that email belongs to an active Business Club member, a 6-digit code is on its way. It expires in 10 minutes.';

async function jitter() { await core.sleep(250 + Math.random() * 400); }

exports.handler = handler(async (ctx) => {
  const { body } = ctx;
  switch (body.action) {
    case 'request-code': {
      const email = requireEmail(body.email);
      await rateLimit('otp-ip', ctx.ip, 20, 60 * 60 * 1000);
      await rateLimit('otp-email', email, 6, 60 * 60 * 1000, 'Too many codes requested for this email. Please try again in an hour.');
      const member = await getMember(email);
      const settings = await getSettings();
      if (access(member, settings).membershipActive) await core.issueOtp(email, 'member');
      else await jitter();
      return { ok: true, message: GENERIC };
    }

    case 'verify-code': {
      const email = requireEmail(body.email);
      await rateLimit('verify-ip', ctx.ip, 40, 60 * 60 * 1000);
      await rateLimit('verify-email', email, 12, 60 * 60 * 1000, 'Too many attempts. Please request a new code later.');
      const ok = await core.checkOtp(email, 'member', body.code);
      if (!ok) throw new HttpError(400, 'invalid_code', 'That code is incorrect or has expired. Please check it or request a new one.');
      const member = await getMember(email);
      if (!access(member, await getSettings()).membershipActive) {
        throw new HttpError(403, 'membership_inactive', 'Your Business Club membership is not active.');
      }
      const s = await core.createSession(email, 'member', ctx.event);
      ctx.cookiesOut.push(s.cookie);
      await core.cas(`members/${core.enc(email)}`, cur => cur ? { ...cur, lastLoginAt: core.nowIso() } : undefined).catch(() => {});
      return { ok: true };
    }

    case 'stepup-request': {
      const auth = await core.requireMember(ctx);
      await rateLimit('otp-email', auth.sess.email, 6, 60 * 60 * 1000, 'Too many codes requested. Please try again in an hour.');
      await core.issueOtp(auth.sess.email, 'member');
      return { ok: true, message: 'We\'ve emailed you a 6-digit code.' };
    }

    case 'stepup-verify': {
      const auth = await core.requireMember(ctx);
      await rateLimit('verify-email', auth.sess.email, 12, 60 * 60 * 1000, 'Too many attempts. Please try again later.');
      const ok = await core.checkOtp(auth.sess.email, 'member', body.code);
      if (!ok) throw new HttpError(400, 'invalid_code', 'That code is incorrect or has expired.');
      const sess = await core.getJson(auth.sessKey);
      if (sess) await core.setJson(auth.sessKey, { ...sess, verifiedAt: Date.now() });
      return { ok: true };
    }

    case 'logout': {
      const token = core.parseCookies(ctx.event)[core.COOKIE_MEMBER];
      if (token) await core.del(`sess/${core.sha256(token)}`).catch(() => {});
      ctx.cookiesOut.push(core.clearCookie(core.COOKIE_MEMBER));
      return { ok: true };
    }

    case 'logout-all': {
      const auth = await core.requireMember(ctx, { allowInactive: true });
      await core.cas(`members/${core.enc(auth.sess.email)}`, cur => ({ ...cur, sessionEpoch: (cur.sessionEpoch || 0) + 1 }));
      await core.del(auth.sessKey).catch(() => {});
      ctx.cookiesOut.length = 0;
      ctx.cookiesOut.push(core.clearCookie(core.COOKIE_MEMBER));
      return { ok: true };
    }

    default:
      throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
});
