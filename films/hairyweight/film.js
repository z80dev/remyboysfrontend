// THE HAIRYWEIGHT CHAMPIONSHIP — a Remy Boys pay-per-view. 87 s, 1920x1080 full-frame broadcast.
// Two time domains everywhere: world g (warp(rt).g) drives actor motion; real seconds drive cuts,
// captions, HUD, shake/flash and impact effects so they bloom THROUGH the hit-stop freezes.
// World art is authored on a 2160x1320 canvas (120 px overscan) and blitted through a per-frame
// camera (pan / punch-in / shake) — every frame pure in t, transforms reset every frame.
// GRID: BPM 80 — beat 0.75 s, bar 3 s; every cut sits on the 3 s bar (grid.bar below).
import { W, H, seg, lerp, clamp, E, hash, txt, F } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import { score } from './score.js'
import {
  D, BEAT, CAST, NAMES, TINT, TAPE, CARD_CROPS,
  SHOTS, PUNCHES, KO, BELLS, warp, filmT,
  CAPTIONS, CAPTION_STYLES, HUD, CROWD, SHAKES, FLASHES,
} from './timeline.js'

const R = ART.RING
const FS = ART.FS
const S = {} // prepared art (read-only in draw)

const HERO_R3 = PUNCHES.filter((p) => p.who === 'hero' && p.t >= 52 && p.t < 60)
const THROWN = PUNCHES.map((p) => ({ real: filmT(p.t), who: p.who }))
const DUST_EVENTS = [
  { real: filmT(37.42), x: 640, y: 884, seed: 21 },  // hero hits the canvas
  { real: filmT(43.6), x: 690, y: 884, seed: 22 },   // scrappy rise scrape
  { real: filmT(72.4), x: 1090, y: 884, seed: 23 },  // champ lands
]
const roundShort = (t) => {
  const b = HUD.roundBands.find((r) => t >= r.t0 && t < r.t1) ?? HUD.roundBands[0]
  return { 'ROUND 1': 'R1', BREAK: 'BRK', 'ROUND 3': 'R3', FINAL: 'FIN' }[b.label] ?? 'R1'
}

// crowd excitement 0..1 from the CROWD swell table (real seconds)
function crowdLevel(t) {
  let v = 0.2
  for (const c of CROWD) {
    if (t < c.real) continue
    const tau = c.type === 'erupt' ? 3.4 : c.type === 'roar' ? 2.2 : 1.2
    v = Math.max(v, Math.min(1, c.level * Math.exp(-(t - c.real) / tau)))
  }
  return v
}

// =================================================================================
// STAGE — the single choreographic truth: every fighter position is a pure
// function of world g (and real t for performance gestures), so the champ can
// never teleport and the replay can re-render the same fight from raw g.
// =================================================================================
function stagePose(g, who, t) {
  const feet = R.feet
  if (who === 'hero') {
    let x = R.heroX, rot = 0, lean = 0, sy = FS, down = 0
    if (g >= 27 && g < 33) x = lerp(R.heroX, 745, seg(g, 27, 33))
    else if (g >= 33 && g < 36.75) x = lerp(745, 700, seg(g, 33, 36.75))
    if (g >= 33 && g < 36.75) lean += Math.sin(g * 5.2) * 0.12 // wobble under the beating
    if (g >= 36.75 && g < 42.75) { // knockdown: eased fall, tiny bounce, stays down
      const u = seg(g, 36.75, 37.42)
      down = 1
      rot = -1.5 * E.outQuad(u)
      if (g > 37.42) rot += -0.09 * Math.exp(-(g - 37.42) * 5) * Math.cos((g - 37.42) * 15)
      x = 700 - 26 * u
    }
    if (g >= 42.75 && g < 45) { // scrappy rise (rt 43.21)
      const u = seg(g, 42.75, 43.9)
      rot = -1.5 * (1 - E.inOutCubic(u))
      sy = FS * (1 - 0.16 * Math.sin(u * Math.PI))
      lean += 0.08 * Math.sin(u * 9) * (1 - u)
      x = lerp(674, 700, u)
    }
    if (g >= 51) { // round 3: spring out at the bell, drift right through the comeback
      x = lerp(700, 800, E.outCubic(seg(g, 51, 52.2)))
      if (g >= 66) x = lerp(800, 880, seg(g, 66, 69))
      for (const p of HERO_R3) {
        if (g > p.t - 0.1 && g < p.t + 0.3) x += 62 * Math.sin(Math.PI * clamp(seg(g, p.t - 0.1, p.t + 0.3)))
      }
    }
    if (g >= 54.75 && g < 55.6) { // champ's last good moment doubles him
      const u = Math.sin(Math.PI * seg(g, 54.75, 55.6))
      sy -= FS * 0.1 * u
      lean -= 0.1 * u
    }
    if (g >= 69) { // the end: duck the haymaker, plant, counter uppercut
      const duck = seg(g, 70.4, 70.72) * (1 - seg(g, 71.02, 71.25))
      const rise = seg(g, 71.08, 71.25)
      x = 880 + 44 * duck + 14 * rise
      let syK = 1 - 0.36 * duck
      if (rise > 0) syK = lerp(syK, 1.13, E.outCubic(rise))
      lean += 0.26 * duck - 0.4 * rise
      if (g > 71.25) { // settle after the freeze releases
        const s = seg(g, 72.3, 73.4)
        syK = lerp(syK, 1, s)
        lean += 0.26 * rise * (1 - s) - 0.4 * rise
        x = lerp(x, 940, seg(g, 72.3, 73.4))
      }
      sy = FS * syK
    }
    // head-snap impulses from landed punches (real time, so they hold through freezes)
    let kick = 0
    for (const ev of S.fxEvents ?? []) {
      if (ev.target !== 'hero') continue
      const age = t - ev.real
      if (age >= 0 && age < 0.26) kick += 1 - age / 0.26
    }
    lean -= kick * 0.14
    rot += kick * 0.04
    return { x, feet, rot, lean, sy, down, flip: false }
  }
  if (who === 'champ') {
    let x = R.champX, rot = 0, lean = 0, sy = FS, down = 0, hop = 0
    if (g >= 27 && g < 33) x = lerp(R.champX, 1005, seg(g, 27, 33))
    else if (g >= 33 && g < 37.9) x = lerp(1005, 958, seg(g, 33, 36.75))
    if (g >= 37.9 && g < 40.5) x = lerp(958, 1240, E.inOutCubic(seg(g, 37.9, 40.5)))
    else if (g >= 40.5 && g < 51) x = 1240
    lean += 0.05 * Math.sin(g * 3.3) // slow stalk
    if (g >= 51 && g < 57) x = lerp(1240, 1130, E.outCubic(seg(g, 51, 52.5)))
    if (g >= 57) x = 1080
    if (g >= 51 && g < 69.4) { // hero's punches shove him back, decaying
      let push = 0
      for (const p of HERO_R3) if (g > p.t) push += 26 * Math.exp(-(g - p.t) * 1.1)
      x -= Math.min(130, push)
      const wob = Math.min(1, 0.5 + push / 40)
      lean += 0.075 * Math.sin(g * 3.0) * wob
      rot += 0.035 * Math.sin(g * 2.2 + 1) * wob
      x += 7 * Math.sin(g * 2.6) * (g < 69 ? 1 : 1 - seg(g, 69, 69.6))
    }
    if (g >= 57.5 && g < 58.1) x += 70 * Math.sin(Math.PI * seg(g, 57.5, 58.1)) // the whiff lunge
    if (g >= 69 && g < 71.8) { // advance, load the haymaker, swing, follow through
      x = lerp(x, 1015, E.inOutCubic(seg(g, 69.4, 70.2)))
      const wind = seg(g, 69.6, 70.42)
      lean -= 0.3 * wind
      const thru = seg(g, 70.42, 71.2)
      lean += 0.34 * thru * (1 - seg(g, 71.0, 71.8))
      rot += 0.09 * Math.sin(Math.PI * clamp(thru))
    }
    if (g >= 71.8) { // ballistic fall backward, ring-shaking landing, stays down
      const u = seg(g, 71.8, 72.4)
      down = 1
      x = 1015 + 62 * u
      hop = 168 * u * (1 - u)
      rot = 1.52 * (0.25 * E.outCubic(Math.min(1, u * 1.6)) + 0.75 * E.inQuad(u))
      if (g > 72.4) rot += 0.06 * Math.exp(-(g - 72.4) * 6) * Math.cos((g - 72.4) * 13)
    }
    let kick = 0
    for (const ev of S.fxEvents ?? []) {
      if (ev.target !== 'champ') continue
      const age = t - ev.real
      if (age >= 0 && age < 0.26) kick += 1 - age / 0.26
    }
    lean += kick * 0.14
    rot -= kick * 0.04
    return { x, feet: feet - hop, rot, lean, sy, down, flip: true }
  }
  // referee
  let x = 1350, rfeet = R.feet - 54, sy = 2.7, crouch = 0, visible = true, wave = 0
  if (g < 24) visible = false
  else if (g < 27.5) x = 960
  else if (g < 37.6) x = lerp(960, 1260, seg(g, 27.5, 31))
  else if (g < 39.5) x = lerp(1260, 660, E.inOutCubic(seg(g, 37.6, 38.6)))
  else if (g < 44.5) x = 660
  else if (g < 51) visible = false
  else if (g < 53.5) x = lerp(660, 1320, E.inOutCubic(seg(g, 51, 53.5)))
  else if (g < 72.2) x = 1320
  else if (g < 73.3) x = lerp(1320, 1185, E.inOutCubic(seg(g, 72.2, 73.3)))
  else x = 1185
  if ((g >= 38.6 && g < 44.2) || (g >= 73.3 && g < 76.4)) crouch = 1
  if (t >= KO.waveReal) { crouch = 0; if (t < KO.waveReal + 1.1) wave = seg(t, KO.waveReal, KO.waveReal + 0.55) }
  return { x, feet: rfeet, rot: 0, lean: 0, sy: crouch ? 2.1 : 2.7, down: 0, flip: false, crouch, visible, wave }
}

// contact points for landed punches, derived from the target pose at the punch's world time
function contactFor(p) {
  const target = p.who === 'hero' ? 'champ' : 'hero'
  const T = stagePose(p.t, target, filmT(p.t))
  const face = p.who === 'hero' ? 1 : -1
  return { x: T.x + face * 6, y: T.feet - (p.kind === 'body' ? 258 : 400) * (T.sy / FS), target }
}

const PUNCH_STYLE = {
  jab: { wind: 0.2, back: 42, up: 6, bend: 30, bendY: -8, spin: 0.4 },
  hook: { wind: 0.26, back: 72, up: 26, bend: -8, bendY: -86, spin: 1.3 },
  body: { wind: 0.22, back: 56, up: 2, bend: 18, bendY: 30, spin: 0.55 },
  upper: { wind: 0.3, back: 26, up: -58, bend: 12, bendY: 44, spin: -1.05 },
}

// =================================================================================
// PREPARE
// =================================================================================
async function prepare() {
  S.frame = A.canvas(ART.AW, ART.AH)
  S.frameCtx = S.frame.getContext('2d')
  S.sketch = A.canvas(ART.AW, ART.AH)
  S.sketchCtx = S.sketch.getContext('2d')
  S.sketchImg = S.sketchCtx.createImageData(ART.AW, ART.AH)
  S.lum = new Float32Array(ART.AW * ART.AH)
  S.hero = await A.loadRemy(CAST.HERO, false)
  S.champ = await A.loadRemy(CAST.CHAMP, false)
  S.ref = await A.loadRemy(CAST.REF, false)
  S.c1 = await A.loadRemy(CAST.CORNER1, true)
  S.c2 = await A.loadRemy(CAST.CORNER2, true)
  S.ent1 = await A.loadRemy(585, true) // Cabald entourage (CASTING.md backups: blue-tee balds)
  S.ent2 = await A.loadRemy(5, true)
  S.champSil = ART.bakeSil(S.champ)
  const heads = await A.loadHeads()
  S.icon = {
    hero: A.headIcon(heads, CAST.HERO, 3),
    champ: A.headIcon(heads, CAST.CHAMP, 3),
    ref: A.headIcon(heads, CAST.REF, 3),
    heroS: A.headIcon(heads, CAST.HERO, 2),
    champS: A.headIcon(heads, CAST.CHAMP, 2),
  }
  S.arenaBack = ART.bakeArenaBack()
  S.ring = ART.bakeRing()
  S.crowd = ART.bakeCrowd(heads)
  S.marquee = ART.bakeMarquee()
  S.taxi = ART.bakeTaxi()
  S.belt = ART.bakeBelt()
  S.gloveH = ART.bakeGlove('hero')
  S.gloveC = ART.bakeGlove('champ')
  S.placard = ART.bakePlacard()
  S.stool = ART.bakeStool()
  S.sponge = ART.bakeSponge()
  S.paper = ART.bakePaper()
  S.scan = ART.bakeScanlines()
  S.scanPat = null // pattern created lazily on the shot ctx
  S.cardHero = ART.bakeVsCard(await ART.loadOrig(CAST.HERO), NAMES.hero, 'CHALLENGER • THE FLOW', '#c23444', CARD_CROPS.hero.cx, CARD_CROPS.hero.cy)
  S.cardChamp = ART.bakeVsCard(await ART.loadOrig(CAST.CHAMP), NAMES.champ, 'CHAMPION • THE CABALD MOON', '#dad6d3', CARD_CROPS.champ.cx, CARD_CROPS.champ.cy)
  // immutable FX events for landed punches (world contact point + real time + target)
  S.fxEvents = PUNCHES.filter((p) => p.landed).map((p, i) => {
    const c = contactFor(p)
    return { g: p.t, real: filmT(p.t), x: c.x, y: c.y, target: c.target, kind: p.kind, seed: 100 + i * 7 }
  })
}

// =================================================================================
// WORLD PAINTER — shared by every arena shot AND the replay re-render
// =================================================================================
function frameCtx() {
  const x = S.frameCtx
  x.setTransform(1, 0, 0, 1, 0, 0)
  x.globalAlpha = 1
  x.globalCompositeOperation = 'source-over'
  x.filter = 'none'
  x.imageSmoothingEnabled = false
  return x
}

function drawCrowdTiers(x, t, lvl, o) {
  for (const L of S.crowd) {
    const rate = 1.6 + 6 * lvl
    const v = hash(L.seed + Math.floor(t * rate)) < 0.5 ? 0 : 1
    const lift = Math.round(lvl * L.nearK * 6)
    if (o.sketch) x.filter = 'blur(2.4px)'
    x.drawImage(L.c[v], -ART.OVER, -ART.OVER - lift)
    x.filter = 'none'
  }
}

function shadowE(x, P, w = 92) {
  const k = P.sy / FS
  const spread = 1 + Math.abs(P.rot ?? 0) * 0.9
  x.fillStyle = 'rgba(5,9,16,0.42)'
  x.beginPath(); x.ellipse(P.x, P.feet + 7, w * k * spread, w * k * 0.2, 0, 0, 7); x.fill()
}

function drawGlove(x, img, gx, gy, rot, scale, face) {
  x.save()
  x.translate(gx, gy)
  x.rotate(rot)
  x.scale(face * scale, scale)
  x.drawImage(img, -19, -16)
  x.restore()
}

function drawGuard(x, P, id, t, raise = 0, hideFront = false) {
  const img = id === 'hero' ? S.gloveH : S.gloveC
  const face = id === 'hero' ? 1 : -1
  const k = P.sy / FS
  const ph = hash(id === 'hero' ? 11 : 29) * 6
  const b1 = Math.sin(t * Math.PI * 2 * 2.02 + ph) * 4.5   // ~2 Hz seeded guard bob
  const b2 = Math.sin(t * Math.PI * 2 * 1.93 + ph + 2.1) * 4
  const gs = id === 'hero' ? 3.1 : 3.3
  if (P.down) {
    drawGlove(x, img, P.x - face * 66, P.feet - 16, 1.35, gs * 0.8, face)
    drawGlove(x, img, P.x + face * 48, P.feet - 12, -1.2, gs * 0.8, face)
    return
  }
  if (!hideFront) {
    if (raise > 0) drawGlove(x, img, P.x + face * 48, P.feet - 296 * k - 96 * raise, -0.5 * raise * face, gs, face)
    else drawGlove(x, img, P.x + face * 56, P.feet - 296 * k + b1, 0.14 * face, gs, face)
  }
  drawGlove(x, img, P.x + face * 6, P.feet - 262 * k + b2, -0.3 * face, gs, face)
}

function qBez(a, c, b, u) {
  const v = 1 - u
  return { x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y }
}

function drawPunch(x, p, g, t) {
  const hay = p.t === KO.swing
  const st = hay ? { wind: 0.85, back: 150, up: 170, spin: 2.1 } : PUNCH_STYLE[p.kind]
  if (g < p.t - st.wind - 0.12 || g > p.t + (hay ? 0.7 : 0.48)) return null
  const from = stagePose(g, p.who, t)
  if (from.down) return null
  const face = p.who === 'hero' ? 1 : -1
  const k = from.sy / FS
  const shoulder = { x: from.x + face * 34, y: from.feet - 292 * k }
  const guard = { x: from.x + face * 56, y: from.feet - 296 * k }
  const ev = p.landed ? S.fxEvents.find((e) => e.g === p.t) : null
  let C
  if (ev) C = { x: ev.x, y: ev.y }
  else {
    const tgt = stagePose(p.t, p.who === 'hero' ? 'champ' : 'hero', filmT(p.t))
    C = { x: tgt.x + face * 96, y: tgt.feet - (hay ? 470 : 400) * (tgt.sy / FS) }
  }
  const cocked = { x: shoulder.x - face * st.back, y: shoulder.y - st.up }
  const u1 = seg(g, p.t - st.wind - 0.06, p.t - 0.06)
  const u2 = hay ? E.outCubic(seg(g, p.t - 0.16, p.t + 0.02)) : E.outQuad(seg(g, p.t - 0.06, p.t))
  const u3 = E.outCubic(seg(g, p.t + (hay ? 0.1 : 0.05), p.t + (hay ? 0.62 : 0.38)))
  let gp, hideFront = true
  if (u1 < 1 && u2 <= 0) {
    const u = E.outCubic(u1)
    gp = { x: lerp(guard.x, cocked.x, u), y: lerp(guard.y, cocked.y, u) }
    if (u < 0.02) hideFront = false
  } else if (u2 > 0 && u2 < 1) {
    const cx2 = (cocked.x + C.x) / 2 + face * (st.bend ?? 0)
    const cy2 = (cocked.y + C.y) / 2 + (st.bendY ?? 0) + (hay ? -110 : 0)
    gp = qBez(cocked, { x: cx2, y: cy2 }, C, u2)
  } else if (u3 < 1) {
    gp = { x: lerp(C.x, guard.x, u3), y: lerp(C.y, guard.y, u3) - 12 * Math.sin(u3 * Math.PI) }
  } else return null
  const rot = face * (0.12 + st.spin * (u2 > 0 ? u2 : -0.25 * u1))
  const img = p.who === 'hero' ? S.gloveH : S.gloveC
  drawGlove(x, img, gp.x, gp.y, rot, p.who === 'hero' ? 3.1 : 3.4, face)
  return { hideFront }
}

function drawFighters(x, g, t, o) {
  const H2 = stagePose(g, 'hero', t)
  const C2 = stagePose(g, 'champ', t)
  const F2 = stagePose(g, 'ref', t)
  // referee behind the action
  if (F2.visible && !o.noRef) {
    shadowE(x, F2, 78)
    A.drawRemy(x, S.ref, F2.x, F2.feet, { sy: F2.sy, glow: TINT.refAcccent, glowA: 0.1 })
    drawRefGlove(x, F2, t)
  }
  // champ aura (bone-white) then bodies back-to-front
  if (!C2.down) ART.warmGlow(x, C2.x, C2.feet - 220, 160, 0.09 + 0.03 * Math.sin(t * 1.7), '224,220,216')
  shadowE(x, C2)
  shadowE(x, H2)
  const heroVx = (H2.x - stagePose(Math.max(0, g - 0.12), 'hero', t).x) / 0.12
  if (Math.abs(heroVx) > 210 && !H2.down) { // pink hair-trail ghosts on fast moves
    for (const [dt, a] of [[0.09, 0.15], [0.18, 0.07]]) {
      const gp = stagePose(Math.max(0, g - dt), 'hero', t)
      A.drawRemy(x, S.hero, gp.x, gp.feet, { rot: gp.rot, lean: gp.lean, sy: gp.sy, glow: TINT.heroTrail, glowA: 0.55, alpha: a })
    }
  }
  A.drawRemy(x, S.champ, C2.x, C2.feet, { flip: true, rot: C2.rot, lean: C2.lean, sy: C2.sy, glow: TINT.champAura, glowA: 0.13 })
  A.drawRemy(x, S.hero, H2.x, H2.feet, { rot: H2.rot, lean: H2.lean, sy: H2.sy, glow: TINT.heroTrail, glowA: 0.14 })
  const punches = []
  for (const p of PUNCHES) {
    if (p.t < 24 || p.t > 72) continue
    const r = drawPunch(x, p, g, t)
    if (r) punches.push({ p, r })
  }
  const activeHero = punches.some((e) => e.p.who === 'hero')
  const activeChamp = punches.some((e) => e.p.who === 'champ')
  drawGuard(x, H2, 'hero', t, 0, activeHero)
  drawGuard(x, C2, 'champ', t, 0, activeChamp)
  // impact fx — keyed on REAL time so they bloom through the freezes
  for (const ev of S.fxEvents) {
    ART.impactRing(x, ev.x, ev.y, t - ev.real)
  }
  ART.chips(x, S.fxEvents, t, '226,234,246', 7)
  ART.dust(x, DUST_EVENTS, t)
  if (o.sketch) { // replay: rings keyed on raw g (no stops in a replay)
    for (const ev of S.fxEvents) ART.impactRing(x, ev.x, ev.y, g - ev.g, '40,36,30')
  }
  return { H2, C2, F2 }
}

function drawRefGlove(x, F2, t) {
  for (const c of HUD.counts) {
    const u = seg(t, c.real - 0.05, c.real + 0.26)
    if (u <= 0 || u >= 1) continue
    drawGlove(x, S.gloveC, F2.x - 40, lerp(F2.feet - 240, F2.feet - 34, E.inQuad(u)), 0.6, 2.6, 1)
  }
  if (F2.wave > 0) { // the wave-off sweep
    const a = -2.3 + 3.2 * E.outCubic(F2.wave)
    drawGlove(x, S.gloveC, F2.x + 26 + Math.cos(a) * 74, F2.feet - 236 - Math.sin(a) * 54, a * 0.4, 2.8, 1)
  }
}

function drawWorld(x, g, t, o = {}) {
  const fc = frameCtx()
  fc.clearRect(0, 0, ART.AW, ART.AH)
  fc.translate(ART.OVER, ART.OVER)
  const lvl = o.level != null ? o.level : crowdLevel(t)
  fc.drawImage(S.arenaBack, -ART.OVER, -ART.OVER)
  drawCrowdTiers(fc, t, lvl, o)
  fc.drawImage(S.ring, -ART.OVER, -ART.OVER)
  if (o.actors !== false) drawFighters(fc, g, t, o)
  for (let i = 0; i < 4; i++) { // rig light cones over the ring (additive haze)
    ART.cone(fc, 480 + i * 400, 172, 920, 215, t, 0.045 + 0.02 * Math.sin(t * 0.6 + i * 1.7), '255,222,170', i * 7 + 2)
  }
  if (o.after) o.after(fc, t)
  return fc
}

// =================================================================================
// CAMERA + BLIT
// =================================================================================
function shakeAt(t, extra = 0) {
  let sx = 0, sy = 0
  for (const s of SHAKES) {
    const d = t - s.real
    if (d < 0 || d > 0.5) continue
    const k = s.amp * Math.exp(-d * s.decay)
    sx += Math.sin(t * 67 + s.real * 13) * k
    sy += Math.cos(t * 53 + s.real * 7) * k * 0.6
  }
  const d2 = t - 73.14 // champ's landing thud (local, small)
  if (d2 >= 0 && d2 < 0.3) { sx += Math.sin(t * 71) * 3 * Math.exp(-d2 * 10); sy += Math.cos(t * 47) * 2 * Math.exp(-d2 * 10) }
  if (extra > 0) { sx += Math.sin(t * 83) * extra; sy += Math.cos(t * 61) * extra * 0.7 }
  return [sx, sy]
}

function clampCam(cam) {
  const hw = W / 2 / cam.zoom, hh = H / 2 / cam.zoom
  cam.x = clamp(cam.x, hw - ART.OVER, ART.AW - ART.OVER - hw)
  cam.y = clamp(cam.y, hh - ART.OVER, ART.AH - ART.OVER - hh)
  return cam
}

function blit(ctx, src, cam, t, ox = 0) {
  const [shx, shy] = shakeAt(t)
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#04060b'
  ctx.fillRect(0, 0, W, H)
  ctx.translate(W / 2 + shx + ox, H / 2 + shy)
  ctx.scale(cam.zoom, cam.zoom)
  ctx.translate(-cam.x, -cam.y)
  ctx.drawImage(src, -ART.OVER, -ART.OVER)
  ctx.restore()
}

function kickZoom(t, who, amp = 0.028) {
  let k = 0
  for (const p of PUNCHES) {
    if (p.who !== who || !p.landed) continue
    const d = t - filmT(p.t)
    if (d >= 0 && d < 0.4) k += amp * Math.exp(-d * 9)
  }
  return k
}

function camera(name, t) {
  let x = 960, y = 540, zoom = 1
  switch (name) {
    case 'coldExt': x = 1080; y = 560; zoom = lerp(1.02, 1.14, E.outCubic(seg(t, 0, 6))); break
    case 'coldInt': x = 960 + 12 * Math.sin(t * 1.15) + (hash(Math.floor(t * 12)) - 0.5) * 5; y = 520; zoom = 0.97; break
    case 'vsIn': y = 540; break
    case 'vsStare': y = 540; zoom = lerp(1, 1.12, seg(t, 15, 18)); break
    case 'walkHero': x = lerp(120, 1420, seg(t, 18, 21)) + 70; y = 655; zoom = 1.3; break
    case 'walkChamp': x = lerp(1800, 420, seg(t, 21, 24)) - 70; y = 660; zoom = 1.26; break
    case 'refTalk': y = 620; zoom = lerp(1.16, 1.3, E.inOutCubic(seg(t, 24, 27))); break
    case 'r1Open': x = 960 + 18 * Math.sin(t * 0.7); y = 575; zoom = 1.06 + kickZoom(t, 'champ'); break
    case 'r1Dom': x = 935; y = 575; zoom = lerp(1.08, 1.16, seg(t, 33, 39)) + kickZoom(t, 'champ'); break
    case 'kdown': x = 940; y = t < 43.4 ? 560 : lerp(560, 605, seg(t, 43.4, 45)); zoom = t < 43.4 ? 0.98 : lerp(0.98, 1.12, seg(t, 43.4, 45)); break
    case 'corner': x = 620; y = 690; zoom = 1.58; break
    case 'r3Open': x = lerp(995, 945, seg(t, 51, 54)); y = 585; zoom = 1.07 + kickZoom(t, 'hero', 0.02); break
    case 'r3Combo': x = 1000 + 12 * Math.sin(t * 1.3); y = 610; zoom = 1.18 + kickZoom(t, 'hero'); break
    case 'replay': x = 1005; y = 610; zoom = 1.16; break
    case 'r3Live': x = 1000 + 92 * Math.sin(((t - 66) / 3) * Math.PI); y = 595; zoom = 1.12; break
    case 'ko': {
      const whip = seg(t, 70.42, 70.72)
      x = t < 70.42 ? lerp(1010, 1040, seg(t, 69, 70.42)) : lerp(1040, 968, E.outCubic(whip))
      y = t < 70.72 ? 610 : lerp(610, 648, seg(t, 70.72, 71.2))
      zoom = t < 70.72 ? lerp(1.08, 1.12, seg(t, 69, 70.42)) : lerp(1.12, 1.2, seg(t, 70.72, 71.2))
      if (t > 72.6) { // pull wide and high for the count, slow push after
        const s = seg(t, 72.6, 76)
        y = lerp(648, 540, s); zoom = lerp(1.2, 1.02, s); x = lerp(968, 1010, s)
        if (t > 76) { zoom = lerp(1.02, 1.06, seg(t, 76, 78)); y = lerp(540, 530, seg(t, 76, 78)) }
      }
      break
    }
    case 'belt': x = 990; y = lerp(565, 518, E.inOutCubic(seg(t, 78, 82.5))); zoom = lerp(1.05, 1.13, E.inOutCubic(seg(t, 78, 82.5))); break
  }
  return clampCam({ x, y, zoom })
}

// =================================================================================
// HUD — crisp broadcast graphics on the post-grade overlay (never clipped, >=28px reading text)
// =================================================================================
function drawHUD(ov, t) {
  ov.save()
  ov.imageSmoothingEnabled = false
  netBug(ov, t)
  scoreBug(ov, t)
  punchStats(ov, t)
  countNumerals(ov, t)
  replayMark(ov, t)
  ov.restore()
}

function netBug(ov, t) {
  if (t < 1.5) return
  const a = seg(t, 1.5, 2.0)
  ov.save()
  ov.globalAlpha = a
  ov.fillStyle = '#101319'
  ov.fillRect(1734, 24, 126, 46)
  ov.fillStyle = '#b32834'
  ov.fillRect(1734, 24, 126, 5)
  txt(ov, 'RPPV', 1810, 48, { size: 28, font: F.anton, color: '#f2f4f8', align: 'center', base: 'middle', track: 2 })
  const blink = Math.sin(t * Math.PI * 2 * 1.1) > 0
  ov.fillStyle = blink ? '#ff4a52' : '#5c1017'
  ov.beginPath(); ov.arc(1756, 47, 6, 0, 7); ov.fill()
  ov.restore()
}

const BUG_OFF = 78
function scoreBug(ov, t) {
  if (t < BELLS[0] || t >= BUG_OFF) return
  const u = E.outCubic(seg(t, BELLS[0], BELLS[0] + 0.7))
  const px0 = lerp(-640, 60, u)
  ov.save()
  ov.fillStyle = 'rgba(7,10,18,0.8)'
  ov.fillRect(px0, 28, 560, 96)
  ov.strokeStyle = 'rgba(150,170,210,0.35)'; ov.lineWidth = 1.5
  ov.strokeRect(px0, 28, 560, 96)
  ov.fillStyle = TINT.heroTrail; ov.fillRect(px0, 28, 280, 4)
  ov.fillStyle = '#dad6d3'; ov.fillRect(px0 + 280, 28, 280, 4)
  const rows = [
    { icon: S.icon.hero, name: NAMES.hero, who: 'hero', cy: 52 },
    { icon: S.icon.champ, name: NAMES.champ, who: 'champ', cy: 98 },
  ]
  for (const r of rows) {
    ov.drawImage(r.icon, px0 + 16, r.cy - 20, 40, 40)
    txt(ov, r.name, px0 + 68, r.cy, { size: 27, font: F.anton, color: '#f2f4f8', align: 'left', base: 'middle', track: 1 })
    const landed = HUD.punchStats.ticks.filter((k) => k.who === r.who && k.real <= t).length
    const thrown = THROWN.filter((k) => k.who === r.who && k.real <= t).length
    txt(ov, String(landed), px0 + 424, r.cy, { size: 30, font: F.anton, color: '#ffffff', align: 'right', base: 'middle' })
    txt(ov, `of ${thrown}`, px0 + 432, r.cy, { size: 16, font: F.mono, weight: 700, color: '#8fa0be', align: 'left', base: 'middle' })
  }
  const rb = { x: px0 + 478, y: 40 }
  ov.fillStyle = 'rgba(179,40,52,0.92)'
  ov.beginPath(); ov.roundRect(rb.x, rb.y, 70, 72, 6); ov.fill()
  txt(ov, roundShort(t), rb.x + 35, rb.y + 26, { size: 30, font: F.anton, color: '#ffffff', align: 'center', base: 'middle', track: 1 })
  txt(ov, HUD.roundClock(t), rb.x + 35, rb.y + 56, { size: 19, font: F.mono, weight: 700, color: '#ffd9a0', align: 'center', base: 'middle' })
  ov.restore()
}

function punchStats(ov, t) {
  if (t < BELLS[0] || t >= BUG_OFF) return
  const u = E.outCubic(seg(t, BELLS[0] + 0.3, BELLS[0] + 1.0))
  ov.save()
  ov.globalAlpha = u
  ov.fillStyle = 'rgba(7,10,18,0.8)'
  ov.beginPath(); ov.roundRect(1280, 84, 580, 92, 8); ov.fill()
  ov.strokeStyle = 'rgba(150,170,210,0.3)'; ov.lineWidth = 1.5
  ov.beginPath(); ov.roundRect(1280, 84, 580, 92, 8); ov.stroke()
  txt(ov, 'PUNCH STATS • RPPV', 1302, 104, { size: 16, font: F.mono, weight: 700, color: '#93a3c2', align: 'left', base: 'middle', track: 2 })
  const rows = [
    { icon: S.icon.heroS, name: 'CRIMSON CROWN', who: 'hero', cy: 136 },
    { icon: S.icon.champS, name: 'PEARL SOUL', who: 'champ', cy: 162 },
  ]
  for (const r of rows) {
    ov.drawImage(r.icon, 1302, r.cy - 12, 24, 24)
    txt(ov, r.name, 1336, r.cy, { size: 22, font: F.anton, color: '#e8ecf4', align: 'left', base: 'middle', track: 1 })
    const landed = HUD.punchStats.ticks.filter((k) => k.who === r.who && k.real <= t).length
    const thrown = THROWN.filter((k) => k.who === r.who && k.real <= t).length
    const last = HUD.punchStats.ticks.filter((k) => k.who === r.who).reduce((m, k) => (k.real <= t && k.real > m ? k.real : m), -9)
    const pulse = t - last < 0.35 ? 1 + 0.3 * (1 - E.outCubic((t - last) / 0.35)) : 1 // tick pop
    ov.save()
    ov.translate(1806, r.cy)
    ov.scale(pulse, pulse)
    txt(ov, `${landed} / ${thrown}`, 0, 0, { size: 25, font: F.anton, color: '#ffffff', align: 'right', base: 'middle' })
    ov.restore()
  }
  ov.restore()
}

function countNumerals(ov, t) {
  for (const c of HUD.counts) {
    const u = t - c.real
    if (u < 0 || u > 0.66) continue
    const pop = E.outBack(seg(u, 0, 0.16))
    const fade = 1 - seg(u, 0.52, 0.66)
    ov.save()
    ov.globalAlpha = fade
    ov.translate(960, 330)
    ov.scale(pop, pop)
    ov.fillStyle = '#a82632'
    ov.beginPath(); ov.roundRect(-70, -92, 140, 184, 14); ov.fill()
    ov.fillStyle = 'rgba(255,255,255,0.25)'; ov.fillRect(-62, -84, 124, 6)
    ov.strokeStyle = '#4a0d13'; ov.lineWidth = 5
    ov.beginPath(); ov.roundRect(-70, -92, 140, 184, 14); ov.stroke()
    txt(ov, String(c.n), 0, 8, { size: 150, font: F.anton, color: '#ffffff', align: 'center', base: 'middle' })
    ov.restore()
  }
}

function replayMark(ov, t) {
  if (t < HUD.replay.t0 || t >= HUD.replay.t1) return
  const blink = hash(Math.floor(t * 3.2)) > 0.3
  ov.save()
  txt(ov, HUD.replay.watermark, HUD.replay.watermarkPos.x + 16, HUD.replay.watermarkPos.y, { size: 44, font: F.anton, color: '#f2f4f8', align: 'center', base: 'middle', track: 10, glow: '#000000', glowBlur: 12 })
  ov.fillStyle = blink ? '#ff4a52' : '#7c1219'
  ov.beginPath(); ov.arc(HUD.replay.watermarkPos.x - 118, HUD.replay.watermarkPos.y, 11, 0, 7); ov.fill()
  ov.fillStyle = 'rgba(242,244,248,0.75)'
  ov.fillRect(HUD.replay.watermarkPos.x - 172, HUD.replay.watermarkPos.y + 30, 376, 3)
  ov.restore()
}

// =================================================================================
// SHOTS
// =================================================================================
function shColdExt(ctx, lt, dur, t, ov) {
  const x = frameCtx()
  x.clearRect(0, 0, ART.AW, ART.AH)
  x.drawImage(S.marquee.c, -ART.OVER, -ART.OVER)
  // chase bulbs advance on the beat grid
  const step = Math.floor(t / BEAT)
  for (let i = 0; i < S.marquee.bulbs.length; i++) {
    const [bx, by] = S.marquee.bulbs[i]
    const on = ((i + step) % 4) < 2
    x.fillStyle = on ? 'rgba(255,214,140,0.95)' : 'rgba(120,84,50,0.4)'
    x.fillRect(bx - 4, by - 4, 8, 8)
    if (on) { x.fillStyle = 'rgba(255,228,170,0.28)'; x.fillRect(bx - 7, by - 7, 14, 14) }
  }
  // roof searchlights
  x.save()
  x.globalCompositeOperation = 'lighter'
  for (const [sx0, sd] of [[430, 0], [1730, 2.1]]) {
    const a = -1.9 + 0.55 * Math.sin(t * 0.32 + sd)
    const g = x.createLinearGradient(sx0, 190, sx0 + Math.cos(a) * 1300, 190 + Math.sin(a) * 1300)
    g.addColorStop(0, 'rgba(200,216,244,0.13)'); g.addColorStop(1, 'rgba(200,216,244,0)')
    x.fillStyle = g
    x.beginPath(); x.moveTo(sx0, 190)
    x.lineTo(sx0 + Math.cos(a - 0.05) * 1300, 190 + Math.sin(a - 0.05) * 1300)
    x.lineTo(sx0 + Math.cos(a + 0.05) * 1300, 190 + Math.sin(a + 0.05) * 1300)
    x.closePath(); x.fill()
  }
  x.restore()
  // steam from the vents
  for (const [vx, vs] of [[700, 0], [1460, 1.3]]) {
    for (let i = 0; i < 3; i++) {
      const cyc = 1.9, ph = ((t + vs + i * 0.6) / cyc) % 1
      const a = 0.16 * Math.sin(ph * Math.PI)
      ell2(x, vx + Math.sin(ph * 5 + i) * 14, 1060 - ph * 190, 14 + ph * 34, 8 + ph * 16, `rgba(190,200,220,${a})`)
    }
  }
  // taxi rolls through at ~3.0
  if (t > 2.1 && t < 5.2) {
    const tx = lerp(2280, -340, seg(t, 2.2, 5.0))
    x.save()
    x.translate(tx, 1108 + Math.abs(Math.sin(t * 9)) * 2)
    x.scale(0.92, 0.92)
    x.drawImage(S.taxi, -85, -42)
    x.restore()
    ell2(x, tx + 120, 1130, 60, 8, 'rgba(0,0,0,0.3)')
  }
  blit(ctx, S.frame, camera('coldExt', t), t)
  vign(ctx, 0.34)
  drawHUD(ov, t)
}

function shColdInt(ctx, lt, dur, t, ov) {
  const { g } = warp(t)
  drawWorld(frameCtx(), g, t, { actors: false, level: Math.max(crowdLevel(t), 0.72), after: (fc) => {
    ART.warmGlow(fc, 1080, 820, 560, 0.2, '255,196,130')
  } })
  blit(ctx, S.frame, camera('coldInt', t), t)
  // spotlight sweep crossing the lens at 7.5
  const sw = seg(t, 6.9, 8.2)
  if (sw > 0 && sw < 1) {
    const cx2 = lerp(-360, 2360, sw)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const g2 = ctx.createLinearGradient(cx2 - 260, 0, cx2 + 260, 0)
    g2.addColorStop(0, 'rgba(255,236,200,0)'); g2.addColorStop(0.5, `rgba(255,236,200,${0.11 * Math.sin(sw * Math.PI)})`); g2.addColorStop(1, 'rgba(255,236,200,0)')
    ctx.fillStyle = g2
    ctx.save(); ctx.translate(cx2, 540); ctx.rotate(-0.3); ctx.fillRect(-1400, -1200, 2800, 2400); ctx.restore()
    ctx.restore()
  }
  vign(ctx, 0.3)
  drawHUD(ov, t)
}

const TAPE_ROWS = ['RECORD', 'REACH', 'STANCE', 'FROM']
function shVsIn(ctx, lt, dur, t, ov) {
  const x = frameCtx()
  x.clearRect(0, 0, ART.AW, ART.AH)
  x.drawImage(S.marquee.c, -ART.OVER, -ART.OVER) // reuse dome as the distant house
  x.fillStyle = 'rgba(6,8,15,0.86)'; x.fillRect(-ART.OVER, -ART.OVER, ART.AW, ART.AH)
  ART.warmGlow(x, 1080, 700, 800, 0.1, '120,150,210')
  // broadcast rails
  x.fillStyle = '#b32834'; x.fillRect(-ART.OVER, 118, ART.AW, 14)
  x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(-ART.OVER, 118, ART.AW, 2)
  x.fillStyle = '#b32834'; x.fillRect(-ART.OVER, 946, ART.AW, 16)
  x.fillStyle = 'rgba(255,255,255,0.4)'; x.fillRect(-ART.OVER, 946, ART.AW, 2)
  // cards slide in from left/right
  const settle = lerp(1.03, 1, E.outCubic(seg(t, 10.6, 11.8)))
  const hx = lerp(-620, 380, E.outCubic(seg(t, 9.0, 10.2)))
  const cxp = lerp(2540, 1540, E.outCubic(seg(t, 9.75, 11.0)))
  drawCard(x, S.cardHero, hx, 180, settle)
  drawCard(x, S.cardChamp, cxp, 180, settle)
  ART.warmGlow(x, 960, 460, 500, 0.07, '255,220,170')
  blit(ctx, S.frame, camera('vsIn', t), t)
  // stat lines count up on beats (crisp, post-grade)
  const KEYS = ['record', 'reach', 'stance', 'home']
  for (let i = 0; i < 4; i++) {
    const su = E.outCubic(seg(t, 11 + i * 0.9, 11.3 + i * 0.9))
    if (su <= 0) continue
    const y = 798 + i * 42
    txt(ctx, TAPE_ROWS[i], 900, y, { size: 24, font: F.grot, weight: 700, color: '#93a3c2', align: 'right', base: 'middle', track: 2, alpha: su })
    txt(ctx, TAPE.hero[KEYS[i]], 920 + (1 - su) * 40, y, { size: 37, font: F.anton, color: '#f2f4f8', align: 'left', base: 'middle', track: 1, alpha: su })
    if (i === 0) txt(ctx, 'one draw: fell asleep', 1075, y + 1, { size: 25, font: F.grot, weight: 500, color: '#7c8aa6', align: 'left', base: 'middle', alpha: su })
    txt(ctx, TAPE_ROWS[i], 1020, y, { size: 24, font: F.grot, weight: 700, color: '#93a3c2', align: 'left', base: 'middle', track: 2, alpha: su })
    txt(ctx, TAPE.champ[KEYS[i]], 1000 - (1 - su) * 40, y, { size: 37, font: F.anton, color: '#f2f4f8', align: 'right', base: 'middle', track: 1, alpha: su })
    if (i === 0) txt(ctx, 'both losses: barber', 845, y + 1, { size: 25, font: F.grot, weight: 500, color: '#7c8aa6', align: 'right', base: 'middle', alpha: su })
  }
  vign(ctx, 0.42)
  drawHUD(ov, t)
}

function drawCard(x, img, px0, py0, scale) {
  x.save()
  x.translate(px0 + 250, py0 + 286)
  x.scale(scale, scale)
  x.fillStyle = 'rgba(0,0,0,0.45)'
  x.beginPath(); x.roundRect(-242, -272, 500, 588, 10); x.fill()
  x.drawImage(img, -250, -286)
  x.restore()
}

function shVsStare(ctx, lt, dur, t, ov) {
  const x = frameCtx()
  x.clearRect(0, 0, ART.AW, ART.AH)
  x.fillStyle = '#07090f'; x.fillRect(-ART.OVER, -ART.OVER, ART.AW, ART.AH)
  const k = E.inOutCubic(seg(t, 15, 18))
  const circles = [
    { img: S.cardHero, cx: lerp(430, 640, k), cy: 470, ring: '222,155,156' },
    { img: S.cardChamp, cx: lerp(1490, 1280, k), cy: 470, ring: '218,214,211' },
  ]
  for (const c of circles) {
    const r = lerp(280, 158, k)
    const s = lerp(1.18, 0.86, k)
    x.save()
    x.beginPath(); x.arc(c.cx, c.cy, r, 0, 7); x.clip()
    x.translate(c.cx, c.cy - 30 * (1 - k))
    x.scale(s, s)
    x.drawImage(c.img, -250, -330)
    x.restore()
    x.save()
    x.globalCompositeOperation = 'lighter'
    x.strokeStyle = `rgba(${c.ring},${0.3 + 0.16 * Math.sin(t * 4.4 + c.cx)})`
    x.lineWidth = 7
    x.beginPath(); x.arc(c.cx, c.cy, r + 10, 0, 7); x.stroke()
    x.restore()
  }
  blit(ctx, S.frame, camera('vsStare', t), t)
  // deadpan VS stamp at 16.5
  const vu = seg(t, 16.5, 16.85)
  if (vu > 0) {
    ctx.save()
    ctx.translate(960, 468)
    ctx.rotate(-0.1)
    ctx.scale(E.outBack(vu), E.outBack(vu))
    txt(ctx, 'VS', 0, 0, { size: 128, font: F.anton, color: '#c22a3a', align: 'center', base: 'middle', track: 4, stroke: '#f2f4f8', strokeW: 3 })
    ctx.restore()
  }
  vign(ctx, 0.5)
  drawHUD(ov, t)
}

function walkCycle(ph) {
  const s = Math.sin(ph) * 0.8
  return { lift: [Math.round(Math.max(0, s) * 7), Math.round(Math.max(0, -s) * 7)], stride: [Math.round(s * 2), Math.round(-s * 2)], lean: 0.06 }
}

function walkway(x) {
  x.fillStyle = '#10141f'
  x.fillRect(-ART.OVER, 1016, ART.AW, 184)
  x.fillStyle = '#1a2130'; x.fillRect(-ART.OVER, 1016, ART.AW, 5)
  for (let i = 0; i < 22; i++) {
    x.fillStyle = `rgba(255,214,150,${0.02 + hash(i, 44) * 0.03})`
    x.fillRect(-100 + i * 110, 1040 + hash(i, 45) * 120, 60, 2)
  }
}

function fgSilhouettes(x, t, camx) {
  const off = (camx - 960) * 0.55
  for (let i = 0; i < 26; i++) {
    const hx = -200 + i * 105 + off * 1.6 + Math.sin(i * 3.7) * 20
    const r = 62 + hash(i, 9) * 30
    const hy = 1256 + Math.sin(t * 1.4 + i * 2.1) * 5
    x.fillStyle = '#04060b'
    x.beginPath(); x.arc(hx, hy, r, 0, 7); x.fill()
    x.fillRect(hx - r * 1.25, hy + r * 0.5, r * 2.5, r)
  }
}

function shWalkHero(ctx, lt, dur, t, ov) {
  const { g } = warp(t)
  const hx = lerp(80, 1420, seg(t, 18, 21))
  drawWorld(frameCtx(), g, t, { actors: false, level: Math.max(crowdLevel(t), 0.55), after: (fc) => {
    walkway(fc)
    ART.cone(fc, hx, 230, 1040, 235, t, 0.13, '255,222,160', 6)
    ART.phoneFlashes(fc, t, 0.8)
    // cornermen: 202 front, 208 rear
    const p202 = walkCycle(g * 7.4)
    const p208 = walkCycle(g * 7.0 + 2)
    A.drawRemy(fc, S.c1, hx + 175, 1032, { ...p202, flip: false, sy: 2.8, sx: 2.8 })
    A.drawRemy(fc, S.c2, hx - 190, 1032, { ...p208, flip: false, sy: 2.8, sx: 2.8 })
    // hero + pink trail sparks on the beat
    const pose = walkCycle(g * 6.6)
    for (let b = 18; b <= 20.5; b += 0.75) {
      const age = t - b
      if (age < 0 || age > 0.55) continue
      for (let i = 0; i < 6; i++) {
        const px0 = lerp(80, 1420, seg(b, 18, 21)) + (hash(b * 100 + i) - 0.5) * 60
        const py0 = 880 + hash(b * 77 + i) * 100 - age * 60
        fc.fillStyle = `rgba(222,155,156,${0.5 * (1 - age / 0.55)})`
        fc.fillRect(px0, py0, 4, 4)
      }
    }
    A.drawRemy(fc, S.hero, hx, 1035, { ...pose, sy: FS, glow: TINT.heroTrail, glowA: 0.2 })
  } })
  blit(ctx, S.frame, camera('walkHero', t), t)
  fgSilhouettes(ctx, t, camera('walkHero', t).x)
  vign(ctx, 0.38)
  drawHUD(ov, t)
}

function shWalkChamp(ctx, lt, dur, t, ov) {
  const { g } = warp(t)
  const cx2 = lerp(1800, 380, seg(t, 21, 24))
  drawWorld(frameCtx(), g, t, { actors: false, level: Math.min(crowdLevel(t), 0.3), after: (fc) => {
    walkway(fc)
    ART.cone(fc, cx2, 230, 1040, 225, t, 0.1, '205,220,242', 9)
    ART.phoneFlashes(fc, t, 0.12, 180, 500, 8)
    A.drawRemy(fc, S.ent1, cx2 + 160, 1028, { ...walkCycle(g * 6.4 + 1), flip: true, sy: 2.8, sx: 2.8, alpha: 0.9 })
    A.drawRemy(fc, S.ent2, cx2 + 285, 1024, { ...walkCycle(g * 6.1 + 3), flip: true, sy: 2.7, sx: 2.7, alpha: 0.85 })
    ART.warmGlow(fc, cx2, 800, 170, 0.1 + 0.03 * Math.sin(t * 1.9), '222,218,214')
    A.drawRemy(fc, S.champ, cx2, 1035, { ...walkCycle(g * 5.6), flip: true, sy: FS, glow: TINT.champAura, glowA: 0.16 })
  } })
  blit(ctx, S.frame, camera('walkChamp', t), t)
  fgSilhouettes(ctx, t, camera('walkChamp', t).x)
  ctx.save() // colder grade for the menace walk
  ctx.fillStyle = 'rgba(132,158,196,0.09)'
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
  vign(ctx, 0.44)
  drawHUD(ov, t)
}

function shRefTalk(ctx, lt, dur, t, ov) {
  const { g } = warp(t)
  drawWorld(frameCtx(), g, t, { after: (fc) => {
    // gloves touch at 25.5 — both lead gloves meet at centre
    const gu = Math.sin(Math.PI * seg(g, 25.4, 26.4))
    if (gu > 0.01) {
      const H2 = stagePose(g, 'hero', t)
      const C2 = stagePose(g, 'champ', t)
      drawGlove(fc, S.gloveH, lerp(H2.x + 56, 938, gu), lerp(H2.feet - 296, 596, gu), 0.2, 3.1, 1)
      drawGlove(fc, S.gloveC, lerp(C2.x - 56, 982, gu), lerp(C2.feet - 296, 596, gu), -0.2, 3.3, -1)
      ART.impactRing(fc, 960, 596, g - 25.9, '255,240,214')
    }
  } })
  blit(ctx, S.frame, camera('refTalk', t), t)
  vign(ctx, 0.36)
  drawHUD(ov, t)
}

function shFight(name, extra) {
  return (ctx, lt, dur, t, ov) => {
    const { g } = warp(t)
    drawWorld(frameCtx(), g, t, { after: extra })
    blit(ctx, S.frame, camera(name, t), t)
    vign(ctx, name === 'corner' ? 0.5 : 0.34)
    drawHUD(ov, t)
  }
}

function shCorner(ctx, lt, dur, t, ov) {
  const { g } = warp(t)
  const focus = seg(t, 49, 49.8) // rack focus to the shadow at 49
  drawWorld(frameCtx(), g, t, { actors: false, level: Math.min(crowdLevel(t), 0.45), after: (fc) => {
    // the champ's shadow crosses the canvas twice
    const c1u = seg(t, 46.5, 48.6), c2u = seg(t, 49.2, 51)
    fc.save()
    fc.filter = `blur(${(2.2 * (1 - focus)).toFixed(2)}px)`
    fc.globalAlpha = 0.32
    if (c1u > 0 && c1u < 1) {
      fc.save(); fc.translate(lerp(430, 1560, c1u), 828); fc.scale(2.1, 2.1)
      fc.drawImage(S.champSil, -S.champSil.width / 2, -S.champSil.height); fc.restore()
    }
    if (c2u > 0 && c2u < 1) {
      fc.save(); fc.translate(lerp(1560, 430, c2u), 828); fc.scale(-2.1, 2.1)
      fc.drawImage(S.champSil, -S.champSil.width / 2, -S.champSil.height); fc.restore()
    }
    fc.restore()
    // corner group (softens as focus racks to the shadow)
    fc.save()
    fc.filter = `blur(${(2.4 * focus).toFixed(2)}px)`
    fc.drawImage(S.stool, 396, 852)
    A.drawRemy(fc, S.hero, 470, 934, { sy: 3.3, lean: 0.05 + 0.02 * Math.sin(t * 2.4), glow: TINT.heroTrail, glowA: 0.1 }) // slumped on the stool
    A.drawRemy(fc, S.c1, 300, 940, { flip: true, sy: 2.8, sx: 2.8, lean: 0.08 }) // cutman
    const dab = Math.sin(t * Math.PI * 2 * 1.6)
    drawGlove(fc, S.gloveC, 402 + dab * 6, 782 + Math.abs(dab) * -8, 0.5, 2.4, 1)
    fc.drawImage(S.sponge, 394 + dab * 6, 768 + Math.abs(dab) * -10, 16, 12)
    const yell = Math.abs(Math.sin(t * Math.PI * 2 * 1.15))
    A.drawRemy(fc, S.c2, 702, 932, { sy: 2.8 * (1 + 0.04 * yell), sx: 2.8, lean: -0.06 - 0.05 * yell }) // strategy
    drawGlove(fc, S.gloveH, 682, 770 - yell * 14, -0.4 + yell * 0.2, 2.3, -1)
    drawGlove(fc, S.gloveH, 742, 782 - yell * 18, 0.4 - yell * 0.2, 2.3, -1)
    fc.restore()
  } })
  blit(ctx, S.frame, camera('corner', t), t)
  const beat = Math.max(0, Math.sin(t * Math.PI * 2 * 0.9)) // heartbeat vignette ~54 BPM
  ctx.save()
  const vg = ctx.createRadialGradient(960, 540, 420, 960, 540, 1050)
  vg.addColorStop(0, 'rgba(120,10,20,0)'); vg.addColorStop(1, `rgba(120,10,20,${0.16 * beat * beat})`)
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
  vign(ctx, 0.5)
  drawHUD(ov, t)
}

function shReplay(ctx, lt, dur, t, ov) {
  // source world time: tape-rewind 0-1.5 (59.4 backwards), then the combo at slow-mo
  const g = lt < 1.5 ? lerp(59.4, 56.5, E.inCubic(seg(lt, 0, 1.5))) : lerp(56.5, 59.4, seg(lt, 1.5, 6))
  drawWorld(frameCtx(), g, lt, { sketch: true, level: 0.45 })
  sketchPass()
  const jit = lt < 1.5 ? (hash(Math.floor(lt * 24)) - 0.5) * 12 : (hash(Math.floor(lt * 9)) - 0.5) * 3
  blit(ctx, S.sketch, camera('replay', t), t, jit)
  if (!S.scanPat) S.scanPat = ctx.createPattern(S.scan, 'repeat')
  ctx.save()
  ctx.fillStyle = S.scanPat
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
  if (lt < 1.5) { // tape-rewind tear bands
    ctx.save()
    for (let i = 0; i < 3; i++) {
      const y0 = hash(Math.floor(lt * 18) + i) * 900
      const dx = (hash(Math.floor(lt * 24) + i * 7) - 0.5) * 60
      ctx.drawImage(ctx.canvas, 0, y0, W, 60, dx, y0, W, 60)
    }
    ctx.restore()
  }
  vign(ctx, 0.46)
  drawHUD(ov, t)
}

function sketchPass() {
  const w = ART.AW, h = ART.AH, n = w * h
  const img = S.frameCtx.getImageData(0, 0, w, h)
  const d = img.data
  const lum = S.lum
  for (let i = 0, p = 0; i < n; i++, p += 4) lum[i] = d[p] * 0.3 + d[p + 1] * 0.55 + d[p + 2] * 0.15
  const q = S.sketchImg.data
  const BK = [[238, 235, 226], [200, 195, 182], [136, 131, 120], [64, 61, 55], [27, 26, 24]]
  for (let y = 0, i = 0, p = 0; y < h; y++) {
    for (let x2 = 0; x2 < w; x2++, i++, p += 4) {
      const L = lum[i]
      let c
      if (L > 208) c = BK[0]; else if (L > 152) c = BK[1]; else if (L > 92) c = BK[2]; else if (L > 44) c = BK[3]; else c = BK[4]
      const e = Math.abs(L - (x2 > 0 ? lum[i - 1] : L)) + Math.abs(L - (y > 0 ? lum[i - w] : L))
      if (e > 34) c = BK[4]; else if (e > 17) c = BK[3]
      q[p] = c[0]; q[p + 1] = c[1]; q[p + 2] = c[2]; q[p + 3] = 255
    }
  }
  S.sketchCtx.putImageData(S.sketchImg, 0, 0)
  // paper texture under everything
  const x = S.sketchCtx
  x.save()
  x.globalCompositeOperation = 'multiply'
  x.globalAlpha = 0.5
  for (let py = 0; py < h; py += 512) for (let px0 = 0; px0 < w; px0 += 512) x.drawImage(S.paper, px0, py)
  x.restore()
}

function shBelt(ctx, lt, dur, t, ov) {
  const tt = Math.min(t, 82.5) // freeze-frame: after 82.5 nothing moves but type
  const { g } = warp(tt)
  const H2 = stagePose(g, 'hero', tt)
  const x = drawWorld(frameCtx(), g, tt, { noRef: true, after: (fc) => {
    // referee buckles on the belt (79.5), then 202+208 hoist him (81.0)
    const raise = E.outCubic(seg(tt, 78.5, 79.5))
    const hu = E.outBack(seg(tt, 81.0, 81.7))
    const feet = R.feet - 86 * Math.max(0, hu)
    A.drawRemy(fc, S.ref, 1130, 884, { sy: 3.1, lean: -0.05, glow: TINT.refAcccent, glowA: 0.1 })
    if (raise > 0) drawGlove(fc, S.gloveC, H2.x + 40, R.feet - 386 * (H2.sy / FS) * 0.4 - 230 * raise, -0.4 * raise, 2.9, 1)
    A.drawRemy(fc, S.c1, H2.x - 150, 900, { sy: 2.9, sx: 2.9, lean: 0.12 })
    A.drawRemy(fc, S.c2, H2.x + 165, 900, { flip: true, sy: 2.9, sx: 2.9, lean: -0.12 })
    if (hu > 0.01) { // gloved hands under his arms
      drawGlove(fc, S.gloveH, H2.x - 66, feet - 210, 0.9, 2.8, 1)
      drawGlove(fc, S.gloveC, H2.x + 66, feet - 210, -0.9, 2.8, -1)
    }
  } })
  // hero on top of the group, belt buckled at 79.5 (moves with the hoist)
  const hu = E.outBack(seg(tt, 81.0, 81.7))
  const feet = R.feet - 86 * Math.max(0, hu)
  const raise = E.outCubic(seg(tt, 78.5, 79.5))
  A.drawRemy(x, S.hero, H2.x, feet, { sy: H2.sy * (1 + 0.05 * Math.max(0, hu)), lean: 0.03 * Math.sin(tt * 2.2), glow: TINT.heroTrail, glowA: 0.18 })
  drawGuard(x, { ...H2, feet }, 'hero', tt, raise, false)
  const bu = seg(tt, 79.5, 80.1)
  if (bu > 0) {
    const bs = 0.62 * E.outBack(bu)
    x.save()
    x.translate(H2.x, feet - 196)
    x.rotate(-0.06 + 0.02 * Math.sin(tt * 1.8))
    x.scale(bs, bs)
    x.drawImage(S.belt, -215, -130)
    x.restore()
  }
  blit(ctx, S.frame, camera('belt', tt), tt)
  if (t > 86.6) { // intentional end: dip to black
    ctx.save()
    ctx.fillStyle = `rgba(2,3,6,${seg(t, 86.6, 87)})`
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
  vign(ctx, 0.4)
  drawHUD(ov, t)
}

function ell2(x, cx, cy, rx, ry, col) {
  x.fillStyle = col
  x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill()
}

function vign(ctx, k) {
  ctx.save()
  const g = ctx.createRadialGradient(960, 540, 520, 960, 540, 1120)
  g.addColorStop(0, 'rgba(4,6,12,0)'); g.addColorStop(1, `rgba(4,6,12,${k})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
}

// =================================================================================
// FX + THE FILM
// =================================================================================
const fxFor = {
  coldExt: () => ({ bloom: 0.12, bloomThresh: 0.9, grain: 0.03, vignette: 0.35, sat: 1.0, contrast: 1.04, tint: [0.92, 0.97, 1.1] }),
  coldInt: () => ({ bloom: 0.13, bloomThresh: 0.9, grain: 0.032, vignette: 0.3, sat: 1.03, contrast: 1.04 }),
  vsIn: () => ({ bloom: 0.1, bloomThresh: 0.9, grain: 0.024, vignette: 0.35, sat: 1.02, contrast: 1.05 }),
  vsStare: () => ({ bloom: 0.1, bloomThresh: 0.9, grain: 0.026, vignette: 0.4, sat: 1.02, contrast: 1.06 }),
  walkHero: () => ({ bloom: 0.12, bloomThresh: 0.9, grain: 0.03, vignette: 0.32, sat: 1.04, contrast: 1.03 }),
  walkChamp: () => ({ bloom: 0.11, bloomThresh: 0.9, grain: 0.034, vignette: 0.38, sat: 0.96, contrast: 1.05, tint: [0.94, 0.98, 1.08] }),
  refTalk: () => ({ bloom: 0.12, bloomThresh: 0.9, grain: 0.03, vignette: 0.34, sat: 1.03, contrast: 1.03 }),
  r1Open: () => ({ bloom: 0.13, bloomThresh: 0.9, grain: 0.032, vignette: 0.32, sat: 1.04, contrast: 1.04 }),
  r1Dom: () => ({ bloom: 0.13, bloomThresh: 0.88, grain: 0.034, vignette: 0.36, sat: 1.03, contrast: 1.05 }),
  kdown: () => ({ bloom: 0.12, bloomThresh: 0.9, grain: 0.034, vignette: 0.4, sat: 0.98, contrast: 1.04 }),
  corner: () => ({ bloom: 0.11, bloomThresh: 0.9, grain: 0.04, vignette: 0.42, sat: 1.0, contrast: 1.04 }),
  r3Open: () => ({ bloom: 0.13, bloomThresh: 0.9, grain: 0.032, vignette: 0.32, sat: 1.05, contrast: 1.04 }),
  r3Combo: () => ({ bloom: 0.14, bloomThresh: 0.88, grain: 0.034, vignette: 0.34, sat: 1.05, contrast: 1.05 }),
  replay: () => ({ bloom: 0.08, bloomThresh: 0.92, grain: 0.05, vignette: 0.4, sat: 0.94, contrast: 1.1 }),
  r3Live: () => ({ bloom: 0.13, bloomThresh: 0.9, grain: 0.032, vignette: 0.32, sat: 1.05, contrast: 1.04 }),
  ko: () => ({ bloom: 0.14, bloomThresh: 0.88, grain: 0.036, vignette: 0.36, sat: 1.05, contrast: 1.06 }),
  belt: (lt, t) => ({ bloom: 0.12, bloomThresh: 0.9, grain: 0.03 + 0.05 * seg(t, 82.5, 83.4), vignette: 0.34 + 0.4 * seg(t, 82.5, 83.4), sat: 1.05, contrast: 1.04 }),
}

const DRAW = {
  coldExt: shColdExt, coldInt: shColdInt, vsIn: shVsIn, vsStare: shVsStare,
  walkHero: shWalkHero, walkChamp: shWalkChamp, refTalk: shRefTalk,
  r1Open: shFight('r1Open'), r1Dom: shFight('r1Dom'), kdown: shFight('kdown'),
  corner: shCorner, r3Open: shFight('r3Open'), r3Combo: shFight('r3Combo'),
  replay: shReplay, r3Live: shFight('r3Live'), ko: shFight('ko'), belt: shBelt,
}

export default {
  title: 'THE HAIRYWEIGHT CHAMPIONSHIP',
  output: 'hairyweight.mp4',
  duration: D,
  grid: { bar: 3 }, // BPM 80: beat 0.75 s, bar 3 s — every cut sits on the bar
  prepare,
  shots: SHOTS.map((s) => ({ name: s.name, t0: s.t0, t1: s.t1, draw: DRAW[s.name], fx: fxFor[s.name] })),
  captions: CAPTIONS,
  captionStyles: CAPTION_STYLES,
  flashes: FLASHES.map((f) => [f.real, f.peak, f.decay]),
  score,
  audio: { seed: 1985, reverb: 1.7, reverbGain: 0.26 },
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: false } },
}
