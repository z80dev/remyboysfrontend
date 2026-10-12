/** Minesweeper-style red seven-segment LED digits: a canvas renderer and a React counter. */
import { useCallback, useEffect, useRef } from 'react'
import { useCrispCanvas } from './canvas'
import { drawBevel } from './bevel'
import './visual.css'

/** Width of one LED digit in logical pixels. */
export const LED_W = 13
/** Height of one LED digit in logical pixels. */
export const LED_H = 23

/** Options for {@link drawLed}. */
export interface LedOptions {
  /** Number of digit cells, default 3 (Minesweeper). */
  digits?: number
  /** Integer pixel multiplier, default 1. */
  scale?: number
  /** Lit segment color, default `#ff0000`. */
  on?: string
  /** Unlit segment color, default dim dark red `#380000`. Pass the `bg` color (or `'transparent'`) to hide unlit segments. */
  off?: string
  /** Background behind the digits, default `#000000`. */
  bg?: string
}

type Rect = readonly [x: number, y: number, w: number, h: number]

// Segments A..G of the 13×23 hexagonal glyph (1px margin each side, tapered ends). Rects are [x, y, w, h].
const SEGMENTS: readonly (readonly Rect[])[] = [
  [
    [2, 0, 9, 1],
    [3, 1, 7, 1],
  ], // A top
  [[10, 2, 2, 8]], // B upper right
  [[10, 13, 2, 8]], // C lower right
  [
    [3, 21, 7, 1],
    [2, 22, 9, 1],
  ], // D bottom
  [[1, 13, 2, 8]], // E lower left
  [[1, 2, 2, 8]], // F upper left
  [
    [3, 10, 7, 1],
    [2, 11, 9, 1],
    [3, 12, 7, 1],
  ], // G middle
]

// Lit-segment bit masks (bit 0 = A … bit 6 = G).
const MASKS: Readonly<Record<string, number>> = {
  '0': 0b0111111,
  '1': 0b0000110,
  '2': 0b1011011,
  '3': 0b1001111,
  '4': 0b1100110,
  '5': 0b1101101,
  '6': 0b1111101,
  '7': 0b0000111,
  '8': 0b1111111,
  '9': 0b1101111,
  '-': 0b1000000,
}

/** Formats a value into exactly `digits` cells: numbers are rounded, clamped, zero-padded; `-` takes the first cell. */
function format(value: number | string, digits: number): string {
  if (typeof value === 'string') return value.length >= digits ? value.slice(value.length - digits) : value.padStart(digits, ' ')
  const n = Number.isFinite(value) ? Math.round(value) : 0
  if (n < 0) {
    if (digits < 2) return '-'
    const mag = Math.min(-n, 10 ** (digits - 1) - 1)
    return `-${String(mag).padStart(digits - 1, '0')}`
  }
  return String(Math.min(n, 10 ** digits - 1)).padStart(digits, '0')
}

/**
 * Draws a Minesweeper seven-segment LED readout (13×23 px per digit, no gap, 1px margin built into each glyph) with
 * its top-left corner at `x, y`. Numbers are rounded, zero-padded and clamped like WinMine (`-` takes the first digit,
 * so 3 digits span −99…999). Strings may contain `0-9`, `-` and spaces (blank cell); they are right-aligned and the
 * last `digits` characters win. Unknown characters render as blank cells.
 * @param ctx 2D context; `fillStyle` is restored afterwards.
 * @param value number or string to show.
 * @param x left edge in context units.
 * @param y top edge in context units.
 * @param opts see {@link LedOptions}.
 */
export function drawLed(ctx: CanvasRenderingContext2D, value: number | string, x: number, y: number, opts: LedOptions = {}): void {
  const digits = Math.max(1, Math.floor(opts.digits ?? 3))
  const s = Math.max(1, Math.floor(opts.scale ?? 1))
  const on = opts.on ?? '#ff0000'
  const off = opts.off ?? '#380000'
  const text = format(value, digits)
  const saved = ctx.fillStyle
  ctx.fillStyle = opts.bg ?? '#000000'
  ctx.fillRect(x, y, digits * LED_W * s, LED_H * s)
  for (let i = 0; i < digits; i++) {
    const mask = MASKS[text[i]] ?? 0
    const ox = x + i * LED_W * s
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass === 0 ? off : on
      for (let seg = 0; seg < 7; seg++) {
        if ((((mask >> seg) & 1) === 1) !== (pass === 1)) continue
        for (const [rx, ry, rw, rh] of SEGMENTS[seg]) ctx.fillRect(ox + rx * s, y + ry * s, rw * s, rh * s)
      }
    }
  }
  ctx.fillStyle = saved
}

/**
 * Minesweeper-style LED counter: black readout inside a 1px sunken Win9x frame. Renders a pixel-crisp canvas whose CSS size
 * is `(digits × 13 + 2) × 25` logical pixels times `scale`.
 * @param value number (rounded/clamped, see {@link drawLed}) or string to show.
 * @param digits number of digit cells, default 3.
 * @param scale integer CSS pixels per logical pixel, default 1.
 */
export function LedCounter({ value, digits = 3, scale = 1 }: { value: number | string; digits?: number; scale?: number }) {
  const cells = Math.max(1, Math.floor(digits))
  const k = Math.max(1, Math.floor(scale))
  const w = cells * LED_W + 2
  const h = LED_H + 2
  const draw = useRef<() => void>(() => {})
  const { ref, ctx } = useCrispCanvas(w, h, { onResize: () => draw.current() })
  const drawReadout = useCallback(() => {
    const c = ctx.current
    if (!c) return
    drawLed(c, value, 1, 1, { digits: cells })
    drawBevel(c, 0, 0, cells * LED_W + 2, LED_H + 2, { inset: true })
  }, [ctx, value, cells])
  draw.current = drawReadout
  useEffect(() => drawReadout(), [drawReadout])
  return <canvas ref={ref} className="gk-led" style={{ width: w * k, height: h * k }} role="img" aria-label={String(value)} />
}
