'use strict';
/*
 * AI Power billing (monthly £5 or yearly £50) for signed-in people — Business Club members
 * and non-members alike.
 * POST /.netlify/functions/studio-billing  { action: 'checkout' (+ interval: 'month'|'year') | 'portal' | 'refresh' }
 * Starting or managing a subscription needs an email code from the last 24 hours.
 */
const core = require('../core');
const stripe = require('../stripe');
const { HttpError, handler } = core;

exports.handler = handler(async (ctx) => {
  const action = ctx.body.action;
  const auth = await core.requireMember(ctx, { level: 'buyer' });
  const email = auth.sess.email;

  switch (action) {
    case 'checkout': {
      if (!stripe.billingEnabled()) throw new HttpError(503, 'billing_not_configured', 'AI Power isn\'t available to buy just yet.');
      const interval = ctx.body.interval === 'year' ? 'year' : 'month';
      core.requireFresh(auth, core.SESSION.freshBillingMs);
      await core.rateLimit('checkout', email, 10, 60 * 60 * 1000);
      return { url: await stripe.startCheckout(email, interval, ctx.event) };
    }
    case 'portal': {
      core.requireFresh(auth, core.SESSION.freshBillingMs);
      await core.rateLimit('portal', email, 20, 60 * 60 * 1000);
      return { url: await stripe.portalUrl(email, ctx.event) };
    }
    case 'refresh': {
      // Called when returning from Stripe so access updates even before the webhook lands.
      await core.rateLimit('billing-refresh', email, 30, 60 * 60 * 1000);
      if (!core.env('STRIPE_SECRET_KEY')) return { addon: null };
      const rec = auth.member || await core.getJson(`buyers/${core.enc(email)}`);
      if (!rec || !rec.stripeCustomerId) return { addon: null };
      const r = await stripe.syncCustomer(rec.stripeCustomerId);
      return { addon: r && r.addon };
    }
    default:
      throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
});
