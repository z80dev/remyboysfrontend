// RAIDERS OF THE LOST HAIR art: rig prep (blade -> coiled bullwhip, white suit,
// choir robes) + prepare-time bakes (temple corridor, daylight ridge, lecture hall,
// legend frieze, sepia map, dusk dig, desert road, convoy truck, night ruin, scissors
// pit, island-night altar, warehouse crate canyon) + pure per-frame painters (golden
// toupee idol, stone-head pedestal, HAIRBALL boulder, ark of the flow, procedural
// horses, torches, umbrellas, blowguns, wicker baskets, chrome skull, ghost combs,
// forklift, suited men). Pirates-cabald quality bar: ramped paint, seeded texture,
// no flat fills. Everything deterministic: hash/rng only, every painter pure in t.
import { hash, rng } from 'filmkit/lib.js'
import { canvas } from '../remy-bros/art.js'

export const W = 1920, H = 1080
export const OS = 240 // overscan painted around the stage so camera moves never expose edges

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]
export const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
export const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
export function shadeHex(hex, k) {
  const [r, g, b] = hexRgb(hex)
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}
const lerp = (a, b, u) => a + (b - a) * u

// ============================== rig prep ==============================

export function tint(R, color) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color
  x.fillRect(0, 0, R.w, R.h)
  return { ...R, c }
}

function whiteSil(c, w, h) {
  const s = canvas(w, h), x = s.getContext('2d')
  x.drawImage(c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = '#fff'
  x.fillRect(0, 0, w, h)
  return s
}

// Strip the greatsword baked into a near sprite (42's geometry, verified pattern
// from films/hairtanic + pirates-cabald: blade hugs the viewer-left edge, yellow
// pommel at the waist; per-scanline drop the detached left-edge run, then clear the
// left columns of blade-family colour, then sweep the crossing blade diagonally).
export function stripBlade(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const a = (xx, y) => (xx < 0 || xx >= R.w ? 0 : p[(y * R.w + xx) * 4 + 3])
  for (let y = 0; y < R.h; y++) {
    let x0 = 0
    while (x0 < R.w && a(x0, y) === 0) x0++
    if (x0 > 8) continue
    let x1 = x0
    while (x1 < R.w && a(x1, y) > 0) x1++
    if (x1 - x0 > 15) continue
    let gap = 0, xx = x1
    while (xx < R.w && a(xx, y) === 0) { gap++; xx++ }
    if (gap < 3) continue
    for (let xb = x0; xb < x1; xb++) p[(y * R.w + xb) * 4 + 3] = 0
  }
  for (let y = 0; y < R.h; y++)
    for (let xx = 0; xx < 23; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] === 0) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      if (b >= r || (g > 150 && b < 90 && r > 140)) p[i + 3] = 0
    }
  for (let y = 40; y < R.h; y++)
    for (let xx = 0; xx < 36; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] === 0) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      if ((b >= r + 8 && b > 80) || (g > 150 && b < 90 && r > 140)) p[i + 3] = 0
    }
  x.putImageData(d, 0, 0)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Hero's sword becomes a coiled bullwhip hung off the casting.md brief: plaited coil
// at the shoulder, tan, with the whip butt (handled grip) at the hip.
export function whipify(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const cx = R.cx - 24, cy = R.top + 64
  // plaited coil: three stacked loops with a rope ramp + dark seams
  for (let i = 0; i < 3; i++) {
    const yy = cy + i * 9
    x.strokeStyle = i === 1 ? '#c9a468' : '#a8834e'
    x.lineWidth = 7
    x.beginPath()
    x.ellipse(cx, yy, 13 - i * 1.2, 6.5, 0, 0, 7)
    x.stroke()
    x.strokeStyle = '#6e5228'
    x.lineWidth = 2
    x.beginPath()
    x.ellipse(cx, yy + 1.5, 13 - i * 1.2, 6.5, 0, 0.4, 2.6)
    x.stroke()
  }
  // falling cracker strand off the coil bottom
  x.strokeStyle = '#b8955c'
  x.lineWidth = 3
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(cx + 10, cy + 22)
  x.quadraticCurveTo(cx + 16, cy + 34, cx + 12, cy + 44)
  x.stroke()
  // whip butt at the hip: grip + pommel band
  x.fillStyle = '#3a2a18'
  x.fillRect(cx + 4, cy + 40, 8, 16)
  x.fillStyle = '#c9a468'
  x.fillRect(cx + 4, cy + 40, 8, 4)
  x.fillStyle = '#8a6a34'
  x.fillRect(cx + 4, cy + 52, 8, 4)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Baldouq: remap the yellow jersey family (#b6a80d shirt + accent) to an ivory
// linen suit ramp. Warm-gray skin/hair (#a08f7f) and the black mustache survive.
export function whiteSuit(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const ivory = hexRgb('#efe9d8'), linen = hexRgb('#cfc4a4'), ink = hexRgb('#8a7f60')
  for (let i = 0; i < R.w * R.h; i++) {
    if (p[i * 4 + 3] < 8) continue
    const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2]
    if (!(r > 130 && g > 115 && b < 100 && r + g > b * 2 + 60)) continue // yellows only
    const L = (r + g + b) / 765
    const col = L < 0.3 ? ink : mix(linen, ivory, cl((L - 0.3) / 0.45))
    p[i * 4] = col[0]; p[i * 4 + 1] = col[1]; p[i * 4 + 2] = col[2]
  }
  x.putImageData(d, 0, 0)
  // suit shaping: lapel V + pocket square in pixel strokes over the torso band
  const ty = R.top + 58
  x.strokeStyle = '#b8ad8c'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(R.cx - 12, ty)
  x.lineTo(R.cx - 2, ty + 22)
  x.moveTo(R.cx + 12, ty)
  x.lineTo(R.cx + 3, ty + 22)
  x.stroke()
  x.fillStyle = '#c23a2e'
  x.fillRect(R.cx + 10, ty + 8, 6, 5)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Ceremony choir: repaint everything below the head line into a white/saffron robe
// ramp (the singers are bald Cabald, so any non-skin pixel below the crown is cloth).
export function choirRobe(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const hi = hexRgb('#f8f2e0'), mid = hexRgb('#e6dcc2'), deep = hexRgb('#a8813a')
  const yCut = R.top + Math.round((R.bottom - R.top) * 0.3)
  for (let y = yCut; y < R.h; y++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] < 8) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      if (r > 140 && r > g && g > b && r - b > 30) continue // skin stays
      const L = (r + g + b) / 765
      const col = L < 0.28 ? deep : mix(mid, hi, cl((L - 0.28) / 0.5))
      p[i] = col[0]; p[i + 1] = col[1]; p[i + 2] = col[2]
    }
  x.putImageData(d, 0, 0)
  // saffron stole: diagonal sash baked over the robe
  x.strokeStyle = '#d9a441'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(R.cx - 14, yCut + 6)
  x.lineTo(R.cx + 10, R.bottom - 4)
  x.stroke()
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// ============================== hats & worn props (live painters) ==============================

// Hero's brown fedora: pinched crown + snap brim + darker band. Drawn over the hair
// crown; the crimson fringe stays visible below the brim line.
export function fedora(x, cx, cy, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(o.rot ?? 0)
  x.scale(s * (o.flip ? -1 : 1), s)
  x.fillStyle = o.col ?? '#6e5233'
  x.beginPath()
  x.moveTo(-40, 2)
  x.quadraticCurveTo(-46, -8, -30, -10)
  x.quadraticCurveTo(-12, -16, 0, -16)
  x.quadraticCurveTo(14, -16, 30, -10)
  x.quadraticCurveTo(46, -8, 40, 2)
  x.quadraticCurveTo(0, 10, -40, 2)
  x.closePath()
  x.fill()
  x.fillStyle = o.col2 ?? '#84653e'
  x.beginPath()
  x.moveTo(-20, -8)
  x.quadraticCurveTo(-18, -30, 0, -32)
  x.quadraticCurveTo(18, -30, 20, -8)
  x.quadraticCurveTo(0, -14, -20, -8)
  x.closePath()
  x.fill()
  x.fillStyle = '#4a3620'
  x.fillRect(-19, -13, 38, 6)
  x.fillStyle = 'rgba(255,235,200,0.28)'
  x.beginPath()
  x.moveTo(-14, -26)
  x.quadraticCurveTo(-2, -30, 10, -26)
  x.quadraticCurveTo(0, -22, -14, -26)
  x.closePath()
  x.fill()
  x.restore()
}

// Baldouq's Panama: cream wide-brim with an upturned rear sweep + dark band.
export function panama(x, cx, cy, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(o.rot ?? 0)
  x.scale(s * (o.flip ? -1 : 1), s)
  x.fillStyle = o.col ?? '#e8dfc4'
  x.beginPath()
  x.moveTo(-44, 4)
  x.quadraticCurveTo(-50, -6, -28, -8)
  x.quadraticCurveTo(-10, -14, 0, -14)
  x.quadraticCurveTo(12, -14, 30, -8)
  x.quadraticCurveTo(52, -6, 46, 4)
  x.quadraticCurveTo(24, 12, 0, 11)
  x.quadraticCurveTo(-24, 12, -44, 4)
  x.closePath()
  x.fill()
  x.fillStyle = o.col2 ?? '#f4ecd6'
  x.beginPath()
  x.moveTo(-18, -8)
  x.quadraticCurveTo(-16, -28, 0, -30)
  x.quadraticCurveTo(16, -28, 18, -8)
  x.quadraticCurveTo(0, -13, -18, -8)
  x.closePath()
  x.fill()
  x.fillStyle = '#5a4a2c'
  x.fillRect(-17, -13, 34, 5)
  x.strokeStyle = 'rgba(120,100,60,0.5)'
  x.lineWidth = 1.6
  for (const dx of [-30, -12, 8, 26]) {
    x.beginPath()
    x.moveTo(dx, -6)
    x.quadraticCurveTo(dx + 3, 2, dx, 9)
    x.stroke()
  }
  x.restore()
}

// Dig-foreman hard hat: amber dome + front brim; o.rot tips it over the eyes.
export function hardHat(x, cx, cy, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(o.rot ?? 0)
  x.scale(s * (o.flip ? -1 : 1), s)
  x.fillStyle = '#d9a828'
  x.beginPath()
  x.moveTo(-26, 0)
  x.quadraticCurveTo(-24, -26, 0, -28)
  x.quadraticCurveTo(24, -26, 26, 0)
  x.closePath()
  x.fill()
  x.fillStyle = '#b8871c'
  x.beginPath()
  x.moveTo(-34, 0)
  x.quadraticCurveTo(0, 10, 34, 0)
  x.quadraticCurveTo(0, 5, -34, 0)
  x.closePath()
  x.fill()
  x.fillStyle = '#f2d878'
  x.fillRect(-10, -24, 8, 12)
  x.fillStyle = '#8a6510'
  x.fillRect(-26, -3, 52, 4)
  x.restore()
}

// ============================== S1 props ==============================

// The golden toupee idol (also the sand-wig in sandstone colours, and the title's
// O-drop mini). A swept wig shell with shine ramps and a comb-groove crown.
export function toupee(x, cx, cy, s, o = {}) {
  const gold = o.sand
    ? { hi: '#e8d2a0', base: '#c9ad74', lo: '#9a7c46', edge: '#6e5228' }
    : { hi: '#ffe9a0', base: '#e8b23a', lo: '#b07d18', edge: '#6e4a08' }
  x.save()
  x.translate(cx, cy)
  x.rotate(o.rot ?? 0)
  x.scale(s * (o.flip ? -1 : 1), s)
  x.fillStyle = gold.base
  x.beginPath()
  x.moveTo(-34, 8)
  x.quadraticCurveTo(-40, -18, -16, -22)
  x.quadraticCurveTo(-4, -30, 10, -26)
  x.quadraticCurveTo(34, -24, 36, -4)
  x.quadraticCurveTo(38, 10, 24, 12)
  x.quadraticCurveTo(0, 18, -34, 8)
  x.closePath()
  x.fill()
  x.fillStyle = gold.lo
  x.beginPath()
  x.moveTo(-34, 8)
  x.quadraticCurveTo(-6, 16, 24, 12)
  x.quadraticCurveTo(30, 14, 22, 17)
  x.quadraticCurveTo(-4, 22, -34, 12)
  x.closePath()
  x.fill()
  x.fillStyle = gold.hi
  x.beginPath()
  x.moveTo(-18, -16)
  x.quadraticCurveTo(-4, -24, 8, -20)
  x.quadraticCurveTo(-4, -14, -18, -16)
  x.closePath()
  x.fill()
  x.strokeStyle = gold.edge
  x.lineWidth = 2.4
  for (const dx of [-22, -8, 6, 20]) {
    x.beginPath()
    x.moveTo(dx, -20 + Math.abs(dx) * 0.14)
    x.quadraticCurveTo(dx + 2, -6, dx - 2, 8 + Math.abs(dx) * 0.1)
    x.stroke()
  }
  x.restore()
}

// Carved stone-head pressure pedestal: a Remy-faced block head with heavy brow,
// blank socket eyes, faint smirk, cracks; o.iris 0..1 lights the sockets red,
// o.grain 0..1 trickles sand from the left ear.
export function stoneHead(x, cx, baseY, s, o = {}) {
  const w = 220 * s, h = 300 * s
  const top = baseY - h
  const x0 = cx - w / 2
  x.save()
  // head block: banded sandstone with rounded crown
  const g = x.createLinearGradient(x0, 0, x0 + w, 0)
  g.addColorStop(0, '#8a744f')
  g.addColorStop(0.45, '#a89062')
  g.addColorStop(1, '#6e5a3a')
  x.fillStyle = g
  x.beginPath()
  x.moveTo(x0, baseY)
  x.lineTo(x0, top + h * 0.3)
  x.quadraticCurveTo(x0 + w * 0.04, top + h * 0.04, cx, top)
  x.quadraticCurveTo(x0 + w * 0.96, top + h * 0.04, x0 + w, top + h * 0.3)
  x.lineTo(x0 + w, baseY)
  x.closePath()
  x.fill()
  // bands + mottling
  x.fillStyle = 'rgba(60,44,24,0.25)'
  x.fillRect(x0, top + h * 0.42, w, h * 0.035)
  x.fillRect(x0, top + h * 0.72, w, h * 0.03)
  const r = rng(o.seed ?? 42)
  for (let i = 0; i < 16; i++) {
    x.fillStyle = `rgba(60,44,24,${0.08 + r() * 0.1})`
    x.beginPath()
    x.ellipse(x0 + r() * w, top + r() * h, 6 + r() * 20, 3 + r() * 7, r(), 0, 7)
    x.fill()
  }
  // brow ledge
  x.fillStyle = '#c4ac7c'
  x.fillRect(x0 + w * 0.14, top + h * 0.24, w * 0.72, h * 0.05)
  x.fillStyle = 'rgba(60,44,24,0.4)'
  x.fillRect(x0 + w * 0.14, top + h * 0.29, w * 0.72, h * 0.02)
  // carved sockets (eyes)
  const ey = top + h * 0.36, ew = w * 0.14, eh = h * 0.062
  for (const side of [-1, 1]) {
    const exx = cx + side * w * 0.17
    x.fillStyle = '#241a0c'
    x.beginPath()
    x.ellipse(exx, ey, ew, eh, 0, 0, 7)
    x.fill()
    if (o.iris > 0) {
      const ig = x.createRadialGradient(exx, ey, 1, exx, ey, ew * 1.6)
      ig.addColorStop(0, `rgba(255,90,50,${0.9 * o.iris})`)
      ig.addColorStop(1, 'rgba(255,90,50,0)')
      x.fillStyle = ig
      x.fillRect(exx - ew * 2, ey - eh * 4, ew * 4, eh * 8)
    }
  }
  // nose + smirk + chin crack
  x.strokeStyle = '#5a4828'
  x.lineWidth = 4 * s
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(cx, ey)
  x.lineTo(cx - 2 * s, ey + h * 0.11)
  x.quadraticCurveTo(cx + 8 * s, ey + h * 0.13, cx + 10 * s, ey + h * 0.115)
  x.stroke()
  x.lineWidth = 3 * s
  x.beginPath()
  x.moveTo(cx - 14 * s, top + h * 0.56)
  x.quadraticCurveTo(cx - 4 * s, top + h * 0.585, cx + 4 * s, top + h * 0.555)
  x.stroke()
  x.lineWidth = 2 * s
  x.beginPath()
  x.moveTo(x0 + w * 0.82, top + h * 0.1)
  x.quadraticCurveTo(x0 + w * 0.86, top + h * 0.3, x0 + w * 0.8, top + h * 0.5)
  x.stroke()
  // ear with optional sand trickle (left ear, viewer side)
  const earY = top + h * 0.42
  x.fillStyle = '#7a643e'
  x.beginPath()
  x.ellipse(x0 + w * 0.06, earY, w * 0.05, h * 0.05, 0.2, 0, 7)
  x.fill()
  x.fillStyle = '#3c2c14'
  x.beginPath()
  x.ellipse(x0 + w * 0.06, earY, w * 0.024, h * 0.026, 0.2, 0, 7)
  x.fill()
  if (o.grain > 0) {
    const gy = earY + o.grain * h * 0.5
    x.fillStyle = `rgba(216,190,130,${0.9 * (1 - o.grain * 0.4)})`
    for (let i = 0; i < 5; i++) {
      const sp = ((o.grain * 90 + i * 37) % 30) / 30
      x.fillRect(x0 + w * 0.06 + (i - 2) * 2.2 + Math.sin(sp * 9) * 3, gy - sp * 26 * s, 2.6 * s, 2.6 * s)
    }
    // trickle streak
    x.strokeStyle = `rgba(200,170,110,${0.35 * o.grain})`
    x.lineWidth = 2.4 * s
    x.beginPath()
    x.moveTo(x0 + w * 0.06, earY)
    x.quadraticCurveTo(x0 + w * 0.04, earY + h * 0.2, x0 + w * 0.05, earY + h * 0.45)
    x.stroke()
  }
  x.restore()
}

// Torch sconce bracket (flame painted live by the film).
export function sconce(x, cx, cy, s) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  x.fillStyle = '#241a10'
  x.fillRect(-5, 0, 10, 46)
  x.fillStyle = '#3a2c1c'
  x.beginPath()
  x.moveTo(-16, 2)
  x.quadraticCurveTo(0, -14, 16, 2)
  x.quadraticCurveTo(0, 8, -16, 2)
  x.closePath()
  x.fill()
  x.fillStyle = '#1c1208'
  x.beginPath()
  x.ellipse(0, -4, 12, 7, 0, 0, 7)
  x.fill()
  x.restore()
}

// Wicker basket with rim weave + rope handles; o.shake jiggles it (spring feel).
export function basket(x, cx, baseY, s, o = {}) {
  x.save()
  x.translate(cx + (o.shake ? Math.sin(o.shake * 41) * 3 * s : 0), baseY)
  x.scale(s * (o.flip ? -1 : 1), s)
  const w = 74, h = 56
  x.fillStyle = '#a8834e'
  x.beginPath()
  x.moveTo(-w / 2, -h)
  x.quadraticCurveTo(-w / 2 - 6, -h * 0.4, -w / 2 + 8, 0)
  x.lineTo(w / 2 - 8, 0)
  x.quadraticCurveTo(w / 2 + 6, -h * 0.4, w / 2, -h)
  x.closePath()
  x.fill()
  x.strokeStyle = '#7a5c32'
  x.lineWidth = 3
  for (let i = 1; i < 4; i++) {
    x.beginPath()
    x.moveTo(-w / 2 + i * 1.4, -h + i * h * 0.3)
    x.quadraticCurveTo(0, -h + i * h * 0.3 + 5, w / 2 - i * 1.4, -h + i * h * 0.3)
    x.stroke()
  }
  for (let i = -2; i <= 2; i++) {
    x.beginPath()
    x.moveTo(i * w * 0.18, -h + 2)
    x.lineTo(i * w * 0.16 + 3, 0)
    x.stroke()
  }
  x.fillStyle = '#c9a468'
  x.beginPath()
  x.ellipse(0, -h, w / 2 + 4, 8, 0, 0, 7)
  x.fill()
  x.fillStyle = '#7a5c32'
  x.beginPath()
  x.ellipse(0, -h, w / 2 - 4, 5, 0, 0, 7)
  x.fill()
  x.restore()
}

// Torch (stick + wrap + flame); flame k 0..1 sizes the live fire.
export function torchProp(x, cx, cy, s, flame, t, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(o.rot ?? 0)
  x.scale(s, s)
  x.strokeStyle = '#6e5228'
  x.lineWidth = 8
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(0, 40)
  x.lineTo(0, -14)
  x.stroke()
  x.strokeStyle = '#3a2a18'
  x.lineWidth = 9
  for (let i = 0; i < 3; i++) {
    x.beginPath()
    x.moveTo(-5, -12 + i * 5)
    x.lineTo(5, -9 + i * 5)
    x.stroke()
  }
  if (flame > 0) {
    const fw = 14 * flame, fh = 34 * flame * (0.85 + 0.3 * Math.sin(t * 11 + (o.ph ?? 0)))
    const g = x.createLinearGradient(0, -10, 0, -10 - fh)
    g.addColorStop(0, 'rgba(255,150,40,0.95)')
    g.addColorStop(0.55, 'rgba(255,210,80,0.9)')
    g.addColorStop(1, 'rgba(255,246,200,0.15)')
    x.fillStyle = g
    x.beginPath()
    x.moveTo(-fw, -10)
    x.quadraticCurveTo(-fw * 0.5, -10 - fh * 0.55, Math.sin(t * 9 + (o.ph ?? 0)) * 4, -10 - fh)
    x.quadraticCurveTo(fw * 0.5, -10 - fh * 0.55, fw, -10)
    x.quadraticCurveTo(0, -2, -fw, -10)
    x.closePath()
    x.fill()
  }
  x.restore()
}

// Barber scissors (chrome + gold screw). len 1 = the big pit blades; o.pink makes
// the tiny safety pair with a bow. o.open splays the blades.
export function scissors(x, cx, cy, rot, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(s * (o.flip ? -1 : 1), s)
  const steel = o.pink ? '#e87a9a' : '#c2ccd8'
  const steelHi = o.pink ? '#f6b8ca' : '#e8f0f8'
  const grip = o.pink ? '#c9486e' : '#3a4450'
  const openA = (o.open ?? 0) * 0.5
  for (const side of [-1, 1]) {
    x.save()
    x.rotate(side * openA)
    // blade
    x.fillStyle = steel
    x.beginPath()
    x.moveTo(-3, -6)
    x.quadraticCurveTo(-4, -30, 2, -52)
    x.quadraticCurveTo(6, -50, 5, -28)
    x.quadraticCurveTo(5, -14, 4, -6)
    x.closePath()
    x.fill()
    x.strokeStyle = steelHi
    x.lineWidth = 1.6
    x.beginPath()
    x.moveTo(4, -48)
    x.quadraticCurveTo(5, -28, 4, -8)
    x.stroke()
    // handle loop
    x.strokeStyle = grip
    x.lineWidth = 5
    x.beginPath()
    x.ellipse(-1, 4, 7, 10, 0.3 * side, 0, 7)
    x.stroke()
    x.restore()
  }
  x.fillStyle = o.pink ? '#a83055' : '#e0a52e'
  x.beginPath()
  x.arc(0, -6, 3, 0, 7)
  x.fill()
  if (o.bow) {
    x.fillStyle = '#ff5a8a'
    for (const side of [-1, 1]) {
      x.beginPath()
      x.ellipse(side * 6, -12, 6, 4, side * 0.5, 0, 7)
      x.fill()
    }
    x.fillStyle = '#c9486e'
    x.beginPath()
    x.arc(0, -12, 2.6, 0, 7)
    x.fill()
  }
  x.restore()
}

// ============================== hero props ==============================

// Coiled bullwhip held / hung; uncoiled u 0..1 sends a wave down the line.
export function whip(x, cx, cy, ang, s, u = 0, t = 0) {
  x.save()
  x.translate(cx, cy)
  x.rotate(ang)
  x.scale(s, s)
  x.strokeStyle = '#8a6a34'
  x.lineWidth = 7
  x.lineCap = 'round'
  if (u <= 0.01) {
    for (let i = 0; i < 3; i++) {
      x.beginPath()
      x.ellipse(0, -i * 8, 14 - i * 2, 7, 0, 0, 7)
      x.stroke()
    }
  } else {
    x.lineWidth = 5
    x.beginPath()
    x.moveTo(0, 0)
    const L = 150 * u
    for (let i = 1; i <= 8; i++) {
      const d = (i / 8) * L
      x.lineTo(d, Math.sin(i * 1.2 - t * 14) * 7 * (i / 8))
    }
    x.stroke()
  }
  x.fillStyle = '#3a2a18'
  x.fillRect(-10, -4, 12, 8)
  x.restore()
}

// Fake mustache prop (the 3A disguise), tips off like a hat.
export function mustache(x, cx, cy, s, rot = 0) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(s, s)
  x.fillStyle = '#181210'
  for (const side of [-1, 1]) {
    x.beginPath()
    x.moveTo(0, 0)
    x.quadraticCurveTo(side * 8, -5, side * 16, 2)
    x.quadraticCurveTo(side * 8, 4, 0, 3)
    x.closePath()
    x.fill()
  }
  x.restore()
}

// Blowgun: long slender tube + mouth end; ang 0 = horizontal, aims +x.
export function blowgun(x, cx, cy, ang, s, loaded = false) {
  x.save()
  x.translate(cx, cy)
  x.rotate(ang)
  x.scale(s, s)
  x.strokeStyle = '#4a3620'
  x.lineWidth = 4
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(0, 0)
  x.lineTo(86, 0)
  x.stroke()
  x.strokeStyle = '#6e5228'
  x.lineWidth = 1.6
  x.beginPath()
  x.moveTo(4, -1)
  x.lineTo(82, -1)
  x.stroke()
  x.fillStyle = '#c9a468'
  x.fillRect(80, -3, 8, 6)
  if (loaded) {
    x.fillStyle = '#e8d2a0'
    x.beginPath()
    x.moveTo(92, 0)
    x.lineTo(102, -2)
    x.lineTo(102, 2)
    x.closePath()
    x.fill()
  }
  x.restore()
}

// Umbrella: furled cane, or snapped open with a taut canopy (o.open 0..1).
export function umbrella(x, cx, cy, ang, s, open, t, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(ang)
  x.scale(s * (o.flip ? -1 : 1), s)
  x.strokeStyle = '#3a2a18'
  x.lineWidth = 5
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(-6, 0)
  x.lineTo(64, 0)
  x.stroke()
  x.fillStyle = '#2a2f3a'
  x.beginPath()
  x.arc(-9, 0, 5, 0, 7)
  x.fill()
  if (open > 0.02) {
    const k = open
    x.fillStyle = o.col ?? '#26303e'
    x.beginPath()
    x.moveTo(14, 0)
    x.quadraticCurveTo(30 - 8 * k, -26 * k, 52 * k, -14 * k)
    x.quadraticCurveTo(58 * k, -6 * k, 54 * k, 2 * k)
    x.quadraticCurveTo(30 * k, 8 * k, 14, 4)
    x.closePath()
    x.fill()
    x.strokeStyle = 'rgba(200,215,235,0.4)'
    x.lineWidth = 2
    for (let i = 1; i < 3; i++) {
      x.beginPath()
      x.moveTo(14 + i * 2, 2)
      x.quadraticCurveTo(24 * k + i * 8 * k, -20 * k + i * 6 * k, 48 * k, -8 * k + i * 4 * k)
      x.stroke()
    }
    x.fillStyle = '#c9a45c'
    x.beginPath()
    x.moveTo(52 * k, -16 * k)
    x.lineTo(56 * k, -10 * k)
    x.lineTo(50 * k, -10 * k)
    x.closePath()
    x.fill()
  }
  void t
  x.restore()
}

// ============================== big set-piece painters ==============================

// The HAIRBALL boulder: a tumbling ball of seeded gray filaments — never a flat
// disc. Strands wrap the sphere (arcs whose radius/phase come from hash), flyaway
// wisps trail the motion, deep under-shade at the contact side.
export function hairball(x, cx, cy, r, rot, t, seed = 7) {
  x.save()
  x.translate(cx, cy)
  // under-shadow mass
  const ug = x.createRadialGradient(-r * 0.2, r * 0.25, r * 0.2, 0, 0, r * 1.1)
  ug.addColorStop(0, '#3c3c44')
  ug.addColorStop(0.7, '#2a2a31')
  ug.addColorStop(1, '#1b1b21')
  x.fillStyle = ug
  x.beginPath()
  x.arc(0, 0, r, 0, 7)
  x.fill()
  // wrapping filaments (rotate with the tumble) — dense, two passes
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < 40; i++) {
      const k = i + pass * 40
      const a0 = hash(seed * 31 + k * 7) * 6.283 + rot * (0.7 + hash(k * 13) * 0.6)
      const rr = r * (0.5 + hash(seed + k * 3) * 0.46)
      const span = 0.8 + hash(k * 29 + seed) * 1.2
      const lw = 2.6 + hash(k * 11) * 4
      const shade = hash(k * 17 + 5)
      x.strokeStyle = shade > 0.72 ? '#9a9aa6' : shade > 0.4 ? '#6e6e7a' : '#4a4a56'
      x.lineWidth = lw
      x.lineCap = 'round'
      x.beginPath()
      x.arc(Math.cos(a0 + span / 2) * rr * 0.18, Math.sin(a0 + span / 2) * rr * 0.18, rr, a0, a0 + span)
      x.stroke()
    }
  }
  // silhouette read: a few rim strands so the edge never looks like a clean circle
  x.strokeStyle = 'rgba(28,28,34,0.9)'
  x.lineWidth = 5
  for (let i = 0; i < 9; i++) {
    const a = hash(i * 53 + seed) * 6.283 + rot * 0.8
    x.beginPath()
    x.arc(0, 0, r * (0.96 + hash(i * 5) * 0.06), a, a + 0.5 + hash(i) * 0.4)
    x.stroke()
  }
  // flyaway wisps off the rim (trail side)
  for (let i = 0; i < 10; i++) {
    const a = hash(i * 37 + seed) * 6.283 + rot * 0.9 + 2.6
    const fr = r * (1.02 + hash(i * 5) * 0.22)
    const fx = Math.cos(a) * fr, fy = Math.sin(a) * fr
    x.strokeStyle = 'rgba(130,130,142,0.85)'
    x.lineWidth = 2.4
    x.beginPath()
    x.moveTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98)
    x.quadraticCurveTo(fx + Math.sin(t * 6 + i) * 6, fy - 10, fx + Math.cos(a + 1.2) * 16, fy + Math.sin(a) * 12)
    x.stroke()
  }
  // dust puffs kicked at the ground contact
  x.fillStyle = 'rgba(160,150,130,0.25)'
  for (let i = 0; i < 5; i++) {
    const ph = t * 3 + i * 1.3
    x.beginPath()
    x.arc(-r * 0.5 + Math.sin(ph) * r * 0.4, r * 0.8 + Math.cos(ph * 0.7) * 6, 8 + (ph % 1) * 14, 0, 7)
    x.fill()
  }
  x.restore()
}

// The ARK OF THE FLOW: gold chest, flow-glyph bands, two cherub-combs on the lid,
// ring poles. o.lid 0 shut..1 open, o.glow 0..1 inner pulse, o.ropes ties it down.
export function ark(x, cx, baseY, s, o = {}) {
  const lid = cl(o.lid ?? 0)
  x.save()
  x.translate(cx, baseY)
  x.scale(s * (o.flip ? -1 : 1), s)
  const w = 190, h = 104
  // lid (drawn first, hinges at the back edge)
  if (lid > 0.02) {
    x.save()
    x.translate(-w / 2, -h)
    x.rotate(-lid * 1.75)
    const lg = x.createLinearGradient(0, -26, 0, 4)
    lg.addColorStop(0, '#f2d878')
    lg.addColorStop(0.6, '#d9a83a')
    lg.addColorStop(1, '#a87c1c')
    x.fillStyle = lg
    x.beginPath()
    x.moveTo(0, 0)
    x.lineTo(w, 0)
    x.lineTo(w, -16)
    x.quadraticCurveTo(w / 2, -40, 0, -16)
    x.closePath()
    x.fill()
    x.fillStyle = '#8a6510'
    x.fillRect(6, -14, w - 12, 5)
    // cherub-combs: winged little combs facing each other
    for (const side of [-1, 1]) {
      const px = w / 2 + side * w * 0.26
      x.fillStyle = '#f6e2a0'
      x.fillRect(px - 12, -30, 24, 8)
      x.fillStyle = '#c9a441'
      for (let i = 0; i < 5; i++) x.fillRect(px - 10 + i * 5, -34, 3, 5)
      x.fillStyle = 'rgba(240,236,220,0.85)'
      x.beginPath()
      x.ellipse(px + side * 16, -28, 10, 5, side * 0.5, 0, 7)
      x.fill()
    }
    x.restore()
  }
  // inner glow spills when open
  if (lid > 0.05) {
    const ig = x.createRadialGradient(0, -h * 0.7, 4, 0, -h * 0.7, 90)
    ig.addColorStop(0, `rgba(255,238,170,${0.75 * lid * (0.7 + 0.3 * Math.sin((o.t ?? 0) * 3))})`)
    ig.addColorStop(1, 'rgba(255,238,170,0)')
    x.fillStyle = ig
    x.fillRect(-100, -h - 60, 200, h + 80)
  }
  // body: banded gold with flow glyphs (spiral-comb glyph rows)
  const bg = x.createLinearGradient(-w / 2, 0, w / 2, 0)
  bg.addColorStop(0, '#8a6510')
  bg.addColorStop(0.4, '#e0b044')
  bg.addColorStop(0.55, '#f2d878')
  bg.addColorStop(1, '#a87c1c')
  x.fillStyle = bg
  x.fillRect(-w / 2, -h, w, h)
  x.fillStyle = '#6e4e08'
  x.fillRect(-w / 2, -h + 14, w, 8)
  x.fillRect(-w / 2, -18, w, 8)
  x.strokeStyle = '#5a4006'
  x.lineWidth = 2
  for (let i = 0; i < 6; i++) {
    const gx = -w / 2 + 20 + i * 28
    x.beginPath()
    x.arc(gx, -h / 2 + 2, 7, 0.6, 5.2)
    x.stroke()
    x.beginPath()
    x.moveTo(gx + 7, -h / 2 - 5)
    x.lineTo(gx + 7, -h / 2 + 9)
    x.stroke()
  }
  // corner posts + gem
  x.fillStyle = '#c9a441'
  x.fillRect(-w / 2 - 6, -h - 6, 10, h + 8)
  x.fillRect(w / 2 - 4, -h - 6, 10, h + 8)
  x.fillStyle = '#ff5a8a'
  x.beginPath()
  x.arc(0, -h + 26, 6, 0, 7)
  x.fill()
  // lid front lip when shut
  if (lid <= 0.02) {
    const lg = x.createLinearGradient(0, -h - 30, 0, -h)
    lg.addColorStop(0, '#f2d878')
    lg.addColorStop(1, '#c9973a')
    x.fillStyle = lg
    x.beginPath()
    x.moveTo(-w / 2, -h)
    x.lineTo(w / 2, -h)
    x.lineTo(w / 2, -h - 14)
    x.quadraticCurveTo(0, -h - 38, -w / 2, -h - 14)
    x.closePath()
    x.fill()
    for (const side of [-1, 1]) {
      const px = side * w * 0.26
      x.fillStyle = '#f6e2a0'
      x.fillRect(px - 10, -h - 30, 20, 7)
      x.fillStyle = '#c9a441'
      for (let i = 0; i < 4; i++) x.fillRect(px - 8 + i * 5, -h - 34, 3, 5)
      x.fillStyle = 'rgba(240,236,220,0.8)'
      x.beginPath()
      x.ellipse(px + side * 14, -28 - h + 28, 9, 4, side * 0.5, 0, 7)
      x.fill()
    }
  }
  // rope lashing
  if (o.ropes) {
    x.strokeStyle = '#8a6f48'
    x.lineWidth = 5
    for (const rx of [-w * 0.28, w * 0.28]) {
      x.beginPath()
      x.moveTo(rx, -h - (lid <= 0.02 ? 34 : 8))
      x.lineTo(rx, 2)
      x.stroke()
    }
  }
  x.restore()
}

// Procedural galloping horse, facing +x. phase 0..1 cycles the legs; gallop 0..1
// blends walk->run extension. o.col body, o.drag slows the cycle.
export function horse(x, cx, baseY, s, phase, o = {}) {
  const col = o.col ?? '#6e4a2c'
  const dark = shadeHex(col, 0.62), lite = shadeHex(col, 1.3)
  const ext = 0.35 + 0.65 * (o.gallop ?? 1)
  x.save()
  x.translate(cx, baseY)
  x.scale(s * (o.flip ? -1 : 1), s)
  const bob = Math.abs(Math.sin(phase * Math.PI * 2)) * 6 * (o.gallop ?? 1)
  x.translate(0, -bob)
  // legs: 4, gallop pair phases
  const legAng = (ph) => Math.sin(phase * Math.PI * 2 + ph) * 0.85 * ext
  const leg = (px, ph, back) => {
    x.strokeStyle = back ? dark : col
    x.lineWidth = 9
    x.lineCap = 'round'
    const a = legAng(ph)
    const kx = px + Math.sin(a) * 30, ky = -62 + Math.cos(a) * 8
    const fx2 = kx + Math.sin(a * 1.6 + (a > 0 ? 0.5 : -0.5)) * 26, fy2 = 0 - Math.max(0, Math.sin(phase * 6.283 + ph)) * 18 * ext
    x.beginPath()
    x.moveTo(px, -66)
    x.lineTo(kx, ky)
    x.lineTo(fx2, fy2)
    x.stroke()
    x.fillStyle = '#2c2018'
    x.fillRect(fx2 - 5, fy2 - 5, 12, 6)
  }
  leg(-34, 2.1, true)
  leg(30, 4.2, true)
  // body
  x.fillStyle = col
  x.beginPath()
  x.ellipse(-2, -86, 62, 26, -0.04, 0, 7)
  x.fill()
  x.fillStyle = lite
  x.beginPath()
  x.ellipse(-10, -94, 44, 12, -0.08, 0, 7)
  x.fill()
  // neck + head
  x.fillStyle = col
  x.beginPath()
  x.moveTo(38, -96)
  x.quadraticCurveTo(66, -128, 74, -142)
  x.quadraticCurveTo(88, -138, 92, -128)
  x.quadraticCurveTo(72, -110, 52, -84)
  x.closePath()
  x.fill()
  x.beginPath()
  x.ellipse(84, -134, 17, 10, 0.35, 0, 7)
  x.fill()
  x.fillStyle = dark
  x.beginPath()
  x.ellipse(97, -129, 5, 4, 0.4, 0, 7)
  x.fill()
  x.fillStyle = '#2c2018'
  x.beginPath()
  x.arc(88, -137, 2.2, 0, 7)
  x.fill()
  // mane
  x.strokeStyle = dark
  x.lineWidth = 6
  x.lineCap = 'round'
  for (let i = 0; i < 4; i++) {
    x.beginPath()
    x.moveTo(52 + i * 8, -128 - i * 4)
    x.quadraticCurveTo(42 + i * 8, -116 - i * 2, 36 + i * 8, -104)
    x.stroke()
  }
  // tail
  x.strokeStyle = dark
  x.lineWidth = 7
  x.beginPath()
  x.moveTo(-60, -92)
  x.quadraticCurveTo(-84, -80 + Math.sin(phase * 12.57) * 6, -92, -52 + Math.sin(phase * 12.57) * 8)
  x.stroke()
  leg(-40, 0, false)
  leg(24, 2.1, false)
  x.restore()
  // saddle anchor (caller places the rider with drawRemy here)
  return { saddleX: cx + (o.flip ? -14 : 14) * s, saddleY: baseY - 118 * s - bob }
}

// Ghost comb (the Flow's spiraling servants / the great grooming comb).
export function ghostComb(x, cx, cy, rot, s, alpha, o = {}) {
  if (alpha <= 0.01) return
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(s, s)
  x.globalAlpha *= alpha
  const col = o.col ?? '#ffe9ad'
  x.strokeStyle = col
  x.fillStyle = col
  x.lineWidth = 5
  x.beginPath()
  if (o.bent) {
    x.moveTo(-34, 0)
    x.quadraticCurveTo(0, -12, 34, -2)
    x.lineTo(34, 7)
    x.quadraticCurveTo(0, -3, -34, 9)
    x.closePath()
    x.fill()
  } else {
    x.fillRect(-34, -4, 68, 12)
  }
  x.lineWidth = 4
  for (let i = 0; i < 8; i++) {
    const tx = -30 + i * 8.4
    x.beginPath()
    x.moveTo(tx, 8)
    x.lineTo(tx, 22)
    x.stroke()
  }
  if (o.glow) {
    x.globalAlpha *= 0.5
    x.shadowColor = col
    x.shadowBlur = 22
    x.fillRect(-34, -4, 68, 12)
  }
  x.restore()
}

// Gleaming chrome skull (Baldouq's payoff). o.mustache keeps the silhouette until
// it sloughs; o.landed seats the Panama.
export function chromeSkull(x, cx, cy, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  // cranium
  const g = x.createLinearGradient(-40, -50, 40, 30)
  g.addColorStop(0, '#f2f5fa')
  g.addColorStop(0.4, '#c2cbd8')
  g.addColorStop(0.75, '#8a94a4')
  g.addColorStop(1, '#5a6272')
  x.fillStyle = g
  x.beginPath()
  x.moveTo(-38, 8)
  x.quadraticCurveTo(-42, -44, 0, -50)
  x.quadraticCurveTo(42, -44, 38, 8)
  x.quadraticCurveTo(30, 26, 0, 28)
  x.quadraticCurveTo(-30, 26, -38, 8)
  x.closePath()
  x.fill()
  // eye hollows (dark with moon catchlights)
  for (const side of [-1, 1]) {
    x.fillStyle = '#1c222e'
    x.beginPath()
    x.ellipse(side * 16, -12, 12, 14, side * 0.1, 0, 7)
    x.fill()
    x.fillStyle = 'rgba(220,235,250,0.5)'
    x.beginPath()
    x.arc(side * 16 - 4, -17, 3.4, 0, 7)
    x.fill()
  }
  // nose wedge
  x.fillStyle = '#1c222e'
  x.beginPath()
  x.moveTo(0, 0)
  x.lineTo(-6, 12)
  x.lineTo(6, 12)
  x.closePath()
  x.fill()
  // teeth row
  x.fillStyle = '#39424f'
  x.fillRect(-20, 18, 40, 10)
  x.strokeStyle = '#12161e'
  x.lineWidth = 2
  for (let i = 1; i < 6; i++) {
    x.beginPath()
    x.moveTo(-20 + i * 6.6, 18)
    x.lineTo(-20 + i * 6.6, 28)
    x.stroke()
  }
  // moon rim on the crown
  x.strokeStyle = 'rgba(230,242,255,0.75)'
  x.lineWidth = 3
  x.beginPath()
  x.arc(0, -12, 44, -2.5, -0.9)
  x.stroke()
  // mustache silhouette while it clings
  if (o.mustache > 0) {
    x.globalAlpha = cl(o.mustache)
    x.fillStyle = '#181210'
    for (const side of [-1, 1]) {
      x.beginPath()
      x.moveTo(0, 14)
      x.quadraticCurveTo(side * 10, 8, side * 21, 16)
      x.quadraticCurveTo(side * 10, 19, 0, 18)
      x.closePath()
      x.fill()
    }
    x.globalAlpha = 1
  }
  x.restore()
}

// ============================== bakes ==============================

// S1 the temple corridor (world 3200 wide): warning-wall glyphs, torch niches,
// cobwebs, dandruff tiles, the pedestal alcove, the sealed door. TILES + CORR are
// exported so film.js can pop tiles and stage the alcove.
export const CORR = { W: 3200, alcoveX: 1500, doorX: 2960, floor: 940 }
export const TILES = Array.from({ length: 12 }, (_, i) => {
  const x = 1720 + i * 92 + (hash(i * 31) - 0.5) * 30
  const y = 500 + hash(i * 17) * 170
  return { x, y, w: 46 + hash(i * 7) * 14, h: 40 + hash(i * 11) * 12, seed: i }
})
export function templeBake() {
  const w = CORR.W
  const c = canvas(w + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(1936)
  x.translate(OS, OS)
  // deep dark base
  const g = x.createLinearGradient(0, -OS, 0, H)
  g.addColorStop(0, '#070608')
  g.addColorStop(0.35, '#14100e')
  g.addColorStop(0.75, '#1c1610')
  g.addColorStop(1, '#100c08')
  x.fillStyle = g
  x.fillRect(-OS, -OS, w + OS * 2, H + OS * 2)
  // back wall mottling
  for (let i = 0; i < 130; i++) {
    x.fillStyle = `rgba(90,74,50,${0.04 + r() * 0.08})`
    x.beginPath()
    x.ellipse(r() * w, 150 + r() * 750, 30 + r() * 130, 10 + r() * 40, r(), 0, 7)
    x.fill()
  }
  // block courses
  for (let by = 200; by < 940; by += 118) {
    x.fillStyle = 'rgba(0,0,0,0.35)'
    x.fillRect(-OS, by, w + OS * 2, 5)
    for (let bx = ((by / 118) | 0) % 2 ? -60 : 0; bx < w + OS; bx += 180) {
      x.fillStyle = 'rgba(0,0,0,0.28)'
      x.fillRect(bx, by, 4, 118)
    }
  }
  // ceiling shadow
  const cg = x.createLinearGradient(0, -OS, 0, 260)
  cg.addColorStop(0, 'rgba(0,0,0,0.95)')
  cg.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = cg
  x.fillRect(-OS, -OS, w + OS * 2, 260 + OS)
  // carved glyph frieze rows (little toupees)
  for (let gx = 60; gx < w; gx += 130) {
    const gy = 320 + ((gx / 130) | 0) % 2 * 46
    x.fillStyle = 'rgba(140,116,74,0.5)'
    x.beginPath()
    x.ellipse(gx, gy, 17, 9, 0.1, 0, 7)
    x.fill()
    x.fillStyle = 'rgba(30,22,12,0.55)'
    x.beginPath()
    x.ellipse(gx, gy + 3, 15, 7, 0.1, 0, 7)
    x.fill()
  }
  // THE WARNING GLYPH: big toupee with an X through it (the 1A plant)
  const wx = 560, wy = 430
  x.fillStyle = 'rgba(150,124,78,0.65)'
  x.beginPath()
  x.ellipse(wx, wy, 62, 34, 0.08, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(28,20,10,0.7)'
  x.beginPath()
  x.ellipse(wx, wy + 5, 54, 27, 0.08, 0, 7)
  x.fill()
  x.strokeStyle = 'rgba(190,60,50,0.8)'
  x.lineWidth = 9
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(wx - 52, wy - 34)
  x.lineTo(wx + 52, wy + 38)
  x.moveTo(wx + 52, wy - 34)
  x.lineTo(wx - 52, wy + 38)
  x.stroke()
  x.fillStyle = 'rgba(120,96,58,0.4)'
  x.font = `700 26px "JetBrains Mono"`
  x.textAlign = 'center'
  x.fillText('TURN BACK', wx, wy + 84)
  x.textAlign = 'left'
  // dandruff tiles: protruding pale squares on the wall band
  for (const tl of TILES) {
    x.fillStyle = 'rgba(0,0,0,0.4)'
    x.fillRect(tl.x - 3, tl.y - 3, tl.w + 6, tl.h + 6)
    const tg = x.createLinearGradient(tl.x, tl.y, tl.x + tl.w, tl.y + tl.h)
    tg.addColorStop(0, '#cfc4a8')
    tg.addColorStop(0.6, '#a89a78')
    tg.addColorStop(1, '#7c704f')
    x.fillStyle = tg
    x.fillRect(tl.x, tl.y, tl.w, tl.h)
    x.fillStyle = 'rgba(255,246,220,0.3)'
    x.fillRect(tl.x, tl.y, tl.w, 4)
  }
  // torch niches
  for (const nx of [300, 900, 2100, 2700]) {
    x.fillStyle = '#0c0a08'
    x.beginPath()
    x.ellipse(nx, 380, 42, 66, 0, 0, 7)
    x.fill()
    x.strokeStyle = '#3a2f1e'
    x.lineWidth = 6
    x.beginPath()
    x.ellipse(nx, 380, 42, 66, 0, 0, 7)
    x.stroke()
    sconce(x, nx, 420, 1.4)
  }
  // cobwebs: corner fans + strands
  const web = (wxp, wyp, s2, seed) => {
    const wr = rng(seed)
    x.strokeStyle = 'rgba(210,205,190,0.28)'
    for (let i = 0; i < 7; i++) {
      const a = wr() * 1.4 + 0.2
      x.lineWidth = 1.6
      x.beginPath()
      x.moveTo(wxp, wyp)
      x.quadraticCurveTo(wxp + Math.cos(a) * 90 * s2 * 0.5, wyp + Math.sin(a) * 90 * s2 * 0.6, wxp + Math.cos(a) * 150 * s2, wyp + Math.sin(a) * 150 * s2)
      x.stroke()
    }
    for (let rr2 = 30; rr2 < 150 * s2; rr2 += 26) {
      x.beginPath()
      for (let i = 0; i <= 6; i++) {
        const a = 0.2 + (i / 6) * 1.4
        const px = wxp + Math.cos(a) * rr2 * (0.85 + wr() * 0.3)
        const py = wyp + Math.sin(a) * rr2 * (0.85 + wr() * 0.3)
        i === 0 ? x.moveTo(px, py) : x.lineTo(px, py)
      }
      x.stroke()
    }
  }
  web(180, 170, 1, 4)
  web(1240, 150, 0.8, 9)
  web(1880, 160, 1.1, 14)
  web(2560, 150, 0.9, 21)
  web(3100, 180, 1.2, 27)
  // pedestal alcove: arch + dais steps + column
  const ax = CORR.alcoveX
  x.fillStyle = '#0b0906'
  x.beginPath()
  x.moveTo(ax - 190, 940)
  x.lineTo(ax - 190, 430)
  x.quadraticCurveTo(ax, 260, ax + 190, 430)
  x.lineTo(ax + 190, 940)
  x.closePath()
  x.fill()
  x.strokeStyle = '#4a3c24'
  x.lineWidth = 14
  x.beginPath()
  x.moveTo(ax - 196, 940)
  x.lineTo(ax - 196, 430)
  x.quadraticCurveTo(ax, 252, ax + 196, 430)
  x.lineTo(ax + 196, 940)
  x.stroke()
  for (let i = 0; i < 3; i++) {
    x.fillStyle = ['#4c3e26', '#5c4c2e', '#6e5a38'][i]
    x.fillRect(ax - 150 + i * 18, 880 - i * 20, 300 - i * 36, 24)
  }
  // pedestal column (the head painter stands on it)
  const pg = x.createLinearGradient(ax - 46, 0, ax + 46, 0)
  pg.addColorStop(0, '#5c4a2c')
  pg.addColorStop(0.5, '#7c6640')
  pg.addColorStop(1, '#4a3a20')
  x.fillStyle = pg
  x.fillRect(ax - 46, 640, 92, 200)
  x.fillStyle = '#8a744c'
  x.fillRect(ax - 62, 620, 124, 26)
  x.fillRect(ax - 56, 826, 112, 18)
  // sealed stone door at the far end
  const dx = CORR.doorX
  const dg = x.createLinearGradient(dx - 130, 0, dx + 130, 0)
  dg.addColorStop(0, '#3c3222')
  dg.addColorStop(0.5, '#584a30')
  dg.addColorStop(1, '#2e2618')
  x.fillStyle = dg
  x.fillRect(dx - 130, 330, 260, 610)
  x.strokeStyle = '#1c160c'
  x.lineWidth = 6
  x.beginPath()
  x.moveTo(dx, 340)
  x.lineTo(dx, 930)
  x.stroke()
  x.fillStyle = 'rgba(150,124,78,0.5)'
  x.beginPath()
  x.ellipse(dx, 430, 34, 44, 0, 0, 7)
  x.fill()
  // floor: slabs + torch pools painted live
  const fg = x.createLinearGradient(0, 940, 0, H + OS)
  fg.addColorStop(0, '#3a3020')
  fg.addColorStop(0.4, '#2a2216')
  fg.addColorStop(1, '#171208')
  x.fillStyle = fg
  x.fillRect(-OS, 940, w + OS * 2, H + OS - 940)
  x.fillStyle = 'rgba(0,0,0,0.4)'
  for (let px = -80; px < w + OS; px += 150) x.fillRect(px, 944, 4, H + OS - 944)
  x.fillStyle = 'rgba(214,200,160,0.07)'
  x.fillRect(-OS, 940, w + OS * 2, 4)
  for (let i = 0; i < 60; i++) {
    x.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.18})`
    x.beginPath()
    x.ellipse(r() * w, 950 + r() * 130, 40 + r() * 120, 8 + r() * 14, 0, 0, 7)
    x.fill()
  }
  return c
}

// S1E + title: the daylight temple-exterior ridge (doorway at left, sandstone
// facade, sun, mesas, scrub). World floor 940.
export function ridgeBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(77)
  x.translate(OS, OS)
  // solid base first: no transparent gaps between rock dips and the ground
  x.fillStyle = '#c9a878'
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // sky
  const g = x.createLinearGradient(0, -OS, 0, 760)
  g.addColorStop(0, '#5ab4e8')
  g.addColorStop(0.55, '#9ed4f2')
  g.addColorStop(0.85, '#e8e2c0')
  g.addColorStop(1, '#f2e4bc')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, 760 + OS)
  // sun disc + halo
  const halo = x.createRadialGradient(1430, 240, 40, 1430, 240, 480)
  halo.addColorStop(0, 'rgba(255,244,200,0.85)')
  halo.addColorStop(1, 'rgba(255,244,200,0)')
  x.fillStyle = halo
  x.fillRect(950, -240, 960, 960)
  x.fillStyle = '#fff6d0'
  x.beginPath()
  x.arc(1430, 240, 74, 0, 7)
  x.fill()
  // clouds
  for (let i = 0; i < 6; i++) {
    const cxp = r() * (W + OS * 2) - OS, cyp = 120 + r() * 260
    x.fillStyle = `rgba(255,255,255,${0.5 + r() * 0.3})`
    x.beginPath()
    x.ellipse(cxp, cyp, 90 + r() * 130, 18 + r() * 16, 0, 0, 7)
    x.fill()
  }
  // far mesas
  x.fillStyle = '#c9a878'
  for (const [mx, mw, mh] of [[250, 340, 130], [860, 260, 100], [1420, 380, 150], [1900, 300, 120]]) {
    x.beginPath()
    x.moveTo(mx - mw / 2, 730)
    x.lineTo(mx - mw / 2 + 30, 730 - mh)
    x.lineTo(mx + mw / 2 - 30, 730 - mh)
    x.lineTo(mx + mw / 2, 730)
    x.closePath()
    x.fill()
    x.fillStyle = 'rgba(120,90,50,0.35)'
    x.fillRect(mx - mw / 2 + 30, 730 - mh + 18, mw - 60, 10)
    x.fillStyle = '#c9a878'
  }
  // the temple facade (left): sandstone block, dark doorway, steps
  const fg = x.createLinearGradient(60, 0, 460, 0)
  fg.addColorStop(0, '#d9b478')
  fg.addColorStop(0.7, '#c49a5c')
  fg.addColorStop(1, '#a87c42')
  x.fillStyle = fg
  x.beginPath()
  x.moveTo(-OS, 940)
  x.lineTo(-OS, 380)
  x.quadraticCurveTo(140, 300, 420, 380)
  x.lineTo(470, 940)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(120,90,50,0.3)'
  for (let by = 420; by < 900; by += 84) x.fillRect(0, by, 440, 5)
  // doorway (the burst-out point)
  x.fillStyle = '#1c1208'
  x.beginPath()
  x.moveTo(150, 940)
  x.lineTo(150, 660)
  x.quadraticCurveTo(215, 590, 280, 660)
  x.lineTo(280, 940)
  x.closePath()
  x.fill()
  x.strokeStyle = '#7c5c2c'
  x.lineWidth = 12
  x.beginPath()
  x.moveTo(144, 940)
  x.lineTo(144, 656)
  x.quadraticCurveTo(215, 580, 286, 656)
  x.lineTo(286, 940)
  x.stroke()
  // carved toupee lintel
  x.fillStyle = '#8a6530'
  x.beginPath()
  x.ellipse(215, 612, 40, 20, 0.08, 0, 7)
  x.fill()
  // steps
  for (let i = 0; i < 2; i++) {
    x.fillStyle = ['#b89050', '#a87c42'][i]
    x.fillRect(120 - i * 20, 928 - i * 0, 210 + i * 40, 14 + i * 8)
  }
  // ridge rocks + scrub across the mid ground
  x.fillStyle = '#b8905c'
  x.beginPath()
  x.moveTo(470, 940)
  x.quadraticCurveTo(600, 700, 760, 800)
  x.quadraticCurveTo(900, 870, 1080, 780)
  x.quadraticCurveTo(1300, 690, 1560, 820)
  x.quadraticCurveTo(1750, 900, W + OS, 830)
  x.lineTo(W + OS, 940)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(120,84,40,0.35)'
  x.beginPath()
  x.moveTo(470, 940)
  x.quadraticCurveTo(600, 716, 760, 816)
  x.lineTo(760, 940)
  x.closePath()
  x.fill()
  // sand ground
  const sg = x.createLinearGradient(0, 900, 0, H + OS)
  sg.addColorStop(0, '#e0c48c')
  sg.addColorStop(0.5, '#d0b074')
  sg.addColorStop(1, '#b08c50')
  x.fillStyle = sg
  x.fillRect(-OS, 906, W + OS * 2, H + OS - 906)
  x.fillStyle = 'rgba(120,90,40,0.25)'
  for (let i = 0; i < 40; i++) {
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, 920 + r() * 150, 30 + r() * 100, 5 + r() * 10, 0, 0, 7)
    x.fill()
  }
  // scrub bushes
  for (const [bx2, by2, s2] of [[620, 930, 1], [1180, 950, 1.3], [1690, 924, 0.9], [940, 918, 0.7]]) {
    x.fillStyle = '#7a7434'
    for (let i = 0; i < 5; i++) {
      x.beginPath()
      x.ellipse(bx2 + (hash(i * 9) - 0.5) * 30 * s2, by2 - 6 * s2 - hash(i * 3) * 10 * s2, 14 * s2, 9 * s2, 0, 0, 7)
      x.fill()
    }
  }
  return c
}

// S2A the lecture hall: panelled wall, chalkboard with hairglyphs + scalp-X
// diagram (C3 chalk drawn live), lectern, desk rows.
export function hallBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(42)
  x.translate(OS, OS)
  // wall: warm plaster + wainscot
  const g = x.createLinearGradient(0, -OS, 0, 900)
  g.addColorStop(0, '#4a3c2c')
  g.addColorStop(0.6, '#5c4c38')
  g.addColorStop(1, '#3a2e20')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, 900 + OS)
  for (let i = 0; i < 80; i++) {
    x.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, r() * 800, 40 + r() * 120, 14 + r() * 30, r(), 0, 7)
    x.fill()
  }
  // wainscot
  x.fillStyle = '#2c2114'
  x.fillRect(-OS, 640, W + OS * 2, 260)
  x.fillStyle = '#443321'
  x.fillRect(-OS, 640, W + OS * 2, 18)
  for (let px = -100; px < W + OS; px += 96) {
    x.fillStyle = 'rgba(0,0,0,0.3)'
    x.fillRect(px, 658, 5, 242)
  }
  // chalkboard (right of centre)
  const bx = 880, by = 210, bw = 700, bh = 420
  x.fillStyle = '#54401f'
  x.fillRect(bx - 22, by - 22, bw + 44, bh + 44)
  const bg = x.createLinearGradient(bx, by, bx + bw, by + bh)
  bg.addColorStop(0, '#2c3a34')
  bg.addColorStop(0.5, '#22302a')
  bg.addColorStop(1, '#1c2823')
  x.fillStyle = bg
  x.fillRect(bx, by, bw, bh)
  // chalk ghost-dust
  for (let i = 0; i < 60; i++) {
    x.fillStyle = `rgba(226,232,224,${0.03 + r() * 0.05})`
    x.fillRect(bx + r() * bw, by + r() * bh, 2 + r() * 4, 2)
  }
  // hairglyph chalk scribbles (left half of the board)
  x.strokeStyle = 'rgba(230,236,228,0.65)'
  x.lineWidth = 3
  x.lineCap = 'round'
  for (let i = 0; i < 5; i++) {
    const gx = bx + 50 + (i % 3) * 130, gy = by + 70 + ((i / 3) | 0) * 110
    x.beginPath()
    x.ellipse(gx, gy, 26, 15, 0.1, 0, 7)
    x.stroke()
    for (let k = 0; k < 4; k++) {
      x.beginPath()
      x.moveTo(gx - 18 + k * 12, gy + 8)
      x.quadraticCurveTo(gx - 16 + k * 12, gy - 12 - hash(i * 7 + k) * 12, gx - 14 + k * 12, gy - 20 - hash(i * 3 + k) * 14)
      x.stroke()
    }
  }
  // scalp diagram: bald head outline + the big red X
  const hx = bx + 470, hy = by + 200
  x.strokeStyle = 'rgba(230,236,228,0.8)'
  x.lineWidth = 4
  x.beginPath()
  x.ellipse(hx, hy, 78, 92, 0, 0, 7)
  x.stroke()
  x.beginPath()
  x.moveTo(hx - 30, hy + 80)
  x.quadraticCurveTo(hx, hy + 96, hx + 30, hy + 80)
  x.stroke()
  // crossed-out crown zone
  x.strokeStyle = 'rgba(226,120,90,0.9)'
  x.lineWidth = 7
  x.beginPath()
  x.moveTo(hx - 48, hy - 72)
  x.lineTo(hx + 48, hy + 6)
  x.moveTo(hx + 48, hy - 72)
  x.lineTo(hx - 48, hy + 6)
  x.stroke()
  x.strokeStyle = 'rgba(230,236,228,0.5)'
  x.lineWidth = 2
  for (let i = 0; i < 7; i++) {
    const a = -0.4 - i * 0.32
    x.beginPath()
    x.moveTo(hx + Math.cos(a) * 30, hy - 34 + Math.sin(a) * 20)
    x.lineTo(hx + Math.cos(a) * 52, hy - 46 + Math.sin(a) * 30)
    x.stroke()
  }
  // lectern (screen-left)
  const lx = 420
  const lg = x.createLinearGradient(lx - 70, 0, lx + 70, 0)
  lg.addColorStop(0, '#3a2a16')
  lg.addColorStop(0.5, '#54401f')
  lg.addColorStop(1, '#2c1e10')
  x.fillStyle = lg
  x.beginPath()
  x.moveTo(lx - 80, 700)
  x.lineTo(lx + 80, 700)
  x.lineTo(lx + 50, 900)
  x.lineTo(lx - 50, 900)
  x.closePath()
  x.fill()
  x.fillStyle = '#6e5432'
  x.beginPath()
  x.ellipse(lx, 700, 84, 20, 0, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(255,236,190,0.16)'
  x.beginPath()
  x.ellipse(lx, 698, 66, 13, 0, 0, 7)
  x.fill()
  // desk rows (foreground bottoms)
  for (const [dx, dy, dw] of [[140, 880, 380], [980, 900, 480], [1560, 872, 340]]) {
    const dg = x.createLinearGradient(0, dy - 40, 0, dy + 60)
    dg.addColorStop(0, '#54401f')
    dg.addColorStop(1, '#33240f')
    x.fillStyle = dg
    x.fillRect(dx, dy - 26, dw, 46)
    x.fillStyle = '#6e5432'
    x.fillRect(dx - 10, dy - 34, dw + 20, 12)
    x.fillStyle = '#2c2014'
    x.fillRect(dx + 20, dy + 20, 26, 80)
    x.fillRect(dx + dw - 46, dy + 20, 26, 80)
  }
  // framed portrait + wall clock garnish
  x.fillStyle = '#3a2c1a'
  x.fillRect(120, 220, 130, 170)
  x.fillStyle = '#c9b088'
  x.fillRect(132, 232, 106, 146)
  x.fillStyle = '#7a5c3c'
  x.beginPath()
  x.arc(185, 300, 34, 0, 7)
  x.fill()
  x.fillStyle = '#c9b088'
  x.fillRect(170, 330, 30, 44)
  x.strokeStyle = '#3a2c1a'
  x.lineWidth = 8
  x.beginPath()
  x.arc(640, 170, 52, 0, 7)
  x.stroke()
  x.fillStyle = '#e2d8bc'
  x.beginPath()
  x.arc(640, 170, 46, 0, 7)
  x.fill()
  x.strokeStyle = '#3a2c1a'
  x.lineWidth = 5
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(640, 170)
  x.lineTo(640, 136)
  x.moveTo(640, 170)
  x.lineTo(664, 180)
  x.stroke()
  return c
}

// S2B the legend frieze: three bas-relief stone panels. P3's lid is live so it
// can slam (film drives lidAt for panel 3).
export function friezeBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(9)
  x.translate(OS, OS)
  // temple wall
  const g = x.createLinearGradient(0, -OS, 0, H)
  g.addColorStop(0, '#4a3c28')
  g.addColorStop(0.6, '#5a4a32')
  g.addColorStop(1, '#33281a')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  for (let i = 0; i < 70; i++) {
    x.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.09})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, r() * H, 50 + r() * 140, 16 + r() * 30, r(), 0, 7)
    x.fill()
  }
  const panel = (px, py, pw, ph, draw) => {
    x.fillStyle = '#84704a'
    x.fillRect(px - 18, py - 18, pw + 36, ph + 36)
    const pg = x.createLinearGradient(px, py, px, py + ph)
    pg.addColorStop(0, '#b8a274')
    pg.addColorStop(1, '#8a744c')
    x.fillStyle = pg
    x.fillRect(px, py, pw, ph)
    x.strokeStyle = 'rgba(60,44,24,0.6)'
    x.lineWidth = 4
    x.strokeRect(px + 10, py + 10, pw - 20, ph - 20)
    for (let i = 0; i < 26; i++) {
      x.fillStyle = `rgba(60,44,24,${0.06 + r() * 0.08})`
      x.beginPath()
      x.ellipse(px + r() * pw, py + r() * ph, 16 + r() * 50, 6 + r() * 16, r(), 0, 7)
      x.fill()
    }
    draw(px, py, pw, ph)
  }
  // relief painter: chunky carved shapes = dark inset + light crown edge
  const relief = (fn) => {
    x.save()
    fn()
    x.restore()
  }
  const rel = (fn) => {
    x.save()
    x.translate(2.5, 3.5)
    x.fillStyle = 'rgba(50,36,18,0.55)'
    fn()
    x.restore()
    x.save()
    x.translate(-1.5, -2)
    x.fillStyle = '#d2bd8c'
    fn()
    x.restore()
    x.fillStyle = '#a8905e'
    fn()
  }
  // P1: giant comb descending on a shaggy globe
  panel(200, 170, 460, 700, (px, py, pw, ph) => {
    relief(() => rel(() => {
      // globe with hair spikes
      x.beginPath()
      x.arc(px + pw / 2, py + ph * 0.68, 130, 0, 7)
      x.fill()
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * 6.28
        x.beginPath()
        x.ellipse(px + pw / 2 + Math.cos(a) * 130, py + ph * 0.68 + Math.sin(a) * 130, 22, 10, a, 0, 7)
        x.fill()
      }
      // the comb
      x.fillRect(px + pw / 2 - 120, py + 90, 240, 36)
      for (let i = 0; i < 9; i++) x.fillRect(px + pw / 2 - 112 + i * 27, py + 126, 14, 60)
    }))
  })
  // P2: robed hairy figures carry the chest
  panel(730, 170, 460, 700, (px, py, pw, ph) => {
    relief(() => rel(() => {
      // chest on poles
      x.fillRect(px + 120, py + 300, 220, 110)
      x.fillRect(px + 90, py + 290, 20, 130)
      x.fillRect(px + 350, py + 290, 20, 130)
      // four bearers
      for (let i = 0; i < 4; i++) {
        const fx = px + 80 + i * 105
        x.beginPath()
        x.ellipse(fx, py + 480, 34, 60, 0, 0, 7)
        x.fill()
        x.beginPath()
        x.arc(fx, py + 396, 26, 0, 7)
        x.fill()
        // flowing manes
        for (let k = 0; k < 3; k++) {
          x.beginPath()
          x.ellipse(fx - 20 + k * 20, py + 380, 10, 30, 0.3 - k * 0.3, 0, 7)
          x.fill()
        }
        // pole arms
        x.fillRect(fx - 50, py + 420, 100, 12)
      }
    }))
  })
  // P3: the lid slamming (dust + light gap) — lid drawn live by film
  panel(1260, 170, 460, 700, (px, py, pw, ph) => {
    relief(() => rel(() => {
      x.fillRect(px + 110, py + 330, 240, 130)
      // radiating dread lines above the lid
      for (let i = 0; i < 7; i++) {
        const a = -2.4 + i * 0.42
        x.save()
        x.translate(px + pw / 2, py + 320)
        x.rotate(a)
        x.fillRect(-6, -190, 12, 80)
        x.restore()
      }
    }))
  })
  // floor strip
  x.fillStyle = '#3a2e1c'
  x.fillRect(-OS, 920, W + OS * 2, H + OS - 920)
  return c
}

// S2C the sepia map: parchment, hatched seas, continent + island, compass rose,
// THE DANDRUFF SEA label, route + markers exported for the live contrail.
export const MAP_ROUTE = [
  [-80, 260], [140, 320], [320, 372], [480, 396], [640, 430], [780, 452],
  [900, 430], [1030, 452], [1170, 486], [1330, 470], [1480, 520], [1620, 470], [1760, 400],
]
export const MAP_MARKS = [
  { x: 480, y: 396, head: 42, hat: 'fedora' },
  { x: 1330, y: 470, head: 1344, hat: 'panama' },
  { x: 1620, y: 470, head: 2433, hat: null },
]
export function mapBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(1851)
  x.translate(OS, OS)
  // parchment
  const g = x.createLinearGradient(0, -OS, 0, H + OS)
  g.addColorStop(0, '#e3d3a8')
  g.addColorStop(0.5, '#d5c191')
  g.addColorStop(1, '#c2aa76')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  for (let i = 0; i < 130; i++) {
    x.fillStyle = `rgba(120,90,40,${0.03 + r() * 0.06})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, r() * (H + OS * 2) - OS, 20 + r() * 90, 10 + r() * 40, r(), 0, 7)
    x.fill()
  }
  // burned edges
  x.strokeStyle = '#7a5a28'
  x.lineWidth = 16
  x.strokeRect(-OS + 14, -OS + 14, W + OS * 2 - 28, H + OS * 2 - 28)
  x.strokeStyle = 'rgba(90,62,20,0.6)'
  x.lineWidth = 5
  x.strokeRect(-OS + 30, -OS + 30, W + OS * 2 - 60, H + OS * 2 - 60)
  // the DANDRUFF SEA: hatched ellipse mid-frame
  const seaC = [960, 620]
  x.fillStyle = 'rgba(140,150,140,0.35)'
  x.beginPath()
  x.ellipse(seaC[0], seaC[1], 260, 120, 0.06, 0, 7)
  x.fill()
  x.strokeStyle = 'rgba(90,100,90,0.6)'
  x.lineWidth = 2
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * 6.28
    const rx = seaC[0] + Math.cos(a) * 240, ry = seaC[1] + Math.sin(a) * 105
    x.beginPath()
    x.moveTo(rx, ry)
    x.lineTo(rx + 14, ry - 8)
    x.stroke()
  }
  // waves inside
  x.strokeStyle = 'rgba(110,120,110,0.5)'
  for (let i = 0; i < 5; i++) {
    x.beginPath()
    x.arc(seaC[0] + (i - 2) * 80, seaC[1] + (i % 2) * 30, 26, 3.4, 6)
    x.stroke()
  }
  x.fillStyle = '#4c4234'
  x.font = `italic 700 40px "Cormorant Garamond"`
  x.textAlign = 'center'
  x.fillText('THE DANDRUFF SEA', seaC[0], seaC[1] + 8)
  // outer ocean hatching corners
  x.strokeStyle = 'rgba(110,120,110,0.4)'
  for (let i = 0; i < 40; i++) {
    const px = r() * (W + 480) - 240, py = r() * 300 + 700
    if (Math.hypot(px - seaC[0], (py - seaC[1]) * 2.2) < 300) continue
    x.beginPath()
    x.moveTo(px, py)
    x.lineTo(px + 16, py - 9)
    x.stroke()
  }
  x.textAlign = 'left'
  // continent (left) + island (right)
  const land = (pts, col) => {
    x.fillStyle = col
    x.beginPath()
    x.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) x.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1 < pts.length ? i + 1 : i][0]) / 2, (pts[i][1] + pts[i + 1 < pts.length ? i + 1 : i][1]) / 2)
    x.closePath()
    x.fill()
    x.strokeStyle = 'rgba(90,62,20,0.7)'
    x.lineWidth = 4
    x.stroke()
  }
  land([[-80, 120], [140, 160], [340, 300], [430, 430], [360, 640], [180, 760], [-80, 800]], '#cdb583')
  land([[1380, 340], [1560, 360], [1720, 460], [1700, 620], [1500, 680], [1360, 560], [1330, 420]], '#cdb583')
  // little mountains + palm on the island
  x.strokeStyle = '#8a6a34'
  x.lineWidth = 4
  for (const [mx, my] of [[1480, 430], [1540, 460], [1430, 480]]) {
    x.beginPath()
    x.moveTo(mx - 26, my)
    x.lineTo(mx, my - 34)
    x.lineTo(mx + 26, my)
    x.stroke()
  }
  // compass rose
  x.save()
  x.translate(300, 880)
  x.strokeStyle = '#6e5228'
  x.fillStyle = '#c9b088'
  x.lineWidth = 3
  x.beginPath()
  x.arc(0, 0, 64, 0, 7)
  x.stroke()
  x.beginPath()
  x.arc(0, 0, 44, 0, 7)
  x.stroke()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.28 - 1.57
    const long = i % 2 === 0
    x.fillStyle = i % 2 ? '#8a6a34' : '#5c441c'
    x.beginPath()
    x.moveTo(Math.cos(a) * (long ? 84 : 58), Math.sin(a) * (long ? 84 : 58))
    x.lineTo(Math.cos(a + 0.22) * 18, Math.sin(a + 0.22) * 18)
    x.lineTo(Math.cos(a - 0.22) * 18, Math.sin(a - 0.22) * 18)
    x.closePath()
    x.fill()
  }
  x.fillStyle = '#4c3818'
  x.font = `700 30px "Cormorant Garamond"`
  x.textAlign = 'center'
  x.fillText('N', 0, -96)
  x.restore()
  x.textAlign = 'left'
  // sea serpent doodle
  x.strokeStyle = '#6e5a38'
  x.lineWidth = 5
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(620, 820)
  x.quadraticCurveTo(660, 790, 700, 820)
  x.quadraticCurveTo(740, 850, 780, 820)
  x.quadraticCurveTo(820, 790, 860, 820)
  x.stroke()
  x.beginPath()
  x.moveTo(860, 820)
  x.quadraticCurveTo(880, 800, 870, 780)
  x.stroke()
  x.fillStyle = '#6e5a38'
  x.beginPath()
  x.arc(868, 776, 5, 0, 7)
  x.fill()
  return c
}

// S3A the dusk dig site (background only — ark + truck + crew are live).
export function digBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(38)
  x.translate(OS, OS)
  // dusk sky
  const g = x.createLinearGradient(0, -OS, 0, 780)
  g.addColorStop(0, '#3a2a4e')
  g.addColorStop(0.45, '#7a4452')
  g.addColorStop(0.75, '#c9704a')
  g.addColorStop(1, '#e8a45c')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, 780 + OS)
  // low sun
  const halo = x.createRadialGradient(320, 620, 30, 320, 620, 380)
  halo.addColorStop(0, 'rgba(255,214,140,0.7)')
  halo.addColorStop(1, 'rgba(255,214,140,0)')
  x.fillStyle = halo
  x.fillRect(-60, 240, 760, 760)
  x.fillStyle = '#ffd98a'
  x.beginPath()
  x.arc(320, 620, 56, 0, 7)
  x.fill()
  // birds
  x.strokeStyle = 'rgba(40,26,20,0.7)'
  x.lineWidth = 3
  x.lineCap = 'round'
  for (let i = 0; i < 5; i++) {
    const bx2 = 900 + i * 90 + r() * 40, by2 = 200 + r() * 120
    x.beginPath()
    x.moveTo(bx2 - 10, by2)
    x.quadraticCurveTo(bx2, by2 - 8, bx2 + 10, by2)
    x.stroke()
  }
  // far dunes
  x.fillStyle = '#8a5c3c'
  x.beginPath()
  x.moveTo(-OS, 780)
  x.quadraticCurveTo(300, 700, 700, 770)
  x.quadraticCurveTo(1100, 840, 1500, 760)
  x.quadraticCurveTo(1800, 710, W + OS, 780)
  x.lineTo(W + OS, 900)
  x.lineTo(-OS, 900)
  x.closePath()
  x.fill()
  // dig ground
  const gg = x.createLinearGradient(0, 860, 0, H + OS)
  gg.addColorStop(0, '#b08050')
  gg.addColorStop(0.5, '#96683e')
  gg.addColorStop(1, '#6e4826')
  x.fillStyle = gg
  x.fillRect(-OS, 880, W + OS * 2, H + OS - 880)
  // the dig trench (centre) with spoil heaps
  x.fillStyle = '#4c3016'
  x.beginPath()
  x.ellipse(960, 905, 240, 64, 0, 0, 7)
  x.fill()
  x.fillStyle = '#7a5430'
  x.beginPath()
  x.ellipse(960, 918, 190, 46, 0, 0, 7)
  x.fill()
  for (const [hx2, hy2, s2] of [[700, 910, 1.2], [1240, 908, 1.1], [820, 946, 0.9], [1120, 950, 1]]) {
    x.fillStyle = '#a87c48'
    x.beginPath()
    x.ellipse(hx2, hy2, 90 * s2, 30 * s2, 0, 0, 7)
    x.fill()
    x.fillStyle = '#c49a5c'
    x.beginPath()
    x.ellipse(hx2 - 20 * s2, hy2 - 10 * s2, 60 * s2, 18 * s2, 0, 0, 7)
    x.fill()
  }
  // string grid over the trench
  x.strokeStyle = 'rgba(230,220,190,0.5)'
  x.lineWidth = 2
  for (let i = 0; i < 5; i++) {
    x.beginPath()
    x.moveTo(760 + i * 100, 820)
    x.lineTo(720 + i * 110, 960)
    x.stroke()
  }
  // scaffolding right
  x.strokeStyle = '#5c4426'
  x.lineWidth = 10
  x.lineCap = 'round'
  for (const sx of [1560, 1760]) {
    x.beginPath()
    x.moveTo(sx, 960)
    x.lineTo(sx, 420)
    x.stroke()
  }
  for (const sy of [470, 620, 780]) {
    x.beginPath()
    x.moveTo(1540, sy)
    x.lineTo(1790, sy)
    x.stroke()
  }
  x.lineWidth = 4
  for (let i = 0; i < 6; i++) {
    x.beginPath()
    x.moveTo(1560 + i * 40, 470)
    x.lineTo(1540 + i * 44, 620)
    x.stroke()
  }
  x.fillStyle = '#8a6a3c'
  x.fillRect(1552, 606, 220, 14)
  // tent left
  x.fillStyle = '#b8a67c'
  x.beginPath()
  x.moveTo(140, 940)
  x.lineTo(320, 640)
  x.lineTo(500, 940)
  x.closePath()
  x.fill()
  x.fillStyle = '#8a7a54'
  x.beginPath()
  x.moveTo(320, 640)
  x.lineTo(400, 940)
  x.lineTo(500, 940)
  x.closePath()
  x.fill()
  x.fillStyle = '#2c2014'
  x.beginPath()
  x.moveTo(280, 940)
  x.lineTo(320, 720)
  x.lineTo(360, 940)
  x.closePath()
  x.fill()
  // lamp poles
  for (const lx of [560, 1360]) {
    x.strokeStyle = '#3a2c18'
    x.lineWidth = 9
    x.beginPath()
    x.moveTo(lx, 950)
    x.lineTo(lx, 480)
    x.lineTo(lx + 60, 480)
    x.stroke()
    x.fillStyle = '#241a10'
    x.fillRect(lx + 48, 480, 26, 30)
  }
  // crates + rope coil + pickaxe garnish
  x.fillStyle = '#6e5432'
  x.fillRect(1680, 850, 120, 100)
  x.strokeStyle = '#4c3a1e'
  x.lineWidth = 5
  x.strokeRect(1680, 850, 120, 100)
  x.beginPath()
  x.moveTo(1680, 850)
  x.lineTo(1800, 950)
  x.stroke()
  x.strokeStyle = '#a8834e'
  x.lineWidth = 8
  for (let i = 0; i < 3; i++) {
    x.beginPath()
    x.ellipse(180, 940 - i * 8, 44 - i * 8, 15 - i * 3, 0, 0, 7)
    x.stroke()
  }
  // dusk wash + long shadows
  const sh = x.createLinearGradient(0, 760, 0, H + OS)
  sh.addColorStop(0, 'rgba(255,150,80,0.12)')
  sh.addColorStop(1, 'rgba(60,20,40,0.28)')
  x.fillStyle = sh
  x.fillRect(-OS, 760, W + OS * 2, H + OS - 760)
  return c
}

// S3 desert road: far dune backdrop (slow parallax) + near dune strip (fast).
export function dunesFarBake() {
  const c = canvas(2600, 760), x = c.getContext('2d')
  const r = rng(61)
  const g = x.createLinearGradient(0, 0, 0, 760)
  g.addColorStop(0, '#8fc8ec')
  g.addColorStop(0.6, '#e8d8a8')
  g.addColorStop(1, '#d8b478')
  x.fillStyle = g
  x.fillRect(0, 0, 2600, 760)
  const halo = x.createRadialGradient(1900, 160, 30, 1900, 160, 320)
  halo.addColorStop(0, 'rgba(255,246,210,0.8)')
  halo.addColorStop(1, 'rgba(255,246,210,0)')
  x.fillStyle = halo
  x.fillRect(1500, -160, 1100, 700)
  x.fillStyle = '#fff6d0'
  x.beginPath()
  x.arc(1900, 160, 52, 0, 7)
  x.fill()
  // buttes + mesas
  for (const [mx, mw, mh, col] of [[240, 300, 190, '#c49a68'], [900, 220, 140, '#b8905c'], [1520, 340, 210, '#c49a68'], [2200, 260, 150, '#b8905c'], [2600, 300, 170, '#c49a68']]) {
    x.fillStyle = col
    x.beginPath()
    x.moveTo(mx - mw / 2, 560)
    x.lineTo(mx - mw / 2 + 34, 560 - mh)
    x.lineTo(mx + mw / 2 - 34, 560 - mh)
    x.lineTo(mx + mw / 2, 560)
    x.closePath()
    x.fill()
    x.fillStyle = 'rgba(120,84,40,0.4)'
    x.fillRect(mx - mw / 2 + 34, 560 - mh + 24, mw - 68, 12)
  }
  // far dunes ridges
  for (let i = 0; i < 3; i++) {
    x.fillStyle = ['#d8b478', '#cba76c', '#bd9760'][i]
    x.beginPath()
    x.moveTo(0, 760)
    for (let px = 0; px <= 2600; px += 60) x.lineTo(px, 500 + i * 70 + Math.sin(px * 0.004 + i * 2.2) * 46 + Math.sin(px * 0.013 + i) * 14)
    x.lineTo(2600, 760)
    x.closePath()
    x.fill()
  }
  for (let i = 0; i < 30; i++) {
    x.fillStyle = 'rgba(140,100,50,0.12)'
    x.beginPath()
    x.ellipse(r() * 2600, 480 + r() * 260, 40 + r() * 120, 8 + r() * 16, 0, 0, 7)
    x.fill()
  }
  return c
}
export function dunesNearBake() {
  const c = canvas(2600, 560), x = c.getContext('2d')
  const r = rng(62)
  x.fillStyle = '#cfa763'
  x.fillRect(0, 0, 2600, 560)
  for (let i = 0; i < 2; i++) {
    x.fillStyle = ['#c2985a', '#b28a4e'][i]
    x.beginPath()
    x.moveTo(0, 560)
    for (let px = 0; px <= 2600; px += 60) x.lineTo(px, 200 + i * 160 + Math.sin(px * 0.006 + i * 1.7) * 70 + Math.sin(px * 0.017 + i * 3) * 18)
    x.lineTo(2600, 560)
    x.closePath()
    x.fill()
    // ridge highlights
    x.strokeStyle = 'rgba(240,220,170,0.25)'
    x.lineWidth = 4
    x.beginPath()
    for (let px = 0; px <= 2600; px += 60) {
      const py = 200 + i * 160 + Math.sin(px * 0.006 + i * 1.7) * 70 + Math.sin(px * 0.017 + i * 3) * 18
      px === 0 ? x.moveTo(px, py + 8) : x.lineTo(px, py + 8)
    }
    x.stroke()
  }
  // cactus + scrub silhouettes
  for (const [cx2, cy2, s2] of [[300, 330, 1.1], [1240, 250, 0.8], [2100, 360, 1.3]]) {
    x.fillStyle = '#5c6e34'
    x.fillRect(cx2 - 10 * s2, cy2 - 90 * s2, 20 * s2, 100 * s2)
    x.fillRect(cx2 - 34 * s2, cy2 - 66 * s2, 16 * s2, 40 * s2)
    x.fillRect(cx2 - 34 * s2, cy2 - 66 * s2, 34 * s2, 14 * s2)
    x.fillRect(cx2 + 18 * s2, cy2 - 50 * s2, 16 * s2, 30 * s2)
    x.fillRect(cx2 + 2 * s2, cy2 - 50 * s2, 32 * s2, 13 * s2)
  }
  for (let i = 0; i < 24; i++) {
    x.fillStyle = 'rgba(120,84,40,0.14)'
    x.beginPath()
    x.ellipse(r() * 2600, 260 + r() * 280, 50 + r() * 130, 10 + r() * 18, 0, 0, 7)
    x.fill()
  }
  return c
}

// The convoy truck: cab + flatbed, facing +x, windscreen frame, COMB WEEKLY
// dashboard stack. Wheels + hub caps are live (film spins them); HUBS exported.
export const TRUCK = {
  w: 1060, h: 380, axleY: 336, hubR: 52,
  hubs: [{ x: 880, y: 336 }, { x: 260, y: 336 }, { x: 380, y: 336 }],
  hoodTop: { x: 1050, y: 210 }, // bonnet nose (hero lands here)
  windscreen: { x: 1005, y: 150 },
  cabSeat: { x: 900, y: 240 },
  flatbedL: { x: 60, y: 190 }, // ark ride point
  flatbedR: { x: 700, y: 190 },
  tailgate: { x: 62, y: 190 },
}
export function truckBake() {
  const c = canvas(TRUCK.w, TRUCK.h), x = c.getContext('2d')
  const r = rng(13)
  // chassis + flatbed deck
  const deckY = 190
  x.fillStyle = '#5a4020'
  x.fillRect(20, deckY, 700, 26)
  x.fillStyle = '#6e5228'
  x.fillRect(20, deckY - 8, 700, 10)
  // flatbed slat wall (low, so riders read over it)
  x.fillStyle = '#7c5c34'
  x.fillRect(30, deckY - 74, 680, 66)
  x.fillStyle = 'rgba(0,0,0,0.28)'
  for (let px = 30; px < 710; px += 56) x.fillRect(px, deckY - 74, 6, 66)
  x.fillStyle = '#5a4020'
  x.fillRect(30, deckY - 78, 680, 10)
  x.fillStyle = 'rgba(255,230,180,0.2)'
  x.fillRect(30, deckY - 78, 680, 4)
  // tailgate cross plank
  x.fillStyle = '#8a6a3c'
  x.fillRect(30, deckY - 52, 680, 14)
  x.fillStyle = 'rgba(40,26,10,0.5)'
  x.font = `700 30px "Space Grotesk"`
  x.fillText('CABALD FREIGHT', 200, deckY - 28)
  // cab: nose to the right, big rounded fenders
  const cg = x.createLinearGradient(0, 0, 0, deckY)
  cg.addColorStop(0, '#8a2f26')
  cg.addColorStop(0.55, '#a63c2c')
  cg.addColorStop(1, '#6e241c')
  x.fillStyle = cg
  x.beginPath()
  x.moveTo(716, deckY)
  x.lineTo(716, 130)
  x.quadraticCurveTo(720, 84, 780, 76)
  x.lineTo(940, 76)
  x.quadraticCurveTo(1010, 80, 1032, 140)
  x.quadraticCurveTo(1052, 176, 1052, 240)
  x.lineTo(1052, deckY)
  x.closePath()
  x.fill()
  // windscreen frame + side window opening (hero drops through)
  x.fillStyle = '#241a14'
  x.fillRect(944, 96, 96, 92)
  x.fillStyle = 'rgba(180,215,235,0.25)'
  x.fillRect(952, 104, 82, 78)
  x.strokeStyle = '#d9c9a8'
  x.lineWidth = 8
  x.strokeRect(944, 96, 96, 92)
  x.fillStyle = '#241a14'
  x.fillRect(756, 96, 150, 96)
  x.fillStyle = 'rgba(180,215,235,0.18)'
  x.fillRect(764, 104, 134, 82)
  x.strokeStyle = '#d9c9a8'
  x.lineWidth = 7
  x.strokeRect(756, 96, 150, 96)
  // bonnet + grille + fender
  x.fillStyle = '#8a2f26'
  x.beginPath()
  x.moveTo(1040, 150)
  x.quadraticCurveTo(1058, 180, 1056, 250)
  x.lineTo(1056, deckY)
  x.lineTo(1004, deckY)
  x.lineTo(1004, 170)
  x.closePath()
  x.fill()
  x.fillStyle = '#e8b23a'
  x.fillRect(1044, 220, 14, 34)
  x.fillStyle = '#3a2a1c'
  x.fillRect(1048, 262, 12, 10)
  // wheel arches (wheels painted live in the film at TRUCK.hubs)
  x.fillStyle = '#241a14'
  for (const h of TRUCK.hubs) {
    x.beginPath()
    x.arc(h.x, h.y, 66, Math.PI, 0, false)
    x.fill()
  }
  // cab door line + handle + step
  x.strokeStyle = 'rgba(40,20,12,0.6)'
  x.lineWidth = 5
  x.beginPath()
  x.moveTo(920, 92)
  x.lineTo(920, deckY)
  x.stroke()
  x.fillStyle = '#e8b23a'
  x.fillRect(898, 210, 18, 8)
  // rust streaks + mud splatter (seeded)
  for (let i = 0; i < 26; i++) {
    x.fillStyle = `rgba(60,36,18,${0.1 + r() * 0.2})`
    x.beginPath()
    x.ellipse(r() * 1060, 140 + r() * 200, 6 + r() * 22, 4 + r() * 10, r(), 0, 7)
    x.fill()
  }
  return c
}

// S4A the night ruin: moonlit arches, cracked slabs, sand floor (floor 880).
export function ruinBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(56)
  x.translate(OS, OS)
  // night sky
  const g = x.createLinearGradient(0, -OS, 0, 700)
  g.addColorStop(0, '#0a0e1e')
  g.addColorStop(0.7, '#141c34')
  g.addColorStop(1, '#1c2440')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, 700 + OS)
  for (let i = 0; i < 70; i++) {
    const tw = 0.5 + 0.5 * Math.sin(i * 3)
    x.fillStyle = `rgba(214,226,246,${0.14 + hash(i * 7) * 0.5 * tw})`
    x.fillRect(Math.floor(r() * (W + OS * 2) - OS), Math.floor(r() * 560), 2, 2)
  }
  // ruined colonnade
  const col = (cx2, topH) => {
    const cg = x.createLinearGradient(cx2 - 40, 0, cx2 + 40, 0)
    cg.addColorStop(0, '#2c2c3c')
    cg.addColorStop(0.5, '#484858')
    cg.addColorStop(1, '#22222e')
    x.fillStyle = cg
    x.fillRect(cx2 - 36, 880 - topH, 72, topH)
    x.fillStyle = '#545464'
    x.fillRect(cx2 - 48, 880 - topH, 96, 22)
    x.fillRect(cx2 - 42, 858, 84, 24)
  }
  col(120, 620)
  col(420, 460)
  col(1520, 500)
  col(1800, 640)
  // fallen lintel across two columns
  x.fillStyle = '#3c3c4c'
  x.beginPath()
  x.moveTo(60, 880 - 600)
  x.quadraticCurveTo(280, 880 - 660, 470, 880 - 450)
  x.lineTo(470, 880 - 414)
  x.quadraticCurveTo(280, 880 - 620, 60, 880 - 560)
  x.closePath()
  x.fill()
  // the great arch (frame right-of-centre)
  x.fillStyle = '#30303e'
  x.beginPath()
  x.moveTo(700, 880)
  x.lineTo(700, 300)
  x.quadraticCurveTo(1050, 60, 1400, 300)
  x.lineTo(1400, 880)
  x.lineTo(1310, 880)
  x.lineTo(1310, 330)
  x.quadraticCurveTo(1050, 150, 790, 330)
  x.lineTo(790, 880)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(180,200,235,0.1)'
  x.beginPath()
  x.moveTo(700, 300)
  x.quadraticCurveTo(1050, 60, 1400, 300)
  x.lineTo(1400, 330)
  x.quadraticCurveTo(1050, 96, 700, 330)
  x.closePath()
  x.fill()
  // rubble piles
  for (const [rx, ry, s2] of [[560, 880, 1], [1600, 880, 1.2], [880, 890, 0.7], [1240, 892, 0.8]]) {
    for (let i = 0; i < 7; i++) {
      const sx = rx + (hash(i * 9 + rx) - 0.5) * 150 * s2
      const sy = ry - hash(i * 3 + rx) * 40 * s2
      x.fillStyle = ['#3c3c4c', '#484858', '#2c2c3a'][i % 3]
      x.beginPath()
      x.ellipse(sx, sy, (16 + hash(i * 11) * 26) * s2, (10 + hash(i * 5) * 14) * s2, hash(i) * 2, 0, 7)
      x.fill()
    }
  }
  // sand floor with moon pools
  const sg = x.createLinearGradient(0, 870, 0, H + OS)
  sg.addColorStop(0, '#3c3a48')
  sg.addColorStop(0.5, '#2e2c3a')
  sg.addColorStop(1, '#1e1c28')
  x.fillStyle = sg
  x.fillRect(-OS, 880, W + OS * 2, H + OS - 880)
  for (let i = 0; i < 30; i++) {
    x.fillStyle = `rgba(140,150,190,${0.04 + r() * 0.06})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, 890 + r() * 170, 40 + r() * 110, 8 + r() * 14, 0, 0, 7)
    x.fill()
  }
  return c
}

// S4B/C the scissors pit interior: earthen walls, hatch doors in the ceiling,
// rubble slope right, ledge lip at top (the exit). Floor 880.
export function pitBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(34)
  x.translate(OS, OS)
  // shaft walls: dark earth banded
  const g = x.createLinearGradient(0, -OS, 0, H)
  g.addColorStop(0, '#241a10')
  g.addColorStop(0.5, '#332414')
  g.addColorStop(1, '#1c130a')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  for (let wy = -100; wy < 950; wy += 60) {
    x.fillStyle = 'rgba(0,0,0,0.3)'
    x.fillRect(-OS, wy + (((wy / 60) | 0) % 2) * 12, W + OS * 2, 9)
  }
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(120,90,50,${0.04 + r() * 0.07})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, r() * H, 30 + r() * 110, 10 + r() * 26, r(), 0, 7)
    x.fill()
  }
  // root strands hanging
  x.strokeStyle = 'rgba(90,64,30,0.55)'
  x.lineWidth = 3
  x.lineCap = 'round'
  for (let i = 0; i < 9; i++) {
    const rx = r() * (W + OS * 2) - OS
    x.beginPath()
    x.moveTo(rx, -OS)
    x.quadraticCurveTo(rx + 20, 120 + r() * 100, rx - 14, 200 + r() * 160)
    x.stroke()
  }
  // hatch rim + doors (film swings the doors live via drawImage of this bake? no:
  // the doors are painted live; bake leaves a dark rectangle opening)
  x.fillStyle = '#060402'
  x.fillRect(760, -OS, 400, 170)
  x.strokeStyle = '#4c3a20'
  x.lineWidth = 12
  x.strokeRect(760, -OS + 8, 400, 162)
  // ledge lip at the top right (the exit shelf) + rubble slope from floor to lip
  x.fillStyle = '#3c2c18'
  x.beginPath()
  x.moveTo(W + OS, 40)
  x.lineTo(1500, 60)
  x.lineTo(1500, 110)
  x.lineTo(W + OS, 110)
  x.closePath()
  x.fill()
  // rubble slope up to the ledge
  const sg = x.createLinearGradient(1300, 200, 1800, 880)
  sg.addColorStop(0, '#4a3820')
  sg.addColorStop(1, '#2c1f10')
  x.fillStyle = sg
  x.beginPath()
  x.moveTo(1560, 96)
  x.quadraticCurveTo(1400, 420, 1560, 880)
  x.lineTo(W + OS, 880)
  x.lineTo(W + OS, 96)
  x.closePath()
  x.fill()
  for (let i = 0; i < 16; i++) {
    x.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.2})`
    x.beginPath()
    x.ellipse(1580 + r() * 320, 200 + r() * 640, 20 + r() * 60, 10 + r() * 20, r(), 0, 7)
    x.fill()
  }
  // pit floor
  const fg = x.createLinearGradient(0, 860, 0, H + OS)
  fg.addColorStop(0, '#3a2c1a')
  fg.addColorStop(1, '#191008')
  x.fillStyle = fg
  x.fillRect(-OS, 880, W + OS * 2, H + OS - 880)
  x.fillStyle = 'rgba(0,0,0,0.35)'
  for (let i = 0; i < 24; i++) {
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, 900 + r() * 140, 40 + r() * 100, 8 + r() * 14, 0, 0, 7)
    x.fill()
  }
  return c
}

// S5 the island-night ceremony: sea horizon, moonlit beach, altar dais centre,
// choir risers left, torch posts. Moon + flames live.
export const ALTAR = { x: 960, top: 690, floor: 940, choirX: [520, 700, 880, 1060, 1240], choirFeet: [880, 862, 844, 862, 880] }
export function altarBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(66)
  x.translate(OS, OS)
  // night sky
  const g = x.createLinearGradient(0, -OS, 0, 640)
  g.addColorStop(0, '#0a1024')
  g.addColorStop(0.65, '#12203e')
  g.addColorStop(1, '#1a2c50')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, 640 + OS)
  for (let i = 0; i < 80; i++) {
    const tw = 0.5 + 0.5 * Math.sin(i * 5)
    x.fillStyle = `rgba(214,226,246,${0.12 + hash(i * 9) * 0.5 * tw})`
    x.fillRect(Math.floor(r() * (W + OS * 2) - OS), Math.floor(r() * 480), 2, 2)
  }
  // sea horizon with moon-path shimmer baked dim (moon live above it)
  const sg = x.createLinearGradient(0, 560, 0, 760)
  sg.addColorStop(0, '#16283c')
  sg.addColorStop(1, '#0d1a2c')
  x.fillStyle = sg
  x.fillRect(-OS, 560, W + OS * 2, 220)
  for (let i = 0; i < 24; i++) {
    x.fillStyle = 'rgba(190,205,230,0.12)'
    x.fillRect(700 + Math.sin(i * 2.2) * 240, 580 + i * 7, 30 + hash(i) * 40, 2.4)
  }
  // beach
  const bg = x.createLinearGradient(0, 760, 0, H + OS)
  bg.addColorStop(0, '#3a3c50')
  bg.addColorStop(0.4, '#2e3044')
  bg.addColorStop(1, '#20222e')
  x.fillStyle = bg
  x.fillRect(-OS, 760, W + OS * 2, H + OS - 760)
  for (let i = 0; i < 40; i++) {
    x.fillStyle = `rgba(160,170,210,${0.04 + r() * 0.05})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, 780 + r() * 260, 40 + r() * 110, 8 + r() * 14, 0, 0, 7)
    x.fill()
  }
  // palm silhouettes (frame edges)
  const palm = (px, flip) => {
    x.strokeStyle = '#141824'
    x.lineWidth = 16
    x.lineCap = 'round'
    x.beginPath()
    x.moveTo(px, 800)
    x.quadraticCurveTo(px + flip * 30, 600, px + flip * 80, 440)
    x.stroke()
    x.fillStyle = '#141824'
    for (let i = 0; i < 6; i++) {
      const a = -2.6 + i * 0.5
      x.save()
      x.translate(px + flip * 80, 440)
      x.rotate(a + flip * 0.5)
      x.beginPath()
      x.ellipse(70, 0, 74, 14, 0.16, 0, 7)
      x.fill()
      x.restore()
    }
  }
  palm(120, 1)
  palm(1800, -1)
  // choir risers: three stone steps (left-of-centre)
  for (let i = 0; i < 3; i++) {
    x.fillStyle = ['#3c3e52', '#464860', '#525468'][i]
    x.fillRect(430 - i * 30, 800 - (2 - i) * 38, 900 + i * 60, 40)
    x.fillStyle = 'rgba(180,200,240,0.12)'
    x.fillRect(430 - i * 30, 800 - (2 - i) * 38, 900 + i * 60, 6)
  }
  // altar dais (centre)
  for (let i = 0; i < 2; i++) {
    x.fillStyle = ['#4a4c62', '#565870'][i]
    x.fillRect(960 - 190 + i * 40, 800 - i * 44, 380 - i * 80, 46)
    x.fillStyle = 'rgba(190,210,240,0.14)'
    x.fillRect(960 - 190 + i * 40, 800 - i * 44, 380 - i * 80, 6)
  }
  x.fillStyle = '#606278'
  x.fillRect(960 - 150, 690, 300, 66)
  x.fillStyle = 'rgba(200,220,250,0.2)'
  x.fillRect(960 - 150, 690, 300, 8)
  // carved flow glyphs on the dais
  x.strokeStyle = 'rgba(230,210,150,0.35)'
  x.lineWidth = 3
  for (let i = 0; i < 5; i++) {
    const gx = 960 - 110 + i * 55
    x.beginPath()
    x.arc(gx, 720, 9, 0.6, 5.2)
    x.stroke()
  }
  // torch posts around
  for (const tx of [200, 620, 1300, 1720]) {
    x.strokeStyle = '#241c12'
    x.lineWidth = 12
    x.lineCap = 'round'
    x.beginPath()
    x.moveTo(tx, 960)
    x.lineTo(tx, 560)
    x.stroke()
    x.fillStyle = '#33281a'
    x.fillRect(tx - 14, 548, 28, 22)
  }
  // hero stake (far left): post + base
  x.fillStyle = '#3a2c1c'
  x.fillRect(196, 640, 18, 300)
  x.beginPath()
  x.ellipse(205, 944, 40, 12, 0, 0, 7)
  x.fill()
  return c
}

// S6 the warehouse: infinite crate canyon + catwalks + hanging lamps.
export function warehouseBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(88)
  x.translate(OS, OS)
  // deep hall dark
  const g = x.createLinearGradient(0, -OS, 0, H)
  g.addColorStop(0, '#14161e')
  g.addColorStop(0.6, '#1c1f2a')
  g.addColorStop(1, '#101218')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // receding crate stacks: rows get smaller + darker toward a vanishing core
  const crate = (cx2, cy2, s2, col) => {
    x.fillStyle = col
    x.fillRect(cx2 - 62 * s2, cy2 - 62 * s2, 124 * s2, 124 * s2)
    x.strokeStyle = 'rgba(10,8,6,0.7)'
    x.lineWidth = Math.max(2, 5 * s2)
    x.strokeRect(cx2 - 62 * s2, cy2 - 62 * s2, 124 * s2, 124 * s2)
    x.beginPath()
    x.moveTo(cx2 - 62 * s2, cy2 - 62 * s2)
    x.lineTo(cx2 + 62 * s2, cy2 + 62 * s2)
    x.moveTo(cx2 + 62 * s2, cy2 - 62 * s2)
    x.lineTo(cx2 - 62 * s2, cy2 + 62 * s2)
    x.stroke()
    x.fillStyle = `rgba(220,200,150,${0.1 + s2 * 0.14})`
    x.fillRect(cx2 - 62 * s2, cy2 - 62 * s2, 124 * s2, 8 * s2)
  }
  for (let row = 0; row < 4; row++) {
    const s2 = 1.5 - row * 0.34
    const y = 1000 - row * 40
    for (let i = -2; i < 10; i++) {
      const cx2 = -200 + i * 250 * s2 + (row % 2) * 90 * s2
      if (cx2 < -220 || cx2 > W + 220) continue
      const shade = 0.32 + row * 0.16
      crate(cx2, y - 62 * s2 * (row % 3), s2, `rgb(${Math.round(96 * shade + 24)},${Math.round(76 * shade + 18)},${Math.round(48 * shade + 10)})`)
      if (row < 2) crate(cx2 + 130 * s2, y - 190 * s2, s2 * 0.92, `rgb(${Math.round(86 * shade + 20)},${Math.round(68 * shade + 16)},${Math.round(42 * shade + 8)})`)
    }
  }
  // catwalks overhead
  x.strokeStyle = '#2c303c'
  x.lineWidth = 14
  x.beginPath()
  x.moveTo(-OS, 240)
  x.lineTo(W + OS, 260)
  x.moveTo(-OS, 150)
  x.lineTo(W + OS, 160)
  x.stroke()
  x.lineWidth = 5
  for (let px = -100; px < W + OS; px += 90) {
    x.beginPath()
    x.moveTo(px, 240)
    x.lineTo(px + 8, 300)
    x.stroke()
  }
  for (let px = -80; px < W + OS; px += 46) {
    x.beginPath()
    x.moveTo(px, 150)
    x.lineTo(px, 240)
    x.stroke()
  }
  // hanging lamps (glow live)
  for (const lx of [400, 960, 1520]) {
    x.strokeStyle = '#22242e'
    x.lineWidth = 5
    x.beginPath()
    x.moveTo(lx, 260)
    x.lineTo(lx, 360)
    x.stroke()
    x.fillStyle = '#2c303c'
    x.beginPath()
    x.moveTo(lx - 34, 388)
    x.lineTo(lx + 34, 388)
    x.lineTo(lx + 16, 362)
    x.lineTo(lx - 16, 362)
    x.closePath()
    x.fill()
  }
  // floor
  const fg = x.createLinearGradient(0, 950, 0, H + OS)
  fg.addColorStop(0, '#26293240')
  fg.addColorStop(0, '#262932')
  fg.addColorStop(1, '#16181f')
  x.fillStyle = fg
  x.fillRect(-OS, 950, W + OS * 2, H + OS - 950)
  x.fillStyle = 'rgba(220,210,170,0.06)'
  x.fillRect(-OS, 950, W + OS * 2, 4)
  for (let i = 0; i < 26; i++) {
    x.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.16})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, 960 + r() * 110, 50 + r() * 130, 10 + r() * 16, 0, 0, 7)
    x.fill()
  }
  return c
}

// ============================== shared small painters ==============================

// Full moon: warm-white disc + craters + halo wash behind.
export function moon(x, cx, cy, r, o = {}) {
  const halo = x.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 5)
  halo.addColorStop(0, `rgba(216,228,246,${o.halo ?? 0.32})`)
  halo.addColorStop(1, 'rgba(216,228,246,0)')
  x.fillStyle = halo
  x.fillRect(cx - r * 5, cy - r * 5, r * 10, r * 10)
  x.fillStyle = '#e9edf4'
  x.beginPath()
  x.arc(cx, cy, r, 0, 7)
  x.fill()
  x.fillStyle = '#f7f9fc'
  x.beginPath()
  x.arc(cx - r * 0.25, cy - r * 0.25, r * 0.85, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(178,190,208,0.55)'
  for (const [dx, dy, dr] of [[-0.3, 0.1, 0.16], [0.25, -0.2, 0.11], [0.1, 0.35, 0.09], [-0.05, -0.42, 0.07], [0.45, 0.2, 0.07]]) {
    x.beginPath()
    x.arc(cx + dx * r, cy + dy * r, dr * r, 0, 7)
    x.fill()
  }
}

// Warm torch/lantern pool (radial, flicker by t).
export function glow(x, cx, cy, k, o = {}) {  if (k <= 0.01) return
  const r2 = (o.r ?? 160) * k
  const g = x.createRadialGradient(cx, cy, 2, cx, cy, r2)
  g.addColorStop(0, `rgba(255,207,138,${o.a ?? 0.6})`)
  g.addColorStop(0.45, `rgba(255,170,80,${(o.a ?? 0.6) * 0.3})`)
  g.addColorStop(1, 'rgba(255,170,80,0)')
  x.fillStyle = g
  x.fillRect(cx - r2, cy - r2, r2 * 2, r2 * 2)
}

// Analytic dust puff (age s from an immutable event).
export function dustPuff(x, cx, cy, age, life, seed, n = 10, col = 'rgba(190,170,140,') {
  if (age <= 0 || age >= life) return
  const u = age / life
  for (let i = 0; i < n; i++) {
    const a = hash(seed * 13 + i * 7) * 6.28
    const sp = (0.3 + hash(seed + i * 3) * 0.7) * 160
    const px = cx + Math.cos(a) * sp * age * 2.4
    const py = cy + Math.sin(a) * sp * age * 1.4 - 60 * age * (0.5 + hash(i * 11))
    x.fillStyle = col + (0.4 * (1 - u)).toFixed(3) + ')'
    x.beginPath()
    x.arc(px, py, 5 + hash(seed + i) * 12 * (0.4 + u), 0, 7)
    x.fill()
  }
}

// Falling star / impact glint (k 0..1).
export function glint(x, cx, cy, s, k, col = '#fff6d8') {
  if (k <= 0 || k >= 1) return
  x.save()
  x.translate(cx, cy)
  x.globalAlpha = Math.sin(k * Math.PI)
  x.fillStyle = col
  const r2 = s * (0.4 + 0.6 * Math.sin(k * Math.PI))
  x.beginPath()
  x.moveTo(0, -r2)
  x.quadraticCurveTo(2, -2, r2, 0)
  x.quadraticCurveTo(2, 2, 0, r2)
  x.quadraticCurveTo(-2, 2, -r2, 0)
  x.quadraticCurveTo(-2, -2, 0, -r2)
  x.closePath()
  x.fill()
  x.restore()
}

// Magazine prop (COMB WEEKLY) held up; o.tilt reading angle.
export function magazine(x, cx, cy, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(o.tilt ?? -0.06)
  x.scale(s * (o.flip ? -1 : 1), s)
  x.fillStyle = '#e8e0cc'
  x.fillRect(-44, -58, 88, 116)
  x.fillStyle = '#c9412e'
  x.fillRect(-44, -58, 88, 30)
  x.fillStyle = '#f6efdc'
  x.font = `700 20px "Space Grotesk"`
  x.textAlign = 'center'
  x.fillText('COMB', 0, -38)
  x.fillText('WEEKLY', 0, -16)
  x.fillStyle = '#3a3c48'
  x.beginPath()
  x.ellipse(0, 24, 30, 38, 0, 0, 7)
  x.fill()
  x.fillStyle = '#c9a06a'
  x.beginPath()
  x.arc(0, 14, 12, 0, 7)
  x.fill()
  x.strokeStyle = '#181820'
  x.lineWidth = 2
  for (let i = 0; i < 5; i++) {
    x.beginPath()
    x.moveTo(-22 + i * 11, 40)
    x.lineTo(-22 + i * 11, 58)
    x.stroke()
  }
  x.textAlign = 'left'
  x.restore()
}

// Suited man (warehouse handler): dark suit, bald head, nod param.
export function suitMan(x, cx, baseY, s, o = {}) {
  x.save()
  x.translate(cx, baseY)
  x.scale(s * (o.flip ? -1 : 1), s)
  const nod = o.nod ?? 0
  // legs
  x.strokeStyle = '#181a20'
  x.lineWidth = 13
  x.lineCap = 'round'
  const stride = o.walk ? Math.sin(o.walk * Math.PI * 2) * 12 : 0
  x.beginPath()
  x.moveTo(-6, -78)
  x.lineTo(-8 + stride, 0)
  x.moveTo(8, -78)
  x.lineTo(10 - stride, 0)
  x.stroke()
  // jacket
  x.fillStyle = o.col ?? '#23262e'
  x.beginPath()
  x.moveTo(-22, -150)
  x.quadraticCurveTo(-28, -100, -18, -74)
  x.lineTo(18, -74)
  x.quadraticCurveTo(28, -100, 22, -150)
  x.quadraticCurveTo(0, -160, -22, -150)
  x.closePath()
  x.fill()
  x.fillStyle = '#e8e4d8'
  x.beginPath()
  x.moveTo(-7, -148)
  x.lineTo(7, -148)
  x.lineTo(4, -96)
  x.lineTo(-4, -96)
  x.closePath()
  x.fill()
  x.strokeStyle = '#c23a2e'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(0, -142)
  x.lineTo(0, -100)
  x.stroke()
  // head (bald, slight nod rotation)
  x.save()
  x.translate(0, -162)
  x.rotate(nod * 0.3)
  x.fillStyle = '#c9a882'
  x.beginPath()
  x.arc(0, 0, 17, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(255,255,255,0.2)'
  x.beginPath()
  x.ellipse(-6, -6, 6, 4, -0.5, 0, 7)
  x.fill()
  x.fillStyle = '#181210'
  x.fillRect(2, -3, 9, 2.4)
  x.restore()
  // hat
  if (o.hat === 'fedora') fedora(x, 0, -176, 0.5)
  if (o.hat === 'panama') panama(x, 0, -176, 0.5)
  x.restore()
}

// Forklift: yellow body, mast + forks, small driver hump; forks carry the crate.
export function forklift(x, cx, baseY, s, o = {}) {
  x.save()
  x.translate(cx, baseY)
  x.scale(s * (o.flip ? -1 : 1), s)
  // forks + mast (front = +x)
  x.fillStyle = '#3c4048'
  x.fillRect(86, -12, 130, 10)
  x.fillRect(86, -66, 130, 10)
  x.fillRect(60, -120, 16, 120)
  x.fillRect(96, -120, 10, 120)
  // body
  const g = x.createLinearGradient(0, -110, 0, 0)
  g.addColorStop(0, '#e0b02c')
  g.addColorStop(0.6, '#c99722')
  g.addColorStop(1, '#96690f')
  x.fillStyle = g
  x.beginPath()
  x.moveTo(-110, 0)
  x.lineTo(-110, -84)
  x.quadraticCurveTo(-104, -108, -70, -110)
  x.lineTo(30, -110)
  x.quadraticCurveTo(62, -104, 66, -70)
  x.lineTo(66, 0)
  x.closePath()
  x.fill()
  // cage + driver
  x.strokeStyle = '#3c4048'
  x.lineWidth = 8
  x.beginPath()
  x.moveTo(-60, -110)
  x.lineTo(-60, -180)
  x.lineTo(20, -180)
  x.lineTo(30, -110)
  x.stroke()
  x.fillStyle = '#2c3038'
  x.beginPath()
  x.ellipse(-16, -128, 16, 20, 0, 0, 7)
  x.fill()
  x.fillStyle = '#c9a882'
  x.beginPath()
  x.arc(-16, -154, 10, 0, 7)
  x.fill()
  x.fillStyle = '#3c4048'
  x.fillRect(-28, -166, 24, 6)
  // wheels
  x.fillStyle = '#181a20'
  x.beginPath()
  x.arc(-66, -18, 24, 0, 7)
  x.fill()
  x.arc(46, -16, 20, 0, 7)
  x.fill()
  x.fillStyle = '#3c4048'
  x.beginPath()
  x.arc(-66, -18, 9, 0, 7)
  x.arc(46, -16, 7, 0, 7)
  x.fill()
  // beacon
  x.fillStyle = '#e05a2c'
  x.beginPath()
  x.arc(30, -190, 8, 0, 7)
  x.fill()
  x.restore()
}

// Crate with slats (the ark's shipping box) + golden glow through slats.
export function crate(x, cx, baseY, s, o = {}) {
  x.save()
  x.translate(cx, baseY)
  x.scale(s, s)
  const w = 300, h = 220
  const g = x.createLinearGradient(-w / 2, 0, w / 2, 0)
  g.addColorStop(0, '#6e5432')
  g.addColorStop(0.5, '#8a6a3c')
  g.addColorStop(1, '#54401f')
  x.fillStyle = g
  x.fillRect(-w / 2, -h, w, h)
  x.strokeStyle = '#4c3a1e'
  x.lineWidth = 8
  x.strokeRect(-w / 2, -h, w, h)
  x.fillStyle = 'rgba(40,26,10,0.4)'
  for (let i = 1; i < 5; i++) x.fillRect(-w / 2 + 6, -h + i * (h / 5), w - 12, 5)
  // corner braces
  x.fillStyle = '#5a4626'
  x.fillRect(-w / 2, -h, 26, h)
  x.fillRect(w / 2 - 26, -h, 26, h)
  // golden glow through the slats
  if (o.glow > 0) {
    for (let i = 1; i < 5; i++) {
      const gy = -h + i * (h / 5)
      const gg = x.createLinearGradient(0, gy, 0, gy + 7)
      gg.addColorStop(0, `rgba(255,226,140,${0.85 * o.glow})`)
      gg.addColorStop(1, 'rgba(255,226,140,0)')
      x.fillStyle = gg
      x.fillRect(-w / 2 + 12, gy - 1, w - 24, 9)
    }
    const rg = x.createRadialGradient(0, -h / 2, 10, 0, -h / 2, 190)
    rg.addColorStop(0, `rgba(255,226,140,${0.3 * o.glow})`)
    rg.addColorStop(1, 'rgba(255,226,140,0)')
    x.fillStyle = rg
    x.fillRect(-200, -h - 60, 400, h + 120)
  }
  x.restore()
}
