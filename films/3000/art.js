// 3000 — art.js. Full-res painted stage (pirates-cabald lineage): rig prep
// (sword strip per remember-the-flow, cuirass/silk/wicker repaints, gold ornaments),
// prop + costume painters (spear, hoplon, cape, torch, barbershop pole, Immortal
// chrome masks), the procedural razor-wolf, analytic particle fields (ash, snow,
// embers, the falling razor-storm), impact fx, and the six baked stages painted
// ONCE in build() (called from prepare). Every painter a pure function of time —
// hash/rng only, no Math.random, no state between frames.
import { W, H, hash, rng } from 'filmkit/lib.js'
import { canvas } from '../remy-bros/art.js'

export const OS = 220          // overscan painted around every stage for camera moves
export const BAR = 138         // 2.39:1 letterbox bar height (band y 138-942)

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

// ---------------- palette: bronze / sepia / ash ----------------
export const PAL = {
  emberSky0: '#2a1410', emberSky1: '#7a3218', emberSky2: '#c86428', emberSky3: '#e89a4a',
  sea0: '#0e2426', sea1: '#16383c', sea2: '#1e4a4a', seaGlint: '#e8b46a',
  sand: '#a8906a', sandHi: '#c4ac84', sandLo: '#7a6448',
  rock: '#54382a', rockLit: '#7a5236', rockShade: '#33221a',
  bronze: '#8a6a3a', bronzeHi: '#c9a45c', bronzeDeep: '#4a3418',
  gold: '#e0b050', goldHi: '#f6dc8a', goldDeep: '#8a5f1c',
  crimson: '#a02818', crimsonHi: '#c84a2a', crimsonDeep: '#5e140c',
  ash: '#b8a888', dust: '#9a8462', smoke: '#4a4038',
  bark: '#3a2a1a', steel: '#aab6c2', steelHi: '#e2eaf2',
  night0: '#0c0a12', night1: '#181224', hairSil: '#141018',
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

// Strip the greatsword baked into hero 42's near sprite — adaptation EXACTLY per
// films/remember-the-flow/art.js: per scanline drop the detached left-edge run
// (blade/guard/grip) when a >=3px transparent gap separates it from the body, then
// clear the left 23 columns of blade-family colour (blue-grey blade / yellow guard);
// warm hair/skin survives. Returns a fresh rig with a rebuilt white silhouette.
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

// Keep only the largest 4-connected alpha component (pirates-cabald keepMain):
// drops Queen 12's floating tan cutout slab + dark background patches without
// hard-cutting hair that genuinely touches the head.
export function keepMain(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const n = R.w * R.h
  const seen = new Uint8Array(n)
  const alpha = (i) => p[i * 4 + 3] > 8
  let best = null, bestN = 0
  for (let s = 0; s < n; s++) {
    if (seen[s] || !alpha(s)) continue
    const comp = [s]
    seen[s] = 1
    for (let h2 = 0; h2 < comp.length; h2++) {
      const i = comp[h2], xx = i % R.w, y = (i / R.w) | 0
      for (const j of [y > 0 ? i - R.w : -1, y < R.h - 1 ? i + R.w : -1, xx > 0 ? i - 1 : -1, xx < R.w - 1 ? i + 1 : -1]) {
        if (j >= 0 && !seen[j] && alpha(j)) { seen[j] = 1; comp.push(j) }
      }
    }
    if (comp.length > bestN) { bestN = comp.length; best = comp }
  }
  if (!best) return { ...R, c }
  const keep = new Uint8Array(n)
  for (const i of best) keep[i] = 1
  for (let i = 0; i < n; i++) if (!keep[i]) p[i * 4 + 3] = 0
  x.putImageData(d, 0, 0)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// 2487's stray vertical line at sprite-left: clear left-column pixels that are
// horizontally detached (nothing opaque within 3px to their right on the row).
export function trimStray(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  for (let y = 0; y < R.h; y++)
    for (let xx = 0; xx < 4; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] === 0) continue
      let near = false
      for (let k = 1; k <= 3; k++) if (xx + k < R.w && p[(y * R.w + xx + k) * 4 + 3] > 8) near = true
      if (!near) p[i + 3] = 0
    }
  x.putImageData(d, 0, 0)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Bronze cuirass baked over the torso (covers 42's "My Second Rodeo" print and
// unifies the squad). Tapered plate — narrow waist, shoulder caps — in DARK
// bronze with a restrained gold rim, so it never reads as a bright gold slab.
export function cuirass(R, o = {}) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const cx = R.cx, y0 = R.top + 40, y1 = R.top + 100
  const wTop = 24, wBot = 18
  const bronze = o.tint ?? '#6a4e2c', hi = o.hi ?? '#96733e', deep = o.deep ?? '#3c2a14'
  x.save()
  x.translate(cx, 0)
  const plate = () => {
    x.beginPath()
    x.moveTo(-wTop, y0)
    x.quadraticCurveTo(-wTop - 4, (y0 + y1) / 2, -wBot, y1)
    x.lineTo(wBot, y1)
    x.quadraticCurveTo(wTop + 4, (y0 + y1) / 2, wTop, y0)
    x.closePath()
  }
  plate()
  const g = x.createLinearGradient(-wTop, y0, wTop, y1)
  g.addColorStop(0, deep); g.addColorStop(0.32, bronze); g.addColorStop(0.55, hi); g.addColorStop(1, deep)
  x.fillStyle = g
  x.fill()
  // pectoral etches + centre ridge
  x.strokeStyle = css(hexRgb(deep), 0.85)
  x.lineWidth = 1.6
  x.beginPath()
  x.moveTo(-12, y0 + 12); x.quadraticCurveTo(0, y0 + 18, 12, y0 + 12)
  x.moveTo(-10, y0 + 27); x.quadraticCurveTo(0, y0 + 32, 10, y0 + 27)
  x.moveTo(-6, y0 + 42); x.quadraticCurveTo(0, y0 + 46, 6, y0 + 42)
  x.moveTo(0, y0 + 2); x.lineTo(0, y1 - 2)
  x.stroke()
  // restrained gold rim
  x.strokeStyle = css(hexRgb('#c9a45c'), 0.8)
  x.lineWidth = 1.6
  plate()
  x.stroke()
  // shoulder caps + straps
  x.fillStyle = '#4e3a20'
  x.beginPath(); x.ellipse(-wTop - 3, y0 + 4, 6, 8, -0.3, 0, 7); x.fill()
  x.beginPath(); x.ellipse(wTop + 3, y0 + 4, 6, 8, 0.3, 0, 7); x.fill()
  x.fillStyle = '#2e2012'
  x.fillRect(-wTop - 6, y0 - 2, 6, 12)
  x.fillRect(wTop, y0 - 2, 6, 12)
  x.restore()
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Xerxes: god-king gold on the plain black tee. Per-pixel: any cool/blue-grey
// hair remnant on the crown maps to his pale skin (properly bald), then a gold
// circlet, heavy collar, waist belt and hem trim — all centred, nothing floats.
export function gildXerxes(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const skinA = hexRgb('#e2c2a4'), skinB = hexRgb('#b8946e')
  for (let y = R.top; y < R.top + 44; y++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] < 8) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      const L = (r + g + b) / 765
      // crown band: everything opaque up there is scalp or hair -> skin
      const crown = y <= R.top + 16
      // lower: cool fringes or saturated warm tufts; dark brows survive
      const fringe = b >= r + 4 && b > 60
      const tuft = r > 180 && g < 145 && b < 105
      if (crown || ((fringe || tuft) && L > 0.2)) {
        const col = mix(skinB, skinA, cl((L - 0.2) / 0.5))
        p[i] = col[0]; p[i + 1] = col[1]; p[i + 2] = col[2]
      }
    }
  x.putImageData(d, 0, 0)
  const gold = (fx, fy, fw, fh) => {
    const g = x.createLinearGradient(fx, fy, fx, fy + fh)
    g.addColorStop(0, PAL.goldHi); g.addColorStop(0.5, PAL.gold); g.addColorStop(1, PAL.goldDeep)
    x.fillStyle = g
    x.fillRect(fx, fy, fw, fh)
  }
  // circlet across the crown
  gold(R.cx - 15, R.top + 9, 30, 4)
  x.fillStyle = PAL.goldHi
  x.beginPath(); x.arc(R.cx, R.top + 11, 2.2, 0, 7); x.fill()
  // heavy collar at the neck base + chest medallion (covers the tee's small print)
  gold(R.cx - 15, R.top + 50, 30, 6)
  gold(R.cx - 9, R.top + 60, 22, 12)
  x.fillStyle = PAL.goldHi
  x.beginPath(); x.arc(R.cx, R.top + 62, 3.4, 0, 7); x.fill()
  x.fillStyle = PAL.goldDeep
  x.beginPath(); x.arc(R.cx, R.top + 62, 1.5, 0, 7); x.fill()
  // broad belt + tee hem trim
  gold(R.cx - 18, R.top + 94, 36, 6)
  gold(R.cx - 17, R.top + 106, 34, 3)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Emissary 1264: black tee + pink splatter -> Persian silks. Near-black neutral
// pixels remap to a deep crimson-purple robe ramp; pink splatter to gold trim;
// warm skin and the moustache survive untouched.
export function silkRobe(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const darkA = hexRgb('#3a1024'), darkB = hexRgb('#6e2038')
  const trimA = hexRgb('#c8912e'), trimB = hexRgb('#f0cc6a')
  for (let i = 0; i < R.w * R.h; i++) {
    const a4 = i * 4 + 3
    if (p[a4] < 8) continue
    const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2]
    const L = (r + g + b) / 765
    if (L < 0.34 && Math.abs(r - g) < 26 && Math.abs(g - b) < 26) {
      const col = mix(darkA, darkB, cl(L / 0.34))
      p[i * 4] = col[0]; p[i * 4 + 1] = col[1]; p[i * 4 + 2] = col[2]
    } else if (r > 150 && b > 110 && g < r - 24 && b > g) {
      const col = mix(trimA, trimB, cl((r - 150) / 90))
      p[i * 4] = col[0]; p[i * 4 + 1] = col[1]; p[i * 4 + 2] = col[2]
    }
  }
  x.putImageData(d, 0, 0)
  // gold sash at the waist
  x.fillStyle = PAL.gold
  x.save(); x.translate(R.cx, R.top + 92); x.rotate(-0.1)
  x.fillRect(-19, -2, 38, 5)
  x.restore()
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Queen Flowgo 12 cleanup (casting.md): drop the floating tan cutout rectangle
// (native box x>=44, y<=28 — it survives keepMain by touching the hair), lift
// dark grey patch remnants out of the head band, and repaint the speckled blue
// knit to a regal purple gown ramp. Rebuilds the white silhouette.
export function queenClean(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const gownA = hexRgb('#4a2050'), gownB = hexRgb('#8a4a80')
  for (let y = 0; y < R.h; y++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] === 0) continue
      // the artifact box, top-right
      if (xx >= 44 && y <= 28) { p[i + 3] = 0; continue }
      const r = p[i], g = p[i + 1], b = p[i + 2]
      const L = (r + g + b) / 765
      // dark grey cutout patches around the hair (head band only)
      if (y <= 34 && L < 0.32 && Math.abs(r - b) < 30) { p[i + 3] = 0; continue }
      // speckled blue knit -> regal purple gown
      if (b > r + 18 && b > 70) {
        const col = mix(gownA, gownB, cl((L - 0.2) / 0.5))
        p[i] = col[0]; p[i + 1] = col[1]; p[i + 2] = col[2]
      }
    }
  x.putImageData(d, 0, 0)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Persian slave wave: cool cloth -> desaturated bronze-grey mass (wicker-army read);
// warm skin survives. Camo greens grey too. Optional pale wicker panel baked on
// the left forearm.
export function wickerMass(R, o = {}) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const lo = hexRgb('#5a5044'), hi = hexRgb('#a89878')
  for (let i = 0; i < R.w * R.h; i++) {
    if (p[i * 4 + 3] < 8) continue
    const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2]
    const cool = b > r + 6
    const green = g > r + 10 && g > b + 10
    const pale = Math.abs(r - b) < 14 && (r + g + b) / 765 > 0.3
    if (cool || green || pale) {
      const L = cl((r + g + b) / 765)
      const col = mix(lo, hi, cl((L - 0.12) / 0.55))
      p[i * 4] = col[0]; p[i * 4 + 1] = col[1]; p[i * 4 + 2] = col[2]
    }
  }
  x.putImageData(d, 0, 0)
  if (o.shield) {
    // small wicker panel strapped to the left arm (viewer left)
    const sx = R.cx - 26, sy = R.top + 62
    x.fillStyle = '#8a744e'
    x.save(); x.translate(sx, sy); x.rotate(-0.12)
    x.beginPath(); x.ellipse(0, 0, 11, 15, 0, 0, 7); x.fill()
    x.strokeStyle = '#5e4a2c'; x.lineWidth = 1.4
    for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(k * 4, -13); x.lineTo(k * 4, 13); x.stroke() }
    for (const k of [-8, 0, 8]) { x.beginPath(); x.moveTo(-10, k); x.lineTo(10, k); x.stroke() }
    x.restore()
  }
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Downscale a rig (young Leonidhair = stripped 42 at ~0.55) with smoothing ON so
// the mini reads painted, not nearest-holed. All rig fields scale.
export function miniRig(R, k) {
  const w = Math.max(1, Math.round(R.w * k)), h = Math.max(1, Math.round(R.h * k))
  const c = canvas(w, h), x = c.getContext('2d')
  x.imageSmoothingEnabled = true
  x.drawImage(R.c, 0, 0, R.w, R.h, 0, 0, w, h)
  const sc = (v) => v * k
  return { ...R, c, sil: whiteSil(c, w, h), w, h, legTop: sc(R.legTop), cx: sc(R.cx), top: sc(R.top), bottom: sc(R.bottom) }
}

// ============================== costume + prop painters ==============================

// crown y (scalp line) for a rig drawn with feet at `feet` and vertical scale sy.
export const crownY = (rig, feet, sy) => feet - (rig.bottom - rig.top + 1) * sy + 7 * sy

// Crimson cape drawn BEHIND the sprite (pirates mane-behind trick): anchored at
// the SHOULDERS (call with shY = crownY + 44*sy), billowing on seeded sine
// fields — a slim tapered drape, never a slab. Pure f(t), never integrating.
export function cape(ctx, x, shY, s, t, seed, col, o = {}) {
  const k = o.k ?? 1
  if (k <= 0.02) return
  const gust = o.gust ?? 1
  const kick = o.kick ?? 0 // snap: billow swings toward the front and spikes, decays fast
  const dir = (o.dir ?? -1) * (1 - kick * 0.85)
  const len = (o.len ?? 92) * s * k
  const wid = (o.wid ?? 30) * s
  const amp = 1 + kick * 1.7
  const w1 = Math.sin(t * 2.3 + seed) * 6 * gust * amp
  const w2 = Math.sin(t * 3.1 + seed * 1.7 + 2) * 9 * gust * amp
  const w3 = Math.sin(t * 1.5 + seed * 2.9 + 5) * 12 * gust * amp
  const baseC = typeof col === 'string' && col.startsWith('#') ? hexRgb(col) : [160, 40, 24]
  const darkC = mix(baseC, [10, 4, 2], 0.5)
  const litC = mix(baseC, [255, 220, 170], 0.4)
  const x0 = x + dir * 4 * s, y0 = shY
  const hemY = y0 + len - kick * 26 * s
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x0 - wid * 0.55, y0)
  ctx.bezierCurveTo(x0 - wid * 1.05 + w1, y0 + len * 0.42, x0 - wid * 0.9 + w2, hemY - len * 0.2, x0 - wid * 0.6 + w3 * 0.6, hemY)
  // hem: torn notches when o.torn
  if (o.torn) {
    const r = rng(seed * 31 + 7)
    let hx = x0 - wid * 0.6 + w3 * 0.6
    for (let i = 0; i < 5; i++) {
      const nx = hx + (wid * 1.2 / 5) * (0.7 + r() * 0.6)
      ctx.lineTo((hx + nx) / 2, hemY - (5 + r() * 13) * s)
      ctx.lineTo(nx, hemY + (r() - 0.5) * 6)
      hx = nx
    }
  } else {
    ctx.quadraticCurveTo(x0 + w3 * 0.4, hemY + 5 * s, x0 + wid * 0.42 + w2 * 0.5, hemY - 3 * s)
  }
  ctx.bezierCurveTo(x0 + wid * 0.72 + w2, y0 + len * 0.46, x0 + wid * 0.5 + w1, y0 + len * 0.18, x0 + wid * 0.34, y0)
  ctx.closePath()
  ctx.fillStyle = col
  ctx.fill()
  ctx.fillStyle = css(darkC, 0.9)
  ctx.beginPath()
  ctx.moveTo(x0 + wid * 0.34, y0)
  ctx.bezierCurveTo(x0 + wid * 0.5 + w1, y0 + len * 0.18, x0 + wid * 0.72 + w2, y0 + len * 0.46, x0 + wid * 0.42 + w2 * 0.5, hemY - 3 * s)
  ctx.quadraticCurveTo(x0 + wid * 0.1 + w3 * 0.3, hemY - len * 0.08, x0 - w1 * 0.2, hemY - len * 0.26)
  ctx.bezierCurveTo(x0 + wid * 0.2 + w2, y0 + len * 0.34, x0 + wid * 0.28 + w1, y0 + len * 0.1, x0 + wid * 0.34, y0)
  ctx.closePath()
  ctx.fill()
  // lit inner edge
  ctx.strokeStyle = css(litC, 0.45)
  ctx.lineWidth = 2 * s
  ctx.beginPath()
  ctx.moveTo(x0 - wid * 0.55, y0 + 2)
  ctx.bezierCurveTo(x0 - wid * 1.05 + w1, y0 + len * 0.42, x0 - wid * 0.9 + w2, hemY - len * 0.2, x0 - wid * 0.55 + w3 * 0.6, hemY - 2 * s)
  ctx.stroke()
  ctx.restore()
}

// Procedural spear: (x,y) is the grip; ang 0 = vertical, tip up; positive tilts right.
export function spear(ctx, x, y, ang, s, o = {}) {
  const len = (o.len ?? 150) * s
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)
  // shaft with grain bands
  const g = ctx.createLinearGradient(-2.4 * s, 0, 2.4 * s, 0)
  g.addColorStop(0, '#241a10'); g.addColorStop(0.45, '#4a3620'); g.addColorStop(0.6, '#5a442a'); g.addColorStop(1, '#2a1e12')
  ctx.fillStyle = g
  ctx.fillRect(-2.2 * s, -len * 0.72, 4.4 * s, len * 0.86)
  // grip wrap
  ctx.fillStyle = '#2a1c10'
  ctx.fillRect(-2.6 * s, -len * 0.1, 5.2 * s, len * 0.16)
  for (let i = 0; i < 4; i++) ctx.fillRect(-2.6 * s, -len * 0.1 + i * len * 0.045, 5.2 * s, 1.6 * s)
  // leaf head: bronze socket + steel leaf with lit edge
  ctx.fillStyle = PAL.bronze
  ctx.fillRect(-3 * s, -len * 0.78, 6 * s, 7 * s)
  ctx.fillStyle = PAL.steel
  ctx.beginPath()
  ctx.moveTo(-4.6 * s, -len * 0.78)
  ctx.quadraticCurveTo(-5 * s, -len * 0.9, 0, -len)
  ctx.quadraticCurveTo(5 * s, -len * 0.9, 4.6 * s, -len * 0.78)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = PAL.steelHi
  ctx.beginPath()
  ctx.moveTo(-1.4 * s, -len * 0.8)
  ctx.quadraticCurveTo(-1.8 * s, -len * 0.92, 0, -len * 0.99)
  ctx.lineTo(0.6 * s, -len * 0.8)
  ctx.closePath()
  ctx.fill()
  // butt spike
  ctx.fillStyle = PAL.bronzeDeep
  ctx.beginPath()
  ctx.moveTo(-2 * s, len * 0.14); ctx.lineTo(0, len * 0.2); ctx.lineTo(2 * s, len * 0.14)
  ctx.closePath(); ctx.fill()
  ctx.restore()
}

// Hoplon shield: bronze rim, leathered face, gold boss, concentric grooves.
export function hoplon(ctx, x, y, s, o = {}) {
  const r = (o.r ?? 26) * s
  ctx.save()
  ctx.translate(x, y)
  if (o.rot) ctx.rotate(o.rot)
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.15, 0, 0, r)
  g.addColorStop(0, '#a8865a'); g.addColorStop(0.55, '#7a5c38'); g.addColorStop(1, '#4a3620')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill()
  ctx.strokeStyle = PAL.bronzeHi
  ctx.lineWidth = r * 0.16
  ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, 7); ctx.stroke()
  ctx.strokeStyle = css(hexRgb(PAL.bronzeDeep), 0.7)
  ctx.lineWidth = 1.4 * s
  ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, 7); ctx.stroke()
  ctx.beginPath(); ctx.arc(0, 0, r * 0.44, 0, 7); ctx.stroke()
  const bg = ctx.createRadialGradient(-r * 0.12, -r * 0.12, 1, 0, 0, r * 0.26)
  bg.addColorStop(0, PAL.goldHi); bg.addColorStop(0.6, PAL.gold); bg.addColorStop(1, PAL.goldDeep)
  ctx.fillStyle = bg
  ctx.beginPath(); ctx.arc(0, 0, r * 0.24, 0, 7); ctx.fill()
  ctx.restore()
}

// Comb prop (the wolf-flash and the camp whetstone gag).
export function comb(ctx, x, y, rot, s) {
  ctx.save()
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s)
  ctx.fillStyle = '#2a2436'
  ctx.fillRect(-20, -3, 40, 8)
  ctx.fillStyle = '#d8bc6a'
  for (let i = 0; i < 7; i++) ctx.fillRect(-17 + i * 5, 4, 2.6, 8)
  ctx.restore()
}

// Marching/standing pose from a phase: planted strides, alternate leg lift.
export const walkCyc = (ph, amp = 5) => {
  const sn = Math.sin(ph)
  return { lift: [Math.round(Math.max(0, sn) * amp), Math.round(Math.max(0, -sn) * amp)], stride: [Math.round(sn * 2), Math.round(-sn * 2)], lean: 0.05 }
}
export const stand = { lift: [2, 0], stride: [1, 0], lean: 0.02 }

// Torch: dark pole + living flame (pure f(t)) + halo.
export function torch(ctx, x, y, s, t, seed) {
  ctx.save()
  ctx.fillStyle = '#241a10'
  ctx.fillRect(x - 2 * s, y, 4 * s, 46 * s)
  const fl = Math.sin(t * 11 + seed * 9) * 0.5 + Math.sin(t * 17.3 + seed * 3) * 0.5
  const fh = (13 + fl * 3) * s
  const halo = ctx.createRadialGradient(x, y - 6 * s, 2, x, y - 6 * s, 60 * s)
  halo.addColorStop(0, 'rgba(255,176,80,0.4)')
  halo.addColorStop(1, 'rgba(255,176,80,0)')
  ctx.fillStyle = halo
  ctx.fillRect(x - 60 * s, y - 66 * s, 120 * s, 120 * s)
  ctx.fillStyle = '#ff9a3a'
  ctx.beginPath()
  ctx.moveTo(x - 5 * s, y)
  ctx.quadraticCurveTo(x - 6 * s + fl * 2 * s, y - fh * 0.6, x + fl * 2 * s, y - fh)
  ctx.quadraticCurveTo(x + 6 * s + fl * 2 * s, y - fh * 0.6, x + 5 * s, y)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffd98a'
  ctx.beginPath()
  ctx.ellipse(x + fl * s, y - fh * 0.35, 3 * s, 5 * s, 0, 0, 7)
  ctx.fill()
  ctx.restore()
}

// Immortal: black hood + procedural chrome face-mask with an eye slit. glint 0..1
// sweeps a highlight across the chrome.
export function immortalMask(ctx, x, cy, s, t, glint) {
  ctx.save()
  ctx.translate(x, cy)
  ctx.scale(s, s)
  // hood: dark mass around and behind the head
  ctx.fillStyle = '#12100e'
  ctx.beginPath()
  ctx.moveTo(-17, 16)
  ctx.quadraticCurveTo(-20, -14, 0, -19)
  ctx.quadraticCurveTo(20, -14, 17, 16)
  ctx.quadraticCurveTo(8, 8, 0, 9)
  ctx.quadraticCurveTo(-8, 8, -17, 16)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#1e1a16'
  ctx.beginPath()
  ctx.ellipse(-6, -12, 8, 5, -0.5, 0, 7)
  ctx.fill()
  // chrome mask: vertical gradient face plate
  const g = ctx.createLinearGradient(-9, -16, 9, 10)
  g.addColorStop(0, '#7e8ea0'); g.addColorStop(0.35, '#dfe8f2'); g.addColorStop(0.6, '#8a98a8'); g.addColorStop(1, '#4e5a68')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-9, -14)
  ctx.quadraticCurveTo(-11, 2, -5, 10)
  ctx.quadraticCurveTo(0, 14, 5, 10)
  ctx.quadraticCurveTo(11, 2, 9, -14)
  ctx.quadraticCurveTo(0, -18, -9, -14)
  ctx.closePath()
  ctx.fill()
  // eye slit
  ctx.fillStyle = '#0a0c10'
  ctx.fillRect(-7, -8, 14, 3.2)
  ctx.fillStyle = 'rgba(230,240,250,0.5)'
  ctx.fillRect(-7, -8, 14, 1)
  // glint sweep
  if (glint > 0 && glint < 1) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-9, -14)
    ctx.quadraticCurveTo(-11, 2, -5, 10)
    ctx.quadraticCurveTo(0, 14, 5, 10)
    ctx.quadraticCurveTo(11, 2, 9, -14)
    ctx.quadraticCurveTo(0, -18, -9, -14)
    ctx.closePath()
    ctx.clip()
    ctx.globalAlpha = Math.sin(glint * Math.PI)
    ctx.fillStyle = '#ffffff'
    ctx.save()
    ctx.rotate(-0.5)
    ctx.fillRect(-30 + glint * 44, -24, 7, 44)
    ctx.restore()
    ctx.restore()
  }
  ctx.restore()
  void t
}

// Golden wig on a raised cushion (the offer Xerxes makes).
export function wigOffer(ctx, x, y, s, riseK, t) {
  if (riseK <= 0.02) return
  ctx.save()
  ctx.translate(x, y - riseK * 26 * s)
  ctx.scale(s, s)
  // cushion
  ctx.fillStyle = '#7a2438'
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 9, 0, 0, 7); ctx.fill()
  ctx.fillStyle = '#9a3050'
  ctx.beginPath(); ctx.ellipse(0, -3, 24, 7, 0, 0, 7); ctx.fill()
  ctx.fillStyle = PAL.gold
  ctx.fillRect(-22, -6, 44, 3)
  // golden wig: arc of gold locks
  const sway = Math.sin(t * 1.8) * 2
  ctx.fillStyle = PAL.gold
  ctx.beginPath()
  ctx.moveTo(-16, -8)
  ctx.quadraticCurveTo(-20 + sway, -30, -6, -34)
  ctx.quadraticCurveTo(0, -36 + sway, 8, -33)
  ctx.quadraticCurveTo(21 + sway, -28, 17, -8)
  ctx.quadraticCurveTo(10, -14, 0, -13)
  ctx.quadraticCurveTo(-9, -14, -16, -8)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = PAL.goldHi
  for (const [lx, ly] of [[-10, -26], [0, -30], [9, -25]]) {
    ctx.beginPath(); ctx.ellipse(lx, ly, 3.4, 7, 0.2, 0, 7); ctx.fill()
  }
  ctx.restore()
}

// Glowing red-white-blue barbershop pole: cylinder with diagonal stripes that
// rotate with t, glass sheen, gold caps, dark-post bracket; glowK lights the dark.
export function barbershopPole(ctx, x, yBase, s, t, glowK) {
  const w = 30 * s, h = 96 * s, y0 = yBase - h
  ctx.save()
  if (glowK > 0.02) {
    const halo = ctx.createRadialGradient(x, y0 + h / 2, 4, x, y0 + h / 2, 120 * s * (0.6 + glowK * 0.4))
    halo.addColorStop(0, `rgba(255,120,90,${0.34 * glowK})`)
    halo.addColorStop(0.5, `rgba(120,60,160,${0.16 * glowK})`)
    halo.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = halo
    ctx.fillRect(x - 130 * s, y0 - 60 * s, 260 * s, h + 140 * s)
  }
  // wall bracket + post
  ctx.fillStyle = '#18120c'
  ctx.fillRect(x - 3 * s, yBase - 6 * s, 6 * s, 10 * s)
  ctx.fillRect(x - 14 * s, yBase - 10 * s, 28 * s, 6 * s)
  // glass cylinder
  const body = () => {
    ctx.beginPath()
    ctx.moveTo(x - w / 2, y0 + 7 * s)
    ctx.quadraticCurveTo(x - w / 2 - 2 * s, y0 + h / 2, x - w / 2, y0 + h - 7 * s)
    ctx.lineTo(x + w / 2, y0 + h - 7 * s)
    ctx.quadraticCurveTo(x + w / 2 + 2 * s, y0 + h / 2, x + w / 2, y0 + 7 * s)
    ctx.quadraticCurveTo(x, y0 + 1 * s, x - w / 2, y0 + 7 * s)
    ctx.closePath()
  }
  body()
  ctx.save()
  ctx.clip()
  ctx.fillStyle = '#e8e2d2'
  ctx.fillRect(x - w, y0, w * 2, h)
  // rotating diagonal stripes: offset climbs with t, wraps by period
  const period = 26 * s
  const off = ((t * 14 * s) % (period * 3) + period * 3) % (period * 3)
  for (let yy = y0 - period * 3 + off; yy < y0 + h + period; yy += period * 3) {
    ctx.fillStyle = '#c22a2a'
    ctx.beginPath()
    ctx.moveTo(x - w, yy); ctx.lineTo(x + w, yy - 10 * s); ctx.lineTo(x + w, yy + period * 0.52 - 10 * s); ctx.lineTo(x - w, yy + period * 0.52)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#2850c0'
    ctx.beginPath()
    ctx.moveTo(x - w, yy + period); ctx.lineTo(x + w, yy + period * 0.8); ctx.lineTo(x + w, yy + period * 1.32 - 10 * s + 10 * s); ctx.lineTo(x - w, yy + period * 1.32)
    ctx.closePath(); ctx.fill()
  }
  // cylinder shading + glass sheen
  const sh = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0)
  sh.addColorStop(0, 'rgba(20,10,20,0.55)'); sh.addColorStop(0.3, 'rgba(255,255,255,0.05)'); sh.addColorStop(0.55, 'rgba(255,255,255,0.22)'); sh.addColorStop(1, 'rgba(10,6,14,0.6)')
  ctx.fillStyle = sh
  ctx.fillRect(x - w, y0, w * 2, h)
  ctx.restore()
  body()
  ctx.strokeStyle = 'rgba(255,240,220,0.35)'
  ctx.lineWidth = 1.5 * s
  ctx.stroke()
  // gold caps
  for (const cy of [y0 + 4 * s, y0 + h - 4 * s]) {
    const cg = ctx.createLinearGradient(x - w / 2, cy - 6 * s, x + w / 2, cy + 6 * s)
    cg.addColorStop(0, PAL.goldDeep); cg.addColorStop(0.5, PAL.goldHi); cg.addColorStop(1, PAL.goldDeep)
    ctx.fillStyle = cg
    ctx.beginPath(); ctx.ellipse(x, cy, w * 0.58, 6.5 * s, 0, 0, 7); ctx.fill()
  }
  ctx.restore()
}

// ============================== the razor-wolf ==============================
// Fully procedural: grey beast, straight-razor spines along the back, ember eyes.
// phase drives the leg cycle; crouch squashes; baldK grows the razor-clean skin
// stripe where the comb touched; snap tilts the head (hit-stop pose).
export function wolf(ctx, x, y, s, ph, o = {}) {
  const dir = o.dir ?? -1
  const crouch = o.crouch ?? 0
  const baldK = o.bald ?? 0
  const snap = o.snap ?? 0
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(dir * s, s * (1 - crouch * 0.16))
  const legPh = (u) => Math.sin(ph + u * Math.PI)
  // shadow pass drawn by caller; body: haunch -> back -> shoulders
  ctx.fillStyle = '#4e4a48'
  ctx.beginPath()
  ctx.moveTo(-52, -30)
  ctx.quadraticCurveTo(-40, -52, -16, -52)
  ctx.quadraticCurveTo(16, -54, 34, -46)
  ctx.quadraticCurveTo(52, -38, 56, -22)
  ctx.quadraticCurveTo(58, -6, 44, 0)
  ctx.lineTo(-46, 0)
  ctx.quadraticCurveTo(-56, -12, -52, -30)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#5e5a56'
  ctx.beginPath()
  ctx.moveTo(-44, -34)
  ctx.quadraticCurveTo(-20, -48, 12, -46)
  ctx.quadraticCurveTo(30, -42, 40, -30)
  ctx.quadraticCurveTo(20, -36, -8, -36)
  ctx.quadraticCurveTo(-30, -36, -44, -34)
  ctx.closePath()
  ctx.fill()
  // neck + head (snout left = facing the boy when dir = -1 handles flip; head at +x front)
  ctx.save()
  ctx.translate(52, -34)
  ctx.rotate(snap * 0.5 + crouch * 0.35)
  ctx.fillStyle = '#524e4a'
  ctx.beginPath()
  ctx.moveTo(-8, -12)
  ctx.quadraticCurveTo(10, -20, 24, -12)
  ctx.quadraticCurveTo(38, -6, 40, 0)
  ctx.quadraticCurveTo(38, 6, 24, 6)
  ctx.quadraticCurveTo(8, 8, -6, 4)
  ctx.closePath()
  ctx.fill()
  // ears
  ctx.fillStyle = '#3c3836'
  ctx.beginPath(); ctx.moveTo(2, -16); ctx.lineTo(8, -30); ctx.lineTo(14, -15); ctx.closePath(); ctx.fill()
  // ember eye
  const eg = ctx.createRadialGradient(16, -6, 0.5, 16, -6, 5)
  eg.addColorStop(0, '#ffd070'); eg.addColorStop(0.4, '#ff7a20'); eg.addColorStop(1, 'rgba(180,40,10,0)')
  ctx.fillStyle = eg
  ctx.beginPath(); ctx.arc(16, -6, 5, 0, 7); ctx.fill()
  ctx.fillStyle = '#ffe8b0'
  ctx.beginPath(); ctx.arc(16, -6, 1.4, 0, 7); ctx.fill()
  // jaws
  ctx.strokeStyle = '#2a2624'
  ctx.lineWidth = 1.6
  ctx.beginPath(); ctx.moveTo(28, 2); ctx.lineTo(38, 2); ctx.stroke()
  ctx.restore()
  // tail
  ctx.strokeStyle = '#464240'
  ctx.lineWidth = 9
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-50, -26)
  ctx.quadraticCurveTo(-68, -30 + Math.sin(ph * 0.7) * 6, -76, -16)
  ctx.stroke()
  // legs (trot cycle)
  ctx.strokeStyle = '#44403e'
  ctx.lineWidth = 7
  for (const [u, lx] of [[0, -34], [1, -14], [0.5, 20], [1.5, 40]]) {
    const sw = legPh(u) * 7 * (o.moving ?? 1)
    ctx.beginPath()
    ctx.moveTo(lx, -8)
    ctx.quadraticCurveTo(lx + sw, -2, lx + sw * 1.3, 0)
    ctx.stroke()
  }
  // razor spines along the back: straight razors, points up-back
  const razors = [[-38, -48], [-22, -53], [-4, -55], [14, -52], [30, -46]]
  for (const [rx, ry] of razors) {
    ctx.save()
    ctx.translate(rx, ry)
    ctx.rotate(-0.5 + Math.sin(ph * 0.9 + rx) * 0.05)
    ctx.fillStyle = '#c8ccd4'
    ctx.beginPath()
    ctx.moveTo(0, 0); ctx.lineTo(4, -14); ctx.lineTo(6.5, -13); ctx.lineTo(2.5, 0)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#8a8e96'
    ctx.fillRect(4, -3, 9, 3.4)
    ctx.restore()
  }
  // the BALD stripe: skin-pale band where the comb shaved the fur, catches light late
  if (baldK > 0.02) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-30, -34)
    ctx.quadraticCurveTo(-6, -44, 22, -38)
    ctx.lineTo(22, -24)
    ctx.quadraticCurveTo(-4, -30, -30, -22)
    ctx.closePath()
    ctx.clip()
    ctx.fillStyle = `rgba(214,198,182,${0.92 * baldK})`
    ctx.fillRect(-40, -60, 80, 44)
    ctx.fillStyle = `rgba(255,236,214,${0.5 * baldK})`
    ctx.fillRect(-40, -48, 80, 4)
    ctx.restore()
  }
  ctx.restore()
}

// ============================== analytic particle fields ==============================

// Prologue: the single ember of the EMBER cycle (EMBER_PERIOD 2.0) + battlefield ash.
export function emberSingle(ctx, g, period) {
  const cyc = g % period
  const x = 960 + Math.sin(cyc * 1.2 + 1) * 46 + Math.sin(g * 0.35) * 30
  const y = 660 - cyc * 52
  const a = Math.sin((cyc / period) * Math.PI)
  const glow = ctx.createRadialGradient(x, y, 0.5, x, y, 26)
  glow.addColorStop(0, `rgba(255,190,90,${0.9 * a})`)
  glow.addColorStop(0.4, `rgba(255,120,40,${0.4 * a})`)
  glow.addColorStop(1, 'rgba(255,120,40,0)')
  ctx.fillStyle = glow
  ctx.fillRect(x - 26, y - 26, 52, 52)
  ctx.fillStyle = `rgba(255,220,150,${a})`
  ctx.fillRect(x - 1.5, y - 1.5, 3, 3)
}

export function ashFall(ctx, g, n, seed, o = {}) {
  const t = o.t ?? g
  for (let i = 0; i < n; i++) {
    const sp = 26 + hash(i * 3.1 + seed) * 54
    const drift = (hash(i * 7.7 + seed) - 0.5) * 90
    const x = ((hash(i * 13.3 + seed) * 2400 + drift * Math.sin(t * 0.5 + i) + (o.windX ?? 18) * t) % 2360 + 2360) % 2360 - 220
    const y = ((hash(i * 5.9 + seed) * 1100 + t * sp) % 1000 + 1000) % 1000 - 30
    const a = 0.14 + hash(i * 2.3 + seed) * 0.3
    ctx.fillStyle = i % 5 === 0 ? `rgba(255,170,90,${a})` : `rgba(200,190,170,${a})`
    const s2 = 1.6 + hash(i * 11.1) * 2.4
    ctx.fillRect(x, y, s2, s2)
  }
}

// Blizzard: slanted wind streaks + falling snow.
export function blizzard(ctx, t, n, o = {}) {
  const wind = o.wind ?? 340
  for (let i = 0; i < n; i++) {
    const yy = 100 + hash(i * 3.7) * 860
    const sp = wind * (0.6 + hash(i * 9.1) * 0.8)
    const x = ((hash(i * 7.3) * 2600 - t * sp) % 2600 + 2600) % 2600 - 340
    const len = 22 + hash(i * 5.1) * 44
    ctx.strokeStyle = `rgba(240,246,250,${0.1 + hash(i * 2.9) * 0.2})`
    ctx.lineWidth = 1.4 + hash(i * 11.3) * 1.6
    ctx.beginPath()
    ctx.moveTo(x, yy)
    ctx.lineTo(x + len, yy - len * 0.12)
    ctx.stroke()
  }
  for (let i = 0; i < n * 0.7; i++) {
    const sp = 60 + hash(i * 4.9 + 40) * 90
    const x = ((hash(i * 8.7 + 40) * 2400 - t * wind * 0.35) % 2400 + 2400) % 2400 - 240
    const y = ((hash(i * 6.1 + 40) * 1000 + t * sp) % 1000 + 1000) % 1000 - 30
    ctx.fillStyle = `rgba(248,250,252,${0.3 + hash(i * 1.7) * 0.4})`
    ctx.fillRect(x, y, 2.2, 2.2)
  }
}

// Rising embers for battle shots: {seed} analytic, wrap by lifetime.
export function emberRise(ctx, t, n, seed, o = {}) {
  for (let i = 0; i < n; i++) {
    const life = 3 + hash(i * 3.3 + seed) * 4
    const age = ((t * (0.5 + hash(i * 7.1 + seed) * 0.5) + hash(i * 13.7) * life) % life)
    const u = age / life
    const x = ((hash(i * 5.3 + seed) * 2300 + Math.sin(t * 0.8 + i) * 40) % 2300 + 2300) % 2300 - 190
    const y = (o.y1 ?? 940) - u * ((o.y1 ?? 940) - (o.y0 ?? 200))
    const a = Math.sin(u * Math.PI) * (0.25 + hash(i * 9.7) * 0.45)
    ctx.fillStyle = `rgba(255,${140 + hash(i) * 70 | 0},60,${a.toFixed(3)})`
    ctx.fillRect(x, y, 2.4, 2.4)
  }
}

// THE ARROW STORM: thousands of falling scissors / straight razors as a seeded
// analytic stream. O(visible): only seeds whose spawn window covers `now` are
// touched; density (0..1) thins deterministically; roof deflects with sparks.
// o.dip = { at, k }: at a story beat (the snip) the spawn density drops to
// k*density. Glyphs AIRBORNE at `at` are tagged: they keep full opacity and get
// ~3x gravity (accel 2*fall, speed 3x after 1 s), so the sky empties
// PHYSICALLY — glyphs fall out through the roof line or the frame bottom over
// well over a second. No alpha-pop culling anywhere.
export function razorStorm(ctx, now, o = {}) {
  const life = o.life ?? 2.6
  const rate = o.rate ?? 240 // seeds per second at density 1
  const density = o.density ?? 1
  const seed = o.seed ?? 71
  const dip = o.dip ?? null
  const target = dip ? density * dip.k : density
  const snipAt = dip ? dip.at : null
  const tagged = snipAt != null && now > snipAt
  const roofY = o.roofY ?? 1e9
  const roofX0 = o.roofX0 ?? -1e9
  const roofX1 = o.roofX1 ?? 1e9
  // tagged glyphs outlive `life` under gravity — widen the window to every seed
  // spawned in the last `life` before the snip (they are all still airborne)
  const i0 = Math.max(0, Math.floor(((tagged ? snipAt : now) - life) * rate) - 1)
  const i1 = Math.floor(now * rate)
  for (let i = i0; i <= i1; i++) {
    const h1 = hash(i * 7.31 + seed)
    const spawn = i / rate + hash(i * 3.77 + seed) * 0.9
    const age = now - spawn
    if (age < 0) continue
    const isTagged = tagged && spawn < snipAt
    if (!isTagged) {
      if (age > life) continue
      if (h1 > target) continue // post-snip spawns: thinned to k*density
    }
    const fall = 380 + hash(i * 9.47 + seed) * 130
    let y = -50 + age * fall
    const ts = isTagged ? now - snipAt : 0
    // tagged glyphs gain a whisker of weight from the snip instant —
    // continuous with pre-snip motion; the sky empties PHYSICALLY (culled
    // only at the roof line / frame bottom) over ~0.9 s, no alpha-pop culling
    if (isTagged) y += fall * ts + 0.04 * fall * ts * ts
    const x = hash(i * 5.11 + seed) * 2380 - 230 + (o.windX ?? 26) * age
    const spin = hash(i * 11.3 + seed) * 6.28 + age * (1.1 + hash(i * 1.7) * 1.8)
    const kind = hash(i * 13.9 + seed) > 0.45 ? 'razor' : 'scissors'
    if (roofY < 1e8 && x > roofX0 && x < roofX1 && y > roofY + 42) {
      // deflected at the shield roof: a shard skating off + one clink spark.
      // a2 = time since this glyph crossed the roof plane (quadratic for tagged)
      let a2
      if (isTagged && ts > 0) {
        const d0 = snipAt - spawn
        const arg = 1 - d0 + (roofY + 50) / fall
        const u = arg > 1 ? -1 + Math.sqrt(arg) : 0
        a2 = Math.max(0, ts - u)
      } else {
        a2 = age - (roofY + 50) / fall
      }
      if (a2 > 0.5) continue
      const dx = x + a2 * 190
      const dy = roofY + 44 - a2 * 60
      ctx.save()
      ctx.translate(dx, dy)
      ctx.rotate(spin * 0.4 + 1.1)
      ctx.globalAlpha = 1 - a2 / 0.5
      ctx.fillStyle = '#c8ccd4'
      ctx.fillRect(-7, -1.4, 14, 2.8)
      ctx.restore()
      if (a2 < 0.16) {
        ctx.strokeStyle = `rgba(255,224,150,${(1 - a2 / 0.16) * 0.8})`
        ctx.lineWidth = 1.6
        for (let k = 0; k < 3; k++) {
          const an = spin + k * 2.1
          ctx.beginPath()
          ctx.moveTo(x, roofY + 42)
          ctx.lineTo(x + Math.cos(an) * 9, roofY + 42 + Math.sin(an) * 9)
          ctx.stroke()
        }
      }
      continue
    }
    if (y > 950) continue // off the frame bottom — the only other cull
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(spin)
    ctx.scale(1.7, 1.7)
    if (kind === 'razor') {
      // straight razor: long steel blade + dark handle, lit edge
      ctx.fillStyle = '#3a3430'
      ctx.fillRect(-16, -2.4, 8, 5.4)
      ctx.fillStyle = '#9aa2ac'
      ctx.beginPath(); ctx.moveTo(-8, -2.6); ctx.lineTo(12, -1.2); ctx.lineTo(12, 2.2); ctx.lineTo(-8, 2.6); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#d8dee6'
      ctx.fillRect(-7, -2.2, 18, 1.2)
    } else {
      // scissors: two blades + finger rings, half-open
      ctx.strokeStyle = '#b8bec8'
      ctx.lineWidth = 2.2
      ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(9, 7); ctx.moveTo(-9, 8); ctx.lineTo(9, -7); ctx.stroke()
      ctx.strokeStyle = '#7e858e'
      ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.arc(-10, -9, 3.2, 0, 7); ctx.stroke()
      ctx.beginPath(); ctx.arc(-10, 9, 3.2, 0, 7); ctx.stroke()
    }
    ctx.restore()
    // faint motion streak above
    ctx.strokeStyle = 'rgba(220,226,232,0.16)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x, y - 16)
    ctx.lineTo(x - (o.windX ?? 26) * 0.04, y - 30)
    ctx.stroke()
  }
}

// ============================== impact fx (age on REAL t) ==============================

export function contactShadow(ctx, x, feetY, w, k = 0.4) {
  ctx.save()
  ctx.fillStyle = `rgba(12,7,4,${k})`
  ctx.beginPath()
  ctx.ellipse(x, feetY + 3, w, w * 0.22, 0, 0, 7)
  ctx.fill()
  ctx.restore()
}

export function dustBurst(ctx, x, y, age, seed, o = {}) {
  const life = o.life ?? 0.8
  if (age <= 0 || age > life) return
  const n = o.n ?? 14
  const r = rng(seed)
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
    ctx.strokeStyle = `rgba(255,${210 + hash(i) * 40 | 0},150,${1 - age / 0.3})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
    ctx.stroke()
  }
}

export function shockRing(ctx, x, y, age, life = 0.4, col = 'rgba(240,214,150,0.7)') {
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

// Four-point glint (bronze-warm).
export function glint(ctx, cx, cy, s, k) {
  if (k <= 0 || k >= 1) return
  ctx.save()
  ctx.translate(cx, cy)
  ctx.globalAlpha = Math.sin(k * Math.PI)
  ctx.fillStyle = '#ffe9b8'
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
  ctx.fillStyle = '#060402'
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

// Painterly cloud bank: puff masses with seams + belly shadow + lit tops.
function clouds(x, cx, cy, w, h, seed, base, lit, belly) {
  const r = rng(seed)
  const puffs = []
  const n = 5 + Math.floor(r() * 3)
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n
    puffs.push([cx - w / 2 + u * w * (0.85 + r() * 0.3), cy - Math.sin(u * Math.PI) * h * 0.4 - r() * h * 0.2, h * (0.4 + Math.sin(u * Math.PI) * 0.45 + r() * 0.12)])
  }
  for (const [px, py, pr] of puffs) {
    x.fillStyle = base
    x.beginPath(); x.arc(px, py, pr, 0, 7); x.fill()
  }
  for (const [px, py, pr] of puffs) {
    x.fillStyle = lit
    x.globalAlpha = 0.7
    x.beginPath(); x.arc(px - pr * 0.18, py - pr * 0.3, pr * 0.55, 0, 7); x.fill()
    x.globalAlpha = 1
  }
  x.fillStyle = belly
  x.globalAlpha = 0.75
  for (const [px, py, pr] of puffs) {
    x.beginPath(); x.ellipse(px + pr * 0.1, py + pr * 0.45, pr * 0.8, pr * 0.3, 0, 0, 7); x.fill()
  }
  x.globalAlpha = 1
  // seams where puffs tuck under
  x.strokeStyle = belly
  x.lineWidth = 2
  for (let i = 1; i < puffs.length; i++) {
    const [ax, ay, ar] = puffs[i - 1], [bx, by, br] = puffs[i]
    x.beginPath()
    x.moveTo((ax + bx) / 2, (ay + by) / 2 + (ar + br) * 0.18)
    x.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2, (ax + bx) / 2 + 6, (ay + by) / 2 - (ar + br) * 0.1)
    x.stroke()
  }
}

// Mountain ridge with lit/shaded faces + a haze foot.
function ridge(x, w, baseY, amp, seed, col, colLit, colShade, hazeCol) {
  const r = rng(seed)
  const peaks = []
  for (let i = 0; i <= 16; i++) peaks.push([w * (i / 16) * 1.2 - OS * 0.6, baseY - Math.abs(Math.sin(i * 1.9 + r() * 1.2)) * amp * (0.5 + r() * 0.8), w / 22])
  x.fillStyle = col
  x.beginPath()
  x.moveTo(-OS, baseY + 40)
  for (const [px, py, pw] of peaks) { x.lineTo(px - pw, baseY); x.lineTo(px, py); x.lineTo(px + pw, baseY) }
  x.lineTo(w + OS, baseY + 40)
  x.closePath()
  x.fill()
  // lit left faces / shaded right faces per peak
  for (const [px, py, pw] of peaks) {
    x.fillStyle = colLit
    x.globalAlpha = 0.8
    x.beginPath()
    x.moveTo(px, py)
    x.lineTo(px - pw, baseY)
    x.lineTo(px, baseY)
    x.closePath()
    x.fill()
    x.fillStyle = colShade
    x.globalAlpha = 0.8
    x.beginPath()
    x.moveTo(px, py)
    x.lineTo(px + pw, baseY)
    x.lineTo(px, baseY)
    x.closePath()
    x.fill()
    x.globalAlpha = 1
  }
  // haze foot
  const hz = x.createLinearGradient(0, baseY - amp * 0.3, 0, baseY + 30)
  hz.addColorStop(0, 'rgba(0,0,0,0)')
  hz.addColorStop(1, hazeCol)
  x.fillStyle = hz
  x.fillRect(-OS, baseY - amp * 0.3, w + OS * 2, 60)
}

// Stone block wall courses (gates).
function stoneWall(x, x0, y0, w, h, seed, base, lit, shade, mortar) {
  const r = rng(seed)
  const bh = 26, bw = 54
  for (let yy = 0; yy < h; yy += bh)
    for (let xx = 0; xx < w; xx += bw) {
      const off = ((yy / bh) | 0) % 2 ? bw / 2 : 0
      const bx = x0 + xx + off, by = y0 + yy
      const k = 0.82 + r() * 0.36
      x.fillStyle = k > 1.05 ? lit : k < 0.92 ? shade : base
      x.fillRect(bx, by, Math.min(bw - 3, x0 + w - bx), Math.min(bh - 3, y0 + h - by))
      x.fillStyle = mortar
      x.fillRect(bx, by + bh - 3, Math.min(bw, x0 + w - bx), 3)
    }
}

function groundTex(x, w, y0, y1, seed, base, hi, lo) {
  const r = rng(seed)
  const g = x.createLinearGradient(0, y0, 0, y1)
  g.addColorStop(0, base); g.addColorStop(1, lo)
  x.fillStyle = g
  x.fillRect(-OS, y0, w + OS * 2, y1 - y0 + OS)
  for (let i = 0; i < 420; i++) {
    const px = r() * (w + OS * 2) - OS, py = y0 + r() * (y1 - y0)
    x.fillStyle = r() > 0.5 ? hi : lo
    x.globalAlpha = 0.25 + r() * 0.3
    x.fillRect(px, py, 3 + r() * 10, 2 + r() * 3)
  }
  x.globalAlpha = 1
}

// Live sea shimmer over a baked water band.
export function seaShimmer(ctx, yTop, yBot, t, col, seed = 5) {
  for (let i = 0; i < 26; i++) {
    const yy = yTop + (i / 26) * (yBot - yTop)
    const wSh = 20 + hash(i * 3.7 + seed) * 60
    const xx = ((hash(i * 7.9 + seed) * 2200 + Math.sin(t * 0.7 + i * 1.7) * 30 + t * (8 + hash(i) * 14)) % 2200 + 2200) % 2200 - 140
    ctx.globalAlpha = 0.1 + hash(i * 5.3 + seed) * 0.16
    ctx.fillStyle = col
    ctx.fillRect(xx, yy, wSh, 2.2)
  }
  ctx.globalAlpha = 1
}

// ============================== the six baked stages ==============================
// All (W+2OS)x(H+2OS), painted once in build(). Bands stay out of the letterbox
// only by luck of composition — bars repaint over everything at draw time anyway.

function nightBattleBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, PAL.night0], [0.5, PAL.emberSky0], [0.8, '#4a2014'], [1, '#6e3018']])
  clouds(x, 480, 240, 700, 150, 21, '#201418', '#3a2020', '#120c0e')
  clouds(x, 1420, 190, 900, 180, 44, '#241418', '#402220', '#140d0f')
  // burning camp on the horizon: glow + smoke columns
  for (const [fx, fy, fr] of [[300, 560, 90], [620, 545, 60], [1180, 555, 110], [1560, 540, 70], [1800, 560, 95]]) {
    const g = x.createRadialGradient(fx, fy, 4, fx, fy, fr)
    g.addColorStop(0, 'rgba(255,150,60,0.5)')
    g.addColorStop(0.5, 'rgba(200,80,30,0.22)')
    g.addColorStop(1, 'rgba(200,80,30,0)')
    x.fillStyle = g
    x.fillRect(fx - fr, fy - fr, fr * 2, fr * 2)
    x.strokeStyle = 'rgba(30,20,20,0.5)'
    x.lineWidth = 14 + (fx % 20)
    x.beginPath()
    x.moveTo(fx, fy - 10)
    x.quadraticCurveTo(fx + 24, fy - 90, fx - 10, fy - 190)
    x.stroke()
  }
  ridge(x, W, 600, 90, 7, '#1c1216', '#2e1c1a', '#120b0d', 'rgba(60,30,20,0.35)')
  ridge(x, W, 660, 46, 13, '#150d10', '#241412', '#0c0709', 'rgba(40,20,14,0.3)')
  groundTex(x, W, 690, H, 91, '#2a2018', '#3c2e20', '#171009')
  // scattered debris + broken spear lines
  const r = rng(303)
  x.strokeStyle = '#0e0a08'
  for (let i = 0; i < 16; i++) {
    const px = r() * W, py = 760 + r() * 260, a = r() * 0.8 - 0.4
    x.lineWidth = 3.4
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 60, py + Math.sin(a) * 12); x.stroke()
  }
  return c
}

function blizzardBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#b6bec6'], [0.4, '#d2d8dc'], [0.72, '#e6eaeb'], [1, '#f0f2f2']])
  // bruised storm ceiling puffs (pale, not heavy)
  clouds(x, 600, 190, 1000, 170, 81, '#aab4bd', '#cdd4d8', '#8e98a2')
  clouds(x, 1560, 160, 860, 150, 82, '#b0bac2', '#d2d8dc', '#949ea8')
  // whiteout veil grows toward the horizon
  const veil = x.createLinearGradient(0, 280, 0, 680)
  veil.addColorStop(0, 'rgba(240,242,242,0)')
  veil.addColorStop(1, 'rgba(240,242,242,0.92)')
  x.fillStyle = veil
  x.fillRect(-OS, 280, W + OS * 2, 400)
  // distant rock teeth ghosting through the white
  x.fillStyle = 'rgba(150,158,168,0.28)'
  for (const [rx, rw, rh] of [[240, 110, 52], [700, 70, 34], [1240, 130, 62], [1760, 90, 40]]) {
    x.beginPath()
    x.moveTo(rx - rw, 656)
    x.lineTo(rx, 656 - rh)
    x.lineTo(rx + rw, 656)
    x.closePath()
    x.fill()
  }
  // snowfield: drifts with lit crests + blue shadow bellies (kept low and quiet)
  const sg = x.createLinearGradient(0, 640, 0, H)
  sg.addColorStop(0, '#eaeeee')
  sg.addColorStop(1, '#cdd6da')
  x.fillStyle = sg
  x.fillRect(-OS, 640, W + OS * 2, H - 640 + OS)
  const r = rng(303)
  for (let i = 0; i < 18; i++) {
    const dx = r() * (W + OS * 2) - OS, dy = 780 + r() * 240
    x.fillStyle = 'rgba(168,184,194,0.32)'
    x.beginPath(); x.ellipse(dx, dy, 90 + r() * 180, 10 + r() * 14, 0, 0, 7); x.fill()
    x.fillStyle = 'rgba(248,250,250,0.7)'
    x.beginPath(); x.ellipse(dx - 18, dy - 4, 70 + r() * 140, 7 + r() * 9, 0, 0, 7); x.fill()
  }
  return c
}

function gatesBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#3a1c14'], [0.4, '#8a3c1c'], [0.66, '#d87830'], [0.8, '#f0b060'], [1, '#f8d898']])
  clouds(x, 420, 300, 760, 160, 12, '#7a3a20', '#c87840', '#4a2014')
  clouds(x, 1450, 260, 940, 190, 33, '#824022', '#d08048', '#502416')
  // low dawn sun behind the gate
  const sun = x.createRadialGradient(1180, 560, 10, 1180, 560, 420)
  sun.addColorStop(0, 'rgba(255,220,150,0.5)')
  sun.addColorStop(1, 'rgba(255,220,150,0)')
  x.fillStyle = sun
  x.fillRect(760, 140, 840, 840)
  ridge(x, W, 620, 60, 5, '#4a2c20', '#6e4430', '#33201a', 'rgba(240,170,100,0.4)')
  // the gate wall: two towers + lintel + flanking wall
  stoneWall(x, 700, 320, 960, 380, 17, '#7a5844', '#a07858', '#4e342a', '#3a2418')
  stoneWall(x, 580, 200, 190, 500, 23, '#6e4e3c', '#96704e', '#442e24', '#332016')
  stoneWall(x, 1590, 200, 190, 500, 31, '#6e4e3c', '#96704e', '#442e24', '#332016')
  // crenellations
  x.fillStyle = '#54382c'
  for (let i = 0; i < 9; i++) x.fillRect(712 + i * 104, 292, 58, 30)
  for (let i = 0; i < 3; i++) { x.fillRect(590 + i * 62, 172, 40, 30); x.fillRect(1600 + i * 62, 172, 40, 30) }
  // gate arch opening (dark passage)
  x.fillStyle = '#160e0a'
  x.beginPath()
  x.moveTo(1040, 700)
  x.lineTo(1040, 480)
  x.quadraticCurveTo(1180, 380, 1320, 480)
  x.lineTo(1320, 700)
  x.closePath()
  x.fill()
  x.strokeStyle = '#3c281c'
  x.lineWidth = 12
  x.stroke()
  // dawn light spilling from the arch
  const spil = x.createRadialGradient(1180, 660, 20, 1180, 660, 300)
  spil.addColorStop(0, 'rgba(255,190,110,0.3)')
  spil.addColorStop(1, 'rgba(255,190,110,0)')
  x.fillStyle = spil
  x.fillRect(880, 460, 600, 420)
  // banner poles + rope holes (cloth painted live so it can sway)
  for (const bx of [860, 1180, 1500]) {
    x.fillStyle = '#3a281a'
    x.fillRect(bx - 4, 240, 8, 90)
  }
  groundTex(x, W, 700, H, 47, '#9a7c58', '#b89870', '#6a5238')
  // flagstone joints
  x.strokeStyle = 'rgba(60,40,26,0.5)'
  x.lineWidth = 3
  for (let i = 0; i < 8; i++) {
    const yy = 740 + i * i * 7
    x.beginPath()
    for (let px = -OS; px <= W + OS; px += 130) x.lineTo(px + (i % 2) * 60, yy + Math.sin(px * 0.01) * 3)
    x.stroke()
  }
  return c
}

function coastBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#0a0c16'], [0.5, '#141828'], [0.78, '#2a2030'], [0.92, '#54301e'], [1, '#7a4224']])
  // stars
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(220,228,244,${0.2 + hash(i * 3.1) * 0.5})`
    x.fillRect(hash(i * 7.7) * (W + OS * 2) - OS, hash(i * 5.3) * 380 - OS, 2, 2)
  }
  clouds(x, 700, 220, 900, 150, 8, '#15121e', '#2a2434', '#0c0a12')
  clouds(x, 1600, 180, 700, 130, 19, '#15121e', '#2a2434', '#0c0a12')
  // low moon
  const mh = x.createRadialGradient(300, 330, 20, 300, 330, 260)
  mh.addColorStop(0, 'rgba(230,220,200,0.3)')
  mh.addColorStop(1, 'rgba(230,220,200,0)')
  x.fillStyle = mh
  x.fillRect(40, 70, 520, 520)
  x.fillStyle = '#ded4bc'
  x.beginPath(); x.arc(300, 330, 46, 0, 7); x.fill()
  x.fillStyle = '#cabfa4'
  x.beginPath(); x.arc(312, 340, 38, 0, 7); x.fill()
  // THE SEA OF FOREHEAD (left): dark teal-bronze bands + the receded-hairline coast
  const wl = (px) => 640 + Math.sin(px * 0.004) * 26 + Math.sin(px * 0.0011 + 2) * 40
  x.fillStyle = PAL.sea0
  x.beginPath()
  x.moveTo(-OS, -OS)
  for (let px = -OS; px <= 900; px += 40) x.lineTo(px, wl(px) + Math.sin(px * 0.02) * 4)
  x.lineTo(760, H + OS)
  x.lineTo(-OS, H + OS)
  x.closePath()
  x.fill()
  for (let i = 0; i < 5; i++) {
    x.fillStyle = [PAL.sea1, PAL.sea2, '#265654', '#2e605c', '#386a62'][i]
    x.globalAlpha = 0.85
    x.beginPath()
    const yy = wl(200) + 30 + i * 26
    x.moveTo(-OS, yy)
    for (let px = -OS; px <= 820; px += 44) x.lineTo(px, yy + Math.sin(px * 0.008 + i * 2) * 7)
    x.lineTo(700 - i * 40, H + OS)
    x.lineTo(-OS, H + OS)
    x.closePath()
    x.fill()
  }
  x.globalAlpha = 1
  // the WATERLINE = the receded hairline: pale double line sweeping right, with the
  // widow's-peak dip where the beach point juts
  x.strokeStyle = 'rgba(232,214,178,0.8)'
  x.lineWidth = 5
  x.beginPath()
  for (let px = -OS; px <= 1050; px += 24) x.lineTo(px, wl(px) + 4)
  x.stroke()
  x.strokeStyle = 'rgba(140,110,80,0.7)'
  x.lineWidth = 3
  x.beginPath()
  for (let px = -OS; px <= 1050; px += 24) x.lineTo(px, wl(px) + 14 + Math.sin(px * 0.05) * 3)
  x.stroke()
  // beach sweeping right, wet reflective band at the shoreline
  const bg = x.createLinearGradient(0, 620, 0, H)
  bg.addColorStop(0, '#5a4632')
  bg.addColorStop(0.25, PAL.sandLo)
  bg.addColorStop(1, PAL.sand)
  x.fillStyle = bg
  x.beginPath()
  x.moveTo(300, H + OS)
  for (let px = 300; px <= W + OS; px += 40) x.lineTo(px, wl(px) + 10 + (px - 300) * 0.06)
  x.lineTo(W + OS, H + OS)
  x.closePath()
  x.fill()
  // wet-sand moon reflection
  x.fillStyle = 'rgba(222,212,188,0.14)'
  x.beginPath()
  x.ellipse(430, 800, 90, 130, 0.2, 0, 7)
  x.fill()
  groundTex(x, W, 840, H, 63, '#a08458', '#c0a476', '#786040')
  // headland silhouette far right
  x.fillStyle = '#181420'
  x.beginPath()
  x.moveTo(W + OS - 260, H + OS)
  x.quadraticCurveTo(W + OS - 180, 560, W + OS, 500)
  x.lineTo(W + OS, H + OS)
  x.closePath()
  x.fill()
  return c
}

function passBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#2c1a16'], [0.36, '#7a3a20'], [0.62, '#c87038'], [0.8, '#e8a860'], [1, '#f4cc8a']])
  clouds(x, 500, 240, 820, 170, 15, '#6a3420', '#b06034', '#3c1c12')
  clouds(x, 1500, 200, 760, 150, 27, '#703822', '#b86838', '#402014')
  const sun = x.createRadialGradient(960, 620, 20, 960, 620, 500)
  sun.addColorStop(0, 'rgba(255,214,140,0.4)')
  sun.addColorStop(1, 'rgba(255,214,140,0)')
  x.fillStyle = sun
  x.fillRect(460, 120, 1000, 900)
  // far shore of the Sea of Forehead + haze
  ridge(x, W, 600, 44, 9, '#54382a', '#7a5236', '#3a281e', 'rgba(244,196,130,0.5)')
  // the sea (left third)
  x.fillStyle = PAL.sea1
  x.beginPath()
  x.moveTo(-OS, 640)
  for (let px = -OS; px <= 760; px += 40) x.lineTo(px, 640 + Math.sin(px * 0.01) * 8)
  x.lineTo(560, H + OS)
  x.lineTo(-OS, H + OS)
  x.closePath()
  x.fill()
  for (let i = 0; i < 4; i++) {
    x.fillStyle = [PAL.sea0, PAL.sea2, '#265652', '#2e605a'][i]
    x.beginPath()
    const yy = 668 + i * 30
    x.moveTo(-OS, yy)
    for (let px = -OS; px <= 680; px += 44) x.lineTo(px, yy + Math.sin(px * 0.009 + i * 2.2) * 6)
    x.lineTo(500 - i * 55, H + OS)
    x.lineTo(-OS, H + OS)
    x.closePath()
    x.fill()
  }
  x.strokeStyle = 'rgba(240,220,180,0.75)'
  x.lineWidth = 4
  x.beginPath()
  for (let px = -OS; px <= 700; px += 24) x.lineTo(px, 646 + Math.sin(px * 0.01) * 8)
  x.stroke()
  // the narrow sand strip (centre) between sea and cliff
  const sg = x.createLinearGradient(0, 640, 0, H)
  sg.addColorStop(0, PAL.sandLo)
  sg.addColorStop(1, PAL.sandHi)
  x.fillStyle = sg
  x.beginPath()
  x.moveTo(340, H + OS)
  for (let px = 340; px <= 1500; px += 40) x.lineTo(px, 648 + Math.sin(px * 0.008) * 6 + (px - 340) * 0.012)
  for (let px = 1500; px >= 340; px -= 40) x.lineTo(px, 660 + Math.sin(px * 0.006 + 3) * 8 + (px - 340) * 0.05)
  x.closePath()
  x.fill()
  groundTex(x, W, 700, H, 77, '#ac9068', '#c8ac80', '#7e6848')
  // THE CLIFF (right): towering rock wall with lit/shaded faces + strata
  x.fillStyle = PAL.rock
  x.beginPath()
  x.moveTo(W + OS, -OS)
  x.lineTo(W + OS, H + OS)
  x.lineTo(1260, H + OS)
  x.quadraticCurveTo(1330, 880, 1370, 700)
  x.quadraticCurveTo(1420, 480, 1560, 340)
  x.quadraticCurveTo(1700, 200, W + OS, 160)
  x.closePath()
  x.fill()
  x.fillStyle = PAL.rockLit
  x.globalAlpha = 0.9
  x.beginPath()
  x.moveTo(1560, 340)
  x.quadraticCurveTo(1700, 200, W + OS, 160)
  x.lineTo(W + OS, 420)
  x.quadraticCurveTo(1660, 400, 1560, 340)
  x.closePath()
  x.fill()
  x.globalAlpha = 1
  x.strokeStyle = PAL.rockShade
  for (let i = 0; i < 8; i++) {
    x.lineWidth = 4 + (i % 3) * 3
    x.beginPath()
    x.moveTo(W + OS, 220 + i * 90)
    x.quadraticCurveTo(1600 + i * 20, 300 + i * 80, 1400 - i * 14, 640 + i * 46)
    x.stroke()
  }
  // scree at the cliff foot
  const r = rng(55)
  for (let i = 0; i < 26; i++) {
    const px = 1280 + r() * 240, py = 700 + r() * 260
    x.fillStyle = r() > 0.5 ? PAL.rockLit : PAL.rockShade
    x.beginPath()
    x.ellipse(px, py, 8 + r() * 26, 6 + r() * 12, r() * 3, 0, 7)
    x.fill()
  }
  // distant Persian campfires across the water
  for (const [fx, fy] of [[220, 700], [330, 688], [140, 716]]) {
    const g2 = x.createRadialGradient(fx, fy, 2, fx, fy, 40)
    g2.addColorStop(0, 'rgba(255,160,70,0.5)')
    g2.addColorStop(1, 'rgba(255,160,70,0)')
    x.fillStyle = g2
    x.fillRect(fx - 40, fy - 40, 80, 80)
  }
  return c
}

function dustPlainBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#241a12'], [0.5, '#4a3220'], [0.76, '#7a5230'], [1, '#96683c']])
  clouds(x, 700, 260, 1000, 200, 39, '#3a2a1c', '#5e4428', '#241812')
  clouds(x, 1560, 210, 700, 150, 51, '#40301e', '#66482a', '#281a12')
  const sun = x.createRadialGradient(1200, 480, 20, 1200, 480, 400)
  sun.addColorStop(0, 'rgba(240,180,110,0.35)')
  sun.addColorStop(1, 'rgba(240,180,110,0)')
  x.fillStyle = sun
  x.fillRect(800, 80, 800, 800)
  ridge(x, W, 620, 50, 23, '#3a2a1c', '#54402a', '#281c12', 'rgba(150,104,60,0.45)')
  groundTex(x, W, 650, H, 83, '#6a5438', '#8a704a', '#463624')
  // drifts + half-buried debris
  const r = rng(88)
  for (let i = 0; i < 30; i++) {
    const px = r() * (W + OS * 2) - OS, py = 720 + r() * 320
    x.fillStyle = `rgba(190,164,120,${0.12 + r() * 0.14})`
    x.beginPath()
    x.ellipse(px, py, 60 + r() * 160, 10 + r() * 22, 0, 0, 7)
    x.fill()
  }
  x.strokeStyle = '#241a10'
  for (let i = 0; i < 12; i++) {
    const px = r() * W, py = 780 + r() * 240, a = -0.3 + r() * 0.6
    x.lineWidth = 3
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 70, py + Math.sin(a) * 16); x.stroke()
  }
  return c
}

function plataeaBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#2c2438'], [0.34, '#6a4450'], [0.56, '#c07050'], [0.74, '#eeb070'], [1, '#f8dc9e']])
  clouds(x, 560, 260, 860, 170, 61, '#7a4c44', '#c88a62', '#4a2c28')
  clouds(x, 1480, 220, 720, 150, 72, '#82543e', '#d09060', '#503024')
  const sun = x.createRadialGradient(960, 560, 20, 960, 560, 520)
  sun.addColorStop(0, 'rgba(255,224,160,0.5)')
  sun.addColorStop(1, 'rgba(255,224,160,0)')
  x.fillStyle = sun
  x.fillRect(440, 40, 1040, 940)
  // THE RIDGE where the risen host stands (dark against the dawn)
  x.fillStyle = '#241a18'
  x.beginPath()
  x.moveTo(-OS, 700)
  for (let px = -OS; px <= W + OS; px += 60) x.lineTo(px, 646 + Math.sin(px * 0.004 + 1) * 26 + Math.sin(px * 0.011) * 10)
  x.lineTo(W + OS, 760)
  x.lineTo(W + OS, 700)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(255,214,150,0.14)'
  x.beginPath()
  x.moveTo(-OS, 664)
  for (let px = -OS; px <= W + OS; px += 60) x.lineTo(px, 646 + Math.sin(px * 0.004 + 1) * 26 + Math.sin(px * 0.011) * 10)
  x.lineTo(W + OS, 680)
  x.lineTo(-OS, 690)
  x.closePath()
  x.fill()
  // mist bands across the plain
  for (const [my, mh2, ma] of [[680, 60, 0.3], [740, 90, 0.22], [820, 110, 0.16]]) {
    const mg = x.createLinearGradient(0, my - mh2 / 2, 0, my + mh2 / 2)
    mg.addColorStop(0, 'rgba(248,220,170,0)')
    mg.addColorStop(0.5, `rgba(248,220,170,${ma})`)
    mg.addColorStop(1, 'rgba(248,220,170,0)')
    x.fillStyle = mg
    x.fillRect(-OS, my - mh2 / 2, W + OS * 2, mh2)
  }
  groundTex(x, W, 720, H, 97, '#7e6848', '#a08858', '#504028')
  return c
}

// ============================== build (called once from prepare) ==============================
export async function build() {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('600 40px "Cormorant Garamond"'),
        document.fonts.load('400 96px Anton'),
        document.fonts.load('600 30px "JetBrains Mono"'),
      ])
      await document.fonts.ready
    } catch {}
  }
  return {
    nightBattle: nightBattleBake(),
    blizzard: blizzardBake(),
    gates: gatesBake(),
    coast: coastBake(),
    pass: passBake(),
    dustPlain: dustPlainBake(),
    plataea: plataeaBake(),
  }
}

export const shade = (hex, k) => {
  const [r, g, b] = typeof hex === 'string' && hex.startsWith('#') ? hexRgb(hex) : [128, 128, 128]
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}
