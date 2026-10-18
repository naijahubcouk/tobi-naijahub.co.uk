'use strict';
/*
 * Launch content for Resources. Loaded into storage once; after that, edit lessons in
 * Studio Admin → Resources (your edits are never overwritten by later updates).
 * Bump VERSION (and a lesson's seedRev) to ship new or improved seed lessons; lessons you've
 * edited or deleted in admin are left alone.
 *
 * Formatting used in lesson text:  ## Heading   - bullet   1. numbered   **bold**   > Tip box   [link](https://…)
 */
const VERSION = 9;
const REVIEWED = '2026-10-16';

// Every module and lesson title. "planned" = shown to members as Coming soon.
const OUTLINE = {
  m01: ['Welcome to Auntie Tobi Business Club', 'How to Make the Most of Your Membership', 'Set Your Business Goals', 'Create Your 30-Day Business Action Plan', 'Understanding Your Ideal Customer'],
  m02: ['Optimising Your Instagram Bio', 'Profile Photos, Highlights & Pinned Posts', 'Understanding Reels, Stories & Carousels', 'How to Attract the Right Followers', 'Turning Profile Visitors Into Enquiries', 'Understanding Instagram Insights'],
  m03: ['The Three Types of Business Content: Attract, Build Trust & Sell', 'How to Take Better Product Photos', 'How to Create Simple Reels', '20 Reel Ideas for Small Businesses', 'Writing Captions That Encourage Action', 'Planning One Week of Content in 30 Minutes', 'Repurposing One Piece of Content'],
  m04: ['Understanding Your Customer’s Buying Journey', 'How to Present Your Products or Services', 'Writing Offers Without Constant Discounts', 'How to Respond to Customer Enquiries', 'Following Up Without Being Pushy', 'How to Ask for Customer Reviews', 'Encouraging Repeat Purchases and Referrals', 'How to Turn Enquiries Into Orders'],
  m05: ['Setting Up WhatsApp Business', 'Using WhatsApp Catalogue, Labels & Quick Replies', 'Creating Designs With Canva', 'Using ChatGPT Responsibly for Business', 'Using Google Business Profile Where Eligible', 'Organising Orders and Customer Enquiries', 'Simple Business Tracking With Spreadsheets'],
  m06: ['Business Mindset: Ownership & Consistency', 'Visibility vs Sales: Understanding the Difference', 'Pricing Your Products or Services', 'Understanding Costs, Profit and Cash Flow', 'Finding Your Competitive Advantage', 'Building Customer Trust', 'Creating a Simple 90-Day Growth Strategy', 'Learning From Your Business Results'],
  m07: ['How to Build Your Monthly Marketing Calendar', 'How to Plan Seasonal Campaigns', 'How to Prepare for Product Launches and Promotions', 'How to Use Stories to Build Customer Relationships', 'How to Plan a Customer Appreciation Campaign', 'How to Balance Sales Posts With Helpful Content', 'How to Review Last Month and Plan the Next'],
  m08: ['Prepare Your Business for a Dedicated Spotlight', 'Create an Effective Marketplace Product or Service Listing', 'How to Submit Your Business for Relevant Discovery Features', 'How to Make the Most of an Auntie Tobi Repost', 'How to Collaborate With Complementary Businesses', 'Track Enquiries Generated Through Auntie Tobi', 'Prepare for Your Business Check-In and Stay Accountable'],
  m09: ['Focus: Doing Fewer Things Well', 'Staying Consistent When Results Are Slow'],
};

function slug(t) { return String(t).toLowerCase().replace(/’/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48); }
const idFor = (mod, title) => `${mod}-${slug(title)}`.slice(0, 60).replace(/-$/, '');

// ───────────────────────── full lessons ─────────────────────────
const FULL = {};

FULL[idFor('m02', 'Optimising Your Instagram Bio')] = {
  summary: 'Make sure a first-time visitor can tell what you sell, who it’s for, where you are and how to order — in a few seconds.',
  tags: ['all', 'food', 'beauty', 'fashion', 'events', 'photo', 'retail', 'services'],
  featured: true, collection: 'Month 1 — Getting Visible', collectionOrder: 1,
  reviewMonths: 6,
  learn: `Your bio is the first thing most people read after they tap on your name. Many of them have found you through a Reel, a hashtag, a repost or a friend’s recommendation, and they are deciding — often in a few seconds — whether to follow, message you, or scroll away.

A good bio answers four questions straight away:

1. **What do you sell or do?**
2. **Who is it for?**
3. **Where are you based, or where do you deliver?**
4. **What should I do next?** (order, book, message, visit)

If a stranger can’t answer those four questions from your profile, you are probably losing enquiries you never knew about.

## The parts of your profile that do the work

**Your name field.** This is the bold name at the top of your profile, separate from your @username. Many businesses only put their brand name here, for example “Tayo’s Kitchen”. You can use it to add what you do, for example “Tayo’s Kitchen | Nigerian Catering”. People can find you in Instagram search by your name as well as your @username, so a few words about what you do can help the right people find you. Keep it readable — this is not a place to stuff keywords.

**Your bio text.** Instagram keeps this short (at the time of writing, 150 characters — the app will stop you if you go over). That means every word has to earn its place. Lead with what you sell and for whom. Emojis can help break things up, but use them to support the words, not replace them.

**Your link.** Instagram lets you add links to your profile. Use the link that takes people closest to buying — your WhatsApp chat, booking page, price list, website shop or your Auntie Tobi listing. If you add more than one, put the most important first. A link that just goes to a homepage with no clear next step is a missed opportunity.

**Contact and action buttons.** Professional (business or creator) accounts can show contact options and action buttons on the profile. What’s available changes over time and differs between accounts, so check the options in your own app under your profile settings. If customers usually message you on WhatsApp, make that easy to find.

**Category.** Professional accounts can display a category (such as “Caterer” or “Hair Salon”) under the name. Choose the closest match — it’s a quick signal of what you do.

## A simple bio formula

Try this structure, then shorten it until it fits:

- **Line 1 — What you do and who for:** “Bespoke Nigerian party trays for celebrations”
- **Line 2 — Where:** “Birmingham & West Midlands · Delivery available”
- **Line 3 — Proof or difference:** “Halal · Small chops, jollof & grills”
- **Line 4 — What to do next:** “Order on WhatsApp ⬇️”

You do not need all four lines every time. If you are short on space, keep “what you do”, “where” and “what to do next”.

## Common mistakes

- **Only inspirational quotes.** “Dream big, God’s timing is the best” tells a visitor nothing about what you sell.
- **No location.** Many customers search for businesses near them. If you serve a particular area or deliver UK-wide, say so.
- **No next step.** If someone has to guess how to order, many won’t bother.
- **Out-of-date information.** Old prices, an old phone number or “bookings open in March” in October all reduce trust.
- **Hashtags in the bio.** A row of hashtags uses up space you could use to explain what you do.

> Your bio is not a one-off job. Look at it again whenever your offer, location, prices or booking method changes.

## What this won’t do

A better bio won’t bring in new followers on its own. Your content does that. What a clear bio does is help the people who already land on your profile understand you and take the next step — which is where enquiries come from.`,
  seeTitle: 'Fictional example: a hairstylist in Manchester',
  see: `**Before**

“Adunni ✨ | God first 🙏 | Slay queen energy | DM for enquiries”

A visitor can’t tell what Adunni does, where she is, or what it costs.

**After**

Name field: “Adunni | Braids & Wigs Manchester”

Bio:
“Knotless braids, frontal installs & wig styling
Salford studio · Home visits on request
Book on WhatsApp ⬇️”

Link: her WhatsApp chat, with a pinned post showing her price list.

Now a stranger knows what she offers, where she works and exactly how to book. The personality can come through in her posts and Stories instead.`,
  do: `Open your Instagram profile as if you were a customer seeing it for the first time (or ask a friend to look at it on their phone).

In 10 seconds, can they tell **what you sell, who it’s for, where you are and how to order?**

Go through the checklist below, tick off what you already have, then rewrite your bio using the formula. Save the new version and come back to tick this lesson complete.`,
  use: [
    { type: 'checklist', title: 'Instagram Bio Checklist', items: [
      'My name field says what I do, not just my brand name',
      'The first line of my bio says what I sell or do',
      'It’s clear who my products or services are for',
      'My location or delivery area is included',
      'There is one clear next step (order, book, message)',
      'My main link goes straight to ordering, booking or my price list',
      'My profile photo is clear and recognisable at a small size',
      'My contact options are correct and easy to find',
      'Nothing in my bio is out of date (prices, dates, numbers)',
      'I’ve checked it on a phone screen, not just a computer',
    ] },
    { type: 'template', title: 'Bio formula (fill in the brackets)', text: `[What you sell or do] for [who it’s for]
[Town/area] · [Delivery / home visits / UK-wide]
[One thing that makes you different]
[Order / Book / Message] on [WhatsApp / website] ⬇️`, note: 'Shorten it until it fits Instagram’s limit. Your app shows when you’ve gone over.' },
  ],
  studio: { label: 'Write 3 bio options in Studio', tool: 'bio', input: { type: 'Instagram bio (150 characters)' } },
  sources: [
    { title: 'Instagram Help Centre — editing your profile and professional accounts', url: 'https://help.instagram.com/' },
  ],
  disclaimer: 'Instagram changes its features and limits from time to time. Check the current options in your own app.',
};

FULL[idFor('m01', 'Create Your 30-Day Business Action Plan')] = {
  summary: 'Turn one clear goal into a simple four-week plan with small daily actions you can actually keep up.',
  tags: ['all'],
  featured: true, collection: 'Month 1 — Getting Visible', collectionOrder: 3,
  reviewMonths: 12,
  learn: `Most small business owners don’t struggle because they lack ideas. They struggle because there are too many ideas and not enough time — so everything gets started and very little gets finished.

A 30-day action plan fixes that by doing three things:

- It makes you choose **one main goal** for the month.
- It breaks that goal into **four weekly focuses**.
- It turns each week into **small actions** that fit around work, family and life.

Thirty days is long enough to see some progress and short enough to stay focused. At the end, you review what happened and plan the next 30 days with better information.

## Step 1: Choose one main goal

Pick the one result that would make the biggest difference to your business this month. Make it specific and something you can check at the end.

- Too vague: “Grow my business”
- Better: “Get 10 new enquiries through Instagram and WhatsApp”
- Too vague: “Be more consistent”
- Better: “Post 3 times a week for 4 weeks”

Choose a goal mostly within your control. You can’t control exactly how many people buy, but you can control how many times you post, follow up, or ask for reviews. A good plan usually mixes one **result goal** (e.g. enquiries) with the **actions** most likely to lead to it.

## Step 2: Write down why it matters

One sentence is enough: “More enquiries means I can stop relying on word of mouth during quiet months.” When the month gets busy, this reminds you why the plan is worth sticking to.

## Step 3: Give each week a focus

Split the work so each week builds on the last. For example, if your goal is more enquiries:

- **Week 1 — Get ready:** update your bio, link and prices; prepare photos.
- **Week 2 — Get seen:** post consistently; share in Stories and WhatsApp Status.
- **Week 3 — Get conversations:** reply quickly, follow up old enquiries, make a clear offer.
- **Week 4 — Get proof:** ask happy customers for reviews; share them; review your numbers.

## Step 4: Plan small daily actions

Decide how much time you can honestly give each day — even 15 minutes counts. Then list actions that fit in that time: reply to messages, post one Story, follow up one past customer, take product photos for the week.

If you plan more than you can do, you’ll feel behind by day three. It’s better to plan less and finish it.

## Step 5: Decide how you’ll measure it

Choose one or two numbers to track each week — for example enquiries, bookings, sales or posts. The Track tab in Studio lets you record these in a minute a day.

## Step 6: Review weekly

Once a week, ask yourself:

- What did I get done?
- What got in the way?
- What worked best?
- What will I change next week?

> A plan is a guide, not a test. If life gets in the way for a few days, don’t restart — just pick up from today.`,
  seeTitle: 'Fictional example: a small-chops caterer in London',
  see: `**Goal:** “Get 8 party-tray bookings for November.”

**Why:** “November is busy with birthdays and early Christmas parties — I want my diary filled before December.”

**Week 1 — Get ready:** update the price list, take new photos of party trays, pin a “How to order” post.
**Week 2 — Get seen:** post a tray Reel, a customer thank-you and a “What’s in each tray” carousel; share all three on WhatsApp Status.
**Week 3 — Get conversations:** message last year’s customers to let them know November dates are open; reply to every enquiry the same day.
**Week 4 — Get proof:** ask the first November customers for a review and share it.

**Daily time:** 20 minutes after the school run.
**Tracking:** enquiries and bookings, recorded in Studio.

At the end of the month she reviews which posts brought the most messages and keeps those for December.`,
  do: `Fill in the 30-Day Action Plan worksheet below. Your answers are saved to your account so you can come back to them.

Then set your first weekly goal on the **Today** screen so Studio can remind you each day.`,
  use: [
    { type: 'worksheet', title: '30-Day Action Plan', fields: [
      { label: 'My main goal for the next 30 days', hint: 'Specific and checkable, e.g. “Get 10 new enquiries”' },
      { label: 'Why this goal matters to my business', hint: 'One sentence' },
      { label: 'Week 1 focus and actions', long: true },
      { label: 'Week 2 focus and actions', long: true },
      { label: 'Week 3 focus and actions', long: true },
      { label: 'Week 4 focus and actions', long: true },
      { label: 'Time I can give each day', hint: 'e.g. 15 minutes after work' },
      { label: 'The numbers I’ll track', hint: 'e.g. enquiries, bookings, sales' },
      { label: 'What could get in the way, and what I’ll do about it', long: true },
    ] },
    { type: 'checklist', title: 'Weekly review (use every week)', items: [
      'I looked at what I planned and what I actually did',
      'I recorded my numbers in Track',
      'I noted what worked best this week',
      'I noted what got in the way',
      'I set my focus for next week',
    ] },
  ],
  studio: { label: 'Set this week’s goal', screen: 'goal' },
  sources: [],
};

FULL[idFor('m04', 'Following Up Without Being Pushy')] = {
  summary: 'Many sales are lost simply because nobody followed up. Learn when and how to follow up politely — with ready-to-use messages.',
  tags: ['all', 'services', 'events', 'food', 'beauty', 'fashion', 'photo'],
  reviewMonths: 12,
  learn: `Someone asks for your prices, you reply, and then… nothing. It’s easy to assume they weren’t interested. Often, that isn’t true. They got busy, they were waiting for payday, they wanted to check with someone, or they simply forgot.

A short, friendly follow-up reminds them you’re there and makes it easy to say yes. Done well, it feels like good customer service, not pressure.

## Why people go quiet

- They’re comparing options and haven’t decided.
- They’re waiting for money, a date to be confirmed, or someone else’s opinion.
- They have a question they haven’t asked.
- Your reply arrived when they were busy and it got buried.
- They decided against it but didn’t want to say so.

Only the last group is a real “no” — and a polite follow-up lets them tell you, so you can stop wondering.

## What makes a follow-up feel helpful, not pushy

- **It adds something.** A useful detail, an answer to a likely question, available dates, or a photo of similar work.
- **It’s short.** One or two sentences is plenty on WhatsApp or Instagram.
- **It’s easy to answer.** End with a simple question: “Would you like me to hold Saturday for you?”
- **It gives them an easy way out.** “No worries if plans have changed.” This lowers the pressure and often gets a reply either way.
- **It’s honest.** Only mention limited slots or a deadline if it’s true. False urgency damages trust.

## A simple follow-up rhythm

There’s no perfect rule, but this works for many small businesses:

1. **First follow-up:** 1–2 days after you sent your prices or quote.
2. **Second follow-up:** about a week later, with something new (a date reminder, a photo, an answer to a common question).
3. **Then stop**, unless they reply. Make a note to contact them again only if there is a genuine reason — a new menu, new dates, a seasonal offer.

For time-sensitive things like events, adjust: if their party is in 10 days, follow up sooner.

## Keep track so nobody slips through

You don’t need special software. A note on your phone, a WhatsApp label (if you use WhatsApp Business), or a simple list with name, date of enquiry, what they asked about, and the date to follow up is enough. Many people find that a quick check every morning stops enquiries going cold.\n\nIn Studio, tap **+ Log enquiry** on Today or in **Track \u2192 Follow-ups**. Studio reminds you when each follow-up is due (after 2 days, then 7 days \u2014 you can change this) and writes the WhatsApp message for you to check and send.

## Respect people’s choices

If someone says no, thank them and leave the door open: “Thank you for letting me know — feel free to message any time.” If they ask you not to contact them, don’t. Only send marketing messages to people who have agreed to receive them — replying to someone who contacted you about a specific enquiry is different from adding them to a promotional broadcast.

> The goal of a follow-up isn’t to chase a sale. It’s to make sure a customer who wants to buy from you doesn’t get lost.`,
  seeTitle: 'Fictional example: an event decorator in Leeds',
  see: `Kemi sends a quote for a 40th birthday backdrop on Tuesday. No reply.

**Thursday:**
“Hi Bisi, just checking you received the quote for the 40th 😊 I’ve attached a photo of a gold-and-white setup I did last month in case it helps you picture it. Happy to adjust anything to suit your budget.”

**The following Wednesday:**
“Hi Bisi, I’m confirming bookings for the 14th this week. Would you like me to pencil you in? No worries at all if plans have changed.”

Bisi replies that she’s waiting for the venue to confirm, and books two days later. Without the follow-up, Kemi would have assumed she’d lost the job.`,
  do: `Scroll back through your WhatsApp, Instagram DMs and other messages from the last 30 days.

Find **three people** who asked about prices or availability but didn’t book. Send each one a short, friendly follow-up using a template below (change it to sound like you). Note who replies.`,
  use: [
    { type: 'template', title: 'Follow-up 1 — after sending prices or a quote', text: `Hi [name], just checking you received the [prices/quote] for [what they asked about] 😊 Happy to answer any questions or adjust anything to suit you.` },
    { type: 'template', title: 'Follow-up 2 — about a week later, with something new', text: `Hi [name], I thought this might help: [photo / answer to a common question / available dates]. Would you like me to [hold the date / reserve your order]? No worries at all if plans have changed.` },
    { type: 'template', title: 'When they say no', text: `Thank you for letting me know, [name] — I really appreciate it. Feel free to message any time if you need [what you offer] in future.` },
    { type: 'template', title: 'Following up a past customer (with a genuine reason)', text: `Hi [name], hope you’re well! You ordered [product/service] from us in [month]. Just letting you know [new menu / new dates / seasonal offer]. Would you like me to send details?` },
    { type: 'checklist', title: 'Follow-up checklist', items: [
      'I keep a simple list of enquiries with a follow-up date',
      'My follow-ups are short and add something useful',
      'Each follow-up ends with one easy question',
      'I give people an easy way to say no',
      'I only mention deadlines or limited slots when they’re true',
      'I stop after two follow-ups unless there’s a new reason',
    ] },
  ],
  studio: { label: 'Open my follow-ups', screen: 'followups' },
  seedRev: 3,
  sources: [
    { title: 'ICO — Guide to PECR: electronic and telephone marketing', url: 'https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/' },
  ],
  disclaimer: 'General business guidance, not legal advice. For marketing rules, see the ICO guidance.',
};

// Launch content written in resources-content/ (matched by module + title).
const C1 = require('./resources-content/m01'), C2 = require('./resources-content/m02'), C4 = require('./resources-content/m04'), C36 = require('./resources-content/m03m06');
const C9 = require('./resources-content/m09'), TOOLS = require('./resources-content/tools');
for (const [mod, set] of [['m01', C1], ['m02', C2], ['m04', C4], ['m03', C36.m03], ['m06', C36.m06]]) {
  for (const [title, body] of Object.entries(set)) FULL[idFor(mod, title)] = body;
}
// Business Mindset: the first lesson keeps its original id (it used to be in module 06).
for (const [title, body] of Object.entries(C9)) FULL[idFor(title === 'Business Mindset: Ownership & Consistency' ? 'm06' : 'm09', title)] = body;

// "Studio" → "Business Studio" in all lesson text (seed update 8).
const STUD = /(?<!Business )(?<![\w-])Studio(?![\w-])/g;
function bs(v) {
  if (typeof v === 'string') return v.replace(STUD, 'Business Studio');
  if (Array.isArray(v)) return v.map(bs);
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = k === 'tool' || k === 'id' || k === 'module' ? x : bs(x); return o; }
  return v;
}

function lessons() {
  const out = [];
  for (const [mod, titles] of Object.entries(OUTLINE)) {
    titles.forEach((title, i) => {
      const id = idFor(mod, title);
      const full = FULL[id];
      const base = { id, module: mod, order: i + 1, title, summary: '', status: 'planned', tags: ['all'], use: [], seedRev: 1, reviewedAt: '', reviewMonths: 12, learn: '', see: '', do: '' };
      const words = full ? [full.learn, full.see, full.do].join(' ').split(/\s+/).length : 0;
      out.push(full ? bs({ ...base, ...full, readMins: full.readMins || Math.max(1, Math.round(words / 200)), status: full.status || 'published', publishAt: full.status === 'planned' ? '' : (full.publishAt || REVIEWED), reviewedAt: full.reviewedAt || REVIEWED, seedRev: (full.seedRev || 2) + 1 }) : base);
    });
  }
  // Templates & Tools only: calculators and Business Studio shortcuts (tools, not lessons — published).
  TOOLS.forEach((t, i) => out.push(bs({ order: 90 + i, status: 'published', publishAt: REVIEWED, reviewedAt: REVIEWED, reviewMonths: 12, tags: ['all'], learn: '', see: '', do: '', readMins: 0, ...t })));
  return out;
}

module.exports = { VERSION, lessons, idFor };
