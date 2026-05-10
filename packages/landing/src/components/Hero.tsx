import Image from "next/image";
import { SITE } from "@/lib/config";
import { ArrowRight, Sparkles, TrendingUp, Minus, TrendingDown } from "lucide-react";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
      <div className="absolute inset-0 bg-radial-fade" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-6 pt-20 pb-24 text-center sm:pt-28 sm:pb-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-brand-500" />
          Powered by Claude · Reads 25+ news sites · 13 languages
        </div>

        <h1 className="mt-7 max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl sm:leading-[1.05]">
          Read the market,{" "}
          <span className="bg-gradient-to-r from-brand-500 via-brand-400 to-emerald-400 bg-clip-text text-transparent">
            instantly.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
          Lirefin is a Chrome extension that reads any financial news article
          you open and tells you what it means for the assets in your portfolio
          — bullish, neutral, or bearish — with cited reasoning. No more
          skimming endless feeds.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href={SITE.webStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-600 px-7 text-base font-medium text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-700 hover:shadow-brand-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Add to Chrome — free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="#how-it-works"
            className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card/60 px-7 text-base font-medium backdrop-blur transition-colors hover:bg-muted"
          >
            See how it works
          </a>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Free signup credits · No credit card required
        </p>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative mt-16 w-full max-w-5xl">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-brand-500/20 via-transparent to-emerald-400/20 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/20">
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400/70" />
            <span className="h-3 w-3 rounded-full bg-amber-400/70" />
            <span className="h-3 w-3 rounded-full bg-green-400/70" />
          </div>
          <div className="ml-3 flex-1 truncate rounded-md border border-border/60 bg-background/60 px-3 py-1 text-left text-xs text-muted-foreground">
            reuters.com/markets/nvidia-q3-earnings-beat-data-center-revenue
          </div>
        </div>

        <div className="grid gap-0 sm:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3 p-6 text-left">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Reuters · 2 min read
            </div>
            <div className="text-lg font-semibold leading-snug">
              Nvidia tops Q3 estimates as data-center demand surges; raises
              full-year outlook
            </div>
            <div className="space-y-1.5">
              <div className="h-2 rounded bg-muted shimmer" />
              <div className="h-2 w-[92%] rounded bg-muted shimmer" />
              <div className="h-2 w-[78%] rounded bg-muted shimmer" />
              <div className="h-2 w-[88%] rounded bg-muted shimmer" />
              <div className="h-2 w-[64%] rounded bg-muted shimmer" />
            </div>
            <div className="space-y-1.5 pt-3">
              <div className="h-2 w-[94%] rounded bg-muted shimmer" />
              <div className="h-2 w-[70%] rounded bg-muted shimmer" />
            </div>
          </div>

          <div className="border-l border-border bg-background/40 p-6 text-left">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-brand-600">
              <Sparkles className="h-3.5 w-3.5" />
              Lirefin analysis
            </div>
            <div className="mt-4 space-y-3">
              <AnalysisRow ticker="NVDA" sentiment="bullish" confidence={92} />
              <AnalysisRow ticker="AMD" sentiment="neutral" confidence={61} />
              <AnalysisRow ticker="INTC" sentiment="bearish" confidence={74} />
              <AnalysisRow ticker="TSM" sentiment="bullish" confidence={83} />
            </div>
            <div className="mt-5 rounded-lg border border-border/70 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">NVDA · Bullish.</span>{" "}
              Q3 data-center revenue up 41% YoY beat consensus by $2.1B; FY
              guidance raised. Sustained AI capex tailwind through next
              quarter.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const sentimentStyles = {
  bullish: {
    Icon: TrendingUp,
    bar: "bg-emerald-500",
    pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  },
  neutral: {
    Icon: Minus,
    bar: "bg-slate-400",
    pill: "bg-slate-500/10 text-slate-600 dark:text-slate-300 ring-slate-500/20",
  },
  bearish: {
    Icon: TrendingDown,
    bar: "bg-red-500",
    pill: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20",
  },
} as const;

function AnalysisRow({
  ticker,
  sentiment,
  confidence,
}: {
  ticker: string;
  sentiment: keyof typeof sentimentStyles;
  confidence: number;
}) {
  const s = sentimentStyles[sentiment];
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 text-sm font-semibold tabular-nums">{ticker}</div>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset ${s.pill}`}
      >
        <s.Icon className="h-3 w-3" />
        {sentiment}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${s.bar}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
          {confidence}%
        </span>
      </div>
    </div>
  );
}
