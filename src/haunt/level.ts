/**
 * The haunted Remy mansion: gallery, ballroom, foyer, crypt, library and the graveyard courtyard. Built by carving
 * rooms out of solid brick, then dressing walls by the room they face. Also owns the tile light map and the BFS flow
 * field the monsters follow to the player.
 */
import { FLOOR, WALL } from './gfx'

export const MW = 32
export const MH = 32

export type PropKind = 'tomb' | 'candle' | 'jack'
export interface Prop {
  x: number
  y: number
  kind: PropKind
  variant: number
  /** Jack-o'-lanterns explode when shot. */
  hp: number
  /** Light colour, if any. */
  light?: [number, number, number, number]
}

export type SpotKind = 'boomstick' | 'rush' | 'launcher' | 'supply'
export interface Spot {
  x: number
  y: number
  kind: SpotKind
}

export interface Level {
  wall: Uint8Array
  floor: Uint8Array
  outdoor: Uint8Array
  /** Blocks movement: walls plus tombstones and lanterns. */
  solid: Uint8Array
  props: Prop[]
  spawns: { x: number; y: number }[]
  spots: Spot[]
  start: { x: number; y: number; a: number }
  /** Ambient + occluded static lights, RGB per tile. */
  baseLight: Float32Array
}

type Region = 'gallery' | 'ballroom' | 'foyer' | 'crypt' | 'library' | 'yard' | 'none'

export function buildLevel(): Level {
  const n = MW * MH
  const wall = new Uint8Array(n).fill(WALL.BRICK)
  const floor = new Uint8Array(n)
  const outdoor = new Uint8Array(n)
  const region: Region[] = new Array(n).fill('none')
  const carve = (x0: number, y0: number, x1: number, y1: number, f: number, r: Region, out = 0) => {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = y * MW + x
        wall[i] = 0
        floor[i] = f
        region[i] = r
        outdoor[i] = out
      }
  }
  const block = (x0: number, y0: number, x1: number, y1: number, w: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) wall[y * MW + x] = w
  }

  carve(1, 1, 14, 9, FLOOR.PLANKS, 'gallery')
  carve(2, 4, 13, 6, FLOOR.CARPET, 'gallery')
  carve(16, 1, 30, 9, FLOOR.CHECKER, 'ballroom')
  carve(9, 11, 22, 14, FLOOR.PLANKS, 'foyer')
  carve(15, 11, 16, 14, FLOOR.CARPET, 'foyer')
  carve(1, 11, 7, 18, FLOOR.CRYPT, 'crypt')
  carve(24, 11, 30, 18, FLOOR.PLANKS, 'library')
  carve(1, 20, 30, 30, FLOOR.GRASS, 'yard', 1)
  carve(15, 15, 16, 30, FLOOR.DIRT, 'yard', 1)
  carve(1, 25, 30, 25, FLOOR.DIRT, 'yard', 1)
  // Doorways.
  carve(15, 3, 15, 3, FLOOR.PLANKS, 'gallery')
  carve(15, 7, 15, 7, FLOOR.PLANKS, 'gallery')
  carve(11, 10, 12, 10, FLOOR.PLANKS, 'foyer')
  carve(19, 10, 20, 10, FLOOR.PLANKS, 'foyer')
  carve(8, 12, 8, 13, FLOOR.CRYPT, 'crypt')
  carve(23, 12, 23, 13, FLOOR.PLANKS, 'library')
  carve(4, 19, 4, 19, FLOOR.CRYPT, 'crypt')
  carve(27, 19, 27, 19, FLOOR.PLANKS, 'library')
  // Cover: ballroom pillars, library shelves, crypt sarcophagi, yard hedges.
  for (const [x, y] of [
    [19, 3],
    [27, 3],
    [19, 7],
    [27, 7],
  ])
    block(x, y, x, y, WALL.WOOD)
  block(26, 13, 28, 13, WALL.WOOD)
  block(26, 16, 28, 16, WALL.WOOD)
  block(3, 14, 3, 15, WALL.STONE)
  block(5, 14, 5, 15, WALL.STONE)
  for (const [x0, y0, x1, y1] of [
    [5, 22, 6, 22],
    [25, 22, 26, 22],
    [5, 28, 6, 28],
    [25, 28, 26, 28],
    [10, 27, 10, 28],
    [21, 27, 21, 28],
  ])
    block(x0, y0, x1, y1, WALL.HEDGE)

  // Dress each wall by the rooms it faces.
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++) {
      const i = y * MW + x
      if (wall[i] !== WALL.BRICK) continue
      const faces = new Set<Region>()
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && ny >= 0 && nx < MW && ny < MH && !wall[ny * MW + nx]) faces.add(region[ny * MW + nx])
      }
      if (faces.has('yard')) wall[i] = y >= 20 || x === 0 || x === MW - 1 ? WALL.HEDGE : (x * 7 + y) % 3 ? WALL.WINDOW : WALL.BRICK
      else if (faces.has('gallery')) wall[i] = WALL.PORTRAIT
      else if (faces.has('crypt')) wall[i] = WALL.STONE
      else if (faces.has('ballroom') || faces.has('library')) wall[i] = WALL.WOOD
    }

  const props: Prop[] = []
  const tombs = [
    [3, 21],
    [8, 21],
    [12, 22],
    [19, 22],
    [23, 21],
    [28, 21],
    [3, 27],
    [12, 29],
    [19, 29],
    [28, 27],
    [8, 29],
    [23, 29],
  ]
  tombs.forEach(([x, y], v) => props.push({ x: x + 0.5, y: y + 0.5, kind: 'tomb', variant: v, hp: 0 }))
  for (const [x, y] of [
    [9, 11],
    [22, 11],
    [14, 21],
    [17, 21],
    [14, 30],
    [17, 30],
    [1, 20],
    [30, 20],
    [13, 1],
  ])
    props.push({ x: x + 0.5, y: y + 0.5, kind: 'jack', variant: 0, hp: 20, light: [1.3, 0.62, 0.16, 4.5] })
  for (const [x, y, green] of [
    [4, 2, 0],
    [10, 2, 0],
    [4, 8, 0],
    [10, 8, 0],
    [23, 2, 0],
    [23, 8, 0],
    [29, 12, 0],
    [29, 17, 0],
    [2, 12, 1],
    [6, 17, 1],
    [12, 14, 0],
    [19, 14, 0],
  ])
    props.push({
      x: x + 0.5,
      y: y + 0.5,
      kind: 'candle',
      variant: 0,
      hp: 0,
      light: green ? [0.35, 1.1, 0.45, 5] : [1.15, 0.78, 0.4, 5],
    })

  const solid = new Uint8Array(n)
  for (let i = 0; i < n; i++) solid[i] = wall[i] ? 1 : 0
  for (const p of props) if (p.kind !== 'candle') solid[Math.floor(p.y) * MW + Math.floor(p.x)] = 1

  const spawns = [
    ...tombs.map(([x, y]) => ({ x: x + 0.5, y: y + 1.5 })),
    { x: 2.5, y: 17.5 },
    { x: 6.5, y: 11.5 },
    { x: 29.5, y: 1.5 },
    { x: 29.5, y: 9.5 },
    { x: 2.5, y: 1.5 },
    { x: 13.5, y: 8.5 },
    { x: 29.5, y: 15.5 },
  ].filter((s) => !solid[Math.floor(s.y) * MW + Math.floor(s.x)])

  const level: Level = {
    wall,
    floor,
    outdoor,
    solid,
    props,
    spawns,
    spots: [
      { x: 7.5, y: 5.5, kind: 'boomstick' },
      { x: 4.5, y: 16.5, kind: 'rush' },
      { x: 15.5, y: 25.5, kind: 'launcher' },
      { x: 12.5, y: 12.5, kind: 'supply' },
      { x: 19.5, y: 12.5, kind: 'supply' },
      { x: 25.5, y: 14.5, kind: 'supply' },
      { x: 8.5, y: 25.5, kind: 'supply' },
      { x: 23.5, y: 25.5, kind: 'supply' },
      { x: 23.5, y: 5.5, kind: 'supply' },
      { x: 2.5, y: 12.5, kind: 'supply' },
    ],
    start: { x: 15.5, y: 12.5, a: Math.PI / 2 },
    baseLight: new Float32Array(n * 3),
  }
  bakeLight(level)
  return level
}

/** Clear line between two points through `grid` (walls by default: props don't block sight, but do block bodies). */
export function sight(level: Level, ax: number, ay: number, bx: number, by: number, grid = level.wall): boolean {
  const dx = bx - ax
  const dy = by - ay
  const steps = Math.ceil(Math.hypot(dx, dy) * 4)
  for (let s = 1; s < steps; s++) {
    const x = Math.floor(ax + (dx * s) / steps)
    const y = Math.floor(ay + (dy * s) / steps)
    if (grid[y * MW + x]) return false
  }
  return true
}

/** Ambient per region plus every live prop light, occluded by walls. Re-run when a lantern is destroyed. */
export function bakeLight(level: Level) {
  const L = level.baseLight
  for (let i = 0; i < MW * MH; i++) {
    const out = level.outdoor[i]
    const crypt = level.floor[i] === FLOOR.CRYPT
    L[i * 3] = out ? 0.2 : crypt ? 0.05 : 0.11
    L[i * 3 + 1] = out ? 0.23 : crypt ? 0.1 : 0.07
    L[i * 3 + 2] = out ? 0.4 : crypt ? 0.08 : 0.13
  }
  // Walls take the light of the open tiles they face, so faces are lit from the room side.
  for (const p of level.props) {
    if (!p.light || p.hp < 0) continue
    const [r, g, b, rad] = p.light
    for (let y = Math.max(0, Math.floor(p.y - rad)); y <= Math.min(MH - 1, Math.ceil(p.y + rad)); y++)
      for (let x = Math.max(0, Math.floor(p.x - rad)); x <= Math.min(MW - 1, Math.ceil(p.x + rad)); x++) {
        const d2 = (x + 0.5 - p.x) ** 2 + (y + 0.5 - p.y) ** 2
        if (d2 >= rad * rad) continue
        if (level.wall[y * MW + x] || !sight(level, p.x, p.y, x + 0.5, y + 0.5)) continue
        const k = (1 - d2 / (rad * rad)) ** 2
        const i = (y * MW + x) * 3
        L[i] += r * k
        L[i + 1] += g * k
        L[i + 2] += b * k
      }
  }
}

export interface DynLight {
  x: number
  y: number
  r: number
  g: number
  b: number
  rad: number
}

/** Frame light map = baked light × flicker + lightning on outdoor tiles + unoccluded dynamic lights. */
export function frameLight(level: Level, out: Float32Array, flicker: number, lightning: number, lights: DynLight[]) {
  const B = level.baseLight
  for (let i = 0; i < MW * MH; i++) {
    const f = level.outdoor[i] ? lightning : 0
    out[i * 3] = B[i * 3] * flicker + f * 0.9
    out[i * 3 + 1] = B[i * 3 + 1] * flicker + f * 0.95
    out[i * 3 + 2] = B[i * 3 + 2] * flicker + f * 1.2
  }
  for (const l of lights) {
    const rad = l.rad
    for (let y = Math.max(0, Math.floor(l.y - rad)); y <= Math.min(MH - 1, Math.ceil(l.y + rad)); y++)
      for (let x = Math.max(0, Math.floor(l.x - rad)); x <= Math.min(MW - 1, Math.ceil(l.x + rad)); x++) {
        const d2 = (x + 0.5 - l.x) ** 2 + (y + 0.5 - l.y) ** 2
        if (d2 >= rad * rad) continue
        const k = (1 - d2 / (rad * rad)) ** 2
        const i = (y * MW + x) * 3
        out[i] += l.r * k
        out[i + 1] += l.g * k
        out[i + 2] += l.b * k
      }
  }
}

/** Steps to the player from every reachable tile (8-way, no corner cutting); 0xffff = unreachable. */
export function flowField(level: Level, px: number, py: number, out: Uint16Array) {
  out.fill(0xffff)
  const start = Math.floor(py) * MW + Math.floor(px)
  const queue = new Int32Array(MW * MH)
  let head = 0
  let tail = 0
  out[start] = 0
  queue[tail++] = start
  while (head < tail) {
    const i = queue[head++]
    const x = i % MW
    const y = (i / MW) | 0
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue
        const j = ny * MW + nx
        if (level.solid[j] || out[j] !== 0xffff) continue
        if (dx && dy && (level.solid[y * MW + nx] || level.solid[ny * MW + x])) continue
        out[j] = out[i] + 1
        queue[tail++] = j
      }
  }
}
