import { SITE } from "@/lib/config";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 bg-grid opacity-100" aria-hidden />
      <div className="absolute inset-0 bg-radial-fade" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-navy-500/30 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-6 pt-24 pb-28 text-center sm:pt-32 sm:pb-36">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          <span className="text-navy-700 dark:text-navy-200">Powered by Claude</span>
          <span className="text-border">·</span>
          <span>Any financial site</span>
          <span className="text-border">·</span>
          <span>13 languages</span>
        </div>

        <h1 className="mt-8 max-w-4xl text-balance text-5xl font-semibold tracking-tight text-navy-800 dark:text-white sm:text-7xl sm:leading-[1.02]">
          AI explains all financial news and articles{" "}
          <span className="bg-gradient-to-r from-navy-700 via-navy-500 to-brand-500 bg-clip-text text-transparent">
            — instantly.
          </span>
        </h1>

        <p className="mt-7 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl sm:leading-relaxed">
          Open any financial article. Lirefin tells you what it means for your
          stocks — bullish, neutral, or bearish — with the reasoning behind it.
          Built for investors who&apos;d rather understand than skim.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href={SITE.webStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-navy-800 px-7 text-base font-medium text-white shadow-lg shadow-navy-800/20 transition-all hover:bg-navy-900 hover:shadow-navy-800/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-white dark:text-navy-900 dark:shadow-white/10 dark:hover:bg-navy-100"
          >
            Add to Chrome — free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="#how-it-works"
            className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card/60 px-7 text-base font-medium text-navy-700 backdrop-blur transition-colors hover:bg-muted dark:text-navy-100"
          >
            See how it works
          </a>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
            Free signup credits
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-navy-500" aria-hidden />
            No credit card required
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-navy-500" aria-hidden />
            Cancel any time
          </span>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative mt-20 w-full max-w-5xl">
      <div className="absolute -inset-6 -z-10 rounded-3xl bg-soft-glow blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-navy-900/15 ring-1 ring-navy-900/5">
        <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400/70" />
            <span className="h-3 w-3 rounded-full bg-amber-400/70" />
            <span className="h-3 w-3 rounded-full bg-green-400/70" />
          </div>
          <div className="ml-3 flex flex-1 items-center gap-2 truncate rounded-md border border-border/60 bg-background/80 px-3 py-1 text-left text-xs font-medium text-muted-foreground">
            <span className="truncate">lirefin.com · product demo</span>
          </div>
        </div>

        <div className="relative flex min-h-[200px] items-center justify-center bg-navy-950">
          <video
            className="max-h-[min(70vh,720px)] w-full object-contain"
            controls
            playsInline
            preload="metadata"
            muted
            autoPlay
            loop
            poster="/demo-poster.png"
            aria-label="Screen recording: using Lirefin on a financial news article in Chrome"
          >
            <source src="/demo.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Watch the flow: pick text → analyze → portfolio-aware summary in the side
        panel.
      </p>
    </div>
  );
}
