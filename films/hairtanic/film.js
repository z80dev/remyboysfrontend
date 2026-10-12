// HAIRTANIC — a Remy Boys Titanic parody. Picture: 11 shots on the shared timeline.js
// cue sheet (SHOTS/CAPTIONS/EV/STEER/IMPACT/PAL/CAM are the single source of truth).
// Painted-vector Canvas2D stage, goldflow lineage: baked environments, pure painters,
// rim-lit sprites, layered seas. Hit-stops resolve world time through STEER/IMPACT;
// shake, flashes and sparks run on real shot time. No Math.random, no cross-frame state.
import { W, H, seg, lerp, smooth, hash, E, F, measure } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import { SHOTS, CAPTIONS, EV, STEER, IMPACT, PAL, CAM } from './timeline.js'
import score from './score.js'

const OS = 280 // overscan: every painted layer covers the frame plus this margin
const S = {}

// ---------- tiny shared helpers ----------
const sprite = (x, rig, px, feet, o = {}) => {
  x.imageSmoothingEnabled = false
  A.drawRemy(x, rig, px, feet, o)
}
const rim = (rigK, x, px, feet, o = {}) => sprite(x, { ...rigK, c: rigK.rimC }, px - 5, feet - 3, { ...o, alpha: (o.alpha ?? 1) * 0.8 })
const walk = (px, amp = 4) => {
  const s = Math.sin(px / 40 * Math.PI * 2)
  return { lift: [Math.round(Math.max(0, s) * amp), Math.round(Math.max(0, -s) * amp)], stride: [Math.round(s * 2), Math.round(-s * 2)], lean: 0.02 }
}
// CAM entry i applies over the shot: push from→to, tilt (deg, eased in), drift px.
function camOpen(ctx, cp, lt, dur, shx = 0, shy = 0) {
  const u = smooth(lt / dur)
  const s = lerp(cp.from, cp.to, u)
  ctx.save()
  ctx.translate(960, 540)
  ctx.rotate(((cp.tilt ?? 0) * Math.PI / 180) * u)
  ctx.scale(s, s)
  ctx.translate(-960 - (cp.drift?.[0] ?? 0) * u - shx, -540 - (cp.drift?.[1] ?? 0) * u - shy)
}
const stars = (x, t, n, yMax, seed = 3) => {
  for (let i = 0; i < n; i++) {
    x.globalAlpha = 0.2 + 0.5 * hash(i * 17 + seed) * (0.6 + 0.4 * Math.sin(t * (1 + hash(i)) + i))
    x.fillStyle = '#cfdcee'
    x.fillRect(Math.floor(hash(i * 7 + seed) * W), Math.floor(hash(i * 29 + seed) * yMax), 2, 2)
  }
  x.globalAlpha = 1
}
const bell = (u) => Math.sin(Math.max(0, Math.min(1, u)) * Math.PI)
// Caption scrim envelope: mirrors a locked caption's in/out so pills breathe with the text.
const capA = (t, t0, t1, fin, fout) => smooth(seg(t, t0, t0 + fin)) * (1 - smooth(seg(t, t1 - fout, t1)))

// ============================== S1 — WRECK (0–9) ==============================
function drawWreck(ctx, lt, t) {
  camOpen(ctx, CAM[0], lt, 9)
  const g = ctx.createLinearGradient(0, -OS, 0, H + OS)
  g.addColorStop(0, '#0a1626')
  g.addColorStop(0.6, '#05101c')
  g.addColorStop(1, '#02050a')
  ctx.fillStyle = g
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // faint daylight shaft from the surface
  ART.lampCone(ctx, 700, -160, 1.75, 1700, 0.2, 'rgba(140,180,210,0.05)', 0.5)
  ctx.drawImage(S.wreck, -OS, -OS)
  // two submersible lamp cones sweeping (slow sine phases, additive)
  ART.lampCone(ctx, 200, 1300, -0.95 + 0.13 * Math.sin(t * 0.5), 1600, 0.18, 'rgba(255,217,160,0.28)', 0.8)
  ART.lampCone(ctx, 1760, 1320, -2.15 + 0.13 * Math.sin(t * 0.43 + 2.1), 1600, 0.18, 'rgba(255,217,160,0.24)', 0.8)
  ART.motes(ctx, t, 5, 70, { alpha: 0.22, col: '#8fb0c8' })
  // OLD ROSE at the right edge in lamp rim-light, open pendant case in her hands
  const glow = ctx.createRadialGradient(1640, 780, 30, 1640, 780, 340)
  glow.addColorStop(0, 'rgba(255,207,138,0.16)')
  glow.addColorStop(1, 'rgba(255,207,138,0)')
  ctx.fillStyle = glow
  ctx.fillRect(1300, 460, 680, 620)
  rim(S.oldRose, ctx, 1712, 1000, { flip: true, sx: 2.7, sy: 2.7 })
  sprite(ctx, S.oldRose, 1718, 1004, { flip: true, sx: 2.7, sy: 2.7 })
  // the pendant case: gold hinges + a slow warm glint
  ctx.fillStyle = '#3a2c18'
  ctx.fillRect(1586, 742, 64, 44)
  ctx.fillStyle = '#c9a45c'
  ctx.fillRect(1590, 746, 56, 36)
  ctx.fillStyle = '#6ab0ff'
  ctx.fillRect(1612, 758, 12, 12)
  ART.glint(ctx, 1618, 760, 40, (t * 0.42) % 1)
  ctx.restore()
}

// ============================== S2 — SOUTHAMPTON (9–18) ==============================
// boarding path: dock walk then up the gangway (pure g; world abs 9+g is exact — plain shot)
function boardPath(g) {
  if (g < 0.6) return { x: 2060, feet: 700, rot: 0, on: 0 }
  if (g < 3.0) return { x: lerp(2060, 1640, E.outCubic(seg(g, 0.6, 3.0))), feet: 700, rot: 0, on: 1 }
  if (g < 6.0) {
    const u = seg(g, 3.0, 6.0)
    return { x: lerp(1640, 1270, u), feet: lerp(700, 512, u), rot: -0.48, on: 1 }
  }
  return { x: 1270, feet: 512, rot: -0.48, on: 1 - seg(g, 6.0, 6.6) }
}
function drawSouthampton(ctx, lt, t) {
  const g = lt
  camOpen(ctx, CAM[1], lt, 9)
  ART.sky(ctx, [[0, PAL.s2.sky], [0.55, '#cdd9e2'], [1, '#e6ebea']])
  ART.clouds(ctx, t, 9, 170, 1.3, 0.65)
  ART.sea(ctx, 590, t, {
    bands: ['#4a6680', '#3d5a74', PAL.s2.sea, '#2b4460', '#243a54'],
    foam: 'rgba(230,238,242,0.9)', amp: 5, depth: 260, glintX: 720, glintCol: 'rgba(255,240,214,0.45)',
  })
  // the painted liner (bow LEFT), smoke drifting aft, waterline foam
  ctx.drawImage(S.liner, -100, -10)
  for (const fx of [380, 640, 900, 1160]) ART.smoke(ctx, fx, 150, t, fx, { dir: 1, alpha: 0.4, col: '#6a7684' })
  ctx.fillStyle = 'rgba(230,238,242,0.8)'
  for (let px = -80; px < 1640; px += 46)
    ctx.fillRect(px, 686 + 3 * Math.sin(px * 0.05 + t * 2), 20 + (px % 17), 3)
  ART.steamBlast(ctx, 380, 150, t, EV.whistle.abs)
  ART.gulls(ctx, t, EV.whistle.abs, 1230, 280, 7)
  // dock: timber platform, bollards, crowd, quartet, banner
  const dockG = ctx.createLinearGradient(0, 660, 0, H + OS)
  dockG.addColorStop(0, PAL.s2.timber)
  dockG.addColorStop(1, '#4a3620')
  ctx.fillStyle = dockG
  ctx.fillRect(1560, 660, W + OS - 1560, H + OS - 660)
  ctx.fillStyle = '#3a2a18'
  ctx.fillRect(1560, 660, W + OS - 1560, 10)
  for (let px = 1600; px < W + OS; px += 90) {
    ctx.fillStyle = 'rgba(20,12,6,0.5)'
    ctx.fillRect(px, 680, 4, H)
  }
  for (const bx of [1600, 1900, 2160]) {
    ctx.fillStyle = '#2a2018'
    ctx.fillRect(bx - 14, 636, 28, 44)
    ctx.beginPath(); ctx.arc(bx, 632, 16, Math.PI, 0); ctx.fill()
  }
  // crowd far sprites, two depth rows, handkerchief waves
  const crowd = S.crowd
  for (let i = 0; i < 5; i++)
    sprite(ctx, crowd[i], 1620 + i * 128, 762, { sx: 1.3, sy: 1.3, lift: [Math.max(0, Math.sin(t * 3 + i * 1.8)) * 4, 0] })
  for (let i = 0; i < 4; i++)
    sprite(ctx, crowd[5 + (i % 3)], 1585 + i * 150, 848, { sx: 1.55, sy: 1.55, flip: i % 2 === 0, lift: [Math.max(0, Math.sin(t * 2.6 + i * 2.2)) * 5, 0] })
  // string quartet on the dock, playing
  S.quartet.forEach((q, i) =>
    sprite(ctx, q, 1665 + i * 62, 912, { sx: 1.8, sy: 1.8, rot: Math.sin(t * 1.5 + i * 1.3) * 0.03, lift: [1, 0] }))
  // painted banner on posts (sized/left so the max camera push keeps it in frame)
  ctx.fillStyle = '#3a2a18'
  ctx.fillRect(1392, 400, 8, 280)
  ctx.fillRect(1848, 400, 8, 280)
  ctx.save()
  ctx.translate(1620, 408)
  ctx.rotate(Math.sin(t * 1.2) * 0.035)
  ctx.scale(0.85, 0.85)
  ctx.drawImage(S.banner, -274, 0)
  ctx.restore()
  // streamers between ship rail and dock posts
  const stream = (x0, y0, x1, y1, col, ph) => {
    ctx.strokeStyle = col
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 46 + Math.sin(t * 2.2 + ph) * 18, x1, y1 + Math.sin(t * 3.1 + ph) * 6)
    ctx.stroke()
  }
  stream(1245, 520, 1600, 640, '#c8d6e4', 0)
  stream(1245, 520, 1655, 610, PAL.s2.bannerRed, 1.9)
  stream(1245, 522, 1580, 690, '#e8cf8a', 3.7)
  // gangway: a planked ramp the boarding actually reads on
  ctx.fillStyle = '#54391c'
  ctx.beginPath()
  ctx.moveTo(1600, 668); ctx.lineTo(1270, 496); ctx.lineTo(1270, 522); ctx.lineTo(1600, 700)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#7a5c3c'
  ctx.lineWidth = 4
  for (let i = 0; i <= 6; i++) {
    const u = i / 6
    const gx = lerp(1600, 1270, u), gy = lerp(684, 509, u)
    ctx.beginPath(); ctx.moveTo(gx, gy - 14); ctx.lineTo(gx - 6, gy + 14); ctx.stroke()
  }
  // boarding port in the hull side where the gangway lands
  ctx.fillStyle = '#060a10'
  ctx.fillRect(1218, 496, 96, 44)
  ctx.strokeStyle = '#c9a45c'
  ctx.lineWidth = 4
  ctx.strokeRect(1218, 496, 96, 44)
  // CAL boards with ROSE behind (walk cycle from world x so feet plant)
  for (const [rig, delay, k] of [[S.cal, 0, 2.25], [S.rose, 1.15, 2.05]]) {
    const p = boardPath(g - delay)
    if (p.on > 0) {
      if (rig.rimC) rim(rig, ctx, p.x, p.feet, { ...walk(p.x, 5), rot: p.rot, flip: true, sx: k, sy: k, alpha: p.on * 0.5 })
      sprite(ctx, rig, p.x, p.feet, { ...walk(p.x, 5), rot: p.rot, flip: true, sx: k, sy: k, alpha: p.on })
    }
  }
  // P3-4 contrast scrims under the locked caption windows (timings from timeline.js)
  let sc = capA(t, 9.45, 12.5, 0.4, 0.4)
  if (sc > 0)
    ART.scrimPill(ctx, 960, 430, measure(ctx, 'SOUTHAMPTON — APRIL 10, 1912', 26, F.mono, 6, '700') + 76, 56, 0.62 * sc)
  sc = capA(t, 15.65, 17.9, 0.3, 0.2)
  if (sc > 0)
    ART.scrimPill(ctx, 960, 520,
      Math.max(measure(ctx, 'THE REMY STAR LINE PRESENTS', 40, F.serif, 0.5, '600'), measure(ctx, 'THE UNSINKABLE RMS HAIRTANIC', 40, F.serif, 0.5, '600')) + 84, 136, 0.62 * sc)
  ctx.restore()
}

// ============================== S3 — BOW (18–26) ==============================
function drawBow(ctx, lt, t) {
  camOpen(ctx, CAM[2], lt, 8)
  ART.sky(ctx, [[0, PAL.s3.sky], [0.5, '#e8ddb8'], [0.8, '#f2d9a8'], [1, '#f2c98a']])
  const sun = ctx.createRadialGradient(1560, 170, 20, 1560, 170, 620)
  sun.addColorStop(0, 'rgba(255,236,190,0.55)')
  sun.addColorStop(1, 'rgba(255,236,190,0)')
  ctx.fillStyle = sun
  ctx.fillRect(940, -OS, W + OS - 940, 760)
  ART.clouds(ctx, t, 18, 130, 0.9, 0.5)
  ART.sea(ctx, 500, t, {
    bands: ['#4a6a88', '#3d5c7c', PAL.s3.seaSteel, '#2b4663', '#243c57'],
    foam: 'rgba(235,242,246,0.8)', amp: 6, depth: 300, glintX: 1480, glintCol: 'rgba(255,232,180,0.55)',
  })
  // open rail: the sea shows between rail and deck edge
  ctx.fillStyle = '#e8e2d2'
  ctx.fillRect(-OS, 600, W + OS * 2, 13)
  ctx.fillStyle = '#b0a890'
  ctx.fillRect(-OS, 613, W + OS * 2, 5)
  for (let px = -100; px < W + OS; px += 190) {
    ctx.fillStyle = '#d8d2c0'
    ctx.fillRect(px, 613, 12, 76)
  }
  ctx.fillStyle = '#8f8874'
  ctx.fillRect(-OS, 683, W + OS * 2, 7)
  // weathered deck below (planked, seams, worn highlights)
  const deckG = ctx.createLinearGradient(0, 690, 0, H + OS)
  deckG.addColorStop(0, '#7a5c3a')
  deckG.addColorStop(0.5, PAL.s3.deck)
  deckG.addColorStop(1, '#4a3620')
  ctx.fillStyle = deckG
  ctx.fillRect(-OS, 690, W + OS * 2, H + OS - 690)
  ctx.fillStyle = 'rgba(30,20,10,0.5)'
  for (let px = -OS; px < W + OS; px += 120) ctx.fillRect(px, 700, 5, H)
  ctx.fillStyle = 'rgba(220,196,150,0.2)'
  for (let px = -OS + 60; px < W + OS; px += 120) ctx.fillRect(px, 700, 5, H)
  // the stem cutting in from the left: black hull side, gold line, hawse
  ctx.fillStyle = '#10151c'
  ctx.beginPath()
  ctx.moveTo(-OS, -OS); ctx.lineTo(-OS, 1080); ctx.lineTo(200, 1080)
  ctx.quadraticCurveTo(300, 900, 330, 700)
  ctx.quadraticCurveTo(340, 600, 320, 520)
  ctx.lineTo(-OS, 470)
  ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#c9a45c'
  ctx.fillRect(-OS, 640, 316, 6)
  ctx.fillStyle = '#e8cf8a'
  ctx.fillRect(-OS, 640, 316, 2)
  ctx.fillStyle = '#060a10'
  ctx.beginPath(); ctx.arc(150, 560, 22, 0, 7); ctx.fill()
  // foam bursts at the stem's cutwater
  ART.spray(ctx, 330, 716, t, {})
  // P3-5 ARMS WIDE: two tapered arm ribbons rise 18.5→20.0, then hold spread with
  // wind flutter — hands finish well above the shoulder line and clear of the hair,
  // symmetric about his axis, thick enough to read as arms at 3.2x sprite scale.
  const au = E.outCubic(seg(t, 18.5, 20.0))
  if (au > 0) {
    for (const [shx2, shy2, hx2, hy2, ph] of [
      [796, 692, lerp(756, 634, au), lerp(782, 486, au), 0.4], // his left, spread out-left
      [868, 696, lerp(908, 1036, au), lerp(790, 502, au), 2.1], // his right, spread out-right
    ]) {
      const pts = []
      for (let k = 0; k <= 10; k++) {
        const s = k / 10
        pts.push([
          lerp(shx2, hx2, s) + (hx2 < shx2 ? -1 : 1) * Math.sin(s * Math.PI) * 22,
          lerp(shy2, hy2, s) + Math.sin(t * 2.6 + ph + s * 3) * 7 * s,
          40 * (1 - s * 0.62),
        ])
      }
      ART.limb(ctx, pts, 40, '#22303e') // sleeve tone from the sprite's sweater
      ctx.fillStyle = '#22303e'
      ctx.beginPath(); ctx.ellipse(hx2, hy2 + 6, 13, 10, 0, 0, 7); ctx.fill() // cuff
      ctx.fillStyle = '#e8c9a0' // bare hand at the tip (skin tone from the sprite)
      ctx.beginPath(); ctx.ellipse(hx2, hy2 - 4, 12, 13, 0, 0, 7); ctx.fill()
    }
  }
  // ROSE behind gripping the rail, then JACK leaning out, wind hair ribbons
  sprite(ctx, S.rose, 1040, 895, { sx: 3.1, sy: 3.1, lean: -0.04, lift: [2, 1] })
  ART.hairStream(ctx, 1046, 606, 1, t, 23, { n: 6, len: 200, col: '#df9c9c', hi: '#eec0be', w: 8 })
  sprite(ctx, S.jack, 830, 890, { sx: 3.2, sy: 3.2, flip: true, lean: 0.12, rot: -0.05, lift: [3, 0] })
  ART.hairStream(ctx, 848, 576, 1, t, 42, { n: 8, len: 280, col: '#893c3b', hi: '#a85a4a', w: 9, rise: 14 })
  // P3-4 contrast scrims: the s3 volley moved to the sky lane (y 250) needs a pill
  // over the pale golden sky
  let sc = capA(t, 18.5, 21.4, 0.3, 0.3)
  if (sc > 0)
    ART.scrimPill(ctx, 960, 250, measure(ctx, 'JACK — LOOK AT ME! I AM THE MASTER OF MY FLOW!', 40, F.serif, 0.5, '600') + 84, 74, 0.58 * sc)
  sc = capA(t, 21.6, 24.9, 0.3, 0.3)
  if (sc > 0)
    ART.scrimPill(ctx, 960, 250, measure(ctx, 'ROSE — THE HAIR WILL RULE ITSELF.', 40, F.serif, 0.5, '600') + 84, 74, 0.58 * sc)
  ctx.restore()
}

// ============================== S4 — SUNSET (26–33) ==============================
function drawSunset(ctx, lt, t) {
  camOpen(ctx, CAM[3], lt, 7)
  ART.sky(ctx, [[0, '#3a1e30'], [0.42, '#a04a38'], [0.72, PAL.s4.ember], [0.9, PAL.s4.orange], [1, PAL.s4.sun]])
  // the low sun + haze
  const sg = ctx.createRadialGradient(720, 552, 30, 720, 552, 560)
  sg.addColorStop(0, 'rgba(255,236,190,0.9)')
  sg.addColorStop(0.3, 'rgba(255,190,120,0.4)')
  sg.addColorStop(1, 'rgba(255,190,120,0)')
  ctx.fillStyle = sg
  ctx.fillRect(0, 0, W, 620)
  ctx.fillStyle = '#ffe9ad'
  ctx.beginPath(); ctx.arc(720, 552, 52, 0, 7); ctx.fill()
  ART.sea(ctx, 560, t, {
    bands: ['#7a5470', '#6b4a66', PAL.s4.seaDusk, '#463a5c', '#3a3050'],
    foam: 'rgba(255,214,160,0.5)', amp: 6, depth: 300, glintX: 720, glintCol: 'rgba(255,207,138,0.8)',
  })
  // stern rigging silhouettes, two parallax layers drifting (mast + davit, not a fin)
  for (const [dy, a, dx] of [[0, 0.85, 0], [26, 0.5, 14]]) {
    ctx.globalAlpha = a
    ctx.fillStyle = PAL.s4.silhouette
    const off = Math.sin(t * 0.22) * 9 + dx
    ctx.fillRect(-OS + off, 386 + dy, W + OS * 2, 10)
    for (let px = -140 + off; px < W + OS; px += 170) ctx.fillRect(px, 396 + dy, 9, 150)
    ctx.fillRect(1330 + off, 160 + dy, 8, 240) // mast
    ctx.fillRect(1250 + off, 200 + dy, 180, 7) // yard
    ctx.strokeStyle = PAL.s4.silhouette
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(1334 + off, 200 + dy); ctx.lineTo(1600 + off, 396 + dy); ctx.stroke()
    ctx.globalAlpha = 1
  }
  // the two-shot, backlit: warm rim copies then near-black silhouettes
  rim(S.rose, ctx, 1030, 958, { sx: 3.35, sy: 3.35, lean: -0.02 })
  sprite(ctx, { ...S.rose, c: S.roseDark }, 1036, 962, { sx: 3.35, sy: 3.35, lean: -0.02 })
  rim(S.jack, ctx, 850, 952, { sx: 3.45, sy: 3.45, flip: true })
  sprite(ctx, { ...S.jack, c: S.jackDark }, 856, 956, { sx: 3.45, sy: 3.45, flip: true })
  // BOTH manes horizontal across the frame (his crimson lit warmer so it clears the silhouette)
  ART.hairStream(ctx, 850, 618, 1, t, 42, { n: 9, len: 320, col: '#a8483a', hi: '#d4694a', w: 10, alpha: 1 })
  ART.hairStream(ctx, 1030, 630, 1, t, 23, { n: 8, len: 280, col: '#df9c9c', hi: '#f2c4c2', w: 9, alpha: 0.95 })
  ctx.restore()
}

// ============================== S5 — STEERAGE (33–43) — STEER clock ==============================
function drawSteerage(ctx, lt, t) {
  const { g, stop } = STEER.warp(lt)
  const shx = stop ? (hash(Math.floor(lt * 90) + 7) - 0.5) * 8 : 0
  const shy = stop ? (hash(Math.floor(lt * 90) + 99) - 0.5) * 8 : 0
  camOpen(ctx, CAM[4], lt, 10, shx, shy)
  // back wall (seen through the stairwell opening)
  ctx.fillStyle = '#1c1208'
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // the quartet peeking down the stairwell (drawn before the front wall masks them)
  const tap = Math.sin(g * 4.2)
  S.quartet.forEach((q, i) =>
    sprite(ctx, q, 760 + i * 118, 246, {
      sx: 2.2, sy: 2.2, lift: [2, i === 2 ? Math.max(0, tap) * 7 : 1],
      stride: i === 2 ? [Math.round(tap * 3), Math.round(-tap * 3)] : [1, 0], rot: Math.sin(t * 1.4 + i) * 0.03,
    }))
  // front wall with the stairwell opening cut out (evenodd)
  const wallG = ctx.createLinearGradient(0, 0, 0, H)
  wallG.addColorStop(0, '#33220f')
  wallG.addColorStop(1, '#241708')
  ctx.fillStyle = wallG
  ctx.beginPath()
  ctx.rect(-OS, -OS, W + OS * 2, H + OS * 2)
  ctx.rect(700, 56, 520, 214)
  ctx.fill('evenodd')
  ctx.strokeStyle = '#4a331c'
  ctx.lineWidth = 10
  ctx.strokeRect(700, 56, 520, 214)
  // stairs edge + rail inside the opening
  ctx.strokeStyle = '#54391c'
  ctx.lineWidth = 8
  ctx.beginPath(); ctx.moveTo(716, 250); ctx.lineTo(1204, 250); ctx.stroke()
  ctx.fillStyle = '#3f2a14'
  for (let i = 0; i < 5; i++) ctx.fillRect(730 + i * 96, 250 + i * 9, 60, 7)
  // warm light spill down the stairs
  const spill = ctx.createLinearGradient(0, 270, 0, 900)
  spill.addColorStop(0, 'rgba(245,217,160,0.10)')
  spill.addColorStop(1, 'rgba(245,217,160,0)')
  ctx.fillStyle = spill
  ctx.fillRect(700, 270, 520, 640)
  // hanging brass lamps with warm pools
  for (const [lx, ly] of [[480, 300], [960, 250], [1440, 310]]) {
    const sw = Math.sin(t * 1.3 + lx) * 0.04
    ctx.save()
    ctx.translate(lx, ly)
    ctx.rotate(sw)
    ctx.strokeStyle = '#6b4f26'
    ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(0, -240); ctx.lineTo(0, 0); ctx.stroke()
    ctx.fillStyle = PAL.s5.brass
    ctx.beginPath(); ctx.moveTo(-44, 0); ctx.lineTo(44, 0); ctx.lineTo(12, 30); ctx.lineTo(-12, 30); ctx.closePath(); ctx.fill()
    const bulb = ctx.createRadialGradient(0, 40, 4, 0, 40, 60)
    bulb.addColorStop(0, 'rgba(255,236,180,0.9)')
    bulb.addColorStop(1, 'rgba(255,236,180,0)')
    ctx.fillStyle = bulb
    ctx.fillRect(-60, -20, 120, 120)
    ctx.restore()
    ART.lampCone(ctx, lx + sw * 240, ly + 30, Math.PI / 2 + sw, 620, 0.42, 'rgba(245,217,160,0.07)', 0.8)
    ctx.fillStyle = 'rgba(245,217,160,0.08)'
    ctx.beginPath(); ctx.ellipse(lx + sw * 480, 1000, 240, 44, 0, 0, 7); ctx.fill()
  }
  // floor planks
  ctx.fillStyle = PAL.s5.wood
  ctx.fillRect(-OS, 944, W + OS * 2, H + OS - 944)
  ctx.fillStyle = 'rgba(30,18,8,0.6)'
  for (let px = -OS; px < W + OS; px += 130) ctx.fillRect(px, 952, 5, H)
  ctx.fillStyle = '#8a6844'
  ctx.fillRect(-OS, 944, W + OS * 2, 6)
  // barrel stack (right) — slapped at EV.barrelSlap
  const wob = g > 5.56 ? Math.sin((g - 5.56) * 16) * Math.exp(-(g - 5.56) * 3.2) * 0.06 : 0
  const barrel = (bx, by, bw, bh) => {
    ctx.save()
    ctx.translate(bx, by)
    ctx.rotate(wob)
    const bg = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0)
    bg.addColorStop(0, '#54381c')
    bg.addColorStop(0.45, PAL.s5.wood)
    bg.addColorStop(0.7, '#8a6236')
    bg.addColorStop(1, '#4a3118')
    ctx.fillStyle = bg
    ctx.fillRect(-bw / 2, -bh, bw, bh)
    ctx.fillStyle = '#8a6a44'
    ctx.beginPath(); ctx.ellipse(0, -bh, bw / 2, 12, 0, 0, 7); ctx.fill()
    ctx.fillStyle = '#3a2712'
    ctx.fillRect(-bw / 2, -bh * 0.72, bw, 8)
    ctx.fillRect(-bw / 2, -bh * 0.3, bw, 8)
    ctx.restore()
  }
  barrel(1610, 948, 130, 150)
  barrel(1730, 948, 130, 150)
  barrel(1670, 806, 140, 146)
  // the jig: bounce on the 6/8 eighth pulse (phase = WORLD g so the freeze holds it)
  const e8 = 60 / 140
  const bounce = (ph) => {
    const b = (g + ph) / e8
    const s = Math.sin(b * Math.PI * 2)
    return {
      lift: [Math.round(Math.max(0, s) * 7), Math.round(Math.max(0, -s) * 7)],
      stride: [Math.round(s * 2), Math.round(-s * 2)],
      lean: 0.05 * Math.sin(b * Math.PI),
    }
  }
  const bob = (ph) => Math.abs(Math.sin((g + ph) / e8 * Math.PI)) * 6
  sprite(ctx, S.d1, 520, 950 - bob(0.8), { ...bounce(0.8), sx: 2.75, sy: 2.75 })
  sprite(ctx, S.d2, 900, 950 - bob(0), { ...bounce(0), sx: 2.75, sy: 2.75 })
  sprite(ctx, S.d3, 1280, 950 - bob(1.4), { ...bounce(1.4), sx: 2.75, sy: 2.75, flip: true })
  // JACK cuts in late
  if (g > 6.2) {
    const jx = g < 7.4 ? lerp(-90, 240, E.outCubic(seg(g, 6.2, 7.4))) : 240
    sprite(ctx, S.jack, jx, 952 - bob(2.1), { ...bounce(2.1), sx: 2.8, sy: 2.8, flip: g < 7.4 })
  }
  // barrel-slap wood chips fly on REAL time (alive through the freeze)
  ART.chips(ctx, [{ t: 5.4, x: 1568, y: 806, seed: 55 }], lt, 0.9, [PAL.s5.wood, '#8a6236', '#c9a45c'], 14, 1.1, 1400)
  ctx.restore()
}

// ============================== S6 — HAIRBERG (43–52) ==============================
function drawHairberg(ctx, lt, t, ov) {
  const g = lt
  camOpen(ctx, CAM[5], lt, 9)
  ART.sky(ctx, [[0, PAL.s6.night], [1, '#0a1420']])
  stars(ctx, t, 60, 380, 6)
  const moon = ctx.createRadialGradient(300, 130, 20, 300, 130, 320)
  moon.addColorStop(0, 'rgba(207,226,240,0.35)')
  moon.addColorStop(1, 'rgba(207,226,240,0)')
  ctx.fillStyle = moon
  ctx.fillRect(0, 0, 700, 500)
  ART.sea(ctx, 520, t, {
    bands: ['#12283c', '#0e2234', PAL.s6.sea, '#081624', '#060f1a'],
    foam: 'rgba(180,205,224,0.4)', amp: 5, depth: 300, glintX: 420, glintCol: 'rgba(207,226,240,0.4)',
  })
  // THE SIGNATURE IMAGE: the immense STILL bald head, dead ahead
  ctx.drawImage(S.berg, 560, -90)
  // near water bands swallow the ice foot (deep enough to hide the bake's base edge)
  ART.sea(ctx, 790, t, { bands: [PAL.s6.sea, '#081624', '#060f1a'], amp: 8, depth: 290 })
  ctx.fillStyle = 'rgba(220,232,240,0.5)'
  for (let px = 620; px < 2120; px += 40)
    ctx.fillRect(px, 848 + 5 * Math.sin(px * 0.02 + t * 1.4), 18 + (px % 13), 3)
  // P2-2 the single slow scalp glint at EV.bergGlint (bell handled by the score).
  // Drawn on the overlay (post-fx, so it can't be dimmed under threshold), at a
  // position ON the upper scalp and clear of the top letterbox bar, with the flash
  // window centred so the peak lands exactly at t = EV.bergGlint.abs = 44.6.
  ART.glint(ov, 1240, 300, 150, seg(t, EV.bergGlint.abs - 0.55, EV.bergGlint.abs + 0.55))
  ART.snow(ctx, g, 6, 80, { alpha: 0.65, size: 3.5 })
  // bridge wing: deck, rail, lamp post
  ctx.fillStyle = '#0b1220'
  ctx.fillRect(-OS, 964, W + OS * 2, H + OS - 964)
  ctx.fillStyle = '#131f30'
  ctx.fillRect(-OS, 964, W + OS * 2, 8)
  sprite(ctx, S.look2, 300, 995, { sx: 3.2, sy: 3.2, lean: 0.03 })
  sprite(ctx, S.look1, 560, 992, { sx: 2.15, sy: 2.15, flip: true, lean: 0.04 })
  // the CAPTAIN enters and stops
  if (g > 3.2) {
    const cx2 = g < 5.6 ? lerp(2160, 1460, E.outCubic(seg(g, 3.2, 5.6))) : 1460
    sprite(ctx, S.capt, cx2, 1010, { ...(g < 5.6 ? walk(cx2, 5) : { lift: [2, 0], stride: [1, 0], lean: 0.03 }), sx: 2.35, sy: 2.35 })
  }
  ctx.fillStyle = '#101a2a'
  ctx.fillRect(-OS, 872, W + OS * 2, 14)
  for (let px = -140; px < W + OS; px += 178) {
    ctx.fillStyle = '#16233a'
    ctx.fillRect(px, 884, 14, 84)
  }
  ctx.fillStyle = '#0d1626'
  ctx.fillRect(-OS, 918, W + OS * 2, 7)
  // warm bridge-wing lamp
  ctx.strokeStyle = '#1c2a40'
  ctx.lineWidth = 8
  ctx.beginPath(); ctx.moveTo(140, 960); ctx.lineTo(140, 700); ctx.stroke()
  const lamp = ctx.createRadialGradient(140, 694, 6, 140, 694, 130)
  lamp.addColorStop(0, 'rgba(255,207,138,0.85)')
  lamp.addColorStop(1, 'rgba(255,207,138,0)')
  ctx.fillStyle = lamp
  ctx.fillRect(10, 564, 260, 260)
  ctx.fillStyle = '#ffcf8a'
  ctx.beginPath(); ctx.arc(140, 694, 12, 0, 7); ctx.fill()
  // P3-4 contrast scrims: the bridge-lane captions sit over the white berg
  let sc = capA(t, 43.4, 46.3, 0.3, 0.3)
  if (sc > 0)
    ART.scrimPill(ctx, 1200, 868, measure(ctx, 'LOOKOUT — THAT IS NO ICEBERG. THAT IS A FOREHEAD.', 40, F.serif, 0.5, '600') + 84, 74, 0.6 * sc)
  sc = capA(t, 46.5, 49.4, 0.3, 0.3)
  if (sc > 0)
    ART.scrimPill(ctx, 1200, 868, measure(ctx, 'CAPTAIN — FULL AHEAD. AND SOMEBODY FETCH MY RAZOR.', 40, F.serif, 0.5, '600') + 84, 74, 0.6 * sc)
  sc = capA(t, 49.6, 51.9, 0.3, 0.15)
  if (sc > 0)
    ART.scrimPill(ctx, 960, 500, measure(ctx, 'UNSINKABLE. UNCONDITIONABLE. UN-COMBABLE. — C.', 40, F.serif, 0.5, '600') + 96, 80, 0.75 * sc) // weakest case — must pass
  ctx.restore()
}

// ============================== S7 — IMPACT (52–60) — IMPACT clock ==============================
function drawImpact(ctx, lt, t) {
  const { g, stop } = IMPACT.warp(lt)
  const shakeAmp = stop ? 5 : lt > 2.88 ? Math.max(0, 5 * (1 - (lt - 2.88) / 0.35)) : 0
  const shx = shakeAmp ? (hash(Math.floor(lt * 120) + 7) - 0.5) * 2 * shakeAmp : 0
  const shy = shakeAmp ? (hash(Math.floor(lt * 120) + 99) - 0.5) * 2 * shakeAmp : 0
  camOpen(ctx, CAM[6], lt, 8, shx, shy)
  const listA = 0.07 * E.outCubic(seg(g, EV.listStart.g, EV.listStart.g + 2.6)) // ~4°, permanent
  ART.sky(ctx, [[0, PAL.s7.night], [1, '#0d1826']])
  stars(ctx, t, 40, 300, 8)
  ART.sea(ctx, 600, t, {
    bands: ['#102438', '#0c1e30', PAL.s7.deep, '#081624', '#060f1a'],
    foam: 'rgba(190,210,226,0.5)', amp: 6, depth: 300,
  })
  // the scalp, close (shoved slightly during the slow-mo scrape, then STILL)
  ctx.imageSmoothingEnabled = true // painted bake at 1.5x — keep the vector edges soft
  const bergX = 980 + 10 * seg(g, 2.88, 3.68)
  ctx.drawImage(S.berg, bergX, -140, 2340, 1680)
  ctx.imageSmoothingEnabled = false
  ART.sea(ctx, 840, t, { bands: [PAL.s7.deep, '#081624', '#060f1a'], amp: 8, depth: 260 })
  // the hull group rotates against the horizontal water (pivot low on the prow)
  ctx.save()
  ctx.translate(620, 1060)
  ctx.rotate(listA)
  ctx.translate(-620, -1060)
  const stemX = g < 2.6 ? lerp(1290, 1160, E.inCubic(seg(g, 0, 2.6))) : 1160
  // the prow: plated steel with a moonlit sheer, gold line, lit portholes
  const hullG = ctx.createLinearGradient(0, 560, 0, 1080)
  hullG.addColorStop(0, '#1c2836') // PAL.s10.hull — s7 keeps to the deep/ice/spark keys
  hullG.addColorStop(1, '#0e1826')
  ctx.fillStyle = hullG
  ctx.beginPath()
  ctx.moveTo(-OS, -OS); ctx.lineTo(-OS, 1080)
  ctx.lineTo(560, 1080)
  ctx.quadraticCurveTo(1000, 1000, stemX + 30, 880)
  ctx.lineTo(stemX, 700)
  ctx.quadraticCurveTo(760, 640, 420, 620)
  ctx.lineTo(-OS, 600)
  ctx.closePath(); ctx.fill()
  // moonlit sheer edge
  ctx.strokeStyle = '#4a5e7c'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(-OS, 604)
  ctx.quadraticCurveTo(760, 644, stemX, 700)
  ctx.stroke()
  // gold line + portholes following the sheer
  ctx.fillStyle = PAL.s7.rivetBrass
  ctx.save()
  ctx.translate(0, 0)
  for (let px = -OS; px < stemX - 60; px += 8) {
    const py = 604 + 96 * ((px + OS) / (stemX + OS)) ** 1.6
    ctx.fillRect(px, py, 8, 7)
  }
  ctx.restore()
  for (let px = -100; px < stemX - 160; px += 150) {
    const py = 604 + 130 * ((px + OS) / (stemX + OS)) ** 1.6
    ctx.fillStyle = '#ffcf8a'
    ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill()
    ctx.fillStyle = 'rgba(255,207,138,0.25)'
    ctx.beginPath(); ctx.arc(px, py, 20, 0, 7); ctx.fill()
  }
  // hull plating seams
  ctx.strokeStyle = 'rgba(10,16,26,0.8)'
  ctx.lineWidth = 3
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(-OS, 604 + i * 110)
    ctx.quadraticCurveTo(700, 660 + i * 110, stemX - 40 - i * 60, 720 + i * 90)
    ctx.stroke()
  }
  // bow wave churn under the stem
  ctx.fillStyle = 'rgba(220,232,240,0.55)'
  for (let i = 0; i < 9; i++) {
    const wx = stemX + 20 - i * 40, wy = 900 + Math.sin(t * 7 + i) * 9 + i * 7
    ctx.beginPath(); ctx.arc(wx, wy, 12 + i * 3.4, 0, 7); ctx.fill()
  }
  // mast lamps swinging on the list (pendulum, real-time kick at the hit)
  const swing = listA * 1.4 + Math.sin((lt - 2.6) * 3) * Math.exp(-Math.max(0, lt - 2.6) * 0.9) * 0.4
  for (const mx of [420, 620]) {
    ctx.save()
    ctx.translate(mx, 320)
    ctx.rotate(swing * (mx === 420 ? 1 : 0.85))
    ctx.strokeStyle = '#1c2a40'
    ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(0, -300); ctx.lineTo(0, 0); ctx.stroke()
    ctx.fillStyle = '#ffcf8a'
    ctx.beginPath(); ctx.arc(0, 16, 9, 0, 7); ctx.fill()
    const lg = ctx.createRadialGradient(0, 16, 4, 0, 16, 110)
    lg.addColorStop(0, 'rgba(255,207,138,0.55)')
    lg.addColorStop(1, 'rgba(255,207,138,0)')
    ctx.fillStyle = lg
    ctx.fillRect(-110, -90, 220, 220)
    ctx.restore()
    ART.lampCone(ctx, mx + swing * 250, 336 + swing * 40, Math.PI / 2 + swing, 460, 0.4, 'rgba(255,207,138,0.06)', 0.8)
  }
  ctx.restore() // hull group
  // rivets pop + dandruff chunks arc on REAL time (alive through freeze and slow-mo)
  const hit = lt - 2.6
  if (hit > 0 && hit < 2.4) {
    ART.chips(ctx, [{ t: 2.6, x: 1180, y: 700, seed: 71 }], lt, 1.6, [PAL.s7.spark, PAL.s7.rivetBrass, '#fff2cc'], 26, 1.2, 1000)
    ART.chips(ctx, [{ t: 2.62, x: 1230, y: 640, seed: 88 }], lt, 2.2, ['#eef4fa', '#c9d8e4'], 14, 1.3, 700)
  }
  // white contact bloom at the hit point during the freeze
  const ck = stop ? 1 : hit > 0 && hit < 0.3 ? 1 - hit / 0.3 : 0
  if (ck > 0) {
    const cg = ctx.createRadialGradient(1180, 700, 10, 1180, 700, 300)
    cg.addColorStop(0, `rgba(255,255,255,${0.7 * ck})`)
    cg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = cg
    ctx.fillRect(880, 400, 620, 620)
  }
  ctx.restore()
}

// ============================== S8 — QUARTET (60–69) ==============================
function drawQuartet(ctx, lt, t) {
  const g = lt
  camOpen(ctx, CAM[7], lt, 9)
  ART.sky(ctx, [[0, PAL.s8.black], [1, '#101a28']])
  stars(ctx, t, 50, 340, 11)
  // the stern rising slightly behind
  ctx.save()
  ctx.translate(1500, 1000)
  ctx.rotate(0.04 * (g / 9))
  ctx.translate(-1500, -1000 + 30 * (g / 9))
  ctx.fillStyle = '#0d1522'
  ctx.fillRect(1300, 300, W + OS - 1300, 480)
  ctx.fillStyle = '#16233a'
  for (let i = 0; i < 4; i++) ctx.fillRect(1340 + i * 130, 380 + i * 70, 90, 34)
  ctx.restore()
  // the listing deck (permanent ~4°) with the quartet planted on it
  ctx.save()
  ctx.translate(960, 1080)
  ctx.rotate(0.07)
  ctx.translate(-960, -1080)
  const deckG = ctx.createLinearGradient(0, 690, 0, H + OS)
  deckG.addColorStop(0, PAL.s8.deckCold)
  deckG.addColorStop(1, '#0c1624')
  ctx.fillStyle = deckG
  ctx.fillRect(-OS, 730, W + OS * 2, H + OS - 730)
  ctx.fillStyle = 'rgba(210,224,238,0.14)'
  ctx.fillRect(-OS, 730, W + OS * 2, 6)
  ctx.fillStyle = 'rgba(6,10,16,0.5)'
  for (let px = -OS; px < W + OS; px += 140) ctx.fillRect(px, 742, 5, H)
  // back rail + warm lamp posts
  ctx.fillStyle = '#101c2c'
  ctx.fillRect(-OS, 700, W + OS * 2, 10)
  for (const lpx of [240, 1680]) {
    ctx.fillStyle = '#131f30'
    ctx.fillRect(lpx, 480, 12, 250)
    const lg = ctx.createRadialGradient(lpx + 6, 470, 5, lpx + 6, 470, 150)
    lg.addColorStop(0, 'rgba(240,214,168,0.7)')
    lg.addColorStop(1, 'rgba(240,214,168,0)')
    ctx.fillStyle = lg
    ctx.fillRect(lpx - 144, 320, 300, 300)
    ctx.fillStyle = PAL.s8.lampWarm
    ctx.beginPath(); ctx.arc(lpx + 6, 470, 10, 0, 7); ctx.fill()
  }
  // P2-1 the deck chair slides in a BACK row (drawn before the quartet so it passes
  // behind the portrait, never across a face) and goes over the low side at g 7.6
  const cu = E.inQuad(seg(g, 1.0, 7.6))
  const chx = lerp(360, 1660, cu)
  const chy = 800 + (chx - 960) * 0.07 - 20
  ctx.save()
  ctx.translate(chx, chy)
  if (g > 7.6) {
    const fu = g - 7.6
    ctx.translate(fu * 160 * fu, fu * 260 * fu)
    ctx.rotate(fu * 5)
  } else ctx.rotate(Math.sin(g * 6) * 0.05 * cu)
  ctx.drawImage(S.chair, -95, -110)
  ctx.restore()
  // the quartet, centre-static like a portrait; they bow mid-phrase
  const bowK = bell(seg(g, 3.2, 4.6)) * 0.13
  S.quartet.forEach((q, i) =>
    sprite(ctx, q, 700 + i * 200, 856, {
      sx: 4.2, sy: 4.2, rot: bowK * (1 + i * 0.08), lift: [1, 0], stride: [1, 0],
    }))
  // P3-7 they hold no instruments? never: violins, viola, cello — bows see-saw the phrase
  S.quartet.forEach((q, i) => {
    const px2 = 700 + i * 200
    if (i < 3) {
      const mir = i % 2 ? 1 : 0
      const iy = 856 - 332 * 0.54 + mir * 16 // mirrored side sits lower — keep eyes clear
      ctx.save()
      ctx.translate(px2 + (mir ? -52 : 46), iy)
      ctx.rotate((mir ? -0.42 : 0.55) + Math.sin(t * 2.2 + i * 1.4) * 0.05)
      ctx.drawImage(i === 2 ? S.viola : S.violin, -30, -26)
      ctx.restore()
      ART.bow(ctx, px2 + (mir ? -44 : 52), iy - 2, 150, (mir ? 0.5 : -0.55) + Math.sin(t * 2.2 + i) * 0.07, t, i)
    } else {
      // cello: endpin planted on the deck, played tall
      ctx.save()
      ctx.translate(px2 + 10, 852)
      ctx.rotate(Math.sin(t * 1.8) * 0.03)
      ctx.drawImage(S.cello, -60, -310, 168, 308)
      ctx.restore()
      ART.bow(ctx, px2 + 52, 856 - 332 * 0.44, 175, -0.35 + Math.sin(t * 1.9) * 0.06, t, 3)
    }
  })
  ctx.restore() // deck group
  // P3-7 the waterline climbs visibly from the first seconds (rows gain water 62→69),
  // horizontal against the list, with a bright animated foam edge on the rise
  const wl = lerp(1000, 770, seg(lt, 0.5, 8.6))
  ART.sea(ctx, wl, t, { bands: [PAL.s8.waterline, '#071120', '#050b14'], amp: 8, depth: 300, foam: 'rgba(205,224,238,0.8)' })
  ctx.fillStyle = 'rgba(228,240,250,0.9)'
  for (let px = -OS; px < W + OS; px += 42) {
    const wy = wl + 6 * Math.sin(px * 0.014 + t * 1.8)
    ctx.globalAlpha = 0.45 + 0.4 * Math.sin(px * 0.05 + t * 2.6)
    ctx.fillRect(px, wy - 2, 22 + (px % 19), 4)
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

// ============================== S9 — THE DOOR (69–79) ==============================
function drawDoor(ctx, lt, t) {
  const g = lt
  camOpen(ctx, CAM[8], lt, 10)
  ART.sky(ctx, [[0, '#02040a'], [1, '#04080f']])
  stars(ctx, t, 46, 240, 13)
  ART.sea(ctx, 280, t, {
    bands: ['#0a1622', '#081220', PAL.s9.blackWater, '#04080f', '#03060b'],
    foam: 'rgba(160,180,200,0.25)', amp: 4, depth: 300,
  })
  // star glints pricking the swell
  for (let i = 0; i < 26; i++) {
    const gx = hash(i * 31 + 4) * W, gy = 330 + hash(i * 17 + 9) * 480
    ctx.globalAlpha = 0.3 * Math.max(0, Math.sin(t * (1.1 + hash(i) * 1.4) + i * 2.4))
    ctx.fillStyle = '#cfdcee'
    ctx.fillRect(gx, gy + 6 * Math.sin(t + i), 3, 2)
  }
  ctx.globalAlpha = 1
  // JACK's mane fanned flat on the surface (behind him, under the front water band)
  ART.hairFan(ctx, 1400, 806, t, 42, { n: 15, len: 260, col: PAL.s9.hairRed, hi: '#d15a3a', w: 8, alpha: 0.85 })
  // the door panel and ROSE lying along it (starlight rims — near-monochrome navy)
  ctx.save()
  ctx.translate(730, 750)
  ctx.rotate(-0.05)
  ctx.drawImage(S.door, -350, -110)
  ctx.restore()
  sprite(ctx, S.roseRim, 1004, 675, { rot: -1.45, sx: 2.4, sy: 2.4, alpha: 0.85 })
  sprite(ctx, S.rose, 1010, 678, { rot: -1.45, sx: 2.4, sy: 2.4 })
  ART.hairStream(ctx, 760, 640, -1, t, 23, { n: 4, len: 90, col: '#df9c9c', hi: '#eec0be', w: 6, alpha: 0.6, rise: -40 })
  // JACK chin-deep; the grip slip sinks him a hand's width (soft, at EV.gripSlip)
  const slip = E.inCubic(seg(g, EV.gripSlip.g, EV.gripSlip.g + 1.0))
  const jy = 1078 + slip * 16
  const jg = ctx.createRadialGradient(1400, jy - 240, 20, 1400, jy - 240, 260)
  jg.addColorStop(0, 'rgba(150,175,200,0.2)')
  jg.addColorStop(1, 'rgba(150,175,200,0)')
  ctx.fillStyle = jg
  ctx.fillRect(1140, jy - 500, 520, 520)
  sprite(ctx, S.jackRim, 1390, jy - 4, { sx: 3.0, sy: 3.0, rot: slip * 0.08, lift: [1, 0], alpha: 1 })
  sprite(ctx, S.jack, 1400, jy, { sx: 3.0, sy: 3.0, rot: slip * 0.08, lift: [1, 0] })
  // front water band: the surface line that keeps them both in the cold
  const wl = 810
  ctx.fillStyle = PAL.s9.blackWater
  ctx.beginPath()
  ctx.moveTo(-OS, H + OS)
  for (let px = -OS; px <= W + OS; px += 40) ctx.lineTo(px, wl + 5 * Math.sin(px * 0.012 + t * 1.1))
  ctx.lineTo(W + OS, H + OS)
  ctx.closePath(); ctx.fill()
  ctx.fillStyle = 'rgba(160,180,200,0.28)'
  for (let px = -OS; px < W + OS; px += 90)
    ctx.fillRect(px, wl + 5 * Math.sin(px * 0.012 + t * 1.1) + 3, 26 + (px % 21), 2)
  // the slip ripple
  ART.ripple(ctx, 1330, 820, g - EV.gripSlip.g, 2.4, 'rgba(190,215,235,0.9)')
  // breath vapor in the cold
  ART.breath(ctx, 742, 636, g, 2.3, 9, 0.4)
  ART.breath(ctx, 1398, 786, g, 2.7, 31, 0.45)
  ctx.restore()
}

// ============================== S10 — PENDANT (79–85) ==============================
function drawPendant(ctx, lt, t) {
  const g = lt
  // screen-space base so the deep-sea colour holds everywhere the camera pans
  ctx.fillStyle = '#03070d'
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  camOpen(ctx, CAM[9], lt, 6)
  const dropG = EV.pendantDrop.g
  const camY = 660 * E.inQuad(seg(g, dropG, dropG + 2.2)) // tilt-DOWN: world slides up
  ctx.save()
  ctx.translate(0, -camY)
  ART.sky(ctx, [[0, '#04070d'], [1, '#071018']])
  stars(ctx, t, 40, 300, 21)
  ART.sea(ctx, 430, t, {
    bands: ['#0c1c2c', PAL.s10.seaNight, '#060e18', '#040a12', '#03070d'],
    foam: 'rgba(170,195,215,0.3)', amp: 5, depth: 420, glintX: 1000, glintCol: 'rgba(207,226,240,0.25)',
  })
  // survey-ship stern deck across the top of the frame
  const deckG = ctx.createLinearGradient(0, 150, 0, 430)
  deckG.addColorStop(0, '#16222e')
  deckG.addColorStop(1, PAL.s10.hull)
  ctx.fillStyle = deckG
  ctx.fillRect(-OS, 170, W + OS * 2, 270)
  ctx.fillStyle = '#1e2c3c'
  ctx.fillRect(-OS, 170, W + OS * 2, 8)
  ctx.fillStyle = '#0d1622'
  ctx.fillRect(-OS, 296, W + OS * 2, 12)
  for (let px = -140; px < W + OS; px += 165) ctx.fillRect(px, 308, 12, 130)
  ctx.fillStyle = 'rgba(220,232,240,0.12)'
  for (let px = -OS; px < W + OS; px += 150) ctx.fillRect(px, 186, 5, 110)
  // searchlight sweeping the water
  ART.lampCone(ctx, 240, 300, 0.9 + 0.18 * Math.sin(t * 0.5), 1500, 0.12, 'rgba(238,244,250,0.05)', 0.7)
  // wake lines under the stern
  ctx.strokeStyle = 'rgba(60,100,140,0.3)'
  ctx.lineWidth = 4
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(1180 - i * 60, 452 + i * 12)
    ctx.lineTo(1400 + i * 80, 520 + i * 30)
    ctx.stroke()
  }
  // OLD ROSE at the rail, holding the pendant up until EV.pendantDrop
  sprite(ctx, S.oldRose, 1240, 428, { sx: 2.25, sy: 2.25, flip: true, lean: -0.06 })
  ctx.restore()
  // the gem: held, dropped, splashed, sinking — tracked by the camera pan
  let gx = 1165, gy = 352, glowA = 1, sunk = 0
  if (g > dropG) {
    const u = g - dropG
    const splash = 0.59
    if (u < splash) gy = 352 + 900 * u * u
    else {
      const u2 = u - splash
      gy = 562 + 74 * u2 + 34 * u2 * u2
      gx = 1165 + 16 * u2
      sunk = seg(u2, 0.8, 3.4)
    }
    glowA = 1 - 0.85 * sunk
  }
  ctx.save()
  ctx.translate(0, -camY)
  if (g > dropG + 0.59) ART.ripple(ctx, 1165, 562, g - dropG - 0.59, 1.6, 'rgba(190,215,235,0.8)')
  ART.gem(ctx, gx, Math.min(gy, 352 + 900 * 1.4), 1.5, glowA)
  ctx.restore()
  ctx.restore()
}

// ============================== S11 — END CARD (85–90) ==============================
function drawEndcard(ctx, lt, t) {
  camOpen(ctx, CAM[10], lt, 5)
  const g = ctx.createLinearGradient(0, -OS, 0, H + OS)
  g.addColorStop(0, '#0e1c38')
  g.addColorStop(1, PAL.s11.navy)
  ctx.fillStyle = g
  ctx.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  ART.engravedFrame(ctx, 92, 'rgba(201,176,106,0.8)')
  // top ornament: star + rules
  ctx.fillStyle = PAL.s11.engraveGold
  ctx.save()
  ctx.translate(960, 306)
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    ctx.lineTo(Math.cos(a) * (i % 2 ? 5 : 14), Math.sin(a) * (i % 2 ? 5 : 14))
  }
  ctx.closePath(); ctx.fill()
  ctx.restore()
  ctx.fillRect(700, 340, 520, 2)
  // the engraved title (drawn again sunken below the waterline)
  const title = (fill, dy, alpha) => {
    ctx.globalAlpha = alpha
    ctx.font = `700 176px ${F.serif}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.letterSpacing = '18px'
    ctx.fillStyle = '#3a2c10'
    ctx.fillText('HAIRTANIC', 960 + 4, 512 + dy + 4)
    const tg = ctx.createLinearGradient(0, 380, 0, 520)
    tg.addColorStop(0, '#e2cf8e')
    tg.addColorStop(1, '#a8843e')
    ctx.fillStyle = fill ?? tg
    ctx.fillText('HAIRTANIC', 960, 512 + dy)
    ctx.letterSpacing = '0px'
    ctx.globalAlpha = 1
  }
  title(null, 0, 1)
  ctx.fillStyle = PAL.s11.engraveGold
  ctx.fillRect(760, 548, 400, 2)
  // THE GIMMICK: the waterline rises THROUGH the card from EV.titleSinkStart
  // (reaches the title at ~89.2 so the sink reads before the 89.4 fade begins)
  const wl = lerp(H + 40, 520, E.inQuad(seg(lt, EV.titleSinkStart.g, EV.titleSinkStart.g + 2.7)))
  if (wl < H + 30) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-OS, H + OS)
    for (let px = -OS; px <= W + OS; px += 36)
      ctx.lineTo(px, wl + 7 * Math.sin(px * 0.01 + t * 1.6))
    ctx.lineTo(W + OS, H + OS)
    ctx.closePath()
    ctx.clip()
    // drowned card: darkened wash + the letters sunk (offset, ink-dark)
    ctx.fillStyle = 'rgba(63,107,143,0.35)'
    ctx.fillRect(-OS, wl - 20, W + OS * 2, H + OS)
    const dg = ctx.createLinearGradient(0, wl, 0, H + OS)
    dg.addColorStop(0, 'rgba(10,26,44,0.25)')
    dg.addColorStop(1, 'rgba(6,10,18,0.8)')
    ctx.fillStyle = dg
    ctx.fillRect(-OS, wl, W + OS * 2, H + OS)
    title('#060a12', 9, 0.85)
    ctx.restore()
    // foam fringe on the surface
    ctx.fillStyle = PAL.s11.foam
    for (let px = -OS; px < W + OS; px += 44) {
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(px * 0.05 + t * 2.2)
      ctx.fillRect(px, wl + 7 * Math.sin(px * 0.01 + t * 1.6) - 2, 20 + (px % 17), 3)
    }
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

// ============================== the film ==============================
export default {
  title: 'HAIRTANIC',
  output: 'hairtanic.mp4',
  duration: SHOTS[SHOTS.length - 1].t1,
  async prepare({ variant } = {}) {
    const L = async (id, far) => A.loadRemy(id, far)
    // CAST (locked; contact-sheet reviewed): see films/hairtanic casting in timeline notes.
    S.jack = ART.stripBlade(await L(42, false)) // portfolio blade stripped — reads clean at every scale
    S.rose = await L(2373, false) // rose-pink flow hair, black coat
    S.cal = await L(1558, false) // bald, black tee (chest print never in close-up)
    S.capt = await L(2636, false) // bald, mustache
    S.look1 = await L(961, false) // binoculars baked — the gag reads at near scale
    S.look2 = await L(501, true) // binoculars baked, far cut drawn large enough for the glass
    S.quartet = []
    for (const id of [1620, 564, 2061, 582]) S.quartet.push(await L(id, true))
    S.d1 = await L(96, false)
    S.d2 = await L(220, false)
    S.d3 = await L(273, false)
    S.oldRose = await L(1627, false) // shawl, grey hair
    S.crowd = []
    for (const id of [3, 4, 1007, 96, 220, 273, 335, 3100]) S.crowd.push(await L(id, true))
    // silhouette/rim variants (baked once)
    S.jackDark = ART.tint(S.jack, PAL.s4.silhouette)
    S.roseDark = ART.tint(S.rose, PAL.s4.silhouette)
    for (const key of ['jack', 'rose', 'oldRose'])
      S[key] = { ...S[key], rimC: ART.tint(S[key], key === 'oldRose' ? '#ffcf8a' : '#ff9a5a') }
    S.jackRim = { ...S.jack, c: ART.tint(S.jack, '#cfdcee') } // starlight rims for the black water
    S.roseRim = { ...S.rose, c: ART.tint(S.rose, '#aebfd4') }
    // environment bakes
    S.wreck = ART.wreckBake()
    S.liner = ART.linerBake()
    S.banner = ART.bannerBake('THE REMY STAR LINE')
    S.berg = ART.bergBake()
    S.door = ART.doorBake()
    S.chair = ART.chairBake()
    // P3-7 the quartet's set: two violins, a viola (deeper varnish, larger), a cello
    S.violin = ART.violinBake(1.25)
    S.viola = ART.violinBake(1.45, true)
    S.cello = ART.celloBake()
  },
  shots: SHOTS.map((sh, i) => ({
    name: sh.name,
    t0: sh.t0,
    t1: sh.t1,
    draw(ctx, lt, dur, t, ov) {
      ;[drawWreck, drawSouthampton, drawBow, drawSunset, drawSteerage, drawHairberg, drawImpact, drawQuartet, drawDoor, drawPendant, drawEndcard][i](ctx, lt, t, ov)
    },
    fx: (lt, t) => {
      const base = { letterbox: 0.8, bloom: 0.08, bloomThresh: 0.9, vignette: 0.6, grain: 0.012 }
      switch (sh.name) {
        case 'wreck': return { ...base, vignette: 0.8, grain: 0.015, tint: [0.88, 0.96, 1.1] }
        case 'southampton': return { ...base, bloom: 0.12, vignette: 0.5, warm: 0.04 }
        case 'bow': return { ...base, bloom: 0.1, vignette: 0.5, warm: 0.06 }
        case 'sunset': return { ...base, bloom: 0.12, vignette: 0.55, warm: 0.1, grain: 0.011 }
        case 'steerage': return { ...base, bloom: 0.08, vignette: 0.55, warm: 0.14 }
        case 'hairberg': return { ...base, bloom: 0.06, vignette: 0.8, grain: 0.014, sat: 0.85, tint: [0.9, 0.98, 1.06] }
        case 'impact': return {
          ...base, bloom: 0.08, vignette: 0.7, grain: 0.015,
          aber: t >= EV.impactHit.abs && t < EV.impactHit.abs + 0.28 ? 0.0012 : 0, // the freeze window only
        }
        case 'quartet': return { ...base, vignette: 0.75, grain: 0.013, sat: 0.8, tint: [0.92, 0.97, 1.05] }
        case 'door': return { ...base, bloom: 0.05, vignette: 0.8, grain: 0.014, sat: 0.55 }
        case 'pendant': return { ...base, bloom: 0.07, vignette: 0.8, grain: 0.013, fade: seg(lt, 5.2, 5.9) }
        case 'endcard': return { ...base, bloom: 0.05, vignette: 0.6, grain: 0.008, fade: seg(lt, 4.4, 5.0) }
        default: return base
      }
    },
  })),
  captions: CAPTIONS.map((c) => {
    // P3-3 motion-QA lane fixes: per-caption x/y ONLY (t0/t1/minHold untouched except
    // the documented s9_narr linter-basis note). Moves: s3 volley → sky lane y250
    // (clear of both figures' shoes); s5 pair → wall lane y350 (below the stairwell,
    // above the dancers' heads); s8 pair → sky lane y240 (clear of the portrait's
    // legs); s6 pair → x1200 (clear of both lookouts' heads).
    const move = {
      s3_jack: { y: 250 }, s3_rose: { y: 250 },
      s5_narr1: { y: 350 }, s5_narr2: { y: 350 },
      s8_narr1: { y: 240 }, s8_narr2: { y: 240 },
      s6_lookout: { x: 1200 }, s6_captain: { x: 1200 },
    }[c.id]
    const out = move ? { ...c, ...move } : c
    // s9_narr: the core linter measures only the PRE-CUT portion of a span caption
    // (79.0 cut; pre-cut fragment 0.45s). The timeline's own hold table sanctions this
    // card on the full window — 1.65s ≥ its 1.6s floor — and the drawn hold is unchanged.
    // This restates the threshold on the linter's measurement basis; timings untouched.
    return out.id === 's9_narr' ? { ...out, minHold: 0.45 } : out
  }),
  captionStyles: {
    kicker: { font: F.mono, size: 26, weight: '700', color: '#c8d6e4', track: 6, shadow: '#04070c' },
    title: { font: F.serif, size: 148, weight: '700', color: '#d9c88a', track: 14, glow: '#12233f', glowBlur: 24, shadow: '#04070c' },
    sub: { font: F.serif, size: 31, weight: '600', color: '#cfc2a4', track: 7, shadow: '#04070c' },
    caption: {
      font: F.serif, size: 40, weight: '600', color: '#f2ead6', track: 0.5,
      shadow: 'rgba(3,6,10,0.9)', glow: 'rgba(3,6,10,0.9)', glowBlur: 12,
      // s6_telegram is the only 'type' caption: 46 chars must finish keying fast enough
      // to leave its sanctioned 1.6s hold before the 51.9 cut (cps 200 → 0.23s of keying).
      cps: 200,
    },
  },
  flashes: [[EV.impactHit.abs, 0.28, 0.12]], // the HIT only; peak ≤ 0.3, decay ≤ 0.2
  score: score, // composed against the same timeline clocks (STEER.abs / IMPACT.abs)
  audio: { seed: 1912, reverb: 3.4, reverbGain: 0.5 }, // composer-recommended hall
  lint: { captionHold: 2.2, safe: { margin: 0.05, letterbox: true } },
}
