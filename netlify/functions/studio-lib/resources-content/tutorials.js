'use strict';
// Business Studio Tutorials — step-by-step guides to using the app. Free for every plan.
// They start as "planned" so they wait for approval in Admin → Resources before members see them.
// Formatting: ## Heading, - bullet, 1. numbered, **bold**, > Tip box
const T = (o) => ({ status: 'planned', seedRev: 1, tags: ['all'], reviewMonths: 6, see: '', ...o });

module.exports = {
  'Getting Started: Your Today Screen': T({
    summary: 'What you see when you open Business Studio, and how to get around.',
    learn: `**Today** is your home screen. It shows what needs your attention, so you can open Business Studio for a few minutes and know exactly what to do.

## What’s on Today

- **Your numbers at a glance** — follow-ups due, tasks today, posts planned this week and new enquiries this week. Tap any of them to go straight there.
- **Your weekly goal** — the one thing you’re working on this week.
- **Today’s business tip** — a short, practical tip for your kind of business.
- **Business tools** — shortcuts to Customers, your to-do list, Create, your content calendar, the tracker, quotes and invoices, and Resources.

## Getting around

1. Use the **menu at the bottom** (on a computer, it’s on the left): Today, Customers, Create, Plan and Resources.
2. Tap the gold **+** at the top to add something from any screen — a task, an enquiry, a quote or invoice, today’s numbers or new content.
3. Tap the **speech bubble** to message Auntie Tobi.
4. Tap the **person icon** for your Account: your plan, business profile, brand kit, help and sign out.

> Tip: add Business Studio to your phone’s home screen so it opens like an app.`,
    do: `Open **Today**, tap each of the four numbers to see where they take you, then tap the gold **+** and look at what you can add.`,
    studio: { label: 'Go to Today', screen: 'home' },
  }),

  'Your Business Profile & Auntie Tobi Listing': T({
    summary: 'Set up your business details so every AI tool writes for your business — and link your Auntie Tobi listing.',
    learn: `Your business profile is what Business Studio uses to write captions, replies and plans that sound like **your** business. The more accurate it is, the better everything else works.

## Edit your profile

1. Tap the **person icon** at the top to open **Account**.
2. Under **Business profile**, tap **Edit business profile**.
3. Check your business name, what you sell, where you’re based, your tone of voice and where customers find you (Instagram, WhatsApp, TikTok and so on).
4. Save. Everything you create from now on uses these details.

## Link your Auntie Tobi listing

If your business is listed on Auntie Tobi, link it to your account:

1. In your profile, **search for your business name**.
2. Choose your business and confirm **“Is this your business?”** only if it really is yours.
3. Each business can only be linked to one account.

If you can’t find your business, or you’ve picked the wrong one, message Auntie Tobi and we’ll help.

## Your brand kit

In **Account → Brand kit**, add your brand colours, font and logo. They’re used on branded post images, quotes, invoices and your price list page.`,
    do: `Open your business profile and check every field is up to date. If you’re on Auntie Tobi, make sure your listing is linked.`,
    studio: { label: 'Open my business profile', screen: 'profile' },
  }),

  'Customers: Logging Enquiries & Follow-Ups': T({
    summary: 'Keep track of everyone who asks about your business — and get reminded who to follow up.',
    learn: `**Customers** is where you keep every enquiry, so nobody who asked about your business gets forgotten.

## Log an enquiry

1. Tap **Customers** in the bottom menu, then **+ Log enquiry** (or tap the gold **+** and choose **An enquiry**).
2. Add their name, their WhatsApp or phone number if you have it, and what they asked about.
3. Save. Business Studio sets a follow-up date for you.

## Move customers through the stages

Each customer has a stage: **New → Contacted → Quoted → Booked → Completed**. Tap a customer to update their stage as things move on. The boxes at the top show how many people are at each stage.

## Follow-ups

- **Due today** shows who to follow up now. Tap a customer to message them, then mark the follow-up as done.
- **Not now** is for people who said maybe later. **Lost** is for people who said no.
- You can change the default follow-up timings at the bottom of the Customers screen.

## From quotes & invoices

Customers you’ve sent a quote or invoice to appear under **From quotes & invoices**, so everything about them is in one place.

> Tip: log enquiries as soon as they come in — even a name and “asked about prices” is enough.`,
    do: `Log the last three people who asked about your business, even if it was a while ago. Set each one’s stage and see who’s due a follow-up.`,
    studio: { label: 'Open Customers', screen: 'customers' },
  }),

  'Plan: Your Content Board & Calendar': T({
    summary: 'Keep your post ideas, drafts and posting dates in one place — and let Auntie Tobi plan 7 or 30 days for you.',
    learn: `**Plan** is your content hub. Ideas, drafts, your calendar and what you’ve posted all live here.

## The board

The board has four columns:

- **Ideas** — anything you might post one day.
- **Drafting** — posts you’re working on.
- **Ready** — written and ready to go.
- **Scheduled** — posts with a date.

Tap **+ New card** to add a post. Give it a title, a type (post, Reel, Story or carousel), a caption and, if you know it, a date. Adding a date moves it to Scheduled.

## The calendar

Tap **Calendar** to see your posts by date. When you’ve posted something, open the card and mark it as **posted** — it moves to **Posted** and counts towards your weekly numbers.

## Plan with AI

1. Tap **✨ Plan 7 or 30 days with AI**.
2. Choose **Put them on my calendar** (each post gets a date, starting today) or **Add them to my Ideas** (no dates — you choose when to post each one).
3. Choose **7 days** (1 AI credit) or **30 days** (3 AI credits).

Each planned post has a format, an idea, a hook and a call to action. Open a card to write the caption.

> Tip: content you make in **Create** can be sent straight to your Plan with **Add to Plan**.`,
    do: `Add three ideas to your board — or use **Plan with AI** for the next 7 days — and give one of them a date this week.`,
    studio: { label: 'Open my Plan', screen: 'plan' },
  }),

  'Create: Using the AI Tools': T({
    summary: 'Write captions, Reel scripts, replies, offers and more — written for your business.',
    learn: `**Create** has AI tools that write for your business using your business profile.

## Make something

1. Tap **Create** in the bottom menu.
2. Find a tool — search, or tap a category like **Content Creation** or **Customer Communication**.
3. Fill in the short form. Only what’s marked is needed; everything else is optional.
4. Tap **Create**. Under the button you can see how many AI credits it uses.

## Use what you get

- **Tap the text to edit it** — make it sound like you.
- **Copy** it to paste into Instagram, WhatsApp or anywhere else.
- **Regenerate** to get a new version (this uses another AI credit).
- **Add to Plan** to keep it as a post idea or put it on your calendar.

## Saved & history

Everything you create is kept in **★ Saved & history** at the top of Create. Tap the star on anything you want to find again quickly.

> Tip: the more you tell the tool (an offer, a date, a price), the better the result.`,
    do: `Use **Post caption** to write a caption for something you’re selling this week. Edit it to sound like you, then copy it or add it to your Plan.`,
    studio: { label: 'Open Create', screen: 'create' },
  }),

  'AI Credits: Daily & Extra': T({
    summary: 'How AI credits work, when they reset and what to do if you run out.',
    learn: `Every time an AI tool gives you a result, it uses **AI credits**.

## Daily AI credits

- Your plan comes with **daily AI credits**: 5 a day on Free, 20 a day with the Business Club and 50 a day with Business Studio Plus.
- Most tools use **1 AI credit**. A 30-day content plan uses **3**.
- Editing, copying, saving and browsing are free.
- If something fails, you’re not charged.
- Daily credits reset at **midnight (UK time)**. Unused daily credits don’t carry over.

You can see how many you have left on **Create**, and under the **Create** button on every tool.

## Extra AI credits

If you need more on a busy day, you can buy **extra AI credits** on any plan:

- £5 for 300, £10 for 750 or £20 for 1,600.
- They’re a one-off payment — nothing renews.
- Your daily credits are used first, then your extra credits.
- Extra credits last 12 months.

Extra credits add AI uses only — the advanced tools and lessons come with the Business Club or Business Studio Plus.`,
    do: `Check how many daily AI credits you have left on **Create**, and plan your most important content for the start of the day.`,
    studio: { label: 'Open Create', screen: 'create' },
  }),

  'Your To-Do List & Weekly Goal': T({
    summary: 'Keep your business tasks in one list, and choose one goal to focus on each week.',
    learn: `## Your to-do list

1. On **Today**, tap **To-do list** in Business tools (or tap the gold **+** and choose **A task**).
2. Type the task, choose a date and tap **⭐ Priority** if it’s important.
3. On your to-do list, you can make a task **repeating** for things you do every week, like posting or following up.
4. Tick tasks off when they’re done.

Tasks you add from lessons, templates and the weekly marketing plan land here too.

## Your weekly goal

Choosing one goal for the week helps you focus on what matters most.

1. On **Today** or **Plan**, tap **Set goal**.
2. Pick one of the suggested goals — or write your own.
3. Each day, Today shows a tip to help you reach it.

> Tip: keep your goal small enough to finish this week, like “Follow up everyone who asked about prices”.`,
    do: `Set this week’s goal, then add three tasks to your to-do list that move it forward. Make one of them repeating.`,
    studio: { label: 'Open my to-do list', screen: 'todo' },
  }),

  'Quotes, Invoices & Receipts': T({
    summary: 'Send customer-ready quotes, invoices and receipts with your bank details — and keep track of who’s paid.',
    learn: `## Make a quote or invoice

1. On **Today**, tap **Quotes & invoices** in Business tools (or tap the gold **+** and choose **A quote or invoice**).
2. Choose **Quote**, **Invoice** or **Receipt**.
3. Add the customer, the items and prices, and any notes.
4. Check your bank details are filled in, then save.
5. Tap **Share link** to send it to your customer.

## Keep track

Each document shows its status: **Draft**, **Sent**, **Paid**, **Overdue** or **Cancelled**. Update it as things change.

- Tap **Turn into invoice** when a customer accepts a quote.
- Mark an invoice as **Paid** when the money arrives — it’s added to your tracker for you.

> Tip: add your logo and colours in **Account → Brand kit** so your documents look like your business.`,
    do: `Make a quote for a typical order or job, so you have one ready to copy next time someone asks.`,
    studio: { label: 'Open Quotes & invoices', screen: 'money' },
  }),

  'Track: Enquiries, Bookings & Sales': T({
    summary: 'Record your numbers in a few seconds and see what’s working.',
    learn: `**Track** shows how your business is doing — enquiries, bookings and sales — so you can see what’s working over time.

## Add today’s numbers

1. On **Today**, tap **Tracker** in Business tools (or tap the gold **+** and choose **Today’s numbers**).
2. Enter your enquiries, bookings and sales for the day.
3. Save. It takes less than a minute.

Paid invoices and completed customers are added for you, so you don’t enter them twice.

## Read your numbers

- Look at **weeks and months**, not single days — business goes up and down.
- If lots of people ask but few book, look at your replies, prices and follow-ups.
- If few people ask, focus on posting more consistently and being easier to find.

> Tip: pick one day a week to check your numbers, like Sunday evening.`,
    do: `Add your numbers for today (or this week). Set a repeating task to record them every week.`,
    studio: { label: 'Open Track', screen: 'track' },
  }),

  'Resources: Lessons, Templates & Tools': T({
    summary: 'Find step-by-step guides, practical lessons and ready-to-use templates.',
    learn: `**Resources** has three parts:

- **🎓 Tutorials** — step-by-step guides to using Business Studio, like this one. Free for everyone.
- **📚 Growth Lessons** — short, practical lessons on Instagram, content, sales, customer experience, planning and growth. With the Business Club and Business Studio Plus. The Business Mindset lessons are free for everyone.
- **🧰 Templates & Tools** — customer message scripts, planners, pricing calculators, worksheets and checklists. With the Business Club and Business Studio Plus, with some free starter resources on every plan.

## Using a lesson

1. Open a module and choose a lesson.
2. Read **Learn**, look at the **example**, then do the **action**.
3. Use the templates and checklists in the lesson — many have a button to add them to your to-do list, Plan or Customers.
4. Tap **Mark lesson as complete** when you’re done.

## Using Templates & Tools

Search or browse by business need. Tap **☆ Save** on anything you use often — it appears under **★ Saved**.`,
    do: `Open **Templates & Tools**, find one template you can use this week and save it.`,
    studio: { label: 'Open Templates & Tools', screen: 'library' },
  }),
};
