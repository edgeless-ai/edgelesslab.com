import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description:
    "Privacy policy for Edgeless Labs -- website analytics, digital products, and the Edgeless iOS app.",
  path: "/privacy",
  keywords: ["Edgeless Labs privacy policy", "privacy", "data policy"],
});

export default function PrivacyPolicy() {
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
            &larr; Edgeless Labs
          </Link>

          <h1
            className="text-[32px] font-bold tracking-tight mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Privacy Policy
          </h1>
          <p className="text-sm mb-16" style={{ color: "var(--text-tertiary)" }}>
            Last updated: March 25, 2026
          </p>

          <div className="max-w-[640px] prose-custom">
            <p className="text-sm mb-12" style={{ color: "var(--text-secondary)" }}>
              This policy covers <strong>edgelesslab.com</strong> (the website),
              digital products sold through Gumroad, and the <strong>Edgeless</strong> iOS
              app. Each section specifies what it applies to.
            </p>

            <Section title="Website (edgelesslab.com)">
              <p>
                The website uses{" "}
                <a
                  href="https://posthog.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  PostHog
                </a>{" "}
                for privacy-friendly analytics. PostHog collects anonymous page
                views and interaction data to help us improve the site. No
                advertising or cross-site tracking is used.
              </p>
              <p>
                We do not collect your name, email, or personal information
                through the website. If you purchase a product through Gumroad,
                Gumroad collects your payment and contact information under{" "}
                <a
                  href="https://gumroad.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Gumroad&apos;s Privacy Policy
                </a>
                .
              </p>
            </Section>

            <Section title="Digital Products (Gumroad)">
              <p>
                When you purchase a digital product, Gumroad processes your
                payment and delivers the files. We receive your email address
                and purchase details from Gumroad. We use this information
                only to provide product updates and handle support requests.
                We do not sell or share buyer information with third parties.
              </p>
            </Section>

            <Section title="Edgeless iOS App">
              <p>
                <strong>Your photos never leave your device.</strong> The
                Edgeless app processes everything locally using Apple&apos;s
                on-device Vision framework. We don&apos;t upload, store, or
                transmit your photos anywhere.
              </p>
              <p>What the app stores on your device:</p>
              <ul>
                <li>Your onboarding completion status</li>
                <li>Monthly composite count (resets each month)</li>
                <li>Your subscription status</li>
              </ul>
              <p>
                All stored via iOS UserDefaults. No databases, no cloud sync,
                no accounts. If you subscribe to Edgeless Pro, Apple handles
                all payment processing. We receive a receipt confirming your
                subscription status -- nothing else.
              </p>
              <p>We do not collect:</p>
              <ul>
                <li>Your photos or face data</li>
                <li>Device identifiers or advertising IDs</li>
                <li>Location data</li>
                <li>
                  Crash reports (unless you opt in through Apple&apos;s
                  standard crash reporting)
                </li>
              </ul>
            </Section>

            <Section title="Children's Privacy">
              <p>
                We do not knowingly collect any information from children
                under 13. This applies to the website, digital products, and
                the iOS app.
              </p>
            </Section>

            <Section title="Changes">
              <p>
                If we change this policy, we&apos;ll update the date above.
                For material changes affecting the iOS app, we&apos;ll notify
                users through the app.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions? Email{" "}
                <a href="mailto:david@edgelesslab.com">
                  david@edgelesslab.com
                </a>
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
