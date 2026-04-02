import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Terms of Service",
  description:
    "Terms of service for Edgeless Labs -- digital products, website, and the Edgeless iOS app.",
  path: "/terms",
  keywords: ["Edgeless Labs terms of service", "terms", "legal"],
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
            Last updated: April 2, 2026
          </p>

          <div className="max-w-[640px] prose-custom">
            <p className="text-sm mb-12" style={{ color: "var(--text-secondary)" }}>
              These terms cover <strong>edgelesslab.com</strong>, digital
              products sold through Gumroad, and the <strong>Edgeless</strong> iOS
              app. Each section specifies what it applies to.
            </p>

            <Section title="Agreement">
              <p>
                By using any Edgeless Labs product or service, you agree to
                these terms. If you don&apos;t agree, don&apos;t use them.
              </p>
            </Section>

            <Section title="Digital Products (Gumroad)">
              <p>
                Digital products (guides, templates, reference cards) are
                delivered as downloadable files through{" "}
                <a
                  href="https://gumroad.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Gumroad
                </a>
                . Upon purchase, you receive a download link via email.
              </p>
              <p>
                <strong>License:</strong> You receive a personal license to use
                the purchased materials in your own projects, including
                commercial projects. You may not resell, redistribute, or
                publicly share the files themselves.
              </p>
              <p>
                <strong>Refunds:</strong> If a product does not match its
                description, email{" "}
                <a href="mailto:david@edgelesslab.com">
                  david@edgelesslab.com
                </a>{" "}
                within 30 days of purchase for a full refund. No questions
                asked.
              </p>
              <p>
                <strong>Disclaimer:</strong> Digital products are provided
                &quot;as is.&quot; Templates and guides reflect practices at the
                time of writing. AI models and frameworks change; we do not
                guarantee compatibility with future versions.
              </p>
            </Section>

            <Section title="Edgeless iOS App">
              <p>
                Edgeless creates composite group photos by selecting the best
                facial expression for each person across multiple photos. All
                processing happens on your device.
              </p>
              <p>
                <strong>Your photos are yours.</strong> Edgeless does not claim
                any rights to your photos. The app processes your images
                locally and saves results to your photo library. We never
                access, upload, or store your photos.
              </p>
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
                Don&apos;t use Edgeless Labs products to create misleading
                content intended to deceive or harm others. Don&apos;t use
                purchased templates or guides to build competing products
                that resell the same materials.
              </p>
            </Section>

            <Section title="Limitation of Liability">
              <p>
                To the maximum extent permitted by law, Edgeless Labs and its
                developer are not liable for any damages arising from your use
                of our products, website, or app.
              </p>
            </Section>

            <Section title="Changes">
              <p>
                We may update these terms. Continued use after changes
                constitutes acceptance. For material changes, we&apos;ll
                update the date above.
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
