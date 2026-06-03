'use client'

import Image from "next/image"
import { useState, useCallback, useEffect } from 'react'
import {
  avvatar,
  avvatarDataUri,
  downloadSvg,
  EDGELESS_PALETTES,
  type PatternType,
  type ShapeType,
} from './avvatar-lib'

const PATTERNS: PatternType[] = ['grid', 'rings', 'blocks', 'diagonal', 'hex', 'radial', 'triangles']
const SHAPES: ShapeType[] = ['rect', 'circle', 'rounded', 'diamond']
const GRID_SIZES = [4, 5, 6, 7, 8]

function randomSeed(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function AvvatarWidget() {
  const [seed, setSeed] = useState('edgeless-lab')
  const [gridSize, setGridSize] = useState(6)
  const [palette, setPalette] = useState('indigo-dark')
  const [patternType, setPatternType] = useState<PatternType | undefined>(undefined)
  const [shape, setShape] = useState<ShapeType>('rounded')
  const [symmetric, setSymmetric] = useState(true)
  const [svg, setSvg] = useState('')
  const [dataUri, setDataUri] = useState('')

  const regenerate = useCallback(() => {
    const opts = {
      seed,
      size: 512,
      gridSize,
      palette,
      patternType,
      shape,
      symmetric,
      optimized: true,
    }
    const s = avvatar(opts)
    setSvg(s)
    setDataUri(avvatarDataUri(opts))
  }, [seed, gridSize, palette, patternType, shape, symmetric])

  useEffect(() => {
    const frame = requestAnimationFrame(regenerate)
    return () => cancelAnimationFrame(frame)
  }, [regenerate])

  const reroll = () => {
    setSeed(randomSeed())
  }

  const rerollPalette = () => {
    const idx = Math.floor(Math.random() * EDGELESS_PALETTES.length)
    setPalette(EDGELESS_PALETTES[idx].name)
  }

  const rerollPattern = () => {
    const idx = Math.floor(Math.random() * PATTERNS.length)
    setPatternType(PATTERNS[idx])
  }

  const rerollShape = () => {
    const idx = Math.floor(Math.random() * SHAPES.length)
    setShape(SHAPES[idx])
  }

  const activePalette = EDGELESS_PALETTES.find((p) => p.name === palette)

  return (
    <div className="w-full max-w-[720px] mx-auto">
      {/* Avatar display */}
      <div
        className="relative rounded-2xl overflow-hidden border mb-6 flex items-center justify-center"
        style={{
          background: activePalette?.background || '#09090B',
          borderColor: 'rgba(255,255,255,0.08)',
          aspectRatio: '1 / 1',
        }}
      >
        {dataUri && (
          <Image
            src={dataUri}
            alt="Generated avvatar"
            width={512}
            height={512}
            className="w-full h-full object-contain p-8"
            style={{ imageRendering: 'auto' }}
          />
        )}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => downloadSvg(svg, `avvatar-${seed.slice(0, 8)}.svg`)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:brightness-110"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#FAFAFA' }}
          >
            Download SVG
          </button>
        </div>
      </div>

      {/* Reroll bar */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={reroll}
          className="flex-1 h-11 rounded-full text-sm font-medium text-white transition-all hover:brightness-110 hover:scale-[1.02]"
          style={{ background: '#818CF8' }}
        >
          Reroll Seed
        </button>
        <button
          onClick={rerollPalette}
          className="flex-1 h-11 rounded-full text-sm font-medium transition-all hover:brightness-110 hover:scale-[1.02] border"
          style={{ color: '#FAFAFA', borderColor: 'rgba(255,255,255,0.15)', background: 'transparent' }}
        >
          Reroll Palette
        </button>
        <button
          onClick={rerollPattern}
          className="flex-1 h-11 rounded-full text-sm font-medium transition-all hover:brightness-110 hover:scale-[1.02] border"
          style={{ color: '#FAFAFA', borderColor: 'rgba(255,255,255,0.15)', background: 'transparent' }}
        >
          Reroll Pattern
        </button>
        <button
          onClick={rerollShape}
          className="flex-1 h-11 rounded-full text-sm font-medium transition-all hover:brightness-110 hover:scale-[1.02] border"
          style={{ color: '#FAFAFA', borderColor: 'rgba(255,255,255,0.15)', background: 'transparent' }}
        >
          Reroll Shape
        </button>
      </div>

      {/* Controls */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ background: '#111113', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.12em] mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Seed
            </label>
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="w-full h-10 px-3 rounded-lg text-sm bg-transparent border outline-none focus:border-white/25 transition-colors"
              style={{ color: '#FAFAFA', borderColor: 'rgba(255,255,255,0.12)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.12em] mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Palette
            </label>
            <select
              value={palette}
              onChange={(e) => setPalette(e.target.value)}
              className="w-full h-10 px-3 rounded-lg text-sm bg-transparent border outline-none focus:border-white/25 transition-colors appearance-none"
              style={{ color: '#FAFAFA', borderColor: 'rgba(255,255,255,0.12)' }}
            >
              {EDGELESS_PALETTES.map((p) => (
                <option key={p.name} value={p.name} style={{ background: '#111113', color: '#FAFAFA' }}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.12em] mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Grid Size
            </label>
            <select
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg text-sm bg-transparent border outline-none focus:border-white/25 transition-colors appearance-none"
              style={{ color: '#FAFAFA', borderColor: 'rgba(255,255,255,0.12)' }}
            >
              {GRID_SIZES.map((g) => (
                <option key={g} value={g} style={{ background: '#111113', color: '#FAFAFA' }}>
                  {g} x {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.12em] mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Pattern
            </label>
            <select
              value={patternType || ''}
              onChange={(e) => setPatternType((e.target.value as PatternType) || undefined)}
              className="w-full h-10 px-3 rounded-lg text-sm bg-transparent border outline-none focus:border-white/25 transition-colors appearance-none"
              style={{ color: '#FAFAFA', borderColor: 'rgba(255,255,255,0.12)' }}
            >
              <option value="" style={{ background: '#111113', color: '#FAFAFA' }}>Random (from seed)</option>
              {PATTERNS.map((p) => (
                <option key={p} value={p} style={{ background: '#111113', color: '#FAFAFA' }}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.12em] mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Shape
            </label>
            <select
              value={shape}
              onChange={(e) => setShape(e.target.value as ShapeType)}
              className="w-full h-10 px-3 rounded-lg text-sm bg-transparent border outline-none focus:border-white/25 transition-colors appearance-none"
              style={{ color: '#FAFAFA', borderColor: 'rgba(255,255,255,0.12)' }}
            >
              {SHAPES.map((s) => (
                <option key={s} value={s} style={{ background: '#111113', color: '#FAFAFA' }}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="symmetric"
            type="checkbox"
            checked={symmetric}
            onChange={(e) => setSymmetric(e.target.checked)}
            className="w-4 h-4 rounded accent-[#818CF8]"
          />
          <label htmlFor="symmetric" className="text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>
            Mirror horizontally
          </label>
        </div>
      </div>

      {/* Attribution */}
      <p className="text-center mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Based on{' '}
        <a href="https://github.com/visualizevalue/avvatars" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">
          avvatars
        </a>{' '}
        by{' '}
        <a href="https://visualizevalue.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">
          Visualize Value / Jack Butcher
        </a>
        . Extended by Edgeless Lab.
      </p>
    </div>
  )
}
