/** Decorative only: the enclosing card opens the live notebook on demand. */
export function MarimoPreview({ title }: { title: string }) {
  return (
    <div
      aria-hidden="true"
      className="relative mb-4 flex aspect-[16/10] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-md border p-4 text-center"
      style={{ borderColor: "var(--border-subtle)", background: "var(--bg-base)" }}
    >
      <span
        className="font-mono text-[10px] uppercase tracking-[0.1em]"
        style={{ color: "var(--text-tertiary)" }}
      >
        Interactive Python notebook
      </span>
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {title}
      </span>
      <span
        className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]"
        style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
      >
        Open notebook ↗
      </span>
    </div>
  );
}
