'use strict';
// Module 04 — Sales & Customer Experience.
const ALL = ['all', 'food', 'beauty', 'fashion', 'events', 'photo', 'retail', 'services'];
const M2 = { status: 'planned', featured: true, collection: 'Month 2 — Getting Customers' };
const M3 = { status: 'planned', featured: true, collection: 'Month 3 — Improving Sales' };

module.exports = {
  'Understanding Your Customer’s Buying Journey': {
    summary: 'The steps people go through before they buy from you — and what to do at each step so fewer drop out.',
    tags: ALL, reviewMonths: 12,
    learn: `Very few people see your business once and buy straight away. Most go through a few steps first. Understanding these steps helps you spot where you’re losing people — and what to do about it.

## The five steps

**1. Discover** — they come across you for the first time: a Reel, a repost, a friend’s recommendation, your Auntie Tobi listing, a Google search.

*Your job:* be visible in the places your customers spend time, with content that shows what you do.

**2. Consider** — they look closer. They visit your profile, scroll your posts, check your prices and reviews, maybe compare you with others.

*Your job:* make it easy to understand what you sell, who it’s for, roughly what it costs and why they can trust you.

**3. Enquire** — they get in touch to ask a question or request a quote.

*Your job:* make the first message easy, reply quickly and clearly, and ask the right questions.

**4. Buy** — they decide, pay a deposit or place the order.

*Your job:* make paying and confirming simple. Be clear about what happens next, when, and how much.

**5. Return and recommend** — after a good experience, they come back and tell others.

*Your job:* deliver what you promised, follow up, ask for a review, and stay in touch.

## Where do people drop out?

Most businesses lose people at one or two steps more than others. Common signs:

- **Lots of views, few profile visits:** your content isn’t making people curious about *you* — add clearer branding and calls to action.
- **Lots of profile visits, few enquiries:** your profile isn’t answering their questions or making the next step easy (see Module 02).
- **Lots of enquiries, few orders:** your replies, prices, follow-up or trust signals need work (see the lessons on enquiries and following up).
- **Few repeat customers:** the after-sale experience or staying in touch needs attention.

## Small fixes at each step

You don’t need to fix everything. Find your weakest step and make one improvement:

- *Discover:* post one Reel a week showing your work.
- *Consider:* add a “Starting from” price Highlight.
- *Enquire:* reply within a few hours, using templates so it’s quick.
- *Buy:* send a clear quote or invoice with payment details the same day.
- *Return:* send a thank-you message and a review request after every order.

> When sales are slow, the problem isn’t always “not enough followers”. It’s often one leaky step in the journey.`,
    seeTitle: 'Fictional example: a wedding decorator in Luton',
    see: `Tolu records her numbers in Track for a month: 40 profile visits a week, 12 enquiries, but only 1 booking.

The leak is clearly between **Enquire** and **Buy**. Reading back her messages, she notices she often replies to “How much for a backdrop?” with just a price — and then never hears back.

She changes her reply to ask about the date, venue and colours, sends two photos of similar setups with the quote, and follows up two days later. The next month, from a similar number of enquiries, she takes four bookings.`,
    do: `Using your last month of enquiries and sales (or your best estimate), fill in the worksheet below and identify your **weakest step**. Choose one fix to try this week.`,
    use: [
      { type: 'worksheet', title: 'My customer journey', fields: [
        { label: 'Discover: where do most new customers first find me?' },
        { label: 'Consider: what do they look at before enquiring?' },
        { label: 'Enquire: roughly how many enquiries do I get a week?' },
        { label: 'Buy: roughly how many become orders or bookings?' },
        { label: 'Return: how many customers come back or recommend me?' },
        { label: 'My weakest step, and why I think so', long: true },
        { label: 'One fix I’ll try this week' },
      ] },
    ],
    studio: { label: 'Record my numbers in Track', screen: 'track' },
    sources: [],
  },

  'How to Present Your Products or Services': {
    summary: 'Help people understand exactly what they get, why it’s worth it and how to buy — with clear photos, descriptions and prices.',
    tags: ALL, reviewMonths: 12,
    learn: `Two businesses can sell almost the same thing and get very different results, simply because one explains it better. How you present your products or services affects whether people understand them, trust them and feel they’re worth the price.

## Lead with the outcome, then the details

Customers buy what something does for them. Start with that, then give the facts.

- Instead of: “3-tier sponge cake, buttercream finish.”
- Try: “A show-stopping centrepiece for your 50th — 3 tiers, feeds around 80 guests, finished in your colours.”

## Answer the key questions every time

For each product or service, people want to know:

- **What is it?** In plain words.
- **What’s included?** Portion sizes, number of looks, hours of coverage, what’s extra.
- **Who is it for or what occasion?** Birthdays, weddings, corporate, everyday.
- **How much?** A price, a “from” price or a price range.
- **How long?** Lead time, turnaround, duration.
- **How do I get it?** Collection, delivery, home visits, areas covered.
- **How do I order?** The exact next step.

If customers keep asking the same question, add the answer to your descriptions.

## Show, don’t just tell

- Use clear, well-lit photos of the actual product or your real work (see the product photos lesson).
- Show scale: a cake next to a cake knife, a tray on a table set for guests.
- Show the experience: a happy client’s finished hair, the room fully decorated.
- For services, show the before and after, or the process.

## Package your offer

Customers often find packages easier than long lists of options. Simple, named packages help people choose:

- **Good / better / best:** “Essential · Classic · Luxury” with clear differences.
- **Occasion bundles:** “Party for 30”, “Bridal trial + wedding day”.
- **Most popular:** marking one option as the most popular helps people decide.

Three options is usually enough. Too many choices can make people put off deciding.

## Be clear about prices

You don’t have to publish every price, but hiding prices completely can put people off messaging. Options:

- “Starting from £X” with examples of what affects the price.
- A price range: “Most birthday trays are £120–£250.”
- Fixed prices for standard items, quotes for custom work.

Make sure any prices you show are accurate and include everything customers must pay, or clearly say what’s extra (such as delivery).

> A clear description saves you time too — fewer back-and-forth questions before someone books.`,
    seeTitle: 'Fictional example: a makeup artist in London',
    see: `**Before:** “Bridal makeup available, DM for price.”

**After (pinned carousel):**
- Slide 1: “Bridal makeup packages · London & Essex”
- Slide 2: **Classic — from £180:** trial not included, bride only, lashes included.
- Slide 3: **Signature — from £280** *(most popular)*: trial + wedding day, touch-up kit.
- Slide 4: **Trad + White — from £420:** two looks for traditional and white wedding.
- Slide 5: Bridal party add-ons, travel, early starts.
- Slide 6: “How to book: WhatsApp your date and venue. £50 deposit secures your date.”

Enquiries now arrive with dates and package names already in the message.`,
    do: `Pick your **best-selling product or service** and rewrite its description using the template below. Use it in a pinned post, your Highlights or your Auntie Tobi listing.`,
    use: [
      { type: 'template', title: 'Product or service description template', text: `[Name of product/service] — [the outcome or occasion it’s perfect for]

What’s included: [sizes / portions / hours / number of looks]
Price: [price / from £X / range]
Lead time: [how far ahead to book]
Delivery / location: [collection, delivery areas, home visits]

To order: [exact next step — e.g. WhatsApp us your date and number of guests]` },
      { type: 'checklist', title: 'Presentation checklist', items: [
        'It starts with the outcome or occasion, not just the specs',
        'It says what’s included',
        'There’s a price, a starting price or a range',
        'Lead time and delivery or location are clear',
        'There’s a clear photo of the real product or work',
        'There are no more than about three options or packages',
        'It ends with exactly how to order',
      ] },
    ],
    studio: { label: 'Write a post about my product', tool: 'caption', input: {} },
    sources: [{ title: 'ASA — Prices advice', url: 'https://www.asa.org.uk/advice-online/prices-overview.html' }],
    disclaimer: 'General business guidance, not legal advice. For advertising rules on prices, see the ASA advice linked.',
  },

  'Writing Offers Without Constant Discounts': {
    summary: 'Give people a reason to buy now without training them to wait for a discount — using bundles, bonuses and honest deadlines.',
    tags: ALL, reviewMonths: 12,
    learn: `Discounts can work, but if you use them all the time, two things happen: your profit shrinks, and customers learn to wait for the next sale. There are better ways to give people a reason to buy now.

## What makes an offer attractive?

A good offer makes saying yes feel easy and timely. It usually has:

- **Something of value** — not necessarily money off.
- **A clear reason to act now** — a genuine deadline or limited number.
- **A simple way to claim it.**

## Alternatives to discounts

**1. Bundles**
Put things together that people often buy anyway. “Party for 30: jollof, fried rice, chicken, small chops and drinks” is easier to buy than choosing each item, and can raise the average order.

**2. Bonuses (added value)**
Add something with a high perceived value but a low cost to you: a free cupcake box with a celebration cake, a free fringe trim with a full set of braids, an extra 10 edited photos with a full-day package.

**3. Upgrades**
“Book before 30 November and get the luxury packaging at no extra cost.”

**4. Early-bird pricing**
Reward people for booking ahead. This also helps you plan your busy periods.

**5. Loyalty rewards**
For repeat customers: “Your 5th hair appointment includes a free deep treatment.”

**6. Seasonal or limited-edition items**
“Christmas small chops platter — only available in December.” Newness creates interest without lowering your price.

## Make the deadline real

Urgency only works if it’s honest. “Only 3 slots left” must be true. If you say an offer ends on Sunday, end it on Sunday. Fake urgency damages trust — and misleading claims about prices or availability can break consumer protection and advertising rules in the UK.

## Be clear and fair

- State exactly what’s included and any conditions (dates, areas, minimum order).
- If you compare with a “was” or “normal” price, it must be a genuine price you’ve actually charged.
- Keep the wording simple: what it is, what they get, when it ends, how to claim.

## When a discount does make sense

A discount can be useful for a specific goal — filling quiet weekdays, clearing seasonal stock, or thanking loyal customers. Use it on purpose, for a short time, and check you’ll still make a profit.

> The best offers make customers feel they’re getting more, not that your normal price was too high.`,
    seeTitle: 'Fictional example: a small-chops caterer in Coventry',
    see: `Every December, Bisi used to post “20% off all trays”. She got busy but made very little profit.

This year she tries:
- **Christmas Party Bundle** (puff-puff, samosa, spring rolls, chicken wings and peppered gizzard for 20) at her normal price, presented as one easy choice.
- **Early-bird bonus:** book before 1 December and get a free dessert tray for 20.
- **Honest limit:** “We can only take 6 bundle orders per weekend.”

Customers still feel they’re getting a good deal, she fills her weekends earlier, and her profit per order is higher.`,
    do: `Plan your next offer **without a straight discount** using the worksheet below. Check the numbers: will you still make a profit?`,
    use: [
      { type: 'worksheet', title: 'Offer planner', fields: [
        { label: 'What is the offer? (bundle, bonus, upgrade, early-bird, loyalty, seasonal)', long: true },
        { label: 'Who is it for?' },
        { label: 'What exactly do they get?', long: true },
        { label: 'Why act now? (real deadline or limit)' },
        { label: 'Conditions (dates, areas, minimum order)' },
        { label: 'My cost and profit per order with this offer' },
        { label: 'How people claim it (exact next step)' },
      ] },
      { type: 'checklist', title: 'Honest offer checklist', items: [
        'The deadline or limit is genuine',
        'Any “was” or “normal” price is one I’ve really charged',
        'What’s included and any conditions are clear',
        'I’ll still make a profit on every order',
        'There’s one simple way to claim it',
      ] },
    ],
    studio: { label: 'Write my offer in Studio', tool: 'promo', input: {} },
    sources: [{ title: 'ASA — Prices advice', url: 'https://www.asa.org.uk/advice-online/prices-overview.html' }, { title: 'Business Companion — trading standards guidance for businesses', url: 'https://www.businesscompanion.info/' }],
    disclaimer: 'General business guidance, not legal advice. For rules on pricing and promotions, see the ASA and Business Companion guidance.',
  },

  'How to Respond to Customer Enquiries': {
    ...M2, collectionOrder: 2,
    summary: 'Reply in a way that builds trust, gets the details you need and moves the conversation towards a booking.',
    tags: ALL, reviewMonths: 12,
    learn: `An enquiry is someone raising their hand to say “I might buy from you.” How you reply often decides whether they do. Many small businesses lose sales not because of price, but because of slow, short or unclear replies.

## Reply quickly

People often message several businesses at once. The first clear, friendly reply has an advantage. Aim to reply within a few hours during your working hours. If you can’t give a full answer yet, send a quick holding message so they know you’ve seen it.

## Use a simple structure

A good reply usually has four parts:

1. **Warm greeting and thanks** — use their name. “Hi Tola, thank you for getting in touch! 😊”
2. **Answer their question** — if they asked the price, give a price, a starting price or a range. Avoiding the question feels evasive.
3. **Ask for the details you need** — date, location, number of guests, size, style. Keep it to two or three questions.
4. **A clear next step** — “Once I have those details I’ll send your quote today.”

## Handling “How much?”

A one-word “how much?” can be frustrating, but it’s a real enquiry. Try:

“Hi! Our party trays start from £85 for 10 guests. The final price depends on the number of guests and menu. What date is your event and roughly how many people are you expecting? I’ll send you the options.”

This answers them, shows you’re reasonable and keeps the conversation going.

## Make it personal

Refer to what they told you: “A 40th in a garden sounds lovely!” Small touches show you’ve read their message properly and help them trust you.

## Show, don’t just tell

Where it helps, attach one or two photos of similar work, your price list, or a link to your reviews. This often answers questions before they’re asked.

## Be clear about what happens next

When they’re ready, explain clearly:

- the total price and what’s included,
- any deposit, how to pay and by when,
- what happens on the day (delivery time, appointment length).

Studio’s **Money** tab can create a quote or invoice with your bank details so this is quick and professional.

## Keep it professional

- Use your normal friendly tone, but keep it clear and polite even if the message is short or rude.
- Don’t pressure people. If they’re not ready, follow up later (see “Following Up Without Being Pushy”).
- Keep notes of enquiries so nobody gets forgotten.

> Treat every enquiry as a person, not a price request. People buy from businesses that make them feel looked after.`,
    seeTitle: 'Fictional example: a photographer in Birmingham',
    see: `**Enquiry:** “Hi, price for birthday shoot?”

**Weak reply:** “£150.” (No response.)

**Better reply:**
“Hi Bimpe, thank you for your message! 😊 Birthday shoots start from £150 for 1 hour with 15 edited photos. Is it a studio shoot or at your party? And what date are you thinking? I’ll check availability and send you the options today. Here are a couple from a recent 30th 👇 [2 photos]”

Bimpe replies with her date and books the 2-hour package.`,
    do: `Find your **three most common enquiries** (for example “how much?”, “are you available on…?”, “do you deliver to…?”). Write a reply for each using the templates below and save them as quick replies on your phone.`,
    use: [
      { type: 'template', title: 'Reply to a price enquiry', text: `Hi [name], thank you for getting in touch! 😊 Our [product/service] starts from £[price] for [what’s included]. The final price depends on [main factors]. Could you tell me [question 1] and [question 2]? I’ll send you the options [today / by time].` },
      { type: 'template', title: 'Reply to an availability enquiry', text: `Hi [name], thanks for your message! I [do / don’t yet] have availability on [date]. [If available: to secure it I take a £[deposit] deposit — would you like me to send the details?] [If not: I do have [alternative dates] — would any of those work?]` },
      { type: 'template', title: 'Sending a quote', text: `Hi [name], here’s your quote for [what] on [date]: £[total], including [what’s included]. To secure your date I take a [deposit] deposit by [date] — bank details are on the quote. Any questions, just let me know!` },
      { type: 'checklist', title: 'Enquiry reply checklist', items: [
        'I replied within a few hours (or sent a holding message)',
        'I used their name and thanked them',
        'I answered their actual question',
        'I asked two or three questions to get the details I need',
        'I gave a clear next step and time',
        'I noted the enquiry so I can follow up',
      ] },
    ],
    studio: { label: 'Write a reply in Studio', tool: 'message', input: { situation: 'reply to an enquiry' } },
    sources: [],
  },

  'How to Ask for Customer Reviews': {
    ...M3, collectionOrder: 2,
    summary: 'When and how to ask for reviews so more happy customers actually leave one — and the UK rules to stay on the right side of.',
    tags: ALL, reviewMonths: 12,
    learn: `Reviews are one of the strongest trust signals a small business has. A new customer is far more likely to message you if they can see that real people have had a good experience. The good news: most happy customers are willing to leave a review — they just need to be asked at the right time, in the right way.

## When to ask

Ask when the experience is fresh and positive:

- right after delivery or the appointment, when they say thank you,
- when they send you a photo or a happy message,
- a day or two after an event, once they’ve recovered!

## Make it easy

The fewer steps, the more reviews you’ll get:

- Send a **direct link** to where you want the review (your Google Business Profile, Facebook page or Auntie Tobi listing). Studio can create a review link card with a QR code you can print or share.
- Keep the message short and personal.
- Suggest what to mention, without telling them what to say: “It really helps if you mention the occasion and what you liked.”

## Where reviews help most

- **Google** — shows up when people search for businesses like yours, especially locally.
- **Your Auntie Tobi listing** — seen by the Nigerian community looking for businesses.
- **Instagram** — screenshots of genuine messages in a “Reviews” Highlight (always ask permission and hide personal details).

## Stay within the rules

The UK has strict rules on reviews. Since April 2025, under the Digital Markets, Competition and Consumers Act 2024, it’s banned to:

- write, commission or post **fake reviews** (including reviews from friends or family pretending to be customers),
- publish reviews that **hide the fact they were incentivised** (for example, paid for or rewarded),
- present reviews in a **misleading** way — for example, hiding or deleting genuine negative reviews, or only showing the good ones in a way that misleads.

Platforms have their own rules too. For example, Google’s policies don’t allow businesses to offer incentives for reviews or to only ask happy customers (“review gating”). The safest approach is simple: **ask all genuine customers for honest reviews, and don’t offer anything in return.**

## Responding to reviews

- Thank people for positive reviews, ideally by name and mentioning what they bought.
- Respond to negative reviews calmly and politely. Acknowledge the issue, avoid arguing, and offer to sort it out privately. Future customers read your replies, too.

> One honest, specific review (“The jollof was the hit of the party and they arrived early”) is worth more than ten that just say “Great!”`,
    seeTitle: 'Fictional example: a barber in Leeds',
    see: `Emeka has 9 Google reviews, all from two years ago. He starts asking every client at the end of their cut:

“Glad you’re happy with it, bro! If you’ve got 30 seconds, a Google review really helps a small business like mine. I’ll send you the link now.”

He sends a short WhatsApp with his review link straight away while they’re still in the chair. He also prints a small QR code card for the mirror.

Over three months he gets 26 new genuine reviews — including a couple of mixed ones, which he replies to politely. New clients now often mention they found him through Google.`,
    do: `Make a list of **five recent happy customers** and send each one a personal review request today using a template below. Add your review link in Studio so it’s ready to share.`,
    use: [
      { type: 'template', title: 'Review request (WhatsApp)', text: `Hi [name], thank you so much for choosing [business name] for [what they bought / occasion]! 😊 If you have a minute, an honest review would really help my small business: [review link]. It’s especially helpful if you mention [what they bought] and what you thought. Thank you!` },
      { type: 'template', title: 'Thank-you reply to a positive review', text: `Thank you so much, [name]! It was a pleasure doing [what you did] for your [occasion]. We hope to see you again soon 💚` },
      { type: 'template', title: 'Reply to a negative review', text: `Thank you for your feedback, [name], and I’m sorry [what went wrong] wasn’t what you expected. That’s not the experience we want for anyone. I’d really like to put this right — please message me on [WhatsApp/number] so we can talk.` },
      { type: 'checklist', title: 'Review rules checklist', items: [
        'I ask all genuine customers, not only the happiest ones',
        'I don’t offer money, discounts or gifts for reviews',
        'I never post fake reviews or ask friends to pretend',
        'I don’t hide or delete genuine negative reviews',
        'I ask permission before sharing a customer’s message',
        'I reply politely to every review',
      ] },
    ],
    studio: { label: 'Set up my review link & QR code', screen: 'review' },
    sources: [
      { title: 'Business Companion — online reviews and endorsements (DMCC Act 2024)', url: 'https://www.businesscompanion.info/en/quick-guides/fair-trading/online-reviews-and-endorsements' },
      { title: 'Google Maps — prohibited and restricted content policy', url: 'https://support.google.com/contributionpolicy/answer/7400114' },
    ],
    disclaimer: 'General business guidance, not legal advice. Check the linked guidance for the current rules.',
  },

  'Encouraging Repeat Purchases and Referrals': {
    summary: 'Your past customers are your easiest sales. Simple ways to bring them back and get them recommending you.',
    tags: ALL, reviewMonths: 12,
    learn: `It’s usually easier and cheaper to sell again to someone who already knows and trusts you than to find a brand-new customer. Many small businesses focus all their energy on new followers and forget the people who have already bought.

## Start with a great experience

Repeat business starts with the first order:

- Do what you said you would, when you said you would.
- Communicate clearly: confirmations, reminders, and a heads-up if anything changes.
- Add small touches: a handwritten thank-you, neat packaging, a care guide for their braids, reheating instructions for their food.

## Say thank you and check in

Within a day or two of the order or appointment, send a short message:

“Hi Ngozi, thank you again for choosing us for your daughter’s party! I hope everyone enjoyed the food. 😊”

This is also the perfect moment to ask for a review.

## Keep a simple customer list

You can’t bring people back if you can’t find them. Keep a list of past customers with:

- name and contact,
- what they bought and when,
- any important dates (birthdays, anniversaries, annual events),
- notes (favourite style, allergies, preferences).

Studio builds a customer list automatically from your quotes, invoices and receipts in **Track → Customers**, with buttons to message them again.

## Give them a reason to come back

- **Remind them at the right time:** “It’s nearly 8 weeks since your braids — shall I book you in?” or “Your son’s birthday is coming up again in March!”
- **New products or seasonal menus:** let past customers know first.
- **Loyalty rewards:** “Your 5th order includes a free dessert tray.”
- **Exclusive early booking:** “Past customers can book Christmas dates before we announce them.”

Only send marketing messages to people who have agreed to hear from you, and make it easy for them to say no thanks. Personal follow-ups about their previous order are different from bulk promotional broadcasts.

## Make referrals easy

Happy customers often want to recommend you — help them:

- **Ask directly:** “If you know anyone planning a party, I’d really appreciate a recommendation.”
- **Give them something to share:** your WhatsApp link, Instagram handle or Auntie Tobi listing.
- **Thank people who refer:** a personal thank-you, or a small reward. If you offer a reward for referrals, make sure it’s clear and fair, and remember it’s different from paying for reviews (which you shouldn’t do).

> A customer who comes back three times and recommends two friends is worth far more than a single sale.`,
    seeTitle: 'Fictional example: a hairstylist in Croydon',
    see: `Yemi keeps a simple list in Studio of every client, what style they had and when.

- Six to eight weeks after a set of braids, she sends: “Hi Funmi! It’s been about 7 weeks since your knotless braids — would you like me to save you a slot next week?”
- Before Christmas, past clients get first choice of December dates.
- When a client brings a friend, both get a free hair-oil sample.

Over a year, most of her bookings come from returning clients and their friends — and she spends less time chasing new followers.`,
    do: `Make a list of **ten past customers** you haven’t heard from in a while. Send three of them a friendly, personal check-in this week with a genuine reason to get in touch.`,
    use: [
      { type: 'template', title: 'Thank-you after an order', text: `Hi [name], thank you again for choosing [business name] for [occasion/order]! I really hope [everyone enjoyed it / you love your new look]. 😊 If you ever need [product/service] again, I’m just a message away.` },
      { type: 'template', title: 'Rebooking reminder', text: `Hi [name], hope you’re well! It’s been about [time] since your [service/order]. Would you like me to [save you a slot / take your next order]? I have availability on [dates].` },
      { type: 'template', title: 'Asking for a referral', text: `Hi [name], I really enjoyed working with you on [what]. If you know anyone who needs [product/service], I’d be so grateful if you passed on my details: [WhatsApp link / @username]. Thank you! 💚` },
      { type: 'checklist', title: 'Repeat-business checklist', items: [
        'I send a thank-you message after every order',
        'I keep a list of past customers and what they bought',
        'I note important dates and preferences',
        'I contact past customers with genuine reasons, not spam',
        'I ask happy customers for referrals',
        'I make it easy for people to say no thanks',
      ] },
    ],
    studio: { label: 'Open my customer list', screen: 'customers' },
    sources: [{ title: 'ICO — Direct marketing guidance', url: 'https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/' }],
    disclaimer: 'General business guidance, not legal advice. For marketing rules, see the ICO guidance.',
  },

  'How to Turn Enquiries Into Orders': {
    ...M3, collectionOrder: 3, seedRev: 3,
    summary: 'Practical steps to help more of the people who enquire actually book — without pressure or discounts.',
    tags: ALL, reviewMonths: 12,
    learn: `If you’re getting enquiries but not many orders, that’s actually good news: people are interested. The work now is to make it easier for them to say yes.

## Know your numbers

Start by tracking two things for a few weeks in Studio’s **Track** tab: enquiries and orders. If you get 20 enquiries and 4 orders, you’re converting 1 in 5. Improving that to 1 in 3 without a single new follower would be a big increase in sales.

## Find out why people don’t book

Read back through recent enquiries that didn’t turn into orders. Common reasons:

- **Slow or unclear reply.** They booked someone who answered first.
- **Price shock.** The price was higher than they expected and nothing explained the value.
- **Too many steps.** They had to ask lots of questions to get a quote.
- **No follow-up.** They meant to come back but forgot.
- **Not enough trust.** They weren’t sure you were reliable.
- **Wrong fit.** They wanted something you don’t offer, or in an area you don’t cover — that’s fine.

## Seven ways to convert more enquiries

**1. Reply faster.** Even a holding message helps (see “How to Respond to Customer Enquiries”).

**2. Ask the right questions early.** Get date, location, size and budget in your first reply so your quote is accurate.

**3. Explain the value, not just the price.** What’s included, why it’s worth it, what makes you different.

**4. Give options.** Offering two or three packages lets people choose rather than decide yes or no.

**5. Show proof.** Send a photo of similar work or a genuine review with your quote.

**6. Make paying easy.** Send a clear quote or invoice with bank details and a reference straight away. Explain deposits and deadlines.

**7. Follow up.** One or two polite follow-ups often make the difference (see “Following Up Without Being Pushy”). Log each enquiry in Studio’s **Follow-ups** and it will remind you on the Today screen, with the message already written.

## Handling “It’s too expensive”

Don’t panic and don’t immediately drop your price. You could:

- explain what’s included and why,
- offer a smaller or simpler option at a lower price,
- suggest a payment plan or deposit if that suits your business,
- accept that some people aren’t your customers — and that’s okay.

## Confirm in writing

Once someone says yes, confirm the details in writing: date, time, what’s included, total, deposit, and what happens next. This prevents misunderstandings and makes you look professional.

> You don’t need more followers to grow. Converting a few more of the enquiries you already get can make a real difference.`,
    seeTitle: 'Fictional example: a gele and makeup artist in Manchester',
    see: `Ife records 24 enquiries last month and 5 bookings. Looking back, she notices:

- she often took a day to reply,
- she sent one price with no explanation,
- she never followed up.

This month she replies within two hours using saved templates, sends three package options with photos, sends quotes straight from Studio with bank details, and follows up after two days. From 22 enquiries she takes 9 bookings.`,
    do: `Look at your last 10 enquiries that didn’t book. Write down the most likely reason for each, then choose **two changes** from the list above to try for the next two weeks.`,
    use: [
      { type: 'worksheet', title: 'Enquiry-to-order review', fields: [
        { label: 'Enquiries in the last 4 weeks' },
        { label: 'Orders in the last 4 weeks' },
        { label: 'Most common reasons people didn’t book', long: true },
        { label: 'Change 1 I’ll try for two weeks' },
        { label: 'Change 2 I’ll try for two weeks' },
        { label: 'Results after two weeks', long: true },
      ] },
      { type: 'template', title: 'Booking confirmation', text: `Hi [name], lovely — you’re booked! 🎉 Here are the details:

📅 [Date and time]
📍 [Location / delivery address]
✅ [What’s included]
💷 Total: £[total] — deposit of £[deposit] received / due by [date]
Balance due: [when]

Any changes, just message me. Can’t wait!` },
    ],
    studio: { label: 'Create a quote', screen: 'money' },
    sources: [],
  },
};
