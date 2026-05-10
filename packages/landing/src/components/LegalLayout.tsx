import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Legal
          </div>
          <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated: {lastUpdated}
          </p>

          <article className="prose-styles mt-12 space-y-8">{children}</article>
        </div>
      </main>
      <Footer />
    </>
  );
}
