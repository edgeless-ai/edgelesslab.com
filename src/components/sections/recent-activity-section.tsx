import Link from "next/link";
import { homepagePosts } from "@/lib/homepage-data";

export function RecentActivity() {
  const recent = homepagePosts;

  return (
    <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
      {recent.map((post, i) => {
        const isLaunch = Boolean(post.isLaunch);
        return (
          <li
            key={post.slug}
            style={{
              borderColor: "var(--border-subtle)",
              animation: `fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s both`,
            }}
            className="border-b first:border-t"
          >
            <Link
              href={`/blog/${post.slug}`}
              className="group grid grid-cols-[auto_auto_1fr_auto] items-center gap-4 py-4 px-1 transition-colors"
            >
              <span
                className="text-[11px] font-mono tabular-nums shrink-0 w-[68px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {post.date.slice(5)}
              </span>
              <span
                className="text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 rounded shrink-0"
                style={{
                  background: isLaunch ? "var(--accent-muted)" : "var(--bg-surface)",
                  color: isLaunch ? "var(--accent)" : "var(--text-tertiary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {isLaunch ? "launch" : "post"}
              </span>
              <span
                className="text-[14px] font-medium truncate transition-colors group-hover:text-white"
                style={{ color: "var(--text-primary)" }}
              >
                {post.title}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
