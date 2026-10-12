/** Win9x 3D bevel helpers for canvas-drawn game chrome. The matching DOM classes live in `visual.css`. */
import './visual.css'

/** The four Windows 9x system colors used by classic game panels. */
export const WIN9X = { face: '#c0c0c0', light: '#ffffff', shadow: '#808080', dark: '#000000' } as const

/** Options for {@link drawBevel}. */
export interface BevelOptions {
  /** Sunken (shadow top-left, light bottom-right) instead of raised. Default `false`. */
  inset?: boolean
  /** Edge thickness in pixels, default 1. Matches `.w9x-raised`/`.w9x-sunken` (1) and `-2` classes (2). */
  width?: number
  /** First fill the whole rectangle with {@link WIN9X}`.face`. Default `false`. */
  face?: boolean
  /** Diagonal pixel joins at corners (WinMine), rather than square overlapping edge strips. Default `false`. */
  miter?: boolean
}

/**
 * Draws a Win9x bevel inside the rectangle `x, y, w, h` (edges are drawn inside the rectangle, nothing outside it).
 * Raised: light on the top/left edges, shadow on the bottom/right. Inset reverses them. By default the shadow edge
 * wins square corner overlaps like `visual.css`; `miter` draws stepped diagonal corner joins. Use integer coordinates.
 * @param ctx 2D context; `fillStyle` is restored afterwards.
 * @param x left edge.
 * @param y top edge.
 * @param w width including the bevel.
 * @param h height including the bevel.
 * @param opts see {@link BevelOptions}.
 */
export function drawBevel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, opts: BevelOptions = {}): void {
  const t = Math.max(1, Math.min(opts.width ?? 1, Math.floor(w / 2), Math.floor(h / 2)))
  const tl = opts.inset ? WIN9X.shadow : WIN9X.light
  const br = opts.inset ? WIN9X.light : WIN9X.shadow
  const saved = ctx.fillStyle
  if (opts.face) {
    ctx.fillStyle = WIN9X.face
    ctx.fillRect(x, y, w, h)
  }
  if (opts.miter) {
    for (let i = 0; i < t; i++) {
      ctx.fillStyle = tl
      ctx.fillRect(x + i, y + i, w - 2 * i - 1, 1)
      ctx.fillRect(x + i, y + i, 1, h - 2 * i - 1)
      ctx.fillStyle = br
      ctx.fillRect(x + i, y + h - i - 1, w - 2 * i, 1)
      ctx.fillRect(x + w - i - 1, y + i, 1, h - 2 * i)
    }
  } else {
    ctx.fillStyle = tl
    ctx.fillRect(x, y, w, t)
    ctx.fillRect(x, y, t, h)
    ctx.fillStyle = br
    ctx.fillRect(x, y + h - t, w, t)
    ctx.fillRect(x + w - t, y, t, h)
  }
  ctx.fillStyle = saved
}
