import type {
  AnalyzeResponse,
  Asset,
  AssetAnalysis,
  Sentiment,
  SupportedLanguageCode,
} from "@fni/shared";
import { estimateCredits } from "@fni/shared";
import { MSG, type ExtensionMessage } from "../lib/messages.js";
import { t, type TranslationKey, uiLangFromOutput } from "../lib/i18n.js";

const STYLE_ID = "fni-pick-mode-style";
const BANNER_ID = "fni-pick-mode-banner";
const FAB_HOST_ID = "fni-fab-host";
const FAB_MIN_CHARS = 50;
const SETTINGS_STORAGE_KEY = "fni_settings_v1";
const SESSION_DISMISS_KEY = "fni_fab_dismissed";
const FAB_PREFS_STORAGE_KEY = "fni_fab_prefs_v1";

interface FabPrefs {
  globalDisabled: boolean;
  disabledHosts: string[];
}

let fabPrefs: FabPrefs = { globalDisabled: false, disabledHosts: [] };

// Lirefin brand mark — uses the bundled `icons/icon-128.png` (the AI master
// from `assets/lirefin-logo-v2.png`) so the FAB is visually identical to the
// Chrome toolbar icon and the React surfaces. Loading via
// `chrome.runtime.getURL` works inside the FAB's shadow DOM because the
// icons are listed under `web_accessible_resources` in the manifest.
const LIREFIN_ICON_URL = chrome.runtime.getURL("icons/icon-128.png");
const LIREFIN_ICON_IMG = `<img src="${LIREFIN_ICON_URL}" alt="" draggable="false" />`;

type FabState =
  | { kind: "idle" }
  | {
      kind: "confirm";
      selectionText: string;
      wordCount: number;
      estimate: number;
    }
  | { kind: "loading"; title?: string }
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
      balance?: number;
    };

interface FabRefs {
  host: HTMLDivElement;
  shadow: ShadowRoot;
  wrap: HTMLDivElement;
  pillShell: HTMLDivElement;
  pillBtn: HTMLButtonElement;
  pillLabel: HTMLSpanElement;
  hintEl: HTMLDivElement;
  panel: HTMLDivElement;
  dismissBtn: HTMLButtonElement;
  dismissMenu: HTMLDivElement;
}

let pickModeActive = false;
let fabRefs: FabRefs | null = null;
let fabDismissed = false;
let fabState: FabState = { kind: "idle" };
let currentLang: SupportedLanguageCode = "en";
let currentPortfolioSize = 0;
let selectionDebounce: number | null = null;

function tr(key: TranslationKey): string {
  return t(key, currentLang);
}

function notifyServiceWorker(message: ExtensionMessage): void {
  try {
    chrome.runtime.sendMessage(message).catch(() => {});
  } catch {
    // ignored
  }
}

function getCurrentSelectionText(): string {
  const sel = window.getSelection();
  if (!sel) return "";
  return (sel.toString() || "").trim();
}

function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function injectPickModeStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html.fni-pick-mode * ::selection,
    html.fni-pick-mode ::selection {
      background: #fde047 !important;
      color: #111827 !important;
    }
    html.fni-pick-mode * ::-moz-selection,
    html.fni-pick-mode ::-moz-selection {
      background: #fde047 !important;
      color: #111827 !important;
    }
    html.fni-pick-mode body { cursor: text; }
  `;
  document.head.appendChild(style);
}

function removePickModeStyle(): void {
  document.getElementById(STYLE_ID)?.remove();
}

function showBanner(message: string): void {
  let banner = document.getElementById(BANNER_ID);
  if (!banner) {
    banner = document.createElement("div");
    banner.id = BANNER_ID;
    banner.style.cssText = [
      "position: fixed",
      "top: 16px",
      "left: 50%",
      "transform: translateX(-50%)",
      "z-index: 2147483640",
      "padding: 10px 16px",
      "background: rgba(15,23,42,0.95)",
      "color: white",
      "font-family: system-ui, -apple-system, sans-serif",
      "font-size: 13px",
      "font-weight: 600",
      "border-radius: 999px",
      "box-shadow: 0 8px 24px rgba(0,0,0,0.35)",
      "border: 1px solid rgba(59,130,246,0.4)",
      "pointer-events: none",
      "user-select: none",
    ].join(";");
    document.documentElement.appendChild(banner);
  }
  banner.innerHTML = `
    <span style="display:inline-flex;align-items:center;gap:8px;">
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#fde047;"></span>
      ${message}
    </span>
  `;
}

function removeBanner(): void {
  document.getElementById(BANNER_ID)?.remove();
}

function onPickModeMouseUp(): void {
  if (!pickModeActive) return;
  setTimeout(() => {
    if (!pickModeActive) return;
    const text = getCurrentSelectionText();
    if (text.length < FAB_MIN_CHARS) return;
    notifyServiceWorker({
      type: MSG.SELECTION_CAPTURED,
      selectionText: text,
      pageTitle: document.title || "",
      pageUrl: location.href,
    });
  }, 50);
}

function onPickModeKeyDown(e: KeyboardEvent): void {
  if (!pickModeActive) return;
  if (e.key === "Escape") {
    exitPickMode();
    notifyServiceWorker({ type: MSG.PICK_MODE_CANCELLED });
  }
}

function enterPickMode(): void {
  if (pickModeActive) return;
  pickModeActive = true;
  injectPickModeStyle();
  document.documentElement.classList.add("fni-pick-mode");
  showBanner("Drag-select article text \u00b7 ESC to cancel");
  document.addEventListener("mouseup", onPickModeMouseUp, true);
  document.addEventListener("keydown", onPickModeKeyDown, true);
  notifyServiceWorker({ type: MSG.PICK_MODE_STARTED });
  renderFab();
}

function exitPickMode(): void {
  pickModeActive = false;
  document.documentElement.classList.remove("fni-pick-mode");
  removePickModeStyle();
  removeBanner();
  document.removeEventListener("mouseup", onPickModeMouseUp, true);
  document.removeEventListener("keydown", onPickModeKeyDown, true);
  renderFab();
}

function fabStyles(): string {
  return `
    :host { all: initial; }
    .wrap {
      position: relative;
      display: inline-flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      pointer-events: auto;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #e2e8f0;
    }
    .hint {
      position: absolute;
      right: calc(100% + 10px);
      top: 50%;
      padding: 7px 11px;
      border-radius: 8px;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 8px 20px rgba(0,0,0,0.4);
      border: 1px solid #1e293b;
      pointer-events: none;
      opacity: 0;
      transform: translate(8px, -50%);
      transition: opacity 160ms ease, transform 160ms ease;
      font-family: inherit;
    }
    .wrap:hover .hint {
      opacity: 1;
      transform: translate(0, -50%);
    }
    .wrap.has-selection .hint,
    .wrap.has-panel .hint,
    .wrap.is-loading .hint {
      display: none;
    }
    .pill-shell {
      position: relative;
      display: inline-flex;
    }
    .wrap.has-panel .pill-shell { display: none; }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 10px 14px 10px 11px;
      border-radius: 999px;
      border: 1px solid rgba(59, 130, 246, 0.55);
      background: linear-gradient(135deg, #3b82f6, #10b981);
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.2);
      user-select: none;
      transition: transform 180ms ease, box-shadow 180ms ease;
      text-transform: none;
      letter-spacing: 0;
      white-space: nowrap;
      outline: none;
      margin: 0;
      box-sizing: border-box;
      font-family: inherit;
    }
    .dismiss-btn {
      position: absolute;
      top: -7px;
      right: -7px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1.5px solid #0b1220;
      background: #1e293b;
      color: #cbd5e1;
      cursor: pointer;
      display: grid;
      place-items: center;
      font-size: 11px;
      font-weight: 800;
      line-height: 1;
      padding: 0;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
      opacity: 0;
      transform: scale(0.8);
      transition: opacity 160ms ease, transform 160ms ease, background 160ms ease;
      font-family: inherit;
    }
    .pill-shell:hover .dismiss-btn,
    .dismiss-btn:focus,
    .dismiss-btn[aria-expanded="true"] {
      opacity: 1;
      transform: scale(1);
    }
    .dismiss-btn:hover {
      background: #ef4444;
      color: #ffffff;
      border-color: #0b1220;
    }
    .dismiss-menu {
      position: absolute;
      bottom: calc(100% + 12px);
      right: 0;
      width: 240px;
      background: #0b1220;
      border: 1px solid #1e293b;
      border-radius: 12px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.35);
      padding: 8px;
      display: none;
      flex-direction: column;
      gap: 2px;
      box-sizing: border-box;
      font-family: inherit;
    }
    .dismiss-menu.open { display: flex; }
    .dismiss-menu .menu-title {
      padding: 6px 8px 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .dismiss-menu button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 8px;
      border: 0;
      background: transparent;
      color: #e2e8f0;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
      width: 100%;
    }
    .dismiss-menu button:hover { background: #1e293b; }
    .dismiss-menu button.danger { color: #f87171; }
    .dismiss-menu button.danger:hover { background: rgba(239, 68, 68, 0.12); }
    .dismiss-menu button.muted { color: #94a3b8; font-weight: 500; }
    .dismiss-menu .menu-host {
      color: #60a5fa;
      font-weight: 700;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      direction: rtl;
      text-align: left;
    }
    .dismiss-menu .menu-foot {
      margin-top: 4px;
      padding: 6px 8px 2px;
      border-top: 1px solid #1e293b;
      font-size: 10px;
      color: #64748b;
      line-height: 1.4;
    }
    .pill:hover { transform: translateY(-1px); box-shadow: 0 14px 32px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.2); }
    .wrap:not(.has-selection):not(.has-panel) .pill:hover { transform: translateY(-1px) scale(1.08); }
    .pill:active { transform: translateY(0) scale(1); }
    .pill[disabled] { cursor: default; opacity: 0.95; }
    .pill .icon {
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: 7px;
      background: #ffffff;
      overflow: hidden;
      font-size: 13px;
      line-height: 1;
      font-weight: 900;
      box-shadow: 0 1px 2px rgba(0,0,0,0.18);
    }
    .pill .icon img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }
    .pill .pill-label { display: none; }
    .wrap.has-selection .pill .pill-label,
    .wrap.is-loading .pill .pill-label {
      display: inline;
    }
    .wrap.has-selection .pill {
      animation: fniPulse 2.4s ease-in-out infinite;
    }
    @keyframes fniPulse {
      0%, 100% { box-shadow: 0 10px 28px rgba(0,0,0,0.35), 0 0 0 0 rgba(59,130,246,0.45); }
      50%      { box-shadow: 0 10px 28px rgba(0,0,0,0.35), 0 0 0 12px rgba(59,130,246,0); }
    }
    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.35);
      border-top-color: #ffffff;
      animation: fniSpin 700ms linear infinite;
    }
    @keyframes fniSpin { to { transform: rotate(360deg); } }
    .panel {
      width: min(380px, calc(100vw - 48px));
      max-height: min(560px, calc(100vh - 80px));
      display: none;
      flex-direction: column;
      background: #0b1220;
      border: 1px solid #1e293b;
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.35);
      overflow: hidden;
      box-sizing: border-box;
    }
    .wrap.has-panel .panel { display: flex; }
    .wrap.has-panel .pill { display: none; }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 12px 12px 10px 14px;
      border-bottom: 1px solid #1e293b;
      background: linear-gradient(135deg, rgba(59,130,246,0.12), rgba(16,185,129,0.10));
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: #f1f5f9;
      font-family: "Inter Variable","Inter",system-ui,-apple-system,"Segoe UI","Helvetica Neue",sans-serif;
    }
    .brand-text-lire { color: #60a5fa; }
    .brand-text-fin  { color: #f87171; }
    .brand-icon {
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: 7px;
      background: #ffffff;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,0.18);
    }
    .brand-icon img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }
    .panel-actions { display: inline-flex; gap: 4px; align-items: center; }
    .icon-btn {
      width: 26px;
      height: 26px;
      border-radius: 7px;
      border: 1px solid transparent;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      display: grid;
      place-items: center;
      font-size: 14px;
      font-weight: 700;
      padding: 0;
      font-family: inherit;
      line-height: 1;
    }
    .icon-btn:hover { background: #1e293b; color: #f1f5f9; }
    .panel-body {
      padding: 14px;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scrollbar-width: thin;
      scrollbar-color: #334155 transparent;
    }
    .panel-body::-webkit-scrollbar { width: 6px; }
    .panel-body::-webkit-scrollbar-thumb { background: #334155; border-radius: 999px; }
    .loading-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 2px;
      color: #cbd5e1;
      font-size: 13px;
    }
    .loading-row .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(148,163,184,0.3);
      border-top-color: #60a5fa;
    }
    .meta {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      font-weight: 700;
    }
    .title {
      font-size: 13px;
      font-weight: 600;
      color: #e2e8f0;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 6px;
      background: #1e293b;
      color: #cbd5e1;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .summary {
      font-size: 13px;
      line-height: 1.55;
      color: #e2e8f0;
      white-space: pre-wrap;
    }
    .asset {
      border: 1px solid;
      border-radius: 12px;
      padding: 10px 11px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .asset.bullish { border-color: rgba(16,185,129,0.4); background: rgba(16,185,129,0.08); }
    .asset.neutral { border-color: rgba(148,163,184,0.3); background: rgba(148,163,184,0.06); }
    .asset.bearish { border-color: rgba(239,68,68,0.4);  background: rgba(239,68,68,0.08); }
    .asset-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .asset-symbol {
      font-size: 13px;
      font-weight: 800;
      color: #f1f5f9;
      letter-spacing: 0.02em;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .sentiment-icon { font-size: 14px; line-height: 1; }
    .asset-name {
      font-size: 11px;
      color: #94a3b8;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sentiment-pill {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .conf {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 2px;
      text-align: right;
    }
    .bar {
      height: 4px;
      background: #1e293b;
      border-radius: 999px;
      overflow: hidden;
    }
    .bar > span { display: block; height: 100%; }
    .bar.bullish > span { background: #10b981; }
    .bar.neutral > span { background: #94a3b8; }
    .bar.bearish > span { background: #ef4444; }
    .rationale {
      font-size: 12px;
      color: #e2e8f0;
      line-height: 1.55;
    }
    .quote {
      font-size: 11px;
      color: #94a3b8;
      font-style: italic;
      border-left: 2px solid #334155;
      padding-left: 8px;
      margin-top: 4px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .panel-footer {
      padding: 10px 12px;
      border-top: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      background: #0a0f1c;
    }
    .text-btn {
      background: transparent;
      border: 0;
      color: #60a5fa;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      font-family: inherit;
    }
    .text-btn:hover { background: #111827; color: #93c5fd; }
    .text-btn.danger { color: #f87171; }
    .text-btn.danger:hover { color: #fca5a5; }
    .confirm-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(59,130,246,0.08);
      border: 1px solid rgba(59,130,246,0.25);
    }
    .confirm-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .confirm-value {
      font-size: 15px;
      font-weight: 800;
      color: #f1f5f9;
      font-variant-numeric: tabular-nums;
    }
    .err-title {
      font-size: 13px;
      font-weight: 700;
      color: #f87171;
    }
    .err-body {
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .err-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #3b82f6, #10b981);
      color: white;
      border: 0;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    }
    .pill-btn.ghost {
      background: #1e293b;
      color: #e2e8f0;
    }
  `;
}

function createFab(): FabRefs {
  if (fabRefs) return fabRefs;

  const host = document.createElement("div");
  host.id = FAB_HOST_ID;
  const hostStyles: Record<string, string> = {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    "z-index": "2147483647",
    margin: "0",
    padding: "0",
    border: "0",
    width: "auto",
    height: "auto",
    "pointer-events": "none",
    background: "transparent",
    transform: "none",
    inset: "auto 24px 24px auto",
  };
  for (const [k, v] of Object.entries(hostStyles)) {
    host.style.setProperty(k, v, "important");
  }

  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = fabStyles();
  shadow.appendChild(style);

  const wrap = document.createElement("div");
  wrap.className = "wrap";

  const pillShell = document.createElement("div");
  pillShell.className = "pill-shell";

  const pillBtn = document.createElement("button");
  pillBtn.type = "button";
  pillBtn.className = "pill";
  pillBtn.setAttribute("aria-label", tr("analyzeShort"));

  const pillIcon = document.createElement("span");
  pillIcon.className = "icon";
  pillIcon.innerHTML = LIREFIN_ICON_IMG;

  const pillLabel = document.createElement("span");
  pillLabel.className = "pill-label";
  pillLabel.textContent = tr("analyzeShort");

  pillBtn.appendChild(pillIcon);
  pillBtn.appendChild(pillLabel);

  pillBtn.addEventListener("mousedown", (e) => e.preventDefault());
  pillBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onPillClick();
  });

  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.className = "dismiss-btn";
  dismissBtn.setAttribute("aria-label", tr("close"));
  dismissBtn.setAttribute("aria-expanded", "false");
  dismissBtn.textContent = "\u00D7";
  dismissBtn.addEventListener("mousedown", (e) => e.preventDefault());
  dismissBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDismissMenu();
  });

  const dismissMenu = document.createElement("div");
  dismissMenu.className = "dismiss-menu";

  pillShell.appendChild(pillBtn);
  pillShell.appendChild(dismissBtn);
  pillShell.appendChild(dismissMenu);

  const hintEl = document.createElement("div");
  hintEl.className = "hint";
  hintEl.textContent = tr("selectText");

  const panel = document.createElement("div");
  panel.className = "panel";

  wrap.appendChild(pillShell);
  wrap.appendChild(hintEl);
  wrap.appendChild(panel);
  shadow.appendChild(wrap);

  document.documentElement.appendChild(host);

  fabRefs = {
    host,
    shadow,
    wrap,
    pillShell,
    pillBtn,
    pillLabel,
    hintEl,
    panel,
    dismissBtn,
    dismissMenu,
  };

  document.addEventListener("click", onDocumentClickOutsideMenu, true);

  return fabRefs;
}

function isMenuOpen(): boolean {
  return fabRefs?.dismissMenu.classList.contains("open") ?? false;
}

function openDismissMenu(): void {
  if (!fabRefs) return;
  renderDismissMenu();
  fabRefs.dismissMenu.classList.add("open");
  fabRefs.dismissBtn.setAttribute("aria-expanded", "true");
}

function closeDismissMenu(): void {
  if (!fabRefs) return;
  fabRefs.dismissMenu.classList.remove("open");
  fabRefs.dismissBtn.setAttribute("aria-expanded", "false");
}

function toggleDismissMenu(): void {
  if (isMenuOpen()) closeDismissMenu();
  else openDismissMenu();
}

function renderDismissMenu(): void {
  if (!fabRefs) return;
  const host = currentHost();
  const safeHost = escapeHtml(host || "this site");
  fabRefs.dismissMenu.innerHTML = `
    <div class="menu-title">${escapeHtml(tr("fabHideMenuTitle"))}</div>
    <button type="button" data-act="hide-site">
      <span style="flex:1;">${escapeHtml(tr("fabHideOnSite"))}</span>
      <span class="menu-host">${safeHost}</span>
    </button>
    <button type="button" class="danger" data-act="hide-all">
      ${escapeHtml(tr("fabHideEverywhere"))}
    </button>
    <button type="button" class="muted" data-act="cancel">
      ${escapeHtml(tr("cancel"))}
    </button>
    <div class="menu-foot">${escapeHtml(tr("fabRestoreNote"))}</div>
  `;
  fabRefs.dismissMenu
    .querySelector('[data-act="hide-site"]')
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeDismissMenu();
      void hideOnThisSite();
    });
  fabRefs.dismissMenu
    .querySelector('[data-act="hide-all"]')
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeDismissMenu();
      void hideEverywhere();
    });
  fabRefs.dismissMenu
    .querySelector('[data-act="cancel"]')
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeDismissMenu();
    });
}

function onDocumentClickOutsideMenu(e: MouseEvent): void {
  if (!fabRefs || !isMenuOpen()) return;
  // The menu lives inside a closed shadow root, so any click that bubbles up
  // to the document is outside it by definition. The only exception is clicks
  // on the host itself (which we already handle inside the shadow root via
  // stopPropagation on internal buttons), so closing here is safe.
  if (e.composedPath().includes(fabRefs.host)) return;
  closeDismissMenu();
}

function ensureFabAttached(): void {
  if (!fabRefs) return;
  if (!fabRefs.host.isConnected) {
    document.documentElement.appendChild(fabRefs.host);
  }
}

function setHostVisibility(visible: boolean): void {
  if (!fabRefs) return;
  fabRefs.host.style.setProperty(
    "display",
    visible ? "block" : "none",
    "important",
  );
}

function dismissFab(): void {
  fabDismissed = true;
  try {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
  } catch {
    // ignored
  }
  setHostVisibility(false);
}

function restoreFromSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function currentHost(): string {
  return location.hostname.toLowerCase();
}

function isHostDisabled(): boolean {
  const host = currentHost();
  if (!host) return false;
  return fabPrefs.disabledHosts.some(
    (h) => h.toLowerCase() === host || host.endsWith("." + h.toLowerCase()),
  );
}

function isFabSuppressed(): boolean {
  return fabDismissed || fabPrefs.globalDisabled || isHostDisabled();
}

async function loadFabPrefs(): Promise<void> {
  try {
    const raw = await chrome.storage.sync.get(FAB_PREFS_STORAGE_KEY);
    const stored = raw[FAB_PREFS_STORAGE_KEY] as Partial<FabPrefs> | undefined;
    fabPrefs = {
      globalDisabled: stored?.globalDisabled === true,
      disabledHosts: Array.isArray(stored?.disabledHosts)
        ? stored.disabledHosts.filter((h): h is string => typeof h === "string")
        : [],
    };
  } catch {
    // ignored
  }
}

async function saveFabPrefs(): Promise<void> {
  try {
    await chrome.storage.sync.set({ [FAB_PREFS_STORAGE_KEY]: fabPrefs });
  } catch {
    // ignored
  }
}

async function hideOnThisSite(): Promise<void> {
  const host = currentHost();
  if (!host) return;
  if (!fabPrefs.disabledHosts.includes(host)) {
    fabPrefs.disabledHosts = [...fabPrefs.disabledHosts, host];
  }
  await saveFabPrefs();
  setHostVisibility(false);
}

async function hideEverywhere(): Promise<void> {
  fabPrefs.globalDisabled = true;
  await saveFabPrefs();
  setHostVisibility(false);
}

function setState(next: FabState): void {
  fabState = next;
  renderFab();
}

function onPillClick(): void {
  if (fabState.kind === "loading") return;
  const text = getCurrentSelectionText();
  if (text.length < FAB_MIN_CHARS) {
    notifyServiceWorker({ type: MSG.OPEN_SIDE_PANEL });
    return;
  }
  const wc = wordCount(text);
  const estimate = estimateCredits(wc, currentPortfolioSize || 1);
  setState({
    kind: "confirm",
    selectionText: text,
    wordCount: wc,
    estimate,
  });
}

function startAnalysisFromConfirm(): void {
  if (fabState.kind !== "confirm") return;
  const text = fabState.selectionText;
  setState({ kind: "loading" });
  notifyServiceWorker({
    type: MSG.REQUEST_ANALYSIS_SELECTION,
    selectionText: text,
  });
}

function sentimentIcon(s: Sentiment): string {
  return s === "bullish" ? "\u25B2" : s === "bearish" ? "\u25BC" : "\u25CF";
}

function sentimentLabel(s: Sentiment): string {
  return s === "bullish"
    ? tr("bullish")
    : s === "bearish"
      ? tr("bearish")
      : tr("neutral");
}

function renderAssetHTML(a: AssetAnalysis): string {
  const pct = Math.round(a.confidence * 100);
  const s = a.sentiment;
  const icon = sentimentIcon(s);
  const label = sentimentLabel(s);
  return `
    <div class="asset ${s}">
      <div class="asset-head">
        <div>
          <div class="asset-symbol"><span class="sentiment-icon">${icon}</span><span>${escapeHtml(a.symbol)}</span></div>
          <div class="asset-name">${escapeHtml(a.name)}</div>
        </div>
        <div>
          <div class="sentiment-pill">${escapeHtml(label)}</div>
          <div class="conf">${escapeHtml(tr("confidence"))} ${pct}%</div>
        </div>
      </div>
      <div class="bar ${s}"><span style="width:${pct}%"></span></div>
      <div class="rationale">${escapeHtml(a.rationale)}</div>
      ${a.relevantQuote ? `<div class="quote">\u201C${escapeHtml(a.relevantQuote)}\u201D</div>` : ""}
    </div>
  `;
}

function renderResultPanel(
  result: AnalyzeResponse,
  title: string,
  url: string,
  balance?: number,
  creditsCharged?: number,
): void {
  if (!fabRefs) return;
  let host = "";
  try {
    host = url ? new URL(url).hostname : "";
  } catch {
    host = "";
  }
  const cachedChip = result.cached
    ? `<span class="chip">${escapeHtml(tr("cached"))}</span>`
    : "";
  const langChip = `<span class="chip">${escapeHtml(result.detectedLanguage)}</span>`;
  const spentChip =
    typeof creditsCharged === "number" && creditsCharged > 0
      ? `<span class="chip" style="background:rgba(239,68,68,0.15);color:#fca5a5;">−${creditsCharged} ${escapeHtml(tr("credits"))}</span>`
      : "";
  const balanceChip =
    typeof balance === "number"
      ? `<span class="chip" style="background:rgba(16,185,129,0.15);color:#6ee7b7;">${balance.toLocaleString()} ${escapeHtml(tr("credits"))}</span>`
      : "";
  fabRefs.panel.innerHTML = `
    <div class="panel-header">
      <div class="brand"><span class="brand-icon">${LIREFIN_ICON_IMG}</span><span><span class="brand-text-lire">lire</span><span class="brand-text-fin">fin</span></span></div>
      <div class="panel-actions">
        <button type="button" class="icon-btn" data-act="open-settings" title="${escapeHtml(tr("openSettings"))}">\u2699</button>
        <button type="button" class="icon-btn" data-act="open-panel" title="${escapeHtml(tr("openPanel"))}">\u2197</button>
        <button type="button" class="icon-btn" data-act="close" title="${escapeHtml(tr("close"))}">\u00D7</button>
      </div>
    </div>
    <div class="panel-body">
      <div>
        <div class="meta">${escapeHtml(host)}</div>
        <div class="title">${escapeHtml(title)}</div>
        <div class="chips" style="margin-top:6px;">${langChip}${cachedChip}${spentChip}${balanceChip}</div>
      </div>
      <div>
        <div class="meta" style="margin-bottom:6px;">${escapeHtml(tr("marketSummary"))}</div>
        <div class="summary">${escapeHtml(result.marketSummary)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${result.assets.map(renderAssetHTML).join("")}
      </div>
    </div>
  `;
  fabRefs.panel.querySelector('[data-act="close"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setState({ kind: "idle" });
  });
  fabRefs.panel.querySelector('[data-act="open-panel"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    notifyServiceWorker({ type: MSG.OPEN_SIDE_PANEL });
  });
  fabRefs.panel.querySelector('[data-act="open-settings"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    notifyServiceWorker({ type: MSG.OPEN_OPTIONS_PAGE });
  });
}

function renderLoadingPanel(): void {
  if (!fabRefs) return;
  fabRefs.panel.innerHTML = `
    <div class="panel-header">
      <div class="brand"><span class="brand-icon">${LIREFIN_ICON_IMG}</span><span><span class="brand-text-lire">lire</span><span class="brand-text-fin">fin</span></span></div>
    </div>
    <div class="panel-body">
      <div class="loading-row"><span class="spinner"></span><span>${escapeHtml(tr("analyzing"))}</span></div>
    </div>
  `;
}

function renderConfirmPanel(
  wordCountValue: number,
  estimateValue: number,
): void {
  if (!fabRefs) return;
  const wordsLabel = escapeHtml(tr("words"));
  const creditsLabel = escapeHtml(tr("credits"));
  fabRefs.panel.innerHTML = `
    <div class="panel-header">
      <div class="brand"><span class="brand-icon">${LIREFIN_ICON_IMG}</span><span><span class="brand-text-lire">lire</span><span class="brand-text-fin">fin</span></span></div>
      <div class="panel-actions">
        <button type="button" class="icon-btn" data-act="open-settings" title="${escapeHtml(tr("openSettings"))}">\u2699</button>
        <button type="button" class="icon-btn" data-act="cancel" title="${escapeHtml(tr("cancel"))}">\u00D7</button>
      </div>
    </div>
    <div class="panel-body">
      <div>
        <div class="meta">${escapeHtml(tr("readyToAnalyze"))}</div>
        <div class="title" style="-webkit-line-clamp:1;">${wordCountValue} ${wordsLabel}</div>
      </div>
      <div class="confirm-row">
        <span class="confirm-label">${escapeHtml(tr("estimatedCost"))}</span>
        <span class="confirm-value">\u2248 ${estimateValue} ${creditsLabel}</span>
      </div>
      <div class="err-actions">
        <button type="button" class="pill-btn" data-act="start">
          \u25B6 ${escapeHtml(tr("startAnalysis"))}
        </button>
        <button type="button" class="pill-btn ghost" data-act="open-settings">
          ${escapeHtml(tr("openSettings"))}
        </button>
      </div>
    </div>
  `;
  fabRefs.panel.querySelector('[data-act="cancel"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setState({ kind: "idle" });
  });
  fabRefs.panel.querySelector('[data-act="start"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startAnalysisFromConfirm();
  });
  fabRefs.panel.querySelectorAll('[data-act="open-settings"]').forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      notifyServiceWorker({ type: MSG.OPEN_OPTIONS_PAGE });
    });
  });
}

function renderErrorPanel(
  message: string,
  code?: string,
  balance?: number,
): void {
  if (!fabRefs) return;
  const isRate = code?.startsWith("RATE_LIMITED");
  const isEmptyPortfolio = code === "NO_PORTFOLIO";
  const isInsufficient = code === "INSUFFICIENT_CREDITS";
  const isUnauth = code === "UNAUTHENTICATED";
  const headline = isRate
    ? tr("rateLimited")
    : isEmptyPortfolio
      ? tr("noPortfolio")
      : isInsufficient
        ? tr("insufficientCredits")
        : isUnauth
          ? tr("signInRequiredTitle")
          : tr("errorTitle");
  const body = isInsufficient
    ? `${tr("insufficientCreditsBody")}${typeof balance === "number" ? ` (${balance.toLocaleString()} ${tr("credits")})` : ""}`
    : isUnauth
      ? tr("signInRequiredBody")
      : message;
  const primaryBtn =
    isEmptyPortfolio || isUnauth || isInsufficient
      ? `<button type="button" class="pill-btn" data-act="open-settings">${escapeHtml(
          isInsufficient
            ? tr("buyCredits")
            : isUnauth
              ? tr("signIn")
              : tr("openSettings"),
        )}</button>`
      : "";
  const retryBtn = !isEmptyPortfolio && !isUnauth
    ? `<button type="button" class="pill-btn ghost" data-act="retry">${escapeHtml(tr("retry"))}</button>`
    : "";
  fabRefs.panel.innerHTML = `
    <div class="panel-header">
      <div class="brand"><span class="brand-icon">${LIREFIN_ICON_IMG}</span><span><span class="brand-text-lire">lire</span><span class="brand-text-fin">fin</span></span></div>
      <div class="panel-actions">
        <button type="button" class="icon-btn" data-act="open-settings" title="${escapeHtml(tr("openSettings"))}">\u2699</button>
        <button type="button" class="icon-btn" data-act="close" title="${escapeHtml(tr("close"))}">\u00D7</button>
      </div>
    </div>
    <div class="panel-body">
      <div class="err-title">${escapeHtml(headline)}</div>
      <div class="err-body">${escapeHtml(body)}</div>
      <div class="err-actions">${primaryBtn}${retryBtn}</div>
    </div>
  `;
  fabRefs.panel.querySelector('[data-act="close"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setState({ kind: "idle" });
  });
  fabRefs.panel.querySelector('[data-act="retry"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onPillClick();
  });
  fabRefs.panel.querySelectorAll('[data-act="open-settings"]').forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      notifyServiceWorker({ type: MSG.OPEN_OPTIONS_PAGE });
    });
  });
}

function renderFab(): void {
  if (!fabRefs) return;
  if (isFabSuppressed() || pickModeActive) {
    setHostVisibility(false);
    return;
  }
  setHostVisibility(true);
  ensureFabAttached();

  const wrap = fabRefs.wrap;
  wrap.classList.remove("has-selection", "is-loading", "has-panel");

  if (fabState.kind === "confirm") {
    wrap.classList.add("has-panel");
    renderConfirmPanel(fabState.wordCount, fabState.estimate);
    return;
  }
  if (fabState.kind === "loading") {
    wrap.classList.add("has-panel");
    renderLoadingPanel();
    return;
  }
  if (fabState.kind === "result") {
    wrap.classList.add("has-panel");
    renderResultPanel(
      fabState.result,
      fabState.title,
      fabState.url,
      fabState.balance,
      fabState.creditsCharged,
    );
    return;
  }
  if (fabState.kind === "error") {
    wrap.classList.add("has-panel");
    renderErrorPanel(fabState.message, fabState.code, fabState.balance);
    return;
  }
  // idle
  fabRefs.panel.innerHTML = "";
  fabRefs.hintEl.textContent = tr("selectText");
  const text = getCurrentSelectionText();
  if (text.length >= FAB_MIN_CHARS) {
    const wc = wordCount(text);
    fabRefs.pillLabel.textContent = `${tr("analyzeShort")} \u00B7 ${wc} ${tr("words")}`;
    wrap.classList.add("has-selection");
  } else {
    fabRefs.pillLabel.textContent = tr("analyzeShort");
  }
}

function onSelectionChange(): void {
  if (selectionDebounce !== null) window.clearTimeout(selectionDebounce);
  selectionDebounce = window.setTimeout(() => {
    selectionDebounce = null;
    if (fabState.kind === "idle") renderFab();
  }, 80);
}

async function loadLang(): Promise<void> {
  try {
    const raw = await chrome.storage.sync.get(SETTINGS_STORAGE_KEY);
    const stored = (raw[SETTINGS_STORAGE_KEY] ?? {}) as {
      outputLanguage?: SupportedLanguageCode;
      portfolio?: Asset[];
    };
    currentLang = uiLangFromOutput(stored.outputLanguage ?? "en");
    currentPortfolioSize = Array.isArray(stored.portfolio)
      ? stored.portfolio.length
      : 0;
    renderFab();
  } catch {
    // ignored
  }
}

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === MSG.START_PICK_MODE) {
      enterPickMode();
      sendResponse({ ok: true });
      return false;
    }
    if (message.type === MSG.CANCEL_PICK_MODE) {
      exitPickMode();
      sendResponse({ ok: true });
      return false;
    }
    if (message.type === MSG.ANALYSIS_STARTED) {
      setState({ kind: "loading", title: message.title });
      sendResponse({ ok: true });
      return false;
    }
    if (message.type === MSG.ANALYSIS_RESULT) {
      setState({
        kind: "result",
        result: message.result,
        title: message.title,
        url: message.url,
        balance: message.balance,
        creditsCharged: message.creditsCharged,
      });
      sendResponse({ ok: true });
      return false;
    }
    if (message.type === MSG.ANALYSIS_ERROR) {
      setState({
        kind: "error",
        message: message.error,
        code: message.code,
        balance: message.balance,
      });
      sendResponse({ ok: true });
      return false;
    }
    return false;
  },
);

async function init(): Promise<void> {
  fabDismissed = restoreFromSession();
  await loadFabPrefs();
  createFab();
  renderFab();
  document.addEventListener("selectionchange", onSelectionChange);
  void loadLang();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes[SETTINGS_STORAGE_KEY]) {
      void loadLang();
    }
    if (changes[FAB_PREFS_STORAGE_KEY]) {
      void loadFabPrefs().then(() => renderFab());
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      void init();
    },
    { once: true },
  );
} else {
  void init();
}
