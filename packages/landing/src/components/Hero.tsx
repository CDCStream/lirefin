import { SITE } from "@/lib/config";
import { ArrowRight, Sparkles, TrendingUp, Minus, TrendingDown } from "lucide-react";

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
          <div className="ml-3 flex-1 truncate rounded-md border border-border/60 bg-background/80 px-3 py-1 text-left text-xs font-medium text-muted-foreground">
            reuters.com/markets/nvidia-q3-earnings-beat-data-center-revenue
          </div>
        </div>

        <div className="grid gap-0 sm:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3 p-6 text-left sm:p-8">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Reuters · 12 min read
            </div>
            <div className="text-lg font-semibold leading-snug text-navy-800 dark:text-white">
              Nvidia tops Q3 estimates as data-center demand surges; raises
              full-year outlook
            </div>
            <div className="space-y-1.5 pt-1">
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

          <div className="border-l border-border bg-surface-tint p-6 text-left sm:p-7 dark:bg-navy-950/40">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-400">
              <Sparkles className="h-3.5 w-3.5" />
              Lirefin analysis
            </div>
            <div className="mt-4 space-y-3">
              <AnalysisRow ticker="NVDA" sentiment="bullish" confidence={92} />
              <AnalysisRow ticker="AMD" sentiment="neutral" confidence={61} />
              <AnalysisRow ticker="INTC" sentiment="bearish" confidence={74} />
              <AnalysisRow ticker="TSM" sentiment="bullish" confidence={83} />
            </div>
            <div className="mt-5 rounded-lg border border-border/70 bg-card/70 p-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-navy-800 dark:text-navy-100">NVDA · Bullish.</span>{" "}
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
    pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20",
  },
  neutral: {
    Icon: Minus,
    bar: "bg-slate-400",
    pill: "bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/20",
  },
  bearish: {
    Icon: TrendingDown,
    bar: "bg-red-500",
    pill: "bg-red-500/10 text-red-700 dark:text-red-400 ring-red-500/20",
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
      <div className="w-12 text-sm font-semibold tabular-nums text-navy-800 dark:text-white">
        {ticker}
      </div>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${s.pill}`}
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
