// THE WIZARD OF FLOZ — There's No Place Like Growth. Original score, golden-age
// musical-fantasy idiom (every tune original — nothing quotes 1939 or the catalog).
// All cue times come from ./timeline.js (CUES / MASTER / per-shot EV tables /
// makeClock.abs / b() grids / beatSec / barSec / HORSE_STEP / KNEEL_STAGGER) —
// nothing here hand-adds t0 + g, and this film declares NO hit-stops, so every
// clock satisfies abs(g) = t0 + g exactly (story.md §3; timeline CLOCK RULE).
//
// MOTIF PLAN (all original):
//   HOME  [0,+4,+2,-3,0] root 69 — long-long-short-long-held. The fingerprint is
//         the dip BELOW the root (the homesick note). Stated plainly in sepia S1
//         (music box, bar 1 under the title); blooms in the munchkin chorus S3;
//         quoted as FRAGMENTS by each companion on join in S4 (reed / metal /
//         growl); drugged flat in S5; ABSENT S6-S8 (the wizard never had it, the
//         witch stole it); rebuilt by the three heel clicks in S10 — click 1 the
//         dip fragment (-3 -> root), click 2 the rising fragment, click 3 the
//         FULL motif in full ensemble resolving to a held tonic under the color
//         drain; then the S1 statement returns as the sepia bedroom reprise.
//   WITCH [0,+1,0,-1,-5] root 57 — staccato wiggle up, wiggle down, flat drop
//         (the "wig fall"). First statement dopplering past the S2 window at
//         MASTER.transform; answered by the fanfare at the S3 slippers; dark
//         statement in the smoke at S3 witchSmoke; full dominance S7; detuned
//         DOWN a semitone cluster with the melt in S8; two quiet dry notes as
//         the sequel-tease wink after the S10 button.
//   FLOZ  [0,+4,+7,+12] root 65 — bright triadic rip that ANSWERS the cackle.
//         Detonates EXACTLY on CUES.burst 20.0 (the Technicolor cut frame);
//         munchkin march borrows its bounce; in S6 it returns MINOR and dark
//         (root 41: [0,+3,+7,+12]) as the doom command over timpani.
//
// CUSTOM VOICES BUILT (core has no organ/brass/celesta/harp/musicBox/gliss):
//   organN      — hollow additive sines at 1x / 0.5x / 2.76x (the wizard's doom
//                 voice, pirates hollowBell lineage) + sub/braam for the boom
//   boxNote     — music box (bright additive bell at hz(m+12), kit.bell recipe)
//   quack       — the witch's cackle note (duty square through a formant band)
//   brassN      — detuned-saw stab/horn (goldflow lineage)
//   reedN       — 12%-duty whistle (piccolo/munchkin + scarecrow)
//   metalN      — inharmonic metallic ping (tin man)
//   growlN      — wobbly low brass (lion)
//   tapeStop    — tape-stop pitch drop (the giant head glitching)
//   drowseN     — pitch-drifting voice: slides flat (poppies win) or rises back
//                 to true pitch (Glinda's snow reverses it)
//   screamPad   — rising bandpassed saw/square (the melt: her voice goes UP)
//   gliss runs  — bell runs at ~0.055-0.09 s spacing (no gliss helper exists)
//
// SCHEDULING DISCIPLINE: kit.events is sorted ONCE after score() returns, so no
// kit instrument is ever called inside an at() callback — composite voices
// (cackle/motif/ostinato runs) build raw osc->gain->out nodes inside ONE at()
// instead. Every node chain is gain/filter-shaped and leaves through kit.out()
// with an explicit envelope; exponential ramps always land positive (0.001).
//
// LOUDNESS STRATEGY (engine peak-normalises to -1 dBFS + two-pass -14 LUFS; our
// job is internal balance so loudnorm never pumps):
//   tier 1 beds (pads/drones/winds/washes)      g 0.026-0.05
//   tier 2 ostinati + plucks + ticks            g 0.03-0.066
//   tier 3 leads (box/reed/quack/growl)         g 0.045-0.09
//   tier 4 pins/stabs/hits (sparse)             g 0.1-0.16, impact <= 0.45
// Bass stays short and dark (cut <= 500) so it never masks the music box; the
// S3 fanfare, S2 thud, S6 doom and S8 kneel are the only tier-4 moments in
// their neighborhoods. The final plagal button and the tease wink are built
// ALL-DRY (send 0) so the shared IR never re-excites and the film ends on a
// clean intentional decay ~0.9 s before the last frame.
import {
  BRICKROAD,
  BRICKROAD_EV,
  CUES,
  CURTAIN,
  CURTAIN_EV,
  EMERALD,
  EMERALD_EV,
  FLOZ,
  FLOZBURST,
  FLOZBURST_EV,
  FLOZ_ROOT,
  GROWTH,
  GROWTH_EV,
  HOME,
  HOME_ROOT,
  HORSE_STEP,
  KANSAS,
  KANSAS_EV,
  KNEEL_STAGGER,
  MELT,
  MELT_EV,
  MONKEYS,
  MONKEYS_EV,
  MASTER,
  POPPIES,
  POPPIES_EV,
  TWISTER,
  TWISTER_EV,
  WITCH,
  WITCH_ROOT,
  b,
  barSec,
  beatSec,
} from './timeline.js'

const KS = KANSAS.abs
const TW = TWISTER.abs
const FZ = FLOZBURST.abs
const BR = BRICKROAD.abs
const PP = POPPIES.abs
const EM = EMERALD.abs
const MK = MONKEYS.abs
const ML = MELT.abs
const CN = CURTAIN.abs
const GR = GROWTH.abs

// HOME rhythm: long-long-short-long-held. Steps in units u; one statement = 10u.
const HOME_STEPS = [0, 2, 4, 5, 7]
const homeDur = (u, i) => ((i < 4 ? HOME_STEPS[i + 1] : 10) - HOME_STEPS[i]) * u

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit

  // ---------- node builders (call ONLY inside at(); see header) ----------
  // felt piano-ish root for the sepia waltz
  const pianoN = (m, t, d, g, pan = -0.08) => {
    const f = hz(m)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.012)
    a.gain.exponentialRampToValueAtTime(0.001, t + d)
    for (const [mul, kg] of [[1, 1], [2.001, 0.28]]) {
      const o = osc('sine', f * mul, t, d)
      const og = ac.createGain()
      og.gain.value = kg
      o.connect(og).connect(a)
    }
    out(a, 1, 0.25, pan)
  }
  // soft pluck chord (the pah-pah)
  const strumN = (notes, t, d, g, pan = 0.08) => {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2100
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.008)
    a.gain.exponentialRampToValueAtTime(0.001, t + d)
    for (const m of notes) {
      const o = osc('sawtooth', hz(m), t, d)
      o.connect(lp)
    }
    lp.connect(a)
    out(a, 1, 0.22, pan)
  }
  // music box: bright additive bell an octave up (kit.bell hz(m+12) recipe)
  const boxNote = (m, t, d, g = 0.045, pan = 0, dry = false) => {
    const f = hz(m + 12)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.003)
    a.gain.exponentialRampToValueAtTime(0.001, t + d)
    for (const [mul, kg] of [[1, 1], [3.42, 0.22], [6.8, 0.06]]) {
      const o = osc('sine', f * mul, t, d)
      const og = ac.createGain()
      og.gain.value = kg
      o.connect(og).connect(a)
    }
    out(a, 1, dry ? 0 : 0.3, pan)
  }
  // dry gift chime (end button — must not excite the shared IR)
  const chimeN = (m, t, d, g = 0.05, pan = 0) => {
    const f = hz(m)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.004)
    a.gain.exponentialRampToValueAtTime(0.001, t + d)
    for (const [mul, kg] of [[1, 1], [2, 0.4], [3.01, 0.16]]) {
      const o = osc('sine', f * mul, t, d)
      const og = ac.createGain()
      og.gain.value = kg
      o.connect(og).connect(a)
    }
    out(a, 1, 0, pan)
  }
  // bright fanfare bell
  const bellN = (m, t, d, g = 0.05, pan = 0) => {
    const f = hz(m + 12)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.003)
    a.gain.exponentialRampToValueAtTime(0.001, t + d)
    for (const [mul, kg] of [[1, 1], [4, 0.3], [5.9, 0.12]]) {
      const o = osc('sine', f * mul, t, d)
      const og = ac.createGain()
      og.gain.value = kg
      o.connect(og).connect(a)
    }
    out(a, 1, 0.35, pan)
  }
  // the witch's cackle note: duty square through a nasal formant
  const quack = (m, t, d, g = 0.09, pan = 0, drop = false, dry = false) => {
    const f = hz(m)
    const o = osc('square', f * 1.05, t, d + 0.02)
    if (drop) o.frequency.exponentialRampToValueAtTime(f * 0.88, t + d)
    else o.frequency.exponentialRampToValueAtTime(f, t + 0.05)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = Math.min(2200, f * 3)
    bp.Q.value = 2
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.012)
    a.gain.exponentialRampToValueAtTime(0.001, t + d)
    o.connect(bp).connect(a)
    out(a, 1, dry ? 0 : 0.16, pan)
  }
  // wizard organ: hollow additive sines at 1 / 0.5 / 2.76 (pirates hollowBell)
  const organN = (m, t, d, g = 0.07, pan = 0) => {
    const f = hz(m)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.02)
    a.gain.exponentialRampToValueAtTime(0.001, t + d)
    for (const [mul, kg] of [[1, 1], [0.5, 0.4], [2.76, 0.22]]) {
      const o = osc('sine', f * mul, t, d)
      const og = ac.createGain()
      og.gain.value = kg
      o.connect(og).connect(a)
    }
    out(a, 1, 0.45, pan)
  }
  // detuned-saw brass stab (goldflow lineage)
  const brassN = (m, t, d, g = 0.13, pan = 0.05) => {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(1100, t)
    lp.frequency.linearRampToValueAtTime(2600, t + 0.12)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.035)
    a.gain.setValueAtTime(g, t + Math.max(0.05, d - 0.15))
    a.gain.linearRampToValueAtTime(0, t + d)
    for (const det of [-5, 5]) {
      const o = osc('sawtooth', hz(m) * 0.985, t, d)
      o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.08)
      o.detune.value = det
      o.connect(lp)
    }
    lp.connect(a)
    out(a, 1, 0.28, pan)
  }
  // dread celli: detuned saw pair, quick bow
  const celliN = (m, t, d, g = 0.05, pan = 0, cut = 850) => {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = cut
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.03)
    a.gain.setValueAtTime(g, t + Math.max(0.05, d - 0.07))
    a.gain.linearRampToValueAtTime(0, t + d)
    for (const det of [-7, 6]) {
      const o = osc('sawtooth', hz(m), t, d + 0.02)
      o.detune.value = det
      o.connect(lp)
    }
    lp.connect(a)
    out(a, 1, 0.2, pan)
  }
  // 12%-duty whistle (piccolo / scarecrow)
  const waves = {}
  const dutyWave = (duty) => {
    if (waves[duty]) return waves[duty]
    const n = 48
    const re = new Float32Array(n)
    const im = new Float32Array(n)
    for (let k = 1; k < n; k++) {
      re[k] = ((2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty)) * Math.cos(k * Math.PI * duty)
      im[k] = ((2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty)) * Math.sin(k * Math.PI * duty)
    }
    return (waves[duty] = ac.createPeriodicWave(re, im))
  }
  const reedN = (m, t, d, g = 0.075, pan = 0) => {
    const f = hz(m)
    const o = osc('square', f, t, d + 0.02)
    o.setPeriodicWave(dutyWave(0.12))
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = Math.min(2400, f * 4)
    bp.Q.value = 0.9
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.018)
    a.gain.setValueAtTime(g, t + Math.max(0.03, d - 0.06))
    a.gain.linearRampToValueAtTime(0, t + d)
    o.connect(bp).connect(a)
    out(a, 1, 0.18, pan)
  }
  // tin man: inharmonic metallic ping
  const metalN = (m, t, d, g = 0.05, pan = 0) => {
    const f = hz(m)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.002)
    a.gain.exponentialRampToValueAtTime(0.001, t + Math.min(d, 0.7))
    for (const [mul, kg] of [[1, 1], [2.4, 0.35], [3.9, 0.22], [5.4, 0.12]]) {
      const o = osc('sine', f * mul, t, Math.min(d, 0.7))
      const og = ac.createGain()
      og.gain.value = kg
      o.connect(og).connect(a)
    }
    out(a, 1, 0.3, pan)
  }
  // cowardly lion: wobbly low brass
  const growlN = (m, t, d, g = 0.07, pan = 0) => {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.06)
    a.gain.setValueAtTime(g, t + Math.max(0.1, d - 0.2))
    a.gain.linearRampToValueAtTime(0, t + d)
    const lfo = osc('sine', 6, t, d)
    const lg = ac.createGain()
    lg.gain.value = 18
    lfo.connect(lg)
    for (const det of [-25, 20]) {
      const o = osc('sawtooth', hz(m), t, d)
      o.detune.value = det
      lg.connect(o.detune)
      o.connect(lp)
    }
    lp.connect(a)
    out(a, 1, 0.24, pan)
  }
  // square pluck (munchkin piccolo / pizzicato / banjo roll)
  const pluckN = (m, t, d, g = 0.05, pan = 0) => {
    const o = osc('square', hz(m), t, d + 0.04)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.Q.value = 2
    lp.frequency.setValueAtTime(3800, t)
    lp.frequency.exponentialRampToValueAtTime(600, t + d)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.004)
    a.gain.exponentialRampToValueAtTime(0.001, t + d)
    o.connect(lp).connect(a)
    out(a, 1, 0.14, pan)
  }
  // jaunty tuba
  const tubaN = (m, t, d, g = 0.14, pan = 0) => {
    const o = osc('sawtooth', hz(m), t, d + 0.05)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 300
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.025)
    a.gain.setValueAtTime(g, t + Math.max(0.04, d - 0.08))
    a.gain.linearRampToValueAtTime(0, t + d)
    o.connect(lp).connect(a)
    out(a, 1, 0.12, pan)
  }
  // wood block / knock / clop / spear click — entry m is HERTZ here
  const woodN = (f, t, d, g = 0.05, pan = 0) => {
    const o = osc('sine', f, t, 0.07)
    o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.035)
    const a = ac.createGain()
    a.gain.setValueAtTime(g, t)
    a.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.05, d))
    o.connect(a)
    out(a, 1, 0.06, pan)
  }
  // metallic ring clatter (curtain rings)
  const ringN = (f, t, d, g = 0.035, pan = 0) => {
    const o = osc('square', f, t, 0.06)
    const hp = ac.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1500
    const a = ac.createGain()
    a.gain.setValueAtTime(g, t)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
    o.connect(hp).connect(a)
    out(a, 1, 0.12, pan)
  }
  // Hz blip (horns, squeaks, ricochets) — entry m is HERTZ
  const blipN = (f, t, d, g = 0.035, pan = 0) => {
    const o = osc('square', f, t, d)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.004)
    a.gain.exponentialRampToValueAtTime(0.001, t + d)
    o.connect(a)
    out(a, 1, 0.1, pan)
  }
  // cauldron blub — entry m is HERTZ, pitch blooms up
  const bubbleN = (f, t, d, g = 0.028, pan = 0) => {
    const o = osc('sine', f, t, d)
    o.frequency.exponentialRampToValueAtTime(f * 1.5, t + d)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.02)
    a.gain.exponentialRampToValueAtTime(0.001, t + d)
    o.connect(a)
    out(a, 1, 0.18, pan)
  }
  // mini boom (projectionist kick pedal)
  const kickN = (m, t, d, g = 0.2, pan = 0) => {
    const o = osc('sine', 150, t, 0.3)
    o.frequency.exponentialRampToValueAtTime(55, t + 0.12)
    const a = ac.createGain()
    a.gain.setValueAtTime(g, t)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
    o.connect(a)
    out(a, 1, 0.1, pan)
  }
  // mini timpani (doom command)
  const taikoN = (m, t, d, g = 0.36, pan = 0) => {
    const o = osc('sine', 140, t, 0.6)
    o.frequency.exponentialRampToValueAtTime(58, t + 0.07)
    const a = ac.createGain()
    a.gain.setValueAtTime(g, t)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
    o.connect(a)
    out(a, 1, 0.3, pan)
    const n = noise(t, 0.12)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 260
    const ng = ac.createGain()
    ng.gain.setValueAtTime(g * 0.6, t)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    n.connect(bp).connect(ng)
    out(ng, 1, 0.3, pan)
  }
  // monkey-dive swoop (noise falling through a band)
  const swoopN = (m, t, d, g = 0.08, pan = 0) => {
    const n = noise(t, d)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.6
    bp.frequency.setValueAtTime(2600, t)
    bp.frequency.exponentialRampToValueAtTime(550, t + d)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + d * 0.4)
    a.gain.linearRampToValueAtTime(0, t + d)
    n.connect(bp).connect(a)
    out(a, 1, 0.25, pan)
  }
  // pitch-drifting voice: cents < 0 slides flat (the poppies win); cents > 0
  // starts flat and rises back to TRUE pitch (Glinda's snow reverses it)
  const drowseN = (m, t, d, g = 0.05, pan = 0, cents = -60) => {
    const f = hz(m)
    const k = Math.pow(2, Math.abs(cents) / 1200)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.12)
    a.gain.setValueAtTime(g, t + Math.max(0.15, d - 0.25))
    a.gain.linearRampToValueAtTime(0, t + d)
    for (const [type, kg] of [['sine', 1], ['triangle', 0.35]]) {
      const o = osc(type, cents < 0 ? f : f / k, t, d)
      o.frequency.exponentialRampToValueAtTime(cents < 0 ? f / k : f, t + d * 0.8)
      const og = ac.createGain()
      og.gain.value = kg
      o.connect(og).connect(a)
    }
    out(a, 1, 0.3, pan)
  }

  // ---------- composite voices (self-wrapping: one at() = one cue) ----------
  // generic note run: entries [[dt, note, dur]] — one cue per run
  const run = (t0, entries, node, { g = 0.05, dec = 1, pan = 0, panStep = 0 } = {}) =>
    at(t0, () =>
      entries.forEach(([dt, m, d], i) => node(m, t0 + dt, d, g * Math.pow(dec, i), pan + panStep * i)),
    )
  const nz = (t, dur, { f = 4000, type = 'highpass', g = 0.08, q = 0.7, f1 = null, pan = 0, send = 0.08 } = {}) =>
    at(t, () => {
      const n = noise(t, dur)
      const flt = ac.createBiquadFilter()
      flt.type = type
      flt.frequency.setValueAtTime(f, t)
      flt.Q.value = q
      if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      n.connect(flt).connect(a)
      out(a, 1, send, pan)
    })
  const creak = (t, dur = 1.0, { g = 0.03 } = {}) =>
    at(t, () => {
      const o = osc('sawtooth', 82, t, dur)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 300
      bp.Q.value = 9
      const lfo = osc('sine', 2.1, t, dur)
      const lg = ac.createGain()
      lg.gain.value = 90
      lfo.connect(lg).connect(bp.frequency)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + dur * 0.35)
      a.gain.linearRampToValueAtTime(0, t + dur)
      o.connect(bp).connect(a)
      out(a, 1, 0.3, -0.15)
    })
  const zip = (t, f0, f1, dur, g = 0.045, pan = 0) =>
    at(t, () => {
      const o = osc('sine', f0, t, dur)
      o.frequency.exponentialRampToValueAtTime(f1, t + dur)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.connect(a)
      out(a, 1, 0.12, pan)
    })
  // Glinda shimmer: detuned sine pair + slow tremolo (pirates glass lineage)
  const glassPad = (t, m, dur, { g = 0.034, send = 0.45, pan = 0 } = {}) =>
    at(t, () => {
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.35)
      a.gain.setValueAtTime(g, t + Math.max(0.4, dur - 0.5))
      a.gain.linearRampToValueAtTime(0, t + dur)
      for (const det of [-5, 4]) {
        const o = osc('sine', hz(m), t, dur)
        o.detune.value = det
        o.connect(a)
      }
      const sh = osc('sine', 4.5, t, dur)
      const sg = ac.createGain()
      sg.gain.value = g * 0.35
      sh.connect(sg).connect(a.gain)
      out(a, 1, send, pan)
    })
  // held breath that gets CHOPPED at t1 (S2 -> S3 hard cut): 6 ms blade, no release
  const breath = (t0, t1, { g = 0.07, f = 500 } = {}) =>
    at(t0, () => {
      const n = noise(t0, t1 - t0)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = f
      bp.Q.value = 0.7
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + (t1 - t0) * 0.75)
      a.gain.setValueAtTime(g, t1 - 0.006)
      a.gain.linearRampToValueAtTime(0, t1)
      n.connect(bp).connect(a)
      out(a, 1, 0.2)
    })
  // cow flyby
  const moo = (t) =>
    at(t, () => {
      const o = osc('sawtooth', 150, t, 0.6)
      o.frequency.exponentialRampToValueAtTime(92, t + 0.5)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 380
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(0.07, t + 0.06)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.58)
      o.connect(lp).connect(a)
      out(a, 1, 0.2, -0.3)
    })
  // the lion's roar — deflates mid-note (a whole tone down, dying)
  const roar = (t) =>
    at(t, () => {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(700, t)
      lp.frequency.exponentialRampToValueAtTime(200, t + 0.9)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(0.12, t + 0.05)
      a.gain.exponentialRampToValueAtTime(0.001, t + 1.0)
      for (const det of [-12, 9]) {
        const o = osc('sawtooth', hz(45) * 1.26, t, 1.0)
        o.frequency.exponentialRampToValueAtTime(hz(41), t + 0.8)
        o.detune.value = det
        o.connect(lp)
      }
      lp.connect(a)
      out(a, 1, 0.25, 0.1)
    })
  // the melt scream: bandpassed saw/square RISING (her voice goes up two octaves)
  const screamPad = (t0, t1, { g = 0.058 } = {}) =>
    at(t0, () => {
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.Q.value = 1.4
      bp.frequency.setValueAtTime(700, t0)
      bp.frequency.exponentialRampToValueAtTime(2600, t1)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + 0.5)
      a.gain.setValueAtTime(g, t1 - 0.3)
      a.gain.linearRampToValueAtTime(0, t1)
      const o = osc('sawtooth', 300, t0, t1 - t0)
      o.frequency.exponentialRampToValueAtTime(1150, t1)
      const o2 = osc('square', 600, t0, t1 - t0)
      o2.frequency.exponentialRampToValueAtTime(2300, t1)
      const g2 = ac.createGain()
      g2.gain.value = 0.3
      o.connect(bp)
      o2.connect(g2).connect(bp)
      bp.connect(a)
      out(a, 1, 0.3, 0.08)
    })
  // tape-stop pitch drop (the giant head glitches)
  const tapeStop = (t, dur, { g = 0.05, f0 = 180, pan = -0.1 } = {}) =>
    at(t, () => {
      const o = osc('sawtooth', f0, t, dur)
      o.frequency.exponentialRampToValueAtTime(Math.max(12, f0 * 0.05), t + dur)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 800
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.connect(lp).connect(a)
      out(a, 1, 0.15, pan)
    })
  // comic boing (curtain rope) — duty square sagging down
  const boing = (t) =>
    at(t, () => {
      const mk = (tt, gg) => {
        const o = osc('square', 640, tt, 0.34)
        o.setPeriodicWave(dutyWave(0.25))
        o.frequency.exponentialRampToValueAtTime(520, tt + 0.24)
        const a = ac.createGain()
        a.gain.setValueAtTime(gg, tt)
        a.gain.exponentialRampToValueAtTime(0.001, tt + 0.34)
        o.connect(a)
        out(a, 1, 0.12, 0.06)
      }
      mk(t, 0.08)
      mk(t + 0.14, 0.032)
    })
  // water splash (the bucket)
  const splash = (t) =>
    at(t, () => {
      const n = noise(t, 0.5)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.Q.value = 0.8
      bp.frequency.setValueAtTime(1500, t)
      bp.frequency.exponentialRampToValueAtTime(420, t + 0.45)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(0.13, t + 0.008)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      n.connect(bp).connect(a)
      out(a, 1, 0.25)
      const f = noise(t + 0.02, 0.35)
      const hp = ac.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 4200
      const fg = ac.createGain()
      fg.gain.setValueAtTime(0.045, t + 0.02)
      fg.gain.exponentialRampToValueAtTime(0.001, t + 0.37)
      f.connect(hp).connect(fg)
      out(fg, 1, 0.2, 0.15)
    })
  // comic plop (the puddle settles)
  const plop = (t) =>
    at(t, () => {
      const o = osc('sine', 480, t, 0.2)
      o.frequency.exponentialRampToValueAtTime(110, t + 0.15)
      const a = ac.createGain()
      a.gain.setValueAtTime(0.1, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      o.connect(a)
      out(a, 1, 0.12)
      const o2 = osc('sine', 660, t + 0.16, 0.1)
      const a2 = ac.createGain()
      a2.gain.setValueAtTime(0.035, t + 0.16)
      a2.gain.exponentialRampToValueAtTime(0.001, t + 0.26)
      o2.connect(a2)
      out(a2, 1, 0.1, 0.2)
    })
  // heel click: wood knock + high tick + spark shimmer
  const heelClick = (t) =>
    at(t, () => {
      const o = osc('sine', 1700, t, 0.05)
      o.frequency.exponentialRampToValueAtTime(1050, t + 0.03)
      const a = ac.createGain()
      a.gain.setValueAtTime(0.09, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
      o.connect(a)
      out(a, 1, 0.1, 0.15)
      const n = noise(t, 0.03)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 4500
      bp.Q.value = 2
      const ng = ac.createGain()
      ng.gain.setValueAtTime(0.055, t)
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
      n.connect(bp).connect(ng)
      out(ng, 1, 0.08, -0.15)
    })
  // BALDS accent: block + clap slap + low thump
  const sting = (t) =>
    at(t, () => {
      const o = osc('sine', 1900, t, 0.06)
      o.frequency.exponentialRampToValueAtTime(1200, t + 0.03)
      const a = ac.createGain()
      a.gain.setValueAtTime(0.065, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
      o.connect(a)
      out(a, 1, 0.08, 0.2)
      const n = noise(t, 0.12)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 1600
      const ng = ac.createGain()
      ng.gain.setValueAtTime(0.055, t)
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
      n.connect(bp).connect(ng)
      out(ng, 1, 0.12, -0.15)
      const th = osc('sine', 95, t, 0.16)
      th.frequency.exponentialRampToValueAtTime(60, t + 0.12)
      const tg = ac.createGain()
      tg.gain.setValueAtTime(0.06, t)
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
      th.connect(tg)
      out(tg, 1, 0.1)
    })
  // sepia waltz bar sequence: felt root on 1, soft strums on 2-3
  const waltzSeq = (t0, bars, { bar, root, chord, g = 0.05 }) =>
    at(t0, () => {
      for (let i = 0; i < bars; i++) {
        const tb = t0 + i * bar
        pianoN(root, tb, 1.2, g + 0.012)
        strumN(chord, tb + bar / 3, 0.5, g)
        strumN(chord, tb + (2 * bar) / 3, 0.5, g * 0.9)
      }
    })
  // oom-pah walking-tune accompaniment: tuba roots on 1/3, strums on 2/4
  const oomPah = (t0, bars, { beat, roots, chords, g = 0.13 }) =>
    at(t0, () => {
      for (let i = 0; i < bars; i++) {
        const tb = t0 + i * beat * 4
        const r = roots[i % roots.length]
        const ch = chords[i % chords.length]
        tubaN(r, tb, beat * 0.9, g)
        tubaN(r + 7, tb + 2 * beat, beat * 0.8, g * 0.85)
        strumN(ch, tb + beat, 0.28, 0.034)
        strumN(ch, tb + 3 * beat, 0.28, 0.03)
      }
    })
  // spinning ostinato (the twister): celli notes on a rotating D-minor circle
  const SPIN = [50, 53, 57, 62, 57, 53]
  const spinSeq = (t0, step, count, { g = 0.05, cut = 800, end = null }) =>
    at(t0, () => {
      for (let i = 0; i < count; i++) {
        const t = t0 + i * step
        if (end && t >= end - 0.02) break
        celliN(SPIN[(i + 2) % 6], t, 0.14, g, ((i % 3) - 1) * 0.12, cut)
      }
    })
  // WITCH cackle statement with optional doppler pan sweep — one cue
  const cackleRun = (t0, root, u, { g = 0.09, pan0 = 0, pan1 = 0, drop = false, dry = false } = {}) =>
    at(t0, () =>
      WITCH.forEach((k, i) =>
        quack(root + k, t0 + i * u, (i === 4 ? 1.7 : 0.6) * u, g, pan0 + ((pan1 - pan0) * i) / 4, drop, dry),
      ),
    )
  // FLOZ fanfare rip — brass + bright bells answering — one cue
  const flozRun = (t0, root, u, { brassG = 0.14, bellG = 0.05, pan = 0.05 } = {}) =>
    at(t0, () => {
      const steps = [0, 0.8, 1.6, 2.6]
      FLOZ.forEach((k, i) => {
        const t = t0 + steps[i] * u
        const d = (i === 3 ? 2.3 : 0.75) * u
        if (brassG) brassN(root + k, t, d, brassG, pan)
        if (bellG) bellN(root + k, t, 0.9, bellG, pan)
      })
    })
  // HOME motif in music-box timbre — one cue
  const boxMotif = (t0, root, u, { g = 0.05 } = {}) =>
    at(t0, () => {
      HOME.forEach((k, i) => boxNote(root + k, t0 + HOME_STEPS[i] * u, homeDur(u, i) + 0.5, g))
    })
  // hourglass ticks: SLOWING and DETUNING each tick (the hair is running out)
  const tickTrain = (t0, dts) =>
    at(t0, () => {
      dts.forEach((dt, i) => {
        const t = t0 + dt
        const f = 3000 * Math.pow(0.93, i)
        const n = noise(t, 0.03)
        const bp = ac.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = f
        bp.Q.value = 3
        const a = ac.createGain()
        a.gain.setValueAtTime(0.06, t)
        a.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
        n.connect(bp).connect(a)
        out(a, 1, 0.05, i % 2 ? 0.25 : -0.25)
        const o = osc('sine', f * 0.35, t, 0.05)
        o.frequency.exponentialRampToValueAtTime(f * 0.22, t + 0.04)
        const og = ac.createGain()
        og.gain.setValueAtTime(0.03, t)
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
        o.connect(og)
        out(og, 1, 0.05, i % 2 ? 0.25 : -0.25)
      })
    })

  // ========================= S1 kansas (CUES.kansas 0.0, sepia, 84 BPM 3/4) =========================
  // gentle grey lullaby-waltz; the wind is the only percussion and it RISES all shot
  kit.wind(0.0, KS(KANSAS_EV.lift), 0.028, 240, 620)
  kit.wind(KS(KANSAS_EV.lift), KS(KANSAS_EV.cut), 0.055, 320, 1500)
  kit.pad(b('kansas', 0), [53, 57, 60], 4.0, 0.032, 1100, 1.4)
  waltzSeq(b('kansas', 1), 3, { bar: barSec('kansas'), root: 41, chord: [57, 60, 65] })
  boxMotif(b('kansas', 1), HOME_ROOT, 0.185, { g: 0.05 }) // stated plainly under the title settle
  boxMotif(b('kansas', 3) + 0.02, HOME_ROOT + 12, 0.185, { g: 0.026 }) // scoop echo, octave up
  run(KS(KANSAS_EV.neighbor), [[0, 2093, 0.09], [0.13, 2637, 0.09]], blipN, { g: 0.035 }) // polite horn beep
  kit.flutter(KS(KANSAS_EV.chickens), KS(KANSAS_EV.chickens) + 0.7, 0.026) // chickens fly BACKWARDS
  kit.riser(KS(KANSAS_EV.funnel) - 1.0, KS(KANSAS_EV.funnel), 0.055) // funnel forms (E2)
  creak(KS(KANSAS_EV.lift), 0.8, { g: 0.03 }) // fence posts dangle
  kit.clunk(KS(KANSAS_EV.lift), 0.16) // the house lurches off its foundations
  breath(KS(KANSAS_EV.roar) - 0.8, KS(KANSAS_EV.cut), { g: 0.07, f: 420 }) // roar swallows the mix

  // ========================= S2 twister (CUES 10.0, sepia, 126 BPM 6/8) =========================
  kit.wind(TW(TWISTER_EV.vortex), TW(TWISTER_EV.drop), 0.05, 380, 1200)
  nz(TW(TWISTER_EV.vortex), TW(TWISTER_EV.drop) - TW(TWISTER_EV.vortex), { f: 150, type: 'lowpass', g: 0.055, send: 0.15 })
  // the waltz broken into rotating fragments, accelerating each bar
  spinSeq(b('twister', 0), beatSec('twister'), 6, { g: 0.05, cut: 760 })
  spinSeq(b('twister', 1), beatSec('twister') * 0.5, 11, { g: 0.058, cut: 900 })
  spinSeq(b('twister', 2), beatSec('twister') * 0.25, 4, { g: 0.066, cut: 1100, end: TW(TWISTER_EV.drop) })
  moo(TW(TWISTER_EV.cow)) // the cow passes (moo)
  nz(TW(TWISTER_EV.haystack), 0.5, { f: 320, f1: 110, type: 'lowpass', g: 0.07 }) // haystack whump
  run(TW(TWISTER_EV.neighbor), [[0, 2349, 0.08], [0.13, 2349, 0.08], [0.26, 2349, 0.08]], dingN, { g: 0.04 })
  zip(TW(TWISTER_EV.transform) - 0.07, 1900, 3800, 0.16, 0.035) // bicycle bell zings into the broom
  // FIRST WITCH cackle — dopplering past the window, L -> R (E4)
  cackleRun(TW(TWISTER_EV.transform), WITCH_ROOT, 0.16, { g: 0.1, pan0: -0.7, pan1: 0.6 })
  kit.flutter(TW(TWISTER_EV.transform), TW(TWISTER_EV.transform) + 1.1, 0.04) // broom buzz banks away
  kit.whoosh(TW(TWISTER_EV.transform) + 0.2, 0.7, 0.12, 500, 2600)
  creak(TW(TWISTER_EV.shudder), 0.7, { g: 0.034 }) // house shudders
  kit.sweepDown(TW(TWISTER_EV.drop), 0.8, 900, 55, 0.2) // HOUSE DROPS (E5)
  kit.wind(TW(TWISTER_EV.drop), TW(TWISTER_EV.thud), 0.06, 1300, 320)
  kit.impact(CUES.thud, 0.45, 55) // THUD (E5b) — the pin
  kit.taiko(CUES.thud, 0.4, 58)
  kit.sub(CUES.thud, 0.32, 70, 28, 1.3)
  nz(CUES.thud, 1.1, { f: 420, f1: 110, type: 'lowpass', g: 0.13, send: 0.2 }) // dust ring
  breath(CUES.thud + 0.35, TW(TWISTER_EV.cut), { g: 0.075, f: 520 }) // one huge held breath — CUT

  // ========================= S3 flozburst (CUES.burst 20.0, 120 BPM 4/4) =========================
  // 18.0-19.97 is TOTAL SILENCE by design: the rattle is unscored, the sliver is silent,
  // and the fanfare detonates EXACTLY on the cut frame (story.md: do not dissolve it)
  flozRun(CUES.burst, FLOZ_ROOT, 0.16)
  kit.crash(CUES.burst, 0.15)
  kit.kick(CUES.burst, 0.28)
  kit.bass(CUES.burst, 29, 1.6, 0.2, 'sawtooth', 420)
  kit.pad(CUES.burst, [65, 69, 72], 2.4, 0.045, 2000, 0.12)
  kit.choir(CUES.burst + 0.4, [72, 76, 79], 2.6, 0.034, 'a') // HOME blooms major with the chorus
  // MUNCHKIN MARCH (E7, CUES.march 21.6) — piccolo plucks, tuba, woodblock, bounce domino
  const MBE = beatSec('flozburst')
  const MUNCH = [72, 76, 79, 76, 77, 76, 74, 72] // original C-major bounce, one note per beat
  run(CUES.march, MUNCH.map((m, i) => [i * MBE, m, 0.3]), pluckN, { g: 0.055 })
  run(CUES.march, [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i * MBE, 1900, 0.05]), woodN, { g: 0.05, pan: -0.2, panStep: 0.05 })
  run(CUES.march, [0, 2, 4, 6].map((i) => [i * MBE, i % 4 === 0 ? 36 : 43, 0.42]), tubaN, { g: 0.15 })
  // GLINDA descends (E8 23.0): shimmering pad + bell gliss + bubble pop + the wink
  glassPad(MASTER.glinda, 76, 2.6, { g: 0.038 })
  run(MASTER.glinda + 0.05, [72, 76, 79, 84, 88, 91].map((m, i) => [i * 0.055, m, 0.9]), boxNote, { g: 0.04 })
  kit.glass(MASTER.glinda, 0.16, 1.1)
  kit.blip(MASTER.glinda + 0.9, 1568, 0.028, 0.06, 'sine')
  // slippers (E8b 24.2): the cackle is ANSWERED by the fanfare, sparkle trail
  run(CUES.slippers, [[0, WITCH_ROOT + 12, 0.1], [0.1, WITCH_ROOT + 13, 0.1], [0.2, WITCH_ROOT + 12, 0.12]], quack, { g: 0.07 })
  flozRun(CUES.slippers + 0.42, FLOZ_ROOT, 0.12, { brassG: 0, bellG: 0.045 })
  kit.glass(CUES.slippers, 0.13, 0.9)
  // GREEN WITCH arrives (E9 25.4): green-smoke riser + dark cackle statement
  kit.riser(CUES.witchSmoke - 0.5, CUES.witchSmoke, 0.065)
  kit.sub(CUES.witchSmoke, 0.32, 60, 30, 1.6)
  nz(CUES.witchSmoke, 1.4, { f: 260, type: 'lowpass', g: 0.065, send: 0.25 })
  kit.braam(CUES.witchSmoke, [41, 45, 48], 1.4, 0.14)
  cackleRun(CUES.witchSmoke + 0.15, WITCH_ROOT - 12, 0.2, { g: 0.095, pan0: 0.3, pan1: -0.25 })
  // under the mandated threat: Ab-shimmy menace (the flat second), then the
  // "LITTLE HAIR TOO" sting — a semitone-cluster stab on the last word
  kit.drone(CUES.witchSmoke + 0.4, FZ(FLOZBURST_EV.vanish), [33, 45], 0.038, 300)
  run(CUES.witchSmoke + 0.4, [0, 1, 2, 3, 4].map((i) => [i * 0.45, i % 2 ? 45 : 44, 0.34]), celliN, { g: 0.042, pan: 0, panStep: 0 })
  brass(FLOZBURST.abs(FLOZBURST_EV.threat) + 1.8, [44, 45], 0.5, { g: 0.1 })
  // she vanishes in a smoke ring — fanfare answer; munchkins erupt (celebrate)
  kit.whoosh(FZ(FLOZBURST_EV.vanish), 0.6, 0.11, 600, 2800)
  flozRun(FZ(FLOZBURST_EV.vanish) + 0.15, FLOZ_ROOT, 0.13, { brassG: 0.11, bellG: 0.04 })
  run(FZ(FLOZBURST_EV.celebrate), [0, 1, 2, 3].map((i) => [i * 0.11, 72 + i * 3, 0.16]), pluckN, { g: 0.05 })
  kit.pad(FZ(FLOZBURST_EV.dip), [65, 69, 72], 0.75, 0.028, 1600, 0.18) // dip-to-white tail

  // ========================= S4 brickroad (CUES.road 30.0, G major, 116 BPM) =========================
  // the film's earworm: an original strophic walking tune; each join adds a layer
  const WBE = beatSec('brickroad')
  run(CUES.road, [64, 66, 67, 71, 74, 79].map((m, i) => [i * 0.09, m, 0.8]), boxNote, { g: 0.038 }) // road lights brick by brick
  oomPah(BR(BRICKROAD_EV.walk), 5, {
    beat: WBE,
    roots: [43, 38, 43, 38],
    chords: [[62, 67, 71], [62, 66, 69]],
  })
  const WALK_A = [[0, 74, 0.75], [0.75, 76, 0.25], [1, 78, 1], [2, 76, 0.5], [2.5, 74, 0.5], [3, 71, 1]]
  const WALK_A2 = [[0, 74, 0.75], [0.75, 76, 0.25], [1, 79, 1], [2, 78, 0.5], [2.5, 76, 0.5], [3, 74, 1]]
  run(BR(BRICKROAD_EV.walk), WALK_A.map(([bt, m, ln]) => [bt * WBE, m, ln * WBE]), reedN, { g: 0.085 })
  run(BR(BRICKROAD_EV.walk) + 4 * WBE, WALK_A2.map(([bt, m, ln]) => [bt * WBE, m, ln * WBE]), reedN, { g: 0.085 })
  // SCARECROW joins (E10a 32.5): reed states the HOME rising fragment + banjo roll
  run(MASTER.scarecrow, [[0, HOME_ROOT, 0.22], [0.22, HOME_ROOT + 4, 0.22], [0.44, HOME_ROOT + 2, 0.4]], reedN, { g: 0.08 })
  run(MASTER.scarecrow + 0.05, [0, 1, 2, 3].map((i) => [i * 0.09, 62 + i * 3, 0.12]), pluckN, { g: 0.045 })
  run(b('brickroad', 2), [[WBE, 74, 0.14], [3 * WBE, 71, 0.14]], pluckN, { g: 0.035 }) // banjo offbeats stay in
  // TIN MAN joins (E10b 34.5): metallic clank, oil arc, HOME dip fragment in metal
  run(MASTER.tinman, [[0, 76, 0.5], [0.3, 71, 0.5]], metalN, { g: 0.06 })
  zip(MASTER.tinman + 0.2, 500, 1600, 0.3, 0.035)
  run(MASTER.tinman + 0.6, [[0, 66, 0.25], [0.25, 69, 0.5]], metalN, { g: 0.05 })
  run(b('brickroad', 3), [[WBE, 79, 0.3], [3 * WBE, 79, 0.3]], metalN, { g: 0.032 }) // metal ostinato stays in
  // LION joins (E10c 36.8): the roar deflates mid-note; growl layer stays in
  roar(CUES.lion)
  run(CUES.lion + 1.0, [[0, 69, 0.3], [0.3, 73, 0.6]], growlN, { g: 0.08 })
  run(b('brickroad', 4), [[0, 38, 0.8], [4 * WBE, 38, 0.8]], growlN, { g: 0.07 })
  // step-chant (E10 note 37.8): stings punctuate BALDS and OH MY in caption rhythm
  sting(MASTER.chantLead + 0.8) // "BALDS"
  run(MASTER.chantLead + 1.2, [[0, 74, 0.12], [0.2, 71, 0.3]], pluckN, { g: 0.06 }) // "OH MY"
  sting(b('brickroad', 5)) // second chant cycle rides the bar grid
  run(b('brickroad', 5) + WBE, [[0, 74, 0.12], [0.2, 71, 0.3]], pluckN, { g: 0.055 })
  kit.swell(BR(BRICKROAD_EV.haze), BR(BRICKROAD_EV.cut), 0.06) // the pink haze at 40.8

  // ========================= S5 poppies (41.5, F major, 63 BPM 3/4) =========================
  kit.pad(b('poppies', 0), [53, 57, 60], 3.4, 0.038, 1000, 1.2) // gorgeous, WRONG
  glassPad(b('poppies', 0) + 0.1, 77, 2.8, { g: 0.028 })
  nz(PP(POPPIES_EV.ribbons), 1.6, { f: 900, f1: 480, type: 'bandpass', q: 1.5, g: 0.032, pan: -0.2 })
  zip(PP(POPPIES_EV.flowtoFaints), 880, 430, 0.32, 0.032) // Flowto goes down first
  // the line drops (E11 44.3): HOME drugged, sliding flat — the field wins
  drowseRun(CUES.poppyDrop, [HOME_ROOT, HOME_ROOT + 4], [1.5, 1.5], { g: 0.06, cents: -70 })
  snoreRun(PP(POPPIES_EV.lineDrops) + 0.5, 2, { g: 0.032 })
  // GLINDA'S SNOW (E11b 45.5): the tempo re-inflates, the motif REVERSES to pitch
  kit.glass(CUES.snow, 0.15, 1.3)
  kit.choir(CUES.snow + 0.1, [65, 69, 72], 2.6, 0.038, 'o')
  glassPad(CUES.snow + 0.1, 81, 2.4, { g: 0.03 })
  run(CUES.snow, [72, 76, 79, 84].map((m, i) => [i * 0.09, m, 0.9]), boxNote, { g: 0.04 }) // snow twinkle
  drowseRun(CUES.snow + 0.5, [HOME_ROOT + 2, HOME_ROOT - 3, HOME_ROOT], [0.6, 0.62, 0.68], { g: 0.05, cents: 40 })
  zip(PP(POPPIES_EV.sneeze), 300, 1400, 0.25, 0.04) // tin man's bolt
  kit.hiss(PP(POPPIES_EV.sneeze), 0.3, 0.07)
  run(PP(POPPIES_EV.sneeze) + 0.25, [[0, 1800, 0.12], [0.22, 1300, 0.12]], blipN, { g: 0.032 }) // ricochet

  // ========================= S6 emerald (48.5, Eb, 96 BPM 4/4) =========================
  // brass splendor at the gate
  brass(b('emerald', 0), [51, 55, 58], 1.4, { g: 0.13 })
  kit.bass(b('emerald', 0), 27, 1.3, 0.17, 'sawtooth', 360)
  kit.choir(b('emerald', 0) + 0.1, [63, 67, 70], 2.2, 0.032, 'o')
  run(EM(EMERALD_EV.knock), [[0, 1400, 0.05], [0.28, 1400, 0.05], [0.56, 1400, 0.05]], woodN, { g: 0.06 }) // knock knock knock
  creak(EM(EMERALD_EV.knock) + 0.7, 0.9, { g: 0.028 }) // the door opens itself
  // HORSE OF A DIFFERENT COLOR (E12 50.5): a NEW KEY each HORSE_STEP cycle
  run(MASTER.horse, [0, 1, 2, 3, 4].map((i) => [i * (HORSE_STEP / 2), 950, 0.05]), woodN, { g: 0.045, pan: -0.3, panStep: 0.15 })
  for (let c = 0; c < 3; c++) {
    const KEY = [[51, 55], [52, 56], [53, 57]][c] // Eb -> E -> F, one step per cycle
    run(MASTER.horse + c * HORSE_STEP, [[0, KEY[0] + 12, 0.5], [0.4, KEY[1] + 12, 0.5]], boxNote, { g: 0.04, pan: -0.4 + c * 0.4 })
  }
  // throne room (52.5): fire beds + the organ pedal takes over and never resolves
  kit.riser(EM(EMERALD_EV.throne) - 0.4, EM(EMERALD_EV.throne), 0.06)
  nz(EM(EMERALD_EV.throne), 6.8, { f: 300, type: 'lowpass', g: 0.04 })
  run(EM(EMERALD_EV.throne), [[0, 27, 2.8], [2.8, 27, 2.2], [5.0, 31, 2.0]], organN, { g: 0.06 }) // pedal Eb Eb G
  // DOOM (E13 53.7): "BRING ME THE WITCH'S WIG!" = FLOZ minor/dark + timpani
  run(CUES.doom, [[0, 41, 0.55], [0.65, 44, 0.55], [1.3, 48, 0.8], [2.2, 53, 1.4]], organN, { g: 0.085 })
  run(CUES.doom, [[0, 58, 0.3], [0.65, 58, 0.3], [2.2, 58, 0.5]], taikoN, { g: 0.36 })
  kit.sub(CUES.doom, 0.32, 70, 30, 2.0)
  kit.braam(CUES.doom, [29, 36], 1.8, 0.16)
  kit.crash(CUES.doom, 0.12)
  // the quartet faints (56.5), then tiptoes out backwards (58.0); the head glitches (59.3)
  run(MASTER.faint, [67, 65, 63, 60].map((m, i) => [i * 0.15, m, 0.2]), pluckN, { g: 0.045 })
  run(MASTER.tiptoe, [0, 1, 2, 3].map((i) => [i * 0.34, i % 2 ? 45 : 50, 0.16]), pluckN, { g: 0.03 })
  kit.glitch(MASTER.glitchWink, 0.14, 0.045)
  tapeStop(MASTER.glitchWink + 0.02, 0.18, { g: 0.045, f0: 170 })

  // ========================= S7 monkeys (59.5, A minor, 152 BPM) =========================
  kit.drone(b('monkeys', 0), MK(MONKEYS_EV.hourglass), [33, 45], 0.032, 280)
  run(MK(MONKEYS_EV.forest), [[0, 38, 0.25], [2 * beatSec('monkeys'), 36, 0.25]], pluckN, { g: 0.045 }) // forest march
  kit.hiss(MK(MONKEYS_EV.skywrite), 1.1, 0.04) // smoke skywriting (E14)
  nz(MK(MONKEYS_EV.skywrite) + 0.3, 0.8, { f: 2600, f1: 1400, type: 'bandpass', q: 2, g: 0.03 }) // wind frays the O's
  // FRENZY (E14b 61.5): chattering high plucks flying to the cackle's rhythm
  run(CUES.monkeys, [81, 82, 81, 80, 81, 76, 81, 82].map((m, i) => [i * beatSec('monkeys') * 0.5, m, 0.1]), pluckN, { g: 0.05 })
  run(CUES.monkeys, [0, 1, 2, 3].map((i) => [i * 0.22, 0, 0.5]), swoopN, { g: 0.09, pan: -0.5, panStep: 0.33 }) // dive ladder
  kit.flutter(CUES.monkeys, CUES.monkeys + 0.9, 0.03) // wingbeats
  kit.impact(MK(MONKEYS_EV.snatch), 0.38, 60) // the snatch
  run(MK(MONKEYS_EV.snatch), [[0, 69, 0.2], [0.02, 70, 0.2], [0.04, 76, 0.3]], pluckN, { g: 0.05 }) // capture cluster
  kit.blip(MK(MONKEYS_EV.snatch) + 0.1, 2400, 0.035, 0.08, 'sine') // Flowto squeaks
  kit.clunk(MASTER.captured, 0.4) // the tower door
  kit.braam(MASTER.captured, [32, 39], 1.6, 0.13)
  kit.drone(MASTER.captured + 0.2, MK(MONKEYS_EV.defect), [32, 39, 44], 0.028, 240) // castle dread
  // the HOURGLASS (64.0): ticks slow down and detune — the hair is running out
  tickTrain(CUES.hourglass, [0, 0.55, 1.17, 1.87, 2.66, 3.55, 4.55])
  cackleRun(MASTER.hourglassLine + 0.05, WITCH_ROOT - 12, 0.22, { g: 0.085, pan0: -0.25, pan1: 0.2 }) // "MY PRETTY"
  run(MASTER.hourglassLine, [[0, 33, 1.4]], growlN, { g: 0.075 })
  glassPad(MASTER.monkeyDefects, 69, 1.6, { g: 0.032 }) // the menace dissolves warm
  kit.clunk(MASTER.monkeyDefects + 1.0, 0.14) // the latch opens
  kit.tick(MK(MONKEYS_EV.lastStrand), 0.06, 2100) // the last strand trembles
  kit.whoosh(MK(MONKEYS_EV.cut) - 0.3, 0.4, 0.1, 400, 2400) // whip-pan to the courtyard

  // ========================= S8 melt (69.5, C minor, 88 BPM) =========================
  kit.drone(b('melt', 0), ML(MELT_EV.bucket), [32, 39], 0.03, 260)
  run(b('melt', 0), [0, 1].map((i) => [i * barSec('melt') + beatSec('melt'), i % 2 ? 44 : 39, 0.5]), celliN, { g: 0.04, pan: 0, panStep: 0 })
  run(ML(MELT_EV.courtyard) + 0.3, [[0, 210, 0.4], [0.62, 185, 0.4], [1.24, 230, 0.4]], bubbleN, { g: 0.028 }) // cauldron blubs
  run(ML(MELT_EV.sneak), [[0, 50, 0.14], [0.4, 45, 0.14]], pluckN, { g: 0.03 }) // the sneak along the wall
  brass(ML(MELT_EV.caught), [41, 44], 0.5, { g: 0.12 }) // caught — broom raised
  nz(ML(MELT_EV.caught) + 0.05, 0.4, { f: 500, f1: 1200, type: 'bandpass', q: 1.2, g: 0.045 }) // monologue inhale
  splash(MASTER.bucket) // the water arc (E16 71.7)
  kit.glass(MASTER.bucket + 0.05, 0.12, 0.8)
  zip(MASTER.bucket + 0.02, 600, 1500, 0.3, 0.035)
  // THE MELT (E16b 72.5): cluster gliss down + scream-pad rising + WITCH detuning down
  run(CUES.melt + 0.1, [79, 78, 77, 75, 74, 72].map((m, i) => [i * 0.08, m, 0.5]), boxNote, { g: 0.036 })
  screamPad(CUES.melt, CUES.melt + 2.5)
  run(CUES.melt, [0, 1, 2, 3, 4].map((i) => [i * 0.5, WITCH_ROOT + WITCH[i] - i, 0.42]), quack, { g: 0.09, pan: 0, panStep: 0 })
  kit.sub(CUES.melt, 0.4, 80, 30, 2.2)
  plop(MASTER.wigFloat) // the puddle settles — comic plop (E17 75.1)
  run(MASTER.wigFloat + 0.5, [60, 64, 67, 72].map((m, i) => [i * 0.07, m, 0.9]), boxNote, { g: 0.036 }) // wig-claim harp run
  // the guards hail the hero (E17b 76.1): triumph brass-first + the ORIGINAL guard riff
  brass(MASTER.kneel, [48, 55, 60, 63], 1.2, { g: 0.14 })
  kit.crash(MASTER.kneel, 0.13)
  kit.kick(MASTER.kneel, 0.26)
  run(MASTER.kneel + 0.1, [[0, 48, 0.38], [0.45, 51, 0.34], [0.9, 55, 0.34], [1.35, 48, 0.7]], brassN, { g: 0.1 })
  run(MASTER.kneel + 0.1, [[0, 2100, 0.05], [0.45, 2100, 0.05], [0.9, 2100, 0.05], [1.35, 2100, 0.05]], woodN, { g: 0.045 })
  run(MASTER.kneel, [0, 1, 2].map((i) => [i * KNEEL_STAGGER, 55 - i * 4, 0.18]), pluckN, { g: 0.04 }) // kneel domino
  run(ML(MELT_EV.pennant), [[0, 1200, 0.1], [0.12, 1600, 0.12]], blipN, { g: 0.035 }) // badly-drawn pennant

  // ========================= S9 curtain (78, C major, 112 BPM) =========================
  brass(b('curtain', 0), [60, 64, 67], 1.1, { g: 0.1 }) // the wig presented, quartet bows
  glassPad(b('curtain', 0) + 0.1, 76, 1.8, { g: 0.03 })
  // the head booms then STUTTERS (E18 note 79.2) — the fanfare as a BROKEN music box
  run(MASTER.stutter, [[0, 65, 0.28], [0.3, 68, 0.2], [0.52, 74, 0.22]], organN, { g: 0.08 }) // WRONG notes
  kit.glitch(MASTER.stutter + 0.55, 0.12, 0.04)
  tapeStop(MASTER.stutter + 0.6, 0.3, { g: 0.05, f0: 200 })
  boing(MASTER.curtainTug) // Flowto bites the rope (E18 80.4)
  tapeStop(MASTER.curtainTug + 0.06, 0.55, { g: 0.055, f0: 165 }) // the giant head winds down
  run(MASTER.curtainTug + 0.1, [[0, 2400, 0.04], [0.12, 2400, 0.04], [0.24, 2400, 0.04]], ringN, { g: 0.035 }) // rings clatter
  kit.whoosh(MASTER.curtainPeel, 1.0, 0.11, 350, 2200) // the curtain peels
  // "PAY NO ATTENTION..." (E18b 81.6): comedy pizzicato while the head murmurs on
  run(MASTER.curtainLine, [[0, 76, 0.16], [0.2, 74, 0.14], [0.4, 72, 0.16], [0.7, 74, 0.14], [0.9, 76, 0.16], [1.2, 79, 0.24], [1.55, 76, 0.3]], pluckN, { g: 0.05 })
  kit.blip(MASTER.curtainLine + 1.9, 1900, 0.03, 0.1, 'sine') // the squeak
  run(MASTER.curtainLine + 0.1, [[0.3, 41, 0.4], [1.1, 41, 0.4]], organN, { g: 0.045 }) // head keeps lip-syncing
  kit.hiss(CN(CURTAIN_EV.mime), 0.9, 0.035) // the kettle
  run(CN(CURTAIN_EV.mime) + 0.3, [[0, 0, 0.2], [0.5, 0, 0.2]], kickN, { g: 0.2 }) // kick-drum booms
  // TOKENS (E19 85.4): three ascending gift chimes = the first three HOME notes
  // (third taken up an octave so the chain rings upward: tonic, comb, medal)
  run(MASTER.tokens, [[0, 69, 1.0], [0.6, 73, 1.0], [1.2, 83, 1.4]], boxNote, { g: 0.05 })
  run(MASTER.tokens + 0.55, [[0, 88, 0.4]], metalN, { g: 0.045 }) // tin man polishes the tonic
  kit.blip(MASTER.tokens + 1.75, 880, 0.03, 0.12, 'sine') // lion sniffles, salutes
  kit.riser(CN(CURTAIN_EV.balloon) - 0.4, CN(CURTAIN_EV.balloon), 0.04) // FLOZ AIR LINES inflates
  kit.hiss(CN(CURTAIN_EV.balloon) + 0.1, 0.7, 0.04)
  // the rope slips (E20 88.0): a happy-go-lucky tune drifting up, right, and away
  run(CUES.balloonSlips, [[0, 72, 0.22], [0.28, 76, 0.22], [0.56, 74, 0.22], [0.84, 79, 0.3], [1.4, 76, 0.22], [1.68, 81, 0.4]], reedN, { g: 0.07, pan: -0.2, panStep: 0.2, dec: 0.82 })
  kit.tick(CUES.balloonSlips, 0.05)
  glassPad(CN(CURTAIN_EV.bubbleIn), 81, 1.6, { g: 0.03 }) // Glinda descends into the match-cut
  kit.glass(CN(CURTAIN_EV.bubbleIn), 0.1, 1.0)

  // ========================= S10 growth (91, F major, 84 BPM 3/4) =========================
  glassPad(b('growth', 0), 77, 2.2, { g: 0.026 }) // the bubble lands, hushed
  run(b('growth', 0) + 0.2, [[0, HOME_ROOT, 0.5], [0.8, HOME_ROOT + 4, 0.5]], boxNote, { g: 0.036 }) // hushed fragment
  // THE CLICKS (E21, CLOCK-pinned): each click rebuilds one HOME note
  heelClick(CUES.click1)
  run(CUES.click1 + 0.06, [[0, 66, 0.3], [0.32, 69, 0.6]], boxNote, { g: 0.055 }) // dip fragment, bare
  heelClick(CUES.click2)
  run(CUES.click2 + 0.06, [[0, 69, 0.3], [0.32, 73, 0.3], [0.64, 71, 0.7]], boxNote, { g: 0.055 }) // rising fragment
  kit.pad(CUES.click2, [57, 60, 65], 1.8, 0.028, 1300, 0.35) // harmony joins
  heelClick(CUES.click3)
  run(CUES.click3 + 0.15, HOME.map((k, i) => [HOME_STEPS[i] * 0.22, HOME_ROOT + k, homeDur(0.22, i) + 0.3]), boxNote, { g: 0.055 })
  brass(CUES.click3 + 0.6, [57, 60, 65], 2.0, { g: 0.1 }) // FULL ENSEMBLE — resolves to tonic
  kit.choir(CUES.click3 + 0.8, [65, 69, 72], 2.0, 0.03, 'a') // ends exactly at drainEnd 98.8
  kit.pad(CUES.click3 + 0.3, [65, 69, 72], 2.5, 0.026, 1400, 0.4)
  kit.strings(CUES.click3 + 0.9, [53, 57, 60, 65], 1.9, 0.032, 0.5) // held tonic UNDER the drain
  // REVERSE-TWISTER DRAIN (E22 97.6): strips everything to solo celesta by 98.8
  kit.swell(CUES.drain, MASTER.drainEnd, 0.06)
  boxMotif(CUES.tripleTake + 0.05, HOME_ROOT, 0.185, { g: 0.046 }) // sepia reprise, awake
  run(b('growth', 4), [[beatSec('growth'), 0, 0.4], [3 * beatSec('growth'), 0, 0.4]], ((m, t, d, g) => strumN([53, 57, 60], t, d, g)), { g: 0.026 }) // waltz ghost
  run(b('growth', 4) + beatSec('growth') * 1.2, [[0, 76, 0.8], [1.15, 81, 0.8]], boxNote, { g: 0.04 }) // and-you chimes
  kit.kick(b('growth', 5) + beatSec('growth') * 0.2, 0.14) // Flowto's tail thump on the final YOU
  kit.bell(MASTER.redWink, 3520, 0.042, 1.4) // the ONE red glint (E23 note 101.8)
  // END BUTTON (E24 102.0): warm plagal IV -> I, built ALL-DRY so the shared IR
  // never re-excites; the sequel-tease wink is two quiet dry cackle notes
  run(CUES.endCard, [[0, 58, 1.1], [0, 62, 1.1], [0, 65, 1.1], [0.55, 53, 1.25], [0.55, 57, 1.25], [0.55, 60, 1.25], [0.55, 65, 1.25]], chimeN, { g: 0.05 })
  run(CUES.endCard + 1.0, [[0, 57, 0.12], [0.15, 58, 0.14]], ((m, t, d, g) => quack(m, t, d, g, 0.25, false, true)), { g: 0.035 })

  // ---------- helpers used above but defined after their first cue call: hoisted function decls ----------
  function drowseRun(t0, midis, durs, { g = 0.05, cents = -60, pan = 0 } = {}) {
    at(t0, () => {
      let t = t0
      midis.forEach((m, i) => {
        drowseN(m, t, durs[i], g, pan, cents)
        t += durs[i] * 0.9
      })
    })
  }
  function snoreRun(t0, n, { g = 0.032 } = {}) {
    at(t0, () => {
      for (let i = 0; i < n; i++) {
        const t = t0 + i * 0.62
        const s = noise(t, 0.5)
        const lp = ac.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 190
        const a = ac.createGain()
        a.gain.setValueAtTime(0, t)
        a.gain.linearRampToValueAtTime(g, t + 0.18)
        a.gain.linearRampToValueAtTime(0, t + 0.5)
        s.connect(lp).connect(a)
        out(a, 1, 0.15, i % 2 ? 0.2 : -0.2)
      }
    })
  }
  function dingN(m, t, d, g = 0.04, pan = 0) {
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.003)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    for (const f of [2349, 3120]) {
      const o = osc('sine', f, t, 0.25)
      const og = ac.createGain()
      og.gain.value = f === 2349 ? 1 : 0.5
      o.connect(og).connect(a)
    }
    out(a, 1, 0.15, pan)
  }
  // detuned-saw brass stab, notes-array form (top-level; pirates lineage)
  function brass(t, notes, dur, { g = 0.14, send = 0.28, pan = 0.05 } = {}) {
    at(t, () => notes.forEach((m) => brassN(m, t, dur, g, pan)))
  }
}
