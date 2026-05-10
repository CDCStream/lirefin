import {
  Newspaper,
  Wallet,
  Languages,
  ShieldCheck,
  Zap,
  GitBranch,
  type LucideIcon,
} from "lucide-react";

const features: {
  Icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    Icon: Newspaper,
    title: "Auto-detects financial news",
    description:
      "Recognizes 25+ major sites — Reuters, Bloomberg, CNBC, FT, WSJ, Yahoo Finance, Investing.com — plus DOM heuristics for everything else. A subtle dot lights up your toolbar when there's something worth reading.",
  },
  {
    Icon: Wallet,
    title: "Portfolio-aware",
    description:
      "Tell Lirefin what you hold — US, European (XETRA, LSE, Euronext), and Asian (TSE, HKEX, KOSPI) tickers, ETFs included. Every analysis is filtered through your actual exposure, not generic stock summaries.",
  },
  {
    Icon: Zap,
    title: "Structured, not just text",
    description:
      "Powered by Claude's tool-use API: every response is a guaranteed JSON breakdown — sentiment, confidence, reasoning, and the exact quote that supports it. No hallucinated tickers, no vibes.",
  },
  {
    Icon: Languages,
    title: "Reads any language",
    description:
      "Articles in English, Turkish, German, French, Spanish, Italian, Portuguese, Dutch, Japanese, Chinese, Korean, Arabic, or Russian — Claude detects automatically. Output in whichever of these 13 languages you prefer.",
  },
  {
    Icon: ShieldCheck,
    title: "Privacy-first",
    description:
      "API keys live only on the backend. Article text is never persistently logged. A short SHA-256 cache (5 minutes) avoids re-charging you for the same article. No third-party trackers on the article pages you visit.",
  },
  {
    Icon: GitBranch,
    title: "Side panel + popup + FAB",
    description:
      "Pin Lirefin in the side panel for a permanent dashboard, summon it from the toolbar popup, or click the floating button that appears next to recognized articles. Hide the FAB per-site or everywhere — your call.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="border-b border-border/60 py-24 sm:py-32"
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Features
          </div>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for how you actually read the news.
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Skip the noise. Get the takeaway, the ticker impact, and the
            evidence — in seconds, in your language, on the page you&apos;re
            already reading.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5"
            >
              <div
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 ring-1 ring-inset ring-brand-500/20">
                <f.Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
