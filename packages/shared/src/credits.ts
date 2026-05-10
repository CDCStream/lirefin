/**
 * Credit pricing model — see plan `credits-supabase-stripe-monetization`.
 *
 * 1 credit = 1000 input-token-equivalent units.
 * `credits_charged = ceil(input/1000) + ceil(output/1000) * 5`
 *
 * Cost basis:  $0.003 / credit  (Claude Sonnet 4.6 input price + headroom)
 * Sale price:  $0.015 / credit  (cost x 5 → exact 80% margin)
 *
 * Token estimate for a single analysis (used for the pre-flight check):
 *   system          ≈ 400 tokens
 *   user message    = 200 + words*1.3 + assets*10
 *   tool_use output = 50  + assets*150
 */

export interface CreditUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Convert real Claude usage into credits. Always rounds up. */
export function creditsForUsage(u: CreditUsage): number {
  const input = Math.max(0, Math.ceil(u.inputTokens / 1000));
  const output = Math.max(0, Math.ceil(u.outputTokens / 1000)) * 5;
  return Math.max(1, input + output);
}

/** Pre-flight estimate so we can reject obviously underfunded calls. */
export function estimateCredits(words: number, assets: number): number {
  const safeWords = Math.max(0, Math.floor(words));
  const safeAssets = Math.max(1, Math.floor(assets));
  const inputTokens = 400 + 200 + safeWords * 1.3 + safeAssets * 10;
  const outputTokens = 50 + safeAssets * 150;
  return creditsForUsage({ inputTokens, outputTokens });
}

/** Cents per credit (sale price). Use to format charges in UI. */
export const CREDIT_PRICE_USD = 0.015;

export type CreditPackageId =
  | "starter"
  | "standard"
  | "pro"
  | "power"
  | "unlimited";

export interface CreditPackage {
  id: CreditPackageId;
  label: string;
  usd: number;
  credits: number;
  /** Indicative bonus % vs the starter pack rate. */
  bonusPct: number;
  /**
   * Marketing flag — the "Unlimited" pack just bundles a very large credit
   * pool (enough for ~1400+ medium analyses). True billing is still per
   * credit; the flag only controls UI labelling and CTA copy.
   */
  unlimited?: boolean;
  /**
   * Backend env var holding the Polar.sh product id (created in the Polar
   * dashboard). Each package maps to one one-time product. The env name is
   * intentionally kept abstract from the SDK so the package list stays the
   * single source of truth across both backend and the extension UI.
   */
  polarProductEnv:
    | "POLAR_PRODUCT_STARTER"
    | "POLAR_PRODUCT_STANDARD"
    | "POLAR_PRODUCT_PRO"
    | "POLAR_PRODUCT_POWER"
    | "POLAR_PRODUCT_UNLIMITED";
}

export const CREDIT_PACKAGES: readonly CreditPackage[] = [
  {
    id: "starter",
    label: "Starter",
    usd: 5,
    credits: 350,
    bonusPct: 0,
    polarProductEnv: "POLAR_PRODUCT_STARTER",
  },
  {
    id: "standard",
    label: "Standard",
    usd: 10,
    credits: 750,
    bonusPct: 7,
    polarProductEnv: "POLAR_PRODUCT_STANDARD",
  },
  {
    id: "pro",
    label: "Pro",
    usd: 25,
    credits: 2000,
    bonusPct: 14,
    polarProductEnv: "POLAR_PRODUCT_PRO",
  },
  {
    id: "power",
    label: "Power",
    usd: 50,
    credits: 4500,
    bonusPct: 22,
    polarProductEnv: "POLAR_PRODUCT_POWER",
  },
  {
    id: "unlimited",
    label: "Unlimited",
    usd: 99,
    credits: 10000,
    bonusPct: 43,
    unlimited: true,
    polarProductEnv: "POLAR_PRODUCT_UNLIMITED",
  },
] as const;

/**
 * Free credits granted on signup. ~25 credits is enough for ~3 medium-length
 * articles + a small buffer, giving new users a real taste of the product
 * before asking for payment.
 */
export const SIGNUP_BONUS_CREDITS = 25;

export function getPackage(
  id: string,
): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}
