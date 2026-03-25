import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <main id="main-content" className="flex-1 flex items-center justify-center px-6 py-32">
        <div className="max-w-lg text-center">
          <p
            className="text-8xl font-bold font-mono mb-6"
            style={{ color: "var(--accent)" }}
          >
            404
          </p>
          <h1
            className="text-2xl font-semibold tracking-tight mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Page not found
          </h1>
          <p
            className="text-base mb-10"
            style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
          >
            The page you are looking for does not exist or has moved. Explore
            what the lab has been building instead.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 h-11 px-6 text-sm font-medium text-white rounded-full transition-all hover:brightness-110 hover:scale-[1.02]"
              style={{ background: "var(--accent)" }}
            >
              Go home <ArrowRight size={15} />
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 h-11 px-6 text-sm font-medium rounded-full border transition-all hover:brightness-110"
              style={{
                color: "var(--text-secondary)",
                borderColor: "var(--border-subtle)",
              }}
            >
              Browse projects <ArrowRight size={15} />
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 h-11 px-6 text-sm font-medium rounded-full border transition-all hover:brightness-110"
              style={{
                color: "var(--text-secondary)",
                borderColor: "var(--border-subtle)",
              }}
            >
              View Products <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
