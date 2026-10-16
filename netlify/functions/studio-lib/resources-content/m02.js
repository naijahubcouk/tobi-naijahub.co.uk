'use strict';
// Module 02 — Instagram for Business. Review every 6 months: Instagram changes often.
const IG = { title: 'Instagram Help Centre', url: 'https://help.instagram.com/' };
const IG_NOTE = 'Instagram changes its features, limits and menus from time to time. Check the current options in your own app.';
const TAGS = ['all', 'food', 'beauty', 'fashion', 'events', 'photo', 'retail', 'services'];

module.exports = {
  'Profile Photos, Highlights & Pinned Posts': {
    summary: 'Use your profile photo, Story Highlights and pinned posts to answer customers’ questions before they even message you.',
    tags: TAGS, reviewMonths: 6,
    learn: `When someone lands on your profile, they look at a few things in the first seconds: your profile photo, your name and bio, the row of Highlights, and the first posts on your grid. Together these act like a shop window. Get them right and visitors understand what you do and trust you more quickly.

## Your profile photo

Your profile photo appears tiny — next to every comment, in Stories, in search results and in DMs. It needs to be recognisable at that size.

- **Logo or face?** If your business is built around you (a hairstylist, a photographer, a coach), a clear, friendly photo of your face often builds trust faster. If you have a strong brand or products, a simple logo can work well.
- **Keep it simple.** Avoid busy backgrounds and small text. A logo with lots of words becomes unreadable.
- **Make it consistent.** Use the same photo or logo on WhatsApp Business, Facebook and your Auntie Tobi listing so people recognise you everywhere.

## Story Highlights

Stories usually disappear after 24 hours, but you can save them into **Highlights** on your profile. Think of Highlights as the menu on your shop window — the answers to the questions customers ask most.

Useful Highlights for most small businesses:

- **Prices / Menu** — or “Starting from” prices if you quote individually.
- **How to order / Book** — the steps, deposits, lead times and delivery areas.
- **Reviews** — screenshots of genuine customer feedback (with permission, and without personal details showing).
- **Work / Portfolio** — your best examples, grouped by type if helpful (Weddings, Birthdays, Braids, Wigs).
- **FAQs** — halal? delivery? allergens? turnaround time?
- **About** — who’s behind the business.

Keep the names short so they don’t get cut off, and use simple, matching covers. Most importantly, keep them up to date — an old price list in a Highlight causes awkward conversations.

## Pinned posts

You can pin posts to the top of your profile grid (at the time of writing, up to three). These are the first posts new visitors see, so choose them on purpose rather than leaving your three newest posts to chance.

A strong set of pinned posts:

1. **Who you are and what you do** — a welcome post or a short Reel introducing your business.
2. **How to order or book** — clear steps and the link or number to use.
3. **Proof** — your best result, a popular product, or a review.

Change your pins when you have something important to promote, like a seasonal menu or a booking deadline.

> Ask yourself: if someone only saw my profile photo, bio, Highlights and three pinned posts, would they know what I sell, trust me, and know how to buy?`,
    seeTitle: 'Fictional example: a small-chops and grills caterer in Croydon',
    see: `**Before:** a busy logo with the full business name in a script font, no Highlights, and the top of the grid showing three random food photos from last month.

**After:**
- **Profile photo:** a clean logo mark on a plain background.
- **Highlights:** Menu · How to order · Reviews · Events · FAQs.
- **Pinned posts:** (1) a 20-second Reel of a party tray being packed, with “Party trays for 10–100 guests” on screen; (2) a carousel explaining how to order, deposits and delivery areas; (3) a post of genuine customer feedback.

Fewer customers now ask “how much?” and “do you deliver?” — the answers are already on the profile.`,
    do: `Open your profile and decide on your **three pinned posts** and **four or five Highlights**. If you don’t have a “How to order” post, write one this week (Studio can help) and pin it.`,
    use: [
      { type: 'checklist', title: 'Profile shop-window checklist', items: [
        'My profile photo is clear and recognisable at a tiny size',
        'I use the same photo or logo on Instagram, WhatsApp and my listing',
        'I have a Highlight for prices or menu',
        'I have a Highlight for how to order or book',
        'I have a Highlight for genuine reviews',
        'My Highlight names are short and readable',
        'I’ve chosen my pinned posts on purpose',
        'One pinned post explains how to order or book',
        'Nothing in my Highlights or pins is out of date',
      ] },
      { type: 'template', title: '“How to order” post outline', text: `How to order from [business name] 👇

1️⃣ Message us on [WhatsApp/DM] with [what you need, date, number of guests/size]
2️⃣ We’ll send your quote within [time]
3️⃣ Secure your date with a [deposit amount/percentage] deposit
4️⃣ [Collection / delivery] on the day — we cover [areas]

⏰ Please book at least [lead time] in advance.` },
    ],
    studio: { label: 'Write a “How to order” post', tool: 'caption', input: { topic: 'How to order from us: the steps, lead time, deposit and delivery areas' } },
    sources: [IG], disclaimer: IG_NOTE,
  },

  'Understanding Reels, Stories & Carousels': {
    summary: 'What each Instagram format is best for, and how to use them together so you’re seen, trusted and remembered.',
    tags: TAGS, reviewMonths: 6,
    learn: `Instagram gives you several ways to share content. Each one does a different job. You don’t have to use all of them all the time, but knowing what each is good at helps you choose.

## Reels: to be discovered

Reels are short, vertical videos. Instagram regularly shows Reels to people who don’t follow you yet, which makes them one of the best formats for **reaching new people**.

Good for:
- Showing a process (braiding, baking, setting up a venue, a before-and-after).
- Quick tips your customers find useful.
- Behind-the-scenes and personality.

What helps a Reel:
- A clear **hook** in the first second or two — something on screen or said out loud that makes people stay.
- Showing rather than telling.
- Text on screen, because many people watch without sound.
- A simple next step at the end (“DM ‘TRAY’ for prices”).

## Stories: to stay close to people who already know you

Stories sit at the top of the app and normally disappear after 24 hours unless you save them to Highlights. They’re seen mostly by your followers, which makes them great for **building relationships and trust**.

Good for:
- Day-to-day updates: “Just finished this order”, “Two slots left for Saturday”.
- Polls, questions and quizzes that start conversations.
- Sharing customer feedback (with permission).
- Reminders about deadlines and offers.

Because Stories are casual, they don’t need to be perfect. Consistency matters more than polish.

## Carousels: to teach and explain

Carousels are posts with several photos or videos that people swipe through. People often save and share them, which makes them good for **useful, detailed content**.

Good for:
- Step-by-step guides (“How to choose your cake size”).
- Before-and-after and “5 looks from one fabric”.
- Price guides, menus and FAQs.
- Telling a story across several slides.

Make the first slide a strong headline so people want to swipe.

## Single photo posts

A single great photo still has a place, especially for a finished product, an announcement or a review. Many businesses use fewer single photos now and more Reels and carousels.

## Putting them together

A simple weekly mix for many small businesses:

- **1–2 Reels** to reach new people.
- **1 carousel** to teach or explain.
- **Stories most days** to stay in touch and drive enquiries.

Adjust based on what you see in your Insights and, most importantly, which content leads to **messages and orders**, not just likes.

> You don’t need to be on camera to make Reels. Hands, products, the process and text on screen work very well.`,
    seeTitle: 'Fictional example: a hair braider in Bristol',
    see: `Bukola’s weekly mix:

- **Reel (Tuesday):** a 15-second time-lapse of knotless braids with the on-screen hook “6 hours in 15 seconds ⏱️”.
- **Carousel (Thursday):** “How to make your braids last longer” — 5 slides of aftercare tips, with her booking details on the last slide.
- **Stories (most days):** the day’s finished styles, a poll (“Bob or long?”), and “2 slots left this Saturday — DM to book”.

The Reels bring in new followers, the carousel gets saved and shared, and most of her bookings arrive as replies to her Stories.`,
    do: `Look at your last 10 posts. How many were Reels, carousels and single photos? This week, plan **one of each format you’re not using enough**, plus Stories on at least three days.`,
    use: [
      { type: 'template', title: 'Weekly content mix planner', text: `Reel (to reach new people): [idea] — hook: [first line on screen]
Carousel (to teach or explain): [topic] — first slide headline: [headline]
Stories (to stay in touch): [day] [update] · [day] [poll/question] · [day] [reminder or offer]
Next step I’ll ask people to take: [DM / WhatsApp / book / visit link]` },
      { type: 'checklist', title: 'Before you post a Reel', items: [
        'The first 1–2 seconds give people a reason to keep watching',
        'There’s text on screen for people watching without sound',
        'It shows, rather than just tells',
        'It ends with one clear next step',
        'The caption explains what it is and how to order or book',
      ] },
    ],
    studio: { label: 'Write a Reel script', tool: 'reel', input: {} },
    sources: [IG], disclaimer: IG_NOTE,
  },

  'How to Attract the Right Followers': {
    summary: 'More followers isn’t the goal — the right followers are. How to reach local people who might actually buy from you.',
    tags: TAGS, reviewMonths: 6,
    learn: `A big follower count looks nice, but it doesn’t pay the bills. A caterer with 800 local followers who order regularly is doing better than one with 20,000 followers who live on the other side of the world. The aim is to attract people who **could become customers** — or who would recommend you to someone who could.

## Who are the “right” followers?

Usually some mix of:

- People in your area or delivery zone (or across the UK if you post nationwide).
- People who match your ideal customer (see the Start Here lesson).
- People who influence your customers — event planners, venues, community pages, other complementary businesses.

## Make content for them, not for everyone

The simplest way to attract the right people is to post things they care about:

- **Answer their questions:** “How much food do I need for 50 guests?”, “How long do knotless braids last?”
- **Show your work in their world:** real events, real local places, real customers (with permission).
- **Use their language:** “owambe”, “naming ceremony”, “Aso-ebi”, “party jollof” — if that’s how your customers talk.
- **Mention your area:** in captions, on-screen text and your bio. “Delivering across Leeds and Bradford.”

## Help Instagram understand who you’re for

Instagram uses many signals to decide who sees your content. You can’t control them all, but you can make your topic and location clear:

- Describe what you do and where in your **name field** and **bio**.
- Write captions that clearly say what the post is about, rather than only emojis.
- Use a small number of relevant hashtags that describe the post and place (for example, the type of product and your city), rather than long lists of popular tags.
- Add a location to posts when it makes sense.

## Show up where your customers already are

Followers often come from outside Instagram:

- Your **Auntie Tobi listing** and features.
- **WhatsApp Status** and community groups (where you’re allowed to share).
- Your **packaging, receipts and business cards** — add your @username.
- **Collaborations** with complementary businesses — for example a cake maker and a balloon decorator sharing each other’s work. Instagram also has a collaboration post feature that lets two accounts share one post; check what’s available in your app.

## Engage like a local business, not a robot

Spend a few minutes a day:

- replying to every comment and message,
- commenting genuinely on posts from local businesses, venues and community pages,
- responding to Stories of customers who tag you.

## What to avoid

- **Buying followers or using follow-for-follow schemes.** These fill your account with people who will never buy, can make your content perform worse, and may break Instagram’s rules.
- **Chasing trends that have nothing to do with your business.** A viral video that attracts the wrong audience doesn’t help you.

> Measure success by enquiries and orders from new people, not just by follower numbers.`,
    seeTitle: 'Fictional example: an Aso-ebi and fabric seller in Birmingham',
    see: `Kemi had 6,000 followers, mostly from follow-for-follow, but very few orders.

She changes approach:
- Her bio now says “Aso-ebi fabric & bundles for UK celebrations · Birmingham · UK delivery”.
- She posts Reels showing fabric in daylight with on-screen text like “Gele + wrapper bundle for 20 guests”.
- She collaborates with two local tailors who share her fabric posts with their own clients.
- She stops using 30 generic hashtags and uses a few that describe the fabric and occasion.

Her follower count grows more slowly, but more of the new followers message her to ask about orders.`,
    do: `Make a list of **five local or complementary businesses** whose customers are similar to yours. Follow them, engage genuinely with their posts this week, and note one you could suggest a collaboration with.`,
    use: [
      { type: 'worksheet', title: 'Right-followers plan', fields: [
        { label: 'Who are the “right” followers for my business?', long: true },
        { label: 'Three questions they often ask that I could answer in posts', long: true },
        { label: 'Five complementary businesses or pages my customers follow', long: true },
        { label: 'One collaboration idea', hint: 'e.g. joint giveaway, shared before-and-after, recommending each other' },
        { label: 'Places outside Instagram where I’ll share my @username' },
      ] },
    ],
    studio: { label: 'Get 6 content ideas for my customers', tool: 'ideas', input: {} },
    sources: [IG, { title: 'Instagram Community Guidelines', url: 'https://help.instagram.com/477434105621119' }], disclaimer: IG_NOTE,
  },

  'Turning Profile Visitors Into Enquiries': {
    summary: 'People visit your profile and leave without messaging. Here’s how to make the next step obvious and easy.',
    tags: TAGS, reviewMonths: 6,
    learn: `Lots of people may look at your profile each week. Only some will message you. The gap between “visited” and “enquired” is often not about price or quality — it’s about **clarity and ease**. If someone isn’t sure how to order, or it feels like effort, many will simply move on.

## Make the next step obvious

Every part of your profile should point towards one clear action:

- **Bio:** ends with one instruction — “Book on WhatsApp ⬇️” or “DM ‘CAKE’ for prices”.
- **Link:** goes straight to that action (your WhatsApp chat, booking page or price list), not just a homepage.
- **Pinned “How to order” post:** explains the steps.
- **Captions:** end with a specific call to action, not “DM for more” on every post.

Pick **one main route** (for example WhatsApp). Too many options can make people hesitate.

## Answer the questions that stop people messaging

People often don’t message because they’re worried about something:

- **“It’s probably too expensive.”** Show “starting from” prices or a price range, even if you quote individually.
- **“Do they cover my area?”** Say where you work or deliver.
- **“Are they available?”** Share availability in Stories: “December dates now open.”
- **“Are they legit?”** Show genuine reviews, real work, and your Auntie Tobi listing or verified badge if you have one.
- **“Will it be awkward?”** Make the first message easy with a keyword or a ready-made message link.

## Make the first message effortless

- **Keyword prompts:** “Comment or DM ‘MENU’ and we’ll send our price list.” A one-word message is easy to send.
- **WhatsApp link with pre-filled text:** a link like wa.me/44XXXXXXXXXX?text=Hi%20I%27d%20like%20a%20quote opens a chat with a message already written. Your Studio profile can hold your WhatsApp number for these links.
- **Quick replies:** prepare answers to common questions so you can respond fast. (WhatsApp Business and Instagram both have saved-reply style features; check your app.)

## Reply quickly

Speed matters. Someone asking three vendors for a quote often goes with whoever replies first and clearly. If you can’t reply properly straight away, a short holding message helps: “Thanks for your message! I’ll send your quote by this evening.”

## Measure it

In **Track**, record enquiries each day. After a few weeks, compare weeks where you posted clear calls to action and Stories with weeks where you didn’t. This shows you what actually brings messages for your business.

> A confused visitor does nothing. A clear, confident profile gives people permission to message you.`,
    seeTitle: 'Fictional example: a lash technician in Nottingham',
    see: `Ronke’s profile gets plenty of visits from her Reels, but few bookings. Her bio says “DM for bookings”, her link goes to a long beauty blog, and her prices are only shared privately.

She changes three things:
1. Her bio ends with “Book on WhatsApp ⬇️” and the link opens WhatsApp with “Hi Ronke, I’d like to book lashes” already typed.
2. She adds a Highlight called “Prices” with starting-from prices for each set.
3. Her Stories say “3 slots left this week” with a link sticker.

Visitors no longer have to work out how to book or worry about the price before asking.`,
    do: `Pretend you’re a new customer. Starting from one of your Reels, try to place an order. Count the taps and note anything confusing. Fix the biggest obstacle this week.`,
    use: [
      { type: 'checklist', title: 'Visitor-to-enquiry checklist', items: [
        'My bio ends with one clear instruction',
        'My link goes straight to ordering, booking or my price list',
        'I show starting-from prices or a price range',
        'My area or delivery zone is clear',
        'I show genuine reviews or real work',
        'I have a pinned “How to order” post',
        'Messaging me takes one tap (keyword or pre-filled link)',
        'I reply to enquiries the same day',
      ] },
      { type: 'template', title: 'Holding reply (when you can’t answer fully yet)', text: `Thank you for your message, [name]! 😊 I’ll send you [the prices / your quote / available dates] by [time]. If you can let me know [date / number of guests / size] that will help me get it right.` },
    ],
    studio: { label: 'Write a reply to an enquiry', tool: 'message', input: { situation: 'reply to an enquiry' } },
    sources: [IG, { title: 'WhatsApp Help Center — how to use click to chat', url: 'https://faq.whatsapp.com/' }], disclaimer: IG_NOTE,
  },

  'Understanding Instagram Insights': {
    summary: 'Which numbers in Instagram Insights matter for a small business, and how to use them to decide what to post next.',
    tags: TAGS, reviewMonths: 6,
    learn: `Instagram Insights shows you how your account and content are performing. It’s available on professional (business or creator) accounts. You don’t need to understand every number — a few, checked regularly, will tell you what’s working.

## The main numbers (as of our last review)

Instagram renames and changes its metrics from time to time. At the time of writing, the main ones include:

- **Views** — how many times your content was shown or played. In 2025 Instagram made Views the main measure across Reels, posts and Stories. It counts repeat views, so it’s usually higher than the number of people.
- **Reach / accounts reached** — roughly how many different accounts saw your content.
- **Interactions** — likes, comments, shares, saves and replies.
- **Followers vs non-followers** — how much of your audience is new.
- **Profile activity** — such as profile visits and taps on your links or contact buttons.

Exact names, and where you find them, can change. Look for the Insights or professional dashboard on your profile.

## Which numbers matter most for a business?

For most small businesses, the most useful signals are the ones closest to buying:

1. **Shares and saves** — people found it useful enough to keep or send to someone.
2. **Profile visits and link or contact taps** — people wanted to know more or take action.
3. **Non-follower views** — your content is reaching new people.
4. **Comments and replies** — conversations, which often lead to enquiries.

Likes are nice, but they’re the weakest signal.

## The number Instagram can’t show you

The most important number — **enquiries and orders** — isn’t in Insights. Record it yourself in Studio’s **Track** tab, and when someone messages you, ask how they found you. Then you can connect the dots: “The party-tray Reel got 4,000 views, 30 shares and 6 enquiries.”

## A simple monthly review (15 minutes)

1. Find your **top 3 posts** by shares, saves or profile visits — not just views.
2. Ask: what do they have in common? The format? The topic? The hook? The time of year?
3. Find your **weakest 3**. What’s different about them?
4. Compare with your enquiries in Track for the same weeks.
5. Decide **one thing to do more** of and **one thing to stop** next month.

## Don’t over-read small numbers

If you have a small account, a single post’s numbers can jump around a lot. Look for patterns over several weeks rather than reacting to one post.

> Insights tells you what people watched. Your enquiries tell you what made them buy. You need both.`,
    seeTitle: 'Fictional example: a cake maker in Reading',
    see: `Ade looks at her last month:

- Her most-viewed post was a trending-audio Reel — lots of views, but almost no profile visits and no enquiries.
- Her most-**shared** post was a carousel: “How many slices do you need? A cake size guide.” It led to 12 profile visits from non-followers and 3 enquiries she recorded in Track.
- Her Stories with “2 slots left this weekend” got several replies that became orders.

**Her decision for next month:** one useful carousel a week, keep the weekend-slots Stories, and only use trending audio when it suits a real cake video.`,
    do: `Open your Insights and find your top three posts from the last 30 days by **shares or saves**. Write down what they have in common in the worksheet below, then plan one similar post this week.`,
    use: [
      { type: 'worksheet', title: 'Monthly Insights review', fields: [
        { label: 'My top 3 posts this month (by shares, saves or profile visits)', long: true },
        { label: 'What they have in common (format, topic, hook, timing)', long: true },
        { label: 'My weakest 3 posts and what was different', long: true },
        { label: 'Enquiries and orders this month (from Track)' },
        { label: 'One thing I’ll do more of next month' },
        { label: 'One thing I’ll stop or change' },
      ] },
    ],
    studio: { label: 'Record this week’s numbers', screen: 'track' },
    sources: [IG, { title: 'SocialPilot — Instagram metrics changes from impressions and plays to views (April 2025)', url: 'https://socialpilot.co/instagram-marketing/instagram-views-metrics-changes' }], disclaimer: IG_NOTE,
  },
};
