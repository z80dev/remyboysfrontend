// hair-we-go · original pop score · 120 BPM, world-time cues via filmT().
// Form: intro sting · verse D-A-E-F#m · chorus A-F#m-D-E (hook bells) ·
// bridge tension (drone/taiko/riser) · slice hit-stop · drop · finale chorus
// with +2 key lift at 52 · outro. All melodies original.
import { filmT, STOPS, CHORDS, ROOTS, CONFETTI, PYRO } from './timeline.js'

const GS = STOPS[0].g // 43.5 — world/film clocks identical before this
const ft = filmT // world g → film seconds

export default function score(kit) {
  const { at, noise, out, env, hz, ac } = kit
  const { kick, clap, hat, crash, bass, pluck, pad, bell, impact, riser, sub,
    strings, choir, taiko, drone, tick, blip, glitch, sweepDown, hiss, whoosh, crowd } = kit

  // ---- intro (0-4): vinyl hiss, sub swell, crowd murmur, sting at 2 ------
  hiss(0.05, 1.6, 0.05)
  sub(0.4, 0.4, 50, 30, 1.8)
  crowd(0.2, 63.9, 0.045)
  pad(0.4, [45, 52, 57], 3.4, 0.035, 900, 1.2)
  impact(2, 0.5, 60)
  crash(2, 0.18)
  for (let i = 0; i < 3; i++) bell(2 + i * 0.12, hz(81), 0.1, 0.9)
  whoosh(1.4, 0.6, 0.14, 200, 1800)

  // ---- verse (4-20): D A E F#m | D A E E ---------------------------------
  const verse = [['D', 4], ['A', 6], ['E', 8], ['Fsm', 10], ['D', 12], ['A', 14], ['E', 16], ['E', 18]]
  for (const [ch, g0] of verse) {
    const root = ROOTS[ch], tri = CHORDS[ch]
    pad(g0, tri, 1.9, 0.04, 1400, 0.15)
    for (let b = 0; b < 4; b++) {
      kick(g0 + b * 0.5, 0.62)
      if (b === 1 || b === 3) clap(g0 + b * 0.5, 0.28)
      hat(g0 + b * 0.5 + 0.25, 0.09)
    }
    bass(g0, root, 0.42, 0.3)
    bass(g0 + 0.5, root + 12, 0.2, 0.24)
    bass(g0 + 1, root, 0.42, 0.3)
    bass(g0 + 1.5, root + 12, 0.2, 0.24)
    const tones = [tri[0] + 12, tri[1] + 12, tri[2] + 12, tri[0] + 24]
    const pat = [0, 2, 1, 2, 0, 2, 1, 3]
    for (let e = 0; e < 8; e++) pluck(g0 + e * 0.25, tones[pat[e]], 0.055, 2800, 0.2)
    // bell accents + sparse answer motif in the back half
    if (g0 >= 12) {
      bell(g0, hz(81), 0.06, 0.7)
      const ans = [[0.5, 74], [1, 73], [1.5, 71], [2.5, 69], [3, 71]]
      for (const [o, m] of ans) pluck(g0 + o, m, 0.05, 2200, 0.3)
    }
  }
  // pre-chorus (18-20): riser + claps crescendo, kick drops at 19.5
  riser(18, 20, 0.2)
  for (let e = 0; e < 8; e++) clap(18.25 + e * 0.25, 0.1 + (e / 8) * 0.22)
  crash(19.9, 0.1)
  crowd(19.8, 20.6, 0.1)

  // ---- chorus hook (20-36): A F#m D E ×2 ----------------------------------
  const hook = (g0, tr, both = true) => {
    const n1 = [[0, 76], [0.5, 76], [1, 78], [1.5, 81]]
    for (const [o, m] of n1) bell(ft(g0 + o), hz(m + tr), 0.13, o === 1.5 ? 1.0 : 0.4)
    if (both) {
      const n2 = [[2, 74], [2.5, 73], [3, 71], [3.5, 69]]
      for (const [o, m] of n2) bell(ft(g0 + o), hz(m + tr), 0.12, o === 3.5 ? 1.4 : 0.4)
    }
  }
  const groove = (g0, ch, strong) => {
    const root = ROOTS[ch], tri = CHORDS[ch]
    crash(ft(g0), strong ? 0.22 : 0.12)
    for (let b = 0; b < 4; b++) {
      kick(ft(g0 + b * 0.5), strong ? 0.8 : 0.66)
      if (b === 1 || b === 3) clap(ft(g0 + b * 0.5), strong ? 0.45 : 0.32)
      hat(ft(g0 + b * 0.5 + 0.25), 0.12, 0.07)
    }
    for (let e = 0; e < 8; e++) bass(ft(g0 + e * 0.25), root + (e % 4 === 1 || e % 4 === 3 ? 12 : 0), 0.18, 0.34)
    pad(ft(g0), tri, 1.9, 0.05, 1800, 0.1)
  }
  sub(20, 0.55, 90, 36, 1.4)
  const chorus = [['A', 20], ['Fsm', 22], ['D', 24], ['E', 26], ['A', 28], ['Fsm', 30], ['D', 32], ['E', 34]]
  for (let i = 0; i < chorus.length; i++) {
    const [ch, g0] = chorus[i]
    groove(g0, ch, i % 4 === 0)
    if (i % 2 === 0) hook(g0, 0)
  }
  strings(20, [45, 52, 57, 64], 7.8, 0.035, 0.8, 1.2)
  choir(24, [57, 61, 64], 3.8, 0.04, 'o', 0.5, 1.2)
  strings(28, [45, 52, 57, 64], 7.6, 0.035, 0.8, 1.2)
  choir(32, [57, 61, 64], 3.8, 0.045, 'o', 0.5, 1.2)
  for (const c of CONFETTI) {
    if (c >= GS) break
    whoosh(ft(c) - 0.12, 0.5, 0.15, 180, 2200)
    blip(ft(c) + 0.05, 300, 0.12, 0.06, 'triangle')
  }
  windBed(at, noise, out, env, ac, 20, 36, 0.045)

  // ---- bridge (36-44): power cut, march, standoff, SLICE ------------------
  sweepDown(36, 0.9, 2600, 110, 0.3)
  drone(36, 44, [42, 54, 57], 0.055, 420)
  for (let e = 0; e < 16; e++) tick(38 + e * 0.5, 0.055, e % 2 ? 2900 : 2200)
  for (let b = 0; b < 7; b++) taiko(40 + b * 0.5, 0.34 + (b / 7) * 0.26, 58)
  for (let e = 0; e < 12; e++) tick(42 + e * 0.125, 0.11, 2500 + (e % 2) * 500)
  riser(41.8, 43.5, 0.26)
  glitch(43.2, 0.3, 0.1)
  crowd(42.9, 44.6, 0.13)
  // the slice (onset lands at the start of the freeze)
  whoosh(43.24, 0.3, 0.25, 700, 3200)
  impact(43.5, 0.95, 66)
  bell(43.5, 2400, 0.2, 0.35, 3.5, 9)
  at(43.5, () => {
    const n = noise(43.5, 0.3)
    const f = ac.createBiquadFilter()
    f.type = 'bandpass', f.frequency.value = 2800, f.Q.value = 1.2
    const gn = ac.createGain()
    n.connect(f), f.connect(gn)
    env(gn.gain, 43.5, 0.004, 0.32, 0.12, 0, 0.12)
    out(gn, 1, 0.3)
  })
  // drop at world 44 → film 44.12
  impact(ft(44), 1, 48)
  sub(ft(44), 0.6, 110, 34, 1.5)
  crash(ft(44), 0.3)
  taiko(ft(44), 0.55)

  // ---- finale (44-62): chorus ×2, +2 lift at 52 ---------------------------
  const fin1 = [['A', 44], ['Fsm', 46], ['D', 48], ['E', 50]]
  for (let i = 0; i < fin1.length; i++) {
    const [ch, g0] = fin1[i]
    groove(g0, ch, i === 0)
    if (i % 2 === 0) {
      hook(g0, 0)
      for (const [o, m] of [[0, 76], [0.5, 76], [1, 78], [1.5, 81]]) pluck(ft(g0 + o), m + 12, 0.045, 3500, 0.25)
    }
  }
  choir(44, [57, 61, 64, 69], 3.8, 0.05, 'a', 0.4, 1.1)
  strings(48, [45, 52, 57, 64], 3.8, 0.04, 0.7, 1)
  choir(48, [57, 61, 64], 3.8, 0.04, 'o', 0.5, 1.2)
  crash(ft(52), 0.26)
  impact(ft(52), 0.4, 72)
  const fin2 = [['B', 52], ['Gsm', 54], ['E', 56], ['Fsm', 58], ['B', 60]]
  for (let i = 0; i < fin2.length; i++) {
    const [ch, g0] = fin2[i]
    groove(g0, ch, i === 0)
    if (i % 2 === 0) {
      hook(g0, 2)
      for (const [o, m] of [[0, 76], [0.5, 76], [1, 78], [1.5, 81]]) pluck(ft(g0 + o), m + 14, 0.045, 3500, 0.25)
    }
  }
  choir(52, [59, 63, 66, 71], 3.8, 0.05, 'a', 0.4, 1.1)
  strings(56, [47, 54, 59, 66], 3.8, 0.04, 0.7, 1)
  choir(56, [59, 63, 66], 3.8, 0.04, 'o', 0.5, 1.2)
  taiko(ft(60), 0.5)
  crash(ft(60), 0.2)
  for (const p of PYRO) {
    hiss(ft(p), 0.16, 0.13)
    blip(ft(p), 140, 0.1, 0.12, 'triangle')
  }
  for (const c of CONFETTI) {
    if (c < GS) continue
    whoosh(ft(c) - 0.12, 0.5, 0.15, 180, 2200)
    blip(ft(c) + 0.05, 300, 0.12, 0.06, 'triangle')
  }
  windBed(at, noise, out, env, ac, 44, 62.6, 0.05)

  // ---- outro (62-64): lifted tonic held, crowd roar ------------------------
  crash(ft(62), 0.3)
  const oc = [71, 75, 78]
  for (let i = 0; i < 3; i++) bell(ft(62) + i * 0.07, hz(oc[i]), 0.12, 1.7)
  strings(ft(62), [59, 63, 66], 1.7, 0.05, 0.3, 0.8)
  pad(ft(62), [47, 54, 59, 63], 1.7, 0.05, 1200, 0.1)
  pluck(ft(62), 83, 0.07, 3000, 0.5)
  crowd(61.6, 63.9, 0.17)
}

// sustained wind-machine bed: bandpassed noise with slow envelope
function windBed(at, noise, out, env, ac, t0, t1, g0) {
  at(t0, () => {
    const n = noise(t0, t1 - t0)
    const f = ac.createBiquadFilter()
    f.type = 'bandpass', f.frequency.value = 640, f.Q.value = 0.8
    const gn = ac.createGain()
    n.connect(f), f.connect(gn)
    env(gn.gain, t0, 1.2, g0, 0.8, g0 * 0.9, 0.9, Math.max(0.5, t1 - t0 - 2.2))
    out(gn, 1, 0.25)
  })
}
