import type { FastifyInstance } from "fastify";
import { CREDIT_PACKAGES } from "@fni/shared";
import { config } from "../config.js";
import { requireAuth } from "../plugins/auth.js";
import { addCredits } from "../services/billing.js";
import * as dodo from "../services/dodopayments.js";
import * as polar from "../services/polar.js";
import { supabaseAdmin } from "../services/supabase.js";

/**
 * Billing routes — provider-agnostic Dodo/Polar fanout.
 *
 * `BILLING_PROVIDER` (config.billingProvider) selects which adapter
 * runs. We keep both compiled in for a clean rollback path during the
 * Polar → Dodo migration; once Dodo is verified live we'll drop polar.ts.
 *
 * Every request that needs to talk to a billing provider routes through
 * a thin facade defined below: it forwards to the right adapter and
 * normalizes the return shape so route handlers stay provider-blind.
 */
export async function billingRoute(app: FastifyInstance) {
  const provider = config.billingProvider;

  // Dodo follows the Standard Webhooks spec (same as Polar): signatures
  // are computed over the EXACT raw request body. Fastify's default JSON
  // parser would mutate the bytes. We register a content-type parser
  // that keeps the buffer intact for either provider's webhook URL and
  // falls through to JSON.parse for every other endpoint.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      const url = req.url ?? "";
      if (
        url.endsWith("/billing/webhook") ||
        url.endsWith("/billing/webhook/dodo")
      ) {
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
    const products =
      provider === "dodo" ? dodo.getPackageProducts() : polar.getPackageProducts();
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
      const langParam =
        typeof body.language === "string" && /^[a-zA-Z-]{2,8}$/.test(body.language)
          ? `?lang=${encodeURIComponent(body.language)}`
          : "";
      const successUrl = `${config.publicAppUrl}/billing/success${langParam}`;
      try {
        const checkout =
          provider === "dodo"
            ? await dodo.createCheckoutSession({
                userId: user.id,
                email: user.email,
                packageId,
                successUrl,
              })
            : await polar.createCheckoutSession({
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
          code: e.code ?? "BILLING_FAILED",
        });
      }
    },
  );

  // ---------------- Active subscription ----------------
  // The extension calls this on every Options page load to render the
  // "Active plan" card. Strategy:
  //   1) DB-first: read our own `subscriptions` table (fast, offline ok).
  //   2) Fallback to provider when DB is empty AND we have a customer
  //      mapping (Dodo) or always (Polar's externalId works directly).
  //   3) Backfill the local row once the provider returns data.
  app.get(
    "/billing/subscription",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const user = req.user!;

      // ---- Stage 1: local DB lookup ----
      const { data, error } = await supabaseAdmin
        .from("subscriptions")
        .select(
          "subscription_id, customer_id, package_id, product_id, status, current_period_end, cancel_at_period_end, canceled_at",
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
        const stillActive = isActiveStatus(
          row.status,
          row.current_period_end ?? null,
        );
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

      // ---- Stage 2: provider fallback ----
      if (provider === "dodo") {
        // Need our user → dodo_customer_id mapping first.
        const customerId = await getDodoCustomerId(user.id);
        if (!customerId) {
          return reply.send({ active: false });
        }
        let sub: dodo.DodoSubscriptionSummary | null = null;
        try {
          sub = await dodo.fetchLatestSubscriptionByCustomerId(customerId);
        } catch (err) {
          const e = err as { statusCode?: number; status?: number };
          const httpStatus = e.statusCode ?? e.status;
          if (httpStatus !== 404) {
            app.log.warn({ err: e }, "dodo subscription fallback failed");
          }
          return reply.send({ active: false });
        }
        if (!sub) return reply.send({ active: false });
        const pkg = dodo.findPackageByProductId(sub.productId);
        if (!pkg) return reply.send({ active: false });

        if (!tableMissing) {
          await upsertSubscriptionRow(user.id, {
            subscriptionId: sub.id,
            customerId: sub.customerId,
            packageId: pkg.id,
            productId: sub.productId,
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            canceledAt: sub.canceledAt,
            provider: "dodo",
          });
        }

        return reply.send({
          active: isActiveStatus(
            sub.status,
            sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
          ),
          status: sub.status,
          packageId: pkg.id,
          productId: sub.productId,
          currentPeriodEnd: sub.currentPeriodEnd
            ? sub.currentPeriodEnd.toISOString()
            : null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          canceledAt: sub.canceledAt ? sub.canceledAt.toISOString() : null,
        });
      }

      // Polar fallback (legacy)
      let polarSub;
      try {
        polarSub = await polar.fetchLatestSubscriptionByExternalId(user.id);
      } catch (err) {
        const e = err as { statusCode?: number; status?: number };
        const httpStatus = e.statusCode ?? e.status;
        if (httpStatus !== 404) {
          app.log.warn({ err: e }, "polar subscription fallback failed");
        }
        return reply.send({ active: false });
      }
      if (!polarSub) return reply.send({ active: false });
      const pkg = polar.findPackageByProductId(polarSub.productId);
      if (!pkg) return reply.send({ active: false });

      if (!tableMissing) {
        await upsertSubscriptionRow(user.id, {
          subscriptionId: polarSub.id,
          customerId: null,
          packageId: pkg.id,
          productId: polarSub.productId,
          status: polarSub.status,
          currentPeriodEnd: polarSub.currentPeriodEnd,
          cancelAtPeriodEnd: polarSub.cancelAtPeriodEnd,
          canceledAt: polarSub.canceledAt,
          provider: "polar",
        });
      }

      return reply.send({
        active: isActiveStatus(
          polarSub.status,
          polarSub.currentPeriodEnd
            ? polarSub.currentPeriodEnd.toISOString()
            : null,
        ),
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
  async function resolveSubscription(userId: string): Promise<{
    subscriptionId: string;
    productId: string;
    customerId: string | null;
  } | null> {
    const { data } = await supabaseAdmin
      .from("subscriptions")
      .select(
        "subscription_id, customer_id, product_id, status, current_period_end",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1);
    const row = data?.[0];
    if (
      row &&
      isActiveStatus(row.status, row.current_period_end ?? null)
    ) {
      return {
        subscriptionId: row.subscription_id,
        productId: row.product_id,
        customerId: row.customer_id ?? null,
      };
    }
    // DB miss — try the provider directly.
    if (provider === "dodo") {
      const customerId = await getDodoCustomerId(userId);
      if (!customerId) return null;
      try {
        const sub = await dodo.fetchLatestSubscriptionByCustomerId(customerId);
        if (!sub) return null;
        return {
          subscriptionId: sub.id,
          productId: sub.productId,
          customerId: sub.customerId,
        };
      } catch {
        return null;
      }
    }
    try {
      const sub = await polar.fetchLatestSubscriptionByExternalId(userId);
      if (!sub) return null;
      return { subscriptionId: sub.id, productId: sub.productId, customerId: null };
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
      const products =
        provider === "dodo" ? dodo.getPackageProducts() : polar.getPackageProducts();
      const target = products.find((p) => p.pkg.id === body.packageId);
      if (!target) {
        return reply
          .code(400)
          .send({ error: "Unknown package", code: "UNKNOWN_PACKAGE" });
      }
      const sub = await resolveSubscription(user.id);
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

      // Optional promo code lookup. We resolve the code → discount id /
      // code passthrough here so an invalid code returns 422 BEFORE the
      // tier swap mutates the upstream subscription.
      let discountCodeOrId: string | null = null;
      if (typeof body.discountCode === "string" && body.discountCode.trim()) {
        const trimmed = body.discountCode.trim();
        if (provider === "dodo") {
          // Dodo's changePlan accepts the user-facing code directly. We
          // still validate it via getByCode to surface a 422 before the
          // mutation goes through (the API would otherwise 422 on its
          // side after a partial state change).
          try {
            const id = await dodo.findDiscountIdByCode(trimmed);
            if (!id) {
              return reply.code(422).send({
                error: "Invalid promo code",
                code: "INVALID_DISCOUNT",
              });
            }
            discountCodeOrId = trimmed; // pass the code to changePlan
          } catch (err) {
            app.log.warn({ err }, "dodo discount lookup failed");
            return reply.code(422).send({
              error: "Could not validate promo code",
              code: "INVALID_DISCOUNT",
            });
          }
        } else {
          try {
            const id = await polar.findDiscountIdByCode(trimmed);
            if (!id) {
              return reply.code(422).send({
                error: "Invalid promo code",
                code: "INVALID_DISCOUNT",
              });
            }
            discountCodeOrId = id; // Polar takes the discount id
          } catch (err) {
            app.log.warn({ err }, "polar discount lookup failed");
          }
        }
      }

      try {
        if (provider === "dodo") {
          await dodo.changeSubscriptionProduct({
            subscriptionId: sub.subscriptionId,
            newProductId: target.productId,
            discountCode: discountCodeOrId,
          });
        } else {
          await polar.changeSubscriptionProduct({
            subscriptionId: sub.subscriptionId,
            newProductId: target.productId,
            discountId: discountCodeOrId,
          });
        }
        return reply.send({
          ok: true,
          packageId: target.pkg.id,
          discountApplied: discountCodeOrId !== null,
        });
      } catch (err) {
        const e = err as Error & { statusCode?: number; status?: number };
        const httpStatus = e.statusCode ?? e.status ?? 500;
        app.log.error(
          { err: e, subId: sub.subscriptionId },
          "tier change failed",
        );
        return reply.code(httpStatus).send({
          error: e.message || "Failed to change plan",
          code: "BILLING_UPDATE_FAILED",
        });
      }
    },
  );

  app.post(
    "/billing/subscription/cancel",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const user = req.user!;
      const body = (req.body as { reason?: string } | undefined) ?? {};
      const sub = await resolveSubscription(user.id);
      if (!sub) {
        return reply
          .code(404)
          .send({ error: "No active subscription", code: "NO_SUBSCRIPTION" });
      }
      try {
        const fn =
          provider === "dodo"
            ? dodo.setSubscriptionCancelAtPeriodEnd
            : polar.setSubscriptionCancelAtPeriodEnd;
        await fn({
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
          code: "BILLING_CANCEL_FAILED",
        });
      }
    },
  );

  app.post(
    "/billing/subscription/uncancel",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const user = req.user!;
      const sub = await resolveSubscription(user.id);
      if (!sub) {
        return reply
          .code(404)
          .send({ error: "No active subscription", code: "NO_SUBSCRIPTION" });
      }
      try {
        const fn =
          provider === "dodo"
            ? dodo.setSubscriptionCancelAtPeriodEnd
            : polar.setSubscriptionCancelAtPeriodEnd;
        await fn({ subscriptionId: sub.subscriptionId, cancel: false });
        return reply.send({ ok: true });
      } catch (err) {
        const e = err as Error & { statusCode?: number; status?: number };
        const httpStatus = e.statusCode ?? e.status ?? 500;
        app.log.error({ err: e, subId: sub.subscriptionId }, "uncancel failed");
        return reply.code(httpStatus).send({
          error: e.message || "Failed to resume",
          code: "BILLING_UNCANCEL_FAILED",
        });
      }
    },
  );

  // ---------------- Customer portal session ----------------
  app.post(
    "/billing/portal",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const user = req.user!;
      try {
        let url: string;
        const returnUrl = `${config.publicAppUrl}/billing/portal-return`;
        if (provider === "dodo") {
          const customerId = await getDodoCustomerId(user.id);
          if (!customerId) {
            return reply
              .code(404)
              .send({ error: "No customer record yet", code: "NO_CUSTOMER" });
          }
          url = await dodo.createCustomerPortalUrl({ customerId, returnUrl });
        } else {
          url = await polar.createCustomerPortalUrl({
            userId: user.id,
            returnUrl,
          });
        }
        return reply.send({ url });
      } catch (err) {
        const e = err as Error & {
          statusCode?: number;
          code?: string;
          status?: number;
        };
        const httpStatus = e.statusCode ?? e.status ?? 500;
        if (httpStatus === 404) {
          return reply
            .code(404)
            .send({ error: "No customer record yet", code: "NO_CUSTOMER" });
        }
        app.log.error({ err: e }, "customer portal failed");
        return reply.code(httpStatus).send({
          error: e.message,
          code: e.code ?? "BILLING_PORTAL_FAILED",
        });
      }
    },
  );

  // ---------------- DodoPayments webhook ----------------
  app.post(
    "/billing/webhook/dodo",
    { config: { rawBody: true } },
    async (req, reply) => {
      const raw = req.body as Buffer;
      let envelope: dodo.DodoWebhookEnvelope;
      try {
        envelope = dodo.verifyWebhook(raw, req.headers);
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        app.log.warn({ err: e }, "dodo webhook verification failed");
        return reply.code(e.statusCode ?? 400).send({ error: e.message });
      }
      try {
        await handleDodoEvent(app, envelope);
      } catch (err) {
        app.log.error({ err, type: envelope.type }, "dodo webhook handler failed");
        return reply.code(500).send({ error: "handler failed" });
      }
      return reply.send({ received: true });
    },
  );

  // ---------------- Polar webhook (legacy) ----------------
  app.post(
    "/billing/webhook",
    { config: { rawBody: true } },
    async (req, reply) => {
      const raw = req.body as Buffer;
      let event;
      try {
        event = polar.verifyWebhook(raw, req.headers);
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
        const pkg = polar.findPackageByProductId(sub.productId);
        if (!userId || !pkg) {
          app.log.warn(
            {
              subId: sub.id,
              userId,
              productId: sub.productId,
              type: event.type,
            },
            "polar subscription webhook missing user_id or package",
          );
          return reply.send({ received: true });
        }
        await upsertSubscriptionRow(userId, {
          subscriptionId: sub.id,
          customerId: null,
          packageId: pkg.id,
          productId: sub.productId,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          canceledAt: sub.canceledAt,
          provider: "polar",
        });
        return reply.send({ received: true });
      }

      if (event.type !== "order.paid") {
        return reply.send({ received: true });
      }

      const order = event.data;
      const userId =
        order.customer.externalId ??
        (typeof order.metadata?.user_id === "string"
          ? order.metadata.user_id
          : null);
      const productId = order.productId;
      const pkg = productId ? polar.findPackageByProductId(productId) : undefined;
      const credits = pkg?.credits;

      if (!userId || !pkg || !credits || !productId) {
        app.log.error(
          { orderId: order.id, userId, productId },
          "polar webhook missing required fields",
        );
        return reply.send({ received: true });
      }

      const { error: insertErr } = await supabaseAdmin.from("purchases").insert({
        user_id: userId,
        provider_order_id: order.id,
        package_id: pkg.id,
        amount_usd: order.totalAmount / 100,
        credits,
        status: "completed",
        provider: "polar",
      });
      if (insertErr) {
        const msg = insertErr.message ?? "";
        if (
          msg.includes("duplicate") ||
          (insertErr as { code?: string }).code === "23505"
        ) {
          app.log.info(
            { orderId: order.id },
            "polar purchase already processed (idempotent)",
          );
          return reply.send({ received: true });
        }
        app.log.error({ err: insertErr }, "could not insert polar purchase row");
        return reply.code(500).send({ error: "DB insert failed" });
      }

      try {
        await addCredits(userId, credits, "purchase", {
          provider: "polar",
          provider_order_id: order.id,
          package_id: pkg.id,
        });
      } catch (err) {
        app.log.error(
          { err, orderId: order.id },
          "polar purchase recorded but credit grant failed",
        );
        await supabaseAdmin
          .from("purchases")
          .update({ status: "failed" })
          .eq("provider_order_id", order.id);
        return reply.code(500).send({ error: "credit grant failed" });
      }

      return reply.send({ received: true });
    },
  );
}

// ============================================================
// Helpers
// ============================================================

interface SubscriptionUpsert {
  subscriptionId: string;
  customerId: string | null;
  packageId: string;
  productId: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  provider: "dodo" | "polar";
}

async function upsertSubscriptionRow(
  userId: string,
  row: SubscriptionUpsert,
): Promise<void> {
  await supabaseAdmin.from("subscriptions").upsert(
    {
      subscription_id: row.subscriptionId,
      customer_id: row.customerId,
      user_id: userId,
      package_id: row.packageId,
      product_id: row.productId,
      status: row.status,
      current_period_end: row.currentPeriodEnd
        ? new Date(row.currentPeriodEnd).toISOString()
        : null,
      cancel_at_period_end: row.cancelAtPeriodEnd,
      canceled_at: row.canceledAt
        ? new Date(row.canceledAt).toISOString()
        : null,
      provider: row.provider,
    },
    { onConflict: "subscription_id" },
  );
}

async function getDodoCustomerId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("billing_customers")
    .select("dodo_customer_id")
    .eq("user_id", userId)
    .limit(1);
  return data?.[0]?.dodo_customer_id ?? null;
}

function isActiveStatus(status: string, currentPeriodEnd: string | null): boolean {
  if (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "on_hold" ||
    status === "pending"
  ) {
    return true;
  }
  // "cancelled" / "canceled" with a future period_end means the user
  // still has access until renewal — show as active so the UI doesn't
  // incorrectly tell them they've already lost their plan.
  if (
    (status === "canceled" || status === "cancelled") &&
    currentPeriodEnd &&
    new Date(currentPeriodEnd).getTime() > Date.now()
  ) {
    return true;
  }
  return false;
}

// ============================================================
// Dodo webhook event handler
// ============================================================
//
// Dodo's webhook envelope looks like:
//   { business_id, type: "subscription.active", timestamp, data: {…} }
// where `data.payload_type` distinguishes Subscription / Payment /
// Refund / Dispute / LicenseKey objects.
//
// We care about three event families:
//
//   subscription.active        → first paid cycle (also fires on
//   subscription.renewed         every monthly renewal)
//   subscription.plan_changed  → tier swap finished (proration paid)
//   subscription.on_hold       → past_due / payment retry pending
//   subscription.cancelled     → user cancelled (still active until
//                                next_billing_date)
//   subscription.failed        → terminal failure (no access)
//   subscription.expired       → terminal end of cycle after cancel
//
//   payment.succeeded          → grant credits for any successful
//                                charge that has a subscription_id
//                                attached (initial + renewals + tier
//                                upgrades)
//
// We dedupe credit grants with the unique `provider_order_id` constraint
// on `purchases` (= Dodo's payment_id).

async function handleDodoEvent(
  app: FastifyInstance,
  envelope: dodo.DodoWebhookEnvelope,
): Promise<void> {
  const t = envelope.type;
  if (t.startsWith("subscription.")) {
    await handleDodoSubscriptionEvent(app, envelope);
    return;
  }
  if (t === "payment.succeeded") {
    await handleDodoPaymentSucceeded(app, envelope);
    return;
  }
  // payment.failed / refund.* / dispute.* — log and ack. We don't act
  // on these in v1 because Dodo's dunning + refund flows handle the
  // UX; if a refund is issued the matching `subscription.cancelled` /
  // `subscription.expired` event will eventually update our row.
  app.log.info({ type: t }, "dodo webhook event ignored (no handler)");
}

async function handleDodoSubscriptionEvent(
  app: FastifyInstance,
  envelope: dodo.DodoWebhookEnvelope,
): Promise<void> {
  const data = envelope.data as {
    subscription_id?: string;
    product_id?: string;
    status?: string;
    next_billing_date?: string | null;
    cancel_at_next_billing_date?: boolean;
    cancelled_at?: string | null;
    customer?: { customer_id?: string; email?: string | null };
    metadata?: Record<string, string>;
  };
  const subscriptionId = data.subscription_id;
  const productId = data.product_id;
  const customerId = data.customer?.customer_id;
  if (!subscriptionId || !productId || !customerId) {
    app.log.warn(
      { type: envelope.type, data },
      "dodo subscription webhook missing core ids",
    );
    return;
  }
  const userId =
    typeof data.metadata?.user_id === "string" ? data.metadata.user_id : null;
  if (!userId) {
    app.log.warn(
      { subId: subscriptionId, type: envelope.type },
      "dodo subscription webhook missing metadata.user_id — skipping",
    );
    return;
  }
  const pkg = dodo.findPackageByProductId(productId);
  if (!pkg) {
    app.log.warn(
      { productId, subId: subscriptionId },
      "dodo subscription references an unknown product",
    );
    return;
  }

  // Seed / refresh user → customer mapping.
  await supabaseAdmin.from("billing_customers").upsert(
    {
      user_id: userId,
      dodo_customer_id: customerId,
      email: data.customer?.email ?? null,
    },
    { onConflict: "user_id" },
  );

  await upsertSubscriptionRow(userId, {
    subscriptionId,
    customerId,
    packageId: pkg.id,
    productId,
    status: data.status ?? "active",
    currentPeriodEnd: data.next_billing_date
      ? new Date(data.next_billing_date)
      : null,
    cancelAtPeriodEnd: data.cancel_at_next_billing_date === true,
    canceledAt: data.cancelled_at ? new Date(data.cancelled_at) : null,
    provider: "dodo",
  });
}

async function handleDodoPaymentSucceeded(
  app: FastifyInstance,
  envelope: dodo.DodoWebhookEnvelope,
): Promise<void> {
  const data = envelope.data as {
    payment_id?: string;
    subscription_id?: string | null;
    product_cart?: Array<{ product_id: string; quantity: number }> | null;
    total_amount?: number;
    customer?: { customer_id?: string; email?: string | null };
    metadata?: Record<string, string>;
  };

  const paymentId = data.payment_id;
  if (!paymentId) {
    app.log.warn({ type: envelope.type }, "dodo payment.succeeded missing payment_id");
    return;
  }

  // Subscription-attached payments give us product_id via the
  // subscription record on Dodo's side, but the payment payload itself
  // also includes the cart. Subscription invoices ship a single-item
  // cart with the recurring product id.
  const productId = data.product_cart?.[0]?.product_id;
  const pkg = productId ? dodo.findPackageByProductId(productId) : undefined;
  const userId =
    typeof data.metadata?.user_id === "string" ? data.metadata.user_id : null;
  const customerId = data.customer?.customer_id ?? null;

  if (!userId || !pkg) {
    app.log.warn(
      { paymentId, userId, productId, hasPkg: !!pkg },
      "dodo payment.succeeded missing user_id / package — cannot grant credits",
    );
    return;
  }

  // Idempotent: unique constraint on `provider_order_id` rejects
  // duplicates with code 23505.
  const { error: insertErr } = await supabaseAdmin.from("purchases").insert({
    user_id: userId,
    provider_order_id: paymentId,
    package_id: pkg.id,
    amount_usd:
      typeof data.total_amount === "number" ? data.total_amount / 100 : 0,
    credits: pkg.credits,
    status: "completed",
    provider: "dodo",
  });
  if (insertErr) {
    const msg = insertErr.message ?? "";
    if (
      msg.includes("duplicate") ||
      (insertErr as { code?: string }).code === "23505"
    ) {
      app.log.info(
        { paymentId },
        "dodo payment already processed (idempotent)",
      );
      return;
    }
    app.log.error({ err: insertErr }, "could not insert dodo purchase row");
    throw new Error("DB insert failed");
  }

  // Update the customer mapping if we learned a new customer_id.
  if (customerId) {
    await supabaseAdmin.from("billing_customers").upsert(
      {
        user_id: userId,
        dodo_customer_id: customerId,
        email: data.customer?.email ?? null,
      },
      { onConflict: "user_id" },
    );
  }

  try {
    await addCredits(userId, pkg.credits, "purchase", {
      provider: "dodo",
      provider_order_id: paymentId,
      package_id: pkg.id,
    });
  } catch (err) {
    app.log.error(
      { err, paymentId },
      "dodo purchase recorded but credit grant failed",
    );
    await supabaseAdmin
      .from("purchases")
      .update({ status: "failed" })
      .eq("provider_order_id", paymentId);
    throw err;
  }
}
