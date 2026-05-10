import { Check } from "lucide-react";
import { SITE } from "@/lib/config";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try the full extension — no credit card required.",
    cta: "Add to Chrome",
    ctaHref: SITE.webStoreUrl,
    highlight: false,
    features: [
      "25 free analysis credits on signup",
      "All 13 output languages",
      "Side panel + floating button",
      "Portfolio with up to 50 assets",
    ],
  },
  {
    name: "Standard",
    price: "$10",
    period: "/ month",
    description: "Everyday reader — covers a few articles a day.",
    cta: "Coming soon",
    ctaHref: "#pricing",
    highlight: true,
    features: [
      "750 credits / month",
      "+7% bonus credits",
      "Priority queue",
      "Email support",
      "All Free plan features",
    ],
  },
  {
    name: "Pro",
    price: "$25",
    period: "/ month",
    description: "Active investor or analyst tracking many tickers.",
    cta: "Coming soon",
    ctaHref: "#pricing",
    highlight: false,
    features: [
      "2,000 credits / month",
      "+14% bonus credits",
      "Earnings calendar reader (beta)",
      "Multi-portfolio support",
      "All Standard plan features",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-border/60 py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Pricing
          </div>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Start free. Upgrade when you read more than you write.
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Paid plans are launching soon. Until then, every new account ships
            with 25 free credits — enough to feel out the product.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border bg-card p-7 ${
                tier.highlight
                  ? "border-brand-500/60 shadow-xl shadow-brand-500/10"
                  : "border-border"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                  Most popular
                </div>
              )}

              <div className="flex items-baseline gap-1">
                <h3 className="text-lg font-semibold tracking-tight">
                  {tier.name}
                </h3>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">
                  {tier.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {tier.period}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {tier.description}
              </p>

              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                      aria-hidden
                    />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={tier.ctaHref}
                className={`mt-7 inline-flex h-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  tier.highlight
                    ? "bg-brand-600 text-white hover:bg-brand-700"
                    : "border border-border bg-card hover:bg-muted"
                }`}
                {...(tier.cta === "Coming soon"
                  ? { "aria-disabled": true }
                  : {})}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-muted-foreground">
          Lirefin is a reading & summarization assistant. Output is for
          informational purposes only and is{" "}
          <span className="font-medium">not investment advice</span>. AI
          analyses can be wrong — always verify before acting.
        </p>
      </div>
    </section>
  );
}
