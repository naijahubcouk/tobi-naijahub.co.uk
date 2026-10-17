# Auntie Tobi Business Studio — setup guide

Members' app: **/studio** · Admin: **/studio-admin**
Nothing in the public Auntie Tobi app is changed. Test everything on a preview branch first.

---

## Your addresses (Netlify project: aesthetic-monstera-8a2d85)

| What | Preview (studio branch) | Live |
|---|---|---|
| Member Studio | https://studio--aesthetic-monstera-8a2d85.netlify.app/studio | https://www.auntietobi.co.uk/studio |
| Admin | https://studio--aesthetic-monstera-8a2d85.netlify.app/studio-admin | https://www.auntietobi.co.uk/studio-admin |
| Stripe webhook | https://studio--aesthetic-monstera-8a2d85.netlify.app/.netlify/functions/studio-stripe-webhook | https://www.auntietobi.co.uk/.netlify/functions/studio-stripe-webhook |

---

## 1. Where each file goes in GitHub

Upload to a **new branch called `studio`** (not `main`).

| File in this zip | Goes to (in the repo) | New or changed |
|---|---|---|
| `studio.html` | repo root | New |
| `studio-admin.html` | repo root | New |
| `studio-qr.js`, `studio-manifest.json` | repo root | New — QR codes (served from your own site) and the “add to home screen” app settings |
| `netlify/functions/studio-auth.mjs`, `studio-api.mjs`, `studio-billing.mjs`, `studio-admin.mjs`, `studio-growth.mjs`, `studio-money.mjs`, `studio-resources.mjs`, `studio-extras.mjs`, `studio-page.mjs`, `studio-daily.mjs`, `studio-unsubscribe.mjs`, `studio-stripe-webhook.mjs`, `studio-maintenance.mjs` | `netlify/functions/` | New — Netlify's current function format (needed for safe allowance counting) |
| `netlify/functions/studio-lib/` (whole folder, including `handlers/`) | `netlify/functions/studio-lib/` | New — shared Studio code (not functions themselves) |
| `_redirects` | repo root | **Changed** — 4 lines added after `/business-club` |
| `netlify.toml` | repo root | **Changed** — daily `studio-maintenance` schedule added |
| `package.json` | repo root | **Changed** — adds `@netlify/blobs` 10.7.13 (Netlify installs it automatically) |
| `STUDIO-SETUP.md` | optional — this guide | Don't need to upload |

Why the three changed files matter:
- **`_redirects`** makes `/studio` and `/studio-admin` work (they must sit above the `/* /index.html 200` line at the bottom).
- **`package.json`** pins the storage library to a version that supports safe "only-if-unchanged" writes. That is what stops two simultaneous requests overspending an allowance. Your knowledge base functions use the same library and are unaffected.
- **`netlify.toml`**: only a comment line; the daily tidy-up is scheduled inside `studio-maintenance.mjs`.

> Heads-up: `send-push.js` edits `_redirects` on `main` when you send a notification. Before merging `studio` into `main`, re-download the latest `_redirects` from `main`, and re-add only the 4 Studio lines.

---

## 2. Preview deploy (test before going live)

1. Netlify → **Site configuration → Build & deploy → Branches and deploy contexts** → Branch deploys: **Let me add individual branches** → add `studio`.
2. Push/upload the files to the `studio` branch. Netlify builds it at
   `https://studio--<your-site-name>.netlify.app/studio`
3. Live auntietobi.co.uk keeps running from `main` and is untouched.

Note: Netlify Blobs data is shared by the whole site, so test members you add on the preview will still be there after go-live. Delete them in the admin by setting them inactive, or just leave them.

---

## 3. Environment variables

Netlify → **Site configuration → Environment variables**. Each can have different values per deploy context (Production / Branch deploys).

| Variable | What it is | Required |
|---|---|---|
| `STUDIO_SECRET` | Long random string (at least 32 characters). Generate at e.g. 1Password, or type 40+ random characters. Keep it secret, never change it after launch | ✅ |
| `STUDIO_ADMIN_EMAILS` | Your admin email(s), comma-separated, e.g. `seun@…` | ✅ |
| `RESEND_API_KEY` | From Resend (section 4) | ✅ |
| `STUDIO_EMAIL_FROM` | e.g. `Auntie Tobi Studio <studio@auntietobi.co.uk>` | ✅ once your domain is verified in Resend |
| `OPENROUTER_API_KEY` | **Already set** — reused automatically | ✅ (exists) |
| `STUDIO_OPENROUTER_API_KEY` | Optional separate OpenRouter key just for the Studio, with its own credit limit (recommended) | Optional |
| `STUDIO_MODEL` | Defaults to `openai/gpt-4o-mini` (same as the chatbot) | Optional |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` on preview, `sk_live_…` in production) | For Business Studio Pro |
| `STRIPE_PRICE_POWER_MONTHLY` | Price ID of the £5/month price (`price_…`) | For Business Studio Pro |
| `STRIPE_PRICE_POWER_YEARLY` | Price ID of the £50/year price (`price_…`) | For Business Studio Pro |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the webhook endpoint (`whsec_…`) | For Business Studio Pro |
| `STUDIO_SITE_URL` | `https://www.auntietobi.co.uk` in production (leave blank on preview) | Production |
| `ONESIGNAL_API_KEY` | **Already set** for your app's notifications — reused for the Studio daily reminder. Make sure its scope includes Functions | For reminders (exists) |
| `STUDIO_WEEKLY_EMAIL_MAX` | Most weekly round-up emails sent per day (default 60, to stay inside Resend's free 100-a-day limit alongside sign-in codes). Raise it if you upgrade Resend | Optional |
| `STUDIO_EMAIL_MODE` | Set to `log` **on Branch deploys only** if you want to test before Resend is ready — codes appear in Netlify function logs instead of email. **Never set this in production.** | Testing only |

Without Stripe variables the Studio still works for Business Club members; Business Studio Pro just can't be bought yet. If only one price is set, only that plan is offered.

---

## 4. Resend (sends the sign-in codes)

1. Sign up at resend.com (free: 3,000 emails/month, 100/day).
2. **Domains → Add domain** → `auntietobi.co.uk`. Add the DNS records it shows in **Netlify → Domains → auntietobi.co.uk → DNS settings**. Verification takes a few minutes.
3. **API keys → Create** (permission: Sending access) → paste into `RESEND_API_KEY`.
4. Set `STUDIO_EMAIL_FROM` to an address on that domain.

Until the domain is verified, Resend only lets you send to your own Resend account email — fine for your first test.

---

## 5. Stripe (Business Studio Pro — £5/month or £50/year, sold to anyone)

Do this in **Test mode** first (toggle top-right in Stripe).

1. **Product catalogue → Add product**: name "Business Studio Pro". Add **two recurring prices** on the same product:
   - **£5.00 GBP monthly** → copy its Price ID to `STRIPE_PRICE_POWER_MONTHLY`
   - **£50.00 GBP yearly** → copy its Price ID to `STRIPE_PRICE_POWER_YEARLY`
2. **Developers → API keys** → Secret key → `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**
   - URL: `https://studio--<your-site>.netlify.app/.netlify/functions/studio-stripe-webhook` (preview), later `https://www.auntietobi.co.uk/.netlify/functions/studio-stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`.
4. **Settings → Billing → Customer portal**: turn on "Cancel subscriptions" (choose **at end of billing period**), "Update payment methods", and **"Switch plans"** — add the Business Studio Pro product with both prices so people can move between monthly and yearly. Save.
5. **Settings → Billing → Subscriptions and emails**: turn on Smart Retries and failed-payment emails.
6. Test with card `4242 4242 4242 4242`, any future date, any CVC.
7. For launch, repeat steps 1–4 in **Live mode** and put the live values in the **Production** context.

---

## 6. First run checklist (on the preview)

1. Open `/studio-admin`, sign in with your admin email.
2. Overview shows any missing setup in yellow.
3. Members → **Add member** with your own second email, status Active, expiry in a year.
4. Open `/studio` on your phone, sign in with that email, complete the business profile, create a caption.
5. Check the dashboard counter went down by 1 and the admin shows the usage and cost.
6. Account → Business Studio Pro → Monthly → pay with the test card → dashboard shows 100 a day.
7. Account → Switch plan, manage or cancel → switch to yearly → Account shows "Yearly".
8. In a private browser window, open `/studio` → **Get Business Studio Pro** with a different email → pick a plan → pay → you land in the Studio with 100 a day. The admin Members list shows them as "Business Studio Pro".
9. Cancel that subscription (in Stripe, cancel immediately) → they can still sign in and see their library, but can't create.
10. Admin → tick **Block account** on a test person → they're signed out with no access.

When happy: merge `studio` into `main` (keeping the latest `_redirects` from `main`), set production variables, done.

---

## 7. How it behaves

- **Who gets in**: Business Club members (added by you, status active, not expired) get **20 generations a day**. Anyone with paid **Business Studio Pro** gets **100 a day**, whether or not they're a Club member. Business Studio Pro and Business Club are independent — one ending doesn't affect the other.
- **Buying Business Studio Pro**: on the sign-in page, "Get Business Studio Pro" → confirm email with a code → choose monthly (£5) or yearly (£50) → pay on Stripe. Their Studio account is created only after payment succeeds.
- **When Business Studio Pro ends** (and they're not a Club member): they can still sign in to view, edit and copy their library, with a "Renew Business Studio Pro" button. No new content.
- **What counts as a generation**: every Create or Regenerate that returns a result = 1, for every tool (including Content ideas, which gives 6 ideas). **A 30-day plan = 3.** Editing, copying, saving, browsing and profile changes are free. Failed requests are not charged. Allowances reset at **midnight UK time**; unused generations don't carry over.
- **Sign-in**: email + 6-digit code (10-minute expiry, single use, 5 wrong tries max, rate-limited). Device stays signed in up to 30 days of inactivity; fresh code at least every 90 days and before any payment action.
- **Abuse protection**: allowance checked and reserved atomically on the server; double-clicks replay the first result; max 2 requests in flight and 6 per minute per person; output-length caps per tool. Content ideas avoid repeating the person's recent ideas.
- **Spending**: never blocked. You get an **email and an admin alert when monthly AI spend passes £30**, and again at £60. Change the amount in Admin → Allowances & limits.
- **Payments**: every subscription is tied to a verified email's Stripe customer. Stripe is re-checked on every webhook, so missed or repeated events self-correct. A second subscription is blocked, and one that slips through is cancelled and refunded automatically. Failed payment → Business Studio Pro paused until paid (Club members keep their 20 a day). **Block account** in the admin removes all access, signs them out everywhere and stops Business Studio Pro renewing.

---

## 7b. Growth features (free — never use the AI allowance)

- **Today** (home page): 3 actions a day (content, customers, visibility) **written by AI for each business** from its profile, channels, products, weekly goal and the date. Free for members (not counted); about 0.03p per member per day, shown in Studio spend. Same 3 all day; recreated straight away when the profile or goal changes (ticked-off ones kept). "Show me different actions" up to 3 times a day. If the AI is unavailable, ready-made templates are used instead. "Do it" opens the right tool already filled in; creating from it ticks the action off.
- **Quick create**: Promote my product, Get engagement, Thank my customers, Announce availability. One tap creates a hook, caption, call to action, hashtags and Story idea (1 generation).
- **Weekly goal**: more enquiries, more bookings, promote a new product, or get seen. Shapes the daily actions. No results are promised.
- **Plan**: the 7/30-day planner fills a calendar (one post per day). Each post can be marked To do / Drafted / Posted / Done, and "Create this" turns it into a caption or Reel. New plans keep anything already drafted or posted, and avoid recent topics.
- **Track**: members record enquiries, bookings, sales, sales value and posts. A weekly summary (template-based) compares with last week and gives simple suggestions — based only on what they entered.
- **Admin → Overview → Pilot**: members active, daily actions completed, check-ins and posts marked posted in the last 7 days.

---

## 7c. Recognising businesses (listing, website, channels)

- **Is this your business?** If a member's sign-in email matches the email on an Auntie Tobi listing, setup starts by asking them. "Yes" links the listing and fills in their details; "No" won't ask again. Only listings with an email in `netlify/functions/directory.json` can be matched this way — the live list in `index.html` has no emails.
- **Find your business (setup step 1):** members paste their Auntie Tobi listing link (fills name, category, location, description, WhatsApp, Instagram, website) and/or their website. "Read" fetches the public web page (private/internal addresses blocked, 8-second limit) and one small AI call drafts category, location, products, customers and description. This doesn't use the member's generations; its cost (about 0.05p) shows in Studio spend. Limited to 6 reads an hour per member. Everything is shown for them to check before saving.
- **Paste a link:** otherwise members can paste their listing link (`auntietobi.co.uk/biz/...`) and/or website in "Where customers find you". All listings in the live app can be found this way (read from your site and cached for 6 hours).
- **Channels:** members tick where customers find them (Instagram, Facebook, TikTok, WhatsApp, Website, Auntie Tobi listing, Google Business) and where posts should send people. Calls to action, links, hashtags and daily actions follow this.
- **Promote my Auntie Tobi listing** quick-create button appears once a listing is linked (1 generation).
- **Admin:** Members shows each person's listing, website and channels; "Remove listing link" fixes a wrong link.

---

## 7d. Money, brand kit and sharing (free — no AI, never uses the allowance)

- **Track → £ Money:** quotes, invoices and receipts. Members add their document details once (business name, contact, bank account name, sort code, account number, payment terms, optional VAT number and footer). Numbers run INV-0001, QUO-0001, REC-0001. Statuses: Draft, Sent, Paid, Cancelled; "Overdue" shows automatically after the due date. A quote turns into an invoice in one tap; "Mark paid & make receipt" marks the invoice paid and creates the receipt. Only drafts can be deleted.
- **Sending:** "Send on WhatsApp" opens WhatsApp with a ready message (and a polite reminder when overdue) including the bank details and reference. "Save / share image" makes a branded picture of the document; "Save as PDF" uses the phone's print screen.
- **Privacy:** bank details are stored with the member's account (Netlify Blobs, `money-settings/`) and only appear on their own documents. Admin doesn't show them. The page reminds members it isn't accounting or tax software.
- **Brand kit (Account):** logo (resized on the phone, max ~200 KB, stored at `logos/`), main and accent colours, and font style (Modern, Elegant, Bold). Used on documents and post images.
- **Make an image:** every result has "Make an image": 6 styles (Offer, Tip/quote, Taking orders, Thank you, News, Plain), square post or story size, optional background photo. Images are drawn on the phone — photos are never uploaded and nothing is stored.
- **Share:** every result has "Share" (the phone's share menu; on computers, WhatsApp or copy).
- **I posted this:** adds 1 to today's posts in Track, shows "Posted" in the Library, and marks the calendar post as posted when it came from the calendar or a daily action.

---

## 7e. Resources — Your Business Growth Library (Business Club only, free)

- **Members:** Library tab → **📚 Resources**. Search, Continue learning, featured collections (e.g. Month 1 — Getting Visible), New this month, Recommended for their business (from the industry in their profile; they can hide it), saved resources, progress, and the 6 module cards. Each lesson has LEARN, SEE (a clearly labelled fictional example), DO and USE (checklists that tick, copyable templates, worksheets that save, downloadable files, pricing calculator), plus Save and Mark complete. Lessons can include a button that opens the right Studio tool or screen (tools still use 1 generation when they tap Create; reading never does).
- **Who can see it:** active Business Club members only. Business Studio Pro-only customers and expired members see a "part of Business Club" page. Progress is stored per member (`learn/`) and nobody else can see it.
- **You (Studio Admin → Resources):** add and edit lessons without code — module, order, title, description, Draft / Published / Coming soon, publish date (schedule ahead), feature on homepage + collection name, who to recommend it to, cover image, LEARN/SEE/DO text, a Studio button, USE resources (checklist, template, worksheet, file up to 3.5 MB, pricing calculator), sources, last reviewed date and review period, and a note at the bottom. "Preview" shows the text before you publish.
- **Dashboard:** published, drafts, scheduled, coming soon, new this month, views and completions this month, most viewed, most completed, and **needs review** (lessons past their review period or never reviewed — use 6 months for Instagram/WhatsApp lessons).
- **Formatting in lesson text:** `## Heading`, `- bullet`, `1. numbered`, `**bold**`, `> Tip box`, `[link text](https://…)`; blank line between paragraphs.
- **Launch content** loads automatically the first time Resources is opened. Your edits and deletions are never overwritten by later updates.

---

## 7f. Everyday helpers (all free — no AI)

- **Create → Free tools:** Make an image, Price list page, Review link & QR, Quote or invoice. None use generations.
- **Today → Get set up:** a 6-step checklist (profile, logo & colours, invoice details, weekly goal, first lesson or first post, review link). Members can hide it; it disappears when done.
- **Today → To chase:** overdue invoices, invoices due within 2 days, and quotes sent more than 3 days ago with no invoice. One tap opens WhatsApp with a polite message; "Later" hides it for 3 days.
- **Today → A lesson for you** (Business Club): picked from their numbers — e.g. enquiries but no sales → the follow-up lesson; no posts this week → captions/content lessons.
- **Follow-ups (Today + Track → Follow-ups):** members tap **+ Log enquiry** (name, WhatsApp, what they asked about, where they found them, rough value). It adds 1 to today's enquiries in Track. Studio reminds them on Today to follow up after **2 days, then 7 days** (members change the defaults or per person), with the WhatsApp message pre-written for them to check and send. Buttons: Booked (adds 1 booking in Track), Not now (with an optional check-back date), Tomorrow. After a booking: a thank-you with their review link the next day, then **keep in touch monthly** by default (off, 2 weeks, monthly, 2/3/6 months or yearly; "Friendly ideas" or "Rebook reminder"). A quote created from an enquiry moves it to Quoted, and when the invoice is paid it becomes Booked automatically (no duplicate quote reminder). Monthly stats show enquiries, bookings, booked rate and where enquiries came from. The Monday email lists follow-ups due. Studio never sends messages itself.
- **Track → Customers:** built automatically from quotes, invoices and receipts (name, phone, orders, spent, unpaid, last order), with Message again, Ask for a review and New invoice.
- **Review link & QR:** members save their Google/Auntie Tobi/other review link; Studio makes a branded QR card to print or share, and a ready review-request message. QR codes are made on the phone (`studio-qr.js`), no outside service.
- **Price list page:** members add products, prices, photos and their WhatsApp number, choose a link and publish at **`/p/their-link`**. Each item has an "Order on WhatsApp" button. The page only shows while their Club membership or Business Studio Pro is active. **Admin → Members → Manage** shows the page and has **Take page down**. Links are first come, first served; a few words (admin, studio, auntietobi…) are reserved.
- **Weekly round-up email:** Monday mornings (with Tuesday/Wednesday catch-up if there are many members): last week's numbers, unpaid/overdue invoices, quotes waiting, this week's focus and a lesson. Members turn it off in Account or with the unsubscribe link. Sent from `studio-daily` (07:52 UTC daily).
- **Add to home screen & daily reminder:** Studio installs like an app (Android: one tap; iPhone: Share → Add to Home Screen). Members can turn on an ~8am reminder in Account → Phone app & reminders. It uses your existing OneSignal app, tagged `studio_reminder`, so Studio reminders only go to people who turned them on.
- **Testing note:** scheduled jobs (weekly email, reminders) only run on the **live** site, not branch previews, and OneSignal only works on your live domain. Everything else can be tested on the preview.

---

## 7g. Business Club benefits tracking

- **Admin → Benefits:** every active Business Club member with their current membership year: Business Spotlight (not yet / scheduled / done, date, link), Featured Business, Marketplace, verification badge, Story shares, post/Reel reposts and discovery features (counts), last shared, Business Check-Up, and Studio use (AI generations this month, posts in the last 30 days). Quick **+Story / +Repost** buttons log a share in one click.
- **Filters to help you choose who to promote:** Longest since shared, Spotlight not done, Ends within 60 days with no Spotlight, Check-Up not done, Featured/Marketplace to set up.
- **Open** (or Members → Manage → Business Club benefits) edits everything, logs shares with a date and note, and records the Check-Up: done/date, **private notes** (admins only) and up to 5 **agreed priorities**.
- **Members see:** the priorities on their Today screen (they tick them off — you see progress), and **Account → My Business Club benefits** (what they've had, plus WhatsApp buttons to plan their Spotlight, send a Marketplace product, ask about verification or book their Check-Up). They never see your notes.
- A membership year is tied to the member's expiry date: when you renew someone (new expiry), a fresh year starts and earlier years are kept.

---

## 7h. Business Club payment link → automatic Studio access

When someone pays your **£50 Business Club Stripe payment link**, the Studio automatically:
- creates (or renews) their account with the email they paid with — active for **12 months** (a renewal adds 12 months to their current expiry, so no days are lost; an expired member gets 12 months from today);
- emails them a welcome with the link to `/studio` (they sign in with that email — a 6-digit code, no password);
- emails you and adds an Alert ("New Business Club member" / "Business Club renewal");
- uses the payment form's **Business name** custom field (if you add one) as the member name.

Refunds and disputes only **alert you** — access is never removed automatically. A blocked account that pays gets no access and you're warned.

**One-time Stripe setup (live mode):**
1. Stripe → **Payment Links** → open the £50 Business Club link → copy its ID (starts `plink_`). In Netlify add `STUDIO_CLUB_PAYMENT_LINK` = that ID (Production).
2. On the same link → **After payment** → "Don't show confirmation page" → redirect to `https://www.auntietobi.co.uk/studio?welcome=1`. (Optional: add a custom text field "Business name".)
3. Stripe → **Developers → Webhooks → Add endpoint**: `https://www.auntietobi.co.uk/.netlify/functions/studio-stripe-webhook`. Events: `checkout.session.completed`, `charge.refunded`, `charge.dispute.created` (plus the Business Studio Pro events in section 5 if you sell Business Studio Pro). Copy the signing secret into Netlify as `STRIPE_WEBHOOK_SECRET` (Production).
4. Admin → Overview shows **Business Club auto-access: On** when both are set.

---

## 8. Running costs (estimates — check current prices)

| Service | Cost |
|---|---|
| Netlify (functions, storage) | Within your current plan for this volume |
| Resend | Free up to 3,000 emails/month |
| OpenAI `gpt-4o-mini` via OpenRouter | ≈ £0.0003 per generation; a 30-day plan ≈ £0.0015 (counted as 3). Worst case if someone uses every generation every day: Business Club ≈ £0.24/month, Business Studio Pro ≈ £1.20/month typical, ≈ £4.50/month if they made only 30-day plans |
| Stripe (UK cards) | ≈ 1.5% + 20p per payment, plus Stripe Billing ≈ 0.7% → about 31p on each £5 payment, about £1.30 on each £50 payment |

The admin "Usage & costs" page shows the actual AI cost per month and per member.

## 7i. Marketplace — listings with review

- **Members:** Studio → Account → Your links → **Marketplace listing**. Each Business Club member gets **1 listing**; give more in Studio Admin → Marketplace → *Extra listings for members*. Members can edit any time — every change is reviewed, and the live version stays up meanwhile. Member listings show only while their Club membership is active.
- **Anyone you send the link to:** `https://auntietobi.co.uk/marketplace/list` (not indexed by search engines). No code needed — it's free and goes to your review queue (spam trap + 3 a day per email, 6 a day per connection).
- **Admin:** Studio Admin → **Marketplace**: *To review* (with before/after for changes) → Approve / Request changes / Reject — the person is emailed each time. *Live* / *All*: edit, pin to top, hide, set an end date, assign an owner (so a member can edit it in Studio), delete.
- Approving a Club member's listing ticks **Marketplace listing ✓** in their Benefits.
- The Marketplace page and the app load live listings from `/.netlify/functions/studio-market?feed=1` (cached ~1 minute). The hard-coded lists in `marketplace.html` / `index.html` are now only a fallback if that can't load — manage products in Admin, not in the code.
- The 11 products that were hard-coded were imported automatically on first use (`studio-lib/market-seed.js`).
- **Link to the business listing:** the public form, the Studio form and the admin editor all have *Find your business on Auntie Tobi* — a search over the business directory (`studio-market?bizq=…`, never returns emails). The chosen listing is checked on the server; unknown ones are dropped. The review card shows the link with a check: ✓ email matches the listing / ⚠️ different email / no email on file.
- **Club members using the form link** (in the welcome email and My benefits): if the email belongs to an active Club member, the submission becomes their member listing (counts as their 1, editable in Studio).
- **Verify your Business** (Studio → My benefits → Verification badge, and on the Today checklist): members send their Companies House link or number. Admin → Benefits → *Verification requests* → open the member → *Check on GOV.UK* → **Verify** or **Not eligible** (they're emailed either way; Verify sets the badge and shows on their Today screen). The blue tick on their business listing in the app comes from the directory in `index.html` — set `verified:true` there after verifying. (Companies House is not part of Marketplace listings.)
- **Today checklist** for Club members now includes *Add your Marketplace listing* and *Verify your business*.

## 7j. Business Studio Pro (was "AI Power") and the "Business Studio" name

- **Business Club** (£50/year): Business Studio with 20 AI a day, Library resources, and all Auntie Tobi promotion.
- **Business Studio Pro** (£5/month or £50/year, the same Stripe prices as before): all Business Studio tools, 100 AI a day and the Library resources — **no** promotion (Spotlight, Featured, Marketplace, reposts, verification, Check-Up). Club members can add Pro to get 100 a day.
- For now Pro is only offered inside the Business Studio (Account → Business Studio Pro, and the "Want more?" prompt) — not on the sign-in page or the Business Club page.
- In Stripe, rename the product to **Business Studio Pro** (Products → your AI Power product → Edit) so checkout and receipts show the new name. Prices and subscriptions don't change.
- Optional: set `STUDIO_EMAIL_FROM` to `Auntie Tobi Business Studio <studio@mail.auntietobi.co.uk>` so emails show the new name.
- Lesson text now says “Business Studio” (seed update 8). Lessons you've edited or approved in Admin are left as they are.

## 7k. Admin daily to-do list (Business Studio Admin → Today)

- Opens first when you sign in to Business Studio Admin. Sections: **Overdue** (anything from an earlier day not ticked — it stays until you mark it done or skip it), **To do today**, **Done today**.
- **Automatic tasks** (tick themselves once dealt with): verification requests, Marketplace reviews, lessons waiting for approval (grouped), Spotlights scheduled up to today, memberships ending within 14 days (with a WhatsApp renewal message), new alerts (marking one done also dismisses the alert), and shares owed — only the **5 members who've waited longest**, with +Story / +Repost / +Discovery buttons; the rest come up as those are done.
- **Your tasks:** one-off (a date), every day, weekdays, or one day a week. Days you didn't open Admin are filled in (up to 14 days) so missed ones show as overdue. Stopping a repeating task removes its open copies.
- No email — it's in Admin only. Stored in `admin-todo/state` and `admin-todo/defs`.

## 7l. Members' to-do list (Business Studio → Today)

- A **📋 My to-do list** card on Today: **Overdue** (not ticked on an earlier day — stays until ticked or skipped), **Today**, **+ Add a task** (once / every day / weekdays / one day a week), **Done today**.
- Also lists, automatically: **follow-ups due** (from their follow-up list), **overdue invoices**, and **Check-Up priorities** (Club). These tick themselves when dealt with; ticking a priority here also ticks it on the priorities card.
- Missed days (up to 14) are filled in so missed tasks show as overdue. Stored per member in `mtodo/<email>`.
- The **8am reminder** is now personal for each member with reminders on: “You have 4 tasks today, 1 overdue 💚”.


## 7m. Daily Business Tip (replaced "Your 3 actions today")

- **Today** now shows one **Business Tip** a day from Auntie Tobi as a business coach, written by AI for each business (profile, products, customers, weekly goal and the last 7 days of recorded numbers). Each tip has a headline, 2–3 sentences of coaching, a "Try this today" step and, where it fits, a **Help me do it →** button that opens the right tool or screen (Money, Customers, Follow-ups, Plan, Track, Resources).
- Topics rotate (pricing, customer service, repeat customers, reviews, social media, getting found, money, UK basics, time, mindset, products and offers) with no repeat within 6 days; the weekly goal makes matching topics more likely.
- Same tip all day — one AI call per member per day, only when they open Business Studio. Free for members; the cost (about 0.02p a tip) shows in Business Studio spend as `daily-tip`.
- If the AI is unavailable, a tip comes from the written library (`studio-lib/tips-library.js`, about 60 tips).
- **☆ Save tip** keeps tips; "Your saved tips" link under the card. Stored in `tips/<email>` (last 21 days + up to 60 saved).
- The weekly goal bar, 1-minute check-in and today's planned calendar post stay on Today.
- Morning push (no tasks): "Your Business Tip for today is ready 💡". The weekly email points to the tip.
- The old `today` action (3 actions) remains in the API only for older cached app versions.

## 7n. Members' to-do list — Coming up and See all

- The to-do card on Today now has **Coming up — next 7 days** (up to 5 items, grouped by day): members' own tasks with a future date, weekly tasks on their days, customer follow-ups falling due, and invoices falling due. Daily / weekday tasks aren't repeated there (they show under Repeating tasks).
- **See all →** opens the whole list: Overdue, Today, Coming up (next 30 days), Repeating tasks (with Stop) and Done (last 30 days), plus Add a task.
- Own future tasks can be ticked early (they won't come back on the day), skipped (weekly) or removed (one-off). Follow-ups and invoices in Coming up are shown for information with an Open button and appear to tick on their day.
- API: `studio-extras` `todo-today` with `{ full: true }` for the See all view.

## 7o. Listing writer — auntietobi.co.uk/listing

- Open page (no sign-in, no usage limit — Seun's choice). Paste an Instagram bio (+ optional handle and notes) → listing title = the business name, as 2 options that make sense of the username (Title Case, e.g. toluskitchen_leeds → Tolu's Kitchen); tap one to use it (it becomes the Business name and /biz/ link), meta description (140–160, with a Google preview), full description (120–200 words) and details pulled from the bio (name, category, section, location, phone, WhatsApp, email, website, Instagram, suggested /biz/ link). Copy buttons, "↻ New" per part, editable, last 20 kept on the device.
- Written for the Auntie Tobi business directory; never invents facts, leaves "[add location]" gaps.
- Function: `studio-listing` (`studio-lib/handlers/listing.js`). Bot trap: hidden field + page open > 1.5s + same-site header. Cost ≈ 0.03p a listing, in Business Studio spend as `listing`. `noindex`.

## 7p. Admin Today — one share row per type

- Share tasks are now one row per member per type: Story, repost (per week) and discovery feature (per month), e.g. "Share Ada Cakes: repost (1 of 2 done this week)".
- The row's **+1** logs ONE share of that type in the member's record (they see it in My benefits and get the usual push). The row stays and updates until the target is met, then ticks itself. An **Undo** shows for 6 seconds (`todo-share-undo`).
- **Skip** hides only that row for today. **Open record** opens the member's benefits.
- Still up to 5 members at a time (longest-waiting first); each can have 1–3 rows. Old combined share tasks are replaced automatically.

## 7q. Admin Today — Instagram on member tasks

- Every task about a member (shares, Companies House check, Spotlight, renewal, and Marketplace reviews from members or linked to an Auntie Tobi listing) shows **📷 @handle ↗**, opening their Instagram in a new tab.
- Handle comes from: the member's Business Studio profile → one added in Admin (`admin-ig/<email>`) → their Auntie Tobi directory listing.
- If none: "No Instagram on file · + Add Instagram" — paste a handle or link once (`member-ig-set`); ✎ changes one you added.
- Also fixed: between midnight and 1am UK time (BST), items ticked showed as not done today, new follow-ups were dated a day early, and lesson views could count twice — dates now use UK time.

## 7r. To-do lists show 10 at a time

- Admin → Today and the members' to-do card show at most 10 tasks (overdue first, then today) with **See all (N more) →**. Admin expands in place (Show fewer folds it back); members open the full to-do screen. Counts still include everything.

## 7s. Business Club invites (Admin → Club invites)

- Every business listed on Auntie Tobi (live app list + directory.json) with its category, location, WhatsApp, Instagram, email, phone and listing link. Club members (linked listing or same email) show as **Joined** automatically.
- Messages (benefits only, no offer) include the business name, **their own Auntie Tobi listing link** and the Business Club link: first invite → follow-up 3 days later → last check-in 7 days after that → stops. Edit them in **✎ Edit messages** ({name}, {listing}, {club}); "Reset to original" restores.
- WhatsApp opens with the message typed; Instagram copies it and opens their profile; Email opens a draft; Copy message. Then **✓ Mark as sent** schedules the next follow-up.
- Replies: Interested · Not now (check back in 30/60/90 days) · Not interested (never due again) · Joined. Notes & history per business; Reset.
- **To do today** = follow-ups due + new businesses to invite (default **5 a day**, change it at the top). Today list gets one "Business Club invites" task that ticks itself when they're done.
- Stored in `invites/state`. Admin actions: `invites-view`, `invites-act`, `invites-settings`.

## 7t. Club invites — emails for GHL campaigns
Every business row shows its email with **📋 Copy**. No email? **+ Add email**. Wrong email? **✎** to change it (saved on the invite record only — the public listing isn't changed; "Use the listing's email" undoes it).
Above the list (for whichever filter or search you're on):
- **📋 Copy all emails** — one per line, ready to paste into GHL.
- **⬇ Download for GHL (CSV)** — Name, Company Name, Email, Phone (+44), Category, Location, Instagram, Listing Link, Next Message, Tags. Import in GHL → Contacts → Import, then add them to your campaign.
- **✓ Mark these N as sent** — after they're in your campaign. Each moves on its own step (invite → follow-up in 3 days → 7 days → stop); Joined / Not interested / finished ones are skipped.

## 8. Auntie Tobi HQ — Content Hub (auntietobi.co.uk/hq)

Seun's private content organiser (chatting stays in ChatGPT Plus). Sign in with the admin email — same sign-in as Admin. **No AI is used, so there's no AI cost.**

- **📋 Paste from ChatGPT**: paste a whole reply; the free splitter (`/hq-split.js`, rules not AI) cuts it into idea cards wherever a new idea starts (Idea 1 / Post 2 / Reel: …, ### headings, bold titles, --- lines, numbered ideas — but numbered *steps* inside one idea stay together). Each card gets a type (post, Reel, carousel, Story, blog), topic, title, caption, hashtags and keyword line; chatty intros and "Would you like me to…" lines are dropped. A preview lets you remove, merge, retitle or change type before saving. "Keep as one card" if needed.
- **Content briefs** (the long ChatGPT "Content Brief" format with # sections, ### numbered ideas, tables of ideas, Story plans, motivations, "Verified details", suggested hashtags/keywords) are recognised automatically: one card per idea / table row; each Story plan becomes one Story card listing every frame; motivations and "posts to prepare next" become cards; "Verified details" and source links (utm tags removed) go into the matching card's notes; HOOK / Format / CTA are read; ALL-CAPS titles become Title Case; the brief's hashtags and keyword line go on every non-Story card without its own; intro and posting-plan tables are skipped; a "growth priority" note card is offered unticked. The preview groups cards by section with tick boxes and All / None per section. Dates in the brief are ignored.
- **＋ Quick add** for your own ideas; images can be added to any card (resized in the browser).
- **🗂️ Board**: 💡 Ideas → ✍️ Drafting → ✅ Ready → 📅 Scheduled → 📲 Posted (+ Archived). Search, filter by type/topic, ★ star. **👀 Review one by one** goes through Ideas: keep (Ready / needs work), skip or delete. 🗑 Delete goes to a 30-day bin with Undo.
- **📅 Calendar**: month view (agenda list on phones). Yellow planned, green posted, red missed. ＋ on a day picks an idea to plan there. A date makes a card Scheduled; removing it puts it back to Ready.
- **🏠 Today**: posts for today and any missed ones with **📋 Copy caption** (caption + keyword line + hashtags), **⬇ Download image**, **Open Instagram**, **✅ Mark as posted** (+ post link) and ↻ Reschedule; coming up next 7 days; counts.
- **📲 Posted**: everything posted with date, type and link; this week / month / total and by type.
- **Admin → Today** gets "🗓️ N posts planned for today" which ticks itself when they're marked posted.
- Function `studio-hq` (`studio-lib/hq.js`, `handlers/hq.js`); storage `hq/content` and `hq/img/*`. Nothing is ever posted automatically.

### Script and Caption (separate boxes)
- Each card has **🎬 Script** (what to film/say — hook, scenes, voiceover, on-screen text) above **✍️ Caption** (what goes under the post).
- Pasting from ChatGPT: lines labelled HOOK / SCENE / SCRIPT / VOICEOVER / ON-SCREEN TEXT / B-ROLL / SHOT / SLIDE n (and timings like "0–3s:") go to Script; "CAPTION:" goes to Caption; unlabelled text stays Caption. A HOOK on a plain post stays in the caption (it's the opening line) unless there are other script lines.
- Older cards with labelled text are split when opened (check, then Save).
- **📋 Copy caption** copies caption + keywords + hashtags only; **🎬 Copy script** copies the script.

### HQ team access (assistant sign-in)
- HQ → **👥 Team access** (only Seun sees it): add a name + email. They go to **/hq**, enter their email and get an "Auntie Tobi HQ code".
- Team members can paste, edit, plan, mark posted and delete in HQ only. Their session cannot open Business Studio Admin (separate `__Host-studio_hq` cookie, role `hq`, 7 days).
- Remove someone and they're signed out immediately (the team list is checked on every request). Stored in blob `hq/team`. Starts with Favour (hellofavouradentan@gmail.com).
- Cards show "Added by … · Last edited by …".
