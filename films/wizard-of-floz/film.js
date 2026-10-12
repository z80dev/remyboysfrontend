// THE WIZARD OF FLOZ — There's No Place Like Growth. 10 shots, 104 s, full-res
// painted stage (pirates-cabald lineage), sprites 2.4-3.2x nearest. Every frame a
// pure function of time: actors live on the shot clocks' world g (STOPS is empty —
// abs(g) = t0 + g everywhere), all particles analytic from timeline events, hash/rng
// only. Sepia discipline: S1/S2 and the S3 head + S10 tail run through the fx
// sat/tint print grade (hair-apparent recipe); the film's first color pixels are the
// door sliver at 19.7 drawn on the OVERLAY (the only way to escape the grade), and
// the S10 tail's single red accent rides the overlay the same way.
//
// DIEGETIC TEXT ON CANVAS (painted here, never captions — QA list):
//   S1 bike sign "TAKEN TO BE SHORN" (art.js bicycle)     S4 stump placard "CONDITIONER CAN"
//   S6 gate sign "BELL OUT OF ORDER — PLEASE KNOCK"       S7 smoke skywriting "SURRENDER FLOWTO"
//   S8 kettle? none / S9 console patch "PROJECTIONIST"    S9 tonic label "NOW WITH HAIR"
//   S9 balloon "FLOZ AIR LINES" + flip sign "BALDANSA OR BUST." / smiley
import { W, H, hash, seg, lerp, E } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import { OS, HORSE_PALS } from './art.js'
import {
  DUR, T, SHOTS,
  KANSAS_EV, TWISTER_EV, FLOZBURST_EV, BRICKROAD_EV, POPPIES_EV, EMERALD_EV, MONKEYS_EV,
  MELT_EV, CURTAIN_EV, GROWTH_EV, MASTER, CAPTIONS, SAFE, FLASHES, CAST, REPAINT,
  REPAINT_SHARED, HORSE_STEP, KNEEL_STAGGER,
} from './timeline.js'

const S = {} // prepare() bake store
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

let scoreFn = null // the composer owns ./score.js — guard the import, stills run silent without it

function sprite(ctx, rig, px, feet, o = {}) {
  ctx.imageSmoothingEnabled = false
  A.drawRemy(ctx, rig, px, feet, o)
}
const crownY = (rig, feet, sy) => feet - (rig.bottom - rig.top + 1) * sy + 7 * sy
const walkCyc = (ph, amp = 5) => {
  const s = Math.sin(ph)
  return { lift: [Math.round(Math.max(0, s) * amp), Math.round(Math.max(0, -s) * amp)], stride: [Math.round(s * 2), Math.round(-s * 2)], lean: 0.04 }
}
const stand = { lift: [2, 0], stride: [1, 0], lean: 0.02 }
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
const shadow = (ctx, x, feet, w, a = 0.28) => {
  ctx.fillStyle = `rgba(20,14,8,${a})`
  ctx.beginPath()
  ctx.ellipse(x, feet + 4, w, w * 0.22, 0, 0, 7)
  ctx.fill()
}
// sepia print grade (hair-apparent recipe: desaturate, warm the tint)
const SEPIA = { sat: 0.03, tint: [1.1, 0.96, 0.76], contrast: 1.05 }

// small prop painters local to staging (composed from ART primitives)
function lollipop(x, cx, cy, s, col) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  x.fillStyle = '#f0ece2'
  x.fillRect(-2.4, 0, 4.8, 46)
  x.fillStyle = col
  x.beginPath()
  x.arc(0, -8, 15, 0, 7)
  x.fill()
  x.strokeStyle = 'rgba(255,255,255,0.6)'
  x.lineWidth = 4
  x.beginPath()
  x.arc(0, -8, 9, 0.6, 2.6)
  x.stroke()
  x.restore()
}
function chicken(x, cx, cy, s, t, seed) {
  x.save()
  x.translate(cx, cy + Math.sin(t * 9 + seed) * 6)
  x.scale(s, s)
  x.fillStyle = '#e8e0d0'
  x.beginPath()
  x.ellipse(0, 0, 16, 9, -0.15, 0, 7)
  x.fill()
  // tail fans forward (they fly tail-first)
  x.fillStyle = '#d8ccb8'
  for (let i = 0; i < 3; i++) {
    x.beginPath()
    x.moveTo(10, -2 + i * 4)
    x.lineTo(30 + i * 4, -8 + i * 7)
    x.lineTo(12, 4 + i * 4)
    x.closePath()
    x.fill()
  }
  x.fillStyle = '#e8e0d0'
  x.beginPath()
  x.arc(-14, -4, 6, 0, 7)
  x.fill()
  x.fillStyle = '#e0a83c'
  x.beginPath()
  x.moveTo(-20, -5)
  x.lineTo(-26, -3)
  x.lineTo(-20, -1)
  x.closePath()
  x.fill()
  x.fillStyle = '#c23b2e'
  x.fillRect(-16, -12, 3, 4)
  x.fillStyle = '#1a1228'
  x.beginPath()
  x.arc(-15, -6, 1.4, 0, 7)
  x.fill()
  // flapping wings
  const flap = Math.sin(t * 16 + seed * 2) * 0.7
  x.save()
  x.rotate(flap)
  x.fillStyle = '#d8ccb8'
  x.beginPath()
  x.ellipse(-2, -4, 9, 5, -0.5, 0, 7)
  x.fill()
  x.restore()
  x.restore()
}
function monkeyWings(x, cx, cy, s, t, phase) {
  const flap = Math.sin(t * 10 + phase) * 0.55
  for (const side of [-1, 1]) {
    x.save()
    x.translate(cx + side * 6 * s, cy)
    x.rotate(flap * side)
    x.scale(s * side, s)
    x.fillStyle = REPAINT_SHARED.wingMembrane
    x.beginPath()
    x.moveTo(0, -6)
    x.quadraticCurveTo(52, -18, 78, 30)
    x.quadraticCurveTo(44, 26, 24, 34)
    x.quadraticCurveTo(10, 18, 0, 12)
    x.closePath()
    x.fill()
    x.strokeStyle = REPAINT_SHARED.wingRib
    x.lineWidth = 2
    for (let i = 0; i < 3; i++) {
      x.beginPath()
      x.moveTo(4, 0)
      x.quadraticCurveTo(30 + i * 8, 2 + i * 8, 66 - i * 14, 26)
      x.stroke()
    }
    x.restore()
  }
}
function boltNut(x, cx, cy, s, rot) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(s, s)
  x.fillStyle = '#9aa6b2'
  x.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const px = Math.cos(a) * 12, py = Math.sin(a) * 12
    if (i === 0) x.moveTo(px, py)
    else x.lineTo(px, py)
  }
  x.closePath()
  x.fill()
  x.fillStyle = '#5f6b78'
  x.beginPath()
  x.arc(0, 0, 5, 0, 7)
  x.fill()
  x.restore()
}
function wateringCan(x, cx, cy, s) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  x.fillStyle = '#8b95a2'
  x.fillRect(-16, -18, 32, 26)
  x.beginPath()
  x.ellipse(0, -18, 16, 5, 0, 0, 7)
  x.fill()
  x.strokeStyle = '#8b95a2'
  x.lineWidth = 4
  x.beginPath()
  x.arc(-2, -12, 14, Math.PI * 1.2, Math.PI * 1.9)
  x.stroke()
  x.fillStyle = '#8b95a2'
  x.beginPath()
  x.moveTo(14, -10)
  x.lineTo(30, -22)
  x.lineTo(34, -18)
  x.lineTo(16, -4)
  x.closePath()
  x.fill()
  x.restore()
}
function tonicBottle(x, cx, cy, s, label) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  x.fillStyle = '#3fc0a8'
  x.beginPath()
  x.moveTo(-7, -16)
  x.lineTo(-3, -26)
  x.lineTo(3, -26)
  x.lineTo(7, -16)
  x.lineTo(7, 10)
  x.lineTo(-7, 10)
  x.closePath()
  x.fill()
  x.fillStyle = '#2c2418'
  x.fillRect(-4, -31, 8, 6)
  if (label) {
    x.fillStyle = '#f5eee0'
    x.fillRect(-6, -10, 12, 14)
    x.fillStyle = '#1a4a30'
    x.font = '700 4.6px "JetBrains Mono"'
    x.textAlign = 'center'
    x.fillText('NOW WITH', 0, -4)
    x.fillText('HAIR', 0, 2)
    x.textAlign = 'left'
  }
  x.restore()
}
function medal(x, cx, cy, s) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  x.strokeStyle = '#c23b4a'
  x.lineWidth = 2.4
  x.beginPath()
  x.moveTo(-5, -14)
  x.lineTo(0, -4)
  x.lineTo(5, -14)
  x.stroke()
  x.fillStyle = '#ffcc2e'
  x.beginPath()
  x.arc(0, 2, 7, 0, 7)
  x.fill()
  x.fillStyle = '#e08a0c'
  x.beginPath()
  x.arc(0, 2, 4, 0, 7)
  x.fill()
  x.restore()
}
function paintFacePennant(x, cx, cy, s, t) {
  // guard's pennant with the hero's face badly drawn on it
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  x.strokeStyle = '#6b4a2f'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(0, 40)
  x.lineTo(0, -40)
  x.stroke()
  x.fillStyle = '#f2b8cf'
  x.beginPath()
  x.moveTo(2, -40)
  x.quadraticCurveTo(46 + Math.sin(t * 3) * 4, -30, 46 + Math.sin(t * 3) * 6, 10)
  x.lineTo(2, 22)
  x.closePath()
  x.fill()
  x.fillStyle = '#e8c8a8'
  x.beginPath()
  x.arc(22, -12, 10, 0, 7)
  x.fill()
  x.strokeStyle = '#9c8942'
  x.lineWidth = 2.4
  x.beginPath()
  x.arc(22, -16, 10, Math.PI * 1.1, Math.PI * 1.9)
  x.stroke()
  x.fillStyle = '#1a1228'
  x.beginPath()
  x.arc(18, -13, 1.4, 0, 7)
  x.arc(26, -13, 1.4, 0, 7)
  x.fill()
  x.restore()
}

// ============================== S1 — BALDANSAS (sepia) ==============================
function drawKansas(ctx, lt, t) {
  const g = lt
  const liftU = seg(g, KANSAS_EV.lift, KANSAS_EV.lift + 1.2)
  // hold the ground framing until the house is well up, THEN whip up chasing it
  const camCy = lerp(570, 300, E.inCubic(seg(g, KANSAS_EV.lift + 0.35, KANSAS_EV.lift + 1.3)))
  const camK = lerp(1.0, 1.06, seg(g, KANSAS_EV.funnel, 10)) * lerp(1, 1.05, liftU)
  cam(ctx, camK, 900, camCy)
  ctx.drawImage(S.farm, -OS, -OS)
  // the funnel forms on the horizon (E2) and grows
  const fu = seg(g, KANSAS_EV.funnel, KANSAS_EV.funnel + 1.6)
  if (fu > 0) {
    ctx.save()
    ctx.globalAlpha = 0.4 + fu * 0.6
    ART.funnel(ctx, 1500, -40, 660, t, { wBase: 150 + fu * 120, wTop: 20, sway: 34, spin: 1.6 })
    ctx.restore()
  }
  // chickens fly BACKWARDS past it (E2b)
  if (g >= KANSAS_EV.chickens && g < KANSAS_EV.chickens + 1.7) {
    for (let i = 0; i < 3; i++) {
      const u = seg(g, KANSAS_EV.chickens + i * 0.14, KANSAS_EV.chickens + 1.6)
      chicken(ctx, lerp(1760, 620, u), 380 + i * 56, 0.9, t, i * 3 + 1)
    }
  }
  // the farmhouse — its own canvas so it can lift (E3)
  const hy = 700 - E.outCubic(liftU) * 470
  const hrot = liftU > 0 ? Math.sin(g * 2.6) * 0.05 + 0.07 : 0
  if (liftU > 0) {
    // torn-earth shadow stays behind; fence posts dangle from the sill
    ctx.fillStyle = 'rgba(40,32,24,0.4)'
    ctx.beginPath()
    ctx.ellipse(960, 706, 260, 26, 0, 0, 7)
    ctx.fill()
    for (let i = 0; i < 3; i++) {
      const sw = Math.sin(g * 3 + i * 2) * 0.3
      ctx.save()
      ctx.translate(860 + i * 100, hy + 612)
      ctx.rotate(sw)
      ctx.fillStyle = '#5a4c3a'
      ctx.fillRect(-6, 0, 12, 46)
      ctx.restore()
    }
  }
  ctx.save()
  ctx.translate(960, hy + 300)
  ctx.rotate(hrot)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.house, -380, -300)
  ctx.restore()
  // the bald neighbor pedals through the mid-ground (g3.0): razor basket, polite
  // beep — BEHIND the hero (she occludes the bike as it crosses her)
  if (g >= 2.6 && g < 4.7) {
    const bx = lerp(-300, 2220, seg(g, 2.6, 4.6))
    const bikeY = 916 + Math.sin(g * 9) * 2
    const pins = ART.bicycle(ctx, bx, bikeY, 3.0, t, { sign: true, horn: true, seed: 3 })
    shadow(ctx, bx, bikeY + 8, 84, 0.24)
    sprite(ctx, S.neighbor, pins.pedal[0] + 6, pins.pedal[1] + 34, { lift: [3, 1], stride: [2, -2], lean: 0.06, sx: 2.2, sy: 2.2 })
  }
  // hero at the fence with Flowto in her basket (g1.5); hair-weathervane gag
  const run = seg(g, KANSAS_EV.scoop, KANSAS_EV.lift)
  const dotX = lerp(620, 1060, run)
  const dotFeet = 986
  const moving = run > 0 && run < 1
  shadow(ctx, dotX, dotFeet, 60, 0.3)
  sprite(ctx, S.dotPlain, dotX, dotFeet, { ...(moving ? walkCyc(t * 9, 7) : stand), sx: 2.6, sy: 2.6 })
  // wind-blown hair ribbon: dead horizontal with a live flutter
  if (g < KANSAS_EV.scoop + 0.3) {
    const hx = dotX - 6, hyc = crownY(S.dotPlain, dotFeet, 2.6) + 16
    ctx.strokeStyle = '#9c8942'
    ctx.lineCap = 'round'
    for (let i = 0; i < 6; i++) {
      ctx.lineWidth = 9 - i
      ctx.beginPath()
      ctx.moveTo(hx - i * 13, hyc + Math.sin(t * 13 + i * 1.3) * 3 - i * 1.2)
      ctx.lineTo(hx - (i + 1) * 13, hyc + Math.sin(t * 13 + (i + 1) * 1.3) * 3 - (i + 1) * 1.2)
      ctx.stroke()
    }
    // pigtail tufts blow too
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(hx + 20, hyc)
    ctx.lineTo(hx - 30, hyc + Math.sin(t * 15) * 4)
    ctx.stroke()
  }
  // Flowto: basket until the scoop, then under one arm
  if (g < KANSAS_EV.scoop) {
    shadow(ctx, dotX + 74, dotFeet, 26, 0.24)
    sprite(ctx, S.flowto, dotX + 74, dotFeet, { sx: 1.7, sy: 1.7 })
    ctx.fillStyle = '#8a6a48'
    ctx.beginPath()
    ctx.ellipse(dotX + 74, dotFeet - 26, 30, 9, 0, 0, 7)
    ctx.fill()
  } else if (g < KANSAS_EV.lift + 1.0) {
    sprite(ctx, S.flowto, dotX + 34, dotFeet - 66, { rot: -1.25, sx: 1.7, sy: 1.7 })
  }
  // gale streaks once the funnel owns the sky
  if (g > KANSAS_EV.funnel) ART.windStreaks(ctx, t, g > KANSAS_EV.roar - 0.3 ? 26 : 10, 5)
  ctx.restore()
}

// ============================== S2 — THE TWISTER (sepia) ==============================
function drawTwister(ctx, lt, t) {
  const g = lt
  const shudder = g >= TWISTER_EV.shudder && g < TWISTER_EV.drop ? 5 : 0
  const thudAge = g - TWISTER_EV.thud
  const thudShake = thudAge > 0 && thudAge < 0.5 ? 12 * (1 - thudAge / 0.5) : 0
  const [shx, shy] = shakeXY(t, shudder + thudShake)
  if (g < TWISTER_EV.window) {
    // exterior wide: the house inside the vortex
    cam(ctx, 1.0, 960, 540, shx, shy)
    const sky = ctx.createLinearGradient(0, 0, 0, 800)
    sky.addColorStop(0, '#5a5044')
    sky.addColorStop(1, '#8a7c64')
    ctx.fillStyle = sky
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    ART.funnel(ctx, 960, -60, 560, t, { wBase: 320, wTop: 40, sway: 46, spin: 1.9 })
    // debris orbits the house
    const kinds = ['piano', 'cow', 'haystack', 'fence']
    for (let i = 0; i < 4; i++) ART.orbitDebris(ctx, 960, 430, 620 + i * 26, 150 + i * 22, i * 1.7, 1.15, t, kinds[i], i)
    ctx.fillStyle = 'rgba(40,32,24,0.5)'
    ctx.beginPath()
    ctx.ellipse(960, 792, 200, 22, 0, 0, 7)
    ctx.fill()
    ctx.save()
    ctx.translate(960, 740)
    ctx.rotate(Math.sin(t * 2.2) * 0.03)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(S.house, -285, -236)
    ctx.restore()
    ART.windStreaks(ctx, t, 16, 8)
    ctx.restore()
    return
  }
  // interior at the round window. The DROP reads IN-FRAME (no camera slide): the
  // window vortex howls downward, motion lines fill the room, everyone goes
  // airborne, then the THUD slams them down with a dust ring and a squash.
  const dropU = seg(g, TWISTER_EV.drop, TWISTER_EV.drop + 0.7)
  const slam = thudAge > 0 && thudAge < 0.25 ? 1 - thudAge / 0.25 : 0
  cam(ctx, 1.0, 960, 540, shx, shy)
  // vortex seen THROUGH the window: rotating streaks + flybys (clipped to the pane)
  ctx.save()
  ctx.beginPath()
  ctx.arc(1240, 470, 170, 0, 7)
  ctx.clip()
  const sky = ctx.createRadialGradient(1240, 470, 30, 1240, 470, 220)
  sky.addColorStop(0, '#3a322a')
  sky.addColorStop(1, '#8a7c64')
  ctx.fillStyle = sky
  ctx.fillRect(1000, 240, 480, 480)
  ctx.save()
  ctx.translate(1240, 470)
  ctx.rotate(t * 3.4)
  for (let i = 0; i < 9; i++) {
    ctx.strokeStyle = `rgba(90,80,66,${0.25 + hash(i) * 0.3})`
    ctx.lineWidth = 10 + hash(i * 3) * 18
    ctx.beginPath()
    ctx.arc(0, 0, 70 + i * 22, hash(i * 7) * 3, hash(i * 7) * 3 + 1.6 + hash(i) * 1.4)
    ctx.stroke()
  }
  ctx.restore()
  // flybys pass the pane on straight tracks with sine bob (window g1.5-4.2)
  const flyClip = g < TWISTER_EV.shudder
  if (flyClip) {
    if (g >= TWISTER_EV.cow - 0.15 && g < TWISTER_EV.cow + 0.55) {
      const u = seg(g, TWISTER_EV.cow - 0.15, TWISTER_EV.cow + 0.55)
      const cxp = lerp(1680, 800, u)
      ctx.save()
      ctx.translate(cxp, 430 + Math.sin(u * Math.PI * 2) * 22)
      ctx.scale(1.5, 1.5)
      ART.orbitDebris(ctx, 0, 0, 0, 0, 0, 0, t, 'cow', 1)
      ctx.restore()
    }
    if (g >= TWISTER_EV.haystack - 0.2 && g < TWISTER_EV.haystack + 0.5) {
      const u = seg(g, TWISTER_EV.haystack - 0.2, TWISTER_EV.haystack + 0.5)
      ctx.save()
      ctx.translate(lerp(780, 1700, u), 500 + Math.sin(u * Math.PI) * 30)
      ctx.scale(1.6, 1.6)
      ART.orbitDebris(ctx, 0, 0, 0, 0, 0, 0, t, 'haystack', 2)
      ctx.restore()
    }
    // the neighbor pedals PAST THE WINDOW mid-air, waves politely — then the
    // MID-SWIRL transform: bicycle folds into a broom, repaint to green + wig
    if (g >= TWISTER_EV.neighbor - 0.25 && g < TWISTER_EV.transform + 1.2) {
      const bx = lerp(1720, 760, seg(g, TWISTER_EV.neighbor - 0.25, TWISTER_EV.transform + 1.05))
      const by = 470 + Math.sin(g * 3) * 10 - (g > TWISTER_EV.transform ? seg(g, TWISTER_EV.transform + 0.1, TWISTER_EV.transform + 1.0) * 180 : 0)
      const bank = g > TWISTER_EV.transform ? seg(g, TWISTER_EV.transform + 0.1, TWISTER_EV.transform + 1.0) : 0
      const fade = 1 - bank
      // HARD swap on the transform frame (the old 0.1 s crossfade composited bike
      // wheels over the witch — stale-wheel artifact); the flash below owns the beat
      const bikeA = g < TWISTER_EV.transform ? 1 : 0
      const witchA = g >= TWISTER_EV.transform ? 1 : 0
      ctx.save()
      ctx.translate(bx, by)
      ctx.rotate(-0.12 - bank * 0.5)
      const sc = 1.5 - bank * 0.9
      ctx.scale(sc, sc)
      ctx.globalAlpha = fade
      if (bikeA > 0) {
        ctx.save()
        ctx.globalAlpha = fade * bikeA
        ART.bicycle(ctx, 0, 40, 1, t, { seed: 3 })
        ctx.restore()
      }
      if (witchA > 0) {
        ctx.save()
        ctx.globalAlpha = fade * witchA
        sprite(ctx, S.witch, 6, 44, { lift: [4, 2], stride: [1, -1], lean: 0.12, sx: 1.1, sy: 1.1 })
        ART.wig(ctx, 8, crownY(S.witch, 44, 1.1) + 10, 0.62, t, {})
        // broom drawn IN FRONT so its handle crosses her robe (held, not floating)
        ART.broom(ctx, 10, 44, 0.06, 1)
        ctx.restore()
      }
      ctx.restore()
      ctx.globalAlpha = 1
    }
  }
  // downward howl streaks through the pane once the house drops
  if (dropU > 0) {
    ctx.strokeStyle = 'rgba(216,206,186,0.5)'
    ctx.lineWidth = 3
    for (let i = 0; i < 8; i++) {
      const lx2 = 1090 + hash(i * 13) * 300
      const ly2 = ((t * 1500 + i * 211) % 360)
      ctx.beginPath()
      ctx.moveTo(lx2, 290 + ly2)
      ctx.lineTo(lx2, 290 + ly2 + 70)
      ctx.stroke()
    }
  }
  ctx.restore() // window clip
  ctx.drawImage(S.twisterRoom, -OS, -OS)
  // full-frame falling motion lines during the drop
  if (dropU > 0 && dropU < 1) {
    ctx.strokeStyle = 'rgba(216,206,186,0.38)'
    ctx.lineWidth = 3
    for (let i = 0; i < 14; i++) {
      const lx = 100 + hash(i * 9) * 1720
      const ly = ((t * 1600 + i * 173) % 1500) - 200
      ctx.beginPath()
      ctx.moveTo(lx, ly)
      ctx.lineTo(lx, ly + 150)
      ctx.stroke()
    }
  }
  // THUD dust ring
  if (thudAge > 0 && thudAge < 0.8) {
    ctx.strokeStyle = `rgba(150,132,104,${0.6 * (1 - thudAge / 0.8)})`
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.ellipse(960, 960, 60 + thudAge * 500, (60 + thudAge * 500) * 0.2, 0, 0, 7)
    ctx.stroke()
    for (let i = 0; i < 10; i++) {
      const u = thudAge * (0.8 + hash(i * 7) * 0.6)
      ctx.fillStyle = `rgba(150,132,104,${Math.max(0, 0.5 - u * 0.4)})`
      ctx.beginPath()
      ctx.arc(960 + (hash(i) - 0.5) * 500 * u, 950 - u * 90, 8 + u * 26, 0, 7)
      ctx.fill()
    }
  }
  // hero + Flowto: bounced around, AIRBORNE through the drop, squashed by the THUD
  const air = g >= TWISTER_EV.drop && thudAge <= 0 ? 1 : 0
  const hop = Math.abs(Math.sin(g * 5)) * (g < TWISTER_EV.drop ? 14 : 4) + air * 46 - slam * 14
  sprite(ctx, S.dotPlain, 700, 900 - hop, { lift: air ? [6, 6] : [3, 1], stride: [2, -2], sx: 2.2, sy: 2.2 - slam * 0.08 })
  sprite(ctx, S.flowto, 790, 912 - hop * 0.7, { sx: 1.6, sy: 1.6 - slam * 0.08 })
  // dust on black (g7.6-7.9)
  const dustU = seg(g, TWISTER_EV.dust, TWISTER_EV.cut - 0.05)
  if (dustU > 0) {
    ctx.fillStyle = `rgba(5,4,3,${dustU})`
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    if (dustU < 1) {
      for (let i = 0; i < 14; i++) {
        const u = ((t * 0.7 + hash(i * 3)) % 1)
        ctx.fillStyle = `rgba(150,132,104,${(1 - dustU) * 0.3 * (1 - u)})`
        ctx.beginPath()
        ctx.arc(hash(i) * W, 200 + u * 700, 10 + u * 40, 0, 7)
        ctx.fill()
      }
    }
  }
  // the E4 transform FLASH: one real frame of near-white on the swap frame
  if (g >= TWISTER_EV.transform && g < TWISTER_EV.transform + 0.034) {
    ctx.fillStyle = 'rgba(255,248,236,0.92)'
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  }
  ctx.restore()
}

// ============================== S3 — THE FLOZ BURST (sepia -> TECHNICOLOR) ==========
function drawFlozburst(ctx, lt, t, overlay) {
  const g = lt
  if (g < FLOZBURST_EV.burst) {
    // sepia interior, door centred; locked camera so the overlay sliver math is exact
    cam(ctx, 1.12, 960, 560)
    ctx.drawImage(S.doorRoom, -OS, -OS)
    // dust motes
    for (let i = 0; i < 16; i++) {
      const u = ((t * 0.05 + hash(i * 7)) % 1)
      ctx.globalAlpha = 0.4 * Math.sin(u * Math.PI)
      ctx.fillStyle = '#d8d2c4'
      ctx.fillRect(300 + hash(i * 3) * 1300, 200 + u * 600, 2.6, 2.6)
    }
    ctx.globalAlpha = 1
    // hero + Flowto sit up from the floor
    const up = E.outCubic(seg(g, 0.2, 1.0))
    // the RATTLE (g1.4 = film 19.4): the door slab shudders on its hinges
    const wobble = g >= FLOZBURST_EV.rattle && g < FLOZBURST_EV.sliver ? Math.sin(g * 55) * 3.5 : 0
    // held-breath idle after the sit-up so the pre-burst beat never freezes
    const breathe = up >= 1 ? Math.sin(t * 2.6) : 0
    sprite(ctx, S.dotPlain, 700, 950 - Math.max(0, breathe) * 2, { rot: -1.3 * (1 - up), lift: [2, 0], stride: [1, 0], lean: breathe * 0.03, sx: 2.3, sy: 2.3 })
    sprite(ctx, S.flowto, 780, 952 - Math.max(0, -breathe) * 2, { rot: -1.3 * (1 - up) - Math.max(0, -breathe) * 0.06, sx: 1.6, sy: 1.6 })
    // the door: hinged left, swings away. SHUT until the crack (g1.7 = film 19.7 —
    // the film's first color pixels), then the crack WIDENS to the 20.0 hard cut
    const gapU = g < FLOZBURST_EV.sliver ? 0 : seg(g, FLOZBURST_EV.sliver, FLOZBURST_EV.burst)
    const gap = gapU <= 0 ? 0 : lerp(4, 96, E.inQuad(gapU))
    if (gap > 0.5) {
      // light through the crack (in-scene; the COLOR itself rides the overlay below)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const lg = ctx.createLinearGradient(1082 - gap, 0, 1082, 0)
      lg.addColorStop(0, 'rgba(255,244,214,0)')
      lg.addColorStop(1, `rgba(255,244,214,${0.5 + gapU * 0.4})`)
      ctx.fillStyle = lg
      ctx.fillRect(1082 - gap - 30, 300, gap + 30, 524)
      ctx.restore()
    }
    ctx.save()
    ctx.translate(838 + wobble, 300)
    ctx.scale(Math.max(0.01, 1 - gap / 244), 1)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(S.door, 0, 0)
    ctx.restore()
    ctx.restore()
    // THE FILM'S FIRST COLOR PIXELS: the sliver rides the overlay, past the grade —
    // gated on the crack beat, fading in over ~3 frames as the door cracks open
    if (overlay && gap > 0.5) {
      const k = 1.12
      const sx0 = 960 + (1082 - gap - 960) * k
      const sw = gap * k
      const sy0 = 540 + (300 - 560) * k
      const sh2 = 524 * k
      overlay.save()
      overlay.globalAlpha = 0.92 * seg(g, FLOZBURST_EV.sliver, FLOZBURST_EV.sliver + 0.07)
      const rg = overlay.createLinearGradient(sx0, sy0, sx0, sy0 + sh2)
      rg.addColorStop(0, '#ff5a5a')
      rg.addColorStop(0.3, '#ffcc2e')
      rg.addColorStop(0.55, '#58d194')
      rg.addColorStop(0.8, '#5ab8d8')
      rg.addColorStop(1, '#b28ae0')
      overlay.fillStyle = rg
      overlay.fillRect(sx0, sy0, sw, sh2)
      overlay.globalAlpha = 0.5 * seg(g, FLOZBURST_EV.sliver, FLOZBURST_EV.sliver + 0.07)
      overlay.fillStyle = '#ffffff'
      overlay.fillRect(sx0 + sw * 0.2, sy0, sw * 0.25, sh2)
      overlay.restore()
    }
    return
  }
  // ---- reverse angle: the village, full TECHNICOLOR ----
  const wash = seg(g, FLOZBURST_EV.burst, FLOZBURST_EV.burst + 0.5)
  cam(ctx, lerp(1.05, 1.0, wash), 960, 560)
  ctx.drawImage(S.village, -OS, -OS)
  // radial color wash from the doorway on the cut frame — kept TIGHT and DELAYED
  // ~3 frames so the timeline flash owns the cut itself and the Technicolor reads
  if (wash < 1) {
    const washA = 0.34 * (1 - wash) * seg(g, FLOZBURST_EV.burst + 0.08, FLOZBURST_EV.burst + 0.22)
    if (washA > 0.01) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const rr = ctx.createRadialGradient(1500, 760, 10, 1500, 760, 260 + wash * 1400)
      rr.addColorStop(0, `rgba(255,244,214,${washA})`)
      rr.addColorStop(1, 'rgba(255,244,214,0)')
      ctx.fillStyle = rr
      ctx.fillRect(1000, 260, 920, 700)
      ctx.restore()
    }
  }
  // the crashed house, right; the East witch's curled feet + smoldering wig under it.
  // Feet draw UNDER the house, rotated near-horizontal so only the ruby (then shed)
  // shoes poke past the foundation's left edge — the 1939 read, not a standing figure.
  const curl = Math.sin(t * 1.7) * 0.12
  const propFeet = g >= FLOZBURST_EV.slippers + 0.12 ? S.eastFeetPlain : S.eastFeet
  ctx.save()
  ctx.translate(1272, 902)
  ctx.rotate(1.42 + curl)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(propFeet.c, 0, 0, propFeet.w, propFeet.h, -66, -60, 132, 120)
  ctx.restore()
  ctx.save()
  ctx.translate(1560, 760)
  ctx.rotate(0.09)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.house, -300, -235)
  ctx.restore()
  ctx.fillStyle = 'rgba(40,32,20,0.4)'
  ctx.beginPath()
  ctx.ellipse(1560, 880, 300, 26, 0, 0, 7)
  ctx.fill()
  // lit doorway at the crashed house's base + hero steps out (g2.8) to the road
  const stepU = seg(g, FLOZBURST_EV.threshold, FLOZBURST_EV.threshold + 1.4)
  if (stepU < 1) {
    ctx.fillStyle = '#241c12'
    ctx.fillRect(1400, 742, 76, 176)
    // the doorway glow waits ~3 frames so it never stacks on the cut-frame flash
    const glowA = 0.34 * (1 - stepU * 0.7) * seg(g, FLOZBURST_EV.burst + 0.12, FLOZBURST_EV.burst + 0.3)
    if (glowA > 0.01) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const dg = ctx.createRadialGradient(1438, 820, 8, 1438, 820, 190)
      dg.addColorStop(0, `rgba(255,238,190,${glowA})`)
      dg.addColorStop(1, 'rgba(255,238,190,0)')
      ctx.fillStyle = dg
      ctx.fillRect(1250, 640, 380, 300)
      ctx.restore()
    }
  }
  const dotX = lerp(1438, 860, E.outCubic(stepU))
  const dotFeet = 930
  const dotS = 2.5
  // the slippers-arc progress (transfer beat g6.2, film 24.2)
  const slipU = seg(g, FLOZBURST_EV.slippers, FLOZBURST_EV.slippers + 0.8)
  // MUNCHKIN MARCH — bounce domino from hatches and the barrel (g3.6); drawn
  // UNDER the hero so her walk-down never gets occluded
  const HATCH = [[380, 940], [560, 905], [1000, 935], [1120, 905], [260, 975], [700, 950]]
  const order = [2, 0, 4, 1, 5, 3]
  HATCH.forEach(([hx2, hy2], i) => {
    const e = FLOZBURST_EV.march + order[i] * 0.22
    if (g < e - 0.12) return
    const lid = E.outCubic(seg(g, e - 0.12, e + 0.1))
    ctx.save()
    ctx.translate(hx2 - 46, hy2 - 8)
    ctx.rotate(-lid * 1.9)
    ctx.fillStyle = '#8a6a48'
    ctx.beginPath()
    ctx.ellipse(0, 0, 44, 14, 0, Math.PI, 0)
    ctx.fill()
    ctx.restore()
    const rig = S.munchkins[i % S.munchkins.length]
    const bu = seg(g, e, e + 0.5)
    if (bu <= 0) return
    const feet = Math.min(SAFE.bandY[1] - 40, hy2 + 26 - E.outBack(bu) * 74)
    const settle = g > e + 0.5 ? Math.sin((g - e - 0.5) * 10) * 0.12 * Math.exp(-(g - e - 0.5) * 4) : 0
    shadow(ctx, hx2, feet, 30, 0.24)
    sprite(ctx, rig, hx2, feet, { lift: [2, 0], stride: [1, 0], sx: 1.7, sy: (0.72 + 0.28 * E.outCubic(bu)) * (1 + settle) })
    if (bu >= 1) lollipop(ctx, hx2 + 20, feet - 60, 0.8, ['#ff8a8a', '#8fd460', '#ffb84a', '#7db0d7'][i % 4])
  })
  // barrel munchkin (pops by the left cottages, clear of the East-feet gag)
  {
    const e = FLOZBURST_EV.march + 1.5
    if (g >= e) {
      const bu = seg(g, e, e + 0.5)
      const feet = Math.min(SAFE.bandY[1] - 40, 952 - E.outBack(bu) * 66)
      shadow(ctx, 460, feet, 30, 0.24)
      sprite(ctx, S.munchkins[1], 460, feet, { sx: 1.7, sy: 0.72 + 0.28 * E.outCubic(bu) })
    }
  }
  shadow(ctx, dotX, dotFeet, 52, 0.28)
  // barefoot (Kansas pair) until the slippers land on her feet at the transfer
  sprite(ctx, slipU >= 1 ? S.dot : S.dotPlain, dotX, dotFeet, { ...(stepU > 0.05 && stepU < 0.95 ? walkCyc(t * 7) : stand), sx: dotS, sy: dotS })
  if (stepU >= 0.3) sprite(ctx, S.flowto, dotX - 70, dotFeet, { sx: 1.6, sy: 1.6 })
  // GLINDA descends in a soap bubble (g5.0), pops into shards, winks
  const bY = lerp(-140, 560, E.outCubic(seg(g, FLOZBURST_EV.glinda, FLOZBURST_EV.glinda + 0.6)))
  const popAge = g - (FLOZBURST_EV.glinda + 0.8)
  if (popAge < 0) {
    ART.bubble(ctx, 760, bY, 120, t)
    sprite(ctx, S.glinda, 760, bY + 86, { lift: [2, 0], stride: [1, 0], sx: 1.8, sy: 1.8 })
  } else {
    ART.bubbleShards(ctx, 760, 560, 120, popAge, 0.7)
    const land = E.outCubic(seg(g, FLOZBURST_EV.glinda + 0.8, FLOZBURST_EV.glinda + 1.15))
    const gFeet = lerp(646, 926, land)
    shadow(ctx, 760, gFeet, 40, 0.26)
    sprite(ctx, S.glinda, 760, gFeet, { lift: [2, 0], stride: [1, 0], sx: 1.8, sy: 1.8 })
    if (popAge > 0.25 && popAge < 0.7) ART.starGlint(ctx, 768, crownY(S.glinda, gFeet, 1.8) + 26, 30, (popAge - 0.25) / 0.45)
  }
  // ruby slippers arc from the East feet to the hero's (g6.2) with a sparkle trail
  if (slipU > 0 && slipU < 1) {
      const bez = (u) => [
        (1 - u) * (1 - u) * 1235 + 2 * (1 - u) * u * 1100 + u * u * (dotX - 10),
        (1 - u) * (1 - u) * 885 + 2 * (1 - u) * u * 560 + u * u * (dotFeet - 4),
      ]
    for (let i = 4; i >= 0; i--) {
      const uu = cl(slipU - i * 0.035)
      const [px, py] = bez(uu)
      ctx.globalAlpha = 1 - i * 0.18
      ART.slipper(ctx, px, py, 0.9, Math.sin(uu * 9) * 0.3)
    }
    ctx.globalAlpha = 1
    ART.starGlint(ctx, ...bez(slipU), 26, (t * 2.4) % 1)
    if ((t * 2.4) % 1 > 0.3) ART.starGlint(ctx, ...bez(Math.max(0, slipU - 0.1)), 18, ((t * 2.4) % 1) - 0.3)
  }
  if (slipU >= 1) {
    ART.slipper(ctx, dotX - 12, dotFeet - 2, 0.62, 0)
    ART.slipper(ctx, dotX + 12, dotFeet - 2, 0.62, 0.1)
  }
  // GREEN WITCH arrives in a smoke puff (g7.4): the cloud GROWS 0.3 s BEFORE the
  // beat and she condenses out of it — no pop-in
  const skyGrey = seg(g, FLOZBURST_EV.witchSmoke, FLOZBURST_EV.threat) * 0.32
  if (skyGrey > 0) {
    ctx.fillStyle = `rgba(30,34,40,${skyGrey})`
    ctx.fillRect(-OS, -OS, W + OS * 2, 700 + OS)
  }
  const puffAge = g - (FLOZBURST_EV.witchSmoke - 0.3)
  if (puffAge > 0 && puffAge < 1.0) ART.smokePuff(ctx, 1150, 480, puffAge, 1.0, { seed: 41, n: 16 })
  const wDrop = E.outCubic(seg(g, FLOZBURST_EV.witchSmoke, FLOZBURST_EV.threat))
  const vanish = seg(g, FLOZBURST_EV.vanish, FLOZBURST_EV.vanish + 0.3)
  if (wDrop > 0 && vanish < 1) {
    const wX = lerp(1150, 1060, seg(g, FLOZBURST_EV.threat + 0.6, FLOZBURST_EV.threat + 1.2))
    const wFeet = lerp(480, 930, wDrop)
    const wIn = seg(g, FLOZBURST_EV.witchSmoke + 0.1, FLOZBURST_EV.witchSmoke + 0.4)
    shadow(ctx, wX, wFeet, 46 * wIn, 0.3 * wIn)
    const wS = 2.4
    sprite(ctx, S.witch, wX, wFeet, { alpha: wIn * (1 - vanish), lift: [2, 0], stride: [1, 0], lean: g > FLOZBURST_EV.threat + 0.4 ? -0.08 : 0.04, sx: wS, sy: wS })
    // the WIG on her head (separate prop, never baked) — rides at the brim line
    ART.wig(ctx, wX + 2, crownY(S.witch, wFeet, wS) + 22, wS * 0.5, t, { rot: g > 9.2 && g < 9.6 ? Math.sin(t * 26) * 0.3 : 0 })
    // broom raised for the threat
    if (g > FLOZBURST_EV.threat + 0.2 && vanish < 1) ART.broom(ctx, wX + 46 * wS / 2.4, wFeet - 150 * wS / 2.4, -1.8 + Math.sin(g * 2) * 0.05, wS * 0.5)
    if (vanish > 0) ART.smokeRing(ctx, wX, wFeet - 120, vanish, 1)
  }
  // celebration: bounce cascade + confetti lollipop tips (g10.2)
  if (g >= FLOZBURST_EV.celebrate) {
    HATCH.forEach(([hx2, hy2], i) => {
      const b2 = Math.abs(Math.sin((g - FLOZBURST_EV.celebrate) * 6 + i)) * 26
      const rig = S.munchkins[(i + 1) % S.munchkins.length]
      sprite(ctx, rig, hx2, Math.min(SAFE.bandY[1] - 40, hy2 + 26 - b2), { lift: [3, 1], stride: [2, -2], sx: 1.7, sy: 1.7 })
      lollipop(ctx, hx2 + 20, hy2 + 26 - b2 - 60, 0.8, ['#ff8a8a', '#8fd460', '#ffb84a', '#7db0d7'][i % 4])
    })
    ART.confetti(ctx, 960, 700, g - FLOZBURST_EV.celebrate, 1.6, 909)
  }
  // 6-frame dip-to-white into S4
  const dip = seg(g, FLOZBURST_EV.dip, FLOZBURST_EV.cut)
  if (dip > 0) {
    ctx.fillStyle = `rgba(255,255,252,${dip})`
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  }
  ctx.restore()
}

// ============================== S4 — THE FOLLICLE ROAD ==============================
function drawBrickroad(ctx, lt, t) {
  const g = lt
  // quick 1.2x push-in on each join, released on the walk-off
  let push = 1.0
  for (const je of [BRICKROAD_EV.scarecrow, BRICKROAD_EV.tinman, BRICKROAD_EV.lion]) {
    const d = g - je
    if (d > 0 && d < 1.6) push = Math.max(push, 1 + 0.2 * Math.sin(cl(d / 1.6) * Math.PI))
  }
  cam(ctx, push, 960, 590)
  const SC = 900
  const scroll = cl(g / BRICKROAD_EV.cut) * SC
  ctx.drawImage(S.road, -OS - scroll, -OS)
  // the road lights up brick by brick at the head of the shot — a SOFT radial
  // pool (the old hard-edged gradient rect cut across sky and actors)
  const lit = seg(g, 0, 1.5)
  if (lit < 1) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const lx = lerp(-300, 2220, lit)
    ctx.translate(lx, 820)
    ctx.scale(1, 0.72)
    const lg = ctx.createRadialGradient(0, 0, 10, 0, 0, 240)
    lg.addColorStop(0, `rgba(255,226,122,${0.3 * Math.sin(lit * Math.PI) + 0.07})`)
    lg.addColorStop(1, 'rgba(255,226,122,0)')
    ctx.fillStyle = lg
    ctx.fillRect(-260, -420, 520, 840)
    ctx.restore()
  }
  // pink haze gathers at frame right for the lion's point (out beat)
  const haze = seg(g, 10.2, BRICKROAD_EV.cut)
  if (haze > 0) {
    const hg = ctx.createLinearGradient(1500, 0, W + OS, 0)
    hg.addColorStop(0, 'rgba(242,150,190,0)')
    hg.addColorStop(1, `rgba(242,150,190,${0.4 * haze})`)
    ctx.fillStyle = hg
    ctx.fillRect(1500, 200, W + OS - 1500, 800)
  }
  const line = { dot: 620, scarecrow: 880, tinman: 1120, lion: 1380 }
  const GY = 930
  // hero + Flowto skip in from the left (g0.5), then walk in place; Flowto skips 2x
  const enter = E.outCubic(seg(g, 0.5, 1.6))
  const dotX = lerp(-160, line.dot, enter)
  const marching = g >= 1.2
  shadow(ctx, dotX, GY, 52, 0.28)
  sprite(ctx, S.dot, dotX, GY, { ...(marching ? walkCyc(t * 6.5) : stand), sx: 2.5, sy: 2.5 })
  const skip = marching ? Math.abs(Math.sin(g * 13)) * 10 : 0
  shadow(ctx, dotX + 56, GY, 24, 0.22)
  sprite(ctx, S.flowto, dotX + 56, GY - skip, { lift: [4, 2], stride: [2, -2], sx: 1.7, sy: 1.7 })
  // SCARECROW: on a pole, wiggles off, joins (g2.5)
  {
    const joinU = seg(g, BRICKROAD_EV.scarecrow, BRICKROAD_EV.scarecrow + 0.7)
    const onPole = joinU <= 0
    const x = line.scarecrow
    if (onPole) {
      ctx.fillStyle = '#6b4a2f'
      ctx.fillRect(x - 5, GY - 250, 10, 250)
      ctx.save()
      ctx.translate(x, GY - 220)
      ctx.rotate(Math.sin(t * 2.2) * 0.08)
      sprite(ctx, S.scarecrow, 0, 96, { lift: [4, 4], stride: [0, 0], lean: 0.02, sx: 2.3, sy: 2.3 })
      ctx.restore()
      // his "brain": a bird's nest of combs
      ART.comb(ctx, x - 14, GY - 260, -0.3, 0.5)
      ART.comb(ctx, x + 12, GY - 262, 0.4, 0.5, true)
    } else {
      const hopX = x
      const hopY = GY - Math.sin(cl(joinU) * Math.PI) * 130
      shadow(ctx, hopX, GY, 46, 0.28)
      sprite(ctx, S.scarecrow, hopX, joinU < 1 ? hopY : GY, { ...(joinU >= 1 ? walkCyc(t * 6.5) : stand), sx: 2.4, sy: 2.4 })
    }
  }
  // TIN MAN: rusted at a stump, oiled awake, joins (g4.5); diegetic placard
  {
    const x = line.tinman
    const rust = 1 - seg(g, BRICKROAD_EV.tinman - 0.4, BRICKROAD_EV.tinman)
    const straight = E.outCubic(seg(g, BRICKROAD_EV.tinman + 0.1, BRICKROAD_EV.tinman + 0.7))
    // stump
    ctx.fillStyle = '#6e5138'
    ctx.fillRect(x + 66, GY - 66, 84, 70)
    ctx.fillStyle = '#8a6a48'
    ctx.beginPath()
    ctx.ellipse(x + 108, GY - 66, 42, 13, 0, 0, 7)
    ctx.fill()
    ctx.strokeStyle = '#5a4028'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(x + 108, GY - 66, 26, 8, 0, 0, 7)
    ctx.stroke()
    // CONDITIONER CAN placard on the stump (diegetic; shifted right so the tin
    // man's rusted lean never covers the leading C)
    ctx.fillStyle = '#f5eee0'
    ctx.fillRect(x + 74, GY - 132, 150, 32)
    ctx.strokeStyle = '#5a4028'
    ctx.lineWidth = 3
    ctx.strokeRect(x + 74, GY - 132, 150, 32)
    ctx.fillStyle = '#1a4a30'
    ctx.font = '700 13px "JetBrains Mono"'
    ctx.textAlign = 'center'
    ctx.fillText('CONDITIONER CAN', x + 149, GY - 111)
    ctx.textAlign = 'left'
    shadow(ctx, x, GY, 46, 0.28)
    sprite(ctx, S.tinman, x, GY, { ...(straight > 0.9 ? walkCyc(t * 6.5) : stand), lean: 0.22 * rust * (1 - straight), rot: 0.1 * rust * (1 - straight), sx: 2.4, sy: 2.4 })
    // rust mottling fades as the oil lands
    if (rust > 0) {
      ctx.globalAlpha = rust * 0.5
      ctx.fillStyle = '#8a5a2c'
      for (let i = 0; i < 6; i++) {
        ctx.beginPath()
        ctx.arc(x - 20 + hash(i * 3) * 44, GY - 40 - hash(i * 7) * 150, 6 + hash(i) * 10, 0, 7)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    // oil arc from the can at the join beat
    const oilAge = g - (BRICKROAD_EV.tinman - 0.35)
    if (oilAge > 0 && oilAge < 0.7) ART.waterArc(ctx, x - 90, GY - 120, x - 20, GY - 150, oilAge, 0.7)
    if (oilAge > 0 && oilAge < 0.3) tonicBottle(ctx, x - 96, GY - 118, 1.6, false)
  }
  // COWARDLY LION: leaps out roaring, deflates at his own reflection, joins (g6.8)
  {
    const x = line.lion
    const joinU = seg(g, BRICKROAD_EV.lion, BRICKROAD_EV.lion + 0.5)
    if (joinU > 0) {
      const roU = seg(g, BRICKROAD_EV.lion + 0.5, BRICKROAD_EV.lion + 1.4)
      const puff = roU > 0 && roU < 1 ? 1 + 0.16 * Math.sin(roU * Math.PI) * (1 - roU) : 1
      const defl = 1 - 0.12 * seg(g, BRICKROAD_EV.lion + 1.1, BRICKROAD_EV.lion + 1.9)
      shadow(ctx, x, GY, 50, 0.28)
      sprite(ctx, S.lion, x, GY, {
        ...(g >= BRICKROAD_EV.march ? walkCyc(t * 6.5) : stand),
        rot: joinU < 1 ? -0.25 * (1 - joinU) : 0,
        sx: 2.45, sy: 2.45 * puff * defl,
      })
      // the terrifying wig on a post nearby
      if (g >= BRICKROAD_EV.lion + 0.4) {
        ctx.fillStyle = '#6b4a2f'
        ctx.fillRect(x + 190, GY - 150, 7, 150)
        ART.wig(ctx, x + 193, GY - 165, 0.8, t, {})
      }
    }
    // he points at the pink haze on the out beat
    if (g >= BRICKROAD_EV.haze) {
      ctx.strokeStyle = '#c98f4e'
      ctx.lineWidth = 9
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x + 26, GY - 150)
      ctx.lineTo(x + 74, GY - 190)
      ctx.stroke()
    }
  }
  ctx.restore()
}

// ============================== S5 — POPPY LULLABY ==============================
function drawPoppies(ctx, lt, t) {
  const g = lt
  const crane = seg(g, POPPIES_EV.snow, POPPIES_EV.snow + 1.6)
  cam(ctx, lerp(1.06, 1.12, crane), 960, lerp(620, 560, crane))
  ctx.rotate(-0.018)
  ctx.drawImage(S.poppyOpen, -OS, -OS)
  const bud = seg(g, POPPIES_EV.snow, POPPIES_EV.snow + 0.8)
  if (bud > 0) {
    ctx.save()
    ctx.globalAlpha = bud
    ctx.drawImage(S.poppyBuds, -OS, -OS)
    ctx.restore()
  }
  // perfume ribbons at two depths (g1.2)
  if (g >= POPPIES_EV.ribbons && g < POPPIES_EV.snow + 0.5) {
    for (const [ry, sp, a] of [[560, 60, 0.14], [700, 90, 0.1]]) {
      ctx.strokeStyle = `rgba(242,120,190,${a})`
      ctx.lineWidth = 26
      ctx.beginPath()
      for (let px = -100; px <= 2100; px += 60) {
        const wx = px - ((t * sp) % 300)
        const wy = ry + Math.sin(wx * 0.01 + t) * 26
        if (px === -100) ctx.moveTo(wx, wy)
        else ctx.lineTo(wx, wy)
      }
      ctx.stroke()
    }
  }
  const GY = 900
  const lineX = { dot: 520, scarecrow: 740, tinman: 960, lion: 1180 }
  // the line marches in, then drops like soft dominos (g2.8); the snow WAKES them
  // in a reverse domino (dot first, lion last) and they run on toward the city,
  // exiting right before the cut — no more sleeping through the hard cut
  const dropAt = (i) => POPPIES_EV.lineDrops + i * 0.18
  const wakeAt = (i) => POPPIES_EV.wake + (3 - i) * 0.15
  const order = { lion: 0, tinman: 1, scarecrow: 2, dot: 3 }
  let lionUp = 0
  for (const [who, i] of Object.entries(order)) {
    const x0 = lineX[who]
    const rig = S[who]
    const dropped = seg(g, dropAt(i), dropAt(i) + 0.4)
    const woken = E.outCubic(seg(g, wakeAt(i), wakeAt(i) + 0.35))
    if (who === 'lion') lionUp = woken
    const runU = seg(g, wakeAt(i) + 0.5, wakeAt(i) + 1.5)
    const rot = -1.35 * E.outCubic(dropped) * (1 - woken)
    const marchU = seg(g, 0.2, 2.6)
    const x = x0 + E.inQuad(runU) * 1600
    const moving = (dropped <= 0 && marchU > 0 && marchU < 1) || (runU > 0 && runU < 1)
    shadow(ctx, x, GY, 46, 0.26)
    sprite(ctx, rig, x, GY, { ...(moving ? walkCyc(t * (runU > 0 ? 9 : 6.2)) : stand), rot, sx: 2.35, sy: 2.35 })
    if (dropped >= 1 && woken < 1) {
      // snore waves
      const u = ((t * 0.6 + i * 0.2) % 1)
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - u)})`
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.arc(x + 30, GY - 34 - u * 60, 6 + u * 10, 0.4, 2.6)
      ctx.stroke()
    }
  }
  // Flowto is IN the line from the first frame (no teleport); he faints FIRST (g1.8),
  // wakes with the hero and runs at her heels
  if (g >= POPPIES_EV.flowtoFaints - 0.3) {
    const fDrop = E.outCubic(seg(g, POPPIES_EV.flowtoFaints, POPPIES_EV.flowtoFaints + 0.4))
    const fWake = E.outCubic(seg(g, POPPIES_EV.wake, POPPIES_EV.wake + 0.3))
    const fRun = seg(g, POPPIES_EV.wake + 0.5, POPPIES_EV.wake + 1.5)
    const fRot = -1.4 * fDrop * (1 - fWake)
    shadow(ctx, lineX.dot + 50 + E.inQuad(fRun) * 1600, GY, 20, 0.2)
    sprite(ctx, S.flowto, lineX.dot + 50 + E.inQuad(fRun) * 1600, GY, { rot: fRot, lift: [4, 2], stride: [2, -2], sx: 1.7, sy: 1.7 })
  } else {
    sprite(ctx, S.flowto, lineX.dot + 50, GY - Math.abs(Math.sin(t * 12)) * 8, { lift: [4, 2], stride: [2, -2], sx: 1.7, sy: 1.7 })
  }
  // Glinda's bubble passes overhead as it SNOWS (g4.0)
  if (g >= POPPIES_EV.snow - 0.4 && g < POPPIES_EV.snow + 1.2) {
    const u = seg(g, POPPIES_EV.snow - 0.4, POPPIES_EV.snow + 1.2)
    ART.bubble(ctx, lerp(-160, 2080, u), 250, 92, t)
    sprite(ctx, S.glinda, lerp(-160, 2080, u), 250 + 64, { sx: 1.3, sy: 1.3 })
  }
  if (g >= POPPIES_EV.snow) ART.snowfall(ctx, t, 90, 9)
  // wake-ups (g5.5): get-up anims live in the march loop above (reverse domino,
  // then the run-out); the snow-hat waits until the lion is actually on his feet
  if (lionUp >= 1) {
    // lion wears a snow-hat he refuses to remove — riding his head as he runs out
    const lionRun = seg(g, wakeAt(0) + 0.5, wakeAt(0) + 1.5)
    const lionX = lineX.lion + E.inQuad(lionRun) * 1600
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(lionX + 2, crownY(S.lion, GY, 2.35) + 4, 26, 14, 0, Math.PI, 0)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(lionX + 2, crownY(S.lion, GY, 2.35) + 6, 30, 7, 0, 0, 7)
    ctx.fill()
  }
  const sneeze = g - POPPIES_EV.sneeze
  if (sneeze > 0 && sneeze < 0.7) {
    // the bolt flies at the lens
    const u = E.inQuad(seg(g, POPPIES_EV.sneeze, POPPIES_EV.sneeze + 0.7))
    boltNut(ctx, lerp(lineX.tinman + 30, 960, u), lerp(crownY(S.tinman, GY, 2.35), 540, u), 1 + u * 9, u * 9)
  } else if (sneeze > -0.4 && sneeze <= 0) {
    // inhale squash
    sprite(ctx, S.tinman, lineX.tinman, GY, { sx: 2.35, sy: 2.35 * (1 - 0.12 * Math.sin(cl(1 + sneeze / 0.4) * Math.PI)) })
  }
  ctx.restore()
}

// ============================== S6 — EMERALD CITY ==============================
function drawGate(ctx, lt, t) {
  const g = lt
  cam(ctx, 1.0, 960, 560)
  ctx.drawImage(S.gate, -OS, -OS)
  // the doors slide apart after the knock (g1.0-2.0): cover the baked shut doors,
  // reveal the glowing city interior, slide the two panels outward
  const doorU = E.outCubic(seg(g, EMERALD_EV.knock, EMERALD_EV.knock + 1.0))
  if (doorU > 0) {
    // city interior behind the opening
    const ig = ctx.createLinearGradient(0, 328, 0, 980)
    ig.addColorStop(0, '#062e1e')
    ig.addColorStop(0.7, '#0f6b44')
    ig.addColorStop(1, '#0a4a2e')
    ctx.fillStyle = ig
    ctx.fillRect(668, 328, 584, 652)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const lg = ctx.createRadialGradient(960, 900, 20, 960, 900, 420)
    lg.addColorStop(0, `rgba(150,255,205,${0.4 * doorU})`)
    lg.addColorStop(1, 'rgba(150,255,205,0)')
    ctx.fillStyle = lg
    ctx.fillRect(668, 328, 584, 652)
    ctx.restore()
    // two door panels sliding outward
    for (const side of [-1, 1]) {
      const px = 960 + side * doorU * 300
      const pg = ctx.createLinearGradient(px, 0, px + side * 292, 0)
      pg.addColorStop(0, '#1f8a5c')
      pg.addColorStop(1, '#12603e')
      ctx.fillStyle = pg
      ctx.fillRect(Math.min(px, px + side * 292), 328, 292, 652)
      ctx.strokeStyle = '#0a4a2e'
      ctx.lineWidth = 8
      ctx.strokeRect(Math.min(px, px + side * 292), 328, 292, 652)
    }
  }
  // giant comb bell-pull swings when knocked (g1.0)
  const swing = g > EMERALD_EV.knock ? Math.sin((g - EMERALD_EV.knock) * 9) * 0.35 * Math.exp(-(g - EMERALD_EV.knock) * 1.6) : Math.sin(t * 1.2) * 0.05
  ctx.save()
  ctx.translate(700, 320)
  ctx.rotate(swing)
  ctx.strokeStyle = '#ffcc2e'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, 70)
  ctx.stroke()
  ART.comb(ctx, 0, 96, 0, 1.4)
  ctx.restore()
  // hero knocks with the comb (g1.0): leans in, comb rap
  const knock = seg(g, EMERALD_EV.knock - 0.25, EMERALD_EV.knock + 0.25)
  if (knock > 0 && knock < 1) {
    ART.comb(ctx, lerp(560, 660, Math.sin(knock * Math.PI)), 420, 0.5, 1.2)
  }
  const dotX = 560
  shadow(ctx, dotX, 952, 52, 0.3)
  sprite(ctx, S.dot, dotX, 952, { lift: [2, 0], stride: [1, 0], lean: 0.1 * Math.sin(cl(knock) * Math.PI), sx: 2.5, sy: 2.5 })
  // the trio catches up: they run in from the left after the horse passes and
  // gather behind her — the poppies wake pays off on-screen before the throne
  {
    const trio = [
      ['scarecrow', S.scarecrow, 380, 2.3],
      ['tinman', S.tinman, 240, 2.45],
      ['lion', S.lion, 100, 2.6],
    ]
    for (const [, rig, tx2, t0] of trio) {
      const runU = seg(g, t0, t0 + 0.9)
      if (runU <= 0) continue
      const x = lerp(tx2 - 950, tx2, E.outCubic(runU))
      shadow(ctx, x, 952, 40, 0.24)
      sprite(ctx, rig, x, 952, { ...(runU < 1 ? walkCyc(t * 9) : stand), sx: 2.2, sy: 2.2 })
    }
  }
  // guard peeks through the eyelid slot (g1.2-2.2)
  const peek = Math.sin(cl(seg(g, EMERALD_EV.knock + 0.2, EMERALD_EV.knock + 0.8)) * Math.PI)
  if (peek > 0.05) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(770, 520, 130, 34)
    ctx.clip()
    ctx.fillStyle = '#e8d9c8'
    ctx.fillRect(770, 520, 130, 34)
    ctx.fillStyle = '#1a1228'
    ctx.beginPath()
    ctx.arc(816, 538, 7 * peek, 0, 7)
    ctx.arc(856, 538, 7 * peek, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#2c5c46'
    ctx.beginPath()
    ctx.ellipse(836, 528, 46, 15 * (1 - peek) + 2, 0, 0, 7)
    ctx.fill()
    ctx.restore()
  }
  // THE HORSE OF A DIFFERENT COLOR trots past pulling the carriage (g2.0-3.7)
  if (g >= EMERALD_EV.horse - 0.1 && g < EMERALD_EV.horse + 1.8) {
    const u = seg(g, EMERALD_EV.horse - 0.1, EMERALD_EV.horse + 1.8)
    const hx = lerp(2150, -750, u)
    const idx = Math.floor(g / HORSE_STEP) % HORSE_PALS.length
    const trot = Math.sin(g * 11)
    const HY = 920
    shadow(ctx, hx + 180, HY + 10, 150, 0.3)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(S.horses[idx], hx, HY - 200, 360, 240)
    // live trotting legs IN FRONT of the baked body so the gait reads
    ctx.strokeStyle = ART.shadeHex(HORSE_PALS[idx].body, 0.82)
    ctx.lineWidth = 16
    ctx.lineCap = 'round'
    for (const [lx, ph] of [[104, 0], [148, Math.PI], [224, Math.PI], [264, 0]]) {
      ctx.beginPath()
      ctx.moveTo(hx + lx, HY - 58)
      ctx.lineTo(hx + lx + trot * (ph ? 15 : -15), HY + (ph ? -8 : 0))
      ctx.stroke()
    }
    ctx.fillStyle = '#2a241e'
    for (const [lx, ph] of [[104, 0], [148, Math.PI], [224, Math.PI], [264, 0]]) {
      ctx.fillRect(hx + lx + trot * (ph ? 15 : -15) - 9, HY - 6 + (ph ? -8 : 0), 18, 8)
    }
    // carriage + deadpan driver whose tie matches the PREVIOUS color
    const cxp = hx - 300
    ctx.fillStyle = '#2fae72'
    ctx.fillRect(cxp - 90, HY - 118, 220, 78)
    ctx.fillStyle = '#1f8a5c'
    ctx.fillRect(cxp - 90, HY - 118, 220, 16)
    ctx.fillStyle = '#ffcc2e'
    ctx.fillRect(cxp - 90, HY - 56, 220, 8)
    for (const wx of [cxp - 40, cxp + 90]) {
      ctx.strokeStyle = '#ffcc2e'
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.arc(wx, HY - 22, 34, g * 6 % 6.28, g * 6 % 6.28 + 5.4)
      ctx.stroke()
      ctx.strokeStyle = '#1a4a30'
      ctx.lineWidth = 4
      for (let i = 0; i < 4; i++) {
        const a = g * 6 + i * 1.57
        ctx.beginPath()
        ctx.moveTo(wx, HY - 22)
        ctx.lineTo(wx + Math.cos(a) * 32, HY - 22 + Math.sin(a) * 32)
        ctx.stroke()
      }
    }
    ctx.strokeStyle = '#5a4028'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(cxp + 130, HY - 108)
    ctx.lineTo(hx + 70, HY - 108)
    ctx.stroke()
    // the driver sits ON the bench, above the cart board
    shadow(ctx, cxp + 20, HY - 46, 38, 0.24)
    sprite(ctx, S.wizard, cxp + 20, HY - 46, { lift: [2, 0], stride: [1, 0], sx: 2.1, sy: 2.1 })
    const prev = HORSE_PALS[(idx + HORSE_PALS.length - 1) % HORSE_PALS.length]
    ctx.fillStyle = prev.tie
    ctx.beginPath()
    ctx.moveTo(cxp + 13, HY - 128)
    ctx.quadraticCurveTo(cxp + 26 + Math.sin(g * 9) * 4, HY - 104, cxp + 18, HY - 82)
    ctx.lineTo(cxp + 27, HY - 84)
    ctx.quadraticCurveTo(cxp + 35, HY - 104, cxp + 22, HY - 128)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}
function drawThrone(ctx, lt, t, glitch) {
  const g = lt
  const push = lerp(1.0, 1.12, seg(g, EMERALD_EV.throne, EMERALD_EV.doom + 1.5))
  const rev = lt > 9.0 // (S9 reuses this painter with its own pull-back)
  cam(ctx, rev ? 0.95 : push, 960, rev ? 480 : 560)
  ctx.drawImage(S.throne, -OS, -OS)
  // fire pylons
  ART.flame(ctx, 560, 640, 120 + Math.sin(t * 11) * 26, t, 3)
  ART.flame(ctx, 1360, 640, 120 + Math.sin(t * 11 + 2) * 26, t, 8)
  // THE GIANT BALD HEAD OF FLOZ — or, for 1-2 frames, the tiny man (glitch-wink)
  if (glitch) {
    sprite(ctx, S.wizard, 960, 660, { lift: [2, 0], stride: [1, 0], sx: 2.4, sy: 2.4 })
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillRect(600, 380, 720, 10)
    ctx.fillRect(700, 560, 520, 8)
  } else {
    const doom = g >= EMERALD_EV.doom && g < EMERALD_EV.faint + 1.0
    const pulse = doom ? 1 + 0.025 * Math.sin((g - EMERALD_EV.doom) * 13) : 1
    const hy = 400 + (doom ? Math.sin((g - EMERALD_EV.doom) * 13) * 5 : 0)
    // smoke wisps behind the head
    for (let i = 0; i < 6; i++) {
      const u = ((t * 0.12 + hash(i * 7)) % 1)
      ctx.globalAlpha = 0.2 * Math.sin(u * Math.PI)
      ctx.fillStyle = '#3a5a48'
      ctx.beginPath()
      ctx.arc(960 + Math.sin(i * 2 + t * 0.4) * 190, hy - 60 + u * 160 - 60, 40 + u * 60, 0, 7)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.save()
    ctx.translate(960, hy)
    ctx.scale(pulse, pulse)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.giantHead, -150, -150)
    ctx.restore()
    // the scalp lighthouse: a glint beam sweeping from the crown cap
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(960, hy - 78, 84, 22, 0, 0, 7)
    ctx.clip()
    ctx.globalCompositeOperation = 'lighter'
    const a = t * 0.9
    ctx.fillStyle = 'rgba(255,244,214,0.3)'
    ctx.beginPath()
    ctx.moveTo(960, hy - 78)
    ctx.lineTo(960 + Math.cos(a) * 420, hy - 78 + Math.sin(a) * 420)
    ctx.lineTo(960 + Math.cos(a + 0.3) * 420, hy - 78 + Math.sin(a + 0.3) * 420)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    // booming-voice arcs pulse while the DOOM line rides
    if (doom) {
      const open = Math.abs(Math.sin((g - EMERALD_EV.doom) * 9))
      ctx.strokeStyle = 'rgba(255,194,60,0.7)'
      ctx.lineWidth = 5
      for (let i = 0; i < 2; i++) {
        ctx.beginPath()
        ctx.arc(960, hy + 90 + i * 26, 34 + open * (16 + i * 14), 0.5, Math.PI - 0.5)
        ctx.stroke()
      }
    }
  }
  // the quartet at the steps: faint domino (lion first), then the tiptoe moonwalk
  const qx = { dot: 700, scarecrow: 880, tinman: 1060, lion: 1240 }
  const faintAt = (who) => EMERALD_EV.faint + (who === 'lion' ? 0 : who === 'tinman' ? 0.15 : who === 'scarecrow' ? 0.3 : 0.45)
  const tiptoe = Math.max(0, g - EMERALD_EV.tiptoe)
  for (const [who, rig] of [['dot', S.dot], ['scarecrow', S.scarecrow], ['tinman', S.tinman], ['lion', S.lion]]) {
    const x0 = qx[who]
    const x = x0 - tiptoe * 95
    const fu = seg(g, faintAt(who), faintAt(who) + 0.4)
    const rot = -1.35 * E.outCubic(fu) * (1 - seg(g, EMERALD_EV.tiptoe, EMERALD_EV.tiptoe + 0.5))
    if (g >= EMERALD_EV.tiptoe && g < EMERALD_EV.wink - 0.4) {
      // single-file moonwalk backwards out of the room — carrying the get-up
      // rotation so the pile RISES into the shuffle instead of popping upright
      const shuffle = Math.sin(g * 8 + x)
      const rise = 1 - E.outCubic(seg(g, EMERALD_EV.tiptoe, EMERALD_EV.tiptoe + 0.5))
      shadow(ctx, x, 972, 44, 0.26)
      sprite(ctx, rig, x, 972, { rot: -1.35 * rise, lift: [1 + Math.max(0, shuffle) * 2, 1 + Math.max(0, -shuffle) * 2], stride: [1, -1], lean: -0.08, sx: 2.2, sy: 2.2 })
    } else if (g < EMERALD_EV.wink - 0.4) {
      shadow(ctx, x, 972, 44, 0.26)
      sprite(ctx, rig, x, 972, { rot, lift: [2, 0], stride: [1, 0], sx: 2.2, sy: 2.2 })
    }
  }
  ctx.restore()
}
function drawEmerald(ctx, lt, t) {
  const g = lt
  if (g < EMERALD_EV.throne) {
    drawGate(ctx, lt, t)
    return
  }
  // match-dissolve gate -> throne across 0.4 s
  const dis = seg(g, EMERALD_EV.throne, EMERALD_EV.throne + 0.4)
  if (dis < 1) {
    ctx.save()
    ctx.globalAlpha = 1 - dis
    drawGate(ctx, lt, t)
    ctx.restore()
  }
  // the GLITCH-WINK: the tiny man holds 4 real frames at 60 fps (2 at 30) so a
  // dropped frame can never eat the fraud-flag
  const glitch = g >= EMERALD_EV.wink && g < EMERALD_EV.wink + 0.07
  drawThrone(ctx, lt, t, glitch)
}

// ============================== S7 — BALD MONKEYS ==============================
function drawMonkeys(ctx, lt, t) {
  const g = lt
  // macro push toward the witch/hourglass at her line — EASED so it reads as a
  // camera move, not a jump cut (the linear 0.8 s push read as the cell dissolving)
  const macro = E.inOutCubic(seg(g, MONKEYS_EV.hourglassLine - 0.4, MONKEYS_EV.hourglassLine + 0.4))
  cam(ctx, lerp(1.0, 1.28, macro), lerp(960, 1330, macro), lerp(540, 600, macro))
  if (g < MONKEYS_EV.tower) {
    ctx.drawImage(S.forest, -OS, -OS)
    // skywriting SURRENDER FLOWTO, stroke-by-stroke; the wind frays it after
    const sw = seg(g, MONKEYS_EV.skywrite, MONKEYS_EV.skywrite + 1.2)
    if (sw > 0) {
      ctx.save()
      const tw = S.skywrite.width * sw
      ctx.beginPath()
      ctx.rect(310, 120, tw, 190)
      ctx.clip()
      ctx.imageSmoothingEnabled = true
      const fray = Math.max(0, g - (MONKEYS_EV.skywrite + 1.2))
      ctx.globalAlpha = 0.9
      ctx.drawImage(S.skywrite, 310 + (fray > 0 ? (hash(Math.floor(t * 6)) - 0.5) * 5 : 0), 130)
      ctx.restore()
      if (fray > 0) {
        for (let i = 0; i < 12; i++) {
          const u = cl(fray / 2.4)
          ctx.fillStyle = `rgba(190,198,206,${0.3 * (1 - u)})`
          ctx.beginPath()
          ctx.arc(340 + hash(i * 3) * 1200, 300 + hash(i * 7) * 20, 4 + u * (8 + hash(i) * 14), 0, 7)
          ctx.fill()
        }
      }
    }
    // the line marches below the castle — minus the hero + Flowto once the grab
    // lands (they are ON the lead monkey from g3.0 to the tower cut)
    const march = { dot: 620, scarecrow: 820, tinman: 1000, lion: 1180 }
    for (const [who, rig] of [['dot', S.dot], ['scarecrow', S.scarecrow], ['tinman', S.tinman], ['lion', S.lion]]) {
      if ((who === 'dot') && g >= MONKEYS_EV.snatch) continue
      shadow(ctx, march[who], 920, 44, 0.26)
      sprite(ctx, rig, march[who], 920, { ...(g < MONKEYS_EV.snatch || who !== 'dot' ? walkCyc(t * 6.5) : stand), sx: 2.2, sy: 2.2 })
    }
    if (g < MONKEYS_EV.snatch) {
      shadow(ctx, 668, 920, 20, 0.2)
      sprite(ctx, S.flowto, 668, 920, { lift: [4, 2], stride: [2, -2], sx: 1.6, sy: 1.6 })
    }
    // FLYING BALD MONKEYS dive in a V (g2.0); the lead's GRAB lands ON SCREEN at
    // g3.0 — she dips to the line, the pair swings up into her feet, then the
    // carry flight to the tower reads for a full second
    const grabU = seg(g, MONKEYS_EV.snatch, MONKEYS_EV.snatch + 0.25)
    const carryU = seg(g, MONKEYS_EV.snatch + 0.25, MONKEYS_EV.tower)
    // the lead: dive -> grab dip -> carry climb
    let mx, my, ms
    if (g < MONKEYS_EV.snatch) {
      const u = E.inQuad(seg(g, MONKEYS_EV.dive, MONKEYS_EV.snatch))
      mx = lerp(1560, 640, u) + Math.sin(t * 7) * 8
      my = lerp(-140, 700, u)
      ms = 1.5 - u * 0.2
    } else if (grabU < 1) {
      mx = 640
      my = lerp(700, 780, Math.sin(grabU * Math.PI))
      ms = 1.3
    } else {
      const u = E.inOutCubic(carryU)
      mx = lerp(640, 1520, u)
      my = lerp(700, 300, u) - Math.sin(u * Math.PI) * 46
      ms = 1.3 - u * 0.35
    }
    // the carried pair: her feet swing up off the ground through the grab
    if (g >= MONKEYS_EV.snatch) {
      const swing = g < MONKEYS_EV.snatch + 0.25 ? E.outCubic(grabU) : 1
      const hx = lerp(640, mx, swing)
      const hy = lerp(920, my + 118 * ms, swing)
      sprite(ctx, S.dot, hx, hy, { upside: swing >= 1, rot: -2.4 * swing + Math.sin(t * 3) * 0.08, sx: 1.5, sy: 1.5 })
      sprite(ctx, S.flowto, hx + 52 * swing, hy - 8, { upside: swing >= 1, rot: -2.0 * swing, sx: 1.2, sy: 1.2 })
      // gripping arms from the monkey's body down to the pair
      ctx.strokeStyle = '#6b5d4c'
      ctx.lineWidth = 6 * ms
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(mx - 6 * ms, my + 34 * ms)
      ctx.lineTo(hx - 4, hy - 150 * 1.5)
      ctx.moveTo(mx + 10 * ms, my + 30 * ms)
      ctx.lineTo(hx + 46 * swing + 6, hy - 160 * 1.2)
      ctx.stroke()
    }
    // the lead monkey
    monkeyWings(ctx, mx, my, ms, t, 0)
    sprite(ctx, S.monkeys[0], mx, my + 40 * ms, { lift: [4, 4], stride: [0, 0], lean: g < MONKEYS_EV.snatch ? 0.18 : -0.06, sx: ms, sy: ms })
    // wingmen dive in the V, then climb away behind the lead
    const wingPaths = [
      { from: [1800, -260], mid: [1180, 520], out: [1750, -60] },
      { from: [1350, -320], mid: [820, 560], out: [1900, -20] },
    ]
    wingPaths.forEach((p, i) => {
      let wx, wy, ws
      if (g < MONKEYS_EV.snatch + 0.1) {
        const u = E.inQuad(seg(g, MONKEYS_EV.dive + 0.2 + i * 0.15, MONKEYS_EV.snatch + 0.1))
        if (u <= 0) return
        wx = lerp(p.from[0], p.mid[0], u) + Math.sin(t * 7 + i * 2) * 8
        wy = lerp(p.from[1], p.mid[1], u)
        ws = 1.5 - u * 0.2
      } else {
        const u = E.inOutCubic(seg(g, MONKEYS_EV.snatch + 0.1, MONKEYS_EV.tower))
        wx = lerp(p.mid[0], p.out[0], u)
        wy = lerp(p.mid[1], p.out[1], u)
        ws = 1.3 - u * 0.3
      }
      monkeyWings(ctx, wx, wy, ws, t, 1.4 + i)
      sprite(ctx, S.monkeys[(i + 1) % S.monkeys.length], wx, wy + 40 * ws, { lift: [4, 4], stride: [0, 0], lean: 0.16, sx: ws, sy: ws })
    })
    ctx.restore()
    return
  }
  // ---- tower room: cell, hourglass of hair, the witch, the defect beat ----
  ctx.drawImage(S.towerRoom, -OS, -OS)
  // moonlight through the barred window
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = 'rgba(190,214,246,0.2)'
  ctx.beginPath()
  ctx.moveTo(1330, 260)
  ctx.lineTo(1570, 260)
  ctx.lineTo(1700, 900)
  ctx.lineTo(1430, 900)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // a candle's warm pool so the prisoner reads against the stone
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const cand = ctx.createRadialGradient(330, 760, 6, 330, 760, 240 + Math.sin(t * 7) * 12)
  cand.addColorStop(0, 'rgba(255,196,120,0.34)')
  cand.addColorStop(1, 'rgba(255,196,120,0)')
  ctx.fillStyle = cand
  ctx.fillRect(90, 520, 480, 440)
  ctx.restore()
  ctx.fillStyle = '#e8d9c8'
  ctx.fillRect(326, 742, 8, 22)
  ART.flame(ctx, 330, 738, 26 + Math.sin(t * 9) * 7, t, 21)
  // hero locked in the cell (g<defect); BARS ARE LIVE STROKES over her, never a
  // re-blit of the bake region (that erased her)
  if (g < MONKEYS_EV.defect) {
    sprite(ctx, S.dot, 300, 940, { lift: [2, 0], stride: [1, 0], lean: g > MONKEYS_EV.hourglass ? -0.06 : 0, sx: 2.2, sy: 2.2 })
  }
  ctx.strokeStyle = '#3a3448'
  ctx.lineWidth = 13
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.moveTo(110 + i * 80, 220)
    ctx.lineTo(110 + i * 80, 860)
    ctx.stroke()
  }
  ctx.lineWidth = 17
  ctx.beginPath()
  ctx.moveTo(60, 220)
  ctx.lineTo(480, 220)
  ctx.moveTo(60, 860)
  ctx.lineTo(480, 860)
  ctx.stroke()
  // the hair hourglass fills (g4.5), one strand trembling at the end
  const hp = cl((g - MONKEYS_EV.hourglass) / (MONKEYS_EV.lastStrand - MONKEYS_EV.hourglass + 0.3))
  ART.hourglass(ctx, 1640, 620, 2.1, hp, t)
  // the witch, wig adjusted, delivers the line (g6.0)
  const wAge = g - MONKEYS_EV.hourglassLine
  if (wAge > 0) {
    if (wAge < 0.6) ART.smokePuff(ctx, 1150, 500, wAge, 0.6, { seed: 57 })
    const wFeet = 960
    sprite(ctx, S.witch, 1150, wFeet, { lift: [2, 0], stride: [1, 0], lean: 0.05, sx: 2.3, sy: 2.3 })
    ART.wig(ctx, 1152, crownY(S.witch, wFeet, 2.3) + 2, 2.3 * 0.6, t, { rot: Math.sin(t * 1.8) * 0.05 })
  }
  // the defect beat: Flowto grooms the lead monkey's scalp-patch at the window
  if (g >= MONKEYS_EV.defect - 0.4) {
    const mx = 1500, my = 560
    const soft = seg(g, MONKEYS_EV.defect, MONKEYS_EV.defect + 0.6)
    monkeyWings(ctx, mx, my, 1.6, t * 0.4, 0.5) // wings settle folded
    sprite(ctx, S.monkeys[0], mx, my + 62, { rot: -0.1 * soft, lift: [2, 0], stride: [1, 0], sx: 1.6, sy: 1.6 })
    sprite(ctx, S.flowto, mx - 44, my + 80, { lift: [3, 3], stride: [1, -1], lean: 0.2, sx: 1.4, sy: 1.4 })
    // grooming strokes
    const stroke = Math.sin(t * 8)
    ctx.strokeStyle = '#c9a37a'
    ctx.lineWidth = 3.4
    ctx.beginPath()
    ctx.moveTo(mx - 52, my + 60 + stroke * 4)
    ctx.lineTo(mx - 34, my + 40 + stroke * 6)
    ctx.stroke()
    // eyes soften: two gentle brow arcs
    ctx.strokeStyle = `rgba(226,232,238,${0.8 * soft})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(mx - 8, my - 30, 8, Math.PI * 1.15, Math.PI * 1.85)
    ctx.arc(mx + 12, my - 30, 8, Math.PI * 1.15, Math.PI * 1.85)
    ctx.stroke()
    // the latch opens (g9.5)
    const latch = E.outCubic(seg(g, MONKEYS_EV.lastStrand - 0.1, MONKEYS_EV.lastStrand + 0.3))
    ctx.save()
    ctx.translate(1556, 540)
    ctx.rotate(latch * 1.4)
    ctx.fillStyle = '#c9b45a'
    ctx.fillRect(-4, -16, 8, 32)
    ctx.restore()
  }
  ctx.restore()
}

// ============================== S8 — THE MELT ==============================
function drawMelt(ctx, lt, t) {
  const g = lt
  const meltPush = seg(g, MELT_EV.melt, MELT_EV.wigFloat)
  const kneelPan = seg(g, MELT_EV.kneel - 0.3, MELT_EV.kneel + 0.9)
  cam(ctx, lerp(1.0, 1.14, meltPush), lerp(960, 1150, meltPush * (1 - kneelPan)) + kneelPan * 160, lerp(560, 620, Math.max(meltPush, kneelPan)))
  ctx.drawImage(S.courtyard, -OS, -OS)
  // cauldrons with living green brew
  for (const [cxp, seed] of [[420, 1], [700, 2]]) {
    ctx.fillStyle = '#14101c'
    ctx.beginPath()
    ctx.ellipse(cxp, 812, 74, 40, 0, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = '#3f6b36'
    ctx.beginPath()
    ctx.ellipse(cxp, 806, 64, 14, 0, 0, 7)
    ctx.fill()
    for (let i = 0; i < 4; i++) {
      const u = ((t * 0.5 + hash(i * 3 + seed)) % 1)
      ctx.globalAlpha = (1 - u) * 0.6
      ctx.fillStyle = '#6fae5c'
      ctx.beginPath()
      ctx.arc(cxp - 30 + hash(i + seed) * 60, 800 - u * 60, 3 + u * 7, 0, 7)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  // sneak along the wall (g1.0): hero + Flowto + the defecting monkey — and they
  // STAY ON SCREEN as witnesses through the whole melt (the triumph needs an
  // audience); Flowto breaks for the bucket at g1.9 and lands the shoulder-check
  const sneakU = seg(g, MELT_EV.sneak, MELT_EV.caught)
  const bucketU = seg(g, MELT_EV.caught + 0.1, MELT_EV.bucket)
  const fbx = lerp(830, 940, bucketU)
  if (g >= MELT_EV.sneak) {
    const atWall = Math.min(sneakU, 1)
    const sx = lerp(140, 700, atWall)
    const watch = g >= MELT_EV.bucket
    const fxx = watch ? 940 : lerp(sx + 70, 940, E.outCubic(bucketU))
    const cheer = g >= MELT_EV.kneel ? Math.abs(Math.sin((g - MELT_EV.kneel) * 6)) * 8 : 0
    shadow(ctx, sx, 946, 36, 0.24)
    sprite(ctx, S.dot, sx, 946 - cheer, { lift: [1, 1], stride: [2, -2], lean: watch ? -0.12 : 0.22, sx: 2.2, sy: 2.2 })
    if (g < MELT_EV.wigFloat - 0.2) {
      shadow(ctx, fxx, 952, 22, 0.2)
      sprite(ctx, S.flowto, fxx, 952 - (bucketU > 0 && bucketU < 1 ? Math.abs(Math.sin(bucketU * Math.PI * 3)) * 16 : 0), { lift: [2, 2], lean: watch ? -0.1 : 0.25, sx: 1.5, sy: 1.5 })
    }
    if (g >= MELT_EV.sneak + 0.2) {
      shadow(ctx, sx + 120, 946, 26, 0.2)
      sprite(ctx, S.monkeys[2], sx + 120, 946 - cheer * 0.6, { lift: [1, 1], stride: [2, -2], lean: watch ? -0.08 : 0.22, sx: 1.3, sy: 1.3 })
    }
  }
  const tip = E.outCubic(seg(g, MELT_EV.bucket, MELT_EV.bucket + 0.3))
  ART.bucket(ctx, 985, 948, 2.2, tip * 1.25)
  const waterAge = g - MELT_EV.bucket
  if (waterAge > 0 && waterAge < 0.8) ART.waterArc(ctx, 1010, 930, 1120, 830, waterAge, 0.8)
  // the witch: monologue (hourglass ONE strand left) -> caught -> MELT (g3.0)
  const meltU = seg(g, MELT_EV.melt, MELT_EV.melt + 1.2)
  const wFeet = 946
  const wS = 2.4 * (1 - 0.86 * E.outCubic(meltU))
  const wobble = meltU > 0 && meltU < 1 ? Math.sin(g * 18) * 0.06 * (1 - meltU) : 0
  const wx = 1150
  if (g < MELT_EV.melt + 1.4) {
    shadow(ctx, wx, wFeet, 48 * (1 - meltU * 0.7), 0.3)
    sprite(ctx, S.witch, wx, wFeet, {
      flip: g >= MELT_EV.caught,
      lift: [2, 0], stride: [1, 0],
      lean: g >= MELT_EV.caught && meltU <= 0 ? 0.12 : -0.1 * meltU,
      rot: wobble + 0.3 * E.outCubic(meltU),
      sx: wS * (g >= MELT_EV.caught && meltU <= 0 ? 1.04 : 1), sy: wS,
    })
    // her wig rides (flies off at the melt)
    if (meltU <= 0) ART.wig(ctx, wx + 2, crownY(S.witch, wFeet, 2.4) + 2, 2.4 * 0.6, t, {})
    else if (meltU < 0.35) {
      const fu = meltU / 0.35
      ART.wig(ctx, wx + 40 * fu, crownY(S.witch, wFeet, 2.4) - 130 * fu, 1.5, t, { rot: fu * 4 })
    }
    // broom raised for the monologue inhale — then it TOPPLES and lies by the
    // puddle for the rest of the scene (props must not vanish mid-melt)
    if (g >= MELT_EV.caught && meltU <= 0) ART.broom(ctx, wx - 60, wFeet - 240, -2.1, 1.15)
    else if (g >= MELT_EV.melt + 0.5) {
      ART.broom(ctx, wx - 165, 948, 0.04, 1.05)
      // her hat settles brim-down by the puddle once the wig floats free
      if (g >= MELT_EV.wigFloat) {
        ctx.fillStyle = '#2a2432'
        ctx.beginPath()
        ctx.ellipse(wx + 175, 948, 30, 8, 0.06, 0, 7)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(wx + 175, 941, 13, 10, 0.06, Math.PI, 0)
        ctx.fill()
      }
    }
    // her voice rises as she goes down: shrinking arcs climbing
    if (meltU > 0) {
      ctx.strokeStyle = 'rgba(140,220,140,0.6)'
      ctx.lineWidth = 3
      for (let i = 0; i < 3; i++) {
        const u = ((g * 2 + i * 0.3) % 1)
        ctx.beginPath()
        ctx.arc(wx + 20, wFeet - 130 * wS / 2.4 - u * 160, 8 + u * 18, 0.4, 2.7)
        ctx.stroke()
      }
    }
  }
  // the puddle + the dress tent deflating
  const pudU = seg(g, MELT_EV.melt + 0.4, MELT_EV.wigFloat)
  if (pudU > 0) {
    ctx.fillStyle = `rgba(90,150,80,${0.75})`
    ctx.beginPath()
    ctx.ellipse(wx, 952, 26 + pudU * 140, (26 + pudU * 140) * 0.24, 0, 0, 7)
    ctx.fill()
    ctx.fillStyle = 'rgba(160,220,140,0.5)'
    ctx.beginPath()
    ctx.ellipse(wx - 20, 948, (26 + pudU * 140) * 0.5, (26 + pudU * 140) * 0.12, 0, 0, 7)
    ctx.fill()
    // ripple rings keep expanding after the settle
    const rippleAge = g - MELT_EV.wigFloat
    if (rippleAge > 0) {
      for (let i = 0; i < 3; i++) {
        const u = ((rippleAge * 0.7 + i * 0.33) % 1)
        ctx.strokeStyle = `rgba(200,240,190,${0.4 * (1 - u)})`
        ctx.lineWidth = 2.6
        ctx.beginPath()
        ctx.ellipse(wx, 952, (26 + pudU * 140) * (0.4 + u), (26 + pudU * 140) * (0.4 + u) * 0.24, 0, 0, 7)
        ctx.stroke()
      }
    }
  }
  // THE WIG floats pristine (g5.6); Flowto paddles out and fishes it proudly
  if (g >= MELT_EV.wigFloat - 0.2 && g < MELT_EV.kneel + 0.5) {
    const fish = seg(g, MELT_EV.kneel - 0.4, MELT_EV.kneel)
    ART.wig(ctx, lerp(wx + 60, fbx + 10, fish), lerp(938, 900, fish) - Math.sin(t * 2.4) * 5, 1.5, t, { bob: 2.4 })
    sprite(ctx, S.flowto, lerp(wx + 130, fbx - 20, fish), 948, { rot: Math.sin(t * 4) * 0.1, sx: 1.5, sy: 1.0 })
    for (let i = 0; i < 3; i++) {
      const u = ((t * 1.2 + i * 0.4) % 1)
      ctx.strokeStyle = `rgba(200,240,190,${0.5 * (1 - u)})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(fbx - 30 - u * 30, 946, 5 + u * 9, 0.4, 2.6)
      ctx.stroke()
    }
  }
  // WINKIE guard line kneels left-to-right in a click-wave (g6.6)
  for (let i = 0; i < 5; i++) {
    const gx = 1420 + i * 120
    const kneelU = seg(g, MELT_EV.kneel + i * KNEEL_STAGGER, MELT_EV.kneel + i * KNEEL_STAGGER + 0.35)
    const rot = -1.15 * E.outCubic(kneelU)
    shadow(ctx, gx, 962, 42, 0.26)
    sprite(ctx, S.guards[i % 2], gx, 962, { rot, lift: [2, 0], stride: [1, 0], sx: 2.1, sy: 2.1 })
    ART.spear(ctx, gx + 26, 962 - 60 * (1 - kneelU) - 20, -0.2 + 0.9 * kneelU, 1.6)
  }
  // the badly-drawn-hero pennant goes up (g7.5)
  if (g >= MELT_EV.pennant) {
    const pu = E.outCubic(seg(g, MELT_EV.pennant, MELT_EV.pennant + 0.4))
    paintFacePennant(ctx, 1500, 800 - pu * 60, 1.5, t)
  }
  ctx.restore()
}

// ============================== S9 — THE CURTAIN ==============================
function drawCurtain(ctx, lt, t) {
  const g = lt
  const balloonU = seg(g, CURTAIN_EV.slips, CURTAIN_EV.slips + 2.4)
  cam(ctx, lerp(1.12, 0.92, seg(g, CURTAIN_EV.peel, CURTAIN_EV.peel + 1.2)), 960, lerp(560, 420, balloonU))
  ctx.drawImage(S.throne, -OS, -OS)
  ART.flame(ctx, 560, 640, 110 + Math.sin(t * 11) * 22, t, 3)
  ART.flame(ctx, 1360, 640, 110 + Math.sin(t * 11 + 2) * 22, t, 8)
  // THE GIANT HEAD rides ABOVE the curtain; it stutters (g1.2) with syncopated smoke
  const stutter = g >= CURTAIN_EV.stutter && g < CURTAIN_EV.stutter + 0.45
  const hy = 280 + (stutter ? (hash(Math.floor(g * 30)) - 0.5) * 26 : 0)
  for (let i = 0; i < 5; i++) {
    const u = ((t * 0.14 + hash(i * 5 + (stutter ? 40 : 0))) % 1)
    ctx.globalAlpha = 0.18 * Math.sin(u * Math.PI)
    ctx.fillStyle = '#3a5a48'
    ctx.beginPath()
    ctx.arc(960 + Math.sin(i * 2.4 + t * 0.5) * 200, hy - 40 + u * 140, 36 + u * 50, 0, 7)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.save()
  ctx.translate(960, hy)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(S.giantHead, -140, -140)
  ctx.restore()
  // the head lip-syncs while the little man squeaks the same line (wrong-audio gag)
  if (g >= CURTAIN_EV.line && g < CURTAIN_EV.mime) {
    const open = Math.abs(Math.sin(g * 12))
    ctx.strokeStyle = 'rgba(255,194,60,0.7)'
    ctx.lineWidth = 5
    for (let i = 0; i < 2; i++) {
      ctx.beginPath()
      ctx.arc(960, hy + 84 + i * 24, 30 + open * (14 + i * 12), 0.5, Math.PI - 0.5)
      ctx.stroke()
    }
  }
  // the projectionist's console (behind the curtain, revealed by the peel)
  const peelU = E.outCubic(seg(g, CURTAIN_EV.peel, CURTAIN_EV.peel + 0.8))
  ctx.fillStyle = '#23262e'
  ctx.fillRect(700, 620, 520, 300)
  ctx.fillStyle = '#2e323c'
  ctx.fillRect(680, 600, 560, 34)
  // levers
  for (let i = 0; i < 4; i++) {
    const lx = 770 + i * 110
    const la = Math.sin(t * 2.2 + i * 1.3) * 0.4
    ctx.strokeStyle = '#c9c9c9'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(lx, 640)
    ctx.lineTo(lx + Math.sin(la) * 40, 640 - Math.cos(la) * 56)
    ctx.stroke()
    ctx.fillStyle = '#c23b4a'
    ctx.beginPath()
    ctx.arc(lx + Math.sin(la) * 40, 640 - Math.cos(la) * 56, 9, 0, 7)
    ctx.fill()
  }
  // kettle + steam (steam = the boom; noise-jittered ellipses)
  ctx.fillStyle = '#c9c9c9'
  ctx.fillRect(1130, 560, 46, 44)
  ctx.fillStyle = '#8b95a2'
  ctx.beginPath()
  ctx.moveTo(1176, 570)
  ctx.lineTo(1196, 560)
  ctx.lineTo(1196, 574)
  ctx.lineTo(1176, 580)
  ctx.closePath()
  ctx.fill()
  for (let i = 0; i < 4; i++) {
    const u = ((t * 0.8 + i * 0.25) % 1)
    ctx.globalAlpha = (1 - u) * 0.5
    ctx.fillStyle = '#e8e4da'
    ctx.beginPath()
    ctx.arc(1186 + (hash(i * 9 + Math.floor(t * 8)) - 0.5) * 16, 552 - u * 80, 5 + u * 13, 0, 7)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  // bass drum underfoot
  ctx.fillStyle = '#7a2f28'
  ctx.beginPath()
  ctx.ellipse(760, 880, 52, 40, 0, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#f0ece2'
  ctx.beginPath()
  ctx.ellipse(760, 880, 52, 40, 0, 0.6, 2.5)
  ctx.fill()
  // PROJECTIONIST patch (diegetic)
  ctx.fillStyle = '#f0ece2'
  ctx.fillRect(880, 700, 160, 30)
  ctx.fillStyle = '#23262e'
  ctx.font = '700 17px "JetBrains Mono"'
  ctx.textAlign = 'center'
  ctx.fillText('PROJECTIONIST', 960, 721)
  ctx.textAlign = 'left'
  // the TINY BALD man at the console (peel reveals him; mime follows) — he
  // SCRAMBLES left to board the balloon before it inflates, so the rider is
  // never a second copy of him
  const boardU = seg(g, CURTAIN_EV.balloon - 1.2, CURTAIN_EV.balloon - 0.4)
  if (peelU > 0.2 && boardU < 1) {
    const mime = g >= CURTAIN_EV.mime && boardU <= 0
    const squeak = g >= CURTAIN_EV.line && g < CURTAIN_EV.mime ? Math.sin(g * 30) * 2 : 0
    const wFeet = 920
    const runX = lerp(960, 560, E.inQuad(boardU))
    shadow(ctx, runX, wFeet, 34, 0.26)
    sprite(ctx, S.wizard, runX + squeak, wFeet, { ...(boardU > 0 ? walkCyc(t * 10) : { lift: [2, 0], stride: [1, 0] }), lean: boardU > 0 ? -0.18 : mime ? -0.06 : 0.04, sx: 1.9, sy: 1.9 })
    // megaphone in hand (dropped when the scramble starts)
    if (boardU <= 0) {
      ctx.fillStyle = '#ffcc2e'
      ctx.beginPath()
      ctx.moveTo(996 + squeak, 790)
      ctx.lineTo(1030 + squeak, 776)
      ctx.lineTo(1030 + squeak, 800)
      ctx.lineTo(996 + squeak, 792)
      ctx.closePath()
      ctx.fill()
    }
    // mime: painted card of the head on a stick, wobbling (sneeze spike)
    if (mime) {
      const sneeze = Math.abs(Math.sin(g * 0.8)) > 0.97 ? 0.3 : 0
      ctx.save()
      ctx.translate(1080, 700)
      ctx.rotate(Math.sin(t * 3) * 0.08 + sneeze)
      ctx.strokeStyle = '#6b4a2f'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(0, 60)
      ctx.lineTo(0, -30)
      ctx.stroke()
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(S.giantHead, -36, -86, 72, 72)
      ctx.restore()
    }
  }
  // curtain halves peel apart with sine-wave cloth edges — they cover ONLY the
  // console bay, so the head (above) and the presentation (front) stay visible
  if (peelU < 1) {
    const halfW = 340 * (1 - peelU)
    for (const side of [-1, 1]) {
      const x0 = 960 + side * (340 - halfW)
      ctx.fillStyle = '#7a1f3c'
      ctx.beginPath()
      ctx.moveTo(x0, 540)
      ctx.lineTo(x0 - side * halfW, 540)
      ctx.lineTo(x0 - side * halfW, 942)
      for (let yy = 942; yy >= 540; yy -= 34) {
        ctx.lineTo(x0 + Math.sin(yy * 0.02 + t * 2) * 9 + side * 7, yy)
      }
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#5c1630'
      ctx.fillRect(x0 - side * halfW, 540, side * 22, 402)
    }
  }
  // FLOWTO tugs the curtain rope at the bay's edge: leaps, bites, fireman-slide;
  // he hops off and joins the line after the peel
  const ropeX = 1400
  ctx.strokeStyle = '#8a6f48'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(ropeX, -OS)
  ctx.lineTo(ropeX, 620)
  ctx.stroke()
  const tugU = seg(g, CURTAIN_EV.tug, CURTAIN_EV.peel)
  if (tugU > 0 && g < CURTAIN_EV.peel + 0.6) {
    const fy = tugU < 0.3 ? lerp(920, 300, E.outCubic(tugU / 0.3)) : lerp(300, 700, seg(g, CURTAIN_EV.tug + 0.35, CURTAIN_EV.peel))
    sprite(ctx, S.flowto, ropeX - 4, fy, { rot: Math.sin(t * 12) * 0.2, sx: 1.5, sy: 1.5 })
  }
  // the presentation: wig on a velvet comb-pillow on its own stand (left), and the
  // ONE quartet line — bows at g0-1.2, receives tokens, waves the balloon off
  const bow = Math.sin(cl(seg(g, 0.1, CURTAIN_EV.stutter)) * Math.PI) * 0.3
  const recede = seg(g, CURTAIN_EV.waveBack - 1.0, CURTAIN_EV.bubbleIn)
  const wsc = 2.1 - recede * 0.55
  if (g < CURTAIN_EV.tokens) {
    ctx.fillStyle = '#c23b6a'
    ctx.beginPath()
    ctx.ellipse(390, 906, 66, 20, 0, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#5a4028'
    ctx.fillRect(382, 920, 16, 40)
    ART.comb(ctx, 390, 892, 0, 1.1)
    ART.wig(ctx, 390, 872, 1.2, t, {})
  }
  const bowX = { dot: 620, scarecrow: 760, tinman: 1150, lion: 1290 }
  for (const [i, entry] of [['dot', S.dot], ['scarecrow', S.scarecrow], ['tinman', S.tinman], ['lion', S.lion]].entries()) {
    const xx = bowX[entry[0]]
    shadow(ctx, xx, 950, 42 * wsc / 2.1, 0.26)
    sprite(ctx, entry[1], xx, 950, { rot: bow * (1 - recede), lift: [2, 0], stride: [1, 0], sx: wsc, sy: wsc })
    if (g >= CURTAIN_EV.waveBack) {
      ctx.strokeStyle = ['#9c8942', '#e3c268', '#9aa6b2', '#c98f4e'][i]
      ctx.lineWidth = 7 * wsc / 2.1
      ctx.beginPath()
      ctx.moveTo(xx + 20 * wsc / 2.1, 950 - 108 * wsc / 2.1)
      ctx.lineTo(xx + 46 * wsc / 2.1, 950 - 148 * wsc / 2.1 + Math.sin(t * 7 + i) * 10)
      ctx.stroke()
    }
  }
  if (g >= CURTAIN_EV.peel + 0.6) sprite(ctx, S.flowto, 960, 958, { sx: 1.5, sy: 1.5 })
  // TOKENS down the gift chute (g7.4): tonic, comb, medal
  if (g >= CURTAIN_EV.tokens - 0.2 && g < CURTAIN_EV.balloon + 0.5) {
    ctx.strokeStyle = '#8b95a2'
    ctx.lineWidth = 14
    ctx.beginPath()
    ctx.moveTo(1700, -20)
    ctx.lineTo(1450, 330)
    ctx.stroke()
    const drops = [
      { at: CURTAIN_EV.tokens, draw: (x, y) => tonicBottle(ctx, x, y, 1.7, true), tx: 780, ty: 800 },
      { at: CURTAIN_EV.tokens + 0.6, draw: (x, y) => ART.comb(ctx, x, y, 0.2, 1), tx: 780, ty: 800 },
      { at: CURTAIN_EV.tokens + 1.2, draw: (x, y) => medal(ctx, x, y, 1.5), tx: 1140, ty: 872 },
    ]
    for (const d of drops) {
      const u = seg(g, d.at, d.at + 0.6)
      if (u <= 0 || u >= 1) continue
      const dx = lerp(1560, d.tx, E.inQuad(u))
      const dy = lerp(160, d.ty, E.inQuad(u)) - Math.sin(u * Math.PI) * 40
      d.draw(dx, dy)
      ART.starGlint(ctx, dx, dy, 20, (t * 3) % 1)
    }
  }
  // recipients react (and STAY to the cut — tokens must not despawn): tin
  // polishes, scarecrow combs flat, lion WEARS the medal on his chest
  {
    const tU = seg(g, CURTAIN_EV.tokens + 0.6, CURTAIN_EV.tokens + 1.2)
    if (tU > 0) tonicBottle(ctx, bowX.tinman + 20, 800 - Math.sin(t * 10) * 4, 1.6, true)
    const cU = seg(g, CURTAIN_EV.tokens + 1.2, CURTAIN_EV.tokens + 1.8)
    if (cU > 0) ART.comb(ctx, bowX.scarecrow + 6, crownY(S.scarecrow, 940, 2.1) + 14 - cU * 10, -0.2 + Math.sin(t * 9) * 0.2, 0.8)
    const mU = seg(g, CURTAIN_EV.tokens + 1.8, CURTAIN_EV.tokens + 2.4)
    if (mU > 0) {
      medal(ctx, bowX.lion + 4, 872 + Math.sin(t * 2.2) * 2, 1.4)
      ctx.strokeStyle = '#c98f4e'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(bowX.lion + 8, 852)
      ctx.lineTo(bowX.lion + 4, 828)
      ctx.stroke()
      const tear = ((g * 1.4) % 1)
      ctx.fillStyle = 'rgba(190,226,246,0.8)'
      ctx.beginPath()
      ctx.ellipse(bowX.lion - 14, crownY(S.lion, 940, 2.1) + 30 + tear * 60, 3.4, 6, 0, 0, 7)
      ctx.fill()
    }
  }
  // FLOZ AIR LINES balloon inflates (g9.4); the rope slips (g10.0) — wizard only
  if (g >= CURTAIN_EV.balloon - 0.4) {
    const inf = seg(g, CURTAIN_EV.balloon, CURTAIN_EV.slips + 0.4)
    const rise = E.inQuad(balloonU)
    const bx = 560 + rise * 340
    const by = 540 - rise * 740
    const bs = (0.25 + 0.75 * E.outBack(inf)) * (1 - rise * 0.25)
    // envelope + ropes + basket
    ctx.save()
    ctx.translate(bx, by)
    ctx.scale(bs, bs)
    const eg = ctx.createLinearGradient(-110, 0, 110, 0)
    eg.addColorStop(0, '#c23b4a')
    eg.addColorStop(0.5, '#e8687a')
    eg.addColorStop(1, '#8a2436')
    ctx.fillStyle = eg
    ctx.beginPath()
    ctx.moveTo(0, -190)
    ctx.bezierCurveTo(-130, -180, -120, -40, -46, 6)
    ctx.lineTo(46, 6)
    ctx.bezierCurveTo(120, -40, 130, -180, 0, -190)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,226,122,0.6)'
    ctx.lineWidth = 3
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath()
      ctx.moveTo(i * 40, -178)
      ctx.quadraticCurveTo(i * 46, -80, i * 18, 4)
      ctx.stroke()
    }
    // curved diegetic lettering
    ctx.fillStyle = '#fff3d0'
    ctx.font = '700 30px Anton'
    ctx.textAlign = 'center'
    const word = 'FLOZ AIR LINES'
    for (let i = 0; i < word.length; i++) {
      const a = -0.9 + (i / (word.length - 1)) * 1.8
      ctx.save()
      ctx.translate(Math.sin(a) * 120, -110 - Math.cos(a) * 60)
      ctx.rotate(a * 0.8)
      ctx.fillText(word[i], 0, 0)
      ctx.restore()
    }
    ctx.textAlign = 'left'
    ctx.strokeStyle = '#5a4028'
    ctx.lineWidth = 4
    for (const rx of [-40, 40]) {
      ctx.beginPath()
      ctx.moveTo(rx, 6)
      ctx.lineTo(rx * 0.7, 76)
      ctx.stroke()
    }
    ctx.fillStyle = '#8a6a48'
    ctx.fillRect(-52, 76, 104, 52)
    ctx.strokeStyle = '#5a4028'
    ctx.lineWidth = 3
    ctx.strokeRect(-52, 76, 104, 52)
    // the wizard boards with the wig boxed like crown jewels
    sprite(ctx, S.wizard, 0, 76, { lift: [2, 0], stride: [1, 0], sx: 1.5, sy: 1.5 })
    ctx.fillStyle = '#c9b45a'
    ctx.fillRect(20, 40, 34, 24)
    ctx.strokeStyle = '#ffcc2e'
    ctx.lineWidth = 2
    ctx.strokeRect(20, 40, 34, 24)
    ctx.fillStyle = '#ffcc2e'
    ctx.fillRect(30, 46, 14, 6)
    ctx.restore()
    // his hat hangs one beat, THEN falls (gag 17)
    const hatAge = g - CURTAIN_EV.slips
    if (hatAge > 0 && hatAge < 1.6) {
      const hU = seg(g, CURTAIN_EV.slips + 0.35, CURTAIN_EV.slips + 1.5)
      const hxp = bx + (hU > 0 ? 30 * hU : 30)
      const hyp = by - 96 * bs - (hU > 0 ? 40 * hU + 500 * hU * hU : 0)
      if (hU <= 0 || hyp < 1200) {
        ctx.fillStyle = '#23262e'
        ctx.beginPath()
        ctx.ellipse(hxp, hyp, 22, 7, hU * 2, 0, 7)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(hxp, hyp - 8, 12, 10, 0, Math.PI, 0)
        ctx.fill()
      }
    }
    // the flip sign: BALDANSA OR BUST. / smiley (diegetic, no caption)
    if (g >= CURTAIN_EV.signWave - 0.4) {
      const flip = Math.floor((g - CURTAIN_EV.signWave) * 1.7) % 2
      const sxp = bx + 70 * bs
      const syp = by + 96 * bs
      ctx.save()
      ctx.translate(sxp, syp)
      ctx.rotate(Math.sin(t * 3) * 0.1)
      ctx.fillStyle = '#f5eee0'
      ctx.fillRect(-52, -30, 104, 60)
      ctx.strokeStyle = '#5a4028'
      ctx.lineWidth = 3
      ctx.strokeRect(-52, -30, 104, 60)
      if (flip === 0) {
        ctx.fillStyle = '#23262e'
        ctx.font = '700 15px "JetBrains Mono"'
        ctx.textAlign = 'center'
        ctx.fillText('BALDANSA', 0, -6)
        ctx.fillText('OR BUST.', 0, 12)
        ctx.textAlign = 'left'
      } else {
        ctx.strokeStyle = '#23262e'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(0, 0, 20, 0, 7)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(-7, -6, 2.6, 0, 7)
        ctx.arc(7, -6, 2.6, 0, 7)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(0, 2, 11, 0.4, Math.PI - 0.4)
        ctx.stroke()
      }
      ctx.restore()
      // noble wave
      ctx.strokeStyle = '#b4a292'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(sxp - 30, syp - 40)
      ctx.lineTo(sxp - 52, syp - 70 + Math.sin(t * 6) * 8)
      ctx.stroke()
    }
  }
  // Glinda's bubble descends INTO frame for the match-cut (g12.4)
  if (g >= CURTAIN_EV.bubbleIn) {
    const bu = seg(g, CURTAIN_EV.bubbleIn, CURTAIN_EV.cut)
    ART.bubble(ctx, 960, lerp(-100, 220, bu), 80, t)
    sprite(ctx, S.glinda, 960, lerp(-100, 220, bu) + 48, { sx: 1.2, sy: 1.2 })
  }
  ctx.restore()
}

// ============================== S10 — NO PLACE LIKE GROWTH ==============================
function drawGrowth(ctx, lt, t, overlay) {
  const g = lt
  const drainU = seg(g, GROWTH_EV.drainStart, GROWTH_EV.drainEnd)
  // macro foot crops on the three clicks; wide elsewhere
  let k = 1.0, cx2 = 960, cy2 = 560
  for (const click of [GROWTH_EV.click1, GROWTH_EV.click2, GROWTH_EV.click3]) {
    const d = g - click
    if (d > -0.45 && d < 1.0) {
      // the punch-in reads as an intent: ~0.3 s eased ease-in AND ease-out
      const zu = Math.min(E.inOutCubic(seg(g, click - 0.4, click - 0.1)), 1 - E.inOutCubic(seg(g, click + 0.6, click + 0.95)))
      k = Math.max(k, lerp(1.0, 1.8, cl(zu)))
      cx2 = lerp(cx2, 900, cl(zu))
      cy2 = lerp(cy2, 800, cl(zu))
    }
  }
  cam(ctx, k, cx2, cy2)
  const bY = lerp(-60, H + 60, drainU)
  if (g < GROWTH_EV.drainEnd) {
    ctx.drawImage(S.meadow, -OS, -OS)
  }
  // meadow actors stay until the drain line passes their feet (color dies top-down)
  const colorAlive = g < GROWTH_EV.drainStart || (drainU > 0 && bY < 880)
  // Glinda's bubble LANDS and she steps out (g0.9), then points at the heels
  // before click 1 and stays as a witness until the drain line takes her
  if (colorAlive) {
    if (g < 0.9) {
      const land = E.outCubic(seg(g, 0, 0.7))
      const bY2 = lerp(-60, 706, land)
      ART.bubble(ctx, 620, bY2, 96, t)
      sprite(ctx, S.glinda, 620, bY2 + 64, { lift: [2, 0], stride: [1, 0], sx: 1.5, sy: 1.5 })
    } else if (g < 1.3) {
      ART.bubbleShards(ctx, 620, 706, 96, g - 0.9, 0.5)
      const drop = E.outCubic(seg(g, 0.9, 1.3))
      const gFeet = lerp(770, 908, drop)
      shadow(ctx, 620, gFeet, 36, 0.24)
      sprite(ctx, S.glinda, 620, gFeet, { lift: [2, 0], stride: [1, 0], sx: 1.5, sy: 1.5 })
      if (g > 1.05) ART.starGlint(ctx, 628, crownY(S.glinda, gFeet, 1.5) + 24, 26, seg(g, 1.05, 1.5))
    } else {
      const gFeet = 908
      shadow(ctx, 620, gFeet, 36, 0.24)
      sprite(ctx, S.glinda, 620, gFeet, { lift: [2, 0], stride: [1, 0], sx: 1.5, sy: 1.5 })
      // the mandated opening gesture: points at the heels before click 1
      const point = Math.sin(cl(seg(g, 1.5, 2.1)) * Math.PI)
      if (point > 0.02) {
        ctx.strokeStyle = '#f2b8cf'
        ctx.lineWidth = 7
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(654, 826)
        ctx.lineTo(654 + 96 * point, 826 + 66 * point)
        ctx.stroke()
      }
    }
  }
  // the hero + her ruby slippers
  const dotX = 900, dotFeet = 900
  if (colorAlive) {
    shadow(ctx, dotX, dotFeet, 50, 0.28)
    sprite(ctx, S.dot, dotX, dotFeet, { lift: [2, 0], stride: [1, 0], sx: 2.4, sy: 2.4 })
    // heels tap on each click
    for (const [i, click] of [GROWTH_EV.click1, GROWTH_EV.click2, GROWTH_EV.click3].entries()) {
      const d = g - click
      const tap = d > 0 && d < 0.35 ? Math.sin(cl(d / 0.35) * Math.PI) : 0
      ART.slipper(ctx, dotX - 13, dotFeet - 2 - tap * 5, 0.62, -tap * 0.5)
      ART.slipper(ctx, dotX + 13, dotFeet - 2, 0.62, 0.1)
      ART.sparkRing(ctx, dotX, dotFeet - 8, d, 0.55)
    }
  }
  // ---- THE REVERSE-TWISTER DRAIN: color vacuumed UP, top-down (g6.6-7.8) ----
  if (drainU > 0 && drainU < 1) {
    // sepia bedroom beneath, revealed from the top
    ctx.save()
    ctx.beginPath()
    ctx.rect(-OS, -OS, W + OS * 2, bY + OS)
    ctx.clip()
    ctx.drawImage(S.bedroom, -OS, -OS)
    ctx.restore()
    // wavy boundary
    ctx.strokeStyle = 'rgba(236,218,180,0.7)'
    ctx.lineWidth = 8
    ctx.beginPath()
    for (let px = -OS; px <= W + OS; px += 40) {
      const wy = bY + Math.sin(px * 0.02 + t * 5) * 14
      if (px === -OS) ctx.moveTo(px, wy)
      else ctx.lineTo(px, wy)
    }
    ctx.stroke()
    // the shrinking funnel descends, sucking color up
    ART.funnel(ctx, 960, bY - 460, bY - 40, t, { wBase: 300 * (1 - drainU * 0.5), wTop: 30, sway: 40, spin: 2.6, dark: 'rgba(84,74,60,1)', light: 'rgba(116,102,84,1)', alpha: 0.5 })
    // debris of color pulled up across the boundary
    for (let i = 0; i < 18; i++) {
      const u = ((t * (0.7 + hash(i * 3) * 0.5) + hash(i * 7)) % 1)
      const px = 700 + hash(i * 5) * 520
      const py = bY + 60 - u * (220 + hash(i) * 160)
      ctx.globalAlpha = (1 - u) * 0.8
      ctx.fillStyle = ['#ff8a8a', '#ffcc2e', '#8fd460', '#7db0d7', '#f2b8cf'][i % 5]
      ctx.fillRect(px + Math.sin(u * 9 + i) * 20, py, 7, 7)
    }
    ctx.globalAlpha = 1
  } else if (g >= GROWTH_EV.drainEnd) {
    ctx.drawImage(S.bedroom, -OS, -OS)
  }
  // ---- the bedroom tail (sepia; fx grade kills the last color) ----
  if (g >= GROWTH_EV.drainEnd - 0.1) {
    // farmhands gathered left (the fantasy friends have real-world doubles)
    const hands = [
      { rig: S.scarecrowBase, x: 300, token: 'comb' },
      { rig: S.tinBase, x: 470, token: 'can' },
      { rig: S.lionBase, x: 640, token: 'tonic' },
    ]
    // the TRIPLE-TAKE pointer sweep: each pointed-at farmhand waves exactly his token
    const cues = { comb: GROWTH_EV.tripleTake + 0.6, can: GROWTH_EV.tripleTake + 1.4, tonic: GROWTH_EV.tripleTake + 2.2 }
    for (const hd of hands) {
      const cue = cues[hd.token]
      const waveU = seg(g, cue, cue + 1.0)
      const waving = waveU > 0 && waveU < 1
      shadow(ctx, hd.x, 962, 42, 0.26)
      sprite(ctx, hd.rig, hd.x, 962, { lift: [2, 0], stride: [1, 0], lean: waving ? -0.05 : 0.02, sx: 2.15, sy: 2.15 })
      if (waving) {
        ctx.strokeStyle = '#a07f64'
        ctx.lineWidth = 8
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(hd.x + 22, 852)
        ctx.lineTo(hd.x + 48, 810 + Math.sin(t * 8) * 12)
        ctx.stroke()
      }
      if (hd.token === 'comb') ART.comb(ctx, hd.x + (waving ? 52 : 26), waving ? 806 : 900, 0.3, 0.9)
      if (hd.token === 'can') {
        wateringCan(ctx, hd.x + (waving ? 56 : 30), waving ? 810 : 940, 1.2)
        medal(ctx, hd.x + (waving ? 56 : 30) + 4, (waving ? 810 : 940) + 12, 0.9)
      }
      if (hd.token === 'tonic') tonicBottle(ctx, hd.x + (waving ? 52 : 26), waving ? 806 : 938, 1.5, true)
    }
    // the balloon-cart huckster at the window winks exactly like FLOZ
    sprite(ctx, S.wizardBase, 300, 640, { lift: [2, 0], stride: [1, 0], sx: 1.35, sy: 1.35 })
    if (g >= GROWTH_EV.tripleTake + 2.6) ART.starGlint(ctx, 306, crownY(S.wizardBase, 640, 1.35) + 24, 26, seg(g, GROWTH_EV.tripleTake + 2.6, GROWTH_EV.tripleTake + 3.1))
    // a fifth farmhand in a suspicious blonde wig freezes when partially pointed at
    const wigU = seg(g, GROWTH_EV.tripleTake + 1.8, GROWTH_EV.tripleTake + 2.2)
    sprite(ctx, S.munchkins[2], 880, 962, { lift: [2, 0], stride: [1, 0], sx: 2.0, sy: 2.0 })
    ctx.fillStyle = '#d9c05a'
    ctx.beginPath()
    ctx.ellipse(880, crownY(S.munchkins[2], 962, 2.0) + 14, 20, 15, 0, 0, 7)
    ctx.fill()
    if (wigU > 0) {
      // one-frame freeze + sweat drop
      ctx.fillStyle = 'rgba(190,226,246,0.85)'
      const su = ((g * 1.2) % 1)
      ctx.beginPath()
      ctx.ellipse(906, crownY(S.munchkins[2], 962, 2.0) + 20 + su * 40, 4, 7, 0, 0, 7)
      ctx.fill()
    }
    // the hero in bed, sitting up; quilt painted over her lap
    const sit = E.outCubic(seg(g, GROWTH_EV.bedroom - 0.4, GROWTH_EV.bedroom + 0.4))
    sprite(ctx, S.dot, 1180, 905, { lift: [2, 0], stride: [1, 0], rot: -0.1 * (1 - sit), sx: 2.2, sy: 2.2 })
    ctx.fillStyle = '#8a6a48'
    ctx.beginPath()
    ctx.moveTo(1000, 900)
    ctx.lineTo(1420, 900)
    ctx.lineTo(1400, 990)
    ctx.lineTo(1020, 990)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#a0845c'
    ctx.fillRect(1000, 892, 420, 16)
    // Flowto leaps onto the bed (g8.2); the final YOU lands on his tail thump
    const leapU = seg(g, GROWTH_EV.flowtoLeap, GROWTH_EV.flowtoLeap + 0.5)
    if (leapU > 0) {
      const fx = lerp(980, 1330, leapU)
      const fy = 940 - Math.sin(cl(leapU) * Math.PI) * 190
      sprite(ctx, S.flowto, fx, Math.min(fy, 836), { rot: leapU < 1 ? -0.4 * (1 - leapU) : 0, sx: 1.6, sy: 1.6 })
      if (leapU >= 1) {
        const thump = Math.abs(Math.sin((g - GROWTH_EV.flowtoLeap - 0.5) * 6))
        ctx.save()
        ctx.translate(fx + 22, 838)
        ctx.rotate(-0.6 + thump * 0.2)
        ctx.strokeStyle = '#4a3220'
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.quadraticCurveTo(16, -12, 26, -4 - thump * 8)
        ctx.stroke()
        ctx.restore()
      }
    }
    // the ruby slippers wait on the floor beside the bed leg, in the visible band
    ctx.save()
    ctx.globalAlpha = 0.85
    ART.slipper(ctx, 962, 954, 0.62, 0.05)
    ART.slipper(ctx, 994, 954, 0.62, -0.05)
    ctx.restore()
    // the pointer arm sweeps the room
    const sweep = seg(g, GROWTH_EV.tripleTake, GROWTH_EV.tripleTake + 2.8)
    if (sweep > 0 && sweep < 1) {
      ctx.strokeStyle = '#9c8942'
      ctx.lineWidth = 9
      ctx.lineCap = 'round'
      const ax = 1180 - 10, ay = 780
      const tx = lerp(320, 900, sweep)
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.quadraticCurveTo((ax + tx) / 2, ay - 180, tx, 900)
      ctx.stroke()
    }
  }
  ctx.restore()
  // THE ONE RED ACCENT: the slipper glint rides the overlay, past the sepia grade —
  // but never past the end card (it used to sit on the black slate for ~0.35 s)
  if (overlay && g >= GROWTH_EV.redWink - 0.15 && g < Math.min(GROWTH_EV.redWink + 0.6, GROWTH_EV.endCard - 0.05)) {
    const wk = Math.sin(seg(g, GROWTH_EV.redWink - 0.15, GROWTH_EV.redWink + 0.6) * Math.PI)
    overlay.save()
    ART.starGlint(overlay, 978, 942, 20 * wk, wk, '#ff5a5a')
    ART.starGlint(overlay, 978, 942, 9 * wk, wk, '#ffd8d8')
    overlay.restore()
  }
  // ---- END CARD slate: the captions (e1_card / e1_credit / e2_tease) carry text ----
  if (g >= GROWTH_EV.endCard) {
    ctx.fillStyle = '#0a0806'
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    const inU = seg(g, GROWTH_EV.endCard, GROWTH_EV.endCard + 0.5)
    ctx.save()
    ctx.globalAlpha = inU * 0.9
    const gr = ctx.createRadialGradient(960, 470, 20, 960, 470, 640)
    gr.addColorStop(0, 'rgba(210,190,150,0.12)')
    gr.addColorStop(1, 'rgba(210,190,150,0)')
    ctx.fillStyle = gr
    ctx.fillRect(300, 0, 1320, 980)
    // gold rules + the sanctioned slipper motif in deep red
    ctx.strokeStyle = '#c9a45c'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(560, 320)
    ctx.lineTo(1360, 320)
    ctx.moveTo(560, 700)
    ctx.lineTo(1360, 700)
    ctx.stroke()
    ART.slipper(ctx, 960, 415, 1.4 * inU, -0.1)
    ART.starGlint(ctx, 960, 415, 40, (t * 0.8) % 1, '#c25858')
    ctx.restore()
  }
}

// ============================== the film ==============================
export default {
  title: 'THE WIZARD OF FLOZ',
  output: 'wizard-of-floz.mp4',
  duration: DUR,
  async prepare() {
    const load = async (id, far = false) => A.loadRemy(id, far)
    // heroes (casting.md repaint chains — every repaint returns { ...R, c, sil })
    S.dot = ART.dotify(await load(CAST.dot[0])) // ruby slippers (after the transfer)
    S.dotPlain = ART.dotify(await load(CAST.dot[0]), false) // Kansas shoes, pre-transfer
    S.flowto = ART.flowtify(await load(CAST.flowto[0], true))
    S.glinda = ART.glindify(await load(CAST.glinda[0]))
    S.witch = ART.witchify(await load(CAST.witch[0]))
    S.neighbor = await load(CAST.witch[0]) // the same bald head, pre-wig, for sepia Kansas
    S.wizard = ART.wizardify(await load(CAST.wizard[0]))
    S.wizardBase = await load(CAST.wizard[0]) // the S10 huckster double
    S.scarecrow = ART.scarecrowfy(await load(CAST.scarecrow[0]))
    S.scarecrowBase = await load(CAST.scarecrow[0])
    S.tinman = ART.tinnify(await load(CAST.tinman[0]))
    S.tinBase = await load(CAST.tinman[0])
    S.lion = ART.lionify(await load(CAST.lion[0]))
    S.lionBase = await load(CAST.lion[0])
    S.monkeys = [CAST.monkey1[0], CAST.monkey2[0], CAST.monkey3[0]].map((id) => load(id, true))
    S.monkeys = await Promise.all(S.monkeys)
    S.guards = await Promise.all([CAST.guard1[0], CAST.guard2[0]].map(async (id) => ART.guardify(await load(id))))
    S.munchkins = await Promise.all([
      [CAST.munchkin1[0], REPAINT[CAST.munchkin1[0]].petal],
      [CAST.munchkin2[0], REPAINT[CAST.munchkin2[0]].petal],
      [CAST.munchkin3[0], REPAINT[CAST.munchkin3[0]].petal],
      [CAST.munchkin4[0], REPAINT[CAST.munchkin4[0]].petal],
    ].map(async ([id, petal]) => ART.munchkinify(await load(id, true), petal)))
    const east = await load(CAST.eastFeet[0])
    S.eastFeet = ART.eastFeetBake(east) // native ruby — until the arc takes them
    S.eastFeetPlain = ART.eastFeetBake(east, true) // the shed pair, post-transfer
    // the GIANT HEAD of FLOZ from the heads atlas (casting spec: cell of 1264, k 12-16)
    S.giantHead = ART.giantHeadBake(await A.loadHeads())
    // sets
    S.farm = ART.farmBake()
    S.house = ART.houseBake()
    S.twisterRoom = ART.twisterRoomBake()
    S.doorRoom = ART.doorRoomBake()
    S.door = ART.doorBake()
    S.village = ART.villageBake()
    S.road = ART.roadBake()
    S.poppyOpen = ART.poppyBake('open')
    S.poppyBuds = ART.poppyBake('buds')
    S.gate = ART.gateBake()
    S.throne = ART.throneBake()
    S.forest = ART.forestBake()
    S.towerRoom = ART.towerRoomBake()
    S.courtyard = ART.courtyardBake()
    S.bedroom = ART.bedroomBake()
    S.meadow = ART.meadowBake()
    S.skywrite = ART.skywriteBake()
    S.horses = HORSE_PALS.map(ART.horseBake)
    // the composer's module, wired when it lands (stills run silent without it)
    try { const m = await import('./score.js'); scoreFn = m.score ?? m.default ?? null } catch { /* score.js not landed yet */ }
  },
  shots: SHOTS.map((sh) => ({
    name: sh.name,
    t0: sh.t0,
    t1: sh.t1,
    draw(ctx, lt, dur, t, overlay) {
      if (sh.name === 'kansas') drawKansas(ctx, lt, t)
      else if (sh.name === 'twister') drawTwister(ctx, lt, t)
      else if (sh.name === 'flozburst') drawFlozburst(ctx, lt, t, overlay)
      else if (sh.name === 'brickroad') drawBrickroad(ctx, lt, t)
      else if (sh.name === 'poppies') drawPoppies(ctx, lt, t)
      else if (sh.name === 'emerald') drawEmerald(ctx, lt, t)
      else if (sh.name === 'monkeys') drawMonkeys(ctx, lt, t)
      else if (sh.name === 'melt') drawMelt(ctx, lt, t)
      else if (sh.name === 'curtain') drawCurtain(ctx, lt, t)
      else if (sh.name === 'growth') drawGrowth(ctx, lt, t, overlay)
    },
    fx: (lt, t) => {
      const base = { letterbox: SAFE.letterbox, bloom: 0.1, bloomThresh: 0.9, vignette: 0.5, grain: 0.012 }
      if (sh.name === 'kansas') return { ...base, ...SEPIA, bloom: 0.08, grain: 0.03, weave: 0.14, vignette: 0.6 }
      if (sh.name === 'twister') return { ...base, ...SEPIA, bloom: 0.1, grain: 0.032, weave: 0.16, vignette: 0.62 }
      if (sh.name === 'flozburst') {
        // the burst: COLOR DETONATES ON THE CUT FRAME — sat JUMPS to 1.2 (the
        // timeline flash + bloom spend ~25% of it back), eases through the candy
        // overshoot, settled at 1.0 by g3.0 (story E6). The grade flips in the
        // SAME frame the draw flips (lt >= burst) — never one frame late.
        if (lt < FLOZBURST_EV.burst) return { ...base, ...SEPIA, bloom: 0.08, grain: 0.03, weave: 0.14, vignette: 0.6 }
        const u = seg(lt, FLOZBURST_EV.burst, FLOZBURST_EV.settled)
        const sat = lerp(1.2, 1, E.outCubic(u)) + 0.15 * Math.sin(u * Math.PI)
        return { ...base, sat, tint: [lerp(1.05, 1.02, u), lerp(0.98, 1.0, u), lerp(0.9, 0.99, u)], contrast: 1.06, bloom: 0.12, grain: 0.012, vignette: 0.5 }
      }
      if (sh.name === 'brickroad') return { ...base, sat: 1.1, bloom: 0.12, bloomThresh: 0.86, vignette: 0.44 }
      if (sh.name === 'poppies') return { ...base, sat: 1.08, bloom: 0.1, vignette: 0.42, haze: 0.07 }
      if (sh.name === 'emerald') return { ...base, sat: 1.06, bloom: 0.11, bloomThresh: 0.86, vignette: 0.5 }
      if (sh.name === 'monkeys') return { ...base, sat: 1.0, exposure: -0.04, bloom: 0.09, vignette: 0.55 }
      if (sh.name === 'melt') return { ...base, sat: 1.04, bloom: 0.1, vignette: 0.5 }
      if (sh.name === 'curtain') return { ...base, sat: 1.05, warm: 0.05, bloom: 0.11, bloomThresh: 0.87, vignette: 0.5 }
      if (sh.name === 'growth') {
        // the drain vacuums saturation top-down; full sepia from drainEnd
        const u = seg(lt, GROWTH_EV.drainStart, GROWTH_EV.drainEnd)
        if (u <= 0) return { ...base, sat: 1.06, bloom: 0.12, bloomThresh: 0.87, vignette: 0.46 }
        if (u < 1) return { ...base, sat: lerp(1.06, 0.03, E.outCubic(u)), tint: [1.05, 0.97, 0.8], bloom: 0.1, vignette: 0.52 }
        return { ...base, ...SEPIA, bloom: 0.08, grain: 0.03, weave: 0.14, vignette: 0.58 }
      }
      return base
    },
  })),
  captions: CAPTIONS, // single source of truth — re-exported from timeline.js
  captionStyles: {
    title: {
      font: 'Anton', size: 132, weight: '', color: '#f2dfa0', track: 2,
      shadow: '#050608', glow: '#8a6a24', glowBlur: 22,
    },
    sub: {
      size: 30, weight: 500, color: 'rgba(240,232,210,0.88)', track: 4,
      shadow: '#050608',
    },
    caption: {
      size: 40, weight: 600, color: '#ffffff',
      shadow: '#04070d', glow: '#241a10', glowBlur: 14,
    },
    kicker: {
      font: '"JetBrains Mono"', size: 26, weight: 700, color: '#d9c98f', track: 6,
      shadow: '#050608',
    },
  },
  flashes: FLASHES,
  score(kit) { if (scoreFn) return scoreFn(kit) }, // composer's module, wired when it lands
  audio: { seed: 1939, reverb: 2.4, reverbGain: 0.35 },
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } },
}
