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
const resources = require('../resources');
const benefits = require('../benefits');
const notify = require('../notify');
const market = require('../market');
const todo = require('../todo');
function siteUrl() { return String(core.env('STUDIO_SITE_URL', process.env.URL || 'https://www.auntietobi.co.uk')).replace(/\/$/, ''); }

// Business Club status. 'none' = not a Club member (e.g. Business Studio Pro-only customer).
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

  // Business Studio Pro is independent of Business Club. Only blocking an account stops its renewal.
  const newlyBlocked = saved.blocked && !(before && before.blocked);
  if (newlyBlocked) {
    await cas(`members/${enc(email)}`, cur => ({ ...cur, sessionEpoch: (cur.sessionEpoch || 0) + 1 }));
    if (saved.stripeCustomerId && saved.addon && core.LIVE_SUB_STATUSES.includes(saved.addon.status) && core.env('STRIPE_SECRET_KEY')) {
      try { await stripe.syncCustomer(saved.stripeCustomerId); }
      catch (e) { await core.alert('stripe_block_failed', 'Account blocked but Business Studio Pro renewal could not be stopped — check Stripe', { email }); }
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
          clubLink: !!core.env('STUDIO_CLUB_PAYMENT_LINK'), webhook: !!core.env('STRIPE_WEBHOOK_SECRET'),
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
      const profiles = await mapLimit(members, 10, m => getJson(`profiles/${enc(m.email)}`));
      const shops = await mapLimit(members, 10, m => getJson(`shop/${enc(m.email)}`));
      return { month, day, members: members.map((m, i) => {
        const out = summarizeMember(m, settings, months[i], days[i]);
        const p = profiles[i] || {};
        out.business = { name: p.businessName || '', listingSlug: p.listingSlug || '', listingUrl: p.listingSlug ? `https://www.auntietobi.co.uk/biz/${p.listingSlug}` : '',
          website: p.website || '', channels: p.channels || [], mainChannel: p.mainChannel || '' };
        const sh = shops[i];
        out.shop = sh && sh.slug ? { slug: sh.slug, published: !!sh.published, disabled: !!m.shopDisabled, items: sh.items.length } : null;
        return out;
      }).sort((a, b) => a.email.localeCompare(b.email)) };
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

    case 'member-unlink-listing': {
      const email = requireEmail(body.email);
      let removed = '';
      await cas(`profiles/${enc(email)}`, cur => {
        if (!cur || !cur.listingSlug) return undefined;
        removed = cur.listingSlug;
        return { ...cur, listingSlug: '', channels: (cur.channels || []).filter(c => c !== 'listing'),
          listingDeclined: [...new Set([...(cur.listingDeclined || []), cur.listingSlug])].slice(-20), updatedAt: core.nowIso() };
      });
      await core.audit(actor, 'member_unlink_listing', { email, slug: removed });
      return { ok: true, removed };
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

    case 'member-shop-disable': {
      const email = requireEmail(body.email);
      const disabled = !!body.disabled;
      await cas(`members/${enc(email)}`, cur => { if (!cur) throw new HttpError(404, 'not_found', 'Member not found.'); return { ...cur, shopDisabled: disabled }; });
      await core.audit(actor, disabled ? 'shop_disabled' : 'shop_enabled', { email });
      return { ok: true, disabled };
    }

    // ── Business Club benefits ──
    case 'benefits-get': {
      let b, t;
      const email = requireEmail(body.email);
      const member = await core.getMember(email);
      if (!member) throw new HttpError(404, 'not_found', 'Member not found.');
      return { member: { email, name: member.name || '', membershipExpiresAt: member.membershipExpiresAt || '', status: member.status }, ...(b = await benefits.getYear(email, member)), targets: (t = await benefits.getTargets()), prog: benefits.progress(b.year, t) };
    }
    case 'benefits-update': {
      const email = requireEmail(body.email);
      const member = await core.getMember(email);
      if (!member) throw new HttpError(404, 'not_found', 'Member not found.');
      const prevYear = (await benefits.getYear(email, member)).year;
      const before = new Set(benefits.feed(prevYear).map(e => `${e.kind}|${e.loggedAt}`));
      const wasPending = !!(prevYear && prevYear.verify && prevYear.verify.status === 'pending');
      const r = await benefits.update(email, member, body.patch);
      await core.audit(actor, 'benefits_update', { email, keys: Object.keys(body.patch || {}) });
      const fresh = benefits.feed(r.year).filter(e => e.notify && !before.has(`${e.kind}|${e.loggedAt}`));
      if (fresh.length) await notify.pushToMember(email, 'Auntie Tobi 💚', `${fresh.map(e => e.label).join(' & ')} — it’s done! See it in your Business Studio.`);
      // A verification request was answered → tell the member by email.
      const v = r.year.verify;
      if (v && v.answeredAt && Date.now() - Date.parse(v.answeredAt) < 60000 && wasPending) {
        const ok = v.status === 'verified';
        try {
          await core.sendEmail([email], ok ? 'Your business is verified on Auntie Tobi ✅' : 'About your verification request',
            ok ? `Good news — Auntie Tobi has checked your Companies House registration (${v.number}) and your business is now verified.\n\nSee it in your Business Studio: ${siteUrl()}/studio\n\nAuntie Tobi 💚`
               : `Thank you for your verification request. We weren’t able to verify your business at the moment.${v.note ? `\n\n${v.note}` : ''}\n\nAny questions? Message us on WhatsApp: https://wa.me/447594674940\n\nAuntie Tobi 💚`);
        } catch (e) { console.error('[studio] verify email failed', e && e.message); }
      }
      return r;
    }
    case 'benefits-log': case 'benefits-unlog': {
      const email = requireEmail(body.email);
      const member = await core.getMember(email);
      if (!member) throw new HttpError(404, 'not_found', 'Member not found.');
      const r = action === 'benefits-log' ? await benefits.log(email, member, body.kind, body.note, body.date, body.notify !== false, body.link) : await benefits.unlog(email, member, body.kind, body.index);
      await core.audit(actor, action === 'benefits-log' ? 'benefit_logged' : 'benefit_unlogged', { email, kind: body.kind, notify: body.notify !== false });
      if (action === 'benefits-log' && body.notify !== false) {
        const what = { stories: 'shared your business on her Story', reposts: 'reposted your post', discovery: 'featured your business', collabs: 'did a collab with you' }[body.kind];
        await notify.pushToMember(email, 'Auntie Tobi 💚', `Auntie Tobi ${what}! See it in your Business Studio.`);
      }
      return r;
    }
    case 'benefits-targets-save': {
      const targets = await benefits.saveTargets(body.targets);
      await core.audit(actor, 'benefit_targets_save', targets);
      return { targets };
    }
    case 'benefits-overview': case 'benefits-due': {
      const members = (await allMembers()).filter(m => core.access(m, settings).membershipActive);
      const month = core.monthKey(), day = core.dayKey();
      const targets = await benefits.getTargets();
      if (action === 'benefits-due') {
        let verifyRequests = 0;
        const progs = await mapLimit(members, 8, async m => { const y = (await benefits.getYear(m.email, m)).year; if (y && y.verify && y.verify.status === 'pending') verifyRequests++; return benefits.progress(y, targets, day); });
        const sum = k => progs.reduce((a, p) => a + p[k].due, 0);
        return { verifyRequests, members: members.length, stories: sum('stories'), reposts: sum('reposts'), discovery: sum('discovery'),
          weekMembers: progs.filter(p => p.stories.due || p.reposts.due).length, monthMembers: progs.filter(p => p.discovery.due).length, targets };
      }
      const since = growth.addDays(day, -30);
      const rows = await mapLimit(members, 8, async m => {
        const [b, p, usage, prog] = await Promise.all([benefits.getYear(m.email, m), getJson(`profiles/${enc(m.email)}`), getJson(gen.monthUsageKey(m.email, month)), growth.getProgress(m.email)]);
        const y = b.year || benefits.emptyYear();
        const posts30 = Object.entries(prog.entries || {}).filter(([d]) => d >= since).reduce((a, [, e]) => a + (e.posts || 0), 0);
        const daysLeft = Math.round((Date.parse(`${m.membershipExpiresAt}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / 86400000);
        return {
          email: m.email, name: m.name || '', business: (p && p.businessName) || '', expires: m.membershipExpiresAt, daysLeft,
          spotlight: y.spotlight.status, spotlightDate: y.spotlight.date, featured: y.featured.done, marketplace: y.marketplace.done, badge: y.badge,
          stories: y.stories.length, reposts: y.reposts.length, discovery: y.discovery.length, collabs: (y.collabs || []).length, lastShared: benefits.lastShared(y),
          prog: benefits.progress(y, targets, day),
          checkup: y.checkup.done, checkupDate: y.checkup.date, priorities: y.checkup.priorities.length, prioritiesDone: (y.prioritiesDone || []).length,
          verify: y.verify && y.verify.status === 'pending' ? { number: y.verify.number, at: y.verify.at } : null,
          generationsMonth: usage ? usage.used || 0 : 0, posts30,
        };
      });
      return { rows, today: day, targets, weekStart: benefits.weekStart(day) };
    }

    // ── Daily to-do list ──
    case 'todo-today': {
      const members = await allMembers();
      const club = members.filter(m => core.access(m, settings).membershipActive);
      const profiles = {};
      await mapLimit(club, 8, async m => { profiles[m.email] = await getJson(`profiles/${enc(m.email)}`); });
      const akeys = (await core.listKeys('alerts/')).sort().reverse().slice(0, 100);
      const alerts = (await mapLimit(akeys, 8, async k => ({ key: k, ...(await getJson(k)) }))).filter(a => a && a.ts);
      let lessonsReady = [];
      try { lessonsReady = (await resources.adminDashboard()).readyToPublish || []; } catch (e) { console.error('[studio] todo lessons failed', e && e.message); }
      const view = await todo.refresh({ members, settings, profiles, alerts, lessonsReady });
      return { ...view, defs: await todo.getDefs() };
    }
    case 'todo-mark': {
      const how = String(body.how || '');
      const it = await todo.mark(String(body.key || ''), how);
      if (how === 'done' && it.kind === 'alert' && it.meta && /^alerts\/[\w:.\-]+$/.test(it.meta.alertKey || '')) await core.del(it.meta.alertKey).catch(() => {});
      await core.audit(actor, `todo_${how}`, { key: it.key });
      return { item: it };
    }
    case 'todo-add': {
      const def = await todo.addDef(body.task);
      await core.audit(actor, 'todo_add', { id: def.id, repeat: def.repeat });
      return { def };
    }
    case 'todo-def-delete': {
      await todo.deleteDef(String(body.id || ''));
      return { ok: true };
    }
    case 'todo-summary': return { counts: await todo.summary() };

    // ── Marketplace (review & manage listings) ──
    case 'market-list': {
      const list = await market.all();
      const allowance = (await getJson('market/allowance')) || {};
      return { listings: list.map(r => ({ ...r, status: market.status(r) })).sort((a, b) => (b.submittedAt || b.updatedAt || '').localeCompare(a.submittedAt || a.updatedAt || '')), allowance, cats: market.CATS, buttons: market.BUTTONS };
    }
    case 'market-get': {
      const r = await market.get(body.id);
      if (!r) throw new HttpError(404, 'not_found', 'Listing not found.');
      return { listing: { ...r, status: market.status(r) }, allowance: r.owner ? await market.allowanceOf(r.owner) : null, cats: market.CATS, buttons: market.BUTTONS };
    }
    case 'market-img': return { id: await market.saveImage(body.dataUrl, `admin:${actor}`) };
    case 'market-save': {
      const raw = body.listing && typeof body.listing === 'object' ? body.listing : {};
      const prev = body.id ? await market.get(String(body.id)) : null;
      const who = (body.meta && body.meta.owner) || (prev && (prev.owner || (prev.contact && prev.contact.email))) || '';
      const lk = await require('./market').checkLink(ctx.event, raw.bizSlug, who);
      const r = await market.adminSave(body.id ? String(body.id) : '', { ...raw, bizSlug: lk.slug }, body.meta, lk.link);
      await core.audit(actor, 'market_save', { id: r.id });
      return { listing: { ...r, status: market.status(r) } };
    }
    case 'market-delete': {
      await market.adminDelete(body.id);
      await core.audit(actor, 'market_delete', { id: body.id });
      return { ok: true };
    }
    case 'market-allowance': {
      const email = requireEmail(body.email);
      const n = await market.setAllowance(email, body.n);
      await core.audit(actor, 'market_allowance', { email, n });
      return { email, n };
    }
    case 'market-review': {
      const decision = String(body.decision || '');
      const { listing: r, wasLive } = await market.review(String(body.id || ''), decision, body.note);
      await core.audit(actor, `market_${decision}`, { id: r.id });
      const f = r.live && decision === 'approve' ? r.live : (r.draft || r.live || {});
      const to = r.owner || (r.contact && r.contact.email);
      const first = (r.contact && r.contact.name ? r.contact.name.split(' ')[0] : '') || '';
      const where = r.source === 'member' ? `${siteUrl()}/studio` : `${siteUrl()}/marketplace`;
      const note = String(body.note || '').trim();
      const msg = {
        approve: [`Your listing is live on the Auntie Tobi Marketplace 🎉`, `${first ? `Hi ${first},` : 'Hello,'}\n\nGood news — “${f.name}” is ${wasLive ? 'updated and ' : ''}live on the Auntie Tobi Marketplace.\n\nSee it here: ${siteUrl()}/marketplace\n\nShare the link with your customers too!\n\nAuntie Tobi 💚`],
        changes: [`A small change is needed on your Marketplace listing`, `${first ? `Hi ${first},` : 'Hello,'}\n\nThank you for “${f.name}”. Before it goes live, Auntie Tobi has asked for a change:\n\n${note || '(see Business Studio)'}\n\n${r.source === 'member' ? `Update it in your Business Studio: ${where}` : 'Reply to this email or message us on WhatsApp (https://wa.me/447594674940) with the update.'}\n\nAuntie Tobi 💚`],
        reject: [`About your Marketplace listing`, `${first ? `Hi ${first},` : 'Hello,'}\n\nThank you for sending “${f.name}” to the Auntie Tobi Marketplace. ${wasLive ? 'Your latest change wasn’t accepted, so your listing stays as it was.' : 'We’re not able to list it at the moment.'}${note ? `\n\n${note}` : ''}\n\nAny questions? Message us on WhatsApp: https://wa.me/447594674940\n\nAuntie Tobi 💚`],
      }[decision];
      if (to && msg) { try { await core.sendEmail([to], msg[0], msg[1]); } catch (e) { console.error('[studio] market email failed', e && e.message); } }
      if (r.owner && decision === 'approve') {
        await notify.pushToMember(r.owner, 'Auntie Tobi 💚', `“${f.name}” is live on the Marketplace!`);
        const member = await core.getMember(r.owner);
        if (member && benefits.yearKeyOf(member)) {
          const y = (await benefits.getYear(r.owner, member)).year;
          if (y && !y.marketplace.done) await benefits.update(r.owner, member, { marketplace: { done: true }, notify: false }).catch(() => {});
        }
      } else if (r.owner && decision === 'changes') {
        await notify.pushToMember(r.owner, 'Auntie Tobi', 'A small change is needed on your Marketplace listing — see Business Studio.');
      }
      return { listing: { ...r, status: market.status(r) } };
    }

    // ── Resources (content manager) ──
    case 'res-list': return resources.adminList();
    case 'res-dashboard': return resources.adminDashboard();
    case 'res-get': return { lesson: await resources.adminGet(String(body.id || '')) };
    case 'res-save': {
      const lesson = await resources.adminSave(actor, body.lesson);
      await core.audit(actor, 'resource_save', { id: lesson.id, status: lesson.status });
      return { lesson };
    }
    case 'res-delete': {
      await resources.adminDelete(String(body.id || ''));
      await core.audit(actor, 'resource_delete', { id: String(body.id || '') });
      return { ok: true };
    }
    case 'res-upload': {
      await rateLimit('res-upload', actor, 60, 60 * 60 * 1000);
      const f = await resources.adminUpload(body);
      await core.audit(actor, 'resource_upload', { fileId: f.fileId, name: f.name, size: f.size });
      return f;
    }
    case 'res-file': return resources.adminFile(String(body.fileId || ''));

    default:
      throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
}, { maxBody: 5 * 1024 * 1024 });

function requireAdmin(ctx) { return core.requireAdmin(ctx); }
