import Image from "next/image";

type MediaCardData = {
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
  description: string;
};

const mediaItems: MediaCardData[] = [
  {
    src: "/media/shot-2.png",
    alt: 'Reuters article with highlighted text drag-select and Lirefin side panel showing "Pick mode active"',
    eyebrow: "Pick mode",
    title: "Drag-select the passage you care about",
    description:
      "Highlight headlines, bullets, or a full passage on Reuters, Bloomberg, or any page. ESC cancels cleanly — no fiddly copy-paste.",
  },
  {
    src: "/media/shot-3.png",
    alt: 'Lirefin panel showing highlighted article excerpt and Analyze with Claude button with credit estimate',
    eyebrow: "Review & analyze",
    title: 'See exactly what ships to Claude — then hit "Analyze"',
    description:
      "Transparent word count and credit estimate before you spend. Confirm your selection or pick again in one tap.",
  },
  {
    src: "/media/shot-1.png",
    alt: "Reuters article beside Lirefin analysis with bullish stock cards, confidence bars, and cited quotes",
    eyebrow: "Portfolio-aware",
    title: "Per-ticker sentiment with evidence",
    description:
      "BULLISH · NEUTRAL · BEARISH per holding, confidence, reasoning, and the exact sentence from the piece — beside the article you read.",
  },
  {
    src: "/media/shot-5.png",
    alt: "Lirefin settings with language picker, region, portfolio ticker tags, and recent activity rows",
    eyebrow: "Make it yours",
    title: "Language, region, and your holdings",
    description:
      "Output language, geography, portfolio tickers, and billing activity — centralized in one dark, focused panel.",
  },
  {
    src: "/media/shot-4.png",
    alt: "Lirefin History view listing recent analyses with timestamps and credits used",
    eyebrow: "History",
    title: "Revisit past runs anytime",
    description:
      "Every analysis lands in History — word counts, portfolios covered, timestamps, and credit usage — with a discreet disclaimer footer.",
  },
];

function MediaCard({ item }: { item: MediaCardData }) {
  return (
    <figure className="group flex flex-col">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-muted/35 shadow-xl shadow-navy-900/10 ring-1 ring-navy-900/[0.055] transition-[box-shadow,border-color] duration-300 group-hover:border-navy-500/40 group-hover:shadow-navy-900/14 dark:bg-navy-950/35 dark:ring-white/10">
        <Image
          src={item.src}
          alt={item.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 42rem"
          className="object-cover object-left-top motion-safe:transition motion-safe:duration-500 motion-safe:ease-out group-hover:scale-[1.025]"
          quality={92}
          priority={item.src === "/media/shot-2.png"}
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 opacity-70 mix-blend-overlay dark:ring-white/[0.07]"
          aria-hidden
        />
      </div>
      <figcaption className="mt-5 px-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-brand-400">
          {item.eyebrow}
        </span>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-navy-800 dark:text-white">
          {item.title}
        </h3>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      </figcaption>
    </figure>
  );
}

export function MediaShowcase() {
  return (
    <section
      id="gallery"
      aria-labelledby="media-showcase-heading"
      className="relative border-b border-border/60 py-24 sm:py-32"
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700 dark:text-brand-400">
            Screenshots
          </div>
          <h2
            id="media-showcase-heading"
            className="mt-4 text-balance text-3xl font-semibold tracking-tight text-navy-800 dark:text-white sm:text-5xl"
          >
            The full flow — on pages you already read.
          </h2>
          <p className="mt-5 text-pretty text-lg text-muted-foreground">
            From drag-select through portfolio-aware Claude output — all in the
            side panel beside the article (with credit transparency and History
            when you want it).
          </p>
        </div>

        <div className="mt-16 grid gap-10 sm:grid-cols-2 sm:gap-8 lg:gap-10">
          {mediaItems.map((item, index) => (
            <div
              key={item.src}
              className={
                index === mediaItems.length - 1
                  ? "sm:col-span-2 sm:mx-auto sm:max-w-2xl"
                  : undefined
              }
            >
              <MediaCard item={item} />
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-xs leading-relaxed text-muted-foreground">
          Product UI shown alongside live news pages for illustration. Screens
          are from real workflows; ticker examples are illustrative — not an
          analyst recommendation or investment advice.
        </p>
      </div>
    </section>
  );
}
