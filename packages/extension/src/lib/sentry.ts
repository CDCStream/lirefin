// Sentry initialization for the Lirefin browser extension.
//
// We have FOUR independent JS contexts (background service worker, popup,
// options page, side panel) and one content script. This file is imported
// by each entry point as the very first line so error reporting is wired up
// before the rest of the bundle has a chance to throw.
//
// Notes for the future:
// - DSN is bundled at build time via `VITE_SENTRY_DSN`. It's PUBLIC by design
//   (Sentry's threat model assumes the DSN is visible to anyone running the
//    extension), so it's fine to ship it inside the .crx.
// - We deliberately KEEP Sentry off in the content script for now. Content
//   scripts run on every webpage, and any uncaught errors from third-party
//   scripts on the host page can leak into our handler — too noisy for the
//   5K event/mo free tier. We can add it later with strict scope filtering.
// - Replay & tracing are disabled (sampleRate 0) because:
//   * Replay doesn't work well in popup/sidepanel because they unload often.
//   * Tracing eats event quota fast and we don't have perf SLOs yet.

import * as Sentry from "@sentry/browser";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

let initialized = false;

export type SentryContext =
  | "background"
  | "popup"
  | "options"
  | "sidepanel"
  | "content";

export function initSentry(context: SentryContext): void {
  if (initialized) return;
  if (!dsn) return;

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE ?? "production",
      release: `lirefin-extension@${import.meta.env.VITE_APP_VERSION ?? "0.1.6"}`,

      // Default PII is OK — we only ship 5xx-ish errors and the user has
      // already accepted our privacy policy at sign-in time.
      sendDefaultPii: true,

      // Only error capture on free tier. Bump these to 0.1 once paid.
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,

      // Tag every event with which extension surface it came from so we can
      // tell whether a bug is in the side panel vs. the background worker.
      initialScope: {
        tags: { surface: context },
      },

      ignoreErrors: [
        // Browser noise
        "ResizeObserver loop limit exceeded",
        "ResizeObserver loop completed with undelivered notifications.",
        // Chrome MV3 lifecycle: tab/extension unloaded mid-fetch
        "Extension context invalidated.",
        // Network drops surfaced as TypeError in fetch — already shown in UI
        "Failed to fetch",
        "NetworkError when attempting to fetch resource.",
        "Load failed",
      ],
    });
    initialized = true;
  } catch (err) {
    // Sentry init failing must NEVER take the extension down. Worst case we
    // lose telemetry, which is exactly what happens today.
    console.warn("[Lirefin] Sentry init failed:", err);
  }
}

export const sentryEnabled = Boolean(dsn);

// Re-export a thin captureException wrapper so call sites don't need to
// import @sentry/browser directly. Safe no-op if Sentry isn't initialized.
export function captureExtensionError(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized) return;
  try {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    // ignored — see comment in initSentry
  }
}
