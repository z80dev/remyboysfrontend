// THE GOOD, THE BAD & THE BALD — a Remy Boys western. Baked art, painted once in build().
// Golden-hour desert, sun low LEFT everywhere (long shadows fall RIGHT). Every bake is a pure
// function of hash/rng/vnoise seeds — no Math.random, no wall clock, no per-frame state.
import { F, alpha, hash, lerp, mixHex, rng, shade, txt, vnoise } from 'filmkit/lib.js'

// ---------- palette ----------
export const PW = {
  // dawn (pre-sunrise) sky stops, top → horizon
  dawn1: '#191240',
  dawn2: '#33215a',
  dawn3: '#5c3762',
  dawn4: '#9a5560',
  dawn5: '#cf8560',
  dawn6: '#eeb06e',
  dawn7: '#f8d38c',
  // title (full sunset) sky stops
  title1: '#2a0f30',
  title2: '#5c1a36',
  title3: '#93261f',
  title4: '#c34a20',
  title5: '#e07a28',
  title6: '#f2a944',
  title7: '#ffd27a',
  // fin (deep dusk) sky stops
  fin1: '#0b0716',
  fin2: '#1c1028',
  fin3: '#3d1a34',
  fin4: '#6e2a2a',
  fin5: '#a4462a',
  fin6: '#d97e3a',
  fin7: '#f0a95c',
  // town golden-hour strip
  town1: '#3a1a3c',
  town2: '#7a3038',
  town3: '#c26a34',
  town4: '#eaa24e',
  town5: '#f8cd7e',
  // sand
  sand: '#c49a62',
  sandHi: '#e8bc80',
  sandLo: '#8a6242',
  sandShadow: '#5f4028',
  // mesa layers (far → near)
  mesaDawn: ['#8a5a58', '#5f3a42', '#3a222e'],
  mesaTitle: ['#6e2c34', '#431826', '#22101c'],
  mesaFin: ['#241322', '#150b16', '#0b060e'],
  // wood
  wood: '#7a5232',
  woodHi: '#9a6f42',
  woodLo: '#4a3020',
  woodDark: '#33221a',
  // iron + metal
  iron: '#3a3634',
  ironHi: '#6a625c',
  ironLo: '#201d1c',
  // paper
  paper: '#e2d3ac',
  paperHi: '#f2e8cc',
  paperLo: '#b09a6c',
  paperInk: '#38251a',
  // accents
  bloodRed: '#a8281e',
  goldGold: '#b08a1c',
  goldHi: '#eccd5e',
  // saloon interior
  salWall: '#4a2f1e',
  salWallLo: '#331d10',
  salDark: '#170d09',
  lamp: '#ffca6e',
  bottle: '#8a5a20',
  night: '#120b12',
}

// ---------- director marks (pixel coords inside the town / saloon bakes) ----------
// town: dark doorway opening where the batwing doors go. Each door is 150×230 with its hinge
// on the canvas OUTER edge; suggest L at (doorX, doorY+62), R at (doorX+doorW-150, doorY+62).
export const TOWN_LAYOUT = {
  doorX: 1420,
  doorY: 580,
  doorW: 290,
  doorH: 360, // opening rect, bottom sits on porch deck
  porchFeetY: 958, // actor feet on the saloon boardwalk
  streetFeetY: 1000, // actor feet mid-street (foreground)
  postX: 1306, // hitching rail centre (posts at postX±66, rail y 866–884)
  troughX: 1805, // water trough centre (spans 1735–1875, base y 1000)
  signX: 150,
  signY: 776, // town sign board rect (150,776)-(510,872), post centre x 328
}
// saloon interior: bar counter spans x 620–1450 (top y 676, base y 802, brass rail y 812);
// backbar x 700–1350; poster wall spot fits the 560×760 poster at scale 0.536 → 300×407.
export const SALOON_LAYOUT = {
  barX: 1010,
  barFeetY: 868, // patron mark at the counter rail
  tableX: 1210,
  tableFeetY: 958, // floor under the centre round table
  posterX: 345,
  posterY: 205, // nail + wall spot, top-left
  keeperX: 940,
  keeperFeetY: 752, // keeper behind the counter
}

// ---------- tiny toolkit ----------
export function mkc(w, h) {
  const c = document.createElement('canvas')
  c.width = Math.round(w)
  c.height = Math.round(h)
  return c
}
const cv2 = (w, h) => {
  const c = mkc(w, h)
  return { c, x: c.getContext('2d') }
}
const arc = (x, cx, cy, r, col, a0 = 0, a1 = 7) => {
  x.fillStyle = col
  x.beginPath()
  x.arc(cx, cy, r, a0, a1)
  x.fill()
}
function glow(x, cx, cy, r, col, a) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, alpha(col, a))
  g.addColorStop(0.55, alpha(col, a * 0.35))
  g.addColorStop(1, alpha(col, 0))
  x.fillStyle = g
  x.fillRect(cx - r, cy - r, r * 2, r * 2)
}
function lin(x, x0, y0, x1, y1, stops) {
  const g = x.createLinearGradient(x0, y0, x1, y1)
  for (const s of stops) g.addColorStop(s[0], s[1])
  return g
}
// faint speckle veil: kills gradient banding, adds tooth
function grain(x, w, h, seed, n = 1500, aMax = 0.05) {
  for (let i = 0; i < n; i++) {
    const gx = hash(seed + i * 3.17) * w
    const gy = hash(seed + i * 7.71) * h
    const a = aMax * hash(i * 13.3 + seed)
    x.fillStyle = i % 2 ? `rgba(255,238,214,${a})` : `rgba(22,10,12,${a})`
    x.fillRect(gx, gy, 1.6, 1.6)
  }
}
function vignette(x, w, h, a = 0.26) {
  const g = x.createRadialGradient(w / 2, h * 0.52, h * 0.42, w / 2, h * 0.52, w * 0.74)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(12,4,8,${a})`)
  x.fillStyle = g
  x.fillRect(0, 0, w, h)
}
// soft long shadow cast to the RIGHT (sun low LEFT)
function castShadow(x, x0, y0, len, drop, a = 0.16) {
  const g = lin(x, x0, y0, x0 + len, y0 + drop, [
    [0, `rgba(50,20,26,${a})`],
    [1, 'rgba(50,20,26,0)'],
  ])
  x.fillStyle = g
  x.beginPath()
  x.moveTo(x0, y0 - 4)
  x.lineTo(x0 + len, y0 + drop - 15)
  x.lineTo(x0 + len, y0 + drop + 15)
  x.lineTo(x0, y0 + 6)
  x.closePath()
  x.fill()
}
function skyWisps(x, w, y0, y1, seed, col, n = 26, aMax = 0.1) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    const yy = y0 + r() * (y1 - y0)
    const ww = 140 + r() * 460
    x.fillStyle = alpha(col, aMax * (0.3 + r() * 0.7))
    x.beginPath()
    x.ellipse(r() * w, yy, ww / 2, 3 + r() * 9, 0, 0, 7)
    x.fill()
  }
}
// cloud slab lit from BELOW (rim on its belly)
function cloudSlab(x, cx, cy, cw, ch, topCol, rimCol, seed) {
  const r = rng(seed)
  const parts = 3 + Math.floor(r() * 2)
  for (let i = 0; i < parts; i++) {
    const px = cx + (i - (parts - 1) / 2) * (cw / parts) * 0.9
    const pw = (cw / parts) * (1.1 + r() * 0.4)
    const ph = ch * (0.6 + r() * 0.8)
    const py = cy + (r() - 0.5) * ch * 0.3
    x.fillStyle = topCol
    x.beginPath()
    x.ellipse(px, py, pw / 2, ph / 2, 0, 0, 7)
    x.fill()
    x.strokeStyle = alpha(rimCol, 0.7)
    x.lineWidth = 3
    x.beginPath()
    x.ellipse(px, py, pw / 2 - 1.5, ph / 2 - 1.5, 0, 0.35, Math.PI - 0.35)
    x.stroke()
    glow(x, px, py + ph / 2, pw * 0.45, rimCol, 0.09)
  }
}
// one row of buttes + flats as a Path2D; optional sediment striations inside.
// o.avoid = [x0, x1] keeps that span clear of buttes (for sun discs to sit in).
function mesaLayer(x, w, baseY, minH, maxH, seed, col, o = {}) {
  const p = new Path2D()
  const r = rng(seed)
  p.moveTo(-14, baseY + 60)
  let px = -14
  for (let i = 0; i < 80 && px < w + 14; i++) {
    const flat = 26 + r() * 120
    if (o.avoid && px < o.avoid[1] && px + flat > o.avoid[0]) px = o.avoid[1] + 10
    p.lineTo(px + flat, baseY + (r() - 0.5) * 6)
    px += flat
    if (r() > 0.46 && !(o.avoid && px + 60 < o.avoid[1] && px + 260 > o.avoid[0])) {
      const bw = 90 + r() * 170
      const top = baseY - minH - r() * (maxH - minH)
      const sL = 56 + r() * 70
      const sR = 62 + r() * 76
      p.lineTo(px + sL * 0.6, top + (baseY - top) * 0.28)
      p.lineTo(px + sL * 0.8, top + (baseY - top) * 0.12)
      p.lineTo(px + sL, top)
      p.lineTo(px + bw, top + (r() - 0.5) * 10)
      p.lineTo(px + bw + sR * 0.4, top + (baseY - top) * 0.2)
      p.lineTo(px + bw + sR * 0.8, top + (baseY - top) * 0.42)
      p.lineTo(px + bw + sR, baseY + 1)
      px += bw + sR
    }
  }
  p.lineTo(w + 14, baseY + 60)
  p.closePath()
  x.fillStyle = col
  x.fill(p)
  if (o.striate) {
    x.save()
    x.clip(p)
    const sr = rng(seed * 3 + 1)
    for (let yy = baseY - maxH; yy < baseY - minH * 0.5; yy += 7) {
      const t = 1 - (baseY - yy) / maxH
      x.fillStyle = `rgba(24,10,14,${0.05 + sr() * 0.09 * t})`
      x.fillRect(0, yy, w, 3 + sr() * 3)
    }
    // sun-low-LEFT: warm wash on the left of the layer
    const wg = lin(x, 0, 0, w * 0.42, 0, [
      [0, alpha(PW.sandHi, 0.1)],
      [1, alpha(PW.sandHi, 0)],
    ])
    x.fillStyle = wg
    x.fillRect(0, baseY - maxH, w * 0.42, maxH)
    x.restore()
  }
  return p
}
// sand plane with perspective wind ripples + speckle
function paintSand(x, w, h, hY, c0, c1, c2, seed) {
  x.fillStyle = lin(x, 0, hY - 4, 0, h, [
    [0, c0],
    [0.42, c1],
    [1, c2],
  ])
  x.fillRect(0, hY - 4, w, h - hY + 8)
  x.fillStyle = alpha(c0, 0.5)
  x.fillRect(0, hY - 4, w, 5)
  const r = rng(seed)
  for (let i = 0; i < 24; i++) {
    const t = i / 24
    const yy = hY + 8 + t ** 1.75 * (h - hY - 14)
    const amp = 3 + t * 10
    x.strokeStyle = i % 2 === 0 ? alpha(c2, 0.06 + r() * 0.07) : alpha(c0, 0.05 + r() * 0.06)
    x.lineWidth = 1.2 + t * 2.6
    x.beginPath()
    for (let s = 0; s <= 8; s++) {
      const sx = (s / 8) * (w + 40) - 20
      const sy = yy + (vnoise(s * 0.9 + i * 3.7, seed) - 0.5) * amp * 2
      if (s === 0) x.moveTo(sx, sy)
      else x.lineTo(sx, sy)
    }
    x.stroke()
  }
  for (let i = 0; i < 90; i++) {
    const t = r() ** 0.8
    const yy = hY + 10 + t * (h - hY - 14)
    x.fillStyle = r() > 0.5 ? alpha(c2, 0.25) : alpha(c0, 0.22)
    const sz = 1 + t * 2.4
    x.fillRect(r() * w, yy, sz, sz * 0.7)
  }
}

// ---------- shared building parts ----------
function nail(x, nx, ny, r2 = 1.8) {
  x.fillStyle = 'rgba(30,16,10,0.8)'
  x.beginPath()
  x.arc(nx, ny, r2, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(255,220,170,0.5)'
  x.fillRect(nx - 0.8, ny - r2 - 0.6, 1.6, 1.4)
}
// vertical board-and-batten wall
function plankWallV(x, x0, y0, x1, y1, seed, base = PW.wood) {
  const w1 = x1 - x0
  x.fillStyle = lin(x, x0, 0, x1, 0, [
    [0, mixHex(base, PW.woodHi, 0.35)],
    [0.6, base],
    [1, PW.woodLo],
  ])
  x.fillRect(x0, y0, w1, y1 - y0)
  const r = rng(seed)
  const pw = 26 + Math.floor(r() * 8)
  for (let px = x0; px < x1; px += pw) {
    const w2 = Math.min(pw - 2, x1 - px)
    // per-board tone + grain
    x.fillStyle = alpha(PW.woodLo, 0.22 + r() * 0.14)
    x.fillRect(px, y0, w2, y1 - y0)
    x.strokeStyle = alpha(PW.woodDark, 0.35)
    x.lineWidth = 1.4
    x.beginPath()
    for (let s = 0; s <= 5; s++) {
      const gy = y0 + ((y1 - y0) * s) / 5
      const gx = px + 3 + (vnoise(px * 0.13 + s * 1.7, seed) - 0.5) * 6
      if (s === 0) x.moveTo(gx, gy)
      else x.lineTo(gx, gy)
    }
    x.stroke()
    x.fillStyle = alpha(PW.woodDark, 0.5)
    x.fillRect(px + pw - 2, y0, 2, y1 - y0)
    nail(x, px + 5, y0 + 8)
    nail(x, px + 5, y1 - 8)
  }
  x.fillStyle = alpha(PW.woodDark, 0.35)
  x.fillRect(x0, y1 - 14, w1, 14)
}
// horizontal siding wall
function plankWallH(x, x0, y0, x1, y1, seed, base = PW.wood) {
  x.fillStyle = lin(x, x0, 0, x1, 0, [
    [0, mixHex(base, PW.woodHi, 0.4)],
    [0.55, base],
    [1, shade(base, 0.82)],
  ])
  x.fillRect(x0, y0, x1 - x0, y1 - y0)
  const r = rng(seed)
  for (let py = y0; py < y1; py += 19) {
    x.fillStyle = alpha(PW.woodDark, 0.16 + r() * 0.1)
    x.fillRect(x0, py, x1 - x0, 19)
    x.strokeStyle = alpha(PW.woodLo, 0.75)
    x.lineWidth = 1.6
    x.beginPath()
    x.moveTo(x0, py)
    x.lineTo(x1, py)
    x.stroke()
    x.strokeStyle = alpha(PW.woodHi, 0.35)
    x.beginPath()
    x.moveTo(x0, py + 2)
    x.lineTo(x1, py + 2)
    x.stroke()
    // grain wobble
    x.strokeStyle = alpha(PW.woodDark, 0.14)
    x.lineWidth = 1.2
    for (let k = 0; k < 3; k++) {
      const gx = x0 + 20 + r() * (x1 - x0 - 40)
      x.beginPath()
      x.moveTo(gx, py + 5 + r() * 8)
      x.quadraticCurveTo(gx + 30, py + 3 + r() * 10, gx + 62, py + 6 + r() * 8)
      x.stroke()
    }
    nail(x, x0 + 10, py + 9.5)
    nail(x, x1 - 10, py + 9.5)
  }
}
function winGlow(x, wx, wy, ww, wh, warm = 0.9) {
  glow(x, wx + ww / 2, wy + wh / 2, Math.max(ww, wh) * 1.25, PW.lamp, 0.14)
  x.fillStyle = PW.woodDark
  x.fillRect(wx - 6, wy - 6, ww + 12, wh + 12)
  x.fillStyle = lin(x, wx, wy, wx + ww * 0.4, wy + wh, [
    [0, mixHex(PW.lamp, '#fff3d0', 0.55)],
    [1, shade(PW.lamp, 0.68)],
  ])
  x.globalAlpha = warm
  x.fillRect(wx, wy, ww, wh)
  x.globalAlpha = 1
  x.fillStyle = PW.woodDark
  x.fillRect(wx + ww / 2 - 2.5, wy, 5, wh)
  x.fillRect(wx, wy + wh / 2 - 2.5, ww, 5)
  x.fillStyle = shade(PW.woodLo, 0.8)
  x.fillRect(wx - 9, wy + wh + 6, ww + 18, 7)
}
function signBoard(x, cx, cy, bw, bh, label, o = {}) {
  const { board = '#241610', frame = '#8a6238', ink = '#f2dfb4', size = 30, track = 2 } = o
  x.fillStyle = 'rgba(20,8,10,0.45)'
  x.fillRect(cx - bw / 2 + 4, cy - bh / 2 + 5, bw, bh)
  x.fillStyle = board
  x.fillRect(cx - bw / 2, cy - bh / 2, bw, bh)
  x.strokeStyle = frame
  x.lineWidth = 4
  x.strokeRect(cx - bw / 2 + 5, cy - bh / 2 + 5, bw - 10, bh - 10)
  x.fillStyle = '#c9b088'
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    x.beginPath()
    x.arc(cx + (sx * (bw - 20)) / 2, cy + (sy * (bh - 20)) / 2, 2.5, 0, 7)
    x.fill()
  }
  txt(x, label, cx, cy + size * 0.36, { size, color: ink, align: 'center', track, font: F.anton })
}
function barrel(x, bx, by, bw, bh, seed) {
  const r = rng(seed)
  x.fillStyle = 'rgba(30,12,14,0.3)'
  x.beginPath()
  x.ellipse(bx + bw / 2 + 8, by + bh + 3, bw * 0.62, 6, 0, 0, 7)
  x.fill()
  x.fillStyle = lin(x, bx, 0, bx + bw, 0, [
    [0, mixHex(PW.wood, PW.woodHi, 0.4)],
    [0.55, PW.wood],
    [1, PW.woodLo],
  ])
  x.beginPath()
  x.moveTo(bx, by + 6)
  x.bezierCurveTo(bx - 4, by + bh * 0.4, bx - 4, by + bh * 0.7, bx + 2, by + bh)
  x.lineTo(bx + bw - 2, by + bh)
  x.bezierCurveTo(bx + bw + 4, by + bh * 0.7, bx + bw + 4, by + bh * 0.4, bx + bw, by + 6)
  x.closePath()
  x.fill()
  x.strokeStyle = alpha(PW.woodDark, 0.5)
  x.lineWidth = 1.4
  for (let i = 1; i < 5; i++) {
    x.beginPath()
    x.moveTo(bx + (bw * i) / 5, by + 5)
    x.quadraticCurveTo(bx + (bw * i) / 5 - 2, by + bh / 2, bx + (bw * i) / 5, by + bh - 3)
    x.stroke()
  }
  for (const fy of [0.24, 0.74]) {
    x.fillStyle = PW.iron
    x.fillRect(bx - 2, by + bh * fy, bw + 4, 6)
    x.fillStyle = alpha(PW.ironHi, 0.7)
    x.fillRect(bx - 2, by + bh * fy, bw + 4, 1.6)
  }
  x.fillStyle = shade(PW.woodLo, 0.7)
  x.beginPath()
  x.ellipse(bx + bw / 2, by + 6, bw / 2 - 1, 5, 0, 0, 7)
  x.fill()
  if (r() > 0.5) {
    x.fillStyle = alpha(PW.woodDark, 0.6)
    x.fillRect(bx + bw / 2 - 6, by + 3, 12, 5)
  }
}
function crate(x, cx0, cy0, cw, ch, seed) {
  x.fillStyle = 'rgba(30,12,14,0.28)'
  x.fillRect(cx0 + 5, cy0 + ch + 2, cw, 5)
  x.fillStyle = lin(x, cx0, 0, cx0 + cw, 0, [
    [0, mixHex(PW.wood, PW.woodHi, 0.3)],
    [1, PW.woodLo],
  ])
  x.fillRect(cx0, cy0, cw, ch)
  x.strokeStyle = alpha(PW.woodDark, 0.6)
  x.lineWidth = 3
  x.strokeRect(cx0 + 1.5, cy0 + 1.5, cw - 3, ch - 3)
  x.lineWidth = 2.4
  x.beginPath()
  x.moveTo(cx0 + 4, cy0 + 4)
  x.lineTo(cx0 + cw - 4, cy0 + ch - 4)
  x.moveTo(cx0 + cw - 4, cy0 + 4)
  x.lineTo(cx0 + 4, cy0 + ch - 4)
  x.stroke()
  x.strokeStyle = alpha(PW.woodLo, 0.8)
  x.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    x.beginPath()
    x.moveTo(cx0, cy0 + (ch * i) / 4)
    x.lineTo(cx0 + cw, cy0 + (ch * i) / 4)
    x.stroke()
  }
  nail(x, cx0 + 6, cy0 + 6, 1.5)
  nail(x, cx0 + cw - 6, cy0 + 6, 1.5)
}

// ---------- skies ----------
function paintDawn() {
  const w = 1920
  const h = 1080
  const hY = 778
  const { c, x } = cv2(w, h)
  x.fillStyle = lin(x, 0, 0, 0, hY, [
    [0, PW.dawn1],
    [0.34, PW.dawn2],
    [0.55, PW.dawn3],
    [0.7, PW.dawn4],
    [0.82, PW.dawn5],
    [0.92, PW.dawn6],
    [1, PW.dawn7],
  ])
  x.fillRect(0, 0, w, hY + 2)
  // last stars, fading into the light
  const r = rng(31)
  for (let i = 0; i < 42; i++) {
    const sy = 20 + r() * 330
    x.fillStyle = `rgba(226,232,255,${0.08 + r() * 0.2 * (1 - sy / 380)})`
    x.fillRect(r() * w, sy, 1.8, 1.8)
  }
  skyWisps(x, w, 90, 620, 7, PW.dawn5, 24, 0.08)
  // low sun glow on the LEFT — no disc yet, just the promise
  glow(x, 170, 742, 640, '#ffbe78', 0.42)
  glow(x, 170, 756, 300, PW.dawn7, 0.5)
  glow(x, 150, 770, 150, '#fff0cc', 0.4)
  // thin sliver clouds
  cloudSlab(x, 560, 250, 340, 26, shade(PW.dawn3, 0.8), PW.dawn6, 41)
  cloudSlab(x, 1120, 190, 300, 22, shade(PW.dawn2, 0.85), PW.dawn5, 42)
  cloudSlab(x, 1560, 330, 380, 26, shade(PW.dawn3, 0.8), PW.dawn6, 43)
  // mesa rows, hazier as they recede
  mesaLayer(x, w, hY - 2, 60, 190, 51, PW.mesaDawn[0], { avoid: [150, 380] })
  x.fillStyle = alpha(PW.dawn6, 0.3)
  x.fillRect(0, hY - 150, w, 150)
  mesaLayer(x, w, hY, 90, 240, 52, PW.mesaDawn[1], { striate: true, avoid: [20, 420] })
  x.fillStyle = alpha(PW.dawn6, 0.22)
  x.fillRect(0, hY - 120, w, 122)
  mesaLayer(x, w, hY + 2, 110, 260, 53, PW.mesaDawn[2], { striate: true, avoid: [0, 460] })
  // ground: bottom ~28%
  paintSand(x, w, h, hY, PW.sandHi, PW.sand, PW.sandLo, 61)
  // warm spill of the coming sun across the left sand
  const sp = x.createRadialGradient(120, hY, 0, 120, hY, 1150)
  sp.addColorStop(0, alpha(PW.dawn7, 0.17))
  sp.addColorStop(1, alpha(PW.dawn7, 0))
  x.fillStyle = sp
  x.fillRect(0, hY, 1400, h - hY)
  // one distant dry-lake shine
  glow(x, 1420, hY + 6, 170, '#fff0c8', 0.22)
  x.fillStyle = alpha('#fff0c8', 0.16)
  x.beginPath()
  x.ellipse(1420, hY + 7, 150, 9, 0, 0, 7)
  x.fill()
  grain(x, w, h, 62)
  vignette(x, w, h, 0.3)
  return c
}
function paintTitle() {
  const w = 1920
  const h = 1080
  const hY = 842
  const { c, x } = cv2(w, h)
  x.fillStyle = lin(x, 0, 0, 0, hY, [
    [0, PW.title1],
    [0.28, PW.title2],
    [0.48, PW.title3],
    [0.64, PW.title4],
    [0.78, PW.title5],
    [0.9, PW.title6],
    [1, PW.title7],
  ])
  x.fillRect(0, 0, w, hY + 2)
  skyWisps(x, w, 120, 660, 11, PW.title6, 22, 0.07)
  // cloud bands lit from below
  cloudSlab(x, 380, 300, 560, 54, shade(PW.title2, 0.9), PW.title6, 71)
  cloudSlab(x, 1180, 220, 640, 60, shade(PW.title1, 1.05), PW.title5, 72)
  cloudSlab(x, 1660, 420, 420, 44, shade(PW.title2, 0.9), PW.title6, 73)
  cloudSlab(x, 240, 520, 380, 36, shade(PW.title3, 1.05), PW.title7, 74)
  cloudSlab(x, 900, 470, 300, 34, shade(PW.title3, 1.05), PW.title6, 75)
  // black-red mesa rows — a deliberate valley at the sun
  const sx = 640
  const sy = hY - 8
  mesaLayer(x, w, hY - 4, 60, 170, 81, PW.mesaTitle[0], { avoid: [sx - 210, sx + 210] })
  x.fillStyle = alpha(PW.title6, 0.26)
  x.fillRect(0, hY - 130, w, 132)
  mesaLayer(x, w, hY, 90, 220, 82, PW.mesaTitle[1], { striate: true, avoid: [sx - 240, sx + 240] })
  x.fillStyle = alpha(PW.title6, 0.18)
  x.fillRect(0, hY - 100, w, 102)
  // the big sun, sitting on the horizon left of centre, in its valley
  glow(x, sx, sy, 560, '#ff9a4e', 0.42)
  glow(x, sx, sy, 240, '#ffd98a', 0.5)
  x.fillStyle = lin(x, 0, sy - 96, 0, sy + 40, [
    [0, '#fff3cd'],
    [1, '#ffc263'],
  ])
  x.beginPath()
  x.arc(sx, sy, 96, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(150,50,30,0.25)'
  x.fillRect(sx - 110, hY - 10, 220, 3)
  x.fillRect(sx - 150, hY + 2, 300, 2.5)
  mesaLayer(x, w, hY + 2, 110, 250, 83, PW.mesaTitle[2], { striate: true, avoid: [sx - 180, sx + 180] })
  // ground: bottom ~22%
  paintSand(x, w, h, hY, '#e8a258', '#9a5c34', '#54301f', 91)
  // sheen under the sun (radial — no seams)
  const sh = x.createRadialGradient(sx, hY, 0, sx, hY, 520)
  sh.addColorStop(0, alpha(PW.title7, 0.3))
  sh.addColorStop(1, alpha(PW.title7, 0))
  x.fillStyle = sh
  x.fillRect(sx - 520, hY, 1040, h - hY)
  grain(x, w, h, 92)
  vignette(x, w, h, 0.34)
  return c
}
function paintFin() {
  const w = 1920
  const h = 1080
  const hY = 864
  const { c, x } = cv2(w, h)
  x.fillStyle = lin(x, 0, 0, 0, hY, [
    [0, PW.fin1],
    [0.35, PW.fin2],
    [0.58, PW.fin3],
    [0.74, PW.fin4],
    [0.86, PW.fin5],
    [0.96, PW.fin6],
    [1, PW.fin7],
  ])
  x.fillRect(0, 0, w, hY + 2)
  skyWisps(x, w, 140, 640, 17, PW.fin4, 18, 0.06)
  // first stars
  const r = rng(97)
  for (let i = 0; i < 80; i++) {
    const sy2 = 14 + r() * 380
    const tw = 0.25 + r() * 0.65 * (1 - sy2 / 430)
    x.fillStyle = `rgba(226,234,255,${tw})`
    const sz = r() > 0.92 ? 2.4 : 1.5
    x.fillRect(r() * w, sy2, sz, sz)
    if (r() > 0.94) {
      x.fillRect(r() * w - 3, sy2 + 1, 8, 1)
      x.fillRect(r() * w + 1, sy2 - 3, 1, 8)
    }
  }
  // near-black mesa silhouettes — open water of sky where the sun sinks
  const sx = 380
  const sy = hY + 6
  mesaLayer(x, w, hY - 2, 70, 190, 101, PW.mesaFin[0], { avoid: [sx - 240, sx + 240] })
  x.fillStyle = alpha(PW.fin5, 0.16)
  x.fillRect(0, hY - 140, w, 142)
  mesaLayer(x, w, hY, 100, 240, 102, PW.mesaFin[1], { striate: true, avoid: [sx - 270, sx + 270] })
  // huge half-sunk sun, far LEFT, in its gap
  glow(x, sx, sy, 640, '#e86a34', 0.4)
  glow(x, sx, sy, 300, '#ffb060', 0.42)
  x.fillStyle = lin(x, 0, sy - 150, 0, sy, [
    [0, '#ffd9a0'],
    [1, '#f0803c'],
  ])
  x.beginPath()
  x.arc(sx, sy, 150, Math.PI, 0)
  x.fill()
  x.fillStyle = 'rgba(60,20,26,0.5)'
  x.fillRect(sx - 160, hY - 6, 320, 4)
  x.fillRect(sx - 200, hY + 4, 400, 3)
  mesaLayer(x, w, hY + 2, 90, 210, 103, PW.mesaFin[2], { avoid: [sx - 200, sx + 200] })
  // dark sand
  paintSand(x, w, h, hY, '#6a3c2c', '#2e1a16', '#150c0c', 111)
  grain(x, w, h, 112)
  vignette(x, w, h, 0.4)
  return c
}

// ---------- the one-street town ----------
function paintTown() {
  const w = 1920
  const h = 1080
  const { c, x } = cv2(w, h)
  const hY = 655
  // golden sky strip
  x.fillStyle = lin(x, 0, 0, 0, hY, [
    [0, PW.town1],
    [0.4, PW.town2],
    [0.68, PW.town3],
    [0.86, PW.town4],
    [1, PW.town5],
  ])
  x.fillRect(0, 0, w, hY + 2)
  skyWisps(x, w, 120, 520, 23, PW.town4, 20, 0.08)
  glow(x, 120, 560, 480, '#ffbe70', 0.3)
  glow(x, 120, 600, 220, PW.town5, 0.34)
  // distant mesas at the end of the street
  mesaLayer(x, w, hY - 2, 50, 130, 121, '#8a4c44')
  x.fillStyle = alpha(PW.town4, 0.3)
  x.fillRect(0, hY - 100, w, 102)
  mesaLayer(x, w, hY, 60, 150, 122, '#5c2e2c', { striate: true })
  // far shack + little windmill silhouette at the street end
  x.fillStyle = 'rgba(46,22,22,0.9)'
  x.fillRect(792, 626, 72, 34)
  x.beginPath()
  x.moveTo(786, 626)
  x.lineTo(828, 606)
  x.lineTo(870, 626)
  x.closePath()
  x.fill()
  x.strokeStyle = 'rgba(46,22,22,0.9)'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(952, 660)
  x.lineTo(952, 596)
  x.stroke()
  x.lineWidth = 2
  for (let s = 0; s < 4; s++) {
    const a = (s * Math.PI) / 2
    x.beginPath()
    x.moveTo(952, 596)
    x.lineTo(952 + Math.cos(a) * 20, 596 + Math.sin(a) * 20)
    x.stroke()
  }
  x.fillStyle = alpha(PW.town4, 0.5)
  x.fillRect(0, hY - 40, w, 42)
  // street sand
  paintSand(x, w, h, hY, '#dca763', '#b08050', '#8a6242', 131)
  // wheel ruts fanning from the far end
  x.strokeStyle = 'rgba(90,58,36,0.26)'
  x.lineWidth = 5
  for (const [fx, bx] of [
    [848, -110],
    [872, 240],
    [922, 1640],
    [946, 2000],
  ]) {
    x.beginPath()
    x.moveTo(fx, hY + 6)
    x.quadraticCurveTo((fx + bx) / 2 + 40, 880, bx, h + 20)
    x.stroke()
  }
  x.fillStyle = alpha('#e8c084', 0.1)
  x.beginPath()
  x.moveTo(893, hY)
  x.lineTo(938, hY)
  x.quadraticCurveTo(1010, 900, 1060, h)
  x.lineTo(760, h)
  x.quadraticCurveTo(830, 900, 893, hY)
  x.fill()

  // ---- LEFT row ----
  // LIVERY (far)
  plankWallV(x, 480, 600, 720, 715, 141, '#6e4a2e')
  x.fillStyle = shade(PW.woodLo, 0.9)
  x.fillRect(480, 560, 240, 44)
  signBoard(x, 600, 582, 150, 36, 'LIVERY', { size: 26, frame: '#a8763e' })
  for (const dx of [508, 612]) {
    x.fillStyle = '#241410'
    x.fillRect(dx, 610, 80, 105)
    x.strokeStyle = '#4a3020'
    x.lineWidth = 6
    x.strokeRect(dx + 3, 613, 74, 99)
    x.beginPath()
    x.moveTo(dx + 6, 616)
    x.lineTo(dx + 74, 712)
    x.moveTo(dx + 74, 616)
    x.lineTo(dx + 6, 712)
    x.stroke()
  }
  x.fillStyle = alpha(PW.woodDark, 0.5)
  x.fillRect(480, 701, 240, 14)
  castShadow(x, 720, 716, 250, 32, 0.15)
  // HAIRLINE OUTFITTERS (near)
  plankWallV(x, 30, 560, 434, 830, 142)
  x.fillStyle = shade(PW.woodLo, 0.95)
  x.fillRect(30, 470, 404, 96)
  x.fillStyle = alpha(PW.woodHi, 0.5)
  x.fillRect(30, 470, 404, 5)
  x.fillStyle = PW.bloodRed
  x.fillRect(30, 560, 404, 7)
  signBoard(x, 232, 516, 310, 54, 'HAIRLINE OUTFITTERS', { size: 29, track: 1 })
  // striped awning
  x.save()
  x.beginPath()
  x.moveTo(56, 596)
  x.lineTo(408, 596)
  x.lineTo(430, 658)
  x.lineTo(34, 658)
  x.closePath()
  x.clip()
  for (let i = 0; i < 12; i++) {
    x.fillStyle = i % 2 ? '#e2cdb0' : PW.bloodRed
    x.fillRect(30 + i * 34, 590, 34, 74)
  }
  x.fillStyle = lin(x, 0, 596, 0, 658, [
    [0, 'rgba(255,240,210,0.25)'],
    [1, 'rgba(20,8,10,0.35)'],
  ])
  x.fillRect(30, 590, 404, 74)
  x.restore()
  x.fillStyle = alpha(PW.woodDark, 0.6)
  x.fillRect(34, 658, 396, 6)
  winGlow(x, 86, 672, 72, 84)
  winGlow(x, 300, 672, 72, 84)
  x.fillStyle = '#20120c'
  x.fillRect(196, 662, 72, 168)
  x.fillStyle = lin(x, 196, 662, 224, 830, [
    [0, '#3a2214'],
    [1, '#1c0f08'],
  ])
  x.fillRect(200, 666, 64, 164)
  winGlow(x, 214, 680, 36, 30, 0.75)
  nail(x, 206, 700)
  nail(x, 258, 700)
  // goods by the wall
  barrel(x, 462, 800, 52, 62, 151)
  barrel(x, 522, 812, 44, 56, 152)
  crate(x, 58, 760, 82, 70, 153)
  crate(x, 146, 776, 78, 54, 154)
  castShadow(x, 434, 832, 430, 52, 0.16)
  // wagon wheel leaning on the outfitters corner
  x.save()
  x.translate(452, 772)
  x.rotate(-0.06)
  x.strokeStyle = '#4a3220'
  x.lineWidth = 7
  x.beginPath()
  x.ellipse(0, 0, 46, 56, 0, 0, 7)
  x.stroke()
  x.strokeStyle = '#6a4a2e'
  x.lineWidth = 2.5
  x.beginPath()
  x.ellipse(0, 0, 40, 50, 0, 0, 7)
  x.stroke()
  x.lineWidth = 4
  x.strokeStyle = '#55391f'
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    x.beginPath()
    x.moveTo(0, 0)
    x.lineTo(Math.cos(a) * 52, Math.sin(a) * 62)
    x.stroke()
  }
  arc(x, 0, 0, 9, '#3a2a1a')
  arc(x, -2, -2, 3, '#8a6a42')
  x.restore()
  castShadow(x, 470, 830, 120, 16, 0.2)

  // ---- RIGHT row ----
  // FIRST OF HAIRLINE bank (far)
  x.fillStyle = lin(x, 990, 0, 1201, 0, [
    [0, '#9a8468'],
    [1, '#7c6650'],
  ])
  x.fillRect(990, 585, 211, 175)
  x.fillStyle = '#6a5644'
  x.fillRect(990, 585, 211, 26)
  x.fillStyle = alpha('#c8b090', 0.5)
  x.fillRect(990, 585, 211, 4)
  for (const qx of [990, 1179]) {
    x.fillStyle = '#6a5644'
    for (let qy = 620; qy < 756; qy += 24) x.fillRect(qx, qy, 22, 12)
  }
  signBoard(x, 1096, 628, 208, 34, 'FIRST OF HAIRLINE', { size: 18, board: '#2c2018', frame: '#8a744e', track: 1 })
  winGlow(x, 1078, 662, 36, 30, 0.7)
  x.fillStyle = '#221410'
  x.beginPath()
  x.moveTo(1062, 760)
  x.lineTo(1062, 700)
  x.arc(1096, 700, 34, Math.PI, 0)
  x.lineTo(1130, 760)
  x.closePath()
  x.fill()
  x.fillStyle = '#5c4632'
  x.fillRect(1044, 760, 104, 8)
  x.fillRect(1052, 768, 88, 8)
  castShadow(x, 1201, 762, 240, 28, 0.15)

  // THE GOLDEN MULLET saloon (foreground right)
  plankWallH(x, 1288, 352, 1920, 940, 161, '#8a6240')
  // left-edge trim catches the low sun
  x.fillStyle = mixHex(PW.woodHi, '#e8b070', 0.4)
  x.fillRect(1288, 352, 10, 588)
  x.fillStyle = alpha(PW.woodDark, 0.55)
  x.fillRect(1288, 918, 632, 22)
  // parapet + cap
  x.fillStyle = shade(PW.woodLo, 1.02)
  x.fillRect(1288, 336, 632, 18)
  x.fillStyle = alpha(PW.woodHi, 0.6)
  x.fillRect(1288, 336, 632, 4)
  // big gold sign block
  x.fillStyle = '#241610'
  x.fillRect(1320, 286, 560, 62)
  x.fillStyle = alpha(PW.goldHi, 0.9)
  x.fillRect(1320, 286, 560, 4)
  x.strokeStyle = PW.goldGold
  x.lineWidth = 4
  x.strokeRect(1328, 293, 544, 48)
  txt(x, 'THE GOLDEN MULLET', 1600, 331, {
    size: 48,
    color: PW.goldHi,
    align: 'center',
    track: 3,
    font: F.anton,
    shadow: 'rgba(20,8,6,0.8)',
  })
  // porch roof + fascia
  x.fillStyle = '#5c3c22'
  x.beginPath()
  x.moveTo(1246, 480)
  x.lineTo(1920, 464)
  x.lineTo(1920, 438)
  x.lineTo(1246, 452)
  x.closePath()
  x.fill()
  x.fillStyle = alpha(PW.woodHi, 0.5)
  x.fillRect(1246, 452, 674, 5)
  x.fillStyle = shade(PW.woodDark, 1.1)
  x.beginPath()
  x.moveTo(1246, 480)
  x.lineTo(1920, 464)
  x.lineTo(1920, 482)
  x.lineTo(1246, 498)
  x.closePath()
  x.fill()
  // windows + the dark doorway (batwings are separate props)
  winGlow(x, 1310, 600, 82, 100)
  winGlow(x, 1738, 600, 82, 100)
  x.fillStyle = '#1a0f09'
  x.fillRect(1408, 568, 314, 372)
  x.fillStyle = '#070403'
  x.fillRect(1420, 580, 290, 360)
  const dg = lin(x, 0, 580, 0, 940, [
    [0, 'rgba(255,170,90,0.1)'],
    [0.45, 'rgba(120,50,20,0.03)'],
    [1, 'rgba(0,0,0,0)'],
  ])
  x.fillStyle = dg
  x.fillRect(1420, 580, 290, 360)
  x.fillStyle = PW.woodDark
  x.fillRect(1402, 560, 326, 12)
  x.fillRect(1402, 560, 14, 380)
  x.fillRect(1704, 560, 14, 380)
  nail(x, 1409, 566)
  nail(x, 1516, 566)
  nail(x, 1621, 566)
  nail(x, 1721, 566)
  // porch posts + boardwalk
  for (const px of [1268, 1852]) {
    x.fillStyle = lin(x, px, 0, px + 16, 0, [
      [0, mixHex(PW.wood, PW.woodHi, 0.4)],
      [1, PW.woodLo],
    ])
    x.fillRect(px, 490, 16, 462)
    x.strokeStyle = alpha(PW.woodDark, 0.4)
    x.lineWidth = 1.5
    x.beginPath()
    x.moveTo(px + 8, 520)
    x.lineTo(px + 8, 940)
    x.stroke()
    x.fillStyle = '#4c3018'
    x.beginPath()
    x.moveTo(px, 512)
    x.lineTo(px - 34, 490)
    x.lineTo(px - 34, 500)
    x.lineTo(px, 524)
    x.closePath()
    x.fill()
  }
  x.fillStyle = lin(x, 1256, 0, 1920, 0, [
    [0, mixHex(PW.wood, PW.woodHi, 0.25)],
    [1, shade(PW.wood, 0.85)],
  ])
  x.fillRect(1256, 940, 664, 24)
  x.fillStyle = alpha(PW.woodDark, 0.5)
  for (let dx = 1256; dx < 1920; dx += 34) x.fillRect(dx, 940, 2, 24)
  x.fillStyle = shade(PW.woodLo, 0.8)
  x.fillRect(1256, 962, 664, 16)
  x.fillStyle = 'rgba(15,6,8,0.55)'
  x.fillRect(1256, 978, 664, 12)
  castShadow(x, 1256, 992, 700, 62, 0.2)
  for (const px of [1268, 1852]) castShadow(x, px + 8, 950, 110, 14, 0.22)
  // hanging porch sign with a little gold mullet
  x.strokeStyle = '#3a2a1a'
  x.lineWidth = 6
  x.beginPath()
  x.moveTo(1268, 530)
  x.lineTo(1206, 530)
  x.stroke()
  x.lineWidth = 2
  x.beginPath()
  x.moveTo(1216, 530)
  x.lineTo(1218, 548)
  x.moveTo(1252, 530)
  x.lineTo(1250, 548)
  x.stroke()
  x.fillStyle = 'rgba(20,8,10,0.4)'
  x.fillRect(1190, 552, 80, 60)
  x.fillStyle = '#20120c'
  x.fillRect(1186, 546, 80, 60)
  x.strokeStyle = PW.goldGold
  x.lineWidth = 3
  x.strokeRect(1190, 550, 72, 52)
  x.fillStyle = PW.goldHi
  x.beginPath()
  x.moveTo(1206, 588)
  x.quadraticCurveTo(1204, 570, 1222, 568)
  x.quadraticCurveTo(1238, 568, 1240, 580)
  x.quadraticCurveTo(1252, 574, 1254, 562)
  x.quadraticCurveTo(1256, 580, 1244, 588)
  x.quadraticCurveTo(1224, 594, 1206, 588)
  x.closePath()
  x.fill()

  // ---- street furniture ----
  // hitching post
  for (const px of [1240, 1372]) {
    x.fillStyle = lin(x, px, 0, px + 12, 0, [
      [0, mixHex(PW.wood, PW.woodHi, 0.3)],
      [1, PW.woodLo],
    ])
    x.fillRect(px, 862, 12, 86)
    arc(x, px + 6, 862, 6, PW.woodLo)
  }
  x.fillStyle = lin(x, 1228, 0, 1384, 0, [
    [0, mixHex(PW.wood, PW.woodHi, 0.35)],
    [1, PW.woodLo],
  ])
  x.fillRect(1228, 866, 156, 18)
  x.strokeStyle = alpha(PW.woodDark, 0.5)
  x.lineWidth = 1.5
  x.beginPath()
  x.moveTo(1228, 875)
  x.lineTo(1384, 875)
  x.stroke()
  castShadow(x, 1252, 948, 150, 18, 0.22)
  castShadow(x, 1384, 948, 130, 16, 0.22)
  // water trough
  castShadow(x, 1875, 1000, 160, 20, 0.18)
  x.fillStyle = lin(x, 1735, 0, 1875, 0, [
    [0, mixHex(PW.wood, PW.woodHi, 0.3)],
    [1, PW.woodLo],
  ])
  x.fillRect(1735, 944, 140, 50)
  x.fillStyle = '#241812'
  x.fillRect(1735, 944, 140, 8)
  x.fillStyle = '#3a3a30'
  x.fillRect(1741, 950, 128, 16)
  x.fillStyle = alpha('#e8c890', 0.55)
  x.fillRect(1748, 953, 60, 3)
  x.fillRect(1820, 958, 36, 2)
  x.strokeStyle = alpha(PW.woodDark, 0.6)
  x.lineWidth = 1.4
  for (let i = 1; i < 5; i++) {
    x.beginPath()
    x.moveTo(1735 + i * 28, 952)
    x.lineTo(1735 + i * 28, 994)
    x.stroke()
  }
  x.fillStyle = '#33241a'
  x.fillRect(1741, 994, 16, 8)
  x.fillRect(1853, 994, 16, 8)
  // HAIRLINE POP. 4,490 town sign — stands in the open foreground, left of the street
  castShadow(x, 334, 1030, 240, 28, 0.2)
  x.fillStyle = lin(x, 322, 0, 334, 0, [
    [0, mixHex(PW.wood, PW.woodHi, 0.3)],
    [1, PW.woodLo],
  ])
  x.fillRect(322, 870, 12, 162)
  signBoard(x, 330, 824, 360, 96, 'HAIRLINE POP. 4,490', { size: 34, board: '#2a1c14', frame: '#8a6238', track: 1 })

  // dust drifting across the street
  for (const [dy, dw, da] of [
    [724, 900, 0.07],
    [786, 1200, 0.05],
  ]) {
    x.fillStyle = alpha('#ecc890', da)
    x.beginPath()
    x.ellipse(960, dy, dw / 2, 16, 0, 0, 7)
    x.fill()
  }
  const dr = rng(171)
  for (let i = 0; i < 70; i++) {
    x.fillStyle = alpha('#f4dca8', 0.1 + dr() * 0.2)
    x.fillRect(200 + dr() * 1500, 680 + dr() * 260, 1.6, 1.6)
  }
  // unifying warm grade + finish
  x.fillStyle = 'rgba(255,150,60,0.05)'
  x.fillRect(0, 0, w, h)
  grain(x, w, h, 172)
  vignette(x, w, h, 0.3)
  return c
}

// ---------- saloon interior ----------
function paintSaloon() {
  const w = 1920
  const h = 1080
  const { c, x } = cv2(w, h)
  x.fillStyle = PW.salDark
  x.fillRect(0, 0, w, h)
  // back wall
  x.fillStyle = lin(x, 0, 130, 0, 730, [
    [0, PW.salWall],
    [1, PW.salWallLo],
  ])
  x.fillRect(300, 130, 1200, 600)
  x.strokeStyle = 'rgba(20,10,6,0.3)'
  x.lineWidth = 2
  for (let sx = 340; sx < 1500; sx += 90) {
    x.beginPath()
    x.moveTo(sx, 134)
    x.lineTo(sx, 726)
    x.stroke()
  }
  x.fillStyle = 'rgba(255,190,110,0.06)'
  x.fillRect(300, 130, 1200, 260)
  // wainscot
  x.fillStyle = '#2c1a10'
  x.fillRect(300, 620, 1200, 110)
  x.fillStyle = '#3a2414'
  x.fillRect(300, 616, 1200, 8)
  for (let sx = 330; sx < 1500; sx += 46) {
    x.fillStyle = 'rgba(0,0,0,0.35)'
    x.fillRect(sx, 626, 4, 100)
    x.fillStyle = 'rgba(255,200,130,0.08)'
    x.fillRect(sx + 4, 626, 2, 100)
  }
  // left wall (poster hangs on the back wall, left of the backbar)
  x.fillStyle = lin(x, 0, 0, 300, 0, [
    [0, '#241408'],
    [1, '#3a2414'],
  ])
  x.beginPath()
  x.moveTo(0, 0)
  x.lineTo(300, 130)
  x.lineTo(300, 730)
  x.lineTo(0, 940)
  x.closePath()
  x.fill()
  // right wall
  x.fillStyle = lin(x, 1500, 0, 1920, 0, [
    [0, '#3a2414'],
    [1, '#20120a'],
  ])
  x.beginPath()
  x.moveTo(1500, 130)
  x.lineTo(1920, 20)
  x.lineTo(1920, 980)
  x.lineTo(1500, 730)
  x.closePath()
  x.fill()
  // ceiling beams
  x.fillStyle = '#1a0e08'
  x.fillRect(0, 0, w, 26)
  x.fillRect(70, 52, 1850, 20)
  x.fillRect(150, 96, 1770, 18)
  x.fillStyle = 'rgba(255,190,110,0.06)'
  x.fillRect(0, 24, w, 4)
  // floor planks in perspective
  x.fillStyle = lin(x, 0, 730, 0, h, [
    [0, '#3a2214'],
    [1, '#200f08'],
  ])
  x.beginPath()
  x.moveTo(300, 730)
  x.lineTo(1500, 730)
  x.lineTo(1920, 1080)
  x.lineTo(0, 1080)
  x.closePath()
  x.fill()
  x.strokeStyle = 'rgba(14,6,4,0.55)'
  x.lineWidth = 2.5
  for (let i = 0; i <= 12; i++) {
    const bx = 300 + (1200 * i) / 12
    x.beginPath()
    x.moveTo(bx, 730)
    x.lineTo(900 + (bx - 900) * 3.1, 1080)
    x.stroke()
  }
  x.strokeStyle = 'rgba(255,200,130,0.05)'
  x.lineWidth = 1.5
  for (const fy of [800, 890, 1000]) {
    x.beginPath()
    x.moveTo(lerp(300, 0, (fy - 730) / 350), fy)
    x.lineTo(lerp(1500, 1920, (fy - 730) / 350), fy)
    x.stroke()
  }
  // poster wall spot: nail + the faint ghost of an older bill behind it
  x.fillStyle = 'rgba(255,220,170,0.03)'
  x.fillRect(330, 190, 320, 480)
  x.fillStyle = 'rgba(0,0,0,0.12)'
  x.fillRect(352, 214, 300, 408)
  arc(x, 497, 200, 5, '#5c4c3a')
  arc(x, 495, 198, 2, '#a89880')

  // backbar: mirror, shelves, bottles
  x.fillStyle = '#2a180e'
  x.fillRect(700, 690, 650, 70)
  x.fillStyle = '#3a2414'
  x.fillRect(712, 700, 626, 12)
  for (let dx = 740; dx < 1330; dx += 90) {
    x.strokeStyle = 'rgba(0,0,0,0.5)'
    x.lineWidth = 2
    x.strokeRect(dx, 716, 78, 38)
  }
  // mirror
  x.fillStyle = '#1c1210'
  x.fillRect(714, 390, 622, 300)
  const mg = lin(x, 714, 390, 1336, 690, [
    [0, 'rgba(210,190,170,0.22)'],
    [0.5, 'rgba(120,100,90,0.12)'],
    [1, 'rgba(60,44,40,0.1)'],
  ])
  x.fillStyle = mg
  x.fillRect(714, 390, 622, 300)
  for (const gx of [790, 1010, 1240]) {
    x.fillStyle = 'rgba(255,240,210,0.2)'
    x.save()
    x.translate(gx, 540)
    x.rotate(0.12)
    x.fillRect(-7, -140, 14, 280)
    x.restore()
  }
  x.strokeStyle = '#4c3018'
  x.lineWidth = 10
  x.strokeRect(714, 390, 622, 300)
  // shelves + bottles
  const bottleCol = ['#8a5a20', '#3a5a2a', '#b0a090', '#2a1a20', '#7a3a28']
  const drawBottle = (bx, by, bh2, col, gseed) => {
    const bw2 = 12 + hash(gseed) * 8
    x.fillStyle = shade(col, 0.75)
    x.fillRect(bx - bw2 / 2, by - 12, bw2, 12)
    x.fillStyle = col
    x.beginPath()
    x.moveTo(bx - bw2 / 2, by)
    x.lineTo(bx - bw2 / 2, by - bh2 + 10)
    x.quadraticCurveTo(bx - bw2 / 2, by - bh2, bx - bw2 / 2 + 4, by - bh2)
    x.lineTo(bx + bw2 / 2 - 4, by - bh2)
    x.quadraticCurveTo(bx + bw2 / 2, by - bh2, bx + bw2 / 2, by - bh2 + 10)
    x.lineTo(bx + bw2 / 2, by)
    x.closePath()
    x.fill()
    x.fillStyle = shade(col, 0.7)
    x.fillRect(bx - 2.5, by - bh2 - 8, 5, 8)
    x.fillStyle = alpha('#ffe2a0', 0.55)
    x.fillRect(bx - bw2 / 2 + 2, by - bh2 + 6, 2.5, bh2 - 12)
    if (hash(gseed * 7) > 0.6) {
      x.fillStyle = alpha('#fff4d8', 0.8)
      x.fillRect(bx - bw2 / 2 + 2, by - bh2 + 8, 2.5, 6)
    }
  }
  for (const sy of [545, 470]) {
    x.fillStyle = '#3a2414'
    x.fillRect(722, sy, 606, 10)
    x.fillStyle = alpha(PW.lamp, 0.25)
    x.fillRect(722, sy, 606, 3)
    let bx = 748
    let k = 0
    while (bx < 1300) {
      const bh2 = 34 + hash(sy * 13 + k * 7) * 20
      drawBottle(bx, sy - 2, bh2, bottleCol[Math.floor(hash(sy + k * 3.3) * bottleCol.length)], sy * 31 + k * 11)
      bx += 22 + hash(k * 5.1 + sy) * 26
      k++
    }
  }
  let bx2 = 760
  let k2 = 0
  while (bx2 < 1300) {
    drawBottle(
      bx2,
      692,
      40 + hash(k2 * 9.7) * 22,
      bottleCol[Math.floor(hash(k2 * 4.4) * bottleCol.length)],
      500 + k2 * 13
    )
    bx2 += 30 + hash(k2 * 7.7) * 30
    k2++
  }
  // wall oil lamps with pools of light
  for (const [lx, ly] of [
    [660, 316],
    [1400, 308],
  ]) {
    glow(x, lx, ly, 190, PW.lamp, 0.26)
    x.fillStyle = lin(x, 0, ly, 0, ly + 240, [
      [0, alpha(PW.lamp, 0.12)],
      [1, alpha(PW.lamp, 0)],
    ])
    x.fillRect(lx - 90, ly, 180, 240)
    x.fillStyle = '#6a5426'
    x.fillRect(lx - 3, ly - 46, 6, 22)
    x.beginPath()
    x.ellipse(lx, ly + 8, 16, 9, 0, 0, 7)
    x.fill()
    x.fillStyle = '#8a7442'
    x.beginPath()
    x.ellipse(lx, ly - 2, 11, 13, 0, 0, 7)
    x.fill()
    x.fillStyle = 'rgba(255,240,210,0.5)'
    x.beginPath()
    x.ellipse(lx, ly - 6, 7, 10, 0, 0, 7)
    x.fill()
    arc(x, lx, ly - 10, 3.5, '#fff6dc')
    x.strokeStyle = '#4c3a18'
    x.lineWidth = 3
    x.beginPath()
    x.ellipse(lx, ly - 4, 12, 15, 0, 0, 7)
    x.stroke()
  }
  // hanging lamp over the bar
  x.strokeStyle = '#241812'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(880, 0)
  x.lineTo(880, 148)
  x.stroke()
  glow(x, 880, 196, 270, PW.lamp, 0.22)
  x.fillStyle = '#1e3a2a'
  x.beginPath()
  x.moveTo(846, 196)
  x.lineTo(914, 196)
  x.lineTo(898, 156)
  x.lineTo(862, 156)
  x.closePath()
  x.fill()
  x.fillStyle = alpha(PW.lamp, 0.75)
  x.fillRect(852, 194, 56, 5)
  arc(x, 880, 202, 9, '#fff0c8')
  x.fillStyle = alpha(PW.lamp, 0.1)
  x.beginPath()
  x.ellipse(880, 700, 300, 44, 0, 0, 7)
  x.fill()

  // window on the right wall + light shafts
  x.fillStyle = '#2a1a10'
  x.beginPath()
  x.moveTo(1632, 258)
  x.lineTo(1846, 232)
  x.lineTo(1846, 528)
  x.lineTo(1632, 566)
  x.closePath()
  x.fill()
  const shg = lin(x, 1632, 300, 1846, 400, [
    [0, '#fff3d2'],
    [1, '#ffdba0'],
  ])
  x.fillStyle = shg
  x.beginPath()
  x.moveTo(1644, 268)
  x.lineTo(1834, 244)
  x.lineTo(1834, 518)
  x.lineTo(1644, 556)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(60,36,18,0.85)'
  x.fillRect(1730, 240, 10, 320)
  x.beginPath()
  x.moveTo(1638, 404)
  x.lineTo(1840, 378)
  x.lineTo(1840, 392)
  x.lineTo(1638, 420)
  x.closePath()
  x.fill()
  glow(x, 1740, 390, 260, '#ffedc0', 0.2)
  // three shafts angling down-left, dust motes baked in
  for (const [t0, t1, a] of [
    [0.12, 0.4, 0.16],
    [0.45, 0.68, 0.13],
    [0.74, 0.92, 0.1],
  ]) {
    const wy0 = lerp(250, 550, t0)
    const wy1 = lerp(250, 550, t1)
    const g = lin(x, 1700, 380, 1150, 960, [
      [0, `rgba(255,220,160,${a})`],
      [1, 'rgba(255,220,160,0)'],
    ])
    x.fillStyle = g
    x.beginPath()
    x.moveTo(1640, wy0)
    x.lineTo(1640, wy1)
    x.lineTo(1080 + (wy1 - wy0), 1000)
    x.lineTo(1080 + (wy0 - 260), 900)
    x.closePath()
    x.fill()
  }
  const dr = rng(211)
  for (let i = 0; i < 90; i++) {
    const t = dr()
    const mx = lerp(1660, 1080, t) + (dr() - 0.5) * 420
    const my = lerp(290, 980, t ** 0.85) + (dr() - 0.5) * 240
    x.fillStyle = alpha('#ffe8bc', 0.05 + dr() * 0.16 * (1 - t * 0.6))
    x.fillRect(mx, my, 1.4 + dr(), 1.4 + dr())
  }

  // bar counter
  x.fillStyle = '#7a5433'
  x.fillRect(600, 676, 870, 20)
  x.fillStyle = alpha(PW.woodHi, 0.5)
  x.fillRect(600, 676, 870, 4)
  x.fillStyle = lin(x, 0, 696, 0, 802, [
    [0, '#5a3a22'],
    [1, '#33200f'],
  ])
  x.fillRect(620, 696, 830, 106)
  for (let dx = 650; dx < 1450; dx += 64) {
    x.fillStyle = 'rgba(0,0,0,0.3)'
    x.fillRect(dx, 700, 4, 98)
    x.fillStyle = 'rgba(255,200,130,0.07)'
    x.fillRect(dx + 4, 700, 2, 98)
  }
  x.strokeStyle = 'rgba(0,0,0,0.4)'
  x.lineWidth = 3
  x.strokeRect(640, 716, 790, 70)
  x.fillStyle = '#8a6a30'
  x.beginPath()
  x.moveTo(596, 812)
  x.quadraticCurveTo(1020, 824, 1476, 812)
  x.lineTo(1476, 822)
  x.quadraticCurveTo(1020, 834, 596, 822)
  x.closePath()
  x.fill()
  x.fillStyle = alpha('#ffe2a0', 0.5)
  x.fillRect(700, 815, 60, 2.5)
  x.fillRect(1100, 818, 80, 2.5)
  // bar clutter: glasses, bottles, strop
  for (const gx of [700, 742, 1240]) {
    x.fillStyle = 'rgba(255,240,210,0.16)'
    x.beginPath()
    x.ellipse(gx, 672, 13, 5, 0, 0, 7)
    x.fill()
    x.fillStyle = 'rgba(255,230,180,0.3)'
    x.fillRect(gx - 9, 656, 18, 16)
  }
  drawBottle(1180, 678, 46, '#7a3a28', 601)
  drawBottle(1214, 678, 52, '#3a5a2a', 615)
  // razor + strop over the counter end
  x.fillStyle = '#5a3a24'
  x.beginPath()
  x.moveTo(1428, 694)
  x.quadraticCurveTo(1444, 760, 1436, 852)
  x.lineTo(1424, 850)
  x.quadraticCurveTo(1428, 764, 1416, 698)
  x.closePath()
  x.fill()
  x.fillStyle = '#8a8a92'
  x.fillRect(1419, 848, 18, 12)
  x.fillStyle = '#d8dce4'
  x.fillRect(1462, 664, 26, 5)
  x.fillStyle = '#3a2a1a'
  x.fillRect(1460, 662, 6, 9)

  // round tables + chairs
  const chair = (cx, cy, s, flip = 1) => {
    x.save()
    x.translate(cx, cy)
    x.scale(s * flip, s)
    x.fillStyle = '#3a2414'
    x.fillRect(-4, -96, 8, 96)
    x.fillRect(-4, -88, 44, 7)
    x.fillRect(-4, -62, 44, 6)
    x.fillStyle = '#4c3018'
    x.fillRect(-4, -30, 52, 10)
    x.fillRect(40, -24, 7, 58)
    x.fillRect(-4, -24, 7, 56)
    x.restore()
  }
  const table = (tx, ty, tr, fry) => {
    x.fillStyle = 'rgba(0,0,0,0.4)'
    x.beginPath()
    x.ellipse(tx + 6, fry + 4, tr * 1.02, 10, 0, 0, 7)
    x.fill()
    x.fillStyle = '#241812'
    x.beginPath()
    x.moveTo(tx - 10, ty)
    x.lineTo(tx + 10, ty)
    x.lineTo(tx + 14, fry)
    x.lineTo(tx - 14, fry)
    x.closePath()
    x.fill()
    x.fillStyle = lin(x, tx - tr, ty - tr * 0.32, tx + tr, ty + tr * 0.32, [
      [0, '#8a6240'],
      [0.5, '#6a462a'],
      [1, '#4a2e18'],
    ])
    x.beginPath()
    x.ellipse(tx, ty, tr, tr * 0.32, 0, 0, 7)
    x.fill()
    x.fillStyle = alpha(PW.lamp, 0.14)
    x.beginPath()
    x.ellipse(tx - tr * 0.3, ty - tr * 0.08, tr * 0.5, tr * 0.12, 0, 0, 7)
    x.fill()
    x.strokeStyle = 'rgba(20,8,6,0.5)'
    x.lineWidth = 2
    x.beginPath()
    x.ellipse(tx, ty, tr, tr * 0.32, 0, 0, 7)
    x.stroke()
  }
  table(820, 802, 80, 872)
  chair(920, 836, 0.8, -1)
  table(1210, 884, 94, 958)
  chair(1096, 916, 0.9)
  chair(1330, 928, 0.95, -1)
  table(1610, 975, 108, 1050)
  chair(1488, 1006, 1)
  x.fillStyle = 'rgba(255,230,180,0.3)'
  x.beginPath()
  x.ellipse(1210, 880, 10, 4, 0, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(255,230,180,0.28)'
  x.beginPath()
  x.ellipse(1610, 968, 12, 5, 0, 0, 7)
  x.fill()
  drawBottle(1610, 962, 40, '#8a5a20', 631)
  // spittoon by the bar
  x.fillStyle = 'rgba(0,0,0,0.4)'
  x.beginPath()
  x.ellipse(1482, 852, 30, 8, 0, 0, 7)
  x.fill()
  x.fillStyle = '#2e2a28'
  x.beginPath()
  x.ellipse(1478, 842, 26, 11, 0, 0, 7)
  x.fill()
  x.fillStyle = '#171414'
  x.beginPath()
  x.ellipse(1478, 840, 19, 7, 0, 0, 7)
  x.fill()
  x.strokeStyle = alpha('#8a827c', 0.6)
  x.lineWidth = 2
  x.beginPath()
  x.ellipse(1478, 842, 26, 11, 0, Math.PI + 0.4, -0.3)
  x.stroke()
  // warm grade + finish
  x.fillStyle = 'rgba(255,150,60,0.05)'
  x.fillRect(0, 0, w, h)
  x.fillStyle = lin(x, 0, 0, 260, 0, [
    [0, 'rgba(10,4,6,0.4)'],
    [1, 'rgba(10,4,6,0)'],
  ])
  x.fillRect(0, 0, 260, h)
  x.fillStyle = lin(x, 1920, 0, 1660, 0, [
    [0, 'rgba(10,4,6,0.38)'],
    [1, 'rgba(10,4,6,0)'],
  ])
  x.fillRect(1660, 0, 260, h)
  grain(x, w, h, 221, 1600, 0.045)
  vignette(x, w, h, 0.36)
  return c
}

// ---------- wanted poster (560×760) ----------
function paintPoster() {
  const w = 560
  const h = 760
  const { c, x } = cv2(w, h)
  const ink = PW.paperInk
  x.fillStyle = lin(x, 0, 0, w, h, [
    [0, PW.paperHi],
    [0.5, PW.paper],
    [1, PW.paperLo],
  ])
  x.fillRect(0, 0, w, h)
  // age: stains, ring, flecks, creases
  const r = rng(301)
  for (let i = 0; i < 7; i++) {
    const gx = r() * w
    const gy = r() * h
    const gr = 40 + r() * 110
    const g = x.createRadialGradient(gx, gy, 0, gx, gy, gr)
    g.addColorStop(0, `rgba(122,88,44,${0.08 + r() * 0.1})`)
    g.addColorStop(1, 'rgba(122,88,44,0)')
    x.fillStyle = g
    x.fillRect(gx - gr, gy - gr, gr * 2, gr * 2)
  }
  x.strokeStyle = 'rgba(120,80,40,0.16)'
  x.lineWidth = 6
  x.beginPath()
  x.arc(452, 612, 38, 0.4, 5.6)
  x.stroke()
  for (let i = 0; i < 420; i++) {
    x.fillStyle = i % 3 ? 'rgba(90,62,30,0.07)' : 'rgba(255,248,230,0.09)'
    x.fillRect(r() * w, r() * h, 1.6, 1.1)
  }
  x.fillStyle = 'rgba(90,62,30,0.08)'
  x.fillRect(186, 40, 2.5, 700)
  x.fillRect(372, 40, 2, 700)
  x.fillStyle = lin(x, 0, 0, 0, h, [
    [0, 'rgba(60,36,16,0.12)'],
    [0.15, 'rgba(60,36,16,0)'],
    [0.85, 'rgba(60,36,16,0)'],
    [1, 'rgba(60,36,16,0.16)'],
  ])
  x.fillRect(0, 0, w, h)
  // double border
  x.strokeStyle = ink
  x.lineWidth = 5
  x.strokeRect(26, 26, 508, 708)
  x.lineWidth = 2
  x.strokeRect(37, 37, 486, 686)
  // head-line block
  txt(x, 'WANTED', 280, 128, { size: 98, color: ink, align: 'center', track: 8, font: F.anton })
  x.fillStyle = ink
  x.fillRect(92, 150, 376, 5)
  txt(x, 'THE CABALD', 280, 204, { size: 46, color: ink, align: 'center', track: 9, font: F.anton })
  // three abstract bald domes, shiny under the noon sun
  const dome = (dx, dy, s, tilt) => {
    x.save()
    x.translate(dx, dy)
    x.rotate(tilt)
    x.scale(s, s)
    x.fillStyle = ink
    x.beginPath()
    x.ellipse(0, 0, 42, 48, 0, 0, 7)
    x.fill()
    x.beginPath()
    x.moveTo(-62, 96)
    x.quadraticCurveTo(-58, 40, 0, 38)
    x.quadraticCurveTo(58, 40, 62, 96)
    x.closePath()
    x.fill()
    x.strokeStyle = 'rgba(242,232,204,0.8)'
    x.lineWidth = 4
    x.lineCap = 'round'
    x.beginPath()
    x.arc(-4, -6, 32, Math.PI * 1.06, Math.PI * 1.5)
    x.stroke()
    x.strokeStyle = 'rgba(242,232,204,0.4)'
    x.lineWidth = 2.4
    x.beginPath()
    x.arc(2, -4, 22, Math.PI * 1.14, Math.PI * 1.48)
    x.stroke()
    x.fillStyle = 'rgba(242,232,204,0.9)'
    x.beginPath()
    x.ellipse(-16, -26, 4.5, 2.6, -0.7, 0, 7)
    x.fill()
    x.restore()
  }
  dome(146, 302, 0.9, -0.05)
  dome(414, 302, 0.9, 0.05)
  dome(280, 292, 1.14, 0)
  x.fillStyle = ink
  x.fillRect(60, 416, 440, 4)
  txt(x, 'FOR FORCEFUL SHAVINGS', 280, 468, { size: 31, color: ink, align: 'center', track: 4, font: F.anton })
  x.fillRect(92, 492, 376, 3)
  txt(x, 'REWARD', 280, 540, { size: 36, color: ink, align: 'center', track: 10, font: F.anton })
  txt(x, 'THE GOLDEN MULLET', 280, 598, {
    size: 44,
    color: PW.goldGold,
    align: 'center',
    track: 2,
    font: F.anton,
    shadow: 'rgba(90,62,20,0.35)',
  })
  txt(x, 'HAIRLINE TERRITORIAL BANK', 280, 700, {
    size: 21,
    color: '#6a5034',
    align: 'center',
    track: 3,
    font: F.anton,
  })
  // torn bottom-right corner (paper gone, edge curls)
  x.globalCompositeOperation = 'destination-out'
  x.beginPath()
  x.moveTo(w + 2, 636)
  x.lineTo(478, 690)
  x.lineTo(452, 714)
  x.lineTo(492, 726)
  x.lineTo(470, 762)
  x.lineTo(w + 2, 762)
  x.closePath()
  x.fill()
  x.globalCompositeOperation = 'source-over'
  x.strokeStyle = 'rgba(244,236,216,0.85)'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(w, 638)
  x.lineTo(478, 690)
  x.lineTo(452, 714)
  x.lineTo(492, 726)
  x.lineTo(470, 760)
  x.stroke()
  x.strokeStyle = 'rgba(60,36,16,0.4)'
  x.lineWidth = 5
  x.beginPath()
  x.moveTo(w - 4, 648)
  x.lineTo(482, 694)
  x.stroke()
  // tack pin, top centre
  x.fillStyle = 'rgba(40,20,10,0.4)'
  x.beginPath()
  x.ellipse(280, 34, 14, 5, 0, 0, 7)
  x.fill()
  arc(x, 280, 22, 10, '#4a4440')
  arc(x, 277, 19, 4, '#8a827c')
  arc(x, 283, 25, 2, '#2c2826')
  grain(x, w, h, 302, 700, 0.04)
  return c
}

// ---------- creatures & props ----------
// four gallop phases of a distant rider, near-black against the haze
function gallopFrame(phase) {
  const { c, x } = cv2(150, 110)
  const ink = '#150e13'
  const far = '#2b1b26'
  const bob = [-4, -1, 0, -2][phase]
  const limb = (col, ax, ay, bx, by, cx2, cy2, w0, w1) => {
    x.strokeStyle = col
    x.lineCap = 'round'
    x.lineWidth = w0
    x.beginPath()
    x.moveTo(ax, ay)
    x.lineTo(bx, by)
    x.stroke()
    x.lineWidth = w1
    x.beginPath()
    x.moveTo(bx, by)
    x.lineTo(cx2, cy2)
    x.stroke()
    arc(x, cx2, cy2, w1 * 0.62, col)
  }
  x.save()
  x.translate(0, bob)
  const poses = [
    {
      ff: [62, 58, 42, 78, 30, 100],
      fh: [94, 56, 110, 80, 122, 102],
      nf: [58, 58, 34, 72, 18, 96],
      nh: [98, 56, 118, 74, 134, 98],
    },
    {
      ff: [62, 58, 50, 82, 64, 96],
      fh: [94, 56, 114, 78, 128, 94],
      nf: [58, 58, 44, 80, 56, 92],
      nh: [98, 56, 122, 72, 140, 88],
    },
    {
      ff: [62, 58, 46, 80, 40, 100],
      fh: [94, 56, 104, 84, 94, 102],
      nf: [58, 58, 40, 76, 30, 98],
      nh: [98, 56, 108, 82, 96, 100],
    },
    {
      ff: [62, 58, 44, 76, 34, 98],
      fh: [94, 56, 104, 84, 108, 102],
      nf: [58, 58, 36, 70, 22, 94],
      nh: [98, 56, 112, 80, 118, 100],
    },
  ][phase]
  // far pair first
  limb(far, poses.fh[0], poses.fh[1], poses.fh[2], poses.fh[3], poses.fh[4], poses.fh[5], 8, 5)
  limb(far, poses.ff[0], poses.ff[1], poses.ff[2], poses.ff[3], poses.ff[4], poses.ff[5], 8, 5)
  // body + neck + head
  x.fillStyle = ink
  x.beginPath()
  x.moveTo(46, 46)
  x.bezierCurveTo(58, 33, 92, 31, 108, 40)
  x.bezierCurveTo(117, 44, 119, 55, 112, 63)
  x.bezierCurveTo(104, 75, 84, 79, 70, 76)
  x.bezierCurveTo(58, 74, 50, 65, 46, 56)
  x.closePath()
  x.fill()
  x.beginPath()
  x.moveTo(50, 52)
  x.quadraticCurveTo(38, 36, 32, 24)
  x.lineTo(42, 16)
  x.quadraticCurveTo(52, 34, 60, 44)
  x.closePath()
  x.fill()
  x.beginPath()
  x.ellipse(28, 26, 10, 8, -0.4, 0, 7)
  x.fill()
  x.beginPath()
  x.moveTo(20, 30)
  x.lineTo(10, 34)
  x.lineTo(20, 36)
  x.closePath()
  x.fill()
  x.beginPath()
  x.moveTo(30, 18)
  x.lineTo(34, 10)
  x.lineTo(38, 18)
  x.closePath()
  x.fill()
  // tail + mane
  x.strokeStyle = ink
  x.lineWidth = 5
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(110, 44)
  x.quadraticCurveTo(122, 50, 126, 60)
  x.stroke()
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(36, 22)
  x.quadraticCurveTo(44, 30, 50, 40)
  x.stroke()
  // rider: forward lean, hat blob, rein arm
  x.beginPath()
  x.moveTo(80, 44)
  x.quadraticCurveTo(84, 26, 76, 16)
  x.lineTo(88, 12)
  x.quadraticCurveTo(94, 30, 92, 44)
  x.closePath()
  x.fill()
  arc(x, 74, 11, 7, ink)
  x.beginPath()
  x.ellipse(74, 8, 13, 3.6, 0, 0, 7)
  x.fill()
  x.fillRect(68, 1, 12, 7)
  x.lineWidth = 5
  x.beginPath()
  x.moveTo(78, 18)
  x.lineTo(58, 30)
  x.stroke()
  x.beginPath()
  x.moveTo(88, 42)
  x.lineTo(76, 52)
  x.lineTo(68, 60)
  x.stroke()
  // near pair on top
  limb(ink, poses.nh[0], poses.nh[1], poses.nh[2], poses.nh[3], poses.nh[4], poses.nh[5], 9, 5.5)
  limb(ink, poses.nf[0], poses.nf[1], poses.nf[2], poses.nf[3], poses.nf[4], poses.nf[5], 9, 5.5)
  x.restore()
  // golden-hour rim along the back
  x.strokeStyle = 'rgba(255,150,80,0.4)'
  x.lineWidth = 1.8
  x.beginPath()
  x.moveTo(50, 42 + bob)
  x.bezierCurveTo(64, 30 + bob, 92, 28 + bob, 110, 38 + bob)
  x.stroke()
  return c
}
// standing chestnut facing LEFT; tailA/tailB are 360×270 overlays aligned with c (swish swap)
function bakeHorse() {
  const base = '#9a5c32'
  const lit = '#c4854e'
  const shd = '#6b3b1f'
  const mane = '#33200f'
  const mk = () => cv2(360, 270)
  const { c, x } = mk()
  // ground contact shadow
  x.fillStyle = 'rgba(30,12,10,0.28)'
  x.beginPath()
  x.ellipse(190, 250, 128, 13, 0, 0, 7)
  x.fill()
  // far legs (mostly hidden behind the body, just peeking below)
  x.lineCap = 'round'
  for (const [fx, fy, hx, hy, ex, ey] of [
    [140, 150, 136, 198, 130, 238],
    [268, 150, 276, 198, 268, 236],
  ]) {
    x.lineWidth = 14
    x.strokeStyle = shade(shd, 0.9)
    x.beginPath()
    x.moveTo(fx, fy)
    x.lineTo(hx, hy)
    x.stroke()
    x.lineWidth = 9
    x.beginPath()
    x.moveTo(hx, hy)
    x.lineTo(ex, ey)
    x.stroke()
    x.fillStyle = '#241610'
    x.fillRect(ex - 7, ey, 16, 9)
  }
  // body
  x.fillStyle = base
  x.beginPath()
  x.moveTo(112, 100)
  x.bezierCurveTo(128, 78, 160, 70, 200, 80)
  x.bezierCurveTo(238, 78, 268, 80, 288, 98)
  x.bezierCurveTo(302, 112, 304, 132, 292, 148)
  x.bezierCurveTo(278, 164, 246, 170, 210, 170)
  x.bezierCurveTo(172, 170, 138, 162, 120, 140)
  x.bezierCurveTo(108, 126, 106, 112, 112, 100)
  x.closePath()
  x.fill()
  // neck + head, merged into the shoulder
  x.fillStyle = base
  x.beginPath()
  x.moveTo(110, 118)
  x.quadraticCurveTo(88, 74, 84, 42)
  x.quadraticCurveTo(96, 22, 122, 30)
  x.quadraticCurveTo(146, 58, 164, 92)
  x.quadraticCurveTo(140, 108, 110, 118)
  x.closePath()
  x.fill()
  x.beginPath()
  x.moveTo(84, 44)
  x.quadraticCurveTo(70, 54, 58, 84)
  x.quadraticCurveTo(50, 98, 58, 102)
  x.quadraticCurveTo(76, 108, 96, 96)
  x.quadraticCurveTo(104, 66, 96, 42)
  x.closePath()
  x.fill()
  // shading: lit top-left, shaded belly + rump
  x.strokeStyle = lit
  x.lineCap = 'round'
  x.globalAlpha = 0.85
  x.lineWidth = 12
  x.beginPath()
  x.moveTo(126, 92)
  x.bezierCurveTo(160, 76, 210, 82, 260, 90)
  x.stroke()
  x.lineWidth = 9
  x.beginPath()
  x.moveTo(100, 46)
  x.quadraticCurveTo(110, 58, 126, 72)
  x.stroke()
  x.globalAlpha = 0.45
  x.strokeStyle = shd
  x.lineWidth = 14
  x.beginPath()
  x.moveTo(150, 158)
  x.bezierCurveTo(200, 168, 250, 162, 282, 142)
  x.stroke()
  x.globalAlpha = 0.28
  x.fillStyle = shd
  x.beginPath()
  x.ellipse(270, 118, 20, 34, 0.2, 0, 7)
  x.fill()
  x.globalAlpha = 1
  // near legs
  const leg = (ax, ay, bx, by, cx2, cy2, w0, w1) => {
    x.strokeStyle = base
    x.lineCap = 'round'
    x.lineWidth = w0
    x.beginPath()
    x.moveTo(ax, ay)
    x.lineTo(bx, by)
    x.stroke()
    x.lineWidth = w1
    x.beginPath()
    x.moveTo(bx, by)
    x.lineTo(cx2, cy2)
    x.stroke()
    x.fillStyle = '#241610'
    x.fillRect(cx2 - 8, cy2, 18, 10)
    x.strokeStyle = shd
    x.lineWidth = 2
    x.beginPath()
    x.moveTo(ax + w0 * 0.3, ay + 8)
    x.lineTo(bx + 3, by)
    x.stroke()
  }
  leg(132, 140, 126, 192, 118, 236, 17, 10)
  leg(272, 138, 282, 192, 268, 238, 18, 11)
  // muzzle, eye, ears, blaze
  x.fillStyle = shade(base, 0.72)
  x.beginPath()
  x.ellipse(60, 96, 14, 10, -0.3, 0, 7)
  x.fill()
  arc(x, 62, 94, 2.2, '#2a1a12')
  x.strokeStyle = '#2a1a12'
  x.lineWidth = 1.6
  x.beginPath()
  x.moveTo(52, 102)
  x.quadraticCurveTo(58, 105, 64, 102)
  x.stroke()
  arc(x, 88, 62, 4, '#1c100a')
  arc(x, 87, 61, 1.3, '#e8dcc8')
  x.fillStyle = base
  x.beginPath()
  x.moveTo(84, 40)
  x.lineTo(90, 18)
  x.lineTo(101, 34)
  x.closePath()
  x.fill()
  x.beginPath()
  x.moveTo(103, 35)
  x.lineTo(113, 20)
  x.lineTo(118, 37)
  x.closePath()
  x.fill()
  x.fillStyle = shade(base, 0.85)
  x.beginPath()
  x.moveTo(90, 20)
  x.lineTo(93, 32)
  x.lineTo(98, 31)
  x.closePath()
  x.fill()
  // white blaze down the face
  x.fillStyle = 'rgba(238,226,208,0.95)'
  x.beginPath()
  x.moveTo(84, 46)
  x.quadraticCurveTo(72, 68, 62, 90)
  x.quadraticCurveTo(66, 96, 72, 94)
  x.quadraticCurveTo(82, 70, 92, 50)
  x.closePath()
  x.fill()
  // mane + forelock
  x.fillStyle = mane
  x.beginPath()
  x.moveTo(84, 40)
  x.bezierCurveTo(96, 40, 120, 52, 148, 80)
  x.quadraticCurveTo(138, 88, 124, 82)
  x.bezierCurveTo(106, 68, 92, 54, 80, 48)
  x.closePath()
  x.fill()
  x.strokeStyle = mane
  x.lineWidth = 3
  x.lineCap = 'round'
  const mr = rng(401)
  for (let i = 0; i < 8; i++) {
    const t = i / 8
    const sx2 = lerp(88, 146, t)
    const sy2 = lerp(44, 78, t)
    x.beginPath()
    x.moveTo(sx2, sy2)
    x.quadraticCurveTo(sx2 + 4 + mr() * 6, sy2 + 10, sx2 - 2 + mr() * 8, sy2 + 16)
    x.stroke()
  }
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(84, 42)
  x.quadraticCurveTo(76, 54, 80, 62)
  x.stroke()
  // bridle + hanging reins
  x.strokeStyle = '#241812'
  x.lineWidth = 4.5
  x.beginPath()
  x.moveTo(92, 40)
  x.lineTo(70, 84)
  x.stroke()
  x.beginPath()
  x.moveTo(60, 80)
  x.quadraticCurveTo(76, 92, 96, 88)
  x.stroke()
  x.beginPath()
  x.moveTo(86, 38)
  x.lineTo(102, 44)
  x.stroke()
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(100, 42)
  x.quadraticCurveTo(112, 66, 108, 92)
  x.stroke()
  x.strokeStyle = '#8a7a5c'
  x.lineWidth = 2.5
  arc2(x, 58, 94, 6)
  x.strokeStyle = '#241812'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(58, 98)
  x.quadraticCurveTo(84, 136, 104, 160)
  x.quadraticCurveTo(116, 178, 112, 200)
  x.stroke()
  x.globalAlpha = 0.65
  x.beginPath()
  x.moveTo(60, 100)
  x.quadraticCurveTo(90, 142, 120, 172)
  x.quadraticCurveTo(130, 186, 126, 206)
  x.stroke()
  x.globalAlpha = 1
  x.strokeStyle = alpha(lit, 0.35)
  x.lineWidth = 2
  x.beginPath()
  x.moveTo(120, 96)
  x.bezierCurveTo(160, 78, 220, 82, 270, 92)
  x.stroke()
  // dock bump so the tail anchors read on the body itself
  x.fillStyle = shade(shd, 1.05)
  x.beginPath()
  x.ellipse(286, 102, 11, 15, 0.3, 0, 7)
  x.fill()
  // tail overlays, aligned 1:1 with c (draw at the same x/y)
  const tail = (swish) => {
    const t = mk()
    const tx = t.x
    tx.fillStyle = '#5f351d'
    tx.beginPath()
    if (swish) {
      // flicked out to the back, tip drooping
      tx.moveTo(280, 92)
      tx.bezierCurveTo(318, 78, 346, 88, 350, 116)
      tx.quadraticCurveTo(352, 138, 342, 158)
      tx.lineTo(330, 152)
      tx.quadraticCurveTo(340, 128, 332, 110)
      tx.bezierCurveTo(322, 94, 300, 98, 290, 106)
    } else {
      // hanging, slight curve
      tx.moveTo(280, 92)
      tx.bezierCurveTo(314, 118, 324, 164, 316, 214)
      tx.quadraticCurveTo(314, 222, 306, 220)
      tx.bezierCurveTo(310, 172, 300, 130, 282, 108)
    }
    tx.closePath()
    tx.fill()
    // strand texture
    tx.strokeStyle = '#4c2815'
    tx.lineWidth = 2.4
    tx.lineCap = 'round'
    const tr = rng(swish ? 411 : 412)
    for (let i = 0; i < 7; i++) {
      const t2 = 0.12 + tr() * 0.72
      tx.beginPath()
      if (swish) {
        tx.moveTo(lerp(292, 336, t2), lerp(96, 104, t2))
        tx.quadraticCurveTo(lerp(310, 346, t2), lerp(90, 116, t2), lerp(318, 344, t2), lerp(104, 148, t2))
      } else {
        tx.moveTo(lerp(290, 312, t2), lerp(104, 128, t2))
        tx.quadraticCurveTo(lerp(304, 318, t2) + 4, lerp(134, 180, t2), lerp(306, 312, t2), lerp(166, 218, t2))
      }
      tx.stroke()
    }
    // warm rim on the lit (left/top) edge
    tx.strokeStyle = 'rgba(200,140,90,0.45)'
    tx.lineWidth = 1.8
    tx.beginPath()
    if (swish) {
      tx.moveTo(282, 90)
      tx.bezierCurveTo(318, 76, 344, 86, 349, 114)
    } else {
      tx.moveTo(282, 94)
      tx.bezierCurveTo(312, 120, 322, 164, 314, 212)
    }
    tx.stroke()
    return t.c
  }
  return { c, tailA: tail(false), tailB: tail(true) }
}
// small circle stroke helper (bit ring)
function arc2(x, cx, cy, r2) {
  x.beginPath()
  x.arc(cx, cy, r2, 0, 7)
  x.stroke()
}
// batwing half-doors, hinge on the OUTER canvas edge
function bakeDoor(left) {
  const { c, x } = cv2(150, 230)
  x.save()
  if (!left) {
    x.translate(150, 0)
    x.scale(-1, 1)
  }
  // plank field
  const planks = [
    [8, 36],
    [46, 36],
    [84, 32],
    [118, 26],
  ]
  for (let i = 0; i < planks.length; i++) {
    const [px, pw] = planks[i]
    x.fillStyle = lin(x, px, 0, px + pw, 0, [
      [0, mixHex(PW.wood, PW.woodHi, 0.3)],
      [1, PW.woodLo],
    ])
    x.fillRect(px, 6, pw, 218)
    x.strokeStyle = alpha(PW.woodDark, 0.4)
    x.lineWidth = 1.4
    for (let k = 0; k < 2; k++) {
      const gx = px + 6 + k * (pw - 12)
      x.beginPath()
      for (let s = 0; s <= 6; s++) {
        const gy = 10 + (210 * s) / 6
        const wob = (vnoise(px * 0.21 + s * 1.3 + k * 7, left ? 5 : 9) - 0.5) * 5
        if (s === 0) x.moveTo(gx + wob, gy)
        else x.lineTo(gx + wob, gy)
      }
      x.stroke()
    }
    x.fillStyle = alpha(PW.woodDark, 0.5)
    x.fillRect(px + pw, 6, 2, 218)
    nail(x, px + 5, 14)
    nail(x, px + 5, 216)
    nail(x, px + pw - 5, 14)
    nail(x, px + pw - 5, 216)
  }
  // shaped top + bottom wear
  x.fillStyle = shade(PW.woodLo, 0.85)
  x.fillRect(8, 6, 136, 7)
  x.fillStyle = alpha(PW.woodDark, 0.45)
  x.fillRect(8, 208, 136, 16)
  // iron hinge straps anchored at the OUTER (hinge) edge
  for (const hy of [42, 162]) {
    x.fillStyle = PW.iron
    x.beginPath()
    x.moveTo(0, hy)
    x.lineTo(72, hy - 3)
    x.lineTo(78, hy + 6)
    x.lineTo(72, hy + 14)
    x.lineTo(0, hy + 16)
    x.closePath()
    x.fill()
    x.fillStyle = alpha(PW.ironHi, 0.8)
    x.fillRect(0, hy + 1, 70, 2)
    x.fillStyle = PW.ironLo
    x.fillRect(0, hy + 12, 70, 3)
    arc(x, 5, hy + 8, 6, PW.ironLo)
    arc(x, 5, hy + 8, 3, PW.ironHi)
    nail(x, 60, hy + 6, 2.2)
  }
  // subtle sun-side light (hinge edge reads as the lit edge)
  x.fillStyle = left ? alpha(PW.sandHi, 0.14) : alpha(PW.sandHi, 0.05)
  x.fillRect(left ? 8 : 130, 6, 14, 218)
  x.restore()
  return c
}
function bakeWindmill() {
  // tower: wooden lattice A-frame
  const tw = cv2(90, 350)
  const legs = [
    [12, 350, 38, 20],
    [78, 350, 52, 20],
  ]
  for (const [x0, y0, x1, y1] of legs) {
    tw.x.strokeStyle = lin(tw.x, x0, 0, x1, 0, [
      [0, mixHex(PW.wood, PW.woodHi, 0.35)],
      [1, PW.woodLo],
    ])
    tw.x.lineWidth = 9
    tw.x.lineCap = 'round'
    tw.x.beginPath()
    tw.x.moveTo(x0, y0)
    tw.x.lineTo(x1, y1)
    tw.x.stroke()
  }
  const legX = (y) => lerp(12, 38, 1 - (y - 20) / 330)
  const legX2 = (y) => lerp(78, 52, 1 - (y - 20) / 330)
  for (let y = 300; y >= 60; y -= 55) {
    tw.x.strokeStyle = alpha(PW.wood, 0.95)
    tw.x.lineWidth = 5
    tw.x.beginPath()
    tw.x.moveTo(legX(y), y)
    tw.x.lineTo(legX2(y), y)
    tw.x.stroke()
    const yn = y - 55
    tw.x.lineWidth = 3.5
    tw.x.beginPath()
    tw.x.moveTo(legX(y), y)
    tw.x.lineTo(legX2(yn), yn)
    tw.x.moveTo(legX2(y), y)
    tw.x.lineTo(legX(yn), yn)
    tw.x.stroke()
    arc(tw.x, legX(y), y, 2.5, '#3a2a1a')
    arc(tw.x, legX2(y), y, 2.5, '#3a2a1a')
  }
  tw.x.fillStyle = '#4c3018'
  tw.x.fillRect(30, 8, 30, 16)
  tw.x.fillStyle = alpha(PW.woodHi, 0.6)
  tw.x.fillRect(30, 8, 30, 4)
  // blades: four weathered sails around a hub, rotates about (150,150)
  const bl = cv2(300, 300)
  for (let s = 0; s < 4; s++) {
    bl.x.save()
    bl.x.translate(150, 150)
    bl.x.rotate((s * Math.PI) / 2)
    bl.x.fillStyle = '#5a3f26'
    bl.x.fillRect(-3, 22, 6, 118)
    for (let i = 0; i < 8; i++) {
      const d = 32 + i * 13.5
      const off = 3 + i * 1.5
      bl.x.fillStyle = hash(601 + i + s * 9) > 0.78 ? '#7a5c3a' : i % 2 ? '#96744c' : '#8a6942'
      bl.x.beginPath()
      bl.x.moveTo(-15 + off * 0.4, d)
      bl.x.lineTo(15 + off, d)
      bl.x.lineTo(13 + off, d + 9)
      bl.x.lineTo(-13 + off * 0.4, d + 9)
      bl.x.closePath()
      bl.x.fill()
    }
    bl.x.restore()
  }
  arc(bl.x, 150, 150, 22, PW.iron)
  arc(bl.x, 150, 150, 9, PW.ironHi)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    arc(bl.x, 150 + Math.cos(a) * 15, 150 + Math.sin(a) * 15, 2, PW.ironLo)
  }
  return { tower: tw.c, blades: bl.c }
}
function bakeTumbleweed() {
  const { c, x } = cv2(130, 130)
  const cx = 65
  const cy = 64
  const r = rng(77)
  const cols = ['#a08a5c', '#8a744c', '#6e5c3c', '#b49a68', '#5c4c34']
  // dense dark core, then a looser cage of thin arcs — reads as a ball, not a fog
  for (let i = 0; i < 18; i++) {
    const rr = 7 + r() * 18
    const a0 = r() * 7
    x.strokeStyle = cols[Math.floor(r() * cols.length)]
    x.globalAlpha = 0.6 + r() * 0.35
    x.lineWidth = 0.9 + r() * 1.1
    x.beginPath()
    x.ellipse(cx + (r() - 0.5) * 8, cy + (r() - 0.5) * 7, rr, rr * (0.7 + r() * 0.4), r() * 3, a0, a0 + 1.4 + r() * 3.4)
    x.stroke()
  }
  for (let i = 0; i < 22; i++) {
    const rr = 26 + r() * 26
    const a0 = r() * 7
    x.strokeStyle = cols[Math.floor(r() * cols.length)]
    x.globalAlpha = 0.5 + r() * 0.42
    x.lineWidth = 0.7 + r() * 0.9
    x.beginPath()
    x.ellipse(
      cx + (r() - 0.5) * 6,
      cy + (r() - 0.5) * 5,
      rr,
      rr * (0.78 + r() * 0.3),
      r() * 3,
      a0,
      a0 + 0.9 + r() * 2.2
    )
    x.stroke()
  }
  x.globalAlpha = 1
  // spokes crossing the ball
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + r() * 0.5
    const rr0 = 6 + r() * 10
    const rr1 = 40 + r() * 16
    x.strokeStyle = 'rgba(110,92,60,0.75)'
    x.lineWidth = 0.9 + r() * 0.7
    x.beginPath()
    x.moveTo(cx + Math.cos(a) * rr0, cy + Math.sin(a) * rr0)
    x.lineTo(cx + Math.cos(a) * rr1, cy + Math.sin(a) * rr1)
    x.stroke()
  }
  // a few loose straw wisps trailing off the ball
  for (let i = 0; i < 6; i++) {
    const a = r() * 7
    const dx = Math.cos(a)
    const dy = Math.sin(a)
    x.strokeStyle = 'rgba(160,134,88,0.85)'
    x.lineWidth = 1.1
    x.beginPath()
    x.moveTo(cx + dx * 50, cy + dy * 50)
    x.quadraticCurveTo(cx + dx * 58, cy + dy * 58 + 3, cx + dx * 60, cy + dy * 60 + 9)
    x.stroke()
  }
  return c
}
function bakeToupee() {
  const { c, x } = cv2(110, 46)
  // black pompadour: high swept front quiff, body falling back, flat base
  x.fillStyle = '#15101a'
  x.beginPath()
  x.moveTo(10, 44)
  x.quadraticCurveTo(6, 30, 14, 18)
  x.quadraticCurveTo(20, 8, 34, 6)
  x.quadraticCurveTo(44, 4, 52, 10)
  x.quadraticCurveTo(70, 16, 84, 26)
  x.quadraticCurveTo(96, 34, 101, 44)
  x.quadraticCurveTo(56, 48, 10, 44)
  x.closePath()
  x.fill()
  // one soft sheen arc across the top-left of the quiff
  x.strokeStyle = 'rgba(94,84,112,0.7)'
  x.lineWidth = 3.5
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(18, 20)
  x.quadraticCurveTo(26, 10, 40, 9)
  x.stroke()
  x.strokeStyle = 'rgba(60,52,76,0.6)'
  x.lineWidth = 2
  x.beginPath()
  x.moveTo(46, 12)
  x.quadraticCurveTo(60, 16, 74, 24)
  x.stroke()
  // a few loose strands, not ribs
  x.strokeStyle = 'rgba(6,4,10,0.8)'
  x.lineWidth = 1.4
  const r = rng(421)
  for (let i = 0; i < 5; i++) {
    const sx = 26 + r() * 60
    x.beginPath()
    x.moveTo(sx, 12 + r() * 8)
    x.quadraticCurveTo(sx + 5, 24 + r() * 8, sx - 4, 36 + r() * 8)
    x.stroke()
  }
  // slight top-right shadow to seat it in the light
  x.strokeStyle = 'rgba(0,0,0,0.5)'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(72, 20)
  x.quadraticCurveTo(86, 30, 96, 40)
  x.stroke()
  return c
}
function bakeHat() {
  const { c, x } = cv2(160, 100)
  // brim
  x.fillStyle = '#191419'
  x.beginPath()
  x.ellipse(80, 64, 76, 21, 0, 0, 7)
  x.fill()
  x.strokeStyle = '#2e2731'
  x.lineWidth = 2.5
  x.beginPath()
  x.ellipse(80, 64, 74, 19.5, 0, 0.3, Math.PI - 0.3)
  x.stroke()
  // warm rim from the low sun, left side
  x.strokeStyle = 'rgba(255,150,70,0.4)'
  x.lineWidth = 2.5
  x.beginPath()
  x.ellipse(80, 64, 74.5, 20, 0, Math.PI * 0.62, Math.PI * 1.12)
  x.stroke()
  // creased crown
  x.fillStyle = '#1d1720'
  x.beginPath()
  x.moveTo(48, 66)
  x.quadraticCurveTo(48, 34, 62, 26)
  x.quadraticCurveTo(80, 18, 98, 26)
  x.quadraticCurveTo(112, 34, 112, 66)
  x.closePath()
  x.fill()
  // centre crease dent + peaks
  x.fillStyle = '#0e0a10'
  x.beginPath()
  x.moveTo(74, 24)
  x.quadraticCurveTo(80, 34, 86, 24)
  x.quadraticCurveTo(84, 44, 80, 48)
  x.quadraticCurveTo(76, 44, 74, 24)
  x.closePath()
  x.fill()
  x.strokeStyle = '#39323f'
  x.lineWidth = 3
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(60, 30)
  x.quadraticCurveTo(64, 24, 70, 26)
  x.stroke()
  x.beginPath()
  x.moveTo(100, 30)
  x.quadraticCurveTo(96, 24, 90, 26)
  x.stroke()
  // top light
  x.fillStyle = 'rgba(120,110,140,0.3)'
  x.beginPath()
  x.ellipse(72, 30, 14, 6, -0.3, 0, 7)
  x.fill()
  // band + buckle
  x.fillStyle = '#2b2432'
  x.fillRect(49, 56, 62, 11)
  x.fillStyle = '#0e0a10'
  x.fillRect(49, 65, 62, 2)
  x.fillStyle = '#8a7a5a'
  x.fillRect(96, 57, 6, 8)
  x.fillStyle = '#4a4234'
  x.fillRect(98, 59, 2, 4)
  return c
}

// ---------- assembly ----------
export async function build() {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.load(`96px ${F.anton}`)
    } catch {}
    await document.fonts.ready
  }
  const gallop = [0, 1, 2, 3].map((p) => gallopFrame(p))
  return {
    dawnSky: paintDawn(),
    titleSky: paintTitle(),
    town: paintTown(),
    saloon: paintSaloon(),
    poster: paintPoster(),
    finSky: paintFin(),
    horseGallop: gallop,
    horseStand: bakeHorse(),
    doors: { L: bakeDoor(true), R: bakeDoor(false) },
    windmill: bakeWindmill(),
    tumbleweed: bakeTumbleweed(),
    toupee: bakeToupee(),
    hat: bakeHat(),
  }
}
