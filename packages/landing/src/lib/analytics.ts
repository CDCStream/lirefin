/**
 * GA4 Measurement ID — override via NEXT_PUBLIC_GA_MEASUREMENT_ID on Vercel / .env.local.
 * Default matches the GA4 Web stream shown in Google's setup wizard.
 */
export const gaMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-V90HGSEK85";

/**
 * Google Ads Google Tag (gtag) ID — issued by Google Ads when linking a tag fails the
 * permission step. Loaded alongside GA4 via the same gtag.js loader so we get
 * conversion measurement without duplicating the script.
 *
 * Override via NEXT_PUBLIC_GOOGLE_ADS_TAG_ID on Vercel / .env.local. Set to empty
 * string to disable.
 */
export const googleAdsTagId =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_TAG_ID?.trim() ?? "G-Y486RV2KGM";

/**
 * Ahrefs Web Analytics `data-key`. Override via NEXT_PUBLIC_AHREFS_WEB_ANALYTICS_KEY.
 * Script loads site-wide (`beforeInteractive` in root layout) so verification crawlers see it.
 */
export const ahrefsWebAnalyticsKey =
  process.env.NEXT_PUBLIC_AHREFS_WEB_ANALYTICS_KEY?.trim() ||
  "jO/1aWICAuMLx0pBwY1flA";
