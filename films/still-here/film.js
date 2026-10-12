// STILL HERE — the Remy Boys trailer. 64 s, 120 BPM (cuts on 2 s bars), 2.39:1 letterbox.
// Eight acts: boot → genesis → golden → the turn → dark → the floor → recovery → title.
// Every cue lives in timeline.js; scenes paint the world, this wires shots + captions + post.
import { T, SHOTS, COPY, FLAG } from './timeline.js'
import { prepareArt } from './art.js'
import { drawBoot, drawGenesis, drawGolden, drawTurn } from './scenes1.js'
import { drawDark, drawFloor, drawRecovery, drawTitle } from './scenes2.js'
import { score } from './score.js'

const DRAWS = { boot: drawBoot, genesis: drawGenesis, golden: drawGolden, turn: drawTurn, dark: drawDark, floor: drawFloor, recovery: drawRecovery, title: drawTitle }

// one post look per act; letterbox stays on throughout
const FX = {
  boot: (lt) => ({ crt: 0.18, vignette: 0.85, grain: 0.014, letterbox: 1, bloom: 0.08, bloomThresh: 0.7, exposure: lt < 0.3 ? -1.5 * (1 - lt / 0.3) : 0 }),
  genesis: () => ({ bloom: 0.12, bloomThresh: 0.85, sat: 1.05, warm: 0.06, vignette: 0.6, grain: 0.012, letterbox: 1 }),
  golden: () => ({ bloom: 0.08, bloomThresh: 0.9, sat: 1.04, vignette: 0.55, grain: 0.011, letterbox: 1 }),
  turn: (lt) => ({ glitch: Math.min(1, lt * 0.85) * 0.9, aber: 0.0012, crt: 0.2, vignette: 0.95, grain: 0.02, letterbox: 1, sat: 1 - 0.25 * Math.min(1, lt) }),
  dark: () => ({ tint: [1.06, 0.88, 0.88], contrast: 1.08, sat: 0.92, vignette: 1.1, bloom: 0.1, bloomThresh: 0.8, grain: 0.016, letterbox: 1 }),
  floor: () => ({ tint: [0.96, 0.9, 1.02], sat: 0.82, contrast: 1.04, vignette: 1.15, grain: 0.016, exposure: -0.08, letterbox: 1 }),
  recovery: () => ({ warm: 0.1, bloom: 0.14, bloomThresh: 0.8, sat: 1.07, vignette: 0.6, grain: 0.011, lift: [0.012, 0.008, 0.002], letterbox: 1 }),
  title: (lt) => ({ bloom: 0.1, bloomThresh: 0.8, vignette: 0.7, grain: 0.012, letterbox: 1, fade: Math.max(0, Math.min(1, (lt - 11.5) / 0.5)) }),
}

export default {
  title: 'REMY BOYS: STILL HERE — official trailer',
  output: 'still-here.mp4',
  duration: T.end,
  grid: { bar: 2 },
  async prepare() { await prepareArt() },
  shots: SHOTS.map(([name, t0, t1]) => ({
    name, t0, t1,
    draw(ctx, lt, dur, t, ov) { DRAWS[name](ctx, lt, t, ov) },
    fx: FX[name],
  })),
  captionStyles: () => ({
    cap: { font: '"Space Grotesk"', size: 34, weight: 500, color: '#f2f4f8', align: 'center', x: 960, y: 874, lineHeight: 1.42, anim: 'rise', in: 0.5, out: 0.4, rise: 14 },
    kick: { font: '"JetBrains Mono"', size: 17, weight: 600, color: FLAG[3], align: 'center', x: 960, y: 806, track: 6, anim: 'fade', in: 0.4, out: 0.3 },
  }),
  captions: [
    { id: 'k1', style: 'kick', text: COPY.k1, t0: 9.6, t1: 15.4 },
    { id: 'c1', style: 'cap', text: COPY.c1, t0: 10.0, t1: 15.7 },
    { id: 'c2', style: 'cap', text: COPY.c2, t0: 17.0, t1: 23.5 },
    { id: 'k3', style: 'kick', text: COPY.k3, t0: 26.6, t1: 32.4 },
    { id: 'c3', style: 'cap', text: COPY.c3, t0: 27.0, t1: 32.7 },
    { id: 'c4', style: 'cap', text: COPY.c4, t0: 34.6, t1: 41.3 },
    { id: 'k5', style: 'kick', text: COPY.k5, t0: 43.4, t1: 49.8 },
    { id: 'c5', style: 'cap', text: COPY.c5, t0: 43.8, t1: 50.2 },
  ],
  flashes: [
    [0.05, 0.5, 0.12], [2.42, 0.2, 0.08], [6.0, 0.18, 0.15], [8.0, 0.15, 0.12],
    [16.0, 0.12, 0.1], [24.0, 0.5, 0.14], [26.0, 0.3, 0.1], [29.0, 0.28, 0.1],
    [31.5, 0.35, 0.1], [34.0, 0.18, 0.12], [37.0, 0.42, 0.12], [42.0, 0.3, 0.18],
    [52.0, 0.55, 0.16], [52.5, 0.3, 0.1], [57.0, 0.32, 0.12], [60.5, 0.12, 0.15],
  ],
  score,
  audio: { seed: 4490, reverb: 2.6, reverbGain: 0.4 },
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } },
}
