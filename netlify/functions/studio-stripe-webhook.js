'use strict';
/*
 * Stripe webhook for the AI Power add-on.
 * Endpoint: https://<your-site>/.netlify/functions/studio-stripe-webhook
 * Every event is signature-checked, then the customer's subscriptions are re-read from Stripe
 * and the member's access is rewritten — so retries, duplicates and out-of-order events are safe.
 */
const core = require('./studio-lib/core');
const stripe = require('./studio-lib/stripe');
const { HttpError, handler } = core;

const HANDLED = new Set([
  'checkout.session.completed',
  'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
  'customer.subscription.paused', 'customer.subscription.resumed',
  'invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required',
]);

exports.handler = handler(async (ctx) => {
  const ev = ctx.event;
  let raw = ev.body || '';
  if (ev.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');
  const event = stripe.verifyWebhook(raw, core.header(ev, 'stripe-signature'));

  if (!HANDLED.has(event.type)) return { received: true, ignored: true };
  if (!/^evt_[A-Za-z0-9]+$/.test(event.id || '')) throw new HttpError(400, 'bad_event', 'Bad event.');
  if (await core.getJson(`stripe-events/${event.id}`)) return { received: true, duplicate: true };

  const obj = (event.data && event.data.object) || {};
  const customerId = typeof obj.customer === 'string' ? obj.customer : (obj.customer && obj.customer.id);
  if (!customerId) return { received: true, ignored: true };

  // Link a brand-new customer to its member via the metadata we set at checkout.
  if (event.type === 'checkout.session.completed') {
    const email = core.normalizeEmail(obj.metadata && obj.metadata.studio_member);
    if (email && !(await core.getJson(`stripe-customers/${customerId}`))) {
      await core.setJson(`stripe-customers/${customerId}`, { email });
    }
  }

  const result = await stripe.syncCustomer(customerId);

  if (event.type === 'invoice.payment_failed' && result) {
    await core.alert('payment_failed', 'AI Power payment failed — add-on paused until payment succeeds', { email: result.email, invoice: obj.id });
  }

  await core.setJson(`stripe-events/${event.id}`, { type: event.type, at: Date.now() });
  return { received: true };
}, { skipCsrf: true, rawBody: true });
