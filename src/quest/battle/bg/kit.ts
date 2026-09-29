import { type Col, Px, canvas, ctx2d, hash, shade } from '../../gfx/px'
/**
 * Shared machinery for battle backdrops: ordered dithering, horizontally wrapping layers (so any camera offset
 * tiles seamlessly), periodic noise, perspective ground rows and the terrain-pad builder. Scenes pre-render into
 * canvases with these once; per frame they only blit.
 */
import type { BackdropGeo } from '../backdrops'

export interface Scene {
  draw(ctx: CanvasRenderingContext2D, t: number, camX: number): void
  front?(ctx: CanvasRenderingContext2D, t: number, camX: number): void
  pad(rx: number, ry: number): HTMLCanvasElement
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
export const TAU = Math.PI * 2

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
/** 4×4 Bayer threshold in (0,1). */
export const bayer = (x: number, y: number) => (B4[((y & 3) << 2) | (x & 3)] + 0.5) / 16

/** ramp[v] for a continuous index, ordered-dithered between neighbouring steps. */
export function dither(ramp: readonly Col[], v: number, x: number, y: number): Col {
  const n = ramp.length - 1
  const c = clamp(v, 0, n)
  const i = Math.floor(c)
  return ramp[Math.min(n, i + (c - i > bayer(x, y) ? 1 : 0))]
}

/** Like `dither`, but each step stays flat and only its last `soft` fraction dithers into the next (GBA sky bands). */
export function band(ramp: readonly Col[], v: number, x: number, y: number, soft = 0.45): Col {
  const n = ramp.length - 1
  const c = clamp(v, 0, n)
  const i = Math.floor(c)
  const f = clamp((c - i - (1 - soft)) / soft, 0, 1)
  return ramp[Math.min(n, i + (f > bayer(x, y) ? 1 : 0))]
}

/** Pixel buffer whose x wraps, so layers tile seamlessly when scrolled by the camera. */
export class WPx extends Px {
  override set(x: number, y: number, c: Col): void {
    const w = this.w
    super.set((((x | 0) % w) + w) % w, y, c)
  }
}

/** Draws `img` repeated horizontally across [0, W) shifted by `x`. */
export function tile(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, W: number): void {
  const w = img.width
  const ox = ((Math.round(x) % w) + w) % w
  const yy = Math.round(y)
  for (let dx = ox > 0 ? ox - w : 0; dx < W; dx += w) ctx.drawImage(img, dx, yy)
}

/** Periodic smooth noise in [-1, 1]: integer harmonics of `period`, so wrapping layers stay seamless. */
export function wave(x: number, period: number, wl: number, seed: number, oct = 3): number {
  let s = 0
  let a = 1
  let tot = 0
  for (let i = 0; i < oct; i++) {
    const k = Math.max(1, Math.round(period / (wl / 2 ** i)))
    s += a * Math.sin((TAU * k * x) / period + hash(seed, i, 7) * TAU)
    tot += a
    a *= 0.5
  }
  return s / tot
}

/** Layer width: a bit wider than the screen so repeats are not obvious; never narrower than 256. */
export const layerW = (W: number) => Math.max(256, Math.ceil((W * 1.5) / 8) * 8)

/** Dithered band sky filling W×h, `ramp` top → bottom. `curve` > 1 packs more bands near the horizon. */
export function sky(W: number, h: number, ramp: readonly Col[], curve = 1, soft = 0.45): Px {
  const p = new Px(W, Math.max(1, h))
  const n = ramp.length - 1
  for (let y = 0; y < h; y++) {
    const v = (y / Math.max(1, h - 1)) ** curve * n
    for (let x = 0; x < W; x++) p.d[y * W + x] = band(ramp, v, x, y, soft)
  }
  return p
}

/**
 * Puffy GBA cloud: union of ellipses on a flat base. `pal` = [shadow, base, light, highlight]. Lit from the top-left.
 */
export function cloud(p: Px, x0: number, base: number, w: number, h: number, seed: number, pal: readonly Col[]): void {
  const r = (i: number) => hash(seed, i, 31)
  const lobes: [number, number, number, number][] = []
  const n = Math.max(2, Math.round(w / 12))
  for (let i = 0; i < n; i++) {
    const cx = x0 + ((i + 0.5) / n) * w + (r(i) - 0.5) * 4
    const mid = 1 - Math.abs((i + 0.5) / n - 0.5) * 1.6
    const ry = Math.max(3, h * (0.45 + 0.55 * mid) * (0.75 + r(i + 9) * 0.35))
    const rx = Math.max(4, (w / n) * (0.8 + r(i + 17) * 0.5))
    lobes.push([cx, base - ry * 0.55, rx, ry])
  }
  const y0 = Math.floor(base - h * 1.3)
  for (let y = y0; y < base; y++)
    for (let x = Math.floor(x0 - 6); x < x0 + w + 6; x++) {
      let best = -1
      let lx = 0
      let ly = 0
      for (const [cx, cy, rx, ry] of lobes) {
        const nx = (x + 0.5 - cx) / rx
        const ny = (y + 0.5 - cy) / ry
        const d = 1 - (nx * nx + ny * ny)
        if (d > best) {
          best = d
          lx = nx
          ly = ny
        }
      }
      if (best < 0) continue
      // Lambert-ish light from the upper-left, flattened into the 4-tone ramp with a dithered seam.
      const light = -lx * 0.45 - ly * 0.9 + (base - y < 3 ? -0.8 : 0)
      p.set(x, y, band(pal, 1.4 + light * 1.3, x, y, 0.3))
    }
}

/**
 * Screen rows of evenly spaced ground lines in perspective, far → near. Row spacing grows toward the viewer.
 * Returns [y, scale] pairs; scale ≈ 1 at `ref` (the player's feet row).
 */
export function groundRows(hz: number, H: number, ref: number, step = 0.22): [number, number][] {
  const out: [number, number][] = []
  const span = ref - hz
  for (let j = 60; j >= 0; j--) {
    const y = hz + (H + 20 - hz) / (1 + j * step)
    if (y - hz < 1.5) continue
    out.push([y, (y - hz) / span])
  }
  return out
}

/**
 * Perspective Voronoi plates for cracked ground (mud flats, obsidian). Cells are `near` px wide at the player's
 * feet row (`span` px below the horizon) and foreshortened vertically; the cell width halves in zones toward the
 * horizon so every row stays periodic over LW. Returns per-pixel plate ids and the distance (px) to the nearest
 * crack.
 */
export function plates(LW: number, gh: number, span: number, near: number, seed: number) {
  const id = new Int32Array(LW * gh)
  const e = new Float32Array(LW * gh)
  const A = (2 * span ** 1.5) / (near * 0.42)
  for (let y = 0; y < gh; y++) {
    const d = y + 2
    const z = clamp(Math.floor(Math.log2(span / d)), 0, 4)
    const N = Math.max(3, Math.round(LW / (near / 2 ** z)))
    const cw = LW / N
    const ch = (2 * d ** 1.5) / A
    const v = A / Math.sqrt(d)
    const j0 = Math.floor(v)
    for (let x = 0; x < LW; x++) {
      const u = x / cw
      const i0 = Math.floor(u)
      let b1 = 1e9
      let b2 = 1e9
      let s1x = 0
      let s1y = 0
      let s2x = 0
      let s2y = 0
      let best = 0
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const i = i0 + di
          const j = j0 + dj
          const iw = ((i % N) + N) % N
          const sx = (i + 0.15 + 0.7 * hash(iw, j, seed + z)) * cw
          const sy = (j + 0.15 + 0.7 * hash(iw, j, seed + z + 50)) * ch
          const dx = sx - u * cw
          const dy = sy - v * ch
          const dd = dx * dx + dy * dy
          if (dd < b1) {
            b2 = b1
            s2x = s1x
            s2y = s1y
            b1 = dd
            s1x = sx
            s1y = sy
            best = (z * 4096 + (j & 4095)) * 4096 + iw
          } else if (dd < b2) {
            b2 = dd
            s2x = sx
            s2y = sy
          }
        }
      const k = y * LW + x
      id[k] = best
      e[k] = (b2 - b1) / (2 * Math.max(0.001, Math.hypot(s2x - s1x, s2y - s1y)))
    }
  }
  return { id, e }
}

export interface Course {
  /** Course (row) index from the horizon. */
  ri: number
  /** 0..1 position inside the course, top → bottom. */
  k: number
  /** Tile index along the course (unique per course). */
  cell: number
  rowH: number
  /** Depth scale ≈ 1 at the player's feet. */
  s: number
  /** 0 = tile face, 1 = horizontal seam, 2 = vertical joint. */
  seam: 0 | 1 | 2
}

/**
 * Running-bond courses in perspective (plaza pavers, floor planks): each course is taller toward the viewer and its
 * tiles `aspect`× as wide as tall, with joints offset half a tile on alternate courses. Periodic over LW.
 */
export function bond(
  g: BackdropGeo,
  LW: number,
  step: number,
  aspect: number,
  paint: (x: number, y: number, c: Course) => Col,
): WPx {
  const hz = Math.round(g.horizon)
  const gh = g.H - hz
  const p = new WPx(LW, gh)
  const rows = groundRows(hz, g.H, g.me.feet, step)
  let prev = 0
  for (let ri = 0; ri < rows.length; ri++) {
    const y1 = Math.min(gh, Math.round(rows[ri][0] - hz))
    const rowH = y1 - prev
    if (rowH < 1) continue
    const n = Math.max(2, Math.round(LW / Math.max(3, rowH * aspect)))
    const cw = LW / n
    const off = ri % 2 ? cw / 2 : 0
    for (let y = prev; y < y1; y++)
      for (let x = 0; x < LW; x++) {
        const u = (x + off) / cw
        const cell = Math.floor(u) % n
        const seam = y === prev && rowH > 1 ? 1 : rowH > 2 && u - Math.floor(u) < 1 / cw ? 2 : 0
        p.d[y * LW + x] = paint(x, y, { ri, k: (y - prev) / rowH, cell, rowH, s: rows[ri][1], seam })
      }
    prev = y1
  }
  return p
}

/** Parallax factor of a ground row: horizon moves ~0.15× the camera, the player's feet row 1×. */
const groundPar = (g: BackdropGeo, y: number) => 0.15 + (0.85 * (y - g.horizon)) / Math.max(1, g.me.feet - g.horizon)

/**
 * Ground plane pre-rendered as a wrapping LW×(H-horizon) canvas. With camX ≠ 0 it is line-scrolled in 2-row slices
 * so near rows slide faster than far ones; at rest it is a single blit.
 */
export function drawGround(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, g: BackdropGeo, camX: number): void {
  const hz = Math.round(g.horizon)
  if (Math.round(camX) === 0) {
    tile(ctx, img, 0, hz, g.W)
    return
  }
  const w = img.width
  for (let y = 0; y < img.height; y += 2) {
    const ox = ((Math.round(camX * groundPar(g, hz + y)) % w) + w) % w
    for (let dx = ox > 0 ? ox - w : 0; dx < g.W; dx += w) ctx.drawImage(img, 0, y, w, 2, dx, hz + y, w, 2)
  }
}

/** Stamps every 'x' of a one-colour glyph (e.g. the heart the 3×5 font lacks) at `scale`. */
export function stampRows(p: Px, rows: readonly string[], x: number, y: number, c: Col, scale = 1): void {
  for (let j = 0; j < rows.length; j++)
    for (let i = 0; i < rows[j].length; i++)
      if (rows[j][i] === 'x') p.rect(x + i * scale, y + j * scale, scale, scale, c)
}

/** Canvas from string-art rows. */
export function spr(rows: readonly string[], pal: Record<string, Col>): HTMLCanvasElement {
  const w = Math.max(...rows.map((r) => r.length))
  const p = new Px(w, rows.length)
  for (let j = 0; j < rows.length; j++)
    for (let i = 0; i < rows[j].length; i++) {
      const c = pal[rows[j][i]]
      if (c !== undefined) p.set(i, j, c)
    }
  return p.toCanvas()
}

/** Blank canvas + context pair for layers composed with ctx calls. */
export function surface(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = canvas(w, h)
  return [c, ctx2d(c)]
}

// ---------------------------------------------------------------------------------------------------------------
// Terrain pads

export interface PadStyle {
  /** Top surface colour; nx/ny ∈ [-1,1] ellipse-normalised, (x,y) pad pixel, `lit` = top-left light term. */
  top(x: number, y: number, nx: number, ny: number, lit: number): Col
  /** Side/lip colour; k = row inside the 6-row lip (0 = just under the top edge), nx = horizontal position. */
  side(x: number, k: number, nx: number): Col
  /** 1px outer outline. */
  rim: Col
  /** Top-left edge highlight on the top surface. */
  edge: Col
  /** Front edge where top meets lip. */
  lip: Col
  /** Optional rows painted over the finished pad (glyphs, fringes). */
  post?(p: Px, cx: number, cy: number, rx: number, ry: number): void
}

const LIP = 6

/** Builds a 2rx × (2ry+6) pad: ellipse top centred at (rx, ry) with a 6-row side lip under it and a dark rim. */
export function buildPad(rx: number, ry: number, s: PadStyle): HTMLCanvasElement {
  const w = Math.max(4, Math.round(rx * 2))
  const h = Math.max(4, Math.round(ry * 2)) + LIP
  const p = new Px(w, h)
  const cx = w / 2
  const cy = h - LIP - ry
  const ax = w / 2 - 1
  const ay = Math.max(1.5, ry - 1)
  const top = new Uint8Array(w * h)
  for (let x = 0; x < w; x++) {
    const nx = (x + 0.5 - cx) / ax
    if (Math.abs(nx) > 1) continue
    const yb = cy + ay * Math.sqrt(1 - nx * nx)
    for (let y = Math.floor(cy); y < Math.floor(yb) + LIP && y < h - 1; y++)
      p.put(x, y, s.side(x, y - Math.floor(yb), nx))
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const nx = (x + 0.5 - cx) / ax
      const ny = (y + 0.5 - cy) / ay
      if (nx * nx + ny * ny > 1.0001) continue
      top[y * w + x] = 1
      p.put(x, y, s.top(x, y, nx, ny, -nx * 0.55 - ny * 0.85))
    }
  // Edge pixels of the top face: lit rim at top-left, darker lip line along the front.
  const edges: [number, number, Col][] = []
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!top[y * w + x]) continue
      const out = (xx: number, yy: number) => xx < 0 || yy < 0 || xx >= w || yy >= h || !top[yy * w + xx]
      if (!(out(x - 1, y) || out(x + 1, y) || out(x, y - 1) || out(x, y + 1))) continue
      const nx = (x + 0.5 - cx) / ax
      const ny = (y + 0.5 - cy) / ay
      const c = ny > 0.15 ? s.lip : nx * 0.6 + ny < 0.25 ? s.edge : shade(p.get(x, y), -0.18)
      edges.push([x, y, c])
    }
  for (const [x, y, c] of edges) p.put(x, y, c)
  s.post?.(p, cx, cy, ax, ay)
  p.outline(s.rim)
  return p.toCanvas()
}

/** Per-(rx,ry) cache around a pad style factory. */
export function padCache(
  make: (rx: number, ry: number) => HTMLCanvasElement,
): (rx: number, ry: number) => HTMLCanvasElement {
  const m = new Map<string, HTMLCanvasElement>()
  return (rx, ry) => {
    const k = `${rx}x${ry}`
    let c = m.get(k)
    if (!c) {
      c = make(rx, ry)
      m.set(k, c)
    }
    return c
  }
}
