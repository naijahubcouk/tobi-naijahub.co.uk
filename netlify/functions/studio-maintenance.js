'use strict';
/*
 * Daily Business Studio housekeeping (scheduled in netlify.toml, 03:17 UTC).
 *  - Removes expired codes, sessions, rate-limit counters and old webhook records.
 * Scheduled functions can't be called from the public web.
 */
const core = require('./studio-lib/core');

exports.handler = async (event) => {
  if (event && event.blobs) require('@netlify/blobs').connectLambda(event);
  const started = Date.now();
  const now = Date.now();
  const report = { cleaned: 0 };

  try {
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
    // Daily allowance counters older than 60 days (monthly cost totals are kept in usage-month/).
    const cutoff = core.dayKey(new Date(now - 60 * core.DAY));
    for (const k of await core.listKeys('usage/')) {
      if (Date.now() - started > 25000) break;
      if (k.split('/')[1] < cutoff) { await core.del(k).catch(() => {}); report.cleaned++; }
    }
    await sweep('buyers/', v => !v.stripeCustomerId && Date.parse(v.createdAt || 0) < now - 30 * core.DAY);
  } catch (e) {
    console.error('[studio] maintenance error', e);
  }
  console.log('[studio] maintenance', JSON.stringify(report));
  return { statusCode: 200, body: JSON.stringify(report) };
};
