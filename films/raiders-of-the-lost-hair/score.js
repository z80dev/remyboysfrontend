// RAIDERS OF THE LOST HAIR — original score. 1936 serial-adventure idiom; every note
// original (the fast-pickup-into-held-note SHAPE is genre grammar, the intervals are not
// Raiders, not Williams, not anyone's). All cue times come from ./timeline.js (EV_* tables
// schedule on e.f = filmT(e.g); STRAND_F / SCISSORS / WISP_X / CAPS / DRAWN / SHOTS /
// STOPS) or from the score's own 120 BPM spine — nothing here re-types a timeline time by
// hand, and the S3 chase groove is generated in WORLD g and mapped through the shared
// filmT, so both hit-stops retime score and picture together (pirates DUEL.abs lesson).
//
// MOTIF PLAN (all original):
//   ADVENTURE  pickup rip [0,+4,+7,+12] -> HELD +16, resolving to the held 5th (+7).
//              Root 50 (D). Stated COMPLETE exactly once — the title card (T1 20.2).
//              Fragments elsewhere: the rip only, never the held note —
//                strand fragments (combing ladder roots 50/54/57/59/61/62/64),
//                chase triplet runs (+0,+4,+7 shapes),
//                map trot + warehouse trot contour (the pluck line spells the rip),
//                end button (the rip chord, DRY, as the stab).
//   ARK        choir-pad chord, root 45 (A): WAX [45,48,52,55] (m7, low, drippy) vs
//              FLOW [45,49,52,56] (maj7, the lift). WAX: S1 rival reveal, S2 legend
//              panels, S5 tableau hum. Mode-flip WAX->FLOW at EV_S5.modeFlip (f 71.0);
//              the hum's third bends C->C# mid-note at EV_S5.humMajor (f 71.6).
//              FLOW arpeggio glints on the ark pulse (f 55.7), crate glow, slat winks.
//
// TEMPO SPINE: 120 BPM, beat 0.5 s, bar 2.0 s, anchored at film 0 (every scene f0 in
// timeline.SCENES lands on the 0.5 grid, so title/gallop/nail-guns/forklift all sit ON
// the bar grid). Story-synced foley rides e.f exactly.
//
// HIT-STOPS (the only two, both in S3): PIN = filmT(STOPS[i].g), freeze end
// REL = filmT(STOPS[i].g) + STOPS[i].d — no hand math. HIT-STOP 1 (windscreen, PIN1):
// glass burst scored as a cymbal CHOKE whose envelope is cut at REL1, with the groove's
// resume pickup sounding exactly at REL1 (filmT folds over the freeze, so no g-domain cue
// can sound inside [PIN1, REL1) — the choke zone is structural, and the self-check
// asserts it). HIT-STOP 2 (axle): grid cues gated within +-0.4 s of PIN2; one modest pin
// at PIN2, the polite 'hm' nod passes on EV_S3.nodPass.
//
// VOICES (custom, beyond the 34-instrument kit):
//   brassNote/brassStab — detuned saw stack x3, fast attack, lowpass bloom (fanfare/pins)
//   horn               — saw+sub-sine held note, vibrato LFO (the long-note hero voice)
//   triStrings         — 3-note detuned-square rip (chase triplet runs)
//   snare + roll       — bandpassed noise + tuned body (gallop, buttons)
//   hoof               — dry sine knock + noise tap (gallop, veer-off)
//   cymbalChoke        — highpassed noise swell HARD-CUT at the freeze release
//   chalk              — jittered saw through a narrow bandpass (board squeak)
//   sigh               — dreamy descending sine (synchronized snooze wave)
//   sandPour           — lowpassed noise swell (the sand-wig)
//   blat               — muted bassoon (comedy: heave, shrug, horse surprise)
//   motor              — AM-buzzed saw pair (plane contrail, convoy, suspension roar)
//   hm                 — tiny dry down-glide blip (the polite nods)
//   snip               — two metallic clicks; wet mode for the cape hem
//   drip               — sine plip with fast pitch drop (wax, one per seam)
//   wisp               — soft noise puff + micro up-zip (dust-wisp domino)
//   slump              — slow pitch-bent low brass with wobble (wax/taffy melt)
//   chrome             — detuned additive shimmer (chrome skull, flow column, glows)
//   insects            — high bandpass noise bed that dies under the choir hum
//   beeper             — two-tone square backup beep (forklift, quantized to the trot)
//   nailGun            — triple tick + thock (crate, in tempo)
//   rattle / whum / boing / glint / block / zip — basket rattle, nod wall, pluck gag,
//                                          golden bell (Hz!), woodblock, comic glides
//
// SCHEDULING DISCIPLINE: no kit instrument is ever called inside an at() callback (the
// event list is sorted once after score() returns) — composite voices build raw
// osc->gain->filter nodes inside ONE at() instead. Every node chain is gain/filter-shaped
// and leaves through kit.out() with an explicit envelope; exponential ramps always land
// positive (>= 0.0001).
//
// LOUDNESS STRATEGY (engine peak-normalizes to -1 dBFS then two-pass -14 LUFS; our job is
// internal balance so loudnorm never pumps):
//   tier 1 beds (drones/winds/insects/motor)      g 0.022-0.055
//   tier 2 ostinati (trot plucks/ticks/hooves)    g 0.025-0.07
//   tier 3 leads (horn/triplets/snare/stabs)      g 0.05-0.15
//   tier 4 pins (title, both hit-stops, arrival)  g 0.13-0.16, impact <= 0.5, sub <= 0.38
// Bass is short and dark (cut <= 500) so it never masks the choir; choir gains kept
// <= 0.04 (its hard send is 0.9); taiko (send 0.5/0.6) only mid-film. The S6 end button
// and final resolve are built ALL-DRY (send 0) so the shared 3.2 s IR is never re-excited:
// last dry audio ends ~99.6, nothing re-rings past ~99.7, well short of 101.0.
import {
  CAPS,
  DRAWN,
  DURATION,
  EV_S1,
  EV_S2,
  EV_S3,
  EV_S4,
  EV_S5,
  EV_S6,
  EV_TITLE,
  SCISSORS,
  SHOTS,
  STOP1_G,
  STOP2_G,
  STOPS,
  STRANDS,
  STRAND_F,
  WISP_X,
  filmT,
} from './timeline.js'

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit

  // ---------- clock: pins (freeze starts) and rels (where picture resumes), all via filmT ----------
  const PIN1 = filmT(STOP1_G)
  const REL1 = PIN1 + STOPS[0].d
  const PIN2 = filmT(STOP2_G)
  const REL2 = PIN2 + STOPS[1].d
  const shotT = (name) => SHOTS.find((s) => s.name === name).t0

  // ---------- 120 BPM spine ----------
  const BEAT = 0.5
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x))

  // ---------- custom voices (composite ones build raw nodes inside ONE at() each) ----------
  // brass note: detuned saw stack through a bloom lowpass — serial fanfare
  const brassNote = (t, m, dur, { g = 0.12, send = 0.22, pan = 0, atk = 0.03 } = {}) =>
    at(t, () => {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(1000, t)
      lp.frequency.linearRampToValueAtTime(2700, t + 0.12)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + atk)
      a.gain.setValueAtTime(g, t + Math.max(atk + 0.02, dur - 0.15))
      a.gain.linearRampToValueAtTime(0, t + dur)
      for (const det of [-6, 0, 6]) {
        const o = osc('sawtooth', hz(m) * 0.987, t, dur + 0.02)
        o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.07)
        o.detune.value = det
        o.connect(lp)
      }
      lp.connect(a)
      out(a, 1, send, clamp(pan, -0.8, 0.8))
    })
  const brassStab = (t, notes, dur = 0.5, o = {}) =>
    notes.forEach((m, i) => brassNote(t, m, dur, { ...o, pan: (o.pan || 0) + i * 0.03 }))

  // horn: the held-note voice (saw + sub sine, vibrato, gentle attack)
  const horn = (t, m, dur, { g = 0.09, atk = 0.09, send = 0.28, pan = -0.05, vib = true, dry = false } = {}) =>
    at(t, () => {
      const f = hz(m)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = Math.min(2400, f * 6)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + atk)
      a.gain.setValueAtTime(g, t + Math.max(atk + 0.05, dur - 0.35))
      a.gain.linearRampToValueAtTime(0, t + dur)
      const o1 = osc('sawtooth', f, t, dur + 0.05)
      const o2 = osc('sine', f * 0.5, t, dur + 0.05)
      const g2 = ac.createGain()
      g2.gain.value = 0.5
      o1.connect(lp)
      o2.connect(g2).connect(lp)
      lp.connect(a)
      if (vib) {
        const l = osc('sine', 5.2, t, dur + 0.05)
        const lg = ac.createGain()
        lg.gain.value = 4
        l.connect(lg)
        lg.connect(o1.detune)
        lg.connect(o2.detune)
      }
      out(a, 1, dry ? 0 : send, pan)
    })

  // triplet string rip: 3 detuned squares, chase shimmer
  const triStrings = (t, m0, { g = 0.05, dir = 1, send = 0.3 } = {}) =>
    at(t, () => {
      const steps = dir > 0 ? [0, 4, 7] : [7, 4, 0]
      steps.forEach((iv, i) => {
        const tt = t + i * 0.11
        const d = 0.16
        const lp = ac.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 3200
        const a = ac.createGain()
        a.gain.setValueAtTime(0, tt)
        a.gain.linearRampToValueAtTime(g, tt + 0.015)
        a.gain.exponentialRampToValueAtTime(0.001, tt + d)
        for (const det of [-9, 8]) {
          const o = osc('square', hz(m0 + iv), tt, d)
          o.detune.value = det
          o.connect(lp)
        }
        lp.connect(a)
        out(a, 1, send, i * 0.08 - 0.08)
      })
    })

  // snare: noise snap + tuned dry body (rolls stay tight)
  const snare = (t, { g = 0.15, tune = 190, send = 0.12 } = {}) =>
    at(t, () => {
      const n = noise(t, 0.16)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 2100
      bp.Q.value = 0.8
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
      n.connect(bp).connect(a)
      out(a, 1, send)
      const o = osc('sine', tune * 1.35, t, 0.09)
      o.frequency.exponentialRampToValueAtTime(tune, t + 0.05)
      const ag = ac.createGain()
      ag.gain.setValueAtTime(g * 0.7, t)
      ag.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
      o.connect(ag)
      out(ag, 1, 0)
    })

  // gallop hoof: dry knock + tap
  const hoof = (t, { g = 0.09, pan = 0 } = {}) =>
    at(t, () => {
      const o = osc('sine', 150, t, 0.07)
      o.frequency.exponentialRampToValueAtTime(70, t + 0.05)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
      o.connect(a)
      out(a, 1, 0, pan)
      const n = noise(t, 0.04)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 900
      const ng = ac.createGain()
      ng.gain.setValueAtTime(g * 0.5, t)
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
      n.connect(lp).connect(ng)
      out(ng, 1, 0, pan)
    })

  // cymbal choke: swell that is HARD-CUT at tCut (the freeze release)
  const cymbalChoke = (t, tCut, { g = 0.16 } = {}) =>
    at(t, () => {
      const n = noise(t, tCut - t + 0.02)
      const hp = ac.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 5200
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.012)
      a.gain.setValueAtTime(g * 0.8, t + Math.max(0.03, (tCut - t) * 0.6))
      a.gain.linearRampToValueAtTime(0.0001, tCut) // the choke
      a.gain.linearRampToValueAtTime(0, tCut + 0.01)
      n.connect(hp).connect(a)
      out(a, 1, 0.35)
    })

  // chalk squeak: jittered saw through a narrow resonant bandpass
  const chalk = (t, dur = 0.45, { g = 0.035, f = 1900 } = {}) =>
    at(t, () => {
      const o = osc('sawtooth', f, t, dur)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = f
      bp.Q.value = 9
      const lfo = osc('sine', 7.3, t, dur)
      const lg = ac.createGain()
      lg.gain.value = f * 0.09
      lfo.connect(lg).connect(bp.frequency)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.05)
      a.gain.linearRampToValueAtTime(0, t + dur)
      o.connect(bp).connect(a)
      out(a, 1, 0.18, 0.15)
    })

  // synchronized snooze sigh
  const sigh = (t, dur = 0.8, { g = 0.03, f0 = 523, f1 = 392 } = {}) =>
    at(t, () => {
      const o = osc('sine', f0, t, dur)
      o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + dur * 0.35)
      a.gain.linearRampToValueAtTime(0, t + dur)
      o.connect(a)
      out(a, 1, 0.25, -0.2)
      const n = noise(t, dur)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 900
      const ng = ac.createGain()
      ng.gain.setValueAtTime(0, t)
      ng.gain.linearRampToValueAtTime(g * 0.3, t + dur * 0.35)
      ng.gain.linearRampToValueAtTime(0, t + dur)
      n.connect(bp).connect(ng)
      out(ng, 1, 0.2, -0.25)
    })

  // sand pour
  const sandPour = (t, dur = 0.9, { g = 0.06 } = {}) =>
    at(t, () => {
      const n = noise(t, dur)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(2200, t)
      lp.frequency.exponentialRampToValueAtTime(500, t + dur)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.1)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      n.connect(lp).connect(a)
      out(a, 1, 0.2)
    })

  // muted bassoon blat (comedy)
  const blat = (t, m, dur = 0.22, { g = 0.09, pan = 0 } = {}) =>
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
      out(a, 1, 0.15, pan)
    })

  // motor: AM-buzzed detuned saw pair (plane / convoy / suspension)
  const motor = (t0, t1, { g = 0.045, f = 90, buzz = 27 } = {}) =>
    at(t0, () => {
      const dur = t1 - t0
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 340
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + 0.3)
      a.gain.setValueAtTime(g, t1 - 0.25)
      a.gain.linearRampToValueAtTime(0, t1)
      for (const det of [0, 9]) {
        const o = osc('sawtooth', f, t0, dur)
        o.detune.value = det
        o.connect(lp)
      }
      const am = osc('sine', buzz, t0, dur)
      const ag = ac.createGain()
      ag.gain.value = g * 0.4
      am.connect(ag).connect(a.gain)
      lp.connect(a)
      out(a, 1, 0.12, 0.1)
    })

  // the polite 'hm' — tiny dry blip with a downward micro-glide
  const hm = (t, { g = 0.04, f = 235, pan = 0 } = {}) =>
    at(t, () => {
      const o = osc('sine', f, t, 0.14)
      o.frequency.exponentialRampToValueAtTime(f * 0.88, t + 0.12)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 500
      bp.Q.value = 1.4
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.02)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
      o.connect(bp).connect(a)
      out(a, 1, 0.05, pan)
    })

  // scissor snip: two metallic clicks; wet = lower, plumper
  const snip = (t, { g = 0.09, wet = false, hi = false } = {}) =>
    at(t, () => {
      const f = hi ? 6800 : wet ? 2600 : 5200
      for (const [dt, kg] of [[0, 1], [0.045, 0.6]]) {
        const n = noise(t + dt, 0.05)
        const bp = ac.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = f
        bp.Q.value = 3
        const a = ac.createGain()
        a.gain.setValueAtTime(g * kg, t + dt)
        a.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.05)
        n.connect(bp).connect(a)
        out(a, 1, wet ? 0.2 : 0.08, wet ? -0.1 : 0.1)
      }
      if (wet) {
        const o = osc('sine', 300, t, 0.08)
        o.frequency.exponentialRampToValueAtTime(210, t + 0.06)
        const og = ac.createGain()
        og.gain.setValueAtTime(g * 0.4, t)
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
        o.connect(og)
        out(og, 1, 0.1, -0.1)
      }
    })

  // wax drip plip (raw noise tick built in the same at() — no kit call inside)
  const drip = (t, { g = 0.06, f = 950 } = {}) =>
    at(t, () => {
      const o = osc('sine', f, t, 0.1)
      o.frequency.exponentialRampToValueAtTime(f * 0.34, t + 0.08)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      o.connect(a)
      out(a, 1, 0.25, 0.2)
      const n = noise(t + 0.005, 0.02)
      const hp = ac.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 3400
      const ng = ac.createGain()
      ng.gain.setValueAtTime(g * 0.5, t + 0.005)
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.025)
      n.connect(hp).connect(ng)
      out(ng, 1, 0.06, 0.2)
    })

  // dust-wisp pop: soft puff + micro up-zip (the wisp combs itself into a strand)
  const wisp = (t, pan = 0, { g = 0.055 } = {}) =>
    at(t, () => {
      const n = noise(t, 0.28)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 900
      bp.Q.value = 1
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.012)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.26)
      n.connect(bp).connect(a)
      out(a, 1, 0.18, pan)
      const o = osc('sine', 620, t + 0.05, 0.14)
      o.frequency.exponentialRampToValueAtTime(1450, t + 0.16)
      const og = ac.createGain()
      og.gain.setValueAtTime(0.0001, t + 0.05)
      og.gain.exponentialRampToValueAtTime(0.02, t + 0.09)
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.19)
      o.connect(og)
      out(og, 1, 0.15, pan)
    })

  // slow pitch-bent low brass slump (wax / taffy)
  const slump = (t0, t1, m0, m1, { g = 0.05 } = {}) =>
    at(t0, () => {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 300
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + 0.25)
      a.gain.setValueAtTime(g, t1 - 0.3)
      a.gain.linearRampToValueAtTime(0, t1)
      for (const det of [-5, 6]) {
        const o = osc('sawtooth', hz(m0), t0, t1 - t0)
        o.frequency.exponentialRampToValueAtTime(hz(m1), t1 - 0.1)
        o.detune.value = det
        o.connect(lp)
      }
      const w = osc('sine', 3.1, t0, t1 - t0)
      const wg = ac.createGain()
      wg.gain.value = 60 // slow filter wobble = the taffy give
      w.connect(wg).connect(lp.frequency)
      lp.connect(a)
      out(a, 1, 0.25, -0.15)
    })

  // chrome shimmer: detuned additive bloom with tremolo
  const chrome = (t, m, dur = 1.6, { g = 0.032, send = 0.4 } = {}) =>
    at(t, () => {
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.4)
      a.gain.setValueAtTime(g, t + Math.max(0.5, dur - 0.5))
      a.gain.linearRampToValueAtTime(0, t + dur)
      const f = hz(m) * 2 // an octave up, glassy
      for (const [mul, kg] of [[1, 1], [2.01, 0.4], [2.76, 0.18]]) {
        const o = osc('sine', f * mul, t, dur)
        const og = ac.createGain()
        og.gain.value = kg
        o.connect(og).connect(a)
      }
      const tr = osc('sine', 5.5, t, dur)
      const tg = ac.createGain()
      tg.gain.value = g * 0.3
      tr.connect(tg).connect(a.gain)
      out(a, 1, send, 0.1)
    })

  // night insects: high bed that dies under the hum
  const insects = (t0, t1, { g = 0.028, dieAt = 0.7 } = {}) =>
    at(t0, () => {
      const n = noise(t0, t1 - t0)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 7000
      bp.Q.value = 0.8
      const a = ac.createGain()
      const tdie = t0 + (t1 - t0) * dieAt
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + 0.5)
      a.gain.setValueAtTime(g, tdie)
      a.gain.linearRampToValueAtTime(0, t1) // die out UNDER the choir hum
      n.connect(bp).connect(a)
      out(a, 1, 0.15, -0.2)
    })

  // forklift backup beeper (two-tone, quantized to the trot)
  const beeper = (t, { g = 0.05 } = {}) => {
    kit.blip(t, 1175, g, 0.15, 'square')
    kit.blip(t + 0.08, 881, g * 0.7, 0.12, 'square')
  }

  // nail gun: triple tick + thock, in tempo
  const nailGun = (t, { g = 0.08 } = {}) =>
    at(t, () => {
      for (const dt of [0, 0.028, 0.056]) {
        const n = noise(t + dt, 0.03)
        const bp = ac.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = 3200
        bp.Q.value = 2
        const a = ac.createGain()
        a.gain.setValueAtTime(g * 0.8, t + dt)
        a.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.03)
        n.connect(bp).connect(a)
        out(a, 1, 0.06, 0.25)
      }
      const o = osc('sine', 185, t + 0.06, 0.08)
      o.frequency.exponentialRampToValueAtTime(120, t + 0.13)
      const og = ac.createGain()
      og.gain.setValueAtTime(g, t + 0.06)
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
      o.connect(og)
      out(og, 1, 0, 0.25)
    })

  // basket rattle: tremoloed bandpass shiver
  const rattle = (t, dur = 0.3, { g = 0.06 } = {}) =>
    at(t, () => {
      const n = noise(t, dur)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 720
      bp.Q.value = 1.1
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.03)
      a.gain.linearRampToValueAtTime(0, t + dur)
      const am = osc('square', 16, t, dur)
      const ag = ac.createGain()
      ag.gain.value = g * 0.55
      am.connect(ag).connect(a.gain)
      n.connect(bp).connect(a)
      out(a, 1, 0.12, -0.2)
    })

  // synchronized nod wall: soft low whum
  const whum = (t, { g = 0.075 } = {}) =>
    at(t, () => {
      const o = osc('sine', 92, t, 0.28)
      o.frequency.exponentialRampToValueAtTime(60, t + 0.24)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.04)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
      o.connect(a)
      out(a, 1, 0.1)
      const n = noise(t, 0.1)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 420
      const ng = ac.createGain()
      ng.gain.setValueAtTime(g * 0.35, t)
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      n.connect(lp).connect(ng)
      out(ng, 1, 0.08)
    })

  // cheeky pluck + wink (comic boing lineage)
  const boing = (t, { g = 0.085 } = {}) => {
    at(t, () => {
      const o = osc('square', 640, t, 0.3)
      o.frequency.exponentialRampToValueAtTime(510, t + 0.22)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
      o.connect(a)
      out(a, 1, 0.12, 0.06)
    })
    kit.blip(t + 0.16, 1568, g * 0.5, 0.07, 'sine') // the wink
  }

  // golden glint — kit.bell takes Hz
  const glint = (t, m, g = 0.055, dur = 0.9) => kit.bell(t, hz(m), g, dur, 3.5, 2)

  // woodblock
  const block = (t, { g = 0.05, f = 1850, pan = 0.1 } = {}) =>
    at(t, () => {
      const o = osc('sine', f, t, 0.06)
      o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.035)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
      o.connect(a)
      out(a, 1, 0.06, pan)
    })

  // comic zip / skid
  const zip = (t, f0, f1, dur, g = 0.045, pan = 0) =>
    at(t, () => {
      const o = osc('sine', f0, t, dur)
      o.frequency.exponentialRampToValueAtTime(f1, t + dur)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.connect(a)
      out(a, 1, 0.1, pan)
    })

  // dry end-button voices (send 0): the last sounds must not excite the shared 3.2 s IR
  const subDry = (t, g = 0.3, f0 = 62, f1 = 30, dur = 0.8) =>
    at(t, () => {
      const o = osc('sine', f0, t, dur)
      o.frequency.exponentialRampToValueAtTime(f1, t + dur)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.connect(a)
      out(a, 1, 0)
    })
  const thudDry = (t, g = 0.24) =>
    at(t, () => {
      const n = noise(t, 0.12)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 380
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
      n.connect(lp).connect(a)
      out(a, 1, 0)
    })

  // ============================ A. S1 — THE TEMPLE (f 0-20) ============================
  kit.drone(0.0, EV_S1.daylight.f, [38, 45], 0.032, 300) // torch-lit cave hum
  kit.wind(0.4, shotT('s1c') - 0.2, 0.03, 180, 520) // torch draft
  glint(EV_S1.idolLift.f, 88, 0.05, 1.4) // golden toupee lifted
  sandPour(EV_S1.sandWigDown.f, 0.8)
  kit.clunk(EV_S1.pat.f, 0.1) // polite pat
  hm(EV_S1.pat.f + 0.12, { g: 0.03, f: 260 }) // the dry "hup"
  kit.tick(EV_S1.grain.f, 0.07, 3000) // ONE grain
  kit.sub(EV_S1.subBoom.f, 0.38, 70, 26, 1.6) // the temple hears it
  kit.braam(EV_S1.irisRed.f, [38], 1.4, 0.09, 0.6) // iris glows red
  // HAIRBALL CHASE: accelerating taiko + tempo-locked tile clatter + whooshes
  const chaseT0 = EV_S1.hairballRelease.f
  const chaseT1 = EV_S1.daylight.f
  {
    let t = chaseT0
    while (t < chaseT1 - 0.15) {
      const p = (t - chaseT0) / (chaseT1 - chaseT0)
      kit.taiko(t, 0.32 + 0.3 * p, 62 - Math.round(8 * p))
      t += 0.5 - 0.28 * p
    }
    for (let k = 0, tt = chaseT0 + 0.25; tt < chaseT1 - 0.2; k++, tt += BEAT / 2) {
      block(tt, { g: 0.04, f: 1400 + (k % 3) * 320, pan: k % 2 ? 0.2 : -0.2 }) // dandruff tiles
      kit.tick(tt + 0.02, 0.035, 4200)
    }
    for (const wt of [0.4, 1.4, 2.4, 3.4, 4.4]) kit.whoosh(chaseT0 + wt, 0.45, 0.13, 300, 3200)
    triStrings(chaseT0 + 2.0, 50, { g: 0.045 })
    triStrings(chaseT0 + 4.0, 54, { g: 0.05 }) // ADVENTURE fragments in the run
    zip(EV_S1.filamentStick.f, 1300, 2400, 0.12, 0.035) // filament sticks to the fedora
    kit.riser(chaseT1 - 1.0, chaseT1, 0.1)
  }
  // DAYLIGHT — hard cut
  kit.impact(EV_S1.daylight.f, 0.5, 55)
  kit.crash(EV_S1.daylight.f, 0.14)
  kit.sub(EV_S1.daylight.f, 0.3, 80, 32, 1.2)
  zip(EV_S1.daylight.f + 0.02, 2400, 500, 0.3, 0.05) // skid
  kit.drone(EV_S1.rivalReveal.f, EV_S1.umbrella.f, [45, 48, 52], 0.03, 420) // WAX dread
  kit.choir(EV_S1.rivalReveal.f, [45, 48, 52, 55], 2.4, 0.026, 'u') // ARK motif, WAX state
  for (const [i, d] of EV_S1.darts.entries()) {
    kit.tick(d.f, 0.09, 2400 - i * 150) // thunk x3, herding
    block(d.f, { g: 0.04, f: 1100, pan: -0.3 })
  }
  // umbrella SNAPS open on the downbeat (f 15.0 = beat 30 of the spine)
  snare(EV_S1.umbrella.f, { g: 0.18, tune: 220, send: 0.15 })
  brassStab(EV_S1.umbrella.f, [45, 52], 0.35, { g: 0.1 }) // fragment: rip into the 5th
  kit.pluck(EV_S1.idolOnCanopy.f, 69, 0.07, 2200) // idol onto the canopy
  glint(EV_S1.idolOnCanopy.f + 0.03, 93, 0.035, 0.6)
  block(EV_S1.rivalTip.f, { g: 0.045, f: 1500 }) // Panama tips
  block(EV_S1.heroTip.f, { g: 0.045, f: 1750, pan: -0.15 }) // fedora tips
  horn(EV_S1.sprintOut.f, 57, 1.45, { g: 0.09 }) // ONE held note over the sprint,
  // ...which is the dominant the title fanfare rips from.
  kit.tick(EV_S1.dartPuff.f, 0.05, 2800)

  // ============================ B. TITLE — full ADVENTURE statement (f 20-24) ============================
  const T1 = CAPS.find((c) => c.id === 'T1')
  const TT = T1.t0 // the ONLY complete airing of the motif
  kit.taiko(EV_TITLE.silStop.f, 0.3, 48) // the hairball settles, distant
  ;[50, 54, 57, 62].forEach((m, i) => brassNote(TT + i * 0.125, m, 0.16, { g: 0.13, atk: 0.015 })) // pickup rip
  const TH = TT + 0.5
  horn(TH, 66, 1.7, { g: 0.1, atk: 0.05 }) // the HELD +16
  kit.choir(TH + 0.05, [50, 57, 62, 66], 2.3, 0.038, 'a')
  kit.bass(TH, 38, 1.8, 0.2, 'sawtooth', 420)
  kit.crash(TH, 0.13)
  kit.kick(TH, 0.42)
  kit.impact(TH, 0.45, 55)
  kit.strings(TH + 0.1, [50, 57, 62, 66], 2.0, 0.034, 0.7)
  for (let i = 0; i < 5; i++) snare(TT + i * 0.11, { g: 0.05 + i * 0.02, tune: 210 }) // roll under the type-on
  // answering phrase + timpani + hats under the held note (chapter-plate grammar)
  brassNote(TT + 1.3, 57, 0.22, { g: 0.11, atk: 0.02 })
  brassNote(TT + 1.55, 62, 0.3, { g: 0.11, atk: 0.02 })
  kit.strings(TT + 1.3, [50, 57], 1.0, 0.026, 0.5)
  kit.bass(TT + 1.3, 38, 0.4, 0.16, 'sawtooth', 380)
  kit.bass(TT + 1.8, 38, 0.4, 0.14, 'triangle', 380)
  snare(TT + 1.3, { g: 0.08, tune: 210, send: 0.1 })
  kit.taiko(TT + 1.6, 0.42, 45)
  kit.taiko(TT + 2.8, 0.42, 45)
  for (let i = 0; i < 4; i++) kit.hat(TT + 0.75 + i * 0.25, 0.02)
  glint(EV_TITLE.oDrop.f, 81, 0.06, 1.1) // the toupee "O" drops
  kit.choir(EV_TITLE.credit.f, [57], 1.6, 0.02, 'o') // credit line
  horn(TT + 2.1, 64, 0.4, { g: 0.075, vib: false }) // resolution: +14
  horn(TT + 2.5, 62, 1.1, { g: 0.085 }) // -> the held 5th
  block(TT + 3.3, { g: 0.04 })
  kit.wind(shotT('s2a') - 0.4, shotT('s2a'), 0.03, 300, 700)

  // ============================ C. S2 — THE BRIEFING + THE MAP (f 24-35) ============================
  // (audio-QA P1: the briefing read as mute at -29.1 LUFS, 18 LU under the title —
  // a room bed now sustains the whole shot and the hushed cues ride +5-7 dB; target ~-20)
  kit.drone(shotT('s2a'), shotT('s2b') - 0.05, [45, 52], 0.04, 320) // lecture-hall room hum
  sigh(EV_S2.sleepWave.f, 0.9, { g: 0.055 }) // synchronized droop wave
  sigh(EV_S2.sleepWave.f + 0.4, 0.7, { g: 0.042, f0: 494, f1: 370 })
  kit.blip(EV_S2.swooner.f, 1319, 0.05, 0.1, 'sine') // the swooner sits up
  const C3 = DRAWN.find((d) => d.id === 'C3')
  chalk(C3.f0, 0.55, { g: 0.06 }) // squeak-synced to the drawn chalk line (C3 f0 = EV_S2.chalkSqueak)
  chalk(EV_S2.chalkCircle.f, 0.32, { f: 2150, g: 0.055 }) // the circle
  block(C3.f0 - 0.5, { g: 0.05, f: 900, pan: -0.3 }) // lectern tap
  // the legend: three choir-whisper panels (ARK motif, WAX, hushed)
  kit.drone(EV_S2.panels[0].f - 0.2, EV_S2.lidThud.f + 0.6, [45, 52], 0.035, 300)
  for (const p of EV_S2.panels) kit.choir(p.f, [45, 48, 52, 55], 1.0, 0.028, 'u')
  ;[44, 45, 46].forEach((m) => kit.piano(EV_S2.lidThud.f, m, 0.12, 1.6)) // P3: the lid slams
  kit.clunk(EV_S2.lidThud.f, 0.4)
  kit.sub(EV_S2.lidThud.f, 0.3, 70, 30, 1.2)
  // map travel trot (ADVENTURE contour in the pluck line) + tick per stop + plane blat
  const MAP0 = shotT('s2c')
  const TROT = [50, 54, 57, 50] // spells the rip
  for (let k = 0; MAP0 + k * BEAT < shotT('s3a') - 0.1; k++) {
    const t = MAP0 + k * BEAT
    kit.pluck(t, TROT[k % 4], 0.055, 1500, 0.2) // trot bass
    kit.tick(t + BEAT / 2, 0.03, 3000) // off-beat tick
    if (k % 4 === 0) kit.bass(t, 38, 0.4, 0.14, 'triangle', 380)
  }
  motor(EV_S2.planeIn.f, shotT('s3a') - 0.3, { g: 0.04, f: 88, buzz: 31 }) // the contrail IS the line
  EV_S2.stopTicks.forEach((e, i) => {
    kit.tick(e.f, 0.06, 2600)
    kit.blip(e.f + 0.03, 1200 + i * 180, 0.04, 0.1, 'square') // head marker pops
  })
  zip(EV_S2.dandruffSea.f, 900, 300, 0.35, 0.04) // detour around THE DANDRUFF SEA
  kit.swell(EV_S2.dandruffSea.f, EV_S2.dandruffSea.f + 0.5, 0.05)
  brassNote(CAPS.find((c) => c.id === 'C5').t0, 45, 0.5, { g: 0.075 }) // chapter plate
  kit.riser(shotT('s3a') - 0.5, shotT('s3a'), 0.08)

  // ============================ D. S3 — THE DIG + THE TRUCK CHASE (f 35-56) ============================
  // 3A photo-bomb theft
  for (const dt of [0, 0.28])
    kit.wind(EV_S3.brushing.f + dt, EV_S3.brushing.f + dt + 0.22, 0.035, 900, 1800) // toothbrushes
  for (const dt of [0, 0.3, 0.6]) block(EV_S3.lineup.f + dt, { g: 0.035, f: 1300 }) // assemble
  kit.crash(EV_S3.flash.f, 0.1) // FLASH pop
  kit.tick(EV_S3.flash.f + 0.01, 0.08, 5200)
  kit.clunk(EV_S3.heaveDone.f, 0.3) // heaved onto the flatbed
  blat(EV_S3.heaveDone.f, 43, 0.18, { g: 0.07 })
  kit.pluck(EV_S3.mustacheTip.f, 62, 0.07, 2400) // mustache tip
  // 3B convoy + gallop — the groove is generated in WORLD g and mapped through filmT
  motor(EV_S3.convoyOut.f, REL2, { g: 0.035, f: 62, buzz: 23 }) // convoy idle through the chase
  zip(EV_S3.whistle.f, 620, 1500, 0.3, 0.05) // hero whistles
  kit.clunk(EV_S3.vault.f, 0.2)
  kit.taiko(EV_S3.vault.f, 0.35, 58)
  const gallopBeat = (gBeat, accent) => {
    const t = filmT(gBeat)
    snare(t, accent ? { g: 0.13, tune: 200, send: 0.1 } : { g: 0.09, tune: 190, send: 0.08 })
    hoof(filmT(gBeat + 0.1875), { g: 0.07 })
    hoof(filmT(gBeat + 0.375), { g: 0.06 })
  }
  for (let g = EV_S3.gallop.g; g < STOP1_G - 0.05; g += BEAT)
    gallopBeat(g, (g - EV_S3.gallop.g) % 1 < 0.01) // ride INTO the freeze
  triStrings(filmT(42.0), 57, { g: 0.05 })
  triStrings(filmT(44.0), 59, { g: 0.055 })
  kit.whoosh(EV_S3.leap.f, 0.4, 0.16, 400, 2600) // horse -> hood
  kit.taiko(EV_S3.leap.f, 0.4, 60)
  kit.clunk(EV_S3.goonOnHood.f, 0.25)
  block(EV_S3.goonOnHood.f + 0.05, { g: 0.05, f: 2400 }) // wrench clang
  kit.whoosh(EV_S3.wrenchMiss.f, 0.2, 0.12, 800, 3400) // wrench misses...
  // HIT-STOP 1 — the windscreen bursts: glass + cymbal CHOKE cut at the release
  kit.glass(PIN1, 0.3, 1.6)
  cymbalChoke(PIN1, REL1, { g: 0.16 })
  brassStab(PIN1, [50, 62], 0.4, { g: 0.14, send: 0.15 })
  kit.impact(PIN1, 0.42, 55)
  // ...and the score RESUMES EXACTLY at the freeze release (filmT(STOP1_G) + STOPS[0].d)
  kit.kick(REL1, 0.36)
  horn(REL1, 60, 0.35, { g: 0.07, vib: false, atk: 0.02 })
  for (
    let g = EV_S3.gallop.g + Math.ceil((STOP1_G - EV_S3.gallop.g) / BEAT) * BEAT;
    g < EV_S3.dragUnder.g - 0.1;
    g += BEAT
  )
    gallopBeat(g, (g - EV_S3.gallop.g) % 1 < 0.01) // groove rides the clock across the freeze
  kit.clunk(EV_S3.dropToRoad.f, 0.28) // hero drops to the road
  kit.wind(EV_S3.dropToRoad.f, EV_S3.dropToRoad.f + 0.35, 0.05, 400, 1200) // skid
  // 3D under-truck: suspension roar + scrapes, gated around the pin
  motor(filmT(EV_S3.dragUnder.g), REL2, { g: 0.05, f: 55, buzz: 19 })
  for (const g of [EV_S3.dragUnder.g + 0.3, EV_S3.dragUnder.g + 0.7])
    block(filmT(g), { g: 0.05, f: 2100, pan: g > EV_S3.dragUnder.g + 0.5 ? 0.3 : -0.3 }) // chassis scrapes
  // HIT-STOP 2 — the axle grab: modest deadpan pin (grid already gated by the gallop bounds)
  brassStab(PIN2, [45, 52], 0.35, { g: 0.12, send: 0.15 })
  kit.impact(PIN2, 0.32, 50)
  kit.kick(REL2, 0.28) // release
  hm(EV_S3.nodPass.f, { g: 0.045, pan: -0.3 }) // the polite nod, mirrored:
  hm(EV_S3.nodPass.f + 0.22, { g: 0.045, f: 250, pan: 0.3 })
  kit.whoosh(EV_S3.yankUp.f, 0.35, 0.14, 300, 2200) // yank up through the slats
  kit.clunk(EV_S3.flatbedLand.f, 0.24) // lands on the flatbed
  // 3E tailgate: rise, three-move fisticuff, heave
  kit.pluck(filmT(EV_S3.riseBehind.g + 0.4), 57, 0.05, 1800)
  kit.pluck(filmT(EV_S3.riseBehind.g + 0.8), 62, 0.05, 1800) // hero rises behind the goon
  for (let i = 0; i < 3; i++) {
    const t = filmT(EV_S3.riseBehind.g + 1.0 + i * BEAT) // three punches, on the beat
    kit.kick(t, 0.3 + i * 0.04)
    block(t, { g: 0.05, f: 1600 })
    if (i === 2) snare(t, { g: 0.12, tune: 210, send: 0.1 }) // the big one
  }
  kit.whoosh(EV_S3.heave.f, 0.5, 0.18, 300, 2000) // heaved off the back
  blat(EV_S3.heave.f, 40, 0.2, { g: 0.08 })
  for (let i = 0; i < 3; i++) hoof(EV_S3.horseLand.f + i * 0.09, { g: 0.08 - i * 0.015, pan: 0.25 }) // lands on a horse
  blat(EV_S3.horseLand.f + 0.28, 64, 0.2, { g: 0.06, pan: 0.3 }) // both bewildered
  for (let i = 0; i < 6; i++)
    hoof(EV_S3.veerOff.f + i * (0.14 + i * 0.05), { g: 0.08 * (1 - i * 0.13), pan: -0.5 }) // hoof-beats away
  // 3F the cab
  block(EV_S3.cabDrop.f, { g: 0.05, f: 700, pan: 0.1 }) // drops into the seat
  kit.tick(EV_S3.wheelTake.f, 0.04, 2000)
  kit.wind(EV_S3.wheelTake.f, EV_S3.wheelTake.f + 0.4, 0.03, 1500, 2600) // page turn
  kit.kick(EV_S3.driverExit.f, 0.5) // DOOR SLAM in tempo (just before beat 55.5)
  snare(EV_S3.driverExit.f, { g: 0.2, tune: 200, send: 0.12 })
  kit.clunk(EV_S3.driverExit.f, 0.3)
  kit.wind(EV_S3.driverExit.f + 0.05, EV_S3.driverExit.f + 0.4, 0.045, 300, 900) // dust puff
  // horn toot on the ark pulse
  horn(EV_S3.arkPulse.f, 50, 0.18, { g: 0.085, atk: 0.02, vib: false })
  horn(EV_S3.arkPulse.f + 0.2, 57, 0.3, { g: 0.085, atk: 0.02, vib: false })
  glint(EV_S3.arkPulse.f + 0.05, 69, 0.045, 0.8) // golden pulse — FLOW peeks

  // ============================ E. S4 — THE PIT (f 56-66) ============================
  block(EV_S4.walkIn.f, { g: 0.035, f: 950, pan: -0.3 }) // steps with the Ark
  block(EV_S4.walkIn.f + 0.3, { g: 0.03, f: 880, pan: -0.2 })
  rattle(EV_S4.baskets.f, 0.28) // baskets rattle
  rattle(EV_S4.baskets.f + 0.18, 0.2, { g: 0.045 })
  zip(EV_S4.spring.f, 200, 900, 0.18, 0.05) // goons SPRING out (not snakes)
  kit.taiko(EV_S4.pileOn.f, 0.5, 85) // cartoon cloud-thud
  kit.wind(EV_S4.pileOn.f, EV_S4.pileOn.f + 0.5, 0.05, 200, 700)
  for (const dt of [0.1, 0.24, 0.38]) kit.tick(EV_S4.pileOn.f + dt, 0.04, 1600) // scuffle
  for (const [i, m] of [57, 62, 66].entries())
    kit.pluck(EV_S4.arkRise.f + i * 0.1, m, 0.055, 2000) // the Ark rises
  kit.tick(EV_S4.trussed.f, 0.06, 1800) // rope
  kit.clunk(EV_S4.trussed.f + 0.04, 0.18)
  kit.clunk(EV_S4.hatchDrop.f, 0.3) // the hatch opens
  kit.sweepDown(EV_S4.hatchDrop.f + 0.05, 0.42, 900, 110, 0.13) // falling
  // scissors rain — one metallic tick PER BLADE, each mapped filmT(SCISSORS[i].tLand)
  for (const s of SCISSORS) {
    const t = filmT(s.tLand)
    const pan = clamp((s.x - 960) / 960, -0.7, 0.7)
    kit.tick(t, 0.05 + 0.02 * ((s.seed % 3) / 2), 3400 + 900 * ((s.seed % 5) / 4))
    kit.blip(t + 0.015, 3800 + 700 * ((s.seed % 4) / 3), 0.028, 0.05, 'sine')
    if (s.seed % 4 === 0) block(t + 0.02, { g: 0.035, f: 2600, pan })
  }
  kit.clunk(EV_S4.clatterHalo.f, 0.22) // the halo settles
  chrome(EV_S4.clatterHalo.f + 0.05, 81, 1.2, { g: 0.022 }) // steel ring
  snip(EV_S4.hemSnip.f, { g: 0.1, wet: true }) // ONE wet snip — the cape hem
  // the pit exit (audio-QA P1: was the quietest scene, -25.5 LUFS with -50/-68 dB RMS
  // holes — the drone now sustains through the WHOLE shot and the tidy-march foley rides
  // +4-6 dB; target scene ~-20 LUFS, restraint that reads as scored, not missing)
  kit.drone(EV_S4.hemSnip.f, shotT('s5a'), [38, 45], 0.035, 300)
  kit.tick(EV_S4.deadpan.f, 0.04, 2200)
  hm(EV_S4.deadpan.f + 0.08, { g: 0.03, f: 210 }) // ...up at the hatch
  kit.whoosh(EV_S4.torch.f, 0.3, 0.13, 400, 1800) // torch drops
  kit.tick(EV_S4.torch.f + 0.1, 0.055, 1500)
  kit.tick(EV_S4.torch.f + 0.22, 0.05, 1300)
  for (let i = 0; i < 6; i++)
    kit.tick(EV_S4.parting.f + i * 0.05, 0.085 - i * 0.008, 4200 - i * 350) // scissors part from the light
  snip(EV_S4.scissorsFree.f, { g: 0.09, hi: true }) // the pink safety scissors: snip-snip
  snip(EV_S4.scissorsFree.f + 0.14, { g: 0.075, hi: true })
  kit.pluck(EV_S4.pocket.f, 66, 0.07, 2400) // pocketed, respectfully
  glint(EV_S4.pocket.f + 0.05, 88, 0.045, 0.5)
  for (const dt of [0, 0.12, 0.26]) kit.tick(EV_S4.rubbleWall.f + dt, 0.085, 1100 + dt * 2000) // rubble
  kit.tick(EV_S4.ropeHandover.f, 0.085, 1900) // hero hands over his own rope
  kit.tick(EV_S4.ropeHandover.f + 0.1, 0.085, 1900)
  hm(EV_S4.ropeHandover.f + 0.16, { g: 0.055, f: 225 }) // the goons nod
  snare(EV_S4.marchOff.f, { g: 0.14, tune: 210, send: 0.1 }) // tidy march toward the ceremony
  block(EV_S4.marchOff.f, { g: 0.075, f: 1700 })
  block(EV_S4.marchOff.f + 0.15, { g: 0.065, f: 1700 })

  // ============================ F. S5 — THE OPENING (f 66-87) ============================
  insects(EV_S5.tableau.f + 0.2, EV_S5.lidOff.f + 0.3, { dieAt: 0.62 }) // night dies under the hum
  kit.drone(EV_S5.tableau.f, EV_S5.modeFlip.f, [38, 45], 0.03, 280)
  kit.wind(EV_S5.tableau.f + 0.3, EV_S5.tableau.f + 3.5, 0.028, 250, 600) // torches
  kit.choir(EV_S5.tableau.f + 1.0, [45, 48, 52, 55], 3.4, 0.03, 'u') // choir hum — ARK, WAX state
  kit.choir(EV_S5.tableau.f + 3.6, [45, 48, 52, 55], 2.4, 0.03, 'u') // (overlapped for continuity)
  // the lid
  blat(EV_S5.lidOff.f, 36, 0.3, { g: 0.075 }) // the heave
  kit.clunk(EV_S5.lidOff.f + 0.1, 0.45) // lid off
  ;[44, 45].forEach((m) => kit.piano(EV_S5.lidOff.f + 0.1, m, 0.1, 1.4))
  kit.riser(EV_S5.flowColumn.f, EV_S5.modeFlip.f + 0.4, 0.1) // flow column riser
  kit.wind(EV_S5.flowColumn.f, EV_S5.seams.f - 0.2, 0.05, 500, 1600) // robes whip
  // WAX -> FLOW mode-flip. NOTE (audio-QA P2 audit): EV_S5.modeFlip.f = filmT(71.0) =
  // 71.4 FILM — the picture flip is drawn from the same warp clock (film.js s5b:
  // `flip = g >= EV_S5.modeFlip.g` with g = warp(t).g), so this lift lands exactly ON
  // the rendered flip frame. The 70.90 transient in the draft is the lid-off clunk at
  // EV_S5.lidOff.f + 0.1 (heave 70.8 -> lid hits ground 70.9), not an early braam:
  // deliberately NOT nudged — moving it would desync lift and picture.
  kit.choir(EV_S5.modeFlip.f, [45, 49, 52, 56], 3.6, 0.036, 'a') // the lift: m7 -> maj7
  kit.braam(EV_S5.modeFlip.f, [45], 1.6, 0.1, 0.7)
  // the hum flips major MID-NOTE at f 71.6: the third bends C -> C#
  at(EV_S5.humMajor.f - 0.4, () => {
    const o = osc('sine', hz(51), EV_S5.humMajor.f - 0.4, 0.85)
    const o2 = osc('triangle', hz(51), EV_S5.humMajor.f - 0.4, 0.85)
    const g2 = ac.createGain()
    g2.gain.value = 0.4
    o.frequency.exponentialRampToValueAtTime(hz(52), EV_S5.humMajor.f) // flips AT 71.6
    o2.frequency.exponentialRampToValueAtTime(hz(52), EV_S5.humMajor.f)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, EV_S5.humMajor.f - 0.4)
    a.gain.linearRampToValueAtTime(0.035, EV_S5.humMajor.f - 0.28)
    a.gain.setValueAtTime(0.035, EV_S5.humMajor.f + 0.25)
    a.gain.linearRampToValueAtTime(0, EV_S5.humMajor.f + 0.45)
    o.connect(a)
    o2.connect(g2).connect(a)
    out(a, 1, 0.5)
  })
  for (const [i, m] of [69, 73, 76, 81, 85].entries())
    glint(EV_S5.humMajor.f + 0.3 + i * 0.5, m, 0.032 - i * 0.003, 1.0) // streamer glints
  // the melt
  kit.tick(EV_S5.seams.f, 0.09, 5200) // scalp seams crack
  kit.tick(EV_S5.seams.f + 0.05, 0.07, 4800)
  slump(EV_S5.waxDrips.f, EV_S5.chrome.f + 0.8, 33, 26, { g: 0.045 }) // slow brass slump
  ;[0, 0.35, 0.65, 0.9].forEach((d, i) =>
    drip(EV_S5.waxDrips.f + d, { g: 0.06 - i * 0.008, f: 950 - i * 90 }),
  ) // wax-drip ticks, one per seam event
  kit.swell(EV_S5.chrome.f - 0.5, EV_S5.chrome.f, 0.06) // the gleam arrives
  chrome(EV_S5.chrome.f, 84, 2.2, { g: 0.034 }) // chrome skull catches the moon
  glint(EV_S5.chrome.f + 0.05, 93, 0.04, 1.2)
  kit.kick(EV_S5.panamaLand.f, 0.22) // the Panama lands upright
  thudDry(EV_S5.panamaLand.f, 0.1)
  glint(EV_S5.panamaLand.f + 0.06, 88, 0.03, 0.6)
  // wisp domino — one soft pfft per goon, panned along WISP_X (right -> left)
  EV_S5.wispDomino.forEach((e, i) => wisp(e.f, clamp((WISP_X[i] - 960) / 960, -0.7, 0.7)))
  slump(EV_S5.taffyComb.f, EV_S5.taffyComb.f + 1.4, 45, 38, { g: 0.04 }) // pocket comb like taffy
  // the combing — 7 rising ADVENTURE fragments, one per strand align (STRAND_F)
  // (audio-QA P3: the 150 ms -45 dB vacuum at ~79.9 read as a dropout inside the loudest
  // scene — the swell now starts earlier and the hero's bracing heartbeat fills the breath)
  kit.riser(EV_S5.combDescend.f - 0.9, EV_S5.combDescend.f + 0.3, 0.1)
  kit.heartbeat(EV_S5.combDescend.f - 0.5, 0.35)
  kit.heartbeat(EV_S5.combDescend.f - 0.12, 0.3)
  kit.braam(EV_S5.combDescend.f + 0.1, [38], 1.2, 0.09, 0.6)
  const FRAG_ROOTS = [50, 54, 57, 59, 61, 62, 64] // the ladder rises strand by strand
  for (let k = 0; k < STRANDS; k++) {
    const t = STRAND_F[k]
    // audio-QA P2: middle entries sat ~6 dB under the theme bed — glints/plucks now at
    // the front so the ladder reads as seven risers, not one wall with ends
    for (const [i, iv] of [0, 4, 7].entries()) glint(t + i * 0.09, FRAG_ROOTS[k] + iv, 0.095, 0.7) // rip
    kit.pluck(t + 0.28, FRAG_ROOTS[k] + 12, 0.07, 2600) // the strand settles
  }
  // a knot pops with a confetti tick
  for (const dt of [0, 0.05, 0.11, 0.16, 0.22]) kit.tick(EV_S5.knotPop.f + dt, 0.045, 5000 + dt * 4000)
  ;[81, 84, 88].forEach((m, i) => kit.blip(EV_S5.knotPop.f + 0.1 + i * 0.05, hz(m), 0.03, 0.07, 'sine'))
  zip(EV_S5.ropesGroomed.f, 700, 260, 0.3, 0.04) // the ropes slip loose
  // full theme + choir under C9, resolving as the last strand lands
  const C9 = CAPS.find((c) => c.id === 'C9')
  for (let i = 0; i < 4; i++) snare(C9.t0 - 0.4 + i * 0.1, { g: 0.05 + i * 0.018, tune: 210 })
  brassStab(C9.t0, [50, 54, 57, 62], 0.9, { g: 0.13 }) // the rip, FULL, under the caption
  // BED BUS (audio-QA re-verify): the SUSTAINED theme layers ride one gain node so each
  // STRAND_F entry ducks the bed ~3.5 dB (x0.67) — 0.1 s attack, 0.25 s dip centered on
  // the entry, 0.2 s release, back to unity: the ladder reads as seven risers and the
  // scene's net level is unchanged. Duck times computed from timeline STRAND_F only.
  // NOT on the bus: the stab + rolls above, every ladder glint/pluck, and the whole
  // arrival block below (crash/stabs/choir accent/kick/sub/wind).
  at(C9.t0, () => {
    const bus = ac.createGain()
    bus.gain.setValueAtTime(1, C9.t0 - 0.5) // unity before the first duck anchor
    for (const t of STRAND_F) {
      bus.gain.setValueAtTime(1, t - 0.225) // anchor at unity
      bus.gain.linearRampToValueAtTime(0.67, t - 0.125) // 0.1 s attack
      bus.gain.setValueAtTime(0.67, t + 0.125) // 0.25 s dip centered on the entry
      bus.gain.linearRampToValueAtTime(1, t + 0.325) // 0.2 s release
    }
    // strings pad (kit.strings tone): detuned saw pair per note, slow bow
    const bedPad = (notes, g, cut, atk) => {
      for (const m of notes) {
        const lp = ac.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = cut
        const a = ac.createGain()
        a.gain.setValueAtTime(0, C9.t0)
        a.gain.linearRampToValueAtTime(g, C9.t0 + atk)
        a.gain.setValueAtTime(g, C9.t0 + 2.4)
        a.gain.linearRampToValueAtTime(0, C9.t0 + 3.2)
        for (const det of [-7, 6]) {
          const o = osc('sawtooth', hz(m), C9.t0, 3.25)
          o.detune.value = det
          o.connect(lp)
        }
        lp.connect(a).connect(bus)
      }
    }
    bedPad([50, 57, 62, 66], 0.008, 2200, 0.8) // = the old strings g 0.032 over four notes
    // choir bed (kit.choir 'a' tone): sine + triangle per note through a vowel bandpass
    for (const m of [50, 57, 62, 66]) {
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = Math.min(1400, hz(m) * 2.5)
      bp.Q.value = 0.7
      const a = ac.createGain()
      a.gain.setValueAtTime(0, C9.t0 + 0.2)
      a.gain.linearRampToValueAtTime(0.013, C9.t0 + 1.6)
      a.gain.setValueAtTime(0.013, C9.t0 + 2.0)
      a.gain.linearRampToValueAtTime(0, C9.t0 + 3.0)
      for (const [type, kg] of [['sine', 1], ['triangle', 0.45]]) {
        const o = osc(type, hz(m), C9.t0 + 0.2, 2.8)
        const og = ac.createGain()
        og.gain.value = kg
        o.connect(og).connect(bp)
      }
      bp.connect(a).connect(bus)
    }
    // bass pedal (kit.bass tone)
    {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 440
      const a = ac.createGain()
      a.gain.setValueAtTime(0, C9.t0)
      a.gain.linearRampToValueAtTime(0.16, C9.t0 + 0.03)
      a.gain.setValueAtTime(0.16, C9.t0 + 2.7)
      a.gain.linearRampToValueAtTime(0, C9.t0 + 2.8)
      for (const det of [0, 6]) {
        const o = osc('sawtooth', hz(38), C9.t0, 2.8)
        o.detune.value = det
        o.connect(lp)
      }
      lp.connect(a).connect(bus)
    }
    // the held +16 (the horn's long note), straight into the bus
    {
      const f = hz(66)
      const h0 = C9.t0 + 0.5
      const hd = 2.6
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = Math.min(2400, f * 6)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, h0)
      a.gain.linearRampToValueAtTime(0.095, h0 + 0.09)
      a.gain.setValueAtTime(0.095, h0 + hd - 0.35)
      a.gain.linearRampToValueAtTime(0, h0 + hd)
      const o1 = osc('sawtooth', f, h0, hd + 0.05)
      const o2 = osc('sine', f * 0.5, h0, hd + 0.05)
      const g2 = ac.createGain()
      g2.gain.value = 0.5
      o1.connect(lp)
      o2.connect(g2).connect(lp)
      lp.connect(a).connect(bus)
      const l = osc('sine', 5.2, h0, hd + 0.05)
      const lg = ac.createGain()
      lg.gain.value = 4
      l.connect(lg)
      lg.connect(o1.detune)
      lg.connect(o2.detune)
    }
    out(bus, 1, 0.55, 0) // one shared room send for the whole bed
  })
  // THE ARRIVAL — last strand + wind gust: full ensemble
  kit.crash(EV_S5.windGust.f, 0.15)
  brassStab(EV_S5.windGust.f, [50, 57, 62, 66], 2.0, { g: 0.14 })
  kit.choir(EV_S5.windGust.f, [50, 57, 62, 66], 2.4, 0.04, 'a')
  kit.kick(EV_S5.windGust.f, 0.4)
  kit.sub(EV_S5.windGust.f, 0.32, 74, 34, 1.6)
  kit.wind(EV_S5.windGust.f, EV_S5.salute.f - 0.1, 0.055, 400, 1800) // the mane streams
  kit.flutter(EV_S5.windGust.f, EV_S5.windGust.f + 1.6, 0.032)
  // aftermath: the held chord resolves
  kit.strings(shotT('s5e'), [50, 57, 62, 66], 2.0, 0.03, 1.0)
  kit.pluck(EV_S5.salute.f, 62, 0.06, 2200) // lifts the Panama...
  kit.pluck(EV_S5.salute.f + 0.13, 57, 0.055, 2200) // ...salutes... replaces it
  snare(EV_S5.salute.f + 0.02, { g: 0.05, tune: 240, send: 0.08 })
  block(EV_S5.exitStart.f + 0.05, { g: 0.03, f: 950, pan: -0.3 }) // exits with the Ark

  // ============================ G. S6 — TOP HAIR (f 87-101) ============================
  const E1 = CAPS.find((c) => c.id === 'E1')
  kit.wind(EV_S6.suitsIn.f, EV_S6.suitsIn.f + 0.45, 0.04, 700, 2000) // suit rustle
  kit.drone(EV_S6.suitsIn.f, E1.t0 - 0.3, [38, 45], 0.03, 260) // infinite crate sea
  for (const e of EV_S6.nodWall) whum(e.f) // the wall of suits nods
  kit.crowd(EV_S6.nodWall[0].f - 0.1, EV_S6.nodWall[1].f + 0.4, 0.04)
  boing(EV_S6.filamentPluck.f, { g: 0.075 }) // the boulder filament, plucked at last
  kit.wind(EV_S6.crateLower.f, EV_S6.crateLower.f + 0.3, 0.035, 500, 1400) // lowered in
  kit.clunk(EV_S6.crateLower.f + 0.28, 0.3) // set down
  // nail guns IN TEMPO (8ths off the lid-nail beat; the stamp lands in the gap)
  for (const d of [0.1, 0.35, 0.85, 1.1, 1.35]) nailGun(EV_S6.lidNail.f + d, { g: 0.075 })
  kit.kick(EV_S6.stamp.f, 0.5) // stamp SLAMS (D1 drawn f0 = 91.0 = the stencil)
  kit.clunk(EV_S6.stamp.f, 0.45)
  kit.sub(EV_S6.stamp.f, 0.3, 68, 30, 1.0)
  kit.tick(EV_S6.stamp.f + 0.06, 0.05, 2400)
  kit.tick(EV_S6.stamp.f + 0.12, 0.04, 2600)
  glint(EV_S6.glow.f, 76, 0.045, 1.2) // golden glow through the slats
  chrome(EV_S6.glow.f, 81, 1.2, { g: 0.02, send: 0.3 })
  block(EV_S6.tap.f, { g: 0.05, f: 1300 }) // worker taps the glow
  blat(EV_S6.tap.f + 0.15, 62, 0.2, { g: 0.06 }) // ...shrugs
  kit.wind(EV_S6.forkliftLift.f, EV_S6.forkliftLift.f + 0.35, 0.045, 300, 1400) // hydraulics
  kit.clunk(EV_S6.forkliftLift.f + 0.32, 0.2)
  // forklift recede: quiet trot reprise + backup beeper QUANTIZED to it
  const TROT2 = [50, 52, 54, 57]
  for (let k = 0; shotT('s6c') + k * BEAT < EV_S6.card.f - 1.0; k++) {
    const t = shotT('s6c') + k * BEAT
    kit.pluck(t, TROT2[k % 4], 0.04, 1400, 0.18)
    kit.tick(t + BEAT / 2, 0.025, 3000)
  }
  for (let i = 0; i < 6; i++) beeper(shotT('s6c') + 0.5 + i * BEAT, { g: 0.055 * (1 - i * 0.14) })
  EV_S6.winks.forEach((e, i) => {
    glint(e.f, i % 2 ? 84 : 81, 0.045, 1.0) // slat-glow winks like a lighthouse
    if (i === 0) chrome(e.f, 88, 1.0, { g: 0.018, send: 0.3 })
  })
  // stinger: ONE golden hair
  glint(EV_S6.leak.f, 93, 0.04, 1.4) // the leak
  kit.flutter(EV_S6.leak.f, EV_S6.leak.f + 0.7, 0.025)
  kit.blip(EV_S6.qmark.f, 880, 0.04, 0.09, 'sine') // curls into a question mark:
  kit.blip(EV_S6.qmark.f + 0.12, 1046, 0.04, 0.12, 'sine') // ...a rising minor 3rd, "hm?"
  brassNote(EV_S6.compass.f, 62, 0.16, { g: 0.07, atk: 0.015, send: 0.12 }) // points like a compass
  kit.tick(EV_S6.compass.f + 0.02, 0.04, 3000)
  zip(EV_S6.zipBack.f, 1500, 380, 0.12, 0.04) // zips back inside
  boing(EV_S6.slatWink.f, { g: 0.06 }) // the slat winks once, cheeky
  // END CARD (E1): brass stab + snare button + final resolve — ALL DRY (send 0)
  brassStab(E1.t0, [50, 54, 57, 62], 0.55, { g: 0.15, send: 0 })
  snare(E1.t0, { g: 0.2, tune: 210, send: 0 })
  kit.kick(E1.t0, 0.45)
  thudDry(E1.t0, 0.18)
  subDry(E1.t0, 0.28, 62, 30, 0.9)
  horn(E1.t0 + 0.5, 50, 1.5, { g: 0.07, dry: true, send: 0 }) // "THE FLOW PROVIDES."
  horn(E1.t0 + 0.5, 57, 1.5, { g: 0.06, dry: true, pan: 0.06 }) // held tonic, ends ~99.6
  hm(E1.t0 + 0.62, { g: 0.028, f: 210 }) // ...you're welcome.
  void DURATION // the score spans exactly the timeline's film; asserted by the self-check
}
