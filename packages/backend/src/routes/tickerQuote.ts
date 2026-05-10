import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getProfile, getQuote } from "../services/finnhub.js";
import { regionFromExchange } from "@fni/shared";
import { requireAuth } from "../plugins/auth.js";

const ParamSchema = z.object({
  symbol: z.string().min(1).max(32),
});

export async function tickerQuoteRoute(app: FastifyInstance) {
  app.get(
    "/tickers/:symbol",
    { preHandler: [requireAuth] },
    async (req, reply) => {
    const parsed = ParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid symbol",
        code: "INVALID_SYMBOL",
      });
    }
    const symbol = parsed.data.symbol.toUpperCase();

    try {
      const [profile, quote] = await Promise.all([getProfile(symbol), getQuote(symbol)]);
      const exchange =
        profile?.exchange?.split(" ")[0] ??
        (symbol.includes(".") ? symbol.split(".").pop()! : "US");
      return reply.send({
        symbol,
        name: profile?.name ?? symbol,
        exchange,
        region: regionFromExchange(exchange),
        currency: profile?.currency,
        industry: profile?.finnhubIndustry,
        logo: profile?.logo,
        quote: quote
          ? {
              price: quote.c,
              change: quote.d,
              changePercent: quote.dp,
              high: quote.h,
              low: quote.l,
              open: quote.o,
              previousClose: quote.pc,
            }
          : null,
      });
    } catch (err) {
      app.log.error({ err }, "ticker quote failed");
      return reply.code(502).send({
        error: "Upstream error",
        code: "FINNHUB_ERROR",
      });
    }
  },
  );
}
