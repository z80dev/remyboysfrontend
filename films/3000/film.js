// 3000 — A REMY BOYS EPIC. Picture for the timeline cue sheet: nine shots, full-res
// painted stage (bakes from art.js build()), rig actors on the per-shot clocks'
// WORLD g, impacts and weather age on REAL t so sparks/dust/storms keep moving
// through hit-stops. Pure in time: no Math.random, no Date, no state across frames;
// the letterbox bars are painted last in every shot so nothing bleeds into them.
// The KICK WORDS (THIS! / IS! / SHEARTA!) are picture slams on the overlay, not
// captions; every caption comes verbatim from timeline CAPTIONS.
import { W, H, hash, seg, lerp, E, F, measure } from 'filmkit/lib.js'
import { slam } from 'filmkit/motion.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import { OS } from './art.js'
import { score } from './score.js'
import {
  DUR, SHOTS, PROLOGUE, WOLF, EMISSARY, MARCH, PHALANX, XERXES, STORM, LASTSTAND, PLATAEA,
  PROLOGUE_EV, WOLF_EV, EMISSARY_EV, MARCH_EV, PHALANX_EV, XERXES_EV, STORM_EV, LASTSTAND_EV, PLATAEA_EV,
  MASTER, CAPTIONS, FLASHES, STYLES, EMBER_PERIOD, MARCH_STEP,
} from './timeline.js'

// ---------------- cast (casting.md-verified ids) ----------------
const LEO_ID = 42
const SQUAD_IDS = [1503, 1529, 24, 1523, 3040]
const SLAVE_IDS = [2028, 1733, 2619, 1926, 1738, 2393, 2284, 2487]
const IMMORTAL_IDS = [564, 3807, 1989, 1793]
const CRIMSONS = ['#a02818', '#8e2214', '#b03020', '#7c1c10', '#a83820']
const PAL_GOLD = '#e0b050'
const PAL_GOLD_HI = '#f6dc8a'

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
// pose helpers
const walkCycF = (ph, amp = 5) => ART.walkCyc(ph, amp)
const standFl = (g) => ({ lift: [2, 0], stride: [1, 0], lean: 0.02 + Math.sin(g * 1.2) * 0.015 })
const stand_ = { lift: [2, 0], stride: [1, 0], lean: 0.02 }

// ============================== S1 — PROLOGUE ==============================
function drawPrologue(ctx, lt, t) {
  const g = lt
  cam(ctx, lerp(1.07, 1.0, cl(g / 9)), 960, 560)
  ctx.drawImage(S.bake.nightBattle, -OS, -OS)
  ART.emberRise(ctx, t, 24, 3, { y0: 320, y1: 940 })
  ART.ashFall(ctx, g, 40, 9, { t, windX: 14 })
  // TITLE SLAM: dust burst + shock ring + bronze glow behind the caption letters
  const age = t - MASTER.titleSlam
  if (age > -0.05 && age < 2.5) {
    ART.dustBurst(ctx, 960, 646, age, 71, { n: 24, spread: 300, life: 1.1 })
    ART.shockRing(ctx, 960, 600, age, 0.5)
    ART.dustBurst(ctx, 700, 660, age - 0.08, 72, { n: 10, spread: 180, life: 0.9 })
    ART.dustBurst(ctx, 1220, 660, age - 0.08, 73, { n: 10, spread: 180, life: 0.9 })
    for (let i = 0; i < 6; i++) {
      const ca = hash(i * 13.7) * 6.28
      const d = 30 + age * 330 * (0.4 + hash(i * 3.3))
      ctx.globalAlpha = Math.max(0, 0.8 - age * 1.4)
      ctx.fillStyle = '#c9a45c'
      ctx.fillRect(960 + Math.cos(ca) * d, 590 + Math.sin(ca) * d * 0.5 + age * age * 420, 4, 4)
    }
    ctx.globalAlpha = 1
    const glowK = E.outBack(cl(seg(g, MASTER.titleSlam - 0.0001, MASTER.titleSlam + 0.25)))
    if (glowK > 0) {
      const pulse = 1 + 0.05 * Math.sin(t * 6)
      const rg = ctx.createRadialGradient(960, 540, 20, 960, 540, 340 * pulse)
      rg.addColorStop(0, `rgba(232,180,90,${0.24 * glowK})`)
      rg.addColorStop(1, 'rgba(232,180,90,0)')
      ctx.fillStyle = rg
      ctx.fillRect(560, 200, 800, 680)
    }
  }
  ctx.restore()
  // black cover lifting at fadeUp — the single ember stays visible over it
  const black = 1 - seg(g, PROLOGUE_EV.fadeUp, PROLOGUE_EV.fadeUp + 1.1)
  if (black > 0) {
    ctx.save()
    ctx.globalAlpha = black
    ctx.fillStyle = '#050302'
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    ctx.restore()
  }
  if (g < 4.6) ART.emberSingle(ctx, g, EMBER_PERIOD)
  ART.bars(ctx)
}

// ============================== S2 — THE BOY AND THE WOLF ==============================
function drawWolf(ctx, lt, t) {
  const { g } = WOLF.warp(lt)
  cam(ctx, 1.3, 880, 640)
  ctx.drawImage(S.bake.blizzard, -OS, -OS)
  ART.blizzard(ctx, t, 90)
  // ---- young Leonidhair ----
  const dodge = seg(g, 5.75, 6.2)
  const boyX = lerp(700, 560, E.outCubic(dodge))
  const boyCrouch = g > 5.45 && g < 5.75 ? 0.4 : 0
  const boyLean = g >= 5.45 && g < 6.5 ? -0.14 : g >= 6.6 ? 0.16 : Math.sin(g * 1.1) * 0.03
  ART.contactShadow(ctx, boyX, 902, 40, 0.35)
  sprite(ctx, S.young, boyX, 902, {
    ...(dodge > 0 && dodge < 1 ? { lift: [10, 2], stride: [-6, 2] } : { lift: [Math.round(2 + boyCrouch * 6), 0], stride: [1, 0], lean: -0.04 - boyCrouch * 0.08 }),
    lean: boyLean, sx: 2.4, sy: 2.4,
  })
  // the comb, raised for the flash
  if (g > 5.4) ART.comb(ctx, boyX + 44, ART.crownY(S.young, 902, 2.4) + 34, -1.25 + (g > 6.6 ? 0.55 : 0), 1.7)
  // ---- the razor-wolf ----
  let wx, wy = 904, wc = 0, moving = 1, snap = 0
  if (g < 6.1) wx = 1300 + Math.sin(g * 0.8) * 90
  else if (g < 6.5) { const u = seg(g, 6.1, 6.5); wx = lerp(1220, 730, E.inQuad(u)); wy = 904 - Math.sin(u * Math.PI) * 54 }
  else if (g < 7.0) { const u = seg(g, 6.5, 7.0); wx = lerp(730, 830, E.outCubic(u)); snap = 1 - u; moving = 0.3 }
  else { const u = seg(g, 7.0, 9.65); wx = lerp(830, 1480, u); wc = 0.5 * cl(u * 4); moving = 0.6 }
  ART.contactShadow(ctx, wx, wy + 4, 66, 0.32)
  ART.wolf(ctx, wx, wy, 1.9, g * 6, { dir: -1, crouch: wc, moving, snap, bald: seg(g, 7.0, 8.0) })
  // comb-flash at contact (real t — blooms through the freeze)
  const cfAge = t - WOLF.abs(WOLF_EV.contact)
  if (cfAge > -0.05 && cfAge < 0.9) {
    ART.glint(ctx, 668, 788, 90, cfAge / 0.45)
    ART.sparkBurst(ctx, 668, 788, cfAge, 41)
    ART.shockRing(ctx, 668, 788, cfAge, 0.35)
    ART.dustBurst(ctx, 700, 860, cfAge, 42, { n: 10, spread: 150, life: 0.7 })
  }
  // the bald stripe catches light — the seed of the whole war
  const bgAge = t - WOLF.abs(WOLF_EV.bald)
  if (bgAge > 0 && bgAge < 0.6) {
    const bu = seg(g, 7.0, 9.65)
    ART.glint(ctx, lerp(830, 1480, bu) - 20, wy - 74, 56, bgAge / 0.6)
  }
  ctx.restore()
  ART.bars(ctx)
}

// red banner cloth: hangs from the gate poles, folds + hem sway keyed on wind
function bannerCloth(ctx, bx, y0, t, seed, windK) {
  const sw = Math.sin(t * 2.2 + seed * 3) * 15 * windK
  const sw2 = Math.sin(t * 3.1 + seed * 7 + 2) * 9 * windK
  const h = 250
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(bx - 44, y0)
  ctx.lineTo(bx + 44, y0)
  ctx.quadraticCurveTo(bx + 44 + sw2, y0 + h * 0.5, bx + 30 + sw, y0 + h)
  ctx.lineTo(bx - 30 + sw * 0.8, y0 + h)
  ctx.quadraticCurveTo(bx - 44 + sw2, y0 + h * 0.5, bx - 44, y0)
  ctx.closePath()
  const g = ctx.createLinearGradient(bx - 44, 0, bx + 44, 0)
  g.addColorStop(0, '#5e140c'); g.addColorStop(0.5, '#a02818'); g.addColorStop(1, '#6e1a10')
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = 'rgba(40,8,6,0.4)'
  ctx.lineWidth = 6
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(bx - 44 + i * 22, y0 + 4)
    ctx.quadraticCurveTo(bx - 44 + i * 22 + sw2 * 0.4, y0 + h * 0.5, bx - 36 + i * 20 + sw * 0.5, y0 + h - 6)
    ctx.stroke()
  }
  ctx.strokeStyle = '#e0b050'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(bx - 30 + sw * 0.8, y0 + h)
  ctx.lineTo(bx + 30 + sw, y0 + h)
  ctx.stroke()
  ctx.restore()
}

// the black pit: dark opening + rocky rim
function pit(ctx, cx, cy) {
  ctx.save()
  ctx.fillStyle = '#241a10'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 6, 216, 48, 0, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#060304'
  ctx.beginPath()
  ctx.ellipse(cx, cy, 200, 40, 0, 0, 7)
  ctx.fill()
  const r = hash
  for (let i = 0; i < 12; i++) {
    const a = r(i * 7.3 + seedPit) * Math.PI
    const px = cx + Math.cos(a) * (190 + r(i * 3.1 + seedPit) * 24)
    const py = cy + Math.sin(a) * (36 + r(i * 5.9 + seedPit) * 10)
    ctx.fillStyle = i % 2 ? '#4e3826' : '#33241a'
    ctx.beginPath()
    ctx.ellipse(px, py, 8 + r(i * 11.1) * 16, 5 + r(i * 13.3) * 7, r(i * 2.7) * 3, 0, 7)
    ctx.fill()
  }
  ctx.restore()
}
const seedPit = 55

// THE KICK WORDS: chiseled bronze picture slams, center-band, measured to fit.
function kickWords(o, lt) {
  const words = [
    ['THIS!', EMISSARY_EV.kick, 11.75, 150, 540],
    ['IS!', 11.75, 12.45, 150, 540],
    ['SHEARTA!', 12.45, 13.0, 208, 560],
  ]
  for (const [text, t0, t1, size0, y] of words) {
    if (lt < t0 || lt > t1) continue
    let size = size0
    const w0 = measure(o, text, size, F.anton, 4)
    if (w0 > 1700) size = Math.floor(size * (1700 / w0))
    const p = cl(seg(lt, t0, t0 + 0.2))
    const shake = p < 0.35 ? (0.35 - p) * 26 : 0
    const jx = (hash(Math.floor(lt * 90) + 5) - 0.5) * shake
    const jy = (hash(Math.floor(lt * 90) + 51) - 0.5) * shake
    // engraving shadow pass, then the bronze face
    slam(o, text, 960 + jx + 5, y + jy + 6, p, { size, color: '#241404', from: 2.1, track: 4, alpha: 0.9 })
    slam(o, text, 960 + jx, y + jy, p, { size, color: '#ecd28a', from: 2.1, track: 4, glow: '#8a5f1c', glowBlur: size * 0.2 })
  }
}

// ============================== S3 — THE EMISSARY + THE KICK ==============================
function drawEmissary(ctx, lt, t, overlay) {
  const { g, stop } = EMISSARY.warp(lt)
  const KICK = EMISSARY_EV.kick
  cam(ctx, 1.02, 900, 570)
  ctx.drawImage(S.bake.gates, -OS, -OS)
  // red banners snap until THE BEAT (wind stops at 9.4)
  const windK = g < EMISSARY_EV.beat ? 1 : 0.08 + 0.12 * Math.exp(-(g - EMISSARY_EV.beat) * 2.5)
  for (const [bx, sd] of [[862, 1], [1180, 2], [1498, 3]]) bannerCloth(ctx, bx, 336, t, sd, windK)
  // the black pit (foreground-left)
  pit(ctx, 470, 906)
  // Spartan flank (2 squad) behind Leonidhair
  for (const [sx2, sd] of [[232, 0], [300, 3]]) {
    ART.contactShadow(ctx, sx2, 914, 34, 0.3)
    ART.cape(ctx, sx2 - 8, ART.crownY(S.squad[sd], 914, 2.45) + 44 * 2.45, 2.45, t, sd, CRIMSONS[sd], { gust: 0.5 + windK * 0.5 })
    sprite(ctx, S.squad[sd], sx2, 914, { ...standFl(g), sx: 2.45, sy: 2.45 })
    ART.spear(ctx, sx2 - 26, 914 - 150, 0.08, 2.1, { len: 150 })
  }
  // ---- the emissary + guards (drawn before the king so the kick reads in front) ----
  const emX = 700
  const frozen = stop != null && stop.g === KICK
  if (g < 11.0) {
    ART.contactShadow(ctx, frozen ? 706 : emX, 900, 36, 0.35)
    sprite(ctx, S.emissary, frozen ? 706 : emX, 900, {
      lift: [2, 0], stride: [1, 0],
      lean: frozen ? -0.26 : g > 9.4 ? -0.06 : Math.sin(g * 1.3) * 0.03,
      rot: frozen ? -0.2 : 0, sx: 2.5, sy: 2.5, flip: true,
    })
  } else {
    // pinwheel back over the pit (ballistic), clipped inside it at the end
    const u = seg(g, 11.0, 12.15)
    if (u < 1) {
      const px = 706 - u * 290
      const py = 880 - Math.sin(u * Math.PI) * 250 + u * u * 210
      const rot = -u * 11
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(470, 906, 205, 44, 0, 0, 7)
      ctx.rect(px - 220, py - 340, 440, 620)
      ctx.clip()
      ART.contactShadow(ctx, px, 906, 30 * (1 - u), 0.3 * (1 - u))
      sprite(ctx, S.emissary, px, py, { lift: [6, 4], stride: [3, -3], rot, sx: 2.5, sy: 2.5, flip: true })
      ctx.restore()
    }
  }
  // guards flinch back after the kick
  for (const [gx0, sd] of [[545, 4], [778, 5]]) {
    const recoil = seg(g, 10.55, 11.3)
    const gx = gx0 - (g > 10.55 ? E.outCubic(recoil) * 46 : 0)
    ART.contactShadow(ctx, gx, 908, 32, 0.3)
    sprite(ctx, S.slaves[sd], gx, 908, {
      lift: [2, 0], stride: [1, 0],
      lean: g > 10.55 ? -0.18 * (1 - 0.4 * recoil) : Math.sin(g * 1.7 + sd) * 0.03,
      sx: 2.35, sy: 2.35, flip: true,
    })
    ART.spear(ctx, gx + 24, 908 - 140, -0.12 - (g > 10.55 ? 0.1 : 0), 1.9, { len: 140 })
  }
  // ---- Leonidhair (drawn LAST: the kick must read in front of everyone) ----
  const approach = seg(g, 9.9, KICK)
  const lKick = (stop != null && stop.g === KICK) || (g >= KICK && g < 10.75)
  const leoX = g < 6.0 ? 340 : g < 6.9 ? lerp(340, 452, E.outCubic(seg(g, 6.0, 6.9)))
    : g < 9.9 ? 452 : lerp(452, 604, E.inQuad(approach))
  const leoLean = lKick ? 0.18 : approach > 0 && approach < 1 ? 0.16 : 0.03
  ART.contactShadow(ctx, leoX, 906, 40, 0.4)
  ART.cape(ctx, leoX - 10, ART.crownY(S.leo, 906, 2.6) + 44 * 2.6, 2.6, t, 5, '#a02818', {
    gust: (approach > 0 ? 1.6 : 0.7) + windK * 0.4,
  })
  sprite(ctx, S.leo, leoX, 906, {
    ...(lKick ? { lift: [0, 26], stride: [0, 24] } : approach > 0 && approach < 1 ? walkCycF(g * 9, 6) : standFl(g)),
    lean: leoLean, sx: 2.6, sy: 2.6,
  })
  ART.spear(ctx, leoX - 30, 906 - 150, lKick ? -0.25 : 0.1, 2.2, { len: 155 })
  ART.hoplon(ctx, leoX - 38, 906 - 96, 1.35, {})
  // ---- impacts (real t) ----
  const kAge = t - MASTER.kick
  if (kAge > -0.05 && kAge < 1.4) {
    ART.dustBurst(ctx, 718, 770, kAge, 81, { n: 20, spread: 240, life: 0.9 })
    ART.sparkBurst(ctx, 712, 776, kAge, 82)
    ART.shockRing(ctx, 706, 788, kAge, 0.5)
  }
  const bAge = t - MASTER.kickWordIs
  if (bAge > 0 && bAge < 0.7) ART.dustBurst(ctx, 526, 896, bAge, 83, { n: 9, spread: 120, life: 0.6 })
  const vAge = t - MASTER.kickWordShearta
  if (vAge > 0 && vAge < 0.6) {
    ctx.globalAlpha = 0.5 * (1 - vAge / 0.6)
    ctx.fillStyle = '#0a0608'
    ctx.beginPath()
    ctx.ellipse(450, 896, 90 + vAge * 160, 26 + vAge * 40, 0, 0, 7)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.restore()
  // ---- THE KICK WORDS (picture slams, overlay; never captions) ----
  kickWords(overlay, lt)
  ART.bars(ctx)
}

// ============================== S4 — MARCH + DINE IN BALD ==============================
const kneelPose = (g) => ({ lift: [8, 8], stride: [2, -2], lean: 0.22 + Math.sin(g * 3) * 0.02 })

function drawMarch(ctx, lt, t) {
  const g = MARCH.warp(lt).g
  const camX = g < 2.5 ? lerp(1020, 1240, E.inOutCubic(seg(g, 0, 2.5)))
    : g < 6.5 ? lerp(1240, 1480, seg(g, 4.5, 6.5))
    : lerp(1480, 1560, seg(g, 6.5, 7.6))
  cam(ctx, 1.0, camX, 570, ...shakeXY(t, g > 0.2 && g < 6.4 ? 1.1 : 0))
  ctx.drawImage(S.bake.coast, -OS, -OS)
  ART.seaShimmer(ctx, 660, 880, t, 'rgba(214,196,152,0.5)')
  ART.emberRise(ctx, t, 8, 17, { y0: 500, y1: 930 })
  // ---- the column (steps on the 92 bpm quarter until camp) ----
  const marching = g > 1.15 && g < 6.35
  const ph = (g / MARCH_STEP) * Math.PI
  const headX = g < 1.15 ? 1100 : g < 6.35 ? lerp(1100, 1560, seg(g, 1.15, 6.35)) : 1560
  // squad trail behind the king (150 px spacing — capes never caterpillar)
  for (let i = 0; i < 5; i++) {
    const campX = 1400 + i * 80
    const mx = g >= 6.35 ? lerp(headX + 130 + i * 150, campX, seg(g, 6.35, 7.1)) : headX + 130 + i * 150
    const feet = 918 + (i % 3) * 9
    const atCamp = g >= 6.9
    ART.contactShadow(ctx, mx, feet, 34, 0.32)
    ART.cape(ctx, mx - 8, ART.crownY(S.squad[i], feet, 2.4) + 44 * 2.4, 2.4, t, 20 + i, CRIMSONS[i], { gust: marching ? 1.2 : 0.5 })
    sprite(ctx, S.squad[i], mx, feet, {
      ...(atCamp ? kneelPose(g) : marching ? walkCycF(ph + i * 0.7, 6) : stand_),
      sx: 2.4, sy: 2.4,
    })
    if (atCamp && i < 3) {
      // whetstone + comb + shing glint
      ART.comb(ctx, mx + 30, feet - 40, 0.5, 1.3)
      ctx.fillStyle = '#5a4a38'
      ctx.fillRect(mx + 40, feet - 12, 40, 10)
      const shing = (g * 2 / MARCH_STEP + i * 0.37) % 1
      if (g > 7.0 && shing < 0.14) ART.glint(ctx, mx + 30, feet - 40, 30, shing / 0.14)
    } else if (i % 2 === 0) {
      ART.torch(ctx, mx + 30, feet - 190, 1.1, t, i + 1)
    }
  }
  // ---- the king at the column's head ----
  const leoMarching = g > 1.15 && g < 6.6
  ART.contactShadow(ctx, headX, 906, 40, 0.4)
  ART.cape(ctx, headX - 10, ART.crownY(S.leo, 906, 2.6) + 44 * 2.6, 2.6, t, 5, '#a02818', { gust: leoMarching ? 1.3 : 0.6 })
  sprite(ctx, S.leo, headX, 906, {
    ...(leoMarching ? walkCycF(ph, 6) : standFl(g)), sx: 2.6, sy: 2.6,
  })
  ART.spear(ctx, headX - 30, 906 - 150, leoMarching ? 0.35 : 0.1, 2.2, { len: 155 })
  // ---- QUEEN FLOWGO: one beat, folded into the march start (33-37) ----
  if (g < 4.6) {
    const qGrip = g < 1.15
    ART.contactShadow(ctx, 1002, 922, 34, 0.34)
    sprite(ctx, S.queen, 1002, 922, {
      lift: [2, 0], stride: [1, 0], lean: qGrip ? 0.1 : Math.sin(g * 1.1) * 0.02,
      sx: 2.45, sy: 2.45,
    })
    if (qGrip) {
      // her arm crosses to grip the king's forearm
      ctx.strokeStyle = '#c8a488'
      ctx.lineWidth = 7
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(1002 + 16, 922 - 168)
      ctx.quadraticCurveTo(1042, 922 - 190, headX - 34, 906 - 172)
      ctx.stroke()
      ctx.fillStyle = '#c8a488'
      ctx.beginPath(); ctx.arc(headX - 34, 906 - 172, 6, 0, 7); ctx.fill()
    }
  }
  // ---- camp: fire, the pole, the eyes-it-then-his-spear Spartan ----
  campfire(ctx, 1660, 892, t)
  const glowK = seg(g, MARCH_EV.poleReveal, MARCH_EV.poleReveal + 0.6)
  ART.barbershopPole(ctx, 1900, 880, 1.15, t, glowK)
  if (glowK > 0 && glowK < 1) {
    ctx.globalAlpha = 0.4 * Math.sin(glowK * Math.PI)
    ctx.fillStyle = '#ffd0a0'
    ctx.fillRect(1830, 700, 140, 4)
    ctx.globalAlpha = 1
  }
  // 1503 eyes the pole, then his spear
  if (g > 7.9 && g < 11.5) {
    const look = seg(g, 8.1, 8.5), look2 = seg(g, 8.8, 9.2)
    sprite(ctx, S.squad[0], 1760, 918, {
      lift: [2, 0], stride: [1, 0],
      lean: 0.16 * (1 - look2) - 0.1 * look2,
      sx: 2.4, sy: 2.4,
    })
    ART.spear(ctx, 1760 + 30, 918 - 150, 0.1, 2.1, { len: 150 })
  }
  ctx.restore()
  ART.bars(ctx)
}

function campfire(ctx, x, y, t) {
  ctx.save()
  ctx.fillStyle = '#4e3c2c'
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 40, y + Math.sin(a) * 12, 10, 6, a, 0, 7); ctx.fill()
  }
  ctx.strokeStyle = '#2e2012'
  ctx.lineWidth = 9
  ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x - 26, y + 4); ctx.lineTo(x + 22, y - 8); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 20, y - 8); ctx.lineTo(x + 26, y + 4); ctx.stroke()
  const halo = ctx.createRadialGradient(x, y - 30, 4, x, y - 30, 170)
  halo.addColorStop(0, 'rgba(255,170,80,0.34)')
  halo.addColorStop(1, 'rgba(255,170,80,0)')
  ctx.fillStyle = halo
  ctx.fillRect(x - 170, y - 200, 340, 340)
  for (const [dx, s2, sd] of [[-10, 1, 1], [8, 0.8, 2], [0, 1.25, 3]]) {
    const fl = Math.sin(t * 10.3 + sd * 5) * 0.5 + Math.sin(t * 16.1 + sd * 9) * 0.5
    const fh = 46 * s2 + fl * 7 * s2
    ctx.fillStyle = '#ff9a3a'
    ctx.beginPath()
    ctx.moveTo(x + dx - 9 * s2, y - 4)
    ctx.quadraticCurveTo(x + dx - 10 * s2 + fl * 3, y - fh * 0.55, x + dx + fl * 3 * s2, y - fh)
    ctx.quadraticCurveTo(x + dx + 10 * s2 + fl * 3, y - fh * 0.55, x + dx + 9 * s2, y - 4)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffd98a'
    ctx.beginPath(); ctx.ellipse(x + dx + fl * 1.5, y - fh * 0.35, 4 * s2, 8 * s2, 0, 0, 7); ctx.fill()
  }
  for (let i = 0; i < 7; i++) {
    const life = 1.2 + hash(i * 3.7) * 0.8
    const age = ((t * (0.7 + hash(i * 9.1) * 0.5) + hash(i * 5.3) * life) % life)
    const sx2 = x + Math.sin(age * 5 + i) * 16
    const sy2 = y - 40 - age * 90
    ctx.globalAlpha = (1 - age / life) * 0.8
    ctx.fillStyle = '#ffcf7a'
    ctx.fillRect(sx2, sy2, 2.6, 2.6)
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

// ============================== S5 — PHALANX / FIRST WAVE ==============================
const DEF = [
  { i: 0, x: 1078, feet: 932 }, { i: 1, x: 1152, feet: 922 }, { i: 2, x: 1232, feet: 910, leo: true },
  { i: 3, x: 1312, feet: 926 }, { i: 4, x: 1392, feet: 916 }, { i: 5, x: 1468, feet: 934 },
]
const crawlG = (g) => (g < 5.2 ? g : g < 6.0 ? 5.2 + (g - 5.2) * 0.35 : 5.48 + (g - 6.0))

function drawPhalanx(ctx, lt, t) {
  const { g, stop, sl } = PHALANX.warp(lt) // sl is a SIBLING of stop — never stop.sl
  cam(ctx, 1.0, 960, 570, ...shakeXY(t, shakePhalanx(t)))
  ctx.drawImage(S.bake.pass, -OS, -OS)
  ART.seaShimmer(ctx, 650, 860, t, 'rgba(240,204,140,0.4)')
  ART.ashFall(ctx, g, 16, 23, { t, windX: -8 })
  // ---- the slave wave ----
  drawWave(ctx, g, false)
  drawWave(ctx, g, true)
  // ---- the shield wall ----
  const set = seg(g, PHALANX_EV.wallSet, PHALANX_EV.wallSet + 0.5)
  const braceIn = E.outCubic(set) // brace pose eases in over ~9 frames — no 1-frame snaps
  const reformIn = E.outCubic(seg(g, PHALANX_EV.reform, PHALANX_EV.reform + 0.4))
  const slamStop = stop != null && stop.g === PHALANX_EV.wallSlam
  const lurch = slamStop ? Math.sin(cl(sl / 0.3) * Math.PI) * 26 : 0
  const bored = g > PHALANX_EV.reform
  for (const d of DEF) {
    const dx = d.x - lurch
    const feet = d.feet
    const rig = d.leo ? S.leo : S.squad[d.i % 5]
    ART.contactShadow(ctx, dx, feet, 36, 0.34)
    ART.cape(ctx, dx - 8, ART.crownY(rig, feet, 2.5) + 44 * 2.5, 2.5, t, 30 + d.i, CRIMSONS[d.i % 5], {
      gust: bored ? lerp(1.3, 0.4, reformIn) : lerp(0.8, 1.3, braceIn),
    })
    // spear levels into the brace (and rises at the bored reform) on an eased arc
    const spearAng = bored ? lerp(-1.45, 0.1, reformIn) : lerp(-0.35, -1.45, braceIn)
    const thrust = d.leo ? thrustU(g) : 0
    sprite(ctx, rig, dx + thrust * 40, feet, {
      lift: [2, 0], stride: [1, 0],
      lean: bored ? lerp(-0.07, 0.02, reformIn) + Math.sin(g * 1.2) * 0.015 * reformIn : lerp(0.02, -0.07 + lurch * 0.004, braceIn),
      sx: 2.5, sy: 2.5,
    })
    ART.spear(ctx, dx - 26 + thrust * 90, feet - 138, spearAng, 2.2, { len: 165 })
    ART.hoplon(ctx, dx - 40 + thrust * 20, feet - lerp(118, 128, braceIn), 2.0, {})
  }
  // ---- impacts (real t, bloom through the freezes) ----
  const wAge = t - MASTER.wallSlam
  if (wAge > -0.05 && wAge < 1.1) {
    for (const bx of [1060, 1180, 1300]) ART.dustBurst(ctx, bx, 850, wAge, 91 + (bx % 7), { n: 12, spread: 200, life: 0.9 })
    ART.shockRing(ctx, 1150, 820, wAge, 0.45)
  }
  for (const [ev, seed] of [[MASTER.kill1, 93], [MASTER.kill2, 94]]) {
    const a = t - ev
    if (a > 0 && a < 0.8) {
      ART.sparkBurst(ctx, 1030, 800, a, seed)
      ART.dustBurst(ctx, 1020, 840, a, seed + 1, { n: 10, spread: 160, life: 0.7 })
      ART.shockRing(ctx, 1030, 800, a, 0.3)
    }
  }
  ctx.restore()
  ART.bars(ctx)
}
const shakePhalanx = (t) => {
  const w = t - MASTER.wallSlam
  if (w > 0 && w < 0.5) return 7 * (1 - w / 0.5)
  const k1 = t - MASTER.kill1
  if (k1 > 0 && k1 < 0.4) return 5 * (1 - k1 / 0.4)
  const k2 = t - MASTER.kill2
  if (k2 > 0 && k2 < 0.4) return 5 * (1 - k2 / 0.4)
  return 0
}
const thrustU = (g) => {
  const u1 = seg(g, 8.0, 8.14) - seg(g, 8.4, 8.7)
  const u2 = seg(g, 12.15, 12.29) - seg(g, 12.55, 12.85)
  return cl(Math.max(u1, u2))
}
// the wave: near (soldier cut, shields) or far (far rigs, mass)
function drawWave(ctx, g, near) {
  const ids = near ? S.slaves.slice(0, 4) : S.slaves.slice(4)
  for (let i = 0; i < ids.length; i++) {
    const startX = near ? -260 - i * 130 : -420 - i * 150
    const speed = near ? 350 : 330
    const wall = near ? 1015 - i * 16 : 980 - i * 18
    const lin = startX + (g - PHALANX_EV.persiansCharge) * speed
    // crash into the shield wall and SETTLE back on an exponential ease-out
    // (~7-10 frames) — never a hard clamp dead-stop
    const over = Math.max(0, lin - wall)
    let x = wall + over * Math.exp(-over / 70)
    let feet = near ? 918 + (i % 2) * 10 : 868 + (i % 2) * 8
    let rot = 0
    let alpha = near ? 1 : 0.94
    let flip = false
    if (g > PHALANX_EV.waveBreaks) { x = wall - (g - PHALANX_EV.waveBreaks) * 420 - i * 30; flip = true }
    // press against the wall, fading in over ~0.4 s after contact
    const pressA = 5 * E.outCubic(seg(g, PHALANX_EV.contact, PHALANX_EV.contact + 0.4))
    if (g > PHALANX_EV.contact && g < PHALANX_EV.waveBreaks) x += Math.sin(crawlG(g) * 2 + i) * pressA
    const killT = near ? (i === 1 ? PHALANX_EV.kill1 : i === 2 ? PHALANX_EV.kill2 : null) : (i === 0 ? PHALANX_EV.kill2 : null)
    if (killT && g > killT) {
      const fu = seg(g, killT, killT + 0.4)
      rot = fu * 1.8
      feet += fu * 26
      alpha = 1 - fu * 0.15
      x = lerp(x, wall - 6, fu)
    }
    if (x < -240 || x > 2200) continue
    ART.contactShadow(ctx, x, feet, 30, 0.28)
    sprite(ctx, ids[i], x, feet, {
      ...(flip ? walkCycF(g * 13, 7) : g < PHALANX_EV.wallSlam ? walkCycF(g * 11 + i, 6) : stand_),
      lean: flip ? -0.1 : 0.12, rot, sx: near ? 2.35 : 2.1, sy: near ? 2.35 : 2.1, alpha, flip,
    })
  }
}

// ============================== S6 — XERXES ==============================
function drawXerxes(ctx, lt, t) {
  const g = XERXES.warp(lt).g
  cam(ctx, 1.0, 960, 560)
  ctx.drawImage(S.bake.pass, -OS, -OS)
  ART.seaShimmer(ctx, 650, 860, t, 'rgba(244,208,140,0.4)')
  // the shadow slides over the pass
  const shU = seg(g, XERXES_EV.shadow, XERXES_EV.shadow + 2.5)
  if (shU > 0 && shU < 1) {
    const sx0 = lerp(2200, 300, shU)
    const sg = ctx.createLinearGradient(sx0 - 500, 0, sx0 + 200, 0)
    sg.addColorStop(0, 'rgba(16,8,10,0)')
    sg.addColorStop(0.7, 'rgba(16,8,10,0.3)')
    sg.addColorStop(1, 'rgba(16,8,10,0.36)')
    ctx.fillStyle = sg
    ctx.fillRect(sx0 - 500, 620, 700, 460)
  }
  // ---- Immortals behind (chrome masks catch the light at 3.5) ----
  const imIn = seg(g, 2.8, 4.6)
  if (imIn > 0) {
    for (let i = 0; i < 4; i++) {
      const ix = lerp(1980, 1620 + i * 82, E.outCubic(cl(imIn * 1.2 - i * 0.1)))
      const feet = 928 - i * 13
      ART.contactShadow(ctx, ix, feet, 32, 0.32)
      sprite(ctx, S.immortals[i], ix, feet, { lift: [2, 0], stride: [1, 0], lean: imIn < 1 ? 0.08 : 0.02, sx: 2.4, sy: 2.4 })
      ART.immortalMask(ctx, ix + 2, ART.crownY(S.immortals[i], feet, 2.4) + 19, 2.4, t, 0)
      const gAge = t - XERXES.abs(XERXES_EV.immortals) - i * 0.14
      if (gAge > 0 && gAge < 0.5) ART.glint(ctx, ix + 2, ART.crownY(S.immortals[i], feet, 2.4) + 34, 44, gAge / 0.5)
    }
  }
  // ---- the throne-platform + 8 bearers ----
  const entering = seg(g, XERXES_EV.enter, XERXES_EV.enter + 2.9)
  const px = lerp(2340, 1470, E.outCubic(entering))
  const moving = entering < 1
  const bph = (g / 0.8) * Math.PI
  for (const rank of [1, 0]) { // back rank first
    for (let i = 0; i < 4; i++) {
      const bx = px - 210 + i * 140 + rank * 70
      const feet = rank ? 918 : 950
      ART.contactShadow(ctx, bx, feet, 30, 0.3)
      sprite(ctx, S.slaves[(i + rank * 4) % 8], bx, feet, {
        ...(moving ? walkCycF(bph + i * 0.5, 6) : stand_), sx: rank ? 2.1 : 2.3, sy: rank ? 2.1 : 2.3,
      })
    }
  }
  // platform: gold-trimmed stone slab on poles
  const pTop = 700
  ctx.fillStyle = '#3a2c20'
  for (const lx of [px - 220, px - 80, px + 80, px + 220]) ctx.fillRect(lx - 9, pTop, 18, 240)
  const pg = ctx.createLinearGradient(0, pTop - 34, 0, pTop + 26)
  pg.addColorStop(0, '#6e5844'); pg.addColorStop(0.5, '#4a3a2c'); pg.addColorStop(1, '#2c2218')
  ctx.fillStyle = pg
  ctx.fillRect(px - 300, pTop - 30, 600, 66)
  ctx.fillStyle = PAL_GOLD
  ctx.fillRect(px - 300, pTop - 36, 600, 8)
  ctx.fillStyle = PAL_GOLD_HI
  ctx.fillRect(px - 300, pTop - 36, 600, 3)
  ctx.fillStyle = '#241a12'
  ctx.fillRect(px - 300, pTop + 30, 600, 6)
  // ---- XERXES, colossal ----
  ART.contactShadow(ctx, px, pTop - 44, 90, 0.4)
  sprite(ctx, S.xerxes, px, pTop - 44, { lift: [2, 0], stride: [1, 0], lean: 0.02 + Math.sin(g * 0.8) * 0.012, sx: 3.0, sy: 3.0 })
  // ---- the golden wig offer ----
  const riseK = E.outCubic(seg(g, XERXES_EV.wigOffer, XERXES_EV.wigOffer + 0.6))
  if (riseK > 0) ART.wigOffer(ctx, 1230, 830, 1.75, riseK, t)
  // ---- Leonidhair steps up + THE REFUSAL ----
  const stepU = seg(g, XERXES_EV.stepUp, XERXES_EV.stepUp + 0.9)
  const lx = lerp(940, 1160, E.outCubic(stepU))
  const refusal = seg(g, XERXES_EV.refusal, XERXES_EV.refusal + 0.45)
  // cape snap on the refusal: 2-3 sharp frames of billow flipping toward the
  // front, decaying in ~0.5 s
  const snapK = g >= XERXES_EV.refusal ? Math.exp(-(g - XERXES_EV.refusal) * 9) : 0
  const leoFeet = 920
  ART.contactShadow(ctx, lx, leoFeet, 40, 0.4)
  ART.cape(ctx, lx - 10, ART.crownY(S.leo, leoFeet, 2.6) + 44 * 2.6, 2.6, t, 5, '#a02818', {
    gust: 0.9 + refusal * 1.4, kick: snapK,
  })
  sprite(ctx, S.leo, lx, leoFeet, {
    ...(stepU > 0 && stepU < 1 ? walkCycF(g * 8, 6) : standFl(g)),
    lean: -0.05 * refusal, sx: 2.6, sy: 2.6,
  })
  ART.spear(ctx, lx - 28, leoFeet - 150 - refusal * 40, 0.1 - refusal * 0.32, 2.2, { len: 160 })
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S7 — ARROW STORM / COMB IN THE SHADE ==============================
const ROOF = { y: 560, x0: 1040, x1: 1520 }
function drawStorm(ctx, lt, t) {
  const { g } = STORM.warp(lt)
  cam(ctx, 1.0, 1130, 560, ...shakeXY(t, g > STORM_EV.clatter && g < STORM_EV.clatter + 8 ? 1.4 : 0))
  ctx.drawImage(S.bake.pass, -OS, -OS)
  ART.seaShimmer(ctx, 650, 860, t, 'rgba(240,204,140,0.3)')
  // the sky BLACKENS
  const black = seg(g, STORM_EV.blacken, STORM_EV.blacken + 1.6)
  if (black > 0) {
    const bg = ctx.createLinearGradient(0, 0, 0, 800)
    bg.addColorStop(0, `rgba(16,10,22,${0.82 * black})`)
    bg.addColorStop(0.6, `rgba(20,12,24,${0.6 * black})`)
    bg.addColorStop(1, `rgba(28,16,22,${0.34 * black})`)
    ctx.fillStyle = bg
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  }
  // ---- the shield roof ----
  const roofK = seg(g, STORM_EV.roofLock, STORM_EV.roofLock + 0.6)
  for (const d of DEF) {
    const feet = d.feet
    const dx = d.x + 40
    ART.contactShadow(ctx, dx, feet, 36, 0.34)
    ART.cape(ctx, dx - 8, ART.crownY(d.leo ? S.leo : S.squad[d.i % 5], feet, 2.5) + 44 * 2.5, 2.5, t, 30 + d.i, CRIMSONS[d.i % 5], { gust: 0.5 })
    sprite(ctx, d.leo ? S.leo : S.squad[d.i % 5], dx, feet, {
      lift: [2 + roofK * 4, 2 + roofK * 4], stride: [1, 0], lean: -0.04 - roofK * 0.04,
      sx: 2.5, sy: 2.5 * (1 - roofK * 0.05),
    })
    ART.spear(ctx, dx - 6, feet - 140, -0.1 - roofK * 0.06, 2.2, { len: 165 })
    // shields rise from chest to the locked roof
    const shY = feet - lerp(126, 268 + (d.i % 2) * 8, E.outCubic(roofK))
    ART.hoplon(ctx, dx + (d.i - 2.5) * 6 * roofK, shY, 2.1, {})
    // clatter sparks at shield contact points
    if (g > STORM_EV.clatter) {
      const cp = (t * 7 + d.i * 1.31) % 1
      if (cp < 0.1) ART.sparkBurst(ctx, dx + (d.i - 2.5) * 6, shY + 20, (cp / 0.1) * 0.12, 60 + d.i)
    }
  }
  // thin slit lights through the roof after it locks
  if (roofK > 0.2) {
    for (const d of DEF) {
      if (d.i === 5) continue
      ctx.save()
      ctx.globalAlpha = 0.1 * roofK
      ctx.fillStyle = '#f2d8a0'
      ctx.beginPath()
      ctx.moveTo(d.x + 78, ROOF.y + 40)
      ctx.lineTo(d.x + 92, ROOF.y + 40)
      ctx.lineTo(d.x + 104, 940)
      ctx.lineTo(d.x + 76, 940)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }
  // ---- the falling razor storm (thousands over the shot, O(visible) per frame) ----
  const base = seg(g, STORM_EV.blacken, STORM_EV.stormPeak)
  const snipDip = g > STORM_EV.snip
  ART.razorStorm(ctx, lt, {
    density: base,
    rate: 250,
    seed: 71,
    // at the snip, airborne glyphs are tagged with ~3x gravity and fall out
    // through the roof / frame bottom — the sky empties physically, no cull-pop
    dip: snipDip ? { at: STORM_EV.snip, k: 0.16 } : null,
    roofY: roofK > 0.5 ? ROOF.y : 1e9,
    roofX0: ROOF.x0,
    roofX1: ROOF.x1,
    windX: 24,
  })
  // ---- the snip: ONE crimson strand floats down (nudged clear of the rim) ----
  const sn = seg(g, STORM_EV.snip, STORM_EV.snip + 2.0)
  if (sn > 0 && sn < 1) {
    const sx2 = 1244 + Math.sin(sn * 9) * 10 * (1 - sn)
    const sy2 = lerp(542, 692, E.outQuad(sn))
    ctx.save()
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#a03030'
    ctx.lineWidth = 3.4
    ctx.beginPath()
    ctx.moveTo(sx2, sy2)
    ctx.quadraticCurveTo(sx2 + 8, sy2 + 14, sx2 + Math.sin(g * 4) * 5, sy2 + 30)
    ctx.stroke()
    ctx.strokeStyle = '#d05038'
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.restore()
  }
  // the smile: slit-light warm on the king's face
  const sm = seg(g, STORM_EV.smile, STORM_EV.smile + 0.5)
  if (sm > 0 && sm < 1) {
    const fy = ART.crownY(S.leo, DEF[2].feet, 2.5) + 40
    ctx.save()
    ctx.globalAlpha = 0.5 * Math.sin(sm * Math.PI)
    const fg = ctx.createRadialGradient(1272, fy, 4, 1272, fy, 60)
    fg.addColorStop(0, 'rgba(255,214,140,0.7)')
    fg.addColorStop(1, 'rgba(255,214,140,0)')
    ctx.fillStyle = fg
    ctx.fillRect(1190, fy - 60, 170, 170)
    ctx.restore()
  }
  ctx.restore()
  ART.bars(ctx)
}

// ============================== S8 — THE LAST STAND + FREEZE ==============================
function drawLaststand(ctx, lt, t) {
  const { g, stop, sl } = LASTSTAND.warp(lt)
  // motion-time: crawls after the hurl, pins in the freeze; heartbeat lives on sl
  const wt = g <= 5.5 ? g : g < 7.5 ? 5.5 + (g - 5.5) * 0.28 : 5.5 + 2.0 * 0.28
  cam(ctx, 1.05, 960, 560)
  ctx.drawImage(S.bake.dustPlain, -OS, -OS)
  ART.ashFall(ctx, g, 46, 31, { t: stop ? wt + sl * 0.4 : wt, windX: 10 })
  ART.emberRise(ctx, t, 18, 33, { y0: 380, y1: 940 })
  // the fallen: slave silhouettes + torn capes half-buried
  for (const [i, rig] of [S.slaves[0], S.slaves[2], S.slaves[5]].entries()) {
    sprite(ctx, rig, 380 + i * 300, 948 + i * 6, { rot: i % 2 ? 1.5 : -1.45, alpha: 0.8, sx: 2.2, sy: 2.2, lift: [2, 0] })
  }
  for (const [cx0, cy0] of [[560, 946], [1120, 952], [1520, 944]]) {
    ctx.fillStyle = 'rgba(110,26,16,0.75)'
    ctx.beginPath()
    ctx.ellipse(cx0, cy0, 54, 12, 0.1, 0, 7)
    ctx.fill()
    ctx.fillStyle = 'rgba(70,14,10,0.7)'
    ctx.beginPath()
    ctx.ellipse(cx0 + 30, cy0 + 4, 30, 8, -0.15, 0, 7)
    ctx.fill()
  }
  // ---- Leonidhair, alone ----
  const runU = seg(wt, LASTSTAND_EV.runUp, LASTSTAND_EV.hurl)
  const lx = lerp(760, 1016, cl(runU))
  const anticip = seg(g, 5.1, 5.333)
  const released = g >= LASTSTAND_EV.hurl
  const lean = anticip > 0 && !released ? -0.14 - anticip * 0.08 : released ? 0.26 : 0.16
  const feet = 916
  ART.contactShadow(ctx, lx, feet, 42, 0.4)
  ART.cape(ctx, lx - 12, ART.crownY(S.leo, feet, 2.7) + 44 * 2.7, 2.7, wt, 5, '#a02818', {
    gust: 1.9, torn: true, len: 84, // torn + thinned
  })
  sprite(ctx, S.leo, lx, feet, {
    ...(released ? { lift: [4, 0], stride: [10, -6] } : runU > 0 ? walkCycF(wt * 5.2, 7) : standFl(g)),
    lean, sx: 2.7, sy: 2.7,
  })
  // the spear: in hand -> anticipation pull-back -> HURL at 5.333 -> floating flight
  const u = spearU(g)
  if (u <= 0) {
    const pull = seg(g, 5.1, 5.333)
    ART.spear(ctx, lx + 44 - pull * 30, feet - 186 + pull * 20, 0.35 - pull * 0.75, 2.3, { len: 160 })
  } else {
    const sx2 = 1020 + u * 860
    const sy2 = 690 - Math.sin(u * Math.PI) * 150 + u * u * 60
    ART.spear(ctx, sx2, sy2, 0.62 + u * 0.3, 2.3, { len: 160 })
    if (stop) ART.glint(ctx, sx2 + 18, sy2 - 30, 40, (0.35 + sl * 0.3) % 1)
  }
  // ---- THE FREEZE: heartbeat pulses + micro drift on sl; silence otherwise ----
  if (stop) {
    const beat = (u0) => (sl >= u0 && sl < u0 + 0.6 ? Math.exp(-(sl - u0) * 7) : 0)
    const k = Math.max(beat(0.4), beat(0.9))
    if (k > 0.01) {
      ctx.save()
      ctx.globalAlpha = 0.4 * k
      const hg = ctx.createRadialGradient(lx, feet - 130, 6, lx, feet - 130, 110)
      hg.addColorStop(0, 'rgba(180,40,24,0.8)')
      hg.addColorStop(1, 'rgba(180,40,24,0)')
      ctx.fillStyle = hg
      ctx.fillRect(lx - 120, feet - 250, 240, 260)
      ctx.restore()
    }
    // cut to black out of the frozen tail
    const out = seg(sl, 1.32, 1.5)
    if (out > 0) {
      ctx.save()
      ctx.globalAlpha = out
      ctx.fillStyle = '#050302'
      ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
      ctx.restore()
    }
  }
  ctx.restore()
  ART.bars(ctx)
}
const spearU = (g) => {
  if (g < LASTSTAND_EV.hurl) return 0
  if (g < 5.5) return seg(g, LASTSTAND_EV.hurl, 5.5) * 0.12
  // slow-mo crawl: fast off the hand, DECELERATING into the 93.5 pin
  if (g < 7.5) return 0.12 + 0.38 * E.outCubic(seg(g, 5.5, 7.5))
  return 0.5
}

// ============================== S9 — PLATAEA / LEGEND ==============================
function drawPlataea(ctx, lt, t) {
  const { g } = PLATAEA.warp(lt)
  const charge = seg(g, PLATAEA_EV.charge, PLATAEA_EV.charge + 1.9)
  cam(ctx, 1.02, 960 + E.inQuad(charge) * 40, 560, ...shakeXY(t, charge > 0 && charge < 1 ? 1.6 : 0))
  ctx.drawImage(S.bake.plataea, -OS, -OS)
  // ---- the risen host on the ridge: painted silhouettes with manes in the wind ----
  const riseK = seg(g, PLATAEA_EV.spearsRise, PLATAEA_EV.spearsRise + 0.6)
  const hostShift = E.inQuad(charge) * 46
  for (let i = 0; i < 64; i++) {
    const row = i % 3
    const u = i / 64 + hash(i * 7.7) * 0.02
    const hx = ((u * 2300 + hostShift * (1 + row * 0.4)) % 2300 + 2300) % 2300 - 190
    const hy = 626 + row * 19 + hash(i * 3.3) * 8
    const hs = 0.62 + row * 0.16 + hash(i * 9.1) * 0.1
    hostSil(ctx, hx, hy, hs, t, i, riseK)
  }
  // ---- front rank: 12 real rigs ----
  for (let i = 0; i < 12; i++) {
    const col = i % 6, row = Math.floor(i / 6)
    const fx = 660 + col * 96 + row * 40 + E.inQuad(charge) * (240 + row * 60)
    const feet = 902 + row * 16 + (i % 2) * 6
    const rig = S.squad[i % 5]
    ART.contactShadow(ctx, fx, feet, 34, 0.32)
    ART.cape(ctx, fx - 8, ART.crownY(rig, feet, 2.3) + 44 * 2.3, 2.3, t, 40 + i, CRIMSONS[i % 5], { gust: charge > 0 ? 1.5 : 0.8 })
    sprite(ctx, rig, fx, feet, {
      ...(charge > 0 ? walkCycF(t * 10 + i, 6) : standFl(g)),
      sx: 2.3, sy: 2.3 - row * 0.06,
    })
    ART.spear(ctx, fx - 24, feet - 140, lerp(0.12, -0.55, riseK), 2.1, { len: 150 })
    if (charge > 0) {
      const step = (t * 2.2 + i * 0.31) % 1
      if (step < 0.12) ART.dustBurst(ctx, fx, feet, (step / 0.12) * 0.3, 200 + i, { n: 4, spread: 90, life: 0.5 })
    }
  }
  // ---- Dilios, foreground ----
  const dFeet = 952
  ART.contactShadow(ctx, 424, dFeet, 46, 0.42)
  sprite(ctx, S.dilios, 424, dFeet, { lift: [2, 0], stride: [1, 0], lean: 0.02 + Math.sin(t * 0.9) * 0.012, sx: 3.0, sy: 3.0 })
  ART.spear(ctx, 424 - 34, dFeet - 170, lerp(0.12, -0.5, riseK), 2.5, { len: 160 })
  // ---- END CARD: the scene dims under the gold ----
  const card = seg(g, PLATAEA_EV.endCard, PLATAEA_EV.endCard + 0.7)
  if (card > 0) {
    ctx.save()
    ctx.globalAlpha = 0.8 * card
    ctx.fillStyle = '#0a0605'
    ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
    ctx.globalAlpha = card
    const rg = ctx.createRadialGradient(960, 540, 30, 960, 540, 460)
    rg.addColorStop(0, 'rgba(232,180,90,0.14)')
    rg.addColorStop(1, 'rgba(232,180,90,0)')
    ctx.fillStyle = rg
    ctx.fillRect(500, 80, 920, 920)
    ctx.strokeStyle = '#c9a45c'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(620, 430); ctx.lineTo(1300, 430)
    ctx.moveTo(620, 686); ctx.lineTo(1300, 686)
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()
  ART.bars(ctx)
}
// one silhouetted maned figure on the ridge
function hostSil(ctx, x, y, s, t, seed, riseK) {
  const sway = Math.sin(t * 1.3 + seed * 1.7) * 3 * s
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.fillStyle = '#241a18'
  ctx.beginPath()
  ctx.moveTo(-5, 0)
  ctx.lineTo(-4, -22)
  ctx.lineTo(4, -22)
  ctx.lineTo(5, 0)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath(); ctx.arc(0, -27, 4.4, 0, 7); ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-4, -29)
  ctx.quadraticCurveTo(-7 + sway, -38, -2 + sway, -41)
  ctx.quadraticCurveTo(3 + sway * 0.5, -39, 4, -30)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#1c1414'
  ctx.lineWidth = 1.6
  const ang = lerp(0.15, -1.25, riseK)
  ctx.beginPath()
  ctx.moveTo(3, -10)
  ctx.lineTo(3 + Math.sin(ang) * 30, -10 - Math.cos(ang) * 30)
  ctx.stroke()
  ctx.restore()
}

// ============================== the film ==============================
export default {
  title: '3000 — A REMY BOYS EPIC',
  output: '3000.mp4',
  duration: DUR,
  async prepare() {
    S.bake = await ART.build()
    const load = (i, far) => A.loadRemy(i, far)
    // the king: baked greatsword stripped (remember-the-flow pattern), bronze cuirass
    S.leo = ART.cuirass(ART.stripLeftBlade(await load(LEO_ID)))
    // the boy: same strip, sun-tanned leather chest, scaled ~0.55
    S.young = ART.miniRig(ART.cuirass(ART.stripLeftBlade(await load(LEO_ID)), {
      tint: '#a8805e', hi: '#caa27a', deep: '#6e4e36',
    }), 0.55)
    S.dilios = await load(1519)
    S.queen = ART.queenClean(ART.keepMain(await load(12)))
    S.xerxes = ART.gildXerxes(await load(3281))
    S.emissary = ART.silkRobe(await load(1264))
    S.squad = []
    for (let i = 0; i < SQUAD_IDS.length; i++) {
      S.squad.push(ART.cuirass(await load(SQUAD_IDS[i]), {
        tint: i % 2 ? '#7e6034' : '#8a6a3a', hi: i % 2 ? '#b8924e' : '#c9a45c',
      }))
    }
    S.slaves = []
    for (const id of SLAVE_IDS) {
      let rig = await load(id)
      if (id === 2487) rig = ART.trimStray(rig)
      S.slaves.push(ART.wickerMass(rig, { shield: S.slaves.length < 4 }))
    }
    S.immortals = []
    for (const id of IMMORTAL_IDS) S.immortals.push(await load(id))
  },
  shots: SHOTS.map((sh) => ({
    name: sh.name,
    t0: sh.t0,
    t1: sh.t1,
    draw(ctx, lt, dur, t, overlay) {
      if (sh.name === 'prologue') drawPrologue(ctx, lt, t)
      else if (sh.name === 'wolf') drawWolf(ctx, lt, t)
      else if (sh.name === 'emissary') drawEmissary(ctx, lt, t, overlay)
      else if (sh.name === 'march') drawMarch(ctx, lt, t)
      else if (sh.name === 'phalanx') drawPhalanx(ctx, lt, t)
      else if (sh.name === 'xerxes') drawXerxes(ctx, lt, t)
      else if (sh.name === 'storm') drawStorm(ctx, lt, t)
      else if (sh.name === 'laststand') drawLaststand(ctx, lt, t)
      else if (sh.name === 'plataea') drawPlataea(ctx, lt, t)
    },
    fx: () => {
      const lb = { letterbox: 1.0 }
      if (sh.name === 'prologue') return { ...lb, bloom: 0.12, bloomThresh: 0.88, vignette: 0.6, grain: 0.014, warm: 0.1 }
      if (sh.name === 'wolf') return { ...lb, bloom: 0.06, bloomThresh: 0.9, vignette: 0.42, grain: 0.012, haze: 0.05 }
      if (sh.name === 'emissary') return { ...lb, bloom: 0.12, bloomThresh: 0.9, vignette: 0.52, grain: 0.013, warm: 0.12, sat: 1.04 }
      if (sh.name === 'march') return { ...lb, bloom: 0.1, bloomThresh: 0.88, vignette: 0.58, grain: 0.013, warm: 0.08 }
      if (sh.name === 'phalanx') return { ...lb, bloom: 0.11, bloomThresh: 0.9, vignette: 0.5, grain: 0.014, warm: 0.1 }
      if (sh.name === 'xerxes') return { ...lb, bloom: 0.13, bloomThresh: 0.88, vignette: 0.5, grain: 0.012, warm: 0.14, sat: 1.05 }
      if (sh.name === 'storm') return { ...lb, bloom: 0.1, bloomThresh: 0.9, vignette: 0.56, grain: 0.015 }
      if (sh.name === 'laststand') return { ...lb, bloom: 0.12, bloomThresh: 0.88, vignette: 0.6, grain: 0.014, warm: 0.12 }
      return { ...lb, bloom: 0.12, bloomThresh: 0.86, vignette: 0.48, grain: 0.012, warm: 0.16, sat: 1.06 }
    },
  })),
  captions: CAPTIONS,
  captionStyles: {
    ...STYLES,
    title: {
      font: 'Anton', color: '#f2dfa0', track: 2,
      shadow: '#050608', glow: '#8a6a24', glowBlur: 24,
    },
    sub: {
      weight: 600, color: 'rgba(228,214,178,0.92)', track: 6,
      shadow: '#050608',
    },
    kicker: {
      font: '"JetBrains Mono"', weight: 700, color: '#f0d9a8', track: 6,
      shadow: '#0a0806',
    },
  },
  flashes: FLASHES,
  score,
  audio: { seed: 3000, reverb: 1.4, reverbGain: 0.22 },
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } },
}
