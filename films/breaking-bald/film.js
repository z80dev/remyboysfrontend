// BREAKING BALD — A REMY BOYS CRIME EPIC. Picture for the timeline cue sheet:
// nine shots on the per-shot clocks' WORLD g, full-res painted stages baked in
// art.js build(), Heisenbald costume pieces anchored at the rig scalp line
// (crownY), impacts and flashes age on REAL t so they bloom through hit-stops.
// Pure in time: no Math.random, no Date, no state across frames; the letterbox
// bars paint last in every draw. All reading text is declarative CAPTIONS (or
// the two picture stamps the timeline mandates); the Br/Ba element BOXES are
// picture, the words they spell are captions.
import { W, H, hash, seg, lerp, E } from 'filmkit/lib.js'
import { stamp } from 'filmkit/motion.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import { OS } from './art.js'
import { score } from './score.js'
import {
  DUR, SHOTS, T,
  COLDOPEN_EV, TITLES_EV, CLASSROOM_EV, DECISION_EV, COOK_EV, DINER_EV, SAYMYNAME_EV, EMPIRE_EV, FINALE_EV,
  CLASSROOM, DECISION, COOK, DINER, SAYMYNAME, FINALE,
  MASTER, CAPTIONS, FLASHES, STYLES,
} from './timeline.js'

// ---------------- cast (casting.md-verified ids) ----------------
const WALT_ID = 42
const JESSE_ID = 186
const GUS_ID = 1217
const GUS5_ID = 5
const HANK_ID = 28
const HENCH_IDS = [129, 183]           // near flanks (warehouse)
const HOOD_IDS = [458, 564, 808, 892]  // hooded far rows (diner + warehouse)

const S = {}
const LAB_B = ART.LAB
const DESERT_C = ART.DESERT.crystal
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
// REAL-time shake: lives through freezes (slam/stamp shudder).
const shakeXY = (t, amp) => amp <= 0 ? [0, 0] : [
  (hash(Math.floor(t * 90) + 7) - 0.5) * 2 * amp,
  (hash(Math.floor(t * 90) + 99) - 0.5) * 2 * amp,
]
const standFl = (g) => ({ lift: [2, 0], stride: [1, 0], lean: 0.02 + Math.sin(g * 1.2) * 0.015 })
const walkCycF = (ph, amp = 5) => ART.walkCyc(ph, amp)

// Heisenbald costume stack, anchored at the rig scalp line.
function heisenLook(ctx, rig, x, feet, sy, o = {}) {
  const cy = ART.crownY(rig, feet, sy)
  if (o.hat > 0.02) ART.porkpie(ctx, x, cy, sy, o.hat, {})
  if (o.shades > 0.02) ART.shades(ctx, x, cy, sy, o.shades, o.shadeGlint ?? 0)
  if (o.goatee > 0.02) ART.goatee(ctx, x, cy, sy, o.goatee)
}

// ============================== S1 — COLD OPEN ==============================
// RV world path (frame-left far ridge -> mid-frame flats) + the macro cut.
const rvPath = (g) => (g < 0.8 ? -420 : g < 4.0 ? lerp(-420, 980, E.inOutCubic(seg(g, 0.8, 4.0))) : lerp(980, 1116, seg(g, 4.0, 6.3158)))
const rvProg = (g) => seg(g, 0.8, 4.4)
const rvGround = (g) => lerp(664, 812, E.inOutCubic(rvProg(g)))
const rvScale = (g) => lerp(0.34, 0.62, rvProg(g))

function drawColdopen(ctx, lt, t) {
  const g = lt
  const macro = g >= COLDOPEN_EV.glint
  if (!macro) {
    const push = seg(g, 0, COLDOPEN_EV.glint)
    cam(ctx, lerp(1.0, 1.15, E.inOutCubic(push)), lerp(860, 1010, push), 560)
    ctx.drawImage(S.bake.desert, -OS, -OS)
    // the RV chugs in with its dust tail
    const rg = g
    if (g >= COLDOPEN_EV.rvEnter - 0.05) {
      ART.contactShadow(ctx, rvPath(rg), rvGround(rg) + 2, 90 * rvScale(rg) * 1.4, 0.3)
      ART.rv(ctx, rvPath(rg), rvGround(rg), rvScale(rg), t, { moving: 1 })
      ART.dustTail(ctx, rvPath, 0, rg, COLDOPEN_EV.rvEnter - 0.2, rvScale(rg), {
        rate: 10, win: 2.8, yPath: rvGround,
      })
    }
    ART.dustDevil(ctx, 780, 1, t, 11)
    ART.dustDevil(ctx, 830, 0.7, t, 29)
    // the crystal waits in the sand — one far sparkle before the cut
    if (g > 5.2) ART.sparkle(ctx, DESERT_C[0], DESERT_C[1], 7, t, 3)
    ctx.restore()
  } else {
    // MACRO: dawn catches the blue crystal; glint ring on the cut, shimmer holds
    const breathe = 1 + 0.018 * Math.sin(t * 1.4)
    cam(ctx, 2.5 * breathe, DESERT_C[0], DESERT_C[1] + 26)
    ctx.drawImage(S.bake.desert, -OS, -OS)
    const glintK = seg(t - MASTER.glint, 0.04, 0.95)
    ART.crystal(ctx, DESERT_C[0], DESERT_C[1] + 14, 1.15, t, { glint: glintK, glowK: 1 })
    ctx.restore()
    ART.shimmer(ctx, 0, 560, W, 220, t, 3.2, 16)
  }
  // wide: shimmer over the flats too
  if (!macro) ART.shimmer(ctx, 0, 560, W, 160, t, 2.2, 12)
  // smash to black at 9.6
  const smash = seg(g, COLDOPEN_EV.smash, COLDOPEN_EV.smash + 0.35)
  if (smash > 0) {
    ctx.save()
    ctx.globalAlpha = smash
    ctx.fillStyle = '#020302'
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    ctx.restore()
  }
  ART.bars(ctx)
}

// ============================== S2 — TITLES ==============================
function drawTitles(ctx, lt, t) {
  const g = lt
  ctx.save()
  ctx.fillStyle = '#020403'
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  ctx.restore()
  ART.voidField(ctx, t, 1)
  // boxes assemble: Br at g0, Ba at g1.2, click together at g2.0
  const click = E.outCubic(seg(g, TITLES_EV.boxesClick, TITLES_EV.boxesClick + 0.2))
  const brX = lerp(742, 848, click)
  const baX = lerp(1178, 1072, click)
  const boxY = 336
  ART.elementBox(ctx, brX, boxY, 1.9, 'Br', 35, 'bromine', seg(g, TITLES_EV.brBox, TITLES_EV.brBox + 0.24), t)
  ART.elementBox(ctx, baX, boxY, 1.9, 'Ba', 56, 'barium', seg(g, TITLES_EV.baBox, TITLES_EV.baBox + 0.24), t)
  // dust puff where the boxes click
  const cAge = t - MASTER.boxesClick
  if (cAge > 0 && cAge < 0.6) ART.dustBurst(ctx, 960, boxY, cAge, 12, { n: 10, spread: 150, life: 0.5, col: '#57c98a' })
  // TITLE SLAM: green under-glow blooms behind the caption lane (real t)
  const age = t - MASTER.titleSlam
  if (age > -0.05 && age < 3.2) {
    const k = E.outCubic(cl(seg(age, 0, 0.3))) * (1 - seg(g, TITLES_EV.cardOut, TITLES_EV.cardOut + 0.2))
    if (k > 0) {
      const pulse = 1 + 0.04 * Math.sin(t * 6)
      ctx.save()
      const rg = ctx.createRadialGradient(960, 520, 30, 960, 520, 430 * pulse)
      rg.addColorStop(0, `rgba(47,158,95,${0.26 * k})`)
      rg.addColorStop(1, 'rgba(47,158,95,0)')
      ctx.fillStyle = rg
      ctx.fillRect(480, 160, 960, 700)
      ctx.restore()
    }
  }
  // the card breathes out at 5.9
  const out = 1 - seg(g, TITLES_EV.cardOut, TITLES_EV.cardOut + 0.18)
  if (out < 1) {
    ctx.save()
    ctx.globalAlpha = 1 - out
    ctx.fillStyle = '#020403'
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    ctx.restore()
  }
  ART.bars(ctx)
}

// ============================== S3 — CLASSROOM ==============================
function drawClassroom(ctx, lt, t) {
  const { g, stop, sl } = CLASSROOM.warp(lt)
  const dolly = seg(g, 0, CLASSROOM_EV.cut)
  const camX = lerp(700, 1010, E.inOutCubic(dolly))
  // stamp punch: one camera hit inside the freeze (real-time sl)
  const punch = stop ? Math.sin(cl(sl / 0.3) * Math.PI) * 0.025 : 0
  cam(ctx, 1.0 + punch, camX, 560, ...shakeXY(t, shakeStamp(t)))
  ctx.drawImage(S.bake.classroom, -OS, -OS)
  ART.motes(ctx, g, 22, 5, { x0: 1050, x1: 1850, y0: 220, y1: 880 })
  // ---- Mr. Flow at the board (UN-baldified, red flow) ----
  const ax = 800, feet = 920, sy = 2.5
  const tapAge = g - CLASSROOM_EV.chalkTap
  const coughAge = g - CLASSROOM_EV.cough
  const grim = g >= CLASSROOM_EV.grimRead
  const lean = 0.02
    + (tapAge > 0 && tapAge < 0.5 ? Math.sin(cl(tapAge / 0.5) * Math.PI) * 0.09 : 0)
    + (coughAge > 0 && coughAge < 0.7 ? Math.sin(cl(coughAge / 0.7) * Math.PI) * -0.11 : 0)
    + (grim ? 0.1 : 0)
  ART.contactShadow(ctx, ax, feet, 42, 0.36)
  sprite(ctx, S.walt, ax, feet, {
    ...(grim ? { lift: [2, 2], stride: [0, 0] } : standFl(g)),
    lean, sx: sy, sy,
  })
  // chalk in hand -> slips at 5.2 -> bounces onto the tray
  const handY = ART.crownY(S.walt, feet, sy) + 54 * sy
  const dropAge = g - CLASSROOM_EV.chalkDrop
  if (dropAge <= 0) {
    ctx.save()
    ctx.translate(ax + 52 + Math.sin(Math.max(0, tapAge) * 9) * 3, handY)
    ctx.rotate(-0.5)
    ctx.fillStyle = '#e8e8e0'
    ctx.fillRect(-8, -3, 16, 6)
    ctx.restore()
  } else {
    const u = dropAge / 0.55
    if (u < 1.6) {
      const cy = handY + 340 * Math.min(u, 1) * Math.min(u, 1) - Math.abs(Math.sin(Math.min(u, 1.55) * Math.PI * 1.5)) * 30
      ctx.save()
      ctx.translate(ax + 52, Math.min(cy, 742))
      ctx.rotate(dropAge * 5)
      ctx.fillStyle = '#e8e8e0'
      ctx.fillRect(-8, -3, 16, 6)
      ctx.restore()
      if (Math.abs(u - 1) < 0.12) ART.dustBurst(ctx, ax + 52, 744, Math.abs(u - 1) * 0.3, 8, { n: 5, spread: 60, life: 0.4 })
    } else {
      ctx.save()
      ctx.translate(ax + 52, 742)
      ctx.rotate(0.1)
      ctx.fillStyle = '#e8e8e0'
      ctx.fillRect(-8, -3, 16, 6)
      ctx.restore()
    }
  }
  // ---- doctor panel slides over the board at 5.5 ----
  const slide = seg(g, CLASSROOM_EV.panelIn, CLASSROOM_EV.panelIn + 0.45)
  ART.doctorPanel(ctx, 1000, 430, 1.12, slide)
  // ---- D.N.R. stamp slams the panel at the freeze ----
  const stampK = seg(t - MASTER.dnStamp, 0, 0.14)
  if (stampK > 0) {
    stamp(ctx, 'D.N.R.', 1000, 470, { size: 128, p: stampK, color: '#c0392b', seed: 7, rot: -0.18, alpha: 0.92 })
  }
  // desks parallax IN FRONT of the actor (dolly reads against them)
  for (const wx of [180, 500, 1420, 1760]) {
    const dx = 960 + (wx - camX) * 1.22
    ART.desk(ctx, dx, 956, 1.7)
  }
  ctx.restore()
  ART.bars(ctx)
}
const shakeStamp = (t) => {
  const a = t - MASTER.dnStamp
  if (a > 0 && a < 0.35) return 4.5 * (1 - a / 0.35)
  return 0
}

// ============================== S4 — THE DECISION ==============================
function drawDecision(ctx, lt, t) {
  const { g } = DECISION.warp(lt)
  // locked mirror push-in: no parallax, scale 1.0 -> 1.3 on the reflection
  const push = E.inOutCubic(seg(g, 0, 8.6))
  cam(ctx, lerp(1.0, 1.3, push), 960, 610)
  ctx.drawImage(S.bake.bathroom, -OS, -OS)
  // ---- 42 in the mirror (big: the glass holds head + chest) ----
  const x = 960, feet = 1085, sy = 4.4
  const cy = ART.crownY(S.heisen, feet, sy)
  const bald = g >= DECISION_EV.hairFalls + 0.15
  const rig = bald ? S.heisen : S.walt
  // clippers: snap on at 1.5, first pass up the crown 2.0-3.4
  const clipOn = g >= DECISION_EV.clippers
  const passU = seg(g, DECISION_EV.firstPass, DECISION_EV.hairFalls)
  // poses: stare -> clipper work -> the reveal -> hat -> shades
  const stare = g < DECISION_EV.clippers
  const lean = stare ? 0.03 + Math.sin(g * 1.1) * 0.02
    : g < DECISION_EV.hairFalls ? 0.1 + Math.sin(g * 2.4) * 0.02
    : g < DECISION_EV.hat ? 0.02 : 0.0 + Math.sin(g * 0.9) * 0.012
  sprite(ctx, rig, x, feet, { lift: [2, 0], stride: [1, 0], lean, sx: sy, sy })
  // falling red hair -> into the basin (from the crown; drawn before the sink
  // front so the clumps land IN the bowl)
  ART.hairFall(ctx, g - DECISION_EV.hairFalls, 42, 26, x, 906, cy + 30)
  // the sink front occludes the reflection's lower half (mirror read)
  ART.sinkFront(ctx, t)
  if (clipOn && !bald) {
    // the clipper rides the crown arc on the first pass
    const jx = (hash(Math.floor(t * 90) + 3) - 0.5) * 3
    const cxA = x + 86 + Math.sin(passU * Math.PI) * -150 + jx
    const cyA = cy - 10 * sy - Math.sin(passU * Math.PI) * 26
    ctx.save()
    ctx.translate(cxA, cyA)
    ctx.rotate(-0.5 + passU * 0.9)
    ctx.scale(0.62, 0.62)
    ctx.fillStyle = '#1c1c22'
    ctx.fillRect(-13, -20, 26, 34)
    ctx.fillStyle = '#8a8e96'
    ctx.fillRect(-13, 12, 26, 6)
    for (let i = 0; i < 6; i++) ctx.fillRect(-12 + i * 4.4, 18, 2.2, 5)
    ctx.restore()
  }
  // baldify reveal: one light sweep across the scalp at 4.6
  const scalpAge = g - DECISION_EV.bald
  if (scalpAge > 0 && scalpAge < 0.6) ART.glint(ctx, x, cy + 6 * sy, 15 * sy, scalpAge / 0.6, {})
  // porkpie places at 5.0
  const hatK = E.outBack(seg(g, DECISION_EV.hat, DECISION_EV.hat + 0.5))
  if (hatK > 0.02) ART.porkpie(ctx, x, cy, sy, hatK)
  // SHADES DOWN at 5.3333 + goatee + the grade flips
  const shadeK = E.outCubic(seg(g, DECISION_EV.shadesDown, DECISION_EV.shadesDown + 0.32))
  const glintK = seg(g, DECISION_EV.shadesDown + 0.35, DECISION_EV.shadesDown + 0.85)
  if (shadeK > 0.02) ART.shades(ctx, x, cy, sy, shadeK, glintK)
  ART.goatee(ctx, x, cy, sy, seg(g, DECISION_EV.shadesDown, DECISION_EV.shadesDown + 0.4))
  ctx.restore()
  // teal flip wash (SHADES_DOWN) — cool multiply + cyan screen, restrained
  const teal = seg(g, DECISION_EV.shadesDown, DECISION_EV.shadesDown + 0.6)
  if (teal > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = `rgba(188,222,226,${0.3 * teal})`
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = `rgba(36,120,132,${0.08 * teal})`
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    ctx.restore()
  }
  ART.bars(ctx)
}

// ============================== S5 — THE COOK ==============================
// Beat-synced sub-cuts on the exact montage1/2 grid times.
function drawCook(ctx, lt, t) {
  const { g } = COOK.warp(lt)
  const m1 = COOK_EV.montage1, m2 = COOK_EV.montage2, pourG = COOK_EV.pour
  // camera per sub-cut
  let k, cx, cy
  if (g < m1) {
    k = 1.02
    cx = 960 + Math.sin(t * 0.9) * 10
    cy = 620 + Math.sin(t * 0.7) * 6
  } else if (g < m2) {
    // montage 1: tubing + burners close-up
    k = 1.95
    cx = LAB_B.burner[0] - 60 + Math.sin(t * 1.3) * 8
    cy = LAB_B.burner[1] - 40 + Math.sin(t * 1.7) * 6
  } else if (g < pourG) {
    // montage 2: the masks watch the boil
    k = 1.6
    cx = 1035 + Math.sin(t * 1.1) * 10
    cy = 700 + Math.sin(t * 1.5) * 7
  } else {
    k = 1.06
    cx = 960 + Math.sin(t * 0.8) * 9
    cy = 660 + Math.sin(t * 0.6) * 6
  }
  cam(ctx, k, cx, cy, ...shakeXY(t, g > pourG && g < pourG + 0.4 ? 1.2 : 0))
  ctx.drawImage(S.bake.lab, -OS, -OS)
  // ---- the glow state machine (pure in g) ----
  const glowIn = seg(g, COOK_EV.flaskGlow, COOK_EV.flaskGlow + 0.6)
  const blueIn = seg(g, COOK_EV.vaporBlue, COOK_EV.vaporBlue + 0.5)
  const pourIn = seg(g, pourG, pourG + 0.5)
  const gr = Math.round(lerp(120, 99, blueIn))
  const gg2 = Math.round(lerp(220, 197, blueIn))
  const gb = Math.round(lerp(110, 255, blueIn))
  const liqCol = `${gr},${gg2},${gb}`
  // burner flame under the flask
  const [bx, by] = LAB_B.burner
  const fl = Math.sin(t * 12.3) * 0.5 + Math.sin(t * 19.1) * 0.5
  ctx.save()
  ctx.fillStyle = '#ff9a3a'
  ctx.beginPath()
  ctx.moveTo(bx - 7, by - 46)
  ctx.quadraticCurveTo(bx - 8 + fl * 2, by - 62, bx + fl * 2, by - 72 - fl * 4)
  ctx.quadraticCurveTo(bx + 8 + fl * 2, by - 62, bx + 7, by - 46)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(120,190,255,0.7)'
  ctx.beginPath()
  ctx.moveTo(bx - 3.6, by - 46)
  ctx.quadraticCurveTo(bx - 4 + fl, by - 54, bx + fl, by - 60)
  ctx.quadraticCurveTo(bx + 4 + fl, by - 54, bx + 3.6, by - 46)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // flask liquid + glow: GREEN -> BLUE keyed to the EV times
  const [fx, fy] = LAB_B.flask
  if (glowIn > 0.02) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const fg = ctx.createRadialGradient(fx, fy, 4, fx, fy, 130)
    fg.addColorStop(0, `rgba(${liqCol},${0.5 * glowIn})`)
    fg.addColorStop(1, `rgba(${liqCol},0)`)
    ctx.fillStyle = fg
    ctx.fillRect(fx - 130, fy - 130, 260, 260)
    ctx.restore()
    ctx.save()
    ctx.globalAlpha = glowIn
    ctx.fillStyle = `rgb(${liqCol})`
    ctx.beginPath()
    ctx.arc(fx, fy + 18, 47, 0, Math.PI)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(fx - 44, fy + 2, 88, 16)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.beginPath(); ctx.ellipse(fx - 16, fy + 14, 10, 4, 0.3, 0, 7); ctx.fill()
    ctx.restore()
  }
  // vapor over the flask neck (green -> blue; density rides the blue turn)
  if (glowIn > 0.3) {
    ART.steam(ctx, fx, fy - 104, t * (0.7 + blueIn * 0.6), 9, `rgba(${liqCol},`)
  }
  // side flask catches the spill light
  if (blueIn > 0.3) {
    const [ex, ey] = LAB_B.flask2
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const eg = ctx.createRadialGradient(ex, ey - 20, 4, ex, ey - 20, 80)
    eg.addColorStop(0, `rgba(${liqCol},${0.24 * blueIn})`)
    eg.addColorStop(1, `rgba(${liqCol},0)`)
    ctx.fillStyle = eg
    ctx.fillRect(ex - 80, ey - 100, 160, 160)
    ctx.restore()
  }
  // ---- the two suited cooks ----
  const maskIn = seg(g, COOK_EV.vaporBlue, COOK_EV.vaporBlue + 0.6)
  const waltX = LAB_B.walt[0], waltFeet = LAB_B.walt[1]
  const jesseX = LAB_B.jesse[0], jesseFeet = LAB_B.jesse[1]
  ART.contactShadow(ctx, waltX, waltFeet, 40, 0.34)
  sprite(ctx, S.heisenLab, waltX, waltFeet, {
    lift: [2, 0], stride: [1, 0], lean: -0.05 * maskIn + Math.sin(t * 1.1) * 0.015, sx: 2.4, sy: 2.4,
  })
  ART.gasMask(ctx, waltX, ART.crownY(S.heisenLab, waltFeet, 2.4), 2.4, -0.1 * maskIn + Math.sin(t * 0.9) * 0.03)
  ART.contactShadow(ctx, jesseX, jesseFeet, 40, 0.34)
  sprite(ctx, S.jesseLab, jesseX, jesseFeet, {
    lift: [2, 0], stride: [1, 0], lean: 0.06 * maskIn + Math.sin(t * 1.3 + 2) * 0.015, sx: 2.4, sy: 2.4,
  })
  ART.gasMask(ctx, jesseX, ART.crownY(S.jesseLab, jesseFeet, 2.4), 2.4, 0.12 * maskIn + Math.sin(t * 1.1 + 1) * 0.03)
  // ---- THE POUR: molten blue into the cast ----
  const [cx2, cy2] = LAB_B.cast
  if (pourIn > 0.02) {
    const sx0 = cx2 - 8, sy0 = LAB_B.castTop + 4
    const surf = cy2 + 22 - 66 * pourIn
    ctx.save()
    const sg = ctx.createLinearGradient(sx0, sy0, sx0, surf)
    sg.addColorStop(0, ART.PAL.blueHi)
    sg.addColorStop(1, ART.PAL.blue)
    ctx.fillStyle = sg
    const wob = Math.sin(t * 9) * 2
    ctx.beginPath()
    ctx.moveTo(sx0 - 5 + wob, sy0)
    ctx.lineTo(sx0 + 5 + wob, sy0)
    ctx.lineTo(sx0 + 3, surf)
    ctx.lineTo(sx0 - 3, surf)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    // the cast fills + glows
    ctx.save()
    const fillH = 70 * pourIn
    const cg = ctx.createLinearGradient(0, cy2 + 26 - fillH, 0, cy2 + 26)
    cg.addColorStop(0, ART.PAL.blueHi)
    cg.addColorStop(1, ART.PAL.blueDeep)
    ctx.fillStyle = cg
    ctx.fillRect(cx2 - 62, cy2 + 26 - fillH, 124, fillH)
    ctx.globalCompositeOperation = 'lighter'
    const pg = ctx.createRadialGradient(cx2, cy2, 10, cx2, cy2, 220)
    pg.addColorStop(0, `rgba(99,197,255,${0.34 * pourIn})`)
    pg.addColorStop(1, 'rgba(99,197,255,0)')
    ctx.fillStyle = pg
    ctx.fillRect(cx2 - 220, cy2 - 220, 440, 440)
    ctx.restore()
    // splash glints inside the cast
    for (let i = 0; i < 5; i++) ART.sparkle(ctx, cx2 - 40 + i * 20, cy2 + 20 - 8 * hash(i * 7.7), 5, t, 40 + i)
    const pourAge = t - MASTER.pour
    if (pourAge > 0 && pourAge < 0.9) {
      ART.sparkBurst(ctx, cx2, cy2 + 10, pourAge, 61)
      ART.shockRing(ctx, cx2, cy2 + 14, pourAge, 0.5)
    }
  }
  // ---- 99.1% PURE FLOW stamp (picture, flash carried by FLASHES) ----
  const pureK = seg(t - MASTER.pureStamp, 0, 0.15)
  if (pureK > 0) {
    stamp(ctx, '99.1% PURE FLOW', 960, 430, { size: 84, p: pureK, color: '#4fb3e8', seed: 12, rot: -0.12, alpha: 0.94 })
  }
  // ---- cash starts stacking at 12.75 ----
  const cashK = seg(g, COOK_EV.cash, COOK_EV.cash + 2.4)
  if (cashK > 0.02) {
    const rows = Math.floor(cashK * 5)
    for (let r2 = 0; r2 < rows; r2++) {
      const rise = E.outCubic(cl(cashK * 5 - r2))
      for (let cxx = 0; cxx < 2; cxx++) {
        const bx2 = 1300 + cxx * 60 - 30
        const by2 = LAB_B.tableY - 26 - r2 * 22
        ctx.save()
        ctx.translate(bx2, by2 + (1 - rise) * 14)
        ctx.fillStyle = '#5e7a4a'
        ctx.fillRect(-28, -9, 56, 18)
        ctx.fillStyle = 'rgba(240,232,200,0.85)'
        ctx.fillRect(-25, -6, 50, 1.6)
        ctx.fillRect(-25, 2, 50, 1.6)
        ctx.fillStyle = '#d8cba2'
        ctx.fillRect(-4, -9, 8, 18)
        ctx.restore()
      }
    }
    if (cashK < 0.98) {
      const topY = LAB_B.tableY - 26 - Math.floor(cashK * 5) * 22
      ART.dustBurst(ctx, 1330, topY, (cashK * 5) % 1 * 0.3, 44, { n: 3, spread: 40, life: 0.3, col: '#8a9468' })
    }
  }
  ART.motes(ctx, g, 16, 21, { x0: 700, x1: 1300, y0: 300, y1: 800, col: '240,226,190' })
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S6 — LOS FLOWOS ==============================
function drawDiner(ctx, lt, t) {
  const { g } = DINER.warp(lt)
  const backG = DINER_EV.backRoom, hankG = DINER_EV.hankWatch
  if (g < backG) {
    // ---- front of house: crane-down ends at counter level, the bucket lands ----
    const crane = E.outCubic(seg(g, 0, 2.0))
    cam(ctx, 1.03, 860, lerp(430, 620, crane))
    ctx.drawImage(S.bake.dinerFront, -OS, -OS)
    // Gus 5 serves the steaming bucket to the booth
    const walkU = seg(g, 0.1, 1.9)
    const sx = lerp(1210, 470, E.inOutCubic(walkU))
    const feet = 900
    ART.contactShadow(ctx, sx, feet, 38, 0.32)
    sprite(ctx, S.gus5, sx, feet, {
      ...(walkU > 0 && walkU < 1 ? walkCycF(g * 7, 5) : standFl(g)),
      lean: walkU > 0 && walkU < 1 ? 0.06 : 0.02, sx: 2.3, sy: 2.3,
    })
    const gy = ART.crownY(S.gus5, feet, 2.3)
    ART.nameTag(ctx, sx - 20, gy + 112, 2.0)
    ART.bucket(ctx, sx + 55, gy + 100, 1.7, t)
    // the bucket lands at the booth table at the end of the walk
    if (walkU >= 1) {
      const landAge = g - (DINER_EV.front + 1.9)
      if (landAge > 0 && landAge < 0.5) ART.dustBurst(ctx, 522, 830, landAge, 15, { n: 6, spread: 70, life: 0.4 })
    }
  } else if (g < hankG) {
    // ---- pass-through to the cold back room: the vial to the light ----
    cam(ctx, 1.04, 960 + Math.sin(t * 0.7) * 8, 600)
    ctx.drawImage(S.bake.dinerBack, -OS, -OS)
    // door wipe right after the cut (0.16 s)
    const wipe = 1 - seg(g, backG, backG + 0.16)
    if (wipe > 0) {
      ctx.save()
      ctx.fillStyle = '#5a6a7a'
      ctx.fillRect(-OS, -OS, (W + OS * 2) * wipe, H + OS * 2)
      ctx.fillStyle = '#39434e'
      ctx.fillRect((W + OS * 2) * wipe - 14, -OS, 14, H + OS * 2)
      ctx.restore()
    }
    // GUS 1217 inspects the blue vial against the caged lamp
    const gx = ART.DINER.gusBench[0], gFeet = ART.DINER.gusBench[1], sy = 2.35
    ART.contactShadow(ctx, gx, gFeet, 40, 0.34)
    sprite(ctx, S.gus, gx, gFeet, {
      lift: [2, 0], stride: [1, 0], lean: 0.05 + Math.sin(t * 0.8) * 0.012, sx: sy, sy,
    })
    const gy = ART.crownY(S.gus, gFeet, sy)
    ART.rimless(ctx, gx, gy, sy, 1)
    // the vial rises to the light and turns cold
    const vialUp = E.outCubic(seg(g, backG + 0.4, backG + 1.2))
    const glow = seg(g, backG + 1.0, backG + 1.9)
    const vx = gx + 92, vy = lerp(gy + 90, gy + 4, vialUp)
    ctx.save()
    ctx.fillStyle = '#a07e63'
    ctx.beginPath(); ctx.ellipse(vx + 2, vy + 26, 10, 8, 0.4, 0, 7); ctx.fill()
    ctx.restore()
    ART.vial(ctx, vx, vy, 1.25, t, glow, Math.sin(t * 1.1) * 0.45 - 0.35)
    // the HOODED HENCHMEN ROW lines the wall at 56.8 (bar 2)
    for (let i = 0; i < HOOD_IDS.length; i++) {
      const inA = seg(g, DINER_EV.hoodRow + i * 0.12, DINER_EV.hoodRow + i * 0.12 + 0.4)
      if (inA <= 0.02) continue
      const hx = [560, 740, 1230, 1410][i]
      const hFeet = 884
      ctx.save()
      ctx.globalAlpha = inA * 0.96
      sprite(ctx, S.hood[i], hx, hFeet, { lift: [2, 0], stride: [1, 0], lean: 0.02, sx: 2.2, sy: 2.2 })
      ART.hood(ctx, hx, ART.crownY(S.hood[i], hFeet, 2.2), 2.2)
      ctx.restore()
    }
  } else {
    // ---- Hank's corner booth: chicken, badge, and the porthole watcher ----
    cam(ctx, 1.42, 1450 + Math.sin(t * 0.5) * 8, 690)
    ctx.drawImage(S.bake.dinerFront, -OS, -OS)
    const hx = ART.DINER.hankBooth[0], hFeet = 905, sy = 2.35
    ART.contactShadow(ctx, hx, hFeet, 38, 0.34)
    // the bite cycle: drumstick hand -> mouth -> back
    const bitePh = (Math.sin(g * 4.2) + 1) / 2
    const bite = cl(seg(bitePh, 0.75, 0.95)) * (1 - seg(bitePh, 0.95, 1))
    sprite(ctx, S.hank, hx, hFeet, {
      lift: [2, 0], stride: [1, 0], lean: 0.04 + bite * 0.06, sx: sy, sy,
    })
    const hy = ART.crownY(S.hank, hFeet, sy)
    const mouthY = hy + 40 * sy
    ART.drumstick(ctx, hx + 52 - bite * 34, mouthY + 10 - bite * 52, 1.6, 0.5 - bite * 1.2, bite)
    // booth table in front of him (seated read) + badge on the wood
    ctx.save()
    ctx.fillStyle = '#6e4e2e'
    ctx.fillRect(hx - 190, 862, 380, 26)
    ctx.fillStyle = '#5a3c22'
    ctx.fillRect(hx - 190, 884, 380, 80)
    ctx.fillStyle = 'rgba(30,20,12,0.4)'
    ctx.fillRect(hx - 190, 884, 380, 8)
    ctx.restore()
    const glintK = seg(t - MASTER.badgeGlint, 0, 0.8)
    ART.badge(ctx, hx - 100, 860, 2.2, glintK)
    // through the porthole: the kingpin watches him eat (rises at the glint)
    const watch = seg(t - MASTER.badgeGlint, 0, 0.7)
    if (watch > 0.02) {
      const [phx, phy] = ART.DINER.porthole
      const pr = ART.DINER.portholeR
      ctx.save()
      ctx.beginPath()
      ctx.arc(phx, phy, pr - 4, 0, 7)
      ctx.clip()
      ctx.globalAlpha = watch
      const wy2 = phy + 60 - watch * 46
      ctx.fillStyle = '#0a0a0f'
      ctx.beginPath()
      ctx.ellipse(phx, wy2 + 70, 74, 60, 0, Math.PI, 0.0001)
      ctx.fill()
      ctx.beginPath(); ctx.arc(phx, wy2, 30, 0, 7); ctx.fill()
      ART.porkpie(ctx, phx, wy2 - 26, 1.05, 1, { silhouette: true })
      ART.shades(ctx, phx, wy2 - 24, 1.05, 1, 0)
      ctx.restore()
    }
  }
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S7 — SAY MY NAME ==============================
const shakeSlam = (t) => {
  const a = t - MASTER.slam
  if (a > 0 && a < 0.5) return 8 * (1 - a / 0.5)
  return 0
}

function drawSaymyname(ctx, lt, t) {
  const { g, stop, sl } = SAYMYNAME.warp(lt)
  const cuGus = SAYMYNAME_EV.closeGus, cuWalt = SAYMYNAME_EV.closeWalt
  const waltX = 640, gusX = 1280, feet = 918, sy = 2.6
  const waltCy = ART.crownY(S.heisen, feet, sy)
  const gusCy = ART.crownY(S.gus, feet, sy)
  // segment camera
  let k, cx, cy
  if (g < cuGus) {
    k = lerp(1.0, 1.06, seg(g, 0, cuGus))
    cx = 960
    cy = 650
  } else if (g < cuWalt) {
    k = 1.9
    cx = gusX + Math.sin(t * 0.6) * 6
    cy = gusCy + 88 + Math.sin(t * 0.8) * 4
  } else if (g < SAYMYNAME_EV.slam) {
    k = 1.9
    cx = waltX + Math.sin(t * 0.6) * 6
    cy = waltCy + 88 + Math.sin(t * 0.8) * 4
  } else {
    k = lerp(1.02, 1.0, seg(g, SAYMYNAME_EV.slam, SAYMYNAME_EV.holdWide))
    cx = 960
    cy = 650
  }
  cam(ctx, k, cx, cy, ...shakeXY(t, shakeSlam(t)))
  ctx.drawImage(S.bake.warehouse, -OS, -OS)
  ART.motes(ctx, g, 26, 9, { x0: 300, x1: 1700, y0: 160, y1: 900, col: '238,230,206' })
  // ---- poses gate on the stop: THE SLAM freezes mid-pose ----
  const frozen = stop != null && stop.g === SAYMYNAME_EV.slam
  const turnU = seg(g, SAYMYNAME_EV.turn, SAYMYNAME_EV.turn + 0.4)
  const armK = (g >= SAYMYNAME_EV.slam - 0.1 && g < SAYMYNAME_EV.turn) || frozen
    ? E.outCubic(seg(g, SAYMYNAME_EV.slam - 0.1, SAYMYNAME_EV.slam + 0.08))
    : 0
  // far henchmen drifting in behind during the exit
  const followU = seg(g, SAYMYNAME_EV.turn + 0.2, SAYMYNAME_EV.cut)
  // ---- henchmen flanks (near) + hooded far rows ----
  for (let i = 0; i < 2; i++) {
    const rig = S.hench[i]
    const hfx = i === 0 ? 385 : 1535
    const x = i === 0 ? lerp(hfx, -320, followU) : lerp(hfx, hfx - 60, followU)
    const hFeet = i === 0 ? 922 : 924
    ART.contactShadow(ctx, x, hFeet, 36, 0.3)
    sprite(ctx, rig, x, hFeet, {
      ...(followU > 0 && followU < 1 && i === 0 ? walkCycF(g * 8, 6) : standFl(g)),
      lean: followU > 0 && i === 0 ? 0.08 : 0.02, sx: 2.35, sy: 2.35, flip: i === 1,
    })
  }
  for (let i = 0; i < 2; i++) {
    const hx = [820, 1120][i]
    ctx.save()
    ctx.globalAlpha = 0.85
    sprite(ctx, S.hood[i + 2], hx, 878, { lift: [2, 0], stride: [1, 0], lean: 0.02, sx: 1.8, sy: 1.8 })
    ART.hood(ctx, hx, ART.crownY(S.hood[i + 2], 878, 1.8), 1.8)
    ctx.restore()
  }
  // ---- GUS 1217 (does not move — not even in the freeze) ----
  ART.contactShadow(ctx, gusX, feet, 42, 0.36)
  sprite(ctx, S.gus, gusX, feet, {
    lift: [2, 0], stride: [1, 0], lean: -0.03 + Math.sin(g * 0.9) * 0.012, sx: sy, sy, flip: true,
  })
  ART.rimless(ctx, gusX, gusCy, sy, 1)
  // ---- HEISENBALD: the ask, the hang, THE SLAM, the exit ----
  const exiting = g >= SAYMYNAME_EV.turn
  const wX = exiting ? lerp(waltX, -260, seg(g, SAYMYNAME_EV.turn, SAYMYNAME_EV.turn + 2.6)) : waltX
  ART.contactShadow(ctx, wX, feet, 42, 0.38)
  sprite(ctx, S.heisen, wX, feet, {
    ...(exiting ? walkCycF(g * 7.5, 6) : standFl(g)),
    lean: frozen || armK > 0 ? 0.16 : exiting ? 0.06 : 0.03,
    sx: sy, sy, flip: exiting,
  })
  heisenLook(ctx, S.heisen, wX, feet, sy, { hat: 1, shades: 1, goatee: 1, shadeGlint: seg(g, SAYMYNAME_EV.beat + 0.1, SAYMYNAME_EV.beat + 0.6) })
  // the pointing arm: slams on the line, drops as he turns
  if (armK > 0.02 && !exiting) {
    ctx.save()
    ctx.strokeStyle = '#d0bdb1'
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    const ax = waltX + 30, ay = waltCy + 52
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.quadraticCurveTo(ax + 60 * armK, ay - 10, ax + 118 * armK, ay - 18 * armK)
    ctx.stroke()
    ctx.restore()
  }
  // dead beat: the god-shafts dim one stop while the sub pulse holds
  const dim = 0.14 * seg(g, SAYMYNAME_EV.beat, SAYMYNAME_EV.beat + 0.4) * (1 - seg(g, SAYMYNAME_EV.slam + 1.2, SAYMYNAME_EV.slam + 2))
  if (dim > 0) {
    ctx.save()
    ctx.fillStyle = `rgba(8,7,6,${dim})`
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    ctx.restore()
  }
  // freeze interior: the motes already hang (g-keyed); one sub-breath glow
  if (frozen) {
    const k2 = Math.exp(-sl * 2.2)
    ctx.save()
    ctx.globalAlpha = 0.3 * k2
    const fg = ctx.createRadialGradient(waltX + 60, waltCy + 40, 6, waltX + 60, waltCy + 40, 160)
    fg.addColorStop(0, 'rgba(99,197,255,0.5)')
    fg.addColorStop(1, 'rgba(99,197,255,0)')
    ctx.fillStyle = fg
    ctx.fillRect(waltX - 120, waltCy - 140, 380, 360)
    ctx.restore()
  }
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S8 — THE EMPIRE ==============================
function drawEmpire(ctx, lt, t) {
  const g = lt
  const ev = EMPIRE_EV
  if (g < ev.chandelier) {
    // 1. cash walls: push-in
    cam(ctx, lerp(1.0, 1.09, E.inOutCubic(seg(g, 0, ev.chandelier))), 960, 620)
    ctx.drawImage(S.bake.cash, -OS, -OS)
    for (let i = 0; i < 5; i++) ART.sparkle(ctx, 200 + hash(i * 7.7) * 1520, 300 + hash(i * 3.3) * 500, 8, t, 70 + i, '240,226,170')
  } else if (g < ev.barrels) {
    // 2. crystal chandelier: orbit-tilt + specular sparkle over a dark hall
    const u = seg(g, ev.chandelier, ev.barrels)
    cam(ctx, lerp(1.02, 1.08, u), 960 + Math.sin(t * 0.5) * 26, 520 - u * 30)
    ctx.save()
    const bg = ctx.createRadialGradient(960, 460, 40, 960, 460, 900)
    bg.addColorStop(0, '#16141e')
    bg.addColorStop(1, '#060509')
    ctx.fillStyle = bg
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    ctx.restore()
    ART.chandelier(ctx, 960, 350, t)
    // light pool the chandelier throws
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const lp = ctx.createRadialGradient(960, 760, 20, 960, 760, 420)
    lp.addColorStop(0, `rgba(99,197,255,${0.16 + 0.04 * Math.sin(t * 1.7)})`)
    lp.addColorStop(1, 'rgba(99,197,255,0)')
    ctx.fillStyle = lp
    ctx.fillRect(480, 380, 960, 560)
    ctx.restore()
    for (let i = 0; i < 10; i++) ART.sparkle(ctx, 960 + Math.sin(i * 2.4) * 120, 330 + Math.cos(i * 1.7) * 90, 9, t, 80 + i)
  } else if (g < ev.teddy) {
    // 3. barrel field under tarps: lateral pan through the haze
    cam(ctx, 1.15, lerp(700, 1240, seg(g, ev.barrels, ev.teddy)), 700)
    ctx.drawImage(S.bake.barrels, -OS, -OS)
    ART.motes(ctx, g, 14, 33, { x0: 0, x1: W, y0: 500, y1: 940, col: '216,206,188' })
  } else if (g < ev.skyline) {
    // 5. the half-burned pink teddy, face-down in the still pool
    cam(ctx, 1.0, 960, 640)
    ctx.drawImage(S.bake.pool, -OS, -OS)
    ART.caustics(ctx, 300, 420, 1320, 440, t, '150,220,240', 1)
    ART.teddy(ctx, 960, 620, 2.4, t)
    // the splash on the downbeat (ring + droplets age on real t)
    const age = t - MASTER.teddy
    if (age > 0 && age < 1.2) {
      ART.shockRing(ctx, 960, 660, age, 0.9)
      for (let i = 0; i < 9; i++) {
        const a = hash(i * 13.3) * 6.28
        const d = 40 + age * 280 * (0.4 + hash(i * 3.1) * 0.6)
        const px = 960 + Math.cos(a) * d
        const py = 645 + Math.sin(a) * d * 0.4 - 160 * age + 320 * age * age
        ctx.globalAlpha = Math.max(0, 0.8 - age)
        ctx.fillStyle = 'rgba(190,230,240,0.9)'
        ctx.beginPath(); ctx.arc(px, py, 3 + hash(i * 5.7) * 3, 0, 7); ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    ART.sparkle(ctx, 960, 615, 12, t, 99)
  } else {
    // 5. city skyline at dusk: pull-back, one tower lit blue
    cam(ctx, lerp(1.16, 1.0, E.outCubic(seg(g, ev.skyline, ev.cut))), 960, 560)
    ctx.drawImage(S.bake.skyline, -OS, -OS)
    // the tower beacon blinks
    const blink = 0.5 + 0.5 * Math.sin(t * 3.4)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const bg = ctx.createRadialGradient(1240, 216, 2, 1240, 216, 90)
    bg.addColorStop(0, `rgba(140,220,255,${0.5 * blink})`)
    bg.addColorStop(1, 'rgba(140,220,255,0)')
    ctx.fillStyle = bg
    ctx.fillRect(1140, 120, 200, 200)
    ctx.restore()
  }
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S9 — FINALE ==============================
function drawFinale(ctx, lt, t) {
  const { g } = FINALE.warp(lt)
  const ax = 1150, feet = 716, sy = 1.5
  // continuous crane pull-up from bar 2 (91.3333)
  const pull = E.inOutCubic(seg(g, FINALE_EV.pullUp, FINALE_EV.pullUp + 2.9))
  const k = lerp(2.3, 0.85, pull)
  const cx2 = lerp(ax, 960, pull)
  const cy2 = lerp(ART.crownY(S.heisen, feet, sy) + 60, 560, pull)
  cam(ctx, k, cx2, cy2)
  ctx.drawImage(S.bake.night, -OS, -OS)
  // the crystal star field wakes with the pull-up, blooms by the end card
  const starK = seg(g, FINALE_EV.pullUp, FINALE_EV.pullUp + 1.4) * 0.3 + seg(g, FINALE_EV.starField, FINALE_EV.starField + 1.4) * 0.7
  ART.crystalStars(ctx, t, starK)
  // ---- HEISENBALD alone: shades off on bar 1, porkpie stays ----
  const offU = seg(g, FINALE_EV.shadesOff, FINALE_EV.shadesOff + 0.4)
  sprite(ctx, S.heisen, ax, feet, {
    lift: [2, 0], stride: [1, 0],
    lean: 0.02 + Math.sin(g * 0.9) * 0.012 - offU * 0.03,
    sx: sy, sy,
  })
  // night settle: sink the actor into the moonlight (the rigs draw full-bright)
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = 'rgba(158,166,198,0.30)'
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  ctx.restore()
  const cy = ART.crownY(S.heisen, feet, sy)
  ART.porkpie(ctx, ax, cy, sy, 1)
  if (offU < 1) ART.shades(ctx, ax, cy, sy, 1 - offU, 0)
  ART.goatee(ctx, ax, cy, sy, 1)
  // lantern flicker on him (bake carries the pool; this is the live breath)
  const flick = 0.85 + 0.15 * hash(Math.floor(t * 9) + 4)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const lg = ctx.createRadialGradient(1032, 640, 4, 1032, 640, 130 * flick)
  lg.addColorStop(0, `rgba(255,202,110,${0.2 * flick})`)
  lg.addColorStop(1, 'rgba(255,202,110,0)')
  ctx.fillStyle = lg
  ctx.fillRect(900, 500, 280, 300)
  ctx.restore()
  ctx.restore()
  // ---- END CARD: Br/Ba boxes reassemble as BR·BA (text is a caption) ----
  const cardU = seg(g, FINALE_EV.endCard, FINALE_EV.endCard + 0.55)
  if (cardU > 0) {
    ctx.save()
    ctx.fillStyle = `rgba(4,6,5,${0.72 * cardU})`
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    ctx.restore()
    const p = E.outCubic(cardU)
    const boxY = 350
    ART.elementBox(ctx, lerp(700, 806, p), boxY, 1.55, 'Br', 35, 'bromine', p, t)
    ART.elementBox(ctx, lerp(1220, 1114, p), boxY, 1.55, 'Ba', 56, 'barium', p, t)
    // warm D-major glow behind the caption lane
    ctx.save()
    const rg = ctx.createRadialGradient(960, 500, 30, 960, 500, 420)
    rg.addColorStop(0, `rgba(216,180,110,${0.14 * p})`)
    rg.addColorStop(1, 'rgba(216,180,110,0)')
    ctx.fillStyle = rg
    ctx.fillRect(500, 140, 920, 700)
    ctx.restore()
  }
  // final fade to black at 97.9-98
  const outK = seg(g, FINALE_EV.end, FINALE_EV.cut + 0.05)
  if (outK > 0) {
    ctx.save()
    ctx.globalAlpha = outK
    ctx.fillStyle = '#020303'
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    ctx.restore()
  }
  ART.bars(ctx)
}

// ============================== the film ==============================
export default {
  title: 'BREAKING BALD — A REMY BOYS CRIME EPIC',
  output: 'breaking-bald.mp4',
  duration: DUR,
  async prepare() {
    S.bake = await ART.build()
    const load = (i, far) => A.loadRemy(i, far)
    // the lead: sword stripped (remember-the-flow pattern); Heisenbald is the
    // baldified twin; the lab adds the hazmat repaint. sils rebuilt everywhere.
    S.walt = ART.stripLeftBlade(await load(WALT_ID))
    S.heisen = ART.baldify(S.walt, '#d0bdb1')
    S.heisenLab = ART.hazmat(S.heisen)
    S.jesse = await load(JESSE_ID)
    S.jesseLab = ART.hazmat(S.jesse)
    S.gus = await load(GUS_ID)
    S.gus5 = await load(GUS5_ID)
    S.hank = await load(HANK_ID)
    S.hench = []
    for (const id of HENCH_IDS) S.hench.push(await load(id))
    S.hood = []
    for (const id of HOOD_IDS) S.hood.push(ART.hoodSil(await load(id, true)))
  },
  shots: SHOTS.map((sh) => ({
    name: sh.name,
    t0: sh.t0,
    t1: sh.t1,
    draw(ctx, lt, dur, t, overlay) {
      if (sh.name === 'coldopen') drawColdopen(ctx, lt, t)
      else if (sh.name === 'titles') drawTitles(ctx, lt, t)
      else if (sh.name === 'classroom') drawClassroom(ctx, lt, t)
      else if (sh.name === 'decision') drawDecision(ctx, lt, t)
      else if (sh.name === 'cook') drawCook(ctx, lt, t)
      else if (sh.name === 'diner') drawDiner(ctx, lt, t)
      else if (sh.name === 'saymyname') drawSaymyname(ctx, lt, t)
      else if (sh.name === 'empire') drawEmpire(ctx, lt, t)
      else if (sh.name === 'finale') drawFinale(ctx, lt, t)
    },
    fx: (lt, t) => {
      const lb = { letterbox: 1.0 }
      if (sh.name === 'coldopen') return { ...lb, bloom: 0.1, bloomThresh: 0.9, vignette: 0.55, grain: 0.012, warm: 0.16, sat: 1.04 }
      if (sh.name === 'titles') return { ...lb, bloom: 0.09, bloomThresh: 0.9, vignette: 0.8, grain: 0.01 }
      if (sh.name === 'classroom') {
        const cool = seg(lt, MASTER.dnStamp - T.classroom + 0.35, MASTER.dnStamp - T.classroom + 1.2)
        return { ...lb, bloom: 0.08, bloomThresh: 0.9, vignette: 0.5, grain: 0.012, warm: lerp(0.1, 0.0, cool), tint: [lerp(1, 0.94, cool), 1, lerp(1, 1.07, cool)], exposure: -0.03 * cool }
      }
      if (sh.name === 'decision') {
        const teal = seg(lt, MASTER.shadesDown - T.decision, MASTER.shadesDown - T.decision + 0.7)
        return { ...lb, bloom: 0.08, bloomThresh: 0.9, vignette: 0.55, grain: 0.011, warm: lerp(0.12, 0.02, teal), tint: [lerp(1, 0.9, teal), 1, lerp(1, 1.1, teal)] }
      }
      if (sh.name === 'cook') {
        const pourLt = MASTER.pour - T.cook
        const hot = lt > pourLt - 0.3
        return { ...lb, bloom: hot ? 0.12 : 0.08, bloomThresh: hot ? 0.88 : 0.9, vignette: 0.55, grain: 0.014, warm: 0.04 }
      }
      if (sh.name === 'diner') {
        if (lt < DINER_EV.backRoom) return { ...lb, bloom: 0.09, bloomThresh: 0.9, vignette: 0.45, grain: 0.011, warm: 0.12, sat: 1.05 }
        if (lt < DINER_EV.hankWatch) return { ...lb, bloom: 0.07, bloomThresh: 0.9, vignette: 0.55, grain: 0.012, warm: 0.0, tint: [0.9, 0.98, 1.08] }
        return { ...lb, bloom: 0.09, bloomThresh: 0.9, vignette: 0.45, grain: 0.011, warm: 0.1, sat: 1.05 }
      }
      if (sh.name === 'saymyname') {
        const deadLt = MASTER.deadBeat - T.saymyname
        const dip = lt > deadLt && lt < deadLt + 1.2 ? 0.05 : 0
        return { ...lb, bloom: 0.09, bloomThresh: 0.9, vignette: 0.6, grain: 0.014, exposure: -dip }
      }
      if (sh.name === 'empire') return { ...lb, bloom: 0.09, bloomThresh: 0.9, vignette: 0.5, grain: 0.01 }
      if (sh.name === 'finale') {
        const cardLt = MASTER.endCard - T.finale
        const warmK = seg(lt, cardLt, cardLt + 0.8)
        return { ...lb, bloom: 0.08, bloomThresh: 0.9, vignette: 0.6, grain: 0.012, warm: lerp(0.02, 0.09, warmK), tint: [lerp(0.94, 1, warmK), 1, lerp(1.06, 1, warmK)], exposure: 0.03 * warmK }
      }
      return lb
    },
  })),
  captions: CAPTIONS,
  captionStyles: {
    ...STYLES,
    title: {
      font: 'Anton', color: '#f2fbf4', track: 4,
      shadow: '#050806', glow: '#37a05c', glowBlur: 26,
    },
    sub: {
      weight: 600, color: 'rgba(216,228,218,0.92)', track: 6,
      shadow: '#050806',
    },
    kicker: {
      font: '"JetBrains Mono"', weight: 700, color: '#9fd8b4', track: 6,
      shadow: '#0a0806',
    },
  },
  flashes: FLASHES,
  score,
  audio: { seed: 42, reverb: 1.4, reverbGain: 0.22 },
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } },
}
