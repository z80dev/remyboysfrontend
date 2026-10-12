// REMY BOYS — "HAIR WE GO" · official music video · 64 s · 1920×1080 @60.
// Five flow heroes (42/30/46/1000/4) headline the Floor Arena; the Cabald
// (1217 "The Baron" + 5/23/225) storm the bridge with a giant razor and get
// sliced/converted. Pixel stage 960×540 → 2× nearest, beat-cut MV cameras,
// wind-machine streamers, confetti/pyro, one hit-stop at the slice (g 43.5).
// Cast QA'd on contact sheets: 30 and 4 clean (4 replaced 2084 whose harpoon
// prop read as an artifact), 225 no eye-acting, portraits cropped per art.PCROP.
import { W, H, E, seg, lerp, clamp, hash, txt, measure, F } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'
import * as TL from './timeline.js'
import * as ART from './art.js'
import score from './score.js'

let S = null

export default {
  title: 'REMY BOYS — HAIR WE GO (official music video)',
  output: 'hair-we-go.mp4',
  duration: TL.DUR,
  grid: { bar: 0.5 }, // MV cut grid: every 0.5 s (two beats at 120 BPM)
  lint: { captionHold: 2.2, safe: { margin: 0.05 } },
  audio: { seed: 42, reverb: 2.2, reverbGain: 0.3 },
  fonts: [{ family: 'Press Start 2P', url: new URL('../../node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2', import.meta.url).href }],

  async prepare() {
    S = await ART.load(TL)
    ART.setDrizzle(S.drizzle)
  },

  shots: [
    { name: 'intro', t0: 0, t1: 4, draw, fx: fxShot('intro') },
    { name: 'verse', t0: 4, t1: 12, draw, fx: fxShot('verse') },
    { name: 'verse2', t0: 12, t1: 20, draw, fx: fxShot('verse2') },
    { name: 'chorus', t0: 20, t1: 28, draw, fx: fxShot('chorus') },
    { name: 'chorus2', t0: 28, t1: 36, draw, fx: fxShot('chorus') },
    { name: 'bridge', t0: 36, t1: 44, draw, fx: fxShot('bridge') },
    { name: 'drop', t0: 44, t1: 52, draw, fx: fxShot('drop') },
    { name: 'finale', t0: 52, t1: 62, draw, fx: fxShot('drop') },
    { name: 'outro', t0: 62, t1: 64, draw, fx: fxShot('outro') },
  ],

  captions: [
    { id: 'pres', style: 'pres', text: 'REMY BOYS · OFFICIAL MUSIC VIDEO', t0: 0.3, t1: 3.6 },
    { id: 'song', style: 'song', text: 'HAIR WE GO', t0: 0.6, t1: 3.9 },
    { id: 'l1', style: 'lyr', text: 'HAIR WE GO, HAIR WE GO', t0: 20.5, t1: 23.9 },
    { id: 'l2', style: 'lyr', text: 'GROW IT LOUD, LET IT SHOW', t0: 24.1, t1: 27.5 },
    { id: 'l3', style: 'lyr', text: 'OH-OH-OH · HAIR WE GO', t0: 28.1, t1: 31.5 },
    { id: 'l4', style: 'lyr', text: 'BRINGING FLOW WHEREVER WE GO', t0: 31.7, t1: 35.1 },
    { id: 'bad', style: 'kbad', text: 'THE CABALD STRIKE BACK', t0: 36.8, t1: 39.9 },
    { id: 'l5', style: 'lyr', text: 'NEVER BRING A RAZOR TO A FLOW FIGHT', t0: 44.5, t1: 47.9 },
    { id: 'l6', style: 'lyr', text: 'EVEN THE BALD NOW KNOW', t0: 52.4, t1: 55.8 },
    { id: 'l7', style: 'lyr', text: 'OH-OH-OH · HAIR WE GO', t0: 56.3, t1: 59.7 },
  ],
  captionStyles: {
    pres: { font: F.mono, size: 27, weight: 700, track: 7, color: 'rgba(255,255,255,0.75)', y: 832, anim: 'fade', in: 0.5, out: 0.4 },
    song: { font: F.anton, size: 108, weight: '', color: '#ffd76e', y: 964, track: 4, glow: '#ffb42e', glowBlur: 26, anim: 'rise', in: 0.5, out: 0.4 },
    lyr: { font: F.grot, size: 58, weight: 700, color: '#ffffff', y: 978, shadow: '#000000', glow: '#000000', glowBlur: 12, anim: 'rise', in: 0.5, out: 0.3 },
    kbad: { font: F.grot, size: 46, weight: 700, track: 8, color: '#cdb9ff', y: 968, glow: '#2a1b4a', glowBlur: 16, anim: 'fade', in: 0.5, out: 0.4 },
  },

  flashes: [
    [20, 0.22, 0.12], [43.5, 0.22, 0.06], [44.12, 0.24, 0.1],
    [52.12, 0.12, 0.09], [60.12, 0.1, 0.08], [61.5, 0.15, 0.1],
  ],

  score,
}

// ---------------------------------------------------------------------------
function fxShot(name) {
  return (lt, t) => {
    const w = TL.warp(t)
    let o
    if (name === 'intro') o = { bloom: 0.1, bloomThresh: 0.8, vignette: 0.95, grain: 0.008, exposure: lerp(-0.85, 0, E.outCubic(seg(t, 0.05, 1.5))) }
    else if (name === 'verse') o = { bloom: 0.13, bloomThresh: 0.82, sat: 1.06, streak: 0.04, vignette: 0.9, grain: 0.008, warm: 0.02 }
    else if (name === 'verse2') o = { bloom: 0.14, bloomThresh: 0.82, sat: 1.07, streak: 0.05, rays: 0.06, lightX: 0.5, lightY: 0.04, vignette: 0.88, grain: 0.008, warm: 0.02 }
    else if (name === 'chorus') o = { bloom: 0.17, bloomThresh: 0.8, sat: 1.1, streak: 0.07, rays: 0.12, lightX: 0.5, lightY: 0.05, vignette: 0.85, grain: 0.009, warm: 0.03 }
    else if (name === 'bridge') o = { bloom: 0.09, sat: 0.8, tint: [0.88, 0.84, 1.08], vignette: 1.12, grain: 0.01, streak: 0.02 }
    else if (name === 'outro') o = { bloom: 0.12, sat: 1.05, vignette: 0.9, grain: 0.008, fade: seg(t, 63.3, 64) }
    else o = { bloom: 0.16, bloomThresh: 0.8, sat: 1.12, streak: 0.09, rays: 0.16, lightX: 0.5, lightY: 0.04, vignette: 0.8, warm: 0.05, grain: 0.008 }
    if (w.stop) { o.aber = 0.0018 }
    return o
  }
}

// ---- camera ---------------------------------------------------------------
const SHAKES = [[20, 9, 0.5], [43.5, 15, 0.45], [44.12, 11, 0.4], [52.12, 5, 0.3]]

function camera(t) {
  let i = 0
  while (i < TL.CUTS.length - 1 && TL.CUTS[i + 1].t <= t) i++
  const cut = TL.CUTS[i]
  const cam = TL.CAM[cut.cam]
  const nextT = i + 1 < TL.CUTS.length ? TL.CUTS[i + 1].t : TL.DUR
  const u = seg(t, cut.t, nextT)
  let cx = cam.x ?? 480, cy = cam.y ?? 306, cz = cam.z ?? 1.05
  if (cam.push) cz *= 1 + cam.push * u
  if (cam.drift) { cx += (u - 0.5) * cam.drift; cy += (u - 0.5) * cam.drift * 0.4 }
  if (!cam.pov) { // handheld micro-sway
    cx += Math.sin(t * 0.9 + i * 1.7) * 2.2
    cy += Math.cos(t * 0.7 + i * 2.3) * 1.6
  }
  let dx = 0, dy = 0
  for (const [t0, amp, dur] of SHAKES) {
    const dt = t - t0
    if (dt > 0 && dt < dur) {
      const a = amp * Math.exp(-dt * 10)
      dx += (hash(Math.floor(t * 240) * 2 + 1) - 0.5) * 2 * a
      dy += (hash(Math.floor(t * 240) * 2 + 7) - 0.5) * 2 * a
    }
  }
  return { cam, cx, cy, cz, dx, dy }
}

// ---- band choreography (pure in world time g) ------------------------------
const INWARD_FLIP = [false, false, false, true, true] // default facing is right
const BRIDGE_HOLD = [null, { x: 640 }, { x: 560 }, { x: 724 }, { x: 800 }]

function bandPose(i, g, w) {
  const base = TL.FORMATION[i]
  let x = base.x, fy = base.fy + 0
  let flip = INWARD_FLIP[i], lean = 0, rot = 0, stride = [0, 0], lift = [0, 0], sy = 1
  const beat = g * 2
  const alt = i % 2 === 0 ? 1 : -1
  if (g < 4) { // intro: dim idle sway
    lean = Math.sin(g * 0.9 + i * 1.3) * 0.02
    fy -= Math.abs(Math.sin(beat * Math.PI + i * 0.7)) * 1.2
  } else if (g < 36) {
    if (g < 20) { // verse step-touch, unison turn every 8 s
      const sway = Math.sin(Math.PI * beat)
      const turn = Math.floor(g / 8) % 2 === 1
      flip = turn ? !INWARD_FLIP[i] : INWARD_FLIP[i]
      lean = sway * 0.05 * alt
      stride = [sway * 4.5, -sway * 4.5]
      lift = [Math.max(0, sway) * 2.5, Math.max(0, -sway) * 2.5]
      fy -= Math.abs(Math.sin(beat * Math.PI)) * 3.2
    } else { // chorus jumps: airborne over the first beat of each bar
      const u = g % 2
      if (u < 1) {
        const air = Math.sin(Math.PI * u)
        fy -= 44 * air
        stride = [5 * alt, -5 * alt]
        lean = 0.06 * alt * air
        sy = 1 + 0.05 * Math.cos(Math.PI * u * 2) * air
      } else {
        fy -= Math.abs(Math.sin((u - 1) * Math.PI * 2)) * 3.4
        lean = Math.sin((u - 1) * Math.PI * 2) * 0.04 * alt
        stride = [Math.sin((u - 1) * Math.PI * 2) * 4, -Math.sin((u - 1) * Math.PI * 2) * 4]
      }
    }
  } else if (g < 45.6) { // bridge: regroup right, crimson handles it
    const tgt = BRIDGE_HOLD[i]
    if (tgt) {
      const u = E.outCubic(seg(g, 35.8, 37.2))
      x = lerp(base.x, tgt.x, u)
      if (g > 44.5) { // slide back after the drop
        const v = E.outCubic(seg(g, 44.5, 45.6))
        x = lerp(tgt.x, base.x, v)
      }
      const sway = Math.sin(Math.PI * beat + i)
      lean = sway * 0.03
      fy -= Math.abs(Math.sin(beat * Math.PI)) * 1.6
      stride = [sway * 2, -sway * 2]
    } else { // crimson confronts
      flip = true
      x = 480
      if (g >= 42.9) x = lerp(480, 408, E.outCubic(seg(g, 42.9, 43.3)))
      if (g >= 43.3 && g < 43.66) { lean = 0.3 * seg(g, 43.3, 43.5); rot = -0.1 * seg(g, 43.3, 43.5); stride = [7, -3] }
      else if (g >= 43.66) { const v = seg(g, 43.66, 44.3); lean = lerp(0.3, 0.04, v); rot = lerp(-0.1, 0, v) }
      if (g >= 44.3) x = lerp(408, 480, E.outCubic(seg(g, 44.3, 45.2)))
      if (g >= 44.4) flip = false
      fy -= Math.abs(Math.sin(beat * Math.PI)) * 1.6
    }
  } else { // finale: bigger jumps
    const u = g % 2
    if (u < 1) {
      const air = Math.sin(Math.PI * u)
      fy -= 58 * air
      stride = [6 * alt, -6 * alt]
      lean = 0.08 * alt * air
      sy = 1 + 0.06 * Math.cos(Math.PI * u * 2) * air
    } else {
      fy -= Math.abs(Math.sin((u - 1) * Math.PI * 2)) * 4
      lean = Math.sin((u - 1) * Math.PI * 2) * 0.05 * alt
    }
  }
  return { x, fy, flip, lean, rot, stride, lift, sy }
}

// ---- Cabald choreography ---------------------------------------------------
function baronPose(g) {
  if (g < 35.5) return null
  let x, fy = 448, flip = false, lean = 0, rot = 0, lift = [0, 0]
  if (g < 42) {
    const u = E.inQuad(seg(g, 36, 42))
    x = lerp(-90, 390, u) + 66 // leads just ahead of the carried ram
    const st = Math.floor(g * 4)
    lift = [st % 2 ? 4 : 0, st % 2 ? 0 : 4]
    fy -= Math.abs(Math.sin(g * Math.PI * 2)) * 2.5
    lean = 0.04
  } else if (g < 43.66) {
    x = lerp(456, 390, E.outCubic(seg(g, 42, 42.4))) // step back to the razor
    lean = g > 43.1 ? 0.1 : 0.03
    fy -= 1
  } else {
    const knock = 46 * E.outCubic(seg(g, 43.66, 44.15))
    const ret = E.inOutCubic(seg(g, 44.15, 46.4))
    x = 390 + knock + (880 - 436) * ret
    fy = lerp(fy, 408, ret)
    if (g > 47.2) { // converted headbang
      rot = Math.sin(g * Math.PI * 2) * 0.24
      lean = Math.sin(g * Math.PI * 2 + 1) * 0.07
      fy -= Math.abs(Math.sin(g * Math.PI * 2)) * 3
    } else { rot = Math.sin(seg(g, 43.66, 44.4) * Math.PI * 3) * 0.18 * (1 - seg(g, 43.66, 44.4)) }
  }
  return { x, fy, flip, lean, rot, lift }
}

function goonPose(k, g) {
  if (g < 35.5) return null
  const bx = 390
  let x, fy = 442 + k * 5, flip = false, lean = 0, rot = 0, lift = [0, 0]
  const spot = [70, 800, 150][k] // converted dancer spots: clear of the band's slots
  const spotFy = [396, 394, 392][k]
  if (g < 42) {
    const u = E.inQuad(seg(g, 36, 42))
    x = lerp(-90 + (k - 1) * 64, bx + (k - 1) * 56, u)
    const st = Math.floor(g * 4 + k)
    lift = [st % 2 ? 3 : 0, st % 2 ? 0 : 3]
    fy -= Math.abs(Math.sin(g * Math.PI * 2 + k)) * 2
    lean = 0.03 * (k - 1)
  } else if (g < 43.66) {
    x = bx + (k - 1) * 56
    lean = 0.08
  } else {
    const knock = 34 * E.outCubic(seg(g, 43.66, 44.15))
    const ret = E.inOutCubic(seg(g, 44.15, 46.4))
    const fromX = bx + (k - 1) * 56 + 34
    x = bx + (k - 1) * 56 + knock + (spot - fromX) * ret
    fy = lerp(fy, spotFy, ret)
    if (g > 47.2 + k * 0.2) {
      rot = Math.sin(g * Math.PI * 2 + k) * 0.26
      fy -= Math.abs(Math.sin(g * Math.PI * 2 + k)) * 3
    }
  }
  return { x, fy, flip, lean, rot, lift }
}

// razor position + split state: carried at chest height between the two lead
// goons on the march, lifted overhead by the Baron for the strike, then split.
const SLICE_PT = { x: 428, y: 306 }
function razorPose(g) {
  if (g < 36.6) return null
  if (g < 42) { // carried at chest height between the flanking goons
    const u = E.inQuad(seg(g, 36, 42))
    return { x: lerp(-90, 390, u), y: 334, rot: -0.05, split: 0, alpha: 1 }
  }
  if (g < 43.1) { const u = E.outBack(seg(g, 42, 42.9)); return { x: 394, y: lerp(334, 240, u), rot: lerp(-0.05, -0.08, seg(g, 42, 43.1)), split: 0, alpha: 1 } }
  if (g < 43.5) { const u = seg(g, 43.1, 43.5); return { x: lerp(394, SLICE_PT.x, u), y: lerp(240, SLICE_PT.y - 22, u), rot: lerp(-0.08, 0.1, u), split: 0, alpha: 1 } }
  if (g < 43.66) return { ...SLICE_PT, y: SLICE_PT.y - 22, rot: 0.1, split: 0, alpha: 1 }
  const u = seg(g, 43.66, 44.6)
  return { x: SLICE_PT.x, y: SLICE_PT.y - 22, rot: 0.1, split: E.outCubic(u), alpha: 1 - seg(g, 46.8, 47.8) }
}

// ---- lighting ---------------------------------------------------------------
const CYCLE = ['#ffd76e', '#ff7d9c', '#8fe8dc', '#b7a4ff']
function beamColors(g) {
  if (g < 2) return null
  if (g < 20) return ['#ffd76e', '#ffca5e', '#ffe4a0', '#ffca5e', '#ffd76e']
  if (g < 36) { const b = Math.floor(g / 2) % 4; return Array.from({ length: 5 }, (_, i) => CYCLE[(b + i) % 4]) }
  if (g < 44) return ['#8b6bd9', '#6a48d8', '#8b6bd9', '#5a3fb8', '#8b6bd9']
  return ['#ffd76e', '#ffe4a0', '#ffca5e', '#ffe4a0', '#ffd76e']
}
function beamAlpha(g, t) {
  if (g < 2) return 0
  if (g < 36) return 0.13 + 0.09 * Math.abs(Math.sin(g * Math.PI * 2 / 2))
  if (g < 42) return 0.06
  if (g < 44) return 0.05 + 0.06 * Math.abs(Math.sin(t * 9)) // red alert (real time)
  return 0.12 + 0.08 * Math.abs(Math.sin(g * Math.PI * 2 / 2))
}

// ---- master draw -------------------------------------------------------------
function draw(ctx, lt, dur, t, overlay) {
  const w = TL.warp(t)
  const g = w.g
  const x = S.x
  const cam = camera(t)

  if (cam.cam.pov) drawAudiencePOV(x, g, t)
  else drawStage(x, g, t, w)

  // blit through camera (nearest)
  const sw = clamp(ART.VW / cam.cz, 100, ART.LW)
  const sh = clamp(ART.VH / cam.cz, 100, ART.LH)
  let sx = clamp(ART.VX + cam.cx - sw / 2, 0, ART.LW - sw)
  let sy = clamp(ART.VY + cam.cy - sh / 2, 0, ART.LH - sh)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(S.low, Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh), Math.round(cam.dx), Math.round(cam.dy), W, H)

  drawOverlay(overlay, t, cam)
}

function drawStage(x, g, t, w) {
  x.fillStyle = '#050509'
  x.fillRect(0, 0, ART.LW, ART.LH)
  x.drawImage(S.back, 0, 0)
  const beat = g * 2
  const power = t > 0.1 ? 1 : 0
  const bridgeDim = g >= 36 && g < 44 ? 1 : 0
  ART.neon(x, t, power, bridgeDim)

  const cols = beamColors(g)
  const poses = TL.BAND.map((_, i) => bandPose(i, g, w))
  const ba = beamAlpha(g, t)

  // floor pools + skirt lights (behind actors)
  if (cols) {
    for (let i = 0; i < poses.length; i++) {
      const on = g > 2.15 + i * 0.18 ? 1 : 0.35
      ART.floorPool(x, ART.VX + poses[i].x, ART.VY + poses[i].fy + 6, 64, cols[i], 0.16 * ba * 12 * on)
    }
    if (g >= 36 && g < 44) ART.floorPool(x, ART.VX + 390, ART.VY + 452, 84, '#8b6bd9', 0.9)
  }
  const skirtA = 0.25 + 0.35 * Math.abs(Math.sin(beat * Math.PI))
  x.fillStyle = `rgba(255,214,120,${skirtA * (g >= 36 && g < 44 ? 0.35 : 1)})`
  for (let px = 44; px < ART.LW; px += 88) x.fillRect(px, 518, 4, 3)

  // lasers behind the band (chorus + finale)
  if ((g >= 20 && g < 36) || g >= 44) {
    x.globalCompositeOperation = 'lighter'
    for (let k = 0; k < 8; k++) {
      const a0 = -Math.PI / 2 + (k - 3.5) * 0.22 + Math.sin(g * 0.35 + k * 1.3) * 0.3
      const len = 520
      const lx = 528 + Math.cos(a0) * len, ly = 88 + Math.sin(a0) * len
      const gr = x.createLinearGradient(528, 88, lx, ly)
      const c = CYCLE[k % 4]
      gr.addColorStop(0, c)
      gr.addColorStop(1, 'rgba(0,0,0,0)')
      x.globalAlpha = 0.05 + 0.03 * Math.abs(Math.sin(beat * Math.PI + k))
      x.strokeStyle = gr
      x.lineWidth = 3
      x.beginPath(), x.moveTo(528, 88), x.lineTo(lx, ly), x.stroke()
    }
    x.globalAlpha = 1
    x.globalCompositeOperation = 'source-over'
  }

  // actors sorted upstage→downstage
  const actors = []
  const bp = baronPose(g)
  if (bp) {
    const sc = g > 46.4 ? 1.16 : 1.5
    actors.push({ fy: bp.fy, fn: () => A.drawRemy(x, S.baron, ART.VX + bp.x, ART.VY + bp.fy, { flip: bp.flip, lean: bp.lean, rot: bp.rot, lift: bp.lift, sx: sc, sy: sc, white: w.stop != null && w.sl < 0.07 }) })
  }
  for (let k = 0; k < S.goons.length; k++) {
    const gp = goonPose(k, g)
    if (!gp) continue
    const sc = g > 46.4 ? 1.1 - k * 0.03 : 1.5 - k * 0.06
    actors.push({ fy: gp.fy, fn: () => A.drawRemy(x, S.goons[k], ART.VX + gp.x, ART.VY + gp.fy, { flip: gp.flip, lean: gp.lean, rot: gp.rot, lift: gp.lift, sx: sc, sy: sc }) })
  }
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i]
    const glowOn = (g >= 20 && g < 36) || g >= 44
    actors.push({
      fy: p.fy,
      fn: () => {
        A.drawRemy(x, S.band[i], ART.VX + p.x, ART.VY + p.fy, {
          flip: p.flip, lean: p.lean, rot: p.rot, lift: p.lift, stride: p.stride,
          sx: 1.55, sy: 1.55 * p.sy,
          glow: glowOn ? TL.BAND[i].hair : null, glowA: glowOn ? 0.22 : 0,
        })
        const wind = TL.wind(g)
        if (wind > 0.02) {
          ART.paintStreamers(x, ART.VX + p.x + (p.flip ? -4 : 4), ART.VY + p.fy - 158, TL.BAND[i].hair, wind, g, 11 + i, g >= 44)
        }
      },
    })
  }
  actors.sort((a, b) => a.fy - b.fy)
  for (const a of actors) a.fn()
  const rz = razorPose(g)

  // razor + slash + sparks
  if (rz) drawRazor(x, rz)
  if (g >= 43.26 && g < 43.7) drawSlashArc(x, g)
  if (g >= 43.5) ART.paintSparks(x, g, TL.SLICE, ART.VX + SLICE_PT.x, ART.VY + SLICE_PT.y, S.sparkBits)

  // beams over everyone
  if (cols) {
    for (let i = 0; i < poses.length; i++) {
      const a = ba * (g < 4 ? seg(t, 2.15 + i * 0.18, 2.6 + i * 0.18) : 1)
      if (a <= 0.001) continue
      ART.beam(x, [200, 364, 528, 692, 856][i], 76, ART.VX + poses[i].x, ART.VY + poses[i].fy + 6, 46, cols[i], a)
    }
    if (g >= 36 && g < 44) ART.beam(x, 364, 76, ART.VX + 390, ART.VY + 452, 52, '#8b6bd9', 0.12)
  }

  // confetti / drizzle / pyro
  ART.paintConfetti(x, g, S.confEvents, g >= 44.6 && g < 63.4)
  ART.paintPyro(x, g, S.pyroEvents)

  // pit crowd
  const energy = g < 4 ? 0.25 : g < 20 ? 0.4 : g < 36 ? 1 : g < 44 ? 0.12 : 1.1
  ART.paintPit(x, g, energy, beat)
}

function drawRazor(x, rz) {
  const cx = ART.VX + rz.x, cy = ART.VY + rz.y
  x.save()
  x.globalAlpha = rz.alpha
  x.translate(cx, cy)
  x.rotate(rz.rot)
  if (rz.split <= 0) {
    x.drawImage(S.razor, -56, -75)
  } else {
    const u = rz.split
    // halves drop flat to the stage floor, left/right of the hero
    x.save()
    x.translate(-96 * u, 182 * u)
    x.rotate(-1.42 * u)
    x.beginPath(), x.rect(-120, -120, 120, 240), x.clip()
    x.drawImage(S.razor, -56, -75)
    x.restore()
    x.save()
    x.translate(96 * u, 188 * u)
    x.rotate(1.28 * u)
    x.beginPath(), x.rect(0, -120, 120, 240), x.clip()
    x.drawImage(S.razor, -56, -75)
    x.restore()
  }
  x.restore()
}

function drawSlashArc(x, g) {
  const prog = E.outCubic(seg(g, 43.26, 43.5))
  const fade = 1 - seg(g, 43.5, 43.6)
  if (fade <= 0) return
  x.globalCompositeOperation = 'lighter'
  const cx = ART.VX + 448, cy = ART.VY + 344, r = 84
  const a0 = -2.15, a1 = lerp(-2.15, -0.55, prog)
  x.strokeStyle = `rgba(255,255,255,${0.85 * fade})`
  x.lineWidth = 10
  x.lineCap = 'round'
  x.beginPath(), x.arc(cx, cy, r, a0, a1), x.stroke()
  x.strokeStyle = `rgba(255,215,110,${0.6 * fade})`
  x.lineWidth = 4
  x.beginPath(), x.arc(cx, cy, r - 8, a0 + 0.15, a1), x.stroke()
  x.globalCompositeOperation = 'source-over'
}

// audience-POV crowd cam (band behind camera)
function drawAudiencePOV(x, g, t) {
  x.fillStyle = '#050509'
  x.fillRect(0, 0, ART.LW, ART.LH)
  const gr = x.createRadialGradient(528, 660, 60, 528, 660, 620)
  gr.addColorStop(0, 'rgba(255,205,110,0.22)')
  gr.addColorStop(0.5, 'rgba(255,150,90,0.08)')
  gr.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = gr
  x.fillRect(0, 0, ART.LW, ART.LH)
  // stage-light spill bands from above/behind
  x.globalCompositeOperation = 'lighter'
  for (let b = 0; b < 3; b++) {
    const bx = 200 + b * 300
    const bg = x.createLinearGradient(bx, 0, bx + 100, 500)
    bg.addColorStop(0, CYCLE[(b + Math.floor(g / 2)) % 4])
    bg.addColorStop(1, 'rgba(0,0,0,0)')
    x.globalAlpha = 0.05
    x.fillStyle = bg
    x.beginPath()
    x.moveTo(bx, -10)
    x.lineTo(bx + 90, -10)
    x.lineTo(bx + 190, 500)
    x.lineTo(bx + 40, 500)
    x.closePath(), x.fill()
  }
  x.globalAlpha = 1
  x.globalCompositeOperation = 'source-over'
  // crowd rows (QA'd far sprites)
  const beat = g * 2
  const rows = [
    { fy: 500, s: 1.15, n: 12, off: 0 }, { fy: 552, s: 1.5, n: 11, off: 4 }, { fy: 610, s: 1.9, n: 9, off: 8 },
  ]
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    for (let i = 0; i < row.n; i++) {
      const id = (i + row.off) % S.crowd.length
      const h = hash(r * 313 + i * 71 + 3)
      const px = ((i + 0.5 + r * 0.4) / row.n) * (ART.LW - 60) + 30 + (h - 0.5) * 26
      const bob = Math.abs(Math.sin(beat * Math.PI + h * 6.28)) * 6
      A.drawRemy(x, S.crowd[id], px, row.fy - bob, {
        flip: h > 0.5, sx: row.s, sy: row.s,
        lean: Math.sin(g * 2 + h * 6.28) * 0.04,
      })
    }
  }
  // front silhouette heads + flashes
  ART.paintPit(x, g, 1.2, beat)
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 14; i++) {
      const h = hash(r * 501 + i * 97 + 11)
      const px = ((i + 0.5) / 14) * ART.LW + (h - 0.5) * 30
      const py = 560 + r * 44 - Math.abs(Math.sin(beat * Math.PI + h * 6.28)) * 7
      x.fillStyle = `rgba(6,6,11,1)`
      x.beginPath(), x.arc(px, py, 15 + h * 9, 0, 7), x.fill()
      x.fillRect(px - 30 - h * 10, py + 10, 60 + h * 20, 80)
    }
  }
}

// ---- overlay: member cards, LIVE bug, end slate -----------------------------
function drawOverlay(o, t, cam) {
  if (t >= 61.4) { drawSlate(o, t); return }
  for (const c of TL.CARDS) {
    if (t < c.t0 - 0.1 || t > c.t1) continue
    const m = TL.BAND[c.m]
    const pin = E.outCubic(seg(t, c.t0, c.t0 + 0.3))
    const pout = 1 - seg(t, c.t1 - 0.25, c.t1)
    if (pout <= 0) continue
    const slide = 56 * (1 - pin)
    const px = (c.side === 'L' ? 112 : W - 112 - 460) + (c.side === 'L' ? -slide : slide)
    const py = 132
    o.save()
    o.globalAlpha = Math.min(pin, pout)
    o.fillStyle = 'rgba(9,10,18,0.88)'
    ART.rrect(o, px, py, 460, 246, 18), o.fill()
    o.strokeStyle = m.hair
    o.lineWidth = 3
    ART.rrect(o, px, py, 460, 246, 18), o.stroke()
    // portrait
    const pc = ART.PCROP[m.id]
    const img = S.portraits[m.id]
    const ccx = px + 120, ccy = py + 123, cr = 86
    o.save()
    o.beginPath(), o.arc(ccx, ccy, cr, 0, 7), o.clip()
    if (pc.lift) o.filter = `brightness(${pc.lift})`
    o.drawImage(img, pc.cx - pc.r, pc.cy - pc.r, pc.r * 2, pc.r * 2, ccx - cr, ccy - cr, cr * 2, cr * 2)
    o.filter = 'none'
    o.restore()
    o.strokeStyle = m.hair
    o.lineWidth = 5
    o.beginPath(), o.arc(ccx, ccy, cr + 3, 0, 7), o.stroke()
    txt(o, m.name, px + 232, py + 92, { size: 42, font: F.anton, color: '#ffffff', weight: '' })
    txt(o, m.role, px + 232, py + 136, { size: 19, font: F.mono, color: m.hair, weight: 700, track: 0.5 })
    o.fillStyle = m.hair
    o.fillRect(px + 232, py + 154, 64, 4)
    txt(o, `No.${m.id} · THE FLOWS`, px + 232, py + 190, { size: 17, font: F.mono, color: 'rgba(255,255,255,0.55)', weight: 500 })
    o.restore()
  }
  // LIVE bug on crowd/conf cams (right-aligned inside the safe margin)
  if (cam.cam.pov || cam.cam === TL.CAM.conf) {
    const label = 'LIVE · FLOOR ARENA'
    const lw = measure(o, label, 26, F.mono, 0, 700)
    const tx = W - 96 - lw
    const puls = 0.55 + 0.45 * Math.sin(t * 5)
    o.globalAlpha = 0.9
    o.fillStyle = '#ff3b30'
    o.beginPath(), o.arc(tx - 26, 84, 8, 0, 7), o.fill()
    o.globalAlpha = 0.9 * (0.35 + 0.65 * puls)
    o.beginPath(), o.arc(tx - 26, 84, 14, 0, 7), o.fill()
    o.globalAlpha = 0.9
    txt(o, label, tx, 84, { size: 26, font: F.mono, weight: 700, color: '#ffffff', base: 'middle' })
    o.globalAlpha = 1
  }
}

function drawSlate(o, t) {
  const p = E.outCubic(seg(t, 61.5, 61.95))
  o.fillStyle = `rgba(5,6,10,${0.74 * p})`
  o.fillRect(0, 0, W, H)
  const sc = lerp(1.5, 1, p)
  o.save()
  o.translate(W / 2, 430)
  o.scale(sc, sc)
  o.globalAlpha = p
  txt(o, 'HAIR WE GO', 0, 0, { size: 168, font: F.anton, color: '#ffd76e', align: 'center', base: 'middle', glow: '#ffb42e', glowBlur: 40, track: 4, weight: '' })
  o.restore()
  o.globalAlpha = p
  txt(o, 'REMY BOYS · OFFICIAL VIDEO', W / 2, 552, { size: 30, font: F.mono, weight: 700, track: 7, color: 'rgba(255,255,255,0.85)', align: 'center' })
  o.fillStyle = '#ffd76e'
  o.fillRect(W / 2 - 130, 578, 260, 3)
  txt(o, 'WORLD TOUR: THE FLOOR · SPRING 2027', W / 2, 640, { size: 40, font: F.grot, weight: 600, color: '#ffffff', align: 'center' })
  const iy = 760
  for (let i = 0; i < S.icons.length; i++) {
    const ix = W / 2 + (i - 2) * 96
    o.imageSmoothingEnabled = false
    o.drawImage(S.icons[i], ix - 28, iy - 28, 56, 56)
    txt(o, TL.BAND[i].name, ix, iy + 46, { size: 15, font: F.mono, weight: 700, color: TL.BAND[i].hair, align: 'center' })
  }
  txt(o, 'ALL FLOWS RESERVED', W / 2, 880, { size: 21, font: F.mono, weight: 500, color: 'rgba(255,255,255,0.5)', align: 'center', track: 3 })
  o.globalAlpha = 1
}
