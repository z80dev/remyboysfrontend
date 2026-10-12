// RAIDERS OF THE LOST HAIR — picture. 29 shots, 101.0 s, painted full-res stage
// (pirates-cabald lineage), sprites 2.2-2.7x nearest. Every frame a pure function
// of time: actors/blocking live on the film clock's WORLD g (warp(t).g, frozen
// through both hit-stops), effects age on REAL t so shake/flash/dust keep real
// time through the freezes. No Math.random, no Date, no state across frames;
// particle events are baked in prepare() at absolute film seconds.
import { W, H, hash, rng, E, F, txt, measure } from 'filmkit/lib.js'
import * as MOTION from 'filmkit/motion.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import { OS } from './art.js'
import {
  DURATION, SHOTS, SAFE, GROUNDS, CAPS, DRAWN, CAST, FLASHES, warp, filmT, clamp01,
  EV_S1, EV_TITLE, EV_S2, EV_S3, EV_S4, EV_S5, EV_S6,
  heroCorridorX, hairballGap, hairballX, hairballRot, hairballR, heroSkidX, heroExitX,
  CHASE, truckX, chaseGap, heroLeapY, heroDropY, heroDragY,
  SCISSORS, FLOW, spiralComb, WISP_X, STRANDS, strandAlignG, forkliftP, crateScale, crateX, crateY,
  STOP1_G, STOP2_G, STOPS,
} from './timeline.js'

const S = {}
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const GOLD = '#e8b23a'
// P2-2: T1 renders with the O of LOST omitted — the stage drops the golden
// toupee idol into the gap at full glyph size (the title's signature joke)
const TITLE_O_GAP = 'RAIDERS OF THE L  ST HAIR'

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
const flicker = (t, ph) => 0.72 + 0.18 * Math.sin(t * 11 + ph) + 0.1 * hash(Math.floor(t * 17) + ph * 10)

// torch flames + pools on the temple niches (world coords)
function templeTorches(ctx, t) {
  for (const [i, nx] of [300, 900, 2100, 2700].entries()) {
    const fl = flicker(t, i * 2)
    ART.glow(ctx, nx, 400, fl, { r: 240, a: 0.5 })
    ART.torchProp(ctx, nx, 402, 1.5, 1, t, { ph: i * 2 })
  }
}

// hero drawer: whip-repainted rig + fedora + (after g10.4) the boulder filament
function drawHero(ctx, x, feet, o = {}) {
  const sy = o.sy ?? 2.5
  sprite(ctx, S.hero, x, feet, { sy, sx: sy, ...o.pose })
  const flip = o.pose?.flip ? -1 : 1
  ART.fedora(ctx, x + flip * 2, crownY(S.hero, feet, sy) + 10 * sy * 0.35, sy * 0.6, { rot: o.hatRot ?? 0, flip: !!o.pose?.flip })
  if (o.filament) {
    ctx.strokeStyle = 'rgba(150,150,160,0.95)'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(x + flip * 26 * sy * 0.4, crownY(S.hero, feet, sy) + 14)
    ctx.quadraticCurveTo(x + flip * 40 * sy * 0.4, crownY(S.hero, feet, sy) + 4, x + flip * 52 * sy * 0.4, crownY(S.hero, feet, sy) + 16)
    ctx.stroke()
  }
}
// rival drawer: white suit + Panama
function drawRival(ctx, x, feet, o = {}) {
  const sy = o.sy ?? 2.55
  sprite(ctx, S.rival, x, feet, { sy, sx: sy, ...o.pose })
  if (o.panama !== false) {
    ART.panama(ctx, x + (o.pose?.flip ? -3 : 3), crownY(S.rival, feet, sy) + 8, sy * 0.58, { rot: o.hatRot ?? 0, flip: !!o.pose?.flip })
  }
}
function drawGoon(ctx, key, x, feet, o = {}) {
  const sy = o.sy ?? 2.4
  sprite(ctx, S.goons[key], x, feet, { sy, sx: sy, ...o.pose })
  if (o.hardhat) ART.hardHat(ctx, x, crownY(S.goons[key], feet, sy) + 6, sy * 0.55, { rot: o.hatRot ?? 0 })
}
// rope coils wrapped around a sprite torso
function ropeWraps(ctx, x, feet, sy, n = 4) {
  ctx.strokeStyle = '#b8955c'
  ctx.lineWidth = 5
  for (let i = 0; i < n; i++) {
    ctx.beginPath()
    ctx.ellipse(x, feet - (70 + i * 22) * sy * 0.4, 30 * sy * 0.4, 8 * sy * 0.4, 0, 0, 7)
    ctx.stroke()
  }
}

// truck: bake + live wheels, placed with its ground line at (gx, gy)
function drawTruck(ctx, gx, gy, s, o = {}) {
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.translate(gx, gy)
  if (o.rot) ctx.rotate(o.rot)
  ctx.scale(s, s)
  ctx.drawImage(S.truck, -ART.TRUCK.w / 2, -ART.TRUCK.h)
  ctx.restore()
  if (o.wheels !== false) {
    const spin = (o.scroll ?? 0) / ART.TRUCK.hubR / s
    for (const hub of ART.TRUCK.hubs) {
      const hx = gx + (hub.x - ART.TRUCK.w / 2) * s
      const hy = gy - (ART.TRUCK.h - hub.y) * s
      ctx.save()
      ctx.translate(hx, hy)
      ctx.fillStyle = '#181410'
      ctx.beginPath()
      ctx.arc(0, 0, ART.TRUCK.hubR * s, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#3c4048'
      ctx.beginPath()
      ctx.arc(0, 0, ART.TRUCK.hubR * 0.45 * s, 0, 7)
      ctx.fill()
      ctx.strokeStyle = '#5c626e'
      ctx.lineWidth = 5 * s
      for (let i = 0; i < 5; i++) {
        const a = spin + (i / 5) * 6.283
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * ART.TRUCK.hubR * 0.2 * s, Math.sin(a) * ART.TRUCK.hubR * 0.2 * s)
        ctx.lineTo(Math.cos(a) * ART.TRUCK.hubR * 0.42 * s, Math.sin(a) * ART.TRUCK.hubR * 0.42 * s)
        ctx.stroke()
      }
      ctx.restore()
    }
  }
}

// periodic road dust behind a moving contact point (no event list needed)
function rollDust(ctx, x, y, t, ph, n = 6, col = 'rgba(200,180,140,') {
  for (let i = 0; i < n; i++) {
    const u = ((t * 1.6 + i / n + ph) % 1)
    ctx.fillStyle = col + (0.3 * (1 - u)).toFixed(3) + ')'
    ctx.beginPath()
    ctx.arc(x - u * 120, y - u * 40 - 8, 6 + u * 18, 0, 7)
    ctx.fill()
  }
}

// ============================== S1 — THE TEMPLE ==============================

function drawS1a(ctx, lt, t) {
  ctx.fillStyle = '#0a0806'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  const k = 1.18 - 0.12 * cl(lt / 2)
  cam(ctx, k, 560 + 160 * cl(lt / 2), 560)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.temple, -OS, -OS)
  templeTorches(ctx, t)
  // drifting dust in the torchlight
  for (let i = 0; i < 14; i++) {
    const u = ((t * (0.05 + hash(i * 7) * 0.05) + hash(i * 3)) % 1)
    ctx.globalAlpha = 0.3 * Math.sin(u * Math.PI)
    ctx.fillStyle = '#d8c8a0'
    ctx.fillRect(200 + hash(i * 13) * 900, 200 + u * 640, 2.6, 2.6)
  }
  ctx.globalAlpha = 1
  // foreground cobwebs slide past the push (parallax)
  for (const wx of [430, 900]) {
    ctx.strokeStyle = 'rgba(210,205,190,0.3)'
    ctx.lineWidth = 2
    for (let i = 0; i < 5; i++) {
      const a = 0.5 + i * 0.5 + Math.sin(t + i) * 0.04
      ctx.beginPath()
      ctx.moveTo(wx - 700, -60)
      ctx.quadraticCurveTo(wx - 400 + Math.sin(t + i) * 8, 160, wx + Math.cos(a) * 180, 60 + Math.sin(a) * 160)
      ctx.stroke()
    }
  }
  // hero enters frame-left, eyes up
  if (t > EV_S1.enter.f) {
    const hx = lerp2(-120, 470, E.inQuad(cl((t - 0.4) / 1.5)))
    drawHero(ctx, hx, GROUNDS.s1, { pose: { ...walkCyc(t * 6.5), lean: 0.03 } })
  }
  ctx.restore()
}
const lerp2 = (a, b, u) => a + (b - a) * u

function drawS1b(ctx, lt, t) {
  ctx.fillStyle = '#0a0806'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 1.04, ART.CORR.alcoveX, 640)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.temple, -OS, -OS)
  templeTorches(ctx, t)
  // stone head on the pedestal column + the swap pantomime
  ART.stoneHead(ctx, ART.CORR.alcoveX, 646, 1, {})
  const ax = ART.CORR.alcoveX
  // hero crouch-walks in from screen-left
  const hx = lerp2(1060, 1330, E.outCubic(cl((t - 2.0) / 1.1)))
  const crouch = t < 3.2 ? { ...walkCyc(t * 5, 4), lean: 0.1 } : { lift: [2, 0], stride: [1, 0], lean: t > 5.3 && t < 5.6 ? 0.14 : 0.03 }
  drawHero(ctx, hx, GROUNDS.s1, { pose: crouch, sy: 2.4 })
  // idol lift g3.2 (two fingers, sparkle), sand-wig down g4.6, pat g5.4
  if (t >= EV_S1.idolLift.f && t < EV_S1.sandWigDown.f + 0.5) {
    const lift = t < EV_S1.sandWigDown.f ? E.outCubic(cl((t - 3.2) / 0.5)) : 1
    const carry = t >= EV_S1.idolLift.f && t < EV_S1.sandWigDown.f
    const ix = carry ? lerp2(ax, hx + 46, cl((t - 3.2) / 0.35)) : ax
    const iy = 326 - lift * 74 + (carry ? 46 : 0)
    ART.toupee(ctx, ix, iy, 1.15, { rot: Math.sin(t * 2) * 0.05 })
    ART.glint(ctx, ix, iy, 40, (t * 0.8) % 1)
  }
  if (t >= EV_S1.sandWigDown.f) {
    const down = E.outCubic(cl((t - 4.6) / 0.6))
    ART.toupee(ctx, ax, 326 - 74 + down * 74, 1.15, { sand: true })
    if (down >= 1 && t < EV_S1.pat.f + 1) ART.dustPuff(ctx, ax, 330, t - EV_S1.sandWigDown.f - 0.6, 0.5, 3, 6, 'rgba(200,180,140,')
  }
  if (t >= EV_S1.pat.f && t < EV_S1.pat.f + 0.5) {
    ART.glint(ctx, ax - 30, 400, 34, (t - EV_S1.pat.f) / 0.5)
  }
  if (t >= EV_S1.grin.f && t < EV_S1.grin.f + 0.4) {
    drawHero(ctx, hx, GROUNDS.s1 - Math.sin((t - EV_S1.grin.f) * 8) * 10, { pose: stand, sy: 2.4 })
  }
  ctx.restore()
}

function drawS1c(ctx, lt, t) {
  ctx.fillStyle = '#0a0806'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  const boom = t > EV_S1.subBoom.f ? 5 * Math.exp(-(t - EV_S1.subBoom.f) * 5) : 0
  const [shx, shy] = shakeXY(t, boom)
  cam(ctx, 2.0, ART.CORR.alcoveX, 560, shx, shy)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.temple, -OS, -OS)
  templeTorches(ctx, t)
  // ECU the head: ear grain g6.6, iris red g6.75
  ART.stoneHead(ctx, ART.CORR.alcoveX, 646, 1, {
    grain: cl((t - EV_S1.grain.f) / 0.4),
    iris: cl((t - EV_S1.irisRed.f) / 0.2),
  })
  // hero soft-focus foreground turns to the lens
  const turn = cl((t - EV_S1.grain.f + 0.1) / 0.3)
  ctx.save()
  ctx.globalAlpha = 0.92
  drawHero(ctx, ART.CORR.alcoveX + 260, 760, { pose: { lift: [2, 0], stride: [1, 0], lean: -0.06 * turn, flip: turn > 0.5 }, sy: 3.4 })
  ctx.restore()
  // red alert wash on the iris beat
  if (t > EV_S1.irisRed.f) {
    ctx.fillStyle = `rgba(200,40,20,${0.12 * cl((t - EV_S1.irisRed.f) / 0.2)})`
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  }
  ctx.restore()
}

function drawS1d(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#0a0806'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  const hx = heroCorridorX(g)
  cam(ctx, 1.0, hx + 300, 680)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.temple, -OS, -OS)
  templeTorches(ctx, t)
  // dandruff tiles pop ahead of him (analytic, real t)
  for (let i = 0; i < ART.TILES.length; i++) {
    const tl = ART.TILES[i]
    const popT = 7.5 + i * 0.34
    const age = t - popT
    if (age < 0) continue
    // hole: dark socket with a bright lower lip
    ctx.fillStyle = '#171008'
    ctx.fillRect(tl.x - 4, tl.y - 4, tl.w + 8, tl.h + 8)
    ctx.fillStyle = 'rgba(220,190,140,0.25)'
    ctx.fillRect(tl.x - 4, tl.y + tl.h + 2, tl.w + 8, 4)
    if (age < 0.9) {
      const fy = tl.y - 130 * age + 320 * age * age
      ctx.save()
      ctx.translate(tl.x + tl.w / 2 + age * 130, fy)
      ctx.rotate(age * 7)
      const tg = ctx.createLinearGradient(-tl.w / 2, -tl.h / 2, tl.w / 2, tl.h / 2)
      tg.addColorStop(0, '#cfc4a8')
      tg.addColorStop(1, '#8a7c5a')
      ctx.fillStyle = tg
      ctx.fillRect(-tl.w / 2, -tl.h / 2, tl.w, tl.h)
      ctx.restore()
      ART.dustPuff(ctx, tl.x + tl.w / 2, tl.y + tl.h / 2, age, 0.4, i, 4, 'rgba(190,170,130,')
    }
  }
  // the HAIRBALL fills the corridor mouth behind him
  const br = hairballR(g)
  ART.hairball(ctx, hairballX(g), GROUNDS.s1 - br * 0.72, br, hairballRot(g), t)
  // hero sprints AT camera
  drawHero(ctx, hx, GROUNDS.s1, {
    pose: { ...walkCyc(g * 13, 8), lean: 0.14 },
    filament: g >= EV_S1.filamentStick.f,
  })
  // speed streaks
  ctx.strokeStyle = 'rgba(220,200,160,0.12)'
  ctx.lineWidth = 3
  for (let i = 0; i < 6; i++) {
    const yy = 300 + i * 90 + Math.sin(t * 9 + i) * 14
    ctx.beginPath()
    ctx.moveTo(960 + ((t * 2200 + i * 400) % 2200) - 200, yy)
    ctx.lineTo(960 + ((t * 2200 + i * 400) % 2200) - 90, yy)
    ctx.stroke()
  }
  ctx.restore()
}

function drawS1e(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#9ed4f2'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  const pull = E.outCubic(cl((g - 12.0) / 2.4))
  cam(ctx, lerp2(1.5, 0.95, pull), lerp2(430, 1050, pull), 640)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.ridge, -OS, -OS)
  // hero bursts through the stone door and skids
  const hx = heroSkidX(g)
  if (g < 12.15) {
    ctx.fillStyle = 'rgba(240,225,180,0.7)'
    ctx.beginPath()
    ctx.ellipse(215, 860, 130 * cl((g - 12.0) / 0.15), 60, 0, 0, 7)
    ctx.fill()
  }
  if (g >= 12.0 && g < 13.1) {
    ART.dustPuff(ctx, hx + 40, 930, g - 12.0, 0.6, 11, 10, 'rgba(216,196,150,')
    ctx.fillStyle = 'rgba(150,120,70,0.4)'
    ctx.beginPath()
    ctx.ellipse(hx + 60, 940, 120, 12, 0, 0, 7)
    ctx.fill()
  }
  const skidding = g < 13.0
  drawHero(ctx, hx, GROUNDS.s1, { pose: skidding ? { lift: [6, 2], stride: [4, 0], lean: -0.16 } : stand, filament: true })
  // the Cabald fan-out (rival foreground-right, six goons with blowguns)
  if (g >= EV_S1.rivalReveal.f) {
    const rev = cl((g - EV_S1.rivalReveal.f) / 0.4)
    const bx = lerp2(2100, 1500, E.outCubic(rev))
    drawRival(ctx, bx, 962, { pose: { lift: [2, 0], stride: [1, 0], lean: -0.05, flip: true }, sy: 2.7 })
    // umbrella at the ready
    const open = g >= EV_S1.umbrella.f ? E.outBack(cl((g - EV_S1.umbrella.f) / 0.25)) : 0
    ART.umbrella(ctx, bx - 60, 962 - 150 * 2.7 * 0.55, 0.06, 1.15, open, t, { flip: true })
    if (g >= EV_S1.umbrella.f && g < EV_S1.umbrella.f + 0.3) ART.glint(ctx, bx - 190, 830, 70, (g - EV_S1.umbrella.f) / 0.3)
    // six goons fanned behind (4 cast + 2 deep reused, flipped, darker)
    const fan = [
      { k: 'foreman', x: 1210, f: 968, s: 2.2 },
      { k: 'smug', x: 1330, f: 988, s: 2.05 },
      { k: 'bruiser', x: 1660, f: 985, s: 2.3 },
      { k: 'weasel', x: 1780, f: 966, s: 2.15 },
      { k: 'smug', x: 1080, f: 950, s: 1.7, deep: true },
      { k: 'weasel', x: 1900, f: 948, s: 1.65, deep: true },
    ]
    for (const [i, gn] of fan.entries()) {
      const gx = lerp2(gn.x + 260, gn.x, E.outCubic(cl((g - EV_S1.rivalReveal.f - i * 0.06) / 0.5)))
      ctx.globalAlpha = gn.deep ? 0.82 : 1
      sprite(ctx, S.goons[gn.k], gx, gn.f, { lift: [2, 0], stride: [1, 0], lean: -0.04, sx: gn.s, sy: gn.s, flip: true })
      ART.blowgun(ctx, gx - 34, gn.f - 108 * gn.s * 0.4, -0.08 + Math.sin(g * 2 + i) * 0.02, gn.s * 0.8, g > EV_S1.darts[0].g)
      ctx.globalAlpha = 1
    }
    // darts: three analytic shots thunk a neat line at the hero's heels
    for (const [i, d] of EV_S1.darts.entries()) {
      const age = t - d.f
      const from = [1350 - i * 40, 830]
      const to = [hx + 60 + i * 46, 936]
      if (age > 0 && age < 0.14) {
        const u = age / 0.14
        ctx.strokeStyle = '#d8c8a0'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(lerp2(from[0], to[0], u - 0.1), lerp2(from[1], to[1], u - 0.1) - 20)
        ctx.lineTo(lerp2(from[0], to[0], u), lerp2(from[1], to[1], u))
        ctx.stroke()
      } else if (age >= 0.14) {
        ctx.strokeStyle = '#4a3620'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(to[0], to[1] - 26)
        ctx.lineTo(to[0] + 5, to[1] + 2)
        ctx.stroke()
        ctx.fillStyle = '#c9a468'
        ctx.fillRect(to[0] - 3, to[1] - 30, 7, 5)
        ART.dustPuff(ctx, to[0], to[1], age - 0.14, 0.4, 20 + i, 5, 'rgba(216,196,150,')
      }
    }
  }
  // hard daylight wash + heat shimmer base
  ctx.fillStyle = 'rgba(255,240,190,0.1)'
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  ctx.restore()
}

function drawS1f(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#9ed4f2'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 1.12, lerp2(1020, 1120, cl((g - 15.5) / 3)), 660)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.ridge, -OS, -OS)
  // rival holds the umbrella high like a rapier; canopy tip is the hat stand
  const bx = 1330
  const open = 1
  drawRival(ctx, bx, 946, {
    pose: { lift: [2, 0], stride: [1, 0], lean: g > EV_S1.rivalTip.f - 0.15 && g < EV_S1.rivalTip.f + 0.3 ? -0.12 : -0.04, flip: true },
    hatRot: g > EV_S1.rivalTip.f && g < EV_S1.rivalTip.f + 0.35 ? 0.3 : 0,
  })
  const ux = bx - 150, uy = 946 - 262
  const canopyX = bx - 64
  ART.umbrella(ctx, ux + 150, uy, 0.1, 1.2, open, t, { flip: true })
  // hero deadpan at umbrella-point
  let hx = 640
  if (g >= EV_S1.sprintOut.f) hx = heroExitX(g)
  const tipping = g > EV_S1.heroTip.f && g < EV_S1.heroTip.f + 0.35
  if (g < EV_S1.sprintOut.f || g < EV_S1.sprintOut.f + 0.7) {
    drawHero(ctx, hx, GROUNDS.s1, {
      pose: g >= EV_S1.sprintOut.f
        ? { ...walkCyc(g * 14, 8), lean: 0.16 }
        : { lift: [2, 0], stride: [1, 0], lean: tipping ? -0.14 : 0.02 },
      hatRot: tipping ? -0.35 : 0,
      filament: true,
    })
    if (g >= EV_S1.sprintOut.f) rollDust(ctx, hx, 940, t, 0.3, 5, 'rgba(216,196,150,')
  }
  // idol travels hero -> canopy at g16.4, then sits on the taut canopy
  if (t >= EV_S1.idolOnCanopy.f - 0.25 && t < EV_S1.sprintOut.f + 0.2) {
    const u = cl((t - (EV_S1.idolOnCanopy.f - 0.25)) / 0.25)
    const ix = lerp2(hx + 60, canopyX, u)
    const iy = lerp2(740, uy - 20, u) - Math.sin(u * Math.PI) * 60
    ART.toupee(ctx, ix, iy, 1.1, { rot: u * 0.4 - 0.2 })
    if (u >= 1) {
      const sits = t - EV_S1.idolOnCanopy.f
      ART.toupee(ctx, canopyX, uy - 22 + Math.sin(sits * 3) * 2, 1.1, {})
      if (sits < 0.3) ART.glint(ctx, canopyX, uy - 30, 44, sits / 0.3)
    }
  } else if (t >= EV_S1.idolOnCanopy.f + 0.2 && t < EV_S1.dartPuff.f + 1.2) {
    ART.toupee(ctx, canopyX, uy - 22 + Math.sin(t * 3) * 2, 1.1, {})
  }
  // the dart that puffs the spot he left
  if (g >= EV_S1.dartPuff.f) {
    ART.dustPuff(ctx, 700, 920, t - EV_S1.dartPuff.f, 0.6, 33, 12, 'rgba(216,196,150,')
    ctx.strokeStyle = '#4a3620'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(700, 906)
    ctx.lineTo(706, 934)
    ctx.stroke()
  }
  ctx.restore()
}

// ============================== TITLE (20-24) ==============================

function drawTitle(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#8fc8ec'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 0.8, 960, 620)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.ridge, -OS, -OS)
  ctx.restore()
  // the hairball silhouette trundles to a stop on the horizon behind the letters
  const hx = lerp2(1500, 1290, cl((g - 20.0) / 0.5))
  ART.hairball(ctx, hx, 742, 34, g * 1.4, t, 99)
  ctx.save()
  ctx.globalAlpha = 0.62
  ctx.fillStyle = '#3a3a48'
  ctx.beginPath()
  ctx.arc(hx, 742, 34, 0, 7)
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.strokeStyle = 'rgba(255,220,160,0.5)'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.arc(hx, 742, 33, -2.6, -1.2)
  ctx.stroke()
  ctx.restore()
  // the red line whips across the sky and writes the title (drawn ornament)
  if (g >= EV_TITLE.typeOn0.g) {
    const u = cl((g - EV_TITLE.typeOn0.g) / (EV_TITLE.typeOn1.g - EV_TITLE.typeOn0.g))
    const tipX = lerp2(130, 1790, E.outCubic(u))
    ctx.strokeStyle = '#c23a2e'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(130, 596)
    ctx.quadraticCurveTo((130 + tipX) / 2, 560 + Math.sin(u * 9) * 10 * (1 - u), tipX, 590 + Math.sin(u * 14) * 5 * (1 - u))
    ctx.stroke()
    // whip-curl tip
    ctx.beginPath()
    ctx.arc(tipX - 10, 585 + Math.sin(u * 14) * 5 * (1 - u), 9 * (1 - u) + 2, -1, 3.6)
    ctx.stroke()
  }
  // P2-2 the toupee-O title gag: T1 renders with the O of LOST OMITTED (see the
  // captions map), so nothing on the overlay can paint over the gap — the stage
  // drops a FULL-GLYPH-SIZE golden toupee into it at g21.6.
  if (g >= EV_TITLE.typeOn0.g) {
    ctx.font = `132px Anton`
    ctx.letterSpacing = '2px'
    const total = measure(ctx, TITLE_O_GAP, 132, 'Anton', 2)
    const pre = measure(ctx, 'RAIDERS OF THE L ', 132, 'Anton', 2)
    const gapW = measure(ctx, ' ', 132, 'Anton', 2)
    ctx.letterSpacing = '0px'
    const ox = 960 - total / 2 + pre + gapW / 2
    const s = 1.6 // full cap-height: the idol sits on the type like a letterform
    // the missing O reads for a beat after the type-on completes (the setup)…
    if (g >= EV_TITLE.typeOn1.g && g < EV_TITLE.oDrop.g) {
      ctx.fillStyle = 'rgba(90,58,10,0.28)'
      ctx.beginPath()
      ctx.ellipse(ox, 528, gapW * 0.34, 42, 0, 0, 7)
      ctx.fill()
    }
    // …then the idol drops in and sits as the O (the punch)
    if (g >= EV_TITLE.oDrop.g) {
      const u = cl((g - EV_TITLE.oDrop.g) / 0.38)
      const bounce = u < 0.7 ? E.outCubic(u / 0.7) : 1 - Math.sin((u - 0.7) / 0.3 * Math.PI) * 0.12
      const oy = lerp2(310, 512, bounce)
      ctx.fillStyle = 'rgba(60,38,6,0.4)'
      ctx.beginPath()
      ctx.ellipse(ox, 548, s * 40, 9, 0, 0, 7)
      ctx.fill()
      ART.toupee(ctx, ox, oy, s, { rot: Math.sin(u * 9) * 0.25 * (1 - u) })
      if (u >= 1 && g - (EV_TITLE.oDrop.g + 0.38) < 0.5) ART.dustPuff(ctx, ox, 545, g - (EV_TITLE.oDrop.g + 0.38), 0.4, 5, 5, 'rgba(255,236,180,')
      if (u >= 1) ART.glint(ctx, ox, 496, 46, ((g - EV_TITLE.oDrop.g) * 0.7) % 1)
    }
  }
}

// ============================== S2 — BRIEFING + MAP ==============================

function drawS2a(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#3a2e20'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, lerp2(1.0, 1.09, cl(lt / 4)), lerp2(860, 990, cl(lt / 4)), 560)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.hall, -OS, -OS)
  // warm hall light
  ART.glow(ctx, 640, 170, 0.9, { r: 260, a: 0.16, })
  // C3 drawn in chalk on the board (squeak-synced type-on), low on the board
  // clear of the baked hairglyph rows
  const c3 = DRAWN.find((d) => d.id === 'C3')
  const chars = Math.floor(c3.text.length * cl((g - c3.g0) / 1.8))
  const shown = c3.text.slice(0, chars)
  ctx.save()
  ctx.translate(1180, 566)
  ctx.rotate(-0.015)
  txt(ctx, shown, 0, 0, { size: 40, font: F.grot, weight: 700, color: 'rgba(238,242,234,0.94)', align: 'center', base: 'middle', track: 2 })
  ctx.restore()
  // chalk dust at the writing tip + squeak glint
  if (g >= c3.g0 && chars < c3.text.length) {
    const wShown = measure(ctx, shown, 40, F.grot, 2, 700)
    ART.dustPuff(ctx, 1180 + wShown / 2, 566, ((g * 3) % 0.3), 0.3, 8, 3, 'rgba(238,242,234,')
    if (Math.sin(g * 30) > 0.6) ART.glint(ctx, 1180 + wShown / 2, 558, 20, (g * 2) % 1)
  }
  // chalk circle around the scalp diagram at g26
  if (g >= EV_S2.chalkCircle.g) {
    const cu = cl((g - EV_S2.chalkCircle.g) / 1.0)
    ctx.strokeStyle = 'rgba(238,242,234,0.85)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.ellipse(1350, 410, 118, 132, 0.08, -1.2, -1.2 + cu * 6.6)
    ctx.stroke()
  }
  // hero at the lectern, chalk hand out
  drawHero(ctx, 470, GROUNDS.s2, { pose: { lift: [2, 0], stride: [1, 0], lean: g > c3.g0 && chars < c3.text.length ? -0.12 : 0.03 } })
  ctx.fillStyle = '#f2f2ea'
  ctx.fillRect(585, 700, 10, 10)
  // colleagues at their seats + sleeping student heads (synchronized droop wave)
  for (const [i, col] of [S.copper, S.gold].entries()) {
    const x = i === 0 ? 170 : 1800
    const droop = cl((g - EV_S2.sleepWave.g - i * 0.18) / 0.5) * (i === 1 ? 0 : 1)
    sprite(ctx, col.rig, x, 920, { lift: [2, 0], stride: [1, 0], lean: 0.05 + droop * 0.3, sx: 2.15, sy: 2.15 })
  }
  // sleeping student heads, seated ON the baked desks (synchronized droop wave)
  const heads = [[1150, 908, 382], [1330, 906, 48], [1700, 898, 39]]
  for (const [i, [hx2, hy2, id]] of heads.entries()) {
    const droop = cl((g - EV_S2.sleepWave.g - i * 0.14) / 0.6)
    const swoon = i === 3 ? E.outBack(cl((g - EV_S2.swooner.g) / 0.4)) : 0
    ctx.save()
    ctx.translate(hx2, hy2)
    ctx.rotate(droop * 0.9 - swoon * 0.25)
    ctx.fillStyle = '#3c2c1c'
    ctx.beginPath()
    ctx.ellipse(0, -14, 40, 14, 0, 0, 7)
    ctx.fill()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.headIcon(id, 3), -24, -58)
    if (i === 3 && swoon > 0) {
      // the swooner: bolt upright, chin on fists, hearts
      ctx.strokeStyle = '#3c2c1c'
      ctx.lineWidth = 7
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-12, 2)
      ctx.lineTo(-12, -34)
      ctx.moveTo(12, 2)
      ctx.lineTo(12, -34)
      ctx.stroke()
      ctx.fillStyle = '#3c2c1c'
      ctx.beginPath()
      ctx.arc(-12, -30, 8, 0, 7)
      ctx.arc(12, -30, 8, 0, 7)
      ctx.fill()
      if (Math.sin(t * 2.4) > 0) {
        ctx.globalAlpha = Math.sin(t * 2.4)
        txt(ctx, '<3', 22, -74 - ((t * 30) % 30), { size: 24, font: F.grot, weight: 700, color: '#e87a9a', align: 'left' })
        ctx.globalAlpha = 1
      }
    } else if (droop >= 1) {
      // Z zzz once asleep
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 3 + i)
      txt(ctx, 'z', 18, -70 - ((t * 20 + i * 30) % 26), { size: 22, font: F.grot, weight: 700, color: '#e8e4d8', align: 'left' })
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }
  // nameplates for the colleagues (reading size, inside the band; kept clear of the 1.09 camera push)
  for (const [x, label] of [[210, 'DR. COPPER FLOW'], [1720, 'DR. GOLD FLOW']]) {
    ctx.fillStyle = 'rgba(20,14,8,0.75)'
    ctx.fillRect(x - 110, 926, 220, 32)
    txt(ctx, label, x, 942, { size: 18, font: F.mono, weight: 700, color: '#d9c98f', align: 'center', base: 'middle', track: 1 })
  }
  ctx.restore()
}

function drawS2b(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#33281a'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  const idx = g < EV_S2.panels[1].g ? 0 : g < EV_S2.panels[2].g ? 1 : 2
  const local = (g - (idx === 0 ? 28.0 : EV_S2.panels[idx].g))
  const centers = [430, 960, 1490]
  cam(ctx, 1.34 + 0.05 * cl(local / 1.0), centers[idx], 520)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.frieze, -OS, -OS)
  ctx.restore()
  // P3's lid slams at g30.4 (drawn live over the baked open lid gap)
  if (idx === 2) {
    const slam = cl((g - EV_S2.panels[2].g) / 0.15)
    const lidY = lerp2(120, 0, E.inQuad(slam))
    ctx.save()
    ctx.translate(1490, 500 + lidY)
    ctx.fillStyle = '#d2bd8c'
    ctx.fillRect(-120, -20, 240, 26)
    ctx.fillStyle = '#a8905e'
    ctx.fillRect(-120, 2, 240, 8)
    ctx.restore()
    if (g >= EV_S2.lidThud.g) {
      const age = g - EV_S2.lidThud.g
      const [shx, shy] = shakeXY(t, 7 * Math.exp(-age * 6))
      ctx.save()
      ctx.translate(shx, shy)
      ctx.restore()
      ART.dustPuff(ctx, 1490, 560, age, 0.7, 12, 12, 'rgba(200,180,140,')
      ctx.strokeStyle = `rgba(255,240,200,${0.5 * Math.exp(-age * 4)})`
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.ellipse(1490, 540, 60 + age * 300, (60 + age * 300) * 0.3, 0, 0, 7)
      ctx.stroke()
    }
  }
  // panel label (carved dark ink, reading size)
  const labels = ['I. THE GIFTING', 'II. THE CARRYING', 'III. THE SEALING']
  txt(ctx, labels[idx], 960, 918, { size: 30, font: F.serif, weight: 700, color: '#e8d8ac', align: 'center', track: 4, shadow: '#181008' })
}

function drawS2c(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#d5c191'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  cam(ctx, 1.0, 960, 540)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.map, -OS, -OS)
  ctx.restore()
  // route arc-length table (built once, pure)
  const pos = routePos(cl((g - EV_S2.planeIn.g) / 3.1))
  // the red contrail IS the travel line
  if (g >= EV_S2.planeIn.g) {
    ctx.strokeStyle = '#c23a2e'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.setLineDash([])
    ctx.beginPath()
    const n = Math.max(2, Math.floor(routeTable.len * cl((g - EV_S2.planeIn.g) / 3.1) / 14))
    for (let i = 0; i <= n; i++) {
      const p = routePos(cl((g - EV_S2.planeIn.g) / 3.1) * (i / n))
      i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])
    }
    ctx.stroke()
    // the tiny plane at the head of its own contrail
    const ahead = routePos(cl((g - EV_S2.planeIn.g + 0.012) / 3.1))
    const ang = Math.atan2(ahead[1] - pos[1], ahead[0] - pos[0])
    ctx.save()
    ctx.translate(pos[0], pos[1])
    ctx.rotate(ang)
    ctx.fillStyle = '#d8d2c0'
    ctx.beginPath()
    ctx.ellipse(0, 0, 26, 9, 0, 0, 7)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-4, -4)
    ctx.lineTo(-30, -22)
    ctx.lineTo(-10, -2)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-4, 4)
    ctx.lineTo(-30, 22)
    ctx.lineTo(-10, 2)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(16, 0)
    ctx.lineTo(34, -14)
    ctx.lineTo(22, 2)
    ctx.closePath()
    ctx.fill()
    // spinning prop
    ctx.strokeStyle = 'rgba(60,50,40,0.8)'
    ctx.lineWidth = 3
    const pr = 14 * Math.abs(Math.sin(t * 40))
    ctx.beginPath()
    ctx.moveTo(28, -pr)
    ctx.lineTo(28, pr)
    ctx.stroke()
    ctx.restore()
    // motor blat puffs
    ART.dustPuff(ctx, pos[0] - 30, pos[1] + 4, ((t * 2.4) % 0.4), 0.4, 9, 3, 'rgba(240,236,220,')
  }
  // stop-ticks pop the mini head markers (one in a fedora, one in a Panama)
  for (const [i, m] of ART.MAP_MARKS.entries()) {
    const tick = EV_S2.stopTicks[i]
    if (g < tick.g) continue
    const pop = E.outBack(cl((g - tick.g) / 0.35))
    ctx.save()
    ctx.translate(m.x, m.y - 26)
    ctx.scale(pop, pop)
    ctx.fillStyle = '#c23a2e'
    ctx.beginPath()
    ctx.arc(0, 22, 7, 0, 7)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(0, 26)
    ctx.lineTo(-5, 40)
    ctx.lineTo(5, 40)
    ctx.closePath()
    ctx.fill()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.headIcon(m.head, 3), -24, -26)
    if (m.hat === 'fedora') ART.fedora(ctx, 0, -18, 0.62, {})
    if (m.hat === 'panama') ART.panama(ctx, 0, -18, 0.6, {})
    ctx.restore()
    if (g - tick.g < 0.5) ART.glint(ctx, m.x, m.y - 30, 40, (g - tick.g) / 0.5)
  }
  // chapter plate frame
  ctx.strokeStyle = 'rgba(40,28,12,0.8)'
  ctx.lineWidth = 26
  ctx.strokeRect(8, 8, W - 16, H - 16)
}

// route sampling over MAP_ROUTE (pure; table built once at module load)
const routeTable = (() => {
  const pts = ART.MAP_ROUTE
  const segs = []
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    segs.push({ a: pts[i - 1], b: pts[i], l, s: len })
    len += l
  }
  return { pts, segs, len }
})()
function routePos(u) {
  const d = u * routeTable.len
  for (const sgm of routeTable.segs) {
    if (d <= sgm.s + sgm.l) {
      const f = (d - sgm.s) / sgm.l
      return [lerp2(sgm.a[0], sgm.b[0], f), lerp2(sgm.a[1], sgm.b[1], f)]
    }
  }
  return routeTable.pts[routeTable.pts.length - 1]
}

// ============================== S3 — DIG + TRUCK CHASE ==============================

function drawS3a(ctx, lt, t) {
  const g = warp(t).g
  ctx.fillStyle = '#7a4452'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  // punch-in on the foreman's helmet at the end
  const punch = cl((g - 38.9) / 0.6)
  cam(ctx, lerp2(1.0, 1.5, E.outCubic(punch)), lerp2(960, 1420, E.outCubic(punch)), lerp2(620, 640, punch))
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.dig, -OS, -OS)
  // lamp glows
  for (const lx of [560, 1360]) ART.glow(ctx, lx + 60, 500, flicker(t, lx), { r: 180, a: 0.4 })
  // the ark half-unearthed in the trench (vanishes inside the photo flash —
  // P1-2: the goons are brushing an empty pit once it is stolen)
  if (g < EV_S3.flash.g) {
    ctx.save()
    ctx.translate(960, 905)
    ctx.rotate(0.08)
    ART.ark(ctx, 0, 40, 0.9, { t })
    ctx.restore()
  }
  ctx.fillStyle = '#7a5430'
  ctx.beginPath()
  ctx.ellipse(960, 940, 190, 40, 0, 0, Math.PI, false)
  ctx.fill()
  // parked convoy truck (right)
  drawTruck(ctx, 1660, 940, 0.8, { scroll: 0 })
  // goons kneel brushing the ark (toothbrushes)
  if (g >= EV_S3.brushing.g) {
    for (const [i, k] of ['smug', 'weasel'].entries()) {
      const gx = 820 + i * 280
      sprite(ctx, S.goons[k], gx, 925, { lift: [2, 0], stride: [1, 0], lean: 0.22, sx: 2.1, sy: 2.1 })
      const scrub = Math.sin(t * 12 + i * 2) * 8
      ctx.strokeStyle = '#e8e4d8'
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(gx + 30, 830)
      ctx.lineTo(gx + 52 + scrub, 800)
      ctx.stroke()
      ctx.fillStyle = '#c9c2b0'
      ctx.fillRect(gx + 46 + scrub, 790, 16, 8)
    }
  }
  // foreman lines them up for the group portrait (camera box up)
  if (g >= EV_S3.lineup.g) {
    drawGoon(ctx, 'foreman', 1330, 938, { hardhat: true, hatRot: punch > 0.25 ? punch * 1.15 : 0, pose: { lift: [2, 0], stride: [1, 0], lean: -0.06 } })
    // box camera on a stub tripod
    ctx.fillStyle = '#2c2620'
    ctx.fillRect(1372, 780, 56, 44)
    ctx.fillStyle = '#181410'
    ctx.beginPath()
    ctx.arc(1400, 802, 12, 0, 7)
    ctx.fill()
    ctx.strokeStyle = '#3a3226'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(1400, 824)
    ctx.lineTo(1400, 900)
    ctx.moveTo(1400, 860)
    ctx.lineTo(1370, 910)
    ctx.moveTo(1400, 860)
    ctx.lineTo(1430, 910)
    ctx.stroke()
    // flash cone just before the pop
    if (g > EV_S3.flash.g - 0.15 && g < EV_S3.flash.g) {
      ctx.fillStyle = `rgba(255,250,230,${0.25 + 0.3 * (g - (EV_S3.flash.g - 0.15)) / 0.15})`
      ctx.beginPath()
      ctx.moveTo(1412, 800)
      ctx.lineTo(1100, 700)
      ctx.lineTo(1100, 900)
      ctx.closePath()
      ctx.fill()
    }
    // foreman turns on the theft
    if (g > 39.3) {
      sprite(ctx, S.goons.foreman, 1330, 938, { lift: [2, 0], stride: [1, 0], lean: 0.1, sx: 2.4, sy: 2.4, flip: true })
      ART.hardHat(ctx, 1330, crownY(S.goons.foreman, 938, 2.4) + 6, 2.4 * 0.55, { rot: punch * 1.2, flip: true })
    }
  }
  // P1-1 the photo-flash theft. One overexposed frame: white ramps 37.95-38.03,
  // HOLDS >= 0.9 through 38.18 (~9 frames @60), decays by 38.63. The thief and
  // his Ark spawn INSIDE the white (ghosted through it), then resolve as it
  // clears — revealing the trench empty behind the oblivious goons.
  const flashK = g < 37.95 ? 0
    : g < 38.03 ? 0.95 * cl((g - 37.95) / 0.08)
    : g < 38.18 ? 0.95
    : Math.max(0, 0.95 * (1 - (g - 38.18) / 0.45))
  const drawThief = (alpha) => {
    ctx.save()
    ctx.globalAlpha = alpha
    let hx3 = 330
    if (t >= EV_S3.flash.f) hx3 = lerp2(330, 1420, E.inQuad(cl((t - EV_S3.flash.f) / (EV_S3.heaveDone.f - EV_S3.flash.f))))
    if (t >= 39.25) hx3 = lerp2(1420, 2050, E.inQuad(cl((t - 39.25) / 0.25)))
    drawHero(ctx, hx3, 930, { pose: { ...walkCyc(t * 12, 7), lean: 0.12 }, filament: true, sy: 2.3 })
    if (t >= 39.25) rollDust(ctx, hx3 - 30, 940, t, 0.6, 5, 'rgba(190,170,130,')
    // fake mustache (dark silhouette detail, director ruling) — tips off like a hat
    if (t < EV_S3.mustacheTip.f) {
      ART.mustache(ctx, hx3 + 4, crownY(S.hero, 930, 2.3) + 66 * 2.3 * 0.4 + 20, 2.3 * 0.5)
    } else if (t < EV_S3.mustacheTip.f + 0.6) {
      const mu = cl((t - EV_S3.mustacheTip.f) / 0.6)
      ART.mustache(ctx, 1424 + mu * 60, crownY(S.hero, 930, 2.3) + 40 - mu * 30, 2.3 * 0.5, mu * 6)
    }
    // the ark: carried, then the heave arcs onto the flatbed — and STAYS there
    if (t >= EV_S3.heaveDone.f - 0.25) {
      const hu = cl((t - (EV_S3.heaveDone.f - 0.25)) / 0.25)
      const ax2 = lerp2(1360, 1284, hu)
      const ay2 = lerp2(760, 794, hu) - Math.sin(hu * Math.PI) * 110
      ART.ark(ctx, ax2, ay2, 0.72, {
        rot: Math.sin(hu * 9) * 0.3 * (1 - hu) + (hu >= 1 ? Math.sin((t - EV_S3.heaveDone.f) * 12) * 0.06 * Math.exp(-(t - EV_S3.heaveDone.f) * 3) : 0),
        ropes: hu >= 1, t,
      })
      if (hu >= 1 && t - EV_S3.heaveDone.f < 0.4) ART.dustPuff(ctx, 1284, 800, t - EV_S3.heaveDone.f, 0.4, 14, 6, 'rgba(190,170,130,')
    } else {
      ART.ark(ctx, hx3 + 40, crownY(S.hero, 930, 2.3) + 60, 0.72, { rot: 0.3, t })
    }
    ctx.restore()
  }
  if (t >= EV_S3.flash.f && t < 39.5) drawThief(1)
  // the overexposed frame itself, with the thief ghosting through the white
  if (flashK > 0) {
    ctx.fillStyle = `rgba(255,250,240,${flashK.toFixed(3)})`
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    if (flashK > 0.5 && t < 38.8) drawThief(0.3 * cl((flashK - 0.5) / 0.45))
  }
  ctx.restore()
}

// desert chase stage shared by s3b/s3c/s3e. Painted in WORLD coords — fills span
// the whole camera window (cams pan to x 1620+), never just the 1920 screen.
function desertStage(ctx, t, scroll, truckS, truckCx) {
  ctx.fillStyle = '#8fc8ec'
  ctx.fillRect(-2400, -30, 6800, H + 60)
  ctx.imageSmoothingEnabled = true
  // far dunes (slow parallax)
  const o1 = -(((scroll * 0.3) % 2600) + 2600) % 2600
  for (let ox2 = o1 - 2600; ox2 < 4400; ox2 += 2600) ctx.drawImage(S.dunesFar, ox2, 620 - 760)
  // near dunes (fast parallax)
  const o2 = -(((scroll * 0.7) % 2600) + 2600) % 2600
  for (let ox2 = o2 - 2600; ox2 < 4400; ox2 += 2600) ctx.drawImage(S.dunesNear, ox2, 930 - 560)
  // road band + dashes at full speed
  const rg = ctx.createLinearGradient(0, 900, 0, 1010)
  rg.addColorStop(0, '#b89868')
  rg.addColorStop(0.5, '#a8875a')
  rg.addColorStop(1, '#8a6c42')
  ctx.fillStyle = rg
  ctx.fillRect(-2400, 900, 6800, 200)
  ctx.fillStyle = 'rgba(60,44,24,0.5)'
  ctx.fillRect(-2400, 900, 6800, 5)
  const dashO = -(((scroll % 300)) + 300) % 300
  ctx.fillStyle = 'rgba(240,228,190,0.5)'
  for (let dx2 = dashO - 2400; dx2 < 4400; dx2 += 300) ctx.fillRect(dx2, 952, 130, 8)
  rollDust(ctx, truckCx - 480 * truckS, 950, t, 0.1, 8)
}

function drawS3b(ctx, lt, t) {
  const g = warp(t).g
  const scroll = truckX(g) - truckX(39.5)
  cam(ctx, 1.0, 960, 600)
  desertStage(ctx, t, scroll, 0.9, 900)
  // convoy pulls out; the driver reads COMB WEEKLY, never looks up
  const tx = lerp2(700, 2000, E.inQuad(cl((g - 39.5) / 1.4)))
  drawTruck(ctx, tx, 940, 0.9, { scroll: scroll * 0.9 })
  // P1-3 the heaved Ark rides the flatbed — lying, roped — through to the s3c cut
  ART.ark(ctx, tx - 452, 790, 0.72, { rot: -1.42 + Math.sin(t * 7) * 0.02, ropes: true, t })
  if (tx < 1900) {
    sprite(ctx, S.goons.weasel, tx + 252, 810, { lift: [1, 1], stride: [0, 0], lean: 0.06, sx: 1.25, sy: 1.25 })
    ART.magazine(ctx, tx + 268, 700, 0.8, {})
  }
  // two goons mount horses, pursuing their own truck
  for (const [i, k] of ['smug', 'bruiser'].entries()) {
    const hx4 = 60 + i * 220 + (g - 39.8) * 150
    if (hx4 > -300 && hx4 < 2000) {
      const sad = ART.horse(ctx, hx4, 948, 1.0, g * 3.4 + i * 0.4, { gallop: 0.85, col: i ? '#4c3620' : '#6e4a2c' })
      sprite(ctx, S.goons[k], hx4 - 10, sad.saddleY + 8, { lift: [3, 1], stride: [2, -2], lean: 0.1, sx: 1.5, sy: 1.5 })
    }
  }
  // hero whistles; his horse enters frame-right and slides to a stop beside him
  if (g >= EV_S3.whistle.g && g < EV_S3.vault.g + 0.1) {
    drawHero(ctx, 180, 948, { pose: { lift: [2, 0], stride: [1, 0], lean: -0.06 }, filament: true, sy: 2.3 })
    txt(ctx, '~', 236, crownY(S.hero, 948, 2.3) - 10 + Math.sin(t * 9) * 4, { size: 44, font: F.grot, weight: 700, color: 'rgba(255,255,255,0.85)', align: 'left' })
  }
  if (g >= 40.6) {
    const hxp = g < 41.0 ? lerp2(2100, 430, E.outCubic(cl((g - 40.6) / 0.28)))
      : lerp2(430, 2300, E.inQuad(cl((g - 41.0) / 1.3)))
    const sad = ART.horse(ctx, hxp, 948, 1.05, g * 4.2, { gallop: 1, col: '#5c3c24' })
    rollDust(ctx, hxp - 60, 952, t, 0.5, 6)
    if (g >= EV_S3.vault.g) {
      const v = cl((g - EV_S3.vault.g) / 0.2)
      const vx = lerp2(180, hxp - 12, E.outCubic(v))
      const vy = lerp2(948, sad.saddleY + 10, E.outCubic(v)) - Math.sin(v * Math.PI) * 90
      drawHero(ctx, vx, vy, { pose: { lift: [6, 3], stride: [2, -2], lean: v >= 1 ? 0.14 : 0.08 }, filament: true, sy: 2.3 })
    }
  }
  ctx.restore()
}

function drawS3c(ctx, lt, t) {
  const { g, stop } = warp(t)
  cam(ctx, stop ? lerp2(1.0, 1.14, stop.sl / stop.d) : 1.0, 1650, 640)
  desertStage(ctx, t, truckX(g) - truckX(39.5), 1.13, 1560)
  // truck bounces on the road; at s 1.13 the bonnet nose top sits at y 660 —
  // exactly heroLeapY's landing height, so the leap lands ON the hood
  const bump = Math.sin(t * 22) * 3
  drawTruck(ctx, 1560, 920 + bump, 1.13, { scroll: (truckX(g) - truckX(39.5)) * 1.13, rot: Math.sin(t * 5) * 0.008 })
  // ark roped upright on the flatbed (deck world y ~705)
  ART.ark(ctx, 1187, 712, 0.85, { ropes: true, t, rot: -0.03 + Math.sin(t * 5) * 0.02 })
  // the driver still reading (seated at the wheel, head in the window)
  sprite(ctx, S.goons.weasel, 1780, 762 + bump, { lift: [1, 1], stride: [0, 0], lean: 0.06, sx: 1.4, sy: 1.4 })
  ART.magazine(ctx, 1796, 655, 0.95, {})
  // hero rides in low on the horse before the leap
  if (g < CHASE.leap - 0.05 && g >= 42.5) {
    const inX = lerp2(1400, 1900, cl((g - 42.5) / 0.5))
    const sad = ART.horse(ctx, inX, 948, 1.4, g * 4.4, { gallop: 1, col: '#5c3c24' })
    rollDust(ctx, inX - 80, 952, t, 0.2, 7)
    drawHero(ctx, inX - 14, sad.saddleY + 12, { pose: { lift: [5, 2], stride: [2, -2], lean: 0.12 }, filament: true, sy: 2.05 })
  }
  // the horse: under the leap, then falling behind after the landing
  if (g >= CHASE.leap && g < 46.2) {
    const leapU = cl((g - CHASE.leap) / 0.5)
    const behind = g < CHASE.land ? lerp2(1900, 2060, leapU) : 2060 - (g - CHASE.land) * 620
    if (behind > -300) ART.horse(ctx, behind, 948, 1.35, g * 4.4, { gallop: 1, col: '#5c3c24' })
  }
  // THE LEAP horse -> hood (g43.0-43.5): heroLeapY lands his feet on the nose top
  if (g >= CHASE.leap - 0.1 && g < CHASE.land) {
    const u = cl((g - CHASE.leap) / 0.5)
    drawHero(ctx, lerp2(1900, 2149, u), heroLeapY(g), { pose: { lift: [6, 3], stride: [2, -2], lean: 0.14 }, filament: true, sy: 2.3 })
  } else if (g >= CHASE.land && g < EV_S3.dropToRoad.f) {
    const slid = cl((g - EV_S3.release1.g) / 0.42)
    drawHero(ctx, lerp2(2140, 2205, slid), 660, {
      pose: { lift: [4, 2], stride: [1, -1], lean: -0.1 + Math.sin(g * 16) * 0.05 }, filament: true, sy: 2.3,
    })
    // the goon on the hood with the wrench
    sprite(ctx, S.goons.bruiser, 2030, 686, { lift: [3, 1], stride: [2, -2], lean: 0.16, sx: 2.2, sy: 2.2 })
    // wrench swing arcs; the miss smashes the windscreen at g44.5
    const swingA = g < EV_S3.wrenchMiss.g ? -0.9 + Math.sin(g * 10) * 0.8 : 1.2
    ctx.save()
    ctx.translate(2090, 630)
    ctx.rotate(swingA)
    ctx.strokeStyle = '#8a94a4'
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(54, -30)
    ctx.stroke()
    ctx.fillStyle = '#5c646e'
    ctx.fillRect(46, -44, 22, 16)
    ctx.restore()
  }
  // HIT-STOP 1: the glass shards hang, the bloom comes (shards age on WORLD g);
  // the windscreen centre in world coords is (1841, 650)
  const shAge = g - 44.55
  if (shAge > 0) {
    for (let i = 0; i < 16; i++) {
      const a = hash(i * 13) * 6.28
      const sp = 60 + hash(i * 7) * 260
      const age = Math.min(shAge, 1.1)
      const px = 1845 + Math.cos(a) * sp * age
      const py = 645 + Math.sin(a) * sp * age * 0.7 + 300 * age * age
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(a + shAge * (hash(i) > 0.5 ? 6 : -6) * Math.min(shAge, 1))
      ctx.fillStyle = 'rgba(210,232,246,0.85)'
      const sh = 6 + hash(i * 3) * 10
      ctx.beginPath()
      ctx.moveTo(-sh, 0)
      ctx.lineTo(0, -sh * 0.6)
      ctx.lineTo(sh, 0)
      ctx.lineTo(0, sh * 0.5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    // the burst star on the frame
    if (shAge < 0.3) ART.glint(ctx, 1845, 645, 130, shAge / 0.3)
  }
  // hero slides off the nose and drops to the road on the release
  if (g >= EV_S3.dropToRoad.g) {
    drawHero(ctx, 2225, heroDropY(g), { pose: { lift: [5, 2], stride: [2, -2], lean: 0.12, rot: Math.min(0.3, (g - 45.2) * 1.2) }, filament: true, sy: 2.3 })
    rollDust(ctx, 2225, 930, t, 0.7, 6)
  }
  ctx.restore()
}

function drawS3d(ctx, lt, t) {
  const { g, stop } = warp(t)
  cam(ctx, 1.0, 960, 560, ...shakeXY(t, g > 47.0 && g < 47.8 ? 3 : 0))
  // under-chassis world: road band, dusk-lit
  const rg = ctx.createLinearGradient(0, 0, 0, H)
  rg.addColorStop(0, '#171008')
  rg.addColorStop(0.45, '#241a10')
  rg.addColorStop(1, '#0e0a06')
  ctx.fillStyle = rg
  ctx.fillRect(-30, -30, W + 60, H + 60)
  // road rushing underneath
  ctx.fillStyle = '#6a5432'
  ctx.fillRect(-30, 860, W + 60, 250)
  ctx.fillStyle = 'rgba(240,228,190,0.4)'
  const dashO = -(((g * 2600) % 300) + 300) % 300 // world g: the road freezes with the hit-stop
  for (let dx2 = dashO - 300; dx2 < W + 300; dx2 += 300) ctx.fillRect(dx2, 950, 150, 10)
  // chassis slab + driveline
  ctx.fillStyle = '#241f18'
  ctx.fillRect(-30, 240, W + 60, 150)
  ctx.fillStyle = '#332c22'
  ctx.fillRect(-30, 240, W + 60, 16)
  ctx.fillStyle = '#181410'
  ctx.fillRect(-30, 386, W + 60, 22)
  ctx.fillStyle = 'rgba(255,200,120,0.08)'
  ctx.fillRect(-30, 240, W + 60, 5)
  // axles + hanging wheels (spinning fast)
  for (const wx of [420, 1060, 1620]) {
    ctx.fillStyle = '#2c2620'
    ctx.fillRect(wx - 20, 404, 40, 60)
    ctx.save()
    ctx.translate(wx, 470)
    ctx.fillStyle = '#14110c'
    ctx.beginPath()
    ctx.arc(0, 0, 150, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#2e2820'
    ctx.beginPath()
    ctx.arc(0, 0, 62, 0, 7)
    ctx.fill()
    ctx.strokeStyle = '#3c342a'
    ctx.lineWidth = 9
    const spin = g * 34 // world g: spokes freeze through the hit-stop
    for (let i = 0; i < 6; i++) {
      const a = spin + (i / 6) * 6.283
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30)
      ctx.lineTo(Math.cos(a) * 58, Math.sin(a) * 58)
      ctx.stroke()
    }
    ctx.restore()
  }
  // the mounted goon flashes past on the FAR side, upside-down; they nod
  // (window in the g domain so he is visible through the HIT-STOP 2 freeze)
  if (g >= STOP2_G - 0.4 && g < STOP2_G + 1.5) {
    const u = cl((g - (STOP2_G - 0.4)) / 1.9)
    const gx6 = lerp2(2200, 100, u)
    const nod = Math.abs(Math.sin((g - EV_S3.nodPass.g) * 9)) * (g > EV_S3.nodPass.g - 0.25 && g < EV_S3.nodPass.g + 0.25 ? 1 : 0)
    const sad = ART.horse(ctx, gx6, 866, 0.85, g * 4, { gallop: 1, flip: true, col: '#4c3620' }) // g: frozen in the stop
    sprite(ctx, S.goons.smug, gx6 + 8, sad.saddleY + 6, { lift: [2, 0], stride: [1, 0], lean: -0.06, sx: 1.3, sy: 1.3, flip: true, upside: true, rot: nod * 0.16 })
  }
  // hero dragged between the wheels, grabs the axle at the stop
  let hxd
  if (g < STOP2_G) hxd = lerp2(2050, 1120, E.outCubic(cl((g - EV_S3.dragUnder.f) / 1.15)))
  else hxd = 1120
  const pinned = g >= STOP2_G
  const dragY = pinned ? heroDragY(STOP2_G) : heroDragY(Math.max(g, EV_S3.dragUnder.f + 0.3))
  // grab-arm to the axle once pinned
  if (pinned) {
    ctx.strokeStyle = '#d0bdb1'
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(hxd + 30, dragY - 60)
    ctx.lineTo(1080, 420)
    ctx.stroke()
  }
  drawHero(ctx, hxd, dragY, {
    pose: { lift: [4, 4], stride: [3, -3], lean: pinned ? -0.1 : 0.18, rot: pinned ? 0 : Math.sin(g * 9) * 0.08 },
    filament: true, sy: 2.1,
  })
  // dust jets at the contact (real t — they keep streaming through HIT-STOP 2)
  rollDust(ctx, hxd + 40, 900, t, 0.2, 10)
  // dust motes drift even in the freeze
  for (let i = 0; i < 20; i++) {
    const u = ((t * (0.1 + hash(i * 7) * 0.14) + hash(i * 3)) % 1)
    ctx.globalAlpha = 0.35 * Math.sin(u * Math.PI)
    ctx.fillStyle = '#d8c8a0'
    ctx.fillRect((hash(i * 13) * W + t * 30) % W, 300 + u * 500, 2.6, 2.6)
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawS3e(ctx, lt, t) {
  const g = warp(t).g
  cam(ctx, 1.0, 960, 590 + Math.sin(t * 1.6) * 6, ...shakeXY(t, g > EV_S3.heave.g && g < EV_S3.heave.g + 0.3 ? 6 : 0))
  desertStage(ctx, t, truckX(g) - truckX(39.5), 1.0, 900)
  // rear of the truck: wheels + fenders first (behind everything)
  ctx.fillStyle = '#241a14'
  for (const wx of [660, 1260]) {
    ctx.beginPath()
    ctx.arc(wx, 930, 96, Math.PI, 0)
    ctx.fill()
  }
  drawTruckWheelsRear(ctx, t)
  // the ark roped upright, centre flatbed (visible above the tailgate rim)
  const pulse = g >= EV_S3.arkPulse.g ? 0.5 + 0.5 * Math.sin((g - EV_S3.arkPulse.g) * 9) : 0
  ART.ark(ctx, 960, 492, 0.85, { ropes: true, t, rot: Math.sin(t * 4) * 0.02, glow: pulse * 0.4 })
  // goon guards the ark; hero rises behind the tailgate (drawn before the gate)
  if (g >= EV_S3.riseBehind.g && g < EV_S3.heave.g) {
    sprite(ctx, S.goons.smug, 1120, 545, { lift: [2, 0], stride: [1, 0], lean: Math.sin(g * 7) * 0.05, sx: 1.9, sy: 1.9 })
    const rise = cl((g - EV_S3.riseBehind.g) / 0.3)
    const heroFeet = lerp2(740, 552, E.outCubic(rise))
    drawHero(ctx, 800, heroFeet, { pose: { lift: [3, 1], stride: [2, 0], lean: 0.1 + Math.sin(g * 9) * 0.04 }, filament: true, sy: 1.95 })
    // fisticuff pantomime: three moves (impact stars on the beats)
    for (const [i, bt] of [50.3, 50.9, 51.5].entries()) {
      const age = g - bt
      if (age > 0 && age < 0.22) ART.glint(ctx, 960 + i * 40, 600, 46, age / 0.22)
    }
  }
  // tailgate face-on (occludes the brawlers' lower halves)
  ctx.fillStyle = '#4c3a20'
  ctx.fillRect(560, 470, 800, 40)
  const tg = ctx.createLinearGradient(560, 0, 1360, 0)
  tg.addColorStop(0, '#6a4c28')
  tg.addColorStop(0.5, '#7c5c34')
  tg.addColorStop(1, '#5a4022')
  ctx.fillStyle = tg
  ctx.fillRect(560, 510, 800, 400)
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  for (let px = 560; px < 1360; px += 66) ctx.fillRect(px, 510, 6, 400)
  ctx.fillStyle = '#8a6a3c'
  ctx.fillRect(560, 600, 800, 16)
  txt(ctx, 'CABALD FREIGHT', 960, 680, { size: 34, font: F.grot, weight: 700, color: 'rgba(30,20,8,0.6)', align: 'center', track: 3 })
  ctx.fillStyle = '#a63c2c'
  ctx.fillRect(560, 510, 20, 400)
  ctx.fillRect(1340, 510, 20, 400)
  for (const lx of [545, 1355]) {
    ctx.fillStyle = '#e8b23a'
    ctx.fillRect(lx - 8, 540, 16, 30)
  }
  // THE HEAVE: goon launched off the back, lands on a pursuing horse, both veer off
  if (g >= EV_S3.heave.g) {
    const u = cl((g - EV_S3.heave.g) / 0.4)
    const gx7 = lerp2(1120, 420, u)
    const gy7 = 545 - Math.sin(u * Math.PI) * 320 + u * u * 300
    sprite(ctx, S.goons.smug, gx7, gy7, { lift: [4, 2], stride: [2, -2], lean: -0.3, rot: u * 9, sx: 1.9, sy: 1.9 })
  }
  if (g >= EV_S3.horseLand.g) {
    const u2 = cl((g - EV_S3.horseLand.g) / 0.7)
    const hx7 = lerp2(160, -500, E.inQuad(u2))
    if (hx7 > -500) {
      const sad = ART.horse(ctx, hx7, 960, 1.1, g * 4, { gallop: 1, flip: true, col: '#4c3620' })
      const landu = cl((g - EV_S3.horseLand.g) / 0.2)
      sprite(ctx, S.goons.smug, hx7 - 6, lerp2(460, sad.saddleY + 4, E.outCubic(landu)), {
        lift: [4, 2], stride: [2, -2], lean: -0.2, sx: 1.9, sy: 1.9, flip: true, rot: (1 - landu) * 6,
      })
    }
  }
  ctx.restore()
}
function drawTruckWheelsRear(ctx, t) {
  for (const wx of [660, 1260]) {
    ctx.save()
    ctx.translate(wx, 930)
    ctx.fillStyle = '#3c4048'
    ctx.beginPath()
    ctx.arc(0, -30, 36, 0, 7)
    ctx.fill()
    ctx.restore()
  }
}

function drawS3f(ctx, lt, t) {
  const g = warp(t).g
  cam(ctx, 1.0, 960, 560, Math.sin(t * 2.2) * 5, Math.cos(t * 1.7) * 4)
  // cab interior: dash, seat, open windscreen (sky + rushing desert through it)
  const sky2 = ctx.createLinearGradient(0, 60, 0, 320)
  sky2.addColorStop(0, '#8fc8ec')
  sky2.addColorStop(1, '#e8d8a8')
  ctx.fillStyle = sky2
  ctx.fillRect(-30, -30, W + 60, 420)
  // rushing road through the windscreen
  ctx.fillStyle = '#b89868'
  ctx.fillRect(-30, 300, W + 60, 130)
  const dashO = -(((t * 2400) % 240) + 240) % 240
  ctx.fillStyle = 'rgba(240,228,190,0.5)'
  for (let dx2 = dashO - 240; dx2 < W + 240; dx2 += 240) ctx.fillRect(dx2, 350, 100, 7)
  // cracked-open frame where the windscreen used to be
  ctx.strokeStyle = '#d9c9a8'
  ctx.lineWidth = 16
  ctx.strokeRect(120, 60, 1680, 350)
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = 'rgba(220,210,190,0.4)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(240 + i * 320, 70)
    ctx.lineTo(260 + i * 320, 110)
    ctx.stroke()
  }
  // cab interior shell
  const ig = ctx.createLinearGradient(0, 380, 0, H)
  ig.addColorStop(0, '#5c241c')
  ig.addColorStop(0.4, '#6e2c20')
  ig.addColorStop(1, '#3c1812')
  ctx.fillStyle = ig
  ctx.fillRect(-30, 400, W + 60, H + 60 - 400)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(-30, 400, W + 60, 18)
  // bench seat
  ctx.fillStyle = '#7a3c2c'
  ctx.fillRect(560, 640, 820, 70)
  ctx.fillStyle = '#8a4634'
  ctx.fillRect(560, 700, 820, 210)
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  for (let px = 600; px < 1360; px += 90) ctx.fillRect(px, 700, 8, 210)
  // steering wheel (driver side, left)
  ctx.strokeStyle = '#1c1410'
  ctx.lineWidth = 16
  ctx.beginPath()
  ctx.arc(560, 560, 78, 0, 7)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(560, 560)
  ctx.lineTo(560, 640)
  ctx.stroke()
  // the driver, mid-page
  if (g < EV_S3.driverExit.g + 0.3) {
    const dx8 = g < EV_S3.driverExit.g ? 900 : lerp2(900, 1900, E.inQuad(cl((g - EV_S3.driverExit.g) / 0.55)))
    const lookup = g > EV_S3.cabDrop.g + 0.4 && g < EV_S3.wheelTake.g ? -0.12 : 0.03
    sprite(ctx, S.goons.weasel, dx8, 760, { lift: [2, 0], stride: [1, 0], lean: lookup, sx: 2.0, sy: 2.0 })
    ART.magazine(ctx, dx8 + 60, 500, 1.15, { tilt: -0.1 + Math.sin(t * 1.4) * 0.03 })
    if (g >= EV_S3.driverExit.g && g < EV_S3.driverExit.g + 0.4) ART.dustPuff(ctx, 1750, 700, g - EV_S3.driverExit.g, 0.4, 21, 8, 'rgba(216,196,150,')
  }
  // hero drops through the empty windscreen into the passenger seat
  if (g >= EV_S3.cabDrop.g) {
    const drop = cl((g - EV_S3.cabDrop.g) / 0.35)
    const seat = cl((g - EV_S3.wheelTake.g) / 0.5)
    const hx8 = lerp2(1230, 950, E.outCubic(seat))
    const hy8 = lerp2(-60, 770, E.inQuad(drop))
    drawHero(ctx, hx8, hy8, {
      pose: { lift: [2, 0], stride: [1, 0], lean: -0.06 + (g > EV_S3.wheelTake.g ? -0.1 : 0) },
      filament: true, sy: 2.0,
    })
    // one hand on the wheel, the other holding the magazine open at the same page
    if (g > EV_S3.wheelTake.g) {
      ctx.strokeStyle = '#d0bdb1'
      ctx.lineWidth = 9
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(hx8 - 30, 640)
      ctx.lineTo(560 + 60, 580)
      ctx.stroke()
      ART.magazine(ctx, hx8 + 90, 500, 1.1, { tilt: 0.12 })
    }
  }
  // tilt through the rear window: the ark roped on the flatbed, one golden pulse
  ctx.save()
  ctx.beginPath()
  ctx.arc(1600, 330, 165, 0, 7)
  ctx.clip()
  ctx.fillStyle = '#2c1c10'
  ctx.fillRect(1400, 130, 420, 420)
  ctx.fillStyle = '#b89868'
  ctx.fillRect(1400, 400, 420, 150)
  ctx.fillStyle = 'rgba(240,228,190,0.4)'
  for (let dx2 = -(((t * 1800) % 120)); dx2 < 420; dx2 += 120) ctx.fillRect(1400 + dx2, 460, 60, 6)
  ART.ark(ctx, 1600, 330, 0.62, { ropes: true, t, glow: g >= EV_S3.arkPulse.g ? 0.5 + 0.5 * Math.sin((g - EV_S3.arkPulse.g) * 9) : 0 })
  ctx.restore()
  ctx.strokeStyle = '#d9c9a8'
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.arc(1600, 330, 165, 0, 7)
  ctx.stroke()
  if (g >= EV_S3.arkPulse.g && g < EV_S3.arkPulse.g + 0.4) {
    ART.glint(ctx, 1600, 300, 90, (g - EV_S3.arkPulse.g) / 0.4)
    txt(ctx, '~', 1680, 220, { size: 40, font: F.grot, weight: 700, color: 'rgba(255,246,200,0.9)', align: 'left' })
  }
  ctx.restore()
}

// ============================== S4 — THE PIT ==============================

function drawS4a(ctx, lt, t) {
  const g = warp(t).g
  cam(ctx, 1.06, 960, 620)
  ctx.fillStyle = '#0a0e1e'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.ruin, -OS, -OS)
  // moon + cool wash
  ART.moon(ctx, 1520, 210, 84, { halo: 0.3 })
  ctx.fillStyle = 'rgba(120,150,220,0.08)'
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // hero carries the ark L->R
  const hx9 = lerp2(140, 1010, cl((g - EV_S4.walkIn.g) / 1.1))
  if (g < EV_S4.pileOn.g) {
    drawHero(ctx, hx9, GROUNDS.s4, { pose: { ...walkCyc(t * 7), lean: 0.08 }, filament: true })
    ART.ark(ctx, hx9 + 76, 800, 0.72, { rot: 0.14, t })
  }
  // the wicker baskets rattle, then GOONS spring out (not snakes)
  for (const [i, bxp] of [760, 1180].entries()) {
    const shakeT = g > EV_S4.baskets.g ? (g - EV_S4.baskets.g) * 30 : 0
    ART.basket(ctx, bxp, GROUNDS.s4 + 6, 1.35, { shake: g > EV_S4.baskets.g && g < EV_S4.spring.g + 0.3 ? shakeT : 0, flip: i === 1 })
  }
  if (g >= EV_S4.spring.g && g < EV_S4.pileOn.g) {
    for (const [i, k] of ['foreman', 'bruiser', 'weasel'].entries()) {
      const u = cl((g - EV_S4.spring.g - i * 0.08) / 0.3)
      const gx9 = lerp2([760, 970, 1180][i], [560, 950, 1350][i], u)
      const gy9 = GROUNDS.s4 - Math.sin(u * Math.PI) * 190
      sprite(ctx, S.goons[k], gx9, gy9, { lift: [5, 3], stride: [2, -2], lean: 0.1, sx: 2.0, sy: 2.0 })
    }
  }
  // dust-cloud pile-on; limbs + one hat poking out; the ark rises on four hands
  if (g >= EV_S4.pileOn.g && g < EV_S4.trussed.g) {
    const cu = cl((g - EV_S4.pileOn.g) / 0.35)
    for (let i = 0; i < 26; i++) {
      const a = hash(i * 13) * 6.28 + g * (2 + hash(i) * 3)
      const rr2 = 230 * cu * (0.5 + hash(i * 7) * 0.5)
      ctx.fillStyle = `rgba(190,170,140,${0.5 + hash(i * 3) * 0.3})`
      ctx.beginPath()
      ctx.arc(960 + Math.cos(a) * rr2, 815 + Math.sin(a) * rr2 * 0.42, 44 + hash(i * 5) * 52 * cu, 0, 7)
      ctx.fill()
    }
    for (const [i, k] of ['foreman', 'bruiser', 'weasel'].entries()) {
      sprite(ctx, S.goons[k], 900 + i * 60, 800 + Math.sin(g * 14 + i * 2) * 24, { lift: [4, 4], stride: [3, -3], rot: g * (4 + i), sx: 1.5, sy: 1.5 })
    }
    // hero's fedora pokes out of the cloud
    ctx.save()
    ctx.translate(960 + Math.sin(g * 11) * 30, 640 + Math.sin(g * 13) * 10)
    ctx.rotate(Math.sin(g * 8) * 0.3)
    ART.fedora(ctx, 0, 0, 1.3, {})
    ctx.restore()
  }
  if (g >= EV_S4.arkRise.g && g < EV_S4.trussed.g) {
    const ru = cl((g - EV_S4.arkRise.g) / 0.5)
    ART.ark(ctx, 960, lerp2(700, 470, E.outCubic(ru)), 0.7, { rot: Math.sin(g * 5) * 0.05, t })
    for (const hxp of [-70, -26, 26, 70]) {
      ctx.fillStyle = '#c9a882'
      ctx.beginPath()
      ctx.arc(960 + hxp, lerp2(700, 545, E.outCubic(ru)) + 34, 13, 0, 7)
      ctx.fill()
    }
  }
  // the cloud collapses: hero trussed, ark gone
  if (g >= EV_S4.trussed.g) {
    const col = cl((g - EV_S4.trussed.g) / 0.3)
    for (let i = 0; i < 10; i++) {
      const u = col * 0.5 + ((t * 0.6 + hash(i) ) % 0.5)
      ctx.fillStyle = `rgba(190,170,140,${0.3 * (1 - col)})`
      ctx.beginPath()
      ctx.arc(960 + (hash(i * 9) - 0.5) * 300, 810 + u * 120, 20 + hash(i * 3) * 20 * (1 - col), 0, 7)
      ctx.fill()
    }
    drawHero(ctx, 960, GROUNDS.s4, { pose: { lift: [2, 0], stride: [1, 0], lean: Math.sin(t * 2.2) * 0.06, hatRot: 0.2 }, filament: false, sy: 2.45 })
    ropeWraps(ctx, 960, GROUNDS.s4, 2.45, 5)
  }
  ctx.restore()
}

function drawS4b(ctx, lt, t) {
  const g = warp(t).g
  cam(ctx, 1.05, 960, 610, ...shakeXY(t, g > 58.8 && g < 59.5 ? 3 : 0))
  ctx.fillStyle = '#241a10'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.pit, -OS, -OS)
  // hatch doors swing open
  const openU = cl((g - 58.45) / 0.3)
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(960 + side * 200, -40)
    ctx.rotate(side * openU * 1.1)
    ctx.fillStyle = '#3c2c18'
    ctx.fillRect(side < 0 ? -200 : 0, 0, 200, 26)
    ctx.strokeStyle = '#57422a'
    ctx.lineWidth = 5
    ctx.strokeRect(side < 0 ? -200 : 0, 0, 200, 26)
    ctx.restore()
  }
  // moonlight shaft down the hatch
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const bg = ctx.createLinearGradient(0, 0, 0, 880)
  bg.addColorStop(0, 'rgba(190,210,240,0.3)')
  bg.addColorStop(1, 'rgba(190,210,240,0.04)')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.moveTo(800, -20)
  ctx.lineTo(1120, -20)
  ctx.lineTo(1250, 880)
  ctx.lineTo(700, 880)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // the hero drops in
  if (g < 58.9) {
    const du = cl((g - 58.55) / 0.3)
    drawHero(ctx, 960, lerp2(-80, GROUNDS.s4, E.inQuad(du)), { pose: { lift: [6, 3], stride: [2, -2], lean: 0.1, rot: du * 2 }, filament: true, sy: 2.4 })
    if (du >= 1) ART.dustPuff(ctx, 960, 900, g - 58.85, 0.5, 41, 10)
  } else {
    drawHero(ctx, 960, GROUNDS.s4, {
      pose: { lift: [2, 0], stride: [1, 0], lean: g > EV_S4.deadpan.g ? -0.12 : 0.02 },
      filament: true, sy: 2.4,
    })
    ropeWraps(ctx, 960, GROUNDS.s4, 2.4, 4)
  }
  // the rain of barber scissors (timeline's seeded table)
  for (const sc of SCISSORS) {
    if (g < sc.tLand - 0.5) continue
    if (g < sc.tLand) {
      const fu = (g - (sc.tLand - 0.5)) / 0.5
      const sy10 = lerp2(-60, sc.y, fu)
      ART.scissors(ctx, sc.x, sy10, fu * 12 + sc.seed, 1.5, { open: Math.sin(fu * 20) * 0.5 + 0.5 })
    } else {
      ART.scissors(ctx, sc.x, sc.y, sc.rot, 1.5, {})
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(sc.x, sc.y + 12, 20, 5, 0, 0, 7)
      ctx.fill()
    }
  }
  // the cape-hem snip: nearest blade snips a triangle off at g60.0
  if (g >= EV_S4.hemSnip.g) {
    const su = cl((g - EV_S4.hemSnip.g) / 0.5)
    ART.scissors(ctx, 1010, 800 - su * 40, -0.6 + Math.sin(su * 18) * 0.5, 1.2, { open: Math.sin(su * 18) * 0.5 + 0.5 })
    if (su > 0.3 && su < 1) {
      ctx.save()
      ctx.translate(1030, 780 + su * su * 160)
      ctx.rotate(su * 3)
      ctx.fillStyle = '#2d3d49'
      ctx.beginPath()
      ctx.moveTo(-14, 0)
      ctx.lineTo(14, 0)
      ctx.lineTo(0, 22)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    if (su < 0.3) ART.glint(ctx, 1010, 790, 40, su / 0.3)
  }
  ctx.restore()
}

function drawS4c(ctx, lt, t) {
  const g = warp(t).g
  // camera tilts up the rubble slope for the exit
  const up = cl((g - EV_S4.rubbleWall.g - 0.2) / 0.6)
  cam(ctx, lerp2(1.05, 1.2, up), lerp2(960, 1400, up), lerp2(610, 240, E.outCubic(up)))
  ctx.fillStyle = '#241a10'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.pit, -OS, -OS)
  // the torch drops through and lands
  if (g >= EV_S4.torch.g) {
    const tu = cl((g - EV_S4.torch.g) / 0.5)
    const ty = lerp2(-40, 852, E.inQuad(tu))
    ART.torchProp(ctx, 860, ty, 1.6, 1, t, { ph: 3 })
    if (tu >= 1) {
      ART.glow(ctx, 860, 830, flicker(t, 4) * 1.1, { r: 300, a: 0.55 })
      ART.dustPuff(ctx, 860, 870, g - EV_S4.torch.g - 0.5, 0.4, 43, 6)
    }
  }
  // scissors part from the light like iron filings
  const parting = g >= EV_S4.parting.g ? cl((g - EV_S4.parting.g) / 0.6) : 0
  let pinkDone = false
  for (const sc of SCISSORS) {
    if (g < sc.tLand) continue
    const dx11 = sc.x - 860, dy11 = sc.y - 860
    const dl = Math.hypot(dx11, dy11) || 1
    const px11 = sc.x + (dx11 / dl) * parting * 130
    const py11 = sc.y + (dy11 / dl) * parting * 60
    const isPink = sc.seed === 11
    if (isPink && g >= EV_S4.scissorsFree.g) { pinkDone = true; continue }
    ART.scissors(ctx, px11, py11, sc.rot + parting * (hash(sc.seed) > 0.5 ? 0.6 : -0.6), 1.5, {})
  }
  // the hero (hands tied) works himself to the pink safety scissors and snips free
  let hx11 = 960, hy11 = GROUNDS.s4, climbing = false
  if (g >= EV_S4.scissorsFree.g && g < EV_S4.rubbleWall.g + 0.55) {
    const wu = cl((g - EV_S4.scissorsFree.g) / 0.35)
    hx11 = lerp2(960, 780, wu)
    ART.scissors(ctx, 740, 846, 0.4, 1.0, { pink: true, bow: true, open: Math.sin(g * 24) * 0.5 + 0.5 })
    if (wu < 1) ART.glint(ctx, 740, 838, 40, (g - EV_S4.scissorsFree.g) / 0.4)
  }
  if (g >= EV_S4.rubbleWall.g) {
    climbing = true
    const cu = cl((g - EV_S4.rubbleWall.g) / 0.55)
    hx11 = lerp2(900, 1560, cu)
    hy11 = lerp2(GROUNDS.s4, 214, E.outCubic(cu)) + Math.sin(cu * 9) * 8
    if (cu < 1) ART.dustPuff(ctx, hx11, hy11 + 20, ((g * 4) % 0.3), 0.3, 45, 3, 'rgba(150,120,80,')
  }
  // the rope stays on the hero only until the pink scissors free him
  const freeF = EV_S4.scissorsFree.g + 0.3
  if (g < freeF) {
    drawHero(ctx, hx11, hy11, { pose: { ...(climbing ? { lift: [5, 3], stride: [3, -2], lean: 0.14 } : { lift: [2, 0], stride: [1, 0], lean: g > EV_S4.pocket.g ? -0.06 : 0.06 }) }, filament: true, sy: 2.35 })
    if (g < EV_S4.scissorsFree.g + 0.3) ropeWraps(ctx, hx11, hy11, 2.35, 4)
  }
  // the tidy surrender: two waiting goons at the ledge; he hands over his own rope
  if (g >= EV_S4.rubbleWall.g + 0.35) {
    const march = cl((g - EV_S4.marchOff.g) / 0.5)
    for (const [i, k] of ['smug', 'bruiser'].entries()) {
      const gx12 = lerp2(1680 + i * 140, 1900 + i * 140 + march * 400, E.outCubic(cl((g - EV_S4.rubbleWall.g - 0.35 - i * 0.05) / 0.3)))
      sprite(ctx, S.goons[k], gx12, 208 - i * 6, { lift: [2, 0], stride: [1, 0], lean: 0.02, sx: 2.1, sy: 2.1 })
    }
    // the rope handover (hero wrists out, rope passed over)
    if (g >= EV_S4.ropeHandover.g && g < EV_S4.marchOff.g + 0.4) {
      const handover = heroMarchX(g)
      drawHero(ctx, handover, 220, { pose: { lift: [3, 3], stride: [1, 1], lean: 0.05 }, filament: true, sy: 2.35 })
      ctx.strokeStyle = '#b8955c'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(handover + 40, 130)
      ctx.quadraticCurveTo(handover + 120, 120, handover + 190, 140)
      ctx.stroke()
    } else if (g >= EV_S4.marchOff.g + 0.4) {
      const mu2 = cl((g - (EV_S4.marchOff.g + 0.4)) / 0.45)
      drawHero(ctx, lerp2(1560, 2200, E.inQuad(mu2)), 214, { pose: { ...walkCyc(g * 8), lean: 0.05 }, filament: true, sy: 2.35 })
    }
  }
  ctx.restore()
}
const heroMarchX = (g) => lerp2(1560, 1680, cl((g - EV_S4.ropeHandover.g) / 0.3))

// ============================== S5 — THE OPENING ==============================

function drawS5a(ctx, lt, t) {
  const g = warp(t).g
  cam(ctx, 1.0, 960, 600)
  ctx.fillStyle = '#0a1024'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.altar, -OS, -OS)
  ART.moon(ctx, 350, 200, 90, { halo: 0.34 })
  for (const [i, tx] of [200, 620, 1300, 1720].entries()) {
    ART.glow(ctx, tx, 560, flicker(t, i * 2), { r: 230, a: 0.42 })
    ART.torchProp(ctx, tx, 560, 1.7, 1, t, { ph: i * 2 })
  }
  // the choir hums on the risers
  for (let i = 0; i < 5; i++) {
    const bob = Math.sin(t * 2.4 + i * 1.1) * 4
    sprite(ctx, S.choir[CHOIR_RIG[i]], CHOIR_POS[i].x, CHOIR_POS[i].f - bob, { lift: [2, 1], stride: [1, 0], lean: 0.02 * Math.sin(t * 2 + i), sx: 2.5, sy: 2.5 })
  }
  // Baldouq, arms raised, screen-right
  drawRival(ctx, 1400, GROUNDS.s5, { pose: { lift: [2, 0], stride: [1, 0], lean: -0.05 } })
  rivalArms(ctx, 1400, GROUNDS.s5, 2.55, -0.5)
  // the hero staked far screen-left, eyes shut, serene
  drawHero(ctx, 232, GROUNDS.s5, { pose: { lift: [1, 0], stride: [0, 0], lean: 0.04 }, filament: true, sy: 2.5 })
  ropeWraps(ctx, 232, GROUNDS.s5, 2.5, 5)
  // the ark waits on the altar, faint pulse
  ART.ark(ctx, ALTAR.x, ALTAR.top + 8, 0.92, { t, glow: 0.12 + 0.1 * Math.sin(t * 2) })
  ctx.restore()
}
const ALTAR = { x: 960, top: 690, floor: 940 }
// one canonical choir layout = the wisp-domino line (rightmost pops first);
// the 5th singer reuses choir[1]'s rig (identical robes read as a choir)
const CHOIR_POS = [{ x: 1200, f: 884 }, { x: 1030, f: 866 }, { x: 860, f: 848 }, { x: 690, f: 866 }, { x: 520, f: 884 }]
const CHOIR_RIG = [0, 1, 2, 3, 1]
function rivalArms(ctx, x, feet, sy, raise) {
  ctx.strokeStyle = '#efe9d8'
  ctx.lineWidth = 10 * sy * 0.4
  ctx.lineCap = 'round'
  const sy0 = feet - 120 * sy * 0.42
  ctx.beginPath()
  ctx.moveTo(x - 26 * sy * 0.42, sy0)
  ctx.lineTo(x - 40 * sy * 0.42, sy0 - 90 * sy * 0.42 * (1 + raise))
  ctx.moveTo(x + 26 * sy * 0.42, sy0)
  ctx.lineTo(x + 40 * sy * 0.42, sy0 - 90 * sy * 0.42 * (1 + raise))
  ctx.stroke()
}

function drawS5b(ctx, lt, t) {
  const g = warp(t).g
  cam(ctx, 1.02, 960, 600)
  ctx.fillStyle = '#0a1024'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.altar, -OS, -OS)
  ART.moon(ctx, 350, 200, 90, { halo: 0.3 })
  for (const [i, tx] of [200, 620, 1300, 1720].entries()) {
    ART.glow(ctx, tx, 560, flicker(t, i * 2), { r: 230, a: 0.42 })
    ART.torchProp(ctx, tx, 560, 1.7, 1, t, { ph: i * 2 })
  }
  // the lid comes off g70.4
  const lid = g >= EV_S5.lidOff.g ? cl((g - EV_S5.lidOff.g) / 0.4) : 0
  // Baldouq leans in to heave, then back with arms spread
  const bx = g < EV_S5.lidOff.g + 0.2 ? lerp2(1340, 1150, cl((g - 70.0) / 0.4)) : 1340
  const wax = g >= EV_S5.waxDrips.g
  drawRival(ctx, bx, GROUNDS.s5, {
    pose: { lift: [2, 0], stride: [1, 0], lean: g < EV_S5.lidOff.g ? 0.14 : -0.08 },
    panama: !wax,
  })
  rivalArms(ctx, bx, GROUNDS.s5, 2.55, g >= EV_S5.modeFlip.g ? -0.6 : -0.3)
  // the choir, robes whipping right->left in the gusts after the lid
  const gust = g >= EV_S5.flowColumn.g
  for (let i = 0; i < 5; i++) {
    if (g >= WISP_G_SAFE[i]) continue
    sprite(ctx, S.choir[CHOIR_RIG[i]], CHOIR_POS[i].x, CHOIR_POS[i].f - Math.sin(t * 2.4 + i) * 4, {
      lift: [2, 1], stride: [1, 0], lean: gust ? -0.16 + Math.sin(t * 6 + i) * 0.05 : 0.02, sx: 2.5, sy: 2.5,
    })
    if (gust) {
      ctx.strokeStyle = 'rgba(230,230,250,0.35)'
      ctx.lineWidth = 3
      for (let k = 0; k < 3; k++) {
        ctx.beginPath()
        ctx.moveTo(CHOIR_POS[i].x + 20, CHOIR_POS[i].f - 140 - k * 30)
        ctx.quadraticCurveTo(CHOIR_POS[i].x - 30 - k * 14, CHOIR_POS[i].f - 150 - k * 30, CHOIR_POS[i].x - 70 - k * 20, CHOIR_POS[i].f - 130 - k * 30 + Math.sin(t * 7 + k) * 6)
        ctx.stroke()
      }
    }
  }
  // the ark with the lid off + the column of golden FLOW
  ART.ark(ctx, ALTAR.x, ALTAR.top + 8, 0.92, { lid, t, glow: 0.3 + 0.4 * lid })
  if (g >= EV_S5.flowColumn.g) {
    const ca = cl((g - EV_S5.flowColumn.g) / 0.5)
    const flip = g >= EV_S5.modeFlip.g
    const colCol = flip ? '255,244,214' : '232,178,58'
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const cg = ctx.createLinearGradient(0, 900, 0, 0)
    cg.addColorStop(0, `rgba(${colCol},${0.4 * ca})`)
    cg.addColorStop(0.6, `rgba(${colCol},${0.16 * ca})`)
    cg.addColorStop(1, `rgba(${colCol},0)`)
    ctx.fillStyle = cg
    ctx.beginPath()
    ctx.moveTo(ALTAR.x - 90, 900)
    ctx.quadraticCurveTo(ALTAR.x - 30, 500, ALTAR.x - 60, -20)
    ctx.lineTo(ALTAR.x + 60, -20)
    ctx.quadraticCurveTo(ALTAR.x + 30, 500, ALTAR.x + 90, 900)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    // ghost-comb silhouettes spiral upward + streamers
    for (let i = 0; i < FLOW.combs; i++) {
      const sc = spiralComb(i, g)
      if (sc.alpha <= 0) continue
      ART.ghostComb(ctx, sc.x, sc.y, sc.rot, 1.5, sc.alpha * ca, { col: flip ? '#fff6d8' : '#ffe9ad', glow: true })
    }
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${colCol},${0.3 * ca})`
      ctx.lineWidth = 3
      ctx.beginPath()
      const sx13 = ALTAR.x + (hash(i * 9) - 0.5) * 120
      ctx.moveTo(sx13, 880)
      for (let yy = 880; yy > 0; yy -= 60) ctx.lineTo(sx13 + Math.sin(yy * 0.02 + t * 2 + i * 2) * (30 + (880 - yy) * 0.08), yy)
      ctx.stroke()
    }
  }
  // hero, still staked, hair beginning to lift in the wind
  drawHero(ctx, 232, GROUNDS.s5, { pose: { lift: [1, 0], stride: [0, 0], lean: 0.04 }, filament: true, sy: 2.5 })
  ropeWraps(ctx, 232, GROUNDS.s5, 2.5, 5)
  ctx.restore()
}
const WISP_G_SAFE = [77.0, 77.4, 77.8, 78.2, 78.6]

function drawS5c(ctx, lt, t) {
  const g = warp(t).g
  cam(ctx, 1.0, 960, 600)
  ctx.fillStyle = '#0a1024'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.altar, -OS, -OS)
  ART.moon(ctx, 350, 200, 90, { halo: 0.3 })
  for (const [i, tx] of [200, 620, 1300, 1720].entries()) {
    ART.glow(ctx, tx, 560, flicker(t, i * 2), { r: 230, a: 0.42 })
    ART.torchProp(ctx, tx, 560, 1.7, 1, t, { ph: i * 2 })
  }
  // the FLOW column keeps roaring
  const colCol = '255,244,214'
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const cg = ctx.createLinearGradient(0, 900, 0, 0)
  cg.addColorStop(0, `rgba(${colCol},0.4)`)
  cg.addColorStop(0.6, `rgba(${colCol},0.16)`)
  cg.addColorStop(1, `rgba(${colCol},0)`)
  ctx.fillStyle = cg
  ctx.beginPath()
  ctx.moveTo(ALTAR.x - 90, 900)
  ctx.quadraticCurveTo(ALTAR.x - 30, 500, ALTAR.x - 60, -20)
  ctx.lineTo(ALTAR.x + 60, -20)
  ctx.quadraticCurveTo(ALTAR.x + 30, 500, ALTAR.x + 90, 900)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  for (let i = 0; i < FLOW.combs; i++) {
    const sc = spiralComb(i, g)
    if (sc.alpha <= 0) continue
    ART.ghostComb(ctx, sc.x, sc.y, sc.rot, 1.5, sc.alpha, { col: '#fff6d8', glow: true })
  }
  ART.ark(ctx, ALTAR.x, ALTAR.top + 8, 0.92, { lid: 1, t, glow: 0.7 })
  // the choir line, popping one by one as the beam rakes them
  for (let i = 0; i < 5; i++) {
    if (g >= WISP_G_SAFE[i]) continue
    sprite(ctx, S.choir[CHOIR_RIG[i]], CHOIR_POS[i].x, CHOIR_POS[i].f - Math.sin(t * 2.4 + i) * 4, {
      lift: [2, 1], stride: [1, 0], lean: 0.04, sx: 2.5, sy: 2.5,
    })
  }
  // THE BEAM rakes screen-right -> left across the Cabald line
  const beamX = lerp2(1400, 480, cl((g - 74.0) / 4.8))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const bg14 = ctx.createLinearGradient(0, 0, 0, 900)
  bg14.addColorStop(0, 'rgba(255,240,190,0.34)')
  bg14.addColorStop(1, 'rgba(255,240,190,0.08)')
  ctx.fillStyle = bg14
  ctx.beginPath()
  ctx.moveTo(beamX - 60, -20)
  ctx.lineTo(beamX + 60, -20)
  ctx.lineTo(beamX + 150, 900)
  ctx.lineTo(beamX - 150, 900)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // Baldouq: seams crack -> wax drips -> the chrome skull; the Panama lands upright
  const bx14 = 1340
  const seams = cl((g - EV_S5.seams.g) / 0.4)
  const chromeK = cl((g - EV_S5.chrome.g) / 0.3)
  const headY = crownY(S.rival, GROUNDS.s5, 2.55) + 30
  if (chromeK < 1) {
    ctx.globalAlpha = 1 - chromeK
    drawRival(ctx, bx14, GROUNDS.s5, { pose: { lift: [2, 0], stride: [1, 0], lean: -0.1 + seams * 0.12 }, panama: g < EV_S5.panamaLand.g })
    ctx.globalAlpha = 1
  }
  if (chromeK > 0) {
    ART.chromeSkull(ctx, bx14, headY - 10, 2.1, { mustache: 1 - cl((g - 77.5) / 1.0) })
  }
  if (seams > 0 && chromeK < 1) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = `rgba(255,230,150,${0.8 * seams})`
    ctx.lineWidth = 3.4
    for (const [dx14, dy14] of [[-20, -60], [6, -74], [24, -50]]) {
      ctx.beginPath()
      ctx.moveTo(bx14 + dx14, headY + dy14)
      ctx.lineTo(bx14 + dx14 * 1.8, headY + dy14 - 34)
      ctx.stroke()
    }
    ctx.restore()
    // waxy amber drips
    const wax = cl((g - EV_S5.waxDrips.g) / 1.0)
    for (let i = 0; i < 4; i++) {
      const dxp = bx14 + (-24 + i * 16)
      const dlen = wax * (50 + hash(i * 7) * 60)
      ctx.strokeStyle = 'rgba(232,178,58,0.8)'
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(dxp, headY - 70 + i * 8)
      ctx.lineTo(dxp + Math.sin(i * 2) * 4, headY - 70 + i * 8 + dlen)
      ctx.stroke()
      ctx.fillStyle = 'rgba(232,178,58,0.9)'
      ctx.beginPath()
      ctx.arc(dxp + Math.sin(i * 2) * 4, headY - 70 + i * 8 + dlen, 4.4, 0, 7)
      ctx.fill()
    }
  }
  // the Panama hovers one beat, lands perfectly upright on the chrome
  if (g >= EV_S5.panamaLand.g - 0.2 && g < EV_S5.panamaLand.g) {
    const hover = cl((g - (EV_S5.panamaLand.g - 0.2)) / 0.2)
    ART.panama(ctx, bx14, headY - 60 - hover * 26 + Math.sin(g * 9) * 3, 1.5, { rot: Math.sin(g * 7) * 0.2 })
  } else if (g >= EV_S5.panamaLand.g) {
    ART.panama(ctx, bx14, headY - 64, 1.5, {})
    if (g - EV_S5.panamaLand.g < 0.3) ART.glint(ctx, bx14, headY - 74, 44, (g - EV_S5.panamaLand.g) / 0.3)
  }
  // the wisp domino across the choir line (each wisp briefly combs itself).
  // P2-3: anchored on the actual sprite heads (CHOIR_POS, clear of Baldouq),
  // with a bright core, a wide double ring and a longer hold so the pops read
  // at 1x speed.
  for (const [i, wg] of WISP_G_SAFE.entries()) {
    const age = g - wg
    if (age < 0 || age > 3.2) continue
    const wx = CHOIR_POS[i].x
    const wy = CHOIR_POS[i].f - 110
    // white core flash on the beat
    if (age < 0.3) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const cg2 = ctx.createRadialGradient(wx, wy, 2, wx, wy, 90)
      cg2.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - age / 0.3)})`)
      cg2.addColorStop(1, 'rgba(230,236,250,0)')
      ctx.fillStyle = cg2
      ctx.fillRect(wx - 90, wy - 90, 180, 180)
      ctx.restore()
    }
    // expanding double ring
    const ringA = Math.max(0, 1 - age / 1.4)
    if (ringA > 0) {
      ctx.strokeStyle = `rgba(244,248,255,${0.9 * ringA})`
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.ellipse(wx, wy - age * 30, 16 + age * 300, (16 + age * 300) * 0.62, 0, 0, 7)
      ctx.stroke()
      ctx.strokeStyle = `rgba(226,232,248,${0.6 * Math.max(0, 1 - age / 0.9)})`
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.ellipse(wx, wy - age * 18, 10 + age * 160, (10 + age * 160) * 0.62, 0, 0, 7)
      ctx.stroke()
    }
    // the dust-wisp scatter (brighter, longer)
    for (let k = 0; k < 16; k++) {
      const a = hash(i * 31 + k * 7) * 6.28
      const sp = 34 + hash(i + k * 3) * 100
      const px15 = wx + Math.cos(a) * sp * age
      const py15 = wy + Math.sin(a) * sp * age * 0.5 - age * (56 + hash(k) * 80)
      ctx.fillStyle = `rgba(232,238,252,${0.9 * Math.max(0, 1 - age / 3.2)})`
      ctx.beginPath()
      ctx.arc(px15, py15, 4 + hash(k * 5) * 7 * (0.4 + age * 0.5), 0, 7)
      ctx.fill()
    }
    // the strand-shape: a curl that combs itself straight, then scatters
    const curl = Math.sin(cl(age / 1.1) * Math.PI)
    if (curl > 0.05) {
      ctx.strokeStyle = `rgba(248,250,255,${0.95 * curl})`
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.beginPath()
      const straight = cl((age - 0.35) / 0.7)
      ctx.moveTo(wx - 30, wy + 22)
      ctx.quadraticCurveTo(wx - 12 - (1 - straight) * 28, wy - 34 * (1 - straight * 0.4), wx + 30, wy - 12 - straight * 34)
      ctx.stroke()
    }
    if (age < 0.35) ART.glint(ctx, wx, wy, 90, age / 0.35)
  }
  // the taffy comb: one goon's pocket comb slumps like taffy (g77.4)
  if (g >= EV_S5.taffyComb.g && g < EV_S5.taffyComb.g + 1.2) {
    const sl = cl((g - EV_S5.taffyComb.g) / 0.8)
    ART.ghostComb(ctx, 1030, 690, 0.4 + sl * 1.4, 1.2, 0.9, { bent: true, col: '#c9a468' })
  }
  // wisps keep rising like steam
  for (let i = 0; i < 12; i++) {
    const u = ((t * (0.1 + hash(i * 7) * 0.1) + hash(i * 3)) % 1)
    ctx.globalAlpha = 0.2 * Math.sin(u * Math.PI)
    ctx.fillStyle = '#cfd4e4'
    ctx.fillRect(500 + hash(i * 13) * 900, 900 - u * 800, 3, 3)
  }
  ctx.globalAlpha = 1
  // hero, staked, eyes shut (the spared one)
  drawHero(ctx, 232, GROUNDS.s5, { pose: { lift: [1, 0], stride: [0, 0], lean: 0.04 }, filament: true, sy: 2.5 })
  ropeWraps(ctx, 232, GROUNDS.s5, 2.5, 5)
  ctx.restore()
}

function drawS5d(ctx, lt, t) {
  const g = warp(t).g
  cam(ctx, lerp2(1.0, 1.22, cl(lt / 6)), lerp2(500, 330, cl(lt / 6)), 640)
  ctx.fillStyle = '#0a1024'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.altar, -OS, -OS)
  ART.moon(ctx, 350, 200, 90, { halo: 0.3 })
  for (const [i, tx] of [200, 620, 1300, 1720].entries()) {
    ART.glow(ctx, tx, 560, flicker(t, i * 2) * 0.7, { r: 200, a: 0.3 })
    ART.torchProp(ctx, tx, 560, 1.7, 1, t, { ph: i * 2 })
  }
  // distant wisps still rising
  for (let i = 0; i < 10; i++) {
    const u = ((t * (0.1 + hash(i * 7) * 0.1) + hash(i * 3)) % 1)
    ctx.globalAlpha = 0.16 * Math.sin(u * Math.PI)
    ctx.fillStyle = '#cfd4e4'
    ctx.fillRect(600 + hash(i * 13) * 900, 900 - u * 800, 3, 3)
  }
  ctx.globalAlpha = 1
  // THE GREAT GHOST-COMB descends to the stake
  const desc = cl((g - EV_S5.combDescend.g) / 0.6)
  const combY = lerp2(-120, 700, E.outCubic(desc))
  ART.ghostComb(ctx, 300, combY, 0.12, 6.5, 0.55 * (desc > 0 ? 1 : 0), { col: '#ffe9ad', glow: true })
  // the combing: strands of the crimson mane ALIGN ONE BY ONE (order, not eruption)
  const heroFeet = GROUNDS.s5
  drawHero(ctx, 232, heroFeet, { pose: { lift: [1, 0], stride: [0, 0], lean: 0.02 }, filament: true, sy: 2.6 })
  const hy16 = crownY(S.hero, heroFeet, 2.6) + 16
  const wind = g >= EV_S5.windGust.g ? cl((g - EV_S5.windGust.g) / 0.5) : 0
  for (let k = 0; k < STRANDS; k++) {
    const alignT = filmT(strandAlignG(k))
    const a = cl((t - alignT + 0.3) / 0.3) // 0 wild -> 1 aligned
    const ang = -2.4 + k * 0.36
    const len = (54 + (k % 3) * 12) * 2.6 * 0.42
    const wild = (1 - a) * (hash(k * 13) - 0.5) * 1.2 + Math.sin(t * 6 + k * 2) * 0.12 * (1 - a)
    const sweep = wind * 0.5
    const ex = 232 + Math.cos(ang + wild + sweep) * len
    const ey = hy16 + Math.sin(ang + wild + sweep) * len * 0.9 + 8
    ctx.strokeStyle = k % 2 ? '#893c3b' : '#a04a44'
    ctx.lineWidth = 9 - (k % 2) * 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(232 + (k - 3) * 7, hy16 + 4)
    ctx.quadraticCurveTo(232 + (k - 3) * 10 + wild * 20, hy16 - len * 0.5, ex, ey)
    ctx.stroke()
    if (a > 0 && a < 1) ART.glint(ctx, ex, ey, 26, a)
  }
  // the knot pops with a confetti tick at g81
  const knotAge = t - filmT(EV_S5.knotPop.g)
  if (knotAge > 0 && knotAge < 0.6) {
    ART.glint(ctx, 232 + 30, hy16 - 30, 60, knotAge / 0.6)
    for (let i = 0; i < 8; i++) {
      const a = hash(i * 9) * 6.28
      const sp = 60 + hash(i * 3) * 100
      ctx.fillStyle = i % 2 ? '#ffe9ad' : '#fff6d8'
      ctx.fillRect(232 + 30 + Math.cos(a) * sp * knotAge, hy16 - 30 + Math.sin(a) * sp * knotAge + 200 * knotAge * knotAge, 4, 4)
    }
  }
  // the final pass grooms the ropes loose at g83
  if (g >= EV_S5.ropesGroomed.g) {
    const ru2 = cl((t - filmT(EV_S5.ropesGroomed.g)) / 0.4)
    ctx.strokeStyle = '#b8955c'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.ellipse(232, heroFeet - 20 + ru2 * ru2 * 60, 60, 12, ru2 * 2, 0, 7)
    ctx.stroke()
    if (ru2 < 1) ctx.globalAlpha = 1 - ru2
    if (ru2 < 1) ropeWraps(ctx, 232, heroFeet - ru2 * 10, 2.6, 5)
    ctx.globalAlpha = 1
  } else {
    ropeWraps(ctx, 232, heroFeet, 2.6, 5)
  }
  // wind gust: the aligned mane streams + wind streaks
  if (wind > 0) {
    ctx.strokeStyle = `rgba(210,220,240,${0.3 * wind})`
    ctx.lineWidth = 3
    for (let i = 0; i < 6; i++) {
      const yy = hy16 - 40 + i * 26
      ctx.beginPath()
      ctx.moveTo(300 + ((t * 900 + i * 300) % 700), yy)
      ctx.lineTo(300 + ((t * 900 + i * 300) % 700) - 90, yy - 6)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function drawS5e(ctx, lt, t) {
  const g = warp(t).g
  cam(ctx, 0.94, 960, 620)
  ctx.fillStyle = '#0a1024'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.altar, -OS, -OS)
  ART.moon(ctx, 350, 200, 90, { halo: 0.3 })
  for (const [i, tx] of [200, 620, 1300, 1720].entries()) {
    ART.glow(ctx, tx, 560, flicker(t, i * 2) * 0.7, { r: 200, a: 0.3 })
    ART.torchProp(ctx, tx, 560, 1.7, 1, t, { ph: i * 2 })
  }
  // aftermath: the chrome skull wears its Panama; wisps rise like steam
  const bx15 = 1340
  ART.chromeSkull(ctx, bx15, crownY(S.rival, GROUNDS.s5, 2.55) + 20, 2.1, { mustache: 0 })
  ART.panama(ctx, bx15, crownY(S.rival, GROUNDS.s5, 2.55) - 34, 1.5, {})
  for (let i = 0; i < 14; i++) {
    const u = ((t * (0.1 + hash(i * 7) * 0.1) + hash(i * 3)) % 1)
    ctx.globalAlpha = 0.22 * Math.sin(u * Math.PI)
    ctx.fillStyle = '#cfd4e4'
    ctx.fillRect(500 + hash(i * 13) * 900, 900 - u * 800, 3, 3)
  }
  ctx.globalAlpha = 1
  ART.ark(ctx, ALTAR.x, ALTAR.top + 8, 0.92, { lid: 1, t, glow: 0.4 })
  // the hero crosses, lifts the Panama, salutes, re-seats it, collects the ark, exits
  const saluteF = filmT(EV_S5.salute.g)
  const exitF = filmT(EV_S5.exitStart.g)
  let hx17 = lerp2(232, 1268, E_ioSine2(cl((t - 85.0) / (saluteF - 0.12 - 85.0))))
  if (t >= exitF) hx17 = lerp2(1268, 2200, E.inQuad(cl((t - exitF) / 0.35)))
  drawHero(ctx, hx17, GROUNDS.s5, { pose: { ...walkCyc(t * 8, 6), lean: 0.06 }, filament: true, sy: 2.5 })
  // panama lift + salute + replace
  if (t >= saluteF - 0.25 && t < saluteF + 0.3) {
    const lift = cl((t - (saluteF - 0.25)) / 0.15)
    const put = cl((t - (saluteF + 0.05)) / 0.2)
    const py17 = crownY(S.rival, GROUNDS.s5, 2.55) - 34 - lift * 40 + put * 40
    ART.panama(ctx, lerp2(bx15, hx17 + 30, lift * (1 - put)), py17, 1.4, {})
    if (lift >= 1 && put <= 0) {
      // the salute: hero's hand to his own fedora brim
      ctx.strokeStyle = '#d0bdb1'
      ctx.lineWidth = 9
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(hx17 + 24, crownY(S.hero, GROUNDS.s5, 2.5) + 90)
      ctx.lineTo(hx17 + 34, crownY(S.hero, GROUNDS.s5, 2.5) + 18)
      ctx.stroke()
      ctx.globalAlpha = 0.7
      txt(ctx, 'o7', hx17 + 60, crownY(S.hero, GROUNDS.s5, 2.5) - 16, { size: 26, font: F.mono, weight: 700, color: '#e8e4d8', align: 'left' })
      ctx.globalAlpha = 1
    }
  } else {
    ART.panama(ctx, bx15, crownY(S.rival, GROUNDS.s5, 2.55) - 34, 1.5, {})
  }
  // ark under one arm from the grab
  if (t >= saluteF + 0.28) {
    const grab = cl((t - (saluteF + 0.28)) / 0.15)
    ART.ark(ctx, lerp2(ALTAR.x, hx17 + 60, grab), lerp2(ALTAR.top, 800, grab), 0.8, { rot: 0.18, t })
  } else {
    ART.ark(ctx, ALTAR.x, ALTAR.top + 8, 0.92, { lid: 1, t, glow: 0.4 })
  }
  ctx.restore()
}
const E_ioSine = (p) => -(Math.cos(Math.PI * p) - 1) / 2
const E_ioSine2 = E_ioSine

// ============================== S6 — TOP HAIR ==============================

// background wall of identical suited men, nodding in a synchronized wave
function nodWall(ctx, t, heroX) {
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 12; i++) {
      const x = 60 + i * 175 + row * 90
      if (Math.abs(x - heroX) < 240) continue
      const front = ((t - 88.5 - (x / W) * 0.9) / 0.45)
      const nod = front > 0 && front < 1 ? Math.sin(front * Math.PI) : 0
      ART.suitMan(ctx, x, 806 + row * 26, 1.15 - row * 0.16, { col: row ? '#1c1f26' : '#23262e', nod })
    }
  }
}

function drawS6a(ctx, lt, t) {
  const g = warp(t).g
  const hx18 = lerp2(430, 1250, cl(lt / 3))
  cam(ctx, 1.1, lerp2(760, 1150, cl(lt / 3)), 620)
  ctx.fillStyle = '#14161e'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.warehouse, -OS, -OS)
  for (const lx of [400, 960, 1520]) ART.glow(ctx, lx, 400, flicker(t, lx) * 0.8, { r: 200, a: 0.3, col: null })
  nodWall(ctx, t, hx18)
  // the escorts
  ART.suitMan(ctx, hx18 - 190, GROUNDS.s6, 1.9, { walk: t * 1.6, flip: false })
  ART.suitMan(ctx, hx18 + 190, GROUNDS.s6, 1.9, { walk: t * 1.6 + 0.5, flip: true })
  // the hero, marched mid-shot (filament still on the fedora until the pluck)
  const pluckF = filmT(EV_S6.filamentPluck.g)
  drawHero(ctx, hx18, GROUNDS.s6, { pose: { ...walkCyc(t * 5.4), lean: 0.03 }, filament: t < pluckF })
  // the pluck: the nearest suit's arm reaches, the filament comes away
  if (t >= pluckF - 0.3 && t < pluckF + 0.5) {
    const reach = cl((t - (pluckF - 0.3)) / 0.3)
    ctx.strokeStyle = '#23262e'
    ctx.lineWidth = 12
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(hx18 + 210, GROUNDS.s6 - 150)
    ctx.lineTo(hx18 + 210 - 70 * reach, GROUNDS.s6 - 330 * (0.6 + 0.4 * reach))
    ctx.stroke()
    if (t >= pluckF) {
      const age = t - pluckF
      ART.glint(ctx, hx18 + 30, crownY(S.hero, GROUNDS.s6, 2.5) + 10, 34, Math.min(1, age / 0.3))
      ctx.strokeStyle = 'rgba(150,150,160,0.9)'
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.moveTo(hx18 + 130 - age * 160, crownY(S.hero, GROUNDS.s6, 2.5) + 10 - age * 60)
      ctx.quadraticCurveTo(hx18 + 150 - age * 160, crownY(S.hero, GROUNDS.s6, 2.5) - age * 80, hx18 + 170 - age * 160, crownY(S.hero, GROUNDS.s6, 2.5) - 20 - age * 60)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function drawS6b(ctx, lt, t) {
  const g = warp(t).g
  cam(ctx, 1.15, 960, 620)
  ctx.fillStyle = '#14161e'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.warehouse, -OS, -OS)
  ART.glow(ctx, 960, 400, flicker(t, 9) * 0.9, { r: 240, a: 0.34 })
  // the crate, lid lowered + nailed at f90.4
  const lidF = filmT(EV_S6.lidNail.g)
  const lidY = t < lidF ? lerp2(-420, 0, E.inQuad(cl((t - (lidF - 0.4)) / 0.4))) : 0
  // ark lowered in at f90.2 (visible above the crate rim, then swallowed)
  const lowF = filmT(EV_S6.crateLower.g)
  if (t < lidF - 0.2) {
    const low = cl((t - lowF + 0.3) / 0.9)
    ART.ark(ctx, 960, lerp2(240, 700, E.inQuad(low)), 1.15, { t, glow: 0.2 })
  }
  ART.crate(ctx, 960, 920, 2.1, { glow: 0 })
  // the lid slab + nails
  ctx.save()
  ctx.translate(960, 700 + lidY)
  ctx.fillStyle = '#54401f'
  ctx.fillRect(-320, -34, 640, 60)
  ctx.fillStyle = '#6e5432'
  ctx.fillRect(-320, -34, 640, 12)
  ctx.strokeStyle = '#3a2c16'
  ctx.lineWidth = 7
  ctx.strokeRect(-320, -34, 640, 60)
  if (t >= lidF) {
    for (const nx of [-260, -90, 90, 260]) {
      ctx.fillStyle = '#c9ccd4'
      ctx.fillRect(nx - 5, -30, 10, 10)
      if (t - lidF < 0.25) ART.glint(ctx, nx, -26, 24, (t - lidF) / 0.25)
    }
  }
  ctx.restore()
  if (t >= lidF && t < lidF + 0.5) {
    const [shx, shy] = shakeXY(t, 6 * Math.exp(-(t - lidF) * 8))
    ctx.save()
    ctx.translate(shx, shy)
    ctx.restore()
    ART.dustPuff(ctx, 960, 690, t - lidF, 0.5, 51, 10)
  }
  // D1 the stencil stamp SLAMS (motion.stamp, drawn window f91.0-92.5)
  const d1 = DRAWN.find((d) => d.id === 'D1')
  if (t >= d1.f0) {
    const p = cl((t - d1.f0) / 0.28)
    MOTION.stamp(ctx, d1.text, 960, 560, { size: 64, color: '#b3372a', p, rot: -0.08, seed: 11, alpha: 1 - cl((t - (d1.f1 - 0.25)) / 0.25) })
    if (p < 1) {
      const [shx, shy] = shakeXY(t, 8 * (1 - p))
      ctx.save()
      ctx.translate(shx, shy)
      ctx.restore()
    }
  }
  // golden glow pulses through the slats after f91.6
  const glowF = filmT(EV_S6.glow.g)
  if (t >= glowF) {
    const gp = 0.5 + 0.5 * Math.sin((t - glowF) * 5)
    // re-draw slat glow over the crate front
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 1; i < 5; i++) {
      const gy = 920 - 220 * 2.1 + i * (220 * 2.1 / 5)
      const gg = ctx.createLinearGradient(0, gy, 0, gy + 12)
      gg.addColorStop(0, `rgba(255,226,140,${0.7 * gp})`)
      gg.addColorStop(1, 'rgba(255,226,140,0)')
      ctx.fillStyle = gg
      ctx.fillRect(960 - 300 * 2.1 * 0.48, gy - 2, 300 * 2.1 * 0.96, 14)
    }
    ctx.restore()
  }
  // the worker: taps the glow, shrugs, keeps hammering
  const tapF = filmT(EV_S6.tap.g)
  const hammer = Math.sin(t * 14)
  ART.suitMan(ctx, 1430, 926, 2.0, { col: '#3c4048', hat: null, nod: 0 })
  ctx.save()
  ctx.translate(1430 - 60, 760)
  ctx.rotate(hammer > 0 ? -0.5 + hammer * 0.5 : -0.5)
  ctx.strokeStyle = '#54401f'
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -56)
  ctx.stroke()
  ctx.fillStyle = '#5c626e'
  ctx.fillRect(-16, -70, 32, 18)
  ctx.restore()
  if (t >= tapF && t < tapF + 0.6) {
    const tap = cl((t - tapF) / 0.6)
    // the tap: knuckle to the slat, the glow winks, a shrug
    ART.glint(ctx, 1180, 780, 40, Math.min(1, tap * 2))
    ctx.strokeStyle = '#3c4048'
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.moveTo(1370, 780)
    ctx.lineTo(1320 - Math.sin(tap * Math.PI) * 40, 800)
    ctx.stroke()
    txt(ctx, '?', 1480, 700, { size: 40, font: F.grot, weight: 700, color: 'rgba(230,230,240,0.85)', align: 'left' })
  }
  ctx.restore()
}

function drawS6c(ctx, lt, t) {
  const g = warp(t).g
  cam(ctx, 1.0, 960, 600)
  ctx.fillStyle = '#14161e'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.warehouse, -OS, -OS)
  for (const lx of [400, 960, 1520]) ART.glow(ctx, lx, 400, flicker(t, lx) * 0.8, { r: 200, a: 0.3 })
  // the forklift recedes centre->deep, crate on the forks
  const p = forkliftP(g)
  const sc = crateScale(g)
  const fx19 = crateX(g)
  const fy19 = crateY(g)
  ctx.save()
  ctx.translate(fx19, fy19)
  ctx.scale(sc, sc)
  ART.forklift(ctx, -160, 0, 1.15, { flip: false })
  // beacon blink on the backup-beeper beat
  const blink = Math.sin(t * 6.283 * 1.5) > 0.2
  if (blink) ART.glow(ctx, -130, -218 * 1.15, 0.5, { r: 60, a: 0.6 })
  const winkGs = [EV_S6.winks[0].g, EV_S6.winks[1].g, EV_S6.winks[2].g]
  const wink = winkGs.some((wg) => Math.abs(g - wg) < 0.25) ? 1 : 0
  ART.crate(ctx, 90, -34, 1.05, { glow: wink })
  ctx.restore()
  // recede dust
  if (p > 0 && p < 1) rollDust(ctx, fx19 - 200 * sc, fy19 - 6, t, 0.4, 5, 'rgba(120,116,104,')
  ctx.restore()
}

function drawS6d(ctx, lt, t) {
  const g = warp(t).g
  cam(ctx, 1.0, 960, 580)
  ctx.fillStyle = '#14161e'
  ctx.fillRect(-30, -30, W + 60, H + 60)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(S.warehouse, -OS, -OS)
  for (const lx of [400, 960, 1520]) ART.glow(ctx, lx, 400, flicker(t, lx) * 0.7, { r: 190, a: 0.26 })
  // the forklift parked deep in the canyon
  ctx.save()
  ctx.translate(crateX(95.3), crateY(95.3))
  ctx.scale(crateScale(95.3), crateScale(95.3))
  ART.forklift(ctx, -160, 0, 1.15, {})
  ART.crate(ctx, 90, -34, 1.05, {})
  ctx.restore()
  // the distant crate that leaks ONE golden hair
  const cxx = 1500, cyy = 700
  ART.crate(ctx, cxx, cyy, 0.42, {})
  const leak = filmT(EV_S6.leak.g)
  const qF = filmT(EV_S6.qmark.g)
  const compF = filmT(EV_S6.compass.g)
  const zipF = filmT(EV_S6.zipBack.g)
  const winkF = filmT(EV_S6.slatWink.g)
  ctx.strokeStyle = GOLD
  ctx.lineCap = 'round'
  if (t >= leak && t < qF) {
    // emerge: a curl grows out of the slat
    const u = cl((t - leak) / (qF - leak))
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(cxx + 20, cyy - 180 * 0.42)
    ctx.quadraticCurveTo(cxx + 20 + u * 26, cyy - 180 * 0.42 - 26 * u, cxx + 10 + u * 40, cyy - 180 * 0.42 - 48 * u)
    ctx.stroke()
  } else if (t >= qF && t < compF) {
    // question mark: the hair curls into a tiny "?"
    const u = cl((t - qF) / (compF - qF))
    ctx.lineWidth = 5
    const qx = cxx + 66, qy = cyy - 96
    ctx.beginPath()
    ctx.arc(qx, qy - 16, 15, -2.6, -2.6 + u * 4.2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(qx + 4, qy - 1)
    ctx.quadraticCurveTo(qx + 2, qy + 12 * u, qx + 4, qy + 18 * u)
    ctx.stroke()
    if (u > 0.8) {
      ctx.fillStyle = GOLD
      ctx.beginPath()
      ctx.arc(qx + 4, qy + 30, 3.4, 0, 7)
      ctx.fill()
    }
  } else if (t >= compF && t < zipF) {
    // compass: straightens, points off-screen-right
    const u = cl((t - compF) / (zipF - compF))
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(cxx + 40, cyy - 90 + (1 - u) * 6)
    ctx.lineTo(cxx + 40 + u * 260, cyy - 90 - u * 26)
    ctx.stroke()
    ctx.fillStyle = GOLD
    ctx.beginPath()
    ctx.moveTo(cxx + 40 + u * 260, cyy - 90 - u * 26)
    ctx.lineTo(cxx + 24 + u * 260, cyy - 98 - u * 26)
    ctx.lineTo(cxx + 24 + u * 260, cyy - 82 - u * 26)
    ctx.closePath()
    ctx.fill()
  } else if (t >= zipF && t < winkF + 0.5) {
    // zip back inside
    const u = cl((t - zipF) / 0.2)
    if (u < 1) {
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(cxx + 40 + (1 - u) * 100, cyy - 90)
      ctx.lineTo(cxx + 20, cyy - 76 - (1 - u) * 10)
      ctx.stroke()
    }
  }
  // the cheeky slat wink
  if (t >= winkF) {
    const wk = (t - winkF) % 0.9
    if (wk < 0.3) ART.glint(ctx, cxx + 16, cyy - 74, 40, wk / 0.3)
  }
  ctx.restore()
}

function drawS6e(ctx, lt, t) {
  // hard cut to the end plate
  ctx.fillStyle = '#050506'
  ctx.fillRect(0, 0, W, H)
  const inU = cl(lt / 0.5)
  ctx.save()
  ctx.globalAlpha = inU
  const gr = ctx.createRadialGradient(960, 460, 20, 960, 460, 620)
  gr.addColorStop(0, 'rgba(210,190,130,0.12)')
  gr.addColorStop(1, 'rgba(210,190,130,0)')
  ctx.fillStyle = gr
  ctx.fillRect(300, 0, 1320, 920)
  // thin gold rules + a drifting golden curl
  ctx.strokeStyle = '#8a6a24'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(430, 356)
  ctx.lineTo(1490, 356)
  ctx.moveTo(430, 700)
  ctx.lineTo(1490, 700)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(232,178,58,0.5)'
  ctx.lineWidth = 3.4
  ctx.lineCap = 'round'
  ctx.beginPath()
  const drift = Math.sin(t * 0.8) * 14
  ctx.moveTo(905, 268 + drift)
  ctx.bezierCurveTo(940, 226 + drift, 990, 250 + drift, 962, 286 + drift)
  ctx.bezierCurveTo(944, 308 + drift, 912, 296 + drift, 928, 272 + drift)
  ctx.stroke()
  ctx.restore()
}

// ============================== the film ==============================

let scoreFn = null

export default {
  title: 'RAIDERS OF THE LOST HAIR',
  output: 'raiders-of-the-lost-hair.mp4',
  duration: DURATION,
  async prepare() {
    const load = async (id, far) => A.loadRemy(id, !!far)
    // CAST (casting.md final table): hero 42 whip-repaint, rival 1344 white suit,
    // goons 3870/482/2433/4449, choir far 4036/1260/1793/4450 robed, colleagues 30/24.
    S.hero = ART.whipify(ART.stripBlade(await load(CAST.hero.id)))
    S.rival = ART.whiteSuit(await load(CAST.rival.id))
    S.goons = {
      foreman: await load(CAST.foreman.id),
      smug: await load(CAST.smug.id),
      bruiser: await load(CAST.bruiser.id),
      weasel: await load(CAST.weasel.id),
    }
    S.choirIds = CAST.choir.ids
    S.choir = []
    for (const id of CAST.choir.ids) S.choir.push(ART.choirRobe(await load(id, true)))
    S.copper = { rig: await load(CAST.copper.id) }
    S.gold = { rig: await load(CAST.gold.id) }
    const heads = await A.loadHeads()
    S.headIcon = (id, k) => A.headIcon(heads, id, k)
    // sets
    S.temple = ART.templeBake()
    S.ridge = ART.ridgeBake()
    S.hall = ART.hallBake()
    S.frieze = ART.friezeBake()
    S.map = ART.mapBake()
    S.dig = ART.digBake()
    S.dunesFar = ART.dunesFarBake()
    S.dunesNear = ART.dunesNearBake()
    S.truck = ART.truckBake()
    S.ruin = ART.ruinBake()
    S.pit = ART.pitBake()
    S.altar = ART.altarBake()
    S.warehouse = ART.warehouseBake()
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
      else if (sh.name === 's1e') drawS1e(ctx, lt, t)
      else if (sh.name === 's1f') drawS1f(ctx, lt, t)
      else if (sh.name === 'title') drawTitle(ctx, lt, t)
      else if (sh.name === 's2a') drawS2a(ctx, lt, t)
      else if (sh.name === 's2b') drawS2b(ctx, lt, t)
      else if (sh.name === 's2c') drawS2c(ctx, lt, t)
      else if (sh.name === 's3a') drawS3a(ctx, lt, t)
      else if (sh.name === 's3b') drawS3b(ctx, lt, t)
      else if (sh.name === 's3c') drawS3c(ctx, lt, t)
      else if (sh.name === 's3d') drawS3d(ctx, lt, t)
      else if (sh.name === 's3e') drawS3e(ctx, lt, t)
      else if (sh.name === 's3f') drawS3f(ctx, lt, t)
      else if (sh.name === 's4a') drawS4a(ctx, lt, t)
      else if (sh.name === 's4b') drawS4b(ctx, lt, t)
      else if (sh.name === 's4c') drawS4c(ctx, lt, t)
      else if (sh.name === 's5a') drawS5a(ctx, lt, t)
      else if (sh.name === 's5b') drawS5b(ctx, lt, t)
      else if (sh.name === 's5c') drawS5c(ctx, lt, t)
      else if (sh.name === 's5d') drawS5d(ctx, lt, t)
      else if (sh.name === 's5e') drawS5e(ctx, lt, t)
      else if (sh.name === 's6a') drawS6a(ctx, lt, t)
      else if (sh.name === 's6b') drawS6b(ctx, lt, t)
      else if (sh.name === 's6c') drawS6c(ctx, lt, t)
      else if (sh.name === 's6d') drawS6d(ctx, lt, t)
      else if (sh.name === 's6e') drawS6e(ctx, lt, t)
    },
    fx: (lt, t) => {
      const base = { letterbox: SAFE.letterbox, bloom: 0.1, bloomThresh: 0.9, vignette: 0.5, grain: 0.014 }
      switch (sh.name) {
        case 's1a': return { ...base, bloom: 0.09, vignette: 0.6, warm: 0.1 }
        case 's1b': return { ...base, bloom: 0.09, vignette: 0.58, warm: 0.12 }
        case 's1c': return { ...base, bloom: 0.11, vignette: 0.62, warm: 0.12 }
        case 's1d': return { ...base, bloom: 0.1, vignette: 0.55, warm: 0.1, exposure: -0.03 }
        case 's1e': return { ...base, bloom: 0.13, bloomThresh: 0.86, vignette: 0.42, sat: 1.06, warm: 0.16 }
        case 's1f': return { ...base, bloom: 0.12, bloomThresh: 0.86, vignette: 0.44, sat: 1.05, warm: 0.14 }
        case 'title': return { ...base, bloom: 0.14, bloomThresh: 0.85, vignette: 0.4, sat: 1.04, warm: 0.1 }
        case 's2a': return { ...base, bloom: 0.08, vignette: 0.55, warm: 0.14 }
        case 's2b': return { ...base, bloom: 0.08, vignette: 0.56, warm: 0.18, sat: 0.94 }
        case 's2c': return { ...base, bloom: 0.07, vignette: 0.5, sat: 0.82, tint: [1.05, 0.99, 0.86], contrast: 1.03, grain: 0.02 }
        case 's3a': return { ...base, bloom: 0.1, vignette: 0.52, warm: 0.2, sat: 1.02 }
        case 's3b': return { ...base, bloom: 0.11, vignette: 0.42, haze: 0.06, warm: 0.18, sat: 1.05 }
        case 's3c': {
          // HIT-STOP 1: the glass hangs, effects bloom through the freeze
          const inStop = t >= filmT(STOP1_G) && t < filmT(STOP1_G) + STOPS[0].d
          return { ...base, bloom: inStop ? 0.2 : 0.12, bloomThresh: inStop ? 0.8 : 0.88, vignette: 0.42, haze: 0.06, warm: 0.18, sat: 1.05 }
        }
        case 's3d': {
          const inStop = t >= filmT(STOP2_G) && t < filmT(STOP2_G) + STOPS[1].d
          return { ...base, bloom: inStop ? 0.18 : 0.1, bloomThresh: inStop ? 0.8 : 0.9, vignette: 0.55, exposure: -0.06, warm: 0.1 }
        }
        case 's3e': return { ...base, bloom: 0.11, vignette: 0.42, haze: 0.06, warm: 0.18, sat: 1.05 }
        case 's3f': return { ...base, bloom: 0.1, vignette: 0.5, warm: 0.16 }
        case 's4a': return { ...base, bloom: 0.09, vignette: 0.58, exposure: -0.04, sat: 0.96 }
        case 's4b': return { ...base, bloom: 0.09, vignette: 0.6, exposure: -0.06, sat: 0.94 }
        case 's4c': return { ...base, bloom: 0.1, vignette: 0.58, exposure: -0.05, sat: 0.95 }
        case 's5a': return { ...base, bloom: 0.1, bloomThresh: 0.86, vignette: 0.55, sat: 0.98 }
        case 's5b': return { ...base, bloom: 0.14, bloomThresh: 0.85, vignette: 0.5, sat: 1.0 }
        case 's5c': return { ...base, bloom: 0.14, bloomThresh: 0.84, vignette: 0.5, sat: 1.0 }
        case 's5d': return { ...base, bloom: 0.13, bloomThresh: 0.86, vignette: 0.5 }
        case 's5e': return { ...base, bloom: 0.1, vignette: 0.52, sat: 0.98 }
        case 's6a': return { ...base, bloom: 0.08, vignette: 0.55, sat: 0.96 }
        case 's6b': return { ...base, bloom: 0.09, bloomThresh: 0.86, vignette: 0.52 }
        case 's6c': return { ...base, bloom: 0.08, vignette: 0.54, sat: 0.96 }
        case 's6d': return { ...base, bloom: 0.09, bloomThresh: 0.86, vignette: 0.54 }
        case 's6e': return { ...base, bloom: 0.06, bloomThresh: 0.9, vignette: 0.7, grain: 0.02 }
        default: return base
      }
    },
  })),
  // captions: single source of truth from the timeline; span marks the two
  // intentional cut-crossers (C6, C7), short plates get a minHold override, and
  // C4 sits over pale stone so it takes a bright ink + dark shadow
  captions: CAPS.map((c) => ({
    ...c,
    span: true,
    ...(c.short ? { minHold: 1 } : {}),
    // C6 rides the HIT-STOP-1 release and deliberately spans the s3c/s3d cut
    // (timeline spansCut); its readable span is 2.05 s, clear of both freezes
    ...(c.id === 'C6' ? { minHold: 1 } : {}),
    ...(c.id === 'C4' ? { color: '#fff6e2', shadow: '#241708', glow: '#241708', glowBlur: 10 } : {}),
    // the O of LOST is the stage-drawn toupee (P2-2); T2 takes a brighter silver
    ...(c.id === 'T1' ? { text: TITLE_O_GAP } : {}),
    ...(c.id === 'T2' ? { color: '#f4f0e4', shadow: '#0a0805', glow: '#0a0805', glowBlur: 8 } : {}),
  })),
  captionStyles: {
    title: {
      font: 'Anton', size: 132, weight: '', color: '#f2dfa0', track: 2,
      shadow: '#050608', glow: '#8a6a24', glowBlur: 22,
    },
    caption: {
      size: 40, weight: 600, color: '#ffffff',
      shadow: '#04070d', glow: '#04070d', glowBlur: 14,
    },
    kicker: {
      font: '"JetBrains Mono"', size: 26, weight: 700, color: '#d9c98f', track: 6,
      shadow: '#050608',
    },
  },
  flashes: FLASHES,
  score(kit) { if (scoreFn) return scoreFn(kit) }, // composer's module, wired when it lands
  audio: { seed: 1936, reverb: 2.4, reverbGain: 0.35 },
  // captionHold matches the timeline's own declared floor (self-check: every
  // caption visible >= 1.5 s, C7 mandated verbatim at 3.0 s) — the CAPS windows
  // are the screenplay's binding numbers, not this file's
  lint: { captionHold: 1.5, safe: { margin: 0.05, letterbox: true } },
}
