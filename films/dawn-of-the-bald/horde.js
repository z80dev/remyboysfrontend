// DAWN OF THE BALD — horde.js. The Cabald crowd: deterministic layout, the three
// states (shuffle / sway / rise), tinted + silhouette stamping, and THE SHEDDING
// (the hair-fall particle system). Every frame is a pure function of time: no
// Math.random, no Date, no state mutated between frames, nothing appended by
// draw. All randomness is hash() from filmkit/lib.js; the rig is the shared
// remy-bros sprite and (x, feet) is always the FOOT anchor.
//
// film.js cheat-sheet (options, exact names):
//   const L = layout(seed, n, x0, x1, rows)          // one immutable crowd
//   for (const z of L) {
//     const rig = rigs[z.i % rigs.length]            // map i into the cast pool
//     drawZombie(ctx, rig,
//       z.x + z.drift * (g - g0), feet + ROW_DY[z.depth], g, {
//         mode: 'walk',                              // 'walk' | 'sway' | 'rise'
//         speed: Z_SPEED.mid,                        // cycles/s added to phase
//         phase: z.phase,                            // the zombie's own phase
//         riseU: seg(g, riseG, riseG + 1.4),         // mode 'rise' only, 0..1
//         sy: 2.2 * (1 - z.depth * 0.12),            // back rows smaller
//         flip: z.side < 0, alpha: 1,
//         tint: '#182228', tintA: 0.2 + z.depth * 0.18, // depth wash; tintA 1 = repaint flat
//         shadow: true,                              // contact ellipse under the feet
//       })
//   }
//   Sway crowds (the horde at the glass): mode 'sway', speed 0.25 (~4s period).
//   Silhouettes: drawSilhouette(...) — same modes/options plus color (default
//   '#0d1414'); used for the title ridge, hedges, shapes crossing windows.
//   The Shedding: hairFall(ctx, EVENTS, g) with immutable events
//   [{ g, x, y, seed, n, dur, color }] (x, y = the head in world space).
//
// NOTE: this film (like its timeline.js) is written semicolon-free by hand;
// biome's repo-default formatter style is intentionally not applied here.
import { E, hash, lerp } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'

const TAU = Math.PI * 2
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

// Gait speeds, seconds-normalized (ph advances by speed each second, so the
// stride period is 1/speed: mid = 2.2s shuffle, slow = 3.1s, rush = 1.25s).
export const Z_SPEED = { slow: 0.32, mid: 0.45, rush: 0.8 }
// Feet-y offset per depth row: back rows stand higher on screen (film.js also
// scales sy by 1 - depth * 0.12).
export const ROW_DY = [0, -26, -50, -70]

// ---------- crowd layout ----------
// Deterministic per (seed, n). Slots are laid out back row first so the front
// bodies overlap the ones behind; back rows sit slightly inside the front
// spread and carry the extras (smaller, denser). Fields:
//   i      stable pick index — film.js maps pool[z.i % pool.length]
//   x      world x between x0..x1 (hash-jittered, never bunched on the edges)
//   depth  0 = front .. rows-1 = back (pair with ROW_DY[depth])
//   phase  the zombie's own gait phase, in cycles 0..1 (add to t * speed)
//   drift  lateral shuffle, px per second (front rows shift more than back)
//   side   facing, -1 or 1 (pass as flip: z.side < 0)
export function layout(seed, n, x0, x1, rows = 3) {
  const out = []
  const counts = new Array(rows).fill(0)
  for (let k = 0; k < n; k++) counts[rows - 1 - (k % rows)]++
  let slot = 0
  for (let d = rows - 1; d >= 0; d--) {
    const inset = (x1 - x0) * 0.04 * d
    const a = x0 + inset
    const b = x1 - inset
    for (let j = 0; j < counts[d]; j++) {
      const s = seed * 131 + slot * 17 + d * 977
      const u = (j + 0.5 + (hash(s) - 0.5) * 0.72) / counts[d]
      out.push(Object.freeze({
        i: Math.floor(hash(s + 1) * 4096),
        x: a + (b - a) * u,
        depth: d,
        phase: hash(s + 2),
        drift: Math.round((hash(s + 3) - 0.5) * 7 * (1 - d * 0.22) * 100) / 100,
        side: hash(s + 4) < 0.5 ? -1 : 1,
      }))
      slot++
    }
  }
  return Object.freeze(out)
}

// ---------- the three states ----------
// Romero shuffle: slow staggered gait, asymmetric lift (the front leg drags,
// the stride never mirrors cleanly — phases 0 / 2.3 rad, not pi), a constant
// forward hunch wandering 0.06..0.12 over several cycles, and a slow lurching
// head-bob via rot (about +/-0.02, half the stride frequency).
export function zWalk(ph, amp = 1) {
  const a = ph * TAU
  return {
    lift: [Math.max(0, Math.sin(a + 0.4)) * 1.4 * amp, Math.max(0, Math.sin(a + 2.9)) * 2.6 * amp],
    stride: [Math.sin(a) * 2.4 * amp, Math.sin(a + 2.3) * 1.7 * amp],
    lean: 0.09 + 0.03 * Math.sin(ph * TAU * 0.13 + 2.1),
    rot: 0.02 * Math.sin(ph * TAU * 0.5 + 1.3),
  }
}

// Standing sway (the horde at the glass): weight wanders side to side, tiny
// lift changes, lean oscillates, whole-body rot drifts even slower. No stride
// kick — arms stay relaxed. Pass speed 0.25 for the ~4s period.
export function zSway(ph) {
  const w = Math.sin(ph * TAU)
  return {
    lift: [Math.max(0, w) * 0.9, Math.max(0, -w) * 0.9],
    stride: [w * 0.7, -w * 0.7],
    lean: 0.055 + 0.028 * Math.sin(ph * TAU + 0.9),
    rot: 0.014 * Math.sin(ph * TAU * 0.5 + 2.2),
  }
}

// Standing up from a crouch behind a car, u 0..1, outCubic inside: deep lift
// (body sinks toward the feet), big forward lean plus a forward whole-body
// tilt at u=0, upright by u=1 with a small shudder on the way up. The lean is
// capped at 0.34 because the rig shears the body inside a fixed scratch
// canvas — past that the head strips clip, so the extra crouch reads through
// the rot tilt (which the rig applies unclipped) instead.
export function risePose(u) {
  const v = E.outCubic(clamp01(u))
  return {
    lift: [lerp(10, 0, v), lerp(8, 0, v)],
    stride: [lerp(2.5, 0, v), lerp(-2, 0, v)],
    lean: lerp(0.34, 0.08, v),
    rot: lerp(0.28, 0, v) + Math.sin(v * TAU) * (1 - v) * 0.03,
  }
}

function gait(mode, ph, riseU) {
  if (mode === 'sway') return zSway(ph)
  if (mode === 'rise') return risePose(riseU ?? 0)
  return zWalk(ph)
}

// ---------- stamping (ONE module aux canvas, fully cleared every call) ----------
// A single oversized aux canvas is reused for every zombie: clearRect the
// WHOLE canvas each call (big enough that lean/rot/flip shear stays inside at
// up to ~3.5x scale), repaint via the rig, optional source-atop tint, then
// blit on the foot anchor. Nothing allocates per frame.
const AUX_W = 440
const AUX_H = 400
const AT_X = 220
const AT_Y = 372
let aux = null
let actx = null
function stage() {
  if (!aux) {
    aux = document.createElement('canvas')
    aux.width = AUX_W
    aux.height = AUX_H
    actx = aux.getContext('2d')
  }
  actx.setTransform(1, 0, 0, 1, 0, 0)
  actx.globalCompositeOperation = 'source-over'
  actx.globalAlpha = 1
  actx.clearRect(0, 0, AUX_W, AUX_H)
  return actx
}

function stamp(ctx, x, feet, alpha) {
  ctx.save()
  ctx.globalAlpha = alpha ?? 1
  ctx.drawImage(aux, Math.round(x) - AT_X, Math.round(feet) - AT_Y)
  ctx.restore()
}

function groundShadow(ctx, rig, x, feet, o) {
  const s = (o.sy ?? 2.2) / 2.2
  ctx.save()
  ctx.globalAlpha = (o.alpha ?? 1) * 0.28
  ctx.fillStyle = '#0a100e'
  ctx.beginPath()
  ctx.ellipse(Math.round(x), Math.round(feet) + 3 * s, rig.w * 0.45 * s, Math.max(2.5, rig.h * 0.05 * s), 0, 0, TAU)
  ctx.fill()
  ctx.restore()
}

// Draw one posed zombie. o: { mode: 'walk'|'sway'|'rise', speed, phase, riseU,
// sx, sy (default 2.2), flip, alpha, tint, tintA, shadow }.
export function drawZombie(ctx, rig, x, feet, t, o = {}) {
  const ph = t * (o.speed ?? 0.45) + (o.phase ?? 0)
  const g = gait(o.mode, ph, o.riseU)
  const sy = o.sy ?? 2.2
  const sx = o.sx ?? sy
  if (o.shadow) groundShadow(ctx, rig, x, feet, o)
  const c = stage()
  A.drawRemy(c, rig, AT_X, AT_Y, { ...g, sx, sy, flip: o.flip })
  if (o.tint) {
    c.globalCompositeOperation = 'source-atop'
    c.globalAlpha = o.tintA ?? 0.55
    c.fillStyle = o.tint
    c.fillRect(0, 0, AUX_W, AUX_H)
    c.globalCompositeOperation = 'source-over'
    c.globalAlpha = 1
  }
  stamp(ctx, x, feet, o.alpha)
}

// Full silhouette stamp for dusk ridges, back-lit crowds and shapes crossing
// windows: same gaits and options, the rig's white mask repainted flat in
// o.color (default '#0d1414'). o: { mode, speed, phase, riseU, sx, sy, flip,
// alpha, color, shadow }.
export function drawSilhouette(ctx, rig, x, feet, t, o = {}) {
  const ph = t * (o.speed ?? 0.45) + (o.phase ?? 0)
  const g = gait(o.mode, ph, o.riseU)
  const sy = o.sy ?? 2.2
  const sx = o.sx ?? sy
  if (o.shadow) groundShadow(ctx, rig, x, feet, o)
  const c = stage()
  A.drawRemy(c, rig, AT_X, AT_Y, { ...g, sx, sy, flip: o.flip, white: true })
  c.globalCompositeOperation = 'source-atop'
  c.globalAlpha = 1
  c.fillStyle = o.color ?? '#0d1414'
  c.fillRect(0, 0, AUX_W, AUX_H)
  c.globalCompositeOperation = 'source-over'
  stamp(ctx, x, feet, o.alpha)
}

// ---------- THE SHEDDING ----------
// One hair strand: slight curve, tapered 2px base to 1px tip, round caps.
export function drawStrand(ctx, x, y, angle, len, color, a = 1) {
  if (a <= 0 || len <= 0) return
  const ca = Math.cos(angle)
  const sa = Math.sin(angle)
  const cx = x + ca * len * 0.5 - sa * len * 0.22
  const cy = y + sa * len * 0.5 + ca * len * 0.22
  const ex = x + ca * len
  const ey = y + sa * len
  const mx = 0.25 * (x + ex) + 0.5 * cx
  const my = 0.25 * (y + ey) + 0.5 * cy
  ctx.save()
  ctx.globalAlpha = a
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(cx, cy, mx, my)
  ctx.stroke()
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(mx, my)
  ctx.quadraticCurveTo((cx + ex) / 2, (cy + ey) / 2, ex, ey)
  ctx.stroke()
  ctx.restore()
}

// The signature particle system. events: immutable [{ g, x, y, seed, n, dur,
// color }] in WORLD time (g); wt is the current world g. For each event,
// age = wt - e.g; skipped before birth and after dur. Each of the e.n strands
// is fully analytic in (age, e.seed, k): a birth point around the head
// ((e.x, e.y) = head centre in world space), a damped sideways sway, a
// light-drag fall with tumble, and alpha that fades out over the last 25% of
// dur. Nothing is stored, integrated or appended; any frame order draws the
// same hair. Strand colour: e.color ?? o.color ?? '#7a4a22'.
export function hairFall(ctx, events, wt, o = {}) {
  for (let e = 0; e < events.length; e++) {
    const ev = events[e]
    const age = wt - ev.g
    if (age < 0 || age > ev.dur) continue
    const u = age / ev.dur
    const a0 = (u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1) * (o.alpha ?? 1)
    const col = ev.color ?? o.color ?? '#7a4a22'
    for (let k = 0; k < ev.n; k++) {
      const s = (ev.seed | 0) * 7919 + k * 131
      const h0 = hash(s + 1)
      const h1 = hash(s + 2)
      const h2 = hash(s + 3)
      const h3 = hash(s + 4)
      const h4 = hash(s + 5)
      const th = h0 * TAU
      const r0 = 3 + h1 * 9
      const sway = Math.sin(age * (5 + h2 * 4) + k * 1.93) * Math.exp(-age * 1.1)
      const bx = ev.x + Math.cos(th) * r0 + (h3 - 0.5) * 30 * age
      const by = ev.y + Math.sin(th) * r0 * 0.7 + (14 + h2 * 16) * age + 50 * age * age
      const tumble = Math.sin(age * (2 + h3 * 3) + h4 * TAU) * (0.4 + h1 * 0.4) * Math.exp(-age * 0.45)
      const ang = Math.PI / 2 + sway * 0.55 + tumble + (h4 - 0.5) * 1.1
      drawStrand(ctx, bx, by, ang, 6 + hash(s + 6) * 10, col, a0)
    }
  }
}
