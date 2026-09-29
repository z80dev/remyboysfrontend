/**
 * Full-view atmosphere: tints, cloud shadows, pollen/butterflies, golden-hour / dusk grading, vignette and additive
 * light glows. All cheap: a handful of cached sprites + a few dozen 1px rects per frame.
 */
import type { Theme } from '../types'
import { type Light, glowSprite } from './objects'
import { Px, canvas, ctx2d, hash, hex, withAlpha } from './px'

let cloudImg: HTMLCanvasElement | undefined
function cloud(): HTMLCanvasElement {
  if (!cloudImg) {
    const p = new Px(136, 64)
    const lobes = [
      [44, 34, 30, 16],
      [74, 28, 30, 18],
      [100, 36, 26, 14],
      [62, 42, 34, 12],
      [26, 40, 16, 9],
    ]
    // soft fringe first (half strength), then the core over it
    const fringe = withAlpha(hex('#1a2440'), 110)
    const core = withAlpha(hex('#1a2440'), 255)
    for (const [cx, cy, rx, ry] of lobes) p.ellipse(cx, cy, rx + 3, ry + 3, (x, y) => (p.get(x, y) ? 0 : fringe))
    for (const [cx, cy, rx, ry] of lobes) p.ellipse(cx, cy, rx, ry, core)
    cloudImg = p.toCanvas()
  }
  return cloudImg
}

const gradCache = new Map<string, HTMLCanvasElement>()
/** Vertical grade (stops = [offset, css color]) + optional vignette, cached per view size. */
function grade(key: string, w: number, h: number, stops: [number, string][], vignette: number): HTMLCanvasElement {
  const k = `${key}|${w}|${h}`
  let c = gradCache.get(k)
  if (!c) {
    c = canvas(w, h)
    const x = ctx2d(c)
    const g = x.createLinearGradient(0, 0, 0, h)
    for (const [o, col] of stops) g.addColorStop(o, col)
    x.fillStyle = g
    x.fillRect(0, 0, w, h)
    if (vignette > 0) {
      const r = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.58)
      r.addColorStop(0, 'rgba(20,8,36,0)')
      r.addColorStop(1, `rgba(20,8,36,${vignette})`)
      x.fillStyle = r
      x.fillRect(0, 0, w, h)
    }
    gradCache.set(k, c)
  }
  return c
}

function drawClouds(ctx: CanvasRenderingContext2D, viewW: number, viewH: number, camX: number, camY: number, t: number, alpha: number): void {
  const img = cloud()
  const PX = 520
  const PY = 400
  ctx.globalAlpha = alpha
  for (let i = 0; i < 3; i++) {
    const bx = hash(i, 1, 77) * PX + t * 6
    const by = hash(i, 2, 77) * PY + t * 2
    const sx = ((((bx - camX) % PX) + PX) % PX) - 136
    const sy = ((((by - camY) % PY) + PY) % PY) - 64
    // the wrap period exceeds any phone view + cloud size, so one copy per cloud suffices
    if (sx < viewW && sy < viewH) ctx.drawImage(img, Math.round(sx), Math.round(sy))
  }
  ctx.globalAlpha = 1
}

/** World-anchored motes: one per `cell` px square, drifting and twinkling. */
function drawMotes(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camX: number,
  camY: number,
  t: number,
  cell: number,
  colors: string[],
  drift: number,
  rise: number,
): void {
  const cx0 = Math.floor(camX / cell) - 1
  const cy0 = Math.floor(camY / cell) - 1
  const cx1 = Math.floor((camX + viewW) / cell) + 1
  const cy1 = Math.floor((camY + viewH) / cell) + 1
  for (let cy = cy0; cy <= cy1; cy++)
    for (let cx = cx0; cx <= cx1; cx++) {
      const h = hash(cx, cy, 313)
      const wx = cx * cell + h * cell + Math.sin(t * 0.9 + h * 20) * 6 + ((t * drift) % cell)
      const wy = cy * cell + hash(cx, cy, 314) * cell + Math.cos(t * 0.7 + h * 11) * 4 - ((t * rise + h * cell) % cell)
      const x = Math.round(wx - camX)
      const y = Math.round(wy - camY)
      if (x < 0 || y < 0 || x >= viewW || y >= viewH) continue
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + h * 40)
      ctx.globalAlpha = 0.35 + tw * 0.6
      ctx.fillStyle = colors[Math.floor(h * colors.length)]
      ctx.fillRect(x, y, 1, 1)
      if (tw > 0.93) {
        ctx.globalAlpha = 0.5
        ctx.fillRect(x - 1, y, 3, 1)
        ctx.fillRect(x, y - 1, 1, 3)
      }
    }
  ctx.globalAlpha = 1
}

function drawButterflies(ctx: CanvasRenderingContext2D, viewW: number, viewH: number, camX: number, camY: number, t: number): void {
  const cell = 128
  const cols = ['#ffffff', '#ffe066', '#ff9ad2', '#8cb4ff']
  for (let cy = Math.floor(camY / cell) - 1; cy <= Math.floor((camY + viewH) / cell) + 1; cy++)
    for (let cx = Math.floor(camX / cell) - 1; cx <= Math.floor((camX + viewW) / cell) + 1; cx++) {
      const h = hash(cx, cy, 515)
      if (h > 0.75) continue
      const ph = h * 50
      const wx = cx * cell + cell * 0.5 + Math.cos(t * 0.55 + ph) * 34 + Math.sin(t * 1.3 + ph) * 8
      const wy = cy * cell + cell * 0.5 + Math.sin(t * 0.8 + ph) * 20 + Math.sin(t * 2.6 + ph) * 3
      const x = Math.round(wx - camX)
      const y = Math.round(wy - camY)
      if (x < -3 || y < -3 || x > viewW + 3 || y > viewH + 3) continue
      const open = Math.floor(t * 9 + ph) % 2 === 0
      ctx.fillStyle = 'rgba(26,16,48,0.25)'
      ctx.fillRect(x - 1, y + 6, 3, 1)
      ctx.fillStyle = cols[Math.floor(h * 10) % cols.length]
      if (open) {
        ctx.fillRect(x - 3, y - 2, 3, 2)
        ctx.fillRect(x + 1, y - 2, 3, 2)
        ctx.fillRect(x - 2, y, 2, 1)
        ctx.fillRect(x + 1, y, 2, 1)
      } else {
        ctx.fillRect(x - 1, y - 3, 1, 3)
        ctx.fillRect(x + 1, y - 3, 1, 3)
      }
      ctx.fillStyle = '#3a2a3a'
      ctx.fillRect(x, y - 1, 1, 2)
    }
}

function drawLights(ctx: CanvasRenderingContext2D, lights: Light[], viewW: number, viewH: number, boost: number): void {
  ctx.globalCompositeOperation = 'lighter'
  for (const l of lights) {
    if (l.a <= 0.01 || l.x + l.r < 0 || l.y + l.r < 0 || l.x - l.r > viewW || l.y - l.r > viewH) continue
    ctx.globalAlpha = Math.min(1, l.a * boost)
    ctx.drawImage(glowSprite(l.r, l.rgb, 4), Math.round(l.x - l.r), Math.round(l.y - l.r))
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

export function ambient(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  viewW: number,
  viewH: number,
  camX: number,
  camY: number,
  t: number,
  lights: Light[],
): void {
  const w = Math.ceil(viewW)
  const h = Math.ceil(viewH)
  const cx = Math.floor(camX)
  const cy = Math.floor(camY)
  switch (theme) {
    case 'gallery':
      ctx.drawImage(
        grade('gallery', w, h, [[0, 'rgba(255,220,155,0.06)'], [1, 'rgba(32,23,46,0.12)']], 0.2),
        0, 0,
      )
      drawLights(ctx, lights, w, h, 0.55)
      drawMotes(ctx, w, h, cx, cy, t, 46, ['#fff1c0', '#e7d5a9', '#ffffff'], 0.5, 1)
      break
    case 'town':
      drawClouds(ctx, w, h, cx, cy, t, 0.09)
      ctx.drawImage(grade('town', w, h, [[0, 'rgba(255,238,190,0.10)'], [1, 'rgba(255,228,170,0.03)']], 0.12), 0, 0)
      drawLights(ctx, lights, w, h, 0.6)
      break
    case 'meadow':
      drawClouds(ctx, w, h, cx, cy, t, 0.07)
      ctx.drawImage(grade('meadow', w, h, [[0, 'rgba(255,250,200,0.12)'], [1, 'rgba(210,255,190,0.03)']], 0.1), 0, 0)
      drawMotes(ctx, w, h, cx, cy, t, 36, ['#fff6b0', '#ffffff', '#fff0a0'], 3, 5)
      drawButterflies(ctx, w, h, cx, cy, t)
      drawLights(ctx, lights, w, h, 0.6)
      break
    case 'city':
      ctx.drawImage(
        grade(
          'city',
          w,
          h,
          [
            [0, 'rgba(255,150,70,0.22)'],
            [0.55, 'rgba(255,170,100,0.12)'],
            [1, 'rgba(160,80,140,0.14)'],
          ],
          0.3,
        ),
        0,
        0,
      )
      drawLights(ctx, lights, w, h, 1)
      drawMotes(ctx, w, h, cx, cy, t, 64, ['#ffe0a0', '#ffd080'], 2, 2)
      break
    case 'canyon': {
      ctx.drawImage(
        grade(
          'canyon',
          w,
          h,
          [
            [0, 'rgba(96,34,130,0.30)'],
            [0.45, 'rgba(255,110,70,0.14)'],
            [1, 'rgba(255,150,60,0.12)'],
          ],
          0.34,
        ),
        0,
        0,
      )
      // heat shimmer: faint bright bands wandering down the view
      for (let i = 0; i < 3; i++) {
        const y = Math.floor(((t * 6 + i * 70 - cy * 0.3) % (h + 40)) + h + 40) % (h + 40) - 20
        ctx.globalAlpha = 0.05
        ctx.fillStyle = '#ffe0b0'
        for (let x = 0; x < w; x += 8) ctx.fillRect(x, y + Math.round(Math.sin(x * 0.08 + t * 3 + i) * 2), 8, 2)
      }
      ctx.globalAlpha = 1
      drawLights(ctx, lights, w, h, 1)
      drawMotes(ctx, w, h, cx, cy, t, 30, ['#ffd0a0', '#f0b080', '#ffe8c8'], 14, -2)
      break
    }
  }
}
