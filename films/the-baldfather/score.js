// THE BALDFATHER — original score. Sicilian-adjacent waltz in A minor, 3/4 @ 90 BPM
// (beat = 2/3 s; BAR = 2.000 s — bar lines are the even seconds, half-bars the odd).
// ABSOLUTELY ORIGINAL: no Nino Rota melody, no recognizable theme. Every cue time is
// derived from the shared timeline.js clocks — VISIT_CLOCK.abs() carries the 0.14 s
// hit-stop at film 45.2 (sting / riser / whip retime with the picture), CHAPEL_CLOCK
// has no stops (abs = 50 + g), S1/S4 are unclocked (local g = film t). No hand-added
// delays anywhere.
//
// MELODY NOTE MAP — MIDI numbers per bar. Grids below are [beat, lenBeats, midi];
// onset = barStart + beat * 2/3. Two 8-bar strains:
//
//   A STRAIN  | Am | Am | Dm | Am | E7 | Am | E7 | Am
//     A1 Am: 69 76 74 72      A2 Am: 71 72 69       A3 Dm: 74 77 76 74
//     A4 Am: 72 71 69         A5 E7: 68 72 71 68    A6 Am: 76 74 72 69
//     A7 E7: 71 68 64         A8 Am: 69(hold) 76
//   B STRAIN  | Dm | Am | Dm | E7 | F | E7 | Am | E7→Am
//     B1 Dm: 81 77 74         B2 Am: 76 72 69       B3 Dm: 77 74 72 74
//     B4 E7: 71 68 64         B5 F : 77 76 77       B6 E7: 76 74 71 68
//     B7 Am: 72 69 72         B8 E7→Am: 71 68 69(hold)
//
//   S1 plays the A strain 4.0–20.0, then B2–B4 thin out under the favor line (its
//   last note is anticipated to 27.4 and cut by the iris). S4 replays A1–A2 one
//   octave down, pluck alone. B5–B8 dissolve into the S3 montage: the family
//   answers "I DO." on organ stabs instead of the tune — the waltz yields to the rite.
//
// Mix discipline: bass ~0.2, pluck lead ~0.14, stabs peak ~0.3 (never >3 loud voices
// at once); every envelope has an explicit attack and release; exponential ramps
// always target positive endpoints; everything routes through out(node, g, send, pan).
import { T, STUDY_EV, VISIT_CLOCK, VISIT_EV, CHAPEL_CLOCK, CHAPEL_EV, MONTAGE, END_EV, CAPTIONS } from './timeline.js'

const BEAT = 2 / 3 // s @ 90 BPM
const VC = VISIT_CLOCK.abs // carries the 0.14 s hit-stop at film 45.2
const CC = CHAPEL_CLOCK.abs // no stops: CC(g) = 50 + g
const caption = (id) => CAPTIONS.find((c) => c.id === id)

// harmonic spine + voicings (MIDI): root = waltz bass, chord = oom-pah answer
const CH = {
  Am: { root: 45, chord: [57, 60, 64] },
  Dm: { root: 38, chord: [62, 65, 69] },
  E7: { root: 40, chord: [56, 59, 62] },
  F: { root: 41, chord: [57, 60, 65] },
}

// melody grids: [beat, lenBeats, midi] per bar (see note map above)
const A1 = [[0, 1, 69], [1, 0.5, 76], [1.5, 0.5, 74], [2, 1, 72]]
const A2 = [[0, 1, 71], [1, 1, 72], [2, 1, 69]]
const A3 = [[0, 1, 74], [1, 0.5, 77], [1.5, 0.5, 76], [2, 1, 74]]
const A4 = [[0, 1.5, 72], [1.5, 0.5, 71], [2, 1, 69]]
const A5 = [[0, 1, 68], [1, 0.5, 72], [1.5, 0.5, 71], [2, 1, 68]]
const A6 = [[0, 1, 76], [1, 0.5, 74], [1.5, 0.5, 72], [2, 1, 69]]
const A7 = [[0, 1, 71], [1, 1, 68], [2, 1, 64]]
const A8 = [[0, 2, 69], [2, 1, 76]]
const MEL_A = [A1, A2, A3, A4, A5, A6, A7, A8]
const B1 = [[0, 1.5, 81], [1.5, 0.5, 77], [2, 1, 74]]
const B2 = [[0, 1, 76], [1, 1, 72], [2, 1, 69]]
const B3 = [[0, 1, 77], [1, 0.5, 74], [1.5, 0.5, 72], [2, 1, 74]]
const B4 = [[0, 1.5, 71], [1.5, 0.5, 68], [2, 1, 64]]
const B5 = [[0, 1, 77], [1, 1, 76], [2, 1, 77]]
const B6 = [[0, 0.5, 76], [0.5, 0.5, 74], [1, 1, 71], [2, 1, 68]]
const B7 = [[0, 1, 72], [1, 1, 69], [2, 1, 72]]
const B8 = [[0, 1, 71], [1, 1, 68], [2, 2, 69]]
const MEL_B = [B1, B2, B3, B4, B5, B6, B7, B8]

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit

  // ---------- voices ----------
  // pluck: mandolin-ish lead. Saw pair (±6 cents) → bandpass ~2.5×fund, fast decay,
  // small second echo at +0.22 s. Carries the waltz melody.
  const pluck = (t, m, { g = 0.14, echo = true, decay = 0.5, pan = 0.1 } = {}) => at(t, () => {
    const f = hz(m)
    const body = (tt, gg) => {
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = Math.min(9000, f * 2.5)
      bp.Q.value = 1.1
      const a = ac.createGain()
      a.gain.setValueAtTime(0.0001, tt)
      a.gain.linearRampToValueAtTime(gg, tt + 0.004)
      a.gain.exponentialRampToValueAtTime(0.001, tt + decay)
      for (const det of [-6, 6]) {
        const o = osc('sawtooth', f, tt, decay + 0.1)
        o.detune.value = det
        o.connect(bp)
      }
      bp.connect(a)
      out(a, 1, 0.22, pan)
    }
    body(t, g)
    if (echo) body(t + 0.22, g * 0.35)
  })

  // pad: string ensemble — 3 detuned saws per note → lowpass, slow attack, soft release
  const pad = (t, notes, dur, { g = 0.05, atk = 0.6, cut = 900, send = 0.55 } = {}) => at(t, () => {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = cut
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + atk)
    a.gain.setValueAtTime(g, t + Math.max(atk + 0.05, dur - 0.5))
    a.gain.linearRampToValueAtTime(0, t + dur)
    for (const m of notes)
      for (const det of [-8, 0, 8]) {
        const o = osc('sawtooth', hz(m), t, dur + 0.1)
        o.detune.value = det
        o.connect(lp)
      }
    lp.connect(a)
    out(a, 1, send, 0, 0.5)
  })

  // oom: waltz bass, triangle, beat 1 of the bar
  const oom = (t, m, { g = 0.2 } = {}) => at(t, () => {
    const o = osc('triangle', hz(m), t, 0.6)
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.01)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    o.connect(a)
    out(a, 1, 0.08)
  })

  // pahStab: one chord answer (filtered saws, quiet). pah = beats 2 and 3.
  const pahStab = (t, notes, { g = 0.05 } = {}) => at(t, () => {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1300
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.012)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
    for (const m of notes)
      for (const det of [-5, 5]) {
        const o = osc('sawtooth', hz(m), t, 0.28)
        o.detune.value = det
        o.connect(lp)
      }
    lp.connect(a)
    out(a, 1, 0.18, -0.12)
  })
  const pah = (t0, notes, opts = {}) => {
    pahStab(t0 + BEAT, notes, opts)
    pahStab(t0 + 2 * BEAT, notes, opts)
  }

  // tri: brushed triangle tick keeping the waltz lilt
  const tri = (t, { g = 0.032 } = {}) => at(t, () => {
    const n = noise(t, 0.06)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 6800
    bp.Q.value = 2.2
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.002)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
    n.connect(bp).connect(a)
    out(a, 1, 0.12, 0.18)
    const o = osc('sine', 4200, t, 0.09)
    const og = ac.createGain()
    og.gain.setValueAtTime(0.0001, t)
    og.gain.linearRampToValueAtTime(g * 0.4, t + 0.002)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
    o.connect(og)
    out(og, 1, 0.12, 0.18)
  })

  // heartbeat: two soft sine thumps, 0.28 s apart
  const heartbeat = (t, { g = 0.16 } = {}) => at(t, () => {
    for (const [d, k] of [[0, 1], [0.28, 0.7]]) {
      const o = osc('sine', 58, t + d, 0.32)
      o.frequency.exponentialRampToValueAtTime(40, t + d + 0.16)
      const a = ac.createGain()
      a.gain.setValueAtTime(0.0001, t + d)
      a.gain.linearRampToValueAtTime(g * k, t + d + 0.006)
      a.gain.exponentialRampToValueAtTime(0.001, t + d + 0.2)
      o.connect(a)
      out(a, 1, 0.05)
    }
  })

  // pizz: very short filtered saw + noise pluck — the tiptoe
  const pizz = (t, m, { g = 0.06 } = {}) => at(t, () => {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1900
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.003)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    const o = osc('sawtooth', hz(m), t, 0.16)
    o.connect(lp)
    lp.connect(a)
    out(a, 1, 0.12, -0.15)
    const n = noise(t, 0.04)
    const hp = ac.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 3200
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0.0001, t)
    ng.gain.linearRampToValueAtTime(g * 0.35, t + 0.002)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
    n.connect(hp).connect(ng)
    out(ng, 1, 0.08, -0.15)
  })

  // snip: steel tick — high bandpass noise ping + tiny upward pitch sparkle
  const snip = (t, { g = 0.13 } = {}) => at(t, () => {
    const n = noise(t, 0.06)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 6200
    bp.Q.value = 4
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.002)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
    n.connect(bp).connect(a)
    out(a, 1, 0.2, 0.25)
    const o = osc('sine', 5200, t, 0.1)
    o.frequency.exponentialRampToValueAtTime(7800, t + 0.05)
    const og = ac.createGain()
    og.gain.setValueAtTime(0.0001, t)
    og.gain.linearRampToValueAtTime(g * 0.35, t + 0.002)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
    o.connect(og)
    out(og, 1, 0.2, 0.25)
  })

  // sting: 45.2 mirror reveal — brass-ish minor-2nd cluster (E/F in three octaves)
  // plus a noise burst. Short, hard attack.
  const sting = (t, { g = 0.3 } = {}) => at(t, () => {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(1500, t)
    lp.frequency.exponentialRampToValueAtTime(260, t + 0.5)
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.006)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
    for (const m of [40, 41, 52, 53, 64, 65])
      for (const det of [-4, 4]) {
        const o = osc('sawtooth', hz(m), t, 0.6)
        o.detune.value = det
        o.connect(lp)
      }
    lp.connect(a)
    out(a, 1, 0.3)
    const n = noise(t, 0.35)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 750
    bp.Q.value = 0.9
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0.0001, t)
    ng.gain.linearRampToValueAtTime(g * 0.5, t + 0.004)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    n.connect(bp).connect(ng)
    out(ng, 1, 0.35)
  })

  // screamRiser: sine+noise gliss rising into the peak, held and cut hard at tCut
  // (the whip) — the whip thud itself is the `whip` voice.
  const screamRiser = (t0, tPeak, tCut, { g = 0.1 } = {}) => at(t0, () => {
    const n = noise(t0, tCut - t0)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.6
    bp.frequency.setValueAtTime(300, t0)
    bp.frequency.exponentialRampToValueAtTime(3600, tPeak)
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t0)
    a.gain.exponentialRampToValueAtTime(g, tPeak - 0.02)
    a.gain.exponentialRampToValueAtTime(0.001, tCut - 0.12)
    a.gain.linearRampToValueAtTime(0, tCut)
    n.connect(bp).connect(a)
    out(a, 1, 0.25)
    const o = osc('sawtooth', 110, t0, tCut - t0)
    o.frequency.exponentialRampToValueAtTime(880, tPeak)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(500, t0)
    lp.frequency.exponentialRampToValueAtTime(4200, tPeak)
    const og = ac.createGain()
    og.gain.setValueAtTime(0.0001, t0)
    og.gain.exponentialRampToValueAtTime(g * 0.4, tPeak - 0.02)
    og.gain.exponentialRampToValueAtTime(0.001, tCut - 0.12)
    og.gain.linearRampToValueAtTime(0, tCut)
    o.connect(lp)
    lp.connect(og)
    out(og, 1, 0.25)
  })

  // scream: the voice itself — two sine glisses with blooming vibrato + breath noise,
  // peaks at tPeak (46.0), dies before the whip cut.
  const scream = (t, tPeak, tCut, { g = 0.11 } = {}) => at(t, () => {
    const sum = ac.createGain()
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, tPeak)
    a.gain.exponentialRampToValueAtTime(0.002, tCut - 0.14)
    a.gain.linearRampToValueAtTime(0, tCut)
    const lfo = osc('sine', 5.6, t, tCut - t)
    const lg = ac.createGain()
    lg.gain.value = 26
    lfo.connect(lg)
    for (const [f0, f1] of [[620, 930], [930, 1350]]) {
      const o = osc('sine', f0, t, tCut - t)
      o.frequency.exponentialRampToValueAtTime(f1, tPeak)
      lg.connect(o.detune)
      o.connect(sum)
    }
    const n = noise(t, tCut - t)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1400
    bp.Q.value = 1.2
    const ng = ac.createGain()
    ng.gain.value = 0.25
    n.connect(bp)
    bp.connect(ng)
    ng.connect(sum)
    sum.connect(a)
    out(a, 1, 0.35, 0.1)
  })

  // boom: the riser peak landing (46.0) — soft sub drop + low noise
  const boom = (t, { g = 0.16 } = {}) => at(t, () => {
    const o = osc('sine', 62, t, 1.2)
    o.frequency.exponentialRampToValueAtTime(31, t + 0.9)
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.02)
    a.gain.exponentialRampToValueAtTime(0.001, t + 1.1)
    o.connect(a)
    out(a, 1, 0.1)
    const n = noise(t, 0.6)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 300
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0.0001, t)
    ng.gain.linearRampToValueAtTime(g * 0.4, t + 0.03)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
    n.connect(lp)
    lp.connect(ng)
    out(ng, 1, 0.15)
  })

  // whip: 47.64 whip to black — very short low noise crack + sub drop, the LAST
  // sound before the chapel (true silence 47.8–50.0).
  const whip = (t, { g = 0.3 } = {}) => at(t, () => {
    const n = noise(t, 0.16)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(3200, t)
    lp.frequency.exponentialRampToValueAtTime(220, t + 0.1)
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.002)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    n.connect(lp)
    lp.connect(a)
    out(a, 1, 0.05)
    const o = osc('sine', 150, t, 0.2)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11)
    const og = ac.createGain()
    og.gain.setValueAtTime(0.0001, t)
    og.gain.linearRampToValueAtTime(g * 0.8, t + 0.004)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.13)
    o.connect(og)
    out(og, 1, 0.05)
  })

  // roomTone: barely-there room air under a long black hold — low sine cluster
  // (55–70 Hz) + a sliver of low-filtered noise floor. Instant-on at whisper level
  // (no attack transient — sines start at phase 0), gentle release at t1, so the
  // next entry emerges from stillness instead of dead digital silence. Must never
  // read as a note.
  const roomTone = (t0, t1, { g = 0.026 } = {}) => at(t0, () => {
    const sum = ac.createGain()
    sum.gain.setValueAtTime(g, t0)
    sum.gain.setValueAtTime(g, t1 - 0.4)
    sum.gain.linearRampToValueAtTime(0, t1)
    for (const [f, kg] of [[55, 0.55], [62.5, 0.34], [70, 0.22]]) {
      const o = osc('sine', f, t0, t1 - t0 + 0.05)
      const pg = ac.createGain()
      pg.gain.value = kg
      o.connect(pg)
      pg.connect(sum)
    }
    const n = noise(t0, t1 - t0 + 0.05)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 150
    const ng = ac.createGain()
    ng.gain.value = 0.15
    n.connect(lp)
    lp.connect(ng)
    ng.connect(sum)
    out(sum, 1, 0.05, 0, 0.25)
  })

  // thud: door — sub sine drop + muffled noise (params softened for the 29.5 door)
  const thud = (t, { g = 0.28, f0 = 90, f1 = 45, dur = 0.5 } = {}) => at(t, () => {
    const o = osc('sine', f0, t, dur + 0.15)
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.5)
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.008)
    a.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(a)
    out(a, 1, 0.08)
    const n = noise(t, dur * 0.6 + 0.06)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 380
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0.0001, t)
    ng.gain.linearRampToValueAtTime(g * 0.42, t + 0.01)
    ng.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.6)
    n.connect(lp)
    lp.connect(ng)
    out(ng, 1, 0.12)
  })

  // organ: drawbar voicing — sine partials 1/2/3/4× at [1, .6, .35, .2], chorus
  // detune + gentle vibrato on the fundamental, slow swell.
  const organ = (t, notes, dur, { g = 0.05, atk = 0.55 } = {}) => at(t, () => {
    const PARTS = [[1, 1], [2, 0.6], [3, 0.35], [4, 0.2]]
    const sum = ac.createGain()
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + atk)
    a.gain.setValueAtTime(g, t + Math.max(atk + 0.05, dur - 0.45))
    a.gain.linearRampToValueAtTime(0, t + dur)
    const lfo = osc('sine', 5.4, t, dur)
    const lg = ac.createGain()
    lg.gain.value = 3.5
    lfo.connect(lg)
    for (const m of notes) {
      const f = hz(m)
      for (const [mult, kg] of PARTS) {
        if (f * mult > 7500) continue
        const o = osc('sine', f * mult, t, dur + 0.05)
        const pg = ac.createGain()
        pg.gain.value = kg
        o.connect(pg)
        pg.connect(sum)
        if (mult === 1) {
          const o2 = osc('sine', f, t, dur + 0.05)
          o2.detune.value = 4
          const pg2 = ac.createGain()
          pg2.gain.value = kg * 0.7
          lg.connect(o2.detune)
          o2.connect(pg2)
          pg2.connect(sum)
        }
      }
    }
    sum.connect(a)
    out(a, 1, 0.45, 0, 0.4)
  })

  // bell: tubular bell — sine + inharmonic partials (2.76×, 5.4×), long soft decay
  const bell = (t, m, { g = 0.09, dur = 2.5, pan = 0 } = {}) => at(t, () => {
    const f = hz(m)
    for (const [mult, kg, kd] of [[1, 1, 1], [2.76, 0.35, 0.55], [5.4, 0.12, 0.3]]) {
      const o = osc('sine', f * mult, t, dur * kd + 0.1)
      const pg = ac.createGain()
      pg.gain.setValueAtTime(0.0001, t)
      pg.gain.linearRampToValueAtTime(g * kg, t + 0.004)
      pg.gain.exponentialRampToValueAtTime(0.001, t + dur * kd)
      o.connect(pg)
      out(pg, 1, 0.5, pan)
    }
  })
  // bells: staggered peal (0.14 s apart), spread in stereo
  const bells = (t, ms, opts = {}) =>
    ms.forEach((m, i) => bell(t + i * 0.14, m, { ...opts, pan: (i - (ms.length - 1) / 2) * 0.16 }))

  // stab: organ chord stab + bell partial — hard attack, quarter-note decay.
  // One per de-wigging cut; may peak higher than the beds but plays alone.
  const stab = (t, { g = 0.3 } = {}) => at(t, () => {
    const sum = ac.createGain()
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.006)
    a.gain.exponentialRampToValueAtTime(0.001, t + BEAT)
    for (const m of [45, 52, 57, 60, 64])
      for (const [mult, kg] of [[1, 1], [2, 0.5]]) {
        const o = osc('sine', hz(m) * mult, t, BEAT + 0.1)
        const pg = ac.createGain()
        pg.gain.value = kg
        o.connect(pg)
        pg.connect(sum)
      }
    sum.connect(a)
    out(a, 1, 0.35)
    const ring = osc('sine', hz(69) * 2.76, t, 0.5)
    const rg = ac.createGain()
    rg.gain.setValueAtTime(0.0001, t)
    rg.gain.linearRampToValueAtTime(g * 0.22, t + 0.004)
    rg.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    ring.connect(rg)
    out(rg, 1, 0.5, 0.2)
    const n = noise(t, 0.07)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 3000
    bp.Q.value = 1.5
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0.0001, t)
    ng.gain.linearRampToValueAtTime(g * 0.16, t + 0.002)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    n.connect(bp)
    bp.connect(ng)
    out(ng, 1, 0.2)
  })

  // creep: S2 strings — slow linear crescendo cut dead at t1 (44.5 drop-out)
  const creep = (t0, t1, notes, { g = 0.06, cut = 900 } = {}) => at(t0, () => {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = cut
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t0)
    a.gain.linearRampToValueAtTime(g, t1 - 0.02)
    a.gain.linearRampToValueAtTime(0, t1)
    for (const m of notes)
      for (const det of [-8, 0, 8]) {
        const o = osc('sawtooth', hz(m), t0, t1 - t0 + 0.05)
        o.detune.value = det
        o.connect(lp)
      }
    lp.connect(a)
    out(a, 1, 0.4, 0, 0.5)
  })

  // melody helper: plays a strain's bars (2.0 s apart) through the pluck
  const playStrain = (bars, t0, { g = 0.14, oct = 0, echo = true, skip = null } = {}) =>
    bars.forEach((bar, i) => {
      for (const [b, d, m] of bar) {
        const tt = t0 + i * 2 + b * BEAT
        if (skip && skip(tt)) continue
        pluck(tt, m + 12 * oct, { g, echo, decay: 0.3 + d * 0.25 })
      }
    })

  // ================= S1 THE STUDY (0–28) — sparse Sicilian waltz =================
  pluck(STUDY_EV.studioCard, 69, { g: 0.12 }) // 0.6 first pluck, picture start
  const PICKUP = [64, 69, 72]
  PICKUP.forEach((m, i) => pluck(STUDY_EV.bonaseraEnter + i * 0.35, m, { g: 0.1 })) // 1.6 pickup under the door

  const A0 = STUDY_EV.cityCard // 4.0 — oom-pah-pah settles on the cityCard bar
  const BONLINE_T = caption('bonLine').t0 // 14.8 — waltz drops to bass + triangle
  const DONLINE_END = caption('donLine').t1 // 22.6 — swell releases
  const IRIS_T = STUDY_EV.iris // 27.4
  const A_PROG = ['Am', 'Am', 'Dm', 'Am', 'E7', 'Am', 'E7', 'Am', 'Dm', 'Am', 'Dm', 'E7']
  for (let i = 0; i < 12; i++) {
    const t0 = A0 + i * 2, ch = CH[A_PROG[i]]
    oom(t0, ch.root)
    const bothBeats = t0 < BONLINE_T || (t0 >= 24 && t0 < 26)
    if (bothBeats) pah(t0, ch.chord)
    else
      for (const bt of [1, 2]) {
        const tt = t0 + bt * BEAT
        // partial bars: 14 (keep 14.667 only), 22 (pah returns at 23.0), 26 (drop 27.333)
        if ((t0 < BONLINE_T && tt < BONLINE_T) || (tt >= 23.0 && tt < IRIS_T - 0.1)) pahStab(tt, ch.chord)
      }
    for (const bt of [1, 2]) tri(t0 + bt * BEAT)
    if (t0 >= BONLINE_T && t0 < STUDY_EV.donRise) tri(t0) // bonLine: triangle keeps all three beats
  }
  playStrain(MEL_A, A0, { skip: (tt) => tt >= BONLINE_T }) // A strain 4.0–20.0; melody rests at the drop
  // favor line 23.0–27.4 — B2 tail + B3, B4 with its resolution anticipated to 27.4
  const FAVOR = [[23.0, 72], [24.0, 69], [24.0, 77], [25.0, 74], [25.5, 72], [26.0, 74], [26.0, 71], [27.0, 68], [IRIS_T, 64]]
  for (const [tt, m] of FAVOR) pluck(tt, m, { g: 0.11 })
  pad(STUDY_EV.titleIn, [45, 57, 60, 64], 6.6, { g: 0.045 }) // 8.0 title swell (out 14.6)
  pad(STUDY_EV.donRise, [33, 45, 52], DONLINE_END - STUDY_EV.donRise, { g: 0.06, cut: 700 }) // 18.8 low swell → 22.6
  oom(BONLINE_T, 45, { g: 0.13 }) // soft bass touch as the waltz drops for bonLine
  pluck(DONLINE_END, 45, { g: 0.05, echo: false }) // bridge breath as the swell releases
  for (const m of [57, 64]) pizz(STUDY_EV.kissRing, m, { g: 0.05 }) // 26.0 muted ring-kiss chord
  // 28.0: waltz STOPS dead on the bar — nothing is scheduled between 27.4 and 29.5

  // ================= S2 THE RAZOR'S VISIT (28–50) — creep =================
  thud(VC(VISIT_EV.enter), { g: 0.12, f0: 70, f1: 42, dur: 0.35 }) // 29.5 door, muffled
  for (let k = 0; k < 8; k++) heartbeat(T.visit + 2 + k * 2, { g: 0.15 }) // 30.0→44.0 on bar lines, out by 44.5
  const TIPTOE = [57, 60, 64, 60, 62, 65, 62, 64, 67, 64, 60, 57]
  const TIP0 = VC(VISIT_EV.tiptoeStart) // 30.5
  let ti = 0
  for (let tt = TIP0; tt < VC(VISIT_EV.vanish) - 0.2; tt += BEAT) {
    const bob = Math.abs(Math.sin((tt - TIP0) * 2.4)) // lead enforcer bob phase (enforcerPath)
    pizz(tt, TIPTOE[ti % TIPTOE.length], { g: 0.055 * (0.75 + 0.25 * bob) })
    ti++
  }
  snip(VC(VISIT_EV.snip1)) // 35.5 steel glint 1 (doubles FLASHES[0])
  snip(VC(VISIT_EV.snip2)) // 36.6 steel glint 2 (doubles FLASHES[1])
  kit.whoosh(VC(VISIT_EV.vanish), 0.5, 0.1, 400, 1600) // 38.0 silhouettes gone — pizz stops
  const HEAD_T = VC(VISIT_EV.headTouch) // 44.5 — EVERYTHING drops out
  creep(VC(VISIT_EV.stir), HEAD_T, [33, 40, 45], { g: 0.05 }) // 40.0 strings creep up
  creep(VC(VISIT_EV.sheetPull), HEAD_T, [45, 52, 57, 60], { g: 0.07 }) // 40.5 slow crescendo to the reveal
  creep(VC(VISIT_EV.wigReveal), HEAD_T, [57, 60, 64], { g: 0.05, cut: 1400 }) // 43.0 reveal shade
  const STING_T = VC(VISIT_EV.mirrorJump) // 45.2 — the hit-stop retimes sting and picture together
  const SCREAM_T = VC(VISIT_EV.scream) // 45.54
  const PEAK_T = SCREAM_T + 0.46 // 46.0 — riser peaks on the half-bar
  const WHIP_T = VC(VISIT_EV.whip) // 47.64
  sting(STING_T)
  screamRiser(STING_T, PEAK_T, WHIP_T - 0.04) // gliss into 46.0, cut at the whip
  scream(SCREAM_T, PEAK_T, WHIP_T - 0.06)
  boom(PEAK_T, { g: 0.15 })
  whip(WHIP_T) // last percussive sound; true silence follows
  roomTone(WHIP_T + 0.56, CC(CHAPEL_EV.establish) - 0.3, { g: 0.026 }) // 48.2→49.7 room air carries the black hold

  // ================= S3 THE CROWNING WAR (50–80) — chapel organ + bells =================
  const STABS = MONTAGE.map((v) => v.stab) // 58.4 61.4 64.4 67.4 70.0 71.1 72.2 — ON the cuts
  organ(CC(CHAPEL_EV.establish), [45, 57, 60], CC(CHAPEL_EV.anoint) - CC(CHAPEL_EV.establish), { g: 0.05 }) // 50.0 enter on the bar
  organ(CC(CHAPEL_EV.anoint), [45, 52, 57, 60, 64], 0.9, { g: 0.07, atk: 0.25 }) // 53.0 full chord
  bell(CC(CHAPEL_EV.anoint), 69, { g: 0.09 }) // first bell 53.0
  const Q_T = CC(CHAPEL_EV.question) // 53.4
  organ(Q_T, [45, 57], caption('priestQ').t1 - Q_T, { g: 0.04 }) // thins under the question
  organ(caption('priestQ').t1, [45, 52, 57, 60], STABS[0] - caption('priestQ').t1, { g: 0.05 }) // swells back to the first stab
  for (let i = 0; i < 3; i++) organ(STABS[i] + 0.4, [45, 60, 64], STABS[i + 1] - STABS[i] - 0.5, { g: 0.04 }) // organ resumes between stabs
  organ(STABS[3] + 0.4, [45, 60, 64], MONTAGE[4].t0 - 0.5 - STABS[3], { g: 0.04 }) // last bed ducks before the barrage
  for (const s of STABS) stab(s)
  kit.taiko(MONTAGE[4].t0, 0.5) // barrage percussion 69.6–72.9
  kit.taiko(MONTAGE[5].t0, 0.45)
  kit.taiko(MONTAGE[6].t0, 0.5)
  kit.swell(MONTAGE[4].t0, CC(CHAPEL_EV.bells), 0.05) // roll rising into the peal
  bells(CC(CHAPEL_EV.bells), [69, 76, 81, 76], { g: 0.075 }) // peal 71.0 under the barrage peak
  const RET = MONTAGE[6].t1 + 0.1 // 73.0 — chapel return on the bar (barrage ends 72.9)
  organ(RET, [45, 57, 60, 64], CC(CHAPEL_EV.rise) - RET, { g: 0.055 })
  organ(CC(CHAPEL_EV.rise), [45, 52, 57, 60, 64, 72], caption('donTitle').t0 - CC(CHAPEL_EV.rise), { g: 0.065, atk: 0.3 }) // 74.0 resolve, holds under the title
  organ(caption('donTitle').t0, [45, 60, 64, 69], CC(CHAPEL_EV.iris) - caption('donTitle').t0, { g: 0.045 }) // 76.4 soft restrike beneath DON OF THE FLOW
  organ(CC(CHAPEL_EV.iris), [33, 45], 0.9, { g: 0.05, atk: 0.15 }) // 79.4 thins to one pedal tone, fades into S4

  // ================= S4 THE NEW DON (80–90) — the waltz returns darker, solo =================
  const S4_0 = T.end + END_EV.studyIn // 80.0
  const S4_PROG = ['Am', 'Am', 'E7']
  for (let i = 0; i < 3; i++) oom(S4_0 + i * 2, CH[S4_PROG[i]].root, { g: 0.16 }) // whole-bar oom only, no pah
  const STROKE_T = T.end + END_EV.stroke // 84.0
  // A strain one octave down, pluck alone; the 84.0 downbeat is dropped (holds its breath)
  playStrain(MEL_A.slice(0, 2), S4_0, { g: 0.12, oct: -1, skip: (tt) => tt >= STROKE_T - 0.05 })
  pluck(T.end + END_EV.wigPickup, 69, { g: 0.06 }) // 83.0 ghost of the film's opening note — breath held
  const PHRASE = [[0, 64], [BEAT, 62], [1, 59]] // the stroke: one phrase, left hanging on the leading tone
  for (const [d, m] of PHRASE) pluck(STROKE_T + d, m, { g: 0.11, echo: false })
  thud(T.end + END_EV.doorClose, { g: 0.3 }) // 85.5 door — waltz CUT dead
  bell(T.end + END_EV.doorClose + 0.7, 69, { g: 0.1, dur: 2.2 }) // single bell 86.2, decayed before 88.5
  // 88.5 ALL MUSIC OUT — nothing is scheduled after the bell's decay
}
