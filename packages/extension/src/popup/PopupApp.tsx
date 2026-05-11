import { useEffect, useState } from "react";
import { MSG, type ExtensionMessage } from "../lib/messages.js";
import { getSettings } from "../lib/storage.js";
import { t, uiLangFromOutput } from "../lib/i18n.js";
import type { ExtensionSettings } from "../lib/storage.js";
import { ApiError, fetchMe } from "../lib/apiClient.js";
import { onAuthChange } from "../lib/auth.js";
import { LirefinIcon } from "../lib/LirefinIcon.js";
import { LirefinWordmark } from "../lib/LirefinWordmark.js";

export function PopupApp() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  // Mirror the SidePanel's `me` fetch so the popup can show a balance chip
  // (when signed in) or a sign-in CTA (when anon). The popup window is short
  // lived so we don't bother caching this — it's a single API hit on open.
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
        } else {
          // Network failure — treat as unknown but allow CTA fallback.
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

  if (!settings) {
    return <div className="p-4 text-xs text-slate-400">…</div>;
  }

  const lang = uiLangFromOutput(settings.outputLanguage) as "tr" | "en";
  const hasPortfolio = settings.portfolio.length > 0;
  const canPick = authed === true && hasPortfolio;

  // Chrome MV3 quirk: `chrome.sidePanel.open()` must be called within the
  // same synchronous turn as the user gesture that triggered it. Crossing
  // an `await` (e.g. tabs.query) or a `sendMessage` round-trip loses the
  // gesture context and Chrome silently refuses. So both popup buttons now
  // call `chrome.sidePanel.open()` directly with `WINDOW_ID_CURRENT` — that
  // value (-2) is the *only* identifier we can use without first awaiting
  // a tab/window query. Then we kick the start-pick-mode message AFTER, so
  // even if the side panel hasn't fully opened yet, the content script
  // gets the signal.
  const openSidePanelNow = (): Promise<void> => {
    return chrome.sidePanel
      .open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
      .catch((err: unknown) => {
        console.warn("[Lirefin] popup -> sidePanel.open failed", err);
      });
  };

  const onPickText = () => {
    void openSidePanelNow().then(async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (typeof tab?.id === "number") {
        void chrome.runtime.sendMessage({
          type: MSG.START_PICK_MODE,
          tabId: tab.id,
        } satisfies ExtensionMessage);
      }
      window.close();
    });
  };

  const onOpenSidePanel = () => {
    void openSidePanelNow().then(() => window.close());
  };

  const onOpenOptions = () => {
    void chrome.runtime.openOptionsPage();
  };

  return (
    <div className="text-slate-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LirefinIcon className="w-9 h-9 rounded-lg shadow-sm shadow-brand-500/20" />
          <div>
            <div className="leading-tight">
              <LirefinWordmark size="md" />
            </div>
            <div className="text-[10px] text-slate-500">{t("poweredBy", lang)}</div>
          </div>
        </div>
        {authed === true && balance !== null && (
          <button
            onClick={onOpenOptions}
            title={t("balance", lang)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-bullish-500/15 text-bullish-500 hover:bg-bullish-500/25 transition"
          >
            {balance.toLocaleString()} {t("credits", lang)}
          </button>
        )}
      </div>

      {authed === false ? (
        <SignInPrompt lang={lang} onOpenOptions={onOpenOptions} />
      ) : (
        <div className="space-y-2">
          <button
            disabled={!canPick}
            onClick={onPickText}
            className="w-full text-sm font-bold px-3 py-2.5 rounded-lg bg-gradient-to-r from-brand-600 to-bullish-600 hover:from-brand-500 hover:to-bullish-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-brand-600/20 inline-flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
            {t("pickText", lang)}
          </button>
          <button
            onClick={onOpenSidePanel}
            className="w-full text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100"
          >
            {t("openSidePanel", lang)}
          </button>
          <button
            onClick={onOpenOptions}
            className="w-full text-xs font-semibold px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
          >
            {t("openOptions", lang)}
          </button>
          {!hasPortfolio && (
            <div className="mt-3 text-[11px] text-slate-500 leading-relaxed">
              {t("noPortfolio", lang)}{" "}
              <button
                onClick={onOpenOptions}
                className="text-brand-500 hover:text-brand-400 underline"
              >
                {t("noPortfolioCta", lang)}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-[10px] text-slate-600 leading-relaxed">
        {t("disclaimer", lang)}
      </div>
    </div>
  );
}

function SignInPrompt({
  lang,
  onOpenOptions,
}: {
  lang: "tr" | "en";
  onOpenOptions: () => void;
}) {
  return (
    <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-3 text-center">
      <div className="text-sm font-semibold mb-1">
        {t("signInRequiredTitle", lang)}
      </div>
      <div className="text-[11px] text-slate-400 mb-3 leading-relaxed">
        {t("signInRequiredBody", lang)}
      </div>
      <button
        onClick={onOpenOptions}
        className="w-full text-sm font-semibold px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white"
      >
        {t("signIn", lang)}
      </button>
    </div>
  );
}
