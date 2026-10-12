// PIRATES OF THE CABALD — original score. Sea-shanty idiom (traditional/PD FORMS only,
// every tune original), ghost waltz, duel taiko, elegiac piano, regrow fanfare, kraken tag.
// All cue times come from ./timeline.js (CUES / MASTER / per-shot EV tables / makeClock.abs /
// b() grids) — nothing here hand-adds t0 + g, and the S5 duel resolves EVERY cue through
// DUEL.abs so the two hit-stops retime score and picture together.
//
// MOTIF PLAN (CURSE_ROOT 57 = A3): CURSE [0,3,7,6,3,0] — the +7->+6 half-step dip under the
// fifth is the fingerprint ("the curse curl"). Development arc:
//   S1 2.0  stated once, quiet celesta (plant)                    (root 57)
//   S3 19.3 stated low, cellos, over the dread 6/8                (root 45)
//   S4 ladder REVEAL_LADDER: each ghoul tick states it a SEMITONE higher (roots 57..63),
//           straggler completes the run at root 64 — tension maxed, unresolved
//   S6 53.9 inverted (descending contour), soft piano + music box — regret
//   S7 66.8 MODE-FLIP: BLESSING [0,4,7,9,7,12] on horns + choir — the curl answers and
//           resolves to the octave; 8-note bell ladder over REGROW_LADDER completes A major
//   S9 89.0 kraken HUMS the blessing at KRAKEN_RATE 0.5, a fifth down (KRAKEN_ROOT 50);
//           the button at 93.5 cuts it off mid-phrase (it never finishes its happy tune)
//
// LOUDNESS STRATEGY (target -14 LUFS integrated, true peak <= -1 dBTP — engine peak-normalises
// and two-pass loudnorms; our job is internal balance so loudnorm never pumps):
//   tier 1 beds (drone/pad/choir/glass/wash)            g 0.03-0.06
//   tier 2 ostinati + pizz + foley texture              g 0.05-0.09
//   tier 3 leads (reed/fiddle/hum/piano RH)             g 0.08-0.16
//   tier 4 pins/stabs/hits (sparse by design)           g 0.20-0.28, impact 0.5-0.7
//   No more than ~3 tiers sound at once; the mix CLEARS around every hit-stop pin (nearPin
//   gate) and around the S7 silence, which is what keeps neighbour sections within ~6 LU
//   except the three intentional drops (heist hard-cut, chest silence, kraken drop-out) that
//   the timeline itself mandates as jokes. Two audio-QA follow-ups: (1) the heist tail
//   16.2-19.0 carries a quiet harbour room-tone bed so the comedy beat is quiet-not-dead;
//   (2) the 93.5 button is built ALL-DRY (reverb send 0) so the shared IR is never
//   re-excited and ~94.8-96.0 sits at digital silence. Percussion is short (<= 0.3 s) so
//   CREI never accumulates; no sustained saw walls at tier 3+; exponential decays to 0.001.
import {
  BLESSING_ROOT,
  CHEST,
  CHEST_EV,
  CUES,
  CURSE,
  CURSE_ROOT,
  DAWN,
  DAWN_EV,
  DUEL,
  DUEL_EV,
  FLASHBACK,
  FLASHBACK_EV,
  HEIST,
  HEIST_EV,
  KRAKEN,
  KRAKEN_EV,
  KRAKEN_RATE,
  KRAKEN_ROOT,
  MASTER,
  OVERTURE,
  OVERTURE_EV,
  PURSUIT,
  PURSUIT_EV,
  REGROW_LADDER,
  REVEAL,
  REVEAL_EV,
  REVEAL_LADDER,
  REVEAL_STRAGGLER,
  STOPS,
  b,
  barSec,
  beatSec,
  motif,
} from './timeline.js'

const OV = OVERTURE.abs
const HS = HEIST.abs
const PS = PURSUIT.abs
const RV = REVEAL.abs
const DL = DUEL.abs
const FB = FLASHBACK.abs
const CH = CHEST.abs
const DN = DAWN.abs
const KK = KRAKEN.abs

// Motif rhythm: long-short-long-long-short-long in units u (one statement = 10u).
const MOTIF_STEPS = [0, 2, 3, 5, 7, 8]
const stateMotif = (notes, t0, u, play) =>
  MOTIF_STEPS.forEach((s, i) => play(notes[i], t0 + s * u, ((i < 5 ? MOTIF_STEPS[i + 1] : 10) - s) * u))

// Original shanty tune, A minor (bar, eighth, lenEighths, midi) — call-and-answer, no quotes.
const SHANTY = [
  [2, 0, 2, 57],
  [2, 2, 1, 60],
  [2, 3, 2, 64],
  [2, 5, 1, 62],
  [2, 6, 2, 60],
  [3, 0, 2, 59],
  [3, 2, 1, 55],
  [3, 3, 1, 57],
  [3, 4, 2, 59],
  [3, 6, 2, 57],
]
// Sunrise reprise, same contour with the mode flipped to A major (C->C#, G->G#).
const SHANTY_MAJ = [
  [0, 0, 2, 57],
  [0, 2, 1, 61],
  [0, 3, 2, 64],
  [0, 5, 1, 62],
  [0, 6, 2, 61],
  [1, 0, 2, 59],
  [1, 2, 1, 56],
  [1, 3, 1, 57],
  [1, 4, 2, 59],
  [1, 6, 4, 57],
  [2, 0, 2, 69],
  [2, 2, 1, 73],
  [2, 3, 2, 76],
  [2, 5, 1, 74],
  [2, 6, 2, 73],
  [3, 0, 2, 71],
  [3, 2, 1, 68],
  [3, 3, 1, 69],
  [3, 4, 2, 71],
  [3, 6, 2, 69],
]
// Ghost-minuet figure (beat, lenBeats, midi) from REVEAL_EV.minuet — original lilt.
const MINUET = [
  [0, 1, 72],
  [1, 1, 76],
  [2, 0.5, 74],
  [2.5, 0.5, 72],
  [3, 1, 71],
  [4, 1, 69],
  [5, 2, 64],
]

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit

  // ---------- custom voices ----------
  const waves = {}
  const dutyWave = (duty) => {
    if (waves[duty]) return waves[duty]
    const n = 48,
      re = new Float32Array(n),
      im = new Float32Array(n)
    for (let k = 1; k < n; k++) {
      re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.cos(k * Math.PI * duty)
      im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.sin(k * Math.PI * duty)
    }
    return (waves[duty] = ac.createPeriodicWave(re, im))
  }
  // concertina-ish reed: 12% duty pulse through a formant bandpass, fast bellows attack
  const reed = (t, m, dur, { g = 0.07, pan = 0, send = 0.18 } = {}) =>
    at(t, () => {
      const o = osc('square', hz(m), t, dur + 0.02)
      o.setPeriodicWave(dutyWave(0.12))
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = Math.min(2400, hz(m) * 4)
      bp.Q.value = 0.9
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.018)
      a.gain.setValueAtTime(g, t + Math.max(0.03, dur - 0.06))
      a.gain.linearRampToValueAtTime(0, t + dur)
      o.connect(bp).connect(a)
      out(a, 1, send, pan)
    })
  // fiddle: saw that settles into pitch, bandpass bite, optional late vibrato
  const fiddle = (t, m, dur, { g = 0.08, vib = 0 } = {}) =>
    at(t, () => {
      const f = hz(m)
      const o = osc('sawtooth', f * 1.03, t, dur + 0.05)
      o.frequency.exponentialRampToValueAtTime(f, t + 0.05)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = Math.min(2600, f * 3)
      bp.Q.value = 1
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.03)
      a.gain.setValueAtTime(g * 0.8, t + Math.max(0.06, dur * 0.7))
      a.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.04)
      o.connect(bp).connect(a)
      out(a, 1, 0.22, 0.12)
      if (vib) {
        const l = osc('sine', 5.6, t, dur + 0.05)
        const lg = ac.createGain()
        lg.gain.setValueAtTime(0, t)
        lg.gain.linearRampToValueAtTime(6, t + 0.3)
        l.connect(lg).connect(o.detune)
      }
    })
  // hollow bell/organ voice — states the CURSE motif on every ghoul tick
  const hollowBell = (t, m, dur, { g = 0.06 } = {}) =>
    at(t, () => {
      const f = hz(m)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.015)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      for (const [mul, kg] of [
        [1, 1],
        [0.5, 0.4],
        [2.76, 0.22],
      ]) {
        const o = osc('sine', f * mul, t, dur)
        const og = ac.createGain()
        og.gain.value = kg
        o.connect(og).connect(a)
      }
      out(a, 1, 0.4, ((m % 5) - 2) * 0.14)
    })
  // glass harmonica: detuned sine pair, slow swell, shimmer trem — moonlight colour
  const glass = (t, m, dur, { g = 0.04, send = 0.5 } = {}) =>
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
      out(a, 1, send)
    })
  // dread celli ostinato: detuned saw pair, quick bow attack
  const celli = (t, m, dur, { g = 0.07, cut = 900, atk = 0.05, pan = 0 } = {}) =>
    at(t, () => {
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + atk)
      a.gain.setValueAtTime(g, t + Math.max(atk + 0.02, dur - 0.08))
      a.gain.linearRampToValueAtTime(0, t + dur)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = cut
      lp.connect(a)
      for (const det of [-7, 6]) {
        const o = osc('sawtooth', hz(m), t, dur + 0.02)
        o.detune.value = det
        o.connect(lp)
      }
      out(a, 1, 0.2, pan)
    })
  // rising chromatic under-glide (S3 dread bed)
  const glide = (t0, t1, m0, m1, { g = 0.05, cut = 420 } = {}) =>
    at(t0, () => {
      const o = osc('sawtooth', hz(m0), t0, t1 - t0)
      o.frequency.linearRampToValueAtTime(hz(m1), t1)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = cut
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + 1.2)
      a.gain.linearRampToValueAtTime(g * 0.6, t1 - 0.4)
      a.gain.linearRampToValueAtTime(0, t1)
      o.connect(lp).connect(a)
      out(a, 1, 0.25, -0.2)
    })
  // brass stab/horn (goldflow lineage: detuned saw pair, lowpass bloom)
  const brass = (t, notes, dur, { g = 0.2, send = 0.25 } = {}) =>
    at(t, () => {
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.035)
      a.gain.setValueAtTime(g, t + Math.max(0.05, dur - 0.2))
      a.gain.linearRampToValueAtTime(0, t + dur)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(1100, t)
      lp.frequency.linearRampToValueAtTime(2600, t + 0.12)
      lp.connect(a)
      for (const m of notes) {
        for (const det of [-5, 5]) {
          const o = osc('sawtooth', hz(m) * 0.985, t, dur)
          o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.08)
          o.detune.value = det
          o.connect(lp)
        }
      }
      out(a, 1, send, 0.06)
    })
  // muted bassoon blat (harbour comedy)
  const blat = (t, m, dur = 0.22, { g = 0.09 } = {}) =>
    at(t, () => {
      const o = osc('sawtooth', hz(m) * 0.99, t, dur)
      o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.05)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 520
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.02)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.connect(lp).connect(a)
      out(a, 1, 0.15, -0.1)
    })
  const nz = (t, dur, { f = 4000, type = 'highpass', g = 0.1, q = 0.7, f1 = null, pan = 0, send = 0.08 } = {}) =>
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
  const block = (t, { g = 0.06, f = 1850 } = {}) =>
    at(t, () => {
      const o = osc('sine', f, t, 0.06)
      o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.035)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
      o.connect(a)
      out(a, 1, 0.06, 0.2)
    })
  const anvil = (t, { g = 0.09 } = {}) =>
    at(t, () => {
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
      const hp = ac.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 900
      hp.connect(a)
      for (const mul of [1, 2.32, 3.01]) {
        const o = osc('square', 523 * mul, t, 0.3)
        const og = ac.createGain()
        og.gain.value = mul === 1 ? 1 : 0.4
        o.connect(og).connect(hp)
      }
      out(a, 1, 0.2, 0.1)
    })
  const creak = (t, dur = 1.1, { g = 0.03 } = {}) =>
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
  // wave wash bed: lowpassed noise with a swell-decay
  const wash = (t, dur = 3, { g = 0.05, f = 650 } = {}) =>
    at(t, () => {
      const n = noise(t, dur)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = f
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + dur * 0.4)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      n.connect(lp).connect(a)
      out(a, 1, 0.3)
    })
  const zip = (t, f0, f1, dur, g = 0.05) =>
    at(t, () => {
      const o = osc('sine', f0, t, dur)
      o.frequency.exponentialRampToValueAtTime(f1, t + dur)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.connect(a)
      out(a, 1, 0.1)
    })
  // comic "boing" — Jack plucks ONE strand of hair
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
      mk(t, 0.085)
      mk(t + 0.14, 0.035)
    })
  const stomp = (t, g = 0.4) => {
    kit.kick(t, g)
    nz(t, 0.05, { f: 350, type: 'lowpass', g: g * 0.5 })
  }
  const plink = (t, g = 0.05) => {
    kit.blip(t, 1760, g, 0.06, 'square')
    kit.blip(t + 0.07, 2637, g, 0.5, 'sine')
  }
  // kraken hum: soft sine+saw low voice (the blessing, a fifth down, half tempo)
  const hum = (t, m, dur, { g = 0.09 } = {}) =>
    at(t, () => {
      const f = hz(m)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 520
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.3)
      a.gain.setValueAtTime(g, t + Math.max(0.35, dur - 0.35))
      a.gain.linearRampToValueAtTime(0, t + dur)
      const o = osc('sine', f, t, dur)
      const o2 = osc('sawtooth', f, t, dur)
      const g2 = ac.createGain()
      g2.gain.value = 0.25
      o.connect(lp)
      o2.connect(g2).connect(lp)
      lp.connect(a)
      const l = osc('sine', 4.6, t, dur)
      const lg = ac.createGain()
      lg.gain.value = 5
      l.connect(lg)
      lg.connect(o.detune)
      lg.connect(o2.detune)
      out(a, 1, 0.3, 0.12)
    })
  // dry button voices (reverb send 0): the last sounds in the film must not excite the
  // shared 3.2 s IR — kit.taiko sends 0.5 and kit.pluck 0.25, which washed to 96.0
  const taikoDry = (t, g = 0.7, f = 50) =>
    at(t, () => {
      const o = osc('sine', f * 2.4, t, 0.6)
      o.frequency.exponentialRampToValueAtTime(f, t + 0.07)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      o.connect(a)
      out(a, 1, 0)
      const n = noise(t, 0.08)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 900
      const ng = ac.createGain()
      ng.gain.setValueAtTime(g * 0.3, t)
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
      n.connect(bp).connect(ng)
      out(ng, 1, 0)
    })
  const subDry = (t, g = 0.35, f0 = 60, f1 = 30, dur = 0.7) =>
    at(t, () => {
      const o = osc('sine', f0, t, dur)
      o.frequency.exponentialRampToValueAtTime(f1, t + dur)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.connect(a)
      out(a, 1, 0)
    })
  const pluckDry = (t, m, g = 0.16, cut = 700, dur = 0.4) =>
    at(t, () => {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.Q.value = 3
      lp.frequency.setValueAtTime(cut, t)
      lp.frequency.exponentialRampToValueAtTime(200, t + dur)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      for (const det of [-8, 5]) {
        const o = osc('sawtooth', hz(m), t, dur + 0.02)
        o.detune.value = det
        o.connect(lp)
      }
      lp.connect(a)
      out(a, 1, 0)
    })

  // ============================== A. overture (CUES.overture 0.0, S1 0-11, 96 BPM 4/4) ==============================
  kit.drone(0.0, 4.5, [45, 52], 0.04, 300)
  wash(OV(0.2), 4.0, { g: 0.05 })
  glass(OV(OVERTURE_EV.glint) + 0.05, 88, 2.5, { g: 0.028 }) // water glint
  creak(OV(1.2), 1.1)
  creak(OV(6.3), 0.9, { g: 0.025 })
  // stomp groove, bars 0-3 (bar 2.5 s; scatter ends the section mid-bar-4 on purpose)
  for (let bar = 0; bar < 4; bar++) {
    const t0 = b('overture', bar)
    stomp(t0, 0.3)
    stomp(t0 + beatSec('overture') * 2, 0.26)
    kit.clap(t0 + beatSec('overture'), 0.14)
    kit.clap(t0 + beatSec('overture') * 3, 0.14)
    kit.bass(t0, 33, 0.9, 0.2, 'triangle', 320)
    kit.bass(t0 + beatSec('overture') * 2, 40, 0.7, 0.16, 'triangle', 320)
    if (bar >= 1) {
      reed(t0 + beatSec('overture'), 57, 0.34, { g: 0.045 })
      reed(t0 + beatSec('overture') * 3, 57, 0.34, { g: 0.045 })
    }
    for (let e = 0; e < 8; e++)
      fiddle(t0 + e * beatSec('overture') * 0.5, e === 6 ? 59 : e % 2 ? 64 : 57, 0.2, { g: 0.035 })
  }
  kit.pad(OV(OVERTURE_EV.titleForm), [57, 60, 64], 2.4, 0.04, 1200, 0.6) // title swell (E1 4.5)
  // curse motif, quiet celesta — planted under the silhouette (E sil 2.0)
  stateMotif(motif('curse', CURSE_ROOT + 12), OVERTURE_EV.silhouette, 0.16, (m, t, d) =>
    kit.bell(t, hz(m), 0.045, d + 0.5, 4, 2),
  )
  // the tune — reed lead, fiddle in unison (bars 2-3, lands as the title forms)
  for (const [bar, e, len, m] of SHANTY) {
    const t = b('overture', bar) + e * beatSec('overture') * 0.5
    const d = len * beatSec('overture') * 0.5
    reed(t, m, d, { g: 0.085 })
    fiddle(t, m, d, { g: 0.05, vib: len >= 2 ? 1 : 0 })
  }
  // wave scatters the title to glitter (E1b 10.0)
  ;[81, 79, 76, 72, 69, 64].forEach((m, i) => kit.bell(OVER_scatter(i), hz(m), 0.04, 0.6, 4, 2))
  nz(OVERTURE_EV.scatter, 0.5, { f: 6000, g: 0.05 })
  function OVER_scatter(i) {
    return OV(OVERTURE_EV.scatter) + i * 0.045
  }

  // ============================== B. the paperwork heist (CUES.heist 11.0, S2 11-19, 132 BPM 4/4) ==============================
  const HEIST_PAT = { 0: 50, 2: 57, 4: 50, 5: 49, 6: 50 } // sneaky D-minor pizz contour
  for (let bar = 0; bar < 3; bar++) {
    const t0 = b('heist', bar)
    for (let e = 0; e < 8; e++) {
      const t = t0 + e * beatSec('heist') * 0.5
      if (t >= HS(HEIST_EV.depart) || (t > HS(HEIST_EV.stamp) - 0.04 && t < HS(HEIST_EV.stamp) + 0.5)) continue // hard-cut guard + stamp duck
      if (HEIST_PAT[e] !== undefined) kit.pluck(t, HEIST_PAT[e], 0.08, 1400)
    }
    if (bar % 2 === 0) {
      blat(t0, 62, 0.2)
      blat(t0 + beatSec('heist') * 2, 61, 0.2)
    } else blat(t0, 65, 0.2)
  }
  ;[0.06, 0.29, 0.52].forEach((d) => block(CUES.heist + d, { g: 0.045 })) // officer's footsteps
  nz(HS(HEIST_EV.papers), 0.15, { f: 2500, type: 'bandpass', g: 0.05 }) // permit slide
  kit.clap(HS(HEIST_EV.stamp), 0.18) // E2 13.2 rim + duck
  block(HS(HEIST_EV.stamp), { g: 0.07, f: 2400 })
  kit.tick(HS(HEIST_EV.stamp) + 0.05, 0.06)
  nz(HS(HEIST_EV.sail), 0.5, { f: 420, f1: 140, type: 'lowpass', g: 0.13 }) // canvas flump
  creak(HS(HEIST_EV.sail), 0.5)
  // ALL MUSIC HARD-CUTS at the departure (E3 16.0) — only foley after
  kit.whoosh(HS(HEIST_EV.depart), 0.5, 0.14, 700, 3200) // tricorn away
  zip(HS(HEIST_EV.depart) + 0.02, 900, 300, 0.3, 0.05) // pier rope slips the bollard
  creak(HS(HEIST_EV.depart) + 0.05, 0.7)
  blat(HS(HEIST_EV.doubleTake), 63, 0.25, { g: 0.105 }) // double-take (E3b 17.5)
  blat(HS(HEIST_EV.doubleTake) + 0.28, 61, 0.25, { g: 0.105 })
  kit.tick(HS(HEIST_EV.doubleTake) + 0.05, 0.05)
  // the beat after the hard-out is INTENTIONAL quiet, not a dropout: a harbour room-tone
  // bed carries 16.2-19.0 — the music is gone but the world keeps moving (audio-QA fix:
  // heist tail was 9.7 LU under pursuit; this floor + the louder blats close the gap)
  kit.wind(16.3, 18.9, 0.045, 250, 600)
  wash(16.4, 1.5, { g: 0.048, f: 550 })
  wash(17.7, 1.3, { g: 0.042, f: 470 })
  creak(16.55, 0.5, { g: 0.034 })
  creak(17.25, 0.8, { g: 0.03 })
  kit.clunk(16.95, 0.12)
  block(17.08, { g: 0.035 })
  kit.clunk(18.05, 0.1)
  block(18.45, { g: 0.03, f: 1500 })
  // a distant gull, twice
  zip(18.3, 1400, 880, 0.2, 0.05)
  nz(18.3, 0.22, { f: 2400, f1: 1300, type: 'bandpass', q: 2.5, g: 0.03, pan: 0.3 })
  zip(18.55, 1200, 820, 0.24, 0.04)
  nz(18.55, 0.24, { f: 2100, f1: 1150, type: 'bandpass', q: 2.5, g: 0.025, pan: 0.35 })

  // ============================== C. black sails (CUES.pursuit 19.0, S3 19-26.5, 144 BPM 6/8, exactly 3 bars) ==============================
  glide(CUES.pursuit, CUES.reveal - 0.1, 33, 36, { g: 0.045 }) // rising chromatic under-glide
  kit.wind(19.2, 24.0, 0.04, 300, 900)
  stateMotif(motif('curse', 45), PS(0.3), 0.3, (m, t, d) => celli(t, m, d + 0.2, { g: 0.075, cut: 700 })) // curse, low cellos
  const PROOT = [45, 46, 47] // A - Bb - B: the bars themselves climb chromatically
  for (let bar = 0; bar < 3; bar++) {
    const t0 = b('pursuit', bar)
    kit.bass(t0, PROOT[bar], 2.4, 0.22, 'sawtooth', 350)
    for (let e = 0; e < 6; e++) {
      const t = t0 + e * beatSec('pursuit')
      if (t >= CUES.reveal - 0.1) break
      celli(t, e === 2 ? PROOT[bar] + 7 : PROOT[bar], 0.3, { g: e % 3 === 0 ? 0.085 : 0.05, cut: 850 })
    }
  }
  // bow-chaser (E4 24.2): orchestral hit, no samples
  brass(PURSUIT_EV.cannon, [45, 52, 57], 0.5, { g: 0.26 })
  kit.impact(PURSUIT_EV.cannon, 0.7, 50)
  kit.sub(PURSUIT_EV.cannon, 0.5, 80, 30, 1.4)
  kit.crash(PURSUIT_EV.cannon, 0.15)
  nz(PURSUIT_EV.splash, 1.2, { f: 1000, f1: 160, type: 'lowpass', g: 0.2, send: 0.2 })
  // grapples (E4b 25.5) + timpani swell into S4
  kit.whoosh(PURSUIT_EV.grapples, 0.5, 0.18, 500, 2600)
  creak(PURSUIT_EV.grapples + 0.2, 0.6)
  kit.clunk(PURSUIT_EV.grapples + 0.4, 0.25)
  kit.riser(CUES.reveal - 1.0, CUES.reveal, 0.1)

  // ============================== D. the moonlight reveal (CUES.reveal 26.5, S4 26.5-38.5, 110 BPM 3/4) ==============================
  const WALTZ = [
    { root: 45, chord: [57, 60, 64] },
    { root: 45, chord: [57, 60, 64] },
    { root: 50, chord: [62, 65, 69] },
    { root: 50, chord: [62, 65, 69] },
    { root: 52, chord: [64, 68, 71] },
    { root: 52, chord: [64, 68, 71] },
    { root: 45, chord: [57, 60, 64] },
  ]
  glass(26.7, 81, 3.0, { g: 0.03 })
  WALTZ.forEach((c, bar) => {
    const t0 = b('reveal', bar)
    celli(t0, c.root, 0.9, { g: 0.08, cut: 700 }) // oom
    for (const beat of [1, 2]) c.chord.forEach((m) => kit.pluck(t0 + beat * beatSec('reveal'), m, 0.04, 2200)) // pah-pah
    if (bar % 2 === 0) kit.choir(t0, [57, 60, 64], 3.3, 0.035, 'u')
  })
  kit.choir(REVEAL_EV.moonBreaks, [64, 69, 72], 2.6, 0.045, 'a') // E5 29.0 clouds part
  nz(REVEAL_EV.moonBreaks, 0.8, { f: 3000, f1: 6000, type: 'bandpass', g: 0.06 })
  glass(REVEAL_EV.moonBreaks, 76, 2.0, { g: 0.035 })
  kit.whoosh(REVEAL_EV.beamStart, 1.2, 0.12, 400, 2400) // E6 sweep 29.5
  kit.flutter(REVEAL_EV.beamStart, RV(REVEAL_LADDER[6].at) + 0.7, 0.04)
  // the ladder: every ghoul tick states the CURSE motif a semitone higher (roots 57..63)
  REVEAL_LADDER.forEach((r, i) =>
    stateMotif(motif('curse', CURSE_ROOT + i), RV(r.at), 0.07, (m, t, d) => hollowBell(t, m, d + 0.9, { g: 0.055 })),
  )
  // 8th ghoul, caught by the beam's tail off-ladder: completes the run at root 64, unresolved
  stateMotif(motif('curse', CURSE_ROOT + 7), RV(REVEAL_STRAGGLER.at), 0.07, (m, t, d) =>
    hollowBell(t, m, d + 0.9, { g: 0.05 }),
  )
  // the curse dances them: ghost minuet (C5 35.0), original lilt, fiddle + reed answer
  MINUET.forEach(([beat, len, m], i) => {
    fiddle(REVEAL_EV.minuet + beat * beatSec('reveal'), m, len * beatSec('reveal'), { g: 0.07, vib: len > 1 ? 1 : 0 })
    if (i === 0) reed(REVEAL_EV.minuet + 7 * beatSec('reveal'), 64, 1.1, { g: 0.05 })
  })
  kit.riser(CUES.duel - 0.6, CUES.duel, 0.12)

  // ============================== E. cutlasses and coin (CUES.duel 38.5, S5 38.5-51, 160 BPM, via DUEL.abs) ==============================
  // World-time grid mapped through the shared clock: bars are 1.5 world s; each freeze
  // stretches real time so the score freezes WITH picture. The only cues allowed inside
  // [freeze-0.5, freeze+0.4] are the two pins, scheduled AT DUEL.abs(lock)/DUEL.abs(slice).
  const DBE = beatSec('duel')
  const PIN_T = STOPS.map((s) => DL(s.g))
  const nearPin = (t) => PIN_T.some((p) => t > p - 0.5 && t < p + 0.4)
  const DBARS = [0, 1, 2, 3, 5, 6, 7] // bar 4 = halyard swing: percussion only, bass drops out
  for (let bar = 0; bar < 8; bar++) {
    const g0 = bar * barSec('duel')
    if (DBARS.includes(bar)) {
      for (let e = 0; e < 8; e++) {
        const g = g0 + e * DBE * 0.5
        if (g > DUEL_EV.cut) break
        const t = DL(g)
        if (nearPin(t)) continue
        celli(t, e % 2 ? 52 : 45, 0.2, { g: 0.06, cut: 800 })
      }
    }
    for (let q = 0; q < 4; q++) {
      const g = g0 + q * DBE
      if (g > 11.4) break
      const t = DL(g)
      if (nearPin(t)) continue
      if (q === 0) kit.taiko(t, bar % 2 ? 0.4 : 0.5)
      if (q === 2) kit.taiko(t, 0.35)
      if (q === 1 || q === 3) kit.kick(t, 0.26)
      if (q === 3 && bar % 2 === 0) anvil(t)
    }
  }
  kit.taiko(DL(DUEL_EV.begin), 0.55) // duel begins (abs 39.00)
  for (let i = 0; i < 4; i++) {
    // roll into the pin, gated clear of the freeze window
    const g = DUEL_EV.lock - 0.88 + i * 0.12
    if (!nearPin(DL(g))) kit.taiko(DL(g), 0.3 + i * 0.1)
  }
  // HIT-STOP 1 pin — lands AT the freeze start (E7 43.70); mix clears around it
  brass(DL(DUEL_EV.lock), [57, 60, 64], 0.5, { g: 0.26 })
  kit.impact(DL(DUEL_EV.lock), 0.6, 55)
  kit.crash(DL(DUEL_EV.lock), 0.15)
  nz(DL(DUEL_EV.lock), 0.3, { f: 6000, g: 0.12 }) // spark ring blooms through the freeze
  kit.whoosh(DL(DUEL_EV.swing), 0.5, 0.2, 400, 2200) // halyard hop (abs 44.16)
  glide(DL(DUEL_EV.swing), DL(DUEL_EV.swingEnd), 57, 64, { g: 0.035, cut: 1200 }) // crane arc
  creak(DL(DUEL_EV.swingEnd), 0.9)
  // HIT-STOP 2 pin — the earring-coin is sliced free (E8 47.26)
  brass(DL(DUEL_EV.slice), [57, 60, 64], 0.5, { g: 0.26 })
  kit.impact(DL(DUEL_EV.slice), 0.55, 50)
  kit.bell(DL(DUEL_EV.slice), 2637, 0.16, 0.42)
  nz(DL(DUEL_EV.slice), 0.25, { f: 5000, g: 0.12 })
  // coin ricochets 3 rigging bells, each one a CURSE-motif note (curl 75->76 preserved)
  ;[84, 87, 88].forEach((m, i) => kit.bell(DL(DUEL_EV.ricochet) + i * 0.18, hz(m), 0.1, 0.6))
  kit.bell(DL(DUEL_EV.catch), hz(93), 0.07, 0.5, 5, 2) // parrot snatch — triangle ding
  kit.tick(DL(DUEL_EV.catch) + 0.02, 0.05)
  // reef grind (E9 49.18): both ships lurch
  kit.sweepDown(DL(DUEL_EV.reef), 0.7, 300, 60, 0.2)
  kit.taiko(DL(DUEL_EV.reef), 0.8, 55)
  nz(DL(DUEL_EV.reef), 1.2, { f: 500, f1: 120, type: 'lowpass', g: 0.22, send: 0.2 })
  kit.strings(DL(DUEL_EV.cut) + 0.02, [57, 60, 64], 1.6, 0.03, 0.8) // elegiac pickup into the flashback

  // ============================== F. 882 coins (CUES.flashback 51.0, S6 51-59, 72 BPM 3/4) ==============================
  const FB_CHORDS = [
    { root: 45, chord: [57, 60, 64] },
    { root: 41, chord: [53, 57, 60] },
    { root: 38, chord: [50, 53, 57] },
    { root: 40, chord: [52, 56, 59] }, // E major — left hanging, unresolved
  ]
  FB_CHORDS.forEach((c, bar) => {
    const t0 = b('flashback', bar)
    kit.piano(t0, c.root, 0.1, 2.2)
    kit.piano(t0 + beatSec('flashback') * 2, c.root + 7, 0.07, 1.5)
    c.chord.forEach((m, i) => kit.piano(t0 + beatSec('flashback') + i * 0.28, m + 12, 0.07, 1.4))
  })
  ;[0, 0.2, 0.4].forEach((d, i) => kit.bell(FB(FLASHBACK_EV.tableauIn) + d, hz([81, 84, 88][i]), 0.03, 0.9, 4, 2)) // music box
  // CURSE inverted (descending), soft — piano with music box an octave up (ends before the lid)
  stateMotif(
    CURSE.map((v) => 69 - v),
    53.9,
    0.25,
    (m, t, d) => {
      kit.piano(t, m, 0.09, d + 0.6)
      kit.bell(t, hz(m + 12), 0.03, d + 0.5, 4, 2)
    },
  )
  // tablecloth baldify ticks: fwip
  FLASHBACK_EV.ticks.forEach((g, i) => {
    nz(FB(g), 0.09, { f: 2400, f1: 1200, type: 'bandpass', q: 2, g: 0.08 })
    kit.blip(FB(g) + 0.02, 1400 - i * 60, 0.045, 0.08, 'sine')
  })
  kit.strings(FB(FLASHBACK_EV.freeze), [57, 60, 64, 65], 1.0, 0.028, 0.3) // aghast freeze — soft dissonance
  kit.heartbeat(55.7, 0.4) // under "WHY IS THE FLOW GONE?" (C10 55.5-58.95)
  kit.heartbeat(56.9, 0.4)
  kit.heartbeat(58.1, 0.4)
  // lid slam (E10 56.5): low piano cluster + felt thud
  ;[44, 45, 46, 47].forEach((m) => kit.piano(MASTER.lidSlam, m, 0.13, 1.8))
  kit.clunk(MASTER.lidSlam, 0.45)
  nz(MASTER.lidSlam, 0.4, { f: 260, type: 'lowpass', g: 0.2, send: 0.25 })
  kit.piano(58.55, 64, 0.08, 2.0) // unresolved Esus hangs into S7
  kit.piano(58.55, 71, 0.06, 2.0)

  // ============================== G. the chest on Skullshoal (S7 59-76; silence 63.0, fanfare 66.8) ==============================
  wash(b('chest', 0) + 0.3, 3.5, { g: 0.045, f: 500 }) // black water laps — and STOPS dead with the music
  kit.flutter(CH(CHEST_EV.delivery), CH(CHEST_EV.delivery) + 0.8, 0.045) // parrot courier
  kit.blip(CH(CHEST_EV.delivery) + 0.1, 2400, 0.03, 0.05, 'sine')
  kit.pluck(CH(CHEST_EV.placed), 81, 0.07, 1800) // last coin placed
  kit.bell(CH(CHEST_EV.placed) + 0.03, hz(93), 0.03, 0.4, 5, 2)
  kit.tick(CH(CHEST_EV.crab), 0.03)
  kit.tick(CH(CHEST_EV.crab) + 0.12, 0.03)
  plink(b('chest', 0) + 3.5, 0.05) // the placed coin finally settles...
  // piano tail dies in ritardando — b('chest',1) = MASTER.silence = 63.0, MUSIC STOPS DEAD
  const C0 = b('chest', 0)
  const TAIL = [
    [0.1, 69],
    [0.9, 72],
    [1.8, 76],
    [2.8, 81],
  ]
  TAIL.forEach(([d, m], i) => kit.piano(C0 + d, m, 0.09 - i * 0.008, 1.4 + i * 0.1))
  kit.piano(C0 + 3.7, 76, 0.06, 0.9)
  kit.piano(C0 + 3.85, 71, 0.06, 0.9)
  // TRUE SILENCE 63.0 -> 65.2: one held breath, then the strand pluck. The joke IS the silence.
  at(63.5, () => {
    const n = noise(63.5, 1.4)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 750
    bp.Q.value = 0.8
    const a = ac.createGain()
    a.gain.setValueAtTime(0, 63.5)
    a.gain.linearRampToValueAtTime(0.028, 64.1)
    a.gain.linearRampToValueAtTime(0, 64.9)
    n.connect(bp).connect(a)
    out(a, 1, 0.15, 0.1)
  })
  boing(CH(CHEST_EV.pluck)) // 64.0 — one red strand
  // strand lands (E11 65.2): harp gliss up the A-major triad
  ;[57, 61, 64, 69, 73, 76, 81].forEach((m, i) => kit.bell(MASTER.strandIn + i * 0.055, hz(m), 0.05, 0.9, 4, 2))
  creak(CH(CHEST_EV.lid) - 0.3, 0.4)
  kit.clunk(CH(CHEST_EV.lid), 0.35) // lid eases shut
  // ---- REGROW FANFARE — downbeat EXACTLY at MASTER.regrowStart 66.8 (E12), 108 BPM, A major ----
  const F0 = CUES.regrow
  const FBE = beatSec('regrow')
  brass(F0, [57, 61, 64], 1.3, { g: 0.18 })
  kit.bass(F0, 33, 1.8, 0.26, 'sawtooth', 500)
  kit.kick(F0, 0.25)
  kit.crash(F0, 0.12)
  kit.whoosh(CH(CHEST_EV.regrowStart), 1.0, 0.14, 300, 2000) // moonshaft widens, beam rolls
  kit.flutter(CH(CHEST_EV.regrowStart), MASTER.regrowEnd, 0.035)
  stateMotif(motif('blessing', BLESSING_ROOT + 12), F0, 0.33, (m, t, d) => brass(t, [m], d + 0.15, { g: 0.15 }))
  kit.choir(F0, [57, 61, 64], 3.4, 0.05, 'a')
  kit.choir(F0 + 0.5, [64, 69, 73], 2.8, 0.04, 'o')
  // bell ladder rides REGROW_LADDER: 8 notes of the A-major octave — the 7-note curse resolved
  const SCALE8 = [69, 71, 73, 74, 76, 78, 80, 81]
  REGROW_LADDER.forEach((r, i) => kit.bell(CH(r.at), hz(SCALE8[i]), 0.07, 1.2))
  for (let bar = 1; bar < 4; bar++) {
    const t0 = F0 + bar * barSec('regrow')
    for (let e = 0; e < 8; e++) kit.hat(t0 + e * FBE * 0.5, 0.022)
    kit.kick(t0, 0.2)
  }
  brass(F0 + barSec('regrow'), [57, 62, 66], 0.7, { g: 0.15 }) // IV
  kit.bass(F0 + barSec('regrow'), 38, 1.4, 0.2, 'sawtooth', 450)
  brass(F0 + barSec('regrow') * 2, [59, 64, 68], 0.7, { g: 0.15 }) // V
  kit.bass(F0 + barSec('regrow') * 2, 40, 1.4, 0.2, 'sawtooth', 450)
  brass(F0 + barSec('regrow') * 3, [57, 61, 64, 69], 2.3, { g: 0.2 }) // I held under the cheer
  kit.bass(F0 + barSec('regrow') * 3, 33, 2.2, 0.22, 'sawtooth', 450)
  kit.choir(F0 + barSec('regrow') * 3, [57, 61, 64], 2.2, 0.05, 'a')
  glass(MASTER.regrowEnd, 88, 1.2, { g: 0.03 }) // sweep completes (73.5)
  // crews erupt: pompadour gag + comb salute over the held chord (74.0)
  const CHEER = CH(CHEST_EV.cheer)
  kit.crowd(CHEER, CHEER + 1.9, 0.1)
  zip(CHEER + 0.15, 280, 880, 0.5, 0.05)
  block(CHEER + 0.9, { g: 0.045 })
  block(CHEER + 1.02, { g: 0.045 })

  // ============================== H. sunrise parole (CUES.sunrise 76.0, S8 76-87, 100 BPM, A major) ==============================
  const SR = [
    { root: 45, chord: [57, 61, 64] },
    { root: 50, chord: [57, 62, 66] },
    { root: 45, chord: [57, 61, 64] },
    { root: 52, chord: [56, 61, 64] },
  ]
  wash(76.4, 3.5, { g: 0.04 })
  SR.forEach((c, bar) => {
    const t0 = b('sunrise', bar)
    kit.strings(t0, c.chord, 2.3, 0.04, 0.9)
    kit.bass(t0, c.root, 1.0, 0.2, 'triangle', 400)
    kit.bass(t0 + beatSec('sunrise') * 2, c.root + 7, 0.8, 0.16, 'triangle', 400)
    stomp(t0, 0.28)
    kit.clap(t0 + beatSec('sunrise'), 0.14)
    kit.clap(t0 + beatSec('sunrise') * 3, 0.14)
    for (let e = 0; e < 8; e++) kit.hat(t0 + e * beatSec('sunrise') * 0.5, 0.02)
  })
  kit.strings(b('sunrise', 4), [57, 61, 64], 1.3, 0.035, 0.8) // partial bar, thins before the tag
  // the shanty reprise IN MAJOR — reed lead, fiddle sparkles an octave up on the answer phrase
  for (const [bar, e, len, m] of SHANTY_MAJ) {
    const t = b('sunrise', bar) + e * beatSec('sunrise') * 0.5
    const d = Math.min(len * beatSec('sunrise') * 0.5, 86.8 - t)
    if (d <= 0.05) continue
    reed(t, m, d, { g: 0.085 })
    if (bar >= 2) fiddle(t, m + 12, d, { g: 0.04 })
  }
  // comb-cannon salute (E13 78.5): pop + chime cascade
  kit.clap(DAWN_EV.combCannon, 0.2)
  block(DAWN_EV.combCannon, { g: 0.06, f: 2200 })
  ;[81, 78, 76, 73, 69].forEach((m, i) => kit.bell(DAWN_EV.combCannon + 0.1 + i * 0.07, hz(m), 0.05, 0.8, 4, 2))
  // rowing officer, still sneaking (81.0): the S2 pizz contour quoted quietly (D-A-C#, diatonic here)
  for (let bar = 0; bar < 2; bar++) {
    const t0 = DN(DAWN_EV.rower) + bar * barSec('sunrise')
    for (const [e, m] of [
      [0, 50],
      [2, 57],
      [4, 50],
      [5, 49],
      [6, 50],
    ])
      kit.pluck(t0 + e * beatSec('sunrise') * 0.5, m, 0.045, 1400)
  }
  kit.swell(DAWN_EV.craneUp, 84.3, 0.1) // crane into the sun crest
  glass(84.3, 81, 2.2, { g: 0.035 })

  // ============================== I. the kraken tag (S9 87-96; sting 89.0, button 93.5) ==============================
  kit.drone(b('kraken', 0) + 0.3, MASTER.hardCut - 0.2, [38, 45], 0.035, 240) // everything else drops out
  wash(87.4, 2.5, { g: 0.035, f: 480 })
  // kraken sting (89.0): sub swell + growl + nail-scratch on the rise
  kit.sub(CUES.krakenSting, 0.55, 70, 24, 2.8)
  at(CUES.krakenSting, () => {
    const dur = 2.4
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 170
    const a = ac.createGain()
    a.gain.setValueAtTime(0, CUES.krakenSting)
    a.gain.linearRampToValueAtTime(0.11, CUES.krakenSting + 0.5)
    a.gain.setValueAtTime(0.11, CUES.krakenSting + dur - 0.5)
    a.gain.linearRampToValueAtTime(0, CUES.krakenSting + dur)
    for (const det of [0, 14]) {
      const o = osc('sawtooth', 41, CUES.krakenSting, dur)
      o.detune.value = det
      o.connect(lp)
    }
    const am = osc('sine', 9.5, CUES.krakenSting, dur)
    const ag = ac.createGain()
    ag.gain.value = 0.05
    am.connect(ag).connect(a.gain)
    lp.connect(a)
    out(a, 1, 0.25, -0.1)
  })
  ;[
    [0.05, 2800, 1400, -0.2],
    [0.35, 2400, 1200, 0.15],
    [0.62, 2000, 900, -0.1],
  ].forEach(([d, f, f1, pan]) => nz(CUES.krakenSting + d, 0.18, { f, f1, type: 'bandpass', q: 3, g: 0.11, pan }))
  block(KK(KRAKEN_EV.combTest), { g: 0.04, f: 2200 }) // comb test on a barnacle, delighted
  zip(KK(KRAKEN_EV.combTest) + 0.12, 900, 1500, 0.25, 0.03)
  glass(MASTER.krakenEye, 76, 1.2, { g: 0.045, send: 0.12 }) // the eye opens (E14 92.5) — trimmed: near the button
  // the kraken HUMS the blessing — KRAKEN_ROOT (fifth down) at KRAKEN_RATE (half tempo);
  // the button interrupts it mid-phrase: it never finishes its happy tune.
  stateMotif(motif('blessing', KRAKEN_ROOT), CUES.krakenSting, 0.33 / KRAKEN_RATE, (m, t, d) => {
    if (t < MASTER.hardCut - 0.12) hum(t, m, d, { g: 0.09 })
  })
  // END BUTTON at the hard cut (93.5): one stomp, one dry low D — built ALL-DRY (send 0)
  // so the shared reverb is never re-excited: last dry audio ~94.2, and ~94.8-96.0 sits at
  // digital silence. "One stomp, done."
  kit.kick(CUES.button, 0.55)
  nz(CUES.button, 0.05, { f: 350, type: 'lowpass', g: 0.28, send: 0 })
  taikoDry(CUES.button, 0.7, 50)
  subDry(CUES.button, 0.35, 60, 30, 0.7)
  pluckDry(CUES.button, 38, 0.16, 700, 0.4)
}
