'use strict';
/*
 * Business Club payments through the Stripe Payment Link → automatic Business Studio access.
 *   STUDIO_CLUB_PAYMENT_LINK = plink_… (the ID of your £50 Business Club payment link; several allowed, comma-separated)
 * When that link is paid, the email used at checkout becomes an active Business Club member
 * for 12 months (renewals add 12 months to the current expiry, so no days are lost).
 * Refunds and disputes only alert the admin — access is never removed automatically.
 */
const core = require('./core');
const { cas, getJson, enc } = core;

function addYear(day) { const d = new Date(`${day}T12:00:00Z`); d.setUTCFullYear(d.getUTCFullYear() + 1); return d.toISOString().slice(0, 10); }
function siteUrl() { return String(core.env('STUDIO_SITE_URL', process.env.URL || 'https://www.auntietobi.co.uk')).replace(/\/$/, ''); }

function isClubSession(session) {
  // One or more link IDs, comma-separated (e.g. a new link plus the old one while it's still in use).
  const links = String(core.env('STUDIO_CLUB_PAYMENT_LINK') || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!links.length || !session || session.object !== 'checkout.session') return false;
  const pl = typeof session.payment_link === 'string' ? session.payment_link : session.payment_link && session.payment_link.id;
  return links.includes(pl) && session.payment_status === 'paid';
}

function businessNameFrom(session) {
  for (const f of session.custom_fields || []) {
    const v = f && f.text && f.text.value;
    if (v && /business|company|brand|shop/i.test(`${f.key} ${(f.label && f.label.custom) || ''}`)) return core.cleanText(v, 80);
  }
  return '';
}

async function activateFromSession(session) {
  const email = core.normalizeEmail((session.customer_details && session.customer_details.email) || session.customer_email);
  if (!email) {
    await core.alert('club_payment_no_email', 'Business Club payment received without an email — add the member manually', { session: session.id });
    return { ok: false, reason: 'no_email' };
  }
  // Once per checkout session, however many times Stripe retries.
  const recKey = `club-payments/${session.id}`;
  if (await getJson(recKey)) return { ok: true, duplicate: true, email };

  const today = core.dayKey();
  const name = businessNameFrom(session) || core.cleanText(session.customer_details && session.customer_details.name, 80);
  let isNew = false, blocked = false, before = null, expires = '';
  await cas(`members/${enc(email)}`, cur => {
    if (cur && cur.blocked) { blocked = true; return undefined; }
    isNew = !cur;
    before = cur ? cur.membershipExpiresAt || '' : '';
    const base = cur && cur.membershipExpiresAt && cur.membershipExpiresAt >= today && cur.status === 'active' ? cur.membershipExpiresAt : today;
    expires = addYear(base);
    const m = cur ? { ...cur } : { email, createdAt: core.nowIso(), sessionEpoch: 0, addon: null };
    m.status = 'active';
    m.membershipExpiresAt = expires;
    if (!m.name && name) m.name = name;
    m.source = m.source || 'stripe_payment_link';
    m.lastClubPayment = { sessionId: session.id, at: core.nowIso(), amount: session.amount_total, currency: session.currency };
    return m;
  });
  await core.setJson(recKey, { email, at: core.nowIso(), amount: session.amount_total, currency: session.currency, isNew, blocked, expires });

  if (blocked) {
    await core.alert('club_payment_blocked', 'A blocked account paid for Business Club — access NOT given. Check and refund if needed.', { email, session: session.id });
    await core.emailAdmins('Blocked account paid for Business Club', `${email} paid through the Business Club payment link, but their account is blocked, so no access was given. Check in Business Studio Admin and refund in Stripe if needed.`);
    return { ok: false, reason: 'blocked', email };
  }

  await core.audit('stripe', isNew ? 'club_joined' : 'club_renewed', { email, expires, previous: before });
  await core.alert(isNew ? 'club_joined' : 'club_renewed', `${isNew ? 'New Business Club member' : 'Business Club renewal'}: ${name ? name + ' — ' : ''}${email} (until ${expires})`, { email, expires });
  await core.emailAdmins(isNew ? `New Business Club member: ${name || email}` : `Business Club renewal: ${name || email}`,
    `${name ? name + '\n' : ''}${email}\nMembership active until ${expires}${before ? ` (was ${before})` : ''}.\n\nThey can sign in to the Business Studio now. Remember to set up their Featured Business and Marketplace listing — track it in Business Studio Admin → Benefits.`);
  try { await sendWelcome(email, name, expires, isNew); } catch (e) { console.error('[studio] club welcome email failed', e && e.message); }
  return { ok: true, email, expires, isNew };
}

async function sendWelcome(email, name, expires, isNew) {
  const studio = `${siteUrl()}/studio`;
  const until = new Date(`${expires}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const hi = name ? `Hi ${name.split(' ')[0]},` : 'Hello,';
  const subject = isNew ? 'Welcome to the Auntie Tobi Business Club 💚' : 'Your Auntie Tobi Business Club membership is renewed 💚';
  const text = `${hi}\n\n${isNew ? 'Thank you for joining the Auntie Tobi Business Club! Your membership is active' : 'Thank you for renewing! Your membership is now active'} until ${until}.\n\nOpen your Business Studio: ${studio}\nSign in with this email address (${email}) — we’ll send you a 6-digit code, no password needed.\n\nGood first steps:\n• Complete your business profile\n• Add your product or service to the Marketplace: ${siteUrl()}/marketplace/list\n• Read “Welcome to Auntie Tobi Business Club” in Library → Resources\n\nAuntie Tobi 💚`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#0F1E36;max-width:560px;margin:0 auto;padding:8px">
<div style="background:#057A44;color:#fff;border-radius:14px;padding:18px"><div style="font-size:20px;font-weight:bold">${isNew ? 'Welcome to the Business Club 💚' : 'Membership renewed 💚'}</div><div style="opacity:.9;margin-top:4px">Active until <b>${until}</b></div></div>
<p style="margin:18px 0 8px">${hi}</p><p>${isNew ? 'Thank you for joining the Auntie Tobi Business Club!' : 'Thank you for renewing your Auntie Tobi Business Club membership!'} Your Business Studio is ready.</p>
<p style="margin:20px 0"><a href="${studio}" style="background:#057A44;color:#fff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:10px;display:inline-block">Open your Business Studio</a></p>
<p>Sign in with <b>${email}</b> — we’ll email you a 6-digit code. No password needed.</p>
<p><b>Good first steps</b></p><ul style="padding-left:18px"><li>Complete your business profile</li><li><a href="${siteUrl()}/marketplace/list" style="color:#057A44">Add your product or service to the Marketplace</a></li><li>Read “Welcome to Auntie Tobi Business Club” in Library → Resources</li></ul>
<p style="color:#5B6475;font-size:13px">Auntie Tobi 💚</p></div>`;
  await core.sendEmail([email], subject, text, html);
}

// Refunds / disputes on the Club link: tell the admin, never remove access automatically.
async function alertRefundOrDispute(type, obj) {
  const email = core.normalizeEmail((obj.billing_details && obj.billing_details.email) || obj.receipt_email || (obj.evidence && obj.evidence.customer_email_address));
  const amount = typeof obj.amount_refunded === 'number' ? obj.amount_refunded : obj.amount;
  const what = type === 'charge.refunded' ? 'refunded' : 'disputed';
  await core.alert(`payment_${what}`, `A payment was ${what}${email ? ` (${email})` : ''} — check whether to change their Business Club access`, { email, amount, id: obj.id });
  await core.emailAdmins(`Payment ${what}${email ? `: ${email}` : ''}`, `A Stripe payment was ${what}${email ? ` for ${email}` : ''}. Business Studio access has NOT been changed. If it was a Business Club payment, update the member in Business Studio Admin → Members if needed.`);
}

module.exports = { isClubSession, activateFromSession, alertRefundOrDispute, addYear, sendWelcome };
