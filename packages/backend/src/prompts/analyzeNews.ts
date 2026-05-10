import type { Asset } from "@fni/shared";
import { getLanguageEnglishName, type SupportedLanguageCode } from "@fni/shared";

export const ANALYZE_TOOL_NAME = "submit_portfolio_analysis";

export const analyzeToolSchema = {
  name: ANALYZE_TOOL_NAME,
  description:
    "Submit the structured impact analysis of the news article on each portfolio asset.",
  input_schema: {
    type: "object",
    properties: {
      detected_language: {
        type: "string",
        description: "ISO 639-1 code of the detected article language (e.g. 'en', 'tr', 'ja').",
      },
      market_summary: {
        type: "string",
        description:
          "Concise (2-4 sentences) overall market/news summary written in the requested output language.",
      },
      assets: {
        type: "array",
        description:
          "One entry per portfolio asset, in the same order as provided. Always include every asset.",
        items: {
          type: "object",
          properties: {
            symbol: { type: "string", description: "Ticker symbol from the input." },
            name: { type: "string", description: "Asset name from the input." },
            sentiment: {
              type: "string",
              enum: ["bullish", "neutral", "bearish"],
              description:
                "Expected near-term directional impact of this article on the asset. 'neutral' if the article is irrelevant or mixed.",
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description:
                "How confident you are about this call (0-1). Use low values when the article barely mentions the asset or its sector.",
            },
            rationale: {
              type: "string",
              description:
                "1-3 sentence justification grounded in the article. MUST be written in the requested output language.",
            },
            relevant_quote: {
              type: "string",
              description:
                "Optional short verbatim quote from the article supporting the call. Leave empty string if none.",
            },
          },
          required: ["symbol", "name", "sentiment", "confidence", "rationale"],
        },
      },
    },
    required: ["detected_language", "market_summary", "assets"],
  },
};

export function buildSystemPrompt(outputLanguage: SupportedLanguageCode): string {
  const langName = getLanguageEnglishName(outputLanguage);
  return [
    "You are a senior financial analyst.",
    "Your job is to read a single news article and assess its near-term directional impact on a fixed portfolio of assets.",
    "",
    "Rules:",
    "- Use ONLY information present in the article. Do not fabricate prices, figures, or events.",
    "- For each asset in the input portfolio, return exactly one entry, even if the article is unrelated (use 'neutral' with low confidence in that case).",
    "- 'bullish' means likely positive for the asset, 'bearish' means likely negative, 'neutral' means unclear / mixed / irrelevant.",
    "- Confidence MUST reflect how directly the article addresses the asset, its sector, or material macro drivers for it.",
    "- Be concise. Avoid hedging filler.",
    "- This is NOT investment advice; the consumer UI will display a disclaimer.",
    "",
    `OUTPUT LANGUAGE: All free-text fields ('market_summary', 'rationale', 'relevant_quote') MUST be written in ${langName} (ISO code: ${outputLanguage}).`,
    "Quoted text from the article ('relevant_quote') should be in the original article language verbatim, NOT translated.",
    "",
    `You MUST respond by calling the '${ANALYZE_TOOL_NAME}' tool. Do not produce any other output.`,
  ].join("\n");
}

export function buildUserMessage(params: {
  url: string;
  title: string;
  articleText: string;
  pageLanguage?: string;
  portfolio: Asset[];
}): string {
  const portfolioBlock = params.portfolio
    .map(
      (a, i) =>
        `${i + 1}. ${a.symbol} — ${a.name} (${a.exchange}, ${a.type}${a.region ? `, ${a.region}` : ""})`,
    )
    .join("\n");

  return [
    "## ARTICLE",
    `URL: ${params.url}`,
    `Title: ${params.title}`,
    params.pageLanguage ? `Page language hint: ${params.pageLanguage}` : "",
    "",
    "Article text:",
    "```",
    params.articleText,
    "```",
    "",
    "## PORTFOLIO",
    portfolioBlock,
    "",
    `Assess the impact of the article on EACH of the ${params.portfolio.length} assets above.`,
    `Call the '${ANALYZE_TOOL_NAME}' tool with the structured result.`,
  ]
    .filter(Boolean)
    .join("\n");
}
