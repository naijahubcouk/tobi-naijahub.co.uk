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
- ONE paid Instagram group advert
- Your product or service on the Auntie Tobi Marketplace for 12 months
- Full Business Studio, with 20 AI credits a day`;
const BENEFITS = `1. **Featured in the app and on the website.** When people look for {category} on Auntie Tobi, Featured businesses are shown first, with your photo and a WhatsApp button.
2. **Your own Spotlight.** A dedicated post on @auntietobi_uk and the Auntie Tobi blog about your business, your story or a new offer.
3. **ONE paid Instagram group advert.** Your business in a group carousel on the Auntie Tobi Instagram, promoted with paid Instagram advertising to reach more Nigerians across the UK.
4. **Discovery features.** Chances to be included in our promotional campaigns through the year.
5. **Marketplace.** Your product or service listed for 12 months.
6. **Business Growth Library.** Practical lessons, templates and tools to use at your own pace.`;

const EV_VARS = ['organiser_name', 'event_title', 'event_link', 'promo_link'];
const OUT_VARS = ['business_name', 'category', 'town', 'listing_link', 'claim_link', 'remove_link', 'studio_link', 'club_link', 'whatsapp_link', 'personal_line'];
const T = {
  // ── Outreach: unclaimed (Auntie Tobi listed them) ──
  u1: { group: 'out-u', name: 'You’re listed', when: 'Unclaimed · day 0', subject: '{business_name} is now on Auntie Tobi 💚', body:
`Hi {business_name},{personal_line}

I’m Auntie Tobi. I help Nigerians across the UK find businesses like yours, and I’ve added {business_name} to the Auntie Tobi directory and app for free, under {category} in {town}.

Here’s your listing: {listing_link}

Please take a quick look:

- **All correct?** You don’t need to do anything.
- **Want to manage it yourself?** Claim it for free here: {claim_link}. It takes a minute, and you’ll also get your own free Business Studio, where you can update your photo, description and contact details any time.
- **Something wrong, or you’d rather not be listed?** Reply to this email or tap here: {remove_link} and I’ll take it down.

Wishing you lots of customers,
Auntie Tobi` },
  u2: { group: 'out-u', name: 'Claim reminder + free Business Studio', when: 'Unclaimed · day 2 (skipped if they already use Business Studio or have claimed)', subject: 'Your free Business Studio is waiting, {business_name}', body:
`Hi {business_name},{personal_line}

A quick reminder: {business_name} is listed on Auntie Tobi, but it hasn’t been claimed yet.

When you claim it, you also get **Auntie Tobi Business Studio**, a free workspace for your business:

- Update your Auntie Tobi listing yourself (photo, description, WhatsApp and more)
${STUDIO_LIST}

[[Claim my business|{claim_link}]]

It takes a minute and it’s free. No card is needed.${SIGN}` },
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

- Update your Auntie Tobi listing yourself, any time (photo, description, WhatsApp and more)
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
  n2: { group: 'out-n', name: 'Business Club invite', when: 'New business · 2 days after “You’re listed”', subject: 'Help more Nigerians in the UK find {business_name}', body:
`Hi {business_name},

Now that {business_name} is live on Auntie Tobi, here’s how to get it in front of even more Nigerians across the UK.

The Auntie Tobi Business Club is our membership for Nigerian businesses in the UK. It’s £50 for the whole year, about £4 a month.

Members get:

${CLUB_LIST}

See everything that’s included: {club_link}

Any questions? Just reply. I read every message.${SIGN}` },
  n3: { group: 'out-n', name: 'Business Club benefits', when: 'New business · 5 days after “You’re listed” (last email)', subject: 'What the Business Club would do for {business_name}', body:
`Hi {business_name},

Here’s what Business Club membership would look like for {business_name}:

${BENEFITS}

All of this is £50 for the year: {club_link}

No pressure at all. This is my last email about it, and your listing stays just as it is.${SIGN}` },
};
for (const k of Object.keys(T)) T[k].vars = OUT_VARS;

// ── Business Studio / Business Club emails (sent by the system). Until you edit one, the original email is sent exactly as before. ──
const S = (group, name, when, subject, body, vars, must) => ({ group, name, when, subject, body, vars, must: must || [], sys: true });
Object.assign(T, {
  'club.welcome': S('sys-club', 'Business Club welcome', 'When someone joins the Business Club (Stripe payment)', 'Welcome to the Auntie Tobi Business Club 💚',
`Hi {name},

Thank you for joining the Auntie Tobi Business Club! Your membership is active until {until}.

[[Open your Business Studio|{studio_link}]]

Sign in with this email address ({email}) — we’ll send you a 6-digit code, no password needed.

**Good first steps**

- Complete your business profile
- [Add your product or service to the Marketplace]({marketplace_link})
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
  'plan.morning': S('sys-plan', 'My Plan · morning email', 'Mornings, only on days someone has something due — and only if they switched morning emails on in My Plan', '☀️ Your plan for today',
`Good morning{name_comma} ☀️

Here’s what’s on your plan today:

{list}

[[💚 Open My Plan|{plan_link}]]

Auntie Tobi 💚

You get this because you switched on morning emails in My Plan. [Turn them off]({off_link})`, ['name', 'name_comma', 'list', 'count', 'plan_link', 'off_link'], ['list', 'off_link']),
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
// ── ➕ Add your business ──
const BIZ_VARS = ['name', 'business_name', 'listing_link', 'studio_link', 'email', 'new_name', 'reason', 'whatsapp_link'];
Object.assign(T, {
  'biz.listed': S('out-n', 'You’re listed + Business Studio', 'New business · email 1 — when their business is on the website (sent from HQ → Add your business)', '🎉 {business_name} is live on Auntie Tobi, and your Business Studio is ready',
`Hi {name},

Good news! **{business_name}** is now listed on the Auntie Tobi app and website, where Nigerians across the UK look for businesses like yours.

[[View my listing|{listing_link}]]

**Your free Business Studio is ready too.** It’s your business workspace from Auntie Tobi:

- ✏️ Edit your listing any time (photo, description, WhatsApp and more)
- 📱 Make posts and designs for Instagram in minutes
- 👥 Keep track of customers and follow-ups
- 📅 Plan your content for the week

[[Open Business Studio|{studio_link}]]

Sign in with this email address ({email}). We’ll send you a 6-digit code, no password needed.

Want even more people to find you? The Auntie Tobi Business Club puts you at the top as a Featured Business: https://www.auntietobi.co.uk/business-club

Auntie Tobi 💚`, BIZ_VARS),
  'biz.listed.site': S('out-n', 'You’re listed (signed up on the website)', 'New business · email 1 for owners who signed up on the directory website (sent from HQ → Add your business)', '🎉 {business_name} is live on Auntie Tobi',
`Hi {name},

Good news! **{business_name}** is now live on the Auntie Tobi website and app, where Nigerians across the UK look for businesses like yours.

[[View my listing|{listing_link}]]

**Want to do more with your listing?** Try Business Studio free. It’s your business workspace from Auntie Tobi:

- 📱 Make posts and designs for Instagram in minutes
- 👥 Keep track of customers and follow-ups
- 📅 Plan your content for the week

[[Try Business Studio free|{studio_link}]]

Want even more people to find you? The Auntie Tobi Business Club puts you at the top as a Featured Business: https://www.auntietobi.co.uk/business-club

Any questions? Message us on WhatsApp: {whatsapp_link}

Auntie Tobi 💚`, BIZ_VARS),
  'biz.claimok': S('sys-biz', 'Claim approved', 'When you approve someone’s claim in HQ → Add your business', '✅ {business_name} is now yours on Auntie Tobi',
`Hi {name},

Good news: you can now manage **{business_name}** on Auntie Tobi yourself.

[[Edit my listing|{studio_link}]]

In your free Business Studio, go to **My Listing** to update your photo, description, WhatsApp and more. Changes show in the Auntie Tobi app straight away.

Sign in with this email address ({email}). We’ll send you a 6-digit code, no password needed.

Auntie Tobi 💚`, BIZ_VARS),
  'biz.claimno': S('sys-biz', 'Claim not approved', 'When you decline a claim and tick “Tell them by email”', 'About your claim for {business_name}',
`Hi {name},

Thank you for asking to manage **{business_name}** on Auntie Tobi.

We weren’t able to confirm that you own or run this business, so we haven’t linked it to your account.{reason}

If this is a mistake, message Auntie Tobi on WhatsApp and we’ll sort it out: {whatsapp_link}

Auntie Tobi 💚`, BIZ_VARS),
  'biz.declined': S('sys-biz', 'New business not added', 'When you decline a new business and tick “Tell them by email”', 'About {business_name} on Auntie Tobi',
`Hi {name},

Thank you for adding **{business_name}** to Auntie Tobi.

We’re sorry, but we haven’t been able to add it to the directory this time.{reason}

If you think we’ve got this wrong, or you’d like to try again, message Auntie Tobi on WhatsApp: {whatsapp_link}

Your free Business Studio is still yours to use: {studio_link}

Auntie Tobi 💚`, BIZ_VARS),
  'biz.nameok': S('sys-biz', 'Name change approved', 'When you approve a business name change', 'Your new business name is live on Auntie Tobi',
`Hi {name},

Your business is now called **{new_name}** on the Auntie Tobi app.

[[View my listing|{listing_link}]]

Our website will show the new name after our next website update.

Auntie Tobi 💚`, BIZ_VARS),
  'biz.nameno': S('sys-biz', 'Name change not approved', 'When you decline a name change and tick “Tell them by email”', 'About your business name change',
`Hi {name},

Thank you for asking to change **{business_name}** to “{new_name}”.

We haven’t made this change.{reason}

Any questions? Message Auntie Tobi on WhatsApp: {whatsapp_link}

Auntie Tobi 💚`, BIZ_VARS),
  'biz.announce': S('sys-biz', 'New: edit your listing in Business Studio', 'One-off email to Business Studio members who already linked their listing (sent from HQ → Add your business)', '✏️ You can now update your Auntie Tobi listing yourself',
`Hi {name},

Something new in your Business Studio: you can now update **{business_name}** on Auntie Tobi yourself, any time.

- Change your photo, description, phone, WhatsApp, Instagram and more
- Changes show in the Auntie Tobi app straight away
- Business name changes are checked by Auntie Tobi first

[[Edit my listing|{studio_link}]]

Sign in with this email address ({email}). We’ll send you a 6-digit code, no password needed.

Auntie Tobi 💚`, BIZ_VARS),
  // ── 🎉 Event organisers (sent from HQ when you tap Send) ──
  'ev.approved': S('sys-ev', 'Your event is live (submitted events)', 'When you approve an event someone submitted — HQ → Event submissions', '🎉 Your event is live on Auntie Tobi!',
`Hi {organiser_name},

Good news! **{event_title}** is now live on the Auntie Tobi app and website 🎉

👉 See your event: {event_link}

Nigerians across the UK can now find your event, with its date, location, flyer and ticket link all in one place.

**Want even more people to see it?**
Our **Event Promotion is just £20**. It includes:

- 🚀 Your event in a paid Instagram advertising campaign
- 📱 A spot on the Auntie Tobi app and website homepage
- 📅 A place in our Upcoming Events section

👉 Read more: {promo_link}

If you have any questions, just reply to this email.

Wishing you a brilliant event! 💚
Auntie Tobi
Your UK Guide for Nigerians`, EV_VARS),
  'ev.added': S('sys-ev', 'We’ve added your event (events you added)', 'Events you added yourself — HQ → Publish to App → 📋 Organiser emails', 'We’ve added {event_title} to Auntie Tobi 💚',
`Hi there,

We’ve added **{event_title}** to the Auntie Tobi app and website, so Nigerians across the UK can easily discover it 🇳🇬🇬🇧

👉 See your event: {event_link}

If any details need changing, just reply to this email and we’ll update it for you.

**Want more people to see your event?**
Our **Event Promotion is just £20**. It includes a paid Instagram advertising campaign, a spot on our app and website homepage, and a place in our Upcoming Events section.

👉 Read more: {promo_link}

All the best with your event! 💚
Auntie Tobi
Your UK Guide for Nigerians`, EV_VARS),
});
const FOOTER_OUT = 'You’re receiving this because {business_name} is listed in the Auntie Tobi business directory. Don’t want these emails? Unsubscribe: {unsubscribe_link}';
const GROUPS = [
  { id: 'out-u', name: 'Outreach · Unclaimed businesses', note: 'Businesses Auntie Tobi listed. Sent on day 0, 2, 5 and 12; stops when they join the Business Club.', canAdd: 'u' },
  { id: 'out-n', name: 'Outreach · New business (added it themselves)', note: 'Businesses added in the app by their owner. Email 1 “You’re listed” goes from HQ → Add your business; then the Club invite (2 days later) and Club benefits (day 5). Sent to the owner’s email; stops when they join the Business Club.', canAdd: 'n' },
  { id: 'out-c', name: 'Outreach · Claimed, not Featured', note: 'Businesses that listed themselves. Sent on day 0, 2, 5 and 12; stops when they join the Business Club.', canAdd: 'c' },
  { id: 'wel-free', name: 'Business Studio welcome · Free plan', note: 'Chat messages in Business Studio (and by email when switched on), from the day someone joins.', welcome: 'free' },
  { id: 'wel-club', name: 'Business Studio welcome · Business Club', note: 'For new Business Club members, from the day they join.', welcome: 'club' },
  { id: 'wel-plus', name: 'Business Studio welcome · Plus', note: 'For new Business Studio Plus subscribers.', welcome: 'plus' },
  { id: 'sys-biz', name: 'Add your business', note: 'Emails to owners who add or manage their business. Sent from HQ → Add your business when you press send.' },
  { id: 'sys-club', name: 'Business Club', note: 'Sent straight after a Business Club payment.' },
  { id: 'sys-acc', name: 'Account & payments', note: 'Sign-in codes, credits and subscriptions. 🔒 Some words must stay (e.g. the code, the price, date and cancel link).' },
  { id: 'sys-ev', name: 'Event organisers', note: 'Emails to event organisers about their event and the £20 Event Promotion. Nothing sends until you tap Send in HQ (Event submissions, or Publish to App → 📋 Organiser emails).' },
  { id: 'sys-plan', name: 'My Plan (app)', note: 'Emails to people using My Plan in the app. The Sunday Update is written each week in HQ → 📰 Sunday Update.' },
  { id: 'sys-week', name: 'Weekly email', note: 'The Monday “Your week ahead” round-up.' },
  { id: 'sys-verify', name: 'Verification', note: 'Answers to “verify my business” requests.' },
  { id: 'sys-msg', name: 'Messages & ideas', note: 'When you reply to a member.' },
  { id: 'sys-market', name: 'Marketplace', note: 'Marketplace listing updates.' },
];
// Extra outreach emails you add in HQ: mail/extra { items: [{ id, j, day, name, subject, body }] }
async function extras() { return ((await getJson('mail/extra').catch(() => null)) || { items: [] }).items; }
async function addExtra(j, day, name, who) {
  if (!['u', 'c', 'n'].includes(j)) throw new core.HttpError(400, 'invalid', 'Choose a journey.');
  day = parseInt(day, 10); if (!(day >= 0 && day <= 90)) throw new core.HttpError(400, 'invalid', 'Day must be between 0 and 90.');
  const id = 'x' + Date.now().toString(36);
  await core.cas('mail/extra', cur => { cur = cur || { items: [] }; if (cur.items.length >= 20) throw new core.HttpError(400, 'too_many', 'That’s 20 extra emails — remove one first.'); cur.items.push({ id, j, day, name: core.cleanText(name, 80) || 'New email', subject: 'A note from Auntie Tobi', body: 'Hi {business_name},\n\n…\n\nAuntie Tobi', at: core.nowIso(), by: who }); return cur; });
  return id;
}
async function removeExtra(id) { await core.cas('mail/extra', cur => { if (!cur) return undefined; cur.items = cur.items.filter(x => x.id !== id); return cur; }); await del('mail/tpl/' + id).catch(() => {}); }
function extraDef(x) { return { group: 'out-' + x.j, name: x.name, when: ({ u: 'Unclaimed', c: 'Claimed', n: 'New business' })[x.j] + ' · day ' + x.day + ' (added by you)', subject: x.subject, body: x.body, vars: OUT_VARS, extra: true, day: x.day, j: x.j }; }

async function def(id) { if (T[id]) return T[id]; if (/^x[a-z0-9]+$/.test(id)) { const x = (await extras()).find(y => y.id === id); if (x) return extraDef(x); } return null; }
// Saved (edited) emails written before claiming moved into the app: point the old directory wording at the new claim page
const OLD_CLAIM = /Claim it for free on the Auntie Tobi directory:\s*\{claim_link\}\s*and tap [“"]Claim this listing[”"]\.\s*You can then update your photos, description and contact details\./g;
const NEW_CLAIM = 'Claim it for free here: {claim_link}. It takes a minute, and you’ll also get your own free Business Studio, where you can update your photo, description and contact details any time.';
const freshClaim = t => String(t || '').replace(OLD_CLAIM, NEW_CLAIM).replace(/tap [“"]Claim this listing[”"]/g, 'tap “Yes, this is my business”');
async function get(id) {
  const d = await def(id); if (!d) return null;
  const o = await getJson('mail/tpl/' + id).catch(() => null);
  return { id, group: d.group, name: d.name, when: d.when, vars: d.vars && d.vars.length && d.vars.indexOf('whatsapp_link') < 0 ? d.vars.concat('whatsapp_link') : d.vars, must: d.must || [], sys: !!d.sys, extra: !!d.extra, day: d.day, subject: (o && o.subject) || d.subject, body: freshClaim((o && o.body) || d.body), edited: !!o, at: (o && o.at) || '', original: { subject: d.subject, body: d.body } };
}
// Built-in outreach emails you deleted from a journey (can be brought back): mail/removed { ids: [] }
async function removedIds() { return ((await getJson('mail/removed').catch(() => null)) || { ids: [] }).ids; }
async function removeBuiltIn(id) { if (!T[id] || T[id].sys || !/^out-/.test(T[id].group)) throw new core.HttpError(400, 'invalid', 'Only outreach emails can be deleted.'); await core.cas('mail/removed', cur => { cur = cur || { ids: [] }; if (!cur.ids.includes(id)) cur.ids.push(id); return cur; }); }
async function restoreBuiltIn(id) { await core.cas('mail/removed', cur => { if (!cur) return undefined; cur.ids = cur.ids.filter(x => x !== id); return cur; }); }
async function list() {
  const ids = Object.keys(T).concat((await extras()).map(x => x.id)), gone = await removedIds();
  const items = (await Promise.all(ids.map(get))).filter(Boolean).map(t => Object.assign(t, { removed: gone.includes(t.id) }));
  const first = id => id === 'biz.listed' ? -2 : id === 'biz.listed.site' ? -1 : 0;
  items.sort((a, b) => first(a.id) - first(b.id));   // “You’re listed” is email 1 of the New business series
  const welcome = require('./welcome'), wel = {};
  for (const x of ['free', 'club', 'plus']) { const c = await welcome.get(x); wel[x] = { on: c.on, email: c.email, steps: c.steps, defaults: welcome.defaultsFor(x) }; }
  return { groups: GROUPS, items, welcome: wel };
}
async function save(id, subject, body, who) {
  const d = await def(id);
  if (!d) throw new core.HttpError(404, 'not_found', 'Unknown email.');
  subject = core.cleanText(subject, 200); body = String(body || '').replace(/\r/g, '').trim().slice(0, 8000);
  if (!subject || body.length < 10) throw new core.HttpError(400, 'invalid', 'Add a subject and the email text.');
  const bad = (subject + body).match(/\{([a-z_]+)\}/g); const unknown = (bad || []).map(x => x.slice(1, -1)).filter(v => !d.vars.includes(v) && v !== 'unsubscribe_link' && v !== 'whatsapp_link');   // {whatsapp_link} works in every email
  if (unknown.length) throw new core.HttpError(400, 'invalid', 'Unknown placeholder: {' + unknown[0] + '}. You can use: ' + d.vars.map(v => '{' + v + '}').join(' '));
  const missing = (d.must || []).filter(v => (subject + ' ' + body).indexOf('{' + v + '}') < 0);
  if (missing.length) throw new core.HttpError(400, 'locked', '🔒 This email must keep {' + missing.join('}, {') + '} — please put ' + (missing.length > 1 ? 'them' : 'it') + ' back.');
  await setJson('mail/tpl/' + id, { subject, body, at: core.nowIso(), by: who });
  return get(id);
}
async function restore(id) { await del('mail/tpl/' + id).catch(() => {}); return get(id); }

// ── rendering ──
const escH = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const WA_LINK = 'https://wa.me/447594674940';
const fill = (s, v) => String(s).replace(/\{([a-z_]+)\}/g, (m, k) => (k === 'whatsapp_link' && !(k in v) ? WA_LINK : k in v ? String(v[k] == null ? '' : v[k]) : m));
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
function renderWith(tpl, vars, footer, opts) {
  const v = Object.assign({}, vars);
  if (v.personal_line) v.personal_line = '\n\n' + v.personal_line; else v.personal_line = '';
  const body = fill(tpl.body, v).replace(/\n{3,}/g, '\n\n').trim(), foot = footer ? fill(footer, v) : '';
  // Design "A · Classic Green" (chosen Nov 2026): white card, gold buttons, navy footer with links
  const btn = h => h.replace(/background:#057A44;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px;margin:4px 0/g, 'background:#FFB81C;color:#0F1E36;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:10px;margin:6px 0');
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#F4F1EA"><div style="max-width:600px;margin:0 auto;padding:24px 14px;font-family:Arial,Helvetica,sans-serif;color:#0F1E36">
<div style="background:#ffffff;padding:26px 24px 12px;font-size:16px;line-height:1.65;border:1px solid #E7E1D2;border-bottom:0;border-radius:16px 16px 0 0;border-top:5px solid #057A44">${btn(toHtml(body))}</div>
<div style="background:#0F1E36;color:#ffffff;border-radius:0 0 16px 16px;padding:16px 22px;font-size:13px;text-align:center">📱 <a href="https://www.auntietobi.co.uk" style="color:#FFB81C;font-weight:bold;text-decoration:none">auntietobi.co.uk</a> &nbsp;·&nbsp; 📸 <a href="https://www.instagram.com/auntietobi_uk/" style="color:#FFB81C;font-weight:bold;text-decoration:none">@auntietobi_uk</a>${opts && opts.noChannel ? '' : ' &nbsp;·&nbsp; 📣 <a href="https://whatsapp.com/channel/0029VbE21JgE50Un7MSnm50e" style="color:#FFB81C;font-weight:bold;text-decoration:none">WhatsApp Channel</a>'}</div>
${foot ? `<p style="font-size:12px;color:#6B7280;margin:14px 8px;text-align:center">${inline(foot)}</p>` : ''}</div></body></html>`;
  return { subject: fill(tpl.subject, v).replace(/\s+/g, ' ').trim(), text: toText(body) + (foot ? '\n\n—\n' + foot : ''), html };
}
async function render(id, vars) { const t = await get(id); return renderWith(t, vars, t.group.startsWith('out-') && !t.sys ? FOOTER_OUT : ''); }
// For system emails: your edited version if there is one, otherwise the original email unchanged.
const NEW_DESIGN = ['club.welcome'];   // system emails that use the new design (Seun's choice, Nov 2026); the rest keep their own look
async function system(id, vars, fallback) {
  try {
    let o = await getJson('mail/tpl/' + id).catch(() => null);
    if (!o && NEW_DESIGN.includes(id)) o = T[id];   // these use the new email design even when not edited
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
