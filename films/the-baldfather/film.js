// THE BALDFATHER — a Remy Boys mafia-epic parody. New Flow City, 1947: the Don strokes a
// stolen crimson wig in a dark study; Vito wakes razored beside his own harvested flow;
// hero 42 is anointed DON OF THE FLOW while the Cabald are de-wigged across the city on
// every organ stab; and the chair, the wig, the gesture — power is a haircut.
// Full-res 2D filmkit, sprites 1.6–2.9× nearest on procedural 1940s sets.
import { W, H, seg, lerp, E, F, txt, measure } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import { STUDY, BED, CHAPEL } from './art.js'
import { score } from './score.js'
import {
  DURATION, T, CAST, VISIT_CLOCK, STUDY_EV, VISIT_EV, CHAPEL_EV, END_EV,
  vignetteAt, FLASHES, bonaseraX, donStroke, wigStrokeMirror, enforcerPath, sheetPull,
  wigLiftPath, heroKneel, CAPTIONS,
} from './timeline.js'

const S = {}
const TAU = Math.PI * 2
const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)

function sprite(x, rig, px, feet, o = {}) {
  x.imageSmoothingEnabled = false
  A.drawRemy(x, rig, px, feet, o)
}
// slow cinematic push-in, pure in lt
function push(ctx, k, cx = 960, cy = 560) {
  if (k <= 0) return
  ctx.translate(cx, cy)
  ctx.scale(1 + k, 1 + k)
  ctx.translate(-cx, -cy)
}
// the shared wig-stroke pose (S1 Don + S4 mirror gesture): wig + the hand riding it.
// scale 0.66 keeps the prize desk-sized so it never hides the face behind it.
function strokePose(ctx, x, y, rot, p) {
  const sway = p == null ? 0 : Math.sin(p * TAU) * 0.9
  ART.wig(ctx, x, y, 108, rot, sway)
  if (p == null) return
  const dir = rot + Math.PI / 2
  const d = 30 + p * 74
  ART.hand(ctx, x + Math.cos(dir) * d, y + Math.sin(dir) * d + 5, 0.75, { rot: rot + 0.4 })
}

// ============================== S1 — THE STUDY ==============================
function drawBonasera(ctx, g, bx) {
  // kneel for the ring kiss (25.4 down, 27.0 up), otherwise stand and bow
  const kU = E.outCubic(seg(g, 25.4, 26.1)) * (1 - E.inCubic(seg(g, 27.0, 27.5)))
  const feet = 948 + 26 * kU
  const s = lerp(2.7, 2.42, kU)
  const o = ART.bonaseraOpts(g)
  // the kneel carries him to the desk's front-centre, clear of the phone
  sprite(ctx, S.bon, lerp(bx, 868, kU), feet, { ...o, lean: (o.lean ?? 0) + 0.14 * kU, sx: s, sy: s })
  if (kU > 0.35) {
    // the supplicant's hands reach to the Don's ring at the desk edge
    ART.hand(ctx, lerp(852, 934, kU), lerp(726, 654, kU), 0.78, { rot: -0.5 })
  }
}
function drawStudy(ctx, lt, t, ov) {
  const g = lt
  ctx.fillStyle = '#070402'
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  push(ctx, 0.035 * seg(lt, 0, 27))
  ctx.drawImage(S.study, 0, 0)
  ART.doorPanel(ctx, 0)
  // the Don's shadow climbs the wall as he rises
  const rise = E.outCubic(seg(g, STUDY_EV.donRise, STUDY_EV.donRise + 1.1))
  if (rise > 0) {
    const g2 = ctx.createRadialGradient(976, 560, 10, 976, 560, 240 + 160 * rise)
    g2.addColorStop(0, `rgba(2,1,0,${0.05 + 0.24 * rise})`)
    g2.addColorStop(1, 'rgba(2,1,0,0)')
    ctx.fillStyle = g2
    ctx.fillRect(700, 300, 560, 560)
  }
  // the Don behind the desk: seated (eyes + crown above the desktop), rises at the scandal line
  const feet = lerp(818, 782, rise)
  const s = lerp(2.48, 2.76, rise)
  sprite(ctx, S.don, STUDY.don.x, feet, { lift: [2, 0], stride: [1, 0], lean: -0.02, sx: s, sy: s })
  ctx.drawImage(S.desk, 0, 0)
  strokePose(ctx, 880, 640, 0.55, donStroke(g))
  ART.smokeCurl(ctx, g)
  ART.lampFlicker(ctx, g, 1)
  ART.slatShimmer(ctx, g)
  // the supplicant
  const bx = bonaseraX(g)
  if (bx > -170) drawBonasera(ctx, g, bx)
  // the signet ring, extended over the desk's front-centre edge (clear of the phone)
  if (g > 24.9 && g < 27.6) {
    ART.hand(ctx, 976, 636, 0.8, { rot: Math.PI })
    ctx.fillStyle = '#e8c56a'
    ctx.beginPath()
    ctx.arc(960, 648, 6, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = 'rgba(90,50,10,0.6)'
    ctx.lineWidth = 2
    ctx.stroke()
    const kk = (g - STUDY_EV.kissRing + 0.3) / 0.6
    if (kk > 0 && kk < 1) ART.star4(ctx, 960, 644, 40, kk)
  }
  // iris out to the bedroom
  const ir = seg(g, STUDY_EV.iris, STUDY_EV.iris + 0.6)
  if (ir > 0) ART.iris(ctx, 1150 * (1 - ir) ** 1.8, STUDY.don.x, 500)
  ctx.restore()
}

// ============================== S2 — THE RAZOR'S VISIT ==============================
// Vito's face anchors on the 116-row near rig (cast locked, calibrated on stills).
const VITO = { eyeY: 49, eyeDX: 14.5, mouthY: 58 }
function bedAnchor(row) {
  return BED.vitoFeet - (114 - row) * BED.vitoS
}
function drawMirror(ctx, g, lt) {
  ctx.fillStyle = '#05060a'
  ctx.fillRect(0, 0, W, H)
  const scream = g >= VISIT_EV.scream
  push(ctx, 0.02 + 0.1 * cl((g - VISIT_EV.mirrorJump) / 2.3), 960, 540)
  // ornate frame + glass
  ctx.fillStyle = '#3a2a16'
  ctx.fillRect(340, 36, 1240, 1000)
  ctx.fillStyle = '#241a10'
  ctx.fillRect(356, 52, 1208, 968)
  ctx.fillStyle = 'rgba(232,206,150,0.16)'
  ctx.fillRect(356, 52, 1208, 8)
  ctx.fillRect(356, 52, 8, 968)
  ctx.fillStyle = '#141c2a'
  ctx.fillRect(430, 120, 1060, 830)
  ctx.save()
  ctx.beginPath()
  ctx.rect(430, 120, 1060, 830)
  ctx.clip()
  // the bedroom behind the reflection: wall, moon smear, bed hint
  const wg = ctx.createLinearGradient(0, 120, 0, 950)
  wg.addColorStop(0, '#1c2740')
  wg.addColorStop(1, '#111828')
  ctx.fillStyle = wg
  ctx.fillRect(430, 120, 1060, 830)
  ctx.fillStyle = 'rgba(180,205,245,0.14)'
  ctx.beginPath()
  ctx.moveTo(470, 180)
  ctx.lineTo(640, 160)
  ctx.lineTo(560, 700)
  ctx.lineTo(440, 700)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#1a2338'
  ctx.fillRect(430, 812, 1060, 140)
  ctx.fillStyle = 'rgba(190,210,240,0.07)'
  ctx.fillRect(430, 812, 1060, 5)
  // the bald reflection, big — eyes land at y 520
  const jit = scream ? Math.sin(lt * 93) * 3 : 0
  const hd = S.vitoBaldHead
  const hy = 520 - (VITO.eyeY - 8) * hd.k
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(hd.c, Math.round(960 - hd.w / 2 + jit), Math.round(hy))
  const my = hy + (VITO.mouthY - 8) * hd.k
  if (scream) {
    // the scream: a wide dark mouth; the sprite's own brows do the rest
    ctx.fillStyle = '#200e08'
    ctx.beginPath()
    ctx.ellipse(958 + jit, my + 24, 36, 50, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#090403'
    ctx.beginPath()
    ctx.ellipse(958 + jit, my + 32, 23, 32, 0, 0, TAU)
    ctx.fill()
    if (g > VISIT_EV.scream + 0.45) {
      ART.hand(ctx, 826, 550, 1.3, { rot: -1.1, skin: '#8a5c34' })
      ART.hand(ctx, 1094, 550, 1.3, { rot: 1.1, flip: true, skin: '#8a5c34' })
    }
  }
  // glass shading: keep the face bright, sink the shoulders into the dim reflection
  const dimG = ctx.createLinearGradient(0, 600, 0, 740)
  dimG.addColorStop(0, 'rgba(16,22,38,0)')
  dimG.addColorStop(1, 'rgba(16,22,38,0.62)')
  ctx.fillStyle = dimG
  ctx.fillRect(430, 600, 1060, 350)
  // glass tint + sheen
  ctx.fillStyle = 'rgba(140,175,225,0.06)'
  ctx.fillRect(430, 120, 1060, 830)
  ctx.fillStyle = 'rgba(210,226,248,0.03)'
  ctx.beginPath()
  ctx.moveTo(520, 130)
  ctx.lineTo(586, 130)
  ctx.lineTo(470, 660)
  ctx.lineTo(436, 660)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // frame rosettes
  ctx.fillStyle = '#8a744a'
  for (const [rx, ry] of [[356, 52], [1564, 52], [356, 1020], [1564, 1020]]) {
    ctx.beginPath()
    ctx.arc(rx, ry, 14, 0, TAU)
    ctx.fill()
  }
}
function drawVisit(ctx, lt, t, ov) {
  const { g } = VISIT_CLOCK.warp(lt)
  ctx.fillStyle = '#04060a'
  ctx.fillRect(0, 0, W, H)
  if (g >= VISIT_EV.mirrorJump) {
    // hard cut inside the shot: the mirror close-up, then the whip to black
    const wu = seg(g, VISIT_EV.whip, VISIT_EV.whip + 0.36)
    ctx.save()
    ctx.translate(wu * wu * 1500, 0)
    drawMirror(ctx, g, lt)
    ctx.restore()
    if (wu > 0) {
      ctx.fillStyle = `rgba(2,3,6,${cl(wu * 1.15)})`
      ctx.fillRect(0, 0, W * cl(wu * 1.15), H)
      ctx.fillStyle = 'rgba(220,228,244,0.05)'
      for (let i = 0; i < 4; i++) ctx.fillRect(0, 160 + i * 210, W, 7)
    }
    return
  }
  ctx.save()
  push(ctx, 0.03 * seg(lt, 0, 22))
  ctx.drawImage(S.bedroom, 0, 0)
  // Vito asleep: his flow until the snips take it, then bare scalp under the moon.
  // The bed front hides his legs: clip the rig at the mattress line so he sits IN the bed.
  const bald = g >= VISIT_EV.snip2 + 0.25
  const rig = bald ? S.vitoBald : S.vito
  const stir = g >= VISIT_EV.stir
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, W, 802)
  ctx.clip()
  sprite(ctx, rig, BED.vitoX, BED.vitoFeet, {
    lift: stir ? [4 + Math.round(Math.sin(g * 5) * 2), 0] : [1, 0],
    stride: [1, 0], lean: stir ? 0.02 : -0.05, sx: BED.vitoS, sy: BED.vitoS,
  })
  ctx.restore()
  if (!stir) {
    // asleep: skin covers + lash lines over the sprite's open eyes
    ART.closedEyes(ctx, BED.vitoX, BED.vitoFeet, BED.vitoS, VITO.eyeY, VITO.eyeDX, '#6e4a28')
  }
  // his harvested gold flow waits under the sheet; the retreating duvet uncovers it
  const pull = sheetPull(g)
  if (pull > 0.5) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, BED.duvet.x0 + 356 * pull - 8, H)
    ctx.clip()
    ART.wig(ctx, BED.flow.x, BED.flow.y, 200, -1.4, 0, { tint: 'gold' })
    ctx.restore()
  }
  if (g > VISIT_EV.wigReveal && g < VISIT_EV.wigReveal + 0.7) {
    ART.star4(ctx, BED.flow.x + 30, BED.flow.y - 20, 60, (g - VISIT_EV.wigReveal) / 0.7)
  }
  ART.duvet(ctx, pull)
  // the fedora silhouettes: tiptoe in, flank the bed, gone by VISIT_EV.vanish
  for (let i = 0; i < 3; i++) {
    const p = enforcerPath(g, i)
    if (!p) continue
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.ellipse(p.x, 1006, 62, 12, 0, 0, TAU)
    ctx.fill()
    sprite(ctx, S.eDark[i], p.x, 1002, {
      lift: [Math.round(p.bob * 0.4), Math.round(p.bob * 0.3)],
      stride: p.planted ? [1, 0] : [2, -2], lean: 0.04, sx: 2.5, sy: 2.5,
    })
    ART.fedora(ctx, p.x, 1002 - 96 * 2.5, 148, '#0c0b12')
    if (p.caseBag) ART.bagCase(ctx, p.x + 82, 972, 1.1)
  }
  // snip-snick: steel glints over the sleeping head, no gore
  for (const [ev, sx2] of [[VISIT_EV.snip1, 836], [VISIT_EV.snip2, 926]]) {
    const age = g - ev
    if (age >= 0 && age < 0.5) ART.snipGlint(ctx, sx2, bedAnchor(30), age / 0.5)
  }
  // he feels the scalp: a hand rises to bare skin
  const ht = seg(g, VISIT_EV.headTouch, VISIT_EV.headTouch + 0.8)
  if (ht > 0) {
    ART.hand(ctx, lerp(BED.vitoX + 96, BED.vitoX + 10, ht), lerp(786, bedAnchor(16), ht), 1.0, { rot: 2.3, skin: '#8a5c34' })
  }
  ctx.restore()
}

// ============================== S3 — THE CROWNING WAR (montage) ==============================
function drawBarbershop(ctx, lt, gag, t) {
  ctx.drawImage(S.barber, 0, 0)
  sprite(ctx, S.e1, 1010, 782, { lift: [1, 0], stride: [1, 0], lean: -0.04 - gag * 0.05, sx: 2.25, sy: 2.25 })
  // the rug on his head — until the pole hook takes it
  if (gag <= 0) {
    ART.toupee(ctx, 1010, 566, 118, '#33200f', 0.05)
  } else {
    const fu = cl(gag * 1.35)
    ART.toupee(ctx, 1010 + 440 * fu, 556 - 330 * fu + 560 * fu * fu, 118, '#33200f', fu * 7)
    ART.stubbleHalo(ctx, 1010, 570, 48, cl(gag * 3))
  }
  ctx.drawImage(S.chairFront, 0, 0)
  ART.barberPole(ctx, lt * 60 + 40)
  // the hook arm swings out of the pole, takes the rug, retracts empty
  const pre = E.outCubic(seg(lt, 0.05, 0.4))
  const ret = gag > 0.45 ? cl((gag - 0.45) * 2.4) : 0
  if (pre > 0 && ret < 1) {
    const a = lerp(1.9, 2.67, pre)
    const len = 545 * pre * (1 - E.inCubic(ret))
    const hx = 1495 + Math.cos(a) * len, hy = 320 + Math.sin(a) * len
    ctx.strokeStyle = '#b9b4a6'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(1495, 316)
    ctx.lineTo(hx, hy)
    ctx.stroke()
    if (gag <= 0) {
      ctx.strokeStyle = '#8a8578'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.arc(hx, hy, 10, a - 2.4, a - 0.7)
      ctx.stroke()
    }
  }
  ART.star4(ctx, 1495, 460, 40, (0.5 + 0.5 * Math.sin(lt * 5)) * 0.7)
  edgeDark(ctx, 0.3)
}
function drawConsig(ctx, lt, gag, t) {
  ctx.drawImage(S.consig, 0, 0)
  sprite(ctx, S.e2, 812, 862, { lift: [2, 0], stride: [1, 0], lean: -0.03, flip: true, sx: 2.5, sy: 2.5 })
  sprite(ctx, S.e3, 1128, 862, { lift: [2, 0], stride: [1, 0], lean: 0.03, sx: 2.5, sy: 2.5 })
  ART.toupee(ctx, 812, 618, 116, '#4a4038', -0.06)
  ART.toupee(ctx, 1128, 620, 118, '#241a10', 0.06)
  // the toast: glasses rise to a clink just before the stab; the snagged man's dips
  const raise = Math.sin(cl(lt / 0.7) * Math.PI)
  ctx.drawImage(S.consigFront, 0, 0)
  ART.toastGlass(ctx, 866, 712, 1.1, Math.max(0, raise - gag * 1.4))
  ART.toastGlass(ctx, 1074, 712, 1.1, raise)
  // the fishing line from above: drops, hooks the toupee, yanks it skyward
  const pre = seg(lt, 0, 0.38)
  if (gag <= 0 && pre > 0) {
    ctx.strokeStyle = 'rgba(210,220,230,0.5)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(812, -20)
    ctx.lineTo(812, lerp(-20, 596, pre))
    ctx.stroke()
  } else if (gag > 0) {
    const yu = E.outCubic(cl(gag * 1.3))
    const ty = lerp(606, -140, yu)
    ctx.strokeStyle = 'rgba(210,220,230,0.5)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(812 + yu * 30, -20)
    ctx.lineTo(812 + yu * 30, ty + 10)
    ctx.stroke()
    ART.toupee(ctx, 812 + yu * 30, ty, 116, '#4a4038', yu * 5)
    ART.stubbleHalo(ctx, 812, 622, 46, cl(gag * 3))
    // the wine goes with it: a spurt of drops
    for (let i = 0; i < 4; i++) {
      const a = gag * 1.5 - i * 0.08
      if (a <= 0 || a >= 1) continue
      ctx.fillStyle = '#6e1a24'
      ctx.beginPath()
      ctx.arc(880 + 40 * a, 680 - 190 * a + 500 * a * a, 5, 0, TAU)
      ctx.fill()
    }
  }
  ART.star4(ctx, 970, 620, 34, (0.5 + 0.5 * Math.sin(lt * 6 + 1)) * 0.6)
  edgeDark(ctx, 0.3)
}
function drawStudyLift(ctx, lt, gag, t) {
  ctx.drawImage(S.study, 0, 0)
  ART.doorPanel(ctx, 0)
  // the Don naps at his desk, slumped and snoring; the prize within reach of the sky
  const jolt = seg(t, 64.4, 65.2)
  sprite(ctx, S.don, 968, 766, {
    lift: [4, 0], stride: [2, 0],
    lean: 0.06 + Math.sin(lt * 2.1) * 0.02 + jolt * 0.1,
    rot: -0.15 + jolt * 0.16, sx: 2.45, sy: 2.45,
  })
  ART.closedEyes(ctx, 968, 766, 2.45, 49, 14.5, '#caa287')
  ctx.drawImage(S.desk, 0, 0)
  ART.smokeCurl(ctx, lt)
  ART.lampFlicker(ctx, lt, 0.7)
  // the lift: timeline path, plus the silhouetted arm that meets it
  const lift = wigLiftPath(t)
  if (lift) {
    ART.wig(ctx, lift.x, lift.y, 132, lift.rot, Math.sin(lt * 3) * 0.5)
    const tx = lift.x + 24, ty = lift.y - 54
    ctx.strokeStyle = '#120c08'
    ctx.lineWidth = 28
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(tx + 60, -60)
    ctx.lineTo(tx, ty)
    ctx.stroke()
    ART.hand(ctx, tx - 5, ty, 0.9, { rot: 1.35, skin: '#241610' })
  }
  ART.slatShimmer(ctx, lt + 30)
  edgeDark(ctx, 0.32)
}
function drawVault(ctx, lt, gag, t) {
  ctx.drawImage(S.vault, 0, 0)
  // tumblers spin, then the door blows
  const spin = lt < 0.42 ? lt * 15 : 6.3
  ctx.save()
  ctx.translate(760, 380)
  ctx.rotate(spin)
  ctx.strokeStyle = '#c9b06a'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -62)
  ctx.stroke()
  ctx.restore()
  const blow = E.outCubic(seg(lt, 0.42, 0.78))
  ART.vaultDoor(ctx, blow, t)
  if (blow > 0.5) {
    // the Flow agent in the doorway light, silhouetted against the discovery
    const au = E.outCubic(seg(lt, 0.7, 1.35))
    sprite(ctx, S.heroDark, lerp(330, 408, au), 884, {
      lift: [2, 0], stride: [1, 0], lean: 0.02, sx: 2.5, sy: 2.5,
      glow: '#ffe9ad', glowA: 0.28 * blow,
    })
  }
  edgeDark(ctx, 0.34)
}
function drawRain(ctx, lt, gag, t) {
  ctx.drawImage(S.rain, 0, 0)
  ART.rainWigs(ctx, lt)
  edgeDark(ctx, 0.36)
}
function drawParade(ctx, lt, gag, t) {
  ctx.drawImage(S.parade, 0, 0)
  // the lifted wig carried high like a flag
  ctx.fillStyle = '#141009'
  ctx.fillRect(694, 296, 13, 790)
  ctx.fillStyle = '#c9a44a'
  ctx.beginPath()
  ctx.arc(700, 292, 10, 0, TAU)
  ctx.fill()
  ART.wig(ctx, 700, 316, 150, 1.32 + Math.sin(lt * 5) * 0.08, Math.sin(lt * 6.2) * 0.9)
  ART.confetti(ctx, lt)
  edgeDark(ctx, 0.3)
}
function drawSign(ctx, lt, gag, t) {
  ctx.drawImage(S.sign, 0, 0)
  // pole stripes
  ctx.save()
  ctx.beginPath()
  ctx.rect(562, 524, 80, 322)
  ctx.clip()
  ctx.fillStyle = '#e8e2d4'
  ctx.fillRect(562, 524, 80, 322)
  const per = 88
  for (let i = -1; i < 6; i++) {
    const y0 = 524 + ((i * per + lt * 120) % (per * 6)) - per
    ctx.strokeStyle = '#a8282a'
    ctx.lineWidth = 26
    ctx.beginPath()
    ctx.moveTo(540, y0 + 18)
    ctx.lineTo(664, y0 - 24)
    ctx.stroke()
    ctx.strokeStyle = '#2c4a8a'
    ctx.lineWidth = 11
    ctx.beginPath()
    ctx.moveTo(540, y0 + 46)
    ctx.lineTo(664, y0 + 4)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  ctx.fillRect(562, 524, 18, 322)
  ctx.restore()
  ART.neonFLOW(ctx, lt, gag)
  edgeDark(ctx, 0.34)
}
const VIGNETTES = {
  barbershop: drawBarbershop,
  consiglieri: drawConsig,
  studyLift: drawStudyLift,
  vault: drawVault,
  rain: drawRain,
  parade: drawParade,
  sign: drawSign,
}
function edgeDark(ctx, a) {
  const g = ctx.createRadialGradient(960, 540, 420, 960, 540, 1150)
  g.addColorStop(0, 'rgba(2,1,0,0)')
  g.addColorStop(1, `rgba(2,1,0,${a})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}
function drawChapel(ctx, lt, t, ov) {
  // the baptism montage: on each stab, a full-frame de-wigging; chapel between and after
  const v = vignetteAt(t)
  if (v) {
    VIGNETTES[v.kind](ctx, t - v.t0, cl((t - v.stab) / 1.5), t)
    return
  }
  const g = lt
  ctx.fillStyle = '#08050b'
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  push(ctx, 0.045 * seg(lt, 0, 29.4))
  ctx.drawImage(S.chapel, 0, 0)
  ART.godRays(ctx, g, 1)
  ART.dustMotes(ctx, g, 40, 30, 700, 130, 520, 880)
  ART.censer(ctx, g)
  // bells peal over the barrage peak
  const bp = g - (T.chapel + CHAPEL_EV.bells)
  if (bp > 0 && bp < 1.4) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const g2 = ctx.createRadialGradient(960, 300, 40, 960, 300, 560 * (1 + bp))
    g2.addColorStop(0, `rgba(255,224,150,${0.14 * (1 - bp / 1.4)})`)
    g2.addColorStop(1, 'rgba(255,224,150,0)')
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
  // the priest, arm raised for the anointing
  const ann = seg(g, CHAPEL_EV.anoint, CHAPEL_EV.anoint + 0.6)
  sprite(ctx, S.priest, CHAPEL.priest.x, CHAPEL.priest.feet, { lift: [2, 0], stride: [1, 0], lean: -0.05, flip: true, sx: 2.6, sy: 2.6 })
  ART.priestRobe(ctx, CHAPEL.priest.x, CHAPEL.priest.feet, 2.6)
  if (ann > 0) {
    ctx.strokeStyle = '#141419'
    ctx.lineWidth = 24
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(1122, 650)
    ctx.lineTo(1140, 552 - 46 * ann)
    ctx.stroke()
    ART.hand(ctx, 1140, 538 - 46 * ann, 0.8, { rot: -1.5 })
  }
  // 42 kneels at the altar steps, rises at the resolve
  const k = heroKneel(g)
  sprite(ctx, S.hero, CHAPEL.hero.x, CHAPEL.hero.feet + k, {
    lift: [2, 0], stride: [1, 0], lean: 0.04 + 0.08 * cl(k / 46), sx: 2.7, sy: 2.7,
    glow: '#e9c05a', glowA: 0.08 + 0.14 * ann,
  })
  // the golden oil, then the strand-crown halo
  ART.oilDrop(ctx, 1140, 540, CHAPEL.hero.x + 4, CHAPEL.hero.feet + k - 262, seg(g, CHAPEL_EV.anoint, CHAPEL_EV.anoint + 0.55))
  ART.anointHalo(ctx, CHAPEL.hero.x, CHAPEL.hero.feet + k - 272, seg(g, CHAPEL_EV.anoint + 0.55, CHAPEL_EV.anoint + 1.5), g)
  // iris out on the new Don
  const ir = seg(g, CHAPEL_EV.iris, CHAPEL_EV.iris + 0.6)
  if (ir > 0) ART.iris(ctx, 1200 * (1 - ir) ** 1.8, CHAPEL.hero.x, 600)
  ctx.restore()
}

// ============================== S4 — THE NEW DON ==============================
function drawEnd(ctx, lt, t, ov) {
  const g = lt
  ctx.fillStyle = '#070402'
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  push(ctx, 0.03 * seg(lt, 0, 8.6))
  ctx.drawImage(S.study, 0, 0)
  // the door stands open on Bonasera, then swings shut with the thud
  const dc = seg(g, END_EV.doorClose, END_EV.doorClose + 0.35)
  const ang = 1.15 * (1 - dc) ** 1.5
  if (ang > 0.5) {
    sprite(ctx, S.bonDark, 1812, 836, {
      lift: [1, 0], stride: [1, 0], lean: 0.06, sx: 1.6, sy: 1.6, alpha: 0.95,
      glow: '#b98a4a', glowA: 0.4,
    })
  }
  ART.doorPanel(ctx, ang, 1 - dc)
  // 42 takes the chair — the sword sheathed, ceremonial, held low
  sprite(ctx, S.hero, 968, 796, { lift: [2, 0], stride: [1, 0], lean: -0.02, sx: 2.62, sy: 2.62 })
  ctx.drawImage(S.desk, 0, 0)
  // the wig waits on its stand; the pickup; the one slow stroke — his gesture now,
  // played on the desktop where the caress reads
  ART.wigStand(ctx, 1056, 640, 0.66)
  const pu = seg(g, END_EV.wigPickup, END_EV.wigPickup + 0.5)
  if (pu < 1) {
    ART.wig(ctx, lerp(1056, 890, pu), lerp(600, 622, pu * pu), 108, lerp(0.06, 0.55, pu), 0)
  } else {
    strokePose(ctx, 890, 622, 0.55, wigStrokeMirror(t))
  }
  ART.lampFlicker(ctx, g, 0.35)
  ART.slatShimmer(ctx, g + 30)
  ctx.restore()
  // hold black to 90
  const fd = seg(g, END_EV.fin, END_EV.fin + 0.8)
  if (fd > 0) {
    ctx.fillStyle = `rgba(2,1,1,${fd})`
    ctx.fillRect(0, 0, W, H)
  }
}

// ---------- lower-third caption: cream serif on a subtle dark band ----------
function lowerThird(emph) {
  return (o, cap, s, t) => {
    const pin = s.in > 0 ? seg(t, cap.t0, cap.t0 + s.in) : 1
    const pout = s.out > 0 ? seg(t, cap.t1 - s.out, cap.t1) : 0
    const ease = (x) => x * x * (3 - 2 * x)
    const a = ease(pin) * (1 - ease(pout))
    if (a <= 0) return
    const lines = String(cap.text).split('\n')
    let tw = 0
    for (const l of lines) tw = Math.max(tw, measure(o, l, s.size, s.font, s.track, s.weight))
    const bw = tw + 120, bh = lines.length * s.size * s.lineHeight + 36
    const x0 = s.x - bw / 2, y0 = s.y - bh / 2
    o.save()
    o.globalAlpha = a * (emph ? 0.58 : 0.5)
    const g = o.createLinearGradient(0, y0, 0, y0 + bh)
    g.addColorStop(0, 'rgba(8,5,3,0)')
    g.addColorStop(0.2, 'rgba(8,5,3,0.95)')
    g.addColorStop(0.8, 'rgba(8,5,3,0.95)')
    g.addColorStop(1, 'rgba(8,5,3,0)')
    o.fillStyle = g
    o.fillRect(x0, y0, bw, bh)
    o.globalAlpha = a * 0.22
    o.fillStyle = '#e8d9b0'
    o.fillRect(x0 + 30, y0 + 9, bw - 60, 1.5)
    o.fillRect(x0 + 30, y0 + bh - 10, bw - 60, 1.5)
    o.restore()
    const lh = s.size * s.lineHeight
    const top = s.y - ((lines.length - 1) * lh) / 2
    lines.forEach((l, i) => {
      txt(o, l, s.x, top + i * lh, {
        size: s.size, font: s.font, weight: s.weight, color: s.color, align: 'center',
        base: 'middle', track: s.track, alpha: a, shadow: '#060402',
      })
    })
  }
}

// ============================== the film ==============================
export default {
  title: 'THE BALDFATHER',
  output: 'the-baldfather.mp4',
  duration: DURATION,
  grid: { bar: 2 },
  async prepare() {
    // the locked cast, near rigs
    S.don = await A.loadRemy(CAST.don, false)
    S.bon = await A.loadRemy(CAST.bonasera, false)
    S.vito = await A.loadRemy(CAST.vito, false)
    S.e1 = await A.loadRemy(CAST.enforcer1, false)
    S.e2 = await A.loadRemy(CAST.enforcer2, false)
    S.e3 = await A.loadRemy(CAST.enforcer3, false)
    S.priest = await A.loadRemy(CAST.priest, false)
    S.daughter = await A.loadRemy(CAST.daughter, false)
    S.hero = await A.loadRemy(CAST.hero, false)
    // variants: the razored Vito, the mirror head, the silhouettes
    S.vitoBald = ART.baldify(S.vito)
    S.vitoBaldHead = ART.baldHead(S.vitoBald, 6.5)
    S.eDark = [S.e1, S.e2, S.e3].map((R) => ART.darkRig(R))
    S.bonDark = ART.tintRig(S.bon, '#241c14')
    S.heroDark = ART.tintRig(S.hero, '#0a0a0e')
    const heads = await A.loadHeads()
    S.wedFig = ART.tintCanvas(A.headIcon(heads, CAST.daughter, 3), '#3a1e10')
    // sets
    S.study = ART.studyBake()
    S.desk = ART.deskBake()
    S.bedroom = ART.bedroomBake()
    S.chapel = ART.chapelBake()
    S.barber = ART.barbershopBake()
    S.chairFront = ART.chairFrontBake()
    S.consig = ART.consigBake()
    S.consigFront = ART.consigFrontBake()
    S.vault = ART.vaultBake()
    S.rain = ART.rainBake()
    S.parade = ART.paradeBake()
    S.sign = ART.signBake()
  },
  shots: [
    {
      name: 'study', t0: T.study, t1: T.visit,
      draw(ctx, lt, dur, t, ov) { drawStudy(ctx, lt, t, ov) },
      fx: () => ({ letterbox: 0.75, bloom: 0.1, bloomThresh: 0.9, warm: 0.35, grain: 0.028, vignette: 0.35 }),
    },
    {
      name: 'visit', t0: T.visit, t1: T.chapel,
      draw(ctx, lt, dur, t, ov) { drawVisit(ctx, lt, t, ov) },
      fx: () => ({ letterbox: 0.75, bloom: 0.06, bloomThresh: 0.9, warm: -0.1, sat: 0.85, grain: 0.03, vignette: 0.45 }),
    },
    {
      name: 'chapel', t0: T.chapel, t1: T.end,
      draw(ctx, lt, dur, t, ov) { drawChapel(ctx, lt, t, ov) },
      fx: () => ({ letterbox: 0.75, bloom: 0.12, bloomThresh: 0.9, warm: 0.15, grain: 0.025, vignette: 0.3, rays: 0.05, lightX: 0.5, lightY: 0.22 }),
    },
    {
      name: 'end', t0: T.end, t1: DURATION,
      draw(ctx, lt, dur, t, ov) { drawEnd(ctx, lt, t, ov) },
      fx: () => ({ letterbox: 0.75, bloom: 0.1, bloomThresh: 0.9, warm: 0.3, sat: 0.8, grain: 0.028, vignette: 0.4 }),
    },
  ],
  captions: CAPTIONS,
  captionStyles: {
    'card-sm serif': {
      font: F.serif, weight: '600', size: 40, color: '#cfc0a0', align: 'center',
      x: 960, y: 470, track: 9, anim: 'fade', in: 0, out: 0, shadow: '#060402',
      glow: '#7a4a1a', glowBlur: 12,
    },
    'card-sm serif caps': {
      font: F.serif, weight: '600', size: 38, color: '#d8c9a8', align: 'center',
      x: 960, y: 452, track: 7, anim: 'fade', in: 0, out: 0, shadow: '#060402',
    },
    'title-lg serif': {
      font: F.serif, weight: '600', size: 112, color: '#f3e9d2', align: 'center',
      x: 960, y: 300, track: 6, anim: 'fade', in: 0.1, out: 0.1,
      shadow: '#060402', glow: '#8a5a20', glowBlur: 20,
    },
    'title-lg serif letterspaced y300': {
      font: F.serif, weight: '600', size: 110, color: '#f3e9d2', align: 'center',
      x: 960, y: 300, track: 20, anim: 'fade', in: 0.6, out: 0.4,
      shadow: '#060402', glow: '#8a5a20', glowBlur: 20,
    },
    'lower-third': {
      font: F.serif, weight: '600', size: 54, color: '#f3e9d2', align: 'center',
      x: 960, y: 872, track: 1, lineHeight: 1.2, anim: 'fade', in: 0.22, out: 0.28,
      draw: lowerThird(false),
    },
    'lower-third emphatic': {
      font: F.serif, weight: '700', size: 62, color: '#ffe9c8', align: 'center',
      x: 960, y: 866, track: 3, lineHeight: 1.2, anim: 'fade', in: 0.12, out: 0.2,
      draw: lowerThird(true),
    },
  },
  flashes: FLASHES,
  score,
  audio: { seed: 42, reverb: 2.4, reverbGain: 0.3 },
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } },
}
