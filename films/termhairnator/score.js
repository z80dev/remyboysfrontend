// =====================================================================
// THE TERMHAIRNATOR — SCORE (composer cue sheet)
// =====================================================================
// 100.0 s ORIGINAL industrial-orchestral score. Terminator-2-INSPIRED in
// texture only (chrome dread -> molten foundry -> dawn warmth); it quotes
// NOTHING — no Brad Fiedel motif, no theme from any film. Our three
// motifs live in ./timeline.js and are the only themes stated:
//   SHEDNET [0,1,6] on C2  — the machine (braam voice, C minor home)
//   FLOW   [0,4,7,12,16] on C4 — the awakening, stated ONLY major
//   SPROUT [0,4,7] on G5   — the chime that prefigures FLOW (foundry)
//
// MODE FLIP HARMONICS: the score never states FLOW in minor. The flip is
// prepared INSIDE C minor by two C-MAJOR pre-echoes (reflect pad 75.5,
// "I KNOW" chord 78.4), the steel-close flare at 82.0 is deliberately
// non-tonal, and the epilogue CUT lands the downbeat of a C major dawn
// bloom with FLOW in full — minor never touches the theme. Endcard is a
// plain I-V-I hymn resolving on the 98.0 bar.
//
// SILENCE DISCIPLINE (hit-stops; sl-time cues live inside freezes):
//   gate dive   41.50-41.75  EVERYTHING mutes except one hi sl-riser
//                            (engine grind envelope dies exactly at 41.50)
//   crash       44.50-44.80  boom + explosion roar BLOOM across the freeze
//   hair grab   66.00-66.40  SCANDAL STING: one high sine + two
//                            heartbeats only — beds skip the window
//   core stab   72.00-72.55  mega impact + power-down groan, then
//                            near-silence to 74.5 (gutter ticks only)
//   sprout      74.50        3 bell notes, ALONE (beds already dead)
//
// EVERY cue is registered TOP-LEVEL in score(kit): direct instrument
// calls, or composite custom voices that wrap raw osc/noise/out nodes in
// ONE top-level at() each (floz pattern). No nested registration — the
// renderScore flush bug never gets a chance.
//
// LOUDNESS STRATEGY (engine normalises to -1 dBFS then loudnorm to
// audio.lufs; our job is internal balance so loudnorm never pumps):
//   beds (rain/wind/pads/rumbles)   g 0.02-0.05
//   ostinati/plucks/ticks           g 0.025-0.06
//   stabs/clangs/blips              g 0.04-0.14
//   pins (braams/impacts/crash)     g 0.3-0.34, impact <= 1.0, sparse
// Bass stays short + dark (cut <= 620) under the streets/chase pulse so
// it can never mask the epilogue FLOW statement (which has NO bass and
// NO percussion at all).
//
// END MATH: last cue starts 98.0 (final I); every envelope is written to
// finish by 99.4, so with the requested audio block the shared-IR tail
// is gone before the 100.0 last frame (taiko shared-reverb lesson).
//
// REQUESTED AUDIO BLOCK for film.js (composer asks, builder wires):
//   audio: { seed: 8, reverb: 1.4, reverbGain: 0.22, lufs: -14 }
// =====================================================================
import {
  ARRIVAL_EV,
  CAPTIONS,
  CHASE_EV,
  CLOCK,
  FOUNDRY_EV,
  MASTER,
  SHEDNET,
  SHEDNET_ROOT,
  T,
  b,
  beatSec,
  motifFlow,
  motifSprout,
} from './timeline.js'

export function score(kit) {
  const {
    ac,
    at,
    bass,
    bell,
    blip,
    braam,
    choir,
    clunk,
    crash,
    glass,
    glitch,
    hat,
    heartbeat,
    hiss,
    hz,
    impact,
    kick,
    out,
    pad,
    piano,
    pluck,
    rain,
    riser,
    R,
    strings,
    sub,
    sweepDown,
    swell,
    taiko,
    tick,
    thunder,
    whoosh,
    wind,
    noise,
    osc,
  } = kit

  // ---------- derived constants (all clock/truth-derived, nothing hand-added) ----------
  const SHN = SHEDNET.map((k) => SHEDNET_ROOT + k)        // [36,37,42] the braam chord
  const FLOWN = motifFlow()                               // [60,64,67,72,76] major only
  const SPROUTN = motifSprout()                           // [79,83,86] G5-B5-D6
  const PB = beatSec('prologue')                          // 0.625
  const AB = beatSec('arrival')                           // 0.909
  const SB = beatSec('streets')                           // 0.6
  const CB = beatSec('chase')                             // 0.4545
  const FB = beatSec('foundry')                           // 0.625
  const EB = beatSec('epilogue')                          // 0.8333
  // freeze durations straight off the shot clocks (sl-time cue lengths)
  const GATE_D = CLOCK.chase.stops[0].d                   // 0.25
  const CRASH_D = CLOCK.chase.stops[1].d                  // 0.30
  const GRAB_D = CLOCK.foundry.stops[1].d                 // 0.40
  // events that live only in the shot-local EV tables -> CLOCK.abs
  const RISE_END = CLOCK.arrival.abs(ARRIVAL_EV.riseEnd)  // 14.2
  const SCAN_END = CLOCK.arrival.abs(ARRIVAL_EV.scanEnd)  // 21.5
  const FIRE = CLOCK.chase.abs(CHASE_EV.fireBed)          // 45.1
  const FLOURISH = CLOCK.foundry.abs(FOUNDRY_EV.flourish) // 70.0
  const REFLECT = CLOCK.foundry.abs(FOUNDRY_EV.reflect)   // 75.5
  // dialogue caption windows (f1 machine line / f2 hero line)
  const F1 = CAPTIONS.find((c) => c.id === 'f1')          // 53.4-56.6
  const F2 = CAPTIONS.find((c) => c.id === 'f2')          // 56.8-60.0

  // =====================================================================
  // CUSTOM VOICES — each wraps its nodes in ONE at() and is only ever
  // called TOP-LEVEL (no nested registration).
  // =====================================================================
  // CRT mains hum (prologue boot)
  const crtHum = (t0, dur) =>
    at(t0, () => {
      const a = ac.createGain()
      a.gain.setValueAtTime(0.016, t0)
      a.gain.setValueAtTime(0.016, t0 + dur - 0.06)
      a.gain.linearRampToValueAtTime(0.0001, t0 + dur)
      for (const [f, k] of [[50, 1], [100, 0.5], [150, 0.22]]) {
        const o = osc('sine', f, t0, dur)
        const og = ac.createGain()
        og.gain.value = k
        o.connect(og).connect(a)
      }
      out(a, 1, 0.05)
    })
  // servo whir: saw pitch-ramp through a lowpass (the machine's weight)
  const servo = (t0, f0, f1, dur, g, pan) =>
    at(t0, () => {
      const o = osc('sawtooth', f0, t0, dur + 0.02)
      o.frequency.exponentialRampToValueAtTime(f1, t0 + dur)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1600
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + 0.03)
      a.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      o.connect(lp).connect(a)
      out(a, 1, 0.18, pan)
    })
  // eye-ignite: rising red sine pair (beating = menace)
  const redSine = (t0) =>
    at(t0, () => {
      const o = osc('sine', 170, t0, 1.15)
      o.frequency.exponentialRampToValueAtTime(920, t0 + 1.05)
      const o2 = osc('sine', 173, t0, 1.15)
      o2.frequency.exponentialRampToValueAtTime(926, t0 + 1.05)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(0.042, t0 + 0.5)
      a.gain.linearRampToValueAtTime(0.0001, t0 + 1.15)
      o.connect(a)
      o2.connect(a)
      out(a, 1, 0.2)
    })
  // detuned alarm swell (lock sting: minor-second siren rising)
  const alarmSwell = (t0, dur) =>
    at(t0, () => {
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 900
      bp.Q.value = 1.2
      const a = ac.createGain()
      a.gain.setValueAtTime(0.001, t0)
      a.gain.linearRampToValueAtTime(0.05, t0 + 0.5)
      a.gain.setValueAtTime(0.05, t0 + dur - 0.3)
      a.gain.linearRampToValueAtTime(0.0001, t0 + dur)
      for (const f of [392, 415.3]) {
        const o = osc('square', f, t0, dur)
        o.connect(bp)
      }
      bp.connect(a)
      out(a, 1, 0.22, 0.3)
    })
  // motorcycle engine: detuned saw pair + filtered noise, LFO growl,
  // envelope dies EXACTLY at t1 (the mute before a freeze)
  const engineGrind = (t0, t1, f0, gPeak) =>
    at(t0, () => {
      const dur = t1 - t0
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 320
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(gPeak, t0 + 0.3)
      a.gain.setValueAtTime(gPeak, t1 - 0.02)
      a.gain.linearRampToValueAtTime(0.0001, t1)
      for (const det of [0, 12]) {
        const o = osc('sawtooth', det ? f0 * 1.012 : f0, t0, dur)
        o.detune.value = det
        o.connect(lp)
      }
      const n = noise(t0, dur)
      const ng = ac.createGain()
      ng.gain.value = 0.35
      n.connect(ng).connect(lp)
      lp.connect(a)
      out(a, 1, 0.25)
      const lfo = osc('sine', 8.2, t0, dur)
      const lg = ac.createGain()
      lg.gain.setValueAtTime(gPeak * 0.25, t0 + 0.3)
      lg.gain.linearRampToValueAtTime(0, t1 - 0.05)
      lfo.connect(lg).connect(a.gain)
    })
  // hotwire sputter -> rev (engine catch)
  const engineCatch = (t0) =>
    at(t0, () => {
      for (const [i, dt] of [[0, 0], [1, 0.09], [2, 0.21]]) {
        const t = t0 + dt
        const o = osc('sawtooth', 62 + i * 14, t, 0.07)
        const a = ac.createGain()
        a.gain.setValueAtTime(0.07, t)
        a.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
        o.connect(a)
        out(a, 1, 0.15)
      }
      const o = osc('sawtooth', 58, t0 + 0.34, 0.5)
      o.frequency.exponentialRampToValueAtTime(104, t0 + 0.8)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 380
      const a = ac.createGain()
      a.gain.setValueAtTime(0.001, t0 + 0.34)
      a.gain.linearRampToValueAtTime(0.06, t0 + 0.8)
      o.connect(lp).connect(a)
      out(a, 1, 0.2)
    })
  // hi sl-riser: the ONLY sound inside the gate-dive freeze
  const gateRiser = (t0, dur) =>
    at(t0, () => {
      const n = noise(t0, dur)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.Q.value = 1.6
      bp.frequency.setValueAtTime(1800, t0)
      bp.frequency.exponentialRampToValueAtTime(6400, t0 + dur)
      const a = ac.createGain()
      a.gain.setValueAtTime(0.004, t0)
      a.gain.linearRampToValueAtTime(0.09, t0 + dur * 0.92)
      a.gain.linearRampToValueAtTime(0.0001, t0 + dur)
      n.connect(bp).connect(a)
      out(a, 1, 0.15)
    })
  // explosion roar: blooms ACROSS the crash freeze (sl-time), then decays
  const explosionRoar = (t0, bloomDur) =>
    at(t0, () => {
      const dur = bloomDur + 1.3
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.Q.value = 0.8
      bp.frequency.setValueAtTime(90, t0)
      bp.frequency.exponentialRampToValueAtTime(700, t0 + bloomDur)
      bp.frequency.exponentialRampToValueAtTime(160, t0 + dur)
      const a = ac.createGain()
      a.gain.setValueAtTime(0.001, t0)
      a.gain.exponentialRampToValueAtTime(0.13, t0 + bloomDur * 0.93)
      a.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      const n = noise(t0, dur)
      n.connect(bp).connect(a)
      out(a, 1, 0.35)
    })
  // fire rumble bed (crash aftermath -> foundry cut)
  const fireBed = (t0, t1) =>
    at(t0, () => {
      const dur = t1 - t0
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 200
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(0.042, t0 + 0.7)
      a.gain.setValueAtTime(0.042, t1 - 0.4)
      a.gain.linearRampToValueAtTime(0.0001, t1)
      const n = noise(t0, dur)
      n.connect(lp).connect(a)
      out(a, 1, 0.25)
      const lfo = osc('sine', 5.5, t0, dur)
      const lg = ac.createGain()
      lg.gain.setValueAtTime(0.012, t0 + 0.7)
      lg.gain.linearRampToValueAtTime(0, t1 - 0.4)
      lfo.connect(lg).connect(a.gain)
    })
  // molten sub-roar bed (foundry ambience; dies into the core-stab silence)
  const moltenBed = (t0, t1) =>
    at(t0, () => {
      const dur = t1 - t0
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 140
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(0.05, t0 + 0.8)
      a.gain.setValueAtTime(0.05, t1 - 0.3)
      a.gain.linearRampToValueAtTime(0.0001, t1)
      const n = noise(t0, dur)
      n.connect(lp).connect(a)
      out(a, 1, 0.3)
      const lfo = osc('sine', 2.3, t0, dur)
      const lg = ac.createGain()
      lg.gain.setValueAtTime(0.014, t0 + 0.8)
      lg.gain.linearRampToValueAtTime(0, t1 - 0.3)
      lfo.connect(lg).connect(a.gain)
    })
  // SCANDAL STING: one high sine (C7) with a creeping upward bend —
  // the whole mix during the hair-grab freeze is this + two heartbeats
  const scandalSine = (t0, d) =>
    at(t0, () => {
      const o = osc('sine', hz(96), t0, d + 0.35)
      o.frequency.setValueAtTime(hz(96), t0)
      o.frequency.linearRampToValueAtTime(hz(96) * 1.03, t0 + d)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(0.075, t0 + 0.012)
      a.gain.setValueAtTime(0.075, t0 + d * 0.8)
      a.gain.linearRampToValueAtTime(0.0001, t0 + d + 0.3)
      o.connect(a)
      out(a, 1, 0.12)
    })
  // comedic tuba-bonk (headbutt: nose-plate dent)
  const tubaBonk = (t0) =>
    at(t0, () => {
      const o = osc('sawtooth', 196, t0, 0.24)
      o.frequency.exponentialRampToValueAtTime(78, t0 + 0.2)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 520
      const a = ac.createGain()
      a.gain.setValueAtTime(0.13, t0)
      a.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24)
      o.connect(lp).connect(a)
      out(a, 1, 0.12, -0.1)
    })
  // pitched-down bystander yelp
  const yelp = (t0, f0, pan) =>
    at(t0, () => {
      const o = osc('square', f0, t0, 0.17)
      o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t0 + 0.15)
      const a = ac.createGain()
      a.gain.setValueAtTime(0.035, t0)
      a.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17)
      o.connect(a)
      out(a, 1, 0.08, pan)
    })
  // birdsong chirp (epilogue dawn, two-note descend)
  const chirp = (t0, f0, pan) =>
    at(t0, () => {
      const o = osc('sine', f0, t0, 0.09)
      o.frequency.exponentialRampToValueAtTime(f0 * 0.82, t0 + 0.08)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(0.018, t0 + 0.012)
      a.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09)
      o.connect(a)
      out(a, 1, 0.1, pan)
    })
  // molten sizzle: rises through the sink crawl, cut EXACTLY at the steel
  const sizzle = (t0, t1, gPeak) =>
    at(t0, () => {
      const n = noise(t0, t1 - t0)
      const hp = ac.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.setValueAtTime(2600, t0)
      hp.frequency.exponentialRampToValueAtTime(8000, t1)
      const a = ac.createGain()
      a.gain.setValueAtTime(0.004, t0)
      a.gain.linearRampToValueAtTime(gPeak, t1 - 0.01)
      a.gain.linearRampToValueAtTime(0.0001, t1)
      n.connect(hp).connect(a)
      out(a, 1, 0.2)
    })

  // =====================================================================
  // S1 PROLOGUE 0-10 (96bpm C min, bar 2.5) — CRT hum + static ticks over
  // a near-black C drone; SHEDNET braam ON the title slam (bar 1, 2.5);
  // taiko heartbeats out from bar 2; wind + distant metal; tails clear.
  // =====================================================================
  crtHum(MASTER.crt, 1.5)                                   // CRT boot 0-1.5
  wind(MASTER.crt, T.arrival, 0.035, 120, 420)              // ash-playground wind bed
  pad(MASTER.crt, [36, 43], 9.5, 0.04, 480, 2.8)            // C2+G2 drone -> 9.5
  for (let t = 0.15; t < MASTER.fadeUp; t += 0.12 + R() * 0.18)
    tick(t, 0.012 + R() * 0.02, 3000 + R() * 4000)          // static under the typing
  glitch(MASTER.fadeUp, 0.12, 0.02)                         // CRT blip as the picture fades up
  pad(MASTER.fadeUp, [48], 8.2, 0.022, 700, 2.4)            // mid C joins on fade-up
  braam(MASTER.titleSlam, SHN, 2.3, 0.32, 1.0)              // 2.5 TITLE SLAM — SHEDNET in full
  impact(MASTER.titleSlam, 0.7, 50)                         // dust hit
  taiko(MASTER.titleSlam, 0.7, 52)
  bell(MASTER.subtitle, hz(84), 0.045, 1.4, 3.2, 2)         // 3.2 subtitle settles: cold C6 ping
  clunk(b('prologue', 2) + PB * 2, 0.06)                    // distant metal groan (6.25)
  taiko(b('prologue', 2), 0.45, 55)                         // 5.0 heartbeat pair, bar 2...
  heartbeat(b('prologue', 2), 0.35)
  taiko(b('prologue', 3), 0.4, 52)                          // ...bar 3 (7.5), fading
  heartbeat(b('prologue', 3), 0.3)
  tick(MASTER.ashLand, 0.08, 5200)                          // 8.0 the ash strand lands
  glass(MASTER.ashLand, 0.03, 0.5)
  sub(MASTER.ashLand + PB, 0.22, 55, 30, 1.2)               // sub swell out, done ~9.85

  // =====================================================================
  // S2 ARRIVAL 10-22 (66bpm C min, HALF-TIME dread) — rain bed starts
  // here and runs to the crash; THUNDER-CRACK + sub-drop exactly 11.0
  // (CLOCK-pinned — the 13.64 bar is a coincidence, unaccented); servo
  // rise 13.0-14.2; eye ignite 15.5; scan blips; low braam on DIRECTIVE;
  // wet-stone boots out.
  // =====================================================================
  rain(MASTER.rain, MASTER.crash, 0.085)                    // one rain bed: 10.0 -> 44.5
  riser(MASTER.rain + AB * 0.5, MASTER.lightning, 0.09)     // charge into the strike
  thunder(MASTER.lightning, 0.6, 4.0)                       // 11.0 the CRACK...
  impact(MASTER.lightning, 0.9, 45)
  sub(MASTER.lightning, 0.5, 65, 24, 2.4)                   // ...+ the sub-drop
  glass(MASTER.lightning, 0.12, 1.4)                        // electric sphere shatter
  pad(MASTER.lightning + AB / 2, [36, 43], 8.0, 0.03, 500, 2.0) // dread drone under the rise
  for (let t = MASTER.lightning + 0.4; t < MASTER.riseStart; t += 0.2 + R() * 0.25)
    tick(t, 0.01 + R() * 0.015, 1800 + R() * 2200)          // molten cracks cooling
  clunk(MASTER.riseStart, 0.3)                              // 13.0 it RISES: weight shift...
  servo(MASTER.riseStart, 80, 190, 0.3, 0.05, -0.2)
  servo(MASTER.riseStart + AB * 0.55, 110, 260, 0.28, 0.045, 0.2)
  servo(MASTER.riseStart + AB * 1.32, 140, 330, 0.3, 0.04, -0.1)
  clunk(RISE_END, 0.22)                                     // 14.2 settles to full height
  tick(RISE_END, 0.03, 1400)
  tick(MASTER.eyeIgnite, 0.12, 6800)                        // 15.5 spark...
  glass(MASTER.eyeIgnite, 0.05, 0.6)
  redSine(MASTER.eyeIgnite)                                 // ...+ the rising red sine
  blip(MASTER.scanStart, 980, 0.05, 0.09, 'square')         // 16.0 HUD on
  blip(MASTER.scanDumpster, 1245, 0.045, 0.08, 'square')    // 16.2 NO HAIR — PASS
  blip(MASTER.scanDumpster + AB * 0.22, 1245, 0.04, 0.08, 'square')
  blip(MASTER.scanMop, 1480, 0.045, 0.08, 'square')         // 17.2 SYNTHETIC — PASS
  blip(MASTER.scanMop + AB * 0.22, 1480, 0.04, 0.08, 'square')
  blip(MASTER.scanCat, 1760, 0.045, 0.08, 'square')         // 18.4 FUR — NON-TARGET
  blip(MASTER.scanCat + AB * 0.2, 1480, 0.04, 0.1, 'square') // answering fall
  braam(MASTER.scanDirective, [36, 37], 1.6, 0.16, 0.6)     // 20.4 low braam on DIRECTIVE
  blip(MASTER.scanDirective, 980, 0.045, 0.08, 'square')
  blip(MASTER.scanDirective + AB * 0.24, 980, 0.04, 0.08, 'square')
  sweepDown(SCAN_END, 0.3, 1400, 300, 0.06, 'square')       // 21.5 POV out
  for (let k = 0; k < 3; k++) {
    const t = MASTER.povOut + k * AB                        // wet-stone boots, quarters
    clunk(t, 0.14)
    tick(t, 0.02, 900 + R() * 300)                          // splash flick
  }

  // =====================================================================
  // S3 STREETS 22-34 (100bpm C min, bar 2.4) — neon pulse (muted bass
  // 8ths + hat ticks over rain); LOCK STING 26.0 (brake-clang + detuned
  // alarm swell); running 8ths from 28.0; bin clatter 30.5; yelps 31.5;
  // cut on the corner-turn, no ritard.
  // =====================================================================
  pad(T.streets, [36, 43], 8.0, 0.02, 480, 1.8)             // glue pad 22 -> 30
  const NEON = [0, 0, 7, 0, 0, 3, 0, 7]                     // C pedal, dark accents
  let ni = 0
  for (let t = T.streets; t < MASTER.heroRuns - 1e-9; t += SB / 2, ni++) {
    bass(t, 36 + NEON[ni % 8], SB / 2 * 0.85, 0.13, 'square', 480) // muted 8ths
    hat(t + SB / 4, 0.028, 0.03)                            // off-8th tick
  }
  clunk(MASTER.shopExit, 0.1)                               // 22.5 barbershop door
  tick(MASTER.shopExit, 0.05, 3200)
  whoosh(MASTER.shopExit + SB / 2, 0.25, 0.08, 800, 2400)   // umbrella up
  riser(MASTER.lockSting - SB, MASTER.lockSting, 0.06)      // into the sting
  clunk(MASTER.lockSting, 0.5)                              // 26.0 LOCK: brake-clang...
  bell(MASTER.lockSting, 1318, 0.12, 0.6, 5.7, 4)           // ...inharmonic ping
  glass(MASTER.lockSting, 0.08, 0.8)
  alarmSwell(MASTER.lockSting, 1.3)                         // ...detuned alarm swell
  whoosh(MASTER.turn, 0.3, 0.1, 500, 3000)                  // 26.6 he turns
  bass(MASTER.heroRuns, 33, 0.9, 0.1, 'sawtooth', 300)      // 28.0 engine-growl pre-echo
  const RUN = [0, 12, 0, 10, 0, 12, 0, 15]                  // running 8ths: C C' Bb C' Eb'
  let ri = 0
  for (let t = MASTER.heroRuns; t < MASTER.corner - 1e-9; t += SB / 2, ri++) {
    bass(t, 36 + RUN[ri % 8], SB / 2 * 0.9, 0.16, 'square', 560)
    hat(t, 0.04, 0.03)                                      // hats move ON the 8th
    if (ri % 2 === 0) kick(t, 0.22)                         // quarters
  }
  taiko(b('streets', 3), 0.35, 60)                          // bar accents under the run
  taiko(b('streets', 4), 0.35, 60)
  clunk(MASTER.binClatter, 0.35)                            // 30.5 bin clatter
  clunk(MASTER.binClatter + SB * 0.15, 0.22)
  tick(MASTER.binClatter + SB * 0.08, 0.06, 2400)
  clunk(MASTER.binClatter + SB * 0.35, 0.13)
  yelp(MASTER.bystanders, 640, -0.4)                        // 31.5 yelps, pitched down
  yelp(MASTER.bystanders + SB * 0.4, 720, 0.4)
  whoosh(MASTER.corner, 0.35, 0.12, 400, 3200)              // 33.8 corner turn — cut on it

  // =====================================================================
  // S4 CHASE 34-52 (132bpm C min, bar 1.818) — engine grind + metal
  // percussion, gear swells each bar-pair; GATE DIVE 41.50 total mute
  // except the hi sl-riser; CRASH 44.50 boom blooms across its freeze;
  // fire bed; colossal SHEDNET braam 46.0 with the caption slam on it;
  // boots to the door; sub-drop out of the doorway.
  // =====================================================================
  clunk(MASTER.atBike, 0.2)                                 // 34.8 grips the bars
  glitch(MASTER.hotwire, 0.1, 0.05)                         // 35.4 hotwire spark
  tick(MASTER.hotwire, 0.08, 5200)
  engineCatch(MASTER.engineCatch)                           // 35.5 sputter + rev
  engineGrind(MASTER.ride, MASTER.gateDive, 52, 0.055)      // grind 36.0 -> dies at 41.5 EXACT
  let ci = 0
  for (let t = MASTER.ride; t < MASTER.gateDive - 1e-9; t += CB / 2, ci++) {
    hat(t, 0.035, 0.03)
    if (R() < 0.3) tick(t, 0.02, 3400 + R() * 2600)         // metal flecks
  }
  for (const k of [2, 3, 4]) {
    const tb = b('chase', k)                                // bar downbeats on the ride
    taiko(tb, 0.5, 58)
    kick(tb, 0.3)
  }
  for (const k of [2, 3]) {
    const ts = b('chase', k)                                // gear-shift swells
    swell(ts, ts + CB * 1.5, 0.07)
    clunk(ts + CB * 1.5, 0.18)
  }
  gateRiser(MASTER.gateDive, GATE_D)                        // 41.50-41.75: the ONLY sound
  tick(MASTER.gateDive, 0.1, 6000)                          // sparks as he slides
  const GATE_RESUME = MASTER.gateDive + GATE_D              // 41.75
  clunk(GATE_RESUME, 0.25)                                  // hero lands
  whoosh(GATE_RESUME, 0.3, 0.15, 300, 2600)
  engineGrind(GATE_RESUME, MASTER.crash, 60, 0.05)          // grind resumes -> dies at 44.5
  let pi = 0
  for (let t = GATE_RESUME; t < MASTER.crash - 1e-9; t += CB / 2, pi++) {
    hat(t, 0.04, 0.025)
    if (pi % 2 === 0) kick(t, 0.26)                         // panic pulse to the crash
  }
  taiko(b('chase', 5), 0.55, 55)                            // bar 5, then the riser
  riser(b('chase', 5), MASTER.crash, 0.1)
  impact(MASTER.crash, 1.0, 42)                             // 44.50 CRASH
  taiko(MASTER.crash, 0.9, 50)
  sub(MASTER.crash, 0.5, 55, 22, 2.6)
  crash(MASTER.crash, 0.16)
  glass(MASTER.crash, 0.1, 1.6)                             // debris
  explosionRoar(MASTER.crash, CRASH_D)                      // roar blooms across the freeze
  fireBed(FIRE, T.foundry)                                  // 45.1 fire rumble -> the cut
  for (let t = FIRE + 0.2; t < MASTER.heroDoor; t += 0.14 + R() * 0.3)
    tick(t, 0.008 + R() * 0.02, 1500 + R() * 3500)          // fire crackle
  braam(MASTER.walkOut, SHN.concat([48]), 3.4, 0.34, 1.0)   // 46.0 COLOSSAL braam
  impact(MASTER.walkOut, 0.9, 45)
  taiko(MASTER.walkOut, 0.9, 52)
  sub(MASTER.walkOut, 0.4, 60, 25, 2.2)
  impact(MASTER.captionSlam, 0.45, 55)                      // 46.6 "I'LL BE BALD." ON the braam
  tick(MASTER.captionSlam, 0.1, 4000)
  for (let t = MASTER.captionSlam + CB * 2; t < MASTER.heroDoor - 1e-9; t += CB) {
    clunk(t, 0.1)                                           // heavy stride, quarters
    if (R() < 0.4) tick(t + CB * 0.5, 0.012, 1100 + R() * 400)
  }
  clunk(MASTER.heroDoor, 0.18)                              // 51.3 foundry side door
  hiss(MASTER.heroDoor, 0.25, 0.04)
  sub(MASTER.doorway, 0.35, 55, 22, CB * 2)                 // 51.85 sub-drop, cut

  // =====================================================================
  // S5 FOUNDRY 52-82 (96bpm C min, bar 2.5) — molten ambience; cold mono
  // pulse under the machine line; string swell under the hero line;
  // clang grid with the 62.0 anvil; SCANDAL STING 66.0; tuba-bonk 69.2;
  // CORE STAB 72.0 -> near-silence -> SPROUT 74.5 alone; major pre-echoes;
  // sink-crawl piano + sizzle; STEEL CLOSE flare 82.0.
  // =====================================================================
  moltenBed(T.foundry, MASTER.silence)                      // sub roar 52 -> dies at 73.6
  for (let t = T.foundry + 0.4; t < MASTER.silence - 0.2; t += 1.6 + R() * 2.4) {
    if (t > MASTER.hairGrab - 0.3 && t < MASTER.hairGrab + GRAB_D + 0.15) continue
    bell(t, 1900 + R() * 900, 0.02 + R() * 0.015, 0.35, 4.3, 3) // ladle clinks
  }
  for (let t = T.foundry + 0.2; t < MASTER.silence - 0.2; t += 0.5 + R() * 1.1) {
    if (t > MASTER.hairGrab - 0.3 && t < MASTER.hairGrab + GRAB_D + 0.15) continue
    tick(t, 0.008 + R() * 0.01, 4200 + R() * 3000)          // drifting sparks
  }
  clunk(MASTER.machineStep, 0.3)                            // 52.5 grating boot
  tick(MASTER.machineStep, 0.04, 1200)
  bell(MASTER.machineStep, 720, 0.03, 0.3, 6.1, 5)          // grate ring
  for (let t = F1.t0; t < F1.t1 - 1e-9; t += FB)
    blip(t, hz(48), 0.045, 0.11, 'square')                  // cold mono pulse under f1
  strings(MASTER.heroLine, [48, 51, 55, 58], F2.t1 - MASTER.heroLine, 0.05, 1.1, 0.9, 1800)
  riser(F2.t1 - FB * 1.6, F2.t1, 0.05)                      // duel wind-up
  tick(F2.t1, 0.1, 7200)                                    // 60.0 sword-draw shing
  tick(F2.t1 + FB * 0.12, 0.06, 8100)
  // --- clang grid: bars 4-7; CLASH 1 = bar 4 (62.0) anvil ---
  bell(MASTER.clash1, 1180, 0.14, 0.55, 5.4, 4)             // anvil FM clang
  clunk(MASTER.clash1, 0.45)
  impact(MASTER.clash1, 0.6, 60)
  glass(MASTER.clash1, 0.07, 1.0)
  for (let k = 0; k < 4; k++)
    tick(MASTER.clash1 + FB * (0.1 + k * 0.12), 0.05 - k * 0.008, 3600 + R() * 2400) // spark fan
  bell(b('foundry', 5), 1180, 0.09, 0.4, 5.2, 4)            // 64.5 grid clang
  clunk(b('foundry', 5), 0.18)
  let gi = 0
  for (let t = MASTER.clash1 + FB * 0.5; t < MASTER.hairGrab - 0.25; t += FB, gi++)
    tick(t, 0.02, 2600 + R() * 800)                         // beat ticks, STOP before the grab
  hiss(MASTER.pipeSever, 1.3, 0.09)                         // 63.4 steam blast
  sweepDown(MASTER.pipeSever, 0.5, 2400, 400, 0.05, 'sawtooth')
  clunk(MASTER.pipeSever, 0.15)
  // --- HAIR GRAB 66.00 (freeze 0.40): scandal sting ONLY ---
  scandalSine(MASTER.hairGrab, GRAB_D)
  heartbeat(MASTER.hairGrab, 0.5)
  heartbeat(MASTER.hairGrab + GRAB_D * 0.7, 0.38)
  for (let k = 0; k < 3; k++) {
    const t = MASTER.hairGrab + GRAB_D + FB * (0.2 + k * 0.9) // struggle scuffs
    clunk(t, 0.06 + R() * 0.04)
    tick(t + FB * 0.1, 0.015, 2200 + R() * 1200)
  }
  bell(b('foundry', 6), 1180, 0.06, 0.3, 5.2, 4)            // 67.0 pressed blade, light
  tubaBonk(MASTER.headbutt)                                 // 69.2 comedic bonk
  clunk(MASTER.headbutt, 0.4)                               // clonk
  tick(MASTER.headbutt, 0.1, 700)
  tick(FLOURISH, 0.07, 6800)                                // 70.0 sword flourish
  tick(FLOURISH + FB * 0.1, 0.06, 7600)
  tick(FLOURISH + FB * 0.2, 0.05, 8400)
  bell(b('foundry', 7), 1180, 0.05, 0.3, 5.2, 4)            // 69.5 light grid clang
  // --- CORE STAB 72.00 (biggest freeze) -> near-silence ---
  impact(MASTER.coreStab, 1.0, 40)
  taiko(MASTER.coreStab, 1.0, 48)
  sub(MASTER.coreStab, 0.45, 50, 20, 2.4)
  braam(MASTER.coreStab, [36, 37], 1.1, 0.22, 0.5)          // short dark groan
  sweepDown(MASTER.coreStab + CLOCK.foundry.stops[2].d * 0.15, 0.45, 800, 60, 0.07, 'sawtooth')
  clunk(MASTER.kneel, 0.35)                                 // 72.6 kneel
  sub(MASTER.kneel, 0.2, 45, 25, 1.0)
  for (const [i, k] of [[0, 0.13], [1, 0.6], [2, 0.95], [3, 1.18]]) {
    blip(MASTER.silence + FB * k, 320 - i * 40, 0.028, 0.06, 'square') // core gutter, dying
  }
  // --- SPROUT 74.50 (bar 9): 3 bell notes, ALONE ---
  for (const [i, m] of SPROUTN.entries())
    bell(MASTER.sprout + i * (FB / 3), hz(m), 0.085, 1.6, 3.5, 3) // G5-B5-D6 triplet
  bell(MASTER.touch, hz(91), 0.03, 0.8, 3.2, 2)             // 75.6 it touches the strand
  pad(REFLECT, [48, 52, 55, 60], 2.0, 0.03, 850, 1.3)       // 75.5 FIRST MAJOR lean: C major
  blip(MASTER.eyeWarm, 523, 0.035, 0.25, 'sine')            // 77.8 red -> amber pulse
  blip(MASTER.eyeWarm + FB * 0.4, 659, 0.03, 0.25, 'sine')
  piano(MASTER.iknow, 48, 0.1, 2.2)                         // 78.4 single warm chord (C major)
  piano(MASTER.iknow, 55, 0.08, 2.2)
  piano(MASTER.iknow, 64, 0.07, 2.2)
  strings(MASTER.iknow, [60, 64, 67], 1.8, 0.035, 0.5, 0.6, 2200)
  clunk(MASTER.hook, 0.2)                                   // 80.2 chain-hoist hook
  tick(MASTER.hook, 0.03, 1800)
  // --- sink crawl 80.5-82.0: FLOW fragments on solo piano + sizzle ---
  sizzle(MASTER.sinkStart, MASTER.steelClose, 0.055)
  piano(MASTER.sinkStart + FB * 0.16, 72, 0.07, 1.0)
  piano(MASTER.thumbsUp, 76, 0.07, 1.0)                     // 81.0 thumbs-up ON a fragment
  tick(MASTER.thumbsUp, 0.02, 2500)
  piano(MASTER.sinkStart + FB * 1.44, 79, 0.06, 0.8)
  piano(MASTER.sinkStart + FB * 2.0, 84, 0.05, 0.9)
  sweepDown(MASTER.eyeDim, 0.3, 500, 320, 0.02, 'sine')     // 81.5 eye dims to warm white
  bell(MASTER.strandOff, hz(88), 0.03, 0.7, 3.0, 2)         // 81.6 strand drifts up
  bell(MASTER.strandOff + FB * 0.29, hz(93), 0.025, 0.8, 3.0, 2)
  impact(MASTER.steelClose, 0.9, 38)                        // 82.0 STEEL CLOSE flare
  taiko(MASTER.steelClose, 0.7, 45)
  crash(MASTER.steelClose, 0.13)
  sub(MASTER.steelClose, 0.4, 45, 20, 1.6)
  glass(MASTER.steelClose, 0.08, 1.5)                       // molten flare sparkle
  bell(MASTER.steelClose, 3200, 0.05, 1.0, 4.0, 3)

  // =====================================================================
  // S6 EPILOGUE 82-92 (72bpm C MAJOR — the mode flip ON the 82.0 cut) —
  // FLOW in full over dawn strings + soft piano; birdsong 83-86; plant
  // chime 85.5; harp arpeggios accelerating 86.5-89.5; wind swell 90-92.
  // No bass, no percussion, nothing below the theme.
  // =====================================================================
  strings(MASTER.dawn, [48, 52, 55, 60], 6.5, 0.05, 1.6, 1.4, 2400) // C major dawn bloom
  pad(MASTER.dawn, [36, 48], 8.0, 0.022, 600, 2.5)          // warm low bed
  const FLOW_T = [0, 1, 2, 3, 4].map((i) => MASTER.dawn + i * EB)
  for (const [i, m] of FLOWN.entries()) {
    const t = FLOW_T[i]
    const held = i === 4
    strings(t, [m + 12], held ? 2.6 : 1.2, 0.05, held ? 0.4 : 0.15, held ? 0.9 : 0.5, 3000)
    piano(t, m, held ? 0.05 : 0.06, held ? 2.2 : 1.4)       // piano doubles below
  }
  choir(FLOW_T[4], [60, 64, 67], 2.8, 0.028, 'o', 0.8, 1.0) // warm bloom under the hold
  bell(MASTER.strandSettles, hz(84), 0.03, 1.0, 3.0, 2)     // 83.0 the strand settles
  for (let k = 0; k < 6; k++) {
    const t = MASTER.strandSettles + 0.2 + R() * 2.4        // birdsong 83-86
    chirp(t, 2600 + R() * 700, k % 2 ? 0.5 : -0.5)
  }
  bell(MASTER.plant, hz(79), 0.05, 1.6, 3.5, 3)             // 85.5 plant chime (SPROUT echo)
  glass(MASTER.plant, 0.02, 0.5)
  const ARP = [60, 64, 67, 72, 76, 79]                      // harp: accelerating C-major run
  for (let t = MASTER.timelapseStart, i = 0; t < MASTER.timelapseEnd - 1e-9; i++) {
    pluck(t, ARP[i % 6], 0.045, 4600, 0.5, 'triangle')
    t += 0.3 - (t - MASTER.timelapseStart) * 0.055
  }
  strings(MASTER.timelapseEnd - 0.8, [48, 55, 60, 64], 2.6, 0.035, 0.8, 0.5, 2200) // I hold
  wind(MASTER.windSwell, T.endcard, 0.05, 300, 900)         // 90-92 morning wind
  swell(MASTER.windSwell, MASTER.windSwell + EB * 2, 0.04)

  // =====================================================================
  // S7 ENDCARD 92-100 (120bpm C major, bar 2.0) — hymn I-V-I over bars
  // 0-3; CARD SLAM 94.0 (bar 1) soft gong; final I at 98.0 with every
  // envelope written to finish by 99.4, so the shared IR (reverb 1.4)
  // is dead before 100.0. Intentional ending.
  // =====================================================================
  const CH_I = [48, 55, 60, 64]
  const CH_V = [43, 50, 55, 59]
  choir(b('endcard', 0), CH_I, 1.9, 0.042, 'a', 0.25, 0.35) // 92.0 I
  strings(b('endcard', 0), CH_I.concat([67]), 1.9, 0.038, 0.3, 0.4, 2400)
  piano(b('endcard', 0), 36, 0.09, 2.0)
  crash(MASTER.cardSlam, 0.08)                              // 94.0 soft gong on the V
  bell(MASTER.cardSlam, hz(43), 0.07, 3.0, 2.4, 2)
  impact(MASTER.cardSlam, 0.35, 45)
  choir(MASTER.cardSlam, CH_V, 1.9, 0.04, 'o', 0.25, 0.35)
  strings(MASTER.cardSlam, CH_V.concat([62]), 1.9, 0.034, 0.3, 0.4, 2200)
  piano(MASTER.cardSlam, 43, 0.07, 1.8)
  choir(b('endcard', 2), CH_I, 1.9, 0.042, 'a', 0.25, 0.35) // 96.0 I
  strings(b('endcard', 2), CH_I.concat([67]), 1.9, 0.038, 0.3, 0.4, 2400)
  piano(b('endcard', 2), 48, 0.06, 1.8)
  choir(b('endcard', 3), CH_I.concat([67]), 1.2, 0.04, 'a', 0.12, 0.2)  // 98.0 final I -> 99.4
  strings(b('endcard', 3), [48, 55, 60, 64, 67, 72], 1.1, 0.032, 0.12, 0.3, 2600)
  piano(b('endcard', 3), 48, 0.06, 1.2)
  piano(b('endcard', 3), 64, 0.04, 1.1)
  bell(b('endcard', 3), hz(84), 0.02, 1.2, 3.0, 2)          // last cue start; ring done ~99.2
}
