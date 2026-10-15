'use strict';
/*
 * Daily Business Studio housekeeping (scheduled in netlify.toml, 03:17 UTC).
 *  - Members whose annual membership has lapsed: AI Power stops renewing.
 *  - Removes expired codes, sessions, rate-limit counters and old webhook records.
 * Scheduled functions can't be called from the public web.
 */
const core = require('./studio-lib/core');
const stripe = require('./studio-lib/stripe');

exports.handler = async (event) => {
  if (event && event.blobs) require('@netlify/blobs').connectLambda(event);
  const started = Date.now();
  const now = Date.now();
  const report = { enforced: 0, cleaned: 0 };
  const settings = await core.getSettings();

  try {
    if (core.env('STRIPE_SECRET_KEY')) {
      for (const k of await core.listKeys('members/')) {
        const m = await core.getJson(k);
        if (!m || !m.addon || !core.LIVE_SUB_STATUSES.includes(m.addon.status)) continue;
        if (core.access(m, settings, now).membershipActive || m.addon.cancelAtPeriodEnd) continue;
        try { await stripe.enforceMembership(m.email); report.enforced++; }
        catch (e) { await core.alert('stripe_enforce_failed', 'Daily check could not stop AI Power renewal — check Stripe', { email: m.email }); }
      }
    }

    const sweep = async (prefix, isExpired) => {
      for (const k of await core.listKeys(prefix)) {
        if (Date.now() - started > 25000) return; // stay inside the 30s scheduled limit
        const v = await core.getJson(k);
        if (!v || isExpired(v)) { await core.del(k).catch(() => {}); report.cleaned++; }
      }
    };
    await sweep('rl/', v => v.exp < now);
    await sweep('otp/', v => v.exp < now - 60 * 60 * 1000);
    await sweep('sess/', v => v.expiresAt < now || v.absoluteExpiry < now);
    await sweep('stripe-events/', v => v.at < now - 30 * core.DAY);
  } catch (e) {
    console.error('[studio] maintenance error', e);
  }
  console.log('[studio] maintenance', JSON.stringify(report));
  return { statusCode: 200, body: JSON.stringify(report) };
};
