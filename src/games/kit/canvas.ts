/**
 * Canvas hooks for classic games: a pixel-crisp canvas that tracks its displayed device-pixel size,
 * and a requestAnimationFrame loop that pauses while the game's window is inactive or minimized.
 */
import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react'
import { useWindowState } from './window'

/** Options for {@link useCrispCanvas}. */
export interface CrispCanvasOptions {
  /** Smooth scaling (photos, vector-ish art). Default `false`: nearest-neighbour pixels. */
  smoothing?: boolean
  /** Lower bound for full-size integer backing, default 1; an explicit value also bounds shrunk backing. */
  minScale?: number
  /** Upper bound for backing pixels per logical pixel, default 8, raised to minScale if necessary. */
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
  /** Horizontal backing pixels per logical pixel; fractional on CSS-shrunk boards. The context handles Y independently. */
  scale: { readonly current: number }
}

/**
 * Pixel-crisp canvas. Full-size boards use `ceil(cssWidth × devicePixelRatio / width)` integer backing.
 * CSS-shrunk boards use their actual rounded device-pixel dimensions instead, avoiding a second nearest-neighbour
 * resampling pass. An explicit `minScale` still permits oversampling; `maxScale` limits both modes.
 * Draw in logical coordinates; the context handles each axis's rounded backing ratio. Resizing clears the canvas,
 * so redraw in `onResize`. The canvas MUST get its on-screen size from CSS.
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
  const minScale = Math.max(1, Math.ceil(opts.minScale ?? 1))
  const maxScale = Math.max(minScale, Math.floor(opts.maxScale ?? 8))
  const shrinkMinScale = opts.minScale === undefined ? 0 : minScale

  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    canvas.style.aspectRatio = `${width} / ${height}`
    canvas.style.imageRendering = smoothing ? 'auto' : 'pixelated'
    const context = canvas.getContext('2d')
    ctx.current = context
    let ready = false
    const fit = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const dpr = window.devicePixelRatio || 1
      const shrunk = rect.width < width
      const raw = (rect.width * dpr) / width
      const s = shrunk ? Math.min(maxScale, Math.max(shrinkMinScale, raw)) : Math.min(maxScale, Math.max(minScale, Math.ceil(raw)))
      const pixelW = Math.max(1, Math.round(width * s))
      const pixelH = Math.max(1, Math.round(shrunk ? height * Math.min(maxScale, Math.max(shrinkMinScale, (rect.height * dpr) / height)) : height * s))
      // Assigning width/height clears the canvas and resets context state even when unchanged: only touch on change.
      if (ready && canvas.width === pixelW && canvas.height === pixelH) return
      ready = true
      canvas.width = pixelW
      canvas.height = pixelH
      scale.current = pixelW / width
      if (!context) return
      context.setTransform(pixelW / width, 0, 0, pixelH / height, 0, 0)
      context.imageSmoothingEnabled = smoothing
      if (smoothing) context.imageSmoothingQuality = 'high'
      onResize.current?.(scale.current)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)
    window.addEventListener('resize', fit) // devicePixelRatio changes (zoom, monitor move) do not resize the element
    let resolution: MediaQueryList
    const watchResolution = () => {
      resolution?.removeEventListener('change', watchResolution)
      resolution = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
      resolution.addEventListener('change', watchResolution)
      fit()
    }
    watchResolution()
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
      resolution.removeEventListener('change', watchResolution)
      ctx.current = null
    }
  }, [width, height, smoothing, minScale, maxScale, shrinkMinScale])

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
