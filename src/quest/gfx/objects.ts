/**
 * Buildings + decor, drawn procedurally into cached sprites. Each sprite is positioned relative to the object's
 * footprint top-left; rows above the footprint (negative `oy`) are the overhang that also goes into the `above` layer.
 * `drawObjectAnim` adds the cheap per-frame bits (tickers, LEDs, fountain water, glows) and reports light sources.
 */
import { art } from '../art'
import type { MapObject, ObjKind, Theme } from '../types'
import { BASE, OUT, PALS } from './palette'
import { type Col, Px, css, hash, hex, mix, pack, ramp, shade, stamp, text, textWidth, withAlpha } from './px'
import { bagScanner, bridgeGate, departureBoard, drawTerminalAnim, gateVariant, terminal } from './terminal'

export interface ObjSprite {
  img: HTMLCanvasElement
  /** Sprite offset from footprint top-left in px (ox ≤ 0, oy ≤ 0 = overhang). */
  ox: number
  oy: number
}

/** A light source in view space; `drawAmbient` turns these into additive glows. */
export interface Light {
  x: number
  y: number
  r: number
  rgb: string
  a: number
}

const H = hex
const SH = withAlpha(H('#1a1030'), 64)
const SH2 = withAlpha(H('#1a1030'), 36)
const GLASS = [H('#23407a'), H('#3f78c8'), H('#79b8f0'), H('#bfe4ff'), H('#ffffff')]
const WHITEWALL = [H('#9aa4b8'), H('#c8d0de'), H('#e6eaf2'), H('#f8faff'), H('#ffffff')]
const CREAM = [H('#a8906a'), H('#d8c49c'), H('#efe2c2'), H('#faf2dc'), H('#fffaf0')]
const STONE = [H('#4a4a58'), H('#7c7c8c'), H('#a2a2b2'), H('#c6c6d2'), H('#e2e2ea')]
const WOOD = [H('#3e2414'), H('#7a4c2a'), H('#a26a3c'), H('#c98c56'), H('#e6b07a')]
const GOLD = [H('#5a3408'), H('#a8701a'), H('#e0a82c'), H('#ffd65a'), H('#fff3b0')]
const IRON = [H('#141620'), H('#2a2e3c'), H('#444a5c'), H('#687088'), H('#98a0b8')]
const TEAL = [H('#0a4a48'), H('#0f8a82'), H('#14b8a6'), H('#5eead4'), H('#c6fff4')]
const OBS = [H('#07040e'), H('#150f24'), H('#241a3a'), H('#3a2d58'), H('#5e4a8a')]
const PURP = [H('#5a1a9a'), H('#9a3ae8'), H('#c070ff'), H('#e6b8ff'), H('#fff0ff')]
const RUG = [H('#4a0a14'), H('#8a1422'), H('#c42032'), H('#e84a52'), H('#ff8a80')]
const GREENC = [H('#0a3a1e'), H('#15803d'), H('#22c55e'), H('#6ee7a0'), H('#c8ffe0')]
const REDC = [H('#4a0a0e'), H('#b91c1c'), H('#ef4444'), H('#fb8a8a'), H('#ffd8d8')]

const ROOFS = ['#d9463b', '#3a6fd6', '#3b9a58', '#8b5bc8', '#e4843a', '#1fa3a3'].map((c) => H(c))

// ---------------------------------------------------------------------------------------------------------------
// Shared building parts

function frame(p: Px, x: number, y: number, w: number, h: number, c: Col): void {
  p.hl(x, y, w, c)
  p.hl(x, y + h - 1, w, c)
  p.vl(x, y, h, c)
  p.vl(x + w - 1, y, h, c)
}

/** Glass pane with top shade + diagonal shine streaks. */
function glass(p: Px, x: number, y: number, w: number, h: number, g: Col[] = GLASS): void {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const d = (i + j) % 14
      let c = j === 0 ? g[1] : j < 2 ? mix(g[2], g[1], 0.5) : g[2]
      if (d === 5 || d === 6) c = g[3]
      if (d === 8) c = mix(g[2], g[3], 0.5)
      if (i === w - 1 && j > 0) c = mix(c, g[1], 0.5)
      p.set(x + i, y + j, c)
    }
}

function window4(p: Px, x: number, y: number, w: number, h: number, frameC: Col, box?: Col[]): void {
  p.rect(x - 1, y - 1, w + 2, h + 2, OUT)
  p.rect(x, y, w, h, frameC)
  glass(p, x + 1, y + 1, w - 2, h - 2)
  const mx = x + (w >> 1)
  const my = y + (h >> 1)
  p.vl(mx, y + 1, h - 2, frameC)
  p.hl(x + 1, my, w - 2, frameC)
  p.hl(x, y + h, w, SH)
  if (box) {
    p.rect(x - 1, y + h, w + 2, 3, WOOD[1])
    p.hl(x - 1, y + h, w + 2, WOOD[3])
    p.hl(x - 1, y + h + 3, w + 2, OUT)
    for (let i = 0; i < w; i += 2) {
      p.set(x + i, y + h - 1, box[(i >> 1) % box.length])
      p.set(x + i + 1, y + h - 1, H('#3a9a4a'))
    }
  }
}

function glassDoor(p: Px, x: number, y: number, w: number, h: number, frameC: Col): void {
  p.rect(x - 1, y - 1, w + 2, h + 1, OUT)
  p.rect(x, y, w, h, frameC)
  const half = (w - 3) >> 1
  glass(p, x + 1, y + 1, half, h - 1, [GLASS[0], GLASS[1], H('#9ad8ff'), H('#d8f4ff'), GLASS[4]])
  glass(p, x + 2 + half, y + 1, w - 3 - half, h - 1, [GLASS[0], GLASS[1], H('#9ad8ff'), H('#d8f4ff'), GLASS[4]])
  p.vl(x + 1 + half, y + 1, h - 1, OUT)
  // push bars
  p.hl(x + half - 2, y + (h >> 1), 2, STONE[4])
  p.hl(x + half + 3, y + (h >> 1), 2, STONE[4])
  // floor mat
  p.hl(x, y + h - 1, w, STONE[1])
}

/** Shingle roof between rows y0..y1: staggered shingles, lit left hip, shaded right hip, darker toward the eave. */
function shingleRoof(p: Px, x0: number, x1: number, y0: number, y1: number, rc: Col[], taper = 0.5, ridgeRows = 10): void {
  const span = y1 - y0
  for (let y = y0; y <= y1; y++) {
    const k = y - y0
    const inset = k < ridgeRows ? Math.round((ridgeRows - k) * taper) : 0
    const r = k % 4
    const off = Math.floor(k / 4) % 2 ? 3 : 0
    const left = x0 + inset
    const right = x1 - inset
    for (let x = left; x <= right; x++) {
      const u = (x - left) / Math.max(1, right - left)
      let t = 2
      if (r === 0) t = 3
      else if (r === 3) t = 1
      else if ((x + off) % 6 === 0) t = 1
      else if ((x + off) % 6 === 1 && r === 1) t = 3
      if (k / span > 0.72 && t > 1) t--
      if (u < 0.07) t = Math.min(4, t + 1)
      else if (u > 0.93) t = Math.max(0, t - 1)
      if (k === 0) t = 4
      p.set(x, y, rc[t])
    }
  }
}

function sprite(p: Px, ox: number, oy: number): ObjSprite {
  return { img: p.toCanvas(), ox, oy }
}

// ---------------------------------------------------------------------------------------------------------------
// Buildings

function house(variant: number): ObjSprite {
  const p = new Px(64, 64)
  const rc = ramp(ROOFS[variant % ROOFS.length])
  const wall = CREAM
  // walls: lap siding, lit left corner, shaded right corner, stone footing
  p.rect(3, 34, 58, 30, wall[2])
  for (let y = 34; y < 61; y++) if ((y - 34) % 5 === 4) p.hl(3, y, 58, wall[1])
  p.vl(3, 34, 27, wall[3])
  p.vl(4, 34, 27, wall[3])
  p.vl(59, 34, 27, wall[1])
  p.vl(60, 34, 27, wall[0])
  p.rect(3, 59, 58, 5, STONE[2])
  p.hl(3, 59, 58, STONE[3])
  p.hl(3, 63, 58, STONE[1])
  for (let x = 6; x < 60; x += 7) p.vl(x, 60, 3, STONE[1])
  // roof
  shingleRoof(p, 1, 62, 3, 35, rc, 0.55, 10)
  p.hl(1, 33, 62, rc[4])
  p.hl(1, 34, 62, rc[1])
  p.hl(1, 35, 62, rc[0])
  p.hl(3, 36, 58, SH)
  p.hl(3, 37, 58, SH2)
  // chimney
  p.rect(10, 2, 7, 10, H('#9a4a3a'))
  p.vl(10, 2, 10, H('#c26a52'))
  p.vl(16, 2, 10, H('#6a2e24'))
  p.rect(9, 0, 9, 3, STONE[3])
  p.hl(9, 0, 9, STONE[4])
  p.hl(9, 2, 9, STONE[1])
  for (let y = 5; y < 12; y += 3) p.hl(11, y, 5, H('#7a3a2e'))
  p.hl(10, 12, 7, rc[0])
  // dormer with attic window
  const dm = new Px(64, 64)
  for (let y = 11; y <= 21; y++) {
    const half = Math.round((y - 11) * 0.85) + 1
    for (let x = 45 - half; x <= 45 + half; x++) dm.set(x, y, y === 11 ? rc[4] : x < 45 ? rc[3] : x === 45 ? rc[4] : rc[2])
  }
  dm.hl(36, 21, 19, rc[1])
  dm.rect(39, 22, 13, 10, wall[2])
  dm.vl(39, 22, 10, wall[3])
  dm.vl(51, 22, 10, wall[1])
  dm.hl(39, 22, 13, SH)
  dm.rect(42, 24, 7, 6, OUT)
  glass(dm, 43, 25, 5, 4)
  dm.vl(45, 25, 4, WHITEWALL[3])
  dm.outline(OUT)
  p.blit(dm, 0, 0)
  // porch awning over the door (tile 1,2 → x16..31)
  const aw = new Px(64, 64)
  aw.rect(16, 40, 16, 3, rc[2])
  aw.hl(16, 40, 16, rc[4])
  aw.hl(16, 42, 16, rc[1])
  aw.outline(OUT)
  p.blit(aw, 0, 0)
  p.hl(17, 44, 14, SH)
  const dx = 19
  p.rect(dx - 1, 45, 12, 18, OUT)
  p.rect(dx, 46, 10, 17, WOOD[2])
  p.vl(dx, 46, 17, WOOD[3])
  p.vl(dx + 9, 46, 17, WOOD[1])
  frame(p, dx + 2, 48, 6, 6, WOOD[1])
  frame(p, dx + 2, 55, 6, 6, WOOD[1])
  p.hl(dx + 3, 49, 4, WOOD[3])
  p.hl(dx + 3, 56, 4, WOOD[3])
  p.set(dx + 7, 54, GOLD[3])
  p.set(dx + 7, 55, GOLD[1])
  p.rect(16, 62, 16, 2, STONE[3])
  p.hl(16, 63, 16, STONE[1])
  // windows
  const box = [H('#ff5a6a'), H('#ffd84a'), H('#ffffff'), H('#ff9ad2')]
  window4(p, 37, 44, 10, 9, WHITEWALL[3], box)
  window4(p, 50, 44, 9, 9, WHITEWALL[3], box)
  window4(p, 6, 44, 8, 8, WHITEWALL[3])
  // lamp by the door
  p.rect(33, 47, 2, 3, GOLD[2])
  p.set(33, 47, GOLD[4])
  p.outline(OUT)
  return sprite(p, 0, -16)
}

function coinEmblem(p: Px, cx: number, cy: number, r: number): void {
  p.ellipse(cx, cy, r + 1, r + 1, BASE[0])
  p.ellipse(cx, cy, r, r, (x, y) => {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
    if (d > r - 1.4) return x + y < cx + cy ? H('#ffffff') : BASE[4]
    return (x - cx) + (y - cy) < -r * 0.6 ? H('#ffffff') : H('#eef3ff')
  })
  stamp(p, ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], cx - 2, cy - 3, { '1': BASE[2] })
  stamp(p, ['1111', '1   ', '1   ', '111 ', '1 1 ', '1  1', '1   '], cx - 2, cy - 3, { '1': BASE[1] })
}

function center(): ObjSprite {
  const p = new Px(80, 88)
  const blue = [BASE[0], BASE[1], BASE[2], BASE[3], BASE[4]]
  // walls
  p.rect(3, 46, 74, 42, WHITEWALL[2])
  p.vl(3, 46, 40, WHITEWALL[3])
  p.vl(76, 46, 40, WHITEWALL[1])
  p.rect(3, 49, 74, 3, BASE[2])
  p.hl(3, 49, 74, BASE[3])
  p.hl(3, 52, 74, BASE[1])
  p.rect(3, 84, 74, 4, STONE[2])
  p.hl(3, 84, 74, STONE[3])
  // roof: standing-seam Base blue, lit left hip, darker toward the eave
  for (let y = 2; y <= 45; y++) {
    const k = y - 2
    const inset = k < 14 ? Math.round((14 - k) * 0.6) : 0
    const left = 1 + inset
    const right = 78 - inset
    for (let x = left; x <= right; x++) {
      const seam = (x - 1) % 5
      let t = seam === 0 ? 3 : seam === 4 ? 1 : 2
      if (k > 0 && k % 11 === 0) t = 1
      if (k < 8 && t < 4) t++
      if (k > 32 && t > 0) t--
      const u = (x - left) / (right - left)
      if (u < 0.08 && t < 4) t++
      else if (u > 0.92 && t > 0) t--
      if (k < 2) t = 4
      p.set(x, y, blue[t])
    }
  }
  p.rect(1, 42, 78, 4, WHITEWALL[3])
  p.hl(1, 42, 78, WHITEWALL[4])
  p.hl(1, 45, 78, WHITEWALL[0])
  p.hl(3, 46, 74, SH)
  coinEmblem(p, 40, 23, 10)
  // windows
  for (const wx of [7, 55]) {
    p.rect(wx - 1, 57, 20, 17, OUT)
    p.rect(wx, 58, 18, 15, WHITEWALL[4])
    glass(p, wx + 1, 59, 16, 13)
    p.vl(wx + 6, 59, 13, WHITEWALL[4])
    p.vl(wx + 12, 59, 13, WHITEWALL[4])
    p.hl(wx, 73, 18, SH)
    // little heart decals
    p.set(wx + 3, 62, H('#ff6a8a'))
    p.set(wx + 4, 63, H('#ff6a8a'))
    p.set(wx + 5, 62, H('#ff6a8a'))
  }
  // sign plate + doors (door tile 2,3 → x32..47)
  p.rect(28, 55, 24, 9, OUT)
  p.rect(29, 56, 22, 7, BASE[2])
  p.hl(29, 56, 22, BASE[3])
  text(p, 'REMY', 33, 57, H('#ffffff'))
  glassDoor(p, 33, 66, 14, 21, WHITEWALL[4])
  p.rect(31, 86, 18, 2, STONE[3])
  p.outline(OUT)
  return sprite(p, 0, -24)
}

function mart(): ObjSprite {
  const p = new Px(64, 64)
  // walls
  p.rect(3, 30, 58, 34, WHITEWALL[2])
  p.vl(3, 30, 30, WHITEWALL[3])
  p.vl(60, 30, 30, WHITEWALL[1])
  p.rect(3, 60, 58, 4, STONE[2])
  p.hl(3, 60, 58, STONE[3])
  // flat teal roof, front slope with bands
  for (let y = 4; y <= 29; y++) {
    const k = y - 4
    const inset = k < 6 ? 6 - k : 0
    for (let x = 1 + inset; x <= 62 - inset; x++) {
      let c = k % 5 === 4 ? TEAL[1] : TEAL[2]
      if (k === 0) c = TEAL[4]
      else if (k % 5 === 0) c = TEAL[3]
      p.set(x, y, c)
    }
  }
  p.hl(1, 28, 62, TEAL[0])
  p.hl(3, 30, 58, SH)
  // sign board with $ coin
  p.rect(13, 8, 38, 16, OUT)
  p.rect(14, 9, 36, 14, H('#ffffff'))
  p.hl(14, 22, 36, WHITEWALL[1])
  p.ellipse(22, 16, 5.5, 5.5, TEAL[1])
  p.ellipse(22, 16, 4.5, 4.5, TEAL[2])
  stamp(p, ['.1.', '111', '1..', '111', '..1', '111', '.1.'], 21, 13, { '1': H('#ffffff') })
  text(p, 'MART', 30, 13, TEAL[1])
  p.hl(30, 19, 15, TEAL[3])
  // awning over the window
  for (let x = 4; x < 31; x++) {
    const stripe = ((x - 4) >> 2) % 2
    for (let y = 33; y < 38; y++) p.set(x, y, stripe ? H('#ffffff') : TEAL[2])
    const drop = ((x - 4) & 3) === 1 || ((x - 4) & 3) === 2
    p.set(x, 38, drop ? (stripe ? WHITEWALL[1] : TEAL[1]) : SH)
  }
  p.hl(4, 33, 27, TEAL[4])
  // display window with shelves of goods
  p.rect(5, 40, 25, 16, OUT)
  glass(p, 6, 41, 23, 14)
  const goods = [H('#ff5a5a'), H('#ffd84a'), H('#5ad06a'), H('#5aa0ff'), H('#ff9ad2')]
  for (const sy of [45, 50]) {
    p.hl(6, sy + 1, 23, WHITEWALL[1])
    for (let x = 7; x < 28; x += 3) {
      const g = goods[(x + sy) % goods.length]
      p.set(x, sy, g)
      p.set(x + 1, sy, shade(g, -0.3))
      p.set(x, sy - 1, shade(g, 0.3))
    }
  }
  p.hl(5, 56, 25, SH)
  // door (2,2 → x32..47)
  glassDoor(p, 34, 42, 12, 21, WHITEWALL[4])
  p.rect(32, 62, 16, 2, STONE[3])
  window4(p, 51, 43, 7, 9, WHITEWALL[4])
  p.outline(OUT)
  return sprite(p, 0, -16)
}

function exchange(): ObjSprite {
  const p = new Px(112, 112)
  const glassRamp = [H('#0a1a4a'), H('#12307a'), H('#1f4fb0'), H('#4a86e8'), H('#9cc8ff')]
  // big sign on the roof
  p.rect(14, 1, 84, 20, OUT)
  p.rect(15, 2, 82, 18, H('#101830'))
  frame(p, 16, 3, 80, 16, GOLD[2])
  for (let x = 18; x < 95; x += 4) {
    p.set(x, 4, GOLD[4])
    p.set(x, 17, GOLD[4])
  }
  const tw = textWidth('EXCHANGE', 2)
  text(p, 'EXCHANGE', 56 - (tw >> 1), 6, GOLD[3], 2, GOLD[1])
  p.rect(26, 21, 3, 5, IRON[2])
  p.rect(83, 21, 3, 5, IRON[2])
  // body
  const bx0 = 3
  const bx1 = 108
  p.rect(bx0, 24, bx1 - bx0 + 1, 88, STONE[3])
  p.hl(bx0, 24, bx1 - bx0 + 1, STONE[4])
  p.hl(bx0, 28, bx1 - bx0 + 1, STONE[1])
  // curtain wall
  for (let y = 29; y < 98; y++)
    for (let x = bx0 + 5; x <= bx1 - 5; x++) {
      const t = (y - 29) / 69
      let c = t < 0.25 ? glassRamp[1] : t < 0.6 ? glassRamp[2] : glassRamp[3]
      const d = (x + y * 1) % 46
      if (d < 4) c = mix(c, glassRamp[4], 0.55)
      else if (d < 6) c = mix(c, glassRamp[4], 0.25)
      if ((x - bx0 - 5) % 12 === 11) c = IRON[3]
      p.set(x, y, c)
    }
  for (const fy of [44, 60, 76]) {
    p.hl(bx0 + 5, fy, bx1 - bx0 - 9, WHITEWALL[3])
    p.hl(bx0 + 5, fy + 1, bx1 - bx0 - 9, WHITEWALL[1])
  }
  // pillars
  for (const px of [bx0, bx1 - 4]) {
    p.rect(px, 24, 5, 88, STONE[3])
    p.vl(px, 24, 88, STONE[4])
    p.vl(px + 4, 24, 88, STONE[1])
  }
  // ticker marquee (animated over)
  p.rect(8, 47, 96, 12, OUT)
  p.rect(9, 48, 94, 10, H('#05070e'))
  p.hl(9, 48, 94, H('#1a2238'))
  // entrance canopy + doors (door tile 3,4 → x48..63)
  p.rect(38, 84, 36, 4, WHITEWALL[3])
  p.hl(38, 84, 36, WHITEWALL[4])
  p.hl(38, 87, 36, WHITEWALL[0])
  p.hl(38, 88, 36, SH)
  text(p, '24/7', 49, 85, BASE[2])
  p.rect(46, 89, 20, 21, STONE[2])
  glassDoor(p, 49, 91, 14, 20, IRON[4])
  // plinth + steps
  p.rect(bx0, 106, bx1 - bx0 + 1, 6, STONE[2])
  p.hl(bx0, 106, bx1 - bx0 + 1, STONE[4])
  p.hl(bx0, 109, bx1 - bx0 + 1, STONE[1])
  p.rect(44, 108, 24, 4, STONE[3])
  p.hl(44, 108, 24, STONE[4])
  p.hl(44, 110, 24, STONE[2])
  // Base-blue banners on the pillars with a white bull-run chart
  for (const bx of [bx0 + 6, bx1 - 11]) {
    p.rect(bx, 64, 6, 18, BASE[2])
    p.vl(bx, 64, 18, BASE[3])
    p.vl(bx + 5, 64, 18, BASE[1])
    stamp(p, ['...w', '..ww', 'w.w.', '.w..'], bx + 1, 68, { w: H('#ffffff') })
    p.hl(bx + 1, 74, 4, BASE[4])
    p.set(bx + 1, 82, BASE[2])
    p.set(bx + 4, 82, BASE[2])
  }
  // rooftop AC units peeking out beside the sign
  for (const ax of [5, 99]) {
    p.rect(ax, 16, 8, 8, STONE[3])
    p.hl(ax, 16, 8, STONE[4])
    p.vl(ax + 7, 16, 8, STONE[1])
    p.ellipse(ax + 3.5, 20, 2.2, 2.2, IRON[2])
    p.set(ax + 3, 19, IRON[4])
  }
  p.outline(OUT)
  return sprite(p, 0, -32)
}

/** Gothic window slots on the Rug Tower (x = left of a 3px arch, y = top), shared with the glow animation. */
const TOWER_WINDOWS: [number, number][] = [
  ...[34, 56, 78].flatMap((y) => [20, 33, 46, 59].map((x): [number, number] => [x, y])),
  [20, 100],
  [59, 100],
]

function tower(): ObjSprite {
  const p = new Px(80, 128)
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
      if (x === l || x === l + 1) c = OBS[4]
      if (Math.abs(u - 0.28) < 0.012 || Math.abs(u - 0.72) < 0.012) c = PURP[0]
      if (y >= 30 && tier === 0) c = u < 0.72 ? OBS[4] : OBS[3]
      if (y >= 30 && tier === 1) c = OBS[0]
      body.set(x, y, c)
    }
    // tier ledges jut out 1px
    if (y >= 30 && tier === 0) {
      body.set(l - 1, y, OBS[4])
      body.set(r + 1, y, OBS[3])
    }
  }
  // plinth steps
  for (let y = 118; y < 128; y++) {
    const inset = y < 122 ? 2 : 0
    for (let x = 3 + inset; x <= 76 - inset; x++) body.set(x, y, y === 118 || y === 122 ? OBS[4] : x < 20 ? OBS[3] : OBS[2])
  }
  // crown: battlements + spires
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
  p.blit(body, 0, 0)
  // Restore the Cabald banner in front of the tower facade.
  p.rect(33, 27, 14, 7, H('#8f1728'))
  p.rect(34, 28, 12, 5, H('#11131b'))
  p.hl(35, 29, 10, GOLD[3])
  p.rect(38, 30, 4, 1, GOLD[3])
  p.rect(38, 31, 1, 1, GOLD[3])
  p.rect(38, 32, 4, 1, GOLD[3])
  p.rect(42, 31, 1, 1, H('#e83b4d'))
  p.rect(43, 32, 1, 1, H('#e83b4d'))
  // gothic window slits (glow animated over)
  for (const [wx, wy] of TOWER_WINDOWS) {
    const win = ['.o.', 'oPo', 'ppp', 'pPp', 'pPp', 'pPp', 'ppp']
    stamp(p, win, wx, wy, { o: OUT, p: PURP[1], P: PURP[2] })
    p.hl(wx, wy + 7, 3, OUT)
    p.vl(wx - 1, wy + 1, 6, OUT)
    p.vl(wx + 3, wy + 1, 6, OUT)
  }
  // rune above the door
  const rune = ['...1...', '..121..', '.12321.', '1233321', '.12321.', '..121..', '...1...']
  stamp(p, rune, 37, 88, { '1': PURP[0], '2': PURP[1], '3': PURP[3] })
  // glowing cracks
  for (const [cx, cy] of [
    [18, 66],
    [58, 92],
    [30, 45],
    [52, 70],
  ]) {
    p.set(cx, cy, PURP[2])
    p.set(cx + 1, cy + 1, PURP[1])
    p.set(cx + 1, cy + 2, PURP[0])
    p.set(cx + 2, cy + 3, PURP[1])
  }
  // arch doorway (door tile 2,5 → x32..47)
  const ax = 33
  for (let y = 99; y < 128; y++)
    for (let x = ax; x < ax + 14; x++) {
      const dx = x - (ax + 6.5)
      if (y < 105 && dx * dx + (y - 105) ** 2 * 1.4 > 49) continue
      const glow = (y - 99) / 29
      p.set(x, y, mix(H('#0a0414'), PURP[0], Math.max(0, 0.9 - glow) * 0.8))
    }
  // arch outline stones
  for (let y = 96; y < 128; y++) {
    p.set(ax - 1, y, y < 104 ? OBS[0] : OBS[4])
    p.set(ax + 14, y, OBS[0])
  }
  // red rug draped over the arch with gold tassels
  for (let x = ax - 3; x <= ax + 16; x++) {
    const sag = Math.round(Math.sin(((x - ax + 3) / 19) * Math.PI) * 3)
    for (let y = 96; y <= 99 + sag; y++) {
      let c = RUG[2]
      if (y === 96) c = RUG[3]
      else if (y === 99 + sag) c = RUG[1]
      else if ((x - ax) % 5 === 0) c = RUG[1]
      p.set(x, y, c)
    }
    p.set(x, 100 + sag, (x & 1) === 0 ? GOLD[3] : GOLD[1])
  }
  for (const tx of [ax - 3, ax + 16]) {
    p.vl(tx, 97, 12, RUG[1])
    p.vl(tx + (tx < ax ? 1 : -1), 97, 10, RUG[2])
    p.set(tx, 109, GOLD[3])
    p.set(tx, 110, GOLD[2])
  }
  // runner rug on the threshold
  for (let y = 112; y < 128; y++) {
    p.hl(ax + 2, y, 10, RUG[2])
    p.set(ax + 2, y, GOLD[2])
    p.set(ax + 11, y, GOLD[2])
    if (y % 4 === 0) p.hl(ax + 4, y, 6, RUG[3])
  }
  p.hl(ax + 2, 127, 10, RUG[1])
  return sprite(p, 0, -32)
}

function lab(): ObjSprite {
  const p = new Px(96, 92)
  // walls
  p.rect(3, 34, 90, 58, WHITEWALL[2])
  for (let x = 18; x < 92; x += 16) p.vl(x, 36, 52, WHITEWALL[1])
  p.vl(3, 34, 54, WHITEWALL[3])
  p.vl(92, 34, 54, WHITEWALL[1])
  p.rect(3, 38, 90, 3, BASE[2])
  p.hl(3, 38, 90, BASE[3])
  p.rect(3, 88, 90, 4, STONE[2])
  p.hl(3, 88, 90, STONE[3])
  // roof slab
  p.rect(1, 22, 94, 12, H('#8e9ab4'))
  p.hl(1, 22, 94, H('#c4cee2'))
  for (let y = 24; y < 32; y += 3) p.hl(2, y, 92, H('#a2aec6'))
  p.rect(1, 31, 94, 3, WHITEWALL[3])
  p.hl(1, 31, 94, WHITEWALL[4])
  p.hl(3, 34, 90, SH)
  // solar panels
  for (let i = 0; i < 3; i++) {
    const sx = 50 + i * 14
    p.rect(sx, 23, 12, 7, BASE[1])
    for (let j = 0; j < 12; j += 3) p.vl(sx + j, 23, 7, BASE[0])
    p.hl(sx, 26, 12, BASE[0])
    p.set(sx + 1, 24, BASE[4])
    p.set(sx + 4, 24, BASE[3])
  }
  // satellite dish
  p.rect(22, 16, 3, 8, IRON[3])
  p.vl(22, 16, 8, IRON[4])
  p.ellipse(19, 10, 10, 7, (x, y) => {
    const n = (x - 19) * 0.6 + (y - 10)
    return n < -4 ? WHITEWALL[4] : n < 1 ? WHITEWALL[3] : n < 5 ? WHITEWALL[2] : WHITEWALL[1]
  })
  p.ellipse(20, 11, 6, 4, WHITEWALL[1])
  p.ellipse(20, 11, 4, 2.5, WHITEWALL[2])
  for (let k = 0; k < 7; k++) p.set(21 + k, 10 - k, IRON[3])
  p.rect(27, 2, 3, 3, BASE[2])
  p.set(28, 1, H('#ff4a4a'))
  // windows with lab gear
  for (const [wx, ww] of [
    [6, 24],
    [60, 30],
  ] as const) {
    p.rect(wx - 1, 49, ww + 2, 20, OUT)
    glass(p, wx, 50, ww, 18)
    p.hl(wx, 63, ww, WHITEWALL[1])
    for (let x = wx + 2; x < wx + ww - 3; x += 7) {
      // flask
      const liquid = [H('#5aff8a'), H('#ff6ad0'), H('#6ad8ff')][(x >> 3) % 3]
      p.rect(x, 59, 4, 4, liquid)
      p.set(x + 1, 58, WHITEWALL[4])
      p.set(x + 2, 58, WHITEWALL[4])
      p.set(x, 59, shade(liquid, 0.4))
      // monitor
      p.rect(x + 4, 55, 3, 3, IRON[1])
      p.set(x + 5, 56, BASE[3])
    }
  }
  // sign
  p.rect(24, 43, 50, 8, OUT)
  p.rect(25, 44, 48, 6, WHITEWALL[4])
  const t = 'GWEI LAB'
  text(p, t, 49 - (textWidth(t) >> 1), 44, BASE[2])
  // door (2,3 → x32..47)
  glassDoor(p, 34, 70, 12, 21, WHITEWALL[3])
  p.rect(32, 90, 16, 2, STONE[3])
  p.outline(OUT)
  return sprite(p, 0, -28)
}

// ---------------------------------------------------------------------------------------------------------------
// Decor

function sign(): ObjSprite {
  const p = new Px(16, 16)
  p.ellipse(8, 14.5, 5, 1.5, SH)
  const s = new Px(16, 16)
  s.rect(7, 9, 2, 6, WOOD[1])
  s.set(7, 9, WOOD[3])
  s.rect(2, 2, 12, 8, WOOD[2])
  s.hl(2, 2, 12, WOOD[4])
  s.hl(2, 5, 12, WOOD[1])
  s.hl(2, 6, 12, WOOD[3])
  s.hl(2, 9, 12, WOOD[1])
  s.vl(2, 2, 8, WOOD[3])
  s.vl(13, 2, 8, WOOD[1])
  s.hl(4, 4, 3, WOOD[0])
  s.hl(8, 4, 4, WOOD[0])
  s.hl(4, 8, 5, WOOD[0])
  s.outline(OUT)
  p.blit(s, 0, 0)
  return sprite(p, 0, 0)
}

function lamp(): ObjSprite {
  const p = new Px(16, 32)
  p.ellipse(8, 30.5, 4, 1.5, SH)
  const s = new Px(16, 32)
  s.rect(5, 27, 6, 3, IRON[2])
  s.hl(5, 27, 6, IRON[4])
  s.rect(7, 12, 2, 16, IRON[2])
  s.vl(7, 12, 16, IRON[4])
  s.rect(6, 19, 4, 2, IRON[3])
  // lantern
  s.rect(4, 2, 8, 2, IRON[2])
  s.hl(5, 1, 6, IRON[3])
  s.set(7, 0, IRON[4])
  s.set(8, 0, IRON[3])
  s.rect(5, 4, 6, 7, H('#ffe7a0'))
  s.rect(6, 5, 4, 5, H('#fff8dc'))
  s.vl(5, 4, 7, IRON[1])
  s.vl(10, 4, 7, IRON[1])
  s.set(7, 6, H('#ffffff'))
  s.rect(4, 11, 8, 1, IRON[3])
  s.outline(OUT)
  p.blit(s, 0, 0)
  return sprite(p, 0, -16)
}

function atm(): ObjSprite {
  const p = new Px(16, 24)
  p.ellipse(8, 22.5, 6, 1.5, SH)
  const s = new Px(16, 24)
  s.rect(2, 1, 12, 21, IRON[1])
  s.rect(2, 1, 12, 5, BASE[2])
  s.hl(2, 1, 12, BASE[4])
  s.vl(2, 1, 21, BASE[3])
  s.vl(13, 6, 16, IRON[0])
  // base logo
  s.ellipse(8, 3.5, 2, 2, H('#ffffff'))
  s.hl(6, 3, 2, BASE[2])
  // screen
  s.rect(4, 7, 8, 5, H('#0a1830'))
  // keypad
  for (let y = 13; y < 17; y += 2) for (let x = 5; x < 11; x += 2) s.set(x, y, IRON[4])
  s.set(11, 13, H('#4ade80'))
  s.set(11, 15, H('#f87171'))
  s.hl(5, 18, 6, IRON[0])
  s.hl(5, 20, 6, H('#0a0a10'))
  s.hl(5, 19, 6, IRON[3])
  s.outline(OUT)
  p.blit(s, 0, 0)
  return sprite(p, 0, -8)
}

function server(): ObjSprite {
  const p = new Px(16, 24)
  p.ellipse(8, 22.5, 7, 1.5, SH)
  const s = new Px(16, 24)
  s.rect(2, 1, 12, 21, IRON[1])
  s.hl(2, 1, 12, IRON[4])
  s.vl(2, 1, 21, IRON[3])
  s.vl(13, 1, 21, IRON[0])
  for (let u = 0; u < 5; u++) {
    const y = 3 + u * 4
    s.rect(3, y, 10, 3, IRON[2])
    s.hl(3, y, 10, IRON[3])
    for (let x = 4; x < 9; x += 2) s.set(x, y + 1, IRON[0])
    s.set(10, y + 1, H('#0a0a10'))
    s.set(11, y + 1, H('#0a0a10'))
  }
  // cables on top
  s.set(5, 0, BASE[2])
  s.set(10, 0, H('#f59e0b'))
  s.outline(OUT)
  p.blit(s, 0, 0)
  return sprite(p, 0, -8)
}

function mailbox(): ObjSprite {
  const p = new Px(16, 20)
  p.ellipse(8, 18.5, 4, 1.5, SH)
  const s = new Px(16, 20)
  s.rect(7, 11, 2, 8, WOOD[1])
  s.vl(7, 11, 8, WOOD[3])
  s.rect(3, 3, 10, 8, BASE[2])
  s.hl(4, 2, 8, BASE[2])
  s.hl(5, 1, 6, BASE[3])
  s.hl(4, 3, 8, BASE[3])
  s.hl(3, 10, 10, BASE[1])
  s.hl(3, 6, 10, H('#ffffff'))
  s.vl(3, 3, 8, BASE[3])
  s.rect(12, 3, 2, 4, H('#ef4444'))
  s.set(12, 7, H('#b91c1c'))
  s.outline(OUT)
  p.blit(s, 0, 0)
  return sprite(p, 0, -4)
}

function flowerpot(theme: Theme): ObjSprite {
  const p = new Px(16, 20)
  p.ellipse(8, 18.5, 5, 1.5, SH)
  const s = new Px(16, 20)
  const clay = [H('#5a2412'), H('#a4482a'), H('#cc6a3e'), H('#e89060')]
  s.rect(4, 12, 8, 6, clay[2])
  s.rect(3, 11, 10, 2, clay[3])
  s.vl(4, 13, 5, clay[3])
  s.vl(11, 13, 5, clay[1])
  s.hl(5, 17, 6, clay[1])
  const leaf = PALS[theme].tree
  s.ellipse(8, 8, 5, 4, (x, y) => ((x + y) % 3 === 0 ? leaf[3] : y > 8 ? leaf[1] : leaf[2]))
  const cols = PALS[theme].flowers
  for (const [fx, fy, i] of [
    [5, 5, 0],
    [10, 4, 1],
    [8, 2, 2],
  ]) {
    const c = cols[i % cols.length]
    s.set(fx, fy, c)
    s.set(fx + 1, fy, shade(c, -0.25))
    s.set(fx, fy + 1, shade(c, -0.25))
    s.set(fx + 1, fy + 1, H('#ffd23a'))
  }
  s.outline(OUT)
  p.blit(s, 0, 0)
  return sprite(p, 0, -4)
}

function rock(theme: Theme): ObjSprite {
  const p = new Px(16, 18)
  p.ellipse(8, 16.5, 7, 1.5, SH)
  const rr = theme === 'canyon' ? PALS.canyon.cliff : [H('#3a3a44'), H('#6e6e7e'), H('#9494a4'), H('#b8b8c6'), H('#dadae4')]
  const s = new Px(16, 18)
  s.ellipse(8, 10.5, 7, 6, (x, y) => {
    const n = (x - 8) / 7 + (y - 10.5) / 6
    return n < -0.9 ? rr[4] : n < -0.2 ? rr[3] : n < 0.6 ? rr[2] : rr[1]
  })
  s.ellipse(11, 6.5, 3, 2.5, (x, y) => ((x - 11) + (y - 6.5) < -1 ? rr[4] : rr[3]))
  s.set(6, 10, rr[1])
  s.set(7, 11, rr[1])
  s.set(7, 12, rr[1])
  s.set(10, 12, rr[1])
  s.outline(OUT)
  p.blit(s, 0, 0)
  return sprite(p, 0, -2)
}

function crystal(): ObjSprite {
  const p = new Px(16, 28)
  p.ellipse(8, 26, 7, 2, SH)
  const s = new Px(16, 28)
  // rock base
  s.ellipse(8, 24, 6.5, 3, STONE[2])
  s.hl(3, 23, 10, STONE[3])
  const prism = (x0: number, top: number, bottom: number, w: number) => {
    for (let y = top; y <= bottom; y++) {
      const k = y - top
      const hw = k < w ? k : w
      for (let x = -hw; x <= hw; x++) {
        const c = x < 0 ? BASE[3] : x === 0 ? BASE[4] : x === hw ? BASE[1] : BASE[2]
        s.set(x0 + x, y, k === 0 ? H('#ffffff') : c)
      }
    }
  }
  prism(4, 11, 23, 2)
  prism(12, 9, 23, 2)
  prism(8, 1, 23, 3)
  s.set(7, 5, H('#ffffff'))
  s.set(7, 6, BASE[5])
  s.outline(BASE[0])
  p.blit(s, 0, 0)
  return sprite(p, 0, -12)
}

function candle(green: boolean): ObjSprite {
  const p = new Px(16, 40)
  const c = green ? GREENC : REDC
  p.ellipse(8, 38.5, 7, 1.5, SH)
  const s = new Px(16, 40)
  // plinth
  s.rect(2, 32, 12, 7, STONE[2])
  s.hl(2, 32, 12, STONE[4])
  s.hl(2, 33, 12, STONE[3])
  s.hl(2, 38, 12, STONE[1])
  s.vl(7, 34, 4, STONE[1])
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
  s.outline(OUT)
  p.blit(s, 0, 0)
  return sprite(p, 0, -24)
}

function statue(): ObjSprite {
  const p = new Px(16, 28)
  p.ellipse(8, 26.5, 7, 1.5, SH)
  const s = new Px(16, 28)
  // pedestal
  s.rect(3, 18, 10, 9, STONE[2])
  s.rect(2, 16, 12, 3, STONE[3])
  s.hl(2, 16, 12, STONE[4])
  s.vl(3, 19, 8, STONE[3])
  s.vl(12, 19, 8, STONE[1])
  s.rect(5, 21, 6, 3, GOLD[2])
  s.hl(5, 21, 6, GOLD[3])
  // bust: shoulders + big bald head
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
  p.blit(s, 0, 0)
  return sprite(p, 0, -12)
}

function bench(): ObjSprite {
  const p = new Px(32, 20)
  p.rect(2, 17, 28, 2, SH)
  const s = new Px(32, 20)
  // legs
  for (const lx of [3, 27]) {
    s.rect(lx, 12, 2, 6, IRON[2])
    s.vl(lx, 12, 6, IRON[3])
  }
  // backrest slats
  s.rect(2, 1, 28, 3, WOOD[2])
  s.hl(2, 1, 28, WOOD[4])
  s.hl(2, 3, 28, WOOD[1])
  s.rect(2, 5, 28, 3, WOOD[2])
  s.hl(2, 5, 28, WOOD[3])
  s.hl(2, 7, 28, WOOD[1])
  s.rect(4, 4, 1, 1, IRON[2])
  s.rect(27, 4, 1, 1, IRON[2])
  // seat
  s.rect(1, 9, 30, 4, WOOD[3])
  s.hl(1, 9, 30, WOOD[4])
  s.hl(1, 12, 30, WOOD[1])
  s.vl(1, 9, 4, WOOD[2])
  for (let x = 6; x < 30; x += 8) s.vl(x, 9, 4, WOOD[2])
  s.outline(OUT)
  p.blit(s, 0, 0)
  return sprite(p, 0, -4)
}

function fountain(): ObjSprite {
  const p = new Px(48, 48)
  p.ellipse(24, 33, 23.5, 14.5, SH)
  const s = new Px(48, 48)
  // outer basin wall (front face visible)
  s.ellipse(24, 31, 23, 14, STONE[1])
  s.ellipse(24, 29, 23, 14, (x, y) => ((x - 24) / 23 + (y - 29) / 14 < -0.6 ? STONE[4] : STONE[3]))
  s.ellipse(24, 29, 19.5, 11, STONE[1])
  s.ellipse(24, 30, 19, 10.5, PALS.town.water[2])
  // central pillar + upper bowl
  s.rect(21, 14, 6, 17, STONE[3])
  s.vl(21, 14, 17, STONE[4])
  s.vl(26, 14, 17, STONE[1])
  s.ellipse(24, 30, 5, 2, PALS.town.water[3])
  s.ellipse(24, 14, 9, 3.5, STONE[1])
  s.ellipse(24, 13, 9, 3.2, STONE[3])
  s.ellipse(24, 13, 7, 2.2, PALS.town.water[2])
  s.rect(23, 4, 2, 9, STONE[3])
  s.ellipse(24, 5, 2.5, 1.5, STONE[4])
  s.outline(OUT)
  p.blit(s, 0, 0)
  return sprite(p, 0, 0)
}

/** Actual collection miniatures set into hand-drawn furniture. Missing atlases retain a quiet silhouette. */
function artObject(kind: 'frame' | 'billboard' | 'pedestal', idx: number): ObjSprite {
  const board = kind === 'billboard'
  const plinth = kind === 'pedestal'
  const p = new Px(board ? 48 : 24, plinth ? 24 : 36)
  if (plinth) {
    p.ellipse(12, 20, 11, 3, SH)
    p.rect(5, 8, 14, 12, STONE[2])
    p.rect(6, 8, 4, 12, STONE[4])
    p.rect(3, 6, 18, 4, CREAM[3])
    p.hl(3, 6, 18, CREAM[4])
    p.rect(3, 19, 18, 3, STONE[3])
    p.rect(9, 12, 6, 4, GOLD[1])
    p.hl(9, 12, 6, GOLD[3])
    p.hl(6, 7, 12, TEAL[3])
    return sprite(p, -4, -7)
  }
  if (board) {
    p.rect(7, 23, 3, 12, IRON[2])
    p.rect(38, 23, 3, 12, IRON[2])
    p.vl(7, 23, 12, IRON[4])
    p.vl(38, 23, 12, IRON[4])
    p.rect(1, 0, 46, 27, idx === 67 ? H('#650f20') : IRON[0])
    p.rect(2, 1, 44, 25, GOLD[2])
    p.rect(3, 2, 42, 23, idx === 67 ? H('#11131b') : OBS[1])
    if (idx === 67) {
      text(p, 'NO', 22, 5, GOLD[4], 1, H('#4b1220'))
      text(p, 'CABALD', 20, 13, H('#ff5a68'), 1, H('#4b1220'))
      p.rect(4, 3, 16, 1, H('#e83b4d'))
      p.rect(4, 20, 16, 1, GOLD[3])
    } else {
      text(p, 'REMY', 27, 6, GOLD[4])
      text(p, 'ART', 29, 13, TEAL[3])
      p.hl(27, 20, 14, GOLD[1])
    }
    p.rect(4, 28, 40, 2, IRON[1])
    for (const x of [5, 22, 40]) p.rect(x, 0, 3, 2, CREAM[4])
  } else {
    p.rect(1, 1, 23, 29, SH)
    p.rect(0, 0, 24, 26, GOLD[0])
    p.rect(1, 1, 22, 24, GOLD[2])
    frame(p, 2, 2, 20, 22, GOLD[4])
    frame(p, 3, 3, 18, 20, GOLD[1])
    for (const x of [0, 21])
      for (const y of [0, 23]) p.rect(x, y, 3, 3, GOLD[3])
    p.rect(7, 28, 10, 3, GOLD[1])
    p.hl(7, 28, 10, GOLD[4])
    p.hl(9, 30, 6, GOLD[2])
    p.rect(10, 33, 4, 2, CREAM[4])
  }
  const img = p.toCanvas()
  const ctx = img.getContext('2d') as CanvasRenderingContext2D
  ctx.imageSmoothingEnabled = false
  const mini = art.mini(idx)
  const x = board ? (idx === 67 ? 4 : 5) : 4
  const y = 4
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
  return { img, ox: board ? 0 : -4, oy: board ? -20 : -19 }
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

const artSprites = new Map<string, ObjSprite>()
// ---------------------------------------------------------------------------------------------------------------

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
  const themed = o.kind === 'flowerpot' || o.kind === 'rock'
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

const EVENING: Record<Theme, boolean> = { town: false, meadow: false, city: true, canyon: true, gallery: true }

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
  const eve = EVENING[theme]
  switch (o.kind) {
    case 'terminal':
    case 'departure_board':
    case 'bridge_gate':
    case 'bag_scanner':
      drawTerminalAnim(ctx, o, sx, sy, t, lights)
      break
    case 'frame':
      ctx.drawImage(spotlight(), sx - 8, sy - 25)
      lights.push({ x: sx + 8, y: sy - 8, r: 17, rgb: '255,211,130', a: 0.16 })
      break
    case 'billboard':
      lights.push({ x: sx + 24, y: sy - 6, r: 27, rgb: '130,200,255', a: 0.2 })
      break
    case 'pedestal': {
      const head = art.head(o.idx ?? 0)
      const bob = Math.round(Math.sin(t * 2 + o.x) * 2)
      ctx.globalAlpha = 0.85 + Math.sin(t * 3) * 0.1
      if (head) ctx.drawImage(head.img, head.sx, head.sy, head.sw, head.sh, sx, sy - 21 + bob, 16, 16)
      else fill(ctx, '#b9ffe6', sx + 4, sy - 17 + bob, 8, 8)
      ctx.globalAlpha = 0.28
      fill(ctx, '#c0ffed', sx + 3, sy - 10 + bob + (Math.floor(t * 9) % 6), 10, 1)
      ctx.globalAlpha = 1
      lights.push({ x: sx + 8, y: sy - 5, r: 18, rgb: '105,245,211', a: 0.28 })
      break
    }
    case 'lamp': {
      const flick = 0.85 + Math.sin(t * 13 + o.x) * 0.05 + Math.sin(t * 7.3 + o.y) * 0.05
      if (eve) {
        ctx.globalAlpha = 0.28 * flick
        ctx.drawImage(glowSprite(14, '255,200,120', 4), sx - 6, sy + 1, 28, 16)
        ctx.globalAlpha = 1
      }
      lights.push({ x: sx + 8, y: sy - 9, r: eve ? 22 : 10, rgb: '255,196,110', a: (eve ? 0.55 : 0.18) * flick })
      break
    }
    case 'crystal': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + o.x * 0.7)
      const fr = Math.floor(t * 6) % 12
      ctx.globalAlpha = 0.35 + pulse * 0.45
      fill(ctx, '#d6e4ff', sx + 7, sy - 10, 1, 8)
      fill(ctx, '#8cb4ff', sx + 3, sy + 1, 1, 5)
      fill(ctx, '#8cb4ff', sx + 11, sy - 1, 1, 6)
      ctx.globalAlpha = 1
      if (fr < 3) {
        const sp = [
          [4, -7],
          [12, -3],
          [9, -11],
        ][Math.floor(t / 2) % 3]
        fill(ctx, '#ffffff', sx + sp[0], sy + sp[1] - 1, 1, 3)
        fill(ctx, '#ffffff', sx + sp[0] - 1, sy + sp[1], 3, 1)
      }
      lights.push({ x: sx + 8, y: sy - 2, r: 18, rgb: '60,130,255', a: 0.25 + pulse * 0.3 })
      break
    }
    case 'server': {
      const step = Math.floor(t * 6)
      for (let u = 0; u < 5; u++) {
        const y = sy - 8 + 3 + u * 4 + 1
        const h1 = hash(step, u, o.x * 31 + o.y)
        fill(ctx, h1 > 0.3 ? '#4ade80' : '#14532d', sx + 10, y)
        fill(ctx, hash(step >> 1, u + 7, o.x) > 0.5 ? '#60a5fa' : '#1e3a8a', sx + 11, y)
      }
      lights.push({ x: sx + 8, y: sy, r: 10, rgb: '80,220,140', a: 0.12 })
      break
    }
    case 'atm': {
      const off = Math.floor(t * 8)
      fill(ctx, '#0a1830', sx + 4, sy - 1, 8, 5)
      for (let i = 0; i < 8; i++) {
        const v = Math.floor(hash(i + off, 3, o.x) * 3)
        fill(ctx, v > 0 ? '#4ade80' : '#f87171', sx + 4 + i, sy - 1 + 1 + v)
      }
      if (Math.floor(t * 2) % 2) fill(ctx, '#bfe4ff', sx + 10, sy + 2)
      lights.push({ x: sx + 8, y: sy + 1, r: 10, rgb: '90,160,255', a: 0.2 })
      break
    }
    case 'exchange':
      drawTicker(ctx, sx + 9, sy - 32 + 48, 94, 10, t)
      lights.push({ x: sx + 56, y: sy + 21, r: 40, rgb: '120,200,255', a: eve ? 0.3 : 0.1 })
      lights.push({ x: sx + 56, y: sy - 22, r: 36, rgb: '255,210,90', a: eve ? 0.35 : 0.08 })
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
      lights.push({ x: sx + 40, y: base + 91, r: 30, rgb: '190,90,255', a: 0.3 + pulse * 0.3 })
      lights.push({ x: sx + 40, y: base + 112, r: 22, rgb: '160,60,255', a: 0.35 })
      lights.push({ x: sx + 40, y: base + 3, r: 14, rgb: '220,120,255', a: 0.5 * pulse })
      break
    }
    case 'fountain':
      drawFountainWater(ctx, sx, sy, t)
      break
    case 'candle_green':
    case 'candle_red': {
      const g = o.kind === 'candle_green'
      const cyc = (t * 0.6 + o.x * 0.37) % 3
      if (cyc < 1) {
        const [top, bot] = g ? [8, 28] : [12, 24]
        const y = Math.floor(bot - cyc * (bot - top + 4))
        const base = sy - 24
        ctx.globalAlpha = 0.8
        if (y >= top && y < bot) fill(ctx, '#ffffff', sx + 5, base + y, 2, 1)
        if (y + 1 >= top && y + 1 < bot) fill(ctx, g ? '#c8ffe0' : '#ffd8d8', sx + 4, base + y + 1, 4, 1)
        ctx.globalAlpha = 1
      }
      lights.push({ x: sx + 8, y: sy - 8, r: 16, rgb: g ? '60,220,120' : '255,70,70', a: eve ? 0.3 : 0.12 })
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
    case 'center':
      lights.push({ x: sx + 40, y: sy + 52, r: 26, rgb: '120,180,255', a: eve ? 0.4 : 0.12 })
      break
    case 'mart':
      lights.push({ x: sx + 40, y: sy + 38, r: 22, rgb: '120,255,230', a: eve ? 0.35 : 0.1 })
      break
    case 'house':
      if (eve) {
        const on = 0.85 + 0.15 * Math.sin(t * 3 + o.x)
        ctx.globalAlpha = 0.55 * on
        fill(ctx, '#ffd070', sx + 38, sy - 16 + 45, 8, 7)
        fill(ctx, '#ffd070', sx + 51, sy - 16 + 45, 7, 7)
        ctx.globalAlpha = 1
        lights.push({ x: sx + 48, y: sy + 32, r: 18, rgb: '255,190,90', a: 0.35 * on })
      }
      break
    case 'lab':
      for (let i = 0; i < 4; i++) {
        const on = hash(Math.floor(t * 3), i, o.x) > 0.4
        fill(ctx, on ? '#8cd8ff' : '#2a4a7a', sx + [7, 14, 61, 75][i], sy - 28 + 56)
      }
      lights.push({ x: sx + 28, y: sy - 18, r: 6, rgb: '255,80,80', a: Math.floor(t * 1.5) % 2 ? 0.5 : 0 })
      if (Math.floor(t * 1.5) % 2) fill(ctx, '#ffb0b0', sx + 28, sy - 27)
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
    const r = hash(slot, 0, 99)
    const up = r > 0.42
    const bodyH = 1 + Math.floor(hash(slot, 1, 99) * 4)
    const mid = y + 2 + Math.floor((Math.sin(slot * 0.35) * 0.5 + 0.5) * (h - 4 - bodyH))
    const col = up ? '#22e06a' : '#ff4a4a'
    if (u % 4 === 1) {
      fill(ctx, col, x + i, mid - 1, 1, bodyH + 2)
    } else {
      fill(ctx, col, x + i, mid, 1, bodyH)
    }
  }
  // gloss line
  ctx.globalAlpha = 0.25
  fill(ctx, '#9cc8ff', x, y, w, 1)
  ctx.globalAlpha = 1
}

function drawFountainWater(ctx: CanvasRenderingContext2D, sx: number, sy: number, t: number): void {
  // ripple rings in the basin
  for (let k = 0; k < 2; k++) {
    const ph = (t * 0.6 + k * 0.5) % 1
    const rx = Math.round(7 + ph * 11)
    const ry = Math.round(2.5 + ph * 6.5)
    ctx.globalAlpha = 0.7 * (1 - ph)
    ctx.fillStyle = css(PALS.town.water[3])
    for (let a = 0; a < 28; a++) {
      const ang = (a / 28) * Math.PI * 2
      const x = Math.round(24 + Math.cos(ang) * rx)
      const y = Math.round(30 + Math.sin(ang) * ry)
      if (Math.sin(ang) > -0.2 || rx < 12) ctx.fillRect(sx + x, sy + y, 1, 1)
    }
  }
  ctx.globalAlpha = 1
  // streams falling from the upper bowl
  for (const [bx, dir] of [
    [16, -1],
    [32, 1],
  ] as const) {
    for (let i = 0; i < 4; i++) {
      const ph = (t * 2.2 + i * 0.25) % 1
      const x = sx + bx + Math.round(dir * ph * 3)
      const y = sy + 15 + Math.round(ph * ph * 14)
      fill(ctx, i % 2 ? '#e6f6ff' : '#79bdff', x, y, 1, 2)
    }
  }
  // bubbling top jet
  const j = Math.floor(t * 8) % 3
  fill(ctx, '#e6f6ff', sx + 23, sy + 2 - j, 2, 2 + j)
  fill(ctx, '#79bdff', sx + 22, sy + 4, 4, 1)
  // sparkles on the surface
  const s = Math.floor(t * 5)
  for (let i = 0; i < 3; i++) {
    const x = 8 + Math.floor(hash(s, i, 3) * 32)
    const y = 24 + Math.floor(hash(s, i, 4) * 12)
    const dx = x - 24
    const dy = (y - 30) * 1.8
    if (dx * dx + dy * dy < 17 * 17 && Math.abs(dx) > 4) fill(ctx, '#ffffff', sx + x, sy + y)
  }
}
