import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import { addCredits, getBalance } from "../services/billing.js";
import * as dodo from "../services/dodopayments.js";
import { supabaseAdmin } from "../services/supabase.js";
import { config } from "../config.js";
import { SIGNUP_BONUS_CREDITS } from "@fni/shared";

export async function authRoute(app: FastifyInstance) {
  app.get("/me", { preHandler: [requireAuth] }, async (req) => {
    const user = req.user!;

    let balance = await getBalance(user.id);

    // Self-heal: if for some reason the signup-bonus trigger didn't run
    // (older accounts created before the migration), top them up once.
    // Skipped for users who previously deleted their account — those
    // rows have a 0-balance row already in place but no transactions,
    // and the deleted_users hash makes the trigger explicitly grant 0.
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

  // ===================================================================
  // DELETE /api/auth/account
  //
  // Permanently deletes the user's account and all data associated with
  // it. This is the GDPR Article 17 / KVKK Madde 11 / Web Store policy
  // implementation: a self-service erasure flow that does not require
  // emailing support.
  //
  // Flow:
  //
  //   1. (Optional) Cancel the user's active Dodo subscription so no
  //      future charges land. We schedule cancel_at_next_billing_date
  //      rather than calling a hypothetical immediate-cancel endpoint —
  //      functionally equivalent for our case because the account is
  //      gone and the user can't use the remaining credits.
  //
  //   2. (Optional) Refund the most recent successful payment if the
  //      user opted in. The matching `payment.refunded` webhook will
  //      arrive afterwards but our local rows are already going away.
  //
  //   3. Call the `delete_user_account` Supabase RPC, which records
  //      the email hash in `deleted_users` (anti-abuse) and deletes
  //      the `auth.users` row. ON DELETE CASCADE foreign keys then
  //      remove every related public.* row (credit_balances,
  //      credit_transactions, analyses, purchases, subscriptions,
  //      billing_customers).
  //
  // Returns:
  //   - `{ deleted: true, refunded: boolean, subscriptionCancelled: boolean }`
  //   - 200 even if the user had no subscription / no payments.
  //
  // Failure modes:
  //   - Dodo cancel fails  → log + continue. The DB delete still runs;
  //                          the orphaned subscription gets cancelled
  //                          via the customer portal or by us in
  //                          out-of-band cleanup.
  //   - Dodo refund fails → return 502 BEFORE deleting the DB row, so
  //                         the user keeps their account and can retry.
  //                         This is the most user-visible step that
  //                         must succeed when requested.
  //   - DB delete fails    → return 500. Dodo cancel/refund have
  //                          already run, so the user's billing is
  //                          fine — they just need to retry deletion.
  // ===================================================================
  app.delete(
    "/auth/account",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const user = req.user!;
      const body =
        (req.body as { refundCurrentPeriod?: boolean } | undefined) ?? {};
      const wantsRefund = body.refundCurrentPeriod === true;

      // ---- 1. Resolve the active subscription, if any.
      let subscriptionCancelled = false;
      let refunded = false;
      let hadPaidSubscription = false;

      // Look up our local subscriptions row first — we keep one row per
      // Dodo subscription. We only care about active-ish statuses; a
      // long-cancelled row should be left alone.
      const { data: subRow } = await supabaseAdmin
        .from("subscriptions")
        .select("subscription_id, status, customer_id, provider")
        .eq("user_id", user.id)
        .eq("provider", "dodo")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const subscriptionId = subRow?.subscription_id ?? null;
      const subStatus = subRow?.status ?? null;
      const isLiveSub =
        subscriptionId !== null &&
        (subStatus === "active" ||
          subStatus === "trialing" ||
          subStatus === "past_due" ||
          subStatus === "on_hold" ||
          subStatus === "pending");

      if (isLiveSub) {
        hadPaidSubscription = true;

        // ---- 2a. Schedule cancellation at next billing date so no
        // future charge fires. We do NOT use an "immediate" cancel
        // because Dodo's API surfaces cancel-at-period-end as the
        // cleanest pattern; the account deletion makes the period-end
        // distinction moot for our user (their account is gone).
        if (config.billingProvider === "dodo") {
          try {
            await dodo.setSubscriptionCancelAtPeriodEnd({
              subscriptionId: subscriptionId!,
              cancel: true,
              reason: "Account deleted by user",
            });
            subscriptionCancelled = true;
          } catch (err) {
            app.log.error(
              { err, subscriptionId, userId: user.id },
              "failed to cancel dodo subscription during account deletion",
            );
            // We continue — the user gets to delete their account even
            // if Dodo had a hiccup. Out-of-band cleanup catches stragglers.
          }
        }

        // ---- 2b. Optionally refund the most recent successful payment
        // for this user. We only refund if it succeeded recently enough
        // (≤ 30 days) — older payments are unlikely to be reversible
        // through the API and require manual intervention anyway.
        if (wantsRefund && config.billingProvider === "dodo") {
          const since = new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString();
          const { data: latestPayment } = await supabaseAdmin
            .from("purchases")
            .select("provider_order_id, status, created_at")
            .eq("user_id", user.id)
            .eq("provider", "dodo")
            .eq("status", "completed")
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestPayment?.provider_order_id) {
            try {
              const result = await dodo.refundPayment({
                paymentId: latestPayment.provider_order_id,
                reason: "Account deletion — full refund requested by user",
              });
              refunded = result.refunded || result.alreadyRefunded;
            } catch (err) {
              app.log.error(
                {
                  err,
                  paymentId: latestPayment.provider_order_id,
                  userId: user.id,
                },
                "refund failed during account deletion",
              );
              return reply.code(502).send({
                error:
                  "Refund could not be processed. Please try again or contact support; your account has not been deleted.",
                code: "REFUND_FAILED",
              });
            }
          } else {
            // No recent payment to refund. Tell the client honestly so
            // the UI doesn't say "refunded" when nothing was. The user
            // already wanted to delete; we proceed.
            refunded = false;
          }
        }
      }

      // ---- 3a. Record the email hash so a re-signup with the same
      // email gets 0 free credits. This is a narrow RPC that only
      // touches our `deleted_users` table — it deliberately does NOT
      // try to remove the auth.users row, because Supabase's auth
      // schema has internal GoTrue protections that reject custom
      // plpgsql delete attempts. The actual auth-side teardown is
      // delegated to the admin API call right below.
      const { error: rpcErr } = await supabaseAdmin.rpc(
        "record_user_deletion",
        {
          p_user_id: user.id,
          p_had_paid: hadPaidSubscription,
        },
      );

      if (rpcErr) {
        app.log.error(
          {
            err: rpcErr,
            userId: user.id,
            pgCode: (rpcErr as { code?: string }).code,
            pgDetails: (rpcErr as { details?: string }).details,
            pgHint: (rpcErr as { hint?: string }).hint,
          },
          "record_user_deletion RPC failed",
        );
        return reply.code(500).send({
          error: "Account deletion failed. Please try again.",
          code: "DELETE_FAILED",
          stage: "record_deletion",
          details: rpcErr.message,
        });
      }

      // ---- 3b. Delete the auth.users row via Supabase's admin API.
      // GoTrue cleans up sessions, identities, refresh tokens and MFA
      // factors automatically; foreign keys on our public.* tables
      // (all `on delete cascade`) wipe the rest in the same
      // transaction Supabase opens internally.
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(
        user.id,
      );

      if (authErr) {
        app.log.error(
          {
            err: authErr,
            userId: user.id,
            authCode: (authErr as { code?: string }).code,
            authStatus: (authErr as { status?: number }).status,
          },
          "auth.admin.deleteUser failed",
        );
        return reply.code(500).send({
          error: "Account deletion failed. Please try again.",
          code: "DELETE_FAILED",
          stage: "auth_admin_delete",
          details: authErr.message,
        });
      }

      app.log.info(
        {
          userId: user.id,
          email: user.email ?? null,
          subscriptionCancelled,
          refunded,
          hadPaidSubscription,
        },
        "user account deleted",
      );

      return reply.send({
        deleted: true,
        subscriptionCancelled,
        refunded,
      });
    },
  );
}
