/**
 * Lirefin brand mark — SVG matching the master app icon.
 *
 * Open book whose pages form an ascending bar chart, capped by a bullish-green
 * peak dot. Bars + spine + book base curve all inherit `currentColor` so the
 * mark reads cleanly on any background; only the peak dot keeps its emerald
 * accent regardless of context.
 */
export function LirefinMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-4/5 h-4/5 ${className ?? ""}`.trim()}
      aria-hidden
    >
      <g fill="currentColor">
        <rect x="2.6" y="14" width="2.6" height="6.5" rx="0.5" />
        <rect x="6.4" y="11" width="2.6" height="9.5" rx="0.5" />
        <rect x="15" y="8" width="2.6" height="12.5" rx="0.5" />
        <rect x="18.8" y="5" width="2.6" height="15.5" rx="0.5" />
        <rect x="11.4" y="7" width="1.2" height="13.7" rx="0.3" />
        <path d="M1.6 20.4 Q12 22.6 22.4 20.4 L22.4 21.7 Q12 23.9 1.6 21.7 Z" />
      </g>
      <circle cx="20.1" cy="2.9" r="1.7" fill="#34d399" />
    </svg>
  );
}
