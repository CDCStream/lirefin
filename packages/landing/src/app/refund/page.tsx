import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "How refunds, cancellations, and the EU 14-day cooling-off period work for Lirefin paid plans.",
  robots: { index: true, follow: true },
};

const lastUpdated = "May 10, 2026";

export default function RefundPage() {
  return (
    <LegalLayout title="Refund Policy" lastUpdated={lastUpdated}>
      <section>
        <p>
          This Refund Policy explains when and how you can get your money
          back for paid Lirefin subscriptions, how cancellations work, and
          how to start a refund request. It applies to every paid plan
          purchased through Lirefin and is read together with our{" "}
          <Link href="/terms">Terms of Service</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <p>
          Payments are processed by <strong>Dodo Payments</strong>, our
          Merchant-of-Record (MoR). Dodo collects the funds, handles
          applicable sales tax / VAT, and issues every refund. We initiate
          refunds; Dodo settles them.
        </p>
      </section>

      <section>
        <h2>1. Cancelling your subscription</h2>
        <p>
          You can cancel any active subscription at any time. Two equivalent
          paths:
        </p>
        <ul>
          <li>
            <strong>From the extension:</strong> Settings → Billing →{" "}
            <em>Manage subscription</em>. This opens a hosted Customer
            Portal where you can cancel, change plan, or update your
            payment method.
          </li>
          <li>
            <strong>From a refund email:</strong> Reply to any Dodo receipt
            email and follow the cancellation link.
          </li>
        </ul>
        <p>
          Cancellation takes effect at the end of the current billing
          period. You keep access — and any remaining credits in your
          monthly allowance — until that period ends. You will not be
          charged again.
        </p>
        <p>
          Cancelling is not the same as a refund. Cancellation stops future
          renewals; a refund returns money for a charge that already
          cleared. The two can also be requested together.
        </p>
      </section>

      <section>
        <h2>2. EU / EEA / UK 14-day right of withdrawal</h2>
        <p>
          If you live in the EU, the EEA, or the UK and you are a consumer
          (i.e. not buying for business use), you have a statutory{" "}
          <strong>14-day right of withdrawal</strong> from the day your
          subscription begins, under Directive 2011/83/EU and equivalent UK
          rules. During this 14-day window you may cancel for any reason
          and receive a full refund.
        </p>
        <p>
          <strong>Important exception for digital services:</strong> the
          right of withdrawal lapses for the portion of the service you
          have already used. Lirefin is a digital service supplied
          immediately, so once you start consuming credits, the unused
          portion of your billing cycle remains refundable but the
          credits you have already spent are deducted from the refund at
          the per-credit price implied by your plan.
        </p>
        <p>
          To exercise the right of withdrawal, email{" "}
          <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>{" "}
          within 14 days of the charge. Include the order ID from your
          Dodo receipt. We process EU withdrawal requests within 14 days
          of receipt, the maximum allowed by law.
        </p>
      </section>

      <section>
        <h2>3. Refunds outside the 14-day window</h2>
        <p>
          Outside the EU 14-day window, paid plans are sold as digital
          consumable services and are{" "}
          <strong>generally non-refundable</strong>. We will, however,
          consider refunds at our discretion in the following situations:
        </p>
        <ul>
          <li>
            <strong>Service unavailable:</strong> Lirefin was unable to
            generate analyses for an extended outage (≥ 24 hours of total
            downtime within a billing cycle) and you raised the issue with
            us.
          </li>
          <li>
            <strong>Duplicate or accidental charge:</strong> a clearly
            erroneous charge — such as a double payment — will be refunded
            in full.
          </li>
          <li>
            <strong>Unauthorized purchase:</strong> a charge made on your
            payment method without your consent (e.g. by a family member
            without authorization). We may ask for additional verification.
          </li>
          <li>
            <strong>Material misrepresentation:</strong> the plan you
            purchased did not match what was advertised, and we cannot
            remedy the discrepancy.
          </li>
          <li>
            <strong>Hardship:</strong> we maintain a small discretionary
            budget for users in genuine financial hardship; just write to
            us and explain.
          </li>
        </ul>
        <p>
          We do not generally refund: charges where you simply changed
          your mind after the 14-day window; charges where you used
          substantially all the credits in your plan and then asked for a
          refund; or charges resulting from your failure to cancel before
          a renewal.
        </p>
      </section>

      <section>
        <h2>4. How to request a refund</h2>
        <ol>
          <li>
            Email{" "}
            <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>{" "}
            from the email address on your Lirefin account.
          </li>
          <li>
            Include the <strong>Dodo order ID</strong> (you will find it
            in your Dodo receipt email — it looks like{" "}
            <code>pay_xxxxxxxxxxxxxxxxxxx</code>).
          </li>
          <li>
            Tell us briefly what happened. If you are exercising the EU
            14-day right of withdrawal, say so.
          </li>
        </ol>
        <p>
          We acknowledge every refund request within 2 business days. If
          we approve the refund, we instruct Dodo to issue it; Dodo
          credits the original payment method, typically within 5-10
          business days depending on your bank.
        </p>
        <p>
          If we decline a refund and you disagree with the outcome, you
          retain whatever consumer-protection rights apply in your
          jurisdiction. Nothing in this policy waives those rights.
        </p>
      </section>

      <section>
        <h2>5. Pro-rated refunds and credits</h2>
        <p>
          Where we issue a partial refund (for example, an EU 14-day
          withdrawal mid-cycle), the calculation is:
        </p>
        <p>
          <strong>Refund</strong> = (Plan price) − (Credits used × Plan
          price ÷ Credits in plan)
        </p>
        <p>
          The <em>Unlimited</em> plan has no fixed credit count, so an
          Unlimited refund is pro-rated by time: refund = plan price ×
          (days remaining ÷ days in cycle).
        </p>
      </section>

      <section>
        <h2>6. Plan changes (upgrades and downgrades)</h2>
        <p>
          Upgrading mid-cycle is billed immediately on a pro-rated basis,
          via Dodo, and credits the new tier&apos;s allowance to your
          account. The pro-rated charge is non-refundable except under the
          rules in section 3.
        </p>
        <p>
          Downgrading mid-cycle takes effect at the start of the next
          billing period. You keep your current tier&apos;s credits until
          then, and no refund is issued for the difference.
        </p>
      </section>

      <section>
        <h2>7. Free credits</h2>
        <p>
          Free credits granted to new accounts have no monetary value and
          are not refundable. We may revoke free credits granted as a
          result of fraud, abuse, or duplicate accounts.
        </p>
      </section>

      <section>
        <h2>8. Chargebacks</h2>
        <p>
          We strongly prefer to resolve refund requests directly. Issuing
          a chargeback through your bank or card network without first
          contacting us is slower, costs us a non-refundable fee, and
          almost always results in immediate suspension of your Lirefin
          account pending resolution. If you have a problem, please write
          to <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>{" "}
          first — we are responsive and reasonable.
        </p>
      </section>

      <section>
        <h2>9. Account deletion and refunds</h2>
        <p>
          Deleting your account from the extension cancels any active
          subscription and stops future charges. It does <strong>not</strong>{" "}
          automatically refund the current billing period — request a
          refund explicitly via section 4 if you also want money back.
        </p>
      </section>

      <section>
        <h2>10. Changes to this policy</h2>
        <p>
          We may update this Refund Policy from time to time. Material
          changes will be announced inside the extension or by email at
          least 14 days before they take effect. The version in force at
          the moment of your purchase governs that purchase.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          Refund questions, withdrawal requests, or anything else:{" "}
          <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
          For legal-policy questions specifically, write to{" "}
          <a href={`mailto:${SITE.legalEmail}`}>{SITE.legalEmail}</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
