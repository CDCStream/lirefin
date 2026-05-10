import Link from "next/link";
import Image from "next/image";
import { NAV_LINKS, SITE } from "@/lib/config";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <Image
            src="/icon-32.png"
            alt="Lirefin"
            width={28}
            height={28}
            priority
            className="rounded-md"
          />
          <span className="text-base font-semibold tracking-tight text-navy-800 dark:text-navy-100">
            {SITE.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-navy-800 dark:hover:text-navy-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={SITE.webStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center rounded-full bg-navy-800 px-4 text-sm font-medium text-white transition-colors hover:bg-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-white dark:text-navy-900 dark:hover:bg-navy-100"
          >
            Add to Chrome
          </a>
        </div>
      </div>
    </header>
  );
}
