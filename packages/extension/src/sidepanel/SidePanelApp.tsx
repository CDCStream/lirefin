import { useEffect, useMemo, useState } from "react";
import {
  estimateCredits,
  type AnalysisHistoryItem,
  type AnalyzeResponse,
  type SupportedLanguageCode,
} from "@fni/shared";
import { MSG, type ExtensionMessage } from "../lib/messages.js";
import { getLastAnalysis, getSettings } from "../lib/storage.js";
import { t, uiLangFromOutput } from "../lib/i18n.js";
import type { ExtensionSettings } from "../lib/storage.js";
import { AssetCard } from "./AssetCard.js";
import { ApiError, fetchAnalysisHistory, fetchMe } from "../lib/apiClient.js";
import { onAuthChange } from "../lib/auth.js";
import { LirefinIcon } from "../lib/LirefinIcon.js";
import { LirefinWordmark } from "../lib/LirefinWordmark.js";

type Phase =
  | { kind: "idle" }
  | { kind: "picking" }
  | {
      kind: "selected";
      selectionText: string;
      pageTitle: string;
      pageUrl: string;
    }
  | {
      kind: "loading";
      title?: string;
      stage?: "connecting" | "connected" | "generating";
      outputTokens?: number;
      estimate?: number;
    }
  | {
      kind: "result";
      result: AnalyzeResponse;
      title: string;
      url: string;
      balance?: number;
      creditsCharged?: number;
    }
  | {
      kind: "error";
      message: string;
      code?: string;
      retryAfter?: number;
      balance?: number;
    };

interface PersistedAnalysis {
  result: AnalyzeResponse;
  title: string;
  url: string;
}

export function SidePanelApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [authed, setAuthed] = useState<boolean>(false);
  // History overlay is layered on top of the current `phase` so we don't
  // lose the analysis the user was looking at when they tap the history icon.
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    void (async () => {
      const s = await getSettings();
      setSettings(s);
      const last = await getLastAnalysis<PersistedAnalysis>();
      if (last && last.result) {
        setPhase({
          kind: "result",
          result: last.result,
          title: last.title,
          url: last.url,
        });
      }
    })();
  }, []);

  // Track auth + balance.
  useEffect(() => {
    if (!settings) return;
    const refresh = async () => {
      try {
        const me = await fetchMe(settings.backendUrl);
        setAuthed(true);
        setBalance(me.balance);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setAuthed(false);
          setBalance(null);
        }
      }
    };
    void refresh();
    const off = onAuthChange((session) => {
      if (!session) {
        setAuthed(false);
        setBalance(null);
      } else {
        void refresh();
      }
    });
    return off;
  }, [settings]);

  useEffect(() => {
    const listener = (msg: ExtensionMessage) => {
      if (msg.type === MSG.PICK_MODE_STARTED) {
        setPhase({ kind: "picking" });
      } else if (msg.type === MSG.PICK_MODE_CANCELLED) {
        setPhase((p) => (p.kind === "picking" ? { kind: "idle" } : p));
      } else if (msg.type === MSG.SELECTION_CAPTURED) {
        setPhase({
          kind: "selected",
          selectionText: msg.selectionText,
          pageTitle: msg.pageTitle,
          pageUrl: msg.pageUrl,
        });
      } else if (msg.type === MSG.ANALYSIS_STARTED) {
        setPhase({ kind: "loading", title: msg.title, stage: "connecting" });
      } else if (msg.type === MSG.ANALYSIS_PROGRESS) {
        setPhase((p) =>
          p.kind === "loading"
            ? {
                ...p,
                stage: msg.stage,
                outputTokens: msg.outputTokens ?? p.outputTokens,
                estimate: msg.estimate ?? p.estimate,
              }
            : p,
        );
      } else if (msg.type === MSG.ANALYSIS_RESULT) {
        setPhase({
          kind: "result",
          result: msg.result,
          title: msg.title,
          url: msg.url,
          balance: msg.balance,
          creditsCharged: msg.creditsCharged,
        });
        if (typeof msg.balance === "number") setBalance(msg.balance);
      } else if (msg.type === MSG.ANALYSIS_ERROR) {
        setPhase({
          kind: "error",
          message: msg.error,
          code: msg.code,
          retryAfter: msg.retryAfter,
          balance: msg.balance,
        });
        if (typeof msg.balance === "number") setBalance(msg.balance);
      }
      return false;
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const uiLang = useMemo<SupportedLanguageCode>(
    () => (settings ? uiLangFromOutput(settings.outputLanguage) : "en"),
    [settings],
  );
  const lang = uiLang;

  const startPickMode = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (typeof tab?.id !== "number") return;
    setPhase({ kind: "picking" });
    void chrome.runtime.sendMessage({
      type: MSG.START_PICK_MODE,
      tabId: tab.id,
    } satisfies ExtensionMessage);
  };

  const cancelPickMode = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (typeof tab?.id !== "number") return;
    setPhase({ kind: "idle" });
    void chrome.runtime.sendMessage({
      type: MSG.CANCEL_PICK_MODE,
      tabId: tab.id,
    } satisfies ExtensionMessage);
  };

  const analyzeSelection = (text: string) => {
    void chrome.runtime.sendMessage({
      type: MSG.REQUEST_ANALYSIS_SELECTION,
      selectionText: text,
    } satisfies ExtensionMessage);
  };

  const openOptions = () => {
    void chrome.runtime.openOptionsPage();
  };

  if (!settings) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        lang={lang}
        onSettings={openOptions}
        canPick={phase.kind === "result" || phase.kind === "idle" || phase.kind === "error"}
        onPick={startPickMode}
        balance={balance}
        authed={authed}
        onToggleHistory={authed ? () => setShowHistory((v) => !v) : undefined}
        historyActive={showHistory}
      />

      {showHistory && authed ? (
        <HistoryView
          lang={lang}
          backendUrl={settings.backendUrl}
          onClose={() => setShowHistory(false)}
          onPickNew={() => {
            setShowHistory(false);
            void startPickMode();
          }}
        />
      ) : !authed ? (
        <SignedOutPanel lang={lang} onSignIn={openOptions} />
      ) : settings.portfolio.length === 0 ? (
        <EmptyPortfolio lang={lang} onSettings={openOptions} />
      ) : phase.kind === "idle" ? (
        <IdleState lang={lang} onPick={startPickMode} />
      ) : phase.kind === "picking" ? (
        <PickingState lang={lang} onCancel={cancelPickMode} />
      ) : phase.kind === "selected" ? (
        <SelectedState
          lang={lang}
          phase={phase}
          balance={balance}
          portfolioSize={settings.portfolio.length}
          onAnalyze={() => analyzeSelection(phase.selectionText)}
          onPickAgain={startPickMode}
          onBuyCredits={openOptions}
        />
      ) : phase.kind === "loading" ? (
        <Loading
          lang={lang}
          title={phase.title}
          stage={phase.stage}
          outputTokens={phase.outputTokens}
          estimate={phase.estimate}
        />
      ) : phase.kind === "error" ? (
        <ErrorState
          lang={lang}
          message={phase.message}
          code={phase.code}
          retryAfter={phase.retryAfter}
          balance={phase.balance}
          onRetry={startPickMode}
          onSettings={openOptions}
        />
      ) : (
        <Result lang={lang} phase={phase} onPickAgain={startPickMode} />
      )}

      <Footer lang={lang} />
    </div>
  );
}

function Header({
  lang,
  onSettings,
  canPick,
  onPick,
  balance,
  authed,
  onToggleHistory,
  historyActive,
}: {
  lang: SupportedLanguageCode;
  onSettings: () => void;
  canPick: boolean;
  onPick: () => void;
  balance: number | null;
  authed: boolean;
  onToggleHistory: (() => void) | undefined;
  historyActive: boolean;
}) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-slate-950/85 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <LirefinIcon className="w-7 h-7 rounded-lg shadow-sm shadow-brand-500/20" />
        <div>
          <div className="leading-tight">
            <LirefinWordmark size="sm" />
          </div>
          <div className="text-[10px] text-slate-400">{t("poweredBy", lang)}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {authed ? (
          <button
            onClick={onSettings}
            title={t("balance", lang)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-bullish-500/15 text-bullish-500 hover:bg-bullish-500/25 transition"
          >
            {balance !== null ? `${balance.toLocaleString()} ${t("credits", lang)}` : "…"}
          </button>
        ) : (
          <button
            onClick={onSettings}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-brand-600 text-white hover:bg-brand-500 transition"
          >
            {t("signIn", lang)}
          </button>
        )}
        {canPick && !historyActive && (
          <button
            onClick={onPick}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
            {t("pickText", lang)}
          </button>
        )}
        {onToggleHistory && (
          <button
            onClick={onToggleHistory}
            aria-label={t("history", lang)}
            title={t("history", lang)}
            className={`p-1.5 rounded-lg transition ${
              historyActive
                ? "bg-brand-600 text-white hover:bg-brand-500"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12,7 12,12 15.5,14" />
            </svg>
          </button>
        )}
        <button
          onClick={onSettings}
          aria-label={t("openOptions", lang)}
          className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  );
}

function SignedOutPanel({
  lang,
  onSignIn,
}: {
  lang: SupportedLanguageCode;
  onSignIn: () => void;
}) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
        <LirefinIcon className="w-8 h-8 rounded-lg" />
      </div>
      <div className="text-base font-semibold mb-2">
        {t("signInRequiredTitle", lang)}
      </div>
      <div className="text-xs text-slate-400 mb-5 max-w-xs mx-auto leading-relaxed">
        {t("signInRequiredBody", lang)}
      </div>
      <button
        onClick={onSignIn}
        className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30"
      >
        {t("signIn", lang)}
      </button>
    </div>
  );
}

function EmptyPortfolio({
  lang,
  onSettings,
}: {
  lang: SupportedLanguageCode;
  onSettings: () => void;
}) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="text-4xl mb-3">📊</div>
      <div className="text-base font-semibold mb-1">
        {t("emptyPortfolioTitle", lang)}
      </div>
      <div className="text-xs text-slate-400 mb-5 max-w-xs mx-auto">
        {t("emptyPortfolioBody", lang)}
      </div>
      <button
        onClick={onSettings}
        className="text-sm font-semibold px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white"
      >
        {t("noPortfolioCta", lang)}
      </button>
    </div>
  );
}

function IdleState({ lang, onPick }: { lang: SupportedLanguageCode; onPick: () => void }) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="text-5xl mb-4">✨</div>
      <div className="text-base font-semibold mb-2">
        {t("howToTitle", lang)}
      </div>
      <div className="text-xs text-slate-400 mb-6 max-w-xs mx-auto leading-relaxed">
        {t("howToBody", lang)}
      </div>
      <button
        onClick={onPick}
        className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
        {t("pickText", lang)}
      </button>
    </div>
  );
}

function PickingState({
  lang,
  onCancel,
}: {
  lang: SupportedLanguageCode;
  onCancel: () => void;
}) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="text-4xl mb-3">🖱️</div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 mb-3">
        <span className="inline-block w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
        <span className="text-xs font-semibold text-yellow-300">
          {t("pickModeActive", lang)}
        </span>
      </div>
      <div className="text-sm text-slate-200 mb-2">{t("pickInstruction", lang)}</div>
      <div className="text-xs text-slate-500 mb-5 max-w-xs mx-auto">
        {t("pickInstructionDetail", lang)}
      </div>
      <button
        onClick={onCancel}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
      >
        {t("cancel", lang)}
      </button>
    </div>
  );
}

function SelectedState({
  lang,
  phase,
  balance,
  portfolioSize,
  onAnalyze,
  onPickAgain,
  onBuyCredits,
}: {
  lang: SupportedLanguageCode;
  phase: { selectionText: string; pageTitle: string; pageUrl: string };
  balance: number | null;
  portfolioSize: number;
  onAnalyze: () => void;
  onPickAgain: () => void;
  onBuyCredits: () => void;
}) {
  const wordCount = phase.selectionText.split(/\s+/).filter(Boolean).length;
  // Pre-flight estimate is computed locally — same formula the backend uses
  // (`estimateCredits` is exported from @fni/shared) so the badge updates
  // instantly as the user re-picks. The backend re-runs the math before
  // charging, so a UI mismatch can never cause an unauthorised debit.
  const estimate = useMemo(
    () => estimateCredits(wordCount, portfolioSize),
    [wordCount, portfolioSize],
  );
  const tooShort = phase.selectionText.length < 50;
  const insufficient = balance !== null && balance < estimate;
  const canAnalyze = !tooShort && !insufficient;

  return (
    <main className="px-4 py-4 space-y-3">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider mb-1">
          {phase.pageUrl ? new URL(phase.pageUrl).hostname : ""}
        </div>
        <div className="text-xs text-slate-400 line-clamp-2 mb-2">
          {phase.pageTitle}
        </div>
      </div>

      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-300" />
            <span className="text-[10px] uppercase font-semibold text-yellow-300 tracking-wider">
              {t("yourSelection", lang)}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            {wordCount} {t("words", lang)} · {phase.selectionText.length} {t("chars", lang)}
          </span>
        </div>
        <div className="text-xs text-slate-200 leading-relaxed line-clamp-6">
          {phase.selectionText}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span className="uppercase tracking-wider font-semibold">
            {t("estimatedCost", lang)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`font-bold ${
              insufficient ? "text-bearish-500" : "text-slate-100"
            }`}
          >
            ≈ {estimate} {t("credits", lang)}
          </span>
          {balance !== null && (
            <span className="text-slate-500">
              · {t("balance", lang).toLowerCase()} {balance.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {insufficient && (
        <div className="rounded-xl border border-bearish-500/30 bg-bearish-500/5 px-3 py-2 text-[11px] text-bearish-400 flex items-center justify-between gap-2">
          <span>{t("insufficientCreditsBody", lang)}</span>
          <button
            onClick={onBuyCredits}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-brand-600 hover:bg-brand-500 text-white whitespace-nowrap"
          >
            {t("buyCredits", lang)}
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className="flex-1 text-sm font-bold px-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-600 to-bullish-600 hover:from-brand-500 hover:to-bullish-500 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white shadow-lg shadow-brand-600/30 inline-flex items-center justify-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          {t("analyze", lang)}
        </button>
        <button
          onClick={onPickAgain}
          className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
        >
          {t("pickAgain", lang)}
        </button>
      </div>
    </main>
  );
}

function Loading({
  lang,
  title,
  stage,
  outputTokens,
  estimate,
}: {
  lang: SupportedLanguageCode;
  title?: string;
  stage?: "connecting" | "connected" | "generating";
  outputTokens?: number;
  estimate?: number;
}) {
  // Output tokens give us a rough completion percentage. Claude Sonnet
  // typically emits 50 + assets*150 output tokens for our tool_use, capped
  // at our 2048 max_tokens. We use that ceiling to render a determinate
  // progress bar once tokens start flowing.
  const MAX_TOKENS = 2048;
  const pct = outputTokens
    ? Math.min(95, Math.round((outputTokens / MAX_TOKENS) * 100))
    : null;

  const stageLabel =
    stage === "connecting"
      ? t("stageConnecting", lang)
      : stage === "connected"
        ? t("stageConnected", lang)
        : stage === "generating"
          ? t("stageGenerating", lang)
          : t("loading", lang);

  return (
    <div className="px-6 py-10 text-center">
      <div className="inline-block w-8 h-8 border-2 border-brand-500/40 border-t-brand-500 rounded-full animate-spin mb-3" />
      <div className="text-sm text-slate-300">{stageLabel}</div>
      {title && (
        <div className="text-xs text-slate-500 mt-2 line-clamp-2 max-w-xs mx-auto">
          {title}
        </div>
      )}
      {pct !== null && (
        <div className="mt-4 max-w-xs mx-auto">
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-bullish-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center justify-center gap-2">
            <span>
              {outputTokens?.toLocaleString()} {t("tokens", lang)}
            </span>
            {typeof estimate === "number" && (
              <span className="text-slate-600">
                · ≈ {estimate} {t("credits", lang)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorState({
  lang,
  message,
  code,
  retryAfter,
  balance,
  onRetry,
  onSettings,
}: {
  lang: SupportedLanguageCode;
  message: string;
  code?: string;
  retryAfter?: number;
  balance?: number;
  onRetry: () => void;
  onSettings: () => void;
}) {
  const isRateLimited = code?.startsWith("RATE_LIMITED");
  const isInsufficient = code === "INSUFFICIENT_CREDITS";
  const isUnauth = code === "UNAUTHENTICATED";
  return (
    <div className="px-6 py-10 text-center">
      <div className="text-4xl mb-3">{isInsufficient ? "💳" : isUnauth ? "🔑" : "⚠️"}</div>
      <div className="text-sm font-semibold text-bearish-500 mb-1">
        {isRateLimited
          ? t("rateLimited", lang)
          : isInsufficient
            ? t("insufficientCredits", lang)
            : isUnauth
              ? t("signInRequiredTitle", lang)
              : t("errorGeneric", lang)}
      </div>
      <div className="text-xs text-slate-400 mb-3 max-w-xs mx-auto">
        {isInsufficient
          ? `${t("insufficientCreditsBody", lang)}${typeof balance === "number" ? ` (${balance.toLocaleString()} ${t("credits", lang)})` : ""}`
          : message}
      </div>
      {retryAfter && (
        <div className="text-[11px] text-slate-500 mb-3">
          Retry in {Math.ceil(retryAfter / 60)} min
        </div>
      )}
      <div className="flex items-center justify-center gap-2">
        {(isInsufficient || isUnauth) && (
          <button
            onClick={onSettings}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white"
          >
            {isInsufficient ? t("buyCredits", lang) : t("signIn", lang)}
          </button>
        )}
        <button
          onClick={onRetry}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100"
        >
          {t("retry", lang)}
        </button>
      </div>
    </div>
  );
}

function Result({
  lang,
  phase,
  onPickAgain,
}: {
  lang: SupportedLanguageCode;
  phase: {
    kind: "result";
    result: AnalyzeResponse;
    title: string;
    url: string;
    balance?: number;
    creditsCharged?: number;
  };
  onPickAgain: () => void;
}) {
  const r = phase.result;
  return (
    <main className="px-4 py-4 space-y-4">
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
          {phase.url ? new URL(phase.url).hostname : ""}
        </div>
        <div className="text-sm font-semibold leading-snug line-clamp-3">
          {phase.title}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
            {t("detectedLanguage", lang)} · {r.detectedLanguage}
          </span>
          {r.cached && (
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              {t("cached", lang)}
            </span>
          )}
          {typeof phase.creditsCharged === "number" && phase.creditsCharged > 0 && (
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-bearish-500/10 text-bearish-400">
              −{phase.creditsCharged} {t("credits", lang)}
            </span>
          )}
          {typeof phase.balance === "number" && (
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-bullish-500/10 text-bullish-500">
              {phase.balance.toLocaleString()} {t("credits", lang)}
            </span>
          )}
        </div>
      </section>

      <section>
        <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">
          {t("marketSummary", lang)}
        </div>
        <div className="text-sm text-slate-200 leading-relaxed">
          {r.marketSummary}
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-slate-500">
          {t("portfolio", lang)} · {r.assets.length}
        </div>
        {r.assets.map((a) => (
          <AssetCard key={`${a.symbol}-${a.name}`} asset={a} uiLang={lang} />
        ))}
      </section>

      <button
        onClick={onPickAgain}
        className="w-full text-xs font-semibold px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center justify-center gap-1.5"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
        {t("pickAgain", lang)}
      </button>

      <section className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-800 pt-3">
        {t("disclaimer", lang)}
      </section>
    </main>
  );
}

function Footer({ lang }: { lang: SupportedLanguageCode }) {
  return (
    <footer className="px-4 py-3 text-center text-[10px] text-slate-600 border-t border-slate-900">
      {t("disclaimer", lang)}
    </footer>
  );
}

function HistoryView({
  lang,
  backendUrl,
  onClose,
  onPickNew,
}: {
  lang: SupportedLanguageCode;
  backendUrl: string;
  onClose: () => void;
  onPickNew: () => void;
}) {
  const [items, setItems] = useState<AnalysisHistoryItem[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchAnalysisHistory(backendUrl, undefined, 20);
        if (cancelled) return;
        setItems(res.items);
        setHasMore(res.hasMore);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backendUrl]);

  const onLoadMore = async () => {
    if (!items || items.length === 0) return;
    setLoadingMore(true);
    try {
      const lastCreatedAt = items[items.length - 1]!.createdAt;
      const res = await fetchAnalysisHistory(backendUrl, lastCreatedAt, 20);
      setItems((prev) => (prev ?? []).concat(res.items));
      setHasMore(res.hasMore);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  const fmt = new Intl.DateTimeFormat(lang, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-[11px] font-semibold text-slate-400 hover:text-slate-100 inline-flex items-center gap-1.5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          {t("back", lang)}
        </button>
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
          {t("history", lang)}
        </div>
      </div>

      {error && (
        <div className="text-xs text-bearish-500 px-3 py-2 rounded-lg bg-bearish-500/10 border border-bearish-500/30">
          {error}
        </div>
      )}

      {!items && !error && (
        <div className="text-center text-xs text-slate-500 py-8">…</div>
      )}

      {items && items.length === 0 && (
        <div className="text-center px-4 py-10">
          <div className="text-3xl mb-3">🗂️</div>
          <div className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            {t("historyEmpty", lang)}
          </div>
          <button
            onClick={onPickNew}
            className="mt-5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white"
          >
            {t("pickNew", lang)}
          </button>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="rounded-xl border border-slate-800 divide-y divide-slate-800 bg-slate-900/40">
          {items.map((it) => (
            <li
              key={it.id}
              className="px-3 py-2.5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-xs text-slate-200">
                  {it.assetCount} {t("portfolio", lang).toLowerCase()} ·{" "}
                  {it.wordCount} {t("words", lang)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <span>{fmt.format(new Date(it.createdAt))}</span>
                  {it.cached && (
                    <span className="text-[9px] uppercase font-semibold px-1 py-0.5 rounded bg-slate-800 text-slate-400">
                      {t("cached", lang)}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`text-sm font-bold whitespace-nowrap ${
                  it.creditsCharged > 0 ? "text-bearish-400" : "text-slate-500"
                }`}
              >
                {it.creditsCharged > 0
                  ? `−${it.creditsCharged.toLocaleString()}`
                  : "—"}
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore && items && items.length > 0 && (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          className="w-full text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200"
        >
          {loadingMore ? "…" : t("loadMore", lang)}
        </button>
      )}
    </main>
  );
}
