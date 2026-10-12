// STAR FLOWS — original score. All times are FILM time (world events mapped
// through filmAbs). Motif is an original rising fanfare in D — no borrowed
// melodies: every voice is synthesized from kit primitives.
import * as T from './timeline.js'

const F = T.filmAbs

export default function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit

  // ---- custom voices ------------------------------------------------------
  const brass = (t, m, dur, g = 0.16, send = 0.32, pan = 0) =>
    at(t, () => {
      const f = ac.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 1900
      const gn = ac.createGain()
      gn.gain.setValueAtTime(0.0001, t)
      gn.gain.exponentialRampToValueAtTime(g, t + 0.045)
      gn.gain.setValueAtTime(g * 0.9, t + Math.max(0.06, dur - 0.16))
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      for (const [type, k] of [['sawtooth', 1], ['square', 0.5]]) {
        const o = osc(type, hz(m) * k, t, dur + 0.05)
        o.frequency.setValueAtTime(hz(m) * k * 0.975, t)
        o.frequency.exponentialRampToValueAtTime(hz(m) * k, t + 0.08)
        o.connect(f)
      }
      f.connect(gn)
      out(gn, 1, send, pan)
    })

  const snare = (t, g = 0.2) =>
    at(t, () => {
      const n = noise(t, 0.16)
      const f = ac.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = 1900
      f.Q.value = 0.8
      const gn = ac.createGain()
      gn.gain.setValueAtTime(g, t)
      gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
      n.connect(f)
      f.connect(gn)
      out(gn, 1, 0.16)
    })

  // ---- A · cold open ------------------------------------------------------
  kit.drone(0, 4.4, [26, 38, 45], 0.05, 300)
  kit.wind(0.2, 4.2, 0.05)
  kit.swell(2.6, 4.5, 0.16)
  kit.riser(3.6, 4.55, 0.2)

  // ---- B · logo slam ------------------------------------------------------
  kit.crash(4.55, 0.4)
  kit.impact(4.55, 1.0, 50)
  kit.taiko(4.55, 0.9)
  kit.taiko(4.62, 0.7)
  kit.braam(4.55, [38, 45, 50], 2.6, 0.5, 1.1)
  kit.choir(4.7, [62, 66, 69], 3.4, 0.09, 'a')
  kit.strings(4.7, [50, 57, 62], 4.8, 0.07)
  kit.bell(5.2, hz(86), 0.13, 1.4)
  kit.bell(5.5, hz(81), 0.1, 1.2)
  kit.bell(5.8, hz(74), 0.1, 1.2)
  kit.pad(6.6, [50, 54, 57, 62], 3.2, 0.05)

  // ---- C · the crawl march (120 BPM, bar = 2s) ----------------------------
  const C0 = F(T.T.crawl)
  const PROG = [
    [[38, 50, 54, 57], 50],
    [[35, 47, 54, 59], 47],
    [[32, 43, 50, 55], 43],
    [[33, 45, 49, 52], 45],
  ]
  for (let bar = 0; bar < 8; bar++) {
    const t0 = C0 + bar * 2
    const [chord, root] = PROG[bar % 4]
    kit.taiko(t0, 0.7)
    kit.taiko(t0 + 1.0, 0.45)
    snare(t0 + 0.5, 0.1)
    snare(t0 + 1.5, 0.1)
    brass(t0, root + 12, 1.7, 0.11)
    brass(t0 + 0.02, root + 19, 1.7, 0.07)
    for (let e = 0; e < 8; e++) {
      const m = e % 2 === 0 ? root + 12 : root + 19
      kit.pluck(t0 + e * 0.25, m, 0.05, 2600, 0.22)
    }
  }
  // fanfare melody over the back half
  const MEL_C = [
    [0.0, 74, 0.9], [1.0, 78, 0.45], [1.5, 76, 0.45], [2.0, 74, 1.0], [3.0, 69, 0.9],
    [4.0, 71, 0.9], [5.0, 69, 0.45], [5.5, 67, 0.45], [6.0, 69, 0.9], [7.0, 71, 0.9],
    [8.0, 74, 0.9], [9.0, 73, 0.45], [9.5, 74, 0.45], [10.0, 76, 0.9], [11.0, 74, 1.2],
  ]
  for (const [b, m, d] of MEL_C) brass(C0 + 4 + b, m, d, 0.15)

  // ---- D · pursuit (B minor grind) ----------------------------------------
  const P0 = F(T.T.pursuit)
  const D1 = F(T.T.dog)
  kit.drone(P0, D1 - 0.1, [35, 47], 0.05, 260)
  for (let t = P0 + 0.4; t < D1 - 1.6; t += 0.5) kit.bass(t, 35, 0.22, 0.28, 'sawtooth', 500)
  for (let t = P0 + 0.65; t < D1 - 1.6; t += 2.0) kit.hat(t, 0.06, 0.05)
  kit.riser(F(30.2), F(32.4), 0.14)
  kit.braam(F(33.0), [35, 42], 2.2, 0.35)
  kit.whoosh(F(T.JUMP_G), 0.9, 0.3, 400, 5200)
  kit.glass(F(T.JUMP_G) + 0.05, 0.22)
  kit.sweepDown(F(T.JUMP_G) + 0.1, 0.7, 3000, 300, 0.2)
  kit.choir(F(34.2), [47, 54, 62], 3.2, 0.07, 'o')
  kit.riser(D1 - 1.6, D1, 0.2)

  // ---- E · dogfight (140 BPM, bar = 1.714s) -------------------------------
  const BAR = 60 / 140 * 4
  for (let bar = 0; bar < 11; bar++) {
    const t0 = D1 + bar * BAR
    if (t0 > F(T.T.trench) - 0.3) break
    kit.kick(t0, 0.85)
    kit.kick(t0 + BAR / 2, 0.6)
    kit.clap(t0 + BAR / 2, 0.3)
    kit.taiko(t0, 0.65)
    kit.bass(t0, 35, 0.4, 0.3, 'sawtooth', 420)
    kit.bass(t0 + BAR / 2, 35, 0.4, 0.26, 'sawtooth', 420)
    const stab = bar % 2 === 0 ? [47, 54, 59] : [43, 50, 55]
    if (bar % 2 === 0 || bar % 4 === 1) kit.braam(t0, stab, 0.6, 0.16, 0.9)
    for (let e = 0; e < 8; e++) {
      const seq = [47, 48, 50, 54]
      kit.pluck(t0 + e * (BAR / 8), seq[e % 4] + (bar >= 6 ? 2 : 0), 0.05, 2800, 0.16)
    }
  }
  for (let t = D1; t < F(T.T.trench) - 0.3; t += BAR / 4) kit.hat(t, 0.045, 0.03)
  // kills
  kit.crash(F(T.T.kill1), 0.3)
  kit.impact(F(T.T.kill1), 0.85, 62)
  kit.crash(F(T.T.kill2), 0.35)
  kit.impact(F(T.T.kill2), 0.95, 55)
  kit.glass(F(T.T.kill2) + 0.02, 0.16)
  // razors flee
  kit.sweepDown(F(T.T.flee), 1.0, 2600, 300, 0.22)
  kit.wind(F(T.T.flee), 2.4, 0.06)
  kit.riser(F(T.T.trench) - 2.6, F(T.T.trench), 0.2)

  // ---- F · the trench ------------------------------------------------------
  const R0 = F(T.T.trench)
  kit.drone(R0, F(73.4), [31, 43], 0.04, 220)
  for (let t = R0; t < F(71.4); t += 0.4286) {
    kit.bass(t, 35, 0.2, 0.22, 'sawtooth', 380)
  }
  let tickT = R0 + 1.5
  let tickI = 0.5
  while (tickT < F(70.4)) {
    kit.tick(tickT, 0.07, 3000)
    tickT += tickI
    tickI = Math.max(0.17, tickI * 0.965)
  }
  kit.strings(R0 + 1.8, [47, 54], 5.2, 0.045)
  kit.strings(R0 + 7.4, [47, 54], 5.2, 0.045)
  kit.strings(R0 + 13.0, [48, 55], 5.4, 0.05)
  kit.whoosh(F(T.T.torpLaunch), 0.7, 0.3, 300, 4000)
  kit.blip(F(T.T.torpLaunch), 1200, 0.1)
  kit.clunk(F(T.T.poreHit), 0.5)
  kit.tick(F(T.T.poreHit), 0.2, 2400)
  // heartbeat into the void (last two land on the freeze and the flash)
  for (const hb of [71.0, 71.7, 72.4, 73.15, 73.9, 74.55, 75.1]) kit.heartbeat(F(hb), 0.55)

  // ---- G · blast ------------------------------------------------------------
  kit.sub(F(T.T.detFreeze), 0.7, 80, 30, 1.6)
  kit.tick(F(75.0), 0.14, 2200)
  kit.glitch(F(75.0), 0.3, 0.09)
  kit.tick(F(75.25), 0.14, 2600)
  const DT = F(T.T.det)
  kit.impact(DT, 1.4, 48)
  kit.crash(DT, 0.5)
  kit.thunder(DT, 0.55, 4.5)
  kit.braam(DT, [38, 45, 50], 3.4, 0.5, 1.2)
  kit.glass(DT + 0.04, 0.3)
  kit.swell(DT + 0.05, DT + 2.2, 0.3, 7000)
  kit.choir(DT + 0.2, [50, 57, 62, 66], 3.2, 0.1, 'a')
  for (let k = 0; k < 8; k++) kit.bell(DT + 0.3 + k * 0.09, hz([62, 64, 66, 69, 71, 74, 76, 78][k]), 0.09, 1.1)
  kit.pad(DT + 2.6, [38, 50, 54, 57, 61], 2.4, 0.045)

  // ---- H · medal ceremony (90 BPM) -----------------------------------------
  const M0 = F(T.T.medal) + 0.5
  const CHORDS_M = [
    [[38, 50, 54, 57]],
    [[35, 47, 54, 59]],
    [[32, 43, 50, 55]],
    [[33, 45, 49, 52]],
    [[38, 50, 54, 57]],
  ]
  for (let bar = 0; bar < 5; bar++) {
    const t0 = M0 + bar * 2.667
    const [chord] = CHORDS_M[bar]
    kit.pad(t0, chord, 2.6, 0.05)
    kit.strings(t0, chord.slice(1), 2.5, 0.05)
    kit.taiko(t0, 0.4)
    if (bar >= 2) kit.choir(t0, chord.slice(1).map((m) => m + 12), 2.5, 0.035, 'o')
  }
  const MEL_M = [
    [0.3, 74, 1.0], [1.4, 78, 0.45], [1.85, 76, 0.45], [2.3, 74, 1.3], [3.7, 69, 0.8],
    [4.7, 71, 1.0], [5.6, 69, 0.45], [6.05, 67, 0.45], [6.5, 69, 1.0], [7.5, 74, 1.6],
  ]
  for (const [b, m, d] of MEL_M) {
    brass(M0 + b, m, d, 0.14)
    kit.bell(M0 + b + 0.02, hz(m), 0.05, 1.1)
  }
  // pin
  kit.crash(F(T.T.pin), 0.3)
  kit.impact(F(T.T.pin), 0.5, 60)
  kit.bell(F(T.T.pin) + 0.06, hz(86), 0.14, 1.8)
  // the escape — a shadow under the triumph
  kit.tick(F(T.T.escape), 0.15, 1500)
  kit.sweepDown(F(T.T.escape), 0.8, 900, 200, 0.12)
  // iris + final chord
  kit.strings(F(89.3), [50, 54, 57, 62], 2.6, 0.06)
  kit.choir(F(89.3), [62, 66], 2.6, 0.06, 'o')
  kit.piano(F(90.0), 86, 0.2, 3.0)
  kit.piano(F(90.6), 74, 0.16, 3.0)
  kit.bell(F(91.4), hz(86), 0.12, 2.2)
  kit.sub(F(91.6), 0.3, 60, 34, 1.4)
}
