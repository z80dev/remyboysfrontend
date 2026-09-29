import { BASE, PALS } from '../../gfx/palette'
import { type Col, Px, css, hash, hex, mix, rng, shade, text, textWidth } from '../../gfx/px'
/** Built-up battle backdrops: Liquidity City at dusk and the crypto exchange trading floor. */
import type { BackdropGeo } from '../backdrops'
import {
  type PadStyle,
  type Scene,
  WPx,
  band,
  bayer,
  bond,
  buildPad,
  dither,
  drawGround,
  layerW,
  padCache,
  sky,
  surface,
  tile,
  wave,
} from './kit'

const H = (...s: string[]) => s.map((c) => hex(c))

/** Draws a `w`-wide window of a horizontally wrapping strip, starting at strip x `sx`, to (dx, dy). */
function strip(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  sx: number,
  w: number,
  dx: number,
  dy: number,
): void {
  const W = img.width
  const s = ((Math.round(sx) % W) + W) % W
  const a = Math.min(w, W - s)
  ctx.drawImage(img, s, 0, a, img.height, dx, dy, a, img.height)
  if (a < w) ctx.drawImage(img, 0, 0, w - a, img.height, dx + a, dy, w - a, img.height)
}

/** Candle chart strip that wraps seamlessly (levels come from periodic sines). `bias` < 0 trends up. */
function chartStrip(w: number, h: number, seed: number, bias: number, bg: Col, grid: Col): HTMLCanvasElement {
  const p = new Px(w, h)
  p.rect(0, 0, w, h, bg)
  for (let y = 3; y < h; y += 5) for (let x = (y >> 1) % 4; x < w; x += 4) p.set(x, y, grid)
  const up = hex('#3ef08a')
  const upD = hex('#1a9a52')
  const dn = hex('#ff4a5a')
  const dnD = hex('#a01e36')
  const cw = 4
  const n = Math.floor(w / cw)
  const lvl = (i: number) => {
    const k = ((i % n) + n) % n
    const a = (k / n) * Math.PI * 2
    return (
      h * 0.5 + Math.sin(a * 2 + seed) * h * 0.22 + Math.sin(a * 5 + seed * 3) * h * 0.1 + bias * Math.sin(a) * h * 0.1
    )
  }
  for (let i = 0; i < n; i++) {
    const o = lvl(i - 1) + (hash(i, 0, seed) - 0.5) * h * 0.14
    const c = lvl(i) + (hash(i + 1, 0, seed) - 0.5) * h * 0.14
    const top = Math.round(Math.max(1, Math.min(o, c)))
    const bot = Math.round(Math.min(h - 2, Math.max(o, c)))
    const x = i * cw
    const isUp = c < o
    p.vl(
      x + 1,
      top - 1 - Math.round(hash(i, 2, seed) * 2),
      bot - top + 3 + Math.round(hash(i, 3, seed) * 2),
      isUp ? upD : dnD,
    )
    p.rect(x, top, 3, Math.max(1, bot - top), isUp ? up : dn)
  }
  // Moving-average line in gold, drawn over the candles like a real terminal.
  const ma = hex('#ffd24a')
  for (let x = 0; x < w; x++) {
    let s = 0
    for (let k = -3; k <= 3; k++) s += lvl(Math.floor((x + k * cw) / cw))
    p.set(x, Math.round(s / 7), ma)
  }
  return p.toCanvas()
}

// ---------------------------------------------------------------------------------------------------------------
// Liquidity City: dusk skyline in parallax layers, blinking windows, a live candle billboard, street-light glow.

export function city(g: BackdropGeo): Scene {
  const { W } = g
  const hz = Math.round(g.horizon)
  const LW = layerW(W)
  const skyP = sky(
    W,
    hz,
    H('#161640', '#1f1d52', '#2c2464', '#402a74', '#5a3280', '#7c3c86', '#a44a82', '#cc5e78', '#e87e70'),
    0.9,
  )
  {
    const r = rng(101)
    for (let i = 0; i < W / 5; i++) {
      const x = Math.floor(r() * W)
      const y = Math.floor(r() * hz * 0.55)
      skyP.set(x, y, r() < 0.2 ? hex('#fff6d8') : hex('#9c92d8'))
    }
    // Crescent moon, top-left, away from the foe.
    const mx = Math.round(W * 0.1)
    const my = Math.round(Math.max(8, hz * 0.18))
    const mr = Math.max(4, Math.round(hz * 0.08))
    skyP.ellipse(mx + 0.5, my + 0.5, mr + 2.5, mr + 2.5, (x, y) => (bayer(x, y) < 0.3 ? hex('#6a5aa8') : 0))
    skyP.ellipse(mx + 0.5, my + 0.5, mr, mr, (x, y) => {
      const d = Math.hypot(x + 0.5 - mx - mr * 0.55, y + 0.5 - my + mr * 0.25)
      return d < mr * 0.9 ? 0 : hex('#fff2c4')
    })
  }
  const skyC = skyP.toCanvas()

  // Far skyline: hazy violet, sparse dim windows, antennas with red beacons.
  const fh = Math.max(16, Math.round(hz * 0.78))
  const far = new WPx(LW, fh)
  const beacons: [number, number][] = []
  {
    const r = rng(102)
    const body = H('#3a2c6a', '#44347a', '#503e88')
    for (let x = 0; x < LW; ) {
      const w = 8 + Math.floor(r() * 16)
      const top = Math.round(fh * (0.25 + r() * 0.55))
      const c = body[Math.floor(r() * body.length)]
      far.rect(x, top, w, fh - top, c)
      far.vl(x, top, fh - top, shade(c, 0.12))
      for (let y = top + 3; y < fh - 2; y += 4)
        for (let wx = x + 2; wx < x + w - 1; wx += 3) if (hash(wx, y, 102) < 0.18) far.set(wx, y, hex('#8a78c8'))
      if (r() < 0.3) {
        far.vl(x + (w >> 1), top - 5, 5, c)
        beacons.push([x + (w >> 1), top - 6])
      }
      x += w + (r() < 0.3 ? 2 : 0)
    }
    // City glow hugging the base of the skyline.
    for (let y = fh - 8; y < fh; y++)
      for (let x = 0; x < LW; x++) if (far.get(x, y) && (y - (fh - 8)) / 8 > bayer(x, y)) far.set(x, y, hex('#7a4a8e'))
  }

  // Mid skyline: darker, crisp outlines, warm/cyan windows, one rooftop billboard.
  const mh = Math.max(14, Math.round(hz * 0.62))
  const mid = new WPx(LW, mh)
  const blink: [number, number, Col][] = []
  const bbH = Math.max(12, Math.min(24, Math.round(hz * 0.3)))
  const bbW = Math.max(40, Math.round(bbH * 1.9))
  let bbX = 0
  let bbY = 0
  {
    const r = rng(103)
    const lit = H('#ffd46a', '#ffe9a8', '#7ae0ff')
    let placed = false
    for (let x = 0; x < LW; ) {
      const w = 12 + Math.floor(r() * 20)
      const top = Math.round(mh * (0.15 + r() * 0.55))
      const c = hex(r() < 0.5 ? '#231b46' : '#1c1a3c')
      mid.rect(x, top, w, mh - top, c)
      mid.vl(x, top, mh - top, shade(c, 0.18))
      mid.hl(x, top, w, shade(c, 0.28))
      if (r() < 0.35) {
        mid.rect(x + 2, top - 3, w - 4, 3, c)
        mid.hl(x + 2, top - 3, w - 4, shade(c, 0.28))
      }
      for (let y = top + 3; y < mh - 1; y += 4)
        for (let wx = x + 2; wx < x + w - 2; wx += 4) {
          const h = hash(wx, y, 103)
          if (h < 0.34) mid.rect(wx, y, 2, 2, lit[Math.floor(h * 9) % 3])
          else mid.rect(wx, y, 2, 2, shade(c, -0.25))
          if (h > 0.9 && blink.length < 40) blink.push([wx, y, lit[blink.length % 3]])
        }
      if (!placed && x > LW * 0.3 && w >= 16) {
        placed = true
        bbX = x + Math.round(w / 2 - bbW / 2)
        bbY = Math.max(top - bbH - 13, 3 - (hz - mh + 1))
        // Billboard legs down to the roof.
        mid.vl(bbX + 4, bbY + bbH + 9, top - bbY - bbH - 9, hex('#0e0c20'))
        mid.vl(bbX + bbW - 5, bbY + bbH + 9, top - bbY - bbH - 9, hex('#0e0c20'))
      }
      x += w
    }
    mid.outline(hex('#0e0c20'))
  }
  // Frame with a title bar; the live chart scrolls in the window below the label.
  const bbFrame = new Px(bbW + 4, bbH + 11)
  bbFrame.rect(0, 0, bbFrame.w, bbFrame.h, hex('#2a2440'))
  bbFrame.hl(0, 0, bbFrame.w, hex('#5a5080'))
  for (let x = 1; x < bbFrame.w; x += 3) bbFrame.set(x, 0, hex('#fff0a0'))
  text(bbFrame, '$REMY', 2, 2, hex('#ffffff'))
  text(bbFrame, '+420', bbFrame.w - textWidth('+420') - 2, 2, hex('#3ef08a'))
  bbFrame.outline(hex('#0e0c20'))
  const bbFrameC = bbFrame.toCanvas()
  const bbChart = chartStrip(bbW * 3, bbH, 7, -1, hex('#08161a'), hex('#123038'))

  // Victorian street lamps and dark planters along the far edge of the plaza.
  const lh = Math.max(14, Math.round(hz * 0.5))
  const lamps = new WPx(LW, lh + 12)
  const lampXs: number[] = []
  {
    const post = hex('#16122a')
    const postL = hex('#4a3e70')
    const base = lh + 11
    const hedge = H('#12262a', '#1e3a3a', '#2e5448', '#46705a')
    for (let x = 0; x < LW; x++) {
      const hh = 4 + Math.round(wave(x, LW, 30, 113, 2) * 1.5)
      for (let y = base - hh; y <= base; y++) lamps.set(x, y, dither(hedge, 2.4 - (y - base + hh) * 0.5, x, y))
    }
    const step = LW / Math.round(LW / 90)
    for (let x = 30; x < LW; x += step) {
      const lx = Math.round(x)
      lampXs.push(lx)
      const head = 9
      lamps.ellipse(lx + 1.5, head + 1, 10, 8, (xx, yy, nx, ny) => {
        const d = Math.sqrt(nx * nx + ny * ny)
        return d < 0.5
          ? bayer(xx, yy) < 0.5
            ? hex('#ffe29a', 170)
            : 0
          : bayer(xx, yy) < 0.25
            ? hex('#ffb070', 130)
            : 0
      })
      lamps.rect(lx - 1, head - 3, 5, 1, post)
      lamps.rect(lx, head - 4, 3, 1, post)
      lamps.rect(lx - 1, head - 2, 5, 4, hex('#fff0b0'))
      lamps.vl(lx - 1, head - 2, 4, post)
      lamps.vl(lx + 3, head - 2, 4, post)
      lamps.hl(lx - 1, head + 2, 5, post)
      lamps.vl(lx, head + 3, base - head - 3, postL)
      lamps.vl(lx + 1, head + 3, base - head - 3, post)
      lamps.rect(lx - 1, base - 2, 4, 3, post)
      lamps.hl(lx - 1, base - 2, 2, postL)
    }
  }

  // Plaza pavers: warm stone under violet dusk light, accent courses, lamp-light pools and wet-sheen streaks.
  const pv = PALS.city.paved.map((c) => mix(c, hex('#34265e'), 0.38))
  const hazeC = hex('#8a4e86')
  const gh = g.H - hz
  const warm = hex('#ffd890')
  const ground = bond(g, LW, 0.3, 2.4, (x, y, c) => {
    let col: Col
    const accent = c.ri % 6 === 0 ? -0.9 : 0
    if (c.seam) col = pv[0]
    else if (c.k < 1 / c.rowH + 0.01 && c.rowH > 3) col = pv[3]
    else col = dither(pv, 2.2 + accent + (hash(c.cell, c.ri, 104) - 0.5) * 1.1 - c.k * 0.6 - (y / gh) * 0.5, x, y)
    for (const lx of lampXs) {
      const dx = (x - lx - 1) / (8 + y * 0.9)
      const dy = (y - 1) / (4 + y * 0.35)
      const l = 1 - dx * dx - dy * dy
      if (l > 0) col = dither([col, mix(col, hex('#ffc98a'), 0.35), mix(col, hex('#ffe6b0'), 0.6)], l * 2.6, x, y)
      const streak = (1 - y / (gh * 0.6)) * 0.85
      // Broken into ripples every other row pair, like light smeared on wet stone.
      const ripple = ((y >> 1) & 1) === 0 || streak > 0.6
      if (streak > 0 && ripple && Math.abs(x - lx - 1) <= 1 + y * 0.04 && !c.seam) col = mix(col, warm, streak * 0.6)
    }
    const far = Math.max(0, 1 - y / (gh * 0.1))
    return far > 0 ? dither([col, mix(col, hazeC, 0.5), hazeC], far * 2.2, x, y) : col
  }).toCanvas()

  const farC = far.toCanvas()
  const midC = mid.toCanvas()
  const lampsC = lamps.toCanvas()
  const lampY = hz - lh - 10
  const twinkle = Array.from({ length: 8 }, (_, i) => [
    Math.floor(hash(i, 1, 105) * W),
    Math.floor(hash(i, 2, 105) * hz * 0.5),
  ])

  return {
    draw(ctx, t, camX) {
      ctx.drawImage(skyC, 0, 0)
      for (let i = 0; i < twinkle.length; i++) {
        const on = Math.sin(t * 2.2 + i * 1.7) > 0.4
        ctx.fillStyle = on ? '#ffffff' : '#8a80c8'
        const [x, y] = twinkle[i]
        ctx.fillRect(x, y, 1, 1)
        if (on && i % 3 === 0) {
          ctx.fillRect(x - 1, y, 3, 1)
          ctx.fillRect(x, y - 1, 1, 3)
        }
      }
      const fx = camX * 0.05
      const fy = hz - fh + 1
      tile(ctx, farC, fx, fy, W)
      ctx.fillStyle = Math.sin(t * 3) > 0 ? '#ff3a4a' : '#6a1a3a'
      for (const [bx, by] of beacons) {
        const sx = (((Math.round(bx + fx) % LW) + LW) % LW) - LW
        for (let x = sx; x < W; x += LW) ctx.fillRect(x, fy + by, 1, 1)
      }
      const mx = Math.round(camX * 0.1)
      const my = hz - mh + 1
      tile(ctx, midC, mx, my, W)
      for (let i = 0; i < blink.length; i++) {
        const [wx, wy, c] = blink[i]
        const on = hash(i, Math.floor(t * 0.5 + hash(i, 0, 106) * 7), 106) < 0.5
        ctx.fillStyle = on ? css(c) : '#15112e'
        const sx = (((wx + mx) % LW) + LW) % LW
        for (let x = sx - LW; x < W; x += LW) ctx.fillRect(x, my + wy, 2, 2)
      }
      const bx0 = (((bbX + mx) % LW) + LW) % LW
      for (let x = bx0 - LW; x < W; x += LW) {
        if (x + bbW + 4 < 0) continue
        ctx.drawImage(bbFrameC, x - 2, my + bbY)
        strip(ctx, bbChart, t * 8, bbW, x, my + bbY + 9)
      }
      drawGround(ctx, ground, g, camX)
      const lx0 = Math.round(camX * 0.15)
      tile(ctx, lampsC, lx0, lampY, W)
      // One lamp buzzes out now and then.
      if (Math.sin(t * 7) + Math.sin(t * 2.3) > 1.75) {
        ctx.fillStyle = '#4a3a50'
        const lx = (((lampXs[1 % lampXs.length] + lx0) % LW) + LW) % LW
        for (let x = lx - LW; x < W; x += LW) ctx.fillRect(x, lampY + 7, 3, 4)
      }
    },
    pad: padCache((rx, ry) => buildPad(rx, ry, plazaPad)),
  }
}

const PV = PALS.city.paved.map((c) => mix(c, hex('#34265e'), 0.2))
const plazaPad: PadStyle = {
  top(x, y, nx, ny, lit) {
    // Concentric paving rings cut into radial stones, a medallion in the middle.
    const r = Math.sqrt(nx * nx + ny * ny)
    const ring = Math.floor(r * 4)
    const segs = 6 + ring * 6
    const a = (Math.atan2(ny, nx) / (Math.PI * 2) + 0.5) * segs + (ring % 2) * 0.5
    const fa = a - Math.floor(a)
    const rr = r * 4 - ring
    if (r < 0.2) return dither(H('#8a6a4a', '#b08850', '#d8b060', '#f0d890'), 1.6 + lit * 1.8, x, y)
    if (rr < 0.12 || (fa < 0.06 && ring > 0)) return PV[0]
    return dither(PV, 2.2 + lit * 1.2 + (hash(ring, Math.floor(a), 107) - 0.5) * 0.6, x, y)
  },
  side(x, k, nx) {
    if (k === 2) return PV[0]
    return dither(PV, 2.4 - k * 0.2 - Math.max(0, nx) * 1.4, x, k)
  },
  rim: hex('#1c1432'),
  edge: PV[4],
  lip: PV[1],
}

// ---------------------------------------------------------------------------------------------------------------
// Exchange: trading floor with a monitor wall of live charts, an LED ticker and a neon floor grid.

const TICKER = ' $REMY +4.20  BASE +1.37  RUG -99.9  WAGMI +69.0  ETH +2.10  NGMI -42.0  BRB +8.88  CABALD 0.00 '

export function exchange(g: BackdropGeo): Scene {
  const { W } = g
  const hz = Math.round(g.horizon)
  const LW = layerW(W)
  const wallC = hex('#0b1024')
  const ceil = 5
  const tickH = 9
  const deskH = 6
  const tickY = hz - deskH - tickH - 1
  const monTop = ceil + 3
  const avail = tickY - monTop - 2
  const rows = Math.max(1, Math.floor(avail / 20))
  const monH = Math.floor(avail / rows) - 2
  const monW = Math.round(monH * 1.55)
  const pitch = monW + 3
  const cols = Math.floor(LW / pitch)
  const LWm = cols * pitch

  // Wall with monitor holes (transparent screens) so chart strips scrolling underneath show through.
  const wall = new WPx(LWm, hz)
  wall.rect(0, 0, LWm, hz, wallC)
  for (let x = 0; x < LWm; x += 24) wall.vl(x, ceil, hz - ceil, hex('#10183a'))
  wall.rect(0, 0, LWm, ceil, hex('#05070f'))
  for (let x = 6; x < LWm; x += 40) {
    wall.hl(x, ceil - 2, 14, hex('#8cb4ff'))
    wall.hl(x + 1, ceil - 1, 12, hex('#3d7eff'))
    for (let y = ceil; y < ceil + 8; y++)
      for (let dx = -2; dx < 16; dx++)
        if ((1 - (y - ceil) / 8) * 0.5 > bayer(x + dx, y)) wall.set(x + dx, y, hex('#1a2a5a'))
  }
  const screens: [number, number][] = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = c * pitch + 1
      const y = monTop + r * (monH + 2)
      wall.rect(x - 1, y - 1, monW + 2, monH + 2, hex('#04050a'))
      wall.rect(x, y, monW, monH, hex('#262c40'))
      wall.hl(x, y, monW, hex('#3a4260'))
      for (let yy = y + 2; yy < y + monH - 2; yy++) for (let xx = x + 2; xx < x + monW - 2; xx++) wall.put(xx, yy, 0)
      screens.push([x + 2, y + 2])
    }
  // LED ticker housing.
  wall.rect(0, tickY - 1, LWm, tickH + 2, hex('#1a1e30'))
  wall.hl(0, tickY - 1, LWm, hex('#3a4260'))
  wall.rect(0, tickY, LWm, tickH, hex('#050505'))
  const wallCv = wall.toCanvas()
  const sw = monW - 4
  const sh = monH - 4
  const charts = Array.from({ length: rows }, (_, r) =>
    chartStrip(Math.max(LWm, 240), sh, 11 + r * 5, r % 2 ? 1 : -1, hex('#06142a'), hex('#0e2644')),
  )

  // LED ticker: each font pixel is one lit diode over a grid of dim ones.
  const tw = textWidth(TICKER) + 4
  const tick = new Px(tw, tickH)
  for (let y = 1; y < tickH - 1; y++) for (let x = 0; x < tw; x++) if ((x + y) % 2 === 0) tick.set(x, y, hex('#1c1408'))
  {
    let x = 0
    for (const word of TICKER.split(' ')) {
      const col = word.includes('+') ? hex('#3ef08a') : word.includes('-') ? hex('#ff4a5a') : hex('#ffb030')
      text(tick, word, x, 2, col)
      x += (word.length + 1) * 4
    }
  }
  const tickC = tick.toCanvas()

  // Trading desks along the far edge, their little screens glowing.
  const desk = new WPx(LW, deskH + 4)
  {
    desk.rect(0, 4, LW, deskH, hex('#121830'))
    desk.hl(0, 4, LW, hex('#3a4670'))
    const glow = H('#3d7eff', '#3ef08a', '#8cb4ff', '#ff4a5a')
    for (let x = 3; x < LW; x += 9) {
      const c = glow[Math.floor(hash(x, 0, 110) * glow.length)]
      desk.rect(x, 0, 5, 4, hex('#05060c'))
      desk.rect(x + 1, 1, 3, 2, c)
      desk.set(x + 2, 4, hex('#05060c'))
    }
  }
  const deskC = desk.toCanvas()

  // Floor: near-black gloss; each monitor leaves a stepped reflection column fading toward the viewer.
  const gh = g.H - hz
  const floor = new WPx(LWm, gh)
  const reflRamp = H('#060918', '#0a1230', '#10224a', '#18346a')
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < LWm; x++) {
      const u = x % pitch
      const under = u > 2 && u < monW - 1
      const v = (under ? 2.4 : 0.8) * Math.max(0, 1 - y / (gh * 0.16))
      floor.d[y * LWm + x] = band(reflRamp, v, x, y, 0.6)
    }
  const floorC = floor.toCanvas()
  // Converging grid lines: non-wrapping, 3 screens wide so camera offsets stay covered. Lines start only once
  // they are ≥3px apart so the vanishing point does not collapse into a blue blob.
  const [rays, rctx] = surface(W * 3, gh)
  {
    const p = new Px(W * 3, gh)
    const vx = W * 1.5
    const span = g.me.feet - hz
    // Start where neighbours are 5px apart; the first stretch keeps only every other line.
    const y0 = (5 * span) / 26
    for (let k = -30; k <= 30; k++) {
      const X = k * 26
      for (let y = Math.ceil(y0); y < gh; y++) {
        if (y < y0 * 2 && k % 2 !== 0) continue
        const x = Math.round(vx + (X * (y + 1)) / span)
        p.set(x, y, y < y0 * 2 ? BASE[1] : y < gh * 0.45 ? BASE[2] : BASE[3])
      }
    }
    rctx.drawImage(p.toCanvas(), 0, 0)
  }
  const ruleCols = [BASE[1], BASE[2], BASE[3], BASE[4]].map(css)

  return {
    draw(ctx, t, camX) {
      const ox = Math.round(camX * 0.2)
      for (let r = 0; r < rows; r++) {
        const y = monTop + r * (monH + 2) + 2
        tile(ctx, charts[r], ox - t * (6 + r * 3), y, W)
      }
      tile(ctx, wallCv, ox, 0, W)
      // Screens occasionally flash a red "sell" frame.
      const flash = Math.floor(t * 1.5)
      const [fx, fy] = screens[Math.floor(hash(flash, 0, 112) * screens.length)]
      if (hash(flash, 1, 112) < 0.4) {
        ctx.fillStyle = 'rgba(255,60,80,0.35)'
        const sx = (((fx + ox) % LWm) + LWm) % LWm
        for (let x = sx - LWm; x < W; x += LWm) ctx.fillRect(x, fy, sw, sh)
      }
      tile(ctx, tickC, ox - t * 18, tickY, W)
      drawGround(ctx, floorC, g, camX)
      ctx.drawImage(rays, Math.round(-W + camX * 0.6), hz)
      // Horizontal rules rush toward the viewer.
      const ph = (t * 1.6) % 1
      for (let j = 0; j < 24; j++) {
        const y = Math.round(hz + (g.H + 20 - hz) / (1 + (j + ph) * 0.35))
        const next = hz + (g.H + 20 - hz) / (1 + (j + 1 + ph) * 0.35)
        // Rules closer than 3px would merge into a solid band at the vanishing line.
        if (y >= g.H || y - next < 3) continue
        const d = (y - hz) / (g.H - hz)
        ctx.fillStyle = ruleCols[Math.min(3, Math.floor(d * 4.5))]
        ctx.fillRect(0, y, W, 1)
      }
      tile(ctx, deskC, camX * 0.15, hz - deskH - 3, W)
    },
    pad: padCache((rx, ry) => buildPad(rx, ry, neonPad)),
  }
}

const neonPad: PadStyle = {
  top(x, y, nx, ny, lit) {
    const r = Math.sqrt(nx * nx + ny * ny)
    if (r > 0.86) return dither(BASE, 2.6 + lit * 1.6, x, y)
    if (r > 0.8) return hex('#05060c')
    if (Math.abs(r - 0.5) < 0.05) return BASE[3]
    if (Math.abs(r - 0.5) < 0.1) return (x + y) % 2 ? BASE[2] : hex('#1a2238')
    if (r < 0.18) return r < 0.1 ? BASE[5] : BASE[3]
    return dither(H('#0a0e1c', '#141a2e', '#1e2640', '#2a3458'), 1.6 + lit * 1.4, x, y)
  },
  side(x, k, nx) {
    if (k === 2 && x % 4 === 0) return x % 8 === 0 ? hex('#3ef08a') : BASE[4]
    return dither(H('#05060c', '#0e1222', '#1a2034', '#283050'), 2.2 - k * 0.25 - Math.max(0, nx) * 1.2, x, k)
  },
  rim: hex('#02030a'),
  edge: BASE[5],
  lip: BASE[2],
}
