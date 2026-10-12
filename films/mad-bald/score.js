// MAD BALD: FURY FLOW — Where the Flow Ran Dry. Original score, 102 s. Wasteland
// drone idiom, grooming-hall dread, bellows-brass tyrant, DIEGETIC distorted
// dropped-E doof chug (S4/S9: the score IS the doof), grey cello lament, the
// regrow ladder. Every tune original — nothing quotes 1979/2015 or the catalog.
//
// All cue times come from ./timeline.js (CUES / MASTER / SECTIONS / FREEZES /
// REGROW_LADDER / b() / barSec() / beatSec()) — nothing here hand-adds t0 + g.
// CUES used: ALL 39. Six extra anchors come from MASTER (also clock-derived,
// never hand arithmetic): MASTER.shave 13.72 (SHEAR_M shred), MASTER.sneer
// 21.40 (cult choir), MASTER.steal 24.60 (engine build), MASTER.sprayDay 34.40
// (silver-spray hiss), MASTER.sprout1 98.92 (one-hair blip), MASTER.windTake
// 99.92 (the wind takes the hair; not a named CUE). Rhythms may add musical
// micro-offsets AFTER an anchor (floz/pirates precedent) but every anchor
// itself is an import.
//
// CUE -> SECTION MAP (section t0 is a downbeat; each section carries its own grid):
//   S1 wasteland  0-8.5    84bpm  Dmin   wasteland 0.00 drone+heat whistle in · crest 3.00 far taiko · FLOW half-speed UNRESOLVED (the +14 hangs)
//   S2 shear      8.5-18   96bpm  Dmin   chair 9.00 heartbeat+snaps · clippers 12.70 PIN slam + buzz cut INSIDE the freeze · shave 13.72 SHEAR_M · bloodbag 16.52 salute
//   S3 citadel    18-30    108bpm Dhm->F spray 19.80 DOOM enters (0.25 Hz bellows LFO) · sneer 21.40 cult choir · vault 23.00 music-box FLOW MAJOR · steal/roar engine + v8 bursts + doom restate
//   S4 chase      30-43    140bpm Emin  doof 31.40 CHUG ignites (+ flame licks) · ram 36.80 PIN · swing 40.34 · glass 41.54
//   S5 defect     43-52.5  140bpm Emin   chug to seed 46.20 HARD OUT · TRUE SILENCE 46.20-47.60 · witness 48.20 sting · defect 50.00 box FLOW solo
//   S6 storm      52.5-61  60bpm  Bmin   stormwall 54.10 doom-asleep in · calm 57.10 pad thins · tale 57.80 FLOW minor fragment (quiet IS the palette)
//   S7 greenplace 61-71.5  66bpm  Dmin   mud 62.30 cello lament · gone 67.00 sub-only floor · despair 69.50 FLOW-minor cello, unresolved
//   S8 turn       71.5-79  96bpm  Dmaj   heartbeat to plan 72.80 FLOW_FULL FIRST FULL MAJOR (the 9th resolves) · uturn 74.60 reverse riser · fullsend 76.60 tighten
//   S9 return     79-91    140bpm Emin   converge 80.00 chug reprise + doppler · wigrip 86.00 PIN · bald 87.10 sting + quarter-tone detune, one voice per 0.5 s · waver 88.70 lone falter note, unresolved into the cut
//   S10 flow      91-102   108bpm Dmaj   valve 93.00 PIN · rain 94.12 harp gliss · regrow1..4 + resolve CLOCK PINS · lifted 97.52 crowd choir · walk 98.32 solo celesta · pluck 99.42 twang · card 100.32 dry button, then NOTHING
//
// FREEZE-WINDOW AUDIT (story §3: no cue STARTS inside [fz.t0-0.5, fz.t0+0.4]
// except the four pins; window measured from freeze START, so a cue 0.2 s after
// a freeze ENDS is outside it — story §8 itself schedules the bald sting at
// 87.10, 0.20 s after the money freeze ends, the sanctioned pirates C7 mirror
// of caption c9_witnessthat at 86.2). Enforced in code by nearFreeze() gating
// plus the two pin-adjacent chug guards. All grid values verified against
// b()/beatSec() (chase 8th = 0.2143, shear 8th = 0.3125):
//
//   freeze          window           pin start(s)           last start before         first start after
//   clippers 12.70  [12.20, 13.10)   12.70 SLAM+buzz (E7)   snaps 11.9375 / hb 11.50  snaps 13.1875 / hb 14.00 / SHEAR_M 13.72
//   ram      36.80  [36.30, 37.20)   36.80 impact stack (E19)  chug 8th 36.2143       chug 8th 37.5000 (guard held to ram+0.7 for the resume beat)
//   wigrip   86.00  [85.50, 86.40)   86.00 rip stack (E44)     chug 8th 85.4286       bald 87.10 sting + chug accent (grid chug resumes 87.3571)
//   valve    93.00  [92.50, 93.40)   93.00 valve stack (E47)   pad 91.00 (ends 92.39) rain 94.12 harp gliss
//
// Pin tails are ALLOWED to ring through the freezes (house hit-stop pin
// discipline): the clippers/ram/wigrip/valve impact decays ride over their
// freezes. The clippers BUZZ is the exception-by-design: it starts AT the pin
// and is cut dead at 12.86, INSIDE the freeze [12.70, 12.92] — the buzz stops
// WITH picture.
//
// SILENCE DISCIPLINE (the joke IS the silence): everything fed to the shared IR
// before CUES.seed ends its reverb by 46.20 (last S4 chug 42.6429 + 3.2 s IR =
// 45.84; ALL S5 chug notes are DRY, the last ends 46.16). TRUE SILENCE
// 46.20 -> 47.60 (1.40 s); one soft breath swells 47.60-48.10 (seed+1.4 ->
// witness-0.1) into the WITNESS STING at 48.20. Film end: every voice from
// walk 98.32 on is DRY (send 0), the card button decays to zero by ~101.4, and
// the slate rides silence to 102.0.
//
// LOUDNESS STRATEGY (engine peak-normalises + two-pass -14 LUFS; internal
// balance is our job so loudnorm never pumps):
//   tier 1 beds (drone/pad/choir/wind/wash)         g 0.02-0.05
//   tier 2 ostinati (chug 8ths, snaps, ticks)       g 0.05-0.10
//   tier 3 leads (motifs, box, cello, doom)         g 0.03-0.09
//   tier 4 pins/stabs/hits (sparse)                 g 0.09-0.14, impact <= 0.45
// S6 is mixed a step DOWN by design (quiet IS the palette: bed g <= 0.03).
//
// TP + BAND TRIM (QA round 1 on the 30fps draft: integrated -14.45 LUFS OK but
// encoded true peak -0.21 dBTP > -1.0 ceiling, and 1-5 kHz sat ~9.1 dB under the
// low band): the four pin stacks + tier-4 stabs were trimmed as STACKS (their
// members all attack within ~5 ms, so the SUM sets the film peak sample —
// measured un-normalized: film max 0.806 -> 0.698 FS, i.e. -1.25 dB crest at
// constant-ish loudness, RMS only -0.6 dB), which pulls encoded TP to an
// estimated -1.3..-1.5 dBTP <= -1.0 with margin. Crest, not blanket gain: a
// blanket trim is undone by the loudnorm gain and S6/S7 would pay for it.
// Presence voices got band-limited 1-5 kHz energy instead of gain: the chug
// chain carries a +3.5 dB high-shelf at 1.3 kHz (cutoff widened 1.5k -> 2k;
// the ram pin accent passes shelf:false so the shelf stays out of the peak
// composite), cello opens to ~1.3k, box upper partials +3 dB, braams open to
// bright 1.35, shimmer/licks/snaps lifted — matched-meter low-vs-presence gap
// 9.71 -> 8.67 dB full-film, 13.45 -> 11.80 in the chug windows. The residual
// gap is structural: S6/S7/S1 are dark BY BRIEF (the quiet IS the palette) and
// are deliberately left alone.
//
// REGISTER PLAN (peak-collision cross-check):
//   chug fundamental 82 Hz (E2) + saw overtones under a 3.2k->1.1k LPF with a
//   +3.5 dB shelf from 1.3 kHz (QA presence) — owns S4/S9 low-mids, so NO
//   kit.bass/taiko/sub sounds in S4/S9 except AT the gated pins (the chug is
//   silenced there) and the waver falter; the witness sting lives >= 1.1 kHz,
//   above the chug's heavy region, so they coexist at bald. S3 DOOM cluster
//   73-110 Hz behind a 340 Hz LPF vs cult choir 220-700 Hz vs music box >= 520
//   Hz — separated by filter and register. S1 far taiko (transient, 55-150 Hz,
//   g 0.16) over the drone bed (73-110 Hz, g 0.04). S10 is pin-spaced: harp
//   gliss ends ~94.7, ladder bells >= 520 Hz, sub only at the button.
//   Headroom for the four pins: impacts 0.30-0.34 (kit default 0.8), compressor
//   threshold -16. The pin COMPOSITE is trimmed as a stack: all members attack
//   within ~5 ms at t0, so their sum — not any single member — sets the film's
//   peak sample; TP estimates are made against that sum.
//
// SCHEDULING DISCIPLINE: kit.events is sorted once after score() returns, so no
// kit instrument is ever called inside an at() callback — composite voices
// build raw osc->filter->gain->kit.out chains inside ONE at(). Every node
// leaves through kit.out() with an explicit envelope; exponential ramps always
// land positive (>= 0.001); hard cuts use a 6 ms blade. Determinism: only
// kit.R (seeded) — no Math.random.
import {
  CUES,
  DOOM,
  DOOM_LFO,
  DOOM_ROOT,
  FLOW,
  FLOW_FULL,
  FLOW_ROOT,
  FREEZES,
  MASTER,
  REGROW_LADDER,
  REGROW_RESOLVE,
  SECTIONS,
  SHEAR_M,
  SHEAR_ROOT,
  WITNESS_ROOT,
  b,
  beatSec,
} from './timeline.js'

export function score(kit) {
  const { ac, at, osc, noise, out, hz, R } = kit

  const sect = {}
  for (const s of SECTIONS) sect[s.name] = s

  // story §3 window: [freeze START - 0.5, freeze START + 0.4) — see header audit
  const nearFreeze = (t) => FREEZES.some((fz) => t >= fz.t0 - 0.5 && t < fz.t0 + 0.4)

  // ---------- shared caches (built once, used inside at()) ----------
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
  let shaperCurve = null
  const chugCurve = () => {
    if (!shaperCurve) {
      const n = 1024
      const c = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1
        c[i] = Math.tanh(x * 3.2)
      }
      shaperCurve = c
    }
    return shaperCurve
  }

  // ---------- custom voices (called ONLY at score() top level; raw nodes inside at()) ----------
  // filtered-noise utility bed (floz/pirates nz lineage)
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
  // THE DOOF CHUG — distorted dropped-E guitar: 2-3 detuned saws -> tanh shaper
  // -> choke LPF -> +3.5 dB presence shelf (1.3 kHz; QA band lift) -> palm-mute
  // envelope. cents = static detune (S9 doppler, the quarter-tone falter);
  // bend = extra cents glided across the note (the bald snap); voices = saw
  // count (the army's voices falling away).
  const chugN = (t, m, dur, { g = 0.085, voices = 2, cents = 0, bend = 0, send = 0.12, cut = 2000, shelf = true } = {}) =>
    at(t, () => {
      const f = hz(m) * Math.pow(2, cents / 1200)
      const ws = ac.createWaveShaper()
      ws.curve = chugCurve()
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(cut * 1.6, t)
      lp.frequency.exponentialRampToValueAtTime(Math.max(300, cut * 0.55), t + dur)
      const hs = ac.createBiquadFilter()
      hs.type = 'highshelf'
      hs.frequency.value = 1300
      hs.gain.value = shelf ? 3.5 : 0 // QA band lift; pin accents pass shelf:false (TP crest)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.006)
      a.gain.exponentialRampToValueAtTime(Math.max(0.001, g * 0.22), t + dur * 0.7)
      a.gain.linearRampToValueAtTime(0, t + dur) // palm-mute choke
      const pre = ac.createGain()
      pre.gain.value = 0.7 / Math.max(1, voices * 0.75)
      pre.connect(ws)
      ws.connect(lp).connect(hs).connect(a)
      for (let v = 0; v < voices; v++) {
        const o = osc('sawtooth', f, t, dur + 0.02)
        o.detune.value = (v - (voices - 1) / 2) * 9
        if (bend) o.frequency.exponentialRampToValueAtTime(f * Math.pow(2, bend / 1200), t + dur)
        o.connect(pre)
      }
      out(a, 1, send, 0)
    })
  // flame-lick fill: fast noise sweep up, pan-thrown off the speaker wall
  const lickN = (t, { g = 0.085, pan = 0 } = {}) =>
    at(t, () => {
      const n = noise(t, 0.17)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.Q.value = 1.4
      bp.frequency.setValueAtTime(800, t)
      bp.frequency.exponentialRampToValueAtTime(3600, t + 0.15)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.06)
      a.gain.linearRampToValueAtTime(0, t + 0.17)
      n.connect(bp).connect(a)
      out(a, 1, 0.2, pan)
    })
  // the CLIPPERS: motor buzz pinned to the freeze — starts AT CUES.clippers,
  // cut dead at tEnd (12.86, inside the freeze) with a 6 ms blade
  const clippersBuzz = (t0, tEnd) =>
    at(t0, () => {
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 900
      bp.Q.value = 1.2
      const trem = ac.createGain()
      trem.gain.value = 0.8
      const lfo = osc('sine', 16, t0, tEnd - t0)
      const lg = ac.createGain()
      lg.gain.value = 0.2
      lfo.connect(lg).connect(trem.gain)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(0.09, t0 + 0.02)
      a.gain.setValueAtTime(0.09, tEnd - 0.006)
      a.gain.linearRampToValueAtTime(0, tEnd) // dead BY 12.86 — inside the freeze
      for (const f of [104, 107, 208]) {
        const o = osc('square', f, t0, tEnd - t0)
        o.connect(bp)
      }
      bp.connect(trem).connect(a)
      out(a, 1, 0.08, 0.1)
    })
  // SHEAR_M shred: 90 ms distorted saw stabs descending (the wound)
  const shredN = (t, m, { g = 0.1, dur = 0.085 } = {}) =>
    at(t, () => {
      const ws = ac.createWaveShaper()
      ws.curve = chugCurve()
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 1100
      bp.Q.value = 1
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.004)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      const o = osc('sawtooth', hz(m), t, dur + 0.02)
      o.connect(ws).connect(bp).connect(a)
      out(a, 1, 0.1, -0.1)
    })
  // IMMORTAN DOOM — bellows brass: DOOM cluster [0,3,7] from DOOM_ROOT 38,
  // detuned saw pairs through a dark LPF, and a gain LFO at EXACTLY DOOM_LFO
  // (0.25 Hz = the mask breath). S6 passes lfoHz 0.16: the breathing sleeps.
  const doomVoice = (t0, dur, { g = 0.055, cut = 340, lfoHz = DOOM_LFO, breath = 0.45 } = {}) =>
    at(t0, () => {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = cut
      lp.Q.value = 1.1
      const base = g * (1 - breath / 2)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(base, t0 + 0.5)
      a.gain.setValueAtTime(base, t0 + Math.max(0.6, dur - 0.6))
      a.gain.linearRampToValueAtTime(0, t0 + dur)
      const lfo = osc('sine', lfoHz, t0, dur)
      const lg = ac.createGain()
      lg.gain.value = g * breath // gain breathes in [g*(1-1.5*breath), g*(1+breath/2)] — stays positive
      lfo.connect(lg).connect(a.gain)
      const pre = ac.createGain()
      pre.gain.value = 0.3
      pre.connect(lp).connect(a)
      for (const k of DOOM) {
        for (const det of [-8, 7]) {
          const o = osc('sawtooth', hz(DOOM_ROOT + k), t0, dur)
          o.detune.value = det
          o.connect(pre)
        }
      }
      out(a, 1, 0.4, 0, 0.6)
    })
  // WITNESS STING — silver shimmer: high sine cluster at WITNESS_ROOT 86 +
  // one soft choir 'ah'. Used twice: E26 (faith born) and E45 (faith dying).
  // g default carries the QA presence lift (1.1-1.9 kHz sines).
  const witnessSting = (t, { g = 0.062, dur = 2.2, choirG = 0.03 } = {}) => {
    at(t, () => {
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.08)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      for (const [m, kg, det] of [[WITNESS_ROOT, 1, 0], [WITNESS_ROOT + 1, 0.6, 4], [WITNESS_ROOT + 2, 0.4, -5], [WITNESS_ROOT + 7, 0.22, 7]]) {
        const o = osc('sine', hz(m), t, dur)
        o.detune.value = det
        const og = ac.createGain()
        og.gain.value = kg
        o.connect(og).connect(a)
      }
      const sh = osc('sine', 5.5, t, dur)
      const sg = ac.createGain()
      sg.gain.value = g * 0.3
      sh.connect(sg).connect(a.gain)
      out(a, 1, 0.5, 0.1)
    })
    kit.choir(t, [74, 78], 1.6, choirG, 'a', 0.4, 1.2)
  }
  // music box / celesta — bright additive bell an octave up (upper partials
  // lifted for the QA 1-5 kHz presence pass)
  const boxN = (m, t, d, g = 0.05, send = 0.3, pan = 0) =>
    at(t, () => {
      const f = hz(m + 12)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.003)
      a.gain.exponentialRampToValueAtTime(0.001, t + d)
      for (const [mul, kg] of [[1, 1], [4.1, 0.26], [6.9, 0.1]]) {
        const o = osc('sine', f * mul, t, d)
        const og = ac.createGain()
        og.gain.value = kg
        o.connect(og).connect(a)
      }
      out(a, 1, send, pan)
    })
  // FLOW motif player: long-long-short-held rhythm in units u; the +14 hangs
  const flowMotif = (t0, root, u, play, notes = FLOW) => {
    const offs = [0, 2, 3, 5]
    notes.forEach((k, i) => {
      const t = t0 + offs[i] * u
      const d = ((i < 3 ? offs[i + 1] : 9) - offs[i]) * u
      play(root + k, t, d)
    })
  }
  // heat whistle: thin sine with a slow wobble (the wasteland breathing)
  const whistleN = (t0, t1, { g = 0.011, f = 2300 } = {}) =>
    at(t0, () => {
      const o = osc('sine', f, t0, t1 - t0)
      const wob = osc('sine', 0.4, t0, t1 - t0)
      const wg = ac.createGain()
      wg.gain.value = 55
      wob.connect(wg).connect(o.frequency)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + 1.2)
      a.gain.setValueAtTime(g, t1 - Math.min(1.2, (t1 - t0) / 3))
      a.gain.linearRampToValueAtTime(0, t1)
      o.connect(a)
      out(a, 1, 0.25, -0.25)
    })
  // grey lament cello: 2 detuned saws -> LPF (opened to ~1.3k for the QA
  // presence pass) -> delayed vibrato
  const celloN = (t, m, dur, { g = 0.06, cut = 1350, pan = -0.15, send = 0.22 } = {}) =>
    at(t, () => {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = cut
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.09)
      a.gain.setValueAtTime(g, t + Math.max(0.12, dur - 0.12))
      a.gain.linearRampToValueAtTime(0, t + dur)
      const vib = osc('sine', 5.2, t, dur + 0.05)
      const vg = ac.createGain()
      vg.gain.setValueAtTime(0, t)
      vg.gain.linearRampToValueAtTime(8, t + Math.min(0.8, dur * 0.6))
      vib.connect(vg)
      for (const det of [-6, 5]) {
        const o = osc('sawtooth', hz(m), t, dur + 0.02)
        o.detune.value = det
        vg.connect(o.detune)
        o.connect(lp)
      }
      lp.connect(a)
      out(a, 1, send, pan)
    })
  // REVERSE riser (the U-turn): a real reversed envelope — the filter sweeps
  // DOWN 6.5k -> 320 while the gain SWELLS, cut exactly at t1
  const revRiser = (t0, t1, g = 0.07) =>
    at(t0, () => {
      const n = noise(t0, t1 - t0)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.Q.value = 1.6
      bp.frequency.setValueAtTime(6500, t0)
      bp.frequency.exponentialRampToValueAtTime(320, t1)
      const a = ac.createGain()
      a.gain.setValueAtTime(0.0001, t0)
      a.gain.exponentialRampToValueAtTime(g, t1 - 0.01)
      a.gain.linearRampToValueAtTime(0, t1)
      n.connect(bp).connect(a)
      out(a, 1, 0.25, 0)
    })
  // the held breath into the WITNESS STING (anchored: seed+1.4 -> witness-0.1)
  const breathSwell = (t0, t1, { g = 0.03, f = 700 } = {}) =>
    at(t0, () => {
      const n = noise(t0, t1 - t0)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = f
      bp.Q.value = 0.8
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t1 - 0.05)
      a.gain.linearRampToValueAtTime(0, t1)
      n.connect(bp).connect(a)
      out(a, 1, 0.1, 0.1)
    })
  // comic TWANG (the pluck): saw with a pitch sag + noise flick, all-dry
  const twang = (t) =>
    at(t, () => {
      const o = osc('sawtooth', hz(69) * 1.06, t, 0.3)
      o.frequency.exponentialRampToValueAtTime(hz(69) * 0.94, t + 0.22)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.Q.value = 3
      lp.frequency.setValueAtTime(4200, t)
      lp.frequency.exponentialRampToValueAtTime(320, t + 0.26)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(0.12, t + 0.004)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
      o.connect(lp).connect(a)
      out(a, 1, 0.05, 0.12)
      const n = noise(t, 0.03)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 3000
      bp.Q.value = 2
      const ng = ac.createGain()
      ng.gain.setValueAtTime(0.05, t)
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
      n.connect(bp).connect(ng)
      out(ng, 1, 0, 0.12)
    })

  // ========================= S1 wasteland (CUES.wasteland 0.00, 84 BPM D min) =========================
  // lone drone + heat whistle; FLOW half-speed and UNRESOLVED; far taiko from crest
  kit.drone(CUES.wasteland, sect.wasteland.t1, [38, 45], 0.04, 300) // didgeridoo-ish D2/A2
  whistleN(0.3, sect.wasteland.t1 - 0.1, { g: 0.011, f: 2300 })
  kit.wind(0.5, sect.wasteland.t1 - 0.2, 0.018, 1800, 2600) // heat hiss
  flowMotif(b('wasteland', 1), FLOW_ROOT + 12, 0.5, (m, t, d) => {
    // half-speed, whistle register — the +14 (88) hangs and dies unresolved
    at(t, () => {
      const o = osc('sine', hz(m), t, d + 0.3)
      const vib = osc('sine', 4.8, t, d + 0.3)
      const vg = ac.createGain()
      vg.gain.value = 7
      vib.connect(vg).connect(o.detune)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(0.035, t + 0.08)
      a.gain.exponentialRampToValueAtTime(0.001, t + d + 0.25)
      o.connect(a)
      out(a, 1, 0.35, 0.15)
    })
  })
  kit.taiko(CUES.crest, 0.16, 55) // far war drums (kit.taiko sends 0.5 = distance)
  kit.taiko(b('wasteland', 2), 0.18, 55)
  kit.taiko(b('wasteland', 2, 2), 0.12, 55)

  // ========================= S2 shear (CUES.chair 9.00, 96 BPM D min) =========================
  // taut heartbeat + scissor snaps; clippers SLAM+buzz PIN; SHEAR_M under the pass
  kit.heartbeat(CUES.chair, 0.3)
  for (let t = CUES.chair + beatSec('shear') * 2; t < 17.2; t += beatSec('shear') * 2)
    if (!nearFreeze(t)) kit.heartbeat(t, t < CUES.clippers ? 0.28 : 0.2)
  for (let n = 0; n < 22; n++) {
    const t = b('shear', 1) + n * beatSec('shear') * 0.5
    if (t >= 17.9) break
    if (nearFreeze(t)) continue // gated clear of the freeze — see header audit
    kit.tick(t, n % 4 === 2 ? 0.06 : 0.045, n % 2 ? 2400 : 2800) // 2.4-2.8 kHz scissor presence
  }
  // ---- PIN 1 (E7): the CLIPPERS SLAM at 12.70, buzz cut INSIDE the freeze ----
  // (composite-crest discipline: every member carries the pin attack, so the
  // stack sums sample-for-sample at t0 — members are trimmed as a STACK)
  kit.impact(CUES.clippers, 0.3, 55)
  kit.taiko(CUES.clippers, 0.27, 50)
  kit.crash(CUES.clippers, 0.08)
  nz(CUES.clippers, 0.5, { f: 6000, g: 0.08 }) // spark ring blooms through the freeze
  clippersBuzz(CUES.clippers, 12.86) // starts AT the pin, dead by 12.86 < 12.92
  // SHEAR motif — fast descending shred under the full pass (MASTER.shave 13.72)
  SHEAR_M.forEach((k, i) => shredN(MASTER.shave + i * 0.09, SHEAR_ROOT + k, { g: 0.1 - i * 0.008 }))
  kit.sub(MASTER.shave, 0.18, 60, 34, 1.2)
  kit.taiko(CUES.bloodbag, 0.32, 50) // the salute + IV-tube click (E10)
  kit.tick(CUES.bloodbag + 0.02, 0.05, 2200)
  kit.clunk(CUES.bloodbag + 0.1, 0.14)

  // ========================= S3 citadel (CUES.spray 19.80, 108 BPM D harm min -> F) =========================
  // DOOM enters breathing at EXACTLY 0.25 Hz; cult choir under the sneer;
  // vault pivots to music-box FLOW in F major; v8 percussion from steal/roar
  doomVoice(CUES.spray, 3.1, { g: 0.05, cut: 340, lfoHz: DOOM_LFO }) // the mask breathes with the music
  kit.choir(MASTER.sneer, [45, 50, 53], 1.2, 0.03, 'u', 1.0, 0.5) // cult moan under MEDIOCRE FOLLICLES
  flowMotif(CUES.vault, FLOW_ROOT + 3, 0.24, (m, t, d) => boxN(m, t, d + 0.5, 0.05)) // the wives carry hope, MAJOR, +14 still hangs
  kit.pad(CUES.vault, [65, 69, 72], 2.6, 0.028, 1400, 0.5)
  at(MASTER.steal, () => {
    // engine grumble building under the steal — raw nodes only inside at()
    const o = osc('sawtooth', 55, MASTER.steal, CUES.roar - MASTER.steal)
    o.frequency.linearRampToValueAtTime(68, CUES.roar)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 240
    const a = ac.createGain()
    a.gain.setValueAtTime(0, MASTER.steal)
    a.gain.linearRampToValueAtTime(0.03, CUES.roar - 0.2)
    a.gain.linearRampToValueAtTime(0, CUES.roar)
    o.connect(lp).connect(a)
    out(a, 1, 0.15, -0.2)
  })
  // ---- the rig ROARS (E15): v8 saw bursts + dust-wall noise + doom restate ----
  const V8 = [[0, 33], [0.24, 33], [0.52, 31]]
  V8.forEach(([dt, m]) =>
    at(CUES.roar + dt, () => {
      const ws = ac.createWaveShaper()
      ws.curve = chugCurve()
      const a = ac.createGain()
      a.gain.setValueAtTime(0, CUES.roar + dt)
      a.gain.linearRampToValueAtTime(0.11, CUES.roar + dt + 0.008)
      a.gain.exponentialRampToValueAtTime(0.001, CUES.roar + dt + 0.2)
      const o = osc('sawtooth', hz(m), CUES.roar + dt, 0.22)
      o.connect(ws).connect(a)
      out(a, 1, 0.12, 0.05)
    }),
  )
  nz(CUES.roar, 1.2, { f: 500, f1: 120, type: 'lowpass', g: 0.1, send: 0.2 })
  kit.taiko(CUES.roar, 0.42, 50)
  doomVoice(CUES.roar, 3.2, { g: 0.045, cut: 300, lfoHz: DOOM_LFO }) // the mask inhales behind the dust
  kit.swell(29.0, 29.95, 0.045) // whip-pan into the chase cut

  // ========================= S4 chase (CUES.doof 31.40, 140 BPM E min) =========================
  // THE DOOF CHUG — the score IS the doof. 8th-note chug on the section grid;
  // flame licks on downbeats; everything clears the ram PIN (see header audit).
  kit.riser(b('chase', 0, 2), CUES.doof, 0.08) // the speaker wall powers up
  kit.crash(CUES.doof, 0.12)
  chugN(CUES.doof, 40, 0.4, { g: 0.09, voices: 2 }) // ignition power-chord accent
  chugN(CUES.doof, 47, 0.35, { g: 0.055, voices: 1 })
  for (let k = 7; k <= 59; k++) {
    const t = b('chase', 0) + k * beatSec('chase') * 0.5
    if (t > 42.7) break // nothing crosses the S4->S5 cut
    if (t >= CUES.ram - 0.5 && t < CUES.ram + 0.7) continue // clears the ram window + resume beat
    const e = k % 8
    if (e === 0 || e === 4) {
      chugN(t, 40, 0.19, { g: e === 0 ? 0.1 : 0.075, voices: 2 })
      chugN(t, 47, 0.17, { g: 0.05, voices: 1 })
    } else chugN(t, 40, 0.19, { g: e % 2 ? 0.055 : 0.07, voices: 2 })
  }
  const LICKS = [b('chase', 1), b('chase', 2), b('chase', 3), b('chase', 5), b('chase', 6), b('chase', 7)]
  LICKS.forEach((t, i) => lickN(t, { g: 0.085, pan: (i % 2 ? 0.3 : -0.3) + (R() - 0.5) * 0.15 }))
  kit.hiss(MASTER.sprayDay, 0.5, 0.06) // Nux's silver mouth-spray (E18)
  // ---- PIN 2 (E19): the RAM — impact lands at freeze START, tail rings THROUGH ----
  kit.impact(CUES.ram, 0.31, 55)
  kit.taiko(CUES.ram, 0.27, 52)
  kit.crash(CUES.ram, 0.085)
  chugN(CUES.ram, 40, 0.5, { g: 0.075, voices: 3, send: 0.05, shelf: false }) // the metal note of the hit, near-dry, no shelf at the pin
  nz(CUES.ram, 0.4, { f: 5200, g: 0.075 }) // glass + spark hangs in the freeze
  kit.whoosh(CUES.swing, 0.5, 0.18, 400, 2200) // the boarding swing (E21)
  kit.glass(CUES.glass, 0.14, 0.9) // through the rear window (E22)
  for (let i = 0; i < 5; i++) kit.tick(CUES.glass + 0.15 + i * 0.13, 0.03, 1900 - i * 120) // polite applause

  // ========================= S5 defect (43.00, 140 BPM cont. — HALTS at seed) =========================
  // chug continues 3.2 s, ALL DRY, then TRUE SILENCE 46.20 -> 47.60 (1.40 s):
  // the conversion beat. Every send is killed before the hard-out (see header).
  kit.clunk(sect.defect.t0, 0.12) // Nux face-plants aboard (E23, = section downbeat)
  for (let k = 0; k <= 14; k++) {
    const t = b('defect', 0) + k * beatSec('defect') * 0.5
    if (t >= CUES.seed) break
    const last = k === 14 // 46.000 + 0.16 = 46.16 — ends before the hard-out
    if (k % 8 === 0 || k % 8 === 4) {
      chugN(t, 40, 0.19, { g: 0.09, voices: 2, send: 0 }) // interior on the rig — bone dry
      chugN(t, 47, 0.17, { g: 0.045, voices: 1, send: 0 })
    } else chugN(t, 40, last ? 0.16 : 0.19, { g: k % 2 ? 0.05 : 0.065, voices: 2, send: 0 })
  }
  // TRUE SILENCE seed -> seed+1.4 — nothing scheduled, nothing ringing (audited)
  breathSwell(CUES.seed + 1.4, CUES.witness - 0.1, { g: 0.03, f: 700 }) // one held breath into the sting
  witnessSting(CUES.witness, { g: 0.05, dur: 2.2, choirG: 0.03 }) // WITNESS ME. (E26)
  flowMotif(CUES.defect, FLOW_ROOT, 0.2, (m, t, d) => boxN(m, t, d + 0.4, 0.045)) // music-box FLOW solo, unresolved

  // ========================= S6 storm (52.50, 60 BPM B min — the quiet IS the palette) =========================
  kit.pad(sect.storm.t0, [47, 50, 54], CUES.calm - sect.storm.t0, 0.03, 750, 1.5) // deep blue pad
  kit.wind(sect.storm.t0 + 0.2, CUES.calm, 0.05, 320, 1400) // wind the only percussion
  kit.wind(CUES.calm, sect.storm.t1 - 0.1, 0.026, 900, 480) // the eye settles
  doomVoice(CUES.stormwall, 5.6, { g: 0.026, cut: 200, lfoHz: 0.16, breath: 0.4 }) // DOOM inverted, sleeping
  const TALE = [FLOW_ROOT, FLOW_ROOT + 3, FLOW_ROOT + 7] // FLOW minorized, a fragment only
  TALE.forEach((m, i) =>
    at(CUES.tale + i * 0.6, () => {
      const t = CUES.tale + i * 0.6
      const d = i === 2 ? 2.4 : 1.2
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(0.028, t + 0.15)
      a.gain.exponentialRampToValueAtTime(0.001, t + d)
      for (const det of [-4, 4]) {
        const o = osc('sine', hz(m), t, d)
        o.detune.value = det
        o.connect(a)
      }
      out(a, 1, 0.3, 0.1)
    }),
  )

  // ========================= S7 greenplace (CUES.mud 62.30, 66 BPM 3/4 D min) =========================
  kit.wind(sect.greenplace.t0 + 0.2, CUES.gone - 0.4, 0.02, 500, 300) // grey air
  const LAMENT = [[0, 50, 1.3], [1.3, 48, 1.0], [2.3, 46, 1.0], [3.3, 45, 1.35]] // ends 66.95, before gone
  LAMENT.forEach(([dt, m, d]) => celloN(CUES.mud + dt, m, d, { g: 0.06, cut: 1300 }))
  kit.sub(CUES.gone, 0.22, 40, 27, 4.0) // the floor drops to sub-only (E35)
  const DESPAIR = [[0, 50, 0.5], [0.5, 53, 0.45], [0.95, 57, 0.45], [1.4, 64, 0.5]] // FLOW-minor, the minor 9th hangs
  DESPAIR.forEach(([dt, m, d]) => celloN(CUES.despair + dt, m, d, { g: 0.062, cut: 1280 }))

  // ========================= S8 turn (71.50, 96 BPM D major) =========================
  kit.heartbeat(b('turn', 0), 0.32) // heartbeat only into the plan (E37)
  kit.heartbeat(b('turn', 0, 1), 0.28) // ends 72.74, before plan
  // ---- FLOW THEME, FIRST FULL MAJOR ENSEMBLE (E38): the 9th finally resolves ----
  kit.braam(CUES.plan, [50, 62, 66, 74], 2.0, 0.11, 1.35)
  kit.strings(CUES.plan + 0.05, [50, 57, 62, 66], 2.2, 0.035, 0.25) // NOTE: strings args are (t, notes, dur, g, atk, rel, cut) — never pass a cutoff positionally here
  kit.choir(CUES.plan + 0.1, [62, 66, 69], 1.8, 0.038, 'a', 0.3)
  kit.bass(CUES.plan, 38, 1.6, 0.16, 'sawtooth', 460)
  kit.kick(CUES.plan, 0.25)
  kit.crash(CUES.plan, 0.1)
  revRiser(CUES.plan + 0.6, CUES.uturn, 0.07) // reverse riser under the U-turn (E39)
  kit.taiko(CUES.uturn, 0.34, 58) // the synchronized skid lands
  kit.whoosh(CUES.uturn, 0.4, 0.12, 500, 2000)
  for (let n = 0; n < 10; n++) {
    const t = CUES.uturn + 0.4 + n * (0.19 - n * 0.011) // hats tighten toward fullsend
    if (t >= CUES.fullsend) break
    kit.hat(t, 0.03)
  }
  // ---- full send (E40): everything accelerates at lens ----
  kit.kick(CUES.fullsend, 0.27)
  kit.crash(CUES.fullsend, 0.11)
  kit.sub(CUES.fullsend, 0.22, 70, 32, 1.4)
  kit.braam(CUES.fullsend, [50, 57, 62], 1.2, 0.1, 1.35)
  kit.riser(b('turn', 2) + beatSec('turn'), CUES.converge - 0.1, 0.09) // dust wall into the S9 chug

  // ========================= S9 return (CUES.converge 80.00, 140 BPM E min) =========================
  // DOOF CHUG reprise WITH DOPPLER: every note bends slowly flat across the
  // section (0 -> -26c by bald), then the quarter-tone snap (-50c) and the
  // voices fall away one per 0.5 s through waver. Ends unresolved into the cut.
  kit.crash(CUES.converge, 0.1)
  chugN(CUES.converge, 40, 0.4, { g: 0.09, voices: 2, cents: 0 }) // reprise ignition
  chugN(CUES.converge, 47, 0.35, { g: 0.05, voices: 1, cents: 0 })
  const dopplerCents = (t) => (t < CUES.bald ? -26 * ((t - CUES.converge) / (CUES.bald - CUES.converge)) : -50)
  for (let k = 0; k <= 55; k++) {
    const t = b('return', 0) + k * beatSec('return') * 0.5
    if (t >= sect.return.t1 - 0.3) break // nothing crosses the S9->S10 cut
    if (t >= CUES.wigrip - 0.5 && t < CUES.bald + 0.25) continue // clears the rip window; the rip tail owns the freeze
    const e = k % 8
    if (t >= CUES.bald - 0.01) {
      const voices = Math.max(0, 3 - Math.floor((t - CUES.bald) / 0.5)) // one voice per 0.5 s
      if (voices <= 0) continue
      chugN(t, 40, 0.19, { g: 0.06, voices, cents: -50, send: 0.06 })
    } else {
      const cents = dopplerCents(t)
      if (e === 0 || e === 4) {
        chugN(t, 40, 0.19, { g: e === 0 ? 0.1 : 0.075, voices: 2, cents })
        chugN(t, 47, 0.17, { g: 0.05, voices: 1, cents })
      } else chugN(t, 40, 0.19, { g: e % 2 ? 0.055 : 0.07, voices: 2, cents })
    }
  }
  const RLICKS = [b('return', 1), b('return', 2), b('return', 3)]
  RLICKS.forEach((t, i) => lickN(t, { g: 0.075, pan: (i % 2 ? -0.3 : 0.3) + (R() - 0.5) * 0.15 }))
  // ---- PIN 3 (E44): THE WIG RIP at 86.00 — impact at freeze start, tail rings THROUGH ----
  kit.impact(CUES.wigrip, 0.34, 55)
  kit.taiko(CUES.wigrip, 0.3, 50)
  kit.crash(CUES.wigrip, 0.095)
  nz(CUES.wigrip, 0.5, { f: 6000, g: 0.09 }) // the white spark ring hangs in the money freeze
  // ---- E45 bald: the sting RETURNS (faith dying) + the chug detunes a quarter-tone ----
  witnessSting(CUES.bald, { g: 0.05, dur: 2.6, choirG: 0.022 })
  chugN(CUES.bald, 40, 0.45, { g: 0.085, voices: 3, cents: -26, bend: -24, send: 0.06 }) // the audible -50c slide
  nz(CUES.bald, 0.7, { f: 400, f1: 2600, type: 'bandpass', q: 1.2, g: 0.045 }) // the wig tumbles into the wind
  chugN(CUES.waver, 40, 0.5, { g: 0.05, voices: 1, cents: -70, send: 0.05 }) // the doof falters: one note (E46)
  at(b('return', 6), () => {
    // unresolved E-minor-with-b9 hang from bar 6 — the army wavering, cut by the edit
    const t0 = b('return', 6)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t0)
    a.gain.linearRampToValueAtTime(0.028, t0 + 0.4)
    a.gain.setValueAtTime(0.028, sect.return.t1 - 0.7)
    a.gain.linearRampToValueAtTime(0, sect.return.t1 - 0.3)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    lp.connect(a)
    for (const m of [40, 47, 53]) {
      const o = osc('sawtooth', hz(m), t0, 1.8)
      o.detune.value = (m % 3) * 5
      o.connect(lp)
    }
    out(a, 1, 0.05, 0, 0.7)
  })

  // ========================= S10 flow (CUES.valve 93.00, 108 BPM D major) =========================
  kit.taiko(sect.flow.t0, 0.17, 50) // the gates open (war boys haul them)
  kit.pad(sect.flow.t0, [50, 57, 62], beatSec('flow') * 2.5, 0.028, 1200, 0.4) // ends 92.39, before the valve window
  // ---- PIN 4 (E47): the VALVE SLAM at 93.00 ----
  kit.clunk(CUES.valve, 0.28)
  kit.impact(CUES.valve, 0.31, 55)
  kit.braam(CUES.valve, [50, 57, 62], 0.7, 0.11, 1.35)
  nz(CUES.valve, 0.4, { f: 5500, g: 0.065 })
  // ---- the FLOW RAINS (E48): harp gliss up the D-major pentatonic ----
  const GLISS = [62, 66, 69, 74, 78, 81, 86]
  GLISS.forEach((m, i) => kit.bell(CUES.rain + i * 0.055, hz(m), 0.045, 1.1, 4, 2))
  kit.pad(CUES.rain, [50, 57, 62], 2.2, 0.026, 1400, 0.5)
  // ---- THE REGROW LADDER — four CLOCK PINS (never grid notes) + the resolve pin ----
  at(CUES.regrow1, () => {
    // low D root bed under the ladder — from the regrow1 pin to the resolve pin
    const o = osc('sine', hz(38), CUES.regrow1, CUES.resolve - CUES.regrow1)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, CUES.regrow1)
    a.gain.linearRampToValueAtTime(0.035, CUES.regrow1 + 0.2)
    a.gain.setValueAtTime(0.035, CUES.resolve - 0.25)
    a.gain.linearRampToValueAtTime(0, CUES.resolve)
    o.connect(a)
    out(a, 1, 0.1)
  })
  REGROW_LADDER.forEach((tk, i) => {
    boxN(tk.midi, CUES['regrow' + (i + 1)], 0.9, 0.055 + i * 0.005) // 62/64/66/69 — SHEAR answered inverted
    kit.tick(CUES['regrow' + (i + 1)], 0.03, 3200)
  })
  boxN(REGROW_RESOLVE.midi, CUES.resolve, 1.6, 0.07) // 74 — full circle (flash in picture)
  kit.pad(CUES.resolve, [50, 57, 62, 66], 1.0, 0.03, 1600, 0.25)
  const SHIMMER = [86, 90]
  SHIMMER.forEach((m, i) => kit.bell(CUES.resolve + 0.05 + i * 0.09, hz(m), 0.028, 1.2, 5, 2))
  // ---- crowd choir (E50): Flowiosa lifted ----
  kit.choir(CUES.lifted, [62, 66, 69, 74], 0.8, 0.042, 'a', 0.15, 0.4)
  kit.crowd(CUES.lifted, CUES.lifted + 1.0, 0.035)
  // ---- walk (E51): strip to SOLO CELESTA — all dry from here to the slate ----
  flowMotif(CUES.walk, FLOW_ROOT, 0.2, (m, t, d) => boxN(m, t, d + 0.3, 0.042, 0))
  kit.blip(MASTER.sprout1, 3200, 0.02, 0.07, 'sine') // one single hair pops (E52)
  twang(CUES.pluck) // the comic TWANG (E53) — takes the hung note down
  nz(MASTER.windTake - 0.02, 0.5, { f: 900, f1: 2600, type: 'bandpass', g: 0.03, send: 0 }) // the wind takes it (E54)
  // ---- end button (E55): one soft D-major chord, ALL-DRY — then NOTHING ----
  at(CUES.card, () => {
    const o = osc('sine', hz(50), CUES.card, 0.9) // D3 felt thump sagging to D2
    o.frequency.exponentialRampToValueAtTime(hz(38), CUES.card + 0.5)
    const a = ac.createGain()
    a.gain.setValueAtTime(0.2, CUES.card)
    a.gain.exponentialRampToValueAtTime(0.001, CUES.card + 0.85)
    o.connect(a)
    out(a, 1, 0)
  })
  const BUTTON = [62, 66, 69]
  BUTTON.forEach((m, i) =>
    at(CUES.card, () => {
      const f = hz(m)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, CUES.card)
      a.gain.linearRampToValueAtTime(0.038, CUES.card + 0.005)
      a.gain.exponentialRampToValueAtTime(0.001, CUES.card + 1.0)
      for (const [mul, kg] of [[1, 1], [2, 0.4], [3.01, 0.16]]) {
        const o = osc('sine', f * mul, CUES.card, 1.0)
        const og = ac.createGain()
        og.gain.value = kg
        o.connect(og).connect(a)
      }
      out(a, 1, 0, (i - 1) * 0.15)
    }),
  )
  // the slate rides silence from ~101.4 to 102.0 — nothing after the button
}
