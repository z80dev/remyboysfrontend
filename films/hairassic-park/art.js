// HAIRASSIC PARK — art.js. Full-res painterly stage (3000 lineage): rig prep
// (pixel palette remaps baked ONCE in prepare — the shared rig is never mutated),
// the three procedural dinosaurs (maned brachiosaur / mulletraptors / the B-REX
// with the wet bald crown and the regrowing mane), props (gates sign, jeep +
// headlight beams, water cup, banner, fence, voltage map, amber cane, egg,
// hatchling, helicopter), the-shine-style storm weather, and analytic particles.
// Every painter is a pure function of time — hash/rng/vnoise only, seeded in
// prepare or from constants; no Math.random, no Date, no state between frames.
import { W, H, hash, rng, vnoise, lerp, seg, clamp, txt } from 'filmkit/lib.js'
import { canvas } from '../remy-bros/art.js'

export const OS = 220          // overscan painted around every stage for camera moves
export const BAR = 138         // 2.39:1 letterbox bar height (band y 138-942)

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

// ---------------- palette: jungle green / storm slate / amber torch ----------------
export const PAL = {
  storm0: '#0c1218', storm1: '#16222c', storm2: '#243442', stormLite: '#3e5468',
  sea0: '#0a1a20', sea1: '#102830', sea2: '#183a42', seaGlint: '#c8d8dc',
  jungle0: '#0e1a10', jungle1: '#16281a', jungle2: '#22381f', jungleLit: '#33502c',
  gold0: '#6a4a1c', gold1: '#c89040', gold2: '#f0c46a', goldHi: '#ffe8a8',
  dawn0: '#2a1a30', dawn1: '#7a3a48', dawn2: '#d87850', dawn3: '#ffc878', dawnHi: '#ffe8b8',
  rex: '#6e6a56', rexLo: '#4a4638', rexHi: '#948e74', rexGlint: '#e8f0f4',
  raptor: '#5e5442', raptorLo: '#3c3428', raptorHi: '#847964',
  steel: '#8a949e', steelHi: '#d8e2ea', steelLo: '#3a424a',
  mane0: '#3a2416', mane1: '#6a4224', mane2: '#b07038', mane3: '#e8b060',
  amber: '#e8a83c', amberHi: '#ffd88a', amberDeep: '#8a5210',
  mud: '#3a2e20', mudHi: '#54432e',
  torch: '#ffb050', flare: '#ff4828',
  wood: '#4a3420', woodHi: '#6e5230', woodLo: '#2c1e12',
}

// shared GEO landmarks (bakes + film.js agree on these)
export const GEO = {
  isle: { gateX: 1270, archY: 470, gateBase: 700, torch: [[1010, 470], [1530, 470]], doorY: 480, doorH: 220 },
  valley: { heroes: [[380, 812], [500, 818], [600, 814], [680, 820]], brach: [1500, 830], pool: 800 },
  lab: { egg: [660, 600], bench: [1330, 700] },
  control: { screen: [1150, 500], can: [900, 762], window: [80, 560] },
  paddock: { fenceY: 680, rexFeet: 950, jeepX: 1580, jeepFeet: 952 },
  rexJeep: { rex: [640, 945], jeep: [1310, 945] },
  flare: { wreck: [500, 930], rex: [1180, 945], grant: [700, 935] },
  kitchen: { door: [1640, 640], kids: [820, 905], islandX: [520, 1240] },
  sheds: { mulldoon: [960, 852] },
  lobby: { heroes: [[420, 890], [540, 892], [650, 888], [730, 892]], wall: 950, rod: [620, 206] },
  dawn: { rex: [1430, 848], pad: [1500, 860] },
}

function whiteSil(c, w, h) {
  const s = canvas(w, h), x = s.getContext('2d')
  x.drawImage(c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = '#fff'
  x.fillRect(0, 0, w, h)
  return s
}
const reRig = (R, c) => ({ ...R, c, sil: whiteSil(c, R.w, R.h) })

// ============================== rig repaints ==============================
// Pixel palette remaps on the QUEST sprite cut, baked once. Torso band only,
// centred columns so hands/skin at the sides survive.

function remap(R, fn) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  for (let y = 0; y < R.h; y++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] < 8) continue
      const out = fn(p[i], p[i + 1], p[i + 2], xx, y)
      if (out) { p[i] = out[0]; p[i + 1] = out[1]; p[i + 2] = out[2] }
    }
  x.putImageData(d, 0, 0)
  return reRig(R, c)
}
const inTorso = (R, x, y, colW = 20, y0 = 26, y1 = 4) =>
  y >= R.top + y0 && y <= R.legTop - y1 && Math.abs(x - R.cx) <= colW

// HAMBALD (5): yellow tee + chest print -> white suit ramp (full tee length);
// black bow tie painted on.
export function suitHambl(R) {
  const rig = remap(R, (r, g, b, x, y) => {
    if (!inTorso(R, x, y, 17, 26, 2)) return null
    const yellow = r > 140 && g > 110 && b < 130
    const print = r > 90 && g < 120 && b < 120
    if (!yellow && !print) return null
    const L = (r + g + b) / 765
    return mix([214, 214, 206], [250, 250, 244], cl((L - 0.3) * 1.6))
  })
  const c = canvas(rig.w, rig.h), x = c.getContext('2d')
  x.drawImage(rig.c, 0, 0)
  x.fillStyle = '#1c1c22'
  const ty = rig.top + 30, cx = rig.cx
  x.fillRect(cx - 7, ty, 6, 4); x.fillRect(cx + 1, ty, 6, 4); x.fillRect(cx - 1, ty + 1, 2, 2)
  return reRig(rig, c)
}

// DENNIS BALDRY (48): purple tee scribble -> neutral light-grey shirt.
export function neutBaldry(R) {
  return remap(R, (r, g, b, x, y) => {
    if (!inTorso(R, x, y)) return null
    const purple = b > r + 8 && b > g + 8
    const dark = r + g + b < 400
    if (!purple && !dark) return null
    const L = (r + g + b) / 765
    return mix([152, 154, 152], [216, 216, 210], cl((L - 0.15) * 1.8))
  })
}

// MAL-COMB (681): keep cobalt flow + gold shades; red tee -> black (head rows spared).
export function blackMalcomb(R) {
  return remap(R, (r, g, b, x, y) => {
    if (!inTorso(R, x, y, 21, 30)) return null
    const red = r > g + 30 && r > b + 30
    const white = Math.min(r, g, b) > 165
    if (!red && !white) return null
    const L = (r + g + b) / 765
    return red ? mix([26, 26, 32], [54, 54, 62], cl((L - 0.2) * 2.4)) : mix([76, 76, 84], [44, 44, 52], cl((L - 0.62) * 2.4))
  })
}

// GROWGRANT (42): navy tee + print -> tan field shirt (hair is red — never in band tests).
export function fieldGrant(R) {
  return remap(R, (r, g, b, x, y) => {
    if (!inTorso(R, x, y, 21, 26)) return null
    const navy = b > r + 14 && b > 60
    const light = Math.min(r, g, b) > 168
    if (!navy && !light) return null
    const L = (r + g + b) / 765
    return mix([118, 96, 66], [178, 154, 112], cl(L * 1.25))
  })
}

// MULLDOON (151): black tee + grey print -> khaki warden shirt (visor cap untouched).
export function khakiMulldoon(R) {
  return remap(R, (r, g, b, x, y) => {
    if (!inTorso(R, x, y, 21, 26, 6)) return null
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    if (mx - mn >= 30) return null
    const L = (r + g + b) / 765
    return mix([88, 78, 54], [162, 148, 106], cl(L * 1.3))
  })
}

// KID TIM (44): pale sweater + print -> solid amber.
export function solidTim(R) {
  return remap(R, (r, g, b, x, y) => {
    if (!inTorso(R, x, y, 20, 24)) return null
    const pale = Math.min(r, g, b) > 150 && Math.max(r, g, b) - Math.min(r, g, b) < 42
    if (!pale) return null
    const L = (r + g + b) / 765
    return mix([144, 88, 50], [206, 142, 86], cl(L))
  })
}

// KID LEXI (1): red tee + white print -> solid dusty blue (mint hair crown stays).
export function solidLexi(R) {
  return remap(R, (r, g, b, x, y) => {
    if (!inTorso(R, x, y, 20, 24)) return null
    const red = r > g + 26 && r > b + 26
    const white = Math.min(r, g, b) > 175
    if (!red && !white) return null
    const L = (r + g + b) / 765
    return mix([56, 76, 102], [112, 136, 162], cl(L * 1.15))
  })
}

// RANGER (49): red tee + print -> olive ranger uniform.
export function ranger49(R) {
  return remap(R, (r, g, b, x, y) => {
    if (!inTorso(R, x, y, 21, 24)) return null
    const red = r > g + 26 && r > b + 26
    const white = Math.min(r, g, b) > 175
    if (!red && !white) return null
    const L = (r + g + b) / 765
    return mix([66, 72, 48], [110, 118, 78], cl(L * 1.15))
  })
}

// Growgrant's baked greatsword: 3000 stripLeftBlade adapted — per-scanline drop the
// detached left-edge run (blade/guard), then clear left columns of blade-family
// colour (blue-grey blade, gold guard). Warm hair/skin survives.
export function stripSword(R, cols = 26) {
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
    if (x1 - x0 > 16) continue
    let gap = 0, xx = x1
    while (xx < R.w && a(xx, y) === 0) { gap++; xx++ }
    if (gap < 3) continue
    for (let xb = x0; xb < x1; xb++) p[(y * R.w + xb) * 4 + 3] = 0
  }
  for (let y = 0; y < R.h; y++)
    for (let xx = 0; xx < cols; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] === 0) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      if (b >= r || (r > 190 && g > 140 && b < 120)) p[i + 3] = 0
    }
  x.putImageData(d, 0, 0)
  return reRig(R, c)
}

// crown y (scalp line) for a rig drawn with feet at `feet` and vertical scale sy.
export const crownY = (rig, feet, sy) => feet - (rig.bottom - rig.top + 1) * sy + 7 * sy
// walk cycle pose (3000 pattern)
export const walkCyc = (ph, amp = 5) => {
  const s = Math.sin(ph)
  return {
    lift: [Math.round(Math.max(0, s) * amp), Math.round(Math.max(0, -s) * amp)],
    stride: [Math.round(s * 2), Math.round(-s * 2)], lean: 0.05,
  }
}
export const standPose = (g) => ({ lift: [2, 0], stride: [1, 0], lean: 0.02 + Math.sin(g * 1.2) * 0.015 })

// ============================== shared painters ==============================

export function contactShadow(ctx, x, feetY, w, k = 0.4) {
  ctx.save()
  ctx.fillStyle = `rgba(8,7,5,${k})`
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
    ctx.fillStyle = o.col ?? '#8a7a5e'
    ctx.beginPath()
    ctx.arc(px, py, (3 + hash(i * 5.1) * 7) * (0.5 + u), 0, 7)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

export function sparkBurst(ctx, x, y, age, seed, o = {}) {
  if (age <= 0 || age > 0.3) return
  const n = o.n ?? 7
  for (let i = 0; i < n; i++) {
    const a = hash(seed + i * 17) * 6.28
    const d = 12 + (age / 0.3) * (o.reach ?? 46) * (0.5 + hash(i * 3.1) * 0.5)
    ctx.strokeStyle = `rgba(255,${210 + (hash(i) * 40) | 0},150,${1 - age / 0.3})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
    ctx.stroke()
  }
}

export function shockRing(ctx, x, y, age, life = 0.4, col = 'rgba(240,220,170,0.7)') {
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

// masonry debris: grey chunks, ballistic, culled only on physical exit
export function debrisBurst(ctx, x, y, age, seed, o = {}) {
  const life = o.life ?? 1.3
  if (age <= 0 || age > life) return
  const n = o.n ?? 16
  for (let i = 0; i < n; i++) {
    const vx = (hash(seed * 3 + i * 7) - 0.5) * 2 * (o.vx ?? 420)
    const vy = -(120 + hash(seed * 5 + i * 11) * (o.vy ?? 380))
    const px = x + vx * age
    const py = y + vy * age + 0.5 * 900 * age * age
    if (py > 1010) continue
    const u = age / life
    ctx.globalAlpha = 1 - u * 0.35
    ctx.fillStyle = i % 3 ? o.col ?? '#6a6458' : o.col2 ?? '#443e34'
    const s2 = 4 + hash(i * 13.3) * 10
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(hash(i * 3.7) * 6.28 + age * (1 + hash(i) * 3))
    ctx.fillRect(-s2 / 2, -s2 / 2, s2, s2 * 0.8)
    ctx.restore()
  }
  ctx.globalAlpha = 1
}

// golden shimmer burst (regrow): motes ride up on the wind, no fade-pop —
// they leave through the top of their little sky
export function shimmerBurst(ctx, x, y, age, seed, o = {}) {
  const life = o.life ?? 1.6
  if (age <= 0 || age > life) return
  const n = o.n ?? 26
  for (let i = 0; i < n; i++) {
    const vx = (hash(seed * 3 + i * 7) - 0.5) * (o.spread ?? 260)
    const vy = -(60 + hash(seed * 5 + i * 11) * 220)
    const px = x + vx * age + Math.sin(age * 4 + i) * 8
    const py = y + vy * age + 60 * age * age
    if (py < -40) continue
    ctx.globalAlpha = cl(1 - age / life) * 0.85
    ctx.fillStyle = i % 3 ? '#ffd88a' : '#fff2c8'
    const s2 = 2 + hash(i * 3.1) * 3
    ctx.fillRect(px, py, s2, s2)
  }
  ctx.globalAlpha = 1
}

// ============================== weather (the-shine style, full res) ==============================

export function rain(ctx, t, k, wind = -190) {
  if (k <= 0.01) return
  const n = Math.round(150 * k)
  ctx.save()
  ctx.strokeStyle = `rgba(158,178,222,${0.15 + 0.1 * k})`
  ctx.lineWidth = 1.1
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const sp = 620 + hash(i * 3 + 1) * 380
    const px = ((hash(i) * (W + 220) + t * wind - i * 17) % (W + 260) + W + 260) % (W + 260) - 130
    const py = ((hash(i + 99) * (H + 120) + t * sp) % (H + 160)) - 70
    ctx.moveTo(px, py)
    ctx.lineTo(px + wind * 0.022, py + 13)
  }
  ctx.stroke()
  ctx.restore()
}

export function rainClip(ctx, rect, t, k) {
  ctx.save()
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip()
  ctx.strokeStyle = `rgba(150,170,215,${0.32 * k})`
  ctx.lineWidth = 1.2
  ctx.beginPath()
  for (let i = 0; i < 16; i++) {
    const sp = 340 + hash(i * 7 + 4) * 180
    const px = rect.x + ((hash(i * 5 + 2) * (rect.w + 20) + t * -52 - i * 7) % (rect.w + 20) + rect.w + 20) % (rect.w + 20) - 10
    const py = rect.y + ((hash(i * 11 + 6) * rect.h + t * sp) % (rect.h + 10)) - 5
    ctx.moveTo(px, py)
    ctx.lineTo(px - 2, py + 9)
  }
  ctx.stroke()
  ctx.restore()
}

export function fogBank(ctx, t, y0, hgt, seed, alpha) {
  ctx.save()
  for (let b = 0; b < 3; b++) {
    const yb = y0 + (hgt / 3) * b
    for (let cx = -OS; cx < W + OS + 64; cx += 22) {
      const n = vnoise(cx * 0.006 + t * (0.022 + b * 0.01) + seed * 9 + b * 5, seed + b)
      const a = alpha * Math.max(0, n - 0.42) * (1.5 - b * 0.3)
      if (a <= 0.004) continue
      ctx.fillStyle = `rgba(180,192,210,${a})`
      const bh = 14 + b * 8
      ctx.fillRect(cx - 11, yb + Math.sin(cx * 0.04 + t * 0.5 + b) * 4, 22, bh)
    }
  }
  ctx.restore()
}

export function bolt(ctx, x0, y0, x1, y1, seed, k) {
  if (k <= 0.02) return
  const segs = 9
  ctx.save()
  ctx.globalAlpha = Math.min(1, k * 2.8)
  for (const [wd, col] of [[6, 'rgba(160,185,240,0.35)'], [3, 'rgba(225,236,255,0.95)'], [1.2, '#ffffff']]) {
    ctx.strokeStyle = col
    ctx.lineWidth = wd
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    for (let i = 1; i < segs; i++) {
      const u = i / segs
      const jx = (hash(seed * 77 + i) - 0.5) * 60 * Math.sin(u * Math.PI)
      ctx.lineTo(x0 + (x1 - x0) * u + jx, y0 + (y1 - y0) * u)
    }
    ctx.lineTo(x1, y1)
    ctx.stroke()
  }
  ctx.restore()
}

// in-scene sky flash (≤ 0.24 above the post flash; keyed on lightning age)
export function skyFlash(ctx, k, col = '190,205,240') {
  if (k <= 0.005) return
  ctx.save()
  ctx.globalAlpha = k
  ctx.fillStyle = `rgb(${col})`
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  ctx.restore()
}

export function seaShimmer(ctx, yTop, yBot, t, col, seed = 5) {
  for (let i = 0; i < 30; i++) {
    const yy = yTop + (i / 30) * (yBot - yTop)
    const wSh = 24 + hash(i * 3.7 + seed) * 70
    const xx = ((hash(i * 7.9 + seed) * 2300 + Math.sin(t * 0.7 + i * 1.7) * 34 + t * (9 + hash(i) * 15)) % 2300 + 2300) % 2300 - 150
    ctx.globalAlpha = 0.08 + hash(i * 5.3 + seed) * 0.15
    ctx.fillStyle = col
    ctx.fillRect(xx, yy, wSh, 2.4)
  }
  ctx.globalAlpha = 1
}

// golden pollen / sun motes drifting (valley)
export function pollen(ctx, t, n, seed) {
  for (let i = 0; i < n; i++) {
    const sp = 14 + hash(i * 3.3 + seed) * 22
    const x = ((hash(i * 5.9 + seed) * 2300 + Math.sin(t * 0.5 + i) * 40 + t * sp) % 2300 + 2300) % 2300 - 190
    const y = ((hash(i * 9.1 + seed) * 1000 - t * (10 + hash(i) * 18)) % 1000 + 1000) % 1000 - 30
    ctx.globalAlpha = 0.14 + hash(i * 2.3) * 0.24
    ctx.fillStyle = '#ffe8a8'
    const s2 = 1.6 + hash(i * 11.1) * 2.6
    ctx.fillRect(x, y, s2, s2)
  }
  ctx.globalAlpha = 1
}

// waterfall spray wisps (rise + drift)
export function spray(ctx, t, x, y, k) {
  if (k <= 0.01) return
  for (let i = 0; i < 22; i++) {
    const life = 1.4 + hash(i * 3.7) * 1.4
    const age = ((t * (0.5 + hash(i * 7.1) * 0.5) + hash(i * 5.3) * life) % life)
    const px = x + (hash(i * 9.7) - 0.5) * 90 * k + Math.sin(age * 3 + i) * 14
    const py = y - age * (60 + hash(i * 1.3) * 90)
    ctx.globalAlpha = Math.sin((age / life) * Math.PI) * 0.16 * k
    ctx.fillStyle = '#dce8ee'
    ctx.beginPath()
    ctx.arc(px, py, 8 + hash(i * 4.1) * 16 + age * 22, 0, 7)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ============================== the MANE (shared hair) ==============================
// Wind-blown strands from anchor points. Pure in t: sway from seeded sines.
// o: { dir(-1 blows left), len, wid, gust, col0/col1/col2, alpha, n }
export function maneStrands(ctx, pts, t, seed, o = {}) {
  const dir = o.dir ?? -1
  const gust = o.gust ?? 1
  ctx.save()
  ctx.lineCap = 'round'
  for (let i = 0; i < pts.length; i++) {
    const [px, py] = pts[i]
    const s2 = seed + i * 17
    for (let k = 0; k < (o.n ?? 2); k++) {
      const ph = t * (2 + hash(s2 + k * 7) * 1.7) + hash(s2) * 6.28
      const L = (o.len ?? 44) * (0.55 + hash(s2 + k) * 0.65)
      const sw = (Math.sin(ph) * 6 + Math.sin(ph * 0.37 + 1.7) * 10) * gust
      const ex = px + dir * L * 0.85 + sw
      const ey = py - L * 0.28 + Math.sin(ph * 0.8) * 4
      ctx.strokeStyle = k % 2 ? (o.col0 ?? PAL.mane0) : (o.col1 ?? PAL.mane2)
      ctx.globalAlpha = (o.alpha ?? 0.85) * (0.5 + hash(s2 + k * 11) * 0.5)
      ctx.lineWidth = (o.wid ?? 3) * (0.7 + hash(s2 + k * 3) * 0.6)
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.quadraticCurveTo(px + dir * L * 0.45 + sw * 0.4, py - L * 0.38 - hash(s2 + k * 5) * 8, ex, ey)
      ctx.stroke()
    }
  }
  ctx.restore()
}

// ============================== DINOSAUR 1 — MANED BRACHIOSAUR ==============================
// Segmented neck computed analytically (quadratic curve), so the mane anchors
// and the warm rim light ride the same curve. o.rear rears it onto hind legs,
// o.call lifts the head and opens the mouth, o.dir faces the head toward dir.
export function brachio(ctx, x, groundY, s, t, o = {}) {
  const rear = cl(o.rear ?? 0)
  const call = cl(o.call ?? 0)
  const dir = o.dir ?? -1
  ctx.save()
  ctx.translate(x, groundY)
  ctx.scale(dir * s, s)
  const ph = t * 0.9
  // ---- tail (behind body, +x side; props on the ground when rearing) ----
  ctx.strokeStyle = PAL.rexLo
  ctx.lineCap = 'round'
  ctx.lineWidth = 38
  ctx.beginPath()
  ctx.moveTo(96, -128)
  ctx.quadraticCurveTo(210, -120 + Math.sin(ph * 0.8) * 8, 320, -30 - rear * 40 + Math.sin(ph * 0.6) * 6)
  ctx.stroke()
  ctx.strokeStyle = PAL.rex
  ctx.lineWidth = 24
  ctx.beginPath()
  ctx.moveTo(96, -130)
  ctx.quadraticCurveTo(206, -124 + Math.sin(ph * 0.8) * 8, 314, -36 - rear * 40 + Math.sin(ph * 0.6) * 6)
  ctx.stroke()
  // ---- legs ----
  const legCol = (dk) => (dk ? '#4e463a' : '#625a4a')
  const drawLeg = (lx, lift, dk) => {
    ctx.strokeStyle = legCol(dk)
    ctx.lineWidth = dk ? 30 : 38
    ctx.beginPath()
    ctx.moveTo(lx, -120)
    ctx.quadraticCurveTo(lx - 12, -60, lx - 8 + lift * 20, -12 - lift * 46)
    ctx.stroke()
    if (lift < 0.4) {
      ctx.fillStyle = legCol(dk)
      ctx.beginPath()
      ctx.ellipse(lx + 14, -7, 30, 12, 0, 0, 7)
      ctx.fill()
    }
  }
  if (rear < 0.6) { drawLeg(-128, rear * 0.8, true); drawLeg(28, rear, true) } // front pair tucks as it rears
  drawLeg(-6, 0.12 + Math.max(0, Math.sin(ph)) * 0.06 * (1 - rear), false)
  drawLeg(84, 0.12 + Math.max(0, Math.sin(ph + Math.PI)) * 0.06 * (1 - rear), false)
  // ---- body (rotate about the hips when rearing: chest rises, tail drops) ----
  ctx.save()
  ctx.translate(-30, -150)
  ctx.rotate(rear * 0.32)
  // haunch + chest + belly
  const skin = ctx.createLinearGradient(0, -140, 0, 30)
  skin.addColorStop(0, PAL.rexHi)
  skin.addColorStop(0.55, PAL.rex)
  skin.addColorStop(1, '#8a8068')
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.ellipse(100, -18, 138, 96, 0, 0, 7)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(0, -8, 124, 104, 0, 0, 7)
  ctx.fill()
  // mottling
  const r = rng(411)
  for (let i = 0; i < 26; i++) {
    const mx = -100 + r() * 320, my = -100 + r() * 100
    ctx.fillStyle = `rgba(58,50,40,${0.1 + r() * 0.14})`
    ctx.beginPath()
    ctx.ellipse(mx, my, 6 + r() * 16, 4 + r() * 9, r() * 3, 0, 7)
    ctx.fill()
  }
  // warm rim on the back (sun above-right)
  ctx.strokeStyle = 'rgba(240,190,120,0.5)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-60, -84)
  ctx.quadraticCurveTo(30, -112, 150, -88)
  ctx.stroke()
  // ---- neck: analytic quadratic curve shoulder -> head (rises with a lean) ----
  const P0 = [-50, -60]
  const P1 = [-100, -160 - rear * 26]
  const P2 = [-142 - rear * 20 + call * 12, -268 - rear * 30 + call * -10]
  const qp = (u) => [
    (1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * P1[0] + u * u * P2[0],
    (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * P1[1] + u * u * P2[1],
  ]
  const SEG = 9
  const pts = []
  for (let i = 0; i <= SEG; i++) pts.push(qp(i / SEG))
  for (let i = 0; i < SEG; i++) {
    const u = i / SEG
    const rad = lerp(34, 15, u)
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1]
    ctx.strokeStyle = PAL.rex
    ctx.lineWidth = rad * 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }
  // lit edge down the back of the neck
  ctx.strokeStyle = 'rgba(148,142,116,0.55)'
  ctx.lineWidth = 9
  ctx.beginPath()
  ctx.moveTo(pts[0][0] + 14, pts[0][1] + 2)
  for (let i = 1; i <= SEG; i++) ctx.lineTo(pts[i][0] + lerp(20, 6, i / SEG), pts[i][1] + lerp(8, 2, i / SEG))
  ctx.stroke()
  // mane down the BACK of the neck (anchors on the posterior side of the curve)
  const manePts = []
  for (let i = 1; i <= SEG; i++) {
    const u = i / SEG
    const [ax, ay] = pts[i]
    const [bx, by] = pts[Math.max(0, i - 1)]
    const grad = Math.hypot(bx - ax, by - ay) || 1
    const k = lerp(24, 8, u)
    manePts.push([ax - ((by - ay) / grad) * k, ay + ((bx - ax) / grad) * k])
  }
  maneStrands(ctx, manePts, t, 71, {
    dir: -1, len: lerp(38, 70, rear), wid: 5, gust: 1 + call * 0.8,
    col0: PAL.mane0, col1: PAL.mane2, n: 4, alpha: 0.92,
  })
  // warm rim along the neck top
  ctx.strokeStyle = 'rgba(244,196,120,0.55)'
  ctx.lineWidth = 3.4
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (const [ax, ay] of pts) ctx.lineTo(ax - 8 * dir, ay - 6)
  ctx.stroke()
  // ---- head ----
  const [hx, hy] = pts[SEG]
  const [nx, ny] = pts[SEG - 1]
  const hang = Math.atan2(hy - ny, hx - nx)
  ctx.save()
  ctx.translate(hx, hy)
  ctx.rotate(hang + Math.PI / 2 - call * 0.28)
  ctx.fillStyle = PAL.rexHi
  ctx.beginPath()
  ctx.ellipse(0, -6, 19, 25, 0, 0, 7)
  ctx.fill()
  ctx.fillStyle = PAL.rex
  ctx.beginPath()
  ctx.ellipse(3, -24, 13, 19, 0.1, 0, 7)
  ctx.fill()
  // snout + jaw (call opens the mouth)
  ctx.fillStyle = PAL.rex
  ctx.beginPath()
  ctx.moveTo(-11, -34)
  ctx.quadraticCurveTo(-15, -56, 3, -58)
  ctx.lineTo(13, -48)
  ctx.closePath()
  ctx.fill()
  ctx.save()
  ctx.translate(0, -38)
  ctx.rotate(call * 0.3)
  ctx.fillStyle = '#5a5244'
  ctx.fillRect(-9, 0, 17, 6)
  ctx.restore()
  ctx.fillStyle = '#1c1710'
  ctx.beginPath()
  ctx.arc(-4, -27, 3.2, 0, 7)
  ctx.fill()
  ctx.restore()
  ctx.restore() // body
  ctx.restore()
}

// ============================== DINOSAUR 2 — MULLETORAPTOR ==============================
// Horizontal body, bent legs, counterbalancing tail, animated jaw — and the
// instant-read MULLET: spiky crest up front + long hair streaming down the back.
// o: { dir, jaw, run(phase), crouch, mullet(1 normal, 1.35 biggest), steel, sil,
//      sniff(neck lowers), pounce(0..1 lunge flatten) }
export function raptor(ctx, x, feetY, s, t, o = {}) {
  const dir = o.dir ?? 1
  const jaw = cl(o.jaw ?? 0)
  const run = o.run ?? 0
  const crouch = cl(o.crouch ?? 0)
  const mul = o.mullet ?? 1
  const steel = cl(o.steel ?? 0)
  const sil = o.sil ?? false
  const sniff = cl(o.sniff ?? 0)
  const pounce = cl(o.pounce ?? 0)
  ctx.save()
  ctx.translate(x, feetY)
  ctx.scale(dir * s, s * (1 - crouch * 0.14))
  const mixC = (a, b) => (sil ? a : mix(hexRgb(a), hexRgb(b), steel))
  const body = mixC(sil ? '#12161f' : '#5e5442', '#6a7480')
  const bodyLo = mixC(sil ? '#0a0d14' : '#3c3428', '#464e58')
  const bodyHi = mixC(sil ? '#1c2432' : '#847964', '#9aa4b0')
  const bodyScale = 1 - pounce * 0.18
  // ---- tail ----
  ctx.strokeStyle = bodyLo
  ctx.lineWidth = 13
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-46, -62)
  ctx.quadraticCurveTo(-104, -70 + Math.sin(t * 2.1) * 5, -152, -58 + Math.sin(t * 2.1 + 1) * 8)
  ctx.stroke()
  ctx.strokeStyle = body
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(-46, -63)
  ctx.quadraticCurveTo(-100, -72 + Math.sin(t * 2.1) * 5, -146, -60 + Math.sin(t * 2.1 + 1) * 8)
  ctx.stroke()
  // ---- far leg ----
  const legDraw = (ph, dk) => {
    const sw = Math.sin(ph) * 14
    const lift = Math.max(0, Math.sin(ph)) * 12
    ctx.strokeStyle = dk ? bodyLo : body
    ctx.lineWidth = dk ? 8 : 10
    ctx.beginPath()
    ctx.moveTo(18, -58)
    ctx.quadraticCurveTo(34 + sw * 0.5, -30, 26 + sw, -8 - lift)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(26 + sw, -8 - lift)
    ctx.lineTo(38 + sw, -1 - lift)
    ctx.stroke()
    // talons
    ctx.lineWidth = 2.4
    for (const tn of [0, 1, 2]) {
      ctx.beginPath()
      ctx.moveTo(38 + sw, -1 - lift)
      ctx.lineTo(46 + sw + tn * 3, -1 - lift + tn)
      ctx.stroke()
    }
  }
  legDraw(run + Math.PI, true)
  // ---- body ----
  ctx.save()
  ctx.translate(0, -62)
  ctx.rotate(-sniff * 0.12 + pounce * 0.1)
  ctx.scale(1 + pounce * 0.08, bodyScale)
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(-4, -8, 56, 26, -0.06, 0, 7)
  ctx.fill()
  ctx.fillStyle = css(mix(hexRgb(bodyHi), [255, 255, 255], 0), 0.5)
  ctx.beginPath()
  ctx.ellipse(-10, -14, 40, 14, -0.08, 0, 7)
  ctx.fill()
  // steel sheen: vertical highlight streak
  if (steel > 0.05 && !sil) {
    ctx.fillStyle = `rgba(216,226,234,${0.2 * steel})`
    ctx.fillRect(-30, -32, 7, 40)
    ctx.fillStyle = `rgba(216,226,234,${0.12 * steel})`
    ctx.fillRect(6, -30, 4, 34)
  }
  // ---- neck (S curve up to the head; solid colour + one lit edge) ----
  const N0 = [34, -12]
  const N1 = [58, -40 - sniff * 6]
  const N2 = [80 - sniff * 26, -70 - sniff * 16]
  const qp = (u) => [
    (1 - u) * (1 - u) * N0[0] + 2 * (1 - u) * u * N1[0] + u * u * N2[0],
    (1 - u) * (1 - u) * N0[1] + 2 * (1 - u) * u * N1[1] + u * u * N2[1],
  ]
  for (let i = 0; i < 6; i++) {
    const [ax, ay] = qp(i / 6), [bx, by] = qp((i + 1) / 6)
    ctx.strokeStyle = body
    ctx.lineWidth = lerp(17, 11, i / 6) * 2 - 8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }
  ctx.strokeStyle = css(mix(hexRgb(bodyHi), [255, 255, 255], 0), 0.5)
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(N2[0] - 6, N2[1] + 2)
  ctx.quadraticCurveTo(N1[0] + 10, N1[1] - 12, N0[0] + 12, N0[1] - 2)
  ctx.stroke()
  // LONG MULLET: hair mass streaming down the BACK of the neck onto the torso
  const mlen = 46 * mul
  const sway = Math.sin(t * 2.6) * 6
  ctx.fillStyle = sil ? '#0a0c12' : PAL.mane0
  ctx.beginPath()
  ctx.moveTo(60, -52)
  ctx.quadraticCurveTo(24 + sway * 0.4, -26, -34 + sway, -2 - mlen * 0.08)
  ctx.quadraticCurveTo(26 + sway * 0.5, -20, 50, -38)
  ctx.closePath()
  ctx.fill()
  maneStrands(ctx, [[52, -44], [40, -32], [22, -18], [0, -8]], t, 33, {
    dir: -1, len: mlen * 0.75, wid: 3, gust: 1.2, col0: PAL.mane0, col1: PAL.mane1, n: 2, alpha: sil ? 0 : 0.9,
  })
  // ---- head ----
  const [hxp, hyp] = qp(1)
  const [nx2, ny2] = qp(0.83)
  const hang = Math.atan2(hyp - ny2, hxp - nx2)
  ctx.save()
  ctx.translate(hxp, hyp)
  ctx.rotate(hang + Math.PI / 2 + 0.35 - sniff * 0.4 + jaw * 0.08)
  // skull + snout
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(0, -10, 13, 16, 0, 0, 7)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-2, -20)
  ctx.quadraticCurveTo(20, -24, 34, -12)
  ctx.quadraticCurveTo(36, -8, 30, -7)
  ctx.lineTo(0, -6)
  ctx.closePath()
  ctx.fill()
  // teeth (upper)
  if (!sil) {
    ctx.fillStyle = '#e8e4d4'
    for (let i = 0; i < 6; i++) {
      const tx = 6 + i * 4.6
      ctx.beginPath()
      ctx.moveTo(tx, -6.5)
      ctx.lineTo(tx + 2, -2.4)
      ctx.lineTo(tx + 4, -6.5)
      ctx.closePath()
      ctx.fill()
    }
  }
  // lower jaw rotates open
  ctx.save()
  ctx.translate(2, -5)
  ctx.rotate(jaw * 0.55)
  ctx.fillStyle = bodyLo
  ctx.beginPath()
  ctx.moveTo(-2, 0)
  ctx.quadraticCurveTo(18, 4, 32, 1)
  ctx.quadraticCurveTo(20, 7, 0, 5)
  ctx.closePath()
  ctx.fill()
  if (!sil && jaw > 0.25) {
    ctx.fillStyle = '#5a1414'
    ctx.beginPath()
    ctx.ellipse(12, 2, 12, 3.4, 0, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#e8e4d4'
    for (let i = 0; i < 5; i++) {
      const tx = 5 + i * 4.6
      ctx.beginPath()
      ctx.moveTo(tx, 2.6)
      ctx.lineTo(tx + 2, 6)
      ctx.lineTo(tx + 4, 2.6)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
  // eye (amber, nasty)
  if (!sil) {
    ctx.fillStyle = '#181410'
    ctx.beginPath()
    ctx.ellipse(6, -14, 4.4, 3.6, -0.2, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#ffb028'
    ctx.beginPath()
    ctx.arc(7, -14, 2, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#0c0a08'
    ctx.beginPath()
    ctx.arc(7.6, -14, 0.9, 0, 7)
    ctx.fill()
  }
  // MOHAWK CREST: spiky strip up front, leaning forward
  const crest = sil ? '#0a0c12' : PAL.mane1
  ctx.fillStyle = crest
  for (let i = 0; i < 5; i++) {
    const bx = -6 - i * 4.4
    const hh = (12 - i * 1.2) * mul
    const lean2 = -0.45 - i * 0.08 + Math.sin(t * 5 + i) * 0.06
    ctx.beginPath()
    ctx.moveTo(bx, -22)
    ctx.lineTo(bx + Math.sin(lean2) * hh, -22 - Math.cos(lean2) * hh)
    ctx.lineTo(bx + 4, -21)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore() // head
  ctx.restore() // body
  // ---- near leg ----
  legDraw(run, false)
  // ---- little clawed arms ----
  ctx.strokeStyle = bodyLo
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(26, -64)
  ctx.quadraticCurveTo(40, -56, 44 - jaw * 4, -46 + pounce * 6)
  ctx.stroke()
  ctx.restore()
}

// ============================== DINOSAUR 3 — THE B-REX ==============================
// Giant BALD T-Rex. o: { dir, jaw, stride(phase; a foot plants each PI),
// crouch (rear-sag anticipation), lean, sniff, wet (crown specular), specX,
// stubble, mane (0..1 strand-by-strand regrow), breathe, sil, rim ('#hex' crown rim) }
export function brex(ctx, x, feetY, s, t, o = {}) {
  const dir = o.dir ?? 1
  const jaw = cl(o.jaw ?? 0)
  const stride = o.stride ?? 0
  const crouch = cl(o.crouch ?? 0)
  const lean = o.lean ?? 0
  const sniff = cl(o.sniff ?? 0)
  const wet = cl(o.wet ?? 0)
  const specX = o.specX ?? 0.5
  const stubble = cl(o.stubble ?? 0)
  const mane = cl(o.mane ?? 0)
  const breathe = cl(o.breathe ?? 0)
  const sil = o.sil ?? false
  ctx.save()
  ctx.translate(x, feetY)
  ctx.rotate(lean * 0.1)
  ctx.scale(dir * s, s * (1 - crouch * 0.07))
  const body = sil ? '#0a0c12' : PAL.rex
  const bodyLo = sil ? '#06080c' : PAL.rexLo
  const bodyHi = sil ? '#121826' : PAL.rexHi
  // ---- tail (thick, counterweight, slow sway) ----
  ctx.strokeStyle = bodyLo
  ctx.lineWidth = 62
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-128, -240)
  ctx.quadraticCurveTo(-260, -262 + Math.sin(t * 1.1) * 10, -358, -206 + Math.sin(t * 1.1 + 1.2) * 14)
  ctx.stroke()
  ctx.strokeStyle = body
  ctx.lineWidth = 42
  ctx.beginPath()
  ctx.moveTo(-128, -244)
  ctx.quadraticCurveTo(-256, -266 + Math.sin(t * 1.1) * 10, -352, -212 + Math.sin(t * 1.1 + 1.2) * 14)
  ctx.stroke()
  // ---- far leg (offset, darker; stride swing) ----
  const rexLeg = (ph, dk) => {
    const sw = Math.sin(ph) * 26
    const lift = Math.max(0, Math.sin(ph)) * 26
    ctx.strokeStyle = dk ? bodyLo : body
    ctx.lineWidth = dk ? 40 : 48
    ctx.beginPath()
    ctx.moveTo(-30, -212)
    ctx.quadraticCurveTo(16 + sw * 0.5, -120, -6 + sw, -34 - lift)
    ctx.stroke()
    // foot + claws
    ctx.lineWidth = dk ? 34 : 40
    ctx.beginPath()
    ctx.moveTo(-6 + sw, -30 - lift)
    ctx.lineTo(24 + sw, -6 - lift)
    ctx.stroke()
    ctx.lineWidth = 9
    for (const tn of [0, 1, 2]) {
      ctx.beginPath()
      ctx.moveTo(26 + sw, -8 - lift)
      ctx.lineTo(48 + sw + tn * 6, -2 - lift + tn * 4)
      ctx.stroke()
    }
  }
  rexLeg(stride * Math.PI + Math.PI, true)
  // ---- body: haunches + deep chest ----
  const chest = 1 + breathe * 0.06
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(-66, -252, 122, 108, 0.1, 0, 7)
  ctx.fill()
  ctx.save()
  ctx.translate(30, -258)
  ctx.scale(chest, 1 + breathe * 0.03)
  ctx.beginPath()
  ctx.ellipse(0, 0, 128, 98, -0.08, 0, 7)
  ctx.fill()
  ctx.restore()
  if (!sil) {
    // mottling + belly light
    const r = rng(97)
    for (let i = 0; i < 34; i++) {
      const mx = -170 + r() * 300, my = -330 + r() * 200
      ctx.fillStyle = `rgba(52,48,38,${0.08 + r() * 0.1})`
      ctx.beginPath()
      ctx.ellipse(mx, my, 8 + r() * 20, 6 + r() * 12, r() * 3, 0, 7)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(168,160,132,0.4)'
    ctx.beginPath()
    ctx.ellipse(10, -190, 90, 34, 0.05, 0, 7)
    ctx.fill()
    // wet sheen streaks in the rain
    if (wet > 0.05) {
      ctx.fillStyle = `rgba(220,232,240,${0.14 * wet})`
      ctx.fillRect(-20, -330, 8, 130)
      ctx.fillRect(-90, -320, 6, 110)
    }
  }
  // back rim (moon/headlight) along the spine
  ctx.strokeStyle = sil ? 'rgba(190,205,240,0.5)' : 'rgba(226,226,214,0.4)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(-160, -320)
  ctx.quadraticCurveTo(-40, -372, 90, -348)
  ctx.stroke()
  // ---- tiny arms ----
  ctx.strokeStyle = bodyLo
  ctx.lineWidth = 13
  ctx.beginPath()
  ctx.moveTo(64, -262)
  ctx.quadraticCurveTo(96, -240, 100 - jaw * 6, -204 + breathe * 6)
  ctx.stroke()
  ctx.lineWidth = 5
  for (const tn of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(100 - jaw * 6, -204 + breathe * 6)
    ctx.lineTo(112 - jaw * 6, -196 + breathe * 6 + tn * 7)
    ctx.stroke()
  }
  // ---- neck + head (group leans down for the sniff/snarl) ----
  ctx.save()
  ctx.translate(96, -320)
  ctx.rotate(-0.12 + sniff * 0.62 - jaw * 0.04)
  // neck
  ctx.strokeStyle = body
  ctx.lineWidth = 76
  ctx.beginPath()
  ctx.moveTo(-10, 8)
  ctx.quadraticCurveTo(38, -12, 66, -34)
  ctx.stroke()
  // skull — the BALD CROWN: a great smooth dome
  ctx.fillStyle = bodyHi
  ctx.beginPath()
  ctx.moveTo(28, -30)
  ctx.quadraticCurveTo(60, -108, 138, -74)
  ctx.quadraticCurveTo(172, -58, 186, -34)
  ctx.lineTo(120, -18)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = body
  // snout
  ctx.beginPath()
  ctx.moveTo(96, -66)
  ctx.quadraticCurveTo(190, -62, 226, -34)
  ctx.quadraticCurveTo(232, -24, 222, -20)
  ctx.quadraticCurveTo(160, -12, 104, -16)
  ctx.closePath()
  ctx.fill()
  if (!sil) {
    // crown shading: the dome catches light — the wet gleam
    const dome = ctx.createLinearGradient(60, -100, 150, -50)
    dome.addColorStop(0, '#b8b298')
    dome.addColorStop(0.5, '#8e8870')
    dome.addColorStop(1, '#6e6a56')
    ctx.fillStyle = dome
    ctx.beginPath()
    ctx.moveTo(34, -38)
    ctx.quadraticCurveTo(64, -102, 134, -70)
    ctx.quadraticCurveTo(120, -56, 70, -44)
    ctx.closePath()
    ctx.fill()
    // MOVING SPECULAR: elongated gleam sweeping the dome (the gag)
    if (wet > 0.03) {
      const sx = lerp(58, 128, specX)
      ctx.save()
      ctx.globalAlpha = 0.85 * wet
      ctx.translate(sx, -78 + (sx - 58) * 0.16)
      ctx.rotate(-0.5 + (sx - 58) * 0.012)
      const g2 = ctx.createRadialGradient(0, 0, 2, 0, 0, 30)
      g2.addColorStop(0, 'rgba(255,255,255,0.95)')
      g2.addColorStop(0.5, 'rgba(235,244,250,0.5)')
      g2.addColorStop(1, 'rgba(235,244,250,0)')
      ctx.fillStyle = g2
      ctx.beginPath()
      ctx.ellipse(0, 0, 30, 9, 0, 0, 7)
      ctx.fill()
      ctx.restore()
      // rain drip streaks off the crown edge
      ctx.strokeStyle = `rgba(210,228,240,${0.4 * wet})`
      ctx.lineWidth = 2
      for (let i = 0; i < 4; i++) {
        const dx = 70 + i * 22 + Math.sin(t * 3 + i * 2) * 3
        const dy = -52 - i * 6
        const drop = ((t * 130 + i * 37) % 46)
        ctx.beginPath()
        ctx.moveTo(dx, dy + drop)
        ctx.lineTo(dx - 2, dy + drop + 12)
        ctx.stroke()
      }
    }
    // STUBBLE: dark speckle creeping over the crown (pre-regrow)
    if (stubble > 0.02) {
      const r2 = rng(53)
      for (let i = 0; i < 70; i++) {
        const u = r2(), v = r2()
        const px = 44 + u * 100, py = -96 + v * 52 + (1 - u) * 10
        if (py > -34 + (px - 44) * 0.3) continue
        ctx.globalAlpha = stubble * (0.35 + r2() * 0.4)
        ctx.fillStyle = '#2e2a22'
        ctx.fillRect(px, py, 2.2, 2.2)
      }
      ctx.globalAlpha = 1
    }
    // THE MANE: strand-by-strand eruption over the crown + down the neck back.
    // strand i grows once mane passes its gate; length eases in over its window.
    // 14 crown roots sweep the whole dome, 8 trail down the neck back — the
    // under-mass + strand widths mass it into a real silhouette, not whiskers.
    if (mane > 0.001) {
      const roots = []
      for (let i = 0; i < 16; i++) {
        const u = i / 15
        roots.push([36 + u * 116, -100 + u * u * 34 + u * 20])
      }
      for (let i = 0; i < 9; i++) roots.push([42 - i * 9, -50 - i * 13]) // neck-back roots
      const N = roots.length
      const strands = []
      for (let i = 0; i < N; i++) {
        const gate = (i / N) * 0.62
        const grow = cl((mane - gate) / 0.16)
        if (grow <= 0) continue
        const [rx, ry] = roots[i]
        // front roots = short forelock, crown mid = long, neck trail = longest
        const base = i < 16 ? 52 + (i / 15) * 88 + hash(i * 7.3) * 48 : 120 + hash(i * 7.3) * 56
        const L = base * grow
        const flut = Math.sin(t * 3.2 + i * 1.31) * (6 + 9 * grow)
        strands.push([rx, ry, L, flut, i, grow])
      }
      // under-mass: a solid hair cape hugging the crest line and draping
      // down the back of the neck (grows with the regrow ramp)
      ctx.fillStyle = 'rgba(48,30,18,0.94)'
      ctx.beginPath()
      ctx.moveTo(26, -78)
      for (let ri = 0; ri < roots.length; ri++) {
        const [rx, ry] = roots[ri]
        const th = mane * (34 + hash(ri * 3.7) * 22) + 10
        ctx.lineTo(rx - th * 0.75, ry + th * 0.9)
      }
      ctx.quadraticCurveTo(-24, -12, 26, -78)
      ctx.closePath()
      ctx.fill()
      ctx.lineCap = 'round'
      for (const [rx, ry, L, flut, i, grow] of strands) {
        ctx.strokeStyle = i % 3 === 0 ? PAL.mane3 : i % 2 ? PAL.mane2 : PAL.mane0
        ctx.lineWidth = 13 - (i % 3)
        // strands hang down-back along the neck, roughly parallel (flowing)
        ctx.beginPath()
        ctx.moveTo(rx, ry)
        ctx.quadraticCurveTo(rx - L * 0.1 + flut * 0.4, ry + L * 0.25, rx - L * 0.5 + flut, ry + L * 0.6)
        ctx.stroke()
        // lit tips (sunrise rim through the fresh mane)
        if (grow > 0.8) {
          ctx.strokeStyle = 'rgba(255,204,130,0.75)'
          ctx.lineWidth = 5.2
          ctx.beginPath()
          ctx.moveTo(rx - L * 0.3 + flut * 0.7, ry + L * 0.42)
          ctx.lineTo(rx - L * 0.5 + flut, ry + L * 0.6)
          ctx.stroke()
        }
      }
    }
  }
  // brow + eye
  ctx.strokeStyle = bodyLo
  ctx.lineWidth = 9
  ctx.beginPath()
  ctx.moveTo(118, -52)
  ctx.quadraticCurveTo(136, -60, 152, -50)
  ctx.stroke()
  if (!sil) {
    ctx.fillStyle = '#181410'
    ctx.beginPath()
    ctx.ellipse(138, -42, 7, 5.6, -0.15, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#ffcd5a'
    ctx.beginPath()
    ctx.arc(139.5, -42, 3, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#0c0a08'
    ctx.beginPath()
    ctx.arc(140.5, -42, 1.3, 0, 7)
    ctx.fill()
    // nostril
    ctx.fillStyle = '#26221c'
    ctx.beginPath()
    ctx.ellipse(212, -34, 3.4, 2.6, 0.4, 0, 7)
    ctx.fill()
  }
  // upper teeth
  if (!sil) {
    ctx.fillStyle = '#efe8d2'
    for (let i = 0; i < 7; i++) {
      const tx = 128 + i * 14
      const th = 10 + (i % 3) * 4
      ctx.beginPath()
      ctx.moveTo(tx, -20)
      ctx.lineTo(tx + 5, -20 + th)
      ctx.lineTo(tx + 10, -20)
      ctx.closePath()
      ctx.fill()
    }
  }
  // lower jaw rotates open (big pivot at the back)
  ctx.save()
  ctx.translate(96, -16)
  ctx.rotate(jaw * 0.5)
  ctx.fillStyle = bodyLo
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(70, 14, 136, 6)
  ctx.quadraticCurveTo(80, 26, 6, 16)
  ctx.closePath()
  ctx.fill()
  if (!sil && jaw > 0.2) {
    ctx.fillStyle = '#4a1010'
    ctx.beginPath()
    ctx.ellipse(64, 8, 52, 9, 0.02, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#efe8d2'
    for (let i = 0; i < 6; i++) {
      const tx = 108 - i * 15
      ctx.beginPath()
      ctx.moveTo(tx, 8)
      ctx.lineTo(tx - 4, 20 + (i % 2) * 4)
      ctx.lineTo(tx - 9, 8)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
  ctx.restore() // head group
  // ---- near leg ----
  rexLeg(stride * Math.PI, false)
  ctx.restore()
}

// tiny mohawk hatchling (lab)
export function hatchling(ctx, x, y, s, t, o = {}) {
  const pop = cl(o.pop ?? 1)
  ctx.save()
  ctx.translate(x, y - pop * 2)
  ctx.scale(s, s)
  const wig = Math.sin(t * 9) * 0.14 * (o.wiggle ?? 1)
  ctx.rotate(wig * 0.5)
  // body + tail
  ctx.fillStyle = '#7a8a5a'
  ctx.beginPath()
  ctx.ellipse(0, -10, 12, 9, 0, 0, 7)
  ctx.fill()
  ctx.strokeStyle = '#6a7a4c'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-9, -9)
  ctx.quadraticCurveTo(-20, -8 + Math.sin(t * 5) * 2, -26, -3)
  ctx.stroke()
  // head
  ctx.fillStyle = '#8a9a64'
  ctx.beginPath()
  ctx.arc(4, -22, 8, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#181410'
  ctx.beginPath()
  ctx.arc(7, -23, 1.7, 0, 7)
  ctx.fill()
  // beak + chirp mouth
  ctx.fillStyle = '#e8b84a'
  ctx.beginPath()
  ctx.moveTo(11, -22)
  ctx.lineTo(15, -20.5)
  ctx.lineTo(11, -19)
  ctx.closePath()
  ctx.fill()
  if (o.chirp) {
    ctx.strokeStyle = 'rgba(255,232,168,0.8)'
    ctx.lineWidth = 1.2
    for (let i = 0; i < 2; i++) {
      ctx.beginPath()
      ctx.arc(19 + i * 4, -23 + i * 2, 2 + i * 1.4, -0.8, 0.8)
      ctx.stroke()
    }
  }
  // THE TINY MOHAWK
  ctx.fillStyle = '#d85838'
  for (let i = 0; i < 5; i++) {
    const bx = 3 - i * 3.4
    const hh = 14 - i * 1.6
    const ln = -0.35 - i * 0.14 + wig
    ctx.beginPath()
    ctx.moveTo(bx, -29)
    ctx.lineTo(bx + Math.sin(ln) * hh, -29 - Math.cos(ln) * hh)
    ctx.lineTo(bx + 3.6, -27.5)
    ctx.closePath()
    ctx.fill()
  }
  // tiny tail-tip fluff
  ctx.fillStyle = '#d85838'
  ctx.beginPath()
  ctx.moveTo(-24, -6)
  ctx.lineTo(-30, -11 + wig * 6)
  ctx.lineTo(-22, -9)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// ============================== props ==============================

// the amber-scissors cane (macro + hand prop)
export function amberCane(ctx, x, y, s, t, glintK = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  // shaft
  ctx.strokeStyle = '#2c2016'
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-8, -120, 6, -210)
  ctx.stroke()
  ctx.strokeStyle = '#4e3a24'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(-1, -6)
  ctx.quadraticCurveTo(-9, -120, 5, -204)
  ctx.stroke()
  // amber head: glowing resin blob with the scissors frozen inside
  const g = ctx.createRadialGradient(8, -238, 4, 8, -238, 44)
  g.addColorStop(0, PAL.amberHi)
  g.addColorStop(0.45, PAL.amber)
  g.addColorStop(1, PAL.amberDeep)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(8, -238, 34, 26, -0.3, 0, 7)
  ctx.fill()
  // frozen scissors (dark silhouette inside the resin)
  ctx.save()
  ctx.translate(8, -238)
  ctx.rotate(0.5)
  ctx.strokeStyle = 'rgba(60,40,16,0.85)'
  ctx.lineWidth = 4.4
  ctx.beginPath()
  ctx.moveTo(-14, 6)
  ctx.lineTo(12, -8)
  ctx.moveTo(-14, -8)
  ctx.lineTo(12, 6)
  ctx.stroke()
  ctx.lineWidth = 2.6
  ctx.beginPath()
  ctx.arc(-18, 4, 5, 0, 7)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(-18, -6, 5, 0, 7)
  ctx.stroke()
  ctx.restore()
  // inner fire-light flicker
  const fl = 0.5 + Math.sin(t * 9.3) * 0.2 + Math.sin(t * 15.7) * 0.12
  ctx.fillStyle = `rgba(255,216,138,${0.3 * fl})`
  ctx.beginPath()
  ctx.ellipse(2, -244, 12, 8, -0.5, 0, 7)
  ctx.fill()
  if (glintK > 0) glint(ctx, 20, -250, 44 * s * 0.3 + 14, glintK)
  ctx.restore()
}

// hatchery egg with crack progression (crackK 0..1)
export function egg(ctx, x, y, s, crackK, t) {
  const wob = crackK > 0 && crackK < 0.35 ? Math.sin(t * 26) * 0.06 * (1 - crackK / 0.35) : 0
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(wob)
  ctx.scale(s, s)
  const g = ctx.createLinearGradient(-30, -40, 30, 10)
  g.addColorStop(0, '#e8dcc2')
  g.addColorStop(0.55, '#cbbc9a')
  g.addColorStop(1, '#8a7c5e')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, -26, 30, 40, 0, 0, 7)
  ctx.fill()
  // speckle
  const r = rng(88)
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `rgba(120,104,74,${0.2 + r() * 0.25})`
    ctx.beginPath()
    ctx.arc(-22 + r() * 44, -52 + r() * 52, 1.4 + r() * 2, 0, 7)
    ctx.fill()
  }
  // crack lines grow with crackK: first fracture at 0.35, web by 0.8
  if (crackK > 0.32) {
    const k = cl((crackK - 0.32) / 0.5)
    ctx.strokeStyle = '#3a3020'
    ctx.lineWidth = 2
    const lines = [
      [[-20, -40], [-6, -30], [-12, -16]],
      [[16, -44], [4, -34], [14, -22]],
      [[-4, -28], [4, -18], [-2, -8]],
      [[-26, -22], [-14, -14], [-20, -4]],
    ]
    for (let li = 0; li < lines.length; li++) {
      if (k < li * 0.25) continue
      const u = cl((k - li * 0.25) / 0.25)
      const L = lines[li]
      ctx.beginPath()
      ctx.moveTo(L[0][0], L[0][1])
      ctx.lineTo(L[0][0] + (L[1][0] - L[0][0]) * Math.min(1, u * 2), L[0][1] + (L[1][1] - L[0][1]) * Math.min(1, u * 2))
      if (u > 0.5) ctx.lineTo(L[2][0], L[2][1])
      ctx.stroke()
    }
    // amber glow leaking from the cracks
    ctx.fillStyle = `rgba(255,196,90,${0.25 * k})`
    ctx.beginPath()
    ctx.ellipse(0, -28, 22, 30, 0, 0, 7)
    ctx.fill()
  }
  ctx.restore()
}

// painted jeep, side view facing +x. origin at ground under the body centre.
// o: { dent (roof dented), crack (windshield cracked), beams (0..1 handled by
// headBeams separately), brake (tail glow), wreck (roof-down landing state) }
export function jeep(ctx, x, y, s, o = {}) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  const bodyG = ctx.createLinearGradient(0, -120, 0, -20)
  bodyG.addColorStop(0, '#c8b442')
  bodyG.addColorStop(0.6, '#a08c30')
  bodyG.addColorStop(1, '#6e5e1e')
  // shadow
  ctx.fillStyle = 'rgba(6,6,4,0.5)'
  ctx.beginPath()
  ctx.ellipse(0, 2, 130, 14, 0, 0, 7)
  ctx.fill()
  if (o.wreck) {
    // roof-down wreck: crushed body + wheels up
    ctx.save()
    ctx.translate(0, -34)
    ctx.rotate(o.wreckRot ?? Math.PI)
    ctx.scale(1, 0.62)
    const wg = ctx.createLinearGradient(0, -50, 0, 50)
    wg.addColorStop(0, '#c8ae48')
    wg.addColorStop(1, '#7a6820')
    ctx.fillStyle = wg
    ctx.beginPath()
    ctx.ellipse(0, 0, 122, 54, 0, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#5e5218'
    ctx.beginPath()
    ctx.ellipse(-30, 6, 80, 30, 0, 0, 7)
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = '#3a3226'
    ctx.beginPath(); ctx.arc(-76, -58, 22, 0, 7); ctx.fill()
    ctx.beginPath(); ctx.arc(78, -62, 22, 0, 7); ctx.fill()
    ctx.restore()
    return
  }
  // chassis
  ctx.fillStyle = bodyG
  ctx.beginPath()
  ctx.moveTo(-124, -34)
  ctx.lineTo(-128, -66)
  ctx.quadraticCurveTo(-126, -84, -104, -86)
  ctx.lineTo(96, -86)
  ctx.quadraticCurveTo(126, -84, 130, -60)
  ctx.lineTo(126, -34)
  ctx.closePath()
  ctx.fill()
  // hood step + cabin
  ctx.fillStyle = '#7e6c24'
  ctx.beginPath()
  ctx.moveTo(-92, -86)
  ctx.lineTo(-84, -142)
  ctx.quadraticCurveTo(-80, -152, -66, -152)
  ctx.lineTo(40, -152)
  ctx.quadraticCurveTo(56, -150, 60, -138)
  ctx.lineTo(66, -86)
  ctx.closePath()
  ctx.fill()
  // windshield + window glass
  ctx.fillStyle = o.crack ? '#20262c' : '#39505c'
  ctx.beginPath()
  ctx.moveTo(44, -142)
  ctx.lineTo(58, -96)
  ctx.lineTo(20, -96)
  ctx.lineTo(16, -142)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#2c3e48'
  ctx.fillRect(-78, -142, 92, 46)
  // roof dent
  if (o.dent) {
    ctx.strokeStyle = '#4e4216'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(-40, -152)
    ctx.quadraticCurveTo(-28, -138, -8, -150)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(2, -150)
    ctx.quadraticCurveTo(14, -134, 34, -144)
    ctx.stroke()
  }
  // windshield cracks
  if (o.crack) {
    ctx.strokeStyle = 'rgba(220,230,238,0.75)'
    ctx.lineWidth = 1.6
    for (let i = 0; i < 5; i++) {
      const a = hash(i * 7) * 6.28
      ctx.beginPath()
      ctx.moveTo(36, -120)
      ctx.lineTo(36 + Math.cos(a) * 16, -120 + Math.sin(a) * 13)
      ctx.stroke()
    }
  }
  // roll bar + spot lamp
  ctx.strokeStyle = '#4e4216'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(-84, -152)
  ctx.lineTo(-84, -172)
  ctx.lineTo(-40, -172)
  ctx.moveTo(0, -86)
  ctx.lineTo(0, -168)
  ctx.stroke()
  // headlights (front, +x)
  ctx.fillStyle = o.beams ? '#fff2c0' : '#d8d2b0'
  ctx.beginPath()
  ctx.ellipse(124, -58, 9, 12, 0, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#8a1414'
  ctx.beginPath()
  ctx.ellipse(-126, -58, 6, 10, 0, 0, 7)
  ctx.fill()
  // wheels
  for (const wx of [-78, 78]) {
    ctx.fillStyle = '#1c1a16'
    ctx.beginPath()
    ctx.arc(wx, -30, 30, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#3a3830'
    ctx.beginPath()
    ctx.arc(wx, -30, 14, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#191713'
    ctx.beginPath()
    ctx.arc(wx, -30, 6, 0, 7)
    ctx.fill()
  }
  ctx.restore()
}

// volumetric headlight beams from (hx, hy) pointing at angle ang
export function headBeams(ctx, hx, hy, ang, len, k) {
  if (k <= 0.01) return
  ctx.save()
  ctx.translate(hx, hy)
  ctx.rotate(ang)
  for (const [dy, sp] of [[-6, 64], [7, 78]]) {
    const g = ctx.createLinearGradient(0, 0, len, 0)
    g.addColorStop(0, `rgba(255,240,190,${0.34 * k})`)
    g.addColorStop(0.7, `rgba(255,236,180,${0.1 * k})`)
    g.addColorStop(1, 'rgba(255,236,180,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(0, dy)
    ctx.lineTo(len, dy - sp)
    ctx.lineTo(len, dy + sp)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

// helicopter (dawn): body, tail boom, rotor blur
export function heli(ctx, x, y, s, t, o = {}) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  const tilt = o.tilt ?? -0.06
  ctx.rotate(tilt)
  // tail boom
  ctx.fillStyle = '#2a3038'
  ctx.fillRect(-96, -8, 86, 10)
  ctx.fillStyle = '#222830'
  ctx.beginPath()
  ctx.moveTo(-104, -22)
  ctx.lineTo(-88, -4)
  ctx.lineTo(-112, -2)
  ctx.closePath()
  ctx.fill()
  // body pod
  ctx.fillStyle = '#333c46'
  ctx.beginPath()
  ctx.ellipse(6, 0, 52, 26, 0, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#9ab4c4'
  ctx.beginPath()
  ctx.ellipse(30, -4, 22, 14, 0, 0, 7)
  ctx.fill()
  // skids
  ctx.strokeStyle = '#1a2026'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-34, 30)
  ctx.lineTo(48, 30)
  ctx.moveTo(-20, 22)
  ctx.lineTo(-26, 30)
  ctx.moveTo(34, 22)
  ctx.lineTo(40, 30)
  ctx.stroke()
  // mast + main rotor blur (spinning blades on real t)
  ctx.fillStyle = '#1a2026'
  ctx.fillRect(2, -30, 8, 10)
  const ra = t * 46
  ctx.strokeStyle = 'rgba(20,24,30,0.55)'
  ctx.lineWidth = 5
  for (const off of [0, Math.PI]) {
    ctx.beginPath()
    ctx.moveTo(Math.cos(ra + off) * 120, -34 + Math.sin(ra + off) * 7)
    ctx.lineTo(Math.cos(ra + off + Math.PI) * 120, -34 + Math.sin(ra + off + Math.PI) * 7)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(160,176,190,0.28)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.ellipse(0, -34, 122, 9, 0, 0, 7)
  ctx.stroke()
  // tail rotor
  ctx.strokeStyle = 'rgba(20,24,30,0.6)'
  ctx.lineWidth = 3
  const ra2 = -t * 60
  ctx.beginPath()
  ctx.moveTo(-98, -26 + Math.cos(ra2) * 16)
  ctx.lineTo(-98, -26 - Math.cos(ra2) * 16)
  ctx.stroke()
  ctx.restore()
}

// lobby banner: hanging cloth with baked diegetic text; o.fall 0..1 drops it,
// o.drape 0..1 bends it over the rex like a cape
export function bannerCloth(ctx, cx, topY, w, h, t, o = {}) {
  const fall = cl(o.fall ?? 0)
  const drape = cl(o.drape ?? 0)
  const sway = Math.sin(t * 1.4) * 10 * (1 - fall) + Math.sin(t * 3.1) * 16 * fall * (1 - drape)
  const drop = fall * fall * (o.fallDist ?? 480)
  ctx.save()
  ctx.translate(cx + sway * 0.4, topY + drop)
  const folds = Math.sin(t * 2.2) * (6 + fall * 10)
  // drape: bend the cloth over an arc (rex crown/back)
  if (drape > 0) {
    ctx.rotate(-0.15 * drape)
  }
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
  g.addColorStop(0, '#5e1c10')
  g.addColorStop(0.35, '#92261a')
  g.addColorStop(0.55, '#b03024')
  g.addColorStop(1, '#641a10')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-w / 2, 0)
  ctx.quadraticCurveTo(0, 8, w / 2, 0)
  ctx.quadraticCurveTo(w / 2 + folds, h * 0.5, w / 2 + sway, h)
  ctx.quadraticCurveTo(0, h + 10 + fall * 14, -w / 2 + sway * 0.8, h)
  ctx.quadraticCurveTo(-w / 2 + folds * 0.6, h * 0.5, -w / 2, 0)
  ctx.closePath()
  ctx.fill()
  // cloth fold shading
  ctx.strokeStyle = 'rgba(40,8,6,0.45)'
  ctx.lineWidth = 5
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(-w / 2 + (i * w) / 4, 4)
    ctx.quadraticCurveTo(-w / 2 + (i * w) / 4 + folds * 0.4, h * 0.5, -w / 2 + (i * w) / 4 + sway * 0.5, h - 4)
    ctx.stroke()
  }
  // hem stripe + diegetic text (baked art — reviewed in stills)
  ctx.strokeStyle = '#e0b050'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-w / 2 + sway * 0.8, h - 8)
  ctx.quadraticCurveTo(0, h + 4 + fall * 12, w / 2 + sway, h - 8)
  ctx.stroke()
  const fs = Math.round(h * 0.3)
  ctx.font = `${fs}px Anton`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const tY = h * 0.42
  ctx.fillStyle = 'rgba(30,6,4,0.8)'
  ctx.fillText('WHEN HAIR RULED THE EARTH', 2, tY + 3)
  ctx.fillStyle = '#f0cc6a'
  ctx.fillText('WHEN HAIR RULED THE EARTH', 0, tY)
  ctx.restore()
}

// paddock fence: posts + sagging cables; o.snap 0..1 after the smash —
// the centre span cables split into curled loose ends
export function fence(ctx, x0, x1, baseY, t, o = {}) {
  const snap = cl(o.snap ?? 0)
  ctx.save()
  ctx.lineCap = 'round'
  for (let px = x0; px <= x1; px += 150) {
    const h = 118 + hash(px) * 12
    ctx.fillStyle = '#3e362a'
    ctx.fillRect(px - 6, baseY - h, 12, h)
    ctx.fillStyle = '#54483a'
    ctx.fillRect(px - 6, baseY - h, 5, h)
  }
  const midX = o.midX ?? (x0 + x1) / 2
  for (let c = 0; c < 3; c++) {
    const cy = baseY - 34 - c * 34
    ctx.strokeStyle = '#787061'
    ctx.lineWidth = 3
    if (snap < 0.98) {
      ctx.beginPath()
      ctx.moveTo(x0, cy + 6)
      for (let px = x0; px <= x1; px += 40) ctx.lineTo(px, cy + 6 + Math.sin(px * 0.02 + c) * 4)
      ctx.stroke()
    }
    if (snap > 0) {
      // snapped: two loose ends curling away from the smash point
      const droop = 30 + snap * 50
      ctx.strokeStyle = '#8a8272'
      ctx.lineWidth = 3.4
      ctx.beginPath()
      ctx.moveTo(midX - 260, cy + 6)
      ctx.quadraticCurveTo(midX - 140, cy + droop * 0.5, midX - 60 - snap * 30, cy + droop + Math.sin(t * 4) * 4 * snap)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(midX + 300, cy + 6)
      ctx.quadraticCurveTo(midX + 170, cy + droop * 0.6, midX + 70 + snap * 30, cy + droop + 12 + Math.sin(t * 4 + 2) * 4 * snap)
      ctx.stroke()
    }
  }
  ctx.restore()
}

// control-room voltage map: island node map + counter, dies with volt 0..10000
export function voltScreen(ctx, x, y, w, h, t, volt, flicker) {
  ctx.save()
  ctx.translate(x, y)
  // bezel
  ctx.fillStyle = '#1a2026'
  ctx.fillRect(-w / 2 - 12, -h / 2 - 12, w + 24, h + 24)
  const on = volt > 100 ? 1 : flicker > 0 ? flicker : 0.06
  ctx.fillStyle = `rgba(14,22,20,${0.9})`
  ctx.fillRect(-w / 2, -h / 2, w, h)
  // header
  txt(ctx, 'PADDOCK 9 — FENCE', 0, -h / 2 + 26, {
    size: 20, font: '"JetBrains Mono"', color: `rgba(140,220,180,${0.8 * on})`, align: 'center', track: 3,
  })
  // island node map: grid of nodes joined by lines; lines die as volt drops
  const nodes = []
  const r = rng(209)
  for (let i = 0; i < 12; i++) nodes.push([-w / 2 + 40 + r() * (w - 80), -h / 2 + 64 + r() * (h - 120)])
  for (let i = 1; i < nodes.length; i++) {
    const alive = i / nodes.length < volt / 10000
    ctx.strokeStyle = alive ? `rgba(120,230,150,${0.5 * on})` : `rgba(70,80,74,${0.4})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(nodes[i - 1][0], nodes[i - 1][1])
    ctx.lineTo(nodes[i][0], nodes[i][1])
    ctx.stroke()
  }
  for (let i = 0; i < nodes.length; i++) {
    const alive = i / nodes.length < volt / 10000
    ctx.fillStyle = alive ? `rgba(160,255,180,${0.9 * on})` : '#3a423c'
    ctx.beginPath()
    ctx.arc(nodes[i][0], nodes[i][1], 4.4, 0, 7)
    ctx.fill()
  }
  // travelling pulse on the live map
  if (volt > 400) {
    const u = (t * 0.5) % 1
    const i = Math.max(1, Math.floor(u * (nodes.length - 1)))
    const f = u * (nodes.length - 1) - (i - 1)
    const px = lerp(nodes[i - 1][0], nodes[i][0], f)
    const py = lerp(nodes[i - 1][1], nodes[i][1], f)
    ctx.fillStyle = `rgba(220,255,220,${0.8 * on})`
    ctx.beginPath()
    ctx.arc(px, py, 6, 0, 7)
    ctx.fill()
  }
  // the counter
  txt(ctx, `${Math.round(volt).toLocaleString('en-US')} V`, 0, h / 2 - 26, {
    size: 34, font: '"JetBrains Mono"', color: volt > 100 ? 'rgba(220,255,220,0.95)' : 'rgba(180,60,50,0.95)', align: 'center', track: 2,
  })
  ctx.restore()
}

// the water cup, macro. Ripples: concentric rings exactly at each boom time.
export function waterCup(ctx, x, y, s, t, booms, o = {}) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  const cw = 120, ch = 170 // half-width top, height
  // cup body (translucent plastic)
  const g = ctx.createLinearGradient(-cw, 0, cw, 0)
  g.addColorStop(0, 'rgba(210,224,232,0.34)')
  g.addColorStop(0.3, 'rgba(240,248,252,0.18)')
  g.addColorStop(0.7, 'rgba(224,236,244,0.26)')
  g.addColorStop(1, 'rgba(190,206,216,0.4)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-cw, -ch)
  ctx.quadraticCurveTo(-96, 0, -84, 8)
  ctx.lineTo(84, 8)
  ctx.quadraticCurveTo(96, 0, cw, -ch)
  ctx.closePath()
  ctx.fill()
  // rim
  ctx.strokeStyle = 'rgba(228,240,248,0.7)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.ellipse(0, -ch, cw, 24, 0, 0, 7)
  ctx.stroke()
  // water surface
  const wY = -ch + 52
  ctx.fillStyle = 'rgba(120,160,180,0.5)'
  ctx.beginPath()
  ctx.ellipse(0, wY, cw - 10, 20, 0, 0, 7)
  ctx.fill()
  // RIPPLES — one ring set per boom, growing radius, rising amplitude/speed
  for (let bi = 0; bi < booms.length; bi++) {
    const age = t - booms[bi]
    if (age <= 0 || age > 1.5) continue
    const speed = 90 + bi * 55
    const amp = 0.5 + bi * 0.3
    for (let ring = 0; ring < 3; ring++) {
      const rr = age * speed - ring * 26
      if (rr <= 0 || rr > cw - 14) continue
      ctx.strokeStyle = `rgba(226,244,252,${(0.65 - ring * 0.16) * amp * (1 - age / 1.5)})`
      ctx.lineWidth = 2.6 - ring * 0.5
      ctx.beginPath()
      ctx.ellipse(0, wY + Math.sin(age * 9 + ring) * 1.6 * amp, rr, rr * 0.185, 0, 0, 7)
      ctx.stroke()
    }
  }
  // surface glint sweeping
  const gx = Math.sin(t * 0.9) * (cw - 40)
  ctx.fillStyle = 'rgba(240,250,255,0.5)'
  ctx.beginPath()
  ctx.ellipse(gx, wY - 3, 26, 5, 0, 0, 7)
  ctx.fill()
  // cup side ribs + lid straw hole (party cup read)
  ctx.strokeStyle = 'rgba(200,216,226,0.3)'
  ctx.lineWidth = 2
  for (const ry of [-40, -10, 20]) {
    ctx.beginPath()
    ctx.moveTo(-cw + 24 + ry * 0.22, ry + wY + 44)
    ctx.quadraticCurveTo(0, ry + wY + 52, cw - 24 - ry * 0.22, ry + wY + 44)
    ctx.stroke()
  }
  ctx.restore()
}

// ============================== stages (baked once in build) ==============================

function skyGrad(x, w, h, stops, o = {}) {
  const g = x.createLinearGradient(0, o.y0 ?? -OS, 0, o.y1 ?? h)
  for (const [p, c] of stops) g.addColorStop(p, c)
  x.fillStyle = g
  x.fillRect(-OS, -OS, w + OS * 2, h + OS * 2)
}

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
  for (const [px, py, pw] of peaks) {
    x.fillStyle = colLit
    x.globalAlpha = 0.8
    x.beginPath(); x.moveTo(px, py); x.lineTo(px - pw, baseY); x.lineTo(px, baseY); x.closePath(); x.fill()
    x.fillStyle = colShade
    x.globalAlpha = 0.8
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + pw, baseY); x.lineTo(px, baseY); x.closePath(); x.fill()
    x.globalAlpha = 1
  }
  const hz = x.createLinearGradient(0, baseY - amp * 0.3, 0, baseY + 30)
  hz.addColorStop(0, 'rgba(0,0,0,0)')
  hz.addColorStop(1, hazeCol)
  x.fillStyle = hz
  x.fillRect(-OS, baseY - amp * 0.3, w + OS * 2, 60)
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

// jungle canopy blob wall
function jungle(x, x0, x1, baseY, h, seed, dark) {
  const r = rng(seed)
  for (let i = 0; i < 26; i++) {
    const px = x0 + r() * (x1 - x0), py = baseY - r() * h
    const pr = 30 + r() * 70
    x.fillStyle = dark ? PAL.jungle0 : i % 3 ? PAL.jungle1 : PAL.jungle2
    x.beginPath()
    x.ellipse(px, py, pr, pr * 0.72, r() * 3, 0, 7)
    x.fill()
    if (!dark && r() > 0.6) {
      x.fillStyle = PAL.jungleLit
      x.globalAlpha = 0.4
      x.beginPath()
      x.ellipse(px - pr * 0.2, py - pr * 0.25, pr * 0.5, pr * 0.35, 0, 0, 7)
      x.fill()
      x.globalAlpha = 1
    }
  }
}

// torch bowl + wood post (flames painted live over the baked bowl)
function torchPost(x, px, py) {
  x.fillStyle = PAL.wood
  x.fillRect(px - 7, py, 14, 210)
  x.fillStyle = PAL.woodHi
  x.fillRect(px - 7, py, 5, 210)
  x.fillStyle = '#2c2016'
  ctx1(x, px, py, 26, 10)
  x.fillStyle = '#1c140c'
  ctx1(x, px, py - 2, 20, 7)
}
function ctx1(x, px, py, w, h) {
  x.beginPath()
  x.ellipse(px, py, w, h, 0, 0, 7)
  x.fill()
}

// ---- S1 isle-approach: storm sea + jungle island + torch-lit wooden gates ----
function isleBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, PAL.storm0], [0.4, PAL.storm1], [0.72, PAL.storm2], [1, '#31424e']])
  clouds(x, 500, 200, 1000, 190, 61, '#101a22', '#263844', '#0a1016')
  clouds(x, 1500, 170, 860, 160, 62, '#121c24', '#2a3c48', '#0c1218')
  // distant lightning-lit cloud tear
  x.fillStyle = 'rgba(190,205,240,0.14)'
  x.beginPath()
  x.moveTo(880, 60)
  x.quadraticCurveTo(980, 150, 1060, 90)
  x.quadraticCurveTo(1000, 200, 920, 170)
  x.closePath()
  x.fill()
  // island ridge across the upper-middle
  ridge(x, W, 560, 90, 17, PAL.jungle0, PAL.jungle2, '#0a120c', 'rgba(40,60,70,0.5)')
  jungle(x, -OS, W + OS, 560, 150, 41, true)
  // the sea (foreground band) + boat
  const sea = x.createLinearGradient(0, 560, 0, H)
  sea.addColorStop(0, PAL.sea1)
  sea.addColorStop(1, PAL.sea0)
  x.fillStyle = sea
  x.fillRect(-OS, 560, W + OS * 2, H - 560 + OS)
  for (let i = 0; i < 7; i++) {
    x.fillStyle = [PAL.sea2, '#1e444e', '#244c56', '#2a545e'][i % 4]
    x.globalAlpha = 0.8
    const yy = 620 + i * 44
    x.beginPath()
    x.moveTo(-OS, yy)
    for (let px = -OS; px <= W + OS; px += 44) x.lineTo(px, yy + Math.sin(px * 0.008 + i * 2.2) * 7)
    x.lineTo(W + OS, yy + 26)
    x.lineTo(-OS, yy + 26)
    x.closePath()
    x.fill()
  }
  x.globalAlpha = 1
  // the boat: small tramp steamer, wake spreading
  const bx = 330, by = 852
  x.fillStyle = '#131c22'
  x.beginPath()
  x.moveTo(bx - 60, by)
  x.lineTo(bx + 64, by)
  x.lineTo(bx + 46, by + 22)
  x.lineTo(bx - 44, by + 22)
  x.closePath()
  x.fill()
  x.fillRect(bx - 14, by - 26, 26, 26)
  x.fillRect(bx + 16, by - 14, 10, 14)
  x.fillStyle = 'rgba(230,238,244,0.24)'
  x.beginPath()
  x.moveTo(bx + 64, by + 12)
  x.quadraticCurveTo(bx + 190, by + 26, bx + 330, by + 8)
  x.quadraticCurveTo(bx + 190, by + 44, bx + 64, by + 26)
  x.closePath()
  x.fill()
  // ---- the TORCH-LIT WOODEN GATES (centre-right, emerging from the mist) ----
  const gx = GEO.isle.gateX
  // grass shelf under the gates
  x.fillStyle = '#14231a'
  x.beginPath()
  x.ellipse(gx, GEO.isle.gateBase + 40, 460, 60, 0, 0, 7)
  x.fill()
  // door leaves are painted LIVE (they swing); the frame + lintel baked:
  x.fillStyle = PAL.wood
  x.fillRect(gx - 320, 300, 52, GEO.isle.gateBase - 300)
  x.fillRect(gx + 268, 300, 52, GEO.isle.gateBase - 300)
  x.fillStyle = PAL.woodHi
  x.fillRect(gx - 320, 300, 18, GEO.isle.gateBase - 300)
  x.fillRect(gx + 268, 300, 18, GEO.isle.gateBase - 300)
  // crossbeams
  x.fillStyle = PAL.woodLo
  for (const by of [380, 560]) {
    x.fillRect(gx - 320, by, 52, 14)
    x.fillRect(gx + 268, by, 52, 14)
  }
  // lintel + CARVED SIGN "HAIRASSIC PARK"
  x.fillStyle = PAL.wood
  x.fillRect(gx - 344, 232, 688, 74)
  x.fillStyle = PAL.woodHi
  x.fillRect(gx - 344, 232, 688, 12)
  x.fillStyle = PAL.woodLo
  x.fillRect(gx - 344, 292, 688, 14)
  x.font = '54px Anton'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillStyle = 'rgba(20,12,6,0.9)'
  x.fillText('HAIRASSIC PARK', gx, 272)
  x.fillStyle = '#c89a4e'
  x.fillText('HAIRASSIC PARK', gx - 2, 269)
  x.fillStyle = '#8a5f1c'
  x.fillText('HAIRASSIC PARK', gx - 3, 271)
  // torch posts flanking (bowls baked; flames live)
  torchPost(x, GEO.isle.torch[0][0], GEO.isle.torch[0][1] + 10)
  torchPost(x, GEO.isle.torch[1][0], GEO.isle.torch[1][1] + 10)
  // warm torch pool baked into the shelf
  const tp = x.createRadialGradient(gx, GEO.isle.gateBase, 20, gx, GEO.isle.gateBase, 320)
  tp.addColorStop(0, 'rgba(255,170,80,0.22)')
  tp.addColorStop(1, 'rgba(255,170,80,0)')
  x.fillStyle = tp
  x.fillRect(gx - 330, 380, 660, 420)
  return c
}

// ---- S2 the-valley: golden vista + waterfall + hero hill ----
function valleyBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#7ea8cc'], [0.3, '#c8c89a'], [0.5, '#f0cc80'], [0.68, '#ffe2a0'], [1, '#fff0c8']])
  clouds(x, 480, 220, 900, 150, 71, '#c8b488', '#f8e6b8', '#9a8860')
  clouds(x, 1480, 180, 760, 130, 72, '#d0bc90', '#fcecc0', '#a08c64')
  // sun shafts from the top-left
  for (const [sx2, sw, sa] of [[300, 90, 0.14], [560, 130, 0.1], [840, 100, 0.08]]) {
    const g = x.createLinearGradient(sx2, -OS, sx2 + 260, 700)
    g.addColorStop(0, `rgba(255,232,168,${sa})`)
    g.addColorStop(1, 'rgba(255,232,168,0)')
    x.fillStyle = g
    x.beginPath()
    x.moveTo(sx2, -OS)
    x.lineTo(sx2 + sw, -OS)
    x.lineTo(sx2 + sw + 420, 720)
    x.lineTo(sx2 + 300, 720)
    x.closePath()
    x.fill()
  }
  ridge(x, W, 520, 70, 23, '#7a8a68', '#a8b488', '#5a6a4c', 'rgba(250,225,170,0.5)')
  // mid ground: forest bands
  x.fillStyle = PAL.jungle1
  x.fillRect(-OS, 560, W + OS * 2, 90)
  jungle(x, -OS, W + OS, 620, 90, 43)
  x.fillStyle = PAL.jungle2
  x.fillRect(-OS, 640, W + OS * 2, 60)
  jungle(x, -OS, W + OS, 690, 70, 44)
  // grass field
  const gr = x.createLinearGradient(0, 700, 0, H)
  gr.addColorStop(0, '#a8b060')
  gr.addColorStop(0.5, '#8c9c4e')
  gr.addColorStop(1, '#5e7438')
  x.fillStyle = gr
  x.fillRect(-OS, 700, W + OS * 2, H - 700 + OS)
  const r = rng(77)
  for (let i = 0; i < 300; i++) {
    const px = r() * (W + OS * 2) - OS, py = 710 + r() * 330
    x.fillStyle = r() > 0.5 ? '#b8c070' : '#4e6430'
    x.globalAlpha = 0.3 + r() * 0.3
    x.fillRect(px, py, 3 + r() * 8, 2 + r() * 2)
  }
  x.globalAlpha = 1
  // tree cluster far left
  jungle(x, -100, 340, 760, 130, 45)
  // ---- waterfall + cliff (right) ----
  x.fillStyle = '#5e6a52'
  x.beginPath()
  x.moveTo(1300, H + OS)
  x.quadraticCurveTo(1360, 560, 1500, 420)
  x.quadraticCurveTo(1620, 300, 1780, 260)
  x.lineTo(W + OS, 240)
  x.lineTo(W + OS, H + OS)
  x.closePath()
  x.fill()
  x.fillStyle = '#6e7a60'
  x.globalAlpha = 0.7
  x.beginPath()
  x.moveTo(1500, 420)
  x.quadraticCurveTo(1620, 300, 1780, 260)
  x.quadraticCurveTo(1700, 360, 1620, 480)
  x.closePath()
  x.fill()
  x.globalAlpha = 1
  // the falls: pale column 1560 down to the pool
  const wg = x.createLinearGradient(1520, 0, 1620, 0)
  wg.addColorStop(0, 'rgba(240,248,252,0.85)')
  wg.addColorStop(0.5, 'rgba(214,232,240,0.95)')
  wg.addColorStop(1, 'rgba(240,248,252,0.8)')
  x.fillStyle = wg
  x.beginPath()
  x.moveTo(1524, 300)
  x.quadraticCurveTo(1516, 520, 1498, 762)
  x.lineTo(1602, 762)
  x.quadraticCurveTo(1592, 520, 1588, 300)
  x.closePath()
  x.fill()
  // rocks splitting the fall
  x.fillStyle = '#57624c'
  for (const [rx, ry, rw] of [[1552, 440, 16], [1568, 590, 13], [1544, 690, 11]]) {
    x.beginPath()
    x.ellipse(rx, ry, rw, rw * 0.6, 0.3, 0, 7)
    x.fill()
  }
  // the pool + river to the foreground
  x.fillStyle = '#3e6e78'
  x.beginPath()
  x.ellipse(1556, 780, 130, 34, 0, 0, 7)
  x.fill()
  x.fillStyle = '#4e8288'
  x.beginPath()
  x.moveTo(1430, 782)
  x.quadraticCurveTo(1200, 820, 980, 806)
  x.quadraticCurveTo(1200, 850, 1460, 812)
  x.closePath()
  x.fill()
  return c
}

// ---- S3 lab-hatchery: amber incubator lab ----
function labBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#241a10'], [0.5, '#3a2a16'], [1, '#4a3418']])
  // back wall panels + amber glow lamps
  x.fillStyle = '#332614'
  x.fillRect(-OS, -OS, W + OS * 2, 720)
  for (const lx of [240, 620, 1000, 1380]) {
    const g = x.createRadialGradient(lx, 180, 10, lx, 180, 240)
    g.addColorStop(0, 'rgba(255,190,90,0.4)')
    g.addColorStop(1, 'rgba(255,190,90,0)')
    x.fillStyle = g
    x.fillRect(lx - 240, -60, 480, 480)
    x.fillStyle = '#ffd88a'
    x.fillRect(lx - 60, 150, 120, 16)
  }
  // neon lab strip (cool accent)
  x.fillStyle = 'rgba(140,220,200,0.7)'
  x.fillRect(-OS, 80, W + OS * 2, 6)
  // incubator rack (shelf rows with egg cradles) centre-left
  for (let row = 0; row < 3; row++) {
    const ry = 380 + row * 130
    x.fillStyle = '#4e3a20'
    x.fillRect(420, ry, 480, 16)
    x.fillStyle = '#3a2a16'
    x.fillRect(430, ry + 16, 460, 10)
    for (let e = 0; e < 5; e++) {
      const ex = 460 + e * 100
      x.fillStyle = '#2c2012'
      x.beginPath()
      x.ellipse(ex, ry - 4, 26, 10, 0, 0, 7)
      x.fill()
      x.fillStyle = '#d8c8a0'
      x.beginPath()
      x.ellipse(ex, ry - 22, 18, 24, 0, 0, 7)
      x.fill()
      x.fillStyle = 'rgba(255,214,138,0.35)'
      x.beginPath()
      x.ellipse(ex, ry - 22, 22, 28, 0, 0, 7)
      x.fill()
    }
  }
  // work bench right (the cane lies here in macro)
  x.fillStyle = '#54402a'
  x.fillRect(1150, 660, 620, 30)
  x.fillStyle = '#3e2e1a'
  x.fillRect(1170, 690, 580, 240)
  // floor
  groundTex(x, W, 900, H, 31, '#3a2c1a', '#4e3c22', '#241a0e')
  // floor amber pools
  for (const lx of [500, 1100]) {
    const g = x.createRadialGradient(lx, 950, 10, lx, 950, 220)
    g.addColorStop(0, 'rgba(255,180,90,0.14)')
    g.addColorStop(1, 'rgba(255,180,90,0)')
    x.fillStyle = g
    x.fillRect(lx - 220, 760, 440, 320)
  }
  return c
}

// ---- S4 sabotage: storm-lit control room ----
function controlBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#1a2026'], [0.55, '#242c34'], [1, '#2c343c']])
  // wall
  x.fillStyle = '#2e3238'
  x.fillRect(-OS, -OS, W + OS * 2, 760)
  x.fillStyle = '#262a30'
  for (let px = -OS; px < W + OS; px += 160) x.fillRect(px, -OS, 6, 760)
  // THE BIG WINDOW (left): storm sky outside — clouds painted live past it
  x.fillStyle = '#11161c'
  x.fillRect(60, 200, 560, 480)
  x.strokeStyle = '#3a4048'
  x.lineWidth = 16
  x.strokeRect(60, 200, 560, 480)
  x.beginPath()
  x.moveTo(340, 200)
  x.lineTo(340, 680)
  x.stroke()
  // console bank (centre-right): desk + panels
  x.fillStyle = '#3a4046'
  x.fillRect(700, 700, 900, 60)
  x.fillStyle = '#2c3238'
  x.fillRect(730, 760, 840, 220)
  // side monitor stubs around the main screen
  for (const [mx, my] of [[820, 520], [1000, 500], [1480, 540]]) {
    x.fillStyle = '#141a20'
    x.fillRect(mx - 60, my - 44, 120, 88)
    x.fillStyle = 'rgba(90,160,140,0.25)'
    x.fillRect(mx - 52, my - 36, 104, 72)
  }
  // the desk props sit LIVE (can, vials, screen). floor:
  groundTex(x, W, 860, H, 37, '#262c32', '#343c44', '#181e24')
  return c
}

// ---- S5 road (through the windshield) + shared night road exterior ----
function roadBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#0a0e14'], [0.5, '#10161e'], [1, '#182028']])
  clouds(x, 700, 180, 1000, 170, 81, '#0c1218', '#1c2630', '#080c10')
  clouds(x, 1560, 150, 800, 150, 82, '#0c1218', '#1c2630', '#080c10')
  // jungle walls closing in
  jungle(x, -OS, 700, 700, 320, 91, true)
  jungle(x, 1200, W + OS, 700, 320, 92, true)
  // the road: mud track receding to the fence gate ahead
  const rd = x.createLinearGradient(0, 480, 0, H)
  rd.addColorStop(0, '#20242a')
  rd.addColorStop(0.5, '#2c3026')
  rd.addColorStop(1, '#3a3a2c')
  x.fillStyle = rd
  x.beginPath()
  x.moveTo(700, 480)
  x.quadraticCurveTo(880, 700, 620, H + OS)
  x.lineTo(1500, H + OS)
  x.quadraticCurveTo(1240, 700, 1160, 480)
  x.closePath()
  x.fill()
  // ruts + puddles
  x.fillStyle = 'rgba(16,22,30,0.55)'
  for (const [px, py, pw] of [[800, 760, 60], [1160, 700, 40], [900, 920, 90], [1240, 860, 50]]) {
    x.beginPath()
    x.ellipse(px, py, pw, pw * 0.22, 0, 0, 7)
    x.fill()
  }
  groundTex(x, W, 700, H, 39, '#2c2e24', '#3c3e30', '#1c1e16')
  // the distant fence line across the road
  fence(x, -OS, W + OS, 520, 0, {})
  return c
}

// ---- S6-S8 paddock: fence line near + jungle + mud (exterior action ground) ----
function paddockBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#0a0e14'], [0.42, '#121820'], [0.75, '#1a222a'], [1, '#222a30']])
  clouds(x, 560, 170, 1000, 170, 85, '#0c1218', '#1e2832', '#080c10')
  clouds(x, 1520, 150, 820, 150, 86, '#0c1218', '#1e2832', '#080c10')
  // jungle wall behind the fence
  jungle(x, -OS, W + OS, 600, 300, 93, true)
  x.fillStyle = '#141c16'
  x.fillRect(-OS, 560, W + OS * 2, 160)
  // mid mud field
  const gr = x.createLinearGradient(0, 700, 0, H)
  gr.addColorStop(0, '#2e2a20')
  gr.addColorStop(1, '#3e382a')
  x.fillStyle = gr
  x.fillRect(-OS, 700, W + OS * 2, H - 700 + OS)
  // puddles (they catch the headlight strobe — painted live glints)
  x.fillStyle = 'rgba(14,18,24,0.7)'
  for (const [px, py, pw] of [[420, 800, 110], [980, 880, 150], [1620, 820, 90], [1300, 960, 120]]) {
    x.beginPath()
    x.ellipse(px, py, pw, pw * 0.2, 0, 0, 7)
    x.fill()
  }
  groundTex(x, W, 760, H, 41, '#332e22', '#46402e', '#221e16')
  // hoof-tracked mud mounds
  const r = rng(45)
  for (let i = 0; i < 26; i++) {
    const px = r() * (W + OS * 2) - OS, py = 780 + r() * 260
    x.fillStyle = r() > 0.5 ? '#4a4232' : '#2a251c'
    x.beginPath()
    x.ellipse(px, py, 20 + r() * 40, 6 + r() * 10, 0, 0, 7)
    x.fill()
  }
  return c
}

// ---- S9 kitchen: stainless steel + island + porthole door ----
function kitchenBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  // back wall: brushed steel panels
  const bw = x.createLinearGradient(0, -OS, 0, 800)
  bw.addColorStop(0, '#39424c')
  bw.addColorStop(0.6, '#4a545e')
  bw.addColorStop(1, '#333c46')
  x.fillStyle = bw
  x.fillRect(-OS, -OS, W + OS * 2, 800)
  for (let px = -OS; px < W + OS; px += 190) {
    x.fillStyle = 'rgba(220,232,240,0.08)'
    x.fillRect(px, -OS, 3, 800)
    x.fillStyle = 'rgba(10,14,18,0.25)'
    x.fillRect(px + 186, -OS, 4, 800)
  }
  // horizontal brushed streaks
  const r = rng(61)
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(216,226,234,${0.03 + r() * 0.05})`
    x.fillRect(r() * (W + OS * 2) - OS, r() * 800, 60 + r() * 200, 1.6)
  }
  // hanging pots (left)
  x.strokeStyle = '#2a323a'
  x.lineWidth = 6
  x.beginPath()
  x.moveTo(-OS, 240)
  x.lineTo(560, 240)
  x.stroke()
  for (const [px, pr] of [[60, 34], [180, 26], [300, 40], [430, 24]]) {
    x.fillStyle = '#5a646e'
    x.beginPath()
    x.arc(px, 240 + pr, pr, 0, Math.PI)
    x.fill()
    x.fillStyle = '#78848e'
    x.fillRect(px - 6, 240, 12, 10)
  }
  // THE ISLAND COUNTER (centre): steel top + panel sides (reflections live)
  x.fillStyle = '#5e6872'
  x.fillRect(500, 560, 760, 34)
  x.fillStyle = '#76828c'
  x.fillRect(500, 556, 760, 10)
  x.fillStyle = '#454f59'
  x.fillRect(516, 594, 728, 190)
  // panel seams
  for (let px = 596; px < 1240; px += 128) {
    x.fillStyle = 'rgba(16,22,28,0.4)'
    x.fillRect(px, 594, 4, 190)
  }
  // under-counter shadow
  x.fillStyle = 'rgba(8,10,14,0.5)'
  x.fillRect(516, 784, 728, 14)
  // far RIGHT: steel door with round porthole window
  x.fillStyle = '#3f4854'
  x.fillRect(1520, 330, 240, 470)
  x.fillStyle = '#2c343e'
  x.fillRect(1520, 330, 240, 16)
  // porthole
  x.fillStyle = '#141a20'
  x.beginPath()
  x.arc(1640, 500, 62, 0, 7)
  x.fill()
  x.strokeStyle = '#8a96a0'
  x.lineWidth = 10
  x.beginPath()
  x.arc(1640, 500, 62, 0, 7)
  x.stroke()
  x.fillStyle = 'rgba(150,190,210,0.18)'
  x.beginPath()
  x.arc(1622, 484, 34, 0, 7)
  x.fill()
  // door push bar
  x.fillStyle = '#6a7680'
  x.fillRect(1544, 620, 192, 14)
  // freezer steam vent (left of door)
  x.fillStyle = '#2a323c'
  x.fillRect(1380, 420, 60, 90)
  // tile floor with sheen
  const fl = x.createLinearGradient(0, 800, 0, H)
  fl.addColorStop(0, '#4e565e')
  fl.addColorStop(1, '#2e343a')
  x.fillStyle = fl
  x.fillRect(-OS, 800, W + OS * 2, H - 800 + OS)
  for (let px = -OS; px < W + OS; px += 120) {
    x.strokeStyle = 'rgba(14,18,22,0.5)'
    x.lineWidth = 2
    x.beginPath()
    x.moveTo(px, 800)
    x.lineTo(px - 60, H + OS)
    x.stroke()
  }
  for (const py of [820, 850, 890, 940]) {
    x.strokeStyle = 'rgba(14,18,22,0.4)'
    x.lineWidth = 2
    x.beginPath()
    x.moveTo(-OS, py)
    x.lineTo(W + OS, py)
    x.stroke()
  }
  return c
}

// ---- S10 clever-girl: dark sheds exterior + fan light ----
function shedsBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#080c12'], [0.6, '#0e141c'], [1, '#141c24']])
  clouds(x, 700, 160, 1000, 150, 87, '#0a0e14', '#181f28', '#060a0e')
  clouds(x, 1500, 140, 760, 130, 88, '#0a0e14', '#181f28', '#060a0e')
  // ground: wet mud yard
  const gr = x.createLinearGradient(0, 640, 0, H)
  gr.addColorStop(0, '#1c1a14')
  gr.addColorStop(1, '#26241c')
  x.fillStyle = gr
  x.fillRect(-OS, 640, W + OS * 2, H - 640 + OS)
  x.fillStyle = 'rgba(10,12,16,0.6)'
  for (const [px, py, pw] of [[300, 780, 90], [1500, 820, 120], [820, 930, 130]]) {
    x.beginPath()
    x.ellipse(px, py, pw, pw * 0.18, 0, 0, 7)
    x.fill()
  }
  // sheds: two dark silhouettes with tin roofs
  for (const [sx0, sw2, sh2] of [[120, 460, 250], [1460, 420, 220]]) {
    x.fillStyle = '#10151c'
    x.fillRect(sx0, 640 - sh2, sw2, sh2)
    x.beginPath()
    x.moveTo(sx0 - 26, 640 - sh2)
    x.lineTo(sx0 + sw2 / 2, 640 - sh2 - 46)
    x.lineTo(sx0 + sw2 + 26, 640 - sh2)
    x.closePath()
    x.fill()
    x.fillStyle = '#1a222c'
    x.fillRect(sx0 + sw2 * 0.36, 640 - sh2 + sh2 * 0.4, sw2 * 0.28, sh2 * 0.6)
  }
  // the FAN-LIGHT: cone of pale light from an overhead lamp
  const cone = x.createLinearGradient(0, 138, 0, 800)
  cone.addColorStop(0, 'rgba(210,220,190,0.30)')
  cone.addColorStop(0.7, 'rgba(210,220,190,0.10)')
  cone.addColorStop(1, 'rgba(210,220,190,0.03)')
  x.fillStyle = cone
  x.beginPath()
  x.moveTo(930, 138)
  x.lineTo(990, 138)
  x.lineTo(1180, 820)
  x.lineTo(740, 820)
  x.closePath()
  x.fill()
  // lamp + pool
  x.fillStyle = '#0c1016'
  x.fillRect(942, 130, 36, 22)
  const pool = x.createRadialGradient(960, 810, 10, 960, 810, 300)
  pool.addColorStop(0, 'rgba(214,224,192,0.22)')
  pool.addColorStop(1, 'rgba(214,224,192,0)')
  x.fillStyle = pool
  x.fillRect(660, 660, 600, 300)
  return c
}

// ---- S11 showdown: visitor centre lobby (bones + banner rod + burst wall) ----
function lobbyBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, '#12141c'], [0.5, '#1a1e28'], [1, '#22262f']])
  // back wall: stone blocks
  const bw = x.createLinearGradient(0, 200, 0, 880)
  bw.addColorStop(0, '#2c2f38')
  bw.addColorStop(1, '#3a3e48')
  x.fillStyle = bw
  x.fillRect(-OS, 180, W + OS * 2, 700)
  const r = rng(67)
  for (let yy = 180; yy < 880; yy += 54)
    for (let px = -OS; px < W + OS; px += 120) {
      const off = ((yy / 54) | 0) % 2 ? 60 : 0
      x.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.04})`
      x.fillRect(px + off + 2, yy + 2, 114, 48)
      x.fillStyle = 'rgba(8,10,14,0.35)'
      x.fillRect(px + off, yy + 50, 118, 4)
    }
  // high windows: moonlight sources
  for (const wx of [1350, 1620]) {
    x.fillStyle = '#0c1018'
    x.fillRect(wx, 240, 130, 260)
    x.fillStyle = 'rgba(190,205,235,0.20)'
    x.fillRect(wx + 8, 248, 114, 244)
  }
  // floor: pale marble with veins
  const fl = x.createLinearGradient(0, 860, 0, H)
  fl.addColorStop(0, '#565a62')
  fl.addColorStop(1, '#383c44')
  x.fillStyle = fl
  x.fillRect(-OS, 860, W + OS * 2, H - 860 + OS)
  for (let i = 0; i < 40; i++) {
    x.strokeStyle = `rgba(220,226,236,${0.04 + r() * 0.05})`
    x.lineWidth = 1.6
    x.beginPath()
    const vx = r() * (W + OS * 2) - OS, vy = 860 + r() * 200
    x.moveTo(vx, vy)
    x.quadraticCurveTo(vx + 80, vy + 20, vx + 180, vy - 10)
    x.stroke()
  }
  // ---- the BONES: giant ribcage arch + skull (left) ----
  x.strokeStyle = '#c8c2ae'
  x.lineCap = 'round'
  for (let i = 0; i < 7; i++) {
    const rx = 150 + i * 58
    x.lineWidth = 13 - i
    x.beginPath()
    x.moveTo(rx, 860)
    x.quadraticCurveTo(rx - 30 - i * 6, 640, rx + 60, 460)
    x.stroke()
  }
  x.lineWidth = 12
  x.beginPath()
  x.moveTo(120, 860)
  x.quadraticCurveTo(140, 430, 300, 420)
  x.quadraticCurveTo(430, 430, 460, 560)
  x.stroke()
  // vertebrae column
  for (let i = 0; i < 6; i++) {
    x.fillStyle = '#b8b29e'
    x.beginPath()
    x.ellipse(310 + i * 12, 400 - i * 6, 15, 10, 0.2, 0, 7)
    x.fill()
  }
  // skull
  x.fillStyle = '#d0cab6'
  x.beginPath()
  x.ellipse(210, 760, 84, 52, -0.15, 0, 7)
  x.fill()
  x.fillStyle = '#c0baa6'
  x.beginPath()
  x.moveTo(250, 748)
  x.quadraticCurveTo(330, 740, 350, 762)
  x.quadraticCurveTo(320, 780, 250, 776)
  x.closePath()
  x.fill()
  x.fillStyle = '#1a1814'
  x.beginPath()
  x.ellipse(190, 752, 17, 13, -0.2, 0, 7)
  x.fill()
  // jaw teeth
  x.fillStyle = '#e8e2ce'
  for (let i = 0; i < 5; i++) {
    const tx = 260 + i * 18
    x.beginPath()
    x.moveTo(tx, 774)
    x.lineTo(tx + 6, 794)
    x.lineTo(tx + 12, 774)
    x.closePath()
    x.fill()
  }
  // ---- banner ROD high centre (cloth is live) ----
  x.fillStyle = '#54422c'
  x.fillRect(560, 196, 800, 12)
  x.fillStyle = '#6a5438'
  x.fillRect(560, 196, 800, 5)
  for (const ex of [560, 1352]) {
    x.fillStyle = '#c8a050'
    x.beginPath()
    x.arc(ex + 4, 202, 10, 0, 7)
    x.fill()
  }
  // wall anchor points where the banner hangs (cords baked)
  x.strokeStyle = '#8a744e'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(620, 208)
  x.lineTo(660, 236)
  x.moveTo(1300, 208)
  x.lineTo(1260, 236)
  x.stroke()
  // ---- side door (left edge, heroes escape) ----
  x.fillStyle = '#20242c'
  x.fillRect(-10, 560, 130, 320)
  x.strokeStyle = '#4a4034'
  x.lineWidth = 8
  x.strokeRect(-10, 560, 130, 320)
  return c
}

// ---- S12 dawn: sunrise sea + helipad ----
function dawnBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  skyGrad(x, W, H, [[0, PAL.dawn0], [0.3, PAL.dawn1], [0.52, PAL.dawn2], [0.66, PAL.dawn3], [0.8, PAL.dawnHi], [1, '#fff4d8']])
  // sun low over the sea
  const sun = x.createRadialGradient(820, 560, 16, 820, 560, 340)
  sun.addColorStop(0, 'rgba(255,244,210,0.95)')
  sun.addColorStop(0.3, 'rgba(255,214,140,0.55)')
  sun.addColorStop(1, 'rgba(255,190,110,0)')
  x.fillStyle = sun
  x.fillRect(460, 220, 760, 560)
  x.fillStyle = '#fff2cc'
  x.beginPath()
  x.arc(820, 556, 52, 0, 7)
  x.fill()
  // lit cloud banks
  clouds(x, 420, 240, 900, 150, 91, '#5e3448', '#e89a68', '#3a2030')
  clouds(x, 1500, 200, 820, 140, 92, '#684048', '#f0ac70', '#422834')
  // the sea: banded dawn water
  for (let i = 0; i < 6; i++) {
    x.fillStyle = ['#7a4a4c', '#8a5850', '#9a6854', '#aa7a58', '#8a6050', '#6a4844'][i]
    x.globalAlpha = 0.9
    const yy = 588 + i * 38
    x.beginPath()
    x.moveTo(-OS, yy)
    for (let px = -OS; px <= W + OS; px += 44) x.lineTo(px, yy + Math.sin(px * 0.008 + i * 2) * 5)
    x.lineTo(W + OS, yy + 40)
    x.lineTo(-OS, yy + 40)
    x.closePath()
    x.fill()
  }
  x.globalAlpha = 1
  // sun column on the water
  const scg = x.createLinearGradient(0, 590, 0, 760)
  scg.addColorStop(0, 'rgba(255,224,150,0.5)')
  scg.addColorStop(1, 'rgba(255,224,150,0.05)')
  x.fillStyle = scg
  x.beginPath()
  x.moveTo(760, 590)
  x.lineTo(880, 590)
  x.lineTo(960, 770)
  x.lineTo(680, 770)
  x.closePath()
  x.fill()
  // ---- the HELIPAD: concrete platform bottom-right with circle + H ----
  x.fillStyle = '#4a4e54'
  x.beginPath()
  x.moveTo(1050, 942)
  x.lineTo(1130, 730)
  x.quadraticCurveTo(1160, 700, 1220, 700)
  x.lineTo(W + OS, 700)
  x.lineTo(W + OS, 942)
  x.closePath()
  x.fill()
  x.fillStyle = '#565a60'
  x.beginPath()
  x.moveTo(1050, 942)
  x.lineTo(1130, 730)
  x.quadraticCurveTo(1160, 700, 1220, 700)
  x.lineTo(W + OS, 700)
  x.lineTo(W + OS, 760)
  x.lineTo(1170, 762)
  x.quadraticCurveTo(1150, 764, 1140, 790)
  x.lineTo(1080, 942)
  x.closePath()
  x.fill()
  // pad circle + H
  x.strokeStyle = 'rgba(232,236,240,0.75)'
  x.lineWidth = 10
  x.beginPath()
  x.ellipse(1560, 822, 300, 84, -0.02, 0, 7)
  x.stroke()
  x.fillStyle = 'rgba(232,236,240,0.8)'
  x.fillRect(1480, 782, 22, 82)
  x.fillRect(1618, 782, 22, 82)
  x.fillRect(1480, 814, 160, 18)
  // damp stains
  const r = rng(99)
  for (let i = 0; i < 20; i++) {
    x.fillStyle = `rgba(30,34,40,${0.1 + r() * 0.15})`
    x.beginPath()
    x.ellipse(1180 + r() * 700, 730 + r() * 180, 20 + r() * 60, 4 + r() * 9, 0, 0, 7)
    x.fill()
  }
  return c
}

// build: all stages painted once (called from prepare)
export async function build() {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('400 96px Anton'),
        document.fonts.load('600 40px "Space Grotesk"'),
        document.fonts.load('500 30px "JetBrains Mono"'),
      ])
      await document.fonts.ready
    } catch {}
  }
  return {
    isle: isleBake(),
    valley: valleyBake(),
    lab: labBake(),
    control: controlBake(),
    road: roadBake(),
    paddock: paddockBake(),
    kitchen: kitchenBake(),
    sheds: shedsBake(),
    lobby: lobbyBake(),
    dawn: dawnBake(),
  }
}

// Letterbox bars painted LAST in every shot: nothing bleeds.
export function bars(ctx) {
  ctx.save()
  ctx.fillStyle = '#05070a'
  ctx.fillRect(-OS, -OS, W + OS * 2, BAR + OS)
  ctx.fillRect(-OS, H - BAR, W + OS * 2, BAR + OS)
  ctx.restore()
}
