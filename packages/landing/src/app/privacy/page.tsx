import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Lirefin collects, uses, and protects your data. Privacy-first by design.",
  robots: { index: true, follow: true },
};

const lastUpdated = "May 10, 2026";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated={lastUpdated}>
      <section>
        <p>
          This Privacy Policy explains how Lirefin (&quot;we&quot;,
          &quot;us&quot;, &quot;our&quot;) collects, uses, and shares
          information when you use the Lirefin Chrome extension, our website at{" "}
          <Link href="/">lirefin.com</Link>, and related backend services
          (collectively, the &quot;Service&quot;).
        </p>
        <p>
          We designed Lirefin to do its job with as little personal data as
          possible. We do not sell your data, we do not advertise on it, and
          we do not log article text persistently.
        </p>
      </section>

      <section>
        <h2>1. Information we collect</h2>

        <h3>1.1 Account information</h3>
        <p>
          When you sign in with Google, our authentication provider Supabase
          stores your email address, Google account ID, and profile picture
          URL. We use this only to identify your account, sync settings across
          your devices, and contact you about the Service.
        </p>

        <h3>1.2 Portfolio data</h3>
        <p>
          You voluntarily configure a list of tickers (e.g. AAPL, MSFT, BTC)
          and ETFs you want analyses for. This list is stored in your account
          and synced via Chrome storage. We use it solely to filter and
          contextualize the analyses we generate for you. You can edit or
          delete your portfolio at any time from the extension&apos;s settings
          panel.
        </p>

        <h3>1.3 Article content (transient)</h3>
        <p>
          When you press <strong>Analyze</strong> on a financial news article,
          the extension extracts the article text using Mozilla Readability
          and sends it to our backend for processing by Anthropic&apos;s
          Claude AI. We do not log article text persistently. Article content
          is held in volatile memory only long enough to generate your
          analysis. A short SHA-256 hash of the article URL and your output
          language is cached for up to 5 minutes to avoid charging you twice
          for the same article — the cache stores the analysis result, not
          the original article text.
        </p>

        <h3>1.4 Usage data</h3>
        <p>
          We log minimal operational metadata: a per-device random UUID
          (generated client-side, used for rate-limiting), the timestamp of
          each analysis, your output language, the number of credits each
          request consumed, and a hashed identifier for the source URL. We do
          not log your full browsing history, the contents of pages you
          visit, your tabs, your cookies, or any form data.
        </p>

        <h3>1.5 Billing data</h3>
        <p>
          Billing is processed by <strong>Dodo Payments</strong>, our
          Merchant-of-Record. Dodo collects the information required to
          process the transaction (name, email, billing country, last four
          digits of payment instrument, tax identifier where required). We
          receive a transaction confirmation and, upon successful payment,
          credit your account. We never see or store full card numbers,
          CVVs, or bank credentials. Dodo&apos;s own privacy policy
          governs the data they collect from you during checkout.
        </p>

        <h3>1.6 Information we do NOT collect</h3>
        <ul>
          <li>Your full browsing history or list of open tabs.</li>
          <li>
            The content of pages you do <em>not</em> explicitly Analyze.
          </li>
          <li>Form data, passwords, or any credentials you type.</li>
          <li>Cookies set by other sites.</li>
          <li>Your IP address beyond standard server access logs.</li>
          <li>Behavioral, advertising, or cross-site tracking data.</li>
        </ul>
      </section>

      <section>
        <h2>2. How we use your information</h2>
        <ul>
          <li>To authenticate you and sync your settings across devices.</li>
          <li>
            To generate AI analyses tailored to the assets in your portfolio.
          </li>
          <li>
            To enforce per-device rate limits and prevent abuse of our backend.
          </li>
          <li>To debug failures and improve reliability of the Service.</li>
          <li>
            To process payments and apply credits to your account (when paid
            plans launch).
          </li>
          <li>
            To communicate with you about your account, security, and material
            changes to the Service.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Sub-processors and third parties</h2>
        <p>
          To run the Service we share strictly necessary information with the
          following sub-processors:
        </p>
        <ul>
          <li>
            <strong>Anthropic</strong> (USA) — receives the article text and
            your portfolio for the duration of one analysis call to generate
            output via Claude. Anthropic does not train its models on data
            sent through their commercial API.
          </li>
          <li>
            <strong>Supabase</strong> (USA / EU) — stores your account,
            portfolio, and credit balance. Hosts our PostgreSQL database
            with row-level security.
          </li>
          <li>
            <strong>Finnhub</strong> (USA) — receives the search string when
            you look up a ticker in the settings panel; returns matching
            global tickers. We do not send your portfolio.
          </li>
          <li>
            <strong>Resend</strong> (USA) — delivers transactional emails
            (one-time codes, account notifications).
          </li>
          <li>
            <strong>Railway</strong> (USA) — hosts our backend service.
          </li>
          <li>
            <strong>Vercel</strong> (USA) — hosts this marketing website.
          </li>
          <li>
            <strong>Google</strong> — provides the OAuth identity flow when
            you sign in with Google.
          </li>
          <li>
            <strong>Dodo Payments</strong> (USA) — our Merchant-of-Record.
            Handles checkout, subscription management, sales tax / VAT,
            and refunds. Dodo collects the personal and payment
            information required to process the transaction.
          </li>
        </ul>
        <p>
          We do not sell or rent your personal information. We do not use it
          for advertising. We will never share your data except (a) with the
          sub-processors listed above as required to run the Service; (b)
          with your explicit consent; or (c) when required by law.
        </p>
      </section>

      <section>
        <h2>4. Data retention</h2>
        <ul>
          <li>
            Account profile: kept for the lifetime of your account; deleted
            within 30 days of account deletion.
          </li>
          <li>
            Portfolio: kept for the lifetime of your account; deleted within
            30 days of account deletion.
          </li>
          <li>
            Article text: not persistently stored. Held in volatile memory
            for the duration of one analysis only.
          </li>
          <li>
            Analysis results: cached for up to 5 minutes server-side; stored
            in your local extension storage if you choose to keep them in
            your local history.
          </li>
          <li>
            Operational logs (timestamps, device UUID, hashed URL, credits
            consumed): up to 90 days.
          </li>
          <li>
            Billing records: kept for 10 years where required by tax law in
            the user&apos;s jurisdiction.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access,
          correct, export, or delete the personal information we hold about
          you, and to object to or restrict our processing of it. Specifically:
        </p>
        <ul>
          <li>
            <strong>EU/EEA + UK (GDPR):</strong> rights of access (Art. 15),
            rectification (Art. 16), erasure (Art. 17), restriction (Art.
            18), portability (Art. 20), and objection (Art. 21).
          </li>
          <li>
            <strong>California (CCPA/CPRA):</strong> rights to know, delete,
            correct, opt out of sale (we do not sell), and limit use of
            sensitive personal information.
          </li>
          <li>
            <strong>Türkiye (KVKK):</strong> the rights set out in Article 11
            of Law No. 6698, including learning whether your personal data
            has been processed, requesting information about it, and
            requesting deletion.
          </li>
        </ul>
        <p>
          To exercise any of these rights, email us at{" "}
          <a href={`mailto:${SITE.legalEmail}`}>{SITE.legalEmail}</a>. We
          respond within 30 days. You can also delete your account from the
          extension&apos;s settings panel at any time.
        </p>
      </section>

      <section>
        <h2>6. Children</h2>
        <p>
          Lirefin is not directed at children under 13 (or under 16 in the
          EU). We do not knowingly collect personal information from
          children. If you believe a child has provided us with personal
          information, please contact us and we will delete it.
        </p>
      </section>

      <section>
        <h2>7. International data transfers</h2>
        <p>
          We are based outside the EU, and our sub-processors are located in
          the United States and the European Union. By using Lirefin you
          acknowledge that your data may be transferred to and processed in
          those jurisdictions. Where required, we rely on Standard
          Contractual Clauses (SCCs) and other lawful transfer mechanisms.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          We use TLS in transit, encrypted-at-rest storage on Supabase,
          row-level security policies, principle-of-least-privilege backend
          credentials, and short-lived JWTs for authentication. No system is
          perfectly secure; if a breach affects you, we will notify you and
          the relevant authorities as required by law.
        </p>
      </section>

      <section>
        <h2>9. Changes to this policy</h2>
        <p>
          If we materially change how we handle your data we will update this
          page and, when the change is significant, notify you by email or
          inside the extension. Continued use of the Service after a change
          constitutes acceptance of the updated policy.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          Questions, complaints, or rights requests:{" "}
          <a href={`mailto:${SITE.legalEmail}`}>{SITE.legalEmail}</a>. See
          also our <Link href="/contact">contact page</Link>.
        </p>
      </section>
    </LegalLayout>
  );
}
