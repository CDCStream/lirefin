# Lirefin Launch Roadmap

> **Last updated:** 2026-05-11  
> **Owner:** @CDCStream  
> **Status:** Phase 1 (Dodo live — wire production keys + smoke test → Web Store)

Single-document launch plan covering the path from "Dodo TEST mode works
end-to-end" all the way through Product Hunt and post-launch growth.

Read top-down: each phase is gated by the previous phase's exit criteria.
Tasks marked **[parallel]** can be done while waiting on a blocking
dependency.

---

## Current Snapshot

| System | Status |
| --- | --- |
| Backend (Railway) | Live, Dodo TEST mode wired |
| Database (Supabase) | Migration 003 applied |
| Extension v0.1.6 | Local build green, billing flow verified |
| Landing (lirefin.com) | Live on Vercel, privacy/terms/contact pages shipped |
| Dodo verification | **Live — payments active** |
| Production billing env | Flip `DODO_ENV=live_mode` + live PIDs when ready |
| Web Store submission | **Next** — after one real charge + refund drill |
| Public launch | After Web Store approval + billing-enabled extension zip |

---

## Phase 0 · Now → Dodo approval (~1-3 days)

Phase exit criteria: Dodo "Account approved" email received.

### 0.1 Dodo verification status check (10 min, you)

1. Dodo dashboard → **Settings** → **Account / Compliance / Verification**
2. Inspect each section, fix anything missing:
   - Business / personal info (sole proprietor: passport or national ID)
   - Tax info (Turkish TCKN or tax-resident country tax ID)
   - Bank account (USD/EUR receiver — TR USD/EUR account, Wise Business,
     or Revolut Business work)
   - Website verification (lirefin.com — already live; click
     "Submit for review")
   - Identity verification (selfie + ID upload)
3. Report back which step is pending. Stop polling until you receive
   the approval email — Dodo silently re-queues if you re-edit fields.

### 0.2 Web Store assets — **[parallel]** (3-4 hours, you)

None of these depend on Dodo. Do them while waiting.

#### A. Screenshots (1280×800 PNG, 5 total) — 2 hours

| # | Filename | Content |
| --- | --- | --- |
| 1 | `01-news-analysis.png` | Extension panel open on a financial news page (Yahoo Finance, Bloomberg). Bullish/bearish read visible. |
| 2 | `02-ticker-quote.png` | Hover-triggered ticker quote (e.g. AAPL). |
| 3 | `03-multi-language.png` | Analysis rendered in Turkish (showcase i18n). |
| 4 | `04-history.png` | History panel with prior analyses. |
| 5 | `05-pricing.png` | Pricing screen with the 5 paid plans (capture **after** Phase 1 — Dodo live mode). |

DevTools → Device Toolbar → custom 1280×800 viewport → screenshot. Capture
items 1–4 now; defer item 5.

#### B. Promo tile (440×280 PNG) — 30 min

- Brand gradient: `#2563eb` → `#10b981`, dark background
- Tagline: "AI-powered financial news analysis"
- Lirefin logo
- Tools: Figma, Canva, Photoshop. AI image generators acceptable for
  draft, but type stays human-typed for legibility.

#### C. Store listing copy — 1 hour (assistant will draft)

- Title (≤45 chars)
- Short description (≤132 chars)
- Detailed description (≤16,000 chars, supports markdown)
- Category: Productivity (recommended) or Finance
- Languages: en (primary) + tr, de, fr, es, it, ja, zh

#### D. Privacy policy URL ✅

`https://lirefin.com/privacy` already live. Verify accessibility before
submission.

### 0.3 Required fixes before submission — **[parallel]** (~5 hours)

None of these are optional. Each one is either a Web Store rejection
risk or a "you'll regret skipping it" production hygiene gap.

#### E. Refund policy page (1 hour, assistant)

Add `/refund` to the landing site (reuse `LegalLayout`). Cover:

- 30-day refund window via Dodo Customer Portal
- Pro-rata refund for unused subscription portion
- Credits don't expire when subscription ends — existing balance is
  preserved

**Why required:** Dodo (as Merchant of Record) and Web Store both
expect a published refund policy for paid extensions.

#### F. Account deletion flow (3 hours, assistant + you)

- New button in extension Settings: "Delete account & data"
- Confirmation modal: irreversible warning
- Backend `DELETE /api/auth/account` →
  - If active Dodo subscription, cancel via API first
  - `supabase.auth.admin.deleteUser()` (cascading deletes via existing
    `ON DELETE CASCADE` on FK columns)
- Test that all rows in `purchases`, `subscriptions`,
  `billing_customers`, `analyses`, `credit_balances` are removed

**Why required:** Web Store policy "User Data" disclosure mandates
in-product deletion. Skipping ≈ 30% rejection probability.

#### G. Sentry (45 min, assistant)

- 3 install points: backend (Railway), extension (background + popup),
  landing (Next.js)
- Free tier (5K events/mo) is enough for first 6 months
- Source maps uploaded for extension (so stack traces are readable)

**Why required:** Today, any production bug is invisible to you. One
silent webhook handler crash will cost more than the 45-minute setup.

#### H. UptimeRobot (10 min, you)

- Monitor `/health` endpoint every 5 min
- Email alert (and Slack if you have a workspace)
- Free tier supports 50 monitors

### Phase 0 total: ~10 hours of work + waiting on Dodo

---

## Phase 1 · Dodo approved → Live billing (~2 hours, same day as approval)

Phase exit criteria: real $5 charge succeeds end-to-end and is refunded.

### 1.1 Create live products (30 min, you)

Recreate (or reuse) **5 recurring subscription products in Dodo Live** that mirror
[`packages/shared/src/credits.ts`](../packages/shared/src/credits.ts) — this file is the
single source of truth:

| Tier | Monthly USD | Credits / month |
|------|-------------|-----------------|
| Starter | $5 | 350 |
| Standard | $10 | 750 |
| Pro | $25 | 2,000 |
| Power | $50 | 4,500 |
| Unlimited | $99 | 10,000 (marketing “Unlimited” pool) |

Paste the 5 live PIDs into the conversation.

### 1.2 Live API key + webhook secret (15 min, you)

- Generate live API key → paste it in chat
- Webhooks → New Endpoint:
  - URL: `https://fnibackend-production.up.railway.app/api/billing/webhook/dodo`
  - Subscribe to: same 9 events as test mode
  - Paste signing secret in chat

### 1.3 Railway env update + redeploy (5 min, you)

- `DODO_API_KEY` → live key
- `DODO_WEBHOOK_KEY` → live secret
- `DODO_ENV` → `live_mode`
- 5 product env vars → live PIDs
- Save → Railway auto-redeploys

### 1.4 Live mode end-to-end test (1 hour, you)

- Real card, smallest plan: Starter $5
- Verify the full chain:
  1. Checkout opens
  2. Real $5 charge clears
  3. Success page reaches "Confirmed" state, shows +350 credits
  4. Extension balance reflects the new total
  5. Dodo email receipt arrives
  6. Dodo dashboard shows the live transaction
- **Immediately refund** via Dodo dashboard → Refund full amount
- Confirm webhook delivery for the refund (`payment.refunded` /
  `subscription.cancelled`) lands in Railway logs

### 1.5 Capture pricing screenshot (15 min, you)

Live billing UI is now populated → capture screenshot 5 from Phase 0.2.A.

---

## Phase 2 · Web Store submission (~1 hour active + 3-7 day review)

Phase exit criteria: extension live in Chrome Web Store.

### 2.1 Final extension build (20 min, you + assistant)

1. Confirm `packages/extension/.env.production` has `VITE_ENABLE_BILLING=true`
2. Confirm `manifest.json` version is `0.1.6`
3. `pnpm --filter @fni/extension build`
4. `pnpm --filter @fni/extension zip:webstore` → `lirefin-v0.1.6.zip`
5. Manually unpack the ZIP, sideload in Chrome, smoke-test core flows
   (auth, analyze, checkout) one more time

### 2.2 Chrome Web Store Developer Dashboard (30 min, you)

1. Visit https://chrome.google.com/webstore/devconsole — confirm $5
   developer fee is paid
2. **Add new item** → upload ZIP
3. Fill out:
   - **Store listing**: paste copy from Phase 0.2.C
   - **Privacy practices**: tick every collection category accurately
     (user email, analysis history, IP)
   - **Privacy policy URL**: `https://lirefin.com/privacy`
   - **Permissions justification**: 1-2 sentences each for `activeTab`,
     `storage`, `identity`, host permissions
   - **Single purpose**: 1-2 sentences ("Lirefin reads financial news
     pages and provides AI commentary")
   - **Screenshots**: upload 5 PNGs
   - **Promo tile**: upload 440×280 PNG
   - **Category**: Productivity (recommended)
   - **Languages**: English (primary) + tr, de, fr, es, it, ja, zh
4. **Submit for review**

### 2.3 Review wait (3-7 days)

While waiting:

- Do **not** start launch marketing. There's no install link to share.
- Watch Dodo dashboard for live transactions (you can run another test
  on yourself).
- If rejected: Google emails the feedback (usually "permission
  justification weak" or "screenshot misleading"). Fix in 1-2 hours,
  resubmit.

---

## Phase 3 · Web Store approved → Soft Launch (Day 8-12)

Phase exit criteria: ≥50 organic installs, ≥5 paid conversions, no P0 bugs.

### 3.1 Launch day (1 hour, you)

1. Verify install link works publicly
2. Update `lirefin.com` Hero CTA: "Coming Soon" → "Add to Chrome — Free"
3. Push landing update to Vercel
4. Install fresh on a clean Chrome profile, run through the full flow

### 3.2 Soft launch — quiet organic test (Day 8-10)

Channels to use **before** Product Hunt:

- Personal Twitter/X — "Just shipped Lirefin — AI-powered financial
  news analysis. Get bullish/bearish read on any news article in 2
  seconds. lirefin.com"
- LinkedIn — same content, more professional tone
- Inner circle — WhatsApp, Discord groups, "would love your feedback"
- Indie Hackers — "Show IH" post

Goal: 50-100 installs, 5-10 paid conversions, **0 critical bugs**. Any
P0 ships immediately as v0.1.7 patch (Web Store update review: 1-3 days).

### 3.3 First 48-hour metrics watch (Day 9-11)

Track in Sentry + Supabase:

- Conversion funnel: Install → Sign-in → First analysis → Upgrade
- Drop-off points (where users quit?)
- Webhook error rate (target <1%)
- MRR (typical week-1: $50-200; lower → pricing/value prop issue)

---

## Phase 4 · Hard Launch — Product Hunt + parallel channels (Day 12-15)

Phase exit criteria: top-10 on Product Hunt + 500-2000 install spike.

### 4.1 Product Hunt prep (start D-7)

**Date selection:**

- ✅ Best: **Tuesday 00:01 PT** (10:01 Istanbul time)
- ❌ Avoid: Monday (slow algorithm warm-up), Friday-Sunday (low engagement)
- ❌ Avoid: US federal holidays, major sport finals, election days

**Prep checklist:**

1. **Warm up your PH account** (D-7): upvote 5-10 products, leave 2-3
   thoughtful comments, complete profile (avatar, bio, social links).
2. **Hunter** (optional): a hunter with high upvote authority can help
   with initial momentum. Not strictly required — self-submission is
   fine. If pursuing, DM 2-3 finance/AI hunters with a polite ask 1-2
   weeks ahead.
3. **Gallery**:
   - 1× 1270×760 thumbnail (hero shot or animated GIF)
   - 4-6× supporting images (extension flow)
   - 1× 30-60 second demo video (Loom is fine, no editing needed)
4. **Tagline** (≤60 chars): "AI-powered financial news analysis in 2 seconds"
5. **Description** (≤260 chars): value prop + 3 key features
6. **Maker first comment**: introduce yourself, the problem, why you
   built it, ask a question to invite discussion ("What's the most
   useful AI use case in finance for you?").
7. Add the **Maker badge** to your PH profile.

### 4.2 Launch day execution (Tuesday, ~14-18 active hours)

| Time (TSI) | Action |
| --- | --- |
| 10:01 (00:01 PT) | Go live on PH |
| 10:01-10:15 | Twitter + LinkedIn announcement |
| 10:15-14:00 | Reply to every comment within 15 min |
| 14:00-22:00 | Peak US hours — share milestones ("#X on PH right now") every 50 upvotes |
| 16:00-18:00 (09:00-11:00 PT) | Submit Hacker News: "Show HN: Lirefin..." |
| 18:00-22:00 | Reddit posts (see 4.3) |
| 22:00 onward | Sleep. Recheck in 8 hours. |

**Outcomes:**

- 🥇 Top 5 of the day = excellent (2,000+ install ramp)
- 🥈 Top 10 = good (500-1,000 installs)
- 📉 Outside top 20 = learn lessons, retry with v2 in 6 months

### 4.3 Parallel hard launch channels (same day or +1)

**Hacker News** — Tuesday 16:00-18:00 TSI (09:00-11:00 PT)

- Title: "Show HN: Lirefin — AI-powered financial news analysis (Chrome extension)"
- Older HN account preferred (new accounts get down-ranked)
- First-2-hour upvotes are critical for front page

**Reddit** — distribution map:

- ✅ r/ChromeApps — chill, relevant, always OK
- ✅ r/InternetIsBeautiful — friendly mods
- ✅ r/SideProject — indie maker community
- ⚠️ r/wallstreetbets, r/investing — **zero promo tolerance**, you'll
  get banned. Only acceptable framing: personal account, "I built this
  for my own use, sharing in case useful". Downvote risk is high.
- ⚠️ r/StockMarket — read rules first, marginal

**Indie Hackers**

- Milestone post: "Just shipped Lirefin to 1,000 users in 24 hours"
- Traffic is ~10% of PH but a focused community

**LinkedIn**

- Personal post in story format ("6 months ago, every morning while
  reading financial news...")
- Comment response speed is critical

**Twitter/X**

- Build-in-public threads: revenue, bugs, learnings
- Strategic DMs to finance Twitter influencers (cold DM hit rate is low
  without prior relationship)

**Secondary directories** (free listings, low traffic but SEO backlinks)

- BetaList, AlternativeTo, SaaSHub, StackShare, Launching Next

### 4.4 Press / outreach (start D-3, follow up on launch day)

**Cold-pitch targets:**

- TechCrunch (long shot, high reward)
- The Verge (covers extension news)
- 9to5Google (Chrome ecosystem)
- Product Hunt's own newsletter (top launches auto-featured)
- Turkish market: Webrazzi, ShiftDelete

**Cold email template:** 80-120 words, value prop + niche fit + screenshot.

**Hit rate:** 2-5%. Send 50 → expect 1-2 stories.

---

## Phase 5 · Post-launch growth (Day 16+)

### Weeks 1-2 (Day 16-30)

- **Daily**: Sentry / Supabase / Dodo / Web Store reviews check
- Collect user feedback — pay special attention to 1-3 star reviews
  (what didn't they get?)
- Bug fix sprint: v0.1.7 / v0.1.8 patches as needed
- Email "We're live!" blast to waitlist (if you collected one in Phase 3)

### Month 2 (Day 30-60)

- Ship 2-3 free tools (SEO magnets — see ideas below)
- Publish first 5 blog posts (AI-assisted draft, you edit, ~1-2 per week)
- Add schema.org markup, OG cards, GA4, Google Search Console
- Cookie consent + Consent Mode v2 banner
- 1:1 outreach to Pro/Power tier users → testimonials + feedback

### Month 3 (Day 60-90)

- Firefox + Edge add-on store ports (each: 30 min - 2 hours)
- Discord community (private channels for Pro/Power tiers)
- Affiliate / referral program (Dodo supports natively)
- Native-speaker review of i18n quality
- Pricing review: LTV/CAC by tier, possibly raise/repackage plans

### Months 4-6 — Scale

- Paid ads experiments (Google Ads on "financial news AI", Reddit Ads
  on finance subreddits)
- Content partnerships (finance newsletters cross-promo, Substack
  writers free Pro)
- Mobile companion app evaluation (separate roadmap)

### Free tool ideas (Month 2 candidates)

- EPS surprise calculator (estimates + revisions history)
- Earnings call sentiment dashboard (10-Q parse + AI sentiment)
- News-to-stock impact predictor (paste URL, predict ticker move)
- 13F filing tracker (Berkshire / Ark / etc.)
- Fed / BoE / ECB statement diff tool

All free, no signup, rate-limited Anthropic backend, bottom CTA:
"want unlimited? install the extension".

---

## Quick reference — task ownership

| Task | Owner | Trigger |
| --- | --- | --- |
| Dodo verification status check | You | Now |
| Web Store screenshots (1-4) | You | Today/tomorrow |
| Promo tile | You | Today/tomorrow |
| Refund policy page | Assistant | Tomorrow |
| Account deletion flow | Assistant + you | Tomorrow |
| Sentry + UptimeRobot | Assistant + you | Tomorrow |
| Store listing copy | Assistant | Today/tomorrow |
| Live products / API key / webhook | You | Dodo approval day |
| Railway env update | You | Dodo approval day |
| Live mode E2E test | You | Dodo approval day |
| Web Store submission | You | After live test passes |
| Soft launch posts | You | Web Store approval day |
| Product Hunt launch | You | Day 12-15 (Tuesday) |

---

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Dodo verification rejected | Have a backup MoR ready (Paddle, LemonSqueezy). Don't pursue concurrently — Lemon's onboarding is 2-3 days too. |
| Web Store rejected (permissions) | Pre-shrink permissions to bare minimum; we already did this in 017c57d. |
| Web Store rejected (content) | Privacy policy + refund policy + account deletion all live before submit. |
| Live webhook signature fails | Test with manual `curl` against `/api/billing/webhook/dodo` after env swap. |
| First-day bug spike | Sentry alerts route to email + Slack; have v0.1.7 hotfix branch ready. |
| Product Hunt flop | Phase 5 hard launch into PH instead — give yourself a 1-month "soft launch" window first if needed. |

---

## Success metrics (90-day targets)

- Web Store installs: **5,000+**
- Active monthly users: **1,500+**
- Paid conversions (any plan): **150+**
- MRR: **$2,500+**
- Web Store rating: **≥4.5 ★**
- Sentry critical bug count: **<3 open**

---

_Update this doc weekly. Track progress against the task ownership table._
