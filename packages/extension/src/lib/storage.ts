import type { Asset, Region, SupportedLanguageCode } from "@fni/shared";

const DEFAULT_BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787";

export interface ExtensionSettings {
  portfolio: Asset[];
  outputLanguage: SupportedLanguageCode;
  backendUrl: string;
  preferredRegion: Region;
}

const STORAGE_KEY = "fni_settings_v1";

const DEFAULTS: ExtensionSettings = {
  portfolio: [],
  outputLanguage: "en",
  backendUrl: DEFAULT_BACKEND_URL,
  preferredRegion: "us",
};

export async function getSettings(): Promise<ExtensionSettings> {
  const raw = await chrome.storage.sync.get(STORAGE_KEY);
  const stored = (raw[STORAGE_KEY] ?? {}) as Partial<
    ExtensionSettings & { deviceId?: string }
  >;

  // Drop the legacy `deviceId` field if it's still around from older versions.
  if ("deviceId" in stored) {
    delete (stored as { deviceId?: string }).deviceId;
  }

  const merged: ExtensionSettings = {
    ...DEFAULTS,
    ...stored,
    backendUrl: stored.backendUrl?.trim() || DEFAULTS.backendUrl,
  };

  return merged;
}

export async function updateSettings(
  patch: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  return next;
}

export function watchSettings(
  cb: (s: ExtensionSettings) => void,
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    area: string,
  ) => {
    if (area !== "sync") return;
    const change = changes[STORAGE_KEY];
    if (!change) return;
    cb(change.newValue as ExtensionSettings);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

const LAST_ANALYSIS_KEY = "fni_last_analysis_v1";

export async function setLastAnalysis(payload: unknown): Promise<void> {
  await chrome.storage.local.set({ [LAST_ANALYSIS_KEY]: payload });
}

export async function getLastAnalysis<T = unknown>(): Promise<T | null> {
  const raw = await chrome.storage.local.get(LAST_ANALYSIS_KEY);
  return (raw[LAST_ANALYSIS_KEY] as T | undefined) ?? null;
}
