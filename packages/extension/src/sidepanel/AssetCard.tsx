import type { AssetAnalysis, SupportedLanguageCode } from "@fni/shared";
import { t } from "../lib/i18n.js";

const styles = {
  bullish: {
    border: "border-bullish-500/40",
    bg: "bg-bullish-500/10",
    label: "text-bullish-500",
    dot: "bg-bullish-500",
    icon: "▲",
    bar: "bg-bullish-500",
  },
  neutral: {
    border: "border-neutral-500/30",
    bg: "bg-neutral-500/10",
    label: "text-neutral-400",
    dot: "bg-neutral-500",
    icon: "●",
    bar: "bg-neutral-500",
  },
  bearish: {
    border: "border-bearish-500/40",
    bg: "bg-bearish-500/10",
    label: "text-bearish-500",
    dot: "bg-bearish-500",
    icon: "▼",
    bar: "bg-bearish-500",
  },
} as const;

export function AssetCard({
  asset,
  uiLang,
}: {
  asset: AssetAnalysis;
  uiLang: SupportedLanguageCode;
}) {
  const s = styles[asset.sentiment];
  const pct = Math.round(asset.confidence * 100);

  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-3 transition`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-base leading-none ${s.label}`}>{s.icon}</span>
            <span className="text-sm font-bold tracking-wide">{asset.symbol}</span>
          </div>
          <div className="text-xs text-slate-400 truncate">{asset.name}</div>
        </div>
        <div className="text-right">
          <div className={`text-[11px] uppercase font-bold ${s.label}`}>
            {t(asset.sentiment, uiLang)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {t("confidence", uiLang)} {pct}%
          </div>
        </div>
      </div>

      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-2">
        <div className={`h-full ${s.bar}`} style={{ width: `${pct}%` }} />
      </div>

      <p className="text-xs text-slate-200 leading-relaxed">{asset.rationale}</p>

      {asset.relevantQuote && (
        <blockquote className="mt-2 text-[11px] text-slate-400 italic border-l-2 border-slate-700 pl-2 line-clamp-3">
          “{asset.relevantQuote}”
        </blockquote>
      )}
    </div>
  );
}
