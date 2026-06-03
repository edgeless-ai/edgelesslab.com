import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { SearchPageClient } from "@/components/search-page-client";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Search",
  description: "Full-text search across all Edgeless Lab content — blog posts, projects, knowledge, and products.",
  path: "/search",
  keywords: ["search", "site search", "pagefind"],
});

export default function SearchPage() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />
      <main className="flex-1">
        <SearchPageClient />
      </main>
      <Footer />
    </div>
  );
}
