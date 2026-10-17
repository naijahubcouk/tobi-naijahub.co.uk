'use strict';
/*
 * Looking after Business Studio Pro / Plus subscribers: clear emails, renewal reminders and easy cancelling.
 *   - Welcome email after payment (plan, generations a day, next payment date and amount, cancel link)
 *   - Renewal reminder (email + push): monthly 3 days before; yearly 7 days and 1 day before. prefs.renewalReminders turns it off.
 *   - Cancel in one tap (Account) or from a secure link in the emails — no sign-in needed. Stops renewal only; can be undone.
 *   - Confirmation email when a subscription is set to end (in-app, from the link or in the Stripe portal).
 * Storage: billing/mail/<subId>/<kind>  (sent-once markers)   billing/remind/<email> { sent: { '<periodEnd>:<days>': at } }
 */
const core = require('./core');
const { HttpError, getJson, setJson, del, enc } = core;

const TIERS = {
  pro: { name: 'Business Studio Pro', price: { month: 300, year: 3000 }, limitKey: 'proLimit' },
  plus: { name: 'Business Studio Plus', price: { month: 500, year: 5000 }, limitKey: 'powerLimit' },
};
const LIVE = ['active', 'trialing'];
function siteUrl() { return String(core.env('STUDIO_SITE_URL', process.env.URL || 'https://www.auntietobi.co.uk')).replace(/\/$/, ''); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const gbp = p => '£' + (p % 100 ? (p / 100).toFixed(2) : String(p / 100));
function longDate(iso) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' }); }
function tierOf(ad) { return ad && ad.tier === 'pro' ? 'pro' : 'plus'; }
function amountOf(ad) { return Number.isInteger(ad.amount) && ad.amount > 0 ? ad.amount : TIERS[tierOf(ad)].price[ad.interval === 'year' ? 'year' : 'month']; }
function periodWord(ad) { return ad.interval === 'year' ? 'year' : 'month'; }

// Secure cancel link: tied to the email and the current subscription, so it stops working once that subscription is gone.
function linkToken(email, subId) { return core.hmac(`cancel:${core.normalizeEmail(email)}:${subId}`).slice(0, 40); }
function cancelLink(email, subId) { return `${siteUrl()}/studio?cancel=1&e=${encodeURIComponent(email)}&t=${linkToken(email, subId)}`; }
function checkLink(email, token, member) {
  const ad = member && member.addon;
  if (!ad || !ad.subscriptionId || typeof token !== 'string' || token.length !== 40) return false;
  const want = linkToken(email, ad.subscriptionId);
  return require('crypto').timingSafeEqual(Buffer.from(want), Buffer.from(token));
}

function mail(title, paras, buttons, foot) {
  const text = `${title}\n\n${paras.map(p => p.replace(/<[^>]+>/g, '')).join('\n\n')}\n\n${buttons.map(b => `${b[0]}: ${b[1]}`).join('\n')}\n\n— Auntie Tobi Business Studio${foot ? '\n' + foot : ''}`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0F1E36;max-width:520px">
<p style="font-size:18px;font-weight:700;margin:0 0 12px">${esc(title)}</p>${paras.map(p => `<p style="margin:0 0 12px">${p}</p>`).join('')}
<p style="margin:16px 0">${buttons.map((b, i) => `<a href="${b[1]}" style="display:inline-block;margin:0 8px 8px 0;background:${i === 0 ? '#057A44' : '#FFFFFF'};color:${i === 0 ? '#fff' : '#0F1E36'};border:1.5px solid ${i === 0 ? '#057A44' : '#D5D9E0'};text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:700">${esc(b[0])}</a>`).join('')}</p>
<p style="font-size:12px;color:#5B6475">— Auntie Tobi Business Studio${foot ? '<br>' + esc(foot) : ''}</p></div>`;
  return { text, html };
}

async function sendOnce(markKey, to, subject, m) {
  if (await getJson(markKey)) return false;
  const ok = await core.sendEmail([to], subject, m.text, m.html).catch(e => { console.error('[studio] subscription email failed', e && e.message); return false; });
  if (ok) await setJson(markKey, { at: core.nowIso() });
  return ok;
}

// Called by stripe.syncCustomer after it has written the new state. Never throws.
async function onSync(email, prev, next) {
  try {
    if (!next || !next.subscriptionId) return;
    const t = TIERS[tierOf(next)], settings = await core.getSettings(), lim = settings[t.limitKey];
    const isNewSub = !prev || prev.subscriptionId !== next.subscriptionId || !LIVE.includes(prev.status);
    if (LIVE.includes(next.status) && isNewSub && !next.cancelAtPeriodEnd) {
      const m = mail(`Welcome to ${t.name} 💚`, [
        `Thank you! Your <b>${esc(t.name)}</b> is active — <b>${lim} AI generations a day</b> and every Business Studio tool, including the advanced ones.`,
        next.currentPeriodEnd ? `Your next payment is <b>${gbp(amountOf(next))} on ${esc(longDate(next.currentPeriodEnd))}</b>. It renews automatically every ${periodWord(next)} — we’ll remind you before each payment${next.interval === 'year' ? ' (7 days and 1 day before)' : ' (3 days before)'}.` : `It renews automatically every ${periodWord(next)} — we’ll remind you before each payment.`,
        'You can cancel any time in two taps: Business Studio → Account → Cancel subscription — or use the button below.',
      ], [['Open Business Studio', `${siteUrl()}/studio`], ['Cancel subscription', cancelLink(email, next.subscriptionId)]]);
      await sendOnce(`billing/mail/${next.subscriptionId}/welcome`, email, `Welcome to ${t.name} 💚`, m);
    }
    const endKey = `billing/mail/${next.subscriptionId}/cancel-${String(next.currentPeriodEnd || '').slice(0, 10)}`;
    if (next.cancelAtPeriodEnd && LIVE.includes(next.status)) {
      const m = mail(`Your ${t.name} has been cancelled`, [
        `You won’t be charged again. Your ${esc(t.name)} stays on until <b>${esc(longDate(next.currentPeriodEnd))}</b>, then you’ll go back to ${(await core.getMember(email) || {}).status === 'active' ? 'your Business Club allowance' : 'the Free plan'}. Everything in your library stays.`,
        'Changed your mind? You can keep your plan any time before then — Account → Keep my plan.',
      ], [['Keep my plan', `${siteUrl()}/studio#account`]]);
      await sendOnce(endKey, email, `Your ${t.name} has been cancelled`, m);
    } else if (prev && prev.cancelAtPeriodEnd && !next.cancelAtPeriodEnd) {
      await del(endKey).catch(() => {});   // resumed — a later cancel gets its own confirmation
    }
  } catch (e) { console.error('[studio] subscription email error', e && e.message); }
}

// Cancel (stop renewal) or keep. Re-reads Stripe afterwards so the account updates straight away.
async function setCancel(email, cancel) {
  const stripe = require('./stripe');
  const member = await core.getMember(email);
  const ad = member && member.addon;
  if (!ad || !ad.subscriptionId || !LIVE.includes(ad.status)) throw new HttpError(404, 'no_subscription', 'There is no active subscription to change.');
  if (!!ad.cancelAtPeriodEnd === !!cancel) return ad;
  await stripe.api('POST', `/subscriptions/${ad.subscriptionId}`, { cancel_at_period_end: cancel ? 'true' : 'false', metadata: { cancel_reason: cancel ? 'member_cancelled' : '' } });
  const r = await stripe.syncCustomer(member.stripeCustomerId);
  await core.audit(email, cancel ? 'subscription_cancel' : 'subscription_resume', { sub: ad.subscriptionId });
  return r && r.addon;
}

function linkInfo(member) {
  const ad = member.addon;
  return { plan: TIERS[tierOf(ad)].name, endsAt: ad.currentPeriodEnd, cancelled: !!ad.cancelAtPeriodEnd, live: LIVE.includes(ad.status), amount: gbp(amountOf(ad)), period: periodWord(ad) };
}

// Hourly: renewal reminders (9am–7pm UK). opts: { members, settings, now, force }
function ukHour(d) { return Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' }).format(d)); }
async function runReminders(opts) {
  const now = opts.now || new Date(), report = { checked: 0, sent: 0 };
  const h = ukHour(now);
  if (!opts.force && (h < 9 || h >= 19)) { report.skipped = 'outside 9am–7pm'; return report; }
  const prefs = require('./prefs'), notify = require('./notify');
  const started = Date.now();
  for (const m of opts.members) {
    if (Date.now() - started > 15000 || report.sent >= 100) break;
    const ad = m && m.addon;
    if (!ad || !ad.subscriptionId || !LIVE.includes(ad.status) || ad.cancelAtPeriodEnd || !ad.currentPeriodEnd || m.blocked) continue;
    const daysLeft = (Date.parse(ad.currentPeriodEnd) - now.getTime()) / core.DAY;
    if (!(daysLeft > 0)) continue;
    const windows = ad.interval === 'year' ? [1, 7] : [3];
    const w = windows.find(x => daysLeft <= x);
    if (!w) continue;
    report.checked++;
    const pr = await prefs.get(m.email);
    if (pr.renewalReminders === false) continue;
    const rk = `billing/remind/${enc(m.email)}`, rec = (await getJson(rk)) || { sent: {} };
    const k = `${ad.currentPeriodEnd.slice(0, 10)}:${w}`;
    if (rec.sent[k]) continue;
    const t = TIERS[tierOf(ad)], when = longDate(ad.currentPeriodEnd), amt = gbp(amountOf(ad));
    const msg = mail(`Your ${t.name} renews on ${when}`, [
      `Just a reminder: your <b>${esc(t.name)}</b> renews on <b>${esc(when)}</b> and <b>${amt}</b> will be taken for the next ${periodWord(ad)}.`,
      'Happy to keep it? There’s nothing to do. Want to stop? Cancel in one tap below — you keep your plan until that date.',
    ], [['Keep it', `${siteUrl()}/studio`], ['Cancel subscription', cancelLink(m.email, ad.subscriptionId)]], 'You can turn these reminders off in Business Studio → Account.');
    const ok = await core.sendEmail([m.email], `Your ${t.name} renews on ${when} (${amt})`, msg.text, msg.html).catch(e => { console.error('[studio] renewal reminder failed', e && e.message); return false; });
    await notify.pushToMember(m.email, `${t.name} renews on ${when}`, `${amt} will be taken. Tap to keep it or cancel.`, { always: true, path: '/studio#account' }).catch(() => {});
    if (ok) { rec.sent[k] = core.nowIso(); await setJson(rk, rec); report.sent++; }
  }
  return report;
}

module.exports = { onSync, setCancel, runReminders, cancelLink, checkLink, linkInfo, TIERS };
