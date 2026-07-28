"use client";
import dynamic from "next/dynamic";

// tldraw is client-only (touches window at import) — load it with ssr:false so the
// static export builds. Everything below only runs in the browser.
const Canvas = dynamic(() => import("./SwarmSpecimenCanvas"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "min(78vh, 780px)",
        border: "1px solid var(--border, #e3e0d8)",
        borderRadius: 10,
        display: "grid",
        placeItems: "center",
        background: "#f7f6f2",
        color: "#8a8578",
        fontFamily: "ui-monospace, monospace",
        fontSize: 13,
        letterSpacing: "0.1em",
      }}
    >
      ASSEMBLING SPECIMEN…
    </div>
  ),
});

export default function SwarmSpecimenEmbed() {
  return <Canvas />;
}
