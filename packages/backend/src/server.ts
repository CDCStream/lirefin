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

  app.setErrorHandler((err: unknown, _req, reply) => {
    app.log.error({ err }, "request failed");
    const e = err as { statusCode?: number; message?: string; code?: string };
    const statusCode = e.statusCode ?? 500;
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
    process.exit(1);
  }
}

void main();
