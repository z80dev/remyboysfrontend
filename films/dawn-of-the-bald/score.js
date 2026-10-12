// DAWN OF THE BALD — original score. Romero siege parody; every note original (the
// descending D-minor tetrachord LAMENT is ancient dirge grammar — the intervals are not
// Goblin, not Argento, not Carpenter, not anyone's). All cue times come from
// ./timeline.js via filmT(g) — nothing here re-types a timeline time by hand. Grid loops
// are generated in WORLD g on the 150 BPM spine and mapped through the shared filmT, so
// both hit-stops retime score and picture together (raiders gallop lineage).
//
// ============================ MOTIF PLAN (all original) ============================
//   LAMENT  (trumpet) A4-G4-F4-E4-D4 = [69,67,65,64,62] — a pure descending D-minor
//           tetrachord with a 2nd-to-tonic sigh tail. Stated COMPLETE exactly ONCE, dry,
//           under the title card (EV_TITLE.in). Fragments elsewhere (never the whole
//           chain): S1 broadcast [69,67] then lone [65]; S2 felt-piano shards [69,65],
//           [62], [64,62]; S6 it returns and RESOLVES: ...F4-E4 held, then the third
//           flips F->F# over 92.0-93.0 g (pad Dm->D at swayMass) and the line lands UP
//           on D5 at EV_S6.board. D minor -> D MAJOR, sunrise.
//   MUZAK   the PA gag. ONE shared 8-bar note table (below), C major, I-vi-ii-V, sine
//           lead + felt-piano chords + brushed hats + woodblock. Tune shape: phrase A
//           arches E-G-E-C-D-E up to A5-F5 and settles on the dominant's B4; phrase B
//           re-routes through a C6 peak and resolves E-D-C back home — an original,
//           hummable lounge loop, NO real muzak/elevator piece quoted.
//           States (timeline MUZAK machine): CHEER 47.7 (band-limited LP ~3.2 kHz +
//           0.3 Hz wow, deadpan) -> record-STOP at cut 59.0 (tape dive ~0.38 s) ->
//           silence/drone -> CREEP 66.5 (same table, -2 st, 0.85x rate, hollow ~900 Hz
//           bandpass, choked by the breach freeze) -> FULL 73.1 (cheery again, front of
//           mix, the signature image: bald horde shuffling through a lit mall to muzak)
//           -> UNDER 80.0 (ducked under the hallway line) -> solo WOODBLOCK at turn
//           81.6 (gated silent across hesitate 82.8) -> tail warble out at fade 85.9.
//           One tender ECHO bar (solo sine) sings at away 94.7 — the mall from memory.
//   DREAD   drone root D (MIDI 38) + slow tritone partner Ab (44): S1 broadcast bed, a
//           faint tritone pad under the CHEER muzak, the dusk moan cluster [38,41],
//           S3 rise stingers [50,56]. Used sparingly — the muzak carries S4/S5.
//   STRAND  shiver: high glassy sine cluster w/ fast tremolo — hair letting go (S2 shed,
//           big return at S5 turn).
//
// ============================ TEMPO SPINE / GRID ===================================
// 150 BPM: BEAT 0.4 s, BAR 1.6 s, anchored at film 0 (= g 0). The grid lives in WORLD g
// and every grid cue maps through filmT, so the hit-stops fold it with picture. The S5
// hallway strikes (g 76.8/78.4/80.0) are bars 48/49/50 EXACTLY (asserted); the mercy
// buzz plugs in ON beat 209 (g 83.6, asserted) and chugs at the beat rate (2.5 Hz AM =
// in tempo); S2 boards ride beats 50/53/56. The muzak PA keeps its own diegetic clock
// (beat 0.42 s, anchored at each state's table time) — a mall PA does not follow the
// score's click; the sword percussion supplies the tempo agreement at the strikes.
//
// ============================ HIT-STOPS ============================================
// PIN = filmT(STOP.g) (impact lands AT freeze start — equality rule), REL = PIN + d.
// No cue STARTS inside (PIN, REL) — filmT skips the window by construction; the
// self-check asserts it over the cue registry. STOP1 tackle (41.2->41.36 film): impact
// at PIN1, cymbal CHOKE whose envelope is cut exactly at REL1, groove resume pickup
// exactly at REL1. STOP2 breach (72.0->72.38 film): biggest impact of the film at PIN2,
// glass crunch THROUGH the freeze, choke cut at REL2; the CREEP muzak is truncated at
// the breach g and its bus is choked at PIN2 (the world freezes, the PA freezes with it).
//
// ============================ LOUDNESS PLAN ========================================
//   tier 1 beds (drones/winds/static/fluoro/crowd)   g 0.011-0.055
//   tier 2 ostinati (pulse/heartbeat/gallop/muzak accomp) g 0.02-0.08
//   tier 3 leads (trumpet/muzak lead/piano/stingers) g 0.045-0.14
//   tier 4 pins (title, both stops, doorSlam)        impact <= 0.5, sub <= 0.35, choke 0.18
// Sections: S1 ~bed-led hush, TITLE stark hit, S2 dawn sparse, S3 drive, S4 muzak-led,
// S5 loudest (siege), S6 warm resolve — each neighbors within ~6 LU; the hesitate beat
// (82.8) is the one scored hole (a single heartbeat) and the quarantine lull rides its
// drone so neither reads as dropout. Tails: last dry audio ends ~99.3, nothing re-rings
// past ~99.5 (asserted), well short of 100.0.
import {
  DURATION,
  EV_S1,
  EV_S2,
  EV_S3,
  EV_S4,
  EV_S5,
  EV_S6,
  EV_TITLE,
  MUZAK,
  SHOTS,
  STOP1_G,
  STOP2_G,
  STOPS,
  filmT,
} from './timeline.js'

export const AUDIO_SUGGEST = { seed: 4242, reverb: 2.6, reverbShape: 3.0, reverbGain: 0.5, lufs: -14 }

// ---------- shared motif/grid tables (pure, top-level) ----------
const LAMENT = [69, 67, 65, 64, 62] // complete statement — title card only
const DREAD = [38, 44] // D + tritone partner Ab
// MUZAK: 8 bars, 4 beats/bar, I-vi-ii-V x2 (C Am Dm G | C Am Dm G). [beat, midi, durBeats]
const MZ_BEAT = 0.42 // diegetic PA quarter
const MZ_MEL = [
  // phrase A — arch up, settle on the leading tone
  [0, 76, 0.5], [0.5, 79, 0.5], [1, 76, 0.5], [1.5, 72, 0.5], [2, 74, 1], [3, 76, 1],
  [4, 69, 0.5], [4.5, 72, 0.5], [5, 76, 1], [6, 72, 1],
  [8, 74, 0.5], [8.5, 77, 0.5], [9, 81, 1], [10, 77, 1],
  [12, 79, 0.5], [12.5, 77, 0.5], [13, 74, 1], [14, 71, 2],
  // phrase B — C6 peak, resolve home
  [16, 76, 0.5], [16.5, 79, 0.5], [17, 84, 0.5], [17.5, 79, 0.5], [18, 76, 1], [19, 72, 1],
  [20, 81, 1], [21, 79, 0.5], [21.5, 76, 0.5], [22, 72, 1.5],
  [23.5, 74, 0.5], [24, 77, 0.5], [24.5, 81, 0.5], [25, 79, 1], [26, 77, 1],
  [28, 76, 0.5], [28.5, 74, 0.5], [29, 72, 2],
]
const MZ_CHORDS = [
  [48, 55, 64], [45, 52, 60], [50, 57, 65], [43, 50, 59], // C Am Dm G
  [48, 55, 64], [45, 52, 60], [50, 57, 65], [43, 50, 59], // C Am Dm G
]
// state configs: rate (speed factor), tp (transpose st), filter, gain scale, extras
const MZ_CONF = {
  cheer: { rate: 1, tp: 0, lp: 3200, hp: 170, g: 1, send: 0.16, hats: 0.01, block: 0.02 },
  creep: { rate: 0.85, tp: -2, bp: 900, q: 1.1, g: 0.85, send: 0.3, hats: 0, block: 0.014 },
  full: { rate: 1, tp: 0, lp: 3400, hp: 150, g: 1.3, send: 0.2, hats: 0.012, block: 0.024 },
  under: { rate: 1, tp: 0, lp: 3000, hp: 200, g: 0.42, send: 0.2, hats: 0.006, block: 0.012 },
  wood: { rate: 1, tp: 0, lp: 3000, hp: 220, g: 0.5, send: 0.22, hats: 0, block: 0.016 },
}

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit
  const EPS = 1e-6
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x))

  // ---------- clock: pins (freeze starts) and rels (releases), all via filmT ----------
  const PIN1 = filmT(STOP1_G) // 41.2 — equality rule: the tackle impact lands here
  const REL1 = PIN1 + STOPS[0].d // 41.36 — choke cut + groove resume
  const PIN2 = filmT(STOP2_G) // 72.16 — the breach lands here
  const REL2 = PIN2 + STOPS[1].d // 72.38 — choke cut

  // ---------- 150 BPM spine (world g; mapped through filmT) ----------
  const BEAT = 0.4
  const BAR = 4 * BEAT // 1.6 s

  // ---------- registries for the self-check ----------
  const CUES = [] // { t, g?, tag } — every scheduled start
  const RUNS = [] // muzak state runs { mode, g0, g1, t0 }
  const TAILS = [] // { end, tag } — known audio tail ends in the final section
  const AT = (g, tag) => { const t = filmT(g); CUES.push({ t, g, tag }); return t } // EV-anchored
  const GF = (g, tag) => { const t = filmT(g); CUES.push({ t, g, tag }); return t } // grid/free g
  const FT = (t, tag) => { CUES.push({ t, tag }); return t } // film-domain (post-freeze math)
  const shotT = (name) => SHOTS.find((s) => s.name === name).t0
  const END1 = shotT('title.ridge') // film time where the broadcast dies into the title

  // ============================ custom voices ========================================
  // (composite ones build raw osc->gain->filter nodes inside ONE at() each; no kit
  // instrument is ever called inside an at() callback; every envelope starts from 0
  // with a linear fade-in and ends through 0.0001 -> 0, so no clicks.)

  // trumpet: detuned saw pair + octave square, bloom lowpass, gentle vibrato — the LAMENT voice
  const trumpet = (t, m, dur, { g = 0.09, atk = 0.035, send = 0.2, pan = 0, vib = 3.6 } = {}) =>
    at(t, () => {
      const f = hz(m)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(Math.min(1300, f * 2.5), t)
      lp.frequency.linearRampToValueAtTime(Math.min(4300, f * 7), t + Math.min(0.25, dur * 0.4))
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + atk)
      a.gain.setValueAtTime(g * 0.9, t + Math.max(atk + 0.05, dur - 0.12))
      a.gain.linearRampToValueAtTime(0.0001, t + dur)
      a.gain.linearRampToValueAtTime(0, t + dur + 0.02)
      const o1 = osc('sawtooth', f, t, dur + 0.03)
      const o2 = osc('sawtooth', f, t, dur + 0.03)
      o2.detune.value = 7
      const o3 = osc('square', f * 2, t, dur + 0.03)
      const g3 = ac.createGain()
      g3.gain.value = 0.12
      o1.connect(lp)
      o2.connect(lp)
      o3.connect(g3).connect(lp)
      lp.connect(a)
      if (vib) {
        const l = osc('sine', vib, t, dur + 0.03)
        const lg = ac.createGain()
        lg.gain.value = f * 0.006
        l.connect(lg)
        lg.connect(o1.detune)
        lg.connect(o2.detune)
      }
      out(a, 1, send, clamp(pan, -0.8, 0.8))
    })

  // strand shiver: high glassy sine cluster + fast tremolo — hair letting go
  const shiver = (t, { g = 0.03, dur = 0.8 } = {}) =>
    at(t, () => {
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.08)
      a.gain.setValueAtTime(g * 0.6, t + dur * 0.6)
      a.gain.linearRampToValueAtTime(0.0001, t + dur)
      a.gain.linearRampToValueAtTime(0, t + dur + 0.02)
      const tr = osc('sine', 23, t, dur)
      const tg = ac.createGain()
      tg.gain.value = g * 0.8
      tr.connect(tg).connect(a.gain)
      for (const [m, k] of [[98, 1], [100, 0.5], [103, 0.35], [86, 0.6]]) {
        const o = osc('sine', hz(m), t, dur)
        const og = ac.createGain()
        og.gain.value = k
        o.connect(og).connect(a)
      }
      out(a, 1, 0.25, -0.2)
    })

  // slow pulse: soft sub thump (the map-cut heartbeat of the broadcast)
  const pulse = (t, { g = 0.05 } = {}) =>
    at(t, () => {
      const o = osc('sine', 64, t, 0.42)
      o.frequency.exponentialRampToValueAtTime(40, t + 0.36)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.02)
      a.gain.exponentialRampToValueAtTime(0.0001, t + 0.42)
      o.connect(a)
      out(a, 1, 0.08)
    })

  // nail board hit: dry thock + nail squeak (S2 boards)
  const boardHit = (t) =>
    at(t, () => {
      const o = osc('sine', 210, t, 0.09)
      o.frequency.exponentialRampToValueAtTime(120, t + 0.06)
      const a = ac.createGain()
      a.gain.setValueAtTime(0.0001, t)
      a.gain.linearRampToValueAtTime(0.13, t + 0.004)
      a.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
      o.connect(a)
      out(a, 1, 0.05, 0.2)
      const n = noise(t, 0.05)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 500
      const ng = ac.createGain()
      ng.gain.setValueAtTime(0.0001, t)
      ng.gain.linearRampToValueAtTime(0.08, t + 0.003)
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
      n.connect(lp).connect(ng)
      out(ng, 1, 0.06, 0.2)
      const s = osc('sawtooth', 2600, t + 0.02, 0.07)
      s.frequency.exponentialRampToValueAtTime(2100, t + 0.08)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 2400
      bp.Q.value = 6
      const sg = ac.createGain()
      sg.gain.setValueAtTime(0.0001, t + 0.02)
      sg.gain.linearRampToValueAtTime(0.028, t + 0.035)
      sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.085)
      s.connect(bp).connect(sg)
      out(sg, 1, 0.12, 0.25)
    })

  // cymbal choke: swell HARD-CUT at tCut (the freeze release)
  const cymbalChoke = (t, tCut, { g = 0.16 } = {}) => {
    FT(t, 'choke')
    at(t, () => {
      const n = noise(t, tCut - t + 0.03)
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
  }

  // the risen: tritone-bite stinger (D against Ab) + sub drop
  const stinger = (t, { g = 0.08 } = {}) =>
    at(t, () => {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(2600, t)
      lp.frequency.exponentialRampToValueAtTime(700, t + 0.4)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.015)
      a.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
      for (const [m, det] of [[50, -6], [56, 6]]) {
        const o = osc('sawtooth', hz(m), t, 0.46)
        o.detune.value = det
        o.connect(lp)
      }
      lp.connect(a)
      out(a, 1, 0.25, -0.1)
      const s = osc('sine', 60, t, 0.5)
      s.frequency.exponentialRampToValueAtTime(34, t + 0.44)
      const sg = ac.createGain()
      sg.gain.setValueAtTime(0.0001, t)
      sg.gain.linearRampToValueAtTime(g * 2.2, t + 0.012)
      sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
      s.connect(sg)
      out(sg, 1, 0.1)
    })

  // garage grind: detuned low saws + rattling noise through a roaming bandpass
  const grind = (t0, t1, { g = 0.05 } = {}) =>
    at(t0, () => {
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(300, t0)
      bp.frequency.linearRampToValueAtTime(900, t1)
      bp.Q.value = 1.4
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + 0.06)
      a.gain.setValueAtTime(g, t1 - 0.1)
      a.gain.linearRampToValueAtTime(0.0001, t1)
      a.gain.linearRampToValueAtTime(0, t1 + 0.02)
      for (const det of [0, 11]) {
        const o = osc('sawtooth', 52, t0, t1 - t0 + 0.02)
        o.detune.value = det
        o.connect(bp)
      }
      const n = noise(t0, t1 - t0 + 0.02)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 800
      const ng = ac.createGain()
      ng.gain.setValueAtTime(0.0001, t0)
      ng.gain.linearRampToValueAtTime(g * 0.5, t0 + 0.06)
      ng.gain.linearRampToValueAtTime(0.0001, t1)
      n.connect(lp).connect(ng)
      bp.connect(a)
      out(a, 1, 0.14, 0.15)
      out(ng, 1, 0.1, -0.1)
    })

  // tape slur: the broadcast audio pitching down and dying (S1 degrade)
  const tapeSlur = (t, dur = 1.3, { g = 0.04 } = {}) =>
    at(t, () => {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(900, t)
      lp.frequency.exponentialRampToValueAtTime(240, t + dur)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.1)
      a.gain.setValueAtTime(g * 0.8, t + dur * 0.7)
      a.gain.linearRampToValueAtTime(0.0001, t + dur)
      a.gain.linearRampToValueAtTime(0, t + dur + 0.02)
      for (const det of [0, 9]) {
        const o = osc('sawtooth', 196, t, dur + 0.02)
        o.detune.value = det
        o.frequency.exponentialRampToValueAtTime(62, t + dur)
        o.connect(lp)
      }
      const w = osc('sine', 6.2, t, dur)
      const wg = ac.createGain()
      wg.gain.value = 26
      w.connect(wg).connect(lp.frequency) // wow: the signal is coming apart
      lp.connect(a)
      out(a, 1, 0.2)
    })

  // record stop: the PA chord dives as the muzak is killed at the reveal
  const recordStop = (t, { g = 0.05, dur = 0.38 } = {}) =>
    at(t, () => {
      const a = ac.createGain()
      a.gain.setValueAtTime(0.0001, t)
      a.gain.linearRampToValueAtTime(g, t + 0.012)
      a.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      a.gain.linearRampToValueAtTime(0, t + dur + 0.02)
      for (const m of [72, 76, 79]) {
        const o = osc('sawtooth', hz(m), t, dur + 0.02)
        o.frequency.exponentialRampToValueAtTime(hz(m) * 0.22, t + dur * 0.95) // tape dive
        o.connect(a)
      }
      const n = noise(t, dur)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 1200
      bp.Q.value = 2
      const ng = ac.createGain()
      ng.gain.setValueAtTime(0.0001, t)
      ng.gain.linearRampToValueAtTime(g * 0.35, t + 0.02)
      ng.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      n.connect(bp).connect(ng)
      out(a, 1, 0.2)
      out(ng, 1, 0.15)
    })

  // muzak tail warble out (doorSlam): one last PA phrase dying in the machine
  const warbleOut = (t, { g = 0.03, dur = 0.3 } = {}) =>
    at(t, () => {
      const a = ac.createGain()
      a.gain.setValueAtTime(0.0001, t)
      a.gain.linearRampToValueAtTime(g, t + 0.01)
      a.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      a.gain.linearRampToValueAtTime(0, t + dur + 0.02)
      for (const m of [76, 74, 72]) {
        const o = osc('sine', hz(m) * (1 + 0.004), t, dur + 0.02)
        o.frequency.exponentialRampToValueAtTime(hz(m) * 0.3, t + dur)
        o.connect(a)
      }
      out(a, 1, 0.18)
    })

  // TV static bed: bandpassed noise; crackle ticks are scheduled OUTSIDE the callback
  const staticBed = (t0, t1, { g = 0.05, crackle = 0 } = {}) => {
    at(t0, () => {
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 1500
      bp.Q.value = 0.5
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + 0.02)
      a.gain.setValueAtTime(g, t1 - 0.02)
      a.gain.linearRampToValueAtTime(0.0001, t1)
      a.gain.linearRampToValueAtTime(0, t1 + 0.01)
      const n = noise(t0, t1 - t0 + 0.05)
      n.connect(bp).connect(a)
      out(a, 1, 0.12)
    })
    for (let i = 0; i < crackle; i++) {
      const tt = t0 + ((i * 1.387) % (t1 - t0))
      kit.tick(tt, 0.012 + (0.008 * ((i * 7) % 3)) / 2, 2600 + ((i * 331) % 1400))
    }
  }

  // fluoro hum: the barbershop's nervous lighting (dies at the gust)
  const fluoro = (t0, t1, { g = 0.012 } = {}) =>
    at(t0, () => {
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 2100
      bp.Q.value = 4
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + 0.3)
      a.gain.setValueAtTime(g, t1)
      a.gain.linearRampToValueAtTime(0.0001, t1 + 0.15)
      a.gain.linearRampToValueAtTime(0, t1 + 0.2)
      for (const f of [120, 240]) {
        const o = osc('sawtooth', f, t0, t1 - t0 + 0.25)
        o.connect(bp)
      }
      bp.connect(a)
      out(a, 1, 0.08, 0.1)
    })

  // wood creak (chair / floorboard): slow saw slide through a soft lowpass
  const creak = (t, { g = 0.035, dur = 0.7, f0 = 215, f1 = 138 } = {}) =>
    at(t, () => {
      const o = osc('sawtooth', f0, t, dur)
      o.frequency.exponentialRampToValueAtTime(f1, t + dur)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 520
      lp.Q.value = 2
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + dur * 0.4)
      a.gain.linearRampToValueAtTime(0.0001, t + dur)
      a.gain.linearRampToValueAtTime(0, t + dur + 0.02)
      o.connect(lp).connect(a)
      out(a, 1, 0.3, 0.1)
    })

  // palm on glass: muffled donk + a sheen of glass shimmer
  const palmGlass = (t, { g = 0.09 } = {}) =>
    at(t, () => {
      const o = osc('sine', 170, t, 0.14)
      o.frequency.exponentialRampToValueAtTime(110, t + 0.1)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 600
      const a = ac.createGain()
      a.gain.setValueAtTime(0.0001, t)
      a.gain.linearRampToValueAtTime(g, t + 0.006)
      a.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
      o.connect(lp).connect(a)
      out(a, 1, 0.12)
      const n = noise(t, 0.09)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 3500
      bp.Q.value = 8
      const ng = ac.createGain()
      ng.gain.setValueAtTime(0.0001, t)
      ng.gain.linearRampToValueAtTime(g * 0.18, t + 0.008)
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
      n.connect(bp).connect(ng)
      out(ng, 1, 0.3)
    })

  // glass crack + spokes: burst + descending splinter ticks (spider web)
  const crack = (t, spokes = 4, { g = 0.08 } = {}) => {
    at(t, () => {
      const n = noise(t, 0.04)
      const hp = ac.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 1800
      const a = ac.createGain()
      a.gain.setValueAtTime(0.0001, t)
      a.gain.linearRampToValueAtTime(g, t + 0.004)
      a.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
      n.connect(hp).connect(a)
      out(a, 1, 0.25)
      const o = osc('sine', 300, t, 0.1)
      o.frequency.exponentialRampToValueAtTime(120, t + 0.08)
      const og = ac.createGain()
      og.gain.setValueAtTime(0.0001, t)
      og.gain.linearRampToValueAtTime(g * 0.7, t + 0.005)
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
      o.connect(og)
      out(og, 1, 0.1)
    })
    for (let i = 0; i < spokes; i++)
      kit.tick(t + 0.03 + i * 0.05, 0.03 + 0.01 * (1 - i / spokes), 3400 - i * 260) // spokes
  }

  // body drop: soft thud + low settle (sword strike aftermath)
  const bodyDrop = (t, { g = 0.09 } = {}) =>
    at(t, () => {
      const n = noise(t, 0.14)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 300
      const a = ac.createGain()
      a.gain.setValueAtTime(0.0001, t)
      a.gain.linearRampToValueAtTime(g, t + 0.008)
      a.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
      n.connect(lp).connect(a)
      out(a, 1, 0.1)
      const o = osc('sine', 150, t + 0.02, 0.2)
      o.frequency.exponentialRampToValueAtTime(85, t + 0.16)
      const og = ac.createGain()
      og.gain.setValueAtTime(0.0001, t + 0.02)
      og.gain.linearRampToValueAtTime(g * 0.8, t + 0.04)
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
      o.connect(og)
      out(og, 1, 0.08)
    })

  // MERCY BUZZ: clippers. Saw ~55 Hz pair AM-chugged at the beat rate (2.5 Hz = in
  // tempo), noise hiss sidechained to the same envelope; pass 2 brightens; ends CLEAN.
  const clipperBuzz = (tPlug, tPass2, tEnd, { g = 0.085 } = {}) =>
    at(tPlug, () => {
      const dur = tEnd - tPlug
      const shape = ac.createGain() // overall plug/hold/end envelope (x the AM)
      shape.gain.setValueAtTime(0.0001, tPlug)
      shape.gain.linearRampToValueAtTime(1, tPlug + 0.25) // hum UP to speed
      shape.gain.setValueAtTime(1, tEnd - 0.03)
      shape.gain.linearRampToValueAtTime(0.0001, tEnd) // clean stop
      shape.gain.linearRampToValueAtTime(0, tEnd + 0.02)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(700, tPlug)
      lp.frequency.linearRampToValueAtTime(1400, tPass2) // pass 2: across the crown
      lp.frequency.linearRampToValueAtTime(900, tEnd)
      const a = ac.createGain()
      a.gain.value = g
      const am = osc('square', 2.5, tPlug, dur + 0.05) // 2.5 Hz = the 150 BPM beat
      const amg = ac.createGain()
      amg.gain.value = g * 0.45
      am.connect(amg).connect(a.gain) // chug
      for (const det of [0, 12]) {
        const o = osc('sawtooth', 55, tPlug, dur + 0.05)
        o.detune.value = det
        o.connect(lp)
      }
      lp.connect(a).connect(shape)
      const n = noise(tPlug, dur + 0.05)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 3000
      bp.Q.value = 1.5
      const ng = ac.createGain()
      ng.gain.value = g * 0.35
      n.connect(bp).connect(ng).connect(shape) // hiss rides the same envelope
      out(shape, 1, 0.12, 0.05)
      TAILS.push({ end: tEnd + 0.03, tag: 'buzz' })
    })

  // FLOW 6: rotor thump series (off-screen approach)
  const rotorThump = (t, { g = 0.06 } = {}) =>
    at(t, () => {
      const o = osc('sine', 58, t, 0.3)
      o.frequency.exponentialRampToValueAtTime(44, t + 0.24)
      const a = ac.createGain()
      a.gain.setValueAtTime(0.0001, t)
      a.gain.linearRampToValueAtTime(g, t + 0.01)
      a.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
      o.connect(a)
      out(a, 1, 0.15)
    })

  // chopper bed: 11 Hz AM thump + turbine whine + light lance, tasteful, ducked
  const chopper = (t0, t1, { g = 0.045 } = {}) =>
    at(t0, () => {
      const dur = t1 - t0
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + 0.6)
      a.gain.setValueAtTime(g, t1 - 0.5)
      a.gain.linearRampToValueAtTime(0.0001, t1)
      a.gain.linearRampToValueAtTime(0, t1 + 0.05)
      const o = osc('sine', 54, t0, dur)
      const am = osc('sine', 11, t0, dur)
      const amg = ac.createGain()
      amg.gain.value = g * 0.7
      am.connect(amg).connect(a.gain)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 300
      o.connect(lp).connect(a)
      const n = noise(t0, dur)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 1900
      bp.Q.value = 3
      const ng = ac.createGain()
      ng.gain.setValueAtTime(0.0001, t0)
      ng.gain.linearRampToValueAtTime(g * 0.3, t0 + 1.2) // turbine spools up
      ng.gain.setValueAtTime(g * 0.3, t1 - 0.4)
      ng.gain.linearRampToValueAtTime(0.0001, t1)
      n.connect(bp).connect(ng)
      out(a, 1, 0.12)
      out(ng, 1, 0.15, 0.2)
      TAILS.push({ end: t1 + 0.06, tag: 'chopper' })
    })

  // warm end stab (end card): soft major brass chord — brief, then gone
  const warmStab = (t, notes, { g = 0.11, dur = 0.7 } = {}) =>
    at(t, () => {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(600, t)
      lp.frequency.linearRampToValueAtTime(2100, t + 0.09)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.02)
      a.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      a.gain.linearRampToValueAtTime(0, t + dur + 0.02)
      for (const m of notes)
        for (const det of [-6, 6]) {
          const o = osc('sawtooth', hz(m), t, dur + 0.02)
          o.detune.value = det
          o.connect(lp)
        }
      lp.connect(a)
      out(a, 1, 0.15)
      TAILS.push({ end: t + dur + 0.03, tag: 'endStab' })
    })

  // ============================ A. S1 — THE BROADCAST (g 0-13.5) =====================
  staticBed(0, AT(EV_S1.tvOn, 'staticLock'), { g: 0.05 }) // full static, channel hunting
  staticBed(AT(EV_S1.tvOn, 'hiss'), END1, { g: 0.011, crackle: 9 }) // broadcast hiss + CRT crackle
  kit.tick(AT(EV_S1.tvOn, 'tvOn'), 0.05, 2600) // channel lock chirp
  kit.drone(0, END1, [38, 45], 0.028, 260) // DREAD: D root under the bulletin
  kit.tick(AT(EV_S1.anchor, 'anchor'), 0.02, 2000) // desk mic tick
  fluoro(AT(EV_S1.anchor, 'studioHum'), END1 - 0.05, { g: 0.009 }) // studio hum joins
  kit.blip(AT(EV_S1.lower1, 'lower1'), 880, 0.02, 0.07, 'square') // lower-third CRT blip
  // lone trumpet LAMENT fragment over the static (~3 s in)
  trumpet(AT(3.0, 'lamentFrag1'), 69, 0.5, { g: 0.045 })
  trumpet(FT(filmT(3.0) + 0.55, 'lamentFrag1b'), 67, 0.7, { g: 0.045 })
  // the map cut brings the slow pulse (period = one 1.6 s bar, anchored AT the cut)
  for (let g = EV_S1.mapCut; g < EV_S1.degrade - 0.05; g += BAR) {
    if (g >= EV_S1.recede - EPS && g < EV_S1.anchorStare) continue // the silence gap
    pulse(AT(g, 'mapPulse'), { g: 0.045 })
  }
  kit.swell(GF(EV_S1.zoneGrow, 'zoneGrow'), filmT(EV_S1.zoneGrow) + 0.8, 0.02, 800) // the Shed Zone blotch
  kit.blip(AT(EV_S1.lower2, 'lower2'), 660, 0.02, 0.07, 'square')
  kit.tick(AT(EV_S1.anchorBack, 'anchorBack'), 0.02, 1800) // papers
  // recede 9.8: one fragile high sine — then the gap (drone pulse both gated above)
  {
    const t9 = AT(EV_S1.recede, 'recede')
    at(t9, () => {
      const dur = 0.9
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t9)
      a.gain.linearRampToValueAtTime(0.03, t9 + 0.2)
      a.gain.setValueAtTime(0.02, t9 + 0.6)
      a.gain.linearRampToValueAtTime(0.0001, t9 + dur)
      a.gain.linearRampToValueAtTime(0, t9 + dur + 0.02)
      const o = osc('sine', hz(98), t9, dur + 0.02) // D6, glass-fragile
      const o2 = osc('sine', hz(98) * 1.003, t9, dur + 0.02)
      const g2 = ac.createGain()
      g2.gain.value = 0.4
      o.connect(a)
      o2.connect(g2).connect(a)
      out(a, 1, 0.3, 0.1)
    })
  }
  kit.tick(AT(EV_S1.anchorStare, 'anchorStare'), 0.015, 2100) // the deadpan stare: nearly nothing
  tapeSlur(AT(EV_S1.degrade, 'degrade')) // audio slurs, pitches down, dies
  kit.glitch(GF(EV_S1.degrade, 'glitch'), 0.5, 0.04) // chroma tears
  staticBed(AT(EV_S1.deadAir, 'deadAir'), END1, { g: 0.045 }) // dead-air static beat

  // ============================ B. TITLE (g 13.5-18.5) ================================
  {
    const TT = AT(EV_TITLE.in, 'title')
    kit.piano(TT, 50, 0.16, 3.5) // the single piano note
    kit.choir(TT, [38, 45, 50], 3.0, 0.028, 'u', 1.1, 1.2) // low choir-ish pad swell
    kit.sub(TT, 0.22, 60, 32, 1.2) // weight, not width
    kit.impact(TT, 0.3, 45)
    // THE LAMENT — complete, exactly once, dry (fragments never state the whole chain)
    const RHY = [[0, 0.55], [0.55, 0.35], [0.9, 0.75], [1.75, 0.5], [2.3, 1.5]]
    LAMENT.forEach((m, i) => trumpet(TT + RHY[i][0], m, RHY[i][1], { g: 0.1, send: 0.1, pan: -0.05 }))
    TAILS.push({ end: TT + 4.3, tag: 'titlePad' }) // piano decay + choir release
  }
  kit.heartbeat(AT(EV_TITLE.tag, 'tag'), 0.14) // the tagline lands like a held breath
  kit.whoosh(AT(EV_TITLE.hordePass, 'hordePass'), 0.5, 0.05, 250, 900) // the close silhouette
  kit.swell(GF(EV_TITLE.out, 'titleOut'), filmT(EV_TITLE.out) + 0.45, 0.018, 1200) // into S2

  // ============================ C. S2 — THE HOUSE (g 18.5-34) =========================
  kit.wind(AT(EV_S2.in, 's2in'), filmT(EV_S2.cross) + 0.3, 0.035, 300, 900) // dawn wind bed
  kit.blip(GF(EV_S2.in, 'bird'), 2800, 0.014, 0.06, 'sine') // one distant dawn bird
  kit.piano(GF(EV_S2.in + 0.6, 'pianoFrag1'), 69, 0.055, 2.2) // solo piano lament fragments
  kit.piano(filmT(EV_S2.in + 0.6) + 0.4, 65, 0.05, 2.0)
  EV_S2.boards.forEach((g, i) => boardHit(AT(g, `board${i}`))) // nail hits ride EV exactly
  kit.heartbeat(AT(EV_S2.look, 'look'), 0.3) // the heartbeat enters
  kit.heartbeat(filmT(EV_S2.look) + 0.8, 0.32)
  kit.piano(AT(EV_S2.look, 'pianoFrag2'), 62, 0.06, 2.4) // the tonic, alone
  creak(AT(EV_S2.sway, 'sway'), { g: 0.028, dur: 0.5 }) // the friend sways, boards creak
  shiver(AT(EV_S2.shed, 'shed'), { g: 0.03 }) // fragile strand shiver, high harmonics
  kit.braam(AT(EV_S2.turn, 'turn'), [38], 1.4, 0.09, 0.6) // ONE low braam...
  // ...then SILENCE until the blinds (heartbeat gap is deliberate — the turn lands alone)
  kit.pad(AT(EV_S2.blinds, 'blinds'), [38, 45], 1.3, 0.02, 500, 0.5) // soft dread pad
  kit.piano(AT(EV_S2.blinds, 'pianoFrag3'), 64, 0.045, 1.6)
  kit.piano(filmT(EV_S2.blinds) + 0.3, 62, 0.04, 1.8)
  kit.riser(AT(EV_S2.hedges, 'hedges'), filmT(EV_S2.arm), 0.055) // silhouettes rise
  kit.clunk(AT(EV_S2.arm, 'arm'), 0.12) // sword strap + duffel
  kit.tick(filmT(EV_S2.arm) + 0.06, 0.03, 2200)
  grind(AT(EV_S2.garage, 'garage'), filmT(EV_S2.exit), { g: 0.05 }) // garage door grinds up
  kit.whoosh(AT(EV_S2.exit, 'exit'), 0.35, 0.08, 200, 900) // rolls out low
  kit.blip(GF(EV_S2.exit, 'engine'), 90, 0.03, 0.3, 'sawtooth')
  {
    const t33 = AT(EV_S2.cross, 'cross')
    at(t33, () => {
      const o = osc('sine', 120, t33, 0.24)
      o.frequency.exponentialRampToValueAtTime(70, t33 + 0.2)
      const a = ac.createGain()
      a.gain.setValueAtTime(0.0001, t33)
      a.gain.linearRampToValueAtTime(0.07, t33 + 0.015)
      a.gain.exponentialRampToValueAtTime(0.0001, t33 + 0.24)
      o.connect(a)
      out(a, 1, 0.1) // shapes cross the front window
    })
  }

  // ============================ D. S3 — THE ROAD (g 34-47) ============================
  kit.drone(AT(EV_S3.wide, 's3wide'), filmT(EV_S3.scavenge) + 0.6, DREAD, 0.018, 240) // dread answers
  { // escape pulse: heartbeat accelerando into the timp gallop
    let g = EV_S3.wide
    let period = 0.85
    while (g < EV_S3.run - 0.05) {
      const p = (g - EV_S3.wide) / (EV_S3.run - EV_S3.wide)
      kit.heartbeat(AT(g, 'pulseAcc'), 0.2 + 0.18 * p)
      g += period
      period *= 0.93
    }
  }
  kit.clunk(AT(EV_S3.scavenge, 'scavenge'), 0.15) // the wagon door tries...
  kit.blip(filmT(EV_S3.scavenge) + 0.15, 180, 0.025, 0.12, 'square') // ...and refuses
  stinger(AT(EV_S3.rise, 'rise1')) // the risen: wave 1
  stinger(AT(38.0, 'rise2'), { g: 0.09 }) // wave 2 — heavier
  { // timp gallop on the 0.4 s g-grid, accents on the 1.6 bar — rides INTO the freeze
    for (let g = EV_S3.run; g < STOP1_G - 0.001; g += BEAT) {
      const t = GF(g, 'gallop')
      const onBar = Math.abs(g % BAR) < EPS
      kit.taiko(t, onBar ? 0.3 : 0.18, onBar ? 60 : 52)
      if (!onBar && Math.abs(g % (2 * BEAT)) < EPS) kit.tick(t + 0.02, 0.03, 1800)
    }
  }
  kit.riser(GF(EV_S3.doorGrab - 0.8, 'tackleRiser'), filmT(EV_S3.doorGrab), 0.05)
  kit.whoosh(AT(EV_S3.doorGrab, 'doorGrab'), 0.3, 0.14, 400, 2400) // the lunge
  // HIT-STOP 1 — the tackle: impact AT the freeze start (equality rule)...
  kit.impact(AT(EV_S3.tackle, 'tackle'), 0.42, 52)
  kit.clunk(PIN1, 0.35)
  kit.sub(PIN1, 0.3, 70, 30, 1.4)
  cymbalChoke(PIN1, REL1, { g: 0.16 }) // ...whose choke cuts EXACTLY at the release
  kit.taiko(REL1, 0.3, 58) // groove resume pickup exactly at the freeze end
  kit.pluck(REL1 + 0.02, 62, 0.05, 1600)
  for (let g = STOP1_G + BEAT; g < EV_S3.clear - 0.05; g += BEAT) {
    const t = GF(g, 'gallop2') // the groove rides the clock across the freeze
    kit.taiko(t, Math.abs(g % BAR) < EPS ? 0.28 : 0.16, 56)
  }
  kit.whoosh(AT(EV_S3.clear, 'clear'), 0.22, 0.12, 1200, 5200) // sword: metallic swish
  kit.bell(filmT(EV_S3.clear) + 0.05, 5600, 0.02, 0.5, 4.5, 6)
  kit.wind(AT(EV_S3.hill, 'hill'), filmT(EV_S3.reveal) + 1.2, 0.045, 500, 1400) // sudden air
  kit.swell(GF(EV_S3.hill, 'hillSwell'), filmT(EV_S3.hill) + 0.5, 0.03, 3000)
  kit.choir(AT(EV_S3.reveal, 'reveal'), [50, 57, 62, 66], 1.8, 0.03, 'a', 0.5, 0.9) // D MAJOR awe
  kit.pluck(AT(EV_S3.wave, 'wave'), 74, 0.06, 2600) // tiny hopeful pluck
  kit.bell(filmT(EV_S3.wave) + 0.04, hz(88), 0.025, 0.8, 3.5, 2)

  // ============================ E. S4 — SANCTUARY (g 47-66) ===========================
  fluoro(AT(EV_S4.in, 's4in'), filmT(EV_S4.gust), { g: 0.012 }) // interior hum, dies at gust
  kit.tick(AT(EV_S4.in, 'checker'), 0.02, 3000) // checkers
  kit.tick(AT(EV_S4.inspect, 'inspect'), 0.03, 2600) // mirror-on-pole
  kit.tick(filmT(EV_S4.inspect) + 0.14, 0.025, 2900)
  kit.drone(AT(EV_S4.muzakOn, 'dreadUnder'), filmT(EV_S4.hatOff) + 0.4, DREAD, 0.011, 200) // faint dread pad
  muzakRun(MUZAK.on, MUZAK.cut, 'cheer') // THE MUZAK — cheery, band-limited, 0.3 Hz wow
  kit.wind(GF(EV_S4.permWalk, 'permWalk'), filmT(EV_S4.permWalk) + 0.5, 0.02, 900, 2200) // PERM passes
  kit.bell(AT(EV_S4.glint, 'glint'), hz(93), 0.05, 1.2, 3.5, 2.5) // the perm gleam
  EV_S4.tosses.forEach((g, i) => { // chair tosses ride EV exactly
    const t = AT(g, `toss${i}`)
    kit.clunk(t, 0.28)
    bodyDrop(t, { g: 0.07 })
    kit.tick(t + 0.03, 0.05, 1400) // metal
    kit.bell(t + 0.04, 660, 0.018, 0.4, 4.5, 6)
  })
  kit.pluck(AT(EV_S4.gap, 'gap'), 81, 0.04, 2600) // CURLS: thumbs up
  kit.wind(AT(EV_S4.gust, 'gust'), filmT(EV_S4.hatOff) + 0.6, 0.055, 300, 1500) // THE GUST
  kit.swell(GF(EV_S4.gust, 'gustSwell'), filmT(EV_S4.spot) - 0.05, 0.05, 6000)
  kit.whoosh(AT(EV_S4.hatLift, 'hatLift'), 0.25, 0.04, 500, 2400) // the hat lifts
  kit.whoosh(AT(EV_S4.hatOff, 'hatOff'), 0.3, 0.06, 600, 2000) // tumbling away
  for (let i = 0; i < 3; i++) kit.tick(filmT(EV_S4.hatOff) + 0.12 + i * 0.11, 0.025, 2200 - i * 500)
  // THE RING REVEAL — muzak record-stops; low drone in; near-silence for quarantine
  recordStop(AT(MUZAK.cut, 'muzakCut'), { g: 0.05 })
  kit.drone(filmT(MUZAK.cut) + 0.3, filmT(MUZAK.creep) - 0.2, [38, 45], 0.032, 240)
  kit.swell(GF(EV_S4.ringGrow, 'ringGrow'), filmT(EV_S4.ringGrow) + 0.8, 0.018, 400) // time-lapse dread
  creak(AT(EV_S4.quarantine, 'quarantine'), { g: 0.03, f0: 190, f1: 130 }) // CHAIR 3
  kit.clunk(AT(EV_S4.clippersDown, 'clippersDown'), 0.16) // set down, solemn
  kit.tick(filmT(EV_S4.clippersDown) + 0.05, 0.02, 2600)
  // dusk exterior: drone + distant horde moan pad (low choir-ish, NO melody)
  kit.drone(AT(EV_S4.duskCut, 'duskCut'), filmT(MUZAK.creep) - 0.2, DREAD, 0.03, 210)
  kit.choir(AT(EV_S4.arrive, 'moan'), [38, 41], 3.0, 0.018, 'u', 0.8, 1.2) // the horde moans
  for (let i = 0; i < 3; i++) kit.tick(filmT(EV_S4.arrive) + 0.2 + i * 0.35, 0.02, 700) // shuffling ranks
  palmGlass(AT(EV_S4.press, 'press'), { g: 0.09 }) // first palm on the glass
  kit.flutter(AT(EV_S4.flicker, 'flicker'), filmT(EV_S4.flicker) + 0.5, 0.028) // fluoro stutter
  kit.tick(filmT(EV_S4.flicker) + 0.2, 0.03, 2400)

  // ============================ F. S5 — THE SIEGE (g 66-86) ===========================
  kit.crowd(AT(EV_S5.night, 'night'), filmT(EV_S5.webGrow) + 0.8, 0.014) // the mass, murmuring
  muzakRun(MUZAK.creep, STOP2_G, 'creep') // CREEP: same tune, -2 st, 0.85x, hollow —
  // (run truncated at the breach: its bus is choked at PIN2, the PA freezes with the world)
  kit.choir(AT(EV_S5.swayAll, 'swayAll'), [38, 41], 4.0, 0.014, 'u', 1.4, 1.4) // unison sway moan
  palmGlass(AT(EV_S5.palm, 'palm2'), { g: 0.11 }) // second palm, harder
  crack(AT(EV_S5.spider, 'spider'), 4) // first spokes
  crack(AT(EV_S5.webGrow, 'webGrow'), 6, { g: 0.1 }) // the web reaches the frame
  // HIT-STOP 2 — THE BREACH: biggest impact of the film AT the freeze start
  kit.impact(AT(EV_S5.breach, 'breach'), 0.5, 48)
  kit.glass(PIN2, 0.4, 0.22) // crunch THROUGH the freeze (spread <= the freeze length)
  kit.sub(PIN2, 0.35, 70, 26, 1.8)
  cymbalChoke(PIN2, REL2, { g: 0.18 }) // choke cut exactly at the freeze end
  // FLOOD — slow-mo: MUZAK FULL + deep half-time timpani (every other 1.6 s bar)
  muzakRun(MUZAK.full, MUZAK.under, 'full')
  kit.taiko(AT(EV_S5.flood, 'flood'), 0.5, 46)
  for (let k = Math.ceil(EV_S5.flood / BAR); BAR * k < EV_S5.permLine - 0.05; k += 2) {
    const t = GF(BAR * k, 'timpHalf')
    kit.taiko(t, 0.42, 47) // bars 48 & 50 ARE strikes 1 & 3 — the percussion doubles
  }
  for (let g = EV_S5.flood + 0.4; g < EV_S5.flood + 2.8; g += 0.8) { // slow shuffling scuffs
    const t = GF(g, 'scuff')
    kit.wind(t, t + 0.14, 0.03, 400, 900)
  }
  for (const [i, m] of [88, 91, 93, 96].entries()) // mirror-ball sparkle dust
    kit.bell(AT(EV_S5.ballGleam, `gleam${i}`), hz(m), 0.032 - i * 0.005, 1.1, 3.5, 2.2)
  // hallway line — three strikes, EXACTLY on EV times, EXACTLY on the 150 BPM bar grid
  EV_S5.strikes.forEach((g, i) => {
    if (Math.abs(g / BAR - Math.round(g / BAR)) > 1e-6) throw new Error(`strike ${i} at g=${g} is off the 1.6 s bar grid`)
    const t = AT(g, `strike${i}`)
    kit.whoosh(t, 0.18, 0.13, 1200, 5600) // sword swish
    kit.taiko(t + 0.03, 0.3, 60) // percussion doubles
    kit.tick(t + 0.03, 0.06, 2800)
    bodyDrop(t + 0.12, { g: 0.09 }) // body drop
  })
  muzakRun(MUZAK.under, EV_S5.turn, 'under') // ducked under the hallway line
  for (let i = 0; i < 2; i++) { // permLine: razor shings
    const t = filmT(EV_S5.permLine) + i * 0.14
    kit.tick(GF(EV_S5.permLine + i * 0.35, 'shing'), 0.04, 6800 - i * 900)
    kit.bell(t, 5900, 0.018, 0.35, 4.5, 6)
  }
  // TURN — muzak drops to solo woodblock; the strand-shiver motif returns
  shiver(AT(EV_S5.turn, 'turn'), { g: 0.042, dur: 0.8 })
  muzakRun(EV_S5.turn, MUZAK.fade, 'wood')
  kit.heartbeat(AT(EV_S5.hesitate, 'hesitate'), 0.34) // total silence but ONE heartbeat
  clipperBuzz(filmT(MUZAK.duck), filmT(EV_S5.buzzPass), filmT(EV_S5.smile) - 0.1, { g: 0.085 })
  // buzz chug accents ON the grid beats (the AM free-runs at the 2.5 Hz beat rate)
  kit.tick(AT(EV_S5.buzzPlug, 'buzzPlug'), 0.03, 3200) // the plug click, on beat 209
  kit.tick(AT(EV_S5.buzzPass, 'buzzPass'), 0.03, 3600) // pass 2 accents the grid
  kit.pluck(AT(EV_S5.smile, 'smile'), 74, 0.05, 2200) // tiny warm pluck: 'clean.'
  kit.kick(AT(EV_S5.doorSlam, 'doorSlam'), 0.5) // heavy slam...
  kit.clunk(filmT(EV_S5.doorSlam), 0.45)
  kit.sub(filmT(EV_S5.doorSlam), 0.28, 70, 30, 1.2)
  warbleOut(AT(MUZAK.fade, 'muzakFade'), { g: 0.03 }) // ...muzak tail warbles out, gone ~86.6

  // ============================ G. S6 — DAWN (g 86-99.62) =============================
  kit.wind(AT(EV_S6.roof, 's6roof'), DURATION - 1.6, 0.04, 250, 800) // pre-dawn wind
  { // distant rotor thumps growing into the chopper bed (one last thump at 99.0)
    let g = EV_S6.thump
    let i = 0
    while (g < EV_S6.chopper - 0.05) {
      rotorThump(AT(g, `thump${i}`), { g: 0.04 + 0.012 * i })
      g += 0.55
      i++
    }
  }
  chopper(AT(EV_S6.chopper, 'chopper'), DURATION - 1.4, { g: 0.045 }) // FLOW 6, ducked under
  kit.tick(AT(EV_S6.liftLines, 'liftLines'), 0.04, 2000) // lines drop
  kit.blip(filmT(EV_S6.liftLines) + 0.06, 1400, 0.02, 0.1, 'sine')
  // THE LAMENT returns — resolving D minor -> D MAJOR (flip across 92.0-93.0 g)
  kit.strings(AT(EV_S6.liftLines, 'padDm'), [50, 57, 62, 65], 3.3, 0.03, 1.0, 1.0, 2200) // Dm
  trumpet(AT(EV_S6.liftLines, 'lament6a'), 69, 0.8, { g: 0.075 })
  kit.tick(AT(EV_S6.hoist, 'hoist'), 0.035, 1600) // winch ratchet
  kit.tick(filmT(EV_S6.hoist) + 0.12, 0.03, 1700)
  kit.tick(filmT(EV_S6.hoist) + 0.24, 0.03, 1800)
  trumpet(AT(EV_S6.hoist, 'lament6b'), 67, 0.8, { g: 0.075 })
  trumpet(GF(90.3, 'lament6c'), 65, 0.85, { g: 0.07 }) // F natural — the ache, still minor
  trumpet(AT(EV_S6.lookback, 'lament6d'), 64, 1.45, { g: 0.08 }) // held over the sway
  kit.strings(AT(EV_S6.swayMass, 'padD'), [50, 57, 62, 66], 2.6, 0.034, 0.8, 1.2, 2600) // FLIP: D
  trumpet(AT(EV_S6.swayMass, 'lament6e'), 66, 0.55, { g: 0.06 }) // F# — the third turns
  kit.swell(GF(EV_S6.swayMass, 'swaySwell'), filmT(EV_S6.swayMass) + 0.8, 0.02, 500)
  // salute: soft horn reprise, then the resolve UP to D5 rides the board beat
  kit.strings(AT(EV_S6.salute, 'salute'), [50, 57, 66], 1.2, 0.026, 0.3, 0.8, 2400)
  trumpet(AT(EV_S6.salute, 'lament6f'), 66, 0.5, { g: 0.09 })
  kit.whoosh(AT(EV_S6.board, 'skid'), 0.3, 0.05, 300, 1200) // onto the skid
  kit.clunk(filmT(EV_S6.board) + 0.1, 0.12)
  trumpet(AT(EV_S6.board, 'lamentResolve'), 74, 1.4, { g: 0.09 }) // D5 — resolved, sunrise
  // away: full warm pad + one tender MUZAK echo bar (the mall singing from memory)
  kit.pad(AT(EV_S6.away, 'awayPad'), [50, 57, 62, 66], 3.4, 0.05, 2000, 0.7)
  kit.choir(filmT(EV_S6.away), [50, 57, 62, 66], 2.4, 0.022, 'a', 1.0, 0.9)
  TAILS.push({ end: filmT(EV_S6.away) + 3.7, tag: 'awayPad' })
  muzakEcho(filmT(EV_S6.away)) // one bar, solo sine, band-limited, wowed
  kit.impact(AT(EV_S6.card, 'card'), 0.16, 50)
  kit.kick(filmT(EV_S6.card), 0.24)
  warmStab(filmT(EV_S6.card), [50, 57, 62, 66], { g: 0.11 }) // single warm stab
  kit.sub(filmT(EV_S6.card), 0.16, 60, 32, 0.9)
  rotorThump(DURATION - 1.0, { g: 0.05 }) // one last rotor thump
  TAILS.push({ end: DURATION - 1.0 + 0.32, tag: 'lastThump' })

  // ============================ THE MUZAK MACHINE =====================================
  // ONE shared note table (MZ_MEL/MZ_CHORDS); every state renders the same tune. Each
  // run is ONE at() (raw nodes only — no kit instruments inside), builds its PA chain
  // (wow LFO 0.3 Hz -> detune + level wobble; state filter), and schedules every
  // element through filmT of its g-grid point. Runs never cross a stop (asserted), so
  // t0 + b*B === filmT(g0 + b*B) holds and no note can start inside a freeze.
  function muzakRun(g0, g1, mode) {
    const conf = MZ_CONF[mode] || { rate: 1, tp: 0, g: 0.5, send: 0.1, hats: 0, block: 0.014, hp: 180, lp: 3400 }
    const t0 = filmT(g0)
    const t1 = filmT(g1)
    CUES.push({ t: t0, g: g0, tag: `muzak.${mode}` })
    RUNS.push({ mode, g0, g1, t0, rate: conf.rate, tp: conf.tp })
    at(t0, () => {
      const B = MZ_BEAT / conf.rate
      const bus = ac.createGain()
      bus.gain.value = conf.g
      let tail = bus
      if (conf.bp) {
        const bp = ac.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = conf.bp
        bp.Q.value = conf.q
        tail.connect(bp)
        tail = bp
      } else {
        const hp = ac.createBiquadFilter()
        hp.type = 'highpass'
        hp.frequency.value = conf.hp
        const lp = ac.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = conf.lp // the band-limit: it sounds like the mall PA
        tail.connect(hp).connect(lp)
        tail = lp
      }
      const wow = ac.createGain() // 0.3 Hz wow: level + detune wobble = worn tape/PA
      wow.gain.value = 1
      tail.connect(wow)
      const lfo = osc('sine', 0.3, t0, t1 - t0 + 0.4)
      const lw = ac.createGain()
      lw.gain.value = 0.08
      lfo.connect(lw).connect(wow.gain)
      const ld = ac.createGain()
      ld.gain.value = 4 // cents
      lfo.connect(ld)
      out(wow, 1, conf.send, 0)
      if (mode === 'creep') {
        // choked by the breach freeze: the PA dies WITH the world at PIN2
        bus.gain.setValueAtTime(conf.g, PIN2 - 0.05)
        bus.gain.linearRampToValueAtTime(0.0001, PIN2 + 0.005)
      }
      const voice = (t, f, g, dur, atk = 0.02) => {
        const a = ac.createGain()
        a.gain.setValueAtTime(0, t)
        a.gain.linearRampToValueAtTime(g, t + atk)
        a.gain.setValueAtTime(g * 0.8, t + Math.max(atk, dur * 0.6))
        a.gain.linearRampToValueAtTime(0.0001, t + dur)
        a.gain.linearRampToValueAtTime(0, t + dur + 0.015)
        const o = osc('sine', f, t, dur + 0.02)
        ld.connect(o.detune)
        o.connect(a)
        const o2 = osc('sine', f * 2, t, dur + 0.02) // faint 2nd partial, keeps it audible
        ld.connect(o2.detune)
        const g2 = ac.createGain()
        g2.gain.value = 0.14
        o2.connect(g2).connect(a)
        a.connect(bus)
      }
      if (mode === 'wood') {
        // solo woodblock: the tune's rhythm, hollow, gated around the hesitate beat
        const hes0 = filmT(EV_S5.hesitate) - 0.35
        const hes1 = filmT(EV_S5.hesitate) + 0.35
        for (const [b, m] of MZ_MEL) {
          const gN = g0 + b * MZ_BEAT
          if (gN >= g1 - 0.05) break
          const t = filmT(gN)
          if (t > hes0 - 0.1 && t < hes1) continue // total silence for hesitate
          const f = 1500 + (m - 72) * 40
          const o = osc('sine', f, t, 0.06)
          o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.035)
          const a = ac.createGain()
          a.gain.setValueAtTime(0, t)
          a.gain.linearRampToValueAtTime(0.016, t + 0.003)
          a.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
          o.connect(a)
          out(a, 1, 0.12, 0.1)
        }
        return
      }
      for (const [b, m, d] of MZ_MEL) {
        const gN = g0 + b * B
        if (gN >= g1 - 0.03) continue
        let dur = d * B
        if (gN + dur > g1) dur = g1 - gN - 0.02 // clamp into the run end
        if (dur < 0.07) continue
        voice(filmT(gN), hz(m + conf.tp), 0.05 * conf.g, dur)
      }
      for (let bar = 0; bar < 8; bar++) {
        for (const [off, k] of [[0, 1], [2, 0.6]]) {
          const gN = g0 + (bar * 4 + off) * B
          if (gN >= g1 - 0.03) continue
          let dur = 1.2 * B
          if (gN + dur > g1) dur = g1 - gN - 0.02
          if (dur < 0.07) continue
          for (const cm of MZ_CHORDS[bar]) voice(filmT(gN), hz(cm + conf.tp), 0.017 * k * conf.g, dur, 0.006)
        }
        for (const beat of [0, 1, 2, 3]) {
          const gN = g0 + (bar * 4 + beat) * B
          if (gN >= g1 - 0.03) continue
          const t = filmT(gN)
          if (conf.hats > 0) {
            const n = noise(t, 0.05)
            const bp = ac.createBiquadFilter()
            bp.type = 'bandpass'
            bp.frequency.value = 2500 // brush swish INSIDE the band-limit
            bp.Q.value = 0.8
            const a = ac.createGain()
            a.gain.setValueAtTime(0, t)
            a.gain.linearRampToValueAtTime(conf.hats * conf.g, t + 0.004)
            a.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
            n.connect(bp).connect(a).connect(bus)
          }
          if (conf.block > 0 && (beat === 1 || beat === 3)) {
            const f = bar % 2 ? 1350 : 1750
            const o = osc('sine', f, t, 0.055)
            o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.03)
            const a = ac.createGain()
            a.gain.setValueAtTime(0, t)
            a.gain.linearRampToValueAtTime(conf.block * conf.g, t + 0.003)
            a.gain.exponentialRampToValueAtTime(0.0001, t + 0.055)
            o.connect(a).connect(bus)
          }
        }
      }
    })
  }

  // one tender MUZAK echo bar — solo sine through a light band-limit, the PA from memory
  function muzakEcho(t0) {
    at(t0, () => {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 2600
      const wow = ac.createGain()
      wow.gain.value = 1
      lp.connect(wow)
      const lfo = osc('sine', 0.3, t0, 1.9)
      const lw = ac.createGain()
      lw.gain.value = 0.1
      lfo.connect(lw).connect(wow.gain)
      out(wow, 1, 0.3)
      for (const [b, m, d] of MZ_MEL.slice(0, 6)) {
        const t = t0 + b * MZ_BEAT
        const dur = Math.min(d * MZ_BEAT, t0 + 1.75 - t)
        if (dur < 0.08) continue
        const a = ac.createGain()
        a.gain.setValueAtTime(0, t)
        a.gain.linearRampToValueAtTime(0.032, t + 0.03)
        a.gain.setValueAtTime(0.026, t + dur * 0.6)
        a.gain.linearRampToValueAtTime(0.0001, t + dur)
        a.gain.linearRampToValueAtTime(0, t + dur + 0.02)
        const o = osc('sine', hz(m), t, dur + 0.02)
        o.connect(a).connect(lp)
      }
      TAILS.push({ end: t0 + 1.8, tag: 'muzakEcho' })
    })
  }

  // ============================ SELF-CHECK ============================================
  {
    const fail = []
    // (a) every EV-sourced cue time equals filmT(g) of its beat — and every beat HAS a cue
    for (const c of CUES) {
      if (c.g != null && Math.abs(c.t - filmT(c.g)) > 1e-9) fail.push(`cue ${c.tag}: t != filmT(g)`)
    }
    const need = []
    const addEV = (nm, ev) => {
      for (const [k, v] of Object.entries(ev)) {
        if (Array.isArray(v)) v.forEach((g, i) => need.push([`${nm}.${k}[${i}]`, g]))
        else need.push([`${nm}.${k}`, v])
      }
    }
    addEV('S1', EV_S1)
    addEV('TITLE', EV_TITLE)
    addEV('S2', EV_S2)
    addEV('S3', EV_S3)
    addEV('S4', EV_S4)
    addEV('S5', EV_S5)
    addEV('S6', EV_S6)
    const have = new Set(CUES.filter((c) => c.g != null).map((c) => c.g))
    for (const [tag, g] of need) if (!have.has(g)) fail.push(`no cue for beat ${tag} g=${g}`)
    // (b) no cue starts inside either hit-stop freeze window (impacts AT the pin are legal)
    const pins = STOPS.map((s) => ({ a: filmT(s.g), b: filmT(s.g) + s.d }))
    for (const c of CUES) {
      for (const { a, b } of pins) if (c.t > a + 1e-9 && c.t < b - 1e-9) fail.push(`cue ${c.tag} t=${c.t.toFixed(3)} starts inside freeze (${a}, ${b})`)
      if (c.t < 0 || c.t > DURATION) fail.push(`cue ${c.tag} t=${c.t} outside film`)
    }
    // (c) the three strikes + three boards + three tosses are each scheduled, exactly
    for (const c of CUES) if (c.tag == null) fail.push(`cue without tag at t=${c.t}`)
    const count = (pre, src) => {
      const got = CUES.filter((c) => String(c.tag).startsWith(pre)).map((c) => c.g)
      if (got.length !== src.length || src.some((g, i) => got[i] !== g)) fail.push(`${pre} scheduled ${got} != EV ${src}`)
    }
    count('strike', EV_S5.strikes)
    count('board', EV_S2.boards)
    count('toss', EV_S4.tosses)
    for (const g of EV_S5.strikes) if (Math.abs(g / BAR - Math.round(g / BAR)) > 1e-6) fail.push(`strike g=${g} off the 150 BPM bar grid (${BAR} s)`)
    // (d) MUZAK transitions match the timeline MUZAK table
    const tableSeq = [MUZAK.on, MUZAK.cut, MUZAK.creep, MUZAK.full, MUZAK.under, MUZAK.duck, MUZAK.fade]
    for (let i = 1; i < tableSeq.length; i++)
      if (tableSeq[i] <= tableSeq[i - 1]) fail.push(`MUZAK table not ascending at ${tableSeq[i]}`)
    const plan = [
      ['cheer', MUZAK.on, MUZAK.cut],
      ['creep', MUZAK.creep, STOP2_G], // truncated at the breach (choked at PIN2)
      ['full', MUZAK.full, MUZAK.under],
      ['under', MUZAK.under, EV_S5.turn],
      ['wood', EV_S5.turn, MUZAK.fade],
    ]
    if (RUNS.length !== plan.length) fail.push(`muzak runs ${RUNS.length} != plan ${plan.length}`)
    plan.forEach(([mode, g0, g1], i) => {
      const r = RUNS[i]
      if (!r) return
      if (r.mode !== mode || r.g0 !== g0 || r.g1 !== g1) fail.push(`muzak run ${i}: ${r.mode} ${r.g0}->${r.g1} != ${mode} ${g0}->${g1}`)
      if (Math.abs(filmT(g1) - filmT(g0) - (g1 - g0)) > 1e-9) fail.push(`muzak run ${mode} crosses a stop fold`)
    })
    const creep = RUNS.find((r) => r.mode === 'creep')
    if (!creep || creep.rate !== 0.85 || creep.tp !== -2) fail.push('CREEP state must be -2 st / 0.85x')
    // tails: out by ~99.4, nothing re-rings past 99.5
    for (const tl of TAILS) if (tl.end > 99.5) fail.push(`tail ${tl.tag} rings to ${tl.end.toFixed(2)} > 99.5`)
    if (fail.length) throw new Error('score self-check failed:\n' + fail.join('\n'))
  }
}

export default score
