/**
 * SkiFree slope renderer. Everything is VGA 16-colour pixel art drawn at 1x logical pixels: sprites are built once
 * from procedural pixel buffers (`Pix`), converted to canvases and cached. Quest heads are quantized to the VGA
 * palette when the atlases arrive; until then procedural heads stand in. Text uses two local bitmap faces.
 */
import { FIXED_DT } from './engine'
import { STRINGS } from './strings'
import type { Monster, SkiArt, SkiState, WorldObject } from './types'

type Canvas = HTMLCanvasElement
type Sprite = { c: Canvas; ax: number; ay: number }
/** Paletted pixel buffer: 0 is transparent, otherwise VGA index + 1. */
type Pix = { w: number; h: number; d: Uint8Array }
type HeadSet = { front: Pix; side: Pix; sideL: Pix; back: Pix; tiny: Pix }
type HeadSource = NonNullable<SkiArt['heads']>
type Look = { jacket: number; shade: number; pants: number; board: number; snowboard: boolean }
type SkierSet = { frames: Sprite[]; flips: Sprite[]; sprawl: Sprite; air: Pix; tiny: Pix }

// ---------------------------------------------------------------------------------------------------------------
// VGA palette (Windows 3.0 16 colours) and colour helpers

const VGA = ['#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0', '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff']
const K = 0
const MAROON = 1
const GREEN = 2
const OLIVE = 3
const NAVY = 4
const PURPLE = 5
const TEAL = 6
const SILVER = 7
const GREY = 8
const RED = 9
const LIME = 10
const YELLOW = 11
const BLUE = 12
const MAGENTA = 13
const CYAN = 14
const WHITE = 15
/** Darker partner of each colour, used for jacket shading. */
const SHADE = [K, K, K, K, K, K, K, GREY, K, MAROON, GREEN, OLIVE, NAVY, PURPLE, TEAL, SILVER]

const RGB = new Uint8Array(48)
for (let i = 0; i < 16; i++) {
  const v = Number.parseInt(VGA[i].slice(1), 16)
  RGB[i * 3] = v >> 16
  RGB[i * 3 + 1] = (v >> 8) & 255
  RGB[i * 3 + 2] = v & 255
}

/** Nearest VGA colour by the "redmean" perceptual distance. */
function nearest(r: number, g: number, b: number): number {
  let best = 0
  let bestD = Number.POSITIVE_INFINITY
  for (let i = 0; i < 16; i++) {
    const pr = RGB[i * 3]
    const dr = r - pr
    const dg = g - RGB[i * 3 + 1]
    const db = b - RGB[i * 3 + 2]
    const rm = (r + pr) / 2
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

/** Nearest VGA colour for a CSS `#rgb`/`#rrggbb` string; red when unparseable. */
function cssToVga(css: string): number {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(css.trim())
  if (!m) return RED
  let hex = m[1]
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  const v = Number.parseInt(hex, 16)
  return nearest(v >> 16, (v >> 8) & 255, v & 255)
}

function hash(x: number, y: number, s: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

// ---------------------------------------------------------------------------------------------------------------
// Pixel buffers

function pix(w: number, h: number): Pix {
  return { w, h, d: new Uint8Array(w * h) }
}

function put(p: Pix, x: number, y: number, c: number): void {
  if (x >= 0 && y >= 0 && x < p.w && y < p.h) p.d[y * p.w + x] = c + 1
}

function at(p: Pix, x: number, y: number): number {
  return x >= 0 && y >= 0 && x < p.w && y < p.h ? p.d[y * p.w + x] - 1 : -1
}

function rect(p: Pix, x: number, y: number, w: number, h: number, c: number): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(p, i, j, c)
}

/** Bresenham line. `under` only paints transparent pixels (things passing behind). */
function line(p: Pix, x0: number, y0: number, x1: number, y1: number, c: number, under = false, size = 1): void {
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) if (!under || at(p, x0 + i, y0 + j) < 0) put(p, x0 + i, y0 + j, c)
    }
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x0 += sx
    }
    if (e2 <= dx) {
      err += dx
      y0 += sy
    }
  }
}

/** Filled ellipse sampled at pixel centres (no antialiasing); centres may sit on half pixels. */
function oval(p: Pix, cx: number, cy: number, rx: number, ry: number, c: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx
      const dy = (y + 0.5 - cy) / ry
      if (dx * dx + dy * dy <= 1) put(p, x, y, c)
    }
  }
}

/** Upper half of an ellipse perimeter, 1 px, gap-free: mogul arcs and rainbow-free snow bumps. */
function arc(p: Pix, cx: number, cy: number, rx: number, ry: number, c: number): void {
  let prev = -1
  for (let x = -rx; x <= rx; x++) {
    const t = x / rx
    const y = Math.round(ry * Math.sqrt(Math.max(0, 1 - t * t)))
    if (prev >= 0) for (let k = Math.min(prev, y); k <= Math.max(prev, y); k++) put(p, cx + x, cy - k, c)
    else put(p, cx + x, cy - y, c)
    prev = y
  }
}

// Row-art colour codes. Dynamic slots are rewritten before stamping a look.
const ART = new Int8Array(128).fill(-1)
const ART_PINK = -2
const ART_SKIN = -3
'kmGonptsgrLybMcw'.split('').forEach((ch, i) => {
  ART[ch.charCodeAt(0)] = i
})
ART['P'.charCodeAt(0)] = ART_PINK
ART['F'.charCodeAt(0)] = ART_SKIN

function setLook(look: Look): void {
  ART['J'.charCodeAt(0)] = look.jacket
  ART['j'.charCodeAt(0)] = look.shade
  ART['N'.charCodeAt(0)] = look.pants
}

/** Stamp row art. `P` is a pink (magenta/white) dither, `F` pale skin with sparse yellow highlights. */
function stamp(p: Pix, rows: readonly string[], ox: number, oy: number): void {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y]
    for (let x = 0; x < row.length; x++) {
      const v = ART[row.charCodeAt(x)]
      if (v === -1) continue
      const tx = ox + x
      const ty = oy + y
      if (v === ART_PINK) put(p, tx, ty, (tx + ty) & 1 ? MAGENTA : WHITE)
      else if (v === ART_SKIN) put(p, tx, ty, (tx & 1) && (ty & 1) ? YELLOW : WHITE)
      else put(p, tx, ty, v)
    }
  }
}

/** 1 px outline (4-connected) around every opaque pixel. */
function outline(p: Pix, c = K, maxRow = Number.POSITIVE_INFINITY): void {
  const src = p.d.slice()
  const { w, h } = p
  for (let y = 0; y < h && y <= maxRow; y++) {
    for (let x = 0; x < w; x++) {
      if (src[y * w + x]) continue
      if ((x > 0 && src[y * w + x - 1]) || (x < w - 1 && src[y * w + x + 1]) || (y > 0 && src[(y - 1) * w + x]) || (y < h - 1 && src[(y + 1) * w + x])) {
        p.d[y * w + x] = c + 1
      }
    }
  }
}

function blit(dst: Pix, src: Pix, ox: number, oy: number): void {
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const v = src.d[y * src.w + x]
      if (v) put(dst, ox + x, oy + y, v - 1)
    }
  }
}

function flipX(p: Pix): Pix {
  const q = pix(p.w, p.h)
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) q.d[y * p.w + p.w - 1 - x] = p.d[y * p.w + x]
  return q
}

/** Lossless quarter-turn rotation, clockwise. */
function rotCw(p: Pix): Pix {
  const q = pix(p.h, p.w)
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) q.d[x * q.w + (p.h - 1 - y)] = p.d[y * p.w + x]
  return q
}

function makeCanvas(w: number, h: number): Canvas {
  const c = document.createElement('canvas')
  c.width = Math.max(1, w)
  c.height = Math.max(1, h)
  return c
}

function toCanvas(p: Pix): Canvas {
  const c = makeCanvas(p.w, p.h)
  const g = c.getContext('2d')
  if (!g) return c
  const img = g.createImageData(p.w, p.h)
  for (let i = 0; i < p.d.length; i++) {
    const v = p.d[i]
    if (!v) continue
    const k = (v - 1) * 3
    img.data[i * 4] = RGB[k]
    img.data[i * 4 + 1] = RGB[k + 1]
    img.data[i * 4 + 2] = RGB[k + 2]
    img.data[i * 4 + 3] = 255
  }
  g.putImageData(img, 0, 0)
  return c
}

function sprite(p: Pix, ax: number, ay: number): Sprite {
  return { c: toCanvas(p), ax, ay }
}

// ---------------------------------------------------------------------------------------------------------------
// Bitmap faces: a 5x7 face (6x10 cell) for signs and balloons, and a bold Fixedsys-like 7x9 face (8x12 cell) for
// the status box. Rows are space separated; rows past the cap height are descenders.

type Font = { cw: number; ch: number; gw: number; codes: Map<number, number>; bits: Uint8Array[]; atlas: Map<number, Canvas> }

function makeFont(cw: number, ch: number, gw: number, glyphs: Record<string, string>): Font {
  const codes = new Map<number, number>()
  const bits: Uint8Array[] = []
  for (const key of Object.keys(glyphs)) {
    const b = new Uint8Array(gw * ch)
    glyphs[key].split(' ').forEach((row, y) => {
      for (let x = 0; x < gw && x < row.length; x++) if (row[x] === '#') b[y * gw + x] = 1
    })
    codes.set(key.charCodeAt(0), bits.length)
    bits.push(b)
  }
  return { cw, ch, gw, codes, bits, atlas: new Map() }
}

const SMALL = makeFont(6, 10, 5, {
  ' ': '.....',
  '!': '..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#..',
  '"': '.#.#. .#.#. .#.#.',
  '#': '.#.#. .#.#. ##### .#.#. ##### .#.#. .#.#.',
  $: '..#.. .#### #.#.. .###. ..#.# ####. ..#..',
  '%': '##..# ##..# ...#. ..#.. .#... #..## #..##',
  '&': '.##.. #..#. #.#.. .#... #.#.# #..#. .##.#',
  "'": '..#.. ..#.. .#...',
  '(': '...#. ..#.. .#... .#... .#... ..#.. ...#.',
  ')': '.#... ..#.. ...#. ...#. ...#. ..#.. .#...',
  '*': '..... ..#.. #.#.# .###. #.#.# ..#.. .....',
  '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....',
  ',': '..... ..... ..... ..... .##.. ..#.. .#...',
  '-': '..... ..... ..... ##### ..... ..... .....',
  '.': '..... ..... ..... ..... ..... .##.. .##..',
  '/': '..... ....# ...#. ..#.. .#... #.... .....',
  0: '.###. #...# #..## #.#.# ##..# #...# .###.',
  1: '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.',
  2: '.###. #...# ....# ...#. ..#.. .#... #####',
  3: '##### ...#. ..#.. ...#. ....# #...# .###.',
  4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
  5: '##### #.... ####. ....# ....# #...# .###.',
  6: '..##. .#... #.... ####. #...# #...# .###.',
  7: '##### ....# ...#. ..#.. .#... .#... .#...',
  8: '.###. #...# #...# .###. #...# #...# .###.',
  9: '.###. #...# #...# .#### ....# ...#. .##..',
  ':': '..... .##.. .##.. ..... .##.. .##.. .....',
  ';': '..... .##.. .##.. ..... .##.. ..#.. .#...',
  '<': '...#. ..#.. .#... #.... .#... ..#.. ...#.',
  '=': '..... ..... ##### ..... ##### ..... .....',
  '>': '.#... ..#.. ...#. ....# ...#. ..#.. .#...',
  '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
  '@': '.###. #...# ....# .##.# #.#.# #.#.# .###.',
  A: '.###. #...# #...# #...# ##### #...# #...#',
  B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.###. #...# #.... #.... #.... #...# .###.',
  D: '###.. #..#. #...# #...# #...# #..#. ###..',
  E: '##### #.... #.... ####. #.... #.... #####',
  F: '##### #.... #.... ####. #.... #.... #....',
  G: '.###. #...# #.... #.### #...# #...# .####',
  H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '.###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.',
  J: '..### ...#. ...#. ...#. ...#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
  L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#',
  N: '#...# #...# ##..# #.#.# #..## #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.',
  P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#',
  R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.#### #.... #.... .###. ....# ....# ####.',
  T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.',
  V: '#...# #...# #...# #...# #...# .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# #.#.# .#.#.',
  X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# #...# .#.#. ..#.. ..#.. ..#..',
  Z: '##### ....# ...#. ..#.. .#... #.... #####',
  '[': '.###. .#... .#... .#... .#... .#... .###.',
  '\\': '..... #.... .#... ..#.. ...#. ....# .....',
  ']': '.###. ...#. ...#. ...#. ...#. ...#. .###.',
  '^': '..#.. .#.#. #...#',
  _: '..... ..... ..... ..... ..... ..... #####',
  '`': '.#... ..#.. ...#.',
  a: '..... ..... .###. ....# .#### #...# .####',
  b: '#.... #.... #.##. ##..# #...# #...# ####.',
  c: '..... ..... .###. #.... #.... #...# .###.',
  d: '....# ....# .##.# #..## #...# #...# .####',
  e: '..... ..... .###. #...# ##### #.... .###.',
  f: '..##. .#..# .#... ###.. .#... .#... .#...',
  g: '..... ..... .#### #...# #...# #...# .#### ....# .###.',
  h: '#.... #.... #.##. ##..# #...# #...# #...#',
  i: '..#.. ..... .##.. ..#.. ..#.. ..#.. .###.',
  j: '...#. ..... ..##. ...#. ...#. ...#. ...#. #..#. .##..',
  k: '#.... #.... #..#. #.#.. ##... #.#.. #..#.',
  l: '.##.. ..#.. ..#.. ..#.. ..#.. ..#.. .###.',
  m: '..... ..... ##.#. #.#.# #.#.# #...# #...#',
  n: '..... ..... #.##. ##..# #...# #...# #...#',
  o: '..... ..... .###. #...# #...# #...# .###.',
  p: '..... ..... ####. #...# #...# #...# ####. #.... #....',
  q: '..... ..... .#### #...# #...# #...# .#### ....# ....#',
  r: '..... ..... #.##. ##..# #.... #.... #....',
  s: '..... ..... .###. #.... .###. ....# ####.',
  t: '.#... .#... ###.. .#... .#... .#..# ..##.',
  u: '..... ..... #...# #...# #...# #..## .##.#',
  v: '..... ..... #...# #...# #...# .#.#. ..#..',
  w: '..... ..... #...# #...# #.#.# #.#.# .#.#.',
  x: '..... ..... #...# .#.#. ..#.. .#.#. #...#',
  y: '..... ..... #...# #...# #...# #...# .#### ....# .###.',
  z: '..... ..... ##### ...#. ..#.. .#... #####',
  '{': '...#. ..#.. ..#.. .#... ..#.. ..#.. ...#.',
  '|': '..#.. ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  '}': '.#... ..#.. ..#.. ...#. ..#.. ..#.. .#...',
  '~': '..... ..... .#... #.#.# ...#.',
  '\u25c4': '...#. ..##. .###. ####. .###. ..##. ...#.',
  '\u25ba': '.#... .##.. .###. .#### .###. .##.. .#...',
  '\u25bc': '..... ##### ##### .###. .###. ..#.. ..#..',
  '\u25b2': '..#.. ..#.. .###. .###. ##### ##### .....',
  '\u2014': '..... ..... ..... ##### ..... ..... .....',
})

const BIG = makeFont(8, 12, 7, {
  ' ': '.......',
  0: '..###.. .##.##. ##...## ##...## ##...## ##...## ##...## .##.##. ..###..',
  1: '...##.. ..###.. .####.. ...##.. ...##.. ...##.. ...##.. ...##.. .######',
  2: '.#####. ##...## .....## ....##. ...##.. ..##... .##.... ##..... #######',
  3: '.#####. ##...## .....## .....## ..####. .....## .....## ##...## .#####.',
  4: '....##. ...###. ..####. .##.##. ##..##. ####### ....##. ....##. ...####',
  5: '####### ##..... ##..... ######. .....## .....## .....## ##...## .#####.',
  6: '..####. .##.... ##..... ######. ##...## ##...## ##...## ##...## .#####.',
  7: '####### ##...## .....## ....##. ...##.. ..##... ..##... ..##... ..##...',
  8: '.#####. ##...## ##...## ##...## .#####. ##...## ##...## ##...## .#####.',
  9: '.#####. ##...## ##...## ##...## .###### .....## .....## ....##. .####..',
  ':': '....... ....... ..##... ..##... ....... ....... ..##... ..##... .......',
  '.': '....... ....... ....... ....... ....... ....... ....... ..##... ..##...',
  '/': '......# .....## ....##. ...##.. ..##... .##.... ##..... #...... .......',
  '-': '....... ....... ....... ....... .#####. ....... ....... ....... .......',
  T: '######. #.##.#. ..##... ..##... ..##... ..##... ..##... ..##... .####..',
  D: '#####.. .##.##. .##..## .##..## .##..## .##..## .##..## .##.##. #####..',
  S: '.#####. ##...## ##..... .##.... ..###.. ....##. .....## ##...## .#####.',
  d: '....### .....## .....## .###### ##...## ##...## ##...## ##...## .###.##',
  e: '....... ....... ....... .#####. ##...## ####### ##..... ##...## .#####.',
  i: '..##... ..##... ....... .###... ..##... ..##... ..##... ..##... .####..',
  l: '.###... ..##... ..##... ..##... ..##... ..##... ..##... ..##... .####..',
  m: '....... ....... ....... ###.##. ####### ##.#.## ##.#.## ##.#.## ##...##',
  p: '....... ....... ....... ##.###. .##..## .##..## .##..## .##..## .#####. .##.... ####...',
  s: '....... ....... ....... .#####. ##..... .#####. .....## ##...## .#####.',
  t: '...#... ..##... ..##... ######. ..##... ..##... ..##... ..##.## ...###.',
  y: '....... ....... ....... ##...## ##...## ##...## ##...## ##...## .###### .....## .#####.',
})

function stampText(p: Pix, font: Font, text: string, x: number, y: number, c: number): void {
  for (let i = 0; i < text.length; i++) {
    const g = font.codes.get(text.charCodeAt(i))
    if (g === undefined) continue
    const b = font.bits[g]
    for (let gy = 0; gy < font.ch; gy++) {
      for (let gx = 0; gx < font.gw; gx++) if (b[gy * font.gw + gx]) put(p, x + i * font.cw + gx, y + gy, c)
    }
  }
}

/** Glyph atlas for one colour, built on first use. */
function atlas(font: Font, c: number): Canvas {
  let a = font.atlas.get(c)
  if (!a) {
    const p = pix(font.bits.length * font.cw, font.ch)
    font.bits.forEach((b, g) => {
      for (let gy = 0; gy < font.ch; gy++) for (let gx = 0; gx < font.gw; gx++) if (b[gy * font.gw + gx]) put(p, g * font.cw + gx, gy, c)
    })
    a = toCanvas(p)
    font.atlas.set(c, a)
  }
  return a
}

function drawGlyph(ctx: CanvasRenderingContext2D, font: Font, img: Canvas, code: number, x: number, y: number): void {
  const g = font.codes.get(code)
  if (g !== undefined) ctx.drawImage(img, g * font.cw, 0, font.cw, font.ch, x, y, font.cw, font.ch)
}

/** Greedy word wrap at `max` characters; a dash ends a line early when it sits past the midpoint. */
function wrap(text: string, max: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > max && cur) {
      lines.push(cur)
      cur = w
    } else cur = next
    if (w === '\u2014' && cur.length > max / 3) {
      lines.push(cur)
      cur = ''
    }
  }
  if (cur) lines.push(cur)
  return lines
}

// ---------------------------------------------------------------------------------------------------------------
// Heads: real Quest heads quantized to VGA with sparse skin highlights, or procedural stand-ins

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
let scratch: Canvas | null = null
const mixes = new Map<number, number>()

/** Hand-picked VGA weaves for skin, light to dark: [lowest luma, colour a, colour b, quarters of b]. */
const SKIN_RAMP = [
  [172, WHITE, YELLOW, 1],
  [140, SILVER, YELLOW, 1],
]

/**
 * Skin follows curated warm VGA weaves with sparse highlights. Other features, including eyes, use their
 * nearest colour without pattern dithering.
 * Returns `a | b << 4 | quarters << 8` (quarters of `b`).
 */
function mixFor(r: number, g: number, b: number): number {
  const key = (r << 16) | (g << 8) | b
  const hit = mixes.get(key)
  if (hit !== undefined) return hit
  if (r >= g && g >= b && r >= 90 && r - b >= 30 && r - g <= 100 && b >= r * 0.25) {
    const luma = (r * 3 + g * 6 + b) / 10
    for (const [min, a, c, q] of SKIN_RAMP) {
      if (luma < min) continue
      const out = a | (c << 4) | (q << 8)
      mixes.set(key, out)
      return out
    }
    const base = luma >= 100 ? OLIVE : MAROON
    const highlight = luma >= 100 ? YELLOW : OLIVE
    const out = base | (highlight << 4) | (1 << 8)
    mixes.set(key, out)
    return out
  }
  const out = nearest(r, g, b)
  mixes.set(key, out)
  return out
}

function quantize(src: CanvasImageSource, r: { sx: number; sy: number; sw: number; sh: number }): Pix | null {
  try {
    if (!scratch) scratch = makeCanvas(16, 16)
    const g = scratch.getContext('2d', { willReadFrequently: true })
    if (!g) return null
    g.imageSmoothingEnabled = false
    g.clearRect(0, 0, 16, 16)
    g.drawImage(src, r.sx, r.sy, r.sw, r.sh, 0, 0, 16, 16)
    const data = g.getImageData(0, 0, 16, 16).data
    const p = pix(16, 16)
    let opaque = 0
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const i = (y * 16 + x) * 4
        if (data[i + 3] < 128) continue
        const m = mixFor(data[i], data[i + 1], data[i + 2])
        const threshold = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16
        put(p, x, y, threshold * 4 < m >> 8 ? (m >> 4) & 15 : m & 15)
        opaque++
      }
    }
    return opaque > 8 ? p : null
  } catch {
    return null
  }
}

/** Back of the head: the front silhouette filled with the dominant colour of its top rows (hair, or scalp). */
function backOf(front: Pix): Pix {
  const counts = new Uint16Array(16)
  let rows = 0
  for (let y = 0; y < 16 && rows < 4; y++) {
    let any = false
    for (let x = 0; x < 16; x++) {
      const c = at(front, x, y)
      if (c >= 0) {
        counts[c]++
        any = true
      }
    }
    if (any) rows++
  }
  let hair = K
  for (let i = 1; i < 16; i++) if (counts[i] > counts[hair]) hair = i
  const p = pix(16, 16)
  for (let i = 0; i < 256; i++) if (front.d[i]) p.d[i] = hair + 1
  return p
}

/** 8x8 chairlift-rider head: majority colour of each 2x2 block. */
function tinyOf(front: Pix): Pix {
  const p = pix(8, 8)
  const votes = new Int8Array(4)
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      votes[0] = at(front, x * 2, y * 2)
      votes[1] = at(front, x * 2 + 1, y * 2)
      votes[2] = at(front, x * 2, y * 2 + 1)
      votes[3] = at(front, x * 2 + 1, y * 2 + 1)
      let best = -1
      let bestN = 1
      for (let a = 0; a < 4; a++) {
        if (votes[a] < 0) continue
        let n = 0
        for (let b = 0; b < 4; b++) if (votes[b] === votes[a]) n++
        if (n > bestN || (best < 0 && n >= 1)) {
          best = votes[a]
          bestN = n
        }
      }
      let filled = 0
      for (let a = 0; a < 4; a++) if (votes[a] >= 0) filled++
      if (best >= 0 && filled >= 2) put(p, x, y, best)
    }
  }
  return p
}

const HEAD_FRONT = [
  '................',
  '...ww...........',
  '...wwHH.........',
  '.....HHHHH......',
  '....HHHHHHHH....',
  '...HHHHHHHHHH...',
  '...wwwwwwwwww...',
  '...FFFFFFFFFF...',
  '...FFkFFFFkFF...',
  '...FFFFFFFFFF...',
  '...FFFFFFFFFF...',
  '....FFkkkkFF....',
  '.....FFFFFF.....',
  '................',
  '................',
  '................',
]
const HEAD_SIDE = [
  '................',
  '..ww............',
  '..wwHH..........',
  '....HHHHH.......',
  '...HHHHHHHH.....',
  '...HHHHHHHHH....',
  '...wwwwwwwww....',
  '...FFFFFFFFFF...',
  '...FFFFFFFkFF...',
  '...FFFFFFFFFFF..',
  '...FFFFFFFFFF...',
  '....FFFFFFkk....',
  '.....FFFFFF.....',
  '................',
  '................',
  '................',
]
const HEAD_TINY = ['..HHHH..', '.HHHHHH.', '.wwwwww.', '.FkFFkF.', '.FFFFFF.', '..FkkF..', '........', '........']
const CABALD_HEAD = [
  '................',
  '.....PPPPPP.....',
  '....PPPwwPPP....',
  '...PPPPPwPPPP...',
  '...PPPPPPPPPP...',
  '..PPPPPPPPPPPP..',
  '..PPkkPPPPkkPP..',
  '..PPrkPPPPkrPP..',
  '.PPPPPPPPPPPPPP.',
  '..PPPPPkkPPPPP..',
  '..PPkyyyyyykPP..',
  '...PPkkkkkkPP...',
  '....PPPPPPPP....',
  '.....PPPPPP.....',
  '................',
  '................',
]

const fallbackCache = new Map<number, HeadSet>()

/** Procedural knit-cap head in the given hat colour, until (or instead of) the real Quest head. */
function fallbackFor(hat: number): HeadSet {
  let set = fallbackCache.get(hat)
  if (set) return set
  ART['H'.charCodeAt(0)] = hat
  const front = pix(16, 16)
  stamp(front, HEAD_FRONT, 0, 0)
  const side = pix(16, 16)
  stamp(side, HEAD_SIDE, 0, 0)
  const back = pix(16, 16)
  for (let i = 0; i < 256; i++) if (front.d[i]) back.d[i] = (i >> 4) <= 6 ? hat + 1 : WHITE + 1
  const tiny = pix(8, 8)
  stamp(tiny, HEAD_TINY, 0, 0)
  set = { front, side, sideL: flipX(side), back, tiny }
  fallbackCache.set(hat, set)
  return set
}

let headSrc: HeadSource | null = null
const realHeads = new Map<number, HeadSet | null>()
const cabaldHeads = new Map<number, Pix>()

function syncHeadSource(heads: HeadSource | null): void {
  if (heads !== headSrc) {
    headSrc = heads
    realHeads.clear()
    cabaldHeads.clear()
  }
}

function realHead(heads: HeadSource, idx: number): HeadSet | null {
  let set = realHeads.get(idx)
  if (set === undefined) {
    const r = heads.rect(idx)
    const front = quantize(heads.front, r)
    const side = quantize(heads.side, r)
    set = front && side ? { front, side, sideL: flipX(side), back: backOf(front), tiny: tinyOf(front) } : null
    realHeads.set(idx, set)
  }
  return set
}

/** The Abominable Cabald's head: the real bald head (or a stand-in) with a pink scalp shine and pink outline. */
function cabaldHead(art: SkiArt): Pix {
  const idx = art.heads && art.cabald >= 0 ? art.cabald : -1
  let p = cabaldHeads.get(idx)
  if (p) return p
  const real = art.heads && idx >= 0 ? quantize(art.heads.front, art.heads.rect(idx)) : null
  if (real) {
    p = real
    // Scalp: the two topmost opaque pixels of each column turn pink (dithered magenta/white).
    for (let x = 0; x < 16; x++) {
      let n = 0
      for (let y = 0; y < 8 && n < 2; y++) {
        if (at(p, x, y) < 0) continue
        put(p, x, y, (x + y) & 1 ? MAGENTA : WHITE)
        n++
      }
    }
    outline(p, MAGENTA, 8)
  } else {
    p = pix(16, 16)
    stamp(p, CABALD_HEAD, 0, 0)
  }
  cabaldHeads.set(idx, p)
  return p
}

// ---------------------------------------------------------------------------------------------------------------
// Skier bodies (24x32 composite, head at 4,0, ground contact row 29)

const SK_W = 24
const SK_AX = 12
const SK_AY = 29
const AIR = 7
const BACK = 8

const TORSO_FRONT = [
  '........JJJJJJJJ........',
  '.......JJJJJJJJJJ.......',
  '......JJJJJjjJJJJJ......',
  '.....JJ.JJJjjJJJ.JJ.....',
  '....JJ..JJJjjJJJ..JJ....',
  '....jj..JJJjjJJJ..jj....',
  '....kk..NNNNNNNN..kk....',
  '........NNNNNNNN........',
]
const TORSO_SIDE = [
  '........JJJJJJJ.........',
  '.......JJJJJJJJJ........',
  '.......JJJJJJJJJ........',
  '.......JJjJJJJJ.JJ......',
  '.......JJjJJJJJ..JJ.....',
  '.......JJjJJJJJ..kk.....',
  '.......NNNNNNNN.........',
  '........NNNNNNN.........',
]
const TORSO_AIR = [
  '.kk.....JJJJJJJJ.....kk.',
  '..JJ...JJJJJJJJJJ...JJ..',
  '...JJ.JJJJJjjJJJJJ.JJ...',
  '....JJ.JJJJjjJJJJ.JJ....',
  '.......JJJJjjJJJJ.......',
  '.......JJJJjjJJJJ.......',
  '.......NNNNNNNNNN.......',
  '........NNNNNNNN........',
]
const LEGS_DOWN = ['........NNN..NNN........', '........NNN..NNN........', '........NNN..NNN........', '........NN....NN........', '........kk....kk........']
const LEGS_DIAG = ['........NNN..NNN........', '.........NNN..NNN.......', '.........NNN..NNN.......', '..........NN...NN.......', '..........kk...kk.......']
const LEGS_STEEP = ['........NNNNNN..........', '.........NNNNNN.........', '..........NNNN..........', '.........NNNN...........', '.........kkkkk..........']
const LEGS_FLAT = ['........NNNNNN..........', '........NNNNNN..........', '........NNNNNN..........', '........NNNNNN..........', '........kkkkkkk.........']
const LEGS_AIR = ['.......NNN....NNN.......', '......NNN......NNN......', '......NN........NN......', '.....kkk........kkk.....', '........................']

/** Right-facing pose index for frame kinds 3..8 (left frames mirror 4..6). */
function bodyRows(kind: number): [readonly string[], readonly string[]] {
  switch (kind) {
    case 4:
      return [TORSO_FRONT, LEGS_DIAG]
    case 5:
      return [TORSO_SIDE, LEGS_STEEP]
    case 6:
      return [TORSO_SIDE, LEGS_FLAT]
    case AIR:
      return [TORSO_AIR, LEGS_AIR]
    default:
      return [TORSO_FRONT, LEGS_DOWN]
  }
}

function drawBoard(p: Pix, kind: number, c: number): void {
  switch (kind) {
    case 4:
      line(p, 6, 24, 16, 30, c, false, 2)
      break
    case 5:
      line(p, 2, 26, 20, 29, c, false, 2)
      break
    case 6:
      rect(p, 3, 28, 18, 2, c)
      put(p, 2, 28, c)
      put(p, 21, 28, c)
      break
    case AIR:
      line(p, 4, 27, 18, 27, c, false, 2)
      break
    default:
      oval(p, 11.5, 28, 2.5, 4, c)
  }
}

/** Skis pass behind the body above the boots and in front of it from the boots to the tips. */
function drawSkis(p: Pix, kind: number, X: (x: number) => number): void {
  const ski = (x0: number, y0: number, x1: number, y1: number) => {
    line(p, X(x0), y0, X(x1), y1, K, true)
    if (y0 < 27 && y1 > 27) line(p, X(Math.round(x0 + ((x1 - x0) * (27 - y0)) / (y1 - y0))), 27, X(x1), y1, K)
  }
  const pole = (x0: number, y0: number, x1: number, y1: number) => {
    line(p, X(x0), y0, X(x1), y1, GREY)
    put(p, X(x1) - 1, y1 - 1, K)
    put(p, X(x1) + 1, y1 - 1, K)
  }
  switch (kind) {
    case 4:
      ski(4, 21, 14, 31)
      ski(9, 21, 19, 31)
      pole(4, 22, 2, 27)
      pole(19, 22, 22, 26)
      break
    case 5:
      ski(1, 26, 21, 30)
      ski(1, 27, 21, 31)
      put(p, X(22), 29, K)
      pole(18, 21, 20, 29)
      break
    case 6:
      ski(1, 28, 21, 28)
      put(p, X(22), 27, K)
      ski(3, 30, 22, 30)
      put(p, X(23), 29, K)
      pole(18, 21, 19, 29)
      break
    case AIR:
      ski(3, 23, 9, 30)
      ski(20, 23, 14, 30)
      break
    default:
      ski(9, 27, 9, 31)
      ski(14, 27, 14, 31)
      pole(4, 22, 2, 28)
      pole(19, 22, 21, 28)
  }
}

/**
 * Build one composite: kinds 0..6 are the seven directions, 7 airborne, 8 seen from behind (spins).
 * Bodies are authored facing right and mirrored for the left; heads use the profile atlas (flipping allowed).
 */
function buildSkier(kind: number, look: Look, heads: HeadSet, gear = true): Pix {
  const left = kind < 3
  const rk = left ? 6 - kind : kind
  setLook(look)
  let p = pix(SK_W, 32)
  if (look.snowboard) drawBoard(p, rk, look.board)
  const [torso, legs] = bodyRows(rk)
  stamp(p, torso, 0, 15)
  stamp(p, legs, 0, 23)
  if (left) p = flipX(p)
  const head = kind === BACK ? heads.back : kind === 3 || kind === AIR ? heads.front : left ? heads.sideL : heads.side
  blit(p, head, 4, 0)
  outline(p)
  if (gear && !look.snowboard) drawSkis(p, rk, left ? (x) => SK_W - 1 - x : (x) => x)
  return p
}

function buildSkierSet(look: Look, heads: HeadSet): SkierSet {
  const frames: Sprite[] = []
  for (let k = 0; k <= BACK; k++) frames.push(sprite(buildSkier(k, look, heads), SK_AX, SK_AY))
  const air = buildSkier(AIR, look, heads)
  const flips: Sprite[] = [frames[AIR]]
  let r = air
  for (let q = 1; q < 4; q++) {
    r = rotCw(r)
    flips.push(sprite(r, r.w >> 1, (r.h >> 1) + 13))
  }
  // Face plant: the bare body on its side, skis crossed in an X (or the board thrown flat).
  const lying = rotCw(buildSkier(3, look, heads, false))
  const sp = pix(lying.w, lying.h + 4)
  blit(sp, lying, 0, 4)
  if (look.snowboard) {
    line(sp, 1, 25, 14, 22, look.board, false, 2)
    outline(sp, K)
  } else {
    line(sp, 1, 6, 13, 26, K)
    line(sp, 1, 26, 13, 6, K)
    line(sp, 15, 2, 22, 5, GREY)
    line(sp, 18, 27, 26, 25, GREY)
  }
  return { frames, flips, sprawl: sprite(sp, sp.w >> 1, sp.h - 3), air, tiny: heads.tiny }
}

// ---------------------------------------------------------------------------------------------------------------
// Static scenery sprites

type Statics = {
  tree: Sprite[]
  bigTree: Sprite
  deadTree: Sprite
  stump: Sprite
  mushroom: Sprite
  rock: Sprite[]
  mogul: Sprite[]
  ramp: Sprite
  rainbow: Sprite
  dog: Sprite[]
  yellow: Sprite
  hydrant: Sprite
  tower: Sprite
  gate: Sprite[]
  shadow: Sprite
  status: Canvas
}
let S: Statics | null = null

function buildTree(w: number, h: number, tiers: number, seed: number): Pix {
  const p = pix(w, h)
  const cx = w / 2
  const trunkH = Math.round(h * 0.14)
  const trunkW = w >= 32 ? 4 : 2
  const top = 1
  const bottom = h - 2 - trunkH
  rect(p, Math.round(cx - trunkW / 2), bottom, trunkW, h - 1 - bottom, MAROON)
  const span = bottom - top
  const step = 0.6 / (tiers - 1)
  for (let t = 0; t < tiers; t++) {
    const s = top + Math.round(span * t * step)
    const e = top + Math.round(span * (t * step + 0.4))
    const hwMax = (w / 2 - 1.5) * (0.45 + (0.55 * (t + 1)) / tiers)
    const hwTop = t === 0 ? 0.5 : hwMax * 0.3
    for (let y = s; y <= e; y++) {
      const hw = hwTop + ((hwMax - hwTop) * (y - s)) / Math.max(1, e - s)
      for (let x = 0; x < w; x++) {
        if (Math.abs(x + 0.5 - cx) > hw) continue
        if (y === e && (x + t) % 2 === 0) continue
        put(p, x, y, GREEN)
      }
    }
  }
  // Christmas-card speckles, as on the 1991 tree bitmaps.
  const dots = [RED, YELLOW, OLIVE, BLUE, YELLOW, LIME]
  for (let y = 2; y < bottom; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (at(p, x, y) !== GREEN || at(p, x - 1, y) !== GREEN || at(p, x + 1, y) !== GREEN) continue
      const hv = hash(x, y, seed) % 23
      if (hv < dots.length) put(p, x, y, dots[hv])
    }
  }
  outline(p)
  return p
}

function buildDeadTree(): Pix {
  const p = pix(16, 32)
  rect(p, 7, 7, 2, 24, MAROON)
  outline(p)
  line(p, 7, 23, 2, 16, MAROON)
  line(p, 2, 16, 1, 13, MAROON)
  line(p, 8, 19, 13, 12, MAROON)
  line(p, 13, 12, 14, 9, MAROON)
  line(p, 7, 14, 3, 8, MAROON)
  line(p, 8, 10, 11, 5, MAROON)
  line(p, 7, 6, 7, 1, MAROON)
  line(p, 4, 18, 4, 15, MAROON)
  line(p, 11, 15, 12, 17, MAROON)
  return p
}

function buildStump(): Pix {
  const p = pix(16, 10)
  rect(p, 2, 3, 12, 5, MAROON)
  oval(p, 8, 7.5, 6, 1.5, MAROON)
  oval(p, 8, 3, 6, 2, OLIVE)
  put(p, 7, 3, MAROON)
  put(p, 8, 2, MAROON)
  put(p, 10, 3, MAROON)
  put(p, 5, 5, OLIVE)
  put(p, 10, 6, OLIVE)
  outline(p)
  return p
}

function buildMushroom(): Pix {
  const p = pix(16, 16)
  oval(p, 8, 7, 7, 6, RED)
  rect(p, 0, 7, 16, 9, -1)
  put(p, 5, 3, WHITE)
  put(p, 6, 3, WHITE)
  put(p, 10, 2, WHITE)
  put(p, 11, 4, WHITE)
  put(p, 3, 5, WHITE)
  put(p, 8, 5, WHITE)
  rect(p, 2, 7, 12, 1, SILVER)
  rect(p, 6, 8, 4, 6, WHITE)
  outline(p)
  return p
}

function buildRock(big: boolean): Pix {
  const w = big ? 22 : 16
  const h = big ? 12 : 9
  const p = pix(w, h)
  oval(p, w / 2, h - 1, w / 2 - 1.5, h - 2, GREY)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (at(p, x, y) !== GREY) continue
      const hv = hash(x, y, w) % 7
      if (hv === 0) put(p, x, y, K)
      else if (hv < 3 && x < w / 2 + 2) put(p, x, y, SILVER)
    }
  }
  outline(p)
  return p
}

function buildMogul(v: number): Pix {
  const p = pix(26, 9)
  if (v === 0) {
    arc(p, 6, 7, 5, 3, SILVER)
    arc(p, 18, 8, 6, 3, SILVER)
    arc(p, 12, 4, 4, 2, SILVER)
  } else if (v === 1) {
    arc(p, 8, 8, 7, 4, SILVER)
    arc(p, 19, 6, 5, 3, SILVER)
  } else {
    arc(p, 12, 7, 6, 3, SILVER)
  }
  return p
}

function buildRamp(): Pix {
  const p = pix(32, 10)
  for (let y = 2; y <= 8; y++) {
    const inset = Math.round(((8 - y) * 5) / 6)
    for (let x = 1 + inset; x <= 30 - inset; x++) put(p, x, y, y <= 4 ? WHITE : SILVER)
  }
  for (let x = 4; x <= 27; x += 3) put(p, x, 6, GREY)
  rect(p, 2, 8, 28, 1, GREY)
  outline(p)
  return p
}

function buildRainbow(): Pix {
  const p = pix(32, 8)
  const bands = [RED, RED, YELLOW, LIME, CYAN, BLUE, PURPLE, MAGENTA]
  for (let y = 0; y < 8; y++) rect(p, 0, y, 32, 1, bands[y])
  return p
}

const DOG = [
  ['..............mm..', '.............oooo.', '..o..........okooo', '...o.........oooo.', '....oooooooorrr...', '....ooooooooooy...', '....oooooooooo....', '....oo..o...oo....', '...oo...oo...oo...', '..................'],
  ['..............mm..', '.............oooo.', '..o..........okooo', '...o.........oooo.', '....oooooooorrr...', '....ooooooooooy...', '....oooooooooo....', '.....oo.oo..oo....', '.....oo..oo.oo....', '..................'],
]

function buildDog(frame: number): Pix {
  const p = pix(19, 12)
  stamp(p, DOG[frame], 0, 1)
  outline(p)
  return p
}

function buildYellow(): Pix {
  const p = pix(12, 6)
  oval(p, 6, 3, 5, 2, YELLOW)
  for (let i = 0; i < p.d.length; i++) if (p.d[i] && hash(i, 3, 7) % 5 === 0) p.d[i] = OLIVE + 1
  outline(p)
  return p
}

const HYDRANT = ['....ss....', '...rrrr...', '..rrrrrr..', '.srrrrrrs.', '.srrrrrrs.', '..rrrrrr..', '..rmrrrr..', '..rmrrrr..', '..rmrrrr..', '.ssssssss.']

function buildHydrant(): Pix {
  const p = pix(10, 12)
  stamp(p, HYDRANT, 0, 1)
  outline(p)
  return p
}

function buildTower(): Pix {
  const p = pix(18, 64)
  rect(p, 7, 6, 4, 46, K)
  rect(p, 7, 52, 4, 11, YELLOW)
  rect(p, 2, 3, 14, 2, K)
  rect(p, 1, 3, 1, 5, K)
  rect(p, 16, 3, 1, 5, K)
  put(p, 2, 7, K)
  put(p, 15, 7, K)
  rect(p, 8, 10, 2, 2, YELLOW)
  rect(p, 8, 11, 2, 1, RED)
  rect(p, 6, 62, 6, 1, K)
  outline(p, K, 63)
  for (let y = 53; y < 62; y++) put(p, 8, y, OLIVE)
  return p
}

function buildGate(side: number): Pix {
  const p = pix(12, 26)
  const c = side < 0 ? BLUE : RED
  for (let y = 2; y <= 8; y++) {
    const len = 6 - Math.abs(y - 5)
    for (let i = 1; i <= len; i++) put(p, side < 0 ? 6 - i : 6 + i, y, c)
  }
  outline(p)
  line(p, 6, 1, 6, 25, K)
  return p
}

function buildShadow(): Pix {
  const p = pix(14, 4)
  oval(p, 7, 2, 7, 2, SILVER)
  for (let i = 0; i < p.d.length; i++) if (((i % 14) + Math.floor(i / 14)) & 1) p.d[i] = 0
  return p
}

// Status box (static part): 1 px black border, black-on-white labels; digits are blitted per frame.
const ST_PAD = 3
const ST_LINE = 12
const ST_COLS = 17
const ST_W = ST_COLS * 8 + ST_PAD * 2
const ST_H = ST_LINE * 4 + 5

function buildStatus(): Canvas {
  const p = pix(ST_W, ST_H)
  rect(p, 0, 0, ST_W, ST_H, K)
  rect(p, 1, 1, ST_W - 2, ST_H - 2, WHITE)
  const t = STRINGS.status
  const col = (c: number) => ST_PAD + c * 8
  const row = (r: number) => 3 + r * ST_LINE
  stampText(p, BIG, t.time, col(0), row(0), K)
  stampText(p, BIG, ':', col(8), row(0), K)
  stampText(p, BIG, ':', col(11), row(0), K)
  stampText(p, BIG, '.', col(14), row(0), K)
  stampText(p, BIG, t.dist, col(0), row(1), K)
  stampText(p, BIG, t.meters, col(12), row(1), K)
  stampText(p, BIG, t.speed, col(0), row(2), K)
  stampText(p, BIG, t.speedUnit, col(12), row(2), K)
  stampText(p, BIG, t.style, col(0), row(3), K)
  return toCanvas(p)
}

function ensureStatic(): Statics {
  if (!S) {
    S = {
      tree: [sprite(buildTree(16, 32, 3, 1), 8, 31), sprite(buildTree(16, 32, 3, 2), 8, 31)],
      bigTree: sprite(buildTree(32, 64, 4, 3), 16, 63),
      deadTree: sprite(buildDeadTree(), 8, 31),
      stump: sprite(buildStump(), 8, 9),
      mushroom: sprite(buildMushroom(), 8, 15),
      rock: [sprite(buildRock(false), 8, 8), sprite(buildRock(true), 11, 11)],
      mogul: [sprite(buildMogul(0), 13, 8), sprite(buildMogul(1), 13, 8), sprite(buildMogul(2), 13, 8)],
      ramp: sprite(buildRamp(), 16, 9),
      rainbow: sprite(buildRainbow(), 16, 7),
      dog: [],
      yellow: sprite(buildYellow(), 6, 4),
      hydrant: sprite(buildHydrant(), 5, 11),
      tower: sprite(buildTower(), 9, 63),
      gate: [sprite(buildGate(-1), 6, 25), sprite(buildGate(1), 6, 25)],
      shadow: sprite(buildShadow(), 7, 2),
      status: buildStatus(),
    }
    for (let f = 0; f < 2; f++) {
      const d = buildDog(f)
      S.dog.push(sprite(d, 9, 11), sprite(flipX(d), 9, 11))
    }
  }
  return S
}

// ---------------------------------------------------------------------------------------------------------------
// Text sprites: signs, banners and balloons (built once per text)

const signCache = new Map<string, Sprite>()
const bannerCache = new Map<number, Sprite>()
const balloonCache = new Map<string, Canvas>()

function signSprite(text: string): Sprite {
  let s = signCache.get(text)
  if (s) return s
  const lines = wrap(text, 20)
  let cols = 0
  for (const l of lines) cols = Math.max(cols, l.length)
  const signs = STRINGS.signs
  const board = text === signs.mountain ? NAVY : text === signs.nothing ? YELLOW : WHITE
  const ink = board === NAVY ? WHITE : K
  const bw = cols * 6 + 7 + (board === NAVY ? 16 : 0)
  const bh = lines.length * 9 + 5
  const w = bw + 2
  const h = bh + 12
  const p = pix(w, h)
  rect(p, 1, 1, bw, bh, board)
  rect(p, Math.round(w * 0.25), bh + 1, 2, h - bh - 2, MAROON)
  rect(p, Math.round(w * 0.75) - 2, bh + 1, 2, h - bh - 2, MAROON)
  outline(p)
  lines.forEach((l, i) => {
    stampText(p, SMALL, l, 1 + Math.floor((bw - l.length * 6 + 1) / 2), 4 + i * 9, ink)
  })
  if (board === NAVY) {
    // A tiny snowy peak either side of the resort name.
    for (let i = 0; i < 3; i++) {
      line(p, 3 + i, bh - 1 - i, 3 + i, bh - 1, WHITE)
      line(p, 7 - i, bh - 1 - i, 7 - i, bh - 1, WHITE)
      line(p, w - 4 - i, bh - 1 - i, w - 4 - i, bh - 1, WHITE)
      line(p, w - 8 + i, bh - 1 - i, w - 8 + i, bh - 1, WHITE)
    }
  }
  s = sprite(p, w >> 1, h - 1)
  signCache.set(text, s)
  return s
}

const BANNER_COLOURS = [BLUE, BLUE, GREEN, PURPLE]
const COURSE_BY_VARIANT = ['slalom', 'slalom', 'tree', 'freestyle'] as const

function bannerSprite(o: WorldObject): Sprite {
  const radius = Math.max(0, Math.round(o.radius))
  const key = o.variant * 100000 + radius
  let s = bannerCache.get(key)
  if (s) return s
  const finish = o.variant >= 4
  const course = ((o.variant - 1) % 3) + 1
  const name = o.text ?? STRINGS.courseNames[COURSE_BY_VARIANT[course] ?? 'slalom']
  const label = `${name} ${finish ? STRINGS.banners.finish : STRINGS.banners.start}`.toUpperCase()
  const textW = label.length * 6 - 1
  const half = Math.max(radius, Math.ceil(textW / 2) + 8)
  const w = half * 2 + 4
  const h = 34
  const p = pix(w, h)
  const cloth = finish ? WHITE : BANNER_COLOURS[course] ?? BLUE
  rect(p, 4, 2, w - 8, 13, cloth)
  if (finish) {
    for (let x = 4; x < w - 4; x++) {
      for (const y of [2, 3, 13, 14]) if (((x >> 1) + (y >> 1)) & 1) put(p, x, y, K)
    }
  }
  rect(p, 1, 1, 2, h - 2, GREY)
  rect(p, w - 3, 1, 2, h - 2, GREY)
  outline(p)
  stampText(p, SMALL, label, Math.floor((w - textW) / 2), 5, finish ? K : WHITE)
  s = sprite(p, w >> 1, h - 1)
  bannerCache.set(key, s)
  return s
}

function balloon(text: string): Canvas {
  let c = balloonCache.get(text)
  if (c) return c
  const lines = wrap(text, 20)
  let cols = 0
  for (const l of lines) cols = Math.max(cols, l.length)
  const w = cols * 6 + 7
  const hb = lines.length * 10 + 4
  const p = pix(w, hb + 6)
  rect(p, 1, 0, w - 2, hb + 1, K)
  rect(p, 0, 1, w, hb - 1, K)
  rect(p, 1, 1, w - 2, hb - 1, WHITE)
  lines.forEach((l, i) => stampText(p, SMALL, l, 4, 3 + i * 10, K))
  // Tail pointing down-left at the speaker.
  for (let i = 0; i <= 5; i++) {
    const l = 8 - i
    const r = 13 - 2 * i
    for (let x = l; x <= r; x++) put(p, x, hb + i, x === l || x === r || i === 5 ? K : WHITE)
  }
  c = toCanvas(p)
  balloonCache.set(text, c)
  return c
}

// ---------------------------------------------------------------------------------------------------------------
// Character sets: player, NPC skiers, Degens, chairlift and the Abominable Cabald

let player: SkierSet | null = null
let playerHeads: HeadSet | null = null
let playerBuiltJacket = -1
let playerBuiltBoard = false
let playerShirt = ''
let playerJacket = RED
const npcSkiers = new Map<number, Sprite[]>()
const degens = new Map<number, Sprite[]>()
let chairs: Sprite[] | null = null
let chairOwner: SkierSet | null = null
let monster: Sprite[] | null = null
let monsterOwner: SkierSet | null = null
let monsterHead: Pix | null = null

const NPC_JACKETS = [BLUE, TEAL, PURPLE, GREEN, MAROON]
const NPC_HATS = [RED, YELLOW, WHITE, BLUE, MAGENTA]
const DEGEN_JACKETS = [MAGENTA, LIME, CYAN, YELLOW]
const DEGEN_BOARDS = [LIME, MAGENTA, YELLOW, CYAN]
const DEGEN_PANTS = [PURPLE, GREEN, TEAL, NAVY]

function lookFor(jacket: number, snowboard: boolean, board = YELLOW, pants = -1): Look {
  const dark = jacket === NAVY || jacket === BLUE || jacket === PURPLE || jacket === TEAL || jacket === K
  return { jacket, shade: SHADE[jacket], pants: pants >= 0 ? pants : dark ? GREY : NAVY, board, snowboard }
}

function ensurePlayer(art: SkiArt): SkierSet {
  if (art.shirt !== playerShirt) {
    playerShirt = art.shirt
    playerJacket = cssToVga(art.shirt)
  }
  syncHeadSource(art.heads)
  const heads = (art.heads && art.remy >= 0 ? realHead(art.heads, art.remy) : null) ?? fallbackFor(RED)
  if (!player || heads !== playerHeads || playerJacket !== playerBuiltJacket || art.snowboard !== playerBuiltBoard) {
    player = buildSkierSet(lookFor(playerJacket, art.snowboard), heads)
    playerHeads = heads
    playerBuiltJacket = playerJacket
    playerBuiltBoard = art.snowboard
  }
  return player
}

function npcSkier(variant: number): Sprite[] {
  const v = Math.abs(variant | 0) % NPC_JACKETS.length
  let set = npcSkiers.get(v)
  if (!set) {
    const look = lookFor(NPC_JACKETS[v], false)
    const heads = fallbackFor(NPC_HATS[v])
    set = [sprite(buildSkier(2, look, heads), SK_AX, SK_AY), sprite(buildSkier(4, look, heads), SK_AX, SK_AY), sprite(buildSkier(3, look, heads), SK_AX, SK_AY)]
    npcSkiers.set(v, set)
  }
  return set
}

function degen(variant: number): Sprite[] {
  const v = Math.abs(variant | 0) % DEGEN_JACKETS.length
  let set = degens.get(v)
  if (!set) {
    const look = lookFor(DEGEN_JACKETS[v], true, DEGEN_BOARDS[v], DEGEN_PANTS[v])
    const heads = fallbackFor(DEGEN_BOARDS[v])
    set = [1, 2, 4, 5].map((k) => sprite(buildSkier(k, look, heads), SK_AX, SK_AY))
    degens.set(v, set)
  }
  return set
}

/** Chairs (red box with hanger, as in 1991) carrying the player's own Remy, in four rider arrangements. */
function ensureChairs(owner: SkierSet): Sprite[] {
  if (!chairs || chairOwner !== owner) {
    chairs = []
    for (let v = 0; v < 4; v++) {
      const p = pix(26, 24)
      line(p, 13, 0, 13, 9, K)
      line(p, 13, 0, 16, 0, K)
      line(p, 16, 0, 16, 2, K)
      const riders = v === 0 ? 0 : v
      for (let r = 0; r < 2; r++) {
        if (!(riders & (1 << r))) continue
        const x = r === 0 ? 4 : 14
        rect(p, x + 1, 13, 7, 4, NPC_JACKETS[(v + r * 2) % NPC_JACKETS.length])
        const tiny = pix(8, 8)
        blit(tiny, owner.tiny, 0, 0)
        outline(tiny)
        blit(p, tiny, x, 6)
      }
      rect(p, 2, 15, 22, 8, RED)
      outline(p, K, 23)
      line(p, 2, 18, 23, 18, K)
      line(p, 13, 15, 13, 22, K)
      chairs.push(sprite(p, 13, 23))
    }
    chairOwner = owner
  }
  return chairs
}

const MEDALLION = ['..yyy..', '.yoooy.', 'yoyyyyy', 'yoyyyyy', 'yoyyyyy', '.yoooy.', '..yyy..']
const MON_W = 48
const MON_H = 66
const MOX = 8
const MOY = 24
const M_RUN0 = 0
const M_RUN1 = 1
const M_GRAB = 2
const M_CHEW0 = 3
const M_CHEW1 = 4
const M_BURP = 5
const M_WALK0 = 6
const M_WALK1 = 7

function monsterTorso(belly: number): Pix {
  const p = pix(MON_W, MON_H)
  const ox = MOX
  const oy = MOY
  oval(p, ox + 16, oy + 27.5, 9.5 + belly, 11.5, WHITE)
  for (let y = oy + 15; y < oy + 41; y++) {
    let first = -1
    let last = -1
    for (let x = 0; x < MON_W; x++) {
      if (at(p, x, y) < 0) continue
      if (first < 0) first = x
      last = x
    }
    if (first < 0) continue
    // Shaggy fur: side tufts every third row, right-hand shading, scattered grey tufts.
    if (y % 3 === 0) {
      put(p, first - 1, y, WHITE)
      put(p, last + 1, y, WHITE)
    }
    for (let x = first; x <= last; x++) {
      if (x > ox + 19 + belly && (x + y) & 1) put(p, x, y, SILVER)
      else if (hash(x, y, 5) % 13 === 0) put(p, x, y, SILVER)
    }
  }
  for (let x = ox + 9; x <= ox + 23; x += 2) {
    for (let y = MON_H - 1; y > oy + 30; y--) {
      if (at(p, x, y) >= 0) {
        put(p, x, y + 1, WHITE)
        break
      }
    }
  }
  stamp(p, MEDALLION, ox + 13, oy + 21)
  outline(p)
  line(p, ox + 11, oy + 17, ox + 13, oy + 21, YELLOW)
  line(p, ox + 21, oy + 17, ox + 19, oy + 21, YELLOW)
  return p
}

function claw(p: Pix, x: number, y: number, up: boolean): void {
  const d = up ? -1 : 1
  line(p, x, y, x - 2, y + 2 * d, K)
  line(p, x, y, x, y + 3 * d, K)
  line(p, x, y, x + 2, y + 2 * d, K)
}

function arm(p: Pix, x0: number, y0: number, x1: number, y1: number, up: boolean): void {
  line(p, MOX + x0, MOY + y0, MOX + x1, MOY + y1, K)
  line(p, MOX + x0, MOY + y0 + 1, MOX + x1, MOY + y1 + 1, K)
  claw(p, MOX + x1, MOY + y1, up)
}

function leg(p: Pix, x0: number, x1: number, y1: number): void {
  line(p, MOX + x0, MOY + 38, MOX + x1, MOY + y1, K)
  line(p, MOX + x0 + 1, MOY + 38, MOX + x1 + 1, MOY + y1, K)
  line(p, MOX + x1 - 3, MOY + y1, MOX + x1 + 3, MOY + y1, K)
  put(p, MOX + x1 - 3, MOY + y1 - 1, K)
  put(p, MOX + x1 + 3, MOY + y1 - 1, K)
}

function buildMonster(headArt: Pix, owner: SkierSet): Sprite[] {
  const head = pix(18, 18)
  blit(head, headArt, 1, 1)
  outline(head)
  const frames: Sprite[] = []
  for (let f = 0; f < 8; f++) {
    const p = monsterTorso(f === M_BURP ? 1.5 : 0)
    if (f === M_CHEW0 || f === M_CHEW1) blit(p, owner.air, MOX + 12, MOY + 6 + (f === M_CHEW1 ? 3 : 0))
    blit(p, head, MOX + 7, MOY)
    switch (f) {
      case M_RUN0:
        arm(p, 7, 20, 1, 8, true)
        arm(p, 25, 20, 30, 12, true)
        leg(p, 12, 10, 41)
        leg(p, 19, 22, 39)
        break
      case M_RUN1:
        arm(p, 7, 20, 2, 12, true)
        arm(p, 25, 20, 31, 8, true)
        leg(p, 12, 9, 39)
        leg(p, 19, 21, 41)
        break
      case M_GRAB: {
        arm(p, 7, 20, 3, -4, true)
        arm(p, 25, 20, 29, -4, true)
        leg(p, 12, 11, 41)
        leg(p, 19, 21, 41)
        const lying = rotCw(owner.air)
        blit(p, lying, MOX, MOY - 23)
        break
      }
      case M_CHEW0:
      case M_CHEW1:
        arm(p, 7, 21, 16, 26, true)
        arm(p, 25, 21, 29, 15, true)
        leg(p, 12, 11, 41)
        leg(p, 19, 21, 41)
        break
      case M_BURP:
        arm(p, 6, 21, 2, 31, false)
        arm(p, 26, 21, 30, 31, false)
        leg(p, 12, 11, 41)
        leg(p, 19, 21, 41)
        break
      default: {
        const a = f === M_WALK0
        arm(p, 7, 21, a ? 3 : 4, 31, false)
        arm(p, 25, 21, a ? 28 : 29, 31, false)
        leg(p, 12, a ? 10 : 11, a ? 41 : 39)
        leg(p, 19, a ? 21 : 22, a ? 39 : 41)
      }
    }
    frames.push(sprite(p, MOX + 16, MOY + 41))
  }
  return frames
}

function ensureMonster(art: SkiArt, owner: SkierSet): Sprite[] {
  const head = cabaldHead(art)
  if (!monster || monsterOwner !== owner || monsterHead !== head) {
    monster = buildMonster(head, owner)
    monsterOwner = owner
    monsterHead = head
  }
  return monster
}

// ---------------------------------------------------------------------------------------------------------------
// Per-game presentation state (no allocation per frame)

let tracked: SkiState | null = null
let crashMax = 0
let lastCrash = 0
/** "There is no Cabald. I love you." appears at most twice per session. */
let houseLines = 0
const MAX_MONSTERS = 4
const seen = new Uint8Array(MAX_MONSTERS)
const sayArrival = new Uint8Array(MAX_MONSTERS)
const arrivalAt = new Float64Array(MAX_MONSTERS)
const ARRIVAL_SECONDS = 1.5

function syncSession(state: SkiState): void {
  if (state !== tracked) {
    tracked = state
    crashMax = 0
    lastCrash = 0
    seen.fill(0)
    sayArrival.fill(0)
  }
  if (state.crash > lastCrash + 1e-9) crashMax = state.crash
  lastCrash = state.crash
}

const vis: WorldObject[] = []
const actorY = new Float64Array(MAX_MONSTERS + 1)
const actorId = new Int8Array(MAX_MONSTERS + 1)

function sortVisible(n: number): void {
  for (let i = 1; i < n; i++) {
    const o = vis[i]
    let j = i - 1
    while (j >= 0 && vis[j].y > o.y) {
      vis[j + 1] = vis[j]
      j--
    }
    vis[j + 1] = o
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Drawing

function draw(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number): void {
  ctx.drawImage(s.c, x - s.ax, y - s.ay)
}

const TRACK_LIFE = 6

function drawTracks(ctx: CanvasRenderingContext2D, state: SkiState, ox: number, oy: number, width: number, height: number, board: boolean): void {
  const tr = state.tracks
  const n = (tr.length / 3) | 0
  if (n < 2) return
  const start = (((state.trackIndex / 3) | 0) % n + n) % n
  const par = ox + oy
  let px = 0
  let py = 0
  let have = false
  ctx.fillStyle = VGA[SILVER]
  for (let k = 0; k < n; k++) {
    const b = ((start + k) % n) * 3
    const t = tr[b + 2]
    const age = state.time - t
    if (!(t >= 0) || !Number.isFinite(t) || age < 0 || age > TRACK_LIFE) {
      have = false
      continue
    }
    const x = Math.round(tr[b]) + ox
    const y = Math.round(tr[b + 1]) + oy
    if (have && Math.abs(x - px) <= 20 && Math.abs(y - py) <= 20) {
      const minX = Math.min(x, px)
      const minY = Math.min(y, py)
      if (minX < width + 4 && Math.max(x, px) > -4 && minY < height + 4 && Math.max(y, py) > -4) {
        const nb = age < 2 ? 0 : age < 4 ? 1 : 3
        if (board) trackLine(ctx, px, py, x, y, nb, par)
        else if (Math.abs(y - py) >= Math.abs(x - px)) {
          trackLine(ctx, px - 3, py, x - 3, y, nb, par)
          trackLine(ctx, px + 2, py, x + 2, y, nb, par)
        } else {
          trackLine(ctx, px, py, x, y, nb, par)
          trackLine(ctx, px, py + 2, x, y + 2, nb, par)
        }
      }
    }
    px = x
    py = y
    have = true
  }
}

function trackLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, mask: number, par: number): void {
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    if (((x0 + y0 - par) & mask) === 0) ctx.fillRect(x0, y0, 1, 1)
    if (x0 === x1 && y0 === y1) return
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x0 += sx
    }
    if (e2 <= dx) {
      err += dx
      y0 += sy
    }
  }
}

function objectSprite(st: Statics, o: WorldObject, anim: number): Sprite | null {
  const v = Math.abs(o.variant | 0)
  switch (o.kind) {
    case 'tree':
      return st.tree[v & 1]
    case 'big-tree':
      return st.bigTree
    case 'dead-tree':
      return st.deadTree
    case 'stump':
      return st.stump
    case 'mushroom':
      return st.mushroom
    case 'rock':
      return st.rock[v & 1]
    case 'mogul':
      return st.mogul[v % 3]
    case 'ramp':
      return st.ramp
    case 'rainbow':
      return st.rainbow
    case 'dog':
      return st.dog[(((anim * 5 + o.id * 0.37) | 0) & 1) * 2 + (o.side === -1 ? 1 : 0)]
    case 'yellow-snow':
      return st.yellow
    case 'hydrant':
      return st.hydrant
    case 'skier':
      return npcSkier(v)[o.side === -1 ? 0 : 1]
    case 'snowboarder': {
      const carve = ((anim * 1.5 + o.id * 0.29) | 0) & 1
      return degen(v)[o.side === -1 ? carve : 3 - carve]
    }
    case 'lift':
      return v === 0 ? st.tower : null
    case 'sign':
      return o.text ? signSprite(o.text) : null
    case 'banner':
      return bannerSprite(o)
    case 'gate':
      return st.gate[o.side === -1 ? 0 : 1]
  }
  return null
}

function skierHidden(state: SkiState): boolean {
  if (state.gameOver) return true
  for (let i = 0; i < state.monsters.length; i++) {
    const m = state.monsters[i]
    if (m.active && m.phase !== 'chase') return true
  }
  return false
}

function drawSkier(ctx: CanvasRenderingContext2D, st: Statics, set: SkierSet, state: SkiState, x: number, y: number, anim: number): void {
  if (state.crash > 0) {
    const progress = crashMax > 0 ? 1 - state.crash / crashMax : 1
    if (progress < 0.3) draw(ctx, set.flips[((anim * 14) | 0) & 3], x, y)
    else draw(ctx, set.sprawl, x, y)
    return
  }
  if (state.air > 0) {
    const total = state.airDuration > 0 ? state.airDuration : state.air
    const p = Math.min(1, Math.max(0, 1 - state.air / total))
    const peak = Math.min(30, 6 + total * 16)
    const lift = Math.round(4 * peak * p * (1 - p))
    draw(ctx, st.shadow, x, y)
    const q = Math.min(3, Math.max(0, Math.floor(state.trickProgress * 4))) & 3
    if (state.trick === 'spin') {
      const order = SPIN[q]
      draw(ctx, set.frames[order], x, y - lift)
    } else if (state.trick === 'front') draw(ctx, set.flips[q], x, y - lift)
    else if (state.trick === 'back') draw(ctx, set.flips[(4 - q) & 3], x, y - lift)
    else draw(ctx, set.frames[AIR], x, y - lift)
    return
  }
  draw(ctx, set.frames[state.direction] ?? set.frames[3], x, y)
}

const SPIN = [3, 6, BACK, 0]

function monsterFrame(m: Monster, anim: number): number {
  switch (m.phase) {
    case 'grab':
      return M_GRAB
    case 'chew':
      return ((anim * 6) | 0) & 1 ? M_CHEW1 : M_CHEW0
    case 'burp':
      return M_BURP
    case 'away':
      return ((anim * 5) | 0) & 1 ? M_WALK1 : M_WALK0
    default:
      return ((anim * 8) | 0) & 1 ? M_RUN1 : M_RUN0
  }
}

function drawBalloon(ctx: CanvasRenderingContext2D, text: string, tipX: number, tipY: number, width: number): void {
  const c = balloon(text)
  const bx = Math.max(2, Math.min(width - c.width - 2, tipX - 3))
  const by = Math.max(2, tipY - c.height + 1)
  ctx.drawImage(c, bx, by)
}

function drawStatus(ctx: CanvasRenderingContext2D, st: Statics, state: SkiState, width: number, scale = 1): void {
  if (scale > 1) {
    ctx.save()
    ctx.scale(1 / scale, 1 / scale)
    width *= scale
  }
  const bx = Math.max(0, width - ST_W - 2)
  const by = 2
  ctx.drawImage(st.status, bx, by)
  const img = atlas(BIG, K)
  const coursed = state.course !== 'free' && state.courseStarted
  const t = Math.max(0, coursed ? state.courseTime + state.penalties : state.time)
  const cs = Math.floor(t * 100)
  const row0 = by + 3
  const x0 = bx + ST_PAD
  digits(ctx, img, cs % 100, 2, x0 + 17 * 8, row0)
  digits(ctx, img, Math.floor(cs / 100) % 60, 2, x0 + 14 * 8, row0)
  digits(ctx, img, Math.floor(cs / 6000) % 60, 2, x0 + 11 * 8, row0)
  digits(ctx, img, Math.floor(cs / 360000), 1, x0 + 8 * 8, row0)
  digits(ctx, img, Math.max(0, Math.floor(state.distance)), 1, x0 + 12 * 8, row0 + ST_LINE)
  digits(ctx, img, Math.max(0, Math.round(state.speed)), 1, x0 + 12 * 8, row0 + ST_LINE * 2)
  const style = Math.round(state.style)
  const end = digits(ctx, img, Math.abs(style), 1, x0 + 12 * 8, row0 + ST_LINE * 3)
  if (style < 0) drawGlyph(ctx, BIG, img, 45, end - 8, row0 + ST_LINE * 3)
  if (scale > 1) ctx.restore()
}

/** Right-aligned unsigned integer ending before `right`; returns the left edge. */
function digits(ctx: CanvasRenderingContext2D, img: Canvas, value: number, min: number, right: number, y: number): number {
  let v = Math.floor(value)
  let x = right
  let n = 0
  do {
    x -= 8
    drawGlyph(ctx, BIG, img, 48 + (v % 10), x, y)
    v = Math.floor(v / 10)
    n++
  } while (v > 0 || n < min)
  return x
}

/**
 * Draw one frame of the slope at 1x logical pixels. The skier's ground point sits at (width/2, height/3); world
 * metres map to pixels one to one.
 */
export function renderSlope(ctx: CanvasRenderingContext2D, state: SkiState, width: number, height: number, art: SkiArt): void {
  const st = ensureStatic()
  syncSession(state)
  const me = ensurePlayer(art)
  const mon = ensureMonster(art, me)
  const anim = state.stepCount * FIXED_DT
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = VGA[WHITE]
  ctx.fillRect(0, 0, width, height)

  const ax = Math.floor(width / 2)
  const ay = Math.floor(height / 3)
  const ox = ax - Math.round(state.x)
  const oy = ay - Math.round(state.y)
  drawTracks(ctx, state, ox, oy, width, height, art.snowboard)

  // Visible ground objects, painter-sorted by ground y; chairs fly overhead and are drawn last.
  let n = 0
  const objects = state.objects
  for (let i = 0; i < objects.length; i++) {
    const o = objects[i]
    if (!o.active || (o.kind === 'lift' && o.variant !== 0)) continue
    const sx = Math.round(o.x) + ox
    const sy = Math.round(o.y) + oy
    const reach = o.kind === 'banner' ? Math.max(80, o.radius + 80) : 80
    if (sx < -reach || sx > width + reach || sy < -16 || sy > height + 80) continue
    if (n < vis.length) vis[n] = o
    else vis.push(o)
    n++
  }
  sortVisible(n)

  // Actors: the skier (id -1) and active monsters, merged into the painter order.
  const hidden = skierHidden(state)
  const airborne = state.air > 0 && state.crash <= 0
  let actors = 0
  if (!hidden && !airborne) {
    actorY[0] = state.y
    actorId[0] = -1
    actors = 1
  }
  const monsters = state.monsters
  for (let i = 0; i < monsters.length && i < MAX_MONSTERS; i++) {
    const m = monsters[i]
    if (!m.active) {
      seen[i] = 0
      continue
    }
    const sx = Math.round(m.x) + ox
    const sy = Math.round(m.y) + oy
    const onScreen = sx > -24 && sx < width + 24 && sy > -4 && sy < height + 46
    const frame = mon[monsterFrame(m, anim)]
    const fullyVisible = sx - frame.ax >= 0 && sx - frame.ax + frame.c.width <= width &&
      sy - frame.ay >= 0 && sy - frame.ay + frame.c.height <= height
    if (fullyVisible && !seen[i]) {
      seen[i] = 1
      sayArrival[i] = m.phase === 'chase' && houseLines < 2 ? 1 : 0
      if (sayArrival[i]) houseLines++
      arrivalAt[i] = anim
    }
    if (!onScreen) continue
    let j = actors
    while (j > 0 && actorY[j - 1] > m.y) {
      actorY[j] = actorY[j - 1]
      actorId[j] = actorId[j - 1]
      j--
    }
    actorY[j] = m.y
    actorId[j] = i
    actors++
  }

  let a = 0
  for (let i = 0; i < n; i++) {
    const o = vis[i]
    while (a < actors && actorY[a] <= o.y) drawActor(ctx, st, me, mon, state, actorId[a++], ox, oy, anim)
    const s = objectSprite(st, o, anim)
    if (s) draw(ctx, s, Math.round(o.x) + ox, Math.round(o.y) + oy)
  }
  while (a < actors) drawActor(ctx, st, me, mon, state, actorId[a++], ox, oy, anim)
  if (!hidden && airborne) drawSkier(ctx, st, me, state, ax, ay, anim)

  // Chairlift chairs pass overhead.
  let chairSet: Sprite[] | null = null
  for (let i = 0; i < objects.length; i++) {
    const o = objects[i]
    if (!o.active || o.kind !== 'lift' || o.variant === 0) continue
    const sx = Math.round(o.x) + ox
    const sy = Math.round(o.y) + oy
    if (sx < -20 || sx > width + 20 || sy < -4 || sy > height + 30) continue
    if (!chairSet) chairSet = ensureChairs(me)
    draw(ctx, chairSet[Math.abs((o.id | 0) + o.variant) & 3], sx, sy)
  }

  // Balloons above the monster's bald head.
  for (let i = 0; i < monsters.length && i < MAX_MONSTERS; i++) {
    const m = monsters[i]
    if (!m.active) continue
    const sx = Math.round(m.x) + ox
    const sy = Math.round(m.y) + oy
    if (m.phase === 'burp') drawBalloon(ctx, STRINGS.monster.burp, sx + 4, sy - 44, width)
    else if (m.phase === 'chase' && sayArrival[i] && anim - arrivalAt[i] < ARRIVAL_SECONDS) drawBalloon(ctx, STRINGS.monster.arrival, sx + 4, sy - 44, width)
  }

  drawStatus(ctx, st, state, width, art.displayScale ?? 1)
}

function drawActor(ctx: CanvasRenderingContext2D, st: Statics, me: SkierSet, mon: Sprite[], state: SkiState, id: number, ox: number, oy: number, anim: number): void {
  if (id < 0) {
    drawSkier(ctx, st, me, state, Math.round(state.x) + ox, Math.round(state.y) + oy, anim)
    return
  }
  const m = state.monsters[id]
  draw(ctx, mon[monsterFrame(m, anim)], Math.round(m.x) + ox, Math.round(m.y) + oy)
}

/** Drop every cached sprite, head and glyph atlas (the window closed). */
export function disposeSprites(): void {
  S = null
  signCache.clear()
  bannerCache.clear()
  balloonCache.clear()
  realHeads.clear()
  cabaldHeads.clear()
  npcSkiers.clear()
  degens.clear()
  SMALL.atlas.clear()
  BIG.atlas.clear()
  headSrc = null
  scratch = null
  mixes.clear()
  player = null
  playerHeads = null
  playerBuiltJacket = -1
  playerBuiltBoard = false
  fallbackCache.clear()
  playerShirt = ''
  playerJacket = RED
  chairs = null
  chairOwner = null
  monster = null
  monsterOwner = null
  monsterHead = null
  tracked = null
  vis.length = 0
}
