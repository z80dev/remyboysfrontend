// =====================================================================
// THE TERMHAIRNATOR — env.js. Environment art: the five baked 1920x1080
// backdrops (night ash playground / rain alley / neon street / foundry
// interior / dawn exterior) painted ONCE in loadEnv(), plus the live
// weather + impact passes. Every pass is a PURE function of time —
// hash/rng only, no Math.random, no Date, no state between frames.
// Palette is strictly the LOOK.palette set in timeline.js (steel-blue
// night -> molten orange -> dawn gold), with mixes of those anchors only.
// House pattern: films/3000/art.js bakes, fade-to-bald rain/neon smears,
// baldshank seeded lightning. No semicolons; never start a line with '['.
// =====================================================================
import { W, H, hash, rng } from 'filmkit/lib.js'
import { canvas } from '../remy-bros/art.js'

const OS = 220          // overscan painted around every stage for camera moves
const BAR = 138         // 2.39:1 letterbox bar height (safe band y 138-942)

// ---------------- palette: strictly LOOK.palette anchors ----------------
const PAL = {
  nightSteel: '#0a1420', nightDeep: '#050b12',
  neonCyan: '#3fd6e0', neonMagenta: '#e14fd2', neonSign: '#ffd24a',
  chromeHi: '#dfe9f2', chromeMid: '#8ea3b5', chromeLo: '#3d4c5c',
  eyeRed: '#ff2a2a',
  molten: '#ff7a1a', moltenHi: '#ffd27a', ember: '#b34700',
  dawnGold: '#ffcf87', dawnSky: '#7fb4de',
  sprout: '#7ee06a', blood: '#8e1b1b',
}

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const hx = (h) => hexRgb(h)
// quick anchor mixes used all over (all inputs are PAL entries)
const C = {
  sky0: hx(PAL.nightDeep), sky1: hx(PAL.nightSteel), sky2: mix(hx(PAL.nightSteel), hx(PAL.chromeLo), 0.45),
  wall: mix(hx(PAL.nightSteel), hx(PAL.nightDeep), 0.5), wall2: mix(hx(PAL.nightSteel), hx(PAL.chromeLo), 0.3),
  frost: mix(hx(PAL.chromeHi), hx(PAL.dawnSky), 0.45),
  rainCol: mix(hx(PAL.chromeHi), hx(PAL.dawnSky), 0.35),
  smokeCol: mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.55),
}

// ============================== bake helpers ==============================

function skyGrad(x, stops, o = {}) {
  const g = x.createLinearGradient(0, o.y0 ?? -OS, 0, o.y1 ?? H + 60)
  for (const s of stops) g.addColorStop(s[0], s[1])
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
}

// Painterly cloud bank: a soft under-mass + puffs with LIT CRESCENTS on the
// up-light side + a restrained belly shadow. Kept subtle so night banks read
// as bruised weather, and dawn banks never turn into balloons.
function clouds(x, cx, cy, w, h, seed, base, lit, belly) {
  const r = rng(seed)
  const n = 5 + Math.floor(r() * 3)
  const puffs = []
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n
    puffs.push([cx - w / 2 + u * w * (0.85 + r() * 0.3), cy - Math.sin(u * Math.PI) * h * 0.35 - r() * h * 0.15,
      h * (0.3 + Math.sin(u * Math.PI) * 0.4 + r() * 0.1)])
  }
  x.fillStyle = base
  x.beginPath()
  x.ellipse(cx, cy + h * 0.12, w * 0.44, h * 0.38, 0, 0, 7)
  x.fill()
  for (const p of puffs) { x.fillStyle = base; x.beginPath(); x.arc(p[0], p[1], p[2], 0, 7); x.fill() }
  // lit crescents: offset up-light arcs, clipped by an erasure pass on the underside
  x.save()
  x.beginPath()
  for (const p of puffs) { x.moveTo(p[0] + p[2], p[1]); x.arc(p[0], p[1], p[2], 0, 7) }
  x.clip()
  x.fillStyle = lit
  x.globalAlpha = 0.55
  for (const p of puffs) { x.beginPath(); x.arc(p[0] - p[2] * 0.22, p[1] - p[2] * 0.42, p[2] * 0.72, 0, 7); x.fill() }
  x.globalAlpha = 0.5
  x.fillStyle = belly
  for (const p of puffs) { x.beginPath(); x.ellipse(p[0] + p[2] * 0.06, p[1] + p[2] * 0.55, p[2] * 0.8, p[2] * 0.34, 0, 0, 7); x.fill() }
  x.restore()
  x.globalAlpha = 1
  // seams where puffs tuck under
  x.strokeStyle = belly
  x.globalAlpha = 0.5
  x.lineWidth = 2
  for (let i = 1; i < puffs.length; i++) {
    const a = puffs[i - 1], b = puffs[i]
    x.beginPath()
    x.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (a[2] + b[2]) * 0.14)
    x.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2 + 6, (a[1] + b[1]) / 2 - (a[2] + b[2]) * 0.08)
    x.stroke()
  }
  x.globalAlpha = 1
}

// Distant city silhouette row with sparse lit windows + antennas/water towers.
function skyline(x, baseY, seed, col, o = {}) {
  const r = rng(seed)
  const win = o.windows ?? 0
  let px = -OS - 40
  while (px < W + OS + 40) {
    const bw = 60 + r() * 150
    const bh = (o.hMin ?? 70) + r() * ((o.hMax ?? 230) - (o.hMin ?? 70))
    x.fillStyle = col
    x.fillRect(px, baseY - bh, bw + 2, bh + (o.skirt ?? 60))
    if (r() > 0.55) { x.fillRect(px + bw * 0.32, baseY - bh - 16 - r() * 14, 4, 16 + r() * 14) } // antenna
    if (r() > 0.62) { // water tower
      const tx = px + bw * 0.5 - 11
      x.fillRect(tx, baseY - bh - 24, 22, 15)
      x.fillRect(tx + 3, baseY - bh - 9, 3, 9)
      x.fillRect(tx + 16, baseY - bh - 9, 3, 9)
    }
    if (win > 0) {
      for (let wy = baseY - bh + 10; wy < baseY - 8; wy += 18)
        for (let wx = px + 8; wx < px + bw - 6; wx += 14) {
          const k = hash(wx * 3.1 + wy * 7.7 + seed)
          if (k > 1 - win) {
            const warm = hash(wx * 1.7 + wy + seed * 3) > 0.3
            x.fillStyle = warm ? css(hx(PAL.neonSign), 0.16 + k * 0.2) : css(C.frost, 0.10 + k * 0.16)
            x.fillRect(wx, wy, 4, 6)
          }
        }
    }
    px += bw + 3 + r() * 34
  }
}

// Ground slab with seeded grain + drifts (3000 groundTex lineage).
function groundTex(x, y0, seed, base, hi, lo, o = {}) {
  const g = x.createLinearGradient(0, y0, 0, H + OS)
  g.addColorStop(0, base)
  g.addColorStop(1, o.deep ?? lo)
  x.fillStyle = g
  x.fillRect(-OS, y0, W + OS * 2, H + OS - y0 + OS)
  const r = rng(seed)
  const n = o.n ?? 420
  for (let i = 0; i < n; i++) {
    const px = r() * (W + OS * 2) - OS, py = y0 + r() * (H + OS - y0)
    x.fillStyle = r() > 0.5 ? hi : lo
    x.globalAlpha = (o.a ?? 0.25) + r() * 0.3
    x.fillRect(px, py, 3 + r() * 12, 2 + r() * 3)
  }
  x.globalAlpha = 1
}

// Brick courses with per-brick value jitter (steel-blue night).
function brickWall(x, x0, y0, w, h, seed, base, lit, shade, mortar) {
  const r = rng(seed)
  const bh = 22, bw = 46
  for (let yy = 0; yy < h; yy += bh)
    for (let xx = 0; xx < w; xx += bw) {
      const off = (((yy / bh) | 0) % 2) * bw * 0.5
      const bx = x0 + xx + off, by = y0 + yy
      if (bx > x0 + w) continue
      const k = 0.86 + r() * 0.3
      x.fillStyle = k > 1.1 ? lit : k < 0.92 ? shade : base
      x.fillRect(bx, by, Math.min(bw - 3, x0 + w - bx), Math.min(bh - 3, y0 + h - by))
      x.fillStyle = mortar
      x.fillRect(bx, by + bh - 2, Math.min(bw, x0 + w - bx), 2)
    }
}

// Vertical wet-pavement neon smear (fade-to-bald cityGlow precedent, per column).
function smear(x, cx, yTop, w, h, col, a, seed) {
  const r = rng(seed)
  for (let i = 0; i < 6; i++) {
    const jx = cx + (r() - 0.5) * w * 0.8
    const jw = w * (0.25 + r() * 0.6)
    const jh = h * (0.45 + r() * 0.55)
    const g = x.createLinearGradient(0, yTop, 0, yTop + jh)
    g.addColorStop(0, css(col, a * (0.5 + r() * 0.5)))
    g.addColorStop(0.6, css(col, a * 0.35))
    g.addColorStop(1, css(col, 0))
    x.fillStyle = g
    x.fillRect(jx - jw / 2, yTop, jw, jh)
  }
}

// Neon tube letters: double glow pass + white-hot core, baked variance (bright for bloom).
function neonTube(x, text, cx, y, size, col, seed, o = {}) {
  const align = o.align ?? 'center'
  x.save()
  x.font = `700 ${size}px "Space Grotesk"`
  x.textAlign = align
  x.textBaseline = 'alphabetic'
  const chars = [...text]
  let total = 0
  const widths = chars.map((ch) => { const w = x.measureText(ch).width; total += w; return w })
  let px = align === 'center' ? cx - total / 2 : cx
  const c = hx(col)
  for (let i = 0; i < chars.length; i++) {
    const kk = 0.86 + 0.14 * hash(seed + i * 3.3)
    x.shadowColor = css(c, 0.9 * kk)
    x.shadowBlur = 22 * kk
    x.fillStyle = css([Math.min(255, c[0] + 42), Math.min(255, c[1] + 42), Math.min(255, c[2] + 42)], 0.4 + 0.55 * kk)
    x.fillText(chars[i], px, y)
    x.fillText(chars[i], px, y)
    x.shadowBlur = 0
    x.fillStyle = css([255, 255, 255], 0.52 * kk)
    x.fillText(chars[i], px, y)
    px += widths[i]
  }
  x.restore()
}

// Neon scissor glyph: two crossed blades + finger rings, tube-style glow.
function neonScissor(x, cx, cy, s, col) {
  const c = hx(col)
  const pass = (lw, glow) => {
    x.shadowColor = css(c, glow)
    x.shadowBlur = glow > 0.5 ? 18 : 0
    x.strokeStyle = css(glow > 0.5 ? c : [255, 255, 255], glow > 0.5 ? 0.9 : 0.55)
    x.lineWidth = lw
    x.lineCap = 'round'
    x.beginPath()
    x.moveTo(cx - 15 * s, cy - 17 * s); x.lineTo(cx + 11 * s, cy + 13 * s)
    x.moveTo(cx - 15 * s, cy + 17 * s); x.lineTo(cx + 11 * s, cy - 13 * s)
    x.arc(cx - 21 * s, cy - 21 * s, 6.4 * s, 0.5, 4.2)
    x.moveTo(cx + 3.5 * s, cy + 17.5 * s)
    x.arc(cx - 21 * s, cy + 21 * s, 6.4 * s, -4.2, -0.5)
    x.stroke()
    x.shadowBlur = 0
  }
  pass(5.5 * s, 0.9)
  pass(2.2 * s, 0)
  x.fillStyle = css([255, 255, 255], 0.8)
  x.beginPath(); x.arc(cx + 11 * s, cy, 2.4 * s, 0, 7); x.fill()
}

// Neon comb glyph: spine + teeth.
function neonComb(x, cx, cy, s, col) {
  const c = hx(col)
  x.save()
  x.translate(cx, cy)
  x.rotate(0.35)
  x.shadowColor = css(c, 0.9)
  x.shadowBlur = 18
  x.strokeStyle = css(c, 0.92)
  x.lineWidth = 5 * s
  x.lineCap = 'round'
  x.beginPath(); x.moveTo(-14 * s, -9 * s); x.lineTo(14 * s, -9 * s); x.stroke()
  x.lineWidth = 3 * s
  for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(-13 * s + i * 4.4 * s, -7 * s); x.lineTo(-13 * s + i * 4.4 * s, 9 * s); x.stroke() }
  x.shadowBlur = 0
  x.strokeStyle = css([255, 255, 255], 0.5)
  x.lineWidth = 1.8 * s
  x.beginPath(); x.moveTo(-13 * s, -9.6 * s); x.lineTo(13 * s, -9.6 * s); x.stroke()
  x.restore()
}

// Hanging chain with links + molten underlight rim (foundry).
function chain(x, x0, y0, y1, w, seed) {
  const linkCol = mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.35)
  const litCol = mix(hx(PAL.chromeMid), hx(PAL.chromeLo), 0.4)
  for (let y = y0, i = 0; y < y1; y += w * 1.05, i++) {
    const sway = Math.sin(y * 0.012 + seed) * 3
    x.strokeStyle = i % 2 ? css(linkCol, 1) : css(litCol, 0.85)
    x.lineWidth = w * 0.34
    x.beginPath()
    if (i % 2) x.ellipse(x0 + sway, y + w * 0.5, w * 0.3, w * 0.52, 0, 0, 7)
    else x.ellipse(x0 + sway, y + w * 0.5, w * 0.52, w * 0.3, Math.PI / 2, 0, 7)
    x.stroke()
  }
  x.strokeStyle = css(hx(PAL.molten), 0.4)
  x.lineWidth = 1.4
  x.beginPath()
  for (let y = y0; y < y1; y += 22) { const sw = Math.sin(y * 0.012 + seed) * 3; y === y0 ? x.moveTo(x0 + sw + w * 0.4, y) : x.lineTo(x0 + sw + w * 0.4, y) }
  x.stroke()
}

// Multi-pass jittered polyline stroke (baldshank lightning lineage).
function strokePts(x, pts, lw, a, col) {
  x.strokeStyle = `rgba(${col},${a})`
  x.lineWidth = lw
  x.lineJoin = 'round'
  x.beginPath()
  x.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1])
  x.stroke()
}

// Chrome Remy skull, half-buried, moonlit from upper-left; the red eye GONE DARK.
function skull(x, cx, cy, s, o = {}) {
  const tilt = o.tilt ?? 0
  const bury = o.bury ?? 0
  x.save()
  x.translate(cx, cy + bury * 30 * s)
  x.rotate(tilt)
  // cranium
  const g = x.createLinearGradient(-46 * s, -40 * s, 40 * s, 44 * s)
  g.addColorStop(0, PAL.chromeHi)
  g.addColorStop(0.42, PAL.chromeMid)
  g.addColorStop(0.78, PAL.chromeLo)
  g.addColorStop(1, css(mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.55)))
  x.fillStyle = g
  x.beginPath()
  x.moveTo(-44 * s, 4 * s)
  x.quadraticCurveTo(-48 * s, -34 * s, -12 * s, -42 * s)
  x.quadraticCurveTo(30 * s, -46 * s, 42 * s, -16 * s)
  x.quadraticCurveTo(48 * s, 6 * s, 36 * s, 22 * s)
  x.lineTo(-38 * s, 26 * s)
  x.closePath()
  x.fill()
  // jaw
  const jg = x.createLinearGradient(-20 * s, 24 * s, 20 * s, 52 * s)
  jg.addColorStop(0, PAL.chromeMid)
  jg.addColorStop(1, PAL.chromeLo)
  x.fillStyle = jg
  x.fillRect(-24 * s, 22 * s, 48 * s, 26 * s)
  // teeth
  for (let i = 0; i < 6; i++) {
    x.fillStyle = i % 2 ? css(hx(PAL.chromeMid), 0.9) : PAL.chromeHi
    x.fillRect(-22 * s + i * 7.6 * s, 24 * s, 5 * s, 12 * s)
  }
  x.fillStyle = css(hx(PAL.nightDeep), 0.85)
  for (let i = 0; i < 5; i++) x.fillRect(-18.5 * s + i * 7.6 * s, 34 * s, 2.2 * s, 4 * s)
  // brow + cheek shading (shadow side lower-right)
  x.fillStyle = css(hx(PAL.nightDeep), 0.28)
  x.beginPath(); x.ellipse(26 * s, 6 * s, 18 * s, 24 * s, 0.4, 0, 7); x.fill()
  x.fillStyle = css(hx(PAL.chromeLo), 0.5)
  x.fillRect(-40 * s, -8 * s, 78 * s, 6 * s)
  // eye sockets
  x.fillStyle = css(hx(PAL.nightDeep), 0.96)
  x.beginPath(); x.ellipse(-19 * s, 6 * s, 12.5 * s, 10 * s, 0.06, 0, 7); x.fill()
  x.beginPath(); x.ellipse(17 * s, 6 * s, 11 * s, 9 * s, -0.06, 0, 7); x.fill()
  // nasal
  x.fillStyle = css(hx(PAL.nightDeep), 0.9)
  x.beginPath(); x.moveTo(-2 * s, 12 * s); x.lineTo(3 * s, 24 * s); x.lineTo(-7 * s, 24 * s); x.closePath(); x.fill()
  // the dead red eye: one socket keeps an ember that has gone dark
  x.fillStyle = css(hx(PAL.eyeRed), 0.14)
  x.beginPath(); x.arc(-19 * s, 6 * s, 3.4 * s, 0, 7); x.fill()
  x.fillStyle = css(hx(PAL.eyeRed), 0.08)
  x.beginPath(); x.arc(-19 * s, 6 * s, 6 * s, 0, 7); x.fill()
  // frost caps on the up-moon surfaces
  x.fillStyle = css(C.frost, 0.55)
  x.beginPath()
  x.moveTo(-40 * s, -14 * s)
  x.quadraticCurveTo(-24 * s, -38 * s, 2 * s, -40 * s)
  x.quadraticCurveTo(-6 * s, -28 * s, -18 * s, -24 * s)
  x.closePath()
  x.fill()
  x.fillStyle = css(C.frost, 0.4)
  x.beginPath(); x.ellipse(-30 * s, 2 * s, 9 * s, 5 * s, -0.5, 0, 7); x.fill()
  x.restore()
}

// ============================== baked backdrops ==============================

// S1 playground: night ash field, swing-set silhouette, three chrome skulls,
// frost-blue ground under a pale moon (light from upper-left). Ground line 880.
function bgPlaygroundBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, [[0, css(C.sky0)], [0.45, css(C.sky1)], [0.8, css(C.sky2)], [1, css(mix(C.sky2, hx(PAL.chromeMid), 0.25))]])
  // pale moon, upper-left key light (kept clear of the cloud banks)
  const mh = x.createRadialGradient(350, 205, 10, 350, 205, 320)
  mh.addColorStop(0, css(hx(PAL.chromeHi), 0.5))
  mh.addColorStop(0.25, css(hx(PAL.chromeMid), 0.16))
  mh.addColorStop(1, 'rgba(10,20,32,0)')
  x.fillStyle = mh
  x.fillRect(30, -115, 640, 640)
  x.fillStyle = css(mix(hx(PAL.chromeHi), hx(PAL.dawnSky), 0.2), 0.9)
  x.beginPath(); x.arc(350, 205, 52, 0, 7); x.fill()
  x.fillStyle = css(hx(PAL.chromeMid), 0.5)
  x.beginPath(); x.arc(368, 217, 9, 0, 7); x.fill()
  x.beginPath(); x.arc(334, 189, 6, 0, 7); x.fill()
  x.beginPath(); x.arc(358, 231, 4.5, 0, 7); x.fill()
  clouds(x, 1150, 195, 1050, 120, 41, css(mix(C.sky1, hx(PAL.nightDeep), 0.4)), css(mix(C.sky1, hx(PAL.chromeMid), 0.35)), css(C.sky0))
  clouds(x, 1720, 285, 560, 95, 57, css(C.sky0), css(mix(C.sky0, hx(PAL.chromeLo), 0.5)), css(hx(PAL.nightDeep)))
  // distant sleeping city
  skyline(x, 700, 23, css(mix(C.sky0, hx(PAL.chromeLo), 0.35)), { windows: 0.06, hMin: 60, hMax: 190 })
  skyline(x, 716, 77, css(mix(C.sky0, hx(PAL.chromeLo), 0.6)), { windows: 0.04, hMin: 40, hMax: 120 })
  // frost-blue ground: moonlit field with drifts
  groundTex(x, 730, 91, css(mix(C.sky1, hx(PAL.chromeLo), 0.65)), css(mix(C.frost, hx(PAL.chromeMid), 0.3)), css(mix(C.sky0, hx(PAL.chromeLo), 0.35)), { n: 520, a: 0.22 })
  // horizon fog band (cold breath off the frost)
  const fog = x.createLinearGradient(0, 700, 0, 800)
  fog.addColorStop(0, css(mix(C.frost, hx(PAL.chromeMid), 0.5), 0.22))
  fog.addColorStop(1, css(C.frost, 0))
  x.fillStyle = fog
  x.fillRect(-OS, 700, W + OS * 2, 100)
  const r = rng(303)
  for (let i = 0; i < 22; i++) {
    const dx = r() * (W + OS * 2) - OS, dy = 780 + r() * 300
    x.fillStyle = css(mix(C.sky0, hx(PAL.nightDeep), 0.4), 0.4)
    x.beginPath(); x.ellipse(dx, dy, 80 + r() * 190, 9 + r() * 15, 0, 0, 7); x.fill()
    x.fillStyle = css(C.frost, 0.24)
    x.beginPath(); x.ellipse(dx - 20, dy - 4, 60 + r() * 140, 6 + r() * 9, 0, 0, 7); x.fill()
  }
  // settled ash flecks + a burnt patch
  for (let i = 0; i < 260; i++) {
    const ax = r() * (W + OS * 2) - OS, ay = 740 + r() * (H + OS - 740)
    x.fillStyle = r() > 0.7 ? css(hx(PAL.ember), 0.18) : css(hx(PAL.chromeMid), 0.12 + r() * 0.2)
    x.fillRect(ax, ay, 1.6 + r() * 2.4, 1.4 + r() * 1.8)
  }
  // swing-set silhouette (two A-frames, top bar, two hanging swings)
  const gx = 1310, gy = 880, s = 1.15
  x.save()
  const sil = css(mix(hx(PAL.nightDeep), hx(PAL.nightSteel), 0.4))
  x.strokeStyle = sil
  x.lineCap = 'round'
  x.lineWidth = 13 * s
  x.beginPath()
  x.moveTo(gx - 150 * s, gy); x.lineTo(gx - 96 * s, gy - 306 * s); x.lineTo(gx - 40 * s, gy)
  x.moveTo(gx + 40 * s, gy); x.lineTo(gx + 96 * s, gy - 306 * s); x.lineTo(gx + 150 * s, gy)
  x.moveTo(gx - 176 * s, gy - 306 * s); x.lineTo(gx + 176 * s, gy - 306 * s)
  x.stroke()
  // moon rim on the top bar (upper-left light)
  x.strokeStyle = css(hx(PAL.chromeMid), 0.4)
  x.lineWidth = 3
  x.beginPath(); x.moveTo(gx - 172 * s, gy - 309 * s); x.lineTo(gx + 174 * s, gy - 309 * s); x.stroke()
  // chains + seats
  x.lineWidth = 2.6 * s
  x.strokeStyle = css(mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.3))
  for (const swx of [gx - 64 * s, gx + 58 * s]) {
    const seatY = gy - 132 * s
    x.beginPath()
    x.moveTo(swx - 13 * s, gy - 302 * s); x.lineTo(swx - 13 * s, seatY)
    x.moveTo(swx + 13 * s, gy - 302 * s); x.lineTo(swx + 13 * s, seatY)
    x.stroke()
    x.fillStyle = sil
    x.fillRect(swx - 20 * s, seatY, 40 * s, 7 * s)
  }
  x.restore()
  // three chrome Remy skulls, half-buried
  skull(x, 890, 830, 1.35, { tilt: -0.08, bury: 0.15 })
  skull(x, 555, 862, 0.8, { tilt: 0.3, bury: 0.55 })
  skull(x, 1245, 852, 0.62, { tilt: -0.42, bury: 0.7 })
  // ash drift banked against each skull
  x.fillStyle = css(C.frost, 0.22)
  x.beginPath(); x.ellipse(890, 892, 110, 16, 0, 0, 7); x.fill()
  x.beginPath(); x.ellipse(555, 896, 70, 11, 0, 0, 7); x.fill()
  x.beginPath(); x.ellipse(1245, 894, 56, 10, 0, 0, 7); x.fill()
  return c
}

// S2 alley: steel-blue one-point corridor, dumpster (NO HAIR stencil), mop by the
// warm door, fire escape, wet asphalt with lamp smears. Ground line 900.
// Strike zone (x 850-1100, y 830-900) kept clear for the lightning scorch.
function bgAlleyBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  const vpX = 960, vpY = 560
  skyGrad(x, [[0, css(C.sky0)], [0.6, css(C.sky1)], [1, css(C.sky2)]])
  clouds(x, 960, 215, 1150, 120, 12, css(mix(C.sky1, hx(PAL.nightDeep), 0.5)), css(mix(C.sky1, hx(PAL.chromeLo), 0.55)), css(C.sky0))
  // far end of the alley: a lit gap + distant skyline
  skyline(x, 640, 31, css(mix(C.sky0, hx(PAL.chromeLo), 0.5)), { windows: 0.08, hMin: 30, hMax: 90 })
  const wallLit = css(mix(C.wall2, hx(PAL.chromeMid), 0.22))
  const wallShade = css(C.sky0)
  // left building wall (bricks) + perspective converging top
  x.fillStyle = css(mix(C.wall, hx(PAL.chromeLo), 0.4))
  x.beginPath()
  x.moveTo(-OS, -OS); x.lineTo(620, 310); x.lineTo(700, 900); x.lineTo(-OS, H + OS)
  x.closePath(); x.fill()
  brickWall(x, -OS, 300, 780, H, 17, css(mix(C.wall, hx(PAL.chromeLo), 0.4)), wallLit, wallShade, wallShade)
  // right building wall
  x.fillStyle = css(mix(C.wall, hx(PAL.chromeLo), 0.5))
  x.beginPath()
  x.moveTo(W + OS, -OS); x.lineTo(1310, 300); x.lineTo(1230, 900); x.lineTo(W + OS, H + OS)
  x.closePath(); x.fill()
  brickWall(x, 1160, 310, 920, H, 47, css(mix(C.wall, hx(PAL.chromeLo), 0.5)), wallLit, wallShade, wallShade)
  // rain-dark edges: walls go deep shadow toward the frame edges
  const eL = x.createLinearGradient(0, 0, 560, 0)
  eL.addColorStop(0, css(hx(PAL.nightDeep), 0.72)); eL.addColorStop(1, css(hx(PAL.nightDeep), 0))
  x.fillStyle = eL
  x.fillRect(-OS, -OS, 560 + OS, H + OS * 2)
  const eR = x.createLinearGradient(W, 0, W - 560, 0)
  eR.addColorStop(0, css(hx(PAL.nightDeep), 0.72)); eR.addColorStop(1, css(hx(PAL.nightDeep), 0))
  x.fillStyle = eR
  x.fillRect(W - 560, -OS, 560 + OS, H + OS * 2)
  // fire escape on the left wall
  x.globalAlpha = 0.75
  x.strokeStyle = css(mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.55))
  x.lineWidth = 7
  for (let f = 0; f < 3; f++) {
    const fy = 320 + f * 170, fx0 = 120 - f * 30, fx1 = 420 - f * 40
    x.beginPath(); x.moveTo(fx0, fy); x.lineTo(fx1, fy - 8); x.stroke()
    x.lineWidth = 3
    for (let vx = fx0; vx < fx1; vx += 34) { x.beginPath(); x.moveTo(vx, fy); x.lineTo(vx, fy - 30); x.stroke() }
    x.beginPath(); x.moveTo(fx0, fy - 30); x.lineTo(fx1, fy - 38); x.stroke()
    x.lineWidth = 7
    x.beginPath(); x.moveTo(fx1, fy - 8); x.lineTo(fx1 + 30, fy + 40); x.stroke()
  }
  x.globalAlpha = 1
  // pipes down the right wall
  x.strokeStyle = css(hx(PAL.chromeLo), 0.8)
  x.lineWidth = 9
  x.beginPath(); x.moveTo(1330, 230); x.lineTo(1300, 900); x.stroke()
  x.lineWidth = 5
  x.beginPath(); x.moveTo(1385, 220); x.lineTo(1362, 900); x.stroke()
  // wet asphalt with perspective sheen
  const gg = x.createLinearGradient(0, 640, 0, H + OS)
  gg.addColorStop(0, css(mix(C.sky1, hx(PAL.chromeLo), 0.4)))
  gg.addColorStop(0.4, css(mix(C.sky1, hx(PAL.chromeLo), 0.2)))
  gg.addColorStop(1, css(mix(C.sky0, hx(PAL.chromeLo), 0.3)))
  x.fillStyle = gg
  x.beginPath()
  x.moveTo(-OS, H + OS); x.lineTo(700, 900); x.lineTo(vpX - 30, vpY + 80); x.lineTo(1230, 900); x.lineTo(W + OS, H + OS)
  x.closePath(); x.fill()
  // wet sheen streaks converging to the vp
  const r = rng(303)
  x.strokeStyle = css(C.frost, 0.035)
  for (let i = 0; i < 26; i++) {
    const tx = vpX + (r() - 0.5) * 260, bx = tx + (tx - vpX) * 2.6
    x.lineWidth = 1 + r() * 3
    x.beginPath(); x.moveTo(tx, vpY + 90 + r() * 60); x.lineTo(bx, 940 + r() * 200); x.stroke()
  }
  // DUMPSTER (left): steel body, open lid, NO HAIR stencil
  x.save()
  const dx0 = 300, dx1 = 640, dTop = 700, dGy = 900
  const dBody = mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.45)
  x.fillStyle = css(dBody)
  x.fillRect(dx0, dTop + 22, dx1 - dx0, dGy - dTop - 22)
  const dsh = x.createLinearGradient(dx0, 0, dx1, 0)
  dsh.addColorStop(0, css(hx(PAL.nightDeep), 0.55)); dsh.addColorStop(0.3, css(hx(PAL.chromeMid), 0.12))
  dsh.addColorStop(0.75, css(hx(PAL.nightDeep), 0.25)); dsh.addColorStop(1, css(hx(PAL.nightDeep), 0.5))
  x.fillStyle = dsh
  x.fillRect(dx0, dTop + 22, dx1 - dx0, dGy - dTop - 22)
  // lid, tilted open
  x.save()
  x.translate(dx0 + 40, dTop + 24)
  x.rotate(-0.16)
  x.fillStyle = css(mix(dBody, hx(PAL.chromeMid), 0.5))
  x.fillRect(0, -14, dx1 - dx0 - 60, 16)
  x.fillStyle = css(hx(PAL.chromeMid), 0.35)
  x.fillRect(0, -14, dx1 - dx0 - 60, 3)
  x.restore()
  // ribs + base
  x.fillStyle = css(hx(PAL.nightDeep), 0.4)
  for (let i = 1; i < 5; i++) x.fillRect(dx0 + i * (dx1 - dx0) / 5, dTop + 26, 5, dGy - dTop - 30)
  x.fillStyle = css(hx(PAL.nightDeep), 0.9)
  x.fillRect(dx0 - 8, dGy - 10, dx1 - dx0 + 16, 14)
  // stencil
  x.font = '700 30px "JetBrains Mono"'
  x.textAlign = 'center'
  x.fillStyle = css(hx(PAL.chromeHi), 0.4)
  x.fillText('NO HAIR', (dx0 + dx1) / 2, 800)
  x.font = '700 15px "JetBrains Mono"'
  x.fillStyle = css(hx(PAL.chromeHi), 0.25)
  x.fillText('SHEDNET SANITATION', (dx0 + dx1) / 2, 830)
  x.restore()
  // DOOR (right) + warm lamp + MOP leaning
  const doorX = 1372, doorW = 110, doorY = 660
  x.fillStyle = css(mix(hx(PAL.chromeLo), hx(PAL.nightSteel), 0.5))
  x.fillRect(doorX, doorY, doorW, 240)
  x.strokeStyle = css(hx(PAL.nightDeep), 0.7)
  x.lineWidth = 3
  x.strokeRect(doorX + 10, doorY + 14, doorW - 20, 100)
  x.strokeRect(doorX + 10, doorY + 130, doorW - 20, 94)
  x.fillStyle = css(hx(PAL.chromeMid), 0.5)
  x.beginPath(); x.arc(doorX + doorW - 18, doorY + 122, 4, 0, 7); x.fill()
  // canopy + lamp
  x.fillStyle = css(mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.3))
  x.fillRect(doorX - 26, doorY - 26, doorW + 52, 14)
  const lampX = doorX + doorW / 2, lampY = doorY - 34
  x.fillStyle = css(hx(PAL.neonSign), 0.95)
  x.beginPath(); x.arc(lampX, lampY, 6, 0, 7); x.fill()
  const lg = x.createRadialGradient(lampX, lampY, 2, lampX, lampY, 90)
  lg.addColorStop(0, css(hx(PAL.neonSign), 0.5)); lg.addColorStop(1, css(hx(PAL.neonSign), 0))
  x.fillStyle = lg
  x.fillRect(lampX - 90, lampY - 90, 180, 180)
  // light cone down to the door step
  const cone = x.createLinearGradient(0, lampY, 0, 910)
  cone.addColorStop(0, css(hx(PAL.neonSign), 0.16)); cone.addColorStop(1, css(hx(PAL.neonSign), 0.02))
  x.fillStyle = cone
  x.beginPath()
  x.moveTo(lampX - 10, lampY + 6); x.lineTo(lampX + 10, lampY + 6)
  x.lineTo(lampX + 120, 910); x.lineTo(lampX - 120, 910)
  x.closePath(); x.fill()
  // lamp pool on wet ground
  x.fillStyle = css(hx(PAL.neonSign), 0.14)
  x.beginPath(); x.ellipse(lampX, 906, 130, 16, 0, 0, 7); x.fill()
  // mop leaning on the wall by the door
  x.strokeStyle = css(hx(PAL.chromeMid), 0.45)
  x.lineWidth = 4
  x.beginPath(); x.moveTo(doorX - 16, 900); x.lineTo(doorX - 48, 736); x.stroke()
  const mhg = x.createLinearGradient(doorX - 56, 900, doorX - 28, 860)
  mhg.addColorStop(0, css(hx(PAL.chromeMid), 0.4)); mhg.addColorStop(1, css(hx(PAL.chromeMid), 0.06))
  x.fillStyle = mhg
  for (let i = 0; i < 12; i++) {
    x.save(); x.translate(doorX - 21, 898); x.rotate(-0.24 + i * 0.045)
    x.fillRect(-2, -46 - (i % 3) * 7, 3.4, 46 + (i % 3) * 7)
    x.restore()
  }
  // puddles (strike zone stays clear)
  for (const [px2, py2, pw2] of [[560, 878, 130], [1560, 920, 190], [210, 930, 160]]) {
    x.fillStyle = css(mix(C.sky1, hx(PAL.chromeHi), 0.25), 0.2)
    x.beginPath(); x.ellipse(px2, py2, pw2, 12, 0, 0, 7); x.fill()
    x.fillStyle = css(hx(PAL.chromeHi), 0.05)
    x.beginPath(); x.ellipse(px2 - 10, py2 - 2, pw2 * 0.6, 7, 0, 0, 7); x.fill()
  }
  // warm lamp smear on the wet ground under the door
  smear(x, lampX, 900, 90, 150, hx(PAL.neonSign), 0.16, 31)
  return c
}

// S3 street: neon storefront row — FLOW CUTS scissor+comb over the barbershop,
// WIG-MART gag window, WE TAKE WALK-INS decal, wet pavement with vertical neon
// smears. Ground line 930.
function bgStreetBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, [[0, css(C.sky0)], [0.55, css(C.sky1)], [0.85, css(C.sky2)], [1, css(mix(C.sky2, hx(PAL.neonMagenta), 0.08))]])
  clouds(x, 700, 230, 900, 150, 8, css(C.sky1), css(mix(C.sky1, hx(PAL.chromeLo), 0.6)), css(C.sky0))
  clouds(x, 1550, 260, 760, 140, 19, css(C.sky1), css(mix(C.sky1, hx(PAL.chromeLo), 0.55)), css(C.sky0))
  skyline(x, 500, 23, css(mix(C.sky0, hx(PAL.chromeLo), 0.45)), { windows: 0.1, hMin: 60, hMax: 200 })
  // storefront row: two storeys; the wall meets the wet sidewalk at 870 so the
  // neon smears live INSIDE the 2.39 band (feet anchor stays 930 on the road)
  const GY = 930
  const BASE = 870
  const facades = [
    { x0: -OS, x1: 470, base: mix(C.wall, hx(PAL.chromeLo), 0.35) },
    { x0: 470, x1: 1000, base: mix(C.wall2, hx(PAL.chromeLo), 0.4) },
    { x0: 1000, x1: 1740, base: mix(C.wall, hx(PAL.chromeLo), 0.5) },
    { x0: 1740, x1: W + OS, base: mix(C.wall, hx(PAL.nightDeep), 0.3) },
  ]
  for (const f of facades) {
    x.fillStyle = css(f.base)
    x.fillRect(f.x0, 130, f.x1 - f.x0, BASE - 130 + OS)
    // upper windows, sparse lit
    const r = rng(f.x0 * 0.13 + 5)
    for (let wx = f.x0 + 24; wx < f.x1 - 40; wx += 86) {
      const on = hash(wx * 0.77 + 3)
      x.fillStyle = on > 0.8 ? css(hx(PAL.neonSign), 0.3) : css(mix(C.sky0, hx(PAL.chromeLo), 0.5), 0.9)
      x.fillRect(wx, 190, 46, 74)
      x.strokeStyle = css(hx(PAL.nightDeep), 0.8)
      x.lineWidth = 4
      x.strokeRect(wx, 190, 46, 74)
      void r
    }
  }
  // cornice lines catching neon
  x.fillStyle = css(mix(hx(PAL.chromeLo), hx(PAL.neonCyan), 0.25), 0.5)
  x.fillRect(-OS, 452, W + OS * 2, 10)
  // === THE BARBERSHOP: FLOW CUTS (x 470-1000) ===
  x.fillStyle = css(mix(C.wall2, hx(PAL.nightSteel), 0.4))
  x.fillRect(470, 462, 530, BASE - 462)
  // big window with warm interior + wigs on stands
  x.fillStyle = css(mix(hx(PAL.neonSign), hx(PAL.chromeHi), 0.55), 0.2)
  x.fillRect(506, 500, 380, 280)
  const wig = (wx, s, col, tilt) => {
    x.save(); x.translate(wx, 730); x.scale(s, s); x.rotate(tilt)
    x.fillStyle = css(hx(PAL.chromeLo), 0.9)
    x.fillRect(-3, -60, 6, 60)
    x.beginPath(); x.ellipse(0, 4, 22, 7, 0, 0, 7); x.fill()
    x.fillStyle = col
    x.beginPath()
    x.moveTo(-20, -52)
    x.quadraticCurveTo(-27, -84, 0, -92)
    x.quadraticCurveTo(28, -86, 21, -52)
    x.quadraticCurveTo(8, -62, 0, -60)
    x.quadraticCurveTo(-9, -62, -20, -52)
    x.closePath()
    x.fill()
    x.fillStyle = css(hx(PAL.chromeHi), 0.25)
    x.beginPath(); x.ellipse(-7, -76, 8, 12, -0.3, 0, 7); x.fill()
    x.restore()
  }
  x.fillStyle = css(mix(C.sky1, hx(PAL.neonSign), 0.22), 0.96)
  x.fillRect(506, 500, 380, 280)
  wig(590, 1.1, css(hx(PAL.neonSign), 0.85), 0.06)
  wig(690, 1.25, css(hx(PAL.blood), 0.9), -0.05)
  wig(800, 1.0, css(hx(PAL.chromeMid), 0.85), 0.1)
  // mullions over the wigs
  x.strokeStyle = css(mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.4))
  x.lineWidth = 9
  x.strokeRect(506, 500, 380, 280)
  x.beginPath(); x.moveTo(696, 500); x.lineTo(696, 780); x.stroke()
  // WE TAKE WALK-INS decal on the glass
  x.save()
  x.translate(598, 758)
  x.font = '700 17px "Space Grotesk"'
  x.textAlign = 'center'
  x.fillStyle = css(hx(PAL.chromeHi), 0.75)
  x.rotate(-0.015)
  x.fillText('WE TAKE WALK-INS', 0, 0)
  x.restore()
  // door
  x.fillStyle = css(mix(hx(PAL.chromeLo), hx(PAL.nightSteel), 0.4))
  x.fillRect(906, 560, 84, BASE - 560)
  x.fillStyle = css(hx(PAL.neonSign), 0.12)
  x.fillRect(918, 580, 60, BASE - 600)
  // awning
  for (let i = 0; i < 11; i++) {
    x.fillStyle = i % 2 ? css(mix(hx(PAL.neonCyan), hx(PAL.nightDeep), 0.55), 0.95) : css(mix(hx(PAL.chromeHi), hx(PAL.nightDeep), 0.65), 0.95)
    x.beginPath()
    x.moveTo(486 + i * 48, 480); x.lineTo(534 + i * 48, 480)
    x.lineTo(530 + i * 48, 522); x.lineTo(482 + i * 48, 522)
    x.closePath(); x.fill()
  }
  // THE SIGN: scissor + comb glyphs + FLOW CUTS tubes
  neonScissor(x, 560, 392, 1.5, PAL.neonMagenta)
  neonComb(x, 648, 398, 1.35, PAL.neonMagenta)
  neonTube(x, 'FLOW CUTS', 1000, 415, 74, PAL.neonCyan, 5)
  // === WIG-MART (x 1000-1740) ===
  x.fillStyle = css(mix(C.wall, hx(PAL.chromeLo), 0.45))
  x.fillRect(1020, 462, 700, BASE - 462)
  x.fillStyle = css(mix(C.sky1, hx(PAL.neonMagenta), 0.16), 0.95)
  x.fillRect(1090, 512, 420, 290)
  // the enormous prize wig on a pedestal
  x.save()
  x.translate(1300, 762)
  x.fillStyle = css(hx(PAL.chromeLo), 0.95)
  x.fillRect(-14, -50, 28, 50)
  x.beginPath(); x.ellipse(0, 2, 34, 9, 0, 0, 7); x.fill()
  x.fillStyle = css(hx(PAL.neonMagenta), 0.55)
  x.beginPath()
  x.moveTo(-34, -44)
  x.quadraticCurveTo(-48, -110, 2, -128)
  x.quadraticCurveTo(52, -112, 36, -44)
  x.quadraticCurveTo(12, -60, 0, -57)
  x.quadraticCurveTo(-14, -60, -34, -44)
  x.closePath()
  x.fill()
  x.fillStyle = css(hx(PAL.neonMagenta), 0.35)
  x.beginPath(); x.ellipse(-12, -96, 12, 22, -0.35, 0, 7); x.fill()
  x.restore()
  x.strokeStyle = css(mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.4))
  x.lineWidth = 9
  x.strokeRect(1090, 512, 420, 290)
  x.font = '700 26px "Space Grotesk"'
  x.textAlign = 'center'
  x.fillStyle = css(hx(PAL.neonSign), 0.75)
  x.fillText('EVERY HEAD WELCOME', 1300, 826)
  // WIG-MART sign tubes
  neonTube(x, 'WIG-MART', 1440, 425, 64, PAL.neonMagenta, 9)
  neonTube(x, 'OPEN 24 HRS', 1300, 470, 30, PAL.neonSign, 13)
  // right-hand dark shopfront
  x.fillStyle = css(mix(hx(PAL.nightDeep), hx(PAL.chromeLo), 0.4))
  x.fillRect(1740, 400, W - 1740 + OS, BASE - 400 + OS)
  // === WET PAVEMENT (870 -> bottom) ===
  const pg = x.createLinearGradient(0, BASE, 0, H + OS)
  pg.addColorStop(0, css(mix(C.sky1, hx(PAL.chromeLo), 0.3)))
  pg.addColorStop(1, css(mix(C.sky0, hx(PAL.nightDeep), 0.4)))
  x.fillStyle = pg
  x.fillRect(-OS, BASE, W + OS * 2, H + OS - BASE + OS)
  // curb line catching neon
  x.fillStyle = css(hx(PAL.chromeMid), 0.3)
  x.fillRect(-OS, BASE, W + OS * 2, 5)
  // vertical neon smears under each light source + window glow (wet-read, not paint)
  smear(x, 840, BASE + 4, 260, 260, hx(PAL.neonCyan), 0.13, 51)
  smear(x, 600, BASE + 4, 150, 180, hx(PAL.neonMagenta), 0.08, 52)
  smear(x, 1440, BASE + 4, 280, 270, hx(PAL.neonMagenta), 0.12, 53)
  smear(x, 1300, BASE + 4, 170, 170, hx(PAL.neonSign), 0.08, 54)
  smear(x, 240, BASE + 4, 130, 160, hx(PAL.neonSign), 0.09, 55)
  smear(x, 1900, BASE + 4, 130, 160, hx(PAL.neonSign), 0.09, 56)
  smear(x, 696, BASE + 4, 380, 120, hx(PAL.neonSign), 0.07, 57)
  // street furniture ON the road (drawn after the pavement so it stands in front)
  for (const lx of [180, 1870]) {
    x.strokeStyle = css(mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.4))
    x.lineWidth = 10
    x.beginPath(); x.moveTo(lx, GY); x.lineTo(lx, 320); x.quadraticCurveTo(lx, 260, lx + 60, 268); x.stroke()
    x.fillStyle = css(hx(PAL.neonSign), 0.95)
    x.beginPath(); x.ellipse(lx + 66, 276, 15, 8, 0.3, 0, 7); x.fill()
    const hg = x.createRadialGradient(lx + 66, 280, 3, lx + 66, 280, 130)
    hg.addColorStop(0, css(hx(PAL.neonSign), 0.45)); hg.addColorStop(1, css(hx(PAL.neonSign), 0))
    x.fillStyle = hg
    x.fillRect(lx - 70, 150, 280, 280)
    x.fillStyle = css(hx(PAL.neonSign), 0.1)
    x.beginPath(); x.ellipse(lx + 40, GY - 6, 150, 18, 0, 0, 7); x.fill()
  }
  // trash bin the machine will shoulder aside
  x.fillStyle = css(mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.25))
  x.fillRect(1130, 830, 74, 100)
  x.fillStyle = css(hx(PAL.chromeMid), 0.3)
  x.fillRect(1126, 824, 82, 12)
  x.fillStyle = css(hx(PAL.nightDeep), 0.5)
  x.beginPath(); x.ellipse(1167, 934, 52, 7, 0, 0, 7); x.fill()
  // puddle ripples
  const r2 = rng(77)
  for (let i = 0; i < 14; i++) {
    const px = r2() * W, py = BASE + 12 + r2() * 58
    x.strokeStyle = css(C.frost, 0.08 + r2() * 0.08)
    x.lineWidth = 1.5
    x.beginPath(); x.ellipse(px, py, 16 + r2() * 44, 2.6 + r2() * 3, 0, 0, 7); x.stroke()
  }
  return c
}

// S5 foundry interior: catwalk grating in perspective, hanging chains + hooks,
// ladle crane, the COOLED STEEL PANEL (the mirror the machine meets), molten
// pool mouth at frame bottom underlighting everything. Catwalk line 870.
function bgFoundryBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  // dark furnace ceiling + I-beams
  skyGrad(x, [[0, css(hx(PAL.nightDeep))], [0.6, css(mix(hx(PAL.nightDeep), hx(PAL.ember), 0.14))], [1, css(mix(hx(PAL.ember), hx(PAL.nightSteel), 0.35))]])
  x.fillStyle = css(mix(hx(PAL.nightDeep), hx(PAL.nightSteel), 0.4))
  for (let i = 0; i < 4; i++) x.fillRect(-OS, 90 + i * 34, W + OS * 2, 16)
  // back wall: dark panel seams
  x.fillStyle = css(mix(hx(PAL.nightDeep), hx(PAL.chromeLo), 0.22))
  x.fillRect(-OS, 150, W + OS * 2, 660)
  x.strokeStyle = css(hx(PAL.nightDeep), 0.8)
  x.lineWidth = 4
  for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(-OS + i * 300, 150); x.lineTo(-OS + i * 300 + 60, 810); x.stroke() }
  for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-OS, 210 + i * 180); x.lineTo(W + OS, 210 + i * 180); x.stroke() }
  // === THE COOLED STEEL PANEL (the mirror) ===
  const pX = 1160, pY = 300, pW = 360, pH = 390
  const sg = x.createLinearGradient(pX, pY, pX, pY + pH)
  sg.addColorStop(0, css(mix(hx(PAL.chromeLo), hx(PAL.chromeMid), 0.35)))
  sg.addColorStop(0.4, css(mix(hx(PAL.chromeLo), hx(PAL.nightSteel), 0.5)))
  sg.addColorStop(1, css(mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.55)))
  x.fillStyle = sg
  x.fillRect(pX, pY, pW, pH)
  // soft vertical specular band + streaks (mirrored-ish dark slab)
  const spec = x.createLinearGradient(pX + pW * 0.3, 0, pX + pW * 0.62, 0)
  spec.addColorStop(0, css(hx(PAL.chromeMid), 0)); spec.addColorStop(0.5, css(hx(PAL.chromeMid), 0.26)); spec.addColorStop(1, css(hx(PAL.chromeMid), 0))
  x.fillStyle = spec
  x.fillRect(pX, pY, pW, pH)
  const rp = rng(404)
  for (let i = 0; i < 10; i++) {
    x.fillStyle = css(hx(PAL.chromeHi), 0.02 + rp() * 0.04)
    x.fillRect(pX + rp() * pW, pY + rp() * pH * 0.7, 3 + rp() * 10, 40 + rp() * 140)
  }
  // molten underlight licking the panel's bottom edge
  const pglow = x.createLinearGradient(0, pY + pH - 120, 0, pY + pH + 14)
  pglow.addColorStop(0, css(hx(PAL.molten), 0)); pglow.addColorStop(1, css(hx(PAL.molten), 0.3))
  x.fillStyle = pglow
  x.fillRect(pX, pY + pH - 120, pW, 134)
  // bevel frame + corner bolts
  x.strokeStyle = css(hx(PAL.chromeMid), 0.5)
  x.lineWidth = 3
  x.strokeRect(pX, pY, pW, pH)
  x.strokeStyle = css(hx(PAL.chromeHi), 0.3)
  x.lineWidth = 1.5
  x.beginPath(); x.moveTo(pX, pY + pH); x.lineTo(pX, pY); x.lineTo(pX + pW, pY); x.stroke()
  x.fillStyle = css(hx(PAL.chromeMid), 0.8)
  for (const [bx, by] of [[pX + 16, pY + 16], [pX + pW - 16, pY + 16], [pX + 16, pY + pH - 16], [pX + pW - 16, pY + pH - 16]]) {
    x.beginPath(); x.arc(bx, by, 5, 0, 7); x.fill()
  }
  // ladle crane, far left: jib arm + cable + tilted cup hanging plumb
  x.save()
  x.fillStyle = css(mix(hx(PAL.nightDeep), hx(PAL.chromeLo), 0.45))
  x.fillRect(118, 170, 30, 580)
  x.fillRect(60, 330, 400, 20)
  x.strokeStyle = css(mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.3))
  x.lineWidth = 5
  x.beginPath(); x.moveTo(400, 350); x.lineTo(414, 520); x.stroke()
  x.fillStyle = css(mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.3))
  x.fillRect(406, 516, 16, 18)
  x.save()
  x.translate(414, 576)
  x.rotate(-0.22)
  x.beginPath()
  x.moveTo(-58, -14); x.quadraticCurveTo(-66, 70, 0, 92); x.quadraticCurveTo(66, 70, 58, -14)
  x.quadraticCurveTo(20, -2, 0, -2); x.quadraticCurveTo(-20, -2, -58, -14)
  x.closePath()
  x.fill()
  x.strokeStyle = css(hx(PAL.molten), 0.3)
  x.lineWidth = 2.4
  x.beginPath(); x.moveTo(-50, 4); x.quadraticCurveTo(-26, 62, 2, 74); x.stroke()
  x.restore()
  x.restore()
  // hanging chains + hooks (underlit orange on the lower rims)
  chain(x, 360, 118, 600, 15, 3)
  chain(x, 540, 118, 480, 11, 7)
  chain(x, 1660, 118, 640, 17, 11)
  // hooks at the chain feet
  for (const [hxp, hyp] of [[360, 600], [1660, 640]]) {
    x.strokeStyle = css(hx(PAL.chromeMid), 0.85)
    x.lineWidth = 9
    x.beginPath(); x.arc(hxp, hyp + 16, 22, -0.6, 2.8); x.stroke()
  }
  // glowing ember vents in the back wall, grilled + restrained
  // (edges only — centre kept clear for the duel)
  for (const vx of [260, 1720]) {
    x.fillStyle = css(mix(hx(PAL.nightDeep), hx(PAL.chromeLo), 0.3))
    x.fillRect(vx - 60, 590, 120, 200)
    const vg = x.createLinearGradient(0, 620, 0, 790)
    vg.addColorStop(0, css(hx(PAL.ember), 0.35)); vg.addColorStop(1, css(hx(PAL.molten), 0.6))
    x.fillStyle = vg
    x.fillRect(vx - 44, 616, 88, 174)
    // grate slats over the glow
    x.fillStyle = css(mix(hx(PAL.nightDeep), hx(PAL.chromeLo), 0.35))
    for (let sy = 626; sy < 786; sy += 22) x.fillRect(vx - 44, sy, 88, 9)
    x.strokeStyle = css(hx(PAL.nightDeep), 0.8)
    x.lineWidth = 8
    x.strokeRect(vx - 60, 590, 120, 200)
  }
  // === CATWALK: grating plane in perspective (far edge y 790, front lip 900) ===
  const gBase = x.createLinearGradient(0, 790, 0, 900)
  gBase.addColorStop(0, css(mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.55)))
  gBase.addColorStop(1, css(mix(hx(PAL.chromeLo), hx(PAL.ember), 0.26)))
  x.fillStyle = gBase
  x.fillRect(-OS, 790, W + OS * 2, 110)
  // diamond lattice: rows spread apart toward the viewer, cells grow
  const rows = []
  for (let i = 0; i < 6; i++) rows.push(790 + i * i * 4 + i * 10)
  rows.push(900)
  x.strokeStyle = css(mix(hx(PAL.nightDeep), hx(PAL.chromeLo), 0.3), 0.9)
  for (let ri = 0; ri < rows.length - 1; ri++) {
    const yA = rows[ri], yB = rows[ri + 1]
    const yMid = (yA + yB) / 2
    const dw = 26 + (yA - 790) * 0.6
    const off = (ri % 2) * dw
    const rg = rng(60 + ri)
    for (let cx2 = -dw * 2 - OS; cx2 < W + OS + dw * 2; cx2 += dw * 2) {
      // plate variance
      if (rg() > 0.82) {
        x.fillStyle = css(hx(PAL.chromeMid), 0.07 + rg() * 0.06)
        x.beginPath()
        x.moveTo(cx2 + off, yMid); x.lineTo(cx2 + off + dw, yA); x.lineTo(cx2 + off + dw * 2, yMid); x.lineTo(cx2 + off + dw, yB)
        x.closePath(); x.fill()
      }
      x.lineWidth = 2 + (yA - 790) * 0.012
      x.beginPath()
      x.moveTo(cx2 + off, yMid); x.lineTo(cx2 + off + dw, yA); x.lineTo(cx2 + off + dw * 2, yMid); x.lineTo(cx2 + off + dw, yB)
      x.closePath(); x.stroke()
    }
  }
  // molten light bleeding onto the grate, strongest at the lip
  const bleed = x.createLinearGradient(0, 830, 0, 900)
  bleed.addColorStop(0, css(hx(PAL.molten), 0)); bleed.addColorStop(1, css(hx(PAL.molten), 0.3))
  x.fillStyle = bleed
  x.fillRect(-OS, 830, W + OS * 2, 70)
  // railing along the far edge (underlit)
  x.strokeStyle = css(mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.3))
  x.lineWidth = 8
  x.beginPath(); x.moveTo(-OS, 762); x.lineTo(W + OS, 762); x.stroke()
  x.lineWidth = 5
  x.beginPath(); x.moveTo(-OS, 786); x.lineTo(W + OS, 786); x.stroke()
  x.lineWidth = 4
  for (let px3 = -60; px3 < W + OS; px3 += 150) { x.beginPath(); x.moveTo(px3, 762); x.lineTo(px3, 790); x.stroke() }
  // molten rim on the railing bottom edge
  x.strokeStyle = css(hx(PAL.molten), 0.5)
  x.lineWidth = 2.2
  x.beginPath(); x.moveTo(-OS, 766); x.lineTo(W + OS, 766); x.stroke()
  // === THE MOLTEN POOL MOUTH (visible inside the 2.39 band: lip at 900) ===
  // dark lip of the catwalk opening
  x.fillStyle = css(mix(hx(PAL.nightDeep), hx(PAL.chromeLo), 0.35))
  x.fillRect(-OS, 896, W + OS * 2, 12)
  // the pool itself: bright at the lip, deep below
  const pool = x.createLinearGradient(0, 912, 0, H + OS)
  pool.addColorStop(0, css(hx(PAL.moltenHi)))
  pool.addColorStop(0.35, css(hx(PAL.molten)))
  pool.addColorStop(1, css(hx(PAL.ember)))
  x.fillStyle = pool
  x.fillRect(-OS, 912, W + OS * 2, H + OS - 912 + OS)
  // crust islands drifting on the bake (live drift comes from drawMolten)
  const rc = rng(88)
  for (let i = 0; i < 9; i++) {
    const ix = rc() * (W + OS * 2) - OS, iy = 934 + rc() * 140
    x.fillStyle = css(mix(hx(PAL.ember), hx(PAL.nightDeep), 0.35), 0.85)
    x.beginPath(); x.ellipse(ix, iy, 40 + rc() * 110, 8 + rc() * 12, 0, 0, 7); x.fill()
    x.fillStyle = css(hx(PAL.moltenHi), 0.25)
    x.beginPath(); x.ellipse(ix - 14, iy - 3, (40 + rc() * 90) * 0.6, 4, 0, 0, 7); x.fill()
  }
  // hot lip line
  x.fillStyle = css(hx(PAL.moltenHi), 0.9)
  x.fillRect(-OS, 908, W + OS * 2, 5)
  // underlight spilling UP onto the railing/back wall
  const spill = x.createRadialGradient(960, 960, 40, 960, 960, 640)
  spill.addColorStop(0, css(hx(PAL.molten), 0.38)); spill.addColorStop(0.55, css(hx(PAL.molten), 0.13)); spill.addColorStop(1, css(hx(PAL.molten), 0))
  x.save()
  x.globalCompositeOperation = 'lighter'
  x.fillStyle = spill
  x.fillRect(320, 340, 1280, 680)
  x.restore()
  return c
}

// S6 dawn: gold-to-blue sky, low sun right, waking city, foundry exterior with a
// warm-lit doorway, gold pavement with the planting CRACK. Ground line 920.
function bgDawnBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, [[0, css(mix(hx(PAL.dawnSky), hx(PAL.nightSteel), 0.55))], [0.42, css(hx(PAL.dawnSky))], [0.68, css(mix(hx(PAL.dawnSky), hx(PAL.dawnGold), 0.6))], [0.85, css(hx(PAL.dawnGold))], [1, css(mix(hx(PAL.dawnGold), hx(PAL.moltenHi), 0.4))]])
  // low sun, right — upper disc clears the roofline between the cloud banks
  const sunX = 1060, sunY = 452
  const sh = x.createRadialGradient(sunX, sunY, 10, sunX, sunY, 460)
  sh.addColorStop(0, css(hx(PAL.moltenHi), 0.85)); sh.addColorStop(0.18, css(hx(PAL.dawnGold), 0.5)); sh.addColorStop(1, css(hx(PAL.dawnGold), 0))
  x.fillStyle = sh
  x.fillRect(600, 0, 920, 920)
  x.fillStyle = css(mix(hx(PAL.moltenHi), hx(PAL.dawnGold), 0.4), 0.95)
  x.beginPath(); x.arc(sunX, sunY, 46, 0, 7); x.fill()
  clouds(x, 620, 260, 900, 110, 15, css(mix(hx(PAL.dawnSky), hx(PAL.chromeLo), 0.4)), css(mix(hx(PAL.dawnGold), hx(PAL.dawnSky), 0.5)), css(mix(hx(PAL.dawnSky), hx(PAL.chromeLo), 0.6)))
  clouds(x, 1480, 200, 680, 95, 27, css(mix(hx(PAL.dawnSky), hx(PAL.chromeLo), 0.45)), css(mix(hx(PAL.dawnGold), hx(PAL.dawnSky), 0.45)), css(mix(hx(PAL.dawnSky), hx(PAL.chromeLo), 0.65)))
  // waking city, left + centre
  skyline(x, 700, 43, css(mix(hx(PAL.chromeLo), hx(PAL.dawnSky), 0.35)), { windows: 0.12, hMin: 80, hMax: 260, skirt: 160 })
  skyline(x, 716, 91, css(mix(hx(PAL.chromeLo), hx(PAL.dawnSky), 0.5)), { windows: 0.09, hMin: 50, hMax: 150, skirt: 160 })
  // dawn haze over the skyline feet
  const hz = x.createLinearGradient(0, 590, 0, 780)
  hz.addColorStop(0, css(hx(PAL.dawnGold), 0)); hz.addColorStop(0.55, css(hx(PAL.dawnGold), 0.4)); hz.addColorStop(1, css(hx(PAL.dawnGold), 0.55))
  x.fillStyle = hz
  x.fillRect(-OS, 590, W + OS * 2, 190)
  // === THE FOUNDRY, right: big steel facade, warm doorway ===
  const fX = 1260
  x.fillStyle = css(mix(hx(PAL.chromeLo), hx(PAL.nightSteel), 0.45))
  x.fillRect(fX, 300, W - fX + OS, 620)
  // sunlit right faces / shaded left faces
  x.fillStyle = css(mix(hx(PAL.dawnGold), hx(PAL.chromeLo), 0.35), 0.38)
  x.fillRect(fX + 60, 300, 84, 620)
  x.fillRect(fX + 250, 300, 60, 620)
  x.fillRect(fX + 430, 300, 90, 620)
  x.fillStyle = css(mix(hx(PAL.nightDeep), hx(PAL.chromeLo), 0.4), 0.5)
  x.fillRect(fX + 175, 300, 55, 620)
  x.fillRect(fX + 340, 300, 65, 620)
  // panel seams + rivet rows
  x.strokeStyle = css(hx(PAL.nightDeep), 0.5)
  x.lineWidth = 3
  for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(fX + 20 + i * 160, 300); x.lineTo(fX + 20 + i * 160, 920); x.stroke() }
  x.fillStyle = css(hx(PAL.chromeMid), 0.4)
  for (let yy = 340; yy < 920; yy += 46) for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(fX + 40 + i * 160, yy, 3, 0, 7); x.fill() }
  // the doorway, open a hand's width, warm interior light seeping out
  const dX = 1420, dW = 190, dY = 560
  x.fillStyle = css(mix(hx(PAL.nightDeep), hx(PAL.chromeLo), 0.35))
  x.fillRect(dX, dY, dW, 360)
  const dg = x.createLinearGradient(dX, dY, dX + dW, dY + 360)
  dg.addColorStop(0, css(hx(PAL.moltenHi), 0.75)); dg.addColorStop(0.5, css(hx(PAL.dawnGold), 0.35)); dg.addColorStop(1, css(hx(PAL.ember), 0.5))
  x.fillStyle = dg
  x.fillRect(dX + 12, dY + 14, dW - 24, 346)
  // door slab ajar on the right, catching sun
  x.fillStyle = css(mix(hx(PAL.chromeLo), hx(PAL.dawnGold), 0.3))
  x.fillRect(dX + dW - 52, dY + 8, 46, 352)
  x.fillStyle = css(hx(PAL.dawnGold), 0.5)
  x.fillRect(dX + dW - 52, dY + 8, 8, 352)
  // light spilling out onto the pavement + warm pool at the doorstep
  const dspill = x.createLinearGradient(0, dY + 356, 0, 1000)
  dspill.addColorStop(0, css(hx(PAL.dawnGold), 0.4)); dspill.addColorStop(1, css(hx(PAL.dawnGold), 0))
  x.fillStyle = dspill
  x.beginPath()
  x.moveTo(dX + 8, dY + 352); x.lineTo(dX + dW - 4, dY + 352)
  x.lineTo(dX + dW + 110, 1000); x.lineTo(dX - 180, 1000)
  x.closePath(); x.fill()
  x.fillStyle = css(hx(PAL.dawnGold), 0.18)
  x.beginPath(); x.ellipse(dX + dW / 2 - 20, 928, 150, 14, 0, 0, 7); x.fill()
  // signage ghost on the facade
  x.font = '700 34px "Space Grotesk"'
  x.textAlign = 'center'
  x.fillStyle = css(hx(PAL.chromeMid), 0.5)
  x.fillText('SHEDNET FOUNDRY No.9', fX + 250, 380)
  // === GOLD PAVEMENT (800 -> bottom; feet anchor 920, crack at 918) ===
  const pg = x.createLinearGradient(0, 800, 0, H + OS)
  pg.addColorStop(0, css(mix(hx(PAL.dawnGold), hx(PAL.chromeLo), 0.5)))
  pg.addColorStop(1, css(mix(hx(PAL.dawnGold), hx(PAL.ember), 0.3)))
  x.fillStyle = pg
  x.fillRect(-OS, 800, W + OS * 2, H + OS - 800 + OS)
  // pavement slabs + long shadows cast LEFT by the low sun
  x.strokeStyle = css(mix(hx(PAL.chromeLo), hx(PAL.ember), 0.4), 0.5)
  x.lineWidth = 3
  for (let i = 0; i < 5; i++) {
    const yy = 828 + i * i * 9 + i * 22
    x.beginPath()
    for (let px = -OS; px <= W + OS; px += 160) x.lineTo(px + (i % 2) * 70, yy + Math.sin(px * 0.01) * 2.5)
    x.stroke()
  }
  const rd = rng(909)
  for (let i = 0; i < 10; i++) {
    const sx0 = 200 + rd() * 1500, sy0 = 850 + rd() * 130
    x.fillStyle = css(mix(hx(PAL.chromeLo), hx(PAL.nightDeep), 0.5), 0.2)
    x.beginPath()
    x.moveTo(sx0, sy0); x.lineTo(sx0 - 90 - rd() * 120, sy0 + 8); x.lineTo(sx0 - 76 - rd() * 90, sy0 + 17)
    x.closePath(); x.fill()
  }
  // THE CRACK: the planting spot, foreground-centre
  x.save()
  x.translate(880, 918)
  x.fillStyle = css(hx(PAL.nightDeep), 0.9)
  x.beginPath()
  x.moveTo(-52, 0)
  x.lineTo(-30, 5); x.lineTo(-12, -2); x.lineTo(6, 6); x.lineTo(28, 0); x.lineTo(50, 4)
  x.lineTo(40, 12); x.lineTo(12, 8); x.lineTo(-14, 14); x.lineTo(-40, 9)
  x.closePath()
  x.fill()
  x.strokeStyle = css(hx(PAL.ember), 0.5)
  x.lineWidth = 2
  x.beginPath(); x.moveTo(-46, 2); x.lineTo(-12, -1); x.lineTo(20, 4); x.lineTo(44, 3); x.stroke()
  // crumb dirt mound beside it
  x.fillStyle = css(mix(hx(PAL.ember), hx(PAL.chromeLo), 0.4), 0.8)
  x.beginPath(); x.ellipse(64, 8, 16, 5, 0, 0, 7); x.fill()
  x.restore()
  return c
}

// ============================== live passes (pure f(t)) ==============================

// Analytic rain: 3 hash-seeded parallax layers, single path per layer, wrapped by
// modulo; slant from wind (fade-to-bald rainLayers port at 1080p). Keeps falling
// through hit-stops because it is t-driven.
function splashes(ctx, t, y, k, seed) {
  const n = Math.round(18 * k)
  for (let i = 0; i < n; i++) {
    const cyc = 0.5 + hash(i * 13 + seed) * 0.4
    const ph = (t / cyc + hash(i * 7 + seed)) % 1
    const sx = hash(i * 5 + seed) * W
    const a = (1 - ph) * 0.2
    if (a <= 0.01) continue
    ctx.strokeStyle = css(C.rainCol, a)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(sx, y + (hash(i * 3 + seed) - 0.5) * 10, 2 + ph * 8, 1 + ph * 2.6, 0, 0, 7)
    ctx.stroke()
  }
}

function drawRain(ctx, t, o = {}) {
  const density = o.density ?? 1
  if (density <= 0.02) return
  const wind = o.wind ?? -150
  const slant = o.slant ?? 1
  const layers = [
    { n: Math.round(130 * density), sp: 640, len: 18, a: 0.11, w: 1.1 },
    { n: Math.round(82 * density), sp: 940, len: 29, a: 0.15, w: 1.3 },
    { n: Math.round(44 * density), sp: 1300, len: 46, a: 0.19, w: 2 },
  ]
  ctx.save()
  ctx.lineCap = 'butt'
  for (let li = 0; li < 3; li++) {
    const L = layers[li]
    ctx.strokeStyle = css(C.rainCol, L.a)
    ctx.lineWidth = L.w
    ctx.beginPath()
    const span = H + 160
    for (let i = 0; i < L.n; i++) {
      const xi = hash(i * 3.7 + li * 771), yi = hash(i * 7.3 + li * 913 + 3)
      const px = (((xi * (W + 260) + t * wind * (0.6 + li * 0.35) - 130) % (W + 260)) + W + 260) % (W + 260) - 130
      const py = (((yi * span + t * L.sp) % span) + span) % span - 80
      ctx.moveTo(px, py)
      ctx.lineTo(px + (wind / 900) * L.len * 3 * slant, py + L.len)
    }
    ctx.stroke()
  }
  ctx.restore()
  if (o.splashY != null) splashes(ctx, t, o.splashY, Math.min(1, density), 5)
}

// Lightning TIME-BUBBLE: seeded electric sphere + radial bolt fans + two ground
// strikes; glow cools over ~1.5 s. lt = seconds since the strike (skip if < 0).
// One seeded shape per seed, redrawn per frame with a hash flicker (baldshank).
function drawLightning(ctx, lt, o = {}) {
  if (lt == null || lt < 0 || lt > 2.2) return
  const seed = o.seed ?? 11
  const cx = o.cx ?? 960, cy = o.cy ?? 270
  const groundY = o.groundY ?? 900
  const strikeX = o.strikeX ?? cx
  const k = Math.exp(-lt * 2.1)
  const flick = 0.6 + 0.4 * hash(seed * 7 + Math.floor(lt * 34))
  const R = (o.r ?? 150) * (1 + 0.3 * Math.min(1, lt / 0.4))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // sky wash (first instants only)
  ctx.fillStyle = `rgba(198,214,244,${(0.16 * k * flick).toFixed(3)})`
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // core glow
  const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, R * 2.4)
  cg.addColorStop(0, `rgba(214,230,255,${(0.55 * k).toFixed(3)})`)
  cg.addColorStop(0.45, `rgba(150,185,235,${(0.22 * k).toFixed(3)})`)
  cg.addColorStop(1, 'rgba(150,185,235,0)')
  ctx.fillStyle = cg
  ctx.fillRect(cx - R * 2.4, cy - R * 2.4, R * 4.8, R * 4.8)
  // sphere hull: seeded crack arcs bent around the circle
  const r = rng(seed)
  for (let a2 = 0; a2 < 5; a2++) {
    const a0 = (a2 / 5) * Math.PI * 2 + r() * 0.8
    const span = 0.7 + r() * 1.4
    const rad = R * (0.9 + r() * 0.22)
    const pts = []
    for (let i = 0; i <= 9; i++) {
      const u = i / 9
      const an = a0 + span * u
      const j = (hash(seed * 31 + a2 * 13 + i) - 0.5) * 12
      pts.push([cx + Math.cos(an) * (rad + j), cy + Math.sin(an) * (rad + j) * 0.92])
    }
    strokePts(ctx, pts, 4.5, 0.85 * k * flick, '214,230,255')
    strokePts(ctx, pts, 1.8, 0.6 * k, '240,248,255')
  }
  // radial bolt fans off the sphere
  for (let b2 = 0; b2 < 6; b2++) {
    const an = r() * Math.PI * 2
    const len = R * (1.1 + r() * 1.6)
    const pts = []
    const segs = 6
    for (let i = 0; i <= segs; i++) {
      const u = i / segs
      const jr = (hash(seed * 17 + b2 * 29 + i) - 0.5) * 40
      pts.push([cx + Math.cos(an) * (R * 0.9 + len * u) + jr * u, cy + Math.sin(an) * (R * 0.9 + len * u) + jr * u * 0.4])
    }
    strokePts(ctx, pts, 3.2, 0.6 * k * flick, '206,224,255')
    strokePts(ctx, pts, 1.3, 0.5 * k, '238,246,255')
  }
  // two strikes down to the street
  for (let sb = 0; sb < 2; sb++) {
    const sxx = strikeX + (sb === 0 ? -50 : 60)
    const pts = []
    let px = cx + (sb === 0 ? -R * 0.35 : R * 0.3), py = cy + R * 0.7
    pts.push([px, py])
    const steps = 7
    for (let i = 1; i <= steps; i++) {
      py = cy + R * 0.7 + ((groundY - cy - R * 0.7) * i) / steps
      px += (sxx - px) / (steps - i + 1) + (hash(seed * 13 + sb * 7 + i) - 0.5) * 110
      pts.push([px, py])
    }
    pts[pts.length - 1][0] = sxx
    strokePts(ctx, pts, 6.5, 0.9 * k * flick, '224,236,255')
    strokePts(ctx, pts, 2.6, 0.55 * k, '240,248,255')
    strokePts(ctx, pts, 1.2, 0.4 * k, '255,255,255')
  }
  // ground flash at the strike foot (cools with k)
  const gg = ctx.createRadialGradient(strikeX, groundY, 4, strikeX, groundY, 300)
  gg.addColorStop(0, `rgba(205,222,255,${(0.5 * k * flick).toFixed(3)})`)
  gg.addColorStop(1, 'rgba(205,222,255,0)')
  ctx.fillStyle = gg
  ctx.fillRect(strikeX - 300, groundY - 300, 600, 600)
  ctx.restore()
}

// Cooling scorch ring where the bubble struck: molten cracks -> ember -> dark.
// lt = seconds since strike; the charred ring persists faintly after 2 s.
function drawScorch(ctx, lt, o = {}) {
  if (lt == null || lt < 0) return
  const cx = o.x ?? 960, cy = o.y ?? 900, r = o.r ?? 150
  const cool = Math.min(1, lt / 2)
  const hot = 1 - cool
  ctx.save()
  // charred bed
  const bed = mix(mix(hx(PAL.ember), hx(PAL.nightDeep), 0.3 + 0.55 * cool), hx(PAL.nightDeep), 0.2)
  const g = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r * 1.05)
  g.addColorStop(0, css(bed, 0.85))
  g.addColorStop(0.72, css(hx(PAL.nightDeep), 0.65))
  g.addColorStop(1, css(hx(PAL.nightDeep), 0))
  ctx.fillStyle = g
  ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.05, r * 0.34, 0, 0, 7); ctx.fill()
  // fresh molten glow
  if (hot > 0.02) {
    ctx.globalCompositeOperation = 'lighter'
    const mg = ctx.createRadialGradient(cx, cy, 4, cx, cy, r * 0.9)
    mg.addColorStop(0, `rgba(255,140,40,${(0.4 * hot).toFixed(3)})`)
    mg.addColorStop(1, 'rgba(255,140,40,0)')
    ctx.fillStyle = mg
    ctx.fillRect(cx - r, cy - r * 0.5, r * 2, r)
    ctx.globalCompositeOperation = 'source-over'
  }
  // rim ring, cooling moltenHi -> ember -> chromeLo
  const rim = mix(mix(mix(hx(PAL.moltenHi), hx(PAL.molten), Math.min(1, cool * 2)), hx(PAL.ember), cool), hx(PAL.chromeLo), cool * 0.55)
  ctx.strokeStyle = css(rim, 0.3 + 0.65 * hot)
  ctx.lineWidth = 2.5 + 6 * hot
  ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.98, r * 0.31, 0, 0, 7); ctx.stroke()
  // radial cracks (one seeded shape)
  const rr = rng(97)
  ctx.lineWidth = 1.8
  ctx.strokeStyle = css(rim, 0.25 + 0.6 * hot)
  for (let i = 0; i < 12; i++) {
    const an = (i / 12) * Math.PI * 2 + rr() * 0.4
    const len = r * (1.08 + rr() * 0.3)
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(an) * r * 0.3, cy + Math.sin(an) * r * 0.1)
    let px = cx + Math.cos(an) * r * 0.3, py = cy + Math.sin(an) * r * 0.1
    for (let sgm = 1; sgm <= 3; sgm++) {
      px += Math.cos(an + (rr() - 0.5) * 0.5) * (len / 3)
      py += Math.sin(an + (rr() - 0.5) * 0.5) * (len / 3) * 0.34
      ctx.lineTo(px, py)
    }
    ctx.stroke()
  }
  ctx.restore()
}

// Molten pool surface: shimmer bands + convection cells + crust islands +
// analytic rising sparks + upward heat glow. o.glow scales brightness,
// o.rect = { x0, y0, x1, y1 } pool region (default the baked mouth band).
function drawMolten(ctx, t, o = {}) {
  const glow = o.glow ?? 1
  if (glow <= 0.02) return
  const rc = o.rect ?? { x0: 0, y0: 912, x1: W, y1: H }
  const x0 = rc.x0, y0 = rc.y0, x1 = rc.x1, y1 = Math.min(rc.y1, H + OS)
  const pw = x1 - x0, ph = y1 - y0
  ctx.save()
  ctx.beginPath(); ctx.rect(x0, y0, pw, ph); ctx.clip()
  // shimmer bands drifting on the surface (seaShimmer lineage, molten grade)
  for (let i = 0; i < 22; i++) {
    const yy = y0 + ((i + 0.5) / 22) * ph
    const wSh = 40 + hash(i * 3.7 + 5) * 190
    const xx = ((hash(i * 7.9 + 5) * 2300 + Math.sin(t * 0.7 + i * 1.7) * 34 + t * (10 + hash(i) * 18)) % 2300 + 2300) % 2300 - 190
    ctx.globalAlpha = (0.08 + hash(i * 5.3 + 5) * 0.16) * glow
    ctx.fillStyle = PAL.moltenHi
    ctx.fillRect(xx, yy, wSh, 2.6)
  }
  ctx.globalAlpha = 1
  // slow convection cells
  for (let i = 0; i < 5; i++) {
    const cx = x0 + pw * (0.15 + 0.7 * hash(i * 9.1 + 2)) + Math.sin(t * 0.24 + i * 2.1) * 60
    const cy = y0 + ph * (0.3 + 0.55 * hash(i * 4.7 + 2)) + Math.cos(t * 0.19 + i) * 12
    const rr = 60 + hash(i * 6.3 + 2) * 120
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, rr)
    g.addColorStop(0, css(hx(PAL.moltenHi), 0.13 * glow))
    g.addColorStop(1, css(hx(PAL.moltenHi), 0))
    ctx.fillStyle = g
    ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2)
  }
  // crust islands adrift
  for (let i = 0; i < 7; i++) {
    const sp = 6 + hash(i * 8.3 + 9) * 10
    const xx = ((hash(i * 5.1 + 9) * 2400 + t * sp * (hash(i) > 0.5 ? 1 : -1)) % 2400 + 2400) % 2400 - 240
    const yy = y0 + ph * (0.25 + hash(i * 3.3 + 9) * 0.6)
    ctx.fillStyle = css(mix(hx(PAL.ember), hx(PAL.nightDeep), 0.35), 0.75)
    ctx.beginPath(); ctx.ellipse(xx, yy, 34 + hash(i * 7.7 + 9) * 90, 7 + hash(i * 2.9 + 9) * 9, 0, 0, 7); ctx.fill()
  }
  // rising sparks, wrap by lifetime (emberRise lineage)
  for (let i = 0; i < 16; i++) {
    const life = 1.6 + hash(i * 3.3 + 21) * 2.2
    const age = (t * (0.5 + hash(i * 7.1 + 21) * 0.5) + hash(i * 13.7 + 21) * life) % life
    const u = age / life
    const xx = ((hash(i * 5.3 + 21) * 2300 + Math.sin(t * 0.8 + i) * 30) % 2300 + 2300) % 2300 - 190
    const yy = y1 + 10 - u * (ph + 190)
    const a = Math.sin(u * Math.PI) * (0.3 + hash(i * 9.7 + 21) * 0.5) * glow
    ctx.fillStyle = css(mix(hx(PAL.moltenHi), hx(PAL.molten), hash(i)), a.toFixed(3))
    ctx.fillRect(xx, yy, 2.6, 2.6)
  }
  ctx.restore()
  // heat glow spilling up out of the pool
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const hg = ctx.createLinearGradient(0, y0 - 200, 0, y0 + 30)
  hg.addColorStop(0, css(hx(PAL.molten), 0))
  hg.addColorStop(1, css(hx(PAL.molten), 0.2 * glow))
  ctx.fillStyle = hg
  ctx.fillRect(x0, y0 - 200, pw, 230)
  ctx.restore()
}

// Impact spark fans from immutable events [{ g, x, y, seed, n, dir, spread, speed, life }].
// age = worldT - ev.g; skipped outside its lifetime; streaks cool white->amber->ember.
function drawSparks(ctx, worldT, events) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  for (const ev of events) {
    const life = ev.life ?? 0.55
    const age = worldT - ev.g
    if (age <= 0 || age > life) continue
    const n = ev.n ?? 16
    const u = age / life
    for (let i = 0; i < n; i++) {
      const an = (ev.dir ?? -1.57) + (hash(ev.seed + i * 7.3) - 0.5) * (ev.spread ?? 2.2)
      const sp = (0.5 + hash(ev.seed + i * 13.1) * 0.9) * (ev.speed ?? 430)
      const vx = Math.cos(an) * sp
      const vy = Math.sin(an) * sp
      const px = ev.x + vx * age
      const py = ev.y + vy * age + 900 * age * age
      const hot = 1 - u
      const col = hot > 0.66 ? '255,244,214' : hot > 0.33 ? '255,178,80' : '255,110,40'
      ctx.strokeStyle = `rgba(${col},${(1 - u).toFixed(3)})`
      ctx.lineWidth = 3.2 * (1 - u) + 0.8
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px - vx * 0.03, py - vy * 0.03)
      ctx.stroke()
    }
  }
  ctx.restore()
}

// Fire bed: seeded flame tongues (two-pass molten/moltenHi) + coal bed + halo +
// rising embers. x = centre, groundY = base line, size = half-width (~200).
function drawFire(ctx, x, groundY, t, size) {
  const r = rng(Math.floor(x * 0.37) + 13)
  ctx.save()
  // halo
  const halo = ctx.createRadialGradient(x, groundY - size * 0.35, 8, x, groundY - size * 0.35, size * 2.3)
  halo.addColorStop(0, css(hx(PAL.molten), 0.4))
  halo.addColorStop(0.5, css(hx(PAL.ember), 0.16))
  halo.addColorStop(1, css(hx(PAL.ember), 0))
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = halo
  ctx.fillRect(x - size * 2.3, groundY - size * 2.65, size * 4.6, size * 3)
  ctx.globalCompositeOperation = 'source-over'
  // coal bed with hot seams
  ctx.fillStyle = css(mix(hx(PAL.ember), hx(PAL.nightDeep), 0.45))
  ctx.beginPath(); ctx.ellipse(x, groundY, size * 1.12, size * 0.14, 0, 0, 7); ctx.fill()
  ctx.strokeStyle = css(hx(PAL.moltenHi), 0.55 + 0.25 * Math.sin(t * 7.3))
  ctx.lineWidth = 2.4
  for (let i = 0; i < 6; i++) {
    const sx = x - size * 0.8 + (i / 5) * size * 1.6
    ctx.beginPath()
    ctx.moveTo(sx, groundY + 2)
    ctx.quadraticCurveTo(sx + 12, groundY - 4 - 3 * Math.sin(t * 9 + i * 2.4), sx + 26, groundY + 2)
    ctx.stroke()
  }
  // tongues: outer molten pass, inner moltenHi pass
  const N = 7
  for (let i = 0; i < N; i++) {
    const off = -size * 0.82 + (i / (N - 1)) * size * 1.64
    const baseX = x + off
    const hgt = size * (0.62 + r() * 0.55) * (1 - Math.abs(off) / (size * 1.35))
    const freq = 8.5 + r() * 4.5
    const ph = r() * 6.28
    const sway = (Math.sin(t * freq + ph) * 0.6 + Math.sin(t * freq * 1.73 + ph * 2) * 0.4) * hgt * 0.16
    const wid = size * 0.16 * (1.1 - Math.abs(off) / (size * 1.6))
    const flame = (k, col, a) => {
      const hh = hgt * k
      ctx.fillStyle = css(hx(col), a)
      ctx.beginPath()
      ctx.moveTo(baseX - wid, groundY)
      ctx.quadraticCurveTo(baseX - wid * 0.9 + sway * 0.5, groundY - hh * 0.55, baseX + sway, groundY - hh)
      ctx.quadraticCurveTo(baseX + wid * 0.9 + sway * 0.5, groundY - hh * 0.55, baseX + wid, groundY)
      ctx.closePath()
      ctx.fill()
    }
    flame(0.92 + 0.1 * Math.sin(t * freq * 1.4 + ph), PAL.molten, 0.82)
    flame(0.55 + 0.08 * Math.sin(t * freq * 1.8 + ph + 1), PAL.moltenHi, 0.85)
    flame(0.24, PAL.moltenHi, 0.95)
  }
  // rising embers
  for (let i = 0; i < 10; i++) {
    const life = 1.2 + hash(i * 7.7 + Math.floor(x)) * 1.4
    const age = (t * (0.6 + hash(i * 3.9) * 0.4) + hash(i * 11.3) * life) % life
    const u = age / life
    const ex = x + (hash(i * 5.7) - 0.5) * size * 1.6 + Math.sin(t * 2.2 + i) * 14 * u
    const ey = groundY - u * size * (1.4 + hash(i) * 1.2)
    const a = Math.sin(u * Math.PI) * 0.7
    ctx.fillStyle = css(hx(PAL.moltenHi), a.toFixed(3))
    ctx.fillRect(ex, ey, 2.4, 2.4)
  }
  ctx.restore()
}

// Steam blast from a severed pipe: jet of expanding puffs, gone by ~1.8 s.
function drawSteam(ctx, x, y, t0, t, o = {}) {
  const age = t - t0
  if (age < 0 || age > 1.8) return
  const dir = o.dir ?? 1
  const grow = age / (1 + age * 1.1)
  const r = rng(Math.floor(x * 0.5) + 21)
  ctx.save()
  for (let i = 0; i < 13; i++) {
    const u = i / 13
    const drift = hash(i * 7.3 + 21)
    const px = x + dir * (60 + 460 * grow) * (0.3 + u * 0.9) + (drift - 0.5) * 40
    const py = y - (20 + hash(i * 3.1 + 21) * 70) * grow - u * 26 * grow
    const pr = (13 + drift * 32) * (0.4 + grow * 1.6)
    const a = (1 - age / 1.8) * 0.55 * (1 - u * 0.5)
    if (a <= 0.01) continue
    const g = ctx.createRadialGradient(px, py, 1, px, py, pr)
    g.addColorStop(0, css(C.rainCol, a))
    g.addColorStop(1, css(C.rainCol, 0))
    ctx.fillStyle = g
    ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2)
  }
  // initial jet streak
  if (age < 0.35) {
    const jk = 1 - age / 0.35
    ctx.strokeStyle = css(C.rainCol, 0.5 * jk)
    ctx.lineWidth = 5 * jk + 1
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + dir * (120 + age * 900), y - 12 - age * 60)
    ctx.stroke()
  }
  ctx.restore()
}

// Smoke plume: slow dark billow, ~3.2 s life, used for crash/doorway aftermath.
function drawSmoke(ctx, x, y, t0, t, o = {}) {
  const age = t - t0
  const life = o.life ?? 3.2
  if (age < 0 || age > life) return
  const u = age / life
  const r = rng(Math.floor(x * 0.31) + 33)
  ctx.save()
  for (let i = 0; i < 12; i++) {
    const ui = i / 12
    const rise = (46 + hash(i * 7.7 + 33) * 40) * age
    const px = x + (hash(i * 3.3 + 33) - 0.5) * 30 + Math.sin(age * 1.2 + i * 1.9) * (8 + ui * 30) + (o.drift ?? 14) * age * ui
    const py = y - rise - ui * 30
    const pr = (13 + hash(i * 5.1 + 33) * 24) * (0.5 + age * 0.55)
    const a = Math.sin(Math.min(1, u * 1.25) * Math.PI) * 0.42 * (1 - ui * 0.35)
    if (a <= 0.01) continue
    const g = ctx.createRadialGradient(px, py, 1, px, py, pr)
    g.addColorStop(0, css(C.smokeCol, a))
    g.addColorStop(1, css(C.smokeCol, 0))
    ctx.fillStyle = g
    ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2)
  }
  ctx.restore()
}

// Letterbox bars painted LAST: 2.39:1 at 1.0, covering the +/-OS overscan so
// camera moves never bleed (3000/art.js bars pattern; nightDeep for this film).
function bars(ctx) {
  ctx.save()
  ctx.fillStyle = PAL.nightDeep
  ctx.fillRect(-OS, -OS, W + OS * 2, BAR + OS)
  ctx.fillRect(-OS, H - BAR, W + OS * 2, BAR + OS)
  ctx.restore()
}

// ============================== loadEnv ==============================

export async function loadEnv() {
  return {
    bgPlayground: bgPlaygroundBake(),
    bgAlley: bgAlleyBake(),
    bgStreet: bgStreetBake(),
    bgFoundry: bgFoundryBake(),
    bgDawn: bgDawnBake(),
    drawRain,
    drawLightning,
    drawScorch,
    drawMolten,
    drawSparks,
    drawFire,
    drawSteam,
    drawSmoke,
    bars,
  }
}
