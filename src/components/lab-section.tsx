import type { ReactNode } from "react";

type Tone = "accent" | "malachite" | "relay" | "oxide";

const TONE_PILL: Record<Tone, { background: string; color: string }> = {
  accent: { background: "var(--accent)", color: "var(--accent-contrast)" },
  malachite: { background: "var(--malachite)", color: "var(--paper)" },
  relay: { background: "var(--relay)", color: "var(--ink)" },
  oxide: { background: "var(--oxide)", color: "var(--paper)" },
};

type LabSectionProps = {
  /** Uppercase eyebrow shown in the pill on the top border. */
  label: string;
  /** Optional right-aligned status text (e.g. "LIVE", "FIG. 004"). */
  status?: string;
  /** Pill color. Defaults to lime accent. */
  tone?: Tone;
  children: ReactNode;
  className?: string;
  id?: string;
};

/**
 * A framed "lab document" section: a solid pill label straddling the top
 * hairline, an optional status slot, and a corner tick at top-right.
 * Composes the site's existing pill / metadata / hairline vocabulary.
 */
export function LabSection({
  label,
  status,
  tone = "accent",
  children,
  className,
  id,
}: LabSectionProps) {
  const pill = TONE_PILL[tone];
  return (
    <section
      id={id}
      className={`lab-section${className ? ` ${className}` : ""}`}
    >
      <span className="lab-section__pill lab-metadata" style={pill}>
        {label}
      </span>
      {status ? (
        <span className="lab-section__status lab-metadata">{status}</span>
      ) : null}
      <span className="lab-section__corner" aria-hidden="true" />
      {children}
    </section>
  );
}
