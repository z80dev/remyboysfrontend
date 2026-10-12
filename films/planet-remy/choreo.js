// Pure choreography: every actor path and camera curve is a function of time only.
// World: 1280×540 baked environment; the plain's back edge is y=372, the front is y=540.
import { T, HIT_G, STOPS } from './timeline.js'

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const seg = (t, a, b) => clamp01((t - a) / (b - a))
const Eo = (u) => 1 - Math.pow(1 - u, 3) // outCubic
const Ei = (u) => u * u * u // inCubic
const lerp = (a, b, u) => a + (b - a) * u

// ---------- hit-stop (charge shot only) ----------
export function warp(ts) {
  let acc = 0
  for (const s of STOPS) {
    const rs = s.g + acc
    if (ts < rs) return { g: ts - acc, stop: null, sl: 0 }
    if (ts < rs + s.d) return { g: s.g, stop: s, sl: ts - rs }
    acc += s.d
  }
  return { g: ts - acc, stop: null, sl: 0 }
}
// Game time (within the charge shot) → film time; the score uses this so the clash
// lands exactly on the freeze frame.
export function filmT(g) {
  let acc = 0
  for (const s of STOPS) if (s.g < g) acc += s.d
  return T.charge + g + acc
}
export { HIT_G }

// ---------- handheld camera sway (tiny, documentary) ----------
export const sway = (t) => ({
  dx: 1.3 * Math.sin(t * 0.83) + 0.7 * Math.sin(t * 2.31 + 1.7),
  dy: 0.9 * Math.sin(t * 0.61 + 0.4) + 0.5 * Math.sin(t * 1.93),
})

// ---------- camera: {x, y, z} centre of view + zoom in world coords ----------
export function cam(t) {
  if (t < T.herd) { const u = Eo(seg(t, 0, T.herd)); return { x: lerp(706, 682, u), y: lerp(304, 296, u), z: lerp(1.24, 1.33, u) } }
  if (t < T.portrait) { const u = seg(t, T.herd, T.portrait); return { x: lerp(420, 556, Eo(u)), y: lerp(332, 336, u), z: lerp(1.16, 1.26, u) } }
  if (t < T.ritual) { const u = seg(t, T.portrait, T.ritual); return { x: lerp(470, 458, u), y: 322, z: lerp(1.42, 1.5, u) } }
  if (t < T.ridge) { const u = Eo(seg(t, T.ritual, T.ridge)); return { x: lerp(636, 646, u), y: lerp(312, 300, u), z: lerp(1.2, 1.31, u) } }
  if (t < T.charge) { const u = Eo(seg(t, T.ridge, T.charge)); return { x: lerp(852, 884, u), y: lerp(302, 298, u), z: lerp(1.08, 1.2, u) } }
  if (t < T.morning) {
    const u = t - T.charge // film-local seconds (camera runs on film time, not warped game time)
    const z = u < 3.0 ? lerp(1.14, 1.24, Eo(u / 3)) : u < 4.6 ? 1.24 : lerp(1.24, 1.16, Eo(seg(u, 4.6, 8.5)))
    const cx = u < 3.2 ? lerp(756, 628, Eo(u / 3.2)) : lerp(628, 656, Eo(seg(u, 3.2, 8.5)))
    return { x: cx, y: lerp(322, 332, Math.min(1, u / 4)), z }
  }
  if (t < T.card) { const u = seg(t, T.morning, T.card); return { x: lerp(500, 548, Eo(u)), y: lerp(312, 316, u), z: lerp(1.12, 1.2, u) } }
  return { x: 480, y: 270, z: 1 }
}

// ---------- herd (grazing spread, shared by herd/portrait/morning beats) ----------
// [id, x, feetY, phase, driftAmp]
export const GRAZE = [
  [24, 300, 500, 0.0, 14],
  [1, 585, 448, 1.3, 10],
  [7, 405, 470, 2.1, 12],
  [2, 660, 424, 3.4, 8],
  [13, 258, 434, 4.2, 9],
]
export const HERO_GRAZE = { x: 486, feet: 462 }
// Slow forage drift: gentle cosine wander around the anchor, never a march.
export const grazePos = ([id, x, feet, ph, amp], t) => ({
  id, x: x + amp * Math.sin(t * 0.11 + ph), feet,
  swayA: Math.sin(t * 1.9 + ph * 2.7) * 0.008,
  step: Math.sin(t * 0.5 + ph) > 0.94 ? 1 : 0, // rare idle hoof-shift
})

// ---------- ritual (the Mane Display, golden hour) ----------
export const RITUAL = [
  { id: 24, x: 566, feet: 468, hopH: 26, hopP: 1.25, ph: 0.0 },
  { id: 42, x: 646, feet: 430, hopH: 30, hopP: 1.35, ph: 0.8, onRock: true },
  { id: 1, x: 726, feet: 470, hopH: 22, hopP: 1.1, ph: 1.6 },
]
// Analytic bounce: |sin| arc, squash at the ground.
export function hop(u, h) { return -h * Math.abs(Math.sin(Math.PI * u)) }
// The alpha's display leap: 26.8–28.2 film s (shot-local 3.8–5.2), height 92.
export const LEAP = { t0: 3.8, t1: 5.2, h: 92 }
export function leapY(lt) {
  const u = seg(lt, LEAP.t0, LEAP.t1)
  if (u <= 0 || u >= 1) return { dy: 0, squash: 0 }
  const a = Math.sin(Math.PI * u)
  return { dy: -LEAP.h * a * a, squash: u < 0.12 || u > 0.88 ? 0.06 : 0 }
}

// ---------- ridge (the Cabald at dusk) ----------
export const RIDGE_STAND = [
  { id: 1217, x: 1022, y: 346 },
  { id: 5, x: 948, y: 352 },
  { id: 23, x: 1094, y: 349 },
  { id: 225, x: 1156, y: 356 },
]
// They hold still; only a faint breathing sway. The leader steps forward at 36.4.
export function ridgePos(i, t) {
  const r = RIDGE_STAND[i]
  const step = i === 0 ? 18 * Eo(seg(t, 36.4, 37.2)) : 0
  return { ...r, x: r.x - step, sway: Math.sin(t * 1.1 + i * 2.2) * 0.012 }
}

// ---------- charge (game time g inside the shot; warp() applies the freeze) ----------
const RAID_X0 = [896, 948, 1002, 1054] // leader + 3, top of the ridge
// Leader descent + charge: accelerate down the slope, then drive west.
// The trailing raiders fan out (545 + 72i) so the clash reads as a line, not a pile.
export function raiderX(i, g) {
  if (i === 0) {
    if (g < 1.5) return lerp(RAID_X0[0], 748, Eo(seg(g, 0, 1.5)))
    if (g < HIT_G) return lerp(748, 462, Ei(seg(g, 1.5, HIT_G)) ** 0.7)
    const u = g - HIT_G
    if (u < 0.79) return 462 + 150 * u + 40 * u * u // knocked back, tumbling
    if (g < 4.3) return 605.5 + 14.5 * Eo(seg(g, 4.09, 4.3)) // skid to a halt
    if (g < 4.9) return 620 // flat on his back, dazed
    return lerp(620, 940, Ei(seg(g, 4.9, 6.9))) // scramble, up the slope
  }
  const lag = 0.16 * (i + 1)
  if (g < 1.6) return lerp(RAID_X0[i], 748 + 46 * i, Eo(seg(g, lag, 1.5 + lag)))
  if (g < HIT_G + 0.1) return lerp(748 + 46 * i, 545 + 72 * i, Ei(seg(g, 1.6, HIT_G + 0.1)) ** 0.7)
  if (g < 4.1) return 545 + 72 * i + 30 * (1 - Math.exp(-(g - HIT_G) * 4)) // skid halt
  return lerp(575 + 72 * i, 900 + 50 * i, Ei(seg(g, 4.1, 6.6)))
}
export function raiderY(i, g) {
  if (i === 0) {
    if (g < HIT_G) return 470 - 14 * Ei(seg(g, 2.9, HIT_G)) // lunge hop into the clash
    const u = g - HIT_G
    if (u < 0.79) return 456 - 210 * u + 268 * u * u // ballistic knockback, lands at u = 0.79
    return lerp(472, 348, Ei(seg(g, 4.9, 6.9))) // scramble up onto the ridge crest
  }
  const down = Eo(seg(g, 0.1 * i, 1.7 + 0.1 * i))
  const base = lerp(396 + 3 * i, 470 + i, down)
  if (g > 4.1) return lerp(470 + i, 344 + 4 * i, Ei(seg(g, 4.6, 6.6)))
  return base
}
const TUMBLE_RATE = 9.94 // at the 0.79 s landing this ends at −7.854 rad ≡ −90°: flat on his back
export function raiderRot(i, g) {
  if (i === 0 && g > HIT_G) {
    const u = g - HIT_G
    if (u < 0.79) return -TUMBLE_RATE * u // tumble
    if (g < 4.6) return -7.854 + Math.sin((g - 4.09) * 7) * 0.06 * Math.exp(-(g - 4.09) * 3) // dazed wiggle
    return lerp(-7.854, -6.2832, Eo(seg(g, 4.6, 5.0))) // roll upright (−2π ≡ 0)
  }
  return 0
}
// The hero: steps out as the raid comes, plants, absorbs, holds.
export function heroChargeX(g) {
  if (g < 1.4) return lerp(352, 420, Eo(seg(g, 0.2, 1.4)))
  if (g < HIT_G) return 420
  if (g < 3.9) return 420 - 14 * (1 - Math.exp(-(g - HIT_G - 0.14) * 5)) // recoil
  return 420 + 10 * (1 - Math.exp(-(g - 4.2) * 2)) // step back forward, stance
}
export function heroChargePose(g) {
  if (g < 2.9) return { lean: 0.03, sy: 1, glowA: 0.3 }
  if (g < HIT_G) { const u = seg(g, 2.9, HIT_G); return { lean: lerp(0.03, -0.09, u), sy: lerp(1, 0.94, u), glowA: lerp(0.3, 0.6, u) } } // coil
  const u = seg(g, HIT_G + 0.2, 4.2)
  return { lean: lerp(-0.09, 0.07, u), sy: lerp(0.94, 1, Eo(u)), glowA: lerp(0.9, 0.5, u) } // uncoil, blade up
}
// Herd rally: shuffle tight behind the hero during the approach, victory hops after the clash.
export function herdRally([id, x, feet, ph, amp], g) {
  const tighten = Ei(seg(g, 0, 1.6)) * 0.22
  let hx = x - (x - 400) * tighten
  let hy = feet + (470 - feet) * 0.2 * tighten
  let lift = [0, 0]
  const hv = g - 5.15
  if (hv > 0 && hv < 1.5) { const u = (hv * 1.6 + ph * 0.31) % 1; lift = [Math.max(0, Math.sin(Math.PI * u * 2)) * 5, 0] }
  return { id, x: hx, feet: hy, lift, ph }
}

// ---------- analytic dust events (hooves + impacts), derived from the same paths ----------
export const DUST = (() => {
  const ev = []
  for (let g = 0.3; g < HIT_G; g += 0.09) {
    ev.push({ g, x: raiderX(0, g), y: Math.min(raiderY(0, g), 470), seed: ev.length * 13 + 7, big: false })
    const i = 1 + (Math.floor(g / 0.09) % 3)
    ev.push({ g, x: raiderX(i, g), y: Math.min(raiderY(i, g), 470), seed: ev.length * 13 + 11, big: false })
  }
  ev.push({ g: HIT_G, x: 444, y: 466, seed: 991, big: true }) // the clash, between the two
  ev.push({ g: HIT_G + 0.79, x: 612, y: 472, seed: 992, big: true }) // the landing
  ev.push({ g: 4.3, x: 620, y: 472, seed: 993, big: false }) // skid slide
  return ev
})()

// ---------- birds ----------
export function flock(t, t0, dir, y, n = 5) {
  const u = seg(t, t0, t0 + 7.5)
  if (u <= 0 || u >= 1) return null
  const out = []
  for (let i = 0; i < n; i++) {
    const bx = dir > 0 ? -80 + 1300 * u + i * 34 : 1360 - 1300 * u - i * 34
    out.push({ x: bx, y: y + Math.sin(u * 9 + i * 1.7) * 8 + i * 7, flap: Math.sin(t * 11 + i * 2.1), s: 1 + (i % 2) * 0.25 })
  }
  return out
}
