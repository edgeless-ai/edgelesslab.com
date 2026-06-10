export default function CTASection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-6 rounded-2xl border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="text-[11px] font-mono uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--text-tertiary)' }}>
          Featured Product
        </div>
        <h3 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Digital Product Launch Toolkit
        </h3>
        <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
          Everything needed to launch, validate, and sell digital products. 7 products shipped in 7 days.
        </p>
        <a
          href="https://edgelessai.gumroad.com"
          className="inline-flex items-center gap-2 h-10 px-5 text-[13px] font-medium text-white rounded-full transition-all hover:brightness-110"
          style={{ background: 'var(--accent)' }}
        >
          View on Gumroad
        </a>
      </div>
      <div className="p-6 rounded-2xl border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="text-[11px] font-mono uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--text-tertiary)' }}>
          About
        </div>
        <h3 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Built solo. Shipped open.
        </h3>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          One developer building autonomous agents, generative art, and developer tools. 18 products, all free. Everything open source.
        </p>
      </div>
    </div>
  );
}
