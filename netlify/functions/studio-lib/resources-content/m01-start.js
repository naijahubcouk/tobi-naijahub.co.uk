'use strict';
// Module 01 — Start Here (free for every plan). Written by Auntie Tobi; published as written.
// Formatting: ## Heading, - bullet, 1. numbered, **bold**, > Tip box
const P = (o) => ({ status: 'published', seedRev: 1, tags: ['all'], reviewMonths: 12, see: '', ...o });

module.exports = {
  'Welcome to Auntie Tobi Business Studio': P({
    summary: 'What Business Studio is for, when to use it — and why you don’t need to use everything.',
    learn: `Welcome to **Auntie Tobi Business Studio**.

This space was created to help you become more intentional about how you run, market and grow your business.

You do not need to know everything. You do not need to use every tool immediately. And you definitely do not need to try and fix your whole business in one day.

The aim is simple:

1. **Understand where your business is now.**
2. **Know what needs attention.**
3. **Use the right tool or resource.**
4. **Take action.**
5. **Review what happens.**

Then improve from there.

Think of Business Studio as your practical business support space. Come here when you need help with content, marketing, sales, customers, business organisation or deciding what to focus on next.

## Running a business can feel like a lot

Running a business can sometimes feel like you are doing plenty but still wondering: **“What should I actually be focusing on?”**

You may be:

- Posting
- Creating graphics
- Replying to enquiries
- Changing your bio
- Trying different offers
- Watching business videos
- Looking at what other businesses are doing

And still feel unsure about what will actually move your business forward. That is where Business Studio comes in.

## What is Auntie Tobi Business Studio?

Business Studio is a practical business support space designed to help you with things like:

- Content ideas
- Captions
- Sales messages
- Offers
- Marketing
- Instagram
- Customer communication
- Business planning
- Business organisation
- Visibility
- Goal setting

The aim is not to give you more information to save and never use. The aim is to help you turn ideas into action.

## Use Business Studio when you are thinking:

- **“I don’t know what to post.”**
- **“People are looking but not buying.”**
- **“My Instagram needs work.”**
- **“I need to promote this offer.”**
- **“I don’t know what to focus on next.”**
- **“I need help communicating with customers.”**
- **“My business feels all over the place.”**

You can come into Business Studio, choose what you need, use the tool or resource, and go back to running your business.

## Do not try to use everything

This is important. Business Studio is not something you need to “finish”.

- You do not need to open every tool.
- You do not need to read every resource.
- You do not need to create content just because a tool exists.

Use what is relevant to your business right now.

> 💚 **Auntie Tobi reminder:** The goal is not to make your business busier. The goal is to help you become more intentional about what you do.`,
    do: `Pick the one thought from the list above that sounds most like you right now. Keep it in mind as you go through the rest of Start Here.`,
    studio: { label: 'Go to Today', screen: 'home' },
  }),

  'Business Mindset': P({
    summary: 'Six mindset shifts that will help you use Business Studio better — before we talk about content, marketing or sales.',
    learn: `Before we talk about content, marketing or sales, there are a few mindset shifts that will help you use Business Studio better.

## 1. Ownership — this is your business

Support can help you. Tools can help you. Ideas can help you. Visibility can help you. But you are still the person responsible for moving the business forward.

Instead of only asking **“Why isn’t this working?”** also ask **“What can I improve?”**

Instead of saying **“Instagram is not bringing customers,”** ask:

- **“Is my page clear?”**
- **“Is my offer strong?”**
- **“Am I speaking to the right people?”**
- **“Am I actually asking people to buy?”**

Taking ownership does not mean blaming yourself for everything. It simply means focusing on what you can control.

> 💚 **Mindset shift:** Move from **“Why is this happening to me?”** to **“What can I improve next?”**

## 2. Action — knowing is not the same as doing

You can save 100 business posts, watch hours of videos, download guides and collect templates — and still see very little change.

Why? Because information only becomes useful when you use it.

- If you learn how to improve your bio: **improve it.**
- If you learn how to follow up: **follow up.**
- If you create a better offer: **test it.**
- If Business Studio gives you a caption: **post it.**

> 💚 **Mindset shift:** Move from **Learn → Learn → Learn** to **Learn → Implement → Review → Improve**

## 3. Consistency — it does not mean doing everything every day

You do not need to post all day, be on every platform, create constantly or work 24/7.

Consistency means regularly doing the things that matter. That might be:

- Posting 3 useful pieces of content a week
- Following up every Friday
- Asking customers for reviews
- Promoting your offer consistently
- Checking your numbers weekly

> 💚 **Mindset shift:** Move from **“I need to do more.”** to **“I need a routine I can actually maintain.”**

## 4. Visibility vs sales — being seen is not the same as making sales

A repost can give you visibility. An advert can give you visibility. A feature can give you visibility. More followers can give you visibility. But visibility alone does not guarantee sales.

After people discover you, they still need to:

- Understand what you sell
- Trust you
- See the value
- Know how to buy
- Feel confident taking the next step

Think: **Visibility → Interest → Trust → Enquiry → Purchase**

> 💚 **Mindset shift:** Do not only ask **“How can more people see me?”** Also ask **“What happens after they see me?”**

## 5. Learning from results — not everything will work the first time

Some posts will perform badly. Some offers will not sell. Some adverts will disappoint you. That does not automatically mean you should give up.

Ask:

- What did I expect?
- What actually happened?
- What did customers say?
- What could I improve?
- Should I test it again?

> 💚 **Mindset shift:** Move from **“It failed.”** to **“What did this teach me?”**

## 6. Customer focus — your business is not only about what you want to sell

Your customer is asking:

- **“Is this for me?”**
- **“Why should I care?”**
- **“Can I trust this business?”**
- **“How do I buy?”**

Strong businesses learn to look at the business through the customer’s eyes. Ask:

- What do they need?
- What do they value?
- What confuses them?
- What makes them hesitate?
- How can I make buying easier?

> 💚 **Mindset shift:** Move from **“What do I want to sell?”** to **“What does my customer need to understand before they buy?”**`,
    do: `Choose the **one** mindset shift you most need right now and write down one thing you will do differently this week because of it.`,
    use: [
      { type: 'worksheet', title: 'My mindset shifts', group: 'planning', free: true, fields: [
        { label: 'Ownership: what can I improve next?', hint: 'Something within my control' },
        { label: 'Action: what have I learned but not used yet?', hint: 'e.g. update my bio, send follow-ups' },
        { label: 'Consistency: a routine I can actually maintain', hint: 'e.g. 3 posts a week, follow up every Friday' },
        { label: 'Visibility vs sales: what happens after people see me?', hint: 'Can they understand, trust and buy?' },
        { label: 'Learning from results: what did my last try teach me?' },
        { label: 'Customer focus: what does my customer need to understand before they buy?', long: true },
      ] },
    ],
  }),

  'How to Use Your Business Studio Membership': P({
    summary: 'Start with the problem, use the 1–1–1 method and act before consuming more.',
    learn: `Business Studio works best when you use it with a purpose. Do not open tools randomly. **Start with the problem.**

## 1. Identify your current challenge

Ask: **“What does my business need help with right now?”**

Maybe:

- More enquiries
- Better content
- Stronger sales
- Clearer Instagram
- Better customer communication
- More reviews
- Better organisation

Choose one. Do not try to solve ten problems at once.

## 2. Use the 1–1–1 method

Keep things simple.

- **1 problem** — what is the issue? Example: **“People ask for prices but do not buy.”**
- **1 resource** — what tool or resource can help? Example: **Customer Follow-Up**
- **1 action** — what will you do? Example: **Follow up with 5 previous enquiries.**

That is enough.

## 3. Find the right resource

Use the section that matches your challenge.

- 📱 **Instagram** — for profile clarity, bios, content and calls-to-action.
- ✍🏾 **Content** — for ideas, captions, hooks, Reels and promotional posts.
- 💷 **Sales** — for offers, enquiries, follow-up and sales messages.
- 👥 **Customers** — for reviews, repeat business and customer communication.
- 🧰 **Business tools** — for planning, organisation and practical business support.
- 🆕 **Monthly resources** — for fresh content ideas, seasonal opportunities and new resources.

## 4. Implement before consuming more

Do not keep opening tools without using what they give you. Before moving on, ask: **“What will I actually do with this?”**

If you created:

- A caption — post it.
- A sales message — use it.
- A follow-up — send it.
- A content plan — start it.
- An offer — test it.

> 💚 **Remember:** One action completed is more valuable than ten ideas saved.

## 5. Use your 90-day goal

Your 90-day goal should help you decide what deserves your attention.

If your goal is **more enquiries**, focus on:

- Visibility
- Clear offers
- Calls-to-action
- Instagram clarity

If your goal is **more sales**, focus on:

- Follow-up
- Sales messages
- Customer objections
- Offers
- Repeat customers

Ask before starting something new: **“Will this help my current goal?”** If not, it may be a good idea — but it may be a **not now** idea.

## 6. Check your monthly resources

New resources may be added throughout the year. These may include:

- Content ideas
- Hooks
- Promotional ideas
- Seasonal campaigns
- Sales prompts
- Templates
- Business challenges

You do not need to use all of them. Choose what supports your business right now.

## 7. Use visibility opportunities properly

Visibility works better when your business is ready. Before sending more people to your page, check the list in **Use** below.

> 💚 **Remember:** Visibility opens the door. Your business still needs to give people a reason to walk through it.

## 8. Review and choose the next step

After trying something, review it. Ask:

- **What did I do?**
- **What happened?**
- **What worked?**
- **What did not work?**
- **What did I learn?**

Then choose:

- **Continue** — it is working.
- **Improve** — something needs adjusting.
- **Stop** — it is not useful enough to continue.

Business growth is: **Try → Measure → Learn → Decide → Improve**`,
    do: `Use the **1–1–1 worksheet** below: write down one problem, one resource and one action — then do the action this week.`,
    use: [
      { type: 'worksheet', title: 'The 1–1–1 method', group: 'planning', free: true, fields: [
        { label: '1 problem — what is the issue?', hint: 'e.g. People ask for prices but do not buy' },
        { label: '1 resource — what tool or resource can help?', hint: 'e.g. Customer Follow-Up' },
        { label: '1 action — what will I do?', hint: 'e.g. Follow up with 5 previous enquiries' },
      ] },
      { type: 'checklist', title: 'Is my business ready for visibility?', group: 'planning', free: true, items: [
        'My bio is clear',
        'People can understand what I sell',
        'My offer is easy to find',
        'People can see how to order',
        'I have trust signals',
        'I am ready to respond to enquiries',
      ] },
      { type: 'worksheet', title: 'Review & choose the next step', group: 'planning', free: true, fields: [
        { label: 'What did I do?' },
        { label: 'What happened?' },
        { label: 'What worked?' },
        { label: 'What did not work?' },
        { label: 'What did I learn?' },
        { label: 'Continue, improve or stop?', hint: 'Continue — it is working · Improve — something needs adjusting · Stop — not useful enough' },
      ] },
    ],
  }),

  'Business Basics Health Check': P({
    summary: 'Check the foundation before trying to grow: 13 important areas of your business, and your top 3 gaps.',
    learn: `Before trying to grow, check the foundation. The Business Basics Health Check helps you look at **13 important areas** of your business.

## The 13 areas

1. **Business clarity** — can people quickly understand what you do?
2. **Your customer** — do you know who you are trying to attract?
3. **Your offer** — is it clear what you are selling and why it matters?
4. **Pricing** — does your pricing make sense for your customer and your business?
5. **Instagram** — can people understand, trust and buy from your page?
6. **Content** — is your content attracting, educating, building trust and selling?
7. **Customer journey** — how easy is it to buy from you?
8. **Sales** — do you understand how interest becomes a sale?
9. **Trust** — are you giving customers enough reason to feel confident?
10. **Repeat business** — what happens after the first sale?
11. **Organisation** — do you have simple systems?
12. **Money** — do you understand your numbers?
13. **Goals** — do you know what you are working towards?

## How to use the health check

Do not try to get a perfect score. This is not an exam.

- Be honest.
- Notice where the gaps are.
- Then choose **your top 3 gaps**.

Then ask: **“Which ONE would make the biggest difference if I improved it first?”** That becomes your first priority.

> 💚 **Transformation:** Move from **“My business needs work.”** to **“I know exactly where the biggest gap is.”**`,
    do: `Go through the checklist below and tick each area you’re happy with. Write your top 3 gaps, then choose the **one** to improve first.`,
    studio: { label: 'Set this week’s goal', screen: 'goal' },
    use: [
      { type: 'checklist', title: 'Business Basics Health Check — tick the areas you’re happy with', group: 'planning', free: true, items: [
        'Business clarity — people can quickly understand what I do',
        'Your customer — I know who I am trying to attract',
        'Your offer — it is clear what I am selling and why it matters',
        'Pricing — my pricing makes sense for my customer and my business',
        'Instagram — people can understand, trust and buy from my page',
        'Content — my content attracts, educates, builds trust and sells',
        'Customer journey — it is easy to buy from me',
        'Sales — I understand how interest becomes a sale',
        'Trust — I give customers enough reason to feel confident',
        'Repeat business — I know what happens after the first sale',
        'Organisation — I have simple systems',
        'Money — I understand my numbers',
        'Goals — I know what I am working towards',
      ] },
      { type: 'worksheet', title: 'My top 3 gaps', group: 'planning', free: true, fields: [
        { label: 'Gap 1' },
        { label: 'Gap 2' },
        { label: 'Gap 3' },
        { label: 'Which ONE would make the biggest difference if I improved it first?', hint: 'This becomes my first priority' },
      ] },
    ],
  }),

  'Set Your 90-Day Business Goal': P({
    summary: 'Choose one clear direction for the next 90 days, make it SMART, and take your first action this week.',
    learn: `Now that you have reviewed your business, choose one clear direction for the next 90 days. Do not try to improve everything. **Choose one main result.**

## Step 1 — Choose your goal

Ask: **“What result would make the biggest difference to my business over the next 90 days?”**

Examples:

- Increase enquiries
- Increase sales
- Improve repeat business
- Become more consistent
- Improve Instagram
- Launch one clear offer
- Get more reviews

## Step 2 — Make it SMART

Use this formula: **I want to [RESULT] by [MEASURE] within 90 days because [WHY IT MATTERS].**

- **S — Specific:** what exactly do you want?
- **M — Measurable:** how will you measure it?
- **A — Achievable:** is it realistic?
- **R — Relevant:** does it matter to the business?
- **T — Time-bound:** your deadline is 90 days.

Example: **I want to generate 20 qualified enquiries within 90 days because I need a more consistent sales pipeline.**

## Step 3 — Choose 3 priorities

What 3 things are most likely to help you reach the goal?

## Step 4 — Create weekly actions

What should happen regularly? Examples:

- Promote your offer twice a week
- Follow up every Friday
- Post 3 useful pieces of content
- Ask customers for reviews
- Review sales weekly

## Step 5 — Take your first action

Do not wait until next month. What can you do within the next 7 days?

## Step 6 — Review at 30, 60 and 90 days

**30 days:**

- What have I done?
- What is working?
- What needs adjusting?

**60 days:**

- Am I moving towards the goal?
- What should I continue?
- What should I change?

**90 days:**

- Did I reach the goal?
- What improved?
- What did I learn?
- What should my next focus be?

## 💚 Final Start Here message

You do not need to have everything figured out. You just need to know:

- **Where you are.**
- **What needs attention.**
- **What you are working towards.**
- **What your next action is.**

Then take it one step at a time.

> 💚 **Auntie Tobi reminder:** Clarity before activity. Action before information overload. Consistency before constantly changing strategy. Progress before perfection.

Now you are ready to start using Business Studio properly. 💚`,
    do: `Fill in **My 90-day business goal** below. Add your weekly actions to your to-do list as repeating tasks, and put your first action on a date in the next 7 days.`,
    studio: { label: 'Open my to-do list', screen: 'todo' },
    use: [
      { type: 'worksheet', title: 'My 90-day business goal', group: 'planning', free: true, fields: [
        { label: 'My goal is', hint: 'e.g. Increase enquiries' },
        { label: 'My SMART goal', hint: 'I want to [RESULT] by [MEASURE] within 90 days because [WHY IT MATTERS]', long: true },
        { label: 'Priority 1' },
        { label: 'Priority 2' },
        { label: 'Priority 3' },
        { label: 'Weekly action 1', hint: 'e.g. Follow up every Friday' },
        { label: 'Weekly action 2' },
        { label: 'Weekly action 3' },
        { label: 'My first action is' },
        { label: 'I will complete it by' },
      ] },
      { type: 'worksheet', title: '30, 60 & 90-day goal review', group: 'planning', free: true, fields: [
        { label: '30 days — what have I done, what is working and what needs adjusting?', long: true },
        { label: '60 days — am I moving towards the goal? What should I continue or change?', long: true },
        { label: '90 days — did I reach the goal? What improved, what did I learn and what is my next focus?', long: true },
      ] },
    ],
  }),
};
