/**
 * Full-view atmosphere and lighting. Daytime: cloud shadows, pollen, butterflies, per-theme grades. The lighting pass
 * multiplies the scene by a low-res light map: a time-of-day tint (golden hour, dawn haze, moonlit night) into which
 * every `Light` adds a coloured, ordered-dithered pool, so lamps and lit windows carve crisp stepped pools out of the
 * dark. Emitters then get a small additive glow and night brings fireflies. All cheap: one view-sized canvas, a few
 * cached sprites and a few dozen rects per frame.
 */
import type { Theme } from '../types'
import { sky } from './daylight'
import { type Light, glowSprite } from './objects'
import { Px, canvas, ctx2d, hash, hex, pack, withAlpha } from './px'

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
  if (alpha <= 0.005) return
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
  alpha = 1,
): void {
  if (alpha <= 0.02) return
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
      ctx.globalAlpha = (0.35 + tw * 0.6) * alpha
      ctx.fillStyle = colors[Math.floor(h * colors.length)]
      ctx.fillRect(x, y, 1, 1)
      if (tw > 0.93) {
        ctx.globalAlpha = 0.5 * alpha
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

/** Fireflies: slow looping drift, a lit 1px body that pulses with a tiny cross flare at its peak. */
function drawFireflies(ctx: CanvasRenderingContext2D, viewW: number, viewH: number, camX: number, camY: number, t: number, alpha: number): void {
  if (alpha <= 0.05) return
  const cell = 44
  ctx.globalCompositeOperation = 'lighter'
  for (let cy = Math.floor(camY / cell) - 1; cy <= Math.floor((camY + viewH) / cell) + 1; cy++)
    for (let cx = Math.floor(camX / cell) - 1; cx <= Math.floor((camX + viewW) / cell) + 1; cx++) {
      const h = hash(cx, cy, 919)
      if (h > 0.38) continue
      const ph = h * 80
      const wx = cx * cell + hash(cx, cy, 920) * cell + Math.sin(t * 0.37 + ph) * 14 + Math.sin(t * 1.1 + ph * 2) * 3
      const wy = cy * cell + hash(cx, cy, 921) * cell + Math.cos(t * 0.29 + ph) * 10 + Math.sin(t * 1.7 + ph) * 2
      const x = Math.round(wx - camX)
      const y = Math.round(wy - camY)
      if (x < -4 || y < -4 || x > viewW + 4 || y > viewH + 4) continue
      const pulse = Math.max(0, Math.sin(t * 1.6 + ph * 3))
      if (pulse < 0.08) continue
      ctx.globalAlpha = alpha * pulse
      ctx.drawImage(glowSprite(4, '150,255,90', 2), x - 4, y - 4)
      ctx.fillStyle = '#eaff9c'
      ctx.fillRect(x, y, 1, 1)
      if (pulse > 0.85) {
        ctx.globalAlpha = alpha * 0.6
        ctx.fillRect(x - 1, y, 3, 1)
        ctx.fillRect(x, y - 1, 1, 3)
      }
    }
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

// ---------------------------------------------------------------------------------------------------------------
// Lighting

/** 4×4 ordered-dither thresholds: stepped light rings blend with a crisp pixel pattern instead of a smooth blur. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const LEVELS = 5

const cookieCache = new Map<string, HTMLCanvasElement>()
/** Opaque light pool (black = no light) for additive drawing into the light map. */
function cookie(r: number, rgb: string): HTMLCanvasElement {
  const key = `${r}|${rgb}`
  let c = cookieCache.get(key)
  if (!c) {
    const [cr, cg, cb] = rgb.split(',').map(Number)
    const p = new Px(r * 2, r * 2)
    for (let y = 0; y < r * 2; y++)
      for (let x = 0; x < r * 2; x++) {
        const d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r
        if (d >= 1) continue
        const v = (1 - d) ** 1.35 * LEVELS
        let lvl = Math.floor(v)
        if ((v - lvl) * 16 > BAYER[(y & 3) * 4 + (x & 3)]) lvl++
        const k = Math.min(LEVELS, lvl) / LEVELS
        if (k > 0) p.put(x, y, pack(Math.round(cr * k), Math.round(cg * k), Math.round(cb * k)))
      }
    c = p.toCanvas()
    cookieCache.set(key, c)
  }
  return c
}

type RGB = readonly [number, number, number]
/** Multiply tint at full night, per theme: moonlit blue outdoors, violet neon dusk in the city, dusky canyon. */
const NIGHT: Record<Theme, RGB> = {
  town: [60, 76, 132],
  meadow: [56, 78, 128],
  city: [82, 66, 150],
  canyon: [112, 76, 148],
  gallery: [150, 132, 160],
}
const GOLDEN: RGB = [255, 190, 136]
const DAWN: RGB = [236, 204, 232]

let lightMap: HTMLCanvasElement | undefined
let lightCtx: CanvasRenderingContext2D | undefined

function lerp3(a: RGB, b: RGB, t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/** Night strength for this theme: interiors keep their lamps on and only dim to an after-hours hush. */
function darkness(theme: Theme): number {
  return theme === 'gallery' ? sky.night * 0.8 : sky.night
}

function lightPass(ctx: CanvasRenderingContext2D, theme: Theme, lights: Light[], w: number, h: number): void {
  const dark = darkness(theme)
  const outdoor = theme !== 'gallery'
  const warm = outdoor ? sky.warm * (1 - dark) : 0
  const dawn = outdoor ? sky.dawn * (1 - dark) : 0
  if (dark < 0.01 && warm < 0.01 && dawn < 0.01) return
  if (!lightMap || lightMap.width !== w || lightMap.height !== h) {
    lightMap = canvas(w, h)
    lightCtx = ctx2d(lightMap)
  }
  const lc = lightCtx as CanvasRenderingContext2D
  let base = lerp3([255, 255, 255], GOLDEN, warm)
  base = lerp3(base, DAWN, dawn)
  base = lerp3(base, NIGHT[theme], dark)
  lc.globalCompositeOperation = 'source-over'
  lc.globalAlpha = 1
  lc.fillStyle = `rgb(${Math.round(base[0])},${Math.round(base[1])},${Math.round(base[2])})`
  lc.fillRect(0, 0, w, h)
  if (dark > 0.05) {
    lc.globalCompositeOperation = 'lighter'
    for (const l of lights) {
      const a = l.a * dark
      if (a <= 0.02) continue
      // pools reach further than the emitter's own glow; radius quantized so the cookie cache stays small
      const r = Math.min(72, Math.max(6, Math.round((l.r * 1.7) / 2) * 2))
      if (l.x + r < 0 || l.y + r < 0 || l.x - r > w || l.y - r > h) continue
      lc.globalAlpha = Math.min(1, a * 1.25)
      lc.drawImage(cookie(r, l.rgb), Math.round(l.x - r), Math.round(l.y - r))
    }
  }
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(lightMap, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/** Additive emitter glows on top of the graded scene; faint by day, full at night. */
function drawGlows(ctx: CanvasRenderingContext2D, lights: Light[], w: number, h: number, dark: number): void {
  const k = 0.3 + 0.7 * dark
  ctx.globalCompositeOperation = 'lighter'
  for (const l of lights) {
    const a = l.a * k * 0.55
    if (a <= 0.01 || l.x + l.r < 0 || l.y + l.r < 0 || l.x - l.r > w || l.y - l.r > h) continue
    ctx.globalAlpha = Math.min(1, a)
    const r = Math.max(4, Math.round(l.r * 0.7))
    ctx.drawImage(glowSprite(r, l.rgb, 4), Math.round(l.x - r), Math.round(l.y - r))
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/** Low golden sun: warm wash from the top-left plus a few broad, slow, stepped light shafts. */
function drawSunShafts(ctx: CanvasRenderingContext2D, w: number, h: number, camX: number, t: number, warm: number): void {
  if (warm < 0.05) return
  ctx.globalCompositeOperation = 'lighter'
  ctx.drawImage(grade('sunwash', w, h, [[0, 'rgba(255,150,60,0.16)'], [0.6, 'rgba(255,120,40,0.04)'], [1, 'rgba(0,0,0,0)']], 0), 0, 0)
  ctx.fillStyle = '#ffc47a'
  for (let i = 0; i < 4; i++) {
    const period = 180
    const x0 = ((((i * 97 - camX * 0.35 + t * 2) % period) + period) % period) - 40 + i * 70
    ctx.globalAlpha = warm * (0.04 + 0.02 * Math.sin(t * 0.5 + i))
    // 45° shafts stepped in 4px rows keep the edge on the pixel grid
    for (let y = 0; y < h; y += 4) ctx.fillRect(Math.round(x0 - y * 0.6), y, 10 + (i % 2) * 6, 4)
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
  const dark = darkness(theme)
  const day = 1 - dark
  const warm = sky.warm * day
  // daytime atmosphere sits under the lighting pass so night grades it along with the world
  switch (theme) {
    case 'town':
      drawClouds(ctx, w, h, cx, cy, t, 0.09 * day)
      break
    case 'meadow':
      drawClouds(ctx, w, h, cx, cy, t, 0.07 * day)
      break
    default:
      break
  }
  lightPass(ctx, theme, lights, w, h)
  ctx.globalAlpha = day
  switch (theme) {
    case 'gallery':
      ctx.globalAlpha = 1
      ctx.drawImage(grade('gallery', w, h, [[0, 'rgba(255,220,155,0.06)'], [1, 'rgba(32,23,46,0.12)']], 0.2 + dark * 0.2), 0, 0)
      break
    case 'town':
      ctx.drawImage(grade('town', w, h, [[0, 'rgba(255,238,190,0.10)'], [1, 'rgba(255,228,170,0.03)']], 0.12), 0, 0)
      break
    case 'meadow':
      ctx.drawImage(grade('meadow', w, h, [[0, 'rgba(255,250,200,0.12)'], [1, 'rgba(210,255,190,0.03)']], 0.1), 0, 0)
      break
    case 'city':
      ctx.drawImage(
        grade('city', w, h, [[0, 'rgba(255,170,90,0.12)'], [0.55, 'rgba(255,190,120,0.05)'], [1, 'rgba(160,80,140,0.08)']], 0.24),
        0,
        0,
      )
      break
    case 'canyon':
      ctx.drawImage(
        grade('canyon', w, h, [[0, 'rgba(96,34,130,0.26)'], [0.45, 'rgba(255,110,70,0.12)'], [1, 'rgba(255,150,60,0.12)']], 0.3),
        0,
        0,
      )
      // heat haze: rising bands where scanlines refract a pixel sideways (the canvas redraws its own rows)
      if (day > 0.4)
        for (let i = 0; i < 3; i++) {
          const yc = h + 20 - ((((t * 9 + i * 83 + cy * 0.5) % (h + 40)) + h + 40) % (h + 40))
          for (let y = Math.max(0, yc - 7); y < Math.min(h, yc + 8); y++) {
            const off = Math.round(Math.sin(y * 0.9 + t * 7 + i) * (1.3 - Math.abs(y - yc) / 7))
            if (off) ctx.drawImage(ctx.canvas, 0, y, w, 1, off, y, w, 1)
          }
        }
      break
  }
  ctx.globalAlpha = 1
  if (dark > 0.05 && theme !== 'gallery')
    ctx.drawImage(grade(`night-${theme}`, w, h, [[0, 'rgba(10,14,40,0.18)'], [1, 'rgba(10,8,30,0)']], 0.55), 0, 0)
  if (theme !== 'gallery') drawSunShafts(ctx, w, h, cx, t, warm)
  drawGlows(ctx, lights, w, h, dark)
  switch (theme) {
    case 'gallery':
      drawMotes(ctx, w, h, cx, cy, t, 46, ['#fff1c0', '#e7d5a9', '#ffffff'], 0.5, 1)
      break
    case 'town':
      drawFireflies(ctx, w, h, cx, cy, t, dark)
      break
    case 'meadow':
      drawMotes(ctx, w, h, cx, cy, t, 36, ['#fff6b0', '#ffffff', '#fff0a0'], 3, 5, day)
      if (dark < 0.5) drawButterflies(ctx, w, h, cx, cy, t)
      drawFireflies(ctx, w, h, cx, cy, t, dark)
      break
    case 'city':
      drawMotes(ctx, w, h, cx, cy, t, 64, dark > 0.5 ? ['#ff7ad9', '#7ae8ff'] : ['#ffe0a0', '#ffd080'], 2, 2)
      break
    case 'canyon':
      drawMotes(ctx, w, h, cx, cy, t, 30, dark > 0.5 ? ['#ff9a5a', '#ffcc70', '#ff6a3a'] : ['#ffd0a0', '#f0b080', '#ffe8c8'], 14, dark > 0.5 ? 6 : -2)
      break
  }
}
