/**
 * Procedural ground tiles: autotiled terrain layers (rounded, tufted edges), cliffs, ledges, fences, bushes, trees,
 * bridges, plus the animated overlays (water frames, swaying flowers, tall grass). Every tile is generated once into
 * a small canvas and cached by key, so a map build is just a pile of `drawImage` calls.
 */
import type { Theme } from '../types'
import { PALS } from './palette'
import { type Col, Px, hash, hex, mix, rng, shade, withAlpha } from './px'

export const N = 1
export const E = 2
export const S = 4
export const W = 8
export const NE = 16
export const SE = 32
export const SW = 64
export const NW = 128

/** Terrain precedence (higher layers draw over lower ones with an autotiled edge). */
export const T_FIELD = 0
export const T_ROCK = 1
export const T_DIRT = 2
export const T_SAND = 3
export const T_PAVED = 4
export const T_WATER = 5

export function terOf(ch: string | undefined): number {
  switch (ch) {
    case 'd':
      return T_ROCK
    case ':':
      return T_DIRT
    case 's':
      return T_SAND
    case '=':
      return T_PAVED
    case '~':
    case 'w':
      return T_WATER
    default:
      return T_FIELD
  }
}

const cache = new Map<string, HTMLCanvasElement>()
function cached(key: string, make: () => Px): HTMLCanvasElement {
  let c = cache.get(key)
  if (!c) {
    c = make().toCanvas()
    cache.set(key, c)
  }
  return c
}

const SHADOW = withAlpha(hex('#1a1030'), 60)
const THEME_SEED: Record<Theme, number> = { town: 11, meadow: 23, city: 37, canyon: 51, gallery: 67 }

/** Museum marble, woven runner and paneled walls; edges follow adjacent tiles. */
export function interiorTile(kind: string, mask: number, variant: number): HTMLCanvasElement {
  return cached(`interior|${kind}|${mask}|${variant}`, () => {
    const p = new Px(16, 16)
    if (kind === 'W') {
      p.rect(0, 0, 16, 16, hex('#293b45'))
      p.rect(1, 1, 14, 12, hex('#38545a'))
      p.hl(1, 1, 14, hex('#55716a'))
      p.vl(1, 2, 10, hex('#45635f'))
      if (!(mask & S)) {
        p.rect(0, 12, 16, 4, hex('#202d37'))
        p.hl(0, 12, 16, hex('#d1b36a'))
        p.hl(0, 14, 16, hex('#6c684f'))
      }
      if (!(mask & N)) {
        p.rect(0, 0, 16, 3, hex('#e5d8b6'))
        p.hl(0, 3, 16, hex('#968468'))
      }
      if (!(mask & W)) p.vl(0, 0, 16, hex('#a69772'))
      if (!(mask & E)) p.vl(15, 0, 16, hex('#a69772'))
    } else if (kind === 'r') {
      p.rect(0, 0, 16, 16, hex('#86354b'))
      for (let y = 1; y < 16; y += 3)
        for (let x = y % 2; x < 16; x += 3) p.set(x, y, hex('#963d50'))
      for (const [bit, x] of [[W, 0], [E, 14]])
        if (!(mask & bit)) {
          p.vl(x, 0, 16, hex('#e6c579'))
          p.vl(x + 1, 0, 16, hex('#b98b54'))
        }
      if (!(mask & N)) p.hl(0, 0, 16, hex('#e6c579'))
      if (!(mask & S)) p.hl(0, 15, 16, hex('#e6c579'))
      p.set(7, 7, hex('#b46460'))
      p.set(8, 8, hex('#b46460'))
    } else {
      p.rect(0, 0, 16, 16, hex(variant & 1 ? '#d4cabb' : '#e4dbcb'))
      p.hl(0, 0, 16, hex('#f5eddb'))
      p.vl(0, 0, 16, hex('#f5eddb'))
      p.hl(0, 15, 16, hex('#b4aa9f'))
      p.vl(15, 0, 16, hex('#b4aa9f'))
      for (let i = 0; i < 6; i++) p.set(3 + i, 3 + Math.floor(i / 2), hex('#c8bdaf'))
      p.hl(2, 12, 4, hex('#eee5d4'))
    }
    return p
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Autotile geometry

/** Grass tufts that poke 1px into path edges (indexed by position along the edge). */
const BUMP = [0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0]
/** Cliff-face boulder block boundaries per 5px band (16px period). */
const BLOCK_SPLITS = [
  [2, 8, 13],
  [0, 5, 11],
  [3, 9, 14],
]

/** Is local pixel (x,y) inside the terrain shape for a tile whose same-terrain neighbours are `mask`? */
function insideAt(x: number, y: number, mask: number, m: number, r: number, bumps: boolean): boolean {
  const west = x < 8
  const north = y < 8
  const h = mask & (west ? W : E)
  const v = mask & (north ? N : S)
  const dx = west ? x : 15 - x
  const dy = north ? y : 15 - y
  if (h && v) {
    if (mask & (north ? (west ? NW : NE) : west ? SW : SE)) return true
    return (dx + 0.5) ** 2 + (dy + 0.5) ** 2 > (m + 1) ** 2
  }
  const bx = bumps ? BUMP[y] : 0
  const by = bumps ? BUMP[x] : 0
  if (h) return dy >= m + by
  if (v) return dx >= m + bx
  const c = m + r
  if (dx >= c && dy >= c) return true
  if (dx >= c) return dy >= m + by
  if (dy >= c) return dx >= m + bx
  const ex = c - dx - 0.5
  const ey = c - dy - 0.5
  return ex * ex + ey * ey <= r * r + 0.6
}

/** Shape grid over [-3, 18] so rims can look past the tile edge. Index (y+3)*22+(x+3). */
function shapeGrid(mask: number, m: number, r: number, bumps: boolean): Uint8Array {
  const g = new Uint8Array(22 * 22)
  for (let y = -3; y < 19; y++)
    for (let x = -3; x < 19; x++) {
      let ok = true
      if (x < 0 && !(mask & W)) ok = false
      if (x > 15 && !(mask & E)) ok = false
      if (y < 0 && !(mask & N)) ok = false
      if (y > 15 && !(mask & S)) ok = false
      if (ok && x < 0 && y < 0) ok = !!(mask & NW)
      if (ok && x > 15 && y < 0) ok = !!(mask & NE)
      if (ok && x < 0 && y > 15) ok = !!(mask & SW)
      if (ok && x > 15 && y > 15) ok = !!(mask & SE)
      if (ok) ok = insideAt(Math.min(15, Math.max(0, x)), Math.min(15, Math.max(0, y)), mask, m, r, bumps)
      g[(y + 3) * 22 + x + 3] = ok ? 1 : 0
    }
  return g
}

interface Rim {
  /** 0 = interior (>3 from edge), else 1..3 = distance to the nearest outside pixel. */
  d: number
  /** Direction of nearest outside: 0 up, 1 side, 2 down. */
  dir: number
}

function rimAt(g: Uint8Array, x: number, y: number): Rim {
  const at = (xx: number, yy: number) => g[(yy + 3) * 22 + xx + 3]
  for (let d = 1; d <= 3; d++) {
    if (!at(x, y - d)) return { d, dir: 0 }
    if (!at(x, y + d)) return { d, dir: 2 }
    if (!at(x - d, y) || !at(x + d, y)) return { d, dir: 1 }
    for (let k = 1; k <= d; k++) {
      if (!at(x - k, y - d) || !at(x + k, y - d) || !at(x - d, y - k) || !at(x + d, y - k)) return { d, dir: 0 }
      if (!at(x - k, y + d) || !at(x + k, y + d) || !at(x - d, y + k) || !at(x + d, y + k)) return { d, dir: 2 }
    }
  }
  return { d: 0, dir: 0 }
}

// ---------------------------------------------------------------------------------------------------------------
// Textures

function grassMark(p: Px, x: number, y: number, dark: Col, light: Col): void {
  p.set(x, y + 1, dark)
  p.set(x + 1, y, dark)
  p.set(x + 2, y + 1, dark)
  p.set(x + 1, y - 1, light)
}

function fieldPx(theme: Theme, v: number): Px {
  const pal = PALS[theme]
  const p = new Px(16, 16)
  const [, dark, base, light, hi] = pal.field
  const r = rng(v * 7919 + THEME_SEED[theme])
  p.rect(0, 0, 16, 16, base)
  if (theme === 'canyon') {
    // dusty soil: soft darker patches, pebbles, dry tufts
    for (let i = 0; i < 3; i++) {
      const x = (r() * 14) | 0
      const y = (r() * 14) | 0
      p.hl(x, y, 2 + ((r() * 2) | 0), dark)
    }
    for (let i = 0; i < 3; i++) {
      const x = 1 + ((r() * 13) | 0)
      const y = 1 + ((r() * 13) | 0)
      p.set(x, y, light)
      p.set(x, y + 1, dark)
    }
    if (v % 2 === 0) {
      const x = 2 + ((r() * 10) | 0)
      const y = 3 + ((r() * 9) | 0)
      grassMark(p, x, y, pal.tuft[1], pal.tuft[2])
      p.set(x + 1, y + 1, pal.tuft[0])
    }
    if (v === 5) p.set(8, 8, hi)
    return p
  }
  // soft light patch for large-scale variation
  if (v % 3 === 0) {
    const cx = 4 + r() * 8
    const cy = 4 + r() * 8
    p.ellipse(cx, cy, 3 + r() * 2, 2 + r(), mix(base, light, 0.18))
  }
  const marks = 2 + ((r() * 3) | 0)
  const taken: number[][] = []
  for (let i = 0; i < marks * 4 && taken.length < marks; i++) {
    const x = 1 + ((r() * 12) | 0)
    const y = 2 + ((r() * 12) | 0)
    if (taken.some(([a, b]) => Math.abs(a - x) < 5 && Math.abs(b - y) < 4)) continue
    taken.push([x, y])
    grassMark(p, x, y, pal.tuft[0], pal.tuft[2])
  }
  for (let i = 0; i < 3; i++) p.set((r() * 16) | 0, (r() * 16) | 0, i === 0 ? hi : light)
  if (v === 6) {
    // tiny clover
    const x = 4 + ((r() * 8) | 0)
    const y = 4 + ((r() * 8) | 0)
    p.set(x, y, light)
    p.set(x + 1, y, light)
    p.set(x, y + 1, light)
    p.set(x + 1, y + 1, dark)
  }
  if (v === 7) {
    const x = 3 + ((r() * 9) | 0)
    const y = 4 + ((r() * 8) | 0)
    p.set(x, y, hex('#e8e4d8'))
    p.set(x + 1, y, hex('#c8c0b0'))
    p.set(x, y + 1, hex('#8a8474'))
    p.set(x + 1, y + 1, hex('#6a6456'))
  }
  if (theme === 'meadow' && v % 2 === 1) {
    // a scatter of tiny static blossoms
    const cols = pal.flowers
    for (let i = 0; i < 2; i++) p.set(2 + ((r() * 12) | 0), 2 + ((r() * 12) | 0), cols[(r() * cols.length) | 0])
  }
  return p
}

/** Texture color for terrain `t` at local pixel (x,y); `v` = tile variant. */
function texture(theme: Theme, t: number, v: number): (x: number, y: number) => Col {
  const pal = PALS[theme]
  const seed = THEME_SEED[theme] * 131 + t * 977 + v * 31
  const r = rng(seed)
  const spots = new Map<number, Col>()
  const put = (x: number, y: number, c: Col) => {
    if (x >= 0 && y >= 0 && x < 16 && y < 16) spots.set(y * 16 + x, c)
  }
  if (t === T_DIRT) {
    const [, dark, base, light, hi] = pal.dirt
    for (let i = 0; i < 5; i++) put((r() * 16) | 0, (r() * 16) | 0, dark)
    for (let i = 0; i < 2; i++) {
      const x = (r() * 14) | 0
      const y = (r() * 14) | 0
      put(x, y, hi)
      put(x + 1, y, light)
      put(x + 1, y + 1, dark)
    }
    if (v % 2) {
      const x = (r() * 12) | 0
      const y = (r() * 14) | 0
      put(x, y, light)
      put(x + 1, y, light)
      put(x + 2, y, light)
    }
    return (x, y) => spots.get(y * 16 + x) ?? base
  }
  if (t === T_SAND) {
    const [, dark, base, light, hi] = pal.sand
    for (let i = 0; i < 3; i++) {
      const x = (r() * 12) | 0
      const y = 1 + ((r() * 14) | 0)
      const len = 2 + ((r() * 3) | 0)
      for (let k = 0; k < len; k++) put(x + k, y, light)
      put(x + len, y + 1, dark)
    }
    for (let i = 0; i < 3; i++) put((r() * 16) | 0, (r() * 16) | 0, i ? dark : hi)
    return (x, y) => spots.get(y * 16 + x) ?? base
  }
  if (t === T_ROCK) {
    const [deep, dark, base, light, hi] = pal.rock
    // cracks
    for (let i = 0; i < 2; i++) {
      let x = (r() * 14) | 0
      let y = (r() * 14) | 0
      const n = 2 + ((r() * 3) | 0)
      for (let k = 0; k < n; k++) {
        put(x, y, dark)
        x += r() < 0.5 ? 1 : 0
        y += 1
      }
    }
    // pebbles
    for (let i = 0; i < 2 + (v % 2); i++) {
      const x = (r() * 13) | 0
      const y = (r() * 13) | 0
      put(x, y, hi)
      put(x + 1, y, light)
      put(x, y + 1, light)
      put(x + 1, y + 1, dark)
      put(x + 2, y + 1, deep)
      put(x + 1, y + 2, deep)
    }
    for (let i = 0; i < 3; i++) put((r() * 16) | 0, (r() * 16) | 0, light)
    return (x, y) => spots.get(y * 16 + x) ?? base
  }
  // paved: 8×8 flagstones (city: running bond), subtle per-stone tone
  const [grout, dark, base, light, hi] = pal.paved
  const bond = theme === 'city' || theme === 'canyon'
  const tones = [base, base, mix(base, light, 0.5), mix(base, dark, 0.35)]
  return (x, y) => {
    const row = y >> 3
    const off = bond && row % 2 ? 4 : 0
    const sx = (x + off) & 7
    const sy = y & 7
    if (sx === 7 || sy === 7) return mix(grout, dark, 0.5)
    const stone = ((x + off) >> 3) + row * 3 + v * 5
    const tone = tones[Math.floor(hash(stone, v, seed) * tones.length)]
    if (sy === 0 && sx === 0) return hi
    if (sy === 0 || sx === 0) return mix(tone, light, 0.6)
    if (sy === 6 || sx === 6) return mix(tone, dark, 0.4)
    return tone
  }
}

/** Params per terrain: edge inset, corner radius, tufted edges. */
const SHAPE: Record<number, [number, number, boolean]> = {
  [T_ROCK]: [1, 3, true],
  [T_DIRT]: [1, 3, true],
  [T_SAND]: [1, 3, true],
  [T_PAVED]: [0, 2, false],
  [T_WATER]: [1, 3, false],
}

/** Field or overlay terrain tile. `mask` 255 = fully interior (no edges). */
export function terrainTile(theme: Theme, t: number, mask: number, v: number): HTMLCanvasElement {
  if (t === T_FIELD) return cached(`f|${theme}|${v}`, () => fieldPx(theme, v))
  return cached(`t|${theme}|${t}|${mask}|${v}`, () => {
    const pal = PALS[theme]
    const p = new Px(16, 16)
    const [m, r, bumps] = SHAPE[t]
    const g = shapeGrid(mask, m, r, bumps)
    const tex = texture(theme, t, v)
    const ramp = t === T_DIRT ? pal.dirt : t === T_SAND ? pal.sand : t === T_ROCK ? pal.rock : pal.paved
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (!g[(y + 3) * 22 + x + 3]) continue
        const rim = rimAt(g, x, y)
        let c = tex(x, y)
        if (t === T_PAVED) {
          if (rim.d === 1) c = ramp[0]
          else if (rim.d === 2) c = ramp[4]
          else if (rim.d === 3) c = ramp[1]
        } else if (rim.d === 1) {
          c = rim.dir === 0 ? ramp[0] : rim.dir === 1 ? ramp[1] : ramp[3]
        } else if (rim.d === 2 && rim.dir === 0) {
          c = mix(c, ramp[1], 0.6)
        }
        p.set(x, y, c)
      }
    return p
  })
}

export function tallBaseTile(theme: Theme, v: number): HTMLCanvasElement {
  return cached(`tb|${theme}|${v}`, () => {
    const pal = PALS[theme]
    const p = new Px(16, 16)
    const r = rng(v * 313 + THEME_SEED[theme])
    p.rect(0, 0, 16, 16, pal.tallBase[1])
    for (let i = 0; i < 6; i++) p.set((r() * 16) | 0, (r() * 16) | 0, pal.tallBase[0])
    return p
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Water (animated: 8 frames, 32×32 world-periodic pattern → variants by tile parity)

export const WATER_FRAMES = 8
const DASHES = (() => {
  const r = rng(4242)
  const out: { x: number; y: number; len: number; ph: number }[] = []
  for (let i = 0; i < 9; i++) out.push({ x: (r() * 32) | 0, y: 2 + ((i * 32) / 9) | 0, len: 3 + ((r() * 3) | 0), ph: (r() * 8) | 0 })
  return out
})()
const BOB = [0, 0, 1, 1, 2, 2, 1, 1]

export function waterTile(theme: Theme, mask: number, vx: number, vy: number, f: number): HTMLCanvasElement {
  return cached(`w|${theme}|${mask}|${vx}|${vy}|${f}`, () => {
    const [edge, deep, base, light, foam] = PALS[theme].water
    const p = new Px(16, 16)
    const g = shapeGrid(mask, 1, 5, false)
    const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < 16 && y < 16 && g[(y + 3) * 22 + x + 3] === 1
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (!inside(x, y)) continue
        const u = vx * 16 + x
        const v = vy * 16 + y
        // broad soft depth bands drifting diagonally
        const band = (u + v * 2 + f * 2) % 32
        p.set(x, y, band < 3 ? mix(base, deep, 0.45) : base)
      }
    for (const d of DASHES) {
      const off = BOB[(f + d.ph) % 8]
      for (let k = 0; k < d.len; k++) {
        const u = (d.x + off + k) & 31
        const x = u - vx * 16
        const y = d.y - vy * 16
        if (inside(x, y)) p.set(x, y, k === 1 && (f + d.ph) % 8 < 2 ? foam : light)
        if (k > 0 && k < d.len - 1 && inside(x - 1, y + 1)) p.set(x - 1, y + 1, deep)
      }
    }
    // sparkles
    const sr = rng(900 + vx * 7 + vy * 13)
    for (let i = 0; i < 2; i++) {
      const x = (sr() * 14) | 0
      const y = (sr() * 14) | 0
      const ph = (sr() * 8) | 0
      if (f === ph && inside(x, y)) {
        p.set(x, y, foam)
        if (inside(x + 1, y)) p.set(x + 1, y, light)
        if (inside(x - 1, y)) p.set(x - 1, y, light)
      }
    }
    // shoreline: shadowed rim + breathing foam line
    const foamOn = f % 4 < 2
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (!inside(x, y)) continue
        const rim = rimAt(g, x, y)
        if (rim.d === 1) p.set(x, y, rim.dir === 0 ? edge : foamOn ? foam : light)
        else if (rim.d === 2) p.set(x, y, rim.dir === 0 ? (foamOn ? foam : light) : foamOn ? light : mix(base, light, 0.5))
        else if (rim.d === 3 && !foamOn) p.set(x, y, mix(base, light, 0.35))
      }
    return p
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Cliffs, ledges, fences, bushes, bridges

/** kind: 0 plateau top, 1 bottom face, 2 upper face. `lip` = the tile above is a plateau top (grass lip overhang). */
export function cliffTile(theme: Theme, mask: number, kind: number, lip: boolean, v: number): HTMLCanvasElement {
  return cached(`c|${theme}|${mask}|${kind}|${lip ? 1 : 0}|${v}`, () => {
    const pal = PALS[theme]
    const [out, dark, base, light, hi] = pal.cliff
    const top = pal.cliffTop
    const p = new Px(16, 16)
    const strata = theme === 'canyon'
    if (kind === 0) {
      const g = shapeGrid(mask | S | SE | SW, 0, 3, false)
      const r = rng(v * 71 + THEME_SEED[theme])
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          if (!g[(y + 3) * 22 + x + 3]) continue
          const rim = rimAt(g, x, y)
          let c = top[1]
          if (rim.d === 1) c = out
          else if (rim.d === 2) c = rim.dir === 0 ? hi : light
          else if (rim.d === 3) c = rim.dir === 2 ? top[1] : base
          else if (y > 0 && rimAt(g, x, y - 1).d === 3 && rimAt(g, x, y - 1).dir !== 2) c = top[0]
          p.set(x, y, c)
        }
      for (let i = 0; i < 3; i++) {
        const x = 3 + ((r() * 10) | 0)
        const y = 4 + ((r() * 9) | 0)
        if (strata) {
          p.set(x, y, top[0])
          p.set(x + 1, y, top[2])
        } else grassMark(p, x, y, top[0], top[3])
      }
      return p
    }
    // faces: rounded where sides open; bottom face also rounds at the base
    const faceMask = (mask & (W | E)) | N | NE | NW | (kind === 2 ? S | SE | SW : 0)
    const g = shapeGrid(faceMask, 0, 3, false)
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (!g[(y + 3) * 22 + x + 3]) continue
        let c: Col
        if (strata) {
          const wave = Math.round(Math.sin((x / 16) * Math.PI * 2) * 1)
          const yy = (y + wave + 16) % 16
          const band = [3, 3, 2, 2, 2, 1, 4, 3, 2, 2, 1, 1, 2, 3, 3, 2][yy]
          c = pal.cliff[band]
          if ((x * 7 + 3) % 11 === 0 && yy > 2 && yy < 13) c = dark
        } else {
          // rounded boulder blocks, staggered per band, lit from the top-left; band seams step by column so the
          // courses read as stacked rock rather than brickwork
          const bx = (x + (kind === 2 ? 5 : 0)) & 15
          const yy = Math.min(15, Math.max(0, y + [0, 1, 1, 0, -1, 0, 1, 0][(bx >> 1) & 7]))
          const band = yy < 5 ? 0 : yy < 10 ? 1 : 2
          const y0 = band * 5
          const bh = band === 2 ? 6 : 5
          const ly = yy - y0
          const s = BLOCK_SPLITS[band]
          // splits wrap around the 16px period so blocks straddle tile seams
          const ext = [s[s.length - 1] - 16, ...s, s[0] + 16]
          let k = 0
          while (bx >= ext[k + 1]) k++
          const lx = bx - ext[k]
          const bw = ext[k + 1] - ext[k]
          const tone = hash(band, k % s.length, v + kind * 7)
          c = tone < 0.33 ? mix(base, light, 0.35) : tone < 0.66 ? base : mix(base, dark, 0.3)
          if (ly === bh - 1 || lx === bw - 1) c = mix(out, dark, 0.35)
          else if (ly === 0 && lx < bw - 2) c = lx === 0 ? light : hi
          else if (lx === 0) c = light
          else if (ly === bh - 2 || lx === bw - 2) c = dark
        }
        const rim = rimAt(g, x, y)
        if (rim.d === 1) c = out
        else if (rim.d === 2 && rim.dir === 2) c = dark
        p.set(x, y, c)
      }
    if (lip) {
      // plateau lip overhanging the face
      for (let x = 0; x < 16; x++) {
        if (!g[3 * 22 + x + 3]) continue
        const drop = (x * 5 + v) % 7 === 0 ? 3 : 2
        for (let y = 0; y < drop; y++) p.set(x, y, y === 0 ? top[3] : top[1])
        p.set(x, drop, out)
        p.set(x, drop + 1, withAlpha(out, 90))
      }
      if (!(mask & W)) p.vl(0, 0, 4, out)
      if (!(mask & E)) p.vl(15, 0, 4, out)
    }
    return p
  })
}

export function cliffShadowTile(): HTMLCanvasElement {
  return cached('cs', () => {
    const p = new Px(16, 16)
    p.rect(0, 0, 16, 2, SHADOW)
    p.rect(0, 2, 16, 1, withAlpha(hex('#1a1030'), 30))
    return p
  })
}

export function ledgeTile(theme: Theme, mask: number): HTMLCanvasElement {
  return cached(`l|${theme}|${mask & (W | E)}`, () => {
    const pal = PALS[theme]
    const [out, faceDark, face, lipLight] = pal.ledge
    const p = new Px(16, 16)
    const l = !(mask & W)
    const r = !(mask & E)
    for (let x = 0; x < 16; x++) {
      const capL = l && x < 2
      const capR = r && x > 13
      const edge = (l && x === 0) || (r && x === 15)
      const y0 = edge ? 10 : capL || capR ? 9 : 8
      p.set(x, y0 - 1, pal.field[3])
      p.set(x, y0, lipLight)
      for (let y = y0 + 1; y < 13; y++) p.set(x, y, x % 3 === 0 || y === y0 + 1 ? faceDark : face)
      p.set(x, 13, faceDark)
      p.set(x, 14, out)
      p.set(x, 15, SHADOW)
      if (edge) p.vl(x, y0, 15 - y0, out)
    }
    if (l) p.set(1, 9, out)
    if (r) p.set(14, 9, out)
    // grass blades draping over the lip
    for (let x = 2; x < 14; x += 5) {
      p.set(x, 9, pal.field[3])
      p.set(x + 1, 9, pal.field[2])
      p.set(x + 1, 10, pal.field[1])
    }
    return p
  })
}

export function fenceTile(theme: Theme, mask: number): HTMLCanvasElement {
  return cached(`fe|${theme}|${mask & 15}`, () => {
    const [out, dark, base, light] = PALS[theme].fence
    const p = new Px(16, 16)
    // rails first
    if (mask & W) {
      p.hl(0, 5, 7, light)
      p.hl(0, 6, 7, dark)
      p.hl(0, 9, 7, light)
      p.hl(0, 10, 7, dark)
    }
    if (mask & E) {
      p.hl(9, 5, 7, light)
      p.hl(9, 6, 7, dark)
      p.hl(9, 9, 7, light)
      p.hl(9, 10, 7, dark)
    }
    if (mask & N) p.rect(7, 0, 2, 3, base)
    if (mask & S) p.rect(7, 12, 2, 4, base)
    // post
    p.rect(6, 2, 4, 11, base)
    p.vl(6, 3, 10, light)
    p.vl(9, 3, 10, dark)
    p.hl(6, 2, 4, light)
    p.set(7, 1, light)
    p.set(8, 1, base)
    p.outline(out)
    p.hl(5, 14, 6, SHADOW)
    return p
  })
}

export function bushTile(theme: Theme, v: number): HTMLCanvasElement {
  return cached(`b|${theme}|${v}`, () => {
    const [out, dark, base, light, hi] = PALS[theme].bush
    const p = new Px(16, 16)
    p.ellipse(8, 14.5, 7, 2, SHADOW)
    const sp = new Px(16, 16)
    foliage(
      sp,
      [
        [4.5, 11, 3.4, -1],
        [11.5, 11, 3.4, -1],
        [8, 11.6, 3.8, -1],
        [5, 7.6, 3.4, 0],
        [11, 7.6, 3.4, 0],
        [8, 5.8, 3.6, 1],
      ],
      [mix(dark, out, 0.45), dark, base, light, hi],
      1,
      14,
    )
    sp.outline(out)
    if (v % 2 && theme !== 'canyon') {
      sp.set(5, 6, hex('#ff8aa8'))
      sp.set(10, 8, hex('#ffffff'))
    }
    p.blit(sp, 0, 0)
    return p
  })
}

const WOOD = [hex('#3e2414'), hex('#7a4c2a'), hex('#a26a3c'), hex('#c98c56'), hex('#e6b07a')]

export function bridgeTile(vertical: boolean): HTMLCanvasElement {
  return cached(`br|${vertical ? 1 : 0}`, () => {
    const [out, dark, base, light, hi] = WOOD
    const p = new Px(16, 16)
    for (let a = 0; a < 16; a++)
      for (let b = 0; b < 16; b++) {
        // a runs along the span, b across it
        let c: Col
        if (b === 0 || b === 15) c = out
        else if (b === 1 || b === 13) c = hi
        else if (b === 2 || b === 14) c = dark
        else if (b === 3) c = withAlpha(out, 255)
        else {
          const seam = a % 4 === 3
          c = seam ? dark : a % 4 === 0 ? light : base
          if (!seam && (a * 3 + b) % 13 === 0) c = dark
        }
        if ((b <= 2 || b >= 13) && a % 8 === 0) c = b === 0 || b === 15 ? out : a % 16 === 0 ? light : c
        if (vertical) p.set(b, a, c)
        else p.set(a, b, c)
      }
    return p
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Trees (20×24 sprite: canopy overhangs 8px into the tile above and 2px into side neighbours)

/** Leaf-clump foliage: clumps are painted bottom-up so each upper clump's deep lower rim scallops over the ones
 * beneath (the classic GBA canopy look). `ramp` = [deep, dark, base, light, hi]; `shift` darkens/brightens a clump. */
function foliage(p: Px, clumps: readonly (readonly [number, number, number, number])[], ramp: Col[], x0: number, x1: number): void {
  for (const [cx, cy, rr, shift] of clumps)
    p.ellipse(cx, cy, rr, rr * 0.94, (x, y) => {
      if (x < x0 || x > x1) return 0
      const nx = (x + 0.5 - cx) / rr
      const ny = (y + 0.5 - cy) / rr
      if (ny > 0.62 && Math.abs(nx) < 0.8) return ramp[shift > 0 ? 1 : 0]
      const s = nx * 0.55 + ny * 0.8
      const i = s < -0.7 ? 4 : s < -0.1 ? 3 : s < 0.6 ? 2 : 1
      return ramp[Math.max(1, Math.min(4, i + shift))]
    })
}

/** 20×24 tree sprite, drawn at (tileX*16 - 2, tileY*16 - 8): the canopy overlaps neighbours by 2px per side. */
export function treeSprite(theme: Theme, v: number): HTMLCanvasElement {
  return cached(`tr|${theme}|${v}`, () => {
    const pal = PALS[theme]
    const [out, dark, base, light, hi] = pal.tree
    const [tout, tdark, tbase, tlight] = pal.trunk
    const p = new Px(20, 24)
    p.ellipse(10, 22, 7, 1.6, SHADOW)
    const tr = new Px(20, 24)
    tr.rect(8, 15, 4, 7, tbase)
    tr.vl(8, 15, 7, tlight)
    tr.vl(11, 15, 7, tdark)
    tr.set(7, 21, tbase)
    tr.set(12, 21, tdark)
    tr.set(9, 18, tdark)
    tr.outline(tout)
    p.blit(tr, 0, 0)
    const r = rng(v * 97 + THEME_SEED[theme] * 3)
    const j = () => (r() - 0.5) * 1.2
    const cp = new Px(20, 24)
    foliage(
      cp,
      [
        [5 + j(), 14, 3.8, -1],
        [15 + j(), 14, 3.8, -1],
        [10, 14.6 + j() * 0.5, 4.2, -1],
        [4.2, 10 + j(), 4, 0],
        [15.8, 10 + j(), 4, 0],
        [10 + j(), 10.4, 4.4, 0],
        [7 + j(), 6.4, 4.2, 0],
        [13 + j(), 6.4, 4.2, 0],
        [10 + j() * 0.5, 4.3, 4.3, 1],
      ],
      [mix(dark, out, 0.45), dark, base, light, hi],
      1,
      18,
    )
    for (let i = 0; i < 3; i++) {
      const x = 5 + ((r() * 8) | 0)
      const y = 2 + ((r() * 8) | 0)
      if (cp.get(x, y) === light) cp.set(x, y, hi)
    }
    cp.outline(out)
    p.blit(cp, 0, 0)
    return p
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Flowers (',' tiles; 5×7 sprite, head sways over 4 frames)

export function flowerSprite(petal: Col, f: number): HTMLCanvasElement {
  return cached(`fl|${petal}|${f}`, () => {
    const p = new Px(7, 8)
    const sway = [0, 1, 0, -1][f & 3]
    const stem = hex('#2e7a3c')
    p.set(3, 5, stem)
    p.set(3, 6, stem)
    p.set(2, 6, hex('#43a04b'))
    p.set(4, 7, withAlpha(hex('#1a1030'), 50))
    const cx = 3 + sway
    const dk = shade(petal, -0.32)
    p.set(cx, 2, shade(petal, 0.45))
    p.set(cx - 1, 3, shade(petal, 0.15))
    p.set(cx + 1, 3, dk)
    p.set(cx, 4, dk)
    p.set(cx, 3, hex('#ffd23a'))
    p.set(cx + 1, 4, withAlpha(hex('#1a1030'), 60))
    return p
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Tall grass: clumps of pointed, outlined leaves; `lean` ∈ {-1,0,1} tilts the tips.

function leaf(p: Px, cx: number, base: number, h: number, halfW: number, lean: number, pal: Col[]): void {
  const [, dark, mid, light, tip] = pal
  for (let j = 0; j < h; j++) {
    const y = base - j
    const t = j / (h - 1)
    const hw = Math.max(0, Math.round(halfW * (1 - t) + 0.2))
    const shift = t > 0.55 ? lean : 0
    for (let k = -hw; k <= hw; k++) {
      const c = j === h - 1 ? tip : k === -hw && hw > 0 ? light : t > 0.6 ? light : k === hw && hw > 0 ? dark : mid
      p.set(cx + k + shift, y, j < 2 ? dark : c)
    }
  }
}

function tallPx(theme: Theme, lean: number, front: boolean, v: number): Px {
  const pal = PALS[theme].tall
  const p = new Px(16, 16)
  const sh = v ? 3 : 0
  // leaves wrap around the tile so neighbouring tiles interlock seamlessly
  const tuft = (buf: Px, cx: number, base: number, h: number, hw: number) => {
    const x = (cx + sh) % 16
    leaf(buf, x, base, h, hw, lean, pal)
    if (x - hw < 0) leaf(buf, x + 16, base, h, hw, lean, pal)
    if (x + hw > 15) leaf(buf, x - 16, base, h, hw, lean, pal)
  }
  const back = new Px(16, 16)
  if (!front) {
    for (const cx of [2, 7, 12]) tuft(back, cx, 9, 8, 2)
    for (const cx of [0, 5, 10]) tuft(back, cx, 9, 6, 1)
    back.outline(pal[0])
    p.blit(back, 0, 0)
  }
  const fr = new Px(16, 16)
  for (const cx of [4, 9, 14]) tuft(fr, cx, 15, 8, 2)
  for (const cx of [1, 7, 12]) tuft(fr, cx, 15, 6, 1)
  fr.outline(pal[0])
  p.blit(fr, 0, 0)
  if (front) {
    // front piece covers only the lower 7px
    for (let y = 0; y < 9; y++) for (let x = 0; x < 16; x++) p.put(x, y, 0)
  }
  return p
}

/** Which of the two interlocking tall-grass layouts tile (tx,ty) uses. */
export function tallVariant(tx: number, ty: number): number {
  return hash(tx, ty, 17) < 0.5 ? 0 : 1
}

export function tallTile(theme: Theme, lean: number, v: number): HTMLCanvasElement {
  return cached(`tg|${theme}|${lean}|${v}`, () => tallPx(theme, lean, false, v))
}

export function tallFront(theme: Theme, lean: number, v: number): HTMLCanvasElement {
  return cached(`tgf|${theme}|${lean}|${v}`, () => tallPx(theme, lean, true, v))
}

/** Wet-edge darkening on the land just outside a water shape (baked into `below` only). */
export function shoreTile(mask: number): HTMLCanvasElement {
  return cached(`sh|${mask}`, () => {
    const p = new Px(16, 16)
    const g = shapeGrid(mask, 1, 5, false)
    const wet = withAlpha(hex('#1a1030'), 50)
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const i = (y + 3) * 22 + x + 3
        if (!g[i] && (g[i + 1] || g[i - 1] || g[i + 22] || g[i - 22])) p.set(x, y, wet)
      }
    return p
  })
}
