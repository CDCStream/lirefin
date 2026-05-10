import Anthropic from "@anthropic-ai/sdk";
import type {
  AnalyzeRequest,
  AssetAnalysis,
  ModelUsage,
  Sentiment,
} from "@fni/shared";
import { config } from "../config.js";
import {
  ANALYZE_TOOL_NAME,
  analyzeToolSchema,
  buildSystemPrompt,
  buildUserMessage,
} from "../prompts/analyzeNews.js";

const client = new Anthropic({ apiKey: config.anthropicApiKey });

interface RawAnalyzeToolInput {
  detected_language: string;
  market_summary: string;
  assets: Array<{
    symbol: string;
    name: string;
    sentiment: string;
    confidence: number;
    rationale: string;
    relevant_quote?: string | null;
  }>;
}

export interface ClaudeAnalyzeResult {
  detectedLanguage: string;
  marketSummary: string;
  assets: AssetAnalysis[];
  modelUsage: ModelUsage;
}

function clampConfidence(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function normalizeSentiment(v: string): Sentiment {
  const s = v.toLowerCase().trim();
  if (s === "bullish" || s === "positive") return "bullish";
  if (s === "bearish" || s === "negative") return "bearish";
  return "neutral";
}

export async function analyzeNewsWithClaude(
  req: AnalyzeRequest,
): Promise<ClaudeAnalyzeResult> {
  const system = buildSystemPrompt(req.outputLanguage);
  const userText = buildUserMessage({
    url: req.url,
    title: req.title,
    articleText: req.articleText,
    pageLanguage: req.pageLanguage,
    portfolio: req.portfolio,
  });

  const response = await client.messages.create({
    model: config.anthropicModel,
    max_tokens: 2048,
    system,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [analyzeToolSchema as any],
    tool_choice: { type: "tool", name: ANALYZE_TOOL_NAME },
    messages: [{ role: "user", content: userText }],
  });

  const toolUse = response.content.find(
    (b) => b.type === "tool_use" && b.name === ANALYZE_TOOL_NAME,
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return the expected tool_use block.");
  }

  const raw = toolUse.input as RawAnalyzeToolInput;

  if (!raw || !Array.isArray(raw.assets)) {
    throw new Error("Claude tool_use payload is malformed.");
  }

  const assets: AssetAnalysis[] = raw.assets.map((a) => ({
    symbol: String(a.symbol ?? "").trim(),
    name: String(a.name ?? "").trim(),
    sentiment: normalizeSentiment(String(a.sentiment ?? "neutral")),
    confidence: clampConfidence(a.confidence),
    rationale: String(a.rationale ?? "").trim(),
    relevantQuote:
      a.relevant_quote && String(a.relevant_quote).trim().length > 0
        ? String(a.relevant_quote).trim()
        : null,
  }));

  return {
    detectedLanguage: String(raw.detected_language ?? req.pageLanguage ?? "en")
      .toLowerCase()
      .slice(0, 8),
    marketSummary: String(raw.market_summary ?? "").trim(),
    assets,
    modelUsage: {
      model: config.anthropicModel,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    },
  };
}

/**
 * Streaming variant. Yields lightweight progress events as Claude generates
 * the tool_use payload, then resolves to the same `ClaudeAnalyzeResult`
 * shape as `analyzeNewsWithClaude`.
 *
 * The progress events are intentionally coarse — we don't try to ship
 * partially parsed JSON to the client because mid-stream tool inputs are
 * not parseable and would just confuse the UI. Instead we surface:
 *   - `connected`  → request was accepted by Anthropic
 *   - `progress`   → running token counters (input/output so far)
 * The caller is then expected to `await streamHandle.finalize()` to receive
 * the validated result.
 */
export type ClaudeStreamEvent =
  | { type: "connected" }
  | { type: "progress"; outputTokens: number };

export interface ClaudeStreamHandle {
  events: AsyncIterable<ClaudeStreamEvent>;
  finalize: () => Promise<ClaudeAnalyzeResult>;
}

export function streamAnalyzeNewsWithClaude(
  req: AnalyzeRequest,
): ClaudeStreamHandle {
  const system = buildSystemPrompt(req.outputLanguage);
  const userText = buildUserMessage({
    url: req.url,
    title: req.title,
    articleText: req.articleText,
    pageLanguage: req.pageLanguage,
    portfolio: req.portfolio,
  });

  const stream = client.messages.stream({
    model: config.anthropicModel,
    max_tokens: 2048,
    system,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [analyzeToolSchema as any],
    tool_choice: { type: "tool", name: ANALYZE_TOOL_NAME },
    messages: [{ role: "user", content: userText }],
  });

  async function* events(): AsyncIterable<ClaudeStreamEvent> {
    let connected = false;
    // We rely on the underlying iterator that the SDK exposes: each chunk
    // carries enough information for us to compute a running output-token
    // count without having to parse the JSON ourselves.
    for await (const ev of stream) {
      if (!connected) {
        connected = true;
        yield { type: "connected" };
      }
      if (ev.type === "message_delta" && ev.usage) {
        yield {
          type: "progress",
          outputTokens: ev.usage.output_tokens ?? 0,
        };
      }
    }
  }

  async function finalize(): Promise<ClaudeAnalyzeResult> {
    const finalMsg = await stream.finalMessage();

    const toolUse = finalMsg.content.find(
      (b) => b.type === "tool_use" && b.name === ANALYZE_TOOL_NAME,
    );
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Claude did not return the expected tool_use block.");
    }

    const raw = toolUse.input as RawAnalyzeToolInput;
    if (!raw || !Array.isArray(raw.assets)) {
      throw new Error("Claude tool_use payload is malformed.");
    }

    const assets: AssetAnalysis[] = raw.assets.map((a) => ({
      symbol: String(a.symbol ?? "").trim(),
      name: String(a.name ?? "").trim(),
      sentiment: normalizeSentiment(String(a.sentiment ?? "neutral")),
      confidence: clampConfidence(a.confidence),
      rationale: String(a.rationale ?? "").trim(),
      relevantQuote:
        a.relevant_quote && String(a.relevant_quote).trim().length > 0
          ? String(a.relevant_quote).trim()
          : null,
    }));

    return {
      detectedLanguage: String(raw.detected_language ?? req.pageLanguage ?? "en")
        .toLowerCase()
        .slice(0, 8),
      marketSummary: String(raw.market_summary ?? "").trim(),
      assets,
      modelUsage: {
        model: config.anthropicModel,
        inputTokens: finalMsg.usage?.input_tokens ?? 0,
        outputTokens: finalMsg.usage?.output_tokens ?? 0,
      },
    };
  }

  return { events: events(), finalize };
}
