import { MousePointerClick, Sparkles, ScrollText } from "lucide-react";

const steps = [
  {
    Icon: MousePointerClick,
    title: "Open any financial article",
    description:
      "Browse like you normally do — Reuters, Bloomberg, FT, your favourite blog. Lirefin's dot lights up when it spots a financial story.",
  },
  {
    Icon: Sparkles,
    title: "Click Analyze",
    description:
      "Floating button on the page or one click in the toolbar. We extract the article cleanly and send only the text — never your tabs or browsing history.",
  },
  {
    Icon: ScrollText,
    title: "Get a portfolio-aware breakdown",
    description:
      "Per-ticker sentiment, confidence score, plain-English reasoning, and the exact quote that supports it — opens beside the article in the side panel.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative border-b border-border/60 bg-surface-tint py-24 sm:py-32"
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700 dark:text-brand-400">
            How it works
          </div>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-navy-800 dark:text-white sm:text-5xl">
            Three clicks from headline to thesis.
          </h2>
          <p className="mt-5 text-pretty text-lg text-muted-foreground">
            No setup forms, no dashboards to learn. Add your tickers once and
            keep reading the way you already do.
          </p>
        </div>

        <ol className="relative mt-16 grid gap-6 md:grid-cols-3">
          <div
            className="pointer-events-none absolute left-12 right-12 top-[3.25rem] hidden h-px bg-gradient-to-r from-transparent via-navy-300 to-transparent md:block dark:via-navy-700"
            aria-hidden
          />
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="relative rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-sm font-semibold text-white ring-4 ring-surface-tint dark:ring-navy-950">
                  {i + 1}
                </span>
                <s.Icon
                  className="h-5 w-5 text-muted-foreground"
                  strokeWidth={1.75}
                />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-navy-800 dark:text-white">
                {s.title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                {s.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
