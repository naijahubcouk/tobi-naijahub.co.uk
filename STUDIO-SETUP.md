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
| `netlify/functions/studio-auth.mjs`, `studio-api.mjs`, `studio-billing.mjs`, `studio-admin.mjs`, `studio-growth.mjs`, `studio-stripe-webhook.mjs`, `studio-maintenance.mjs` | `netlify/functions/` | New — Netlify's current function format (needed for safe allowance counting) |
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
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` on preview, `sk_live_…` in production) | For AI Power |
| `STRIPE_PRICE_POWER_MONTHLY` | Price ID of the £5/month price (`price_…`) | For AI Power |
| `STRIPE_PRICE_POWER_YEARLY` | Price ID of the £50/year price (`price_…`) | For AI Power |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the webhook endpoint (`whsec_…`) | For AI Power |
| `STUDIO_SITE_URL` | `https://www.auntietobi.co.uk` in production (leave blank on preview) | Production |
| `STUDIO_EMAIL_MODE` | Set to `log` **on Branch deploys only** if you want to test before Resend is ready — codes appear in Netlify function logs instead of email. **Never set this in production.** | Testing only |

Without Stripe variables the Studio still works for Business Club members; AI Power just can't be bought yet. If only one price is set, only that plan is offered.

---

## 4. Resend (sends the sign-in codes)

1. Sign up at resend.com (free: 3,000 emails/month, 100/day).
2. **Domains → Add domain** → `auntietobi.co.uk`. Add the DNS records it shows in **Netlify → Domains → auntietobi.co.uk → DNS settings**. Verification takes a few minutes.
3. **API keys → Create** (permission: Sending access) → paste into `RESEND_API_KEY`.
4. Set `STUDIO_EMAIL_FROM` to an address on that domain.

Until the domain is verified, Resend only lets you send to your own Resend account email — fine for your first test.

---

## 5. Stripe (AI Power — £5/month or £50/year, sold to anyone)

Do this in **Test mode** first (toggle top-right in Stripe).

1. **Product catalogue → Add product**: name "AI Power". Add **two recurring prices** on the same product:
   - **£5.00 GBP monthly** → copy its Price ID to `STRIPE_PRICE_POWER_MONTHLY`
   - **£50.00 GBP yearly** → copy its Price ID to `STRIPE_PRICE_POWER_YEARLY`
2. **Developers → API keys** → Secret key → `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**
   - URL: `https://studio--<your-site>.netlify.app/.netlify/functions/studio-stripe-webhook` (preview), later `https://www.auntietobi.co.uk/.netlify/functions/studio-stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`.
4. **Settings → Billing → Customer portal**: turn on "Cancel subscriptions" (choose **at end of billing period**), "Update payment methods", and **"Switch plans"** — add the AI Power product with both prices so people can move between monthly and yearly. Save.
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
6. Account → AI Power → Monthly → pay with the test card → dashboard shows 100 a day.
7. Account → Switch plan, manage or cancel → switch to yearly → Account shows "Yearly".
8. In a private browser window, open `/studio` → **Get AI Power** with a different email → pick a plan → pay → you land in the Studio with 100 a day. The admin Members list shows them as "AI Power".
9. Cancel that subscription (in Stripe, cancel immediately) → they can still sign in and see their library, but can't create.
10. Admin → tick **Block account** on a test person → they're signed out with no access.

When happy: merge `studio` into `main` (keeping the latest `_redirects` from `main`), set production variables, done.

---

## 7. How it behaves

- **Who gets in**: Business Club members (added by you, status active, not expired) get **20 generations a day**. Anyone with paid **AI Power** gets **100 a day**, whether or not they're a Club member. AI Power and Business Club are independent — one ending doesn't affect the other.
- **Buying AI Power**: on the sign-in page, "Get AI Power" → confirm email with a code → choose monthly (£5) or yearly (£50) → pay on Stripe. Their Studio account is created only after payment succeeds.
- **When AI Power ends** (and they're not a Club member): they can still sign in to view, edit and copy their library, with a "Renew AI Power" button. No new content.
- **What counts as a generation**: every Create or Regenerate that returns a result = 1, for every tool (including Content ideas, which gives 6 ideas). **A 30-day plan = 3.** Editing, copying, saving, browsing and profile changes are free. Failed requests are not charged. Allowances reset at **midnight UK time**; unused generations don't carry over.
- **Sign-in**: email + 6-digit code (10-minute expiry, single use, 5 wrong tries max, rate-limited). Device stays signed in up to 30 days of inactivity; fresh code at least every 90 days and before any payment action.
- **Abuse protection**: allowance checked and reserved atomically on the server; double-clicks replay the first result; max 2 requests in flight and 6 per minute per person; output-length caps per tool. Content ideas avoid repeating the person's recent ideas.
- **Spending**: never blocked. You get an **email and an admin alert when monthly AI spend passes £30**, and again at £60. Change the amount in Admin → Allowances & limits.
- **Payments**: every subscription is tied to a verified email's Stripe customer. Stripe is re-checked on every webhook, so missed or repeated events self-correct. A second subscription is blocked, and one that slips through is cancelled and refunded automatically. Failed payment → AI Power paused until paid (Club members keep their 20 a day). **Block account** in the admin removes all access, signs them out everywhere and stops AI Power renewing.

---

## 7b. Growth features (free — never use the AI allowance)

- **Today** (home page): 3 actions a day (content, sales, visibility) chosen from ready-made templates using the member's business type, products, weekly goal, day of the week and content calendar. Same 3 all day, new ones tomorrow, no repeats from the last 3 days. "Do it" opens the right tool already filled in; creating from it ticks the action off.
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

## 8. Running costs (estimates — check current prices)

| Service | Cost |
|---|---|
| Netlify (functions, storage) | Within your current plan for this volume |
| Resend | Free up to 3,000 emails/month |
| OpenAI `gpt-4o-mini` via OpenRouter | ≈ £0.0003 per generation; a 30-day plan ≈ £0.0015 (counted as 3). Worst case if someone uses every generation every day: Business Club ≈ £0.24/month, AI Power ≈ £1.20/month typical, ≈ £4.50/month if they made only 30-day plans |
| Stripe (UK cards) | ≈ 1.5% + 20p per payment, plus Stripe Billing ≈ 0.7% → about 31p on each £5 payment, about £1.30 on each £50 payment |

The admin "Usage & costs" page shows the actual AI cost per month and per member.
