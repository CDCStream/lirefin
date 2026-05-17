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
} from "./schemas";

export type { SupportedLanguageCode } from "./languages";
export type { Region } from "./regions";

export interface ExtensionSettings {
  portfolio: import("./schemas").Asset[];
  outputLanguage: import("./languages").SupportedLanguageCode;
  backendUrl: string;
  deviceId: string;
  preferredRegion: import("./regions").Region;
}
