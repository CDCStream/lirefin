import Script from "next/script";
import { gaMeasurementId, googleAdsTagId } from "@/lib/analytics";

/* eslint-disable @next/next/no-before-interactive-script-outside-document --
   Next.js allows `strategy="beforeInteractive"` in App Router root layout; script is
   inlined into the streamed HTML so tag verification picks up googletagmanager.com/gtag/js. */

/**
 * Loads `gtag.js` on every page so Google Tag Assistant /-setup can detect it.
 * Configures both GA4 and the Google Ads tag (when set) under a single gtag.js
 * loader — gtag supports multiple `config` calls. Consent defaults to denied;
 * `CookieConsent` updates `analytics_storage` after opt-in/out.
 */
export function Ga4ConsentScripts() {
  const tagIds = [gaMeasurementId, googleAdsTagId].filter(
    (id): id is string => Boolean(id)
  );
  if (tagIds.length === 0) return null;

  const loaderIdParam = encodeURIComponent(tagIds[0]);
  const configCalls = tagIds
    .map((id) => `gtag("config","${id}");`)
    .join("\n");

  return (
    <>
      <Script id="ga-consent-default" strategy="beforeInteractive">
        {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag("consent","default",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",wait_for_update:500});`}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${loaderIdParam}`}
        strategy="beforeInteractive"
      />
      <Script id="ga-config-inline" strategy="beforeInteractive">{`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag("js", new Date());
${configCalls}`}</Script>
    </>
  );
}
