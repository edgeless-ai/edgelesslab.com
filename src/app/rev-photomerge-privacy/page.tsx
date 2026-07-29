import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "REV/photoMerge Privacy Policy",
  description:
    "Privacy policy for REV/photoMerge — the photo merging app for iOS. Covers data collection, usage, sharing, storage, user rights, and contact information.",
  path: "/rev-photomerge-privacy",
  keywords: [
    "REV photoMerge privacy policy",
    "photoMerge privacy",
    "REV Labs privacy",
    "photo merging app privacy",
  ],
});

export default function RevPhotoMergePrivacyPolicy() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <section className="px-6 pt-32 pb-20">
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
          <p className="text-sm mb-16" style={{ color: "var(--text-tertiary)" }}>
            Effective date: July 9, 2026
          </p>

          <div className="max-w-[640px] prose-custom">
            <p className="text-sm mb-12" style={{ color: "var(--text-secondary)" }}>
              This policy applies to the <strong>REV/photoMerge</strong> iOS app
              (the &ldquo;App&rdquo;), developed and operated by REV Labs.
            </p>

            <Section title="1. Introduction">
              <p>
                This Privacy Policy explains how REV/photoMerge (&ldquo;we,&rdquo;
                &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, shares, and
                protects personal information you provide when using the REV/photoMerge
                app. By using the App, you agree to the practices described in this
                policy.
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <p>We collect the following categories of information:</p>
              <ul>
                <li>
                  <strong>Account Information:</strong> Email address, username, and
                  password (hashed). Required for account creation and service delivery.
                </li>
                <li>
                  <strong>Device &amp; Usage Data:</strong> Device type, operating
                  system version, IP address, crash logs, and anonymized analytics
                  about how you interact with the App.
                </li>
                <li>
                  <strong>Media &amp; Content:</strong> Photos, videos, and any
                  metadata you upload or edit within the App. This is the core data
                  needed to perform photo merging and editing.
                </li>
                <li>
                  <strong>Contact &amp; Support Data:</strong> Information you provide
                  when contacting support (e.g., name, email, description of the
                  issue).
                </li>
              </ul>
            </Section>

            <Section title="3. How We Use Your Information">
              <p>We use the information we collect for the following purposes:</p>
              <ul>
                <li>Provide, maintain, and improve the App&rsquo;s functionality.</li>
                <li>Process media uploads and generate merged photo outputs.</li>
                <li>
                  Communicate with you about updates, security notices, and
                  support requests.
                </li>
                <li>
                  Analyze usage trends for product development, performance
                  optimization, and debugging.
                </li>
                <li>
                  Comply with legal obligations and enforce our Terms of Service.
                </li>
              </ul>
            </Section>

            <Section title="4. Sharing &amp; Disclosure">
              <p>We may share your information in the following circumstances:</p>
              <ul>
                <li>
                  <strong>Service Providers:</strong> Third-party vendors that perform
                  services on our behalf (e.g., cloud storage, analytics, crash
                  reporting). They are contractually limited to using data only as
                  necessary to provide those services.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law, subpoena,
                  or legitimate legal process.
                </li>
                <li>
                  <strong>Business Transfers:</strong> In the event of a merger,
                  acquisition, or sale of assets, user data may be transferred as part
                  of that transaction.
                </li>
              </ul>
              <p>
                We do <strong>not</strong> sell your personal information to third
                parties. We do <strong>not</strong> use your photos for advertising or
                training machine learning models without your explicit consent.
              </p>
            </Section>

            <Section title="5. Data Retention &amp; Security">
              <ul>
                <li>
                  We retain personal data only as long as necessary to provide the
                  service or as required by law. You may request deletion of your
                  data at any time.
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
              </ul>
            </Section>

            <Section title="6. Your Rights">
              <p>You have the following rights regarding your personal data:</p>
              <ul>
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
                  media.
                </li>
                <li>
                  <strong>Opt-out:</strong> Disable analytics or marketing
                  communications via app settings or by contacting us at the email
                  below.
                </li>
              </ul>
              <p>
                To exercise any of these rights, contact us at{" "}
                <a href="mailto:privacy@revphotomerge.com">
                  privacy@revphotomerge.com
                </a>
                . We will respond within 30 days.
              </p>
            </Section>

            <Section title="7. Children&rsquo;s Privacy">
              <p>
                The App is not intended for children under 13, and we do not
                knowingly collect personal information from children. If we
                become aware that a child under 13 has provided us with personal
                information, we will take steps to delete it promptly.
              </p>
            </Section>

            <Section title="8. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. Changes will
                be posted on this page with an updated effective date. For material
                changes, we will notify users through the App or via email.
                Continued use of the App after changes constitutes acceptance of
                the updated policy.
              </p>
            </Section>

            <Section title="9. Contact">
              <p>
                If you have questions, concerns, or requests regarding this Privacy
                Policy, please contact us:
              </p>
              <ul>
                <li>
                  Email:{" "}
                  <a href="mailto:privacy@revphotomerge.com">
                    privacy@revphotomerge.com
                  </a>
                </li>
                <li>
                  REV Labs &mdash; REV/photoMerge
                </li>
              </ul>
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