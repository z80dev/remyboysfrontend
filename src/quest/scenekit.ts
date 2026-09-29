/**
 * Pixel stagecraft for the full-screen story scenes: a logical-resolution canvas with its own frame loop, crisp
 * Press Start 2P bitmaps, the REMY QUEST logo, 1:1 Remy sprites with recolored variants, dithered skies and
 * particles. Static art is baked once into small canvases; a frame is a handful of integer-positioned blits.
 */
import { SPRITE_FEET, SPRITE_H, SPRITE_W, art } from './art'
import { type Col, Px, canvas, ctx2d, hash, hex, mix, shade, withAlpha } from './gfx/px'
import { PAL } from './skin'
import { view } from './view'

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Deterministic integer in [0, n) for a coordinate/seed triple (px `hash` is a unit float). */
export const ihash = (n: number, x: number, y: number, s = 0) => Math.floor(hash(x, y, s) * n)

// ───────────── Stage ─────────────

export interface Stage {
  readonly el: HTMLCanvasElement
  readonly g: CanvasRenderingContext2D
  W: number
  H: number
  /** Milliseconds since the stage opened. */
  t: number
  /** Milliseconds since the previous frame (clamped so a background tab resumes calmly). */
  dt: number
}

/**
 * A `view.W`×`view.H` canvas prepended to `host` (which must already be in the document), redrawn every animation
 * frame until `host` leaves the document. `layout` runs now and after every screen resize.
 */
export function stage(host: HTMLElement, frame: (s: Stage) => void, layout?: (s: Stage) => void): Stage {
  const el = canvas(view.W, view.H)
  el.className = 'stage'
  el.setAttribute('aria-hidden', 'true')
  host.prepend(el)
  const s: Stage = { el, g: ctx2d(el), W: view.W, H: view.H, t: 0, dt: 16 }
  const resize = () => {
    el.width = s.W = view.W
    el.height = s.H = view.H
    s.g.imageSmoothingEnabled = false
    layout?.(s)
  }
  view.listeners.push(resize)
  layout?.(s)
  let last = performance.now()
  const tick = (now: number) => {
    if (!el.isConnected) {
      view.listeners.splice(view.listeners.indexOf(resize) >>> 0, 1)
      return
    }
    s.dt = Math.max(0, Math.min(64, now - last))
    last = now
    s.t += s.dt
    frame(s)
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  return s
}

// ───────────── Dithering ─────────────

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
/** Ordered-dither threshold in (0, 1) for a pixel. */
export const bayer = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16

/**
 * Vertical multi-stop gradient: flat bands joined by a narrow Bayer-dithered seam, the way GBA skies are painted.
 * `stops` run top to bottom across `h` rows.
 */
export function bands(w: number, h: number, stops: readonly string[], seam = 0.45): Px {
  const cols = stops.map((c) => hex(c))
  const n = cols.length - 1
  const p = new Px(w, h)
  for (let y = 0; y < h; y++) {
    const f = (y / Math.max(1, h - 1)) * n
    const i = Math.min(n - 1, Math.floor(f))
    const t = Math.min(1, Math.max(0, (f - i - 0.5) / seam + 0.5))
    for (let x = 0; x < w; x++) p.put(x, y, t > bayer(x, y) ? cols[i + 1] : cols[i])
  }
  return p
}

/** Dithered soft ellipse (sprite shadows, spotlight pools): solid core, checkerboard rim. */
export function softEllipse(rx: number, ry: number, c: Col): HTMLCanvasElement {
  const p = new Px(rx * 2, ry * 2)
  p.ellipse(rx, ry, rx, ry, (x, y, nx, ny) => (nx * nx + ny * ny > 0.5 && (x + y) % 2 ? 0 : c))
  return p.toCanvas()
}

// ───────────── Press Start 2P bitmaps ─────────────

/** Resolves once the pixel font can be rasterised; scene art that spells words waits on it. */
export const fontReady = () => document.fonts.load('8px "Press Start 2P"').then(() => undefined)

interface Glyphs {
  /** Width in font pixels, trailing blank columns trimmed. */
  w: number
  /** 8 rows × `stride` columns, 1 = ink. */
  m: Uint8Array
  stride: number
}
const glyphCache = new Map<string, Glyphs>()

/**
 * Exact 1-bit bitmap of `str` in Press Start 2P. The font is drawn at 64px, eight device pixels per font pixel, and
 * each cell is sampled at its centre, so edges never depend on the browser's anti-aliasing.
 */
export function glyphs(str: string): Glyphs {
  const hit = glyphCache.get(str)
  if (hit) return hit
  const stride = Math.max(1, str.length * 8)
  const c = canvas(str.length * 64 + 16, 80)
  const x = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  x.font = '64px "Press Start 2P"'
  x.textBaseline = 'alphabetic'
  x.fillText(str, 8, 72)
  const d = x.getImageData(0, 0, c.width, c.height).data
  const m = new Uint8Array(stride * 8)
  let w = 0
  for (let j = 0; j < 8; j++)
    for (let i = 0; i < stride; i++) {
      const on = d[((8 + j * 8 + 4) * c.width + 8 + i * 8 + 4) * 4 + 3] > 127
      if (!on) continue
      m[j * stride + i] = 1
      w = Math.max(w, i + 1)
    }
  const g = { w, m, stride }
  glyphCache.set(str, g)
  return g
}

export interface TextStyle {
  /** 1px drop shadow down-right. */
  shadow?: string
  /** 1px outline all round (8-neighbour). */
  outline?: string
}

const textCache = new Map<string, HTMLCanvasElement>()
/** `str` as a crisp 8px canvas: 1px margin on every side for the outline/shadow (so text sits at x+1, y+1). */
export function hdText(str: string, fg: string, o: TextStyle = {}): HTMLCanvasElement {
  const key = `${str}|${fg}|${o.shadow ?? ''}|${o.outline ?? ''}`
  const hit = textCache.get(key)
  if (hit) return hit
  const { w, m, stride } = glyphs(str)
  const p = new Px(w + 3, 11)
  const ink = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < 8 && m[y * stride + x] === 1
  if (o.outline) {
    const oc = hex(o.outline)
    for (let y = -1; y <= 8; y++)
      for (let x = -1; x <= w; x++)
        if (!ink(x, y) && [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => ink(x + dx, y + dy)))) p.put(x + 1, y + 1, oc)
  }
  if (o.shadow) {
    const sc = hex(o.shadow)
    for (let y = 0; y < 8; y++) for (let x = 0; x < w; x++) if (ink(x, y)) p.put(x + 2, y + 2, sc)
  }
  const fc = hex(fg)
  for (let y = 0; y < 8; y++) for (let x = 0; x < w; x++) if (ink(x, y)) p.put(x + 1, y + 1, fc)
  const c = p.toCanvas()
  textCache.set(key, c)
  return c
}

/** Draws 8px text with its top-left ink pixel at (x, y); `align` centres/right-aligns on x. */
export function drawText(
  g: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  fg: string,
  o: TextStyle = {},
  align: 'left' | 'center' | 'right' = 'left',
) {
  const c = hdText(str, fg, o)
  const w = c.width - 3
  const dx = align === 'center' ? Math.floor(x - w / 2) : align === 'right' ? x - w : x
  g.drawImage(c, Math.round(dx) - 1, Math.round(y) - 1)
}

// ───────────── Logo ─────────────

export interface Logo {
  img: HTMLCanvasElement
  /** Letter faces only (white), the mask the shine sweep is clipped to. */
  face: HTMLCanvasElement
  /** Scratch canvas the shine is composed in each frame. */
  scratch: HTMLCanvasElement
  /** Face pixels on the letters' upper-left edges: where glints sparkle. */
  glints: [number, number][]
}

export const BLUE_FACE = ['#ffffff', '#dce8ff', '#a9c6ff', '#6f9dff', '#3a73ff', '#1f56e0']
export const GOLD_FACE = ['#fffbe0', '#ffef9a', '#ffd34a', '#ffbf2e', '#f29a1c', '#d8741a']

export interface LetterLine {
  str: string
  /** Integer font-pixel size. */
  k: number
  face: readonly string[]
  /** 1px keyline hugging the letter faces. */
  rim: string
}

/** One line of logo lettering: `k`× font pixels, hard gradient bands, bevel light top-left, 1px `rim`. */
function logoLine(str: string, k: number, face: readonly string[], rim: string): { p: Px; mask: Uint8Array } {
  const { w, m, stride } = glyphs(str)
  let r0 = 8
  let r1 = -1
  for (let j = 0; j < 8; j++)
    for (let i = 0; i < w; i++)
      if (m[j * stride + i]) {
        r0 = Math.min(r0, j)
        r1 = Math.max(r1, j)
      }
  const bw = w * k
  const bh = (r1 - r0 + 1) * k
  const p = new Px(bw + 2, bh + 2)
  const mask = new Uint8Array(p.w * p.h)
  const on = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < bw && y < bh && m[(Math.floor(y / k) + r0) * stride + Math.floor(x / k)] === 1
  const cols = face.map((c) => hex(c))
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      if (!on(x, y)) continue
      let band = Math.min(cols.length - 2, Math.floor((y / bh) * (cols.length - 1)))
      if (!on(x, y - 1) || !on(x - 1, y)) band = Math.max(0, band - 2)
      else if (!on(x, y + 1) || !on(x + 1, y)) band = cols.length - 1
      p.put(x + 1, y + 1, cols[band])
      mask[(y + 1) * p.w + x + 1] = 1
    }
  p.outline(hex(rim))
  return { p, mask }
}

const logoCache = new Map<string, Logo>()
/**
 * Title lettering: lines stacked and centred, each with gradient bands and a keyline, then a shared cream shell, an
 * ink outline and an extruded navy base.
 */
export function lettering(lines: readonly LetterLine[]): Logo {
  const key = lines.map((l) => `${l.str}/${l.k}/${l.face[2]}`).join('|')
  const hit = logoCache.get(key)
  if (hit) return hit
  const built = lines.map((l) => logoLine(l.str, l.k, l.face, l.rim))
  const pad = 4
  const ext = Math.max(2, lines[0].k - 1)
  const iw = Math.max(...built.map((b) => b.p.w))
  const w = iw + pad * 2
  const h = built.reduce((sum, b) => sum + b.p.h - 1, 1) + pad * 2
  const body = new Px(w, h)
  const face = new Px(w, h)
  const white = hex('#ffffff')
  let y = pad
  for (const line of built) {
    const x = pad + Math.floor((iw - line.p.w) / 2)
    body.blit(line.p, x, y)
    for (let j = 0; j < line.p.h; j++)
      for (let i = 0; i < line.p.w; i++) if (line.mask[j * line.p.w + i]) face.put(x + i, y + j, white)
    y += line.p.h - 1
  }
  body.outline(hex(PAL.paper), true)
  body.outline(hex('#c4d6ff'))
  body.outline(hex(PAL.ink), true)
  const out = new Px(w, h + ext)
  const sil = (c: Col) => {
    const s = new Px(w, h)
    for (let i = 0; i < body.d.length; i++) if (body.d[i]) s.d[i] = c
    return s
  }
  for (let d = ext; d >= 1; d--) out.blit(sil(d === ext ? hex(PAL.ink) : mix(hex(PAL.navy), hex(PAL.night), d / ext)), 0, d)
  out.blit(body, 0, 0)
  const glints: [number, number][] = []
  for (let gy = 1; gy < h; gy++)
    for (let gx = 1; gx < w; gx++)
      if (face.get(gx, gy) && !face.get(gx, gy - 1) && !face.get(gx - 1, gy) && hash(gx, gy, 7) < 1 / 3) glints.push([gx, gy])
  const faceC = new Px(w, h + ext)
  faceC.blit(face, 0, 0)
  const result = { img: out.toCanvas(), face: faceC.toCanvas(), scratch: canvas(w, h + ext), glints }
  logoCache.set(key, result)
  return result
}

/** "REMY" in Base blue over "QUEST" in gold; `big`/`small` are the lines' font-pixel sizes. */
export function logo(big: number, small: number): Logo {
  return lettering([
    { str: 'REMY', k: big, face: BLUE_FACE, rim: PAL.navy },
    { str: 'QUEST', k: small, face: GOLD_FACE, rim: PAL.goldInk },
  ])
}

/**
 * Draws the logo at (x, y) with a diagonal shine band crossing the faces; `sweep` in [0, 1) is the band position,
 * outside that range there is no shine.
 */
export function drawLogo(g: CanvasRenderingContext2D, l: Logo, x: number, y: number, sweep: number) {
  g.drawImage(l.img, x, y)
  if (sweep < 0 || sweep >= 1) return
  const s = l.scratch
  const sx = ctx2d(s)
  sx.clearRect(0, 0, s.width, s.height)
  sx.globalCompositeOperation = 'source-over'
  const pos = Math.floor(-s.height + sweep * (s.width + s.height * 2))
  for (let row = 0; row < s.height; row++) {
    const off = pos + Math.floor((s.height - row) / 2)
    sx.fillStyle = '#ffffff'
    sx.fillRect(off, row, 5, 1)
    sx.fillStyle = '#fff6c8'
    sx.fillRect(off + 7, row, 2, 1)
  }
  sx.globalCompositeOperation = 'destination-in'
  sx.drawImage(l.face, 0, 0)
  g.drawImage(s, x, y)
}

// ───────────── Remy sprites ─────────────

type Variant = 'plain' | 'shade' | 'dim' | 'white' | 'gold'
interface SpriteSet {
  src: HTMLCanvasElement | null
  cache: Map<string, HTMLCanvasElement>
}
const spriteSets = new Map<number, SpriteSet>()

/** Starts loading a Remy sprite; drawing is a no-op until it arrives. */
export function loadSprite(idx: number): Promise<void> {
  let set = spriteSets.get(idx)
  if (!set) {
    const fresh: SpriteSet = { src: null, cache: new Map() }
    set = fresh
    spriteSets.set(idx, fresh)
    return art.sprite(idx).then((c) => {
      fresh.src = c
    })
  }
  return art.sprite(idx).then(() => undefined)
}

const VARIANT_TINT: Record<Exclude<Variant, 'plain'>, [string, number]> = {
  shade: ['#1c1238', 0.28],
  dim: ['#1c1238', 0.55],
  white: ['#ffffff', 1],
  gold: ['#ffe07a', 0.55],
}

/**
 * The sprite, recolored (dim for taken, white for materialising, gold for glory). Never mirrored: shirt slogans and
 * meme captions are part of the art and would read backwards.
 */
export function spriteImage(idx: number, variant: Variant = 'plain'): HTMLCanvasElement | null {
  const set = spriteSets.get(idx)
  if (!set?.src) {
    if (!set) void loadSprite(idx)
    return null
  }
  let c = set.cache.get(variant)
  if (c) return c
  c = canvas(SPRITE_W, SPRITE_H)
  const x = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  x.imageSmoothingEnabled = false
  x.drawImage(set.src, 0, 0)
  if (variant !== 'plain') {
    const [tint, k] = VARIANT_TINT[variant]
    const t = hex(tint)
    const img = x.getImageData(0, 0, SPRITE_W, SPRITE_H)
    const d = new Uint32Array(img.data.buffer)
    for (let i = 0; i < d.length; i++) if (d[i] >>> 24) d[i] = withAlpha(mix(d[i] | 0xff000000, t, k), 255)
    x.putImageData(img, 0, 0)
  }
  set.cache.set(variant, c)
  return c
}

/** Draws a sprite 1:1 with its body centred on `cx` and its soles on row `feet`. */
export function drawSprite(g: CanvasRenderingContext2D, idx: number, cx: number, feet: number, variant: Variant = 'plain') {
  const img = spriteImage(idx, variant)
  if (img) g.drawImage(img, Math.round(cx) - SPRITE_W / 2, Math.round(feet) - SPRITE_FEET)
}

const dissolveScratch = new Map<number, { c: HTMLCanvasElement; level: number }>()
/**
 * Materialise: pixels switch from nothing → white silhouette → full color in Bayer order as `p` runs 0 → 1, so the
 * Remy assembles out of light one dither step at a time.
 */
export function drawMaterialize(g: CanvasRenderingContext2D, idx: number, cx: number, feet: number, p: number) {
  const plain = spriteImage(idx)
  const white = spriteImage(idx, 'white')
  if (!plain || !white) return
  if (p >= 1) return drawSprite(g, idx, cx, feet)
  const level = Math.floor(Math.max(0, p) * 32)
  let s = dissolveScratch.get(idx)
  if (!s) {
    s = { c: canvas(SPRITE_W, SPRITE_H), level: -1 }
    dissolveScratch.set(idx, s)
  }
  if (s.level !== level) {
    s.level = level
    const x = s.c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
    const src = (c: HTMLCanvasElement) =>
      new Uint32Array((c.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, SPRITE_W, SPRITE_H).data.buffer)
    const a = src(plain)
    const b = src(white)
    const out = x.createImageData(SPRITE_W, SPRITE_H)
    const d = new Uint32Array(out.data.buffer)
    for (let y = 0; y < SPRITE_H; y++)
      for (let xx = 0; xx < SPRITE_W; xx++) {
        const i = y * SPRITE_W + xx
        const th = bayer(xx, y) * 16
        d[i] = level - 16 > th ? a[i] : level > th ? b[i] : 0
      }
    x.putImageData(out, 0, 0)
  }
  g.drawImage(s.c, Math.round(cx) - SPRITE_W / 2, Math.round(feet) - SPRITE_FEET)
}

const shadowCache = new Map<number, HTMLCanvasElement>()
/** Dithered ground shadow `w` px wide centred on `cx`, sitting on row `feet`. */
export function drawShadow(g: CanvasRenderingContext2D, cx: number, feet: number, w = 40) {
  let c = shadowCache.get(w)
  if (!c) {
    c = softEllipse(w / 2, Math.max(3, Math.round(w / 9)), hex(PAL.ink, 120))
    shadowCache.set(w, c)
  }
  g.drawImage(c, Math.round(cx - w / 2), Math.round(feet - c.height / 2) + 1)
}

// ───────────── Particles ─────────────

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  /** Gravity (px/s²). */
  ay: number
  life: number
  max: number
  c: string
  kind: 'dot' | 'spark' | 'confetti' | 'mote'
}

export function spawn(list: Particle[], p: Partial<Particle> & Pick<Particle, 'x' | 'y' | 'kind'>) {
  list.push({ vx: 0, vy: 0, ay: 0, life: 0, max: 1000, c: '#ffffff', ...p })
}

/** Advances and draws every particle; expired ones are dropped. */
export function particles(g: CanvasRenderingContext2D, list: Particle[], dt: number) {
  const s = dt / 1000
  let n = 0
  for (const p of list) {
    p.life += dt
    if (p.life >= p.max) continue
    p.vy += p.ay * s
    p.x += p.vx * s
    p.y += p.vy * s
    list[n++] = p
    const x = Math.round(p.x)
    const y = Math.round(p.y)
    const k = p.life / p.max
    g.fillStyle = p.c
    if (p.kind === 'dot') g.fillRect(x, y, 1, 1)
    else if (p.kind === 'mote') {
      if (Math.floor(p.life / 180) % 3) g.fillRect(x, y, 1, 1)
    } else if (p.kind === 'confetti') {
      const flipBar = Math.floor(p.life / 120 + p.max) % 2
      g.fillRect(x, y, flipBar ? 2 : 1, flipBar ? 1 : 2)
    } else {
      // Four-point star: grows then shrinks, white core.
      const r = k < 0.5 ? Math.ceil(k * 6) : Math.ceil((1 - k) * 6)
      g.fillRect(x - r, y, r * 2 + 1, 1)
      g.fillRect(x, y - r, 1, r * 2 + 1)
      g.fillStyle = '#ffffff'
      g.fillRect(x, y, 1, 1)
    }
  }
  list.length = n
}

/** Burst of four-point sparkles around a point. */
export function sparkleBurst(list: Particle[], x: number, y: number, n: number, spread: number, c: string = PAL.gold) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random()
    const v = spread * (0.4 + Math.random() * 0.6)
    spawn(list, { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, kind: 'spark', max: 420 + Math.random() * 300, c })
  }
}

// ───────────── Scenery ─────────────

/** Scrolls a horizontally tiling layer by `offset` px (integer) across `w`. */
export function tileX(g: CanvasRenderingContext2D, img: HTMLCanvasElement, offset: number, y: number, w: number) {
  const tw = img.width
  let x = -(((Math.floor(offset) % tw) + tw) % tw)
  for (; x < w; x += tw) g.drawImage(img, x, y)
}

export interface Star {
  x: number
  y: number
  period: number
  big: boolean
}

export function starfield(w: number, h: number, n: number, seed: number): Star[] {
  return Array.from({ length: n }, (_, i) => ({
    x: ihash(w, i, seed),
    y: ihash(h, seed, i, 3),
    period: 900 + ihash(1400, i, seed, 5),
    big: hash(i, seed, 9) < 1 / 7,
  }))
}

/** Twinkling stars: steady dim pixels that brighten on their own period; big ones flare into crosses. */
export function drawStars(g: CanvasRenderingContext2D, stars: Star[], t: number) {
  for (const s of stars) {
    const phase = ((t + s.x * 97) % s.period) / s.period
    const lit = phase < 0.18
    g.fillStyle = lit ? '#ffffff' : s.big ? '#a9b8ff' : '#6a70b8'
    g.fillRect(s.x, s.y, 1, 1)
    if (s.big && lit) {
      g.fillStyle = '#8fa8ff'
      g.fillRect(s.x - 1, s.y, 1, 1)
      g.fillRect(s.x + 1, s.y, 1, 1)
      g.fillRect(s.x, s.y - 1, 1, 1)
      g.fillRect(s.x, s.y + 1, 1, 1)
    }
  }
}

/** Integer-stepped ease (so motion lands on whole pixels, GBA-style). */
export const ease = (t: number) => {
  const k = Math.min(1, Math.max(0, t))
  return 1 - (1 - k) ** 3
}

/** Black iris closing to radius `r` around (cx, cy), drawn row by row so its edge stays pixel-crisp. */
export function iris(g: CanvasRenderingContext2D, W: number, H: number, cx: number, cy: number, r: number, color = '#000') {
  g.fillStyle = color
  for (let y = 0; y < H; y++) {
    const dy = y + 0.5 - cy
    const half = dy * dy < r * r ? Math.floor(Math.sqrt(r * r - dy * dy)) : -1
    if (half < 0) g.fillRect(0, y, W, 1)
    else {
      g.fillRect(0, y, Math.max(0, Math.round(cx) - half), 1)
      g.fillRect(Math.round(cx) + half, y, W, 1)
    }
  }
}

/** Hue-shifted shade of a CSS hex color, as CSS hex (see px `shade`). */
export const shadeHex = (c: string, k: number) => {
  const v = shade(hex(c), k)
  return `#${[v & 255, (v >>> 8) & 255, (v >>> 16) & 255].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}
