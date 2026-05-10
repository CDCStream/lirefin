import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Lirefin team — support, privacy requests, partnership inquiries.",
  robots: { index: true, follow: true },
};

const lastUpdated = "May 10, 2026";

export default function ContactPage() {
  return (
    <LegalLayout title="Contact" lastUpdated={lastUpdated}>
      <section>
        <p>
          We&apos;re a small team. Email is the fastest way to reach us, and
          we read every message.
        </p>

        <ul>
          <li>
            <strong>Support &amp; product feedback</strong> —{" "}
            <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
            <br />
            Bug reports, feature requests, account or billing issues. Please
            include your account email and a short description of what you
            were trying to do.
          </li>
          <li>
            <strong>Privacy &amp; legal</strong> —{" "}
            <a href={`mailto:${SITE.legalEmail}`}>{SITE.legalEmail}</a>
            <br />
            GDPR / KVKK / CCPA rights requests, data deletion, takedown
            notices. We respond within 30 days. See our{" "}
            <Link href="/privacy">Privacy Policy</Link> for details.
          </li>
          <li>
            <strong>Partnerships &amp; press</strong> —{" "}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </li>
        </ul>
      </section>

      <section>
        <h2>Before you email about an analysis</h2>
        <p>
          If something looks off in an analysis, it almost always helps to:
        </p>
        <ol>
          <li>
            Check the article&apos;s URL — sometimes content scripts pick up
            the wrong block on heavily-renewed pages.
          </li>
          <li>
            Re-run the analysis after the 5-minute cache window expires.
          </li>
          <li>
            Open the side panel and copy the exact JSON the AI returned —
            it makes debugging much faster on our end.
          </li>
        </ol>
      </section>

      <section>
        <h2>KVKK / GDPR data subject requests</h2>
        <p>
          To exercise any of your rights under KVKK (Türkiye), GDPR (EU/EEA),
          UK GDPR, or CCPA/CPRA (California) — including access, correction,
          deletion, portability, or restriction of processing — email{" "}
          <a href={`mailto:${SITE.legalEmail}`}>{SITE.legalEmail}</a> with
          the subject line <code>Data Request</code> and the email address
          associated with your account. We verify your identity using your
          authenticated account email and respond within 30 calendar days.
        </p>
      </section>
    </LegalLayout>
  );
}
