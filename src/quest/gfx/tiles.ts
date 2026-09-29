/**
 * Procedural ground tiles and nature sprites: autotiled terrain layers (rounded, tufted edges), water (static body the
 * depth pass shades + animated surface overlay), cliffs with mesa strata, ledges, fences, bushes, bridges, a family of
 * tree species, shore/plateau decorations, plus animated flowers and tall grass. Every piece is generated once into a
 * small canvas and cached by key, so a map build is a pile of `drawImage` calls followed by one pixel pass
 * (`terrain.ts`).
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

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
/** Ordered-dither threshold in (0,1) for pixel (x,y): blends two tones without noise. */
export function dither(x: number, y: number): number {
  return BAYER4[(y & 3) * 4 + (x & 3)]
}

const SHADOW = withAlpha(hex('#1a1030'), 60)
const THEME_SEED: Record<Theme, number> = { town: 11, meadow: 23, city: 37, canyon: 51, gallery: 67 }

// ---------------------------------------------------------------------------------------------------------------
// Interiors (museum / terminal): marble slabs with veins and wall reflections, a woven runner with gold trim, and
// wainscoted walls (wallpaper, chair rail, walnut panels, baseboard) under a dark stone cap.

const MARBLE = [hex('#b3a897'), hex('#cfc5b4'), hex('#e3dacb'), hex('#efe8da'), hex('#faf5ea')]
const VEIN = [hex('#a79a88'), hex('#c3b7a5')]
const WALLPAPER = [hex('#1f3940'), hex('#28474e'), hex('#305459'), hex('#3b6364')]
const WALNUT = [hex('#1d1210'), hex('#3a2620'), hex('#523628'), hex('#6c4a34'), hex('#8a6444')]
const GOLD = [hex('#6a4a22'), hex('#a57a3c'), hex('#d8b064'), hex('#f4dc98')]
const CAP = [hex('#121a22'), hex('#1b2731'), hex('#22323c'), hex('#2c3f49'), hex('#3b5058')]
const RUNNER = [hex('#4a1422'), hex('#6c1f33'), hex('#86293f'), hex('#9c3a4e'), hex('#b8566a')]

/** 64px world-periodic marble veins (sampled per tile by world position mod 4). */
const VEINS = (() => {
  const g = new Uint8Array(64 * 64)
  const r = rng(9091)
  for (let i = 0; i < 7; i++) {
    let x = r() * 64
    let y = r() * 64
    let a = r() * Math.PI * 2
    const len = 26 + r() * 40
    for (let k = 0; k < len; k++) {
      const ix = ((Math.round(x) % 64) + 64) % 64
      const iy = ((Math.round(y) % 64) + 64) % 64
      g[iy * 64 + ix] = i < 2 ? 2 : 1
      a += (r() - 0.5) * 0.7
      x += Math.cos(a)
      y += Math.sin(a) * 0.8
    }
  }
  return g
})()

/**
 * `kind` 'W' wall, 'o' marble, 'r' runner. `same` = neighbours of the same kind, `wall` = wall neighbours (floors),
 * (tx, ty) = world tile for continuous veins / stone courses.
 */
export function interiorTile(kind: string, same: number, wall: number, tx: number, ty: number): HTMLCanvasElement {
  const vx = kind === 'o' ? tx & 3 : kind === 'W' ? tx & 1 : 0
  const vy = kind === 'o' ? ty & 3 : 0
  return cached(`in|${kind}|${same}|${wall}|${vx}|${vy}`, () => {
    const p = new Px(16, 16)
    if (kind === 'W') wallPx(p, same, vx)
    else {
      if (kind === 'r') runnerPx(p, same, wall)
      else marblePx(p, vx, vy)
      floorEdges(p, wall, kind === 'r')
    }
    return p
  })
}

function wallPx(p: Px, same: number, vx: number): void {
  if (!(same & S)) {
    // face: wallpaper with a damask lattice, chair rail, walnut wainscot, baseboard
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        let c = WALLPAPER[1]
        if (y < 9) {
          const u = (x + vx * 16) % 8
          const dx = Math.abs(u - 3.5)
          const dy = Math.abs(((y + 2) % 8) - 3.5)
          if (Math.abs(dx + dy - 3) < 0.6) c = WALLPAPER[2]
          if (dx < 1 && dy < 1) c = WALLPAPER[3]
          if (y === 0) c = WALLPAPER[0]
        } else if (y === 9) c = GOLD[3]
        else if (y === 10) c = GOLD[1]
        else if (y === 11) c = WALNUT[0]
        else if (y < 15) {
          const u = (x + vx * 16) % 8
          c = u === 0 ? WALNUT[1] : u === 1 ? WALNUT[4] : y === 12 ? WALNUT[3] : y === 14 ? WALNUT[1] : WALNUT[2]
          if (u === 7) c = WALNUT[1]
        } else c = WALNUT[0]
        p.set(x, y, c)
      }
    // cornice where the cap sits on the wallpaper
    if (same & N) {
      p.hl(0, 0, 16, CAP[0])
      p.hl(0, 1, 16, WALLPAPER[0])
    }
  } else {
    // cap seen from above: dark stone courses, running bond
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const row = y >> 3
        const u = (x + vx * 16 + (row & 1) * 8) % 16
        const v = y & 7
        let c = CAP[2]
        if (v === 7 || u === 15) c = CAP[1]
        else if (v === 0 || u === 0) c = CAP[3]
        else if (hash(x + vx * 16, y, 5) < 0.04) c = CAP[1]
        p.set(x, y, c)
      }
  }
  // outer edges against the room: bright bevel + dark contour
  if (!(same & W)) {
    p.vl(0, 0, 16, CAP[0])
    p.vl(1, 0, 16, CAP[4])
  }
  if (!(same & E)) {
    p.vl(15, 0, 16, CAP[0])
    p.vl(14, 0, 16, CAP[4])
  }
  if (!(same & N)) {
    p.hl(0, 0, 16, CAP[0])
    p.hl(0, 1, 16, CAP[4])
  }
}

function marblePx(p: Px, vx: number, vy: number): void {
  const [dk, base0, base, light, hi] = MARBLE
  const checker = (vx + vy) & 1
  const slab = checker ? base0 : base
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const u = vx * 16 + x
      const v = vy * 16 + y
      let c = slab
      const vein = VEINS[v * 64 + u]
      if (vein) c = mix(slab, VEIN[vein - 1], checker ? 0.55 : 0.7)
      // window light sheen: diagonal bands, dithered in
      const band = (u - v + 128) % 48
      if (band < 6 && dither(u, v) < 0.5 - Math.abs(band - 2.5) * 0.12) c = mix(c, hi, 0.55)
      if (x === 0 || y === 0) c = x === 0 && y === 0 ? hi : light
      else if (x === 15 || y === 15) c = dk
      p.set(x, y, c)
    }
}

function runnerPx(p: Px, same: number, wall: number): void {
  const [out, dark, base, light, hi] = RUNNER
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const u = x & 7
      const v = y & 7
      const d = Math.abs(u - 3.5) + Math.abs(v - 3.5)
      let c = (x + y * 3) % 4 === 0 ? mix(base, dark, 0.35) : base
      if (Math.abs(d - 3) < 0.6) c = dark
      if (d < 1.1) c = GOLD[2]
      else if (d < 2.1) c = light
      p.set(x, y, c)
    }
  // gold trim along open sides (inset stripe pattern), tassel fringe on open ends that face floor
  const trim = (set: (a: number, b: number, c: Col) => void) => {
    for (let a = 0; a < 16; a++) {
      set(a, 0, out)
      set(a, 1, GOLD[3])
      set(a, 2, GOLD[1])
      set(a, 3, a % 3 === 0 ? GOLD[2] : dark)
      set(a, 4, dark)
      set(a, 5, hi)
    }
  }
  if (!(same & W)) trim((a, b, c) => p.set(b, a, c))
  if (!(same & E)) trim((a, b, c) => p.set(15 - b, a, c))
  if (!(same & N)) {
    trim((a, b, c) => p.set(a, b + 1, c))
    if (!(wall & N)) for (let x = 0; x < 16; x += 2) p.set(x, 0, hex('#f0e2c0'))
  }
  if (!(same & S)) trim((a, b, c) => p.set(a, 15 - b, c))
}

/** Contact shadows / reflections where a floor meets walls. */
function floorEdges(p: Px, wall: number, runner: boolean): void {
  const tint = hex('#1a1030')
  if (wall & N) {
    // polished floor mirrors the wainscot above (baseboard, panels, rail glint), fading with distance
    const fade = runner ? 0.6 : 1
    for (let x = 0; x < 16; x++) {
      const u = x % 8
      const panel = u === 0 ? WALNUT[1] : u === 1 ? WALNUT[4] : WALNUT[2]
      p.set(x, 0, withAlpha(WALNUT[0], 160 * fade))
      p.set(x, 1, withAlpha(panel, 120 * fade))
      p.set(x, 2, withAlpha(panel, 85 * fade))
      p.set(x, 3, withAlpha(panel, 55 * fade))
      p.set(x, 4, withAlpha(WALNUT[0], 40 * fade))
      if (x & 1) p.set(x, 5, withAlpha(GOLD[3], 70 * fade))
    }
  }
  if (wall & W)
    for (let y = 0; y < 16; y++) {
      p.set(0, y, withAlpha(tint, 110))
      if ((y & 1) === 0) p.set(1, y, withAlpha(tint, 60))
    }
  if (wall & E)
    for (let y = 0; y < 16; y++) {
      p.set(15, y, withAlpha(tint, 70))
    }
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
// Ground textures. Tiles keep large runs of the exact ramp base color: the map pass (`terrain.ts`) swaps those for
// large, dithered tonal patches, so the detail here stays sparse and hand-placed instead of per-pixel noise.

const STONE = [hex('#4e4640'), hex('#857b6e'), hex('#b0a694'), hex('#d6cebc'), hex('#f2ecde')]

/** Pebble half-sunk in `ground`: stone tones are pulled toward the ground so they sit in it instead of sparkling. */
function pebble(p: Px, x: number, y: number, big: boolean, ground: Col): void {
  const [out, dark, base, light, hi] = STONE.map((c) => mix(c, ground, 0.3))
  p.set(x + 1, y + 1, shade(ground, -0.3))
  if (big) {
    p.set(x + 2, y + 1, shade(ground, -0.3))
    p.hl(x, y, 2, light)
    p.set(x - 1, y, dark)
    p.set(x, y - 1, hi)
    p.set(x + 1, y - 1, base)
    p.set(x + 1, y, base)
    p.set(x + 2, y, dark)
    p.set(x, y + 1, out)
  } else {
    p.set(x, y, light)
    p.set(x + 1, y, dark)
  }
}

/** Grass tuft shapes: 0 = 'v' pair, 1 = tall three-blade, 2 = sprout. */
function tuft(p: Px, x: number, y: number, kind: number, dark: Col, mid: Col, light: Col): void {
  if (kind === 0) {
    p.set(x, y, dark)
    p.set(x + 1, y - 1, light)
    p.set(x + 2, y, dark)
    p.set(x + 1, y, mid)
  } else if (kind === 1) {
    p.set(x, y, dark)
    p.set(x, y - 1, light)
    p.set(x + 1, y, dark)
    p.set(x + 2, y, dark)
    p.set(x + 2, y - 1, mid)
    p.set(x + 2, y - 2, light)
    p.set(x + 3, y, dark)
    p.set(x + 4, y - 1, light)
    p.set(x + 4, y, dark)
  } else {
    p.set(x, y, dark)
    p.set(x + 1, y - 1, light)
    p.set(x + 1, y, dark)
  }
}

export const FIELD_VARIANTS = 16

function fieldPx(theme: Theme, v: number): Px {
  const pal = PALS[theme]
  const [, dark, base, light, hi] = pal.field
  const [td, tm, tl] = pal.tuft
  const p = new Px(16, 16)
  const r = rng(v * 7919 + THEME_SEED[theme])
  p.rect(0, 0, 16, 16, base)
  const spots: [number, number][] = []
  const free = (x: number, y: number, rx: number, ry: number) => {
    if (spots.some(([a, b]) => Math.abs(a - x) < rx && Math.abs(b - y) < ry)) return false
    spots.push([x, y])
    return true
  }
  const soft = theme === 'city' || theme === 'gallery'
  const tufts = [1, 2, 0, 2, 1, 3, 1, 0, 2, 1, 2, 0, 1, 2, 1, 1][v] - (soft && v % 3 === 0 ? 1 : 0)
  for (let i = 0, n = 0; i < 24 && n < tufts; i++) {
    const x = 1 + ((r() * 11) | 0)
    const y = 3 + ((r() * 12) | 0)
    if (!free(x, y, 6, 4)) continue
    tuft(p, x, y, (r() * 3) | 0, td, tm, tl)
    n++
  }
  // hand-placed accents on a minority of variants; the rest stay quiet so the tonal patches carry the field
  const feature = [0, 0, 0, 2, 0, 4, 0, 0, 0, 2, 0, 0, 6, 0, 7, 0][v]
  if (feature === 2) {
    // clover: three trefoils
    for (let i = 0; i < 3; i++) {
      const x = 3 + ((r() * 9) | 0)
      const y = 3 + ((r() * 9) | 0)
      p.set(x, y, light)
      p.set(x + 1, y, light)
      p.set(x, y + 1, light)
      p.set(x + 1, y + 1, dark)
      if (i === 0 && !soft) p.set(x, y - 1, hi)
    }
  } else if (feature === 4) {
    const x = 4 + ((r() * 8) | 0)
    const y = 5 + ((r() * 8) | 0)
    pebble(p, x, y, true, base)
    pebble(p, x + 4 - ((r() * 8) | 0), y - 3, false, base)
  } else if (feature === 6 && !soft) {
    // tiny mushrooms
    const x = 3 + ((r() * 9) | 0)
    const y = 5 + ((r() * 8) | 0)
    const cap = theme === 'meadow' ? hex('#d8402e') : hex('#c89a62')
    p.set(x, y + 2, shade(base, -0.3))
    p.set(x + 1, y + 2, shade(base, -0.3))
    p.set(x, y + 1, hex('#f2e6cc'))
    p.hl(x - 1, y, 3, cap)
    p.set(x - 1, y, shade(cap, -0.3))
    p.set(x, y - 1, shade(cap, 0.25))
    if (theme === 'meadow') p.set(x + 1, y, hex('#fff4e0'))
    if (r() < 0.6) {
      p.set(x + 3, y + 2, hex('#f2e6cc'))
      p.set(x + 3, y + 1, cap)
      p.set(x + 4, y + 1, shade(cap, -0.3))
    }
  } else if (feature === 7 && !soft) {
    // fallen petals / seed heads
    const cols = pal.flowers
    for (let i = 0; i < 3; i++) {
      const x = 2 + ((r() * 12) | 0)
      const y = 2 + ((r() * 12) | 0)
      p.set(x, y, cols[(r() * cols.length) | 0])
    }
  }
  return p
}

function texture(theme: Theme, t: number, v: number): (x: number, y: number) => Col {
  const pal = PALS[theme]
  const seed = THEME_SEED[theme] * 131 + t * 977 + v * 31
  const r = rng(seed)
  const spots = new Map<number, Col>()
  const put = (x: number, y: number, c: Col) => {
    if (x >= 0 && y >= 0 && x < 16 && y < 16) spots.set(y * 16 + x, c)
  }
  const stone = (x: number, y: number, big: boolean, ground: Col, ramp: readonly Col[]) => {
    const [out, dark, base, light, hi] = ramp
    put(x + 1, y + 1, shade(ground, -0.25))
    put(x, y, big ? hi : light)
    put(x + 1, y, big ? base : dark)
    if (big) {
      put(x, y + 1, dark)
      put(x - 1, y, out)
      put(x + 2, y + 1, shade(ground, -0.25))
      put(x + 1, y + 1, out)
    }
  }
  if (t === T_DIRT) {
    const [, dark, base, light, hi] = pal.dirt
    for (let i = 0; i < 2; i++) put((r() * 16) | 0, (r() * 16) | 0, dark)
    if (v & 1)
      stone(
        2 + ((r() * 12) | 0),
        2 + ((r() * 12) | 0),
        v === 3,
        base,
        STONE.map((c) => mix(c, base, 0.35)),
      )
    if (v === 2) {
      // wheel-worn streak
      const x = (r() * 10) | 0
      const y = 2 + ((r() * 12) | 0)
      for (let k = 0; k < 4; k++) put(x + k, y, light)
      put(x + 4, y, hi)
    }
    return (x, y) => spots.get(y * 16 + x) ?? base
  }
  if (t === T_SAND) {
    const [, dark, base, light, hi] = pal.sand
    // wind ripples: short sine-wave crests with a shadowed trough
    for (let i = 0; i < 2; i++) {
      const x0 = (r() * 9) | 0
      const y0 = 3 + i * 6 + ((r() * 3) | 0)
      const len = 4 + ((r() * 4) | 0)
      for (let k = 0; k < len; k++) {
        const y = y0 + Math.round(Math.sin((x0 + k) * 0.9) * 0.8)
        put(x0 + k, y, light)
        if (k > 0 && k < len - 1) put(x0 + k, y + 1, dark)
      }
    }
    if (v === 1 || v === 3) {
      // shell
      const x = 3 + ((r() * 9) | 0)
      const y = 3 + ((r() * 9) | 0)
      put(x, y, hi)
      put(x + 1, y, v === 1 ? hex('#f6b8b0') : hi)
      put(x, y + 1, v === 1 ? hex('#e08c88') : light)
      put(x + 1, y + 1, dark)
    }
    put((r() * 16) | 0, (r() * 16) | 0, hi)
    return (x, y) => spots.get(y * 16 + x) ?? base
  }
  if (t === T_ROCK) {
    // floor slabs and their cracks come from the map pass; tiles add pebbles and the odd dry tuft
    const [, dark, base] = pal.rock
    if (v & 1) stone(2 + ((r() * 12) | 0), 2 + ((r() * 12) | 0), v === 3, base, pal.rock)
    if (v === 2) {
      const [td, tm, tl] = pal.tuft
      tuftSpots(put, 4 + ((r() * 7) | 0), 5 + ((r() * 8) | 0), td, tm, tl)
    }
    put((r() * 16) | 0, (r() * 16) | 0, dark)
    return (x, y) => spots.get(y * 16 + x) ?? base
  }
  // paved: 8×8 flagstones (city: running bond), subtle per-stone tone, the odd hairline crack
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
    if (hash(stone, 3, seed) < 0.12 && sx === sy) return mix(tone, dark, 0.55)
    return tone
  }
}

function tuftSpots(put: (x: number, y: number, c: Col) => void, x: number, y: number, d: Col, m: Col, l: Col): void {
  put(x, y, d)
  put(x + 1, y, d)
  put(x + 2, y, d)
  put(x, y - 1, m)
  put(x + 1, y - 2, l)
  put(x + 2, y - 1, m)
  put(x + 3, y - 1, l)
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
    const grass = pal.field
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
          // grass blades draping over the upper rim
          if (rim.dir === 0 && t !== T_ROCK && (x * 7 + v * 5) % 9 < 2) c = grass[x & 1 ? 1 : 3]
        } else if (rim.d === 2 && rim.dir === 0) {
          c = (x * 7 + v * 5) % 9 === 0 && t !== T_ROCK ? grass[1] : mix(c, ramp[1], 0.6)
        } else if (rim.d === 2 && rim.dir === 1) c = mix(c, ramp[1], 0.25)
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
    for (let i = 0; i < 5; i++) p.set((r() * 16) | 0, (r() * 16) | 0, pal.tallBase[0])
    return p
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Water. The body is baked (rims here, depth bands in the map pass); the surface — lapping foam, drifting wave
// glints, sparkles — is a transparent 8-frame overlay drawn per visible tile.

export const WATER_FRAMES = 8

/** Static water body: bank shadow on north shores, bright shallows elsewhere, flat base for the depth pass. */
export function waterBaseTile(theme: Theme, mask: number): HTMLCanvasElement {
  return cached(`wb|${theme}|${mask}`, () => {
    const [edge, deep, base, light] = PALS[theme].water
    const p = new Px(16, 16)
    const g = shapeGrid(mask, 1, 5, false)
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (!g[(y + 3) * 22 + x + 3]) continue
        const rim = rimAt(g, x, y)
        let c = base
        if (rim.d === 1) c = rim.dir === 0 ? edge : mix(base, light, 0.7)
        else if (rim.d === 2) c = rim.dir === 0 ? mix(edge, deep, 0.5) : mix(base, light, 0.4)
        else if (rim.d === 3 && rim.dir === 0) c = deep
        p.set(x, y, c)
      }
    return p
  })
}

/** Every color the water body can bake (so the map pass can tell water from land). */
export function waterColors(theme: Theme): Set<Col> {
  const [edge, deep, base, light] = PALS[theme].water
  return new Set([edge, deep, base, mix(base, light, 0.7), mix(edge, deep, 0.5), mix(base, light, 0.4)])
}

const DASHES = (() => {
  const r = rng(4242)
  const out: { x: number; y: number; len: number; ph: number }[] = []
  for (let i = 0; i < 9; i++)
    out.push({ x: (r() * 32) | 0, y: (2 + (i * 32) / 9) | 0, len: 2 + ((r() * 3) | 0), ph: (r() * 8) | 0 })
  return out
})()
const BOB = [0, 0, 1, 1, 2, 2, 1, 1]
/** Foam front distance from the shore per frame: in, hold, out — the lap. */
const LAP = [1, 1, 2, 3, 3, 2, 1, 1]

/** Animated surface overlay (transparent). `calm` = tile carries a lily pad/rock, so no glints over it. */
export function waterTile(
  theme: Theme,
  mask: number,
  vx: number,
  vy: number,
  f: number,
  calm: boolean,
): HTMLCanvasElement {
  return cached(`w|${theme}|${mask}|${vx}|${vy}|${f}|${calm ? 1 : 0}`, () => {
    const [edge, , , light, foam] = PALS[theme].water
    const p = new Px(16, 16)
    const g = shapeGrid(mask, 1, 5, false)
    const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < 16 && y < 16 && g[(y + 3) * 22 + x + 3] === 1
    const lap = LAP[f]
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (!inside(x, y)) continue
        const rim = rimAt(g, x, y)
        if (!rim.d) continue
        const u = vx * 16 + x
        const w = vy * 16 + y
        const gap = (u * 3 + w * 5 + (f >> 2)) % 11 === 0
        if (rim.dir === 0) {
          // north banks sit in shadow: only a faint foam line rides out from them
          if (rim.d === 3 && lap === 3 && !gap) p.set(x, y, withAlpha(light, 170))
        } else if (rim.d === lap && !gap) p.set(x, y, foam)
        else if (rim.d < lap) p.set(x, y, withAlpha(light, 150))
      }
    if (!calm) {
      for (const d of DASHES) {
        const off = BOB[(f + d.ph) % 8]
        for (let k = 0; k < d.len; k++) {
          const u = (d.x + off + k) & 31
          const x = u - vx * 16
          const y = d.y - vy * 16
          if (!inside(x, y) || rimAt(g, x, y).d) continue
          p.set(x, y, k === 0 && (f + d.ph) % 8 < 2 ? foam : light)
          if (inside(x, y + 1)) p.set(x, y + 1, withAlpha(edge, 80))
        }
      }
      // sparkles drift with the current and flash a 4-point star at their peak
      const sr = rng(900 + vx * 7 + vy * 13)
      for (let i = 0; i < 2; i++) {
        const ph = (sr() * 8) | 0
        const age = (f - ph + 8) % 8
        if (age > 2) continue
        const x = ((sr() * 12) | 0) + 2 + age
        const y = ((sr() * 12) | 0) + 2
        if (!inside(x, y) || rimAt(g, x, y).d) continue
        p.set(x, y, age === 1 ? foam : light)
        if (age === 1)
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ])
            if (inside(x + dx, y + dy)) p.set(x + dx, y + dy, withAlpha(light, 190))
      }
    }
    return p
  })
}

/** Night reflection twinkle (4 frames) laid over deep water tiles. */
export function waterStar(f: number): HTMLCanvasElement {
  return cached(`ws|${f}`, () => {
    const p = new Px(3, 3)
    const hi = hex('#fff6d8')
    const mid = withAlpha(hex('#cfe0ff'), 170)
    if (f === 0) p.set(1, 1, mid)
    else if (f === 1 || f === 3) p.set(1, 1, hi)
    else {
      p.set(1, 1, hi)
      p.set(0, 1, mid)
      p.set(2, 1, mid)
      p.set(1, 0, mid)
      p.set(1, 2, mid)
    }
    return p
  })
}

/** Lily pad (v 0..3; odd variants bloom) or, for v >= 4, a mossy rock breaking the surface. */
export function waterDeco(theme: Theme, v: number): HTMLCanvasElement {
  return cached(`wd|${theme}|${v}`, () => {
    const pal = PALS[theme]
    const p = new Px(10, 8)
    const light = pal.water[3]
    if (v >= 4) {
      const [out, dark, base, lt, hi] = STONE
      p.hl(1, 6, 8, withAlpha(light, 200))
      p.ellipse(5, 4.5, 3.6, 2.4, (x, y) => (y < 3.5 ? (x < 4.5 ? hi : lt) : x > 5.5 ? dark : base))
      p.set(3, 3, pal.pad[2])
      p.set(4, 3, pal.pad[3])
      p.set(2, 4, pal.pad[1])
      p.outline(out)
      return p
    }
    const [out, dark, base, lt] = pal.pad
    const pad = new Px(10, 8)
    pad.ellipse(5, 4, 3.8, 2.5, (_x, y) => (y < 3 ? lt : y > 4 ? dark : base))
    // wedge notch toward the stem
    const nx = v & 2 ? 6 : 4
    pad.put(nx, 4, 0)
    pad.put(nx, 3, 0)
    pad.put(nx + (v & 2 ? 1 : -1), 4, 0)
    pad.set(3, 3, mix(lt, base, 0.5))
    pad.outline(out)
    p.hl(1, 7, 8, withAlpha(light, 120))
    p.blit(pad, 0, 0)
    if (v & 1) {
      const petal = theme === 'canyon' ? hex('#ffd07a') : hex('#ffb4cc')
      p.set(3, 2, petal)
      p.set(4, 2, hex('#ffffff'))
      p.set(3, 1, hex('#ffffff'))
      p.set(4, 3, shade(petal, -0.3))
      p.set(2, 2, shade(petal, -0.15))
    }
    return p
  })
}

/** Shore reeds / cattails (baked on land beside water). */
export function reedSprite(theme: Theme, v: number): HTMLCanvasElement {
  return cached(`reed|${theme}|${v}`, () => {
    const [out, dark, base, light] = PALS[theme].pad
    const p = new Px(9, 12)
    const r = rng(v * 17 + 5)
    const blades = 3 + (v & 1)
    for (let i = 0; i < blades; i++) {
      const x = 1 + i * 2 + ((r() * 2) | 0)
      const h = 5 + ((r() * 5) | 0)
      const lean = r() < 0.5 ? -1 : 1
      for (let j = 0; j < h; j++) p.set(x + (j > h - 3 ? lean : 0), 11 - j, j < 2 ? dark : j > h - 3 ? light : base)
      if (i === 1 && v > 1) {
        // cattail head
        p.vl(x, 11 - h - 1, 3, hex('#7a4a2a'))
        p.set(x, 11 - h - 1, hex('#a06a3a'))
        p.set(x, 11 - h - 2, dark)
      }
    }
    p.outline(withAlpha(out, 200))
    return p
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Cliffs, ledges, fences, bushes, bridges

/** Canyon mesa strata over a 34px two-tile face: [strata index, ...] per row, top → bottom. */
const STRATA_ROWS = [
  1, 1, 2, 2, 2, 4, 0, 0, 0, 1, 1, 3, 3, 5, 2, 2, 2, 2, 1, 1, 4, 3, 3, 3, 3, 2, 2, 4, 4, 4, 5, 5, 5, 6,
]

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
      if (strata) {
        // sun-cracked caprock: a meandering crack with a lit lower lip, pebbles
        let x = 2 + ((r() * 10) | 0)
        let y = 4 + ((r() * 6) | 0)
        const n = 4 + ((r() * 5) | 0)
        for (let k = 0; k < n; k++) {
          if (g[(y + 3) * 22 + x + 3] && !rimAt(g, x, y).d) {
            p.set(x, y, top[0])
            p.set(x, y + 1, top[2])
          }
          if (r() < 0.6) x += r() < 0.5 ? 1 : -1
          else y++
        }
        const px = 3 + ((r() * 10) | 0)
        const py = 5 + ((r() * 8) | 0)
        if (!rimAt(g, px, py).d) {
          p.set(px, py, top[3])
          p.set(px + 1, py, top[2])
          p.set(px + 1, py + 1, top[0])
        }
      } else
        for (let i = 0; i < 3; i++) {
          const x = 3 + ((r() * 10) | 0)
          const y = 4 + ((r() * 9) | 0)
          tuft(p, x, y, i % 3, top[0], top[1], top[3])
        }
      return p
    }
    // faces: rounded where sides open; bottom face also rounds at the base
    const faceMask = (mask & (W | E)) | N | NE | NW | (kind === 2 ? S | SE | SW : 0)
    const g = shapeGrid(faceMask, 0, 3, false)
    const st = pal.strata
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (!g[(y + 3) * 22 + x + 3]) continue
        let c: Col
        if (strata) {
          // world-continuous bands (v = tile x mod 4) that sag and swell, with lit band tops, undercut bottoms and
          // vertical erosion cracks
          const wx = v * 16 + x
          const wave = Math.round(Math.sin((wx / 64) * Math.PI * 2) * 1.4 + Math.sin((wx / 64) * Math.PI * 6 + 1) * 0.6)
          const wy = Math.min(STRATA_ROWS.length - 1, Math.max(0, (kind === 2 ? 0 : 16) + y + wave + 1))
          const band = STRATA_ROWS[wy]
          c = st[band]
          const above = STRATA_ROWS[Math.max(0, wy - 1)]
          const below = STRATA_ROWS[Math.min(STRATA_ROWS.length - 1, wy + 1)]
          if (above !== band && above > band) c = shade(c, 0.18)
          else if (below !== band && below < band) c = mix(c, st[Math.min(6, band + 1)], 0.5)
          const crack = hash(wx, 0, 77)
          if (crack < 0.09 && wy > 4 + (((crack * 100) | 0) % 8) && wy < 30) c = st[6]
          else if (hash(wx - 1, 0, 77) < 0.09 && wy > 5 && wy < 30) c = shade(c, 0.12)
          if (kind === 1 && y > 12 && hash(wx, y, 9) < 0.3) c = st[5]
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
        else if (rim.d === 2 && rim.dir === 2) c = strata ? st[5] : dark
        else if (rim.d === 2 && rim.dir === 1 && strata) c = mix(c, x < 8 ? st[0] : st[5], 0.45)
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
    const tint = hex('#1a1030')
    for (let x = 0; x < 16; x++) {
      p.set(x, 0, withAlpha(tint, 80))
      p.set(x, 1, withAlpha(tint, 60))
      if (dither(x, 2) < 0.5) p.set(x, 2, withAlpha(tint, 50))
      if (dither(x, 3) < 0.25) p.set(x, 3, withAlpha(tint, 40))
    }
    return p
  })
}

export function ledgeTile(theme: Theme, mask: number): HTMLCanvasElement {
  return cached(`l|${theme}|${mask & (W | E)}`, () => {
    const pal = PALS[theme]
    const [out, faceDark, face, lipLight] = pal.ledge
    const grass = theme === 'canyon' ? pal.tuft : [pal.field[1], pal.field[2], pal.field[3]]
    const p = new Px(16, 16)
    const l = !(mask & W)
    const r = !(mask & E)
    const tint = hex('#1a1030')
    for (let x = 0; x < 16; x++) {
      const capL = l && x < 2
      const capR = r && x > 13
      const edge = (l && x === 0) || (r && x === 15)
      const y0 = edge ? 9 : capL || capR ? 8 : 7
      p.set(x, y0 - 1, pal.field[3])
      p.set(x, y0, lipLight)
      for (let y = y0 + 1; y < 13; y++) {
        // eroded earth face: vertical striations, darker under the lip
        const band = (x + (y > 10 ? 2 : 0)) % 5
        let c = y === y0 + 1 ? faceDark : band === 0 ? faceDark : band === 2 ? mix(face, lipLight, 0.25) : face
        if (y === 12) c = mix(face, faceDark, 0.5)
        p.set(x, y, c)
      }
      p.set(x, 13, faceDark)
      p.set(x, 14, out)
      p.set(x, 15, withAlpha(tint, 70))
      if (edge) p.vl(x, y0, 15 - y0, out)
    }
    if (l) p.set(1, 8, out)
    if (r) p.set(14, 8, out)
    // grass drape hanging over the lip, blades of varying length
    for (let x = 1; x < 15; x++) {
      const h = hash(x, 0, 31)
      if (h > 0.5 || (l && x < 2) || (r && x > 13)) continue
      const len = h < 0.15 ? 3 : h < 0.3 ? 2 : 1
      for (let k = 0; k < len; k++) p.set(x, 8 + k, grass[k === len - 1 ? 0 : k === 0 ? 2 : 1])
    }
    // pebbles in the face
    p.set(5, 11, lipLight)
    p.set(6, 11, faceDark)
    p.set(11, 10, lipLight)
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

/** Bush (v 0..3): plain, blossoming, berried, leafy; canyon bushes are dry sage. Shadow comes from the map pass. */
export function bushTile(theme: Theme, v: number): HTMLCanvasElement {
  return cached(`b|${theme}|${v}`, () => {
    const [out, dark, base, light, hi] = PALS[theme].bush
    const p = new Px(16, 16)
    const r = rng(v * 41 + THEME_SEED[theme])
    const j = () => (r() - 0.5) * 0.9
    foliage(
      p,
      [
        [4.5 + j(), 11.2, 3.4, -1],
        [11.5 + j(), 11.2, 3.4, -1],
        [8, 11.8, 3.8, -1],
        [5 + j(), 7.8, 3.4, 0],
        [11 + j(), 7.8, 3.4, 0],
        [8 + j(), 6 + j(), 3.6, 1],
      ],
      [mix(dark, out, 0.45), dark, base, light, hi],
      1,
      14,
    )
    leafTexture(p, [mix(dark, out, 0.45), dark, base, light, hi], v)
    p.outline(out)
    if (theme !== 'canyon' && (v === 1 || v === 2)) {
      const cols = v === 1 ? [hex('#ffb4cc'), hex('#ffffff')] : [hex('#e03a3a'), hex('#b01c2c')]
      for (let i = 0; i < 5; i++) {
        const x = 3 + ((r() * 10) | 0)
        const y = 5 + ((r() * 7) | 0)
        const c = p.get(x, y)
        if (c === base || c === light) {
          p.set(x, y, cols[i & 1])
          if (v === 2) p.set(x + 1, y, cols[1])
        }
      }
    }
    return p
  })
}

const WOOD = [hex('#3e2414'), hex('#7a4c2a'), hex('#a26a3c'), hex('#c98c56'), hex('#e6b07a')]

/**
 * Bridge deck in span coordinates (a along the span, b across it): staggered planks with nail heads, a log rail with
 * capped posts along each open side (`railA` = west/north side, `railB` = east/south side) and heavier end beams.
 */
export function bridgeTile(
  vertical: boolean,
  railA: boolean,
  railB: boolean,
  endA: boolean,
  endB: boolean,
): HTMLCanvasElement {
  return cached(`br|${vertical ? 1 : 0}|${+railA}${+railB}${+endA}${+endB}`, () => {
    const [out, dark, base, light, hi] = WOOD
    const p = new Px(16, 16)
    const set = (a: number, b: number, c: Col) => (vertical ? p.set(b, a, c) : p.set(a, b, c))
    for (let a = 0; a < 16; a++) {
      const plank = a >> 2
      const tone = hash(plank, vertical ? 1 : 2, 3)
      const pc = tone < 0.3 ? mix(base, dark, 0.3) : tone > 0.75 ? mix(base, light, 0.4) : base
      for (let b = 0; b < 16; b++) {
        let c = pc
        const seam = a % 4 === 3
        if (seam) c = out
        else if (a % 4 === 0) c = mix(pc, hi, 0.35)
        else if (a % 4 === 2) c = mix(pc, dark, 0.3)
        if (!seam && (b === 3 || b === 12) && a % 4 === 1) c = dark
        if (!seam && hash(a, b, plank) < 0.04) c = dark
        set(a, b, c)
      }
    }
    const rail = (bs: [number, number, number, number]) => {
      const [o, top, mid, sh] = bs
      for (let a = 0; a < 16; a++) {
        set(a, o, out)
        set(a, top, light)
        set(a, mid, base)
        set(a, sh, withAlpha(out, 120))
      }
      // posts every 8px
      for (const a0 of [1, 9]) {
        for (let da = 0; da < 3; da++) {
          set(a0 + da, top, da === 0 ? hi : light)
          set(a0 + da, mid, da === 2 ? dark : base)
        }
        set(a0 + 3, top, out)
        set(a0 + 3, mid, out)
      }
    }
    if (railA) rail([0, 1, 2, 3])
    if (railB) rail([15, 13, 14, 12])
    const beam = (a0: number, a1: number) => {
      for (let b = 0; b < 16; b++) {
        set(a0, b, b === 0 || b === 15 ? out : light)
        set(a1, b, b === 0 || b === 15 ? out : dark)
      }
    }
    if (endA) beam(0, 1)
    if (endB) beam(14, 15)
    return p
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Trees: 24×32 sprites drawn at (tileX*16 - 4 + jitter, tileY*16 - 16); the tile is the lower-middle 16×16. Species
// per theme, size/offset/hue jitter per tile, darker ramps deeper in the woods.

export const TREE_W = 24
export const TREE_H = 32

export type Species = 'oak' | 'pine' | 'blossom' | 'fruit' | 'birch' | 'round' | 'dead' | 'saguaro' | 'spire'

/** Leaf-clump foliage: clumps are painted bottom-up so each upper clump's deep lower rim scallops over the ones
 * beneath (the classic GBA canopy look). `ramp` = [deep, dark, base, light, hi]; `shift` darkens/brightens a clump. */
function foliage(
  p: Px,
  clumps: readonly (readonly [number, number, number, number])[],
  ramp: Col[],
  x0: number,
  x1: number,
): void {
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

/** Leaf clusters: little lit crescents on base tones and dark leaf gaps in the shade, so canopies read as leaves. */
function leafTexture(p: Px, ramp: Col[], seed: number): void {
  const [deep, dark, base, light, hi] = ramp
  const marks: [number, number, Col][] = []
  for (let y = 1; y < p.h - 1; y++)
    for (let x = 1; x < p.w - 1; x++) {
      const c = p.get(x, y)
      const h = hash(x, y, seed * 13 + 7)
      if (c === base && h < 0.11 && p.get(x - 1, y - 1) !== 0) marks.push([x, y, light], [x + 1, y, light])
      else if (c === light && h < 0.07) marks.push([x, y, hi])
      else if (c === dark && h < 0.1) marks.push([x, y, deep])
      else if (c === base && h > 0.93) marks.push([x, y, dark])
    }
  for (const [x, y, c] of marks) if (p.get(x, y) !== 0) p.set(x, y, c)
}

function shiftRamp(ramp: Col[], depth: number, hue: number): Col[] {
  const tint = hue < 0 ? hex('#2a6e7a') : hex('#c8d25a')
  return ramp.map((c, i) => {
    let k = hue ? mix(c, tint, 0.13) : c
    if (depth) k = shade(k, -0.14 * depth - (i === 4 ? 0.06 * depth : 0))
    return k
  })
}

function trunkPx(
  p: Px,
  pal: Col[],
  x: number,
  top: number,
  bottom: number,
  w: number,
  roots: boolean,
  pale = false,
): void {
  const [tout, tdark, tbase, tlight] = pale ? [hex('#4a4a52'), hex('#b8b4aa'), hex('#e6e2d6'), hex('#fbf8ee')] : pal
  const t = new Px(TREE_W, TREE_H)
  t.rect(x, top, w, bottom - top + 1, tbase)
  t.vl(x, top, bottom - top + 1, tlight)
  t.vl(x + w - 1, top, bottom - top + 1, tdark)
  if (pale)
    for (let y = top + 1; y < bottom; y += 3) {
      t.set(x + 1 + (y & 1), y, hex('#2e2a2a'))
      t.set(x + w - 1, y + 1, hex('#5a5652'))
    }
  else t.set(x + 1, top + ((bottom - top) >> 1), tdark)
  if (roots) {
    t.set(x - 1, bottom, tbase)
    t.set(x - 1, bottom - 1, tlight)
    t.set(x + w, bottom, tdark)
    t.set(x + w, bottom - 1, tdark)
    t.set(x - 2, bottom, tdark)
    t.set(x + w + 1, bottom, tdark)
  }
  t.outline(tout)
  p.blit(t, 0, 0)
}

/**
 * Tree sprite. `v` 0..3 = size/shape jitter, `depth` 0..2 = rows into the woods (darker, cooler), `hue` -1/0/1 =
 * per-tree tint step. Shadows are cast by the map pass, not baked here.
 */
export function treeSprite(theme: Theme, species: Species, v: number, depth: number, hue: number): HTMLCanvasElement {
  return cached(`tr|${theme}|${species}|${v}|${depth}|${hue}`, () => {
    const pal = PALS[theme]
    const p = new Px(TREE_W, TREE_H)
    const r = rng(v * 97 + THEME_SEED[theme] * 3 + species.length * 31)
    const roots = depth === 0
    if (species === 'pine') return pineSprite(p, shiftRamp(pal.pine, depth, hue), pal.trunk, v, roots)
    if (species === 'round') return roundSprite(p, shiftRamp(pal.tree, depth, hue), pal.trunk, v)
    if (species === 'dead' || species === 'saguaro' || species === 'spire') {
      groundShadow(p, 13.5, 29.5, species === 'spire' ? 8 : 6.5, 2.2)
      if (species === 'dead') return deadSprite(p, pal.pine, v)
      if (species === 'saguaro') return saguaroSprite(p, pal.cactus, v)
      return spireSprite(p, pal.strata, v)
    }
    const birch = species === 'birch'
    const ramp = shiftRamp(species === 'blossom' ? pal.blossom : pal.tree, depth, birch ? 1 : hue)
    const s = [0.9, 0.96, 1.02, 1.08][v] * (birch ? 0.9 : 1)
    const sx = birch ? 0.82 : 1
    const cx = 12
    const cy = 14.5 + (1.08 - s) * 5
    trunkPx(p, pal.trunk, 10, 20, 29, birch ? 3 : 4, roots, birch)
    const j = () => (r() - 0.5) * 1.3
    const clumps: [number, number, number, number][] = [
      [-6.2, 5, 4.0, -1],
      [6.2, 5, 4.0, -1],
      [0, 5.8, 4.4, -1],
      [-7, 0.8, 4.2, 0],
      [7, 0.8, 4.2, 0],
      [0, 1.2, 4.8, 0],
      [-3.4, -3.4, 4.4, 0],
      [3.4, -3.4, 4.4, 0],
      [0, -5.8, 4.2, 1],
    ]
    const cp = new Px(TREE_W, TREE_H)
    foliage(
      cp,
      clumps.map(([dx, dy, rr, sh]) => [cx + (dx * sx + j()) * s, cy + (dy + j() * 0.6) * s, rr * s, sh] as const),
      [mix(ramp[1], ramp[0], 0.45), ramp[1], ramp[2], ramp[3], ramp[4]],
      1,
      TREE_W - 2,
    )
    leafTexture(cp, [mix(ramp[1], ramp[0], 0.45), ramp[1], ramp[2], ramp[3], ramp[4]], v + depth * 4)
    if (species === 'blossom') {
      // leaves peeking through the shaded underside, white petals on the lit side
      for (let y = 0; y < TREE_H; y++)
        for (let x = 0; x < TREE_W; x++) {
          const c = cp.get(x, y)
          const h = hash(x, y, 71 + v)
          if (c === ramp[1] && h < 0.3) cp.set(x, y, shiftRamp(pal.tree, depth, 0)[1])
          else if (c === ramp[3] && h < 0.12) cp.set(x, y, hex('#ffffff'))
        }
    }
    if (species === 'fruit') {
      const fruit = theme === 'meadow' ? hex('#f09a2a') : hex('#e0402e')
      let n = 0
      for (let i = 0; i < 40 && n < 5; i++) {
        const x = 4 + ((r() * 15) | 0)
        const y = 4 + ((r() * 15) | 0)
        const c = cp.get(x, y)
        if (c !== ramp[2] && c !== ramp[1]) continue
        cp.set(x, y, fruit)
        cp.set(x + 1, y, shade(fruit, -0.3))
        cp.set(x, y + 1, shade(fruit, -0.3))
        cp.set(x + 1, y + 1, shade(fruit, -0.45))
        cp.set(x, y - 1, shade(fruit, 0.5))
        n++
      }
    }
    cp.outline(ramp[0])
    p.blit(cp, 0, 0)
    return p
  })
}

function pineSprite(p: Px, ramp: Col[], trunk: Col[], v: number, roots: boolean): Px {
  const [out, dark, base, light, hi] = ramp
  const deep = mix(dark, out, 0.5)
  trunkPx(p, trunk, 11, 24, 29, 2, roots)
  const s = [0.9, 0.97, 1.03, 1.1][v]
  const cp = new Px(TREE_W, TREE_H)
  const cx = 12
  const tiers = 4
  const top = Math.round(3 + (1.1 - s) * 8)
  for (let i = 0; i < tiers; i++) {
    const ty = top + i * 5
    const hw = (2.2 + i * 2.3) * s
    const h = i === 0 ? 7 : 6
    for (let yy = 0; yy <= h; yy++) {
      const w = Math.round(0.5 + (hw - 0.5) * (yy / h))
      for (let xx = -w; xx <= w; xx++) {
        const x = cx + xx
        const y = ty + yy
        const nx = w ? xx / w : 0
        let c = nx < -0.4 ? light : nx < 0.25 ? base : dark
        if (yy <= 1 && nx < 0.2) c = i === 0 ? hi : light
        // drooping bough tips: jagged lower edge
        if (yy === h) c = (xx + i) & 1 ? deep : dark
        else if (yy === h - 1 && Math.abs(nx) > 0.5 && (xx + i) & 1) c = deep
        if (c === light && hash(x, y, 3 + v) < 0.12) c = hi
        if (c === base && hash(x, y, 5 + v) < 0.1) c = dark
        if (yy === h && ((xx + i) & 3) === 0 && Math.abs(xx) < w) cp.set(x, y + 1, deep)
        cp.set(x, y, c)
      }
    }
  }
  cp.outline(out)
  p.blit(cp, 0, 0)
  return p
}

/** City street tree: a trimmed, scalloped sphere on a straight stem. */
function roundSprite(p: Px, ramp: Col[], trunk: Col[], v: number): Px {
  const [out, dark, base, light, hi] = ramp
  trunkPx(p, trunk, 11, 20, 29, 2, true)
  const s = [0.92, 0.98, 1.03, 1.08][v]
  const cx = 12
  const cy = 13
  const R = 8.6 * s
  const cp = new Px(TREE_W, TREE_H)
  for (let y = 0; y < TREE_H; y++)
    for (let x = 0; x < TREE_W; x++) {
      const dx = x + 0.5 - cx
      const dy = (y + 0.5 - cy) * 1.05
      const a = Math.atan2(dy, dx)
      const rr = R + Math.sin(a * 7 + v) * 0.7
      const d = Math.hypot(dx, dy)
      if (d > rr) continue
      const nx = dx / rr
      const ny = dy / rr
      const l = -(nx * 0.6 + ny * 0.8) + (dither(x, y) - 0.5) * 0.25
      let c = l > 0.55 ? hi : l > 0.12 ? light : l > -0.4 ? base : dark
      if (ny > 0.72) c = mix(dark, out, 0.4)
      cp.set(x, y, c)
    }
  leafTexture(cp, [mix(dark, out, 0.4), dark, base, light, hi], v + 11)
  cp.outline(out)
  p.blit(cp, 0, 0)
  return p
}

function line(p: Px, x0: number, y0: number, x1: number, y1: number, c: Col): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let i = 0; i <= n; i++) p.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c)
}

/** Checker-dithered contact shadow for sprites standing on baked rock (the map pass has already run). */
function groundShadow(p: Px, cx: number, cy: number, rx: number, ry: number): void {
  const tint = withAlpha(hex('#1a1030'), 90)
  p.ellipse(cx, cy, rx, ry, (x, y, nx, ny) => (nx * nx + ny * ny < 0.5 || ((x + y) & 1) === 0 ? tint : 0))
}

/** Canyon deadwood: a twisted, bleached snag with forked branches. */
function deadSprite(p: Px, ramp: Col[], v: number): Px {
  const [out, dark, base, light, hi] = ramp
  const t = new Px(TREE_W, TREE_H)
  const r = rng(v * 131 + 9)
  t.rect(11, 16, 3, 14, base)
  t.vl(11, 16, 14, light)
  t.vl(13, 16, 14, dark)
  t.set(10, 29, base)
  t.set(14, 29, dark)
  const branch = (x: number, y: number, a: number, len: number, depth: number) => {
    const x1 = x + Math.cos(a) * len
    const y1 = y + Math.sin(a) * len
    line(t, x, y, x1, y1, depth === 0 ? light : base)
    if (depth === 0) line(t, x + 1, y, x1 + 1, y1, dark)
    if (depth < 2) {
      branch(x1, y1, a - 0.5 - r() * 0.3, len * 0.6, depth + 1)
      branch(x1, y1, a + 0.4 + r() * 0.3, len * 0.55, depth + 1)
    }
  }
  branch(12, 17, -Math.PI / 2 - 0.55 - r() * 0.2, 6 + r() * 2, 0)
  branch(12, 19, -Math.PI / 2 + 0.6 + r() * 0.2, 5 + r() * 2, 0)
  branch(12, 16, -Math.PI / 2 + (r() - 0.5) * 0.3, 5, 1)
  t.set(12, 22, hi)
  t.set(12, 23, dark)
  t.outline(out)
  p.blit(t, 0, 0)
  return p
}

/** Saguaro cactus: ribbed column with two arms; odd variants carry a bloom. */
function saguaroSprite(p: Px, ramp: Col[], v: number): Px {
  const [out, dark, base, light, hi] = ramp
  const t = new Px(TREE_W, TREE_H)
  const rib = (x0: number, w: number, x: number) => {
    const i = x - x0
    return i === 0 ? light : i === 1 ? hi : i === w - 1 ? dark : i === w - 2 && w > 3 ? base : base
  }
  const column = (x0: number, y0: number, y1: number, w: number) => {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x < x0 + w; x++) {
        if (y === y0 && (x === x0 || x === x0 + w - 1)) continue
        t.set(x, y, rib(x0, w, x))
      }
  }
  const armY = [18, 16, 20, 17][v]
  column(10, 7 + (v & 1), 29, 5)
  // left arm
  column(5, armY - 7, armY + 1, 3)
  for (let x = 6; x < 10; x++) {
    t.set(x, armY + 1, base)
    t.set(x, armY + 2, dark)
  }
  // right arm (higher/lower per variant)
  const ry = armY - 4 + (v & 2)
  column(16, ry - 6, ry + 1, 3)
  for (let x = 15; x < 17; x++) {
    t.set(x, ry + 1, base)
    t.set(x, ry + 2, dark)
  }
  // spines
  for (let y = 10; y < 28; y += 3) t.set(10, y, hi)
  if (v & 1) {
    t.set(12, 6 + (v & 1), hex('#ff7aa0'))
    t.set(11, 7, hex('#ffd0dc'))
  }
  t.outline(out)
  p.blit(t, 0, 0)
  return p
}

/** Hoodoo: a weathered strata cone flaring into its scree, crowned by a darker, overhanging caprock. */
function spireSprite(p: Px, st: Col[], v: number): Px {
  const t = new Px(TREE_W, TREE_H)
  const top = [7, 4, 9, 5][v]
  const cap = 3 + (v & 1)
  const out = st[6]
  for (let y = top; y < 30; y++) {
    const k = (y - top - cap) / (30 - top - cap)
    const capRow = y < top + cap
    // eroded silhouette: a wobbling cone, pinched just under the cap, flaring at the foot
    const half = capRow
      ? 4.2 + (y === top ? -1 : 0.4) + (v & 1)
      : 1.8 + k * 4.4 + Math.sin(y * 1.1 + v * 2) * 0.55 + (k > 0.85 ? (k - 0.85) * 14 : 0)
    const shift = Math.round(Math.sin(y * 0.35 + v) * 0.7)
    for (let x = Math.round(12 - half) + shift; x < Math.round(12 + half) + shift; x++) {
      const nx = (x + 0.5 - 12 - shift) / half
      let band = capRow ? 4 : STRATA_ROWS[(y - top + v * 5) % STRATA_ROWS.length]
      if (nx > 0.35) band = Math.min(6, band + 1)
      if (nx > 0.7) band = Math.min(6, band + 1)
      let c = st[band]
      if (nx < -0.5) c = shade(c, 0.18)
      if (y === top || (capRow && y === top + 1 && nx < 0.2)) c = st[2]
      if (y === top + cap) c = st[6]
      t.set(x, y, c)
    }
  }
  // scree at the foot
  t.set(5 + v, 29, st[3])
  t.set(6 + v, 29, st[4])
  t.set(17 - v, 29, st[4])
  t.outline(out)
  p.blit(t, 0, 0)
  return p
}

/** Small plateau decorations (16×16): 0 dry scrub, 1 barrel cactus, 2 bleached bones, 3 boulder; `flip` mirrors. */
export function decoSprite(theme: Theme, kind: number, flip: boolean): HTMLCanvasElement {
  return cached(`deco|${theme}|${kind}|${flip ? 1 : 0}`, () => {
    const pal = PALS[theme]
    const p = new Px(16, 16)
    if (kind === 0) {
      const [out, dark, base, light, hi] = pal.bush
      foliage(
        p,
        [
          [5.5, 11, 2.6, -1],
          [10.5, 11, 2.6, -1],
          [8, 9, 3, 0],
        ],
        [out, dark, base, light, hi],
        1,
        14,
      )
      leafTexture(p, [out, dark, base, light, hi], 3)
      p.outline(out)
    } else if (kind === 1) {
      const [out, dark, base, light, hi] = pal.cactus
      p.ellipse(8, 10.5, 3.2, 3.6, (x) => (x < 6 ? light : x < 7 ? hi : x < 9 ? base : dark))
      p.set(7, 7, hex('#ff7aa0'))
      p.set(8, 7, hex('#ffd0dc'))
      p.set(6, 10, hi)
      p.set(6, 12, hi)
      p.outline(out)
    } else if (kind === 2) {
      const bone = hex('#f2ead6')
      const bd = hex('#b8ac94')
      // skull
      p.hl(4, 9, 4, bone)
      p.hl(4, 10, 4, bone)
      p.hl(5, 11, 2, bd)
      p.set(4, 10, hex('#3a2a24'))
      p.set(6, 10, hex('#3a2a24'))
      p.set(3, 8, bd)
      p.set(8, 8, bd)
      // ribs
      for (let i = 0; i < 3; i++) {
        p.set(10 + i * 2, 10, bone)
        p.set(10 + i * 2, 11, bone)
        p.set(10 + i * 2, 12, bd)
      }
      p.hl(9, 9, 6, bd)
      p.outline(withAlpha(hex('#4a2a1c'), 150))
    } else {
      const [out, dark, base, light, hi] = pal.rock
      p.ellipse(8, 10.5, 5, 3.6, (x, y) => (y < 9 ? (x < 7 ? hi : light) : x > 9 ? dark : base))
      p.set(6, 9, hi)
      p.set(10, 11, out)
      p.outline(mix(out, hex('#1a1030'), 0.3))
    }
    if (!flip) return p
    const m = new Px(16, 16)
    m.blit(p, 0, 0, true)
    return m
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Flowers (',' tiles). Heads sway over 4 frames; species per tile keeps patches coherent. Leaves are baked.

export const FLOWER_SPECIES = 5

/** Flower `i` (0..2) of a ',' tile, packed x | y<<4 | species<<8 | colour<<12 so the per-frame loop never allocates.
 * Two flowers share the tile's species and colour; the third may differ, so patches read as clumps. */
export function flowerSpot(tx: number, ty: number, i: number): number {
  const h1 = hash(tx, ty, 41 + i)
  const h2 = hash(tx, ty, 51 + i)
  const x = i === 0 ? Math.floor(h1 * 4) : i === 1 ? 8 + Math.floor(h1 * 2) : 3 + Math.floor(h1 * 4)
  const y = i === 0 ? Math.floor(h2 * 3) : i === 1 ? 1 + Math.floor(h2 * 3) : 5 + Math.floor(h2 * 3)
  const odd = i === 2 && hash(tx, ty, 64) < 0.4
  const species = (Math.floor(hash(tx, ty, 63) * FLOWER_SPECIES) + (odd ? 2 : 0)) % FLOWER_SPECIES
  const col = Math.floor(hash(tx, ty, odd ? 62 : 61) * 15)
  return x | (y << 4) | (species << 8) | (col << 12)
}

/** 7×9 flower head + stem. species: 0 five-petal, 1 tulip, 2 daisy, 3 bell, 4 sprig cluster. */
export function flowerSprite(petal: Col, species: number, f: number): HTMLCanvasElement {
  return cached(`fl|${petal}|${species}|${f}`, () => {
    const p = new Px(7, 9)
    const sway = [0, 1, 0, -1][f & 3]
    const stem = hex('#2e7a3c')
    const cx = 3 + sway
    const dk = shade(petal, -0.32)
    const lt = shade(petal, 0.45)
    p.set(3, 7, stem)
    p.set(3, 6, stem)
    p.set(cx === 3 ? 3 : (cx + 3) >> 1, 5, stem)
    p.set(4, 8, withAlpha(hex('#1a1030'), 50))
    if (species === 0) {
      p.set(cx, 2, lt)
      p.set(cx - 1, 3, shade(petal, 0.15))
      p.set(cx + 1, 3, dk)
      p.set(cx, 4, dk)
      p.set(cx, 3, hex('#ffd23a'))
      p.set(cx + 1, 4, withAlpha(hex('#1a1030'), 60))
    } else if (species === 1) {
      p.set(cx - 1, 1, lt)
      p.set(cx + 1, 1, petal)
      p.hl(cx - 1, 2, 3, petal)
      p.set(cx - 1, 2, lt)
      p.hl(cx - 1, 3, 3, dk)
      p.set(cx, 3, petal)
      p.set(cx, 4, dk)
    } else if (species === 2) {
      const w = hex('#ffffff')
      const wd = hex('#d8d8e8')
      p.set(cx, 2, w)
      p.set(cx - 1, 3, w)
      p.set(cx + 1, 3, wd)
      p.set(cx, 4, wd)
      p.set(cx - 1, 2, withAlpha(w, 160))
      p.set(cx + 1, 4, withAlpha(wd, 160))
      p.set(cx, 3, petal === w ? hex('#ffd23a') : petal)
    } else if (species === 3) {
      p.set(cx, 1, stem)
      p.set(cx + 1, 2, petal)
      p.set(cx + 1, 3, dk)
      p.set(cx - 1, 3, lt)
      p.set(cx - 1, 4, dk)
      p.set(cx, 2, stem)
    } else {
      p.set(cx, 2, lt)
      p.set(cx - 1, 4, petal)
      p.set(cx + 1, 3, petal)
      p.set(cx + 1, 4, dk)
      p.set(cx - 1, 5, dk)
    }
    return p
  })
}

/** Leaf rosette baked under a flower (7×4, bottom row = flower base row). */
export function flowerLeaves(theme: Theme, v: number): HTMLCanvasElement {
  return cached(`fll|${theme}|${v & 1}`, () => {
    const [, dark, mid, light] = PALS[theme].tall
    const p = new Px(7, 4)
    p.set(1, 3, dark)
    p.set(2, 2, mid)
    p.set(2, 3, dark)
    p.set(4, 3, dark)
    p.set(4, 2, v & 1 ? light : mid)
    p.set(5, 3, dark)
    if (v & 1) p.set(0, 3, mid)
    else p.set(6, 3, mid)
    return p
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Tall grass: clumps of pointed, outlined leaves; `lean` ∈ {-1,0,1} tilts the tips and flashes the pale undersides,
// so the wind wave reads as a bright ripple rolling across the field.

function leaf(
  p: Px,
  cx: number,
  base: number,
  h: number,
  halfW: number,
  lean: number,
  pal: Col[],
  shine: boolean,
): void {
  const [, dark, mid, light, tip] = pal
  for (let j = 0; j < h; j++) {
    const y = base - j
    const t = j / (h - 1)
    const hw = Math.max(0, Math.round(halfW * (1 - t) + 0.2))
    const shift = t > 0.55 ? lean : 0
    for (let k = -hw; k <= hw; k++) {
      let c = j === h - 1 ? tip : k === -hw && hw > 0 ? light : t > 0.6 ? light : k === hw && hw > 0 ? dark : mid
      if (shine && t > 0.35) c = t > 0.7 || k === -hw ? tip : light
      p.set(cx + k + shift, y, j < 2 ? dark : c)
    }
  }
}

function tallPx(theme: Theme, lean: number, front: boolean, v: number): Px {
  const pal = PALS[theme].tall
  const p = new Px(16, 16)
  const sh = v ? 3 : 0
  const shine = lean !== 0
  // leaves wrap around the tile so neighbouring tiles interlock seamlessly
  const tuftAt = (buf: Px, cx: number, base: number, h: number, hw: number, glow: boolean) => {
    const x = (cx + sh) % 16
    leaf(buf, x, base, h, hw, lean, pal, glow)
    if (x - hw < 0) leaf(buf, x + 16, base, h, hw, lean, pal, glow)
    if (x + hw > 15) leaf(buf, x - 16, base, h, hw, lean, pal, glow)
  }
  const back = new Px(16, 16)
  if (!front) {
    for (const cx of [2, 7, 12]) tuftAt(back, cx, 9, 8 + ((cx + v) % 3 === 0 ? 1 : 0), 2, shine && cx === 7)
    for (const cx of [0, 5, 10, 14]) tuftAt(back, cx, 9, 6, 1, false)
    back.outline(pal[0])
    p.blit(back, 0, 0)
  }
  const fr = new Px(16, 16)
  for (const cx of [4, 9, 14]) tuftAt(fr, cx, 15, 8 + ((cx + v) % 2), 2, shine && cx !== 9)
  for (const cx of [1, 7, 12]) tuftAt(fr, cx, 15, 6, 1, false)
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
