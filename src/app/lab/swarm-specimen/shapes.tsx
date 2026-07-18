// One custom tldraw shape renders the whole ecology as an SVG "specimen card".
// The sim lives in a reactive `atom`; the shape reads it with `useValue`, so frames
// update with zero store/history churn while tldraw still owns pan / zoom / export.
import {
  ShapeUtil,
  HTMLContainer,
  Rectangle2d,
  T,
  atom,
  useValue,
  type TLBaseShape,
  type RecordProps,
} from "tldraw";
import { initState, FIELD, type Role, type SimState } from "./sim";

export type SpecimenShape = TLBaseShape<"specimen", { w: number; h: number }>;

// shared reactive sim state — the loop sets it, the shape (and UI) read it
export const simAtom = atom<SimState>("sim", initState(1));

const ROLE_COLOR: Record<Role, string> = {
  explorer: "#4a6fa5",
  optimizer: "#7c6aa8",
  caretaker: "#5a8a6a",
  opportunist: "#b0743a",
};
const AMBER = "#c9a227";
const TEAL = "#3f8a8a";
const INK = "#232323";
const FAINT = "#c9c6bf";

function Scene() {
  const s = useValue(simAtom);
  const { w, h } = FIELD;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      {/* paper + hairline frame */}
      <rect x={0} y={0} width={w} height={h} fill="#f7f6f2" />
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} fill="none" stroke={FAINT} strokeWidth={1} />
      {/* faint measurement grid */}
      {Array.from({ length: Math.floor(w / 50) }, (_, i) => (
        <line key={`v${i}`} x1={i * 50} y1={0} x2={i * 50} y2={h} stroke={FAINT} strokeWidth={0.5} opacity={0.4} />
      ))}
      {Array.from({ length: Math.floor(h / 50) }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 50} x2={w} y2={i * 50} stroke={FAINT} strokeWidth={0.5} opacity={0.4} />
      ))}

      {/* resources — hollow node with a depletion arc */}
      {s.resources.map((r) => {
        const frac = r.amount / r.max;
        const R = 22;
        const c = 2 * Math.PI * R;
        return (
          <g key={`r${r.id}`}>
            <circle cx={r.x} cy={r.y} r={R} fill="none" stroke={FAINT} strokeWidth={2} />
            <circle
              cx={r.x} cy={r.y} r={R} fill="none" stroke={TEAL} strokeWidth={2}
              strokeDasharray={`${c * frac} ${c}`} transform={`rotate(-90 ${r.x} ${r.y})`}
              opacity={frac > 0 ? 1 : 0.15}
            />
            <text x={r.x} y={r.y + 4} textAnchor="middle" fontSize={11} fill={INK} fontFamily="ui-monospace, monospace">
              {Math.max(0, Math.round(r.amount))}
            </text>
          </g>
        );
      })}

      {/* beacon — concentric rings, subtle pulse keyed to tick */}
      {[38, 26, 14].map((rr, i) => (
        <circle
          key={`b${i}`} cx={s.beacon.x} cy={s.beacon.y} r={rr + (s.tick % 40) / (i + 2)}
          fill="none" stroke={AMBER} strokeWidth={i === 2 ? 2.5 : 1} opacity={0.85 - i * 0.22}
        />
      ))}
      <circle cx={s.beacon.x} cy={s.beacon.y} r={4} fill={AMBER} />

      {/* trails — fading temporal ghosts */}
      {s.agents.map((a) =>
        a.trail.map((p, i) => (
          <circle
            key={`t${a.id}-${i}`} cx={p.x} cy={p.y} r={1.6}
            fill={ROLE_COLOR[a.role]} opacity={(i / a.trail.length) * (a.alive ? 0.35 : 0.15)}
          />
        )),
      )}

      {/* agents — glyph + energy ring + id */}
      {s.agents.map((a) => {
        const col = ROLE_COLOR[a.role];
        const R = 9;
        const c = 2 * Math.PI * (R + 4);
        const e = Math.max(0, Math.min(1, a.energy / 100));
        return (
          <g key={`a${a.id}`} opacity={a.alive ? 1 : 0.35}>
            <circle
              cx={a.x} cy={a.y} r={R + 4} fill="none" stroke={col} strokeWidth={2}
              strokeDasharray={`${c * e} ${c}`} transform={`rotate(-90 ${a.x} ${a.y})`}
            />
            <circle cx={a.x} cy={a.y} r={R} fill={a.alive ? col : "#9a9a9a"} />
            {a.arrived && (
              <circle cx={a.x + R - 1} cy={a.y - R + 1} r={3.5} fill={AMBER} stroke="#f7f6f2" strokeWidth={1} />
            )}
            <text x={a.x} y={a.y + 3.5} textAnchor="middle" fontSize={9} fill="#fff" fontFamily="ui-monospace, monospace" fontWeight={700}>
              {a.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export class SpecimenShapeUtil extends ShapeUtil<SpecimenShape> {
  static override type = "specimen" as const;
  static override props: RecordProps<SpecimenShape> = { w: T.number, h: T.number };

  getDefaultProps(): SpecimenShape["props"] {
    return { w: FIELD.w, h: FIELD.h };
  }
  override canResize = () => false;
  override hideRotateHandle = () => true;
  override canEdit = () => false;
  override isAspectRatioLocked = () => true;

  getGeometry(shape: SpecimenShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }
  component() {
    return (
      <HTMLContainer style={{ pointerEvents: "all", overflow: "hidden" }}>
        <Scene />
      </HTMLContainer>
    );
  }
  indicator(shape: SpecimenShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
