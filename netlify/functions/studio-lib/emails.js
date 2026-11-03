'use strict';
/*
 * 📝 Email templates you can edit in HQ → Emails.
 *   mail/tpl/<id>  { subject, body, at, by }   (only saved when you change a template; "Restore original" deletes it)
 * Body format (simple): blank line = new paragraph · "- " bullets · "1. " numbered · **bold** · links are made clickable.
 * Placeholders like {business_name} are filled in for each email.
 */
const core = require('./core');
const { getJson, setJson, del } = core;

const SIGN = '\n\nAuntie Tobi';
const STUDIO_LIST = `- Log every enquiry and get reminded who to follow up with
- Plan your posts and Reels in a simple content calendar
- Make quotes, invoices and a price list page with WhatsApp ordering
- Get help writing captions and customer replies`;
const CLUB_LIST = `- Featured Business on the Auntie Tobi app and website for 12 months
- At least one Business Spotlight on the Auntie Tobi Instagram and blog
- Your product or service on the Auntie Tobi Marketplace for 12 months
- Full Business Studio, with 20 AI credits a day`;
const BENEFITS = `1. **Featured in the app and on the website.** When people look for {category} on Auntie Tobi, Featured businesses are shown first, with your photo and a WhatsApp button.
2. **Your own Spotlight.** A dedicated post on @auntietobi_uk and the Auntie Tobi blog about your business, your story or a new offer.
3. **Discovery features.** Chances to be included in our promotional campaigns through the year.
4. **Marketplace.** Your product or service listed for 12 months.
5. **Business Growth Library.** Practical lessons, templates and tools to use at your own pace.`;

const OUT_VARS = ['business_name', 'category', 'town', 'listing_link', 'claim_link', 'remove_link', 'studio_link', 'club_link', 'personal_line'];
const T = {
  // ── Outreach: unclaimed (Auntie Tobi listed them) ──
  u1: { group: 'out-u', name: 'You’re listed', when: 'Unclaimed · day 0', subject: '{business_name} is now on Auntie Tobi 💚', body:
`Hi {business_name},{personal_line}

I’m Auntie Tobi. I help Nigerians across the UK find businesses like yours, and I’ve added {business_name} to the Auntie Tobi directory and app for free, under {category} in {town}.

Here’s your listing: {listing_link}

Please take a quick look:

- **All correct?** You don’t need to do anything.
- **Want to manage it yourself?** Claim it for free on the Auntie Tobi directory: {claim_link} and tap “Claim this listing”. You can then update your photos, description and contact details.
- **Something wrong, or you’d rather not be listed?** Reply to this email or tap here: {remove_link} and I’ll take it down.

Wishing you lots of customers,
Auntie Tobi` },
  u2: { group: 'out-u', name: 'Free Business Studio', when: 'Unclaimed · day 2 (skipped if they already use Business Studio)', subject: 'A free place to keep {business_name} organised', body:
`Hi {business_name},{personal_line}

Running a business often means juggling enquiries, orders, posts and follow-ups, all from your WhatsApp.

Auntie Tobi Business Studio is a free workspace that keeps it all in one place:

${STUDIO_LIST}

It’s free to start, and no card is needed: {studio_link}${SIGN}` },
  u3: { group: 'out-u', name: 'Business Club invite', when: 'Unclaimed · day 5', subject: 'Help more Nigerians in the UK find {business_name}', body:
`Hi {business_name},{personal_line}

Your listing on Auntie Tobi is live. If you’d like more people to find you, the Auntie Tobi Business Club is our membership for Nigerian businesses in the UK. It’s £50 for the whole year, about £4 a month.

Members get:

${CLUB_LIST}

See everything that’s included: {club_link}

Any questions? Just reply. I read every message.${SIGN}` },
  u4: { group: 'out-u', name: 'Business Club benefits + last note', when: 'Unclaimed · day 12 (last email)', subject: 'What the Business Club would do for {business_name}', body:
`Hi {business_name},

One last note from me about the Business Club, then I’ll leave you in peace.

Here’s what membership looks like in practice:

${BENEFITS}

All of this is £50 for the year: {club_link}

If now isn’t the right time, that’s completely fine. Your free listing stays, and you’re welcome to join whenever you’re ready.${SIGN}` },
  // ── Outreach: claimed, not Featured (they listed themselves) ──
  c1: { group: 'out-c', name: 'Thank you + free Business Studio', when: 'Claimed · day 0 (skipped if they already use Business Studio)', subject: 'Thank you for listing {business_name} on Auntie Tobi', body:
`Hi {business_name},{personal_line}

Thank you for listing your business on Auntie Tobi 💚

I’d love to help you stay organised too. Auntie Tobi Business Studio is a free workspace for your business:

${STUDIO_LIST}

It’s free to start, and no card is needed: {studio_link}${SIGN}` },
  c2: { group: 'out-c', name: 'Business Club invite', when: 'Claimed · day 2', subject: 'Help more Nigerians in the UK find {business_name}', body:
`Hi {business_name},{personal_line}

Thank you for being part of the Auntie Tobi directory. If you’d like more people to find you, the Auntie Tobi Business Club is our membership for Nigerian businesses in the UK. It’s £50 for the whole year, about £4 a month.

Members get:

${CLUB_LIST}

See everything that’s included: {club_link}

Any questions? Just reply. I read every message.${SIGN}` },
  c3: { group: 'out-c', name: 'Business Club benefits', when: 'Claimed · day 5', subject: 'What the Business Club would do for {business_name}', body:
`Hi {business_name},

Here’s what Business Club membership looks like in practice:

${BENEFITS}

All of this is £50 for the year: {club_link}

Any questions? Just reply.${SIGN}` },
  c4: { group: 'out-c', name: 'Short last note', when: 'Claimed · day 12 (last email)', subject: 'A last note from Auntie Tobi', body:
`Hi {business_name},

Just a short last note. If you’d like {business_name} to be a Featured Business on Auntie Tobi and promoted to Nigerians across the UK, the Business Club is £50 for 12 months: {club_link}

No pressure at all. This is my last email about it, and your listing stays just as it is.${SIGN}` },
};
for (const k of Object.keys(T)) T[k].vars = OUT_VARS;

// ── Business Studio / Business Club emails (sent by the system). Until you edit one, the original email is sent exactly as before. ──
const S = (group, name, when, subject, body, vars, must) => ({ group, name, when, subject, body, vars, must: must || [], sys: true });
Object.assign(T, {
  'club.welcome': S('sys-club', 'Business Club welcome', 'When someone joins the Business Club (Stripe payment)', 'Welcome to the Auntie Tobi Business Club 💚',
`Hi {name},

Thank you for joining the Auntie Tobi Business Club! Your membership is active until {until}.

Open your Business Studio: {studio_link}
Sign in with this email address ({email}) — we’ll send you a 6-digit code, no password needed.

**Good first steps**

- Complete your business profile
- Add your product or service to the Marketplace: {marketplace_link}
- Read “Welcome to Auntie Tobi Business Club” in Library → Resources

Auntie Tobi 💚`, ['name', 'until', 'studio_link', 'email', 'marketplace_link']),
  'club.renewed': S('sys-club', 'Business Club renewed', 'When a member pays again', 'Your Auntie Tobi Business Club membership is renewed 💚',
`Hi {name},

Thank you for renewing! Your Business Club membership is now active until {until}.

Open your Business Studio: {studio_link}
Sign in with this email address ({email}) — we’ll send you a 6-digit code, no password needed.

Auntie Tobi 💚`, ['name', 'until', 'studio_link', 'email', 'marketplace_link']),
  'code': S('sys-acc', 'Sign-in code', 'Every time someone signs in (Business Studio, Marketplace, HQ)', '{code} is your {brand} code',
`Here’s your one-time code:

**{code}**

It expires in 10 minutes and can only be used once.

Didn’t ask for this? Ignore this email — nobody can sign in without the code.

{brand}`, ['code', 'brand'], ['code']),
  'credits.added': S('sys-acc', 'AI credits added', 'After someone buys AI credits', '{credits} AI credits added to your Business Studio',
`Thank you! {credits} AI credits have been added to your Auntie Tobi Business Studio.

Your daily AI credits are used first; your extra credits are used when you need more. They last until {expires}.

This was a one-off payment — nothing will renew.

Auntie Tobi 💚`, ['credits', 'expires']),
  'sub.welcome': S('sys-acc', 'Subscription started (Plus / Pro)', 'After someone subscribes', 'Welcome to {plan} 💚',
`Thank you! Your **{plan}** is active — **{credits_per_day} daily AI credits** and every Business Studio tool, including the advanced ones.

Your next payment is **{price} on {date}**. It renews automatically — we’ll remind you before each payment.

You can cancel any time in two taps: Business Studio → Account → Cancel subscription — or here: {cancel_link}

Open Business Studio: {studio_link}

— Auntie Tobi Business Studio`, ['plan', 'credits_per_day', 'price', 'date', 'cancel_link', 'studio_link'], ['cancel_link']),
  'sub.cancelled': S('sys-acc', 'Subscription cancelled', 'When someone cancels Plus / Pro', 'Your {plan} has been cancelled',
`You won’t be charged again. Your {plan} stays on until **{date}**, then you’ll go back to {after_plan}. Everything in your library stays.

Changed your mind? You can keep your plan any time before then: {keep_link}

— Auntie Tobi Business Studio`, ['plan', 'date', 'after_plan', 'keep_link'], ['date']),
  'sub.renew': S('sys-acc', 'Renewal reminder', '7 days and 1 day before a yearly renewal (3 days before monthly)', 'Your {plan} renews on {date} ({price})',
`Just a reminder: your **{plan}** renews on **{date}** and **{price}** will be taken for the next {period}.

Happy to keep it? There’s nothing to do. Want to stop? Cancel in one tap — you keep your plan until that date: {cancel_link}

— Auntie Tobi Business Studio
You can turn these reminders off in Business Studio → Account.`, ['plan', 'date', 'price', 'period', 'cancel_link', 'keep_link'], ['price', 'date', 'cancel_link']),
  'weekly': S('sys-week', 'Your week ahead — opening note', 'Every Monday morning (the numbers, follow-ups and tips below it are filled in automatically)', 'Your week ahead, {name} 💚',
`Good morning from Auntie Tobi Business Studio! Here’s your week at a glance.`, ['name']),
  'verify.ok': S('sys-verify', 'Business verified ✅', 'When you approve a verification request', 'Your business is verified on Auntie Tobi ✅',
`Good news — Auntie Tobi has checked your Companies House registration ({number}) and your business is now verified.

See it in your Business Studio: {studio_link}

Auntie Tobi 💚`, ['number', 'studio_link']),
  'verify.no': S('sys-verify', 'Verification not approved', 'When you decline a verification request', 'About your verification request',
`Thank you for your verification request. We weren’t able to verify your business at the moment.

{note}

Any questions? Message us on WhatsApp: https://wa.me/447594674940

Auntie Tobi 💚`, ['note']),
  'msg.reply': S('sys-msg', 'Auntie Tobi replied to your message', 'When you reply in Business Studio messages (and the unread reminder)', 'Auntie Tobi replied to your message 💬',
`Auntie Tobi replied to you in Business Studio:

{message}

Read and reply: {studio_link}`, ['message', 'studio_link'], ['message']),
  'idea.reply': S('sys-msg', 'Reply to an idea', 'When you reply to an idea someone sent', 'Auntie Tobi replied to your idea',
`Thank you for your idea for Business Studio:

“{idea}”

Auntie Tobi says:
{reply}

Status: {status}

Auntie Tobi 💚`, ['idea', 'reply', 'status'], ['reply']),
  'market.received': S('sys-market', 'Listing received', 'When someone sends a Marketplace listing', 'We’ve received your Marketplace listing 💚',
`Hi {name},

Thank you for sending “{listing}” to the Auntie Tobi Marketplace. Auntie Tobi will review it and email you as soon as it’s live (or if anything needs changing).

Auntie Tobi 💚
https://www.auntietobi.co.uk/marketplace`, ['name', 'listing']),
  'market.approve': S('sys-market', 'Listing is live', 'When you approve a Marketplace listing', 'Your listing is live on the Auntie Tobi Marketplace 🎉',
`Hi {name},

Good news — “{listing}” is live on the Auntie Tobi Marketplace.

See it here: {link}

Share the link with your customers too!

Auntie Tobi 💚`, ['name', 'listing', 'link']),
  'market.changes': S('sys-market', 'Change needed', 'When you ask for a change to a listing', 'A small change is needed on your Marketplace listing',
`Hi {name},

Thank you for “{listing}”. Before it goes live, Auntie Tobi has asked for a change:

{note}

{how_to_update}

Auntie Tobi 💚`, ['name', 'listing', 'note', 'how_to_update'], ['note']),
  'market.reject': S('sys-market', 'Listing not accepted', 'When you decline a listing', 'About your Marketplace listing',
`Hi {name},

Thank you for sending “{listing}” to the Auntie Tobi Marketplace. {outcome}

{note}

Any questions? Message us on WhatsApp: https://wa.me/447594674940

Auntie Tobi 💚`, ['name', 'listing', 'outcome', 'note']),
});
const FOOTER_OUT = 'You’re receiving this because {business_name} is listed in the Auntie Tobi business directory. Don’t want these emails? Unsubscribe: {unsubscribe_link}';
const GROUPS = [
  { id: 'out-u', name: 'Outreach · Unclaimed businesses', note: 'Businesses Auntie Tobi listed. Sent on day 0, 2, 5 and 12; stops when they join the Business Club.', canAdd: 'u' },
  { id: 'out-c', name: 'Outreach · Claimed, not Featured', note: 'Businesses that listed themselves. Sent on day 0, 2, 5 and 12; stops when they join the Business Club.', canAdd: 'c' },
  { id: 'wel-free', name: 'Business Studio welcome · Free plan', note: 'Chat messages in Business Studio (and by email when switched on), from the day someone joins.', welcome: 'free' },
  { id: 'wel-club', name: 'Business Studio welcome · Business Club', note: 'For new Business Club members, from the day they join.', welcome: 'club' },
  { id: 'wel-plus', name: 'Business Studio welcome · Plus', note: 'For new Business Studio Plus subscribers.', welcome: 'plus' },
  { id: 'sys-club', name: 'Business Club', note: 'Sent straight after a Business Club payment.' },
  { id: 'sys-acc', name: 'Account & payments', note: 'Sign-in codes, credits and subscriptions. 🔒 Some words must stay (e.g. the code, the price, date and cancel link).' },
  { id: 'sys-week', name: 'Weekly email', note: 'The Monday “Your week ahead” round-up.' },
  { id: 'sys-verify', name: 'Verification', note: 'Answers to “verify my business” requests.' },
  { id: 'sys-msg', name: 'Messages & ideas', note: 'When you reply to a member.' },
  { id: 'sys-market', name: 'Marketplace', note: 'Marketplace listing updates.' },
];
// Extra outreach emails you add in HQ: mail/extra { items: [{ id, j, day, name, subject, body }] }
async function extras() { return ((await getJson('mail/extra').catch(() => null)) || { items: [] }).items; }
async function addExtra(j, day, name, who) {
  if (!['u', 'c'].includes(j)) throw new core.HttpError(400, 'invalid', 'Choose a journey.');
  day = parseInt(day, 10); if (!(day >= 0 && day <= 90)) throw new core.HttpError(400, 'invalid', 'Day must be between 0 and 90.');
  const id = 'x' + Date.now().toString(36);
  await core.cas('mail/extra', cur => { cur = cur || { items: [] }; if (cur.items.length >= 20) throw new core.HttpError(400, 'too_many', 'That’s 20 extra emails — remove one first.'); cur.items.push({ id, j, day, name: core.cleanText(name, 80) || 'New email', subject: 'A note from Auntie Tobi', body: 'Hi {business_name},\n\n…\n\nAuntie Tobi', at: core.nowIso(), by: who }); return cur; });
  return id;
}
async function removeExtra(id) { await core.cas('mail/extra', cur => { if (!cur) return undefined; cur.items = cur.items.filter(x => x.id !== id); return cur; }); await del('mail/tpl/' + id).catch(() => {}); }
function extraDef(x) { return { group: x.j === 'u' ? 'out-u' : 'out-c', name: x.name, when: (x.j === 'u' ? 'Unclaimed' : 'Claimed') + ' · day ' + x.day + ' (added by you)', subject: x.subject, body: x.body, vars: OUT_VARS, extra: true, day: x.day, j: x.j }; }

async function def(id) { if (T[id]) return T[id]; if (/^x[a-z0-9]+$/.test(id)) { const x = (await extras()).find(y => y.id === id); if (x) return extraDef(x); } return null; }
async function get(id) {
  const d = await def(id); if (!d) return null;
  const o = await getJson('mail/tpl/' + id).catch(() => null);
  return { id, group: d.group, name: d.name, when: d.when, vars: d.vars, must: d.must || [], sys: !!d.sys, extra: !!d.extra, day: d.day, subject: (o && o.subject) || d.subject, body: (o && o.body) || d.body, edited: !!o, at: (o && o.at) || '', original: { subject: d.subject, body: d.body } };
}
// Built-in outreach emails you deleted from a journey (can be brought back): mail/removed { ids: [] }
async function removedIds() { return ((await getJson('mail/removed').catch(() => null)) || { ids: [] }).ids; }
async function removeBuiltIn(id) { if (!T[id] || !/^out-/.test(T[id].group)) throw new core.HttpError(400, 'invalid', 'Only outreach emails can be deleted.'); await core.cas('mail/removed', cur => { cur = cur || { ids: [] }; if (!cur.ids.includes(id)) cur.ids.push(id); return cur; }); }
async function restoreBuiltIn(id) { await core.cas('mail/removed', cur => { if (!cur) return undefined; cur.ids = cur.ids.filter(x => x !== id); return cur; }); }
async function list() {
  const ids = Object.keys(T).concat((await extras()).map(x => x.id)), gone = await removedIds();
  const items = (await Promise.all(ids.map(get))).filter(Boolean).map(t => Object.assign(t, { removed: gone.includes(t.id) }));
  const welcome = require('./welcome'), wel = {};
  for (const x of ['free', 'club', 'plus']) { const c = await welcome.get(x); wel[x] = { on: c.on, email: c.email, steps: c.steps, defaults: welcome.defaultsFor(x) }; }
  return { groups: GROUPS, items, welcome: wel };
}
async function save(id, subject, body, who) {
  const d = await def(id);
  if (!d) throw new core.HttpError(404, 'not_found', 'Unknown email.');
  subject = core.cleanText(subject, 200); body = String(body || '').replace(/\r/g, '').trim().slice(0, 8000);
  if (!subject || body.length < 10) throw new core.HttpError(400, 'invalid', 'Add a subject and the email text.');
  const bad = (subject + body).match(/\{([a-z_]+)\}/g); const unknown = (bad || []).map(x => x.slice(1, -1)).filter(v => !d.vars.includes(v) && v !== 'unsubscribe_link');
  if (unknown.length) throw new core.HttpError(400, 'invalid', 'Unknown placeholder: {' + unknown[0] + '}. You can use: ' + d.vars.map(v => '{' + v + '}').join(' '));
  const missing = (d.must || []).filter(v => (subject + ' ' + body).indexOf('{' + v + '}') < 0);
  if (missing.length) throw new core.HttpError(400, 'locked', '🔒 This email must keep {' + missing.join('}, {') + '} — please put ' + (missing.length > 1 ? 'them' : 'it') + ' back.');
  await setJson('mail/tpl/' + id, { subject, body, at: core.nowIso(), by: who });
  return get(id);
}
async function restore(id) { await del('mail/tpl/' + id).catch(() => {}); return get(id); }

// ── rendering ──
const escH = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (s, v) => String(s).replace(/\{([a-z_]+)\}/g, (m, k) => (k in v ? String(v[k] == null ? '' : v[k]) : m));
// [[Button text|https://…]] = a green button · [link text](https://…) = a link · **bold** · bare web addresses become links
function inline(s) {
  const keep = [], hold = h => '\u0000' + (keep.push(h) - 1) + '\u0000';
  let t = escH(s)
    .replace(/\[\[([^|\]]+)\|(https?:\/\/[^\]\s]+)\]\]/g, (m, label, u) => hold(`<a href="${u}" style="display:inline-block;background:#057A44;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px;margin:4px 0">${label.trim()}</a>`))
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (m, label, u) => hold(`<a href="${u}" style="color:#057A44;font-weight:bold">${label}</a>`));
  t = t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(https?:\/\/[^\s<\u0000]+[^\s<.,;:!?)’”\u0000])/g, u => `<a href="${u}" style="color:#057A44;font-weight:bold">${u.replace(/^https?:\/\/(www\.)?/, '').replace(/\?.*$/, '').slice(0, 60)}</a>`);
  return t.replace(/\u0000(\d+)\u0000/g, (m, i) => keep[+i]);
}
function toHtml(text) {
  return text.split(/\n{2,}/).map(par => {
    const lines = par.split('\n');
    if (lines.every(l => /^- /.test(l))) return '<ul style="padding-left:20px;margin:0 0 14px">' + lines.map(l => `<li style="margin:4px 0">${inline(l.slice(2))}</li>`).join('') + '</ul>';
    if (lines.every(l => /^\d+\. /.test(l))) return '<ol style="padding-left:20px;margin:0 0 14px">' + lines.map(l => `<li style="margin:6px 0">${inline(l.replace(/^\d+\. /, ''))}</li>`).join('') + '</ol>';
    return `<p style="margin:0 0 14px">${lines.map(inline).join('<br>')}</p>`;
  }).join('');
}
const toText = t => t.replace(/\[\[([^|\]]+)\|(https?:\/\/[^\]\s]+)\]\]/g, '$1: $2').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)').replace(/\*\*(.+?)\*\*/g, '$1');
// → { subject, text, html } with the outreach footer
function renderWith(tpl, vars, footer) {
  const v = Object.assign({}, vars);
  if (v.personal_line) v.personal_line = '\n\n' + v.personal_line; else v.personal_line = '';
  const body = fill(tpl.body, v).replace(/\n{3,}/g, '\n\n').trim(), foot = footer ? fill(footer, v) : '';
  const html = `<!doctype html><html><body style="margin:0;background:#F6F4EE"><div style="font-family:Arial,Helvetica,sans-serif;font-size:15.5px;line-height:1.6;color:#0F1E36;max-width:560px;margin:0 auto;padding:20px 16px">
<div style="background:#fff;border-radius:14px;padding:22px 22px 8px;border:1px solid #ECE6D6"><div style="height:5px;background:linear-gradient(90deg,#057A44 33%,#fff 33%,#fff 66%,#057A44 66%);border-radius:3px;margin:-8px 0 18px"></div>${toHtml(body)}</div>
${foot ? `<p style="font-size:12px;color:#6B7280;margin:14px 6px">${inline(foot)}</p>` : ''}</div></body></html>`;
  return { subject: fill(tpl.subject, v).replace(/\s+/g, ' ').trim(), text: toText(body) + (foot ? '\n\n—\n' + foot : ''), html };
}
async function render(id, vars) { const t = await get(id); return renderWith(t, vars, t.group.startsWith('out-') ? FOOTER_OUT : ''); }
// For system emails: your edited version if there is one, otherwise the original email unchanged.
async function system(id, vars, fallback) {
  try {
    const o = await getJson('mail/tpl/' + id).catch(() => null);
    if (!o || !T[id]) return fallback;
    const v = {}; for (const k of T[id].vars) v[k] = vars[k] == null ? '' : vars[k];
    const r = renderWith(o, v, '');
    return Object.assign({}, fallback, { subject: r.subject, text: r.text, html: r.html, edited: true });
  } catch (_) { return fallback; }
}
async function override(id) { return getJson('mail/tpl/' + id).catch(() => null); }
// Plain message for WhatsApp / Instagram (no footer, links kept)
async function plain(id, vars) { const t = await get(id); const v = Object.assign({}, vars, { personal_line: vars.personal_line ? '\n\n' + vars.personal_line : '' }); return toText(fill(t.body, v)).replace(/\n{3,}/g, '\n\n').trim(); }

module.exports = { removedIds, removeBuiltIn, restoreBuiltIn, toHtml, toText, inline, system, override, extras, addExtra, removeExtra, def, T, GROUPS, get, list, save, restore, render, renderWith, plain, FOOTER_OUT, OUT_VARS };
