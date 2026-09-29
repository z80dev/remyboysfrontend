/** Screen sizing: a low-res logical canvas upscaled by the largest integer factor that fits, pixel-perfect. */

export const MIN_W = 240
export const MIN_H = 168

export const view = {
  W: MIN_W,
  H: MIN_H,
  /** Device pixels per logical pixel. */
  scale: 1,
  lo: document.createElement('canvas'),
  ctx: null as unknown as CanvasRenderingContext2D,
  screen: null as unknown as HTMLCanvasElement,
  sctx: null as unknown as CanvasRenderingContext2D,
  screenEl: null as unknown as HTMLElement,
  slot: null as unknown as HTMLElement,
  listeners: [] as (() => void)[],
}

export function initView(screenEl: HTMLElement, canvas: HTMLCanvasElement, slot: HTMLElement) {
  view.screenEl = screenEl
  view.screen = canvas
  view.slot = slot
  view.ctx = view.lo.getContext('2d') as CanvasRenderingContext2D
  view.sctx = canvas.getContext('2d') as CanvasRenderingContext2D
  const ro = new ResizeObserver(() => layout())
  ro.observe(slot)
  window.addEventListener('orientationchange', () => setTimeout(layout, 200))
  layout()
}

export function layout() {
  const dpr = window.devicePixelRatio || 1
  const cs = getComputedStyle(view.slot)
  const cw = view.slot.clientWidth - Number.parseFloat(cs.paddingLeft) - Number.parseFloat(cs.paddingRight)
  const ch = view.slot.clientHeight - Number.parseFloat(cs.paddingTop) - Number.parseFloat(cs.paddingBottom)
  if (!cw || !ch) return
  const dw = Math.floor(cw * dpr)
  const dh = Math.floor(ch * dpr)
  const s = Math.max(1, Math.floor(Math.min(dw / MIN_W, dh / MIN_H)))
  // Ultra-wide windows would show more world than the maps have; cap and letterbox instead.
  const W = Math.min(400, Math.floor(dw / s))
  // Tall portrait screens show more map, but keep the view from becoming a thin tower.
  const H = Math.min(Math.floor(dh / s), Math.floor(W * 1.1))
  if (W === view.W && H === view.H && s === view.scale && view.screen.width === W * s) return
  view.W = W
  view.H = H
  view.scale = s
  view.lo.width = W
  view.lo.height = H
  view.screen.width = W * s
  view.screen.height = H * s
  view.ctx.imageSmoothingEnabled = false
  view.sctx.imageSmoothingEnabled = false
  const u = s / dpr
  document.documentElement.style.fontSize = `${u}px`
  view.screenEl.style.width = `${(W * s) / dpr}px`
  view.screenEl.style.height = `${(H * s) / dpr}px`
  view.screenEl.classList.toggle('tall', H > W * 0.8)
  for (const l of view.listeners) l()
}

/** Blit the logical canvas to the screen. */
export function present() {
  view.sctx.drawImage(view.lo, 0, 0, view.W * view.scale, view.H * view.scale)
}
