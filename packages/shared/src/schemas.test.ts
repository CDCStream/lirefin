import { describe, expect, it } from "vitest";
import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  AssetAnalysisSchema,
  AssetSchema,
  SentimentSchema,
  TickerSearchQuerySchema,
} from "./schemas.js";

const validAsset = {
  symbol: "AAPL",
  name: "Apple Inc.",
  exchange: "US",
  type: "stock" as const,
};

describe("SentimentSchema", () => {
  it("accepts the three canonical values", () => {
    for (const s of ["bullish", "neutral", "bearish"]) {
      expect(SentimentSchema.parse(s)).toBe(s);
    }
  });

  it("rejects other strings", () => {
    expect(() => SentimentSchema.parse("BULLISH")).toThrow();
    expect(() => SentimentSchema.parse("up")).toThrow();
  });
});

describe("AssetSchema", () => {
  it("applies sensible defaults for exchange + type", () => {
    const parsed = AssetSchema.parse({ symbol: "AAPL", name: "Apple Inc." });
    expect(parsed.exchange).toBe("US");
    expect(parsed.type).toBe("stock");
  });

  it("rejects empty symbols and missing names", () => {
    expect(() => AssetSchema.parse({ symbol: "", name: "x" })).toThrow();
    expect(() => AssetSchema.parse({ symbol: "AAPL", name: "" })).toThrow();
  });
});

describe("AnalyzeRequestSchema", () => {
  const baseRequest = {
    url: "https://example.com/news",
    title: "Apple beats earnings",
    articleText: "x".repeat(200),
    portfolio: [validAsset],
    outputLanguage: "en" as const,
  };

  it("accepts a minimal valid payload", () => {
    expect(() => AnalyzeRequestSchema.parse(baseRequest)).not.toThrow();
  });

  it("rejects bodies with too-short article text", () => {
    expect(() =>
      AnalyzeRequestSchema.parse({ ...baseRequest, articleText: "short" }),
    ).toThrow();
  });

  it("rejects an empty portfolio", () => {
    expect(() =>
      AnalyzeRequestSchema.parse({ ...baseRequest, portfolio: [] }),
    ).toThrow();
  });

  it("rejects > 50 portfolio assets", () => {
    expect(() =>
      AnalyzeRequestSchema.parse({
        ...baseRequest,
        portfolio: Array.from({ length: 51 }, (_, i) => ({
          ...validAsset,
          symbol: `S${i}`,
        })),
      }),
    ).toThrow();
  });

  it("rejects unsupported output languages", () => {
    expect(() =>
      AnalyzeRequestSchema.parse({ ...baseRequest, outputLanguage: "xx" }),
    ).toThrow();
  });

  it("rejects malformed urls", () => {
    expect(() =>
      AnalyzeRequestSchema.parse({ ...baseRequest, url: "not-a-url" }),
    ).toThrow();
  });
});

describe("AssetAnalysisSchema", () => {
  it("clamps confidence within 0..1 inclusive", () => {
    const ok = AssetAnalysisSchema.parse({
      symbol: "AAPL",
      name: "Apple",
      sentiment: "bullish",
      confidence: 0.5,
      rationale: "x",
    });
    expect(ok.confidence).toBe(0.5);
    expect(() =>
      AssetAnalysisSchema.parse({
        symbol: "AAPL",
        name: "Apple",
        sentiment: "bullish",
        confidence: 1.2,
        rationale: "x",
      }),
    ).toThrow();
  });

  it("allows null relevantQuote", () => {
    const r = AssetAnalysisSchema.parse({
      symbol: "AAPL",
      name: "Apple",
      sentiment: "neutral",
      confidence: 0.4,
      rationale: "x",
      relevantQuote: null,
    });
    expect(r.relevantQuote).toBeNull();
  });
});

describe("AnalyzeResponseSchema", () => {
  it("defaults `cached` to false when omitted", () => {
    const parsed = AnalyzeResponseSchema.parse({
      detectedLanguage: "en",
      marketSummary: "summary",
      assets: [],
      modelUsage: { model: "claude", inputTokens: 100, outputTokens: 50 },
      generatedAt: new Date().toISOString(),
    });
    expect(parsed.cached).toBe(false);
  });
});

describe("TickerSearchQuerySchema", () => {
  it("coerces limit from a string and applies default", () => {
    const parsed = TickerSearchQuerySchema.parse({ q: "apple", limit: "5" });
    expect(parsed.limit).toBe(5);
    const def = TickerSearchQuerySchema.parse({ q: "apple" });
    expect(def.limit).toBe(20);
  });

  it("rejects an empty query", () => {
    expect(() => TickerSearchQuerySchema.parse({ q: "" })).toThrow();
  });
});
