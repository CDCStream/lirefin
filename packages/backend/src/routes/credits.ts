import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CreditTransactionListResponseSchema } from "@fni/shared";
import { requireAuth } from "../plugins/auth.js";
import { supabaseAdmin } from "../services/supabase.js";

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().datetime().optional(),
});

interface DbRow {
  id: string;
  delta: number;
  kind: "signup_bonus" | "purchase" | "spend" | "refund" | "adjustment";
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Returns the user's credit ledger, sorted newest-first. We keep the
 * response surface small and stable: only whitelisted metadata fields are
 * projected (`packageId`, `assetCount`, `wordCount`) so we never accidentally
 * leak internal hashes / URLs that might end up in the metadata bag.
 *
 * Pagination is timestamp-cursor based — the next cursor is the `createdAt`
 * of the last item, which the client can pass back as `?cursor=...` to fetch
 * the next page. We over-fetch by one to compute `hasMore` cheaply.
 */
export async function creditsRoute(app: FastifyInstance) {
  app.get("/credits/transactions", { preHandler: [requireAuth] }, async (req, reply) => {
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
      .from("credit_transactions")
      .select("id, delta, kind, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) {
      app.log.error({ err: error }, "credit_transactions select failed");
      return reply.code(500).send({
        error: "Could not load transactions.",
        code: "DB_ERROR",
      });
    }

    const rows = (data ?? []) as DbRow[];
    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;

    // Metadata historically used both `package_id` (purchases) and `wordCount`
    // (spend) — picking either spelling is the safest projection because we
    // never want a UI break to depend on which writer wrote the row.
    const pickString = (m: Record<string, unknown>, ...keys: string[]) => {
      for (const k of keys) {
        if (typeof m[k] === "string") return m[k] as string;
      }
      return null;
    };
    const pickNumber = (m: Record<string, unknown>, ...keys: string[]) => {
      for (const k of keys) {
        if (typeof m[k] === "number") return m[k] as number;
      }
      return null;
    };

    const transactions = trimmed.map((r) => {
      const meta = r.metadata ?? {};
      return {
        id: r.id,
        delta: r.delta,
        kind: r.kind,
        createdAt: r.created_at,
        packageId: pickString(meta, "packageId", "package_id"),
        assetCount: pickNumber(meta, "assetCount", "asset_count"),
        wordCount: pickNumber(meta, "wordCount", "word_count"),
      };
    });

    const payload = CreditTransactionListResponseSchema.parse({
      transactions,
      hasMore,
    });
    return reply.send(payload);
  });
}
