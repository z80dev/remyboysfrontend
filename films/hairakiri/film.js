// HAIRAKIRI — Year of the Razor Decade. Picture: 7 shots on the timeline clocks,
// full-res painted stage (pirates-cabald / wizard-of-floz lineage). Every frame a
// pure function of time: actors live on the shot clocks' world g; the ONE hit-stop
// resolves through DUEL.warp (flash/spark/rain run real time through the freeze);
// rain and petals are analytic seeded fields, never state. The five sumi brush
// wipes + the regrowth stroke composite the incoming shot behind the ink edge;
// the enso iris is the film's only iris. All reading type is the timeline's
// CAPTIONS (re-exported); the T1 underline is the one picture-side stroke.
import { W, H, hash, seg, lerp, E } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import {
  DUR, T, SHOTS,
  PROVINCE_EV, RAID_EV, RONIN_EV, TRAINING_EV, BATTLE_EV, DUEL_EV, RESOLVE_EV,
  CAPTIONS, SAFE, WIPES, FLASHES, MA, WIGSPLIT, EYEBROW, ENSO,
  TITLE_UNDERLINE, DUEL,
} from './timeline.js'

const S = {} // prepare() bake store
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const OSP = ART.OS

let scoreFn = null // the composer owns ./score.js — guard the import, stills run silent without it

// ============================== small stage helpers ==============================
const sprite = (ctx, rig, px, feet, o = {}) => {
  ctx.imageSmoothingEnabled = false
  A.drawRemy(ctx, rig, px, feet, o)
}
const cam = (ctx, k, cx, cy, sx = 0, sy = 0) => {
  ctx.save()
  ctx.translate(960 + sx, 540 + sy)
  ctx.scale(k, k)
  ctx.translate(-cx, -cy)
}
const shakeXY = (t, amp) => amp <= 0 ? [0, 0] : [
  (hash(Math.floor(t * 90) + 7) - 0.5) * 2 * amp,
  (hash(Math.floor(t * 90) + 99) - 0.5) * 2 * amp,
]
const shadow = (ctx, px, feet, w, a = 0.3) => {
  ctx.fillStyle = `rgba(10,10,16,${a})`
  ctx.beginPath()
  ctx.ellipse(px, feet + 4, w, w * 0.2, 0, 0, 7)
  ctx.fill()
}
const walkCyc = (ph, amp = 5) => {
  const s = Math.sin(ph)
  return { lift: [Math.round(Math.max(0, s) * amp), Math.round(Math.max(0, -s) * amp)], stride: [Math.round(s * 2), Math.round(-s * 2)], lean: 0.045 }
}
const stand = { lift: [1, 0], stride: [1, 0], lean: 0.015 }
// keyframe track: [[t, v], ...] with smoothstep legs
const track = (keys) => (tt) => {
  if (tt <= keys[0][0]) return keys[0][1]
  for (let i = 0; i + 1 < keys.length; i++) {
    const [ta, va] = keys[i]
    const [tb, vb] = keys[i + 1]
    if (tt < tb) return va + (vb - va) * E.inOutCubic(cl((tt - ta) / (tb - ta)))
  }
  return keys[keys.length - 1][1]
}
const bell = (tt, c, w) => Math.exp(-(((tt - c) / w) ** 2))
// draw in rig-local space (origin = sprite top-left, 76x116 near): overlays, masks, wigs
const rigSpace = (ctx, px, feet, s, flip, fn, syy = 1) => {
  ctx.save()
  ctx.translate(Math.round(px), Math.round(feet))
  ctx.scale((flip ? -1 : 1) * s, s * syy)
  ctx.translate(-38, -115)
  fn()
  ctx.restore()
}
// kneeling read: compressed rig + robe wedge over the folded legs
const kneelRobe = (ctx, px, feet, s, col = '#2a3660') => {
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.moveTo(px - 34 * s, feet + 2)
  ctx.quadraticCurveTo(px, feet - 46 * s, px + 34 * s, feet + 2)
  ctx.closePath()
  ctx.fill()
}
const dot = (ctx, px, py, r, col) => {
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.arc(px, py, r, 0, 7)
  ctx.fill()
}

// ============================== wipe orchestration ==============================
const WIPE_BY_ID = {}
for (const w of WIPES) WIPE_BY_ID[w.id] = w
// forward wipes: which wipe leaves each shot (window sits in that shot's tail)
const WIPE_OUT = { province: 's1s2', ronin: 's3s4', training: 's4s5', battle: 's5s6' }
const SHOT_BY_NAME = {}
for (const sh of SHOTS) SHOT_BY_NAME[sh.name] = sh

function renderShotTo(sx, name, lt, t) {
  sx.setTransform(1, 0, 0, 1, 0, 0)
  sx.globalAlpha = 1
  sx.globalCompositeOperation = 'source-over'
  sx.clearRect(0, 0, W, H)
  DRAW[name](sx, lt, SHOT_BY_NAME[name].t1 - SHOT_BY_NAME[name].t0, t)
}

// clip ctx to the swept region of wipe w at progress p (handles strokes/stagger)
function wipeClip(ctx, w, p) {
  if (w.id === 's4s5') {
    const bw = W * 0.42
    ctx.beginPath()
    for (let i = 0; i < 3; i++) {
      const pk = cl((p * w.dur - 0.12 * i) / (w.dur - 0.24))
      if (pk <= 0) continue
      const cx0 = W * (0.2 + 0.3 * i)
      ctx.rect(cx0 - bw / 2, -12, bw, pk * H + 12)
    }
    ctx.clip()
    return
  }
  const pLead = w.strokes > 1 ? cl(p * w.dur / (w.dur - w.stagger)) : p
  ART.wipeRegionPath(ctx, w.dir, pLead)
  ctx.clip()
}

// the ink band(s) riding the front edge
function wipeBands(ctx, w, p) {
  const seedOf = { s1s2: 3, s3s4: 9, s4s5: 15, s5s6: 21, s6s7: 27 }
  const widthOf = { s1s2: 132, s3s4: 96, s4s5: 64, s5s6: 170, s6s7: 74 }
  if (w.id === 's4s5') {
    const bw = W * 0.42
    for (let i = 0; i < 3; i++) {
      const pk = cl((p * w.dur - 0.12 * i) / (w.dur - 0.24))
      if (pk <= 0 || pk >= 1.02) continue
      const cx0 = W * (0.2 + 0.3 * i)
      const fy = pk * H
      const ramp = Math.min(1, (p * w.dur - 0.12 * i) / 0.1)
      ctx.save()
      ctx.globalAlpha = 0.95 * ramp
      ctx.fillStyle = ART.PAL.sumi
      ctx.beginPath()
      ctx.moveTo(cx0 - bw / 2, fy - 90 * (0.7 + hash(i * 7 + 1) * 0.5))
      for (let u = 0; u <= 10; u++) {
        const ux = cx0 - bw / 2 + (bw * u) / 10
        ctx.lineTo(ux, fy + Math.sin(u * 5 + i * 3) * 9 + (hash(i * 31 + u) - 0.5) * 16)
      }
      ctx.lineTo(cx0 + bw / 2, fy - 110)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    return
  }
  if (w.strokes > 1) {
    const pB = cl((p * w.dur - w.stagger) / (w.dur - w.stagger))
    ART.wipeBand(ctx, { bandW: widthOf[w.id], dur: w.dur }, pB, w.dir, seedOf[w.id] + 40)
    ART.wipeBand(ctx, { bandW: widthOf[w.id], dur: w.dur }, cl(p * w.dur / (w.dur - w.stagger)), w.dir, seedOf[w.id])
    return
  }
  ART.wipeBand(ctx, { bandW: widthOf[w.id], dur: w.dur, gold: w.tip === 'gold' }, p, w.dir, seedOf[w.id])
}

// forward wipe in a shot's tail: the stroke carries the INCOMING shot in its wake
function forwardWipe(ctx, sh, lt, t) {
  ctx.fillStyle = 'rgba(255,0,0,0.85)'
  ctx.fillRect(((t * 97) % 1700) | 0, 130, 60, 60)
  const id = WIPE_OUT[sh.name]
  if (!id) return
  const w = WIPE_BY_ID[id]
  const age = lt - (w.t0 - sh.t0)
  if (age <= 0 || age >= w.dur) return
  try {
  const nextName = SHOTS[SHOTS.indexOf(sh) + 1].name
  renderShotTo(S.scratch.getContext('2d'), nextName, 0, sh.t1)
  // DEBUG probe: paint control rect on the scratch, catch any draw error
  const sxd = S.scratch.getContext('2d')
  sxd.fillStyle = '#00ff00'
  sxd.fillRect(0, 300, 220, 100)
  let dbg = 'no-err'
  try {
    DRAW[nextName](sxd, 1, 19, sh.t1 + 1)
    dbg = 'drew-ok'
  } catch (e) {
    dbg = String(e).slice(0, 90)
  }
  const p1 = sxd.getImageData(100, 350, 1, 1).data
  const p2 = sxd.getImageData(480, 160, 1, 1).data
  ctx.save()
  wipeClip(ctx, w, age / w.dur)
  ctx.drawImage(S.scratch, 0, 0)
  ctx.restore()
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 130, 1100, 70)
  ctx.fillStyle = '#fff'
  ctx.font = '44px monospace'
  ctx.fillText(dbg + ' ctl:' + p1[1] + ' skyA:' + p2[3] + ' ga:' + sxd.globalAlpha, 20, 180)
  wipeBands(ctx, w, age / w.dur)
  } catch (e) {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 130, 1500, 70)
    ctx.fillStyle = '#ff0'
    ctx.font = '40px monospace'
    ctx.fillText('ERR ' + String(e).slice(0, 100), 20, 180)
  }
}

// the regrowth stroke lives on S7's clock (drawn over the incoming shot)
function regrowthWipe(ctx, lt, t) {
  const w = WIPE_BY_ID.s6s7
  if (lt >= w.dur) return
  renderShotTo(S.scratch.getContext('2d'), 'duel', SHOT_BY_NAME.duel.t1 - SHOT_BY_NAME.duel.t0 - 0.001, T.resolve)
  ctx.drawImage(S.scratch, 0, 0)
  ctx.save()
  wipeClip(ctx, w, lt / w.dur)
  DRAW.resolve(ctx, lt, t)
  ctx.restore()
  wipeBands(ctx, w, lt / w.dur)
}

// ============================== S1 — PROVINCE ==============================
function drawProvince(ctx, lt, t) {
  const g = lt
  const k = 1.0 + 0.08 * seg(g, 0, 6.5) + 0.22 * seg(g, 4.9, 6.3)
  const cx = 960 + 40 * seg(g, 0, 6.5) + 130 * seg(g, 4.9, 6.3)
  const cy = 540 + 205 * seg(g, 4.8, 6.4) + 60 * seg(g, 4.9, 6.3)
  cam(ctx, k, cx, cy)
  ctx.drawImage(S.province.c, -OSP, -OSP)
  // brush-stroke clouds crawl
  const cox = -((t * 5) % 480)
  ctx.globalAlpha = 0.9
  ctx.drawImage(S.provClouds.c, -OSP + cox, -OSP)
  ctx.drawImage(S.provClouds.c, -OSP + cox + S.provClouds.w, -OSP)
  ctx.globalAlpha = 1
  ART.mist(ctx, t, { n: 5, y0: 600, y1: 720, alpha: 0.10 })
  // the CABALD TAX BANNER unrolls down the watchtower (whip crack = timeline flash)
  ART.bannerCabald(ctx, 1450, 356, 92, 300, seg(g, PROVINCE_EV.banner, PROVINCE_EV.banner + 0.55))
  sprite(ctx, S.rig.captain, 1450, 748, { sx: 2.1, sy: 2.1 }) // never mirrored (pom side)
  // TENDER: farmer ties daughter her first topknot; comb held two-fists like a sword
  const tieK = seg(g, PROVINCE_EV.tender, PROVINCE_EV.tender + 0.5)
  const kneel = seg(g, PROVINCE_EV.kneel, PROVINCE_EV.kneel + 0.45)
  if (kneel <= 0) sprite(ctx, S.rig.farmer, 1120, 836, { sx: 2.6, sy: 2.6, ...stand })
  sprite(ctx, S.childHair, 1224, 842, { sx: 1.7, sy: 1.7, ...stand })
  if (tieK > 0) {
    ctx.save()
    ctx.globalAlpha = tieK
    ART.chonmage(ctx, 1224, 842 - 1.7 * 108, 1.5, { rot: -0.1 })
    ctx.restore()
  }
  if (kneel <= 0) ART.combP(ctx, 1244, 842 - 62 * 1.7 + Math.sin(g * 2.2) * 2, 0.25 + Math.sin(g * 1.7) * 0.06, 1.3)
  // kneel: shaved farmer in the mud, clutching the severed topknot two-fists
  if (kneel > 0) {
    const fy = 848
    sprite(ctx, S.rig.farmer, 1120, fy - kneel * 6, { sx: 2.6, sy: 2.6 * (1 - 0.2 * kneel), lean: 0.16 * kneel })
    kneelRobe(ctx, 1120, fy, 2.6, '#2d5872')
    const shake = g < PROVINCE_EV.kneel + 1.2 ? Math.sin(g * 21) * 2.4 * (1 - seg(g, PROVINCE_EV.kneel, PROVINCE_EV.kneel + 1.2)) : 0
    ART.chonmage(ctx, 1120 + shake, fy - 158, 1.5, { strands: true, sway: Math.sin(t * 2.4) * 0.4 })
    dot(ctx, 1096, fy - 148, 5, '#d0bdb1')
    dot(ctx, 1144, fy - 148, 5, '#d0bdb1')
    // one strand escapes on the wind
    const esc = seg(g, PROVINCE_EV.kneel + 0.5, PROVINCE_EV.kneel + 2.4)
    if (esc > 0 && esc < 1) {
      ctx.strokeStyle = `rgba(40,32,26,${0.85 * (1 - esc)})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(1130, fy - 162)
      ctx.quadraticCurveTo(1130 + esc * 130, fy - 198 - esc * 30, 1130 + esc * 300, fy - 180 - esc * 60)
      ctx.stroke()
    }
  }
  // riders as ink blots crest the far ridge
  const rideK = seg(g, PROVINCE_EV.riders, PROVINCE_EV.riders + 2.2)
  if (rideK > 0) {
    for (let j = 0; j < 3; j++) {
      const rx = 240 + j * 130 + rideK * 700
      const ry = 508 + j * 8
      ART.horseP(ctx, rx, ry, 0.62, rx * 0.05, {})
      sprite(ctx, S.farRiders[j], rx, ry - 30, { sx: 0.85, sy: 0.85 })
    }
  }
  // the rain: sheets + streak field (a character, never weather)
  ART.rainCurtains(ctx, t, 1)
  ART.rain(ctx, t, { n: 150, len: 54, speed: 1750, slant: -0.22, w: 2, seed: 5 })
  ctx.restore()
}

// ============================== S2 — THE RAID ==============================
function drawRaid(ctx, lt, t) {
  const g = lt
  const camX = track([[0, 560], [3.9, 1170], [5.3, 1295], [6.9, 1370], [7.4, 2020], [9.4, 2440], [10.8, 2840], [12, 2950]])(g)
  const k = 1.10 + 0.15 * bell(g, 6.0, 0.85)
  const thunder = g < RAID_EV.thunderBuild ? 0 : 1.6 + Math.sin(g * 30) * 0.8
  const [shx, shy] = shakeXY(t, thunder)
  cam(ctx, k, camX, 600, shx, shy)
  ctx.drawImage(S.lane.c, -S.lane.ox, -S.lane.oy)
  // baked lantern warm pools + live flames
  for (const lx of [620, 1900, 2620]) {
    ART.glowSpot(ctx, lx, 600, 190, 'rgba(226,160,80,%A)', 0.10)
    ART.flame(ctx, lx, 590, 0.9, t, lx)
  }
  // ---- shear line: villagers kneel in a row, hooked razor passes, 1-frame glints ----
  const shearT = RAID_EV.shearLine
  const kneelers = [[1090, 0], [1210, 1], [1330, 2], [1450, 3]]
  for (const [vx, vi] of kneelers) {
    sprite(ctx, S.pool[vi], vx, 918, { sx: 2.5, sy: 2.05, lean: 0.2 })
    kneelRobe(ctx, vx, 918, 2.5, vi % 2 ? '#31405f' : '#3c4a5c')
    // the knot still on the head until its pass
    const snipT = shearT + vi * 0.55
    if (g < snipT) ART.chonmage(ctx, vx, 918 - 2.05 * 106, 1.0, { rot: -0.08 })
    else {
      // topknot pops up and off
      const age = g - snipT
      const dy = -(70 * age - 150 * age * age)
      if (dy > -260) ART.chonmage(ctx, vx + 10, 918 - 2.05 * 106 + dy, 1.0, { rot: age * 6 })
    }
  }
  // bandit C (senior robe) walks the row with the hooked razor
  const shearX = track([[3.8, 1060], [6.2, 1480], [6.6, 1520]])(g)
  sprite(ctx, S.rig.banditC, shearX, 950, { sx: 2.3, sy: 2.3, flip: true, ...walkCyc(shearX * 0.06, 3) })
  for (let vi = 0; vi < 4; vi++) {
    const snipT = shearT + vi * 0.55
    if (Math.abs(g - snipT) < 0.035 && shearX > kneelers[vi][0] - 30) {
      ART.inkSlash(ctx, kneelers[vi][0] - 26, 918 - 2.05 * 112, kneelers[vi][0] + 30, 918 - 2.05 * 96, 1, 6)
    }
  }
  // THE SLOW-MO KNOT (drawn 0.4x, no clock stop): falls the length of the frame
  const knotU = seg(g, RAID_EV.knotFall, RAID_EV.knotSplash)
  if (knotU > 0 && knotU < 1.02) {
    const ky = lerp(672, 920, knotU * knotU)
    // motion trail ghosts, then the knot (drawn 0.4x: the fall spans the full 1.2 s)
    for (let gt = 1; gt <= 3; gt++) {
      const gu = Math.max(0, knotU - gt * 0.055)
      ctx.save()
      ctx.globalAlpha = 0.16 * (1 - (gt - 1) / 3)
      ART.chonmage(ctx, 1300, lerp(672, 920, gu * gu), 2.1, { rot: (g - RAID_EV.knotFall - gt * 0.066) * 5.2 })
      ctx.restore()
    }
    ART.chonmage(ctx, 1300, ky, 2.3, { rot: (g - RAID_EV.knotFall) * 5.2 })
  }
  if (g >= RAID_EV.knotSplash && g < RAID_EV.knotSplash + 0.5) {
    ART.splashFlat(ctx, 1300, 924, g - RAID_EV.knotSplash, 0.45, 4)
  }
  // ---- riders walk the lane (torch vermillion on indigo) ----
  const riderX = [
    track([[0, 240], [7.9, 2050], [8.4, 2075], [12, 2075]]),
    track([[0, 400], [5.4, 1670], [12, 1760]]),
    track([[0, 560], [9.0, 2330], [12, 2360]]),
  ]
  const riderRigs = [S.rig.banditA, S.rig.banditA2, S.rig.banditC2]
  for (let j = 0; j < 3; j++) {
    const rx = riderX[j](g)
    const ry = 952 - j * 6
    ART.horseP(ctx, rx - 60, ry, 2.3, rx * 0.045, {})
    sprite(ctx, riderRigs[j], rx - 60, ry - 140, { sx: 2.1, sy: 2.1 })
    // torch on the lead rider
    if (j === 0) {
      ART.glowSpot(ctx, rx - 130, 820, 240, 'rgba(226,120,60,%A)', 0.16)
      ART.flame(ctx, rx - 130, 830, 1.2, t, 7, 8)
    }
  }
  // bandit B pokes the hearth (sprite sword stays sheathed — casting note)
  const poke = Math.sin(g * 5) * 0.15 * (g > RAID_EV.potLid - 0.4 && g < RAID_EV.potLid + 1.2 ? 1 : 0.3)
  sprite(ctx, S.rig.banditB, 2185, 952, { sx: 2.2, sy: 2.2, flip: true, lean: 0.08 + poke * 0.2 })
  ctx.strokeStyle = '#3a2c1e'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(2160, 870)
  ctx.lineTo(2100 + poke * 60, 900)
  ctx.stroke()
  ART.glowSpot(ctx, 2050, 880, 150, 'rgba(226,140,60,%A)', 0.14)
  ART.flame(ctx, 2050, 876, 1.0, t, 12, 3)
  // GAG/TENDER: grandmother sips tea deadpan; the pot lid wobbles exactly once
  ART.stoolP(ctx, 1985, 948, 1.15)
  sprite(ctx, S.rig.grandmother, 1985, 936, { sx: 2.3, sy: 1.95, lean: 0.03 })
  const sip = seg(g, RAID_EV.potLid + 0.25, RAID_EV.potLid + 0.5) - seg(g, RAID_EV.potLid + 0.85, RAID_EV.potLid + 1.05)
  ART.teaBowl(ctx, 1985, 936 - 110 - sip * 50, 1.25)
  if (sip > 0.2) ART.steam(ctx, 1985, 936 - 148 - sip * 40, t, 2)
  const wob = g > RAID_EV.potLid + 0.8 ? Math.sin((g - RAID_EV.potLid - 0.8) * 17) * 0.15 * Math.exp(-(g - RAID_EV.potLid - 0.8) * 3.4) : 0
  ART.potLid(ctx, 2062, 946, 1.1, wob)
  ART.chonmage(ctx, 2062 + wob * 40, 924, 0.8, { rot: wob * 2 })
  // the child stares into the dark, rain beading on the shaved head
  sprite(ctx, S.childBald, 2470, 952, { sx: 1.7, sy: 1.7, lean: 0.05 })
  if (g > RAID_EV.childStare - 0.4) {
    for (let i = 0; i < 5; i++) {
      const bx = 2470 - 30 + (i % 5) * 15
      const by = 952 - 1.7 * 112 + (i % 2) * 9
      ctx.fillStyle = `rgba(200,216,240,${0.35 + 0.25 * Math.sin(t * 6 + i)})`
      dot(ctx, bx, by, 2, ctx.fillStyle)
    }
  }
  // banner pinned to the gate; the rain turns harder
  const pinK = seg(g, RAID_EV.bannerPinned, RAID_EV.bannerPinned + 0.25)
  if (pinK > 0) {
    ART.bannerCabald(ctx, 2846, 560, 66, 220, pinK)
    if (g < RAID_EV.bannerPinned + 0.1) ART.glint(ctx, 2846, 562, 0.8, 1 - (g - RAID_EV.bannerPinned) * 10)
  }
  ctx.restore()
  // rain over everything (harder after the banner goes up)
  cam(ctx, k, camX, 600, shx, shy)
  const hard = g > RAID_EV.bannerPinned ? 1 : 0
  ART.rain(ctx, t, { n: 140 + 90 * hard, len: 52, speed: 1700, slant: -0.22, w: 2, seed: 5, col: hard ? 'rgba(196,210,236,0.42)' : 'rgba(190,206,232,0.34)' })
  ctx.restore()
}

// ============================== S3 — THE RONIN ==============================
function drawRonin(ctx, lt, t) {
  const g = lt
  // locked wide + quick 1.2x push-ins per recruit join
  const joins = [RONIN_EV.giant, RONIN_EV.twin, RONIN_EV.veteran, RONIN_EV.comic]
  let push = 0
  for (const j of joins) if (g > j - 0.2) push += Math.exp(-(g - j + 0.2) * 2.6)
  const k = 1.0 + 0.11 * Math.min(1.4, push)
  const cx = 960 + 40 * Math.min(1.4, push)
  cam(ctx, k, cx, 580)
  ctx.drawImage(S.stand.c, -OSP, -OSP)
  // the lantern over the stand: the warm pixel of the act
  ART.glowSpot(ctx, 700, 500, 260, 'rgba(226,160,80,%A)', 0.13)
  ART.lanternP(ctx, 700, 496, 1.15, 1, t, 5)
  // 42 at the stand, eating mochi, unimpressed (seated behind the counter)
  const stood = seg(g, RONIN_EV.stands, RONIN_EV.stands + 0.4)
  sprite(ctx, S.rig.vendor, 852, 902, { sx: 2.1, sy: 2.1, flip: true }) // duck-hood raincoat, behind the stand
  if (stood <= 0) {
    sprite(ctx, S.rig.ronin, 700, 916, { sx: 2.4, sy: 2.4 })
    const chewing = g < RONIN_EV.chewStop
    const my = 700 - 2.4 * 118 + (chewing ? Math.sin(g * 10) * 4 : 0) + (g >= RONIN_EV.chewStop ? 26 : 0)
    ART.mochiP(ctx, 716, my, 0.8)
    ART.steam(ctx, 664, 800, t, 1)
    ART.mochiP(ctx, 664, 800, 0.7)
    ART.mochiP(ctx, 690, 804, 0.6)
    // ONE finger, one more bite
    if (g > RONIN_EV.elderBegs + 0.4 && g < RONIN_EV.elderBegs + 1.0) {
      ctx.fillStyle = '#d0bdb1'
      ctx.fillRect(744, 782, 7, 22)
    }
  } else {
    // he STANDS; the mino sheds its rain in one sheet
    const px = lerp(700, 812, stood)
    sprite(ctx, S.rig.ronin, px, lerp(916, 948, stood), { sx: 2.5, sy: 2.5 })
    ART.mino(ctx, px, 948 - 2.5 * 88 - 16, 104, 150, Math.sin(t * 1.8) * 0.06)
    if (g < RONIN_EV.stands + 0.7) {
      ctx.strokeStyle = `rgba(190,206,236,${0.7 * (1 - (g - RONIN_EV.stands) / 0.7)})`
      ctx.lineWidth = 2.4
      for (let i = 0; i < 9; i++) {
        const dx = -52 + i * 13
        const dy = ((t * 420 + i * 37) % 90)
        ctx.beginPath()
        ctx.moveTo(px + dx, 948 - 108 + dy * 0.4)
        ctx.lineTo(px + dx, 948 - 60 + dy)
        ctx.stroke()
      }
    }
  }
  // the rice grain: the smallest sound in the film
  const grainU = seg(g, RONIN_EV.chewStop, RONIN_EV.chewStop + 0.65)
  if (grainU > 0 && grainU < 1) dot(ctx, 722, 726 + grainU * grainU * 160, 3, '#efe9da')
  // the elder begs, hands to the mud; produces the child under the pot lid
  const elderX = track([[3.2, 240], [3.9, 980]])(g)
  const begK = g > RONIN_EV.elderBegs ? 1 : 0
  sprite(ctx, S.rig.elder, elderX, 950, { sx: 2.2, sy: 2.2, lean: 0.2 + begK * 0.08 + (begK ? Math.sin(g * 3) * 0.03 : 0) })
  ctx.strokeStyle = '#3a2c1e'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(elderX + 26, 880)
  ctx.lineTo(elderX + 34, 950)
  ctx.stroke()
  if (begK) {
    dot(ctx, elderX - 24, 946, 4, '#d0bdb1')
    dot(ctx, elderX - 4, 948, 4, '#d0bdb1')
  }
  // the child + the pot lid; lid lifts at childReveal — the S2 image returned
  const lidK = seg(g, RONIN_EV.childReveal, RONIN_EV.childReveal + 0.5)
  sprite(ctx, S.childBald, 1090, 952, { sx: 1.5, sy: 1.5, ...stand })
  for (let i = 0; i < 4; i++) dot(ctx, 1090 - 20 + i * 13, 952 - 1.5 * 111, 1.6, `rgba(200,216,240,0.5)`)
  if (lidK < 1) ART.potLid(ctx, 1090, 952 - 1.5 * 108 - lidK * 40, 0.95, -lidK * 1.1)
  else ART.potLid(ctx, elderX + 44, 950 - 110, 0.8, -1.2)
  // the recruits gate in offscreen (g >= enter time), each ducks/wobbles/breaks something
  const giantX = track([[11.0, 2150], [12.0, 1400]])(g)
  if (g >= 11.0) {
    const duck = Math.exp(-(((g - 11.72) / 0.14) ** 2))
    sprite(ctx, S.rig.giant, giantX, 942, { sx: 3.25, sy: 3.25 * (1 - 0.09 * duck), flip: true, ...walkCyc(giantX * 0.05, 6) })
    ART.naginata(ctx, giantX - 44, 942 - 3.25 * 60, -0.62 - 0.3 * duck, 0.8)
  }
  const twinX = track([[12.2, 2150], [13.2, 1490]])(g)
  if (g >= 12.2) {
    sprite(ctx, S.rig.twin, twinX, 946, { sx: 2.4, sy: 2.4, flip: true, ...walkCyc(twinX * 0.06, 5) })
    const tw = g > 13.55 ? Math.sin((g - 13.55) * 16) * 0.1 * Math.exp(-(g - 13.55) * 3) : 0
    ART.stoolP(ctx, 1560, 950, 1.0)
    ctx.save()
    ctx.translate(1560, 950)
    ctx.rotate(tw)
    ctx.translate(-1560, -950)
    ART.stoolP(ctx, 1560, 950, 0.7)
    ctx.restore()
  }
  const vetX = track([[13.4, 2150], [14.4, 1580]])(g)
  if (g >= 13.4) {
    sprite(ctx, S.rig.veteran, vetX, 948, { sx: 2.4, sy: 2.4, flip: true, ...walkCyc(vetX * 0.055, 4) })
    // fish-patch scabbard
    ctx.save()
    ctx.translate(vetX - 30, 948 - 2.4 * 34)
    ctx.rotate(0.5)
    ctx.fillStyle = '#2c2620'
    ctx.fillRect(-4, -40, 9, 52)
    ctx.fillStyle = '#7a8a94'
    ctx.beginPath()
    ctx.ellipse(0, -6, 10, 5, 0.3, 0, 7)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(8, -8)
    ctx.lineTo(16, -12)
    ctx.lineTo(9, -3)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  // the comic joins by accident: leap, the barrel breaks, he stands in the hoop
  if (g >= RONIN_EV.comic - 0.6) {
    const leapU = seg(g, RONIN_EV.comic + 0.05, RONIN_EV.comic + 0.5)
    const broke = seg(g, RONIN_EV.comic + 0.45, RONIN_EV.comic + 0.6)
    ART.barrelP(ctx, 1740, 952, 1.0, broke)
    if (leapU > 0 && leapU < 1) {
      const lx = lerp(1860, 1740, leapU)
      sprite(ctx, S.rig.comic, lx, 952 - Math.sin(leapU * Math.PI) * 130, { sx: 2.4, sy: 2.4, flip: true, rot: leapU * 2 })
    } else if (leapU >= 1) {
      sprite(ctx, S.rig.comic, 1740, 952, { sx: 2.4, sy: 2.4, flip: true })
    }
    if (broke > 0 && broke < 1) ART.puff(ctx, 1740, 930, broke, 0.4, 5)
  }
  // T1 underline: the one picture-side stroke (title text is the caption system's)
  const uu = TITLE_UNDERLINE.t0 - T.ronin
  ART.brushUnderline(ctx, 690, 1230, 620, seg(g, uu, uu + TITLE_UNDERLINE.dur))
  ART.rain(ctx, t, { n: 130, len: 52, speed: 1700, slant: -0.22, w: 2, seed: 5 })
  ctx.restore()
}

// ============================== S4 — TRAINING ==============================
function drawTraining(ctx, lt, t) {
  const g = lt
  const camX = track([[0, 700], [10.3, 1720]])(g)
  cam(ctx, 1.16, camX, 700)
  ctx.drawImage(S.courtyard.c, -S.courtyard.ox, -S.courtyard.oy)
  const sunset = seg(g, TRAINING_EV.sunset - 0.3, TRAINING_EV.sunset + 0.3)
  if (sunset > 0) {
    // vermillion evening wash; the band turns silhouette
    ctx.save()
    ctx.globalAlpha = 0.42 * sunset
    const gr = ctx.createLinearGradient(0, 200, 0, 900)
    gr.addColorStop(0, 'rgba(232,140,74,0.9)')
    gr.addColorStop(0.6, 'rgba(200,90,52,0.75)')
    gr.addColorStop(1, 'rgba(120,50,40,0.4)')
    ctx.fillStyle = gr
    ctx.fillRect(camX - 1100, -100, 2200, 1300)
    ctx.restore()
  }
  const sil = sunset > 0.5
  // PRATFALL DOMINO, staggered L->R squelch wave
  const domX = [940, 1010, 1080, 1150]
  for (let i = 0; i < 4; i++) {
    const t0 = TRAINING_EV.domino + i * 0.35
    const fall = seg(g, t0, t0 + 0.3)
    const up = seg(g, t0 + 1.9, t0 + 2.4)
    const rot = (fall - up) * 1.25
    const slip = fall > 0 && up < 1
    sprite(ctx, S.pool[i], domX[i], 952 + (slip ? 24 * fall : 0), { sx: 2.3, sy: 2.3, rot, lean: fall > 0 && up < 1 ? 0.2 : 0.3 })
    if (fall > 0 && fall < 1) ART.puff(ctx, domX[i] + 30, 950, fall, 0.35, i + 1, '196,188,168')
  }
  // comb-sweep-as-parry drill; the veteran permits one catch, slow nod
  for (let i = 0; i < 2; i++) {
    const vx = 1290 + i * 74
    if (!sil) {
      sprite(ctx, S.pool[(i + 1) % 4], vx, 950, { sx: 2.3, sy: 2.3, flip: true })
      const sw = Math.sin(g * 6 + i * 1.4)
      ctx.strokeStyle = '#4a6a3a'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(vx - 16, 950 - 96)
      ctx.lineTo(vx + 30 + sw * 20, 950 - 120 - sw * 26)
      ctx.stroke()
      ART.combP(ctx, vx + 34 + sw * 22, 950 - 124 - sw * 28, -0.6 + sw * 0.5, 1.1)
    }
  }
  const vetX = 1480
  const nod = g > TRAINING_EV.combDrill + 0.8 ? Math.exp(-(((g - TRAINING_EV.combDrill - 0.8) / 0.4) ** 2)) : 0
  sprite(ctx, sil ? S.bandSil[2] : S.rig.veteran, vetX, 950, { sx: 2.4, sy: 2.4, lean: -0.04 + nod * 0.1 })
  if (g > TRAINING_EV.combDrill + 0.2 && !sil) ART.combP(ctx, vetX + 26, 950 - 2.4 * 52, 1.2, 1.0, '#4a6a3a')
  // WAX-ON GAG: polish motion; the falling bucket blocked mid-air; he stares at his forearm
  const waxT = TRAINING_EV.waxOn
  const bucketU = seg(g, waxT - 0.25, waxT)
  const bucketY = lerp(320, 690, bucketU * bucketU)
  const caught = g > waxT
  sprite(ctx, sil ? S.bandSil[3] : S.rig.comic, 1620, 950, { sx: 2.4, sy: 2.4, lean: caught ? 0.14 : 0 })
  ctx.strokeStyle = sil ? ART.PAL.ink : '#d0bcb1'
  ctx.lineWidth = 7
  const polish = caught ? 0 : g * 7
  ctx.beginPath()
  ctx.moveTo(1610, 950 - 100)
  ctx.lineTo(1610 + Math.cos(polish) * 34, 950 - 128 + Math.sin(polish) * 18)
  ctx.stroke()
  ctx.save()
  ctx.translate(1652, caught ? bucketY : bucketY)
  ctx.rotate(caught ? 0.25 : 0.05)
  ctx.fillStyle = sil ? ART.PAL.ink : '#5c4a34'
  ctx.beginPath()
  ctx.moveTo(-26, -20)
  ctx.lineTo(26, -20)
  ctx.lineTo(20, 22)
  ctx.lineTo(-20, 22)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#3a2c1e'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(0, -20, 22, Math.PI, 0)
  ctx.stroke()
  ctx.restore()
  // metronome: 42 taps heads scabbard-in-hand; stands on a stool to reach the giant
  if (g > TRAINING_EV.metronome - 0.5 && g < TRAINING_EV.metronome + 1.1 && !sil) {
    const wx = lerp(900, 1800, seg(g, TRAINING_EV.metronome - 0.4, TRAINING_EV.metronome + 1.0))
    const onStool = wx > 1480 && wx < 1640
    sprite(ctx, S.rig.ronin, wx, 952 - (onStool ? 44 : 0), { sx: 2.4, sy: 2.4, ...walkCyc(wx * 0.06, 5) })
    if (onStool) ART.stoolP(ctx, wx, 952, 1.0)
    const tapU = (g * 3.4) % 1
    ctx.strokeStyle = '#2c2620'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(wx + 18, 952 - 150)
    ctx.lineTo(wx + 34 - tapU * 26, 952 - 196 + tapU * 30)
    ctx.stroke()
    if (tapU < 0.15) ART.puff(ctx, wx + 34 - tapU * 26, 952 - 200, tapU * 3, 0.2, 9)
  }
  // TENDER: the practice sword to the child, two-fists grip (the grip rhyme, third time)
  const giftT = TRAINING_EV.gift
  if (g > giftT - 0.35 && g < giftT + 2.0 && !sil) {
    sprite(ctx, S.rig.ronin, 1810, 952, { sx: 2.4, sy: 2.4 * (g < giftT + 1.2 ? 0.82 : 1) })
    const handU = seg(g, giftT, giftT + 0.5)
    ART.bokken(ctx, lerp(1780, 1874, handU), lerp(812, 824, handU), -0.4, 0.9)
  }
  if (!sil) {
    sprite(ctx, S.childBald, 1880, 954, { sx: 1.5, sy: 1.5 })
    if (g > giftT + 0.5) ART.bokken(ctx, 1880, 954 - 78, -1.15, 0.8)
    sprite(ctx, S.rig.grandmother, 1950, 950, { sx: 1.9, sy: 1.9 })
    ART.potLid(ctx, 1978, 950 - 96, 0.7, 0.4)
  }
  // sunset: the band in silhouette, blades up (grandmother + child watch from the left)
  if (sil) {
    sprite(ctx, S.rig.grandmother, 1010, 950, { sx: 1.9, sy: 1.9 })
    ART.potLid(ctx, 1038, 950 - 96, 0.7, 0.4)
    sprite(ctx, S.childBald, 1090, 954, { sx: 1.5, sy: 1.5 })
    const line = [[2000, 4], [1400, 0], [1600, 1], [1780, 2], [1950, 3]]
    for (const [lx, bi] of line) {
      sprite(ctx, S.bandSil[bi], lx, 952, { sx: bi === 0 ? 3.25 : 2.4, sy: bi === 0 ? 3.25 : 2.4 })
      if (bi === 0) ART.naginata(ctx, lx, 952 - 300, -1.45, 0.85)
      else {
        ctx.strokeStyle = ART.PAL.ink
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.moveTo(lx + 16, 952 - 130)
        ctx.lineTo(lx + 22, 952 - 230)
        ctx.stroke()
      }
    }
  }
  // warm drizzle + petals (analytic particles, the act's arrival)
  ART.rain(ctx, t, { n: 60, len: 34, speed: 1300, slant: -0.14, w: 1.6, seed: 8, col: 'rgba(226,222,208,0.22)' })
  ART.petals(ctx, t, { n: 24, x0: camX - 1100, x1: camX + 1100 })
  ctx.restore()
}

// ============================== S5 — NIGHT BATTLE ==============================
function drawBattle(ctx, lt, t) {
  const g = lt
  const camX = track([[0, 960], [15, 1040]])(g)
  cam(ctx, 1.05, camX, 570) // NO camera shake here — the freezes are drawn, not clocked
  ctx.drawImage(S.battleField.c, -OSP, -OSP)
  // wig scarecrows (the raiders' worst ambiguity)
  for (let i = 0; i < 4; i++) {
    ART.scarecrowP(ctx, 640 + i * 130, 800, 1.1, t, i)
    ART.chonmage(ctx, 640 + i * 130, 800 - 1.1 * 96, 1.1, { rot: Math.sin(t * 1.3 + i * 1.7) * 0.1 })
  }
  // the banner on the gate (42 cuts it down at bannerCut)
  const cutT = BATTLE_EV.bannerCut
  const bannerFall = seg(g, cutT, cutT + 0.45)
  ctx.save()
  ctx.translate(1765, 548)
  ctx.rotate(bannerFall * 1.45)
  ctx.translate(-1765, -548)
  ART.bannerCabald(ctx, 1765, 548, 74, 230, 1)
  ctx.restore()
  // ---- the band waits on the lane (facing the raiders, left) ----
  const bandPos = { giant: 1450, twin: 1550, veteran: 1650, comic: 1720 }
  // 42 dashes to the gate and cuts the banner down (watches the messenger from 1620 after)
  const roninX5 = track([[0, 1300], [BATTLE_EV.bannerCut - 0.3, 1300], [BATTLE_EV.bannerCut, 1620]])(g)
  sprite(ctx, S.rig.ronin, roninX5, 1000, { sx: 2.5, sy: 2.5, flip: g < BATTLE_EV.bannerCut - 0.05, ...walkCyc(g * 9, 6), lean: g > BATTLE_EV.bannerCut - 0.35 && g < BATTLE_EV.bannerCut ? 0.22 : 0 })
  ART.mino(ctx, roninX5, 1000 - 2.5 * 88 - 16, 104, 150, Math.sin(t * 1.8) * 0.06)
  if (g > BATTLE_EV.bannerCut - 0.12 && g < BATTLE_EV.bannerCut + 0.02) ART.inkSlash(ctx, roninX5 + 40, 700, roninX5 + 150, 600, 1, 8)
  // giant plants the pole at the charge
  const plantU = seg(g, BATTLE_EV.charge - 0.15, BATTLE_EV.charge + 0.15)
  sprite(ctx, S.rig.giant, bandPos.giant, 996, { sx: 3.2, sy: 3.2, flip: true })
  ART.naginata(ctx, lerp(bandPos.giant - 30, 1500, plantU), lerp(996 - 190, 900, plantU), lerp(-0.65, -1.25, plantU), 1.15)
  const twinX = track([[0, 1550], [BATTLE_EV.topknotRain - 0.25, 1550], [BATTLE_EV.topknotRain, 1000], [BATTLE_EV.topknotRain + 0.9, 1550]])(g)
  sprite(ctx, S.rig.twin, twinX, 1000, { sx: 2.4, sy: 2.4, flip: g < BATTLE_EV.topknotRain, ...walkCyc(g * 10, 5) })
  if (g > BATTLE_EV.topknotRain - 0.25 && g < BATTLE_EV.topknotRain + 0.05) {
    ctx.strokeStyle = 'rgba(220,228,244,0.4)'
    ctx.lineWidth = 3
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.moveTo(twinX + 100 + i * 30, 880 + i * 24)
      ctx.lineTo(twinX + 240 + i * 30, 888 + i * 24)
      ctx.stroke()
    }
  }
  sprite(ctx, S.rig.veteran, bandPos.veteran, 1000, { sx: 2.4, sy: 2.4, flip: true, lean: g > BATTLE_EV.sleeve + 0.5 ? 0.12 : 0 })
  sprite(ctx, S.rig.comic, bandPos.comic, 1000, { sx: 2.4, sy: 2.4, flip: true })
  // farmers behind
  for (let i = 0; i < 3; i++) sprite(ctx, S.pool[i], 1790 + i * 62, 1004, { sx: 1.9, sy: 1.9 })
  // ---- raiders crest the bund and hesitate one full beat at the scarecrows ----
  const hesitate = g > BATTLE_EV.scarecrows && g < BATTLE_EV.charge ? 1 : 0
  const raidWalk = track([[0.5, -150], [1.6, 420], [2.6, 460]])(g)
  const chargeU3 = [0, 1, 2].map((j) => seg(g, BATTLE_EV.charge + 0.5 * j, BATTLE_EV.charge + 0.5 * j + 0.45))
  const impactT = [0, 1, 2].map((j) => BATTLE_EV.charge + 0.5 * j + 0.45)
  const riders = [S.rig.banditA, S.rig.banditB, S.rig.banditA2]
  const footRaiders = [S.rig.banditC, S.rig.captainB, S.rig.captain]
  for (let j = 0; j < 3; j++) {
    const u = chargeU3[j]
    const freeze = g > impactT[j] && g < impactT[j] + 0.12 // DRAWN freeze: world holds, effects run real time
    const uu = freeze ? 1 : u
    if (uu <= 0 || uu >= 1.35) {
      // after landing: half-sunk in the paddy until the fold
      if (g > impactT[j] + 0.12 && g < BATTLE_EV.bannerCut + 0.4) {
        const lx = 1020 + j * 120
        ART.horseP(ctx, lx, 790 + j * 34, 2.4, 0, {})
        sprite(ctx, riders[j], lx, 700 + j * 34, { sx: 2.0, sy: 2.0, rot: 1.2 })
      }
      continue
    }
    const lx = lerp(raidWalk + j * 130, 980 + j * 120, uu)
    const ly = 780 + j * 30 - Math.sin(uu * Math.PI) * 330
    const rot = freeze ? 0.9 : uu * 1.4
    ART.horseP(ctx, lx, ly, 2.5, lx * 0.05, { flip: false })
    sprite(ctx, riders[j], lx, ly - 150, { sx: 2.1, sy: 2.1, rot })
    if (freeze || (g > impactT[j] && g < impactT[j] + 0.5)) {
      ART.splashFlat(ctx, 980 + j * 120, 800 + j * 30, t - (T.battle + impactT[j]), 0.5, j)
      ART.sparkRing(ctx, 980 + j * 120, 790 + j * 30, t - (T.battle + impactT[j]), 0.4)
    }
  }
  // foot raiders: hesitate, then the well takes three of them
  const wellT = BATTLE_EV.well
  for (let j = 0; j < 3; j++) {
    const fx = 380 + j * 90 + (hesitate ? 0 : Math.min(160, Math.max(0, (g - BATTLE_EV.charge) * 60)))
    const plinkT = wellT + 0.15 + j * 0.25
    const inU = seg(g, plinkT - 0.2, plinkT)
    if (inU >= 1 || (g > plinkT)) continue
    const wx = lerp(fx, 1400, inU * inU)
    const wy = 830 + j * 10 - Math.sin(inU * Math.PI) * 200
    sprite(ctx, footRaiders[j], wx, wy, { sx: 2.0, sy: 2.0, rot: inU * 2.4 })
  }
  if (g > wellT && g < wellT + 1.0) {
    for (let j = 0; j < 3; j++) {
      const pt = wellT + 0.15 + j * 0.25
      if (g > pt && g < pt + 0.3) ART.puff(ctx, 1400, 892, g - pt, 0.3, j + 3)
    }
  }
  // the comic trips the basket; scabbard flail; bows to the well
  if (g > wellT - 0.2 && g < wellT + 1.6) {
    const bow = seg(g, wellT + 0.7, wellT + 1.0) - seg(g, wellT + 1.4, wellT + 1.6)
    sprite(ctx, S.rig.comic, 1580, 946, { sx: 2.4, sy: 2.4, lean: 0.1 + bow * 0.5 })
    ctx.fillStyle = '#5c4a34'
    ctx.save()
    ctx.translate(1630, 938)
    ctx.rotate(-0.5)
    ctx.fillRect(-20, -14, 40, 26)
    ctx.restore()
    if (g > wellT && g < wellT + 0.4) {
      ctx.strokeStyle = '#2c2620'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(1600, 856)
      ctx.quadraticCurveTo(1640, 786, 1700, 806 + Math.sin((g - wellT) * 20) * 40)
      ctx.stroke()
    }
  }
  ART.wellP(ctx, 1400, 948, 1.0) // redrawn over the plink raiders so they vanish behind the rim
  // razor-shuriken shears the veteran SLEEVE; he ties the other with his teeth
  const sleeveT = BATTLE_EV.sleeve
  if (g > sleeveT - 0.15 && g < sleeveT) ART.shuriken(ctx, lerp(500, 1640, seg(g, sleeveT - 0.15, sleeveT)), lerp(640, 700, seg(g, sleeveT - 0.15, sleeveT)), g * 30, 1.3)
  if (g > sleeveT && g < sleeveT + 0.12) ART.inkSlash(ctx, 1600, 690, 1700, 740, 1, 7)
  if (g > sleeveT) {
    const fl = g - sleeveT
    const sy2 = Math.min(960, 740 + fl * fl * 620)
    ctx.save()
    ctx.translate(1652 + Math.sin(fl * 7) * 16, sy2)
    ctx.rotate(fl * 5)
    ctx.fillStyle = '#697674'
    ctx.beginPath()
    ctx.ellipse(0, 0, 16, 26, 0, 0, 7)
    ctx.fill()
    ctx.restore()
  }
  // TOPKNOTS RAIN BACK: the sliced sacks, knots falling into upturned hands
  const knotT = BATTLE_EV.topknotRain
  const sackTip = seg(g, knotT, knotT + 0.25)
  if (sackTip < 1 || g < knotT + 2) {
    ART.sackP(ctx, 880, 640, 1.15, sackTip * 0.5)
    ART.sackP(ctx, 950, 648, 1.05, sackTip * 0.7)
  }
  for (let j = 0; j < 8; j++) {
    const ft = knotT + 0.15 + j * 0.11
    const fu = seg(g, ft, ft + 0.75)
    const fromX = 890 + (j % 3) * 40
    const toX = 760 + (j % 4) * 74
    if (fu <= 0) continue
    const ky = fu >= 1 ? 892 : lerp(650, 892, fu * fu)
    const kx = fu >= 1 ? toX : lerp(fromX, toX, fu)
    ART.chonmage(ctx, kx, ky, 1.3, { rot: fu * 4 })
  }
  for (let i = 0; i < 4; i++) {
    const vx = 760 + i * 74
    sprite(ctx, S.pool[(i + 2) % 4], vx, 940, { sx: 1.9, sy: 1.9, lean: g > knotT + 0.3 ? -0.12 : 0 })
    if (g > knotT + 0.3) {
      dot(ctx, vx - 8, 852, 4, '#d0bdb1')
      dot(ctx, vx + 8, 852, 4, '#d0bdb1')
    }
  }
  // TENDER: the farmer reties his topknot with shaking hands — and it holds
  const retieT = BATTLE_EV.retie
  if (g > retieT - 0.5) {
    const shake = g < retieT + 1.0 ? Math.sin(g * 24) * 3 * (1 - seg(g, retieT, retieT + 1.0)) : 0
    sprite(ctx, S.rig.farmer, 1150, 990, { sx: 2.2, sy: 2.2, lean: 0.12 })
    const tieIn = seg(g, retieT, retieT + 0.6)
    if (tieIn > 0) {
      ctx.save()
      ctx.globalAlpha = tieIn
      ART.chonmage(ctx, 1150 + shake, 990 - 2.2 * 106, 1.0, { rot: -0.08 })
      ctx.restore()
    }
  }
  // one raider sprints for the bridge; 42 does not chase
  const msgU = seg(g, BATTLE_EV.messenger, BATTLE_EV.messenger + 1.4)
  if (msgU > 0 && msgU < 1) {
    const mx = lerp(700, 1980, msgU)
    sprite(ctx, S.rig.banditC, mx, 1000, { sx: 2.1, sy: 2.1, ...walkCyc(g * 22, 9), lean: 0.22 })
    if (Math.floor(g * 8) % 2 === 0) ART.puff(ctx, mx - 40, 1000, 0.15, 0.3, 7, '160,150,130')
  }
  // the raid folds: the paddy riders crawl out and leave
  const foldU = seg(g, cutT + 0.4, cutT + 2.0)
  for (let j = 0; j < 3; j++) {
    if (foldU <= 0) continue
    const lx = 1020 + j * 120 - foldU * (500 + j * 90)
    sprite(ctx, riders[j], lx, 800 + j * 20, { sx: 2.0, sy: 2.0 * (1 - 0.15 * Math.min(1, foldU * 2)), flip: true, ...walkCyc(g * 10 + j, 6) })
  }
  // ink-slash 2-frame strokes over the exchanges
  if (Math.abs(g - BATTLE_EV.inkSlashes) < 0.035) ART.inkSlash(ctx, 500, 560, 940, 780, 1, 11)
  if (Math.abs(g - BATTLE_EV.inkSlashes - 0.12) < 0.035) ART.inkSlash(ctx, 1240, 520, 900, 760, 1, 9)
  // rain like rope
  ART.rain(ctx, t, { n: 90, len: 96, speed: 1150, slant: -0.24, w: 3, seed: 5, col: 'rgba(184,200,228,0.22)' })
  ctx.restore()
}

// ============================== S6 — THE DUEL ==============================
function drawDuel(ctx, lt, t) {
  const { g, stop, sl } = DUEL.warp(lt)
  // straight-on wide, ONE push 1.0 -> 1.06 on WORLD progress (the freeze holds the camera too)
  const k = 1.0 + 0.06 * cl(g / 18.65)
  cam(ctx, k, 960, 560)
  ctx.drawImage(S.bridge.c, -OSP, -OSP)
  ART.waterFlow(ctx, t, -OSP, W + OSP, 960, 1060, 6)
  // the one lantern — the only warm pixel; it dies mid-exchange
  const litK = 1 - seg(g, DUEL_EV.lanternOut, DUEL_EV.lanternOut + 0.3)
  if (litK > 0.01) {
    ART.glowSpot(ctx, 1652, 620, 240, 'rgba(226,160,80,%A)', 0.13 * litK)
    ART.flame(ctx, 1652, 610, 0.9, t, 21, 5 * litK)
  }
  ART.lanternP(ctx, 1652, 612, 0.85, litK, t, 5)
  // ---- blocking ----
  const standT = DUEL_EV.standoff
  const dashT = DUEL_EV.strike - 0.3
  // 42 walks onto the near end at the standoff, dashes at the strike, pass-through after
  const roninX = track([
    [3.0, 60], [standT, 620], [dashT, 620], [DUEL_EV.strike, 1030], [DUEL_EV.strike + 1.1, 1250],
  ])(g)
  const warlordX = track([
    [0, 1180], [dashT, 1180], [DUEL_EV.strike, 880], [DUEL_EV.strike + 1.1, 770],
  ])(g)
  const roninFeet = 780 + 22 * Math.sin(Math.PI * cl((roninX - 190) / 1540))
  const warlordFeet = 762
  // FORESHADOW: everything flutters; the warlord's hair does not move
  const gust = g > DUEL_EV.foreshadow ? 1 : 0
  const strandSway = Math.sin(t * (gust ? 9 : 3)) * (gust ? 1 : 0.3)
  // ===== 42 =====
  sprite(ctx, S.rig.ronin, roninX, roninFeet, {
    sx: 2.5, sy: 2.5, flip: g > DUEL_EV.strike + 0.55, ...stand,
    lean: g > dashT && g < DUEL_EV.strike + 1.0 ? 0.2 : 0,
  })
  ART.mino(ctx, roninX, roninFeet - 2.5 * 88 - 16, 104, 150, strandSway * 0.12)
  // the ma: one drop falls off the mino's hem — the loudest event in the window
  const maU = seg(t, MA.rainOnly, MA.strike)
  if (maU > 0.4 && maU < 0.75) dot(ctx, roninX - 40, 660 + (maU - 0.4) * 900, 2.6, 'rgba(200,216,240,0.8)')
  // 42's blade during the exchange
  if (g > dashT - 0.05 && g < DUEL_EV.strike + 1.2) {
    const atCross = g < DUEL_EV.strike + 0.05
    const tipX = atCross ? 960 : roninX + 90
    const tipY = atCross ? 640 : roninFeet - 150
    ctx.strokeStyle = '#cdd4de'
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(roninX + 16, roninFeet - 140)
    ctx.quadraticCurveTo((roninX + tipX) / 2, Math.min(roninFeet - 200, tipY + 40), tipX, tipY)
    ctx.stroke()
    ctx.strokeStyle = '#f2f6fa'
    ctx.lineWidth = 2.4
    ctx.stroke()
  }
  // ===== the warlord =====
  const wFlip = true
  const splitU = seg(g, WIGSPLIT.g, WIGSPLIT.g + WIGSPLIT.dur)
  const settle = splitU >= 1 ? 0.05 * Math.exp(-(g - WIGSPLIT.g - WIGSPLIT.dur) * 7) * Math.sin((g - WIGSPLIT.g - WIGSPLIT.dur) * 22) : 0
  const openK = splitU <= 0 ? 0 : splitU >= 1 ? 1 + settle : Math.sin(splitU * Math.PI / 2)
  const wigSlip = stop != null ? sl / 0.35 : g > DUEL_EV.strike ? 1 : 0
  const wScale = 3.1
  // kneel for the ritual; THE BOW: 35 deg over 0.4 s, held — pivot at the knees
  const kneelU = seg(g, DUEL_EV.kneelRitual, DUEL_EV.kneelRitual + 0.25)
  const bowW = seg(g, DUEL_EV.bow, DUEL_EV.bow + 0.4)
  const wf = warlordFeet + kneelU * 16
  const wSyy = 1 - 0.2 * kneelU
  const drawWarlordBody = () => {
    sprite(ctx, S.rig.warlord, warlordX, wf, {
      sx: wScale, sy: wScale * wSyy, flip: wFlip, ...stand,
      lean: g > dashT && g < DUEL_EV.strike + 1.0 ? -0.18 : 0.02,
    })
    if (kneelU > 0) kneelRobe(ctx, warlordX, wf, wScale, '#231c1a')
  }
  if (bowW <= 0) {
    drawWarlordBody()
  } else {
    ctx.save()
    ctx.translate(warlordX, wf)
    ctx.rotate(-0.30 * bowW)
    ctx.translate(-warlordX, -wf)
    drawWarlordBody()
    ctx.restore()
  }
  // head-local overlays (origin = sprite top-left, 76x116; syy keeps them on the compressed body)
  const overlays = () => {
    // oni mask: covers the face until the unmask, then lifts and hangs at his side
    const liftU = seg(g, DUEL_EV.unmask, DUEL_EV.unmask + 0.5)
    if (liftU < 1) {
      ctx.save()
      ctx.translate(38 + liftU * 26, 24 + liftU * 118)
      ctx.rotate(-liftU * 1.4)
      ART.oniMask(ctx, 1.0, 0)
      ctx.restore()
    }
    // the secret wig: two halves pivoting at the top-front seam (mid-slip through the freeze);
    // the spec's +/-90 screen px converted into rig-local units for the 0.55-scale painter
    ctx.save()
    if (wigSlip > 0) {
      ctx.translate(0, 6 * wigSlip)
      ctx.rotate(0.05 * wigSlip)
    }
    ctx.translate(38, 10)
    const wigShift = 90 / (wScale * 0.55)
    ART.wigHalf(ctx, 0.55, -1, openK, wigShift)
    ART.wigHalf(ctx, 0.55, 1, openK, wigShift)
    ctx.restore()
    // scalp pats (nothing left to shave)
    for (const pt of [DUEL_EV.scalpPat, DUEL_EV.scalpPat + 0.25]) {
      const pu = seg(g, pt, pt + 0.2)
      if (pu > 0 && pu < 1) {
        ctx.fillStyle = '#c0aa98'
        ctx.beginPath()
        ctx.arc(38 - 20 + 40 * pu, 30 - 26 * Math.sin(pu * Math.PI), 5, 0, 7)
        ctx.fill()
      }
    }
    // the eyebrow hairakiri: brow halves vanish at their plucks (world g, DUEL_EV)
    if (g >= DUEL_EV.unmask + 0.55) {
      const browY = 19
      const halves = [
        { a: 26, b: 32, until: DUEL_EV.pluck1 },
        { a: 32, b: 38, until: DUEL_EV.pluck2 },
        { a: 38, b: 44, until: DUEL_EV.pluck3 },
        { a: 44, b: 50, until: DUEL_EV.pluck4 },
      ]
      for (const hv of halves) {
        const vis = g < hv.until ? 1 : 1 - seg(g, hv.until, hv.until + 0.15)
        if (vis <= 0) continue
        ctx.strokeStyle = `rgba(30,22,16,${vis})`
        ctx.lineWidth = 2.6
        ctx.beginPath()
        ctx.moveTo(hv.a, browY)
        ctx.quadraticCurveTo((hv.a + hv.b) / 2, browY - 1.6, hv.b, browY)
        ctx.stroke()
      }
      // four slow deliberate razor passes, 0.7 s apart, each a 0.45 s arc
      for (let i = 0; i < 4; i++) {
        const p0 = [DUEL_EV.brow1, DUEL_EV.brow2, DUEL_EV.brow3, DUEL_EV.brow4][i]
        const pu2 = seg(g, p0, p0 + EYEBROW.arcDur)
        if (pu2 <= 0 || pu2 >= 1) continue
        const side = i < 2 ? -1 : 1
        const inward = i % 2 === 0
        const x0 = side < 0 ? (inward ? 26 : 38) : (inward ? 50 : 38)
        const x1 = side < 0 ? (inward ? 38 : 26) : (inward ? 38 : 50)
        const rx = lerp(x0, x1, pu2)
        const ry = 14 - 9 * Math.sin(pu2 * Math.PI)
        ctx.save()
        ctx.translate(rx, ry)
        ctx.rotate(side < 0 ? -0.5 : 0.5)
        ART.razorP(ctx, 0, 0, 0, 1.1)
        ctx.restore()
        if (pu2 > 0.9) ART.puff(ctx, x1, browY, (pu2 - 0.9) * 4, 0.5, i, '40,32,26')
      }
      // the offering: four brows laid on the blade flat
      if (g >= DUEL_EV.offering) {
        ctx.strokeStyle = 'rgba(30,22,16,0.95)'
        ctx.lineWidth = 2.4
        for (let i = 0; i < 4; i++) {
          ctx.beginPath()
          ctx.arc(20 + i * 12, 92, 6, Math.PI * 1.15, Math.PI * 1.85)
          ctx.stroke()
        }
      }
    }
  }
  if (bowW <= 0) {
    rigSpace(ctx, warlordX, wf, wScale, wFlip, overlays, wSyy)
  } else {
    ctx.save()
    ctx.translate(warlordX, wf)
    ctx.rotate(-0.30 * bowW)
    ctx.translate(-warlordX, -wf)
    rigSpace(ctx, warlordX, wf, wScale, wFlip, overlays, wSyy)
    ctx.restore()
  }
  // the warlord's no-dachi: shoulders until the dash, the crossing exchange, then the knees
  const headCY = wf - 93 * wScale * wSyy
  if (g < dashT) {
    ART.noDachi(ctx, warlordX - 20, headCY + 74, -0.10, 0.85)
  } else if (g < DUEL_EV.strike + 1.2) {
    const atCross = stop != null || g < DUEL_EV.strike + 0.05
    const tipX = atCross ? 968 : warlordX - 90
    const tipY = atCross ? 648 : warlordFeet - 150
    ctx.strokeStyle = '#cdd4de'
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.moveTo(warlordX - 14, warlordFeet - 150)
    ctx.quadraticCurveTo((warlordX + tipX) / 2, Math.min(warlordFeet - 220, tipY + 50), tipX, tipY)
    ctx.stroke()
    ctx.strokeStyle = '#f2f6fa'
    ctx.lineWidth = 3
    ctx.stroke()
  } else if (g >= DUEL_EV.kneelRitual) {
    ART.noDachi(ctx, warlordX + 6, warlordFeet - 66, -0.04, 0.72)
  }
  // the strike: spark ring runs REAL time through the freeze (flash is the timeline's)
  if (t >= MA.strike && t < MA.strike + 0.7) ART.sparkRing(ctx, 962, 644, t - MA.strike, 0.6)
  // the child at the bridge foot, pot lid and all — witness to everything
  const childBow = seg(g, DUEL_EV.bowDeep, DUEL_EV.bowDeep + 0.3) - seg(g, DUEL_EV.bowDeep + 0.8, DUEL_EV.bowDeep + 1.1)
  sprite(ctx, S.childBald, 430, 952, { sx: 1.45, sy: 1.45, rot: childBow * 0.34, ...stand })
  ctx.save()
  ctx.translate(430, 952)
  ctx.rotate(childBow * 0.34)
  ctx.translate(-430, -952)
  ART.potLid(ctx, 430, 952 - 1.45 * 108, 0.85, 0)
  ctx.restore()
  ctx.restore()
  // rain like rope runs REAL time — it never freezes
  ART.rain(ctx, t, { n: 95, len: 92, speed: 1150, slant: -0.24 + gust * -0.06, w: 3, seed: 5, col: 'rgba(184,200,228,0.24)' })
}

// ============================== S7 — RESOLUTION ==============================
function drawResolve(ctx, lt, t) {
  const g = lt
  const crane = seg(g, 0, 3)
  cam(ctx, lerp(1.05, 1.0, crane), 960, lerp(700, 545, crane))
  ctx.drawImage(S.wheat.c, -OSP, -OSP)
  // the sun cracks the clouds — the light source changes hands
  const sun = seg(g, RESOLVE_EV.sunBreak - 0.2, RESOLVE_EV.sunBreak + 0.6)
  if (sun > 0) {
    ART.glowSpot(ctx, 960, 200, 480, 'rgba(244,228,180,%A)', 0.24 * sun)
    ctx.save()
    ctx.globalAlpha = 0.5 * sun
    ctx.strokeStyle = 'rgba(244,228,180,0.5)'
    ctx.lineWidth = 14
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.35 + Math.sin(t * 0.4 + i) * 0.02
      ctx.beginPath()
      ctx.moveTo(960, 210)
      ctx.lineTo(960 + Math.sin(a) * 900, 210 + Math.cos(a) * 700)
      ctx.stroke()
    }
    ctx.restore()
  }
  ART.wheatSway(ctx, t, { n: 130 })
  ART.mist(ctx, t, { n: 8, y0: 560, y1: 700, alpha: 0.14 })
  // COMB RITUAL WAVE: topknots re-tie in sequence, the farmer's hands steady now
  const combT = RESOLVE_EV.combWave
  const combX = lerp(300, 1150, seg(g, combT, combT + 2.4))
  if (g > combT - 0.4) {
    for (let i = 0; i < 6; i++) {
      const vx = 300 + i * 170
      const tieT = combT + 0.1 + i * 0.4
      sprite(ctx, S.pool[i % 4], vx, 944, { sx: 2.3, sy: 2.3, flip: i % 2 === 0 })
      const tie = seg(g, tieT, tieT + 0.25)
      if (tie > 0) {
        ctx.save()
        ctx.globalAlpha = tie
        ART.chonmage(ctx, vx + (i % 2 === 0 ? 2 : -2), 944 - 2.3 * 106, 1.15, { rot: -0.08 })
        ctx.restore()
        if (tie < 1) ART.puff(ctx, vx, 944 - 2.3 * 112, tie * 2, 0.3, i)
      }
      if (Math.abs(combX - vx) < 60 && g < combT + 2.4) ART.combP(ctx, combX, 850, 0.3, 1.2)
    }
    sprite(ctx, S.rig.farmer, 1240, 950, { sx: 2.3, sy: 2.3 })
    const farmerTie = seg(g, combT + 2.4, combT + 2.7)
    if (farmerTie > 0) {
      ctx.save()
      ctx.globalAlpha = farmerTie
      ART.chonmage(ctx, 1240, 950 - 2.3 * 106, 1.15, { rot: -0.08 })
      ctx.restore()
    }
  }
  // the child runs the wheat row, pot lid as helmet, sword up
  const runU = seg(g, RESOLVE_EV.wheatRun, RESOLVE_EV.wheatRun + 1.2)
  let childX = 1500
  let childFeet = 1000
  if (runU > 0 && runU < 1) {
    childX = lerp(1500, 700, runU)
    childFeet = 1000 - Math.sin(runU * Math.PI) * 26
  } else if (runU >= 1) {
    childX = 700
    childFeet = 974
  }
  const childCatch = seg(g, RESOLVE_EV.mochiToss + 0.45, RESOLVE_EV.mochiToss + 0.7)
  const childBowK = seg(g, RESOLVE_EV.mochiToss + 0.7, RESOLVE_EV.mochiToss + 0.9) - seg(g, RESOLVE_EV.mochiToss + 1.3, RESOLVE_EV.mochiToss + 1.6)
  if (g > RESOLVE_EV.wheatRun - 0.2) {
    const bounce = runU > 0 && runU < 1 ? Math.abs(Math.sin(g * 14)) * 8 : 0
    sprite(ctx, S.childBald, childX, childFeet - bounce, { sx: 1.5, sy: 1.5, ...walkCyc(g * 16, 7), rot: childBowK * 0.3 })
    ctx.save()
    ctx.translate(childX, childFeet - bounce)
    ctx.rotate(childBowK * 0.3)
    ctx.translate(-childX, -(childFeet - bounce))
    ART.potLid(ctx, childX, childFeet - bounce - 1.5 * 108, 0.85, 0)
    if (g < RESOLVE_EV.mochiToss + 0.45) ART.bokken(ctx, childX + 14, childFeet - bounce - 120, -1.3, 0.8)
    ctx.restore()
  }
  // 42 at the field edge: one mochi tossed — the S3 symmetry — then the mist walk
  const mochiT = RESOLVE_EV.mochiToss
  if (g > mochiT - 1.0 && g < RESOLVE_EV.mistWalk + 6) {
    const walkU = seg(g, RESOLVE_EV.mistWalk, RESOLVE_EV.mistWalk + 3.4)
    const mx = lerp(1350, 1000, walkU)
    const mf = lerp(960, 884, walkU)
    const ms = lerp(2.4, 1.25, walkU)
    sprite(ctx, S.rig.ronin, mx, mf, { sx: ms, sy: ms, flip: walkU > 0, ...walkCyc(g * 7 * walkU + 3, 4) })
    ART.mino(ctx, mx, mf - ms * 88 - 10, 88 * ms / 2.4, 130 * ms / 2.4, Math.sin(t * 1.6) * 0.05)
    if (walkU > 0) {
      ART.glowSpot(ctx, mx, mf - ms * 60, 130 * ms, 'rgba(244,228,180,%A)', 0.14)
      ART.mist(ctx, t, { n: 4, y0: mf - 120, y1: mf + 30, alpha: 0.3 })
    }
    if (g > mochiT - 0.2 && g < mochiT + 0.9) {
      const tu = seg(g, mochiT, mochiT + 0.5)
      if (tu > 0 && tu < 1) {
        const ax = lerp(1330, childX + 6, tu)
        const ay = lerp(800, childFeet - 130, tu) - Math.sin(tu * Math.PI) * 190
        ART.mochiP(ctx, ax, ay, 1.05, tu * 6)
      }
    }
  }
  // ===== THE ENSO: the film's only iris =====
  const ensou = seg(g, ENSO.t0 - T.resolve, ENSO.seal - T.resolve)
  if (ensou > 0 || g > ENSO.t0 - T.resolve) {
    const cx0 = 960
    const cy0 = 520
    const R = 400
    const dimK = 0.94 * seg(g, ENSO.t0 - T.resolve, ENSO.t0 - T.resolve + 2.4)
    ART.ensoDim(ctx, cx0, cy0, R + 26, dimK)
    // the walker seen through the forming circle
    ART.ensoStroke(ctx, cx0, cy0, R, ensou, { width: 30 })
    const sealK = seg(g, ENSO.seal - T.resolve, ENSO.seal - T.resolve + 0.35)
    ART.ensoSeal(ctx, cx0, cy0, R, sealK, 16)
    // behind the sealed circle the scene gives way to black
    const veil = seg(g, ENSO.seal - T.resolve, ENSO.seal - T.resolve + 0.55)
    if (veil > 0) {
      ctx.fillStyle = `rgba(8,7,6,${0.92 * veil})`
      ctx.fillRect(-OSP, -OSP, W + OSP * 2, H + OSP * 2)
      // the sealed circle stays legible over the black
      ART.ensoStroke(ctx, cx0, cy0, R, Math.max(ensou, 1), { width: 30, behind: 'rgba(8,7,6,0)' })
      ART.ensoSeal(ctx, cx0, cy0, R, Math.max(sealK, 1), 16)
    }
    // out: to black on the held tonic
    const outK = seg(g, 12.9, 13.0)
    if (outK > 0) {
      ctx.fillStyle = `rgba(8,7,6,${outK})`
      ctx.fillRect(-OSP, -OSP, W + OSP * 2, H + OSP * 2)
    }
  }
  ctx.restore()
}

// ============================== the shot registry ==============================
const DRAW = {
  province: drawProvince,
  raid: drawRaid,
  ronin: drawRonin,
  training: drawTraining,
  battle: drawBattle,
  duel: drawDuel,
  resolve: drawResolve,
}

// ============================== the film ==============================
export default {
  title: 'HAIRAKIRI',
  output: 'hairakiri.mp4',
  duration: DUR,
  async prepare() {
    const load = (id, far = false) => A.loadRemy(id, far)
    // cast (casting.md ids — verified; 42 and 1926 never mirrored, farmer reads victim)
    S.rig = {}
    const nearIds = {
      ronin: 42, warlord: 3360, giant: 3627, twin: 2620, veteran: 2260, comic: 4322,
      elder: 960, grandmother: 2186, child: 1020, farmer: 1140, captain: 1926,
      banditA: 4187, banditB: 23, banditC: 159, vendor: 320,
    }
    for (const [role, id] of Object.entries(nearIds)) S.rig[role] = await load(id, false)
    // doubles for simultaneous scenes (bandits raid in S2 AND fight in S5)
    S.rig.banditA2 = await load(3140, false)
    S.rig.banditC2 = await load(3363, false)
    S.rig.captainB = await load(3363, false)
    // the child's shaved reveal: procedural bald-cap (hair hex -> skin, palette-keyed)
    S.childBald = ART.baldify(await load(1020, false), '#ff9653', '#685240')
    S.childHair = await load(1020, false)
    // far crowd pool + far riders
    S.pool = await Promise.all([3966, 312, 83, 682].map((id) => load(id, true)))
    S.farRiders = await Promise.all([4187, 23, 159].map((id) => load(id, true)))
    // sunset silhouettes (the band + villagers)
    S.bandSil = await Promise.all([3627, 2620, 2260, 4322, 42].map(async (id) => ART.silhouette(await load(id, false))))
    // baked stages
    S.province = ART.provinceBake()
    S.provClouds = ART.provinceClouds()
    S.lane = ART.laneBake()
    S.stand = ART.standBake()
    S.courtyard = ART.courtyardBake()
    S.battleField = ART.battleBake()
    S.bridge = ART.bridgeBake()
    S.wheat = ART.wheatBake()
    S.scratch = A.canvas(W, H)
    // the composer's module, wired when it lands (stills run silent without it)
    try { const m = await import('./score.js'); scoreFn = m.score ?? m.default ?? null } catch { /* score.js not landed yet */ }
  },
  shots: SHOTS.map((sh) => ({
    name: sh.name,
    t0: sh.t0,
    t1: sh.t1,
    draw(ctx, lt, dur, t, overlay) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.imageSmoothingEnabled = false
      if (sh.name === 'resolve' && lt < WIPE_BY_ID.s6s7.dur) regrowthWipe(ctx, lt, t)
      else DRAW[sh.name](ctx, lt, t)
      forwardWipe(ctx, sh, lt, t)
    },
    fx: (lt, t) => {
      const base = { letterbox: SAFE.letterbox, bloom: 0.1, bloomThresh: 0.9, vignette: 0.52, grain: 0.013 }
      if (sh.name === 'province') return { ...base, haze: 0.05, vignette: 0.58, grain: 0.014 }
      if (sh.name === 'raid') return { ...base, bloom: 0.11, vignette: 0.6, grain: 0.014 }
      if (sh.name === 'ronin') return { ...base, bloom: 0.1, vignette: 0.55 }
      if (sh.name === 'training') return { ...base, sat: 1.06, warm: 0.04, bloom: 0.12, bloomThresh: 0.87, vignette: 0.46 }
      if (sh.name === 'battle') return { ...base, exposure: -0.03, bloom: 0.1, vignette: 0.58 }
      if (sh.name === 'duel') return { ...base, bloom: 0.12, bloomThresh: 0.88, vignette: 0.6, grain: 0.013 }
      if (sh.name === 'resolve') {
        const sun = seg(lt, 0.8, 1.6)
        return { ...base, warm: 0.06 * sun, sat: lerp(1.0, 1.06, sun), bloom: 0.13, bloomThresh: 0.85, vignette: 0.46, haze: 0.05 }
      }
      return base
    },
  })),
  captions: CAPTIONS, // single source of truth — re-exported from timeline.js
  captionStyles: {
    title: {
      font: 'Anton', size: 132, weight: '', color: '#f2e6c8', track: 2,
      shadow: '#050608', glow: '#8a6a24', glowBlur: 22,
    },
    caption: {
      size: 40, weight: 600, color: '#f2ecdc',
      shadow: '#04070d', glow: '#1a2438', glowBlur: 14,
    },
    kicker: {
      font: '"JetBrains Mono"', size: 26, weight: 700, color: '#d9c98f', track: 6,
      shadow: '#050608',
    },
  },
  flashes: FLASHES,
  score(kit) { if (scoreFn) return scoreFn(kit) }, // composer's module, wired when it lands
  audio: { seed: 1603, reverb: 2.6, reverbGain: 0.4 },
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } },
}
