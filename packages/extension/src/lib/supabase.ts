import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// We deliberately use `console.info` (not `console.warn`) here so the message
// does NOT appear in Chrome's `chrome://extensions` Errors panel. This is an
// expected first-run state (the developer hasn't created
// `packages/extension/.env` yet); it should never look like an exception.
// `isSupabaseConfigured` below lets the UI surface a friendly banner instead.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.info(
    "[Lirefin] Supabase env not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing). Auth, credits and Stripe checkout are disabled until you create packages/extension/.env and rebuild.",
  );
}

/**
 * Storage adapter backed by `chrome.storage.local`. The default
 * `localStorage` adapter cannot be used in a service worker (no `window`).
 */
const chromeStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      const out = await chrome.storage.local.get(key);
      const v = out[key];
      return typeof v === "string" ? v : null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch {
      // ignored
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch {
      // ignored
    }
  },
};

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || "https://invalid.local",
  SUPABASE_ANON_KEY || "anon-placeholder",
  {
    auth: {
      storage: chromeStorageAdapter,
      storageKey: "fni-auth-session",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY,
);
