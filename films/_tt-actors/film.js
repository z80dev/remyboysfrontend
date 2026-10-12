// SCRATCH self-test for films/termhairnator/actors.js — DELETED after review.
// Six diagnostic shots: (1) chrome rise + eye ignite w/ hero scale ref,
// (2) flesh 0.5 / burn 0.7 walk, (3) thumbs at sink 0.6 + waterline,
// (4) shaver/retracted gauntlet close-up, (5) title slam sweep, (6) endcard.
import { W, H, lerp, seg, clamp, E, F } from 'filmkit/lib.js'
import * as ACT from '../termhairnator/actors.js'
import { drawRemy } from '../remy-bros/art.js'

const S = {}
const GROUND = 900

function cam(ctx, k, cx, cy) {
  ctx.save()
  ctx.translate(960, 540)
  ctx.scale(k, k)
  ctx.translate(-cx, -cy)
}
function shadow(ctx, x, y, w, a = 0.35) {
  ctx.save()
  ctx.globalAlpha = a
  ctx.fillStyle = '#04070c'
  ctx.beginPath()
  ctx.ellipse(x, y + 3, w, w * 0.22, 0, 0, 7)
  ctx.fill()
  ctx.restore()
}
function nightBg(ctx, groundY = GROUND) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0a1420')
  g.addColorStop(0.7, '#0c1826')
  g.addColorStop(1, '#050b12')
  ctx.fillStyle = g
  ctx.fillRect(-300, -300, W + 600, H + 600)
  ctx.fillStyle = '#101c28'
  ctx.fillRect(-300, groundY, W + 600, H - groundY + 300)
  ctx.fillStyle = 'rgba(63,214,224,0.05)'
  for (let i = 0; i < 6; i++) ctx.fillRect(120 + i * 320, groundY + 8, 160, 3)
}
function moltenBg(ctx, surfaceY) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#080e16')
  g.addColorStop(1, '#04070c')
  ctx.fillStyle = g
  ctx.fillRect(-300, -300, W + 600, H + 600)
  const pool = ctx.createLinearGradient(0, surfaceY, 0, H)
  pool.addColorStop(0, '#ff7a1a')
  pool.addColorStop(0.4, '#b34700')
  pool.addColorStop(1, '#30100a')
  ctx.fillStyle = pool
  ctx.fillRect(-300, surfaceY, W + 600, H - surfaceY + 300)
  ctx.fillStyle = 'rgba(255,210,122,0.5)'
  ctx.fillRect(-300, surfaceY - 2, W + 600, 3)
}

const A = { name: 'a-rise', t0: 0, t1: 3,
  draw(ctx, lt, dur, t) {
    nightBg(ctx)
    ctx.imageSmoothingEnabled = false
    const rise = seg(lt, 0.7, 1.9)
    shadow(ctx, 800, GROUND, 46)
    S.drawMachine(ctx, 800, GROUND, {
      pose: 'rise', phase: rise, flesh: 0, scale: 2.55, t: lt,
      eye: { on: seg(lt, 2.2, 2.7), warm: 0 }, arm: 'shaver', core: 0.1, glow: 0.15,
    })
    shadow(ctx, 1250, GROUND, 38, 0.3)
    drawRemy(ctx, S.hero, 1250, GROUND, { lift: [2, 0], stride: [1, 0], lean: 0.02, sx: 2.1, sy: 2.1 })
    S.hudText(ctx, 'T-8  sx 2.55', 800, 810, { size: 24, align: 'center', alpha: 0.7 })
    S.hudText(ctx, 'REMY 42  sx 2.1', 1250, 810, { size: 24, align: 'center', alpha: 0.5 })
  },
  fx() { return { letterbox: 1, grain: 0.01, vignette: 0.5, bloom: 0.1, bloomThresh: 0.9 } },
}
const B = { name: 'b-burnwalk', t0: 3, t1: 6,
  draw(ctx, lt, dur, t) {
    nightBg(ctx, 930)
    ctx.imageSmoothingEnabled = false
    shadow(ctx, 760, 930, 46)
    S.drawMachine(ctx, 760, 930, {
      pose: 'walk', phase: lt * 7, flesh: 0.55, burn: 0.7, scale: 2.55, t,
      eye: { on: 1, warm: 0 }, arm: 'down', glow: 0.35, core: 0.2,
    })
    shadow(ctx, 1240, 930, 46)
    S.drawMachine(ctx, 1240, 930, {
      pose: 'stand', flesh: 1, burn: 0.5, scale: 2.55, t,
      eye: { on: 1, warm: 0 }, arm: 'down',
    })
    shadow(ctx, 1650, 930, 38, 0.3)
    drawRemy(ctx, S.hero, 1650, 930, { lift: [6, 0], stride: [3, -3], lean: 0.1, sx: 2.1, sy: 2.1 })
    S.hudText(ctx, 'blend walk 0.55/0.7   ·   flesh 1 burn 0.5 edge ref', 960, 250, { size: 24, align: 'center', alpha: 0.55 })
  },
  fx() { return { letterbox: 1, grain: 0.01, vignette: 0.5, bloom: 0.1, bloomThresh: 0.9 } },
}
const C = { name: 'c-thumbsink', t0: 6, t1: 9,
  draw(ctx, lt, dur, t) {
    moltenBg(ctx, 880)
    ctx.imageSmoothingEnabled = false
    S.drawMachine(ctx, 960, 880, {
      pose: 'thumbs', phase: 1, flesh: 0.25, burn: 0.9, scale: 2.55, t,
      eye: { on: 0.85, warm: 0.45 }, arm: 'retracted', glow: 0.9, core: 0.2, sink: 0.6, shadow: 0,
    })
    S.hudText(ctx, 'thumbs / sink 0.6', 960, 250, { size: 24, align: 'center', alpha: 0.55 })
  },
  fx() { return { letterbox: 1, grain: 0.01, vignette: 0.6, bloom: 0.12, bloomThresh: 0.85 } },
}
const D = { name: 'd-gauntlet', t0: 9, t1: 12,
  draw(ctx, lt, dur, t) {
    nightBg(ctx)
    ctx.imageSmoothingEnabled = false
    cam(ctx, 2.0, 965, 620)
    shadow(ctx, 640, GROUND, 46)
    shadow(ctx, 1290, GROUND, 46)
    S.drawMachine(ctx, 640, GROUND, { pose: 'stand', flesh: 0.3, burn: 0.5, scale: 2.55, t: lt, eye: { on: 1, warm: 0 }, arm: 'shaver', core: 0.3, glow: 0.2 })
    S.drawMachine(ctx, 1290, GROUND, { pose: 'stand', flesh: 0, scale: 2.55, t: lt + 3, eye: { on: 0.9, warm: 0.2 }, arm: 'retracted', core: 0.1, glow: 0.1 })
    S.hudText(ctx, 'arm: shaver  ·  t buzz', 640, 760, { size: 24, align: 'center', alpha: 0.8 })
    S.hudText(ctx, 'arm: retracted', 1290, 760, { size: 24, align: 'center', alpha: 0.8 })
    ctx.restore()
  },
  fx() { return { letterbox: 1, grain: 0.01, vignette: 0.4, bloom: 0.1, bloomThresh: 0.9 } },
}
const E5 = { name: 'e-title', t0: 12, t1: 15.5,
  draw(ctx, lt) {
    ctx.fillStyle = '#04060a'
    ctx.fillRect(-300, -300, W + 600, H + 600)
    S.drawTitle(ctx, lt)
  },
  fx() { return { letterbox: 1, grain: 0.012, vignette: 0.6 } },
}
const F6 = { name: 'f-endcard', t0: 15.5, t1: 19,
  draw(ctx, lt) {
    ctx.fillStyle = '#030408'
    ctx.fillRect(-300, -300, W + 600, H + 600)
    S.drawEndcard(ctx, lt)
  },
  fx() { return { letterbox: 1, grain: 0.01, vignette: 0.55 } },
}

export default {
  title: 'TT ACTORS SELFTEST',
  output: '_tt-actors.mp4',
  duration: 19,
  async prepare() { Object.assign(S, await ACT.loadActors()) },
  shots: [A, B, C, D, E5, F6],
}
