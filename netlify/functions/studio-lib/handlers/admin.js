'use strict';
/*
 * Business Studio admin API. Admins sign in with an emailed code; only addresses listed in
 * the STUDIO_ADMIN_EMAILS environment variable can. Admins manage accounts directly —
 * there is deliberately no "log in as member" feature.
 * POST /.netlify/functions/studio-admin  { action, ... }
 */
const core = require('../core');
const { HttpError, handler, requireEmail, rateLimit, enc, cas, getJson, cleanText } = core;
const gen = require('../generate');
const stripe = require('../stripe');
const growth = require('../growth');

// Business Club status. 'none' = not a Club member (e.g. AI Power-only customer).
const STATUSES = ['pending', 'active', 'inactive', 'none'];

async function mapLimit(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

async function allMembers() {
  const keys = await core.listKeys('members/');
  const list = await mapLimit(keys, 10, k => getJson(k));
  return list.filter(Boolean);
}

function validDate(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && !isNaN(Date.parse(d));
}

function monthOk(m) { return /^\d{4}-\d{2}$/.test(String(m || '')); }

function memberType(m, acc) {
  if (acc.membershipActive && acc.powerActive) return 'both';
  if (acc.powerActive) return 'ai_power';
  if (acc.membershipActive) return 'club';
  return 'none';
}

function summarizeMember(m, settings, monthUsage, todayUsage) {
  const acc = core.access(m, settings);
  return {
    email: m.email, name: m.name || '', status: m.status, membershipExpiresAt: m.membershipExpiresAt || null,
    notes: m.notes || '', allowanceOverride: Number.isInteger(m.allowanceOverride) ? m.allowanceOverride : null,
    createdAt: m.createdAt, lastLoginAt: m.lastLoginAt || null,
    membershipActive: acc.membershipActive, powerActive: acc.powerActive, readOnly: acc.readOnly,
    blocked: !!m.blocked, type: memberType(m, acc), plan: acc.plan, limit: acc.limit, source: m.source || 'admin',
    addon: m.addon || null, stripeCustomerId: m.stripeCustomerId || null,
    today: { used: todayUsage ? todayUsage.used : 0 },
    usage: monthUsage ? { used: monthUsage.used, runs: monthUsage.runs, costUsd: monthUsage.costUsd, byTool: monthUsage.byTool } : { used: 0, runs: 0, costUsd: 0, byTool: {} },
  };
}

async function saveMember(actor, raw, isNew) {
  const email = requireEmail(raw.email);
  let before = null;
  const saved = await cas(`members/${enc(email)}`, cur => {
    if (isNew && cur) throw new HttpError(409, 'exists', 'That member already exists — edit them instead.');
    if (!isNew && !cur) throw new HttpError(404, 'not_found', 'Member not found.');
    before = cur;
    const m = cur ? { ...cur } : { email, createdAt: core.nowIso(), sessionEpoch: 0, addon: null };
    if (raw.name !== undefined) m.name = cleanText(raw.name, 80);
    if (raw.notes !== undefined) m.notes = cleanText(raw.notes, 500);
    if (raw.status !== undefined) {
      if (!STATUSES.includes(raw.status)) throw new HttpError(400, 'invalid', 'Invalid status.');
      m.status = raw.status;
    }
    if (raw.membershipExpiresAt !== undefined) {
      if (raw.membershipExpiresAt && !validDate(raw.membershipExpiresAt)) throw new HttpError(400, 'invalid', 'Expiry must be a date.');
      m.membershipExpiresAt = raw.membershipExpiresAt || null;
    }
    if (raw.allowanceOverride !== undefined) {
      const v = raw.allowanceOverride === null || raw.allowanceOverride === '' ? null : Number(raw.allowanceOverride);
      if (v !== null && (!Number.isInteger(v) || v < 0 || v > 5000)) throw new HttpError(400, 'invalid', 'Allowance override must be a whole number 0–5000, or blank.');
      m.allowanceOverride = v;
    }
    if (raw.blocked !== undefined) m.blocked = !!raw.blocked;
    if (!m.status) m.status = 'pending';
    m.updatedAt = core.nowIso();
    return m;
  });
  await core.audit(actor, isNew ? 'member_add' : 'member_update', { email, status: saved.status, expires: saved.membershipExpiresAt, override: saved.allowanceOverride });

  // AI Power is independent of Business Club. Only blocking an account stops its renewal.
  const newlyBlocked = saved.blocked && !(before && before.blocked);
  if (newlyBlocked) {
    await cas(`members/${enc(email)}`, cur => ({ ...cur, sessionEpoch: (cur.sessionEpoch || 0) + 1 }));
    if (saved.stripeCustomerId && saved.addon && core.LIVE_SUB_STATUSES.includes(saved.addon.status) && core.env('STRIPE_SECRET_KEY')) {
      try { await stripe.syncCustomer(saved.stripeCustomerId); }
      catch (e) { await core.alert('stripe_block_failed', 'Account blocked but AI Power renewal could not be stopped — check Stripe', { email }); }
    }
  }
  return saved;
}

exports.handler = handler(async (ctx) => {
  const { body } = ctx;
  const action = body.action;

  // ── sign-in (no session yet) ──
  if (action === 'login-request') {
    const email = requireEmail(body.email);
    await rateLimit('admin-otp-ip', ctx.ip, 10, 60 * 60 * 1000);
    if (core.adminEmails().includes(email)) await core.issueOtp(email, 'admin');
    else await core.sleep(300 + Math.random() * 400);
    return { ok: true, message: 'If that address is an admin, a code is on its way.' };
  }
  if (action === 'login-verify') {
    const email = requireEmail(body.email);
    await rateLimit('admin-verify-ip', ctx.ip, 20, 60 * 60 * 1000);
    if (!core.adminEmails().includes(email) || !(await core.checkOtp(email, 'admin', body.code))) {
      throw new HttpError(400, 'invalid_code', 'That code is incorrect or has expired.');
    }
    const s = await core.createSession(email, 'admin', ctx.event);
    ctx.cookiesOut.push(s.cookie);
    await core.audit(email, 'admin_login', { ip: ctx.ip });
    return { ok: true };
  }
  if (action === 'logout') {
    const token = core.parseCookies(ctx.event)[core.COOKIE_ADMIN];
    if (token) await core.del(`sess/${core.sha256(token)}`).catch(() => {});
    ctx.cookiesOut.push(core.clearCookie(core.COOKIE_ADMIN));
    return { ok: true };
  }

  const admin = await requireAdmin(ctx);
  const actor = admin.email;
  const settings = await core.getSettings();

  switch (action) {
    case 'overview': {
      const month = core.monthKey();
      const gKeys = await core.listKeys('usage-global/');
      const months = (await mapLimit(gKeys.sort().slice(-12), 6, async k => ({ month: k.split('/')[1], ...(await getJson(k)) })));
      const alerts = (await core.listKeys('alerts/')).length;
      return {
        admin: actor, month, settings, months,
        config: {
          email: core.env('RESEND_API_KEY') ? 'resend' : (core.env('STUDIO_EMAIL_MODE') === 'log' ? 'log (testing only)' : 'missing'),
          ai: !!(core.env('STUDIO_OPENROUTER_API_KEY') || core.env('OPENROUTER_API_KEY') || core.env('OPENAI_API_KEY')),
          model: core.modelFor(settings),
          stripe: stripe.billingEnabled(),
          stripePlans: stripe.availableIntervals(),
          stripeMode: (core.env('STRIPE_SECRET_KEY') || '').startsWith('sk_live') ? 'live' : 'test',
        },
        alertCount: alerts,
        pilot: await growth.pilotSummary(7),
      };
    }

    case 'members-list': {
      const month = monthOk(body.month) ? body.month : core.monthKey();
      const day = core.dayKey();
      const members = await allMembers();
      const months = await mapLimit(members, 10, m => getJson(gen.monthUsageKey(m.email, month)));
      const days = await mapLimit(members, 10, m => getJson(gen.usageKey(m.email, day)));
      return { month, day, members: members.map((m, i) => summarizeMember(m, settings, months[i], days[i])).sort((a, b) => a.email.localeCompare(b.email)) };
    }

    case 'member-add': {
      const m = await saveMember(actor, body, true);
      return { member: summarizeMember(m, settings, null, null) };
    }

    case 'members-import': {
      const emails = String(body.emails || '').split(/[\s,;]+/).map(core.normalizeEmail).filter(Boolean);
      if (!emails.length) throw new HttpError(400, 'invalid', 'No valid email addresses found.');
      if (emails.length > 200) throw new HttpError(400, 'invalid', 'Please import at most 200 at a time.');
      if (body.membershipExpiresAt && !validDate(body.membershipExpiresAt)) throw new HttpError(400, 'invalid', 'Expiry must be a date.');
      const results = { added: [], skipped: [] };
      for (const email of [...new Set(emails)]) {
        try {
          await saveMember(actor, { email, status: body.status || 'active', membershipExpiresAt: body.membershipExpiresAt || null }, true);
          results.added.push(email);
        } catch (e) { results.skipped.push(email); }
      }
      return results;
    }

    case 'member-update': {
      const m = await saveMember(actor, body, false);
      return { member: summarizeMember(m, settings, null, null) };
    }

    case 'member-revoke-sessions': {
      const email = requireEmail(body.email);
      await cas(`members/${enc(email)}`, cur => {
        if (!cur) throw new HttpError(404, 'not_found', 'Member not found.');
        return { ...cur, sessionEpoch: (cur.sessionEpoch || 0) + 1 };
      });
      await core.audit(actor, 'member_revoke_sessions', { email });
      return { ok: true };
    }

    case 'member-usage': {
      const email = requireEmail(body.email);
      const keys = (await core.listKeys('usage-month/')).filter(k => k.endsWith(`/${enc(email)}`)).sort().slice(-12);
      const rows = await mapLimit(keys, 6, async k => {
        const u = await getJson(k);
        return { month: k.split('/')[1], used: u.used, runs: u.runs, costUsd: u.costUsd, byTool: u.byTool };
      });
      const today = await getJson(gen.usageKey(email, core.dayKey()));
      rows.reverse();
      return { email, today: today ? today.used : 0, months: rows };
    }

    case 'member-stripe-sync': {
      const email = requireEmail(body.email);
      const m = await core.getMember(email);
      if (!m || !m.stripeCustomerId) throw new HttpError(404, 'no_customer', 'This member has no Stripe customer yet.');
      const r = await stripe.syncCustomer(m.stripeCustomerId);
      await core.audit(actor, 'member_stripe_sync', { email });
      return { addon: r && r.addon };
    }

    case 'settings-save': {
      const s = body.settings || {};
      const num = (k, min, max, int) => {
        if (s[k] === undefined || s[k] === '') return settings[k];
        const v = Number(s[k]);
        if (!isFinite(v) || v < min || v > max || (int && !Number.isInteger(v))) throw new HttpError(400, 'invalid', `Invalid value for ${k}.`);
        return v;
      };
      const next = {
        standardLimit: num('standardLimit', 0, 5000, true),
        powerLimit: num('powerLimit', 0, 5000, true),
        perMinuteLimit: num('perMinuteLimit', 1, 60, true),
        spendWarnGbp: num('spendWarnGbp', 0, 100000, false),
        inputPricePerMUsd: num('inputPricePerMUsd', 0, 100, false),
        outputPricePerMUsd: num('outputPricePerMUsd', 0, 500, false),
        usdToGbp: num('usdToGbp', 0.1, 5, false),
        model: s.model === undefined ? settings.model : cleanText(s.model, 80),
      };
      if (next.model && !/^[A-Za-z0-9._:/-]+$/.test(next.model)) throw new HttpError(400, 'invalid', 'Invalid model name.');
      await core.setJson('config/settings', next);
      await core.audit(actor, 'settings_save', next);
      return { settings: { ...core.DEFAULT_SETTINGS, ...next } };
    }

    case 'alerts-list': {
      const keys = (await core.listKeys('alerts/')).sort().reverse().slice(0, 100);
      const items = await mapLimit(keys, 8, async k => ({ key: k, ...(await getJson(k)) }));
      return { alerts: items };
    }

    case 'alert-dismiss': {
      if (!/^alerts\/[\w:.\-]+$/.test(String(body.key || ''))) throw new HttpError(400, 'invalid', 'Invalid alert.');
      await core.del(body.key);
      return { ok: true };
    }

    case 'audit-list': {
      const keys = (await core.listKeys('audit/')).sort().reverse().slice(0, 100);
      return { entries: await mapLimit(keys, 8, k => getJson(k)) };
    }

    default:
      throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
});

function requireAdmin(ctx) { return core.requireAdmin(ctx); }
