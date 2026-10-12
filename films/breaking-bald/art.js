// BREAKING BALD — art.js. Full-res painted stage (3000 lineage) + rig prep
// (sword strip, baldify with sil rebuild, hazmat repaint, hood silhouettes),
// Heisenbald costume painters (porkpie / shades / goatee / gas mask, all
// anchored at the rig's scalp line via crownY), procedural beige RV + blue
// crystal, glass/vial/panel/element-box painters, analytic particle fields
// (heat shimmer, dust devils, falling hair, motes, steam, crystal stars),
// impact fx, and the twelve baked stages painted ONCE in build(). Every
// painter a pure function of time — hash/rng only, no Math.random, no state
// between frames.
import { W, H, hash, rng, vnoise } from 'filmkit/lib.js'
import { canvas } from '../remy-bros/art.js'

export const OS = 220          // overscan painted around every stage for camera moves
export const BAR = 138         // 2.39:1 letterbox bar height (band y 138-942)

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

// ---------------- palette: amber dawn / teal heisenbald / meth blue ----------------
export const PAL = {
  // dawn desert (cold open)
  dawn0: '#1c1430', dawn1: '#3a2148', dawn2: '#7a3a4a', dawn3: '#c06a44', dawn4: '#eda45c', dawn5: '#f8d38c',
  sand: '#c49a62', sandHi: '#e8bc80', sandLo: '#8a6242', sandShadow: '#5f4028',
  mesaFar: '#8a5a58', mesaMid: '#5f3a42', mesaNear: '#3a222e',
  rv: '#c9b28a', rvHi: '#e2d0a8', rvLo: '#8f7a56', rvInk: '#3a3020',
  // the blue
  blue: '#63c5ff', blueHi: '#bfe9ff', blueDeep: '#1c5f8f', blueInk: '#0a2c47',
  // heisenbald
  flowRed: '#893c3b', skin42: '#d0bdb1', hat: '#0b0b0b', pink: '#de9c9c',
  hazmat: '#f7d33c', hazmatLo: '#a8890f', hazmatHi: '#fce98a',
  gi: '#dad6d3', chicken: '#dccc5e',
  // greens (titles / product)
  elmGreen: '#2f9e5f', elmGreenHi: '#57c98a', elmInk: '#0d2b1c',
  // interiors
  labWall: '#b8a888', labShelf: '#6e5236', labDark: '#241c12',
  dinerWarm: '#e8a850', dinerWood: '#5e3a20', dinerCream: '#e8ddc4',
  steel: '#8a98a8', steelHi: '#c2ceda', steelLo: '#4a5866',
  night0: '#0a0d18', night1: '#131a2c',
  hairSil: '#141018',
}

// ---------------- director marks (pixel coords inside bakes) ----------------
export const DESERT = { horizon: 648, crystal: [1178, 752], sun: [1240, 588] }
export const LAB = {
  tableY: 792, burner: [818, 768], flask: [818, 666], flaskNeck: [818, 570],
  flask2: [898, 786], cast: [1122, 744], castTop: 692, tank: [560, 700],
  window: [960, 300], walt: [688, 948], jesse: [1258, 952],
}
export const DINER = {
  menu: [430, 300], counter: 1490, porthole: [1524, 470], portholeR: 118,
  booth: [360, 760], hankBooth: [1452, 820], hankTable: [1490, 878],
  backLamp: [986, 318], gusBench: [968, 900],
}

function whiteSil(c, w, h) {
  const s = canvas(w, h), x = s.getContext('2d')
  x.drawImage(c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = '#fff'
  x.fillRect(0, 0, w, h)
  return s
}

// ============================== rig prep ==============================

// Strip hero 42's baked greatsword — verbatim remember-the-flow adaptation via
// films/3000/art.js: per scanline drop the detached left-edge run, then clear
// the left 23 columns of blade-family colour. Rebuilds the white silhouette.
export function stripLeftBlade(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const a = (xx, y) => p[(y * R.w + xx) * 4 + 3]
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
  x.putImageData(d, 0, 0)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Baldify (fade-to-bald proven technique, sil REBUILT per the house rule):
// peel the hair band y in [R.top, R.top+64), skip the centre face column and
// true dark outlines, remap every hair pixel onto a skin ramp keyed on the
// character's own skin tone. Pass #42's skin #d0bdb1.
export function baldify(R, skinHex) {
  const c255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0)
  const [sr, sg, sb] = hexRgb(skinHex)
  const fr = Math.min(208, sr * 1.02), fg = Math.min(204, sg * 1.02), fb = Math.min(200, sb * 1.02)
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const id = x.getImageData(0, 0, R.w, R.h), d = id.data
  const lumI = (i) => (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3
  const A = (xx, yy) => (xx < 0 || yy < 0 || xx >= R.w || yy >= R.h ? 0 : d[(yy * R.w + xx) * 4 + 3])
  // The hair MASS is found by flood fill from the crown band over every
  // non-outline pixel (deterministic, no colour guessing): the flowing drape,
  // its pale highlights and the forehead widow's peak are all connected to the
  // crown; the face box and dark outlines block the fill, so eyes/mouth/tee
  // survive untouched.
  const yCap = Math.min(R.h, R.top + 112)
  const seen = new Uint8Array(R.w * R.h)
  const stack = []
  for (let xx = Math.max(0, R.cx - 26); xx <= Math.min(R.w - 1, R.cx + 26); xx++)
    for (let y = R.top; y < R.top + 14; y++) {
      const i = y * R.w + xx
      if (d[i * 4 + 3] >= 8 && lumI(i) >= 40) {
        seen[i] = 1
        stack.push(i)
      }
    }
  while (stack.length) {
    const i = stack.pop()
    const xx = i % R.w, y = (i / R.w) | 0
    for (const [nx, ny] of [[xx - 1, y], [xx + 1, y], [xx, y + 1], [xx, y - 1]]) {
      if (nx < 0 || nx >= R.w || ny < 0 || ny >= R.h) continue
      if (ny >= yCap || Math.abs(nx - R.cx) > 50) continue // fill stays on the head+drape
      if (ny >= R.top + 34 && Math.abs(nx - R.cx) <= 9) continue // eyes/mouth box
      const j = ny * R.w + nx
      if (seen[j] || d[j * 4 + 3] < 8 || lumI(j) < 40) continue // outlines block
      seen[j] = 1
      stack.push(j)
    }
  }
  // apply: scalp repaint follows the BALD-HEAD silhouette (wide at the crown,
  // tapering to the neck corridor); hair mass outside it FALLS (alpha 0) so no
  // fur collar and no pale lumps survive the shave
  const hairPx = []
  let Lmin = 1e9, Lmax = -1e9
  for (let i = 0; i < R.w * R.h; i++) {
    if (!seen[i]) continue
    const xx = i % R.w, y = (i / R.w) | 0
    const dx = Math.abs(xx - R.cx)
    const dy = y - R.top
    const scalpW = dy < 26 ? 22 : 13
    if (dx > scalpW) {
      d[i * 4 + 3] = 0
      continue
    }
    const L = lumI(i)
    const edge = A(xx - 1, y) < 8 || A(xx + 1, y) < 8 || A(xx, y - 1) < 8 || A(xx, y + 1) < 8
    hairPx.push({ i4: i * 4, L, edge })
    Lmin = Math.min(Lmin, L)
    Lmax = Math.max(Lmax, L)
  }
  if (hairPx.length) {
    for (const p of hairPx) {
      const u = Lmax > Lmin ? (p.L - Lmin) / (Lmax - Lmin) : 0.5
      const m = p.edge ? 0.6 : 0.78 + 0.1 * u // scalp shades gently; outline locks stay dark
      d[p.i4] = c255(Math.min(208, fr * m) + (p.edge ? 0 : 4))
      d[p.i4 + 1] = c255(Math.min(204, fg * m) + (p.edge ? 0 : 3))
      d[p.i4 + 2] = c255(Math.min(200, fb * m * 0.99))
    }
  }
  // island sweep: outline-separated hair locks (pale highlights, tufts) that
  // the flood fill cannot reach are cleared geometrically — no fur collar,
  // no red tufts; the dark tee and the repainted scalp survive untouched
  for (let y = R.top; y < Math.min(R.h, R.top + 112); y++)
    for (let xx = Math.max(0, R.cx - 50); xx < Math.min(R.w, R.cx + 50); xx++) {
      const i = y * R.w + xx
      if (seen[i] || d[i * 4 + 3] < 8) continue
      if (y >= R.top + 34 && Math.abs(xx - R.cx) <= 9) continue // face box
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]
      const L = (r + g + b) / 3
      const red = r > 100 && r > g + 25 && r > b + 25
      const paleWarm = L >= 90 && r >= g && g >= b - 4 && r - b > 15
      const yLimit = red ? R.top + 112 : R.top + 92 // bare arms live lower — leave them
      if (y < yLimit && (red || paleWarm)) d[i * 4 + 3] = 0
    }
  x.putImageData(id, 0, 0)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Hazmat repaint: cool/dark body pixels below the face become the yellow suit
// ramp; warm skin, the pink crop and true ink outlines survive. Full-body read
// (boots stay dark where the ink locks).
export function hazmat(R, o = {}) {
  const lo = hexRgb(o.lo ?? PAL.hazmatLo), mid = hexRgb(o.mid ?? PAL.hazmat), hi = hexRgb(o.hi ?? PAL.hazmatHi)
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const y0 = R.top + 34 // below the face
  for (let y = y0; y < R.h; y++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] < 8) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      const L = (r + g + b) / 765
      if (L < 0.13) continue // true outline stays
      const cool = b >= r + 4 || (g >= r + 6 && b >= g - 2) // slate tees / blue denim
      if (!cool) continue
      const col = L < 0.3 ? mix(lo, mid, cl(L / 0.3)) : mix(mid, hi, cl((L - 0.3) / 0.5))
      p[i] = col[0]; p[i + 1] = col[1]; p[i + 2] = col[2]
    }
  x.putImageData(d, 0, 0)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Flat silhouette rig (hooded henchmen rows): the sprite pose, one flat colour.
export function hoodSil(R, col = '#0a0a0f') {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.sil, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = col
  x.fillRect(0, 0, R.w, R.h)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// scalp y for a rig drawn with feet at `feet` and vertical scale sy (3000 anchor math).
export const crownY = (rig, feet, sy) => feet - (rig.bottom - rig.top + 1) * sy + 7 * sy

// Marching/standing pose from a phase: planted strides, alternate leg lift.
export const walkCyc = (ph, amp = 5) => {
  const sn = Math.sin(ph)
  return { lift: [Math.round(Math.max(0, sn) * amp), Math.round(Math.max(0, -sn) * amp)], stride: [Math.round(sn * 2), Math.round(-sn * 2)], lean: 0.05 }
}

// ============================== Heisenbald costume pieces ==============================
// All anchored at the rig's head: callers pass (x = actor x, cy = crownY(...), s = sy).

// Black porkpie: squat flat-topped crown + short side + full brim + band.
// drop 0..1 = placement animation (1 = seated on the scalp line).
export function porkpie(ctx, x, cy, s, drop = 1, o = {}) {
  if (drop <= 0.02) return
  const y = cy + (1 - drop) * -90 * s - 4 * s
  ctx.save()
  ctx.translate(x, y)
  if (o.rot) ctx.rotate(o.rot)
  const ink = o.silhouette ? '#0d0d10' : PAL.hat
  // brim
  ctx.fillStyle = ink
  ctx.beginPath(); ctx.ellipse(0, 13 * s, 24 * s, 5.6 * s, 0, 0, 7); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.beginPath(); ctx.ellipse(-6 * s, 11.8 * s, 19 * s, 3.6 * s, 0, Math.PI, 0.0001); ctx.fill()
  // short cylindrical side + flat topped crown
  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.moveTo(-14.5 * s, 12 * s); ctx.lineTo(-13.5 * s, 0)
  ctx.quadraticCurveTo(0, -4 * s, 13.5 * s, 0)
  ctx.lineTo(14.5 * s, 12 * s)
  ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.ellipse(0, 0.5 * s, 13.8 * s, 4 * s, 0, 0, 7); ctx.fill()
  // band sheen
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillRect(-12 * s, 6 * s, 24 * s, 1.8 * s)
  ctx.restore()
}

// Thin black shades across the eye line. k 0..1 = lower-in progress; glint 0..1 sweeps.
export function shades(ctx, x, cy, s, k = 1, glint = 0) {
  if (k <= 0.02) return
  const y = cy + 26 * s + (1 - k) * -34 * s
  ctx.save()
  ctx.translate(x, y)
  if (k < 1) ctx.globalAlpha = cl(k * 1.4)
  ctx.fillStyle = '#08080a'
  const w = 14 * s, h = 8.6 * s, gap = 4.5 * s
  for (const sgn of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(sgn * gap * 0.4, -h * 0.6)
    ctx.quadraticCurveTo(sgn * (gap * 0.4 + w * 0.62), -h * 1.05, sgn * (gap * 0.4 + w), -h * 0.1)
    ctx.quadraticCurveTo(sgn * (gap * 0.4 + w * 0.86), h * 0.8, sgn * gap * 0.5, h * 0.55)
    ctx.closePath()
    ctx.fill()
  }
  ctx.strokeStyle = '#08080a'
  ctx.lineWidth = 1.8 * s
  ctx.beginPath(); ctx.moveTo(-gap * 0.4, -h * 0.4); ctx.lineTo(gap * 0.4, -h * 0.4); ctx.stroke()
  ctx.beginPath() // temples out to the head edge
  ctx.moveTo(-gap * 0.4 - w * 0.96, -h * 0.2); ctx.lineTo(-18 * s, -h * 0.7)
  ctx.moveTo(gap * 0.4 + w * 0.96, -h * 0.2); ctx.lineTo(18 * s, -h * 0.7)
  ctx.stroke()
  if (glint > 0 && glint < 1) {
    ctx.save()
    ctx.globalAlpha = Math.sin(glint * Math.PI) * 0.9
    ctx.strokeStyle = '#dff2ff'
    ctx.lineWidth = 1.8 * s
    ctx.beginPath(); ctx.moveTo(-w * 0.9 + glint * w * 2.2, -h * 0.8); ctx.lineTo(-w * 0.4 + glint * w * 2.2, h * 0.6); ctx.stroke()
    ctx.restore()
  }
  ctx.restore()
}

// Goatee: small dark arch hugging the chin line.
export function goatee(ctx, x, cy, s, k = 1) {
  if (k <= 0.02) return
  const y = cy + 38 * s
  ctx.save()
  ctx.globalAlpha = cl(k)
  ctx.fillStyle = '#16100d'
  ctx.beginPath()
  ctx.moveTo(-6.5 * s, 0)
  ctx.quadraticCurveTo(-7 * s, 6.5 * s, 0, 8.5 * s)
  ctx.quadraticCurveTo(7 * s, 6.5 * s, 6.5 * s, 0)
  ctx.quadraticCurveTo(3 * s, 2.5 * s, 0, 2.5 * s)
  ctx.quadraticCurveTo(-3 * s, 2.5 * s, -6.5 * s, 0)
  ctx.closePath()
  ctx.translate(x, y)
  ctx.fill()
  ctx.restore()
}

// Gas mask over the face (cook): olive hood silhouette + round filters + visor.
// tilt = small rotation of the mask about the face centre; look = 0..1 leans in.
export function gasMask(ctx, x, cy, s, tilt = 0, o = {}) {
  const y = cy + 26 * s
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(tilt)
  // hood covering the head
  ctx.fillStyle = o.hood ?? '#3c3a24'
  ctx.beginPath()
  ctx.moveTo(-20 * s, 20 * s)
  ctx.quadraticCurveTo(-24 * s, -16 * s, 0, -22 * s)
  ctx.quadraticCurveTo(24 * s, -16 * s, 20 * s, 20 * s)
  ctx.quadraticCurveTo(8 * s, 12 * s, 0, 13 * s)
  ctx.quadraticCurveTo(-8 * s, 12 * s, -20 * s, 20 * s)
  ctx.closePath()
  ctx.fill()
  // visor: two round glass eyes
  for (const sgn of [-1, 1]) {
    const g = ctx.createRadialGradient(sgn * 8 * s, -4 * s, 1, sgn * 8 * s, -4 * s, 6.5 * s)
    g.addColorStop(0, '#9fb4a8'); g.addColorStop(0.5, '#39494a'); g.addColorStop(1, '#16211f')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(sgn * 8 * s, -4 * s, 6.5 * s, 0, 7); ctx.fill()
    ctx.fillStyle = 'rgba(220,240,235,0.35)'
    ctx.beginPath(); ctx.arc(sgn * 8 * s + 1.8 * s, -6 * s, 2 * s, 0, 7); ctx.fill()
  }
  // filters
  ctx.fillStyle = '#2c2c1e'
  ctx.beginPath(); ctx.ellipse(0, 9 * s, 5.5 * s, 6.5 * s, 0, 0, 7); ctx.fill()
  ctx.strokeStyle = '#4a4a32'
  ctx.lineWidth = 1.4 * s
  ctx.beginPath(); ctx.arc(0, 9 * s, 3.6 * s, 0, 7); ctx.stroke()
  ctx.restore()
}

// Hood over a silhouette rig's head (henchmen rows): pointed cowl.
export function hood(ctx, x, cy, s) {
  const y = cy + 14 * s
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#0a0a0f'
  ctx.beginPath()
  ctx.moveTo(-19 * s, 10 * s)
  ctx.quadraticCurveTo(-21 * s, -18 * s, 0, -24 * s)
  ctx.quadraticCurveTo(21 * s, -18 * s, 19 * s, 10 * s)
  ctx.quadraticCurveTo(10 * s, 2 * s, 0, 3 * s)
  ctx.quadraticCurveTo(-10 * s, 2 * s, -19 * s, 10 * s)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#05050a'
  ctx.beginPath() // the shadowed face hole
  ctx.ellipse(0, -2 * s, 10.5 * s, 12 * s, 0, 0, 7)
  ctx.fill()
  ctx.restore()
}

// Rimless glasses (Gus): two hairline lenses + bridge, faint cold sheen.
export function rimless(ctx, x, cy, s, k = 1) {
  if (k <= 0.02) return
  const y = cy + 25 * s
  ctx.save()
  ctx.globalAlpha = cl(k)
  ctx.translate(x, y)
  ctx.strokeStyle = '#d9dde2'
  ctx.lineWidth = 1.5 * s
  for (const sgn of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(sgn * 9 * s, 0, 7.5 * s, 5 * s, 0, 0, 7)
    ctx.stroke()
  }
  ctx.beginPath(); ctx.moveTo(-2 * s, -1 * s); ctx.lineTo(2 * s, -1 * s); ctx.stroke()
  ctx.fillStyle = 'rgba(220,235,245,0.18)'
  for (const sgn of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(sgn * 9 * s, 0, 6.5 * s, 4 * s, 0, 0, 7); ctx.fill()
  }
  ctx.restore()
}

// FLOW ENFORCEMENT badge (Hank): shield on the table, glintK sweeps a highlight.
export function badge(ctx, x, y, s, glintK = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.fillStyle = '#b8934a'
  ctx.beginPath()
  ctx.moveTo(-13, -10); ctx.lineTo(13, -10); ctx.lineTo(13, 4)
  ctx.quadraticCurveTo(13, 14, 0, 18); ctx.quadraticCurveTo(-13, 14, -13, 4)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#8a6a2c'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#e6c87c'
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(2.6, -1.6); ctx.lineTo(8.6, -1); ctx.lineTo(4.2, 3); ctx.lineTo(5.6, 9); ctx.lineTo(0, 5.8); ctx.lineTo(-5.6, 9); ctx.lineTo(-4.2, 3); ctx.lineTo(-8.6, -1); ctx.lineTo(-2.6, -1.6)
  ctx.closePath(); ctx.fill()
  if (glintK > 0 && glintK < 1) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-13, -10); ctx.lineTo(13, -10); ctx.lineTo(13, 4)
    ctx.quadraticCurveTo(13, 14, 0, 18); ctx.quadraticCurveTo(-13, 14, -13, 4)
    ctx.closePath()
    ctx.clip()
    ctx.globalAlpha = Math.sin(glintK * Math.PI)
    ctx.fillStyle = '#fff8dc'
    ctx.save(); ctx.rotate(-0.5); ctx.fillRect(-30 + glintK * 60, -24, 9, 48); ctx.restore()
    ctx.restore()
  }
  ctx.restore()
}

// Name tag (Gus 5, Los Flowos): tiny white plate on the chest.
export function nameTag(ctx, x, y, s) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.fillStyle = '#f2eee2'
  ctx.fillRect(-9, -5, 18, 10)
  ctx.strokeStyle = '#b8b2a0'
  ctx.lineWidth = 1.2
  ctx.strokeRect(-9, -5, 18, 10)
  ctx.fillStyle = '#c0392b'
  ctx.fillRect(-6, -2, 12, 1.8)
  ctx.fillStyle = '#3a5a2c'
  ctx.fillRect(-6, 1.4, 9, 1.8)
  ctx.restore()
}

// ============================== props ==============================

// The beige RV: boxy body, window strip, wheels with turning spokes, roof box,
// ladder. Chug bob + micro rock keyed on t; dir = +1 faces right.
export function rv(ctx, x, groundY, s, t, o = {}) {
  const chug = Math.sin(t * 11) * 1.6 + Math.sin(t * 23.7) * 0.7
  const rock = Math.sin(t * 9.2 + 1) * 0.012
  const moving = o.moving ?? 1
  ctx.save()
  ctx.translate(x, groundY + chug * s * moving)
  ctx.rotate(rock * moving)
  ctx.scale(s, s)
  const w = 190, h = 96
  // body
  const g = ctx.createLinearGradient(0, -h, 0, 0)
  g.addColorStop(0, PAL.rvHi); g.addColorStop(0.45, PAL.rv); g.addColorStop(1, PAL.rvLo)
  ctx.fillStyle = g
  const r = 10
  ctx.beginPath()
  ctx.moveTo(-w / 2 + r, -h)
  ctx.lineTo(w / 2 - r, -h)
  ctx.quadraticCurveTo(w / 2, -h, w / 2, -h + r)
  ctx.lineTo(w / 2 + 6, -14)
  ctx.lineTo(-w / 2 - 4, -14)
  ctx.lineTo(-w / 2, -h + r)
  ctx.quadraticCurveTo(-w / 2, -h, -w / 2 + r, -h)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = PAL.rvInk
  ctx.lineWidth = 2.4
  ctx.stroke()
  // skirt shadow
  ctx.fillStyle = PAL.rvInk
  ctx.fillRect(-w / 2 - 4, -16, w + 10, 6)
  // window strip + driver window
  ctx.fillStyle = '#26323c'
  for (let i = 0; i < 4; i++) ctx.fillRect(-w / 2 + 14 + i * 34, -h + 16, 24, 18)
  ctx.beginPath()
  ctx.moveTo(w / 2 - 30, -h + 14)
  ctx.quadraticCurveTo(w / 2 + 2, -h + 16, w / 2 + 4, -30)
  ctx.lineTo(w / 2 - 30, -30)
  ctx.closePath()
  ctx.fill()
  // door seam + handle
  ctx.strokeStyle = PAL.rvInk
  ctx.lineWidth = 1.6
  ctx.beginPath(); ctx.moveTo(w / 2 - 40, -h + 10); ctx.lineTo(w / 2 - 40, -18); ctx.stroke()
  // roof box + vent + ladder
  ctx.fillStyle = PAL.rvLo
  ctx.fillRect(-30, -h - 12, 40, 12)
  ctx.fillRect(46, -h - 7, 18, 7)
  ctx.strokeStyle = PAL.rvLo
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(-w / 2 + 10, -h); ctx.lineTo(-w / 2 + 10, -18)
  ctx.moveTo(-w / 2 + 24, -h); ctx.lineTo(-w / 2 + 24, -18)
  ctx.stroke()
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(-w / 2 + 10, -h + 10 + i * 16); ctx.lineTo(-w / 2 + 24, -h + 10 + i * 16); ctx.stroke()
  }
  // wheels (spokes turn while moving)
  for (const wx of [-52, 58]) {
    ctx.fillStyle = '#1c1a16'
    ctx.beginPath(); ctx.arc(wx, -12, 15, 0, 7); ctx.fill()
    ctx.fillStyle = '#4a463e'
    ctx.beginPath(); ctx.arc(wx, -12, 7.5, 0, 7); ctx.fill()
    ctx.strokeStyle = '#6a665c'
    ctx.lineWidth = 1.6
    for (let i = 0; i < 3; i++) {
      const a = t * 9 * moving + i * 2.09
      ctx.beginPath()
      ctx.moveTo(wx - Math.cos(a) * 6.5, -12 - Math.sin(a) * 6.5)
      ctx.lineTo(wx + Math.cos(a) * 6.5, -12 + Math.sin(a) * 6.5)
      ctx.stroke()
    }
  }
  ctx.restore()
}

// Blue crystal cluster, half-buried: 2-3 prisms + sand mound + inner glow.
// glint 0..1 sweeps the dawn catch; breathe adds the shimmer pulse.
export function crystal(ctx, x, y, s, t, o = {}) {
  const glint = o.glint ?? 0
  const breathe = 0.85 + 0.15 * Math.sin(t * 1.7)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  // inner glow
  const gg = ctx.createRadialGradient(0, -16, 2, 0, -16, 60)
  gg.addColorStop(0, `rgba(99,197,255,${0.4 * breathe * (o.glowK ?? 1)})`)
  gg.addColorStop(1, 'rgba(99,197,255,0)')
  ctx.fillStyle = gg
  ctx.fillRect(-60, -76, 120, 120)
  // prisms: main spike + two companions
  const prism = (px, ph, pw, lean) => {
    ctx.save()
    ctx.translate(px, 0)
    ctx.rotate(lean)
    const g = ctx.createLinearGradient(-pw, -ph, pw, 4)
    g.addColorStop(0, PAL.blueDeep); g.addColorStop(0.45, PAL.blue); g.addColorStop(0.75, PAL.blueHi); g.addColorStop(1, PAL.blue)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-pw, 4)
    ctx.lineTo(-pw * 0.5, -ph * 0.72)
    ctx.lineTo(0, -ph)
    ctx.lineTo(pw * 0.62, -ph * 0.6)
    ctx.lineTo(pw, 4)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = css(hexRgb(PAL.blueInk), 0.8)
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(0, -ph); ctx.lineTo(pw * 0.14, 2); ctx.stroke()
    ctx.restore()
  }
  prism(0, 46, 12, -0.06)
  prism(-16, 26, 8, 0.28)
  prism(14, 20, 7, -0.34)
  // sand mound over the base
  ctx.fillStyle = PAL.sand
  ctx.beginPath()
  ctx.moveTo(-34, 6)
  ctx.quadraticCurveTo(-10, -8 + Math.sin(t * 0.9) * 0.6, 0, -4)
  ctx.quadraticCurveTo(14, -9, 34, 6)
  ctx.quadraticCurveTo(0, 12, -34, 6)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = PAL.sandHi
  ctx.beginPath(); ctx.ellipse(-8, -3, 12, 2.6, -0.12, 0, 7); ctx.fill()
  // glint ring + 4-point catch
  if (glint > 0 && glint < 1) {
    ctx.save()
    ctx.globalAlpha = Math.sin(glint * Math.PI)
    ctx.strokeStyle = '#eaf7ff'
    ctx.lineWidth = 2.2
    ctx.beginPath(); ctx.arc(0, -18, 24 + glint * 60, 0, 7); ctx.stroke()
    ctx.fillStyle = '#ffffff'
    const rr = 10 * Math.sin(glint * Math.PI)
    ctx.beginPath()
    ctx.moveTo(2, -18 - rr); ctx.quadraticCurveTo(4, -20, 2 + rr, -18)
    ctx.quadraticCurveTo(4, -16, 2, -18 + rr); ctx.quadraticCurveTo(0, -16, 2 - rr, -18)
    ctx.quadraticCurveTo(0, -20, 2, -18 - rr)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

// Vial (Los Flowos blue): glass tube with meth-blue fill + core streak +
// pulse ring. tilts with `rot`; glow keys the additive halo.
export function vial(ctx, x, y, s, t, glow, rot = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(s, s)
  if (glow > 0.02) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const hg = ctx.createRadialGradient(0, 0, 2, 0, 0, 46)
    hg.addColorStop(0, `rgba(99,197,255,${0.4 * glow})`)
    hg.addColorStop(1, 'rgba(99,197,255,0)')
    ctx.fillStyle = hg
    ctx.fillRect(-46, -52, 92, 92)
    ctx.restore()
  }
  // glass body
  ctx.fillStyle = 'rgba(210,232,244,0.24)'
  ctx.beginPath()
  ctx.moveTo(-9, -26); ctx.lineTo(9, -26); ctx.lineTo(12, 16)
  ctx.arc(0, 16, 12, 0, Math.PI)
  ctx.lineTo(-12, 16); ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(235,246,252,0.7)'
  ctx.lineWidth = 1.6
  ctx.stroke()
  // cap
  ctx.fillStyle = '#3a4048'
  ctx.fillRect(-6, -34, 12, 9)
  // blue fill + bright core streak
  const lg = ctx.createLinearGradient(0, -18, 0, 26)
  lg.addColorStop(0, PAL.blueHi); lg.addColorStop(1, PAL.blueDeep)
  ctx.fillStyle = lg
  ctx.beginPath()
  ctx.moveTo(-8, -14); ctx.lineTo(8, -14); ctx.lineTo(10.4, 16)
  ctx.arc(0, 16, 10.4, 0, Math.PI)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillRect(-4, -10, 2.4, 26)
  // held-by light pulse ring
  if (glow > 0.02) {
    ctx.globalAlpha = glow * (0.6 + 0.4 * Math.sin(t * 5))
    ctx.strokeStyle = PAL.blueHi
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(0, 0, 24 + 5 * Math.sin(t * 5), 0, 7); ctx.stroke()
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

// Steaming bucket (Los Flowos service).
export function bucket(ctx, x, y, s, t) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.strokeStyle = '#8a8e96'
  ctx.lineWidth = 2.2
  ctx.beginPath(); ctx.arc(0, -20, 16, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke()
  const g = ctx.createLinearGradient(-16, 0, 16, 0)
  g.addColorStop(0, '#9a6a3a'); g.addColorStop(0.4, '#c89a5e'); g.addColorStop(1, '#7a5228')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-16, -18); ctx.lineTo(16, -18); ctx.lineTo(12, 6); ctx.lineTo(-12, 6)
  ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#e8c890'
  ctx.beginPath(); ctx.ellipse(0, -18, 16, 4, 0, 0, 7); ctx.fill()
  ctx.restore()
  steam(ctx, x, y - 20 * s, t, 7, 'rgba(240,236,226,')
}

// Drumstick (Hank's chicken).
export function drumstick(ctx, x, y, s, rot, bite = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(s, s)
  ctx.fillStyle = '#e8b268'
  ctx.beginPath(); ctx.ellipse(-4 - bite * 6, 0, 11 - bite * 3, 7, 0.3, 0, 7); ctx.fill()
  ctx.fillStyle = '#f4d8a8'
  ctx.fillRect(4, -2.4, 9, 4.8)
  ctx.fillStyle = '#f6efe0'
  ctx.beginPath(); ctx.arc(15, 0, 4.6, 0, 7); ctx.fill()
  ctx.beginPath(); ctx.arc(18.5, -3, 3.4, 0, 7); ctx.fill()
  ctx.restore()
}

// Doctor panel: framed X-ray film, skull profile thinning at the crown.
// slide 0..1 = slide-in progress (from the right).
export function doctorPanel(ctx, x, y, s, slide) {
  const px = x + (1 - slide) * 620
  if (slide <= 0.01) return
  ctx.save()
  ctx.translate(px, y)
  ctx.scale(s, s)
  // frame + film
  ctx.fillStyle = '#2a2620'
  ctx.fillRect(-118, -150, 236, 300)
  ctx.fillStyle = '#0d1016'
  ctx.fillRect(-106, -138, 212, 276)
  // skull profile facing left — cranium, brow, nasal, jaw
  ctx.strokeStyle = 'rgba(214,228,244,0.85)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(18, 96)
  ctx.quadraticCurveTo(30, 60, 26, 34)
  ctx.quadraticCurveTo(40, 26, 34, 8)
  ctx.quadraticCurveTo(30, -2, 18, -4)
  ctx.quadraticCurveTo(22, -26, 6, -44)
  ctx.quadraticCurveTo(-30, -84, -66, -56)
  ctx.quadraticCurveTo(-96, -32, -84, 4)
  ctx.quadraticCurveTo(-76, 30, -52, 44)
  ctx.quadraticCurveTo(-40, 76, -18, 92)
  ctx.quadraticCurveTo(0, 102, 18, 96)
  ctx.closePath()
  ctx.stroke()
  // suture lines + cheek bone
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(-40, -50); ctx.quadraticCurveTo(-20, -30, -14, -8)
  ctx.moveTo(-52, 10); ctx.lineTo(-20, 6)
  ctx.stroke()
  // THE THINNING: sparse dashes at the crown (the diagnosis)
  ctx.strokeStyle = 'rgba(120,140,160,0.4)'
  ctx.lineWidth = 2
  for (let i = 0; i < 7; i++) {
    const a = -1.9 + i * 0.16
    const rr = 62 + (i % 2) * 6
    ctx.beginPath()
    ctx.moveTo(-20 + Math.cos(a) * rr, -26 + Math.sin(a) * rr)
    ctx.lineTo(-20 + Math.cos(a) * (rr + 7), -26 + Math.sin(a) * (rr + 7))
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(200,220,240,0.06)'
  ctx.beginPath(); ctx.ellipse(-20, -20, 52, 60, 0.1, 0, 7); ctx.fill()
  // glass sheen
  const g = ctx.createLinearGradient(-106, -138, 106, 138)
  g.addColorStop(0, 'rgba(220,232,246,0.12)'); g.addColorStop(0.3, 'rgba(220,232,246,0.02)')
  g.addColorStop(0.31, 'rgba(220,232,246,0)'); g.addColorStop(1, 'rgba(220,232,246,0)')
  ctx.fillStyle = g
  ctx.fillRect(-106, -138, 212, 276)
  ctx.restore()
}

// Green periodic-table element box (Br / Ba). p = slam-in progress (scale from
// above with jitter-settle); live in the titles void and the end card.
export function elementBox(ctx, x, y, s, sym, num, name, p, t) {
  if (p <= 0.02) return
  const jit = p < 1 ? (1 - p) * (hash(Math.floor(t * 90) + num * 7) - 0.5) * 34 * (1 - p) : 0
  const jy = p < 1 ? (1 - p) * (hash(Math.floor(t * 90) + num * 31) - 0.5) * 20 * (1 - p) : 0
  const sc = 1 + (1 - p) * 1.3
  ctx.save()
  ctx.translate(x + jit, y + jy)
  ctx.scale(s * sc, s * sc)
  const side = 96
  const g = ctx.createLinearGradient(0, -side / 2, side, side / 2)
  g.addColorStop(0, '#0f2f1e'); g.addColorStop(0.5, '#143c26'); g.addColorStop(1, '#0c2418')
  ctx.fillStyle = g
  ctx.fillRect(-side / 2, -side / 2, side, side)
  ctx.strokeStyle = PAL.elmGreen
  ctx.lineWidth = 3
  ctx.strokeRect(-side / 2, -side / 2, side, side)
  ctx.strokeStyle = css(hexRgb(PAL.elmGreenHi), 0.5)
  ctx.lineWidth = 1
  ctx.strokeRect(-side / 2 + 5, -side / 2 + 5, side - 10, side - 10)
  ctx.fillStyle = '#d8f2e2'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '600 17px "Space Grotesk"'
  ctx.fillText(String(num), -side / 2 + 9, -side / 2 + 22)
  ctx.font = '700 54px Anton'
  ctx.textAlign = 'center'
  ctx.fillText(sym, 0, side / 2 - 26)
  ctx.font = '500 12px "Space Grotesk"'
  ctx.fillText(name, 0, side / 2 - 9)
  ctx.restore()
}

// Crystal chandelier of blue shards (empire 2): two tiers turning on t.
export function chandelier(ctx, cx, cy, t) {
  ctx.save()
  ctx.translate(cx, cy)
  // chain + canopy
  ctx.strokeStyle = '#3a3444'
  ctx.lineWidth = 4
  ctx.beginPath(); ctx.moveTo(0, -300); ctx.lineTo(0, -70); ctx.stroke()
  ctx.fillStyle = '#2c2836'
  ctx.beginPath(); ctx.arc(0, -74, 16, 0, 7); ctx.fill()
  // tiers of shards
  const tier = (n, r, dy, len, spin) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + t * spin
      const px = Math.cos(a) * r
      const py = dy + Math.sin(a * 1.7) * 5
      const sway = Math.sin(t * 1.3 + i * 2.1) * 0.08
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(sway)
      // link
      ctx.strokeStyle = '#4a4456'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, -dy * 0.2); ctx.lineTo(0, 4); ctx.stroke()
      // shard
      const g = ctx.createLinearGradient(-7, 0, 7, len)
      g.addColorStop(0, PAL.blueDeep); g.addColorStop(0.5, PAL.blue); g.addColorStop(1, PAL.blueHi)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(-7, 4); ctx.lineTo(0, 10); ctx.lineTo(7, 4); ctx.lineTo(1.6, len); ctx.lineTo(0, len + 10); ctx.lineTo(-1.6, len)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, len + 6); ctx.stroke()
      ctx.restore()
    }
  }
  tier(9, 92, 0, 58, 0.42)
  tier(6, 54, 52, 40, -0.55)
  // centre drop
  ctx.save()
  const g = ctx.createLinearGradient(-6, 60, 6, 130)
  g.addColorStop(0, PAL.blue); g.addColorStop(1, PAL.blueHi)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-6, 52); ctx.lineTo(6, 52); ctx.lineTo(1, 128); ctx.lineTo(-1, 128)
  ctx.closePath(); ctx.fill()
  ctx.restore()
  ctx.restore()
}

// Half-burned pink teddy, face-down in the pool (empire 4). bob = gentle float.
// The burn pass composites 'source-atop' on a PRIVATE scratch (never the scene
// canvas — a source-atop rect over opaque water would paint a dark box).
let _teddy = null
export function teddy(ctx, x, y, s, t) {
  const bob = Math.sin(t * 1.1) * 2.4 * s
  if (!_teddy) {
    _teddy = canvas(104, 84)
    const tx = _teddy.getContext('2d')
    tx.translate(46, 40)
    const pink = PAL.pink
    tx.fillStyle = pink
    tx.beginPath(); tx.ellipse(0, 6, 34, 22, 0, 0, 7); tx.fill() // body
    tx.beginPath(); tx.arc(30, -12, 15, 0, 7); tx.fill() // head at the far end
    tx.beginPath(); tx.ellipse(-30, 2, 10, 8, 0.5, 0, 7); tx.fill() // rear leg
    tx.beginPath(); tx.ellipse(-8, 24, 9, 7, 0.2, 0, 7); tx.fill() // near leg
    tx.beginPath(); tx.arc(22, -24, 5.5, 0, 7); tx.fill() // ears
    tx.beginPath(); tx.arc(36, -22, 5, 0, 7); tx.fill()
    // seam + stuffing hint
    tx.strokeStyle = 'rgba(120,60,60,0.5)'
    tx.lineWidth = 1.6
    tx.beginPath(); tx.moveTo(-28, 8); tx.quadraticCurveTo(0, 18, 26, -2); tx.stroke()
    // HALF-BURNED: char blanket over the right side (the head end took the blast)
    const bg = tx.createLinearGradient(-6, -30, 46, 10)
    bg.addColorStop(0, 'rgba(20,14,12,0)'); bg.addColorStop(0.45, 'rgba(24,16,12,0.75)'); bg.addColorStop(1, 'rgba(12,8,8,0.95)')
    tx.globalCompositeOperation = 'source-atop'
    tx.fillStyle = bg
    tx.fillRect(-46, -40, 104, 84)
    tx.globalCompositeOperation = 'source-over'
    // the one surviving eye (small, open, dark) on the burnt head's lit edge
    tx.fillStyle = '#1a1418'
    tx.beginPath(); tx.arc(26, -12, 2.6, 0, 7); tx.fill()
    tx.fillStyle = 'rgba(240,220,220,0.35)'
    tx.beginPath(); tx.arc(25.2, -12.8, 0.9, 0, 7); tx.fill()
  }
  ctx.save()
  ctx.translate(x, y + bob)
  ctx.rotate(0.22)
  ctx.scale(s, s)
  ctx.drawImage(_teddy, -46, -40)
  ctx.restore()
}

// Pool caustics: overlapping sine arcs on the water (pure in t).
export function caustics(ctx, x, y, w, h, t, col = '140,220,240', k = 1) {
  ctx.save()
  ctx.globalAlpha = 0.14 * k
  ctx.strokeStyle = `rgb(${col})`
  ctx.lineWidth = 2
  for (let i = 0; i < 9; i++) {
    const yy = y + (i / 9) * h
    ctx.beginPath()
    for (let px = -20; px <= w + 20; px += 26) {
      const py = yy + Math.sin(px * 0.045 + t * 1.4 + i * 1.9) * 5 + Math.sin(px * 0.011 - t * 0.7) * 3
      if (px === -20) ctx.moveTo(x + px, py)
      else ctx.lineTo(x + px, py)
    }
    ctx.stroke()
  }
  ctx.restore()
}

// Classroom desk (front-of-actor parallax row).
export function desk(ctx, x, y, s, col = '#6e4e2e') {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.fillStyle = '#3a2a18'
  ctx.fillRect(-34, -18, 6, 34)
  ctx.fillRect(28, -18, 6, 34)
  const g = ctx.createLinearGradient(0, -30, 0, -16)
  g.addColorStop(0, '#8a6440'); g.addColorStop(1, col)
  ctx.fillStyle = g
  ctx.fillRect(-44, -30, 88, 14)
  ctx.fillStyle = '#241a10'
  ctx.fillRect(-44, -18, 88, 4)
  ctx.fillStyle = col
  ctx.fillRect(-30, -6, 60, 8) // seat hint behind
  ctx.restore()
}

// ============================== analytic particle fields ==============================

// Heat shimmer: device-space slice self-copy over a horizon band. Call AFTER
// ctx.restore() (identity transform). amp in px; rows baked per frame from t.
export function shimmer(ctx, x0, y0, w, h, t, amp = 2.2, rows = 14) {
  for (let i = 0; i < rows; i++) {
    const yy = y0 + (i / rows) * h
    const dx = Math.sin(yy * 0.11 + t * 6.5 + i * 1.7) * amp * (0.4 + (i / rows) * 0.6) * Math.sin(t * 2.3 + i) * 0.5 + Math.sin(yy * 0.05 - t * 3.1) * amp * 0.6
    ctx.drawImage(ctx.canvas, x0, yy, w, 1.5, x0 + dx, yy, w, 1.5)
  }
}

// Dust devil: a wandering dust column (seeded path, pure in t).
export function dustDevil(ctx, baseY, s, t, seed) {
  const life = 7 + hash(seed * 3.3) * 5
  const u = ((t * (0.6 + hash(seed * 7.1) * 0.4)) % life) / life
  const x = -100 + hash(seed * 9.7) * 2200 + u * 300 * (hash(seed) > 0.5 ? 1 : -1)
  if (x < -80 || x > 2100) return
  const a = Math.sin(u * Math.PI)
  ctx.save()
  for (let i = 0; i < 7; i++) {
    const v = i / 7
    const yy = baseY - v * 90 * s * a
    const ww = (6 + v * 26) * s * a
    const wob = Math.sin(t * 3 + i * 2.2 + seed) * 8 * v * s
    ctx.fillStyle = `rgba(196,154,98,${0.16 * a * (1 - v * 0.5)})`
    ctx.beginPath()
    ctx.ellipse(x + wob, yy, ww, ww * 0.34, 0, 0, 7)
    ctx.fill()
  }
  ctx.restore()
}

// The RV's dust tail: analytic puffs spawned along the travelled path.
// path(g) -> x at world g; yPath(g) -> ground line at world g (defaults to
// the scalar groundY); gNow = current world g; gIn = path start.
export function dustTail(ctx, path, groundY, gNow, gIn, s, o = {}) {
  const yAt = o.yPath ?? (() => groundY)
  const rate = o.rate ?? 9 // puffs per world-second
  const i0 = Math.max(0, Math.floor((gNow - (o.win ?? 2.6)) * rate))
  const i1 = Math.floor(gNow * rate)
  for (let i = i0; i <= i1; i++) {
    const spawn = i / rate + hash(i * 13.7) * 0.5
    if (spawn < gIn || spawn > gNow) continue
    const age = gNow - spawn
    const life = 1.1 + hash(i * 3.1) * 0.9
    if (age > life) continue
    const u = age / life
    const px = path(spawn) - (10 + hash(i * 7.3) * 26) * s - age * 26
    const py = yAt(spawn) - 4 * s - u * 26 * s - Math.sin(age * 3 + i) * 4
    const rr = (5 + hash(i * 5.9) * 9) * s * (0.5 + u * 1.6)
    ctx.fillStyle = `rgba(196,164,116,${(1 - u) * 0.3})`
    ctx.beginPath()
    ctx.ellipse(px, py, rr, rr * 0.6, 0, 0, 7)
    ctx.fill()
  }
}

// Falling red hair: analytic clumps from the moment `age` started. Targets the
// basin at (bx, by), falling from y0 (the crown). n clumps seeded; clump = strands.
export function hairFall(ctx, age, seed, n, bx, by, y0 = 300) {
  if (age <= 0 || age > 2.4) return
  for (let i = 0; i < n; i++) {
    const d0 = hash(i * 3.7 + seed) * 0.9 // stagger the release
    const a = age - d0
    if (a <= 0) continue
    const x0 = bx - 60 + hash(i * 7.9 + seed) * 120
    const fall = 90 + hash(i * 5.3 + seed) * 80
    const px = x0 + Math.sin(a * 2.2 + i) * 14 * (1 - cl(a / 1.6))
    const py = y0 + fall * a + 150 * a * a
    const landed = py >= by
    const yy = landed ? by - (hash(i * 9.1) * 8) : py
    const al = landed ? (1 - cl((age - d0 - 1.2) / 1.1)) * 0.9 : 0.9
    if (al <= 0.02) continue
    ctx.save()
    ctx.globalAlpha = al
    ctx.translate(px, yy)
    ctx.rotate(Math.sin(a * 3 + i) * 0.5)
    ctx.strokeStyle = i % 3 === 0 ? '#a05048' : PAL.flowRed
    ctx.lineWidth = 2.6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-5, 0)
    ctx.quadraticCurveTo(0, 4, 6, 1)
    ctx.stroke()
    ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.moveTo(-3, -2); ctx.quadraticCurveTo(1, 3, 5, 3); ctx.stroke()
    ctx.restore()
  }
}

// Dust motes hanging in a light beam (key on WORLD g so they hang in freezes).
export function motes(ctx, g, n, seed, o = {}) {
  const x0 = o.x0 ?? 0, x1 = o.x1 ?? W, y0 = o.y0 ?? 140, y1 = o.y1 ?? 900
  for (let i = 0; i < n; i++) {
    const life = 4 + hash(i * 3.3 + seed) * 5
    const age = ((g * (0.35 + hash(i * 7.1 + seed) * 0.5) + hash(i * 13.7) * life) % life)
    const u = age / life
    const px = x0 + hash(i * 5.3 + seed) * (x1 - x0) + Math.sin(g * 0.5 + i) * 22
    const py = y0 + ((u + hash(i * 9.7)) % 1) * (y1 - y0)
    const al = Math.sin(u * Math.PI) * (0.12 + hash(i * 2.9) * 0.2)
    ctx.fillStyle = `rgba(${o.col ?? '232,226,208'},${al.toFixed(3)})`
    ctx.fillRect(px, py, 1.8, 1.8)
  }
}

// Steam / vapor wisps rising (pure in t).
export function steam(ctx, x, y, t, seed, colPrefix = 'rgba(210,225,235,') {
  for (let i = 0; i < 6; i++) {
    const life = 1.1 + hash(i * 3.7 + seed) * 0.9
    const age = ((t * (0.5 + hash(i * 7.3 + seed) * 0.4) + hash(i * 5.9 + seed) * life) % life)
    const u = age / life
    const px = x + Math.sin(age * 2.4 + i * 2.1 + seed) * (6 + u * 22)
    const py = y - u * 90
    ctx.fillStyle = `${colPrefix}${(1 - u) * 0.24})`
    ctx.beginPath()
    ctx.arc(px, py, 3 + u * 10, 0, 7)
    ctx.fill()
  }
}

// Tiny 4-point sparkle (chandelier / crystal stars / cash glints).
export function sparkle(ctx, x, y, s, t, seed, col = '191,233,255') {
  const ph = (t * (0.5 + hash(seed * 3.7) * 0.8) + hash(seed * 9.1)) % 1
  const a = Math.sin(ph * Math.PI)
  if (a <= 0.03) return
  ctx.save()
  ctx.globalAlpha = a
  ctx.strokeStyle = `rgb(${col})`
  ctx.lineWidth = 1.2
  const r = s * (0.4 + a * 0.6)
  ctx.beginPath()
  ctx.moveTo(x - r, y); ctx.lineTo(x + r, y)
  ctx.moveTo(x, y - r); ctx.lineTo(x, y + r)
  ctx.stroke()
  ctx.restore()
}

// The finale star field: seeded blue crystals glowing like stars across the
// dark sand. k fades the field in; a few larger clusters anchor the read.
export function crystalStars(ctx, t, k) {
  if (k <= 0.02) return
  for (let i = 0; i < 150; i++) {
    const px = hash(i * 7.3) * (W + OS * 2) - OS
    const py = 600 + hash(i * 3.1) * 420
    const big = i % 23 === 0
    const tw = 0.55 + 0.45 * Math.sin(t * (1 + hash(i * 5.7)) + i)
    const a = k * tw * (big ? 0.95 : 0.5 + hash(i * 9.3) * 0.4)
    const rr = big ? 3.2 : 1.4 + hash(i * 11.1) * 1.2
    const g = ctx.createRadialGradient(px, py, 0.4, px, py, rr * 4)
    g.addColorStop(0, `rgba(150,215,255,${a})`)
    g.addColorStop(0.4, `rgba(99,197,255,${a * 0.5})`)
    g.addColorStop(1, 'rgba(99,197,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(px - rr * 4, py - rr * 4, rr * 8, rr * 8)
    ctx.fillStyle = `rgba(224,244,255,${a})`
    ctx.fillRect(px - rr / 2, py - rr / 2, rr, rr)
    if (big) sparkle(ctx, px, py, 8, t, i * 3 + 5)
  }
}

// Titles void: faint green scanlines + drifting atom motes.
export function voidField(ctx, t, k = 1) {
  ctx.save()
  ctx.globalAlpha = 0.1 * k
  ctx.strokeStyle = PAL.elmGreen
  ctx.lineWidth = 1
  for (let y = BAR + 6; y < H - BAR; y += 7) {
    ctx.beginPath(); ctx.moveTo(-OS, y + Math.sin(t * 0.7 + y * 0.02) * 1.4); ctx.lineTo(W + OS, y + Math.sin(t * 0.7 + y * 0.02) * 1.4); ctx.stroke()
  }
  ctx.globalAlpha = 1
  for (let i = 0; i < 26; i++) {
    const life = 5 + hash(i * 3.3) * 6
    const age = ((t * (0.3 + hash(i * 7.1) * 0.4) + hash(i * 13.7) * life) % life)
    const u = age / life
    const px = hash(i * 5.3) * (W + OS * 2) - OS + Math.sin(t * 0.6 + i) * 26
    const py = H - u * (H - BAR * 2 + 200) - BAR + 100
    ctx.fillStyle = `rgba(87,201,138,${(Math.sin(u * Math.PI) * 0.3).toFixed(3)})`
    ctx.beginPath(); ctx.arc(px, py, 1.4 + hash(i * 9.7) * 2, 0, 7); ctx.fill()
  }
  ctx.restore()
}

// ============================== impact fx (age on REAL t) ==============================

export function contactShadow(ctx, x, feetY, w, k = 0.4) {
  ctx.save()
  ctx.fillStyle = `rgba(10,7,4,${k})`
  ctx.beginPath()
  ctx.ellipse(x, feetY + 3, w, w * 0.22, 0, 0, 7)
  ctx.fill()
  ctx.restore()
}

export function dustBurst(ctx, x, y, age, seed, o = {}) {
  const life = o.life ?? 0.8
  if (age <= 0 || age > life) return
  const n = o.n ?? 14
  for (let i = 0; i < n; i++) {
    const a = hash(seed * 7 + i * 13) * 6.28
    const sp = (0.4 + hash(seed * 3 + i * 29) * 0.8) * (o.spread ?? 190)
    const px = x + Math.cos(a) * sp * age * (0.5 + hash(i * 3.3) * 0.5)
    const py = y - Math.abs(Math.sin(a)) * sp * 0.55 * age + 300 * age * age
    const u = age / life
    ctx.globalAlpha = (1 - u) * (0.34 + hash(i * 7.7) * 0.3)
    ctx.fillStyle = o.col ?? '#b3a284'
    ctx.beginPath()
    ctx.arc(px, py, (3 + hash(i * 5.1) * 7) * (0.5 + u), 0, 7)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

export function sparkBurst(ctx, x, y, age, seed) {
  if (age <= 0 || age > 0.3) return
  for (let i = 0; i < 7; i++) {
    const a = hash(seed + i * 17) * 6.28
    const d = 12 + (age / 0.3) * 46 * (0.5 + hash(i * 3.1) * 0.5)
    ctx.strokeStyle = `rgba(170,${220 + (hash(i) * 35) | 0},255,${1 - age / 0.3})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
    ctx.stroke()
  }
}

export function shockRing(ctx, x, y, age, life = 0.4, col = 'rgba(150,214,255,0.7)') {
  if (age <= 0 || age > life) return
  const u = age / life
  ctx.strokeStyle = col
  ctx.globalAlpha = 1 - u
  ctx.lineWidth = 3.5 * (1 - u) + 0.8
  ctx.beginPath()
  ctx.ellipse(x, y, 12 + u * 220, (12 + u * 220) * 0.42, 0, 0, 7)
  ctx.stroke()
  ctx.globalAlpha = 1
}

// Four-point glint (meth-blue tinted by default; warm when o.warm).
export function glint(ctx, cx, cy, s, k, o = {}) {
  if (k <= 0 || k >= 1) return
  ctx.save()
  ctx.translate(cx, cy)
  ctx.globalAlpha = Math.sin(k * Math.PI)
  ctx.fillStyle = o.warm ? '#ffe9b8' : '#dff2ff'
  const r = s * (0.4 + 0.6 * Math.sin(k * Math.PI))
  ctx.beginPath()
  ctx.moveTo(0, -r); ctx.quadraticCurveTo(2, -2, r, 0); ctx.quadraticCurveTo(2, 2, 0, r)
  ctx.quadraticCurveTo(-2, 2, -r, 0); ctx.quadraticCurveTo(-2, -2, 0, -r)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// Letterbox bars painted LAST in every shot: nothing bleeds, no stand lines.
export function bars(ctx) {
  ctx.save()
  ctx.fillStyle = '#040504'
  ctx.fillRect(-OS, -OS, W + OS * 2, BAR + OS)
  ctx.fillRect(-OS, H - BAR, W + OS * 2, BAR + OS)
  ctx.restore()
}

// ============================== shared bake helpers ==============================

function skyGrad(x, w, h, stops, o = {}) {
  const g = x.createLinearGradient(0, o.y0 ?? -OS, 0, o.y1 ?? h)
  for (const [p, c] of stops) g.addColorStop(p, c)
  x.fillStyle = g
  x.fillRect(-OS, -OS, w + OS * 2, h + OS * 2)
}

// Buttes + flats as one filled path (good-bad-bald mesaLayer adaptation).
function mesaLayer(x, w, baseY, minH, maxH, seed, col, o = {}) {
  const p = new Path2D()
  const r = rng(seed)
  p.moveTo(-14, baseY + 60)
  let px = -14
  for (let i = 0; i < 80 && px < w + 14; i++) {
    const flat = 26 + r() * 120
    p.lineTo(px + flat, baseY + (r() - 0.5) * 6)
    px += flat
    if (r() > 0.44) {
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
      const tt = 1 - (baseY - yy) / maxH
      x.fillStyle = `rgba(24,10,14,${0.05 + sr() * 0.09 * tt})`
      x.fillRect(0, yy, w, 3 + sr() * 3)
    }
    x.restore()
  }
  return p
}

// Sand plane with perspective wind ripples + speckle (paintSand adaptation).
function paintSand(x, w, h, hY, c0, c1, c2, seed) {
  const g = x.createLinearGradient(0, hY - 4, 0, h)
  g.addColorStop(0, c0)
  g.addColorStop(0.42, c1)
  g.addColorStop(1, c2)
  x.fillStyle = g
  x.fillRect(-OS, hY - 4, w + OS * 2, h - hY + 8 + OS)
  const r = rng(seed)
  for (let i = 0; i < 26; i++) {
    const t = i / 26
    const yy = hY + 8 + Math.pow(t, 1.75) * (h - hY - 14)
    const amp = 3 + t * 10
    x.strokeStyle = i % 2 === 0 ? `rgba(95,64,40,${0.06 + r() * 0.07})` : `rgba(232,188,128,${0.05 + r() * 0.06})`
    x.lineWidth = 1.2 + t * 2.6
    x.beginPath()
    for (let s = 0; s <= 8; s++) {
      const sx = (s / 8) * (w + OS * 2) - OS
      const sy = yy + (vnoise(s * 0.9 + i * 3.7, seed) - 0.5) * amp * 2
      if (s === 0) x.moveTo(sx, sy)
      else x.lineTo(sx, sy)
    }
    x.stroke()
  }
  for (let i = 0; i < 110; i++) {
    const t = Math.pow(r(), 0.8)
    const yy = hY + 10 + t * (h - hY - 14)
    x.fillStyle = r() > 0.5 ? 'rgba(95,64,40,0.25)' : 'rgba(232,188,128,0.22)'
    const sz = 1 + t * 2.6
    x.fillRect(r() * (w + OS * 2) - OS, yy, sz, sz * 0.7)
  }
}

function grainVeil(x, w, h, seed, n = 1200, aMax = 0.05) {
  for (let i = 0; i < n; i++) {
    const gx = hash(seed + i * 3.17) * w - OS
    const gy = hash(seed + i * 7.71) * h - OS
    const a = aMax * hash(i * 13.3 + seed)
    x.fillStyle = i % 2 ? `rgba(255,238,214,${a})` : `rgba(22,10,12,${a})`
    x.fillRect(gx, gy, 1.6, 1.6)
  }
}

// Light shaft wedge (god-shafts / window shafts), baked soft.
function shaft(x, x0, y0, x1, y1, wTop, wBot, col, a) {
  const g = x.createLinearGradient(x0, y0, (x0 + x1) / 2, y1)
  g.addColorStop(0, col.replace('A)', `${a})`))
  g.addColorStop(1, col.replace('A)', '0)'))
  x.fillStyle = g
  x.beginPath()
  x.moveTo(x0 - wTop, y0)
  x.lineTo(x0 + wTop, y0)
  x.lineTo(x1 + wBot, y1)
  x.lineTo(x1 - wBot, y1)
  x.closePath()
  x.fill()
}

// ============================== the baked stages ==============================

// S1 dawn desert (cold open wide + the macro crop lives on the same bake).
function desertBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [
    [0, '#241631'], [0.3, '#472449'], [0.52, '#8a4048'], [0.68, '#c86a46'], [0.8, '#eda45c'], [0.9, '#f8d38c'], [1, '#f8dc9e'],
  ])
  // low sun burning through the horizon haze
  const [sx, sy] = DESERT.sun
  const sun = x.createRadialGradient(sx, sy, 12, sx, sy, 460)
  sun.addColorStop(0, 'rgba(255,224,150,0.55)')
  sun.addColorStop(0.4, 'rgba(240,160,80,0.22)')
  sun.addColorStop(1, 'rgba(240,160,80,0)')
  x.fillStyle = sun
  x.fillRect(sx - 500, sy - 500, 1000, 1000)
  // cloud slabs lit from below (soft — never UFO discs)
  const r0 = rng(42)
  for (const [cx, cy, cw, ch] of [[430, 240, 640, 96], [1380, 200, 820, 110]]) {
    const parts = 3 + Math.floor(r0() * 2)
    for (let i = 0; i < parts; i++) {
      const px = cx + (i - (parts - 1) / 2) * (cw / parts) * 0.9
      const pw = (cw / parts) * (1.1 + r0() * 0.4)
      const ph = ch * (0.6 + r0() * 0.8)
      x.fillStyle = 'rgba(88,48,60,0.5)'
      x.beginPath(); x.ellipse(px, cy, pw / 2, ph / 2, 0, 0, 7); x.fill()
      x.strokeStyle = 'rgba(237,164,92,0.34)'
      x.lineWidth = 2.4
      x.beginPath(); x.ellipse(px, cy, pw / 2 - 1.5, ph / 2 - 1.5, 0, 0.35, Math.PI - 0.35); x.stroke()
    }
  }
  // mesa layers far -> near, warm wash on the sun side
  mesaLayer(x, W, 620, 60, 150, 7, PAL.mesaFar, {})
  // the sun ball sits in the pass between the far mesas
  x.fillStyle = '#ffd9a0'
  x.beginPath(); x.arc(sx, sy + 8, 44, 0, 7); x.fill()
  x.fillStyle = 'rgba(255,236,190,0.65)'
  x.beginPath(); x.arc(sx, sy + 8, 30, 0, 7); x.fill()
  const hz = x.createLinearGradient(0, 560, 0, 650)
  hz.addColorStop(0, 'rgba(244,200,140,0)')
  hz.addColorStop(1, 'rgba(244,200,140,0.5)')
  x.fillStyle = hz
  x.fillRect(-OS, 540, W + OS * 2, 120)
  mesaLayer(x, W, 648, 26, 80, 13, PAL.mesaMid, { striate: true })
  // sand plain
  paintSand(x, W, H + OS, DESERT.horizon, '#d8ac72', PAL.sand, PAL.sandShadow, 91)
  // long shadows toward lower-left (sun low right)
  const r1 = rng(55)
  for (let i = 0; i < 14; i++) {
    const px = r1() * (W + OS * 2) - OS
    const py = 700 + r1() * 320
    const len = 40 + r1() * 90
    x.fillStyle = 'rgba(95,64,40,0.35)'
    x.beginPath(); x.ellipse(px, py, 6 + r1() * 12, 4 + r1() * 6, 0, 0, 7); x.fill()
    x.fillStyle = 'rgba(70,44,28,0.28)'
    x.beginPath()
    x.moveTo(px - 6, py)
    x.lineTo(px - len, py + len * 0.16)
    x.lineTo(px - len + 10, py + len * 0.2)
    x.lineTo(px + 4, py + 4)
    x.closePath()
    x.fill()
  }
  // scrub bushes
  for (let i = 0; i < 12; i++) {
    const px = r1() * (W + OS * 2) - OS
    const py = 690 + r1() * 300
    x.fillStyle = 'rgba(74,84,44,0.75)'
    for (let k = 0; k < 5; k++) {
      x.beginPath()
      x.ellipse(px + (k - 2) * 7, py - (k % 2) * 5, 8, 5, 0, 0, 7)
      x.fill()
    }
  }
  // haze band over the horizon
  const hb = x.createLinearGradient(0, 580, 0, 700)
  hb.addColorStop(0, 'rgba(248,211,140,0)')
  hb.addColorStop(0.5, 'rgba(248,211,140,0.24)')
  hb.addColorStop(1, 'rgba(248,211,140,0)')
  x.fillStyle = hb
  x.fillRect(-OS, 580, W + OS * 2, 120)
  grainVeil(x, W + OS * 2, H + OS * 2, 303, 1400, 0.045)
  return c
}

// S3 classroom: board wall + windows + baked chalk lesson (no desks — they
// parallax live in front of the actor).
function classroomBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  // wall + wainscot + floor
  const wg = x.createLinearGradient(0, 0, 0, H)
  wg.addColorStop(0, '#8a7a5c'); wg.addColorStop(0.6, '#9a8a68'); wg.addColorStop(1, '#6a5c44')
  x.fillStyle = wg
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  x.fillStyle = '#4a3c2a'
  x.fillRect(-OS, 880, W + OS * 2, H - 880 + OS)
  x.fillStyle = 'rgba(210,196,160,0.25)'
  x.fillRect(-OS, 874, W + OS * 2, 8)
  // floorboards
  const rf = rng(19)
  for (let i = 0; i < 16; i++) {
    x.fillStyle = `rgba(30,22,14,${0.16 + rf() * 0.12})`
    x.fillRect(-OS, 890 + i * 22, W + OS * 2, 3)
  }
  // windows right: bright morning panes + frames
  for (const wx of [1430, 1730]) {
    x.fillStyle = '#e8f2f8'
    x.fillRect(wx, 190, 220, 420)
    const pg = x.createLinearGradient(wx, 190, wx + 220, 610)
    pg.addColorStop(0, 'rgba(248,236,200,0.85)')
    pg.addColorStop(1, 'rgba(220,232,240,0.4)')
    x.fillStyle = pg
    x.fillRect(wx, 190, 220, 420)
    x.strokeStyle = '#3a3226'
    x.lineWidth = 12
    x.strokeRect(wx, 190, 220, 420)
    x.lineWidth = 6
    x.beginPath()
    x.moveTo(wx + 110, 190); x.lineTo(wx + 110, 610)
    x.moveTo(wx, 400); x.lineTo(wx + 220, 400)
    x.stroke()
  }
  // dusty shafts from the windows
  shaft(x, 1500, 200, 1150, 900, 60, 190, 'rgba(244,232,196,A)', 0.22)
  shaft(x, 1790, 200, 1500, 920, 70, 210, 'rgba(244,232,196,A)', 0.16)
  // chalkboard
  const bx = 240, by = 170, bw = 1060, bh = 560
  const bg = x.createLinearGradient(bx, by, bx + bw, by + bh)
  bg.addColorStop(0, '#2c3a34'); bg.addColorStop(0.5, '#26332c'); bg.addColorStop(1, '#1e2a24')
  x.fillStyle = bg
  x.fillRect(bx, by, bw, bh)
  x.strokeStyle = '#6a5232'
  x.lineWidth = 16
  x.strokeRect(bx - 8, by - 8, bw + 16, bh + 16)
  // chalk ghosting
  const rc = rng(71)
  for (let i = 0; i < 60; i++) {
    x.fillStyle = `rgba(226,232,224,${0.02 + rc() * 0.05})`
    x.fillRect(bx + rc() * bw, by + rc() * bh, 30 + rc() * 90, 3 + rc() * 5)
  }
  // THE LESSON: HAIR IS CHEMISTRY + follicle molecule diagram
  x.save()
  x.translate(bx + 60, by + 90)
  x.rotate(-0.012)
  x.fillStyle = 'rgba(238,242,236,0.94)'
  x.font = '600 64px "Space Grotesk"'
  x.fillText('HAIR IS CHEMISTRY', 0, 0)
  x.font = '500 26px "Space Grotesk"'
  x.fillStyle = 'rgba(226,232,224,0.75)'
  x.fillText('keratin + melanin + flow', 6, 46)
  // hexagon molecule ring + bonds
  const hx = 220, hy = 300
  x.strokeStyle = 'rgba(238,242,236,0.9)'
  x.lineWidth = 4
  x.beginPath()
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2
    const px = hx + Math.cos(a) * 74, py = hy + Math.sin(a) * 74
    if (i === 0) x.moveTo(px, py)
    else x.lineTo(px, py)
  }
  x.stroke()
  x.lineWidth = 2.4
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2
    const px = hx + Math.cos(a) * 74, py = hy + Math.sin(a) * 74
    x.beginPath(); x.arc(px, py, 11, 0, 7); x.stroke()
  }
  x.font = '600 22px "Space Grotesk"'
  x.fillStyle = 'rgba(238,242,236,0.95)'
  x.fillText('N', hx + Math.cos(-Math.PI / 2) * 74 - 7, hy + Math.sin(-Math.PI / 2) * 74 + 8)
  x.fillText('S', hx + Math.cos(Math.PI / 3) * 74 - 6, hy + Math.sin(Math.PI / 3) * 74 + 8)
  // the follicle sketch: bulb + shaft
  x.strokeStyle = 'rgba(238,242,236,0.85)'
  x.lineWidth = 3.4
  x.beginPath()
  x.moveTo(560, 180)
  x.quadraticCurveTo(620, 240, 610, 330)
  x.stroke()
  x.beginPath()
  x.ellipse(612, 352, 26, 34, 0.2, 0, 7)
  x.stroke()
  x.lineWidth = 2
  for (let i = 0; i < 5; i++) {
    x.beginPath()
    x.moveTo(590 + i * 11, 336 - i)
    x.lineTo(586 + i * 13, 368 - i * 2)
    x.stroke()
  }
  x.font = '500 22px "Space Grotesk"'
  x.fillStyle = 'rgba(226,232,224,0.8)'
  x.fillText('the follicle', 560, 420)
  x.fillText('fig. 1', 220, 420)
  x.restore()
  // board tray + eraser + stick of chalk (static; the live chalk bounces separately)
  x.fillStyle = '#7a5c34'
  x.fillRect(bx - 12, by + bh + 8, bw + 24, 22)
  x.fillStyle = '#3a2c1c'
  x.fillRect(bx + bw - 160, by + bh - 2, 90, 18)
  grainVeil(x, W + OS * 2, H + OS * 2, 88, 900, 0.04)
  return c
}

// S4 bathroom: tiles + mirror + fluorescent bar (the reflection + sink front
// are live — the sink must occlude the reflected body's lower half).
function bathroomBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  // tile wall
  x.fillStyle = '#b8bdb9'
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  const rt = rng(23)
  for (let ty = -OS; ty < H + OS; ty += 64) {
    for (let tx = -OS + (((ty / 64) | 0) % 2) * 32 - 32; tx < W + OS; tx += 64) {
      const k = 0.92 + rt() * 0.12
      x.fillStyle = `rgb(${(184 * k) | 0},${(189 * k) | 0},${(185 * k) | 0})`
      x.fillRect(tx + 2, ty + 2, 60, 60)
      x.strokeStyle = 'rgba(90,98,94,0.5)'
      x.lineWidth = 2
      x.strokeRect(tx + 2, ty + 2, 60, 60)
    }
  }
  // grime gradient toward the floor
  const gr = x.createLinearGradient(0, 700, 0, 1080)
  gr.addColorStop(0, 'rgba(60,70,64,0)')
  gr.addColorStop(1, 'rgba(60,70,64,0.35)')
  x.fillStyle = gr
  x.fillRect(-OS, 700, W + OS * 2, 380 + OS)
  // MIRROR: big framed plate the reflection lives in
  x.fillStyle = '#5a5f5c'
  x.fillRect(300, 216, 1320, 680)
  x.fillStyle = '#8f9694'
  x.fillRect(314, 230, 1292, 652)
  const mg = x.createLinearGradient(314, 230, 1606, 882)
  mg.addColorStop(0, 'rgba(200,220,224,0.34)')
  mg.addColorStop(0.5, 'rgba(160,184,190,0.16)')
  mg.addColorStop(1, 'rgba(120,144,152,0.3)')
  x.fillStyle = mg
  x.fillRect(314, 230, 1292, 652)
  // mirror corner darkening (age) + one diagonal glass sheen
  const dk = x.createRadialGradient(960, 540, 300, 960, 540, 920)
  dk.addColorStop(0, 'rgba(40,52,50,0)')
  dk.addColorStop(1, 'rgba(40,52,50,0.3)')
  x.fillStyle = dk
  x.fillRect(314, 230, 1292, 652)
  const shn = x.createLinearGradient(500, 230, 1200, 882)
  shn.addColorStop(0.25, 'rgba(226,240,244,0)'); shn.addColorStop(0.35, 'rgba(226,240,244,0.1)')
  shn.addColorStop(0.42, 'rgba(226,240,244,0)'); shn.addColorStop(1, 'rgba(226,240,244,0)')
  x.fillStyle = shn
  x.fillRect(314, 230, 1292, 652)
  // fluorescent bar light at the top (INSIDE the 2.39 band, above the mirror)
  x.fillStyle = '#4a4f4c'
  x.fillRect(700, 148, 520, 26)
  x.fillStyle = '#f4f8ee'
  x.fillRect(712, 162, 496, 10)
  const lg = x.createRadialGradient(960, 170, 10, 960, 170, 560)
  lg.addColorStop(0, 'rgba(240,248,232,0.42)')
  lg.addColorStop(1, 'rgba(240,248,232,0)')
  x.fillStyle = lg
  x.fillRect(400, 130, 1120, 660)
  // teal under-glow pools where the sink front will sit
  const tg = x.createRadialGradient(960, 930, 20, 960, 940, 300)
  tg.addColorStop(0, 'rgba(80,190,190,0.22)')
  tg.addColorStop(1, 'rgba(80,190,190,0)')
  x.fillStyle = tg
  x.fillRect(660, 830, 600, 250)
  return c
}

// The sink FRONT (drawn AFTER the reflected actor so it occludes his lower
// half — the mirror-read: head and chest in the glass, basin below).
export function sinkFront(ctx, t) {
  ctx.save()
  // pedestal
  ctx.fillStyle = '#b8beb9'
  ctx.fillRect(906, 950, 108, 130 + OS)
  // counter + basin bowl
  ctx.fillStyle = '#d8ddd8'
  ctx.beginPath()
  ctx.ellipse(960, 928, 240, 62, 0, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#eef2ec'
  ctx.beginPath()
  ctx.ellipse(960, 912, 214, 46, 0, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#9aa39c'
  ctx.beginPath()
  ctx.ellipse(960, 910, 168, 33, 0, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#6f7873'
  ctx.beginPath()
  ctx.ellipse(960, 914, 138, 24, 0, 0, 7)
  ctx.fill()
  // water sheen in the bowl
  ctx.fillStyle = 'rgba(200,226,224,0.25)'
  ctx.beginPath()
  ctx.ellipse(942 + Math.sin(t * 1.3) * 4, 912, 60, 10, 0, 0, 7)
  ctx.fill()
  // faucet tucked behind the bowl rim
  ctx.strokeStyle = '#8a9294'
  ctx.lineWidth = 9
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(960, 908)
  ctx.quadraticCurveTo(960, 888, 996, 890)
  ctx.stroke()
  ctx.restore()
}

// S5 RV lab interior: burner + glassware rig baked once; glows live.
function labBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  // curved ceiling + walls + plastic sheeting
  const cg = x.createLinearGradient(0, -OS, 0, 500)
  cg.addColorStop(0, '#c8bda0'); cg.addColorStop(1, '#a89a7c')
  x.fillStyle = cg
  x.fillRect(-OS, -OS, W + OS * 2, 920 + OS)
  x.beginPath()
  x.moveTo(-OS, 300)
  x.quadraticCurveTo(960, 60, W + OS, 300)
  x.lineTo(W + OS, -OS)
  x.lineTo(-OS, -OS)
  x.closePath()
  x.fillStyle = '#d8cdae'
  x.fill()
  // ceiling rib
  x.strokeStyle = 'rgba(90,78,54,0.5)'
  x.lineWidth = 8
  x.beginPath()
  x.moveTo(-OS, 260)
  x.quadraticCurveTo(960, 30, W + OS, 260)
  x.stroke()
  // cabinets strip
  x.fillStyle = '#6e5236'
  x.fillRect(-OS, 200, W + OS * 2, 96)
  x.fillStyle = '#7e5e3e'
  for (let i = 0; i < 10; i++) x.fillRect(-OS + 40 + i * 216, 210, 190, 76)
  x.strokeStyle = '#4a3620'
  x.lineWidth = 3
  for (let i = 0; i < 10; i++) x.strokeRect(-OS + 40 + i * 216, 210, 190, 76)
  // window strip: night outside
  x.fillStyle = '#101826'
  x.fillRect(1180, 330, 420, 130)
  x.fillStyle = 'rgba(90,130,180,0.2)'
  x.fillRect(1180, 330, 420, 130)
  x.strokeStyle = '#4a3c28'
  x.lineWidth = 8
  x.strokeRect(1180, 330, 420, 130)
  // plastic sheeting wall behind the rig
  x.fillStyle = 'rgba(214,204,176,0.92)'
  x.beginPath()
  x.moveTo(620, 420)
  for (let px = 620; px <= 1420; px += 80) x.lineTo(px, 430 + Math.sin(px * 0.02) * 18)
  x.lineTo(1420, 900)
  x.lineTo(620, 900)
  x.closePath()
  x.fill()
  x.strokeStyle = 'rgba(120,108,80,0.4)'
  x.lineWidth = 3
  for (let i = 0; i < 6; i++) {
    x.beginPath()
    x.moveTo(660 + i * 130, 430)
    x.quadraticCurveTo(650 + i * 130 + Math.sin(i * 2) * 30, 650, 680 + i * 130, 900)
    x.stroke()
  }
  // duct tape seam
  x.fillStyle = '#8a8a8a'
  x.fillRect(618, 416, 806, 12)
  // floor
  const fg = x.createLinearGradient(0, 880, 0, H + OS)
  fg.addColorStop(0, '#5a4c34'); fg.addColorStop(1, '#3a3020')
  x.fillStyle = fg
  x.fillRect(-OS, 880, W + OS * 2, H - 880 + OS * 2)
  const rf = rng(31)
  for (let i = 0; i < 40; i++) {
    x.fillStyle = `rgba(24,18,10,${0.14 + rf() * 0.16})`
    x.fillRect(-OS + rf() * (W + OS * 2), 900 + rf() * 200, 20 + rf() * 60, 4)
  }
  // propane tank far left
  x.fillStyle = '#7a4a34'
  x.beginPath(); x.ellipse(LAB.tank[0], LAB.tank[1], 44, 120, 0, 0, 7); x.fill()
  x.fillStyle = '#94583c'
  x.beginPath(); x.ellipse(LAB.tank[0] - 10, LAB.tank[1] - 12, 32, 100, 0, 0, 7); x.fill()
  x.fillStyle = '#3a3a3a'
  x.fillRect(LAB.tank[0] - 12, LAB.tank[1] - 136, 24, 22)
  // work table
  x.fillStyle = '#4a3a24'
  x.fillRect(600, LAB.tableY - 14, 760, 26)
  x.fillStyle = '#5e4a2e'
  x.fillRect(600, LAB.tableY - 20, 760, 10)
  x.fillStyle = '#332816'
  x.fillRect(640, LAB.tableY + 12, 22, 120)
  x.fillRect(1320, LAB.tableY + 12, 22, 120)
  // burner stand under the flask
  const [bx, by] = LAB.burner
  x.fillStyle = '#2c2c30'
  x.fillRect(bx - 46, by - 8, 92, 14)
  x.fillRect(bx - 8, by - 46, 16, 40)
  x.fillStyle = '#1c1c20'
  x.beginPath(); x.ellipse(bx, by - 48, 30, 8, 0, 0, 7); x.fill()
  // tubing: from the tank along the table to the burner
  x.strokeStyle = '#b8b0a0'
  x.lineWidth = 7
  x.beginPath()
  x.moveTo(LAB.tank[0] + 30, LAB.tank[1] - 60)
  x.quadraticCurveTo(700, 760, bx - 6, by - 30)
  x.stroke()
  // ROUND FLASK on the burner (glass, empty — the glow is live)
  const [fx, fy] = LAB.flask
  x.fillStyle = 'rgba(220,236,244,0.2)'
  x.beginPath()
  x.arc(fx, fy, 56, 0, 7)
  x.fill()
  x.strokeStyle = 'rgba(235,246,252,0.75)'
  x.lineWidth = 3
  x.beginPath(); x.arc(fx, fy, 56, 0, 7); x.stroke()
  x.fillRect(fx - 9, fy - 96, 18, 44)
  x.strokeRect(fx - 9, fy - 96, 18, 44)
  x.fillStyle = 'rgba(255,255,255,0.3)'
  x.beginPath(); x.ellipse(fx - 20, fy - 18, 10, 20, 0.4, 0, 7); x.fill()
  // side erlenmeyer
  const [ex, ey] = LAB.flask2
  x.fillStyle = 'rgba(220,236,244,0.18)'
  x.beginPath()
  x.moveTo(ex - 12, ey - 66); x.lineTo(ex + 12, ey - 66); x.lineTo(ex + 34, ey); x.lineTo(ex - 34, ey)
  x.closePath()
  x.fill()
  x.strokeStyle = 'rgba(235,246,252,0.7)'
  x.lineWidth = 2.6
  x.stroke()
  // condenser tube: flask neck -> angled down to the cast
  x.strokeStyle = 'rgba(220,232,240,0.65)'
  x.lineWidth = 10
  x.beginPath()
  x.moveTo(fx + 9, fy - 88)
  x.quadraticCurveTo(fx + 90, fy - 130, LAB.cast[0] - 60, LAB.castTop - 30)
  x.quadraticCurveTo(LAB.cast[0] - 26, LAB.castTop - 16, LAB.cast[0] - 8, LAB.castTop + 4)
  x.stroke()
  x.strokeStyle = 'rgba(255,255,255,0.25)'
  x.lineWidth = 3
  x.stroke()
  // steel cast / mould box on the table
  const [cx2, cy2] = LAB.cast
  const kg = x.createLinearGradient(cx2 - 70, cy2 - 60, cx2 + 70, cy2 + 30)
  kg.addColorStop(0, '#8a98a8'); kg.addColorStop(0.5, '#5a6878'); kg.addColorStop(1, '#39434f')
  x.fillStyle = kg
  x.fillRect(cx2 - 70, cy2 - 56, 140, 86)
  x.fillStyle = '#48555f'
  x.fillRect(cx2 - 78, cy2 - 64, 156, 14)
  x.strokeStyle = '#2c343c'
  x.lineWidth = 3
  x.strokeRect(cx2 - 70, cy2 - 56, 140, 86)
  // bolt dots
  x.fillStyle = '#2c343c'
  for (const [dx, dy] of [[-58, -44], [58, -44], [-58, 18], [58, 18]]) {
    x.beginPath(); x.arc(cx2 + dx, cy2 + dy, 4, 0, 7); x.fill()
  }
  // shelf with jars (top left)
  x.fillStyle = '#4a3620'
  x.fillRect(120, 420, 380, 12)
  const rj = rng(47)
  for (let i = 0; i < 5; i++) {
    const jx = 150 + i * 70, jh = 40 + rj() * 26
    x.fillStyle = 'rgba(210,225,220,0.35)'
    x.fillRect(jx, 420 - jh, 34, jh)
    x.fillStyle = `rgba(${120 + rj() * 60 | 0},${140 + rj() * 50 | 0},${90 + rj() * 40 | 0},0.5)`
    x.fillRect(jx + 3, 420 - jh + 10, 28, jh - 12)
  }
  return c
}

// S6a diner front of house (warm): menu board, counter, booths, porthole.
function dinerFrontBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  // warm wall + wainscot + checker floor
  const wg = x.createLinearGradient(0, 0, 0, 900)
  wg.addColorStop(0, '#c08a52'); wg.addColorStop(0.6, '#d8a468'); wg.addColorStop(1, '#a87848')
  x.fillStyle = wg
  x.fillRect(-OS, -OS, W + OS * 2, 920 + OS)
  x.fillStyle = '#7e5230'
  x.fillRect(-OS, 830, W + OS * 2, 90)
  x.fillStyle = '#e4dcc8'
  x.fillRect(-OS, 920, W + OS * 2, H - 920 + OS)
  const rc = rng(61)
  for (let ty = 920; ty < H + OS; ty += 62) {
    for (let tx = -OS + (((ty / 62) | 0) % 2) * 62 - 62; tx < W + OS; tx += 124) {
      x.fillStyle = rc() > 0.5 ? '#2c2824' : '#e4dcc8'
      x.fillRect(tx, ty, 62, 62)
    }
  }
  // MENU BOARD top-left: header + chalk menu lines
  const [mx, my] = [430, 366]
  x.fillStyle = '#4a2e18'
  x.fillRect(mx - 210, my - 130, 560, 320)
  x.fillStyle = '#2c1c10'
  x.fillRect(mx - 196, my - 116, 532, 292)
  x.fillStyle = '#f2d8a0'
  x.font = '700 44px Anton'
  x.textAlign = 'center'
  x.fillText('LOS FLOWOS HERMANOS', mx + 70, my - 62)
  x.font = '500 24px "Space Grotesk"'
  x.fillStyle = 'rgba(242,216,160,0.85)'
  const menu = ['bucket ......... 8.90', 'flow burger .... 6.20', 'blue plate ..... 99.10', 'haircut ........ free']
  for (let i = 0; i < menu.length; i++) x.fillText(menu[i], mx + 70, my - 12 + i * 40)
  // chains holding the board
  x.strokeStyle = '#3a2c1c'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(mx - 160, my - 130); x.lineTo(mx - 120, -OS)
  x.moveTo(mx + 300, my - 130); x.lineTo(mx + 260, -OS)
  x.stroke()
  // counter along the right: top + face + stools
  x.fillStyle = '#b8b2a4'
  x.fillRect(1400, 600, W - 1400 + OS, 34)
  x.fillStyle = '#8a8274'
  x.fillRect(1400, 634, W - 1400 + OS, 26)
  x.fillStyle = '#6e4e2e'
  x.fillRect(1410, 660, W - 1400 + OS, 220)
  x.fillStyle = '#5a3c22'
  for (let i = 0; i < 8; i++) x.fillRect(1410, 672 + i * 26, W - 1390 + OS, 4)
  for (const sx of [1470, 1660, 1850]) {
    x.fillStyle = '#c0392b'
    x.beginPath(); x.ellipse(sx, 700, 30, 10, 0, 0, 7); x.fill()
    x.fillStyle = '#4a4038'
    x.fillRect(sx - 5, 700, 10, 180)
  }
  // register + pie case on the counter
  x.fillStyle = '#3a3e44'
  x.fillRect(1440, 520, 90, 80)
  x.fillStyle = '#5a6068'
  x.fillRect(1440, 520, 90, 16)
  // warm practicals: two hanging lamps
  for (const lx of [760, 1240]) {
    x.strokeStyle = '#3a2c1c'
    x.lineWidth = 4
    x.beginPath(); x.moveTo(lx, -OS); x.lineTo(lx, 180); x.stroke()
    x.fillStyle = '#2e9e48'
    x.beginPath(); x.moveTo(lx - 44, 224); x.quadraticCurveTo(lx, 160, lx + 44, 224); x.closePath(); x.fill()
    x.fillStyle = '#f8e8b0'
    x.beginPath(); x.arc(lx, 232, 12, 0, 7); x.fill()
    const lg = x.createRadialGradient(lx, 240, 6, lx, 240, 300)
    lg.addColorStop(0, 'rgba(248,210,130,0.4)')
    lg.addColorStop(1, 'rgba(248,210,130,0)')
    x.fillStyle = lg
    x.fillRect(lx - 300, 200, 600, 620)
  }
  // booths along the left/back
  for (const [bx, by] of [[240, 700], [560, 700]]) {
    x.fillStyle = '#8a3226'
    x.beginPath()
    x.moveTo(bx - 90, by)
    x.quadraticCurveTo(bx - 96, by - 150, bx - 40, by - 170)
    x.lineTo(bx + 40, by - 170)
    x.quadraticCurveTo(bx + 96, by - 150, bx + 90, by)
    x.closePath()
    x.fill()
    x.fillStyle = '#a83e2e'
    x.fillRect(bx - 110, by - 40, 220, 44)
    x.fillStyle = '#6e4e2e'
    x.fillRect(bx - 90, by - 60, 180, 22)
  }
  // PORTHOLE window right wall (the kingpin watches through this)
  const [phx, phy] = DINER.porthole
  x.fillStyle = '#5a4632'
  x.beginPath(); x.arc(phx, phy, DINER.portholeR + 16, 0, 7); x.fill()
  // night street outside
  x.fillStyle = '#16202e'
  x.beginPath(); x.arc(phx, phy, DINER.portholeR, 0, 7); x.fill()
  x.fillStyle = 'rgba(232,180,90,0.24)'
  x.beginPath(); x.arc(phx, phy, DINER.portholeR, 0, 7); x.fill()
  x.fillStyle = '#0e141e'
  x.fillRect(phx - DINER.portholeR, phy - 20, DINER.portholeR * 2, DINER.portholeR)
  x.fillStyle = '#1c2836'
  x.beginPath(); x.arc(phx, phy, DINER.portholeR, 0, 7); x.fill()
  // streetlight glow through the glass
  const sg = x.createRadialGradient(phx + 40, phy + 30, 4, phx + 40, phy + 30, 90)
  sg.addColorStop(0, 'rgba(240,190,110,0.5)')
  sg.addColorStop(1, 'rgba(240,190,110,0)')
  x.fillStyle = sg
  x.beginPath(); x.arc(phx, phy, DINER.portholeR, 0, 7); x.fill()
  x.strokeStyle = '#c8b088'
  x.lineWidth = 8
  x.beginPath(); x.arc(phx, phy, DINER.portholeR, 0, 7); x.stroke()
  for (let i = 0; i < 3; i++) {
    x.strokeStyle = 'rgba(200,176,136,0.4)'
    x.lineWidth = 3
    x.beginPath(); x.arc(phx, phy, DINER.portholeR - 16 - i * 26, 0, 7); x.stroke()
  }
  grainVeil(x, W + OS * 2, H + OS * 2, 71, 900, 0.035)
  return c
}

// S6b the cold back room (steel-blue): shelves, slabs, door with pass window.
function dinerBackBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  const wg = x.createLinearGradient(0, 0, 0, H)
  wg.addColorStop(0, '#39434e'); wg.addColorStop(0.6, '#2e3640'); wg.addColorStop(1, '#21272f')
  x.fillStyle = wg
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // steel panel seams
  x.strokeStyle = 'rgba(138,152,168,0.25)'
  x.lineWidth = 3
  for (let i = 0; i < 9; i++) {
    x.beginPath(); x.moveTo(-OS, 120 + i * 110); x.lineTo(W + OS, 120 + i * 110); x.stroke()
  }
  for (let i = 0; i < 8; i++) {
    x.beginPath(); x.moveTo(140 + i * 260, -OS); x.lineTo(140 + i * 260, 900); x.stroke()
  }
  // floor
  x.fillStyle = '#1b2028'
  x.fillRect(-OS, 880, W + OS * 2, H - 880 + OS)
  x.fillStyle = 'rgba(138,152,168,0.3)'
  x.fillRect(-OS, 876, W + OS * 2, 5)
  // steel shelving left with crates
  for (let i = 0; i < 3; i++) {
    const sy = 300 + i * 180
    x.fillStyle = '#4a5866'
    x.fillRect(60, sy, 420, 12)
    x.fillStyle = '#3a4652'
    x.fillRect(70, sy - 70, 150, 70)
    x.fillRect(250, sy - 56, 130, 56)
    x.strokeStyle = '#5a6a7a'
    x.lineWidth = 2
    x.strokeRect(70, sy - 70, 150, 70)
  }
  // hanging beef slabs (the mundane cover story)
  for (const [hx, hy] of [[560, 380], [640, 420]]) {
    x.strokeStyle = '#5a6a7a'
    x.lineWidth = 3
    x.beginPath(); x.moveTo(hx, -OS); x.lineTo(hx, hy - 90); x.stroke()
    x.fillStyle = '#6e3a34'
    x.beginPath(); x.ellipse(hx, hy, 26, 90, 0.06, 0, 7); x.fill()
    x.fillStyle = 'rgba(160,90,80,0.5)'
    x.beginPath(); x.ellipse(hx - 6, hy - 10, 14, 60, 0.06, 0, 7); x.fill()
  }
  // caged wall lamp (the key Gus inspects the vial against)
  const [lx, ly] = DINER.backLamp
  x.strokeStyle = '#3a4450'
  x.lineWidth = 5
  x.beginPath(); x.moveTo(lx, 120); x.lineTo(lx, ly - 26); x.stroke()
  x.fillStyle = '#f2e6c0'
  x.beginPath(); x.arc(lx, ly, 16, 0, 7); x.fill()
  for (let i = 0; i < 4; i++) {
    x.strokeStyle = 'rgba(58,68,80,0.9)'
    x.lineWidth = 2.4
    x.beginPath(); x.arc(lx, ly, 22, (i / 4) * Math.PI, (i / 4) * Math.PI + 0.9); x.stroke()
  }
  const lg = x.createRadialGradient(lx, ly, 4, lx, ly, 300)
  lg.addColorStop(0, 'rgba(226,224,196,0.34)')
  lg.addColorStop(1, 'rgba(226,224,196,0)')
  x.fillStyle = lg
  x.fillRect(lx - 300, ly - 300, 600, 620)
  // steel bench under the lamp
  x.fillStyle = '#4a5866'
  x.fillRect(760, 700, 460, 20)
  x.fillStyle = '#39434e'
  x.fillRect(780, 720, 20, 160)
  x.fillRect(1180, 720, 20, 160)
  // door with pass window right
  x.fillStyle = '#5a6a7a'
  x.fillRect(1520, 300, 240, 580)
  x.strokeStyle = '#2c343c'
  x.lineWidth = 6
  x.strokeRect(1520, 300, 240, 580)
  x.fillStyle = '#141c26'
  x.fillRect(1560, 380, 160, 110)
  x.strokeStyle = '#8a98a8'
  x.lineWidth = 3
  x.strokeRect(1560, 380, 160, 110)
  x.fillStyle = '#39434e'
  x.fillRect(1700, 560, 14, 60)
  return c
}

// S7 warehouse: god-shafts through roof holes, corrugated walls, crates.
function warehouseBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  const wg = x.createLinearGradient(0, 0, 0, H)
  wg.addColorStop(0, '#2a2620'); wg.addColorStop(0.55, '#38322a'); wg.addColorStop(1, '#221e18')
  x.fillStyle = wg
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // corrugated wall ribs
  for (let i = 0; i < 40; i++) {
    x.fillStyle = i % 2 ? 'rgba(12,10,8,0.22)' : 'rgba(90,80,64,0.1)'
    x.fillRect(i * 60 - OS, -OS, 30, H + OS * 2)
  }
  // roof trusses
  x.strokeStyle = '#1c1814'
  x.lineWidth = 16
  for (const ty of [120, 210]) {
    x.beginPath(); x.moveTo(-OS, ty); x.lineTo(W + OS, ty); x.stroke()
  }
  for (let i = 0; i < 12; i++) {
    const tx = i * 200 - OS
    x.lineWidth = 7
    x.beginPath(); x.moveTo(tx, 120); x.lineTo(tx + 60, 210); x.stroke()
  }
  // ROOF HOLES (the god-shafts originate here)
  for (const [hx, hy, hw] of [[560, 96, 90], [1020, 88, 120], [1480, 100, 80]]) {
    x.fillStyle = '#f4e8c8'
    x.beginPath()
    x.ellipse(hx, hy, hw / 2, 16, 0, 0, 7)
    x.fill()
    x.fillStyle = 'rgba(255,250,230,0.75)'
    x.beginPath(); x.ellipse(hx, hy, hw / 3, 9, 0, 0, 7); x.fill()
    // the shaft wedge
    shaft(x, hx, hy, hx - 130, 950, hw / 2, hw * 2.1, 'rgba(244,232,196,A)', 0.2)
  }
  // concrete floor
  const fg = x.createLinearGradient(0, 900, 0, H + OS)
  fg.addColorStop(0, '#3a352c'); fg.addColorStop(1, '#26221c')
  x.fillStyle = fg
  x.fillRect(-OS, 900, W + OS * 2, H - 900 + OS)
  const rf = rng(97)
  for (let i = 0; i < 50; i++) {
    x.fillStyle = `rgba(12,10,8,${0.12 + rf() * 0.15})`
    x.beginPath()
    x.ellipse(-OS + rf() * (W + OS * 2), 930 + rf() * 160, 10 + rf() * 40, 3 + rf() * 8, 0, 0, 7)
    x.fill()
  }
  // crate stacks at the flanks
  for (const [bx, by, n] of [[120, 900, 3], [1680, 900, 4], [330, 900, 2]]) {
    for (let i = 0; i < n; i++) {
      const cy = by - 70 * (i + 1)
      x.fillStyle = i % 2 ? '#4a3c26' : '#544428'
      x.fillRect(bx + (i % 2) * 16, cy, 120, 66)
      x.strokeStyle = '#2c2416'
      x.lineWidth = 4
      x.strokeRect(bx + (i % 2) * 16, cy, 120, 66)
      x.beginPath(); x.moveTo(bx + (i % 2) * 16, cy); x.lineTo(bx + (i % 2) * 16 + 120, cy + 66); x.stroke()
    }
  }
  // barrel row far back
  for (let i = 0; i < 5; i++) {
    x.fillStyle = '#3e4a42'
    x.beginPath(); x.ellipse(820 + i * 62, 880, 24, 60, 0, 0, 7); x.fill()
    x.fillStyle = 'rgba(20,26,22,0.5)'
    x.beginPath(); x.ellipse(820 + i * 62, 856, 22, 6, 0, 0, 7); x.fill()
  }
  grainVeil(x, W + OS * 2, H + OS * 2, 55, 1000, 0.045)
  return c
}

// S8 vignettes: cash room, barrel field, teddy pool, dusk skyline. (The
// chandelier hall is painted live over a dark gradient.)
function cashBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  const wg = x.createLinearGradient(0, 0, 0, H)
  wg.addColorStop(0, '#241c12'); wg.addColorStop(0.6, '#322616'); wg.addColorStop(1, '#1c140c')
  x.fillStyle = wg
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // band a single cash brick: layered note edges + strap
  const brick = (bx, by, bw2, bh2, tone) => {
    x.fillStyle = tone
    x.fillRect(bx, by, bw2, bh2)
    x.fillStyle = 'rgba(240,232,200,0.85)'
    for (let yy = by + 3; yy < by + bh2 - 2; yy += 5) x.fillRect(bx + 2, yy, bw2 - 4, 1.6)
    x.fillStyle = '#d8cba2'
    x.fillRect(bx + bw2 / 2 - 5, by, 10, bh2)
    x.fillStyle = 'rgba(60,48,24,0.5)'
    x.fillRect(bx, by + bh2 - 2, bw2, 2)
  }
  // wall-to-wall pallets of banded stacks
  for (let col = 0; col < 9; col++) {
    const bx = 60 + col * 200
    const rows = 6 + ((col * 7) % 4)
    for (let row = 0; row < rows; row++) {
      const by = 940 - 54 * (row + 1)
      const tone = row % 2 ? '#5e7a4a' : '#6e8a56'
      brick(bx, by, 168, 50, tone)
    }
  }
  // scattered loose notes on the floor
  const rn = rng(83)
  for (let i = 0; i < 26; i++) {
    x.save()
    x.translate(rn() * (W + OS * 2) - OS, 950 + rn() * 130)
    x.rotate((rn() - 0.5) * 1.2)
    x.fillStyle = '#7a9460'
    x.fillRect(-20, -9, 40, 18)
    x.fillStyle = 'rgba(240,232,200,0.7)'
    x.fillRect(-16, -4, 32, 3)
    x.restore()
  }
  // two warm practicals raking the wall
  for (const lx of [500, 1420]) {
    const lg = x.createRadialGradient(lx, 300, 8, lx, 300, 520)
    lg.addColorStop(0, 'rgba(248,208,130,0.4)')
    lg.addColorStop(1, 'rgba(248,208,130,0)')
    x.fillStyle = lg
    x.fillRect(lx - 520, 0, 1040, 1000)
  }
  return c
}

function barrelsBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#3a3a4a'], [0.5, '#5a5462'], [0.8, '#8a7468'], [1, '#b89878']])
  const hz = x.createLinearGradient(0, 560, 0, 660)
  hz.addColorStop(0, 'rgba(216,200,180,0)')
  hz.addColorStop(1, 'rgba(216,200,180,0.55)')
  x.fillStyle = hz
  x.fillRect(-OS, 540, W + OS * 2, 140)
  mesaLayer(x, W, 640, 30, 70, 17, '#4a3c44', {})
  paintSand(x, W, H + OS, 648, '#a08868', '#8a704f', '#54432f', 37)
  // tarped barrel rows, receding
  for (let row = 0; row < 4; row++) {
    const ry = 720 + row * 78
    const sc = 0.7 + row * 0.16
    for (let i = 0; i < 7 - row; i++) {
      const bx = 240 + i * 210 + row * 60
      const bw = 90 * sc, bh = 96 * sc
      // barrel
      const bg = x.createLinearGradient(bx - bw / 2, 0, bx + bw / 2, 0)
      bg.addColorStop(0, '#2e4a5a'); bg.addColorStop(0.5, '#3e6478'); bg.addColorStop(1, '#243a48')
      x.fillStyle = bg
      x.fillRect(bx - bw / 2, ry - bh, bw, bh)
      x.fillStyle = 'rgba(20,30,36,0.6)'
      x.fillRect(bx - bw / 2, ry - bh + bh * 0.28, bw, 5)
      x.fillRect(bx - bw / 2, ry - bh + bh * 0.62, bw, 5)
      // tarp over the top
      x.fillStyle = '#5a5648'
      x.beginPath()
      x.moveTo(bx - bw * 0.62, ry - bh + 8)
      x.quadraticCurveTo(bx, ry - bh - 26 * sc, bx + bw * 0.62, ry - bh + 8)
      x.lineTo(bx + bw * 0.5, ry - bh + 18 * sc)
      x.lineTo(bx - bw * 0.5, ry - bh + 18 * sc)
      x.closePath()
      x.fill()
      x.strokeStyle = 'rgba(34,32,26,0.5)'
      x.lineWidth = 2
      x.stroke()
    }
  }
  // ground fog bands
  for (const [fy, fh, fa] of [[700, 50, 0.2], [790, 70, 0.16], [900, 90, 0.12]]) {
    const mg = x.createLinearGradient(0, fy - fh / 2, 0, fy + fh / 2)
    mg.addColorStop(0, 'rgba(216,206,188,0)')
    mg.addColorStop(0.5, `rgba(216,206,188,${fa})`)
    mg.addColorStop(1, 'rgba(216,206,188,0)')
    x.fillStyle = mg
    x.fillRect(-OS, fy - fh / 2, W + OS * 2, fh)
  }
  return c
}

function poolBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  // dusk courtyard: warm sky reflection + still pool
  skyGrad(x, W, H, [[0, '#3a2438'], [0.45, '#6e3a44'], [0.75, '#a85a48'], [1, '#d88a58']])
  // patio deck around the pool
  x.fillStyle = '#5a4a3a'
  x.fillRect(-OS, 240, W + OS * 2, H - 240 + OS)
  const rd = rng(29)
  for (let i = 0; i < 30; i++) {
    x.fillStyle = `rgba(30,22,16,${0.12 + rd() * 0.1})`
    x.fillRect(-OS, 280 + i * 34, W + OS * 2, 3)
  }
  // THE POOL: rounded rectangle of still dark water
  const px0 = 260, py0 = 380, pw = 1400, ph = 520
  x.fillStyle = '#8a7a64'
  x.beginPath()
  x.roundRect ? x.roundRect(px0 - 26, py0 - 26, pw + 52, ph + 52, 60) : x.rect(px0 - 26, py0 - 26, pw + 52, ph + 52)
  x.fill()
  const wg = x.createLinearGradient(0, py0, 0, py0 + ph)
  wg.addColorStop(0, '#1c3a44'); wg.addColorStop(0.5, '#16323c'); wg.addColorStop(1, '#0f242c')
  x.fillStyle = wg
  x.beginPath()
  x.roundRect ? x.roundRect(px0, py0, pw, ph, 46) : x.rect(px0, py0, pw, ph)
  x.fill()
  // dusk reflection smear
  const rg = x.createLinearGradient(0, py0, 0, py0 + ph * 0.5)
  rg.addColorStop(0, 'rgba(216,138,88,0.3)')
  rg.addColorStop(1, 'rgba(216,138,88,0)')
  x.fillStyle = rg
  x.beginPath()
  x.roundRect ? x.roundRect(px0, py0, pw, ph * 0.5, 46) : x.rect(px0, py0, pw, ph * 0.5)
  x.fill()
  // coping stones
  x.fillStyle = '#a89478'
  for (let i = 0; i < 12; i++) x.fillRect(px0 - 26 + i * ((pw + 52) / 12), py0 - 34, (pw + 52) / 12 - 6, 12)
  // pool light glow under the surface (bottom-left)
  const plg = x.createRadialGradient(px0 + 200, py0 + ph - 60, 10, px0 + 200, py0 + ph - 60, 340)
  plg.addColorStop(0, 'rgba(120,200,220,0.24)')
  plg.addColorStop(1, 'rgba(120,200,220,0)')
  x.fillStyle = plg
  x.beginPath()
  x.roundRect ? x.roundRect(px0, py0, pw, ph, 46) : x.rect(px0, py0, pw, ph)
  x.fill()
  return c
}

function skylineBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#241430'], [0.4, '#4a2438'], [0.62, '#8a3c38'], [0.78, '#c46a34'], [0.9, '#e89a50'], [1, '#f2b870']])
  const r = rng(67)
  // far row
  let bx = -OS
  while (bx < W + OS) {
    const bw = 40 + r() * 58, bh = 90 + r() * 130
    x.fillStyle = '#2c1c30'
    x.fillRect(bx, 640 - bh, bw, bh + 60)
    bx += bw + 3 + r() * 8
  }
  // near row + lit windows
  bx = -OS - 20
  while (bx < W + OS) {
    const bw = 46 + r() * 66, bh = 140 + r() * 200
    x.fillStyle = '#1c1226'
    x.fillRect(bx, 680 - bh, bw, bh + 80)
    x.fillStyle = 'rgba(240,190,110,0.75)'
    for (let wy = 680 - bh + 10; wy < 640; wy += 16) {
      for (let wx = bx + 5; wx < bx + bw - 7; wx += 11) {
        if (r() > 0.82) x.fillRect(wx, wy, 4, 6)
      }
    }
    bx += bw + 5 + r() * 10
  }
  // THE TOWER lit blue (the empire's skyline signature)
  const tx = 1180, tw = 120, th = 420, ty = 700 - th
  x.fillStyle = '#141a26'
  x.fillRect(tx, ty, tw, th)
  x.fillStyle = 'rgba(99,197,255,0.85)'
  for (let wy = ty + 12; wy < ty + th - 20; wy += 22) {
    for (let wx = tx + 10; wx < tx + tw - 12; wx += 20) {
      if (hash(wx * 3.1 + wy) > 0.4) x.fillRect(wx, wy, 8, 10)
    }
  }
  x.fillStyle = PAL.blue
  x.fillRect(tx + tw / 2 - 3, ty - 90, 6, 90)
  x.fillStyle = '#8fdcff'
  x.beginPath(); x.arc(tx + tw / 2, ty - 94, 6, 0, 7); x.fill()
  // ground glow
  const gg = x.createLinearGradient(0, 640, 0, 760)
  gg.addColorStop(0, 'rgba(242,184,112,0.35)')
  gg.addColorStop(1, 'rgba(242,184,112,0)')
  x.fillStyle = gg
  x.fillRect(-OS, 620, W + OS * 2, 180)
  return c
}

// S9 night desert finale: moon + stars + parked RV + lantern (pull-up reveals
// the crystal star field live).
function finaleBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#05070f'], [0.5, '#0a0f1e'], [0.82, '#131c30'], [1, '#1c2438']])
  // stars
  for (let i = 0; i < 130; i++) {
    x.fillStyle = `rgba(220,230,246,${0.2 + hash(i * 3.1) * 0.55})`
    x.fillRect(hash(i * 7.7) * (W + OS * 2) - OS, hash(i * 5.3) * 480 - OS, 2, 2)
  }
  // moon high left
  const mx = 420, my = 220
  const mh = x.createRadialGradient(mx, my, 20, mx, my, 300)
  mh.addColorStop(0, 'rgba(226,222,204,0.35)')
  mh.addColorStop(1, 'rgba(226,222,204,0)')
  x.fillStyle = mh
  x.fillRect(mx - 320, my - 320, 640, 640)
  x.fillStyle = '#ded8c2'
  x.beginPath(); x.arc(mx, my, 52, 0, 7); x.fill()
  x.fillStyle = '#c8c2aa'
  x.beginPath(); x.arc(mx + 14, my + 10, 42, 0, 7); x.fill()
  x.fillStyle = '#d6d0ba'
  x.beginPath(); x.arc(mx + 8, my + 4, 44, 0, 7); x.fill()
  // far mesa silhouette
  mesaLayer(x, W, 600, 40, 90, 91, '#100e18', {})
  // night sand
  const sg = x.createLinearGradient(0, 596, 0, H + OS)
  sg.addColorStop(0, '#2a2620'); sg.addColorStop(0.5, '#201c17'); sg.addColorStop(1, '#151210')
  x.fillStyle = sg
  x.fillRect(-OS, 596, W + OS * 2, H - 596 + OS * 2)
  const rs = rng(53)
  for (let i = 0; i < 60; i++) {
    x.fillStyle = `rgba(60,52,40,${0.2 + rs() * 0.2})`
    x.beginPath()
    x.ellipse(-OS + rs() * (W + OS * 2), 660 + rs() * 380, 16 + rs() * 50, 4 + rs() * 10, 0, 0, 7)
    x.fill()
  }
  // moonlit wash
  const ml = x.createLinearGradient(0, 600, 0, 900)
  ml.addColorStop(0, 'rgba(190,196,214,0.1)')
  ml.addColorStop(1, 'rgba(190,196,214,0)')
  x.fillStyle = ml
  x.fillRect(-OS, 600, W + OS * 2, 320)
  // the parked RV (small, mid-frame) + its shadow
  rv(x, 1210, 700, 0.5, 0, { moving: 0 })
  x.fillStyle = 'rgba(6,5,4,0.4)'
  x.beginPath(); x.ellipse(1180, 706, 130, 16, 0, 0, 7); x.fill()
  // camp lantern by the RV door (clear of the hero's mark at x 1150)
  const lx = 1032, ly = 692
  x.strokeStyle = '#3a3428'
  x.lineWidth = 4
  x.beginPath(); x.moveTo(lx, ly); x.lineTo(lx, ly - 46); x.stroke()
  x.fillStyle = '#ffca6e'
  x.beginPath(); x.arc(lx, ly - 54, 9, 0, 7); x.fill()
  const lg = x.createRadialGradient(lx, ly - 54, 3, lx, ly - 54, 160)
  lg.addColorStop(0, 'rgba(255,202,110,0.45)')
  lg.addColorStop(1, 'rgba(255,202,110,0)')
  x.fillStyle = lg
  x.fillRect(lx - 160, ly - 214, 320, 320)
  return c
}

// ============================== build (called once from prepare) ==============================
export async function build() {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('600 40px "Space Grotesk"'),
        document.fonts.load('400 96px Anton'),
        document.fonts.load('600 30px "JetBrains Mono"'),
      ])
      await document.fonts.ready
    } catch {}
  }
  return {
    desert: desertBake(),
    classroom: classroomBake(),
    bathroom: bathroomBake(),
    lab: labBake(),
    dinerFront: dinerFrontBake(),
    dinerBack: dinerBackBake(),
    warehouse: warehouseBake(),
    cash: cashBake(),
    barrels: barrelsBake(),
    pool: poolBake(),
    skyline: skylineBake(),
    night: finaleBake(),
  }
}
