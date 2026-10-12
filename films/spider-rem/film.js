// SPIDER-REM — "With Great Hair Comes Great Flow". 90 s, 1920x1080 comic-book picture.
// Two clocks: world g (warp(rt).g) drives action; real t drives cuts, onomatopoeia, shake,
// flash and the score (via filmT). The flowSense shot runs a shot-local half-speed clock.
// GRID: BPM 80 — beat 0.75 s, bar 3 s; every cut on a bar. See timeline.js for the truth.
import { W, H, seg, lerp, clamp, E, hash, txt, measure, F } from 'filmkit/lib.js'
import { slam } from 'filmkit/motion.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import { PAL, GOB } from './art.js'
import { score } from './score.js'
import {
  D, CAST, SHOTS, FLASHES, SWINGS, swingTheta, swingPos, LAND_C, DIVE, CIV, SETDOWN, GOBLIN,
  BOMBS, FS, HANG, LOUSE, IRIS, ONOS, SHAKES, CAPTIONS, CAPTION_STYLES, warp, filmT,
} from './timeline.js'

const HS = 2.0   // hero near scale
const VS = 2.0   // villain near scale
const CS = 1.6   // civilian near scale
const S = {}     // prepared art (read-only in draw)

// =================================================================================
// PREPARE
// =================================================================================
function deSword(R, kx = 1) {
  const x = R.c.getContext('2d')
  const img = x.getImageData(0, 0, R.c.width, R.c.height), d = img.data
  const wipe = (px, py) => { const i = (Math.floor(py) * R.c.width + Math.floor(px)) * 4; d[i + 3] = 0 }
  for (let py = 0; py < 88 * kx; py++) for (let px = 0; px < 16.5 * kx; px++) wipe(px, py)
  for (let py = 70 * kx; py < 85 * kx; py++)
    for (let px = 9 * kx; px < 23 * kx; px++) {
      const i = (Math.floor(py) * R.c.width + Math.floor(px)) * 4
      const [r, g, b] = [d[i], d[i + 1], d[i + 2]]
      if (d[i + 3] && r > 140 && g > 110 && b < 130) wipe(px, py)              // gold guard
      else if (d[i + 3] && r > 40 && r < 150 && g < 90 && b < 70) wipe(px, py) // brown grip
    }
  x.putImageData(img, 0, 0)
  const sc = R.sil.getContext('2d')
  sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalCompositeOperation = 'source-over'
  sc.clearRect(0, 0, R.sil.width, R.sil.height)
  sc.drawImage(R.c, 0, 0)
  sc.globalCompositeOperation = 'source-in'
  sc.fillStyle = '#fff'; sc.fillRect(0, 0, R.sil.width, R.sil.height)
}

async function prepare() {
  S.hero = await A.loadRemy(CAST.HERO, false); deSword(S.hero, 1)
  S.heroFar = await A.loadRemy(CAST.HERO, true); deSword(S.heroFar, 52 / 76)
  S.vil = await A.loadRemy(CAST.VILLAIN, false)
  S.civ = await A.loadRemy(CAST.CIV, false)
  S.walkers = await Promise.all([12, 24, 33, 55, 70].map((i) => A.loadRemy(i, true)))
  S.heads = await A.loadHeads()
  S.hIcon = A.headIcon(S.heads, CAST.HERO, 3)
  S.vIcon = A.headIcon(S.heads, CAST.VILLAIN, 3)
  // bakes
  S.skyDay = ART.skyBake(PAL.day)
  S.skySun = ART.skyBake(PAL.sun)
  S.raysGold = ART.raysBake('#e8cf7e', 5)
  S.raysWhite = ART.raysBake('#f4f1ea', 9)
  S.paper = ART.paperBake()
  S.museum = ART.museumBake()
  S.benGold = ART.benTile(12, 'rgba(184,138,46,0.5)', 3.4)
  S.benRed = ART.benTile(10, 'rgba(214,36,60,0.4)', 2.8)
  S.patGold = S.benGold.getContext('2d').createPattern(S.benGold, 'repeat')
  S.patRed = S.benRed.getContext('2d').createPattern(S.benRed, 'repeat')
  S.patPaper = S.benGold.getContext('2d').createPattern(S.paper, 'repeat')
  // the world frame
  S.frame = A.canvas(ART.AW, ART.AH); S.frameCtx = S.frame.getContext('2d')
  // desaturated flow-sense palette (gold pops over it)
  S.palFS = {
    ...PAL.day, far: '#9aa4b4', mid: '#74808f', near: '#4a5468', nearLit: '#5a6478',
    winLit: '#c8c8b0', winDim: '#333c4c', street: '#2a3040', groundLine: '#1c2230',
  }
}

// =================================================================================
// CAMERA / FRAME helpers (hairyweight-proven shapes)
// =================================================================================
function frameCtx() {
  const x = S.frameCtx
  x.setTransform(1, 0, 0, 1, 0, 0)
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'
  x.imageSmoothingEnabled = false
  return x
}
function shakeAt(t) {
  let sx = 0, sy = 0
  for (const s of SHAKES) {
    const dd = t - s.real
    if (dd < 0 || dd > 0.5) continue
    const k = s.amp * Math.exp(-dd * s.decay)
    sx += Math.sin(t * 67 + s.real * 13) * k
    sy += Math.cos(t * 53 + s.real * 7) * k * 0.6
  }
  return [sx, sy]
}
function clampCam(cam) {
  const hw = W / 2 / cam.zoom, hh = H / 2 / cam.zoom
  cam.x = clamp(cam.x, hw - ART.OVER_X, ART.AW - ART.OVER_X - hw)
  cam.y = clamp(cam.y, hh - ART.OVER_Y, ART.AH - ART.OVER_Y - hh)
  return cam
}
function blit(ctx, cam, t) {
  const [shx, shy] = shakeAt(t)
  ctx.save()
  ctx.fillStyle = '#0b0a12'; ctx.fillRect(0, 0, W, H)
  ctx.translate(W / 2 + shx, H / 2 + shy)
  ctx.scale(cam.zoom, cam.zoom)
  ctx.translate(-cam.x, -cam.y)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(S.frame, -ART.OVER_X, -ART.OVER_Y)
  ctx.restore()
}
// static-scene camera: zoom/pan about a centre, world-free shots
function camBegin(ctx, zoom, cx = 960, cy = 540, t = 0) {
  const [shx, shy] = shakeAt(t)
  ctx.save()
  ctx.fillStyle = '#0b0a12'; ctx.fillRect(0, 0, W, H)
  ctx.translate(W / 2 + shx, H / 2 + shy)
  ctx.scale(zoom, zoom)
  ctx.translate(-cx, -cy)
}
const camEnd = (ctx) => ctx.restore()

// =================================================================================
// SHARED PAINTERS
// =================================================================================
function drawSkyLayers(fc, pal, cam, zoom) {
  // sky stretched beyond the world's visible extremes on BOTH sides — a camera-clamp extreme
  // must never expose stale frame pixels from the previous shot (right-edge lesson)
  fc.drawImage(pal === PAL.sun ? S.skySun : S.skyDay, -ART.OVER_X - 500 - (cam.x - 960) * 0.06, -ART.OVER_Y - (cam.y - 540) * 0.1, ART.AW + 1000, 900 + ART.OVER_Y)
  for (const L of ART.CITY_LAYERS) ART.cityLayer(fc, L, pal, cam, zoom, 0)
  ART.cityGround(fc, pal, cam, zoom)
}
function speedStreaks(x, cx, cy, k, seed = 9, col = 'rgba(232,207,126,0.5)') {
  x.save(); x.globalAlpha = k; x.strokeStyle = col; x.lineWidth = 3
  for (let i = 0; i < 9; i++) {
    const a = hash(seed * 31 + i) * Math.PI * 2
    const r0 = 90 + hash(seed * 7 + i) * 60, r1 = r0 + 130 + k * 300
    x.beginPath()
    x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
    x.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
    x.stroke()
  }
  x.restore()
}
// The iconic hang: sprite INVERTED — feet at the strand, head dangling lowest. (The sprite's
// arms are at its sides, so a "hands at the rope" pose reads as floating; upside-down is both
// the canonical Spidey silhouette and what the rig anchors natively: feet at (x, y).)
// rot = -theta aligns the body with the rope through the arc.
function hangPose(fc, R, hx, hy, phi, o = {}) {
  A.drawRemy(fc, R, hx, hy, {
    upside: true, rot: phi, sx: o.sy ?? HS, sy: o.sy ?? HS,
    alpha: o.alpha, glow: o.glow ?? PAL.gold, glowA: o.glowA ?? 0.3, white: o.white,
  })
}
// hero hanging from a swing leg: strand + ghosts + inverted sprite + scalp strands
function drawSwingHero(fc, g, leg, t, opts = {}) {
  const p = swingPos(leg, g)
  const sag = 60 * (0.4 + 0.6 * Math.abs(p.th) / leg.TH0)
  ART.strand(fc, leg.ax, leg.ay, p.x, p.y, sag)
  if (!opts.noGhost)
    for (const [dg, a] of [[0.09, 0.16], [0.19, 0.08]]) {
      if (g - dg < leg.t0) continue
      const q = swingPos(leg, g - dg)
      hangPose(fc, S.hero, q.x, q.y, -q.th, { alpha: a, glowA: a * 0.5 })
    }
  hangPose(fc, S.hero, p.x, p.y, -p.th, { glowA: 0.32 })
  // scalp tuft on the dangling head (head sits ~L below the feet anchor)
  ART.scalpStrands(fc, p.x - Math.sin(p.th) * 20, p.y + Math.cos(p.th) * 212, p.th > 0 ? 1 : -1, t, 2, 20)
  return p
}
// villain riding the glider (+ dust)
function drawGoblin(fc, pos, t, o = {}) {
  ART.drawGlider(fc, pos.x, pos.y, pos.rot ?? 0, t, o)
  ART.gliderDust(fc, pos.x, pos.y, t, 4)
  A.drawRemy(fc, S.vil, pos.x + 6, pos.y - 8, { sx: VS, sy: VS, rot: (pos.rot ?? 0) * 0.7, glow: o.sil ? null : GOB.glow, glowA: 0.1 })
}
function goblinWrapPos(g) {
  const o = GOBLIN.orbit
  const pins = GOBLIN.volleyG.filter((tg) => g >= tg).length
  if (g >= 75.6) return { x: GOBLIN.hang.x, y: GOBLIN.hang.y, rot: GOBLIN.hang.rot }
  const rx = o.rx * (0.55 ** pins), ry = o.ry * (0.6 ** pins)
  const a = o.w0 + (g - 72) * o.spd
  return { x: o.cx + Math.cos(a) * rx, y: o.cy + Math.sin(a) * ry, rot: Math.sin(a * 2) * 0.18 }
}
// onomatopoeia (REAL time; blooms through freezes) — burst + double-inked slam
function paintOnos(ov, t) {
  for (const o of ONOS) {
    if (t < o.t || t > o.t + 0.34) continue
    const p = seg(t, o.t, o.t + 0.22)
    const st = ART.ONO_STYLE[o.kind]
    const k = Math.exp(-(t - o.t) * 4)
    ov.save()
    ov.globalAlpha = clamp(p * 5) * clamp((o.t + 0.34 - t) * 8)
    if (p < 1) ART.burst(ov, o.x, o.y, o.size * (0.7 + 0.5 * p), o.size * (1.25 + 0.4 * p), 9, Math.round(o.t * 97) % 89, st.burst, st.bstroke)
    ov.restore()
    for (const [dx, dy] of [[3, 3], [-3, 3], [3, -3], [-3, -3]])
      slam(ov, o.w, o.x + dx, o.y + dy, p, { size: o.size, color: st.stroke, track: 2, alpha: clamp(p * 5) * 0.9 })
    slam(ov, o.w, o.x, o.y, p, { size: o.size, color: st.fill, track: 2, alpha: clamp(p * 5), flash: o.kind !== 'flake' && p < 0.12 ? 0.5 : 0 })
    if (k > 0.5) speedStreaks(ov, o.x, o.y, (k - 0.5) * 0.6, Math.round(o.t * 13), 'rgba(255,255,255,0.35)')
  }
}
// comic caption boxes / chyron bars behind declarative captions (overlay, screen coords)
function paintCaptionFurniture(ov, t) {
  const box = (cap, pad, fill, rot = -0.02) => {
    const style = cap.style
    const w = measure(ov, cap.text, style.size ?? 30, style.font ?? F.anton, style.track ?? 0) * 1.16 + 12
    ov.save(); ov.translate(style.x ?? 96, (style.y ?? 152) - 16); ov.rotate(rot)
    ov.fillStyle = PAL.ink; ov.fillRect(-pad + 4, -40, w + pad * 2 + 8, 76)
    ov.fillStyle = fill; ov.fillRect(-pad, -46, w + pad * 2, 76)
    ov.strokeStyle = PAL.ink; ov.lineWidth = 3; ov.strokeRect(-pad, -46, w + pad * 2, 76)
    ov.restore()
  }
  if (t >= 0.65 && t <= 5.35) box(CAPTIONS[0], 26, PAL.paperWarm)
  if (t >= 6.65 && t <= 11.35) box(CAPTIONS[1], 26, PAL.paperWarm)
  if (t >= 58.4 && t <= 62.35) { // villain lower-third bar
    const w = Math.max(measure(ov, CAPTIONS[4].text, 40, F.anton, 2), measure(ov, CAPTIONS[5].text, 28, F.anton, 3))
    ov.save()
    ov.fillStyle = '#1a1030'; ov.fillRect(52, 928, w + 88, 116)
    ov.fillStyle = GOB.glow; ov.fillRect(52, 928, 8, 116)
    ov.restore()
  }
}

// =================================================================================
// SHOT 1 — museumExt (0–6)
// =================================================================================
function shMuseumExt(ctx, lt, dur, t) {
  const zoom = lerp(1.0, 1.08, E.outCubic(seg(lt, 0.5, 5.5)))
  camBegin(ctx, zoom, 960, 560, t)
  ctx.drawImage(S.museum, -140, -80)
  // marquee text (live, crisp)
  ctx.fillStyle = PAL.gold; ctx.textAlign = 'center'
  ctx.font = '400 52px Anton'
  ctx.fillText('MUSEUM OF NATURAL FLOW', 960, 388)
  // walkers climbing the steps (far sprites, phased)
  ctx.strokeStyle = PAL.ink
  for (let i = 0; i < S.walkers.length; i++) {
    const wx = 380 + ((i * 345 + t * 46) % 1400)
    const stepY = 1112 - Math.floor(((wx - 210) / 260)) * 0
    const ph = t * 7 + i * 2.2
    A.drawRemy(ctx, S.walkers[i], wx, 1112 - (i % 3) * 46, {
      stride: [Math.sin(ph) * 4, -Math.sin(ph) * 4], lift: [Math.max(0, Math.sin(ph)) * 3, Math.max(0, -Math.sin(ph)) * 3],
      sx: 2.1, sy: 2.1, flip: true,
    })
  }
  // two school buses at the curb
  for (const bx of [90, 1520]) {
    ctx.fillStyle = '#f2b830'; ctx.fillRect(bx, 1010, 300, 96)
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 5; ctx.strokeRect(bx, 1010, 300, 96)
    ctx.fillStyle = '#1a1826'
    for (let i = 0; i < 4; i++) ctx.fillRect(bx + 26 + i * 62, 1030, 40, 26)
    ctx.fillRect(bx + 110, 1122, 60, 22); ctx.fillRect(bx + 210, 1122, 60, 22)
  }
  camEnd(ctx)
}

// =================================================================================
// SHOT 2 — tripPanel (6–12): 2-panel page, panelPush at 9
// =================================================================================
function panelCase(x, caseGlint) {
  // exhibit hall back wall + case
  x.fillStyle = '#c8d8e0'; x.fillRect(0, 0, 1780, 520)
  x.fillStyle = '#b0c4d0'
  for (let i = 0; i < 12; i++) x.fillRect(i * 150, 60, 6, 460)
  x.fillStyle = '#9ab0be'; x.fillRect(0, 470, 1780, 50)
  // the case
  x.fillStyle = PAL.ink; x.fillRect(560, 120, 660, 330)
  x.fillStyle = '#eaf4f8'; x.fillRect(576, 136, 628, 298)
  x.fillStyle = 'rgba(120,200,230,0.35)'; x.fillRect(576, 136, 628, 298)
  // the louse model inside — huge, glowing
  ART.drawLouse(x, 890, 300, 6.5, 0, { glow: GOB.glow })
  // glass shine
  x.fillStyle = 'rgba(255,255,255,0.45)'
  x.beginPath(); x.moveTo(640, 434); x.lineTo(820, 136); x.lineTo(900, 136); x.lineTo(720, 434); x.closePath(); x.fill()
  if (caseGlint > 0) {
    x.save(); x.globalAlpha = caseGlint
    ART.burst(x, 1010, 210, 6, 16, 5, 31, PAL.goldHi, PAL.goldDeep)
    x.restore()
  }
  x.strokeStyle = PAL.ink; x.lineWidth = 8; x.strokeRect(560, 120, 660, 330)
  // placard
  x.fillStyle = PAL.paperWarm; x.fillRect(660, 452, 460, 44)
  x.strokeRect(660, 452, 460, 44)
  txt(x, 'THE RADIOACTIVE HAIR LOUSE — DO NOT TAP GLASS', 890, 482, { size: 24, font: F.anton, color: PAL.ink, align: 'center' })
}
function panelHall(x, t) {
  x.fillStyle = '#e2d0b8'; x.fillRect(0, 0, 1780, 380)
  x.fillStyle = '#cbb89a'
  for (let i = 0; i < 9; i++) x.fillRect(i * 200 + 60, 0, 8, 380)
  x.fillStyle = '#a89070'; x.fillRect(0, 330, 1780, 50)
  // class ahead (small, far) + hero lagging with homework
  for (let i = 0; i < 3; i++)
    A.drawRemy(x, S.walkers[i + 2], 1150 + i * 130, 330, { sx: 1.7, sy: 1.7, flip: true, stride: [Math.sin(t * 7 + i) * 4, -Math.sin(t * 7 + i) * 4] })
  A.drawRemy(x, S.hero, 380, 344, {
    sx: 1.9, sy: 1.9, flip: true, lean: 0.01,
    stride: [Math.sin(t * 4.2) * 3, -Math.sin(t * 4.2) * 3],
  })
  // homework page in his paw
  x.save(); x.translate(430, 268); x.rotate(-0.12 + Math.sin(t * 2) * 0.05)
  x.fillStyle = '#ffffff'; x.fillRect(-16, -20, 34, 42)
  x.strokeStyle = PAL.ink; x.lineWidth = 2.5; x.strokeRect(-16, -20, 34, 42)
  x.strokeStyle = '#9ab0be'; x.lineWidth = 2
  for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-10, -10 + i * 8); x.lineTo(10, -10 + i * 8); x.stroke() }
  x.restore()
  ART.halftone(x, 1300, 0, 480, 380, 16, 'rgba(90,100,114,0.5)', 0.5, 21)
}
function shTripPanel(ctx, lt, dur, t) {
  ctx.fillStyle = '#0b0a12'; ctx.fillRect(0, 0, W, H)
  ctx.drawImage(S.paper, 0, 0, W, H)
  const zoom = lerp(1.0, 1.03, seg(lt, 0, 6))
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2)
  const P1 = { x: 70, y: 90, w: 1780, h: 520 }, P2 = { x: 70, y: 640, w: 1780, h: 380 }
  // both panels always on the page; the P2 beat at 9.0 is a punch-in emphasis, not a blank wait
  const em = E.outBack(clamp(seg(t, 9.0, 9.45) * 1.15))
  const p2s = 1 + 0.05 * (1 - em)
  ART.panelChrome(ctx, P1.x, P1.y, P1.w, P1.h)
  ctx.save(); ctx.translate(P1.x, P1.y)
  panelCase(ctx, t >= 7.42 && t < 7.92 ? Math.sin(Math.PI * seg(t, 7.42, 7.92)) : 0)
  // the class files past the case
  for (let i = 0; i < 4; i++)
    A.drawRemy(ctx, S.walkers[i], 180 + ((i * 330 + t * 52) % 620), 470, {
      sx: 2.0, sy: 2.0, flip: true,
      stride: [Math.sin(t * 7 + i * 1.9) * 4, -Math.sin(t * 7 + i * 1.9) * 4],
    })
  ctx.restore(); ctx.restore()
  ctx.save()
  ctx.translate(P2.x + P2.w / 2, P2.y + P2.h / 2); ctx.scale(p2s, p2s); ctx.translate(-(P2.x + P2.w / 2), -(P2.y + P2.h / 2))
  ART.panelChrome(ctx, P2.x, P2.y, P2.w, P2.h)
  ctx.save(); ctx.translate(P2.x, P2.y)
  panelHall(ctx, t)
  ctx.restore(); ctx.restore()
  ctx.restore()
  ctx.restore()
}

// =================================================================================
// SHOT 3 — bite (12–15): CU hand + descending louse, SNAP at g 13.5
// =================================================================================
function shBite(ctx, lt, dur, t, ov) {
  const g = warpG(t)
  const zoom = lerp(1.0, 1.35, E.outCubic(seg(lt, 0.3, 2.5)))
  camBegin(ctx, zoom, 1020, 620, t)
  // bokeh exhibit background
  ctx.fillStyle = '#1c2a3a'; ctx.fillRect(-200, -200, W + 400, H + 400)
  for (let i = 0; i < 14; i++) {
    const bx = 120 + hash(i * 31) * 1700, by = 80 + hash(i * 17) * 900, br = 26 + hash(i * 7) * 66
    ctx.globalAlpha = 0.1 + hash(i * 3) * 0.16
    ctx.fillStyle = i % 3 ? '#3a5a78' : '#2e4a60'
    ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill()
  }
  ctx.globalAlpha = 1
  // the hand — open palm up, from bottom-left. Fingers + thumb drawn BEHIND the palm so
  // their roots tuck under it (no detached-thumb / crossed-outline reads)
  const hx = 760, hy = 800
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.14)
  const finger = (i) => {
    ctx.beginPath(); ctx.ellipse(-118 + i * 62, -104 - (i === 1 || i === 2 ? 14 : 0), 27, 62, -0.16 + i * 0.1, 0, 7)
    ctx.fillStyle = '#d0bdb1'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = PAL.ink; ctx.stroke()
  }
  ctx.beginPath(); ctx.ellipse(96, -18, 30, 66, 0.5, 0, 7); ctx.fillStyle = '#d0bdb1'; ctx.fill()
  ctx.lineWidth = 7; ctx.strokeStyle = PAL.ink; ctx.stroke()
  for (let i = 0; i < 4; i++) finger(i)
  ctx.beginPath(); ctx.ellipse(0, 0, 150, 96, 0, 0, 7)
  ctx.fillStyle = '#d0bdb1'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = PAL.ink; ctx.stroke()
  // knuckle creases
  ctx.strokeStyle = 'rgba(25,20,35,0.35)'; ctx.lineWidth = 4
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-80 + i * 62, -60); ctx.quadraticCurveTo(-70 + i * 62, -44, -80 + i * 62, -30); ctx.stroke() }
  ART.halftone(ctx, 40, 30, 180, 150, 12, 'rgba(90,100,114,0.55)', 0.55, 3) // shadow-side dots
  // golden spark crawling under the skin after the bite
  if (g > 14.25) {
    const su = seg(g, 14.25, 15.0)
    const sx2 = -60 + Math.cos(su * 9) * 70, sy2 = -20 + Math.sin(su * 9) * 34
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = 'rgba(232,207,126,0.8)'
    ctx.beginPath(); ctx.arc(sx2, sy2, 7, 0, 7); ctx.fill()
    ctx.fillStyle = 'rgba(255,243,196,0.5)'
    ctx.beginPath(); ctx.arc(sx2, sy2, 14, 0, 7); ctx.fill()
    ctx.restore()
  }
  ctx.restore()
  // silk thread + louse descending onto the BACK of the hand
  const louseY = lerp(-80, hy - 150, E.inQuad(seg(g, 12.1, 13.44)))
  const swayX = Math.sin(g * 1.3) * 26
  ctx.strokeStyle = '#e8e4da'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(hx + 130 + swayX * 1.6, -80); ctx.quadraticCurveTo(hx + 150 + swayX, louseY - 260, hx + 118 + swayX, louseY - 20); ctx.stroke()
  const bitten = g >= 13.5
  ART.drawLouse(ctx, hx + 96 + (bitten ? 0 : swayX), louseY, 4.2, t, { glow: GOB.glow, dir: -1, rot: bitten ? -0.34 : 0 })
  if (bitten && t < 13.95) {
    const k = Math.exp(-(t - 13.5) * 7)
    speedStreaks(ctx, hx + 96, louseY, k, 13)
  }
  camEnd(ctx)
}

// =================================================================================
// SHOT 4 — transform (15–21): backlit hero, strands rise per beat, TITLE at 16.5
// =================================================================================
function shTransform(ctx, lt, dur, t, ov) {
  const g = warpG(t)
  const zoom = lerp(1.05, 1.22, E.inOutCubic(seg(lt, 0, 6)))
  camBegin(ctx, zoom, 960, 520, t)
  ctx.fillStyle = '#100a1e'; ctx.fillRect(-300, -300, W + 600, H + 600)
  // rotating gold rays behind
  ctx.save(); ctx.translate(960, 470); ctx.rotate(t * 0.22); ctx.globalAlpha = 0.5
  ctx.drawImage(S.raysGold, -700, -700); ctx.restore()
  // halo ring centred on the head, well outside it
  if (g > 17.25) {
    const hu = seg(g, 17.25, 18.4)
    ctx.strokeStyle = `rgba(232,207,126,${0.7 * (1 - hu * 0.5)})`; ctx.lineWidth = 10
    ctx.beginPath(); ctx.arc(960, 620, 330 + hu * 90, 0, 7); ctx.stroke()
  }
  // warm backlight so the backlit hero reads at full contrast
  const bg = ctx.createRadialGradient(960, 640, 60, 960, 640, 420)
  bg.addColorStop(0, 'rgba(255,220,150,0.55)'); bg.addColorStop(1, 'rgba(255,220,150,0)')
  ctx.fillStyle = bg; ctx.fillRect(400, 220, 1120, 860)
  // the hero, backlit centre
  A.drawRemy(ctx, S.hero, 960, 830, { sx: 2.6, sy: 2.6, glow: PAL.gold, glowA: 0.6 })
  // strands rise off the scalp one per beat: 16.5 / 17.25 / 18.0 / 18.75
  const headX = 960, headY = 830 - 101 * 2.6
  for (let i = 0; i < 4; i++) {
    const ei = 16.5 + i * 0.75
    const pu = seg(g, ei, ei + 0.7)
    if (pu <= 0) continue
    const ang = -Math.PI / 2 + (i - 1.5) * 0.42
    const len = 300 * E.outCubic(pu)
    const settle = seg(g, 19.5, 21.0) // settle into a living ponytail
    const tipX = headX + Math.cos(ang) * len + settle * Math.sin(t * 2.4 + i) * 26
    const tipY = headY + Math.sin(ang) * len * (1 - settle * 0.35) + settle * 30
    ctx.strokeStyle = i & 1 ? PAL.gold : PAL.strandHi; ctx.lineWidth = 6; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(headX + (i - 1.5) * 8, headY - 6)
    ctx.quadraticCurveTo(headX + Math.cos(ang) * len * 0.5 + 30, headY + Math.sin(ang) * len * 0.5, tipX, tipY)
    ctx.stroke()
  }
  // title starburst on the overlay (caption text draws above it)
  if (t >= 16.5 && t < 18.2) {
    const p = seg(t, 16.5, 17.15)
    ov.save(); ov.globalAlpha = clamp((18.2 - t) * 1.4) * 0.9
    ART.burst(ov, 960, 430, 430 * E.outCubic(p) + 120, 620 * E.outCubic(p) + 170, 12, 5, 'rgba(232,207,126,0.9)', '#191423')
    ov.restore()
  }
  camEnd(ctx)
}

// =================================================================================
// SHOT 5 — mirror (21–24): the ponytail has a mind of its own
// =================================================================================
function shMirror(ctx, lt, dur, t, ov) {
  const g = warpG(t)
  camBegin(ctx, 1.02, 960, 540, t)
  // tiled bathroom
  ctx.fillStyle = '#cfe0e8'; ctx.fillRect(-40, -40, W + 80, H + 80)
  ctx.strokeStyle = 'rgba(25,20,35,0.16)'; ctx.lineWidth = 3
  for (let i = 0; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(i * 170 - 40, -40); ctx.lineTo(i * 170 - 40, H + 40); ctx.stroke() }
  for (let j = 0; j <= 7; j++) { ctx.beginPath(); ctx.moveTo(-40, j * 170 - 40); ctx.lineTo(W + 40, j * 170 - 40); ctx.stroke() }
  ctx.fillStyle = '#b0c8d4'; ctx.fillRect(-40, 920, W + 80, 240)
  ctx.fillStyle = '#8aa8b8'; ctx.fillRect(-40, 920, W + 80, 14)
  // mirror
  const mx = 1290, my = 200, mw = 430, mh = 520
  ctx.fillStyle = PAL.goldDeep; ctx.beginPath(); ctx.ellipse(mx + mw / 2, my + mh / 2, mw / 2 + 34, mh / 2 + 34, 0, 0, 7); ctx.fill()
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 7; ctx.stroke()
  ctx.save(); ctx.beginPath(); ctx.ellipse(mx + mw / 2, my + mh / 2, mw / 2, mh / 2, 0, 0, 7); ctx.clip()
  ctx.fillStyle = '#aac8d8'; ctx.fillRect(mx, my, mw, mh)
  // reflection: hero facing us (in the mirror), clearly dimmer + cooler than the real one
  A.drawRemy(ctx, S.hero, mx + mw / 2 + 20, my + mh - 24, { sx: 1.9, sy: 1.9, alpha: 0.62, flip: true })
  ctx.fillStyle = 'rgba(120,160,190,0.22)'
  ctx.fillRect(mx, my, mw, mh)
  // reflection's ponytail moves on its own
  const rHeadX = mx + mw / 2 + 20, rHeadY = my + mh - 24 - 108 * 1.9
  ART.scalpStrands(ctx, rHeadX, rHeadY, 1, t, 3, 24)
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  ctx.beginPath(); ctx.moveTo(mx, my + mh); ctx.lineTo(mx + mw, my); ctx.lineTo(mx + mw, my + mh); ctx.closePath(); ctx.fill()
  ctx.restore()
  // the real hero (back to us) — his hair is ALIVE; a breathing bob keeps the hold alive
  const hx = 940, hfeet = 980 - Math.sin(t * 2.1) * 3
  A.drawRemy(ctx, S.hero, hx, hfeet, { sx: 2.1, sy: 2.1, lean: Math.sin(t * 1.1) * 0.006 })
  const headY = hfeet - 101 * 2.1
  ART.scalpStrands(ctx, hx + 8, headY, 1, t * 1.3, 4, 30)
  // at g 22.5 the reflex THWIP: a strand fires out and grabs the plunger
  if (g >= 22.5) {
    const pu = E.outCubic(seg(g, 22.5, 22.72))
    const sx2 = hx + 30, sy2 = headY + 6
    const ex = lerp(sx2, 1660, pu), ey = lerp(sy2, 716, pu)
    ART.strand(ctx, sx2, sy2, ex, ey, 24, { nub: false })
    // plunger wobbling on the strand tip
    const wob = g > 22.72 ? 0.4 * Math.exp(-(g - 22.72) * 1.6) * Math.cos((g - 22.72) * 11) : 0
    ctx.save(); ctx.translate(1660, 700 + (1 - pu) * -300); ctx.rotate(wob)
    ctx.fillStyle = '#b89058'; ctx.fillRect(-7, -120, 14, 120)
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4; ctx.strokeRect(-7, -120, 14, 120)
    ctx.fillStyle = '#c8402e'
    ctx.beginPath(); ctx.moveTo(-46, 0); ctx.quadraticCurveTo(-40, 52, 0, 56); ctx.quadraticCurveTo(40, 52, 46, 0); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 5; ctx.stroke()
    ctx.restore()
  } else {
    // plunger idle by the sink
    ctx.save(); ctx.translate(1660, 940); ctx.rotate(-0.06)
    ctx.fillStyle = '#b89058'; ctx.fillRect(-7, -120, 14, 120)
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4; ctx.strokeRect(-7, -120, 14, 120)
    ctx.fillStyle = '#c8402e'
    ctx.beginPath(); ctx.moveTo(-46, 0); ctx.quadraticCurveTo(-40, 52, 0, 56); ctx.quadraticCurveTo(40, 52, 46, 0); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 5; ctx.stroke()
    ctx.restore()
  }
  // sink
  ctx.fillStyle = '#f0f4f6'; ctx.beginPath(); ctx.ellipse(1440, 906, 190, 52, 0, Math.PI, 0); ctx.fill()
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 6; ctx.stroke()
  ctx.fillStyle = '#d8e2e8'; ctx.fillRect(1372, 906, 136, 130); ctx.strokeRect(1372, 906, 136, 130)
  camEnd(ctx)
}

// =================================================================================
// SHOT 6 — suitPanel (24–33): 3-panel suit-up page
// =================================================================================
function shSuitPanel(ctx, lt, dur, t) {
  ctx.fillStyle = '#0b0a12'; ctx.fillRect(0, 0, W, H)
  ctx.drawImage(S.paper, 0, 0, W, H)
  const zoom = lerp(1.0, 1.04, seg(lt, 0, 9))
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2)
  const P = [
    { x: 70, y: 90, w: 1040, h: 500 }, { x: 1150, y: 90, w: 700, h: 500 }, { x: 70, y: 630, w: 1780, h: 390 },
  ]
  // all three panels live on the page from the start; each gets a beat punch-in (24.3/27/30)
  const punch = (t0) => {
    const e = E.outBack(clamp(seg(t, t0, t0 + 0.45) * 1.15))
    return 1 + 0.05 * (1 - e)
  }
  const drawP = (i, s, painter) => {
    const p = P[i], cx = p.x + p.w / 2, cy = p.y + p.h / 2
    ctx.save()
    ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy)
    ART.panelChrome(ctx, p.x, p.y, p.w, p.h)
    ctx.save(); ctx.translate(p.x, p.y)
    painter(ctx, t)
    ctx.restore(); ctx.restore()
    ctx.restore()
  }
  drawP(0, punch(24.3), panelSew)
  drawP(1, punch(27.0), panelSpray)
  drawP(2, punch(30.0), panelReveal)
  ctx.restore()
}
function panelSew(x, t) {
  x.fillStyle = '#e8dcc8'; x.fillRect(0, 0, 1040, 500)
  x.fillStyle = '#d8ccb4'; x.fillRect(0, 380, 1040, 120)
  // hero hunched behind the table (torso + head)
  A.drawRemy(x, S.hero, 420, 388, { sx: 1.7, sy: 1.7, lean: 0.06 })
  // table
  x.fillStyle = '#a87848'; x.fillRect(150, 330, 760, 26)
  x.strokeStyle = PAL.ink; x.lineWidth = 5; x.strokeRect(150, 330, 760, 26)
  x.fillStyle = '#8a5a30'; x.fillRect(190, 356, 20, 120); x.fillRect(850, 356, 20, 120)
  // sewing machine, needle running while the montage is active
  const run = t < 26.7
  x.fillStyle = '#3a3e50'; x.fillRect(560, 240, 240, 92)
  x.strokeStyle = PAL.ink; x.lineWidth = 5; x.strokeRect(560, 240, 240, 92)
  x.save(); x.translate(640, 262)
  x.rotate(run ? t * 12 : 0.4)
  x.strokeStyle = PAL.ink; x.lineWidth = 8
  x.beginPath(); x.arc(0, 0, 20, 0, 7); x.stroke()
  x.strokeStyle = PAL.gold; x.lineWidth = 4
  x.beginPath(); x.moveTo(0, -20); x.lineTo(0, 20); x.moveTo(-20, 0); x.lineTo(20, 0); x.stroke()
  x.restore()
  const needle = run ? Math.sin(t * 24) * 14 : 0
  x.strokeStyle = PAL.ink; x.lineWidth = 6
  x.beginPath(); x.moveTo(720, 330); x.lineTo(720, 364 + needle); x.stroke()
  // fabric roll feeding through
  x.fillStyle = PAL.red
  x.beginPath(); x.moveTo(320, 344); x.quadraticCurveTo(520, 328 + Math.sin(t * 6) * 6, 720, 344); x.lineTo(720, 356); x.quadraticCurveTo(520, 340 + Math.sin(t * 6) * 6, 320, 356); x.closePath(); x.fill()
  x.strokeStyle = PAL.ink; x.lineWidth = 3; x.stroke()
  // scissors + thread spool
  x.save(); x.translate(252, 322); x.rotate(-0.3)
  x.strokeStyle = '#5a6472'; x.lineWidth = 7; x.lineCap = 'round'
  x.beginPath(); x.moveTo(-16, -20); x.lineTo(10, 14); x.moveTo(22, -24); x.lineTo(-6, 14); x.stroke()
  x.strokeStyle = PAL.goldDeep; x.lineWidth = 4
  x.beginPath(); x.arc(-8, 20, 8, 0, 7); x.arc(16, 20, 8, 0, 7); x.stroke()
  x.restore()
  x.fillStyle = PAL.goldDeep; x.fillRect(880, 300, 34, 30); x.strokeRect(880, 300, 34, 30)
  ART.halftone(x, 700, 0, 340, 240, 14, 'rgba(90,100,114,0.45)', 0.5, 8)
}
function panelSpray(x, t) {
  x.fillStyle = '#2a2036'; x.fillRect(0, 0, 700, 500)
  // spray light cone
  x.save(); x.globalAlpha = 0.2 + 0.06 * Math.sin(t * 18)
  const grd = x.createRadialGradient(560, 380, 10, 560, 380, 420)
  grd.addColorStop(0, '#ffe9ad'); grd.addColorStop(1, 'rgba(255,233,173,0)')
  x.fillStyle = grd; x.fillRect(0, 0, 700, 500)
  x.restore()
  // the chest emblem being stencilled — SR-42
  const pu = seg(t, 27.3, 29.4)
  x.save(); x.translate(300, 240)
  x.beginPath(); x.arc(0, 0, 150, 0, 7)
  x.fillStyle = PAL.red; x.fill(); x.strokeStyle = PAL.ink; x.lineWidth = 7; x.stroke()
  if (pu > 0) {
    x.save(); x.beginPath(); x.arc(0, 0, 128, 0, 7); x.clip()
    x.fillStyle = PAL.goldHi
    for (let i = 0; i < 210; i++) {
      const a = hash(i * 31) * Math.PI * 2, r = hash(i * 17) * 128
      if (hash(i * 7) > pu * 1.05) continue
      x.beginPath(); x.arc(Math.cos(a) * r, Math.sin(a) * r, 2 + hash(i * 3) * 3, 0, 7); x.fill()
    }
    txt(x, 'SR-42', 0, 34, { size: 84, font: F.anton, color: pu > 0.7 ? PAL.ink : 'rgba(25,20,35,0.4)', align: 'center', track: 2 })
    x.restore()
  }
  x.restore()
  // spray can in the foreground corner
  x.save(); x.translate(580, 400); x.rotate(-0.5)
  x.fillStyle = '#d8dde2'; x.fillRect(-34, -110, 68, 110)
  x.fillStyle = PAL.red; x.fillRect(-34, -110, 68, 34)
  x.strokeStyle = PAL.ink; x.lineWidth = 5; x.strokeRect(-34, -110, 68, 110)
  x.fillStyle = PAL.ink; x.fillRect(-12, -128, 24, 20)
  x.restore()
  // mist particles at the cone edge
  if (pu > 0 && pu < 1)
    for (let i = 0; i < 8; i++) {
      const mr = hash(i * 13 + Math.floor(t * 14)) * 90
      x.globalAlpha = 0.3
      x.fillStyle = '#ffe9ad'
      x.beginPath(); x.arc(470 + hash(i * 7) * 80 - mr * 0.4, 330 - hash(i * 3) * 120 + mr * 0.5, 3 + hash(i) * 4, 0, 7); x.fill()
    }
  x.globalAlpha = 1
}
function panelReveal(x, t) {
  // mini skyline dusk
  x.fillStyle = '#8a5470'; x.fillRect(0, 0, 1780, 390)
  x.fillStyle = '#6a3e58'
  for (let i = 0; i < 9; i++) x.fillRect(i * 210 - 40, 90 + hash(i * 11) * 80, 150, 300)
  x.fillStyle = '#ffd9a0'
  for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) if (hash(i * 13 + j * 7) > 0.6) x.fillRect(i * 210 - 20 + j * 20, 130 + hash(i + j * 3) * 200, 10, 13)
  // roof ledge
  x.fillStyle = '#2a1e30'; x.fillRect(0, 316, 1780, 74)
  x.strokeStyle = PAL.ink; x.lineWidth = 5; x.strokeRect(-10, 316, 1800, 74)
  // the suited hero — goggles + emblem
  const pose = E.outCubic(seg(t, 30.4, 31.4))
  x.save(); x.translate(420, 316); x.rotate((1 - pose) * 0.08)
  A.drawRemy(x, S.hero, 0, 0, { sx: 1.9, sy: 1.9, lean: 0.02 + Math.sin(t * 1.7) * 0.008 })
  ART.drawGoggles(x, 0, 0, 1.9, false)
  ART.drawEmblem(x, 0, 0, 1.9)
  x.restore()
  // strand curled overhead like a question mark
  const curl = seg(t, 30.8, 31.8)
  x.strokeStyle = PAL.gold; x.lineWidth = 5; x.lineCap = 'round'
  x.beginPath(); x.moveTo(430, 210)
  x.quadraticCurveTo(500, 120 * curl + 210 * (1 - curl), 560, 130 + Math.sin(t * 2.2) * 8)
  x.quadraticCurveTo(600, 140, 570, 190 + Math.sin(t * 2.2) * 6)
  x.stroke()
  // lens glint at 31.5
  if (t >= 31.5 && t < 32.1) {
    const gk = Math.sin(Math.PI * seg(t, 31.5, 32.1))
    ART.burst(x, 408, 116, 4 + gk * 10, 8 + gk * 22, 5, 51, PAL.goldHi, PAL.goldDeep)
  }
  // wind lines
  x.strokeStyle = 'rgba(255,255,255,0.3)'; x.lineWidth = 3
  for (let i = 0; i < 3; i++) {
    const wy = 120 + i * 60, wob = Math.sin(t * 3 + i) * 8
    x.beginPath(); x.moveTo(900 + i * 240 + wob, wy); x.lineTo(1120 + i * 240 + wob, wy); x.stroke()
  }
  txt(x, 'WITH GREAT HAIR...', 1320, 120, { size: 44, font: F.anton, color: PAL.paperWarm, align: 'center', track: 2 })
}

// =================================================================================
// SHOT 7 — firstThwip (33–36)
// =================================================================================
function shFirstThwip(ctx, lt, dur, t, ov) {
  const g = warpG(t)
  const cam = clampCam({
    x: lerp(620, 560, seg(lt, 2.5, 3)), y: lerp(560, 520, seg(lt, 2.2, 3)),
    zoom: lerp(1.0, 0.96, seg(lt, 2.2, 3)),
  })
  const fc = frameCtx()
  fc.translate(ART.OVER_X, ART.OVER_Y)
  drawSkyLayers(fc, PAL.day, cam, cam.zoom)
  ART.drawTower(fc, 380, 300, 560, 'FLOW & CO')
  // wind lines
  fc.strokeStyle = 'rgba(255,255,255,0.25)'; fc.lineWidth = 3
  for (let i = 0; i < 4; i++) {
    const wy = 300 + i * 90, wob = Math.sin(t * 2.6 + i) * 12
    fc.beginPath(); fc.moveTo(700 + i * 300 + wob, wy); fc.lineTo(920 + i * 300 + wob, wy); fc.stroke()
  }
  // hero aims up; strand fires at g 34.5; yank at 34.64
  const aim = seg(g, 33.4, 34.3)
  const launch = seg(g, 34.64, 36.0)
  if (g < 34.64) {
    A.drawRemy(fc, S.hero, 520, 560 - Math.sin(t * 2.3) * 2, {
      sx: HS, sy: HS, lean: -0.05 * aim, rot: -0.06 * aim, glow: PAL.gold, glowA: 0.25,
      stride: [Math.sin(t * 1.4) * 1.5, -Math.sin(t * 1.4) * 1.5],
    })
    ART.drawGoggles(fc, 520, 560, HS, false)
    const headY = 560 - 101 * HS
    ART.scalpStrands(fc, 520, headY, 1, t, 3, 24, g > 34.2 ? { x: SWINGS.A.ax, y: SWINGS.A.ay } : null)
  } else {
    // ballistic yank toward leg A's entry point (feet to the strand, iconic)
    const q = swingPos(SWINGS.A, 36.0)
    const u = E.inQuad(launch)
    const px = lerp(520, q.x, u), py = lerp(560, q.y, u) - Math.sin(u * Math.PI) * 120
    ART.strand(fc, SWINGS.A.ax, SWINGS.A.ay, px, py, 40)
    hangPose(fc, S.hero, px, py, lerp(0.2, 0.62, u), { glowA: 0.4 })
    speedStreaks(fc, px, py, clamp(launch * 1.6), 21)
  }
  if (g >= 34.5) { // the strand itself, snapping taut
    const su = E.outCubic(seg(g, 34.5, 34.64))
    const ex = lerp(545, SWINGS.A.ax, su), ey = lerp(470, SWINGS.A.ay, su)
    if (g < 34.64) ART.strand(fc, 545, 470, ex, ey, 8, { nub: false })
  }
  blit(ctx, clampCam({ x: lerp(620, 560, seg(lt, 2.5, 3)), y: lerp(560, 520, seg(lt, 2.2, 3)), zoom: lerp(1.0, 0.96, seg(lt, 2.2, 3)) }), t)
}

// =================================================================================
// SHOT 8 — swing1 (36–45): three half-swings + rooftop land
// =================================================================================
function shSwing1(ctx, lt, dur, t) {
  const g = warpG(t)
  const camX = clamp(lerp(700, 1850, E.inOutCubic(seg(g, 36, 44.6))), 0, 1e9)
  const cam = clampCam({ x: camX, y: lerp(560, 660, seg(g, 36, 44.6)), zoom: 0.95 })
  const fc = frameCtx()
  fc.translate(ART.OVER_X, ART.OVER_Y)
  drawSkyLayers(fc, PAL.day, cam, cam.zoom)
  // scaffold foreshadow at street centre + landing tower
  ART.drawScaffold(fc, Math.min(g, 44.6))
  ART.drawTower(fc, 1930, 300, 540, 'HART TOWERS')
  let hero = null
  if (g < 44.25) {
    const leg = g < 39 ? SWINGS.A : g < 42 ? SWINGS.B : SWINGS.C
    hero = drawSwingHero(fc, g, leg, t)
  } else {
    // release flight + rooftop land-and-roll (roll runs RIGHT, staying on the roof slab)
    const u = seg(g, 44.25, 44.65)
    if (u < 1) {
      const q = swingPos(SWINGS.C, 44.25)
      const px = lerp(q.x, LAND_C.x, E.outQuad(u)), py = lerp(q.y, LAND_C.y, u) - Math.sin(u * Math.PI) * 90
      hangPose(fc, S.hero, px, py, lerp(-0.35, -1.1, u), { glowA: 0.4 })
      speedStreaks(fc, px, py, 0.7, 23)
    } else {
      const roll = seg(g, 44.65, 45.0)
      const rx = lerp(LAND_C.x, LAND_C.x + 90, E.outCubic(roll))
      A.drawRemy(fc, S.hero, rx, LAND_C.y, {
        sx: HS, sy: HS, rot: roll < 0.7 ? (1 - roll / 0.7) * 1.1 : 0,
        stride: [Math.sin(g * 18) * 5 * (1 - roll), -Math.sin(g * 18) * 5 * (1 - roll)],
        glow: PAL.gold, glowA: 0.25,
      })
      if (roll >= 0.65) ART.drawGoggles(fc, rx, LAND_C.y, HS, false)
      if (roll < 0.5) { // landing dust at the feet
        for (let i = 0; i < 5; i++) {
          fc.globalAlpha = (0.5 - roll)
          fc.fillStyle = '#e8e4da'
          fc.beginPath(); fc.arc(rx + 40 + i * 34, LAND_C.y - 6 - hash(i * 7) * 14, 9 + hash(i) * 8, 0, 7); fc.fill()
        }
        fc.globalAlpha = 1
      }
    }
    ART.strand(fc, 2080, -90, LAND_C.x + 10, LAND_C.y - 240, 30)
  }
  blit(ctx, cam, t)
}

// =================================================================================
// SHOT 9 — rescue24 (45–51): scaffold collapse, the dive, the catch, the balcony
// =================================================================================
function shRescue24(ctx, lt, dur, t, ov) {
  const g = warpG(t)
  let cam
  if (t < 45.4) cam = { x: lerp(1900, 1800, seg(t, 45, 45.4)), y: lerp(560, 700, E.outCubic(seg(t, 45, 45.6))), zoom: 1.02 }
  else if (t < 48.4) cam = { x: 1800, y: 700, zoom: lerp(1.02, 1.12, E.outCubic(seg(t, 47.4, 48.3))) }
  else cam = { x: lerp(1800, 1720, seg(t, 48.4, 51)), y: lerp(700, 760, seg(t, 48.4, 51)), zoom: lerp(1.12, 1.0, seg(t, 48.5, 50)) }
  cam = clampCam(cam)
  const fc = frameCtx()
  fc.translate(ART.OVER_X, ART.OVER_Y)
  drawSkyLayers(fc, PAL.day, cam, cam.zoom)
  ART.drawScaffold(fc, g)
  ART.drawBalcony(fc)
  ART.drawTower(fc, 1930, 300, 540, 'HART TOWERS')
  // the falling civilian (pure parabola from g 45)
  let civPos = null
  if (g < 48.0) {
    const fu = seg(g, CIV.t0, 48.0)
    civPos = { x: CIV.x, y: CIV.yTop + (CIV.yBot - CIV.yTop) * fu * fu }
    A.drawRemy(fc, S.civ, civPos.x, civPos.y, { sx: CS, sy: CS, rot: Math.sin(g * 10) * 0.3, glow: '#ffffff', glowA: 0.25 })
    // panic strands (her hair)
    ART.scalpStrands(fc, civPos.x, civPos.y - 100 * CS, 1, t * 2, 3, 22)
  }
  // hero: roof reaction → headfirst dive → catch at (1960,850) → one smooth carry arc → balcony
  if (g < 46.6) {
    const ru = seg(g, 45.0, 46.6)
    A.drawRemy(fc, S.hero, LAND_C.x, LAND_C.y, { sx: HS, sy: HS, lean: -0.06 * ru, rot: -0.08 * ru, glow: PAL.gold, glowA: 0.25 })
    ART.drawGoggles(fc, LAND_C.x, LAND_C.y, HS, false)
  } else if (g < 48.0) {
    const u = Math.pow(seg(g, DIVE.t0, DIVE.t1), 1.5)
    const px = lerp(DIVE.x0, DIVE.x1, u), py = lerp(DIVE.y0, DIVE.y1, u)
    // strand trailing from the roof antenna to his feet (headfirst dive, down-left)
    ART.strand(fc, 1930 + 90, -90, px, py, 40)
    hangPose(fc, S.hero, px, py, 0.8, { glowA: 0.45 })
    speedStreaks(fc, px, py + 120, 0.8, 27)
  } else {
    // the catch (frozen at g 48 through the stop): one smooth damped arc to the balcony.
    // Carrying precious cargo: no oscillation — theta eases 0 → -0.20 and holds.
    const th = -0.20 * E.inOutCubic(seg(g, 48.0, 49.9))
    const px = 1540 + Math.sin(th) * 990, py = -140 + Math.cos(th) * 990
    ART.strand(fc, 1540, -140, px, py, 26)
    if (g < SETDOWN) {
      // the girl rides cradled against his dangling body, drawn first so the hero overlaps her
      A.drawRemy(fc, S.civ, px + 58, py + 252, { sx: CS, sy: CS, rot: 0.15 })
      hangPose(fc, S.hero, px, py, -th, { glowA: 0.35 })
    } else {
      // set down on the balcony; she salutes; he doesn't know what to do with his face
      A.drawRemy(fc, S.civ, CIV.balcony.x, CIV.balcony.y, {
        sx: CS, sy: CS, stride: [0, 2], lift: [0, 3],
      })
      const bob = Math.sin((g - SETDOWN) * 3) * 3
      A.drawRemy(fc, S.hero, CIV.balcony.x + 150, CIV.balcony.y + bob, {
        sx: HS, sy: HS, lean: 0.05, stride: [Math.sin((g - SETDOWN) * 2) * 2, -Math.sin((g - SETDOWN) * 2) * 2],
        glow: PAL.gold, glowA: 0.25,
      })
      ART.drawGoggles(fc, CIV.balcony.x + 150, CIV.balcony.y + bob, HS, false)
      // awkward sweat drop
      if (g >= 50.0) {
        fc.fillStyle = '#a8d8f0'
        fc.beginPath(); fc.ellipse(CIV.balcony.x + 208, CIV.balcony.y - 216 + Math.sin(g * 2) * 4, 5, 9, 0, 0, 7); fc.fill()
        fc.strokeStyle = PAL.ink; fc.lineWidth = 2; fc.stroke()
      }
      ART.strand(fc, 1540, -140, 1390, 690, 30)
    }
  }
  blit(ctx, cam, t)
}

// =================================================================================
// SHOT 10 — newsPanel (51–57): THE DAILY FLOW spins in
// =================================================================================
function shNewsPanel(ctx, lt, dur, t, ov) {
  ctx.fillStyle = '#0b0a12'; ctx.fillRect(0, 0, W, H)
  // spin-in
  const su = E.outCubic(seg(t, 51.0, 52.2))
  const scale = lerp(2.8, 1, su), rot = lerp(0.5, 0, su)
  const slamK = t >= 52.5 ? Math.exp(-(t - 52.5) * 12) : 0
  // after the slam the paper breathes: slow push-in + edge flutter so the shot never freezes
  const drift = t < 52.5 ? 1 : lerp(1, 1.06, E.inOutCubic(seg(t, 53, 57)))
  const flutter = t > 55.5 ? 0.012 * Math.sin((t - 55.5) * 7) + 0.004 * Math.sin(t * 13) : 0
  const bobY = t > 55.5 ? Math.sin((t - 55.5) * 5) * 3 : 0
  ctx.save()
  ctx.translate(W / 2, H / 2 + bobY)
  ctx.rotate(rot + flutter + slamK * 0.01)
  ctx.scale(scale * drift * (1 + slamK * 0.02), scale * drift * (1 - slamK * 0.03))
  ctx.translate(-W / 2, -H / 2)
  // the paper
  ctx.fillStyle = '#f2ecd9'; ctx.fillRect(180, 50, 1560, 980)
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 6; ctx.strokeRect(180, 50, 1560, 980)
  ctx.save(); ctx.beginPath(); ctx.rect(180, 50, 1560, 980); ctx.clip()
  ART.halftone(ctx, 180, 50, 1560, 980, 18, 'rgba(214,180,120,0.12)', 0.6, 9)
  // masthead
  txt(ctx, 'THE DAILY FLOW', 960, 190, { size: 110, font: F.anton, color: '#181420', align: 'center', track: 4 })
  ctx.fillStyle = '#181420'; ctx.fillRect(220, 214, 1480, 6); ctx.fillRect(220, 228, 1480, 3)
  txt(ctx, 'HAIR CITY  —  5¢  —  VOL. XXXI', 960, 262, { size: 26, font: F.mono, color: '#3a3630', align: 'center', track: 3 })
  // halftone photo: bald silhouette on a glider
  ctx.fillStyle = '#d8d2c0'; ctx.fillRect(220, 290, 600, 230)
  ctx.save(); ctx.beginPath(); ctx.rect(220, 290, 600, 230); ctx.clip()
  ctx.fillStyle = '#4a4640'; ctx.fillRect(220, 290, 600, 230)
  ART.drawGlider(ctx, 520, 440, -0.12, 0, { sil: true, s: 1.2 })
  A.drawRemy(ctx, S.vil, 528, 424, { sx: 1.4, sy: 1.4, white: true })
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#181420'
  for (let r = 0; r < 23; r++) for (let c = 0; c < 60; c++)
    if (hash(r * 61 + c) > 0.45) { ctx.beginPath(); ctx.arc(226 + c * 10, 296 + r * 10, 2.6, 0, 7); ctx.fill() }
  ctx.globalAlpha = 1
  ctx.restore()
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 5; ctx.strokeRect(220, 290, 600, 230)
  txt(ctx, 'SNAPPED OVER 5TH AVE — BALD, POLICE SAY', 520, 552, { size: 22, font: F.mono, color: '#3a3630', align: 'center' })
  // right column
  txt(ctx, 'MUSEUM LOUSE STILL AT LARGE', 1170, 330, { size: 40, font: F.anton, color: '#181420', align: 'center', track: 1 })
  ctx.fillStyle = '#9a948a'
  for (let l = 0; l < 8; l++) ctx.fillRect(870, 360 + l * 16, 600 - (l % 3) * 90, 7)
  txt(ctx, '"IT TOOK OUR BEST COMBS."', 1170, 520, { size: 30, font: F.anton, color: '#3a3630', align: 'center' })
  // headline band (the declarative caption lands centred in it)
  ctx.fillStyle = '#efe6cc'; ctx.fillRect(220, 566, 1480, 118)
  ctx.strokeStyle = '#181420'; ctx.lineWidth = 4; ctx.strokeRect(220, 566, 1480, 118)
  // grey body columns
  ctx.fillStyle = '#b0aa9e'
  for (let col = 0; col < 3; col++)
    for (let l = 0; l < 12; l++) ctx.fillRect(240 + col * 500, 720 + l * 22, 440 - (l % 4) * 60, 9)
  ctx.restore()
  // motion streaks while spinning in
  if (su < 1) speedStreaks(ctx, 960, 540, (1 - su) * 1.2, 33, 'rgba(255,255,255,0.5)')
  if (slamK > 0.4) { // dust puff off the edges when it slams flat
    ctx.save(); ctx.globalAlpha = (slamK - 0.4)
    for (const ex of [200, 1720]) for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#e8e4da'
      ctx.beginPath(); ctx.arc(ex + (ex < 960 ? -1 : 1) * (20 + i * 26), 540 + (i - 2) * 130, 16 + hash(i * 7) * 12, 0, 7); ctx.fill()
    }
    ctx.restore()
  }
  ctx.restore()
}

// =================================================================================
// SHOT 11 — goblinReveal (57–63)
// =================================================================================
function shGoblinReveal(ctx, lt, dur, t, ov) {
  const g = t // no stops in this window: g == rt
  const cam = clampCam({ x: 640, y: lerp(640, 600, seg(lt, 0, 6)), zoom: lerp(1.0, 1.15, E.inOutCubic(seg(lt, 0, 6))) })
  const fc = frameCtx()
  fc.translate(ART.OVER_X, ART.OVER_Y)
  drawSkyLayers(fc, PAL.sun, cam, cam.zoom)
  const u = E.outCubic(seg(g, 57, 60))
  const pos = { x: lerp(GOBLIN.reveal.x0, GOBLIN.reveal.x1, u), y: lerp(GOBLIN.reveal.y0, GOBLIN.reveal.y1, u) + Math.sin(g * 2.2) * 10 }
  const hover = g >= 60
  pos.rot = hover ? Math.sin(g * 1.5) * 0.06 : 0.08
  drawGoblin(fc, pos, t, { sil: g < 58.6 })
  // bored finger-drum: glider bobs, small ticks
  if (hover && g > 60.75) {
    const drum = Math.sin((g - 60.75) * 9)
    A.drawRemy(fc, S.vil, pos.x + 6, pos.y - 8, { sx: VS, sy: VS, rot: drum * 0.03, lean: drum * 0.012, glow: GOB.glow, glowA: 0.22 })
  }
  // first flake drifts past the lens at 62.25
  if (g > 62.25) {
    const fu = seg(g, 62.25, 63)
    fc.globalAlpha = 0.85 - fu * 0.5
    fc.fillStyle = '#f6f2e8'
    fc.beginPath(); fc.arc(1560 - fu * 260, 420 + fu * 300, 9 + fu * 6, 0, 7); fc.fill()
    fc.globalAlpha = 1
  }
  blit(ctx, cam, t)
}

// =================================================================================
// SHOT 12 — flakeBombs (63–66)
// =================================================================================
function shFlakeBombs(ctx, lt, dur, t) {
  const g = t
  const cam = clampCam({ x: lerp(900, 1750, seg(g, 63, 66)), y: 620, zoom: 0.98 })
  const fc = frameCtx()
  fc.translate(ART.OVER_X, ART.OVER_Y)
  drawSkyLayers(fc, PAL.sun, cam, cam.zoom)
  ART.drawLaundry(fc, t)
  ART.drawScaffold(fc, 99)
  const su = seg(g, GOBLIN.strafe.t0, GOBLIN.strafe.t1)
  const pos = { x: lerp(GOBLIN.strafe.x0, GOBLIN.strafe.x1, su), y: lerp(GOBLIN.strafe.y0, GOBLIN.strafe.y1, su) + Math.sin(g * 2.6) * 12, rot: Math.sin(g * 2.6) * 0.05 }
  drawGoblin(fc, pos, t)
  // the bombs
  for (const b of BOMBS) {
    const bt = g - b.g0
    if (bt < 0 || bt > 2.4) continue
    const bx = b.x0 + b.vx * bt, by = b.y0 + b.vy * bt * bt
    if (by < 1090) ART.drawBomb(fc, bx, by, bt * 9)
    else if (bt < 2.0) { // street impact puff
      const pu = seg(bt, 1.34, 1.9)
      if (pu > 0 && pu < 1) { ART.powderPuff(fc, bx, 1064, 30 + pu * 60, 1 - pu); ART.halftone(fc, bx - 70, 990, 140, 70, 12, 'rgba(90,100,114,0.4)', 0.5, b.g0) }
    }
  }
  ART.drawAwning(fc, t > 65.25 ? Math.min(1, (t - 65.25) * 2.4) : 0)
  // tiny far Remies scurrying on the street
  for (let i = 0; i < 3; i++) {
    const run = t * 90 + i * 320
    A.drawRemy(fc, S.walkers[i], 900 + (run % 1300), 1128, { sx: 1.8, sy: 1.8, flip: i !== 1, stride: [Math.sin(t * 16 + i) * 5, -Math.sin(t * 16 + i) * 5] })
  }
  blit(ctx, cam, t)
}

// =================================================================================
// SHOT 13 — flowSense (66–69): bullet-time, shot-local half-speed clock
// =================================================================================
function shFlowSense(ctx, lt, dur, t, ov) {
  const lt5 = lt * 0.5 // the local half-speed clock
  const cam = clampCam({
    x: 860 + Math.cos(t * 0.8) * 90, y: 500 + Math.sin(t * 0.8) * 50,
    zoom: lerp(1.10, 1.30, E.inOutCubic(seg(lt, 0, 3))),
  })
  const fc = frameCtx()
  fc.translate(ART.OVER_X, ART.OVER_Y)
  drawSkyLayers(fc, S.palFS, cam, cam.zoom)
  // frozen radial speed-line field, creeping
  fc.save(); fc.translate(FS.hero.x, FS.hero.y); fc.rotate(lt * 0.06)
  fc.globalAlpha = 0.4; fc.drawImage(S.raysWhite, -700, -700); fc.restore()
  // the hero mid-air, folding backward AWAY from the bomb; strands POINT at it
  const fold = seg(lt5, 0.2, 2.6)
  const hx = FS.hero.x - fold * 40, hy = FS.hero.y + fold * 50
  const bomb1 = {
    x: lerp(FS.bomb1.x0, FS.bomb1.x1, seg(lt5, 0, 1.5)),
    y: FS.bomb1.y0 + FS.bomb1.dy * Math.pow(seg(lt5, 0, 1.5), 1.6),
  }
  const bomb2 = {
    x: lerp(FS.bomb2.x0, FS.bomb2.x1, seg(lt5, 0.9, 2.4)),
    y: FS.bomb2.y0 + FS.bomb2.dy * Math.pow(seg(lt5, 0.9, 2.4), 1.6),
  }
  const phi = 0.45 + fold * 0.75 // leans back further as the bomb nears
  hangPose(fc, S.hero, hx, hy, phi, { glowA: 0.5 })
  // scalp strands on the dangling head: below the feet anchor along the body axis
  const headP = { x: hx - Math.sin(phi) * 206, y: hy + Math.cos(phi) * 206 }
  for (const pass of [0, 1]) {
    fc.save()
    if (pass) { fc.globalCompositeOperation = 'lighter'; fc.globalAlpha = 0.5 }
    ART.scalpStrands(fc, headP.x, headP.y, 1, lt5, 6, 62, bomb1)
    fc.restore()
  }
  // bombs crawling
  ART.drawBomb(fc, bomb1.x, bomb1.y, lt5 * 1.2)
  ART.drawBomb(fc, bomb2.x, bomb2.y, lt5 * 1.2 + 2)
  // the graze: FLAKE-POW at rt 67.5 → lt5 0.75 — powder puff blooming slow
  const gz = seg(lt, 1.5, 2.6)
  if (gz > 0 && gz < 1) ART.powderPuff(fc, bomb1.x - 60, bomb1.y + 40, 20 + gz * 110, (1 - gz) * 0.9)
  // slow-motion trails behind the bombs
  for (const b of [bomb1, bomb2]) {
    fc.strokeStyle = 'rgba(246,242,232,0.35)'; fc.lineWidth = 5
    fc.beginPath(); fc.moveTo(b.x + 90, b.y - 40); fc.lineTo(b.x, b.y); fc.stroke()
  }
  blit(ctx, cam, t)
}

// =================================================================================
// SHOT 14 — airBattle (69–72): scissor pass + the aerial punch at g 70.5
// =================================================================================
function shAirBattle(ctx, lt, dur, t, ov) {
  const g = warpG(t)
  const cam = clampCam({
    x: lerp(1600, lerp(1450, 1550, seg(g, 70.5, 72)), E.outCubic(seg(g, 69, 70.5))),
    y: 560, zoom: 1.0 + (t > 70.8 && t < 71.4 ? 0.06 * Math.exp(-(t - 70.8) * 6) : 0),
  })
  const fc = frameCtx()
  fc.translate(ART.OVER_X, ART.OVER_Y)
  drawSkyLayers(fc, PAL.sun, cam, cam.zoom)
  // goblin approach → contact → recoil → recover
  let gpos
  if (g < 70.5) {
    const u = E.inQuad(seg(g, GOBLIN.approach.t0, 70.5))
    gpos = { x: lerp(GOBLIN.approach.x0, GOBLIN.contact.x, u), y: lerp(GOBLIN.approach.y0, GOBLIN.contact.y, u) + Math.sin(g * 3) * 8, rot: -0.1 }
  } else if (g < 71.5) {
    const u = seg(g, 70.5, 71.5)
    gpos = {
      x: lerp(GOBLIN.contact.x, GOBLIN.recoil.x1, E.outCubic(u)),
      y: lerp(GOBLIN.contact.y, GOBLIN.recoil.y1, E.outQuad(u)),
      rot: Math.sin(u * 14) * 0.3 * (1 - u),
    }
  } else {
    gpos = { x: GOBLIN.recover.x + Math.sin(g * 2.4) * 8, y: GOBLIN.recover.y + Math.sin(g * 3.1) * 6, rot: Math.sin(g * 2.4) * 0.08 }
  }
  // hero swings in from the right (leg E, reversed)
  if (g < 70.2) {
    drawSwingHero(fc, g, SWINGS.E, t)
  } else {
    // plant both feet on the glider rim and PUNCH (frozen at g==70.5 through the stop)
    const plan = seg(g, 70.2, 70.5)
    const q = swingPos(SWINGS.E, Math.min(g, 70.5))
    const px = lerp(q.x, GOBLIN.contact.x + 95, plan), py = lerp(q.y, GOBLIN.contact.y - 30, plan)
    if (g < 70.5) ART.strand(fc, SWINGS.E.ax, SWINGS.E.ay, px, py, 30)
    const punching = g >= 70.5
    // after the punch recoils, the hero backflips up-left to a hover
    const rec = E.outCubic(seg(g, 71.2, 72))
    let hpx = px, hpy = py
    if (rec > 0) { hpx = lerp(px, 1420, rec); hpy = lerp(py, 430, rec) }
    A.drawRemy(fc, S.hero, hpx, hpy + (punching ? 0 : rec * 240), {
      sx: HS, sy: HS, rot: punching ? -0.3 : lerp(-0.3, 0.15, rec), lean: punching ? -0.12 : 0,
      glow: PAL.gold, glowA: 0.4, white: punching && t < 70.86,
    })
    fc.save()
    fc.translate(hpx, hpy + (punching ? 0 : rec * 240))
    fc.rotate(punching ? -0.3 : lerp(-0.3, 0.15, rec))
    ART.drawGoggles(fc, 0, 0, HS, false)
    fc.restore()
    if (rec > 0) ART.strand(fc, 1500, -90, hpx, hpy - 40 + rec * 200, 24)
    if (punching) {
      // the extended punch: gold impact streak + contact starburst on the villain's chin
      const k = Math.exp(-(t - 70.8) * 5)
      fc.strokeStyle = PAL.gold; fc.lineWidth = 14 * Math.max(0.25, k); fc.lineCap = 'round'
      fc.beginPath(); fc.moveTo(hpx - 30, hpy + 10); fc.lineTo(GOBLIN.contact.x + 22, GOBLIN.contact.y - 4); fc.stroke()
      ART.burst(fc, GOBLIN.contact.x + 26, GOBLIN.contact.y - 6, 46 + (1 - k) * 26, 84 + (1 - k) * 40, 9, 77, '#ffb03a', PAL.ink)
      if (k > 0.05) speedStreaks(fc, GOBLIN.contact.x, GOBLIN.contact.y, k, 41)
    }
  }
  drawGoblin(fc, gpos, t)
  // fury shake lines after recovering (REAL time — the g clock lags rt by the stop offsets)
  if (t > 71.5) {
    fc.strokeStyle = 'rgba(216,228,74,0.8)'; fc.lineWidth = 5; fc.lineCap = 'round'
    for (let i = 0; i < 6; i++) {
      const a = hash(i * 31) * Math.PI * 2
      fc.beginPath()
      fc.moveTo(gpos.x + Math.cos(a) * 84, gpos.y + Math.sin(a) * 84)
      fc.lineTo(gpos.x + Math.cos(a) * 146, gpos.y + Math.sin(a) * 146)
      fc.stroke()
    }
  }
  blit(ctx, cam, t)
}

// =================================================================================
// SHOT 15 — wrapBarrage (72–78): the web-barrage MONEY SHOT
// =================================================================================
function shWrapBarrage(ctx, lt, dur, t, ov) {
  const g = warpG(t)
  const cam = clampCam({
    x: 1290 + (t < 73.5 ? Math.cos(t * 1.1) * 130 : 0),
    y: lerp(560, 540, seg(g, 72, 74)),
    zoom: t < 73.5 ? 1.02 : lerp(1.02, 0.92, E.inOutCubic(seg(g, 73.5, 74.4))),
  })
  const fc = frameCtx()
  fc.translate(ART.OVER_X, ART.OVER_Y)
  drawSkyLayers(fc, PAL.sun, cam, cam.zoom)
  ART.drawTower(fc, 1150, 290, 300, 'THE DAILY FLOW')
  ART.drawAntenna(fc, 1290, 300)
  // the hero perched on the tower roof beside the antenna (until the exit at 77.7)
  if (g < GOBLIN.heroExit) {
    const perchBob = Math.sin(t * 1.8) * 3
    const px = 1250, py = 300 + perchBob
    A.drawRemy(fc, S.hero, px, py, {
      sx: HS * 0.85, sy: HS * 0.85, rot: 0.08, lean: -0.04,
      stride: [2, -2], glow: PAL.gold, glowA: 0.4,
    })
    ART.drawGoggles(fc, px, py, HS * 0.85, false)
    const headY3 = py - 101 * HS * 0.85
    ART.scalpStrands(fc, px, headY3, 1, t, 4, 26, { x: 1290, y: 480 })
  } else {
    // thwips away, up-left, hands leading
    const eu = E.inCubic(seg(g, GOBLIN.heroExit, 78))
    const px = lerp(1250, 700, eu), py = lerp(280, -140, eu)
    hangPose(fc, S.hero, px, py, 0.5, { sy: HS * 0.85, glowA: 0.5, alpha: 1 - eu * 0.4 })
    speedStreaks(fc, px, py, 0.7, 43)
  }
  // the goblin orbiting, pinned, then cocooned
  const gpos = goblinWrapPos(g)
  const pins = GOBLIN.volleyG.filter((tg) => g >= tg)
  if (g < 76.5) {
    drawGoblin(fc, gpos, t)
    // volley strands pin glider wing / tail / shoulder (from the hero's perch)
    const pinPts = [{ x: -80, y: -8 }, { x: 70, y: 6 }, { x: 10, y: -34 }]
    pins.forEach((_, i) => {
      const pp = pinPts[i]
      const tx = gpos.x + pp.x, ty = gpos.y + pp.y
      ART.strand(fc, 1250, 250, tx, ty, 40 + i * 14)
    })
    // accumulating wrap loops
    const w = seg(g, GOBLIN.wrapW.t0, GOBLIN.wrapW.t1)
    if (w > 0) {
      fc.strokeStyle = PAL.gold; fc.lineWidth = 6
      const rings = Math.floor(w * 6)
      for (let i = 0; i < rings; i++) {
        const ry = gpos.y - 30 + i * 12
        fc.beginPath(); fc.ellipse(gpos.x + 4, ry, 44 - i * 2, 9, 0.2, 0, 7); fc.stroke()
      }
    }
  } else {
    // cocoon dangles from a strand off the top of frame; boing at 77.4 (real time)
    const sway = Math.sin((t - 76.94) * 2.2) * 0.1 * Math.exp(-(t - 76.94) * 0.8)
    ART.strand(fc, 1290, -140, 1290, 436, 10)
    ART.drawCocoon(fc, 1290, 480, 1, { vil: S.vil.sil, rot: sway, boing: t > GOBLIN.boing ? t - GOBLIN.boing : 0 })
    // the glider, dead, tips away below
    ART.drawGlider(fc, 1290 + 90, 566 + Math.sin((t - 76.94) * 2.2) * 6, 0.5 + sway, t, {})
  }
  blit(ctx, cam, t)
}

// =================================================================================
// SHOT 16 — hangSunset (78–84): the poster frame
// =================================================================================
function shHangSunset(ctx, lt, dur, t) {
  const fc = frameCtx()
  fc.translate(ART.OVER_X, ART.OVER_Y)
  const cam = clampCam({ x: 960 + seg(lt, 0, 6) * 40, y: lerp(500, 560, E.inOutCubic(seg(lt, 0, 6))), zoom: 1.05 })
  drawSkyLayers(fc, PAL.sun, cam, 1.05)
  // the cocoon swinging small below-left
  const sw = HANG.sway * Math.sin(lt * 0.9) * Math.exp(-lt * 0.12)
  ART.strand(fc, HANG.cocoonX, -140, HANG.cocoonX + Math.sin(sw) * 60, HANG.cocoonY - 54, 6)
  ART.drawCocoon(fc, HANG.cocoonX + Math.sin(sw) * 120, HANG.cocoonY, 1, { vil: S.vil.sil, rot: sw * 0.5 })
  // the hero hangs from one strand, gentle sway — the iconic upside-down poster pose
  const theta = 0.06 * Math.sin(lt * 0.9)
  const hx = HANG.heroX + Math.sin(theta) * 80, hy = HANG.heroY
  ART.strand(fc, HANG.heroX, -140, hx, hy, 4)
  hangPose(fc, S.hero, hx, hy, theta, { sy: HS * 1.1, glowA: 0.4 })
  ART.scalpStrands(fc, hx - Math.sin(theta) * 230, hy + Math.cos(theta) * 230, 1, lt, 3, 30)
  // dust motes, drifting up
  fc.save(); fc.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 24; i++) {
    const mx = hash(i * 61) * 1900, my0 = hash(i * 29) * 1100
    const my = ((my0 - lt * 22 - hash(i) * 400) % 1100 + 1100) % 1100
    fc.globalAlpha = 0.25 + hash(i * 3) * 0.3
    fc.fillStyle = '#ffe9ad'
    fc.beginPath(); fc.arc(mx + Math.sin(lt * 0.4 + i) * 14, my, 2.4, 0, 7); fc.fill()
  }
  fc.restore()
  blit(ctx, cam, t)
  ART.fgSil(ctx, cam, PAL.sun)
}

// =================================================================================
// SHOT 17 — stinger (84–90): the louse salutes; iris out
// =================================================================================
function shStinger(ctx, lt, dur, t, ov) {
  camBegin(ctx, 1.0, 960, 600, t)
  // macro bokeh dusk
  ctx.fillStyle = '#12200e'; ctx.fillRect(-200, -200, W + 400, H + 400)
  for (let i = 0; i < 16; i++) {
    const bx = hash(i * 41) * W, by = hash(i * 19) * H, br = 30 + hash(i * 7) * 90
    ctx.globalAlpha = 0.08 + hash(i * 3) * 0.12
    ctx.fillStyle = i % 2 ? '#3a5a2a' : '#4a6a38'
    ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill()
  }
  ctx.globalAlpha = 1
  // the big leaf
  ctx.fillStyle = '#1e3a1a'
  ctx.beginPath(); ctx.moveTo(-100, 1250)
  ctx.quadraticCurveTo(500, 850, 1150, 940); ctx.quadraticCurveTo(1850, 1030, 2100, 760)
  ctx.quadraticCurveTo(1950, 1250, 1150, 1290); ctx.quadraticCurveTo(400, 1330, -100, 1250)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#0e1f0c'; ctx.lineWidth = 8; ctx.stroke()
  ctx.strokeStyle = '#4a7a3a'; ctx.lineWidth = 5
  ctx.beginPath(); ctx.moveTo(-80, 1230); ctx.quadraticCurveTo(700, 980, 2050, 800); ctx.stroke()
  ctx.lineWidth = 3
  for (let i = 1; i < 6; i++) {
    const u = i / 6
    const vx = lerp(-80, 2050, u), vy = 1230 - u * u * 200 - u * 180
    ctx.beginPath(); ctx.moveTo(vx, vy)
    ctx.quadraticCurveTo(vx - 80, vy + 60 + i * 8, vx - 160 - i * 20, vy + 150 + i * 12)
    ctx.stroke()
  }
  // the louse climbs into frame, turns, SALUTES
  const climb = E.outCubic(seg(lt, LOUSE.climbT0 - 84, LOUSE.climbT1 - 84))
  const ly = lerp(1160, LOUSE.y, climb) + (climb >= 1 ? Math.sin(lt * 2) * 2 : 0)
  const turn = seg(lt, 1.5, 1.9)
  const salute = lt >= 2.99
  ART.drawLouse(ctx, LOUSE.x, ly, 3.4, lt, {
    glow: GOB.glow, dir: turn < 0.5 ? 1 : -1, salute,
    rot: (1 - climb) * 0.4 - turn * 0.35 * (1 - turn),
  })
  if (salute && lt < 3.6) { // bell twinkle
    const tk = Math.sin(Math.PI * seg(lt, 2.99, 3.6))
    ART.burst(ctx, LOUSE.x - 46, ly - 62, 4 + tk * 8, 10 + tk * 20, 5, 61, PAL.goldHi, PAL.goldDeep)
  }
  camEnd(ctx)
  // iris out
  const u = seg(t, IRIS.t0, IRIS.t1)
  if (u > 0) {
    const rad = Math.max(0, 860 * (1 - u) ** 2) + 60
    ov.fillStyle = '#000'
    ov.beginPath(); ov.rect(0, 0, W, H); ov.moveTo(LOUSE.x + rad, ly); ov.arc(LOUSE.x, ly, rad, 0, Math.PI * 2, true)
    ov.fill('evenodd')
  }
}

// small local aliases
const warpG = (t) => warp(t).g

// =================================================================================
// FX + THE FILM
// =================================================================================
const COMIC = { bloom: 0.1, bloomThresh: 0.9, grain: 0.028, vignette: 0.32, sat: 1.08, contrast: 1.06 }
const fxFor = {
  museumExt: () => ({ ...COMIC, tint: [0.99, 1.0, 1.03] }),
  tripPanel: () => ({ ...COMIC, sat: 1.05, contrast: 1.05 }),
  bite: () => ({ ...COMIC, bloom: 0.12, vignette: 0.45, contrast: 1.1 }),
  transform: () => ({ ...COMIC, bloom: 0.13, vignette: 0.4, sat: 1.12 }),
  mirror: () => ({ ...COMIC, sat: 1.02, contrast: 1.04 }),
  suitPanel: () => ({ ...COMIC, sat: 1.1, contrast: 1.08 }),
  firstThwip: () => ({ ...COMIC, tint: [0.98, 1.0, 1.04] }),
  swing1: () => ({ ...COMIC, tint: [0.98, 1.0, 1.04] }),
  rescue24: () => ({ ...COMIC, tint: [0.99, 1.0, 1.03] }),
  newsPanel: () => ({ ...COMIC, sat: 0.98, contrast: 1.08, vignette: 0.25 }),
  goblinReveal: () => ({ ...COMIC, tint: [1.08, 0.97, 0.9], vignette: 0.38 }),
  flakeBombs: () => ({ ...COMIC, tint: [1.08, 0.97, 0.9] }),
  flowSense: () => ({ ...COMIC, sat: 0.42, tint: [1.02, 0.95, 1.05], contrast: 1.12, vignette: 0.42 }),
  airBattle: () => ({ ...COMIC, tint: [1.08, 0.97, 0.9], bloom: 0.12 }),
  wrapBarrage: () => ({ ...COMIC, tint: [1.08, 0.97, 0.9], bloom: 0.12 }),
  hangSunset: () => ({ ...COMIC, bloom: 0.14, tint: [1.1, 0.98, 0.88], vignette: 0.3 }),
  stinger: () => ({ ...COMIC, sat: 0.9, vignette: 0.5, contrast: 1.05 }),
}

const OVERLAY = (ctx, lt, dur, t, ov) => {
  paintCaptionFurniture(ov, t)
  paintOnos(ov, t)
}

const DRAW = {
  museumExt: shMuseumExt, tripPanel: shTripPanel, bite: shBite, transform: shTransform,
  mirror: shMirror, suitPanel: shSuitPanel, firstThwip: shFirstThwip, swing1: shSwing1,
  rescue24: shRescue24, newsPanel: shNewsPanel, goblinReveal: shGoblinReveal,
  flakeBombs: shFlakeBombs, flowSense: shFlowSense, airBattle: shAirBattle,
  wrapBarrage: shWrapBarrage, hangSunset: shHangSunset, stinger: shStinger,
}

export default {
  title: 'SPIDER-REM — With Great Hair Comes Great Flow',
  output: 'spider-rem.mp4',
  duration: D,
  grid: { bar: 3 },
  prepare,
  shots: SHOTS.map((s) => ({
    name: s.name, t0: s.t0, t1: s.t1,
    draw: (ctx, lt, dur, t, ov) => { DRAW[s.name](ctx, lt, dur, t, ov); if (ov && s.name !== 'stinger') OVERLAY(ctx, lt, dur, t, ov); else if (ov) { paintCaptionFurniture(ov, t); paintOnos(ov, t) } },
    fx: fxFor[s.name],
  })),
  captions: CAPTIONS,
  captionStyles: CAPTION_STYLES,
  flashes: FLASHES.map((f) => [f.real, f.peak, f.decay]),
  score,
  audio: { seed: 4242, reverb: 1.6, reverbGain: 0.26 },
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: false } },
}
