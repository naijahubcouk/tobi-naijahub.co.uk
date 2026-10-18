'use strict';
// Module — Business Mindset (open to every plan, including Free). Written lessons start as
// "planned" so they wait for approval in Admin → Resources before members see them.
// Formatting: ## Heading, - bullet, 1. numbered, **bold**, > Tip box, [link](https://…)
module.exports = {
  // Existing title (id stays m06-business-mindset-ownership-and-consistency; moved to this module).
  'Business Mindset: Ownership & Consistency': {
    status: 'planned', seedRev: 1,
    summary: 'Treat your business like a business — own the decisions, keep small promises to yourself and build habits you can keep up.',
    tags: ['all'], reviewMonths: 24,
    learn: `Many small business owners are brilliant at what they make or do, but run the business side in bursts — busy one week, quiet the next, then busy again. That stop-start pattern is normal, but it makes it hard to grow, because customers, Instagram and word of mouth all reward **steady** effort.

This lesson is about two habits that make the biggest difference: **ownership** and **consistency**.

## Ownership: you are the one who decides

Ownership means accepting that the business moves when you move it. Nobody else will set your prices, follow up your enquiries or post your work. That can feel heavy — but it's also freeing, because it means you can change things.

Ownership looks like:

- **Deciding instead of waiting.** “I'll raise my prices when I feel ready” becomes “I'll review my prices on the 1st of next month.”
- **Looking at what happened, not who to blame.** If a weekend was quiet, ask “what did I do to get enquiries this week?” rather than “the algorithm hates me”.
- **Keeping simple records.** You can't improve what you can't see. Even a few numbers a week — enquiries, bookings, sales — tell you more than a feeling.

Ownership is **not** doing everything alone or never resting. It's being the person who makes the decisions, including the decision to pause.

## Consistency: small and steady beats big and rare

Consistency isn't posting every day or working every evening. It's doing a **realistic amount, regularly** — so customers keep seeing you and you keep learning what works.

A useful test: *could I keep this up in a busy month?* If the answer is no, the plan is too big. Three posts a week you actually do beat seven you abandon after ten days.

Ways to make consistency easier:

1. **Pick a small number.** One follow-up session a week, three posts, one hour of admin.
2. **Give it a time.** “Tuesday after the school run” works better than “sometime this week”.
3. **Make it easy to start.** Keep ideas in your Plan, replies saved as templates and tasks in your to-do list.
4. **Track it, don't judge it.** Tick it off. If you miss a week, restart — don't wait for a “fresh” month.

> Motivation comes and goes. A simple routine keeps going when motivation doesn't.

## When it feels slow

Results in small business are often delayed. A post today might bring an enquiry next month; a happy customer might refer someone next year. If you only judge your effort by this week's sales, it's easy to give up just before it starts working. Look at **trends over a few months**, not single days.`,
    seeTitle: 'Fictional example: a hair braider in Manchester',
    see: `Amaka was busy every December and almost empty every February. She posted a lot when she was quiet, then disappeared when she was busy — so each quiet season started from scratch.

She decided on a routine she could keep even in December:

- **Monday:** 20 minutes to plan three posts for the week in her Plan.
- **Wednesday:** follow up anyone who asked about prices but didn't book.
- **Sunday:** record the week's enquiries and bookings.

After three months she could see that most bookings came two to three weeks after a post showing finished styles — so she stopped panicking when a post got few likes on the day. The next February was still quieter, but she had regular customers booking ahead.`,
    do: `Write down **one small business habit** you will keep for the next four weeks — something you could still do in your busiest week. Give it a day and a time, and add it to your to-do list as a repeating task.`,
    studio: { label: 'Open my to-do list', screen: 'todo' },
    use: [
      { type: 'worksheet', title: 'My weekly business routine', group: 'planning', fields: [
        { label: 'The habit I will keep for 4 weeks', hint: 'e.g. follow up enquiries every Wednesday' },
        { label: 'Day and time', hint: 'e.g. Wednesday, 10am' },
        { label: 'How I will remind myself', hint: 'e.g. a repeating task in my to-do list' },
        { label: 'What I will do if I miss a week', hint: 'e.g. do it the next day — no starting over' },
      ] },
      { type: 'checklist', title: 'Ownership check (once a month)', group: 'planning', items: [
        'I know my enquiries, bookings and sales for the month',
        'I know which posts or messages brought enquiries',
        'I have reviewed my prices in the last 6 months',
        'I followed up everyone who asked but didn’t book',
        'I chose one thing to improve next month',
      ] },
    ],
    disclaimer: 'General business guidance. Examples are fictional.',
  },

  'Focus: Doing Fewer Things Well': {
    status: 'planned', seedRev: 1,
    summary: 'You can’t do every idea at once. Choose the few things that bring customers, and let the rest wait.',
    tags: ['all'], reviewMonths: 24,
    learn: `Small business owners rarely run out of ideas. A new product, a TikTok account, a website, a collaboration, a market stall, a course… Each one can be a good idea. Doing them all at once usually means none of them gets done properly.

Focus is choosing **a few priorities** for a period of time and saying “not now” to the rest.

## Why focus matters for a small business

- **Your time is limited.** Many owners run their business around work, family and other commitments.
- **Half-finished projects don't bring customers.** A finished price list brings more enquiries than three unfinished websites.
- **You learn faster.** When you change one thing at a time, you can see what made the difference.

## A simple way to choose

Write every idea down — getting them out of your head helps. Then, for each one, ask:

1. **Will this bring enquiries or sales in the next 90 days?**
2. **Can I do it with the time and money I have now?**
3. **Does it build on something already working?**

Pick **no more than three** that score best. Everything else goes on a “later” list. You're not saying no forever — you're saying not yet.

## Protect your priorities

- Put them where you'll see them: your weekly goal, your to-do list, the top of your Plan.
- When a new idea arrives, add it to the “later” list instead of starting it.
- Review the list once a month. Some ideas will still look great; others won't.

> Being busy isn't the same as making progress. Ask: did this week move my top three forward?

## Watch out for “shiny” tasks

Some tasks feel productive but rarely bring customers — redesigning a logo for the third time, trying every new app, or perfecting a post for hours. If a task doesn't connect to one of your priorities, it can probably wait.`,
    seeTitle: 'Fictional example: a small catering business in Leeds',
    see: `Tunde had nine ideas on the go: a website, a YouTube channel, frozen meal packs, a food truck, wedding catering, corporate lunches, a recipe book, TikTok and a loyalty card.

Using the three questions, he chose:

- **Corporate lunches** — he already had two office clients asking for more.
- **A clear price list** with a WhatsApp order link.
- **Following up past wedding enquiries** each week.

The website, YouTube and recipe book went on his “later” list. Three months on, corporate lunches had become a regular weekly order — and he had the time and confidence to start on the frozen meal packs properly.`,
    do: `List every business idea you're thinking about. Score each one with the three questions, choose **up to three priorities** for the next 90 days, and set one of them as this week's goal.`,
    studio: { label: 'Set this week’s goal', screen: 'goal' },
    use: [
      { type: 'worksheet', title: 'My 90-day priorities', group: 'planning', fields: [
        { label: 'All my ideas right now', hint: 'One per line', long: true },
        { label: 'Priority 1 (and why it brings customers)' },
        { label: 'Priority 2' },
        { label: 'Priority 3' },
        { label: 'My “later” list', long: true },
      ] },
    ],
    disclaimer: 'General business guidance. Examples are fictional.',
  },

  'Staying Consistent When Results Are Slow': {
    status: 'planned', seedRev: 1,
    summary: 'What to do when you’re posting and following up but sales aren’t moving yet — and how to tell if something needs changing.',
    tags: ['all'], reviewMonths: 24,
    learn: `Almost every business owner has weeks where they're doing “all the right things” and nothing seems to happen. It's one of the most common reasons people give up — often just before the work starts to pay off.

## Why results are often delayed

- **People rarely buy the first time they see you.** They might follow you, watch a few posts, ask a question, then book weeks later.
- **Trust builds slowly.** Reviews, repeat customers and recommendations take time to add up.
- **Seasons matter.** Many businesses have natural quiet months. Compare with the same time last year if you can, not just last week.

## Is it slow, or is something not working?

Being patient doesn't mean ignoring problems. Look at your numbers over **at least four to six weeks**:

- **People are seeing you but not asking** → your posts may not say clearly what you sell, the price range or how to order.
- **People are asking but not booking** → look at your replies, prices, follow-ups and how easy it is to pay or book.
- **People book once but don't come back** → look at the experience, a thank-you message and reminders.
- **Nobody is seeing you** → post more consistently, use clear photos and ask happy customers to share.

Change **one thing at a time** and give it a few weeks, so you can tell what helped.

## Keeping going on a slow week

1. **Do the smallest version.** One post instead of three; two follow-ups instead of ten.
2. **Look at your wins list.** Write down every kind message, repeat customer and good review. Read it on hard days.
3. **Talk to someone.** Another business owner, a friend or Auntie Tobi — a fresh view often spots the fix quickly.
4. **Rest when you need to.** Taking a planned break is different from giving up.

> Consistency is less about never stopping and more about always starting again.`,
    seeTitle: 'Fictional example: a candle maker in Bristol',
    see: `Ngozi posted three times a week for six weeks and only had a handful of orders. She nearly stopped.

When she looked at her numbers, she saw lots of profile visits and questions like “how much?” — but few orders. People **were** interested; the problem was what happened next. Her prices were only in DMs and she replied hours later.

She added a price list with an order link, saved a quick-reply message and followed up everyone who'd asked that month. Orders picked up over the next few weeks. The posting had been working all along — the next step just needed fixing.`,
    do: `Look at your last four to six weeks of enquiries, bookings and sales. Decide which of the four situations fits best, and choose **one change** to try for the next three weeks.`,
    studio: { label: 'Record my numbers in Track', screen: 'track' },
    use: [
      { type: 'worksheet', title: 'Slow results check', group: 'planning', fields: [
        { label: 'What I’ve been doing consistently', hint: 'e.g. 3 posts a week, follow-ups on Wednesdays' },
        { label: 'What my numbers show', hint: 'Enquiries, bookings, sales over the last 4–6 weeks' },
        { label: 'Where people seem to drop off', hint: 'Not seeing me / not asking / not booking / not coming back' },
        { label: 'The one change I’ll try for 3 weeks' },
      ] },
      { type: 'checklist', title: 'Slow-week minimum', group: 'planning', items: [
        'I posted at least once',
        'I followed up at least two people',
        'I replied to every message',
        'I recorded my numbers',
        'I added one win to my wins list',
      ] },
    ],
    disclaimer: 'General business guidance. Examples are fictional.',
  },
};
