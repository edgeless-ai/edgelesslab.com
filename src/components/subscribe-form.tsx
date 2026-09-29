import Link from "next/link";

// Keep the existing callsite contract; email signup is unavailable until a
// subscription provider and its delivery path have been verified.
export function SubscribeForm({ source = "site" }: { source?: string }) {
  return (
    <div className="max-w-xl" data-follow-source={source}>
      <p className="mb-4 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
        Follow new posts in your RSS reader.
      </p>
      <Link
        href="/feed.xml"
        className="inline-flex min-h-11 items-center rounded-md px-5 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
      >
        Follow via RSS
      </Link>
    </div>
  );
}
