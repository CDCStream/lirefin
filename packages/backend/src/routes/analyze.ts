import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AnalyzeEstimateRequestSchema,
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  type AnalyzeResponse,
  creditsForUsage,
  estimateCredits,
} from "@fni/shared";
import { config } from "../config.js";
import { requireAuth } from "../plugins/auth.js";
import { hourlyLimitConfig } from "../plugins/rateLimit.js";
import {
  analyzeNewsWithClaude,
  streamAnalyzeNewsWithClaude,
} from "../services/claude.js";
import {
  analyzeCache,
  buildAnalyzeCacheKey,
  hashArticle,
} from "../services/cache.js";
import {
  chargeCredits,
  estimateClaudeCostUsd,
  getBalance,
  InsufficientCreditsError,
  recordAnalysis,
} from "../services/billing.js";

export async function analyzeRoute(app: FastifyInstance) {
  // Pre-flight credit estimate. Cheap & idempotent — no Claude calls, no
  // writes. Lets the UI render an "≈X credits" badge before the user commits
  // to spending. Intentionally NOT rate-limited under hourly: the user can
  // re-estimate as they refine their selection.
  app.post(
    "/analyze/estimate",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const user = req.user!;
      const parsed = AnalyzeEstimateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid request body",
          code: "INVALID_BODY",
          details: parsed.error.flatten(),
        });
      }
      const data = parsed.data;
      const wordCount = data.articleText
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      const estimate = estimateCredits(wordCount, data.portfolio.length);
      const balance = await getBalance(user.id).catch(() => 0);
      return reply.send({
        estimate,
        balance,
        sufficient: balance >= estimate,
        wordCount,
        assetCount: data.portfolio.length,
      });
    },
  );

  app.post(
    "/analyze",
    {
      preHandler: [requireAuth],
      config: {
        rateLimit: hourlyLimitConfig,
      },
    },
    async (req, reply) => {
      const user = req.user;
      if (!user) {
        return reply.code(401).send({
          error: "Authentication required.",
          code: "UNAUTHENTICATED",
        });
      }

      const parsed = AnalyzeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid request body",
          code: "INVALID_BODY",
          details: parsed.error.flatten(),
        });
      }
      const data = parsed.data;

      const articleHash = hashArticle(data.articleText);
      const cacheKey = buildAnalyzeCacheKey({
        url: data.url,
        outputLanguage: data.outputLanguage,
        portfolio: data.portfolio.map((p) => ({
          symbol: p.symbol,
          exchange: p.exchange,
        })),
        articleHash,
      });

      const cached = analyzeCache.get(cacheKey) as AnalyzeResponse | undefined;
      if (cached) {
        const balance = await getBalance(user.id).catch(() => 0);
        return reply.send({
          ...cached,
          cached: true,
          balance,
          creditsCharged: 0,
        });
      }

      // -------- Pre-flight credit check --------
      const wordCount = data.articleText
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      const estimate = estimateCredits(wordCount, data.portfolio.length);
      const balanceBefore = await getBalance(user.id);
      if (balanceBefore < estimate) {
        return reply.code(402).send({
          error: "Insufficient credits.",
          code: "INSUFFICIENT_CREDITS",
          balance: balanceBefore,
          estimate,
        });
      }

      // -------- Run Claude --------
      let claudeResult;
      try {
        claudeResult = await analyzeNewsWithClaude(data);
      } catch (err) {
        const e = err as Error & { status?: number; statusCode?: number };
        app.log.error({ err: e }, "analyze failed");
        const status = e.status ?? e.statusCode ?? 500;
        return reply.code(status >= 500 ? 502 : status).send({
          error: e.message || "Analyze failed",
          code: "ANALYZE_FAILED",
        });
      }

      const response: AnalyzeResponse = {
        detectedLanguage: claudeResult.detectedLanguage,
        marketSummary: claudeResult.marketSummary,
        assets: claudeResult.assets,
        modelUsage: claudeResult.modelUsage,
        cached: false,
        generatedAt: new Date().toISOString(),
      };

      const validated = AnalyzeResponseSchema.safeParse(response);
      if (!validated.success) {
        app.log.error(
          { issues: validated.error.flatten() },
          "Claude response failed schema validation",
        );
        return reply.code(502).send({
          error: "AI response did not match the expected schema.",
          code: "BAD_AI_RESPONSE",
        });
      }

      // -------- Post-call exact charge --------
      const credits = creditsForUsage({
        inputTokens: claudeResult.modelUsage.inputTokens,
        outputTokens: claudeResult.modelUsage.outputTokens,
      });
      const costUsd = estimateClaudeCostUsd(
        claudeResult.modelUsage.inputTokens,
        claudeResult.modelUsage.outputTokens,
      );

      let newBalance = balanceBefore;
      try {
        newBalance = await chargeCredits(user.id, credits, {
          url: data.url,
          articleHash,
          assetCount: data.portfolio.length,
          wordCount,
          inputTokens: claudeResult.modelUsage.inputTokens,
          outputTokens: claudeResult.modelUsage.outputTokens,
          costUsd,
        });
      } catch (err) {
        if (err instanceof InsufficientCreditsError) {
          // Real usage was higher than the estimate — extremely rare. Refund-safe:
          // we never charged the user, so just block the response.
          return reply.code(402).send({
            error: "Insufficient credits.",
            code: "INSUFFICIENT_CREDITS",
            balance: err.balance,
            estimate: credits,
          });
        }
        app.log.error({ err }, "credit charge failed");
        return reply.code(500).send({
          error: "Could not charge credits.",
          code: "BILLING_FAILED",
        });
      }

      // -------- Audit log (non-fatal) --------
      void recordAnalysis({
        userId: user.id,
        urlHash: articleHash,
        assetCount: data.portfolio.length,
        wordCount,
        inputTokens: claudeResult.modelUsage.inputTokens,
        outputTokens: claudeResult.modelUsage.outputTokens,
        costUsd,
        creditsCharged: credits,
        cached: false,
      }).catch((err) => {
        app.log.warn({ err }, "could not write analyses audit row");
      });

      analyzeCache.set(cacheKey, validated.data, config.cacheTtlSeconds);

      return reply.send({
        ...validated.data,
        balance: newBalance,
        creditsCharged: credits,
      });
    },
  );

  // ---------------- Streaming variant ----------------
  // Same contract as /analyze, but the response is a Server-Sent Events
  // stream. The terminal `final` event carries the same JSON shape as the
  // non-streaming endpoint; clients that don't care about progress can
  // simply ignore the intermediate `progress` events.
  //
  // Auth + rate-limit are applied identically. Cache hits short-circuit
  // straight to a `final` event so callers get the same low-latency UX.
  app.post(
    "/analyze/stream",
    {
      preHandler: [requireAuth],
      config: { rateLimit: hourlyLimitConfig },
    },
    async (req, reply) => {
      const user = req.user;
      if (!user) {
        return reply
          .code(401)
          .send({ error: "Authentication required.", code: "UNAUTHENTICATED" });
      }

      const parsed = AnalyzeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid request body",
          code: "INVALID_BODY",
          details: parsed.error.flatten(),
        });
      }
      const data = parsed.data;

      // Hijack the response — from this point on we own the raw socket and
      // Fastify won't try to serialise anything on top of what we write.
      reply.hijack();
      const raw = reply.raw;
      raw.statusCode = 200;
      raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      raw.setHeader("Cache-Control", "no-cache, no-transform");
      raw.setHeader("Connection", "keep-alive");
      raw.setHeader("X-Accel-Buffering", "no");
      raw.flushHeaders?.();

      const send = (event: string, payload: unknown) => {
        raw.write(`event: ${event}\n`);
        raw.write(`data: ${JSON.stringify(payload)}\n\n`);
      };
      const finish = () => {
        try {
          raw.end();
        } catch {
          // already closed
        }
      };
      const sendError = (
        message: string,
        code: string,
        extra: Record<string, unknown> = {},
      ) => {
        send("error", { error: message, code, ...extra });
        finish();
      };

      // Cache hit fast-path — emit a single final event.
      const articleHash = hashArticle(data.articleText);
      const cacheKey = buildAnalyzeCacheKey({
        url: data.url,
        outputLanguage: data.outputLanguage,
        portfolio: data.portfolio.map((p) => ({
          symbol: p.symbol,
          exchange: p.exchange,
        })),
        articleHash,
      });
      const cached = analyzeCache.get(cacheKey) as AnalyzeResponse | undefined;
      if (cached) {
        const balance = await getBalance(user.id).catch(() => 0);
        send("started", { cached: true, title: data.title });
        send("final", {
          ...cached,
          cached: true,
          balance,
          creditsCharged: 0,
        });
        finish();
        return;
      }

      // Pre-flight credit check.
      const wordCount = data.articleText.trim().split(/\s+/).filter(Boolean).length;
      const estimate = estimateCredits(wordCount, data.portfolio.length);
      const balanceBefore = await getBalance(user.id);
      if (balanceBefore < estimate) {
        sendError("Insufficient credits.", "INSUFFICIENT_CREDITS", {
          balance: balanceBefore,
          estimate,
        });
        return;
      }

      send("started", { cached: false, title: data.title, estimate });

      // Wire up Anthropic streaming. We bail early if the client disconnects
      // mid-flight so we don't waste tokens on a result nobody will see.
      const handle = streamAnalyzeNewsWithClaude(data);
      let aborted = false;
      const onClose = () => {
        aborted = true;
      };
      req.raw.once("close", onClose);

      try {
        for await (const ev of handle.events) {
          if (aborted) return;
          if (ev.type === "connected") {
            send("progress", { stage: "connected" });
          } else if (ev.type === "progress") {
            send("progress", {
              stage: "generating",
              outputTokens: ev.outputTokens,
            });
          }
        }
      } catch (err) {
        if (aborted) return;
        const e = err as Error & { status?: number; statusCode?: number };
        app.log.error({ err: e }, "stream analyze failed");
        sendError(e.message || "Analyze failed", "ANALYZE_FAILED");
        return;
      }

      let result;
      try {
        result = await handle.finalize();
      } catch (err) {
        if (aborted) return;
        const e = err as Error;
        app.log.error({ err: e }, "stream finalize failed");
        sendError(e.message || "Analyze finalize failed", "ANALYZE_FAILED");
        return;
      }

      const response: AnalyzeResponse = {
        detectedLanguage: result.detectedLanguage,
        marketSummary: result.marketSummary,
        assets: result.assets,
        modelUsage: result.modelUsage,
        cached: false,
        generatedAt: new Date().toISOString(),
      };
      const validated = AnalyzeResponseSchema.safeParse(response);
      if (!validated.success) {
        app.log.error(
          { issues: validated.error.flatten() },
          "Claude response failed schema validation",
        );
        sendError(
          "AI response did not match the expected schema.",
          "BAD_AI_RESPONSE",
        );
        return;
      }

      const credits = creditsForUsage({
        inputTokens: result.modelUsage.inputTokens,
        outputTokens: result.modelUsage.outputTokens,
      });
      const costUsd = estimateClaudeCostUsd(
        result.modelUsage.inputTokens,
        result.modelUsage.outputTokens,
      );

      let newBalance = balanceBefore;
      try {
        newBalance = await chargeCredits(user.id, credits, {
          url: data.url,
          articleHash,
          assetCount: data.portfolio.length,
          wordCount,
          inputTokens: result.modelUsage.inputTokens,
          outputTokens: result.modelUsage.outputTokens,
          costUsd,
        });
      } catch (err) {
        if (err instanceof InsufficientCreditsError) {
          sendError("Insufficient credits.", "INSUFFICIENT_CREDITS", {
            balance: err.balance,
            estimate: credits,
          });
          return;
        }
        app.log.error({ err }, "credit charge failed (stream)");
        sendError("Could not charge credits.", "BILLING_FAILED");
        return;
      }

      void recordAnalysis({
        userId: user.id,
        urlHash: articleHash,
        assetCount: data.portfolio.length,
        wordCount,
        inputTokens: result.modelUsage.inputTokens,
        outputTokens: result.modelUsage.outputTokens,
        costUsd,
        creditsCharged: credits,
        cached: false,
      }).catch((err) => {
        app.log.warn({ err }, "could not write analyses audit row (stream)");
      });

      analyzeCache.set(cacheKey, validated.data, config.cacheTtlSeconds);

      send("final", {
        ...validated.data,
        balance: newBalance,
        creditsCharged: credits,
      });
      finish();
      req.raw.off("close", onClose);
    },
  );
}

// Helper kept here (vs services/) so it stays close to the streaming route
// where the contract is actually defined; only used in tests for now.
export type { FastifyReply, FastifyRequest };
