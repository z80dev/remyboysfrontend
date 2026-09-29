/**
 * Tiny pixel-art toolkit: packed-color math with hue-shifted ramps, a CPU pixel buffer (`Px`) with crisp shape
 * primitives + auto-outline, deterministic hashing, and a 3×5 bitmap font. Everything renders to canvases once and
 * is then blitted with `drawImage`, so per-frame work stays tiny.
 */

/** Packed little-endian ABGR (what `Uint32Array` over ImageData expects). 0 = transparent. */
export type Col = number

export function hex(h: string, a = 255): Col {
  let s = h.charAt(0) === '#' ? h.slice(1) : h
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]
  const n = Number.parseInt(s.slice(0, 6), 16) || 0
  return pack((n >> 16) & 255, (n >> 8) & 255, n & 255, a)
}

export function pack(r: number, g: number, b: number, a = 255): Col {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
}
export const R = (c: Col) => c & 255
export const G = (c: Col) => (c >>> 8) & 255
export const B = (c: Col) => (c >>> 16) & 255
export const A = (c: Col) => c >>> 24

export function withAlpha(c: Col, a: number): Col {
  return pack(R(c), G(c), B(c), Math.max(0, Math.min(255, Math.round(a))))
}

export function mix(a: Col, b: Col, t: number): Col {
  const u = 1 - t
  return pack(
    Math.round(R(a) * u + R(b) * t),
    Math.round(G(a) * u + G(b) * t),
    Math.round(B(a) * u + B(b) * t),
    Math.round(A(a) * u + A(b) * t),
  )
}

const SHADOW = hex('#1c1238')
const LIGHT = hex('#fff6d0')
/** Hue-shifted shading: k<0 darkens toward cool purple, k>0 lightens toward warm cream (classic GBA ramps). */
export function shade(c: Col, k: number): Col {
  return k < 0 ? mix(c, SHADOW, -k) : mix(c, LIGHT, k)
}

/** CSS color string for fillStyle. */
export function css(c: Col): string {
  const a = A(c)
  return a === 255 ? `rgb(${R(c)},${G(c)},${B(c)})` : `rgba(${R(c)},${G(c)},${B(c)},${(a / 255).toFixed(3)})`
}

/** 4-step ramp from a single base color: [outline-ish dark, shadow, base, light, highlight]. */
export function ramp(base: Col): [Col, Col, Col, Col, Col] {
  return [shade(base, -0.62), shade(base, -0.28), base, shade(base, 0.28), shade(base, 0.55)]
}

// ---------------------------------------------------------------------------------------------------------------
// Deterministic hashing

export function hash(x: number, y: number, s = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Canvas helpers

export function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, w)
  c.height = Math.max(1, h)
  return c
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const x = c.getContext('2d') as CanvasRenderingContext2D
  x.imageSmoothingEnabled = false
  return x
}

// ---------------------------------------------------------------------------------------------------------------
// Pixel buffer

export class Px {
  readonly d: Uint32Array
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.d = new Uint32Array(w * h)
  }

  get(x: number, y: number): Col {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0
    return this.d[y * this.w + x]
  }

  /** Writes a pixel; semi-transparent colors blend over what is there. */
  set(px: number, py: number, c: Col): void {
    const x = px | 0
    const y = py | 0
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || c === 0) return
    const i = y * this.w + x
    const a = c >>> 24
    if (a === 255) {
      this.d[i] = c
      return
    }
    const dst = this.d[i]
    const da = dst >>> 24
    if (da === 0) {
      this.d[i] = c
      return
    }
    const t = a / 255
    const oa = Math.min(255, Math.round(a + da * (1 - t)))
    this.d[i] = withAlpha(mix(dst, withAlpha(c, 255), t), oa)
  }

  /** Overwrite (no blending, can write transparent). */
  put(x: number, y: number, c: Col): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.d[(y | 0) * this.w + (x | 0)] = c
  }

  rect(x: number, y: number, w: number, h: number, c: Col): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c)
  }

  hl(x: number, y: number, len: number, c: Col): void {
    for (let i = 0; i < len; i++) this.set(x + i, y, c)
  }

  vl(x: number, y: number, len: number, c: Col): void {
    for (let j = 0; j < len; j++) this.set(x, y + j, c)
  }

  /** Filled ellipse by pixel-center test. cx/cy may be fractional (use .5 offsets for even sizes). */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Col | ((x: number, y: number, nx: number, ny: number) => Col)): void {
    const x0 = Math.floor(cx - rx - 1)
    const x1 = Math.ceil(cx + rx + 1)
    const y0 = Math.floor(cy - ry - 1)
    const y1 = Math.ceil(cy + ry + 1)
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const nx = (x + 0.5 - cx) / rx
        const ny = (y + 0.5 - cy) / ry
        if (nx * nx + ny * ny <= 1.0001) this.set(x, y, typeof c === 'number' ? c : c(x, y, nx, ny))
      }
  }

  /** Fills every pixel for which `f` returns a color. */
  each(f: (x: number, y: number, cur: Col) => Col | undefined | 0): void {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = f(x, y, this.d[y * this.w + x])
        if (c) this.set(x, y, c)
      }
  }

  /** Adds a 1px outline of `c` around all fully-opaque pixels (onto transparent/translucent neighbours). */
  outline(c: Col, diagonal = false): void {
    const { w, h, d } = this
    const solid = new Uint8Array(w * h)
    for (let i = 0; i < d.length; i++) solid[i] = d[i] >>> 24 === 255 ? 1 : 0
    const out: number[] = []
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (solid[y * w + x]) continue
        const s = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < w && yy < h && solid[yy * w + xx] === 1
        if (
          s(x - 1, y) ||
          s(x + 1, y) ||
          s(x, y - 1) ||
          s(x, y + 1) ||
          (diagonal && (s(x - 1, y - 1) || s(x + 1, y - 1) || s(x - 1, y + 1) || s(x + 1, y + 1)))
        )
          out.push(y * w + x)
      }
    for (const i of out) d[i] = c
  }

  /** Blits another buffer (with alpha blending). */
  blit(src: Px, dx: number, dy: number, flipX = false): void {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.d[y * src.w + (flipX ? src.w - 1 - x : x)]
        if (c) this.set(dx + x, dy + y, c)
      }
  }

  toCanvas(): HTMLCanvasElement {
    const c = canvas(this.w, this.h)
    const x = ctx2d(c)
    const img = x.createImageData(this.w, this.h)
    new Uint32Array(img.data.buffer).set(this.d)
    x.putImageData(img, 0, 0)
    return c
  }
}

// ---------------------------------------------------------------------------------------------------------------
// 3×5 pixel font (uppercase, digits, a few symbols). Each glyph = 5 rows of 3 bits.

const GLYPHS: Record<string, string> = {
  A: '010101111101101',
  B: '110101110101110',
  C: '011100100100011',
  D: '110101101101110',
  E: '111100110100111',
  F: '111100110100100',
  G: '011100101101011',
  H: '101101111101101',
  I: '111010010010111',
  J: '001001001101010',
  K: '101101110101101',
  L: '100100100100111',
  M: '101111111101101',
  N: '110101101101101',
  O: '010101101101010',
  P: '110101110100100',
  Q: '010101101110011',
  R: '110101110101101',
  S: '011100010001110',
  T: '111010010010010',
  U: '101101101101111',
  V: '101101101101010',
  W: '101101111111101',
  X: '101101010101101',
  Y: '101101010010010',
  Z: '111001010100111',
  '0': '111101101101111',
  '1': '010110010010111',
  '2': '110001010100111',
  '3': '110001010001110',
  '4': '101101111001001',
  '5': '111100110001110',
  '6': '011100111101111',
  '7': '111001010010010',
  '8': '111101111101111',
  '9': '111101111001110',
  $: '011110010011110',
  '!': '010010010000010',
  '?': '110001010000010',
  '.': '000000000000010',
  '-': '000000111000000',
  '+': '000010111010000',
  ' ': '000000000000000',
  '/': '001001010100100',
}

/** Width in px of `text` at `scale` (3px glyphs + 1px spacing). */
export function textWidth(text: string, scale = 1): number {
  return Math.max(0, text.length * 4 - 1) * scale
}

export function text(p: Px, s: string, x: number, y: number, c: Col, scale = 1, shadow?: Col): void {
  let cx = x
  for (const ch of s.toUpperCase()) {
    const g = GLYPHS[ch] ?? GLYPHS[' ']
    for (let r = 0; r < 5; r++)
      for (let k = 0; k < 3; k++)
        if (g[r * 3 + k] === '1') {
          if (shadow) p.rect(cx + k * scale, y + r * scale + scale, scale, scale, shadow)
          p.rect(cx + k * scale, y + r * scale, scale, scale, c)
        }
    cx += 4 * scale
  }
}

/** Parse a string-art template: each char maps to a color via `pal` ('.' / ' ' = skip). */
export function stamp(p: Px, rows: readonly string[], x: number, y: number, pal: Record<string, Col>, flipX = false): void {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j]
    for (let i = 0; i < row.length; i++) {
      const ch = row[flipX ? row.length - 1 - i : i]
      if (ch === '.' || ch === ' ') continue
      const c = pal[ch]
      if (c !== undefined) p.set(x + i, y + j, c)
    }
  }
}
