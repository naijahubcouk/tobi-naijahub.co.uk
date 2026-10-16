'use strict';
// Module 03 — Content & Visibility, and Module 06 — Business Growth & Strategy (launch items).
const ALL = ['all', 'food', 'beauty', 'fashion', 'events', 'photo', 'retail', 'services'];

module.exports = {
  m03: {
    'How to Take Better Product Photos': {
      featured: true, collection: 'Month 1 — Getting Visible', collectionOrder: 2,
      summary: 'Take clear, appetising, trustworthy photos with just your phone — using light, background, angles and a few simple habits.',
      tags: ['all', 'food', 'fashion', 'retail', 'beauty', 'events'], reviewMonths: 12,
      learn: `Good photos sell. Customers can’t taste your food, touch your fabric or try your hairstyle through a screen — the photo has to do that job. You don’t need an expensive camera. A modern phone, good light and a few habits make a huge difference.

## 1. Light is everything

- **Use daylight.** Stand or place your product near a window. Daylight shows true colours and looks natural.
- **Avoid harsh direct sun.** It creates strong shadows. If the sun is shining straight in, a thin white curtain or baking paper over the window softens it.
- **Turn off overhead lights** when using daylight — mixing light sources makes colours look yellow or patchy.
- **Avoid the flash** for products. It flattens food and creates shine on packaging.
- **Bounce light** into shadows with something white — a sheet of card, a white board, even a white plate.

## 2. Keep the background simple

The product should be the star. A clean background makes it stand out:

- a plain wall, a wooden table, a white sheet, a marble-effect board,
- or a setting that fits the occasion — a party table for trays, a vanity for beauty products.

Move anything distracting out of shot: bags, cables, washing up, other people’s things.

## 3. Find the right angle

Different products look best from different angles:

- **From above (flat lay):** trays, platters, flat-lay outfits, jewellery, stationery.
- **At 45 degrees:** most plated food, cakes, cosmetics — roughly how you see things at a table.
- **Straight on (eye level):** tall cakes, drinks, bottles, shoes, anything with layers.
- **Close-up details:** texture, stitching, braiding pattern, glaze, the inside of a cake.

Take several angles and choose the best later.

## 4. Show scale and use

People want to know how big something is and what it’s like to use or wear:

- Place a common object nearby (a fork, a hand, a phone).
- Show the outfit being worn, the hair from the back and side, the tray on a table set for guests.

## 5. Phone camera basics

- **Clean your lens.** It’s often smudged from your pocket, which makes photos hazy.
- **Tap to focus** on the most important part, and adjust brightness if needed.
- **Use the grid** to keep lines straight.
- **Don’t zoom in digitally** — move closer instead, or crop afterwards.
- **Keep it steady:** lean on something or use a cheap phone stand.

## 6. Edit lightly and honestly

Small adjustments help: straighten, crop, brighten slightly, and fix colour if it looks too yellow. But your photos must show what customers will actually get. Heavy filters that change colours or hide flaws can lead to disappointed customers and complaints.

## 7. Build a photo habit

- Photograph **every** order before it leaves, from two or three angles.
- Keep a folder of your best photos for posts, your listing and features.
- Ask customers for photos of the product in use (and permission to share).

> A slightly imperfect, honest photo in good light beats a heavily filtered one that doesn’t look like the real thing.`,
      seeTitle: 'Fictional example: a cake maker in Leicester',
      see: `**Before:** cakes photographed at night under the kitchen light, on the worktop next to the kettle. The icing looks yellow and the background is busy.

**After:** Funmi sets up a small corner by her living-room window with a white foam board behind and a wooden board underneath. She shoots between 10am and 3pm, turns off the kitchen light, takes one shot straight on, one at 45 degrees and one close-up of a slice.

Her cakes look the colour they really are, and she reuses the same setup so her Instagram grid looks consistent.`,
      do: `Set up a **photo corner** by a window this week. Photograph your best product from three angles (above, 45 degrees, straight on) plus one close-up. Compare them with your old photos.`,
      use: [
        { type: 'checklist', title: 'Product photo checklist', items: [
          'I’m using daylight near a window',
          'The overhead lights and flash are off',
          'The background is simple and tidy',
          'My lens is clean',
          'I tapped to focus on the most important part',
          'I took several angles, including a close-up',
          'Something shows the size or how it’s used',
          'My edits are light and the colours are true',
          'I have permission for any people or customer homes in the photo',
        ] },
        { type: 'template', title: 'My photo set-up notes', text: `Best spot: [window/room]
Best time of day: [time]
Background: [what I use]
Angles for my main products:
- [product]: [angle]
- [product]: [angle]
Props I keep ready: [plates, boards, fabric, flowers…]` },
      ],
      studio: { label: 'Turn a photo into a branded post image', screen: 'image' },
      sources: [],
    },

    'Writing Captions That Encourage Action': {
      status: 'planned', featured: true, collection: 'Month 2 — Getting Customers', collectionOrder: 1,
      summary: 'Write captions that stop the scroll, say something useful and tell people exactly what to do next.',
      tags: ALL, reviewMonths: 12,
      learn: `A great photo or video gets attention. The caption turns that attention into action. Many small businesses either leave captions almost empty or write a long paragraph that never says what to do next. A simple structure fixes both.

## The structure: Hook → Value → Call to action

**1. Hook (the first line)**
Only the first line or so shows before people tap “more”, so make it count. It should make the right person want to keep reading.

- A question: “Planning a party for 50 and dreading the cooking?”
- A bold statement: “This is why your braids itch after a week.”
- A result: “6 hours. 1 very happy bride. 0 touch-ups needed.”
- News: “Christmas dates are now open 🎄”

**2. Value (the middle)**
Give people something useful or interesting: the details of the product, a tip, the story behind the order, what’s included, why it matters. Keep sentences short and use line breaks so it’s easy to read on a phone.

**3. Call to action (the end)**
Tell people exactly what to do next. Be specific:

- “DM ‘TRAY’ and I’ll send the menu.”
- “Tap the link in my bio to book.”
- “WhatsApp us your date to check availability.”
- “Save this for your next party.”

One clear call to action works better than several.

## Write like you talk

Write the way you’d speak to a customer at a market stall: warm, clear and natural. Use the words your customers use. A little Nigerian flavour — “owambe”, “party jollof”, “Aso-ebi” — can help the right people feel at home, if it’s natural for your brand.

## Make it easy to read

- Short paragraphs and line breaks.
- A few emojis to break up text, not to replace words.
- The important details (price, date, area) easy to spot.

## Hashtags and keywords

Describe what’s in the post in plain words — “bespoke birthday cakes in Leicester” — so both people and search can understand it. Use a small number of relevant hashtags rather than long lists.

## Different captions for different goals

- **To reach new people:** a strong hook and something useful or entertaining.
- **To build trust:** the story, the process, customer feedback.
- **To sell:** what it is, who it’s for, the price or offer, the deadline, how to order.

> Before you post, ask: if someone only read the first line and the last line, would they know what this is and what to do?`,
      seeTitle: 'Fictional example: a small-chops caterer in Essex',
      see: `**Before:**
“Party tray 😍😍🔥 #smallchops #naija #food #party #london #yum”

**After:**
“Hosting 30 people this weekend and haven’t sorted the food? 👀

This is our Classic Party Tray:
✅ Puff-puff, samosa, spring rolls & peppered chicken
✅ Feeds 25–30 guests
✅ Delivered across Essex & East London

We have 3 trays left for this Saturday.

WhatsApp ‘TRAY’ to 07XXX XXXXXX to book yours 👇
#EssexCaterer #SmallChops”`,
      do: `Rewrite the caption of **one of your recent posts** using Hook → Value → Call to action. Use the template, then try writing your next post’s caption the same way (Studio can draft options for you).`,
      use: [
        { type: 'template', title: 'Caption template', text: `[Hook — a question, bold statement, result or news]

[Value — what it is / the tip / the story]
[Key details — what’s included, price, area, date]

[Call to action — exactly what to do next]
[2–5 relevant hashtags]` },
        { type: 'checklist', title: 'Caption checklist', items: [
          'The first line makes the right person want to read on',
          'It gives something useful or interesting',
          'Important details are easy to spot',
          'It ends with one clear call to action',
          'It sounds like me talking to a customer',
          'It’s easy to read on a phone',
          'Hashtags are few and relevant',
        ] },
      ],
      studio: { label: 'Write caption options in Studio', tool: 'caption', input: {} },
      sources: [],
    },
  },

  m06: {
    'Pricing Your Products or Services': {
      status: 'planned', featured: true, collection: 'Month 3 — Improving Sales', collectionOrder: 1,
      summary: 'Work out a price that covers your costs, pays you for your time and leaves a profit — with a simple calculator.',
      tags: ALL, reviewMonths: 12,
      learn: `Pricing is one of the hardest parts of running a small business. Price too high and you worry nobody will buy; price too low and you can end up busy, tired and making little or no money. Many small business owners undercharge, especially when they’re starting out or selling to their own community.

A good price does three things: it **covers your costs**, **pays you for your time**, and **leaves a profit** to grow the business.

## Step 1: Know your direct costs

These are the costs for each item or job:

- **Materials and ingredients:** flour, meat, fabric, hair, lashes, packaging.
- **Packaging and delivery or travel:** boxes, fuel, parking, delivery fees.
- **Anything else used per job:** disposable gloves, printing, card fees.

Work these out properly at least once. Many businesses are surprised how much small things add up.

## Step 2: Pay yourself for your time

Your time is a real cost. Count everything: shopping, preparing, making or doing the work, cleaning up, travelling, messaging. Then decide a fair hourly rate for yourself. If you’re not paying yourself, you’re not really making a profit yet.

## Step 3: Add your running costs (overheads)

These are costs you pay whether you sell one item or a hundred: phone, apps and subscriptions, equipment, insurance, rent or kitchen hire, marketing, website, card machine fees. Divide your monthly running costs by roughly how many orders you do a month to get a share per order.

## Step 4: Add profit

Profit is what’s left after all costs, including your own pay. It lets you save for quieter months, invest in better equipment and grow. Many businesses add a percentage on top of their full cost.

Use the **calculator below** to bring these together.

## Step 5: Check against the market

Your calculation tells you the minimum you should charge. Then look outwards:

- **What do similar businesses charge?** Not to copy them, but to understand the range.
- **What do your ideal customers expect to pay?** Luxury bridal clients and student budgets are different markets.
- **What makes you different?** Speed, quality, experience, convenience and reliability can justify a higher price.

If your calculated price is much higher than the market, look at your costs and time — can you buy materials more cheaply, batch your work, or offer a smaller option? If it’s much lower, you may be undercharging.

## Presenting your price with confidence

- State your price clearly without apologising.
- Explain what’s included and the value.
- Offer options (good, better, best) rather than haggling.
- Review your prices at least once a year, and when your costs go up.

## A note on tax

Depending on your situation you may need to register as self-employed, keep records, and in some cases register for VAT and include it in your prices. These rules change and depend on your circumstances, so check GOV.UK or speak to an accountant.

> Charging properly isn’t greedy. A business that doesn’t make a profit can’t keep serving its customers.`,
      seeTitle: 'Fictional example: a celebration cake maker in Kent',
      see: `Toyin charged £60 for a two-tier birthday cake because “that’s what everyone charges”. She works it out properly:

- Ingredients, board, box and decorations: **£22**
- Her time (shopping, baking, decorating, cleaning, messaging): **5 hours at £12** = **£60**
- Share of running costs (about £90 a month across 10 cakes): **£9**
- Full cost: **£91**. With 20% profit: about **£109**

She was losing money on her own time. She moves her price to £95 for the standard design and £110+ for detailed designs, explains what’s included, and offers a simpler single-tier option from £65. She loses one or two price-shoppers but makes more from fewer cakes.`,
      do: `Use the **pricing calculator** for your best-selling product or service. Compare the suggested price with what you charge now. Write down one change you’ll make.`,
      use: [
        { type: 'calculator', title: 'Pricing calculator', kind: 'pricing' },
        { type: 'checklist', title: 'Pricing review checklist', items: [
          'I know my direct cost per item or job',
          'I’ve included my own time at a fair hourly rate',
          'I’ve included a share of my running costs',
          'I’ve added a profit margin',
          'I’ve compared my price with similar businesses',
          'I can explain what’s included and why it’s worth it',
          'I’ll review my prices at least once a year',
        ] },
      ],
      studio: { label: 'Write my price list post', tool: 'caption', input: { topic: 'Our prices and what is included' } },
      sources: [{ title: 'GOV.UK — Working for yourself', url: 'https://www.gov.uk/working-for-yourself' }, { title: 'GOV.UK — VAT registration', url: 'https://www.gov.uk/vat-registration' }],
      disclaimer: 'General business guidance, not financial or tax advice. Check GOV.UK or speak to an accountant about your own situation.',
    },
  },
};
