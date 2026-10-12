// hair-we-go · assets, baked venue art, props, analytic particles.
// Stage lives on a 1056×600 low canvas (view window 48,30 → 1008,570),
// blitted to 1920×1080 through the camera with nearest-neighbour scaling.
import { E, hash, lerp, seg, clamp } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'

export const LW = 1056, LH = 600
export const VX = 48, VY = 30, VW = 960, VH = 540 // view window inside low canvas

const MEDIA_REMY = new URL('../../media/remy/', import.meta.url)

async function portrait(id) {
  const img = new Image()
  img.src = new URL(`Character${id}.webp`, MEDIA_REMY).href
  await img.decode()
  return img
}

// Circle face crops from the 600×600 originals (QA'd per id; CRIMSON is the
// reference framing — centres sit low enough to keep the mouth in frame):
// 42 sword enters frame-left → right-biased; 1000 slightly higher crop.
export const PCROP = {
  42: { cx: 345, cy: 245, r: 148 },
  30: { cx: 300, cy: 272, r: 154 },
  46: { cx: 300, cy: 276, r: 154 },
  1000: { cx: 300, cy: 258, r: 146 },
  4: { cx: 300, cy: 268, r: 150 },
  1217: { cx: 300, cy: 272, r: 152 },
}

export async function load(TL) {
  const S = { T: TL }
  S.low = A.canvas(LW, LH)
  S.x = S.low.getContext('2d')
  S.band = []
  for (const m of TL.BAND) S.band.push(await A.loadRemy(m.id, false))
  S.baron = await A.loadRemy(TL.BARON, false)
  S.goons = []
  for (const g of TL.GOONS) S.goons.push(await A.loadRemy(g, false))
  S.crowd = []
  for (const id of TL.AUDIENCE) S.crowd.push(await A.loadRemy(id, true))
  S.heads = await A.loadHeads()
  S.icons = TL.BAND.map((m) => A.headIcon(S.heads, m.id, 3))
  S.portraits = {}
  for (const m of TL.BAND) S.portraits[m.id] = await portrait(m.id)
  S.razor = bakeRazor()
  S.back = bakeBackdrop()
  bakeParticles(S, TL)
  return S
}

// ---- venue backdrop (baked once) -----------------------------------------
function bakeBackdrop() {
  const c = A.canvas(LW, LH), x = c.getContext('2d')
  // deep venue void
  const g = x.createLinearGradient(0, 0, 0, LH)
  g.addColorStop(0, '#050509')
  g.addColorStop(0.55, '#0b0a16')
  g.addColorStop(1, '#07060d')
  x.fillStyle = g
  x.fillRect(0, 0, LW, LH)
  // faint star sparkle field
  for (let i = 0; i < 90; i++) {
    const px = Math.floor(hash(i * 3 + 1) * LW), py = Math.floor(hash(i * 7 + 2) * 240)
    x.fillStyle = `rgba(190,200,255,${0.05 + hash(i * 11 + 3) * 0.1})`
    x.fillRect(px, py, 1, 1)
  }
  // back wall panels (y 66..300) with vertical seams
  const wg = x.createLinearGradient(0, 66, 0, 300)
  wg.addColorStop(0, '#101020')
  wg.addColorStop(1, '#17162a')
  x.fillStyle = wg
  x.fillRect(0, 66, LW, 234)
  x.fillStyle = 'rgba(0,0,0,0.28)'
  for (let px = 0; px <= LW; px += 96) x.fillRect(px, 66, 2, 234)
  x.fillStyle = 'rgba(255,214,120,0.10)'
  x.fillRect(0, 64, LW, 2)
  // stipple texture rows on the wall
  for (let i = 0; i < 500; i++) {
    const px = Math.floor(hash(i * 13 + 41) * LW), py = 70 + Math.floor(hash(i * 17 + 43) * 228)
    x.fillStyle = `rgba(255,255,255,${0.015 + hash(i * 19 + 47) * 0.025})`
    x.fillRect(px, py, 1, 1)
  }
  bakeSpeaker(x, 70, 152)
  bakeSpeaker(x, LW - 142, 152)
  bakeTruss(x)
  bakeStage(x)
  return c
}

function bakeSpeaker(x, sx, sy) {
  // three stacked cabs + horn, rim-lit from stage centre
  for (let cab = 0; cab < 3; cab++) {
    const cy = sy + cab * 92, w = 72, h = 84
    x.fillStyle = '#0e0e19'
    x.fillRect(sx, cy, w, h)
    x.fillStyle = '#151527'
    x.fillRect(sx + 3, cy + 3, w - 6, h - 6)
    const cone = 26 - cab * 2
    for (const [ox, oy, cr] of [[w / 2, h / 2, cone], [w / 2, h / 2 - 30, 10]]) {
      const cg = x.createRadialGradient(sx + ox - cr * 0.3, cy + oy - cr * 0.3, 1, sx + ox, cy + oy, cr)
      cg.addColorStop(0, '#2b2b45')
      cg.addColorStop(0.7, '#1a1a2e')
      cg.addColorStop(1, '#101020')
      x.fillStyle = cg
      x.beginPath(), x.arc(sx + ox, cy + oy, cr, 0, 7), x.fill()
      x.strokeStyle = 'rgba(255,214,120,0.14)'
      x.beginPath(), x.arc(sx + ox, cy + oy, cr + 2, -2.4, -0.7), x.stroke()
    }
  }
  // horn box on top
  x.fillStyle = '#12121f'
  x.fillRect(sx + 6, sy - 26, 60, 24)
  x.fillStyle = 'rgba(255,214,120,0.12)'
  x.fillRect(sx + 6, sy - 26, 60, 2)
}

function bakeTruss(x) {
  x.strokeStyle = '#191927'
  x.lineWidth = 5
  for (const ty of [36, 60]) {
    x.beginPath(), x.moveTo(0, ty), x.lineTo(LW, ty), x.stroke()
  }
  x.strokeStyle = '#131320'
  x.lineWidth = 3
  for (let px = 24; px < LW; px += 48) {
    x.beginPath(), x.moveTo(px, 36), x.lineTo(px + 48, 60), x.stroke()
    x.beginPath(), x.moveTo(px + 48, 36), x.lineTo(px, 60), x.stroke()
  }
  // light fixtures (beam anchors sit just under them)
  for (const fx of [200, 364, 528, 692, 856]) {
    x.fillStyle = '#0d0d18'
    x.fillRect(fx - 10, 60, 20, 16)
    x.fillStyle = '#ffd76e'
    x.fillRect(fx - 6, 74, 12, 3)
  }
}

function bakeStage(x) {
  // floor 300→505 with converging board seams toward vanishing point
  const fg = x.createLinearGradient(0, 300, 0, 505)
  fg.addColorStop(0, '#141021')
  fg.addColorStop(0.5, '#1c1730')
  fg.addColorStop(1, '#241e3a')
  x.fillStyle = fg
  x.fillRect(0, 300, LW, 205)
  x.strokeStyle = 'rgba(0,0,0,0.34)'
  x.lineWidth = 1.5
  for (let b = -6; b <= 6; b++) {
    x.beginPath()
    x.moveTo(528 + b * 26, 300)
    x.lineTo(528 + b * 130, 505)
    x.stroke()
  }
  for (const hy of [340, 390, 448]) {
    x.strokeStyle = `rgba(0,0,0,${0.16 + (hy - 300) / 3000})`
    x.beginPath(), x.moveTo(0, hy), x.lineTo(LW, hy), x.stroke()
  }
  // glossy sheen down centre
  const sg = x.createLinearGradient(0, 300, 0, 505)
  sg.addColorStop(0, 'rgba(255,214,120,0)')
  sg.addColorStop(1, 'rgba(255,214,120,0.06)')
  x.fillStyle = sg
  x.fillRect(328, 300, 400, 205)
  // front skirt + gold trim + pit
  x.fillStyle = '#0b0913'
  x.fillRect(0, 505, LW, 32)
  x.fillStyle = '#3a2f1a'
  x.fillRect(0, 505, LW, 3)
  x.fillStyle = 'rgba(255,214,120,0.16)'
  x.fillRect(0, 506, LW, 1)
  x.fillStyle = '#050508'
  x.fillRect(0, 537, LW, LH - 537)
  // barrier rail
  x.fillStyle = '#101019'
  x.fillRect(0, 524, LW, 6)
  x.fillStyle = 'rgba(255,255,255,0.05)'
  x.fillRect(0, 524, LW, 1)
}

// ---- the giant razor -------------------------------------------------------
function bakeRazor() {
  const w = 112, h = 150, c = A.canvas(w, h), x = c.getContext('2d')
  // cable
  x.strokeStyle = '#20202e'
  x.lineWidth = 4
  x.beginPath(), x.moveTo(56, 6), x.quadraticCurveTo(78, -2, 66, 10), x.stroke()
  // body
  const bg = x.createLinearGradient(20, 0, 92, 0)
  bg.addColorStop(0, '#3c3c50')
  bg.addColorStop(0.45, '#6a6a82')
  bg.addColorStop(1, '#2c2c3e')
  x.fillStyle = bg
  rrect(x, 24, 10, 64, 88, 12), x.fill()
  // vents + lever + stripe
  x.fillStyle = '#1c1c2a'
  for (const vy of [26, 38, 50]) x.fillRect(36, vy, 40, 5)
  x.fillStyle = '#c9b64a'
  x.fillRect(28, 64, 56, 7)
  x.fillStyle = '#232336'
  rrect(x, 46, 76, 20, 16, 4), x.fill()
  // blade head
  const hg = x.createLinearGradient(0, 100, 0, 128)
  hg.addColorStop(0, '#d9dde6')
  hg.addColorStop(0.5, '#9aa0b0')
  hg.addColorStop(1, '#5c6272')
  x.fillStyle = hg
  rrect(x, 4, 98, w - 8, 30, 5), x.fill()
  // teeth
  x.fillStyle = '#31363f'
  for (let t = 0; t < 9; t++) x.fillRect(10 + t * 11, 124, 6, 14)
  x.fillStyle = '#e8ecf4'
  for (let t = 0; t < 9; t++) x.fillRect(10 + t * 11, 120, 6, 3)
  // rivets
  x.fillStyle = '#8d93a6'
  for (const rx of [16, 96]) { x.beginPath(), x.arc(rx, 104, 3, 0, 7), x.fill() }
  return c
}
function rrect(x, px, py, w, h, r) {
  x.beginPath()
  x.moveTo(px + r, py)
  x.arcTo(px + w, py, px + w, py + h, r)
  x.arcTo(px + w, py + h, px, py + h, r)
  x.arcTo(px, py + h, px, py, r)
  x.arcTo(px, py, px + w, py, r)
  x.closePath()
}
export { rrect }

// ---- immutable particle tables (analytic — never appended in draw) --------
function bakeParticles(S, TL) {
  const R = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) }
  // confetti bursts: two cannons, alternating sides per event
  S.confEvents = TL.CONFETTI.map((g, i) => {
    const side = i % 2 === 0 ? -1 : 1
    const x0 = 528 + side * 336, y0 = 356 // low-canvas coords (view 192/864, y 326)
    const cols = ['#ffd76e', '#ff7d9c', '#8fe8dc', '#ffffff', '#e88950', '#b7a4ff']
    const bits = []
    const r = R(1000 + i * 77)
    for (let k = 0; k < 84; k++) {
      const ang = (-Math.PI / 2) + side * (0.15 + r() * 0.5) * (r() < 0.85 ? 1 : -0.5)
      bits.push({
        vx: Math.cos(ang) * (140 + r() * 320), vy: Math.sin(ang) * (240 + r() * 180),
        col: cols[Math.floor(r() * cols.length)], spin: (r() - 0.5) * 14,
        fr: 3 + r() * 4, amp: 8 + r() * 16, ph: r() * 6.28, life: 2.6 + r() * 0.9,
        sz: 3 + Math.round(r() * 3),
      })
    }
    return { g, x: x0, y: y0, bits }
  })
  // finale drizzle from the rafters
  const dr = R(4242)
  S.drizzle = []
  for (let k = 0; k < 110; k++) {
    S.drizzle.push({
      x: 20 + dr() * (LW - 40), v: 60 + dr() * 60, off: dr() * 300,
      col: ['#ffd76e', '#ff7d9c', '#8fe8dc', '#ffffff', '#b7a4ff'][Math.floor(dr() * 5)],
      sway: 6 + dr() * 10, ph: dr() * 6.28, sz: 2 + Math.round(dr() * 2),
    })
  }
  // pyro fountain bits per nozzle (nozzles sit in the gaps between members)
  S.pyroEvents = TL.PYRO.map((g, i) => {
    const nx = VX + [120, 316, 424, 536, 800][i % 5]
    const r = R(900 + i * 13)
    const bits = []
    for (let k = 0; k < 26; k++) {
      bits.push({ vx: (r() - 0.5) * 64, vy: -(280 + r() * 300), life: 0.9 + r() * 0.4 })
    }
    return { g, x: nx, y: 534, bits }
  })
  // slice sparks
  const sr = R(777)
  S.sparkBits = []
  for (let k = 0; k < 46; k++) {
    const a = sr() * Math.PI * 2
    S.sparkBits.push({
      vx: Math.cos(a) * (70 + sr() * 330), vy: Math.sin(a) * (70 + sr() * 260) - 70,
      life: 0.35 + sr() * 0.45,
    })
  }
  return S
}

// ---- per-frame particle painters (pure functions of world time) ----------
export function paintConfetti(x, g, events, drizzleOn) {
  for (const ev of events) {
    const age = g - ev.g
    if (age < 0 || age > 3.6) continue
    for (const b of ev.bits) {
      const px = ev.x + b.vx * age + Math.sin(age * b.fr + b.ph) * b.amp
      const py = ev.y + b.vy * age + 0.5 * 240 * age * age
      if (py > 596) continue
      const rot = b.spin * age
      x.save(), x.translate(px, py), x.rotate(rot)
      x.fillStyle = b.col
      const fade = clamp(1 - (age - b.life + 0.9) / 0.9, 0, 1)
      x.globalAlpha = 0.9 * fade
      x.fillRect(-b.sz / 2, -b.sz / 4, b.sz, b.sz / 2)
      x.restore()
    }
  }
  if (drizzleOn) {
    x.globalAlpha = 0.8
    for (const d of S_DRIZZLE) {
      const py = ((g * d.v + d.off) % 300) - 20
      const px = d.x + Math.sin(g * 1.4 + d.ph) * d.sway
      x.fillStyle = d.col
      x.fillRect(px, py, d.sz, d.sz * 0.7)
    }
    x.globalAlpha = 1
  }
}
let S_DRIZZLE = null
export function setDrizzle(list) { S_DRIZZLE = list }

export function paintPyro(x, g, events) {
  x.globalCompositeOperation = 'lighter'
  for (const ev of events) {
    const age = g - ev.g
    if (age < 0 || age > 1.5) continue
    // sustained glow column: reads as a stage fountain at any framing
    if (age < 0.7) {
      const ch = 210 * Math.min(1, age / 0.12) * (1 - E.outCubic(seg(age, 0.35, 0.7)))
      if (ch > 4) {
        const cg = x.createLinearGradient(ev.x, ev.y, ev.x, ev.y - ch)
        cg.addColorStop(0, 'rgba(255,214,150,0.34)')
        cg.addColorStop(0.6, 'rgba(255,150,70,0.16)')
        cg.addColorStop(1, 'rgba(255,120,60,0)')
        x.fillStyle = cg
        x.fillRect(ev.x - 7, ev.y - ch, 14, ch)
        x.fillStyle = 'rgba(255,244,214,0.5)'
        x.fillRect(ev.x - 2.5, ev.y - ch * 0.7, 5, ch * 0.7)
      }
    }
    for (const b of ev.bits) {
      const u = age / b.life
      if (u > 1) continue
      const px = ev.x + b.vx * age
      const py = ev.y + b.vy * age + 0.5 * 560 * age * age
      if (py > 528) continue // never below the stage skirt
      const a = (1 - u) * (1 - u)
      const sz = 3 + 4 * a
      x.fillStyle = `rgba(255,${Math.round(190 - 80 * u)},${Math.round(90 - 60 * u)},${0.9 * a})`
      x.fillRect(px - sz / 2, py - sz, sz, sz * 1.6)
    }
    // muzzle glow
    const a0 = Math.max(0, 1 - age / 0.2)
    if (a0 > 0) {
      x.fillStyle = `rgba(255,220,150,${0.5 * a0})`
      x.beginPath(), x.arc(ev.x, ev.y, 9 * a0 + 3, 0, 7), x.fill()
    }
  }
  x.globalCompositeOperation = 'source-over'
}

export function paintSparks(x, g, evG, ex, ey, bits) {
  const age = g - evG
  if (age < 0 || age > 0.8) return
  x.globalCompositeOperation = 'lighter'
  for (const b of bits) {
    const u = age / b.life
    if (u > 1) continue
    const px = ex + b.vx * age, py = ey + b.vy * age + 0.5 * 420 * age * age
    const sz = 3 + 3 * (1 - u)
    x.fillStyle = `rgba(255,232,170,${(1 - u) * 0.95})`
    x.fillRect(px - sz / 2, py - sz / 2, sz, sz)
  }
  x.globalCompositeOperation = 'source-over'
}

// ---- hair streamers (wind machine) ----------------------------------------
// Streaks flowing back+up from each member's head, in their own hair colour.
export function paintStreamers(x, hx, hy, color, wind, g, seed, big) {
  if (wind <= 0.02) return
  const n = big ? 14 : 10
  x.lineCap = 'round'
  for (let k = 0; k < n; k++) {
    const ph = hash(seed * 31 + k) * 6.28
    const u = ((g * (0.7 + hash(seed * 17 + k) * 0.5) + ph / 6.28) % 1)
    const len = (16 + hash(seed * 13 + k) * 18) * wind
    const rise = 4 + hash(seed * 7 + k) * 9 * wind
    const bx = hx + 2 + u * len, by = hy - 2 - u * rise + Math.sin(u * 6.28 + ph) * 2.5
    x.strokeStyle = color
    x.globalAlpha = (0.55 - u * 0.35) * Math.min(1, wind)
    x.lineWidth = big ? 3 : 2.2
    x.beginPath()
    x.moveTo(hx + u * 3, hy - u * 1.5)
    x.quadraticCurveTo(hx + u * 3 + len * 0.5, by - rise * 0.3, bx, by)
    x.stroke()
  }
  x.globalAlpha = 1
}

// ---- pit crowd (silhouettes + glowsticks, drawn over the stage front) -----
const PIT_COLS = ['#ffd76e', '#ff7d9c', '#8fe8dc', '#b7a4ff']
export function paintPit(x, g, energy, beat) {
  const rows = [
    { y: 560, r: 7.5, n: 30 }, { y: 578, r: 9, n: 26 }, { y: 598, r: 11, n: 22 },
  ]
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]
    for (let i = 0; i < row.n; i++) {
      const h = hash(ri * 977 + i * 131 + 5)
      const px = ((i + 0.5) / row.n) * LW + (h - 0.5) * 18
      const bob = Math.abs(Math.sin(beat * Math.PI + h * 6.28)) * 3 * energy
      const py = row.y - bob
      x.fillStyle = `rgba(${8 + ri * 3},${9 + ri * 3},${16 + ri * 4},1)`
      x.beginPath(), x.arc(px, py, row.r, 0, 7), x.fill()
      x.fillRect(px - row.r * 1.5, py + row.r - 1, row.r * 3, row.y - py + row.r)
      // glowstick on a subset
      if (energy > 0.3 && hash(ri * 31 + i * 57 + 9) > 0.55) {
        const col = PIT_COLS[Math.floor(hash(ri * 7 + i * 3 + 4) * 4)]
        const sway = Math.sin(beat * Math.PI * 2 + h * 6.28) * 0.5
        const hx2 = px + Math.sin(sway) * row.r * 2.2
        const hy2 = py - row.r - 7 - Math.abs(Math.sin(beat * Math.PI + h * 6.28)) * 3 * energy
        x.strokeStyle = 'rgba(60,60,80,1)'
        x.lineWidth = 2
        x.beginPath(), x.moveTo(px, py - row.r * 0.6), x.lineTo(hx2, hy2), x.stroke()
        x.globalCompositeOperation = 'lighter'
        x.fillStyle = col
        x.globalAlpha = 0.9
        x.fillRect(hx2 - 1.5, hy2 - 4, 3, 6)
        x.globalAlpha = 0.25
        x.fillRect(hx2 - 3, hy2 - 6, 6, 10)
        x.globalAlpha = 1
        x.globalCompositeOperation = 'source-over'
      }
    }
  }
  // audience camera flashes
  x.globalCompositeOperation = 'lighter'
  for (let k = 0; k < 4; k++) {
    const slot = Math.floor(g * 6) + k * 97
    if (hash(slot * 13 + 2) < 0.72) continue
    const ft = (g * 6) % 1
    const fx = 40 + hash(slot * 7 + 1) * (LW - 80)
    const fy = 545 + hash(slot * 11 + 3) * 40
    x.fillStyle = `rgba(255,255,255,${0.8 * Math.max(0, 1 - ft * 5)})`
    x.beginPath(), x.arc(fx, fy, 2.5, 0, 7), x.fill()
  }
  x.globalCompositeOperation = 'source-over'
}

// ---- light beams (additive) ------------------------------------------------
export function beam(x, x0, y0, x1, y1, w1, color, a) {
  const dx = x1 - x0, dy = y1 - y0
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len, ny = dx / len
  const w0 = 4
  const gr = x.createLinearGradient(x0, y0, x1, y1)
  gr.addColorStop(0, color + '')
  gr.addColorStop(1, 'rgba(0,0,0,0)')
  x.globalCompositeOperation = 'lighter'
  x.globalAlpha = a
  x.fillStyle = gr
  x.beginPath()
  x.moveTo(x0 + nx * w0, y0 + ny * w0)
  x.lineTo(x1 + nx * w1, y1 + ny * w1)
  x.lineTo(x1 - nx * w1, y1 - ny * w1)
  x.lineTo(x0 - nx * w0, y0 - ny * w0)
  x.closePath(), x.fill()
  x.globalAlpha = 1
  x.globalCompositeOperation = 'source-over'
}

export function floorPool(x, px, py, r, color, a) {
  x.globalCompositeOperation = 'lighter'
  const gr = x.createRadialGradient(px, py, 1, px, py, r)
  gr.addColorStop(0, color)
  gr.addColorStop(1, 'rgba(0,0,0,0)')
  x.globalAlpha = a
  x.save()
  x.translate(px, py), x.scale(1, 0.32)
  x.fillStyle = gr
  x.beginPath(), x.arc(0, 0, r, 0, 7), x.fill()
  x.restore()
  x.globalAlpha = 1
  x.globalCompositeOperation = 'source-over'
}

// ---- neon sign (per-frame for flicker) -------------------------------------
const NEON_ON = [0.12, 0.3, 0.5, 0.75, 0.9, 1.1, 1.3, 1.55, 1.75]
export function neon(x, t, power, bridgeDim) {
  const cx = 528, cy = 132
  const word = 'REMY BOYS'
  x.font = '40px "Press Start 2P"'
  x.textAlign = 'left'
  x.textBaseline = 'middle'
  const adv = 40, total = word.length * adv
  let sx = cx - total / 2 + adv / 2
  for (let i = 0; i < word.length; i++) {
    const ch = word[i]
    const lit = t > NEON_ON[i] && (bridgeDim > 0 ? hash(i * 7 + Math.floor(t * 22)) > 0.45 : hash(i * 5 + Math.floor(t * 24)) > 0.06)
    const on = power > 0.95 || lit
    if (on) {
      x.shadowColor = '#ffb42e'
      x.shadowBlur = 16
      x.fillStyle = bridgeDim > 0 ? '#b9a68a' : '#ffe9a3'
      x.fillText(ch, sx - adv / 2, cy)
      x.shadowBlur = 0
      x.fillStyle = '#fff6dd'
      x.fillText(ch, sx - adv / 2, cy)
    } else {
      x.fillStyle = 'rgba(120,110,90,0.16)'
      x.fillText(ch, sx - adv / 2, cy)
    }
    sx += adv
  }
  // sub-sign (held off until the intro caption has cleared)
  const sub = 'HAIR WE GO · WORLD TOUR'
  x.font = '16px "Press Start 2P"'
  const w2 = sub.length * 16
  const subOn = t > 3.4 && (bridgeDim > 0 ? hash(99 + Math.floor(t * 20)) > 0.6 : hash(88 + Math.floor(t * 18)) > 0.12)
  if (subOn) {
    x.shadowColor = '#59e0ff'
    x.shadowBlur = 10
    x.fillStyle = '#bff2ff'
    x.fillText(sub, cx - w2 / 2, cy + 44)
    x.shadowBlur = 0
  } else {
    x.fillStyle = 'rgba(70,110,120,0.18)'
    x.fillText(sub, cx - w2 / 2, cy + 44)
  }
}
