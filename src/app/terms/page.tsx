import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Edgeless",
  description:
    "Terms of service for Edgeless, the group photo optimizer for iOS.",
};

export default function TermsOfService() {
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

        <h1 className="text-[28px] font-bold mb-2">
          Edgeless Terms of Service
        </h1>
        <p className="text-sm mb-8" style={{ color: "#5C5955" }}>
          Last updated: March 13, 2026
        </p>

        <Section title="Agreement">
          <p>
            By using Edgeless, you agree to these terms. If you don&apos;t
            agree, please don&apos;t use the app.
          </p>
        </Section>

        <Section title="What Edgeless Does">
          <p>
            Edgeless creates composite group photos by selecting the best facial
            expression for each person across multiple photos you provide. All
            processing happens on your device.
          </p>
        </Section>

        <Section title="Your Content">
          <p>
            <strong style={{ color: "#F2F0ED" }}>
              Your photos are yours.
            </strong>{" "}
            Edgeless does not claim any rights to your photos. The app processes
            your images locally and saves results to your photo library. We
            never access, upload, or store your photos.
          </p>
        </Section>

        <Section title="Free and Pro Tiers">
          <ul>
            <li>
              <strong style={{ color: "#F2F0ED" }}>Free:</strong> 3 composites
              per month with a small watermark.
            </li>
            <li>
              <strong style={{ color: "#F2F0ED" }}>Pro:</strong> Unlimited
              composites, no watermark. Available as monthly ($3.99/mo), annual
              ($19.99/yr), or lifetime ($39.99) subscriptions.
            </li>
          </ul>
          <p>
            Subscriptions are managed through Apple and subject to Apple&apos;s
            subscription terms. You can cancel anytime in Settings &rarr; Apple
            ID &rarr; Subscriptions.
          </p>
        </Section>

        <Section title="Acceptable Use">
          <p>
            Please use Edgeless responsibly. Don&apos;t use it to create
            misleading images intended to deceive or harm others.
          </p>
        </Section>

        <Section title="Disclaimer">
          <p>
            Edgeless is provided &quot;as is.&quot; We do our best to produce
            great composites, but results depend on the quality of your input
            photos. We don&apos;t guarantee perfect results in every scenario.
          </p>
        </Section>

        <Section title="Limitation of Liability">
          <p>
            To the maximum extent permitted by law, Edgeless and its developers
            are not liable for any damages arising from your use of the app.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We may update these terms. Continued use of Edgeless after changes
            constitutes acceptance.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions?{" "}
            <a
              href="mailto:support@edgeless.app"
              className="hover:underline"
              style={{ color: "#E8856C" }}
            >
              support@edgeless.app
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
