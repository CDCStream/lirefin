/**
 * Polar.sh integration — replaces the previous Stripe service.
 *
 * Why Polar over Stripe (for Lirefin):
 *   • Polar is a Merchant of Record, so EU VAT / UK VAT / US sales tax
 *     are handled for us. As an indie SaaS we never want to register
 *     for VAT in 27 jurisdictions.
 *   • Built-in customer portal — users can view past orders and update
 *     payment methods without us building any UI.
 *   • Webhooks follow the Standard Webhooks spec, so signature
 *     verification is a one-line SDK call.
 *
 * One-time products map 1:1 to our credit packages. The product id is
 * created once in the Polar dashboard and pasted into env (see
 * `POLAR_PRODUCT_*`). Webhook payloads are received as `order.paid` for
 * one-off purchases; that event is the trigger that grants credits.
 */
import { Polar } from "@polar-sh/sdk";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { CREDIT_PACKAGES, type CreditPackage } from "@fni/shared";
import { config } from "../config.js";

/**
 * Discriminated union of every webhook payload Polar can deliver. Polar
 * doesn't ship a single `WebhookPayload` type — `validateEvent` returns a
 * massive union — so we re-export it as a single named alias to keep the
 * route handler readable.
 */
export type PolarWebhookEvent = ReturnType<typeof validateEvent>;

/**
 * Lazily instantiated singleton. We hold off on constructing the SDK until
 * something actually needs it — that keeps the backend bootable in dev when
 * `POLAR_ACCESS_TOKEN` is empty (analyze endpoint still works, only
 * billing endpoints will 503).
 */
let _polar: Polar | null = null;
export function polarClient(): Polar {
  if (_polar) return _polar;
  if (!config.polarAccessToken) {
    throw billingNotConfigured();
  }
  _polar = new Polar({
    accessToken: config.polarAccessToken,
    server: config.polarServer === "sandbox" ? "sandbox" : "production",
  });
  return _polar;
}

interface PackageProduct {
  pkg: CreditPackage;
  productId: string;
}

export function getPackageProducts(): PackageProduct[] {
  const map: Record<CreditPackage["polarProductEnv"], string> = {
    POLAR_PRODUCT_STARTER: config.polarProductStarter,
    POLAR_PRODUCT_STANDARD: config.polarProductStandard,
    POLAR_PRODUCT_PRO: config.polarProductPro,
    POLAR_PRODUCT_POWER: config.polarProductPower,
    POLAR_PRODUCT_UNLIMITED: config.polarProductUnlimited,
  };
  return CREDIT_PACKAGES.map((pkg) => ({
    pkg,
    productId: map[pkg.polarProductEnv],
  })).filter((p) => p.productId.length > 0);
}

export function findPackageByProductId(
  productId: string,
): CreditPackage | undefined {
  return getPackageProducts().find((p) => p.productId === productId)?.pkg;
}

export interface CheckoutInput {
  userId: string;
  email: string | null;
  packageId: string;
  successUrl: string;
}

export interface CheckoutResult {
  id: string;
  url: string;
}

export async function createCheckoutSession(
  input: CheckoutInput,
): Promise<CheckoutResult> {
  const entry = getPackageProducts().find((p) => p.pkg.id === input.packageId);
  if (!entry) {
    throw Object.assign(new Error("Unknown package"), {
      statusCode: 400,
      code: "UNKNOWN_PACKAGE",
    });
  }

  const polar = polarClient();
  const checkout = await polar.checkouts.create({
    products: [entry.productId],
    customerEmail: input.email ?? undefined,
    // `externalCustomerId` lets Polar link the resulting customer to our
    // Supabase user id. On subsequent purchases Polar reuses the same
    // customer record automatically, which makes the customer portal Just
    // Work without us juggling our own customer table.
    externalCustomerId: input.userId,
    // `{CHECKOUT_ID}` is interpolated by Polar after the checkout is paid;
    // we don't actually rely on it (webhook is the source of truth) but
    // the success page polls /billing/status with it. Append safely whether
    // or not the caller already attached a query string.
    successUrl: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}checkout_id={CHECKOUT_ID}`,
    metadata: {
      user_id: input.userId,
      package_id: entry.pkg.id,
      credits: entry.pkg.credits,
    },
  });

  if (!checkout.url) {
    throw Object.assign(new Error("Polar returned a checkout without a URL"), {
      statusCode: 502,
      code: "POLAR_NO_URL",
    });
  }

  return { id: checkout.id, url: checkout.url };
}

/**
 * Look up the user's most recent subscription directly from Polar. This is
 * the source-of-truth fallback used when our `subscriptions` table doesn't
 * have a row yet — e.g. the user subscribed before we deployed the
 * webhook handler, or the `subscription.*` events weren't enabled in the
 * Polar dashboard. Returning `null` means "Polar has no record of this
 * customer subscribing".
 *
 * We pull the freshest row regardless of status so the caller can decide
 * how to render canceled-but-still-active plans, past-due, etc.
 */
export interface PolarSubscriptionSummary {
  id: string;
  productId: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}

export async function fetchLatestSubscriptionByExternalId(
  externalCustomerId: string,
): Promise<PolarSubscriptionSummary | null> {
  const polar = polarClient();
  // Polar's list endpoint returns paginated results. We don't pass
  // `sorting` because the SDK constrains it to a typed enum we don't
  // bundle; instead we pull the first page and pick the freshest row
  // ourselves below. 10 rows is plenty for a single customer.
  const page = await polar.subscriptions.list({
    externalCustomerId,
    limit: 10,
  });
  const items = page.result?.items ?? [];
  if (items.length === 0) return null;
  // Prefer rows that look "live" (active/trialing/past_due/canceled-but-
  // still-running) over fully ended ones, then sort by startedAt desc.
  const score = (s: { status: string; endedAt: Date | null }): number => {
    if (s.endedAt) return 0;
    if (s.status === "active" || s.status === "trialing") return 3;
    if (s.status === "past_due") return 2;
    if (s.status === "canceled") return 1;
    return 0;
  };
  const sorted = [...items].sort((a, b) => {
    const ds = score(b) - score(a);
    if (ds !== 0) return ds;
    const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return tb - ta;
  });
  const latest = sorted[0]!;
  return {
    id: latest.id,
    productId: latest.productId,
    status: latest.status,
    currentPeriodEnd: latest.currentPeriodEnd
      ? new Date(latest.currentPeriodEnd)
      : null,
    cancelAtPeriodEnd: latest.cancelAtPeriodEnd,
    canceledAt: latest.canceledAt ? new Date(latest.canceledAt) : null,
  };
}

/**
 * Look up a discount by its public-facing redemption code (e.g.
 * `DEVTEST100`). Polar's list endpoint exposes a `query` filter that
 * matches names, but to be precise we pull the first 100 discounts
 * for the org and find the exact `code` match in memory — codes are
 * case-sensitive on Polar's side and we mirror that here. Returns
 * `null` if the code doesn't exist or has been disabled.
 */
export async function findDiscountIdByCode(
  code: string,
): Promise<string | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const polar = polarClient();
  const page = await polar.discounts.list({
    query: trimmed,
    limit: 100,
  });
  const items = (page.result?.items ?? []) as Array<{
    id: string;
    code: string | null;
  }>;
  const match = items.find(
    (d) => typeof d.code === "string" && d.code === trimmed,
  );
  return match?.id ?? null;
}

/**
 * Switch the subscription to a different product (upgrade or downgrade),
 * optionally applying a discount in the same logical operation.
 *
 * Polar's `subscriptions.update` endpoint takes a `SubscriptionUpdate`
 * union — `productId` and `discountId` live in *different* members of
 * that union, so they require two sequential calls when combined. We
 * always apply the discount first so the prorated invoice (triggered by
 * the product change with `prorationBehavior: "invoice"`) reflects the
 * discounted price.
 *
 * Why `prorationBehavior: "invoice"`?
 *   - The customer is billed the prorated difference IMMEDIATELY using
 *     their saved payment method.
 *   - `order.paid` fires, which our webhook handler consumes to grant
 *     the new tier's credits within seconds.
 *   - With a 100%-off discount the prorated amount is $0; Polar still
 *     creates a $0 order so credits land via the same code path.
 */
export async function changeSubscriptionProduct(input: {
  subscriptionId: string;
  newProductId: string;
  discountId?: string | null;
}): Promise<void> {
  const polar = polarClient();
  if (input.discountId) {
    try {
      await polar.subscriptions.update({
        id: input.subscriptionId,
        subscriptionUpdate: { discountId: input.discountId },
      });
    } catch (err) {
      // Polar returns 422 with "This discount is already applied to the
      // subscription." when the same code was used in a previous tier
      // swap. From the caller's perspective that's the desired end state
      // — the discount we asked for is in place — so we fall through to
      // the product change. Re-throw anything else (invalid discount,
      // expired code, etc).
      const e = err as { body$?: string; rawValue?: string; message?: string };
      const blob =
        (typeof e.body$ === "string" ? e.body$ : "") +
        (typeof e.rawValue === "string" ? e.rawValue : "") +
        (typeof e.message === "string" ? e.message : "");
      const alreadyApplied = blob
        .toLowerCase()
        .includes("already applied to the subscription");
      if (!alreadyApplied) throw err;
    }
  }
  await polar.subscriptions.update({
    id: input.subscriptionId,
    subscriptionUpdate: {
      productId: input.newProductId,
      prorationBehavior: "invoice",
    },
  });
}

/**
 * Schedule the subscription to be revoked at the end of the current
 * billing period. The user keeps access — and credit renewals — until
 * `current_period_end`. Calling this with `cancelAtPeriodEnd: false`
 * un-schedules a previously requested cancellation.
 */
export async function setSubscriptionCancelAtPeriodEnd(input: {
  subscriptionId: string;
  cancel: boolean;
  reason?: string;
}): Promise<void> {
  const polar = polarClient();
  await polar.subscriptions.update({
    id: input.subscriptionId,
    subscriptionUpdate: {
      cancelAtPeriodEnd: input.cancel,
      // Polar uses this to power their churn dashboards; we only set it
      // when canceling, never when un-canceling (avoids stale reasons).
      ...(input.cancel && input.reason
        ? { customerCancellationComment: input.reason }
        : {}),
    },
  });
}

/**
 * Mint a Customer Portal session URL for the user. The portal is hosted by
 * Polar (so PCI / VAT / refund UX is their problem) and is the canonical
 * place for users to upgrade, downgrade, or cancel their subscription.
 *
 * We always look the customer up by `externalCustomerId` (= Supabase user
 * id) which avoids us having to persist the polar `customer_id`. If the
 * user has never checked out, Polar will respond 404 and we surface that
 * as a 404 so the caller can show "Subscribe first" UX.
 */
export async function createCustomerPortalUrl(input: {
  userId: string;
  returnUrl?: string;
}): Promise<string> {
  const polar = polarClient();
  const session = await polar.customerSessions.create({
    externalCustomerId: input.userId,
    returnUrl: input.returnUrl ?? null,
  });
  return session.customerPortalUrl;
}

/**
 * Verify the Polar webhook signature using the Standard Webhooks spec
 * (`webhook-id`, `webhook-timestamp`, `webhook-signature` headers). The
 * SDK throws `WebhookVerificationError` on a bad signature; we re-throw it
 * with a 400-friendly status so the route handler can respond appropriately.
 */
export function verifyWebhook(
  rawBody: Buffer | string,
  headers: Record<string, string | string[] | undefined>,
): PolarWebhookEvent {
  if (!config.polarWebhookSecret) {
    throw billingNotConfigured();
  }
  // Standard Webhooks needs a flat `Record<string, string>`. Fastify hands
  // us `string | string[] | undefined`; collapse arrays to their first value
  // and drop undefineds so the SDK gets exactly the shape it expects.
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v == null) continue;
    flat[k] = Array.isArray(v) ? (v[0] ?? "") : v;
  }
  try {
    return validateEvent(rawBody, flat, config.polarWebhookSecret);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      throw Object.assign(new Error(err.message), {
        statusCode: 400,
        code: "WEBHOOK_INVALID_SIGNATURE",
      });
    }
    throw err;
  }
}

function billingNotConfigured() {
  return Object.assign(
    new Error(
      "Polar is not configured. Set POLAR_ACCESS_TOKEN, POLAR_WEBHOOK_SECRET and POLAR_PRODUCT_* in the backend env.",
    ),
    { statusCode: 503, code: "BILLING_NOT_CONFIGURED" },
  );
}
