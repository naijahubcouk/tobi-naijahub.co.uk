'use strict';
/*
 * AI Power add-on billing for signed-in members.
 * POST /.netlify/functions/studio-billing  { action: 'checkout' | 'portal' | 'refresh' }
 * Starting or managing a subscription needs an email code from the last 24 hours.
 */
const core = require('./studio-lib/core');
const stripe = require('./studio-lib/stripe');
const { HttpError, handler } = core;

exports.handler = handler(async (ctx) => {
  const action = ctx.body.action;
  const auth = await core.requireMember(ctx, { allowInactive: action === 'portal' });
  const email = auth.sess.email;

  switch (action) {
    case 'checkout': {
      core.requireFresh(auth, core.SESSION.freshBillingMs);
      await core.rateLimit('checkout', email, 10, 60 * 60 * 1000);
      return { url: await stripe.startCheckout(email, ctx.event) };
    }
    case 'portal': {
      core.requireFresh(auth, core.SESSION.freshBillingMs);
      await core.rateLimit('portal', email, 20, 60 * 60 * 1000);
      return { url: await stripe.portalUrl(email, ctx.event) };
    }
    case 'refresh': {
      // Called when returning from Stripe so the dashboard updates even before the webhook lands.
      await core.rateLimit('billing-refresh', email, 20, 60 * 60 * 1000);
      if (!auth.member.stripeCustomerId) return { addon: null };
      const r = await stripe.syncCustomer(auth.member.stripeCustomerId);
      return { addon: r && r.addon };
    }
    default:
      throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
});
