// STAR FLOWS — Episode IV: A NEW FLOW (films/star-flows)
// 2D cinematic canvas space opera: perspective crawl, Bald Star, dogfight,
// trench run into the exhaust pore, hair-nova, medal ceremony. ~93s, 1080p60.
import { W, H, F } from 'filmkit/lib.js'
import { lookAt } from 'filmkit/cam3d.js'
import * as T from './timeline.js'
import * as ART from './art.js'
import score from './score.js'

const { warp, seg, clamp } = T

const SPACE_FX = {
  bloom: 0.12, bloomThresh: 0.62, letterbox: 1, vignette: 1, grain: 0.012,
}

const FX = {
  cold: (lt) => ({ ...SPACE_FX, fade: clamp(1 - lt * 1.4) }),
  crawl: () => ({ ...SPACE_FX, grain: 0.016 }),
  pursuit: () => ({ ...SPACE_FX }),
  dog: () => ({ ...SPACE_FX, aber: 0.0004 }),
  trench: (lt, t) => ({
    ...SPACE_FX,
    bloom: 0.16,
    aber: warp(t).stop ? 0.0018 : 0.0006,
  }),
  blast: (lt, t) => {
    const g = warp(t).g
    const peak = g >= T.T.det ? clamp(1 - (g - T.T.det) / 2.4) : 0
    return { ...SPACE_FX, bloom: 0.14 + peak * 0.24, grain: 0.014 }
  },
  medal: () => ({
    ...SPACE_FX, bloom: 0.1, warm: 0.05, grain: 0.018,
    vignette: 1.1,
  }),
}

const DRAWS = {
  cold(ctx, lt, t) {
    const cam = lookAt([0, 0, -30 + lt * 2.4], [0, 12, 500], 50)
    ART.drawStars(ctx, cam, t)
    ART.drawLogo(ctx, t)
  },
  crawl(ctx, lt, t) {
    const cam = lookAt([0, -34, -46], [0, 6, 130], 46)
    ART.drawStars(ctx, cam, t)
    ART.drawCrawl(ctx, t)
    ART.starStreaks(ctx, seg(t, 24.4, 25.4) * clamp(1 - seg(t, 25.7, 26.2)))
  },
  pursuit(ctx, lt, t) {
    ART.drawPursuit(ctx, warp(t).g, t)
  },
  dog(ctx, lt, t) {
    const w = warp(t)
    ART.drawDogfight(ctx, w.g, t)
  },
  trench(ctx, lt, t) {
    const w = warp(t)
    ART.drawTrench(ctx, w.g, t)
  },
  blast(ctx, lt, t) {
    const w = warp(t)
    ART.drawBlast(ctx, w.g, t)
  },
  medal(ctx, lt, t) {
    ART.drawMedal(ctx, warp(t).g, t)
  },
}

const OVERLAYS = {
  pursuit(ov, t) {
    ART.drawInset(ov, t)
  },
  trench(ov, t) {
    const g = warp(t).g
    ART.drawHUD(ov, g, t)
    ART.drawGhost(ov, t)
  },
}

function makeShot(name) {
  const [t0, t1] = T.SHOT_F[name]
  return {
    name, t0, t1,
    draw(ctx, lt, dur, t, ov) {
      ctx.fillStyle = '#02030a'
      ctx.fillRect(0, 0, W, H)
      DRAWS[name](ctx, lt, t)
      if (OVERLAYS[name]) OVERLAYS[name](ov, t)
    },
    fx: FX[name],
  }
}

export default {
  title: 'STAR FLOWS — Episode IV: A New Flow',
  output: 'star-flows.mp4',
  duration: T.DURATION,

  async prepare() {
    await ART.prepare()
  },

  shots: ['cold', 'crawl', 'pursuit', 'dog', 'trench', 'blast', 'medal'].map(makeShot),

  captions: [
    {
      id: 'legend', text: 'A long time ago in a flow far, far away….', t0: 0.7, t1: 4.3,
      style: 'legend', minHold: 2.6,
    },
    {
      id: 'comm1', t0: 39.6, t1: 43.6, style: 'comm', y: 872,
      text: 'RED-24 ▸ THEY\'RE ON MY TAIL — TOO FAST, TOO BALD!',
    },
    {
      id: 'comm2', t0: 44.6, t1: 48.6, style: 'comm', y: 872,
      text: 'RED-42 ▸ HANG ON. THE FLOW GUIDES MY SHOTS.',
    },
    {
      id: 'comm3', t0: 49.6, t1: 53.6, style: 'comm', y: 872,
      text: 'GOLD-28 ▸ TWO TORPEDOES. ONE PORE. EASY.',
    },
    {
      id: 'brief', t0: 57.8, t1: 61.8, style: 'comm', y: 872,
      text: 'PRINCESS FLOW ▸ THE PORE BREATHES — SINK TWO TORPEDOES.',
    },
    {
      id: 'ghost', text: 'USE THE FLOW, REMY. LET GO.', t0: 63.4, t1: 67.4,
      style: 'ghostc',
    },
    {
      id: 'royal', t0: 81.6, t1: 85.6, style: 'royal', y: 906,
      text: 'PRINCESS FLOW ▸ THE FLOW IS STRONG WITH YOU, RED-42.',
    },
    {
      id: 'end1', text: 'FLOW RESTORED', t0: 89.9, t1: 93.0, style: 'endcard', minHold: 2.3,
    },
    {
      id: 'end2', text: '…FOR NOW', t0: 91.2, t1: 93.0, style: 'endsub', minHold: 1.2,
    },
  ],

  captionStyles: {
    legend: {
      font: F.grot, size: 46, weight: 600, color: '#6fd3ff', x: 960, y: 528,
      align: 'center', anim: 'fade', in: 0.5, out: 0.35, track: 0.5,
    },
    comm: {
      font: F.mono, size: 30, weight: 500, color: '#ffffff', x: 960,
      align: 'center', anim: 'rise', in: 0.35, out: 0.3, track: 0.5,
    },
    ghostc: {
      font: F.grot, size: 38, weight: 600, color: '#cfe4ff', x: 960, y: 290,
      align: 'center', anim: 'fade', in: 0.6, out: 0.5, glow: '#bfe0ff', glowBlur: 18, track: 1.5,
    },
    royal: {
      font: F.mono, size: 30, weight: 500, color: '#ffffff', x: 960,
      align: 'center', anim: 'rise', in: 0.35, out: 0.3, track: 0.5,
    },
    endcard: {
      font: F.anton, size: 132, weight: '', color: '#ffd23f', x: 960, y: 470,
      align: 'center', anim: 'line', in: 0.55, out: 0.3, track: 6, glow: '#ffb42e', glowBlur: 22,
    },
    endsub: {
      font: F.mono, size: 34, weight: 500, color: '#9ff2c8', x: 960, y: 600,
      align: 'center', anim: 'fade', in: 0.4, out: 0.3, track: 6,
    },
  },

  flashes: [
    [T.T.logoLand, 0.55, 0.16],
    [T.filmAbs(T.T.kill2), 0.26, 0.1],
    [T.filmAbs(T.T.det), 0.42, 0.22],
    [T.filmAbs(T.T.pin), 0.22, 0.14],
  ],

  score,

  audio: { seed: 42, reverb: 3.4, reverbGain: 0.38 },

  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } },
}
