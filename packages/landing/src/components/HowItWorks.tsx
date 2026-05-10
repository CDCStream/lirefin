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
      "Floating button on the page or one click in the toolbar. We extract the article cleanly with Mozilla Readability and send only the text to our backend — never your tabs or browsing history.",
  },
  {
    Icon: ScrollText,
    title: "Get a portfolio-aware breakdown",
    description:
      "Per-ticker sentiment, confidence, plain-English reasoning, and the exact quote that supports it — opens beside the article in the side panel. Save credits, share, or pin for later.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-b border-border/60 bg-muted/30 py-24 sm:py-32"
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            How it works
          </div>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Three clicks from headline to thesis.
          </h2>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="relative rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <s.Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
