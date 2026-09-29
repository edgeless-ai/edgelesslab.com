"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Grip, RotateCcw } from "lucide-react";

type Point = { x: number; y: number };

type WorkCard = {
  title: string;
  eyebrow: string;
  description: string;
  caseStudy: string;
  artifact: string;
  artifactLabel: string;
  source?: string;
};

const WORK_CARDS: WorkCard[] = [
  {
    title: "Agent safeguards",
    eyebrow: "Autonomous systems",
    description: "Guardrails that stop destructive agent actions before execution.",
    caseStudy: "/projects/safety-hooks",
    artifact: "/blog/the-hook-that-saved-my-codebase",
    artifactLabel: "Read the field report",
    source: "https://github.com/edgeless-ai/edgeless-stack",
  },
  {
    title: "Plotter research loop",
    eyebrow: "Code → physical artifact",
    description: "Procedural generators, machine judges, and a real pen plotter in one feedback loop.",
    caseStudy: "/projects/pen-plotter-art",
    artifact: "/pen-plotter/",
    artifactLabel: "Open the live journal",
  },
  {
    title: "Total Serialism",
    eyebrow: "98 playable systems",
    description: "Algorithmic art studies with controls, presets, and plotter-ready SVG export.",
    caseStudy: "/total-serialism/field-notes/",
    artifact: "/total-serialism/app/",
    artifactLabel: "Use the live system",
  },
  {
    title: "Tartanism",
    eyebrow: "Textile computation",
    description: "Formal thread counts, six weave structures, and loom-ready pattern exports.",
    caseStudy: "/tartanism/field-notes/",
    artifact: "/tartanism/app/",
    artifactLabel: "Open the weave engine",
  },
];

const CONNECTIONS = [
  {
    id: "observe",
    label: "Observe",
    title: "Field Notes",
    detail: "Methods, failures, evidence",
    href: "/field-notes",
    tone: "var(--accent)",
  },
  {
    id: "system",
    label: "Systematize",
    title: "Agent systems",
    detail: "Safety, memory, orchestration",
    href: "/projects",
    tone: "var(--relay)",
  },
  {
    id: "play",
    label: "Make playable",
    title: "Live studies",
    detail: "Generative tools in the browser",
    href: "/lab",
    tone: "var(--oxide)",
  },
  {
    id: "materialize",
    label: "Materialize",
    title: "Physical editions",
    detail: "Plotter paths, print, textiles",
    href: "https://shop.edgelesslab.com",
    tone: "var(--green)",
  },
];

function WorkCard({ card, index }: { card: WorkCard; index: number }) {
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ pointer: Point; offset: Point } | null>(null);

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    dragStart.current = {
      pointer: { x: event.clientX, y: event.clientY },
      offset,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!dragStart.current) return;
    setOffset({
      x: dragStart.current.offset.x + event.clientX - dragStart.current.pointer.x,
      y: dragStart.current.offset.y + event.clientY - dragStart.current.pointer.y,
    });
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStart.current = null;
    setDragging(false);
  }

  const dragStyle = {
    "--drag-x": `${offset.x}px`,
    "--drag-y": `${offset.y}px`,
    zIndex: dragging ? 20 : index + 1,
  } as CSSProperties;

  return (
    <article
      data-work-card={card.title}
      className="relative flex min-h-[260px] flex-col border p-5 transition-[border-color,box-shadow] md:min-h-[310px] md:[transform:translate(var(--drag-x),var(--drag-y))]"
      style={{
        ...dragStyle,
        borderColor: dragging ? "var(--accent)" : "var(--border-subtle)",
        background: "var(--bg-surface)",
        boxShadow: dragging ? "0 24px 70px rgba(0,0,0,0.45)" : "none",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="lab-metadata" style={{ color: "var(--text-tertiary)" }}>
          {String(index + 1).padStart(2, "0")} / {card.eyebrow}
        </span>
        <button
          type="button"
          aria-label={`Drag ${card.title} card`}
          className="hidden min-h-11 min-w-11 cursor-grab items-center justify-center border active:cursor-grabbing md:flex"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-tertiary)", touchAction: "none" }}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <Grip size={16} aria-hidden="true" />
        </button>
      </div>

      <h3 className="mt-10 text-2xl font-semibold tracking-[-0.025em]">{card.title}</h3>
      <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
        {card.description}
      </p>

      <div className="mt-auto space-y-3 pt-8 text-sm">
        <Link href={card.artifact} className="flex items-center justify-between gap-3" style={{ color: "var(--accent)" }}>
          {card.artifactLabel} <ArrowRight size={14} aria-hidden="true" />
        </Link>
        <Link href={card.caseStudy} className="flex items-center justify-between gap-3" style={{ color: "var(--text-secondary)" }}>
          Trace the method <ArrowRight size={14} aria-hidden="true" />
        </Link>
        {card.source ? (
          <a
            href={card.source}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Inspect the source <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        ) : null}
      </div>

      {offset.x !== 0 || offset.y !== 0 ? (
        <button
          type="button"
          className="absolute -bottom-11 right-0 hidden min-h-10 items-center gap-2 px-3 text-xs md:flex"
          style={{ color: "var(--text-tertiary)" }}
          onClick={() => setOffset({ x: 0, y: 0 })}
        >
          <RotateCcw size={13} aria-hidden="true" /> Reset card
        </button>
      ) : null}
    </article>
  );
}

export function HomeWorkbench() {
  return (
    <>
      <section className="border-y px-6 py-20 sm:py-28" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-10 grid gap-5 lg:grid-cols-[1fr_0.7fr] lg:items-end">
            <div>
              <div className="lab-metadata mb-4" style={{ color: "var(--accent)" }}>
                What I build / live workbench
              </div>
              <h2 className="font-editorial text-5xl leading-[0.95] sm:text-7xl">What&apos;s running now.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
              Not a capabilities list. These are working systems, their field reports, and the artifacts they produce. On larger screens, drag the cards to make your own reading order.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Draggable live project cards">
            {WORK_CARDS.map((card, index) => (
              <WorkCard key={card.title} card={card} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="field-sheet px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-12 grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <div className="lab-metadata mb-4" style={{ color: "var(--malachite)" }}>
                How it connects / working map
              </div>
              <h2 className="font-editorial text-5xl leading-[0.95] sm:text-7xl">From field note to working artifact.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6" style={{ color: "var(--ink-soft)" }}>
              The studio is one loop: observe a real failure, turn it into a system, expose the system as a playable study, then test it against a physical or operational constraint.
            </p>
          </div>

          <div className="relative grid gap-3 lg:grid-cols-4" aria-label="Edgeless Lab connections map">
            <div className="pointer-events-none absolute bottom-[8%] left-8 top-[8%] w-px lg:hidden" style={{ background: "var(--paper-rule)" }} />
            <div className="pointer-events-none absolute left-[8%] right-[8%] top-1/2 hidden h-px lg:block" style={{ background: "var(--paper-rule)" }} />
            {CONNECTIONS.map((node, index) => (
              <a
                key={node.id}
                href={node.href}
                className="group relative min-h-[180px] border p-5 transition-transform hover:-translate-y-1 lg:min-h-[220px]"
                style={{ background: "var(--paper)", borderColor: "var(--paper-rule)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="lab-metadata" style={{ color: node.tone }}>
                    {node.label}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border" style={{ borderColor: "var(--paper-rule)" }}>
                    {index === CONNECTIONS.length - 1 ? <ArrowUpRight size={14} /> : <ArrowRight size={14} />}
                  </span>
                </div>
                <div className="mt-16">
                  <div className="mb-3 h-2 w-2 rounded-full" style={{ background: node.tone }} />
                  <h3 className="font-editorial text-3xl">{node.title}</h3>
                  <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>
                    {node.detail}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
