'use strict';
/*
 * AI credit top-ups — one-off packs bought through Stripe Checkout (no subscription, no renewal).
 * Anyone with a Business Studio account can buy them (Free, Club, Pro). Credits only add AI generations —
 * advanced tools still come with the Club or Plus.
 *
 * Daily generations are used first; purchased credits only when today's allowance can't cover a request.
 * Oldest credits (soonest expiry) are used first. Credits last 12 months.
 *
 *   credits/<email>   { lots: [{ id, credits, left, at, exp, src: 'stripe'|'gift', ref, pi }],
 *                       holds: { <idemKey>: { n, t } }, log: [{ at, n, what, ref }] }
 *   credit-sales/<YYYY-MM>   { count, pence, credits, byPack: { <credits>: n } }   (Admin overview)
 */
const core = require('./core');
const { HttpError, cas, getJson, enc } = core;

const VALID_MS = 365 * 24 * 60 * 60 * 1000;
const HOLD_STALE_MS = 3 * 60 * 1000;
const DEFAULT_PACKS = [
  { id: 'p300', credits: 300, pence: 500 },
  { id: 'p750', credits: 750, pence: 1000 },
  { id: 'p1600', credits: 1600, pence: 2000 },
];
const key = email => `credits/${enc(core.normalizeEmail(email))}`;
const empty = () => ({ lots: [], holds: {}, log: [] });

function packs(settings) {
  const p = settings && Array.isArray(settings.creditPacks) && settings.creditPacks.length ? settings.creditPacks : DEFAULT_PACKS;
  return p.filter(x => x && x.credits > 0 && x.pence >= 100).map(x => ({ id: String(x.id), credits: Math.round(x.credits), pence: Math.round(x.pence) }));
}
function enabled(settings) {
  return !!(core.env('STRIPE_SECRET_KEY') && core.env('STRIPE_WEBHOOK_SECRET') && (!settings || settings.creditsOn !== false) && packs(settings).length);
}

function liveLots(c, now) { return (c.lots || []).filter(l => l.left > 0 && l.exp > now).sort((a, b) => a.exp - b.exp); }
function heldN(c, now) {
  let n = 0;
  for (const [k, h] of Object.entries(c.holds || {})) { if (now - h.t > HOLD_STALE_MS) delete c.holds[k]; else n += h.n; }
  return n;
}
function balanceOf(c, now) { now = now || Date.now(); return Math.max(0, liveLots(c, now).reduce((s, l) => s + l.left, 0) - heldN(c, now)); }
function pushLog(c, entry) { c.log = [{ at: core.nowIso(), ...entry }, ...(c.log || [])].slice(0, 60); }

async function get(email) { return (await getJson(key(email))) || empty(); }

// What the member sees: balance, the next expiry and recent history.
async function summary(email) {
  const c = await get(email), now = Date.now();
  const live = liveLots(c, now);
  return {
    balance: balanceOf(c, now),
    nextExpiry: live.length ? new Date(live[0].exp).toISOString().slice(0, 10) : null,
    nextExpiryCredits: live.length ? live[0].left : 0,
    lots: live.map(l => ({ credits: l.credits, left: l.left, at: l.at, exp: new Date(l.exp).toISOString().slice(0, 10), src: l.src })),
    log: (c.log || []).slice(0, 20),
    spentYearPence: (c.spend || []).filter(x => Date.parse(x.at) > now - VALID_MS).reduce((a, x) => a + x.pence, 0),
  };
}

// Hold credits for a generation in progress (released if it fails).
async function hold(email, idemKey, n) {
  const now = Date.now();
  await cas(key(email), cur => {
    const c = cur || empty();
    c.holds = c.holds || {};
    if (c.holds[idemKey]) return undefined;
    if (balanceOf(c, now) < n) throw new HttpError(402, 'limit_reached', 'You’ve used all your AI generations for today. Buy credits or upgrade to keep going.', { remaining: 0 });
    c.holds[idemKey] = { n, t: now };
    return c;
  });
}
async function release(email, idemKey) {
  await cas(key(email), cur => {
    if (!cur || !cur.holds || !cur.holds[idemKey]) return undefined;
    delete cur.holds[idemKey];
    return cur;
  }).catch(e => console.error('[studio] credit release failed', e));
}
// Spend held credits: oldest-expiring first.
async function commit(email, idemKey, info) {
  await cas(key(email), cur => {
    const c = cur || empty();
    const h = c.holds && c.holds[idemKey];
    if (!h) return undefined;
    let need = h.n;
    for (const l of liveLots(c, Date.now())) { if (!need) break; const take = Math.min(l.left, need); l.left -= take; need -= take; }
    delete c.holds[idemKey];
    pushLog(c, { n: -(h.n - need), what: `Used for ${(info && info.tool) || 'a generation'}` });
    return c;
  });
}

// Add credits (purchase or gift). ref makes it idempotent: the same payment is only ever added once.
async function add(email, n, src, ref, extra) {
  n = Math.round(Number(n));
  if (!(n > 0 && n <= 100000)) throw new HttpError(400, 'invalid', 'Invalid number of credits.');
  let added = false;
  await cas(key(email), cur => {
    const c = cur || empty();
    if (ref && (c.lots || []).some(l => l.ref === ref)) return undefined;
    const now = Date.now();
    c.lots = [...(c.lots || []).filter(l => l.left > 0 && l.exp > now - 30 * 24 * 3600 * 1000), { id: core.randomToken(6).replace(/[^A-Za-z0-9]/g, ''), credits: n, left: n, at: core.nowIso(), exp: now + VALID_MS, src, ref: ref || '', pi: (extra && extra.pi) || '' }];
    if (extra && extra.pence > 0) c.spend = [{ at: core.nowIso(), pence: Math.round(extra.pence) }, ...(c.spend || [])].slice(0, 50);
    pushLog(c, { n, what: src === 'gift' ? ((extra && extra.note) || 'Added by Auntie Tobi') : `Bought ${n} credits`, ref: ref || '' });
    added = true;
    return c;
  });
  return added;
}
// Remove credits (Admin, or a refunded purchase). Takes from unused credits only.
async function remove(email, n, what, onlyPi) {
  let removed = 0;
  await cas(key(email), cur => {
    if (!cur) return undefined;
    let need = Math.round(n);
    for (const l of liveLots(cur, Date.now())) {
      if (!need) break;
      if (onlyPi && l.pi !== onlyPi) continue;
      const take = Math.min(l.left, need); l.left -= take; need -= take; removed += take;
    }
    if (!removed) return undefined;
    pushLog(cur, { n: -removed, what: what || 'Removed by Auntie Tobi' });
    return cur;
  });
  return removed;
}

// ───────── Stripe ─────────
async function startCheckout(email, packId, event, settings) {
  const stripe = require('./stripe');
  if (!enabled(settings)) throw new HttpError(503, 'credits_off', 'Credit top-ups aren’t available just now.');
  const pack = packs(settings).find(p => p.id === packId);
  if (!pack) throw new HttpError(400, 'invalid_pack', 'Choose a credit pack.');
  const member = await core.getMember(email);
  if (!member || member.blocked) throw new HttpError(403, 'no_access', 'You need a Business Studio account to buy credits.');
  const customerId = await stripe.ensureCustomer(email);
  const base = stripe.siteUrl(event);
  const meta = { studio_member: email, kind: 'credits', pack: pack.id, credits: String(pack.credits) };
  const session = await stripe.api('POST', '/checkout/sessions', {
    mode: 'payment',
    customer: customerId,
    client_reference_id: core.sha256(email).slice(0, 40),
    line_items: { 0: { quantity: 1, price_data: { currency: 'gbp', unit_amount: pack.pence, product_data: { name: `${pack.credits} AI credits — Auntie Tobi Business Studio`, description: 'One-off top-up. No subscription. Credits last 12 months.' } } } },
    metadata: meta,
    payment_intent_data: { metadata: meta, description: `${pack.credits} AI credits` },
    success_url: `${base}/studio?credits=success`,
    cancel_url: `${base}/studio?credits=cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
  }, `studio-credits-${core.sha256(email).slice(0, 20)}-${pack.id}-${core.randomToken(6).replace(/[^A-Za-z0-9]/g, '')}`);
  return session.url;
}

function isCreditSession(s) { return !!(s && s.object === 'checkout.session' && s.mode === 'payment' && s.metadata && s.metadata.kind === 'credits'); }

// checkout.session.completed → add the credits once, record the sale, send a short confirmation.
async function fromSession(s) {
  if (s.payment_status !== 'paid') return { ok: false, reason: 'not_paid' };
  const email = core.normalizeEmail(s.metadata.studio_member);
  const n = Math.round(Number(s.metadata.credits));
  if (!email || !(n > 0)) { await core.alert('credits_bad_session', 'Credit purchase without a member — add the credits by hand', { session: s.id }); return { ok: false, reason: 'no_member' }; }
  const pi = typeof s.payment_intent === 'string' ? s.payment_intent : (s.payment_intent && s.payment_intent.id) || '';
  const added = await add(email, n, 'stripe', s.id, { pi, pence: Number(s.amount_total) || 0 });
  if (!added) return { ok: true, duplicate: true };
  const pence = Number(s.amount_total) || 0;
  await cas(`credit-sales/${core.monthKey()}`, cur => {
    const d = cur || { count: 0, pence: 0, credits: 0, byPack: {} };
    d.count += 1; d.pence += pence; d.credits += n; d.byPack[n] = (d.byPack[n] || 0) + 1;
    return d;
  }).catch(() => {});
  await core.audit(email, 'credits_bought', { credits: n, pence, session: s.id });
  const exp = new Date(Date.now() + VALID_MS).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
  await core.sendEmail([email], `${n} AI credits added to your Business Studio`,
    `Thank you! ${n} AI credits have been added to your Auntie Tobi Business Studio.\n\nYour daily generations are used first; your credits are used when you need more. They last until ${exp}.\n\nThis was a one-off payment — nothing will renew.\n\nAuntie Tobi 💚`).catch(() => {});
  return { ok: true, email, credits: n };
}

// charge.refunded on a credit purchase → remove the matching unused credits and tell the admin.
async function onRefund(charge) {
  let meta = (charge && charge.metadata) || {};
  const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : (charge.payment_intent && charge.payment_intent.id) || '';
  if (!pi) return null;
  if (meta.kind !== 'credits') {
    try { meta = ((await require('./stripe').api('GET', `/payment_intents/${pi}`)) || {}).metadata || {}; } catch (e) { return null; }
  }
  if (meta.kind !== 'credits') return null;
  const email = core.normalizeEmail(meta.studio_member);
  const credits = Math.round(Number(meta.credits)) || 0;
  const frac = charge.amount ? Math.min(1, (Number(charge.amount_refunded) || 0) / charge.amount) : 1;
  const removed = email ? await remove(email, Math.round(credits * frac), 'Refunded purchase', pi) : 0;
  await core.alert('credits_refunded', `Credit purchase refunded — ${removed} unused credits removed`, { email, credits, removed });
  return { removed };
}

async function salesFor(month) { return (await getJson(`credit-sales/${month}`)) || { count: 0, pence: 0, credits: 0, byPack: {} }; }

module.exports = { packs, enabled, summary, get, balanceOf, hold, release, commit, add, remove, startCheckout, isCreditSession, fromSession, onRefund, salesFor, DEFAULT_PACKS, VALID_MS };
