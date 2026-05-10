# Lirefin · End-to-end test (manual)

Run this checklist after wiring Supabase + Polar.sh and reloading the
unpacked extension.

## 0. Prerequisites

- `supabase/migrations/001_init_credits.sql` has been executed.
- Google OAuth provider is enabled in Supabase, redirect URLs configured.
- Polar.sh products created (one per credit pack) and `POLAR_PRODUCT_*` env
  vars set on the backend.
- A Polar webhook endpoint is registered for at least the `order.paid` event,
  pointing at your backend URL. For local dev expose
  `http://localhost:8787` over a tunnel:
  ```sh
  ngrok http 8787
  # or
  cloudflared tunnel --url http://localhost:8787
  ```
  Then paste the public URL into Polar → Settings → Webhooks.
- `packages/backend/.env` and `packages/extension/.env` are filled in.
- Backend and extension both built/restarted after env changes.
- Use sandbox first: set `POLAR_SERVER=sandbox` and create the products in
  <https://sandbox.polar.sh>. Test card `4242 4242 4242 4242` works there.

## 1. Sign-up bonus (25 credits)

1. Open `chrome://extensions` → reload the Lirefin extension.
2. Click the Lirefin icon → side panel opens with **Sign in** button.
3. Open the options page from the side panel header.
4. Click **Sign in with Google** → complete the popup flow.
5. ✅ The "Account" card now shows your email + **25 credits** balance.

Verify in Supabase:
```sql
select balance.credits, t.kind, t.delta
from public.credit_balances balance
join public.credit_transactions t on t.user_id = balance.user_id
where balance.user_id = auth.uid();
```
You should see one row with `kind = signup_bonus`, `delta = 25`.

## 2. Analyse → balance drops

1. In the options page, search for `AAPL` in the portfolio editor and add it.
2. Open any English financial article (e.g. on Reuters or Bloomberg).
3. Highlight ~2 paragraphs of text — the FAB pill turns into "Analyze · N words".
4. Click **Analyze**.
5. ✅ Loading spinner appears, then the result panel shows:
   - market summary
   - per-asset cards
   - chips at the top: language code, `−X credits`, `Y credits` remaining
6. Reload the side panel and verify the same balance appears in the header chip.

Backend log should show `request completed` with status 200 and a
`credits_charged` audit row in `public.analyses`.

## 3. Insufficient credits → 402

The fastest way to drain credits is to lower your balance manually:
```sql
update public.credit_balances set credits = 1 where user_id = auth.uid();
```

1. Trigger another analysis on a long article (10+ assets if possible).
2. ✅ The FAB switches to the **Insufficient credits** panel with a
   **Buy credits** call-to-action and your current balance.
3. ✅ Side panel shows the same state with a "Buy credits" button that opens
   options.

## 4. Polar checkout → credits granted

1. Options → **Credit packs** → click **Buy credits** on the Starter pack.
2. A new tab opens to Polar checkout (sandbox in dev, production in live).
3. Pay with the sandbox test card `4242 4242 4242 4242`, any future expiry,
   any CVC, any postcode.
4. ✅ Backend logs show the `order.paid` webhook arriving and a
   `purchase already processed` log on any retry (idempotency).
5. ✅ Refresh the options page → balance increased by **350 credits**.
6. ✅ A row appears in `public.purchases` with `status = 'completed'` and a
   matching `credit_transactions` row with `kind = purchase`.

> Re-run the same Polar webhook from the dashboard ("Resend") to confirm
> idempotency — the second delivery must return 200 without granting
> additional credits.

## 5. Sign out → next analyse asks for sign-in

1. Options page → **Sign out**.
2. Trigger an analysis from the FAB.
3. ✅ FAB shows **Sign in to start** panel with a sign-in button that opens
   the options page.

If all five sections passed, the credit/billing pipeline is healthy.
