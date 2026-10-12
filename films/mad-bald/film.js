// MAD BALD: FURY FLOW — Where the Flow Ran Dry. 102 s, 1920x1080, letterbox 0.8,
// 2D filmkit full-res painted stage (pirates-cabald / wizard-of-floz lineage).
// Builder 1: scaffold + shots S1 wasteland, S2 shear, S3 citadel, S4 chase,
// S5 defect. Builder 2: S6 storm / S7 greenplace / S8 turn / S9 return (THE WIG
// RIP, stop g7.0 d0.30) / S10 flow (the regrow ladder, stop g2.0 d0.12) — all
// ten shots realized, palette law story §2, blocking §3.
//
// Every frame is a pure function of time. Shot-local WORLD g comes from the
// per-shot clocks' warp() (S2 g4.2 d0.22, S4 g6.8 d0.14 freezes pin world time:
// dust, wheels, flames, hair all freeze); shake, spark rings and flash decay age
// on REAL film t. No Math.random, no state carried between frames: all bursts,
// dust and speed tables are immutable arrays baked in prepare().
//
// ============================ STORE SHAPE (for builder 2) ============================
// Everything prepare() stashes lives on S. Builder 2: EXTEND, never rewrite.
//   S.cast        ART.loadCast(): all 20 roles repainted + madRemy (blade-on),
//                 madRemyStripped (flip-safe), madRemyNative (raw 42 for
//                 shear42/regrow42 inputs), nux, nuxSilver, doof, doofBlind,
//                 flowiosa (13 shorn+grease+harness), immortan (471), wives,
//                 vuvalini, warboy1..5, citadel1..4.
//   S.madNative   alias of cast.madRemyNative — the ONLY valid input to
//                 S.shear[] / S.regrow[] ladders below (colTops cached in bake).
//   S.shear       13-step shear42 ladder, S.shear[i] = shear42(madNative, i/12).
//                 Pick with shearNearest(s) (geometry) / shearFade(ctx,s,...)
//                 (drawRemy crossfade of adjacent baked states).
//   S.regrow      17-step regrow42 ladder, S.regrow[i] = regrow42(madNative, i/4)
//                 (k 0..4; REGROW_LADDER ticks + REGROW_LERP pacing film-side).
//   S.dunesDay / S.dunesNight  2560x1080 overscan panels (see parallaxDunes()).
//   S.citadel     720x560 bake, .spout = [x, y] native; S3 crowd rows replicate
//                 the bake's tier formula via CITADEL_TIERS below.
//   S.highway     2560x260 strip, .groundY = 148 (wheel/foot line). S.mud same
//                 convention. S.storm 1200x1080 wall (stormBolt per frame).
//   S.rig         warRig(1.7) hero bake (rigMeta wheels/cabFloor/deckY).
//   S.rigFar      warRig(1.15) background vehicle.
//   S.car         interceptor(1.7) hero (RED pinstripe = the hero accent).
//   S.carPlain    same bake de-pinstriped (Nux's car + pursuers — RED may not
//                 appear on Cabald metal).
//   S.mask        immortanMask(2.4) + drawMask(ctx,cnv,R,{x,feet,sx,breath,t}).
//   S.wigWorn     greatWig(1.7, 0); S.wigTumble = 9 phases 0.1..0.9 (S9 rip).
//   S.guitar      flameGuitar(2.2) (.nozzle native); S.wall speakerWall(1.15).
//   S.poles       poleCat(1.1, bend) bend -0.7..0.7 (S9 vaults).
//   S.arms        mechArm(4.5, curl) curl -1..1 step 0.25 — mechArmAt(u) picker.
//   S.pouch / S.clips / S.muz / S.vial / S.plumeDay / S.plumeNight  props.
//   S.s4 / S.s10  integrated speed lookups from SPEED.rig (piecewise, sampled
//                 1/120 s, trapezoid) — s.at(g) px of road travelled. NEVER
//                 integrate per frame. S5 continues S4 at 640 (S5S(g) helper).
//   S.dust        { s1, s4rig, s4nux, s4pursuer, s4doof, s3roar, s5rig } arrays
//                 of {g, x, y, seed, vx} world/screen events, DUST.every apart,
//                 lifetime DUST.life. Painted with drawDust() (age = WORLD time
//                 — freezes with the picture).
//   S.hairRain    red strand events {g,x,y,seed,vx,vy} across the S2 pass.
//   S.glassAboard S4 swing-catch shard burst at MASTER.aboard.
//   S.sprayS4 / S.sprayS5  silver mist events at CHASE_EV.sprayDay / DEFECT_EV.witness.
//   S.ringClippers / S.ringRam  spark-ring events at the FREEZE starts — painted
//                 by ringBurst() on REAL t (MASTER.* equals freeze t0, so age ==
//                 stop-local sl inside the freeze automatically).
//   CHASE_STAGE   module-level staging constants for the S4/S5 convoy (rig/nux/
//                 doof x, ground lines, scales) + carX(g, id) position functions
//                 used by BOTH the dust baking and the draw — single source.
// =====================================================================================
import { W, H, hash, seg, lerp, E } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import { score } from './score.js'
import {
  DUR, SHOTS,
  SHEAR, CHASE, STORM, RETURN, FLOWC,
  WASTELAND_EV, SHEAR_EV, CITADEL_EV, CHASE_EV, DEFECT_EV,
  STORM_EV, GREENPLACE_EV, TURN_EV, RETURN_EV, FLOW_EV,
  REGROW_LADDER, REGROW_LERP,
  MASTER, CONTACT, SPEED, PARALLAX, DUST, SAFE, WAVES,
  CAPTIONS, FLASHES, REPAINT_SHARED, DOOM_LFO, beatSec,
} from './timeline.js'

const TAU = Math.PI * 2
const OS = 280 // overscan painted around the stage so shake never exposes edges
const S = {}
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const mod = (v, m) => ((v % m) + m) % m
// contact beats read from the registry (clock-derived; never hand-added t0+g)
const CT = CONTACT

// ------------------------------ house helpers (all shots use these) ------------------------------

function sprite(ctx, rig, px, feet, o = {}) {
  ctx.imageSmoothingEnabled = false
  A.drawRemy(ctx, rig, px, feet, o)
}
// head crown y for a rig drawn with feet at `feet` and scale sy
const crownY = (rig, feet, sy) => feet - (rig.bottom - rig.top + 1) * sy + 7 * sy
const walkCyc = (ph, amp = 5) => {
  const s = Math.sin(ph)
  return {
    lift: [Math.round(Math.max(0, s) * amp), Math.round(Math.max(0, -s) * amp)],
    stride: [Math.round(s * 2), Math.round(-s * 2)],
    lean: 0.04,
  }
}
const stand = { lift: [2, 0], stride: [1, 0], lean: 0.02 }
// camera: scale k about a centre point, optional shake offsets
function cam(ctx, k, cx, cy, sx = 0, sy = 0) {
  ctx.save()
  ctx.translate(960 + sx, 540 + sy)
  ctx.scale(k, k)
  ctx.translate(-cx, -cy)
}
const shakeXY = (t, amp) => (amp <= 0 ? [0, 0] : [
  (hash(Math.floor(t * 90) + 7) - 0.5) * 2 * amp,
  (hash(Math.floor(t * 90) + 99) - 0.5) * 2 * amp,
])
// full-bleed wash covering stage + overscan (paint BEFORE cam/shake transforms
// in practice we fill after cam() with OS margins — every shot starts with this)
function bgWash(ctx, stops, y1 = H) {
  const g = ctx.createLinearGradient(0, -OS, 0, y1)
  for (const [p, c] of stops) g.addColorStop(p, c)
  ctx.fillStyle = g
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
}
// planted shadow ellipse under an actor/vehicle
function shadow(ctx, x, y, rx, ry, a = 0.32) {
  ctx.fillStyle = `rgba(30,18,8,${a})`
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU)
  ctx.fill()
}

// ------------------------------ palette grade packs (story §2) ------------------------------
const GRADE = {
  day: { sat: 1.14, warm: 0.14, contrast: 1.04 },
  amber: { sat: 1.05, warm: 0.34, exposure: -0.03 },
  dusk: { sat: 1.1, warm: 0.2 },
  night: { sat: 0.9, exposure: -0.06, tint: [0.86, 0.94, 1.12] },
  dawnGrey: { sat: 0.72, warm: 0.02, exposure: -0.02 },
  hotOrange: { sat: 1.2, warm: 0.2, contrast: 1.06 },
  gold: { sat: 1.12, warm: 0.24 },
}
const fxPack = (over = {}) => ({ letterbox: SAFE.letterbox, bloom: 0.1, bloomThresh: 0.9, vignette: 0.48, grain: 0.012, ...over })

// ------------------------------ parallax + ground layers ------------------------------

// tile a canvas horizontally so [-OS, W+OS] is always covered. Mirror
// (ping-pong) tiling: bake edges never seam in the sky (draft-strip gotcha).
function tileX(ctx, cnv, x0, y, w = cnv.width, h = cnv.height, sy = 0, sh = h) {
  const n0 = Math.ceil((x0 + OS) / w)
  let tx = x0 - n0 * w
  for (let i = n0; tx < W + OS; tx += w, i++) {
    if (mod(i, 2) === 0) ctx.drawImage(cnv, 0, sy, cnv.width, sh, tx, y, w, h)
    else {
      ctx.save()
      ctx.translate(tx + w, y)
      ctx.scale(-1, 1)
      ctx.drawImage(cnv, 0, sy, cnv.width, sh, 0, 0, w, h)
      ctx.restore()
    }
  }
}

// the dune sea: far band rides offFar, mid+near bands ramp into offMid.
// Band boundaries: far ridge max y 598, mid ridge min y 682 (panel px) — the
// slice rows below are guaranteed single-band or low-contrast haze.
function parallaxDunes(ctx, offFar, offMid, bottomY, opts = {}) {
  const cnv = opts.night ? S.dunesNight : S.dunesDay
  const y0 = bottomY - 1080
  tileX(ctx, cnv, -mod(offFar, 2560), y0)
  if (offMid !== offFar) {
    for (const [ry0, ry1, a] of [[620, 664, 0.38], [664, 706, 0.72], [706, 1080, 1]]) {
      ctx.globalAlpha = a
      tileX(ctx, cnv, -mod(offMid, 2560), y0 + ry0, 2560, ry1 - ry0, ry0, ry1 - ry0)
    }
    ctx.globalAlpha = 1
  }
}

// foreground scrub silhouettes at PARALLAX.scrub (hash-placed, pure)
function scrubLayer(ctx, off, groundY, opts = {}) {
  const col = opts.night ? '#0d1420' : '#241609'
  const world = 150
  const k0 = Math.floor((off * PARALLAX.scrub - 300) / world)
  for (let k = k0; k < k0 + 20; k++) {
    const bx = k * world + hash(k * 17 + 3) * 90 - off * PARALLAX.scrub
    const by = groundY + 34 + hash(k * 7 + 11) * 60
    const r = 16 + hash(k * 23 + 5) * 26
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.ellipse(bx, by, r * 1.5, r * 0.7, 0, 0, TAU)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(bx + r, by - r * 0.4, r * 0.8, r * 0.55, 0, 0, TAU)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(bx - r * 1.1, by - r * 0.3, r * 0.6, r * 0.4, 0, 0, TAU)
    ctx.fill()
  }
}

// heat shimmer: warm wobble streaks above the horizon (sky PARALLAX 0.05 layer)
function heatShimmer(ctx, t, y0, y1) {
  for (let i = 0; i < 7; i++) {
    const yy = y0 + ((i * 37 + t * 26) % (y1 - y0))
    const wob = Math.sin(t * 2.4 + i * 1.9) * 30
    ctx.fillStyle = `rgba(255,240,214,${0.05 + 0.03 * hash(i * 9)})`
    ctx.beginPath()
    ctx.ellipse(300 + hash(i * 5) * 1300 + wob, yy, 220 + hash(i * 3) * 180, 7, 0, 0, TAU)
    ctx.fill()
  }
}

// ------------------------------ analytic particles ------------------------------

// dust events: age on WORLD clock (freezes with the picture). clock = world g.
function drawDust(ctx, table, clock, opts = {}) {
  const cnv = opts.night ? S.plumeNight : S.plumeDay
  const sc = opts.scale ?? 1
  for (const ev of table) {
    const age = clock - ev.g
    if (age < 0 || age > DUST.life) continue
    const u = age / DUST.life
    const x = ev.x + ev.vx * age
    const y = ev.y - u * 16
    const w = cnv.width * (0.45 + u * 0.75) * sc
    const h = cnv.height * (0.45 + u * 0.75) * sc
    ctx.globalAlpha = (1 - u) * 0.7
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(cnv, x - w / 2, y - h * 0.82, w, h)
  }
  ctx.globalAlpha = 1
}

// spark/strand ring at a FREEZE start: MASTER.* equals the freeze t0, so
// age = t - ev.t == stop-local sl inside the freeze (ring hangs, ages on REAL t).
function ringBurst(ctx, ev, t, o = {}) {
  const age = t - ev.t
  const life = o.life ?? 0.62
  if (age < 0 || age > life) return
  const n = o.n ?? 18
  const u = age / life
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + hash(ev.seed * 31 + i) * 0.6
    const sp = (o.speed ?? 250) * (0.55 + hash(i * 7 + ev.seed) * 0.9)
    const x = ev.x + Math.cos(a) * sp * age
    const y = ev.y + Math.sin(a) * sp * age * 0.62 + 260 * age * age
    ctx.globalAlpha = (1 - u) * (o.alpha ?? 0.92)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a + u * 2.2)
    ctx.fillStyle = o.cols[i % o.cols.length]
    const L = (o.len ?? 12) * (1 - u * 0.55)
    ctx.fillRect(0, -1.7, L, 3.4)
    ctx.restore()
  }
  ctx.globalAlpha = 1
}

// red hair-rain (S2 pass): strands fall with gravity, drift in the wind, and a
// deterministic fringe piles at the chair base. age on WORLD g.
function drawHairRain(ctx, table, g, headX, headY) {
  const floorY = 862 // chair-base fringe line
  ctx.lineCap = 'round'
  for (const ev of table) {
    const age = g - ev.g
    if (age < 0 || age > 1.35) continue
    const x = ev.x + ev.vx * age
    const y = ev.y + ev.vy * age + 560 * age * age
    if (y >= floorY) continue // landed strands handled by the fringe painter
    ctx.strokeStyle = age < 0.12 ? '#c9503c' : ev.col
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - ev.vx * 0.06 - 4, y - 9)
    ctx.stroke()
  }
  // fringe pile: deterministic count of landed strands at the chair base
  const landed = table.filter((ev) => g > ev.g + 0.62).length
  for (let i = 0; i < Math.min(landed, 26); i++) {
    const px = headX - 66 + hash(i * 13 + 2) * 130
    const py = floorY - 3 - hash(i * 7) * 5
    ctx.strokeStyle = i % 3 ? '#7a2c22' : '#a93837'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(px + 7 + hash(i * 3) * 5, py - 2)
    ctx.stroke()
  }
}

// silver spray mist (Nux's mouth): short-lived chrome puffs, world time
function drawSpray(ctx, table, g) {
  for (const ev of table) {
    const age = g - ev.g
    if (age < 0 || age > 0.5) continue
    const u = age / 0.5
    const x = ev.x + ev.vx * age
    const y = ev.y + ev.vy * age - 30 * age * age
    ctx.globalAlpha = (1 - u) * 0.8
    ctx.fillStyle = ['#cfd6de', '#e8edf2', '#9aa6b2'][ev.seed % 3]
    ctx.beginPath()
    ctx.arc(x, y, 2 + u * 6, 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// glass shards through the rig's rear window (world time)
function drawGlass(ctx, ev0, g) {
  const age = g - ev0.g
  if (age < 0 || age > 0.8) return
  for (let i = 0; i < 22; i++) {
    const a = hash(i * 11 + 4) * TAU
    const sp = 130 + hash(i * 5 + 9) * 260
    const x = ev0.x + Math.cos(a) * sp * age
    const y = ev0.y + Math.sin(a) * sp * age * 0.7 + 420 * age * age
    ctx.globalAlpha = (1 - age / 0.8) * 0.9
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a + age * 9)
    ctx.fillStyle = i % 3 ? '#cfe0ea' : '#9fc4d4'
    ctx.fillRect(-3, -1.6, 6, 3.2)
    ctx.restore()
  }
  ctx.globalAlpha = 1
}

// ------------------------------ procedural props ------------------------------

// chain / rope stroke with sag control (taut 0..1) — harpoon + IV + lasso lines
function chainStroke(ctx, x0, y0, x1, y1, taut, o = {}) {
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2 + (1 - taut) * (o.sag ?? 46)
  ctx.strokeStyle = o.dark ?? '#151009'
  ctx.lineWidth = o.w ?? 4
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.quadraticCurveTo(mx, my, x1, y1)
  ctx.stroke()
  ctx.strokeStyle = o.light ?? '#6a7078'
  ctx.lineWidth = Math.max(1.2, (o.w ?? 4) * 0.4)
  ctx.stroke()
  // link dashes along the dominant axis
  const n = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 16))
  ctx.fillStyle = o.light ?? '#6a7078'
  for (let i = 1; i < n; i++) {
    const u = i / n
    const bx = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1
    const by = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1
    ctx.fillRect(bx - 1.6, by - 1.6, 3.2, 3.2)
  }
}

// two-headed lizard on a stick — both heads bob; biteK eats head 1 briefly
function lizard(ctx, x, y, sc, t, biteK) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(sc, sc)
  ctx.strokeStyle = '#6a5232' // the stick
  ctx.lineWidth = 2.6
  ctx.beginPath()
  ctx.moveTo(0, 26)
  ctx.lineTo(0, -12)
  ctx.stroke()
  const bob = Math.sin(t * 5.2) * 2.2
  // body
  ctx.fillStyle = '#4a5a38'
  ctx.beginPath()
  ctx.ellipse(0, -8, 9, 6, 0, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#2a3620'
  ctx.lineWidth = 1.2
  ctx.stroke()
  // tail curl
  ctx.strokeStyle = '#4a5a38'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(-8, -8)
  ctx.quadraticCurveTo(-16, -6 + bob * 0.4, -14, -16)
  ctx.stroke()
  // two necks + heads (head 1 hides while bitten)
  for (const [dx, hide] of [[-6, false], [6, biteK > 0.4]]) {
    if (hide) continue
    const hx = dx + bob * 0.3
    ctx.strokeStyle = '#4a5a38'
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(dx * 0.5, -12)
    ctx.quadraticCurveTo(hx, -20, hx * 1.3, -24 - Math.abs(bob))
    ctx.stroke()
    ctx.fillStyle = '#5a6a42'
    ctx.beginPath()
    ctx.ellipse(hx * 1.3, -26 - Math.abs(bob), 4.4, 3.2, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#e8e4da'
    ctx.fillRect(hx * 1.3 + 1.6, -27.4 - Math.abs(bob), 1.4, 1.4)
    ctx.fillRect(hx * 1.3 - 2.6, -27.4 - Math.abs(bob), 1.4, 1.4)
  }
  ctx.restore()
  // squeak lines on the bite
  if (biteK > 0 && biteK < 1) {
    ctx.strokeStyle = `rgba(232,228,218,${0.8 * (1 - biteK)})`
    ctx.lineWidth = 1.6
    for (const a of [-0.5, -0.2, 0.15]) {
      ctx.beginPath()
      ctx.arc(x + 14 * sc, y - 26 * sc, 10 + biteK * 14, a, a + 0.5)
      ctx.stroke()
    }
  }
}

// chain-net (capture): diamond mesh in an ellipse, rope rim + weights
function netPainter(ctx, cx, cy, rx, ry, sag) {
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry * (0.7 + sag * 0.5), 0, 0, TAU)
  ctx.clip()
  ctx.strokeStyle = 'rgba(201,168,107,0.9)'
  ctx.lineWidth = 2
  const step = 26
  for (let d = -rx * 2; d < rx * 2; d += step) {
    ctx.beginPath()
    ctx.moveTo(cx + d - rx, cy - ry)
    ctx.lineTo(cx + d + rx, cy + ry)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx + d + rx, cy - ry)
    ctx.lineTo(cx + d - rx, cy + ry)
    ctx.stroke()
  }
  ctx.restore()
  ctx.strokeStyle = '#8a6f48'
  ctx.lineWidth = 3.4
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry * (0.7 + sag * 0.5), 0, 0, TAU)
  ctx.stroke()
  ctx.fillStyle = '#5f6b78'
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry * (0.7 + sag * 0.5), 3.4, 0, TAU)
    ctx.fill()
  }
}

// tiny upturned cup (crowd prop); flip draws it upside down (the gag)
function cupProp(ctx, x, y, s, flip, glint) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(flip ? -s : s, flip ? -s : s)
  ctx.fillStyle = '#c9b896'
  ctx.beginPath()
  ctx.moveTo(-6, -10)
  ctx.lineTo(6, -10)
  ctx.lineTo(4.4, 2)
  ctx.lineTo(-4.4, 2)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#8a7450'
  ctx.lineWidth = 1.2
  ctx.stroke()
  ctx.restore()
  if (glint > 0) {
    ctx.fillStyle = `rgba(232,197,106,${glint})`
    ctx.beginPath()
    ctx.arc(x, y - 8 * s, 2.6, 0, TAU)
    ctx.fill()
  }
}

// gold FLOW arcs over the S3 crowd (tonic reads GOLD against dusk here: story §2)
function goldArcs(ctx, x0, y0, u, seeds) {
  if (u <= 0.01) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let k = 0; k < seeds.length; k++) {
    const [lx, ly, wob] = seeds[k]
    const arc = cl(seg(u, 0.05 + k * 0.08, 0.85 + k * 0.05))
    if (arc <= 0) continue // once launched the arc persists at full draw
    const mx = (x0 + lx) / 2
    const my = Math.min(y0, ly) - 150 - wob
    for (const [col, w2, al] of [['rgba(232,197,106,0.30)', 13, 0.5], ['rgba(255,214,130,0.75)', 5.5, 0.85], ['rgba(255,240,190,0.95)', 2.2, 1]]) {
      ctx.globalAlpha = al * arc
      ctx.strokeStyle = col
      ctx.lineWidth = w2
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo(mx + Math.sin(u * 9 + k * 2) * wob * 0.2, my, lerp(x0, lx, arc), lerp(y0, ly, arc) + 140 * (1 - arc))
      ctx.stroke()
    }
    // droplets shearing off the arc tip
    for (let i = 0; i < 3; i++) {
      const du = mod(u * 1.3 + hash(i * 7 + k * 3), 1)
      ctx.globalAlpha = 0.7 * (1 - du)
      ctx.fillStyle = '#ffd682'
      ctx.beginPath()
      ctx.arc(lerp(x0, lx, du) + (hash(i + k) - 0.5) * 18, lerp(y0, ly, du) + 90 * du * du, 1.6 + hash(i * 3 + k) * 2, 0, TAU)
      ctx.fill()
    }
  }
  ctx.restore()
  ctx.globalAlpha = 1
}

// in-scene hand-painted graffiti (NOT the captions): rough double pass + drips
function graffiti(ctx, text, x, y, size, col, rot = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.font = `700 ${size}px Anton, Impact, sans-serif`
  ctx.textAlign = 'center'
  ctx.fillStyle = col
  ctx.fillText(text, 2, 3)
  ctx.globalAlpha = 0.8
  ctx.fillText(text, -2, -2)
  ctx.globalAlpha = 1
  // paint drips under hashed letters
  const wdt = ctx.measureText(text).width
  for (let i = 0; i < 4; i++) {
    const dx = (hash(i * 13 + text.length) - 0.5) * wdt * 0.9
    const len = 14 + hash(i * 7 + 1) * 30
    ctx.fillStyle = col
    ctx.globalAlpha = 0.75
    ctx.fillRect(dx, 4, 3, len)
    ctx.beginPath()
    ctx.arc(dx + 1.5, 4 + len, 2.2, 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.textAlign = 'left'
  ctx.restore()
}

// the sacked POV: burlap fills the frame, two crude painted eye-holes cut out,
// the dunes run upside-down inside them (story S1 gag)
function sackPOV(ctx, g, t) {
  bgWash(ctx, [[0, '#241a10'], [0.6, '#2e2216'], [1, '#1a1208']])
  // burlap weave dither
  const r = (i) => hash(i * 977 + 13)
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = r(i) > 0.5 ? 'rgba(58,44,26,0.5)' : 'rgba(154,122,74,0.35)'
    ctx.fillRect(r(i * 3) * W, r(i * 7) * H, 3 + r(i) * 5, 2)
  }
  // cinch crown at the top + rope
  ctx.fillStyle = '#241a10'
  ctx.beginPath()
  ctx.moveTo(660, 0)
  ctx.quadraticCurveTo(960, 210, 1260, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#8a6f48'
  ctx.lineWidth = 9
  ctx.beginPath()
  ctx.moveTo(700, 40)
  ctx.quadraticCurveTo(960, 190, 1220, 40)
  ctx.stroke()
  // eye-holes: crude jittered rings, dunes run INVERTED inside
  const squeeze = g > WASTELAND_EV.cut - 0.25 ? 1 - seg(g, WASTELAND_EV.cut - 0.25, WASTELAND_EV.cut) * 0.1 : 1
  for (const [ex, ey] of [[790, 560], [1130, 545]]) {
    const rr = 96 * squeeze
    const hole = new Path2D()
    const n = 12
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU
      const jr = rr * (0.86 + hash(i * 5 + ex) * 0.28)
      const px = ex + Math.cos(a) * jr
      const py = ey + Math.sin(a) * jr * 0.82
      i === 0 ? hole.moveTo(px, py) : hole.lineTo(px, py)
    }
    hole.closePath()
    ctx.save()
    ctx.clip(hole)
    ctx.save()
    ctx.translate(ex, ey)
    ctx.rotate(Math.PI) // the world through the bag: upside-down dunes
    ctx.drawImage(S.dunesDay, 0, 430, 2560, 620, -560 + mod(t * 30, 300), -320, 1120, 640)
    ctx.restore()
    // war-boy silhouette crossing (inverted with the world; feet in frame coords)
    ctx.save()
    ctx.translate(ex, ey)
    ctx.rotate(Math.PI)
    const wx = mod((g - WASTELAND_EV.sacked) * 260, 1400) - 500
    sprite(ctx, S.cast.warboy2, wx, -60, { sx: 2.6, sy: 2.6 })
    ctx.restore()
    // stitched rim
    ctx.strokeStyle = '#151009'
    ctx.lineWidth = 5
    ctx.stroke(hole)
    ctx.strokeStyle = 'rgba(201,168,107,0.5)'
    ctx.lineWidth = 1.6
    ctx.stroke(hole)
    ctx.restore()
  }
  // the cinch: the whole sack narrows on the cut line
  if (g > WASTELAND_EV.cut - 0.25) {
    ctx.fillStyle = `rgba(10,6,4,${0.5 * seg(g, WASTELAND_EV.cut - 0.25, WASTELAND_EV.cut)})`
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  }
}

// fuel-gauge inset gag (S1): needle under E, tiny comb icon beside it
function fuelGauge(ctx, x, y, s) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.fillStyle = '#1c1e22'
  ctx.beginPath()
  ctx.arc(0, 0, 30, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#454a52'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.fillStyle = '#c22e2e'
  ctx.font = '700 11px "JetBrains Mono"'
  ctx.textAlign = 'center'
  ctx.fillText('E', -16, 18)
  ctx.fillStyle = '#8e8b78'
  ctx.fillText('F', 16, 18)
  // the needle lies BELOW the E
  ctx.strokeStyle = '#e8e4da'
  ctx.lineWidth = 2.6
  ctx.beginPath()
  ctx.moveTo(0, 4)
  ctx.lineTo(-21, 13)
  ctx.stroke()
  // comb icon riveted next to the dial
  ctx.fillStyle = '#c9c5b8'
  ctx.fillRect(40, -6, 16, 12)
  ctx.fillStyle = '#5f6b78'
  for (let i = 0; i < 5; i++) ctx.fillRect(41 + i * 3, -9, 1.6, 4)
  ctx.restore()
  ctx.textAlign = 'left'
}

// ------------------------------ S4/S5 convoy staging (module constants: single
// source for the draw AND the dust baking) ------------------------------
const CHASE_STAGE = {
  rigX: 1250, rigGY: 900, rigK: 1.7,
  nuxX: 640, nuxGY: 912, nuxK: 1.8,
  doofX: 1720, doofGY: 830, doofK: 0.78, wallK: 1.1,
  purK: 1.6, purGY: 900,
  // wheel screen radii at the hero bake (native 30/26 * k)
  wheelRevRig: 30 * 1.7 * TAU,
}
// Nux's rubber-band pursuit (SPEED.nuxCar): distance BEHIND the rig in px
const nuxGap = (g) => 340 + 90 * Math.sin(0.9 * g + hash(808) * TAU)
// pursuer screen x (single lane): approach g0-2.2, trail, A surges to contact
// at CHASE_EV.ramDomino (nose kisses the rig tail at 604), then the domino.
const PUR = {
  trail: [60, -150, -360], from: [-560, -820, -1080], inAt: [[0.2, 1.7], [0.5, 2.0], [0.8, 2.3]],
}
function pursuerX(g, i) {
  const [a0, a1] = PUR.inAt[i]
  let x = lerp(PUR.from[i], PUR.trail[i], E.outCubic(seg(g, a0, a1)))
  x += 24 * Math.sin(1.3 * g + i * 2.1) // rubber-band wobble
  if (i === 0) {
    // surge + the check: nose 304*k lands on the rig rear (604) exactly at 6.8
    const noseKiss = 604 - 304 * CHASE_STAGE.purK / 1.6 // 604 - 304 = 300
    x = lerp(x, noseKiss + 2, E.inQuad(seg(g, 6.2, CHASE_EV.ramDomino)))
    const age = g - CHASE_EV.ramDomino
    if (age > 0) {
      x = noseKiss + 2 - 380 * (1 - Math.exp(-2.4 * age)) + 26 * age * Math.exp(-age)
    }
  } else if (g > CHASE_EV.ramDomino) {
    const tc = CHASE_EV.ramDomino + (i === 1 ? 0.24 : 0.5)
    const atC = PUR.trail[i] + 60 * seg(g, 6.2, tc)
    const age = g - tc
    if (age > 0) x = atC - (i === 1 ? 135 : 46) * (1 - Math.exp(-2 * age))
    else x = atC
  }
  return x
}
const pursuerRot = (g, i) => {
  const tc = CHASE_EV.ramDomino + (i === 0 ? 0 : i === 1 ? 0.24 : 0.5)
  const age = g - tc
  if (age <= 0) return 0
  return (2.2 / 0.8) * (1 - Math.exp(-0.8 * age)) * TAU * (i === 0 ? 1 : -0.6) // pinwheel, decaying
}
// the catapulted war boy (resume gag): one ballistic arc off A's roof
function catapultBoy(g) {
  const age = g - (CHASE_EV.ramDomino + 0.14)
  if (age <= 0 || age > 1.3) return null
  const x = 210 - 150 * age
  const y = 700 - 480 * age + 520 * age * age
  return { x, y, rot: 8 * age * Math.exp(-1.1 * age), age }
}

// ============================== S1 — WASTELAND ==============================
function drawWasteland(ctx, lt, t) {
  const g = lt
  if (g >= WASTELAND_EV.sacked) {
    sackPOV(ctx, g, t) // bag over head: upside-down eye-hole POV to the cut
    return
  }
  const [shx, shy] = shakeXY(t, g > CT.netBag && g < CT.netBag + 0.3 ? 5 : 0)
  cam(ctx, 1.0, 960, 540, shx, shy)
  // slow lateral drift: integrated feel from a constant glide (PARALLAX table)
  const drift = 55 * g
  parallaxDunes(ctx, drift * PARALLAX.farDunes, drift * PARALLAX.midDunes, 900)
  heatShimmer(ctx, t, 470, 610)
  const GY = 880
  // far scrub
  scrubLayer(ctx, drift, GY)
  // ---- the parked interceptor + Remy eating lizard on the hood ----
  const carT0 = WASTELAND_EV.crest + 0.35
  const sprint = E.inQuad(seg(g, carT0 + 0.4, CT.netBag))
  const skid = seg(g, CT.netBag, CT.netBag + 0.35)
  const carX = g < carT0 + 0.4 ? 1120 : lerp(1120, 1700, sprint) - 80 * skid
  const carGY = GY
  // war-boy V crests the far dune at EV.crest, pours down the face
  if (g >= WASTELAND_EV.crest - 0.2) {
    const desc = E.outCubic(seg(g, WASTELAND_EV.crest, WASTELAND_EV.crest + 1.5))
    const v = [
      [700, 700, 1.7], [850, 688, 1.95], [1000, 696, 1.8], [560, 712, 1.6], [1140, 710, 1.62],
    ]
    v.forEach(([vx, vy, vk], i) => {
      const fx = vx + desc * 120 + Math.sin(g * 2 + i) * 4
      const fy = lerp(vy, 852, desc) - (i === 1 ? 8 : 0)
      shadow(ctx, fx, fy + 4, 34 * vk, 7 * vk, 0.2)
      sprite(ctx, [S.cast.warboy1, S.cast.warboy2, S.cast.warboy4, S.cast.warboy3, S.cast.warboy5][i], fx, fy, {
        ...walkCyc(g * 9 + i * 1.4, 4), sx: vk, sy: vk,
      })
    })
  }
  // ---- the lead pursuer overtakes and throws the net ----
  const leadX = g < carT0 + 0.4 ? -500 : lerp(-500, 1880, E.outCubic(seg(g, carT0 + 0.4, WASTELAND_EV.netBag + 0.05)))
  if (g > carT0 + 0.2 && leadX < 2100) {
    shadow(ctx, leadX, GY + 4, 120, 14, 0.26)
    ART.drawCar(ctx, S.carPlain, leadX, GY, { bob: 3 + Math.sin(t * 9) * 1.5, pitch: -1.1, wheel: (t * 5.2) % 1, dust: sprint > 0 && sprint < 1 ? 0.85 : 0 })
    sprite(ctx, S.cast.warboy2, leadX - 40, GY - 128 * 1.55, { sx: 1.55, sy: 1.55, ...stand })
  }
  // net flight + capture at CONTACT.netBag
  if (g > CT.netBag - 0.32 && g < CT.netBag + 1.6) {
    const fl = seg(g, CT.netBag - 0.32, CT.netBag)
    if (fl < 1) {
      const nx = lerp(leadX - 60, carX + 40, fl)
      const ny = lerp(GY - 210, GY - 90, fl) - Math.sin(fl * Math.PI) * 190
      netPainter(ctx, nx, ny, 130, 44, fl)
    } else {
      const sag = 0.4 + 0.6 * E.outCubic(seg(g, CT.netBag, CT.netBag + 0.4))
      netPainter(ctx, carX + 40, GY - 60, 150, 60, sag)
      // capture dust ring
      const age = g - CT.netBag
      if (age < 0.5) {
        ctx.strokeStyle = `rgba(217,165,94,${0.7 * (1 - age / 0.5)})`
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.ellipse(carX, GY - 8, 60 + age * 420, (60 + age * 420) * 0.22, 0, 0, TAU)
        ctx.stroke()
      }
    }
  }
  // ---- the interceptor (parked → sprint → skid) + Remy ----
  const cough = g > carT0 && g < carT0 + 0.5
  shadow(ctx, carX, GY + 4, 250, 18, 0.3)
  ART.drawCar(ctx, S.car, carX, GY, {
    bob: cough ? 3 : Math.sin(t * 8) * 1.2,
    pitch: cough ? -2.2 : sprint > 0 && sprint < 1 ? -1.6 - skid * 3 : 0,
    wheel: (((carX - 1120) / (TAU * 44)) % 1 + 1) % 1,
    dust: sprint > 0 && sprint < 1 ? 0.9 : 0,
  })
  // supercharger tick (parked): chrome glint + faint idle jitter
  if (g < carT0 + 0.4) {
    const tick = hash(Math.floor(t * 6) + 3)
    if (tick > 0.72) {
      ctx.fillStyle = 'rgba(232,237,242,0.85)'
      ctx.fillRect(carX + 116, GY - 128, 5, 3)
    }
  }
  // cough smoke puff
  if (cough) {
    const u = seg(g, carT0, carT0 + 0.5)
    ctx.globalAlpha = 0.5 * (1 - u)
    ctx.fillStyle = '#3a3e46'
    ctx.beginPath()
    ctx.arc(carX + 150 + u * 60, GY - 160 - u * 40, 8 + u * 20, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  // fuel-gauge inset gag while the car coughs
  if (g > carT0 - 0.2 && g < carT0 + 1.4) fuelGauge(ctx, carX + 60, GY - 250, 1.15)
  // Remy: on the hood with the lizard, then bolts upright at the crest, gone at sprint
  if (g < carT0 + 0.55) {
    const hop = seg(g, carT0 + 0.15, carT0 + 0.55)
    if (hop < 1) {
      const bobble = Math.sin(t * 1.2) * 2
      if (g < WASTELAND_EV.crest - 0.1) {
        // lying along the bonnet, head toward the windshield, stick up
        ctx.save()
        ctx.translate(carX - 88, GY - 104 + bobble)
        ctx.rotate(1.38)
        sprite(ctx, S.cast.madRemy, 0, 96, { sx: 2.5, sy: 2.5, ...stand })
        ctx.restore()
        lizard(ctx, carX + 44, GY - 196 + bobble, 2.4, t, cl(seg(g, WASTELAND_EV.lizard, WASTELAND_EV.lizard + 0.5)))
      } else {
        // upright, alarm
        sprite(ctx, S.cast.madRemy, carX - 20, GY - 120 + bobble, { sx: 2.5, sy: 2.5, lean: -0.09, lift: [3, 0] })
      }
    }
  }
  // dust of the sprint (baked events under the rear wheel)
  drawDust(ctx, S.dust.s1, g)
  ctx.restore()
}

// ============================== S2 — THE SHEAR ==============================
function drawShear(ctx, lt, t) {
  const { g, stop, sl } = SHEAR.warp(lt)
  // torch flicker feeds the shake (amber interior breathes)
  const flick = 0.5 + 0.5 * hash(Math.floor(g * 9) + 3)
  const [shx, shy] = shakeXY(t, stop ? 3 * (1 - sl / stop.d) : g > SHEAR_EV.clippers - 0.08 && g < SHEAR_EV.clippers + 0.1 ? 4 : 0)
  const push = 1 + 0.14 * seg(g, SHEAR_EV.snip, SHEAR_EV.snip + 0.5) * (g < SHEAR_EV.clippers ? 1 : 0)
  cam(ctx, push, 960, 560, shx, shy)
  // ---- interior: torch amber grooming hall ----
  bgWash(ctx, [[0, '#33200f'], [0.55, '#3a2410'], [1, '#1c1208']])
  // back wall: iron pipes + the stripped interceptor trophy (story §6 gag)
  ctx.fillStyle = '#2a1c0d'
  ctx.fillRect(-OS, 130, W + OS * 2, 420)
  ctx.fillStyle = '#382512'
  for (let px = -80; px < W + OS; px += 90) ctx.fillRect(px, 130, 8, 420)
  ctx.save()
  ctx.globalAlpha = 0.55
  ctx.drawImage(S.carPlain, 1500, 208, 306, 105)
  ctx.strokeStyle = '#454a52'
  ctx.lineWidth = 3
  ctx.strokeRect(1500, 208, 306, 105)
  ctx.fillStyle = '#8e8b78'
  ctx.font = '600 15px "JetBrains Mono"'
  ctx.fillText('TRIBUTE', 1620, 200)
  ctx.restore()
  // torches: flames freeze with world time (g)
  for (const tx of [190, 1730]) {
    ctx.fillStyle = '#26282e'
    ctx.fillRect(tx - 6, 190, 12, 130)
    const fu = 0.55 + 0.3 * hash(Math.floor(g * 8) + tx)
    ART.flameJet(ctx, tx, 196, fu * 0.5, tx)
    const glow = ctx.createRadialGradient(tx, 210, 8, tx, 210, 340 * (0.8 + flick * 0.2))
    glow.addColorStop(0, `rgba(240,130,40,${0.34 + flick * 0.1})`)
    glow.addColorStop(1, 'rgba(232,106,30,0)')
    ctx.fillStyle = glow
    ctx.fillRect(tx - 360, -100, 720, 680)
  }
  // broad amber wash so the hall reads torch-lit, not black
  ctx.fillStyle = 'rgba(214,120,44,0.09)'
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // warm floor pool under the chair
  const pool = ctx.createRadialGradient(880, 850, 40, 880, 850, 560)
  pool.addColorStop(0, `rgba(216,124,48,${0.24 + flick * 0.06})`)
  pool.addColorStop(1, 'rgba(196,110,40,0)')
  ctx.fillStyle = pool
  ctx.fillRect(240, 420, 1300, 640)
  ctx.fillStyle = '#0e0a07'
  ctx.fillRect(-OS, 862, W + OS * 2, H + OS)

  // ---- the engine-block barber chair ----
  const CHX = 780
  const slide = E.outCubic(seg(g, 0.05, 0.45))
  const chx = lerp(CHX - 420, CHX, slide)
  // backrest + piston + block base
  ctx.fillStyle = '#1c1e22'
  ctx.fillRect(chx - 78, 566, 40, 296)
  ctx.fillStyle = '#26282e'
  ctx.fillRect(chx - 96, 548, 72, 22)
  ctx.fillStyle = '#33373f'
  ctx.fillRect(chx - 96, 548, 72, 5)
  ctx.fillStyle = '#141518'
  ctx.fillRect(chx - 60, 700, 170, 130) // engine block
  ctx.fillStyle = '#26282c'
  for (const px of [chx - 44, chx + 4, chx + 52]) ctx.fillRect(px, 716, 26, 44)
  ctx.fillStyle = '#5f6b78'
  ctx.fillRect(chx - 40, 742, 6, 20)
  ctx.fillRect(chx + 66, 742, 6, 20)
  // seat pan (in front of the sitter's hips)
  const panY = 812
  // ---- REMY strapped in ----
  const remyFeet = 874
  const tremble = g > SHEAR_EV.snip && g < SHEAR_EV.clippers ? Math.sin(g * 40) * 1.4 : 0
  const sPass = cl((g - SHEAR_EV.clippers) / 2.2) // 0->1 across the pass (shear ladder)
  const remyRig = g < 0.4 ? S.cast.madRemy : shearNearest(sPass)
  if (g < 0.4) sprite(ctx, remyRig, chx + 26 + tremble, remyFeet, { sx: 2.8, sy: 2.8, lift: [2, 0], lean: 0.015 })
  else shearFade(ctx, sPass, chx + 26 + tremble, remyFeet, { sx: 2.8, sy: 2.8, lift: [2, 0], lean: 0.015 })
  const headCY = crownY(remyRig, remyFeet, 2.8)
  // comic oversized buckles (pop on after the chair lands)
  for (const [bu, by] of [[0.7, remyFeet - 150], [0.88, remyFeet - 84]]) {
    const pop = g > bu ? E.outBack(seg(g, bu, bu + 0.22)) : 0
    if (pop > 0) {
      ctx.save()
      ctx.translate(chx + 26, by)
      ctx.rotate(-0.5)
      ctx.scale(pop, pop)
      ctx.fillStyle = '#3a2a18'
      ctx.fillRect(-46, -8, 92, 16)
      ctx.fillStyle = '#cfd6de'
      ctx.fillRect(-14, -13, 28, 26)
      ctx.strokeStyle = '#0b0c0e'
      ctx.lineWidth = 2.4
      ctx.strokeRect(-14, -13, 28, 26)
      ctx.restore()
    }
  }
  // the cape: snaps on at 1.4; rises under the eyes for the warning snips
  const capeOn = seg(g, 1.35, 1.5)
  const capeTop = g > SHEAR_EV.snip ? lerp(remyFeet - 218, headCY + 74, seg(g, SHEAR_EV.snip, SHEAR_EV.snip + 0.4)) : remyFeet - 218
  if (capeOn > 0) {
    ctx.fillStyle = '#2a2c30'
    ctx.beginPath()
    ctx.moveTo(chx + 26 - 92 * capeOn, capeTop)
    ctx.quadraticCurveTo(chx + 26, capeTop - 14, chx + 26 + 92 * capeOn, capeTop)
    ctx.lineTo(chx + 26 + 120, remyFeet + 6)
    ctx.lineTo(chx + 26 - 120, remyFeet + 6)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#0b0c0e'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'rgba(232,106,30,0.14)' // torch amber on the cape top
    ctx.fillRect(chx + 26 - 88 * capeOn, capeTop, 176 * capeOn, 5)
  }
  // ---- the barber (citadel1 tinted pale — near rig) + clippers ----
  const bbX = 1120
  const patter = Math.sin(g * 2.6) * 8
  sprite(ctx, S.cast.citadel1, bbX + patter * 0.4, 878, { sx: 2.55, sy: 2.55, ...walkCyc(g * 2.2, 2), lean: 0.05 * Math.sin(g * 2.6) })
  // clippers travel: gestures (patter) -> warning snips -> SLAM -> the pass
  const clipK = 2.6
  let clipX = bbX - 78 + patter
  let clipY = 640 + patter * 0.6
  let clipRot = -0.5 + patter * 0.02
  let clipScale = 1
  if (g >= SHEAR_EV.snip && g < SHEAR_EV.clippers) {
    // warning snips: two open/close chomps near the hair
    const sn = seg(g, SHEAR_EV.snip, SHEAR_EV.clippers)
    clipX = lerp(bbX - 78, chx + 92, sn)
    clipY = lerp(640, headCY + 26, sn) + (sn > 0.55 && sn < 0.8 ? -12 : 0)
    clipRot = -0.35 + (Math.sin(sn * 26) > 0 ? 0.18 : -0.1)
  }
  if (g >= SHEAR_EV.clippers && g < SHEAR_EV.clippers + 0.25) {
    clipX = chx + 62 // ON the crown during the freeze
    clipY = headCY + 34
    clipRot = 0.9
    clipScale = 1.15 // SLAM scale-pop (story §6)
  }
  if (g >= SHEAR_EV.clippers + 0.25 && g < SHEAR_EV.muzzle) {
    // full-head pass: arc from brow to nape, shear ladder rides sPass
    const pu = seg(g, SHEAR_EV.clippers + 0.25, SHEAR_EV.muzzle - 0.4)
    clipX = chx + 26 - 74 + 148 * pu
    clipY = headCY + 40 - Math.sin(pu * Math.PI) * 12
    clipRot = 0.9 + pu * 0.9
  }
  if (g >= SHEAR_EV.muzzle) {
    clipX = bbX - 60 // lowered, job done
    clipY = 700
    clipRot = -0.3
  }
  ctx.save()
  ctx.translate(clipX, clipY)
  ctx.rotate(clipRot)
  const cs2 = clipK * 0.42 * clipScale // baked at 2.6x already: total ~1.1x native 44px
  ctx.scale(cs2, cs2)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(S.clips, -22, -14)
  ctx.restore()
  // ---- the SLAM: red-strand spark ring, ages on REAL stop time ----
  ringBurst(ctx, S.ringClippers, t, { cols: ['#a93837', '#c9503c', '#7a2c22'], speed: 230, len: 13 })
  // ---- red hair-rain through the pass (the only red leaving the frame) ----
  drawHairRain(ctx, S.hairRain, g, chx + 26, headCY + 30)
  // ---- the MUZZLE: clamps on at EV.muzzle ----
  if (g >= SHEAR_EV.muzzle && g < SHEAR_EV.cut - 0.05) {
    const drop = E.outCubic(seg(g, SHEAR_EV.muzzle, SHEAR_EV.muzzle + 0.2))
    const mzX = chx + 26
    const mzY = lerp(headCY - 60, headCY + 78, drop)
    ctx.save()
    ctx.translate(mzX, mzY)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.muz, -28, -11)
    ctx.restore()
    // the barber's proud pat: gleam on the comb rivet
    const pat = seg(g, SHEAR_EV.muzzle + 0.5, SHEAR_EV.muzzle + 0.9)
    if (pat > 0 && pat < 1) {
      ctx.globalAlpha = Math.sin(pat * Math.PI)
      ctx.strokeStyle = '#ffe9b0'
      ctx.lineWidth = 2
      for (const a of [0.4, 1.1]) {
        ctx.beginPath()
        ctx.arc(mzX + 4, mzY - 4, 8 + pat * 16, a, a + 0.7)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
  }
  // ---- chained to NUX: IV tube + blood bag + the salute ----
  if (g >= SHEAR_EV.bloodbag - 0.4) {
    const nuX = lerp(1560, 1360, E.outCubic(seg(g, SHEAR_EV.bloodbag - 0.4, SHEAR_EV.bloodbag + 0.6)))
    const walk = g < SHEAR_EV.bloodbag + 0.6
    // the salute: Nux snaps upright + gleam (single draw, pose shifts)
    const sal = seg(g, SHEAR_EV.cut - 0.9, SHEAR_EV.cut - 0.55)
    sprite(ctx, S.cast.nux, nuX, 880, {
      ...(walk ? walkCyc(g * 8) : stand),
      sx: 2.7, sy: 2.7,
      lift: sal > 0 ? [4, 0] : [2, 0],
      lean: sal > 0 ? -0.12 * Math.sin(sal * Math.PI) : 0.02,
    })
    // IV stand + bag (dark copper fluid — RED stays licensed to the hair/fire)
    const standX = 990
    ctx.strokeStyle = '#454a52'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(standX, 866)
    ctx.lineTo(standX, 560)
    ctx.lineTo(standX + 34, 560)
    ctx.stroke()
    const bagSw = Math.sin(g * 2.1) * 6
    ctx.fillStyle = 'rgba(207,214,222,0.35)'
    ctx.fillRect(standX + 20 + bagSw, 566, 34, 52)
    ctx.strokeStyle = 'rgba(207,214,222,0.8)'
    ctx.lineWidth = 1.6
    ctx.strokeRect(standX + 20 + bagSw, 566, 34, 52)
    ctx.fillStyle = '#6e3818'
    ctx.fillRect(standX + 23 + bagSw, 590, 28, 25)
    ctx.fillStyle = '#8a4a20'
    ctx.fillRect(standX + 23 + bagSw, 590, 28, 6)
    // tube: bag -> Remy's elbow -> Nux's forearm
    chainStroke(ctx, standX + 34 + bagSw, 616, chx + 60, remyFeet - 130, 1, { w: 3, light: '#9aa6b2', sag: 20 })
    chainStroke(ctx, chx + 60, remyFeet - 130, nuX - 34, 742, 1, { w: 3, light: '#9aa6b2', sag: 34 })
    if (sal > 0.3 && sal < 1) {
      ctx.globalAlpha = Math.sin(sal * Math.PI)
      ctx.fillStyle = '#ffe9b0'
      ctx.fillRect(nuX + 20, 626, 5, 5)
      ctx.globalAlpha = 1
    }
  }
  ctx.restore()
}

// shear ladder pickers: shearNearest(s) -> one baked rig (for geometry/crownY);
// shearFade(s) -> drawRemy crossfade of the two adjacent baked states
function shearNearest(s) {
  return S.shear[Math.round(cl(s) * 12)]
}
function shearPair(s) {
  const f = cl(s) * 12
  const i = Math.min(11, Math.floor(f))
  return [S.shear[i], S.shear[i + 1], f - i]
}
function shearFade(ctx, s, px, feet, o = {}) {
  const [ra, rb, u] = shearPair(s)
  if (u < 0.02) sprite(ctx, ra, px, feet, o)
  else if (u > 0.98) sprite(ctx, rb, px, feet, o)
  else {
    sprite(ctx, ra, px, feet, { ...o, alpha: (o.alpha ?? 1) * (1 - u) })
    sprite(ctx, rb, px, feet, { ...o, alpha: (o.alpha ?? 1) * u })
  }
}

// ============================== S3 — THE CITADEL ==============================
// crowd rows replicate the citadel bake's tier geometry (720x560, drawn 1.9x)
const CIT_W = 720, CIT_H = 560, CIT_K = 1.9, CIT_X = 276, CIT_BY = 962
const citScreen = (nx, ny) => [CIT_X + nx * CIT_K, CIT_BY - CIT_H * CIT_K + ny * CIT_K]
const CITADEL_TIERS = (() => {
  const towers = [
    { cx: 720 * 0.25, hw: 74, top: 560 * 0.16, tiers: 4 },
    { cx: 720 * 0.52, hw: 96, top: 560 * 0.04, tiers: 5 },
    { cx: 720 * 0.79, hw: 66, top: 560 * 0.27, tiers: 3 },
  ]
  const rows = []
  for (const t of towers)
    for (let ti = 1; ti < t.tiers; ti++) {
      const u = ti / t.tiers
      const y1 = t.top + u * (560 - 30 - t.top) + (ti === t.tiers - 1 ? 40 : 0)
      rows.push({ x: t.cx, y: y1 - 6, hw: t.hw * (1 - (ti - 1) / t.tiers * 0.24) })
    }
  return rows
})()

function drawCitadel(ctx, lt, t) {
  const g = lt
  // scene beats: wide (0-5) -> vault interior (5-8.2) -> roar + inhale (8.2-11.5)
  if (g >= CITADEL_EV.vault && g < CITADEL_EV.roar) return drawVault(ctx, g, t)
  const inhale = g >= CITADEL_EV.roar
  const [shx, shy] = shakeXY(t, inhale ? 3.4 : 0)
  // sneer: push toward 471
  const push = inhale ? 1.18 : 1 + 0.16 * seg(g, CITADEL_EV.sneer - 0.2, CITADEL_EV.sneer + 0.5) * (g < CITADEL_EV.vault ? 1 : 0)
  const panX = inhale ? lerp(960, 1030, seg(g, CITADEL_EV.roar, CITADEL_EV.roar + 1.2)) : 960
  cam(ctx, push, panX, inhale ? 470 : 570, shx, shy)
  // dusk sky behind the citadel
  bgWash(ctx, [[0, '#3a2418'], [0.5, '#8a4a28'], [0.8, '#d98a4a'], [1, '#f2c98a']])
  // the bake + crowd + spout pour
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.citadel, CIT_X, CIT_BY - CIT_H * CIT_K, CIT_W * CIT_K, CIT_H * CIT_K)
  // terraced crowd: 3 tints, cups and scalps up, jostle bob
  const crowdRoles = ['warboy1', 'citadel3', 'warboy4', 'warboy2', 'citadel4', 'warboy5', 'warboy3']
  let ci = 0
  for (const row of CITADEL_TIERS) {
    const n = row.hw > 80 ? 4 : 3
    for (let k = 0; k < n; k++) {
      const role = crowdRoles[ci % crowdRoles.length]
      const [sx, sy] = citScreen(row.x - row.hw * 0.75 + (k + 0.5) * (row.hw * 1.5) / n, row.y)
      const bob = Math.abs(Math.sin(t * 3.1 + ci * 1.7)) * 4
      const sc = 1.3
      sprite(ctx, S.cast[role], sx, sy - bob, { sx: sc, sy: sc, lift: [2, 0] })
      // cups up (glint when the FLOW is live); the upside-down cup worshipper
      const flipGag = ci === 9
      const glint = g > CITADEL_EV.spray - 0.3 ? 0.5 + 0.5 * Math.sin(t * 6 + ci) : 0
      cupProp(ctx, sx + 8, sy - bob - 78 * sc, sc * 0.9, flipGag, glint)
      ci++
    }
  }
  // the FLOW arcs GOLD from the spout (story §2 S3 note)
  const sp = citScreen(S.citadel.spout[0], S.citadel.spout[1])
  const pourU = cl(seg(g, CITADEL_EV.spray - 0.35, CITADEL_EV.spray))
  ART.flowPour(ctx, sp[0], sp[1] + 6, 120, pourU, 4)
  goldArcs(ctx, sp[0], sp[1] + 10, pourU, [[560, 880, 60], [940, 900, 90], [1350, 872, 70]])
  // ---- IMMORTAN FLOW above, GREAT WIG worn + bellows mask ----
  const [imx, imy] = citScreen(374.4, 242) // 2nd-tier balcony; QA fix (P2): +16 native (~30 screen px) so the mask/wig clears the top letterbox bar
  const breath = inhale
    ? 0.85 + 0.15 * Math.sin(t * 3) // the inhale as the rig roars (doom brass in)
    : 0.5 - 0.5 * Math.cos(TAU * DOOM_LFO * (t - MASTER.spray)) // 0.25 Hz LFO
  const imBob = Math.sin(t * 1.1) * 3
  const wigFlutter = inhale ? Math.sin(t * 14) * 3 : 0
  sprite(ctx, S.cast.immortan, imx, imy - imBob, { sx: 2.3, sy: 2.3, stand, lift: [2, 0] })
  ctx.save()
  ctx.translate(imx + wigFlutter * 0.4, crownY(S.cast.immortan, imy - imBob, 2.3) - 6)
  ctx.rotate(wigFlutter * 0.01)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(S.wigWorn, -102, -76)
  ctx.restore()
  ART.drawMask(ctx, S.mask, S.cast.immortan, { x: imx, feet: imy - imBob, sx: 2.3, breath, t })
  // opera glasses at the sneer (E12)
  if (g > CITADEL_EV.sneer - 0.25 && g < CITADEL_EV.sneer + 1.6) {
    const og = seg(g, CITADEL_EV.sneer - 0.25, CITADEL_EV.sneer + 0.1)
    const sweep = Math.sin((g - CITADEL_EV.sneer) * 2.2) * 26
    ctx.globalAlpha = og
    ctx.fillStyle = '#33373f'
    ctx.fillRect(imx - 16 + sweep, imy - imBob - 168, 32, 6)
    for (const dx of [-20, 20]) {
      ctx.fillStyle = '#0b0c0e'
      ctx.beginPath()
      ctx.arc(imx + dx + sweep, imy - imBob - 158, 12, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = '#cfd6de'
      ctx.lineWidth = 2.4
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    if (og > 0.8) {
      const k = (t * 0.9) % 1
      ctx.fillStyle = `rgba(255,246,214,${0.7 * Math.sin(k * Math.PI)})`
      ctx.beginPath()
      ctx.arc(imx + 20 + sweep, imy - imBob - 158, 3, 0, TAU)
      ctx.fill()
    }
  }
  // ---- the ROAR: rig bursts from the gate in a dust wall ----
  if (inhale) {
    const ru = seg(g, CITADEL_EV.roar, CITADEL_EV.roar + 2.4)
    const rigX = lerp(620, 2260, E.inQuad(ru))
    const rgy = 948
    shadow(ctx, rigX, rgy + 4, 420, 20, 0.3)
    ART.drawRig(ctx, S.rigFar, rigX, rgy, { bob: 3 + Math.sin(t * 11) * 2, pitch: -1.2, wheel: (ru * 5) % 1 })
    drawDust(ctx, S.dust.s3roar, g, { scale: 1.35 })
  }
  ctx.restore()
}

// S3b — the vault cutaway (E13 vault door kick, graffiti, wives, mech steal)
function drawVault(ctx, g, t) {
  const [shx, shy] = shakeXY(t, g < CITADEL_EV.vault + 0.35 ? 5 * (1 - (g - CITADEL_EV.vault) / 0.35) : 0)
  cam(ctx, 1.0, 960, 560, shx, shy)
  bgWash(ctx, [[0, '#181008'], [0.6, '#241810'], [1, '#0e0a06']])
  // vault back wall + floor
  ctx.fillStyle = '#20160c'
  ctx.fillRect(-OS, 120, W + OS * 2, 700)
  ctx.fillStyle = '#171008'
  for (let px = -60; px < W + OS; px += 120) ctx.fillRect(px, 120, 6, 700)
  ctx.fillStyle = '#0e0a06'
  ctx.fillRect(-OS, 856, W + OS * 2, H + OS)
  ctx.fillStyle = 'rgba(232,197,106,0.06)'
  ctx.fillRect(-OS, 856, W + OS * 2, 4)
  // torch pools
  for (const tx of [330, 1430]) {
    const glow = ctx.createRadialGradient(tx, 300, 10, tx, 300, 420)
    glow.addColorStop(0, 'rgba(232,150,60,0.16)')
    glow.addColorStop(1, 'rgba(232,150,60,0)')
    ctx.fillStyle = glow
    ctx.fillRect(tx - 430, -60, 860, 860)
  }
  // THE GRAFFITI WALL — in-scene paint, large and hand-done (NOT the captions).
  // QA fix (P1): the painted phrase used to sit at y430 — the locked kicker
  // lane — so the caption doubled it. The whole wall moved up: line 2's glyph
  // bottoms + paint drips now end ~398, clear of the kicker glyph tops (~410).
  graffiti(ctx, 'WE ARE NOT WIGS.', 700, 244, 74, '#e8e4da', -0.015)
  graffiti(ctx, 'WHO SHAVED THE WORLD?', 760, 348, 42, '#c9a86b', 0.012)
  // the vault door: kicked open at E13 (panel swings with a bounce)
  const kick = E.outCubic(seg(g, CITADEL_EV.vault, CITADEL_EV.vault + 0.4))
  ctx.save()
  ctx.translate(190, 856)
  ctx.transform(1, 0, 0.18 * (1 - kick), 1, 0, 0)
  ctx.fillStyle = '#2a2e34'
  ctx.fillRect(-40, -620 * (0.15 + 0.85 * kick), 80, 620 * (0.15 + 0.85 * kick))
  ctx.strokeStyle = '#0b0c0e'
  ctx.lineWidth = 3
  ctx.strokeRect(-40, -620 * (0.15 + 0.85 * kick), 80, 620 * (0.15 + 0.85 * kick))
  ctx.fillStyle = '#5f6b78'
  ctx.beginPath()
  ctx.arc(0, -300 * (0.15 + 0.85 * kick), 16, 0, TAU)
  ctx.fill()
  ctx.restore()
  if (g < CITADEL_EV.vault + 0.5) {
    const du = (g - CITADEL_EV.vault) / 0.5
    ctx.globalAlpha = 0.5 * (1 - du)
    ctx.fillStyle = '#6e5a3c'
    for (let i = 0; i < 7; i++) {
      ctx.beginPath()
      ctx.arc(240 + (hash(i * 3) - 0.5) * 220, 700 - du * 300 - hash(i) * 200, 8 + du * 26, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  // the wives: seed pouch across the shoulder; mech arm humming. The instant a
  // wife's hop starts (the steal) her grounded copy despawns and the leap runs
  // FROM her ground mark — QA fix (P1): the old gate kept the grounded body
  // until the hop ENDED, so two copies of her co-existed mid-leap.
  const wv = [
    ['wifeSeed', 560, 880], ['wifeVeil', 700, 886], ['wifeToes', 830, 878],
  ]
  const hopRoles = ['wifeToes', 'wifeVeil', 'wifeSeed']
  const HOP_FROM = { wifeToes: [830, 878], wifeVeil: [700, 886], wifeSeed: [560, 880] }
  // strict > : at the exact launch frame the grounded copy still owns her (the
  // airborne branch takes over at hu > 0) — no frame is ever wife-less, and the
  // two branches are disjoint so no doubles.
  const hopStarted = (role) => hopRoles.indexOf(role) >= 0 && g > CITADEL_EV.steal + hopRoles.indexOf(role) * 0.2
  for (const [role, wx, wy] of wv) {
    if (hopStarted(role)) continue
    sprite(ctx, S.cast[role], wx, wy, { sx: 2.5, sy: 2.5, ...walkCyc(g * 6.4 + wx, 4), lean: 0.03 })
  }
  // the pouch rides wifeSeed's hip: ground mark until her hop, then with her
  const sdHop = g > CITADEL_EV.steal + hopRoles.indexOf('wifeSeed') * 0.2
  if (!sdHop) {
    ctx.save()
    ctx.translate(588, 742)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.pouch, -20, -18)
    ctx.restore()
  }
  sprite(ctx, S.cast.flowiosa, 380, 884, { sx: 2.6, sy: 2.6, lift: [3, 0], lean: -0.06 })
  // the parked rig (rear 2/3 in frame) + the mech arm reaching for the cab rail
  const rigGX = 1980, rigGY = 956
  shadow(ctx, rigGX, rigGY + 4, 560, 24, 0.32)
  ART.drawRig(ctx, S.rigFar, rigGX, rigGY, { bob: 0.6, wheel: 0 })
  // hatches pile: wives hop up one-two-three at the steal (E14)
  const deckYv = rigGY - (260 - 2 - 12) * 1.15 + 24 // walkway on the far bake
  hopRoles.forEach((role, i) => {
    const h0 = CITADEL_EV.steal + i * 0.2
    const hu = seg(g, h0, h0 + 0.55)
    if (hu <= 0) return // still grounded: the ground draw above owns her (no doubles)
    // the leap runs FROM her own ground mark (QA fix: never a second spawn point)
    const [fx, fy] = HOP_FROM[role]
    const hx = lerp(fx, rigGX - 430 + i * 90, hu)
    const hy = lerp(fy, deckYv, hu) - Math.sin(hu * Math.PI) * 130
    sprite(ctx, S.cast[role], hx, hy, { sx: 1.7, sy: 1.7, lift: [4, 2], lean: 0.1 })
    if (role === 'wifeSeed') {
      // her pouch leaps with her (tracked prop — one pouch at all times)
      ctx.save()
      ctx.translate(hx - 22, hy + 34)
      ctx.scale(0.6, 0.6)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(S.pouch, -20, -18)
      ctx.restore()
    }
  })
  // mech arm extends to the cab rail at the steal
  const armU = seg(g, CITADEL_EV.steal, CITADEL_EV.steal + 0.5)
  if (armU > 0) {
    const reach = lerp(300, 1080, E.outCubic(armU))
    ctx.save()
    ctx.translate(440, 620)
    ctx.rotate(-0.22 + (1 - armU) * 0.1)
    ctx.imageSmoothingEnabled = false
    const curl = S.arms[Math.round(cl(armU) * 8)] // reach then claw closes
    ctx.drawImage(curl, 0, -40, reach, 80)
    ctx.restore()
  }
  ctx.restore()
}

// ============================== S4 — THE CHASE ==============================
function drawChase(ctx, lt, t) {
  const { g, stop, sl } = CHASE.warp(lt)
  const s4 = S.s4.at(Math.min(g, SPEED.rig.s4[SPEED.rig.s4.length - 1][0]))
  const speed = s4Speed(g)
  // whip-pan blur streaks across the S3->S4 cut (6 frames)
  const whip = 1 - seg(lt, 0, 0.1)
  const [shx, shy] = shakeXY(t, 2.2 + speed / 300 + (stop ? 5 * (1 - sl / stop.d) : 0) + (g > CHASE_EV.ramDomino && g < CHASE_EV.ramDomino + 0.35 ? 3 : 0))
  cam(ctx, 0.98, 960 + whip * 130, 560, shx + whip * -60, shy)
  // parallax: dunes far/mid, highway strip at ground, scrub foreground
  parallaxDunes(ctx, s4 * PARALLAX.farDunes, s4 * PARALLAX.midDunes, 762)
  const x0 = -mod(s4, 2560)
  for (let tx = x0 - 2560; tx < W + OS; tx += 2560) ctx.drawImage(S.highway, tx, 900 - S.highway.groundY)
  // dust (world events, painted under the vehicles)
  drawDust(ctx, S.dust.s4rig, g)
  drawDust(ctx, S.dust.s4nux, g)
  drawDust(ctx, S.dust.s4pur, g)
  drawDust(ctx, S.dust.s4doof, g)
  // ---- the convoy (single lane + far doof) ----
  // doof rig, far right background: speaker wall + blindfolded doof + flame guitar.
  // The stack is drawn TALL so its top clears the rig's cab roof (fills background).
  const doofX = CHASE_STAGE.doofX, doofGY = CHASE_STAGE.doofGY
  shadow(ctx, doofX, doofGY + 4, 190, 14, 0.25)
  ART.drawRig(ctx, S.rigFar, doofX, doofGY, { bob: 2 + Math.sin(t * 9) * 1.4, pitch: -0.8, wheel: (s4 / (S.rigFar.rigMeta.wheels[0][2] * 1.15 * TAU)) % 1 })
  const wallW = 420 * 1.35, wallH = 300 * 1.35
  const wallX = 1330, wallBy = doofGY - (S.rigFar.height - 2) * 1 + 40 // base sits on the deck line
  ctx.drawImage(S.wall, wallX, wallBy - wallH, wallW, wallH)
  // bungee cord from above the band down to the doof's harness
  const doofXx = wallX + wallW * 0.42, doofFeet = wallBy - wallH * 0.42
  const sway = Math.sin(t * 1.7) * 14
  ctx.strokeStyle = '#3a2a18'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(doofXx - sway * 0.3, 118)
  ctx.quadraticCurveTo(doofXx + sway, 200, doofXx + sway * 0.5, doofFeet - 96)
  ctx.stroke()
  sprite(ctx, S.cast.doofBlind, doofXx + sway * 0.5, doofFeet, { sx: 1.75, sy: 1.75, ...stand, lean: sway * 0.004 })
  ctx.save()
  ctx.translate(doofXx + 92, doofFeet - 22)
  ctx.rotate(-0.5 + sway * 0.004)
  ctx.scale(0.85, 0.85)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(S.guitar, -75, -28)
  ctx.restore()
  // flame licks synced to the doof grid (8ths after CHASE_EV.doof)
  const eighth = beatSec('chase') / 2
  const ph = (g - CHASE_EV.doof) / eighth
  const flameU = ph > 0 ? 0.45 + 0.55 * Math.pow(1 - (ph % 1), 2) : 0
  ART.flameJet(ctx, doofXx + 92 + 148 * 0.85, doofFeet - 22 - 40, flameU, 6)

  // pursuers C, B, A (behind Nux, same lane)
  for (let i = 2; i >= 0; i--) {
    const px = pursuerX(g, i)
    if (px < -520 || px > W + 520) continue
    shadow(ctx, px, CHASE_STAGE.purGY + 4, 130, 12, 0.24)
    const rot = pursuerRot(g, i)
    ctx.save()
    if (rot) {
      ctx.translate(px, CHASE_STAGE.purGY + 40)
      ctx.rotate(rot)
      ART.drawCar(ctx, S.carPlain, 0, -40, { bob: 2, wheel: (s4 / (26 * 1.6 * TAU)) % 1, pitch: 0 })
    } else {
      ART.drawCar(ctx, S.carPlain, px, CHASE_STAGE.purGY, { bob: 2.4 + Math.sin(t * 10 + i) * 1.6, pitch: -0.9, wheel: (s4 / (26 * 1.6 * TAU)) % 1, dust: 0 })
    }
    ctx.restore()
  }
  // catapult gag: a war boy launched off A's roof on the resume
  const boy = catapultBoy(g)
  if (boy) sprite(ctx, S.cast.warboy3, boy.x, boy.y, { sx: 1.5, sy: 1.5, rot: boy.rot, lift: [4, 4] })

  // ---- the WAR RIG (camera anchor) ----
  const rigX = CHASE_STAGE.rigX, rigGY = CHASE_STAGE.rigGY
  shadow(ctx, rigX, rigGY + 5, 560, 22, 0.3)
  ART.drawRig(ctx, S.rig, rigX, rigGY, {
    bob: 2.5 + Math.sin(t * 7.3) * 1.8, pitch: 0.7, wheel: (s4 / CHASE_STAGE.wheelRevRig) % 1,
  })
  // pole-cats stowed on the deck (bend oscillates with speed)
  for (let i = 0; i < 4; i++) {
    const bend = 0.5 * Math.sin(t * 6 + i * 1.7) * cl(speed / 500)
    ctx.drawImage(S.poles[i % 3], rigX - 420 + i * 210, rigGY - 428 + Math.abs(bend) * 6, 28, 160)
  }
  // rig rear window: the wives' cab glimpse (drawn after landing)
  const winRect = [rigX - 646 + 552 * 1.7, rigGY - 440 + 46 * 1.7, 56 * 1.7, 58 * 1.7]
  const aboard = g >= CHASE_EV.aboard
  if (aboard) {
    ctx.fillStyle = '#10141a'
    ctx.fillRect(...winRect)
    // wives applaud politely, glimpsed INSIDE the cab (E22)
    const ap = g - CHASE_EV.aboard
    const clap = ap > 0.2 ? Math.abs(Math.sin(ap * 6.2)) * 3 : 0
    ctx.save()
    ctx.beginPath()
    ctx.rect(...winRect)
    ctx.clip()
    sprite(ctx, S.cast.wifeVeil, winRect[0] + 26, winRect[1] + winRect[3] + 14 - clap, { sx: 0.82, sy: 0.82, lift: [2, 0] })
    sprite(ctx, S.cast.wifeSeed, winRect[0] + 68, winRect[1] + winRect[3] + 16, { sx: 0.82, sy: 0.82, lift: [2, 0] })
    ctx.restore()
    ctx.strokeStyle = '#454a52'
    ctx.lineWidth = 3
    ctx.strokeRect(...winRect)
    ctx.strokeStyle = 'rgba(207,214,222,0.4)'
    ctx.lineWidth = 1.4
    // the shatter lines stay after the glass burst
    if (g < CHASE_EV.aboard + 2.2) {
      const gu = (g - CHASE_EV.aboard) / 2.2
      ctx.globalAlpha = 1 - gu
      for (let i = 0; i < 5; i++) {
        const a = hash(i * 9 + 2) * TAU
        ctx.beginPath()
        ctx.moveTo(winRect[0] + winRect[2] / 2, winRect[1] + winRect[3] / 2)
        ctx.lineTo(winRect[0] + winRect[2] / 2 + Math.cos(a) * winRect[2] * 0.55, winRect[1] + winRect[3] / 2 + Math.sin(a) * winRect[3] * 0.55)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
  }

  // ---- NUX's car + REMY splayed on the hood ----
  const nuxGapPx = nuxGap(g)
  const nuxX = CHASE_STAGE.nuxX, nuxGY = CHASE_STAGE.nuxGY
  shadow(ctx, nuxX, nuxGY + 5, 280, 16, 0.28)
  ART.drawCar(ctx, S.carPlain, nuxX, nuxGY, {
    bob: 3 + Math.sin(t * 8.4) * 2, pitch: -1.1, wheel: (s4 / (26 * 1.8 * TAU)) % 1,
    dust: 0, // nux plume from its own table
  })
  const nuxRig = g >= CHASE_EV.sprayDay && g < CHASE_EV.swing + 1.2 ? S.cast.nuxSilver : S.cast.nux
  // Nux visible at the wheel (head + silver grin after the spray swap);
  // the whoop bounce rides the same single draw (no ghosting)
  const whoop = g > CHASE_EV.sprayDay && g < CHASE_EV.sprayDay + 0.7 ? Math.sin((g - CHASE_EV.sprayDay) * 9) : 0
  sprite(ctx, nuxRig, nuxX + 178, nuxGY - 118 + whoop * 5, { sx: 1.35, sy: 1.35, lift: [2, 0], lean: 0.1 * whoop })
  // silver mouth-spray mist (E18) + the ram domino ring, ages on the right clocks
  drawSpray(ctx, S.sprayS4, g)
  // REMY splayed on the hood (blood-bag ornament), muzzled + chained
  const hoodX = nuxX + 150, hoodY = nuxGY - 122
  if (g < CHASE_EV.swing) {
    const splay = { lift: [5, 5], stride: [4, -4], rot: -0.72, sx: 2.4, sy: 2.4 }
    shearFade(ctx, 1, hoodX, hoodY, splay)
    // muzzle on the head anchor
    ctx.save()
    ctx.translate(hoodX - 46, hoodY - 182)
    ctx.rotate(-0.72)
    ctx.scale(0.9, 0.9)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.muz, -28, -11)
    ctx.restore()
    // chain: hood ring to his chest
    chainStroke(ctx, hoodX + 74, hoodY - 20, hoodX - 20, hoodY - 150, 0.5, { w: 3, sag: 16 })
  } else if (g < CHASE_EV.aboard + 0.05) {
    // THE BOARDING SWING: one ballistic arc, car hood -> rig rear window (E21)
    const u = seg(g, CHASE_EV.swing, CHASE_EV.aboard)
    const x0s = hoodX - 10, y0s = hoodY - 160
    const x1s = winRect[0] + 22, y1s = winRect[1] + 30
    const sxp = lerp(x0s, x1s, u)
    const syp = lerp(y0s, y1s, u) - 190 * Math.sin(u * Math.PI)
    shearFade(ctx, 1, sxp, syp, { sx: 2.4, sy: 2.4, rot: -0.9 + u * 1.7, lift: [5, 5] })
    chainStroke(ctx, hoodX + 74, hoodY - 20, sxp, syp - 60, 0.85, { w: 3, sag: 30 })
  }
  // the lasso (E20): harpoon chain nux front -> rig rear wheel, sag->taut over 6 frames
  if (g >= CHASE_EV.lasso - 0.25 && g < CHASE_EV.swing) {
    const bite = g >= CHASE_EV.lasso
    const taut = bite ? cl((g - CHASE_EV.lasso) / 0.1) : cl(seg(g, CHASE_EV.lasso - 0.25, CHASE_EV.lasso) * 0.4)
    chainStroke(ctx, nuxX + 300, nuxGY - 90, rigX - 646 + 110 * 1.7, rigGY - 52, bite ? taut : 0.2, { w: 4, sag: 60 * (1 - taut) })
    if (bite && g < CHASE_EV.lasso + 0.2) {
      ctx.globalAlpha = 1 - (g - CHASE_EV.lasso) / 0.2
      ctx.strokeStyle = '#ffe9b0'
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.arc(rigX - 646 + 110 * 1.7, rigGY - 52, 12, 0, TAU)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }
  // the ram domino: spark + glass ring at the freeze, ages on REAL t
  ringBurst(ctx, S.ringRam, t, { cols: ['#cfe0ea', '#ffc23c', '#9aa6b2'], speed: 300, len: 12 })
  drawGlass(ctx, { g: CHASE_EV.aboard, x: winRect[0] + 38, y: winRect[1] + 36 }, g)
  // foreground scrub at 1.55
  scrubLayer(ctx, s4 * PARALLAX.ground, 940)
  ctx.restore()
  void nuxGapPx
}
// S4 rig speed (for shake + dust vx) — read from the table's profile
function s4Speed(g) {
  const pr = SPEED.rig.s4
  if (g <= 0) return pr[0][1]
  for (let i = 1; i < pr.length; i++)
    if (g <= pr[i][0]) {
      const [g0, v0] = pr[i - 1], [g1, v1] = pr[i]
      return lerp(v0, v1, cl((g - g0) / (g1 - g0)))
    }
  return pr[pr.length - 1][1]
}

// ============================== S5 — THE DEFECT ==============================
function drawDefect(ctx, lt, t) {
  const g = lt
  const s5 = 640 * g // SPEED.rig holds 640 through S5 (closed form, no integration)
  const dusk = seg(g, DEFECT_EV.defect - 1, DEFECT_EV.cut)
  const [shx, shy] = shakeXY(t, 1.6 + (g < DEFECT_EV.tumble + 0.4 ? 4 * (1 - (g - DEFECT_EV.tumble) / 0.4) : 0))
  // seed-press push-in (2.5%)
  const pushSeed = 1 + 0.025 * seg(g, DEFECT_EV.seed - 0.2, DEFECT_EV.seed + 0.5)
  cam(ctx, pushSeed, 960, 560, shx, shy)
  parallaxDunes(ctx, s5 * PARALLAX.farDunes, s5 * PARALLAX.midDunes, 762)
  const x0 = -mod(s5, 2560)
  for (let tx = x0 - 2560; tx < W + OS; tx += 2560) ctx.drawImage(S.highway, tx, 900 - S.highway.groundY)
  drawDust(ctx, S.dust.s5rig, g)
  const rigX = 1150, rigGY = 900
  shadow(ctx, rigX, rigGY + 5, 560, 22, 0.3)
  ART.drawRig(ctx, S.rig, rigX, rigGY, { bob: 2 + Math.sin(t * 6.4) * 1.6, pitch: 0.5, wheel: (s5 / CHASE_STAGE.wheelRevRig) % 1 })
  const deckY = rigGY - 440 + 40 * 1.7 // walkway plank line
  const winRect = [rigX - 646 + 560 * 1.7, rigGY - 440 + 52 * 1.7, 44 * 1.7, 44 * 1.7]

  if (g >= DEFECT_EV.seed - 0.1 && g < DEFECT_EV.witness - 0.3) return drawSeedPress(ctx, g, t) || ctx.restore()

  // ---- Nux hauls up the chain and FACE-PLANTS on the deck (E23) ----
  const tum = seg(g, DEFECT_EV.tumble, DEFECT_EV.tumble + 0.75)
  if (tum < 1) {
    const nx = lerp(760, 1010, tum)
    const ny = lerp(760, deckY + 10, tum) - Math.sin(tum * Math.PI) * 190
    sprite(ctx, S.cast.nux, nx, ny, { sx: 2.6, sy: 2.6, rot: -1.2 + tum * 1.15, lift: [4, 4] })
    // the chain swings from the tanker rear corner (decaying pendulum, pure fn)
    const pivX = rigX - 646 + 76 * 1.7, pivY = deckY - 6
    const ang = 0.8 * Math.exp(-tum * 2.2) * Math.cos(tum * 9)
    chainStroke(ctx, pivX, pivY, pivX + Math.sin(ang) * 260, pivY + Math.cos(ang) * 260, 0.8, { w: 3, sag: 12 })
  } else {
    // prone -> rising to his knees for the face-off
    const rise = seg(g, DEFECT_EV.tumble + 0.75, DEFECT_EV.unmuzzle - 0.3)
    const nx = 1010, ny = deckY + 10 - rise * 42
    sprite(ctx, S.cast.nux, nx, ny, { sx: 2.6, sy: 2.6, rot: (1 - rise) * -1.25, lift: [3, 3], lean: -0.1 * rise })
  }
  // ---- REMY out of the cab, the face-off: muzzle vs white paint ----
  const outU = seg(g, 0.1, 0.7)
  const remyX = lerp(winRect[0] + 30, 1120, E.outCubic(outU))
  const remyY = lerp(winRect[1] + 40, deckY + 8, E.outCubic(outU))
  const muzzleOn = g < DEFECT_EV.unmuzzle
  if (muzzleOn || g < DEFECT_EV.unmuzzle + 0.05) {
    shearFade(ctx, 1, remyX, remyY, { sx: 2.5, sy: 2.5, lift: [2, 0] })
    if (muzzleOn) {
      ctx.save()
      ctx.translate(remyX + 4, crownY(S.shear[12], remyY, 2.5) + 84)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(S.muz, -28, -11)
      ctx.restore()
    }
  } else {
    // THE SHORN REVEAL (E24): one beat of stillness — just him, the wind, the deck
    shearFade(ctx, 1, remyX, remyY, { sx: 2.5, sy: 2.5, lift: [2, 0], lean: 0.015 * Math.sin(t * 1.2) })
  }
  // mech arm UNMASKS him: reaches from the cab window, muzzle springs away
  const armT = DEFECT_EV.unmuzzle
  if (g > armT - 0.5 && g < armT + 0.1) {
    const au = seg(g, armT - 0.5, armT)
    const ax = lerp(winRect[0] + 40, remyX + 6, E.outCubic(au))
    const ay = lerp(winRect[1] + 40, crownY(S.shear[12], remyY, 2.5) + 80, au)
    ctx.save()
    ctx.translate(winRect[0] + 40, winRect[1] + 40)
    ctx.rotate(Math.atan2(ay - winRect[1] - 40, ax - winRect[0] - 40))
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.arms[8 - Math.round(au * 8)], 0, -27, Math.hypot(ax - winRect[0] - 40, ay - winRect[1] - 40), 54)
    ctx.restore()
  }
  // the sproing: muzzle flies off on a bouncing analytic arc
  const mzAge = g - armT
  if (mzAge > 0 && mzAge < 1.1) {
    const mx = remyX + 6 + 430 * mzAge
    const b1 = Math.abs(Math.sin(mzAge * 7.5)) * Math.exp(-1.6 * mzAge)
    const my = crownY(S.shear[12], remyY, 2.5) + 80 + 320 * mzAge * mzAge - 210 * b1
    ctx.save()
    ctx.translate(mx, my)
    ctx.rotate(mzAge * 14)
    ctx.scale(0.9, 0.9)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.muz, -28, -11)
    ctx.restore()
  }
  // ---- the wives on the deck (they rode aboard) ----
  if (g > DEFECT_EV.tumble + 0.5 && g < DEFECT_EV.witness + 1.4) {
    sprite(ctx, S.cast.wifeSeed, 1268, deckY + 6, { sx: 2.1, sy: 2.1, ...stand })
    sprite(ctx, S.cast.wifeToes, 860, deckY + 8, { sx: 2.05, sy: 2.05, ...stand, flip: true })
  }
  // ---- WITNESS ME (E26): Nux silver on the tanker top, arms wide, mist ----
  if (g >= DEFECT_EV.witness - 0.5) {
    const wx = 980
    const wu = seg(g, DEFECT_EV.witness - 0.5, DEFECT_EV.witness - 0.1)
    const wfeet = lerp(deckY + 40, deckY - 26, wu) + Math.sin(t * 2.2) * 2
    sprite(ctx, S.cast.nuxSilver, wx, wfeet, { sx: 2.6, sy: 2.6, lift: [3, 3], lean: 0.02 * Math.sin(t * 3) })
    // silver spray mist at the witness
    drawSpray(ctx, S.sprayS5, g)
    // the wives' deadpan chest-taps
    for (const [role, txp] of [['wifeVeil', 1140], ['wifeToes', 820]]) {
      const tap = Math.sin(t * 4.6 + txp)
      sprite(ctx, S.cast[role], txp, deckY + 6, { sx: 2.05, sy: 2.05, lift: [2, 0], lean: 0.05 * tap })
    }
  }
  // ---- Nux comes down different: the nav seat + the paint wipe (E27) ----
  if (g >= DEFECT_EV.defect) {
    const du = seg(g, DEFECT_EV.defect, DEFECT_EV.defect + 0.9)
    const clean = g > DEFECT_EV.defect + 0.45 // paint wipe: clean variant swap
    const dx2 = lerp(980, winRect[0] + 60, E.outCubic(du))
    const dy2 = lerp(deckY - 26, winRect[1] + winRect[3] + 10, E.outCubic(du))
    sprite(ctx, clean ? S.cast.nux : S.cast.nuxSilver, dx2, dy2, { sx: 2.2, sy: 2.2, lift: [2, 0], lean: 0.06 * (1 - du) })
    if (du > 0.4 && du < 0.75) {
      // the white stripe comes off onto the sill
      ctx.globalAlpha = (0.75 - du) * 3
      ctx.fillStyle = '#e8e4da'
      ctx.fillRect(winRect[0] - 30, winRect[1] + winRect[3] + 4, 46, 7)
      ctx.globalAlpha = 1
    }
  }
  // the doof flame DIES at the seed (score hard-out made visible, far background)
  void dusk
  scrubLayer(ctx, s5 * PARALLAX.ground, 940)
  ctx.restore()
}

// THE SEED PRESS close-up (E25): the warmest, smallest light in the film.
// A gold seed in a palm; everything else darkened a step. Full-frame painter.
function drawSeedPress(ctx, g, t) {
  void t
  bgWash(ctx, [[0, '#120a06'], [0.5, '#1a1008'], [1, '#0c0704']])
  // the single warm light: radial pool centred on the hands
  const pool = ctx.createRadialGradient(960, 560, 40, 960, 560, 470)
  pool.addColorStop(0, 'rgba(255,214,130,0.34)')
  pool.addColorStop(0.5, 'rgba(196,130,50,0.12)')
  pool.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = pool
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  const press = seg(g, DEFECT_EV.seed - 0.15, DEFECT_EV.seed + 0.25) // the press
  const close = seg(g, DEFECT_EV.seed + 0.15, DEFECT_EV.seed + 0.55) // fingers close
  // HER hand (wifeSeed), entering from the upper left, seed held to the palm
  ctx.save()
  ctx.translate(lerp(430, 800, E.outCubic(press)), lerp(240, 430, E.outCubic(press)))
  ctx.rotate(0.5 + 0.1 * Math.sin(t * 0.9))
  handPaint(ctx, 1, close)
  ctx.restore()
  // HIS open palm (Nux), from the lower right
  ctx.save()
  ctx.translate(1180, 760)
  ctx.rotate(-2.62)
  handPaint(ctx, 0, 0)
  ctx.restore()
  // THE SEED — one gold follicle, pressed into the palm centre
  const sdX = 1006, sdY = 560
  const glow = 0.75 + 0.25 * Math.sin(t * 2.2)
  const sg = ctx.createRadialGradient(sdX, sdY, 2, sdX, sdY, 130)
  sg.addColorStop(0, `rgba(255,230,150,${0.5 * glow})`)
  sg.addColorStop(1, 'rgba(255,230,150,0)')
  ctx.fillStyle = sg
  ctx.fillRect(sdX - 130, sdY - 130, 260, 260)
  ctx.save()
  ctx.translate(sdX, sdY - (1 - press) * 60)
  ctx.rotate(0.5)
  ctx.fillStyle = '#a8c45a'
  ctx.beginPath()
  ctx.ellipse(0, 0, 15, 9, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#e2f0a0'
  ctx.beginPath()
  ctx.ellipse(-4, -2.5, 6, 3, 0.4, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#5a7a26'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.ellipse(0, 0, 15, 9, 0, 0, TAU)
  ctx.stroke()
  ctx.restore()
  // darkened step outside the pool (story §2: everything else a step down)
  const vg = ctx.createRadialGradient(960, 560, 300, 960, 560, 1000)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = vg
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
}
// simple painted hand: palm + thumb + fingers, ramp-lit; `her` mirrors it
function handPaint(ctx, her, closeF) {
  const s = 1.9
  ctx.scale(her ? -s : s, s)
  const skin = (col) => col
  ctx.fillStyle = skin('#c9a074')
  ctx.beginPath()
  ctx.moveTo(-70, 20)
  ctx.quadraticCurveTo(-84, -30, -60, -64)
  ctx.quadraticCurveTo(-40, -92, -6, -92)
  ctx.quadraticCurveTo(40, -92, 62, -60)
  ctx.quadraticCurveTo(78, -30, 70, 24)
  ctx.quadraticCurveTo(40, 52, 0, 50)
  ctx.quadraticCurveTo(-44, 50, -70, 20)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#5a3a1c'
  ctx.lineWidth = 3
  ctx.stroke()
  // light: gold rim from the seed side
  ctx.strokeStyle = 'rgba(255,220,140,0.55)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(60, -56)
  ctx.quadraticCurveTo(76, -28, 68, 22)
  ctx.stroke()
  // fingers folding over (the close)
  ctx.fillStyle = skin('#b8906a')
  for (let i = 0; i < 4; i++) {
    const fy = -58 + i * 26
    const fold = closeF * (16 + i * 2)
    ctx.beginPath()
    ctx.roundRect ? ctx.roundRect(62, fy, 46 - fold * 0.4, 18, 9) : ctx.rect(62, fy, 46 - fold * 0.4, 18)
    ctx.fill()
    ctx.strokeStyle = '#5a3a1c'
    ctx.lineWidth = 2
    ctx.stroke()
  }
  // thumb
  ctx.fillStyle = skin('#c9a074')
  ctx.beginPath()
  ctx.ellipse(-38 + closeF * 30, -66 + closeF * 30, 26, 15, -0.5, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#5a3a1c'
  ctx.lineWidth = 2.6
  ctx.stroke()
}

// ============================== S6–S10 — builder 2 ==============================
// Realized per story §2 palettes + §3 blocking. Same law as part 1's shots:
// every painter a pure fn of (world g, real film t); warp() pins world g during
// the S9/S10 stops (dust, wheels, flames freeze with the picture); spark rings,
// shake and the snap zoom age on REAL t; seeded hash only; props derive from
// owner transforms (wig, mech arm, mop, seed, the single hair).

// hex mix for the palette slides (storm dusk beats, dawn cracks)
const mixHex = (a, b, u) => {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (sh) => Math.round(((pa >> sh) & 255) + (((pb >> sh) & 255) - ((pa >> sh) & 255)) * cl(u))
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`
}
// night copy of a day bake (S6 storm wall). Three offset copies union-fill the
// puff gaps (a hole used to show sky through the mass), then a cool+darken
// alpha-kept pass, then soft L/R/top edge fades so no canvas seam ever shows.
function stormNightBake(cnv) {
  const c = A.canvas(cnv.width, cnv.height)
  const x = c.getContext('2d')
  x.drawImage(cnv, 0, 0)
  x.drawImage(cnv, -66, 40)
  x.drawImage(cnv, 52, -34)
  x.drawImage(cnv, -20, -54)
  x.globalCompositeOperation = 'source-atop'
  x.fillStyle = 'rgba(38,52,82,0.6)'
  x.fillRect(0, 0, c.width, c.height)
  x.fillStyle = 'rgba(10,14,26,0.38)'
  x.fillRect(0, 0, c.width, c.height)
  x.globalCompositeOperation = 'destination-in'
  const fade = (x0, y0, x1, y1) => {
    const gr = x.createLinearGradient(x0, y0, x1, y1)
    gr.addColorStop(0, 'rgba(0,0,0,0)')
    gr.addColorStop(1, 'rgba(0,0,0,1)')
    x.fillStyle = gr
    x.fillRect(0, 0, c.width, c.height)
  }
  fade(0, 0, 320, 0) // left edge
  x.globalCompositeOperation = 'destination-in'
  const flip = x.createLinearGradient(c.width, 0, c.width - 320, 0)
  flip.addColorStop(0, 'rgba(0,0,0,0)')
  flip.addColorStop(1, 'rgba(0,0,0,1)')
  x.fillStyle = flip
  x.fillRect(0, 0, c.width, c.height)
  x.globalCompositeOperation = 'destination-in'
  const top = x.createLinearGradient(0, 0, 0, 260)
  top.addColorStop(0, 'rgba(0,0,0,0)')
  top.addColorStop(1, 'rgba(0,0,0,1)')
  x.fillStyle = top
  x.fillRect(0, 0, c.width, c.height)
  x.globalCompositeOperation = 'source-over'
  return c
}
// the dune bakes carry a darker column at their right edge (~last 8 px), which
// mirrored tiling exposes as a 1px scroll seam at far-band speed. Overwrite
// both edge strips with clean interior columns (10px repetition is invisible
// in dithered dunes; mirror continuity at tile boundaries is preserved).
function duneEdgeRepair(cnv) {
  const x = cnv.getContext('2d')
  const h = cnv.height
  x.drawImage(cnv, 14, 0, 12, h, 0, 0, 12, h) // left edge <- interior
  x.drawImage(cnv, cnv.width - 26, 0, 12, h, cnv.width - 12, 0, 12, h) // right edge <- interior
}
// flat silhouette copy (lightning rim)
function flatCopy(cnv, col) {
  const c = A.canvas(cnv.width, cnv.height)
  const x = c.getContext('2d')
  x.drawImage(cnv, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = col
  x.fillRect(0, 0, c.width, c.height)
  return c
}
// headlight / lamp cone (in-scene light, S6)
function lightCone(ctx, x0, y0, dir, len, spread, a) {
  const gr = ctx.createLinearGradient(x0, y0, x0 + dir * len, y0)
  gr.addColorStop(0, `rgba(240,228,190,${a})`)
  gr.addColorStop(1, 'rgba(240,228,190,0)')
  ctx.fillStyle = gr
  ctx.beginPath()
  ctx.moveTo(x0, y0 - 6)
  ctx.lineTo(x0 + dir * len, y0 - spread)
  ctx.lineTo(x0 + dir * len, y0 + spread)
  ctx.lineTo(x0, y0 + 6)
  ctx.closePath()
  ctx.fill()
}

// ------------------------------ S6 — THE STORM ------------------------------
// NIGHT: orange dies in two beats, the wall swallows the rig, the TUMBLEWIG
// gag, the blue eye with wheels dutifully spinning, the Green Place tale,
// dawn cracks the storm behind. ZERO screen flashes — bolts are in-scene.
const STORM_STAGE = { rigX: 1150, rigGY: 900, purGY: 908 }
// hash-spaced bolt times (pure table); each bolt lives 0.22 s of world time
const S6_BOLTS = [0.55, 1.3, 1.95, 2.55, 3.0, 3.42, 3.88, 4.3].map((g0, i) => g0 + hash(i * 13 + 5) * 0.18)
const boltAge = (g) => {
  for (let i = 0; i < S6_BOLTS.length; i++) {
    const age = g - S6_BOLTS[i]
    if (age >= 0 && age < 0.22) return { i, age }
  }
  return null
}

function drawStorm(ctx, lt, t) {
  const g = lt
  const beat1 = seg(g, 0.0, 0.8)
  const beat2 = seg(g, 0.8, 1.7)
  const indigo = cl(beat1 * 0.55 + beat2 * 0.45) // the two-beat grade slide
  const dawn = seg(g, 6.6, 8.1)
  const bolt = boltAge(g)
  const [shx, shy] = shakeXY(t, (g > STORM_EV.into && g < STORM_EV.calm ? 2.0 : 0.7) + (bolt ? 1.5 * (1 - bolt.age / 0.22) : 0))
  cam(ctx, 1 + 0.03 * seg(g, STORM_EV.stormwall, STORM_EV.into), 960, 560, shx, shy)
  bgWash(ctx, [
    [0, mixHex('#3a2418', '#0a101e', indigo)],
    [0.5, mixHex('#8a4a28', '#141c30', indigo)],
    [0.82, mixHex('#d98a4a', '#24314f', indigo)],
    [1, mixHex('#f2c98a', '#31446b', Math.max(indigo, dawn))],
  ])
  // world drift: the eye nearly stops the world; the wheels do NOT (the gag).
  // Both from closed forms of g — no state, freeze-safe.
  const drift = 300 * Math.min(g, STORM_EV.calm) + 26 * Math.max(0, g - STORM_EV.calm)
  const wheelS = 300 * Math.min(g, STORM_EV.calm) + 150 * Math.max(0, g - STORM_EV.calm)
  parallaxDunes(ctx, drift * PARALLAX.farDunes, drift * PARALLAX.midDunes, 900, { night: true })
  const x0 = -mod(drift, 2560)
  for (let tx = x0 - 2560; tx < W + OS; tx += 2560) ctx.drawImage(S.highway, tx, 900 - S.highway.groundY)
  // one warm pixel alive until the plunge: the doof's flame, far behind
  if (g > 1.0 && g < 4.9) {
    const fl = 0.5 + 0.5 * hash(Math.floor(g * 11) + 3)
    const fade = 1 - seg(g, 4.4, 4.9)
    ctx.globalAlpha = fade
    const fg = ctx.createRadialGradient(150, 662, 1, 150, 662, 26)
    fg.addColorStop(0, `rgba(232,106,30,${0.5 * fl})`)
    fg.addColorStop(1, 'rgba(232,106,30,0)')
    ctx.fillStyle = fg
    ctx.fillRect(124, 636, 52, 52)
    ctx.fillStyle = '#ffc23c'
    ctx.fillRect(148, 660, 2 + fl * 2, 3)
    ctx.globalAlpha = 1
  }
  // ---- the storm wall: ONE mass enters from the right at stormwall and
  // swells as we close; an inside-storm wash darkens the plunge; the mass
  // splits (overlap-faded halves) for the eye; recedes warm at dawn. ----
  const sweep = seg(g, STORM_EV.stormwall - 0.5, STORM_EV.into + 0.2)
  const eyeSplit = E.outCubic(seg(g, STORM_EV.calm, STORM_EV.calm + 1.0))
  const wallA = 1 - 0.85 * dawn
  const churn = inStormChurn(g)
  const insideA = 0.5 * seg(sweep, 0.78, 1) * (1 - eyeSplit * 0.85) * (1 - dawn)
  if (insideA > 0.01) {
    // we are IN the wall: the whole sky sinks into it (the rig stays readable)
    ctx.fillStyle = `rgba(14,20,34,${insideA})`
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  }
  const wallX = lerp(1900, -640, E.inQuad(sweep)) + churn
  if (wallA > 0.04) {
    ctx.globalAlpha = wallA
    ctx.imageSmoothingEnabled = true
    const wh = lerp(1020, 1560, cl(sweep)) // swells as it closes
    const ww = wh * (1200 / 1080) // keep the bake's aspect
    const wy = 1005 - wh
    if (eyeSplit <= 0.01) {
      ctx.drawImage(S.stormNight, wallX, wy, ww, wh)
    } else {
      // the eye opens: two pieces part, 40 source px overlap at the seam
      const half = Math.round((620 / 1200) * ww)
      const ov = Math.round((40 / 1200) * ww)
      const lx = wallX - 220 * eyeSplit - 1500 * eyeSplit
      const rx = lerp(wallX + ww - half, 1170, eyeSplit) + 2100 * dawn
      ctx.drawImage(S.stormNight, 0, 0, 620, 1080, lx, wy, half, wh)
      ctx.drawImage(S.stormNight, 580, 0, 620, 1080, rx - ov, wy, half + ov, wh)
    }
    ctx.globalAlpha = 1
  }
  // ---- the pursuers peel away one by one (they fear it) ----
  for (let i = 2; i >= 0; i--) {
    const t0 = 1.75 + i * 0.38
    const peel = seg(g, t0, t0 + 1.15)
    if (peel >= 1) continue
    const px = 430 - i * 205 - 760 * peel * peel
    const facing = px + 380 // headlight swings as they bail
    const flip = seg(g, t0 + 0.4, t0 + 0.75)
    ctx.save()
    ctx.globalAlpha = 1 - peel * 0.45
    shadow(ctx, px, STORM_STAGE.purGY + 4, 120, 12, 0.2)
    ctx.translate(px, STORM_STAGE.purGY)
    ctx.scale(1 - 1.9 * flip, 1)
    ART.drawCar(ctx, S.carPlain, 0, 0, { bob: 2 + Math.sin(t * 9 + i) * 1.4, pitch: -0.8 - peel * 1.4, wheel: (drift / (26 * 1.6 * TAU)) % 1 })
    ctx.restore()
    if (flip < 0.6) lightCone(ctx, facing - 130, STORM_STAGE.purGY - 52, 1, 330, 60, 0.16)
  }
  // ---- the rig (lights on) ----
  const rigX = STORM_STAGE.rigX, rigGY = STORM_STAGE.rigGY
  shadow(ctx, rigX, rigGY + 5, 560, 22, 0.3)
  ART.drawRig(ctx, S.rig, rigX, rigGY, {
    bob: 2 + Math.sin(t * 6.4) * 1.6, pitch: 0.4, wheel: (wheelS / CHASE_STAGE.wheelRevRig) % 1,
  })
  // cab lamps + cone; small amber tail mark
  lightCone(ctx, rigX + 540, rigGY - 240, 1, 460, 84, 0.2)
  ctx.fillStyle = 'rgba(240,228,190,0.85)'
  ctx.fillRect(rigX + 536, rigGY - 248, 6, 4)
  ctx.fillStyle = 'rgba(232,150,60,0.8)'
  ctx.fillRect(rigX - 640, rigGY - 250, 5, 3)
  // lightning: bolt inside the mass + in-scene radial light + rim silhouette
  if (bolt && wallA > 0.1) {
    const bx = Math.max(-80, Math.min(1860, wallX + 420 + hash(bolt.i * 7 + 2) * 1000))
    const by = 180 + hash(bolt.i * 5 + 9) * 420
    ART.stormBolt(ctx, bx, by, g, bolt.i * 3 + 5)
    const k = 1 - bolt.age / 0.22
    const glow = ctx.createRadialGradient(bx, by + 120, 20, bx, by + 120, 640)
    glow.addColorStop(0, `rgba(224,234,250,${0.34 * k})`)
    glow.addColorStop(0.5, `rgba(154,166,190,${0.14 * k})`)
    glow.addColorStop(1, 'rgba(154,166,190,0)')
    ctx.fillStyle = glow
    ctx.fillRect(bx - 660, -200, 1320, 1400)
    // everything front-lit goes silhouette for the bolt's life
    ctx.globalAlpha = 0.55 * k
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(S.rigDark, rigX - S.rig.width / 2, rigGY - S.rig.height + 2)
    ctx.globalAlpha = 1
  }
  // ---- the plunge: horizontal dust streaks at 1.2x ----
  if (g > 2.8 && g < 4.9) {
    for (let i = 0; i < 30; i++) {
      const y = 250 + hash(i * 7 + 2) * 620
      const xx = W + OS - mod(drift * PARALLAX.stormStreak * 2.3 + hash(i * 5) * 2300, W + OS * 2 + 420) - 210
      const len = 90 + hash(i * 11) * 170
      ctx.strokeStyle = `rgba(122,139,163,${0.14 + 0.2 * hash(i * 17)})`
      ctx.lineWidth = 1.6 + hash(i) * 2.2
      ctx.beginPath()
      ctx.moveTo(xx, y)
      ctx.lineTo(xx + len, y + 2)
      ctx.stroke()
    }
  }
  // ---- THE TUMBLEWIG — the film's best wind gag bounces past the windshield ----
  const tu = seg(g, STORM_EV.into + 0.1, STORM_EV.calm - 0.3)
  if (tu > 0 && tu < 1) {
    const tx2 = lerp(2080, -380, tu)
    const ty = 600 - Math.abs(Math.sin(tu * Math.PI * 3.1)) * 200 * (1 - tu * 0.35)
    ctx.save()
    ctx.translate(tx2, ty)
    ctx.rotate(tu * 9.5)
    ctx.scale(0.74, 0.74)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.wigTumble[Math.min(8, Math.floor(tu * 9))], -102, -76)
    ctx.restore()
  }
  // ---- the eye: quiet wheel beat, then the Green Place tale ----
  if (g >= STORM_EV.calm - 0.4) {
    // Flowiosa at the cab doorway, gesturing at the horizon (the tale)
    const cabX = rigX + 500, cabFeet = rigGY - 440 + 150 * 1.7
    const tell = seg(g, STORM_EV.tale, STORM_EV.tale + 0.7)
    sprite(ctx, S.cast.flowiosa, cabX, cabFeet, {
      sx: 1.55, sy: 1.55, ...stand, lean: -0.05 - 0.06 * Math.sin(tell * Math.PI),
    })
    if (tell > 0 && tell < 1) {
      // the pointing arm sweeps once toward the horizon
      ctx.strokeStyle = '#26282c'
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(cabX + 12, cabFeet - 108)
      ctx.quadraticCurveTo(cabX + 90, cabFeet - 150 - 40 * Math.sin(tell * Math.PI), cabX + 150 + 60 * Math.sin(tell * Math.PI), cabFeet - 170 - 60 * Math.sin(tell * Math.PI))
      ctx.stroke()
    }
    // Nux reverent at the wheel: pale head in the windshield slit
    sprite(ctx, S.cast.nux, 1636, 612, { sx: 0.75, sy: 0.75, lift: [1, 0] })
  }
  // ---- dawn cracks the storm behind ----
  if (dawn > 0) {
    const dg = ctx.createLinearGradient(0, 560, 0, 760)
    dg.addColorStop(0, 'rgba(138,136,116,0)')
    dg.addColorStop(0.6, `rgba(168,154,120,${0.5 * dawn})`)
    dg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = dg
    ctx.fillRect(-OS, 540, W + OS * 2, 240)
  }
  ctx.restore()
}
// churn wobble while inside the wall (pure fn of g)
function inStormChurn(g) {
  const u = seg(g, STORM_EV.into, STORM_EV.calm)
  return u > 0 && u < 1 ? Math.sin(g * 7) * 26 * (1 - u) : 0
}

// ------------------------------ S7 — THE GREEN PLACE ------------------------------
// Grey-green dawn, hope's corpse: raked bald mud, the sign, the grannies, three
// bald crows, the last seeds, the despair beat. No gags after E36. No gold.
const GP = { GY: 896, rigX: 1150, rigGY: 900, blindX: 560, bikeX: 396 }
const GP_TREES = [[240, 128], [368, 96], [478, 142], [1832, 104], [1908, 122]] // kept clear of the parked rig
const GP_CROWS = [[368, 96], [478, 84], [1832, 108]] // perch (tree x, height off the mud)
function deadTree(ctx, x, baseY, h, seed) {
  ctx.strokeStyle = '#241a12'
  ctx.lineCap = 'round'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(x, baseY)
  ctx.quadraticCurveTo(x + (hash(seed) - 0.5) * 20, baseY - h * 0.5, x + (hash(seed + 3) - 0.5) * 34, baseY - h)
  ctx.stroke()
  for (let b = 0; b < 3; b++) {
    const by = baseY - h * (0.45 + b * 0.18)
    const dir = b % 2 ? 1 : -1
    ctx.lineWidth = 3.4 - b * 0.7
    ctx.beginPath()
    ctx.moveTo(x, by)
    ctx.quadraticCurveTo(x + dir * 16, by - 12, x + dir * (26 + hash(seed + b) * 20), by - 20 - hash(seed + b * 2) * 18)
    ctx.stroke()
  }
}
function baldCrow(ctx, x, y, flap, s) {
  // molted: two wing arcs + a body dot, NO tail feathers
  ctx.strokeStyle = '#151009'
  ctx.lineWidth = 2.6 * s
  ctx.lineCap = 'round'
  const w = 9 * s * (0.4 + Math.abs(flap))
  ctx.beginPath()
  ctx.moveTo(x - w, y - flap * 5 * s)
  ctx.quadraticCurveTo(x, y - 2 * s, x + w, y - flap * 5 * s)
  ctx.stroke()
  ctx.fillStyle = '#151009'
  ctx.beginPath()
  ctx.arc(x, y, 2.6 * s, 0, TAU)
  ctx.fill()
}
// the grannies' tiny shared motorbike + sidecar (painted; riders drawn by caller)
function grannyBike(ctx, x, gy, facing, spin) {
  ctx.save()
  ctx.translate(x, gy)
  ctx.scale(facing, 1)
  const wr = 13
  ctx.strokeStyle = '#151009'
  ctx.lineWidth = 3.4
  for (const wx of [-24, 30]) {
    ctx.beginPath()
    ctx.arc(wx, -wr, wr, 0, TAU)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(-24, -wr)
  ctx.lineTo(-4, -36)
  ctx.lineTo(24, -30)
  ctx.lineTo(30, -wr)
  ctx.moveTo(-4, -36)
  ctx.lineTo(2, -14)
  ctx.stroke()
  ctx.fillStyle = '#3a2a18'
  ctx.fillRect(-14, -42, 16, 5)
  ctx.strokeStyle = '#454a52'
  ctx.lineWidth = 2.6
  ctx.beginPath()
  ctx.moveTo(24, -30)
  ctx.lineTo(30, -46)
  ctx.stroke()
  ctx.fillStyle = '#4a3826'
  ctx.fillRect(-66, -34, 36, 24)
  ctx.strokeStyle = '#151009'
  ctx.lineWidth = 2
  ctx.strokeRect(-66, -34, 36, 24)
  ctx.beginPath()
  ctx.moveTo(-30, -14)
  ctx.lineTo(-24, -wr)
  ctx.stroke()
  ctx.strokeStyle = '#8e8b78'
  ctx.lineWidth = 1.6
  for (const wx of [-24, 30])
    for (let sp = 0; sp < 3; sp++) {
      const a = spin * TAU + (sp / 3) * TAU
      ctx.beginPath()
      ctx.moveTo(wx + Math.cos(a) * 3, -wr + Math.sin(a) * 3)
      ctx.lineTo(wx + Math.cos(a) * (wr - 4), -wr + Math.sin(a) * (wr - 4))
      ctx.stroke()
    }
  ctx.restore()
}
function drawGreenplace(ctx, lt, t) {
  const g = lt
  const reveal = seg(g, 0.3, 1.5) // the storm cracks into grey light
  const despairPush = 1 + 0.06 * seg(g, GREENPLACE_EV.despair + 0.3, GREENPLACE_EV.despair + 1.4) // push to her eyes
  cam(ctx, despairPush, lerp(960, 1600, seg(g, GREENPLACE_EV.despair + 0.3, GREENPLACE_EV.despair + 1.4)), lerp(560, 520, seg(g, GREENPLACE_EV.despair + 0.3, GREENPLACE_EV.despair + 1.4)), ...shakeXY(t, 0.6))
  bgWash(ctx, [[0, '#4a545a'], [0.42, '#6a7266'], [0.72, '#8a8874'], [1, '#a89a78']]) // sage dawn, NO gold
  // last storm wisps recede upper-left
  const wisp = 1 - seg(g, 0.2, 2.2)
  if (wisp > 0) {
    ctx.globalAlpha = wisp * 0.55
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(S.stormNight, -900 - wisp * 300, -420, 1100, 1100)
    ctx.globalAlpha = 1
  }
  // the flats (rake-marks baked into the mud strip — the saddest gag)
  const mudY = GP.GY - S.mud.groundY
  for (let tx = -mod(0, 2560) - 2560; tx < W + OS; tx += 2560) ctx.drawImage(S.mud, tx, mudY)
  // horizon haze + 5 dead trees
  ctx.fillStyle = 'rgba(138,136,116,0.35)'
  ctx.fillRect(-OS, 700, W + OS * 2, 34)
  GP_TREES.forEach(([x, h], i) => deadTree(ctx, x, 742, h, i * 7 + 1))
  // ---- the parked rig (where S6 left it) + the wives' window ----
  const rigX = GP.rigX, rigGY = GP.rigGY
  shadow(ctx, rigX, rigGY + 5, 560, 22, 0.28)
  ART.drawRig(ctx, S.rig, rigX, rigGY, { bob: 0.8 + Math.sin(t * 1.6) * 0.8, wheel: 0 })
  const deckY = rigGY - 440 + 68
  // Remy small on the deck, the wives at the cab window
  sprite(ctx, S.shear[12], rigX - 120, deckY, { sx: 2.2, sy: 2.2, ...stand })
  const winRect = [rigX - 646 + 560 * 1.7, rigGY - 440 + 52 * 1.7, 44 * 1.7, 44 * 1.7]
  ctx.fillStyle = '#10141a'
  ctx.fillRect(...winRect)
  sprite(ctx, S.cast.wifeVeil, winRect[0] + 34, winRect[1] + winRect[3] + 12, { sx: 0.8, sy: 0.8, lift: [1, 0] })
  ctx.strokeStyle = '#454a52'
  ctx.lineWidth = 3
  ctx.strokeRect(...winRect)
  // the half-buried sign — the one man-made colour, pointing at nothing
  // (foreground: the parked rig hides the horizon line otherwise)
  ctx.save()
  ctx.translate(1300, 902)
  ctx.rotate(0.12)
  ctx.fillStyle = '#5a4632'
  ctx.fillRect(-6, -62, 10, 74) // post, sunk
  ctx.fillStyle = '#7a3020' // faded paint = the colour
  ctx.fillRect(-96, -110, 194, 52)
  ctx.strokeStyle = '#241a12'
  ctx.lineWidth = 2.6
  ctx.strokeRect(-96, -110, 194, 52)
  graffiti(ctx, 'GREEN PLACE', -2, -88, 27, '#e0c8a8', 0)
  graffiti(ctx, '->', 76, -86, 29, '#e0c8a8', 0.1)
  ctx.restore()
  // ---- the mud blind + the VUVALINI rise (far rigs, depth discipline) ----
  ctx.fillStyle = '#33271c'
  ctx.beginPath()
  ctx.ellipse(GP.blindX, 866, 190, 44, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#3a2c20'
  ctx.beginPath()
  ctx.ellipse(GP.blindX, 858, 150, 30, 0, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = 'rgba(138,120,88,0.5)' // crusted rim so the blind reads
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.ellipse(GP.blindX, 858, 150, 30, 0, Math.PI * 1.1, Math.PI * 1.9)
  ctx.stroke()
  const rise = E.outCubic(seg(g, GREENPLACE_EV.vuv, GREENPLACE_EV.vuv + 0.9))
  if (rise > 0) {
    const gy1 = lerp(906, 856, rise)
    // granny 1 (46): cork-plugged shotgun
    sprite(ctx, S.cast.vuvalini1, GP.blindX - 46, gy1, { sx: 2.1, sy: 2.1, lift: [2, 0], lean: 0.04 * Math.sin(t * 1.4) })
    ctx.strokeStyle = '#26282e'
    ctx.lineWidth = 4.4
    ctx.beginPath()
    ctx.moveTo(GP.blindX - 30, gy1 - 120)
    ctx.lineTo(GP.blindX - 74, gy1 - 196)
    ctx.stroke()
    ctx.fillStyle = '#8a6f48'
    ctx.beginPath()
    ctx.arc(GP.blindX - 76, gy1 - 199, 5, 0, TAU)
    ctx.fill() // the cork
    // granny 2 (83): knitting-needle shotgun
    sprite(ctx, S.cast.vuvalini2, GP.blindX + 48, gy1 + 4, { sx: 2.1, sy: 2.1, lift: [2, 0], lean: -0.04 * Math.sin(t * 1.4) })
    ctx.strokeStyle = '#26282e'
    ctx.lineWidth = 4.4
    ctx.beginPath()
    ctx.moveTo(GP.blindX + 34, gy1 - 112)
    ctx.lineTo(GP.blindX + 80, gy1 - 190)
    ctx.stroke()
    ctx.strokeStyle = '#cfd6de'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(GP.blindX + 80, gy1 - 190)
    ctx.lineTo(GP.blindX + 108, gy1 - 224)
    ctx.stroke() // the needle
  }
  grannyBike(ctx, GP.bikeX, 872, 1, 0)
  // ---- three bald crows lift at gone ----
  GP_CROWS.forEach(([cx0, cy0], i) => {
    const age = g - (GREENPLACE_EV.gone + i * 0.18)
    if (age < 0) {
      baldCrow(ctx, cx0 + 14, 742 - cy0, Math.sin(t * 3 + i) * 0.3, 1)
      return
    }
    baldCrow(ctx, cx0 + 14 + 70 * age, 742 - cy0 - 90 * age - 30 * age * age, Math.sin(age * 18), 1)
  })
  // ---- the arm sweep: THE GREEN PLACE IS GONE ----
  const sweep = seg(g, GREENPLACE_EV.gone, GREENPLACE_EV.gone + 0.7)
  if (sweep > 0 && sweep < 1 && rise >= 1) {
    const sw = Math.sin(sweep * Math.PI)
    ctx.strokeStyle = '#26282e'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(GP.blindX - 46 + 12, 856 - 118)
    ctx.quadraticCurveTo(GP.blindX + 60, 856 - 190 - 50 * sw, GP.blindX + 40 + 560 * sw, 856 - 120 - 60 * sw)
    ctx.stroke()
  }
  // ---- the pouch opens: the LAST FOLLICLE SEEDS ----
  if (g > GREENPLACE_EV.seeds - 0.4) {
    const open = seg(g, GREENPLACE_EV.seeds - 0.4, GREENPLACE_EV.seeds)
    ctx.save()
    ctx.translate(GP.blindX + 118, 852)
    ctx.scale(1.15, 1.15)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.pouch, -20, -18)
    ctx.restore()
    const seeds = REPAINT_SHARED.seed.seeds
    for (let i = 0; i < 8; i++) {
      const u = seg(g, GREENPLACE_EV.seeds + i * 0.06, GREENPLACE_EV.seeds + i * 0.06 + 0.7)
      if (u <= 0 || u >= 1) continue
      const sxp = GP.blindX + 130 + (i - 4) * 20 * u
      const syp = 848 - Math.sin(u * Math.PI) * 54 - 10 * u
      ctx.fillStyle = seeds[i % 3]
      ctx.beginPath()
      ctx.ellipse(sxp, syp, 3, 1.8, 0.5, 0, TAU)
      ctx.fill()
    }
    void open
  }
  // ---- the despair beat: Flowiosa walks to the hood and sits. No gags. ----
  if (g >= GREENPLACE_EV.despair - 0.6) {
    const walk = seg(g, GREENPLACE_EV.despair - 0.6, GREENPLACE_EV.despair + 0.35)
    const noseX = rigX + 544
    if (walk < 1) {
      sprite(ctx, S.cast.flowiosa, lerp(rigX + 470, noseX - 26, walk), lerp(deckY + 8, 656, walk), {
        sx: 2.1, sy: 2.1, ...walkCyc(g * 7, 4), lean: -0.03,
      })
    } else {
      // sits on the nose, grease-paint eyes at camera, breathing only
      sprite(ctx, S.cast.flowiosa, noseX - 26, 656 + Math.sin(t * 1.1) * 1.4, { sx: 2.1, sy: 2.1, ...stand })
    }
  }
  ctx.restore()
}

// ------------------------------ S8 — THE TURN ------------------------------
// Nine words, then the whole caravan pivots in one synchronized skid — except
// the grannies' bike, whose three-point turn takes twice as long and still
// finishes first. Gold rim-light crawls up during the turn; full send at lens.
const TURN_STAGE = { GY: 896, rigX: 1150, rigGY: 896, bikeX: 560, bikeGY: 944 }
const s8TurnU = (g) => seg(g, TURN_EV.uturn + 0.2, TURN_EV.uturn + 0.85)
const s8RigSx = (g) => (g < TURN_EV.uturn + 0.2 ? 1 : g < TURN_EV.uturn + 0.85 ? Math.cos(Math.PI * s8TurnU(g)) : -1)
const s8RigX = (g) => (g < TURN_EV.fullsend ? TURN_STAGE.rigX : TURN_STAGE.rigX - 55 * Math.pow(g - TURN_EV.fullsend, 2.5))
const s8BikeX = (g) => {
  if (g < 3.1) return TURN_STAGE.bikeX
  if (g < 3.7) return TURN_STAGE.bikeX + 70 * seg(g, 3.1, 3.7)
  if (g < 4.4) return TURN_STAGE.bikeX + 70 - 92 * seg(g, 3.7, 4.4)
  if (g < 5.05) return TURN_STAGE.bikeX - 22 + 52 * seg(g, 4.4, 5.05)
  return TURN_STAGE.bikeX + 30 - 170 * Math.pow(g - TURN_EV.fullsend, 2)
}
const s8BikeSx = (g) => {
  if (g < 3.1) return 1
  if (g < 3.7) return lerp(1, 0.35, seg(g, 3.1, 3.7))
  if (g < 4.4) return lerp(0.35, -0.35, seg(g, 3.7, 4.4))
  if (g < 5.05) return lerp(-0.35, -1, seg(g, 4.4, 5.05))
  return -1
}
// Remy: the pause, then he walks to the rig and hops the deck at full send
function s8Remy(g) {
  if (g < 3.2) return { x: 880, y: TURN_STAGE.GY, pose: 'stand' }
  if (g < 4.7) {
    const w = seg(g, 3.2, 4.7)
    return { x: lerp(880, 1058, w), y: TURN_STAGE.GY, pose: 'walk' }
  }
  if (g < 5.2) {
    const u = seg(g, 4.7, 5.2)
    return { x: lerp(1058, 1104, u), y: lerp(TURN_STAGE.GY, TURN_STAGE.rigGY - 440 + 68, u) - Math.sin(u * Math.PI) * 150, pose: 'air' }
  }
  return { x: 1104, y: TURN_STAGE.rigGY - 440 + 68, pose: 'deck' }
}
function drawTurn(ctx, lt, t) {
  const g = lt
  const send = seg(g, TURN_EV.fullsend, TURN_EV.fullsend + 2.0)
  const sendOff = 1500 * Math.pow(cl(send), 1.8) // world rushes right under a leftward run
  const [shx, shy] = shakeXY(t, 0.7 + send * 2.6)
  cam(ctx, 1 + 0.07 * cl(send), 960, 560, shx, shy)
  bgWash(ctx, [[0, mixHex('#4a545a', '#3a2418', cl(send + seg(g, 0, 1.3) * 0.4))], [0.5, mixHex('#7a7a68', '#8a4a28', cl(send + 0.2))], [1, mixHex('#a89a78', '#d98a4a', cl(send + 0.2))]])
  // the flats again; parallax reverses as the run flips the film's vector
  parallaxDunes(ctx, -sendOff * PARALLAX.farDunes, -sendOff * PARALLAX.midDunes, 900)
  for (let tx = mod(-sendOff, 2560) - 2560; tx < W + OS; tx += 2560) ctx.drawImage(S.mud, tx, TURN_STAGE.GY - S.mud.groundY)
  drawDust(ctx, S.dust.s8, g, { scale: 1.3 })
  const rimA = seg(g, TURN_EV.uturn, TURN_EV.uturn + 2.0) * 0.55 // warming gold rim
  // ---- the rig: parked -> skid pivot -> full send (flipped, accelerating) ----
  const rigX = s8RigX(g), sxr = s8RigSx(g)
  shadow(ctx, rigX, TURN_STAGE.rigGY + 5, 560, 22, 0.28)
  ctx.save()
  ctx.translate(rigX, TURN_STAGE.rigGY)
  ctx.scale(sxr, 1)
  ART.drawRig(ctx, S.rig, 0, 0, {
    bob: 1.4 + Math.sin(t * 5) * 1.2 + send * 2.4,
    pitch: s8TurnU(g) > 0 && s8TurnU(g) < 1 ? 1.8 * Math.sin(s8TurnU(g) * Math.PI) : -send * 1.4,
    wheel: (Math.max(0, g - TURN_EV.uturn) * 160 / CHASE_STAGE.wheelRevRig) % 1,
  })
  if (rimA > 0) {
    ctx.strokeStyle = `rgba(232,197,106,${rimA})`
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(-300, -372) // cab roofline
    ctx.lineTo(-52, -372)
    ctx.moveTo(-556, -430) // tanker walkway
    ctx.lineTo(-160, -430)
    ctx.stroke()
  }
  // the wives' window rides the rig's transform (they flip with it)
  const winRect = [-646 + 560 * 1.7, -440 + 52 * 1.7, 44 * 1.7, 44 * 1.7]
  if (g < TURN_EV.fullsend + 0.4) {
    ctx.fillStyle = '#10141a'
    ctx.fillRect(...winRect)
    sprite(ctx, S.cast.wifeSeed, winRect[0] + 34, winRect[1] + winRect[3] + 12, { sx: 0.8, sy: 0.8, lift: [1, 0] })
    ctx.strokeStyle = '#454a52'
    ctx.lineWidth = 3
    ctx.strokeRect(...winRect)
  }
  ctx.restore()
  // skid arcs under the pivot
  const sk = s8TurnU(g)
  if (sk > 0 && sk < 1) {
    ctx.strokeStyle = `rgba(36,26,18,${0.5 * Math.sin(sk * Math.PI)})`
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.ellipse(rigX, TURN_STAGE.rigGY - 4, 240 * sk + 60, 12, 0, Math.PI * (sxr > 0 ? 0.1 : 0.6), Math.PI * (sxr > 0 ? 0.9 : 1.4))
    ctx.stroke()
  }
  // ---- the grannies' three-point turn (takes twice as long, arrives first) ----
  const bikeX = s8BikeX(g), bSx = s8BikeSx(g)
  shadow(ctx, bikeX, TURN_STAGE.bikeGY + 3, 70, 8, 0.24)
  grannyBike(ctx, bikeX, TURN_STAGE.bikeGY, bSx < 0 ? -1 : 1, (Math.abs(g) * 4) % 1)
  const bFace = bSx < 0 ? -1 : 1
  sprite(ctx, S.cast.vuvalini1, bikeX + 4 * bFace, TURN_STAGE.bikeGY - 38, { sx: 1.35, sy: 1.35, lift: [2, 0], lean: 0.1 * bFace })
  sprite(ctx, S.cast.vuvalini2, bikeX - 48 * bFace, TURN_STAGE.bikeGY - 32, { sx: 1.3, sy: 1.3, lift: [2, 0], flip: bSx < 0 })
  // ---- REMY: the pause; everyone waiting for the man of few words ----
  const rm = s8Remy(g)
  const rmFlip = rm.pose === 'deck' ? -1 : 1 // he rides the flipped rig after the turn
  sprite(ctx, S.shear[12], rm.x, rm.y, {
    sx: rm.pose === 'deck' ? 2.2 : 2.6, sy: rm.pose === 'deck' ? 2.2 : 2.6,
    ...(rm.pose === 'walk' ? walkCyc(g * 7, 4) : rm.pose === 'air' ? { lift: [5, 5] } : stand),
    flip: rmFlip < 0, lean: rm.pose === 'stand' ? 0.02 * Math.sin(t * 1.3) : 0.04,
  })
  // ---- FULL SEND: dust wall rising, scrub at 1.55, hard cut at speed ----
  if (send > 0) {
    for (let i = 0; i < 5; i++) {
      const u = cl(send * 1.4 - i * 0.12)
      if (u <= 0) continue
      ctx.globalAlpha = 0.7 * u
      ctx.imageSmoothingEnabled = true
      const w = S.plumeDay.width * (1.1 + u * 1.2)
      const h = S.plumeDay.height * (1.1 + u * 1.2)
      ctx.drawImage(S.plumeDay, rigX + 330 + i * 60 - w / 2, TURN_STAGE.rigGY - h * 0.86 - u * 60, w, h)
    }
    ctx.globalAlpha = 1
    scrubLayer(ctx, -sendOff * PARALLAX.scrub, 962)
  } else {
    scrubLayer(ctx, 0, 962)
  }
  ctx.restore()
}

// ------------------------------ S9 — THE RETURN (money shot) ------------------------------
// Head-on convergence; podium closes 1400->260 eased .85, alongside at g6.0;
// pole-cat vaults with 15% squash boings + the sidecar knitting gag; the WIG
// RIP freezes the film for 0.30 s; snap zoom on the BALD reveal; the waver.
const RET = { rigX0: 560, rigDrift: 130, rigGY: 908, podGY: 852, purGY: 806, bikeX: 300, bikeGY: 944, IMK: 1.9 }
const retRigX = (g) => RET.rigX0 + RET.rigDrift * seg(g, RETURN_EV.converge, RETURN_EV.alongside)
const retCabX = (g) => retRigX(g) + 544
const podiumRel = (g) => lerp(1400, 260, Math.pow(cl(seg(g, RETURN_EV.converge, RETURN_EV.alongside)), 0.85))
const podNose = (g) => retCabX(g) + podiumRel(g)
// Immortan rides the prow figurehead platform (he never leaves the car)
const immortanAt = (g) => ({ x: podNose(g) + 30, feet: RET.podGY - 250 })
const wigWornAt = (g) => {
  const im = immortanAt(g)
  return { x: im.x, y: im.feet - 250, k: lerp(0.42, 1, seg(g, RETURN_EV.converge + 0.1, 2.6)) }
}
const WIG_PULL = { x: 140, y: 40 } // how far the lunge hauls the wig off the head
const retDeckY = () => RET.rigGY - 440 + 68
// both convoys hang mid-air into the freeze, drop on the resume
const retAir = (g) => 9 * seg(g, 6.8, 7.0) - 9 * seg(g, 7.0, 7.3)
// pole-cat vaults: launch from pursuer i, boing off the tanker, rebound home
function poleVault(g, i) {
  const t0 = RETURN_EV.poles + i * 0.4
  const hit = t0 + 0.55
  const age = g - t0
  if (age < 0 || age > 1.5) return null
  const fromX = 1560 + i * 190
  const tgtX = 1050 + i * 40
  if (g < hit) {
    const u = age / (hit - t0)
    return { x: lerp(fromX, tgtX, u), y: lerp(830, 620, u) - Math.sin(u * Math.PI) * 300, ph: 'in', pole: u, sq: 0 }
  }
  const age2 = g - hit
  if (age2 < 0.14) return { x: tgtX, y: 620, ph: 'sq', pole: 1, sq: 1 - age2 / 0.14 } // the 15% squash boing
  const u2 = (age2 - 0.14) / 1.2
  return { x: lerp(tgtX, 2100, u2), y: 620 - Math.sin(cl(u2) * Math.PI) * 260 + 200 * u2 * u2, ph: 'out', pole: 0, sq: 0 }
}
function drawReturn(ctx, lt, t) {
  const { g, stop, sl } = RETURN.warp(lt)
  const air = retAir(g)
  const baldT = RETURN.filmT(RETURN_EV.bald)
  // snap zoom 1.0->1.12 over 4 frames at the bald reveal, then settles back
  const zoom = 1 + 0.12 * seg(lt, baldT, baldT + 0.07) * (1 - E.outCubic(seg(lt, baldT + 0.25, baldT + 0.75)))
  const [shx, shy] = shakeXY(t, (stop ? 3.4 * (1 - sl / stop.d) : 0) + 1.6 + seg(g, RETURN_EV.converge, RETURN_EV.poles) + 2.4 * (1 - seg(lt, baldT, baldT + 0.3)) * (lt > baldT - 0.05 ? 1 : 0))
  cam(ctx, zoom, 960, 560, shx, shy)
  // full orange, hardest contrast: bleach-hot sky over the road home
  bgWash(ctx, [[0, '#8a3c1c'], [0.5, '#c96a2a'], [0.8, '#e8a04c'], [1, '#f2c98a']])
  const s9 = 1180 * g // closing speed feel: the world screams under both convoys
  parallaxDunes(ctx, s9 * PARALLAX.farDunes, s9 * PARALLAX.midDunes, 762)
  const x0 = -mod(s9, 2560)
  for (let tx = x0 - 2560; tx < W + OS; tx += 2560) ctx.drawImage(S.highway, tx, 900 - S.highway.groundY)
  drawDust(ctx, S.dust.s9a, g, { scale: 1.25 })
  drawDust(ctx, S.dust.s9b, g, { scale: 1.25 })
  // the citadel grows on the horizon for the cut (far silhouette, hazy)
  const cit = seg(g, 10.0, 11.2)
  if (cit > 0) {
    ctx.globalAlpha = 0.55 * cit
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(S.citadel, 150, 500, 330, 257)
    ctx.fillStyle = `rgba(232,160,76,${0.3 * cit})`
    ctx.fillRect(-OS, 690, W + OS * 2, 60)
    ctx.globalAlpha = 1
  }
  // ---- the grannies' sidecar bike, foreground lane (knitting gag lives here) ----
  const bikeBob = Math.sin(t * 8) * 2 + air
  shadow(ctx, RET.bikeX, RET.bikeGY + 4, 80, 9, 0.22)
  grannyBike(ctx, RET.bikeX, RET.bikeGY - bikeBob, 1, (s9 / (13 * TAU)) % 1)
  sprite(ctx, S.cast.vuvalini1, RET.bikeX + 6, RET.bikeGY - 34 - bikeBob, { sx: 1.35, sy: 1.35, lift: [2, 0], lean: 0.09 })
  sprite(ctx, S.cast.vuvalini2, RET.bikeX - 50, RET.bikeGY - 26 - bikeBob, { sx: 1.3, sy: 1.3, lift: [2, 0] })
  // sidecar passengers: polecat A vaults in at poles, B is delivered at poleCatch
  const pcA = g > RETURN_EV.poles + 0.5
  const pcB = g > RETURN_EV.poleCatch + 0.6
  const knit = (who, u0) => {
    if (!who) return
    const kx = RET.bikeX - 48, ky = RET.bikeGY - 26 - bikeBob
    sprite(ctx, S.cast.warboy4, kx, ky - 6, { sx: 1.05, sy: 1.05, lift: [2, 0], flip: true })
    // the needles tick; a tiny hat grows on the passenger
    const ku = cl((g - u0) / 1.0)
    ctx.strokeStyle = '#c9c5b8'
    ctx.lineWidth = 1.8
    for (const dx of [-4, 4]) {
      ctx.beginPath()
      ctx.moveTo(kx + dx, ky - 34)
      ctx.lineTo(kx + dx + Math.sin(t * 14 + dx) * 4, ky - 52)
      ctx.stroke()
    }
    if (ku > 0.3) {
      ctx.fillStyle = '#a03a16'
      ctx.beginPath()
      ctx.arc(kx, ky - 110, 4 + ku * 5, Math.PI, 0)
      ctx.fill()
    }
  }
  knit(pcA, RETURN_EV.poles + 0.6)
  knit(pcB, RETURN_EV.poleCatch + 0.7)
  // ---- OUR RIG: air into the freeze, deck crew, the lunge ----
  const rigX = retRigX(g), rigGY = RET.rigGY - air
  shadow(ctx, rigX, RET.rigGY + 5, 560, 22, 0.3)
  ART.drawRig(ctx, S.rig, rigX, rigGY, {
    bob: 2.2 + Math.sin(t * 7.3) * 1.6, pitch: 0.7, wheel: (s9 / CHASE_STAGE.wheelRevRig) % 1,
  })
  const deckY = retDeckY() - air
  // Remy witnesses from the deck (the one-hand catch below)
  sprite(ctx, S.shear[12], rigX - 120, deckY, { sx: 2.3, sy: 2.3, lift: [2, 0], lean: -0.16 * seg(g, RETURN_EV.poleCatch, RETURN_EV.poleCatch + 0.3) * (1 - seg(g, RETURN_EV.poleCatch + 0.5, RETURN_EV.poleCatch + 0.8)) })
  // wives at the cab window
  const winRect = [rigX - 646 + 552 * 1.7, rigGY - 440 + 46 * 1.7, 56 * 1.7, 58 * 1.7]
  ctx.fillStyle = '#10141a'
  ctx.fillRect(...winRect)
  sprite(ctx, S.cast.wifeToes, winRect[0] + 48, winRect[1] + winRect[3] + 14, { sx: 0.82, sy: 0.82, lift: [2, 0] })
  ctx.strokeStyle = '#454a52'
  ctx.lineWidth = 3
  ctx.strokeRect(...winRect)
  // ---- THE PODIUM CAR: flipped (nose toward us), prow platform, the tyrant ----
  const podA = seg(g, RETURN_EV.converge - 0.4, RETURN_EV.converge + 1.0) // resolves out of the heat haze
  if (podA > 0) {
    const pX = podNose(g), pGY = RET.podGY - air
    ctx.globalAlpha = 0.25 + 0.75 * podA
    shadow(ctx, pX + 300, pGY + 4, 330, 16, 0.28)
    ctx.save()
    ctx.translate(pX + 744, pGY) // flipped 2x: native nose (+372) lands on pX
    ctx.scale(-2, 2)
    ART.drawCar(ctx, S.carPlain, 0, 0, { bob: 2 + Math.sin(t * 7) * 1.4, pitch: -0.7, wheel: (s9 / (26 * 2 * TAU)) % 1 })
    ctx.restore()
    // the prow figurehead platform + strut
    ctx.fillStyle = '#33373f'
    ctx.fillRect(pX - 12, pGY - 262, 130, 12)
    ctx.fillRect(pX + 44, pGY - 250, 14, 250)
    ctx.strokeStyle = '#454a52'
    ctx.lineWidth = 3
    ctx.strokeRect(pX - 12, pGY - 262, 130, 12)
    ctx.globalAlpha = 1
    // IMMORTAN FLOW on the platform — wig first, brightest object a mile off
    const im = immortanAt(g)
    const imFeet = im.feet - air
    const imA = seg(g, RETURN_EV.converge, RETURN_EV.converge + 0.8)
    ctx.globalAlpha = imA
    sprite(ctx, S.cast.immortan, im.x, imFeet, { sx: RET.IMK, sy: RET.IMK, stand, lift: [2, 0], flip: true })
    // bald only AFTER the freeze resumes: at g7.0 exactly the wig is held mid-rip
    const bald = g > RETURN_EV.wigRip
    if (!bald) {
      const w = wigWornAt(g)
      const ripPull = 0.45 * seg(g, 6.6, 7.0) // the lunge hauls it; the freeze holds it mid-rip
      const wg = ctx.createRadialGradient(w.x, w.y, 6, w.x, w.y, 150 * w.k)
      wg.addColorStop(0, `rgba(232,180,90,${0.5 * w.k})`) // warm halo: separates white-on-white
      wg.addColorStop(1, 'rgba(232,180,90,0)')
      ctx.fillStyle = wg
      ctx.fillRect(w.x - 160 * w.k, w.y - 160 * w.k, 320 * w.k, 320 * w.k)
      ctx.save()
      ctx.translate(w.x - WIG_PULL.x * ripPull, w.y - WIG_PULL.y * ripPull)
      ctx.rotate(0.3 * ripPull + Math.sin(t * 13) * 0.02)
      const wk = 1.7 * w.k
      ctx.scale(wk, wk)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(S.wigWornInk, -60, -42, 204, 153) // ink contour, offset low
      ctx.drawImage(S.wigWorn, -60, -45)
      ctx.restore()
    } else {
      // BALD: scalp gleam, mask hangs slack
      const gleam = 0.5 + 0.5 * Math.sin(t * 2.2)
      ctx.strokeStyle = `rgba(244,246,250,${0.5 + 0.3 * gleam})`
      ctx.lineWidth = 2.6
      ctx.beginPath()
      ctx.arc(im.x - 4, crownY(S.cast.immortan, imFeet, RET.IMK) + 26, 15, Math.PI * 1.15, Math.PI * 1.75)
      ctx.stroke()
    }
    const breath = g < RETURN_EV.wigRip
      ? 0.35 + 0.45 * (0.5 - 0.5 * Math.cos(TAU * DOOM_LFO * (t - MASTER.alongside))) // bellows inhale at alongside
      : 0.06 // slack
    ART.drawMask(ctx, S.mask, S.cast.immortan, { x: im.x, feet: imFeet + (bald ? 3 : 0), sx: RET.IMK, breath, t, flip: true })
    ctx.globalAlpha = 1
  }
  // ---- the war party: doof first (farthest column), then pursuers + harpoons ----
  const eighth = beatSec('return') / 2
  const ph = (g - RETURN_EV.doofback) / eighth
  let flameU = ph > 0 ? 0.45 + 0.55 * Math.pow(1 - (ph % 1), 2) : 0
  if (g > RETURN_EV.waver) flameU = Math.max(0.1, flameU * (1 - 0.9 * seg(g, RETURN_EV.waver, RETURN_EV.waver + 0.5))) // doof falters: one droop note
  flameU *= 0.82 + 0.18 * Math.sin(t * 2.2) // doppler wobble between convoys
  {
    const doofX = 1716, doofGY = 812 // whole stack + guitar clear of the right edge
    shadow(ctx, doofX, doofGY + 4, 120, 10, 0.2)
    ctx.save()
    ctx.translate(doofX, doofGY)
    ctx.scale(0.95, 0.95)
    ART.drawRig(ctx, S.rigFar, 0, 0, { bob: 2 + Math.sin(t * 9) * 1.4, pitch: -0.8, wheel: (s9 / (S.rigFar.rigMeta.wheels[0][2] * 1.15 * TAU)) % 1 })
    ctx.restore()
    const wallW = 240, wallH = 172
    ctx.drawImage(S.wall, doofX - 46, doofGY - 258 - wallH, wallW, wallH)
    const doofFeet = doofGY - 258 - wallH * 0.4
    sprite(ctx, S.cast.doofBlind, doofX + 52, doofFeet, { sx: 1.1, sy: 1.1, ...stand, lean: Math.sin(t * 1.7) * 0.05 })
    ctx.save()
    ctx.translate(doofX + 63, doofFeet - 14)
    ctx.rotate(-0.5)
    ctx.scale(0.5, 0.5)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.guitar, -75, -28)
    ctx.restore()
    ART.flameJet(ctx, doofX + 63 + 76, doofFeet - 30, flameU, 9)
  }
  for (let i = 2; i >= 0; i--) {
    const wu = seg(g, RETURN_EV.waver + i * WAVES.witnessStagger, RETURN_EV.waver + i * WAVES.witnessStagger + 0.5)
    const px = 1620 + i * 190 + 46 * wu // waver: cars slow, fall back
    const pgy = RET.purGY - air
    shadow(ctx, px, pgy + 4, 110, 10, 0.2)
    ctx.save()
    ctx.translate(px, pgy)
    ctx.scale(1.3, 1.3) // the far lane: the column behind the podium
    ART.drawCar(ctx, S.carPlain, 0, 0, { bob: (2.4 + Math.sin(t * 10 + i) * 1.6) * (1 - wu * 0.7), pitch: -0.9, wheel: (s9 / (26 * 1.3 * TAU)) % 1 })
    ctx.restore()
    // harpoons: tense lines that droop one by one at the waver
    const droop = seg(g, RETURN_EV.waver + i * WAVES.witnessStagger, RETURN_EV.waver + i * WAVES.witnessStagger + 0.6)
    chainStroke(ctx, px - 110, pgy - 50, px - 300 - droop * 130, pgy - 160 + droop * 190, 0.85, { w: 2.6, sag: 16 + droop * 50 })
    // the boy: goggles-up chest-tap witness wave, rippling left to right
    sprite(ctx, [S.cast.warboy1, S.cast.warboy3, S.cast.warboy5][i], px - 34, pgy - 104, {
      sx: 1.2, sy: 1.2, ...stand, lean: 0.06 * Math.sin(t * 5 + i) * wu,
    })
    if (wu > 0.2) {
      ctx.fillStyle = '#cfd6de'
      ctx.fillRect(px - 43, pgy - 201, 19, 3.4)
      ctx.fillStyle = `rgba(255,246,214,${0.6 * wu})`
      ctx.fillRect(px - 40, pgy - 200, 5, 2)
    }
  }
  // ---- POLE-CATS: vault, boing off the tanker, one swatted to the grannies ----
  for (let i = 0; i < 3; i++) {
    const v = poleVault(g, i)
    if (!v) continue
    if (v.ph === 'in' && v.pole < 0.55) {
      // the bendy pole plants on the pursuer and flexes through the launch arc
      const pv = S.poles[i % 3]
      ctx.save()
      ctx.translate(1620 + i * 190, RET.purGY - 50)
      ctx.rotate(-1.2 * v.pole)
      ctx.drawImage(pv, -14, -80, 28, 160)
      ctx.restore()
    }
    ctx.save()
    if (v.sq > 0) ctx.scale(1.15 * v.sq + (1 - v.sq), 0.85 * v.sq + (1 - v.sq)) // 15% squash boing
    sprite(ctx, S.cast.warboy2, v.x, v.y, { sx: 1.35, sy: 1.35, rot: (v.ph === 'in' ? -1 : 1) * 0.8, lift: [4, 4] })
    ctx.restore()
    if (v.sq > 0.3) ringBurst(ctx, { t: MASTER.poles + i * 0.4 + 0.55, x: 1050 + i * 40, y: 620, seed: 40 + i }, t, { cols: ['#9aa6b2', '#cfd6de'], speed: 130, len: 7, n: 8, life: 0.18, alpha: 0.6 })
  }
  // the fourth boarder: Remy one-hands him at poleCatch -> down to the grannies
  if (g > RETURN_EV.poles + 1.5 && g < RETURN_EV.poleCatch + 0.75) {
    const u1 = seg(g, RETURN_EV.poles + 1.5, RETURN_EV.poleCatch)
    const u2 = seg(g, RETURN_EV.poleCatch, RETURN_EV.poleCatch + 0.6)
    let bx2, by2
    if (u2 <= 0) {
      bx2 = lerp(1500, rigX + 40, u1)
      by2 = lerp(760, deckY - 130, u1) - Math.sin(u1 * Math.PI) * 160
    } else {
      bx2 = lerp(rigX + 40, RET.bikeX - 48, E.inQuad(u2))
      by2 = lerp(deckY - 130, RET.bikeGY - 60, E.inQuad(u2)) + Math.sin(E.inQuad(u2) * Math.PI) * -60
      if (u2 > 0 && u2 < 0.2) {
        ctx.fillStyle = `rgba(255,246,214,${1 - u2 * 5})`
        ctx.beginPath()
        ctx.arc(rigX + 40, deckY - 130, 9 + u2 * 30, 0, TAU)
        ctx.fill() // the one-hand POP
      }
    }
    sprite(ctx, S.cast.warboy3, bx2, by2, { sx: 1.35, sy: 1.35, rot: 1.2, lift: [4, 4] })
  }
  // ---- FLOWIOSA on the cab nose; the mech arm; THE WIG RIP ----
  const cabRoofY = rigGY - 440 + 40 * 1.7
  const flX = rigX + 500
  const climb = E.outCubic(seg(g, 5.5, 5.95))
  if (climb > 0) {
    sprite(ctx, S.cast.flowiosa, flX, lerp(cabRoofY + 120, cabRoofY, climb), {
      sx: 2.2, sy: 2.2, stand, lean: 0.22 * seg(g, 6.6, 7.0) - 0.05,
    })
    const ripT = seg(g, 6.6, 7.0)
    const armA = 1 - seg(g, RETURN_EV.wigRip, RETURN_EV.wigRip + 0.55) // pulls back with the trophy
    if (ripT > 0 && armA > 0) {
      // the mech arm reaches across the gap (S.arms ladder: reach then claw)
      const w = wigWornAt(g)
      const tx2 = w.x - WIG_PULL.x * 0.45, ty2 = w.y - WIG_PULL.y * 0.45
      const au = cl(ripT * 1.15)
      ctx.save()
      ctx.globalAlpha = armA
      ctx.translate(flX + 16, cabRoofY - 96)
      ctx.rotate(Math.atan2(ty2 - (cabRoofY - 96), tx2 - (flX + 16)))
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(S.arms[Math.round(au * 8)], 0, -27, Math.hypot(tx2 - (flX + 16), ty2 - (cabRoofY - 96)), 54)
      ctx.restore()
    }
  }
  // white-strand spark ring at the rip — ages on REAL sl inside the freeze
  ringBurst(ctx, S.ringWig, t, { cols: ['#f4f6fa', '#c9cdd4', '#9aa6b2'], speed: 340, len: 18, n: 28 })
  // the wig free: analytic tumble, wind drift accelerating off-frame right
  if (g > RETURN_EV.wigRip) {
    const age = g - RETURN_EV.wigRip
    const wR = wigWornAt(RETURN_EV.wigRip)
    const wx0 = wR.x - WIG_PULL.x * 0.45
    const wy0 = wR.y - WIG_PULL.y * 0.45
    const wx2 = wx0 + 40 * age + 95 * age * age
    const wy2 = lerp(wy0, 862, cl(age / 3.2)) - Math.abs(Math.sin(age * 4.4)) * 190 * (1 - cl(age / 3.6))
    const wk = lerp(1.7, 1.36, cl(age / 3.4)) // scale eases 1.0 -> 0.8 into the horizon
    ctx.save()
    ctx.translate(Math.min(wx2, W + 240), Math.max(122, wy2))
    ctx.rotate(age * 7)
    ctx.scale(wk, wk)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.wigTumble[Math.min(8, Math.floor(cl(age / 2.2) * 8.99))], -60, -45)
    ctx.restore()
  }
  // landing dust as the convoys drop out of the freeze
  const land = g - 7.3
  if (land > 0 && land < 0.4) {
    ctx.strokeStyle = `rgba(217,165,94,${0.7 * (1 - land / 0.4)})`
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.ellipse(rigX, RET.rigGY - 6, 100 + land * 500, (100 + land * 500) * 0.2, 0, 0, TAU)
    ctx.stroke()
  }
  ctx.restore()
}

// ------------------------------ S10 — THE FLOW (payoff) ------------------------------
// Gates opened by the boys themselves; the master-valve SLAM (stop g2.0); the
// golden rain; Nux's seed; THE REGROW — the film's only saturated-red wide
// since S1; crowd-surf; the mop demotion; the walk; the single hair; the slate.
const FLW = { GY: 940, rigX: 1250, rigGY: 908, valveX: 1560, valveY: 560, citX: 40, citK: 2.05, citBY: 966 }
const flwCit = (nx, ny) => [FLW.citX + nx * FLW.citK, FLW.citBY - 560 * FLW.citK + ny * FLW.citK]
const flwRigX = (g) => lerp(-520, FLW.rigX, cl(S.s10.at(Math.min(g, 3)) / Math.max(1, S.s10.at(3))))
const regrowK = (g) => REGROW_LADDER.reduce((a, tk) => a + seg(g, tk.g, tk.g + REGROW_LERP), 0)
// regrow ladder crossfade (mirrors shearFade: two adjacent baked states)
function regrowFade(ctx, k, px, feet, o = {}) {
  const f = cl(k / 4) * 16
  const i = Math.min(15, Math.floor(f))
  const u = f - i
  const ra = S.regrow[i], rb = S.regrow[i + 1]
  if (u < 0.02) sprite(ctx, ra, px, feet, o)
  else if (u > 0.98) sprite(ctx, rb, px, feet, o)
  else {
    sprite(ctx, ra, px, feet, { ...o, alpha: (o.alpha ?? 1) * (1 - u) })
    sprite(ctx, rb, px, feet, { ...o, alpha: (o.alpha ?? 1) * u })
  }
}
// Remy's last walk: descend, walk right, sprout, pluck, the wind takes it
function flwRemy(g) {
  if (g < 6.9) return { x: 1290, y: retDeckYSafe(), pose: 'top' }
  if (g < 7.25) {
    const u = seg(g, 6.9, 7.25)
    return { x: lerp(1290, 1252, u), y: lerp(retDeckYSafe(), 946, u), pose: 'ladder' }
  }
  const walkU = seg(g, 8.3, 8.75) // freezes mid-stride for the pluck
  const px = 1252 + 95 * (g - 7.25) - 78 * walkU + 45 * Math.max(0, g - 8.75)
  const pluckHold = g > 8.3 && g < 8.75
  return { x: px, y: 946, pose: pluckHold ? 'pluck' : 'walk', k: Math.max(1.35, 2.9 - (g - 7.25) * 0.35) }
}
function retDeckYSafe() {
  return FLW.rigGY - 440 + 68
}
function drawFlow(ctx, lt, t) {
  const { g, stop, sl } = FLOWC.warp(lt)
  const s10 = S.s10.at(Math.min(g, 3))
  const rain = cl(seg(g, FLOW_EV.rain - 0.5, FLOW_EV.rain))
  const [shx, shy] = shakeXY(t, (stop ? 3.2 * (1 - sl / stop.d) : 0.7) + rain * 0.6)
  // push to the regrow wide (the film's only red wide gets the lens)
  const regrowPush = seg(g, 3.9, 4.7) - seg(g, 6.9, 7.5)
  cam(ctx, (1 + 0.03 * seg(g, 0, 2)) * (1 + 0.075 * regrowPush), lerp(960, 1240, regrowPush), lerp(560, 480, regrowPush), shx, shy)
  // golden hour: every pipe will glow
  bgWash(ctx, [[0, '#6e3c14'], [0.45, '#c98a3a'], [0.75, '#e8b05c'], [1, '#f2cf94']])
  parallaxDunes(ctx, s10 * PARALLAX.farDunes, s10 * PARALLAX.midDunes, 900)
  // the citadel + the gate the boys open themselves
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.citadel, FLW.citX, FLW.citBY - 560 * FLW.citK, 720 * FLW.citK, 560 * FLW.citK)
  // gate wall (two segments so the opening shows the lit interior) + leaves
  ctx.fillStyle = '#3a2a1c'
  ctx.fillRect(-OS, 700, 700 + OS, 266)
  ctx.fillRect(1120, 700, W + OS - 1120, 266)
  ctx.fillStyle = '#4a3424'
  for (let px2 = -80; px2 < 700; px2 += 96) ctx.fillRect(px2, 700, 7, 266)
  for (let px2 = 1120; px2 < W + OS; px2 += 96) ctx.fillRect(px2, 700, 7, 266)
  // the opening glows warm from inside (the FLOW light the boys released)
  const openg = ctx.createLinearGradient(0, 700, 0, 966)
  openg.addColorStop(0, `rgba(255,224,150,${0.62 + 0.15 * rain})`)
  openg.addColorStop(0.55, `rgba(232,180,90,${0.5 + 0.12 * rain})`)
  openg.addColorStop(1, `rgba(150,96,44,${0.4 + 0.12 * rain})`)
  ctx.fillStyle = openg
  ctx.fillRect(700, 700, 420, 266)
  const gateOpen = E.outCubic(seg(g, 0.1, 1.4))
  for (const [lx, dir] of [[700, 1], [1120, -1]]) {
    ctx.save()
    ctx.translate(lx, 966)
    ctx.scale(dir * (1 - 0.85 * gateOpen), 1)
    ctx.fillStyle = '#5a4328'
    ctx.fillRect(0, -250, 208, 250)
    ctx.strokeStyle = '#241a12'
    ctx.lineWidth = 4
    ctx.strokeRect(0, -250, 208, 250)
    ctx.fillStyle = '#241a12'
    for (let pl = 1; pl < 4; pl++) ctx.fillRect(pl * 52 - 2, -246, 4, 242)
    ctx.fillStyle = '#454a52'
    for (const bx of [30, 104, 178]) {
      ctx.fillRect(bx, -240, 8, 8)
      ctx.fillRect(bx, -20, 8, 8)
    }
    ctx.restore()
  }
  // the boys who open them: leaning pushes + the witness wave they now give US
  for (const [bx3, dir] of [[668, -1], [1152, 1]]) {
    const push = 1 - gateOpen * 0.6
    sprite(ctx, S.cast.warboy2, bx3, 946, { sx: 1.9, sy: 1.9, ...stand, lean: 0.16 * dir * push, flip: dir < 0 })
    if (gateOpen > 0.8) {
      ctx.fillStyle = `rgba(255,246,214,${0.5 * (gateOpen - 0.8) * 5 * (0.6 + 0.4 * Math.sin(t * 5 + bx3))})`
      ctx.fillRect(bx3 - 10, 812, 20, 4) // goggle glint: the wave
    }
  }
  drawDust(ctx, S.dust.s10, g)
  // ---- the rig parks at the gate; master valve on its stanchion ----
  const rigX = flwRigX(g), rigGY = FLW.rigGY
  shadow(ctx, rigX, rigGY + 5, 560, 22, 0.3)
  ART.drawRig(ctx, S.rig, rigX, rigGY, { bob: g < 3 ? 2 + Math.sin(t * 7) * 1.6 : 0.8, pitch: g < 3 ? 0.7 : 0, wheel: (s10 / CHASE_STAGE.wheelRevRig) % 1 })
  const deckY = retDeckYSafe()
  // valve stanchion + wheel (spin free after the slam)
  ctx.strokeStyle = '#33373f'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.moveTo(FLW.valveX, 966)
  ctx.lineTo(FLW.valveX, FLW.valveY)
  ctx.stroke()
  ctx.strokeStyle = REPAINT_SHARED.tonic.mid
  ctx.lineWidth = 3.4
  ctx.stroke()
  const spinFree = g > 2.12 ? 34 * Math.pow(g - 2.12, 2) : 0
  const wheelRot = g < 2.0 ? 0 : g < 2.12 ? 0.3 : spinFree
  ctx.save()
  ctx.translate(FLW.valveX, FLW.valveY)
  ctx.rotate(wheelRot)
  ctx.strokeStyle = '#2f8a3c'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.arc(0, 0, 44, 0, TAU)
  ctx.stroke()
  ctx.strokeStyle = '#8ffce0'
  ctx.lineWidth = 2.2
  ctx.stroke()
  for (let sp = 0; sp < 4; sp++) {
    const a = (sp / 4) * TAU
    ctx.strokeStyle = '#2f8a3c'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(a) * 44, Math.sin(a) * 44)
    ctx.stroke()
  }
  ctx.fillStyle = '#cfd6de'
  ctx.beginPath()
  ctx.arc(0, 0, 8, 0, TAU)
  ctx.fill()
  ctx.restore()
  // Flowiosa on the cab roof; the mech arm SLAMS the valve (stop g2.0)
  const cabRoofY = rigGY - 440 + 40 * 1.7
  const flX = rigX + 430
  sprite(ctx, S.cast.flowiosa, flX, cabRoofY, { sx: 2.2, sy: 2.2, stand, lean: 0.1 })
  const slamU = seg(g, 1.55, 2.0)
  if (slamU > 0) {
    const au = E.outCubic(slamU)
    ctx.save()
    ctx.translate(flX + 16, cabRoofY - 96)
    ctx.rotate(Math.atan2(FLW.valveY - (cabRoofY - 96), FLW.valveX - (flX + 16)))
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.arms[Math.round(au * 8)], 0, -27, Math.hypot(FLW.valveX - (flX + 16), FLW.valveY - (cabRoofY - 96)), 54)
    ctx.restore()
  }
  // ---- THE FLOW RAINS: every pipe, gold ----
  const sp2 = flwCit(S.citadel.spout[0], S.citadel.spout[1])
  ART.flowPour(ctx, sp2[0], sp2[1] + 6, 240, rain, 4)
  for (const px3 of [764, 1056]) {
    ctx.fillStyle = '#33373f'
    ctx.fillRect(px3 - 7, 640, 14, 120)
    ctx.fillStyle = REPAINT_SHARED.tonic.mid
    ctx.fillRect(px3 - 3, 640, 5, 120)
    ART.flowPour(ctx, px3, 648, 250, rain, px3)
  }
  ART.flowPour(ctx, FLW.valveX, FLW.valveY + 10, 300, rain, 8) // the slam bursts the seal
  goldArcs(ctx, sp2[0], sp2[1] + 10, rain, [[420, 930, 70], [860, 946, 90], [1300, 930, 60]])
  // ---- the crowd: gilded, cups up, catch the rain ----
  const crowdRoles = ['warboy1', 'citadel3', 'warboy4', 'warboy2', 'warboy5', 'citadel4', 'warboy3']
  for (let i = 0; i < 14; i++) {
    let cx4 = 120 + i * 130 + hash(i * 7) * 44
    if (cx4 > 400 && cx4 < 620) cx4 += 210 // keep Nux's terrace clear
    const gy4 = 952 + (i % 2) * 12
    const bob = Math.abs(Math.sin(t * 3.1 + i * 1.7)) * 4
    const sc = 1.5 + hash(i * 3) * 0.35
    sprite(ctx, S.cast[crowdRoles[i % crowdRoles.length]], cx4, gy4 - bob, { sx: sc, sy: sc, lift: [2, 0] })
    cupProp(ctx, cx4 + 9, gy4 - bob - 78 * sc, sc * 0.9, i === 4, rain * (0.5 + 0.5 * Math.sin(t * 6 + i)))
  }
  if (rain > 0) {
    const gg = ctx.createRadialGradient(960, 800, 100, 960, 800, 900)
    gg.addColorStop(0, `rgba(232,197,106,${0.16 * rain})`)
    gg.addColorStop(1, 'rgba(232,197,106,0)')
    ctx.fillStyle = gg
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  }
  // ---- NUX plants his S5 seed; the first sprout pops ----
  const sprout = E.outBack(seg(g, FLOW_EV.crowdSprout + 0.55, FLOW_EV.crowdSprout + 0.95))
  ctx.fillStyle = '#3a2c20'
  ctx.beginPath()
  ctx.ellipse(520, 938, 60, 16, 0, 0, TAU)
  ctx.fill()
  sprite(ctx, S.cast.nux, 508, 926, { sx: 2.05, sy: 2.05, ...stand, lean: 0.16 * (1 - seg(g, FLOW_EV.crowdSprout + 0.5, FLOW_EV.crowdSprout + 0.9)) })
  if (g > FLOW_EV.crowdSprout + 0.2) {
    ctx.fillStyle = '#a8c45a'
    ctx.beginPath()
    ctx.ellipse(544, 922, 3.4, 2, 0.5, 0, TAU)
    ctx.fill()
  }
  if (sprout > 0) {
    ctx.strokeStyle = '#5a9a3a'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(544, 924)
    ctx.lineTo(544, 924 - 12 * sprout)
    ctx.stroke()
    ctx.fillStyle = '#7ab84a'
    ctx.beginPath()
    ctx.ellipse(540, 924 - 12 * sprout, 3.4 * sprout, 2 * sprout, -0.5, 0, TAU)
    ctx.ellipse(548, 924 - 12 * sprout, 3.4 * sprout, 2 * sprout, 0.5, 0, TAU)
    ctx.fill()
  }
  // ---- THE REGROW: on the tanker top, big — the film's only red wide ----
  const remyX = 1290
  if (g < 6.9) {
    const k = regrowK(g)
    regrowFade(ctx, k, remyX, deckY, { sx: 2.9, sy: 2.9, stand })
    // clock-pinned tick pulses at the scalp; the resolve blooms
    for (const tk of REGROW_LADDER) {
      const pu = 1 - seg(g, tk.g, tk.g + 0.35)
      if (pu <= 0 || g < tk.g) continue
      const cy5 = crownY(S.regrow[16], deckY, 2.9) + 40
      ctx.strokeStyle = `rgba(232,197,106,${0.5 * pu})`
      ctx.lineWidth = 2.6
      ctx.beginPath()
      ctx.arc(remyX, cy5, 20 + (1 - pu) * 60, 0, TAU)
      ctx.stroke()
    }
  }
  // ---- Flowiosa crowd-surfed; Immortan demoted to the mop ----
  const surfU = seg(g, FLOW_EV.lifted, FLOW_EV.lifted + 2.0)
  if (surfU > 0 && surfU < 1) {
    const sx6 = lerp(1780, 700, surfU)
    const sy6 = 886 - Math.abs(Math.sin(surfU * 9)) * 14
    sprite(ctx, S.cast.flowiosa, sx6, sy6, { sx: 1.9, sy: 1.9, rot: -1.3, lift: [3, 3] })
    ctx.strokeStyle = '#26282c'
    ctx.lineWidth = 4.4
    ctx.beginPath()
    ctx.moveTo(sx6 + 10, sy6 - 40)
    ctx.quadraticCurveTo(sx6 + 40, sy6 - 130, sx6 + 30, sy6 - 170) // the raised arm
    ctx.stroke()
    for (let h2 = 0; h2 < 4; h2++) {
      ctx.strokeStyle = '#b38662'
      ctx.lineWidth = 3.4
      ctx.beginPath()
      ctx.moveTo(sx6 - 40 + h2 * 26, sy6 + 16 + Math.sin(t * 9 + h2) * 4)
      ctx.lineTo(sx6 - 40 + h2 * 26, sy6 + 40 + Math.sin(t * 9 + h2) * 4)
      ctx.stroke()
    }
  }
  // the podium car never leaves... this once an arm reaches out for the mop
  const podX = 210, podGY2 = 900
  shadow(ctx, podX, podGY2 + 4, 240, 14, 0.26)
  ctx.save()
  ctx.translate(podX, podGY2)
  ctx.scale(-1.3, 1.3)
  ART.drawCar(ctx, S.carPlain, 0, 0, { bob: 0.6, wheel: 0 })
  ctx.restore()
  sprite(ctx, S.cast.immortan, podX + 20, podGY2 - 150, { sx: 1.15, sy: 1.15, stand, flip: true })
  ART.drawMask(ctx, S.mask, S.cast.immortan, { x: podX + 20, feet: podGY2 - 150, sx: 1.15, breath: 0.12, t, flip: true })
  const mopU = seg(g, FLOW_EV.lifted - 0.3, FLOW_EV.lifted + 0.4)
  if (mopU > 0) {
    const mopAng = lerp(-1.2, -0.12, E.outCubic(mopU)) // handed over, then planted at the spill
    ctx.save()
    ctx.translate(podX + 44, podGY2 - 170)
    ctx.rotate(mopAng)
    ctx.strokeStyle = '#6a5232'
    ctx.lineWidth = 4.4
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(150, 0)
    ctx.stroke()
    ctx.fillStyle = '#8e8b78'
    for (let i = 0; i < 6; i++) ctx.fillRect(146, -12 + i * 4, 16 + (i % 2) * 4, 2.2)
    ctx.restore()
  }
  ctx.fillStyle = `rgba(232,197,106,${0.5 * rain})`
  ctx.beginPath()
  ctx.ellipse(330, 958, 70, 8, 0, 0, TAU)
  ctx.fill() // the spilled tonic he is pointed at
  // ---- the walk; the single hair; THE PLUCK; the wind takes it ----
  const rm = flwRemy(g)
  if (rm.pose !== 'top') {
    const o = {
      sx: rm.k ?? 2.9, sy: rm.k ?? 2.9,
      ...(rm.pose === 'walk' ? walkCyc(g * 7.4, 5) : rm.pose === 'ladder' ? stand : { lift: [2, 0], rot: -0.1 * Math.sin(seg(g, 8.3, 8.55) * Math.PI) }),
    }
    sprite(ctx, S.regrow[16], rm.x, rm.y, o)
    // ONE single hair: sprout, pluck, studied against the sun, taken
    const cyR = crownY(S.regrow[16], rm.y, rm.k ?? 2.9)
    if (g >= FLOW_EV.sprout1 && g < FLOW_EV.pluck) {
      const pop = E.outBack(seg(g, FLOW_EV.sprout1, FLOW_EV.sprout1 + 0.25))
      ctx.strokeStyle = '#b0453a'
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.moveTo(rm.x, cyR + 8)
      ctx.quadraticCurveTo(rm.x + 1 * pop, cyR - 2 * pop, rm.x + 4 * pop, cyR - 9 * pop)
      ctx.stroke()
      if (g < FLOW_EV.sprout1 + 0.3) {
        ctx.strokeStyle = `rgba(232,197,106,${1 - (g - FLOW_EV.sprout1) * 3.3})`
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.arc(rm.x + 2, cyR - 2, 6 + (g - FLOW_EV.sprout1) * 70, 0, TAU)
        ctx.stroke() // the tiny pop
      }
    }
    if (g >= FLOW_EV.pluck && g < FLOW_EV.windTake) {
      const held = seg(g, FLOW_EV.pluck, FLOW_EV.pluck + 0.2)
      const hx = rm.x + 14 + 16 * held, hy = cyR - 34 - 20 * held
      ctx.strokeStyle = '#b0453a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(hx, hy)
      ctx.lineTo(hx + 3, hy - 7)
      ctx.stroke()
      if (g < FLOW_EV.pluck + 0.25) {
        ctx.fillStyle = `rgba(255,246,214,${1 - (g - FLOW_EV.pluck) * 4})`
        ctx.beginPath()
        ctx.arc(rm.x + 4, cyR + 4, 6 + (g - FLOW_EV.pluck) * 60, 0, TAU)
        ctx.fill() // the finger-pop
      }
      // studied against the sun: one glint
      ctx.fillStyle = `rgba(255,240,190,${0.7 * Math.sin(cl((g - FLOW_EV.pluck - 0.25) / 0.5) * Math.PI)})`
      ctx.beginPath()
      ctx.arc(hx + 1, hy - 3, 2.4, 0, TAU)
      ctx.fill()
    }
    if (g >= FLOW_EV.windTake) {
      const age = g - FLOW_EV.windTake
      const hx = rm.x + 30 + 120 * age + 60 * age * age
      const hy = crownY(S.regrow[16], rm.y, rm.k ?? 2.9) - 50 - 46 * age + 18 * Math.sin(age * 6)
      ctx.strokeStyle = `rgba(176,69,58,${1 - cl(age / 2.4)})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(hx, hy)
      ctx.quadraticCurveTo(hx - 5, hy - 5, hx - 2, hy - 9)
      ctx.stroke()
    }
  }
  ctx.restore()
}

// ============================== prepare ==============================
export default {
  title: 'MAD BALD: FURY FLOW',
  output: 'mad-bald.mp4',
  duration: DUR,
  async prepare() {
    // ---- cast + staged haircut ladders ----
    S.cast = await ART.loadCast()
    S.madNative = S.cast.madRemyNative
    S.shear = []
    for (let i = 0; i <= 12; i++) S.shear.push(ART.shear42(S.madNative, i / 12))
    S.regrow = []
    for (let i = 0; i <= 16; i++) S.regrow.push(ART.regrow42(S.madNative, i / 4))
    // ---- environment bakes ----
    S.dunesDay = ART.dunes('day', 1)
    S.dunesNight = ART.dunes('night', 1)
    duneEdgeRepair(S.dunesDay) // kill the right-edge column (S9 scroll seam)
    duneEdgeRepair(S.dunesNight)
    S.citadel = ART.citadel(720, 560)
    S.highway = ART.highway(2560, 260)
    S.mud = ART.mudFlats(2560, 300)
    S.storm = ART.sandstorm(1200, 1080, 5)
    // ---- vehicles (RED pinstripe = hero accent only: de-stripe the fleet) ----
    S.rig = ART.warRig(1.7)
    S.rigFar = ART.warRig(1.15)
    S.car = ART.interceptor(1.7)
    S.carPlain = deStripe(ART.interceptor(1.7))
    // ---- props ----
    S.mask = ART.immortanMask(2.4)
    S.wigWorn = ART.greatWig(1.7, 0)
    S.wigTumble = [0.12, 0.22, 0.34, 0.45, 0.56, 0.67, 0.78, 0.9, 1].map((p) => ART.greatWig(1.7, p))
    S.guitar = ART.flameGuitar(2.2)
    S.wall = ART.speakerWall(1.15)
    S.poles = [-0.7, -0.35, 0, 0.35, 0.7].map((bd) => ART.poleCat(1.1, bd))
    S.arms = []
    for (let i = 0; i <= 8; i++) S.arms.push(ART.mechArm(4.5, -1 + (i / 8) * 2))
    S.pouch = ART.seedPouch(2.8)
    S.clips = ART.clippers(2.6)
    S.muz = ART.muzzle(2.6)
    S.vial = ART.tonicVial(3, 0.8)
    S.plumeDay = ART.dustPlume(3)
    S.plumeNight = ART.dustPlume(3, REPAINT_SHARED.dustNight)
    // ---- integrated speed lookups (SPEED rule: sampled once, never per frame) ----
    S.s4 = integrate(SPEED.rig.s4)
    S.s10 = integrate(SPEED.rig.s10)
    // ---- dust event tables ({g,x,y,seed,vx} per ground contact) ----
    const mkDust = (g0, g1, posAt, speedAt = () => 0) => {
      const out = []
      for (let n = 0, gg = g0; gg <= g1 + 1e-9; n++, gg = g0 + n * DUST.every) {
        const [x, y] = posAt(gg)
        out.push({ g: gg, x, y, seed: n + Math.round(g0 * 100), vx: -0.5 * speedAt(gg) * 0.12 + (hash(n * 7 + 3 + Math.round(g0 * 100)) - 0.5) * 40 })
      }
      return out
    }
    // S1: interceptor rear wheel during the sprint + the lead pursuer
    const s1CarX = (g) => (g < WASTELAND_EV.crest + 0.75 ? 1120 : lerp(1120, 1700, E.inQuad(seg(g, WASTELAND_EV.crest + 0.75, WASTELAND_EV.netBag))))
    S.dust = {}
    S.dust.s1 = [
      ...mkDust(WASTELAND_EV.crest + 0.8, WASTELAND_EV.netBag + 0.3, (g) => [s1CarX(g) - 110, 866]),
      ...mkDust(WASTELAND_EV.crest + 0.8, WASTELAND_EV.netBag, (g) => [lerp(-500, 1880, E.outCubic(seg(g, WASTELAND_EV.crest + 0.75, WASTELAND_EV.netBag))) - 90, 872]),
    ]
    // S4: rig rear wheels, nux wheels, pursuers, doof (world-screen x, speed-jitter vx)
    const sp4 = (g) => s4Speed(g)
    S.dust.s4rig = mkDust(0, CHASE_EV.cut, (g) => [CHASE_STAGE.rigX - 646 + (hash(Math.round(g * 100)) > 0.5 ? 110 : 190) * 1.7, CHASE_STAGE.rigGY - 10], sp4)
    S.dust.s4nux = mkDust(0, CHASE_EV.swing, (g) => [CHASE_STAGE.nuxX - 342 + 150 * 1.8, CHASE_STAGE.nuxGY - 8], sp4)
    S.dust.s4pur = mkDust(0.2, CHASE_EV.ramDomino, (g) => [pursuerX(g, 0) - 100, CHASE_STAGE.purGY - 8], sp4)
    S.dust.s4doof = mkDust(0, CHASE_EV.cut, () => [CHASE_STAGE.doofX - 100, CHASE_STAGE.doofGY - 6], sp4)
    // S3 roar: the rig's exit dust wall
    S.dust.s3roar = mkDust(CITADEL_EV.roar, CITADEL_EV.roar + 2.6, (g) => [lerp(620, 2260, E.inQuad(seg(g, CITADEL_EV.roar, CITADEL_EV.roar + 2.4))) - 420, 942], () => 700)
    // S5: rig rear wheels at the held 640
    S.dust.s5rig = mkDust(0, DEFECT_EV.cut, (g) => [1150 - 646 + (hash(Math.round(g * 100) + 50) > 0.5 ? 110 : 190) * 1.7, 890], () => 640)
    // ---- particle bursts at the named beats ----
    const headX2 = 806, headY2 = 590 // S2 staging constants (chair anchor)
    S.hairRain = []
    for (let gg = SHEAR_EV.clippers + 0.25; gg < SHEAR_EV.muzzle - 0.35; gg += 0.07) {
      S.hairRain.push({
        g: gg, x: headX2 - 60 + hash(Math.round(gg * 100)) * 120, y: headY2 + 20,
        seed: Math.round(gg * 100),
        vx: -40 - hash(Math.round(gg * 37)) * 60,
        vy: 40 + hash(Math.round(gg * 53)) * 80,
        col: hash(Math.round(gg * 71)) > 0.5 ? '#a93837' : '#7a2c22',
      })
    }
    S.ringClippers = { t: MASTER.clippers, x: headX2 + 10, y: headY2 + 16, seed: 7 }
    S.ringRam = { t: MASTER.ramDomino, x: 610, y: 830, seed: 19 }
    S.glassAboard = { g: CHASE_EV.aboard, x: 1199, y: 548 }
    S.sprayS4 = []
    for (let i = 0; i < 9; i++)
      S.sprayS4.push({ g: CHASE_EV.sprayDay + i * 0.02, x: CHASE_STAGE.nuxX + 210, y: CHASE_STAGE.nuxGY - 190, seed: i, vx: 60 + hash(i * 7) * 140, vy: -60 - hash(i * 3) * 80 })
    S.sprayS5 = []
    for (let i = 0; i < 11; i++)
      S.sprayS5.push({ g: DEFECT_EV.witness + i * 0.015, x: 990 + (hash(i * 5) - 0.5) * 30, y: deckWitnessY(), seed: i + 5, vx: (hash(i * 11) - 0.5) * 190, vy: -90 - hash(i * 13) * 90 })
    // ---- builder 2 (S6-S10): night storm bake, lightning rim silhouette,
    // white-strand rip ring, and the S8/S9/S10 dust event tables ----
    S.stormNight = stormNightBake(S.storm)
    S.rigDark = flatCopy(S.rig, '#0a101e')
    S.wigWornInk = flatCopy(S.wigWorn, '#6a7078') // contour so the white wig reads on the bleached sky
    const ripW = wigWornAt(RETURN_EV.wigRip)
    S.ringWig = { t: MASTER.wigRip, x: ripW.x - WIG_PULL.x * 0.45, y: ripW.y - WIG_PULL.y * 0.45, seed: 33 }
    S.dust.s8 = mkDust(TURN_EV.fullsend, TURN_EV.cut, (g) => [s8RigX(g) + 210, TURN_STAGE.rigGY - 8], () => 420)
    S.dust.s9a = mkDust(0, RETURN_EV.cut, (g) => [retRigX(g) - 646 + 150 * 1.7, RET.rigGY - 8], () => 1180)
    S.dust.s9b = mkDust(0.5, RETURN_EV.cut, (g) => [podNose(g) + 620, RET.podGY - 6], () => 1180)
    S.dust.s10 = mkDust(0, 3.0, (g) => [flwRigX(g) - 500, FLW.rigGY - 8], (g) => (g < 2 ? 340 : 80))
  },
  shots: SHOTS.map((sh) => ({
    name: sh.name,
    t0: sh.t0,
    t1: sh.t1,
    draw(ctx, lt, dur, t) {
      void dur
      if (sh.name === 'wasteland') drawWasteland(ctx, lt, t)
      else if (sh.name === 'shear') drawShear(ctx, lt, t)
      else if (sh.name === 'citadel') drawCitadel(ctx, lt, t)
      else if (sh.name === 'chase') drawChase(ctx, lt, t)
      else if (sh.name === 'defect') drawDefect(ctx, lt, t)
      else if (sh.name === 'storm') drawStorm(ctx, lt, t)
      else if (sh.name === 'greenplace') drawGreenplace(ctx, lt, t)
      else if (sh.name === 'turn') drawTurn(ctx, lt, t)
      else if (sh.name === 'return') drawReturn(ctx, lt, t)
      else if (sh.name === 'flow') drawFlow(ctx, lt, t)
    },
    fx: (lt) => {
      const base = fxPack()
      switch (sh.name) {
        case 'wasteland': return { ...base, ...GRADE.day, bloom: 0.1 }
        case 'shear': return { ...base, ...GRADE.amber, bloom: 0.08, vignette: 0.55, grain: 0.014 }
        case 'citadel': return { ...base, ...GRADE.dusk, bloom: 0.1 }
        case 'chase': return { ...base, ...GRADE.hotOrange, bloom: 0.13, bloomThresh: 0.88, vignette: 0.4, grain: 0.014 }
        case 'defect': {
          // dusk arrives fast: warm slides down, exposure sinks (story §2 S5)
          const u = seg(lt, 6.9, 9.1)
          return { ...base, sat: lerp(1.1, 0.98, u), warm: lerp(0.18, 0.04, u), exposure: lerp(-0.02, -0.07, u), bloom: 0.09 }
        }
        case 'storm': {
          // orange dies to indigo in two beats (E28), dawn cracks it at the tail
          const u1 = seg(lt, 0, 0.8), u2 = seg(lt, 0.8, 1.7)
          const ind = cl(u1 * 0.55 + u2 * 0.45)
          const dawn = seg(lt, 6.6, 8.1)
          return {
            ...base,
            sat: lerp(1.1, 0.9, ind),
            warm: lerp(0.3, -0.04, ind) + dawn * 0.06,
            exposure: lerp(-0.02, -0.08, u2) + dawn * 0.03,
            tint: [lerp(1, 0.86, ind), lerp(1, 0.94, ind), lerp(1, 1.12, ind)],
            bloom: 0.08, vignette: 0.58,
          }
        }
        case 'greenplace': return { ...base, ...GRADE.dawnGrey, bloom: 0.07, vignette: 0.55 }
        case 'turn': {
          const u = seg(lt, 0, 7.1)
          return { ...base, sat: lerp(0.86, 1.14, u), warm: lerp(0.05, 0.2, u), bloom: 0.1 }
        }
        case 'return': return { ...base, sat: 1.16, warm: 0.16, contrast: 1.07, bloom: 0.12, bloomThresh: 0.88 }
        case 'flow': {
          // golden hour; the slate darkens to black through E55's hold
          const dk = seg(lt, 9.5, 10.9)
          return { ...base, ...GRADE.gold, bloom: 0.11, vignette: 0.44, exposure: lerp(0, -0.55, dk), sat: lerp(1.12, 0.5, dk) }
        }
        default: return base
      }
    },
  })),
  captions: CAPTIONS, // verbatim from timeline — the film contract
  captionStyles: {
    title: {
      font: 'Anton', size: 132, weight: '', color: '#f2cf94', track: 2,
      shadow: '#050608', glow: '#8a4a1c', glowBlur: 22,
    },
    sub: {
      size: 30, weight: 500, color: 'rgba(240,228,204,0.88)', track: 4,
      shadow: '#050608',
    },
    caption: {
      size: 40, weight: 600, color: '#ffffff',
      shadow: '#04070d', glow: '#241408', glowBlur: 14,
    },
    kicker: {
      font: '"JetBrains Mono"', size: 26, weight: 700, color: '#d9c98f', track: 6,
      shadow: '#050608',
    },
  },
  flashes: FLASHES,
  score,
  // score.js header: shared-IR cinematic tail (3.2 s rings ride the freezes)
  audio: { seed: 42, reverb: 2.2, reverbGain: 0.3 },
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } },
}

// ------------------------------ local utilities used above ------------------------------

// deStripe: repaint the hero pinstripe family to plain panel — RED may not ride
// Cabald metal. Deterministic prepare-time pixel pass.
function deStripe(cnv) {
  const c = A.canvas(cnv.width, cnv.height)
  const x = c.getContext('2d')
  x.drawImage(cnv, 0, 0)
  const d = x.getImageData(0, 0, c.width, c.height)
  const p = d.data
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2]
    if (p[i + 3] > 8 && r > 130 && g < 95 && b < 95) {
      p[i] = 0x26; p[i + 1] = 0x28; p[i + 2] = 0x2c
    }
  }
  x.putImageData(d, 0, 0)
  return c
}

// piecewise speed profile -> integrated s(g) lookup (trapezoid, 1/120 s sample)
function integrate(profile, dt = 1 / 120) {
  const gEnd = profile[profile.length - 1][0]
  const n = Math.max(2, Math.ceil(gEnd / dt))
  const h = gEnd / n
  const speedAt = (g) => {
    if (g <= 0) return profile[0][1]
    for (let i = 1; i < profile.length; i++)
      if (g <= profile[i][0]) {
        const [g0, v0] = profile[i - 1], [g1, v1] = profile[i]
        const u = g1 === g0 ? 1 : (g - g0) / (g1 - g0)
        const sm = u * u * (3 - 2 * u) // eased inside each segment (story: eased 0->620)
        return lerp(v0, v1, sm)
      }
    return profile[profile.length - 1][1]
  }
  const ss = new Float64Array(n + 1)
  for (let i = 1; i <= n; i++) {
    const g = i * h
    ss[i] = ss[i - 1] + 0.5 * (speedAt(g - h) + speedAt(g)) * h
  }
  return {
    gEnd,
    at(g) {
      if (g <= 0) return 0
      if (g >= gEnd) return ss[n]
      const f = g / h
      const i = Math.min(n - 1, Math.floor(f))
      return lerp(ss[i], ss[i + 1], f - i)
    },
  }
}

// witness deck line for the S5 spray events (deck plane at the hero bake)
function deckWitnessY() {
  return 900 - 440 + 40 * 1.7 - 26
}
