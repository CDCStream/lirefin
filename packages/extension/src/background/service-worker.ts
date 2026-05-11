import { initSentry } from "../lib/sentry.js";

initSentry("background");

import { ApiError, streamAnalyzeNews } from "../lib/apiClient.js";
import { MSG, type ExtensionMessage } from "../lib/messages.js";
import { getSettings, setLastAnalysis } from "../lib/storage.js";
import type { AnalyzeRequest } from "@fni/shared";

const CTX_MENU_SELECTION = "fni-analyze-selection";
const CTX_MENU_PICK = "fni-pick-mode";

function setupContextMenus() {
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: CTX_MENU_SELECTION,
        title: "Analyze selection with Lirefin",
        contexts: ["selection"],
      });
      chrome.contextMenus.create({
        id: CTX_MENU_PICK,
        title: "Pick text to analyze with Lirefin",
        contexts: ["page", "frame"],
      });
    });
  } catch (err) {
    console.warn("[Lirefin] contextMenus setup failed", err);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  } catch (err) {
    console.warn("[Lirefin] sidePanel API unavailable", err);
  }
  setupContextMenus();
  await getSettings();
});

chrome.runtime.onStartup.addListener(() => {
  setupContextMenus();
});

async function broadcastToSidePanel(message: ExtensionMessage) {
  try {
    await chrome.runtime.sendMessage(message);
  } catch {
    // No listeners (side panel closed)
  }
}

async function sendToTab(tabId: number, message: ExtensionMessage) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Content script not present on this tab (excluded URL, internal page, etc.)
  }
}

async function emitAnalysisEvent(
  tabId: number | null,
  message: ExtensionMessage,
) {
  await broadcastToSidePanel(message);
  if (typeof tabId === "number") {
    await sendToTab(tabId, message);
  }
}

async function openSidePanel(tabId: number) {
  // Chrome MV3 only honours `sidePanel.open()` when called within the user
  // gesture that triggered it. The gesture is preserved through ONE
  // sendMessage hop (Chrome 116+), but each `await` we sit on consumes more
  // of it. So we open FIRST (using the manifest's default_path) and only
  // tweak setOptions afterwards — by then we already have a side panel.
  try {
    await chrome.sidePanel.open({ tabId });
  } catch (err) {
    console.warn("[Lirefin] sidePanel.open failed", err);
  }

  try {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "src/sidepanel/index.html",
      enabled: true,
    });
  } catch (err) {
    // Non-fatal — manifest's default_path covers us.
    console.warn("[Lirefin] sidePanel.setOptions failed", err);
  }
}

async function startPickModeOnTab(tabId: number) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: MSG.START_PICK_MODE,
    } satisfies ExtensionMessage);
  } catch (err) {
    console.warn("[Lirefin] could not start pick mode", err);
    await broadcastToSidePanel({
      type: MSG.ANALYSIS_ERROR,
      error:
        "Cannot reach this page. Refresh the page and try again, or use right-click → 'Analyze selection with Lirefin'.",
      code: "NO_CONTENT_SCRIPT",
    });
  }
}

async function cancelPickModeOnTab(tabId: number) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: MSG.CANCEL_PICK_MODE,
    } satisfies ExtensionMessage);
  } catch {
    // ignored
  }
}

function squeezeSelection(text: string, max = 12000): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, Math.floor(max * 0.7))}\n\n[...]\n\n${cleaned.slice(-Math.floor(max * 0.25))}`;
}

async function analyzeSelection(
  tabId: number,
  selectionText: string,
  sourceTitle?: string,
  sourceUrl?: string,
) {
  void cancelPickModeOnTab(tabId);

  const settings = await getSettings();
  if (settings.portfolio.length === 0) {
    await emitAnalysisEvent(tabId, {
      type: MSG.ANALYSIS_ERROR,
      error: "Portfolio is empty. Add assets in Settings.",
      code: "NO_PORTFOLIO",
    });
    return;
  }

  const cleaned = squeezeSelection(selectionText);
  if (cleaned.length < 50) {
    await emitAnalysisEvent(tabId, {
      type: MSG.ANALYSIS_ERROR,
      error: "Please pick at least ~50 characters of article text.",
      code: "SELECTION_TOO_SHORT",
    });
    return;
  }

  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const url = sourceUrl ?? tab?.url ?? "https://unknown.local/";
  const title = (sourceTitle ?? tab?.title ?? "Selected text").slice(0, 300);

  await emitAnalysisEvent(tabId, {
    type: MSG.ANALYSIS_STARTED,
    title,
    url,
  });

  const payload: AnalyzeRequest = {
    url,
    title,
    articleText: cleaned,
    portfolio: settings.portfolio,
    outputLanguage: settings.outputLanguage,
  };

  // Streaming: surface progress events as they arrive so the side panel
  // can show a token counter / generating spinner. The terminal `final`
  // event carries the same payload as the legacy non-streaming endpoint.
  try {
    let estimate: number | undefined;
    for await (const ev of streamAnalyzeNews(settings.backendUrl, payload)) {
      if (ev.type === "started") {
        estimate = ev.estimate;
        await emitAnalysisEvent(tabId, {
          type: MSG.ANALYSIS_PROGRESS,
          stage: "connected",
          estimate,
        });
      } else if (ev.type === "progress") {
        await emitAnalysisEvent(tabId, {
          type: MSG.ANALYSIS_PROGRESS,
          stage: ev.stage,
          outputTokens: ev.outputTokens,
          estimate,
        });
      } else if (ev.type === "final") {
        await setLastAnalysis({
          result: ev.result,
          title,
          url,
          generatedAt: ev.result.generatedAt,
        });
        await emitAnalysisEvent(tabId, {
          type: MSG.ANALYSIS_RESULT,
          result: ev.result,
          title,
          url,
          balance: ev.result.balance,
          creditsCharged: ev.result.creditsCharged,
        });
      } else if (ev.type === "error") {
        await emitAnalysisEvent(tabId, {
          type: MSG.ANALYSIS_ERROR,
          error: ev.error,
          code: ev.code,
          retryAfter: ev.retryAfter,
          balance: ev.balance,
          estimate: ev.estimate,
        });
        return;
      }
    }
  } catch (err) {
    if (err instanceof ApiError) {
      await emitAnalysisEvent(tabId, {
        type: MSG.ANALYSIS_ERROR,
        error: err.message,
        code: err.code,
        retryAfter: err.retryAfter,
        balance: err.balance,
        estimate: err.estimate,
      });
    } else {
      const e = err as Error;
      console.error("[Lirefin] analyze error", e);
      await emitAnalysisEvent(tabId, {
        type: MSG.ANALYSIS_ERROR,
        error: e.message ?? "Unexpected error",
      });
    }
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (typeof tab?.id !== "number") return;
  if (info.menuItemId === CTX_MENU_SELECTION) {
    const selectionText = (info.selectionText ?? "").trim();
    await openSidePanel(tab.id);
    await analyzeSelection(tab.id, selectionText, tab.title ?? "", tab.url ?? "");
    return;
  }
  if (info.menuItemId === CTX_MENU_PICK) {
    await openSidePanel(tab.id);
    await startPickModeOnTab(tab.id);
    return;
  }
});

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (message.type === MSG.START_PICK_MODE) {
    void (async () => {
      let target = message.tabId ?? tabId;
      if (typeof target !== "number") {
        const [active] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        target = active?.id;
      }
      if (typeof target === "number") {
        await startPickModeOnTab(target);
      }
    })();
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === MSG.CANCEL_PICK_MODE) {
    void (async () => {
      let target = message.tabId ?? tabId;
      if (typeof target !== "number") {
        const [active] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        target = active?.id;
      }
      if (typeof target === "number") {
        await cancelPickModeOnTab(target);
      }
    })();
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === MSG.PICK_MODE_STARTED || message.type === MSG.PICK_MODE_CANCELLED) {
    void broadcastToSidePanel(message);
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === MSG.SELECTION_CAPTURED) {
    void broadcastToSidePanel(message);
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === MSG.REQUEST_ANALYSIS_SELECTION) {
    void (async () => {
      let target = message.tabId ?? tabId;
      if (typeof target !== "number") {
        const [active] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        target = active?.id;
      }
      if (typeof target === "number") {
        await analyzeSelection(target, message.selectionText);
      }
    })();
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === MSG.OPEN_SIDE_PANEL) {
    const target = message.tabId ?? tabId;
    if (typeof target === "number") {
      void openSidePanel(target);
    }
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === MSG.OPEN_OPTIONS_PAGE) {
    void chrome.runtime.openOptionsPage().catch((err) => {
      console.warn("[Lirefin] could not open options page", err);
    });
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (typeof tab.id !== "number") return;
  await openSidePanel(tab.id);
});
