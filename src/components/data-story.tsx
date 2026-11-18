"use client";

import { useEffect, useState } from "react";
import type { DataStoryConfig } from "@/lib/blog-types";
import { chartPath, crashShare, parseDailySnapshot, type DailySnapshot } from "@/lib/data-story";
import styles from "./data-story.module.css";

export function DataStory({ config }: { config: DataStoryConfig }) {
  const [snapshot, setSnapshot] = useState<DailySnapshot | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(config.dataUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((value: unknown) => {
        const parsed = parseDailySnapshot(value);
        setSelected(parsed.rows.length - 1);
        setSnapshot(parsed);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(`Data story unavailable: ${cause instanceof Error ? cause.message : "invalid data"}`);
      });
    return () => controller.abort();
  }, [config.dataUrl]);

  useEffect(() => {
    if (!playing || !snapshot) return;
    const stopWhenHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", stopWhenHidden);
    const timer = window.setInterval(() => setSelected((day) => (day + 1) % snapshot.rows.length), 1100);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, [playing, snapshot]);

  const row = snapshot?.rows[selected];
  const x = snapshot ? 48 + selected * 448 / Math.max(1, snapshot.rows.length - 1) : 48;
  const y = row ? 224 - crashShare(row) * 184 : 224;

  return (
    <section className={styles.story} aria-label={config.title}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Data story · UTC daily cohorts</p>
          <h2>{config.title}</h2>
        </div>
        <span className={styles.unit}>Crash share of runs · 0–100%</span>
      </div>

      {error ? <div className={styles.noScript}><p role="alert" className={styles.error}>{error}</p><picture><source media="(prefers-reduced-motion: reduce)" srcSet={config.posterUrl} /><source media="(max-width: 640px)" srcSet={config.previewUrl} /><img src={config.posterUrl} alt="Daily crash-status chart while aggregates are unavailable" /></picture></div> : snapshot && row ? (
        <div id="interactive-data-story">
          <div className={styles.chartScroll}>
            <svg data-testid="data-story-chart" viewBox="0 0 560 268" role="img" aria-label={`Crash share through ${row.day}: ${row.crashed} of ${row.runs} runs`}>
              {[0, 0.5, 1].map((fraction) => <g key={fraction}>
                <line x1="48" x2="496" y1={224 - fraction * 184} y2={224 - fraction * 184} className={styles.grid} />
                <text x="42" y={229 - fraction * 184} textAnchor="end" className={styles.axis}>{Math.round(fraction * 100)}%</text>
              </g>)}
              <path d={chartPath(snapshot.rows, snapshot.rows.length - 1)} className={styles.context} aria-hidden="true" />
              <path data-testid="crash-path" d={chartPath(snapshot.rows, selected)} className={styles.line} />
              <circle data-testid="selected-mark" cx={x} cy={y} r="6" className={styles.mark} />
              <text x="48" y="252" className={styles.axis}>{snapshot.rows[0].day.slice(5)} UTC</text>
              <text x="496" y="252" textAnchor="end" className={styles.axis}>{snapshot.rows.at(-1)?.day.slice(5)} UTC</text>
              <text x={Math.min(x + 12, 510)} y={Math.max(y - 12, 28)} textAnchor={x > 400 ? "end" : "start"} className={styles.directLabel}>Crash share</text>
            </svg>
          </div>
          <div className={styles.readout} aria-live="polite">
            <strong>{row.day} UTC</strong>
            <span>{(crashShare(row) * 100).toFixed(1)}% crashed · {row.crashed} / {row.runs} runs</span>
            <small>{row.done} recorded done · other statuses omitted</small>
          </div>
          <div className={styles.controls}>
            <button type="button" onClick={() => {
              if (!playing && selected === snapshot.rows.length - 1) setSelected(0);
              setPlaying((value) => !value);
            }} aria-label={playing ? "Pause data story" : "Play data story"}>{playing ? "Pause" : "Play"}</button>
            <label htmlFor="data-story-day">Select UTC start day</label>
            <input id="data-story-day" aria-label="Select UTC start day" type="range" min="0" max={snapshot.rows.length - 1} step="1" value={selected} onChange={(event) => { setPlaying(false); setSelected(Number(event.target.value)); }} />
          </div>
          <div className={styles.source}>
            <p><strong>Method.</strong> {snapshot.source}. {snapshot.cohort}. Snapshot: {snapshot.observedAt}. Runs are attempts, not unique tasks; “done” is a recorded status, not audited business success. Other statuses are omitted, not zero. These counts do not establish downtime, cause, or a fix.</p>
            <details><summary>Exact SQL query</summary><pre>{snapshot.query}</pre></details>
          </div>
        </div>
      ) : <p role="status">Loading daily aggregates…</p>}
      <div className={styles.source}>
        <p>Source: aggregate-only internal task-run ledger snapshot. UTC start-day cohorts, not service availability. <a href={config.dataUrl} download>Download JSON</a> · <a href={config.previewUrl}>Animated preview (GIF)</a> · <a href={config.notebookUrl} download>Run the notebook (.py)</a> with <code>uvx marimo run --sandbox notebook.py</code>.</p>
      </div>
      <noscript><div className={styles.noScript}><picture><source media="(prefers-reduced-motion: reduce)" srcSet={config.posterUrl} /><source media="(max-width: 640px)" srcSet={config.previewUrl} /><img src={config.posterUrl} alt="Daily crash-status chart preview" /></picture><p>Interactive chart needs JavaScript. <a href={config.dataUrl}>Download the daily aggregates</a>.</p></div></noscript>
    </section>
  );
}
