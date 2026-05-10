import type { AnalyzeResponse, Asset } from "@fni/shared";

export type ExtensionMessage =
  | { type: "REQUEST_ANALYSIS_SELECTION"; tabId?: number; selectionText: string }
  | { type: "START_PICK_MODE"; tabId?: number }
  | { type: "CANCEL_PICK_MODE"; tabId?: number }
  | { type: "PICK_MODE_STARTED" }
  | { type: "PICK_MODE_CANCELLED" }
  | {
      type: "SELECTION_CAPTURED";
      selectionText: string;
      pageTitle: string;
      pageUrl: string;
    }
  | {
      type: "ANALYSIS_RESULT";
      result: AnalyzeResponse;
      title: string;
      url: string;
      balance?: number;
      creditsCharged?: number;
    }
  | {
      type: "ANALYSIS_ERROR";
      error: string;
      code?: string;
      retryAfter?: number;
      balance?: number;
      estimate?: number;
    }
  | { type: "ANALYSIS_STARTED"; title: string; url: string }
  | {
      type: "ANALYSIS_PROGRESS";
      stage: "connected" | "generating";
      outputTokens?: number;
      estimate?: number;
    }
  | { type: "OPEN_SIDE_PANEL"; tabId?: number }
  | { type: "OPEN_OPTIONS_PAGE" }
  | { type: "PORTFOLIO_UPDATED"; portfolio: Asset[] };

export const MSG = {
  REQUEST_ANALYSIS_SELECTION: "REQUEST_ANALYSIS_SELECTION",
  START_PICK_MODE: "START_PICK_MODE",
  CANCEL_PICK_MODE: "CANCEL_PICK_MODE",
  PICK_MODE_STARTED: "PICK_MODE_STARTED",
  PICK_MODE_CANCELLED: "PICK_MODE_CANCELLED",
  SELECTION_CAPTURED: "SELECTION_CAPTURED",
  ANALYSIS_RESULT: "ANALYSIS_RESULT",
  ANALYSIS_ERROR: "ANALYSIS_ERROR",
  ANALYSIS_STARTED: "ANALYSIS_STARTED",
  ANALYSIS_PROGRESS: "ANALYSIS_PROGRESS",
  OPEN_SIDE_PANEL: "OPEN_SIDE_PANEL",
  OPEN_OPTIONS_PAGE: "OPEN_OPTIONS_PAGE",
  PORTFOLIO_UPDATED: "PORTFOLIO_UPDATED",
} as const;
