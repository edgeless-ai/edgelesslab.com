import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { legacyProducts as products } from "@/lib/data";
import { productContent } from "@/lib/product-content";
import { freeKitContents } from "@/lib/free-kit";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { FreeKitButton } from "@/components/free-kit-button";

// Preserve existing inbound URLs without advertising retired files or old prices.
export function generateStaticParams() {
  return products.filter(p => p.slug && !p.comingSoon && productContent[p.slug])
    .map(p => ({ slug: p.slug! }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find(p => p.slug === slug);
  if (!product || !productContent[slug]) return {};
  return {
    title: `${product.name} — Free resources`,
    description: "Our downloadable resources are now packaged in the Edgeless Free Kit. No payment required.",
    alternates: { canonical: "https://edgelesslab.com/products/" },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find(p => p.slug === slug);
  if (!product || !productContent[slug]) notFound();
  const included = freeKitContents.find(item => item.name === product.name);
  return (
    <div className="flex min-h-full flex-col" style={{ background: "var(--bg-base)" }}>
      <Nav />
      <main id="main-content" className="px-6 pb-20 pt-36">
        <div className="mx-auto max-w-[720px]">
          <Link href="/products" className="mb-8 inline-block underline" style={{ color: "var(--relay)" }}>Explore the free kit</Link>
          <h1 className="mb-6 text-4xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>{product.name}</h1>
          <p className="mb-6 text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {included ? `${included.description} This resource is now included in the Edgeless Free Kit.` : "This standalone listing has been retired. Explore the available references and templates in the Edgeless Free Kit instead; the retired product is not included."}
          </p>
          <FreeKitButton />
          <p className="mb-8 mt-4 text-sm" style={{ color: "var(--text-tertiary)" }}>Enter your email on Gumroad to receive the kit. No payment required.</p>
          <p className="leading-relaxed" style={{ color: "var(--text-secondary)" }}>The kit includes references assembled in March–April 2026. Check current tool documentation before running scripts or installing hooks.</p>
          <p className="mt-8"><Link href="/services/private-ai-systems" className="underline" style={{ color: "var(--relay)" }}>Need help with a private AI system?</Link></p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
