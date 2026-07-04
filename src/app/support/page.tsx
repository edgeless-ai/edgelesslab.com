import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Support",
  description:
    "Support for Edgeless Lab apps -- The Clapper, photoMerge, and digital products. Contact help@edgelesslab.com.",
  path: "/support",
  keywords: ["Edgeless Lab support", "The Clapper support", "app support"],
});

export default function Support() {
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
            Support
          </h1>
          <p className="text-sm mb-16" style={{ color: "var(--text-tertiary)" }}>
            Questions, bug reports, or feature requests -- we&apos;d love to hear from you.
          </p>

          <div className="max-w-[640px] prose-custom">
            <p className="text-sm mb-12" style={{ color: "var(--text-secondary)" }}>
              Email{" "}
              <a href="mailto:help@edgelesslab.com">
                <strong>help@edgelesslab.com</strong>
              </a>{" "}
              for any Edgeless Lab app or product. We typically respond within
              1&ndash;2 business days.
            </p>

            <Section title="The Clapper">
              <p>
                Hands-free camera control -- clap to record video, take photos,
                flip the camera, and more. All sound detection happens entirely
                on your device: no audio is ever recorded, stored, or
                transmitted, and the app collects no data.
              </p>
              <p>Common questions:</p>
              <ul>
                <li>
                  <strong>Detection feels too sensitive or not sensitive
                  enough</strong> -- adjust the Sensitivity slider in Settings.
                </li>
                <li>
                  <strong>Gestures do the wrong thing</strong> -- every
                  gesture&apos;s action is configurable in Settings &rarr;
                  Gesture Mappings.
                </li>
                <li>
                  <strong>Microphone or camera access</strong> -- The Clapper
                  needs mic access to hear claps and camera access to record.
                  You can change these anytime in iOS Settings &rarr; The
                  Clapper.
                </li>
                <li>
                  <strong>Microphone use</strong> -- The Clapper only listens
                  while the app is open. The mic is always released when you
                  leave the app.
                </li>
              </ul>
            </Section>

            <Section title="photoMerge">
              <p>
                Merge and blend photos on iOS. For support, use the email
                above.
              </p>
            </Section>

            <Section title="Digital Products">
              <p>
                Products purchased through Gumroad are delivered by Gumroad.
                If you have download or payment issues, check your Gumroad
                receipt first, then email us and we&apos;ll sort it out.
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
