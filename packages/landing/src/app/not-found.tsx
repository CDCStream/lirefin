import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center px-6 py-32">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            404
          </div>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Page not found
          </h1>
          <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-brand-600 px-6 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
