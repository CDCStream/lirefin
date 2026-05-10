export type {
  Sentiment,
  AssetType,
  Asset,
  AnalyzeRequest,
  AssetAnalysis,
  ModelUsage,
  AnalyzeResponse,
  TickerSearchQuery,
  TickerSearchResult,
  TickerSearchResponse,
  ApiError,
  AnalyzeEstimateRequest,
  AnalyzeEstimateResponse,
  CreditTransaction,
  CreditTransactionListResponse,
  AnalysisHistoryItem,
  AnalysisHistoryResponse,
} from "./schemas.js";

export type { SupportedLanguageCode } from "./languages.js";
export type { Region } from "./regions.js";

export interface ExtensionSettings {
  portfolio: import("./schemas.js").Asset[];
  outputLanguage: import("./languages.js").SupportedLanguageCode;
  backendUrl: string;
  deviceId: string;
  preferredRegion: import("./regions.js").Region;
}
