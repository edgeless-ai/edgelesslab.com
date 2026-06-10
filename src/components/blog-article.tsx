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

/**
 * Wraps each h2-delimited section in a scroll-reveal container.
 * Content before the first h2 is also wrapped.
 */
function useScrollReveal(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let observer: IntersectionObserver | null = null;

    // Defer to next tick so dangerouslySetInnerHTML content is in the DOM
    const timer = setTimeout(() => {
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      // Check if already wrapped (React strict mode double-run)
      const wrappers = Array.from(
        el.querySelectorAll<HTMLDivElement>(".blog-section")
      );

      if (wrappers.length === 0) {
        const children = Array.from(el.children) as HTMLElement[];
        const sections: HTMLElement[][] = [[]];

        for (const child of children) {
          if (child.tagName === "H2") {
            sections.push([child]);
          } else {
            sections[sections.length - 1].push(child);
          }
        }

        for (const group of sections) {
          if (group.length === 0) continue;
          const wrapper = document.createElement("div");
          wrapper.className = "blog-section";
          if (!prefersReduced) {
            wrapper.style.opacity = "0";
            wrapper.style.transform = "translateY(20px)";
            wrapper.style.transition =
              "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)";
          }
          group[0].parentNode?.insertBefore(wrapper, group[0]);
          for (const node of group) {
            wrapper.appendChild(node);
          }
          wrappers.push(wrapper);
        }
      }

      // Reveal first section immediately
      if (wrappers[0]) {
        wrappers[0].style.opacity = "1";
        wrappers[0].style.transform = "translateY(0)";
      }

      if (prefersReduced || wrappers.length <= 1) return;

      // Observe the rest for scroll-triggered reveal
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const target = entry.target as HTMLElement;
              target.style.opacity = "1";
              target.style.transform = "translateY(0)";
              observer?.unobserve(target);
            }
          }
        },
        { rootMargin: "0px 0px -60px 0px", threshold: 0.1 }
      );

      for (let i = 1; i < wrappers.length; i++) {
        observer.observe(wrappers[i]);
      }
    });

    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [containerRef]);
}

export function BlogArticle({ html, editorial, sidebar }: BlogArticleProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll reveal animation
  useScrollReveal(contentRef);

  // Extract TOC from rendered HTML headings
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      const headings = el.querySelectorAll("h2");
      const items: TocItem[] = [];
      headings.forEach((h, i) => {
        const id = h.id || `section-${i}`;
        if (!h.id) h.id = id;
        items.push({ id, text: h.textContent || "" });
      });
      setToc(items);
    });
    return () => cancelAnimationFrame(frame);
  }, [html]);

  // Track active heading via IntersectionObserver
  useEffect(() => {
    if (toc.length === 0) return;
    const el = contentRef.current;
    if (!el) return;

    const headings = el.querySelectorAll("h2");
    const observer = new IntersectionObserver(
      (entries) => {
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
