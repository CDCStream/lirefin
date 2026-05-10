import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  nodeEnv: optional("NODE_ENV", "development"),
  host: optional("HOST", "0.0.0.0"),
  port: num("PORT", 8787),

  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  anthropicModel: optional("ANTHROPIC_MODEL", "claude-sonnet-4-5"),

  finnhubApiKey: required("FINNHUB_API_KEY"),

  allowedOrigins: optional("ALLOWED_ORIGINS", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  rateLimitPerHour: num("RATE_LIMIT_PER_HOUR", 30),
  rateLimitPerDay: num("RATE_LIMIT_PER_DAY", 200),

  cacheTtlSeconds: num("CACHE_TTL_SECONDS", 300),

  // ---- Supabase ----
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseJwtAud: optional("SUPABASE_JWT_AUD", "authenticated"),

  // ---- Billing provider toggle ----
  // Lirefin migrated from Polar.sh (org-level blocked for "investment
  // products") to DodoPayments. We keep both adapters compiled in for a
  // short transition window so a misconfigured deploy can roll back via env
  // alone. `BILLING_PROVIDER` selects which one routes/billing.ts wires up.
  billingProvider: (
    optional("BILLING_PROVIDER", "dodo") as "dodo" | "polar"
  ),

  // ---- Polar.sh (legacy — only used when BILLING_PROVIDER=polar) ----
  // The access token / webhook secret are intentionally OPTIONAL so the
  // backend boots in local dev without billing configured. Calls to
  // /api/billing/checkout will surface a 503 in that case.
  polarAccessToken: optional("POLAR_ACCESS_TOKEN", ""),
  polarWebhookSecret: optional("POLAR_WEBHOOK_SECRET", ""),
  polarServer: optional("POLAR_SERVER", "production") as
    | "production"
    | "sandbox",
  polarProductStarter: optional("POLAR_PRODUCT_STARTER", ""),
  polarProductStandard: optional("POLAR_PRODUCT_STANDARD", ""),
  polarProductPro: optional("POLAR_PRODUCT_PRO", ""),
  polarProductPower: optional("POLAR_PRODUCT_POWER", ""),
  polarProductUnlimited: optional("POLAR_PRODUCT_UNLIMITED", ""),

  // ---- DodoPayments (https://dodopayments.com) ----
  // Same OPTIONAL contract as Polar — empty values cause /billing/* calls
  // to 503 instead of crashing the boot. `DODO_ENV` selects the test vs
  // live host (test_mode → test.dodopayments.com, live_mode → live.…).
  dodoApiKey: optional("DODO_API_KEY", ""),
  dodoWebhookKey: optional("DODO_WEBHOOK_KEY", ""),
  dodoEnv: optional("DODO_ENV", "test_mode") as "test_mode" | "live_mode",
  dodoProductStarter: optional("DODO_PRODUCT_STARTER", ""),
  dodoProductStandard: optional("DODO_PRODUCT_STANDARD", ""),
  dodoProductPro: optional("DODO_PRODUCT_PRO", ""),
  dodoProductPower: optional("DODO_PRODUCT_POWER", ""),
  dodoProductUnlimited: optional("DODO_PRODUCT_UNLIMITED", ""),

  publicAppUrl: optional("PUBLIC_APP_URL", "http://localhost:8787"),
} as const;

export type AppConfig = typeof config;
