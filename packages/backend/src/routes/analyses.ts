import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AnalysisHistoryResponseSchema } from "@fni/shared";
import { requireAuth } from "../plugins/auth.js";
import { supabaseAdmin } from "../services/supabase.js";

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().datetime().optional(),
});

interface DbRow {
  id: string;
  asset_count: number;
  word_count: number;
  credits_charged: number;
  cached: boolean;
  created_at: string;
}

/**
 * Returns the user's analysis history, newest-first. We deliberately do NOT
 * ship the article URL or the AI response — only enough metadata for the
 * side panel "history" tab to render a tidy list. The article URL was hashed
 * on write, and re-running the analysis is a paid action anyway, so there's
 * no value in re-exposing the article text from the DB.
 *
 * Pagination follows the same `created_at` cursor pattern as
 * `/credits/transactions`.
 */
export async function analysesRoute(app: FastifyInstance) {
  app.get("/analyses", { preHandler: [requireAuth] }, async (req, reply) => {
    const user = req.user!;
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid query",
        code: "INVALID_QUERY",
        details: parsed.error.flatten(),
      });
    }
    const { limit, cursor } = parsed.data;

    let query = supabaseAdmin
      .from("analyses")
      .select("id, asset_count, word_count, credits_charged, cached, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) {
      app.log.error({ err: error }, "analyses select failed");
      return reply.code(500).send({
        error: "Could not load analyses.",
        code: "DB_ERROR",
      });
    }

    const rows = (data ?? []) as DbRow[];
    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;

    const items = trimmed.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      assetCount: r.asset_count,
      wordCount: r.word_count,
      creditsCharged: r.credits_charged,
      cached: r.cached,
    }));

    const payload = AnalysisHistoryResponseSchema.parse({ items, hasMore });
    return reply.send(payload);
  });
}
