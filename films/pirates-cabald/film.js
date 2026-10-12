// PIRATES OF THE CABALD — the curse of the Black Flow. 9 shots, 96 s, full-res
// painted stage (goldflow/hairtanic lineage), sprites 2.4-3.2x nearest. Every frame
// a pure function of time: actors live on the shot clocks' WORLD g, effects age on
// REAL t so sparks/glitter bloom through the S5 hit-stops. No Math.random, no state
// across frames; burst events are baked in prepare() at absolute film seconds.
import { W, H, hash, seg, lerp, E } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import { OS, shadeHex } from './art.js'
import { score } from './score.js'
import {
  DUR, T, SHOTS, OVERTURE, HEIST, PURSUIT, REVEAL, DUEL, FLASHBACK, CHEST, DAWN, KRAKEN,
  OVERTURE_EV, HEIST_EV, PURSUIT_EV, REVEAL_EV, DUEL_EV, FLASHBACK_EV, CHEST_EV, DAWN_EV, KRAKEN_EV,
  REVEAL_LADDER, REVEAL_STRAGGLER, REGROW_LADDER, CAPTIONS, SAFE, FLASHES, CAST, GHOUL,
} from './timeline.js'

const S = {}
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

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
// camera: scale k about a centre point, optional shake offsets
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
const waltzBob = (g, ph) => Math.abs(Math.sin((g / 0.545 + ph) * Math.PI)) * 6

// per-shot staging tables (screen x of each actor; feet lines stay inside the
// letterbox band, deck plane ~930-995)
const REVEAL_POS = { 347: 170, 48: 360, 382: 550, 233: 740, 5: 930, 834: 1120, 129: 1310, 1217: 1461 }
const REVEAL_ENTRY = { 347: 0.2, 48: 0.35, 382: 0.5, 233: 0.65, 5: 0.8, 834: 0.95, 129: 1.1, 1217: 0.9 }
const REGROW_POS = { 129: 1660, 834: 1525, 5: 1390, 233: 1255, 382: 1120, 48: 985, 1217: 870, 347: 760 }
// hero row sits clear of Baldbarossa's face (liz at 630 keeps her sprite span
// 501-699 west of his mark at 760 — her beam-lit hair read as a tan slab over him)
const HERO_S7 = { vain: 210, gibbs: 340, jack: 450, liz: 560 }
const HERO_S4 = [
  ['jack', 900, 1560], ['liz', 990, 1650], ['gibbs', 1080, 1735], ['vain', 1170, 1815],
]
const FB_LINE = { 1217: 330, 129: 520, 5: 690, 347: 860, 48: 980, 382: 1120, 233: 1290, 834: 1460 }
const FB_TICK_VICTIM = { 1.5: 347, 2.5: 233, 3.5: 5, 4.5: 129 }
const BELLS = [[1150, 545], [1330, 470], [1180, 405]]
// piecewise-linear beam path through the regrow ladder (x monotonic falling)
const REGROW_PATH = REGROW_LADDER.map((m) => [m.at, REGROW_POS[m.id]]).concat([[14.5, 640]])
function regrowBeamX(g) {
  if (g <= REGROW_PATH[0][0]) return 1780
  for (let i = 1; i < REGROW_PATH.length; i++) {
    if (g <= REGROW_PATH[i][0]) {
      const [g0, x0] = REGROW_PATH[i - 1]
      const [g1, x1] = REGROW_PATH[i]
      return lerp(x0, x1, (g - g0) / (g1 - g0))
    }
  }
  return 640
}

// ============================== S1 — MOONLIT OVERTURE ==============================
function drawOverture(ctx, lt, t) {
  const g = lt
  cam(ctx, lerp(1.12, 1.0, cl(g / 9.5)), 960, 560)
  ART.sky(ctx, [[0, '#04070f'], [0.55, '#081020'], [1, '#0e1a30']], { y1: 620 })
  ART.stars(ctx, t, 3, 90, 420)
  ART.moon(ctx, 1210, 300, 110, { halo: 0.3 })
  ART.cloudBanks(ctx, t, 0.25, 4)
  // far sea, the crossing silhouette, near sea swallows the hull
  ART.sea(ctx, 600, t, {
    bands: ['#16283c', '#122338', '#0e1c30', '#0a1626', '#081120'],
    foam: 'rgba(170,195,220,0.3)', amp: 7, depth: 240, glintX: 1210, glintCol: 'rgba(224,238,255,0.55)',
  })
  const sx = lerp(1560, 700, seg(g, 1.0, 4.6))
  if (g > 0.8 && g < 5.2) {
    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.globalAlpha = 0.94
    ctx.translate(sx, 645 + Math.sin(t * 0.9) * 3)
    ctx.rotate(-0.015)
    ctx.scale(0.3, 0.3)
    ctx.drawImage(S.shipSilHero, -S.shipHero.w / 2, -S.shipHero.wl)
    ctx.restore()
    ctx.globalAlpha = 1
  }
  ART.sea(ctx, 700, t, { bands: ['#0e1c30', '#0b1728', '#081220', '#060d18'], amp: 9, depth: 380 })
  // planted coin motif: gold flecks ride the glint column early
  if (g < 4.2) {
    for (let i = 0; i < 6; i++) {
      const u = ((t * 0.22 + hash(i * 9)) % 1)
      ctx.globalAlpha = (1 - u) * 0.8
      ctx.fillStyle = '#ffcc2e'
      ctx.fillRect(1200 + Math.sin(t + i * 2) * 24, 640 + u * 300, 3.4, 3.4)
    }
    ctx.globalAlpha = 1
  }
  // the title's reflection: wavy gold strokes that straighten into lettering light
  if (g >= OVERTURE_EV.titleForm - 0.3 && g < OVERTURE_EV.scatter + 0.5) {
    const aOut = 1 - seg(g, OVERTURE_EV.scatter, OVERTURE_EV.scatter + 0.5)
    const straight = E.outCubic(seg(g, OVERTURE_EV.titleForm, OVERTURE_EV.subtitle))
    const sweep = seg(g, OVERTURE_EV.titleForm - 0.3, OVERTURE_EV.titleForm + 0.9)
    ctx.save()
    ctx.globalAlpha = aOut
    // moonbeam that sweeps in and lights the water band
    if (sweep > 0 && sweep < 1) ART.beam(ctx, lerp(300, 960, sweep), t, { topX: 1210, y0: 260, y1: 660, wTop: 50, wBot: 300, aTop: 0.2, aBot: 0.1 })
    ctx.save()
    ctx.translate(960, 575)
    ctx.scale(1, 0.24)
    const gr = ctx.createRadialGradient(0, 0, 60, 0, 0, 620)
    gr.addColorStop(0, `rgba(242,223,160,${0.22 * aOut})`)
    gr.addColorStop(0.7, `rgba(242,223,160,${0.1 * aOut})`)
    gr.addColorStop(1, 'rgba(242,223,160,0)')
    ctx.fillStyle = gr
    ctx.beginPath()
    ctx.arc(0, 0, 620, 0, 7)
    ctx.fill()
    ctx.restore()
    // ripple rows of gold dashes, wobbling until the reflection settles
    for (let row = 0; row < 4; row++) {
      const yy = 505 + row * 36
      for (let i = 0; i < 11; i++) {
        const bx = 590 + i * 76 + Math.sin(t * 1.6 + i * 2.1 + row) * (14 + (1 - straight) * 26)
        const w2 = 30 + hash(i * 7 + row * 13) * 46 * (1 - row * 0.16)
        ctx.globalAlpha = aOut * (0.5 - row * 0.09) * (0.6 + 0.4 * Math.sin(t * 2.2 + i * 1.7 + row))
        ctx.fillStyle = row % 2 ? '#fff6d8' : '#e8cf7e'
        ctx.fillRect(bx - w2 / 2, yy + Math.sin(t * 1.2 + i + row * 2) * 3, w2, 3.4)
      }
    }
    ctx.restore()
    ctx.globalAlpha = 1
  }
  // scatter: the wave passes, the letters burst to gold glitter
  ART.glitter(ctx, S.scatterFx, t, 1.4)
  const wav = seg(g, OVERTURE_EV.scatter - 0.15, OVERTURE_EV.scatter + 0.7)
  if (wav > 0 && wav < 1) {
    const wx = lerp(-200, 2120, wav)
    ctx.fillStyle = 'rgba(200,220,240,0.5)'
    for (let i = 0; i < 12; i++) {
      ctx.globalAlpha = 0.5 * Math.sin(wav * Math.PI) * (1 - i / 14)
      ctx.fillRect(wx - i * 60, 545 + Math.sin(wx * 0.02 + i) * 8, 54, 3.4)
    }
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

// ============================== S2 — THE PAPERWORK HEIST ==============================
function drawHeist(ctx, lt, t) {
  const g = lt
  // the dock itself starts receding once the ship departs
  const recede = E.outCubic(seg(g, HEIST_EV.depart + 0.8, HEIST_EV.depart + 2.4)) * -150
  const [shx, shy] = shakeXY(t, g > HEIST_EV.stamp - 0.1 && g < HEIST_EV.stamp + 0.3 ? 5 : 0)
  cam(ctx, 1.0, 960, 570, shx, shy)
  ctx.translate(recede, 0)
  // warehouse set
  ctx.drawImage(S.dock, -OS, -OS)
  // lantern glows + pools
  for (const lx of [280, 1180, 1720]) {
    ART.lantern(ctx, lx + 5, 486, 1, { r: 150, a: 0.8 })
    ctx.fillStyle = 'rgba(255,190,110,0.1)'
    ctx.beginPath()
    ctx.ellipse(lx + 5, 900, 170, 40, 0, 0, 7)
    ctx.fill()
  }
  // night water in the gap + the moored RAZOR'S EDGE (moon-glow behind her so the
  // black hull reads against the warehouse dark)
  ART.sea(ctx, 852, t, { bands: ['#0e1c30', '#0a1626', '#081120'], amp: 5, depth: 160 })
  const dep = seg(g, HEIST_EV.depart, HEIST_EV.depart + 2.6)
  const shipX = lerp(1876, 2960, E.inQuad(dep))
  const bob = Math.sin(t * 0.9) * 3
  const mglow = ctx.createRadialGradient(shipX - 200, 760, 30, shipX - 200, 760, 560)
  mglow.addColorStop(0, 'rgba(190,210,240,0.2)')
  mglow.addColorStop(1, 'rgba(190,210,240,0)')
  ctx.fillStyle = mglow
  ctx.fillRect(shipX - 760, 300, 1120, 760)
  ART.drawShip(ctx, S.shipVillain, shipX, 912 + bob, 0.4, { rot: -0.01 + Math.sin(t * 0.7) * 0.008 })
  ART.lantern(ctx, shipX - 330, 840 + bob, 1, { r: 60, a: 0.7 })
  if (dep > 0) ART.wake(ctx, shipX - 420, 916 + bob, -1, t, 300)
  // the dropped sail unrolls behind the comedy (g 3.5)
  if (g >= HEIST_EV.sail && dep < 1) {
    const unfurl = seg(g, HEIST_EV.sail, HEIST_EV.sail + 1.1)
    const sy0 = 912 + bob - 640 * 0.4
    ctx.fillStyle = '#ddd3b8'
    ctx.globalAlpha = 0.85
    ctx.fillRect(shipX - 44, sy0, 88, 150 * unfurl)
    ctx.globalAlpha = 1
  }
  // mooring rope: taut to the bollard, slipping at the depart
  ctx.strokeStyle = '#8a6f48'
  ctx.lineWidth = 5
  ctx.beginPath()
  if (dep <= 0) {
    ctx.moveTo(1560, 772)
    ctx.quadraticCurveTo(1680, 830, Math.min(1980, shipX - 500), 880)
  } else {
    const slip = seg(g, HEIST_EV.depart, HEIST_EV.depart + 0.9)
    ctx.moveTo(1560, 772)
    ctx.quadraticCurveTo(1620, 800 + slip * 60, 1600 - slip * 30, 850 + slip * 60)
  }
  ctx.stroke()
  // crew silhouettes quietly working the departing deck
  if (dep < 1) {
    sprite(ctx, S.gibbsSil, shipX - 180, 912 + bob - 190 * 0.4, { sx: 1.05, sy: 1.05, alpha: 0.9 })
    sprite(ctx, S.vainSil, shipX - 90, 912 + bob - 150 * 0.4, { sx: 0.95, sy: 0.95, alpha: 0.9 })
  }
  // JACK strides in with the permit
  const jx = g < HEIST_EV.papers ? lerp(-100, 620, E.outCubic(seg(g, 0.1, HEIST_EV.papers + 0.5))) : 620
  const jWalking = g < 0.7
  sprite(ctx, S.jack, jx, 942, { ...(jWalking ? walkCyc(t * 7) : stand), sx: 2.6, sy: 2.6 })
  ART.tricorn(ctx, jx + 2, crownY(S.jack, 942, 2.6), 2.6 * 0.52, { feather: '#a03030' })
  // permit in hand until the handover
  if (g < 1.8) ART.permit(ctx, jx + 40, crownY(S.jack, 942, 2.6) + 90, -0.15 + Math.sin(t * 2) * 0.03, 0.5)
  // the OFFICER inspects, stamps with the coin, loses his hat, signals with his scalp
  const ox = 980
  const oLean = g >= HEIST_EV.doubleTake ? -0.14 : g > 1.6 && g < 2.6 ? 0.1 : 0
  const oHop = g >= HEIST_EV.doubleTake && g < HEIST_EV.doubleTake + 0.4 ? -Math.sin((g - HEIST_EV.doubleTake) * 12) * 12 : 0
  sprite(ctx, S.officer, ox, 946 + oHop, { lift: [2, 0], stride: [1, 0], lean: oLean, sx: 2.55, sy: 2.55 })
  if (g < HEIST_EV.hat) ART.bicorne(ctx, ox + 2, crownY(S.officer, 946, 2.55), 2.55 * 0.5, {})
  else {
    // the tricorn blows off and tumbles to the planks
    const hu = seg(g, HEIST_EV.hat, HEIST_EV.hat + 1.0)
    if (hu < 1) {
      ctx.save()
      ctx.translate(lerp(ox, ox + 170, hu), crownY(S.officer, 946, 2.55) - 30 - Math.sin(hu * Math.PI) * 130)
      ctx.rotate(hu * 9)
      ctx.scale(1.28, 1.28)
      ctx.fillStyle = '#101722'
      ctx.beginPath()
      ctx.moveTo(-66, 2)
      ctx.quadraticCurveTo(0, -46, 66, 2)
      ctx.quadraticCurveTo(0, 16, -66, 2)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    } else {
      // settled upside-down on the planks, with its shadow so it reads as a hat
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.ellipse(ox + 150, 942, 66, 12, 0, 0, 7)
      ctx.fill()
      ctx.save()
      ctx.translate(ox + 140, 922)
      ctx.rotate(2.75)
      ctx.scale(1.28, 1.28)
      ctx.fillStyle = '#101722'
      ctx.beginPath()
      ctx.moveTo(-66, 2)
      ctx.quadraticCurveTo(0, -46, 66, 2)
      ctx.quadraticCurveTo(0, 16, -66, 2)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#1a2432'
      ctx.beginPath()
      ctx.moveTo(-30, -2)
      ctx.quadraticCurveTo(-26, -26, 0, -28)
      ctx.quadraticCurveTo(26, -26, 30, -2)
      ctx.quadraticCurveTo(0, -10, -30, -2)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }
  // permit travels to the officer, then the COIN STAMP (gold seal pops on)
  if (g >= 1.8 && g < HEIST_EV.stamp + 1.2) {
    const px = g < 2.2 ? lerp(jx + 40, ox + 40, seg(g, 1.8, 2.2)) : ox + 40
    ART.permit(ctx, px, 800, -0.1, 0.5)
    if (g >= HEIST_EV.stamp) {
      const pop = E.outBack(seg(g, HEIST_EV.stamp, HEIST_EV.stamp + 0.3))
      ctx.save()
      ctx.translate(px + 2, 796)
      ctx.rotate(-0.2)
      ctx.scale(0.5 * pop, 0.5 * pop)
      ctx.globalAlpha = 0.9
      ctx.fillStyle = '#ffcc2e'
      ctx.beginPath()
      ctx.arc(0, 0, 22, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#e08a0c'
      ctx.beginPath()
      ctx.arc(0, 0, 15, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#6e4000'
      ctx.beginPath()
      ctx.arc(0, 0, 6, 0, 7)
      ctx.fill()
      ctx.restore()
      const glow = 1 - seg(g, HEIST_EV.stamp, HEIST_EV.stamp + 0.4)
      if (glow > 0) {
        const rg = ctx.createRadialGradient(px + 2, 796, 4, px + 2, 796, 120)
        rg.addColorStop(0, `rgba(255,230,150,${0.5 * glow})`)
        rg.addColorStop(1, 'rgba(255,230,150,0)')
        ctx.fillStyle = rg
        ctx.fillRect(px - 120, 680, 250, 240)
      }
    }
  }
  // scalp heliograph: proud glints on the bare dome, aimed at the ship
  if (g >= HEIST_EV.doubleTake) {
    const k = (t * 0.9) % 1
    ART.starGlint(ctx, ox + 4, crownY(S.officer, 946, 2.55) + 26, 60, k)
    if (k > 0.2 && k < 0.55) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const bgr = ctx.createLinearGradient(ox, crownY(S.officer, 946, 2.55) + 26, ox - 500, crownY(S.officer, 946, 2.55) - 60)
      bgr.addColorStop(0, 'rgba(255,250,230,0.3)')
      bgr.addColorStop(1, 'rgba(255,250,230,0)')
      ctx.fillStyle = bgr
      ctx.beginPath()
      ctx.moveTo(ox, crownY(S.officer, 946, 2.55) + 26)
      ctx.lineTo(ox - 520, crownY(S.officer, 946, 2.55) - 110)
      ctx.lineTo(ox - 520, crownY(S.officer, 946, 2.55) - 10)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }
  ctx.restore()
}

// ============================== S3 — BLACK SAILS ON THE HORIZON ==============================
function drawPursuit(ctx, lt, t) {
  const g = lt
  const cannonAge = g - PURSUIT_EV.cannon
  const [shx, shy] = shakeXY(t, cannonAge > 0 && cannonAge < 0.5 ? 8 * (1 - cannonAge / 0.5) : 0)
  if (g < PURSUIT_EV.chase) {
    // spyglass POV: the RAZOR'S EDGE ghosts out of the fog
    const wob = Math.sin(t * 0.8) * 26
    cam(ctx, 1.0, 960, 540, wob * 0.4, Math.cos(t * 0.6) * 14)
    ART.sky(ctx, [[0, '#05080f'], [1, '#0c1524']], { y1: 620 })
    ART.moon(ctx, 1150, 235, 66, { halo: 0.24 })
    ART.sea(ctx, 600, t, { bands: ['#12233a', '#0e1c30', '#0a1626', '#071120'], amp: 6, depth: 200, foam: 'rgba(170,195,220,0.25)' })
    ART.fog(ctx, t, 9, 8, 620, 0.3)
    const ghost = 0.5 + 0.45 * seg(g, 0.2, 1.9)
    ctx.save()
    ctx.globalAlpha = ghost
    ART.drawShip(ctx, S.shipVillain, 1020, 700, 0.2, { rot: Math.sin(t * 0.8) * 0.012 })
    ctx.restore()
    ctx.globalAlpha = 1
    ART.lantern(ctx, 940, 660, 1, { r: 46, a: 0.5 })
    ART.fog(ctx, t, 5, 5, 760, 0.24)
    ctx.restore()
    ctx.save()
    ART.spyglass(ctx, 960, 540, 470, t)
    ctx.restore()
    return
  }
  // wide chase intercut
  cam(ctx, 1.0, 960, 560, shx, shy)
  ART.sky(ctx, [[0, '#04070f'], [0.6, '#081020'], [1, '#0d1930']], { y1: 560 })
  ART.stars(ctx, t, 8, 70, 380)
  ART.moon(ctx, 1240, 210, 84, { halo: 0.26 })
  ART.cloudBanks(ctx, t, 0.55, 6)
  ART.sea(ctx, 540, t, {
    bands: ['#152640', '#112036', '#0d1a2c', '#0a1424', '#070e1a'],
    foam: 'rgba(170,195,220,0.32)', amp: 8, depth: 300, glintX: 1240, glintCol: 'rgba(224,238,255,0.45)',
  })
  ART.fog(ctx, t, 11, 4, 560, 0.16)
  const close = seg(g, PURSUIT_EV.chase, PURSUIT_EV.grapples + 0.6)
  const heroBob = Math.sin(t * 1.1) * 4
  ART.drawShip(ctx, S.shipHero, lerp(430, 520, close), 940 + heroBob, 0.6, {
    rot: -0.02 + Math.sin(t * 1.2) * 0.012, flipX: true,
  })
  ART.wake(ctx, 190 + close * 90, 946 + heroBob, 1, t, 340)
  const vilX = lerp(1620, 1330, E.outCubic(close))
  const vilBob = Math.sin(t * 1.1 + 2) * 5
  ART.drawShip(ctx, S.shipVillain, vilX, 872 + vilBob, 0.44, { rot: 0.015 + Math.sin(t * 1.4 + 1) * 0.014 })
  ART.wake(ctx, vilX + 330, 878 + vilBob, 1, t, 260)
  // bow-chaser: flash, smoke, the ball arcs wide, near-miss splash
  if (cannonAge > 0) {
    const fg2 = 1 - cannonAge / 0.5
    if (fg2 > 0) {
      const bg = ctx.createRadialGradient(vilX - 380, 800, 4, vilX - 380, 800, 190)
      bg.addColorStop(0, `rgba(255,230,170,${0.9 * fg2})`)
      bg.addColorStop(1, 'rgba(255,230,170,0)')
      ctx.fillStyle = bg
      ctx.fillRect(vilX - 580, 610, 420, 380)
    }
    // smoke puffs hang and drift for a full second
    const r = 110
    for (let i = 0; i < 8; i++) {
      const u = cannonAge * (0.45 + hash(i * 7) * 0.45)
      ctx.globalAlpha = Math.max(0, 0.55 - u * 0.4)
      ctx.fillStyle = '#a8b6c6'
      ctx.beginPath()
      ctx.arc(vilX - 380 - u * 240 + hash(i) * 46, 786 - u * 70 + hash(i * 3) * 34, 16 + u * r, 0, 7)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  const ballU = seg(g, PURSUIT_EV.cannon, PURSUIT_EV.splash)
  if (ballU > 0 && ballU < 1) {
    const bx = lerp(vilX - 380, 690, ballU)
    const by = 800 - Math.sin(ballU * Math.PI) * 330
    ctx.fillStyle = '#1a1e26'
    ctx.beginPath()
    ctx.arc(bx, by, 9, 0, 7)
    ctx.fill()
  }
  ART.splash(ctx, 690, 880, g - PURSUIT_EV.splash, {})
  // the near-miss jet: a white spike that stands for the first third of a second
  const spAge = g - PURSUIT_EV.splash
  if (spAge > 0 && spAge < 0.45) {
    const k = Math.sin(cl(spAge / 0.45) * Math.PI)
    ctx.fillStyle = `rgba(226,238,248,${0.85 * k})`
    ctx.beginPath()
    ctx.ellipse(690, 872 - k * 46, 16 + k * 10, 30 + k * 60, 0, 0, 7)
    ctx.fill()
  }
  ART.ripple(ctx, 690, 900, g - PURSUIT_EV.splash, 1.6)
  // grapples fly; the cut lands as the first hook bites the hero rail
  if (g >= PURSUIT_EV.grapples) {
    ART.grapple(ctx, vilX - 200, 800, 760, 760, seg(g, PURSUIT_EV.grapples, PURSUIT_EV.cut + 0.1))
    ART.grapple(ctx, vilX - 60, 820, 980, 780, seg(g, PURSUIT_EV.grapples + 0.25, PURSUIT_EV.cut + 0.35))
    const bite = g - (PURSUIT_EV.cut + 0.1)
    if (bite > 0 && bite < 0.2) ART.starGlint(ctx, 760, 758, 50, bite / 0.2)
  }
  ctx.restore()
}

// ============================== S4 — THE MOONLIGHT REVEAL ==============================
function drawReveal(ctx, lt, t) {
  const g = lt
  const part = E.outCubic(seg(g, REVEAL_EV.moonBreaks, REVEAL_EV.moonBreaks + 1.1))
  cam(ctx, 1.06, 960, 600)
  ART.sky(ctx, [[0, '#04070f'], [0.6, '#081020'], [1, '#0e1a30']], { y1: 700 })
  if (part > 0.2) ART.stars(ctx, t, 12, 60, 420)
  ART.moon(ctx, 1210, 190, 96, { halo: 0.16 + 0.3 * part })
  ART.cloudBanks(ctx, t, part, 4)
  ART.sea(ctx, 660, t, { bands: ['#122440', '#0e1d34', '#0a1626', '#081120'], amp: 5, depth: 120 })
  ctx.drawImage(S.deck, -OS, -OS)
  // lantern warmth dies as the moon takes over
  const lampA = 1 - part * 0.8
  for (const lx of [340, 1080, 1760]) {
    ART.lantern(ctx, lx + 4, 656, lampA, { r: 130, a: 0.75 })
  }
  // THE beam: one hard moonbeam sweeping port -> starboard
  if (g >= REVEAL_EV.beamStart - 0.2 && g <= REVEAL_EV.beamEnd + 0.6) {
    const bx = lerp(-200, 2120, seg(g, REVEAL_EV.beamStart, REVEAL_EV.beamEnd))
    const fade = Math.min(seg(g, REVEAL_EV.beamStart - 0.2, REVEAL_EV.beamStart + 0.3), 1 - seg(g, REVEAL_EV.beamEnd, REVEAL_EV.beamEnd + 0.6))
    ctx.save()
    ctx.globalAlpha = fade
    ART.beam(ctx, bx, t, { topX: 1210, y0: 210, y1: 960, wTop: 70, wBot: 300, aTop: 0.4, aBot: 0.16, core: 0.34 })
    ctx.restore()
  }
  // boarders: silhouette over the rail, land, stand, transform on the beam
  const actors = []
  for (const m of REVEAL_LADDER.concat([REVEAL_STRAGGLER])) {
    const x = REVEAL_POS[m.id]
    const eT = REVEAL_ENTRY[m.id]
    const rig = S.crew[m.id]
    if (g < eT) continue
    const drop = seg(g, eT, eT + 0.45)
    const feet = lerp(668, 930, E.outCubic(drop))
    const k = seg(g, m.at, m.end) // ghoul crossfade
    const near = Math.abs(x - lerp(-200, 2120, seg(g, REVEAL_EV.beamStart, REVEAL_EV.beamEnd))) < 240
    actors.push({
      id: m.id, x, feet, k, near,
      draw: (a) => {
        const o = {
          sx: 2.55, sy: m.id === 5 ? 2.35 : 2.55,
          lift: [2, 0], stride: [1, 0], lean: drop < 1 ? -0.12 : 0,
          rot: drop < 1 ? -0.14 * (1 - drop) : 0,
          glow: a.near && a.k < 1 ? '#cfe0ff' : undefined,
          glowA: a.near && a.k < 1 ? 0.3 : 0,
        }
        if (a.k < 1) sprite(ctx, rig.sil, a.x, a.feet, { ...o, alpha: 1 - a.k * 0.85 })
        if (a.k > 0) sprite(ctx, rig.ghoul, a.x, a.feet, { ...o, alpha: a.k })
      },
    })
  }
  // heroes back away in horror-comedy as the beam finds the crew
  for (const [key, x0, x1] of HERO_S4) {
    const back = seg(g, REVEAL_EV.moonBreaks + 0.3, REVEAL_EV.moonBreaks + 2.6)
    const x = lerp(x0, x1, E.outCubic(back))
    const jit = g > REVEAL_EV.minuet ? Math.sin(g * 9 + x) * 2 : 0
    const lean = back > 0 && back < 1 ? -0.1 : -0.04
    actors.push({
      feet: 975, x, draw: () => {
        sprite(ctx, S[key], x + jit, 975, { lift: [2, 0], stride: [1, 0], lean, sx: 2.7, sy: 2.7 })
        if (key === 'jack') ART.tricorn(ctx, x + 2, crownY(S.jack, 975, 2.7), 2.7 * 0.52, { feather: '#a03030' })
      },
    })
  }
  actors.sort((a, b) => a.feet - b.feet)
  for (const a of actors) a.draw(a)
  // the mast occludes only above the rail (deck actors stand in front of its
  // base); the straggler's head ducks behind it during the sweep
  ctx.drawImage(S.deck, 1436 + OS, 0, 50, 700 + OS, 1436, -OS, 50, 700 + OS)
  // transform ticks: glitter puff + one-frame chrome glint (baked at absolute time)
  ART.glitter(ctx, S.revealFx, t, 0.9)
  for (const m of REVEAL_LADDER.concat([REVEAL_STRAGGLER])) {
    const age = t - REVEAL.abs(m.at)
    if (age > 0 && age < 0.5) ART.starGlint(ctx, REVEAL_POS[m.id], crownY(S.crew[m.id].ghoul, 930, 2.55) + 14, 70, age / 0.5)
  }
  // the minuet: the curse dances them in a slow, terrible circle
  if (g >= REVEAL_EV.minuet) {
    const u = seg(g, REVEAL_EV.minuet, REVEAL_EV.minuet + 0.8)
    const n = REVEAL_LADDER.length + 1
    const dancers = []
    for (let i = 0; i < n; i++) {
      const m = i < REVEAL_LADDER.length ? REVEAL_LADDER[i] : REVEAL_STRAGGLER
      if (g < REVEAL_ENTRY[m.id]) continue
      const a0 = (i / n) * Math.PI * 2
      const ang = a0 + (g - REVEAL_EV.minuet) * 0.42
      const cx0 = 800 + Math.cos(ang) * 330
      const cy0 = 906 + Math.sin(ang) * 30
      dancers.push({ m, x: lerp(REVEAL_POS[m.id], cx0, u), feet: lerp(930, cy0, u), ang })
    }
    dancers.sort((a, b) => a.feet - b.feet)
    for (const d of dancers) {
      const rig = S.crew[d.m.id]
      const bob = waltzBob(g - REVEAL_EV.minuet, d.m.at)
      sprite(ctx, rig.ghoul, d.x, d.feet - bob, { lift: [3, 1], stride: [2, -2], lean: 0.05 * Math.sin((g - REVEAL_EV.minuet) * 3 + d.m.at), sx: 2.55, sy: d.m.id === 5 ? 2.35 : 2.55 })
    }
    // gag 4: a ghoul politely returns the dropped comb handle
    if (g >= 9.3) {
      const out = seg(g, 9.3, 9.9)
      const gx = lerp(560, 1420, out)
      sprite(ctx, S.crew[382].ghoul, gx, 972 - waltzBob(g, 1), { lift: [4, 0], stride: [1, 0], lean: 0.08, sx: 2.55, sy: 2.55, flip: true })
      ART.comb(ctx, gx + 40, 830, -0.4, 1.6)
    }
  }
  ctx.restore()
}

// ============================== S5 — CUTLASSES AND COIN ==============================
function drawDuel(ctx, lt, t) {
  const { g, stop, sl } = DUEL.warp(lt)
  const reefAge = t - DUEL.abs(DUEL_EV.reef)
  const shakeAmp = reefAge > 0 ? 10 * Math.exp(-reefAge * 2.4) : 0
  const [shx, shy] = shakeXY(t, shakeAmp)
  const lurch = reefAge > 0 ? Math.sin(reefAge * 6) * 0.014 * Math.exp(-reefAge * 1.6) : 0
  cam(ctx, 1.18, 960, 690, shx, shy)
  ctx.rotate(lurch)
  ART.sky(ctx, [[0, '#04070f'], [0.6, '#081020'], [1, '#0e1a30']], { y1: 700 })
  ART.stars(ctx, t, 12, 60, 420)
  ART.moon(ctx, 1210, 170, 96, { halo: 0.42 })
  ART.sea(ctx, 660, t, { bands: ['#122440', '#0e1d34', '#0a1626', '#081120'], amp: 5, depth: 120 })
  ctx.drawImage(S.deck, -OS, -OS)
  // three rigging bells (they will ring the coin ricochet)
  for (let i = 0; i < 3; i++) {
    const [bx, by] = BELLS[i]
    ctx.strokeStyle = '#57422a'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(1452, 160)
    ctx.quadraticCurveTo((1452 + bx) / 2, by - 90, bx, by - 22)
    ctx.stroke()
    ctx.fillStyle = '#ffcc2e'
    ctx.beginPath()
    ctx.moveTo(bx - 12, by - 20)
    ctx.quadraticCurveTo(bx - 14, by + 6, bx - 9, by + 8)
    ctx.lineTo(bx + 9, by + 8)
    ctx.quadraticCurveTo(bx + 14, by + 6, bx + 12, by - 20)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#e08a0c'
    ctx.beginPath()
    ctx.arc(bx, by + 10, 3.4, 0, 7)
    ctx.fill()
    const ringA = g - (DUEL_EV.ricochet + i * 0.15)
    if (ringA > 0 && ringA < 0.4) {
      ctx.strokeStyle = `rgba(255,246,176,${0.8 * (1 - ringA / 0.4)})`
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.ellipse(bx, by, 20 + ringA * 90, (20 + ringA * 90) * 0.4, 0, 0, 7)
      ctx.stroke()
    }
  }
  // ghoul crew waltzes deep in the background throughout
  const waltzers = [1217, 834, 129]
  waltzers.forEach((id, i) => {
    const bob = waltzBob(g, i * 1.3)
    sprite(ctx, S.crew[id].ghoul, 350 + i * 230, 880 - bob, {
      lift: [3, 1], stride: [2, -2], lean: 0.05 * Math.sin(g * 3 + i), sx: 1.95, sy: 1.95, alpha: 0.92,
    })
  })
  // gag 5: the halyard brush sets the wheel spinning; the vain one chases it
  if (g >= DUEL_EV.swing) {
    const wa = (g - DUEL_EV.swing) * 7
    ctx.save()
    ctx.translate(240, 812)
    ctx.rotate(wa)
    ctx.strokeStyle = '#57422a'
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.arc(0, 0, 62, 0, 7)
    ctx.stroke()
    ctx.lineWidth = 7
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20)
      ctx.lineTo(Math.cos(a) * 94, Math.sin(a) * 94)
      ctx.stroke()
    }
    ctx.restore()
    if (g >= DUEL_EV.swing + 0.5) {
      // the chase stays clear of the duel space (the wheel is port-side)
      const cx0 = lerp(430, 640, seg(g, DUEL_EV.swing + 0.5, DUEL_EV.swing + 2.4))
      sprite(ctx, S.vain, cx0, 930, { ...(cx0 < 630 ? walkCyc(g * 11, 7) : stand), sx: 2.1, sy: 2.1 })
    }
  }
  // ---- the duelists ----
  const preLock = g < DUEL_EV.lock
  const swung = g >= DUEL_EV.swing && g < DUEL_EV.swingEnd
  let jx, jf = 952, jrot = 0, jLean = 0, bladeJ = { x: 0, y: 0, ang: -0.5 }, showJack = true
  let bx2, bf = 952, bLean = 0, bladeB = { x: 0, y: 0, ang: 0.5 }, earring = true
  if (preLock) {
    const ph = g * 2.2
    jx = 850 + Math.sin(ph) * 36
    bx2 = 1170 + Math.sin(ph + Math.PI) * 36
    jLean = Math.sin(ph + 1) * 0.06
    bLean = Math.sin(ph + 2.2) * 0.06
    const sw1 = seg(g, 2.2, 2.55)
    const sw2 = seg(g, 3.6, 3.95)
    bladeJ.ang = -0.5 + (sw1 > 0 && sw1 < 1 ? Math.sin(sw1 * Math.PI) * -1.1 : 0) + (sw2 > 0 && sw2 < 1 ? Math.sin(sw2 * Math.PI) * 1.2 : 0)
    bladeB.ang = 0.5 + Math.sin(ph * 1.3) * 0.12
    // closing the distance into the lock
    const lockIn = seg(g, DUEL_EV.lock - 0.5, DUEL_EV.lock)
    jx = lerp(jx, 938, lockIn)
    bx2 = lerp(bx2, 1058, lockIn)
    bladeJ.ang = lerp(bladeJ.ang, -2.05, lockIn)
    bladeB.ang = lerp(bladeB.ang, 2.05, lockIn)
  } else if (g < DUEL_EV.swing) {
    jx = 938
    bx2 = 1058
    bladeJ.ang = -2.05
    bladeB.ang = 2.05
    bLean = 0.1
  } else if (swung) {
    // the halyard crane swing
    const su = seg(g, DUEL_EV.swing, DUEL_EV.swingEnd)
    const ang = lerp(0.62, -0.55, su)
    jx = 1428 + Math.sin(ang) * 700
    jf = 236 + Math.cos(ang) * 700 + 62
    jrot = -ang * 0.6
    bx2 = 1108
    bLean = -0.06
    bladeJ.ang = -0.3 - su * 0.5
    bladeB.ang = 0.6
    showJack = true
  } else {
    // recovered: closing for the final parry
    const closeIn = seg(g, DUEL_EV.swingEnd, DUEL_EV.slice)
    jx = lerp(820, 900, closeIn)
    bx2 = lerp(1108, 1044, closeIn)
    const swF = seg(g, DUEL_EV.slice - 0.35, DUEL_EV.slice)
    bladeJ.ang = -0.6 + (swF > 0 ? Math.sin(swF * Math.PI) * -1.4 : 0)
    bladeB.ang = 0.6
    bLean = swF > 0 ? -0.1 : 0.04
  }
  if (g >= DUEL_EV.slice) {
    // after the slice: the villain clutches his ear
    const after = g - DUEL_EV.slice
    bLean = -0.12 + Math.sin(after * 8) * 0.03 * Math.exp(-after)
    earring = false
    if (g > DUEL_EV.reef) bLean = -0.05
  }
  // draw order: villain behind, hero in front; the whole Cabald stays ghoul-pale
  // under the moon until their regrow slots
  const bossRig = S.crew[347].ghoul
  const bHeadY = crownY(bossRig, bf, 2.7)
  sprite(ctx, bossRig, bx2, bf, { lift: [2, 0], stride: [1, 0], lean: bLean, sx: 2.7, sy: 2.7 })
  ART.tricorn(ctx, bx2 + 2, crownY(bossRig, bf, 2.7), 2.7 * 0.5, { col: '#151318', col2: '#1d1a22', trim: '#6a5432' })
  if (earring) {
    // THE LAST COIN hangs at his left ear (viewer right), a hoop below the stud
    const ex = bx2 + 46, ey = bHeadY + 40
    ctx.fillStyle = '#ffcc2e'
    ctx.beginPath()
    ctx.ellipse(ex, ey, 7, 8, 0.2, 0, 7)
    ctx.fill()
    ctx.strokeStyle = '#e0a52e'
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.arc(ex, ey + 13, 6.5, 0, 7)
    ctx.stroke()
    ctx.fillStyle = '#6e4000'
    ctx.beginPath()
    ctx.ellipse(ex, ey, 3.6, 4.4, 0.2, 0, 7)
    ctx.fill()
  }
  const lockPose = stop != null && stop.g === DUEL_EV.lock
  if (!lockPose) ART.cutlass(ctx, bx2 + 34, bf - 150, bladeB.ang, 1.05, { flipX: true })
  sprite(ctx, S.jack, jx, jf, { lift: [2, 0], stride: [1, 0], lean: jLean, rot: jrot, sx: 2.7, sy: 2.7 })
  ART.tricorn(ctx, jx + 2, crownY(S.jack, jf, 2.7), 2.7 * 0.52, { feather: '#a03030' })
  if (showJack && !lockPose) ART.cutlass(ctx, jx + 36, jf - 150, bladeJ.ang, 1.05)
  // blades lock overhead: crossed at the mid point
  if (lockPose) {
    ART.cutlass(ctx, 950, 760, -1.85, 1.05)
    ART.cutlass(ctx, 1000, 760, 1.85, 1.05, { flipX: true })
    const k = 1 - sl / 0.16
    const rg = ctx.createRadialGradient(975, 740, 6, 975, 740, 150)
    rg.addColorStop(0, `rgba(255,246,200,${0.5 * k})`)
    rg.addColorStop(1, 'rgba(255,246,200,0)')
    ctx.fillStyle = rg
    ctx.fillRect(780, 530, 390, 390)
    // gag 6: the parrot lowers a tiny white flag between the blades (effects move
    // through the freeze, actors don't)
    const fy = 640 + sl * 220
    ART.parrot(ctx, 975, fy, 1.4, t, { phase: 2 })
    ctx.strokeStyle = '#57422a'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(975, fy + 6)
    ctx.lineTo(975, fy - 34)
    ctx.stroke()
    ctx.fillStyle = '#f2f0e6'
    ctx.fillRect(975, fy - 34, 26, 12)
  }
  // slice freeze: coin hangs free of the ear, spark through
  if (stop && stop.g === DUEL_EV.slice) {
    const k = 1 - sl / 0.22
    const rg = ctx.createRadialGradient(1075, 690, 6, 1075, 690, 170)
    rg.addColorStop(0, `rgba(255,240,180,${0.55 * k})`)
    rg.addColorStop(1, 'rgba(255,240,180,0)')
    ctx.fillStyle = rg
    ctx.fillRect(860, 470, 430, 430)
    ctx.fillStyle = '#ffcc2e'
    ctx.beginPath()
    ctx.ellipse(1075, 620 + sl * 60, 8, 10, sl * 6, 0, 7)
    ctx.fill()
  }
  // spark bursts baked at the pins (age on real t, bloom through the freeze)
  ART.glitter(ctx, [S.lockBurst, S.sliceBurst], t, 0.7)
  // coin ricochet off the three bells, then the parrot snatches it
  if (g >= DUEL_EV.ricochet && g < DUEL_EV.catch + 1.2) {
    const ru = seg(g, DUEL_EV.ricochet, DUEL_EV.catch)
    const keys = [[1075, 660], BELLS[0], BELLS[1], BELLS[2], [1240, 420]]
    const seg2 = ru * (keys.length - 1)
    const i0 = Math.min(keys.length - 2, Math.floor(seg2))
    const fu = seg2 - i0
    const cxp = lerp(keys[i0][0], keys[i0 + 1][0], fu)
    const cyp = lerp(keys[i0][1], keys[i0 + 1][1], fu) - Math.sin(fu * Math.PI) * 40
    const spin = g * 14
    ctx.fillStyle = '#ffcc2e'
    ctx.beginPath()
    ctx.ellipse(cxp, cyp, Math.max(3, Math.abs(Math.cos(spin)) * 9), 9, 0, 0, 7)
    ctx.fill()
    ctx.strokeStyle = '#6e4000'
    ctx.lineWidth = 1.4
    ctx.stroke()
  }
  if (g >= DUEL_EV.catch) {
    const cu = seg(g, DUEL_EV.catch, DUEL_EV.catch + 0.3)
    const px = lerp(1150, 1240, cu)
    const py = lerp(300, 420, cu)
    ART.parrot(ctx, px, py, 1.7, t, { coin: true, phase: 1 })
    if (g > DUEL_EV.catch + 0.3) {
      const ou = seg(g, DUEL_EV.catch + 0.3, DUEL_EV.catch + 1.1)
      ART.parrot(ctx, lerp(1240, 2050, ou), lerp(420, 60, ou), 1.7, t, { coin: true, phase: 1 })
    }
  }
  // the mast occludes only above the rail
  ctx.drawImage(S.deck, 1436 + OS, 0, 50, 700 + OS, 1436, -OS, 50, 700 + OS)
  ctx.restore()
}

// ============================== S6 — 882 COINS (flashback tableau) ==============================
function drawFlashback(ctx, lt, t) {
  const g = Math.min(lt, FLASHBACK_EV.lid + 0.4) // the tableau freezes at the gag
  const pan1 = lerp(-50, 55, seg(g, 0.5, 4.5))
  const pan2 = lerp(55, -20, seg(g, 4.5, 6.5))
  cam(ctx, 1.1, 960 + pan1 + pan2, 570)
  // smugglers' vault backdrop, gold-lit
  const bgG = ctx.createLinearGradient(0, 0, 0, H)
  bgG.addColorStop(0, '#241a10')
  bgG.addColorStop(0.6, '#3a2a16')
  bgG.addColorStop(1, '#1c1208')
  ctx.fillStyle = bgG
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  for (const nx of [240, 700, 1160, 1620]) {
    ctx.fillStyle = 'rgba(255,196,110,0.08)'
    ctx.beginPath()
    ctx.moveTo(nx - 90, 700)
    ctx.lineTo(nx - 90, 260)
    ctx.quadraticCurveTo(nx, 160, nx + 90, 260)
    ctx.lineTo(nx + 90, 700)
    ctx.closePath()
    ctx.fill()
  }
  // hanging oil lamps
  for (const lx of [480, 960, 1440]) {
    ctx.strokeStyle = '#1c1208'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(lx, -OS)
    ctx.lineTo(lx, 190)
    ctx.stroke()
    ART.lantern(ctx, lx, 214, 1, { r: 170, a: 0.75 })
  }
  // gold dust motes
  for (let i = 0; i < 26; i++) {
    const u = ((t * 0.05 + hash(i * 7)) % 1)
    ctx.globalAlpha = 0.35 * Math.sin(u * Math.PI)
    ctx.fillStyle = '#ffcc2e'
    ctx.fillRect(200 + hash(i * 3) * 1500, 200 + u * 700, 2.6, 2.6)
  }
  ctx.globalAlpha = 1
  // floor
  ctx.fillStyle = '#2c1e10'
  ctx.fillRect(-OS, 900, W + OS * 2, H + OS - 900)
  ctx.fillStyle = 'rgba(255,196,110,0.12)'
  ctx.fillRect(-OS, 900, W + OS * 2, 5)
  // the gold vignette frame (painted border, not an iris)
  ctx.strokeStyle = '#c9a45c'
  ctx.lineWidth = 26
  ctx.strokeRect(-OS + 24, -OS + 24, W + OS * 2 - 48, H + OS * 2 - 48)
  ctx.strokeStyle = 'rgba(255,233,160,0.5)'
  ctx.lineWidth = 4
  ctx.strokeRect(-OS + 44, -OS + 44, W + OS * 2 - 88, H + OS * 2 - 88)
  // ---- the young, HAIRY Cabald ----
  const pose = (id) => {
    // freeze at the gag: everyone holds their pose from g 5.0 on
    const gg = Math.min(g, FLASHBACK_EV.freeze)
    const bob = Math.sin(gg * 1.4 + id * 0.7) * 3
    return { bob, gg }
  }
  const order = [1217, 129, 5, 347, 48, 382, 233, 834]
  for (const id of order) {
    const x = FB_LINE[id]
    const rig = S.crew[id].base
    const { bob } = pose(id)
    const carrying = id === 48 || id === 382
    const lean = carrying ? (x < 1050 ? -0.06 : 0.06) : 0
    sprite(ctx, rig, x, 920 - bob, { lift: [2, 0], stride: [1, 0], lean, sx: 2.45, sy: 2.45 })
    // the living hair (baldify ticks slide it off like a pulled tablecloth)
    const tick = Object.keys(FB_TICK_VICTIM).find((k) => FB_TICK_VICTIM[k] === id)
    let hairK = 1
    let slide = 0
    if (tick !== undefined) {
      const tk = Number(tick)
      slide = seg(g, tk, tk + 0.5)
      hairK = 1 - seg(g, tk + 0.1, tk + 0.5)
      if (g < tk) {
        // anticipation: the wig sits proud
      }
    }
    ART.paintedHair(ctx, x, crownY(rig, 920 - bob, 2.45) + 6, ART.HAIR_STYLE[id], hairK, t, ART.LIVING_HAIR[id], { slide })
    // the fallen wig lands as a limp rag
    if (slide >= 1) {
      const fall = seg(g, (tick ?? 0) + 0.4, (tick ?? 0) + 1.0)
      if (fall < 1) {
        ctx.save()
        ctx.translate(x + 30, 900 + fall * 30)
        ctx.rotate(fall * 2.4)
        ctx.scale(1, 1 - fall * 0.5)
        ART.paintedHair(ctx, 0, 0, ART.HAIR_STYLE[id], 0.8, t, ART.LIVING_HAIR[id], {})
        ctx.restore()
      } else {
        ctx.save()
        ctx.translate(x + 30, 930)
        ART.paintedHair(ctx, 0, 0, ART.HAIR_STYLE[id], 0.8, t, ART.LIVING_HAIR[id], {})
        ctx.restore()
      }
    }
  }
  // the Flowtec chest between the carriers; the lid SLAMS at 5.5 (dust + ring)
  const lid = g < FLASHBACK_EV.lid ? 0.35 : 0.35 * (1 - E.outCubic(seg(g, FLASHBACK_EV.lid, FLASHBACK_EV.lid + 0.2)))
  ART.chest(ctx, 1050, 858, 1.2, lid, t)
  const slamA = g - FLASHBACK_EV.lid
  if (slamA > 0 && slamA < 0.7) {
    const k = 1 - slamA / 0.7
    ctx.strokeStyle = `rgba(255,220,150,${0.5 * k})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(1050, 852, 90 + slamA * 220, (90 + slamA * 220) * 0.3, 0, 0, 7)
    ctx.stroke()
    for (let i = 0; i < 8; i++) {
      const u = slamA * (1.4 + hash(i * 9) * 0.8)
      ctx.globalAlpha = Math.max(0, 0.6 * k - u * 0.3)
      ctx.fillStyle = '#c9b68a'
      ctx.beginPath()
      ctx.arc(1050 + (hash(i * 3) - 0.5) * 200 * u, 856 - u * 60 + 140 * u * u, 3 + hash(i) * 4, 0, 7)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  if (g < FLASHBACK_EV.lid) {
    for (let i = 0; i < 3; i++) {
      const ev = { t: 0.6 + i * 1.7, x: 1050, y: 800, seed: 30 + i }
      ART.coinBurst(ctx, [ev], t, 1.4)
    }
  }
  // glitter dies with the lid slam
  ART.glitter(ctx, S.fbFx, t, 0.9)
  // the freeze gag: young Baldbarossa holds his own fallen mane, aghast
  if (g >= FLASHBACK_EV.freeze - 0.3) {
    const agh = seg(g, FLASHBACK_EV.freeze - 0.3, FLASHBACK_EV.freeze)
    sprite(ctx, S.crew[347].base, FB_LINE[347] - 4, 920 - 3, {
      lift: [2, 0], stride: [1, 0], lean: -0.16 * agh, sx: 2.45, sy: 2.45,
    })
    ART.paintedHair(ctx, FB_LINE[347] + 44, 806, 'ponytail', 0.85, t, ART.LIVING_HAIR[347], { rot: 1.9, dy: 0 })
  }
  ctx.restore()
}

// ============================== S7 — THE CHEST ON SKULLSHOAL ==============================
function drawChest(ctx, lt, t) {
  const g = lt
  // camera: wide -> chest close -> crane up into the regrow sweep
  const kA = lerp(1.0, 1.35, E.outCubic(seg(g, 1.0, 2.6)))
  const kB = lerp(kA, 1.12, E.outCubic(seg(g, CHEST_EV.regrowStart, CHEST_EV.regrowStart + 1.7)))
  const cyCam = lerp(760, 600, E.outCubic(seg(g, CHEST_EV.regrowStart, CHEST_EV.regrowStart + 1.7)))
  const cxCam = lerp(960, 850, seg(g, 13.0, 14.6))
  cam(ctx, kB, cxCam, cyCam)
  ctx.drawImage(S.cave, -OS, -OS)
  // the moon inside the roof hole + the moonshaft (widens for the regrow)
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(1065, 20, 185, 66, 0, 0, 7)
  ctx.clip()
  ART.moon(ctx, 1075, -20, 96, { halo: 0.24 })
  ctx.restore()
  const widen = 1 + seg(g, CHEST_EV.regrowStart, CHEST_EV.regrowStart + 1.4) * 1.5
  const bright = 1 + seg(g, CHEST_EV.regrowStart, CHEST_EV.regrowStart + 1.4) * 0.9
  const shaftX = g >= CHEST_EV.regrowStart ? regrowBeamX(g) : 1060
  ART.beam(ctx, shaftX, t, {
    topX: 1065, y0: 80, y1: 960, wTop: 150 * widen, wBot: 330 * widen,
    aTop: 0.22 * bright, aBot: 0.1 * bright, core: 0.24 * bright,
  })
  // black water shimmer
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = 'rgba(150,175,215,0.14)'
    ctx.fillRect(80 + i * 140 + Math.sin(t * 1.2 + i * 2) * 18, 950 + (i % 4) * 26, 34, 2.4)
  }
  // shore boats (both crews rowed in)
  ART.rowboat(ctx, 60, 985, 1.5, t, 2, { col: '#243040' })
  ART.rowboat(ctx, 1850, 990, 1.5, t + 1, 2, { col: '#1a222e', face: -1 })
  // the chest (lid eases shut at 7.2) on its plinth, moonlight pooling under it
  const lid = 1 - E.outCubic(seg(g, CHEST_EV.lid, CHEST_EV.lid + 0.6))
  const pool = ctx.createRadialGradient(960, 856, 10, 960, 856, 300)
  pool.addColorStop(0, 'rgba(214,230,252,0.22)')
  pool.addColorStop(1, 'rgba(214,230,252,0)')
  ctx.fillStyle = pool
  ctx.fillRect(660, 700, 600, 260)
  ART.chest(ctx, 960, 834, 1.35, lid, t)
  if (g >= CHEST_EV.lid && g < CHEST_EV.lid + 0.8) {
    const echo = seg(g, CHEST_EV.lid, CHEST_EV.lid + 0.8)
    ctx.strokeStyle = `rgba(200,215,240,${0.4 * (1 - echo)})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(960, 840, 80 + echo * 380, (80 + echo * 380) * 0.3, 0, 0, 7)
    ctx.stroke()
  }
  // ---- crews ----
  const hold = (v) => Math.min(g, v) // the comedy silence holds every pose
  // Cabald ghoul line (right), each crossfading to living + hair as the beam passes
  const cabald = []
  for (const m of REGROW_LADDER) {
    const id = m.id
    if (id === 347) continue // the captain gets his own block (hat launch + mane)
    const x = REGROW_POS[id]
    const feet = 935
    const k = seg(g, m.at, m.end)
    cabald.push({ id, m, x, feet, k })
  }
  const heroPos = HERO_S7
  for (const c of cabald) {
    const rig = S.crew[c.id]
    const s2 = c.id === 5 ? 2.35 : 2.55
    const o = { lift: [2, 0], stride: [1, 0], lean: 0.02, sx: s2, sy: s2 }
    if (c.k < 1) sprite(ctx, rig.ghoul, c.x, c.feet, { ...o, alpha: 1 - c.k })
    if (c.k > 0) {
      // hair rises from behind the scalp (never drawn over the face)
      const hk = seg(g, c.m.at + 0.1, c.m.end)
      ART.paintedHair(ctx, c.x, crownY(rig.base, c.feet, s2) + 10, ART.HAIR_STYLE[c.id], hk, t, ART.LIVING_HAIR[c.id], {})
      sprite(ctx, rig.base, c.x, c.feet, { ...o, alpha: c.k })
      if (c.id === 5 && g >= CHEST_EV.cheer) {
        // gag 9: the runt's pompadour launches and knocks his own tricorn off
        const pk = E.outBack(seg(g, CHEST_EV.cheer, CHEST_EV.cheer + 0.7))
        ART.paintedHair(ctx, c.x, crownY(rig.base, c.feet, s2) + 6, 'pompadour', pk * 1.5, t, ART.LIVING_HAIR[5], {})
        if (pk > 0.4) {
          const hu = seg(g, CHEST_EV.cheer + 0.4, CHEST_EV.cheer + 1.4)
          ctx.save()
          ctx.translate(c.x + 30 * hu, crownY(rig.base, c.feet, s2) - 60 - Math.sin(hu * Math.PI) * 150)
          ctx.rotate(hu * 8)
          ART.tricorn(ctx, 0, 0, 1.1, { trim: '#c9a45c' })
          ctx.restore()
        }
      }
    }
    // tricorns on some of the ghoul crew (they board and regrow under them)
    if ([129, 233, 834].includes(c.id) && !(c.id === 5)) {
      ART.tricorn(ctx, c.x + 2, crownY(rig.base, c.feet, s2), s2 * 0.42, { trim: '#6a5432', col: '#1c1a20' })
    }
  }
  // Baldbarossa draw (between crew line and heroes): standing/acting overlay
  {
    const id = 347
    const rig = S.crew[id]
    let bx2 = 1160
    let lean = 0.02
    let act = null
    if (g >= 1.9 && g < 2.4) {
      const slide = seg(g, 1.9, 2.3)
      bx2 = lerp(1160, 1030, slide)
      lean = 0.3 * Math.sin(slide * Math.PI)
    } else if (g >= 2.4 && g < 2.8) {
      bx2 = 1030
      // catches, raises, drops the last coin into the chest
    } else if (g >= 2.8 && g < 3.4) {
      bx2 = lerp(1030, REGROW_POS[id], seg(g, 2.8, 3.4))
    } else if (g >= 3.4) {
      bx2 = REGROW_POS[id]
    }
    void id
    if (g >= CHEST_EV.cheer) {
      // comb salute: he combs the glorious mane, then salutes Jack
      const cb = seg(g, CHEST_EV.cheer, CHEST_EV.cheer + 0.5)
      const combX = lerp(bx2 + 40, bx2 - 10, cb) + Math.sin(g * 9) * 6 * (1 - cb)
      const combY = crownY(rig.base, 935, 2.7) + 20 - cb * 30
      ART.comb(ctx, combX, combY, -0.9 + Math.sin(g * 9) * 0.25, 1.7, true)
      if (g > CHEST_EV.cheer + 0.9) lean = -0.08
    }
    const k347 = seg(g, 13.4, 14.2)
    const o = { lift: [2, 0], stride: [1, 0], lean, sx: 2.7, sy: 2.7 }
    if (g < 13.4) sprite(ctx, rig.ghoul, bx2, 935, o)
    else {
      sprite(ctx, rig.ghoul, bx2, 935, { ...o, alpha: 1 - k347 })
      sprite(ctx, rig.base, bx2, 935, { ...o, alpha: k347 })
    }
    // THE money shot: his mane erupts upward as the beam lands (ladder note 8),
    // his tricorn launching off to make room
    if (g >= 13.4) {
      const hk = seg(g, 13.45, 14.3)
      ART.paintedHair(ctx, bx2, crownY(rig.base, 935, 2.7) + 12, 'mane', hk * 1.35, t, ART.LIVING_HAIR[347], {})
      ART.paintedHair(ctx, bx2 - 6, crownY(rig.base, 935, 2.7) + 14, 'mane', hk * 0.9, t, shadeHex(ART.LIVING_HAIR[347], 0.7), {})
      const hu = seg(g, 13.4, 14.4)
      ctx.save()
      ctx.translate(bx2 + 10 + hu * 190, crownY(rig.base, 935, 2.7) - 30 - Math.sin(hu * Math.PI) * 200 - hu * 60)
      ctx.rotate(hu * 9)
      ART.tricorn(ctx, 0, 0, 2.7 * 0.52, { col: '#151318', col2: '#1d1a22', trim: '#8a6a3a', feather: '#7a2f28' })
      ctx.restore()
    } else {
      // his tricorn sits tall until the mane launches it
      ART.tricorn(ctx, bx2 + 2, crownY(rig.base, 935, 2.7) - 8, 2.7 * 0.52, {
        col: '#151318', col2: '#1d1a22', trim: '#8a6a3a',
      })
    }
    if (!act) act = 0
  }
  // heroes foreground
  for (const [key, x] of Object.entries(heroPos)) {
    const rig = S[key]
    const cheer = g >= CHEST_EV.cheer ? Math.abs(Math.sin((g - CHEST_EV.cheer) * 5 + x)) * 8 : 0
    sprite(ctx, rig, x, 995 - cheer, { lift: [2, 0], stride: [1, 0], lean: 0.02, sx: 2.6, sy: 2.6 })
    if (key === 'jack') ART.tricorn(ctx, x + 2, crownY(rig, 995 - cheer, 2.6), 2.6 * 0.52, { feather: '#a03030' })
  }
  // parrot delivery: flies the earring coin up through the moonshaft and drops it
  if (g >= CHEST_EV.delivery && g < CHEST_EV.delivery + 1.6) {
    const u = seg(g, CHEST_EV.delivery, CHEST_EV.delivery + 1.2)
    const px = lerp(1085, 1010, u) + Math.sin(u * 9) * 26
    const py = lerp(60, 690, E.outCubic(u))
    ART.parrot(ctx, px, py, 1.6, t, { coin: u < 0.9, phase: 0 })
  }
  // the last coin falls; Baldbarossa catches and places it
  if (g >= CHEST_EV.delivery + 1.1 && g < 3.0) {
    const cu = seg(g, CHEST_EV.delivery + 1.1, 2.2)
    const cxp = lerp(1010, 1052, cu)
    const cyp = lerp(700, 800, cu * cu)
    if (cu < 1) {
      ctx.fillStyle = '#ffcc2e'
      ctx.beginPath()
      ctx.ellipse(cxp, cyp, 8, 9.5, cu * 5, 0, 7)
      ctx.fill()
    } else {
      const pu = seg(g, 2.4, 2.8)
      ctx.fillStyle = '#ffcc2e'
      ctx.beginPath()
      ctx.ellipse(lerp(1052, 970, pu), lerp(760, 800, pu) - Math.sin(pu * Math.PI) * 40, 8, 9.5, pu * 4, 0, 7)
      ctx.fill()
    }
    ART.starGlint(ctx, 1052, 790, 60, (t * 0.7) % 1)
  }
  // hermit crab re-homes into the pile
  if (g >= CHEST_EV.crab) {
    const cu = seg(g, CHEST_EV.crab, CHEST_EV.crab + 2.2)
    const cxp = lerp(700, 940, cu)
    ART.crab(ctx, cxp, 924, 1.6, t, -1)
  }
  // THE red strand (load-bearing plot prop): plucked and wiggling in his hand from
  // the pluck until the release, then drifting down onto the coin — bold red at
  // pill distance, with a lighter core so it never reads dark
  if (g >= CHEST_EV.pluck && g < CHEST_EV.strandIn) {
    const hold = 1 - seg(g, CHEST_EV.strandIn - 0.35, CHEST_EV.strandIn)
    const wig = Math.sin(t * 17) * 9 * hold
    const x0 = heroPos.jack + 10
    const y0 = crownY(S.jack, 995, 2.6) + 10
    const x1 = lerp(x0 + 26 + wig, 968, 1 - hold)
    const y1 = lerp(y0 + 96, 796, 1 - hold)
    ctx.save()
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#8e2626'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.4 + wig * 0.6, y0 + (y1 - y0) * 0.5, x1, y1)
    ctx.stroke()
    ctx.strokeStyle = '#c0442e'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.restore()
    // the pluck twang: a brief bright snap at the crown
    if (g < CHEST_EV.pluck + 0.4) {
      ART.starGlint(ctx, x0 + 6, y0 - 4, 26, (g - CHEST_EV.pluck) / 0.4)
    }
  }
  // regrow glitter + rising note sparks (baked at absolute times)
  ART.glitter(ctx, S.regrowFx, t, 1.1)
  for (const m of REGROW_LADDER) {
    const age = t - CHEST.abs(m.at)
    if (age > 0 && age < 0.9) {
      for (let i = 0; i < 3; i++) {
        const u = age / 0.9
        ctx.globalAlpha = (1 - u) * 0.8
        ctx.fillStyle = '#fff6d8'
        ctx.fillRect(REGROW_POS[m.id] + (i - 1) * 26, 700 - u * 220 - i * 30, 3.4, 3.4)
      }
      ctx.globalAlpha = 1
    }
  }
  // the money-shot bloom when Baldbarossa's mane lands
  const maneAge = t - CHEST.abs(13.4)
  if (maneAge > 0 && maneAge < 1.4) {
    const k = Math.sin(cl(maneAge / 1.4) * Math.PI)
    const rg = ctx.createRadialGradient(760, 660, 30, 760, 660, 560)
    rg.addColorStop(0, `rgba(255,240,200,${0.4 * k})`)
    rg.addColorStop(1, 'rgba(255,240,200,0)')
    ctx.fillStyle = rg
    ctx.fillRect(310, 220, 900, 800)
  }
  ctx.restore()
}

// ============================== S8 — SUNRISE PAROLE ==============================
function drawSunrise(ctx, lt, t) {
  const g = lt
  const crane = E.outCubic(seg(g, DAWN_EV.craneUp, DAWN_EV.craneUp + 3))
  cam(ctx, lerp(1.0, 0.94, crane), 960, lerp(600, 480, crane))
  ART.sky(ctx, [[0, '#2a3a5e'], [0.35, '#7a5a6e'], [0.62, '#d98a5a'], [0.82, '#f2b96a'], [1, '#f8d98a']], { y1: 560 })
  // sun crest: flat warm disc in a wide halo (no craters — that's the moon painter)
  const halo = ctx.createRadialGradient(430, 545, 30, 430, 545, 420)
  halo.addColorStop(0, 'rgba(255,214,140,0.55)')
  halo.addColorStop(1, 'rgba(255,214,140,0)')
  ctx.fillStyle = halo
  ctx.fillRect(10, 125, 840, 840)
  const sg = ctx.createRadialGradient(430, 535, 20, 430, 545, 84)
  sg.addColorStop(0, '#fff3d0')
  sg.addColorStop(0.75, '#ffd98a')
  sg.addColorStop(1, '#f2a94e')
  ctx.fillStyle = sg
  ctx.beginPath()
  ctx.arc(430, 545, 84, 0, 7)
  ctx.fill()
  ART.sea(ctx, 560, t, {
    bands: ['#c98a5e', '#a06a58', '#6a4e52', '#3a3444', '#232c3e'],
    foam: 'rgba(255,220,170,0.4)', amp: 8, depth: 320, glintX: 430, glintCol: 'rgba(255,225,160,0.7)',
  })
  const heroBob = Math.sin(t * 0.9) * 4
  ART.drawShip(ctx, S.shipHero, 700, 900 + heroBob, 0.56, { rot: -0.015 + Math.sin(t * 0.9) * 0.01 })
  ART.wake(ctx, 380, 906 + heroBob, 1, t, 300)
  const vilBob = Math.sin(t * 0.9 + 2) * 4
  ART.drawShip(ctx, S.shipVillain, 1330, 872 + vilBob, 0.46, { rot: 0.012 + Math.sin(t * 1.1 + 1) * 0.01 })
  ART.wake(ctx, 1640, 878 + vilBob, -1, t, 240)
  // warm dawn wash over both hulls (sun is ahead of them)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const wsh = ctx.createLinearGradient(430, 545, 1500, 900)
  wsh.addColorStop(0, 'rgba(255,190,110,0.16)')
  wsh.addColorStop(1, 'rgba(255,190,110,0)')
  ctx.fillStyle = wsh
  ctx.fillRect(-OS, 300, W + OS * 2, 800)
  ctx.restore()
  // parrot in a tiny tricorn perched on the hero rail
  ART.parrot(ctx, 560, 760 + heroBob, 1.15, t, { hat: 'tricorn', phase: 0.5 })
  // comb-cannon salute: confetti combs arc out with gravity (real t)
  const ccAge = t - DAWN.abs(DAWN_EV.combCannon)
  if (ccAge > -0.2 && ccAge < 2.2) {
    if (ccAge > 0 && ccAge < 0.3) {
      const k = 1 - ccAge / 0.3
      const bg = ctx.createRadialGradient(700, 730, 4, 700, 730, 130)
      bg.addColorStop(0, `rgba(255,240,200,${0.7 * k})`)
      bg.addColorStop(1, 'rgba(255,240,200,0)')
      ctx.fillStyle = bg
      ctx.fillRect(560, 600, 290, 270)
    }
    for (let i = 0; i < 7; i++) {
      const a = -0.5 - hash(i * 9) * 0.7
      const sp = 260 + hash(i * 3) * 220
      const px = 700 + Math.cos(a) * sp * ccAge
      const py = 730 + Math.sin(a) * sp * ccAge + 460 * ccAge * ccAge
      if (py > H + 40 || ccAge <= 0) continue
      ART.comb(ctx, px, py, ccAge * 6 + i, 0.9, hash(i) > 0.6)
    }
  }
  // deep background: the officer STILL rowing after them, permit held high — a dark
  // hull on the bright horizon band, wake streak + alternating oar splashes
  if (g >= DAWN_EV.rower) {
    ART.rowboat(ctx, 960, 598, 0.34, t, 1, { col: '#141c2c', face: 1 })
    ctx.fillStyle = 'rgba(240,220,180,0.5)'
    for (let i = 0; i < 5; i++) {
      const u = ((t * 0.8 + i * 0.2) % 1)
      ctx.globalAlpha = 0.5 * (1 - u)
      ctx.fillRect(930 - u * 70, 600 + Math.sin(u * 9) * 2, 22, 2)
    }
    ctx.globalAlpha = 1
    const dip = Math.sin(t * 6)
    if (dip > 0.55) {
      ctx.fillStyle = 'rgba(240,244,250,0.85)'
      ctx.beginPath()
      ctx.arc(978 + dip * 6, 606, 2.6, 0, 7)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,236,170,0.95)'
    ctx.fillRect(963 + Math.sin(t * 5) * 2, 580, 4, 4)
  }
  ctx.restore()
}

// ============================== S9 — THE KRAKEN TAG ==============================
function drawTag(ctx, lt, t) {
  const g = lt
  if (g < 2.1) {
    cam(ctx, 1.0, 960, 540)
    ART.sky(ctx, [[0, '#04070f'], [0.7, '#0a1424'], [1, '#12203a']], { y1: 400 })
    ART.stars(ctx, t, 5, 50, 260)
    ART.moon(ctx, 960, 250, 70, { halo: 0.3 })
    ART.sea(ctx, 380, t, {
      bands: ['#152a44', '#112440', '#0d1c32', '#091424', '#060d18'],
      foam: 'rgba(180,205,224,0.4)', amp: 6, depth: 260, glintX: 960, glintCol: 'rgba(224,238,255,0.5)',
    })
    // twin sterns sailing away, wakes running to the camera
    ctx.save()
    ctx.globalAlpha = 0.92
    ctx.translate(820, 430)
    ctx.scale(-0.16, 0.16)
    ctx.drawImage(S.shipSilHero, -S.shipHero.w / 2, -S.shipHero.wl)
    ctx.restore()
    ctx.save()
    ctx.globalAlpha = 0.92
    ctx.translate(1130, 415)
    ctx.scale(-0.13, 0.13)
    ctx.drawImage(S.shipSilVillain, -S.shipVillain.w / 2, -S.shipVillain.wl)
    ctx.restore()
    ART.wake(ctx, 850, 460, -0.4, t, 500)
    ART.wake(ctx, 1110, 448, 0.4, t, 480)
    // the tilt under: water swallows the lens
    const tilt = seg(g, 1.5, 2.1)
    if (tilt > 0) {
      ctx.fillStyle = `rgba(3,8,16,${tilt})`
      ctx.fillRect(-OS, -OS + (1 - tilt) * H, W + OS * 2, H + OS * 2)
    }
    ctx.restore()
    return
  }
  // underwater
  cam(ctx, 1.0, 960, 540)
  const ug = ctx.createLinearGradient(0, 0, 0, H)
  ug.addColorStop(0, '#04101c')
  ug.addColorStop(0.55, '#030a14')
  ug.addColorStop(1, '#02060c')
  ctx.fillStyle = ug
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  for (let i = 0; i < 40; i++) {
    const u = ((t * (0.02 + hash(i * 7) * 0.03) + hash(i * 3)) % 1)
    ctx.globalAlpha = 0.3 * Math.sin(u * Math.PI)
    ctx.fillStyle = '#7a94ae'
    ctx.fillRect(hash(i * 13) * W, u * H, 2.4, 2.4)
  }
  ctx.globalAlpha = 1
  // rock ledges + barnacles
  ctx.fillStyle = '#050a12'
  ctx.beginPath()
  ctx.moveTo(-OS, H + OS)
  ctx.lineTo(-OS, 980)
  ctx.quadraticCurveTo(400, 900, 900, 990)
  ctx.quadraticCurveTo(1300, 1060, W + OS, 980)
  ctx.lineTo(W + OS, H + OS)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#0a1220'
  ctx.beginPath()
  ctx.moveTo(1150, 1120)
  ctx.quadraticCurveTo(1200, 960, 1330, 940)
  ctx.quadraticCurveTo(1470, 930, 1560, 1010)
  ctx.lineTo(1560, 1120)
  ctx.closePath()
  ctx.fill()
  for (const [bxp, byp] of [[1290, 938], [1330, 930], [1370, 936], [560, 952], [620, 946]]) {
    ART.barnacle(ctx, bxp, byp, 1.3)
  }
  // a rock spire with barnacles stands at grooming height off the ledge
  ctx.fillStyle = '#0a1220'
  ctx.beginPath()
  ctx.moveTo(1368, 1120)
  ctx.quadraticCurveTo(1376, 940, 1384, 800)
  ctx.lineTo(1416, 796)
  ctx.quadraticCurveTo(1424, 950, 1444, 1120)
  ctx.closePath()
  ctx.fill()
  ART.barnacle(ctx, 1372, 792, 1.5)
  ART.barnacle(ctx, 1408, 788, 1.7)
  // the tentacle rises where nobody is looking, comb in the tip; during the test it
  // leans over to the barnacle and takes two deliberate grooming strokes
  const rise = seg(g, KRAKEN_EV.tentacle, KRAKEN_EV.tentacle + 1.4)
  const test = seg(g, KRAKEN_EV.combTest, KRAKEN_EV.combTest + 1.4)
  const stroke = test > 0 && test < 1 ? Math.sin(t * 7.5) * 0.3 : 0
  const tipX = lerp(1400, 1330, test) + (test > 0 && test < 1 ? Math.sin(t * 7.5) * 22 : 0)
  const tip = ART.tentacle(ctx, 1400, 1180, rise, t, {
    lean: (tipX - 1400) / 130,
    comb: rise > 0.6,
    combS: 2.3,
    combDx: 26,
    combDy: 10,
    combAng: -1.1 + stroke,
  })
  // the comb works the barnacle: bristles against the shell, sparkle per stroke
  const rubX = tip ? tip[0] + 26 : 1298
  const rubY = tip ? tip[1] + 10 : 920
  if (test > 0 && test < 1) {
    ctx.save()
    ctx.strokeStyle = 'rgba(230,240,250,0.5)'
    ctx.lineWidth = 2
    for (let i = 0; i < 3; i++) {
      const a = t * 7.5 + i * 2.1
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(a)
      ctx.beginPath()
      ctx.moveTo(rubX - 8, rubY - 4 - i * 3)
      ctx.quadraticCurveTo(rubX + 4, rubY - 8 - i * 3, rubX + 12, rubY - 3 - i * 3)
      ctx.stroke()
    }
    ctx.restore()
    ctx.globalAlpha = 1
    if (Math.sin(t * 7.5) > 0.9) ART.starGlint(ctx, rubX + 14, rubY - 6, 30, (t % 0.9) / 0.9)
  }
  // the dinner-plate eye opens
  const open = E.outCubic(seg(g, KRAKEN_EV.eye, KRAKEN_EV.eye + 0.6))
  ART.krakenEye(ctx, 740, 600, 190, open, t, Math.sin(t * 0.7) * 0.4)
  ctx.restore()
}

// ============================== end card (S9 hard cut) ==============================
function drawCard(ctx, lt, t) {
  const g = lt
  const inU = seg(g, KRAKEN_EV.hardCut, KRAKEN_EV.card)
  ctx.fillStyle = '#030408'
  ctx.fillRect(0, 0, W, H)
  if (inU <= 0) return
  // faint moon-glint arc + gold rules, the coin emblem settling
  ctx.save()
  ctx.globalAlpha = inU
  const gr = ctx.createRadialGradient(960, 430, 20, 960, 430, 560)
  gr.addColorStop(0, 'rgba(210,225,250,0.10)')
  gr.addColorStop(1, 'rgba(210,225,250,0)')
  ctx.fillStyle = gr
  ctx.fillRect(400, 0, 1120, 900)
  ctx.strokeStyle = '#c9a45c'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(460, 330)
  ctx.lineTo(1460, 330)
  ctx.moveTo(460, 700)
  ctx.lineTo(1460, 700)
  ctx.stroke()
  ctx.fillStyle = '#ffcc2e'
  ctx.beginPath()
  ctx.arc(960, 236, 34 + E.outBack(inU) * 6, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#e08a0c'
  ctx.beginPath()
  ctx.arc(960, 236, 22, 0, 7)
  ctx.fill()
  ctx.restore()
  void t
}

// ============================== the film ==============================
export default {
  title: 'PIRATES OF THE CABALD',
  output: 'pirates-cabald.mp4',
  duration: DUR,
  async prepare() {
    const load = async (id) => A.loadRemy(id, false)
    // heroes
    S.jack = ART.baldric(ART.stripBlade(await load(CAST.jack.id)))
    S.liz = ART.ivoryDress(ART.keepMain(await load(CAST.liz.id)))
    S.gibbs = await load(CAST.gibbs.id)
    S.vain = await load(CAST.vain.id)
    S.officer = await load(CAST.officer.id)
    // the Cabald (living base + night silhouette + ghoul duotone from the GHOUL table)
    S.crew = {}
    const cabaldIds = [347, 48, 382, 233, 5, 834, 129, 1217]
    for (const id of cabaldIds) {
      let base = await load(id)
      if (id === 48) base = ART.stripBlade(base) // duellist's baked blade goes free
      S.crew[id] = {
        base,
        sil: ART.tint(base, '#0a0d14'),
        ghoul: ART.ghoulize(base, { ...GHOUL[id], ...ART.GHOUL_REFS[id] }),
      }
    }
    // hero night silhouettes
    S.gibbsSil = ART.tint(S.gibbs, '#0a0d14')
    S.vainSil = ART.tint(S.vain, '#0a0d14')
    // ships + dark silhouettes for crossings
    S.shipHero = ART.shipBake('hero')
    S.shipVillain = ART.shipBake('villain')
    S.shipSilHero = ART.tint({ c: S.shipHero.c, w: S.shipHero.w, h: 1020, top: 0, bottom: 1019, legTop: 0, cx: 780, sil: null }, '#04060a').c
    S.shipSilVillain = ART.tint({ c: S.shipVillain.c, w: S.shipVillain.w, h: 1020, top: 0, bottom: 1019, legTop: 0, cx: 780, sil: null }, '#04060a').c
    // sets
    S.deck = ART.deckBake()
    S.cave = ART.caveBake()
    S.dock = ART.dockBake()
    // immutable effect events at absolute film seconds (age on real t)
    S.scatterFx = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
      t: OVERTURE.abs(OVERTURE_EV.scatter), x: 560 + i * 115, y: 520 + (i % 3) * 40, seed: 900 + i,
    }))
    S.revealFx = REVEAL_LADDER.concat([REVEAL_STRAGGLER]).map((m, i) => ({
      t: REVEAL.abs(m.at), x: REVEAL_POS[m.id], y: 660, seed: 400 + i,
    }))
    S.regrowFx = REGROW_LADDER.map((m, i) => ({
      t: CHEST.abs(m.at), x: REGROW_POS[m.id], y: 680, seed: 600 + i,
    }))
    S.lockBurst = { t: DUEL.abs(DUEL_EV.lock), x: 975, y: 720, seed: 701 }
    S.sliceBurst = { t: DUEL.abs(DUEL_EV.slice), x: 1060, y: 680, seed: 702 }
    S.fbFx = Object.keys(FB_TICK_VICTIM).map((k, i) => ({
      t: FLASHBACK.abs(Number(k)), x: FB_LINE[FB_TICK_VICTIM[k]], y: 700, seed: 800 + i,
    }))
  },
  shots: SHOTS.map((sh) => ({
    name: sh.name,
    t0: sh.t0,
    t1: sh.t1,
    draw(ctx, lt, dur, t) {
      if (sh.name === 'overture') drawOverture(ctx, lt, t)
      else if (sh.name === 'heist') drawHeist(ctx, lt, t)
      else if (sh.name === 'pursuit') drawPursuit(ctx, lt, t)
      else if (sh.name === 'reveal') drawReveal(ctx, lt, t)
      else if (sh.name === 'duel') drawDuel(ctx, lt, t)
      else if (sh.name === 'flashback') drawFlashback(ctx, lt, t)
      else if (sh.name === 'chest') drawChest(ctx, lt, t)
      else if (sh.name === 'sunrise') drawSunrise(ctx, lt, t)
      else if (sh.name === 'tag') {
        if (lt < KRAKEN_EV.hardCut) drawTag(ctx, lt, t)
        else drawCard(ctx, lt, t)
      }
    },
    fx: () => {
      if (sh.name === 'overture') return { letterbox: SAFE.letterbox, bloom: 0.1, bloomThresh: 0.82, vignette: 0.5, grain: 0.012 }
      if (sh.name === 'heist') return { letterbox: SAFE.letterbox, bloom: 0.07, bloomThresh: 0.85, vignette: 0.55, grain: 0.012, warm: 0.08 }
      if (sh.name === 'pursuit') return { letterbox: SAFE.letterbox, bloom: 0.1, bloomThresh: 0.84, vignette: 0.55, grain: 0.014, haze: 0.06 }
      if (sh.name === 'reveal') return { letterbox: SAFE.letterbox, bloom: 0.12, bloomThresh: 0.85, vignette: 0.5, grain: 0.012 }
      if (sh.name === 'duel') return { letterbox: SAFE.letterbox, bloom: 0.11, bloomThresh: 0.88, vignette: 0.5, grain: 0.014 }
      if (sh.name === 'flashback') return { letterbox: SAFE.letterbox, bloom: 0.08, bloomThresh: 0.85, vignette: 0.38, grain: 0.015, warm: 0.4, sat: 1.12 }
      if (sh.name === 'chest') return { letterbox: SAFE.letterbox, bloom: 0.12, bloomThresh: 0.8, vignette: 0.5, grain: 0.012 }
      if (sh.name === 'sunrise') return { letterbox: SAFE.letterbox, bloom: 0.09, bloomThresh: 0.82, vignette: 0.5, grain: 0.011, warm: 0.3, sat: 1.06 }
      return { letterbox: SAFE.letterbox, bloom: 0.09, bloomThresh: 0.84, vignette: 0.6, grain: 0.01 }
    },
  })),
  captions: CAPTIONS,
  captionStyles: {
    title: {
      font: 'Anton', size: 132, weight: '', color: '#f2dfa0', track: 2,
      shadow: '#050608', glow: '#8a6a24', glowBlur: 22,
    },
    sub: {
      size: 30, weight: 500, color: 'rgba(222,232,246,0.85)', track: 4,
      shadow: '#050608',
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
  score,
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } },
}
