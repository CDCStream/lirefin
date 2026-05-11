# Chrome Web Store — listing copy (paste into Developer Dashboard)

Use **English** in the dashboard unless you add a localized listing. Character counts verified for the dashboard **item summary** (132 max).

---

## Extension title (`name`)

**Recommended (matches `manifest.config.ts`):**

```
Lirefin — AI Financial News & Articles Interpreter
```

- **Characters:** **50** ✅ — within common store limits (always confirm in the Dashboard field).

**Shorter alternate (SEO “AI news”):**

```
Lirefin — AI Portfolio News Analysis
```

- **Characters:** 35.

---

## Short description (item summary · max **132** characters, plain text only)

**Option A — recommended** (hits the **132** limit exactly — plain text only)

```
Pick text on financial news—Claude summarizes bullish/bearish cues for holdings you save in Chrome side panel. Free starter credits.
```

- **Characters:** **132** ✅

**Option B — tighter “any site” phrasing**

```
Lirefin: pick text on investing news. Claude explains markets and portfolio tilt (bullish/bearish hints) in Chrome side panel.
```

- **Characters:** **126** ✅

**Option C — no “starter credits” promise** (adjust if eligibility copy changes)

```
Pick text anywhere on financial articles. Claude summarizes with portfolio tilt (bull/bear cues) in Chrome side panel.
```

- **Characters:** **118** ✅

---

## Category (Developer Dashboard dropdown)

Pick **one** primary category users will browse under:

| Choice | Why |
|--------|-----|
| **News & Weather** ✅ | Matches “financial news & articles”; readers installing news tools land here first. |

**Alternate if that category lists your item oddly:** **Productivity** (professional reading / workflow).

Avoid unclear categories like “Fun” or “Shopping.”

---

## Long description (store “Description” — plain text; no HTML unless the field explicitly allows markdown/HTML in your dashboard)

Paste the block below and adjust URLs if needed.

```
Lirefin helps you read markets with less guesswork.

Select headline or paragraph text on almost any investing or business news article. Open the side panel to see:

• Plain-language executive summary (“what matters” right now).
• Signals that relate to YOUR tickers—not generic boilerplate—with bullish / neutral / bearish flavor when it applies.
• Word-count–based credits so costs are predictable before you run analysis.
• Recent analysis history after you sign in.
• Language controls for clearer output tailored to how you prefer to read.

Works on Bloomberg, Reuters, WSJ-shaped pages where paywalls permit, Investing.com-class sites, investor relations pages—anywhere finance news lives in the browser.

POWERED BY CLAUDE
Analysis is powered by Anthropic Claude. Responses are informational only.

GET STARTED (CREDITS)
Create a free account to receive starter credits (see lirefin.com for current offers). Paid plans add more monthly credits via our billing partner listed in our Privacy Policy.

PRIVACY
We only transmit the selection you choose and minimal page context needed to interpret it. Details: https://www.lirefin.com/privacy

DISCLAIMER
Not investment advice. AI output can be wrong or incomplete—verify before acting.

WEBSITE — https://www.lirefin.com/
SUPPORT — your support email listed in the Dashboard (match privacy/support pages).
REFUNDS — https://www.lirefin.com/refund

Thanks for trying Lirefin.
```

**Before submit:** replace `your support email` with the actual address shown on your Privacy Policy / site footer.

---

## Store listing checklist (outside this file)

- [ ] Screenshots uploaded (`assets/shot-1.png` … `shot-5.png`).
- [ ] Privacy practice questionnaire matches deployed policy (`/privacy`).
- [ ] Single purpose & permission justification text aligned with Manifest V3 `permissions`.
- [ ] Trademark: use “Anthropic Claude” attribution per partner rules if Anthropic publishes usage guidance for storefronts.
