import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Terms of Service",
  description:
    "Terms of service for Edgeless, the group photo optimizer for iOS.",
  path: "/terms",
  keywords: ["Edgeless terms of service", "terms", "legal"],
});

export default function TermsOfService() {
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
            Terms of Service
          </h1>
          <p className="text-sm mb-16" style={{ color: "var(--text-tertiary)" }}>
            Last updated: March 13, 2026
          </p>

          <div className="max-w-[640px] prose-custom">
            <Section title="Agreement">
              <p>
                By using Edgeless, you agree to these terms. If you don&apos;t
                agree, please don&apos;t use the app.
              </p>
            </Section>

            <Section title="What Edgeless Does">
              <p>
                Edgeless creates composite group photos by selecting the best
                facial expression for each person across multiple photos you
                provide. All processing happens on your device.
              </p>
            </Section>

            <Section title="Your Content">
              <p>
                <strong>Your photos are yours.</strong> Edgeless does not claim
                any rights to your photos. The app processes your images locally
                and saves results to your photo library. We never access, upload,
                or store your photos.
              </p>
            </Section>

            <Section title="Free and Pro Tiers">
              <ul>
                <li>
                  <strong>Free:</strong> 3 composites per month with a small
                  watermark.
                </li>
                <li>
                  <strong>Pro:</strong> Unlimited composites, no watermark.
                  Available as monthly ($3.99/mo), annual ($19.99/yr), or
                  lifetime ($39.99) subscriptions.
                </li>
              </ul>
              <p>
                Subscriptions are managed through Apple and subject to
                Apple&apos;s subscription terms. You can cancel anytime in
                Settings &rarr; Apple ID &rarr; Subscriptions.
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
                Edgeless is provided &quot;as is.&quot; We do our best to
                produce great composites, but results depend on the quality of
                your input photos. We don&apos;t guarantee perfect results in
                every scenario.
              </p>
            </Section>

            <Section title="Limitation of Liability">
              <p>
                To the maximum extent permitted by law, Edgeless and its
                developers are not liable for any damages arising from your use
                of the app.
              </p>
            </Section>

            <Section title="Changes">
              <p>
                We may update these terms. Continued use of Edgeless after
                changes constitutes acceptance.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions?{" "}
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
