import { useState } from "react";
import type { SupportedLanguageCode } from "@fni/shared";
import { AuthError, signInWithGoogle } from "./auth.js";
import { t } from "./i18n.js";

interface Props {
  uiLang: SupportedLanguageCode;
  /**
   * Called whenever a sign-in succeeds. Parents typically use this to
   * refresh balance + close the auth modal.
   */
  onSuccess: () => void | Promise<void>;
  /** Optional override for the panel chrome (compact embeds skip the title). */
  variant?: "full" | "compact";
}

/**
 * Self-contained sign-in widget shared by OptionsApp + SidePanel + Popup.
 *
 * Uses `chrome.identity.launchWebAuthFlow` → Supabase `signInWithIdToken`
 * for a one-click Google sign-in. No round-trip through a web page; the
 * popup closes itself once Google returns the id_token.
 *
 * Email OTP fallback is intentionally disabled — see `auth.ts` for the
 * helper functions if it needs to be re-enabled.
 */
export function AuthForm({ uiLang, onSuccess, variant = "full" }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      await onSuccess();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {variant === "full" && (
        <div className="text-xs text-slate-400">
          {t("signInChooseMethod", uiLang)}
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-slate-900 text-sm font-semibold shadow hover:shadow-md disabled:opacity-50"
      >
        <GoogleIcon />
        {busy ? t("verifying", uiLang) : t("signInWithGoogle", uiLang)}
      </button>

      {error && (
        <div className="text-xs text-bearish-500">
          {t("signInFailed", uiLang)}: {error}
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.3 0 10.2-2 13.9-5.3l-6.4-5.2c-2 1.5-4.6 2.5-7.5 2.5-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.5 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.4 4.3-4.4 5.6l6.4 5.2C40.9 36 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}
