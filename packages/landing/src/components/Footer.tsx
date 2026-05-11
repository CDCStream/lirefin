import Link from "next/link";
import Image from "next/image";
import { CookieSettingsButton } from "@/components/CookieConsent";
import { FOOTER_LINKS, SITE } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/40 py-14">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image
              src="/icon-32.png"
              alt="Lirefin"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="text-base font-semibold tracking-tight text-navy-800 dark:text-white">
              {SITE.name}
            </span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            AI Chrome extension that reads financial news for you and surfaces
            bullish, neutral, or bearish signals for your portfolio. Powered by
            Claude.
          </p>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-700 dark:text-navy-200">
            Product
          </div>
          <ul className="mt-4 space-y-2.5 text-sm">
            {FOOTER_LINKS.product.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-muted-foreground transition-colors hover:text-navy-800 dark:hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-700 dark:text-navy-200">
            Legal
          </div>
          <ul className="mt-4 space-y-2.5 text-sm">
            {FOOTER_LINKS.legal.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-muted-foreground transition-colors hover:text-navy-800 dark:hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <CookieSettingsButton className="text-muted-foreground transition-colors hover:text-navy-800 dark:hover:text-white">
                Cookie settings
              </CookieSettingsButton>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-6xl flex-col gap-4 border-t border-border/60 px-6 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Lirefin. All rights reserved.</p>
        <p className="max-w-md sm:text-right">
          Lirefin is not a registered investment advisor. Output is for
          informational purposes only and is not investment advice.
        </p>
      </div>
    </footer>
  );
}
