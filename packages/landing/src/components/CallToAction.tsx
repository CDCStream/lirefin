import { ArrowRight } from "lucide-react";
import { SITE } from "@/lib/config";

export function CallToAction() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border/60 py-24 sm:py-32">
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-500/10 via-transparent to-transparent"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent"
        aria-hidden
      />

      <div className="mx-auto w-full max-w-3xl px-6 text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
          Stop skimming. <br className="hidden sm:block" />
          Start reading.
        </h2>
        <p className="mt-5 text-pretty text-lg text-muted-foreground">
          Install Lirefin in 30 seconds. Get 25 free credits. Cancel any time.
        </p>
        <div className="mt-9 flex justify-center">
          <a
            href={SITE.webStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-600 px-7 text-base font-medium text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-700 hover:shadow-brand-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Add to Chrome — free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
