import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase.js";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ?? "";

/**
 * The redirect URI registered with Google OAuth. `chrome.identity` uses a
 * stable per-extension URL so we can configure it once.
 *
 *   https://<extension-id>.chromiumapp.org/
 *
 * Add this exact URL (with trailing slash) to:
 *   - Google Cloud Console → OAuth client → Authorized redirect URIs
 *   - Supabase → Auth → URL Configuration → Redirect URLs
 */
function redirectUri(): string {
  return `https://${chrome.runtime.id}.chromiumapp.org/`;
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Supabase verifies the id_token's `nonce` claim by hashing the raw nonce we
// pass to `signInWithIdToken` with SHA-256. To make this match, we must send
// the SHA-256 hash to Google in the authorize URL (not the raw nonce).
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function buildGoogleAuthUrl(rawNonce: string): Promise<string> {
  const hashedNonce = await sha256Hex(rawNonce);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "id_token",
    scope: "openid email profile",
    nonce: hashedNonce,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function extractIdToken(callbackUrl: string): string | null {
  try {
    const u = new URL(callbackUrl);
    // The id_token comes back in the URL fragment (#id_token=...)
    const fragment = u.hash.startsWith("#") ? u.hash.slice(1) : u.hash;
    const params = new URLSearchParams(fragment);
    return params.get("id_token");
  } catch {
    return null;
  }
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function signInWithGoogle(): Promise<Session> {
  if (!isSupabaseConfigured) {
    throw new AuthError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase is not configured. Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.",
    );
  }
  if (!GOOGLE_CLIENT_ID) {
    throw new AuthError(
      "GOOGLE_CLIENT_ID_MISSING",
      "Set VITE_GOOGLE_OAUTH_CLIENT_ID in packages/extension/.env",
    );
  }

  const nonce = randomNonce();
  const url = await buildGoogleAuthUrl(nonce);

  const callback = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url, interactive: true },
      (responseUrl) => {
        const lastErr = chrome.runtime.lastError;
        if (lastErr) {
          reject(
            new AuthError("OAUTH_LAUNCH_FAILED", lastErr.message ?? "Auth flow failed."),
          );
          return;
        }
        if (!responseUrl) {
          reject(
            new AuthError("OAUTH_NO_RESPONSE", "No response from Google."),
          );
          return;
        }
        resolve(responseUrl);
      },
    );
  });

  const idToken = extractIdToken(callback);
  if (!idToken) {
    throw new AuthError(
      "OAUTH_NO_ID_TOKEN",
      "Google did not return an id_token.",
    );
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
    nonce,
  });
  if (error) throw new AuthError("SUPABASE_SIGNIN_FAILED", error.message);
  if (!data.session) {
    throw new AuthError(
      "SUPABASE_NO_SESSION",
      "Supabase did not return a session.",
    );
  }
  return data.session;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Sends a 6-digit one-time login code to the user's email. We deliberately
 * use the OTP CODE flow (not the magic-link flow) because it works inside
 * the extension without needing a callback URL — the user just types the
 * code into the extension UI.
 *
 * On success Supabase will create the auth user lazily; the
 * `handle_new_user` trigger then grants the 25-credit signup bonus.
 */
export async function sendEmailOtp(email: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new AuthError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase is not configured. Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.",
    );
  }
  const trimmed = email.trim();
  if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
    throw new AuthError("EMAIL_INVALID", "Enter a valid email address.");
  }
  // `shouldCreateUser: true` lets first-time users sign up with the same
  // OTP — no separate sign-up form needed.
  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: { shouldCreateUser: true },
  });
  if (error) throw new AuthError("OTP_SEND_FAILED", error.message);
}

/**
 * Exchanges the 6-digit code the user typed for an authenticated session.
 * Returns the resulting session so callers can immediately refresh any
 * dependent state.
 */
export async function verifyEmailOtp(
  email: string,
  token: string,
): Promise<Session> {
  if (!isSupabaseConfigured) {
    throw new AuthError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase is not configured. Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.",
    );
  }
  const code = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) {
    throw new AuthError(
      "OTP_FORMAT_INVALID",
      "Enter the 6-digit code from your email.",
    );
  }
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code,
    type: "email",
  });
  if (error) throw new AuthError("OTP_VERIFY_FAILED", error.message);
  if (!data.session) {
    throw new AuthError("OTP_NO_SESSION", "Supabase did not return a session.");
  }
  return data.session;
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export function onAuthChange(
  cb: (session: Session | null) => void,
): () => void {
  const sub = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session);
  });
  return () => sub.data.subscription.unsubscribe();
}
