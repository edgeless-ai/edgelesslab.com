import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "REV/photoMerge — Privacy Policy",
  description:
    "Privacy policy for REV/photoMerge, the AI-powered photo merging app by Edgeless Lab.",
  path: "/rev-photomerge-privacy",
  keywords: ["REV photoMerge privacy policy", "photo merge privacy", "REV app data policy"],
});

export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <section className="px-6 pt-20 pb-24">
        <div className="max-w-[1280px] mx-auto">
          <Link
            href="/"
            className="inline-block text-[13px] mb-8 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            &larr; Edgeless Lab
          </Link>

          <h1
            className="text-[32px] font-bold tracking-tight mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            REV/photoMerge Privacy Policy
          </h1>
          <p className="text-sm mb-12" style={{ color: "var(--text-tertiary)" }}>
            Effective date: July 9, 2026
          </p>

          <div className="max-w-[640px] prose-custom">
            <p
              className="text-sm mb-10"
              style={{ color: "var(--text-secondary)" }}
            >
              This policy applies to <strong>REV/photoMerge</strong> ("the App"),
              a photo merging and AI color-matching application developed by Edgeless
              Lab. It covers data collection, usage, sharing, storage, user rights,
              and contact information.
            </p>

            {/* 1. Information We Collect */}
            <Section title="1. Information We Collect">
              <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
                The App collects the following categories of information:
              </p>
              <ul className="list-disc pl-5 mb-4 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <li>
                  <strong>Account Information:</strong> Email address, username, and
                  hashed password (if you create an account).
                </li>
                <li>
                  <strong>Media &amp; Content:</strong> Photos, videos, and associated
                  metadata you upload or edit within the App. This is the core data
                  the App processes to generate merged outputs and AI color-matched
                  results.
                </li>
                <li>
                  <strong>Device &amp; Usage Data:</strong> Device type, operating
                  system, IP address, crash logs, and anonymized analytics about how
                  you interact with the App.
                </li>
                <li>
                  <strong>Contact &amp; Support Data:</strong> Information you provide
                  when reaching out to support (e.g., name, email, issue description).
                </li>
              </ul>
            </Section>

            {/* 2. How We Use Your Information */}
            <Section title="2. How We Use Your Information">
              <ul className="list-disc pl-5 mb-0 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <li>Provide, maintain, and improve the App&apos;s functionality.</li>
                <li>Process your media uploads and generate merged photo outputs.</li>
                <li>Apply AI-based color matching and alignment features you request.</li>
                <li>Communicate updates, security notices, and support responses.</li>
                <li>Analyze usage trends for product improvement and debugging.</li>
                <li>Comply with legal obligations and enforce our Terms of Service.</li>
              </ul>
            </Section>

            {/* 3. Data Sharing & Disclosure */}
            <Section title="3. Data Sharing &amp; Disclosure">
              <ul className="list-disc pl-5 mb-0 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <li>
                  <strong>Service Providers:</strong> Third-party vendors that perform
                  services on our behalf (e.g., cloud storage, analytics, AI inference).
                  They are contractually limited to use data only as necessary to
                  provide those services.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law, subpoena,
                  or legitimate legal process.
                </li>
                <li>
                  <strong>Business Transfers:</strong> In the event of a merger,
                  acquisition, or sale of assets, user data may be transferred as part
                  of the transaction, subject to this privacy policy.
                </li>
              </ul>
              <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                <strong>We do not sell your personal data.</strong> We do not share your
                photos or content with advertisers, data brokers, or third-party
                marketing platforms.
              </p>
            </Section>

            {/* 4. Data Retention & Security */}
            <Section title="4. Data Retention &amp; Security">
              <ul className="list-disc pl-5 mb-0 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <li>
                  We retain personal data only as long as necessary to provide the
                  service or as required by law.
                </li>
                <li>
                  All data in transit is encrypted via TLS. Stored media and user data
                  are encrypted at rest.
                </li>
                <li>
                  We implement reasonable administrative, technical, and physical
                  safeguards to protect your information against unauthorized access,
                  alteration, disclosure, or destruction.
                </li>
                <li>
                  You may delete your account and associated data at any time through
                  the App settings or by contacting us. Upon deletion, data is removed
                  from active systems within 30 days (except where retention is
                  required by law).
                </li>
              </ul>
            </Section>

            {/* 5. Your Rights */}
            <Section title="5. Your Rights">
              <ul className="list-disc pl-5 mb-0 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <li>
                  <strong>Access &amp; Correction:</strong> Request a copy of your
                  personal data or correct inaccuracies.
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your account and
                  associated data (except when retention is required by law).
                </li>
                <li>
                  <strong>Export:</strong> Receive a portable copy of your uploaded
                  media and associated metadata.
                </li>
                <li>
                  <strong>Opt-out:</strong> Disable analytics or marketing
                  communications via App settings or by contacting us at the email
                  below.
                </li>
              </ul>
              <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                To exercise any of these rights, contact us at the information below.
                We respond to all verifiable requests within 30 days.
              </p>
            </Section>

            {/* 6. Children&apos;s Privacy */}
            <Section title="6. Children&apos;s Privacy">
              <p className="mb-0 text-sm" style={{ color: "var(--text-secondary)" }}>
                The App is not intended for children under 13. We do not knowingly
                collect personal information from anyone under 13. If we become aware
                that a child under 13 has provided us with data, we will delete it
                promptly.
              </p>
            </Section>

            {/* 7. Changes to This Policy */}
            <Section title="7. Changes to This Policy">
              <p className="mb-0 text-sm" style={{ color: "var(--text-secondary)" }}>
                We may update this Privacy Policy from time to time. Changes will be
                posted on this page with an updated effective date. Continued use of
                the App after changes constitutes acceptance of the updated policy. We
                will notify you of material changes via in-app notice or email.
              </p>
            </Section>

            {/* 8. Contact */}
            <Section title="8. Contact Us">
              <p className="mb-0 text-sm" style={{ color: "var(--text-secondary)" }}>
                Questions, requests, or concerns about your data? Reach us at:
              </p>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <a
                  href="mailto:privacy@edgelesslab.com"
                  className="underline hover:no-underline"
                  style={{ color: "var(--accent)" }}
                >
                  privacy@edgelesslab.com
                </a>
              </p>
              <p className="mt-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
                REV/photoMerge — © 2026 Edgeless Lab. All rights reserved.
              </p>
            </Section>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2
        className="text-lg font-semibold mb-4"
        style={{ color: "var(--accent)" }}
      >
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}
