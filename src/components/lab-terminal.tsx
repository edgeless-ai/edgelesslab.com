"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

type LineKind = "cmd" | "out" | "ok" | "done";
type Line = { kind: LineKind; text: string };

/** Scripted session. Front-end only — no shell, no backend. */
const SCRIPT: Line[] = [
  { kind: "cmd", text: "open workspace" },
  { kind: "out", text: "opening edgeless field lab" },
  { kind: "ok", text: "generative systems    loaded" },
  { kind: "ok", text: "field-notes archive   mounted" },
  { kind: "cmd", text: "run flow-field --seed 4821" },
  { kind: "out", text: "rendering 12,000 particles ........." },
  { kind: "ok", text: "plot exported to svg  plotter-ready" },
  { kind: "cmd", text: "status" },
  { kind: "done", text: "workspace live — it keeps running without you" },
];

const HELP: Line[] = [
  { kind: "out", text: "commands: open workspace / run <system> / status" },
  { kind: "out", text: "this is a guided demo of the lab, not a live shell" },
];

const KIND_COLOR: Record<LineKind, string> = {
  cmd: "var(--text-primary)",
  out: "var(--text-tertiary)",
  ok: "var(--green)",
  done: "var(--accent)",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function LabTerminal({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const runToken = useRef(0);
  const started = useRef(false);
  const reduceMotion = useReducedMotion();
  const inView = useInView(containerRef, { once: true, margin: "0px 0px -15% 0px" });

  const [lines, setLines] = useState<Line[]>([]);
  const [typing, setTyping] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "ready">("idle");

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, typing]);

  const play = useCallback(
    async (script: Line[]) => {
      const token = ++runToken.current;
      const alive = () => token === runToken.current;
      setLines([]);
      setTyping("");
      setStatus("running");

      if (reduceMotion) {
        setLines(script);
        setStatus("ready");
        return;
      }

      for (const line of script) {
        if (!alive()) return;
        if (line.kind === "cmd") {
          for (let i = 1; i <= line.text.length; i++) {
            if (!alive()) return;
            setTyping(line.text.slice(0, i));
            await sleep(28);
          }
          await sleep(180);
          if (!alive()) return;
          setTyping("");
          setLines((prev) => [...prev, line]);
        } else {
          await sleep(line.kind === "ok" || line.kind === "done" ? 260 : 160);
          if (!alive()) return;
          setLines((prev) => [...prev, line]);
        }
      }
      if (alive()) setStatus("ready");
    },
    [reduceMotion]
  );

  useEffect(() => {
    if (inView && !started.current) {
      started.current = true;
      void play(SCRIPT);
    }
  }, [inView, play]);

  // Backstop: if the viewport observer never fires, play anyway so the
  // screen is never left empty.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!started.current) {
        started.current = true;
        void play(SCRIPT);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [play]);

  return (
    <div ref={containerRef} className={`lab-term${className ? ` ${className}` : ""}`}>
      <div className="lab-term__bar">
        <span className="lab-term__dots" aria-hidden="true">
          <i /><i /><i />
        </span>
        <span className="lab-term__title lab-metadata">workspace</span>
        <span
          className="lab-term__status lab-metadata"
          data-state={status}
        >
          <span className="lab-term__led" aria-hidden="true" />
          {status === "running" ? "RUNNING" : "READY"}
        </span>
      </div>

      <div ref={scrollRef} className="lab-term__screen" role="log" aria-live="polite">
        {lines.map((line, i) => (
          <div key={i} className="lab-term__line" style={{ color: KIND_COLOR[line.kind] }}>
            {line.kind === "cmd" ? <span className="lab-term__prompt">›</span> : null}
            {line.kind === "ok" ? <span className="lab-term__check">✓</span> : null}
            <span>{line.text}</span>
          </div>
        ))}
        {typing ? (
          <div className="lab-term__line" style={{ color: KIND_COLOR.cmd }}>
            <span className="lab-term__prompt">›</span>
            <span>{typing}</span>
            <span className="lab-term__caret" aria-hidden="true" />
          </div>
        ) : null}
      </div>

      <div className="lab-term__actions">
        <span className="lab-term__hint lab-metadata">try: open workspace</span>
        <div className="lab-term__buttons">
          <button type="button" className="lab-term__btn" onClick={() => void play(SCRIPT)}>
            RUN
          </button>
          <button type="button" className="lab-term__btn" onClick={() => void play(HELP)}>
            HELP
          </button>
          <button
            type="button"
            className="lab-term__btn"
            onClick={() => {
              runToken.current++;
              setLines([]);
              setTyping("");
              setStatus("idle");
            }}
          >
            CLEAR
          </button>
        </div>
      </div>
    </div>
  );
}
