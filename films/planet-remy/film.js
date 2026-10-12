// PLANET REMY — "The Mane Event": a Remy Boys nature documentary, one dawn-to-dawn day.
// Pixel savannas baked per light of day; the shared remy-bros rig for the cast; narration,
// field stamps and species cards as documentary chrome. Native 960×540 stage → 2× nearest.
import { W, H, hash, seg, E, txt, F, clamp } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'
import { DURATION, T, LW, LH, NARR, LOCS, CARD, HERO, HERD, RAID } from './timeline.js'
import * as C from './choreo.js'
import * as ART from './art.js'
import { score } from './score.js'

const ARTX = {}
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const ENV_W = 1400, ENV_H = 600

async function img(url) { const i = new Image(); i.src = url; await i.decode(); return i }
const rig = (id) => A.loadRemy(id, false)

// world→stage: draw a parallax layer of the baked environment
function layer(x, camc, p, fn) {
  x.save()
  x.translate(LW / 2, LH / 2)
  x.scale(camc.z, camc.z)
  x.translate(-camc.x - (ENV_W / 2 - camc.x) * (1 - p), -camc.y - (ENV_H / 2 - camc.y) * (1 - p) * 0.5)
  fn()
  x.restore()
}

// depth scale for actors standing on the plain (y 372..600)
const depth = (feet) => 0.82 + 0.38 * clamp((feet - 372) / 228, 0, 1)

function shadow(x, wx, wfeet, s) {
  x.fillStyle = 'rgba(20,14,26,0.35)'
  x.beginPath()
  x.ellipse(wx, wfeet + 2, 16 * s, 3.8 * s, 0, 0, 7)
  x.fill()
}

function drawRig(x, R, wx, wfeet, o = {}) {
  const s = o.s ?? depth(wfeet)
  shadow(x, wx, wfeet, s)
  A.drawRemy(x, R, wx, wfeet, { ...o, sx: (o.sx ?? 1) * s, sy: (o.sy ?? 1) * s })
}

// animated foreground grass row (nearest layer)
function foreground(x, camc, t, pal, rows = 22) {
  layer(x, camc, 1.14, () => {
    for (let i = 0; i < rows; i++) {
      ART.tuft(x, hash(i * 17 + 5) * ENV_W, 496 + hash(i * 17 + 6) * 92, t, 1.6 + hash(i * 17 + 7), pal)
    }
  })
}

function birds(x, camc, list) {
  if (!list) return
  layer(x, camc, 0.55, () => { for (const b of list) ART.bird(x, b.x, b.y, b.flap, b.s) })
}

function mistDrift(x, camc, t, alpha, y = 386) {
  layer(x, camc, 0.85, () => {
    x.globalAlpha = alpha
    for (let k = 0; k < 2; k++) {
      const off = (t * (7 + k * 3)) % 700
      x.drawImage(ARTX.mist, -off + k * 640 - 320, y + k * 26 - 10)
    }
    x.globalAlpha = 1
  })
}

// ---------- analytic particles ----------
function dust(x, g, colTop) {
  for (const d of C.DUST) {
    const age = g - d.g
    if (age < 0 || age > (d.big ? 1.1 : 0.7)) continue
    const r = (k) => hash(d.seed * 31 + k)
    const n = d.big ? 12 : 5
    for (let i = 0; i < n; i++) {
      const a = r(i) * Math.PI * 2, dist = (d.big ? 26 : 8) + age * (d.big ? 120 : 46) * (0.5 + r(i + 9))
      const dy = -age * (14 + r(i + 3) * 22) + age * age * 40
      const sz = (d.big ? 5 : 3) + age * 4
      x.globalAlpha = (1 - age / (d.big ? 1.1 : 0.7)) * (d.big ? 0.6 : 0.5)
      x.fillStyle = i % 3 ? '#6a4c38' : colTop
      x.fillRect(Math.round(d.x + Math.cos(a) * dist), Math.round(d.y - 4 + Math.sin(a) * 6 + dy), Math.round(sz), Math.round(sz))
    }
    x.globalAlpha = 1
  }
}

// sparkle trail riding the alpha's leap arc (ritual shot, shot-local lt)
function leapSparkles(x, lt) {
  const u = seg(lt, C.LEAP.t0, C.LEAP.t1)
  if (u <= 0 || u >= 1) return
  for (let i = 0; i < 12; i++) {
    const su = (i / 12 + lt * 0.37) % 1
    const arc = Math.sin(Math.PI * su)
    const sx = 646 + (su - 0.5) * 46 * arc
    const sy = 430 - C.LEAP.h * arc * arc - 18 - 34 * (1 - arc)
    const tw = Math.sin(su * Math.PI * 3 + i) ** 2
    x.globalAlpha = arc * tw * 0.9
    x.fillStyle = i % 2 ? '#ffe9b0' : '#fff8e0'
    x.fillRect(Math.round(sx), Math.round(sy), 2, 2)
  }
  x.globalAlpha = 1
}

// one dust burst when the alpha lands from the display leap
function landPuff(x, lt) {
  const age = lt - C.LEAP.t1
  if (age < 0 || age > 0.8) return
  for (let i = 0; i < 10; i++) {
    const a2 = hash(i * 29 + 3) * Math.PI * 2
    const d2 = 8 + age * 90 * (0.5 + hash(i * 29 + 9))
    x.globalAlpha = (1 - age / 0.8) * 0.5
    x.fillStyle = i % 3 ? '#c4a050' : '#e0c070'
    x.fillRect(Math.round(646 + Math.cos(a2) * d2 * 0.5), Math.round(432 + Math.sin(a2) * 5 - age * 12), 3, 3)
  }
  x.globalAlpha = 1
}

// pollen motes hanging in the golden light
function pollen(x, t) {
  for (let i = 0; i < 22; i++) {
    const bx = 540 + hash(i * 9 + 1) * 210 + Math.sin(t * 0.5 + i * 1.9) * 16
    const by = 306 + hash(i * 9 + 2) * 130 + Math.cos(t * 0.42 + i * 2.3) * 12
    const tw = 0.35 + 0.65 * Math.sin(t * 2.1 + i * 2.6) ** 2
    x.globalAlpha = 0.5 * tw
    x.fillStyle = '#ffe9b0'
    x.fillRect(Math.round(bx), Math.round(by), 2, 2)
  }
  x.globalAlpha = 1
}

// ---------- documentary chrome (overlay, post-effects) ----------
function recHud(o, t) {
  const frames = Math.floor(t * 60)
  const tc = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}:${String(Math.floor((t * 60) % 60)).padStart(2, '0')}:${String(frames % 60).padStart(2, '0')}`
  o.save()
  o.globalAlpha = 0.32
  o.fillStyle = '#0e0b16'
  o.beginPath(); o.roundRect(1596, 40, 228, 44, 10); o.fill()
  o.globalAlpha = 0.85
  if (Math.sin(t * 4) > -0.2) { o.fillStyle = '#ff5a4a'; o.beginPath(); o.arc(1614, 62, 8, 0, 7); o.fill() }
  txt(o, `REC  ${tc}`, 1634, 62, { size: 21, font: F.mono, color: '#f0e8dc', align: 'left', base: 'middle', track: 2, glow: '#140f1e', glowBlur: 8 })
  o.restore()
}

// subtle contrast scrim under narration on bright ground
function bottomScrim(o, a) {
  const g = o.createLinearGradient(0, 800, 0, 1080)
  g.addColorStop(0, `rgba(10,8,20,0)`)
  g.addColorStop(1, `rgba(10,8,20,${a})`)
  o.fillStyle = g
  o.fillRect(0, 800, W, 280)
}

// framed circular portrait from the opaque 600×600 originals
function portrait(o, im, cx, cy, r, crop, u) {
  o.save()
  o.globalAlpha = clamp01(u * 2.2)
  o.beginPath(); o.arc(cx, cy, r, 0, 7); o.clip()
  o.drawImage(im, crop[0] - crop[2], crop[1] - crop[2], crop[2] * 2, crop[2] * 2, cx - r, cy - r, r * 2, r * 2)
  o.restore()
  o.save()
  o.globalAlpha = clamp01(u * 2.2)
  o.lineWidth = 4; o.strokeStyle = '#caa96a'
  o.beginPath(); o.arc(cx, cy, r + 5, 0, 7); o.stroke()
  o.lineWidth = 1.5; o.strokeStyle = 'rgba(202,169,106,0.5)'
  o.beginPath(); o.arc(cx, cy, r + 12, 0, 7); o.stroke()
  o.restore()
}

// species field card: panel + portrait + field notes
function speciesCard(o, u, side, im, crop, lines) {
  if (u <= 0 || u >= 1) return
  const s = 1 - Math.pow(1 - Math.min(1, u * 5), 3) // slide settles in the first 20%
  const fade = clamp01(u * 10) * (1 - clamp01((u - 0.88) / 0.12)) // full hold until the last 12%
  if (fade <= 0) return
  const pw = 720, ph = 430
  const px = side === 'right' ? W - 130 - pw : 130
  const py = 320 - (1 - s) * 40
  o.save()
  o.globalAlpha = fade
  o.fillStyle = 'rgba(14,11,20,0.85)'
  o.beginPath(); o.roundRect(px, py, pw, ph, 18); o.fill()
  o.strokeStyle = '#caa96a'; o.lineWidth = 2.5
  o.beginPath(); o.roundRect(px + 10, py + 10, pw - 20, ph - 20, 12); o.stroke()
  const pcx = px + 150, pcy = py + 130
  portrait(o, im, pcx, pcy, 104, crop, 1)
  txt(o, lines.name, px + 300, py + 74, { size: 44, font: F.serif, weight: '600', color: '#f2e7d0', base: 'middle' })
  txt(o, lines.latin, px + 300, py + 120, { size: 21, font: F.mono, color: '#c9a86e', base: 'middle', track: 1 })
  o.strokeStyle = 'rgba(202,169,106,0.55)'; o.lineWidth = 1.5
  o.beginPath(); o.moveTo(px + 300, py + 148); o.lineTo(px + pw - 40, py + 148); o.stroke()
  lines.notes.forEach((s2, i) => txt(o, s2, px + 300, py + 182 + i * 36, { size: 22, font: F.mono, color: '#e8dcc4', base: 'middle' }))
  txt(o, lines.status, px + 40, py + ph - 52, { size: 26, font: F.mono, color: '#9fd48a', base: 'middle', track: 2 })
  txt(o, 'PLANET REMY FIELD GUIDE', px + 40, py + ph - 24, { size: 17, font: F.mono, color: 'rgba(202,169,106,0.75)', base: 'middle', track: 3 })
  o.restore()
}

// ---------- shot painters ----------
function stage() { return ARTX.low.getContext('2d') }

function paintDawn(x, lt, t) {
  const camc = C.cam(t)
  const sw = C.sway(t)
  x.save(); x.translate(sw.dx, sw.dy)
  const env = ART.ENVS.dawn
  layer(x, camc, 0.22, () => x.drawImage(env.far, 0, 0))
  layer(x, camc, 0.62, () => x.drawImage(env.mid, 0, 0))
  // pre-dawn dark + fading stars, lifting as the sun rises (u)
  const u = E.outCubic(seg(lt, 0.2, 4.6))
  layer(x, camc, 0.22, () => {
    x.globalAlpha = (1 - u) * 0.5
    x.fillStyle = '#0e0a24'
    x.fillRect(0, 0, ENV_W, ENV_H)
    x.globalAlpha = (1 - u) * 0.9
    x.fillStyle = '#e8e4ff'
    for (let i = 0; i < 60; i++) x.fillRect(Math.floor(hash(i * 3 + 9) * ENV_W), Math.floor(hash(i * 3 + 10) ** 1.5 * 300), 2, 2)
    x.globalAlpha = 1
  })
  mistDrift(x, camc, t, 0.5)
  birds(x, camc, C.flock(t, 4.3, 1, 138, 4))
  foreground(x, camc, t, env.pal.ground, 18)
  x.restore()
}

function paintHerd(x, lt, t, opts = {}) {
  const camc = C.cam(t)
  const sw = C.sway(t)
  x.save(); x.translate(sw.dx, sw.dy)
  const env = ART.ENVS[opts.env ?? 'day']
  layer(x, camc, 0.22, () => x.drawImage(env.far, 0, 0))
  layer(x, camc, 0.62, () => x.drawImage(env.mid, 0, 0))
  layer(x, camc, 1.0, () => {
    for (const g of C.GRAZE) {
      const p = C.grazePos(g, t)
      drawRig(x, ARTX.herd[p.id], p.x, p.feet, { lean: p.swayA })
    }
    if (opts.hero !== false) drawRig(x, ARTX.hero, C.HERO_GRAZE.x, C.HERO_GRAZE.feet, { lean: Math.sin(t * 0.9) * 0.006, glow: '#ffe9b0', glowA: 0.16 })
  })
  birds(x, camc, C.flock(t, 4.3, 1, 138, 4) || C.flock(t, 12.4, -1, 118, 4))
  foreground(x, camc, t, env.pal.ground)
  x.restore()
}

function paintRitual(x, lt, t) {
  const camc = C.cam(t)
  const sw = C.sway(t)
  x.save(); x.translate(sw.dx, sw.dy)
  const env = ART.ENVS.golden
  layer(x, camc, 0.22, () => x.drawImage(env.far, 0, 0))
  layer(x, camc, 0.62, () => x.drawImage(env.mid, 0, 0))
  layer(x, camc, 1.0, () => {
    x.drawImage(ARTX.rockL, 512, 436)
    x.drawImage(ARTX.rockC, 596, 428)
    x.drawImage(ARTX.rockR, 690, 448)
    for (const r of C.RITUAL) {
      if (r.id === HERO) continue
      const u = ((lt / r.hopP) + r.ph) % 1
      drawRig(x, ARTX.herd[r.id], r.x, r.feet + C.hop(u, r.hopH), { sy: 1 - 0.05 * Math.max(0, Math.sin(Math.PI * u * 6)) })
    }
    const ly = C.leapY(lt)
    const glow = seg(lt, C.LEAP.t0, C.LEAP.t0 + 0.4) * (1 - seg(lt, C.LEAP.t1 - 0.2, C.LEAP.t1))
    let pose = { sy: 1, lean: 0, lift: [0, 0] }
    if (lt < C.LEAP.t0) { const u = seg(lt, C.LEAP.t0 - 0.45, C.LEAP.t0); pose = { sy: 1 - 0.08 * u, lean: 0.03 * u, lift: [0, 0] } } // coil
    else if (lt < C.LEAP.t1) { const u = seg(lt, C.LEAP.t0, C.LEAP.t1); pose = { sy: 1.02 + 0.02 * Math.sin(Math.PI * u), lean: -0.05 + 0.1 * u, lift: [5, 3] } } // airborne tuck
    else { const u = E.outCubic(seg(lt, C.LEAP.t1, C.LEAP.t1 + 0.4)); pose = { sy: 1 - 0.1 * (1 - u), lean: 0.06 * (1 - u), lift: [2 * (1 - u), 0] } } // land + recover
    drawRig(x, ARTX.hero, C.RITUAL[1].x, C.RITUAL[1].feet + ly.dy, { sy: pose.sy, lean: pose.lean, lift: pose.lift, glow: '#ffe9b0', glowA: 0.3 + 0.5 * glow })
    leapSparkles(x, lt)
    landPuff(x, lt)
    pollen(x, t)
  })
  foreground(x, camc, t, env.pal.ground)
  x.restore()
}

function paintRidge(x, lt, t) {
  const camc = C.cam(t)
  const sw = C.sway(t)
  x.save(); x.translate(sw.dx * 0.6, sw.dy * 0.6)
  const env = ART.ENVS.dusk
  layer(x, camc, 0.22, () => x.drawImage(env.far, 0, 0))
  layer(x, camc, 0.62, () => x.drawImage(env.mid, 0, 0))
  layer(x, camc, 1.0, () => {
    for (let i = 0; i < 4; i++) {
      const p = C.ridgePos(i, t)
      const s = 0.92 + i * 0.02
      shadow(x, p.x, p.y + 2, s)
      A.drawRemy(x, ARTX.raid[i], p.x, p.y, { lean: p.sway, sx: s, sy: s })
    }
  })
  birds(x, camc, [0, 1].map((i) => ({ x: 1010 + Math.cos(t * 0.35 + i * 2.4) * 55, y: 236 + Math.sin(t * 0.35 + i * 2.4) * 26, flap: Math.sin(t * 7 + i), s: 0.9 })))
  foreground(x, camc, t, env.pal.ground, 12)
  x.restore()
}

function paintCharge(x, lt, t) {
  const { g, stop } = C.warp(lt)
  const worldT = C.filmT(g) // frozen during the stop: camera, sway and grass hold with the actors
  const camc = C.cam(worldT)
  const d = lt - (C.filmT(C.HIT_G) - T.charge)
  const k = d >= 0 && d < 0.34 ? 7 * Math.exp(-d * 13) : 0
  const sw = C.sway(worldT)
  x.save()
  x.translate(Math.round(k * Math.sin(d * 93) + sw.dx), Math.round(k * Math.cos(d * 81) + sw.dy))
  const env = ART.ENVS.dusk
  layer(x, camc, 0.22, () => x.drawImage(env.far, 0, 0))
  layer(x, camc, 0.62, () => x.drawImage(env.mid, 0, 0))
  layer(x, camc, 1.0, () => {
    // herd rallies on the left
    for (const gr of C.GRAZE) {
      const p = C.herdRally(gr, g)
      drawRig(x, ARTX.herd[p.id], p.x, p.feet, { lift: p.lift, lean: Math.sin(g * 2 + p.ph) * 0.01, glow: g > C.HIT_G ? '#ffe9b0' : null, glowA: 0.2 })
    }
    // the raiding party
    for (let i = 3; i >= 0; i--) {
      const rx = C.raiderX(i, g), ry = C.raiderY(i, g), rot = C.raiderRot(i, g)
      let running = g < C.HIT_G
      if (i > 0) running = g < 4.1 || g > 4.5 // halt + turn, then flee
      else running = g < C.HIT_G || (g > 4.9 && g < 6.9)
      const cyc = Math.sin(rx / 26 * Math.PI * 2)
      const o = running
        ? { lift: [Math.round(Math.max(0, cyc) * 6), Math.round(Math.max(0, -cyc) * 6)], stride: [Math.round(cyc * 2), Math.round(-cyc * 2)], lean: 0.06 }
        : { lean: i === 0 && g > 4.09 && g < 4.6 ? 0 : 0.02 }
      if (i === 0 && stop != null) o.white = true
      const airborne = i === 0 && g > C.HIT_G && g < 4.09
      shadow(x, rx, airborne ? 470 : ry, airborne ? depth(470) : depth(Math.min(ry, 470)))
      A.drawRemy(x, ARTX.raid[i], rx, ry, { ...o, rot, flip: false, glow: i === 0 && g > C.HIT_G ? null : '#c46a4a', glowA: 0.14 })
    }
    // the alpha holds
    const hx = C.heroChargeX(g), pose = C.heroChargePose(g)
    drawRig(x, ARTX.hero, hx, 470, { ...pose, glow: '#ffe9b0' })
    dust(x, g, '#8a6a48')
  })
  foreground(x, camc, g, env.pal.ground, 14)
  x.restore()
}

function paintMorning(x, lt, t) {
  const camc = C.cam(t)
  const sw = C.sway(t)
  x.save(); x.translate(sw.dx, sw.dy)
  const env = ART.ENVS.dawn
  layer(x, camc, 0.22, () => x.drawImage(env.far, 0, 0))
  layer(x, camc, 0.62, () => x.drawImage(env.mid, 0, 0))
  layer(x, camc, 1.0, () => {
    x.drawImage(ARTX.rockC, 470, 428)
    for (const g of C.GRAZE) {
      const p = C.grazePos(g, t + 40)
      drawRig(x, ARTX.herd[p.id], p.x, p.feet, { lean: p.swayA })
    }
    drawRig(x, ARTX.hero, 526, 430, { lean: Math.sin(t * 0.7) * 0.01, glow: '#ffe9b0', glowA: 0.22 })
  })
  mistDrift(x, camc, t, 0.6)
  birds(x, camc, C.flock(t, 51.2, -1, 140, 5))
  foreground(x, camc, t, env.pal.ground, 18)
  x.restore()
}

function paintCard(x, lt, t) {
  x.drawImage(ARTX.night.canvas, 0, 0)
  x.fillStyle = '#e8e4ff'
  for (const [sx, sy, big] of ARTX.night.stars) {
    x.globalAlpha = 0.45 + 0.55 * Math.sin(t * 2.4 + sx * 0.37) ** 2
    x.fillRect(sx, sy, big ? 2 : 1, big ? 2 : 1)
  }
  x.globalAlpha = 1
  // the silhouette keeps watch
  const sil = ARTX.heroSil
  x.imageSmoothingEnabled = false
  x.save()
  x.translate(712, 434)
  x.scale(2.1, 2.1)
  x.drawImage(sil.c, -(sil.w / 2 + 6), -(sil.bottom))
  x.restore()
}

// ---------- end-card helper text (drawn once per frame on the overlay) ----------
function cardChrome(o, lt) {
  const u = clamp01(seg(lt, 0.5, 1.4))
  o.save()
  o.globalAlpha = u * 0.8
  o.strokeStyle = '#caa96a'
  o.lineWidth = 2
  o.beginPath(); o.moveTo(W / 2 - 250 * u, 566); o.lineTo(W / 2 + 250 * u, 566); o.stroke()
  o.restore()
}

export default {
  title: 'PLANET REMY — The Mane Event',
  output: 'planet-remy.mp4',
  duration: DURATION,
  async prepare() {
    ART.bakeEnvs()
    ARTX.night = ART.bakeNight()
    ARTX.mist = ART.mist()
    ARTX.hero = await rig(HERO)
    ARTX.herd = {}
    for (const id of HERD) ARTX.herd[id] = await rig(id)
    ARTX.raid = []
    for (const id of RAID) ARTX.raid.push(await rig(id))
    ARTX.rockL = ART.boulder(96, 40, 11)
    ARTX.rockC = ART.boulder(124, 48, 12)
    ARTX.rockR = ART.boulder(88, 34, 13)
    ARTX.pHero = await img(new URL(`../../media/remy/Character${HERO}.webp`, import.meta.url).href)
    ARTX.pRival = await img(new URL(`../../media/remy/Character1217.webp`, import.meta.url).href)
    ARTX.heroSil = ART.silhouette(ARTX.hero)
    ARTX.low = A.canvas(LW, LH)
  },
  shots: [
    {
      name: 'dawn', t0: T.dawn, t1: T.herd,
      draw(ctx, lt, dur, t, overlay) {
        const x = stage()
        x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false; x.globalAlpha = 1
        paintDawn(x, lt, t)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(ARTX.low, 0, 0, LW, LH, 0, 0, W, H)
        bottomScrim(overlay, 0.4)
      },
      fx: (lt) => ({ bloom: 0.1 + 0.06 * seg(lt, 3.6, 4.4), bloomThresh: 0.86, warm: 0.22, exposure: 1.0 + 0.04 * seg(lt, 3.8, 4.5), vignette: 0.45, grain: 0.012 }),
    },
    {
      name: 'herd', t0: T.herd, t1: T.portrait,
      draw(ctx, lt, dur, t, overlay) {
        const x = stage()
        x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false; x.globalAlpha = 1
        paintHerd(x, lt, t)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(ARTX.low, 0, 0, LW, LH, 0, 0, W, H)
        recHud(overlay, t)
      },
      fx: () => ({ bloom: 0.06, bloomThresh: 0.9, warm: 0.1, vignette: 0.36, grain: 0.01 }),
    },
    {
      name: 'portrait', t0: T.portrait, t1: T.ritual,
      draw(ctx, lt, dur, t, overlay) {
        const x = stage()
        x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false; x.globalAlpha = 1
        paintHerd(x, lt, t, { env: 'day' })
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(ARTX.low, 0, 0, LW, LH, 0, 0, W, H)
        recHud(overlay, t)
        speciesCard(overlay, seg(lt, 0.8, 6.4), 'right', ARTX.pHero, [302, 224, 148], {
          name: 'REMY FLOWICUS',
          latin: '"Crimson Flow" — alpha male',
          notes: ['MANE: crimson, wind-tested', 'HOLD: the entire valley', 'BLADE: ceremonial (alleged)'],
          status: 'STATUS: LUXURIANT',
        })
      },
      fx: () => ({ bloom: 0.05, warm: 0.16, vignette: 0.5, grain: 0.011 }),
    },
    {
      name: 'ritual', t0: T.ritual, t1: T.ridge,
      draw(ctx, lt, dur, t, overlay) {
        const x = stage()
        x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false; x.globalAlpha = 1
        paintRitual(x, lt, t)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(ARTX.low, 0, 0, LW, LH, 0, 0, W, H)
        recHud(overlay, t)
        bottomScrim(overlay, 0.2)
      },
      fx: (lt) => ({ bloom: 0.13 + 0.06 * seg(lt, C.LEAP.t0, C.LEAP.t0 + 0.5) * (1 - seg(lt, C.LEAP.t1, C.LEAP.t1 + 0.6)), bloomThresh: 0.88, warm: 0.34, streak: 0.08, streakTint: [1.0, 0.81, 0.54], vignette: 0.42, grain: 0.012 }),
    },
    {
      name: 'ridge', t0: T.ridge, t1: T.charge,
      draw(ctx, lt, dur, t, overlay) {
        const x = stage()
        x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false; x.globalAlpha = 1
        paintRidge(x, lt, t)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(ARTX.low, 0, 0, LW, LH, 0, 0, W, H)
        recHud(overlay, t)
        speciesCard(overlay, seg(lt, 2.1, 7.4), 'left', ARTX.pRival, [300, 232, 150], {
          name: 'CABALD GLABER',
          latin: '"Pearl Soul" — raid leader',
          notes: ['MANE: none. ever.', 'MOOD: patient, buffed', 'RAIDS: nightly, fruitless'],
          status: 'STATUS: SLIPPERY',
        })
      },
      fx: (lt) => ({ bloom: 0.09, bloomThresh: 0.87, warm: 0.18, sat: 0.92, exposure: 0.97, vignette: 0.5, grain: 0.014 }),
    },
    {
      name: 'charge', t0: T.charge, t1: T.morning,
      draw(ctx, lt, dur, t, overlay) {
        const x = stage()
        x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false; x.globalAlpha = 1
        paintCharge(x, lt, t)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(ARTX.low, 0, 0, LW, LH, 0, 0, W, H)
        recHud(overlay, t)
      },
      fx: () => ({ bloom: 0.11, bloomThresh: 0.87, warm: 0.16, vignette: 0.5, grain: 0.014 }),
    },
    {
      name: 'morning', t0: T.morning, t1: T.card,
      draw(ctx, lt, dur, t, overlay) {
        const x = stage()
        x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false; x.globalAlpha = 1
        paintMorning(x, lt, t)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(ARTX.low, 0, 0, LW, LH, 0, 0, W, H)
        recHud(overlay, t)
        bottomScrim(overlay, 0.28)
      },
      fx: () => ({ bloom: 0.1, bloomThresh: 0.86, warm: 0.24, haze: 0.12, hazeColor: [0.96, 0.85, 0.75], vignette: 0.42, grain: 0.011 }),
    },
    {
      name: 'card', t0: T.card, t1: DURATION,
      draw(ctx, lt, dur, t, overlay) {
        const x = stage()
        x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false; x.globalAlpha = 1
        paintCard(x, lt, t)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(ARTX.low, 0, 0, LW, LH, 0, 0, W, H)
        cardChrome(overlay, lt)
      },
      fx: () => ({ bloom: 0.07, bloomThresh: 0.9, vignette: 0.55, grain: 0.012 }),
    },
  ],
  captions: [
    ...NARR.map((n) => ({ ...n, style: 'narr' })),
    ...LOCS.map((l) => ({ ...l, style: 'loc' })),
    ...CARD.map((c) => ({ ...c })),
  ],
  captionStyles: {
    narr: {
      font: F.serif, weight: 'italic 500', size: 47, color: '#f6ecd8', align: 'center',
      y: 926, lineHeight: 1.24, anim: 'rise', in: 0.28, out: 0.26, glow: '#0e0a16', glowBlur: 26,
    },
    loc: {
      font: F.mono, weight: '500', size: 26, color: '#f0dcb4', align: 'left',
      x: 190, y: 992, track: 4, anim: 'fade', in: 0.3, out: 0.3, glow: '#140f1e', glowBlur: 10,
    },
    epic: {
      font: F.serif, weight: '600', size: 158, color: '#f2e7d0', align: 'center',
      y: 430, track: 20, anim: 'rise', in: 0.7, out: 0.4, glow: '#0a0814', glowBlur: 22,
    },
    'epi-sub': {
      font: F.mono, weight: '500', size: 31, color: '#d9b98a', align: 'center',
      y: 525, track: 15, anim: 'fade', in: 0.5, out: 0.4,
    },
    'card-sub': {
      font: F.serif, weight: 'italic 500', size: 42, color: '#e8dcc4', align: 'center',
      y: 700, anim: 'rise', in: 0.4, out: 0.4, glow: '#0a0814', glowBlur: 12,
    },
    'card-tiny': {
      font: F.mono, weight: '400', size: 21, color: '#9a8f7c', align: 'center',
      y: 1004, track: 2, anim: 'fade', in: 0.4, out: 0.4,
    },
    kicker: {
      font: F.mono, weight: '500', size: 26, color: '#f0dcb4', align: 'center',
      y: 310, track: 8, anim: 'fade', in: 0.4, out: 0.4, glow: '#0e0a16', glowBlur: 12,
    },
    ot: {
      font: F.serif, weight: '600', size: 118, color: '#f6ecd8', align: 'center',
      y: 408, track: 16, anim: 'rise', in: 0.6, out: 0.5, glow: '#0e0a16', glowBlur: 20,
    },
  },
  flashes: [
    [4.0, 0.22, 0.6],
    [27.62, 0.12, 0.18],
    [C.filmT(C.HIT_G), 0.5, 0.12],
  ],
  score,
  audio: { seed: 11, reverb: 1.7, reverbGain: 0.3 },
  lint: { captionHold: 3, safe: { margin: 0.05 } },
}
