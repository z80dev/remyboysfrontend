// HAIRASSIC PARK — A REMY BOYS BLOCKBUSTER. Picture for the timeline cue sheet:
// twelve shots on a full-res painted stage (bakes from art.js build()), rig
// actors on the per-shot clocks' WORLD g (hit-stops freeze g; shake, sparks,
// weather and the crown gleam age on REAL t so they keep moving through a
// freeze). Pure in time: no Math.random, no Date, no state across frames; the
// letterbox bars are painted last in every shot. Every caption comes verbatim
// from timeline CAPTIONS.
import { W, H, hash, seg, lerp, E } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import { OS, GEO } from './art.js'
import { score } from './score.js'
import {
  DURATION, SHOTS, T, b, CAPTIONS, CLOCKS,
  TITLE_SLAM, FENCE_SMASH, JEEP_FLIP, BANNER_FALL, FINAL_ROAR, REGROW_BURST,
} from './timeline.js'

// ---------------- event sheet (all absolute film seconds; grid-pinned via b) ----------------
const EV = {
  // S1 isle
  thunder1: 2.0, thunder2: 5.0, gates: 8.0,
  // S2 valley
  brachRise: b('Tour Whimsy', 1),        // 11.667
  brachCall: b('Tour Whimsy', 1, 3),     // 13.667
  caneLift: b('Tour Whimsy', 2),         // 14.333
  title: TITLE_SLAM,                     // 17.0
  // S3 lab
  caneGlint: b('Hatchery Wonder', 0, 1), // 22.667
  eggWobble: b('Hatchery Wonder', 0, 3), // 24.0
  eggCrack: b('Hatchery Wonder', 1),     // 24.667
  pop: b('Hatchery Wonder', 0, 6),       // 26.0
  chirp1: 26.3333, chirp2: b('Hatchery Wonder', 0, 7),
  malcombIn: b('Hatchery Wonder', 2),    // 27.333
  // S4 sabotage
  pry: b('Sabotage Tension', 0, 3),      // 33.25
  vial1: b('Sabotage Tension', 1),       // 34.0
  vial2: b('Sabotage Tension', 1, 1),    // 34.75
  hiss: b('Sabotage Tension', 1, 2),     // 35.5
  powerDown: b('Sabotage Tension', 2),   // 37.0
  thunder3: b('Sabotage Tension', 2, 2), // 38.5
  rainStart: 39.0,
  // S5 approach — the tread (90bpm half-bar booms)
  booms: [b('B-Rex Attack', 1, 2), b('B-Rex Attack', 2), b('B-Rex Attack', 2, 2)], // 44 / 45.333 / 46.667
  lampsOn: b('B-Rex Attack', 0, 11),     // 47.333
  // S6 breakout
  smash: FENCE_SMASH,                    // 48.0
  boom4: b('B-Rex Attack', 3, 2),        // 49.333
  snarl: b('B-Rex Attack', 4),           // 50.667
  circle: b('B-Rex Attack', 4, 2),       // 52.0
  windup: b('B-Rex Attack', 5),          // 53.333
  // S7 jeep
  slam: b('B-Rex Attack', 5, 2),         // 54.667
  shove: b('B-Rex Attack', 5, 3),        // 55.333
  flip: JEEP_FLIP,                       // 56.0
  stepOver: b('B-Rex Attack', 6, 2),     // 57.333
  // S8 flare
  flarePop: b('B-Rex Attack', 6, 3),     // 58.0
  wheel: b('B-Rex Attack', 7),           // 58.667
  boom10: b('B-Rex Attack', 7, 1),       // 59.333
  doorClank: b('B-Rex Attack', 7, 2),    // 60.0
  kidsDash: b('B-Rex Attack', 8),        // 61.333
  snap: b('B-Rex Attack', 8, 1),         // 62.0
  fizzle: b('B-Rex Attack', 8, 2),       // 62.667
  // S9 kitchen
  glide: b('Kitchen Suspense', 0, 2),    // 65.5
  tremble: 66.5,
  clang: b('Kitchen Suspense', 1),       // 67.0
  rapStep: b('Kitchen Suspense', 1, 2),  // 68.5
  snoutTurn: b('Kitchen Suspense', 1, 3),// 69.25
  strand: b('Kitchen Suspense', 2),      // 70.0
  latch: b('Kitchen Suspense', 2, 1),    // 70.75
  screech: b('Kitchen Suspense', 2, 3),  // 72.25
  // S10 clever-girl
  mulldoonIn: b('Kitchen Suspense', 3, 1), // 73.75
  pounce: b('Kitchen Suspense', 4),      // 76.0
  settle: b('Kitchen Suspense', 4, 1),   // 76.75
  // S11 showdown
  hiss1: b('Showdown', 0, 2),            // 78.5
  hiss2: b('Showdown', 0, 3),            // 79.25
  click1: b('Showdown', 1),              // 80.0
  click2: b('Showdown', 1, 1),           // 80.75
  crash: b('Showdown', 2),               // 83.0
  seize: b('Showdown', 2, 2),            // 84.5
  thrash: b('Showdown', 2, 3),           // 85.25
  banner: BANNER_FALL,                   // 86.0
  roar2: b('Showdown', 3, 2),            // 87.5
  slipOut: b('Showdown', 3, 3),          // 88.25
  rotor: b('Showdown', 4),               // 89.0
  // S12 dawn
  heliUp: T.dawn,                        // 90.0
  alone: b('Regrow Dawn', 1),            // 92.667
  shimmer: b('Regrow Dawn', 0, 6),       // 94.0
  regrow: REGROW_BURST,                  // 95.333
  crests: b('Regrow Dawn', 2, 2),        // 96.667
  inhale: b('Regrow Dawn', 2, 3),        // 97.333
  roar: FINAL_ROAR,                      // 98.0
}

const S = {}
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

function sprite(ctx, rig, x, feet, o = {}) {
  ctx.imageSmoothingEnabled = false
  A.drawRemy(ctx, rig, x, feet, o)
}
function cam(ctx, k, cx, cy, sx = 0, sy = 0) {
  ctx.save()
  ctx.translate(960 + sx, 540 + sy)
  ctx.scale(k, k)
  ctx.translate(-cx, -cy)
}
const shakeXY = (t, amp) => amp <= 0 ? [0, 0] : [
  (hash(Math.floor(t * 90) + 7) - 0.5) * 2 * amp,
  (hash(Math.floor(t * 90) + 99) - 0.5) * 2 * amp,
]
// decaying impact shake envelope on real t
const hitShake = (t, at, amp = 9, life = 0.5) => {
  const w = t - at
  return w > 0 && w < life ? amp * (1 - w / life) : 0
}

// torch flame (isle gates) — live flicker over the baked bowls
function torchFlame(ctx, x, y, t, seed) {
  const halo = ctx.createRadialGradient(x, y - 20, 4, x, y - 20, 90)
  halo.addColorStop(0, 'rgba(255,170,80,0.3)')
  halo.addColorStop(1, 'rgba(255,170,80,0)')
  ctx.fillStyle = halo
  ctx.fillRect(x - 90, y - 110, 180, 180)
  for (const [dx, s2, sd] of [[-6, 0.8, 1], [6, 0.7, 2], [0, 1, 3]]) {
    const fl = Math.sin(t * 10.3 + sd * 5 + seed) * 0.5 + Math.sin(t * 16.1 + sd * 9) * 0.5
    const fh = 34 * s2 + fl * 6 * s2
    ctx.fillStyle = '#ff9a3a'
    ctx.beginPath()
    ctx.moveTo(x + dx - 7 * s2, y)
    ctx.quadraticCurveTo(x + dx - 8 * s2 + fl * 3, y - fh * 0.55, x + dx + fl * 3 * s2, y - fh)
    ctx.quadraticCurveTo(x + dx + 8 * s2 + fl * 3, y - fh * 0.55, x + dx + 7 * s2, y)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffd98a'
    ctx.beginPath()
    ctx.ellipse(x + dx + fl * 1.5, y - fh * 0.35, 3 * s2, 6 * s2, 0, 0, 7)
    ctx.fill()
  }
}

// brimmed field hat for Growgrant
function fieldHat(ctx, x, y, s) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.fillStyle = '#7a5c38'
  ctx.beginPath()
  ctx.ellipse(0, 0, 34, 9, 0, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#8a6a42'
  ctx.beginPath()
  ctx.ellipse(0, -8, 20, 14, 0, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = '#5e4426'
  ctx.fillRect(-20, -10, 40, 5)
  ctx.restore()
}

// storm clouds sliding past a window (sabotage), clipped
function stormWindow(ctx, rect, t) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.w, rect.h)
  ctx.clip()
  const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h)
  g.addColorStop(0, '#0c1016')
  g.addColorStop(1, '#1c2430')
  ctx.fillStyle = g
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  for (let i = 0; i < 6; i++) {
    const px = rect.x + ((t * (14 + hash(i) * 18) + i * 260) % (rect.w + 320)) - 160
    const py = rect.y + 60 + hash(i * 3) * 200
    ctx.fillStyle = `rgba(${38 + hash(i * 7) * 20 | 0},${48 + hash(i * 9) * 20 | 0},${62 + hash(i * 11) * 20 | 0},0.75)`
    ctx.beginPath()
    ctx.ellipse(px, py, 120 + hash(i * 5) * 90, 44 + hash(i * 13) * 30, 0, 0, 7)
    ctx.fill()
  }
  ctx.restore()
}

// shaving-cream can + vial insert (sabotage desk macro)
function canMacro(ctx, x, y, t, o = {}) {
  ctx.save()
  ctx.translate(x, y)
  const s2 = 1.6
  ctx.scale(s2, s2)
  // can body
  const g = ctx.createLinearGradient(-34, 0, 34, 0)
  g.addColorStop(0, '#7e868e')
  g.addColorStop(0.4, '#c8d0d8')
  g.addColorStop(1, '#5a626a')
  ctx.fillStyle = g
  ctx.fillRect(-30, -96, 60, 130)
  ctx.fillStyle = '#a02c24'
  ctx.fillRect(-30, -60, 60, 34)
  ctx.fillStyle = '#f0e8d8'
  ctx.font = '13px Anton'
  ctx.textAlign = 'center'
  ctx.fillText('BALD', 0, -38)
  // cap pried (tilts after pry)
  ctx.save()
  ctx.translate(0, -96)
  ctx.rotate(o.pried ? -0.5 : 0)
  ctx.fillStyle = '#b8c0c8'
  ctx.fillRect(-32, -18, 64, 18)
  ctx.restore()
  // vials dropping in
  for (const [vt, col] of [[EV.vial1, '#c85a78'], [EV.vial2, '#5aa0c8']]) {
    const u = seg(t, vt, vt + 0.22)
    if (u <= 0 || u >= 1) continue
    const vx = lerp(-90, 0, u)
    const vy = -150 + u * u * 60
    ctx.save()
    ctx.translate(vx, vy)
    ctx.rotate(u * 3)
    ctx.fillStyle = col
    ctx.fillRect(-5, -16, 10, 30)
    ctx.fillStyle = '#e8e2d0'
    ctx.fillRect(-5, -22, 10, 7)
    ctx.restore()
  }
  // hiss puff
  const hu = seg(t, EV.hiss, EV.hiss + 0.5)
  if (hu > 0 && hu < 1) {
    ctx.globalAlpha = (1 - hu) * 0.5
    ctx.fillStyle = '#dce8f0'
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.arc(-60 - i * 16 * hu, -110 - i * 12 + Math.sin(t * 9 + i) * 4, 6 + i * 3 + hu * 10, 0, 7)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

// ============================== S1 — ISLE APPROACH ==============================
function drawIsle(ctx, lt, t) {
  const g = lt // no stops
  const k = lerp(0.8, 1.06, E.inOutCubic(cl(seg(g, 0, 8))))
  const cx = lerp(930, GEO.isle.gateX, E.inOutCubic(seg(g, 0, 8)))
  const cy = lerp(540, 570, seg(g, 0, 8))
  cam(ctx, k, cx, cy, ...shakeXY(t, g < 2.4 || (g > 4.8 && g < 5.6) ? 1.2 : 0))
  ctx.drawImage(S.bake.isle, -OS, -OS)
  ART.seaShimmer(ctx, 600, 880, t, 'rgba(200,216,224,0.35)')
  ART.fogBank(ctx, t, 420, 260, 3, 0.34)
  ART.fogBank(ctx, t, 700, 200, 8, 0.22)
  // torch flames
  for (const [tx, ty] of GEO.isle.torch) torchFlame(ctx, tx, ty, t, tx)
  // the gates swing open (groan from 8.0)
  const open = E.inOutCubic(seg(g, EV.gates, 9.6)) * 0.55
  const gx = GEO.isle.gateX
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(gx + side * 268, GEO.isle.gateBase)
    ctx.rotate(side * open)
    const dw = 268
    const g2 = ctx.createLinearGradient(0, -GEO.isle.doorH, dw, 0)
    g2.addColorStop(0, '#4a3620')
    g2.addColorStop(0.5, '#5e4426')
    g2.addColorStop(1, '#382815')
    ctx.fillStyle = g2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(dw, 0)
    ctx.quadraticCurveTo(dw + 6, -GEO.isle.doorH * 0.5, dw - 4, -GEO.isle.doorH)
    ctx.lineTo(4, -GEO.isle.doorH)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#2c2012'
    ctx.lineWidth = 6
    for (const px of [70, 150, 230]) {
      ctx.beginPath()
      ctx.moveTo(px, -8)
      ctx.lineTo(px - 4, -GEO.isle.doorH + 8)
      ctx.stroke()
    }
    ctx.strokeRect(2, -GEO.isle.doorH + 2, dw - 6, GEO.isle.doorH - 4)
    ctx.restore()
  }
  // lightning: flash + one bolt striking toward the gates
  const l2 = t - EV.thunder2
  if (l2 > 0 && l2 < 0.3) ART.bolt(ctx, 560, 130, 940, 400, 9, 1 - l2 / 0.3)
  const fl = (at, life) => {
    const w = t - at
    return w > 0 && w < life ? Math.max(0, 1 - w / life) * 0.22 : 0
  }
  ART.skyFlash(ctx, fl(EV.thunder1, 0.5) + fl(EV.thunder2, 0.3))
  ART.rain(ctx, t, 0.7)
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S2 — THE VALLEY ==============================
function drawValley(ctx, lt, t) {
  const g = lt
  const V = T.valley // EV are absolute film seconds; g is shot-local
  const riseG = EV.brachRise - V, callG = EV.brachCall - V, caneG = EV.caneLift - V
  // camera: wide -> crane up with the brachiosaur -> push to Hambald -> pull wide
  let k = 1.04, cx = 960, cy = 600
  if (g < riseG) { k = 1.04; cy = lerp(620, 580, seg(g, 0, 2.5)) }
  else if (g < caneG) { const u = seg(g, riseG, callG + 0.5); k = 1.02; cy = lerp(580, 520, u) }
  else if (g < EV.title - V) { const u = E.inOutCubic(seg(g, caneG, EV.title - V - 0.3)); k = lerp(1.02, 1.42, u); cx = lerp(960, 430, u); cy = lerp(520, 680, u) }
  else { const u = E.inOutCubic(seg(g, EV.title - V + 0.2, EV.title - V + 2.2)); k = lerp(1.42, 0.96, u); cx = lerp(430, 960, u); cy = lerp(680, 560, u) }
  cam(ctx, k, cx, cy)
  ctx.drawImage(S.bake.valley, -OS, -OS)
  ART.spray(ctx, t, 1550, 770, 1)
  ART.pollen(ctx, t, 26, 5)
  // ---- THE MANED BRACHIOSAUR ----
  const rear = E.outCubic(seg(g, riseG - 0.6, riseG + 1.6))
  const call = Math.sin(Math.PI * cl(seg(g, callG, callG + 1.3)))
  ART.contactShadow(ctx, GEO.valley.brach[0], GEO.valley.brach[1] + 4, 190, 0.3)
  ART.brachio(ctx, GEO.valley.brach[0], GEO.valley.brach[1], 1.15, t, { rear, call, dir: -1 })
  // golden haze around it
  const hz = ctx.createRadialGradient(1480, 500, 40, 1480, 520, 420)
  hz.addColorStop(0, 'rgba(255,220,150,0.16)')
  hz.addColorStop(1, 'rgba(255,220,150,0)')
  ctx.fillStyle = hz
  ctx.fillRect(1060, 140, 840, 740)
  // ---- the party on the hill ----
  const party = [
    ['hambl', GEO.valley.heroes[0][0], GEO.valley.heroes[0][1], 1.7, false],
    ['grant', GEO.valley.heroes[1][0], GEO.valley.heroes[1][1], 1.72, true],
    ['malcomb', GEO.valley.heroes[2][0], GEO.valley.heroes[2][1], 1.7, false],
  ]
  for (const [who, hx, hf, hs] of party) {
    ART.contactShadow(ctx, hx, hf, 30, 0.3)
    sprite(ctx, S[who], hx, hf, { ...ART.standPose(g), sx: hs, sy: hs })
  }
  // Growgrant's field hat
  fieldHat(ctx, GEO.valley.heroes[1][0] + 2, ART.crownY(S.grant, GEO.valley.heroes[1][1], 1.72) + 12, 1.72)
  // the kids (0.8 sy)
  for (const [who, kx, kf] of [['tim', 668, 822], ['lexi', 724, 826]]) {
    ART.contactShadow(ctx, kx, kf, 22, 0.28)
    sprite(ctx, S[who], kx, kf, { ...ART.standPose(g * 1.3 + kx), sx: 1.38, sy: 1.38 })
  }
  // rangers far behind
  sprite(ctx, S.rangerA, 300, 806, { lift: [2, 0], stride: [1, 0], sx: 1.25, sy: 1.25, alpha: 0.9 })
  sprite(ctx, S.rangerB, 250, 800, { lift: [2, 0], stride: [1, 0], sx: 1.22, sy: 1.22, alpha: 0.9 })
  // ---- Hambald lifts the amber cane (14.333) ----
  const lift = E.outBack(seg(g, caneG, caneG + 0.5))
  if (lift > 0.01) {
    const hx = GEO.valley.heroes[0][0], hf = GEO.valley.heroes[0][1]
    ART.amberCane(ctx, hx + 30, hf - 40 - lift * 60, 0.42, t, Math.abs(Math.sin(t * 1.3)) * cl(seg(g, caneG, caneG + 0.35)))
  }
  // ---- TITLE SLAM: dust + ring + warm glow behind the caption (17.0) ----
  const age = t - EV.title
  if (age > -0.05 && age < 2.2) {
    ART.dustBurst(ctx, 960, 620, age, 71, { n: 26, spread: 320, life: 1.1, col: '#c8b070' })
    ART.shockRing(ctx, 960, 580, age, 0.5)
    ART.dustBurst(ctx, 700, 640, age - 0.08, 72, { n: 10, spread: 190, life: 0.9 })
    ART.dustBurst(ctx, 1220, 640, age - 0.08, 73, { n: 10, spread: 190, life: 0.9 })
    const glowK = E.outBack(cl(seg(g, EV.title - V - 0.001, EV.title - V + 0.25)))
    if (glowK > 0) {
      const rg = ctx.createRadialGradient(960, 540, 20, 960, 540, 380 * (1 + 0.04 * Math.sin(t * 6)))
      rg.addColorStop(0, `rgba(240,200,120,${0.2 * glowK})`)
      rg.addColorStop(1, 'rgba(240,200,120,0)')
      ctx.fillStyle = rg
      ctx.fillRect(520, 160, 880, 760)
    }
  }
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S3 — LAB HATCHERY ==============================
function drawLab(ctx, lt, t) {
  const g = lt
  const L = T.lab // EV are absolute; g is shot-local
  // macro on the cane -> rack focus to the egg (slow orbit) -> snap-in on the pop
  const inCane = g < 1.8
  const popG = EV.pop - L, crackG = EV.eggCrack - L, wobG = EV.eggWobble - L
  let k, cx, cy
  if (inCane) {
    const u = E.inOutCubic(seg(g, 0.4, 1.4))
    k = lerp(2.3, 2.75, u); cx = 1332; cy = lerp(690, 620, u)
  } else {
    const u = E.inOutCubic(seg(g, 1.8, 2.8))
    const orb = Math.sin((g - 1.8) * 0.45) * 26
    k = lerp(2.75, 2.3, u) + (g > popG ? E.outCubic(seg(g, popG, popG + 0.3)) * 0.28 : 0)
    cx = 760 + orb; cy = 596
  }
  cam(ctx, k, cx, cy, ...shakeXY(t, hitShake(t, EV.pop, 3, 0.3)))
  ctx.drawImage(S.bake.lab, -OS, -OS)
  // the cane on the bench (macro subject early, still visible later)
  const glintK = (gAge => (gAge > 0 && gAge < 0.5 ? gAge / 0.5 : 0))(t - EV.caneGlint)
  ART.amberCane(ctx, 1332, 690, 0.52, t, glintK)
  // THE EGG: wobble -> cracks -> POP
  const wobble = g >= wobG && g < crackG
  const wob = wobble ? Math.sin((g - wobG) * 24) * 0.05 : 0
  const crackK = seg(g, crackG, popG)
  const popU = seg(g, popG, popG + 0.18)
  const ex = 760, ey = 620
  if (popU < 1) {
    ctx.save()
    ctx.translate(ex, ey)
    ctx.rotate(wob)
    ART.egg(ctx, 0, 0, 2.6, crackK, t)
    ctx.restore()
  } else {
    // jagged bottom shell half stays; the hatchling stands in it
    ctx.fillStyle = '#d8c8a0'
    ctx.beginPath()
    ctx.moveTo(ex - 72, ey + 16)
    for (let i = 0; i <= 6; i++) {
      const u = i / 6
      ctx.lineTo(ex - 72 + u * 144, ey + 16 - (i % 2) * 14)
    }
    ctx.quadraticCurveTo(ex, ey + 46, ex - 72, ey + 16)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#8a7c5e'
    ctx.lineWidth = 3
    ctx.stroke()
  }
  if (popU > 0) {
    ART.hatchling(ctx, ex, ey - 30, 3.1, t, {
      pop: E.outBack(popU),
      wiggle: g > EV.chirp1 - L && g < EV.chirp2 - L + 0.4 ? 1 : 0.4,
      chirp: (g > EV.chirp1 - L && g < EV.chirp1 - L + 0.4) || (g > EV.chirp2 - L && g < EV.chirp2 - L + 0.4),
    })
  }
  // shell shards on the pop (real t)
  const pAge = t - EV.pop
  if (pAge > -0.02 && pAge < 1) {
    ART.debrisBurst(ctx, ex, ey - 40, pAge, 55, { n: 12, vx: 260, vy: 300, life: 0.9, col: '#e8dcc2', col2: '#b8a880' })
    ART.shockRing(ctx, ex, ey - 30, pAge, 0.4, 'rgba(255,214,138,0.7)')
  }
  // dust motes in the lamp light
  for (let i = 0; i < 14; i++) {
    const px = 300 + hash(i * 7) * 1300, py = 300 + hash(i * 13) * 500
    const ph = t * (0.3 + hash(i) * 0.4) + i
    ctx.globalAlpha = 0.1 + 0.12 * Math.sin(ph * 1.7)
    ctx.fillStyle = '#ffd88a'
    ctx.fillRect(px + Math.sin(ph) * 20, py + Math.cos(ph * 0.7) * 14, 2, 2)
  }
  ctx.globalAlpha = 1
  ctx.restore()
  // ---- Mal-Comb steps in and leans to the hatchling (27.333) — wide-ish layer ----
  const mIn = seg(g, EV.malcombIn - L, EV.malcombIn - L + 1.2)
  if (mIn > 0) {
    const mx = lerp(1560, 1180, E.outCubic(mIn))
    cam(ctx, 1, 0, 0)
    ART.contactShadow(ctx, mx, 880, 30, 0.32)
    sprite(ctx, S.malcomb, mx, 880, {
      ...(mIn < 1 ? ART.walkCyc(g * 8, 6) : { lift: [2, 0], stride: [1, 0] }),
      lean: mIn >= 1 ? -0.1 + Math.sin(g * 1.2) * 0.015 : 0.06,
      sx: 1.95, sy: 1.95, flip: true,
    })
    ctx.restore()
  }
  ART.bars(ctx)
}

// ============================== S4 — SABOTAGE ==============================
function drawControl(ctx, lt, t) {
  const g = lt
  // low angle on Baldry -> inserts (can / vials) -> whip to the dying map
  let k = 1.25, cx = 950, cy = 700
  if (g < 2.25) { k = 1.3; cx = lerp(980, 920, seg(g, 0, 2)); cy = 700 }
  else if (g < 4.5) { const u = E.inOutCubic(seg(g, 2.25, 2.75)); k = lerp(1.3, 1.85, u); cx = lerp(920, 935, u); cy = lerp(700, 770, u) }
  else if (g < 5.5) { const u = E.inOutCubic(seg(g, 4.5, 5.0)); k = lerp(1.85, 1.15, u); cx = lerp(935, 980, u); cy = lerp(770, 680, u) }
  else { const u = E.inOutCubic(seg(g, 6.0, 6.5)); k = lerp(1.15, 1.9, u); cx = lerp(980, 1150, u); cy = lerp(680, 520, u) }
  cam(ctx, k, cx, cy, ...shakeXY(t, hitShake(t, EV.thunder3, 4, 0.4)))
  ctx.drawImage(S.bake.control, -OS, -OS)
  // storm clouds past the window + first rain on the glass
  stormWindow(ctx, { x: 60, y: 200, w: 560, h: 480 }, t)
  if (g > EV.rainStart - 31) ART.rainClip(ctx, { x: 60, y: 200, w: 560, h: 480 }, t, cl((g - (EV.rainStart - 31)) * 2))
  // thunder bolt through the window at 38.5
  const l3 = t - EV.thunder3
  if (l3 > 0 && l3 < 0.3) ART.bolt(ctx, 200, 180, 420, 480, 13, 1 - l3 / 0.3)
  ART.skyFlash(ctx, (w => (w > 0 && w < 0.35 ? (1 - w / 0.35) * 0.2 : 0))(l3))
  // ---- the shaving-cream can on the desk (insert subject) ----
  const pried = g > EV.pry - 31
  canMacro(ctx, GEO.control.can[0], GEO.control.can[1], t, { pried })
  // ---- the voltage map screen: dies at 37.0 ----
  const volt = 10000 * (1 - E.inQuad(seg(g, EV.powerDown - 31, EV.powerDown - 31 + 0.55)))
  const flicker = g > EV.powerDown - 31 + 0.55 && g < EV.powerDown - 31 + 1.0 ? (hash(Math.floor(t * 40)) > 0.5 ? 0.5 : 0.05) : 0
  ART.voltScreen(ctx, GEO.control.screen[0], GEO.control.screen[1], 360, 220, t, volt, flicker)
  // screens darken as power dies
  const dark = seg(g, EV.powerDown - 31, EV.powerDown - 31 + 0.8)
  if (dark > 0) {
    ctx.fillStyle = `rgba(6,8,12,${0.24 * dark})`
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  }
  // ---- Baldry ----
  const bx = g > EV.thunder3 - 31 ? lerp(950, 2150, E.inQuad(seg(g, EV.thunder3 - 31, EV.thunder3 - 29.3))) : 950
  const typing = g < EV.pry - 31
  ART.contactShadow(ctx, bx, 900, 32, 0.34)
  sprite(ctx, S.baldry, bx, 900, {
    ...(typing ? { lift: [1, 1], stride: [0, 0], lean: 0.1 } : g > EV.thunder3 - 31 ? ART.walkCyc(g * 9, 6) : { lift: [2, 0], stride: [1, 0], lean: 0.03 }),
    sx: 1.95, sy: 1.95,
  })
  // the can in his pocket after 37.5 (small dark slab at the hip)
  if (g > EV.powerDown - 31 + 0.5) {
    ctx.fillStyle = '#8e969e'
    ctx.fillRect(bx - 26, 900 - 74, 12, 22)
  }
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S5 — REX APPROACH (jeep + cup) ==============================
function drawApproach(ctx, lt, t) {
  const g = lt
  const inCup = g >= 4.0
  if (!inCup) {
    // ---- interior jeep two-shot ----
    cam(ctx, 1.06, 940, 640)
    ctx.drawImage(S.bake.road, -OS, -OS)
    ctx.fillStyle = 'rgba(4,6,10,0.32)'
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    // the three of them, seat-belted, facing us past the dash
    const seats = [
      ['grant', 560, 992, 1.8],
      ['tim', 905, 1028, 1.42],
      ['lexi', 1140, 1032, 1.4],
    ]
    for (const [who, sx2, sf, ss] of seats) {
      ART.contactShadow(ctx, sx2, sf, 26, 0.3)
      sprite(ctx, S[who], sx2, sf, {
        lift: [2, 0], stride: [1, 0],
        lean: -0.03 + Math.sin(g * 1.1 + sx2) * 0.02,
        sx: ss, sy: ss,
      })
    }
    fieldHat(ctx, 562, ART.crownY(S.grant, 1000, 1.8) + 12, 1.8)
    // breath fog in the cold
    for (const [bx, by] of [[560, 790], [905, 815], [1140, 818]]) {
      const u = (t * 0.4 + bx) % 2
      if (u < 1) {
        ctx.globalAlpha = Math.sin(u * Math.PI) * 0.12
        ctx.fillStyle = '#c8d8e4'
        ctx.beginPath()
        ctx.ellipse(bx, by - 30 - u * 30, 14 + u * 20, 8 + u * 12, 0, 0, 7)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
    // the dash cuts them at the hips; cup rides the dash holder
    ctx.fillStyle = '#14181e'
    ctx.beginPath()
    ctx.moveTo(-OS, 972)
    ctx.quadraticCurveTo(960, 902, W + OS, 972)
    ctx.lineTo(W + OS, H + OS)
    ctx.lineTo(-OS, H + OS)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#1e242c'
    ctx.fillRect(-OS, 960, W + OS * 2, 26)
    // cup in its holder (rings visibly shiver on the booms)
    ART.waterCup(ctx, 760, 1010, 0.62, t, EV.booms)
    // windshield frame + rain on the glass
    ctx.strokeStyle = '#0c0f14'
    ctx.lineWidth = 34
    ctx.beginPath()
    ctx.moveTo(-30, -30); ctx.lineTo(240, 300); ctx.moveTo(W + 30, -30); ctx.lineTo(W - 240, 300)
    ctx.moveTo(-30, H + 30); ctx.lineTo(-30, -30); ctx.moveTo(W + 30, H + 30); ctx.lineTo(W + 30, -30)
    ctx.stroke()
    ctx.fillStyle = '#0a0d12'
    ctx.fillRect(-OS, -OS, W + OS * 2, 128)
    ART.rainClip(ctx, { x: 140, y: 138, w: W - 280, h: 500 }, t, 1)
    // lightning through the glass
    const fl = (at, life) => {
      const w = t - at
      return w > 0 && w < life ? (1 - w / life) * 0.2 : 0
    }
    ART.skyFlash(ctx, fl(EV.booms[0] - 3.333, 0.4) + fl(EV.booms[0] - 0.666, 0.35))
    // headlights snap on at 47.333: beams sweep the road ahead
    if (g > EV.lampsOn - 40) {
      const lk = E.outCubic(seg(g, EV.lampsOn - 40, EV.lampsOn - 40 + 0.12))
      ART.headBeams(ctx, 300, 640, 0.16, 1500, lk * 0.8)
      // the colossal bald silhouette beginning to fill the beams
      ctx.fillStyle = `rgba(8,10,14,${0.85})`
      ctx.beginPath()
      ctx.ellipse(1210, 500 + (1 - lk) * 200, 150, 120, 0.15, 0, 7)
      ctx.fill()
    }
  } else {
    // ---- MACRO: the water cup (44.0-47.5) ----
    cam(ctx, 1, 960, 620, ...shakeXY(t, Math.max(...EV.booms.map((bm) => hitShake(t, bm, 2.5, 0.3)))))
    // dark cab backdrop + rear window
    ctx.fillStyle = '#0a0d12'
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    ctx.fillStyle = '#10151c'
    ctx.beginPath()
    ctx.moveTo(200, 138)
    ctx.quadraticCurveTo(960, 108, 1720, 138)
    ctx.lineTo(1640, 430)
    ctx.quadraticCurveTo(960, 470, 280, 430)
    ctx.closePath()
    ctx.fill()
    ART.rainClip(ctx, { x: 280, y: 150, w: 1360, h: 290 }, t, 0.9)
    // the cup LARGE in frame, rings exactly on the booms
    ART.waterCup(ctx, 960, 830, 2.35, t, EV.booms)
    // headlight snap washes the frame at 47.333
    if (g > EV.lampsOn - 40) {
      const lk = seg(g, EV.lampsOn - 40, EV.lampsOn - 40 + 0.1)
      ART.skyFlash(ctx, lk * 0.22, '255,240,200')
      // a bald crown edge rises into the rear window
      ctx.fillStyle = 'rgba(10,12,16,0.9)'
      ctx.beginPath()
      ctx.ellipse(1160, 430 - seg(g, EV.lampsOn - 40, 7.5) * 120, 190, 120, 0.1, 0, 7)
      ctx.fill()
    }
  }
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S6 — REX BREAKOUT ==============================
function drawBreakout(ctx, lt, t) {
  const { g, stop } = CLOCKS['rex-breakout'].warp(lt)
  // whip up as it rises, then handheld sway around the jeep
  const k = 1.0 + 0.1 * E.outCubic(seg(g, 0, 0.5)) - 0.04 * seg(g, 2, 6.5)
  const sway = Math.sin(g * 0.9) * 10 * (g > 1 ? 1 : 0.3)
  cam(ctx, k, 960 + sway, 620, ...shakeXY(t, hitShake(t, EV.smash, 10, 0.55) + (g > 1 && stop == null && g < 5.9 ? 1.1 : 0)))
  ctx.drawImage(S.bake.paddock, -OS, -OS)
  ART.rain(ctx, t, 1)
  // headlight strobe from the jeep (right), punishing the fence line
  const strobe = 0.75 + 0.25 * (hash(Math.floor(t * 24)) > 0.4 ? 1 : 0)
  ART.headBeams(ctx, GEO.paddock.jeepX - 120, GEO.paddock.jeepFeet - 62, Math.PI - 0.18, 1300, strobe)
  // puddle glints under the strobe
  for (const [px, py] of [[420, 800], [980, 880]]) {
    ctx.fillStyle = `rgba(220,228,240,${0.08 * strobe})`
    ctx.beginPath()
    ctx.ellipse(px, py, 110, 22, 0, 0, 7)
    ctx.fill()
  }
  // ---- THE FENCE: snaps at the smash ----
  const snap = seg(g, EV.smash - 47.5, EV.smash - 47.5 + 0.4)
  ART.fence(ctx, -OS, W + OS, GEO.paddock.fenceY, t, { snap, midX: 900 })
  // ---- THE B-REX rises through the wires ----
  const rise = E.outQuad(seg(g, 0, EV.smash - 47.5))
  const off = (1 - rise) * 430
  // walk-in keyframes (pure in g): fence -> forward -> snarl -> circle -> windup
  const keys = [[0.5, 900], [EV.boom4 - 47.5, 1010], [EV.snarl - 47.5, 1080], [EV.circle - 47.5, 1010], [EV.windup - 47.5, 1120]]
  let rx = 900
  for (let i = 0; i < keys.length - 1; i++) {
    if (g >= keys[i][0] && g < keys[i + 1][0]) rx = lerp(keys[i][1], keys[i + 1][1], seg(g, keys[i][0], keys[i + 1][0]))
  }
  if (g >= keys[keys.length - 1][0]) rx = keys[keys.length - 1][1]
  const stepPh = g / 1.333
  const bob = stop != null ? 0 : Math.abs(Math.sin(stepPh * Math.PI)) * 5 * (g > EV.smash - 47.5 ? 1 : 0)
  const sniff = E.inOutCubic(seg(g, EV.snarl - 47.5, EV.snarl - 47.5 + 0.6)) * (1 - E.inOutCubic(seg(g, EV.circle - 47.5, EV.circle - 47.5 + 0.5)))
  const crouch = E.inOutCubic(seg(g, EV.windup - 47.5 - 0.4, EV.windup - 47.5))
  const jaw = Math.sin(Math.PI * cl(seg(g, EV.snarl - 47.5, EV.snarl - 47.5 + 1.0))) * 0.75
  ART.contactShadow(ctx, rx, GEO.paddock.rexFeet, 150, 0.42)
  ART.brex(ctx, rx, GEO.paddock.rexFeet + off + bob, 1.32, t, {
    dir: 1, jaw, stride: stepPh, sniff, crouch, wet: 0.85, specX: 0.5 + Math.sin(t * 1.2) * 0.42,
    lean: sniff * 0.5 - crouch * 0.4,
  })
  // ---- impacts (real t): smash burst + footfall mud ----
  const sAge = t - EV.smash
  if (sAge > -0.02 && sAge < 1.2) {
    ART.debrisBurst(ctx, 940, GEO.paddock.fenceY - 20, sAge, 61, { n: 14, vx: 380, vy: 300, life: 1.0, col: '#5e564a', col2: '#3a342c' })
    ART.sparkBurst(ctx, 940, GEO.paddock.fenceY - 60, sAge, 62, { n: 9, reach: 90 })
    ART.shockRing(ctx, 950, GEO.paddock.fenceY, sAge, 0.5)
    ART.dustBurst(ctx, 950, GEO.paddock.rexFeet - 10, sAge, 63, { n: 18, spread: 260, life: 1.0 })
  }
  for (const bm of [EV.boom4, EV.snarl, EV.circle, EV.windup]) {
    ART.dustBurst(ctx, rx + 40, GEO.paddock.rexFeet - 6, t - bm, 70 + bm, { n: 8, spread: 150, life: 0.7 })
    ART.shockRing(ctx, rx + 40, GEO.paddock.rexFeet, t - bm, 0.35)
  }
  // mud specks fly at every boom
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S7 — REX VS JEEP ==============================
function drawRexJeep(ctx, lt, t) {
  const { g, stop } = CLOCKS['rex-jeep'].warp(lt)
  const shake = hitShake(t, EV.slam, 8, 0.4) + hitShake(t, EV.flip, 12, 0.6) + hitShake(t, EV.flip + 0.57, 8, 0.5)
  cam(ctx, 1.02, 1000, 640, ...shakeXY(t, shake))
  ctx.drawImage(S.bake.paddock, -OS, -OS)
  ART.rain(ctx, t, 1)
  // ---- jeep motion (pure in g; freezes at the launch instant) ----
  const u = Math.max(0, g - (EV.flip - 54))
  const land = 0.573
  let jx = GEO.rexJeep.jeep[0], jy = 0, jrot = 0
  const wreck = u >= land
  if (u > 0 && !wreck) {
    jx += 240 * u
    jy = -(860 * u - 1500 * u * u)
    jrot = u * 5.6
  } else if (wreck) {
    const w2 = u - land
    jx += 240 * land + 40 * w2 * Math.exp(-w2 / 0.3)
    jrot = Math.PI + 0.16 * Math.exp(-w2 * 7) * Math.sin(w2 * 26)
  }
  // shove skid before the flip
  const shove = seg(g, EV.shove - 54, EV.shove - 54 + 0.45)
  if (u <= 0) jx += 46 * E.outCubic(shove)
  // dent at the slam
  const dent = g > EV.slam - 54 ? 1 : 0
  // ---- the B-REX: slam -> shove -> rear-sag windup -> flip -> step over ----
  let rx = GEO.rexJeep.rex[0]
  if (g > EV.stepOver - 54) rx = lerp(rx, rx + 240, seg(g, EV.stepOver - 54, EV.stepOver - 54 + 1.2))
  else if (g > EV.slam - 54) rx = lerp(rx, rx + 60, seg(g, EV.slam - 54, EV.slam - 54 + 1.0))
  const stepPh = g / 1.333
  const crouch = E.inOutCubic(seg(g, EV.flip - 54 - 0.42, EV.flip - 54)) * (u > 0 ? 1 - E.outQuad(seg(u, 0, 0.5)) : 1)
  const jaw = Math.sin(Math.PI * cl(seg(g, EV.slam - 54, EV.slam - 54 + 0.8))) * 0.55 +
    (g > EV.flip - 54 && g < EV.flip - 54 + 0.5 ? 0.5 : 0)
  ART.contactShadow(ctx, rx, GEO.rexJeep.rex[1], 150, 0.42)
  ART.brex(ctx, rx, GEO.rexJeep.rex[1] - (u > 0 && !wreck ? 0 : 0), 1.32, t, {
    dir: 1, jaw, stride: stepPh, crouch, wet: 0.9, specX: 0.5 + Math.sin(t * 1.3) * 0.4,
    lean: crouch * -0.5 + (g > EV.stepOver - 54 ? 0.2 : 0),
  })
  // ---- the jeep (drawn after the rex when airborne so it reads in front) ----
  if (!wreck && u > 0) {
    // swinging headlight beams during the flip
    const fx2 = jx + Math.cos(jrot) * 130, fy2 = jy + Math.sin(jrot) * 130
    ART.headBeams(ctx, fx2, fy2 - 60, jrot + 0.3, 700, 0.7)
  }
  ART.jeep(ctx, jx, GEO.rexJeep.jeep[1] + jy, 1.0, { dent, crack: dent, beams: g < EV.flip - 54, wreck, wreckRot: jrot })
  // glass + mud on the slam and the landing (real t)
  const slamAge = t - EV.slam
  if (slamAge > -0.02 && slamAge < 0.8) {
    ART.sparkBurst(ctx, jx - 60, GEO.rexJeep.jeep[1] - 140, slamAge, 81, { n: 8 })
    ART.dustBurst(ctx, jx - 30, GEO.rexJeep.jeep[1] - 20, slamAge, 82, { n: 10, spread: 170, life: 0.7 })
  }
  const fAge = t - EV.flip
  if (fAge > -0.02 && fAge < 0.9) {
    ART.shockRing(ctx, jx, GEO.rexJeep.jeep[1] - 60, fAge, 0.45)
    ART.sparkBurst(ctx, jx + 40, GEO.rexJeep.jeep[1] - 90, fAge, 83, { n: 10, reach: 80 })
  }
  const landAge = t - (EV.flip + land)
  if (landAge > -0.02 && landAge < 1.1) {
    ART.dustBurst(ctx, jx, GEO.rexJeep.jeep[1], landAge, 84, { n: 22, spread: 300, life: 0.9, col: '#54432e' })
    ART.debrisBurst(ctx, jx, GEO.rexJeep.jeep[1] - 10, landAge, 85, { n: 10, vx: 300, vy: 260, life: 0.9, col: '#4a3e2c', col2: '#2e261a' })
    ART.shockRing(ctx, jx, GEO.rexJeep.jeep[1], landAge, 0.5)
  }
  // step-over boom dust
  ART.dustBurst(ctx, rx + 40, GEO.rexJeep.rex[1] - 6, t - EV.stepOver, 86, { n: 10, spread: 170, life: 0.8 })
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S8 — FLARE ESCAPE ==============================
function drawFlare(ctx, lt, t) {
  const { g } = CLOCKS['flare-escape'].warp(lt)
  cam(ctx, 1.04, 900, 620, ...shakeXY(t, hitShake(t, EV.snap, 5, 0.35)))
  ctx.drawImage(S.bake.paddock, -OS, -OS)
  ART.rain(ctx, t, 0.9)
  const wreckX = GEO.flare.wreck[0]
  // the roof-down wreck from the flip, sitting in the mud
  ART.jeep(ctx, wreckX, GEO.flare.wreck[1], 1.0, { wreck: true, wreckRot: Math.PI })
  // ---- Growgrant pops the flare (58.0) ----
  const gFeet = GEO.flare.grant[1]
  const gAge = t - EV.flarePop
  const flareLit = gAge > 0
  const thrown = g > EV.doorClank + 0.5
  // flare position: in hand -> hurled arc toward the rex -> snapped -> fizzling on the grass
  let flX = GEO.flare.grant[0] + 34, flY = gFeet - 150, flareGlow = 1
  if (thrown) {
    const u = seg(g, EV.doorClank + 0.5 - 58, EV.snap - 58)
    if (u < 1) {
      flX = lerp(GEO.flare.grant[0] + 34, 1046, u)
      flY = lerp(gFeet - 150, 640, u) - Math.sin(u * Math.PI) * 160
    } else if (g < EV.snap - 58 + 0.18) {
      flX = 1046; flY = 640
    } else {
      const u2 = seg(g, EV.snap - 58 + 0.18, EV.fizzle - 58 + 0.4)
      flX = 1050
      flY = lerp(650, 892, E.inQuad(u2))
      flareGlow = 1 - 0.55 * u2
    }
  }
  if (gAge > 0) {
    ART.contactShadow(ctx, GEO.flare.grant[0], gFeet, 32, 0.36)
    sprite(ctx, S.grant, GEO.flare.grant[0], gFeet, {
      ...(thrown ? { lift: [6, 2], stride: [8, -4], lean: 0.24 } : { lift: [2, 0], stride: [1, 0], lean: 0.05 }),
      sx: 1.8, sy: 1.8,
    })
    fieldHat(ctx, GEO.flare.grant[0] + 2, ART.crownY(S.grant, gFeet, 1.8) + 12, 1.8)
  }
  // ---- the kids scramble and dash ----
  const kidsU = seg(g, EV.doorClank - 58, EV.doorClank - 58 + 0.3)
  if (kidsU > 0) {
    for (const [who, kx0, sd] of [['tim', wreckX + 80, 0], ['lexi', wreckX + 130, 1]]) {
      const dash = E.inQuad(seg(g, EV.kidsDash - 58 + sd * 0.1, EV.kidsDash - 58 + 2.2 + sd * 0.1))
      const kx = lerp(kx0, -140, dash)
      if (kx < -130) continue
      ART.contactShadow(ctx, kx, 940 - sd * 8, 20, 0.3)
      sprite(ctx, S[who], kx, 940 - sd * 8, {
        ...(dash > 0 && dash < 1 ? ART.walkCyc(g * 13 + sd, 7) : { lift: [4, 2], stride: [2, 0], lean: 0.1 }),
        sx: 1.4, sy: 1.4,
      })
    }
  }
  // ---- the B-REX wheels to the light ----
  const wheelU = seg(g, EV.wheel - 58, EV.wheel - 58 + 1.0)
  const rX = lerp(GEO.flare.rex[0] + 160, GEO.flare.rex[0], E.outCubic(wheelU))
  const lungeU = seg(g, EV.snap - 58 - 0.5, EV.snap - 58)
  const trackAng = Math.atan2(flY - (945 - 340), flX - (rX + 150))
  ART.contactShadow(ctx, rX, GEO.flare.rex[1], 150, 0.42)
  ART.brex(ctx, rX, GEO.flare.rex[1], 1.32, t, {
    dir: -1,
    jaw: g > EV.snap - 58 - 0.5 && g < EV.snap - 58 ? 0.85 : g > EV.snap - 58 && g < EV.snap - 58 + 0.4 ? 0.1 : 0.25 + 0.1 * Math.sin(t * 1.4),
    stride: g / 1.333,
    lean: wheelU * 0.3 + lungeU * 0.4,
    wet: 0.9, specX: 0.5 + Math.sin(t * 1.1) * 0.4,
  })
  // ---- THE FLARE itself: bloom + sparks + smoke ----
  if (flareLit) {
    const puff = 1 + Math.sin(t * 22) * 0.18
    const gr = ctx.createRadialGradient(flX, flY, 2, flX, flY, 60 * puff)
    gr.addColorStop(0, 'rgba(255,240,210,0.95)')
    gr.addColorStop(0.3, `rgba(255,72,40,${0.7 * flareGlow})`)
    gr.addColorStop(1, 'rgba(255,60,30,0)')
    ctx.fillStyle = gr
    ctx.fillRect(flX - 70, flY - 70, 140, 140)
    ctx.fillStyle = '#fff0d0'
    ctx.fillRect(flX - 3, flY - 3, 6, 6)
    // red spark stream + smoke trail
    for (let i = 0; i < 8; i++) {
      const a = hash(i * 7 + Math.floor(t * 20)) * 6.28
      const d = 10 + hash(i * 3 + Math.floor(t * 16)) * 26
      ctx.fillStyle = `rgba(255,${90 + hash(i) * 80 | 0},40,${0.7 * flareGlow})`
      ctx.fillRect(flX + Math.cos(a) * d, flY + Math.sin(a) * d, 2.6, 2.6)
    }
    if (thrown) {
      ctx.globalAlpha = 0.25 * flareGlow
      ctx.strokeStyle = '#8a8478'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(flX, flY)
      ctx.quadraticCurveTo(flX - 30, flY + 26, flX - 66, flY + 40)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }
  // snap sparks
  const snapAge = t - EV.snap
  if (snapAge > -0.02 && snapAge < 0.5) {
    ART.sparkBurst(ctx, 1046, 640, snapAge, 91, { n: 10, reach: 70 })
    ART.shockRing(ctx, 1046, 640, snapAge, 0.35)
  }
  // fizzle embers on the grass
  if (g > EV.fizzle - 58) {
    for (let i = 0; i < 6; i++) {
      const a2 = ((t * 0.8 + hash(i * 3)) % 1)
      ctx.fillStyle = `rgba(255,120,50,${(1 - a2) * 0.5 * flareGlow})`
      ctx.fillRect(1050 + Math.sin(t * 3 + i) * 14, 888 - a2 * 40, 2.4, 2.4)
    }
  }
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S9 — KITCHEN ==============================
function drawKitchen(ctx, lt, t) {
  const g = lt
  cam(ctx, 1.05, 1050, 640, ...shakeXY(t, hitShake(t, EV.clang, 3.5, 0.3)))
  ctx.drawImage(S.bake.kitchen, -OS, -OS)
  // flashlight beams raking from the left
  for (const [bx, ang] of [[-60, 0.22], [-140, 0.34]]) {
    ART.headBeams(ctx, bx, 420, ang, 1400, 0.32)
  }
  // dust in the light shafts
  for (let i = 0; i < 12; i++) {
    const px = 300 + hash(i * 7) * 1200, py = 400 + hash(i * 13) * 400
    const ph = t * (0.4 + hash(i) * 0.5) + i
    ctx.globalAlpha = 0.08 + 0.1 * Math.sin(ph * 1.7)
    ctx.fillStyle = '#d8e4ec'
    ctx.fillRect(px + Math.sin(ph) * 16, py + Math.cos(ph * 0.8) * 12, 2, 2)
  }
  ctx.globalAlpha = 1
  // freezer steam
  ART.fogBank(ctx, t, 700, 160, 12, 0.1)
  // ---- the kids crouched at the island corner (right end) ----
  const kids = [['tim', 1300, 918], ['lexi', 1368, 922]]
  const slip = seg(g, EV.latch - 64, EV.latch - 64 + 1.2)
  for (const [who, kx0, kf] of kids) {
    const kx = lerp(kx0, GEO.kitchen.door[0], E.inQuad(slip))
    if (slip >= 1) continue
    const crouch = 0.8 - 0.06 * Math.sin(g * 2 + kx0)
    ART.contactShadow(ctx, kx, kf, 22, 0.3)
    sprite(ctx, S[who], kx, kf, {
      lift: [3, 1], stride: [1, 0],
      lean: 0.16 + (who === 'lexi' ? -0.04 : 0),
      sx: 1.36 * crouch, sy: 1.36 * crouch,
    })
  }
  // ---- Lexi's spoon: trembling -> dropped -> clanging to rest ----
  const dropU = seg(g, EV.clang - 0.12 - 64, EV.clang - 64)
  const lexX = lerp(1368, GEO.kitchen.door[0], E.inQuad(slip))
  if (dropU < 1 && slip < 1) {
    const trem = g > EV.tremble - 64 ? Math.sin(t * 40) * (2 + 3 * seg(g, EV.tremble - 64, EV.clang - 64)) : 0
    const sy2 = lerp(838, 912, E.inQuad(dropU))
    ctx.save()
    ctx.translate(lexX + 18 + trem * (1 - dropU), sy2)
    ctx.rotate(dropU * 2.4)
    ctx.strokeStyle = '#c8d0d8'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, 30)
    ctx.stroke()
    ctx.fillStyle = '#d8e0e8'
    ctx.beginPath()
    ctx.ellipse(0, -4, 7, 10, 0, 0, 7)
    ctx.fill()
    ctx.restore()
  } else {
    // spoon at rest on the tiles, one settle bounce
    const restAge = g - (EV.clang - 64)
    const bounce = restAge < 0.3 ? Math.sin(restAge * 26) * 4 * (1 - restAge / 0.3) : 0
    ctx.strokeStyle = '#a8b2bc'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(lexX + 4, 928 - Math.max(0, bounce))
    ctx.lineTo(lexX + 30, 924 - Math.max(0, bounce))
    ctx.stroke()
  }
  // ---- THE MULLETORAPTOR head over the island ----
  const stepU = seg(g, EV.rapStep - 64, EV.rapStep - 64 + 0.5)
  const snoutU = seg(g, EV.snoutTurn - 64, EV.snoutTurn - 64 + 0.5)
  const strandU = seg(g, EV.strand - 64, EV.strand - 64 + 0.6)
  const screechU = seg(g, EV.screech - 64, EV.screech - 64 + 0.5)
  const rx = lerp(1620, 1560, stepU) + (screechU > 0 ? -110 * E.inQuad(screechU) : 0)
  const sniff = 0.5 + snoutU * 0.1 - screechU * 1.15
  const jaw = screechU > 0 ? 0.85 * E.outQuad(screechU) : 0.12 + 0.06 * Math.sin(t * 2.2)
  // reflection in the island's steel flank FIRST (behind), clipped + ghosted
  ctx.save()
  ctx.beginPath()
  ctx.rect(516, 594, 728, 190)
  ctx.clip()
  ctx.globalAlpha = 0.22
  ctx.translate(0, 2 * 688)
  ctx.scale(1, -1)
  ART.raptor(ctx, rx, 935, 2.7, t, { dir: -1, jaw, sniff, steel: 0.5, mullet: 1 })
  ctx.restore()
  // steel gloss over the panel
  ctx.fillStyle = 'rgba(122,134,146,0.12)'
  ctx.fillRect(516, 594, 728, 190)
  // the raptor itself (in front of the island's right corner)
  ART.contactShadow(ctx, rx, 935, 90, 0.4)
  ART.raptor(ctx, rx, 935, 2.7, t, { dir: -1, jaw, sniff, steel: 0.35, mullet: 1, run: g * 2.4 })
  // breath fog at the snout on the turn
  const breathAge = t - EV.snoutTurn
  if (breathAge > 0 && breathAge < 1.2) {
    ctx.globalAlpha = Math.sin(cl(breathAge / 1.2) * Math.PI) * 0.3
    ctx.fillStyle = '#dce8f0'
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.ellipse(1300 - i * 40 - breathAge * 60, 700 - i * 10, 14 + i * 8 + breathAge * 18, 8 + i * 5, 0, 0, 7)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  // ---- LEXI'S MINT STRAND inches from the nostril ----
  if (strandU > 0 && slip < 0.9) {
    const nostril = [rx - 88 * 2.7, 935 - 68 * 2.7]
    const tip = lerp(lerp(1368, GEO.kitchen.door[0], E.inQuad(slip)) + 40, nostril[0] + 26, strandU)
    ctx.save()
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#7ad8a8'
    ctx.lineWidth = 4.4
    ctx.beginPath()
    ctx.moveTo(lexX + 6, 922 - 108)
    ctx.quadraticCurveTo((lexX + nostril[0]) / 2, 922 - 150, tip, lerp(800, nostril[1] + 26, strandU))
    ctx.stroke()
    ctx.strokeStyle = '#aef0cc'
    ctx.lineWidth = 1.8
    ctx.stroke()
    ctx.restore()
  }
  // clang flash + ring at the spoon impact (real t)
  const clangAge = t - EV.clang
  if (clangAge > -0.02 && clangAge < 0.5) {
    ART.sparkBurst(ctx, lexX + 16, 916, clangAge, 95, { n: 6, reach: 34 })
    ART.shockRing(ctx, lexX + 16, 920, clangAge, 0.4, 'rgba(200,220,235,0.7)')
  }
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S10 — CLEVER GIRL ==============================
function drawCleverGirl(ctx, lt, t) {
  const g = lt
  cam(ctx, 1.0 + 0.08 * seg(g, 0, 3), 960, 620, ...shakeXY(t, hitShake(t, EV.pounce, 9, 0.5)))
  ctx.drawImage(S.bake.sheds, -OS, -OS)
  ART.rain(ctx, t, 0.8)
  // ---- Mulldoon in the fan-light ----
  const mx0 = GEO.sheds.mulldoon[0], mf = GEO.sheds.mulldoon[1]
  const downU = seg(g, EV.pounce - 73, EV.pounce - 73 + 0.28)
  const mx = lerp(mx0, mx0 - 60, E.outCubic(downU))
  const mrot = downU * 1.35
  ART.contactShadow(ctx, mx, mf, 34, 0.36)
  sprite(ctx, S.mulldoon, mx, mf, {
    ...(downU > 0 ? { lift: [6, 2], stride: [4, -4] } : { lift: [2, 0], stride: [1, 0], lean: 0.03 + Math.sin(g * 1.4) * 0.02 }),
    rot: mrot, sx: 1.95, sy: 1.95,
  })
  // ---- the BIGGEST-MULLET mulletraptor: lightning reveal, then the pounce ----
  const lAge = t - (EV.pounce - 0.1)
  const reveal = cl(lAge / 0.12)
  const pounceU = seg(g, EV.pounce - 73, EV.pounce - 73 + 0.26)
  const pxx = lerp(340, 850, E.inQuad(pounceU))
  const pyy = mf - Math.sin(pounceU * Math.PI) * 120
  ART.contactShadow(ctx, pxx, mf + 4, 80 * (1 - pounceU * 0.6), 0.4)
  ART.raptor(ctx, pxx, pyy, 2.1, t, {
    dir: 1, mullet: 1.35, sil: true,
    jaw: pounceU > 0.4 ? 0.8 : 0.2,
    pounce: pounceU,
    crouch: g > EV.settle - 73 ? 0.75 : 0.15,
    run: g * 3,
  })
  // the lightning flash that reveals the silhouette
  const boltK = lAge > 0 && lAge < 0.3 ? 1 - lAge / 0.3 : 0
  if (boltK > 0) {
    ART.bolt(ctx, 300, 130, 520, 330, 21, boltK)
    ART.skyFlash(ctx, boltK * 0.2)
  }
  // pounce impact (real t)
  const pAge = t - EV.pounce
  if (pAge > -0.02 && pAge < 0.8) {
    ART.dustBurst(ctx, 880, mf, pAge, 97, { n: 16, spread: 240, life: 0.8, col: '#3a3226' })
    ART.shockRing(ctx, 880, mf - 10, pAge, 0.4)
  }
  // ---- darkness takes the frame ----
  const dark = seg(g, EV.settle - 73 + 0.2, 3.95)
  if (dark > 0) {
    ctx.fillStyle = `rgba(4,5,8,${0.9 * dark})`
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  }
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S11 — SHOWDOWN ==============================
function drawShowdown(ctx, lt, t) {
  const { g, stop } = CLOCKS['showdown'].warp(lt)
  // wide under the banner -> crash-zoom at the wall burst -> low hero angle
  let k = 1.0, cx = 960, cy = 600
  if (g > EV.crash - 77 - 0.3 && g < EV.crash - 77 + 0.8) {
    const u = seg(g, EV.crash - 77 - 0.3, EV.crash - 77 + 0.5)
    k = lerp(1.0, 1.3, E.outCubic(u)); cx = lerp(960, 1080, u); cy = lerp(600, 620, u)
  } else if (g >= EV.crash - 77 + 0.8) {
    k = 1.22; cx = 1060; cy = 610
  }
  cam(ctx, k, cx, cy, ...shakeXY(t, hitShake(t, EV.crash, 12, 0.6) + hitShake(t, EV.seize, 7, 0.4) + hitShake(t, EV.banner, 6, 0.4)))
  ctx.drawImage(S.bake.lobby, -OS, -OS)
  // moonlight shafts from the high windows
  for (const wx of [1350, 1620]) {
    ctx.fillStyle = 'rgba(190,205,235,0.10)'
    ctx.beginPath()
    ctx.moveTo(wx, 250)
    ctx.lineTo(wx + 130, 250)
    ctx.lineTo(wx + 260, 942)
    ctx.lineTo(wx - 60, 942)
    ctx.closePath()
    ctx.fill()
  }
  // ---- the heroes, backs to the wall ----
  const slip = seg(g, EV.slipOut - 77, EV.slipOut - 77 + 1.4)
  const heroes = [
    ['grant', GEO.lobby.heroes[0], 1.8, true],
    ['malcomb', GEO.lobby.heroes[1], 1.78, false],
    ['tim', GEO.lobby.heroes[2], 1.42, false],
    ['lexi', GEO.lobby.heroes[3], 1.4, false],
  ]
  for (const [who, [hx, hf], hs, hat] of heroes) {
    const hx2 = lerp(hx, -160, E.inQuad(slip))
    if (hx2 < -150) continue
    ART.contactShadow(ctx, hx2, hf, 26, 0.32)
    sprite(ctx, S[who], hx2, hf, {
      ...(slip > 0 ? ART.walkCyc(g * 9 + hx, 6) : { lift: [2, 0], stride: [1, 0], lean: -0.04 }),
      sx: hs, sy: hs,
    })
    if (hat) fieldHat(ctx, hx2 + 2, ART.crownY(S.grant, hf, hs) + 12, hs)
  }
  // ---- the two mulletraptors corner them ----
  const r1x = lerp(1500, 1150, seg(g, 0, EV.click2 - 77)) + (g > EV.hiss1 - 77 ? Math.sin(t * 2.2) * 8 : 0)
  const r2x = lerp(1720, 1420, seg(g, 0.5, EV.click2 - 77))
  // raptor 1 is SEIZED at 84.5: lifted into the rex's jaws and thrashed
  const seizeU = seg(g, EV.seize - 77, EV.seize - 77 + 0.3)
  const thrashAge = g - (EV.thrash - 77)
  const r1Seized = seizeU > 0
  const mouthX = 1180 + (r1Seized ? Math.sin(thrashAge * 9) * 26 * (thrashAge > 0 ? 1 : 0) : 0)
  const mouthY = 600 + (r1Seized ? Math.cos(thrashAge * 7) * 16 * (thrashAge > 0 ? 1 : 0) : 0)
  const r1drawX = r1Seized ? lerp(r1x, mouthX, E.outCubic(seizeU)) : r1x
  const r1feet = r1Seized ? lerp(950, mouthY + 180, E.outCubic(seizeU)) : 950
  if (!(r1Seized && seizeU >= 1)) {
    ART.contactShadow(ctx, r1drawX, 950, 70, 0.36)
    ART.raptor(ctx, r1drawX, r1feet, 2.2, t, {
      dir: -1, mullet: 1,
      jaw: g > EV.hiss1 - 77 && g < EV.hiss1 - 77 + 0.4 ? 0.7 : g > EV.hiss2 - 77 && g < EV.hiss2 - 77 + 0.4 ? 0.7 : 0.2,
      crouch: 0.1, run: g * 2,
    })
  }
  if (!r1Seized) {
    ART.contactShadow(ctx, r2x, 950, 66, 0.36)
    ART.raptor(ctx, r2x, 950, 2.1, t, {
      dir: -1, mullet: 1.1,
      jaw: g > EV.click1 - 77 && g < EV.click1 - 77 + 0.3 ? 0.5 : 0.15,
      crouch: 0.1, run: g * 2.2,
    })
  } else {
    // raptor 2 flees after the seize
    const flee = seg(g, EV.roar2 - 77 - 0.5, EV.roar2 - 77 + 1.2)
    if (flee < 1) {
      ART.raptor(ctx, lerp(1420, 2100, E.inQuad(flee)), 950, 2.1, t, { dir: 1, mullet: 1.1, run: g * 8, crouch: 0 })
    }
  }
  // ---- THE WALL BURST (83.0): hole + masonry + the B-REX ----
  const burst = seg(g, EV.crash - 77, EV.crash - 77 + 0.25)
  if (burst > 0) {
    // jagged hole over the baked wall
    ctx.fillStyle = '#080a0e'
    ctx.beginPath()
    ctx.moveTo(760, 780)
    ctx.lineTo(790, 560)
    ctx.lineTo(860, 500)
    ctx.lineTo(950, 470)
    ctx.lineTo(1060, 500)
    ctx.lineTo(1130, 580)
    ctx.lineTo(1150, 780)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#484c56'
    ctx.lineWidth = 14
    ctx.stroke()
    // rim of rubble
    ctx.fillStyle = '#565a64'
    for (const [bx, by] of [[780, 640], [820, 520], [1080, 520], [1130, 660]]) {
      ctx.beginPath()
      ctx.ellipse(bx, by, 20, 12, hash(bx) * 3, 0, 7)
      ctx.fill()
    }
  }
  const enter = E.outCubic(seg(g, EV.crash - 77, EV.crash - 77 + 1.1))
  const rexX = lerp(1120, 1010, enter)
  const rexS = lerp(0.9, 1.5, enter)
  const seizeJaw = seizeU > 0 ? (thrashAge > 0 ? 0.35 + 0.2 * Math.sin(thrashAge * 9) : 0.75) : 0.3
  const roarU = Math.sin(Math.PI * cl(seg(g, EV.roar2 - 77, EV.roar2 - 77 + 1.4)))
  ART.contactShadow(ctx, rexX, 950, 170 * rexS / 1.5, 0.42)
  ART.brex(ctx, rexX, 950, rexS, t, {
    dir: 1, jaw: Math.max(seizeJaw, roarU * 0.9),
    stride: g / 1.5,
    lean: enter < 1 ? 0.3 * (1 - enter) : 0,
    wet: 0.4, specX: 0.5 + Math.sin(t * 1.2) * 0.3,
  })
  // seized raptor IN the jaws (drawn after so it reads inside the mouth line)
  if (r1Seized && seizeU >= 1) {
    ctx.save()
    ctx.translate(mouthX, mouthY + 60)
    ctx.rotate(thrashAge > 0 ? Math.sin(thrashAge * 11) * 0.35 : 0.4)
    ART.raptor(ctx, 0, 60, 1.9, t, { dir: -1, mullet: 1, jaw: 0.9, crouch: 0.3, run: g * 12 })
    ctx.restore()
  }
  // masonry burst debris (real t)
  const cAge = t - EV.crash
  if (cAge > -0.02 && cAge < 1.6) {
    ART.debrisBurst(ctx, 950, 560, cAge, 101, { n: 20, vx: 460, vy: 420, life: 1.4 })
    ART.dustBurst(ctx, 950, 700, cAge, 102, { n: 24, spread: 380, life: 1.4, col: '#6a6e78' })
    ART.shockRing(ctx, 950, 620, cAge, 0.5)
  }
  // ---- THE BANNER: hangs, tears loose at 86.0, drapes over the rex ----
  const fall = seg(g, EV.banner - 77, EV.banner - 77 + 0.55)
  const drape = seg(g, EV.banner - 77 + 0.5, EV.banner - 77 + 1.3)
  const bx = lerp(lerp(960, 1040, fall), rexX + 150, drape)
  const bTop = lerp(lerp(206, 206 + 350, fall), 330, drape)
  ART.bannerCloth(ctx, bx, bTop, 740, 150, t, { fall, drape, fallDist: 350 })
  if (fall > 0 && fall < 1) {
    // cords snap
    ctx.strokeStyle = '#8a744e'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(620, 208)
    ctx.quadraticCurveTo(600, 240, 626 + fall * 40, 260 + fall * 60)
    ctx.stroke()
  }
  // ---- victory roar breath + searchlight sweep (helicopter arriving) ----
  if (roarU > 0.05) {
    ctx.globalAlpha = roarU * 0.2
    ctx.fillStyle = '#c8d4e0'
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.ellipse(rexX + 260 + i * 46, 560 - i * 24, 20 + i * 12, 10 + i * 6, 0, 0, 7)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  if (g > EV.rotor - 77) {
    const sw = seg(g, EV.rotor - 77, EV.rotor - 77 + 1.2)
    const px2 = lerp(700, 1500, sw)
    const grd = ctx.createRadialGradient(px2, 900, 10, px2, 900, 220)
    grd.addColorStop(0, 'rgba(210,220,190,0.16)')
    grd.addColorStop(1, 'rgba(210,220,190,0)')
    ctx.fillStyle = grd
    ctx.fillRect(px2 - 220, 700, 440, 300)
  }
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S12 — DAWN PAYOFF ==============================
function drawDawn(ctx, lt, t) {
  const { g, stop } = CLOCKS['dawn-payoff'].warp(lt)
  // aerial pull-away with the helicopter -> settle -> slow push for the regrow
  let k = lerp(1.45, 1.02, E.outCubic(seg(g, 0, 2.667)))
  let cx = lerp(1050, 1180, seg(g, 0, 2.667)), cy = lerp(520, 590, seg(g, 0, 2.667))
  if (g > 4.0) {
    const u = E.inOutCubic(seg(g, 4.0, 8.0))
    k = lerp(1.02, 1.3, u); cx = lerp(1180, 1430, u); cy = lerp(590, 600, u)
  }
  cam(ctx, k, cx, cy, ...shakeXY(t, hitShake(t, EV.roar, 8, 0.55)))
  ctx.drawImage(S.bake.dawn, -OS, -OS)
  // godrays pulsing from the sun
  for (const [ang, wd, al] of [[-0.5, 90, 0.1], [-0.25, 130, 0.08], [0.1, 100, 0.07]]) {
    ctx.save()
    ctx.globalAlpha = al * (1 + 0.3 * Math.sin(t * 0.7 + ang * 9))
    ctx.fillStyle = '#ffe8b8'
    ctx.beginPath()
    ctx.moveTo(820, 556)
    ctx.lineTo(820 + Math.cos(ang) * 1500 - wd, 556 + Math.sin(ang) * 1500)
    ctx.lineTo(820 + Math.cos(ang) * 1500 + wd, 556 + Math.sin(ang) * 1500)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ART.seaShimmer(ctx, 600, 760, t, 'rgba(255,220,150,0.4)')
  // ---- the helicopter lifts away over the sunrise sea ----
  const heliU = seg(g, 0, 3.0)
  if (heliU < 1) {
    const hx = lerp(1050, -260, E.inQuad(heliU))
    const hy = lerp(430, 150, E.inQuad(heliU))
    ART.heli(ctx, hx, hy, 0.72, t, { tilt: -0.1 - heliU * 0.08 })
  }
  // ---- THE B-REX, alone on the helipad ----
  const rx = GEO.dawn.rex[0], rf = GEO.dawn.rex[1], rs = 0.72
  // staging: crown shimmers to stubble (94.0) -> REGROW (95.333) -> full mane (96.667)
  const stubble = seg(g, EV.shimmer - 90, EV.regrow - 90) * 0.85
  const mane = E.outCubic(seg(g, EV.regrow - 90, EV.crests - 90 + 0.3))
  const wet = (1 - mane) * 0.55 * seg(g, EV.shimmer - 90 - 1, EV.shimmer - 90)
  const breathe = Math.sin(Math.PI * cl(seg(g, EV.inhale - 90, EV.roar - 90)))
  const jaw = Math.sin(Math.PI * cl(seg(g, EV.roar - 90, EV.roar - 90 + 1.5)))
  const roarLean = seg(g, EV.roar - 90, EV.roar - 90 + 0.4) * -0.5 + (g > EV.roar - 90 + 1.2 ? seg(g, EV.roar - 90 + 1.2, EV.roar - 90 + 1.8) * 0.3 : 0)
  ART.contactShadow(ctx, rx, rf, 110, 0.35)
  ART.brex(ctx, rx, rf, rs, t, {
    dir: -1,
    jaw,
    stride: 0,
    stubble,
    mane,
    wet,
    specX: seg(g, EV.shimmer - 90 - 1, EV.regrow - 90),
    breathe,
    lean: roarLean,
  })
  // dawn rim: warm edge on the crown/neck when the mane is in
  if (mane > 0.3) {
    ctx.save()
    ctx.strokeStyle = `rgba(255,214,140,${0.3 * mane})`
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(rx - 90 * rs, rf - 330 * rs, 80 * rs, -2.6, -1.2)
    ctx.stroke()
    ctx.restore()
  }
  // shimmer sparkles at the crown (94.0) + THE REGROW BURST (95.333, real t)
  const shAge = t - EV.shimmer
  if (shAge > 0 && shAge < EV.regrow - EV.shimmer) {
    for (let i = 0; i < 10; i++) {
      const ph = t * 3 + i * 2.1
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(ph)
      ctx.fillStyle = '#ffe8b8'
      ctx.fillRect(rx - 70 + hash(i * 7) * 140, rf - 380 + hash(i * 13) * 60, 2.6, 2.6)
    }
    ctx.globalAlpha = 1
  }
  const rAge = t - EV.regrow
  if (rAge > -0.02 && rAge < 2.0) {
    ART.shimmerBurst(ctx, rx - 60, rf - 330, rAge, 111, { n: 30, spread: 240, life: 1.6 })
    ART.shockRing(ctx, rx - 60, rf - 330, rAge, 0.6, 'rgba(255,220,150,0.6)')
    if (rAge < 0.3) ART.glint(ctx, rx - 70, rf - 360, 90, rAge / 0.3)
  }
  // the inhale: chest light + the roar wind gust through the fresh mane
  if (g > EV.roar + 0.5) {
    const gust = 1 + 0.5 * Math.sin((t - EV.roar) * 1.4)
    ctx.save()
    ctx.globalAlpha = 0.06 * gust
    ctx.fillStyle = '#ffe8b8'
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.ellipse(rx - 200 - i * 130, rf - 260 - i * 30, 90, 26, 0.2, 0, 7)
      ctx.fill()
    }
    ctx.restore()
  }
  // ---- closing card dim under the engine captions ----
  const dim = seg(g, 9.5, 10.3)
  if (dim > 0) {
    ctx.fillStyle = `rgba(10,8,14,${0.4 * dim})`
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    const rg = ctx.createRadialGradient(960, 540, 30, 960, 540, 460)
    rg.addColorStop(0, `rgba(255,214,150,${0.1 * dim})`)
    rg.addColorStop(1, 'rgba(255,214,150,0)')
    ctx.fillStyle = rg
    ctx.fillRect(500, 80, 920, 920)
  }
  ctx.restore()
  ART.bars(ctx)
}

// ============================== the film ==============================
const DRAW = {
  'isle-approach': drawIsle,
  'the-valley': drawValley,
  'lab-hatchery': drawLab,
  sabotage: drawControl,
  'rex-approach': drawApproach,
  'rex-breakout': drawBreakout,
  'rex-jeep': drawRexJeep,
  'flare-escape': drawFlare,
  kitchen: drawKitchen,
  'clever-girl': drawCleverGirl,
  showdown: drawShowdown,
  'dawn-payoff': drawDawn,
}

export default {
  title: 'HAIRASSIC PARK — a Remy Boys blockbuster',
  output: 'hairassic-park.mp4',
  duration: DURATION,
  async prepare() {
    S.bake = await ART.build()
    const load = (i, far) => A.loadRemy(i, far)
    // CAST (timeline-verified ids; repaints are baked once, shared rig untouched)
    S.hambl = ART.suitHambl(await load(5))            // white suit + bow tie, amber cane prop
    S.baldry = ART.neutBaldry(await load(48))         // neutral shirt
    S.malcomb = ART.blackMalcomb(await load(681))     // cobalt flow + gold shades kept
    S.grant = ART.fieldGrant(ART.stripSword(await load(42))) // tan field shirt, sword stripped
    S.mulldoon = ART.khakiMulldoon(await load(151))   // khaki warden
    S.tim = ART.solidTim(await load(44))              // solid amber sweater
    S.lexi = ART.solidLexi(await load(1))             // solid dusty-blue tee
    S.rangerA = await load(16)                        // as-is
    S.rangerB = ART.ranger49(await load(49))          // olive repaint
  },
  shots: SHOTS.map((sh) => ({
    name: sh.name,
    t0: sh.t0,
    t1: sh.t1,
    draw(ctx, lt, dur, t, overlay) {
      DRAW[sh.name](ctx, lt, t, overlay)
    },
    fx: () => {
      const lb = { letterbox: 1.0 }
      switch (sh.name) {
        case 'isle-approach':
          return { ...lb, bloom: 0.1, bloomThresh: 0.86, vignette: 1.05, sat: 0.62, tint: [0.9, 0.96, 1.14], streak: 0.1, aber: 0.0007, grain: 0.014, haze: 0.06, hazeColor: [0.3, 0.36, 0.46] }
        case 'the-valley':
          return { ...lb, bloom: 0.14, bloomThresh: 0.86, vignette: 0.5, grain: 0.012, warm: 0.14, sat: 1.05 }
        case 'lab-hatchery':
          return { ...lb, bloom: 0.12, bloomThresh: 0.86, vignette: 0.55, grain: 0.013, warm: 0.12 }
        case 'sabotage':
          return { ...lb, bloom: 0.1, bloomThresh: 0.88, vignette: 0.9, sat: 0.6, tint: [0.92, 0.97, 1.1], grain: 0.014, exposure: -0.06 }
        case 'rex-approach':
        case 'rex-breakout':
        case 'rex-jeep':
        case 'flare-escape':
          return { ...lb, bloom: 0.12, bloomThresh: 0.86, vignette: 1.05, sat: 0.55, tint: [0.9, 0.96, 1.14], streak: 0.12, aber: 0.0008, grain: 0.015, haze: 0.05, hazeColor: [0.28, 0.32, 0.42], exposure: -0.06 }
        case 'kitchen':
          return { ...lb, bloom: 0.1, bloomThresh: 0.88, vignette: 0.85, sat: 0.7, tint: [0.94, 0.98, 1.08], grain: 0.013, exposure: -0.06 }
        case 'clever-girl':
          return { ...lb, bloom: 0.1, bloomThresh: 0.86, vignette: 1.28, sat: 0.45, tint: [0.9, 0.96, 1.14], streak: 0.12, grain: 0.015, exposure: -0.12 }
        case 'showdown':
          return { ...lb, bloom: 0.12, bloomThresh: 0.86, vignette: 1.0, sat: 0.6, tint: [0.92, 0.97, 1.12], grain: 0.014, aber: 0.0006 }
        default: // dawn-payoff
          return { ...lb, bloom: 0.14, bloomThresh: 0.86, vignette: 0.55, grain: 0.012, warm: 0.16, sat: 1.06 }
      }
    },
  })),
  captions: CAPTIONS,
  captionStyles: {
    title: {
      font: 'Anton', size: 128, weight: '', color: '#f2e2b0', align: 'center',
      track: 3, glow: '#8a5f1c', glowBlur: 30, shadow: '#0a0806', anim: 'line',
    },
    line: {
      font: '"Space Grotesk"', size: 46, weight: 600, color: '#f5ead2', align: 'center',
      track: 1, shadow: '#0a0806', glow: '#000000', glowBlur: 8, anim: 'rise', rise: 16,
    },
    whisper: {
      font: '"Space Grotesk"', size: 40, weight: 600, color: '#cfdcec', align: 'center',
      track: 5, shadow: '#0a0c12', anim: 'fade',
    },
    banner: {
      font: 'Anton', size: 84, weight: '', color: '#e2b85a', align: 'center',
      track: 4, glow: '#6a4a10', glowBlur: 22, shadow: '#0a0806', anim: 'fade',
    },
  },
  flashes: [
    [2.0, 0.16, 0.5],
    [5.0, 0.2, 0.4],
    [38.5, 0.18, 0.35],
    [40.667, 0.14, 0.3],
    [43.333, 0.16, 0.3],
    [75.9, 0.24, 0.28],
  ],
  score,
  audio: { seed: 68, reverb: 1.2, reverbGain: 0.25 },
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } },
}
