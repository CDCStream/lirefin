import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SUPPORTED_LANGUAGES,
  type Asset,
  type CreditTransaction,
  type Region,
  type SupportedLanguageCode,
  type TickerSearchResult,
} from "@fni/shared";
import {
  ApiError,
  cancelSubscription,
  changeSubscription,
  deleteAccount,
  fetchCreditTransactions,
  fetchMe,
  fetchPackages,
  fetchSubscription,
  openCustomerPortal,
  searchTickers,
  startCheckout,
  uncancelSubscription,
  type ApiPackage,
  type MeResponse,
  type SubscriptionResponse,
} from "../lib/apiClient.js";
import { getSettings, updateSettings, type ExtensionSettings } from "../lib/storage.js";
import { t, type TranslationKey, uiLangFromOutput } from "../lib/i18n.js";
import { onAuthChange, signOut } from "../lib/auth.js";
import { AuthForm } from "../lib/AuthForm.js";
import { LirefinIcon } from "../lib/LirefinIcon.js";
import { LirefinWordmark } from "../lib/LirefinWordmark.js";

const REGION_OPTIONS: Array<{ value: Region; key: TranslationKey }> = [
  { value: "us", key: "regionUS" },
  { value: "eu", key: "regionEU" },
  { value: "asia", key: "regionAsia" },
  { value: "global", key: "regionGlobal" },
];

const BILLING_ENABLED =
  (import.meta.env.VITE_ENABLE_BILLING ?? "").toString() === "true";

interface AccountState {
  status: "loading" | "anon" | "signedIn" | "error";
  me?: MeResponse;
  error?: string;
}

export function OptionsApp() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [account, setAccount] = useState<AccountState>({ status: "loading" });

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  const refreshAccount = useCallback(async (s: ExtensionSettings | null) => {
    if (!s) return;
    try {
      const me = await fetchMe(s.backendUrl);
      setAccount({ status: "signedIn", me });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAccount({ status: "anon" });
      } else {
        setAccount({ status: "error", error: (err as Error).message });
      }
    }
  }, []);

  useEffect(() => {
    if (!settings) return;
    void refreshAccount(settings);
    const off = onAuthChange((session) => {
      if (!session) {
        setAccount({ status: "anon" });
      } else {
        void refreshAccount(settings);
      }
    });
    return off;
  }, [settings, refreshAccount]);

  const uiLang = useMemo(
    () => (settings ? uiLangFromOutput(settings.outputLanguage) : "en"),
    [settings],
  );

  if (!settings) {
    return <div className="p-8 text-sm text-slate-400">Loading…</div>;
  }

  const flash = () => {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  };

  const onAddAsset = async (a: Asset) => {
    if (settings.portfolio.find((p) => p.symbol === a.symbol)) return;
    const next = await updateSettings({
      portfolio: [...settings.portfolio, a],
    });
    setSettings(next);
    flash();
  };

  const onRemoveAsset = async (symbol: string) => {
    const next = await updateSettings({
      portfolio: settings.portfolio.filter((p) => p.symbol !== symbol),
    });
    setSettings(next);
    flash();
  };

  const onPatch = async (patch: Partial<ExtensionSettings>) => {
    const next = await updateSettings(patch);
    setSettings(next);
    flash();
  };

  const handleAuthSuccess = async () => {
    await refreshAccount(settings);
  };

  const handleSignOut = async () => {
    await signOut();
    setAccount({ status: "anon" });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LirefinIcon className="w-10 h-10 rounded-xl shadow-md shadow-brand-500/20" />
            <div>
              <h1 className="text-xl">
                <LirefinWordmark size="lg" />
              </h1>
              <div className="text-xs text-slate-400">{t("openOptions", uiLang)}</div>
            </div>
          </div>
          {savedFlash && (
            <span className="text-xs text-bullish-500 font-semibold">
              ✓ {t("saved", uiLang)}
            </span>
          )}
        </header>

        <Section title={t("account", uiLang)}>
          <AccountSection
            account={account}
            uiLang={uiLang}
            onAuthSuccess={handleAuthSuccess}
            onSignOut={handleSignOut}
          />
        </Section>

        {account.status === "signedIn" && (
          <Section title={t("subscriptionTitle", uiLang)}>
            {BILLING_ENABLED ? (
              <BillingSection
                backendUrl={settings.backendUrl}
                uiLang={uiLang}
              />
            ) : (
              <BillingComingSoon uiLang={uiLang} />
            )}
          </Section>
        )}

        {account.status === "signedIn" && (
          <Section title={t("recentActivity", uiLang)}>
            <ActivitySection
              backendUrl={settings.backendUrl}
              uiLang={uiLang}
            />
          </Section>
        )}

        <Section title={t("outputLanguage", uiLang)}>
          <select
            value={settings.outputLanguage}
            onChange={(e) =>
              onPatch({ outputLanguage: e.target.value as SupportedLanguageCode })
            }
            className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name} ({l.englishName})
              </option>
            ))}
          </select>
        </Section>

        <Section title={t("region", uiLang)}>
          <div className="flex flex-wrap gap-2">
            {REGION_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => onPatch({ preferredRegion: r.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  settings.preferredRegion === r.value
                    ? "bg-brand-600 border-brand-500 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                {t(r.key, uiLang)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={`${t("portfolio", uiLang)} · ${settings.portfolio.length}`}>
          <PortfolioEditor
            settings={settings}
            uiLang={uiLang}
            authed={account.status === "signedIn"}
            onAdd={onAddAsset}
            onRemove={onRemoveAsset}
          />
        </Section>

        <Section title={t("fabFloatingButton", uiLang)}>
          <FloatingButtonSection uiLang={uiLang} />
        </Section>

        {account.status === "signedIn" && (
          <Section title={t("dangerZone", uiLang)}>
            <DangerZoneSection
              backendUrl={settings.backendUrl}
              uiLang={uiLang}
              portfolioCount={settings.portfolio.length}
              balance={account.me?.balance ?? 0}
              onDeleted={async () => {
                await signOut();
                setAccount({ status: "anon" });
              }}
            />
          </Section>
        )}

        <p className="mt-12 text-[11px] text-slate-600 leading-relaxed">
          {t("disclaimer", uiLang)}
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

const FAB_PREFS_STORAGE_KEY = "fni_fab_prefs_v1";

interface FabPrefs {
  globalDisabled: boolean;
  disabledHosts: string[];
}

function FloatingButtonSection({
  uiLang,
}: {
  uiLang: SupportedLanguageCode;
}) {
  const [prefs, setPrefs] = useState<FabPrefs>({
    globalDisabled: false,
    disabledHosts: [],
  });

  useEffect(() => {
    let cancelled = false;
    void chrome.storage.sync.get(FAB_PREFS_STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      const stored = raw[FAB_PREFS_STORAGE_KEY] as Partial<FabPrefs> | undefined;
      setPrefs({
        globalDisabled: stored?.globalDisabled === true,
        disabledHosts: Array.isArray(stored?.disabledHosts)
          ? stored.disabledHosts.filter(
              (h): h is string => typeof h === "string",
            )
          : [],
      });
    });
    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "sync" || !changes[FAB_PREFS_STORAGE_KEY]) return;
      const stored = changes[FAB_PREFS_STORAGE_KEY].newValue as
        | Partial<FabPrefs>
        | undefined;
      setPrefs({
        globalDisabled: stored?.globalDisabled === true,
        disabledHosts: Array.isArray(stored?.disabledHosts)
          ? stored.disabledHosts.filter(
              (h): h is string => typeof h === "string",
            )
          : [],
      });
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const persist = useCallback(async (next: FabPrefs) => {
    setPrefs(next);
    await chrome.storage.sync.set({ [FAB_PREFS_STORAGE_KEY]: next });
  }, []);

  const toggleEnabled = () =>
    void persist({ ...prefs, globalDisabled: !prefs.globalDisabled });

  const removeHost = (host: string) =>
    void persist({
      ...prefs,
      disabledHosts: prefs.disabledHosts.filter((h) => h !== host),
    });

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 leading-relaxed">
        {t("fabFloatingButtonDesc", uiLang)}
      </p>

      <label className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
        <span className="text-sm text-slate-200">
          {t("fabEnabledLabel", uiLang)}
        </span>
        <input
          type="checkbox"
          checked={!prefs.globalDisabled}
          onChange={toggleEnabled}
          className="w-4 h-4 accent-brand-500"
        />
      </label>

      <div>
        <h3 className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-2">
          {t("fabDisabledSites", uiLang)}
        </h3>
        {prefs.disabledHosts.length === 0 ? (
          <p className="text-xs text-slate-500 px-3 py-3 rounded-lg bg-slate-900 border border-slate-800 border-dashed">
            {t("fabNoHiddenSites", uiLang)}
          </p>
        ) : (
          <ul className="space-y-1">
            {prefs.disabledHosts.map((host) => (
              <li
                key={host}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800"
              >
                <span className="text-sm text-slate-200 truncate font-mono">
                  {host}
                </span>
                <button
                  type="button"
                  onClick={() => removeHost(host)}
                  className="text-xs text-brand-400 hover:text-brand-300 font-semibold whitespace-nowrap"
                >
                  {t("fabRestoreSite", uiLang)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AccountSection({
  account,
  uiLang,
  onAuthSuccess,
  onSignOut,
}: {
  account: AccountState;
  uiLang: SupportedLanguageCode;
  onAuthSuccess: () => void | Promise<void>;
  onSignOut: () => void;
}) {
  if (account.status === "loading") {
    return (
      <div className="text-xs text-slate-500">{t("loadingAccount", uiLang)}</div>
    );
  }

  if (account.status === "signedIn" && account.me) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            {t("signedInAs", uiLang)}
          </div>
          <div className="text-sm font-semibold text-slate-100 truncate">
            {account.me.email ?? account.me.id}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            {t("balance", uiLang)}
          </div>
          <div className="text-base font-bold text-bullish-500">
            {account.me.balance.toLocaleString()}{" "}
            <span className="text-xs text-slate-400">{t("credits", uiLang)}</span>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
        >
          {t("signOut", uiLang)}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="text-sm font-semibold mb-1">
        {t("signInRequiredTitle", uiLang)}
      </div>
      <div className="text-xs text-slate-400 mb-3">
        {t("signInRequiredBody", uiLang)}
      </div>
      <AuthForm uiLang={uiLang} onSuccess={onAuthSuccess} />
      {account.status === "error" && account.error && (
        <div className="mt-3 text-xs text-bearish-500">{account.error}</div>
      )}
    </div>
  );
}

type Confirm =
  | null
  | {
      kind: "switch";
      target: ApiPackage;
      current: ApiPackage;
    }
  | { kind: "cancel"; current: ApiPackage; periodEnd: string | null };

function BillingComingSoon({ uiLang }: { uiLang: SupportedLanguageCode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400 ring-1 ring-inset ring-brand-500/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M12 2v4" />
            <path d="m6.34 7.34-2.83-2.83" />
            <path d="M2 12h4" />
            <path d="m6.34 16.66-2.83 2.83" />
            <path d="M12 22v-4" />
            <path d="m17.66 16.66 2.83 2.83" />
            <path d="M22 12h-4" />
            <path d="m17.66 7.34 2.83-2.83" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <div className="text-sm font-semibold text-slate-100">
            {t("billingComingSoonTitle", uiLang)}
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            {t("billingComingSoonBody", uiLang)}
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            {t("billingComingSoonHint", uiLang)}
          </p>
        </div>
      </div>
    </div>
  );
}

function BillingSection({
  backendUrl,
  uiLang,
}: {
  backendUrl: string;
  uiLang: SupportedLanguageCode;
}) {
  const [packages, setPackages] = useState<ApiPackage[] | null>(null);
  const [subscription, setSubscription] =
    useState<SubscriptionResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Fetch + refetch helpers --------------------------------------------------

  const refetchSubscription = async () => {
    try {
      const next = await fetchSubscription(backendUrl);
      setSubscription(next);
    } catch {
      // The change/cancel call already succeeded; ignore stale-read errors.
    }
  };

  useEffect(() => {
    void fetchPackages(backendUrl)
      .then(setPackages)
      .catch((e) => setError((e as Error).message));
    void fetchSubscription(backendUrl)
      .then(setSubscription)
      .catch(() => setSubscription({ active: false }));
  }, [backendUrl]);

  // Action handlers ----------------------------------------------------------

  const onSubscribe = async (id: ApiPackage["id"]) => {
    setError(null);
    setBusy(id);
    try {
      const { url } = await startCheckout(backendUrl, id, uiLang);
      await chrome.tabs.create({ url });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onConfirmSwitch = async (discountCode?: string) => {
    if (!confirm || confirm.kind !== "switch") return;
    setError(null);
    setBusy("__switch__");
    try {
      const { discountApplied } = await changeSubscription(
        backendUrl,
        confirm.target.id,
        discountCode,
      );
      const baseMsg = t("switchSuccess", uiLang).replace(
        "{plan}",
        confirm.target.label,
      );
      setFlash(
        discountApplied
          ? `${baseMsg} · ${t("discountApplied", uiLang)}`
          : baseMsg,
      );
      setConfirm(null);
      // Polar webhook is async; poll briefly so the UI catches up.
      await new Promise((r) => setTimeout(r, 800));
      await refetchSubscription();
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVALID_DISCOUNT") {
        setError(t("invalidDiscount", uiLang));
      } else {
        setError((err as Error).message);
      }
    } finally {
      setBusy(null);
    }
  };

  const onConfirmCancel = async () => {
    if (!confirm || confirm.kind !== "cancel") return;
    setError(null);
    setBusy("__cancel__");
    try {
      await cancelSubscription(backendUrl);
      setFlash(t("cancelSuccess", uiLang));
      setConfirm(null);
      await new Promise((r) => setTimeout(r, 800));
      await refetchSubscription();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onResume = async () => {
    setError(null);
    setBusy("__resume__");
    try {
      await uncancelSubscription(backendUrl);
      setFlash(t("resumeSuccess", uiLang));
      await new Promise((r) => setTimeout(r, 800));
      await refetchSubscription();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  // Polar customer portal — kept as a fallback for things our inline UI
  // doesn't handle (invoices, payment method updates, refund requests).
  const onOpenPortal = async () => {
    setError(null);
    setBusy("__portal__");
    try {
      const { url } = await openCustomerPortal(backendUrl);
      await chrome.tabs.create({ url });
    } catch (err) {
      if (err instanceof ApiError && err.code === "NO_CUSTOMER") {
        setSubscription({ active: false });
      } else {
        setError((err as Error).message);
      }
    } finally {
      setBusy(null);
    }
  };

  // Render -------------------------------------------------------------------

  if (!packages && !error) {
    return <div className="text-xs text-slate-500">…</div>;
  }
  if (error && !packages) {
    return <div className="text-xs text-bearish-500">{error}</div>;
  }

  const dateFmt = new Intl.DateTimeFormat(uiLang, { dateStyle: "medium" });
  const activePkg =
    subscription && subscription.active && packages
      ? packages.find((p) => p.id === subscription.packageId)
      : null;

  // Confirm panel — replaces the rest of the section while open so the
  // user has a single place to review the action they're about to take.
  if (confirm && activePkg) {
    return (
      <ConfirmPanel
        confirm={confirm}
        currentPkg={activePkg}
        uiLang={uiLang}
        busy={
          busy === "__switch__" || busy === "__cancel__" ? busy : null
        }
        error={error}
        onCancel={() => {
          setConfirm(null);
          setError(null);
        }}
        onConfirmSwitch={onConfirmSwitch}
        onConfirmCancel={onConfirmCancel}
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-xs text-bearish-500">{error}</div>}
      {flash && (
        <div className="text-xs text-bullish-500 px-3 py-2 rounded-lg bg-bullish-500/10 border border-bullish-500/20">
          ✓ {flash}
        </div>
      )}

      {/* Active plan card with inline cancel / resume */}
      {subscription?.active && activePkg && (
        <div className="rounded-xl border border-brand-500/40 bg-brand-500/5 p-4">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-brand-400">
                {t("activePlanLabel", uiLang)}
              </div>
              <div className="text-base font-bold text-slate-100">
                {activePkg.label}
              </div>
              <div className="text-xs text-slate-400">
                {activePkg.credits.toLocaleString()}{" "}
                {t("creditsPerMonth", uiLang)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                ${activePkg.usd}
                <span className="text-slate-600">
                  {" "}
                  / {t("perMonthShort", uiLang)}
                </span>
              </div>
              {subscription.cancelAtPeriodEnd &&
                subscription.currentPeriodEnd && (
                  <div className="text-[11px] text-yellow-300 mt-1">
                    {t("endsOn", uiLang).replace(
                      "{date}",
                      dateFmt.format(new Date(subscription.currentPeriodEnd)),
                    )}
                  </div>
                )}
              {!subscription.cancelAtPeriodEnd &&
                subscription.currentPeriodEnd && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    {t("renewsOn", uiLang).replace(
                      "{date}",
                      dateFmt.format(new Date(subscription.currentPeriodEnd)),
                    )}
                  </div>
                )}
              {subscription.status === "past_due" && (
                <div className="text-[11px] text-bearish-400 mt-1">
                  {t("pastDue", uiLang)}
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {subscription.cancelAtPeriodEnd ? (
              <button
                onClick={onResume}
                disabled={busy === "__resume__"}
                className="text-xs font-semibold px-3 py-2 rounded-lg bg-bullish-500 hover:bg-bullish-600 disabled:opacity-40 text-white"
              >
                {busy === "__resume__"
                  ? "…"
                  : t("resumeSubscription", uiLang)}
              </button>
            ) : (
              <button
                onClick={() =>
                  setConfirm({
                    kind: "cancel",
                    current: activePkg,
                    periodEnd: subscription.currentPeriodEnd,
                  })
                }
                disabled={busy !== null}
                className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
              >
                {t("cancelSubscription", uiLang)}
              </button>
            )}
            <button
              onClick={onOpenPortal}
              disabled={busy === "__portal__"}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 underline-offset-2 hover:underline"
            >
              {busy === "__portal__"
                ? "…"
                : t("invoicesAndBilling", uiLang)}
            </button>
          </div>
        </div>
      )}

      {/* Package grid — inline switch / subscribe */}
      <div>
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-2">
          {subscription?.active
            ? t("comparePlans", uiLang)
            : t("choosePlan", uiLang)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {packages!.map((p) => {
            const isUnlimited = p.unlimited === true;
            const isActive =
              subscription?.active && subscription.packageId === p.id;
            const cardClasses = isActive
              ? "rounded-xl border-2 border-brand-500 bg-brand-500/10 p-4 flex flex-col relative"
              : isUnlimited
                ? "rounded-xl border-2 border-brand-500/60 bg-gradient-to-br from-brand-500/10 to-slate-900/60 p-4 flex flex-col relative"
                : "rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col";

            const isUpgrade =
              subscription?.active && activePkg && p.usd > activePkg.usd;
            const switchLabel = isUpgrade
              ? t("upgradeToPlan", uiLang)
              : t("downgradeToPlan", uiLang);

            return (
              <div key={p.id} className={cardClasses}>
                {isActive && (
                  <div className="absolute -top-2 right-3 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-500 text-white shadow">
                    {t("currentPlanBadge", uiLang)}
                  </div>
                )}
                {!isActive && isUnlimited && (
                  <div className="absolute -top-2 right-3 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-500 text-white shadow">
                    {t("bestValue", uiLang)}
                  </div>
                )}
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-bold text-slate-100">
                    {p.label}
                  </div>
                  {p.bonusPct > 0 && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-bullish-500/15 text-bullish-500">
                      {t("bonusBadge", uiLang).replace(
                        "{n}",
                        String(p.bonusPct),
                      )}
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <span className="text-2xl font-extrabold text-white">
                    ${p.usd}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">
                    / {t("perMonthShort", uiLang)}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  {p.credits.toLocaleString()} {t("creditsPerMonth", uiLang)}
                  {isUnlimited && (
                    <span className="ml-1 text-brand-400">
                      · {t("unlimitedLabel", uiLang)}
                    </span>
                  )}
                </div>
                {isActive ? (
                  <button
                    disabled
                    className="mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800/50 text-slate-500 cursor-default"
                  >
                    {t("currentPlanBadge", uiLang)}
                  </button>
                ) : subscription?.active && activePkg ? (
                  <button
                    onClick={() =>
                      setConfirm({
                        kind: "switch",
                        target: p,
                        current: activePkg,
                      })
                    }
                    disabled={!p.available || busy !== null}
                    className={
                      isUpgrade
                        ? "mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                        : "mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200"
                    }
                  >
                    {switchLabel}
                  </button>
                ) : (
                  <button
                    disabled={!p.available || busy === p.id}
                    onClick={() => onSubscribe(p.id)}
                    className={
                      isUnlimited
                        ? "mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                        : "mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                    }
                  >
                    {busy === p.id ? "…" : t("subscribeNow", uiLang)}
                  </button>
                )}
                {!p.available && (
                  <div className="mt-1 text-[10px] text-slate-500">
                    {t("packageNotConfigured", uiLang)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ConfirmPanel({
  confirm,
  currentPkg,
  uiLang,
  busy,
  error,
  onCancel,
  onConfirmSwitch,
  onConfirmCancel,
}: {
  confirm: Exclude<Confirm, null>;
  currentPkg: ApiPackage;
  uiLang: SupportedLanguageCode;
  busy: "__switch__" | "__cancel__" | null;
  error: string | null;
  onCancel: () => void;
  onConfirmSwitch: (discountCode?: string) => void;
  onConfirmCancel: () => void;
}) {
  const dateFmt = new Intl.DateTimeFormat(uiLang, { dateStyle: "medium" });
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  if (confirm.kind === "switch") {
    const isUpgrade = confirm.target.usd > currentPkg.usd;
    const headline = isUpgrade
      ? t("confirmUpgradeTitle", uiLang)
      : t("confirmDowngradeTitle", uiLang);
    const body = isUpgrade
      ? t("confirmUpgradeBody", uiLang)
      : t("confirmDowngradeBody", uiLang);
    const trimmedPromo = promoCode.trim();

    return (
      <div className="rounded-xl border border-brand-500/40 bg-brand-500/5 p-5 space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-brand-400 mb-1">
            {isUpgrade ? t("upgradeToPlan", uiLang) : t("downgradeToPlan", uiLang)}
          </div>
          <div className="text-base font-bold text-slate-100">{headline}</div>
        </div>
        <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{t("currentLabel", uiLang)}</span>
            <span className="text-slate-300">
              {currentPkg.label} · ${currentPkg.usd} /{" "}
              {t("perMonthShort", uiLang)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{t("newLabel", uiLang)}</span>
            <span className="text-slate-100 font-semibold">
              {confirm.target.label} · ${confirm.target.usd} /{" "}
              {t("perMonthShort", uiLang)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-slate-500">{t("creditsLabel", uiLang)}</span>
            <span className="text-bullish-500 font-bold">
              {confirm.target.credits.toLocaleString()} /{" "}
              {t("perMonthShort", uiLang)}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">{body}</p>

        {/* Promo code — only relevant for upgrades since downgrades don't
            trigger a charge. We hide it behind a toggle so the common
            no-code path stays clean. */}
        {isUpgrade && (
          <div>
            {!showPromo ? (
              <button
                type="button"
                onClick={() => setShowPromo(true)}
                disabled={busy !== null}
                className="text-[11px] text-brand-400 hover:text-brand-300 underline-offset-2 hover:underline"
              >
                {t("promoCodeToggle", uiLang)}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) =>
                    setPromoCode(e.target.value.toUpperCase().slice(0, 64))
                  }
                  placeholder={t("promoCodePlaceholder", uiLang)}
                  disabled={busy !== null}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-brand-500 disabled:opacity-50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowPromo(false);
                    setPromoCode("");
                  }}
                  disabled={busy !== null}
                  className="text-[11px] text-slate-500 hover:text-slate-300 disabled:opacity-40"
                >
                  {t("remove", uiLang)}
                </button>
              </div>
            )}
          </div>
        )}

        {error && <div className="text-xs text-bearish-500">{error}</div>}
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={busy !== null}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
          >
            {t("cancel", uiLang)}
          </button>
          <button
            onClick={() =>
              onConfirmSwitch(
                isUpgrade && trimmedPromo ? trimmedPromo : undefined,
              )
            }
            disabled={busy !== null}
            className={
              isUpgrade
                ? "text-xs font-semibold px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white"
                : "text-xs font-semibold px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white"
            }
          >
            {busy === "__switch__"
              ? "…"
              : isUpgrade
                ? t("confirmUpgrade", uiLang)
                : t("confirmDowngrade", uiLang)}
          </button>
        </div>
      </div>
    );
  }

  // Cancel confirm panel
  return (
    <div className="rounded-xl border border-bearish-500/30 bg-bearish-500/5 p-5 space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-wider font-semibold text-bearish-400 mb-1">
          {t("cancelSubscription", uiLang)}
        </div>
        <div className="text-base font-bold text-slate-100">
          {t("confirmCancelTitle", uiLang)}
        </div>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        {confirm.periodEnd
          ? t("confirmCancelBody", uiLang).replace(
              "{date}",
              dateFmt.format(new Date(confirm.periodEnd)),
            )
          : t("confirmCancelBodyNoDate", uiLang)}
      </p>
      {error && <div className="text-xs text-bearish-500">{error}</div>}
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          onClick={onCancel}
          disabled={busy !== null}
          className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
        >
          {t("keepSubscription", uiLang)}
        </button>
        <button
          onClick={onConfirmCancel}
          disabled={busy !== null}
          className="text-xs font-semibold px-3 py-2 rounded-lg bg-bearish-500 hover:bg-bearish-600 disabled:opacity-40 text-white"
        >
          {busy === "__cancel__" ? "…" : t("confirmCancel", uiLang)}
        </button>
      </div>
    </div>
  );
}

function ActivitySection({
  backendUrl,
  uiLang,
}: {
  backendUrl: string;
  uiLang: SupportedLanguageCode;
}) {
  const [items, setItems] = useState<CreditTransaction[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchCreditTransactions(backendUrl, undefined, 10);
        if (cancelled) return;
        setItems(res.transactions);
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
      const res = await fetchCreditTransactions(backendUrl, lastCreatedAt, 25);
      setItems((prev) => (prev ?? []).concat(res.transactions));
      setHasMore(res.hasMore);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  if (error) {
    return <div className="text-xs text-bearish-500">{error}</div>;
  }
  if (!items) {
    return <div className="text-xs text-slate-500">…</div>;
  }
  if (items.length === 0) {
    return (
      <div className="text-xs text-slate-500">
        {t("noActivityYet", uiLang)}
      </div>
    );
  }

  const dateFmt = new Intl.DateTimeFormat(uiLang, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div>
      <ul className="rounded-xl border border-slate-800 divide-y divide-slate-800 bg-slate-900/40">
        {items.map((tx) => (
          <li
            key={tx.id}
            className="px-3 py-2.5 flex items-center justify-between gap-3 text-sm"
          >
            <div className="min-w-0 flex items-center gap-2">
              <KindBadge kind={tx.kind} uiLang={uiLang} />
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500">
                  {dateFmt.format(new Date(tx.createdAt))}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {describeTransaction(tx, uiLang)}
                </div>
              </div>
            </div>
            <div
              className={`text-sm font-bold whitespace-nowrap ${
                tx.delta >= 0 ? "text-bullish-500" : "text-bearish-400"
              }`}
            >
              {tx.delta >= 0 ? "+" : ""}
              {tx.delta.toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200"
        >
          {loadingMore ? "…" : t("loadMore", uiLang)}
        </button>
      )}
    </div>
  );
}

function KindBadge({
  kind,
  uiLang,
}: {
  kind: CreditTransaction["kind"];
  uiLang: SupportedLanguageCode;
}) {
  const cfg: Record<
    CreditTransaction["kind"],
    { label: string; classes: string }
  > = {
    signup_bonus: {
      label: t("kindSignupBonus", uiLang),
      classes: "bg-brand-500/15 text-brand-400 border-brand-500/30",
    },
    purchase: {
      label: t("kindPurchase", uiLang),
      classes: "bg-bullish-500/15 text-bullish-500 border-bullish-500/30",
    },
    spend: {
      label: t("kindSpend", uiLang),
      classes: "bg-bearish-500/10 text-bearish-400 border-bearish-500/20",
    },
    refund: {
      label: t("kindRefund", uiLang),
      classes: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
    },
    adjustment: {
      label: t("kindAdjustment", uiLang),
      classes: "bg-slate-800 text-slate-300 border-slate-700",
    },
  };
  const c = cfg[kind];
  return (
    <span
      className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${c.classes}`}
    >
      {c.label}
    </span>
  );
}

function describeTransaction(
  tx: CreditTransaction,
  uiLang: SupportedLanguageCode,
): string {
  if (tx.kind === "spend" && tx.assetCount && tx.wordCount) {
    return `${tx.assetCount} ${t("portfolio", uiLang).toLowerCase()} · ${tx.wordCount} ${t("words", uiLang)}`;
  }
  if ((tx.kind === "purchase" || tx.kind === "refund") && tx.packageId) {
    return tx.packageId;
  }
  return "—";
}

function PortfolioEditor({
  settings,
  uiLang,
  authed,
  onAdd,
  onRemove,
}: {
  settings: ExtensionSettings;
  uiLang: SupportedLanguageCode;
  authed: boolean;
  onAdd: (a: Asset) => void;
  onRemove: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TickerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    if (!authed) {
      setResults([]);
      setError(null);
      return;
    }
    if (query.trim().length < 1) {
      setResults([]);
      setError(null);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await searchTickers(
          settings.backendUrl,
          query.trim(),
          settings.preferredRegion === "global" ? undefined : settings.preferredRegion,
          25,
        );
        setResults(res.results);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError((err as Error).message);
        }
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, settings.backendUrl, settings.preferredRegion, authed]);

  return (
    <div>
      {settings.portfolio.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {settings.portfolio.map((a) => (
            <span
              key={a.symbol}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs"
            >
              <span className="font-bold">{a.symbol}</span>
              <span className="text-slate-400 max-w-[140px] truncate">{a.name}</span>
              <button
                onClick={() => onRemove(a.symbol)}
                aria-label={t("remove", uiLang)}
                className="ml-1 text-slate-500 hover:text-bearish-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            authed ? t("searchPlaceholder", uiLang) : t("signInRequiredBody", uiLang)
          }
          disabled={!authed}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 disabled:opacity-50"
        />
      </div>

      {loading && (
        <div className="mt-2 text-xs text-slate-500">…</div>
      )}
      {error && (
        <div className="mt-2 text-xs text-bearish-500">{error}</div>
      )}

      {results.length > 0 && (
        <ul className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-800 divide-y divide-slate-800 bg-slate-900/50">
          {results.map((r) => {
            const exists = settings.portfolio.some((p) => p.symbol === r.symbol);
            return (
              <li
                key={r.symbol}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-900"
              >
                <div className="min-w-0">
                  <div className="font-bold">{r.displaySymbol || r.symbol}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {r.description}
                    {r.exchange && (
                      <span className="ml-2 text-slate-600">· {r.exchange}</span>
                    )}
                    {r.type && (
                      <span className="ml-2 text-slate-600">· {r.type}</span>
                    )}
                  </div>
                </div>
                <button
                  disabled={exists}
                  onClick={() =>
                    onAdd({
                      symbol: r.symbol,
                      name: r.description,
                      exchange: r.exchange ?? "US",
                      type:
                        r.type?.toUpperCase().includes("ETF")
                          ? "etf"
                          : r.type?.toUpperCase().includes("INDEX")
                            ? "index"
                            : "stock",
                      region: r.region,
                    })
                  }
                  className="ml-3 text-xs font-semibold px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                >
                  {exists ? "✓" : t("add", uiLang)}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !error && query.length >= 1 && results.length === 0 && authed && (
        <div className="mt-2 text-xs text-slate-500">{t("noResults", uiLang)}</div>
      )}
    </div>
  );
}

// ===================================================================
// Danger Zone — account deletion
//
// GDPR Art. 17 / KVKK Madde 11 / Web Store policy: every signed-in
// account must have a self-service delete button. The flow:
//
//   1. User clicks "Delete account" — opens DeleteAccountModal.
//   2. Modal lists what will be deleted (account, portfolio, history,
//      credits, active subscription if any).
//   3. If the user has a live subscription, an opt-in checkbox lets
//      them also request a refund of the most recent payment.
//   4. User must literally type "delete" to enable the submit button —
//      same anti-misclick pattern Stripe / Linear / GitHub use.
//   5. On submit we call DELETE /api/auth/account; backend cancels the
//      subscription, optionally refunds, and deletes the user row.
//   6. We sign the user out locally and reset to the anon UI.
//
// Re-signup with the same email is intentionally allowed but does not
// receive a fresh 25-credit signup bonus (anti-abuse — see migration
// 004 `deleted_users`).
// ===================================================================
function DangerZoneSection({
  backendUrl,
  uiLang,
  portfolioCount,
  balance,
  onDeleted,
}: {
  backendUrl: string;
  uiLang: SupportedLanguageCode;
  portfolioCount: number;
  balance: number;
  onDeleted: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-bearish-500/30 bg-bearish-500/5 p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-bearish-400">
              {t("deleteAccount", uiLang)}
            </div>
            <div className="mt-1 text-xs text-slate-400 leading-relaxed">
              {t("dangerZoneDescription", uiLang)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-bearish-500/40 text-bearish-400 hover:bg-bearish-500/10"
          >
            {t("deleteAccount", uiLang)}
          </button>
        </div>
      </div>

      {open && (
        <DeleteAccountModal
          backendUrl={backendUrl}
          uiLang={uiLang}
          portfolioCount={portfolioCount}
          balance={balance}
          onClose={() => setOpen(false)}
          onDeleted={async () => {
            setOpen(false);
            await onDeleted();
          }}
        />
      )}
    </>
  );
}

function DeleteAccountModal({
  backendUrl,
  uiLang,
  portfolioCount,
  balance,
  onClose,
  onDeleted,
}: {
  backendUrl: string;
  uiLang: SupportedLanguageCode;
  portfolioCount: number;
  balance: number;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
}) {
  const [confirmInput, setConfirmInput] = useState("");
  const [refundOptIn, setRefundOptIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(
    null,
  );
  const [subLoading, setSubLoading] = useState(true);

  // Look up the user's subscription once on open so we can show the
  // accurate "your X subscription will be cancelled" line and the
  // refund checkbox only when there is something to refund.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sub = await fetchSubscription(backendUrl);
        if (!cancelled) setSubscription(sub);
      } catch {
        // Subscription lookup is non-critical for the delete flow. Fall
        // through with null and the modal hides the sub-specific UI.
        if (!cancelled) setSubscription(null);
      } finally {
        if (!cancelled) setSubLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backendUrl]);

  const hasActiveSub =
    subscription !== null &&
    subscription.active === true &&
    !subscription.cancelAtPeriodEnd;

  const canSubmit = confirmInput.trim().toLowerCase() === "delete" && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteAccount(backendUrl, {
        refundCurrentPeriod: hasActiveSub && refundOptIn,
      });
      // Best-effort: clear cached chrome.storage.local so a fresh
      // re-signup on this device starts from scratch.
      try {
        await chrome.storage.local.clear();
      } catch {
        // ignore — clearing local cache is a nicety, not a requirement.
      }
      await onDeleted();
    } catch (err) {
      const e = err as ApiError;
      if (e.code === "REFUND_FAILED") {
        setError(t("deleteAccountRefundFailed", uiLang));
      } else {
        setError(t("deleteAccountFailed", uiLang));
      }
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bearish-500/10 text-bearish-400 ring-1 ring-inset ring-bearish-500/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2
                id="delete-account-title"
                className="text-base font-semibold text-slate-100"
              >
                {t("deleteAccountModalTitle", uiLang)}
              </h2>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {t("deleteAccountModalLead", uiLang)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Bullet />
              <span>
                {balance.toLocaleString()} {t("credits", uiLang)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Bullet />
              <span>
                {portfolioCount} {t("portfolio", uiLang).toLowerCase()}
              </span>
            </div>
            {!subLoading && hasActiveSub && (
              <div className="flex items-start gap-2">
                <Bullet />
                <span>
                  {t("deleteAccountListSubscription", uiLang).replace(
                    "{plan}",
                    subscription?.active
                      ? subscription.packageId
                      : "",
                  )}
                </span>
              </div>
            )}
          </div>

          {!subLoading && hasActiveSub && (
            <label className="mt-4 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={refundOptIn}
                onChange={(e) => setRefundOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 accent-bearish-500"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                {t("deleteAccountRefundOption", uiLang)}
                {refundOptIn && (
                  <span className="block mt-1 text-[11px] text-slate-500">
                    {t("deleteAccountRefundHint", uiLang)}
                  </span>
                )}
              </span>
            </label>
          )}

          <div className="mt-5">
            <label
              htmlFor="delete-confirm-input"
              className="block text-xs text-slate-400 mb-2"
            >
              {t("deleteAccountTypeDelete", uiLang)}
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="delete"
              autoComplete="off"
              autoFocus
              disabled={submitting}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-bearish-500 disabled:opacity-50"
            />
          </div>

          <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
            {t("deleteAccountReSignupHint", uiLang)}
          </p>

          {error && (
            <div className="mt-3 rounded-lg border border-bearish-500/40 bg-bearish-500/10 px-3 py-2 text-xs text-bearish-400">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50"
          >
            {t("cancel", uiLang)}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-bearish-600 hover:bg-bearish-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting
              ? t("deleteAccountSubmitting", uiLang)
              : t("deleteAccountSubmit", uiLang)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Bullet() {
  return (
    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-bearish-500" />
  );
}
