/**
 * Two-tone "lirefin" wordmark — `lire` (read) in brand blue, `fin` (finance)
 * in bearish red. The split mirrors the `assets/lirefin-wordmark.png` master
 * and reinforces the duality of the product (reading + markets). Always
 * lowercase to match the modern fintech aesthetic (Stripe / Linear / Vercel
 * style). Brand names don't translate, so this renders the same string
 * regardless of UI language.
 */
export function LirefinWordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-base";
  return (
    <span
      className={`brand-wordmark ${sizeClass} leading-none ${className ?? ""}`.trim()}
    >
      <span className="text-brand-500">lire</span>
      <span className="text-bearish-500">fin</span>
    </span>
  );
}
