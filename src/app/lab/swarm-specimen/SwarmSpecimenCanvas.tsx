"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, createShapeId, useValue, type Editor, type TLShapeId } from "tldraw";
import "tldraw/tldraw.css";
import "./swarm-specimen.css";
import { SpecimenShapeUtil, simAtom } from "./shapes";
import { initState, step, labNote, ROLES, FIELD, type SimState } from "./sim";

const customShapeUtils = [SpecimenShapeUtil];

function readSeed(): number {
  if (typeof window === "undefined") return 1;
  const q = new URLSearchParams(window.location.search).get("seed");
  const n = q ? parseInt(q, 10) : NaN;
  return Number.isFinite(n) ? n : Math.floor(Math.random() * 1e6);
}

export default function SwarmSpecimenCanvas() {
  const editorRef = useRef<Editor | null>(null);
  const shapeIdRef = useRef<TLShapeId | null>(null);
  const [running, setRunning] = useState(false);
  const [seed, setSeed] = useState<number>(1);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const runningRef = useRef(false);
  runningRef.current = running;

  const reset = useCallback((newSeed: number) => {
    setRunning(false);
    setSeed(newSeed);
    simAtom.set(initState(newSeed));
    const ed = editorRef.current;
    if (ed && shapeIdRef.current) ed.zoomToFit({ animation: { duration: 200 } });
  }, []);

  const onMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    const s0 = readSeed();
    const id = createShapeId("specimen");
    shapeIdRef.current = id;
    editor.createShape({ id, type: "specimen", x: 0, y: 0 });
    editor.updateShape({ id, type: "specimen", isLocked: true });
    simAtom.set(initState(s0));
    setSeed(s0);
    editor.zoomToFit();
    editor.setCameraOptions({ wheelBehavior: "zoom" });
  }, []);

  // fixed-step simulation loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last;
      last = now;
      if (!runningRef.current) return;
      acc += dt;
      let guard = 0;
      while (acc >= 33 && guard < 4) {
        const s = step(simAtom.get());
        simAtom.set(s);
        acc -= 33;
        guard++;
        if (s.settled) { setRunning(false); acc = 0; break; }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // click-to-place agents (assemble your ecology)
  const onCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!adding) return;
    const ed = editorRef.current;
    if (!ed) return;
    const p = ed.screenToPage({ x: e.clientX, y: e.clientY });
    if (p.x < 0 || p.y < 0 || p.x > FIELD.w || p.y > FIELD.h) return;
    const s = simAtom.get();
    const id = s.agents.length;
    simAtom.set({
      ...s,
      agents: [
        ...s.agents,
        { id, role: ROLES[id % ROLES.length], x: p.x, y: p.y, vx: 0, vy: 0,
          energy: 88, alive: true, arrived: false, mode: "goal" as const, trail: [] },
      ],
    });
  }, [adding]);

  const exportPng = useCallback(async () => {
    const ed = editorRef.current;
    const id = shapeIdRef.current;
    if (!ed || !id) return;
    const res = await ed.toImage([id], { format: "png", background: true, scale: 2, padding: 24 });
    const url = URL.createObjectURL(res.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swarm-specimen-${seed}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, [seed]);

  const share = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?seed=${seed}`;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, [seed]);

  return (
    <div className="ss-wrap">
      <div className="ss-canvas" onClickCapture={onCanvasClick} style={{ cursor: adding ? "crosshair" : undefined }}>
        <Tldraw shapeUtils={customShapeUtils} onMount={onMount} hideUi />
      </div>
      <Controls
        running={running}
        adding={adding}
        seed={seed}
        copied={copied}
        onToggleRun={() => setRunning((r) => !r)}
        onReset={() => reset(seed)}
        onReseed={() => {
          const ns = Math.floor(Math.random() * 1e6);
          if (typeof window !== "undefined") {
            const u = new URL(window.location.href);
            u.searchParams.set("seed", String(ns));
            window.history.replaceState({}, "", u);
          }
          reset(ns);
        }}
        onToggleAdd={() => setAdding((a) => !a)}
        onExport={exportPng}
        onShare={share}
      />
      <LabNote />
    </div>
  );
}

function Controls(p: {
  running: boolean; adding: boolean; seed: number; copied: boolean;
  onToggleRun: () => void; onReset: () => void; onReseed: () => void;
  onToggleAdd: () => void; onExport: () => void; onShare: () => void;
}) {
  return (
    <div className="ss-controls">
      <button className="ss-btn ss-primary" onClick={p.onToggleRun}>{p.running ? "❚❚ Pause" : "▶ Run"}</button>
      <button className="ss-btn" onClick={p.onReset}>↺ Reset</button>
      <button className={`ss-btn ${p.adding ? "ss-on" : ""}`} onClick={p.onToggleAdd}>
        {p.adding ? "＋ Click to place" : "＋ Add agent"}
      </button>
      <button className="ss-btn" onClick={p.onReseed}>⟳ New specimen</button>
      <span className="ss-spacer" />
      <span className="ss-seed">seed {p.seed}</span>
      <button className="ss-btn" onClick={p.onShare}>{p.copied ? "copied ✓" : "⧉ Share"}</button>
      <button className="ss-btn" onClick={p.onExport}>↓ Export</button>
    </div>
  );
}

function LabNote() {
  const s = useValue(simAtom);
  const alive = s.agents.filter((a) => a.alive).length;
  const arrived = s.agents.filter((a) => a.arrived).length;
  const recent = s.events.slice(-4).reverse();
  return (
    <div className="ss-note">
      <div className="ss-note-h">
        <span>FIELD NOTE</span>
        <span className="ss-stats">t{s.tick} · {alive}/{s.agents.length} alive · {arrived} arrived</span>
      </div>
      {s.settled ? (
        <div className="ss-postmortem">
          {labNote(s).map((l, i) => (
            <p key={i} className={i === labNote(s).length - 1 ? "ss-verdict" : ""}>{l}</p>
          ))}
        </div>
      ) : s.tick === 0 ? (
        <p className="ss-hint">Place a few agents, then press Run. Watch the ecology try to reach the beacon before it burns out.</p>
      ) : (
        <ul className="ss-feed">
          {recent.map((e, i) => <li key={i}><span className="ss-t">t{e.tick}</span> {e.text}</li>)}
        </ul>
      )}
    </div>
  );
}

export type { SimState };
