/**
 * Remy's Revenge level layouts: 50 original, hand-tuned recipes expanded deterministically into 23×23 boards.
 *
 * A recipe names a movable block field shape around the centre, an immovable pattern, seeded hazard counts, the
 * first-wave cat count, the clock and a short hand-placed tweak list. `createLayout` expands it; `validateLayout`
 * checks the board's static invariants and then searches for a concrete witness that the first-wave cats can be
 * trapped with real pushes (see {@link validateLayout} for the exact model and its honest limits).
 *
 * Pure TS: no DOM, no React, no audio. Levels 51+ reuse layout ((n − 1) mod 50) + 1 and keep their own number, so the
 * engine can speed the cats up by `number`.
 */
import { mulberry32 } from '../kit/remy'

/** Board cell contents. Cats, the mouse and yarn are not tiles: they live in the layout's point lists. */
export enum Tile {
  Empty = 0,
  Block = 1,
  Fixed = 2,
  Rug = 3,
  Trap = 4,
  Cheese = 5,
}

/** Board width and height in cells. */
export const SIZE = 23
/** Number of authored layouts; level n ≥ 51 repeats layout ((n − 1) mod 50) + 1. */
export const LEVEL_COUNT = 50

export type Point = { x: number; y: number }

export type LevelLayout = {
  /** The level number asked for (51+ keep their number; the layout repeats). */
  number: number
  /** SIZE × SIZE tiles, row-major (`y * SIZE + x`). A fresh copy per call: the engine may mutate it. */
  cells: Uint8Array
  /** Mouse start and respawn cell. */
  mouse: Point
  /** First-wave cat spawns (on the outer edge lane), present when the clock starts. */
  cats: Point[]
  /** Hopium yarn starts (level 21+). */
  yarn: Point[]
  /** Seconds for one sweep of the clock hand. */
  duration: number
  /** Blue wave marks: seconds after the start, ascending, inside `(0, duration)`. */
  waveTimes: number[]
  /** The hand-placed tweaks applied on top of the recipe, in order (also the authoring record). */
  tweaks: readonly string[]
}

type Field = 'square' | 'round' | 'diamond' | 'cross' | 'quads' | 'rings' | 'stripes' | 'columns' | 'checker' | 'twin' | 'hollow' | 'octagon'
type Fixed = 'scatter' | 'pillars' | 'frame' | 'spokes' | 'bars' | 'posts' | 'corners'

/**
 * One level. `r` is the field's Chebyshev radius around the centre (default 9, which keeps the two-cell outer lane free
 * for cats). `fixed` entries are `[pattern, n]`; `holes` punches seeded single-cell pockets into the field; hazard
 * counts are placed from `seed`. `waves` is the number of blue marks after the first wave; `clock` is the sweep in
 * seconds.
 */
type Recipe = {
  field: Field
  r?: number
  fixed?: readonly (readonly [Fixed, number])[]
  holes?: number
  rugs?: number
  traps?: number
  yarn?: number
  cats: number
  waves: number
  clock: number
  seed: number
  tweaks?: readonly string[]
}

const C = 11

/**
 * The 50 levels. Progression the table keeps: no hazards before 13; rugs from 13, traps from 17, yarn from 21; at most
 * one hazard kind per level before 35, two or more from 35; first-wave cats 1 → 3; immovables roughly 2 → 50.
 */
const RECIPES: readonly Recipe[] = [
  // 1–12: the field. Big movable blocks, a few immovables, cats in the outer lane.
  // 1 Welcome Mat
  { field: 'square', r: 8, cats: 1, waves: 2, clock: 120, seed: 101, tweaks: ['fixed 4,4', 'fixed 18,18'] },
  // 2 Big Cheese Board
  { field: 'square', cats: 1, waves: 2, clock: 120, seed: 202, tweaks: ['fixed 4,18', 'fixed 18,4', 'empty 11,2..11,3'] },
  // 3 Round Table
  { field: 'round', fixed: [['scatter', 1]], cats: 1, waves: 2, clock: 130, seed: 303, tweaks: ['fixed 11,4', 'fixed 11,18'] },
  // 4 Two Tails
  { field: 'square', r: 8, fixed: [['scatter', 2]], cats: 2, waves: 2, clock: 130, seed: 404, tweaks: ['empty 3,11', 'empty 19,11'] },
  // 5 Stop Sign
  { field: 'octagon', fixed: [['scatter', 2]], cats: 2, waves: 3, clock: 150, seed: 505, tweaks: ['fixed 8,11', 'fixed 14,11'] },
  // 6 Kite
  { field: 'diamond', fixed: [['scatter', 2]], cats: 2, waves: 3, clock: 150, seed: 606, tweaks: ['fixed 11,5', 'empty 11,2..11,3'] },
  // 7 Picture Frame
  { field: 'square', fixed: [['frame', 3]], cats: 2, waves: 3, clock: 150, seed: 707, tweaks: ['fixed 5,5', 'fixed 17,17'] },
  // 8 Plus One
  { field: 'cross', fixed: [['scatter', 2]], cats: 2, waves: 3, clock: 150, seed: 808, tweaks: ['fixed 11,7', 'fixed 11,15'] },
  // 9 Studs
  { field: 'round', fixed: [['pillars', 4]], cats: 2, waves: 3, clock: 160, seed: 909, tweaks: ['empty 13,13', 'empty 9,9'] },
  // 10 Twin Fields
  { field: 'twin', r: 8, fixed: [['corners', 2]], cats: 2, waves: 3, clock: 160, seed: 1010, tweaks: ['fixed 11,5', 'fixed 11,17'] },
  // 11 Starburst
  { field: 'square', fixed: [['spokes', 7]], holes: 6, cats: 2, waves: 3, clock: 160, seed: 1111, tweaks: ['fixed 11,3', 'fixed 3,11'] },
  // 12 Four Pastures
  { field: 'quads', fixed: [['scatter', 3]], cats: 2, waves: 3, clock: 160, seed: 1212, tweaks: ['block 11,5', 'block 11,17'] },

  // 13–20: rugs, then traps. More immovables.
  // 13 First Rug
  { field: 'square', fixed: [['scatter', 3]], rugs: 2, cats: 2, waves: 3, clock: 160, seed: 1313, tweaks: ['rug 11,5'] },
  // 14 Rug Gallery
  { field: 'octagon', fixed: [['frame', 5]], rugs: 3, cats: 2, waves: 3, clock: 170, seed: 1414, tweaks: ['empty 11,5', 'rug 5,11'] },
  // 15 Carpet Kite
  { field: 'diamond', fixed: [['pillars', 5]], rugs: 3, cats: 2, waves: 4, clock: 180, seed: 1515, tweaks: ['rug 17,11', 'fixed 11,16'] },
  // 16 Onion
  { field: 'rings', fixed: [['pillars', 4]], rugs: 4, cats: 2, waves: 4, clock: 180, seed: 1616, tweaks: ['block 11,4', 'block 11,18'] },
  // 17 Snap
  { field: 'square', fixed: [['bars', 5]], traps: 2, cats: 2, waves: 4, clock: 180, seed: 1717, tweaks: ['trap 11,3'] },
  // 18 Cheese Wheel
  { field: 'round', fixed: [['scatter', 4]], traps: 3, cats: 2, waves: 4, clock: 180, seed: 1818, tweaks: ['fixed 7,7', 'fixed 15,15'] },
  // 19 Crossroads
  { field: 'cross', fixed: [['frame', 5]], traps: 3, cats: 2, waves: 4, clock: 180, seed: 1919, tweaks: ['trap 3,11', 'empty 11,6'] },
  // 20 Checkmate
  { field: 'checker', fixed: [['corners', 3]], traps: 4, cats: 2, waves: 4, clock: 190, seed: 2020, tweaks: ['block 11,8', 'block 11,14'] },

  // 21–34: Hopium yarn arrives; one hazard kind per level.
  // 21 Hopium
  { field: 'square', fixed: [['scatter', 3]], yarn: 1, cats: 2, waves: 4, clock: 190, seed: 2121, tweaks: ['fixed 11,4'] },
  // 22 Ball Pit
  { field: 'octagon', fixed: [['pillars', 4]], yarn: 1, cats: 2, waves: 4, clock: 190, seed: 2222, tweaks: ['empty 6,11', 'empty 16,11'] },
  // 23 Pinstripes
  { field: 'stripes', fixed: [['scatter', 2]], yarn: 2, cats: 2, waves: 4, clock: 190, seed: 2323, tweaks: ['block 4,14', 'block 18,8'] },
  // 24 Rug Quarter
  { field: 'quads', fixed: [['spokes', 8]], rugs: 4, cats: 2, waves: 4, clock: 200, seed: 2424, tweaks: ['rug 11,5', 'rug 11,17'] },
  // 25 Hopium Halo
  { field: 'round', fixed: [['frame', 4]], yarn: 2, cats: 2, waves: 4, clock: 200, seed: 2525, tweaks: ['empty 11,7', 'fixed 4,11'] },
  // 26 Colonnade
  { field: 'columns', fixed: [['scatter', 3]], yarn: 2, cats: 2, waves: 4, clock: 200, seed: 2626, tweaks: ['block 14,11', 'block 8,11'] },
  // 27 Trap Lattice
  { field: 'square', fixed: [['pillars', 3]], traps: 4, cats: 2, waves: 4, clock: 200, seed: 2727, tweaks: ['trap 18,4'] },
  // 28 Hollow Promise
  { field: 'hollow', fixed: [['bars', 6]], yarn: 2, cats: 2, waves: 4, clock: 200, seed: 2828, tweaks: ['fixed 11,3', 'fixed 11,19'] },
  // 29 Diamond Hands
  { field: 'diamond', fixed: [['frame', 7]], yarn: 2, cats: 2, waves: 4, clock: 210, seed: 2929, tweaks: ['empty 11,4', 'block 11,1'] },
  // 30 Rug Twins
  { field: 'twin', fixed: [['scatter', 4]], rugs: 5, cats: 2, waves: 5, clock: 220, seed: 3030, tweaks: ['fixed 11,6', 'fixed 11,16'] },
  // 31 Ripples
  { field: 'rings', fixed: [['spokes', 8]], yarn: 2, cats: 3, waves: 5, clock: 220, seed: 3131, tweaks: ['block 4,11', 'block 18,11'] },
  // 32 Cross Studs
  { field: 'cross', fixed: [['pillars', 4]], yarn: 2, cats: 3, waves: 5, clock: 220, seed: 3232, tweaks: ['fixed 6,11', 'fixed 16,11'] },
  // 33 Snap Board
  { field: 'checker', fixed: [['frame', 7]], traps: 5, cats: 3, waves: 5, clock: 220, seed: 3333, tweaks: ['trap 11,4'] },
  // 34 Compass
  { field: 'octagon', fixed: [['spokes', 6], ['frame', 4]], yarn: 3, cats: 3, waves: 5, clock: 230, seed: 3434, tweaks: ['empty 11,7', 'empty 11,15'] },

  // 35–50: hazards combined; the Cabald stops pretending.
  // 35 Due Diligence
  { field: 'square', fixed: [['scatter', 4]], rugs: 3, traps: 2, cats: 3, waves: 5, clock: 230, seed: 3535, tweaks: ['fixed 11,3'] },
  // 36 Hopium Rug
  { field: 'round', fixed: [['pillars', 4]], rugs: 3, yarn: 1, cats: 3, waves: 5, clock: 230, seed: 3636, tweaks: ['rug 11,4', 'empty 11,18'] },
  // 37 Quarterly Report
  { field: 'quads', fixed: [['frame', 6]], traps: 3, yarn: 2, cats: 3, waves: 5, clock: 230, seed: 3737, tweaks: ['block 11,9', 'block 11,13'] },
  // 38 Bar Chart
  { field: 'stripes', fixed: [['scatter', 3]], rugs: 3, traps: 3, cats: 3, waves: 5, clock: 240, seed: 3838, tweaks: ['fixed 4,11', 'fixed 18,11'] },
  // 39 Sparkle
  { field: 'diamond', fixed: [['frame', 4]], traps: 3, yarn: 2, cats: 3, waves: 5, clock: 240, seed: 3939, tweaks: ['trap 11,16'] },
  // 40 Empty Vault
  { field: 'hollow', fixed: [['frame', 5]], rugs: 4, yarn: 2, cats: 3, waves: 5, clock: 240, seed: 4040, tweaks: ['empty 11,6', 'rug 16,11'] },
  // 41 Pillars of Hopium
  { field: 'columns', fixed: [['pillars', 5], ['scatter', 3]], rugs: 3, traps: 2, yarn: 1, cats: 3, waves: 5, clock: 240, seed: 4141, tweaks: ['fixed 11,4'] },
  // 42 Aerodynamics
  { field: 'square', fixed: [['spokes', 7], ['scatter', 2]], rugs: 3, traps: 2, yarn: 1, cats: 3, waves: 5, clock: 250, seed: 4242, tweaks: ['empty 11,4'] },
  // 43 Plausible Deniability
  { field: 'octagon', fixed: [['frame', 6], ['posts', 3]], rugs: 3, traps: 3, yarn: 1, cats: 3, waves: 5, clock: 250, seed: 4343, tweaks: ['trap 18,11'] },
  // 44 Crossfire
  { field: 'cross', fixed: [['scatter', 5]], rugs: 3, traps: 3, yarn: 2, cats: 3, waves: 5, clock: 250, seed: 4444, tweaks: ['rug 11,4', 'trap 11,18'] },
  // 45 Tree Rings
  { field: 'rings', fixed: [['corners', 3], ['spokes', 5]], rugs: 4, traps: 2, yarn: 2, cats: 3, waves: 5, clock: 260, seed: 4545, tweaks: ['fixed 11,6'] },
  // 46 Matching Capes
  {
    field: 'twin',
    fixed: [['corners', 3], ['scatter', 3]],
    rugs: 3,
    traps: 3,
    yarn: 2,
    cats: 3,
    waves: 6,
    clock: 260,
    seed: 4646,
    tweaks: ['fixed 11,8', 'fixed 11,14'],
  },
  // 47 Checkered Past
  { field: 'checker', fixed: [['pillars', 4]], rugs: 3, traps: 4, yarn: 2, cats: 3, waves: 6, clock: 260, seed: 4747, tweaks: ['rug 4,4', 'trap 18,18'] },
  // 48 Full Moon
  { field: 'round', fixed: [['frame', 7], ['scatter', 3]], rugs: 4, traps: 3, yarn: 2, cats: 3, waves: 6, clock: 270, seed: 4848, tweaks: ['empty 11,5'] },
  // 49 Four Rugs Ago
  {
    field: 'quads',
    fixed: [['frame', 5], ['bars', 8]],
    rugs: 4,
    traps: 4,
    yarn: 2,
    cats: 3,
    waves: 6,
    clock: 270,
    seed: 4949,
    tweaks: ['rug 6,11', 'trap 16,11'],
  },
  // 50 The Den That Isn't
  {
    field: 'square',
    fixed: [['frame', 6], ['spokes', 5]],
    rugs: 4,
    traps: 4,
    yarn: 3,
    cats: 3,
    waves: 6,
    clock: 280,
    seed: 5052,
    tweaks: ['empty 11,5', 'empty 11,17'],
  },
]

// ── Layout expansion ────────────────────────────────────────────────────────────────────────────────────────────

const idx = (x: number, y: number) => y * SIZE + x
const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < SIZE && y < SIZE
const cheb = (ax: number, ay: number, bx: number, by: number) => Math.max(Math.abs(ax - bx), Math.abs(ay - by))

function inField(f: Field, r: number, dx: number, dy: number): boolean {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  const d = Math.max(ax, ay)
  if (d > r) return false
  switch (f) {
    case 'square':
      return true
    case 'round':
      return dx * dx + dy * dy <= r * r + r
    case 'diamond':
      return ax + ay <= r + 2
    case 'octagon':
      return ax + ay <= r + Math.floor(r / 2)
    case 'cross':
      return Math.min(ax, ay) <= 3 || d <= 3
    case 'quads':
      return Math.min(ax, ay) >= 2 || d <= 1
    case 'rings':
      return d % 4 !== 3
    case 'stripes':
      return ay % 4 !== 3
    case 'columns':
      return ax % 4 !== 3
    case 'checker':
      return d <= 2 || (ax + ay) % 2 === 0
    case 'twin':
      return ax !== 0 || ay <= 1
    case 'hollow':
      return d >= 2 || (ax + ay <= 1 && d <= 1)
  }
}

/** Immovables only ever replace field blocks, so the outer lane stays open and every pattern sits inside the field. */
function placeFixed(cells: Uint8Array, pattern: Fixed, n: number, r: number, rand: () => number) {
  const set = (dx: number, dy: number) => {
    const x = C + dx
    const y = C + dy
    if (cheb(x, y, C, C) >= 2 && cells[idx(x, y)] === Tile.Block) cells[idx(x, y)] = Tile.Fixed
  }
  const mirror = (dx: number, dy: number) => {
    set(dx, dy)
    set(-dx, dy)
    set(dx, -dy)
    set(-dx, -dy)
  }
  switch (pattern) {
    case 'scatter':
      // n mirrored quads at seeded spots on field blocks.
      for (let i = 0; i < n; i++) {
        for (let tries = 0; tries < 24; tries++) {
          const dx = 2 + Math.floor(rand() * (r - 1))
          const dy = Math.floor(rand() * (r + 1))
          if (cells[idx(C + dx, C + dy)] !== Tile.Block) continue
          mirror(dx, dy)
          break
        }
      }
      return
    case 'pillars':
      // A lattice every n cells, offset two cells off the axes so the mouse's eight lines stay pushable.
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) % n === 2 % n && Math.abs(dy) % n === 2 % n) set(dx, dy)
      }
      return
    case 'frame':
      // A square outline at distance n with doorways on the axes and diagonals.
      for (let k = -n; k <= n; k++) {
        if (Math.abs(k) <= 1 || Math.abs(k) === n) continue
        mirror(k, n)
        mirror(n, k)
      }
      return
    case 'spokes':
      // Diagonal spokes from distance 3 out to n.
      for (let k = 3; k <= n; k++) mirror(k, k)
      return
    case 'bars':
      // Horizontal bars at rows ±n, broken in the middle.
      for (let k = 2; k <= r - 1; k++) mirror(k, n)
      return
    case 'posts':
      // Posts on the axes at distance n and halfway.
      for (const k of [n, Math.ceil(n / 2)]) {
        mirror(k, 0)
        mirror(0, k)
      }
      return
    case 'corners':
      // L-shaped brackets at the field corners, arms of length n.
      for (let k = 0; k < n; k++) {
        mirror(r - k, r)
        mirror(r, r - k)
      }
      return
  }
}

function hazardSpot(cells: Uint8Array, rand: () => number, mouse: Point, placed: number[]): number {
  for (let tries = 0; tries < 400; tries++) {
    const x = 1 + Math.floor(rand() * (SIZE - 2))
    const y = 1 + Math.floor(rand() * (SIZE - 2))
    const d = cheb(x, y, C, C)
    if (d < 3 || cheb(x, y, mouse.x, mouse.y) < 3) continue
    const t = cells[idx(x, y)]
    if (t !== Tile.Empty && t !== Tile.Block) continue
    if (placed.some((p) => cheb(x, y, p % SIZE, Math.floor(p / SIZE)) < 3)) continue
    return idx(x, y)
  }
  return -1
}

/** First-wave cat slots on the edge lane, walked from a seeded offset: corners first, then midpoints, then thirds. */
const EDGE_SLOTS: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 22, y: 22 },
  { x: 22, y: 0 },
  { x: 0, y: 22 },
  { x: 11, y: 0 },
  { x: 11, y: 22 },
  { x: 0, y: 11 },
  { x: 22, y: 11 },
  { x: 5, y: 0 },
  { x: 17, y: 22 },
  { x: 22, y: 5 },
  { x: 0, y: 17 },
]

/** Tweak grammar: `<op> x,y` or `<op> x,y..x2,y2` (inclusive rectangle). Ops: block fixed empty rug trap cheese yarn cat mouse. */
const TWEAK = /^(block|fixed|empty|rug|trap|cheese|yarn|cat|mouse) (\d+),(\d+)(?:\.\.(\d+),(\d+))?$/
const TILE_OPS: Record<string, Tile> = { block: Tile.Block, fixed: Tile.Fixed, empty: Tile.Empty, rug: Tile.Rug, trap: Tile.Trap, cheese: Tile.Cheese }

function applyTweak(t: string, cells: Uint8Array, layout: { mouse: Point; cats: Point[]; yarn: Point[] }) {
  const m = TWEAK.exec(t)
  if (!m) throw new Error(`bad tweak: ${t}`)
  const x0 = Number(m[2])
  const y0 = Number(m[3])
  const x1 = m[4] === undefined ? x0 : Number(m[4])
  const y1 = m[5] === undefined ? y0 : Number(m[5])
  if (!inBounds(x0, y0) || !inBounds(x1, y1)) throw new Error(`tweak off board: ${t}`)
  const op = m[1]
  if (op === 'mouse') layout.mouse = { x: x0, y: y0 }
  else if (op === 'cat') layout.cats.push({ x: x0, y: y0 })
  else if (op === 'yarn') layout.yarn.push({ x: x0, y: y0 })
  else {
    const tile = TILE_OPS[op]
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) cells[idx(x, y)] = tile
  }
}

function expand(recipe: Recipe, number: number): LevelLayout {
  const rand = mulberry32(recipe.seed)
  const cells = new Uint8Array(SIZE * SIZE)
  const r = recipe.r ?? 9
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (inField(recipe.field, r, x - C, y - C)) cells[idx(x, y)] = Tile.Block
  for (const [pattern, n] of recipe.fixed ?? []) placeFixed(cells, pattern, n, r, rand)
  for (let i = 0; i < (recipe.holes ?? 0); i++) {
    const x = C - r + Math.floor(rand() * (r * 2 + 1))
    const y = C - r + Math.floor(rand() * (r * 2 + 1))
    if (cells[idx(x, y)] === Tile.Block && cheb(x, y, C, C) >= 2) cells[idx(x, y)] = Tile.Empty
  }

  const mouse = { x: C, y: C }
  const placed: number[] = []
  const hazards: [Tile, number][] = [
    [Tile.Rug, recipe.rugs ?? 0],
    [Tile.Trap, recipe.traps ?? 0],
  ]
  for (const [tile, count] of hazards) {
    for (let i = 0; i < count; i++) {
      const at = hazardSpot(cells, rand, mouse, placed)
      if (at < 0) throw new Error(`level ${number}: no room for hazard ${i + 1}`)
      cells[at] = tile
      placed.push(at)
    }
  }

  const cats: Point[] = []
  const offset = Math.floor(rand() * EDGE_SLOTS.length)
  for (let i = 0; i < recipe.cats; i++) cats.push({ ...EDGE_SLOTS[(offset + i) % EDGE_SLOTS.length] })
  const yarn: Point[] = []
  for (let i = 0; i < (recipe.yarn ?? 0); i++) {
    // Yarn starts on the inner lane ring, away from the corners and the cats.
    for (let tries = 0; tries < 200; tries++) {
      const side = Math.floor(rand() * 4)
      const k = 4 + Math.floor(rand() * (SIZE - 8))
      const p = side === 0 ? { x: k, y: 1 } : side === 1 ? { x: SIZE - 2, y: k } : side === 2 ? { x: k, y: SIZE - 2 } : { x: 1, y: k }
      if (cells[idx(p.x, p.y)] !== Tile.Empty) continue
      if (cats.some((c) => cheb(c.x, c.y, p.x, p.y) < 4) || yarn.some((q) => cheb(q.x, q.y, p.x, p.y) < 5)) continue
      yarn.push(p)
      break
    }
    if (yarn.length <= i) throw new Error(`level ${number}: no room for yarn ${i + 1}`)
  }

  const layout = { mouse, cats, yarn }
  const tweaks = recipe.tweaks ?? []
  for (const t of tweaks) applyTweak(t, cells, layout)
  cells[idx(layout.mouse.x, layout.mouse.y)] = Tile.Empty
  for (const p of [...layout.cats, ...layout.yarn]) cells[idx(p.x, p.y)] = Tile.Empty

  const waveTimes: number[] = []
  for (let k = 1; k <= recipe.waves; k++) waveTimes.push(Math.round((recipe.clock * k) / (recipe.waves + 1)))
  return { number, cells, mouse: layout.mouse, cats: layout.cats, yarn: layout.yarn, duration: recipe.clock, waveTimes, tweaks }
}

/** Expands level `level` (1-based; 51+ repeat the 50 layouts, invalid input → level 1). */
export function createLayout(level: number): LevelLayout {
  const n = Number.isFinite(level) && level >= 1 ? Math.floor(level) : 1
  return expand(RECIPES[(n - 1) % LEVEL_COUNT], n)
}

// ── Solvability ─────────────────────────────────────────────────────────────────────────────────────────────────

const DX = [0, 1, 1, 1, 0, -1, -1, -1]
const DY = [-1, -1, 0, 1, 1, 1, 0, -1]
/** Mouse actions per cat tick in the witness model: three moves per 650 ms Medium tick is a relaxed ~4.6 moves/s. */
const MOUSE_STEPS_PER_TICK = 3
/** Beam width and depth bound the search: at most BEAM × MAX_DEPTH × 9 simulated actions per layout. */
const BEAM = 160
const MAX_DEPTH = 360
/** Witnesses must include at least this many pushes, so an opening solved by standing still does not count. */
const MIN_PUSHES = 2

type Node = {
  cells: Uint8Array
  z1: number
  z2: number
  mouse: number
  cats: number[]
  phase: number
  tick: number
  pushes: number
  parent: Node | null
}

const zRand = mulberry32(0x7e5e)
const Z1 = Int32Array.from({ length: SIZE * SIZE }, () => (zRand() * 0x100000000) | 0)
const Z2 = Int32Array.from({ length: SIZE * SIZE }, () => (zRand() * 0x100000000) | 0)

const catWalkable = (t: number) => t === Tile.Empty || t === Tile.Cheese

function catOpen(cells: Uint8Array, cats: number[], at: number): number {
  const x = at % SIZE
  const y = (at - x) / SIZE
  let open = 0
  for (let d = 0; d < 8; d++) {
    const nx = x + DX[d]
    const ny = y + DY[d]
    if (!inBounds(nx, ny)) continue
    const n = idx(nx, ny)
    if (catWalkable(cells[n]) && !cats.includes(n)) open++
  }
  return open
}

/** Deterministic stand-in for the engine's random sidestep. */
function sidestepHash(tick: number, cat: number, at: number): number {
  let h = Math.imul(tick + 1, 0x9e3779b1) ^ Math.imul(cat + 7, 0x85ebca6b) ^ Math.imul(at + 13, 0xc2b2ae35)
  h ^= h >>> 15
  return h >>> 0
}

/** One cat step toward the mouse; returns the new cell (unchanged when trapped). */
function catStep(cells: Uint8Array, cats: number[], i: number, mouse: number, tick: number): number {
  const at = cats[i]
  const x = at % SIZE
  const y = (at - x) / SIZE
  const mx = mouse % SIZE
  const my = (mouse - mx) / SIZE
  const here = (x - mx) ** 2 + (y - my) ** 2
  let best = -1
  let bestD = here
  const legal: number[] = []
  for (let d = 0; d < 8; d++) {
    const nx = x + DX[d]
    const ny = y + DY[d]
    if (!inBounds(nx, ny)) continue
    const n = idx(nx, ny)
    if (!catWalkable(cells[n]) || cats.includes(n)) continue
    legal.push(n)
    const nd = (nx - mx) ** 2 + (ny - my) ** 2
    if (nd < bestD) {
      bestD = nd
      best = n
    }
  }
  if (best >= 0) return best
  if (!legal.length) return at
  return legal[sidestepHash(tick, i, at) % legal.length]
}

/** Applies one mouse action (0–7 move/push, 8 wait) and, every few actions, a cat tick. Null = illegal or caught. */
function advance(node: Node, action: number): Node | null {
  let { cells, z1, z2, mouse, pushes } = node
  if (action < 8) {
    const x = mouse % SIZE
    const y = (mouse - x) / SIZE
    const tx = x + DX[action]
    const ty = y + DY[action]
    if (!inBounds(tx, ty)) return null
    const t = idx(tx, ty)
    if (node.cats.includes(t)) return null
    const tile = cells[t]
    if (tile === Tile.Block) {
      let ex = tx
      let ey = ty
      while (inBounds(ex, ey) && cells[idx(ex, ey)] === Tile.Block) {
        ex += DX[action]
        ey += DY[action]
      }
      if (!inBounds(ex, ey)) return null
      const e = idx(ex, ey)
      if (cells[e] !== Tile.Empty || node.cats.includes(e)) return null
      cells = cells.slice()
      cells[t] = Tile.Empty
      cells[e] = Tile.Block
      z1 ^= Z1[t] ^ Z1[e]
      z2 ^= Z2[t] ^ Z2[e]
      pushes++
    } else if (!catWalkable(tile)) return null
    mouse = t
  }
  let { phase, tick } = node
  let cats = node.cats
  phase++
  if (phase === MOUSE_STEPS_PER_TICK) {
    phase = 0
    tick++
    cats = cats.slice()
    for (let i = 0; i < cats.length; i++) {
      cats[i] = catStep(cells, cats, i, mouse, tick)
      if (cats[i] === mouse) return null
    }
  }
  return { cells, z1, z2, mouse, cats, phase, tick, pushes, parent: node }
}

function nodeKey(n: Node): number {
  let h = n.z1 ^ Math.imul(n.mouse + 1, 0x27d4eb2d) ^ n.phase
  let g = n.z2 ^ Math.imul(n.mouse + 3, 0x165667b1)
  const sorted = n.cats.length > 1 ? [...n.cats].sort((a, b) => a - b) : n.cats
  for (const c of sorted) {
    h = Math.imul(h ^ c, 0x85ebca6b) ^ (h >>> 13)
    g = Math.imul(g ^ (c + 101), 0xc2b2ae35) ^ (g >>> 16)
  }
  return (h >>> 0) * 0x200000 + ((g >>> 0) & 0x1fffff)
}

/**
 * Beam rank, lower is better; −Infinity when every cat is trapped. Trapped cats dominate, then the nearest free cat's
 * open neighbours and distance (focusing one cat at a time beats summing over all of them), with a small penalty for
 * standing next to a free cat.
 */
function rank(n: Node): number {
  const mx = n.mouse % SIZE
  const my = (n.mouse - mx) / SIZE
  let trapped = 0
  let target = Number.POSITIVE_INFINITY
  for (const c of n.cats) {
    const open = catOpen(n.cells, n.cats, c)
    if (open === 0) {
      trapped++
      continue
    }
    const cx = c % SIZE
    const d = cheb(cx, (c - cx) / SIZE, mx, my)
    target = Math.min(target, open * 10 + d * 3 + (d <= 1 ? 5 : 0))
  }
  return trapped === n.cats.length ? Number.NEGATIVE_INFINITY : target - trapped * 1000
}

function rootNode(layout: LevelLayout): Node {
  const cells = layout.cells.slice()
  let z1 = 0
  let z2 = 0
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== Tile.Block) continue
    z1 ^= Z1[i]
    z2 ^= Z2[i]
  }
  const cats = layout.cats.map((p) => idx(p.x, p.y))
  return { cells, z1, z2, mouse: idx(layout.mouse.x, layout.mouse.y), cats, phase: 0, tick: 0, pushes: 0, parent: null }
}

function search(root: Node): Node | null {
  const seen = new Set<number>([nodeKey(root)])
  let layer = [root]
  for (let depth = 0; depth < MAX_DEPTH && layer.length; depth++) {
    const next: { node: Node; s: number }[] = []
    for (const node of layer) {
      for (let a = 0; a < 9; a++) {
        const child = advance(node, a)
        if (!child) continue
        const key = nodeKey(child)
        if (seen.has(key)) continue
        seen.add(key)
        const s = rank(child)
        if (s === Number.NEGATIVE_INFINITY && child.pushes >= MIN_PUSHES) return child
        next.push({ node: child, s })
      }
    }
    next.sort((a, b) => a.s - b.s)
    layer = next.slice(0, BEAM).map((e) => e.node)
  }
  return null
}

/**
 * Checks a layout and searches for a first-wave trap witness.
 *
 * Static checks: tile values; a safe Empty mouse start at least 6 cells from every cat with a legal first move; cats
 * on distinct Empty edge cells, not already trapped; yarn on Empty cells with room to roll; no hazard on the edge
 * lane; at least 3 free, open edge spawn cells per side for later waves; ascending wave marks inside the clock.
 *
 * Witness: a bounded beam breadth-first search over full game states (mouse cell, every block, every cat) using the
 * real push rule (a contiguous line moves only into an Empty, cat-free end cell; fixed blocks, hazards and the board
 * edge stop it) and a reference cat model (one cat tick per three mouse actions; each cat takes the step that most
 * reduces its squared distance to the mouse, else a hashed pseudo-random legal step; rugs, traps, blocks and other cats
 * are impassable; stepping onto the mouse catches it). The mouse avoids rugs and traps. Success means every first-wave
 * cat has no legal step at once, reached by at least one push. Yarn and later waves are not simulated: this proves the
 * opening is trappable under the reference model, not that every random cat path is.
 * @returns `witness` = mouse cells from the start to the trapping move (a repeated cell is a wait).
 */
export function validateLayout(layout: LevelLayout): { solvable: boolean; reason?: string; witness?: Point[] } {
  const fail = (reason: string) => ({ solvable: false, reason })
  const { cells, mouse, cats, yarn } = layout
  if (cells.length !== SIZE * SIZE) return fail('cells must be SIZE × SIZE')
  for (const t of cells) if (t > Tile.Cheese) return fail(`unknown tile ${t}`)
  const at = (p: Point) => cells[idx(p.x, p.y)]
  if (!inBounds(mouse.x, mouse.y) || at(mouse) !== Tile.Empty) return fail('mouse must start on an empty cell')
  for (let d = 0; d < 8; d++) {
    const t = cells[idx(Math.min(SIZE - 1, Math.max(0, mouse.x + DX[d])), Math.min(SIZE - 1, Math.max(0, mouse.y + DY[d])))]
    if (t === Tile.Rug || t === Tile.Trap) return fail('the mouse must not start next to a hazard')
  }
  if (!cats.length) return fail('no first-wave cats')
  const catCells = new Set<number>()
  for (const c of cats) {
    if (!inBounds(c.x, c.y) || (c.x % (SIZE - 1) !== 0 && c.y % (SIZE - 1) !== 0)) return fail(`cat ${c.x},${c.y} must start on the edge lane`)
    if (at(c) !== Tile.Empty) return fail(`cat ${c.x},${c.y} must start on an empty cell`)
    if (catCells.has(idx(c.x, c.y))) return fail(`two cats share ${c.x},${c.y}`)
    catCells.add(idx(c.x, c.y))
    if (cheb(c.x, c.y, mouse.x, mouse.y) < 6) return fail(`cat ${c.x},${c.y} starts too close to the mouse`)
  }
  const catList = [...catCells]
  for (const c of catList) if (catOpen(cells, catList, c) === 0) return fail('a cat starts trapped')
  for (const y of yarn) {
    if (!inBounds(y.x, y.y) || at(y) !== Tile.Empty) return fail(`yarn ${y.x},${y.y} must start on an empty cell`)
    if (cheb(y.x, y.y, mouse.x, mouse.y) < 6) return fail(`yarn ${y.x},${y.y} starts too close to the mouse`)
    let rolls = false
    for (const d of [1, 3, 5, 7]) {
      const nx = y.x + DX[d]
      const ny = y.y + DY[d]
      if (inBounds(nx, ny) && cells[idx(nx, ny)] === Tile.Empty) rolls = true
    }
    if (!rolls) return fail(`yarn ${y.x},${y.y} has no room to roll`)
  }
  const sides = [0, 0, 0, 0]
  for (let k = 0; k < SIZE; k++) {
    const ring = [
      [k, 0, 0],
      [SIZE - 1, k, 1],
      [k, SIZE - 1, 2],
      [0, k, 3],
    ]
    for (const [x, y, side] of ring) {
      const t = cells[idx(x, y)]
      if (t === Tile.Rug || t === Tile.Trap) return fail(`hazard on the edge lane at ${x},${y}`)
      if (t === Tile.Empty && cheb(x, y, mouse.x, mouse.y) >= 6 && catOpen(cells, [], idx(x, y)) >= 2) sides[side]++
    }
  }
  if (sides.some((n) => n < 3)) return fail('each edge needs at least 3 free wave spawn cells')
  if (!(layout.duration > 0)) return fail('duration must be positive')
  let last = 0
  for (const t of layout.waveTimes) {
    if (!(t > last && t < layout.duration)) return fail('wave marks must ascend inside the clock')
    last = t
  }
  const root = rootNode(layout)
  if (!DX.some((_, d) => advance(root, d))) return fail('the mouse has no legal first move')

  const goal = search(root)
  if (!goal) return fail(`no first-wave trap found within ${MAX_DEPTH} actions (beam ${BEAM})`)
  const witness: Point[] = []
  for (let n: Node | null = goal; n; n = n.parent) witness.push({ x: n.mouse % SIZE, y: Math.floor(n.mouse / SIZE) })
  witness.reverse()
  return { solvable: true, witness }
}
