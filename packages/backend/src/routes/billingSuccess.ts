import type { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../services/supabase.js";

type Locale =
  | "en"
  | "tr"
  | "de"
  | "fr"
  | "es"
  | "it"
  | "pt"
  | "nl"
  | "ja"
  | "zh"
  | "ko"
  | "ar"
  | "ru";

const LOCALES: Record<Locale, {
  title: string;
  heading: string;
  lede: string;
  status: string;
  statusConfirmed: string;
  statusStuck: string;
  newBalance: string;
  creditsAdded: string;
  meta: string;
  ctaOpen: string;
  ctaClose: string;
  ctaCloseFallback: string;
  footer: string;
  credits: string;
}> = {
  en: {
    title: "Thanks — Lirefin",
    heading: "Payment received",
    lede: "Your credits are being added to your account. This can take a few seconds.",
    status: "Confirming",
    statusConfirmed: "Confirmed",
    statusStuck: "Not confirmed yet — try refreshing",
    newBalance: "New balance",
    creditsAdded: "added",
    meta: "Charged via Dodo Payments",
    ctaOpen: "Open Lirefin",
    ctaClose: "Close this tab",
    ctaCloseFallback: "You can safely close this tab.",
    footer: "Credits never expire. Lirefin AI commentary is not investment advice.",
    credits: "credits",
  },
  tr: {
    title: "Teşekkürler — Lirefin",
    heading: "Ödeme alındı",
    lede: "Krediler hesabınıza işleniyor. Bu birkaç saniye sürebilir.",
    status: "Onaylanıyor",
    statusConfirmed: "Onaylandı",
    statusStuck: "Henüz onaylanmadı — sayfayı yenileyin",
    newBalance: "Yeni bakiye",
    creditsAdded: "eklendi",
    meta: "Dodo Payments üzerinden tahsilat",
    ctaOpen: "Lirefin'e dön",
    ctaClose: "Bu sekmeyi kapat",
    ctaCloseFallback: "Bu sekmeyi rahatça kapatabilirsiniz.",
    footer: "Krediler süresiz geçerlidir. Lirefin yapay zekâ üretimi yorumlar yatırım tavsiyesi değildir.",
    credits: "kredi",
  },
  de: {
    title: "Danke — Lirefin",
    heading: "Zahlung erhalten",
    lede: "Ihre Credits werden gerade auf Ihr Konto gebucht. Dies kann einige Sekunden dauern.",
    status: "Wird bestätigt",
    statusConfirmed: "Bestätigt",
    statusStuck: "Noch nicht bestätigt — bitte neu laden",
    newBalance: "Neuer Kontostand",
    creditsAdded: "hinzugefügt",
    meta: "Abrechnung über Dodo Payments",
    ctaOpen: "Lirefin öffnen",
    ctaClose: "Diesen Tab schließen",
    ctaCloseFallback: "Sie können diesen Tab nun schließen.",
    footer: "Credits verfallen nie. Lirefin-KI-Kommentare sind keine Anlageberatung.",
    credits: "Credits",
  },
  fr: {
    title: "Merci — Lirefin",
    heading: "Paiement reçu",
    lede: "Vos crédits sont en cours d'ajout à votre compte. Cela peut prendre quelques secondes.",
    status: "Confirmation",
    statusConfirmed: "Confirmé",
    statusStuck: "Pas encore confirmé — actualisez la page",
    newBalance: "Nouveau solde",
    creditsAdded: "ajoutés",
    meta: "Facturé via Dodo Payments",
    ctaOpen: "Ouvrir Lirefin",
    ctaClose: "Fermer cet onglet",
    ctaCloseFallback: "Vous pouvez fermer cet onglet.",
    footer: "Les crédits n'expirent jamais. Les commentaires IA de Lirefin ne sont pas un conseil d'investissement.",
    credits: "crédits",
  },
  es: {
    title: "Gracias — Lirefin",
    heading: "Pago recibido",
    lede: "Tus créditos se están añadiendo a tu cuenta. Esto puede tardar unos segundos.",
    status: "Confirmando",
    statusConfirmed: "Confirmado",
    statusStuck: "Aún no confirmado — recarga la página",
    newBalance: "Nuevo saldo",
    creditsAdded: "añadidos",
    meta: "Cobro a través de Dodo Payments",
    ctaOpen: "Abrir Lirefin",
    ctaClose: "Cerrar esta pestaña",
    ctaCloseFallback: "Ya puedes cerrar esta pestaña.",
    footer: "Los créditos no caducan. Los comentarios de IA de Lirefin no son asesoramiento de inversión.",
    credits: "créditos",
  },
  it: {
    title: "Grazie — Lirefin",
    heading: "Pagamento ricevuto",
    lede: "I tuoi crediti sono in fase di accredito. Potrebbe volerci qualche secondo.",
    status: "In conferma",
    statusConfirmed: "Confermato",
    statusStuck: "Non ancora confermato — ricarica la pagina",
    newBalance: "Nuovo saldo",
    creditsAdded: "aggiunti",
    meta: "Addebito tramite Dodo Payments",
    ctaOpen: "Apri Lirefin",
    ctaClose: "Chiudi questa scheda",
    ctaCloseFallback: "Puoi chiudere questa scheda.",
    footer: "I crediti non scadono. I commenti AI di Lirefin non sono consigli di investimento.",
    credits: "crediti",
  },
  pt: {
    title: "Obrigado — Lirefin",
    heading: "Pagamento recebido",
    lede: "Seus créditos estão sendo adicionados à sua conta. Isso pode levar alguns segundos.",
    status: "Confirmando",
    statusConfirmed: "Confirmado",
    statusStuck: "Ainda não confirmado — recarregue a página",
    newBalance: "Novo saldo",
    creditsAdded: "adicionados",
    meta: "Cobrado via Dodo Payments",
    ctaOpen: "Abrir Lirefin",
    ctaClose: "Fechar esta aba",
    ctaCloseFallback: "Você pode fechar esta aba.",
    footer: "Os créditos não expiram. Os comentários de IA do Lirefin não são consultoria de investimento.",
    credits: "créditos",
  },
  nl: {
    title: "Bedankt — Lirefin",
    heading: "Betaling ontvangen",
    lede: "Je credits worden toegevoegd aan je account. Dit kan enkele seconden duren.",
    status: "Bevestigen",
    statusConfirmed: "Bevestigd",
    statusStuck: "Nog niet bevestigd — vernieuw de pagina",
    newBalance: "Nieuw saldo",
    creditsAdded: "toegevoegd",
    meta: "Betaald via Dodo Payments",
    ctaOpen: "Open Lirefin",
    ctaClose: "Dit tabblad sluiten",
    ctaCloseFallback: "Je kunt dit tabblad sluiten.",
    footer: "Credits verlopen nooit. Lirefin AI-commentaar is geen beleggingsadvies.",
    credits: "credits",
  },
  ja: {
    title: "ありがとうございます — Lirefin",
    heading: "お支払いを受領しました",
    lede: "クレジットを口座に追加しています。数秒かかる場合があります。",
    status: "確認中",
    statusConfirmed: "確認済み",
    statusStuck: "まだ確認されていません — 更新してください",
    newBalance: "新しい残高",
    creditsAdded: "追加",
    meta: "Dodo Payments 経由で請求",
    ctaOpen: "Lirefin を開く",
    ctaClose: "このタブを閉じる",
    ctaCloseFallback: "このタブは閉じても安全です。",
    footer: "クレジットに有効期限はありません。Lirefin の AI コメントは投資アドバイスではありません。",
    credits: "クレジット",
  },
  zh: {
    title: "感谢 — Lirefin",
    heading: "已收到付款",
    lede: "您的额度正在添加到您的账户中。这可能需要几秒钟。",
    status: "确认中",
    statusConfirmed: "已确认",
    statusStuck: "尚未确认 — 请刷新页面",
    newBalance: "新余额",
    creditsAdded: "已添加",
    meta: "通过 Dodo Payments 收费",
    ctaOpen: "打开 Lirefin",
    ctaClose: "关闭此标签页",
    ctaCloseFallback: "您可以安全地关闭此标签页。",
    footer: "额度永不过期。Lirefin AI 评论不是投资建议。",
    credits: "额度",
  },
  ko: {
    title: "감사합니다 — Lirefin",
    heading: "결제가 접수되었습니다",
    lede: "크레딧이 계정에 추가되고 있습니다. 몇 초 정도 걸릴 수 있습니다.",
    status: "확인 중",
    statusConfirmed: "확인됨",
    statusStuck: "아직 확인되지 않음 — 새로고침해 주세요",
    newBalance: "새 잔액",
    creditsAdded: "추가됨",
    meta: "Dodo Payments를 통한 결제",
    ctaOpen: "Lirefin 열기",
    ctaClose: "이 탭 닫기",
    ctaCloseFallback: "이 탭을 닫아도 됩니다.",
    footer: "크레딧은 만료되지 않습니다. Lirefin AI 코멘트는 투자 조언이 아닙니다.",
    credits: "크레딧",
  },
  ar: {
    title: "شكرًا — Lirefin",
    heading: "تم استلام الدفع",
    lede: "تتم إضافة الأرصدة إلى حسابك. قد يستغرق ذلك بضع ثوانٍ.",
    status: "قيد التأكيد",
    statusConfirmed: "تم التأكيد",
    statusStuck: "لم يتم التأكيد بعد — حاول التحديث",
    newBalance: "الرصيد الجديد",
    creditsAdded: "تمت الإضافة",
    meta: "تم الدفع عبر Dodo Payments",
    ctaOpen: "فتح Lirefin",
    ctaClose: "إغلاق علامة التبويب هذه",
    ctaCloseFallback: "يمكنك إغلاق علامة التبويب الآن.",
    footer: "الأرصدة لا تنتهي صلاحيتها. تعليقات Lirefin بالذكاء الاصطناعي ليست نصيحة استثمارية.",
    credits: "رصيد",
  },
  ru: {
    title: "Спасибо — Lirefin",
    heading: "Оплата получена",
    lede: "Кредиты зачисляются на ваш счёт. Это может занять несколько секунд.",
    status: "Подтверждение",
    statusConfirmed: "Подтверждено",
    statusStuck: "Ещё не подтверждено — обновите страницу",
    newBalance: "Новый баланс",
    creditsAdded: "добавлено",
    meta: "Оплачено через Dodo Payments",
    ctaOpen: "Открыть Lirefin",
    ctaClose: "Закрыть эту вкладку",
    ctaCloseFallback: "Можете спокойно закрыть эту вкладку.",
    footer: "Кредиты никогда не истекают. Комментарии ИИ Lirefin не являются инвестиционным советом.",
    credits: "кредитов",
  },
};

function isLocale(value: string): value is Locale {
  return value in LOCALES;
}

/**
 * Public landing page for the URL the billing provider redirects to after
 * a successful checkout. Two query-param shapes are supported so we can
 * handle both providers during the migration window:
 *
 *   • DodoPayments  → ?payment_id=pay_…&status=succeeded[&subscription_id=sub_…]
 *   • Polar.sh      → ?checkout_id=…  (legacy)
 *
 * The page itself is a tiny inlined HTML document — no React, no Tailwind —
 * because it runs on a different origin from the extension and we want a
 * fast paint with zero CSP gymnastics.
 *
 * UX:
 *   1. Provider redirects → /billing/success?payment_id=… (or ?checkout_id=…)
 *   2. The HTML kicks off a polling loop that hits /billing/status with
 *      whichever id we received.
 *   3. As soon as the webhook flips the row to "completed" we render the
 *      credit total and the "open Lirefin" CTA.
 *
 * If neither id ever resolves (very rare — webhook could not be delivered)
 * we surface a friendly fallback after ~30s telling the user to refresh;
 * the credits will still land via the next webhook retry.
 */

const HTML_TEMPLATE = (locale: Locale) => {
  const L = LOCALES[locale];
  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${L.title}</title>
  <style>
    :root {
      color-scheme: dark;
      --brand: #2563eb;
      --brand-light: #3b82f6;
      --bullish: #10b981;
      --bg: #020617;
      --panel: #0f172a;
      --border: #1e293b;
      --text: #e2e8f0;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0; height: 100%;
      background: radial-gradient(1200px 600px at 50% -200px, rgba(37,99,235,0.18), transparent 60%), var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      font-feature-settings: "cv11", "ss01";
      -webkit-font-smoothing: antialiased;
    }
    main {
      max-width: 480px;
      margin: 0 auto;
      padding: 80px 24px 40px;
      text-align: center;
    }
    .logo {
      width: 64px; height: 64px;
      border-radius: 16px;
      background: linear-gradient(135deg, var(--brand) 0%, var(--bullish) 100%);
      display: inline-flex; align-items: center; justify-content: center;
      box-shadow: 0 12px 40px -8px rgba(37,99,235,0.6);
      margin-bottom: 20px;
    }
    .logo svg { width: 36px; height: 36px; color: #fff; }
    h1 {
      font-size: 24px; font-weight: 800;
      margin: 0 0 8px;
      letter-spacing: -0.02em;
    }
    .lede {
      color: var(--muted);
      font-size: 14px; line-height: 1.6;
      margin: 0 0 32px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 16px;
    }
    .status {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 6px 12px; border-radius: 999px;
      background: rgba(16,185,129,0.1);
      color: var(--bullish);
    }
    .status.pending {
      background: rgba(148,163,184,0.1);
      color: var(--muted);
    }
    .status .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: currentColor;
    }
    .status.pending .dot {
      animation: pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    .credits {
      margin-top: 16px;
      font-size: 40px; font-weight: 800;
      letter-spacing: -0.03em;
      color: #fff;
    }
    .credits-label {
      font-size: 12px; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.1em;
      font-weight: 600;
    }
    .meta {
      margin-top: 12px; font-size: 12px; color: var(--muted);
    }
    .cta {
      display: inline-block;
      padding: 12px 24px;
      border-radius: 10px;
      background: var(--brand);
      color: #fff !important;
      font-weight: 700; font-size: 14px;
      text-decoration: none;
      box-shadow: 0 8px 20px -6px rgba(37,99,235,0.6);
    }
    .cta:hover { background: var(--brand-light); }
    .ghost {
      display: inline-block;
      margin-top: 12px;
      font-size: 12px;
      color: var(--muted);
      text-decoration: none;
    }
    .ghost:hover { color: var(--text); }
    .footer {
      margin-top: 48px;
      font-size: 11px; color: var(--muted);
      line-height: 1.6;
    }
    .skeleton {
      display: inline-block;
      width: 80px; height: 36px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
      background-size: 200% 100%;
      border-radius: 8px;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  </style>
</head>
<body>
  <main>
    <div class="logo" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </div>
    <h1 id="title">${L.heading}</h1>
    <p class="lede" id="lede">${L.lede}</p>

    <div class="card">
      <div id="status" class="status pending">
        <span class="dot"></span>
        <span id="status-label">${L.status}</span>
      </div>
      <div class="credits-label" style="margin-top:24px">${L.newBalance}</div>
      <div class="credits"><span id="balance" class="skeleton" aria-label="loading"></span></div>
      <div class="meta" id="meta">${L.meta}</div>
    </div>

    <a href="javascript:void(0)" id="cta" class="cta">${L.ctaOpen}</a>
    <br />
    <a href="javascript:void(0)" id="close-link" class="ghost">${L.ctaClose}</a>
    <div id="close-fallback" class="ghost" style="display:none;margin-top:8px;color:var(--muted);">${L.ctaCloseFallback}</div>

    <p class="footer">${L.footer}</p>
  </main>

  <script>
    (function () {
      var params = new URLSearchParams(location.search);
      // Three possible param shapes during the Polar → Dodo migration:
      //   • Dodo one-time payment   → ?payment_id=pay_…
      //   • Dodo subscription       → ?subscription_id=sub_…  (NO payment_id)
      //   • Polar (legacy)          → ?checkout_id=…
      // Order of preference: payment_id → subscription_id → checkout_id.
      var paymentId = params.get("payment_id");
      var subscriptionId = params.get("subscription_id");
      var checkoutId = params.get("checkout_id");
      var statusEl = document.getElementById("status");
      var statusLabel = document.getElementById("status-label");
      var balanceEl = document.getElementById("balance");
      var metaEl = document.getElementById("meta");
      var closeFallback = document.getElementById("close-fallback");

      var done = false;
      var attempts = 0;
      var MAX_ATTEMPTS = 24; // ~36s @ 1.5s

      function setSuccess(creditsAdded, balance, packageId) {
        done = true;
        statusEl.classList.remove("pending");
        statusLabel.textContent = ${JSON.stringify(L.statusConfirmed)};
        balanceEl.classList.remove("skeleton");
        // Show the user's *current* balance as the headline number when we
        // have it (more useful than just the package size). Fall back to the
        // package credits if the balance lookup failed for any reason.
        var headline = (typeof balance === "number" ? balance : creditsAdded);
        balanceEl.textContent = headline.toLocaleString();
        balanceEl.removeAttribute("aria-label");
        // Always reveal "+N credits added (packageId)" so the user can see
        // exactly what landed during this purchase.
        var addedSuffix = packageId ? " (" + packageId + ")" : "";
        metaEl.textContent =
          "+" + creditsAdded + " " + ${JSON.stringify(L.credits)} +
          " " + ${JSON.stringify(L.creditsAdded)} + addedSuffix;
      }

      function setStuck() {
        statusLabel.textContent = ${JSON.stringify(L.statusStuck)};
      }

      function poll() {
        if (done) return;
        attempts += 1;
        if (attempts > MAX_ATTEMPTS) {
          setStuck();
          return;
        }
        var queryParam = paymentId
          ? "payment_id=" + encodeURIComponent(paymentId)
          : subscriptionId
            ? "subscription_id=" + encodeURIComponent(subscriptionId)
            : checkoutId
              ? "checkout_id=" + encodeURIComponent(checkoutId)
              : null;
        if (!queryParam) {
          setStuck();
          return;
        }
        fetch("/billing/status?" + queryParam, {
          credentials: "omit",
        })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (data) {
            if (data && data.status === "completed" && typeof data.credits === "number") {
              setSuccess(data.credits, data.balance, data.packageId);
            } else {
              setTimeout(poll, 1500);
            }
          })
          .catch(function () { setTimeout(poll, 1500); });
      }

      poll();

      // Chrome/Firefox only allow window.close() on tabs that JavaScript
      // opened (window.open). Tabs reached via top-level navigation — like
      // this provider redirect — cannot be closed programmatically. We try
      // anyway, and if we're still alive 200ms later we surface a friendly
      // hint asking the user to close the tab manually.
      function attemptClose() {
        var preCloseAt = Date.now();
        try { window.close(); } catch (_) {}
        setTimeout(function () {
          if (Date.now() - preCloseAt < 5000 && !document.hidden) {
            closeFallback.style.display = "block";
          }
        }, 200);
      }

      document.getElementById("cta").addEventListener("click", function (e) {
        e.preventDefault();
        attemptClose();
      });
      document.getElementById("close-link").addEventListener("click", function (e) {
        e.preventDefault();
        attemptClose();
      });
    })();
  </script>
</body>
</html>`;
};

function pickLocaleFromAccept(acceptLanguage: string | undefined): Locale {
  if (!acceptLanguage) return "en";
  const lower = acceptLanguage.toLowerCase();
  // Match the first 2-letter prefix of any of the accepted languages so
  // `tr-TR,tr;q=0.9,en;q=0.8` correctly resolves to `tr`.
  const tags = lower.split(",").map((s) => s.split(";")[0]?.trim() ?? "");
  for (const tag of tags) {
    const prefix = tag.slice(0, 2);
    if (isLocale(prefix)) return prefix;
  }
  return "en";
}

function pickLocale(query: unknown, acceptLanguage: string | undefined): Locale {
  // Explicit `?lang=tr` wins — that's what the extension passes through so
  // the success page matches the user's chosen UI language.
  const lang =
    typeof query === "object" &&
    query !== null &&
    typeof (query as { lang?: unknown }).lang === "string"
      ? (query as { lang: string }).lang.toLowerCase().slice(0, 2)
      : null;
  if (lang && isLocale(lang)) return lang;
  return pickLocaleFromAccept(acceptLanguage);
}

export async function billingSuccessRoute(app: FastifyInstance) {
  app.get("/billing/success", async (req, reply) => {
    const acceptLanguage = req.headers["accept-language"];
    const locale = pickLocale(
      req.query,
      Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage,
    );
    return reply
      .type("text/html; charset=utf-8")
      .header("cache-control", "private, max-age=0, no-store")
      .send(HTML_TEMPLATE(locale));
  });

  // Polled by the success page to detect when the webhook has landed. We
  // only return shape-stable JSON; nothing privileged is exposed because
  // the lookup ids themselves are unguessable and we respond identically
  // for unknown ids and pending ones.
  //
  // Three lookup strategies exist depending on which provider redirected
  // the user:
  //
  //   • Dodo one-time     → ?payment_id=pay_… : direct lookup in
  //                          `purchases` because the webhook stores the
  //                          payment id verbatim as `provider_order_id`.
  //   • Dodo subscription → ?subscription_id=sub_… : Dodo subscription
  //                          checkouts redirect WITHOUT a payment_id, so
  //                          we resolve the user via the `subscriptions`
  //                          table and then pull their most recent
  //                          completed Dodo purchase (= the one this
  //                          checkout just produced).
  //   • Polar (legacy)    → ?checkout_id=… : extra Polar
  //                          `orders.list({ checkoutId })` roundtrip to
  //                          translate the checkout id into the order id
  //                          we actually persisted. Kept for backwards
  //                          compatibility with the legacy Polar success
  //                          URLs.
  app.get("/billing/status", async (req, reply) => {
    const q = (req.query ?? {}) as {
      payment_id?: string;
      subscription_id?: string;
      checkout_id?: string;
    };
    const paymentId =
      typeof q.payment_id === "string" && q.payment_id.length > 0
        ? q.payment_id
        : null;
    const subscriptionId =
      typeof q.subscription_id === "string" && q.subscription_id.length > 0
        ? q.subscription_id
        : null;
    const checkoutId =
      typeof q.checkout_id === "string" && q.checkout_id.length > 0
        ? q.checkout_id
        : null;
    if (!paymentId && !subscriptionId && !checkoutId) {
      return reply.code(400).send({
        error: "payment_id, subscription_id or checkout_id is required",
      });
    }

    // ---- Subscription path: resolve the user, then fetch their
    // most recent Dodo purchase (= the one this checkout produced). The
    // webhook will create / update the subscriptions row before the
    // payment.succeeded webhook lands, so a missing row here means the
    // first webhook hasn't been delivered yet — return "pending".
    if (!paymentId && subscriptionId) {
      const { data: subRow, error: subErr } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id")
        .eq("subscription_id", subscriptionId)
        .maybeSingle();
      if (subErr) {
        app.log.warn({ err: subErr }, "billing status: subs lookup failed");
        return reply.send({ status: "pending" });
      }
      const userId = subRow?.user_id;
      if (!userId) {
        return reply.send({ status: "pending" });
      }
      // Pull the most recent completed Dodo purchase for this user. The
      // 30-minute window protects against returning a stale earlier
      // purchase if the webhook for *this* checkout is still in flight.
      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: purchase, error: pErr } = await supabaseAdmin
        .from("purchases")
        .select("status, credits, package_id, user_id, created_at")
        .eq("user_id", userId)
        .eq("provider", "dodo")
        .eq("status", "completed")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pErr) {
        app.log.warn({ err: pErr }, "billing status: purchases lookup failed");
        return reply.send({ status: "pending" });
      }
      if (!purchase) {
        return reply.send({ status: "pending" });
      }
      const balance = await readBalance(purchase.user_id);
      return reply.send({
        status: "completed",
        credits: purchase.credits,
        packageId: purchase.package_id,
        balance,
      });
    }

    // ---- Payment-id / checkout-id path: resolve to a single id we can
    // use against `purchases.provider_order_id`.
    let providerOrderId: string | null = paymentId;
    if (!providerOrderId && checkoutId) {
      try {
        const { polarClient } = await import("../services/polar.js");
        const polar = polarClient();
        const page = await polar.orders.list({ checkoutId, limit: 1 });
        const items = page.result?.items ?? [];
        providerOrderId = items[0]?.id ?? null;
      } catch {
        // Polar call failed (likely because POLAR_ACCESS_TOKEN is empty
        // post-migration). The webhook may still resolve later, so
        // surface a `pending` rather than a hard error.
        return reply.send({ status: "pending" });
      }
    }
    if (!providerOrderId) {
      return reply.send({ status: "pending" });
    }

    const { data, error } = await supabaseAdmin
      .from("purchases")
      .select("status, credits, package_id, user_id")
      .eq("provider_order_id", providerOrderId)
      .maybeSingle();

    if (error) {
      app.log.warn({ err: error }, "billing status lookup failed");
      return reply.send({ status: "pending" });
    }
    if (!data) {
      return reply.send({ status: "pending" });
    }
    if (data.status !== "completed") {
      return reply.send({ status: data.status });
    }

    const balance = await readBalance(data.user_id);
    return reply.send({
      status: "completed",
      credits: data.credits,
      packageId: data.package_id,
      balance,
    });
  });

  // Reads the user's current balance after the credit was applied. We do
  // this on every status response (instead of snapshotting it on the
  // purchases row) so the success page reflects any spends that happened
  // between webhook delivery and the user landing on the page.
  async function readBalance(userId: string | null): Promise<number | null> {
    if (!userId) return null;
    const { data: bal } = await supabaseAdmin
      .from("credit_balances")
      .select("credits")
      .eq("user_id", userId)
      .maybeSingle();
    return typeof bal?.credits === "number" ? bal.credits : null;
  }
}
