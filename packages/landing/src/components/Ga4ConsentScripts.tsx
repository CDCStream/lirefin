import Script from "next/script";
import { gaMeasurementId } from "@/lib/analytics";

/* eslint-disable @next/next/no-before-interactive-script-outside-document --
   Next.js allows `strategy="beforeInteractive"` in App Router root layout; script is
   inlined into the streamed HTML so tag verification picks up googletagmanager.com/gtag/js. */

/**
 * Loads `gtag.js` on every page so Google Tag Assistant /-setup can detect it.
 * Consent defaults to denied; `CookieConsent` updates `analytics_storage` after opt-in/out.
 */
export function Ga4ConsentScripts() {
  if (!gaMeasurementId) return null;

  const idParam = encodeURIComponent(gaMeasurementId);

  return (
    <>
      <Script id="ga-consent-default" strategy="beforeInteractive">
        {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag("consent","default",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",wait_for_update:500});`}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${idParam}`}
        strategy="beforeInteractive"
      />
      <Script id="ga-config-inline" strategy="beforeInteractive">{`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag("js", new Date());
gtag("config","${gaMeasurementId}");`}</Script>
    </>
  );
}
