/**
 * Pixel surface for the procedural base skin: a plain RGBA buffer with a few drawing primitives.
 * Colours are packed 0xRRGGBB numbers; `TRANSPARENT` leaves a pixel untouched/clear.
 */
export type Rgb = number

export const TRANSPARENT = -1

export const rgb = (r: number, g: number, b: number): Rgb => (clamp(r) << 16) | (clamp(g) << 8) | clamp(b)

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v))

export const red = (c: Rgb) => (c >> 16) & 255
export const green = (c: Rgb) => (c >> 8) & 255
export const blue = (c: Rgb) => c & 255

/** Linear blend from `a` (t=0) to `b` (t=1). */
export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return rgb(red(a) + (red(b) - red(a)) * t, green(a) + (green(b) - green(a)) * t, blue(a) + (blue(b) - blue(a)) * t)
}

/** Multiplies every channel by `k` and adds `add`. */
export function scale(c: Rgb, k: number, add = 0): Rgb {
  return rgb(red(c) * k + add, green(c) * k + add, blue(c) * k + add)
}

/** Piecewise-linear colour ramp through `stops` ([position 0..1, colour]). */
export function ramp(stops: readonly (readonly [number, Rgb])[], t: number): Rgb {
  if (t <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    const [p, c] = stops[i]
    if (t <= p) {
      const [p0, c0] = stops[i - 1]
      return mix(c0, c, (t - p0) / (p - p0))
    }
  }
  return stops[stops.length - 1][1]
}

export type Shader = (x: number, y: number) => Rgb

export class Surface {
  readonly data: Uint8ClampedArray<ArrayBuffer>

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8ClampedArray(width * height * 4)
  }

  set(x: number, y: number, c: Rgb) {
    if (c < 0 || x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const i = (y * this.width + x) * 4
    this.data[i] = (c >> 16) & 255
    this.data[i + 1] = (c >> 8) & 255
    this.data[i + 2] = c & 255
    this.data[i + 3] = 255
  }

  get(x: number, y: number): Rgb {
    const i = (y * this.width + x) * 4
    return (this.data[i] << 16) | (this.data[i + 1] << 8) | this.data[i + 2]
  }

  /** Fills a rect with a colour or a shader (shader coordinates are sheet-absolute). */
  fill(x: number, y: number, w: number, h: number, c: Rgb | Shader) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, typeof c === 'number' ? c : c(i, j))
  }

  /** Rewrites every pixel of a rect through `fn(current colour, x, y)`. */
  map(x: number, y: number, w: number, h: number, fn: (c: Rgb, x: number, y: number) => Rgb) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, fn(this.get(i, j), i, j))
  }

  hline(x: number, y: number, w: number, c: Rgb | Shader) {
    this.fill(x, y, w, 1, c)
  }

  vline(x: number, y: number, h: number, c: Rgb | Shader) {
    this.fill(x, y, 1, h, c)
  }

  /** 1px rectangle outline. */
  frame(x: number, y: number, w: number, h: number, c: Rgb | Shader) {
    this.hline(x, y, w, c)
    this.hline(x, y + h - 1, w, c)
    this.vline(x, y, h, c)
    this.vline(x + w - 1, y, h, c)
  }

  /** Bevel: `tl` on the top and left edge, `br` on the bottom and right edge (br wins the two shared corners). */
  bevel(x: number, y: number, w: number, h: number, tl: Rgb | Shader, br: Rgb | Shader) {
    this.hline(x, y, w, tl)
    this.vline(x, y, h, tl)
    this.hline(x, y + h - 1, w, br)
    this.vline(x + w - 1, y, h, br)
  }

  /** Paints a pattern: rows of characters, each looked up in `palette` (missing keys are skipped). */
  pattern(x: number, y: number, rows: readonly string[], palette: Record<string, Rgb>) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = palette[row[i]]
        if (c !== undefined) this.set(x + i, y + j, c)
      }
    })
  }

  /** Copies a rect from another surface (or itself; source is read before writing). */
  copy(src: Surface, sx: number, sy: number, w: number, h: number, dx: number, dy: number) {
    const tmp: number[] = []
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) tmp.push(src.alpha(sx + i, sy + j) ? src.get(sx + i, sy + j) : -1)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(dx + i, dy + j, tmp[j * w + i])
  }

  alpha(x: number, y: number): boolean {
    return this.data[(y * this.width + x) * 4 + 3] !== 0
  }

  toCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas unavailable')
    ctx.putImageData(new ImageData(this.data, this.width, this.height), 0, 0)
    return canvas
  }
}
