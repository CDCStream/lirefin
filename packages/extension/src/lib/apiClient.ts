import type {
  AnalysisHistoryResponse,
  AnalyzeEstimateRequest,
  AnalyzeEstimateResponse,
  AnalyzeRequest,
  AnalyzeResponse,
  CreditTransactionListResponse,
  TickerSearchResponse,
  Region,
} from "@fni/shared";
import { supabase } from "./supabase.js";

export class ApiError extends Error {
  status: number;
  code?: string;
  retryAfter?: number;
  balance?: number;
  estimate?: number;
  constructor(opts: {
    status: number;
    message: string;
    code?: string;
    retryAfter?: number;
    balance?: number;
    estimate?: number;
  }) {
    super(opts.message);
    this.status = opts.status;
    this.code = opts.code;
    this.retryAfter = opts.retryAfter;
    this.balance = opts.balance;
    this.estimate = opts.estimate;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let body: {
    error?: string;
    code?: string;
    retryAfter?: number;
    balance?: number;
    estimate?: number;
  } = {};
  try {
    body = await res.json();
  } catch {
    // ignore
  }
  return new ApiError({
    status: res.status,
    message: body.error ?? `HTTP ${res.status}`,
    code: body.code,
    retryAfter: body.retryAfter,
    balance: body.balance,
    estimate: body.estimate,
  });
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function refreshAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) return null;
  return data.session.access_token;
}

interface AuthedFetchOptions extends RequestInit {
  // Set to true to skip the Authorization header (e.g. public endpoints).
  skipAuth?: boolean;
}

export async function authedFetch(
  url: string,
  init: AuthedFetchOptions = {},
): Promise<Response> {
  const headers = new Headers(init.headers as HeadersInit | undefined);

  if (!init.skipAuth) {
    const token = await getAccessToken();
    if (!token) {
      throw new ApiError({
        status: 401,
        message: "Sign in required.",
        code: "UNAUTHENTICATED",
      });
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(url, { ...init, headers });

  // Single-shot refresh on 401.
  if (res.status === 401 && !init.skipAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${refreshed}`);
      res = await fetch(url, { ...init, headers });
    }
  }

  return res;
}

function backend(url: string, path: string): string {
  return `${url.replace(/\/$/, "")}${path}`;
}

// =============== ENDPOINTS ===============

export interface MeResponse {
  id: string;
  email: string | null;
  balance: number;
}

export async function fetchMe(backendUrl: string): Promise<MeResponse> {
  const res = await authedFetch(backend(backendUrl, "/api/me"));
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as MeResponse;
}

export interface AnalyzeApiResponse extends AnalyzeResponse {
  balance?: number;
  creditsCharged?: number;
}

export async function analyzeNews(
  backendUrl: string,
  payload: AnalyzeRequest,
): Promise<AnalyzeApiResponse> {
  const res = await authedFetch(backend(backendUrl, "/api/analyze"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as AnalyzeApiResponse;
}

// =============== STREAMING ===============

export type AnalyzeStreamEvent =
  | { type: "started"; cached: boolean; title: string; estimate?: number }
  | {
      type: "progress";
      stage: "connected" | "generating";
      outputTokens?: number;
    }
  | { type: "final"; result: AnalyzeApiResponse }
  | {
      type: "error";
      error: string;
      code?: string;
      retryAfter?: number;
      balance?: number;
      estimate?: number;
    };

/**
 * Streams an analysis via Server-Sent Events. The async generator yields
 * `AnalyzeStreamEvent`s in order; on a transport error the generator throws
 * an `ApiError`. The caller is expected to drive the iterator to completion.
 *
 * We use `fetch + ReadableStream + manual SSE parser` (NOT the browser
 * `EventSource` API) because EventSource doesn't support custom headers and
 * we need to send the Supabase Bearer token. This is the standard MV3
 * pattern — service workers fully support `fetch` streaming.
 */
export async function* streamAnalyzeNews(
  backendUrl: string,
  payload: AnalyzeRequest,
  signal?: AbortSignal,
): AsyncGenerator<AnalyzeStreamEvent, void, void> {
  const res = await authedFetch(backend(backendUrl, "/api/analyze/stream"), {
    method: "POST",
    headers: { Accept: "text/event-stream" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) throw await parseError(res);
  if (!res.body) {
    throw new ApiError({
      status: 500,
      message: "Streaming response had no body.",
      code: "NO_BODY",
    });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  // SSE protocol: events are separated by a blank line. Each event can have
  // `event:` and one or more `data:` lines. We accumulate the data part as
  // a single JSON blob and re-emit it as a typed `AnalyzeStreamEvent`.
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const chunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const ev = parseSseEvent(chunk);
        if (ev) yield ev;
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSseEvent(chunk: string): AnalyzeStreamEvent | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of chunk.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const idx = line.indexOf(":");
    const field = idx === -1 ? line : line.slice(0, idx);
    const value = idx === -1 ? "" : line.slice(idx + 1).replace(/^ /, "");
    if (field === "event") event = value;
    else if (field === "data") dataLines.push(value);
  }
  if (dataLines.length === 0) return null;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(dataLines.join("\n"));
  } catch {
    return null;
  }

  switch (event) {
    case "started":
      return {
        type: "started",
        cached: Boolean(data.cached),
        title: typeof data.title === "string" ? data.title : "",
        estimate:
          typeof data.estimate === "number" ? data.estimate : undefined,
      };
    case "progress":
      return {
        type: "progress",
        stage:
          data.stage === "connected" || data.stage === "generating"
            ? data.stage
            : "generating",
        outputTokens:
          typeof data.outputTokens === "number" ? data.outputTokens : undefined,
      };
    case "final":
      return {
        type: "final",
        result: data as unknown as AnalyzeApiResponse,
      };
    case "error":
      return {
        type: "error",
        error: typeof data.error === "string" ? data.error : "Stream error",
        code: typeof data.code === "string" ? data.code : undefined,
        retryAfter:
          typeof data.retryAfter === "number" ? data.retryAfter : undefined,
        balance:
          typeof data.balance === "number" ? data.balance : undefined,
        estimate:
          typeof data.estimate === "number" ? data.estimate : undefined,
      };
    default:
      return null;
  }
}

export async function estimateAnalyze(
  backendUrl: string,
  payload: AnalyzeEstimateRequest,
  signal?: AbortSignal,
): Promise<AnalyzeEstimateResponse> {
  const res = await authedFetch(backend(backendUrl, "/api/analyze/estimate"), {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as AnalyzeEstimateResponse;
}

export async function fetchCreditTransactions(
  backendUrl: string,
  cursor?: string,
  limit = 25,
): Promise<CreditTransactionListResponse> {
  const url = new URL(backend(backendUrl, "/api/credits/transactions"));
  url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", cursor);
  const res = await authedFetch(url.toString());
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as CreditTransactionListResponse;
}

export async function fetchAnalysisHistory(
  backendUrl: string,
  cursor?: string,
  limit = 20,
): Promise<AnalysisHistoryResponse> {
  const url = new URL(backend(backendUrl, "/api/analyses"));
  url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", cursor);
  const res = await authedFetch(url.toString());
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as AnalysisHistoryResponse;
}

export async function searchTickers(
  backendUrl: string,
  q: string,
  region?: Region,
  limit = 20,
): Promise<TickerSearchResponse> {
  const url = new URL(backend(backendUrl, "/api/tickers/search"));
  url.searchParams.set("q", q);
  if (region) url.searchParams.set("region", region);
  url.searchParams.set("limit", String(limit));

  const res = await authedFetch(url.toString());
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as TickerSearchResponse;
}

// =============== BILLING ===============

export interface ApiPackage {
  id: "starter" | "standard" | "pro" | "power" | "unlimited";
  label: string;
  usd: number;
  credits: number;
  bonusPct: number;
  unlimited?: boolean;
  description: string;
  longDescription: string;
  available: boolean;
}

export async function fetchPackages(
  backendUrl: string,
): Promise<ApiPackage[]> {
  const res = await authedFetch(backend(backendUrl, "/api/billing/packages"), {
    skipAuth: true,
  });
  if (!res.ok) throw await parseError(res);
  const json = (await res.json()) as { packages: ApiPackage[] };
  return json.packages;
}

export async function startCheckout(
  backendUrl: string,
  packageId: ApiPackage["id"],
  language?: string,
): Promise<{ url: string; sessionId: string }> {
  const res = await authedFetch(backend(backendUrl, "/api/billing/checkout"), {
    method: "POST",
    body: JSON.stringify({ packageId, language }),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as { url: string; sessionId: string };
}

export interface ActiveSubscription {
  active: true;
  status: string;
  packageId: ApiPackage["id"];
  productId: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
}

export interface NoSubscription {
  active: false;
}

export type SubscriptionResponse = ActiveSubscription | NoSubscription;

export async function fetchSubscription(
  backendUrl: string,
): Promise<SubscriptionResponse> {
  const res = await authedFetch(backend(backendUrl, "/api/billing/subscription"));
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as SubscriptionResponse;
}

/**
 * Open the Polar Customer Portal for the current user. Returns the URL the
 * caller should `chrome.tabs.create` so the user can switch plan / cancel.
 * Throws an `ApiError` with code `NO_CUSTOMER` (status 404) when the user
 * has never checked out — the caller should fall back to the package list.
 */
export async function openCustomerPortal(
  backendUrl: string,
): Promise<{ url: string }> {
  const res = await authedFetch(backend(backendUrl, "/api/billing/portal"), {
    method: "POST",
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as { url: string };
}

/**
 * Switch the user's active subscription to a different package. Triggers
 * a prorated invoice on Polar's side; the new tier's credits land
 * shortly after via the standard `order.paid` webhook. Pass
 * `discountCode` to apply a promo code before the prorated charge — if
 * the code is invalid the call rejects with `INVALID_DISCOUNT` and the
 * subscription is NOT touched.
 */
export async function changeSubscription(
  backendUrl: string,
  packageId: ApiPackage["id"],
  discountCode?: string,
): Promise<{ discountApplied: boolean }> {
  const res = await authedFetch(
    backend(backendUrl, "/api/billing/subscription/change"),
    {
      method: "POST",
      body: JSON.stringify({ packageId, discountCode }),
    },
  );
  if (!res.ok) throw await parseError(res);
  const json = (await res.json()) as { discountApplied?: boolean };
  return { discountApplied: json.discountApplied === true };
}

/**
 * Schedule the active subscription to end at the current period boundary.
 * The user keeps credits and access until then.
 */
export async function cancelSubscription(
  backendUrl: string,
  reason?: string,
): Promise<void> {
  const res = await authedFetch(
    backend(backendUrl, "/api/billing/subscription/cancel"),
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );
  if (!res.ok) throw await parseError(res);
}

/**
 * Reverse a previously-scheduled cancellation. The subscription will keep
 * renewing as if the user never clicked Cancel.
 */
export async function uncancelSubscription(
  backendUrl: string,
): Promise<void> {
  const res = await authedFetch(
    backend(backendUrl, "/api/billing/subscription/uncancel"),
    { method: "POST" },
  );
  if (!res.ok) throw await parseError(res);
}

// =============== ACCOUNT DELETION ===============

export interface DeleteAccountResult {
  deleted: boolean;
  subscriptionCancelled: boolean;
  refunded: boolean;
}

/**
 * Permanently delete the user's account. The backend cancels any active
 * Dodo subscription, optionally refunds the most recent payment, and
 * deletes the auth.users row (cascade-erasing every related record).
 *
 * Returns a result describing what actually happened so the UI can give
 * the user honest feedback ("subscription cancelled, refund issued").
 *
 * On failure throws an `ApiError`; the caller should tell the user
 * their account is still intact and offer a retry.
 */
export async function deleteAccount(
  backendUrl: string,
  options: { refundCurrentPeriod: boolean },
): Promise<DeleteAccountResult> {
  const res = await authedFetch(backend(backendUrl, "/api/auth/account"), {
    method: "DELETE",
    body: JSON.stringify({
      refundCurrentPeriod: options.refundCurrentPeriod,
    }),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as DeleteAccountResult;
}
