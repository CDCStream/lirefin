"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const ahrefsWebAnalyticsKey =
  process.env.NEXT_PUBLIC_AHREFS_WEB_ANALYTICS_KEY;

const STORAGE_KEY = "lirefin_consent_v1";

export const COOKIE_SETTINGS_EVENT = "lirefin-open-cookie-settings";

type ConsentPayload = {
  version: 1;
  analytics: boolean;
  decidedAt: string;
};

function readStored(): ConsentPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<ConsentPayload>;
    if (p.version !== 1 || typeof p.analytics !== "boolean") return null;
    return p as ConsentPayload;
  } catch {
    return null;
  }
}

/**
 * GDPR / ePrivacy-friendly gate: Vercel Analytics + Speed Insights load only
 * after explicit opt-in. Consent is stored in localStorage (marketing site only).
 */
export function ConsentBannerAndAnalytics() {
  const [hydrated, setHydrated] = useState(false);
  const [hasRecord, setHasRecord] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  const applyChoice = useCallback((allow: boolean) => {
    const payload: ConsentPayload = {
      version: 1,
      analytics: allow,
      decidedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setAnalytics(allow);
    setHasRecord(true);
    setManagerOpen(false);
    setHydrated(true);
  }, []);

  useEffect(() => {
    const stored = readStored();
    startTransition(() => {
      setHasRecord(stored !== null);
      setAnalytics(stored?.analytics ?? false);
      setHydrated(true);
      if (!stored) setManagerOpen(true);
    });
  }, []);

  useEffect(() => {
    const onOpen = () => setManagerOpen(true);
    window.addEventListener(COOKIE_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, onOpen);
  }, []);

  const showBar = hydrated && (managerOpen || !hasRecord);

  return (
    <>
      {analytics ? (
        <>
          <Analytics />
          <SpeedInsights />
          {gaMeasurementId ? (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`}
                strategy="afterInteractive"
              />
              <Script id="lirefin-ga4" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaMeasurementId}', { anonymize_ip: true });
                `}
              </Script>
            </>
          ) : null}
          {ahrefsWebAnalyticsKey ? (
            <Script
              src="https://analytics.ahrefs.com/analytics.js"
              strategy="afterInteractive"
              data-key={ahrefsWebAnalyticsKey}
            />
          ) : null}
        </>
      ) : null}

      {showBar ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-card/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur-md dark:bg-navy-950/95 dark:shadow-black/40"
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-consent-title"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">
              <p
                id="cookie-consent-title"
                className="font-semibold text-navy-800 dark:text-navy-100"
              >
                Cookies on lirefin.com
              </p>
              <p className="mt-1.5">
                With your consent we may load Vercel Web Analytics and Speed Insights,
                and—if configured—Google Analytics&nbsp;4 and Ahrefs Web Analytics for
                aggregate traffic insight. We don&apos;t use them for ads. See our{" "}
                <Link
                  href="/privacy#cookies-lirefin"
                  className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-500 dark:text-brand-400"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              {hasRecord ? (
                <button
                  type="button"
                  onClick={() => setManagerOpen(false)}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  Close
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => applyChoice(false)}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-navy-800 transition-colors hover:bg-muted dark:text-navy-100"
              >
                Decline optional
              </button>
              <button
                type="button"
                onClick={() => applyChoice(true)}
                className="rounded-full bg-navy-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-900 dark:bg-white dark:text-navy-900 dark:hover:bg-navy-100"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CookieSettingsButton({
  className,
  children = "Cookie settings",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_EVENT));
      }}
    >
      {children}
    </button>
  );
}
