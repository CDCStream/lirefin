// Sentry initialization. THIS FILE MUST BE THE FIRST IMPORT IN server.ts.
//
// Sentry v10+ uses OpenTelemetry under the hood — instrumentation must be
// registered before any module that creates HTTP clients or timers is loaded,
// otherwise their calls won't be traced and async stack traces will be poor.
//
// We deliberately read process.env directly here (NOT from ./config.js) so
// this file has zero dependencies on the rest of the app, which means it can
// safely run before anything else.
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    release: process.env.SENTRY_RELEASE,

    // Default PII (IP, user agent, request body) is acceptable for the
    // backend because we already process this data under our Privacy Policy.
    sendDefaultPii: true,

    // Tracing eats event quota fast. Disable it on the free tier — we only
    // need error reporting for MVP. Bump to 0.1 once we move to paid plan.
    tracesSampleRate: 0,

    // Drop noisy / non-actionable errors before they hit our 5K/mo quota.
    ignoreErrors: [
      // Client disconnected mid-request — not our bug.
      "FST_ERR_CTP_INVALID_MEDIA_TYPE",
      "FST_ERR_VALIDATION",
    ],
  });
}

export const sentryEnabled = Boolean(dsn);
