'use strict';
/*
 * Stripe for the Business Studio add-ons (sold to anyone, independent of Business Club):
 *   Pro       50 a day:  £3 / month → STRIPE_PRICE_PRO_MONTHLY     £30 / year → STRIPE_PRICE_PRO_YEARLY
 *   Plus 100 a day:  £5 / month → STRIPE_PRICE_PLUS_MONTHLY    £50 / year → STRIPE_PRICE_PLUS_YEARLY
 *   (older STRIPE_PRICE_POWER_MONTHLY / _YEARLY still work if the PLUS ones aren't set)
 *   (the £5/£50 prices are the original "Business Studio Pro" ones — existing subscribers are Plus)
 * No SDK — plain HTTPS with a pinned API version.
 *
 * Stripe is the source of truth: every webhook re-fetches the customer's subscriptions
 * and rewrites the account's Business Studio Pro state, so events arriving twice or out of order are harmless.
 * A Business Studio account for a non-member is created only once a subscription exists (after payment).
 */
const crypto = require('crypto');
const core = require('./core');
const { HttpError, env, cas, getJson, setJson, del, enc, sha256 } = core;

const API_VERSION = '2024-06-20';

function key() {
  const k = env('STRIPE_SECRET_KEY');
  if (!k) throw new HttpError(500, 'billing_not_configured', 'Payments are not set up yet.');
  return k;
}
const TIERS = ['pro', 'plus'];
function prices() {
  return {
    plus: { month: env('STRIPE_PRICE_PLUS_MONTHLY') || env('STRIPE_PRICE_POWER_MONTHLY') || env('STRIPE_PRICE_POWER') || null, year: env('STRIPE_PRICE_PLUS_YEARLY') || env('STRIPE_PRICE_POWER_YEARLY') || null },
    pro: { month: env('STRIPE_PRICE_PRO_MONTHLY') || null, year: env('STRIPE_PRICE_PRO_YEARLY') || null },
  };
}
// Plans for sale. Plus is no longer sold (existing Plus subscribers keep it — prices() still recognises them).
const FOR_SALE = ['pro'];
function availablePlans() {   // { pro: ['month','year'] } — only what's configured and for sale
  const p = prices(), out = {};
  for (const t of FOR_SALE) { const iv = ['month', 'year'].filter(i => p[t][i]); if (iv.length) out[t] = iv; }
  return out;
}
function billingEnabled() {
  return !!(env('STRIPE_SECRET_KEY') && env('STRIPE_WEBHOOK_SECRET') && Object.keys(availablePlans()).length);
}
function availableIntervals() {   // kept for older callers
  return availablePlans().pro || [];
}

function formEncode(obj, prefix, out) {
  out = out || [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const name = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') formEncode(v, name, out);
    else out.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(v))}`);
  }
  return out.join('&');
}

async function api(method, path, params, idempotencyKey) {
  const headers = { Authorization: `Bearer ${key()}`, 'Stripe-Version': API_VERSION };
  let url = `https://api.stripe.com/v1${path}`, body;
  if (method === 'GET') {
    const q = params ? formEncode(params) : '';
    if (q) url += `?${q}`;
  } else {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = params ? formEncode(params) : '';
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  }
  const res = await fetch(url, { method, headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[studio] stripe error', method, path, res.status, data && data.error && data.error.message);
    const err = new HttpError(502, 'billing_error', 'The payment service had a problem. Please try again.');
    err.stripe = data && data.error;
    throw err;
  }
  return data;
}

// ───────────── webhook signature ─────────────
function verifyWebhook(rawBody, sigHeader, tolerance) {
  const secret = env('STRIPE_WEBHOOK_SECRET');
  if (!secret) throw new HttpError(500, 'billing_not_configured', 'Webhook secret missing.');
  const parts = String(sigHeader || '').split(',').map(s => s.trim().split('='));
  const t = (parts.find(p => p[0] === 't') || [])[1];
  const sigs = parts.filter(p => p[0] === 'v1').map(p => p[1]);
  if (!t || !sigs.length) throw new HttpError(400, 'bad_signature', 'Missing signature.');
  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (!(age <= (tolerance || 300))) throw new HttpError(400, 'bad_signature', 'Signature too old.');
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`, 'utf8').digest('hex');
  const ok = sigs.some(s => {
    const a = Buffer.from(s, 'hex'), b = Buffer.from(expected, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
  if (!ok) throw new HttpError(400, 'bad_signature', 'Invalid signature.');
  return JSON.parse(rawBody);
}

// ───────────── account records ─────────────
// Existing Business Studio accounts live in members/…; people buying Business Studio Pro who have no account yet
// are tracked in buyers/… until their first subscription exists.
async function recordKeyFor(email) {
  return (await core.getMember(email)) ? `members/${enc(email)}` : `buyers/${enc(email)}`;
}

async function ensureCustomer(email) {
  const member = await core.getMember(email);
  const buyer = member ? null : await getJson(`buyers/${enc(email)}`);
  const existing = (member && member.stripeCustomerId) || (buyer && buyer.stripeCustomerId);
  if (existing) return existing;
  const cus = await api('POST', '/customers', {
    email, description: 'Auntie Tobi Business Studio',
    metadata: { studio_member: email },
  }, `studio-cus-${sha256(email).slice(0, 32)}`);
  await setJson(`stripe-customers/${cus.id}`, { email });
  await cas(await recordKeyFor(email), cur => {
    const r = cur || { email, createdAt: core.nowIso() };
    if (r.stripeCustomerId) return undefined;
    return { ...r, stripeCustomerId: cus.id, updatedAt: core.nowIso() };
  });
  return cus.id;
}

async function emailForCustomer(customerId) {
  const idx = await getJson(`stripe-customers/${customerId}`);
  if (idx && idx.email) return idx.email;
  const c = await api('GET', `/customers/${customerId}`);
  return core.normalizeEmail(c && c.metadata && c.metadata.studio_member) || null;
}

function planOf(sub) {
  const p = prices();
  for (const it of (sub.items && sub.items.data) || []) {
    const id = it.price && it.price.id;
    if (!id) continue;
    for (const t of TIERS) for (const i of ['month', 'year']) if (p[t][i] && id === p[t][i]) return { tier: t, interval: i };
  }
  return null;
}
function intervalOf(sub) { const pl = planOf(sub); return pl ? pl.interval : null; }
function isOurs(sub) { return !!planOf(sub); }

/*
 * Re-reads the customer's subscriptions and updates the account.
 *  - Creates the Business Studio account for a new Business Studio Pro buyer once a subscription exists.
 *  - Cancels (and refunds) any accidental duplicate Business Studio Pro subscription.
 *  - Blocked accounts are set not to renew.
 */
async function syncCustomer(customerId) {
  const email = await emailForCustomer(customerId);
  if (!email) {
    await core.alert('stripe_unlinked', 'Stripe customer not linked to any Business Studio account', { customerId });
    return null;
  }
  const subs = await api('GET', '/subscriptions', { customer: customerId, status: 'all', limit: 20 });
  const ours = (subs.data || []).filter(isOurs);
  let live = ours.filter(s => core.LIVE_SUB_STATUSES.includes(s.status)).sort((a, b) => a.created - b.created);

  if (live.length > 1) {
    const [keep, ...extra] = live;
    for (const s of extra) {
      await api('DELETE', `/subscriptions/${s.id}`, {}, `studio-dup-cancel-${s.id}`).catch(() => {});
      let refunded = false;
      try {
        if (s.latest_invoice) {
          const inv = await api('GET', `/invoices/${s.latest_invoice}`);
          if (inv.payment_intent && inv.amount_paid > 0) {
            await api('POST', '/refunds', { payment_intent: inv.payment_intent }, `studio-dup-refund-${s.id}`);
            refunded = true;
          }
        }
      } catch (e) { /* recorded in the alert below */ }
      await core.alert('duplicate_subscription', `Duplicate Business Studio Pro subscription cancelled${refunded ? ' and refunded' : ' — check refund in Stripe'}`, { email, kept: keep.id, cancelled: s.id, refunded });
    }
    live = [keep];
  }

  let current = live[0] || ours.sort((a, b) => b.created - a.created)[0] || null;
  const member = await core.getMember(email);

  if (current && member && member.blocked && core.LIVE_SUB_STATUSES.includes(current.status) && !current.cancel_at_period_end) {
    current = await api('POST', `/subscriptions/${current.id}`, { cancel_at_period_end: 'true', metadata: { cancel_reason: 'account_blocked' } }, `studio-block-${current.id}`);
  }

  const addon = current ? {
    subscriptionId: current.id,
    status: current.status,
    interval: intervalOf(current),
    tier: (planOf(current) || {}).tier || 'plus',
    amount: (((current.items && current.items.data) || [])[0] || {}).price && Number.isInteger(current.items.data[0].price.unit_amount) ? current.items.data[0].price.unit_amount : undefined,
    currentPeriodEnd: current.current_period_end ? new Date(current.current_period_end * 1000).toISOString() : null,
    cancelAtPeriodEnd: !!current.cancel_at_period_end,
    updatedAt: core.nowIso(),
  } : null;

  if (!member && !addon) return { email, addon: null };  // nothing bought yet

  let created = false, prevAddon = null;
  await cas(`members/${enc(email)}`, cur => {
    prevAddon = cur ? cur.addon || null : null;
    if (!cur) {
      created = true;
      return { email, name: '', status: 'none', membershipExpiresAt: null, sessionEpoch: 0, createdAt: core.nowIso(),
        source: 'ai_power', stripeCustomerId: customerId, addon, updatedAt: core.nowIso() };
    }
    const next = { ...cur, addon, stripeCustomerId: cur.stripeCustomerId || customerId, updatedAt: core.nowIso() };
    if (addon && core.LIVE_SUB_STATUSES.includes(addon.status)) delete next.pendingCheckout;
    return next;
  });
  if (created) {
    await del(`buyers/${enc(email)}`).catch(() => {});
    await core.audit('stripe', 'account_created_ai_power', { email, interval: addon && addon.interval });
  }
  if (!(await getJson(`stripe-customers/${customerId}`))) await setJson(`stripe-customers/${customerId}`, { email });
  await require('./subcare').onSync(email, prevAddon, addon);
  return { email, addon };
}

// ───────────── checkout & portal ─────────────
function siteUrl(event) {
  const configured = env('STUDIO_SITE_URL');
  if (configured) return configured.replace(/\/$/, '');
  return `https://${core.header(event, 'host')}`;
}

async function startCheckout(email, interval, event, tier) {
  tier = 'pro';
  const priceId = prices()[tier][interval];
  if (!priceId) throw new HttpError(400, 'invalid_plan', 'That plan is not available.');
  const member = await core.getMember(email);
  if (member && member.blocked) throw new HttpError(403, 'account_blocked', 'This account has been suspended.');
  if (member && member.addon && core.LIVE_SUB_STATUSES.includes(member.addon.status)) {
    throw new HttpError(409, 'already_subscribed', 'You already have Business Studio Pro. Use "Manage or cancel" in your Account.');
  }

  // Re-check with Stripe in case a webhook hasn't arrived yet.
  const customerId = await ensureCustomer(email);
  const synced = await syncCustomer(customerId);
  if (synced && synced.addon && core.LIVE_SUB_STATUSES.includes(synced.addon.status)) {
    throw new HttpError(409, 'already_subscribed', 'You already have Business Studio Pro. Use "Manage or cancel" in your Account.');
  }

  // One open checkout per plan at a time: reuse it rather than creating another.
  const recKey = await recordKeyFor(email);
  const now = Date.now();
  let reuse = null, nonce = null;
  await cas(recKey, cur => {
    const r = cur || { email, createdAt: core.nowIso() };
    const pc = r.pendingCheckout;
    if (pc && pc.interval === interval && (pc.tier || 'plus') === tier && pc.expiresAt > now + 60 * 1000 && pc.url) { reuse = pc.url; return undefined; }
    if (pc && pc.creating && now - pc.creating < 30 * 1000) throw new HttpError(409, 'in_progress', 'Your checkout is being prepared — please wait a moment.');
    nonce = core.randomToken(8);
    return { ...r, pendingCheckout: { creating: now, nonce, interval, tier } };
  });
  if (reuse) return reuse;

  const base = siteUrl(event);
  const expiresAt = Math.floor(now / 1000) + 31 * 60;
  let session;
  try {
    session = await api('POST', '/checkout/sessions', {
      mode: 'subscription',
      customer: customerId,
      client_reference_id: sha256(email).slice(0, 40),
      line_items: { 0: { price: priceId, quantity: 1 } },
      metadata: { studio_member: email, interval, tier },
      subscription_data: { metadata: { studio_member: email } },
      custom_text: { submit: { message: `Renews automatically every ${interval === 'year' ? 'year' : 'month'} until you cancel. We’ll remind you before each payment, and you can cancel any time in 2 taps in your Business Studio Account.` } },
      success_url: `${base}/studio?billing=success`,
      cancel_url: `${base}/studio?billing=cancelled`,
      expires_at: expiresAt,
    }, `studio-checkout-${sha256(email).slice(0, 24)}-${nonce}`);
  } catch (e) {
    await cas(recKey, cur => ({ ...(cur || {}), pendingCheckout: null })).catch(() => {});
    throw e;
  }
  await cas(recKey, cur => ({ ...(cur || {}), pendingCheckout: { id: session.id, url: session.url, interval, tier, expiresAt: expiresAt * 1000 } }));
  return session.url;
}

async function portalUrl(email, event) {
  const member = await core.getMember(email);
  if (!member || !member.stripeCustomerId) throw new HttpError(404, 'no_subscription', 'There is no subscription to manage yet.');
  const s = await api('POST', '/billing_portal/sessions', { customer: member.stripeCustomerId, return_url: `${siteUrl(event)}/studio?billing=managed` });
  return s.url;
}

module.exports = {
  api, verifyWebhook, syncCustomer, startCheckout, portalUrl, emailForCustomer, ensureCustomer, siteUrl,
  billingEnabled, availableIntervals, availablePlans, prices, planOf, API_VERSION, TIERS,
};
