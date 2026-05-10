import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of Lirefin.",
  robots: { index: true, follow: true },
};

const lastUpdated = "May 10, 2026";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated={lastUpdated}>
      <section>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of the
          Lirefin Chrome extension, the website at{" "}
          <Link href="/">lirefin.com</Link>, and our backend services
          (collectively, the &quot;Service&quot;). By installing the
          extension or creating an account, you agree to these Terms. If you
          do not agree, do not use the Service.
        </p>
      </section>

      <section>
        <h2>1. Eligibility</h2>
        <p>
          You must be at least 18 years old (or 16 in the EU, with parental
          consent where required) to use Lirefin. By using the Service you
          represent that you meet this requirement.
        </p>
      </section>

      <section>
        <h2>2. The Service: what Lirefin is and is not</h2>
        <p>
          Lirefin is a <strong>reading and summarization assistant</strong>.
          It uses AI to read financial news articles you choose and produces
          a structured summary of how each article reads with respect to the
          assets in your portfolio (bullish, neutral, or bearish), with
          confidence scores and supporting quotations.
        </p>
        <p>
          <strong>Lirefin is not:</strong>
        </p>
        <ul>
          <li>An investment advisor, broker, or fiduciary.</li>
          <li>A source of investment recommendations.</li>
          <li>A signal service, trading bot, or financial planning tool.</li>
          <li>A guarantee of accuracy or completeness.</li>
        </ul>
        <p>
          AI output is generated from the article text alone. It can be
          wrong, biased, outdated, or hallucinated. <strong>You are solely
          responsible</strong> for any decisions you make. Always verify
          information with primary sources before acting. Lirefin is not
          authorized or regulated by any financial regulator (SEC, FINRA,
          ESMA, BaFin, FCA, SPK, etc.) and does not need to be, because we
          do not provide investment advice.
        </p>
      </section>

      <section>
        <h2>3. Accounts</h2>
        <p>
          You authenticate using a third-party identity provider (Google).
          You are responsible for keeping your Google account secure and for
          all activity that occurs under your Lirefin account. Notify us
          immediately if you suspect unauthorized access at{" "}
          <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
        </p>
      </section>

      <section>
        <h2>4. Credits, plans, and payments</h2>
        <h3>4.1 Free credits</h3>
        <p>
          New accounts receive a one-time free allotment of analysis credits.
          Free credits do not expire as long as your account remains active.
          We reserve the right to revoke free credits granted as a result of
          fraud, abuse, or duplicate accounts.
        </p>

        <h3>4.2 Paid plans (launching soon)</h3>
        <p>
          Paid monthly plans grant you a credit budget that resets at the
          start of each billing cycle. Unused credits do not roll over unless
          your plan documentation explicitly says they do.
        </p>

        <h3>4.3 Billing</h3>
        <p>
          Payments are processed by <strong>Dodo Payments</strong>, our
          Merchant-of-Record provider. Dodo acts as the seller of record
          for your jurisdiction and handles applicable sales tax / VAT.
          Dodo&apos;s own terms apply to the payment transaction itself;
          ours apply to the Service.
        </p>

        <h3>4.4 Refunds and cancellations</h3>
        <p>
          You may cancel a subscription at any time from the
          extension&apos;s settings panel. Cancellation takes effect at the
          end of the current billing period. EU / EEA / UK consumers have a
          statutory 14-day right of withdrawal for digital services. Other
          refunds are at our discretion. The full rules — including how to
          request a refund, how pro-rated refunds are calculated, and what
          is non-refundable — are in our{" "}
          <Link href="/refund">Refund Policy</Link>.
        </p>

        <h3>4.5 Price changes</h3>
        <p>
          We may change prices with 30 days&apos; notice. Existing
          subscribers will keep their current price until the next
          renewal after the change.
        </p>
      </section>

      <section>
        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>
            Resell, white-label, or redistribute the Service or its output
            without written permission.
          </li>
          <li>
            Use the Service to violate any law, regulation, or third-party
            right.
          </li>
          <li>
            Submit content you do not have the right to submit (e.g.
            paywalled articles you obtained illegally).
          </li>
          <li>
            Attempt to reverse-engineer, decompile, or scrape the Service or
            its underlying models beyond what is permitted by applicable law.
          </li>
          <li>
            Use the Service to generate market-manipulation content,
            pump-and-dump signals, or coordinated inauthentic financial
            messaging.
          </li>
          <li>
            Attempt to bypass rate limits, credit metering, or authentication.
          </li>
          <li>
            Use the Service in any way that could damage, disable, or impair
            it for other users.
          </li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these rules,
          with or without notice.
        </p>
      </section>

      <section>
        <h2>6. Intellectual property</h2>
        <p>
          The Service, including the extension code, the website, the brand
          name &quot;Lirefin&quot;, and all design assets, is owned by us
          and our licensors and is protected by copyright and trademark law.
          Output you generate using your own portfolio belongs to you, but
          you grant us a non-exclusive, royalty-free licence to process and
          display it as needed to operate the Service.
        </p>
      </section>

      <section>
        <h2>7. Third-party content</h2>
        <p>
          Articles you analyze are owned by their respective publishers.
          Lirefin extracts only the article text you explicitly press
          Analyze on, processes it transiently, and does not redistribute,
          republish, or store the original article. You are responsible for
          ensuring that you have the right to read and process the articles
          you submit.
        </p>
      </section>

      <section>
        <h2>8. Disclaimer of warranties</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
          AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
          IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY OF AI OUTPUT. WE
          DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
          OR SECURE. YOU USE THE SERVICE AT YOUR OWN RISK.
        </p>
      </section>

      <section>
        <h2>9. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL LIREFIN
          BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
          PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, INVESTMENTS,
          DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE
          SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH
          DAMAGES. OUR TOTAL CUMULATIVE LIABILITY FOR ANY CLAIM RELATED TO
          THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID
          US IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR (B) USD 50.
        </p>
        <p>
          Some jurisdictions do not allow these limitations; in those
          jurisdictions our liability is limited to the maximum extent
          permitted by law.
        </p>
      </section>

      <section>
        <h2>10. Indemnification</h2>
        <p>
          You will indemnify and hold us harmless from any third-party
          claims arising out of (a) your use of the Service in violation of
          these Terms, (b) decisions you make based on Service output, or
          (c) content you submit to the Service that infringes a third
          party&apos;s rights.
        </p>
      </section>

      <section>
        <h2>11. Termination</h2>
        <p>
          You may stop using the Service and delete your account at any
          time from the extension settings. We may suspend or terminate your
          access if you violate these Terms or if continued service would
          expose us to material legal or financial risk.
        </p>
      </section>

      <section>
        <h2>12. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. Material changes will
          be announced inside the extension or by email at least 14 days
          before they take effect. Continued use of the Service after a
          change constitutes acceptance.
        </p>
      </section>

      <section>
        <h2>13. Governing law and disputes</h2>
        <p>
          These Terms are governed by the laws of the Republic of Türkiye,
          without regard to conflict-of-laws principles. Any dispute will be
          submitted to the exclusive jurisdiction of the Istanbul Anatolian
          Courts and Enforcement Offices, except that consumers in the
          EU/EEA, UK, or other jurisdictions retain the right to bring
          claims under the mandatory consumer-protection rules of their
          country of residence.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          Questions about these Terms:{" "}
          <a href={`mailto:${SITE.legalEmail}`}>{SITE.legalEmail}</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
