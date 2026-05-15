import { Check } from "lucide-react";
import {
  CREDIT_PACKAGES,
  SIGNUP_BONUS_CREDITS,
  type CreditPackage,
} from "@fni/shared";
import { SITE } from "@/lib/config";

function paidFeatureLines(pkg: CreditPackage): string[] {
  const creditLine = pkg.unlimited
    ? `${pkg.credits.toLocaleString()} credits / month · largest pool (“Unlimited” plan)`
    : `${pkg.credits.toLocaleString()} credits / month`;
  const bonusLine =
    pkg.bonusPct > 0
      ? `≈ ${pkg.bonusPct}% bonus credits vs Starter pricing`
      : null;
  return [
    creditLine,
    ...(bonusLine ? [bonusLine] : []),
    "Secure checkout inside the extension (Dodo Payments)",
    "Portfolio & languages included",
  ];
}

type PricingTier =
  | {
      key: string;
      name: string;
      priceLabel: string;
      periodLabel: string;
      description: string;
      features: string[];
      cta: string;
      highlight: boolean;
    };

const freeTier: PricingTier = {
  key: "free",
  name: "Free",
  priceLabel: "$0",
  periodLabel: "forever",
  description:
    "Full extension — generous starter credits before you subscribe.",
  features: [
    `${SIGNUP_BONUS_CREDITS} free analysis credits on signup`,
    "All 13 output languages · side panel + floating button",
    "Portfolio up to 50 symbols",
  ],
  cta: "Add to Chrome",
  highlight: false,
};

const paidTiers: PricingTier[] = CREDIT_PACKAGES.map((pkg) => ({
  key: pkg.id,
  name: pkg.label,
  priceLabel: `$${pkg.usd}`,
  periodLabel: "/ month",
  description: pkg.description,
  features: paidFeatureLines(pkg),
  cta: "Install · subscribe inside",
  highlight: pkg.id === "standard",
}));

const tiers: PricingTier[] = [freeTier, ...paidTiers];

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-border/60 py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700 dark:text-brand-400">
            Pricing
          </div>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-navy-800 dark:text-white sm:text-5xl">
            Start free. Upgrade when volume picks up.
          </h2>
          <p className="mt-5 text-pretty text-lg text-muted-foreground">
            Plans match what the extension offers after you sign in. Billing is
            live via Dodo — pick a tier in&nbsp;
            <span className="font-medium text-navy-800 dark:text-navy-100">
              Extension → Subscription
            </span>{" "}
            once Chrome is installed.
          </p>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`relative flex flex-col rounded-2xl border bg-card p-7 transition-shadow ${
                tier.highlight
                  ? "border-navy-700/50 shadow-xl shadow-navy-900/10 ring-1 ring-navy-700/10"
                  : "border-border hover:shadow-md"
              }`}
            >
              {tier.highlight ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-navy-800 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm dark:bg-white dark:text-navy-900">
                  Most popular
                </div>
              ) : null}

              <h3 className="text-lg font-semibold tracking-tight text-navy-800 dark:text-white">
                {tier.name}
              </h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight tabular-nums text-navy-800 dark:text-white sm:text-5xl">
                  {tier.priceLabel}
                </span>
                <span className="text-sm text-muted-foreground">
                  {tier.periodLabel}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {tier.description}
              </p>

              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={SITE.webStoreUrl}
                className={`mt-7 inline-flex h-11 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  tier.highlight
                    ? "bg-navy-800 text-white hover:bg-navy-900 dark:bg-white dark:text-navy-900 dark:hover:bg-navy-100"
                    : "border border-border bg-card text-navy-700 hover:bg-muted dark:text-navy-100"
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-xs text-muted-foreground">
          Lirefin is a reading & summarization assistant. Output is for
          informational purposes only and is{" "}
          <span className="font-semibold text-navy-700 dark:text-navy-200">
            not investment advice
          </span>
          . AI analyses can be wrong — always verify before acting.
        </p>
      </div>
    </section>
  );
}
