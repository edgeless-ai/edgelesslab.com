import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";
import { FreeKitButton } from "@/components/free-kit-button";
import { freeKitContents } from "@/lib/free-kit";

export const metadata = createPageMetadata({
  title: "Resources",
  description: "The Edgeless Free Kit: practical AI development references, templates, and examples in one download. No payment required.",
  path: "/products",
  keywords: ["free AI resources", "Claude Code", "developer templates", "Edgeless Free Kit"],
});

export default function ProductsPage() {
  return (
    <div className="flex min-h-full flex-col" style={{ background: "var(--bg-base)" }}>
      <Nav />
      <main id="main-content">
        <section className="px-6 pb-20 pt-36 sm:pt-44">
          <div className="mx-auto max-w-[1080px]">
            <p className="lab-metadata mb-6" style={{ color: "var(--relay)" }}>Resources / one free download</p>
            <h1 className="mb-6 text-5xl font-semibold leading-[0.95] tracking-[-0.045em] sm:text-6xl lg:text-7xl" style={{ color: "var(--text-primary)" }}>Edgeless Free Kit</h1>
            <p className="mb-6 max-w-[640px] text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Templates, field guides, and examples for AI-assisted development. Choose one useful resource and start there. Everything comes together in one download, with a PDF to help you find your way.
            </p>
            <FreeKitButton />
            <p className="mb-12 mt-4 text-sm" style={{ color: "var(--text-tertiary)" }}>Enter your email on Gumroad to receive the kit. No payment required.</p>
            <Image src="/edgeless-free-kit-cover.png" alt="Edgeless Free Kit — templates, field guides, and working examples" width={1600} height={900} priority className="mb-16 h-auto w-full border" style={{ borderColor: "var(--border-default)" }} />
            <h2 className="mb-4 text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>Inside the kit</h2>
            <p className="mb-8 max-w-[720px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>Start with the CLAUDE.md templates and the Claude Code Cheat Sheet. Explore the rest when you need it. These are reference materials assembled in March–April 2026: check current tool documentation before running scripts or installing hooks.</p>
            <ul className="grid gap-4 sm:grid-cols-2">
              {freeKitContents.map((item) => <li key={item.name} className="border p-5" style={{ borderColor: "var(--border-default)" }}>
                <h3 className="mb-2 font-semibold" style={{ color: "var(--text-primary)" }}>{item.name}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.description}</p>
              </li>)}
            </ul>
            <p className="mt-12 leading-relaxed" style={{ color: "var(--text-secondary)" }}>Need help taking a private AI workflow into production? <Link href="/services/private-ai-systems" className="underline underline-offset-4" style={{ color: "var(--relay)" }}>Explore our private AI systems work.</Link></p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
