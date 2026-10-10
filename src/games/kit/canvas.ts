/**
 * Canvas hooks for classic games: a pixel-crisp canvas that tracks its CSS size at an integer device-pixel scale,
 * and a requestAnimationFrame loop that pauses while the game's window is inactive or minimized.
 */
import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react'
import { useWindowState } from './window'

/** Options for {@link useCrispCanvas}. */
export interface CrispCanvasOptions {
  /** Smooth scaling (photos, vector-ish art). Default `false`: nearest-neighbour pixels. */
  smoothing?: boolean
  /** Upper bound for the integer backing-store scale, default 8. */
  maxScale?: number
  /** Called after every backing-store resize (which clears the canvas): redraw here. */
  onResize?: (scale: number) => void
}

/** What {@link useCrispCanvas} returns. */
export interface CrispCanvas {
  /** Attach to the `<canvas>`. Size it with CSS (e.g. `width: 100%`); it gets `aspect-ratio` automatically. */
  ref: RefObject<HTMLCanvasElement>
  /** 2D context, pre-scaled so you draw in logical `width × height` units. `null` until mounted. */
  ctx: { readonly current: CanvasRenderingContext2D | null }
  /** Current integer backing-store pixels per logical pixel (≥ 1). */
  scale: { readonly current: number }
}

/**
 * Pixel-crisp canvas. The logical size is `width × height`; the backing store is that times an integer `scale` =
 * `floor(cssWidth × devicePixelRatio / width)` (clamped to `1 … maxScale`), so every logical pixel covers a whole
 * number of device pixels. The context transform is set to `scale`, so draw in logical coordinates. Resizing the
 * element re-runs this (a resize clears the canvas, see `onResize`). The canvas MUST get its on-screen size from CSS.
 * @param width logical width in game pixels.
 * @param height logical height in game pixels.
 */
export function useCrispCanvas(width: number, height: number, opts: CrispCanvasOptions = {}): CrispCanvas {
  const ref = useRef<HTMLCanvasElement>(null)
  const ctx = useRef<CanvasRenderingContext2D | null>(null)
  const scale = useRef(1)
  const onResize = useRef(opts.onResize)
  onResize.current = opts.onResize
  const smoothing = opts.smoothing ?? false
  const maxScale = opts.maxScale ?? 8

  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    canvas.style.aspectRatio = `${width} / ${height}`
    canvas.style.imageRendering = smoothing ? 'auto' : 'pixelated'
    const context = canvas.getContext('2d')
    ctx.current = context
    let ready = false
    const fit = () => {
      const css = canvas.getBoundingClientRect().width
      const s = Math.min(maxScale, Math.max(1, Math.floor((css * (window.devicePixelRatio || 1)) / width)))
      // Assigning width/height clears the canvas and resets context state even when unchanged: only touch on change.
      if (ready && canvas.width === width * s && canvas.height === height * s) return
      ready = true
      canvas.width = width * s
      canvas.height = height * s
      scale.current = s
      if (!context) return
      context.setTransform(s, 0, 0, s, 0, 0)
      context.imageSmoothingEnabled = smoothing
      if (smoothing) context.imageSmoothingQuality = 'high'
      onResize.current?.(s)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)
    window.addEventListener('resize', fit) // devicePixelRatio changes (zoom, monitor move) do not resize the element
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
      ctx.current = null
    }
  }, [width, height, smoothing, maxScale])

  return { ref, ctx, scale }
}

/** Options for {@link useAnimationFrame}. */
export interface AnimationFrameOptions {
  /** Extra pause switch (menus, game over). Default `false`. */
  paused?: boolean
  /** Longest `dt` handed to the callback in seconds, default 0.1, so a slow frame never tunnels through the world. */
  maxDt?: number
  /** Pause on deactivation too (default true); turn-based animations may set false to freeze only while hidden. */
  activeOnly?: boolean
}

/**
 * requestAnimationFrame loop that runs only while the game window is active (focused) and visible (not minimized)
 * and `paused` is false, per {@link useWindowState}. Resuming does not produce a big `dt`: the clock restarts.
 * The callback may change every render without restarting the loop.
 * @param callback receives `dt` (seconds since the previous frame, clamped to `maxDt`; 0 on the first frame after
 * a start/resume) and `now` (the rAF timestamp in ms).
 */
export function useAnimationFrame(callback: (dt: number, now: number) => void, opts: AnimationFrameOptions = {}): void {
  const { active, hidden } = useWindowState()
  const run = (opts.activeOnly === false || active) && !hidden && !opts.paused
  const cb = useRef(callback)
  cb.current = callback
  const maxDt = useRef(opts.maxDt ?? 0.1)
  maxDt.current = opts.maxDt ?? 0.1

  useEffect(() => {
    if (!run) return
    let last: number | undefined
    let id = requestAnimationFrame(function frame(now) {
      const dt = last === undefined ? 0 : Math.min(maxDt.current, (now - last) / 1000)
      last = now
      id = requestAnimationFrame(frame)
      cb.current(dt, now)
    })
    return () => cancelAnimationFrame(id)
  }, [run])
}
