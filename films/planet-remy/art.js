// Baked environments for PLANET REMY: four lights of one day (dawn / day / golden / dusk)
// plus the night end card. Everything is generated once in prepare() from seeded hashes —
// painterly pixel art: quantized dithered skies, layered ridges with haze, acacia treelines,
// textured savanna ground, mist bands. Nothing here depends on frame time.
import { hash, vnoise } from 'filmkit/lib.js'
import { canvas } from '../remy-bros/art.js'

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u))
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013)

function pixels(w, h) {
  w = Math.round(w); h = Math.round(h)
  const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data
  const set = (x, y, col, a = 255) => {
    x = Math.floor(x); y = Math.floor(y)
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const [r, g, b] = typeof col === 'string' ? rgb(col) : col
    const i = (y * w + x) * 4
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a
  }
  return { c, set, done: () => (ctx.putImageData(img, 0, 0), c), w, h }
}

// ---------------- sky: quantized vertical gradient with Bayer dither + solar glow ----------------
function sky(P, w, h, stops, sun = null) {
  const S = stops.map(([p, c]) => [p, rgb(c)])
  const core = sun ? rgb(sun.core) : null, glow = sun ? rgb(sun.glow) : null
  const Rg = sun ? sun.r * 6 : 0
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1)
    for (let x = 0; x < w; x++) {
      // base gradient, quantized to 26 levels with dither
      const q = v * 38, b0 = Math.floor(q), f = q - b0
      const pick = f * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? b0 + 1 : b0
      let p = Math.min(1, pick / 38)
      let k = 0
      while (k < S.length - 2 && p > S[k + 1][0]) k++
      const [pa, ca] = S[k], [pb, cb] = S[k + 1]
      let col = mix(ca, cb, (p - pa) / (pb - pa))
      if (sun) {
        const d = Math.hypot(x - sun.x, (y - sun.y) * 1.15)
        if (d < sun.r) col = core
        else if (d < sun.r * 1.3) col = mix(glow, core, 1 - (d - sun.r) / (sun.r * 0.3))
        else if (d < Rg) {
          const g = Math.pow(1 - d / Rg, 2.6)
          const gq = g * 26, gi = Math.floor(gq)
          const gv = (gq - gi) * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? (gi + 1) / 26 : gi / 26
          col = mix(col, glow, gv)
        }
      }
      P.set(x, y, col)
    }
  }
}

// ---------------- mountain ranges ----------------
function range(P, w, { n, step, base, variance, lit, shade, haze = null, seed = 1, yTop = 0, sharp = 0.85 }) {
  const peaks = Array.from({ length: n }, (_, i) => ({
    x: i * step + hash(i + seed * 50) * step * 0.6,
    y: base + hash(i + seed * 70) * variance,
    s: sharp * (0.8 + 0.4 * hash(i + seed * 90)),
  }))
  const hz = haze ? rgb(haze) : null
  for (let x = 0; x < w; x++) {
    let top = 1e9, own = null
    for (const p of peaks) { const t = p.y + Math.abs(x - p.x) * p.s; if (t < top) { top = t; own = p } }
    top = Math.round(top)
    const litFace = x < own.x
    for (let y = Math.max(yTop, top); y < P.h; y++) {
      let c = rgb(litFace ? lit : shade)
      if (!litFace && ((x - own.x) * 0.7 + y) % 19 < 1.4) c = rgb(shade).map((v) => v - 10)
      if (h2(x >> 2, y >> 2, seed) > 0.93) c = c.map((v) => v + 8)
      if (hz) {
        const f = Math.max(0, (y - P.h * 0.42) / (P.h * 0.58))
        if (f > 0 && f * 16 > BAYER[(y & 3) * 4 + (x & 3)] * 0.9) c = mix(c, hz, Math.min(0.85, f * 0.9))
      }
      P.set(x, y, c)
    }
  }
}

// ---------------- acacia tree (flat-top canopy, 3 ramps + dithered fringe) ----------------
function acacia(w, pal, seed = 0) {
  const h = Math.round(w * 1.06), trunkW = Math.max(2, Math.round(w * 0.045))
  const c = canvas(w, h), x = c.getContext('2d')
  x.imageSmoothingEnabled = false
  const cy = Math.round(h * 0.26), cw = w * 0.92, ch = Math.round(h * 0.16)
  // trunk with a fork
  x.strokeStyle = pal.trunk; x.lineCap = 'round'
  x.lineWidth = trunkW
  x.beginPath(); x.moveTo(w / 2, h); x.lineTo(w / 2 - w * 0.03, cy + ch * 0.4); x.stroke()
  x.lineWidth = Math.max(1, trunkW - 1)
  x.beginPath()
  x.moveTo(w / 2 - w * 0.01, h * 0.72)
  x.lineTo(w * 0.5 + w * 0.13 * (hash(seed) > 0.5 ? 1 : -1), cy + ch * 0.5)
  x.moveTo(w / 2 - w * 0.03, cy + ch * 0.4)
  x.lineTo(w * 0.5 - w * 0.18, cy + ch * 0.55)
  x.stroke()
  // canopy: stacked ellipse rows, light from top
  const [dk, md, lt, rim] = pal.leaf
  for (let yy = 0; yy < ch * 2; yy++) {
    const u = yy / (ch * 2)
    const half = (cw / 2) * Math.sin(Math.PI * Math.min(1, 0.12 + u * 0.88)) ** 0.5
    for (let xx = Math.round(w / 2 - half); xx < w / 2 + half; xx++) {
      const side = (xx - w / 2) / (cw / 2)
      let col = u < 0.34 ? lt : u < 0.62 ? md : dk
      if (u < 0.1) col = rim
      if (h2(xx, yy, seed + 4) > 0.82) col = u < 0.5 ? rim : lt // leafy speckle
      if (Math.abs(side) > 0.93 && h2(xx, yy, seed + 9) > 0.4) continue // ragged fringe
      x.fillStyle = col
      x.fillRect(xx, cy + yy, 1, 1)
    }
  }
  return c
}

// ---------------- boulder (grooming rocks) ----------------
export function boulder(w, h, seed = 0) {
  const P = pixels(w, h)
  const cx = w / 2, cy = h * 0.98, rx = w * 0.48, ry = h * 0.94
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry
    const d = nx * nx + ny * ny + h2(x, y, seed) * 0.06
    if (d > 1) continue
    const light = 0.62 * (-nx * 0.8 - ny * 0.5) + (h2(x, y, seed + 5) - 0.5) * 0.14 // sun from upper-left
    let col
    if (light > 0.34) col = '#b09a7e'
    else if (light > 0.1) col = '#96826a'
    else if (light > -0.28) col = '#786654'
    else col = '#584838'
    if (ny > 0.55) col = '#4a3c30' // grounded under-shadow
    if (h2(x, y, seed + 3) > 0.92) col = light > 0 ? '#c2ae90' : '#483a2e'
    P.set(x, y, col)
  }
  return P.done()
}

// ---------------- the savanna ground plane ----------------
function ground(P, w, y0, pal) {
  const base = rgb(pal.base), spk = rgb(pal.speckle), dry = rgb(pal.dry), front = rgb(pal.front), back = rgb(pal.back)
  for (let y = y0; y < P.h; y++) {
    const v = (y - y0) / (P.h - y0)
    for (let x = 0; x < w; x++) {
      let col = mix(back, front, v)
      const patch = vnoise(x * 0.012 + y * 0.05, 17)
      if (patch > 0.68) col = mix(col, dry, 0.55 * (patch - 0.68) / 0.32)
      if (h2(x, y, 21) > 0.965) col = spk
      else if (h2(x, y, 22) > 0.985) col = mix(col, front, 0.7)
      P.set(x, y, col)
    }
  }
  // baked grass strokes, denser toward the front
  for (let i = 0; i < 2400; i++) {
    const gx = Math.floor(hash(i * 3 + 1) * w)
    const gy = y0 + Math.floor(hash(i * 3 + 2) ** 1.6 * (P.h - y0))
    const len = 1 + Math.floor(hash(i * 3 + 3) * 3)
    const col = hash(i + 77) > 0.5 ? spk : base
    for (let k = 0; k < len; k++) P.set(gx + (k > 1 ? 1 : 0), gy - k, col)
  }
  // irregular grass fringe on the horizon
  for (let x = 0; x < w; x++) {
    const b = Math.round(vnoise(x * 0.06, 5) * 3)
    for (let k = 0; k <= b; k++) P.set(x, y0 - 1 - k, k === b ? spk : back)
  }
}

// ---------------- environment assembly ----------------
function env(cfg) {
  const w = 1400, h = 600, y0 = 372
  // far: sky + sun + two mountain ranges
  const Pf = pixels(w, h)
  sky(Pf, w, h, cfg.sky, cfg.sun ?? null)
  range(Pf, w, { n: 15, step: 105, base: 210, variance: 62, lit: cfg.mFar[0], shade: cfg.mFar[1], haze: cfg.haze, seed: 1 })
  range(Pf, w, { n: 12, step: 132, base: 268, variance: 52, lit: cfg.mNear[0], shade: cfg.mNear[1], haze: cfg.haze, seed: 2 })
  const far = Pf.done()
  // mid: optional ridge, acacias, ground
  const Pm = pixels(w, h)
  if (cfg.ridge) {
    for (let x = 720; x < w; x++) {
      const crest = 400 - (x - 720) * 0.3 + Math.sin(x * 0.02) * 6
      for (let y = Math.round(crest); y < h; y++) {
        const rim = y < crest + 2
        Pm.set(x, y, rim ? cfg.ridge.rim : h2(x, y, 31) > 0.94 ? cfg.ridge.spk : cfg.ridge.col)
      }
    }
  }
  const farCanvas = far
  const mid = Pm.done()
  const mx = mid.getContext('2d')
  mx.imageSmoothingEnabled = false
  // acacias along the back edge (skip the dusk ridge zone)
  cfg.trees.forEach(([tx, tw, seed]) => {
    const t = acacia(tw, cfg.acacia, seed)
    mx.drawImage(t, tx, y0 - t.height + 4)
  })
  const Pg = pixels(w, h)
  ground(Pg, w, y0, cfg.ground)
  mx.drawImage(Pg.done(), 0, 0)
  // horizon haze on the ground: 6 stepped bands, not a smooth wipe
  const [hr, hg, hb] = cfg.hazeRGB
  for (let band = 0; band < 6; band++) {
    const a = cfg.hazeA * (1 - band / 6)
    mx.fillStyle = `rgba(${hr},${hg},${hb},${a.toFixed(3)})`
    mx.fillRect(0, y0 + band * 11, w, 11)
  }
  return { far: farCanvas, mid, y0, pal: cfg }
}

export const ENVS = {}
export const ACACIA_PAL = {}
export function bakeEnvs() {
  ENVS.dawn = env({
    sky: [[0, '#141031'], [0.3, '#2c1c4e'], [0.52, '#5a2a58'], [0.68, '#9c4462'], [0.8, '#d06a54'], [0.9, '#ee9a5e'], [1, '#ffc478']],
    sun: { x: 664, y: 330, r: 30, core: '#fff3d0', glow: '#ffb46a' },
    mFar: ['#7c4a6e', '#643a5e'], mNear: ['#54304e', '#42243e'], haze: '#c47a5e',
    acacia: { trunk: '#2a1c30', leaf: ['#1c1230', '#2a1c3e', '#3c2a4e', '#8a4a44'] },
    trees: [[70, 92, 3], [300, 68, 8], [835, 78, 13], [1120, 58, 21]],
    ground: { base: '#6a4c3a', speckle: '#8a6a48', dry: '#9a7a50', front: '#463230', back: '#5c4438' },
    hazeRGB: [196, 122, 94], hazeA: 0.24,
  })
  ENVS.day = env({
    sky: [[0, '#4e8ed0'], [0.45, '#7ab4e8'], [0.75, '#b4dcf4'], [1, '#e0f2fa']],
    sun: null,
    mFar: ['#8aa4cf', '#7690c0'], mNear: ['#5c7cae', '#4a689a'], haze: '#b4d0e8',
    acacia: { trunk: '#4c3826', leaf: ['#2e5636', '#3e7044', '#548c50', '#88bc74'] },
    trees: [[130, 104, 2], [420, 72, 9], [700, 88, 14], [1010, 64, 18], [1210, 80, 26]],
    ground: { base: '#8f9a4c', speckle: '#aab85e', dry: '#c4ac66', front: '#76823e', back: '#a2ae5c' },
    hazeRGB: [180, 208, 232], hazeA: 0.30,
  })
  ENVS.golden = env({
    sky: [[0, '#ffe2b0'], [0.4, '#ffc27a'], [0.68, '#ff9d5c'], [0.85, '#f4763e'], [1, '#e05a30']],
    sun: { x: 612, y: 322, r: 34, core: '#fff8e0', glow: '#ffcf8a' },
    mFar: ['#c98a6a', '#b0725c'], mNear: ['#8f5648', '#76443c'], haze: '#f4b070',
    acacia: { trunk: '#3c2a20', leaf: ['#5c4020', '#7c5a2c', '#a0783c', '#e8bc6a'] },
    trees: [[90, 96, 5], [368, 70, 11], [880, 82, 16], [1180, 60, 24]],
    ground: { base: '#a8823e', speckle: '#c4a050', dry: '#d8bc6a', front: '#8a6a34', back: '#b8964e' },
    hazeRGB: [244, 176, 112], hazeA: 0.24,
  })
  ENVS.dusk = env({
    sky: [[0, '#1c1440'], [0.35, '#3e2050'], [0.6, '#7c2e4a'], [0.78, '#c44838'], [0.9, '#ee7a44'], [1, '#ffa050']],
    sun: { x: 1010, y: 316, r: 38, core: '#ffd090', glow: '#ff8a4a' },
    mFar: ['#54304e', '#452644'], mNear: ['#33203c', '#281832'], haze: '#e0704a',
    ridge: { col: '#221630', rim: '#8a4a3e', spk: '#332040' },
    acacia: { trunk: '#141020', leaf: ['#100c1c', '#181228', '#221834', '#7c3c34'] },
    trees: [[95, 88, 4], [350, 66, 12], [560, 76, 19]],
    ground: { base: '#4a3630', speckle: '#5c4438', dry: '#6a4c3a', front: '#382824', back: '#5c4034' },
    hazeRGB: [224, 112, 74], hazeA: 0.16,
  })
  ACACIA_PAL.golden = ENVS.golden.pal.acacia
}

// ---------------- night card ----------------
export function bakeNight() {
  const w = 960, h = 540
  const P = pixels(w, h)
  sky(P, w, h, [[0, '#080618'], [0.55, '#100b28'], [1, '#241a48']], { x: 700, y: 150, r: 42, core: '#e8e4d4', glow: '#6a6888' })
  range(P, w, { n: 10, step: 120, base: 330, variance: 46, lit: '#141028', shade: '#100c20', seed: 7 })
  const night = P.done()
  const x = night.getContext('2d')
  x.imageSmoothingEnabled = false
  // craters
  for (const [cx, cy, cr] of [[686, 138, 7], [712, 160, 5], [694, 166, 4]]) {
    for (let yy = -cr; yy <= cr; yy++) for (let xx = -cr; xx <= cr; xx++)
      if (xx * xx + yy * yy < cr * cr) { x.fillStyle = '#c8c4b4'; x.fillRect(cx + xx, cy + yy, 1, 1) }
  }
  // ground
  x.fillStyle = '#0c0a18'
  x.fillRect(0, 430, w, 110)
  const t = acacia(110, { trunk: '#0a0814', leaf: ['#0a0814', '#0a0814', '#0e0c1c', '#16142a'] }, 31)
  x.drawImage(t, 760, 430 - t.height + 2)
  // star field (twinkle animated per frame from this seeded list)
  const stars = []
  for (let i = 0; i < 46; i++) stars.push([Math.floor(hash(i * 5 + 2) * w), Math.floor(hash(i * 5 + 3) ** 1.4 * 300), hash(i * 5 + 4) > 0.82])
  return { canvas: night, stars }
}

// ---------------- per-frame pieces ----------------
export function mist() {
  const w = 640, h = 84, c = canvas(w, h), x = c.getContext('2d')
  for (let i = 0; i < 46; i++) {
    const mx = hash(i * 7 + 1) * w, my = h * 0.35 + hash(i * 7 + 2) * h * 0.5, r = 30 + hash(i * 7 + 3) * 60
    const g = x.createRadialGradient(mx, my, 0, mx, my, r)
    g.addColorStop(0, `rgba(232,220,226,${0.10 + hash(i * 7 + 4) * 0.10})`)
    g.addColorStop(1, 'rgba(232,220,226,0)')
    x.fillStyle = g
    x.fillRect(mx - r, my - r, r * 2, r * 2)
  }
  return c
}

// One animated grass tuft cluster (world position; sway from time).
export function tuft(x, wx, wy, t, s, pal) {
  const sway = Math.sin(t * 1.35 + wx * 0.71) * 2.2 * s
  const blades = 3 + Math.floor(hash(wx * 13.7 + wy * 3.1) * 3)
  wx = Math.round(wx); wy = Math.round(wy)
  for (let i = 0; i < blades; i++) {
    const bx = wx + Math.round((i - blades / 2) * 2.6 * s)
    const hgt = (5 + hash(wx + i * 31 + wy) * 6) * s
    const lean = Math.round(((bx - wx) * 0.35 + sway * (0.5 + hash(i * 17 + wx) * 0.5)) * 2) / 2
    x.strokeStyle = i % 2 ? pal.speckle : pal.base
    x.lineWidth = Math.max(1, Math.round(s))
    x.beginPath()
    x.moveTo(bx, wy)
    x.lineTo(bx + Math.round(lean), wy - Math.round(hgt))
    x.stroke()
  }
}

export function bird(x, bx, by, flap, s) {
  bx = Math.round(bx); by = Math.round(by)
  x.strokeStyle = 'rgba(30,22,40,0.85)'
  x.lineWidth = Math.max(1, Math.round(s))
  x.beginPath()
  x.moveTo(bx - 5 * s, by)
  x.quadraticCurveTo(bx - 2 * s, by - (2.5 + flap * 3) * s, bx, by)
  x.quadraticCurveTo(bx + 2 * s, by - (2.5 + flap * 3) * s, bx + 5 * s, by)
  x.stroke()
}

// Dark silhouette copy of a rigged Remy (end card hero).
export function silhouette(R, col = '#0a0814') {
  const c = canvas(R.w + 12, R.h + 12), x = c.getContext('2d')
  x.imageSmoothingEnabled = false
  x.drawImage(R.c, 6, 6)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = col
  x.fillRect(0, 0, c.width, c.height)
  return { c, w: R.w, h: R.h, legTop: R.legTop, cx: R.cx, top: 6 + R.top, bottom: 6 + R.bottom }
}
