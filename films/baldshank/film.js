// THE BALDSHANK REDEMPTION — picture. 29 shots, 101.0 s, painted full-res stage,
// sprites 2.0-2.6x nearest. Every frame a pure function of time: actors/blocking
// live on the film clock's WORLD g (warp(t).g, frozen through both hit-stops),
// effects age on REAL t so rain/lightning/shake keep real time through the freezes.
// No Math.random, no Date, no state across frames. All reading text rides the
// timeline's caption ledger (CAPS); everything else is prop signage drawn in-scene
// (SIGNAGE strings) and QA'd as stills.
import { W, H, hash, E, F, txt, measure } from 'filmkit/lib.js'
import * as MOTION from 'filmkit/motion.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import { OS } from './art.js'
import {
  DURATION, SHOTS, SAFE, GROUNDS, CAPS, DRAWN, CAST, FLASHES, warp, filmT, clamp01, lerp, seg,
  STOPS, STOP1_G, STOP2_G,
  EV_S1, EV_TITLE, EV_S2, EV_S3, EV_S4, EV_S5, EV_S6,
  YARD, SHAVE_ROOM, CELL, POSTER_RECT, TUNNEL, CREEK, BEACH, OFFICE, BUS_RIDE,
  busX, clipperX, sprintX, crawlX, redSandX, ANDY_BEACH_X,
} from './timeline.js'

const S = {}
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const GOLD = '#e8b23a'
const CRIMSON = '#893c3b'

function sprite(ctx, rig, px, feet, o = {}) {
  ctx.imageSmoothingEnabled = false
  A.drawRemy(ctx, rig, px, feet, o)
}
// head crown y for a rig drawn with feet at `feet` and scale sy
const crownY = (rig, feet, sy) => feet - (rig.bottom - rig.top + 1) * sy + 7 * sy
const walkCyc = (ph, amp = 5) => {
  const s = Math.sin(ph)
  return { lift: [Math.round(Math.max(0, s) * amp), Math.round(Math.max(0, -s) * amp)], stride: [Math.round(s * 2), Math.round(-s * 2)], lean: 0.04 }
}
const stand = { lift: [2, 0], stride: [1, 0], lean: 0.02 }
// camera: scale k about the screen centre
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
// draw a baked stage canvas with overscan
function stage(ctx, bake) {
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(bake, -OS, -OS)
}

// ============================== shared staging ==============================

// ANDY: the cap rig everywhere except the rip payoff; S.cap draws the bare head.
function drawAndy(ctx, x, feet, o = {}) {
  const sy = o.sy ?? 2.4
  const rig = o.cap === false ? S.andy : S.andyCap
  sprite(ctx, rig, x, feet, { sy, sx: sy, ...o.pose })
  if (o.mane) ART.windMane(ctx, x + 1, crownY(rig, feet, sy) + 12 * sy * 0.4, sy * 0.42, o.t ?? 0, CRIMSON, o.maneK ?? 1)
}
function drawRed(ctx, x, feet, o = {}) {
  const sy = o.sy ?? 2.4
  sprite(ctx, S.red, x, feet, { sy, sx: sy, ...o.pose })
  if (o.mane) ART.windMane(ctx, x + 1, crownY(S.red, feet, sy) + 12 * sy * 0.4, sy * 0.42, o.t ?? 0, '#b9bcc4', (o.maneK ?? 1) * 0.8)
}
function drawGuard(ctx, key, x, feet, o = {}) {
  const sy = o.sy ?? 2.35
  sprite(ctx, S.guards[key], x, feet, { sy, sx: sy, ...o.pose })
}
// roll-call / shave line placement (heads bowed option)
const bow = (k) => ({ lift: [2, 0], stride: [1, 0], lean: k })

// s2c/s5a/s5c: hang a poster canvas into the wall rect; o.drop 0..1 pin-up settle,
// o.peel 0..1 peel up over the top hinge.
function drawPoster(ctx, poster, x, y, w, h, o = {}) {
  ctx.save()
  ctx.imageSmoothingEnabled = true
  if (o.peel > 0.001) {
    ctx.translate(x, y)
    ctx.rotate(-o.peel * 2.4)
    ctx.globalAlpha = 1 - o.peel * 0.85
    ctx.drawImage(poster, 0, 0, w, h)
  } else {
    const drop = o.drop ?? 1
    const swing = o.swing ? Math.sin(o.swing * 9) * 0.1 * (1 - cl((o.swing - 0.5) * 2)) : 0
    ctx.translate(x + w / 2, y)
    ctx.rotate(swing)
    const ww = w * (0.7 + 0.3 * drop), hh = h * (0.7 + 0.3 * drop)
    ctx.drawImage(poster, -ww / 2, (h - hh) * drop, ww, hh)
  }
  ctx.restore()
}

// newspaper shake/slack helper for the bugle slam
function slamIn(t, t0, dur = 0.22) {
  return cl((t - t0) / dur)
}

// ============================== S1 — ARRIVAL ==============================

function drawS1a(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#191c22'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  const bx = busX(g)
  cam(ctx, 1.0, lerp(860, 1700, cl(lt / 3.4)), 620)
  stage(ctx, S.bus)
  // searchlight sweeps off the wall towers (real t)
  ART.searchlight(ctx, 700, BUS_RIDE.wallY - 260, 0.5 + Math.sin(t * 0.9) * 0.35, 620, 26, 0.85)
  ART.searchlight(ctx, 2300, BUS_RIDE.wallY - 260, -0.4 + Math.sin(t * 0.7 + 2) * 0.3, 620, 26, 0.7)
  // the bus rolls L->R, wipers squeak, windows lit
  ART.busProp(ctx, bx, BUS_RIDE.roadY + 44, 1)
  // road spray behind the wheels
  ART.dustPuff(ctx, bx - 300, BUS_RIDE.roadY + 40, ((t * 2.2) % 0.5), 0.5, 5, 6, 'rgba(150,160,180,')
  ctx.restore()
  ART.rain(ctx, t, 1, 0.18)
  // gray weather wash
  ctx.fillStyle = 'rgba(60,70,90,0.08)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

function drawS1b(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#565c64'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, lerp(1.06, 1.18, cl(lt / 5)), lerp(700, 640, cl(lt / 5)), 640)
  stage(ctx, S.yardOvercast)
  // drizzle
  ART.rain(ctx, t, 0.4, 0.12, { n: 30 })
  // the new fish line up heads bowed (inmates + 42 capped), guards flanking
  const lineIn = E.outCubic(cl((g - EV_S1.lineup.g + 0.6) / 1.2))
  for (const [i, rig] of S.inmates.entries()) {
    const lx = 300 + i * 118 + (i > 2 ? 26 : 0)
    sprite(ctx, rig, lerp(lx + 240, lx, lineIn), GROUNDS.s1, { ...bow(0.2 + hash(i * 3) * 0.06), sx: 2.1, sy: 2.1 })
  }
  drawAndy(ctx, lerp(1080, 980, lineIn), GROUNDS.s1, { pose: bow(0.24), sy: 2.2 })
  // guard flank
  drawGuard(ctx, 0, 380, GROUNDS.s1, { pose: stand, sy: 2.35 })
  drawGuard(ctx, 1, 1280, GROUNDS.s1, { pose: { lift: [2, 0], stride: [1, 0], lean: -0.05 }, sy: 2.35 })
  // RED watches from the wall, arms folded (the narrator's first look)
  drawRed(ctx, 1660, GROUNDS.s1, { pose: { lift: [2, 0], stride: [1, 0], lean: -0.07 }, sy: 2.5 })
  ctx.restore()
  // cold wash
  ctx.fillStyle = 'rgba(90,100,120,0.07)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

function drawS1c(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#3c443c'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  const pan = cl((g - EV_S1.shaveMarch.g) / 3.4)
  cam(ctx, 1.14, lerp(700, 1320, pan), 660, ...shakeXY(t, g > EV_S1.stampThunk.g && g < EV_S1.stampThunk.g + 0.14 ? 4 : 0))
  stage(ctx, S.shave)
  // victims in the chairs: inmates 1,3,4 + 42 in chair 2 (calm, eyes front)
  const seated = { lift: [4, 2], stride: [0, 0], lean: 0.06 }
  sprite(ctx, S.inmates[0], SHAVE_ROOM.chairs[0], SHAVE_ROOM.lineY, { ...seated, sx: 2.2, sy: 2.2 })
  drawAndy(ctx, SHAVE_ROOM.chairs[1], SHAVE_ROOM.lineY, { pose: { lift: [4, 2], stride: [0, 0], lean: 0.04 }, sy: 2.2 })
  sprite(ctx, S.inmates[2], SHAVE_ROOM.chairs[2], SHAVE_ROOM.lineY, { ...seated, sx: 2.2, sy: 2.2 })
  sprite(ctx, S.inmates[3], SHAVE_ROOM.chairs[3], SHAVE_ROOM.lineY, { ...seated, sx: 2.2, sy: 2.2 })
  // HADBALD marches the clippers down the line
  const cx = clipperX(g)
  const march = cl((g - EV_S1.shaveMarch.g) / 3.4)
  if (g >= EV_S1.shaveMarch.g - 0.3 && g < EV_S1.loupeSquint.g) {
    sprite(ctx, S.captain, cx - 46, SHAVE_ROOM.lineY + 6, { pose: { ...walkCyc(g * 7, 6), lean: 0.05 }, sx: 2.5, sy: 2.5 })
  }
  if (g >= EV_S1.shaveMarch.g && g < EV_S1.loupeSquint.g) {
    ART.clippers(ctx, cx + 12, SHAVE_ROOM.lineY - 150, 1.35, t, {})
    // clippings fly at the active chair
    ART.dustPuff(ctx, cx + 34, SHAVE_ROOM.lineY - 132, ((t * 3) % 0.4), 0.4, 9, 7, 'rgba(190,170,120,')
    if (Math.sin(t * 22) > 0.4) ART.glint(ctx, cx + 30, SHAVE_ROOM.lineY - 148, 26, (t * 1.5) % 1)
  }
  // THE LOUPE SQUINT (foreshadow): Hadbald leans into 42's scalp
  if (g >= EV_S1.loupeSquint.g && g < EV_S1.stampThunk.g + 0.5) {
    const hx = SHAVE_ROOM.chairs[1]
    sprite(ctx, S.captain, hx + 84, SHAVE_ROOM.lineY + 4, { pose: { lift: [2, 0], stride: [1, 0], lean: 0.2 }, sx: 2.5, sy: 2.5 })
    ART.loupe(ctx, hx + 62, SHAVE_ROOM.lineY - 190, 2.1, cl((g - EV_S1.loupeSquint.g) / 0.3))
    if (g < EV_S1.stampThunk.g) ctx.globalAlpha = 0.85
    ctx.globalAlpha = 1
  }
  // the dry guard with the tiny umbrella (gag S1-A1), deadpan right of chair 4
  drawGuard(ctx, 2, 1690, SHAVE_ROOM.lineY, { pose: stand, sy: 2.3 })
  ART.umbrellaProp(ctx, 1652, SHAVE_ROOM.lineY - 232, -0.5, 2.0, 1, t, {})
  // HAIR-SNOW falls room-wide (money shot 1); the sign catches it too
  ART.hairSnow(ctx, g, { alpha: 0.9 })
  // intake insert: the file + HAIR: N/A thunk (gag S1-B2)
  if (g >= EV_S1.stampThunk.g && g < EV_S1.stampThunk.g + 1.1) {
    const p = slamIn(g, EV_S1.stampThunk.g, 0.14)
    ctx.save()
    ctx.translate(1000, 430)
    ctx.rotate(-0.06)
    ctx.scale(1 + (1 - p) * 0.15, 1 + (1 - p) * 0.15)
    ctx.fillStyle = '#c9b48c'
    ctx.fillRect(-190, -120, 380, 240)
    ctx.fillStyle = '#b8a274'
    ctx.fillRect(-190, -120, 380, 40)
    ctx.fillStyle = '#3c3020'
    ctx.font = `700 30px "Space Grotesk"`
    ctx.textAlign = 'center'
    ctx.fillText('INTAKE — NO. 42', 0, -60)
    ctx.textAlign = 'left'
    ctx.restore()
    MOTION.stamp(ctx, 'HAIR: N/A', 1000, 470, { size: 74, color: '#1c2028', p, rot: -0.1, seed: 42 })
  }
  ctx.restore()
  // fluorescent flicker
  ctx.fillStyle = `rgba(220,235,225,${0.04 + hash(Math.floor(t * 13)) * 0.02})`
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

function drawS1d(ctx, lt, t) {
  const g = warp(t).g
  if (g < 16.2) {
    // warden's welcome speech with the flip-chart
    ctx.fillStyle = '#3c2c1c'
    ctx.fillRect(-30, -30, W + 60, H + 60)
    cam(ctx, 1.06, lerp(820, 900, cl(lt / 1.8)), 620)
    stage(ctx, S.office)
    ART.flipChart(ctx, 620, 940, 1.15)
    sprite(ctx, S.warden, 980, 930, { pose: { lift: [2, 0], stride: [1, 0], lean: -0.04 }, sx: 2.5, sy: 2.5 })
    // guards at parade rest by the door
    drawGuard(ctx, 0, 380, 940, { pose: stand, sy: 2.2 })
    drawGuard(ctx, 1, 470, 940, { pose: stand, sy: 2.2 })
    ctx.restore()
    ctx.fillStyle = 'rgba(255,220,160,0.05)'
    ctx.fillRect(-30, -30, W + 60, H + 60)
    return
  }
  // CUTAWAY: cell night — the quiet BALD-CAP reveal
  ctx.fillStyle = '#12141c'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 1.3, CELL.bunkX + 130, 640)
  stage(ctx, S.cell)
  // moon shaft from the vent
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const mg = ctx.createLinearGradient(0, 200, 0, 900)
  mg.addColorStop(0, 'rgba(160,180,220,0.2)')
  mg.addColorStop(1, 'rgba(160,180,220,0.02)')
  ctx.fillStyle = mg
  ctx.beginPath()
  ctx.moveTo(1740, 340)
  ctx.lineTo(1900, 340)
  ctx.lineTo(1500, 920)
  ctx.lineTo(1200, 920)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // 42 on the bunk edge, palming his scalp, peels the cap corner
  const hx = CELL.bunkX + 40
  sprite(ctx, S.andyCap, hx, CELL.floorY - 104, { pose: { lift: [3, 1], stride: [0, 0], lean: -0.06 }, sx: 2.5, sy: 2.5 })
  // the arm to the scalp
  ctx.strokeStyle = '#d8c2b2'
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(hx + 30, CELL.floorY - 260)
  ctx.lineTo(hx - 14, crownY(S.andyCap, CELL.floorY - 104, 2.5) + 34)
  ctx.stroke()
  const peelK = cl((g - EV_S1.capPeel.g) / 0.25)
  const sliverK = cl((g - (EV_S1.capPeel.g + 0.2)) / 0.2)
  ART.capSliver(ctx, hx - 16, crownY(S.andyCap, CELL.floorY - 104, 2.5) + 44, 2.5, peelK, sliverK, t)
  // the rat's audience-wink (gag S1-C6)
  if (g >= 17.4) ART.ratProp(ctx, 760, CELL.floorY - 8, 2.2, t, { combover: true, wink: g >= 17.45 })
  ctx.restore()
  ctx.fillStyle = 'rgba(20,26,44,0.18)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

// ============================== TITLE ==============================

function drawTitle(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#2c2438'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 0.92, lerp(1000, 1060, cl(lt / 3)), 620)
  stage(ctx, S.yardDusk)
  // searchlights trade sweeps across the dusk
  ART.searchlight(ctx, YARD.searchlights[0], YARD.wallBaseY - 250, 0.35 + Math.sin(t * 0.8) * 0.4, 700, 30, 0.8, 'rgba(255,226,180,')
  ART.searchlight(ctx, YARD.searchlights[1], YARD.wallBaseY - 250, -0.3 + Math.sin(t * 0.66 + 2.2) * 0.36, 700, 30, 0.8, 'rgba(255,226,180,')
  // two silhouettes cross the yard mid-ground: the lifer and the new fish
  const wx = lerp(700, 1500, cl(lt / 3.2))
  drawRed(ctx, wx, GROUNDS.title + 6, { pose: { ...walkCyc(t * 4.4, 4), lean: 0.03 }, sy: 1.7 })
  drawAndy(ctx, wx + 90, GROUNDS.title + 2, { pose: { ...walkCyc(t * 4.4 + 0.5, 4), lean: 0.03 }, sy: 1.68 })
  ctx.restore()
  // dusk grade
  ctx.fillStyle = 'rgba(60,30,60,0.12)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

// ============================== S2 — YARD & COMB ==============================

function drawS2a(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#7c6e4e'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, lerp(1.02, 1.1, cl(lt / 5.4)), lerp(900, 1000, cl(lt / 5.4)), 640)
  stage(ctx, S.yardDay)
  // croquet: two inmates putt through the wickets
  for (const [i, kx] of [560, 900].entries()) {
    sprite(ctx, S.inmates[i + 2], kx, GROUNDS.s2, {
      pose: { lift: [2, 0], stride: [1, 0], lean: Math.sin(t * 2 + i) * 0.05 }, sx: 2.15, sy: 2.15,
    })
    // mallet swing on the beats
    if (Math.sin(t * 1.4 + i * 2.4) > 0.55) {
      ctx.strokeStyle = '#6a5434'
      ctx.lineWidth = 7
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(kx + 34, GROUNDS.s2 - 120)
      ctx.lineTo(kx + 60 + Math.sin(t * 9) * 10, GROUNDS.s2 - 40)
      ctx.stroke()
    }
  }
  // the crate with dominoes: 42 + RED's first trade (EV firstTrade)
  const trade = g >= EV_S2.firstTrade.g
  ctx.fillStyle = '#54401f'
  ctx.fillRect(1080, 836, 240, 70)
  ctx.fillStyle = '#6e5432'
  ctx.fillRect(1072, 828, 256, 12)
  // dominoes on the crate top
  ART.dominoProp(ctx, 1130, 820, 0.9, { rot: -0.2 })
  ART.dominoProp(ctx, 1180, 824, 0.9, { rot: 0.24 })
  if (trade) ART.dominoProp(ctx, 1235, 818, 0.9, { rot: -0.1 })
  drawRed(ctx, 1340, GROUNDS.s2, { pose: { lift: [2, 0], stride: [1, 0], lean: -0.05 }, sy: 2.45 })
  drawAndy(ctx, 1030, GROUNDS.s2, { pose: { lift: [2, 0], stride: [1, 0], lean: 0.05 }, sy: 2.45, flip: true })
  // guard strolls the fence line
  drawGuard(ctx, 0, lerp(2000, 1760, cl(lt / 5.4)), GROUNDS.s2, { pose: { ...walkCyc(t * 3, 4), lean: 0.02 }, sy: 2.2 })
  ctx.restore()
  ctx.fillStyle = 'rgba(255,244,220,0.05)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

function drawS2b(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#7c6e4e'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  // THE DEAL CLOSE-UP: slow push to max (text-check shot: BIGGER must survive)
  const push = cl(lt / 1.4)
  cam(ctx, lerp(1.7, 2.3, E.outCubic(push)), lerp(1120, 1165, push), lerp(700, 690, push))
  stage(ctx, S.yardDay)
  // crate edge at the bottom of frame
  ctx.fillStyle = '#54401f'
  ctx.fillRect(960, 850, 420, 90)
  ctx.fillStyle = '#6e5432'
  ctx.fillRect(952, 842, 436, 12)
  drawRed(ctx, 1046, 940, { pose: { lift: [2, 0], stride: [1, 0], lean: -0.04 }, sy: 2.4 })
  drawAndy(ctx, 1310, 940, { pose: { lift: [2, 0], stride: [1, 0], lean: 0.05 }, sy: 2.4, flip: true })
  // the reveal: RED raises the TINY comb to one eye like a jeweler (combScale)
  const reveal = cl((g - EV_S2.combReveal.g) / 0.35)
  const handover = cl((g - EV_S2.combHandover.g) / 0.3)
  const combX = lerp(1076, 1282, E.outCubic(handover))
  const combY = lerp(668, 664, handover)
  if (reveal > 0) {
    // arm up to the comb
    ctx.strokeStyle = '#685240'
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(1060, 792)
    ctx.lineTo(combX - 6, combY + 16)
    ctx.stroke()
    ART.rockComb(ctx, combX, combY, lerp(2.2, 3.4, reveal) * (1 + 0.06 * Math.sin(t * 3)), {
      rot: -0.5 + reveal * 0.3, glow: g >= EV_S2.combScale.g, t,
    })
    if (reveal < 1) ART.glint(ctx, combX, combY, 30, reveal)
  }
  // the domino beside it reads BIGGER (scale gag, S2-A1)
  ART.dominoProp(ctx, 1186, 806, 1.5, { rot: -0.1, label: reveal > 0.6 })
  // hollow-domino shake: a guard's hand rattles the box, hears nothing (S2-B2)
  if (g >= EV_S2.combScale.g && g < EV_S2.combHandover.g) {
    const sh = Math.sin(t * 30) * 6
    ctx.strokeStyle = '#c9b8a2'
    ctx.lineWidth = 12
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(1490, 700)
    ctx.lineTo(1420 + sh, 760)
    ctx.stroke()
    ctx.save()
    ctx.translate(1408 + sh, 782)
    ctx.rotate(Math.sin(t * 30) * 0.18)
    ctx.fillStyle = '#3c3428'
    ctx.fillRect(-34, -18, 68, 40)
    ctx.strokeStyle = '#262014'
    ctx.lineWidth = 3
    ctx.strokeRect(-34, -18, 68, 40)
    ctx.restore()
  }
  ctx.restore()
}

function drawS2c(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#5c5648'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, lerp(1.12, 1.2, cl(lt / 2.9)), lerp(1010, POSTER_RECT.x + 150, cl(lt / 2.9)), 620)
  stage(ctx, S.cell)
  // the RITA pin-up goes up at posterUp (drop + settle swing)
  if (g >= EV_S2.posterUp.g) {
    const up = cl((g - EV_S2.posterUp.g) / 0.35)
    drawPoster(ctx, S.rita, POSTER_RECT.x, POSTER_RECT.y, POSTER_RECT.w, POSTER_RECT.h, {
      drop: E.outCubic(up), swing: up >= 1 ? cl((g - EV_S2.posterUp.g - 0.35) / 0.6) : 0,
    })
    // 42 reaches down from the top pin
    if (up < 1) {
      ctx.strokeStyle = '#d8c2b2'
      ctx.lineWidth = 9
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(POSTER_RECT.x - 90, POSTER_RECT.y + 60)
      ctx.lineTo(POSTER_RECT.x + 60, POSTER_RECT.y + 10 - (1 - up) * 60)
      ctx.stroke()
    }
  }
  // 42 steps back to admire; the guard inspects HER mane with the magnifier
  drawAndy(ctx, 820, CELL.floorY, { pose: { lift: [2, 0], stride: [1, 0], lean: -0.04 }, sy: 2.45 })
  if (g >= EV_S2.posterUp.g + 0.8) {
    drawGuard(ctx, 0, 1660, CELL.floorY, {
      pose: { lift: [2, 0], stride: [1, 0], lean: g >= EV_S2.guardShrug.g ? -0.16 + Math.sin(t * 6) * 0.03 : 0.08 },
      sy: 2.45,
    })
    if (g < EV_S2.guardShrug.g) ART.magnifier(ctx, POSTER_RECT.x + 150 + 20, POSTER_RECT.y + 170, 1.7, { rot: -0.35 + Math.sin(t * 1.2) * 0.06 })
  }
  ctx.restore()
  ctx.fillStyle = 'rgba(255,236,190,0.05)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

// ============================== S3 — THE ARIA ==============================

function recordPlayer(ctx, t, o = {}) {
  const dx = OFFICE.deskX - 250, dy = OFFICE.deskY - 42
  ctx.save()
  ctx.translate(dx, dy)
  if (o.spin) {
    ctx.save()
    ctx.rotate(t * 9)
    ctx.fillStyle = '#18120c'
    ctx.beginPath()
    ctx.ellipse(0, 0, 40, 13, 0, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#c9a441'
    ctx.fillRect(-2, -12, 3, 10)
    ctx.restore()
    ctx.strokeStyle = 'rgba(232,214,160,0.4)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.ellipse(0, 0, 40, 13, 0, 0, 7)
    ctx.stroke()
  }
  // tonearm: drops at the needle, skitters after the burst-in
  ctx.save()
  ctx.translate(34, -16)
  const skit = o.skit ? Math.sin(t * 60) * 0.2 : 0
  ctx.rotate(-0.7 + (o.dropped ? 0.5 : 0.1) + skit)
  ctx.strokeStyle = '#c2ccd8'
  ctx.lineWidth = 3.4
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -30)
  ctx.stroke()
  ctx.restore()
  ctx.restore()
}

function drawS3a(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#4a3624'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, lerp(1.1, 1.22, cl(lt / 3.2)), lerp(1000, 1120, cl(lt / 3.2)), 620)
  stage(ctx, S.office)
  // the bolt slides at officeIn (the lock, audibly)
  if (g >= EV_S3.officeIn.g) {
    const bolt = cl((g - EV_S3.officeIn.g) / 0.25)
    ctx.fillStyle = '#8a8478'
    ctx.fillRect(OFFICE.doorX + 52, 620 + bolt * 60, 26, 10)
  }
  // 42 at the player, drops the needle at needleDrop
  drawAndy(ctx, OFFICE.deskX - 420, 930, { pose: { lift: [2, 0], stride: [1, 0], lean: g >= EV_S3.needleDrop.g ? 0.12 : 0.03 }, sy: 2.45 })
  recordPlayer(ctx, t, { spin: g >= EV_S3.needleDrop.g - 0.2, dropped: g >= EV_S3.needleDrop.g })
  // the aria rises: warm notes off the speaker (drawn ornament)
  if (g >= EV_S3.ariaStart.g) {
    const rise = cl((g - EV_S3.ariaStart.g) / 1.2)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 5; i++) {
      const ph = ((t * 0.5 + i * 0.23) % 1)
      ctx.strokeStyle = `rgba(232,178,58,${0.4 * rise * Math.sin(ph * Math.PI)})`
      ctx.lineWidth = 3
      ctx.beginPath()
      const nx = OFFICE.speakerX - 30 + i * 16
      ctx.moveTo(nx, 420 - ph * 120)
      ctx.quadraticCurveTo(nx + 8, 400 - ph * 120, nx, 380 - ph * 120)
      ctx.stroke()
    }
    ctx.restore()
    ART.glow(ctx, OFFICE.speakerX, 400, 0.7 * rise, { r: 200, a: 0.3, col: '232,178,58' })
  }
  ctx.restore()
}

function drawS3b(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#7c8894'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  const hold = cl((g - EV_S3.yardStop.g) / 0.5)
  cam(ctx, lerp(1.0, 1.08, hold), 960, 620)
  stage(ctx, S.yardDay)
  // EVERY SHAVED HEAD TILTS UP: inmates + guards frozen mid-look
  const tiltUp = { lift: [2, 1], stride: [1, 0], lean: -0.16 }
  for (const [i, [rx, rig]] of [[340, S.inmates[0]], [520, S.inmates[1]], [720, S.inmates[2]], [1620, S.inmates[3]], [1800, S.inmates[4]]].entries()) {
    sprite(ctx, rig, rx + Math.sin(i * 2) * 10, GROUNDS.s2 + (i % 2) * 8, { ...tiltUp, sx: 2.2, sy: 2.2 })
  }
  drawRed(ctx, 1150, GROUNDS.s2, { pose: tiltUp, sy: 2.45 })
  drawGuard(ctx, 0, 1430, GROUNDS.s2, { pose: tiltUp, sy: 2.35 })
  drawGuard(ctx, 1, 360, GROUNDS.s2, { pose: tiltUp, sy: 2.3 })
  // sprinkler mist + the small rainbow off the PA speaker
  ART.sprinklerRainbow(ctx, YARD.speakersX - 10, YARD.wallBaseY - 40, t, cl((g - EV_S3.sprinklerPass.g) / 0.8))
  ctx.restore()
  ctx.fillStyle = 'rgba(255,244,220,0.06)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

function drawS3c(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#4a3624'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 1.18, OFFICE.deskX - 60, 620, ...shakeXY(t, 0))
  stage(ctx, S.office)
  // feet on the desk, eyes closed, chairman of the board
  const leanK = g >= EV_S3.leanBack.g ? E.outCubic(cl((g - EV_S3.leanBack.g) / 0.5)) : 0
  sprite(ctx, S.andyCap, OFFICE.chairX - 210, 905, {
    pose: { lift: [2, 0], stride: [1, 0], lean: -0.05 - leanK * 0.12 }, sx: 2.45, sy: 2.45,
  })
  // his boots crossed ON the blotter
  ctx.fillStyle = '#2c2620'
  ctx.save()
  ctx.translate(OFFICE.deskX - 70, OFFICE.deskY - 30)
  ctx.rotate(-0.28)
  ctx.fillRect(-34, -12, 68, 24)
  ctx.restore()
  recordPlayer(ctx, t, { spin: true, dropped: true })
  // the pigeon returns on the next phrase (S3-B2)
  if (g >= EV_S3.ariaEnd.g) ART.pigeonProp(ctx, OFFICE.speakerX - 30, 322, 2.2, t, { bob: true })
  ctx.restore()
  ctx.fillStyle = 'rgba(255,220,160,0.06)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

function drawS3d(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#4a3624'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  const surf = g >= 44.2 && g < 45.0
  cam(ctx, 1.1, lerp(1100, 700, cl((g - 43.2) / 1.8)), 620, ...shakeXY(t, g >= EV_S3.burstIn.g && g < EV_S3.burstIn.g + 0.2 ? 7 : 0))
  stage(ctx, S.office)
  drawAndy(ctx, OFFICE.chairX - 210, 905, {
    pose: { lift: [2, 0], stride: [1, 0], lean: -0.16 + (g >= EV_S3.burstIn.g ? 0.06 : 0) }, sx: 2.45, sy: 2.45,
  })
  ctx.fillStyle = '#2c2620'
  ctx.save()
  ctx.translate(OFFICE.deskX - 70, OFFICE.deskY - 30)
  ctx.rotate(-0.28)
  ctx.fillRect(-34, -12, 68, 24)
  ctx.restore()
  recordPlayer(ctx, t, { spin: true, dropped: true, skit: g >= EV_S3.needleSkitter.g })
  // the sprint: guard R->L, slips on S1's tracked-in hair-snow, surfs into the door
  if (g >= EV_S3.burstRun.g - 0.2 && g < EV_S3.burstIn.g) {
    const sx = sprintX(g)
    const slipK = g >= 44.2 ? cl((g - 44.2) / 0.2) : 0
    drawGuard(ctx, 2, sx, GROUNDS.s3 + 20, {
      pose: { lift: [5, 2], stride: [4, -3], lean: -0.18 - slipK * 0.22, rot: -slipK * 0.22 },
      sy: 2.35,
    })
    // tracked-in hair-snow patches (the callback)
    ctx.fillStyle = 'rgba(216,208,188,0.5)'
    for (const [px, pw] of [[900, 130], [1240, 90], [1500, 70]]) {
      ctx.beginPath()
      ctx.ellipse(px, GROUNDS.s3 + 26, pw, 12, 0, 0, 7)
      ctx.fill()
    }
    if (g >= 44.2 && g < 44.7) ART.dustPuff(ctx, sx + 60, GROUNDS.s3 + 20, g - 44.2, 0.5, 13, 6, 'rgba(216,208,188,')
  }
  // BURST-IN: door bangs, dust, the needle skitters in the run-out groove
  if (g >= EV_S3.burstIn.g) {
    ART.dustPuff(ctx, OFFICE.doorX + 40, 700, g - EV_S3.burstIn.g, 0.6, 17, 9)
    drawGuard(ctx, 2, OFFICE.doorX + 150, GROUNDS.s3 + 20, { pose: { lift: [4, 2], stride: [3, -2], lean: 0.22 }, sy: 2.35 })
    if (g >= EV_S3.needleSkitter.g && g < EV_S3.needleSkitter.g + 0.9) {
      ctx.strokeStyle = `rgba(240,230,200,${0.5 * (1 - (g - EV_S3.needleSkitter.g) / 0.9)})`
      ctx.lineWidth = 2
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.arc(OFFICE.deskX - 250, OFFICE.deskY - 42, 16 + i * 5, 0.4 + i, 1.2 + i)
        ctx.stroke()
      }
    }
  }
  ctx.restore()
}

function drawS3e(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#2c2e34'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 1.14, lerp(1250, 960, cl(lt / 3.5)), 620)
  // THE DRY ROOM corridor: bare concrete + the steel door with the welded slot
  const g1 = ctx.createLinearGradient(0, -OS, 0, H + OS)
  g1.addColorStop(0, '#2c2e34')
  g1.addColorStop(0.6, '#3a3d44')
  g1.addColorStop(1, '#24262c')
  ctx.fillStyle = g1
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(12,14,18,${0.06 + hash(i * 7) * 0.1})`
    ctx.beginPath()
    ctx.ellipse(200 + hash(i) * 1600, 100 + hash(i * 3) * 700, 40 + hash(i * 5) * 90, 12 + hash(i * 9) * 22, 0, 0, 7)
    ctx.fill()
  }
  // the door
  const dx = 900
  ctx.fillStyle = '#43464e'
  ctx.fillRect(dx - 150, 260, 300, 680)
  ctx.strokeStyle = '#1c1e24'
  ctx.lineWidth = 8
  ctx.strokeRect(dx - 150, 260, 300, 680)
  // plate: THE DRY ROOM / NO CONDITIONER SERVED
  ctx.fillStyle = '#5c626e'
  ctx.fillRect(dx - 120, 380, 240, 96)
  ctx.fillStyle = '#181a20'
  ctx.font = `700 36px "Space Grotesk"`
  ctx.textAlign = 'center'
  ctx.fillText('THE DRY ROOM', dx, 424)
  ctx.font = `700 19px "Space Grotesk"`
  ctx.fillText('NO CONDITIONER SERVED', dx, 458)
  // the conditioner slot, welded shut (S3-C5)
  ctx.fillStyle = '#181a20'
  ctx.fillRect(dx - 70, 540, 140, 26)
  ctx.strokeStyle = '#8a8e96'
  ctx.lineWidth = 5
  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    ctx.moveTo(dx - 60 + i * 24, 538)
    ctx.lineTo(dx - 44 + i * 24, 568)
    ctx.stroke()
  }
  ctx.textAlign = 'left'
  // the walk of shame: escorted in, door shuts behind
  const walk = cl((g - EV_S3.dryRoom.g + 0.6) / 2.6)
  const ex = lerp(1600, dx + 90, E.inQuad(walk))
  drawAndy(ctx, ex, 940, { pose: { ...walkCyc(t * 4, 4), lean: 0.08 }, sy: 2.35 })
  drawGuard(ctx, 0, ex + 90, 940, { pose: { ...walkCyc(t * 4 + 0.4, 4), lean: 0.06 }, sy: 2.3 })
  drawGuard(ctx, 1, ex - 90, 940, { pose: { ...walkCyc(t * 4 + 0.8, 4), lean: 0.06 }, sy: 2.3 })
  // door swing shut at the end
  if (g > 48.2) {
    const shut = cl((g - 48.2) / 0.5)
    ctx.save()
    ctx.translate(dx - 150, 260)
    ctx.scale(1 - shut, 1)
    ctx.fillStyle = '#33363c'
    ctx.fillRect(0, 0, 300 * 0.4, 680)
    ctx.restore()
    if (shut >= 1) {
      ctx.fillStyle = '#1c1e24'
      ctx.fillRect(dx - 150, 260, 300, 680)
      ctx.fillStyle = '#43464e'
      ctx.fillRect(dx - 150, 260, 12, 680)
    }
  }
  ctx.restore()
  ctx.fillStyle = 'rgba(140,160,200,0.05)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

// ============================== S4 — YEARS PASS ==============================

function drawS4a(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#54473a'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 1.12, lerp(1160, 1080, cl(lt / 3.2)), 620)
  stage(ctx, S.library)
  // Brooks sweeps the closet corner (the origin story)
  sprite(ctx, S.brooks, 1500, GROUNDS.s4 + 40, { pose: { lift: [2, 0], stride: [1, 0], lean: 0.1 + Math.sin(t * 3) * 0.04 }, sx: 2.4, sy: 2.4 })
  ctx.strokeStyle = '#6a5434'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  const sw = Math.sin(t * 5) * 14
  ctx.beginPath()
  ctx.moveTo(1546, GROUNDS.s4 - 160)
  ctx.lineTo(1580 + sw, GROUNDS.s4 + 30)
  ctx.stroke()
  ctx.fillStyle = '#8a744c'
  ctx.fillRect(1570 + sw, GROUNDS.s4 + 26, 40, 10)
  // wet paint drips off the new sign onto Brooks's cardigan (S4-B4)
  if (g >= 50.4) {
    const drip = cl((g - 50.4) / 0.8)
    ctx.fillStyle = 'rgba(226,216,188,0.85)'
    for (const dx of [1010, 1090, 1160]) {
      const dl = drip * (60 + hash(dx) * 80)
      ctx.fillRect(dx, 616, 5, dl)
      ctx.beginPath()
      ctx.arc(dx + 2.5, 616 + dl, 4, 0, 7)
      ctx.fill()
    }
    if (drip >= 1) ART.glint(ctx, 1100, 700, 30, ((t * 0.8) % 1))
  }
  // Jake the crow on the desk, comb-over blowing in the fan draft (S4-B3)
  ART.crowProp(ctx, 800, 742, 2.4, t, { flap: true })
  // a patron crosses with an armload
  sprite(ctx, S.inmates[4], lerp(200, 500, cl(lt / 3.2)), GROUNDS.s4, { pose: { ...walkCyc(t * 4), lean: 0.05 }, sx: 2.1, sy: 2.1 })
  ctx.fillStyle = '#6e4a3c'
  ctx.fillRect(lerp(200, 500, cl(lt / 3.2)) + 30, GROUNDS.s4 - 200, 70, 50)
  ctx.restore()
  ctx.fillStyle = 'rgba(255,236,190,0.05)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

function drawS4b(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#54473a'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, lerp(1.0, 1.14, cl(lt / 3.2)), lerp(960, 1040, cl(lt / 3.2)), lerp(560, 520, cl(lt / 3.2)))
  stage(ctx, S.library)
  // THE BEAM CARVING (drawn text, QA'd as stills): BROOKS WAS BALD
  const b1 = DRAWN.find((d) => d.id === 'B1')
  const carve = cl((t - b1.f0) / (b1.f1 - b1.f0 - 0.8))
  ART.carveText(ctx, b1.text, 960, 176, 46, carve)
  // Brooks's farewell walk L->R (gentle, not grim), cap in hand
  const bx = lerp(700, 1500, E.ioSine(cl((t - 52.3) / 2.6)))
  sprite(ctx, S.brooks, bx, GROUNDS.s4, { pose: { ...walkCyc(t * 3.4, 4), lean: 0.02 }, sx: 2.35, sy: 2.35 })
  // Jake flies up to perch on the beam once he's passed
  if (t < 53.4) ART.crowProp(ctx, bx - 120, 742 - (t - 52.1) * 180, 2.0, t, { flap: true })
  else ART.crowProp(ctx, 1180, 108, 2.0, t, {})
  ctx.restore()
  ctx.fillStyle = 'rgba(255,236,190,0.05)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

function drawS4c(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#4a3624'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 1.0, 960, 560)
  // the LEDGER fills the desk pool of light
  ctx.fillStyle = '#241a10'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  const pg = ctx.createRadialGradient(960, 560, 60, 960, 560, 700)
  pg.addColorStop(0, 'rgba(255,226,160,0.14)')
  pg.addColorStop(1, 'rgba(255,226,160,0)')
  ctx.fillStyle = pg
  ctx.fillRect(200, 100, 1520, 920)
  // page turns cycle; row 4 lights at noneOnFile (the A-gag)
  const turn = g >= EV_S4.pageTurns[1].g ? 1 - Math.abs(((g - EV_S4.pageTurns[1].g) * 2.4) % 1 - 0.5) * 2
    : g >= EV_S4.pageTurns[0].g ? 1 - Math.abs(((g - EV_S4.pageTurns[0].g) * 2.4) % 1 - 0.5) * 2 : 0
  ART.ledgerPage(ctx, 940, 560, 1.0, { noneOnFile: g >= EV_S4.noneOnFile.g, flip: turn })
  // the warden squints, shrugs, pockets the sack anyway (S4-A2)
  sprite(ctx, S.warden, 1660, 950, {
    pose: { lift: [2, 0], stride: [1, 0], lean: g >= EV_S4.pocketSack.g ? -0.2 : -0.08 + Math.sin(t * 2) * 0.02 },
    sx: 2.5, sy: 2.5,
  })
  if (g >= EV_S4.noneOnFile.g && g < EV_S4.pocketSack.g) ART.glow(ctx, 760, 590, 0.4, { r: 120, a: 0.2, col: '255,120,90' })
  // the sack of shed over his shoulder on the pocket beat
  if (g >= EV_S4.pocketSack.g) {
    ctx.fillStyle = '#a8946a'
    ctx.beginPath()
    ctx.ellipse(1720, 700, 52, 40, 0.5, 0, 7)
    ctx.fill()
    ctx.strokeStyle = '#8a744c'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(1690, 672)
    ctx.quadraticCurveTo(1712, 650, 1736, 664)
    ctx.stroke()
  }
  ctx.restore()
}

// ============================== S5 — THE STORM ESCAPE ==============================

function drawS5a(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#5c5648'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 1.16, CELL.chartX + 190, 580)
  stage(ctx, S.cell)
  // SEASONS WIPE: light crawls spring -> winter and back (pure in g)
  const season = (Math.sin((g - 58.0) * 1.15) + 1) / 2
  ctx.fillStyle = `rgba(${season > 0.5 ? '180,200,235' : '255,226,150'},${0.1 * Math.abs(season - 0.5) * 2})`
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // 42 at the desk, still as furniture (19 years compressed)
  sprite(ctx, S.andyCap, CELL.deskX - 130, CELL.floorY, { pose: { lift: [2, 0], stride: [1, 0], lean: 0.03 }, sx: 2.4, sy: 2.4 })
  // THE CHART climbs (labels painted; QA as stills)
  const prog = seg(g, EV_S5.seasonsWipe.g, 61.5)
  ART.growthChart(ctx, CELL.chartX, 480, 220, 340, prog)
  // THE POSTERS rotate, each hung half an inch higher (S4-A1 + S5 pass-off)
  const swaps = EV_S5.posterSwaps
  const idx = g >= swaps[1].g ? 2 : g >= swaps[0].g ? 1 : 0
  const posters = [S.rita, S.flowlyn, S.raquel]
  for (let i = 0; i <= idx; i++) {
    const py = POSTER_RECT.y - i * 12
    if (i === idx) {
      const up = cl((g - swaps[Math.max(0, idx - (idx > 0 ? 1 : 0))] ?.g ?? 0) / 0.001)
      void up
      drawPoster(ctx, posters[i], POSTER_RECT.x, py, POSTER_RECT.w, POSTER_RECT.h, { drop: 1 })
    }
  }
  // thunder gathers: the vent flickers (real t), a shiver runs the frame
  if (g >= EV_S5.thunderGather.g) {
    const flick = hash(Math.floor(t * 17))
    if (flick > 0.86) {
      ctx.fillStyle = 'rgba(190,205,240,0.14)'
      ctx.fillRect(1660, 340, 120, 100)
    }
    cam(ctx, 1.16, CELL.chartX + 190, 580, ...shakeXY(t, (g - EV_S5.thunderGather.g) * 0.6))
  }
  ctx.restore()
}

function drawS5b(ctx, lt, t) {
  const g = warp(t).g
  if (g < EV_S5.emptyCell.g) {
    // morning count in the yard, storm light
    ctx.fillStyle = '#2c323e'
    ctx.fillRect(-30, -30, W + 60, H + 60)
    cam(ctx, 1.05, 900, 640, ...shakeXY(t, g >= EV_S5.rollCall.g && g < EV_S5.emptyCell.g ? 1.2 : 0))
    stage(ctx, S.yardStorm)
    for (const [i, rig] of S.inmates.entries()) {
      sprite(ctx, rig, 400 + i * 130, GROUNDS.s5, { ...bow(0.14), sx: 2.15, sy: 2.15 })
    }
    drawGuard(ctx, 0, 1180, GROUNDS.s5, { pose: { lift: [2, 0], stride: [1, 0], lean: 0.1 }, sy: 2.35 })
    drawGuard(ctx, 1, 320, GROUNDS.s5, { pose: stand, sy: 2.3 })
    ctx.restore()
    ART.rain(ctx, t, 0.5, 0.16, { n: 36 })
    return
  }
  // THE EMPTY CELL: warden + captain in the doorway, rage building
  ctx.fillStyle = '#5c5648'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  const rage = cl((g - EV_S5.emptyCell.g) / 2.2)
  cam(ctx, 1.2, 800, 620, ...shakeXY(t, rage * 3.4))
  stage(ctx, S.cell)
  // doorway light rakes in from the left
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const dg = ctx.createLinearGradient(0, 0, 700, 0)
  dg.addColorStop(0, 'rgba(220,228,244,0.16)')
  dg.addColorStop(1, 'rgba(220,228,244,0)')
  ctx.fillStyle = dg
  ctx.fillRect(-OS, -OS, 700 + OS, H + OS * 2)
  ctx.restore()
  drawRed(ctx, 1150, CELL.floorY, { pose: { lift: [2, 0], stride: [1, 0], lean: -0.06 }, sy: 2.35 })
  sprite(ctx, S.warden, 300, CELL.floorY + 10, { pose: { lift: [3, 1], stride: [2, -1], lean: -0.1 - rage * 0.1 }, sx: 2.55, sy: 2.55 })
  sprite(ctx, S.captain, 480, CELL.floorY, { pose: { lift: [2, 0], stride: [1, 0], lean: 0.14 }, sx: 2.45, sy: 2.45 })
  // the empty bunk is the reveal: light it
  ctx.fillStyle = 'rgba(220,228,244,0.1)'
  ctx.fillRect(CELL.bunkX - 130, CELL.floorY - 160, 300, 60)
  ctx.restore()
}

// the warden's rock volley + THE HURL + HIT-STOP 1 + the peel
function rockArc(g) {
  // one canonical volley: from the doorway to the poster wall
  const th = EV_S5.rockThrow.g
  const u = cl((g - th) / 0.34)
  const x0 = 560, y0 = 420, x1 = POSTER_RECT.x + 150, y1 = POSTER_RECT.y + 190
  return [lerp(x0, x1, u), lerp(y0, y1, u) - Math.sin(u * Math.PI) * 180, u]
}

function drawS5c(ctx, lt, t) {
  const g = warp(t).g
  const { stop } = warp(t)
  ctx.fillStyle = '#5c5648'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, lerp(1.14, 1.3, cl((g - 65.4) / 2.6)), lerp(860, POSTER_RECT.x + 130, cl((g - 65.4) / 2.6)), 600,
    ...shakeXY(t, g >= EV_S5.posterPeel.g && g < EV_S5.posterPeel.g + 0.2 ? 5 : 0))
  stage(ctx, S.cell)
  // the bible with the comb-shaped hollow: finger stuck, shaken off with dignity
  if (g >= 66.1 && g < EV_S5.rockThrow.g + 0.2) {
    ART.bibleProp(ctx, 620, 700, 2.4, t, { open: true, shake: g >= 66.7 && g < EV_S5.rockThrow.g })
    if (g >= 66.3 && g < 66.9) {
      ctx.strokeStyle = '#d8c2b2'
      ctx.lineWidth = 9
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(640, 620)
      ctx.lineTo(616, 690)
      ctx.stroke()
    }
  }
  // the volley rattles in (rocks bounce off the wall band)
  if (g >= EV_S5.rockOnset.g && g < EV_S5.rockThrow.g) {
    for (let i = 0; i < 3; i++) {
      const age = g - (EV_S5.rockOnset.g + i * 0.16)
      if (age < 0) continue
      const rx = 700 + i * 120 + age * 500
      const ry = 480 - Math.sin(cl(age / 0.3) * Math.PI) * 90 + cl(age / 0.3) * 300
      ART.rockProp(ctx, rx, ry, 1.4, i + 3, age * 9)
    }
  }
  // THE HURL + HIT-STOP 1: the rock hangs mid-void (g frozen), bloom through fx
  if (g >= EV_S5.rockThrow.g && g < EV_S5.posterPeel.g) {
    const [rx, ry] = rockArc(g)
    ART.rockProp(ctx, rx, ry, 1.7, 9, g * 7)
    if (stop) {
      // speed lines + halo, alive on real t
      ctx.strokeStyle = `rgba(230,238,250,${0.3 + 0.2 * Math.sin(t * 12)})`
      ctx.lineWidth = 3
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.moveTo(rx - 60 - i * 22, ry - 6 + i * 6)
        ctx.lineTo(rx - 20 - i * 22, ry - 2 + i * 6)
        ctx.stroke()
      }
      ART.glow(ctx, rx, ry, 0.9, { r: 150, a: 0.28, col: '220,232,252' })
    }
  }
  // impact beat: the poster bulges, then PEELS (hinge at the top corner)
  if (g >= EV_S5.posterPeel.g) {
    const peel = cl((g - EV_S5.posterPeel.g) / 0.4)
    // the tunnel mouth behind it: dark bore + hair fringe + RAQUEL pinned within
    ctx.fillStyle = '#080604'
    ctx.beginPath()
    ctx.ellipse(POSTER_RECT.x + 150, POSTER_RECT.y + 210, 140, 200, 0, 0, 7)
    ctx.fill()
    ctx.strokeStyle = 'rgba(120,104,88,0.85)'
    ctx.lineWidth = 4
    for (let i = 0; i < 18; i++) {
      const a = -2.8 + i * 0.31
      ctx.beginPath()
      ctx.moveTo(POSTER_RECT.x + 150 + Math.cos(a) * 128, POSTER_RECT.y + 210 + Math.sin(a) * 186)
      ctx.quadraticCurveTo(
        POSTER_RECT.x + 150 + Math.cos(a) * 152, POSTER_RECT.y + 210 + Math.sin(a) * 216,
        POSTER_RECT.x + 150 + Math.cos(a) * 164, POSTER_RECT.y + 210 + Math.sin(a) * 198 + 12,
      )
      ctx.stroke()
    }
    drawPoster(ctx, S.raquel, POSTER_RECT.x + 60, POSTER_RECT.y + 120, POSTER_RECT.w * 0.55, POSTER_RECT.h * 0.55, {})
    drawPoster(ctx, S.rita, POSTER_RECT.x, POSTER_RECT.y, POSTER_RECT.w, POSTER_RECT.h, { peel })
  }
  // the warden works the peel
  if (g >= EV_S5.rockThrow.g - 1 && g < EV_S5.posterPeel.g + 0.5) {
    sprite(ctx, S.warden, 760, CELL.floorY, {
      pose: { lift: [2, 0], stride: [1, 0], lean: 0.16 }, sx: 2.5, sy: 2.5,
    })
    if (g >= EV_S5.posterPeel.g) {
      ctx.strokeStyle = '#d8c2b2'
      ctx.lineWidth = 9
      ctx.lineCap = 'round'
      const reach = cl((g - EV_S5.posterPeel.g) / 0.3)
      ctx.beginPath()
      ctx.moveTo(830, 660)
      ctx.lineTo(lerp(860, POSTER_RECT.x + 30, reach), lerp(620, POSTER_RECT.y + 60, reach))
      ctx.stroke()
    }
  }
  ctx.restore()
}

function drawS5d(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#0c0a08'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 1.2, lerp(900, 1080, cl(lt / 3.2)), 600)
  stage(ctx, S.tunnel)
  // the dig: comb strokes at the face, debris falls (three beats)
  for (const [i, e] of EV_S5.digStrokes.entries()) {
    const age = t - e.f
    if (age < 0 || age > 0.5) continue
    const dx = 880 + i * 60
    ctx.save()
    ctx.translate(dx, 560)
    ctx.rotate(-0.5 + Math.sin(age * 20) * 0.2)
    ART.rockComb(ctx, 0, 0, 2.4, {})
    ctx.restore()
    ART.dustPuff(ctx, dx + 10, 580, age, 0.5, 21 + i, 6, 'rgba(120,104,80,')
    // the arm
    ctx.strokeStyle = '#d8c2b2'
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(dx + 60, 660)
    ctx.lineTo(dx + 8, 580)
    ctx.stroke()
  }
  // between strokes the comb hangs from a thread like a miner's canary (S5-B4)
  const digA = EV_S5.digStrokes
  const between = (t < digA[0].f || t > digA[2].f + 0.5) || (t > digA[0].f + 0.5 && t < digA[1].f)
  if (between) {
    const swy = Math.sin(t * 2.2) * 8
    ctx.strokeStyle = 'rgba(200,190,160,0.5)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(1000, 260)
    ctx.lineTo(1000 + swy, 430)
    ctx.stroke()
    ART.rockComb(ctx, 1000 + swy, 440, 2.2, { glow: true, t })
  }
  // the tally: DAY 6,839 scratched in the shed (drawn text, QA'd as stills)
  ctx.save()
  ctx.translate(1300, 470)
  ctx.rotate(-0.04)
  ctx.font = `700 40px "Space Grotesk"`
  ctx.fillStyle = 'rgba(16,12,8,0.8)'
  ctx.fillText('DAY 6,839', 2, 2)
  ctx.fillStyle = '#8a7c62'
  ctx.fillText('DAY 6,839', 0, 0)
  ctx.restore()
  // commuting rat with a comb-over (S5-C5)
  ART.ratProp(ctx, 500 + ((t * 120) % 900), 780, 2.6, t, { combover: true, flip: false })
  ctx.restore()
  // faint warm light from the bore mouth behind camera
  ctx.fillStyle = 'rgba(255,220,160,0.04)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

function drawS5e(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#080604'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 0.96, lerp(700, 1300, cl(lt / 3.2)), 600)
  stage(ctx, S.tunnel)
  // hair walls glisten: live sheen combs along the lining (real t)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 9; i++) {
    const px = 200 + i * 220 + Math.sin(t * 0.8 + i) * 20
    ctx.strokeStyle = `rgba(190,170,130,${0.1 + hash(i * 3) * 0.08})`
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(px, 250)
    ctx.quadraticCurveTo(px + 30, 420, px + 10, 560)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(px + 60, 900)
    ctx.quadraticCurveTo(px + 30, 760, px + 50, 640)
    ctx.stroke()
  }
  ctx.restore()
  // THE CRAWL: silhouette L->R through the shed-river pipe (g frozen in stops — n/a here)
  const cx = crawlX(g)
  if (cx > -160 && cx < 2100) {
    // mouth light behind him
    ctx.fillStyle = 'rgba(210,190,150,0.1)'
    ctx.beginPath()
    ctx.ellipse(cx - 240, 600, 90, 260, 0, 0, 7)
    ctx.fill()
    sprite(ctx, S.andySil, cx, 640, {
      pose: { lift: [3, 3], stride: [4, -3], lean: 0.1, rot: -1.32 + Math.sin(g * 10) * 0.04 },
      sx: 2.1, sy: 2.1,
    })
  }
  ctx.restore()
}

// CREEK + RIP: money shot 4. age math all on film t; rip progress on WORLD g.
const RIP_RELEASE_F = filmT(STOP2_G) + STOPS[1].d

function drawS5f(ctx, lt, t) {
  const { g, stop, sl } = warp(t)
  ctx.fillStyle = '#12141c'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  const emerge = cl((t - EV_S5.creekEmerge.f) / 1.6)
  const hx = lerp(300, 620, E.outCubic(emerge))
  cam(ctx, lerp(1.05, 1.18, cl((t - 75.6) / 3)), lerp(760, hx + 120, cl((t - 75.6) / 3)), 620,
    ...shakeXY(t, t > EV_S5.lightningHit.f && t < EV_S5.lightningHit.f + 0.25 ? 6 : 0))
  stage(ctx, S.creek)
  ART.waves(ctx, t, CREEK.waterY - 10, 1500, 0.8)
  // storm rain on real t
  ART.rain(ctx, t, 1, CREEK.rainSlant)
  // lightning at the hit (FLASHES does the white pop; the bolt lives here)
  const lk = t >= EV_S5.lightningHit.f ? Math.max(0, 1 - (t - EV_S5.lightningHit.f) / 0.3) : 0
  ART.lightningBolt(ctx, t, lk, 1180, { endY: CREEK.horizonY + 60, variant: 2 })
  // ANDY emerges from the pipe mouth, shirt torn, arms up into the rain
  const hy = CREEK.waterY - 30
  const armsUp = t >= EV_S5.lightningHit.f - 0.9 ? 1 : 0
  sprite(ctx, S.andyTorn, hx, hy, {
    pose: { lift: [3, 1], stride: [1, 0], lean: -0.05 - armsUp * 0.05 }, sx: 2.5, sy: 2.5,
  })
  if (armsUp) {
    ctx.strokeStyle = '#d8c2b2'
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(hx - 30, hy - 210)
    ctx.lineTo(hx - 64, hy - 330)
    ctx.moveTo(hx + 30, hy - 210)
    ctx.lineTo(hx + 64, hy - 330)
    ctx.stroke()
  }
  const crown = crownY(S.andyTorn, hy, 2.5) + 40
  // THE RIP: progress on WORLD g (freezes mid-tear at HIT-STOP 2)
  const ripK = cl((g - EV_S5.capRipOnset.g) / (STOP2_G - EV_S5.capRipOnset.g + 0.2))
  const microDrift = stop ? Math.sin(sl * 40) * 2.4 : 0
  if (ripK > 0 && ripK < 1) {
    ART.capSliver(ctx, hx - 18, crown, 2.5, ripK * 1.2, cl(ripK * 2.2), t)
    // the torn cap piece flies upwind
    const fly = cl(ripK * 1.3)
    ctx.save()
    ctx.translate(hx - 40 - fly * 90, crown - fly * 70)
    ctx.rotate(fly * 5 + (stop ? Math.sin(sl * 30) * 0.06 : 0))
    ctx.fillStyle = '#d8c2b2'
    ctx.beginPath()
    ctx.ellipse(0, 0, 22, 13, 0, 0, 7)
    ctx.fill()
    ctx.restore()
    // the first crimson burst from under the lifting edge
    ART.cascade(ctx, hx + 6, crown, Math.max(0.001, ripK * 0.5), microDrift, 1 - cl((ripK - 0.4) / 0.6) * 0.5)
  } else if (ripK >= 1) {
    // RELEASE = THE CASCADE: nineteen years, downwind
    const age = Math.max(0, t - RIP_RELEASE_F)
    const settle = cl((t - EV_S5.cascadeSettle.f) / 1.0)
    ART.cascade(ctx, hx + 6, crown, age, microDrift, settle)
    ART.windMane(ctx, hx + 2, crown, 1.05, t, CRIMSON, 0.4 + 0.6 * settle)
  }
  ctx.restore()
  // cold storm grade
  ctx.fillStyle = 'rgba(40,60,90,0.1)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

// ============================== S6 — MORNING & THE BEACH ==============================

function drawS6a(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#3a4054'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 1.1, 960, 620)
  // dawn yard corner: the news rack
  const g1 = ctx.createLinearGradient(0, -OS, 0, H + OS)
  g1.addColorStop(0, '#42506e')
  g1.addColorStop(0.6, '#6a6a80')
  g1.addColorStop(1, '#4c4a58')
  ctx.fillStyle = g1
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  ctx.fillStyle = 'rgba(255,220,160,0.1)'
  ctx.fillRect(-OS, 500, W + OS * 2, 460)
  // rack
  ctx.fillStyle = '#4c3a24'
  ctx.fillRect(700, 560, 520, 380)
  ctx.fillStyle = '#3a2c1a'
  ctx.fillRect(730, 600, 460, 40)
  // THE BUGLE slams onto the rack
  if (g >= EV_S6.bugleSlam.g) {
    const p = slamIn(t, EV_S6.bugleSlam.f)
    ctx.save()
    ctx.translate(960, 660)
    ctx.rotate(-0.03 + (1 - p) * 0.12)
    ctx.scale(1 + (1 - p) * 0.2, 1 + (1 - p) * 0.2)
    ART.buglePage(ctx, 0, 0, 0.62, { mug: S.mug452 })
    ctx.restore()
    if (t - EV_S6.bugleSlam.f < 0.3) ART.dustPuff(ctx, 960, 820, t - EV_S6.bugleSlam.f, 0.4, 29, 7)
  }
  // the pigeon reads the rack copy (S6-B4)
  if (g >= EV_S6.bugleSlam.g + 0.6) ART.pigeonProp(ctx, 1180, 548, 2.4, t, { bob: Math.sin(t * 1.2) > 0 })
  // EXHIBIT A-1: the regime (clippers bag, tags dangling)
  ART.evidenceBag(ctx, 1450, 900, 1.3, t)
  // sirens: alternating red/blue wash on real t
  if (g >= EV_S6.sirens.g) {
    const ph = Math.sin(t * 7) > 0
    ctx.fillStyle = ph ? 'rgba(220,60,60,0.09)' : 'rgba(70,90,230,0.09)'
    ctx.fillRect(-30, -30, W + 60, H + 60)
  }
  ctx.restore()
}

function drawS6b(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#4a3624'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  const push = cl(lt / 2.6)
  cam(ctx, lerp(1.05, 1.22, push), lerp(1000, 1080, push), 620)
  stage(ctx, S.office)
  // the board bench: three gray uniforms behind the tall desk
  ctx.fillStyle = '#33261a'
  ctx.fillRect(880, 470, 700, 60)
  ctx.fillStyle = '#443020'
  ctx.fillRect(880, 530, 700, 260)
  for (const [i, key] of [0, 1, 2].entries()) {
    sprite(ctx, S.guards[key], 1000 + i * 220, 700, {
      pose: { lift: [2, 0], stride: [1, 0], lean: Math.sin(t * 1.4 + i) * 0.03 }, sx: 2.2, sy: 2.2,
    })
  }
  // RED at the small table, the nameplate does the gag silently
  drawRed(ctx, 620, 950, { pose: { lift: [2, 0], stride: [1, 0], lean: g >= 87 ? -0.08 : 0.04 }, sy: 2.5 })
  ART.nameplate(ctx, 760, 852, 1.15)
  ctx.fillStyle = '#4c3a24'
  ctx.fillRect(560, 860, 420, 30)
  ctx.restore()
  ctx.fillStyle = 'rgba(255,220,160,0.05)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

function drawS6c(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#4a3624'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  // P2 then the stamp SLAM then the smudge held to camera
  if (g < EV_S6.stampSlam.g) {
    cam(ctx, 1.2, 900, 620)
    stage(ctx, S.office)
    ctx.fillStyle = '#33261a'
    ctx.fillRect(880, 470, 700, 60)
    ctx.fillStyle = '#443020'
    ctx.fillRect(880, 530, 700, 260)
    drawRed(ctx, 620, 950, { pose: { lift: [2, 0], stride: [1, 0], lean: -0.08 }, sy: 2.5 })
    ART.nameplate(ctx, 760, 852, 1.15)
    ctx.restore()
    return
  }
  // the paper held to camera: APPROVED-FLOW + the comb-shaped ink blot (S6-B3)
  const punch = cl((t - EV_S6.stampSlam.f) / 0.5)
  cam(ctx, lerp(1.2, 1.45, E.outCubic(punch)), lerp(960, 960, punch), lerp(620, 560, punch), ...shakeXY(t, t < EV_S6.stampSlam.f + 0.16 ? 7 : 0))
  ctx.fillStyle = '#241a10'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  ctx.save()
  ctx.translate(960, 560)
  ctx.rotate(-0.04)
  ctx.fillStyle = '#e8e0cc'
  ctx.fillRect(-330, -240, 660, 480)
  ctx.strokeStyle = '#b8ac8c'
  ctx.lineWidth = 3
  ctx.strokeRect(-330, -240, 660, 480)
  ctx.fillStyle = '#3c3428'
  ctx.font = `700 26px "Space Grotesk"`
  ctx.textAlign = 'center'
  ctx.fillText('STATE FLOWPENITENTIARY — PAROLE', 0, -170)
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = 'rgba(90,80,60,0.5)'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(-280, -110 + i * 40)
    ctx.lineTo(i === 4 ? -40 : 280, -110 + i * 40)
    ctx.stroke()
  }
  ctx.restore()
  if (t >= EV_S6.stampSlam.f) {
    const p = cl((t - EV_S6.stampSlam.f) / 0.2)
    MOTION.stamp(ctx, 'APPROVED-FLOW', 960, 500, { size: 96, color: '#b3372a', p, rot: -0.12, seed: 6 })
  }
  // the ink blot shaped like a tiny comb, held to camera at inkSmudge
  if (t >= EV_S6.inkSmudge.f) {
    const ink = cl((t - EV_S6.inkSmudge.f) / 0.3)
    ctx.save()
    ctx.translate(960, 640)
    ctx.globalAlpha = ink
    ctx.fillStyle = 'rgba(46,40,80,0.85)'
    ctx.beginPath()
    ctx.roundRect(-56, -14, 112, 16, 6)
    ctx.fill()
    for (let i = 0; i < 6; i++) {
      ctx.beginPath()
      ctx.roundRect(-52 + i * 18, 0, 9, 16 + (i % 2) * 5, 3)
      ctx.fill()
    }
    ctx.restore()
    if (ink < 1) ART.glint(ctx, 960, 620, 40, ink)
  }
  ctx.restore()
}

function drawS6d(ctx, lt, t) {
  ctx.fillStyle = '#54473a'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, lerp(1.12, 1.2, cl(lt / 1.8)), 1050, 500)
  stage(ctx, S.library)
  // B1 still there; B2 carved under it as RED passes (the bookend)
  ART.carveText(ctx, 'BROOKS WAS BALD', 960, 176, 46, 1)
  const b2 = DRAWN.find((d) => d.id === 'B2')
  ART.carveText(ctx, b2.text, 960, 240, 38, cl((t - b2.f0) / (b2.f1 - b2.f0)))
  // RED on the stool, knife arm at the beam
  sprite(ctx, S.red, 1130, GROUNDS.s4, { pose: { lift: [2, 0], stride: [1, 0], lean: 0.06 }, sx: 2.45, sy: 2.45 })
  ctx.strokeStyle = '#c9a882'
  ctx.lineWidth = 9
  ctx.lineCap = 'round'
  const carveK = cl((t - b2.f0) / (b2.f1 - b2.f0))
  ctx.beginPath()
  ctx.moveTo(1160, 620)
  ctx.lineTo(1120 + Math.sin(t * 16) * 8 * (carveK < 1 ? 1 : 0), 250)
  ctx.stroke()
  if (carveK < 1) ART.dustPuff(ctx, 1040, 250, ((t * 3) % 0.3), 0.3, 8, 3, 'rgba(200,170,110,')
  ART.crowProp(ctx, 1300, 108, 2.0, t, {})
  ctx.restore()
  ctx.fillStyle = 'rgba(255,236,190,0.05)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

function drawS6e(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#a8865a'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 1.0, 960, 540)
  stage(ctx, S.beach)
  ART.waves(ctx, t, BEACH.sandlineY - 40, 1800, 0.6)
  // the postcard drifts toward camera, then drops away at sandlineWalk
  const out = cl((g - EV_S6.sandlineWalk.g) / 0.5)
  if (out < 1) {
    ctx.save()
    ctx.translate(960 + Math.sin(t * 0.7) * 8, 540 - out * out * 900)
    ctx.rotate(Math.sin(t * 0.5) * 0.02 + out * 0.3)
    ctx.scale(1.05 - out * 0.1, 1.05 - out * 0.1)
    ART.postcardProp(ctx, 0, 0, 1.0, {})
    ctx.restore()
  }
  // RED already walking the sandline, far
  const wx = redSandX(Math.max(EV_S6.sandlineWalk.g, g))
  if (g >= EV_S6.sandlineWalk.g) drawRed(ctx, lerp(220, 320, out), BEACH.sandlineY + 8, { pose: { ...walkCyc(t * 4), lean: 0.04 }, sy: 1.7 })
  void wx
  ctx.restore()
  ctx.fillStyle = 'rgba(255,226,180,0.06)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

function drawS6f(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#a8865a'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  // BEACH REVEAL: slow push past the stern lettering at boatNamePass
  const pass = cl((t - EV_S6.boatNamePass.f) / 1.4)
  cam(ctx, lerp(1.0, 1.22, E.ioSine(pass)), lerp(1100, ANDY_BEACH_X - 60, E.ioSine(pass)), 620)
  stage(ctx, S.beach)
  ART.waves(ctx, t, BEACH.sandlineY - 40, 2000, 0.9)
  // wind picks to contact at windContact: his mane answers
  const wind = cl((t - EV_S6.beachReveal.f) / 1.0) * 0.4 + cl((t - EV_S6.windContact.f) / 0.6) * 0.6
  // the wind streaks
  ctx.strokeStyle = `rgba(240,236,220,${0.14 * wind})`
  ctx.lineWidth = 3
  for (let i = 0; i < 7; i++) {
    const yy = 300 + i * 70
    ctx.beginPath()
    ctx.moveTo(400 + ((t * 700 + i * 260) % 1200), yy)
    ctx.lineTo(400 + ((t * 700 + i * 260) % 1200) - 110, yy - 8)
    ctx.stroke()
  }
  // THE HERO at the skiff, full mane catching the wind
  drawAndy(ctx, ANDY_BEACH_X, BEACH.sandlineY + 12, {
    pose: { lift: [2, 0], stride: [1, 0], lean: -0.04 - wind * 0.03 }, sy: 2.6, cap: false,
    mane: true, maneK: wind, t,
  })
  // RED closes down the sandline
  if (t >= EV_S6.sandlineWalk.f - 0.4) {
    const rx = redSandX(Math.max(EV_S6.sandlineWalk.g, g))
    drawRed(ctx, rx, BEACH.sandlineY + 6, { pose: { ...walkCyc(t * 4.4), lean: 0.04 }, sy: 2.2, mane: true, maneK: wind, t })
  }
  ctx.restore()
  ctx.fillStyle = 'rgba(255,226,180,0.07)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

function drawS6g(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#a8865a'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 0.94, 960, 600)
  stage(ctx, S.beach)
  ART.waves(ctx, t, BEACH.sandlineY - 40, 2100, 1)
  // reunion wide: crimson + silver in the wind, the sea breathing
  const wind = 0.8 + 0.2 * Math.sin(t * 0.9)
  const drift = Math.sin(t * 0.4) * 14
  drawAndy(ctx, 880 + drift, BEACH.sandlineY + 10, {
    pose: { lift: [2, 0], stride: [1, 0], lean: -0.03 }, sy: 2.3, cap: false, mane: true, maneK: wind, t,
  })
  drawRed(ctx, 1060 + drift, BEACH.sandlineY + 12, {
    pose: { lift: [2, 0], stride: [1, 0], lean: -0.03 }, sy: 2.3, mane: true, maneK: wind, t,
  })
  ctx.restore()
  ctx.fillStyle = 'rgba(255,226,180,0.08)'
  ctx.fillRect(-30, -30, W + 60, H + 60)
}

// ============================== the film ==============================

let scoreFn = null

export default {
  title: 'THE BALDSHANK REDEMPTION',
  output: 'baldshank.mp4',
  duration: DURATION,
  async prepare() {
    const load = async (id, far) => A.loadRemy(id, !!far)
    // CAST (casting.md final table): 42 hero (denim, blade -> tiny rock-comb, the
    // BALD CAP), 324 RED, 452 warden (card-fan stripped), 2529 captain, 246 BROOKS.
    S.andy = ART.combify(ART.stripBlade(ART.denim(await load(CAST.andy.id))))
    S.andyCap = ART.baldCap(S.andy)
    S.andyFar = ART.combify(ART.stripBlade(ART.denim(await load(CAST.andy.id, true))), true)
    S.andyCapFar = ART.baldCap(S.andyFar)
    S.andySil = ART.tintR(S.andy, '#0e0c12')
    S.andyTorn = S.andy
    S.red = ART.denim(await load(CAST.red.id))
    S.redFar = ART.denim(await load(CAST.red.id, true))
    S.warden = ART.stripCards(await load(CAST.warden.id))
    S.wardenFar = ART.stripCards(await load(CAST.warden.id, true))
    S.captain = await load(CAST.captain.id)
    S.brooks = ART.cardigan(await load(CAST.brooks.id))
    S.inmates = []
    for (const id of CAST.inmates.ids) S.inmates.push(ART.denim(await load(id)))
    S.guards = []
    for (const id of CAST.guards.ids) S.guards.push(ART.grayUniform(await load(id)))
    const heads = await A.loadHeads()
    S.mug452 = A.headIcon(heads, CAST.warden.id, 9)
    // sets (all with OS overscan; the SKIFF lettering + yard sign are baked)
    S.bus = ART.busBake()
    S.yardOvercast = ART.yardBake('day')
    S.yardDay = ART.yardBake('day')
    S.yardDusk = ART.yardBake('dusk')
    S.yardStorm = ART.yardBake('storm')
    S.shave = ART.shaveBake()
    S.cell = ART.cellBake()
    S.office = ART.officeBake()
    S.library = ART.libraryBake()
    S.creek = ART.creekBake()
    S.tunnel = ART.tunnelBake()
    S.beach = ART.beachBake()
    // the posters (orig renders, manes painted fuller, taglines baked)
    S.rita = await ART.posterBake('rita')
    S.flowlyn = await ART.posterBake('flowlyn')
    S.raquel = await ART.posterBake('raquel')
    // the composer's module, wired when it lands (stills run silent without it)
    try { const m = await import('./score.js'); scoreFn = m.score ?? m.default ?? null } catch { /* score not landed yet */ }
  },
  shots: SHOTS.map((sh) => ({
    name: sh.name,
    t0: sh.t0,
    t1: sh.t1,
    draw(ctx, lt, dur, t) {
      if (sh.name === 's1a') drawS1a(ctx, lt, t)
      else if (sh.name === 's1b') drawS1b(ctx, lt, t)
      else if (sh.name === 's1c') drawS1c(ctx, lt, t)
      else if (sh.name === 's1d') drawS1d(ctx, lt, t)
      else if (sh.name === 'title') drawTitle(ctx, lt, t)
      else if (sh.name === 's2a') drawS2a(ctx, lt, t)
      else if (sh.name === 's2b') drawS2b(ctx, lt, t)
      else if (sh.name === 's2c') drawS2c(ctx, lt, t)
      else if (sh.name === 's3a') drawS3a(ctx, lt, t)
      else if (sh.name === 's3b') drawS3b(ctx, lt, t)
      else if (sh.name === 's3c') drawS3c(ctx, lt, t)
      else if (sh.name === 's3d') drawS3d(ctx, lt, t)
      else if (sh.name === 's3e') drawS3e(ctx, lt, t)
      else if (sh.name === 's4a') drawS4a(ctx, lt, t)
      else if (sh.name === 's4b') drawS4b(ctx, lt, t)
      else if (sh.name === 's4c') drawS4c(ctx, lt, t)
      else if (sh.name === 's5a') drawS5a(ctx, lt, t)
      else if (sh.name === 's5b') drawS5b(ctx, lt, t)
      else if (sh.name === 's5c') drawS5c(ctx, lt, t)
      else if (sh.name === 's5d') drawS5d(ctx, lt, t)
      else if (sh.name === 's5e') drawS5e(ctx, lt, t)
      else if (sh.name === 's5f') drawS5f(ctx, lt, t)
      else if (sh.name === 's6a') drawS6a(ctx, lt, t)
      else if (sh.name === 's6b') drawS6b(ctx, lt, t)
      else if (sh.name === 's6c') drawS6c(ctx, lt, t)
      else if (sh.name === 's6d') drawS6d(ctx, lt, t)
      else if (sh.name === 's6e') drawS6e(ctx, lt, t)
      else if (sh.name === 's6f') drawS6f(ctx, lt, t)
      else if (sh.name === 's6g') drawS6g(ctx, lt, t)
    },
    fx: (lt, t) => {
      const base = { letterbox: SAFE.letterbox, bloom: 0.1, bloomThresh: 0.9, vignette: 0.5, grain: 0.014 }
      switch (sh.name) {
        case 's1a': return { ...base, bloom: 0.09, vignette: 0.62, sat: 0.9, warm: 0.06, exposure: -0.04 }
        case 's1b': return { ...base, bloom: 0.09, vignette: 0.6, sat: 0.92, exposure: -0.03 }
        case 's1c': return { ...base, bloom: 0.11, vignette: 0.55, warm: 0.08 }
        case 's1d': return { ...base, bloom: 0.1, vignette: 0.66, exposure: -0.1, sat: 0.88 }
        case 'title': return { ...base, bloom: 0.13, bloomThresh: 0.86, vignette: 0.48, warm: 0.16, sat: 1.02 }
        case 's2a': return { ...base, bloom: 0.09, vignette: 0.5, warm: 0.12 }
        case 's2b': return { ...base, bloom: 0.1, vignette: 0.46, warm: 0.14 }
        case 's2c': return { ...base, bloom: 0.09, vignette: 0.58, exposure: -0.04 }
        case 's3a': return { ...base, bloom: 0.12, bloomThresh: 0.86, vignette: 0.55, warm: 0.18 }
        case 's3b': return { ...base, bloom: 0.12, vignette: 0.42, haze: 0.06, warm: 0.16, sat: 1.04 }
        case 's3c': return { ...base, bloom: 0.13, bloomThresh: 0.85, vignette: 0.5, warm: 0.2, sat: 1.04 }
        case 's3d': return { ...base, bloom: 0.11, vignette: 0.52, warm: 0.16 }
        case 's3e': return { ...base, bloom: 0.08, vignette: 0.64, exposure: -0.07, sat: 0.88 }
        case 's4a': return { ...base, bloom: 0.09, vignette: 0.54, warm: 0.1 }
        case 's4b': return { ...base, bloom: 0.09, vignette: 0.56, warm: 0.1, exposure: -0.02 }
        case 's4c': return { ...base, bloom: 0.08, vignette: 0.6, exposure: -0.05, sat: 0.94 }
        case 's5a': return { ...base, bloom: 0.1, vignette: 0.58, exposure: -0.04, sat: 0.96 }
        case 's5b': return { ...base, bloom: 0.1, bloomThresh: 0.88, vignette: 0.6, exposure: -0.06, sat: 0.9 }
        case 's5c': {
          // HIT-STOP 1: the rock hangs, bloom comes through the freeze
          const inStop = t >= filmT(STOP1_G) && t < filmT(STOP1_G) + STOPS[0].d
          return { ...base, bloom: inStop ? 0.2 : 0.12, bloomThresh: inStop ? 0.8 : 0.88, vignette: 0.56, exposure: -0.05 }
        }
        case 's5d': return { ...base, bloom: 0.1, vignette: 0.66, exposure: -0.08, sat: 0.9 }
        case 's5e': return { ...base, bloom: 0.1, bloomThresh: 0.88, vignette: 0.62, exposure: -0.07, sat: 0.9 }
        case 's5f': {
          // HIT-STOP 2: the torn cap hangs, the bloom lifts; cascade settles warm
          const inStop = t >= filmT(STOP2_G) && t < filmT(STOP2_G) + STOPS[1].d
          const after = t >= RIP_RELEASE_F
          return {
            ...base,
            bloom: inStop ? 0.2 : after ? 0.13 : 0.1,
            bloomThresh: inStop ? 0.78 : 0.88,
            vignette: 0.5,
            sat: after ? 1.04 : 0.92,
            warm: after ? 0.14 : 0.04,
          }
        }
        case 's6a': return { ...base, bloom: 0.1, bloomThresh: 0.87, vignette: 0.5, warm: 0.1 }
        case 's6b': return { ...base, bloom: 0.09, vignette: 0.54, warm: 0.12 }
        case 's6c': return { ...base, bloom: 0.1, bloomThresh: 0.87, vignette: 0.52 }
        case 's6d': return { ...base, bloom: 0.09, vignette: 0.56, warm: 0.1 }
        case 's6e': return { ...base, bloom: 0.1, vignette: 0.46, warm: 0.16, sat: 1.03 }
        case 's6f': return { ...base, bloom: 0.12, bloomThresh: 0.86, vignette: 0.42, warm: 0.18, sat: 1.05, haze: 0.05 }
        case 's6g': {
          // the fade out rides the timeline's fadeStart beat
          const fade = cl((t - EV_S6.fadeStart.f) / (DURATION - EV_S6.fadeStart.f))
          return { ...base, bloom: 0.12, bloomThresh: 0.86, vignette: 0.46, warm: 0.18, sat: 1.03, fade }
        }
        default: return base
      }
    },
  })),
  // captions: single source of truth from the timeline ledger; span marks the
  // intentional cut-crossers, short plates get a minHold override, SUB1 takes the
  // small italic read.
  captions: CAPS.map((c) => ({
    ...c,
    span: true,
    ...(c.short ? { minHold: 1 } : {}),
    ...(c.id === 'SUB1' ? { size: 30, weight: 500, track: 1, color: '#f2ede0', shadow: '#100c08', glow: '#100c08', glowBlur: 10 } : {}),
    ...(c.id === 'T1' ? { shadow: '#0a0a10', glow: '#8a6a24', glowBlur: 22 } : {}),
    ...(c.id === 'F1' ? { shadow: '#101018', glow: '#8a6a24', glowBlur: 16 } : {}),
  })),
  captionStyles: {
    title: {
      font: 'Anton', size: 132, weight: '', color: '#e8b23a', track: 2,
      shadow: '#050608', glow: '#8a6a24', glowBlur: 22,
    },
    caption: {
      size: 40, weight: 600, color: '#ffffff',
      shadow: '#06080c', glow: '#06080c', glowBlur: 14,
    },
    kicker: {
      font: '"JetBrains Mono"', size: 26, weight: 700, color: '#d9c98f', track: 6,
      shadow: '#050608',
    },
  },
  flashes: FLASHES,
  score(kit) { if (scoreFn) return scoreFn(kit) }, // composer's module, wired when it lands
  audio: { seed: 1947, reverb: 2.6, reverbGain: 0.4 },
  // captionHold matches the timeline's own declared floor (ledger waivers carry
  // the shorter cards); the CAPS windows are the ledger's binding numbers
  lint: { captionHold: 1.5, safe: { margin: 0.05, letterbox: true } },
}
