import { supabaseAdmin } from "./supabase.js";

export class InsufficientCreditsError extends Error {
  code = "INSUFFICIENT_CREDITS";
  balance: number;
  constructor(balance: number) {
    super("Insufficient credits.");
    this.balance = balance;
  }
}

export async function getBalance(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("credit_balances")
    .select("credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    // Brand new account that somehow missed the trigger — initialise to 0.
    return 0;
  }
  return Number(data.credits ?? 0);
}

/**
 * Atomically debits the user. Throws `InsufficientCreditsError` if the
 * RPC raises `INSUFFICIENT_CREDITS`. Returns the new balance.
 */
export async function chargeCredits(
  userId: string,
  amount: number,
  metadata: Record<string, unknown> = {},
): Promise<number> {
  if (amount <= 0) return getBalance(userId);

  const { data, error } = await supabaseAdmin.rpc("spend_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_metadata: metadata,
  });

  if (error) {
    if (
      typeof error.message === "string" &&
      error.message.includes("INSUFFICIENT_CREDITS")
    ) {
      const balance = await getBalance(userId);
      throw new InsufficientCreditsError(balance);
    }
    throw error;
  }

  return Number(data ?? 0);
}

/**
 * Atomically grants credits. Used by Stripe webhook + manual adjustments.
 * Idempotency must be enforced by the caller (e.g. via `purchases` row).
 */
export async function addCredits(
  userId: string,
  amount: number,
  kind: "purchase" | "refund" | "adjustment" | "signup_bonus",
  metadata: Record<string, unknown> = {},
): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("add_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_kind: kind,
    p_metadata: metadata,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export interface AnalysisRecord {
  userId: string;
  urlHash: string | null;
  assetCount: number;
  wordCount: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  creditsCharged: number;
  cached: boolean;
}

export async function recordAnalysis(rec: AnalysisRecord): Promise<void> {
  const { error } = await supabaseAdmin.from("analyses").insert({
    user_id: rec.userId,
    url_hash: rec.urlHash,
    asset_count: rec.assetCount,
    word_count: rec.wordCount,
    input_tokens: rec.inputTokens,
    output_tokens: rec.outputTokens,
    cost_usd: rec.costUsd,
    credits_charged: rec.creditsCharged,
    cached: rec.cached,
  });
  if (error) throw error;
}

/**
 * Approximate input/output USD cost for Claude Sonnet 4.6.
 *  $3 / Mtok input · $15 / Mtok output
 */
export function estimateClaudeCostUsd(
  inputTokens: number,
  outputTokens: number,
): number {
  const inUsd = (inputTokens / 1_000_000) * 3;
  const outUsd = (outputTokens / 1_000_000) * 15;
  return Number((inUsd + outUsd).toFixed(6));
}
