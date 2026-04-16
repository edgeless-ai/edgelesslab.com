"use client";

import { useState, useEffect, useRef } from "react";

interface TocItem {
  id: string;
  text: string;
}

interface BlogArticleProps {
  html: string;
  editorial?: boolean;
  sidebar?: React.ReactNode;
}

export function BlogArticle({ html, editorial, sidebar }: BlogArticleProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  // Extract TOC from rendered HTML headings
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const headings = el.querySelectorAll("h2");
    const items: TocItem[] = [];
    headings.forEach((h, i) => {
      const id = h.id || `section-${i}`;
      if (!h.id) h.id = id;
      items.push({ id, text: h.textContent || "" });
    });
    setToc(items);
  }, [html]);

  // Track active heading via IntersectionObserver
  useEffect(() => {
    if (toc.length === 0) return;
    const el = contentRef.current;
    if (!el) return;

    const headings = el.querySelectorAll("h2");
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first heading that's intersecting (or most recently passed)
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [toc]);

  const showSidebar = editorial && (toc.length >= 3 || sidebar);

  if (!showSidebar) {
    return (
      <div
        ref={contentRef}
        className="prose-custom"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-12 lg:gap-16 items-start">
      <div
        ref={contentRef}
        className="prose-custom prose-editorial min-w-0"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <aside className="hidden lg:block">
        <div className="sticky top-28 space-y-8">
          {toc.length >= 3 && (
            <nav aria-label="Table of contents">
              <div
                className="text-[10px] font-mono uppercase tracking-[0.14em] mb-3"
                style={{ color: "var(--text-tertiary)" }}
              >
                On this page
              </div>
              <ul className="blog-toc">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={activeId === item.id ? "active" : ""}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(item.id)?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {sidebar}
        </div>
      </aside>
    </div>
  );
}
