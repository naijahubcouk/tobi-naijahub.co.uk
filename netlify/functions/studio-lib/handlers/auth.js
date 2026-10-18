'use strict';
/*
 * Business Studio sign-in (passwordless).
 * POST /.netlify/functions/studio-auth  { action, ... }
 *   request-code   { email }         → sign in. Codes only go to people with access (no enumeration).
 *   verify-code    { email, code }   → sets an HttpOnly session cookie
 *   signup-request { email }         → "Start free" / "Get Pro": anyone can verify their email
 *   signup-verify  { email, code }   → creates a Free plan account (if the Free plan is on) and signs in
 *   stepup-request {} / stepup-verify { code } → fresh verification for payments
 *   logout {} / logout-all {}
 */
const core = require('../core');
const { HttpError, handler, requireEmail, rateLimit, getMember, getSettings, access } = core;

const GENERIC = 'If that email has Business Studio access, a 6-digit code is on its way. It expires in 10 minutes.';

async function jitter() { await core.sleep(250 + Math.random() * 400); }

// Free plan: a verified email gets an account straight away (Club and add-ons are layered on later).
async function createFreeAccount(email) {
  const settings = await getSettings();
  if (!(settings.freeLimit > 0)) return null;
  const buyer = await core.getJson(`buyers/${core.enc(email)}`);
  let created = false;
  const now = core.nowIso();
  await core.cas(`members/${core.enc(email)}`, cur => {
    if (cur) return undefined;
    created = true;
    const r = { email, name: '', status: 'none', membershipExpiresAt: null, sessionEpoch: 0, createdAt: now, updatedAt: now, source: 'free', lastLoginAt: now };
    if (buyer && buyer.stripeCustomerId) r.stripeCustomerId = buyer.stripeCustomerId;
    return r;
  });
  if (created) {
    if (buyer) await core.del(`buyers/${core.enc(email)}`).catch(() => {});
    await core.audit(email, 'account_created_free', {});
  }
  return created;
}

async function markLogin(email) {
  await core.cas(`members/${core.enc(email)}`, cur => cur ? { ...cur, lastLoginAt: core.nowIso() } : undefined).catch(() => {});
}

exports.handler = handler(async (ctx) => {
  const { body } = ctx;
  switch (body.action) {
    // Public: where the app lives (so the old /studio address can forward to it).
    case 'app-url': return { appUrl: core.appOrigin(), pushApp: core.env('STUDIO_ONESIGNAL_APP_ID', '') };
    case 'request-code': {
      const email = requireEmail(body.email);
      await rateLimit('otp-ip', ctx.ip, 20, 60 * 60 * 1000);
      await rateLimit('otp-email', email, 6, 60 * 60 * 1000, 'Too many codes requested for this email. Please try again in an hour.');
      const member = await getMember(email);
      if (access(member, await getSettings()).canView) await core.issueOtp(email, 'member');
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
      if (!access(member, await getSettings()).canView) {
        throw new HttpError(403, 'no_access', 'This email doesn\'t have Business Studio access. Sign in with the email you used to pay, or join the Business Club.');
      }
      const s = await core.createSession(email, 'member', ctx.event);
      ctx.cookiesOut.push(s.cookie);
      await markLogin(email);
      return { ok: true };
    }

    case 'signup-request': {
      const email = requireEmail(body.email);
      await rateLimit('signup-ip', ctx.ip, 10, 60 * 60 * 1000);
      await rateLimit('otp-email', email, 6, 60 * 60 * 1000, 'Too many codes requested for this email. Please try again in an hour.');
      const member = await getMember(email);
      if (member && member.blocked) await jitter();
      else await core.issueOtp(email, 'signup');
      return { ok: true, message: 'We\'ve emailed you a 6-digit code. It expires in 10 minutes.' };
    }

    case 'signup-verify': {
      const email = requireEmail(body.email);
      await rateLimit('verify-ip', ctx.ip, 40, 60 * 60 * 1000);
      await rateLimit('verify-email', email, 12, 60 * 60 * 1000, 'Too many attempts. Please request a new code later.');
      const ok = await core.checkOtp(email, 'signup', body.code);
      if (!ok) throw new HttpError(400, 'invalid_code', 'That code is incorrect or has expired. Please check it or request a new one.');
      let member = await getMember(email);
      if (member && member.blocked) throw new HttpError(403, 'account_blocked', 'This account has been suspended. Please contact Auntie Tobi.');
      const isNew = !member && !!(await createFreeAccount(email));
      const s = await core.createSession(email, 'member', ctx.event);
      ctx.cookiesOut.push(s.cookie);
      if (member) await markLogin(email);
      return { ok: true, created: isNew };
    }

    case 'stepup-request': {
      const auth = await core.requireMember(ctx, { level: 'buyer' });
      await rateLimit('otp-email', auth.sess.email, 6, 60 * 60 * 1000, 'Too many codes requested. Please try again in an hour.');
      await core.issueOtp(auth.sess.email, 'member');
      return { ok: true, message: 'We\'ve emailed you a 6-digit code.' };
    }

    case 'stepup-verify': {
      const auth = await core.requireMember(ctx, { level: 'buyer' });
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
      const auth = await core.requireMember(ctx, { level: 'buyer' });
      if (auth.member) {
        await core.cas(`members/${core.enc(auth.sess.email)}`, cur => cur ? { ...cur, sessionEpoch: (cur.sessionEpoch || 0) + 1 } : undefined);
      }
      await core.del(auth.sessKey).catch(() => {});
      ctx.cookiesOut.length = 0;
      ctx.cookiesOut.push(core.clearCookie(core.COOKIE_MEMBER));
      return { ok: true };
    }

    default:
      throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
});
