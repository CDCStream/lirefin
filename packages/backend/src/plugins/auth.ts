import type { FastifyRequest, FastifyReply } from "fastify";
import { supabaseAdmin } from "../services/supabase.js";

export interface AuthUser {
  id: string;
  email: string | null;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

function extractToken(req: FastifyRequest): string | null {
  const h = req.headers.authorization;
  if (!h || typeof h !== "string") return null;
  if (!h.toLowerCase().startsWith("bearer ")) return null;
  const token = h.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Validates the `Authorization: Bearer <jwt>` header against Supabase Auth
 * and attaches `req.user` for downstream handlers.
 *
 * On failure: 401 + `UNAUTHENTICATED`.
 */
export async function requireAuth(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    return reply.code(401).send({
      error: "Missing or invalid Authorization header.",
      code: "UNAUTHENTICATED",
    });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return reply.code(401).send({
      error: error?.message ?? "Invalid or expired session.",
      code: "UNAUTHENTICATED",
    });
  }

  req.user = {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}
