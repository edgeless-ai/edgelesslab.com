/**
 * Edgeless Avvatars -- inline library
 * Based on avvatars by Visualize Value (Jack Butcher) -- https://github.com/visualizevalue/avvatars
 * Extended with Edgeless Lab palette, new patterns, and shapes.
 * License: WTFPL
 */

export interface EdgelessPalette {
  name: string
  foreground: string
  background: string
}

export const EDGELESS_PALETTES: EdgelessPalette[] = [
  { name: 'indigo-dark', foreground: '#818CF8', background: '#09090B' },
  { name: 'indigo-light', foreground: '#A5B4FC', background: '#111113' },
  { name: 'emerald-dark', foreground: '#34D399', background: '#09090B' },
  { name: 'emerald-light', foreground: '#6EE7B7', background: '#111113' },
  { name: 'rose-dark', foreground: '#FB7185', background: '#09090B' },
  { name: 'rose-light', foreground: '#FDA4AF', background: '#111113' },
  { name: 'amber-dark', foreground: '#FBBF24', background: '#09090B' },
  { name: 'amber-light', foreground: '#FCD34D', background: '#111113' },
  { name: 'cyan-dark', foreground: '#22D3EE', background: '#09090B' },
  { name: 'cyan-light', foreground: '#67E8F9', background: '#111113' },
  { name: 'mono-dark', foreground: '#FAFAFA', background: '#09090B' },
  { name: 'mono-light', foreground: '#E4E4E7', background: '#111113' },
]

export type PatternType = 'grid' | 'rings' | 'blocks' | 'diagonal' | 'hex' | 'radial' | 'triangles'
export type ShapeType = 'rect' | 'circle' | 'rounded' | 'diamond'

function hashSeed(seed: string): number[] {
  const hash: number[] = []
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    h1 = Math.imul(h1 ^ char, 2654435761)
    h2 = Math.imul(h2 ^ char, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  let state = h1 + h2
  for (let i = 0; i < 64; i++) {
    state = Math.imul(state ^ (state >>> 15), 1 | state)
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state)
    hash.push(((state ^ (state >>> 14)) >>> 0) / 4294967296)
  }
  return hash
}

function getHashValue(hash: number[], index: number): number {
  return hash[index % hash.length]
}

function getHashBool(hash: number[], index: number, threshold = 0.5): boolean {
  return getHashValue(hash, index) > threshold
}

function getHashInt(hash: number[], index: number, min: number, max: number): number {
  return Math.floor(getHashValue(hash, index) * (max - min + 1)) + min
}

interface Pattern {
  cells: boolean[][]
  type: PatternType
  gridSize: number
}

function generatePattern(
  seed: string,
  gridSize = 5,
  symmetric = true,
  patternType?: PatternType
): Pattern {
  const hash = hashSeed(seed)
  const types: PatternType[] = ['grid', 'rings', 'blocks', 'diagonal', 'hex', 'radial', 'triangles']
  const type = patternType || types[getHashInt(hash, 0, 0, types.length - 1)]
  const cells: boolean[][] = []
  const halfWidth = symmetric ? Math.ceil(gridSize / 2) : gridSize

  for (let y = 0; y < gridSize; y++) {
    const row: boolean[] = []
    for (let x = 0; x < gridSize; x++) {
      const effectiveX = symmetric && x >= halfWidth ? gridSize - 1 - x : x
      const index = y * halfWidth + effectiveX + 1
      let filled: boolean

      switch (type) {
        case 'rings': {
          const distFromCenter = Math.max(
            Math.abs(effectiveX - Math.floor(gridSize / 2)),
            Math.abs(y - Math.floor(gridSize / 2))
          )
          filled = getHashBool(hash, distFromCenter + index, 0.4)
          break
        }
        case 'blocks': {
          const blockX = Math.floor(effectiveX / 2)
          const blockY = Math.floor(y / 2)
          filled = getHashBool(hash, blockY * 3 + blockX + 1, 0.45)
          break
        }
        case 'diagonal': {
          const diag = (effectiveX + y) % 3
          filled = getHashBool(hash, index, 0.35 + diag * 0.15)
          break
        }
        case 'hex': {
          const hexOffset = y % 2
          const hx = Math.floor((effectiveX + hexOffset) / 2)
          const hy = Math.floor(y / 2)
          filled = getHashBool(hash, hy * 4 + hx + index, 0.48)
          break
        }
        case 'radial': {
          const cx = gridSize / 2 - 0.5
          const cy = gridSize / 2 - 0.5
          const dx = effectiveX - cx
          const dy = y - cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const ring = Math.floor(dist)
          filled = getHashBool(hash, ring + 7, 0.35 + (ring % 2) * 0.2)
          break
        }
        case 'triangles': {
          const triPhase = (effectiveX + y) % 2
          filled = getHashBool(hash, index + triPhase * 10, 0.42)
          break
        }
        default:
          filled = getHashBool(hash, index, 0.5)
      }
      row.push(filled)
    }
    cells.push(row)
  }

  return { cells, type, gridSize }
}

function renderSVG(
  pattern: Pattern,
  size = 100,
  foreground = '#000000',
  background = '#ffffff',
  padding = 0.15,
  shape: ShapeType = 'rect'
): string {
  const { cells, gridSize } = pattern
  const paddingPx = size * padding
  const innerSize = size - paddingPx * 2
  const cellSize = innerSize / gridSize
  const radius = shape === 'rounded' ? cellSize * 0.25 : 0

  let paths = ''
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (cells[y][x]) {
        const px = paddingPx + x * cellSize
        const py = paddingPx + y * cellSize
        if (shape === 'circle') {
          const cx = px + cellSize / 2
          const cy = py + cellSize / 2
          const r = cellSize * 0.42
          paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${foreground}"/>`
        } else if (shape === 'diamond') {
          const cx = px + cellSize / 2
          const cy = py + cellSize / 2
          const r = cellSize * 0.45
          paths += `<polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="${foreground}"/>`
        } else if (shape === 'rounded') {
          paths += `<rect x="${px}" y="${py}" width="${cellSize}" height="${cellSize}" rx="${radius}" fill="${foreground}"/>`
        } else {
          paths += `<rect x="${px}" y="${py}" width="${cellSize}" height="${cellSize}" fill="${foreground}"/>`
        }
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
<rect width="${size}" height="${size}" fill="${background}"/>
${paths}
</svg>`
}

function resolvePalette(
  foreground?: string,
  background?: string,
  paletteName?: string,
  seed?: string
): { foreground: string; background: string } {
  if (foreground && background) {
    return { foreground, background }
  }
  if (paletteName) {
    const p = EDGELESS_PALETTES.find((p) => p.name === paletteName)
    if (p) return { foreground: p.foreground, background: p.background }
  }
  const hash = seed || Math.random().toString()
  const idx = hash.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % EDGELESS_PALETTES.length
  return { foreground: EDGELESS_PALETTES[idx].foreground, background: EDGELESS_PALETTES[idx].background }
}

export interface AvvatarOptions {
  seed?: string
  size?: number
  gridSize?: number
  foreground?: string
  background?: string
  padding?: number
  symmetric?: boolean
  optimized?: boolean
  patternType?: PatternType
  shape?: ShapeType
  palette?: string
}

export function avvatar(options: AvvatarOptions = {}): string {
  const {
    seed = Math.random().toString(),
    size = 100,
    gridSize = 5,
    padding = 0.15,
    symmetric = true,
    patternType,
    shape = 'rect',
    foreground,
    background,
    palette,
  } = options

  const { foreground: fg, background: bg } = resolvePalette(foreground, background, palette, seed)
  const pattern = generatePattern(seed, gridSize, symmetric, patternType)
  return renderSVG(pattern, size, fg, bg, padding, shape)
}

export function avvatarDataUri(options: AvvatarOptions = {}): string {
  const svg = avvatar(options)
  const base64 = typeof Buffer !== 'undefined'
    ? Buffer.from(svg).toString('base64')
    : btoa(svg)
  return `data:image/svg+xml;base64,${base64}`
}

export function downloadSvg(svg: string, filename = 'avvatar.svg') {
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
