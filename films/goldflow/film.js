// GOLDFLOW — a Remy Boys spy thriller. Agent 42 vs DR. NO-HAIR: gun-barrel opening,
// Cabald Tower heist, gold title sequence, scalp-map briefing, Bald Mountain showdown
// with a molten-gold finish, and a rooftop tag. Full-res 2D, sprites 2.6–3.2× nearest.
import { W, H, hash, seg, lerp, E, F } from 'filmkit/lib.js'
import { flowArrow } from 'filmkit/motion.js'
import * as A from '../remy-bros/art.js'
import * as ART from './art.js'
import { score } from './score.js'
import {
  DURATION, T, CAST, BARREL_EV, TOWER_CLOCK, TOWER_EV, BEAMS, TITLES, CREDITS,
  LAIR_CLOCK, LAIR_EV, FLASHES, barrelHeroX, glide, heroLairX, villainLairX, hatPath,
} from './timeline.js'

const S = {}
const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)

function sprite(x, rig, px, feet, o = {}) {
  x.imageSmoothingEnabled = false
  A.drawRemy(x, rig, px, feet, o)
}
const run = (px, amp = 6) => {
  const s = Math.sin(px / 26 * Math.PI * 2)
  return { lift: [Math.round(Math.max(0, s) * amp), Math.round(Math.max(0, -s) * amp)], stride: [Math.round(s * 2), Math.round(-s * 2)], lean: 0.05 }
}
const walk = (px) => {
  const s = Math.sin(px / 40 * Math.PI * 2)
  return { lift: [Math.round(Math.max(0, s) * 4), Math.round(Math.max(0, -s) * 4)], stride: [Math.round(s * 2), Math.round(-s * 2)], lean: 0.02 }
}
// climbing: legs alternate quickly, body leans into the wall
const climbAnim = (px) => {
  const s = Math.sin(px / 18 * Math.PI * 2)
  return { lift: [Math.round(Math.max(0, s) * 8), Math.round(Math.max(0, -s) * 8)], stride: [Math.round(s * 3), Math.round(-s * 3)], lean: -0.1 }
}

// integrated climb speed: 300 px/s except pauses under each beam (table baked in prepare)
function climbPos(g) {
  const tab = S.climb, step = 0.01
  const i = cl((g - TOWER_EV.climbStart) / step)
  const i0 = Math.min(tab.length - 1, Math.floor(i * (tab.length - 1)))
  const i1 = Math.min(tab.length - 1, i0 + 1)
  const f = i * (tab.length - 1) - i0
  return lerp(tab[i0], tab[i1], f)
}

// ============================== S1 — GUN BARREL ==============================
function drawBarrel(ctx, lt, t, ov) {
  ctx.fillStyle = '#050608'
  ctx.fillRect(0, 0, W, H)
  const cx = 960, cy = 535, r = 410
  const grow = cl(lt / 1.1)
  const stroke = seg(lt, BARREL_EV.comb, BARREL_EV.comb + 0.8)
  // curled strands straighten progressively under the comb, then hold straight
  if (lt < BARREL_EV.comb + 0.9) ART.strands(ctx, cx, cy, r * grow, t, 0.9 * (1 - stroke))
  if (stroke > 0) ART.strandsStraight(ctx, cx, cy, r, 0.95 * stroke)
  // hero walks in, combs the rifling straight, turns, slashes
  const hx = barrelHeroX(lt)
  const moving = lt < 3.05
  if (stroke > 0 && stroke < 1) {
    const bob = Math.abs(Math.sin(stroke * Math.PI * 3)) * 16
    ART.combush(ctx, hx + 80, 640 - bob, 1.2, 80, '#ffe9ad')
  }
  sprite(ctx, S.heroDark, hx, 850, {
    ...(moving ? run(hx) : { lift: [2, 0], stride: [1, 0], lean: 0.02 }),
    flip: lt >= BARREL_EV.turn, sx: 4.0, sy: 4.0,
    glow: '#e8cf7e', glowA: 0.5,
  })
  if (stroke >= 1 && lt < BARREL_EV.turn) ART.combush(ctx, hx + 80, 640, 1.2, 80, '#ffe9ad')
  // the slash
  const sk = (lt - BARREL_EV.shot) / 0.5
  if (sk > 0 && sk < 1.6) {
    ART.slash(ctx, cx, cy, sk)
    if (sk < 1) ART.starGlint(ov, cx + 130, cy - 40, 90, sk)
  }
  // gold flood from the wound, hold, wipe to black
  const u = seg(lt, BARREL_EV.flood, BARREL_EV.flood + 0.55)
  if (u > 0) {
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1500)
    gr.addColorStop(0, '#fff2c8')
    gr.addColorStop(0.5, '#e8cf7e')
    gr.addColorStop(1, '#8a5a1e')
    ctx.globalAlpha = cl(u * 1.6)
    ctx.fillStyle = gr
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1
  }
  const wipe = seg(lt, BARREL_EV.wipe, BARREL_EV.wipe + 0.5)
  if (wipe > 0) {
    ctx.fillStyle = '#050608'
    ctx.fillRect(0, 0, W, H * wipe)
  }
}

// ============================== S2 — CABALD TOWER ==============================
function drawTower(ctx, lt, t, ov) {
  const { g } = TOWER_CLOCK.warp(lt)
  ctx.fillStyle = '#060a14'
  ctx.fillRect(0, 0, W, H)
  // night sky + moon (shared by the exterior acts)
  const sky = (top) => {
    const gr = ctx.createLinearGradient(0, top, 0, H)
    gr.addColorStop(0, '#070c1a')
    gr.addColorStop(1, '#0d1526')
    ctx.fillStyle = gr
    ctx.fillRect(0, top, W, H - top)
    ctx.fillStyle = '#d9dfec'
    ctx.beginPath(); ctx.arc(340, 150, 46, 0, 7); ctx.fill()
    ctx.fillStyle = 'rgba(7,12,26,0.35)'
    ctx.beginPath(); ctx.arc(322, 138, 12, 0, 7); ctx.fill()
    ctx.beginPath(); ctx.arc(356, 162, 8, 0, 7); ctx.fill()
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(220,230,250,${0.25 + 0.5 * hash(i * 31 + 77)})`
      ctx.fillRect(Math.floor(hash(i * 7 + 1) * W), Math.floor(hash(i * 13 + 2) * 260), 2, 2)
    }
  }
  if (g < TOWER_EV.climbStart) {
    // wide establish, then tilt up the facade
    const tilt = E.outCubic(seg(lt, 1.2, 3.0))
    if (lt < 1.25) {
      sky(0)
      ctx.drawImage(S.cityMid, -80, 0)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(S.tower, 1330, 150, 253, 858)
      // moonlit left edge + a lit window column so the landmark registers
      ctx.fillStyle = 'rgba(150,180,230,0.13)'
      ctx.fillRect(1330, 150, 14, 858)
      ctx.fillStyle = 'rgba(233,217,166,0.8)'
      for (let i = 0; i < 5; i++) ctx.fillRect(1420 + (i % 2) * 30, 300 + i * 90, 12, 16)
      return
    }
    sky(0)
    ctx.drawImage(S.cityFar, -60, 40)
    const ty = lerp(-310, 60, tilt)
    ctx.drawImage(S.tower, 940, ty)
    ctx.fillStyle = 'rgba(150,180,230,0.13)'
    ctx.fillRect(940, Math.max(0, ty), 14, Math.min(1560, 1560 + Math.min(0, ty)))
    ctx.fillStyle = 'rgba(233,217,166,0.75)'
    for (let i = 0; i < 6; i++) ctx.fillRect(1030 + (i % 2) * 30, ty + 240 + i * 130, 12, 16)
    // blinker on the antenna
    if (Math.sin(t * 4) > 0.6) {
      ctx.fillStyle = '#ff5a4a'
      ctx.beginPath(); ctx.arc(1170, ty - 54, 7, 0, 7); ctx.fill()
    }
    return
  }
  if (g < TOWER_EV.vault) {
    // climb: hero pinned at feet 700, world scrolls down past the beams
    const scr = climbPos(g) - climbPos(TOWER_EV.climbStart)
    sky(0)
    ctx.drawImage(S.tower, 620, -220 + scr)
    // moonlit facade: bright edge + wash so the wall reads behind the climber
    const fg = ctx.createLinearGradient(620, 0, 1180, 0)
    fg.addColorStop(0, 'rgba(140,170,220,0.12)')
    fg.addColorStop(1, 'rgba(140,170,220,0)')
    ctx.fillStyle = fg
    ctx.fillRect(620, -220 + scr, 460, 1560)
    ctx.fillStyle = 'rgba(150,180,230,0.16)'
    ctx.fillRect(620, -220 + scr, 16, 1560)
    ctx.fillStyle = 'rgba(233,217,166,0.6)'
    for (let i = 0; i < 7; i++) {
      const wy = -220 + scr + ((i * 211) % 1400)
      if (wy > -40 && wy < 1080) ctx.fillRect(700 + (i % 3) * 90, wy, 12, 16)
    }
    // guard window passing (flashlight sweeping)
    const wgY = 700 + (climbPos(4.3) - climbPos(TOWER_EV.climbStart)) - scr - 240
    if (wgY > -260 && wgY < 1160) {
      ctx.fillStyle = '#18233a'
      ctx.fillRect(880, wgY, 180, 150)
      ctx.strokeStyle = '#3a4d74'; ctx.lineWidth = 6
      ctx.strokeRect(880, wgY, 180, 150)
      const fa = Math.sin(t * 1.4) * 0.4
      ART.searchlight(ctx, 975, wgY + 84, Math.PI - 0.7 + fa, 330, 0.28)
      sprite(ctx, S.g1, 968, wgY + 146, { sx: 1.3, sy: 1.3, flip: true })
    }
    // the beams — drawn behind the hero so he flattens under them, never decapitated
    let sy = 2.6, lean = -0.1
    const near = BEAMS.some((b) => Math.abs(g - b) < 0.5)
    if (near) { sy = 1.95; lean = 0.06 }
    for (const b of BEAMS) {
      const by = 700 + (climbPos(b) - climbPos(TOWER_EV.climbStart)) - scr - 240
      if (by < -40 || by > 1120) continue
      const gr = ctx.createLinearGradient(0, 0, W, 0)
      gr.addColorStop(0, 'rgba(255,70,50,0)')
      gr.addColorStop(0.5, 'rgba(255,90,60,0.9)')
      gr.addColorStop(1, 'rgba(255,70,50,0)')
      ctx.fillStyle = gr
      ctx.fillRect(0, by, W, 4)
      ctx.fillStyle = '#ff8a70'
      ctx.beginPath(); ctx.arc(700 + 260 * Math.sin(t * 3 + b), by + 2, 6, 0, 7); ctx.fill()
    }
    const ca = climbAnim(scr)
    sprite(ctx, S.hero, 760, 700, { ...ca, stride: near ? [3, -3] : ca.stride, lean, sx: 2.6, sy, glow: '#e8cf7e', glowA: 0.22 })
    return
  }
  if (g < 11) {
    // the vault: god rays, the FLOW SERUM, the grab
    ctx.drawImage(S.vault, 0, 0)
    ctx.save()
    ctx.translate(960, 640)
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 5; i++) {
      const a = t * 0.16 + i * 1.257
      ctx.globalAlpha = 0.05
      ctx.fillStyle = '#ffe9ad'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(a) * 1400, Math.sin(a) * 1400)
      ctx.lineTo(Math.cos(a + 0.16) * 1400, Math.sin(a + 0.16) * 1400)
      ctx.closePath(); ctx.fill()
    }
    ctx.restore()
    const walkU = seg(g, 8.0, 10.2)
    const hx = lerp(640, 860, E.outCubic(walkU))
    if (g < TOWER_EV.grab) {
      ART.vial(ctx, 960, 676, 2.0, t, 0.7)
      sprite(ctx, S.hero, hx, 880, { ...walk(hx * 0.9), sx: 2.8, sy: 2.8 })
    } else {
      sprite(ctx, S.hero, 860, 880, { lift: [3, 0], stride: [1, 0], lean: -0.05, sx: 2.8, sy: 2.8, glow: '#e8cf7e', glowA: 0.25 })
      ART.vial(ctx, 918, 740, 1.15, t, 0.9)
      ART.burst(ctx, S.grabBurst, t, 0.7, '#ffe9ad', 9, false)
    }
    if (g >= TOWER_EV.alarm) {
      const pulse = 0.5 + 0.5 * Math.sin((g - TOWER_EV.alarm) * 9)
      ctx.fillStyle = `rgba(255,60,40,${0.07 + 0.09 * pulse})`
      ctx.fillRect(0, 0, W, H)
      for (const bx of [70, 1850]) {
        const bg = ctx.createRadialGradient(bx, 120, 0, bx, 120, 220)
        bg.addColorStop(0, `rgba(255,80,60,${0.5 + 0.3 * pulse})`)
        bg.addColorStop(1, 'rgba(255,80,60,0)')
        ctx.fillStyle = bg
        ctx.beginPath(); ctx.arc(bx, 120, 220, 0, 7); ctx.fill()
      }
    }
    return
  }
  // the escape: dive, umbrella glide past searchlights, serum pompadour, plume
  sky(0)
  ctx.drawImage(S.cityMid, -140, 120)
  ctx.drawImage(S.tower, 1440, 40)
  ctx.fillStyle = 'rgba(150,180,230,0.13)'
  ctx.fillRect(1440, 40, 14, 900)
  // guards lean from a balcony window, hunting the sky
  ctx.fillStyle = '#141d31'
  ctx.fillRect(1436, 470, 200, 14)
  ctx.strokeStyle = '#2a3854'; ctx.lineWidth = 4
  ctx.strokeRect(1436, 470, 200, 14)
  sprite(ctx, S.g1, 1490, 468, { sx: 1.6, sy: 1.6, lean: -0.16, glow: '#e8cf7e', glowA: 0.25, flip: true })
  sprite(ctx, S.g2, 1610, 468, { sx: 1.6, sy: 1.6, lean: -0.18, stride: [2, -2], glow: '#e8cf7e', glowA: 0.25, flip: true })
  // searchlights hunting the sky
  const beam1 = Math.atan2(430 - 320, 700 - 1560) + 0.55 * Math.sin(t * 0.55)
  const beam2 = 0.9 + 0.5 * Math.sin(t * 0.4 + 2)
  ART.searchlight(ctx, 1560, 320, beam1, 1500, 0.13)
  ART.searchlight(ctx, 300, 280, beam2, 1500, 0.1)
  const gl = glide(g, TOWER_EV.chute)
  if (g < TOWER_EV.chute) {
    // the dive
    const du = seg(g, TOWER_EV.dive, TOWER_EV.chute)
    const dy = lerp(360, gl.y, du * du)
    sprite(ctx, S.hero, 1460 - 30 * du, dy + 300, { lift: [6, 2], stride: [2, -1], lean: 0.2, sx: 2.4, sy: 2.4, rot: lerp(0.6, 0.15, du), flip: true })
  } else {
    const pop = seg(g, TOWER_EV.chute, TOWER_EV.chute + 0.25)
    const uk = pop < 1 ? 0.2 + E.outBack(pop) * 0.85 : 1
    ART.umbrella(ctx, gl.x, gl.y, gl.rot, uk)
    const dang = Math.sin((g - TOWER_EV.chute) * 2.4) * 4
    sprite(ctx, S.hero, gl.x, gl.y + 284, { lift: [4 + dang, 0], stride: [2, -2], lean: gl.rot * 0.7, sx: 2.4, sy: 2.4, rot: gl.rot * 0.35, glow: '#e8cf7e', glowA: 0.2, flip: true })
    ART.vial(ctx, gl.x - 44, gl.y + 284 - 116, 0.7, t, 0.9)
    // serum leak: the pompadour blooms, then blows off as a plume
    const tk = E.outCubic(seg(g, TOWER_EV.tuft, TOWER_EV.tuft + 1.4)) * (g < TOWER_EV.plume ? 1 : 0.12)
    ART.tuft(ctx, gl.x - 8, gl.y + 284 - 270, tk, t, '#b5543f')
    if (g >= TOWER_EV.plume) ART.burst(ctx, S.plumeBurst, t, 1.6, '#d98a5a', 10, false)
  }
  // the alarm chases him out: red wash pulsing over the escape
  if (g > TOWER_EV.alarm && g < 13.6) {
    const pulse = 0.5 + 0.5 * Math.sin((g - TOWER_EV.alarm) * 9)
    ctx.fillStyle = `rgba(255,60,40,${0.05 + 0.07 * pulse})`
    ctx.fillRect(0, 0, W, H)
    const bg = ctx.createRadialGradient(1670, 60, 0, 1670, 60, 260)
    bg.addColorStop(0, `rgba(255,80,60,${0.55 + 0.3 * pulse})`)
    bg.addColorStop(1, 'rgba(255,80,60,0)')
    ctx.fillStyle = bg
    ctx.beginPath(); ctx.arc(1670, 60, 260, 0, 7); ctx.fill()
  }
  // iris out on the glider → whip into the title moon
  const ir = seg(g, TOWER_EV.iris, TOWER_EV.iris + 0.5)
  if (ir > 0) {
    const rad = Math.max(0.1, 760 * (1 - ir) ** 1.9)
    ctx.fillStyle = '#03040a'
    ctx.beginPath()
    ctx.rect(0, 0, W, H)
    ctx.moveTo(gl.x + rad, gl.y + 120)
    ctx.arc(gl.x, gl.y + 120, rad, 0, 7, true)
    ctx.fill('evenodd')
  }
}

// ============================== S3 — TITLES ==============================
function titleTableau(ctx, g, t) {
  // credit vignettes behind the captions (actors stand high, captions sit low)
  const sil = (rig, px, feet, col, o = {}) => sprite(ctx, rig, px, feet, { sx: 3, sy: 3, ...o })
  if (g < CREDITS[0][1]) {
    // AGENT 42 — running the ribbon
    ART.ribbon(ctx, t, 660, 2, 'rgba(201,164,74,0.5)', 0.6)
    const tx = 960 + 130 * Math.sin(t * 0.9)
    sil(S.heroGold, tx, ART.ribbonY(tx, t, 660, 2) + 44, '#e8cf7e', run(960 + t * 300))
  } else if (g < CREDITS[1][1]) {
    // MATA HAIRY — the only red in a gold world
    sil(S.mataGold, 870, 820, '#e9d9a6')
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(164,74,62,${0.5 - i * 0.1})`
      ctx.lineWidth = 7 - i
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(880, 580)
      ctx.bezierCurveTo(980 + i * 26, 560 + Math.sin(t * 2 + i) * 24, 1120 + i * 40, 650 - Math.sin(t * 1.6 + i) * 30, 1300 + i * 60, 610)
      ctx.stroke()
    }
    ART.starGlint(ctx, 1180, 610, 40, (t * 0.5) % 1)
  } else if (g < CREDITS[2][1]) {
    // ODDFOB — the hat spins past
    sil(S.henchBronze, 900, 820, '#8a6d3f')
    const hu = (t * 0.42) % 1
    ART.hatDisc(ctx, 1300 - 1000 * hu, 540 - 180 * Math.sin(Math.PI * hu), t * 9, 1.4)
  } else {
    // DR. NO-HAIR — and a gold figure sinks into a rippling pool (the vat, foreshadowed)
    ctx.fillStyle = 'rgba(232,207,126,0.16)'
    ctx.beginPath(); ctx.ellipse(1180, 842, 430, 110, 0, 0, 7); ctx.fill()
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.42 + i / 3) % 1
      ctx.strokeStyle = `rgba(232,207,126,${0.4 * (1 - ph)})`
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.ellipse(1180, 842, 90 + ph * 380, 24 + ph * 96, 0, 0, 7); ctx.stroke()
    }
    const sink = seg(g, TITLES.sink + 1.2, TITLES.sink + 2.4)
    if (sink > 0 && sink < 1) {
      ctx.save()
      ctx.beginPath(); ctx.ellipse(1180, 842, 430, 110, 0, 0, 7); ctx.clip()
      ctx.globalAlpha = 1 - sink * 0.7
      sprite(ctx, S.heroGold, 1180, 842 + sink * 320, { sx: 2.6, sy: 2.6, lift: [4, 0] })
      ctx.restore()
    }
    sil(S.villainBronze, 620, 820, '#8a6d3f')
    ART.cat(ctx, 500, 818, t)
  }
}
function drawTitles(ctx, lt, t, ov) {
  const g = lt
  ctx.fillStyle = '#04050a'
  ctx.fillRect(0, 0, W, H)
  const stars = () => {
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(220,228,246,${0.2 + 0.55 * hash(i * 17 + 9)})`
      ctx.fillRect(Math.floor(hash(i * 7) * W), Math.floor(hash(i * 29) * 560), 2, 2)
    }
  }
  if (g < TITLES.ribbon) {
    // the bald gold moon whips up out of the escape
    stars()
    const mu = E.outCubic(seg(g, 0, 1.9))
    const my = lerp(1060, 178, mu)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.moon159, 960 - S.moon159.width / 2, my)
    // face on the moon: eyes, brows, grin — it must read as a bald head, not a sun
    ctx.fillStyle = '#7a5f33'
    ctx.fillRect(960 - 96, my + S.moon159.height / 2 - 40, 26, 38)
    ctx.fillRect(960 + 70, my + S.moon159.height / 2 - 40, 26, 38)
    ctx.fillRect(960 - 104, my + S.moon159.height / 2 - 62, 44, 10)
    ctx.fillRect(960 + 62, my + S.moon159.height / 2 - 62, 44, 10)
    ctx.strokeStyle = '#7a5f33'
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(960, my + S.moon159.height / 2 + 26, 60, 0.35, Math.PI - 0.35)
    ctx.stroke()
    ctx.fillStyle = 'rgba(232,207,126,0.1)'
    ctx.beginPath(); ctx.ellipse(960, 952, 640, 62, 0, 0, 7); ctx.fill()
    // dark under-copy keeps the hero from merging into the moon's chin
    sprite(ctx, { ...S.heroGold, c: S.heroGoldOut }, 963, 931, { sx: 2.6, sy: 2.6, lift: [2, 0], stride: [1, 0] })
    sprite(ctx, S.heroGold, 960, 928, { sx: 2.6, sy: 2.6, lift: [2, 0], stride: [1, 0] })
    return
  }
  if (g < TITLES.razors + 0.6) {
    // hero silhouette runs the giant hair ribbon
    stars()
    ART.ribbon(ctx, t, 640, 0, '#c9a44a', cl((g - TITLES.ribbon) / 0.6))
    const rx = lerp(-220, 2140, seg(g, TITLES.ribbon + 0.2, TITLES.razors + 0.5))
    if (rx < 2100) {
      const ry = ART.ribbonY(rx, t, 640, 0) + 44
      sprite(ctx, S.heroGold, rx, ry, { ...run(rx), sx: 3, sy: 3 })
    }
    return
  }
  if (g < TITLES.stubble + 2.4) {
    // razors fall and slice; the stubble field forms; a giant razor shaves the title band
    const fade = 1 - seg(g, TITLES.razors, TITLES.razors + 0.5)
    if (fade > 0) ART.ribbon(ctx, t, 640, 0, '#c9a44a', 0.85 * fade)
    for (let i = 0; i < 4; i++) {
      const ry = -180 + seg(g, TITLES.razors + 0.3 + i * 0.16, TITLES.razors + 2.6 + i * 0.16) * 1350
      if (ry > 1160 || ry < -60) continue
      ART.razor(ctx, 320 + i * 400 + Math.sin(i * 2.1) * 60, ry, g * 1.8 + i * 1.4, 1.9, '#e8cf7e')
      if (ry > 700 && ry < 900) {
        ctx.globalAlpha = 0.5 * (1 - (ry - 700) / 200)
        ctx.fillStyle = '#ffe9ad'
        ctx.fillRect(0, ry - 2, W, 4)
        ctx.globalAlpha = 1
      }
    }
    // stubble field grows in fast (no dead-black gap), then the sweep
    const st = seg(g, TITLES.stubble - 0.5, TITLES.stubble)
    if (st > 0) {
      const sweepX = lerp(-160, 2080, seg(g, TITLES.stubble + 0.9, TITLES.stubble + 1.8))
      ctx.fillStyle = '#04050a'
      if (sweepX > -160) ctx.fillRect(0, 340, Math.min(W, sweepX), 400) // the shaved band
      for (const p of S.stubble) {
        if (p.x < sweepX) continue
        ctx.globalAlpha = st * p.a
        ctx.fillStyle = p.col
        ctx.fillRect(p.x, p.y, 3, 3)
      }
      ctx.globalAlpha = 1
      // the giant razor doing the shaving
      if (g > TITLES.stubble + 0.6 && g < TITLES.stubble + 1.9) {
        ART.razor(ctx, sweepX + 60, 540, Math.sin(t * 2) * 0.06, 5.2, '#e8cf7e')
        ctx.strokeStyle = 'rgba(255,233,173,0.5)'
        ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(sweepX, 342); ctx.lineTo(sweepX, 738); ctx.stroke()
      }
      if (g > TITLES.stubble + 0.9) {
        ctx.strokeStyle = 'rgba(201,164,74,0.4)'
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(0, 342); ctx.lineTo(Math.min(W, sweepX), 342); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, 738); ctx.lineTo(Math.min(W, sweepX), 738); ctx.stroke()
      }
    }
    return
  }
  // GOLDFLOW (slam handled on the overlay) → credits → parade → iris
  if (g < TITLES.iris + 1.2) {
    // the shaved band + stubble persist through the slam, then fade under the credits
    const stub = 1 - seg(g, TITLES.slam + 1.9, TITLES.slam + 2.9)
    if (stub > 0) {
      for (const p of S.stubble) {
        ctx.globalAlpha = stub * p.a
        ctx.fillStyle = p.col
        ctx.fillRect(p.x, p.y, 3, 3)
      }
      ctx.globalAlpha = stub
      ctx.fillStyle = '#04050a'
      ctx.fillRect(0, 340, W, 400) // the clean strip the razor left
      ctx.globalAlpha = stub * 0.4
      ctx.strokeStyle = '#c9a44a'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, 342); ctx.lineTo(W, 342); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, 738); ctx.lineTo(W, 738); ctx.stroke()
      ctx.globalAlpha = 1
    }
    if (g >= CREDITS[0][0] && g < TITLES.parade) {
      titleTableau(ctx, g, t)
    } else if (g >= TITLES.parade) {
      // the parade: heroes gold, the Cabald bronze — walk in, halt centre, iris catches them
      const pu = Math.min(1, seg(g, TITLES.parade, TITLES.parade + 2.6))
      const cast = [
        [S.heroGold, 2.7], [S.mataGold, 2.7],
        [S.villainBronze, 2.7], [S.henchBronze, 2.7], [S.guardBronze, 2.7],
      ]
      cast.forEach((c, i) => {
        const px = -240 + i * 210 + pu * 940
        if (px < -160 || px > 2060) return
        sprite(ctx, c[0], px, 900, { ...(pu < 1 ? run(px) : { lift: [1, 0], stride: [1, 0], lean: 0.02 }), sx: 2.4, sy: 2.4 })
      })
      ART.ribbon(ctx, t, 260, 4, 'rgba(201,164,74,0.35)', 0.5)
    }
    const ir = seg(g, TITLES.iris, TITLES.iris + 0.9)
    if (ir > 0) {
      const rad = Math.max(0.1, 860 * (1 - ir) ** 1.9)
      ctx.fillStyle = '#03040a'
      ctx.beginPath()
      ctx.rect(0, 0, W, H)
      ctx.moveTo(1020 + rad, 780)
      ctx.arc(1020, 780, rad, 0, 7, true)
      ctx.fill('evenodd')
    }
    return
  }
  ctx.fillStyle = '#03040a'
  ctx.fillRect(0, 0, W, H)
}
function titlesOverlay(ov, lt) {
  const g = lt
  if (g >= TITLES.slam - 0.05 && g < TITLES.iris + 0.4) {
    const pop = E.outBack(seg(g, TITLES.slam, TITLES.slam + 0.4))
    const k0 = pop < 1 ? lerp(2.6, 1, pop) : 1
    // after the shimmer, the title parks small at the top through the credits
    const park = seg(g, TITLES.slam + 0.8, TITLES.slam + 1.8)
    const k = lerp(k0, 0.42, park)
    const ty = lerp(500, 248, park)
    const bandX = lerp(-300, 2200, seg(g, TITLES.slam + 0.8, TITLES.slam + 2.6))
    const a = g > TITLES.iris ? 1 - seg(g, TITLES.iris, TITLES.iris + 0.4) : 1
    ov.globalAlpha = a * lerp(1, 0.85, park)
    ART.titleDraw(ov, 'GOLDFLOW', 960, ty, k, bandX)
    ov.globalAlpha = 1
  }
}

// ============================== S4 — BRIEFING ==============================
function drawBrief(ctx, lt, t, ov) {
  ctx.drawImage(S.brief, 0, 0)
  // the scalp survey on the wall screen
  ctx.drawImage(S.map, 566, 136)
  const p = seg(lt, 1.2, 3.4)
  if (p > 0) {
    flowArrow(ctx, 566 + 340, 136 + 420, 566 + 856, 136 + 132, p, {
      color: '#e8cf7e', width: 5, dashed: true, head: 22, bend: 0.25, glow: '#e8cf7e', glowBlur: 10,
    })
    if (p >= 1) {
      const ph = (lt * 0.8) % 1
      ctx.strokeStyle = `rgba(232,207,126,${0.8 * (1 - ph)})`
      ctx.lineWidth = 4
      ctx.beginPath(); ctx.ellipse(566 + 856, 136 + 132, 20 + ph * 70, 8 + ph * 26, 0, 0, 7); ctx.stroke()
    }
  }
  // scanline sheen over the screen
  ctx.globalAlpha = 0.05
  ctx.fillStyle = '#cfe0ff'
  ctx.fillRect(566, 136 + ((t * 90) % 548), 1228, 10)
  ctx.globalAlpha = 1
  // M at the plinth
  ctx.fillStyle = '#0c101a'
  ctx.fillRect(150, 560, 260, 240)
  ctx.fillStyle = '#161d2c'
  ctx.fillRect(150, 560, 260, 12)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(S.mHead, 158, 386)
  ctx.fillStyle = '#0a0e16'
  ctx.fillRect(190, 656, 180, 54)
  ctx.font = '600 40px "Cormorant Garamond"'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#e9d9a6'
  ctx.fillText('M', 280, 698)
  // the NO-HAIR dossier slides in
  const dsl = E.outCubic(seg(lt, 2.0, 2.6))
  if (dsl > 0) {
    const dx = lerp(2020, 1462, dsl)
    ctx.fillStyle = '#101624'
    ctx.fillRect(dx, 250, 320, 430)
    ctx.strokeStyle = '#2a3448'
    ctx.lineWidth = 4
    ctx.strokeRect(dx, 250, 320, 430)
    ctx.drawImage(S.origVillain, dx + 36, 286, 248, 248)
    ctx.fillStyle = '#8fa4bd'
    ctx.font = '500 22px "JetBrains Mono"'
    ctx.fillText('NO-HAIR, DR.', dx + 160, 570)
    ctx.fillText('THREAT: SHINY', dx + 160, 606)
    // hand-drawn rubber stamp (two lines, rotated)
    const sp = seg(lt, 3.0, 3.25)
    if (sp > 0) {
      ctx.save()
      ctx.translate(dx + 160, 430)
      ctx.rotate(-0.2)
      ctx.globalAlpha = 0.7 + 0.3 * sp
      ctx.strokeStyle = '#c0392b'
      ctx.lineWidth = 6
      ctx.strokeRect(-150, -52, 300, 104)
      ctx.fillStyle = '#c0392b'
      ctx.font = '700 46px "Cormorant Garamond"'
      ctx.fillText('BALD &', 0, -6)
      ctx.fillText('DANGEROUS', 0, 46)
      ctx.restore()
    }
  }
  // Q with the Combush
  if (lt > 4.2) {
    const qk = E.outCubic(seg(lt, 4.2, 4.7))
    ctx.globalAlpha = qk
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(S.qHead, 196, 690)
    ART.combush(ctx, 430, 760 + (1 - qk) * 40, 1.9, 80)
    ctx.globalAlpha = 1
  }
}

// ============================== S5 — BALD MOUNTAIN ==============================
function drawLair(ctx, lt, t, ov) {
  const { g, stop } = LAIR_CLOCK.warp(lt)
  ctx.drawImage(S.lair, 0, 0)
  // vat glow behind the walk, then the pool
  const vg = ctx.createRadialGradient(960, 900, 40, 960, 900, 640)
  vg.addColorStop(0, 'rgba(255,225,150,0.3)')
  vg.addColorStop(1, 'rgba(255,225,150,0)')
  ctx.fillStyle = vg
  ctx.fillRect(200, 420, 1520, 620)
  ART.vat(ctx, 960, 960, t, false)
  // guards
  if (g < LAIR_EV.rush) {
    sprite(ctx, S.g1, 700, 760, { sx: 2.2, sy: 2.2 })
    sprite(ctx, S.g2, 940, 760, { sx: 2.2, sy: 2.2 })
  } else if (g < LAIR_EV.hit1) {
    sprite(ctx, S.g1, lerp(700, 1130, seg(g, 4, LAIR_EV.hit1)), 760, { ...run(g * 260), sx: 2.2, sy: 2.2 })
    sprite(ctx, S.g2, lerp(940, 1290, seg(g, 4.4, LAIR_EV.hit2)), 760, { ...run(g * 240), sx: 2.2, sy: 2.2 })
  } else if (g < LAIR_EV.hit2 + 1.2) {
    const f1 = g - LAIR_EV.hit1
    sprite(ctx, S.g1, 1130 - 240 * f1, 760 - 320 * f1 + 420 * f1 * f1, { rot: -7 * f1, white: g < LAIR_EV.hit1 + 0.14, sx: 2.2, sy: 2.2 })
    if (g < LAIR_EV.hit2) sprite(ctx, S.g2, lerp(940, 1290, seg(g, 4.4, LAIR_EV.hit2)), 760, { ...run(g * 240), sx: 2.2, sy: 2.2 })
    else {
      const f2 = g - LAIR_EV.hit2
      sprite(ctx, S.g2, 1290 + 180 * f2, 760 - 300 * f2 + 400 * f2 * f2, { rot: 6 * f2, white: g < LAIR_EV.hit2 + 0.1, sx: 2.2, sy: 2.2 })
    }
    ART.burst(ctx, S.hit1Burst, t, 0.6, '#ffe9ad', 8, false)
  }
  // ODDFOB: enters after the guards fall, throws, bows to the hat, departs with dignity
  if (g >= LAIR_EV.oddfob && g < LAIR_EV.hatThrow) {
    sprite(ctx, S.hench, lerp(-180, 820, seg(g, LAIR_EV.oddfob, LAIR_EV.hatThrow - 0.4)), 760, { ...run(g * 300), sx: 2.6, sy: 2.6 })
  } else if (g < LAIR_EV.catch) {
    sprite(ctx, S.hench, 820, 760, { lift: [2, 0], stride: [1, 0], lean: -0.06, sx: 2.6, sy: 2.6 })
  } else if (g < 14.6) {
    const bow = Math.sin(seg(g, LAIR_EV.bow, LAIR_EV.bow + 0.8) * Math.PI) * 0.4
    const ox = lerp(820, -120, seg(g, 13.6, 14.6))
    sprite(ctx, S.hench, ox, 760, { lift: [1, 0], stride: [1, 0], lean: bow, sx: 2.6, sy: 2.6, flip: g >= 13.6 })
    ART.hatDisc(ctx, ox + (g >= 13.6 ? -60 : 60), 660 - bow * 60, -0.12, 0.62)
  }
  // the hat itself + the room's haircut
  const hat = hatPath(g)
  if (hat) {
    ART.hatDisc(ctx, hat.x, hat.y, hat.rot, 1.1)
    for (const cutX of [1110, 630]) {
      const kd = Math.max(0, 1 - Math.abs(hat.x - cutX) / 90)
      if (kd <= 0) continue
      ctx.strokeStyle = `rgba(255,233,173,${0.85 * kd})`
      ctx.lineWidth = 5
      ctx.beginPath(); ctx.moveTo(cutX - 14, 686); ctx.lineTo(cutX + 14, 686); ctx.stroke()
    }
  }
  if (g >= LAIR_EV.console) {
    ART.hatDisc(ctx, 566, 646, -0.35, 0.9) // lodged in the console
    ART.burst(ctx, S.consoleBurst, t, 1.1, '#ffd27a', 7, false)
  }
  // the duel
  const vlx = villainLairX(g)
  const lunge = Math.sin(seg(g, LAIR_EV.lunge1, LAIR_EV.lunge1 + 0.9) * Math.PI) * 0.3
  if (g < LAIR_EV.flip) {
    sprite(ctx, S.villain, vlx, 760, {
      lift: [1, 0], stride: [1, 0],
      lean: g > LAIR_EV.lunge2 ? -0.35 : lunge,
      sx: 2.7, sy: 2.7, glow: '#8a6d3f', glowA: 0.12,
    })
    if (g >= LAIR_EV.disarm && g < LAIR_EV.lunge2) {
      // his razor, knocked spinning into the deck
      const ru = seg(g, LAIR_EV.disarm, LAIR_EV.disarm + 0.7)
      if (ru < 1) ART.razor(ctx, lerp(vlx, 1090, ru), lerp(600, 748, ru), ru * 9, 0.7, '#cfd6e4')
      else ART.razor(ctx, 1090, 748, 0.9, 0.7, '#cfd6e4')
    }
  } else {
    // over the rail he goes, cards fluttering
    const fu = seg(g, LAIR_EV.flip, LAIR_EV.splash)
    if (fu < 1) {
      const fx = lerp(villainLairX(LAIR_EV.lunge2 + 0.8), 960, fu)
      const fy = 760 + 260 * fu * fu
      sprite(ctx, S.villain, fx, fy, { rot: fu * Math.PI * 1.1, upside: true, sx: 2.7, sy: 2.7 })
      for (let i = 0; i < 5; i++) {
        const ca = (g - LAIR_EV.flip) * 1.1
        if (ca <= 0) continue
        ART.playingCard(ctx, fx + 90 + hash(i * 31) * 160 - ca * (60 + hash(i) * 90), 560 - ca * 130 + 200 * ca * ca, ca * 5 + i, 1)
      }
    }
  }
  // splash + settle + the gilded rise
  if (g >= LAIR_EV.splash) {
    ART.burst(ctx, S.splashBurst, t, 1.9, '#ffe9ad', 20, true)
    ART.burst(ctx, S.ringBurst, t, 1.1, '#ffe9ad', 5, false)
    if (g >= LAIR_EV.rise && g < LAIR_EV.iris) {
      const ru = E.outCubic(seg(g, LAIR_EV.rise, LAIR_EV.rise + 1.6))
      const sy = lerp(1035, 840, ru)
      // dark offset copy behind gives the gold statue a readable edge
      sprite(ctx, { ...S.statue, c: S.statueOut }, 964, sy + 4, { lift: [2, 0], stride: [1, 0], lean: -0.12, sx: 2.9, sy: 2.9 })
      sprite(ctx, S.statue, 960, sy, { lift: [2, 0], stride: [1, 0], lean: -0.12, sx: 2.9, sy: 2.9, glow: '#ffe9ad', glowA: 0.6 })
      for (let i = 0; i < 6; i++) {
        const u2 = ((g - LAIR_EV.rise) * 0.5 + hash(i * 7)) % 1
        ctx.globalAlpha = (1 - u2) * 0.8
        ctx.fillStyle = '#ffe9ad'
        ctx.fillRect(960 + (hash(i * 3) - 0.5) * 130 * (1 + u2), 845 + u2 * 110, 4, 7)
      }
      ctx.globalAlpha = 1
      ART.starGlint(ov, 890, 590, 46, (t * 0.5 + 0.1) % 1)
      ART.starGlint(ov, 1040, 670, 34, (t * 0.43 + 0.6) % 1)
      ART.starGlint(ov, 985, 520, 26, (t * 0.37 + 0.3) % 1)
    }
  }
  // the cat, unbothered
  ART.cat(ctx, 500, 758, t)
  // our man
  const hx = heroLairX(g)
  const fighting = g >= LAIR_EV.rush && g < LAIR_EV.sweep
  sprite(ctx, S.hero, hx, 760, {
    ...(fighting ? { lift: [2, 0], stride: [2, -1], lean: 0.1 } : run(hx)),
    sx: 2.7, sy: 2.7, flip: true, glow: '#e8cf7e', glowA: stop ? 0.8 : 0.22,
    white: stop != null && g === LAIR_EV.clang && stop.sl < 0.06,
  })
  ART.burst(ctx, S.clangBurst, t, 0.9, '#fff6d8', 14, true)
  if (g >= LAIR_EV.disarm - 0.05 && g < LAIR_EV.disarm + 0.3) {
    ART.slash(ctx, 1080, 600, (g - LAIR_EV.disarm + 0.05) / 0.45)
  }
  if (g >= LAIR_EV.sweep - 0.1 && g < LAIR_EV.sweep + 0.5) {
    ART.slash(ctx, 1030, 580, (g - LAIR_EV.sweep + 0.1) / 0.5)
  }
  // hero pockets the prize on the way out
  if (g >= LAIR_EV.vial && g < LAIR_EV.iris) ART.vial(ctx, hx + 52, 640, 0.8, t, 0.7)
  // iris to the tag, centred on the statue's face
  const ir = seg(g, LAIR_EV.iris, LAIR_EV.iris + 1.0)
  if (ir > 0) {
    const rad = Math.max(0.1, 900 * (1 - ir) ** 1.9)
    ctx.fillStyle = '#03040a'
    ctx.beginPath()
    ctx.rect(0, 0, W, H)
    ctx.moveTo(960 + rad, 640)
    ctx.arc(960, 640, rad, 0, 7, true)
    ctx.fill('evenodd')
  }
}

// ============================== S6 — TAG ==============================
function drawTag(ctx, lt, t, ov) {
  ctx.fillStyle = '#060a14'
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  const push = 1 + 0.06 * seg(lt, 0, 8)
  ctx.translate(960, 540); ctx.scale(push, push); ctx.translate(-960, -540)
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#070c1a')
  sky.addColorStop(1, '#101a30')
  ctx.fillStyle = sky
  ctx.fillRect(-80, -60, 2080, 1200)
  ctx.fillStyle = '#d9dfec'
  ctx.beginPath(); ctx.arc(1560, 170, 40, 0, 7); ctx.fill()
  ctx.drawImage(S.cityMid, -140, 180)
  // bokeh city warmth
  for (let i = 0; i < 26; i++) {
    const bx = 120 + hash(i * 13 + 4) * 1680, by = 300 + hash(i * 29 + 8) * 420
    const r = 8 + hash(i * 7) * 18
    const bg = ctx.createRadialGradient(bx, by, 0, bx, by, r)
    bg.addColorStop(0, `rgba(255,196,120,${0.1 + 0.08 * Math.sin(t * 1.3 + i)})`)
    bg.addColorStop(1, 'rgba(255,196,120,0)')
    ctx.fillStyle = bg
    ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill()
  }
  // the rooftop
  ctx.fillStyle = '#0c1120'
  ctx.fillRect(-80, 858, 2080, 300)
  ctx.fillStyle = '#151d33'
  ctx.fillRect(-80, 858, 2080, 8)
  // the couple + the prize between them
  sprite(ctx, S.hero, 830, 858, { lift: [1, 0], stride: [1, 0], lean: 0.02, sx: 3, sy: 3, glow: '#e8cf7e', glowA: 0.16 })
  sprite(ctx, S.mata, 1110, 858, { lift: [1, 0], stride: [1, 0], lean: -0.02, sx: 3, sy: 3, flip: true })
  ART.vial(ctx, 975, 700, 1.0, t, 0.7)
  ART.starGlint(ov, 975, 700, 52, (t * 0.4) % 1)
  // the statue, repurposed
  sprite(ctx, S.statue, 1660, 858, { lift: [2, 0], stride: [1, 0], lean: -0.12, sx: 2.1, sy: 2.1, glow: '#ffe9ad', glowA: 0.3 })
  ART.umbrella(ctx, 1755, 800, 0.42, 0.8)
  // one gold hair, still waving
  ctx.strokeStyle = '#e8cf7e'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(1668, 600)
  ctx.quadraticCurveTo(1690 + Math.sin(t * 2.2) * 16, 560, 1712 + Math.sin(t * 2.2 + 0.6) * 20, 586)
  ctx.stroke()
  // M on the wire
  const talk = lt > 0.9 && lt < 3.6 ? 1 : 0
  ART.radio(ctx, 560, 560, t, talk)
  ctx.restore()
  // fade out (the shot runs 82–90; fade spans the last second)
  const fd = seg(lt, 7.0, 7.95)
  if (fd > 0) {
    ctx.fillStyle = `rgba(3,4,10,${fd})`
    ctx.fillRect(0, 0, W, H)
  }
}

// ============================== the film ==============================
export default {
  title: 'GOLDFLOW',
  output: 'goldflow.mp4',
  duration: DURATION,
  async prepare() {
    S.hero = await A.loadRemy(CAST.hero, false)
    S.villain = await A.loadRemy(CAST.villain, false)
    S.hench = await A.loadRemy(CAST.hench, false)
    S.g1 = await A.loadRemy(CAST.g1, false)
    S.g2 = await A.loadRemy(CAST.g2, false)
    S.mata = await A.loadRemy(CAST.mata, false)
    S.heroGold = { ...S.hero, c: ART.silhouette(S.hero, '#e8cf7e') }
    S.heroGoldOut = ART.silhouette(S.hero, '#0c0a08')
    S.heroDark = { ...S.hero, c: ART.silhouette(S.hero, '#06070c') }
    S.villainBronze = { ...S.villain, c: ART.silhouette(S.villain, '#8a6d3f') }
    S.henchBronze = { ...S.hench, c: ART.silhouette(S.hench, '#8a6d3f') }
    S.guardBronze = { ...S.g1, c: ART.silhouette(S.g1, '#8a6d3f') }
    S.guardDark = { ...S.g1, c: ART.silhouette(S.g1, '#101822') }
    S.mataGold = { ...S.mata, c: ART.silhouette(S.mata, '#e9d9a6') }
    S.statue = { ...S.villain, c: ART.gild(S.villain) }
    S.statueOut = ART.silhouette(S.villain, '#241a08')
    const heads = await A.loadHeads()
    S.moon159 = ART.goldHead(heads, CAST.villain, 26, '#c9a44a')
    S.mHead = ART.goldHead(heads, CAST.m, 9, null)
    S.qHead = ART.goldHead(heads, CAST.q, 7, null)
    S.origVillain = await ART.loadOrig(CAST.villain)
    S.cityFar = ART.cityBake(11, 2080, 320, '#0a0f1c', 'rgba(233,217,166,0.75)', 0.05, 250)
    S.cityMid = ART.cityBake(29, 2200, 380, '#0d1526', 'rgba(214,226,244,0.6)', 0.09, 380)
    S.tower = ART.towerBake()
    S.vault = ART.vaultBake()
    S.lair = ART.lairBake()
    S.brief = ART.briefBake()
    S.map = ART.mapBake()
    // climb distance table: 300 px/s, pausing half a second under each beam
    S.climb = [0]
    for (let i = 1; i <= 500; i++) {
      const g = TOWER_EV.climbStart + i * 0.01
      const paused = BEAMS.some((b) => Math.abs(g - b) < 0.5)
      S.climb.push(S.climb[i - 1] + (paused ? 0 : 3))
    }
    // stubble field for the shaved title band (taller than the band, so the strip reads)
    S.stubble = []
    for (let i = 0; i < 900; i++) {
      S.stubble.push({ x: Math.floor(hash(i * 3 + 17) * W), y: 205 + Math.floor(hash(i * 11 + 5) * 670), a: 0.5 + hash(i * 7) * 0.6, col: hash(i * 5) > 0.5 ? '#5a4f3c' : '#4a4030' })
    }
    // particle events (immutable; drawn by age)
    S.grabBurst = [{ t: TOWER_CLOCK.abs(TOWER_EV.grab), x: 960, y: 690, seed: 12 }]
    S.plumeBurst = [{ t: TOWER_CLOCK.abs(TOWER_EV.plume), x: 940, y: 430, seed: 34 }]
    S.hit1Burst = [{ t: LAIR_CLOCK.abs(LAIR_EV.hit1), x: 1140, y: 640, seed: 56 }]
    S.clangBurst = [{ t: LAIR_CLOCK.abs(LAIR_EV.clang), x: 1290, y: 480, seed: 78 }]
    S.consoleBurst = [{ t: LAIR_CLOCK.abs(LAIR_EV.console), x: 566, y: 646, seed: 91 }]
    S.splashBurst = [{ t: LAIR_CLOCK.abs(LAIR_EV.splash), x: 960, y: 900, seed: 123 }]
    S.ringBurst = [{ t: LAIR_CLOCK.abs(LAIR_EV.splash) + 0.05, x: 960, y: 940, seed: 144 }]
  },
  shots: [
    {
      name: 'barrel', t0: T.barrel, t1: T.tower,
      draw(ctx, lt, dur, t, ov) { drawBarrel(ctx, lt, t, ov) },
      fx: () => ({ letterbox: 0.8, bloom: 0.12, bloomThresh: 0.9, vignette: 0.55, grain: 0.012 }),
    },
    {
      name: 'tower', t0: T.tower, t1: T.titles,
      draw(ctx, lt, dur, t, ov) { drawTower(ctx, lt, t, ov) },
      fx: () => ({ letterbox: 0.8, bloom: 0.13, bloomThresh: 0.9, vignette: 0.5, grain: 0.013 }),
    },
    {
      name: 'titles', t0: T.titles, t1: T.brief,
      draw(ctx, lt, dur, t, ov) { drawTitles(ctx, lt, t, ov); titlesOverlay(ov, lt) },
      fx: () => ({ letterbox: 0.8, bloom: 0.16, bloomThresh: 0.88, vignette: 0.45, grain: 0.01 }),
    },
    {
      name: 'brief', t0: T.brief, t1: T.lair,
      draw(ctx, lt, dur, t, ov) { drawBrief(ctx, lt, t, ov) },
      fx: () => ({ letterbox: 0.8, bloom: 0.1, bloomThresh: 0.9, vignette: 0.45, grain: 0.012 }),
    },
    {
      name: 'lair', t0: T.lair, t1: T.tag,
      draw(ctx, lt, dur, t, ov) { drawLair(ctx, lt, t, ov) },
      fx: () => ({ letterbox: 0.8, bloom: 0.14, bloomThresh: 0.9, vignette: 0.5, grain: 0.013 }),
    },
    {
      name: 'tag', t0: T.tag, t1: DURATION,
      draw(ctx, lt, dur, t, ov) { drawTag(ctx, lt, t, ov) },
      fx: () => ({ letterbox: 0.8, bloom: 0.11, bloomThresh: 0.9, vignette: 0.45, grain: 0.011 }),
    },
  ],
  captions: [
    { text: 'CABALD TOWER — 03:00', t0: 6.6, t1: 10.4, style: 'date' },
    { text: 'SHAVEN. NOT STIRRED.', t0: 32.4, t1: 35.8, style: 'tagline' },
    { text: 'AGENT 42', t0: 33.2, t1: 36.2, style: 'credit' },
    { text: 'MATA HAIRY', t0: 36.3, t1: 39.3, style: 'credit' },
    { text: 'ODDFOB', t0: 39.4, t1: 42.4, style: 'credit' },
    { text: 'and  DR. NO-HAIR', t0: 42.5, t1: 45.9, style: 'credit' },
    { text: '‘THE MAN WITH THE GOLDEN FLOW’ — SHIRLEY HAIRSAY', t0: 42.6, t1: 46.6, style: 'songC' },
    { text: 'The Razormoon waxes tonight, 42. Shave us some time.', t0: 49.0, t1: 52.6, style: 'dlg' },
    { text: 'Combush. Eighty charge shots — mind the tines.', t0: 52.9, t1: 55.9, style: 'dlg' },
    { text: 'You’re too late, Forty-Two. The world will shine by morning.', t0: 57.4, t1: 60.8, style: 'dlg' },
    { text: 'Nice hat.', t0: 66.6, t1: 69.6, style: 'quip', minHold: 2.2 },
    { text: 'No, Mr. Forty-Two — I expect you to MOISTURISE.', t0: 72.4, t1: 75.4, style: 'taunt' },
    { text: 'Twenty-four carat.', t0: 79.0, t1: 82.0, style: 'quip' },
    { text: 'Then hang up. You’re on a date.', t0: 82.9, t1: 85.7, style: 'quip', minHold: 2.2 },
    { text: 'REMY BOYS WILL RETURN IN\nFROM BALDIA WITH LOVE', t0: 85.5, t1: 88.8, style: 'endT' },
    { text: 'NO STATUES WERE HARMED. ONE WAS MOISTURISED.', t0: 88.3, t1: 89.95, style: 'slate', minHold: 1.0 },
  ],
  captionStyles: {
    date: {
      font: F.serif, weight: '500', size: 27, color: '#9aa8c0', align: 'center',
      x: 960, y: 208, track: 5, anim: 'fade', in: 0.5, out: 0.5, shadow: '#05060a',
    },
    tagline: {
      font: F.serif, weight: 'italic 600', size: 30, color: '#e9d9a6', align: 'center',
      x: 960, y: 648, track: 9, anim: 'fade', in: 0.4, out: 0.4, shadow: '#05060a', glow: '#8a6d3f', glowBlur: 10,
    },
    credit: {
      font: F.serif, weight: 'italic 600', size: 46, color: '#e9d9a6', align: 'center',
      x: 960, y: 918, track: 8, anim: 'rise', in: 0.35, out: 0.35, shadow: '#05060a', glow: '#8a6d3f', glowBlur: 10,
    },
    songC: {
      font: F.serif, weight: 'italic 500', size: 24, color: '#b7ab8e', align: 'center',
      x: 960, y: 400, track: 3, anim: 'fade', in: 0.4, out: 0.4, shadow: '#05060a',
    },
    dlg: {
      font: F.serif, weight: 'italic 600', size: 37, color: '#f0e9d4', align: 'center',
      x: 960, y: 878, lineHeight: 1.2, track: 0.5, anim: 'fade', in: 0.25, out: 0.25,
      shadow: '#0a0c10', glow: '#0a0c10', glowBlur: 14,
    },
    quip: {
      font: F.serif, weight: 'italic 600', size: 37, color: '#ffe9ad', align: 'center',
      x: 960, y: 878, track: 0.5, anim: 'fade', in: 0.25, out: 0.25,
      shadow: '#0a0c10', glow: '#0a0c10', glowBlur: 14,
    },
    taunt: {
      font: F.serif, weight: 'italic 600', size: 37, color: '#f0e9d4', align: 'center',
      x: 960, y: 700, track: 0.5, anim: 'fade', in: 0.25, out: 0.25,
      shadow: '#0a0c10', glow: '#0a0c10', glowBlur: 14,
    },
    endT: {
      font: F.serif, weight: '600', size: 46, color: '#e9d9a6', align: 'center',
      x: 960, y: 560, lineHeight: 1.35, track: 6, anim: 'fade', in: 0.5, out: 0.4,
      glow: '#8a6d3f', glowBlur: 16, shadow: '#05060a',
    },
    slate: {
      font: F.mono, size: 21, color: '#8f8672', align: 'center',
      x: 960, y: 906, track: 2, anim: 'fade', in: 0.25, out: 0.25, shadow: '#05060a',
    },
  },
  flashes: FLASHES,
  score,
  audio: { seed: 426, reverb: 2.6, reverbGain: 0.32 },
  lint: { captionHold: 2.2, safe: { margin: 0.05, letterbox: true } },
}
