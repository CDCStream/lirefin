import { ArrowRight } from "lucide-react";
import { SITE } from "@/lib/config";

export function CallToAction() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border/60 py-28 sm:py-36">
      <div
        className="absolute inset-0 -z-10 bg-soft-glow"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-navy-500/40 to-transparent"
        aria-hidden
      />

      <div className="mx-auto w-full max-w-3xl px-6 text-center">
        <h2 className="text-balance text-4xl font-semibold tracking-tight text-navy-800 dark:text-white sm:text-6xl">
          Stop skimming.
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-navy-700 via-navy-500 to-brand-500 bg-clip-text text-transparent">
            Start understanding.
          </span>
        </h2>
        <p className="mt-6 text-pretty text-lg text-muted-foreground">
          Install Lirefin in 30 seconds. Get 25 free credits. Cancel any time.
        </p>
        <div className="mt-10 flex justify-center">
          <a
            href={SITE.webStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-navy-800 px-8 text-base font-medium text-white shadow-lg shadow-navy-800/20 transition-all hover:bg-navy-900 hover:shadow-navy-800/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-white dark:text-navy-900 dark:shadow-white/10 dark:hover:bg-navy-100"
          >
            Add to Chrome — free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          No credit card required · No browsing data collected
        </p>
      </div>
    </section>
  );
}
