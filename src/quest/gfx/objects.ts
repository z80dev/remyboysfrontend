/**
 * Buildings + decor, drawn procedurally into cached sprites. Each sprite is positioned relative to the object's
 * footprint top-left; rows above the footprint (negative `oy`) are the overhang that also goes into the `above` layer.
 * Every sprite casts a stepped drop shadow down-right, so canvases reach a few px past the footprint.
 * `drawObjectAnim` adds the cheap per-frame bits (lit windows, neon, opening doors, tickers, water) and reports lights.
 */
import { art } from '../art'
import type { MapObject, ObjKind, Theme } from '../types'
import { sky } from './daylight'
import {
  BRICK,
  CREAM,
  GOLD,
  IRON,
  LIT,
  METAL,
  MOSS,
  SH,
  SH2,
  SHC,
  STONE,
  TEAL,
  WHITEWALL,
  WOOD,
  bakeWindows,
  drawDoorOpen,
  drawFacade,
  finish,
  flowerBox,
  frame,
  litGlass,
  neon,
  pane,
  win,
} from './facade'
import { BASE, OUT, PALS } from './palette'
import { type Col, Px, css, hash, hex, mix, pack, ramp, shade, stamp, text, textWidth, withAlpha } from './px'
import { bagScanner, bridgeGate, departureBoard, drawTerminalAnim, gateVariant, terminal } from './terminal'

/** Window pane rect (sprite px) + mullion layout; `lit`/`tv` are its baked night views. */
export interface Win {
  x: number
  y: number
  w: number
  h: number
  /** Vertical mullion count. */
  mx?: number
  my?: boolean
  cur?: Col
  /** Offices / labs: cool light, always occupied. */
  cool?: boolean
  fc?: Col
  lit?: HTMLCanvasElement
  tv?: HTMLCanvasElement
}

/** Door leaf rect (sprite px) and how it opens. */
export interface Door {
  x: number
  y: number
  w: number
  h: number
  style: 'wood' | 'glass' | 'arch'
}

/** A baked night overlay at sprite px (x, y) that also emits light. */
export interface Neon {
  x: number
  y: number
  w: number
  h: number
  img: HTMLCanvasElement
  rgb: string
  /** Light strength at full night (default 0.55). */
  a?: number
}

export interface ObjSprite {
  img: HTMLCanvasElement
  /** Sprite offset from footprint top-left in px (ox ≤ 0, oy ≤ 0 = overhang). */
  ox: number
  oy: number
  wins?: Win[]
  door?: Door
  /** Top-left of 3×3 lamp glasses that light up at night. */
  lamps?: [number, number][]
  /** Flickering neon tubes (night). */
  neon?: Neon[]
  /** Steady lit glazing (night). */
  glow?: Neon[]
  /** Marquee bulbs, chased every frame. */
  bulbs?: [number, number][]
  smoke?: [number, number]
}

/** A light source in view space. `a` = strength at full night (see the lighting pass in ambient.ts). */
export interface Light {
  x: number
  y: number
  r: number
  rgb: string
  a: number
}

/** Building doors currently swinging open → world clock time the opening started (set by the overworld runtime). */
export const openDoors = new Map<MapObject, number>()

const H = hex
const OBS = [H('#07040e'), H('#150f24'), H('#241a3a'), H('#3a2d58'), H('#5e4a8a')]
const PURP = [H('#5a1a9a'), H('#9a3ae8'), H('#c070ff'), H('#e6b8ff'), H('#fff0ff')]
const RUG = [H('#4a0a14'), H('#8a1422'), H('#c42032'), H('#e84a52'), H('#ff8a80')]
const GREENC = [H('#0a3a1e'), H('#15803d'), H('#22c55e'), H('#6ee7a0'), H('#c8ffe0')]
const REDC = [H('#4a0a0e'), H('#b91c1c'), H('#ef4444'), H('#fb8a8a'), H('#ffd8d8')]
const MARBLE = [H('#8a8078'), H('#b8aea4'), H('#dcd4c8'), H('#f0eae0'), H('#fffcf4')]
const CLAY = [H('#4a1a0c'), H('#8a3a1e'), H('#b8562e'), H('#dc7a48'), H('#f4a070')]
const WHITE = H('#ffffff')
const GLASS_DAY = H('#cfd6e6')

const ROOFS = ['#d9463b', '#3a6fd6', '#3b9a58', '#8b5bc8', '#e4843a', '#1fa3a3'].map((c) => H(c))
const CURTAINS = ['#f08a9a', '#f4d06a', '#8ac4f0', '#c4a0f0', '#f4a86a', '#9adcb0'].map((c) => H(c))
const BLOOMS = [H('#ff5a6a'), H('#ffd84a'), H('#ffffff'), H('#ff9ad2')]

// ---------------------------------------------------------------------------------------------------------------
// Shared building parts

/** Shingle roof between rows y0..y1: staggered courses, ridge cap, lit left hip, weathered tiles and eave moss. */
function shingleRoof(p: Px, x0: number, x1: number, y0: number, y1: number, rc: Col[], taper: number, ridgeRows: number, seed: number): void {
  const span = y1 - y0
  for (let y = y0; y <= y1; y++) {
    const k = y - y0
    const inset = k < ridgeRows ? Math.round((ridgeRows - k) * taper) : 0
    const r = k % 4
    const row = k >> 2
    const off = row % 2 ? 3 : 0
    const left = x0 + inset
    const right = x1 - inset
    for (let x = left; x <= right; x++) {
      const u = (x - left) / Math.max(1, right - left)
      const tile = hash(Math.floor((x + off) / 6), row, seed)
      let t = 2
      if (r === 0) t = 3
      else if (r === 3) t = 1
      else if ((x + off) % 6 === 0) t = 1
      else if ((x + off) % 6 === 1 && r === 1) t = 3
      if (tile < 0.07 && t > 1) t--
      else if (tile > 0.95 && t < 4 && r !== 3) t++
      if (k / span > 0.72 && t > 1) t--
      if (u < 0.07) t = Math.min(4, t + 1)
      else if (u > 0.93) t = Math.max(0, t - 1)
      let c = rc[t]
      // moss creeps along the lower courses, thickest in the shingle gaps
      if (k / span > 0.45 && tile > 0.1 && tile < 0.17 && r >= 2) c = MOSS[r === 3 ? 0 : hash(x, y, seed) < 0.5 ? 1 : 2]
      if (k === 0) c = rc[4]
      else if (k === 1) c = (x & 3) === 0 ? rc[2] : rc[3]
      p.set(x, y, c)
    }
  }
}

/** Eave: lip, fascia board, metal gutter with brackets, then a three-step occlusion shadow onto the wall below. */
function eave(p: Px, x0: number, x1: number, y: number, lip: Col, under: Col, wx0: number, wx1: number): void {
  const w = x1 - x0 + 1
  p.hl(x0, y, w, lip)
  p.hl(x0, y + 1, w, under)
  p.hl(x0 + 1, y + 2, w - 2, WHITEWALL[3])
  for (let x = x0; x <= x1; x++) {
    p.set(x, y + 3, (x - x0) % 12 === 6 ? METAL[1] : x === x0 ? METAL[4] : METAL[3])
    p.set(x, y + 4, METAL[1])
  }
  const ww = wx1 - wx0 + 1
  p.hl(wx0, y + 5, ww, withAlpha(SHC, 96))
  p.hl(wx0, y + 6, ww, withAlpha(SHC, 56))
  p.hl(wx0, y + 7, ww, withAlpha(SHC, 26))
}

function downspout(p: Px, x: number, y0: number, y1: number): void {
  p.vl(x, y0, y1 - y0, METAL[3])
  p.vl(x + 1, y0, y1 - y0, METAL[1])
  for (let y = y0 + 6; y < y1 - 2; y += 10) p.hl(x - 1, y, 3, METAL[0])
  p.hl(x, y1, 3, METAL[2])
  p.hl(x, y1 + 1, 3, METAL[1])
}

function woodLeaf(p: Px, D: Door): void {
  const { x, y, w, h } = D
  p.rect(x, y, w, h, WOOD[2])
  p.vl(x, y, h, WOOD[3])
  p.vl(x + w - 1, y, h, WOOD[1])
  p.rect(x + 2, y + 2, w - 4, 4, WOOD[1])
  pane(p, x + 3, y + 3, w - 6, 2)
  const ph = (h - 10) >> 1
  for (const py of [y + 7, y + 8 + ph]) {
    frame(p, x + 2, py, w - 4, ph, WOOD[1])
    p.hl(x + 3, py + ph - 1, w - 6, WOOD[3])
  }
  p.set(x + w - 3, y + (h >> 1) + 1, GOLD[4])
  p.set(x + w - 3, y + (h >> 1) + 2, GOLD[1])
  p.hl(x, y, w, withAlpha(SHC, 90))
}

/** Double sliding glass door; the pane is sky so it lights up with the facade at night. */
function glassLeaves(p: Px, D: Door, fc: Col): void {
  const { x, y, w, h } = D
  p.rect(x - 2, y - 2, w + 4, h + 2, OUT)
  p.rect(x - 1, y - 1, w + 2, h + 1, fc)
  const half = w >> 1
  pane(p, x, y, half, h)
  pane(p, x + half, y, w - half, h)
  frame(p, x, y, half, h, fc)
  frame(p, x + half, y, w - half, h, fc)
  p.vl(x + half - 1, y + 1, h - 2, OUT)
  p.hl(x + half - 4, y + (h >> 1), 2, METAL[4])
  p.hl(x + half + 2, y + (h >> 1), 2, METAL[4])
  p.hl(x, y + h - 1, w, METAL[1])
}

function wallLamp(p: Px, x: number, y: number): void {
  p.set(x - 1, y + 1, IRON[1])
  p.hl(x, y - 1, 3, IRON[2])
  p.set(x + 1, y - 2, IRON[3])
  p.rect(x, y, 3, 3, GLASS_DAY)
  p.set(x + 1, y, WHITE)
  p.hl(x, y + 3, 3, IRON[1])
}

function acUnit(p: Px, x: number, y: number): void {
  p.rect(x, y, 11, 7, METAL[3])
  p.hl(x, y, 11, METAL[4])
  p.vl(x + 10, y, 7, METAL[1])
  p.hl(x, y + 6, 11, METAL[1])
  p.ellipse(x + 3.5, y + 3.5, 2.5, 2.5, IRON[2])
  p.set(x + 3, y + 3, IRON[4])
  for (let j = 1; j < 6; j += 2) p.hl(x + 7, y + j, 3, METAL[1])
}

function sprite(p: Px, ox: number, oy: number): ObjSprite {
  return { img: p.toCanvas(), ox, oy }
}

// ---------------------------------------------------------------------------------------------------------------
// Buildings

function house(variant: number): ObjSprite {
  const b = new Px(64, 64)
  const rc = ramp(ROOFS[variant % ROOFS.length])
  const cur = CURTAINS[variant % CURTAINS.length]
  const wall = CREAM
  // lap siding: each board lit on top, shadowed beneath, staggered butt joints, grime splashed up from the ground
  for (let y = 34; y < 58; y++)
    for (let x = 3; x <= 60; x++) {
      const k = (y - 34) % 4
      let c = k === 0 ? wall[3] : k === 3 ? wall[1] : wall[2]
      if (k > 0 && (x + ((y - 34) >> 2) * 11) % 23 === 0) c = wall[1]
      if (y > 53 && hash(x, y, 9) < 0.2) c = mix(c, wall[1], 0.6)
      b.set(x, y, c)
    }
  b.vl(3, 34, 24, wall[4])
  b.vl(4, 34, 24, wall[3])
  b.vl(59, 34, 24, wall[1])
  b.vl(60, 34, 24, wall[0])
  // fieldstone footing
  for (let y = 58; y < 64; y++)
    for (let x = 3; x <= 60; x++) {
      const course = y < 61 ? 0 : 1
      const sx = x + course * 4
      const tone = hash(sx >> 3, course, 17)
      let c = tone < 0.35 ? STONE[2] : STONE[3]
      if (y === 58) c = STONE[4]
      else if (y === 61 || sx % 8 === 0) c = STONE[1]
      else if (y === 59 || y === 62) c = shade(c, 0.15)
      if (y === 63) c = STONE[1]
      b.set(x, y, c)
    }
  shingleRoof(b, 1, 62, 3, 31, rc, 0.55, 10, variant)
  eave(b, 1, 62, 32, rc[4], rc[0], 3, 60)
  downspout(b, 61, 37, 60)
  // brick chimney with stone cap and lead flashing
  for (let y = 3; y < 13; y++)
    for (let x = 10; x <= 16; x++) {
      let c = (y - 3) % 2 === 1 ? BRICK[1] : (x + (((y - 3) >> 1) & 1) * 2) % 4 === 0 ? BRICK[1] : BRICK[2]
      if (x === 10) c = shade(c, 0.25)
      else if (x === 16) c = BRICK[0]
      b.set(x, y, c)
    }
  b.rect(9, 0, 9, 3, STONE[3])
  b.hl(9, 0, 9, STONE[4])
  b.hl(11, 0, 5, IRON[0])
  b.hl(9, 2, 9, STONE[1])
  b.hl(9, 13, 9, METAL[3])
  b.hl(9, 14, 9, METAL[1])
  if (variant % 2 === 0) {
    b.vl(28, 1, 12, IRON[3])
    b.hl(25, 3, 7, IRON[2])
    b.hl(26, 6, 5, IRON[2])
    b.set(28, 0, IRON[4])
  } else {
    b.rect(27, 8, 3, 5, METAL[2])
    b.vl(27, 8, 5, METAL[4])
    b.rect(26, 6, 5, 2, METAL[1])
    b.hl(26, 6, 5, METAL[3])
  }
  // dormer with attic window
  const dm = new Px(64, 64)
  for (let y = 11; y <= 21; y++) {
    const half = Math.round((y - 11) * 0.85) + 1
    for (let x = 45 - half; x <= 45 + half; x++) {
      const course = (y - 11) % 3 === 2
      dm.set(x, y, y === 11 || x === 45 ? rc[4] : x < 45 ? (course ? rc[2] : rc[3]) : course ? rc[0] : rc[1])
    }
  }
  dm.hl(36, 21, 19, rc[0])
  dm.rect(39, 22, 13, 10, wall[2])
  dm.vl(39, 22, 10, wall[3])
  dm.vl(51, 22, 10, wall[1])
  dm.hl(39, 22, 13, withAlpha(SHC, 90))
  dm.hl(39, 23, 13, withAlpha(SHC, 40))
  const attic = win(dm, { x: 43, y: 25, w: 5, h: 5, mx: 1 }, WHITEWALL[3], null)
  dm.outline(OUT)
  b.blit(dm, 0, 0)
  // porch hood over the door
  const aw = new Px(64, 64)
  aw.rect(14, 38, 20, 4, rc[2])
  aw.hl(14, 38, 20, rc[4])
  aw.hl(14, 39, 20, rc[3])
  aw.hl(14, 41, 20, rc[0])
  for (let x = 15; x < 34; x += 3) aw.vl(x, 39, 2, rc[1])
  aw.outline(OUT)
  b.blit(aw, 0, 0)
  b.rect(17, 43, 14, 19, OUT)
  b.rect(18, 44, 12, 18, WHITEWALL[3])
  b.vl(18, 44, 18, WHITEWALL[4])
  b.vl(29, 44, 18, WHITEWALL[1])
  const door: Door = { x: 19, y: 45, w: 10, h: 17, style: 'wood' }
  woodLeaf(b, door)
  b.hl(15, 43, 18, withAlpha(SHC, 70))
  b.rect(15, 62, 18, 2, STONE[3])
  b.hl(15, 62, 18, STONE[4])
  b.hl(15, 63, 18, STONE[1])
  wallLamp(b, 32, 46)
  const wins = [
    win(b, { x: 38, y: 44, w: 8, h: 8, mx: 1, my: true, cur }, WHITEWALL[3], null),
    win(b, { x: 50, y: 44, w: 8, h: 8, mx: 1, my: true, cur }, WHITEWALL[3], null),
    win(b, { x: 7, y: 44, w: 8, h: 8, mx: 1, my: true, cur }, WHITEWALL[3]),
    attic,
  ]
  flowerBox(b, 35, 54, 25, BLOOMS)
  b.outline(OUT)
  bakeWindows(b, wins)
  const p = finish(b, 5, [3, 62])
  // doormat on the path
  p.rect(19, 64, 10, 2, H('#7a4a32'))
  p.hl(20, 64, 8, H('#a86a44'))
  return { img: p.toCanvas(), ox: 0, oy: -16, wins, door, lamps: [[32, 46]], smoke: [13, 0] }
}

function coinEmblem(p: Px, cx: number, cy: number, r: number): void {
  p.ellipse(cx, cy, r + 1, r + 1, BASE[0])
  p.ellipse(cx, cy, r, r, (x, y) => {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
    if (d > r - 1.4) return x + y < cx + cy ? WHITE : BASE[4]
    return x - cx + (y - cy) < -r * 0.6 ? WHITE : H('#eef3ff')
  })
  stamp(p, ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], cx - 2, cy - 3, { '1': BASE[2] })
  stamp(p, ['1111', '1   ', '1   ', '111 ', '1 1 ', '1  1', '1   '], cx - 2, cy - 3, { '1': BASE[1] })
}

function center(): ObjSprite {
  const b = new Px(80, 88)
  // standing-seam Base-blue roof: lit left hip, darker toward the eave
  for (let y = 2; y <= 41; y++) {
    const k = y - 2
    const inset = k < 14 ? Math.round((14 - k) * 0.6) : 0
    const left = 1 + inset
    const right = 78 - inset
    for (let x = left; x <= right; x++) {
      const seam = (x - 1) % 5
      let t = seam === 0 ? 3 : seam === 4 ? 1 : 2
      if (k > 0 && k % 11 === 0) t = 1
      if (k < 8 && t < 4) t++
      if (k > 30 && t > 0) t--
      const u = (x - left) / (right - left)
      if (u < 0.08 && t < 4) t++
      else if (u > 0.92 && t > 0) t--
      if (k < 2) t = 4
      else if (k === 2 && x % 3 === 0) t = 3
      b.set(x, y, BASE[t])
    }
  }
  coinEmblem(b, 40, 20, 10)
  for (const vx of [10, 64]) {
    b.rect(vx, 27, 6, 5, METAL[2])
    b.hl(vx, 27, 6, METAL[4])
    b.vl(vx + 5, 27, 5, METAL[1])
    b.hl(vx + 1, 29, 4, IRON[1])
    b.hl(vx + 1, 31, 4, IRON[1])
  }
  // walls with pilasters and a plinth
  b.rect(3, 42, 74, 46, WHITEWALL[2])
  for (let y = 46; y < 82; y++) if ((y - 46) % 12 === 11) b.hl(3, y, 74, WHITEWALL[1])
  b.vl(3, 42, 44, WHITEWALL[4])
  b.vl(4, 42, 44, WHITEWALL[3])
  b.vl(75, 42, 44, WHITEWALL[1])
  b.vl(76, 42, 44, WHITEWALL[0])
  b.rect(3, 82, 74, 6, STONE[2])
  b.hl(3, 82, 74, STONE[4])
  b.hl(3, 87, 74, STONE[1])
  for (let x = 8; x < 76; x += 9) b.vl(x, 83, 4, STONE[1])
  eave(b, 1, 78, 38, WHITEWALL[4], BASE[0], 3, 76)
  // sign band
  b.rect(3, 49, 74, 8, BASE[2])
  b.hl(3, 49, 74, BASE[3])
  b.hl(3, 56, 74, BASE[1])
  const label = 'REMY CENTER'
  text(b, label, 40 - (textWidth(label) >> 1), 51, WHITE, 1, BASE[1])
  for (const rx of [5, 74]) {
    b.set(rx, 51, BASE[4])
    b.set(rx, 54, BASE[4])
  }
  // windows with heart decals
  const wins = [8, 56].map((wx) => {
    const W = win(b, { x: wx, y: 63, w: 16, h: 12, mx: 2 }, WHITEWALL[4])
    stamp(b, ['r.r', 'rrr', '.r.'], wx + 2, 66, { r: H('#ff6a8a') })
    return W
  })
  // entrance canopy with marquee bulbs
  b.rect(26, 57, 28, 4, WHITEWALL[3])
  b.hl(26, 57, 28, WHITEWALL[4])
  b.hl(26, 60, 28, BASE[2])
  b.hl(26, 61, 28, OUT)
  const bulbs: [number, number][] = []
  for (let x = 27; x < 54; x += 3) {
    b.set(x, 60, GOLD[1])
    bulbs.push([x, 60])
  }
  b.hl(27, 62, 26, withAlpha(SHC, 90))
  b.hl(27, 63, 26, withAlpha(SHC, 40))
  const door: Door = { x: 33, y: 65, w: 14, h: 21, style: 'glass' }
  glassLeaves(b, door, METAL[3])
  b.rect(29, 86, 22, 2, STONE[3])
  b.hl(29, 86, 22, STONE[4])
  wallLamp(b, 28, 70)
  wallLamp(b, 50, 70)
  b.outline(OUT)
  bakeWindows(b, wins)
  const neons = [
    neon(b, 5, 50, 70, 6, [WHITE], H('#f4f8ff'), BASE[3], '90,150,255'),
    neon(b, 28, 8, 25, 25, [BASE[0]], BASE[4], BASE[3], '80,140,255'),
  ]
  const p = finish(b, 5, [3, 76])
  return {
    img: p.toCanvas(),
    ox: 0,
    oy: -24,
    wins,
    door,
    bulbs,
    neon: neons,
    lamps: [
      [28, 70],
      [50, 70],
    ],
    glow: [litGlass(b, door.x, door.y, door.w, door.h, true, '160,210,255')],
  }
}

function mart(): ObjSprite {
  const b = new Px(64, 64)
  // teal roof slope with seam bands
  for (let y = 4; y <= 27; y++) {
    const k = y - 4
    const inset = k < 6 ? 6 - k : 0
    for (let x = 1 + inset; x <= 62 - inset; x++) {
      let c = k % 5 === 4 ? TEAL[1] : TEAL[2]
      if (k === 0) c = TEAL[4]
      else if (k % 5 === 0) c = TEAL[3]
      if (x === 1 + inset) c = TEAL[4]
      else if (x === 62 - inset) c = TEAL[0]
      b.set(x, y, c)
    }
  }
  acUnit(b, 50, 0)
  // glazed tile walls
  for (let y = 28; y < 60; y++)
    for (let x = 3; x <= 60; x++) {
      const row = (y - 28) / 5
      let c = WHITEWALL[2]
      if ((y - 28) % 5 === 4) c = WHITEWALL[1]
      else if ((x + ((row | 0) & 1) * 4) % 8 === 0) c = WHITEWALL[1]
      b.set(x, y, c)
    }
  b.vl(3, 28, 32, WHITEWALL[4])
  b.vl(60, 28, 32, WHITEWALL[0])
  b.rect(3, 59, 58, 5, TEAL[1])
  b.hl(3, 59, 58, TEAL[3])
  b.hl(3, 63, 58, TEAL[0])
  eave(b, 1, 62, 25, TEAL[4], TEAL[0], 3, 60)
  // sign board: $ coin + MART, ringed by marquee bulbs
  b.rect(13, 7, 38, 17, OUT)
  b.rect(14, 8, 36, 15, WHITE)
  b.hl(14, 22, 36, WHITEWALL[1])
  b.ellipse(22, 15, 5.5, 5.5, TEAL[1])
  b.ellipse(22, 15, 4.5, 4.5, TEAL[2])
  stamp(b, ['.1.', '111', '1..', '111', '..1', '111', '.1.'], 21, 12, { '1': WHITE })
  text(b, 'MART', 30, 12, TEAL[1])
  b.hl(30, 18, 15, TEAL[3])
  const bulbs: [number, number][] = []
  for (let x = 15; x < 50; x += 3) {
    bulbs.push([x, 7])
    bulbs.push([63 - x, 23])
  }
  for (const [bx, by] of bulbs) b.set(bx, by, GOLD[1])
  // striped awning with scalloped hem
  for (let x = 4; x < 31; x++) {
    const stripe = ((x - 4) >> 2) % 2
    for (let y = 31; y < 37; y++) b.set(x, y, stripe ? (y === 31 ? WHITE : WHITEWALL[3]) : y === 31 ? TEAL[3] : TEAL[2])
    const drop = ((x - 4) & 3) === 1 || ((x - 4) & 3) === 2
    b.set(x, 37, drop ? (stripe ? WHITEWALL[1] : TEAL[1]) : 0)
    b.set(x, drop ? 38 : 37, withAlpha(SHC, 70))
  }
  // display window with shelves of goods
  const shop = win(b, { x: 6, y: 42, w: 23, h: 12 }, WHITEWALL[4])
  const goods = [H('#ff5a5a'), H('#ffd84a'), H('#5ad06a'), H('#5aa0ff'), H('#ff9ad2')]
  for (const sy of [46, 51]) {
    b.hl(6, sy + 1, 23, WHITEWALL[1])
    for (let x = 7; x < 28; x += 3) {
      const g = goods[(x + sy) % goods.length]
      b.set(x, sy, g)
      b.set(x + 1, sy, shade(g, -0.3))
      b.set(x, sy - 1, shade(g, 0.3))
    }
  }
  // OPEN neon on a backing plate above the door
  b.rect(31, 32, 19, 8, OUT)
  b.rect(32, 33, 17, 6, IRON[1])
  text(b, 'OPEN', 33, 34, H('#b0507a'))
  const door: Door = { x: 34, y: 43, w: 12, h: 19, style: 'glass' }
  glassLeaves(b, door, WHITEWALL[4])
  b.rect(32, 62, 16, 2, STONE[3])
  b.hl(32, 62, 16, STONE[4])
  const side = win(b, { x: 52, y: 44, w: 6, h: 8, my: true }, WHITEWALL[4])
  b.outline(OUT)
  const wins = bakeWindows(b, [shop, side])
  const neons = [
    neon(b, 29, 11, 17, 8, [TEAL[1], TEAL[3]], TEAL[4], TEAL[3], '90,255,220'),
    neon(b, 16, 9, 13, 13, [TEAL[1], TEAL[2]], TEAL[3], TEAL[2], '90,255,220'),
    neon(b, 33, 34, 15, 5, [H('#b0507a')], H('#ffd0ea'), H('#ff4aa0'), '255,80,170'),
  ]
  const p = finish(b, 5, [3, 60])
  return {
    img: p.toCanvas(),
    ox: 0,
    oy: -16,
    wins,
    door,
    bulbs,
    neon: neons,
    glow: [litGlass(b, door.x, door.y, door.w, door.h, false, '255,210,150')],
  }
}

const EXGLASS = [H('#0a1a4a'), H('#12307a'), H('#1f4fb0'), H('#4a86e8'), H('#9cc8ff')]

function exchange(): ObjSprite {
  const b = new Px(112, 112)
  // rooftop plant and antenna mast behind the sign
  for (const ax of [3, 100]) acUnit(b, ax, 14)
  b.vl(56, 0, 4, IRON[3])
  // big sign on the roof, ringed with marquee bulbs
  b.rect(14, 1, 84, 20, OUT)
  b.rect(15, 2, 82, 18, H('#101830'))
  frame(b, 16, 3, 80, 16, GOLD[2])
  const bulbs: [number, number][] = []
  for (let x = 18; x < 95; x += 3) bulbs.push([x, 4])
  for (let y = 7; y < 17; y += 3) bulbs.push([94, y])
  for (let x = 93; x > 17; x -= 3) bulbs.push([x, 17])
  for (let y = 15; y > 6; y -= 3) bulbs.push([17, y])
  for (const [bx, by] of bulbs) b.set(bx, by, GOLD[1])
  const tw = textWidth('EXCHANGE', 2)
  text(b, 'EXCHANGE', 56 - (tw >> 1), 6, GOLD[3], 2, GOLD[0])
  b.rect(26, 21, 3, 5, IRON[2])
  b.rect(83, 21, 3, 5, IRON[2])
  // body + cornice
  const bx0 = 3
  const bx1 = 108
  b.rect(bx0, 24, bx1 - bx0 + 1, 88, STONE[3])
  b.hl(bx0, 24, bx1 - bx0 + 1, STONE[4])
  b.hl(bx0, 27, bx1 - bx0 + 1, STONE[2])
  b.hl(bx0, 28, bx1 - bx0 + 1, STONE[1])
  for (let x = bx0 + 2; x < bx1; x += 4) b.set(x, 26, STONE[1])
  // curtain wall: deep glass with sky streaks, mullions, spandrels
  const cell = (x: number, y: number) => ((x - bx0 - 5) % 12 === 11 ? -1 : y === 44 || y === 45 || y === 60 || y === 61 || y === 76 || y === 77 ? -1 : 0)
  for (let y = 29; y < 98; y++)
    for (let x = bx0 + 5; x <= bx1 - 5; x++) {
      const t = (y - 29) / 69
      let c = t < 0.25 ? EXGLASS[1] : t < 0.6 ? EXGLASS[2] : EXGLASS[3]
      const d = (x + y) % 46
      if (d < 4) c = mix(c, EXGLASS[4], 0.55)
      else if (d < 6) c = mix(c, EXGLASS[4], 0.25)
      if ((x - bx0 - 5) % 12 === 11) c = IRON[3]
      b.set(x, y, c)
    }
  for (const fy of [44, 60, 76]) {
    b.hl(bx0 + 5, fy, bx1 - bx0 - 9, WHITEWALL[3])
    b.hl(bx0 + 5, fy + 1, bx1 - bx0 - 9, WHITEWALL[1])
  }
  b.hl(bx0 + 5, 29, bx1 - bx0 - 9, withAlpha(SHC, 110))
  b.hl(bx0 + 5, 30, bx1 - bx0 - 9, withAlpha(SHC, 50))
  // pillars with capitals
  for (const px of [bx0, bx1 - 4]) {
    b.rect(px, 24, 5, 88, STONE[3])
    b.vl(px, 24, 88, STONE[4])
    b.vl(px + 4, 24, 88, STONE[1])
    b.rect(px - 1, 29, 7, 2, STONE[4])
    b.hl(px - 1, 31, 7, STONE[1])
  }
  // ticker marquee (animated over)
  b.rect(8, 47, 96, 12, OUT)
  b.rect(9, 48, 94, 10, H('#05070e'))
  b.hl(9, 48, 94, H('#1a2238'))
  // entrance canopy + doors
  b.rect(38, 84, 36, 4, WHITEWALL[3])
  b.hl(38, 84, 36, WHITEWALL[4])
  b.hl(38, 87, 36, WHITEWALL[0])
  b.hl(38, 88, 36, withAlpha(SHC, 110))
  b.hl(38, 89, 36, withAlpha(SHC, 50))
  text(b, '24/7', 49, 85, BASE[2])
  b.rect(45, 88, 22, 20, STONE[2])
  const door: Door = { x: 49, y: 91, w: 14, h: 17, style: 'glass' }
  glassLeaves(b, door, IRON[4])
  // plinth + steps
  b.rect(bx0, 106, bx1 - bx0 + 1, 6, STONE[2])
  b.hl(bx0, 106, bx1 - bx0 + 1, STONE[4])
  b.hl(bx0, 109, bx1 - bx0 + 1, STONE[1])
  b.rect(44, 108, 24, 4, STONE[3])
  b.hl(44, 108, 24, STONE[4])
  b.hl(44, 110, 24, STONE[2])
  b.rect(door.x, 106, door.w, 2, METAL[1])
  // Base-blue banners on the pillars with a white bull-run chart
  for (const bx of [bx0 + 6, bx1 - 11]) {
    b.rect(bx, 64, 6, 18, BASE[2])
    b.vl(bx, 64, 18, BASE[3])
    b.vl(bx + 5, 64, 18, BASE[1])
    stamp(b, ['...w', '..ww', 'w.w.', '.w..'], bx + 1, 68, { w: WHITE })
    b.hl(bx + 1, 74, 4, BASE[4])
    b.set(bx + 1, 82, BASE[2])
    b.set(bx + 4, 82, BASE[2])
  }
  // clipped shrubs in planters flanking the steps
  for (const px of [30, 72]) {
    b.rect(px, 100, 10, 6, STONE[2])
    b.hl(px, 100, 10, STONE[4])
    b.ellipse(px + 5, 97, 5.5, 4, (x, y) => (hash(x, y, 2) < 0.25 ? MOSS[3] : x + y < px + 100 ? MOSS[2] : MOSS[1]))
  }
  b.outline(OUT)
  // offices at night: most floors lit, a few cells dark, warm and cool rooms mixed
  const off = new Px(98, 69)
  for (let y = 29; y < 98; y++)
    for (let x = bx0 + 5; x <= bx1 - 5; x++) {
      if (cell(x, y) < 0 || (y >= 47 && y <= 58)) continue
      const cx = Math.floor((x - bx0 - 5) / 12)
      const cy = y < 44 ? 0 : y < 60 ? 1 : y < 76 ? 2 : 3
      const h1 = hash(cx, cy, 44)
      if (h1 < 0.22) continue
      const tone = h1 > 0.7 ? LIT : [H('#1a2e48'), H('#4a7cb0'), H('#8cc4f0'), H('#cdeeff'), H('#f4fcff')]
      const v = (y - [29, 46, 62, 78][cy]) / 14 + (((x + y) & 1) ? 0.06 : -0.06)
      off.set(x - bx0 - 5, y - 29, tone[v < 0.3 ? 4 : v < 0.85 ? 3 : 2])
    }
  const offices: Neon = { x: bx0 + 5, y: 29, w: 98, h: 69, img: off.toCanvas(), rgb: '170,210,255' }
  const neons = [neon(b, 16, 5, 80, 13, [GOLD[3]], GOLD[4], H('#ff9a20'), '255,200,90')]
  const p = finish(b, 6, [3, 108])
  return { img: p.toCanvas(), ox: 0, oy: -32, door, bulbs, neon: neons, glow: [offices] }
}

/** Gothic window slots on the Rug Tower (x = left of a 3px arch, y = top), shared with the glow animation. */
const TOWER_WINDOWS: [number, number][] = [
  ...[34, 56, 78].flatMap((y) => [20, 33, 46, 59].map((x): [number, number] => [x, y])),
  [20, 100],
  [59, 100],
]

function tower(): ObjSprite {
  const b = new Px(80, 128)
  const body = new Px(80, 128)
  const half = (y: number) => 34 - Math.floor((127 - y) / 14)
  for (let y = 26; y < 128; y++) {
    const hw = half(y)
    const l = 40 - hw
    const r = 39 + hw
    const tier = (y - 30) % 22
    for (let x = l; x <= r; x++) {
      const u = (x - l) / (r - l)
      let c = u < 0.28 ? OBS[3] : u < 0.72 ? OBS[2] : OBS[1]
      // cut-stone courses: staggered joints, every block a touch different
      const course = Math.floor((y - 26) / 4)
      if ((y - 26) % 4 === 3 || (x + (course & 1) * 5) % 10 === 0) c = shade(c, -0.35)
      else if (hash(Math.floor((x + (course & 1) * 5) / 10), course, 8) < 0.2) c = shade(c, 0.1)
      if (x === l || x === l + 1) c = OBS[4]
      if (Math.abs(u - 0.28) < 0.012 || Math.abs(u - 0.72) < 0.012) c = PURP[0]
      if (y >= 30 && tier === 0) c = u < 0.72 ? OBS[4] : OBS[3]
      if (y >= 30 && tier === 1) c = OBS[0]
      body.set(x, y, c)
    }
    if (y >= 30 && tier === 0) {
      body.set(l - 1, y, OBS[4])
      body.set(r + 1, y, OBS[3])
    }
  }
  for (let y = 118; y < 128; y++) {
    const inset = y < 122 ? 2 : 0
    for (let x = 3 + inset; x <= 76 - inset; x++) body.set(x, y, y === 118 || y === 122 ? OBS[4] : x < 20 ? OBS[3] : OBS[2])
  }
  for (let x = 13; x < 66; x += 8) {
    body.rect(x, 20, 5, 7, OBS[2])
    body.vl(x, 20, 7, OBS[4])
    body.hl(x, 20, 5, OBS[4])
  }
  const spire = (cx: number, top: number, bottom: number, sw: number) => {
    for (let y = top; y <= bottom; y++) {
      const hw = Math.round(((y - top) / (bottom - top)) * sw)
      for (let x = cx - hw; x <= cx + hw; x++) body.set(x, y, x < cx ? OBS[3] : x === cx ? OBS[4] : OBS[1])
    }
  }
  spire(40, 0, 26, 7)
  spire(19, 8, 24, 5)
  spire(61, 8, 24, 5)
  spire(29, 14, 24, 3)
  spire(51, 14, 24, 3)
  body.set(40, 2, PURP[3])
  body.set(40, 3, PURP[2])
  body.outline(OUT)
  b.blit(body, 0, 0)
  b.rect(33, 27, 14, 7, H('#8f1728'))
  b.rect(34, 28, 12, 5, H('#11131b'))
  b.hl(35, 29, 10, GOLD[3])
  b.rect(38, 30, 4, 1, GOLD[3])
  b.rect(38, 31, 1, 1, GOLD[3])
  b.rect(38, 32, 4, 1, GOLD[3])
  b.rect(42, 31, 1, 1, H('#e83b4d'))
  b.rect(43, 32, 1, 1, H('#e83b4d'))
  for (const [wx, wy] of TOWER_WINDOWS) {
    stamp(b, ['.o.', 'oPo', 'ppp', 'pPp', 'pPp', 'pPp', 'ppp'], wx, wy, { o: OUT, p: PURP[1], P: PURP[2] })
    b.hl(wx, wy + 7, 3, OUT)
    b.vl(wx - 1, wy + 1, 6, OUT)
    b.vl(wx + 3, wy + 1, 6, OUT)
    b.hl(wx - 1, wy + 8, 5, OBS[4])
  }
  stamp(b, ['...1...', '..121..', '.12321.', '1233321', '.12321.', '..121..', '...1...'], 37, 88, {
    '1': PURP[0],
    '2': PURP[1],
    '3': PURP[3],
  })
  for (const [cx, cy] of [
    [18, 66],
    [58, 92],
    [30, 45],
    [52, 70],
  ]) {
    b.set(cx, cy, PURP[2])
    b.set(cx + 1, cy + 1, PURP[1])
    b.set(cx + 1, cy + 2, PURP[0])
    b.set(cx + 2, cy + 3, PURP[1])
  }
  // arch doorway with iron double doors
  const ax = 33
  for (let y = 99; y < 128; y++)
    for (let x = ax; x < ax + 14; x++) {
      const dx = x - (ax + 6.5)
      if (y < 105 && dx * dx + (y - 105) ** 2 * 1.4 > 49) continue
      b.set(x, y, mix(H('#0a0414'), PURP[0], Math.max(0, 0.9 - (y - 99) / 29) * 0.8))
    }
  const door: Door = { x: 35, y: 103, w: 10, h: 21, style: 'arch' }
  for (let j = 0; j < door.h; j++)
    for (let i = 0; i < door.w; i++) {
      let c = j % 5 === 0 ? IRON[0] : i === 0 || i === 5 ? IRON[3] : IRON[1]
      if (i === 4) c = OUT
      if (j % 5 === 2 && (i === 1 || i === 8)) c = PURP[2]
      b.set(door.x + i, door.y + j, c)
    }
  b.set(door.x + 3, door.y + 11, GOLD[3])
  b.set(door.x + 6, door.y + 11, GOLD[3])
  for (let y = 96; y < 128; y++) {
    b.set(ax - 1, y, y < 104 ? OBS[0] : OBS[4])
    b.set(ax + 14, y, OBS[0])
  }
  for (let x = ax - 3; x <= ax + 16; x++) {
    const sag = Math.round(Math.sin(((x - ax + 3) / 19) * Math.PI) * 3)
    for (let y = 96; y <= 99 + sag; y++) {
      let c = RUG[2]
      if (y === 96) c = RUG[3]
      else if (y === 99 + sag) c = RUG[1]
      else if ((x - ax) % 5 === 0) c = RUG[1]
      b.set(x, y, c)
    }
    b.set(x, 100 + sag, (x & 1) === 0 ? GOLD[3] : GOLD[1])
  }
  for (const tx of [ax - 3, ax + 16]) {
    b.vl(tx, 97, 12, RUG[1])
    b.vl(tx + (tx < ax ? 1 : -1), 97, 10, RUG[2])
    b.set(tx, 109, GOLD[3])
    b.set(tx, 110, GOLD[2])
  }
  for (let y = 124; y < 128; y++) {
    b.hl(ax + 1, y, 12, RUG[2])
    b.set(ax + 1, y, GOLD[2])
    b.set(ax + 12, y, GOLD[2])
  }
  b.hl(ax + 1, 124, 12, RUG[3])
  const p = finish(b, 6, [5, 75])
  return { img: p.toCanvas(), ox: 0, oy: -32, door }
}

function lab(): ObjSprite {
  const b = new Px(96, 92)
  // satellite dish on a mast
  b.rect(22, 16, 3, 8, IRON[3])
  b.vl(22, 16, 8, IRON[4])
  b.ellipse(19, 10, 10, 7, (x, y) => {
    const n = (x - 19) * 0.6 + (y - 10)
    return n < -4 ? WHITEWALL[4] : n < 1 ? WHITEWALL[3] : n < 5 ? WHITEWALL[2] : WHITEWALL[1]
  })
  b.ellipse(20, 11, 6, 4, WHITEWALL[1])
  b.ellipse(20, 11, 4, 2.5, WHITEWALL[2])
  for (let k = 0; k < 7; k++) b.set(21 + k, 10 - k, IRON[3])
  b.rect(27, 2, 3, 3, BASE[2])
  b.set(28, 1, H('#ff4a4a'))
  // roof deck: membrane with seams and gravel, parapet coping
  for (let y = 20; y < 30; y++)
    for (let x = 2; x <= 93; x++) {
      if (b.get(x, y)) continue
      b.set(x, y, hash(x, y, 4) < 0.08 ? H('#c2cadb') : (y - 20) % 4 === 3 ? H('#8a94aa') : H('#a4aec2'))
    }
  b.hl(2, 20, 92, H('#c8d0e0'))
  for (let i = 0; i < 3; i++) {
    const sx = 52 + i * 13
    b.rect(sx, 21, 11, 7, BASE[1])
    for (let j = 0; j < 11; j += 3) b.vl(sx + j, 21, 7, BASE[0])
    b.hl(sx, 24, 11, BASE[0])
    b.hl(sx, 21, 11, METAL[3])
    b.set(sx + 1, 22, BASE[4])
    b.set(sx + 2, 22, BASE[3])
    b.set(sx + 4, 25, BASE[3])
  }
  acUnit(b, 33, 21)
  b.rect(1, 30, 94, 4, WHITEWALL[3])
  b.hl(1, 30, 94, WHITEWALL[4])
  b.hl(1, 33, 94, WHITEWALL[1])
  // composite panel walls with a Base-blue stripe
  for (let y = 34; y < 88; y++)
    for (let x = 3; x <= 92; x++) {
      const k = (x - 3) % 18
      b.set(x, y, k === 17 || y === 60 ? WHITEWALL[1] : k === 0 ? WHITEWALL[3] : WHITEWALL[2])
    }
  b.vl(3, 34, 54, WHITEWALL[4])
  b.vl(92, 34, 54, WHITEWALL[0])
  b.rect(3, 36, 90, 3, BASE[2])
  b.hl(3, 36, 90, BASE[3])
  b.hl(3, 38, 90, BASE[1])
  b.hl(3, 34, 90, withAlpha(SHC, 96))
  b.hl(3, 35, 90, withAlpha(SHC, 44))
  for (let y = 86; y < 92; y++)
    for (let x = 3; x <= 92; x++) b.set(x, y, y === 86 ? STONE[3] : hash(x, y, 6) < 0.15 ? STONE[2] : STONE[1])
  // sign plate
  b.rect(22, 41, 52, 8, OUT)
  b.rect(23, 42, 50, 6, WHITEWALL[4])
  text(b, 'GWEI LAB', 48 - (textWidth('GWEI LAB') >> 1), 42, BASE[2])
  // ribbon windows with lab gear on the benches
  const wins = [win(b, { x: 7, y: 52, w: 22, h: 15, mx: 2, cool: true }, WHITEWALL[4]), win(b, { x: 62, y: 52, w: 27, h: 15, mx: 2, cool: true }, WHITEWALL[4])]
  for (const W of wins) {
    b.hl(W.x, W.y + 11, W.w, WHITEWALL[1])
    for (let x = W.x + 2; x < W.x + W.w - 4; x += 7) {
      const liquid = [H('#5aff8a'), H('#ff6ad0'), H('#6ad8ff')][(x >> 3) % 3]
      b.rect(x, W.y + 8, 3, 3, liquid)
      b.set(x + 1, W.y + 7, WHITEWALL[4])
      b.set(x, W.y + 8, shade(liquid, 0.4))
      b.rect(x + 4, W.y + 6, 3, 3, IRON[1])
      b.set(x + 5, W.y + 7, BASE[3])
    }
  }
  // wall AC unit + louvre vent
  acUnit(b, 78, 73)
  b.vl(82, 80, 3, withAlpha(SHC, 60))
  for (let j = 0; j < 5; j += 2) b.hl(8, 74 + j, 6, WHITEWALL[0])
  // door canopy, glass doors, planters
  b.rect(28, 62, 24, 3, WHITEWALL[3])
  b.hl(28, 62, 24, WHITEWALL[4])
  b.hl(28, 64, 24, WHITEWALL[1])
  b.hl(28, 65, 24, OUT)
  b.hl(29, 66, 22, withAlpha(SHC, 80))
  const door: Door = { x: 34, y: 68, w: 12, h: 18, style: 'glass' }
  glassLeaves(b, door, WHITEWALL[3])
  b.rect(30, 86, 20, 2, STONE[4])
  b.hl(30, 87, 20, STONE[2])
  for (const px of [18, 52]) {
    b.rect(px, 81, 10, 6, STONE[2])
    b.hl(px, 81, 10, STONE[4])
    b.vl(px + 9, 81, 6, STONE[1])
    b.ellipse(px + 5, 78, 5.5, 4, (x, y) => (hash(x, y, 3) < 0.25 ? MOSS[3] : x + y < px + 83 ? MOSS[2] : MOSS[1]))
  }
  wallLamp(b, 29, 70)
  wallLamp(b, 49, 70)
  b.outline(OUT)
  bakeWindows(b, wins)
  const neons = [{ ...neon(b, 23, 42, 50, 6, [BASE[2]], H('#d6e4ff'), BASE[3], '90,150,255'), a: 0.35 }]
  const p = finish(b, 6, [3, 92])
  return {
    img: p.toCanvas(),
    ox: 0,
    oy: -28,
    wins,
    door,
    neon: neons,
    lamps: [
      [29, 70],
      [49, 70],
    ],
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Decor

function sign(): ObjSprite {
  const s = new Px(16, 16)
  s.ellipse(8, 14.5, 6, 1.4, SH)
  for (const px of [3, 11]) {
    s.rect(px, 9, 2, 6, WOOD[1])
    s.vl(px, 9, 6, WOOD[2])
  }
  s.rect(1, 2, 14, 8, WOOD[2])
  for (let x = 2; x < 14; x++) if (hash(x, 3, 5) < 0.35) s.set(x, 4 + (x % 4), WOOD[3])
  s.hl(1, 2, 14, WOOD[4])
  s.hl(1, 3, 14, WOOD[3])
  s.hl(1, 8, 14, WOOD[1])
  s.hl(1, 9, 14, WOOD[0])
  s.vl(1, 3, 6, WOOD[3])
  s.vl(14, 3, 6, WOOD[1])
  s.hl(3, 5, 4, WOOD[0])
  s.hl(8, 5, 5, WOOD[0])
  s.hl(3, 7, 7, WOOD[0])
  s.set(2, 3, METAL[4])
  s.set(13, 3, METAL[3])
  s.outline(OUT)
  return sprite(finish(s, 2), 0, 0)
}

function lamp(): ObjSprite {
  const s = new Px(16, 32)
  s.ellipse(8, 30.5, 5, 1.4, SH)
  // stepped cast-iron base
  s.rect(4, 28, 8, 2, IRON[1])
  s.hl(4, 28, 8, IRON[3])
  s.rect(5, 25, 6, 3, IRON[2])
  s.hl(5, 25, 6, IRON[4])
  s.vl(10, 25, 3, IRON[1])
  // fluted pole + collar
  s.rect(7, 12, 2, 13, IRON[2])
  s.vl(7, 12, 13, IRON[4])
  s.rect(6, 18, 4, 2, IRON[3])
  s.hl(6, 18, 4, IRON[4])
  // scroll arms
  s.hl(5, 11, 6, IRON[2])
  s.set(4, 10, IRON[3])
  s.set(11, 10, IRON[3])
  s.set(5, 12, IRON[3])
  s.set(10, 12, IRON[3])
  // lantern: finial, pyramid cap, 2-pane glass, base ring
  s.set(8, 0, GOLD[3])
  s.hl(7, 1, 2, IRON[3])
  s.hl(6, 2, 4, IRON[2])
  s.hl(4, 3, 8, IRON[3])
  s.rect(5, 4, 6, 6, GLASS_DAY)
  s.vl(6, 5, 4, WHITE)
  s.vl(5, 4, 6, IRON[1])
  s.vl(10, 4, 6, IRON[1])
  s.vl(8, 4, 6, IRON[2])
  s.hl(5, 10, 6, IRON[3])
  s.outline(OUT)
  return sprite(finish(s, 3), 0, -16)
}

function atm(): ObjSprite {
  const s = new Px(16, 24)
  s.ellipse(8, 22.5, 6.5, 1.4, SH)
  s.rect(2, 3, 12, 19, IRON[2])
  s.vl(2, 3, 19, IRON[3])
  s.vl(13, 3, 19, IRON[0])
  s.hl(2, 21, 12, IRON[1])
  // lit Base header
  s.rect(1, 0, 14, 4, BASE[2])
  s.hl(1, 0, 14, BASE[4])
  s.hl(1, 3, 14, BASE[0])
  s.ellipse(8, 2, 1.6, 1.4, WHITE)
  s.hl(7, 2, 2, BASE[2])
  // screen, keypad, card + cash slots
  s.rect(3, 5, 10, 7, IRON[0])
  s.rect(4, 6, 8, 5, H('#0a1830'))
  s.hl(4, 6, 8, H('#16305a'))
  for (let y = 13; y < 17; y += 2) for (let x = 4; x < 10; x += 2) s.set(x, y, IRON[4])
  s.hl(10, 13, 3, IRON[0])
  s.set(11, 14, H('#4ade80'))
  s.set(11, 15, H('#f87171'))
  s.hl(4, 18, 8, IRON[0])
  s.hl(4, 19, 8, IRON[3])
  s.outline(OUT)
  return sprite(finish(s, 3), 0, -8)
}

function server(): ObjSprite {
  const s = new Px(16, 24)
  s.ellipse(8, 22.5, 7, 1.4, SH)
  s.rect(2, 1, 12, 21, IRON[1])
  s.hl(2, 1, 12, IRON[4])
  s.vl(2, 1, 21, IRON[3])
  s.vl(13, 1, 21, IRON[0])
  s.hl(2, 21, 12, IRON[0])
  for (let u = 0; u < 5; u++) {
    const y = 3 + u * 4
    s.rect(3, y, 10, 3, IRON[2])
    s.hl(3, y, 10, IRON[3])
    for (let x = 4; x < 9; x += 2) s.set(x, y + 1, IRON[0])
    s.set(3, y + 1, METAL[3])
    s.set(10, y + 1, H('#0a0a10'))
    s.set(11, y + 1, H('#0a0a10'))
  }
  // cable bundle looping over the top
  s.set(5, 0, BASE[2])
  s.set(6, 0, BASE[3])
  s.set(10, 0, H('#f59e0b'))
  s.set(11, 0, H('#fbbf24'))
  s.outline(OUT)
  return sprite(finish(s, 3), 0, -8)
}

function mailbox(): ObjSprite {
  const s = new Px(16, 20)
  s.ellipse(8, 18.5, 4.5, 1.4, SH)
  s.rect(7, 11, 2, 8, WOOD[1])
  s.vl(7, 11, 8, WOOD[3])
  s.hl(6, 18, 4, WOOD[0])
  s.rect(3, 4, 10, 7, BASE[2])
  s.hl(4, 2, 8, BASE[3])
  s.hl(5, 1, 6, BASE[4])
  s.hl(4, 3, 8, BASE[3])
  s.hl(3, 10, 10, BASE[0])
  s.hl(3, 9, 10, BASE[1])
  s.vl(3, 3, 7, BASE[3])
  s.vl(12, 3, 7, BASE[1])
  s.hl(4, 6, 8, WHITE)
  s.hl(4, 7, 8, BASE[4])
  s.rect(12, 2, 2, 4, H('#ef4444'))
  s.set(12, 2, H('#ffb0b0'))
  s.set(13, 6, H('#b91c1c'))
  s.outline(OUT)
  return sprite(finish(s, 2), 0, -4)
}

function flowerpot(theme: Theme): ObjSprite {
  const s = new Px(16, 20)
  s.ellipse(8, 18.5, 5, 1.4, SH)
  s.rect(4, 12, 8, 6, CLAY[2])
  s.vl(4, 12, 6, CLAY[3])
  s.vl(5, 13, 4, CLAY[3])
  s.vl(11, 12, 6, CLAY[1])
  s.hl(5, 17, 6, CLAY[1])
  s.rect(3, 10, 10, 3, CLAY[3])
  s.hl(3, 10, 10, CLAY[4])
  s.hl(3, 12, 10, CLAY[1])
  const leaf = PALS[theme].tree
  s.ellipse(8, 7, 5.5, 4.2, (x, y) => (hash(x, y, 1) < 0.2 ? leaf[4] : x + y < 13 ? leaf[3] : y > 8 ? leaf[1] : leaf[2]))
  s.set(3, 9, leaf[1])
  s.set(12, 9, leaf[1])
  const cols = PALS[theme].flowers
  for (const [fx, fy, i] of [
    [4, 5, 0],
    [10, 4, 1],
    [7, 2, 2],
    [9, 8, 0],
  ]) {
    const c = cols[i % cols.length]
    s.set(fx, fy, c)
    s.set(fx + 1, fy, shade(c, -0.25))
    s.set(fx, fy + 1, shade(c, -0.25))
    s.set(fx + 1, fy + 1, H('#ffd23a'))
  }
  s.outline(OUT)
  return sprite(finish(s, 2), 0, -4)
}

function rock(theme: Theme): ObjSprite {
  const s = new Px(16, 18)
  s.ellipse(8, 16.5, 7.5, 1.5, SH)
  const rr = theme === 'canyon' ? PALS.canyon.cliff : [H('#3a3a44'), H('#6e6e7e'), H('#9494a4'), H('#b8b8c6'), H('#dadae4')]
  s.ellipse(8, 10.5, 7, 6, (x, y) => {
    const n = (x - 8) / 7 + (y - 10.5) / 6
    // faceted: hard planes instead of a smooth ball
    const facet = x < 6 ? -0.4 : x > 10 ? 0.4 : 0
    const k = n + facet
    return k < -0.9 ? rr[4] : k < -0.2 ? rr[3] : k < 0.6 ? rr[2] : rr[1]
  })
  s.ellipse(11, 6.5, 3, 2.5, (x, y) => (x - 11 + (y - 6.5) < -1 ? rr[4] : rr[3]))
  // crack
  s.set(7, 8, rr[0])
  s.set(7, 9, rr[1])
  s.set(8, 10, rr[0])
  s.set(8, 11, rr[1])
  if (theme === 'canyon') {
    s.hl(3, 12, 10, rr[1])
    s.hl(4, 9, 3, rr[3])
  } else
    for (const [mx, my] of [
      [3, 11],
      [4, 11],
      [4, 10],
      [5, 12],
      [3, 12],
      [11, 5],
      [12, 5],
    ])
      s.set(mx, my, MOSS[(mx + my) % 2 ? 2 : 1])
  s.outline(OUT)
  return sprite(finish(s, 2), 0, -2)
}

function crystal(): ObjSprite {
  const s = new Px(16, 28)
  s.ellipse(8, 26, 7, 1.8, SH)
  s.ellipse(8, 24, 6.5, 3, STONE[1])
  s.ellipse(8, 23.5, 6, 2.5, STONE[2])
  s.hl(3, 22, 10, STONE[3])
  const prism = (x0: number, top: number, bottom: number, w: number) => {
    for (let y = top; y <= bottom; y++) {
      const k = y - top
      const hw = k < w ? k : w
      for (let x = -hw; x <= hw; x++) {
        let c = x < 0 ? BASE[3] : x === 0 ? BASE[4] : x === hw ? BASE[1] : BASE[2]
        // inner fracture planes catch the light
        if ((y + x * 2) % 7 === 0 && x !== 0) c = BASE[4]
        s.set(x0 + x, y, k === 0 ? WHITE : c)
      }
    }
  }
  prism(4, 11, 23, 2)
  prism(12, 9, 23, 2)
  prism(8, 1, 23, 3)
  s.set(7, 5, WHITE)
  s.set(7, 6, BASE[5])
  s.set(6, 9, BASE[5])
  s.outline(BASE[0])
  return sprite(finish(s, 3), 0, -12)
}

function candle(green: boolean): ObjSprite {
  const s = new Px(16, 40)
  const c = green ? GREENC : REDC
  s.ellipse(8, 38.5, 7, 1.4, SH)
  // marble plinth with a gold band
  s.rect(2, 32, 12, 7, MARBLE[2])
  s.hl(2, 32, 12, MARBLE[4])
  s.hl(2, 33, 12, MARBLE[3])
  s.hl(2, 38, 12, MARBLE[0])
  s.vl(13, 33, 5, MARBLE[1])
  s.hl(2, 35, 12, GOLD[2])
  s.hl(2, 36, 12, GOLD[1])
  s.set(5, 34, MARBLE[1])
  s.set(6, 35, MARBLE[1])
  // body + wicks
  const [top, bot, wTop, wBot] = green ? [8, 28, 1, 31] : [12, 24, 4, 31]
  s.rect(7, wTop, 2, top - wTop, IRON[2])
  s.set(7, wTop, IRON[4])
  s.rect(7, bot, 2, wBot - bot + 1, IRON[2])
  s.rect(4, top, 8, bot - top, c[2])
  s.vl(4, top, bot - top, c[3])
  s.vl(5, top + 1, bot - top - 2, c[4])
  s.vl(10, top, bot - top, c[1])
  s.vl(11, top, bot - top, c[0])
  s.hl(4, top, 8, c[3])
  s.hl(4, bot - 1, 8, c[1])
  s.set(6, top + 2, WHITE)
  s.outline(OUT)
  return sprite(finish(s, 3), 0, -24)
}

function statue(): ObjSprite {
  const s = new Px(16, 28)
  s.ellipse(8, 26.5, 7, 1.4, SH)
  s.rect(3, 18, 10, 9, MARBLE[2])
  s.rect(2, 16, 12, 3, MARBLE[3])
  s.hl(2, 16, 12, MARBLE[4])
  s.hl(2, 18, 12, MARBLE[1])
  s.vl(3, 19, 8, MARBLE[3])
  s.vl(12, 19, 8, MARBLE[1])
  s.hl(2, 26, 12, MARBLE[0])
  s.rect(5, 21, 6, 3, GOLD[2])
  s.hl(5, 21, 6, GOLD[3])
  s.hl(6, 22, 4, GOLD[1])
  s.ellipse(8, 15, 5, 2.5, (x) => (x < 7 ? GOLD[3] : x > 9 ? GOLD[1] : GOLD[2]))
  s.ellipse(8, 7.5, 5.5, 5.5, (x, y) => {
    const n = (x - 8) / 5.5 + (y - 7.5) / 5.5
    return n < -0.9 ? GOLD[4] : n < -0.25 ? GOLD[3] : n < 0.6 ? GOLD[2] : GOLD[1]
  })
  s.rect(5, 8, 2, 2, GOLD[0])
  s.rect(9, 8, 2, 2, GOLD[0])
  s.hl(4, 7, 3, GOLD[1])
  s.hl(9, 7, 3, GOLD[1])
  s.set(5, 8, GOLD[4])
  s.set(9, 8, GOLD[4])
  s.hl(7, 11, 2, GOLD[1])
  s.outline(OUT)
  return sprite(finish(s, 3), 0, -12)
}

function bench(): ObjSprite {
  const s = new Px(32, 20)
  s.rect(2, 17, 28, 2, SH)
  // cast-iron ends with curled armrests
  for (const lx of [2, 27]) {
    s.rect(lx, 8, 3, 10, IRON[2])
    s.vl(lx, 8, 10, IRON[3])
    s.hl(lx - 1, 8, 5, IRON[3])
    s.set(lx + (lx < 10 ? -1 : 3), 9, IRON[2])
    s.hl(lx - 1, 17, 5, IRON[1])
  }
  // backrest slats
  for (const [y, hi] of [
    [1, WOOD[4]],
    [4, WOOD[3]],
  ] as const) {
    s.rect(3, y, 26, 2, WOOD[2])
    s.hl(3, y, 26, hi)
    s.hl(3, y + 2, 26, WOOD[0])
  }
  s.vl(5, 1, 7, IRON[2])
  s.vl(26, 1, 7, IRON[2])
  // seat slats
  s.rect(1, 9, 30, 4, WOOD[3])
  s.hl(1, 9, 30, WOOD[4])
  s.hl(1, 11, 30, WOOD[2])
  s.hl(1, 12, 30, WOOD[1])
  s.hl(1, 13, 30, withAlpha(SHC, 110))
  for (let x = 4; x < 30; x += 7) s.set(x, 10, WOOD[1])
  s.outline(OUT)
  return sprite(finish(s, 2), 0, -4)
}

function fountain(): ObjSprite {
  const s = new Px(48, 48)
  const water = PALS.town.water
  s.ellipse(24, 34, 23.5, 12.5, SH)
  // outer basin: carved rim blocks catch the light upper-left, front face in shadow
  s.ellipse(24, 32, 23, 13, STONE[1])
  s.ellipse(24, 30, 23, 13, (x, y) => {
    const ang = Math.atan2(y + 0.5 - 30, x + 0.5 - 24)
    const block = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 18)
    const lit = (x - 24) / 23 + (y - 30) / 13 < -0.5
    if (Math.abs(((ang + Math.PI) / (Math.PI * 2)) * 18 - Math.round(((ang + Math.PI) / (Math.PI * 2)) * 18)) < 0.08) return STONE[1]
    return lit ? STONE[4] : block % 2 ? STONE[3] : shade(STONE[3], -0.06)
  })
  s.ellipse(24, 30, 19.5, 10.5, STONE[0])
  s.ellipse(24, 30.5, 19, 10, (x, y) => {
    const v = (y + 0.5 - 20.5) / 20
    if (v < 0.18) return water[1]
    return hash(x, y, 5) < 0.06 ? water[3] : v > 0.8 ? water[3] : water[2]
  })
  // pedestal with fluting, scalloped upper bowl, finial spout
  s.ellipse(24, 30, 6, 2.5, STONE[2])
  s.rect(21, 14, 6, 16, STONE[3])
  s.vl(21, 14, 16, STONE[4])
  s.vl(23, 15, 14, STONE[2])
  s.vl(26, 14, 16, STONE[1])
  s.ellipse(24, 15, 9.5, 3.8, STONE[1])
  for (let x = 15; x <= 33; x += 3) s.set(x, 17, STONE[0])
  s.ellipse(24, 13.5, 9.5, 3.4, (x) => (x < 21 ? STONE[4] : STONE[3]))
  s.ellipse(24, 13.5, 7.5, 2.3, water[2])
  s.hl(20, 13, 6, water[3])
  s.rect(23, 5, 2, 8, STONE[3])
  s.vl(23, 5, 8, STONE[4])
  s.ellipse(24, 5, 3, 1.6, STONE[4])
  s.set(24, 3, STONE[4])
  s.outline(OUT)
  return sprite(finish(s, 3), 0, 0)
}

// --- new street & interior dressing --------------------------------------------------------------------------

function planter(theme: Theme): ObjSprite {
  const s = new Px(16, 20)
  s.ellipse(8, 18.5, 7.5, 1.4, SH)
  s.rect(1, 12, 14, 6, STONE[2])
  s.hl(1, 12, 14, STONE[4])
  s.hl(1, 13, 14, STONE[3])
  s.vl(14, 13, 5, STONE[1])
  s.hl(1, 17, 14, STONE[1])
  for (const x of [5, 10]) s.vl(x, 14, 3, STONE[1])
  const leaf = PALS[theme].bush
  s.ellipse(8, 8, 7, 5, (x, y) => (hash(x, y, 7) < 0.18 ? leaf[4] : x + y < 13 ? leaf[3] : y > 10 ? leaf[1] : leaf[2]))
  const cols = PALS[theme].flowers
  for (let i = 0; i < 5; i++) s.set(3 + Math.floor(hash(i, 1, 8) * 10), 5 + Math.floor(hash(i, 2, 8) * 5), cols[i % cols.length])
  s.outline(OUT)
  return sprite(finish(s, 2), 0, -4)
}

function vending(): ObjSprite {
  const s = new Px(16, 30)
  s.ellipse(8, 28.5, 7, 1.4, SH)
  s.rect(1, 1, 14, 27, H('#d02c3a'))
  s.vl(1, 1, 27, H('#f05a5a'))
  s.vl(14, 1, 27, H('#8a1422'))
  s.hl(1, 1, 14, H('#ff8a8a'))
  // glass front with rows of cans
  s.rect(3, 3, 8, 15, IRON[0])
  const cans = [H('#5aa0ff'), H('#ffd84a'), H('#5ad06a'), H('#ffffff'), H('#ff9a4a')]
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      const col = cans[(r * 3 + c) % cans.length]
      s.set(4 + c * 2, 4 + r * 4, shade(col, 0.3))
      s.set(4 + c * 2, 5 + r * 4, col)
      s.set(4 + c * 2, 6 + r * 4, shade(col, -0.3))
    }
  s.set(3, 3, WHITE)
  s.set(4, 3, H('#bfe4ff'))
  // buttons, coin slot, pickup tray
  for (let y = 4; y < 14; y += 3) s.hl(12, y, 2, WHITEWALL[3])
  s.rect(12, 15, 2, 2, IRON[1])
  s.rect(3, 21, 10, 4, IRON[1])
  s.hl(3, 21, 10, IRON[0])
  s.hl(3, 24, 10, IRON[3])
  s.hl(1, 27, 14, H('#5a0a14'))
  s.outline(OUT)
  return sprite(finish(s, 3), 0, -14)
}

function bin(): ObjSprite {
  const s = new Px(16, 18)
  s.ellipse(8, 16.5, 5.5, 1.3, SH)
  s.rect(4, 5, 8, 11, H('#2e6a4a'))
  for (let x = 5; x < 12; x += 2) s.vl(x, 6, 9, H('#3f8a60'))
  s.vl(4, 5, 11, H('#4aa070'))
  s.vl(11, 5, 11, H('#1a4a32'))
  s.hl(4, 15, 8, H('#1a4a32'))
  s.ellipse(8, 4.5, 5, 2, H('#3f8a60'))
  s.hl(4, 3, 8, H('#6ac08a'))
  s.set(7, 2, H('#6ac08a'))
  s.set(8, 2, H('#6ac08a'))
  s.hl(5, 6, 6, withAlpha(SHC, 80))
  s.outline(OUT)
  return sprite(finish(s, 2), 0, -2)
}

function hydrant(): ObjSprite {
  const s = new Px(16, 18)
  s.ellipse(8, 16.5, 5, 1.3, SH)
  const r = REDC
  s.rect(4, 15, 8, 1, r[0])
  s.rect(5, 6, 6, 9, r[2])
  s.vl(5, 6, 9, r[3])
  s.vl(10, 6, 9, r[1])
  s.rect(4, 5, 8, 2, r[3])
  s.hl(4, 5, 8, r[4])
  s.ellipse(8, 3.5, 3, 2, r[2])
  s.set(7, 2, r[4])
  s.set(8, 1, METAL[3])
  s.rect(2, 8, 3, 3, METAL[3])
  s.rect(11, 8, 3, 3, METAL[2])
  s.set(2, 8, METAL[4])
  s.rect(7, 9, 2, 2, METAL[3])
  s.outline(OUT)
  return sprite(finish(s, 2), 0, -2)
}

function cafe(): ObjSprite {
  const s = new Px(16, 32)
  s.ellipse(8, 30.5, 7, 1.4, SH)
  // parasol
  for (let y = 0; y < 8; y++) {
    const hw = Math.min(7, 1 + y * 1.2)
    for (let x = Math.round(8 - hw); x <= Math.round(7 + hw); x++) {
      const stripe = Math.floor((x - 8 + 16) / 3) % 2
      let c = stripe ? WHITE : TEAL[2]
      if (y === 7) c = stripe ? WHITEWALL[1] : TEAL[1]
      else if (x < 8 && y < 6) c = stripe ? WHITE : TEAL[3]
      s.set(x, y, c)
    }
  }
  s.set(7, 0, GOLD[3])
  s.vl(7, 8, 13, METAL[3])
  // round table + two chairs
  s.ellipse(8, 21, 6, 1.8, WHITEWALL[3])
  s.hl(3, 21, 10, WHITEWALL[4])
  s.hl(3, 22, 10, WHITEWALL[1])
  s.vl(7, 23, 5, METAL[2])
  s.hl(5, 28, 6, METAL[1])
  for (const cx of [0, 13]) {
    s.rect(cx, 22, 3, 2, WOOD[3])
    s.vl(cx + (cx ? 2 : 0), 17, 5, WOOD[2])
    s.vl(cx, 24, 5, METAL[1])
    s.vl(cx + 2, 24, 5, METAL[1])
  }
  s.set(9, 20, H('#fff4c8'))
  s.set(10, 20, H('#c98c56'))
  s.outline(OUT)
  return sprite(finish(s, 2), 0, -16)
}

function palm(): ObjSprite {
  const s = new Px(20, 36)
  s.ellipse(10, 34.5, 6, 1.4, SH)
  // brass planter
  s.rect(5, 27, 10, 7, GOLD[2])
  s.vl(5, 27, 7, GOLD[4])
  s.vl(6, 28, 5, GOLD[3])
  s.vl(14, 27, 7, GOLD[0])
  s.hl(4, 26, 12, GOLD[3])
  s.hl(5, 33, 10, GOLD[1])
  s.hl(6, 25, 8, WOOD[0])
  // trunk rings
  for (let y = 12; y < 26; y++) s.hl(9, y, 2, y % 3 === 0 ? WOOD[1] : WOOD[3])
  // fronds arching out from the crown
  const leaf = PALS.meadow.tree
  for (const [dx, dy, len] of [
    [-1, -0.2, 9],
    [1, -0.2, 9],
    [-1, 0.5, 8],
    [1, 0.5, 8],
    [-0.4, -1, 7],
    [0.5, -1, 7],
  ]) {
    for (let k = 0; k < len; k++) {
      const x = Math.round(10 + dx * k)
      const y = Math.round(12 + dy * k + (k * k) / 14)
      s.set(x, y, leaf[k < 3 ? 3 : 2])
      s.set(x, y + 1, leaf[1])
      if (k % 2) s.set(x + (dx < 0 ? 0 : 0), y + 2, leaf[1])
    }
  }
  s.outline(OUT)
  return sprite(finish(s, 3), -2, -20)
}

function stanchion(): ObjSprite {
  const s = new Px(16, 20)
  for (const px of [1, 13]) {
    s.ellipse(px + 1, 18, 2.5, 1, SH)
    s.hl(px - 1, 17, 5, GOLD[1])
    s.hl(px - 1, 16, 5, GOLD[3])
    s.vl(px + 1, 6, 10, GOLD[2])
    s.vl(px, 7, 9, GOLD[4])
    s.ellipse(px + 1, 5, 1.6, 1.6, GOLD[3])
    s.set(px, 4, GOLD[4])
  }
  // velvet rope sagging between the posts
  for (let x = 3; x < 14; x++) {
    const y = 7 + Math.round(Math.sin(((x - 3) / 10) * Math.PI) * 3)
    s.set(x, y, RUG[2])
    s.set(x, y + 1, RUG[1])
  }
  s.outline(OUT)
  return sprite(finish(s, 2), 0, -4)
}

function sconce(): ObjSprite {
  const s = new Px(16, 16)
  s.rect(6, 6, 4, 6, GOLD[2])
  s.vl(6, 6, 6, GOLD[4])
  s.vl(9, 6, 6, GOLD[1])
  s.set(7, 12, GOLD[1])
  s.set(8, 12, GOLD[1])
  // frosted tulip shade
  s.hl(4, 1, 8, H('#fff4d8'))
  s.rect(5, 2, 6, 3, H('#ffe7b0'))
  s.set(5, 2, WHITE)
  s.hl(5, 5, 6, GOLD[3])
  s.outline(OUT)
  return sprite(s, 0, 2)
}

function crate(): ObjSprite {
  const s = new Px(16, 18)
  s.rect(1, 15, 14, 2, SH)
  s.rect(2, 3, 12, 12, WOOD[2])
  for (let y = 4; y < 15; y += 3) s.hl(2, y, 12, WOOD[1])
  frame(s, 2, 3, 12, 12, WOOD[3])
  s.hl(2, 14, 12, WOOD[1])
  for (let k = 0; k < 10; k++) s.set(3 + k, 13 - k, WOOD[4])
  // stencilled gold C
  stamp(s, ['.ggg', 'g...', 'g...', '.ggg'], 6, 7, { g: GOLD[2] })
  s.outline(OUT)
  return sprite(finish(s, 2), 0, -2)
}

function barrel(): ObjSprite {
  const s = new Px(16, 20)
  s.ellipse(8, 18.5, 6, 1.4, SH)
  s.rect(3, 4, 10, 14, PURP[0])
  s.vl(3, 4, 14, PURP[1])
  s.vl(4, 4, 14, PURP[2])
  s.vl(12, 4, 14, OBS[2])
  for (const y of [6, 11, 16]) s.hl(3, y, 10, IRON[2])
  s.ellipse(8, 4, 5, 1.6, OBS[3])
  s.set(10, 4, IRON[1])
  s.rect(6, 8, 4, 2, GOLD[2])
  s.set(6, 8, GOLD[4])
  s.outline(OUT)
  return sprite(finish(s, 2), 0, -4)
}

/** Actual collection miniatures set into hand-drawn furniture. Missing atlases retain a quiet silhouette. */
function artObject(kind: 'frame' | 'billboard' | 'pedestal', idx: number): ObjSprite {
  const board = kind === 'billboard'
  const plinth = kind === 'pedestal'
  const p = new Px(board ? 52 : 26, plinth ? 26 : 40)
  if (plinth) {
    p.ellipse(12, 21, 11, 2.8, SH)
    // marble plinth with a brass emitter ring on top
    p.rect(5, 9, 14, 11, MARBLE[2])
    p.vl(5, 9, 11, MARBLE[4])
    p.vl(6, 9, 11, MARBLE[3])
    p.vl(18, 9, 11, MARBLE[1])
    p.rect(3, 6, 18, 4, MARBLE[3])
    p.hl(3, 6, 18, MARBLE[4])
    p.hl(3, 9, 18, MARBLE[1])
    p.rect(3, 19, 18, 3, MARBLE[1])
    p.hl(3, 19, 18, MARBLE[2])
    p.rect(9, 12, 6, 4, GOLD[1])
    p.hl(9, 12, 6, GOLD[3])
    p.hl(10, 14, 4, GOLD[4])
    p.hl(6, 7, 12, TEAL[3])
    p.hl(8, 6, 8, TEAL[4])
    return sprite(p, -4, -7)
  }
  if (board) {
    // lattice legs + catwalk, frame with three hooded spot lamps
    for (const lx of [7, 38]) {
      p.rect(lx, 23, 3, 12, IRON[2])
      p.vl(lx, 23, 12, IRON[4])
      for (let y = 25; y < 34; y += 3) p.set(lx + 1, y, IRON[0])
    }
    p.ellipse(9, 35, 5, 1.2, SH)
    p.ellipse(40, 35, 5, 1.2, SH)
    p.rect(1, 2, 46, 27, idx === 67 ? H('#650f20') : IRON[0])
    p.rect(2, 3, 44, 25, GOLD[2])
    p.hl(2, 3, 44, GOLD[4])
    p.hl(2, 27, 44, GOLD[0])
    p.rect(3, 4, 42, 23, idx === 67 ? H('#11131b') : OBS[1])
    if (idx === 67) {
      text(p, 'NO', 22, 7, GOLD[4], 1, H('#4b1220'))
      text(p, 'CABALD', 20, 15, H('#ff5a68'), 1, H('#4b1220'))
      p.rect(4, 5, 16, 1, H('#e83b4d'))
      p.rect(4, 22, 16, 1, GOLD[3])
    } else {
      text(p, 'REMY', 27, 8, GOLD[4])
      text(p, 'ART', 29, 15, TEAL[3])
      p.hl(27, 22, 14, GOLD[1])
    }
    p.rect(4, 29, 40, 2, IRON[1])
    p.hl(4, 29, 40, IRON[3])
    for (const x of [6, 23, 40]) {
      p.vl(x + 1, 0, 2, IRON[2])
      p.rect(x, 0, 3, 2, IRON[3])
      p.hl(x, 1, 3, CREAM[4])
    }
  } else {
    p.rect(1, 1, 23, 29, SH2)
    p.rect(0, 0, 24, 26, GOLD[0])
    p.rect(1, 1, 22, 24, GOLD[2])
    frame(p, 2, 2, 20, 22, GOLD[4])
    frame(p, 3, 3, 18, 20, GOLD[1])
    for (let i = 4; i < 20; i += 3) {
      p.set(i, 1, GOLD[3])
      p.set(i, 24, GOLD[1])
    }
    for (const x of [0, 21]) for (const y of [0, 23]) p.rect(x, y, 3, 3, GOLD[3])
    // museum label card
    p.rect(7, 28, 10, 4, CREAM[4])
    p.hl(7, 31, 10, CREAM[1])
    p.hl(8, 29, 6, STONE[1])
    p.hl(8, 30, 4, STONE[2])
  }
  const img = p.toCanvas()
  const ctx = img.getContext('2d') as CanvasRenderingContext2D
  ctx.imageSmoothingEnabled = false
  const mini = art.mini(idx)
  const x = board ? (idx === 67 ? 4 : 5) : 4
  const y = board ? 6 : 4
  const size = board ? (idx === 67 ? 16 : 20) : 16
  if (mini) ctx.drawImage(mini.img, mini.sx, mini.sy, mini.sw, mini.sh, x, y, size, size)
  else {
    ctx.fillStyle = '#263843'
    ctx.fillRect(x, y, size, size)
    ctx.fillStyle = '#b5a58e'
    ctx.fillRect(x + size / 4, y + 3, size / 2, size / 2)
    ctx.fillStyle = '#e2c88c'
    ctx.fillRect(x + size / 4 + 1, y + size - 5, size / 2 - 2, 4)
  }
  return { img, ox: board ? 0 : -4, oy: board ? -22 : -19 }
}

let spotImg: HTMLCanvasElement | undefined
function spotlight(): HTMLCanvasElement {
  if (!spotImg) {
    const p = new Px(32, 42)
    for (let y = 0; y < 42; y++) {
      const half = 2 + Math.floor(y / 3)
      p.hl(16 - half, y, half * 2, withAlpha(GOLD[4], Math.round(22 * (1 - y / 48))))
    }
    spotImg = p.toCanvas()
  }
  return spotImg
}

// ---------------------------------------------------------------------------------------------------------------

const artSprites = new Map<string, ObjSprite>()
const spriteCache = new Map<string, ObjSprite>()

export function objectSprite(o: MapObject, theme: Theme): ObjSprite {
  if (o.kind === 'frame' || o.kind === 'billboard' || o.kind === 'pedestal') {
    const idx = o.idx ?? 0
    const key = `${o.kind}|${idx}|${art.mini(idx) ? 1 : 0}`
    let s = artSprites.get(key)
    if (!s) {
      s = artObject(o.kind, idx)
      artSprites.set(key, s)
    }
    return s
  }
  const variant = o.kind === 'house' ? Math.floor(hash(o.x, o.y, 5) * ROOFS.length) : o.kind === 'bridge_gate' ? gateVariant(o.chain) : 0
  const themed = o.kind === 'flowerpot' || o.kind === 'rock' || o.kind === 'planter'
  const key = `${o.kind}|${variant}|${themed ? theme : ''}`
  let s = spriteCache.get(key)
  if (!s) {
    s = MAKERS[o.kind](variant, theme)
    spriteCache.set(key, s)
  }
  return s
}

const MAKERS: Record<Exclude<ObjKind, 'frame' | 'billboard' | 'pedestal'>, (variant: number, theme: Theme) => ObjSprite> = {
  house: (v) => house(v),
  lab,
  center,
  mart,
  exchange,
  tower,
  sign,
  lamp,
  atm,
  server,
  mailbox,
  flowerpot: (_v, t) => flowerpot(t),
  rock: (_v, t) => rock(t),
  crystal,
  candle_green: () => candle(true),
  candle_red: () => candle(false),
  statue,
  bench,
  fountain,
  terminal,
  departure_board: departureBoard,
  bridge_gate: bridgeGate,
  bag_scanner: bagScanner,
  planter: (_v, t) => planter(t),
  vending,
  bin,
  hydrant,
  cafe,
  palm,
  stanchion,
  sconce,
  crate,
  barrel,
}

// ---------------------------------------------------------------------------------------------------------------
// Animated overlays

const glowCache = new Map<string, HTMLCanvasElement>()
/** Quantized (stepped) radial glow, for crisp pixel-art lighting. */
export function glowSprite(r: number, rgb: string, steps = 4): HTMLCanvasElement {
  const key = `${r}|${rgb}|${steps}`
  let c = glowCache.get(key)
  if (!c) {
    const [cr, cg, cb] = rgb.split(',').map(Number)
    const p = new Px(r * 2, r * 2)
    for (let y = 0; y < r * 2; y++)
      for (let x = 0; x < r * 2; x++) {
        const d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r
        if (d >= 1) continue
        const q = Math.ceil((1 - d) * steps) / steps
        p.put(x, y, pack(cr, cg, cb, Math.round(q * q * 255)))
      }
    c = p.toCanvas()
    glowCache.set(key, c)
  }
  return c
}

function fill(ctx: CanvasRenderingContext2D, c: string, x: number, y: number, w = 1, h = 1): void {
  ctx.fillStyle = c
  ctx.fillRect(x, y, w, h)
}

/** Per-frame bits for one object. sx/sy = view-space footprint top-left. Pushes light sources into `lights`. */
export function drawObjectAnim(
  ctx: CanvasRenderingContext2D,
  o: MapObject,
  theme: Theme,
  sx: number,
  sy: number,
  t: number,
  lights: Light[],
): void {
  const L = sky.lamps
  const spr = objectSprite(o, theme)
  if (spr.wins || spr.lamps || spr.neon || spr.glow || spr.bulbs || spr.smoke) drawFacade(ctx, spr, o, sx, sy, t, lights)
  const opened = openDoors.get(o)
  if (opened !== undefined && spr.door) drawDoorOpen(ctx, spr.door, sx + spr.ox, sy + spr.oy, t - opened, lights)
  switch (o.kind) {
    case 'terminal':
    case 'departure_board':
    case 'bridge_gate':
    case 'bag_scanner':
      drawTerminalAnim(ctx, o, sx, sy, t, lights)
      break
    case 'frame':
      ctx.drawImage(spotlight(), sx - 8, sy - 25)
      lights.push({ x: sx + 8, y: sy + 6, r: 12, rgb: '255,211,130', a: 0.45 })
      break
    case 'billboard': {
      // hooded spot lamps wash the board after dark
      if (L > 0.01) {
        ctx.fillStyle = '#fff4d0'
        for (const x of [6, 23, 40]) {
          ctx.globalAlpha = L
          ctx.fillRect(sx + x, sy - 21, 3, 1)
          for (let k = 0; k < 3; k++) {
            ctx.globalAlpha = L * (0.22 - k * 0.06)
            ctx.fillRect(sx + x - 2 - k * 2, sy - 18 + k * 2, 7 + k * 4, 2)
          }
        }
        ctx.globalAlpha = 1
        lights.push({ x: sx + 24, y: sy - 8, r: 22, rgb: '255,236,190', a: 0.7 * L })
      }
      break
    }
    case 'pedestal': {
      const head = art.head(o.idx ?? 0)
      const bob = Math.round(Math.sin(t * 2 + o.x) * 2)
      ctx.globalAlpha = 0.85 + Math.sin(t * 3) * 0.1
      if (head) ctx.drawImage(head.img, head.sx, head.sy, head.sw, head.sh, sx, sy - 21 + bob, 16, 16)
      else fill(ctx, '#b9ffe6', sx + 4, sy - 17 + bob, 8, 8)
      ctx.globalAlpha = 0.28
      fill(ctx, '#c0ffed', sx + 3, sy - 10 + bob + (Math.floor(t * 9) % 6), 10, 1)
      ctx.globalAlpha = 1
      lights.push({ x: sx + 8, y: sy - 4, r: 14, rgb: '105,245,211', a: 0.6 })
      break
    }
    case 'lamp': {
      if (L > 0.01) {
        const flick = 0.92 + Math.sin(t * 13 + o.x) * 0.04 + Math.sin(t * 7.3 + o.y) * 0.04
        ctx.globalAlpha = L
        fill(ctx, '#ffc860', sx + 6, sy - 12, 4, 6)
        fill(ctx, '#fff4c8', sx + 6, sy - 11, 1, 4)
        fill(ctx, '#ffe7a0', sx + 9, sy - 11, 1, 3)
        ctx.globalAlpha = 1
        lights.push({ x: sx + 8, y: sy + 12, r: 28, rgb: '255,196,110', a: 0.85 * L * flick })
        lights.push({ x: sx + 8, y: sy - 9, r: 8, rgb: '255,220,150', a: 0.6 * L })
      }
      break
    }
    case 'crystal': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + o.x * 0.7)
      // a shimmer band climbs the prisms
      const band = Math.floor((t * 14 + o.x * 5) % 34)
      ctx.globalAlpha = 0.35 + pulse * 0.45
      fill(ctx, '#d6e4ff', sx + 7, sy - 10, 1, 8)
      fill(ctx, '#8cb4ff', sx + 3, sy + 1, 1, 5)
      fill(ctx, '#8cb4ff', sx + 11, sy - 1, 1, 6)
      ctx.globalAlpha = 0.8
      if (band < 22) fill(ctx, '#ffffff', sx + 6, sy - 11 + 22 - band, 3, 1)
      ctx.globalAlpha = 1
      if (Math.floor(t * 6) % 12 < 3) {
        const sp = [
          [4, -7],
          [12, -3],
          [9, -11],
        ][Math.floor(t / 2) % 3]
        fill(ctx, '#ffffff', sx + sp[0], sy + sp[1] - 1, 1, 3)
        fill(ctx, '#ffffff', sx + sp[0] - 1, sy + sp[1], 3, 1)
      }
      lights.push({ x: sx + 8, y: sy + 2, r: 16, rgb: '60,130,255', a: 0.45 + pulse * 0.25 })
      break
    }
    case 'server': {
      const step = Math.floor(t * 6)
      for (let u = 0; u < 5; u++) {
        const y = sy - 8 + 3 + u * 4 + 1
        fill(ctx, hash(step, u, o.x * 31 + o.y) > 0.3 ? '#4ade80' : '#14532d', sx + 10, y)
        fill(ctx, hash(step >> 1, u + 7, o.x) > 0.5 ? '#60a5fa' : '#1e3a8a', sx + 11, y)
      }
      lights.push({ x: sx + 8, y: sy + 2, r: 8, rgb: '80,220,140', a: 0.4 })
      break
    }
    case 'atm': {
      const off = Math.floor(t * 8)
      fill(ctx, '#0a1830', sx + 4, sy - 2, 8, 5)
      for (let i = 0; i < 8; i++) {
        const v = Math.floor(hash(i + off, 3, o.x) * 3)
        fill(ctx, v > 0 ? '#4ade80' : '#f87171', sx + 4 + i, sy - 1 + v)
      }
      if (Math.floor(t * 2) % 2) fill(ctx, '#bfe4ff', sx + 11, sy + 5)
      lights.push({ x: sx + 8, y: sy + 4, r: 10, rgb: '90,160,255', a: 0.5 })
      break
    }
    case 'vending': {
      ctx.globalAlpha = 0.3 + 0.5 * L
      fill(ctx, '#e8f6ff', sx + 3, sy - 11, 8, 1)
      fill(ctx, '#bfe4ff', sx + 3, sy - 11, 1, 15)
      ctx.globalAlpha = 1
      lights.push({ x: sx + 8, y: sy + 6, r: 12, rgb: '190,225,255', a: 0.55 })
      break
    }
    case 'sconce':
      lights.push({ x: sx + 8, y: sy + 8, r: 16, rgb: '255,214,150', a: 0.6 })
      break
    case 'cafe':
      if (L > 0.01) {
        // string of fairy lights along the parasol hem
        for (let i = 0; i < 5; i++) fill(ctx, (i + Math.floor(t * 3)) % 2 ? '#fff0b0' : '#ffb060', sx + 2 + i * 3, sy - 8)
        lights.push({ x: sx + 8, y: sy + 6, r: 12, rgb: '255,200,130', a: 0.6 * L })
      }
      break
    case 'exchange':
      drawTicker(ctx, sx + 9, sy - 32 + 48, 94, 10, t)
      lights.push({ x: sx + 56, y: sy + 21, r: 30, rgb: '120,200,255', a: 0.5 })
      break
    case 'tower': {
      const base = sy - 32
      for (const [wx, wy] of TOWER_WINDOWS) {
        const ph = Math.sin(t * 1.7 + wy * 0.05 + wx * 0.13)
        ctx.globalAlpha = 0.25 + 0.75 * Math.max(0, ph)
        fill(ctx, '#f0c8ff', sx + wx + 1, base + wy + 2, 1, 4)
        if (ph > 0.7) fill(ctx, '#ffffff', sx + wx + 1, base + wy + 3, 1, 1)
      }
      const pulse = 0.5 + 0.5 * Math.sin(t * 2)
      ctx.globalAlpha = 0.4 + 0.6 * pulse
      fill(ctx, '#ffffff', sx + 40, base + 91, 1, 1)
      fill(ctx, '#f0c8ff', sx + 39, base + 91, 3, 1)
      fill(ctx, '#f0c8ff', sx + 40, base + 90, 1, 3)
      ctx.globalAlpha = 1
      lights.push({ x: sx + 40, y: base + 91, r: 22, rgb: '190,90,255', a: 0.5 + pulse * 0.3 })
      lights.push({ x: sx + 40, y: base + 126, r: 18, rgb: '160,60,255', a: 0.7 })
      lights.push({ x: sx + 40, y: base + 3, r: 10, rgb: '220,120,255', a: 0.8 * pulse })
      break
    }
    case 'fountain':
      drawFountainWater(ctx, sx, sy, t)
      lights.push({ x: sx + 24, y: sy + 30, r: 18, rgb: '140,200,255', a: 0.25 * L })
      break
    case 'candle_green':
    case 'candle_red': {
      const g = o.kind === 'candle_green'
      const [top, bot] = g ? [8, 28] : [12, 24]
      const base = sy - 24
      const cyc = (t * 0.6 + o.x * 0.37) % 3
      if (cyc < 1) {
        const y = Math.floor(bot - cyc * (bot - top + 4))
        ctx.globalAlpha = 0.8
        if (y >= top && y < bot) fill(ctx, '#ffffff', sx + 5, base + y, 2, 1)
        if (y + 1 >= top && y + 1 < bot) fill(ctx, g ? '#c8ffe0' : '#ffd8d8', sx + 4, base + y + 1, 4, 1)
        ctx.globalAlpha = 1
      }
      // live price tick hunting along the wick
      const ty = base + top + Math.round((0.5 + 0.5 * Math.sin(t * 1.3 + o.x)) * (bot - top))
      fill(ctx, g ? '#6ee7a0' : '#fb8a8a', sx + 12, ty, 2, 1)
      lights.push({ x: sx + 8, y: sy + 2, r: 16, rgb: g ? '60,220,120' : '255,70,70', a: 0.55 })
      break
    }
    case 'statue': {
      const k = (t + o.x * 0.5) % 4
      if (k < 0.35) {
        const s = k < 0.12 || k > 0.24 ? 1 : 2
        fill(ctx, '#ffffff', sx + 5, sy - 9 - s + 1, 1, s * 2 - 1)
        fill(ctx, '#ffffff', sx + 5 - s + 1, sy - 9, s * 2 - 1, 1)
      }
      break
    }
    case 'lab':
      for (let i = 0; i < 4; i++) {
        const on = hash(Math.floor(t * 3), i, o.x) > 0.4
        fill(ctx, on ? '#8cd8ff' : '#2a4a7a', sx + [14, 28, 69, 83][i] - 7, sy - 28 + 59)
      }
      if (Math.floor(t * 1.5) % 2) {
        fill(ctx, '#ffb0b0', sx + 28, sy - 27)
        lights.push({ x: sx + 28, y: sy - 27, r: 6, rgb: '255,80,80', a: 0.8 })
      }
      break
    default:
      break
  }
}

/** Scrolling LED ticker of green/red candles + prices inside the Exchange marquee. */
function drawTicker(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number): void {
  const scroll = Math.floor(t * 12)
  for (let i = 0; i < w; i++) {
    const u = i + scroll
    const slot = Math.floor(u / 4)
    if (u % 4 === 3) continue
    const up = hash(slot, 0, 99) > 0.42
    const bodyH = 1 + Math.floor(hash(slot, 1, 99) * 4)
    const mid = y + 2 + Math.floor((Math.sin(slot * 0.35) * 0.5 + 0.5) * (h - 4 - bodyH))
    const col = up ? '#22e06a' : '#ff4a4a'
    if (u % 4 === 1) fill(ctx, col, x + i, mid - 1, 1, bodyH + 2)
    else fill(ctx, col, x + i, mid, 1, bodyH)
  }
  ctx.globalAlpha = 0.25
  fill(ctx, '#9cc8ff', x, y, w, 1)
  ctx.globalAlpha = 1
}

function drawFountainWater(ctx: CanvasRenderingContext2D, sx: number, sy: number, t: number): void {
  const water = PALS.town.water
  // ripple rings spreading from the pedestal
  ctx.fillStyle = css(water[3])
  for (let k = 0; k < 2; k++) {
    const ph = (t * 0.6 + k * 0.5) % 1
    const rx = Math.round(7 + ph * 11)
    const ry = Math.round(2.5 + ph * 6)
    ctx.globalAlpha = 0.7 * (1 - ph)
    for (let a = 0; a < 28; a++) {
      const ang = (a / 28) * Math.PI * 2
      if (Math.sin(ang) > -0.2 || rx < 12) ctx.fillRect(sx + Math.round(24 + Math.cos(ang) * rx), sy + Math.round(30 + Math.sin(ang) * ry), 1, 1)
    }
  }
  ctx.globalAlpha = 1
  // curtains of water falling from the upper bowl, with splashes where they land
  for (const [bx, dir] of [
    [15, -1],
    [33, 1],
    [19, -0.4],
    [29, 0.4],
  ] as const) {
    for (let i = 0; i < 4; i++) {
      const ph = (t * 2.2 + i * 0.25 + bx * 0.03) % 1
      fill(ctx, i % 2 ? '#e6f6ff' : '#79bdff', sx + bx + Math.round(dir * ph * 3), sy + 16 + Math.round(ph * ph * 12), 1, 2)
    }
    const sp = Math.floor(t * 10 + bx) % 4
    if (sp < 2) fill(ctx, '#e6f6ff', sx + bx + Math.round(dir * 3) - sp, sy + 27 - sp, 1, 1)
  }
  // spray: droplets arcing up from the finial and falling back into the bowl
  for (let i = 0; i < 6; i++) {
    const ph = (t * 1.6 + i / 6) % 1
    const dir = i % 2 ? 1 : -1
    const x = sx + 24 + Math.round(dir * ph * (3 + (i % 3)))
    const y = sy + 3 - Math.round(Math.sin(ph * Math.PI) * 5) + Math.round(ph * 8)
    fill(ctx, i % 3 ? '#e6f6ff' : '#bfe4ff', x, y, 1, 1)
  }
  const j = Math.floor(t * 8) % 3
  fill(ctx, '#e6f6ff', sx + 23, sy + 1 - j, 2, 2 + j)
  // glints on the surface
  const s = Math.floor(t * 5)
  for (let i = 0; i < 4; i++) {
    const x = 8 + Math.floor(hash(s, i, 3) * 32)
    const y = 24 + Math.floor(hash(s, i, 4) * 12)
    const dx = x - 24
    const dy = (y - 30) * 1.8
    if (dx * dx + dy * dy < 17 * 17 && Math.abs(dx) > 5) fill(ctx, '#ffffff', sx + x, sy + y)
  }
}
