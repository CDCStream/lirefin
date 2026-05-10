// Sentry instrumentation MUST be the first import — see instrument.ts.
import "./instrument.js";
import * as Sentry from "@sentry/node";
import Fastify from "fastify";
import { config } from "./config.js";
import { registerCors } from "./plugins/cors.js";
import { registerRateLimit } from "./plugins/rateLimit.js";
import { analyzeRoute } from "./routes/analyze.js";
import { tickerSearchRoute } from "./routes/tickerSearch.js";
import { tickerQuoteRoute } from "./routes/tickerQuote.js";
import { analysesRoute } from "./routes/analyses.js";
import { authRoute } from "./routes/auth.js";
import { billingRoute } from "./routes/billing.js";
import { billingSuccessRoute } from "./routes/billingSuccess.js";
import { creditsRoute } from "./routes/credits.js";

async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === "production" ? "info" : "debug",
      transport:
        config.nodeEnv !== "production"
          ? {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "HH:MM:ss" },
            }
          : undefined,
    },
    bodyLimit: 256 * 1024,
  });

  await registerCors(app);
  await registerRateLimit(app);

  app.get("/health", async () => ({
    status: "ok",
    model: config.anthropicModel,
    time: new Date().toISOString(),
  }));

  // Sentry self-test endpoint — guarded by env var so it's not exploitable in
  // prod by accident. Flip SENTRY_TEST_ENABLED=1 in Railway, hit this URL
  // once, confirm event in Sentry dashboard, then unset the var.
  if (process.env.SENTRY_TEST_ENABLED === "1") {
    app.get("/__sentry-test", async () => {
      throw new Error("Sentry self-test from /__sentry-test (safe to ignore)");
    });
  }

  await app.register(authRoute, { prefix: "/api" });
  await app.register(billingRoute, { prefix: "/api" });
  await app.register(creditsRoute, { prefix: "/api" });
  await app.register(analyzeRoute, { prefix: "/api" });
  await app.register(analysesRoute, { prefix: "/api" });
  await app.register(tickerSearchRoute, { prefix: "/api" });
  await app.register(tickerQuoteRoute, { prefix: "/api" });
  // Public landing + status (no /api prefix, no auth) — used as Polar's
  // success_url and polled by the page itself.
  await app.register(billingSuccessRoute);

  app.setErrorHandler((err: unknown, req, reply) => {
    app.log.error({ err }, "request failed");
    const e = err as { statusCode?: number; message?: string; code?: string };
    const statusCode = e.statusCode ?? 500;

    // Only ship 5xx & uncaught to Sentry. 4xx (validation, auth, rate limit)
    // are expected user errors and would burn through the free-tier quota.
    if (statusCode >= 500) {
      Sentry.captureException(err, {
        tags: {
          route: `${req.method} ${req.routeOptions?.url ?? req.url}`,
          status: String(statusCode),
        },
      });
    }

    reply.code(statusCode).send({
      error: e.message || "Internal server error",
      code: e.code ?? "INTERNAL_ERROR",
    });
  });

  return app;
}

async function main() {
  try {
    const app = await buildServer();
    await app.listen({ host: config.host, port: config.port });
    app.log.info(`FNI backend listening on http://${config.host}:${config.port}`);
  } catch (err) {
    console.error("Failed to start server:", err);
    Sentry.captureException(err);
    // Give Sentry up to 2s to ship the boot failure before we exit.
    await Sentry.close(2000).catch(() => {});
    process.exit(1);
  }
}

void main();
