/**
 * GA4 Measurement ID — override via NEXT_PUBLIC_GA_MEASUREMENT_ID on Vercel / .env.local.
 * Default matches the GA4 Web stream shown in Google's setup wizard.
 */
export const gaMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-V90HGSEK85";

/**
 * Ahrefs Web Analytics `data-key`. Override via NEXT_PUBLIC_AHREFS_WEB_ANALYTICS_KEY.
 * Script loads site-wide (`beforeInteractive` in root layout) so verification crawlers see it.
 */
export const ahrefsWebAnalyticsKey =
  process.env.NEXT_PUBLIC_AHREFS_WEB_ANALYTICS_KEY?.trim() ||
  "jO/1aWICAuMLx0pBwY1flA";
