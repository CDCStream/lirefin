import { z } from "zod";
import {
  SUPPORTED_LANGUAGE_CODES,
  type SupportedLanguageCode,
} from "./languages.js";
import { REGIONS } from "./regions.js";

export const SentimentSchema = z.enum(["bullish", "neutral", "bearish"]);
export type Sentiment = z.infer<typeof SentimentSchema>;

export const AssetTypeSchema = z.enum(["stock", "etf", "index", "crypto", "forex", "other"]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

export const AssetSchema = z.object({
  symbol: z.string().min(1).max(32),
  name: z.string().min(1).max(200),
  exchange: z.string().min(1).max(32).default("US"),
  type: AssetTypeSchema.default("stock"),
  region: z.enum(REGIONS).optional(),
  currency: z.string().max(8).optional(),
});
export type Asset = z.infer<typeof AssetSchema>;

export const LanguageCodeSchema = z.enum(
  SUPPORTED_LANGUAGE_CODES as [SupportedLanguageCode, ...SupportedLanguageCode[]],
);

export const AnalyzeRequestSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().min(1).max(500),
  articleText: z.string().min(50).max(20000),
  pageLanguage: z.string().max(16).optional(),
  portfolio: z.array(AssetSchema).min(1).max(50),
  outputLanguage: LanguageCodeSchema,
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const AssetAnalysisSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  sentiment: SentimentSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1).max(1500),
  relevantQuote: z.string().max(800).optional().nullable(),
});
export type AssetAnalysis = z.infer<typeof AssetAnalysisSchema>;

export const ModelUsageSchema = z.object({
  model: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});
export type ModelUsage = z.infer<typeof ModelUsageSchema>;

export const AnalyzeResponseSchema = z.object({
  detectedLanguage: z.string().max(16),
  marketSummary: z.string().min(1).max(2000),
  assets: z.array(AssetAnalysisSchema),
  modelUsage: ModelUsageSchema,
  cached: z.boolean().default(false),
  generatedAt: z.string(),
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

export const TickerSearchQuerySchema = z.object({
  q: z.string().min(1).max(64),
  region: z.enum(REGIONS).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type TickerSearchQuery = z.infer<typeof TickerSearchQuerySchema>;

export const TickerSearchResultSchema = z.object({
  symbol: z.string(),
  displaySymbol: z.string(),
  description: z.string(),
  type: z.string(),
  exchange: z.string().optional(),
  region: z.enum(REGIONS).optional(),
  currency: z.string().optional(),
});
export type TickerSearchResult = z.infer<typeof TickerSearchResultSchema>;

export const TickerSearchResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  results: z.array(TickerSearchResultSchema),
});
export type TickerSearchResponse = z.infer<typeof TickerSearchResponseSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
  retryAfter: z.number().int().nonnegative().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * Pre-flight estimate request — same fields as `AnalyzeRequest` but the
 * backend only computes the estimated credit cost and returns the user's
 * current balance, without calling Claude.
 *
 * The article text bound is intentionally looser (10 chars vs 50 for analyze)
 * so the UI can offer a live estimate as the user is still building their
 * selection. The estimator caps very long inputs to keep the math sane.
 */
export const AnalyzeEstimateRequestSchema = z.object({
  articleText: z.string().min(10).max(20000),
  portfolio: z.array(AssetSchema).min(1).max(50),
});
export type AnalyzeEstimateRequest = z.infer<typeof AnalyzeEstimateRequestSchema>;

export const AnalyzeEstimateResponseSchema = z.object({
  estimate: z.number().int().positive(),
  balance: z.number().int().nonnegative(),
  sufficient: z.boolean(),
  wordCount: z.number().int().nonnegative(),
  assetCount: z.number().int().nonnegative(),
});
export type AnalyzeEstimateResponse = z.infer<typeof AnalyzeEstimateResponseSchema>;

/**
 * Item shape for the credit transaction ledger UI. The backend strips the
 * raw `metadata` jsonb to a small whitelisted projection because metadata
 * may contain backend-internal hash keys we don't want to leak.
 */
export const CreditTransactionSchema = z.object({
  id: z.string().uuid(),
  delta: z.number().int(),
  kind: z.enum(["signup_bonus", "purchase", "spend", "refund", "adjustment"]),
  createdAt: z.string(),
  packageId: z.string().nullable().optional(),
  assetCount: z.number().int().nonnegative().nullable().optional(),
  wordCount: z.number().int().nonnegative().nullable().optional(),
});
export type CreditTransaction = z.infer<typeof CreditTransactionSchema>;

export const CreditTransactionListResponseSchema = z.object({
  transactions: z.array(CreditTransactionSchema),
  hasMore: z.boolean(),
});
export type CreditTransactionListResponse = z.infer<
  typeof CreditTransactionListResponseSchema
>;

/**
 * Analyses history list item — projection of the `analyses` table aimed at
 * the side panel "Recent" tab. We don't ship the article text or the model
 * response: the row is just enough metadata to identify the article.
 */
export const AnalysisHistoryItemSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  assetCount: z.number().int().nonnegative(),
  wordCount: z.number().int().nonnegative(),
  creditsCharged: z.number().int().nonnegative(),
  cached: z.boolean(),
});
export type AnalysisHistoryItem = z.infer<typeof AnalysisHistoryItemSchema>;

export const AnalysisHistoryResponseSchema = z.object({
  items: z.array(AnalysisHistoryItemSchema),
  hasMore: z.boolean(),
});
export type AnalysisHistoryResponse = z.infer<typeof AnalysisHistoryResponseSchema>;
