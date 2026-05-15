"use client";

import { useState } from "react";

export function DesignSystemShowcase() {
  const [activeTab, setActiveTab] = useState<"colors" | "typography" | "components">("colors");

  return (
    <div className="w-full max-w-4xl mx-auto p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          Edgeless Design System
        </h1>
        <p className="text-text-secondary">
          Dark-first, craft-focused design tokens inspired by Linear, Basement Studio, and Raycast.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 rounded-xl bg-surface border border-border-subtle">
        {(["colors", "typography", "components"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-fast ${
              activeTab === tab
                ? "bg-accent text-base font-semibold"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Colors Panel */}
      {activeTab === "colors" && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary font-mono">
              Surface Colors
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <ColorSwatch name="Base" variable="--bg-base" className="bg-base" />
              <ColorSwatch name="Surface" variable="--bg-surface" className="bg-surface" />
              <ColorSwatch name="Surface Hover" variable="--bg-surface-hover" className="bg-surface-hover" />
              <ColorSwatch name="Elevated" variable="--bg-elevated" className="bg-elevated" />
              <ColorSwatch name="Raised" variable="--bg-raised" className="bg-raised" />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary font-mono">
              Text Colors
            </h2>
            <div className="space-y-2 p-4 rounded-xl bg-surface border border-border-subtle">
              <p className="text-text-primary text-lg font-semibold">
                Primary text — FAFAFA
              </p>
              <p className="text-text-secondary">
                Secondary text — rgba(255, 255, 255, 0.65)
              </p>
              <p className="text-text-tertiary text-sm">
                Tertiary text — rgba(255, 255, 255, 0.45)
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary font-mono">
              Accent Colors
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ColorSwatch name="Accent" variable="--accent" className="bg-accent" textDark />
              <ColorSwatch name="Accent Hover" variable="--accent-hover" className="bg-accent-hover" textDark />
              <ColorSwatch name="Green" variable="--green" className="bg-green" textDark />
              <div className="p-4 rounded-xl border border-border-subtle bg-accent-muted">
                <span className="text-accent font-mono text-xs">--accent-muted</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Typography Panel */}
      {activeTab === "typography" && (
        <div className="space-y-6">
          <section className="space-y-4 p-6 rounded-xl bg-surface border border-border-subtle">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary font-mono mb-4">
              Type Scale
            </h2>
            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono text-text-tertiary">Display (48px)</span>
                <p className="text-5xl font-bold text-text-primary tracking-tight">Display Text</p>
              </div>
              <div>
                <span className="text-xs font-mono text-text-tertiary">H1 (36px)</span>
                <h1 className="text-4xl font-semibold text-text-primary">Heading One</h1>
              </div>
              <div>
                <span className="text-xs font-mono text-text-tertiary">H2 (24px)</span>
                <h2 className="text-2xl font-semibold text-text-primary">Heading Two</h2>
              </div>
              <div>
                <span className="text-xs font-mono text-text-tertiary">H3 (20px)</span>
                <h3 className="text-xl font-semibold text-text-primary">Heading Three</h3>
              </div>
              <div>
                <span className="text-xs font-mono text-text-tertiary">Body (16px)</span>
                <p className="text-base text-text-secondary">
                  Body text with comfortable line height for reading. Used for paragraphs and descriptions.
                </p>
              </div>
              <div>
                <span className="text-xs font-mono text-text-tertiary">Small (14px)</span>
                <p className="text-sm text-text-secondary">Small text for labels and secondary info.</p>
              </div>
              <div>
                <span className="text-xs font-mono text-text-tertiary">Caption (12px)</span>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Caption Text</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary font-mono">
              Font Families
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface border border-border-subtle">
                <span className="text-xs font-mono text-text-tertiary">--font-geist-sans</span>
                <p className="text-xl text-text-primary mt-2">
                  Geist Sans — The quick brown fox jumps over the lazy dog.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border-subtle">
                <span className="text-xs font-mono text-text-tertiary">--font-geist-mono</span>
                <p className="text-xl text-text-primary mt-2 font-mono">
                  Geist Mono — const x = 42;
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Components Panel */}
      {activeTab === "components" && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary font-mono">
              Buttons
            </h2>
            <div className="flex flex-wrap gap-3 p-6 rounded-xl bg-surface border border-border-subtle">
              <button className="px-4 py-2 rounded-lg font-medium bg-accent text-base hover:bg-accent-hover transition-colors duration-fast">
                Primary
              </button>
              <button className="px-4 py-2 rounded-lg font-medium border border-border-subtle text-text-secondary hover:bg-surface-hover hover:text-text-primary hover:border-border-focus transition-all duration-fast">
                Secondary
              </button>
              <button className="px-4 py-2 rounded-lg font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors duration-fast">
                Ghost
              </button>
              <button className="px-4 py-2 rounded-lg font-medium bg-green text-base hover:opacity-90 transition-opacity duration-fast">
                Success
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary font-mono">
              Cards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 rounded-xl bg-surface border border-border-subtle">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Surface Card</h3>
                <p className="text-sm text-text-secondary">
                  Default card with surface background and subtle border.
                </p>
              </div>
              <div className="p-6 rounded-xl bg-elevated border border-border-subtle">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Elevated Card</h3>
                <p className="text-sm text-text-secondary">
                  Higher elevation for modals, popovers, and dropdowns.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary font-mono">
              Border Radius
            </h2>
            <div className="flex flex-wrap items-center gap-4 p-6 rounded-xl bg-surface border border-border-subtle">
              <div className="w-16 h-16 bg-accent flex items-center justify-center text-xs font-mono text-base rounded-sm">
                sm
              </div>
              <div className="w-16 h-16 bg-accent flex items-center justify-center text-xs font-mono text-base rounded-md">
                md
              </div>
              <div className="w-16 h-16 bg-accent flex items-center justify-center text-xs font-mono text-base rounded-lg">
                lg
              </div>
              <div className="w-16 h-16 bg-accent flex items-center justify-center text-xs font-mono text-base rounded-xl">
                xl
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary font-mono">
              Animation Demo
            </h2>
            <div className="flex flex-wrap gap-4 p-6 rounded-xl bg-surface border border-border-subtle">
              <div className="px-4 py-2 rounded-lg bg-surface-hover text-text-secondary transition-all duration-fast ease-out hover:bg-accent hover:text-base hover:scale-105">
                Fast (150ms)
              </div>
              <div className="px-4 py-2 rounded-lg bg-surface-hover text-text-secondary transition-all duration-normal ease-out hover:bg-accent hover:text-base hover:scale-105">
                Normal (250ms)
              </div>
              <div className="px-4 py-2 rounded-lg bg-surface-hover text-text-secondary transition-all duration-slow ease-out hover:bg-accent hover:text-base hover:scale-105">
                Slow (400ms)
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ColorSwatch({
  name,
  variable,
  className,
  textDark,
}: {
  name: string;
  variable: string;
  className: string;
  textDark?: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl border border-border-subtle ${className}`}>
      <div className={textDark ? "text-base" : "text-text-primary"}>
        <p className="font-medium text-sm">{name}</p>
        <p className="font-mono text-xs opacity-70">{variable}</p>
      </div>
    </div>
  );
}
