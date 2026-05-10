# Lirefin · Supabase + Polar.sh setup

This project uses **Supabase Auth** (Google OAuth) for users and a **Postgres
credit ledger** for billing. **Polar.sh** is used as the payment processor and
Merchant of Record (handles EU VAT / UK VAT / US sales tax automatically).

Follow the steps below once when bootstrapping the project.

---

## 1. Supabase project

1. Go to <https://supabase.com>, **Create a new project**.
2. After it provisions, copy these values from **Project Settings → API**:
   - `Project URL` → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY` (backend only — **never** ship this to the extension)

## 2. Database migration

Open **SQL Editor → New query**, paste the entire contents of
[`supabase/migrations/001_init_credits.sql`](./migrations/001_init_credits.sql)
and run it. It creates:

- tables `credit_balances`, `credit_transactions`, `analyses`, `purchases`
- RLS policies (every user only sees their own rows)
- trigger `handle_new_user` → grants every new signup **25 credits**
  (≈ 3 medium-length analyses, enough to evaluate the product)
- RPC `spend_credits(user_id, amount, metadata)` → atomic charge
- RPC `add_credits(user_id, amount, kind, metadata)` → atomic credit grant

The script is idempotent — you can rerun it safely.

If you previously deployed an earlier version of this project that used Stripe,
also run [`002_polar_rename.sql`](./migrations/002_polar_rename.sql) to rename
`purchases.stripe_session_id` → `purchases.polar_order_id`. Fresh installs can
skip it (001 already creates the column with the right name).

## 3. Google OAuth provider

### 3.1 Google Cloud

1. Go to <https://console.cloud.google.com> → create a project (or reuse one).
2. **APIs & Services → OAuth consent screen** — configure as "External", add your
   Google account as a test user.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `https://<your-project-ref>.supabase.co/auth/v1/callback`
     - `https://<EXTENSION_ID>.chromiumapp.org/`
       (you get the extension id from `chrome://extensions` once the unpacked
       extension is loaded)
4. Copy **Client ID** and **Client Secret**.

### 3.2 Supabase

1. **Authentication → Providers → Google** → enable.
2. Paste the Client ID + Client Secret from the previous step.
3. **Authentication → URL Configuration → Site URL**: `https://<your-project-ref>.supabase.co`
4. **Authentication → URL Configuration → Redirect URLs** add:
   `https://<EXTENSION_ID>.chromiumapp.org/`

## 4. Polar.sh

> Why Polar instead of Stripe?
>
> Polar is a **Merchant of Record** — they handle EU VAT, UK VAT and US sales
> tax registration on your behalf. As an indie SaaS that ships globally on day
> one this saves us from registering for tax in 27+ jurisdictions. Polar's fee
> is ~4% + $0.40 vs Stripe's ~3% + $0.30, but the MoR coverage alone usually
> pays for the difference.

### 4.1 Account + access token

1. Sign up at <https://polar.sh> and create an organization (e.g. "Lirefin").
2. While iterating locally use the sandbox at <https://sandbox.polar.sh> — same
   UI, no real money. Set `POLAR_SERVER=sandbox` in `.env` for that mode.
3. **Settings → API access tokens → New token** with scopes
   `checkouts:write`, `orders:read`, `products:read`, `webhooks:read`.
   Copy the token → `POLAR_ACCESS_TOKEN`.

### 4.2 Products

In the Polar dashboard create one **one-time product** for each credit pack,
then copy each product id (the "Copy ID" menu item on the product card).

| Package    | Price | Credits | Bonus | env var                   |
| ---------- | ----- | ------- | ----- | ------------------------- |
| Starter    | $5    | 350     | —     | `POLAR_PRODUCT_STARTER`   |
| Standard   | $10   | 750     | +7%   | `POLAR_PRODUCT_STANDARD`  |
| Pro        | $25   | 2000    | +14%  | `POLAR_PRODUCT_PRO`       |
| Power      | $50   | 4500    | +22%  | `POLAR_PRODUCT_POWER`     |
| Unlimited  | $99   | 10000   | +43%  | `POLAR_PRODUCT_UNLIMITED` |

The **Unlimited** pack is marketed as practically unlimited (~1400+ medium
analyses) but is still a one-time credit purchase under the hood — credits
never expire. Switch to a Polar subscription product if you ever want true
recurring unlimited usage.

### 4.3 Webhook endpoint

1. **Settings → Webhooks → Create endpoint**
   - URL: `https://<your-backend-host>/api/billing/webhook`
   - Format: **Raw** (Standard Webhooks JSON)
   - Events: at minimum `order.paid` (the canonical "credits should be granted"
     event). You can subscribe to more for future use, but the handler ignores
     anything that isn't `order.paid`.
2. Copy the signing secret → `POLAR_WEBHOOK_SECRET`.

For local development use a tunnel like [ngrok](https://ngrok.com) or
[cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/tunnel-guide/local/)
to expose `http://localhost:8787` to Polar.

## 5. .env values

Backend `.env` (see `.env.example`):

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_WEBHOOK_SECRET=whsec_...
POLAR_SERVER=production
POLAR_PRODUCT_STARTER=prod_...
POLAR_PRODUCT_STANDARD=prod_...
POLAR_PRODUCT_PRO=prod_...
POLAR_PRODUCT_POWER=prod_...
POLAR_PRODUCT_UNLIMITED=prod_...
PUBLIC_APP_URL=https://lirefin.com   # used for Polar success_url
```

Extension build-time env (e.g. `packages/extension/.env`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_BACKEND_URL=https://api.lirefin.com
VITE_GOOGLE_OAUTH_CLIENT_ID=...
```

`VITE_GOOGLE_OAUTH_CLIENT_ID` is the **Web client ID** from step 3.1 — it is
used to launch `chrome.identity.launchWebAuthFlow` with Google directly and
exchange the resulting `id_token` with Supabase.
