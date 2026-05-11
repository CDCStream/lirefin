/**
 * GA4 Measurement ID — override via NEXT_PUBLIC_GA_MEASUREMENT_ID on Vercel / .env.local.
 * Default matches the GA4 Web stream shown in Google's setup wizard.
 */
export const gaMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-V90HGSEK85";
