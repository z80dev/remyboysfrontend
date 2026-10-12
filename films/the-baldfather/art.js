// THE BALDFATHER art: prepare-time bakes + pure per-frame painters. New Flow City, 1947:
// a dark wood study, a moonlit bedroom, the Chapel of the Flow, and the crimson wig — the
// star prop. Warm amber-sepia grade, one coherent left-window key light, sprites drawn
// nearest 2–3× on painted sets (the house style). Everything deterministic (hash, no Math.random).
import { W, H, hash, seg, lerp } from 'filmkit/lib.js'
import { canvas } from '../remy-bros/art.js'

const TAU = Math.PI * 2
const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)

// Shared geometry (film.js positions actors and props against these).
export const STUDY = {
  desk: { x0: 660, x1: 1360, top: 606, lip: 672, front: 962 },
  wigDesk: { x: 952, y: 634 },
  lamp: { x: 1188, y: 452 },
  phone: { x: 742, y: 596 },
  door: { x0: 1704, x1: 1902, top: 244, sill: 802 },
  don: { x: 968, feet: 806, s: 2.62 },
}
export const BED = {
  vitoX: 878, vitoFeet: 852, vitoS: 2.4,
  duvet: { x0: 905, y0: 744, w: 730, h: 198 },
  flow: { x: 1164, y: 782 },
}
export const CHAPEL = {
  hero: { x: 962, feet: 868, s: 2.7 },
  priest: { x: 1188, feet: 852, s: 2.6 },
  window: { cx: 960, cy: 320 },
  censer: { x: 1352, y: 118 },
}

// ---------- rig tinting (local copies of the silhouette patterns) ----------
// Solid-colour silhouette: swap .c, keep the pose rig.
export function tintRig(R, color) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color
  x.fillRect(0, 0, R.w, R.h)
  return { ...R, c, sil: R.sil }
}
// Near-black silhouette that keeps a breath of detail + two pale eye pixels (fedora bait).
export function darkRig(R, tone = '#07070c', keep = 0.16) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  x.globalCompositeOperation = 'source-atop'
  x.globalAlpha = 1 - keep
  x.fillStyle = tone
  x.fillRect(0, 0, R.w, R.h)
  x.globalAlpha = 1
  x.globalCompositeOperation = 'source-over'
  const ey = R.top + 30
  const row = x.getImageData(0, ey, R.w, 1).data
  let l = -1, r = -1
  for (let xx = 0; xx < R.w; xx++) if (row[xx * 4 + 3] > 60) { if (l < 0) l = xx; r = xx }
  if (l >= 0 && r > l + 8) {
    const cx = (l + r) / 2, dx = Math.max(4, (r - l) * 0.17)
    x.fillStyle = 'rgba(214,216,200,0.85)'
    x.fillRect(Math.round(cx - dx), ey, 2, 2)
    x.fillRect(Math.round(cx + dx), ey, 2, 2)
  }
  return { ...R, c, sil: R.sil }
}
// The razor's work: flood the hair component from the crown, repaint the scalp with the
// sprite's own skin ramp, erase the falling tresses below the chin. Returns chin (last
// scalp row) so the mirror close-up can crop the bald head.
export function baldify(R) {
  const w = R.w, h = R.h
  const c = canvas(w, h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const img = x.getImageData(0, 0, w, h), d = img.data
  const al = (xx, yy) => (xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : d[(yy * w + xx) * 4 + 3])
  const isHair = (i) => {
    if (d[i * 4 + 3] === 0) return false
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]
    return r > 60 && g > 60 && Math.abs(r - g) < 46 && b < Math.min(r, g) * 0.62
  }
  // flood fill the flow from crown seeds
  const comp = new Uint8Array(w * h)
  const stack = []
  for (let xx = Math.floor(w * 0.28); xx < Math.floor(w * 0.72); xx++)
    for (let yy = R.top; yy < R.top + 16; yy++)
      if (isHair(yy * w + xx)) { stack.push(yy * w + xx); comp[yy * w + xx] = 1 }
  while (stack.length) {
    const p = stack.pop(), py = Math.floor(p / w), px2 = p - py * w
    for (const [nx, ny] of [[px2 - 1, py], [px2 + 1, py], [px2, py - 1], [px2, py + 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const q = ny * w + nx
      if (!comp[q] && isHair(q)) { comp[q] = 1; stack.push(q) }
    }
  }
  // chin = last row that still carries FACE skin in the centre third (not the hair)
  const isSkin = (i) => {
    if (d[i * 4 + 3] === 0) return false
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]
    return r > 50 && r > b && r < 235 && g > 30 && g < 180
  }
  let chin = R.top + 40
  for (let yy = R.top + 20; yy < R.top + 80; yy++) {
    let n = 0
    for (let xx = Math.floor(w * 0.34); xx < Math.floor(w * 0.66); xx++) {
      if (isSkin(yy * w + xx) || comp[yy * w + xx] && yy < R.top + 40) n++
    }
    if (n >= 6) chin = yy
  }
  // skin ramp sampled from the face rows, darkest → brightest
  const skins = []
  for (let yy = R.top + 24; yy <= R.top + 46; yy++)
    for (let xx = Math.floor(w * 0.32); xx < Math.floor(w * 0.68); xx++) {
      const i = yy * w + xx
      if (d[i * 4 + 3] === 0 || comp[i]) continue
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]
      if (r > 40 && r > b && r < 230) skins.push([r, g, b])
    }
  skins.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))
  const q = (f) => skins[Math.min(skins.length - 1, Math.floor(f * skins.length))] ?? [142, 98, 62]
  const lo = q(0.12), mid = q(0.52), hi = q(0.92)
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      const p = yy * w + xx
      if (!comp[p]) continue
      const i = p * 4
      if (yy > chin) { d[i + 3] = 0; continue } // the tresses go to the pillow, not the shoulders
      const u = (yy - R.top) / Math.max(1, chin - R.top)
      let col = mid
      if (u < 0.07 || u > 0.92) col = lo
      const dxn = (xx - w / 2) / (w * 0.3), dyn = (yy - R.top - 15) / 22 // crown shine, lit from the left
      if (xx < w / 2 && dxn * dxn + dyn * dyn < 1) col = hi
      const edge = al(xx - 1, yy) === 0 || al(xx + 1, yy) === 0 || al(xx, yy - 1) === 0 || al(xx, yy + 1) === 0
      if (edge) col = [Math.round(lo[0] * 0.55), Math.round(lo[1] * 0.5), Math.round(lo[2] * 0.55)]
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]
    }
  // the tresses go to the pillow, not the shoulders: erase any hair left below the face
  for (let yy = R.top + 30; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      const p = yy * w + xx
      if (comp[p] || !isHair(p)) continue
      d[p * 4 + 3] = 0
    }
  // face zone: dark leftover clumps hanging outside the face silhouette go (eye corners stay clean;
  // temple tufts above this band survive and read as razor-skip)
  for (let yy = R.top + 36; yy <= Math.min(chin, R.top + 58); yy++) {
    let fl = -1, fr = -1
    for (let xx = 0; xx < w; xx++) {
      const i = (yy * w + xx) * 4
      if (d[i + 3] === 0) continue
      const r = d[i], g = d[i + 1], b = d[i + 2]
      if (r > 80 && r > b && g > 40) { if (fl < 0) fl = xx; fr = xx }
    }
    if (fl < 0) continue
    for (let xx = 0; xx < w; xx++) {
      if (xx >= fl - 2 && xx <= fr + 2) continue
      const i = (yy * w + xx) * 4
      if (d[i + 3] === 0) continue
      if (d[i] + d[i + 1] + d[i + 2] < 400) d[i + 3] = 0
    }
  }
  // clean stray outline filaments left where tresses were erased
  for (let pass = 0; pass < 6; pass++)
    for (let yy = 1; yy < h - 1; yy++)
      for (let xx = 1; xx < w - 1; xx++) {
        const i = (yy * w + xx) * 4
        if (d[i + 3] === 0) continue
        const lum = d[i] + d[i + 1] + d[i + 2]
        const gone = (al(xx - 1, yy) === 0) + (al(xx + 1, yy) === 0) + (al(xx, yy - 1) === 0) + (al(xx, yy + 1) === 0)
        if (lum < 150 && gone >= 2) d[i + 3] = 0
      }
  x.putImageData(img, 0, 0)
  const sil = canvas(w, h), sx = sil.getContext('2d')
  sx.drawImage(c, 0, 0)
  sx.globalCompositeOperation = 'source-in'
  sx.fillStyle = '#fff'
  sx.fillRect(0, 0, w, h)
  return { ...R, c, sil, chin }
}
// Big nearest-upscaled crop of the bald head for the mirror close-up.
export function baldHead(bald, k = 5) {
  const y0 = Math.max(0, bald.top - 4), y1 = Math.min(bald.h, bald.chin + 8)
  const c = canvas(Math.round(bald.w * k), Math.round((y1 - y0) * k)), x = c.getContext('2d')
  x.imageSmoothingEnabled = false
  x.drawImage(bald.c, 0, y0, bald.w, y1 - y0, 0, 0, c.width, c.height)
  return { c, w: c.width, h: c.height, k }
}
// Tint any small canvas solid (wedding-guest cut-outs in the study window).
export function tintCanvas(src, color) {
  const c = canvas(src.width, src.height), x = c.getContext('2d')
  x.drawImage(src, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color
  x.fillRect(0, 0, c.width, c.height)
  return c
}

// ---------- small painters ----------
function rr(x, px, py, w2, h2, r) {
  x.beginPath()
  x.roundRect(px, py, w2, h2, r)
}
function glowDot(x, cx, cy, r, rgbS, a) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, `rgba(${rgbS},${a})`)
  g.addColorStop(1, `rgba(${rgbS},0)`)
  x.fillStyle = g
  x.fillRect(cx - r, cy - r, r * 2, r * 2)
}
// Four-point star glint (k 0..1).
export function star4(x, cx, cy, r, k) {
  if (k <= 0 || k >= 1) return
  x.save()
  x.translate(cx, cy)
  x.globalAlpha = Math.sin(k * Math.PI)
  x.fillStyle = '#fff6d8'
  const s = r * (0.35 + 0.65 * Math.sin(k * Math.PI))
  x.beginPath()
  x.moveTo(0, -s); x.quadraticCurveTo(2, -2, s, 0); x.quadraticCurveTo(2, 2, 0, s)
  x.quadraticCurveTo(-2, 2, -s, 0); x.quadraticCurveTo(-2, -2, 0, -s)
  x.closePath(); x.fill()
  x.restore()
}

// ============================== THE WIG — the star prop ==============================
// Long 3-tress wig, side-parted cap, filled hair locks with highlight ramps, sway
// -1.2..1.2. Design width 160 at (x, y) = crown centre; opts.tint 'gold' = VITO's flow.
const WIG_RAMPS = {
  crimson: { capHi: '#8e2434', cap: '#6e1420', capLo: '#430912', shadow: '#5e0c1a', base: '#921a28', light: '#bc3c44', hi: '#ef7a74', part: '#2e060c' },
  gold: { capHi: '#e8c266', cap: '#b8891e', capLo: '#7a5610', shadow: '#8a6414', base: '#c99e2c', light: '#e8bc50', hi: '#f9e6a0', part: '#57390a' },
}
export function wig(x, cx, cy, w, rot, sway, opts = {}) {
  const C = WIG_RAMPS[opts.tint === 'gold' ? 'gold' : 'crimson']
  const s = w / 160
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(s, s)
  x.lineCap = 'round'
  const sw = sway * 30
  // a filled hair lock: wide at the root, tapering to a rounded tip that sways
  const lock = (sx, len, spread, tipDX, col) => {
    x.fillStyle = col
    x.beginPath()
    x.moveTo(sx - spread, -8)
    x.bezierCurveTo(sx - spread * 1.12 + tipDX * 0.3, len * 0.38, sx - spread * 0.62 + tipDX * 0.75, len * 0.76, sx - spread * 0.3 + tipDX, len)
    x.quadraticCurveTo(sx + tipDX, len + 15, sx + spread * 0.3 + tipDX, len)
    x.bezierCurveTo(sx + spread * 0.62 + tipDX * 0.75, len * 0.76, sx + spread * 1.12 + tipDX * 0.3, len * 0.38, sx + spread, -8)
    x.closePath()
    x.fill()
  }
  // strand ridge inside a lock, for texture
  const ridge = (sx, len, off, tipDX, col, lw, a = 1) => {
    x.save()
    x.globalAlpha *= a
    x.strokeStyle = col
    x.lineWidth = lw
    x.beginPath()
    x.moveTo(sx + off, -6)
    x.bezierCurveTo(sx + off * 1.1 + tipDX * 0.3, len * 0.4, sx + off * 0.7 + tipDX * 0.75, len * 0.74, sx + off * 0.4 + tipDX, len * 0.96)
    x.stroke()
    x.restore()
  }
  // back mass first, then the pair framing the face
  lock(0, 206, 32, sw, C.shadow)
  lock(-36, 170, 26, sw * 0.9, C.shadow)
  lock(36, 170, 26, sw * 0.9, C.shadow)
  lock(0, 198, 27, sw, C.base)
  lock(-38, 164, 22, sw * 0.85, C.base)
  lock(38, 164, 22, sw * 0.85, C.base)
  // light ridges + sparse highlights
  for (const [sx, len, td] of [[-38, 160, sw * 0.85], [38, 160, sw * 0.85]]) {
    ridge(sx, len, -10, td, C.light, 8)
    ridge(sx, len, 8, td, C.light, 6)
  }
  ridge(0, 194, -9, sw, C.light, 8)
  ridge(0, 194, 9, sw, C.light, 6)
  ridge(-40, 154, -4, sw * 0.85, C.hi, 4, 0.8)
  ridge(38, 154, 2, sw * 0.85, C.hi, 3.5, 0.8)
  ridge(-2, 188, 0, sw, C.hi, 4, 0.75)
  // cap over the roots: dome + side part + rim light
  const g = x.createLinearGradient(-44, -52, 34, 16)
  g.addColorStop(0, C.capHi)
  g.addColorStop(0.55, C.cap)
  g.addColorStop(1, C.capLo)
  x.fillStyle = g
  x.beginPath()
  x.ellipse(-3, -18, 42, 36, 0, 0, TAU)
  x.fill()
  x.strokeStyle = C.part
  x.lineWidth = 3.5
  x.beginPath()
  x.moveTo(-13, -52)
  x.quadraticCurveTo(-17, -32, -11, -2)
  x.stroke()
  x.strokeStyle = 'rgba(255,235,210,0.30)'
  x.lineWidth = 5
  x.beginPath()
  x.arc(-7, -20, 34, Math.PI * 1.08, Math.PI * 1.6)
  x.stroke()
  x.restore()
}
// Small toupee / rug for Cabald heads (distinct from the star wig).
export function toupee(x, cx, cy, w, col = '#2c1c10', rot = 0) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(w / 120, w / 120)
  x.fillStyle = col
  x.beginPath()
  x.ellipse(0, 0, 60, 26, 0, 0, TAU)
  x.fill()
  x.beginPath() // fringe scallops
  for (let i = 0; i < 4; i++) x.ellipse(-38 + i * 25, 16, 16, 9, 0, 0, TAU)
  x.fill()
  x.strokeStyle = 'rgba(255,240,210,0.16)'
  x.lineWidth = 4
  x.beginPath()
  x.arc(-8, -4, 48, Math.PI * 1.15, Math.PI * 1.55)
  x.stroke()
  x.restore()
}
// Brim + band fedora, drawn ABOVE a sprite's head. (x, y) = band centre.
export function fedora(x, cx, cy, w, color = '#12111a') {
  x.save()
  x.translate(cx, cy)
  const s = w / 150
  x.scale(s, s)
  x.fillStyle = color
  x.beginPath()
  x.ellipse(0, 0, 76, 17, 0, 0, TAU)
  x.fill()
  x.beginPath()
  x.moveTo(-42, -3)
  x.bezierCurveTo(-48, -54, 48, -54, 42, -3)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(0,0,0,0.38)'
  x.beginPath()
  x.ellipse(0, -42, 27, 9, 0, 0, TAU)
  x.fill()
  x.fillRect(-44, -14, 88, 12)
  x.strokeStyle = 'rgba(200,205,220,0.14)'
  x.lineWidth = 5
  x.beginPath()
  x.arc(-6, -20, 40, Math.PI * 1.1, Math.PI * 1.5)
  x.stroke()
  x.restore()
}
// Small procedural hand (palm + fingers along +x).
export function hand(x, cx, cy, s, opts = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(opts.rot ?? 0)
  x.scale(s * (opts.flip ? -1 : 1), s)
  const skin = opts.skin ?? '#caa287'
  x.fillStyle = skin
  x.beginPath()
  x.ellipse(0, 0, 17, 12, 0, 0, TAU)
  x.fill()
  for (let i = 0; i < 4; i++) {
    rr(x, 8 + i * 1.5, -11 + i * 6.4, 20 - Math.abs(i - 1) * 3, 6.4, 3.2)
    x.fill()
  }
  x.beginPath()
  x.ellipse(-6, -12, 7, 11, -0.5, 0, TAU)
  x.fill()
  x.fillStyle = 'rgba(60,30,16,0.25)'
  x.fillRect(4, -2, 16, 3)
  x.restore()
}
// Doctor's-bag scissors case (enforcer 2 carries it).
export function bagCase(x, cx, cy, s) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  x.fillStyle = '#3a2416'
  rr(x, -30, -34, 60, 40, 9)
  x.fill()
  x.fillStyle = '#241408'
  rr(x, -30, -8, 60, 14, 4)
  x.fill()
  x.strokeStyle = '#181008'
  x.lineWidth = 4
  x.beginPath()
  x.arc(0, -34, 12, Math.PI, 0)
  x.stroke()
  x.fillStyle = '#b9a06a'
  x.fillRect(-8, -22, 5, 6)
  x.fillRect(4, -22, 5, 6)
  x.restore()
}
// Wig stand (S4: the prize waiting on the desk).
export function wigStand(x, cx, cy, s) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  x.fillStyle = '#171009'
  x.beginPath()
  x.ellipse(0, 26, 26, 7, 0, 0, TAU)
  x.fill()
  x.fillRect(-4, -12, 8, 38)
  x.fillStyle = '#2c1d10'
  x.beginPath()
  x.ellipse(0, -16, 20, 18, 0, 0, TAU)
  x.fill()
  x.restore()
}
// Steel scissor snip: two thin blades closing once + a glint (k 0..1 life).
export function snipGlint(x, cx, cy, k) {
  if (k <= 0 || k >= 1) return
  x.save()
  x.translate(cx, cy)
  x.rotate(-0.5)
  const openA = 0.16 + 0.5 * Math.abs(Math.sin(k * Math.PI * 2))
  x.strokeStyle = `rgba(215,225,240,${0.9 * (k < 0.7 ? 1 : (1 - k) / 0.3)})`
  x.lineWidth = 4
  for (const sgn of [-1, 1]) {
    x.beginPath()
    x.moveTo(0, 0)
    x.lineTo(sgn * 58 * Math.cos(openA), sgn * 58 * Math.sin(openA) - 20)
    x.stroke()
  }
  x.fillStyle = '#0d0c12'
  x.beginPath()
  x.arc(0, 0, 5, 0, TAU)
  x.fill()
  x.restore()
  star4(x, cx + 4, cy - 8, 46, k)
}
// Wine glass for the consiglieri toast; raise 0..1 lifts it to the clink.
export function toastGlass(x, cx, cy, s, raise) {
  x.save()
  x.translate(cx - raise * 12, cy - raise * 66)
  x.scale(s, s)
  x.strokeStyle = 'rgba(220,230,240,0.5)'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(0, 26)
  x.lineTo(0, 6)
  x.stroke()
  x.fillStyle = 'rgba(220,230,240,0.4)'
  x.beginPath()
  x.ellipse(0, 28, 13, 4, 0, 0, TAU)
  x.fill()
  x.fillStyle = '#6e1a24'
  x.beginPath()
  x.moveTo(-12, -14)
  x.quadraticCurveTo(0, -6, 12, -14)
  x.lineTo(10, 4)
  x.quadraticCurveTo(0, 9, -10, 4)
  x.closePath()
  x.fill()
  x.strokeStyle = 'rgba(230,238,246,0.55)'
  x.lineWidth = 2.5
  x.beginPath()
  x.moveTo(-12, -14)
  x.quadraticCurveTo(0, -6, 12, -14)
  x.lineTo(10, 4)
  x.quadraticCurveTo(0, 9, -10, 4)
  x.closePath()
  x.stroke()
  x.restore()
}
// Halo of stubble dots around a freshly bared scalp + shine (the reveal read).
export function stubbleHalo(x, cx, cy, r, k) {
  if (k <= 0) return
  x.save()
  x.globalAlpha = k
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * 1.02 + (i / 25) * Math.PI * 0.96
    x.fillStyle = i % 3 ? 'rgba(214,206,188,0.8)' : 'rgba(160,150,130,0.8)'
    x.fillRect(cx + Math.cos(a) * r * 1.04, cy + Math.sin(a) * r * 1.04, 3, 3)
  }
  x.fillStyle = 'rgba(255,244,220,0.30)'
  x.beginPath()
  x.ellipse(cx - r * 0.3, cy - r * 0.42, r * 0.34, r * 0.2, -0.5, 0, TAU)
  x.fill()
  x.restore()
}

// ============================== S1/S4 — THE STUDY ==============================
// Wall + window + bookshelf + rug + door frame (panel drawn per frame) + chair back.
// The desk is a separate bake so the Don can sit behind it.
export function studyBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  // wall
  const g = x.createLinearGradient(0, 0, 0, 820)
  g.addColorStop(0, '#140d07')
  g.addColorStop(0.55, '#221507')
  g.addColorStop(1, '#1a1108')
  x.fillStyle = g
  x.fillRect(0, 0, W, 820)
  for (let px2 = 40; px2 < W; px2 += 160) {
    x.fillStyle = 'rgba(0,0,0,0.16)'
    x.fillRect(px2, 0, 3, 820)
    x.fillStyle = 'rgba(214,164,96,0.04)'
    x.fillRect(px2 + 3, 0, 2, 820)
  }
  // picture rail + a small dim portrait
  x.fillStyle = '#0d0805'
  x.fillRect(0, 206, W, 12)
  x.fillStyle = 'rgba(214,164,96,0.06)'
  x.fillRect(0, 218, W, 3)
  x.fillStyle = '#0b0704'
  x.fillRect(540, 244, 108, 132)
  x.strokeStyle = '#33210f'
  x.lineWidth = 7
  x.strokeRect(543, 247, 102, 126)
  x.fillStyle = 'rgba(214,170,110,0.07)'
  x.beginPath()
  x.ellipse(594, 306, 26, 34, 0, 0, TAU)
  x.fill()
  // wainscot
  x.fillStyle = '#0f0a05'
  x.fillRect(0, 636, W, 164)
  x.fillStyle = 'rgba(224,170,100,0.09)'
  x.fillRect(0, 636, W, 4)
  for (let px2 = 24; px2 < W; px2 += 118) {
    x.fillStyle = 'rgba(0,0,0,0.4)'
    x.fillRect(px2, 648, 8, 140)
    x.fillStyle = 'rgba(224,170,100,0.05)'
    x.fillRect(px2 + 10, 650, 96, 66)
    x.fillStyle = 'rgba(0,0,0,0.35)'
    x.fillRect(px2 + 10, 722, 96, 4)
  }
  x.fillStyle = 'rgba(0,0,0,0.5)'
  x.fillRect(0, 792, W, 10)
  // floor boards
  for (let i = 0; i < 15; i++) {
    const fy = 802 + i * (14 + i * 1.6)
    x.fillStyle = `rgb(${26 - i},${17 - Math.floor(i / 2)},${9})`
    x.fillRect(0, fy, W, 12 + i * 1.6)
    x.fillStyle = 'rgba(0,0,0,0.35)'
    x.fillRect(0, fy, W, 2)
  }
  // rug
  x.save()
  x.translate(960, 948)
  x.fillStyle = '#341009'
  x.beginPath()
  x.ellipse(0, 0, 500, 118, 0, 0, TAU)
  x.fill()
  x.strokeStyle = '#5a2a14'
  x.lineWidth = 6
  x.beginPath()
  x.ellipse(0, 0, 486, 108, 0, 0, TAU)
  x.stroke()
  x.lineWidth = 3
  x.beginPath()
  x.ellipse(0, 0, 452, 96, 0, 0, TAU)
  x.stroke()
  x.globalAlpha = 0.12
  x.strokeStyle = '#8a4a20'
  x.lineWidth = 8
  for (let i = 0; i < 7; i++) {
    const dx = -330 + i * 110
    x.beginPath()
    x.moveTo(dx, -58)
    x.lineTo(dx + 40, 0)
    x.lineTo(dx, 58)
    x.stroke()
  }
  x.restore()
  // ---- the tall window, LEFT: muffled wedding outside ----
  x.fillStyle = '#0c0703'
  x.beginPath()
  x.moveTo(150, 656)
  x.lineTo(150, 236)
  x.quadraticCurveTo(150, 116, 302, 112)
  x.quadraticCurveTo(452, 116, 452, 236)
  x.lineTo(452, 656)
  x.closePath()
  x.fill()
  const wg = x.createLinearGradient(170, 120, 430, 640)
  wg.addColorStop(0, '#ffd08e')
  wg.addColorStop(0.5, '#f0a04e')
  wg.addColorStop(1, '#a4501c')
  x.fillStyle = wg
  x.beginPath()
  x.moveTo(166, 642)
  x.lineTo(166, 238)
  x.quadraticCurveTo(166, 132, 302, 128)
  x.quadraticCurveTo(436, 132, 436, 238)
  x.lineTo(436, 642)
  x.closePath()
  x.fill()
  x.save() // clip glass for bokeh + guests
  x.beginPath()
  x.moveTo(166, 642)
  x.lineTo(166, 238)
  x.quadraticCurveTo(166, 132, 302, 128)
  x.quadraticCurveTo(436, 132, 436, 238)
  x.lineTo(436, 642)
  x.closePath()
  x.clip()
  for (let i = 0; i < 9; i++) { // festivity bokeh
    const bx = 180 + hash(i * 13 + 4) * 240, by = 150 + hash(i * 29 + 8) * 260
    glowDot(x, bx, by, 14 + hash(i * 7) * 20, '255,224,164', 0.16 + hash(i * 3) * 0.14)
  }
  // mandolin-lantern string + guests
  x.strokeStyle = 'rgba(60,26,10,0.55)'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(170, 190)
  x.quadraticCurveTo(300, 260, 434, 176)
  x.stroke()
  for (let i = 0; i < 6; i++) {
    const u = (i + 0.5) / 6
    const lx = lerp(170, 434, u), ly = lerp(190, 176, u) + Math.sin(Math.PI * u) * 52
    glowDot(x, lx, ly + 8, 12, '255,214,140', 0.5)
    x.fillStyle = '#ffe2a8'
    x.beginPath()
    x.arc(lx, ly, 5, 0, TAU)
    x.fill()
  }
  x.fillStyle = 'rgba(52,22,8,0.72)' // distant wedding guests, heads + shoulders
  for (const gx of [236, 300, 372]) {
    x.beginPath()
    x.arc(gx, 590, 17, 0, TAU)
    x.fill()
    x.fillRect(gx - 26, 606, 52, 40)
  }
  x.fillStyle = 'rgba(255,240,200,0.1)' // glass sheen
  x.beginPath()
  x.moveTo(200, 130)
  x.lineTo(260, 130)
  x.lineTo(190, 640)
  x.lineTo(168, 640)
  x.closePath()
  x.fill()
  x.restore()
  // muntins + frame + sill
  x.strokeStyle = '#0c0703'
  x.lineWidth = 10
  x.beginPath()
  x.moveTo(301, 126)
  x.lineTo(301, 646)
  x.moveTo(166, 300)
  x.lineTo(436, 300)
  x.moveTo(166, 420)
  x.lineTo(436, 420)
  x.moveTo(166, 540)
  x.lineTo(436, 540)
  x.stroke()
  x.strokeStyle = '#1c1006'
  x.lineWidth = 16
  x.beginPath()
  x.moveTo(150, 656)
  x.lineTo(150, 236)
  x.quadraticCurveTo(150, 116, 302, 112)
  x.quadraticCurveTo(452, 116, 452, 236)
  x.lineTo(452, 656)
  x.stroke()
  x.fillStyle = '#241408'
  x.fillRect(134, 652, 334, 20)
  x.fillStyle = 'rgba(255,214,150,0.16)'
  x.fillRect(134, 652, 334, 4)
  // curtain drapes both sides
  for (const [dx, dw] of [[126, 30], [452, 34]]) {
    const cg = x.createLinearGradient(dx, 0, dx + dw, 0)
    cg.addColorStop(0, '#0a0502')
    cg.addColorStop(1, '#1a0f06')
    x.fillStyle = cg
    x.fillRect(dx, 96, dw, 580)
    x.fillStyle = 'rgba(0,0,0,0.4)'
    for (let fy = 110; fy < 660; fy += 26) x.fillRect(dx + 4, fy, dw - 8, 3)
  }
  // ---- warm window light raking right: venetian slats across wall + desk zone ----
  x.save()
  for (let k = 0; k < 6; k++) {
    const y0 = 168 + k * 58
    const g2 = x.createLinearGradient(440, 0, 1660, 0)
    g2.addColorStop(0, 'rgba(255,214,150,0.10)')
    g2.addColorStop(0.75, 'rgba(255,206,138,0.05)')
    g2.addColorStop(1, 'rgba(255,206,138,0.015)')
    x.fillStyle = g2
    x.beginPath()
    x.moveTo(440, y0)
    x.lineTo(1660, y0 + 202)
    x.lineTo(1660, y0 + 230)
    x.lineTo(440, y0 + 30)
    x.closePath()
    x.fill()
  }
  x.restore()
  // ---- bookshelf, right of the door ----
  x.fillStyle = '#0d0805'
  x.fillRect(1424, 150, 246, 646)
  x.fillStyle = '#1c1108'
  x.fillRect(1436, 162, 222, 622)
  for (let s2 = 0; s2 < 4; s2++) {
    const sy2 = 262 + s2 * 130
    x.fillStyle = '#0a0603'
    x.fillRect(1436, sy2, 222, 12)
    let bx = 1444
    let i = 0
    while (bx < 1640) {
      const bw = 12 + Math.floor(hash(300 + s2 * 60 + i) * 16)
      const bh = 62 + Math.floor(hash(311 + s2 * 60 + i) * 34)
      const tone = hash(323 + s2 * 60 + i)
      x.fillStyle = tone > 0.7 ? '#4a2a16' : tone > 0.4 ? '#33200f' : '#22160c'
      x.fillRect(bx, sy2 - bh, bw, bh)
      x.fillStyle = 'rgba(255,214,150,0.10)'
      x.fillRect(bx, sy2 - bh, bw, 4)
      if (hash(337 + i * 3) > 0.75) {
        x.fillStyle = 'rgba(214,170,110,0.14)'
        x.fillRect(bx + 2, sy2 - bh + 14, bw - 4, 3)
      }
      bx += bw + 3
      i++
    }
  }
  // ---- door frame, RIGHT (panel drawn per frame) ----
  x.fillStyle = '#0c0703'
  x.fillRect(1688, 228, 216, 590)
  x.fillStyle = '#050302'
  x.fillRect(1704, 244, 184, 558)
  x.strokeStyle = '#2c1a0c'
  x.lineWidth = 6
  x.strokeRect(1707, 247, 178, 552)
  x.fillStyle = '#241408'
  x.fillRect(1688, 806, 216, 18)
  x.fillStyle = 'rgba(255,214,150,0.10)'
  x.fillRect(1688, 806, 216, 4)
  // ---- the Don's high-back chair, behind the desk line ----
  x.fillStyle = '#140c06'
  x.beginPath()
  x.moveTo(868, 620)
  x.lineTo(868, 476)
  x.quadraticCurveTo(868, 448, 900, 448)
  x.lineTo(1036, 448)
  x.quadraticCurveTo(1068, 448, 1068, 476)
  x.lineTo(1068, 620)
  x.closePath()
  x.fill()
  x.strokeStyle = 'rgba(224,170,100,0.10)'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(878, 610)
  x.lineTo(878, 480)
  x.quadraticCurveTo(878, 458, 902, 458)
  x.lineTo(1034, 458)
  x.quadraticCurveTo(1058, 458, 1058, 480)
  x.lineTo(1058, 610)
  x.stroke()
  for (let i = 0; i < 5; i++) {
    x.fillStyle = 'rgba(214,170,110,0.16)'
    x.beginPath()
    x.arc(888 + i * 38, 470, 3, 0, TAU)
    x.fill()
  }
  // lamp glow washing the wall behind the desk (pool flicker drawn live)
  glowDot(x, STUDY.lamp.x, STUDY.lamp.y + 90, 300, '255,190,110', 0.14)
  glowDot(x, STUDY.lamp.x, STUDY.lamp.y + 150, 180, '255,200,120', 0.12)
  // skirting shadow
  const vg = x.createLinearGradient(0, 0, 0, 150)
  vg.addColorStop(0, 'rgba(0,0,0,0.5)')
  vg.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = vg
  x.fillRect(0, 0, W, 150)
  return c
}
// The desk: separate bake so actors can sit behind it. Phone, lamp, papers, glass.
export function deskBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  const { x0, x1, top, lip, front } = STUDY.desk
  // top face
  x.fillStyle = '#3a2410'
  x.fillRect(x0, top, x1 - x0, lip - top)
  x.fillStyle = 'rgba(255,214,150,0.14)'
  x.fillRect(x0, top, x1 - x0, 5)
  x.fillStyle = 'rgba(0,0,0,0.3)'
  for (let px2 = x0 + 40; px2 < x1; px2 += 90) x.fillRect(px2, top + 6, 3, lip - top - 8)
  // front face + panels
  const fg = x.createLinearGradient(0, lip, 0, front)
  fg.addColorStop(0, '#221206')
  fg.addColorStop(1, '#160c04')
  x.fillStyle = fg
  x.fillRect(x0, lip, x1 - x0, front - lip)
  for (const [px2, pw] of [[x0 + 44, 240], [x0 + 330, 300], [x0 + 676, 240]]) {
    x.fillStyle = 'rgba(0,0,0,0.34)'
    x.fillRect(px2, lip + 44, pw, 200)
    x.strokeStyle = 'rgba(224,170,100,0.08)'
    x.lineWidth = 3
    x.strokeRect(px2 + 6, lip + 50, pw - 12, 188)
  }
  // centre drawers
  x.fillStyle = 'rgba(0,0,0,0.28)'
  x.fillRect(x0 + 300, lip + 18, 300, 20)
  for (let i = 0; i < 2; i++) {
    x.fillStyle = '#ba9248'
    x.beginPath()
    x.arc(x0 + 418, lip + 28 + i * 0, 5, 0, TAU)
    x.fill()
  }
  x.fillStyle = 'rgba(0,0,0,0.45)'
  x.fillRect(x0, front - 14, x1 - x0, 14)
  // rotary phone, left
  x.save()
  x.translate(STUDY.phone.x, STUDY.phone.y)
  x.fillStyle = '#0d0a08'
  rr(x, -52, 8, 104, 40, 12)
  x.fill()
  x.beginPath()
  x.moveTo(-56, 12)
  x.quadraticCurveTo(0, -14, 56, 12)
  x.lineTo(50, 26)
  x.quadraticCurveTo(0, 6, -50, 26)
  x.closePath()
  x.fill()
  x.fillStyle = '#191410'
  x.beginPath()
  x.arc(20, 30, 15, 0, TAU)
  x.fill()
  x.fillStyle = '#0a0806'
  x.beginPath()
  x.arc(20, 30, 6, 0, TAU)
  x.fill()
  x.strokeStyle = '#0d0a08'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(-50, 34)
  x.quadraticCurveTo(-84, 44, -70, 66)
  x.stroke()
  x.restore()
  // papers + blotter
  x.save()
  x.translate(852, 640)
  x.rotate(0.06)
  x.fillStyle = 'rgba(232,214,168,0.16)'
  x.fillRect(-58, -14, 116, 30)
  x.fillStyle = 'rgba(232,214,168,0.10)'
  x.fillRect(-52, -18, 116, 30)
  x.restore()
  x.fillStyle = 'rgba(20,26,20,0.8)'
  x.fillRect(790, 620, 132, 34)
  // whiskey glass + bottle
  x.fillStyle = '#241408'
  x.fillRect(1064, 542, 26, 66)
  x.fillStyle = 'rgba(255,224,150,0.10)'
  x.fillRect(1064, 542, 8, 66)
  x.fillStyle = 'rgba(220,230,240,0.16)'
  x.fillRect(1104, 584, 26, 24)
  // lamp, right
  x.save()
  x.translate(STUDY.lamp.x, 0)
  x.fillStyle = '#1a1208'
  x.beginPath()
  x.ellipse(0, 652, 44, 12, 0, 0, TAU)
  x.fill()
  x.fillRect(-6, 520, 12, 128)
  const sg = x.createLinearGradient(-64, 430, 64, 520)
  sg.addColorStop(0, '#3a2410')
  sg.addColorStop(1, '#1c1006')
  x.fillStyle = sg
  x.beginPath()
  x.moveTo(-66, 520)
  x.lineTo(66, 520)
  x.lineTo(34, 432)
  x.lineTo(-34, 432)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(255,208,128,0.55)'
  x.fillRect(-64, 512, 128, 8)
  x.restore()
  glowDot(x, STUDY.lamp.x, 500, 120, '255,214,150', 0.35)
  // ashtray + cigar
  x.fillStyle = '#191410'
  x.beginPath()
  x.ellipse(1120, 646, 26, 9, 0, 0, TAU)
  x.fill()
  x.fillStyle = '#4a2c16'
  x.fillRect(1128, 638, 26, 5)
  x.fillStyle = '#7a5a3a'
  x.fillRect(1150, 638, 5, 5)
  return c
}
// Slat shimmer: the baked slats breathe slowly (~0.15 Hz), pure in t.
export function slatShimmer(x, t) {
  x.save()
  for (let k = 0; k < 6; k++) {
    const y0 = 168 + k * 58
    const a = 0.028 + 0.026 * Math.sin(TAU * 0.15 * t + k * 0.7)
    const g = x.createLinearGradient(440, 0, 1660, 0)
    g.addColorStop(0, `rgba(255,222,158,${a})`)
    g.addColorStop(1, `rgba(255,214,148,${a * 0.3})`)
    x.fillStyle = g
    x.beginPath()
    x.moveTo(440, y0)
    x.lineTo(1660, y0 + 202)
    x.lineTo(1660, y0 + 230)
    x.lineTo(440, y0 + 30)
    x.closePath()
    x.fill()
  }
  x.restore()
}
// Lamp pool flicker (slow, candle-adjacent), pure in t.
export function lampFlicker(x, t, k = 1) {
  const a = (0.05 + 0.035 * Math.sin(t * 2.1) * Math.sin(t * 3.7 + 1.3)) * k
  if (a <= 0) return
  glowDot(x, STUDY.lamp.x, 560, 260, '255,200,120', a)
}
// Cigar smoke curl off the ashtray.
export function smokeCurl(x, t) {
  x.save()
  x.strokeStyle = 'rgba(220,214,200,0.05)'
  x.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    x.lineWidth = 10 - i * 3
    x.beginPath()
    for (let u = 0; u <= 1; u += 0.1) {
      const sy2 = 640 - u * 320
      const sx2 = 1136 + Math.sin(u * 5 + t * 0.9 + i * 2.1) * 18 * u
      if (u === 0) x.moveTo(sx2, sy2)
      else x.lineTo(sx2, sy2)
    }
    x.stroke()
  }
  x.restore()
}
// The study door panel: ang 0 = closed, ~1.25 = open; hall light + shadow included.
export function doorPanel(x, ang, lit = 0) {
  const d = STUDY.door
  const w2 = d.x1 - 10 - d.x0
  const vw = Math.max(26, w2 * Math.cos(ang))
  const x0 = d.x1 - 10 - vw
  if (lit > 0) {
    const g = x.createLinearGradient(x0, d.sill, x0 - 160, d.sill + 210)
    g.addColorStop(0, `rgba(214,170,110,${0.14 * lit})`)
    g.addColorStop(1, 'rgba(214,170,110,0)')
    x.fillStyle = g
    x.beginPath()
    x.moveTo(x0, d.sill)
    x.lineTo(d.x1, d.sill)
    x.lineTo(d.x1 - 120, d.sill + 214)
    x.lineTo(x0 - 220, d.sill + 214)
    x.closePath()
    x.fill()
    glowDot(x, (x0 + d.x1) / 2, d.top + 250, 170, '255,196,120', 0.13 * lit)
  }
  const g2 = x.createLinearGradient(x0, 0, d.x1, 0)
  g2.addColorStop(0, '#1a0e06')
  g2.addColorStop(1, '#241407')
  x.fillStyle = g2
  x.fillRect(x0, d.top + 4, d.x1 - 10 - x0, d.sill - d.top - 8)
  x.fillStyle = 'rgba(0,0,0,0.35)'
  for (const [px2, py2, pw, ph] of [
    [x0 + 18, d.top + 26, Math.max(8, vw - 40), 210],
    [x0 + 18, d.top + 268, Math.max(8, vw - 40), 240],
  ]) {
    if (pw <= 8) continue
    x.fillRect(px2, py2, pw, ph)
    x.strokeStyle = 'rgba(224,170,100,0.09)'
    x.lineWidth = 3
    x.strokeRect(px2 + 4, py2 + 4, pw - 8, ph - 8)
  }
  x.fillStyle = '#ba9248'
  x.beginPath()
  x.arc(x0 + 16, 560, 7, 0, TAU)
  x.fill()
  x.fillStyle = 'rgba(0,0,0,0.5)'
  x.fillRect(x0 - 6, d.top, 8, d.sill - d.top)
}
// Evenodd iris wipe centred on (cx, cy).
export function iris(x, r, cx = 960, cy = 540) {
  if (r >= 1200) return
  x.fillStyle = '#040201'
  x.beginPath()
  x.rect(0, 0, W, H)
  x.moveTo(cx + Math.max(0.1, r), cy)
  x.arc(cx, cy, Math.max(0.1, r), 0, TAU, true)
  x.fill('evenodd')
}

// ============================== S2 — THE BEDROOM ==============================
export function bedroomBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  // wall + wallpaper stripes
  const g = x.createLinearGradient(0, 0, 0, 860)
  g.addColorStop(0, '#0b0e16')
  g.addColorStop(0.6, '#121826')
  g.addColorStop(1, '#0d1220')
  x.fillStyle = g
  x.fillRect(0, 0, W, 860)
  for (let px2 = 0; px2 < W; px2 += 64) {
    x.fillStyle = 'rgba(96,118,160,0.035)'
    x.fillRect(px2 + 18, 0, 26, 860)
    x.fillStyle = 'rgba(210,224,248,0.02)'
    x.fillRect(px2 + 24, 0, 4, 860)
  }
  for (let py = 120; py < 860; py += 120) {
    x.fillStyle = 'rgba(210,224,248,0.022)'
    for (let px2 = 32; px2 < W; px2 += 64) {
      x.beginPath()
      x.ellipse(px2 + 18, py, 7, 12, 0, 0, TAU)
      x.fill()
    }
  }
  // picture rail + small frame
  x.fillStyle = '#080b12'
  x.fillRect(0, 196, W, 10)
  x.fillStyle = '#0a0d15'
  x.fillRect(452, 236, 118, 92)
  x.strokeStyle = '#232c40'
  x.lineWidth = 6
  x.strokeRect(455, 239, 112, 86)
  x.fillStyle = 'rgba(150,180,230,0.06)'
  x.beginPath()
  x.ellipse(511, 280, 30, 22, 0, 0, TAU)
  x.fill()
  // ---- moon window, LEFT ----
  x.fillStyle = '#070a11'
  x.beginPath()
  x.moveTo(128, 540)
  x.lineTo(128, 208)
  x.quadraticCurveTo(128, 96, 262, 92)
  x.quadraticCurveTo(396, 96, 396, 208)
  x.lineTo(396, 540)
  x.closePath()
  x.fill()
  const ng = x.createLinearGradient(140, 100, 380, 520)
  ng.addColorStop(0, '#22304a')
  ng.addColorStop(0.6, '#141d30')
  ng.addColorStop(1, '#0c1322')
  x.fillStyle = ng
  x.beginPath()
  x.moveTo(142, 528)
  x.lineTo(142, 210)
  x.quadraticCurveTo(142, 110, 262, 106)
  x.quadraticCurveTo(382, 110, 382, 210)
  x.lineTo(382, 528)
  x.closePath()
  x.fill()
  x.fillStyle = '#e8eff8' // the moon
  x.beginPath()
  x.arc(224, 214, 38, 0, TAU)
  x.fill()
  glowDot(x, 224, 214, 90, '220,232,250', 0.35)
  x.fillStyle = 'rgba(150,170,200,0.5)'
  x.beginPath()
  x.arc(214, 204, 9, 0, TAU)
  x.fill()
  x.beginPath()
  x.arc(236, 224, 6, 0, TAU)
  x.fill()
  x.save() // cloud streaks stay inside the glass
  x.beginPath()
  x.moveTo(142, 528)
  x.lineTo(142, 210)
  x.quadraticCurveTo(142, 110, 262, 106)
  x.quadraticCurveTo(382, 110, 382, 210)
  x.lineTo(382, 528)
  x.closePath()
  x.clip()
  x.fillStyle = 'rgba(190,205,230,0.13)'
  for (const [cy2, cw] of [[150, 150], [300, 180], [420, 130]]) {
    x.beginPath()
    x.ellipse(262, cy2, cw, 10, 0.05, 0, TAU)
    x.fill()
  }
  x.restore()
  x.strokeStyle = '#070a11'
  x.lineWidth = 9
  x.beginPath()
  x.moveTo(262, 104)
  x.lineTo(262, 532)
  x.moveTo(142, 240)
  x.lineTo(382, 240)
  x.moveTo(142, 380)
  x.lineTo(382, 380)
  x.stroke()
  x.strokeStyle = '#131a29'
  x.lineWidth = 14
  x.beginPath()
  x.moveTo(128, 540)
  x.lineTo(128, 208)
  x.quadraticCurveTo(128, 96, 262, 92)
  x.quadraticCurveTo(396, 96, 396, 208)
  x.lineTo(396, 540)
  x.stroke()
  x.fillStyle = '#101828'
  x.fillRect(112, 536, 300, 18)
  // ---- the bed: headboard + mattress + pillow (duvet drawn live) ----
  x.fillStyle = '#181009'
  x.fillRect(636, 452, 92, 380)
  x.fillStyle = '#241608'
  x.fillRect(628, 440, 108, 26)
  x.fillStyle = 'rgba(224,190,130,0.08)'
  x.fillRect(628, 440, 108, 5)
  x.fillStyle = 'rgba(0,0,0,0.4)'
  x.fillRect(648, 470, 8, 350)
  x.fillRect(708, 470, 8, 350)
  // mattress + sheet
  x.fillStyle = '#232b3e'
  x.fillRect(728, 742, 916, 190)
  x.fillStyle = '#2e3952'
  x.fillRect(728, 742, 916, 22)
  x.fillStyle = 'rgba(220,230,250,0.10)'
  x.fillRect(728, 742, 916, 6)
  // pillow
  x.save()
  x.translate(862, 716)
  x.rotate(-0.04)
  x.fillStyle = '#8e94a4'
  x.beginPath()
  x.ellipse(0, 0, 132, 44, 0, 0, TAU)
  x.fill()
  x.fillStyle = 'rgba(226,234,248,0.22)'
  x.beginPath()
  x.ellipse(-30, -10, 80, 22, -0.12, 0, TAU)
  x.fill()
  x.restore()
  // footboard
  x.fillStyle = '#181009'
  x.fillRect(1636, 668, 34, 268)
  x.fillStyle = '#241608'
  x.fillRect(1630, 656, 46, 20)
  // ---- moon pool: cool wash from the window across floor + bed ----
  x.save()
  x.globalAlpha = 0.85
  const mp = x.createLinearGradient(300, 300, 900, 1000)
  mp.addColorStop(0, 'rgba(150,180,230,0.10)')
  mp.addColorStop(1, 'rgba(150,180,230,0.015)')
  x.fillStyle = mp
  x.beginPath()
  x.moveTo(400, 552)
  x.lineTo(560, 552)
  x.lineTo(1010, 1080)
  x.lineTo(560, 1080)
  x.closePath()
  x.fill()
  x.restore()
  // ---- dresser + THE mirror, right ----
  x.fillStyle = '#1a1410'
  x.fillRect(1688, 700, 216, 268)
  x.fillStyle = '#241b14'
  x.fillRect(1680, 690, 232, 18)
  for (let i = 0; i < 3; i++) {
    x.fillStyle = 'rgba(0,0,0,0.4)'
    x.fillRect(1700, 726 + i * 76, 192, 8)
    x.fillStyle = '#8a744a'
    x.beginPath()
    x.arc(1796, 762 + i * 76, 6, 0, TAU)
    x.fill()
  }
  x.fillStyle = '#2c2014' // ornate mirror frame
  x.beginPath()
  x.ellipse(1796, 428, 118, 218, 0, 0, TAU)
  x.fill()
  x.fillStyle = '#1a1410'
  x.beginPath()
  x.ellipse(1796, 428, 104, 204, 0, 0, TAU)
  x.fill()
  x.fillStyle = '#0d1219'
  x.beginPath()
  x.ellipse(1796, 428, 92, 192, 0, 0, TAU)
  x.fill()
  x.save()
  x.beginPath()
  x.ellipse(1796, 428, 92, 192, 0, 0, TAU)
  x.clip()
  x.fillStyle = 'rgba(190,210,240,0.07)'
  x.beginPath()
  x.moveTo(1720, 300)
  x.lineTo(1780, 280)
  x.lineTo(1860, 580)
  x.lineTo(1800, 600)
  x.closePath()
  x.fill()
  x.restore()
  for (let i = 0; i < 8; i++) {
    const a = -0.5 + i * 0.8
    x.fillStyle = '#8a744a'
    x.beginPath()
    x.arc(1796 + Math.cos(a) * 112, 428 + Math.sin(a) * 210, 6, 0, TAU)
    x.fill()
  }
  // candle stick (unlit) on the dresser
  x.fillStyle = '#5a4a30'
  x.fillRect(1726, 640, 10, 52)
  x.fillStyle = '#d8cdb0'
  x.fillRect(1724, 626, 14, 16)
  // rug
  x.save()
  x.translate(820, 1002)
  x.fillStyle = '#1e1826'
  x.beginPath()
  x.ellipse(0, 0, 420, 84, 0, 0, TAU)
  x.fill()
  x.strokeStyle = 'rgba(150,140,180,0.16)'
  x.lineWidth = 5
  x.beginPath()
  x.ellipse(0, 0, 396, 74, 0, 0, TAU)
  x.stroke()
  x.restore()
  // floor
  for (let i = 0; i < 10; i++) {
    const fy = 880 + i * 21
    x.fillStyle = `rgba(10,13,20,${0.5 - i * 0.03})`
    x.fillRect(0, fy, W, 4)
  }
  const vg = x.createLinearGradient(0, 0, 0, 150)
  vg.addColorStop(0, 'rgba(0,0,0,0.55)')
  vg.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = vg
  x.fillRect(0, 0, W, 150)
  return c
}
// The duvet, drawn live so the sheet pull can slide it. u = sheetPull 0..1.
export function duvet(x, u) {
  const d = BED.duvet
  const dx = d.x0 + 356 * u
  x.save()
  x.translate(dx, d.y0)
  const g = x.createLinearGradient(0, 0, 0, d.h)
  g.addColorStop(0, '#46536e')
  g.addColorStop(0.4, '#3a4560')
  g.addColorStop(1, '#232c42')
  x.fillStyle = g
  rr(x, 0, 0, d.w, d.h, 26)
  x.fill()
  x.fillStyle = 'rgba(214,226,248,0.16)'
  rr(x, 0, 0, d.w, 20, 12)
  x.fill()
  x.strokeStyle = 'rgba(10,14,24,0.5)'
  x.lineWidth = 6
  for (let i = 0; i < 3; i++) {
    const wy = 52 + i * 56
    x.beginPath()
    x.moveTo(20, wy)
    x.bezierCurveTo(d.w * 0.3, wy + 14, d.w * 0.6, wy - 12, d.w - 20, wy + 6)
    x.stroke()
  }
  x.fillStyle = 'rgba(0,0,0,0.35)'
  rr(x, 0, d.h - 12, d.w, 12, 6)
  x.fill()
  x.restore()
}

// ============================== S3 — THE CHAPEL ==============================
export function chapelBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  // deep nave walls
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0e0a10')
  g.addColorStop(0.5, '#171019')
  g.addColorStop(1, '#100b12')
  x.fillStyle = g
  x.fillRect(0, 0, W, H)
  for (let py = 60; py < 700; py += 90) {
    x.fillStyle = 'rgba(224,190,130,0.03)'
    x.fillRect(0, py, W, 2)
    for (let px2 = ((py / 90) % 2) * 90; px2 < W; px2 += 180) x.fillRect(px2, py, 2, 90)
  }
  // side columns
  for (const cxx of [196, 1724]) {
    const cg = x.createLinearGradient(cxx - 40, 0, cxx + 40, 0)
    cg.addColorStop(0, '#0c080e')
    cg.addColorStop(0.5, '#241a24')
    cg.addColorStop(1, '#0c080e')
    x.fillStyle = cg
    x.fillRect(cxx - 38, 60, 76, 640)
    x.fillStyle = '#1c131c'
    x.fillRect(cxx - 52, 46, 104, 22)
  }
  // ---- stained-glass hair-motif window ----
  const win = { cx: 960, top: 96, base: 566, hw: 190 }
  x.fillStyle = '#08050c'
  x.beginPath()
  x.moveTo(win.cx - win.hw - 26, win.base + 20)
  x.lineTo(win.cx - win.hw - 26, 330)
  x.quadraticCurveTo(win.cx - win.hw - 26, 110, win.cx, 84)
  x.quadraticCurveTo(win.cx + win.hw + 26, 110, win.cx + win.hw + 26, 330)
  x.lineTo(win.cx + win.hw + 26, win.base + 20)
  x.closePath()
  x.fill()
  glowDot(x, win.cx, 300, 420, '255,224,150', 0.16)
  x.save()
  x.beginPath()
  x.moveTo(win.cx - win.hw, win.base)
  x.lineTo(win.cx - win.hw, 330)
  x.quadraticCurveTo(win.cx - win.hw, 124, win.cx, 100)
  x.quadraticCurveTo(win.cx + win.hw, 124, win.cx + win.hw, 330)
  x.lineTo(win.cx + win.hw, win.base)
  x.closePath()
  x.clip()
  // panes: gold / cyan / rose bands, then flowing hair strands rising through them
  const paneCols = ['#c2921e', '#3e88a9', '#d9a93e', '#b95a6e', '#d9a93e', '#3e88a9', '#c2921e']
  for (let i = 0; i < 7; i++) {
    x.fillStyle = paneCols[i]
    x.globalAlpha = 0.55
    x.fillRect(win.cx - win.hw + i * 55, 80, 55, 520)
  }
  x.globalAlpha = 1
  const strand = (sx, col, lw, amp) => {
    x.strokeStyle = col
    x.lineWidth = lw
    x.lineCap = 'round'
    x.beginPath()
    x.moveTo(sx, win.base)
    x.bezierCurveTo(sx + amp, 430, sx - amp, 300, sx + amp * 0.5, 200)
    x.bezierCurveTo(sx + amp * 0.2, 150, sx - amp * 0.4, 130, sx, 96)
    x.stroke()
  }
  strand(win.cx - 120, '#8a5a14', 17, 46)
  strand(win.cx - 58, '#e9c05a', 13, -38)
  strand(win.cx + 6, '#f2d27e', 15, 42)
  strand(win.cx + 66, '#e9c05a', 11, -34)
  strand(win.cx + 126, '#a86a1c', 15, 40)
  strand(win.cx - 10, '#7ab4c9', 7, -50)
  strand(win.cx + 100, '#c96a80', 6, 34)
  // lead lines
  x.strokeStyle = '#151018'
  x.lineWidth = 7
  for (let i = 1; i < 7; i++) {
    x.beginPath()
    x.moveTo(win.cx - win.hw + i * 55, 90)
    x.lineTo(win.cx - win.hw + i * 55, win.base)
    x.stroke()
  }
  for (let py = 170; py < win.base; py += 84) {
    x.beginPath()
    x.moveTo(win.cx - win.hw, py)
    x.lineTo(win.cx + win.hw, py)
    x.stroke()
  }
  x.fillStyle = '#f2d27e' // rose window at the crown
  x.beginPath()
  x.arc(win.cx, 132, 30, 0, TAU)
  x.fill()
  x.strokeStyle = '#151018'
  x.lineWidth = 6
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU
    x.beginPath()
    x.moveTo(win.cx, 132)
    x.lineTo(win.cx + Math.cos(a) * 28, 132 + Math.sin(a) * 28)
    x.stroke()
  }
  x.restore()
  x.strokeStyle = '#241a24'
  x.lineWidth = 18
  x.beginPath()
  x.moveTo(win.cx - win.hw, win.base)
  x.lineTo(win.cx - win.hw, 330)
  x.quadraticCurveTo(win.cx - win.hw, 124, win.cx, 100)
  x.quadraticCurveTo(win.cx + win.hw, 124, win.cx + win.hw, 330)
  x.lineTo(win.cx + win.hw, win.base)
  x.stroke()
  // ---- altar steps + table ----
  for (let i = 0; i < 3; i++) {
    const sy2 = 700 - i * 32
    x.fillStyle = i % 2 ? '#2c2230' : '#241b28'
    x.fillRect(690 - i * 60, sy2, 540 + i * 120, 32)
    x.fillStyle = 'rgba(224,190,130,0.10)'
    x.fillRect(690 - i * 60, sy2, 540 + i * 120, 4)
  }
  // altar table + cloth + two candles
  x.fillStyle = '#241b28'
  x.fillRect(862, 470, 196, 200)
  x.fillStyle = 'rgba(216,205,176,0.20)'
  x.fillRect(842, 462, 236, 22)
  x.fillStyle = 'rgba(216,205,176,0.13)'
  x.beginPath()
  x.moveTo(846, 482)
  x.lineTo(1074, 482)
  x.lineTo(1064, 606)
  x.lineTo(856, 606)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(0,0,0,0.25)'
  x.fillRect(846, 600, 228, 7)
  for (const cxx of [886, 1034]) {
    x.fillStyle = '#8a744a'
    x.fillRect(cxx - 5, 402, 10, 58)
    glowDot(x, cxx, 396, 26, '255,220,150', 0.5)
    x.fillStyle = '#ffdf9e'
    x.beginPath()
    x.ellipse(cxx, 396, 4, 9, 0, 0, TAU)
    x.fill()
  }
  // ---- pews, both sides of the aisle ----
  for (let i = 0; i < 5; i++) {
    const py = 724 + i * 64
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? -10 : 1148 + i * 42
      const x1 = side < 0 ? 772 - i * 42 : 1930
      const w2 = x1 - x0
      if (w2 <= 40) continue
      x.fillStyle = '#170e08'
      x.fillRect(x0, py, w2, 50)
      x.fillStyle = '#2c1d10'
      x.fillRect(x0, py, w2, 9)
      x.fillStyle = 'rgba(0,0,0,0.35)'
      x.fillRect(x0, py + 50, w2, 14)
      // end panel toward the aisle
      const ex = side < 0 ? x1 - 18 : x0
      x.fillStyle = '#0f0a06'
      x.fillRect(ex, py - 36, 18, 100)
      x.fillStyle = 'rgba(224,170,100,0.08)'
      x.fillRect(ex, py - 36, 18, 5)
    }
  }
  // stone floor
  for (let i = 0; i < 9; i++) {
    const fy = 690 + i * (34 + i * 6)
    x.fillStyle = 'rgba(0,0,0,0.3)'
    x.fillRect(0, fy, W, 3)
  }
  const vg = x.createLinearGradient(0, 0, 0, 130)
  vg.addColorStop(0, 'rgba(0,0,0,0.5)')
  vg.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = vg
  x.fillRect(0, 0, W, 130)
  return c
}
// Additive god-ray shafts from the window, pure in t.
export function godRays(x, t, k = 1) {
  x.save()
  x.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 4; i++) {
    const a = 0.035 + 0.02 * Math.sin(t * 0.4 + i * 1.9)
    x.globalAlpha = a * k
    x.fillStyle = '#ffe9ad'
    const x0 = 830 + i * 90
    x.beginPath()
    x.moveTo(x0, 140)
    x.lineTo(x0 + 70, 140)
    x.lineTo(x0 + 250 + i * 60, 1050)
    x.lineTo(x0 - 90 + i * 60, 1050)
    x.closePath()
    x.fill()
  }
  x.restore()
}
// Dust motes drifting in the shafts.
export function dustMotes(x, t, seed, n, x0, y0, w2, h2) {
  x.save()
  for (let i = 0; i < n; i++) {
    const sp = 7 + hash(seed + i * 7) * 14
    const mx = x0 + hash(seed + i * 3) * w2 + Math.sin(t * 0.7 + i) * 10
    const my = y0 + ((hash(seed + i * 11) * h2 + t * sp) % h2)
    x.globalAlpha = 0.05 + hash(seed + i * 5) * 0.08
    x.fillStyle = '#ffe9ad'
    x.fillRect(mx, my, 3, 3)
  }
  x.restore()
}
// Hanging censer on a chain, swings slowly; pure in t.
export function censer(x, t) {
  const { x: px2, y: py } = CHAPEL.censer
  const a = Math.sin(t * 0.9 + 1) * 0.13
  const bx = px2 + Math.sin(a) * 216, by = py + Math.cos(a) * 216
  x.save()
  x.strokeStyle = '#6a5628'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(px2, py)
  x.lineTo(bx, by)
  x.stroke()
  x.translate(bx, by)
  x.rotate(-a)
  x.fillStyle = '#8a6a2a'
  x.beginPath()
  x.moveTo(-18, 0)
  x.lineTo(18, 0)
  x.lineTo(12, 26)
  x.quadraticCurveTo(0, 34, -12, 26)
  x.closePath()
  x.fill()
  x.fillStyle = '#b9944a'
  x.beginPath()
  x.ellipse(0, 2, 18, 5, 0, 0, TAU)
  x.fill()
  x.fillRect(-3, -12, 6, 12)
  x.strokeStyle = 'rgba(230,220,200,0.12)' // smoke curls
  x.lineWidth = 5
  x.lineCap = 'round'
  for (let i = 0; i < 2; i++) {
    x.beginPath()
    x.moveTo(i * 8 - 4, -14)
    x.bezierCurveTo(i * 8 - 4 + 14, -46, i * 8 - 4 - 14, -74, i * 8 - 4 + 10, -108)
    x.stroke()
  }
  x.restore()
}
// The golden oil drop falls from (x0,y0) to (x1,y1); k 0..1. Splash at the end.
export function oilDrop(x, x0, y0, x1, y1, k) {
  if (k <= 0 || k >= 1) return
  const u = k * k
  const dx = lerp(x0, x1, u), dy = lerp(y0, y1, u)
  glowDot(x, dx, dy, 22, '255,224,150', 0.5)
  x.fillStyle = '#f2d27e'
  x.beginPath()
  x.ellipse(dx, dy, 6, 9, 0, 0, TAU)
  x.fill()
}
// Strand-crown halo above the anointed head; k 0..1 fade-in, shimmer pure in t.
export function anointHalo(x, cx, cy, k, t) {
  if (k <= 0) return
  x.save()
  x.globalAlpha = k
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (1.04 + (i / 10) * 0.92)
    const bx = cx + Math.cos(a) * 66, by = cy + Math.sin(a) * 66
    const tipA = a + 0.24 + Math.sin(t * 1.4 + i) * 0.05
    x.strokeStyle = i % 3 ? '#e9c05a' : '#f6e2a0'
    x.lineWidth = 5.5
    x.lineCap = 'round'
    x.beginPath()
    x.moveTo(bx, by)
    x.quadraticCurveTo(cx + Math.cos(a) * 100, cy + Math.sin(a) * 100, cx + Math.cos(tipA) * 122, cy + Math.sin(tipA) * 122)
    x.stroke()
  }
  glowDot(x, cx, cy - 30, 90, '255,224,150', 0.18)
  x.restore()
}

// ============================== MONTAGE VIGNETTE SETS ==============================
// (a) barbershop: mirror wall, counter, pole, chair. Chair front is a bake drawn over the victim.
export function barbershopBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#151009')
  g.addColorStop(0.6, '#221709')
  g.addColorStop(1, '#170f07')
  x.fillStyle = g
  x.fillRect(0, 0, W, H)
  // mirror wall: two tall framed mirrors
  for (const mx of [140, 1420]) {
    x.fillStyle = '#0c0805'
    x.fillRect(mx, 120, 360, 520)
    x.fillStyle = '#241a10'
    x.fillRect(mx + 12, 132, 336, 496)
    x.fillStyle = 'rgba(240,210,160,0.10)'
    x.fillRect(mx + 12, 132, 336, 496)
    x.fillStyle = 'rgba(255,224,170,0.14)'
    x.beginPath()
    x.moveTo(mx + 40, 160)
    x.lineTo(mx + 120, 150)
    x.lineTo(mx + 300, 600)
    x.lineTo(mx + 220, 610)
    x.closePath()
    x.fill()
    x.strokeStyle = '#3a2a16'
    x.lineWidth = 8
    x.strokeRect(mx + 12, 132, 336, 496)
  }
  // wainscot + tiled floor
  x.fillStyle = '#0e0906'
  x.fillRect(0, 640, W, 140)
  x.fillStyle = 'rgba(224,170,100,0.07)'
  x.fillRect(0, 640, W, 4)
  for (let i = 0; i < 8; i++) {
    const fy = 780 + i * (30 + i * 6)
    x.fillStyle = i % 2 ? '#1c1309' : '#181006'
    x.fillRect(0, fy, W, 30 + i * 6)
    x.fillStyle = 'rgba(0,0,0,0.3)'
    x.fillRect(0, fy, W, 2)
  }
  // counter with jars, left
  x.fillStyle = '#1e1309'
  x.fillRect(40, 560, 360, 200)
  x.fillStyle = '#2c1d10'
  x.fillRect(30, 548, 380, 18)
  for (let i = 0; i < 4; i++) {
    x.fillStyle = 'rgba(220,230,240,0.14)'
    x.fillRect(66 + i * 80, 496, 34, 48)
    x.fillStyle = i % 2 ? 'rgba(160,60,50,0.5)' : 'rgba(70,110,80,0.5)'
    x.fillRect(66 + i * 80, 516, 34, 28)
  }
  // straight razor on the counter
  x.fillStyle = '#c9d2e0'
  x.save()
  x.translate(310, 540)
  x.rotate(-0.2)
  x.fillRect(-30, -3, 46, 5)
  x.fillStyle = '#241408'
  x.fillRect(-52, -4, 24, 7)
  x.restore()
  // barber chair BACK: leather + chrome
  x.fillStyle = '#241014'
  x.beginPath()
  x.moveTo(880, 700)
  x.lineTo(880, 420)
  x.quadraticCurveTo(880, 380, 926, 380)
  x.lineTo(1096, 380)
  x.quadraticCurveTo(1142, 380, 1142, 420)
  x.lineTo(1142, 700)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(255,220,180,0.07)'
  x.fillRect(896, 400, 20, 290)
  for (let i = 0; i < 4; i++) {
    x.fillStyle = 'rgba(214,170,110,0.3)'
    x.beginPath()
    x.arc(1116, 420 + i * 70, 4, 0, TAU)
    x.fill()
  }
  // pole bracket, right (stripes drawn live)
  x.fillStyle = '#0f0a06'
  x.fillRect(1488, 240, 14, 60)
  x.fillStyle = '#d8d2c4'
  x.fillRect(1444, 300, 102, 316)
  x.fillStyle = '#2c2c34'
  x.fillRect(1440, 292, 110, 16)
  x.fillRect(1440, 608, 110, 16)
  glowDot(x, 1495, 430, 150, '255,120,90', 0.08)
  // chair hydraulic base
  x.fillStyle = '#0f0a06'
  x.fillRect(980, 900, 62, 90)
  x.beginPath()
  x.ellipse(1011, 996, 90, 16, 0, 0, TAU)
  x.fill()
  return c
}
// Chair front pieces drawn OVER the seated victim.
export function chairFrontBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  x.fillStyle = '#2c141a'
  rr(x, 862, 700, 96, 60, 14) // left armrest
  x.fill()
  rr(x, 1064, 700, 96, 60, 14)
  x.fill()
  x.fillStyle = '#1a0c10'
  rr(x, 872, 742, 198, 60, 16) // seat front
  x.fill()
  x.fillStyle = 'rgba(255,220,180,0.06)'
  x.fillRect(872, 742, 198, 8)
  x.fillStyle = '#0f0a06'
  rr(x, 942, 852, 138, 84, 12) // footrest
  x.fill()
  x.fillStyle = '#3a3a44'
  x.fillRect(1000, 800, 22, 60)
  return c
}
// Barber pole stripes scrolling; pure in lt.
export function barberPole(x, lt, speed = 60) {
  x.save()
  x.beginPath()
  x.rect(1444, 308, 102, 300)
  x.clip()
  x.fillStyle = '#e8e2d4'
  x.fillRect(1444, 308, 102, 300)
  x.lineCap = 'butt'
  const per = 96
  for (let i = -1; i < 6; i++) {
    const y0 = 308 + ((i * per + lt * speed) % (per * 6)) - per
    x.strokeStyle = '#a8282a'
    x.lineWidth = 30
    x.beginPath()
    x.moveTo(1420, y0 + 20)
    x.lineTo(1570, y0 - 28)
    x.stroke()
    x.strokeStyle = '#2c4a8a'
    x.lineWidth = 12
    x.beginPath()
    x.moveTo(1420, y0 + 52)
    x.lineTo(1570, y0 + 4)
    x.stroke()
  }
  x.fillStyle = 'rgba(255,255,255,0.16)'
  x.fillRect(1444, 308, 22, 300)
  x.restore()
}
// (b) consiglieri: restaurant booth, check cloth table (top baked, front is a bake).
export function consigBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#120c0a')
  g.addColorStop(0.6, '#1c110c')
  g.addColorStop(1, '#120b08')
  x.fillStyle = g
  x.fillRect(0, 0, W, H)
  // booth back
  x.fillStyle = '#241016'
  x.fillRect(560, 260, 800, 470)
  x.fillStyle = '#180a10'
  x.fillRect(560, 260, 26, 470)
  x.fillRect(1334, 260, 26, 470)
  for (let i = 0; i < 3; i++) {
    x.fillStyle = 'rgba(255,220,180,0.05)'
    x.fillRect(600 + i * 260, 290, 220, 60)
  }
  // wall sconces
  for (const sx of [420, 1500]) {
    glowDot(x, sx, 260, 110, '255,190,110', 0.22)
    x.fillStyle = '#2c2014'
    x.fillRect(sx - 16, 262, 32, 20)
  }
  // floor
  for (let i = 0; i < 7; i++) {
    const fy = 880 + i * (28 + i * 5)
    x.fillStyle = 'rgba(0,0,0,0.32)'
    x.fillRect(0, fy, W, 3)
  }
  // table TOP: red-white check cloth
  x.save()
  x.translate(960, 706)
  x.fillStyle = '#e2d8c4'
  x.beginPath()
  x.ellipse(0, 0, 420, 74, 0, 0, TAU)
  x.fill()
  x.clip()
  for (let row = -2; row < 2; row++)
    for (let col = -6; col < 6; col++) {
      if ((row + col) % 2) continue
      x.fillStyle = '#a02a2a'
      x.fillRect(col * 74, row * 37, 74, 37)
    }
  x.restore()
  x.fillStyle = 'rgba(255,240,210,0.12)'
  x.beginPath()
  x.ellipse(960, 690, 380, 40, 0, 0, TAU)
  x.fill()
  // bottle + plates + candles on the table
  x.fillStyle = '#1a2c1a'
  x.fillRect(1168, 596, 26, 104)
  x.fillStyle = 'rgba(255,240,210,0.14)'
  x.fillRect(1168, 596, 8, 104)
  x.fillStyle = 'rgba(232,222,196,0.2)'
  x.beginPath()
  x.ellipse(800, 700, 52, 13, 0, 0, TAU)
  x.fill()
  x.beginPath()
  x.ellipse(1076, 704, 52, 13, 0, 0, TAU)
  x.fill()
  for (const cxx of [960]) {
    x.fillStyle = '#d8cdb0'
    x.fillRect(cxx - 7, 646, 14, 30)
    x.fillStyle = '#ffdf9e'
    x.beginPath()
    x.ellipse(cxx, 640, 4, 8, 0, 0, TAU)
    x.fill()
    glowDot(x, cxx, 640, 40, '255,220,150', 0.4)
  }
  return c
}
// Table front cloth (drawn OVER the toasting figures).
export function consigFrontBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  x.save()
  x.beginPath()
  x.moveTo(540, 700)
  x.lineTo(1380, 700)
  x.lineTo(1400, 900)
  x.lineTo(520, 900)
  x.closePath()
  x.clip()
  x.fillStyle = '#e2d8c4'
  x.fillRect(520, 700, 880, 210)
  for (let row = 0; row < 6; row++)
    for (let col = -1; col < 13; col++) {
      if ((row + col) % 2) continue
      x.fillStyle = '#a02a2a'
      x.fillRect(520 + col * 74, 700 + row * 37, 74, 37)
    }
  x.fillStyle = 'rgba(0,0,0,0.4)'
  x.fillRect(520, 878, 880, 24)
  x.restore()
  return c
}
// (d) vault of wigs: steel chamber + racks of wigs + door frame (panel drawn live).
export function vaultBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  x.fillStyle = '#0a0e0c'
  x.fillRect(0, 0, W, H)
  for (let i = 0; i < 22; i++) {
    x.fillStyle = 'rgba(150,190,170,0.04)'
    x.fillRect(0, i * 52, W, 2)
  }
  // riveted steel panels
  for (let py = 40; py < 900; py += 220)
    for (let px2 = 60; px2 < W; px2 += 380) {
      x.strokeStyle = 'rgba(120,150,140,0.10)'
      x.lineWidth = 5
      x.strokeRect(px2, py, 360, 200)
      x.fillStyle = 'rgba(160,190,180,0.14)'
      for (const [rx, ry] of [[12, 12], [348, 12], [12, 188], [348, 188]]) x.fillRect(px2 + rx, py + ry, 5, 5)
    }
  // racks of wigs on hooks (the discovery)
  for (const rx of [520, 1000]) {
    x.fillStyle = '#1a201c'
    x.fillRect(rx, 240, 380, 470)
    x.fillStyle = '#242c26'
    x.fillRect(rx - 10, 232, 400, 16)
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 4; col++) {
        const hx = rx + 56 + col * 92, hy = 320 + row * 140
        x.strokeStyle = '#3a443c'
        x.lineWidth = 5
        x.beginPath()
        x.moveTo(hx, hy - 26)
        x.lineTo(hx, hy)
        x.stroke()
        const tint = hash(rx + row * 7 + col * 3) > 0.78 ? 'gold' : 'crimson'
        wig(x, hx, hy, 52, 0.1, 0, { tint })
      }
  }
  // floor
  x.fillStyle = '#0d1210'
  x.fillRect(0, 880, W, 200)
  x.fillStyle = 'rgba(150,190,170,0.08)'
  x.fillRect(0, 880, W, 4)
  // door frame, LEFT (the blown panel drawn live)
  x.fillStyle = '#242c26'
  x.fillRect(140, 180, 60, 740)
  x.fillStyle = '#161c18'
  x.fillRect(180, 200, 420, 700)
  x.fillStyle = '#3a443c' // tumbler dial on the wall
  x.beginPath()
  x.arc(760, 380, 74, 0, TAU)
  x.fill()
  x.fillStyle = '#1a201c'
  x.beginPath()
  x.arc(760, 380, 52, 0, TAU)
  x.fill()
  x.strokeStyle = '#c9b06a'
  x.lineWidth = 8
  x.beginPath()
  x.moveTo(760, 380)
  x.lineTo(760, 316)
  x.stroke()
  return c
}
// The steel door panel blown ajar; blow 0 (shut) → 1 (open with light).
export function vaultDoor(x, blow, t) {
  const g2 = Math.max(0.1, 1 - blow)
  const w2 = 420 * g2
  if (blow > 0) {
    const lg = x.createLinearGradient(180, 0, 620, 0)
    lg.addColorStop(0, `rgba(255,232,170,${0.30 * blow})`)
    lg.addColorStop(1, 'rgba(255,232,170,0)')
    x.fillStyle = lg
    x.fillRect(180, 200, 440, 700)
    for (let i = 0; i < 5; i++) {
      x.globalAlpha = 0.10 * blow
      x.fillStyle = '#ffe9ad'
      const a = t * 0.7 + i * 1.3
      x.save()
      x.globalCompositeOperation = 'lighter'
      x.beginPath()
      x.moveTo(300, 540)
      x.lineTo(300 + Math.cos(a) * 900, 540 + Math.sin(a) * 900)
      x.lineTo(300 + Math.cos(a + 0.1) * 900, 540 + Math.sin(a + 0.1) * 900)
      x.closePath()
      x.fill()
      x.restore()
    }
    x.globalAlpha = 1
  }
  if (w2 <= 4) return
  x.fillStyle = '#2e3830'
  x.beginPath()
  x.moveTo(600, 200)
  x.lineTo(600 - w2, 200 + 60 * blow)
  x.lineTo(600 - w2, 900 - 60 * blow)
  x.lineTo(600, 900)
  x.closePath()
  x.fill()
  x.strokeStyle = 'rgba(180,210,190,0.16)'
  x.lineWidth = 6
  x.beginPath()
  x.moveTo(600 - w2, 200 + 60 * blow)
  x.lineTo(600 - w2, 900 - 60 * blow)
  x.stroke()
  x.fillStyle = '#1a201c'
  x.fillRect(600 - w2 * 0.86, 300, w2 * 0.7, 40 * g2 + 8)
  x.fillRect(600 - w2 * 0.86, 700, w2 * 0.7, 40 * g2 + 8)
}
// (e) rain: tenement street bake for the falling-wigs barrage.
export function rainBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0c1018')
  g.addColorStop(0.7, '#141a26')
  g.addColorStop(1, '#0d1119')
  x.fillStyle = g
  x.fillRect(0, 0, W, H)
  // tenement facade
  x.fillStyle = '#191512'
  x.fillRect(160, 60, 1240, 860)
  for (let by = 60; by < 920; by += 26) {
    for (let bx = 160 + ((by / 26) % 2) * 18; bx < 1400; bx += 40) {
      x.fillStyle = `rgba(${40 + hash(bx * 3 + by) * 14},${34 + hash(bx * 7 + by) * 12},${28 + hash(bx + by) * 10},1)`
      x.fillRect(bx, by, 36, 22)
    }
  }
  x.fillStyle = '#0c0a08'
  x.fillRect(140, 40, 1280, 24)
  // lit windows + one dark
  for (const [wx, wy, lit] of [[300, 160, 1], [620, 160, 0], [940, 160, 1], [1180, 300, 0], [440, 330, 1], [860, 330, 0], [300, 500, 0], [1060, 500, 1], [620, 660, 1]]) {
    x.fillStyle = lit ? 'rgba(255,206,130,0.55)' : '#0a0c12'
    x.fillRect(wx, wy, 92, 110)
    x.strokeStyle = '#0c0a08'
    x.lineWidth = 8
    x.strokeRect(wx, wy, 92, 110)
    if (lit) glowDot(x, wx + 46, wy + 55, 90, '255,200,120', 0.14)
  }
  // fire escape
  x.strokeStyle = '#0c0a08'
  x.lineWidth = 7
  for (let i = 0; i < 3; i++) {
    x.strokeRect(1240, 240 + i * 200, 150, 14)
    x.beginPath()
    x.moveTo(1240, 254 + i * 200)
    x.lineTo(1262, 440 + i * 200)
    x.moveTo(1390, 254 + i * 200)
    x.lineTo(1368, 440 + i * 200)
    x.stroke()
  }
  // street + lamppost
  x.fillStyle = '#0e1219'
  x.fillRect(0, 920, W, 160)
  x.fillStyle = 'rgba(120,150,200,0.05)'
  for (let i = 0; i < 6; i++) {
    x.beginPath()
    x.ellipse(200 + i * 300, 960 + (i % 3) * 34, 90, 8, 0, 0, TAU)
    x.fill()
  }
  x.fillStyle = '#0a0806'
  x.fillRect(1700, 560, 12, 380)
  glowDot(x, 1706, 548, 80, '255,206,130', 0.4)
  x.fillStyle = '#ffdf9e'
  x.beginPath()
  x.ellipse(1706, 548, 7, 10, 0, 0, TAU)
  x.fill()
  return c
}
// Wigs raining from the tenement sky; pure in lt.
export function rainWigs(x, lt) {
  for (let i = 0; i < 15; i++) {
    const sp = 620 + hash(i * 13) * 420
    const rx = 120 + hash(i * 7 + 3) * 1560 + Math.sin(lt * 2 + i) * 30
    const ry = ((lt * sp + hash(i * 5) * 1400) % 1500) - 140
    if (ry > 1000) continue
    const tint = hash(i * 17) > 0.8 ? 'gold' : 'crimson'
    x.save()
    x.globalAlpha = ry > 880 ? cl((1010 - ry) / 130) : 1
    wig(x, rx, ry, 54 + hash(i) * 30, hash(i * 3) * TAU + lt * (1 + hash(i)), Math.sin(lt * 3 + i) * 0.5, { tint })
    x.restore()
  }
}
// (f) parade: festive street bake (crowd + bunting baked), pole + wig + confetti live.
export function paradeBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#1c1408')
  g.addColorStop(0.6, '#2c1e0c')
  g.addColorStop(1, '#191106')
  x.fillStyle = g
  x.fillRect(0, 0, W, H)
  // warm facades
  for (const [bx, bw2, bc] of [[0, 560, '#241a10'], [620, 700, '#2a1d0e'], [1380, 540, '#221809']]) {
    x.fillStyle = bc
    x.fillRect(bx, 90, bw2, 800)
    x.fillStyle = 'rgba(255,214,150,0.4)'
    for (let i = 0; i < 4; i++) {
      const wx = bx + 60 + i * 130, wy = 190 + (i % 2) * 180
      if (wx + 60 < bx + bw2) {
        x.globalAlpha = 0.5
        x.fillRect(wx, wy, 56, 92)
        x.globalAlpha = 1
      }
    }
  }
  // bunting strings
  for (const [y0, y1] of [[120, 210], [170, 120]]) {
    x.strokeStyle = 'rgba(20,12,6,0.8)'
    x.lineWidth = 4
    x.beginPath()
    x.moveTo(0, y0)
    x.quadraticCurveTo(960, y1 + 140, 1920, y0)
    x.stroke()
    for (let i = 0; i < 18; i++) {
      const u = (i + 0.5) / 18
      const fx = lerp(0, 1920, u)
      const fy = lerp(y0, y0, u) + Math.sin(Math.PI * u) * (140 + y1 - y0)
      x.fillStyle = ['#c9a44a', '#a8282a', '#e2d8c4'][i % 3]
      x.beginPath()
      x.moveTo(fx - 13, fy)
      x.lineTo(fx + 13, fy)
      x.lineTo(fx, fy + 26)
      x.closePath()
      x.fill()
    }
  }
  // street
  x.fillStyle = '#1c140a'
  x.fillRect(0, 890, W, 190)
  // crowd silhouettes — bare heads, the razored city
  x.fillStyle = '#0e0a05'
  for (let i = 0; i < 12; i++) {
    const cx = 60 + i * 165 + hash(i * 7) * 40
    const s = 0.8 + hash(i * 3) * 0.5
    x.beginPath()
    x.arc(cx, 990, 26 * s, 0, TAU)
    x.fill()
    x.fillRect(cx - 34 * s, 1010, 68 * s, 90)
    x.fillRect(cx - 44 * s, 930 + hash(i) * 30, 9 * s, 60) // raised arm
    x.fillStyle = 'rgba(244,216,150,0.22)' // bald scalps catch the sun
    x.beginPath()
    x.ellipse(cx - 8 * s, 978 - 6 * s, 10 * s, 5 * s, -0.5, 0, TAU)
    x.fill()
    x.fillStyle = '#0e0a05'
  }
  // two big bare heads, front row
  for (const [hx2, hy2, hs] of [[236, 1082, 1.7], [1672, 1092, 1.9]]) {
    x.fillStyle = '#141008'
    x.beginPath()
    x.arc(hx2, hy2, 46 * hs, 0, TAU)
    x.fill()
    x.fillStyle = 'rgba(244,216,150,0.3)'
    x.beginPath()
    x.ellipse(hx2 - 15 * hs, hy2 - 17 * hs, 18 * hs, 8 * hs, -0.5, 0, TAU)
    x.fill()
  }
  return c
}
// Confetti; pure in lt.
export function confetti(x, lt, seed = 5, n = 26) {
  const cols = ['#e9c05a', '#c8424a', '#e2d8c4', '#7ab4c9']
  for (let i = 0; i < n; i++) {
    const sp = 240 + hash(seed + i * 7) * 320
    const cx = hash(seed + i * 3) * W + Math.sin(lt * 2.2 + i) * 44
    const cy = ((lt * sp + hash(seed + i * 5) * 1400) % 1400) - 100
    x.save()
    x.globalAlpha = cy > 940 ? cl((1080 - cy) / 140) : 1
    x.translate(cx, cy)
    x.rotate(lt * (2 + hash(i)) + i)
    x.fillStyle = cols[i % 4]
    x.fillRect(-7, -4, 14, 8)
    x.restore()
  }
}
// (g) sign: barber shopfront bake; neon letters drawn live.
export function signBake() {
  const c = canvas(W, H), x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0b0d12')
  g.addColorStop(0.6, '#14100c')
  g.addColorStop(1, '#0d0a08')
  x.fillStyle = g
  x.fillRect(0, 0, W, H)
  // shopfront
  x.fillStyle = '#1a120c'
  x.fillRect(420, 120, 1080, 820)
  x.fillStyle = '#0e0906'
  x.fillRect(400, 96, 1120, 30)
  // door + window (dim interior)
  x.fillStyle = '#0a0806'
  x.fillRect(800, 520, 240, 420)
  x.fillStyle = 'rgba(255,206,130,0.10)'
  x.fillRect(816, 536, 208, 200)
  x.fillStyle = '#ba9248'
  x.beginPath()
  x.arc(1012, 740, 8, 0, TAU)
  x.fill()
  x.fillStyle = '#0a0806'
  x.fillRect(1140, 520, 300, 300)
  x.fillStyle = 'rgba(255,206,130,0.07)'
  x.fillRect(1156, 536, 268, 268)
  // the dark SIGN board (letters live)
  x.fillStyle = '#080604'
  rr(x, 560, 190, 800, 250, 26)
  x.fill()
  x.strokeStyle = '#3a2a16'
  x.lineWidth = 10
  rr(x, 566, 196, 788, 238, 22)
  x.stroke()
  for (let i = 0; i < 6; i++) {
    x.fillStyle = 'rgba(214,170,110,0.16)'
    x.beginPath()
    x.arc(600 + i * 144, 315, 7, 0, TAU)
    x.fill()
  }
  // barber pole under the sign (stripes live)
  x.fillStyle = '#d8d2c4'
  x.fillRect(560, 520, 84, 330)
  x.fillStyle = '#2c2c34'
  x.fillRect(554, 508, 96, 16)
  x.fillRect(554, 842, 96, 16)
  // pavement
  x.fillStyle = '#141009'
  x.fillRect(0, 940, W, 140)
  for (let i = 0; i < 5; i++) {
    x.fillStyle = 'rgba(0,0,0,0.4)'
    x.fillRect(0, 950 + i * 26, W, 3)
  }
  return c
}
// Neon FLOW letters flickering on; gag 0..1 drives the stagger; pure in lt.
export function neonFLOW(x, lt, gag) {
  const word = 'FLOW'
  x.save()
  x.font = '700 168px Anton'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  const widths = []
  let total = 0
  for (const ch of word) {
    const w2 = x.measureText(ch).width
    widths.push(w2)
    total += w2
  }
  total += 46 * (word.length - 1)
  let cx = 960 - total / 2
  for (let i = 0; i < word.length; i++) {
    const onT = gag * 3 - i * 0.55
    let a = 0
    if (onT > 0) a = hash(i * 13 + Math.floor(lt * 26)) > 0.24 ? 1 : 0.2
    const lx = cx + widths[i] / 2
    x.save()
    if (a > 0.5) {
      x.shadowColor = '#ff5a4a'
      x.shadowBlur = 46
      x.fillStyle = '#ffd9c8'
      x.fillText(word[i], lx, 318)
    } else if (a > 0) {
      x.shadowColor = '#ff5a4a'
      x.shadowBlur = 14
      x.fillStyle = 'rgba(255,120,100,0.35)'
      x.fillText(word[i], lx, 318)
    } else {
      x.strokeStyle = 'rgba(180,80,70,0.22)'
      x.lineWidth = 3
      x.strokeText(word[i], lx, 318)
    }
    x.restore()
    cx += widths[i] + 46
  }
  if (gag > 0.2) glowDot(x, 960, 315, 420, '255,110,80', 0.10 * Math.min(1, gag * 2) * (0.8 + 0.2 * Math.sin(lt * 22)))
  x.restore()
}

// ---------------- study pose helpers (pure drawRemy opts) ----------------
// Bonasera's walk→bow→tremble→kneel: returns drawRemy opts for film-time g.
export function bonaseraOpts(g) {
  const bow = seg(g, 6.0, 7.2) * (0.2 + 0.1 * seg(g, 18.8, 20.2))
  const walking = g >= 1.6 && g < 6.0
  const s = Math.sin(g * 8.2)
  return walking
    ? { lift: [Math.round(Math.max(0, s) * 7), Math.round(Math.max(0, -s) * 7)], stride: [Math.round(s * 3), Math.round(-s * 3)], lean: 0.06 }
    : { lift: [2, 0], stride: [1, 0], lean: bow }
}
// A dark cassock + white collar + gold cross over a sprite's torso: reads PRIEST.
export function priestRobe(x, cx, feet, s) {
  const topY = feet - 78 * s
  x.save()
  x.fillStyle = '#141419'
  x.beginPath()
  x.moveTo(cx - 30 * s, topY)
  x.quadraticCurveTo(cx, topY - 10 * s, cx + 30 * s, topY)
  x.lineTo(cx + 40 * s, feet)
  x.lineTo(cx - 40 * s, feet)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(224,190,130,0.08)'
  x.fillRect(cx - 34 * s, topY, 14 * s, feet - topY)
  x.fillStyle = '#e8e2d4' // collar
  x.fillRect(cx - 10 * s, topY + 2 * s, 20 * s, 7 * s)
  x.strokeStyle = '#c9b06a' // stole edges
  x.lineWidth = 4 * s
  x.beginPath()
  x.moveTo(cx - 16 * s, topY + 4 * s)
  x.lineTo(cx - 22 * s, feet - 30 * s)
  x.moveTo(cx + 16 * s, topY + 4 * s)
  x.lineTo(cx + 22 * s, feet - 30 * s)
  x.stroke()
  x.fillStyle = '#c9b06a' // little cross
  x.fillRect(cx - 2 * s, topY + 26 * s, 4 * s, 12 * s)
  x.fillRect(cx - 6 * s, topY + 30 * s, 12 * s, 4 * s)
  x.restore()
}
// Asleep: skin covers + lash lines over a sprite's open eyes. faceRow/dx calibrated
// per rig (116-row near sprites); skin sampled as a hex.
export function closedEyes(x, cx, feet, s, faceRow, dx, skin = '#6e4a28') {
  const ey = feet - (114 - faceRow) * s
  x.save()
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * dx * s
    x.fillStyle = skin
    x.fillRect(ex - 9 * s, ey - 8 * s, 18 * s, 17 * s)
    x.strokeStyle = '#241408'
    x.lineWidth = 3 * s
    x.beginPath()
    x.moveTo(ex - 8 * s, ey)
    x.quadraticCurveTo(ex, ey + 4 * s, ex + 8 * s, ey)
    x.stroke()
  }
  x.restore()
}
