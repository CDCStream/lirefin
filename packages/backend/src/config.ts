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

  // ---- Polar.sh (https://polar.sh) ----
  // The access token / webhook secret are intentionally OPTIONAL so the
  // backend boots in local dev without billing configured. Calls to
  // /api/billing/checkout will surface a 503 in that case (see polar service).
  polarAccessToken: optional("POLAR_ACCESS_TOKEN", ""),
  polarWebhookSecret: optional("POLAR_WEBHOOK_SECRET", ""),
  // "production" (default) or "sandbox" — Polar exposes a sandbox env at
  // sandbox.polar.sh that is wired up by passing `server: "sandbox"` to the
  // SDK. Useful while developing without charging real cards.
  polarServer: optional("POLAR_SERVER", "production") as
    | "production"
    | "sandbox",
  polarProductStarter: optional("POLAR_PRODUCT_STARTER", ""),
  polarProductStandard: optional("POLAR_PRODUCT_STANDARD", ""),
  polarProductPro: optional("POLAR_PRODUCT_PRO", ""),
  polarProductPower: optional("POLAR_PRODUCT_POWER", ""),
  polarProductUnlimited: optional("POLAR_PRODUCT_UNLIMITED", ""),

  publicAppUrl: optional("PUBLIC_APP_URL", "http://localhost:8787"),
} as const;

export type AppConfig = typeof config;
