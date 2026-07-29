import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Field Notes",
  description: "Creative has moved to the canonical Edgeless Lab Field Notes archive.",
  alternates: {
    canonical: "https://edgelesslab.com/field-notes",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function CreativeRedirectPage() {
  return (
    <div className="flex min-h-full flex-col" style={{ background: "var(--bg-base)" }}>
      <Nav />
      <meta httpEquiv="refresh" content="0;url=/field-notes" />
      <script
        dangerouslySetInnerHTML={{
          __html: "window.location.replace('/field-notes');",
        }}
      />
      <main id="main-content" className="flex flex-1 items-center px-6 py-36">
        <div className="mx-auto w-full max-w-2xl border p-8" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="lab-metadata mb-5" style={{ color: "var(--accent)" }}>
            Route changed / creative
          </div>
          <h1 className="font-editorial text-5xl sm:text-7xl">Creative is now Field Notes.</h1>
          <p className="mt-5 max-w-xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            The experiments, scientific plots, and generative studies now live
            in one canonical research archive.
          </p>
          <Link href="/field-notes" className="mt-8 inline-flex items-center gap-2 text-sm" style={{ color: "var(--accent)" }}>
            Open Field Notes <ArrowRight size={14} />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
