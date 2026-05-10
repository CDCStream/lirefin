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
    title: "Knows the news sites you read",
    description:
      "A subtle dot in your toolbar lights up when there's something worth analyzing on Reuters, Bloomberg, CNBC, FT, WSJ, Yahoo Finance, Investing.com — 25+ sites recognized out of the box, plus smart fallback for everything else.",
  },
  {
    Icon: Wallet,
    title: "Built around your portfolio",
    description:
      "Add the stocks and ETFs you actually hold — US, European (XETRA, LSE, Euronext), or Asian (TSE, HKEX, KOSPI). Every analysis is filtered through your real exposure, not generic stock summaries you'd ignore.",
  },
  {
    Icon: Zap,
    title: "Clear breakdown — no jargon",
    description:
      "Every analysis arrives as a clean structured response: per-ticker sentiment, confidence score, plain-English reasoning, and the exact quote that supports it. No hallucinated tickers. No vibes.",
  },
  {
    Icon: Languages,
    title: "Reads any language you read",
    description:
      "Articles in English, Turkish, German, French, Spanish, Italian, Portuguese, Dutch, Japanese, Chinese, Korean, Arabic, or Russian — Claude detects automatically. Output in whichever of these 13 languages you prefer.",
  },
  {
    Icon: ShieldCheck,
    title: "Privacy-first by design",
    description:
      "API keys live only on the backend — never in your browser. Article text is never persistently logged. A short 5-minute cache avoids re-charging you for the same article. No third-party trackers. No browsing history.",
  },
  {
    Icon: GitBranch,
    title: "Side panel, popup, or floating button",
    description:
      "Pin Lirefin in the side panel for a permanent dashboard, summon it from the toolbar, or click the floating button next to recognized articles. Hide the FAB per-site or everywhere — your call.",
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
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700 dark:text-brand-400">
            What it does
          </div>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-navy-800 dark:text-white sm:text-5xl">
            Built for how you actually read the news.
          </h2>
          <p className="mt-5 text-pretty text-lg text-muted-foreground">
            Skip the noise. Get the takeaway, the ticker impact, and the
            evidence — in seconds, in your language, on the page you&apos;re
            already reading.
          </p>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all hover:border-navy-500/40 hover:shadow-lg hover:shadow-navy-900/5"
            >
              <div
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-navy-500/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700 ring-1 ring-inset ring-navy-200 dark:bg-navy-900/60 dark:text-navy-200 dark:ring-navy-700">
                <f.Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-navy-800 dark:text-white">
                {f.title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
