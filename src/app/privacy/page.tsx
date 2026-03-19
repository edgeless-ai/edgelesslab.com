import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Edgeless",
  description:
    "Your photos never leave your device. Edgeless processes everything locally using Apple's on-device Vision framework.",
};

export default function PrivacyPolicy() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "#0C0C0E",
        color: "#F2F0ED",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro', system-ui, sans-serif",
      }}
    >
      <div className="max-w-[640px] mx-auto px-6 py-12">
        <a
          href="/"
          className="inline-block text-sm mb-8 opacity-50 hover:opacity-80 transition-opacity"
          style={{ color: "#F2F0ED" }}
        >
          &larr; Edgeless Labs
        </a>

        <h1 className="text-[28px] font-bold mb-2">Edgeless Privacy Policy</h1>
        <p className="text-sm mb-8" style={{ color: "#5C5955" }}>
          Last updated: March 13, 2026
        </p>

        <Section title="The Short Version">
          <p>
            <strong style={{ color: "#7CB5A0" }}>
              Your photos never leave your device.
            </strong>{" "}
            Edgeless processes everything locally using Apple&apos;s on-device
            Vision framework. We don&apos;t upload, store, or transmit your
            photos anywhere.
          </p>
        </Section>

        <Section title="What We Collect">
          <p>
            <strong style={{ color: "#F2F0ED" }}>Almost nothing.</strong>{" "}
            Here&apos;s the complete list:
          </p>
          <ul>
            <li>
              <strong style={{ color: "#F2F0ED" }}>Purchase data:</strong> If
              you subscribe to Edgeless Pro, Apple handles all payment
              processing. We receive a receipt confirming your subscription
              status -- nothing else.
            </li>
            <li>
              <strong style={{ color: "#F2F0ED" }}>Usage count:</strong> We
              store how many composites you&apos;ve created this month (locally
              on your device) to manage the free tier limit. This number never
              leaves your device.
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
            happens{" "}
            <strong style={{ color: "#F2F0ED" }}>
              entirely on your device
            </strong>{" "}
            using Apple&apos;s Vision framework and Core Image. Your original
            photos are never modified -- Edgeless creates a new composite image
            and saves it as a separate photo in your library.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <p>
            Edgeless uses{" "}
            <strong style={{ color: "#F2F0ED" }}>Apple StoreKit</strong> for
            in-app purchases. Apple&apos;s privacy practices are governed by{" "}
            <a
              href="https://www.apple.com/legal/privacy/"
              className="hover:underline"
              style={{ color: "#E8856C" }}
            >
              Apple&apos;s Privacy Policy
            </a>
            .
          </p>
          <p>
            We do not use any third-party analytics, advertising, or tracking
            services.
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
            If we ever change this policy, we&apos;ll update the date above and
            notify users through the app. Given our commitment to processing
            everything on-device, significant changes are unlikely.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions? Email us at{" "}
            <a
              href="mailto:privacy@edgeless.app"
              className="hover:underline"
              style={{ color: "#E8856C" }}
            >
              privacy@edgeless.app
            </a>
          </p>
        </Section>
      </div>
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
    <section className="mb-8">
      <h2
        className="text-xl font-semibold mb-3"
        style={{ color: "#E8856C" }}
      >
        {title}
      </h2>
      <div
        className="space-y-4 [&_p]:leading-relaxed [&_ul]:pl-6 [&_ul]:list-disc [&_li]:mb-2"
        style={{ color: "#9B9893" }}
      >
        {children}
      </div>
    </section>
  );
}
