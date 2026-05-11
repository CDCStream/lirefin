import Script from "next/script";
import { ahrefsWebAnalyticsKey } from "@/lib/analytics";

/* eslint-disable @next/next/no-before-interactive-script-outside-document --
   Mirrors GA4 root layout pattern so crawlers verify `analytics.ahrefs.com/analytics.js`. */

/**
 * Loads on every route (not gated on cookie accept) — tool verification bots do not simulate consent.
 */
export function AhrefsAnalyticsScript() {
  if (!ahrefsWebAnalyticsKey) return null;

  return (
    <Script
      src="https://analytics.ahrefs.com/analytics.js"
      strategy="beforeInteractive"
      data-key={ahrefsWebAnalyticsKey}
    />
  );
}
