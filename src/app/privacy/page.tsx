import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description:
    "Your photos never leave your device. Edgeless processes everything locally using Apple's on-device Vision framework.",
  path: "/privacy",
  keywords: ["Edgeless privacy policy", "on-device processing", "photo privacy"],
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
            <Section title="The Short Version">
              <p>
                <strong>Your photos never leave your device.</strong> Edgeless
                processes everything locally using Apple&apos;s on-device Vision
                framework. We don&apos;t upload, store, or transmit your photos
                anywhere.
              </p>
            </Section>

            <Section title="What We Collect">
              <p>
                <strong>Almost nothing.</strong> Here&apos;s the complete list:
              </p>
              <ul>
                <li>
                  <strong>Purchase data:</strong> If you subscribe to Edgeless
                  Pro, Apple handles all payment processing. We receive a receipt
                  confirming your subscription status -- nothing else.
                </li>
                <li>
                  <strong>Usage count:</strong> We store how many composites
                  you&apos;ve created this month (locally on your device) to
                  manage the free tier limit. This number never leaves your
                  device.
                </li>
              </ul>
            </Section>

            <Section title="What We Don't Collect">
              <ul>
                <li>Your photos or face data</li>
                <li>Your name, email, or any personal information</li>
                <li>Device identifiers or advertising IDs</li>
                <li>Location data</li>
                <li>Analytics or usage tracking</li>
                <li>
                  Crash reports (unless you opt in through Apple&apos;s standard
                  crash reporting)
                </li>
              </ul>
            </Section>

            <Section title="Photo Processing">
              <p>
                All face detection, expression scoring, and photo compositing
                happens <strong>entirely on your device</strong> using
                Apple&apos;s Vision framework and Core Image. Your original
                photos are never modified -- Edgeless creates a new composite
                image and saves it as a separate photo in your library.
              </p>
            </Section>

            <Section title="Third-Party Services">
              <p>
                Edgeless uses <strong>Apple StoreKit</strong> for in-app
                purchases. Apple&apos;s privacy practices are governed by{" "}
                <a
                  href="https://www.apple.com/legal/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apple&apos;s Privacy Policy
                </a>
                .
              </p>
              <p>
                Our website (edgelesslab.com) uses{" "}
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
            </Section>

            <Section title="Data Storage">
              <p>The only data stored on your device:</p>
              <ul>
                <li>Your onboarding completion status</li>
                <li>Monthly composite count (resets each month)</li>
                <li>Your subscription status</li>
              </ul>
              <p>
                All stored via iOS UserDefaults. No databases, no cloud sync, no
                accounts.
              </p>
            </Section>

            <Section title="Children's Privacy">
              <p>
                Edgeless does not knowingly collect any information from children
                under 13. Since we don&apos;t collect personal information from
                anyone, this applies universally.
              </p>
            </Section>

            <Section title="Changes">
              <p>
                If we ever change this policy, we&apos;ll update the date above
                and notify users through the app. Given our commitment to
                processing everything on-device, significant changes are
                unlikely.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions? Email us at{" "}
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
