import type { FastifyInstance } from "fastify";
import { CREDIT_PACKAGES } from "@fni/shared";
import { config } from "../config.js";
import { requireAuth } from "../plugins/auth.js";
import { addCredits } from "../services/billing.js";
import {
  changeSubscriptionProduct,
  createCheckoutSession,
  createCustomerPortalUrl,
  fetchLatestSubscriptionByExternalId,
  findDiscountIdByCode,
  findPackageByProductId,
  getPackageProducts,
  setSubscriptionCancelAtPeriodEnd,
  verifyWebhook,
} from "../services/polar.js";
import { supabaseAdmin } from "../services/supabase.js";

export async function billingRoute(app: FastifyInstance) {
  // Polar follows the Standard Webhooks spec: signatures are computed over
  // the EXACT raw request body. Fastify's default JSON parser would mutate
  // the bytes, so for webhook requests we must keep the body as a Buffer.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      if (req.url?.endsWith("/billing/webhook")) {
        done(null, body);
        return;
      }
      try {
        const json = JSON.parse((body as Buffer).toString("utf8"));
        done(null, json);
      } catch (err) {
        done(err as Error);
      }
    },
  );

  // ---------------- Public package list ----------------
  app.get("/billing/packages", async () => {
    const products = getPackageProducts();
    const available = new Set(products.map((p) => p.pkg.id));
    return {
      packages: CREDIT_PACKAGES.map((p) => ({
        id: p.id,
        label: p.label,
        usd: p.usd,
        credits: p.credits,
        bonusPct: p.bonusPct,
        unlimited: p.unlimited === true,
        available: available.has(p.id),
      })),
    };
  });

  // ---------------- Authenticated checkout ----------------
  app.post(
    "/billing/checkout",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const user = req.user!;
      const body =
        (req.body as
          | { packageId?: string; language?: string }
          | undefined) ?? {};
      const packageId = body.packageId;
      if (!packageId) {
        return reply
          .code(400)
          .send({ error: "packageId is required", code: "MISSING_PACKAGE" });
      }
      // Pass through the user's selected UI language so the success page
      // renders in the same locale they see in the extension. `polar.ts`
      // safely appends `checkout_id={CHECKOUT_ID}` with the right separator.
      const langParam =
        typeof body.language === "string" && /^[a-zA-Z-]{2,8}$/.test(body.language)
          ? `?lang=${encodeURIComponent(body.language)}`
          : "";
      const successUrl = `${config.publicAppUrl}/billing/success${langParam}`;
      try {
        const checkout = await createCheckoutSession({
          userId: user.id,
          email: user.email,
          packageId,
          successUrl,
        });
        return reply.send({
          url: checkout.url,
          sessionId: checkout.id,
        });
      } catch (err) {
        const e = err as Error & { statusCode?: number; code?: string };
        return reply.code(e.statusCode ?? 500).send({
          error: e.message,
          code: e.code ?? "POLAR_FAILED",
        });
      }
    },
  );

  // ---------------- Active subscription ----------------
  // The extension calls this on every Options page load to render the
  // "Active plan" card and decide whether to show "Subscribe" or
  // "Manage / Switch plan". We treat any non-revoked / non-canceled-and-
  // ended row as the active subscription.
  //
  // If our local `subscriptions` table is empty (because the webhook
  // events for `subscription.*` weren't enabled when the user first
  // subscribed, or because the migration hasn't been run yet) we fall
  // back to a live lookup against Polar — the source of truth — and
  // backfill the row so subsequent calls are fast and offline-resilient.
  app.get(
    "/billing/subscription",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const user = req.user!;

      // First try local DB. If the table doesn't exist (migration not run
      // yet) the error code is 42P01 — we fall through to the Polar
      // lookup rather than 500'ing.
      const { data, error } = await supabaseAdmin
        .from("subscriptions")
        .select(
          "polar_subscription_id, package_id, product_id, status, current_period_end, cancel_at_period_end, canceled_at",
        )
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      const tableMissing =
        error && (error as { code?: string }).code === "42P01";

      if (error && !tableMissing) {
        app.log.warn({ err: error }, "subscription lookup failed");
        return reply.code(500).send({ error: "DB read failed" });
      }

      const row = data?.[0];
      if (row) {
        const stillActive =
          row.status === "active" ||
          row.status === "trialing" ||
          row.status === "past_due" ||
          (row.status === "canceled" &&
            row.current_period_end &&
            new Date(row.current_period_end).getTime() > Date.now());
        return reply.send({
          active: stillActive,
          status: row.status,
          packageId: row.package_id,
          productId: row.product_id,
          currentPeriodEnd: row.current_period_end,
          cancelAtPeriodEnd: row.cancel_at_period_end,
          canceledAt: row.canceled_at,
        });
      }

      // ---- Polar fallback (no local row yet) ----
      let polarSub;
      try {
        polarSub = await fetchLatestSubscriptionByExternalId(user.id);
      } catch (err) {
        // Polar can return 404 for "no customer found" — that's a normal
        // "user has never subscribed" answer, not an error. The SDK
        // surfaces this as `status: 404` on the thrown error.
        const e = err as Error & {
          status?: number;
          statusCode?: number;
          code?: string;
        };
        const httpStatus = e.statusCode ?? e.status;
        if (httpStatus !== 404) {
          app.log.warn({ err: e }, "polar subscription fallback failed");
        }
        return reply.send({ active: false });
      }
      if (!polarSub) {
        return reply.send({ active: false });
      }

      const pkg = findPackageByProductId(polarSub.productId);
      if (!pkg) {
        // Polar has a subscription but its product isn't one of ours —
        // probably a stale test product. Treat as inactive.
        return reply.send({ active: false });
      }

      // Backfill our table so subsequent reads are fast. We tolerate write
      // failures silently — if the migration hasn't been run, we still
      // want the live data to flow back to the UI.
      if (!tableMissing) {
        await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              polar_subscription_id: polarSub.id,
              user_id: user.id,
              package_id: pkg.id,
              product_id: polarSub.productId,
              status: polarSub.status,
              current_period_end: polarSub.currentPeriodEnd
                ? polarSub.currentPeriodEnd.toISOString()
                : null,
              cancel_at_period_end: polarSub.cancelAtPeriodEnd,
              canceled_at: polarSub.canceledAt
                ? polarSub.canceledAt.toISOString()
                : null,
            },
            { onConflict: "polar_subscription_id" },
          )
          .then(({ error: upsertErr }) => {
            if (upsertErr) {
              app.log.warn(
                { err: upsertErr },
                "subscription backfill upsert failed (non-fatal)",
              );
            }
          });
      }

      const stillActive =
        polarSub.status === "active" ||
        polarSub.status === "trialing" ||
        polarSub.status === "past_due" ||
        (polarSub.status === "canceled" &&
          polarSub.currentPeriodEnd &&
          polarSub.currentPeriodEnd.getTime() > Date.now());

      return reply.send({
        active: stillActive,
        status: polarSub.status,
        packageId: pkg.id,
        productId: polarSub.productId,
        currentPeriodEnd: polarSub.currentPeriodEnd
          ? polarSub.currentPeriodEnd.toISOString()
          : null,
        cancelAtPeriodEnd: polarSub.cancelAtPeriodEnd,
        canceledAt: polarSub.canceledAt
          ? polarSub.canceledAt.toISOString()
          : null,
      });
    },
  );

  // ---------------- Inline subscription management ----------------
  // The extension calls these so the user can switch tier / cancel /
  // resume WITHOUT leaving the Settings page. Each handler resolves the
  // user's current subscription via the same DB-then-Polar fallback the
  // GET endpoint uses, so it Just Works even if our local row is stale.
  async function resolveSubscriptionId(userId: string): Promise<{
    subscriptionId: string;
    productId: string;
  } | null> {
    const { data } = await supabaseAdmin
      .from("subscriptions")
      .select("polar_subscription_id, product_id, status, current_period_end")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1);
    const row = data?.[0];
    if (
      row &&
      (row.status === "active" ||
        row.status === "trialing" ||
        row.status === "past_due" ||
        (row.status === "canceled" &&
          row.current_period_end &&
          new Date(row.current_period_end).getTime() > Date.now()))
    ) {
      return {
        subscriptionId: row.polar_subscription_id,
        productId: row.product_id,
      };
    }
    // DB miss — ask Polar directly.
    try {
      const sub = await fetchLatestSubscriptionByExternalId(userId);
      if (!sub) return null;
      return { subscriptionId: sub.id, productId: sub.productId };
    } catch {
      return null;
    }
  }

  app.post(
    "/billing/subscription/change",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const user = req.user!;
      const body =
        (req.body as
          | { packageId?: string; discountCode?: string }
          | undefined) ?? {};
      if (!body.packageId) {
        return reply
          .code(400)
          .send({ error: "packageId is required", code: "MISSING_PACKAGE" });
      }
      const target = getPackageProducts().find(
        (p) => p.pkg.id === body.packageId,
      );
      if (!target) {
        return reply
          .code(400)
          .send({ error: "Unknown package", code: "UNKNOWN_PACKAGE" });
      }
      const sub = await resolveSubscriptionId(user.id);
      if (!sub) {
        return reply
          .code(404)
          .send({ error: "No active subscription", code: "NO_SUBSCRIPTION" });
      }
      if (sub.productId === target.productId) {
        return reply
          .code(409)
          .send({ error: "Already on this plan", code: "SAME_PLAN" });
      }

      // Optional promo code lookup. We resolve the code → discountId here
      // so we can return a 422 with a useful error before mutating the
      // subscription on Polar's side; otherwise an invalid code would
      // silently no-op while the tier swap still went through at full
      // price.
      let discountId: string | null = null;
      if (typeof body.discountCode === "string" && body.discountCode.trim()) {
        try {
          discountId = await findDiscountIdByCode(body.discountCode);
        } catch (err) {
          app.log.warn({ err }, "discount lookup failed");
        }
        if (!discountId) {
          return reply.code(422).send({
            error: "Invalid promo code",
            code: "INVALID_DISCOUNT",
          });
        }
      }

      try {
        await changeSubscriptionProduct({
          subscriptionId: sub.subscriptionId,
          newProductId: target.productId,
          discountId,
        });
        return reply.send({
          ok: true,
          packageId: target.pkg.id,
          discountApplied: discountId !== null,
        });
      } catch (err) {
        const e = err as Error & { statusCode?: number; status?: number };
        const httpStatus = e.statusCode ?? e.status ?? 500;
        app.log.error({ err: e, subId: sub.subscriptionId }, "tier change failed");
        return reply.code(httpStatus).send({
          error: e.message || "Failed to change plan",
          code: "POLAR_UPDATE_FAILED",
        });
      }
    },
  );

  app.post(
    "/billing/subscription/cancel",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const user = req.user!;
      const body =
        (req.body as { reason?: string } | undefined) ?? {};
      const sub = await resolveSubscriptionId(user.id);
      if (!sub) {
        return reply
          .code(404)
          .send({ error: "No active subscription", code: "NO_SUBSCRIPTION" });
      }
      try {
        await setSubscriptionCancelAtPeriodEnd({
          subscriptionId: sub.subscriptionId,
          cancel: true,
          reason: body.reason,
        });
        return reply.send({ ok: true });
      } catch (err) {
        const e = err as Error & { statusCode?: number; status?: number };
        const httpStatus = e.statusCode ?? e.status ?? 500;
        app.log.error({ err: e, subId: sub.subscriptionId }, "cancel failed");
        return reply.code(httpStatus).send({
          error: e.message || "Failed to cancel",
          code: "POLAR_CANCEL_FAILED",
        });
      }
    },
  );

  app.post(
    "/billing/subscription/uncancel",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const user = req.user!;
      const sub = await resolveSubscriptionId(user.id);
      if (!sub) {
        return reply
          .code(404)
          .send({ error: "No active subscription", code: "NO_SUBSCRIPTION" });
      }
      try {
        await setSubscriptionCancelAtPeriodEnd({
          subscriptionId: sub.subscriptionId,
          cancel: false,
        });
        return reply.send({ ok: true });
      } catch (err) {
        const e = err as Error & { statusCode?: number; status?: number };
        const httpStatus = e.statusCode ?? e.status ?? 500;
        app.log.error({ err: e, subId: sub.subscriptionId }, "uncancel failed");
        return reply.code(httpStatus).send({
          error: e.message || "Failed to resume",
          code: "POLAR_UNCANCEL_FAILED",
        });
      }
    },
  );

  // ---------------- Customer portal session ----------------
  // Returns a one-shot Polar-hosted URL where the user can switch plan,
  // cancel, or update their payment method. We don't iframe it (Polar
  // doesn't support that) — the extension opens it in a new tab.
  app.post(
    "/billing/portal",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const user = req.user!;
      try {
        const url = await createCustomerPortalUrl({
          userId: user.id,
          returnUrl: `${config.publicAppUrl}/billing/portal-return`,
        });
        return reply.send({ url });
      } catch (err) {
        const e = err as Error & {
          statusCode?: number;
          code?: string;
          status?: number;
        };
        // Polar SDK uses `status` (HTTP status) on errors, not `statusCode`.
        const httpStatus = e.statusCode ?? e.status ?? 500;
        if (httpStatus === 404) {
          return reply
            .code(404)
            .send({ error: "No customer record yet", code: "NO_CUSTOMER" });
        }
        app.log.error({ err: e }, "polar customer portal failed");
        return reply.code(httpStatus).send({
          error: e.message,
          code: e.code ?? "POLAR_PORTAL_FAILED",
        });
      }
    },
  );

  // ---------------- Polar webhook ----------------
  // We listen to `order.paid` (credit grants — both first purchase AND
  // monthly renewal trigger this) and the `subscription.*` family (so we
  // can track tier swaps and cancellations in our own DB).
  app.post(
    "/billing/webhook",
    { config: { rawBody: true } },
    async (req, reply) => {
      const raw = req.body as Buffer;

      let event;
      try {
        event = verifyWebhook(raw, req.headers);
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        app.log.warn({ err: e }, "polar webhook verification failed");
        return reply.code(e.statusCode ?? 400).send({ error: e.message });
      }

      // -------- Subscription lifecycle events --------
      if (event.type.startsWith("subscription.")) {
        const sub = event.data as {
          id: string;
          productId: string;
          status: string;
          currentPeriodEnd: Date | null;
          cancelAtPeriodEnd: boolean;
          canceledAt: Date | null;
          customer: { externalId: string | null };
          metadata?: Record<string, unknown>;
        };
        const userId =
          sub.customer.externalId ??
          (typeof sub.metadata?.user_id === "string"
            ? sub.metadata.user_id
            : null);
        const pkg = findPackageByProductId(sub.productId);
        if (!userId || !pkg) {
          app.log.warn(
            { subId: sub.id, userId, productId: sub.productId, type: event.type },
            "subscription webhook missing user_id or package",
          );
          return reply.send({ received: true });
        }
        const { error: upsertErr } = await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              polar_subscription_id: sub.id,
              user_id: userId,
              package_id: pkg.id,
              product_id: sub.productId,
              status: sub.status,
              current_period_end: sub.currentPeriodEnd
                ? new Date(sub.currentPeriodEnd).toISOString()
                : null,
              cancel_at_period_end: sub.cancelAtPeriodEnd,
              canceled_at: sub.canceledAt
                ? new Date(sub.canceledAt).toISOString()
                : null,
            },
            { onConflict: "polar_subscription_id" },
          );
        if (upsertErr) {
          app.log.error({ err: upsertErr, subId: sub.id }, "subscription upsert failed");
          return reply.code(500).send({ error: "DB upsert failed" });
        }
        return reply.send({ received: true });
      }

      if (event.type !== "order.paid") {
        return reply.send({ received: true });
      }

      const order = event.data;
      // Prefer the customerExternalId we set on the checkout (= our Supabase
      // user id). Fall back to metadata.user_id if the customer record was
      // created without external linking for some reason.
      const userId =
        order.customer.externalId ??
        (typeof order.metadata?.user_id === "string"
          ? order.metadata.user_id
          : null);
      const productId = order.productId;
      const pkg = productId ? findPackageByProductId(productId) : undefined;
      const credits = pkg?.credits;

      if (!userId || !pkg || !credits || !productId) {
        app.log.error(
          { orderId: order.id, userId, productId },
          "polar webhook missing required fields",
        );
        return reply.send({ received: true });
      }

      // Idempotency: insert the purchase row first (unique constraint on
      // polar_order_id). If Polar redelivers the event we'll get a 23505
      // and skip the credit grant entirely.
      const { error: insertErr } = await supabaseAdmin.from("purchases").insert({
        user_id: userId,
        polar_order_id: order.id,
        package_id: pkg.id,
        amount_usd: order.totalAmount / 100,
        credits,
        status: "completed",
      });
      if (insertErr) {
        const msg = insertErr.message ?? "";
        if (
          msg.includes("duplicate") ||
          (insertErr as { code?: string }).code === "23505"
        ) {
          app.log.info(
            { orderId: order.id },
            "purchase already processed (idempotent)",
          );
          return reply.send({ received: true });
        }
        app.log.error({ err: insertErr }, "could not insert purchase row");
        return reply.code(500).send({ error: "DB insert failed" });
      }

      try {
        await addCredits(userId, credits, "purchase", {
          polar_order_id: order.id,
          package_id: pkg.id,
        });
      } catch (err) {
        app.log.error(
          { err, orderId: order.id },
          "purchase recorded but credit grant failed",
        );
        await supabaseAdmin
          .from("purchases")
          .update({ status: "failed" })
          .eq("polar_order_id", order.id);
        return reply.code(500).send({ error: "credit grant failed" });
      }

      return reply.send({ received: true });
    },
  );
}
