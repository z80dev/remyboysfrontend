// HAIRAKIRI — Year of the Razor Decade. Original score + foley-in-score,
// jidaigeki idiom: hirajoshi/insen pentatonic family, koto / taiko (deep +
// rim) / biwa plectrum / breathy shakuhachi / low strings / rain-as-character.
// Everything is scheduled through films/hairakiri/timeline.js exports —
// CUES / MASTER (clock-derived absolutes) / MA / EYEBROW / TITLE_UNDERLINE /
// b() section grids — nothing here hand-adds a clock delay; onsets come from
// the timeline, durations/spans are musical content. The ONE hit-stop (S6
// g8.6 +0.35) is already baked into MASTER.* by DUEL.abs, so the ma pluck
// lands at film 72.60 and the landing at 72.95 with zero local arithmetic.
//
// VOICES (all built from kit primitives inside ONE at() each — no kit
// instrument is ever called inside an at(); kit.events is sorted once after
// score() returns):
//   kotoN     plucked long string: triangle body + 2.004x/3.02x partials,
//             lowpass 4200->720 sweep, 2 ms attack, exp decay to 0.001
//   biwaN     sharp dry plectrum: saw pair through bandpass 1500->430 +
//             highpassed click, ALL-DRY (the ma pluck carries alone)
//   shakuN    shakuhachi: sine sliding in from 0.94f (portamento) + bandpassed
//             breath noise, slow 4.6 Hz vibrato ramping in; shriek mode for S5
//   dreadN    low strings: detuned saw pair, dark lowpass, slow swell
//   rainBed   rain foley: lowpassed body + highpassed hiss through ONE
//             automated bed gain (duck at MA.mixOut, crossfaded beds so the
//             rain NEVER stops through the ma window; killed at sunBreak)
//   rimN / cutTaiN / tickN / patN / chewN / plinkN / whipN / lidN / whooshN /
//   strumN / shimmerN / stillN / razorN / bellDryN — percussion, ticks and
//   color; every one gain-shaped with explicit 0-start envelopes, exponential
//   targets always >= 0.001
//
// FLOW MOTIF (brief-binding, original): FLOW [0,+7,+8,+12] from FLOW_ROOT 57,
// rhythm FLOW_RHYTHM_BEATS [3,3,1,6] long-long-short-held, scaled per
// statement: S3 koto solo at MASTER.stands (u = half a 76 beat), re-orchestrated
// per recruit (giant deep taiko / twin koto tremolo / veteran low biwa / comic
// with ONE note late), rhythm-only comb taps in S4, WITHHELD in S5, quiet
// minor-tinged under the bow (root 45), triumphant full ensemble at 83.0, held
// tonic from CUES.flowHold to just before the last frame.
//
// LOUDNESS (engine peak-normalises to -1 dBFS then two-pass -14 LUFS / -1 dBTP;
// our job is internal balance so loudnorm never pumps): beds 0.026-0.075,
// ostinati/plucks/ticks 0.03-0.066, leads 0.045-0.09, pins/stabs 0.1-0.16,
// impacts <= 0.45. motion-QA P1-4 fix: the eyebrow-ritual plucks + polite
// thunders sit AT pin level (0.12/0.15) and the rain bed ducks to 0.4 across
// EYEBROW passes so the ritual reads (it was inaudible at 0.05/0.07 under the
// full bed). motion-QA P2-4 fix: the ending breath is a two-syllable pair
// (g 0.05/0.055) that breathes against the silence and decays before 95.9.
// Everything from endCard (93.3) on is near-dry so the shared
// IR never re-excites under the ensō and the film ends on an intentional decay
// that completes before 95.9.
//
// DRY-RUN LEDGER: every sound event self-reports into SCOREBOOK (t, kind,
// pitched, attack/sustain/release, peak gain) — one ledger entry per kit event,
// verified 1:1 against kit.events by output/hairakiri/notes/score-dryrun.mjs,
// which asserts 32/32 cue coverage (+-0.05 s), the ma-window purity (only the
// rain bed between MA.rainOnly and the biwa at CUES.pluck), the rain stop at
// MASTER.sunBreak, envelope sanity, the full decay before 95.9 and [0, 96)
// bounds.
import {
  CUES,
  EYEBROW,
  FLOW,
  FLOW_RHYTHM_BEATS,
  FLOW_ROOT,
  MA,
  MASTER,
  TITLE_UNDERLINE,
  b,
  beatSec,
} from './timeline.js'

export const SCOREBOOK = []

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit
  SCOREBOOK.length = 0

  // ---------- schedule ledger ----------
  // reg(): composite voices (one at() = one cue). Wrapper helpers for kit
  // instruments push the same ledger shape and call the (deferred) kit
  // instrument directly at score time — exactly one kit event each.
  const reg = (t, kind, pitched, a, d, r, g) => SCOREBOOK.push({ t, kind, pitched, a, d, r, g })
  const cue = (t, kind, pitched, a, d, r, g, fn) => {
    reg(t, kind, pitched, a, d, r, g)
    at(t, fn)
  }

  // ---------- raw node builders (call ONLY inside at() or at score time via
  // their cue wrappers; NEVER a kit instrument inside an at()) ----------
  // KOTO — plucked long string, bright harpinos
  const kotoN = (m, t, d, g, pan = 0, send = 0.2, dead = false) => {
    const f = hz(m)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(dead ? 2400 : 4200, t)
    lp.frequency.exponentialRampToValueAtTime(dead ? 480 : 720, t + d)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.002)
    a.gain.exponentialRampToValueAtTime(0.001, t + d)
    for (const [mul, kg] of dead ? [[1, 1], [2.004, 0.22]] : [[1, 1], [2.004, 0.32], [3.02, 0.12]]) {
      const o = osc('triangle', f * mul, t, d + 0.03)
      const og = ac.createGain()
      og.gain.value = kg
      o.connect(og).connect(lp)
    }
    lp.connect(a)
    out(a, 1, dead ? 0.04 : send, pan)
  }
  // BIWA — sharp dry plectrum strike (THE ma pluck is one of these)
  const biwaN = (m, t, g = 0.11, d = 0.32) => {
    const f = hz(m)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(1500, t)
    bp.frequency.exponentialRampToValueAtTime(430, t + d)
    bp.Q.value = 1.5
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.001)
    a.gain.exponentialRampToValueAtTime(0.001, t + d)
    a.gain.linearRampToValueAtTime(0, t + d + 0.03)
    for (const k of [1, 1.006]) {
      const o = osc('sawtooth', f * k, t, d + 0.08)
      o.connect(bp)
    }
    bp.connect(a)
    out(a, 1, 0, 0.08)
    const n = noise(t, 0.02)
    const hp = ac.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 2600
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0, t)
    ng.gain.linearRampToValueAtTime(g * 0.45, t + 0.001)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.02)
    n.connect(hp).connect(ng)
    out(ng, 1, 0, 0.08)
  }
  // SHAKUHACHI — breathy bamboo lead: sliding sine + breath noise + slow vibrato
  const shakuN = (m, t, d, g, { atk = 0.12, rel = 0.4, shriek = false, send = 0.18, pan = 0 } = {}) => {
    const f = hz(m)
    const o = osc('sine', shriek ? f * 1.06 : f * 0.94, t, d + rel + 0.05)
    o.frequency.exponentialRampToValueAtTime(f, t + (shriek ? 0.05 : 0.28))
    const vib = osc('sine', shriek ? 7.3 : 4.6, t, d + rel + 0.05)
    const vg = ac.createGain()
    vg.gain.setValueAtTime(0, t)
    vg.gain.linearRampToValueAtTime(shriek ? f * 0.02 : f * 0.006, t + 0.8)
    vib.connect(vg).connect(o.frequency)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + atk)
    a.gain.setValueAtTime(g, t + d)
    a.gain.linearRampToValueAtTime(0, t + d + rel)
    o.connect(a)
    out(a, 1, send, pan)
    const n = noise(t, d + rel + 0.05)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = Math.min(3400, f * 2.4)
    bp.Q.value = 1.1
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0, t)
    ng.gain.linearRampToValueAtTime(g * (shriek ? 0.7 : 0.32), t + atk * 0.7)
    ng.gain.setValueAtTime(g * (shriek ? 0.7 : 0.32), t + d)
    ng.gain.linearRampToValueAtTime(0, t + d + rel)
    n.connect(bp).connect(ng)
    out(ng, 1, send, pan)
  }
  // DREAD — low string pad, detuned saw pair behind a dark lowpass
  const dreadSpans = (span) => [Math.min(1.2, span * 0.25), Math.min(0.8, span * 0.2)]
  const dreadN = (ms, t, span, g, cut = 320, send = 0.22) => {
    const [atk, rel] = dreadSpans(span)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = cut
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + atk)
    a.gain.setValueAtTime(g, t + span - rel)
    a.gain.linearRampToValueAtTime(0, t + span)
    for (const m of ms)
      for (const det of [-7, 6]) {
        const o = osc('sawtooth', hz(m), t, span + 0.02)
        o.detune.value = det
        o.connect(lp)
      }
    lp.connect(a)
    out(a, 1, send)
  }
  // RAIN — foley bed: lowpassed body + highpassed hiss under one automated
  // bed gain (env = [time, value] linear points, first point is silence)
  const rainBedN = (t0, t1, env) => {
    const bed = ac.createGain()
    bed.gain.setValueAtTime(0, t0)
    for (const [tt, v] of env) bed.gain.linearRampToValueAtTime(v, tt)
    for (const [type, f, kg, q] of [['lowpass', 1100, 1, 0.4], ['highpass', 3000, 0.42, 0.7]]) {
      const n = noise(t0, t1 - t0)
      const fl = ac.createBiquadFilter()
      fl.type = type
      fl.frequency.value = f
      fl.Q.value = q
      const lg = ac.createGain()
      lg.gain.value = kg
      n.connect(fl).connect(lg).connect(bed)
    }
    out(bed, 0.075, 0.12, 0, 0.8)
  }
  // TAIKO (deep, mix-out cut-off length) — pitch-dropped sine + skin noise
  const cutTaiN = (t, g = 0.2, f = 52) => {
    const o = osc('sine', f * 2.2, t, 0.32)
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.003)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.29)
    o.connect(a)
    out(a, 1, 0.1)
    const n = noise(t, 0.08)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 240
    bp.Q.value = 0.8
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0, t)
    ng.gain.linearRampToValueAtTime(g * 0.6, t + 0.002)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
    n.connect(bp).connect(ng)
    out(ng, 1, 0.12)
  }
  // RIM — dry taiko rim shot
  const rimN = (t, g = 0.05, pan = 0) => {
    const o = osc('sine', 1750, t, 0.06)
    o.frequency.exponentialRampToValueAtTime(1150, t + 0.02)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.001)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    o.connect(a)
    out(a, 1, 0.06, pan)
    const n = noise(t, 0.03)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 3600
    bp.Q.value = 1.4
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0, t)
    ng.gain.linearRampToValueAtTime(g * 0.6, t + 0.001)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
    n.connect(bp).connect(ng)
    out(ng, 1, 0.06, pan)
  }
  // TICK — tiny rice-grain / comb / seal tick (unpitched noise grain)
  const tickN = (t, g = 0.035, f = 4200, pan = 0) => {
    const n = noise(t, 0.03)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f
    bp.Q.value = 3
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.001)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.025)
    n.connect(bp).connect(a)
    out(a, 1, 0.04, pan)
  }
  // PAT — dry wooden pat / catch / bow tick
  const patN = (t, g = 0.035, pan = 0) => {
    const o = osc('sine', 940, t, 0.06)
    o.frequency.exponentialRampToValueAtTime(610, t + 0.025)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.001)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    o.connect(a)
    out(a, 1, 0.05, pan)
  }
  // CHEW — soft mochi squish
  const chewN = (t, g = 0.03) => {
    const n = noise(t, 0.06)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 520
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.012)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.055)
    n.connect(lp).connect(a)
    out(a, 1, 0.03)
    const o = osc('sine', 205, t, 0.05)
    o.frequency.exponentialRampToValueAtTime(150, t + 0.04)
    const og = ac.createGain()
    og.gain.setValueAtTime(0, t)
    og.gain.linearRampToValueAtTime(g * 0.5, t + 0.008)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.045)
    o.connect(og)
    out(og, 1, 0.02)
  }
  // PLINK — well drop
  const plinkN = (t, f, g = 0.04) => {
    const o = osc('sine', f, t, 0.16)
    o.frequency.exponentialRampToValueAtTime(f * 0.72, t + 0.12)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.003)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    o.connect(a)
    out(a, 1, 0.22, 0.15)
    const n = noise(t, 0.03)
    const hp = ac.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 3000
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0, t)
    ng.gain.linearRampToValueAtTime(g * 0.4, t + 0.002)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
    n.connect(hp).connect(ng)
    out(ng, 1, 0.18)
  }
  // WHIP — banner whip crack
  const whipN = (t) => {
    const n = noise(t, 0.03)
    const hp = ac.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 4200
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(0.1, t + 0.002)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
    n.connect(hp).connect(a)
    out(a, 1, 0.1)
    const o = osc('sine', 900, t, 0.07)
    o.frequency.exponentialRampToValueAtTime(280, t + 0.05)
    const og = ac.createGain()
    og.gain.setValueAtTime(0, t)
    og.gain.linearRampToValueAtTime(0.06, t + 0.003)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
    o.connect(og)
    out(og, 1, 0.12)
  }
  // LID — pot-lid wobble (grandmother gag)
  const lidN = (t) => {
    const KNOCKS = [[0, 0.032], [0.16, 0.024]]
    for (const [dt, gg] of KNOCKS) {
      const o = osc('sine', 640, t + dt, 0.06)
      o.frequency.exponentialRampToValueAtTime(470, t + dt + 0.03)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t + dt)
      a.gain.linearRampToValueAtTime(gg, t + dt + 0.002)
      a.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.05)
      o.connect(a)
      out(a, 1, 0.05)
    }
    const n = noise(t + 0.02, 0.26)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 900
    bp.Q.value = 2.2
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0, t + 0.02)
    ng.gain.linearRampToValueAtTime(0.02, t + 0.06)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.26)
    n.connect(bp).connect(ng)
    out(ng, 1, 0.08)
  }
  // WHOOSH — brush strokes / razor arcs / dying lantern puff (bandpass sweep)
  const whooshN = (t, d, g = 0.028, f0 = 500, f1 = 1800, pan = 0) => {
    const n = noise(t, d)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.1
    bp.frequency.setValueAtTime(f0, t)
    bp.frequency.exponentialRampToValueAtTime(f1, t + d)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + d * 0.55)
    a.gain.linearRampToValueAtTime(0, t + d)
    n.connect(bp).connect(a)
    out(a, 1, 0.15, pan)
  }
  // STRUM — biwa chord strum (battle downbeats)
  const strumN = (ms, t, d, g = 0.06, pan = 0) => {
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.2
    bp.frequency.setValueAtTime(1300, t)
    bp.frequency.exponentialRampToValueAtTime(480, t + d)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.004)
    a.gain.exponentialRampToValueAtTime(0.001, t + d)
    for (const m of ms) {
      const o = osc('sawtooth', hz(m), t, d + 0.03)
      o.connect(bp)
    }
    bp.connect(a)
    out(a, 1, 0.16, pan)
  }
  // SHIMMER — high sine halo (gold strokes, offering, ensō)
  const shimmerN = (t, d, g = 0.018, m = 81) => {
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + d * 0.4)
    a.gain.linearRampToValueAtTime(0, t + d)
    for (const [mul, kg] of [[1, 1], [1.5, 0.5], [2.02, 0.3]]) {
      const o = osc('sine', hz(m) * mul, t, d + 0.02)
      const og = ac.createGain()
      og.gain.value = kg
      o.connect(og).connect(a)
    }
    out(a, 1, 0.25)
  }
  // STILL — two dead-static detuned sines, NO vibrato (the wig tell: hair
  // that does not move while the rain does)
  const stillN = (t, f, d, g = 0.022) => {
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.06)
    a.gain.setValueAtTime(g, t + d - 0.08)
    a.gain.linearRampToValueAtTime(0, t + d)
    for (const det of [0, 8]) {
      const o = osc('sine', f, t, d + 0.02)
      o.detune.value = det
      o.connect(a)
    }
    out(a, 1, 0.1)
  }
  // RAZOR — faint steel shing (the saya razor)
  const razorN = (t, g = 0.02) => {
    const n = noise(t, 0.18)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 3
    bp.frequency.setValueAtTime(5200, t)
    bp.frequency.exponentialRampToValueAtTime(7800, t + 0.15)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.05)
    a.gain.linearRampToValueAtTime(0, t + 0.17)
    n.connect(bp).connect(a)
    out(a, 1, 0.06)
  }
  // BELL (dry) — end-card bell, near-dry so the IR never re-excites
  const bellDryN = (t, f, g = 0.03, d = 1.2) => {
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.003)
    a.gain.exponentialRampToValueAtTime(0.001, t + d)
    for (const [mul, kg] of [[1, 1], [2.76, 0.2], [5.4, 0.05]]) {
      const o = osc('sine', f * mul, t, d + 0.02)
      const og = ac.createGain()
      og.gain.value = kg
      o.connect(og).connect(a)
    }
    out(a, 1, 0.02)
  }

  // ---------- cue wrappers (ledger entry + exactly one kit event) ----------
  const koto = (m, t, d, g, pan = 0, send = 0.2, dead = false) =>
    cue(t, dead ? 'kotoDead' : 'koto', true, 0.002, d, 0, g, () => kotoN(m, t, d, g, pan, send, dead))
  const biwa = (m, t, g = 0.11, d = 0.32) => cue(t, 'biwa', true, 0.001, d, 0.03, g, () => biwaN(m, t, g, d))
  const shaku = (m, t, d, g, opts = {}) => {
    const atk = opts.atk ?? (opts.shriek ? 0.015 : 0.12)
    const rel = opts.rel ?? (opts.shriek ? 0.25 : 0.4)
    cue(t, 'shakuhachi', true, atk, d, rel, g, () => shakuN(m, t, d, g, opts))
  }
  const dread = (ms, t, span, g, cut = 320, send = 0.22) => {
    const [atk, rel] = dreadSpans(span)
    cue(t, 'strings', true, atk, span - atk - rel, rel, g, () => dreadN(ms, t, span, g, cut, send))
  }
  const tai = (t, g = 0.22, f = 58) => {
    reg(t, 'taiko', true, 0.002, 1.0, 0, g)
    kit.taiko(t, g, f)
  }
  const heart = (t, g = 0.2) => {
    reg(t, 'taiko', true, 0.008, 0.51, 0, g)
    kit.heartbeat(t, g)
  }
  const strs = (t, ms, dur, g, atk = 0.8, rel = 0.8, cut = 2200) => {
    reg(t, 'strings', true, atk, dur - atk, rel, g)
    kit.strings(t, ms, dur, g, atk, rel, cut)
  }
  const choir = (t, ms, dur, g, vowel = 'a', atk = 0.9, rel = 1.0) => {
    reg(t, 'choir', true, atk, dur - atk, rel, g)
    kit.choir(t, ms, dur, g, vowel, atk, rel)
  }
  const thnd = (t, g = 0.1, d = 2.2) => {
    reg(t, 'thunder', false, 0.05, d - 0.15, 0.1, g)
    kit.thunder(t, g, d)
  }
  const rise = (t0, t1, g = 0.05) => {
    reg(t0, 'swell', false, t1 - t0 - 0.01, 0, 0.01, g)
    kit.swell(t0, t1, g, 6000)
  }
  const sub = (t, g, f0, f1, d) => {
    reg(t, 'sub', true, 0.01, d, 0, g)
    kit.sub(t, g, f0, f1, d)
  }
  const tick = (t, g = 0.035, f = 4200, pan = 0) => {
    reg(t, 'tick', true, 0.001, 0.018, 0, g)
    kit.tick(t, g, f)
  }
  // raw-builder wrappers (rim/strum are primitives, not kit instruments)
  const rim = (t, g = 0.05, pan = 0) => {
    reg(t, 'rim', true, 0.001, 0.05, 0, g)
    at(t, () => rimN(t, g, pan))
  }
  const strum = (ms, t, d, g = 0.06, pan = 0) => {
    reg(t, 'strum', true, 0.004, d - 0.004, 0, g)
    at(t, () => strumN(ms, t, d, g, pan))
  }

  // ---------- composite voices (one at() each) ----------
  // FLOW motif — one cue per statement: offsets [0,+7,+8,+12], rhythm
  // [3,3,1,6] beats scaled to u seconds; late/lateBy = the comic's late note
  const flow = (t0, u, g, { root = FLOW_ROOT, late = -1, lateBy = 0, pan = 0, send = 0.2 } = {}) => {
    const starts = [0, 3, 6, 7]
    cue(t0, 'flow', true, 0.002, 13 * u - 0.002, 0.3, g, () => {
      FLOW.forEach((k, i) => {
        const tt = t0 + starts[i] * u + (i === late ? lateBy : 0)
        kotoN(root + k, tt, FLOW_RHYTHM_BEATS[i] * u + (i === 3 ? 0.3 : 0.12), g, pan, send)
      })
    })
  }

  // ========================= S1 PROVINCE (0-10, 76 BPM, A hirajoshi) =========================
  // dread played quiet; the province as something worth losing. Rain starts
  // here and never fully leaves until MASTER.sunBreak.
  cue(CUES.province, 'rain', false, 1.4, MA.rainOnly - 1.4, 0.03, 0.075, () =>
    rainBedN(CUES.province, MA.rainOnly + 0.06, [
      [1.4, 1], [MA.mixOut - 0.02, 1], [MA.rainOnly, 0.29], [MA.rainOnly + 0.03, 0],
    ]),
  )
  dread([33, 45], CUES.province, 9.2, 0.03, 300)
  shaku(57, CUES.province, 2.6, 0.055) // the valley's old tune, breathy
  koto(69, CUES.province + 1.0, 1.1, 0.045, -0.1) // koto sparse as falling drops (under K1)
  shaku(64, MASTER.tender, 2.2, 0.05, { send: 0.14 }) // the tying: softer, warmer
  cue(MASTER.banner, 'whip', false, 0.002, 0.07, 0.002, 0.1, () => whipN(MASTER.banner))
  biwa(45, MASTER.banner, 0.09, 0.3) // first dread stab under the Cabald banner
  koto(65, MASTER.kneel, 1.3, 0.04, 0.1) // one strand escapes on the wind
  tai(CUES.taikoEnter, 0.24, 56) // taiko enters under the riders
  tai(CUES.taikoEnter + beatSec('province'), 0.18, 52)
  tai(CUES.taikoEnter + beatSec('province') * 2, 0.15, 50)
  cue(MASTER.wipeToRaid, 'whoosh', false, 0.33, 0.24, 0.03, 0.028, () => whooshN(MASTER.wipeToRaid, 0.6, 0.028, 500, 2000))

  // ========================= S2 RAID (10-22, 76 BPM) =========================
  // menace with manners: taiko heartbeat under the lane walk, biwa stabs on
  // the shear line, one bar of half-time feel under the falling knot, thunder
  // build into the hard cut — everything ends BY the clap at CUES.thunderCut.
  heart(b('raid', 0, 0), 0.2)
  heart(b('raid', 0, 2), 0.18)
  heart(b('raid', 0, 4), 0.18)
  biwa(52, CUES.shearLine, 0.085, 0.28) // stab per shear pass
  tick(CUES.shearLine, 0.045, 5000) // the first snip glint
  tick(CUES.shearLine + 0.45, 0.04, 5200)
  biwa(57, CUES.shearLine + 1.0, 0.075, 0.26)
  tick(CUES.shearLine + 0.9, 0.038, 4800)
  tai(CUES.knotFall, 0.26, 50) // half-time FEEL: grid holds, notes stretch
  dread([33, 45], CUES.knotFall, 2.2, 0.03, 240)
  koto(57, CUES.knotFall, 2.0, 0.045) // one long stretched note for the slow-mo
  cue(MASTER.knotSplash, 'splash', false, 0.005, 0.4, 0.05, 0.03, () => whooshN(MASTER.knotSplash, 0.45, 0.03, 1200, 300))
  cue(MASTER.potLid, 'lid', true, 0.002, 0.26, 0.02, 0.032, () => lidN(MASTER.potLid))
  shaku(56, MASTER.childStare, 1.9, 0.028, { send: 0.1 }) // the child stares; a whisper of tune
  biwa(45, MASTER.bannerPinned, 0.08, 0.3)
  tai(MASTER.bannerPinned, 0.16, 52)
  rise(CUES.thunderCut - 0.8, CUES.thunderCut, 0.045) // thunder builds under the mix
  thnd(CUES.thunderCut - 0.4, 0.07, 0.4) // short build rumble, ends WITH the cut
  thnd(CUES.thunderCut, 0.28, 3.5) // THE thunderclap — the hard cut's sound
  sub(CUES.thunderCut, 0.3, 60, 26, 1.4)
  tai(CUES.thunderCut, 0.2, 54) // last pitched hit; music hard-cuts with picture

  // ========================= S3 RONIN (22-38, 76 BPM) =========================
  // mochi stand near-silence (chews + rain); the rice grain is the smallest
  // sound in the film; FLOW motif FIRST statement koto solo when 42 stands;
  // each recruit join re-orchestrates the motif.
  const chews = [0.35, 1.5, 2.65, 3.9]
  chews.forEach((dt, i) => {
    cue(MASTER.mochiIn + dt, 'chew', false, 0.012, 0.043, 0.002, 0.032 - i * 0.0027, () => chewN(MASTER.mochiIn + dt, 0.032 - i * 0.0027))
  })
  dread([33, 45], MASTER.childReveal, 1.3, 0.02, 240) // the S2 image returned
  tick(MASTER.chewStop, 0.034, 4200) // ONE rice grain falls — smallest sound
  flow(CUES.flowFirst, beatSec('province') / 2, 0.056, { pan: -0.08 }) // FLOW #1: koto solo
  tai(CUES.titleDrop, 0.22, 54) // the film names itself
  rise(CUES.titleDrop, TITLE_UNDERLINE.t0 + TITLE_UNDERLINE.dur, 0.04) // underline swell
  tai(CUES.recruitGiant, 0.3, 50) // giant: the deep taiko
  strs(CUES.recruitGiant, [45, 52], 1.8, 0.026, 0.5, 0.7) // the band assembles, warm
  cue(CUES.recruitTwin, 'kotoTrem', true, 0.002, 1.0, 0.2, 0.038, () => {
    for (let i = 0; i < 8; i++) kotoN(i % 2 ? 76 : 69, CUES.recruitTwin + i * 0.1, 0.3, 0.038, i % 2 ? 0.25 : -0.25, 0.15)
  }) // twin: fast koto tremolo
  biwa(40, CUES.recruitVeteran, 0.085, 0.5) // veteran: low biwa, says nothing
  flow(CUES.recruitComic, 0.2, 0.05, { late: 2, lateBy: 0.35, pan: 0.12 }) // comic: ONE note late
  cue(MASTER.wipeToTraining, 'whoosh', false, 0.44, 0.32, 0.04, 0.026, () => whooshN(MASTER.wipeToTraining, 0.8, 0.026, 600, 1800))

  // ========================= S4 TRAINING (38-49, 76 BPM) =========================
  // light koto ostinato on the section grid; pratfall domino on staggered
  // rims; the comb metronome taps SET the grid with FLOW-rhythm fragments
  // (no pitches); warm string turn at CUES.gift; sunset phrase ends before
  // the S5 downbeat.
  const OST = [[57, 60, 64, 60], [59, 64, 65, 64]]
  for (let bar = 0; bar < 4; bar++) {
    const bt = b('training', bar)
    const beats = bar === 3 ? 2 : 4
    cue(bt, 'kotoOstinato', true, 0.002, beats * beatSec('training'), 0.05, 0.04, () => {
      for (let k = 0; k < beats; k++) kotoN(OST[bar % 2][k], bt + k * beatSec('training'), 0.55, 0.04, k % 2 ? 0.12 : -0.12, 0.16)
    })
  }
  cue(CUES.domino, 'rim', true, 0.001, 0.62, 0.05, 0.05, () => {
    for (let i = 0; i < 5; i++) rimN(CUES.domino + i * 0.13, 0.05 - i * 0.004, -0.4 + i * 0.2)
  }) // pratfall domino, staggered L->R squelch rims
  cue(MASTER.combDrill, 'combDrill', true, 0.001, 0.72, 0.05, 0.026, () => {
    for (let i = 0; i < 6; i++) tickN(MASTER.combDrill + i * 0.12, 0.026, 3600 + i * 120)
  })
  biwa(45, MASTER.combDrill, 0.07, 0.4) // the veteran permits it, slow nod
  rim(MASTER.waxOn, 0.055)
  koto(76, MASTER.waxOn, 0.5, 0.042) // wax-on gag: two-note flourish
  koto(72, MASTER.waxOn + 0.2, 0.6, 0.036)
  cue(CUES.flowDrill, 'tap', true, 0.001, 4.0, 0.05, 0.045, () => {
    // FLOW rhythm fragments long-long-short — the metronome sets the grid
    const u = beatSec('training')
    patN(CUES.flowDrill, 0.045)
    patN(CUES.flowDrill + 3 * u, 0.04)
    tickN(CUES.flowDrill + 4 * u, 0.03, 3600)
    tickN(CUES.flowDrill + 5 * u, 0.03, 3600)
  })
  strs(CUES.gift, [45, 52, 57, 60], 2.0, 0.032, 0.6, 0.8) // the warm turn
  koto(72, CUES.gift, 1.0, 0.04, 0.15)
  shaku(64, MASTER.sunset, 0.85, 0.045, { rel: 0.3 }) // sunset phrase, ends pre-battle
  cue(MASTER.wipeToBattle, 'whoosh', false, 0.385, 0.28, 0.035, 0.026, () => whooshN(MASTER.wipeToBattle, 0.7, 0.026, 400, 1600))

  // ========================= S5 BATTLE (49-64, 152 BPM x2) =========================
  // percussion ONLY — taiko deep/rim alternation + biwa strums on the x2
  // grid; the grid SKIPS the beat at the wig scarecrows; three paddy impacts
  // through the clock at MASTER.charge; FLOW withheld entirely; the big
  // stroke rises into the duel downbeat.
  const SKIP = new Set([b('battle', 0, 3), b('battle', 2, 0), b('battle', 2, 1)])
  for (let bar = 0; bar < 9; bar++) {
    for (let k = 0; k < 4; k++) {
      const t = b('battle', bar, k)
      if (t >= 62.7) break
      if (SKIP.has(t)) continue // scarecrow hesitation + impact window
      if (k % 2 === 0) tai(t, k === 0 ? 0.24 : 0.17, k === 0 ? 56 : 50)
      else rim(t, k === 1 ? 0.048 : 0.042)
      if (k === 0 && bar % 2 === 0) strum([45, 52, 57], t, 0.42, 0.055)
    }
  }
  tai(MASTER.charge, 0.3, 60) // paddy impact 1 (drawn freeze 1)
  tai(MASTER.charge + beatSec('battle'), 0.24, 55) // impact 2
  tai(MASTER.charge + beatSec('battle') * 2, 0.24, 50) // impact 3
  strs(CUES.topknotRain, [57, 60, 64], 1.6, 0.03, 0.5, 0.7) // tender swell under the catch
  cue(CUES.topknotRain, 'kotoRun', true, 0.002, 0.76, 0.05, 0.04, () => {
    const NOTES = [60, 64, 65, 69]
    NOTES.forEach((m, i) => kotoN(m, CUES.topknotRain + i * 0.12, 0.45, 0.04, -0.2 + i * 0.13, 0.16))
  })
  cue(MASTER.inkSlashes, 'swipe', false, 0.12, 0.26, 0.02, 0.03, () => {
    whooshN(MASTER.inkSlashes, 0.22, 0.03, 2400, 5200)
    whooshN(MASTER.inkSlashes + 0.18, 0.22, 0.026, 2600, 5400, 0.2)
  })
  shaku(81, CUES.sleeve, 0.5, 0.075, { shriek: true }) // THE shakuhachi shriek
  rim(CUES.sleeve, 0.05)
  cue(MASTER.well, 'plinks', true, 0.003, 1.1, 0.05, 0.04, () => {
    plinkN(MASTER.well + 0.15, 1250, 0.04)
    plinkN(MASTER.well + 0.35, 1050, 0.036)
    plinkN(MASTER.well + 0.55, 880, 0.032) // plink plink plink
    patN(MASTER.well + 1.1, 0.026) // the bow to the well
  })
  cue(CUES.bannerCut, 'kotoFall', true, 0.002, 1.05, 0.05, 0.045, () => {
    kotoN(64, CUES.bannerCut, 0.4, 0.045, 0.1, 0.14)
    kotoN(60, CUES.bannerCut + 0.2, 0.5, 0.04, 0, 0.14)
    kotoN(57, CUES.bannerCut + 0.4, 0.7, 0.036, -0.1, 0.14)
  }) // the raid loses heart, descending
  tai(CUES.bannerCut, 0.18, 50)
  koto(60, MASTER.retie, 1.2, 0.04) // it holds
  cue(MASTER.messenger, 'rimRun', true, 0.001, 0.52, 0.05, 0.045, () => {
    for (let i = 0; i < 4; i++) rimN(MASTER.messenger + i * 0.13, 0.045 - i * 0.008, 0.5 - i * 0.27)
  }) // the sprint for the bridge, receding
  rise(MASTER.bridgeStroke, CUES.duel, 0.05) // THE BIG STROKE rises into 64.0

  // ========================= S6 DUEL (64-83, 76 BPM, A insen) =========================
  // heartbeat through the standoff; static wig-tell pin; the mix-out's last
  // hit dies AT CUES.maIn; then the MA: rain only, ZERO musical events in
  // [MA.rainOnly, CUES.pluck); ONE dry biwa pluck AT the flash (freeze
  // START); everything lands at MASTER.land; dead koto for the wig; eyebrow
  // ritual = whisper arcs + tiny plucks + ONE polite thunder each; holy
  // chord on the offering; quiet minor-tinged FLOW under the bow; clean
  // into the 83.0 hard cut.
  heart(CUES.duel, 0.22)
  heart(b('duel', 0, 2), 0.2)
  heart(b('duel', 0, 4), 0.18)
  heart(b('duel', 0, 6), 0.16)
  heart(b('duel', 0, 8), 0.14)
  dread([33, 45], CUES.duel, MA.mixOut - CUES.duel, 0.032, 240) // dies at mix-out
  cue(MASTER.foreshadow, 'pin', true, 0.06, 0.11, 0.08, 0.022, () => stillN(MASTER.foreshadow, 1244, 0.25, 0.022))
  cue(MA.mixOut, 'taiko', true, 0.003, 0.29, 0, 0.2, () => cutTaiN(MA.mixOut, 0.2, 52)) // cut off by the mix-out
  cue(MA.rainOnly, 'rain', false, 0.03, MASTER.sunBreak - MA.rainOnly - 0.98, 0.95, 0.075, () =>
    rainBedN(MA.rainOnly, MASTER.sunBreak + 0.05, [
      [MA.rainOnly + 0.03, 0.29], [MA.strike + 0.15, 0.29], [MA.resume + 0.55, 1],
      // the bed steps back for the eyebrow ritual (P1: plucks+thunder must read
      // over the bed) — ducked from the first pass to just after the last pluck
      [EYEBROW.film[0] - 0.05, 1], [EYEBROW.plucks[0], 0.4],
      [EYEBROW.plucks[3] + 0.2, 0.4], [EYEBROW.plucks[3] + 0.6, 1],
      [MASTER.sunBreak - 0.95, 1], [MASTER.sunBreak, 0],
    ]),
  ) // rain bed CONTINUES through the 0.35 stop — picture freezes, audio doesn't
  biwa(57, CUES.pluck, 0.11, 0.32) // THE ma-beat pluck: dry, tail 0.35 s, ON the flash
  tai(MA.resume, 0.26, 58) // everything lands
  sub(MA.resume, 0.3, 64, 30, 1.2)
  strs(MA.resume, [33, 45, 46], 1.5, 0.034, 0.2, 0.7) // the Bb in the bass: insen dread
  koto(57, MA.resume, 1.4, 0.05)
  cue(MASTER.lanternOut, 'puff', false, 0.25, 0.2, 0.05, 0.02, () => whooshN(MASTER.lanternOut, 0.5, 0.02, 700, 160))
  cue(MASTER.wigSplit, 'kotoDead', true, 0.002, 0.98, 0.05, 0.05, () => {
    kotoN(69, MASTER.wigSplit, 0.5, 0.05, 0, 0.04, true)
    kotoN(68, MASTER.wigSplit + 0.11, 0.5, 0.045, 0, 0.04, true) // two dead plucks, semitone apart
  })
  shaku(64, MASTER.unmask, 1.1, 0.024, { send: 0.1 }) // the bare face; a breath
  cue(MASTER.scalpPat, 'pat', true, 0.001, 0.18, 0.02, 0.03, () => {
    patN(MASTER.scalpPat, 0.03)
    patN(MASTER.scalpPat + 0.13, 0.026) // nothing left to shave
  })
  cue(MASTER.kneelRitual, 'shing', false, 0.05, 0.12, 0, 0.02, () => razorN(MASTER.kneelRitual, 0.02))
  EYEBROW.film.forEach((t, i) => {
    cue(t, 'arc', false, 0.165, 0.11, 0.025, 0.026, () => whooshN(t, 0.3, 0.026, 1400, 3200)) // razor pass, audible whisper
  })
  EYEBROW.plucks.forEach((t, i) => {
    // pin tier (0.1-0.16): the sky applauding, once per pass, never twice —
    // must read CLEARLY over the ducked rain bed (motion-QA P1-4)
    cue(t, 'pluck', true, 0.002, 0.14, 0.02, 0.12, () => kotoN([76, 72, 71, 69][i], t, 0.14, 0.12, i % 2 ? 0.2 : -0.2, 0.03))
    thnd(t, 0.15, 2.4) // ONE polite thunder per pass, now at pin level
  })
  strs(MASTER.offering, [45, 48, 52, 57], 1.2, 0.026, 0.35, 0.7) // four brows on the blade: holy chord
  cue(MASTER.offering, 'shimmer', false, 0.4, 0.55, 0.05, 0.014, () => shimmerN(MASTER.offering, 1.0, 0.014, 76))
  flow(CUES.flowBow, 0.25, 0.05, { root: 45, send: 0.08 }) // FLOW minor-tinged, quiet, ends 82.9
  shaku(64, CUES.flowBow, 2.2, 0.026, { send: 0.08 })
  dread([33, 36], CUES.flowBow + 0.25, 2.8, 0.02, 240, 0.1) // A1+C2: the minor third

  // ========================= S7 RESOLUTION (83-96, 76 BPM, A hirajoshi) =========================
  // FLOW TRIUMPHANT in full ensemble from the 83.0 cut; sun choir at
  // sunBreak (rain bed dies with it); held tonic from CUES.flowHold under
  // E1/E2; near-dry ending whose last decay completes before 95.9.
  tai(CUES.resolve, 0.2, 56)
  strs(CUES.resolve, [33, 45, 57], 2.6, 0.036, 0.5, 0.9)
  flow(CUES.resolve, beatSec('resolve') * 0.7, 0.058, { send: 0.24 }) // FLOW triumphant, koto lead
  cue(CUES.resolve, 'shimmer', false, 0.48, 0.62, 0.1, 0.016, () => shimmerN(CUES.resolve, 1.2, 0.016, 88)) // regrowth gold
  shaku(69, CUES.resolve + 0.05, 3.8, 0.045) // the flute doubles, an octave up
  choir(CUES.sunBreak, [57, 60, 64], 2.4, 0.03, 'a', 0.7, 1.0) // sun cracks the clouds
  cue(CUES.sunBreak, 'shimmer', false, 0.72, 0.98, 0.1, 0.014, () => shimmerN(CUES.sunBreak, 1.8, 0.014, 93))
  cue(MASTER.combWave, 'combWave', true, 0.002, 0.92, 0.05, 0.042, () => {
    const WAVE = [57, 60, 64, 69, 72]
    WAVE.forEach((m, i) => kotoN(m, MASTER.combWave + i * 0.13, 0.45, 0.042, -0.4 + i * 0.2, 0.16))
  }) // comb ritual wave L->R
  cue(MASTER.wheatRun, 'kotoRun', true, 0.002, 1.2, 0.05, 0.036, () => {
    const ROW = [69, 72, 69, 65, 64, 60]
    ROW.forEach((m, i) => kotoN(m, MASTER.wheatRun + i * 0.17, 0.4, 0.036, -0.15 + (i % 3) * 0.15, 0.14))
  }) // the child runs the row
  koto(69, MASTER.mochiToss, 0.7, 0.04, -0.2)
  cue(MASTER.mochiToss + 0.25, 'pat', true, 0.001, 0.05, 0, 0.03, () => patN(MASTER.mochiToss + 0.25, 0.03)) // caught two-fists
  dread([33, 45], MASTER.mistWalk, 1.6, 0.02, 260, 0.12)
  dread([45, 57, 64], CUES.flowHold, 5.56, 0.034, 900, 0.06) // THE held tonic, ends 95.86
  shaku(69, CUES.flowHold, 4.6, 0.028, { send: 0.05 })
  cue(MASTER.ensoIn, 'shimmer', false, 0.64, 0.86, 0.1, 0.013, () => shimmerN(MASTER.ensoIn, 1.6, 0.013, 81)) // the ensō draws
  cue(CUES.endCard, 'endCard', true, 0.002, 1.43, 0.02, 0.05, () => {
    kotoN(57, CUES.endCard, 1.4, 0.05, -0.1, 0.02)
    kotoN(64, CUES.endCard + 0.12, 1.2, 0.04, 0.1, 0.02)
    bellDryN(CUES.endCard, hz(81), 0.028, 1.2) // HONOR GROWS BACK
  })
  tick(MASTER.ensoSeal, 0.024, 2400) // the aperture seals
  // the last breath in two syllables (motion-QA P2-4: was inaudible at 0.02):
  // a soft exhale the silence can breathe against, then the final flick —
  // both fully decayed before 95.9
  cue(CUES.done - 0.4, 'breath', false, 0.05, 0.22, 0.05, 0.05, () => {
    const t = CUES.done - 0.4
    const n = noise(t, 0.34)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1500
    bp.Q.value = 0.9
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(0.05, t + 0.05)
    a.gain.setValueAtTime(0.05, t + 0.24)
    a.gain.linearRampToValueAtTime(0, t + 0.32)
    n.connect(bp).connect(a)
    out(a, 1, 0.04)
    const o = osc('sine', 220, t, 0.34)
    const og = ac.createGain()
    og.gain.setValueAtTime(0, t)
    og.gain.linearRampToValueAtTime(0.022, t + 0.05)
    og.gain.setValueAtTime(0.022, t + 0.24)
    og.gain.linearRampToValueAtTime(0, t + 0.32)
    o.connect(og)
    out(og, 1, 0.03)
  })
  cue(CUES.done - 0.05, 'breath', false, 0.008, 0.037, 0, 0.055, () => {
    // final flick: decays fully before 95.9
    const t = CUES.done - 0.05
    const n = noise(t, 0.05)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1800
    bp.Q.value = 1
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(0.055, t + 0.008)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.045)
    n.connect(bp).connect(a)
    out(a, 1, 0.03)
    const o = osc('sine', 220, t, 0.05)
    const og = ac.createGain()
    og.gain.setValueAtTime(0, t)
    og.gain.linearRampToValueAtTime(0.032, t + 0.008)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.042)
    o.connect(og)
    out(og, 1, 0.02)
  })
}
