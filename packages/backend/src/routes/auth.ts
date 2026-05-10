import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import { addCredits, getBalance } from "../services/billing.js";
import { supabaseAdmin } from "../services/supabase.js";
import { SIGNUP_BONUS_CREDITS } from "@fni/shared";

export async function authRoute(app: FastifyInstance) {
  app.get("/me", { preHandler: [requireAuth] }, async (req) => {
    const user = req.user!;

    let balance = await getBalance(user.id);

    // Self-heal: if for some reason the signup-bonus trigger didn't run
    // (older accounts created before the migration), top them up once.
    if (balance === 0) {
      const { count } = await supabaseAdmin
        .from("credit_transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if ((count ?? 0) === 0) {
        try {
          balance = await addCredits(
            user.id,
            SIGNUP_BONUS_CREDITS,
            "signup_bonus",
            { source: "self_heal" },
          );
        } catch (err) {
          app.log.warn({ err }, "self-heal signup bonus failed");
        }
      }
    }

    return {
      id: user.id,
      email: user.email,
      balance,
    };
  });
}
