// HAIRTANIC score — original romantic score, A minor → C major arc. 90 s.
// One 6-note motif owns the film:
//   MOTIF = A4 C5 E5 G5 | E5 D5 (MIDI 69 72 76 79 76 74) — rising A-minor-7 arpeggio
//   to a flat-7 peak, falling back to the 4th. Statements:
//   S1 fragment (solo piano, octave 3) · S4 full theme (strings + piano @76) ·
//   S8 transformed elegy (retrograde descent, each note sagging a whole step) ·
//   S11 resolved in C (head + leap to the tonic over a plagal cadence).
// No copyrighted melodies, no hymn tunes, no Titanic-film themes.
//
// CLOCK RULE: every S5 cue goes through STEER.abs(g), every S7 cue through IMPACT.abs(g)
// (hit-stops/slow-mo shift them). Freeze discipline (goldflow/baldzilla): no cue STARTS
// inside [freeze−0.5, freeze+0.4] except the pins AT the freeze (slap 38.40, HIT 54.60).
// S7 post-hit note: for g > 3.68, IMPACT.abs(g) = 52 + g + 1.08 (stop + slow-mo stretch),
// so g is capped at 6.5 to stay inside the shot.
import { SCORE, STEER, IMPACT, EV, DUR } from './timeline.js'

const SA = (g) => STEER.abs(g) // S5 steerage world clock
const IA = (g) => IMPACT.abs(g) // S7 impact world clock
const SEC = Object.fromEntries(SCORE.sections.map((s) => [s.name, s]))
const MOTIF = [69, 72, 76, 79, 76, 74]

export default function score(k) {
  const { ac, at, osc, noise, out, hz, R } = k

  // ---------- custom voices ----------
  // Steam whistle: open-fifth sine pair (G4+D5) with slow wobble + breath noise.
  const whistle = (t, { g = 0.11, dur = 1.35 } = {}) => at(t, () => {
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.06)
    a.gain.setValueAtTime(g, t + dur - 0.25)
    a.gain.linearRampToValueAtTime(0, t + dur)
    const wobble = osc('sine', 5.6, t, dur)
    const wg = ac.createGain()
    wg.gain.value = 4
    wobble.connect(wg)
    for (const [m, kg] of [[67, 1], [74, 0.6]]) {
      const og = ac.createGain()
      og.gain.value = kg
      og.connect(a)
      for (const det of [-3, 4]) {
        const o = osc('sine', hz(m), t, dur)
        o.detune.value = det
        wg.connect(o.detune)
        o.connect(og)
      }
    }
    const n = noise(t, 0.12)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 1
    const ng = ac.createGain()
    ng.gain.value = g * 0.4
    n.connect(bp).connect(ng)
    out(a, 1, 0.5, -0.15)
    out(ng, 1, 0.3, -0.15)
  })
  // Quartet solo lead: vibrato saw through a lowpass; `sag` droops the tail a whole step.
  const lead = (t, m, dur, { g = 0.075, sag = 2, cut = 1900, pan = -0.12 } = {}) => at(t, () => {
    const o = osc('sawtooth', hz(m), t, dur + 0.3)
    o.frequency.setValueAtTime(hz(m), t + Math.max(0.05, dur - 0.6))
    o.frequency.exponentialRampToValueAtTime(hz(m - sag), t + dur + 0.15)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'; lp.frequency.value = cut; lp.Q.value = 0.7
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.18)
    a.gain.setValueAtTime(g, t + Math.max(0.2, dur - 0.35))
    a.gain.linearRampToValueAtTime(0, t + dur + 0.2)
    const vib = osc('sine', 5.0, t, dur + 0.3)
    const vg = ac.createGain()
    vg.gain.setValueAtTime(0, t)
    vg.gain.linearRampToValueAtTime(10, t + 0.55)
    vib.connect(vg).connect(o.detune)
    o.connect(lp).connect(a)
    out(a, 1, 0.45, pan)
  })
  // Light brass for the Southampton march: detuned saws, opening filter, short stab.
  const brass = (t, notes, dur, { g = 0.15, send = 0.28 } = {}) => at(t, () => {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(900, t)
    lp.frequency.linearRampToValueAtTime(2200, t + 0.09)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.03)
    a.gain.setValueAtTime(g, t + Math.max(0.05, dur - 0.12))
    a.gain.linearRampToValueAtTime(0, t + dur)
    for (const m of notes)
      for (const det of [-6, 5]) {
        const o = osc('sawtooth', hz(m), t, dur + 0.02)
        o.detune.value = det
        o.connect(lp)
      }
    lp.connect(a)
    out(a, 1, send, 0.05)
  })
  // Comic crowd whoop: short upward sine chirp.
  const chirp = (t, f0, f1, dur = 0.28, g = 0.05) => at(t, () => {
    const o = osc('sine', f0, t, dur)
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.03)
    a.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(a)
    out(a, 1, 0.25, (R() - 0.5) * 0.8)
  })

  // ============================== S1 wreck cold open (0–9, A minor, elegiac) ==============================
  k.drone(0.15, 8.7, [33, 40], 0.045, 320) // deep sub drone A1+E2
  k.rain(0.2, 8.6, 0.03) // underwater wash
  k.clunk(2.4, 0.2) // distant hull groan
  // motif fragment: solo piano, octave 3, rubato — A3 C4 E4 | G4, answer E4 D4
  k.piano(0.9, 57, 0.11, 3.4)
  k.piano(1.9, 60, 0.1, 3.2)
  k.piano(2.9, 64, 0.1, 3.2)
  k.piano(3.9, 67, 0.09, 3.0)
  k.piano(5.0, 64, 0.09, 2.4)
  k.piano(6.0, 62, 0.08, 2.4)
  k.piano(7.0, 81, 0.06, 1.8) // one high A5 glimmer under the title
  k.swell(5.3, 6.85, 0.1) // blooms into HAIRTANIC
  k.blip(1.7, 520, 0.03, 0.5, 'sine') // sonar pings, sinking lower each time
  k.blip(4.1, 470, 0.028, 0.5, 'sine')
  k.blip(6.5, 430, 0.026, 0.55, 'sine')

  // ============================== S2 southampton (9–18, C major, march 4/4 @100) ==============================
  // 3.75 bars — 9.0 treated as downbeat; bar 3 truncated at the cut, pluck pickup into S3.
  k.crash(9.02, 0.12)
  const SB = 2.4, beat = 0.6
  const MARCH = [
    { t: 9.0, root: 36, chord: [48, 55, 64] }, // C
    { t: 11.4, root: 36, chord: [48, 55, 64] }, // C
    { t: 13.8, root: 41, chord: [53, 57, 60] }, // F
    { t: 16.2, root: 43, chord: [50, 55, 59] }, // G
  ]
  for (const { t, root, chord } of MARCH) {
    brass(t, chord, 0.45)
    brass(t + 0.9, chord, 0.3, { g: 0.11 }) // beat 2.5 lilt
    k.kick(t, 0.45)
    k.kick(t + 1.2, 0.32)
    k.bass(t, root, 0.5, 0.3, 'sawtooth', 480)
    k.bass(t + 1.2, root, 0.5, 0.26, 'sawtooth', 480)
    for (const dt of [0.6, 1.8]) if (t + dt < 17.9) k.clap(t + dt, 0.16) // backbeat snare
  }
  for (let i = 0; i < 30; i++) k.hat(9.0 + i * 0.3, i % 2 ? 0.035 : 0.05)
  k.crowd(9.3, 15.6, 0.06) // dock murmur, out before the blast
  chirp(15.7, 500, 740, 0.22, 0.045) // breath intake
  k.whoosh(EV.whistle.abs, 1.0, 0.18, 300, 2000) // steam blast under the banner card
  whistle(EV.whistle.abs)
  k.pluck(17.7, 69, 0.07) // A4 anacrusis into S3

  // ============================== S3 bow (18–26, D major, warm build @88) ==============================
  k.wind(18.2, 25.7, 0.09, 300, 1000)
  k.strings(18.4, [50, 57, 62], 3.3, 0.04, 1.5, 1.4) // D
  k.strings(21.7, [47, 54, 62], 2.3, 0.045, 1.4, 1.2) // Bm
  k.pluck(23.1, 69, 0.06) // motif head hinted high: A C# E (V7 colour)
  k.pluck(23.5, 73, 0.06)
  k.pluck(23.9, 76, 0.06)
  k.strings(24.2, [45, 52, 57, 62], 1.5, 0.055, 0.8, 0.4) // arms-wide climax, out by 26.1
  k.strings(24.2, [69, 73], 1.5, 0.03, 0.7, 0.4)
  for (let i = 0; i < 10; i++) k.tick(19.3 + i * 0.62 + R() * 0.2, 0.035, 4200 + R() * 1400) // spray
  k.riser(24.8, 25.97, 0.12)

  // ============================== S4 sunset romance (26–33, F major, THE THEME @76) ==============================
  // 2.22 bars, downbeat 26.0; theme elides into the jig pickup.
  const TT = [0, 0.79, 1.58, 2.37, 3.16, 3.95] // motif note offsets at 76bpm
  const TD = [1.5, 1.5, 1.5, 1.5, 1.5, 2.8]
  MOTIF.forEach((m, i) => {
    k.strings(26.0 + TT[i], [m], TD[i], 0.05, 0.09, 0.9, 2400) // full strings statement
    k.piano(26.02 + TT[i], m + 12, 0.085, 1.9) // felt piano an octave up
  })
  k.pad(26.05, [41, 48, 53, 57], 3.05, 0.05, 1300, 0.9) // F
  k.pad(29.16, [38, 45, 53, 57], 3.7, 0.05, 1300, 0.9) // Dm
  k.strings(26.0, [29, 41], 6.7, 0.035, 2.0, 2.0, 900) // low F pedal
  for (let i = 0; i < 8; i++) k.pluck(26.4 + i * 0.79, [65, 69, 72, 76][i % 4], 0.045) // harp arps
  k.wind(26.2, 32.5, 0.04, 250, 650) // wind gain low — the music breathes
  k.swell(31.8, 32.97, 0.11) // elision into the jig

  // ============================== S5 steerage jig (33–43, A mixolydian, 6/8 @140 eighth) ==============================
  // All cues via STEER.abs — the 0.16 s barrel-slap stop at g 5.4 retimes the back half.
  // Dead stop: no cue starts in [38.40−0.5, 38.40+0.4] except the slap pins; stiff quartet
  // pizzicato + foot-tap count fill the silence; the band returns a bar later (g 7.714).
  // MIX (draft2 notes): gains boosted ~×2.3 so the party lands ≈ −13 LUFS next to impact.
  // MIX v2 (final-render notes): normalization ate most of v1 (+1.9 realized of +6 nominal),
  // so this is the aggressive pass — claps 0.9, fiddle 0.34/0.36 + octave-double fiddle,
  // hats 0.1, bass-saw layer on downbeats, pins/pizz/whoops up — target ≈ −14..−15 realized.
  const E8 = 60 / 140
  const eig = (i) => SA(i * E8)
  const F1 = EV.barrelSlap.abs
  const live = (t) => t < SEC.steerageJig.t1 && !(t > F1 - 0.5 && t < F1 + 0.4)
  const JIG = [
    [69, 76, 73, 69, 73, 76], // bar 0: rolling A arpeggio (original)
    [74, 74, 71, 74, 76, 74], // bar 1
    null, // bar 2: dead stop at the slap
    [66, 69, 71, 74, 71], // bar 3: band back, lift to D, cut on the last stomp
  ]
  const JIG_ROOT = { 0: 45, 1: 45, 3: 38 } // doubling bass-saw roots: A, A, D
  for (const bar of [0, 1, 3]) {
    JIG[bar].forEach((m, e) => {
      const t = eig(bar * 6 + e)
      if (live(t)) {
        k.pluck(t, m, bar === 3 ? 0.36 : 0.34, 2700, 0.2, 'sawtooth') // fiddle
        k.pluck(t, m + 12, bar === 3 ? 0.24 : 0.23, 3400, 0.18, 'sawtooth') // second fiddle, 8ve up
      }
    })
    for (let e = 0; e < 6; e++) {
      const t = eig(bar * 6 + e)
      if (!live(t)) continue
      k.hat(t, 0.1)
      if (e % 3 === 0) k.clap(t, e === 0 ? 0.9 : 0.7) // hand claps on the downbeats
      if (e === 0) {
        k.kick(t, 1.0) // boot kick (already at design max)
        k.bass(t, JIG_ROOT[bar], 0.85, 0.3, 'sawtooth', 480) // doubling bass saw on the downbeat
      }
    }
  }
  k.clunk(F1, 1.0) // — the barrel slap, pinned at the freeze start —
  k.kick(F1, 1.0)
  k.tick(F1, 0.21, 1600)
  k.sweepDown(F1, 0.32, 1300, 420, 0.16) // 90s record-stop zip into the dead stop
  k.pluck(eig(14), 74, 0.26, 2400, 0.18, 'triangle') // quartet peek: two stiff pizzicato D5s
  k.pluck(eig(16), 74, 0.26, 2400, 0.18, 'triangle')
  k.tick(eig(17), 0.1, 2000) // the foot-tap count-in
  chirp(34.4, 600, 1150, 0.28, 0.126) // steerage whoops
  chirp(36.9, 640, 1200, 0.28, 0.126)
  chirp(41.2, 600, 1250, 0.3, 0.14)
  k.crowd(33.3, 37.6, 0.14)
  k.crowd(41.0, 42.9, 0.126)

  // ============================== S6 hairberg (43–52, E minor drone, eerie stillness) ==============================
  k.drone(43.2, 51.7, [28, 40], 0.062, 300) // MIX: bed lifted ~1.5 LU (draft2 notes)
  k.bell(43.9, 1318.5, 0.055, 2.6, 6.2, 2) // glassy high harmonics: E6, B5, G6
  k.bell(46.7, 987.8, 0.05, 2.6, 6.2, 2)
  k.bell(49.3, 1568, 0.05, 2.4, 6.2, 2)
  k.bell(EV.bergGlint.abs, 2637, 0.18, 2.4, 5.2, 3) // THE scalp glint
  k.rain(44.0, 51.6, 0.05) // dandruff snow
  k.heartbeat(48.5, 0.38) // dread, slowing
  k.heartbeat(49.9, 0.36)
  k.heartbeat(51.05, 0.32)
  // telegram morse under the C. card (49.6–51.9)
  for (const dt of [0.15, 0.27, 0.45, 0.8, 0.92, 1.3, 1.42, 1.54, 1.7]) k.tick(49.75 + dt, 0.05, 3400)
  k.swell(50.7, 51.95, 0.14) // into the hard downbeat at 52

  // ============================== S7 impact (52–60, C minor, ostinato 120 → HIT → freeze/slow-mo) ==============================
  // Every cue via IMPACT.abs. Grid silent in [54.10, 55.00]; the HIT stack pins AT 54.60;
  // stabs hang through the freeze and slow-mo (55.16–56.76) on clock times.
  k.taiko(IA(0), 0.5)
  const OST = [36, 36, 39, 36, 43, 36, 39, 36]
  for (let i = 0; i < 8; i++) {
    k.bass(IA(i * 0.25), OST[i], 0.2, 0.2, 'sawtooth', 750)
    k.hat(IA(i * 0.25), 0.04)
  }
  for (let i = 0; i < 4; i++) k.kick(IA(i * 0.5), 0.5 + i * 0.05)
  k.riser(53.6, 54.58, 0.2) // ends exactly on the HIT
  const HIT = EV.impactHit.abs
  k.impact(HIT, 0.9, 50) // — the stack, all pinned at the freeze start —
  k.sub(HIT, 0.7, 90, 26, 2.4)
  k.glass(HIT, 0.42, 1.6)
  k.thunder(HIT, 0.55, 4.2)
  k.taiko(HIT, 0.9)
  k.strings(IA(2.88), [75], 1.5, 0.03, 0.06, 1.0, 3200) // one high string hangs over the slow-mo
  k.taiko(IA(3.28), 0.5) // stab mid-slow-mo
  k.heartbeat(IA(3.5), 0.3)
  k.heartbeat(IA(4.2), 0.28)
  k.braam(IA(3.68), [36, 43, 48], 1.6, 0.24, 0.6) // slow-mo ends on a dark cluster
  k.sweepDown(EV.listStart.abs, 1.4, 320, 70, 0.13) // hull groans as the list begins
  k.braam(IA(5.2), [44, 45, 51], 1.3, 0.22, 0.55) // warped minor-2nd clusters, post-hit
  k.braam(IA(5.9), [43, 44, 50], 1.0, 0.2, 0.5)
  for (let i = 0; i < 7; i++) k.tick(IA(5.3 + i * 0.19 + R() * 0.06), 0.05, 2600 + R() * 1600) // rivets

  // ============================== S8 quartet elegy (60–69, A minor, slow 4/4 hymn @60) ==============================
  // Two kit.strings voices + the vibrato-saw lead playing the transformed motif:
  // G5 E5 D5 C5 A4 descending, each note sagging a whole step at release. NOT a waltz.
  k.strings(60.1, [45, 52, 60], 3.85, 0.04, 1.1, 1.2) // Am
  k.strings(60.1, [64], 3.85, 0.025, 1.3, 1.2) // inner second violin
  k.strings(64.1, [41, 48, 57], 3.85, 0.04, 1.1, 1.2) // F
  k.strings(64.1, [65], 3.85, 0.025, 1.3, 1.2)
  k.strings(68.15, [40, 56, 59], 0.8, 0.035, 0.3, 0.45) // E major fermata → S9 F minor
  lead(60.15, 79, 2.0)
  lead(62.35, 76, 1.7)
  lead(64.15, 74, 2.0)
  lead(66.35, 72, 1.5)
  lead(68.15, 69, 1.5) // final sag bleeds across the cut as the sanctioned fermata
  k.rain(60.3, 68.9, 0.05) // waterline
  k.whoosh(64.85, 1.2, 0.11, 400, 1500) // deck chair slides mid-shot

  // ============================== S9 door (69–79, F minor, sparse, heartbeats slowing) ==============================
  k.rain(69.2, 77.5, 0.05) // black water lapping (MIX: lifted ~1.5 LU, draft2 notes)
  k.heartbeat(69.45, 0.47)
  k.heartbeat(71.05, 0.43)
  k.heartbeat(72.75, 0.4)
  k.heartbeat(74.55, 0.36)
  k.heartbeat(76.35, 0.32) // decelerando
  k.piano(69.3, 41, 0.155, 3.2) // low F
  k.piano(72.7, 44, 0.13, 3.0) // Ab
  k.piano(75.5, 48, 0.12, 2.6) // C
  k.piano(71.56, 68, 0.095, 2.0) // motif as single piano notes in the volley gaps: Ab C Eb
  k.piano(73.81, 72, 0.095, 2.0)
  k.piano(76.06, 75, 0.095, 2.2)
  k.sweepDown(EV.gripSlip.abs, 0.7, 850, 200, 0.12) // the grip slips
  k.piano(EV.gripSlip.abs, 41, 0.18, 3.4) // low F, then near-silence after SHE LET FLOW.

  // ============================== S10 pendant (79–85, C major, solo piano, the drop) ==============================
  k.wind(79.2, 84.5, 0.04, 180, 500) // sea night air
  k.piano(79.6, 48, 0.1, 2.8)
  k.piano(80.4, 55, 0.09, 2.4)
  k.piano(81.1, 60, 0.09, 2.0)
  k.bell(EV.pendantDrop.abs, 2093, 0.1, 1.3, 3.5, 3) // gold leaves her hand: C7…
  k.bell(EV.pendantDrop.abs + 0.4, 1568, 0.09, 1.7, 3.5, 3) // …falling to G6
  k.sweepDown(EV.pendantDrop.abs, 0.16, 1300, 280, 0.15) // water plunk
  k.piano(82.6, 76, 0.07, 2.2) // desolate motif echo: E G
  k.piano(83.5, 79, 0.07, 2.4)
  k.strings(82.3, [48, 55, 64], 2.6, 0.03, 1.3, 1.3) // strings enter pianissimo

  // ============================== S11 endcard (85–90, C major resolves the A minor) ==============================
  // A beat of silence, plagal F→C cadence, motif resolved (head + leap to the tonic),
  // choir swell, water wash at the title sink, soft sub on the last chord. The final
  // chord rings past DUR on purpose — no mid-phrase fade.
  k.piano(85.55, 41, 0.11, 1.6) // F chord, piano
  k.piano(85.55, 48, 0.1, 1.6)
  k.piano(85.55, 53, 0.1, 1.6)
  k.strings(85.5, [53, 57, 60], 1.5, 0.03, 0.4, 0.5)
  k.piano(85.55, 72, 0.09, 1.3) // motif resolved: C5 E5 G5 | C6
  k.piano(86.15, 76, 0.09, 1.3)
  k.piano(86.75, 79, 0.09, 1.3)
  k.piano(87.3, 84, 0.13, 3.4)
  k.piano(87.3, 36, 0.15, 3) // home: C major, full
  k.piano(87.3, 48, 0.11, 3)
  k.piano(87.3, 55, 0.1, 3)
  k.piano(87.3, 60, 0.1, 3)
  k.piano(87.3, 64, 0.1, 3)
  k.strings(87.3, [48, 55, 60, 64], 2.6, 0.045, 0.6, 2.2) // rings past DUR — intentional end
  k.choir(86.9, [60, 64, 67], 2.4, 0.04, 'a', 1.1, 1.6)
  k.rain(EV.titleSinkStart.abs, 89.4, 0.05) // waterline wash through the title
  k.sub(87.32, 0.3, 65, 30, 2.2) // soft landing on the last chord
  k.tick(87.92, 0.05, 2200) // dry button under THE DOOR WAS BIG ENOUGH.
}
