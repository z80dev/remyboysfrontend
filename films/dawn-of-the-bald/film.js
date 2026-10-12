// DAWN OF THE BALD — picture. 29 shots, 100.0 s, painted 2D stage (raiders/
// pirates lineage), sprites 1.4-2.6x nearest. Every frame a pure function of
// time: actors/blocking live on the film clock's WORLD g (warp(t).g, frozen
// through both hit-stops); effects age on REAL t so shake/flash/dust keep real
// time through the freezes. No Math.random, no Date, no state across frames;
// particle events are baked in prepare() at absolute world seconds.
import { W, H, hash, E, seg, lerp, txt, F } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import * as Z from './horde.js'
import score from './score.js'
import {
  DURATION, SHOTS, SAFE, GROUNDS, CAPS, DRAWN, CAST,
  EV_S1, EV_TITLE, EV_S2, EV_S3, EV_S4, EV_S5, EV_S6, HORDE, warp, filmT,
} from './timeline.js'

const S = {}                       // prepared, immutable art state
const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const ease = E.outCubic
const BLOOD = '#b3202a'
const BONE = '#e9e2d0'
const SODIUM = '#ff9a3c'

// ---------- small shared helpers ----------
function sprite(ctx, rig, px, feet, o = {}) {
  ctx.imageSmoothingEnabled = false
  A.drawRemy(ctx, rig, px, feet, o)
}
const crownY = (rig, feet, sy) => feet - (rig.bottom - rig.top + 1) * sy + 7 * sy
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
const walkCyc = (ph, amp = 4) => {
  const s = Math.sin(ph)
  return { lift: [Math.round(Math.max(0, s) * amp), Math.round(Math.max(0, -s) * amp)], stride: [Math.round(s * 2), Math.round(-s * 2)], lean: 0.05 }
}
const runCyc = (ph) => {
  const s = Math.sin(ph)
  return { lift: [Math.round(Math.max(0, s) * 9), Math.round(Math.max(0, -s) * 9)], stride: [Math.round(s * 6), Math.round(-s * 6)], lean: 0.2 }
}
const stand = { lift: [2, 0], stride: [1, 0], lean: 0.02 }

function bars(ctx) {              // letterbox 0.8 — drawn last; captions live on overlay
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, SAFE.bandY[0])
  ctx.fillRect(0, SAFE.bandY[1], W, H - SAFE.bandY[1])
}

// analytic dust burst at impact (age on real t for stop-crossing life)
function dust(ctx, t, evs, scale = 1) {
  for (const e of evs) {
    const age = t - filmT(e.g)
    if (age < 0 || age > e.dur) continue
    const u = age / e.dur
    for (let i = 0; i < e.n; i++) {
      const r1 = hash(e.seed + i * 3), r2 = hash(e.seed + i * 3 + 1), r3 = hash(e.seed + i * 3 + 2)
      const a = -Math.PI * (0.15 + 0.7 * r1)
      const sp = (60 + 160 * r2) * scale
      const x = e.x + Math.cos(a) * sp * age
      const y = e.y + Math.sin(a) * sp * age * 0.6 + 26 * age * age * scale * 0.4
      ctx.globalAlpha = (1 - u) * 0.5
      ctx.fillStyle = i % 3 ? '#8d8577' : '#5a544a'
      const sz = Math.max(1, Math.round((2 + 5 * r3) * scale))
      ctx.fillRect(x | 0, y | 0, sz, sz)
    }
  }
  ctx.globalAlpha = 1
}

// procedural blade: drawn at a hand point, angle in radians
function drawSword(ctx, x, y, ang, len = 74, o = {}) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)
  ctx.strokeStyle = '#d8dde2'
  ctx.lineWidth = 4
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.4
  ctx.beginPath(); ctx.moveTo(4, -1); ctx.lineTo(len - 4, -1); ctx.stroke()
  ctx.fillStyle = '#2b2320'
  ctx.fillRect(-10, -3, 10, 6)
  ctx.fillStyle = '#7a5a2e'
  ctx.fillRect(-22, -2.5, 12, 5)
  if (o.glint > 0) {
    ctx.globalAlpha = o.glint
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(len * 0.5, -12); ctx.lineTo(len * 0.5, 12); ctx.stroke()
  }
  ctx.restore()
}
// swing trail arc from a0 to a1 as u progresses (0..1.2 visible) — trail ONLY;
// the in-hand blade comes from drawHero so the two can never double up
function swordArc(ctx, x, y, r, a0, a1, u, o = {}) {
  if (u <= 0 || u >= 1.3) return
  const a = lerp(a0, a1, ease(cl(u)))
  ctx.save()
  ctx.globalAlpha = 0.55 * (1 - cl(u))
  ctx.strokeStyle = '#f2f6f8'
  ctx.lineWidth = 7 * (o.w ?? 1)
  ctx.beginPath()
  ctx.arc(x, y, r, a - 0.9 * (a1 - a0 > 0 ? 1 : -1) * 0.4, a)
  ctx.stroke()
  ctx.restore()
}
// both-arms overhead wave (tiny survivor / CURLS) — two strokes flapping
function armWave(ctx, x, headTop, t, ph = 0) {
  const f = Math.sin(t * 9 + ph) * 0.35
  ctx.strokeStyle = '#caa27a'
  ctx.lineWidth = 4
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(x + s * 6, headTop + 16)
    ctx.lineTo(x + s * (14 + 4 * f), headTop - 8 - 6 * Math.max(0, f * s))
    ctx.stroke()
  }
}
// drifting birds — deterministic chevrons
function birds(ctx, g, n, cx, cy) {
  ctx.strokeStyle = '#1a1416'
  ctx.lineWidth = 2
  for (let i = 0; i < n; i++) {
    const r1 = hash(i * 17 + 3), r2 = hash(i * 31 + 9)
    const x = cx + r1 * 700 + g * (6 + r2 * 5)
    const y = cy + r2 * 120 + Math.sin(g * 1.3 + i) * 6
    const flap = Math.sin(g * 7 + i * 2) * 3
    const xx = ((x % 2200) + 2200) % 2200 - 140
    ctx.beginPath()
    ctx.moveTo(xx - 7, y + flap); ctx.lineTo(xx, y); ctx.lineTo(xx + 7, y + flap)
    ctx.stroke()
  }
}

// ---------- character wrappers ----------
function drawHero(ctx, g, o = {}) {
  const sy = o.sy ?? 2.3
  const x = o.x, feet = o.feet ?? GROUNDS[o.groundKey ?? 's2']
  const flip = o.flip ?? true
  const dir = flip ? -1 : 1
  const hy = crownY(S.hero, feet, sy) + 6
  const stowed = o.sword !== 'hand' && g >= EV_S2.arm
  // stowed blade drawn BEHIND the body so its highlight never crosses the hair
  if (stowed) drawSword(ctx, x + dir * 4, hy + 40, -1.9 + dir * 0.06, 52)
  sprite(ctx, S.hero, x, feet, { sy, sx: sy, ...(o.pose ?? stand), flip, rot: o.rot ?? 0 })
  if (o.duffel !== false && g >= EV_S2.arm) ART.drawDuffel(ctx, x - dir * 26, feet - 30 * sy * 0.4, sy * 0.5, 0)
  if (o.sword === 'hand') {
    drawSword(ctx, x - dir * 14, feet - 34 * sy * 0.4, o.swordAng ?? -0.5, 60, { glint: o.swordGlint ?? 0 })
  }
}
// FRINGE: BALD base rig + procedural hair cap (it sheds) + newsboy cap (blows off)
function drawFringe(ctx, g, o = {}) {
  const sy = o.sy ?? 2.15
  const flip = o.flip ?? false
  sprite(ctx, S.fringe, o.x, o.feet, { sy, sx: sy, ...(o.pose ?? stand), flip, rot: o.rot ?? 0 })
  const hy = crownY(S.fringe, o.feet, sy) + 4 * sy * 0.4
  if ((o.cover ?? 1) > 0.02) ART.drawHairCap(ctx, o.x, hy, sy, S.fringeHair, 31, o.cover ?? 1)
  if (g < EV_S4.hatOff) ART.drawHat(ctx, o.x, hy, sy, { rot: o.hatRot ?? 0, flip, off: o.hatOff ?? 0 })
}

// ---------- S2 blocking constants ----------
const S2C = {
  friendX: 596, friendFeet: 916, friendSy: 1.95,
  heroX: 1235, heroFeet: 924,
  boardRects: null,
}

// =====================================================================
// DRAW functions — one per shot name
// =====================================================================
const DRAW = {}

// ----- S1: the broadcast (one stage, five shots) -----
function s1Stage(ctx, g, t) {
  const set = S.news
  const aFeet = set.deskY + 46
  const aSy = 2.55
  const tilt = seg(g, EV_S1.recede, EV_S1.anchorStare) * 0.07
  // full shed on air: the cap lets go completely across the beat (QA-C: partial
  // erosion at 0.8 depth was pixel-identical to the full cap)
  const cover = 1 - seg(g, EV_S1.recede, EV_S1.recede + 1.2)
  // studio above the desk, then the anchor, then the desk front occludes him
  ctx.drawImage(set.canvas, 0, 0, W, set.deskY, 0, 0, W, set.deskY)
  sprite(ctx, S.anchorRig, 880, aFeet, { sy: aSy, sx: aSy, ...stand, rot: tilt, flip: false })
  const aHead = crownY(S.anchorRig, aFeet, aSy) + 3
  if (cover > 0.02) ART.drawHairCap(ctx, 880, aHead, aSy, S.anchorHair, 77, cover)
  Z.hairFall(ctx, S.fall.anchor, g, {})
  ctx.drawImage(set.canvas, 0, set.deskY, W, H - set.deskY, 0, set.deskY, W, H - set.deskY)
  // framed portrait prop on the desk (the ANCHOR original)
  const pr = set.portraitRect
  ctx.drawImage(S.anchorImg, pr.x, pr.y, pr.w, pr.h)
  ctx.strokeStyle = '#c9a23c'; ctx.lineWidth = 5
  ctx.strokeRect(pr.x, pr.y, pr.w, pr.h)
  // lower third + bug + ticker (drawn broadcast text, QA'd by eye; bar clear of the desk portrait)
  if (g > EV_S1.lower1) {
    const y = 812
    ctx.fillStyle = 'rgba(120,14,18,0.92)'
    ctx.fillRect(400, y, 540, 64)
    txt(ctx, DRAWN.lower1, 424, y + 44, { size: 34, font: F.grot, weight: 700, track: 1 })
    ctx.fillStyle = BLOOD
    ctx.fillRect(1646, 138, 190, 52)
    txt(ctx, DRAWN.station, 1741, 174, { size: 26, font: F.grot, weight: 700, align: 'center', color: '#fff' })
  }
  if (g > EV_S1.lower2) txt(ctx, DRAWN.lower2, 960, 770, { size: 26, font: F.mono, align: 'center', color: '#ffd9d9', alpha: 0.9 })
  const ty = 926
  ctx.fillStyle = 'rgba(10,10,12,0.85)'
  ctx.fillRect(0, ty, W, 44)
  const off = (g * 92) % S.tickerW
  ctx.save()
  ctx.beginPath(); ctx.rect(0, ty, W, 44); ctx.clip()
  txt(ctx, DRAWN.ticker, -off, ty + 30, { size: 24, font: F.grot, color: '#e8e8e8' })
  txt(ctx, DRAWN.ticker, -off + S.tickerW, ty + 30, { size: 24, font: F.grot, color: '#e8e8e8' })
  ctx.restore()
}
function s1Map(ctx, g, t) {
  ctx.drawImage(S.newsMap, 0, 0)
  const u = ease(seg(g, EV_S1.zoneGrow, EV_S1.zoneGrow + 2.8))
  if (u > 0) {
    const cx = 810, cy = 560
    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.fillStyle = BLOOD
    ctx.beginPath()
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const r = (150 + hash(i * 7 + 2) * 130) * (0.25 + 0.75 * u)
      const x = cx + Math.cos(a) * r * 1.35
      const y = cy + Math.sin(a) * r * 0.8
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
    }
    ctx.closePath(); ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#e5484d'; ctx.lineWidth = 3
    ctx.stroke()
    const fx = cx + 190 * u, fy = cy - 130 * u
    ctx.strokeStyle = '#dcd6c8'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 46); ctx.stroke()
    ctx.fillStyle = '#e5484d'
    ctx.fillRect(fx, fy - 46, 10, 20)
    txt(ctx, DRAWN.zone, fx + 16, fy - 30, { size: 22, font: F.grot, weight: 700, color: '#ff9d9d' })
    ctx.restore()
  }
  const ids = [CAST.HORDE_NEAR[0], CAST.HORDE_NEAR[3]]
  ids.forEach((id, i) => {
    const x = 1330 + i * 250, y = 250
    ctx.fillStyle = '#101418'
    ctx.fillRect(x - 8, y - 8, 164, 196)
    ctx.drawImage(S.headIcons[id], x, y, 144, 144)
    txt(ctx, 'AFFLICTED', x + 72, y + 178, { size: 22, font: F.mono, align: 'center', color: '#ff9d9d' })
  })
  txt(ctx, DRAWN.mapTitle, 120, 200, { size: 44, font: F.grot, weight: 700, color: '#e8e2d2', track: 4 })
  txt(ctx, DRAWN.city, 810, 540, { size: 24, font: F.grot, align: 'center', color: '#cfc8b8' })
}

DRAW['s1.static'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  // LINEAR open across the whole shot so the iris is visible at every sampled t
  const u = seg(g, EV_S1.tvOn, 1.55)
  if (u <= 0) {
    ART.staticNoise(ctx, 1, t)
  } else {
    s1Stage(ctx, g, t)
    if (u < 1) {
      // channel lock: black ring outside the opening iris (no clip — paint over)
      ctx.save()
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.rect(0, 0, W, H)
      ctx.moveTo(960 + u * 1400, 540)
      ctx.arc(960, 540, u * 1400, 0, Math.PI * 2, true)
      ctx.fill('evenodd')
      ctx.restore()
      ART.staticNoise(ctx, (1 - u) * 0.85, t)
    }
  }
  ART.broadcastOverlay(ctx, t, 0.75 + u * 0.25)
  bars(ctx)
}
DRAW['s1.anchor'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  s1Stage(ctx, g, t)
  ART.broadcastOverlay(ctx, t, 1)
  bars(ctx)
}
DRAW['s1.map'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  s1Map(ctx, g, t)
  ART.broadcastOverlay(ctx, t, 1)
  bars(ctx)
}
DRAW['s1.recede'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  s1Stage(ctx, g, t)
  ART.broadcastOverlay(ctx, t, 1)
  bars(ctx)
}
DRAW['s1.degrade'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  const sig = 1 - seg(g, EV_S1.degrade, EV_S1.deadAir)
  if (sig > 0.02) {
    s1Stage(ctx, g, t)
    for (let i = 0; i < 3; i++) {
      const sy = (hash(Math.floor(t * 21) * 5 + i * 37) * 900) | 0
      const sh = (14 + hash(i + Math.floor(t * 17)) * 26) | 0
      const dx = (hash(Math.floor(t * 23) + i * 11) - 0.5) * 160 * (1 - sig)
      ctx.drawImage(ctx.canvas, 0, sy, W, sh, dx, sy, W, sh)
    }
  }
  ART.staticNoise(ctx, (1 - sig) * 0.9, t)
  ART.broadcastOverlay(ctx, t, 0.4 + 0.6 * sig)
  bars(ctx)
}

// ----- TITLE -----
DRAW['title.ridge'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  ctx.drawImage(S.skyDusk, 0, 0)
  for (const z of S.L_TITLE) {
    const x = ((z.x + g * 9) % 2440) - 240
    const feet = z.depth === 0 ? 902 : 864
    const sy = z.depth === 0 ? 1.85 : 1.5
    Z.drawSilhouette(ctx, S.near[z.i % S.near.length], x, feet, g, { mode: 'walk', sy, sx: sy, color: '#0c1116', flip: z.side < 0, alpha: 0.92 })
  }
  ctx.drawImage(S.ridge, 0, H - S.ridge.height)
  const cu = seg(g, EV_TITLE.in, EV_TITLE.hordePass + 1.6)
  if (cu > 0 && cu < 1) {
    const x = -320 + cu * 2560
    Z.drawSilhouette(ctx, S.near[4], x, 978, g, { mode: 'walk', sy: 3.1, sx: 3.1, color: '#05080a', flip: false })
  }
  bars(ctx)
}

// ----- S2: the house -----
// boards persist across every S2 shot once their nail beat lands (QA-A v2: they vanished)
function drawS2Boards(ctx, g, t) {
  EV_S2.boards.forEach((b, i) => {
    if (g < b) return
    const r = S2C.boardRects[i]
    ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.rotate(r.r)
    ART.drawBoard(ctx, -r.w / 2, -r.h / 2, r.w, 0)
    ctx.restore()
  })
  dust(ctx, t, EV_S2.boards.map((b, i) => ({ g: b, x: S2C.boardRects[i].x + 120, y: S2C.boardRects[i].y, seed: 30 + i, n: 8, dur: 0.5 })))
}
DRAW['s2.yard'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  const k = 1 + 0.05 * ease(seg(g, EV_S2.in, EV_S2.in + 5))
  cam(ctx, k, 960, 560)
  ctx.drawImage(S.yard.canvas, 0, 0)
  ART.glow(ctx, S.yard.doorX, 700, 0.5, { r: 130, color: SODIUM })
  const swing = EV_S2.boards.findIndex((b) => g >= b - 0.45 && g < b + 0.25)
  const lunging = swing >= 0
  drawHero(ctx, g, {
    x: S2C.heroX, feet: S2C.heroFeet, groundKey: 's2', duffel: false,
    pose: lunging ? { ...stand, lean: 0.3, lift: [3, 0] } : stand,
  })
  drawS2Boards(ctx, g, t)
  const sway = g > EV_S2.sway
  sprite(ctx, S.friend, S2C.friendX, S2C.friendFeet, { sy: S2C.friendSy, sx: S2C.friendSy, ...(sway ? Z.zSway(g * 1.4) : stand), flip: false })
  const fHead = crownY(S.friend, S2C.friendFeet, S2C.friendSy) + 4
  ART.drawHairCap(ctx, S2C.friendX, fHead, S2C.friendSy, S.friendHair, 55, 1)
  ctx.restore()
  bars(ctx)
}
DRAW['s2.friend'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  cam(ctx, 1.08, 780, 580)
  ctx.drawImage(S.yard.canvas, 0, 0)
  ART.glow(ctx, S.yard.doorX, 700, 0.4, { r: 130, color: SODIUM })
  drawS2Boards(ctx, g, t)
  const turned = g >= EV_S2.turn
  const cover = turned ? 1 - seg(g, EV_S2.turn, EV_S2.turn + 0.5) : 1
  const pose = turned ? { ...Z.zSway(g), lean: -0.04 } : Z.zSway(g * 1.4)
  sprite(ctx, S.friend, S2C.friendX, S2C.friendFeet, { sy: S2C.friendSy, sx: S2C.friendSy, ...pose, flip: false, rot: turned ? -0.03 : 0 })
  const fHead = crownY(S.friend, S2C.friendFeet, S2C.friendSy) + 4
  if (cover > 0.02) ART.drawHairCap(ctx, S2C.friendX, fHead, S2C.friendSy, S.friendHair, 55, cover)
  Z.hairFall(ctx, S.fall.friend, g, {})
  if (turned) ART.glow(ctx, S2C.friendX, fHead, 0.25, { r: 90, color: '#9fb4bd' })
  ctx.restore()
  bars(ctx)
}
DRAW['s2.press'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  ctx.drawImage(S.yard.canvas, 0, 0)
  ART.glow(ctx, S.yard.doorX, 700, 0.45, { r: 130, color: SODIUM })
  const u = ease(seg(g, EV_S2.blinds, EV_S2.blinds + 1.1))
  drawS2Boards(ctx, g, t)
  ART.drawBlinds(ctx, S.yard.window, Math.max(0.12, u))
  drawHero(ctx, g, { x: S2C.heroX, feet: S2C.heroFeet, pose: u > 0 && u < 1 ? { ...stand, lift: [4, 0] } : stand, duffel: false })
  S.P_HEDGE.forEach((pi, i) => {
    const g0 = EV_S2.hedges + i * 0.35
    const u2 = ease(seg(g, g0, g0 + 0.9))
    if (u2 <= 0) return
    const x = 300 + i * 128
    Z.drawSilhouette(ctx, S.near[pi], x, S.yard.hedgeY, g, { mode: 'rise', riseU: u2, sy: 2.05, sx: 2.05, color: '#0a1216', flip: true })
  })
  bars(ctx)
}
DRAW['s2.garage'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  ctx.drawImage(S.yard.canvas, 0, 0)
  ART.glow(ctx, S.yard.doorX, 700, 0.4, { r: 130, color: SODIUM })
  const u = ease(seg(g, EV_S2.garage, EV_S2.garage + 0.75))
  const gr = S.yard.garage
  // open garage: dark interior revealed, door gathered at the header (rolls up)
  ctx.fillStyle = '#0a0c0f'
  ctx.fillRect(gr.x, gr.y + 6, gr.w, gr.h - 6)
  const panelH = 30 + (1 - u) * (gr.h - 36)
  ctx.fillStyle = '#4a5058'
  ctx.fillRect(gr.x, gr.y, gr.w, panelH)
  ctx.strokeStyle = '#2c3138'; ctx.lineWidth = 3
  for (let i = 1; i < 5; i++) {
    const yy = gr.y + (panelH / 5) * i
    ctx.beginPath(); ctx.moveTo(gr.x, yy); ctx.lineTo(gr.x + gr.w, yy); ctx.stroke()
  }
  ctx.strokeStyle = '#2c3138'; ctx.lineWidth = 4
  ctx.strokeRect(gr.x, gr.y, gr.w, gr.h)
  const ex = ease(seg(g, EV_S2.exit, EV_S2.exit + 0.7))
  const hx = lerp(gr.x + 90, 620, ex)
  drawHero(ctx, g, { x: hx, feet: 926, groundKey: 's2', pose: ex > 0 && ex < 1 ? runCyc(g * 16) : walkCyc(g * 7) })
  const cu = seg(g, EV_S2.cross - 0.6, EV_S2.cross + 0.7)
  if (cu > 0 && cu < 1) {
    for (let i = 0; i < 2; i++) {
      const x = 1500 + cu * 620 + i * 90
      Z.drawSilhouette(ctx, S.near[i ? 8 : 5], x, 930, g, { mode: 'walk', sy: 2.1, sx: 2.1, color: '#070d10', flip: true })
    }
  }
  bars(ctx)
}

// ----- S3: the road -----
function highwayStage(ctx, g, heroPose, heroX, o = {}) {
  ctx.drawImage(S.highway.canvas, 0, 0)
  birds(ctx, g, 4, 300, 300)
  drawHero(ctx, g, { x: heroX, feet: 930, groundKey: 's3', pose: heroPose, sword: 'hand', flip: false, swordAng: o.swordAng, swordGlint: o.swordGlint })
}
DRAW['s3.wide'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  const u = ease(seg(g, EV_S3.wide, EV_S3.wide + 2.4))
  highwayStage(ctx, g, u < 1 ? walkCyc(g * 8) : stand, lerp(140, 640, u))
  bars(ctx)
}
DRAW['s3.rise'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  highwayStage(ctx, g, stand, 640)
  const waves = [[EV_S3.rise, 0], [EV_S3.rise + 0.9, 6]]
  for (const [g0, off] of waves) {
    for (let k = 0; k < 6; k++) {
      const pi = S.P_RISE[off + k]
      const car = S.highway.cars[(off + k) % S.highway.cars.length]
      const u = ease(seg(g, g0 + k * 0.35, g0 + k * 0.35 + 1.8))
      if (u <= 0) continue
      let x = car.x + (k % 2 ? 96 : -56)
      if (Math.abs(x - 640) < 110) x += 150        // keep the hero's lane clear (QA-A v2)
      Z.drawZombie(ctx, S.near[pi], x, 930, g, { mode: 'rise', riseU: u, sy: 2.0, sx: 2.0, flip: x < 640, shadow: true })
    }
  }
  bars(ctx)
}
DRAW['s3.run'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  const [sx0, sy0] = shakeXY(t, g >= EV_S3.tackle ? 13 * Math.exp(-(t - filmT(EV_S3.tackle)) * 3.2) : 0)
  ctx.save()
  ctx.translate(sx0, sy0)
  const heroX3 = lerp(640, 150, ease(seg(g, EV_S3.run, EV_S3.run + 4.6)))
  const swp3 = seg(g, EV_S3.clear, EV_S3.clear + 0.3)
  highwayStage(ctx, g, runCyc(g * 17), heroX3, { swordAng: swp3 > 0 && swp3 < 1.2 ? lerp(-2.2, 0.6, ease(cl(swp3))) : -0.5 })
  ;[0, 3, 6, 9].forEach((pi, i) => {
    const g0 = EV_S3.run + 0.3 + i * 0.5
    if (g < g0) return
    const x = Math.max(560, 1150 + i * 120 - (g - g0) * 60)
    Z.drawZombie(ctx, S.near[pi], x, 930, g, { mode: 'walk', sy: 2.0, sx: 2.0, flip: true, shadow: true })
  })
  const doorG = S.P_DOOR[0], flatG = S.P_DOOR[1]
  const doorX = S.highway.vanX
  const doorAng = lerp(0, 1.28, seg(g, EV_S3.doorGrab + 0.5, EV_S3.tackle))
  const flatU = seg(g, EV_S3.doorGrab + 0.5, EV_S3.tackle)
  const lx = lerp(doorX + 30, doorX - 90, seg(g, EV_S3.doorGrab, EV_S3.tackle))
  Z.drawZombie(ctx, S.near[doorG], lx, 930, g, { mode: 'walk', sy: 2.0, sx: 2.0, flip: true, shadow: true })
  if (flatU > 0) sprite(ctx, S.near[flatG], doorX - 40, 930, { sy: 2.0, sx: 2.0, ...Z.zWalk(g), flip: true, rot: lerp(0, 1.45, ease(flatU)) })
  if (g >= EV_S3.doorGrab + 0.5) {
    ctx.save()
    ctx.translate(doorX, 868)
    ctx.rotate(doorAng)
    ctx.fillStyle = '#39424c'
    ctx.fillRect(-6, -100, 12, 200)
    ctx.strokeStyle = '#20262d'; ctx.lineWidth = 3
    ctx.strokeRect(-6, -100, 12, 200)
    ctx.restore()
  }
  dust(ctx, t, S.dustS3)
  const swp = swp3
  if (swp > 0 && swp < 1.2) {
    swordArc(ctx, heroX3 + 45, 790, 96, -2.2, 0.6, swp)
    for (const pi of [3, 9]) {
      const drop = seg(g, EV_S3.clear, EV_S3.clear + 0.6)
      if (drop > 0) sprite(ctx, S.near[pi], 470 + pi * 14, 930, { sy: 2.0, sx: 2.0, ...Z.zWalk(0), flip: true, rot: lerp(0, 1.62, ease(drop)) })
    }
  } else if (g >= EV_S3.clear + 0.6) {
    for (const pi of [3, 9]) sprite(ctx, S.near[pi], 470 + pi * 14, 930, { sy: 2.0, sx: 2.0, ...Z.zWalk(0), flip: true, rot: 1.62 })
  }
  ctx.restore()
  if (g >= EV_S3.tackle) {
    const fa = Math.exp(-(t - filmT(EV_S3.tackle)) * 9) * 0.35
    if (fa > 0.01) { ctx.fillStyle = `rgba(255,250,240,${fa})`; ctx.fillRect(0, 0, W, H) }
  }
  bars(ctx)
}
DRAW['s3.hill'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  const dip = seg(g, 44.55, 44.95)      // dip-through-black into the reveal
  const showCrest = dip < 0.5
  const showMall = dip > 0.5
  const dipA = dip <= 0 ? 0 : dip < 0.5 ? 1 - dip * 2 : (1 - dip) * 2
  if (showCrest) {
    ctx.drawImage(S.skyDusk, 0, 0)
    ctx.fillStyle = '#0a0f13'
    ctx.beginPath()
    ctx.moveTo(0, 1080)
    ctx.lineTo(0, 760)
    ctx.quadraticCurveTo(760, 640, 1920, 800)
    ctx.lineTo(1920, 1080)
    ctx.closePath()
    ctx.fill()
    Z.drawSilhouette(ctx, S.hero, 742, 812, g, { mode: 'sway', sy: 2.0, sx: 2.0, color: '#05090c' })
    birds(ctx, g, 3, 400, 320)
  }
  if (showMall) {
    const k = 1 + 0.04 * ease(seg(g, EV_S3.reveal, EV_S3.reveal + 2))
    cam(ctx, k, 960, 560)
    ctx.drawImage(S.skyDusk, 0, 0)
    ctx.drawImage(S.mallExt.canvas, 0, 0)
    const me = S.mallExt
    ART.drawPole(ctx, me.poleX, me.poleY, 1, t)
    ART.glow(ctx, me.signRect.x + me.signRect.w / 2, me.signRect.y + 30, 0.55, { r: 220, color: SODIUM })
    if (g >= EV_S3.wave) {
      const wz = seg(g, EV_S3.wave, EV_S3.wave + 0.5)
      sprite(ctx, S.waver, me.roofSpot.x, me.roofSpot.y, { sy: 1.1, sx: 1.1, ...stand, alpha: wz })
      armWave(ctx, me.roofSpot.x, me.roofSpot.y - 74, t, 0)
    }
    ctx.restore()
  }
  if (dipA > 0) { ctx.fillStyle = `rgba(0,0,0,${dipA})`; ctx.fillRect(0, 0, W, H) }
  bars(ctx)
}

// ----- S4: the sanctuary -----
function fringeCover(g) {
  if (g >= EV_S5.turn) return 0
  if (g >= EV_S4.ringGrow) return lerp(0.55, 0.44, seg(g, EV_S4.ringGrow, EV_S4.ringGrow + 1.0))
  if (g >= EV_S4.spot) return lerp(1, 0.55, seg(g, EV_S4.spot, EV_S4.spot + 0.5))
  return 1
}
function castBlocked(ctx, g, t) {
  const mi = S.mallInt
  // the sink counter is furniture — always present (QA-B v2: it only showed in S5)
  ART.drawSink(ctx, mi.sinkX, GROUNDS.s4, 1)
  const gapU = ease(seg(g, EV_S4.gap, EV_S4.gap + 0.9))
  const cx = gapU > 0 && gapU < 1 ? lerp(640, 880, gapU) : (g < EV_S4.gap ? 640 : 880)
  const curlFeet = g > EV_S4.gap + 1 ? 880 : GROUNDS.s4
  sprite(ctx, S.curls, cx, curlFeet, { sy: 1.7, sx: 1.7, ...(gapU > 0.1 && gapU < 0.9 ? { lift: [3, 3], stride: [3, -3], lean: 0.22 } : stand), flip: g < EV_S4.gap })
  const permWalkU = ease(seg(g, EV_S4.permWalk, EV_S4.permWalk + 1.6))
  const px = lerp(1560, 1080, permWalkU)
  sprite(ctx, S.perm, px, GROUNDS.s4, { sy: 2.05, sx: 2.05, ...(permWalkU > 0 && permWalkU < 1 ? walkCyc(g * 6.5) : stand), flip: true })
  const permHead = crownY(S.perm, GROUNDS.s4, 2.05) + 4
  const glint = 1 - seg(g, EV_S4.glint, EV_S4.glint + 0.55)
  if (glint > 0 && glint <= 1) {
    const gx = px + 10, gy = permHead + 2
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * glint) + ')'
    ctx.lineWidth = 3
    for (const a of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
      const l = 26 * glint
      ctx.beginPath()
      ctx.moveTo(gx - Math.cos(a) * l, gy - Math.sin(a) * l)
      ctx.lineTo(gx + Math.cos(a) * l, gy + Math.sin(a) * l)
      ctx.stroke()
    }
  }
  const qU = ease(seg(g, EV_S4.quarantine, EV_S4.quarantine + 0.9))
  const fx = qU > 0 ? lerp(480, mi.chair3.x, qU) : 480 + (g > EV_S4.spot ? -26 * seg(g, EV_S4.spot, EV_S4.spot + 0.4) : 0)
  const fFeet = qU >= 1 ? 878 : GROUNDS.s4
  const seated = qU >= 1
  drawFringe(ctx, g, {
    x: fx, feet: fFeet, cover: fringeCover(g),
    pose: seated ? { lift: [2, 2], stride: [0, 0], lean: 0.06 } : (g > EV_S4.spot && g < EV_S4.quarantine ? { ...Z.zSway(g * 2), lean: 0.14 } : stand),
    flip: g > EV_S4.quarantine,
    hatOff: ease(seg(g, EV_S4.hatLift, EV_S4.hatOff)),
  })
  // CHAIR 3 is FURNITURE at a fixed spot, drawn OVER the seated rig so its body
  // reads IN the chair (QA-B v2). Footrest flipped away from the body so its
  // chrome slab never floats beside the seat (QA-C defect 2).
  if (seated || g > EV_S4.quarantine + 0.2) ART.drawChair(ctx, mi.chair3.x, 912, 1.05, 0, true)
  if (g >= EV_S4.inspect && g < EV_S4.permWalk - 0.2) {
    const mu = seg(g, EV_S4.inspect, EV_S4.inspect + 1.2)
    ART.drawMirrorPole(ctx, 560 + mu * 40, 905, 1, lerp(0.5, 0.2, mu))
  }
  for (let i = 0; i < 3; i++) {
    const tg = EV_S4.tosses[i]
    if (g < tg) continue
    const fl = seg(g, tg, tg + 0.75)
    if (fl < 1) {
      const toss = S.tosses[i]
      const x = lerp(toss.x0, toss.x1, fl)
      const y = lerp(toss.y0, toss.y1, fl) - Math.sin(fl * Math.PI) * 320
      ART.drawChair(ctx, x, y + 40, 0.9, toss.rot * fl, false)
    } else {
      ART.drawChair(ctx, 965 + (i - 1) * 46, 724, 0.9, -0.12 * (i - 1), false)
    }
  }
  const hu = ease(seg(g, EV_S4.in + 0.5, EV_S4.in + 2.2))
  drawHero(ctx, g, { x: lerp(1760, 1330, hu), feet: GROUNDS.s4, groundKey: 's4', pose: hu < 1 ? walkCyc(g * 7.5) : stand, flip: false })
  if (g >= EV_S4.clippersDown) ART.drawClippers(ctx, S.mallInt.sinkX, 800, 1, false, t)
}
function mallIntStage(ctx, t, night) {
  ctx.drawImage((night ? S.mallIntN : S.mallInt).canvas, 0, 0)
  ART.drawBallGleams(ctx, t, { a: night ? 0.16 : 0.08 })
}
DRAW['s4.int'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  mallIntStage(ctx, t, false)
  castBlocked(ctx, g, t)
  Z.hairFall(ctx, S.fall.fringeSpot, g, {})
  bars(ctx)
}
DRAW['s4.perm'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  mallIntStage(ctx, t, false)
  castBlocked(ctx, g, t)
  bars(ctx)
}
DRAW['s4.barricade'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  mallIntStage(ctx, t, false)
  castBlocked(ctx, g, t)
  dust(ctx, t, EV_S4.tosses.map((tg, i) => ({ g: tg + 0.75, x: 965 + (i - 1) * 46, y: 730, seed: 40 + i, n: 8, dur: 0.5 })))
  bars(ctx)
}
DRAW['s4.hat'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  mallIntStage(ctx, t, false)
  castBlocked(ctx, g, t)
  const wind = seg(g, EV_S4.gust, EV_S4.hatOff + 0.8)
  if (wind > 0 && wind < 1) {
    for (let i = 0; i < 12; i++) {
      const r1 = hash(i * 13 + 1), r2 = hash(i * 29 + 7)
      const x = ((r1 * 1900 + g * (320 + r2 * 260)) % 2200) - 140
      const y = 480 + r2 * 380 + Math.sin(g * 5 + i * 2.1) * 26
      ctx.globalAlpha = 0.65
      ctx.fillStyle = i % 2 ? '#6b5a34' : '#54603a'
      ctx.save(); ctx.translate(x, y); ctx.rotate(g * 6 + i)
      ctx.fillRect(-5, -2, 10, 4)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }
  Z.hairFall(ctx, S.fall.fringeSpot, g, {})
  bars(ctx)
}
DRAW['s4.chair3'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  mallIntStage(ctx, t, false)
  castBlocked(ctx, g, t)
  Z.hairFall(ctx, S.fall.fringeSpot, g, {})
  bars(ctx)
}
DRAW['s4.dusk'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  const me = S.mallExt
  ctx.drawImage(S.skyDusk, 0, 0)
  ctx.drawImage(me.canvas, 0, 0)
  ctx.fillStyle = 'rgba(10,18,28,0.42)'
  ctx.fillRect(0, 0, W, H)
  ART.glow(ctx, me.signRect.x + me.signRect.w / 2, me.signRect.y + 30, 0.5, { r: 240, color: SODIUM })
  ART.drawPole(ctx, me.poleX, me.poleY, 1, t)
  const arr = seg(g, EV_S4.arrive, EV_S4.press + 1.4)
  S.L_S4ARR.forEach((z, k) => {
    // z.i is a hash pick index (0..4095), NOT a spacing offset — enumerate for x
    const x = lerp(2020 + k * 28, 1160 + z.x * 260, arr)
    const feet = 930 + Z.ROW_DY[z.depth] * 0.7
    const sy = 1.7 - z.depth * 0.16
    Z.drawZombie(ctx, S.far[z.i % S.far.length], x, feet, g, { mode: 'walk', sy, sx: sy, flip: true, alpha: 1 - z.depth * 0.18, shadow: true })
  })
  const press = ease(seg(g, EV_S4.press, EV_S4.press + 0.5))
  if (press > 0) ART.drawPalmOnGlass(ctx, 1005, 660, 1, press, '#c9a07a')
  const flick = g > EV_S4.flicker ? (0.5 + 0.5 * Math.sin(t * 34)) * seg(g, EV_S4.flicker, EV_S4.flicker + 0.7) : 0
  if (flick > 0) {
    ctx.globalAlpha = 0.22 * flick
    ctx.fillStyle = '#dfeef2'
    ctx.fillRect(900, 470, 130, 210)
    ctx.globalAlpha = 1
  }
  bars(ctx)
}

// ----- S5: the siege -----
function siegeCast(ctx, g, t) {
  const mi = S.mallInt
  ART.drawSink(ctx, mi.sinkX, GROUNDS.s5, 1)
  if (g < EV_S5.doorSlam) sprite(ctx, S.curls, mi.sinkX, GROUNDS.s5 - 26, { sy: 1.45, sx: 1.45, ...stand, flip: true })
  const razorA = Math.sin(g * 6) * 0.3
  sprite(ctx, S.perm, mi.sinkX - 150, GROUNDS.s5, { sy: 2.05, sx: 2.05, ...(g > EV_S5.permLine ? { lift: [3, 0], stride: [2, -1], lean: 0.1 } : stand), flip: false })
  ART.drawRazor(ctx, mi.sinkX - 110, GROUNDS.s5 - 90, 1, -0.4 + razorA)
  const hesi = g >= EV_S5.hesitate && g < EV_S5.buzzPlug
  const buzz = g >= EV_S5.buzzPlug
  const tremble = hesi ? Math.sin(t * 30) * 0.02 : 0
  const heroX = buzz ? mi.chair3.x - 120 : 940
  drawHero(ctx, g, {
    x: heroX, feet: GROUNDS.s5, groundKey: 's5', pose: hesi ? { ...stand, lean: -0.12 } : stand,
    sword: 'hand', flip: false, rot: tremble,
    swordAng: hesi ? -1.75 + tremble * 3 : -0.5, swordGlint: hesi ? 0.6 : 0,
  })
  const passA = seg(g, EV_S5.buzzPass, EV_S5.buzzPass + 0.5)
  const passB = seg(g, EV_S5.buzzPass + 0.6, EV_S5.buzzPass + 1.1)
  drawFringe(ctx, g, {
    x: mi.chair3.x, feet: 878, cover: fringeCover(g),
    pose: { lift: [2, 2], stride: [0, 0], lean: 0.06 + (buzz ? 0.1 * Math.max(passA, passB) : 0) },
    flip: true,
  })
  // chair drawn OVER the seated rig — body reads seated in CHAIR 3
  ART.drawChair(ctx, mi.chair3.x, 912, 1.05, 0, true)
  if (buzz) {
    const clipX = mi.chair3.x + 26 - passA * 52 + passB * 44
    ART.drawClippers(ctx, clipX, 668, 1, true, t)
    if (passA > 0 && passA < 1) {
      ctx.strokeStyle = 'rgba(230,240,255,0.55)'
      ctx.lineWidth = 3
      for (const dy of [0, -6, -12]) {
        ctx.beginPath()
        ctx.moveTo(clipX - 18, 658 + dy)
        ctx.lineTo(clipX + 18, 652 + dy)
        ctx.stroke()
      }
    }
  }
  if (g >= EV_S5.smile) {
    const pu = seg(g, EV_S5.smile, EV_S5.smile + 0.6)
    if (pu < 1) {
      ctx.strokeStyle = 'rgba(202,162,122,0.85)'
      ctx.lineWidth = 4
      const px = mi.chair3.x + Math.sin(pu * Math.PI) * 16
      ctx.beginPath()
      ctx.arc(px, 742, 26, -2.4, -0.7)
      ctx.stroke()
    }
  }
  Z.hairFall(ctx, S.fall.fringeTurn, g, {})
}
// the outside mass, compressed into the door aperture so it reads THROUGH the
// glass (QA-B v2: interior-floor placement made them look already inside)
function outsideMass(ctx, g, unison) {
  for (const z of S.L_S5MASS) {
    const x = 770 + z.x * 380 + (unison ? Math.sin(g * 0.9 + z.depth) * 8 : 0)
    const feet = 688 - z.depth * 20
    const sy = 1.05 - z.depth * 0.08
    Z.drawZombie(ctx, S.far[z.i % S.far.length], x, feet, g, { mode: 'sway', sy, sx: sy, flip: true, alpha: 0.95 - z.depth * 0.15 })
  }
}
DRAW['s5.mass'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  mallIntStage(ctx, t, true)
  const mi = S.mallInt
  outsideMass(ctx, g, g > EV_S5.swayAll)
  ART.drawGlass(ctx, mi.doors, 0, {})
  siegeCast(ctx, g, t)
  bars(ctx)
}
DRAW['s5.spider'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  const [sx0, sy0] = shakeXY(t, g >= EV_S5.breach
    ? 15 * Math.exp(-(t - filmT(EV_S5.breach)) * 3)
    : 3 * Math.sin(g * 40) * seg(g, EV_S5.spider, EV_S5.breach))
  ctx.save()
  ctx.translate(sx0, sy0)
  mallIntStage(ctx, t, true)
  const mi = S.mallInt
  const crack = seg(g, EV_S5.spider, EV_S5.webGrow + 0.9)
  outsideMass(ctx, g, true)
  const p2 = ease(seg(g, EV_S5.palm, EV_S5.palm + 0.5))
  ART.drawPalmOnGlass(ctx, 1015, 668, 1.05, 0.7 + 0.3 * p2, '#bd9670')
  // the first palm from S4 dusk still presses at the other leaf (QA-B v2 P2)
  ART.drawPalmOnGlass(ctx, 905, 655, 0.92, 0.85, '#c9a07a')
  const bh = ease(seg(g, EV_S5.palm + 0.4, EV_S5.palm + 0.9))
  if (bh > 0) {
    ctx.globalAlpha = 0.9
    ctx.fillStyle = '#a97f5c'
    ctx.beginPath()
    ctx.ellipse(930, 690, 26 * bh + 8, 24 * bh + 6, 0, 0, 7)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  const broken = g >= EV_S5.breach
  if (!broken) ART.drawGlass(ctx, mi.doors, crack, { cx: 1015, cy: 668 })
  else {
    const age = (g - EV_S5.breach)      // g-aged: shards HANG through the freeze
    for (let i = 0; i < 6; i++) {
      const r1 = hash(i * 19 + 4), r2 = hash(i * 23 + 8)
      const cxp = lerp(840 + i * 50, 840 + i * 50 + (r1 - 0.5) * 140, Math.min(1, age))
      const cyp = lerp(560, 560 + 120 + r2 * 160, Math.min(1, age))
      const rot = (r2 - 0.5) * 2.4 * Math.min(1, age)
      ctx.save()
      ctx.translate(cxp, cyp)
      ctx.rotate(rot)
      ctx.fillStyle = 'rgba(190,215,225,0.28)'
      ctx.beginPath()
      ctx.moveTo(0, -34); ctx.lineTo(30, 12); ctx.lineTo(-26, 26)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = 'rgba(230,245,250,0.5)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
    }
  }
  siegeCast(ctx, g, t)
  dust(ctx, t, S.dustS5)
  ctx.restore()
  const fa = g >= EV_S5.breach ? Math.exp(-(t - filmT(EV_S5.breach)) * 8) * 0.4 : 0
  if (fa > 0.01) { ctx.fillStyle = `rgba(255,252,244,${fa})`; ctx.fillRect(0, 0, W, H) }
  bars(ctx)
}
DRAW['s5.flood'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  mallIntStage(ctx, t, true)
  const mi = S.mallInt
  // the breach: door OPENING reads open — dark outside in the aperture (QA-B v2 P0)
  ctx.fillStyle = '#0a1013'
  ctx.fillRect(mi.doors.x + 6, mi.doors.y + 8, mi.doors.w - 12, mi.doors.h - 8)
  ART.glow(ctx, 965, 700, 0.4, { r: 200, color: '#7d98a8' })
  ctx.strokeStyle = '#3a4046'; ctx.lineWidth = 6
  ctx.strokeRect(mi.doors.x, mi.doors.y, mi.doors.w, mi.doors.h)
  ctx.fillStyle = 'rgba(190,215,225,0.25)'
  for (let i = 0; i < 10; i++) {
    const r1 = hash(i * 31 + 3)
    ctx.beginPath()
    ctx.moveTo(860 + i * 22, 908)
    ctx.lineTo(866 + i * 22 + r1 * 10, 898)
    ctx.lineTo(874 + i * 22, 908)
    ctx.closePath()
    ctx.fill()
  }
  // slow-mo flood: the horde SWEEPS the floor by shot end (QA-C: undercount)
  const ls = (g - EV_S5.flood) * 0.7
  if (ls > 0) {
    for (const z of S.L_S5FLOOD) {
      const dir = z.x < 0.5 ? -1 : 1
      const spread = 40 + z.depth * 90 + (z.i % 4) * 60
      const x = 965 + dir * (26 + spread * ls * 2.6 + (z.i % 3) * 34 * ls)
      const feet = 906 + Z.ROW_DY[z.depth] * 0.8
      const sy = 1.9 - z.depth * 0.14
      Z.drawZombie(ctx, S.near[z.i % S.near.length], x, feet, g * 0.45, { mode: 'walk', sy, sx: sy, flip: dir < 0, shadow: true })
    }
  }
  // fluoro pools so the lit-mall-to-muzak image reads (night bake alone went dark)
  ART.glow(ctx, 700, 850, 0.35, { r: 260, color: '#cfe4ee' })
  ART.glow(ctx, 1230, 850, 0.35, { r: 260, color: '#cfe4ee' })
  siegeCast(ctx, g, t)
  ART.glow(ctx, mi.ballX, mi.ballY, 0.5, { r: 130, color: '#cfe4ee' })
  bars(ctx)
}
DRAW['s5.hallway'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  const u = seg(g, 76.0, 81.5)
  const cxp = lerp(700, 1330, ease(u))
  cam(ctx, 1.28, cxp, 575)
  mallIntStage(ctx, t, true)
  S.P_HALL.forEach((pi, i) => {
    const wave = Math.floor(i / 3)
    const st = EV_S5.strikes[wave]
    const g0 = 76.2 + wave * 1.6 + (i % 3) * 0.28
    if (g < g0) return
    const x = 1560 - (g - g0) * 55
    if (g > st + 0.1 && i % 3 === 1) sprite(ctx, S.near[pi], x - 40, 906, { sy: 1.9, sx: 1.9, ...Z.zWalk(0), flip: true, rot: 1.5 })
    else Z.drawZombie(ctx, S.near[pi], x, 906, g, { mode: 'walk', sy: 1.9, sx: 1.9, flip: true, shadow: true })
  })
  // hero stays screen-fixed under the pan: world x rides the camera centre
  const heroWX = cxp - 200
  drawHero(ctx, g, { x: heroWX, feet: GROUNDS.s5, groundKey: 's5', pose: walkCyc(g * 9), sword: 'hand', flip: false, duffel: false })
  EV_S5.strikes.forEach((st, i) => {
    const sw = seg(g, st, st + 0.26)
    if (sw > 0 && sw < 1.25) swordArc(ctx, heroWX, 800, 96, -2.0 - i * 0.2, 0.7, sw)
  })
  ctx.restore()
  bars(ctx)
}
DRAW['s5.buzz'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  if (g >= EV_S5.doorSlam) {
    ctx.fillStyle = '#06090b'
    ctx.fillRect(0, 0, W, H)
    const closeU = ease(seg(g, EV_S5.doorSlam, EV_S5.doorSlam + 0.16))
  ctx.save()
  ctx.translate(760, 540)
  ctx.rotate((1 - closeU) * -0.5)
  ctx.fillStyle = '#12161a'
  ctx.fillRect(-160, -300, 320, 600)
  ctx.strokeStyle = '#232a30'; ctx.lineWidth = 6
  ctx.strokeRect(-160, -300, 320, 600)
  ctx.restore()
  // the crack: the LIT mall glows beyond the door, silhouettes press through it
  ctx.save()
  ctx.beginPath()
  ctx.rect(748, 260, 30 + closeU * 8, 560)
  ctx.clip()
  const glowG = ctx.createLinearGradient(0, 260, 0, 820)
  glowG.addColorStop(0, '#8a6f4a')
  glowG.addColorStop(0.5, '#c9a97a')
  glowG.addColorStop(1, '#6f5738')
  ctx.fillStyle = glowG
  ctx.fillRect(748, 260, 40, 560)
  for (const z of S.L_S5MASS) {
    const x = 560 + z.x * 760
    const feet = 920 + Z.ROW_DY[z.depth] * 0.4
    Z.drawSilhouette(ctx, S.far[z.i % S.far.length], x, feet, g, { mode: 'sway', sy: 1.2, sx: 1.2, flip: true, color: '#171008' })
  }
  ctx.restore()
  bars(ctx)
  return
  }
  mallIntStage(ctx, t, true)
  siegeCast(ctx, g, t)
  bars(ctx)
}

// ----- S6: dawn -----
DRAW['s6.roof'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  ctx.drawImage(S.skyNight, 0, 0)
  ctx.drawImage(S.roof.canvas, 0, 0)
  const rf = S.roof
  const dawn = ease(seg(g, EV_S6.roof, EV_S6.away))
  if (dawn > 0) {
    ctx.globalAlpha = dawn * 0.5
    ART.glow(ctx, 1560, 780, dawn, { r: 380, color: '#ff9a5e' })
    ctx.globalAlpha = 1
  }
  drawHero(ctx, g, { x: 1100, feet: rf.parapetY + 6, groundKey: 's6', pose: g > EV_S6.thump ? { ...stand, lean: 0.05 } : stand, flip: false })
  if (g > EV_S6.thump) {
    const pl = 0.4 + 0.6 * Math.abs(Math.sin(t * 11))
    ctx.globalAlpha = 0.1 * pl * seg(g, EV_S6.thump, EV_S6.chopper)
    ctx.fillStyle = '#cfe0ea'
    ctx.fillRect(0, rf.parapetY - 140, W, 160)
    ctx.globalAlpha = 1
  }
  bars(ctx)
}
DRAW['s6.lift'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  ctx.drawImage(S.skyNight, 0, 0)
  const dawn = ease(seg(g, EV_S6.chopper, EV_S6.away))
  if (dawn > 0) {
    ctx.globalAlpha = dawn * 0.65
    ctx.drawImage(S.skyDawn, 0, 0)
    ctx.globalAlpha = 1
  }
  ctx.drawImage(S.roof.canvas, 0, 0)
  const rf = S.roof
  const desc = ease(seg(g, EV_S6.chopper, EV_S6.liftLines))
  const chX = 1430, chY = lerp(120, 560, desc)
  ART.drawChopper(ctx, chX, chY, 0.92, t, { light: true })
  const lineU = seg(g, EV_S6.liftLines, EV_S6.liftLines + 0.4)
  if (lineU > 0) {
    const hoist1 = ease(seg(g, EV_S6.hoist - 0.6, EV_S6.hoist + 0.4))
    const hoist2 = ease(seg(g, EV_S6.hoist, EV_S6.hoist + 1.0))
    const py = lerp(rf.parapetY - 8, chY + 150, hoist1)
    const cy2 = lerp(rf.parapetY - 8, chY + 150, hoist2)
    // figures first, harness lines IN FRONT ending exactly at their feet (QA-C:
    // lines behind the sprite read as attached at the neck)
    sprite(ctx, S.perm, 1330, py, { sy: 1.35, sx: 1.35, ...stand })
    sprite(ctx, S.curls, 1500, cy2, { sy: 1.2, sx: 1.2, ...stand })
    for (const [lx, ly] of [[1330, py], [1500, cy2]]) {
      ctx.strokeStyle = 'rgba(210,220,226,0.85)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(chX - 6, chY + 34)
      ctx.lineTo(lx, ly)
      if (ly > rf.parapetY - 40) { ctx.lineTo(lx, rf.parapetY - 8) }
      ctx.stroke()
    }
    if (hoist2 > 0.3 && hoist2 < 1) armWave(ctx, 1500, cy2 - 96, t, 1.5)
  }
  drawHero(ctx, g, { x: 1100, feet: rf.parapetY + 6, groundKey: 's6', pose: stand, flip: false })
  bars(ctx)
}
DRAW['s6.lookback'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  ctx.drawImage(S.skyNight, 0, 0)
  const dawn = ease(seg(g, EV_S6.lookback, EV_S6.board + 0.8))
  ctx.globalAlpha = Math.max(0, dawn)
  ctx.drawImage(S.skyDawn, 0, 0)
  ctx.globalAlpha = 1
  ctx.drawImage(S.roof.canvas, 0, 0)
  const rf = S.roof
  const me = S.mallExt
  ctx.save()
  ctx.translate(1060, 760)
  ctx.scale(0.34, 0.34)
  ctx.globalAlpha = 0.9
  ctx.drawImage(me.canvas, -960, -260)
  ctx.restore()
  // tiny crowd below: varied sizes/facing so it reads as a mass, not a tiled row
  for (const z of S.L_S6BELOW) {
    const x = 800 + z.x * 480
    const feet = 880 + Z.ROW_DY[z.depth] * 0.3 + (hash(z.i * 3) - 0.5) * 12
    const sy = 0.5 + hash(z.i * 7) * 0.18
    Z.drawSilhouette(ctx, S.far[z.i % S.far.length], x, feet, g, { mode: 'sway', sy, sx: sy, flip: hash(z.i * 11) < 0.5, color: '#101820', alpha: 0.7 + hash(z.i * 13) * 0.3 })
  }
  const heroX = 1240
  const boardU = ease(seg(g, EV_S6.board, EV_S6.board + 0.6))
  if (boardU < 1) {
    drawHero(ctx, g, { x: heroX, feet: rf.parapetY + 6, groundKey: 's6', pose: stand, flip: true })
    const sal = seg(g, EV_S6.salute, EV_S6.salute + 0.5)
    drawSword(ctx, heroX - 10, rf.parapetY - 84, lerp(-2.6, -1.5708, ease(sal)), 58)
  } else {
    ctx.strokeStyle = 'rgba(210,220,226,0.8)'
    ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(1440, 470); ctx.lineTo(1320, rf.parapetY - 8); ctx.stroke()
    drawHero(ctx, g, { x: 1350, feet: 660, groundKey: 's6', pose: { lift: [4, 0], stride: [2, -2], lean: 0.2 }, flip: false })
  }
  ART.drawChopper(ctx, 1440, 470, 0.85, t, { light: false })
  bars(ctx)
}
DRAW['s6.away'] = (ctx, lt, dur, t) => {
  const g = warp(t).g
  ctx.drawImage(S.skyDawn, 0, 0)
  ART.glow(ctx, 1520, 745, 0.8, { r: 300, color: '#ffd9a0' })
  const u = ease(seg(g, EV_S6.away, EV_S6.card + 1.2))
  const cxp = lerp(1400, 1548, u)
  const cyp = lerp(500, 712, u)
  const chS = lerp(0.85, 0.55, u)
  ART.drawChopper(ctx, cxp, cyp, chS, t, { bank: 0.18, light: false })
  // survivors hang far below the skid, clearly smaller than the machine (QA-C:
  // full-size figures read as giants riding a toy chopper)
  const pX = cxp - 30 * chS, cX2 = cxp + 28 * chS
  const pY = cyp + 105 * chS, cY2 = cyp + 110 * chS
  ctx.strokeStyle = 'rgba(210,220,226,0.8)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(cxp - 8 * chS, cyp + 26 * chS); ctx.lineTo(pX, pY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cxp + 8 * chS, cyp + 26 * chS); ctx.lineTo(cX2, cY2); ctx.stroke()
  sprite(ctx, S.perm, pX, pY, { sy: chS * 0.78, sx: chS * 0.78, ...stand, alpha: 0.92 })
  sprite(ctx, S.curls, cX2, cY2, { sy: chS * 0.7, sx: chS * 0.7, ...stand, alpha: 0.92 })
  birds(ctx, g, 3, 200, 260)
  const dip = seg(g, 99.15, 99.62)
  if (dip > 0) { ctx.fillStyle = `rgba(0,0,0,${dip})`; ctx.fillRect(0, 0, W, H) }
  bars(ctx)
}

// ---------- per-shot post fx (restrained; bloom on practicals, grain night/CRT) ----------
const FXQ = {
  's1.static': { grain: 0.03 }, 's1.anchor': { grain: 0.022 }, 's1.map': { grain: 0.022 },
  's1.recede': { grain: 0.024 }, 's1.degrade': { grain: 0.035 },
  'title.ridge': { grain: 0.014, bloom: 0.1, bloomThresh: 0.88 },
  's2.yard': { grain: 0.013 }, 's2.friend': { grain: 0.014, bloom: 0.06, bloomThresh: 0.9 },
  's2.press': { grain: 0.013 }, 's2.garage': { grain: 0.013 },
  's3.wide': { grain: 0.012, bloom: 0.06, bloomThresh: 0.9 },
  's3.rise': { grain: 0.013 }, 's3.run': { grain: 0.015 },
  's3.hill': { grain: 0.013, bloom: 0.12, bloomThresh: 0.86 },
  's4.int': { grain: 0.012, bloom: 0.08, bloomThresh: 0.88 }, 's4.perm': { grain: 0.012, bloom: 0.08, bloomThresh: 0.88 },
  's4.barricade': { grain: 0.012 }, 's4.hat': { grain: 0.013 },
  's4.chair3': { grain: 0.014, bloom: 0.05, bloomThresh: 0.9 }, 's4.dusk': { grain: 0.014, bloom: 0.1, bloomThresh: 0.86 },
  's5.mass': { grain: 0.016, bloom: 0.1, bloomThresh: 0.87 }, 's5.spider': { grain: 0.017, bloom: 0.1, bloomThresh: 0.87 },
  's5.flood': { grain: 0.016, bloom: 0.14, bloomThresh: 0.84 },
  's5.hallway': { grain: 0.016, bloom: 0.1, bloomThresh: 0.87 }, 's5.buzz': { grain: 0.017, bloom: 0.08, bloomThresh: 0.88 },
  's6.roof': { grain: 0.014, bloom: 0.08, bloomThresh: 0.88 }, 's6.lift': { grain: 0.013, bloom: 0.1, bloomThresh: 0.86 },
  's6.lookback': { grain: 0.013, bloom: 0.12, bloomThresh: 0.84 }, 's6.away': { grain: 0.012, bloom: 0.14, bloomThresh: 0.82 },
}

// ---------- prepare ----------
async function prepare() {
  S.hero = await A.loadRemy(CAST.HERO, false)
  S.fringe = await A.loadRemy(CAST.FRINGE, false)
  S.curls = await A.loadRemy(CAST.CURLS, false)
  S.perm = await A.loadRemy(CAST.PERM, false)
  S.friend = await A.loadRemy(CAST.FRIEND, false)
  // on-set anchor = BALD base + hair cap (ANCHOR 392 is hairy; stacking a cap on real
  // hair read as a pre-shed patch — QA-A v2). The framed desk portrait keeps the real
  // 392 original. Navy-tee horde id reads "news desk" against the dark set.
  S.anchorRig = await A.loadRemy(CAST.HORDE_NEAR[7], false)
  S.waver = await A.loadRemy(CAST.CURLS, true)
  S.near = await Promise.all(CAST.HORDE_NEAR.map((i) => A.loadRemy(i, false)))
  S.far = await Promise.all(CAST.HORDE_FAR.map((i) => A.loadRemy(i, true)))
  const rows = await (await fetch(new URL('../../media/quest/art.json', import.meta.url))).json()
  const hx = (id) => '#' + rows.rows[id][1]
  S.fringeHair = hx(CAST.FRINGE)
  S.friendHair = hx(CAST.FRIEND)
  S.anchorHair = hx(CAST.ANCHOR)
  S.skyDusk = ART.bakeSkyDusk()
  S.skyNight = ART.bakeSkyNight()
  S.skyDawn = ART.bakeSkyDawn()
  S.ridge = ART.bakeRidge()
  S.yard = ART.bakeYard()
  S.news = ART.bakeNewsSet()
  S.newsMap = ART.bakeNewsMap()
  S.highway = ART.bakeHighway()
  S.mallExt = ART.bakeMallExt()
  S.mallInt = ART.bakeMallInt('evening')
  S.mallIntN = ART.bakeMallInt('night')
  S.roof = ART.bakeRooftop()
  const heads = await A.loadHeads()
  S.headIcons = {}
  for (const id of [CAST.HORDE_NEAR[0], CAST.HORDE_NEAR[3]]) S.headIcons[id] = A.headIcon(heads, id, 9)
  const img = new Image()
  img.src = new URL('../../media/remy/Character' + CAST.ANCHOR + '.webp', import.meta.url).href
  await img.decode()
  S.anchorImg = img
  const mc = document.createElement('canvas')
  const mx = mc.getContext('2d')
  mx.font = `24px ${F.grot}`
  S.tickerW = mx.measureText(DRAWN.ticker).width + 120
  S.L_TITLE = Z.layout(7, HORDE.titleRidge.n, -220, 2140, HORDE.titleRidge.rows)
  S.L_S4ARR = Z.layout(19, HORDE.s4arrive.n, 0, 1, HORDE.s4arrive.rows)
  S.L_S5MASS = Z.layout(23, HORDE.s5mass.n, 0, 1, HORDE.s5mass.rows)
  S.L_S5FLOOD = Z.layout(29, HORDE.s5flood.n, 0, 1, HORDE.s5flood.rows)
  S.L_S6BELOW = Z.layout(41, HORDE.s6below.n, 0, 1, HORDE.s6below.rows)
  S.P_HEDGE = [0, 3, 6]
  S.P_RISE = [1, 2, 4, 5, 7, 8, 9, 10, 11, 0, 3, 6]
  S.P_HALL = [2, 5, 8, 1, 4, 7, 0, 6, 9]
  S.P_DOOR = [10, 11]
  const friendHead = crownY(S.friend, S2C.friendFeet, S2C.friendSy) + 4
  const fringeSitHead = crownY(S.fringe, 878, 2.15) + 4
  S.fall = {
    friend: [{ g: EV_S2.shed, x: S2C.friendX, y: friendHead, seed: 5, n: 90, dur: 2.8, color: S.friendHair }],
    anchor: [{ g: EV_S1.recede, x: 880, y: crownY(S.anchorRig, S.news.deskY + 46, 2.55) + 3, seed: 8, n: 30, dur: 1.8, color: S.anchorHair }],
    fringeSpot: [{ g: EV_S4.spot, x: 480, y: crownY(S.fringe, GROUNDS.s4, 2.15) + 4, seed: 12, n: 26, dur: 1.4, color: S.fringeHair }],
    fringeTurn: [{ g: EV_S5.turn, x: S.mallInt.chair3.x, y: fringeSitHead, seed: 15, n: 200, dur: 2.6, color: S.fringeHair }],
  }
  S.tosses = EV_S4.tosses.map((tg, i) => ({ g: tg, x0: 560 + i * 36, x1: 965 + (i - 1) * 46, y0: 905, y1: 724, rot: (i % 2 ? 1 : -1) * (0.9 + i * 0.4) }))
  S.dustS3 = [
    { g: EV_S3.tackle, x: 1560, y: 870, seed: 21, n: 22, dur: 1.1 },
    { g: EV_S3.clear, x: 980, y: 900, seed: 22, n: 12, dur: 0.7 },
  ]
  S.dustS5 = [{ g: EV_S5.breach, x: 965, y: 660, seed: 25, n: 26, dur: 1.2 }]
  const win = S.yard.window
  S2C.boardRects = [
    { x: win.x + 8, y: win.y + 26, w: win.w - 16, h: 26, r: -0.05 },
    { x: win.x + 14, y: win.y + win.h * 0.52, w: win.w - 28, h: 26, r: 0.07 },
    { x: win.x + 4, y: win.y + win.h - 46, w: win.w + 4, h: 26, r: -0.03 },
  ]
}

// ---------- the film ----------
export default {
  title: 'DAWN OF THE BALD',
  output: 'dawn-of-the-bald.mp4',
  duration: DURATION,
  prepare,
  shots: SHOTS.map((s) => ({
    ...s,
    draw: DRAW[s.name],
    fx: () => (FXQ[s.name] ?? { grain: 0.013 }),
  })),
  captions: CAPS.map((c) => ({
    id: c.id, text: c.text, t0: c.t0, t1: c.t1, y: c.y,
    anim: c.anim ?? 'fade',
    ...(c.in !== undefined ? { in: c.in } : {}),
    ...(c.out !== undefined ? { out: c.out } : {}),
    ...(c.style === 'title'
      ? { size: 122, font: F.anton, color: BLOOD, track: 12 }
      : { size: 30, font: F.serif, color: BONE, track: 5, weight: 600 }),
  })),
  score,
  audio: { seed: 1978, reverb: 1.35, reverbGain: 0.26 },
}
