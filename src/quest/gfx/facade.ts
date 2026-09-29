/**
 * Shared building kit: materials, glazed windows with sky reflections, the stepped drop shadow every sprite casts, and
 * the night / door overlays. Overlays are derived from the baked sprite pixels so they always line up with the art;
 * per frame a building costs a handful of drawImage/fillRect calls.
 */
import type { MapObject } from '../types'
import { sky } from './daylight'
import type { Door, Light, Neon, ObjSprite, Win } from './objects'
import { type Col, Px, hash, hex, mix, shade, withAlpha } from './px'

const H = hex
export const SHC = H('#1a1030')
export const SH = withAlpha(SHC, 64)
export const SH2 = withAlpha(SHC, 36)
export const SKY = [H('#1d3668'), H('#3564b0'), H('#5f98dc'), H('#9ccaf2'), H('#e2f4ff')]
const SKYSET = new Set(SKY)
export const WHITEWALL = [H('#9aa4b8'), H('#c8d0de'), H('#e6eaf2'), H('#f8faff'), H('#ffffff')]
export const CREAM = [H('#a8906a'), H('#d8c49c'), H('#efe2c2'), H('#faf2dc'), H('#fffaf0')]
export const STONE = [H('#4a4a58'), H('#7c7c8c'), H('#a2a2b2'), H('#c6c6d2'), H('#e2e2ea')]
export const WOOD = [H('#3e2414'), H('#7a4c2a'), H('#a26a3c'), H('#c98c56'), H('#e6b07a')]
export const GOLD = [H('#5a3408'), H('#a8701a'), H('#e0a82c'), H('#ffd65a'), H('#fff3b0')]
export const IRON = [H('#141620'), H('#2a2e3c'), H('#444a5c'), H('#687088'), H('#98a0b8')]
export const METAL = [H('#3a4252'), H('#6a7486'), H('#9aa4b6'), H('#c4ccda'), H('#eef2f8')]
export const BRICK = [H('#3e1812'), H('#6e2a20'), H('#9a4032'), H('#bc5e48'), H('#dc8a70')]
export const MOSS = [H('#2e5a2a'), H('#4e8a3a'), H('#7aae4a'), H('#a6cc62')]
export const TEAL = [H('#0a4a48'), H('#0f8a82'), H('#14b8a6'), H('#5eead4'), H('#c6fff4')]
/** Warm interior light as seen through glass at night, dark → bright. */
export const LIT = [H('#5a2a12'), H('#b85a22'), H('#f0963a'), H('#ffcc6a'), H('#fff0bc')]
const COOL = [H('#1a2e48'), H('#4a7cb0'), H('#8cc4f0'), H('#cdeeff'), H('#f4fcff')]
const TV = [H('#141c3c'), H('#2a3c8a'), H('#4a78d8'), H('#8ab8ff'), H('#d8ecff')]

export function frame(p: Px, x: number, y: number, w: number, h: number, c: Col): void {
  p.hl(x, y, w, c)
  p.hl(x, y + h - 1, w, c)
  p.vl(x, y, h, c)
  p.vl(x + w - 1, y, h, c)
}

/** Glass reflecting the sky: light at the top, deeper below, a diagonal sheen and a lintel shadow on the first row. */
export function pane(p: Px, x: number, y: number, w: number, h: number): void {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const v = j / Math.max(1, h - 1)
      let t = v < 0.3 ? 3 : v < 0.66 ? 2 : 1
      const d = (i + j) % 13
      if (d === 4 || d === 5) t = Math.min(4, t + 2)
      else if (d === 7) t = Math.min(4, t + 1)
      if (j === 0) t = 1
      else if (i === w - 1 && t > 0) t--
      p.set(x + i, y + j, SKY[t])
    }
  if (w >= 7 && h >= 6) {
    p.hl(x + 1, y + 2, 2, SKY[4])
    p.set(x + 2, y + 1, SKY[4])
  }
}

function curtains(p: Px, W: Win, cur: Col): void {
  const cd = shade(cur, -0.32)
  p.hl(W.x, W.y, W.w, cd)
  p.hl(W.x + 1, W.y + 1, W.w - 2, cur)
  for (let j = 1; j < W.h - 1; j++) {
    p.set(W.x, W.y + j, cur)
    p.set(W.x + W.w - 1, W.y + j, cd)
    if (j < W.h >> 1) {
      p.set(W.x + 1, W.y + j, j & 1 ? cur : cd)
      p.set(W.x + W.w - 2, W.y + j, cd)
    }
  }
}

/** Framed window: outline, bevelled frame, reflective pane, mullions, optional curtains, stone sill + shadow. */
export function win(p: Px, W: Win, fc: Col, sill: Col[] | null = STONE): Win {
  const { x, y, w, h } = W
  p.hl(x - 2, y - 3, w + 4, withAlpha(SHC, 44))
  p.rect(x - 2, y - 2, w + 4, h + 4, H('#1a1222'))
  p.rect(x - 1, y - 1, w + 2, h + 2, fc)
  p.hl(x - 1, y - 1, w + 2, shade(fc, 0.35))
  p.vl(x + w, y, h + 1, shade(fc, -0.3))
  pane(p, x, y, w, h)
  if (W.cur !== undefined) curtains(p, W, W.cur)
  const n = W.mx ?? 0
  for (let k = 1; k <= n; k++) p.vl(x + Math.round((k * w) / (n + 1)), y, h, fc)
  if (W.my) p.hl(x, y + (h >> 1), w, fc)
  if (sill) {
    p.hl(x - 3, y + h + 1, w + 6, sill[4])
    p.hl(x - 3, y + h + 2, w + 6, sill[1])
    p.hl(x - 2, y + h + 3, w + 4, withAlpha(SHC, 60))
  }
  W.fc = fc
  return W
}

/** Planter box under a window: wood box, leaves and a few blooms spilling over the sill. */
export function flowerBox(p: Px, x: number, y: number, w: number, blooms: Col[]): void {
  p.rect(x, y, w, 3, WOOD[2])
  p.hl(x, y, w, WOOD[3])
  p.hl(x, y + 2, w, WOOD[1])
  p.hl(x, y + 3, w, withAlpha(SHC, 70))
  for (let i = 0; i < w; i++) {
    const g = hash(i, x, 3)
    p.set(x + i, y - 1, g < 0.5 ? MOSS[1] : MOSS[2])
    if (g > 0.35) p.set(x + i, y - 2, MOSS[g > 0.8 ? 3 : 2])
    if (i % 3 === 1) {
      const c = blooms[(i + x) % blooms.length]
      p.set(x + i, y - 2, c)
      p.set(x + i, y - 3, shade(c, 0.35))
    }
  }
}

/**
 * Final sprite = body + a stepped, dithered drop shadow cast down-right (sun upper-left). The canvas grows by `reach`
 * right and down so the shadow lands on the ground past the footprint. `contact` = x-range of a ground contact line.
 */
export function finish(body: Px, reach: number, contact?: [number, number]): Px {
  const p = new Px(body.w + reach + 1, body.h + reach)
  const { w, h, d } = body
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[y * w + x] >>> 24 === 255
  const core = withAlpha(SHC, 100)
  const soft = withAlpha(SHC, 60)
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (solid(x, y)) continue
      let k = 0
      for (let s = 1; s <= reach && !k; s++) if (solid(x - s, y - Math.round(s * 0.75))) k = s
      if (!k) continue
      if (k < reach) p.set(x, y, core)
      else if ((x + y) & 1) p.set(x, y, soft)
    }
  if (contact) {
    const [x0, x1] = contact
    for (let x = x0; x <= x1; x++) {
      p.set(x, h, withAlpha(SHC, 70))
      if (!(x & 1)) p.set(x, h + 1, withAlpha(SHC, 40))
    }
  }
  p.blit(body, 0, 0)
  return p
}

// ---------------------------------------------------------------------------------------------------------------
// Night overlays

/** Lit version of a window pane: sky reflections become a warm interior glow; frames go silhouette, the rest is lit. */
function litPane(body: Px, W: Win, tone: Col[], seed: number): HTMLCanvasElement {
  const p = new Px(W.w, W.h)
  for (let j = 0; j < W.h; j++)
    for (let i = 0; i < W.w; i++) {
      const c = body.get(W.x + i, W.y + j)
      if (SKYSET.has(c)) {
        const u = ((i + 0.5) / W.w - 0.5) * 1.3
        const v = (j + 0.5) / W.h - 0.4
        const r = Math.hypot(u, v) * 2 + (((i + j) & 1) ? 0.08 : -0.08)
        p.set(i, j, tone[r < 0.5 ? 4 : r < 0.95 ? 3 : 2])
      } else if (c === W.fc) p.set(i, j, tone[0])
      else if (c) p.set(i, j, mix(c, tone[2], 0.45))
    }
  // somebody home: a head-and-shoulders or a houseplant silhouette in some rooms
  const kind = Math.floor(seed * 5)
  const sil = tone[1]
  if (kind === 1 && W.h >= 7 && W.w >= 5) {
    const hx = 1 + Math.floor(hash(seed * 999, 1, 2) * (W.w - 4))
    p.rect(hx, W.h - 5, 3, 2, sil)
    p.hl(hx + 1, W.h - 6, 1, sil)
    p.rect(hx - 1, W.h - 3, 5, 3, sil)
  } else if (kind === 2 && W.h >= 6) {
    const px = W.w - 3
    p.rect(px, W.h - 2, 2, 2, sil)
    p.set(px - 1, W.h - 4, sil)
    p.set(px + 1, W.h - 5, sil)
    p.vl(px, W.h - 4, 2, sil)
    p.set(px + 2, W.h - 3, sil)
  }
  return p.toCanvas()
}

/** Bakes the lit/TV variants for each window from the finished body. */
export function bakeWindows(body: Px, wins: Win[]): Win[] {
  wins.forEach((W, i) => {
    W.lit = litPane(body, W, W.cool ? COOL : LIT, hash(i, W.x, W.y))
    W.tv = litPane(body, W, TV, 0)
  })
  return wins
}

/** Neon overlay for a sign: pixels of `ink` inside the rect become tube `core`, their neighbours a 1px `halo`. */
export function neon(body: Px, x: number, y: number, w: number, h: number, ink: Col[], core: Col, halo: Col, rgb: string): Neon {
  const p = new Px(w + 2, h + 2)
  const is = (i: number, j: number) => ink.includes(body.get(x + i, y + j))
  for (let j = -1; j <= h; j++)
    for (let i = -1; i <= w; i++) {
      if (is(i, j)) p.set(i + 1, j + 1, core)
      else if (is(i - 1, j) || is(i + 1, j) || is(i, j - 1) || is(i, j + 1)) p.set(i + 1, j + 1, halo)
    }
  return { x: x - 1, y: y - 1, w: w + 2, h: h + 2, img: p.toCanvas(), rgb }
}

/** Night view of a glazed facade: every sky-reflection pixel in the rect becomes lit interior glass. */
export function litGlass(body: Px, x: number, y: number, w: number, h: number, cool: boolean, rgb: string): Neon {
  const tone = cool ? COOL : LIT
  const p = new Px(w, h)
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      if (!SKYSET.has(body.get(x + i, y + j))) continue
      const v = j / h + (((i + j) & 1) ? 0.05 : -0.05) + hash(i >> 3, j >> 3, 3) * 0.2
      p.set(i, j, tone[v < 0.35 ? 4 : v < 0.8 ? 3 : 2])
    }
  return { x, y, w, h, img: p.toCanvas(), rgb }
}

// ---------------------------------------------------------------------------------------------------------------
// Doors

const INT = [H('#120a16'), H('#2c1820'), H('#6a3a22'), H('#c07a34'), H('#ffd08a')]
const VOID = [H('#07030e'), H('#1c0a30'), H('#4a1a78'), H('#9a4ae8'), H('#e6b8ff')]
const doorCache = new Map<string, HTMLCanvasElement>()

/** Door opening frame `f` (0..2): dark interior with a warm lit floor, leaves swinging / sliding out of the way. */
function doorFrame(D: Door, f: number): HTMLCanvasElement {
  const key = `${D.style}|${D.w}|${D.h}|${f}`
  let c = doorCache.get(key)
  if (c) return c
  const { w, h } = D
  const p = new Px(w, h)
  const ramp = D.style === 'arch' ? VOID : INT
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const v = j / h + (((i + j) & 1) ? 0.04 : -0.04)
      p.set(i, j, ramp[v < 0.5 ? 0 : v < 0.72 ? 1 : v < 0.9 ? 2 : 3])
    }
  // lit room beyond the vestibule
  p.rect(Math.round(w * 0.3), 2, Math.max(2, Math.round(w * 0.4)), Math.round(h * 0.5), ramp[1])
  p.hl(Math.round(w * 0.3), Math.round(h * 0.5) + 1, Math.max(2, Math.round(w * 0.4)), ramp[2])
  p.hl(1, h - 1, w - 2, ramp[4])
  if (D.style === 'wood') {
    const lw = [w - 3, Math.round(w * 0.45), 2][f]
    for (let j = 0; j < h; j++)
      for (let i = 0; i < lw; i++) {
        const edge = i === lw - 1
        let col = f === 2 ? (i === 0 ? WOOD[3] : WOOD[1]) : edge ? WOOD[3] : WOOD[1]
        if (f < 2 && !edge && i > 0 && (j === 2 || j === h >> 1 || j === h - 3)) col = WOOD[0]
        p.set(i, j, col)
      }
    if (f === 0) p.set(lw - 2, h >> 1, GOLD[3])
  } else if (D.style === 'glass') {
    const half = w >> 1
    const off = [2, Math.round(w / 4), half - 1][f]
    const leaf = (x0: number, x1: number) => {
      for (let x = x0; x <= x1; x++)
        for (let j = 0; j < h; j++) {
          const rim = x === x0 || x === x1 || j === 0 || j === h - 1
          p.set(x, j, rim ? WHITEWALL[3] : SKY[j < h * 0.3 ? 3 : 2])
        }
    }
    if (half - off - 1 >= 0) leaf(0, half - off - 1)
    if (half + off <= w - 1) leaf(half + off, w - 1)
  } else {
    const half = w >> 1
    const lw = [half - 1, Math.round(half * 0.5), 1][f]
    for (const side of [0, 1])
      for (let i = 0; i < lw; i++)
        for (let j = 0; j < h; j++) {
          const x = side ? w - 1 - i : i
          const col = i === lw - 1 ? IRON[3] : j % 5 === 0 ? IRON[0] : IRON[1]
          p.set(x, j, col)
        }
  }
  c = p.toCanvas()
  doorCache.set(key, c)
  return c
}

/** Opening door + light spill onto the step; `dt` = seconds since the door started opening. */
export function drawDoorOpen(ctx: CanvasRenderingContext2D, D: Door, x: number, y: number, dt: number, lights: Light[]): void {
  const f = Math.min(2, Math.max(0, Math.floor(dt / 0.055)))
  const dx = x + D.x
  const dy = y + D.y
  ctx.drawImage(doorFrame(D, f), dx, dy)
  if (f === 0) return
  const col = D.style === 'arch' ? '#c890ff' : '#ffc878'
  ctx.fillStyle = col
  for (let k = 0; k < 4; k++) {
    ctx.globalAlpha = (f === 2 ? 0.34 : 0.2) * (1 - k / 4)
    ctx.fillRect(dx - k, dy + D.h + k, D.w + 2 * k, 1)
  }
  ctx.globalAlpha = 1
  lights.push({
    x: dx + (D.w >> 1),
    y: dy + D.h - 2,
    r: 26,
    rgb: D.style === 'arch' ? '190,110,255' : '255,196,120',
    a: f === 2 ? 0.85 : 0.5,
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Per-frame facade life

/** Lit windows, door lamps, neon, marquee bulbs and chimney smoke for building `o` whose footprint is at view (sx, sy). */
export function drawFacade(ctx: CanvasRenderingContext2D, s: ObjSprite, o: MapObject, sx: number, sy: number, t: number, lights: Light[]): void {
  const x = sx + s.ox
  const y = sy + s.oy
  const L = sky.lamps
  if (s.wins && L > 0.01)
    for (let i = 0; i < s.wins.length; i++) {
      const W = s.wins[i]
      const h0 = hash(o.x * 13 + i, o.y * 7 + W.x, 71)
      if (!W.cool && h0 < 0.2) continue
      // rooms switch on one by one through dusk instead of all at once
      const on = Math.min(1, (L - (W.cool ? 0 : h0 * 0.45)) * 3)
      if (on <= 0) continue
      const tv = !W.cool && h0 > 0.84
      const a = tv ? on * (0.6 + 0.4 * hash(Math.floor(t * 7), i, o.x)) : on
      ctx.globalAlpha = a
      ctx.drawImage((tv ? W.tv : W.lit) as HTMLCanvasElement, x + W.x, y + W.y)
      lights.push({
        x: x + W.x + (W.w >> 1),
        y: y + W.y + W.h + 3,
        r: W.cool ? Math.min(12, 4 + (Math.max(W.w, W.h) >> 1)) : Math.min(16, 6 + Math.max(W.w, W.h)),
        rgb: tv ? '120,160,255' : W.cool ? '170,215,255' : '255,184,100',
        // lab / office glazing is wide and always lit: a softer pool keeps it a lit building, not a floodlight
        a: (W.cool ? 0.4 : 0.65) * a,
      })
    }
  ctx.globalAlpha = 1
  if (s.lamps && L > 0.01)
    for (const [lx, ly] of s.lamps) {
      ctx.globalAlpha = L
      ctx.fillStyle = '#ffcc6a'
      ctx.fillRect(x + lx, y + ly, 3, 3)
      ctx.fillStyle = '#fff4c8'
      ctx.fillRect(x + lx + 1, y + ly, 1, 2)
      lights.push({ x: x + lx + 1, y: y + ly + 10, r: 18, rgb: '255,196,110', a: 0.75 * L })
      lights.push({ x: x + lx + 1, y: y + ly + 1, r: 6, rgb: '255,220,150', a: 0.6 * L })
    }
  ctx.globalAlpha = 1
  if (s.glow && L > 0.01) {
    ctx.globalAlpha = L
    for (const g of s.glow) {
      ctx.drawImage(g.img, x + g.x, y + g.y)
      lights.push({ x: x + g.x + (g.w >> 1), y: y + g.y + g.h, r: Math.min(40, g.w >> 1), rgb: g.rgb, a: 0.6 * L })
    }
    ctx.globalAlpha = 1
  }
  if (s.neon && L > 0.01) {
    // tubes stutter while warming up, then hold with the odd dropout
    const warming = L < 0.9 && hash(Math.floor(t * 14), o.x, 5) < 0.4
    const drop = hash(Math.floor(t * 9), o.y + o.x, 9) < 0.03
    const a = warming || drop ? L * 0.2 : L
    ctx.globalAlpha = a
    for (const n of s.neon) {
      ctx.drawImage(n.img, x + n.x, y + n.y)
      lights.push({ x: x + n.x + (n.w >> 1), y: y + n.y + (n.h >> 1), r: Math.min(20, Math.max(10, n.w >> 2)), rgb: n.rgb, a: (n.a ?? 0.55) * a })
    }
    ctx.globalAlpha = 1
  }
  if (s.bulbs) {
    // marquee chase: every third bulb lit, marching; dim by day, blazing at night
    const step = Math.floor(t * 9)
    const n = s.bulbs.length
    for (let i = 0; i < n; i++) {
      const [bx, by] = s.bulbs[i]
      ctx.fillStyle = (i + step) % 3 === 0 ? (L > 0.3 ? '#fffbe0' : '#ffe9a0') : L > 0.3 ? '#e08a2a' : '#9a6a30'
      ctx.fillRect(x + bx, y + by, 1, 1)
    }
  }
  if (s.smoke) {
    const [cx, cy] = s.smoke
    ctx.fillStyle = sky.night > 0.5 ? '#6a6680' : '#e8e6f0'
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.28 + k / 3 + (o.x & 7) * 0.1) % 1
      ctx.globalAlpha = 0.4 * (1 - ph)
      const r = 1 + Math.floor(ph * 3)
      ctx.fillRect(x + cx + Math.round(ph * 6 + Math.sin(t + k) * 1.5) - (r >> 1), y + cy - 2 - Math.round(ph * 14), r + 1, r)
    }
    ctx.globalAlpha = 1
  }
}
