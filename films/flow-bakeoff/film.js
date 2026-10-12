// THE GREAT FLOW BAKE-OFF · a Remy Boys baking championship · 84 s · 1920×1080 @60.
// A daytime-TV bake-off tent in Flowshire. Hero 109 "Crimson Flow" bakes a
// showstopper for grumpy Cabald head judge 452 "Midnight Soul": a golden
// bread bust of the judge — WITH braided hair. Payoff: THE HANDSHAKE.
// Cast QA'd on contact sheets (output/_casting/): 109 clean cream shirt,
// 452 tux + cards (kept out of crops), 4/24 clean, 30 glam host. Pixel stage
// 1056×600 with 960×540 view → 2× nearest; three picture freezes at 28/43/63.
import { W, H, E, seg, lerp, clamp, hash, txt, measure, F } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'
import * as TL from './timeline.js'
import * as ART from './art.js'
import score from './score.js'

let S = null
const EV = TL.EV
const GW = TL.GW
const GWT = TL.GWT
const T = TL.T
const LAY = () => ART.LAY
const C = TL.CAST

// ---------- stage plumbing ----------
function low() {
  const x = S.low.getContext('2d')
  x.setTransform(1, 0, 0, 1, 0, 0)
  x.imageSmoothingEnabled = false
  x.globalAlpha = 1
  return x
}

function blit(ctx, cam) {
  const sw = clamp(ART.VW / cam.z, 100, ART.LW)
  const sh = clamp(ART.VH / cam.z, 100, ART.LH)
  const sx = clamp(ART.VX + cam.x - sw / 2, 0, ART.LW - sw)
  const sy = clamp(ART.VY + cam.y - sh / 2, 0, ART.LH - sh)
  ctx.fillStyle = '#181310'
  ctx.fillRect(0, 0, W, H)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(S.low, Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh), Math.round(cam.dx || 0), Math.round(cam.dy || 0), W, H)
}

// Keyframe camera: each key eases in over 0.45 s from the previous key.
function camPath(keys, t) {
  let val = { x: keys[0].x, y: keys[0].y, z: keys[0].z }
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i]
    const p = keys[i - 1]
    const u = E.inOutCubic(seg(t, k.t, k.t + 0.45))
    val = { x: lerp(p.x, k.x, u), y: lerp(p.y, k.y, u), z: lerp(p.z, k.z, u) }
    if (t < k.t + 0.45) break
  }
  return val
}

function shakeOf(t, list) {
  let dx = 0
  let dy = 0
  for (const [t0, amp, dur] of list) {
    const d = t - t0
    if (d >= 0 && d < dur) {
      const a = amp * Math.exp(-d * 11)
      dx += (hash(Math.floor(t * 240) * 2 + 11) - 0.5) * 2 * a
      dy += (hash(Math.floor(t * 240) * 2 + 12) - 0.5) * 2 * a
    }
  }
  return { dx, dy }
}

// Actor helper: planted shadow + rig draw, integer positions.
function actor(x, who, px, feet, o = {}) {
  const s = o.s ?? 1.62
  px = Math.round(px)
  feet = Math.round(feet - (o.bob ?? 0))
  x.fillStyle = 'rgba(46,30,18,0.30)'
  x.beginPath()
  x.ellipse(px, feet + 2, 26 * s, 4.4 * s, 0, 0, 7)
  x.fill()
  A.drawRemy(x, S.rig[who], px, feet, { sx: s, sy: s, ...o, s: undefined, bob: undefined })
}

const walkC = (dist, speed = 1) => {
  const ph = Math.sin(dist / 24 * Math.PI * 2 * speed)
  return { lift: [Math.max(0, ph) * 3, Math.max(0, -ph) * 3], stride: [ph * 2.2, -ph * 2.2], lean: 0.05 }
}
const idleC = (t, ph = 0, s = 1.35) => ({ bob: Math.sin(t * s + ph) * 1.4, lean: 0.012 * Math.sin(t * 1.1 + ph) })

// piecewise walk: u 0..1 eased along [a,b]
function walkX(g, a, b, from, to) {
  const u = E.inOutCubic(seg(g, a, b))
  return { px: lerp(from, to, u), u, dist: Math.abs(to - from) * u }
}

// ---------- small inline props ----------
function cueCard(x, cx, cy, tilt) {
  x.save()
  x.translate(Math.round(cx), Math.round(cy))
  x.rotate(tilt)
  x.fillStyle = '#3a2e26'
  x.fillRect(-19, -25, 38, 50)
  x.fillStyle = '#f6efdd'
  x.fillRect(-16, -22, 32, 44)
  x.fillStyle = '#b9a88a'
  for (let i = 0; i < 3; i++) x.fillRect(-11, -14 + i * 9, 22 - i * 4, 3)
  x.restore()
}

function bigKnife(x, cx, cy, ang, flash) {
  x.save()
  x.translate(Math.round(cx), Math.round(cy))
  x.rotate(ang)
  if (flash) { x.shadowColor = '#fff8e0'; x.shadowBlur = 14 }
  x.fillStyle = '#3a2e26'
  x.fillRect(-26, -4, 16, 8) // handle
  x.fillStyle = '#cfd6dd'
  x.beginPath()
  x.moveTo(-10, -4)
  x.lineTo(20, -4)
  x.lineTo(30, 2)
  x.lineTo(-10, 4)
  x.closePath()
  x.fill()
  x.fillStyle = '#eef2f6'
  x.fillRect(-10, -4, 12, 2)
  x.restore()
}

function podiumTable(x) {
  const p = LAY().podium
  const px = p.x
  const py = p.y
  x.fillStyle = 'rgba(46,30,18,0.30)'
  x.beginPath()
  x.ellipse(px, py + 2, 34, 5, 0, 0, 7)
  x.fill()
  x.fillStyle = '#8a5a3a'
  x.fillRect(px - 4, py - 26, 8, 26)
  x.fillStyle = '#a8764f'
  x.beginPath()
  x.ellipse(px, py - 28, 36, 11, 0, 0, 7)
  x.fill()
  x.fillStyle = '#c08d61'
  x.beginPath()
  x.ellipse(px, py - 30, 34, 9, 0, 0, 7)
  x.fill()
}

function plate(x, cx, cy) {
  x.fillStyle = '#3a2e26'
  x.beginPath()
  x.ellipse(cx, cy + 2, 26, 7, 0, 0, 7)
  x.fill()
  x.fillStyle = '#eef0ec'
  x.beginPath()
  x.ellipse(cx, cy, 24, 6, 0, 0, 7)
  x.fill()
}

function steam(x, cx, cy, t0, t) {
  const age = t - t0
  if (age < 0) return
  for (let i = 0; i < 3; i++) {
    const a = age - i * 0.5
    if (a < 0 || a > 2.4) continue
    const yy = cy - a * 14
    const xx = cx + Math.sin(a * 3 + i * 2.1) * 5
    const al = clamp(1 - a / 2.4) * 0.5
    x.fillStyle = `rgba(250,246,238,${al.toFixed(3)})`
    x.beginPath()
    x.arc(xx, yy, 3.4 - a * 0.7, 0, 7)
    x.fill()
  }
}

function dustRing(x, t0, t, cx, cy, col = 'rgba(120,90,60,') {
  const d = t - t0
  if (d < 0 || d > 0.5) return
  const r = 6 + d * 34
  x.strokeStyle = col + (0.5 * (1 - d / 0.5)).toFixed(3) + ')'
  x.lineWidth = 2
  x.beginPath()
  x.ellipse(cx, cy, r, r * 0.45, 0, 0, 7)
  x.stroke()
}

function butterCrumbs(x, t0, t, cx, cy) {
  const age = t - t0
  if (age < 0 || age > 0.8) return
  for (let i = 0; i < 5; i++) {
    const h1 = hash(i * 37 + 5)
    const vx = (h1 - 0.5) * 90
    const vy = -60 - hash(i * 91 + 2) * 50
    const px = cx + vx * age
    const py = cy + vy * age + 130 * age * age
    x.fillStyle = '#f2c744'
    x.fillRect(Math.round(px), Math.round(py), 3, 3)
  }
}

// The clasp: hero hand from the left, judge hand from the right.
function handsClasp(x, cx, cy, u, pump, heroSkin, judgeSkin) {
  const gap = lerp(40, 0, clamp(u))
  const dy = Math.sin(pump * Math.PI * 2) * 2.5 * (pump > 0 ? 1 : 0)
  const hand = (skin, flip) => {
    x.save()
    x.translate(Math.round(cx + (flip ? gap / 2 : -gap / 2)), Math.round(cy + dy))
    if (flip) x.scale(-1, 1)
    x.fillStyle = '#3a2e26'
    x.fillRect(-20, -13, 40, 21)
    x.fillStyle = skin
    x.beginPath()
    x.roundRect(-17, -11, 34, 16, 6)
    x.fill()
    x.fillStyle = '#3a2e26'
    for (let i = 0; i < 3; i++) x.fillRect(-11 + i * 9, -11, 3, 11)
    x.restore()
  }
  hand(heroSkin, false)
  hand(judgeSkin, true)
}

// ---------- full-res inserts (framed ECU over dimmed stage) ----------
function drawInsert(ctx, t, ins) {
  const u = seg(t, ins.t0, ins.t0 + 0.5)
  const pin = E.outCubic(u)
  const img = ins.smile ? S.portraitSmile : S.portrait[C[ins.who].id]
  const pc = ART.PCROP[C[ins.who].id]
  ctx.fillStyle = 'rgba(24,16,10,0.55)'
  ctx.fillRect(0, 0, W, H)
  const R = 356
  const cx = W / 2
  const cy = 470
  // spotlight
  const g = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.9)
  g.addColorStop(0, 'rgba(255,240,210,0.20)')
  g.addColorStop(1, 'rgba(255,240,210,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // portrait disc
  const sway = Math.sin((t - ins.t0) * 2.2) * 7 * (1 - pin)
  const k = (ins.zoom ?? 1.5) * (1 + 0.14 * pin)
  ctx.save()
  ctx.translate(cx + sway, cy)
  ctx.scale(k, k)
  ctx.beginPath()
  ctx.arc(0, 0, 236, 0, 7)
  ctx.clip()
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(img, pc.cx - pc.r, pc.cy - pc.r, pc.r * 2, pc.r * 2, -236, -236, 472, 472)
  ctx.restore()
  // gold double frame
  ctx.lineWidth = 14
  ctx.strokeStyle = '#8a5a3a'
  ctx.beginPath()
  ctx.arc(cx + sway, cy, 244, 0, 7)
  ctx.stroke()
  ctx.lineWidth = 5
  ctx.strokeStyle = '#f2c744'
  ctx.beginPath()
  ctx.arc(cx + sway, cy, 252, 0, 7)
  ctx.stroke()
  // name plate
  const label = `JUDGE · ${C[ins.who].name}`
  const lw = measure(ctx, label, 30, F.mono, 6, 700)
  ctx.fillStyle = '#3a2e26'
  ctx.beginPath()
  ctx.roundRect(cx - lw / 2 - 22, cy + 214, lw + 44, 46, 8)
  ctx.fill()
  ctx.strokeStyle = '#f2c744'
  ctx.lineWidth = 3
  ctx.stroke()
  txt(ctx, label, cx, cy + 244, { size: 30, font: F.mono, weight: 700, track: 6, color: '#f6efdd', align: 'center', base: 'middle' })
  if (ins.sweat) {
    const d = seg(t, ins.t0 + 1.2, ins.t0 + 2.3)
    if (d > 0 && d < 1) {
      ctx.fillStyle = 'rgba(190,225,240,0.85)'
      ctx.beginPath()
      ctx.ellipse(cx + 150, cy - 60 + d * 90, 5, 9, 0, 0, 7)
      ctx.fill()
    }
  }
}

// ---------- title & slate cards (full-res) ----------
function buntingRow(ctx, y, n, t, seedOff) {
  const cols = ['#9db89a', '#e8b7b0', '#f2c744', '#d8cbb2']
  for (let i = 0; i < n; i++) {
    const bx = (W / (n - 1)) * i
    const sway = Math.sin(t * 1.4 + i * 0.9 + seedOff) * 4
    const c = cols[(i + seedOff) % 4]
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.moveTo(bx - 26, y)
    ctx.lineTo(bx + 26, y)
    ctx.lineTo(bx + sway, y + 44)
    ctx.closePath()
    ctx.fill()
  }
  ctx.strokeStyle = '#3a2e26'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.quadraticCurveTo(W / 2, y + 18, W, y)
  ctx.stroke()
}

function sprinkles(ctx, t, n = 46) {
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 53 + 3)
    const h2 = hash(i * 71 + 9)
    const spd = 40 + h2 * 70
    const yy = ((h1 * H + t * spd) % (H + 40)) - 20
    const xx = (h2 * W + Math.sin(t + i) * 18) % W
    const cols = ['#9db89a', '#e8b7b0', '#f2c744', '#c08d61']
    ctx.fillStyle = cols[i % 4]
    ctx.save()
    ctx.translate(xx, yy)
    ctx.rotate(h2 * 6 + t * (h1 - 0.5) * 2)
    ctx.fillRect(-5, -2, 10, 4)
    ctx.restore()
  }
}

function drawTitles(ctx, t) {
  ctx.fillStyle = '#f3ead8'
  ctx.fillRect(0, 0, W, H)
  sprinkles(ctx, t, 40)
  buntingRow(ctx, 120, 9, t, 0)
  buntingRow(ctx, H - 6, 9, t, 2)
  ctx.strokeStyle = '#9db89a'
  ctx.lineWidth = 10
  ctx.strokeRect(48, 48, W - 96, H - 96)
  ctx.strokeStyle = '#3a2e26'
  ctx.lineWidth = 3
  ctx.strokeRect(66, 66, W - 132, H - 132)
  const p = seg(t, EV.titleSlam, EV.titleSlam + 0.5)
  if (p > 0) {
    const q = E.outBack(clamp(p))
    ctx.save()
    ctx.translate(W / 2, 420)
    ctx.scale(lerp(1.7, 1, q), lerp(1.7, 1, q))
    ctx.globalAlpha *= clamp(p * 5)
    txt(ctx, 'THE GREAT', 0, -190, { size: 62, font: F.mono, weight: 700, track: 26, color: '#8a5a3a', align: 'center', base: 'middle' })
    txt(ctx, 'FLOW BAKE-OFF', 0, -20, { size: 188, font: F.anton, color: '#3a2e26', align: 'center', base: 'middle', track: 2, glow: '#f2c744', glowBlur: 2 })
    ctx.restore()
  }
  const p2 = seg(t, EV.titleSlam + 0.5, EV.titleSlam + 1.0)
  if (p2 > 0) {
    ctx.globalAlpha = clamp(p2 * 3)
    txt(ctx, TL.SUBTITLE, W / 2, 590, { size: 44, font: F.mono, weight: 700, track: 10, color: '#8a5a3a', align: 'center', base: 'middle' })
    ctx.globalAlpha = 1
  }
  // episode chip
  const p3 = seg(t, EV.titleSlam + 0.9, EV.titleSlam + 1.3)
  if (p3 > 0) {
    const cw = measure(ctx, TL.EPISODE, 40, F.mono, 8, 700) + 76
    ctx.save()
    ctx.translate(W / 2, 760)
    ctx.rotate(-0.02)
    ctx.globalAlpha = clamp(p3 * 3)
    ctx.fillStyle = '#3a2e26'
    ctx.beginPath()
    ctx.roundRect(-cw / 2, -38, cw, 76, 10)
    ctx.fill()
    ctx.strokeStyle = '#f2c744'
    ctx.lineWidth = 4
    ctx.stroke()
    txt(ctx, TL.EPISODE, 0, 2, { size: 40, font: F.mono, weight: 700, track: 8, color: '#f6efdd', align: 'center', base: 'middle' })
    ctx.restore()
  }
}

function drawSlate(ctx, t) {
  const lt = t - EV.slate
  ctx.fillStyle = '#f3ead8'
  ctx.fillRect(0, 0, W, H)
  sprinkles(ctx, t, 34)
  buntingRow(ctx, 100, 9, t, 1)
  ctx.strokeStyle = '#9db89a'
  ctx.lineWidth = 8
  ctx.strokeRect(54, 54, W - 108, H - 108)
  txt(ctx, 'THE GREAT FLOW BAKE-OFF', W / 2, 200, { size: 110, font: F.anton, color: '#3a2e26', align: 'center', base: 'middle', track: 2 })
  ctx.fillStyle = '#8a5a3a'
  ctx.fillRect(W / 2 - 260, 262, 520, 5)
  // star baker medallion
  const u = E.outBack(clamp(seg(lt, 0.3, 0.8)))
  ctx.save()
  ctx.translate(W / 2 - 380, 430)
  ctx.scale(u, u)
  ctx.beginPath()
  ctx.arc(0, 0, 84, 0, 7)
  ctx.fillStyle = '#3a2e26'
  ctx.fill()
  ctx.strokeStyle = '#f2c744'
  ctx.lineWidth = 6
  ctx.stroke()
  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, 76, 0, 7)
  ctx.clip()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(A.headIcon(S.heads, C.hero.id, 6), -72, -78, 144, 144)
  ctx.restore()
  ctx.restore()
  ctx.save()
  ctx.translate(W / 2 + 60, 430)
  ctx.globalAlpha = clamp(seg(lt, 0.5, 0.9))
  txt(ctx, 'STAR BAKER', 0, -34, { size: 92, font: F.anton, color: '#8b3a39', align: 'left', base: 'middle' })
  txt(ctx, `${C.hero.name} · No. 1`, 0, 42, { size: 44, font: F.mono, weight: 700, track: 4, color: '#3a2e26', align: 'left', base: 'middle' })
  ctx.restore()
  // cast row
  const row = [C.hero, C.moss, C.gold, C.judge, C.host]
  const rowU = clamp(seg(lt, 1.0, 1.6))
  row.forEach((m, i) => {
    const xx = W / 2 + (i - 2) * 330
    const uu = clamp(rowU * 5 - i * 0.6)
    if (uu <= 0) return
    ctx.save()
    ctx.globalAlpha = uu
    ctx.beginPath()
    ctx.arc(xx, 720, 58, 0, 7)
    ctx.fillStyle = '#efe5d0'
    ctx.fill()
    ctx.strokeStyle = m.hair
    ctx.lineWidth = 5
    ctx.stroke()
    ctx.save()
    ctx.beginPath()
    ctx.arc(xx, 720, 52, 0, 7)
    ctx.clip()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(A.headIcon(S.heads, m.id, 4), xx - 52, 714 - 56, 104, 104)
    ctx.restore()
    txt(ctx, m.name, xx, 806, { size: 30, font: F.mono, weight: 700, track: 2, color: '#3a2e26', align: 'center', base: 'middle' })
    txt(ctx, m.role, xx, 842, { size: 22, font: F.mono, color: '#8a5a3a', align: 'center', base: 'middle' })
    ctx.restore()
  })
  ctx.globalAlpha = clamp(seg(lt, 1.6, 2.1))
  txt(ctx, TL.COPY.slateNoCabalds, W / 2, 946, { size: 34, font: F.mono, weight: 700, track: 4, color: '#8a5a3a', align: 'center', base: 'middle' })
  txt(ctx, TL.COPY.slateProd, W / 2, 996, { size: 24, font: F.mono, track: 6, color: '#6d5a44', align: 'center', base: 'middle' })
}

// broadcast bug (overlay, stage shots)
function tvBug(o, t, on) {
  if (!on) return
  const label = 'FLOW\u00b71  HD'
  const lw = measure(o, label, 26, F.mono, 4, 700)
  const x = W - 96 - lw
  txt(o, label, x, 74, { size: 26, font: F.mono, weight: 700, track: 4, color: 'rgba(255,255,255,0.8)', shadow: 'rgba(0,0,0,0.7)' })
  const puls = 0.5 + 0.5 * Math.sin(t * 4)
  o.fillStyle = `rgba(220,60,50,${(0.35 + 0.6 * puls).toFixed(3)})`
  o.beginPath()
  o.arc(x - 22, 66, 7, 0, 7)
  o.fill()
}

// ---------- shots ----------
function drawExt(x, lt, dur, t) {
  const g = TL.warp(t).g
  ART.drawExterior(x, t)
  const w = walkX(g, 0.6, 6.8, 90, 614)
  const opt = w.u >= 1 ? { ...idleC(t, 1), lean: 0 } : walkC(w.dist)
  actor(x, 'host', w.px, 470, { ...opt, flip: true, s: 1.45 })
}

function judgeTablePaint(x) {
  const L = LAY()
  const jx = L.judgeTable.x
  const ty = L.stations.tableTop
  x.fillStyle = 'rgba(58,46,38,0.22)'
  x.beginPath()
  x.ellipse(jx, ty + 42, 66, 7, 0, 0, 7)
  x.fill()
  x.fillStyle = '#6f6f76'
  x.fillRect(jx - 50, ty, 7, 40)
  x.fillRect(jx + 43, ty, 7, 40)
  x.fillStyle = '#8e949c'
  x.fillRect(jx - 50, ty, 3, 40)
  x.fillRect(jx + 43, ty, 3, 40)
  x.fillStyle = '#3a2e26'
  x.fillRect(jx - 58, ty - 8, 116, 14)
  x.fillStyle = '#c08d61'
  x.fillRect(jx - 56, ty - 7, 112, 5)
  x.fillStyle = '#a8764f'
  x.fillRect(jx - 56, ty - 2, 112, 7)
}

function drawBrief(x, lt, dur, t) {
  const g = TL.warp(t).g
  const L = LAY()
  ART.drawInterior(x, t, 0)
  ART.wallClock(x, t, 'run')
  // actors behind their tables
  const hb = idleC(t, 0)
  actor(x, 'hero', L.stations.hero - 18, L.stations.tableTop - 8, { ...hb, s: 1.55 })
  actor(x, 'moss', L.stations.moss + 14, L.stations.tableTop - 8, { ...idleC(t, 2), s: 1.55 })
  actor(x, 'gold', L.stations.gold + 10, L.stations.tableTop - 8, { ...idleC(t, 4), s: 1.55 })
  ART.station(x, L.stations.hero, 'hero')
  ART.station(x, L.stations.moss, 'moss')
  ART.station(x, L.stations.gold, 'gold')
  for (const ox of [150, 240, 330]) ART.oven(x, ox, 0, 0)
  judgeTablePaint(x)
  // judge with clipboard
  actor(x, 'judge', L.judgeTable.x - 20, L.stations.tableTop + 6, { ...idleC(t, 3, 0.9), s: 1.6 })
  x.fillStyle = '#6b4a2e'
  x.fillRect(L.judgeTable.x - 6, L.stations.tableTop - 40, 16, 22)
  x.fillStyle = '#f6efdd'
  x.fillRect(L.judgeTable.x - 4, L.stations.tableTop - 38, 12, 16)
  // host front-left with cue card
  const hopt = idleC(t, 5)
  const cardUp = seg(t, EV.hostCard, EV.hostCard + 0.5)
  actor(x, 'host', 250, 556, { ...hopt, flip: false, s: 1.72 })
  cueCard(x, 250 + 26, 556 - 128 - cardUp * 26, -0.12 - cardUp * 0.1)
}

function drawMontage(x, lt, dur, t) {
  const w = TL.warp(t)
  const g = w.g
  const L = LAY()
  ART.drawInterior(x, t, 0)
  ART.wallClock(x, t, t < 44 ? 'run' : 'spin')
  for (const ox of [150, 240, 330]) ART.oven(x, ox, 0, 0)
  const frenzy = g > GW.whiskStart
  const piping = g > GW.pipeStart - 0.4 && g < GW.whiskStart
  const jit = frenzy ? Math.sin(t * 30) * 0.05 : 0
  actor(x, 'moss', L.stations.moss + 14, L.stations.tableTop - 8, { ...idleC(t, 2), lean: 0.02 + jit, s: 1.55 })
  actor(x, 'gold', L.stations.gold + 10, L.stations.tableTop - 8, { ...idleC(t, 4), lean: piping ? 0.07 : 0.02, s: 1.55 })
  ART.station(x, L.stations.moss, 'moss')
  ART.station(x, L.stations.gold, 'gold')
  // hero kneading
  const knead = Math.sin(g * 4.4)
  const punchU = Math.max(E.outCubic(seg(g, GW.punch1, GW.punch1 + 0.22)) * (1 - seg(g, GW.punch1 + 0.22, GW.punch1 + 0.5)),
    E.outCubic(seg(g, GW.punch2, GW.punch2 + 0.22)) * (1 - seg(g, GW.punch2 + 0.22, GW.punch2 + 0.5)))
  actor(x, 'hero', L.stations.hero - 18, L.stations.tableTop - 8, { lean: 0.1 + knead * 0.05 - punchU * 0.06, s: 1.55 })
  ART.station(x, L.stations.hero, 'hero')
  const doughY = L.stations.tableTop - 20
  if (g < 27.4) {
    const sq = clamp(0.5 + knead * 0.12 - punchU * 0.38, 0.1, 1)
    ART.dough(x, L.stations.hero - 10, doughY, sq, 0.2 + punchU * 0.5)
    if (t > EV.punch1) ART.flourPuff(x, EV.punch1 + 0.02, t, L.stations.hero - 10, doughY, 14)
    if (t > EV.punch2) ART.flourPuff(x, EV.punch2 + 0.02, t, L.stations.hero - 10, doughY, 16)
  } else if (g < GW.chop + 0.001) {
    ART.dough(x, L.stations.hero - 10, doughY, 0.35, 0.35)
    ART.butterBlock(x, L.stations.hero + 26, doughY - 2, 0)
  } else {
    const rollU = seg(g, GW.rollStart, GW.rollEnd)
    if (rollU <= 0) {
      ART.dough(x, L.stations.hero - 10, doughY, 0.35, 0.35)
      ART.butterBlock(x, L.stations.hero + 26, doughY - 2, 1)
    } else {
      ART.rolling(x, L.stations.hero + 8, doughY, rollU, t)
    }
  }
  // knife: anticipation 27.2-27.9, strike at 28.0 (g domain → freezes in stop)
  if (g > 27.2 && g < 31.5) {
    let ang
    if (g < 27.9) ang = -0.5 - 1.4 * seg(g, 27.2, 27.9)
    else if (g < 28.02) ang = lerp(-1.9, 0.32, E.inOutCubic(seg(g, 27.9, 28.02)))
    else ang = 0.32
    const flash = w.stop != null && w.sl < 0.12
    bigKnife(x, L.stations.hero + 26, doughY - 26 + (ang > 0 ? 12 : 0), ang, flash)
    if (g >= 28.02) butterCrumbs(x, 28.18, t, L.stations.hero + 26, doughY - 6)
    if (t >= EV.chop) ART.flourPuff(x, EV.chop + 0.16, t, L.stations.hero + 26, doughY - 4, 22)
  }
  // gold piping at own table (camera visits 31.5-34.3)
  const pu = seg(g, GW.pipeStart, GW.pipeEnd)
  if (pu > 0) ART.piping(x, L.stations.gold, L.stations.tableTop - 24, pu)
  // moss whisk frenzy (camera 34.3+)
  if (g > GW.whiskStart - 0.3) ART.whiskScene(x, L.stations.moss, L.stations.tableTop - 22, t, frenzy)
}

function drawOven(x, lt, dur, t) {
  const w = TL.warp(t)
  const g = w.g
  const L = LAY()
  const dusk = seg(t, EV.timelapse + 0.2, EV.timelapse + 1.8)
  ART.drawInterior(x, t, dusk)
  ART.wallClock(x, t, t < 44 ? 'run' : 'spin')
  ART.station(x, L.stations.hero, 'hero')
  ART.station(x, L.stations.moss, 'moss')
  ART.station(x, L.stations.gold, 'gold')
  // oven states (door in g domain → freezes during the slam stop; glow on real t)
  const door1 = E.outCubic(seg(g, GW.ovenOpenMoss, GW.ovenOpenMoss + 0.44))
  ART.oven(x, 150, door1, 0.1)
  const fire = seg(g, GW.fireStart, GW.firePeak) * (1 - seg(g, GW.fireOut, GW.fireOut + 0.4))
  ART.oven(x, 330, 0, 0.15 + fire * 0.3)
  // oven 2: opens for the loaf just before the slide, door slams into the freeze
  const door2open = E.outCubic(seg(g, GW.heroSlide - 0.4, GW.heroSlide + 0.2))
  const door2close = seg(g, GW.ovenSlam - 0.1, GW.ovenSlam - 0.01)
  const door2 = clamp(door2open - door2close)
  if (t > EV.ovenSlam) {
    const fl = 1 + 1.4 * Math.exp(-(t - EV.ovenSlam) * 2.2)
    ART.oven(x, 240, 0, clamp(fl, 0, 2))
    dustRing(x, EV.ovenSlam, t, 240, 402, 'rgba(255,220,150,')
    ART.flourPuff(x, EV.ovenSlam + 0.05, t, 240, 388, 18)
  } else {
    ART.oven(x, 240, door2, 0)
  }
  if (t > 44.5) steam(x, 240, 330, 44.5, t)
  // moss: opens oven, cake rises out, collapses, moss steps back-left
  const mw = walkX(g, GWT.oven + 0.2, GWT.oven + 1.0, L.stations.moss, 150)
  const back = walkX(g, GW.collapse, GW.collapse + 0.7, 150, 104)
  if (g < GW.collapse) {
    actor(x, 'moss', mw.px, L.stations.tableTop + 6, mw.u >= 1 ? { ...idleC(t, 2), lean: -0.06 } : walkC(mw.dist))
  } else {
    actor(x, 'moss', back.px, L.stations.tableTop + 6, back.u >= 1 ? { ...idleC(t, 2), lean: 0.04, flip: true } : { ...walkC(back.dist), flip: true })
  }
  const doorOpenBy = GW.ovenOpenMoss + 0.44
  if (g >= doorOpenBy) {
    // rise out of the oven mouth (0.5 s), then collapse from GW.collapse
    const rise = E.outCubic(seg(g, doorOpenBy, doorOpenBy + 0.5))
    const cu = E.outCubic(seg(g, GW.collapse, GW.collapse + 0.8))
    ART.cakeSplat(x, 150, lerp(410, 396, rise) - cu * 22, cu)
    dustRing(x, EV.collapse + 0.77, t, 150, 402)
  }
  // gold: fire panic + fanning (charred tray on the oven ledge, not his head)
  const gw = walkX(g, GWT.oven + 3.34, GWT.oven + 3.94, L.stations.gold, 358)
  const fan = g > GW.fireStart ? Math.sin(t * 16) * 0.16 : 0
  actor(x, 'gold', gw.px, L.stations.tableTop + 6, gw.u >= 1 ? { lean: -0.1 + fan, flip: false } : walkC(gw.dist))
  if (g > GW.fireStart - 0.4) ART.charCake(x, 330, 388, t, t > EV.smokePuff ? 1 : 0)
  if (fire > 0) ART.flameJet(x, t, 330, 378, fire)
  // hero carries the loaf from the start, slides it in at heroSlide
  const hw = walkX(g, GWT.oven + 0.2, GWT.oven + 1.0, L.stations.hero, 240)
  actor(x, 'hero', hw.px, L.stations.tableTop + 6, hw.u >= 1 ? { ...idleC(t, 0), flip: true } : { ...walkC(hw.dist), flip: true })
  if (g >= GWT.oven + 0.2 && g < GW.heroSlide) {
    ART.loaf(x, hw.px - 18, L.stations.tableTop - 52 - (hw.u >= 1 ? 4 : 0), -1)
  } else if (g >= GW.heroSlide && g < GW.ovenSlam) {
    const slideU = seg(g, GW.heroSlide, GW.ovenSlam - 0.08)
    ART.loaf(x, lerp(222, 240, slideU), lerp(418, 392, slideU) - Math.sin(slideU * Math.PI) * 10, -1)
  }
}

function drawJudge(x, lt, dur, t) {
  const g = TL.warp(t).g
  const L = LAY()
  ART.drawInterior(x, t, 1)
  ART.wallClock(x, t, t < 44 ? 'run' : t < 46 ? 'spin' : t < 58.5 ? 'run' : 'stop')
  for (const ox of [150, 240, 330]) ART.oven(x, ox, 0, 0.22)
  ART.station(x, L.stations.hero, 'hero')
  ART.station(x, L.stations.moss, 'moss')
  ART.station(x, L.stations.gold, 'gold')
  judgeTablePaint(x)
  // moss + gold deliver their disasters, then stand beside the judge table
  const mw = walkX(g, GWT.judge + 0.4, GWT.judge + 1.2, L.stations.moss + 14, L.judgeTable.x - 78)
  actor(x, 'moss', mw.px, mw.u >= 1 ? L.stations.tableTop + 6 : L.stations.tableTop - 8, mw.u >= 1 ? { ...idleC(t, 2), lean: -0.04 } : { ...walkC(mw.dist), s: 1.55 })
  const gw = walkX(g, GWT.judge + 4.4, GWT.judge + 5.2, L.stations.gold + 10, L.judgeTable.x - 118)
  actor(x, 'gold', gw.px, gw.u >= 1 ? L.stations.tableTop + 6 : L.stations.tableTop - 8, gw.u >= 1 ? { ...idleC(t, 4) } : { ...walkC(gw.dist), s: 1.55 })
  // plates appear as delivered
  if (t >= 47.0) {
    plate(x, L.judgeTable.x - 30, L.stations.tableTop - 8)
    ART.cakeSplat(x, L.judgeTable.x - 30, L.stations.tableTop - 20, 1)
  }
  if (t >= 51.0) {
    plate(x, L.judgeTable.x + 26, L.stations.tableTop - 8)
    ART.charCake(x, L.judgeTable.x + 26, L.stations.tableTop - 22, t, t > EV.smokePuff ? 1 : 0)
  }
  // judge walks between plates, then to the podium
  let jx = L.judgeTable.x - 60
  let jopt = { ...idleC(t, 3, 0.9) }
  const jw1 = walkX(g, GW.taste1 - 0.8, GW.taste1, jx, L.judgeTable.x - 30)
  const jw2 = walkX(g, GW.taste2 - 0.8, GW.taste2, L.judgeTable.x - 30, L.judgeTable.x + 26)
  const jw3 = walkX(g, GW.judgeLean, GW.judgeLean + 1.2, L.judgeTable.x + 26, L.podium.x + 54)
  if (g < GW.taste1) { jx = jw1.px }
  else if (g < GW.taste2) { jx = jw2.px }
  else if (g < GW.judgeLean) { jx = L.judgeTable.x + 26; jopt = { lean: -0.05, ...idleC(t, 3, 0.9) } }
  else { jx = jw3.px; jopt = { lean: 0.08, ...idleC(t, 3, 0.9) } }
  // bites: quick lean-in
  const bite = (bt) => E.outCubic(seg(g, bt, bt + 0.2)) * (1 - seg(g, bt + 0.2, bt + 0.5))
  const lean = bite(GW.bite1) + bite(GW.bite2)
  actor(x, 'judge', jx, L.stations.tableTop + 6, { ...jopt, lean: (jopt.lean ?? 0) + lean, flip: jx < L.podium.x })
  // hero waits at his station until the drumroll, then carries the cloche
  const carry = walkX(g, GW.heroCarry, GW.clocheLift, L.stations.hero, L.podium.x - 34)
  if (g < GW.heroCarry) {
    actor(x, 'hero', L.stations.hero - 18, L.stations.tableTop - 8, { ...idleC(t, 0), s: 1.55 })
  } else if (g < GW.clocheLift) {
    actor(x, 'hero', carry.px, 552, { ...walkC(carry.dist), flip: true, s: 1.62 })
  } else {
    actor(x, 'hero', L.podium.x - 34, 552, { ...idleC(t, 0), flip: true, s: 1.62 })
  }
  // host ushers from the left
  const hEnter = walkX(g, GW.drumroll - 0.6, GW.drumroll + 0.8, 120, 430)
  if (g > GW.drumroll - 0.6) actor(x, 'host', hEnter.px, 552, { ...idleC(t, 5), s: 1.7, flip: true, lean: -0.06 })
  const clift = E.outCubic(seg(g, GW.clocheLift, GW.clocheLift + 0.7))
  const revealed = g >= GW.clocheLift
  if (t >= EV.heroCarry - 0.2) {
    podiumTable(x)
    if (!revealed) {
      ART.cloche(x, carry.px + 14, L.podium.y - 34, 0, t)
    } else {
      // rises straight up off the sculpture, then parks on the judge's table
      if (clift < 0.75) {
        ART.cloche(x, L.podium.x, L.podium.y - 62 - clift * 40, 0.35 + clift * 0.45, t)
      } else {
        ART.cloche(x, L.judgeTable.x - 30, L.stations.tableTop - 12, 0, t)
      }
      ART.sculpture(x, L.podium.x, L.podium.y - 36, t, 1)
    }
  }
}

function drawHand(x, lt, dur, t) {
  const w = TL.warp(t)
  const g = w.g
  const L = LAY()
  ART.drawInterior(x, t, 1)
  ART.wallClock(x, t, 'stop')
  for (const ox of [150, 240, 330]) ART.oven(x, ox, 0, 0.22)
  ART.station(x, L.stations.hero, 'hero')
  // podium scene, tight
  podiumTable(x)
  ART.sculpture(x, L.podium.x, L.podium.y - 36, t, 1)
  ART.cloche(x, L.podium.x - 60, 320, 1, t)
  actor(x, 'hero', L.podium.x - 34, 552, { ...idleC(t, 0), flip: true, s: 1.62 })
  const jw = walkX(g, GWT.hand + 0.2, GWT.hand + 0.9, L.podium.x + 20, L.podium.x + 58)
  actor(x, 'judge', jw.px, 552, { ...idleC(t, 3, 0.9), lean: 0.05, s: 1.62 })
  // co-bakers crowd in from the judge table side
  const mw = walkX(g, GWT.hand + 0.4, GWT.hand + 1.6, L.judgeTable.x - 78, L.podium.x - 110)
  const gw = walkX(g, GWT.hand + 0.5, GWT.hand + 1.7, L.judgeTable.x - 118, L.podium.x + 130)
  const cheering = g > GW.cheer
  const hop = cheering ? Math.abs(Math.sin(t * 6.2)) * 7 : 0
  actor(x, 'moss', mw.px, 470 - hop, { ...idleC(t, 2), s: 1.5 })
  actor(x, 'gold', gw.px, 470 - hop * 0.8, { ...idleC(t, 4), s: 1.5 })
  // host staggers at the left
  const stagger = g > GW.hostGasp ? E.outCubic(seg(g, GW.hostGasp, GW.hostGasp + 0.5)) * 34 : 0
  actor(x, 'host', 500 - stagger, 540, { lean: -0.12 - stagger * 0.002, s: 1.6 })
  // the clasp (world g; frozen during the stop) — hands only appear as they reach
  const gripU = seg(g, GW.grasp, GW.handshake)
  const pump = g > GW.handshake + 0.3 && g < GW.handshake + 1.3 ? (g - GW.handshake) : 0
  if (g > GW.grasp - 1.0) handsClasp(x, L.podium.x, 458, gripU, pump, '#c0aa98', '#685240')
  const flash = w.stop != null && w.sl < 0.1
  if (flash) {
    x.fillStyle = 'rgba(255,252,240,0.88)'
    x.beginPath()
    x.arc(L.podium.x, 458, 62, 0, 7)
    x.fill()
    x.strokeStyle = 'rgba(255,248,220,0.7)'
    x.lineWidth = 3
    x.beginPath()
    x.arc(L.podium.x, 458, 78 + w.sl * 240, 0, 7)
    x.stroke()
    x.lineWidth = 2
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4
      x.beginPath()
      x.moveTo(L.podium.x + Math.cos(a) * 40, 458 + Math.sin(a) * 26)
      x.lineTo(L.podium.x + Math.cos(a) * (78 + w.sl * 240), 458 + Math.sin(a) * (50 + w.sl * 150))
      x.stroke()
    }
  }
  if (t >= EV.handshake) ART.confettiBurst(x, EV.handshake + 0.45, t, L.podium.x, 452)
}

function drawFinale(x, lt, dur, t) {
  const g = TL.warp(t).g
  const L = LAY()
  ART.drawInterior(x, t, 1)
  ART.wallClock(x, t, 'stop')
  for (const ox of [150, 240, 330]) ART.oven(x, ox, 0, 0.25)
  ART.station(x, L.stations.moss, 'moss')
  ART.station(x, L.stations.gold, 'gold')
  podiumTable(x)
  ART.sculpture(x, L.podium.x, L.podium.y - 36, t, 0.4)
  // banner + rain
  ART.banner(x, seg(t, EV.banner, EV.banner + 1.2), t)
  ART.confettiRain(x, t, 7)
  // hero lifts the trophy high to his left
  const lift = E.outBack(clamp(seg(g, GW.trophyLift, GW.trophyLift + 0.7)))
  const bob = Math.sin(t * 2.4) * 2
  actor(x, 'hero', L.podium.x - 30, 550, { ...idleC(t, 0), flip: true, s: 1.66 })
  ART.trophy(x, L.podium.x - 96, 388 - lift * 40 + bob, lift, t)
  // co-bakers hop-clap
  const hop1 = Math.abs(Math.sin(t * 5.8)) * 6
  const hop2 = Math.abs(Math.sin(t * 5.2 + 1)) * 6
  actor(x, 'moss', L.stations.moss + 14, L.stations.tableTop - 8 - hop1, { ...idleC(t, 2), lean: -0.04 - hop1 * 0.004, s: 1.55 })
  actor(x, 'gold', L.stations.gold + 10, L.stations.tableTop - 8 - hop2, { ...idleC(t, 4), s: 1.55 })
  // smoke gag: gold still smouldering
  if (t > EV.smokeGag) steam(x, L.stations.gold + 24, L.stations.tableTop - 26, EV.smokeGag, t)
  // judge slow-claps at the right
  const clapT = [EV.judgeClap, EV.judgeClap + 0.7, EV.judgeClap + 1.4, EV.judgeClap + 2.1]
  const clap = clapT.some((ct) => t > ct && t < ct + 0.18)
  actor(x, 'judge', 880, 470, { lean: clap ? 0.06 : 0.02, ...idleC(t, 3, 0.8), s: 1.6 })
  if (clap) {
    x.fillStyle = '#685240'
    x.beginPath()
    x.arc(880 - 20, 470 - 118, 6, 0, 7)
    x.arc(880 + 14, 470 - 118, 6, 0, 7)
    x.fill()
  }
  // host presents
  actor(x, 'host', 300, 556, { ...idleC(t, 5), s: 1.7 })
}

// ---------- fx ----------
const WARM_INT = { bloom: 0.06, vignette: 0.5, grain: 0.008, warm: 0.04, crt: 0.04 }
function fxExt(lt, t) {
  return { ...WARM_INT, exposure: lerp(-0.7, 0, E.outCubic(seg(t, 0.05, 1.4))), bloom: 0.08, rays: 0.08, vignette: 0.42, grain: 0.007 }
}
function fxTitles() {
  return { grain: 0.006 }
}
function fxBrief(lt, t) {
  const ins = t >= EV.judgeECU1 && t < EV.judgeECU1End
  return ins ? { grain: 0.008, vignette: 0.7 } : WARM_INT
}
function fxMontage(lt, t) {
  const st = TL.warp(t).stop
  return { ...WARM_INT, sat: 1.08, bloom: st ? 0.18 : 0.08, aber: st ? 0.004 : 0 }
}
function fxOven(lt, t) {
  const st = TL.warp(t).stop
  const glow = t > EV.ovenSlam ? Math.exp(-(t - EV.ovenSlam) * 2.2) : 0
  return { ...WARM_INT, exposure: -0.04 + glow * 0.12, warm: 0.08 + glow * 0.12, vignette: 0.6, bloom: st ? 0.22 : 0.09, aber: st ? 0.005 : 0 }
}
function fxJudge(lt, t) {
  const hb = t > 58 ? Math.exp(-(t - 58) * 2) : 0
  return { ...WARM_INT, sat: 1.0 - 0.12 * seg(t, 58, 60), vignette: 0.55 + 0.35 * seg(t, 57, 60) - hb * 0.1, crt: 0.05 }
}
function fxHand(lt, t) {
  const st = TL.warp(t).stop
  const after = t > EV.handshake + 0.5
  return { ...WARM_INT, warm: 0.08, bloom: st ? 0.24 : after ? 0.16 : 0.08, aber: st ? 0.004 : 0, streak: after ? 0.06 : 0, rays: after ? 0.08 : 0, vignette: 0.5 }
}
function fxFinale(lt, t) {
  return { ...WARM_INT, sat: 1.1, bloom: 0.12, streak: 0.05, rays: 0.06, vignette: 0.42, fade: seg(t, 82.8, 84) }
}

// ---------- assembly ----------
const DRAW = { ext: drawExt, titles: null, brief: drawBrief, montage: drawMontage, oven: drawOven, judge: drawJudge, hand: drawHand, finale: drawFinale }
const FX = { ext: fxExt, titles: fxTitles, brief: fxBrief, montage: fxMontage, oven: fxOven, judge: fxJudge, hand: fxHand, finale: fxFinale }
const CAMKEYS = {
  ext: [{ t: 0, x: 528, y: 300, z: 1.0 }, { t: 2.0, x: 528, y: 292, z: 1.12 }],
  brief: [{ t: 0, x: 528, y: 296, z: 1.16 }, { t: 15.0, x: 400, y: 330, z: 1.3 }, { t: 18.6, x: 528, y: 296, z: 1.16 }],
  montage: [
    { t: 22, x: 460, y: 388, z: 1.75 },
    { t: 27.4, x: 470, y: 392, z: 1.9 },
    { t: 31.5, x: 724, y: 388, z: 1.75 },
    { t: 34.3, x: 236, y: 388, z: 1.8 },
  ],
  oven: [
    { t: 36, x: 300, y: 360, z: 1.5 },
    { t: 38.0, x: 190, y: 380, z: 1.7 },
    { t: 40.0, x: 320, y: 380, z: 1.7 },
    { t: 42.0, x: 240, y: 370, z: 1.6 },
    { t: 44.0, x: 300, y: 340, z: 1.35 },
  ],
  judge: [
    { t: 46, x: 700, y: 360, z: 1.45 },
    { t: 49.4, x: 860, y: 380, z: 1.6 },
    { t: 53.4, x: 880, y: 380, z: 1.6 },
    { t: 55.6, x: 640, y: 380, z: 1.5 },
    { t: 57.4, x: 648, y: 330, z: 1.62 },
    { t: 58.4, x: 650, y: 322, z: 1.72 },
  ],
  hand: [
    { t: 60, x: 640, y: 400, z: 1.95 },
    { t: 63.9, x: 640, y: 380, z: 1.7 },
  ],
  finale: [{ t: 70, x: 528, y: 272, z: 1.0 }, { t: 71.4, x: 536, y: 280, z: 1.05 }],
}
const SHAKES = {
  ext: [],
  titles: [],
  brief: [],
  montage: [[28.0, 5, 0.4]],
  oven: [[38.4, 3, 0.3], [43.0, 7, 0.5]],
  judge: [],
  hand: [[63.0, 4, 0.4]],
  finale: [],
}

const SHOT_FNS = TL.SHOTS.map(([name, t0, t1], i) => ({
  name,
  t0,
  t1,
  draw(ctx, lt, dur, t, overlay) {
    if (name === 'titles') {
      drawTitles(ctx, t)
      return
    }
    const x = low()
    DRAW[name](x, lt, dur, t)
    const cam = camPath(CAMKEYS[name], t)
    const sh = shakeOf(t, SHAKES[name])
    blit(ctx, { ...cam, dx: sh.dx * 2, dy: sh.dy * 2 })
    const ins = TL.INSERTS.find((q) => t >= q.t0 && t < q.t1)
    if (ins) drawInsert(ctx, t, ins)
    if (name === 'finale' && t >= EV.slate) drawSlate(ctx, t)
    tvBug(overlay, t, t >= T.brief && t < T.hand)
  },
  fx(lt, t) {
    return FX[name](lt, t)
  },
}))

export default {
  title: 'THE GREAT FLOW BAKE-OFF — a Remy Boys baking championship',
  output: 'flow-bakeoff.mp4',
  duration: TL.DUR,
  grid: { bar: 2 },
  lint: { captionHold: 3, safe: { margin: 0.05 } },
  audio: { seed: 21, reverb: 2.0, reverbGain: 0.28 },
  fonts: [
    { family: 'Pixelify Sans', url: new URL('../../node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-700-normal.woff2', import.meta.url).href },
  ],

  async prepare() {
    await document.fonts?.ready
    S = await ART.load()
    S.low = A.canvas(ART.LW, ART.LH)
  },

  shots: SHOT_FNS,

  captions: [
    { id: 'loc', style: 'loc', text: TL.COPY.loc, t0: 1.2, t1: 5.4 },
    { id: 'welcome', style: 'dlg', text: TL.COPY.welcome, t0: 15.4, t1: 18.0, minHold: 2.0 },
    { id: 'challenge', style: 'stampS', text: TL.COPY.challenge, t0: 17.9, t1: 19.7, minHold: 1.5 },
    { id: 'judgeLine', style: 'dlgJ', text: TL.COPY.judgeLine, t0: 19.6, t1: 21.9, minHold: 1.7 },
    { id: 'chop', style: 'stamp', text: TL.COPY.chop, t0: 28.2, t1: 29.8, minHold: 1.2 },
    { id: 'prove', style: 'beat', text: TL.COPY.prove, t0: 33.0, t1: 35.8, minHold: 2.1 },
    { id: 'later', style: 'loc', text: TL.COPY.later, t0: 43.8, t1: 45.9, minHold: 1.1 },
    { id: 'dry', style: 'verdict', text: TL.COPY.dry, t0: 49.8, t1: 51.4, minHold: 1.2 },
    { id: 'burnt', style: 'verdict', text: TL.COPY.burnt, t0: 53.8, t1: 55.4, minHold: 1.2 },
    { id: 'handshake', style: 'stampL', text: TL.COPY.handshake, t0: 63.7, t1: 66.8, minHold: 2.4 },
    { id: 'almost', style: 'whisper', text: TL.COPY.almost, t0: 67.6, t1: 69.5, minHold: 1.0 },
  ],
  captionStyles: {
    loc: { font: F.mono, size: 30, weight: 700, track: 6, color: '#f6efdd', align: 'center', x: 960, y: 936, anim: 'fade', in: 0.5, out: 0.4, shadow: 'rgba(0,0,0,0.8)', glow: 'rgba(0,0,0,0.6)', glowBlur: 10 },
    dlg: { font: F.grot, size: 54, weight: 700, color: '#ffffff', align: 'center', x: 960, y: 956, anim: 'rise', in: 0.3, out: 0.25, rise: 16, shadow: 'rgba(0,0,0,0.9)', glow: 'rgba(20,12,6,0.8)', glowBlur: 14 },
    dlgJ: { font: F.grot, size: 50, weight: 'italic 700', color: '#e8d9b8', align: 'center', x: 960, y: 956, anim: 'rise', in: 0.3, out: 0.25, rise: 14, shadow: 'rgba(0,0,0,0.9)', glow: 'rgba(24,14,8,0.9)', glowBlur: 16 },
    stampS: { font: F.anton, size: 96, color: '#3a2e26', align: 'center', x: 960, y: 872, anim: 'cut', in: 0, out: 0.25, glow: '#f2c744', glowBlur: 3 },
    stamp: { font: F.anton, size: 120, color: '#8b3a39', align: 'center', x: 960, y: 500, anim: 'cut', in: 0, out: 0.2, shadow: 'rgba(255,244,220,0.9)' },
    stampL: { font: F.anton, size: 150, color: '#8b3a39', align: 'center', x: 960, y: 540, anim: 'cut', in: 0, out: 0.3, track: 4, shadow: 'rgba(255,246,224,0.95)', glow: 'rgba(255,232,160,0.5)', glowBlur: 6 },
    beat: { font: F.grot, size: 58, weight: 700, track: 6, color: '#3a2e26', align: 'center', x: 960, y: 906, anim: 'rise', in: 0.3, out: 0.3, rise: 14, shadow: 'rgba(255,248,230,0.9)' },
    verdict: { font: F.anton, size: 118, color: '#8b3a39', align: 'center', x: 960, y: 508, anim: 'cut', in: 0, out: 0.2, shadow: 'rgba(255,244,220,0.9)' },
    whisper: { font: F.grot, size: 46, weight: 'italic 600', color: '#f6efdd', align: 'center', x: 960, y: 926, anim: 'fade', in: 0.4, out: 0.4, shadow: 'rgba(0,0,0,0.85)' },
    star: { font: F.anton, size: 168, color: '#8b3a39', align: 'center', x: 960, y: 620, anim: 'cut', in: 0, out: 0.3, track: 6, shadow: 'rgba(255,246,224,0.95)', glow: 'rgba(242,199,68,0.6)', glowBlur: 8 },
  },

  flashes: [
    [EV.titleSlam, 0.16, 0.08],
    [EV.chop, 0.14, 0.08],
    [EV.collapse, 0.08, 0.08],
    [EV.ovenSlam, 0.2, 0.1],
    [EV.handshake, 0.28, 0.14],
    [EV.banner, 0.12, 0.1],
  ],

  score,
}
