# Chrome Web Store submission guide — Lirefin

Everything you need to submit Lirefin to the Chrome Web Store with the
**lowest possible rejection risk**. This guide is built around Google's own
[troubleshooting taxonomy](https://developer.chrome.com/webstore/troubleshooting)
— each section is named after the specific violation it prevents.

Copy/paste each field below into the Developer Dashboard at
<https://chrome.google.com/webstore/devconsole>.

---

## 0. Pre-flight checklist

- [ ] **Chrome Web Store developer account** active (`$5` one-time fee paid).
- [ ] **Privacy Policy URL** live and reachable: `https://lirefin.com/privacy`.
- [ ] **Terms URL** live: `https://lirefin.com/terms`.
- [ ] **Test Google account** created (a fresh Gmail) and signed into Lirefin
      at least once so the reviewer can use it without going through OAuth
      from scratch.
- [ ] **At least 2 screenshots** at 1280×800 (we recommend 5).
- [ ] **Latest ZIP** built with `pnpm zip:webstore` and located in
      `dist-zip/`.
- [ ] **Backend Railway** healthy (no 5xx) and `ALLOWED_ORIGINS` includes
      `chrome-extension://*` so the reviewer can sign in.

---

## 1. Why each rejection family does NOT apply to Lirefin

Quick mental model so you can answer reviewer follow-ups confidently.

| Violation ID | What triggers it | Why we're safe |
|---|---|---|
| `Blue Argon` (Manifest V3 / remote code) | `<script src=remote>`, `eval`, fetched-then-executed JS | We bundle everything into the ZIP. Backend returns JSON, never executable JS. |
| `Yellow Magnesium` (functionality not working) | Reviewer sees a blank screen, broken button, or 5xx | Test account ships with 25 free credits; backend is up; billing is gated behind a "Coming soon" placeholder so nothing 503s. |
| `Purple Potassium` (excessive permissions) | Permission listed but unused; broader-than-needed | We dropped `tabs` + `activeTab` (host_permissions covers them). Each remaining permission has a one-sentence "what breaks if you remove it" justification. |
| `Yellow Zinc` (insufficient metadata) | Missing icon, screenshots, or vague description | We have a 128px icon, 5 screenshots, a single-purpose statement, and a description that lists concrete features. |
| `Red Nickel` (deceptive behavior) | "AI gives you investment advice" framing | We say "summarizer", "labels articles", "not investment advice". Both manifest description and store listing avoid recommendation-style verbs. |
| `Purple Lithium` (privacy disclosure) | No privacy policy, broken URL, generic boilerplate | Custom 10-section privacy policy at `/privacy` — sub-processors named, retention windows specific, KVKK + GDPR + CCPA listed. |
| `Purple Magnesium` (web browsing activity) | Logging URLs/titles users didn't act on | Article text only leaves the browser when the user clicks **Analyze**. URLs are SHA-256-hashed for cache/rate-limit and never persisted full. |
| `Red Magnesium` (single purpose) | Two unrelated features bundled | One purpose: read a financial news article → produce sentiment-tagged summary for the user's portfolio. Side panel, popup, and FAB are all UI surfaces for the same purpose. |
| `Yellow Argon` (keyword stuffing) | Long lists of brands/sites/keywords | Detailed description names only 3 example sites + "many more". Tags are short and on-topic. |
| `Red Titanium` (obfuscation) | Base64, character-encoded JS, anti-deobfuscation tricks | Vite minification only (whitespace/var-shortening) — explicitly allowed. |
| `Grey Copper` (gambling) | Calculating odds, accepting bets | We don't generate signals, we don't suggest trades — we paraphrase news. |

---

## 2. Upload the package

1. Click **New item** in the developer dashboard.
2. Upload the latest ZIP from `dist-zip/`. Verify it picks up:
   - Name: **Lirefin — AI Financial News Interpreter**
   - Version: **0.1.6**
   - Description: matches the manifest description below.

---

## 3. Store listing tab

### Title (auto-filled from manifest)

```
Lirefin — AI Financial News Interpreter
```

### Summary / short description (132 chars from manifest)

```
AI summarizer that labels financial news as bullish, neutral, or bearish for assets in your portfolio. Powered by Claude.
```

### Category

**Productivity** (primary)

> Don't pick "Sports" or "News & Weather" — categories don't map to
> rejection but the wrong one will surface fewer relevant users.

### Language

**English** (United States) — initial submission. Add Turkish localization
in a follow-up update.

### Detailed description (the long one shown on the store page)

This is the highest-leverage text on your listing — be concrete, avoid
keyword lists, mention "not investment advice" early.

```text
Lirefin — Read the market, instantly.

Lirefin is an AI Chrome extension that turns any financial news article
you open into a structured summary: per-ticker sentiment (bullish, neutral,
or bearish) for the assets in your portfolio, a confidence score, plain-
English reasoning, and the exact quote from the article that supports it.
Powered by Anthropic's Claude.

Important: Lirefin is a reading and summarization assistant. Output is
generated from article text alone and is NOT investment advice. AI can be
wrong, biased, or outdated — always verify with primary sources before
acting on any decision.

WHAT IT DOES

  1. You open any financial news article in Chrome (Reuters, Bloomberg,
     CNBC, and dozens of similar outlets are auto-detected; for the rest,
     a heuristic decides whether the page reads like financial news).
  2. A small floating Analyze button appears next to recognized articles.
  3. You click it. Lirefin extracts only the article text using Mozilla
     Readability (no tabs, no cookies, no form data) and sends it to our
     backend, which calls Claude with a strict tool-use schema.
  4. The side panel slides open beside the article with one card per
     asset in your portfolio: sentiment label, confidence percentage,
     two-sentence reasoning, and the supporting quote.

PORTFOLIO-AWARE

Set up your portfolio once. We support US stocks and ETFs plus European
exchanges (XETRA, LSE, Euronext) and Asian exchanges (TSE, HKEX, KOSPI),
backed by Finnhub. Every analysis filters through the assets you actually
hold — no generic "the market is mixed" summaries.

13 LANGUAGES

Lirefin reads articles in any major language Claude understands and
produces output in 13 of them: English, Turkish, German, French, Spanish,
Italian, Portuguese, Dutch, Japanese, Chinese, Korean, Arabic, and
Russian.

PRIVACY-FIRST DESIGN

  • API keys live only on our backend; the extension never has access
    to them.
  • Article text is never persistently logged. Held in volatile memory
    for the duration of one analysis only.
  • A short 5-minute SHA-256 cache stores the analysis result, NOT the
    original article text — so re-clicking Analyze on the same page
    won't burn another credit.
  • We do not read your tabs, browsing history, cookies, or form data.
  • No third-party analytics or ad trackers run on the article pages
    you visit.

PRICING

Every new account starts with 25 free analysis credits. Paid monthly
plans launch later via an external Merchant-of-Record provider —
manageable directly from the extension's settings panel when they go
live. Free credits do not expire while your account is active.

NOT INVESTMENT ADVICE

Lirefin is not an investment advisor, broker, signal service, or
trading bot. We do not recommend, suggest, or imply that you should
buy, sell, or hold any asset. We summarize text and label sentiment.
You are responsible for any decisions you make.

LINKS

  • Privacy: https://lirefin.com/privacy
  • Terms: https://lirefin.com/terms
  • Contact: support@lirefin.com
```

### URLs

- **Homepage:** `https://lirefin.com`
- **Support:** `https://lirefin.com/contact`
- **Privacy Policy:** `https://lirefin.com/privacy`

> All three must return 200 OK and render real content. The reviewer
> WILL click them.

---

## 4. Privacy practices tab

This tab is reviewed manually. Be specific. Be honest. Tick the boxes that
match what the extension actually does.

### Single purpose statement (one sentence)

```
Read a financial news article the user has explicitly chosen, extract the
text, and produce an AI-generated summary that labels each asset in the
user's portfolio as bullish, neutral, or bearish based on what the
article says.
```

> The reviewer will compare this sentence against your description, your
> screenshots, and what the extension actually does on first run. Keep
> all three consistent.

### Permission justifications

Each row maps directly to a permission in the manifest. We list only what
we actually use; reviewers cross-check against the bundled JS.

| Permission | Justification |
|---|---|
| `host_permissions: <all_urls>` | The content script must be present on every site to (a) detect whether the open page is a financial news article via URL whitelist + DOM heuristics, and (b) render the floating Analyze button next to recognized articles. We do not read or transmit page content until the user explicitly clicks Analyze. We considered `activeTab` instead and ruled it out: `activeTab` only grants access *after* the user clicks the toolbar icon, which would defeat the auto-detection feature. |
| `host_permissions: https://accounts.google.com/*` | Required by `chrome.identity.launchWebAuthFlow` for the "Sign in with Google" flow. |
| `host_permissions: https://*.supabase.co/*` | Our authentication and database provider. The extension talks to Supabase to fetch the user's account, portfolio, and credit balance. |
| `host_permissions: https://fnibackend-production.up.railway.app/*` | Our own Fastify backend, which proxies analysis requests to Claude and Finnhub. The extension never embeds the API keys. |
| `storage` | Stores user settings (output language, portfolio, FAB visibility prefs) in `chrome.storage.sync` so they roam across the user's signed-in Chrome profiles. |
| `sidePanel` | The primary UI for displaying analysis results lives in Chrome's Side Panel. Without this permission the extension has no main display surface. |
| `scripting` | Required to inject Mozilla Readability into the active tab when the user clicks Analyze, so we can extract the article text cleanly. The injection is one-shot, scoped to the active tab, and uses programmatic `chrome.scripting.executeScript`. |
| `contextMenus` | Adds an "Analyze with Lirefin" right-click entry on selected text, as a convenience alternative to the floating button. |
| `identity` | Implements "Sign in with Google" via `chrome.identity.launchWebAuthFlow`. The extension never sees the user's password — only the Google ID token. |

### Data usage disclosures

In the table at the bottom of the Privacy tab, tick **"This extension
collects or uses..."** for these data types only:

- ✅ **Personally identifiable information** — email address (from Google
  sign-in).
- ✅ **Authentication information** — Google ID token; Supabase JWT.
- ✅ **User activity** — analysis events (timestamp, hashed URL, output
  language, credits spent). Used solely for billing, rate-limiting, and
  showing the user their own activity history.
- ✅ **Website content** — text of articles the user explicitly clicks
  Analyze on. Sent to our backend, processed transiently by Claude, NOT
  persistently logged.

Tick **NO** for everything else (location, financial info, health info,
personal communications, web history, etc.).

> "Web history" is the easy mistake — we do NOT collect web history,
> because we only see URLs the user clicks Analyze on, and we hash them.
> Reviewers respect this distinction.

### Data usage certification — tick all three

- [x] I do **not** sell or transfer user data to third parties, apart
      from the approved use cases.
- [x] I do **not** use or transfer user data for purposes that are
      unrelated to my item's single purpose.
- [x] I do **not** use or transfer user data to determine
      creditworthiness or for lending purposes.

### Remote code declaration

Tick: **No, I am not using remote code.**

> All extension code is bundled into the ZIP. Article text is sent to
> our backend for AI inference, but no JavaScript is fetched and
> executed in the user's browser at runtime.

### Privacy Policy URL

`https://lirefin.com/privacy`

---

## 5. Distribution tab

- **Visibility:** Public.
- **Regions:** All regions.
- **Pricing:** Free.
  > Paid plans launch later via an external Merchant-of-Record provider
  > and are NOT in-extension purchases, so this stays "Free" forever
  > on the Web Store side.
- **Audience:** "Mature audiences" is **not** required — financial news
  is allowed for general audiences. Leave audience-rating defaults.

---

## 6. Test account for the reviewer (very important)

Reviewers create a fresh Chrome profile to test your extension. They
need a way to actually use it without going through Google OAuth as
themselves. Provide credentials in **Privacy practices → Notes for
review**:

```
Test account credentials for review:

  Email:    lirefin-review@gmail.com   ← create a fresh Gmail for this
  Password: [the password you set]

This account has 25 free credits already loaded. To test:

  1. Pin Lirefin and click the extension icon → Sign in with Google
     using the credentials above.
  2. Open https://www.reuters.com/markets/ and click any current
     headline.
  3. Once the article loads, the floating Analyze button appears in the
     lower-right corner. Click it.
  4. The side panel will open. Confirm the credit cost in the
     pre-flight panel and click "Start analysis".
  5. Within 10–15 seconds, you'll see per-ticker sentiment cards.

Note: paid subscriptions are intentionally gated behind a "Coming soon"
placeholder in the Settings panel. This is by design while we migrate
between payment providers; no purchase flow is invoked from the
extension.
```

> Create the test account NOW so the credentials are real when you
> submit. Pre-load the portfolio with 4–6 well-known tickers
> (AAPL, MSFT, NVDA, TSLA, SPY) so the analysis returns interesting
> output on any major article.

---

## 7. Required image assets

| Asset | Size | Required | Status |
|---|---|---|---|
| Store icon | 128×128 | ✅ Required | `packages/extension/public/icons/icon-128.png` |
| Small promo tile | 440×280 | Optional but boosts placement | **TODO** |
| Marquee promo tile | 1400×560 | Optional, only for featured items | Skip |
| Screenshots | 1280×800 (preferred) | ≥ 1 required, max 5 | **TODO — see capture plan below** |

### Screenshot capture plan (5 shots, all 1280×800 PNG)

Capture at exactly 1280×800. Easiest method on Windows:

1. Chrome → **F12** → click the device-toolbar icon → choose
   **Responsive** → set dimensions to **1280 × 800** in the toolbar.
2. Press the **3-dot menu** → **Capture full size screenshot**, OR use
   the OS screenshot tool with the viewport selected.
3. Save as PNG. The Web Store re-encodes anyway, so no need to optimize.

Recommended captures:

#### Shot 1 — Hero (the money shot)

- Open <https://www.reuters.com/markets/> and click a recent
  high-relevance article (something with NVDA, AAPL, MSFT, or TSM in
  the headline).
- The extension's floating Analyze button is visible in the lower-right
  of the article.
- Side panel is open beside the article showing a 3- to 4-asset
  breakdown — at least one bullish, one neutral, one bearish for visual
  contrast.
- Top-left text overlay (use Figma or Canva): **"Read the market,
  instantly."**

#### Shot 2 — Side panel detail

- Side panel only, full height.
- One asset card expanded showing: sentiment pill, confidence bar,
  reasoning paragraph, and the supporting quote in italic.
- 2–3 collapsed cards below.
- Overlay: **"Per-ticker breakdown with cited reasoning."**

#### Shot 3 — Settings & portfolio

- Options page (right-click the extension icon → Options).
- Portfolio shows 6–8 mixed tickers (a couple US, a couple EU like
  `SAP.DE` and `ASML.AS`, one Asian like `7203.T`, one ETF like `SPY`).
- Search box has a partial query like `nvi` with the autocomplete
  visible.
- Overlay: **"Global ticker support — US, Europe, Asia."**

#### Shot 4 — 13 languages

- Same article analyzed twice, side-by-side composition (use Figma to
  glue two screenshots together).
- Left: output in English. Right: output in Turkish (or Japanese for
  visual variety).
- Overlay: **"13 output languages."**

#### Shot 5 — Privacy / dismiss FAB

- Article page with the floating Analyze button visible.
- The dismiss menu open showing "Hide on this site / Hide on all sites".
- Overlay: **"Polite by default — hide it any time."**

> Anti-pattern: do NOT photoshop fake numbers or fake portfolio
> performance. Reviewers can tell, and it crosses into `Red Nickel`
> deceptive territory.

### Promo tile (440×280)

A simple emerald background with the Lirefin wordmark and the tagline
"Read the market, instantly." is enough. Use any vector tool (Figma,
Canva). Export PNG at exactly 440×280.

---

## 8. Submission

1. Click **Submit for review**.
2. Expected timeline:
   - **First-time submission**: 3–7 business days.
   - **Subsequent updates**: usually 1–3 days.
   - **Finance-related extensions**: occasionally 7–14 days while
     reviewers verify "not investment advice" framing.
3. While in review:
   - Do NOT push new versions of the ZIP — that resets the queue.
   - Do NOT delete the test account.
   - Keep the backend live (`fnibackend-production.up.railway.app/health`
     should return 200 throughout the review window).

### If you get rejected

Don't panic. The dashboard tells you the exact violation ID
(`Yellow Magnesium`, `Purple Potassium`, etc.). Map it to section 1
above, fix the underlying cause, bump the manifest version, run
`pnpm zip:webstore`, and resubmit. Use the **Appeal** button only if
you genuinely believe the review was wrong — over-appealing burns
goodwill.

Common first-submission rejections specific to Lirefin's profile:

| If reviewer says... | Fix |
|---|---|
| "Permissions exceed what's needed" | Already minimized. Reply with the table from section 4. |
| "Cannot verify functionality" | Test account is missing or has 0 credits. Verify credentials work. |
| "Privacy policy is generic" | We have a 10-section custom one. Ensure URL returns 200. |
| "Description implies financial advice" | Manifest description and detail description both already disclaim. |

---

## 9. After approval

When the extension is live, do these in order:

1. Note the **public extension ID** from the dashboard (looks like
   `pdejncadlfgdlfdaagebgaffabkmamgg`).
2. Update Supabase **Auth → URL Configuration → Redirect URLs**:
   add `chrome-extension://<EXT_ID>/*`.
3. Update Railway backend `ALLOWED_ORIGINS` to include
   `chrome-extension://<EXT_ID>` (replace the wildcard with the real ID
   for tighter CORS).
4. Update `packages/landing/src/lib/config.ts` → `webStoreUrl` to the
   real Web Store URL
   (`https://chromewebstore.google.com/detail/lirefin/<EXT_ID>`).
5. Tag the release: `git tag v0.1.6 && git push --tags`.
6. Announce: tweet, post on Hacker News (Show HN), Indie Hackers,
   r/chrome_extensions, r/algotrading (always with a "looking for
   feedback, not promo" framing — those subs are strict).
