/**
 * DodoPayments integration — replaces the previous Polar.sh service.
 *
 * Why Dodo over Polar (for Lirefin):
 *   • Polar's organization-level review classified our extension as a
 *     "restricted financial product" and refused to onboard us. Dodo has
 *     the same Merchant-of-Record contract (handles EU VAT / UK VAT / US
 *     sales tax) but accepts financial-news/AI summarizer use cases.
 *   • Built-in Customer Portal (`customers/customerPortal/create`) for
 *     plan management, payment method updates, refunds.
 *   • Standard Webhooks spec — same signature scheme as Polar, so we
 *     keep the raw-buffer parser + `standardwebhooks` verify pattern.
 *
 * Recurring subscription products map 1:1 to our 5 packages. Product ids
 * are created once in the Dodo dashboard and pasted into env (see
 * `DODO_PRODUCT_*`). Webhook payloads `subscription.active` /
 * `subscription.renewed` are the credit-grant triggers (every paid
 * billing cycle fires one of these).
 *
 * One important difference vs Polar: Dodo's `subscriptions.list` does
 * NOT support filtering by an external customer id — only by Dodo's own
 * `customer_id` (`cus_…`). We therefore persist the user → customer_id
 * mapping ourselves (the first webhook delivery seeds the row, see
 * `routes/billing.ts`). Until that mapping exists, "find latest
 * subscription" falls back to listing the user's recent subscriptions
 * filtered server-side.
 */
import DodoPayments from "dodopayments";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { CREDIT_PACKAGES, type CreditPackage } from "@fni/shared";
import { config } from "../config.js";

/**
 * Lazy singleton — see polar.ts for the rationale (boot the backend in
 * dev without billing configured; only billing endpoints 503).
 */
let _dodo: DodoPayments | null = null;
export function dodoClient(): DodoPayments {
  if (_dodo) return _dodo;
  if (!config.dodoApiKey) {
    throw billingNotConfigured();
  }
  _dodo = new DodoPayments({
    bearerToken: config.dodoApiKey,
    environment: config.dodoEnv,
  });
  return _dodo;
}

interface PackageProduct {
  pkg: CreditPackage;
  productId: string;
}

export function getPackageProducts(): PackageProduct[] {
  const map: Record<CreditPackage["dodoProductEnv"], string> = {
    DODO_PRODUCT_STARTER: config.dodoProductStarter,
    DODO_PRODUCT_STANDARD: config.dodoProductStandard,
    DODO_PRODUCT_PRO: config.dodoProductPro,
    DODO_PRODUCT_POWER: config.dodoProductPower,
    DODO_PRODUCT_UNLIMITED: config.dodoProductUnlimited,
  };
  return CREDIT_PACKAGES.map((pkg) => ({
    pkg,
    productId: map[pkg.dodoProductEnv],
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

/**
 * Create a hosted checkout session. We use the unified Checkout Sessions
 * API (recommended over the deprecated `subscriptions.create` direct
 * flow) so users can pick payment methods, change billing currency, and
 * the prices/tax/discount layout matches Dodo's modern UX.
 *
 * `metadata.user_id` is critical — the webhook fires before our local
 * `customers` mapping row is written, so we read the user id from
 * metadata to seed it. We also stash `package_id` and `credits` for
 * audit / fallback resolution.
 */
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

  const dodo = dodoClient();
  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: entry.productId, quantity: 1 }],
    return_url: input.successUrl,
    customer: input.email
      ? { email: input.email, name: input.email.split("@")[0] ?? "Customer" }
      : undefined,
    metadata: {
      user_id: input.userId,
      package_id: entry.pkg.id,
      credits: String(entry.pkg.credits),
    },
  });

  if (!session.checkout_url) {
    throw Object.assign(new Error("Dodo returned a session without a URL"), {
      statusCode: 502,
      code: "DODO_NO_URL",
    });
  }

  return { id: session.session_id, url: session.checkout_url };
}

/**
 * Look up the user's most recent subscription. Two-stage strategy:
 *
 *   1. If we have a `dodo_customer_id` for this user (populated by the
 *      first `subscription.active` webhook), call `subscriptions.list`
 *      filtered by that customer_id — fast, paginated, server-side.
 *
 *   2. Otherwise return null and let the caller treat it as "no record"
 *      (returning `{active: false}` to the extension). Once the user
 *      checks out, the webhook will populate the mapping and subsequent
 *      lookups will succeed.
 *
 * The unsigned-int `customer_id` lookup means we don't need to scan
 * every subscription Dodo has, which is important once we have many
 * paying users.
 */
export interface DodoSubscriptionSummary {
  id: string;
  productId: string;
  customerId: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}

export async function fetchLatestSubscriptionByCustomerId(
  customerId: string,
): Promise<DodoSubscriptionSummary | null> {
  const dodo = dodoClient();
  const page = await dodo.subscriptions.list({
    customer_id: customerId,
    page_size: 10,
  });
  const items = page.items ?? [];
  if (items.length === 0) return null;
  // Score: prefer non-terminal statuses, then sort by created_at desc.
  // Dodo statuses: pending | active | on_hold | cancelled | failed | expired.
  const score = (s: { status: string }): number => {
    if (s.status === "active") return 4;
    if (s.status === "on_hold") return 3;
    if (s.status === "pending") return 2;
    if (s.status === "cancelled") return 1;
    return 0;
  };
  const sorted = [...items].sort((a, b) => {
    const ds = score(b) - score(a);
    if (ds !== 0) return ds;
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
  const latest = sorted[0]!;
  return summarizeSubscription(latest);
}

/**
 * Switch the subscription to a different product (upgrade or downgrade).
 *
 * Dodo's `changePlan` is a single atomic call (unlike Polar where the
 * discount and product live in different update branches). We use
 * `proration_billing_mode: "prorated_immediately"` so:
 *   - The customer is billed the prorated difference IMMEDIATELY using
 *     their saved payment method.
 *   - A `payment.succeeded` webhook fires, which our route consumes to
 *     grant the new tier's credits within seconds.
 *   - With a 100%-off `discount_code` the prorated amount is $0; Dodo
 *     still creates the subscription update + payment row so credits
 *     land via the same code path.
 *
 * `on_payment_failure: "prevent_change"` keeps the user on the old plan
 * if their card is declined — preferable to silently downgrading to the
 * cheaper tier without revenue.
 */
export async function changeSubscriptionProduct(input: {
  subscriptionId: string;
  newProductId: string;
  discountCode?: string | null;
}): Promise<void> {
  const dodo = dodoClient();
  await dodo.subscriptions.changePlan(input.subscriptionId, {
    product_id: input.newProductId,
    quantity: 1,
    proration_billing_mode: "prorated_immediately",
    on_payment_failure: "prevent_change",
    ...(input.discountCode ? { discount_code: input.discountCode } : {}),
  });
}

/**
 * Schedule the subscription to be revoked at the end of the current
 * billing period. The user keeps access — and credit renewals — until
 * `next_billing_date`. Calling this with `cancel: false` un-schedules a
 * previously requested cancellation (Dodo treats `cancel_at_next_billing_date: false`
 * as "remove the schedule" when a cancellation is pending).
 */
export async function setSubscriptionCancelAtPeriodEnd(input: {
  subscriptionId: string;
  cancel: boolean;
  reason?: string;
}): Promise<void> {
  const dodo = dodoClient();
  await dodo.subscriptions.update(input.subscriptionId, {
    cancel_at_next_billing_date: input.cancel,
    ...(input.cancel
      ? {
          cancel_reason: "cancelled_by_customer" as const,
          ...(input.reason ? { cancellation_comment: input.reason } : {}),
        }
      : {}),
  });
}

/**
 * Mint a Customer Portal session URL for the user. Hosted by Dodo (so
 * PCI / VAT / refund UX is their problem) and the canonical place to
 * upgrade, downgrade, or cancel.
 *
 * Unlike Polar's `externalCustomerId` lookup, Dodo's portal endpoint
 * needs the internal `cus_…` id — caller must look it up from our
 * `customers` mapping table first. A null return means "the user has
 * never checked out, no portal exists yet".
 */
export async function createCustomerPortalUrl(input: {
  customerId: string;
  returnUrl?: string;
}): Promise<string> {
  const dodo = dodoClient();
  const session = await dodo.customers.customerPortal.create(input.customerId, {
    ...(input.returnUrl ? { return_url: input.returnUrl } : {}),
  });
  return session.link;
}

/**
 * Look up a discount by its public-facing redemption code (e.g.
 * `DEVTEST100`). Dodo exposes a dedicated `getByCode` endpoint that
 * returns the discount or 404s — much cleaner than Polar's list+filter.
 * Returns the discount id (e.g. `disc_…`) or null when the code is
 * unknown / disabled / expired.
 */
export async function findDiscountIdByCode(
  code: string,
): Promise<string | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const dodo = dodoClient();
  try {
    // The SDK exposes the get-by-code endpoint as `getByCode`. It throws
    // `NotFoundError` on a missing/disabled code — we collapse that to
    // null so the caller sees a uniform "no such code" signal.
    const discount = await (
      dodo.discounts as unknown as {
        getByCode: (code: string) => Promise<{ discount_id: string }>;
      }
    ).getByCode(trimmed);
    return discount.discount_id ?? null;
  } catch (err) {
    const e = err as { status?: number; code?: string };
    if (e.status === 404) return null;
    throw err;
  }
}

/**
 * Verify a Dodo webhook using the Standard Webhooks spec
 * (`webhook-id`, `webhook-timestamp`, `webhook-signature` headers).
 * The library throws `WebhookVerificationError` on a bad signature; we
 * re-throw with `statusCode: 400` so the route handler can respond
 * with a meaningful HTTP code.
 *
 * The body is the EXACT raw payload bytes — Fastify's default JSON
 * parser would mutate them. See routes/billing.ts where we register a
 * raw-buffer content-type parser scoped to the webhook URL.
 */
export interface DodoWebhookEnvelope {
  business_id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown> & { payload_type?: string };
}

export function verifyWebhook(
  rawBody: Buffer | string,
  headers: Record<string, string | string[] | undefined>,
): DodoWebhookEnvelope {
  if (!config.dodoWebhookKey) {
    throw billingNotConfigured();
  }
  const id = pick(headers["webhook-id"]);
  const timestamp = pick(headers["webhook-timestamp"]);
  const signature = pick(headers["webhook-signature"]);
  if (!id || !timestamp || !signature) {
    throw Object.assign(new Error("Missing webhook headers"), {
      statusCode: 400,
      code: "WEBHOOK_MISSING_HEADERS",
    });
  }
  // The standardwebhooks library expects the body as a string and the
  // three headers in a flat record.
  const body =
    typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  try {
    const wh = new Webhook(config.dodoWebhookKey);
    wh.verify(body, {
      "webhook-id": id,
      "webhook-timestamp": timestamp,
      "webhook-signature": signature,
    });
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      throw Object.assign(new Error(err.message), {
        statusCode: 400,
        code: "WEBHOOK_INVALID_SIGNATURE",
      });
    }
    throw err;
  }
  return JSON.parse(body) as DodoWebhookEnvelope;
}

// -------------------- Internal helpers --------------------

/** Coerce SDK Subscription rows (snake_case) into our adapter shape. */
function summarizeSubscription(s: {
  subscription_id: string;
  product_id: string;
  status: string;
  next_billing_date: string;
  cancel_at_next_billing_date: boolean;
  cancelled_at?: string | null;
  customer: { customer_id: string };
}): DodoSubscriptionSummary {
  return {
    id: s.subscription_id,
    productId: s.product_id,
    customerId: s.customer.customer_id,
    status: s.status,
    currentPeriodEnd: s.next_billing_date
      ? new Date(s.next_billing_date)
      : null,
    cancelAtPeriodEnd: s.cancel_at_next_billing_date,
    canceledAt: s.cancelled_at ? new Date(s.cancelled_at) : null,
  };
}

function pick(value: string | string[] | undefined): string {
  if (value == null) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

function billingNotConfigured(): Error {
  return Object.assign(
    new Error(
      "DodoPayments is not configured. Set DODO_API_KEY, DODO_WEBHOOK_KEY and DODO_PRODUCT_* in the backend env.",
    ),
    { statusCode: 503, code: "BILLING_NOT_CONFIGURED" },
  );
}
