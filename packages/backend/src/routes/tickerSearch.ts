import type { FastifyInstance } from "fastify";
import {
  TickerSearchQuerySchema,
  TickerSearchResponseSchema,
} from "@fni/shared";
import { searchTickers } from "../services/finnhub.js";
import { requireAuth } from "../plugins/auth.js";

export async function tickerSearchRoute(app: FastifyInstance) {
  app.get(
    "/tickers/search",
    { preHandler: [requireAuth] },
    async (req, reply) => {
    const parsed = TickerSearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid query parameters",
        code: "INVALID_QUERY",
        details: parsed.error.flatten(),
      });
    }
    const { q, region, limit } = parsed.data;

    try {
      const results = await searchTickers(q, region, limit);
      const payload = TickerSearchResponseSchema.parse({
        count: results.length,
        results,
      });
      return reply.send(payload);
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      app.log.error({ err: e }, "ticker search failed");
      return reply.code(e.statusCode ?? 502).send({
        error: e.message ?? "Upstream error",
        code: "FINNHUB_ERROR",
      });
    }
  },
  );
}
