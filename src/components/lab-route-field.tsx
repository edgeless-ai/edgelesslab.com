"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

const ROUTES = [
  {
    label: "Field Notes",
    code: "FIELD",
    href: "/field-notes",
    title: "Study the artifacts",
    description: "Generative systems, cited plots, visual research, and live experiments.",
  },
  {
    label: "Systems",
    code: "BUILD",
    href: "/projects",
    title: "Inspect what is running",
    description: "Agent infrastructure, memory, safety hooks, and tools built in production.",
  },
  {
    label: "Writing",
    code: "READ",
    href: "/blog",
    title: "Read the dispatches",
    description: "Methods, failures, recoveries, and lessons from operating the lab.",
  },
  {
    label: "Work together",
    code: "WORK",
    href: "/services/private-ai-systems",
    title: "Bring David into the problem",
    description: "Private AI systems, creative technology, and difficult technical builds.",
  },
] as const;

const SHAPES = [
  [
    [84, 205], [124, 166], [166, 140], [214, 128], [262, 142], [300, 178],
    [318, 224], [302, 270], [264, 302], [216, 314], [168, 300], [130, 270],
    [112, 228], [192, 218],
  ],
  [
    [86, 92], [190, 82], [300, 98], [430, 76], [530, 112], [116, 224],
    [238, 204], [342, 220], [480, 204], [90, 334], [210, 320], [334, 342],
    [510, 320], [318, 212],
  ],
  [
    [92, 92], [154, 92], [232, 92], [326, 92], [430, 92], [526, 92],
    [92, 206], [176, 206], [270, 206], [382, 206], [526, 206], [92, 320],
    [302, 320], [526, 320],
  ],
  [
    [82, 210], [128, 160], [128, 260], [188, 210], [242, 154], [242, 266],
    [306, 210], [366, 146], [366, 274], [438, 210], [488, 166], [488, 254],
    [554, 210], [306, 96],
  ],
] as const;

const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8],
  [8, 9], [9, 10], [10, 11], [11, 12], [12, 0], [2, 13], [6, 13],
  [9, 13], [13, 3], [13, 11],
] as const;

export function LabRouteField() {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const route = ROUTES[active];
  const points = SHAPES[active];
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.72, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <div className="lab-panel crop-frame overflow-hidden">
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <span className="lab-metadata" style={{ color: "var(--text-tertiary)" }}>
          Route field / {route.code}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2" style={{ background: "var(--accent)" }} />
          <span className="lab-metadata" style={{ color: "var(--accent)" }}>
            live
          </span>
        </span>
      </div>

      <div className="relative min-h-[420px] overflow-hidden">
        <svg
          viewBox="0 0 640 420"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`Network reorganized for ${route.label}`}
        >
          <defs>
            <pattern id="route-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="rgba(255,255,255,0.045)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="640" height="420" fill="url(#route-grid)" />

          {EDGES.map(([from, to], index) => (
            <motion.line
              key={`${from}-${to}`}
              animate={{
                x1: points[from][0],
                y1: points[from][1],
                x2: points[to][0],
                y2: points[to][1],
                opacity: index % 4 === active ? 0.95 : 0.32,
              }}
              transition={{ ...transition, delay: reduceMotion ? 0 : index * 0.012 }}
              stroke={index % 4 === active ? "var(--accent)" : "var(--relay)"}
              strokeWidth={index % 4 === active ? 1.8 : 1}
              strokeDasharray={index % 3 === 0 ? "5 7" : undefined}
            />
          ))}

          {points.map(([x, y], index) => (
            <motion.rect
              key={index}
              animate={{ x: x - 4, y: y - 4, rotate: active % 2 ? 45 : 0 }}
              transition={{ ...transition, delay: reduceMotion ? 0 : index * 0.018 }}
              width={index === 13 ? 12 : 8}
              height={index === 13 ? 12 : 8}
              fill={index === 13 ? "var(--accent)" : "var(--bg-base)"}
              stroke={index === 13 ? "var(--accent)" : "var(--relay)"}
              strokeWidth="1.5"
            />
          ))}
        </svg>

        <div className="absolute left-4 top-4 max-w-[250px] bg-black/70 p-3 backdrop-blur-sm sm:left-6 sm:top-6">
          <div className="lab-metadata mb-2" style={{ color: "var(--relay)" }}>
            {String(active + 1).padStart(2, "0")} / {ROUTES.length}
          </div>
          <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>
            {route.title}
          </p>
          <p className="mt-2 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
            {route.description}
          </p>
        </div>
      </div>

      <div className="grid border-t sm:grid-cols-2" style={{ borderColor: "var(--border-subtle)" }}>
        {ROUTES.map((item, index) => {
          const selected = active === index;
          return (
            <Link
              key={item.code}
              href={item.href}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              className="group flex min-h-14 items-center justify-between border-b px-4 py-3 transition-colors sm:border-r"
              style={{
                borderColor: "var(--border-subtle)",
                background: selected ? "var(--relay-muted)" : "transparent",
                color: selected ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <span>
                <span
                  className="mr-2 font-mono text-[10px]"
                  style={{ color: selected ? "var(--accent)" : "var(--text-tertiary)" }}
                >
                  {item.code}
                </span>
                <span className="text-sm">{item.label}</span>
              </span>
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
