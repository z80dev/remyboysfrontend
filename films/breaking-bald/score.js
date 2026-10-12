// =====================================================================
// BREAKING BALD — SCORE (composer cue sheet)
// =====================================================================
// Original music only. NO BB-theme echoes, no copyrighted melodies: the
// only cell is the timeline's BALD motif (D-F-A minor -> D-F#-A major at
// the end card — the mode flip IS the arc). Every cue is scheduled
// TOP-LEVEL in score(kit) (no nested registration — the renderScore
// flush bug); custom voices each register exactly one kit.at event and
// are themselves called top-level, so registration order == time order.
//
// Single source of truth: ./timeline.js (imported, never edited).
// Key plan: D minor (coldopen..classroom) -> E minor at SHADES_DOWN
// (32.3333, whole step up with the teal flip; cook/empire) -> D minor
// (saymyname) -> D MAJOR at ENDCARD_BB (94.0). Diner front-of-house is
// a plastic C-major jingle that dies on the pass-through.
//
// SILENCE DISCIPLINE (the three dies + the two hit-stop freezes):
//   classroom die   21.5 (panelIn)  piano/hum out; dead zone to the stamp
//   D.N.R. freeze   21.7143-22.0143 impact lands AT freeze start (its own
//                   envelope decays across the freeze); ONLY sub + hiss
//                   at +0.065 inside; strings re-enter at verdictIn 22.2
//   diner die       54.4 (backRoom) jingle's last note ends 54.34; room
//                   tone + vial clink only after the pass-through
//   dead beat       71.5 (deadBeat) everything drops to ONE sub pulse
//                   (ends 71.96); nothing onsets until THE SLAM
//   THE SLAM freeze 72.0-72.6       full braam+taiko+choir stack lands AT
//                   freeze start, tails ride the freeze per warp
//                   semantics; ONLY sub + hiss at +0.065 inside; low
//                   drone resumes exactly at slam + STOPS.saymyname[0].d
//
// DYNAMICS: sections sit within ~3 dB of each other; beds g 0.03-0.05,
// grooves g 0.15-0.45, normal hits g 0.5-0.85. Headroom is held for the
// two anchors: TITLE_SLAM 12.4 (braam 0.34 / impact 1.0) and THE SLAM
// 72.0 (braam 0.36 / impact 1.0 / taiko 0.95 / choir 0.12) — nothing
// else exceeds impact 0.85 / braam 0.24.
//
// END MATH: last onset = FINAL_HIT = CARD_END - 1.0 = 96.9 (softHit +
// starBell, custom voices, reverb send 0 — the world goes still). Last
// wet envelope = mode-flip strings, ends 94.0 + 1.8 + 1.0 = 96.8;
// 96.8 + 1.2 reverb = 98.0 = DUR. Card holds to CARD_END 97.9; all
// tails resolve into the cut — intentional ending, no abrupt stop.
//
// REQUESTED AUDIO BLOCK for film.js (composer asks, builder wires):
//   audio: { seed: 991, reverb: 1.2, reverbGain: 0.2 }
// =====================================================================
import {
  T,
  MASTER,
  STOPS,
  motif,
  beatSec,
  barSec,
  b,
  BALD_TIMES,
  CARD_END,
} from './timeline.js'

export const AUDIO_SUGGEST = { seed: 991, reverb: 1.2, reverbGain: 0.2 }

export function score(kit) {
  const {
    ac, R, hz, osc, noise, out, at,
    kick, clap, crash, bass, pluck, pad, bell, impact, riser,
    sweepDown, tick, drone, braam, taiko, strings, choir, sub,
    swell, wind, glass, clunk, hiss, crowd, whoosh,
  } = kit

  // ---------- derived constants (all timeline-derived, nothing hand-added) ----------
  const DN_RESUME = MASTER.dnStamp + STOPS.classroom[0].d    // 22.0143
  const SM_RESUME = MASTER.slam + STOPS.saymyname[0].d       // 72.6
  const FINAL_HIT = CARD_END - 1.0                           // 96.9 last onset of the film
  const CK_Q = beatSec('cook')                               // 0.46875 (128 bpm)
  const CK_E = CK_Q / 2
  const CK_END = T.diner - 0.55                              // 51.45 grid taper, clear of the cut

  // ===================================================================
  // custom voices (one kit.at event each, registered top-level only;
  // explicit envelopes, exponential ramps to positive floors, no raw
  // osc into the bus, no pan anywhere)
  // ===================================================================

  // felt piano: soft triangle/sine partials, slow attack — the classroom
  // lesson waltz and the finale confession (deliberately almost-solo)
  const felt = (t, m, g = 0.07, dur = 1.2) => at(t, () => {
    const f = hz(m)
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.09)
    a.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.3, dur))
    for (const [mult, w] of [[1, 1], [2.001, 0.22], [3.998, 0.06]]) {
      const o = osc('triangle', f * mult, t, dur + 0.1)
      const og = ac.createGain()
      og.gain.value = w
      o.connect(og).connect(a)
    }
    out(a, 1, 0.3)
  })

  // filtered-noise tick: clock ticks (decision), chalk/cash foley
  const noiseTick = (t, g = 0.05, f = 3000, dur = 0.05) => at(t, () => {
    const n = noise(t, dur + 0.03)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f
    bp.Q.value = 4
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.004)
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    n.connect(bp).connect(a)
    out(a, 1, 0.15)
  })

  // clippers: detuned saws through a lowpass, gated amp = dry electric buzz
  const buzz = (t, dur, g = 0.085) => at(t, () => {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 480
    lp.Q.value = 2
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.05)
    for (let k = 1; k * 0.11 < dur - 0.1; k++)
      a.gain.setValueAtTime(k % 2 ? g * 0.45 : g, t + k * 0.11)
    a.gain.setValueAtTime(g * 0.6, t + dur - 0.06)
    a.gain.linearRampToValueAtTime(0.0001, t + dur)
    for (const det of [-6, 5]) {
      const o = osc('sawtooth', 92, t, dur + 0.05)
      o.detune.value = det
      o.connect(lp)
    }
    lp.connect(a)
    out(a, 1, 0.05)
  })

  // cached periodic waves (template lineage): 12.5% duty pulse = thin hat
  const waves = {}
  const pulseWave = (duty) => {
    if (waves[duty]) return waves[duty]
    const n = 32
    const re = new Float32Array(n)
    const im = new Float32Array(n)
    for (let k = 1; k < n; k++) {
      re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.cos(k * Math.PI * duty)
      im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.sin(k * Math.PI * duty)
    }
    return (waves[duty] = ac.createPeriodicWave(re, im))
  }
  const pulseHat = (t, g = 0.045) => at(t, () => {
    const o = osc('square', 5600, t, 0.06)
    o.setPeriodicWave(pulseWave(0.125))
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.002)
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.045)
    o.connect(a)
    out(a, 1, 0.06)
  })

  // desert twang: square pluck with a fast pitch settle (flat -> pitch in
  // 38 ms) and a closing lowpass — the cook's twangy lead
  const twang = (t, m, g = 0.1, dur = 0.28) => at(t, () => {
    const o = osc('square', hz(m) * 0.968, t, dur + 0.06)
    o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.038)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.Q.value = 3
    lp.frequency.setValueAtTime(4200, t)
    lp.frequency.exponentialRampToValueAtTime(900, t + dur)
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.004)
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(lp).connect(a)
    out(a, 1, 0.2)
  })

  // heart: lub-dub double pulse (the say-my-name menace pulse)
  const heart = (t, g = 0.4) => at(t, () => {
    for (const [dt, k] of [[0, 1], [0.22, 0.68]]) {
      const o = osc('sine', 58, t + dt, 0.3)
      o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.14)
      const a = ac.createGain()
      a.gain.setValueAtTime(0.0001, t + dt)
      a.gain.linearRampToValueAtTime(g * k, t + dt + 0.006)
      a.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.19)
      o.connect(a)
      out(a, 1, 0.1)
    }
  })

  // softHit / starBell: the DRY final pair — reverb send 0 so nothing
  // rings past the card (see END MATH in the header)
  const softHit = (t, g = 0.3) => at(t, () => {
    const o = osc('sine', 88, t, 0.8)
    o.frequency.exponentialRampToValueAtTime(44, t + 0.35)
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.006)
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    o.connect(a)
    out(a, 1, 0)
    const n = noise(t, 0.1)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0.0001, t)
    ng.gain.linearRampToValueAtTime(g * 0.2, t + 0.004)
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
    n.connect(lp).connect(ng)
    out(ng, 1, 0)
  })
  const starBell = (t, f, g = 0.05, dur = 0.5) => at(t, () => {
    const bus = ac.createGain()
    for (const [r, w, d] of [[1, 1, 1], [2.756, 0.34, 0.7]]) {
      const o = osc('sine', f * r, t, dur * d + 0.05)
      const og = ac.createGain()
      og.gain.setValueAtTime(0.0001, t)
      og.gain.linearRampToValueAtTime(g * w, t + 0.004)
      og.gain.exponentialRampToValueAtTime(0.0001, t + dur * d)
      o.connect(og).connect(bus)
    }
    out(bus, 1, 0)
  })

  // ===================================================================
  // S1 COLDOPEN 0-10 (76bpm, bar 3.1579) — dawn dread: filtered wind,
  // low D drone, sub pulses on bars, the BALD cell (D-F-A) stated
  // bars 0/1/2, one bell tick on the crystal glint, riser into the cut.
  // ===================================================================
  wind(T.coldopen, MASTER.smashIn - 0.6, 0.05, 240, 950)      // dawn wind, out before the smash
  pad(T.coldopen, [38, 50], 9.4, 0.045, 420, 3.0)             // near-black D drone under everything
  const BALD_NOTES = motif(false)                             // [62, 65, 69] D-F-A
  for (let i = 0; i < 3; i++) {
    const tb = BALD_TIMES[i]                                  // 0 / 3.1579 / 6.3158 (bars 0/1/2)
    for (let k = 0; k < 3; k++)
      strings(tb + k * beatSec('coldopen'), [BALD_NOTES[k] - 12], i === 2 ? 2.2 : 2.6,
        0.028 + i * 0.011, 0.9, 0.6, 1100)                    // distant D3-F3-A3, dread rising
    sub(tb, 0.22 + i * 0.05, 55, 30, 1.8)                     // sub pulse on each bar
  }
  strings(MASTER.glint, [62], 2.4, 0.03, 1.1, 0.6, 1600)      // the cell surfaces an octave up
  bell(MASTER.glint, hz(86), 0.05, 1.2)                       // CRYSTAL_GLINT: one bell tick
  tick(MASTER.glint, 0.06, 5200)
  choir(MASTER.glintHold, [50, 53, 57], 1.4, 0.03, 'u', 0.8, 0.6) // held shimmer, out by 9.5
  riser(MASTER.smashIn - 1.0, MASTER.titlesIn, 0.16)          // 8.6 -> 10.0: resolves AT the cut

  // ===================================================================
  // S2 TITLES 10-16 (100bpm, bar 2.4) — dry element slams + geiger
  // ticks; the BIG braam lands exactly on TITLE_SLAM (bar 1, 12.4).
  // Hard out by 15.0 — the classroom fluorescent hum starts cold.
  // ===================================================================
  taiko(MASTER.brBox, 0.55, 58)                               // Br slams in
  impact(MASTER.brBox, 0.5, 58)
  tick(MASTER.brBox, 0.1, 5200)                               // geiger click
  taiko(MASTER.baBox, 0.5, 62)                                // Ba slams adjacent (bar 0 beat 2)
  tick(MASTER.baBox, 0.1, 5600)
  clunk(MASTER.boxesClick, 0.32)                              // the boxes click together
  tick(MASTER.boxesClick, 0.12, 6400)
  braam(MASTER.titleSlam, [38, 50], 2.4, 0.34, 1.0)           // BREAKING BALD — anchor hit #1
  impact(MASTER.titleSlam, 1.0, 50)
  taiko(MASTER.titleSlam, 0.85, 55)
  sub(MASTER.titleSlam, 0.4, 60, 30, 1.6)
  crash(MASTER.titleSlam, 0.07)                               // wash ends ~15.0, clear of the cut
  bell(MASTER.subtitleIn, hz(69), 0.045, 1.4)                 // subtitle settles: quiet A hum

  // ===================================================================
  // S3 CLASSROOM 16-27 (84bpm) — almost-solo felt piano waltz over a
  // fluorescent hum; chalk SFX; SCORE DIES at panelIn (21.5); the
  // D.N.R. impact lands AT the freeze start (21.7143), ONE sub+hiss
  // inside, cold strings re-enter at verdictIn and darken to grimRead.
  // ===================================================================
  drone(T.classroom, MASTER.panelIn, [45], 0.013, 260)        // fluorescent hum, ends AT the die
  for (let k = 0; k < 8; k++)                                 // tick-tock: D3 / A3 on the beats
    felt(T.classroom + k * beatSec('classroom'), k % 2 ? 57 : 50, 0.04, 0.34)
  felt(b('classroom', 0, 2), 65, 0.06, 0.5)                   // waltz melody: F4
  felt(b('classroom', 1, 0), 69, 0.06, 0.5)                   // A4
  felt(b('classroom', 1, 2), 67, 0.055, 0.5)                  // G4
  felt(b('classroom', 1, 3), 62, 0.06, 0.4)                   // D4 resolves at 21.0, out by 21.4
  tick(MASTER.chalkTap, 0.06, 2600)                           // chalk tap on the diagram
  hiss(MASTER.cough, 0.14, 0.045)                             // the cough into a fist
  hiss(MASTER.cough + 0.16, 0.12, 0.04)
  tick(MASTER.chalkDrop, 0.1, 1900)                           // chalk slips, bounces (ends by 21.4)
  tick(MASTER.chalkDrop + 0.09, 0.06, 2500)
  // --- D.N.R. STAMP 21.7143 = freeze start; impact rings across the 0.3 s stop ---
  impact(MASTER.dnStamp, 0.85, 48)
  taiko(MASTER.dnStamp, 0.7, 50)
  sub(MASTER.dnStamp + 0.065, 0.45, 60, 28, 0.5)              // freeze interior: ONE sub...
  hiss(MASTER.dnStamp + 0.065, 0.45, 0.06)                    // ...+ hiss ONLY
  strings(MASTER.verdictIn, [50, 53], 2.2, 0.045, 0.9, 0.6, 1400) // cold strings resume (22.2)
  strings(MASTER.grimRead, [38, 45], 1.8, 0.05, 0.8, 0.5, 800)    // darken to bar 3, out by 26.9

  // ===================================================================
  // S4 DECISION 27-36 (90bpm) — fluorescent drone builds, ticking clock
  // accelerates, clippers buzz, hair falls; KEY UP to E minor exactly on
  // SHADES_DOWN (bar 2, 32.3333): bare stab + cold pad bloom. Drone out.
  // ===================================================================
  drone(T.decision, MASTER.shadesDown, [38], 0.05, 420)       // D drone builds, ends AT the flip
  for (let k = 0; k < 4; k++)                                 // clock: quarters...
    noiseTick(b('decision', 0, k), 0.035, 2100)
  for (let k = 0; k < 7; k++)                                 // ...then 8ths, rising
    noiseTick(b('decision', 1, 0) + k * beatSec('decision') / 2, 0.04 + k * 0.004, 2100)
  buzz(MASTER.clippers, 1.0)                                  // clippers snap on (28.5)
  noiseTick(MASTER.firstPass, 0.05, 3200)                     // nervous tic on the first pass
  buzz(MASTER.firstPass + 0.6, 0.7, 0.075)                    // second pass
  hiss(MASTER.hairFalls, 0.5, 0.05)                           // red hair into the basin
  swell(MASTER.baldReveal, MASTER.shadesDown, 0.14)           // 31.6 -> 32.3333, ends AT the flip
  clunk(MASTER.hatOn, 0.18)                                   // the porkpie places
  // --- SHADES_DOWN 32.3333: the reveal IS the music — bare E-minor stab + cold bloom ---
  impact(MASTER.shadesDown, 0.7, 45)
  strings(MASTER.shadesDown, [40, 52, 59], 0.5, 0.11, 0.02, 0.3, 1600)
  pad(MASTER.shadesDown, [40, 52, 55, 59], 2.6, 0.04, 700, 0.9)   // cold E-minor pad bloom
  drone(MASTER.shadesDown + 0.1, T.cook - 0.15, [40, 52], 0.04, 400) // drone out to the cut

  // ===================================================================
  // S5 COOK 36-52 (128bpm, E minor) — THE driving section: kick on
  // beats, periodic-pulse hats on 8ths, saw ostinato, twangy lead
  // building each bar; riser resolves on the POUR (bar 5), groove drops
  // to half for two beats; PURE_STAMP (bar 6) = biggest hit of the
  // section; cash foley rides out; grid tapers before the cut.
  // ===================================================================
  const HALF0 = MASTER.pour                                   // 45.375 (bar 5)
  const HALF1 = MASTER.pour + 2 * CK_Q                        // two beats of half-time
  for (let t = T.cook; t < CK_END; t += CK_Q) {
    if (t >= HALF0 && t < HALF1) continue                     // the pour holds the beat down
    kick(t, 0.42 + 0.18 * ((t - T.cook) / 16))                // kick on beats, building
  }
  for (let t = T.cook + CK_E; t < CK_END; t += CK_E)
    pulseHat(t, t >= HALF0 && t < HALF1 ? 0.028 : 0.045)      // pulse-wave hats on 8ths
  const CK_OST = [40, 40, 47, 40, 40, 50, 47, 43]             // E pedal ostinato, 8ths
  for (let t = T.cook + CK_E, k = 1; t < CK_END - 0.1; t += CK_E, k++) {
    if (t >= HALF0 && t < HALF1) continue
    bass(t, CK_OST[k % 8], 0.3, 0.16 + 0.1 * ((t - T.cook) / 16), 'sawtooth', 620)
  }
  const CK_LEAD = [                                           // twang fragments, building per bar
    [[0, 52], [2, 55]],
    [[0, 52], [2, 55], [3, 57]],
    [[0, 52], [1, 55], [2, 57], [3, 59]],
    [[0, 64], [1, 62], [2, 59], [3, 62]],                   // montage 1 bar
    [[0, 64], [1, 67], [2, 64], [3, 62], [3.5, 59]],        // montage 2 bar
    [],                                                     // pour bar: the groove holds
    [],                                                     // stamp bar: the impact owns it
    [[0, 52], [1, 55], [2, 57], [3, 59]],
    [[0, 57]],                                              // final answer, out by 51.3
  ]
  for (let bar = 0; bar < CK_LEAD.length; bar++)
    for (const [bt, m] of CK_LEAD[bar]) twang(b('cook', bar, bt), m, 0.09 + bar * 0.004)
  tick(MASTER.flaskGlow, 0.07, 4800)                          // bar 1: first flask glows green
  bell(MASTER.vaporBlue, hz(83), 0.035, 0.9)                  // bar 2: the vapor turns BLUE
  tick(MASTER.vaporBlue, 0.06, 6200)
  taiko(MASTER.montage1, 0.45, 58)                            // montage cut fills
  tick(MASTER.montage1, 0.07, 5200)
  taiko(MASTER.montage2, 0.5, 62)
  tick(MASTER.montage2, 0.07, 5600)
  riser(MASTER.montage2, MASTER.pour, 0.2)                    // 43.5 -> 45.375, resolves AT the pour
  whoosh(MASTER.pour, 0.5, 0.24, 400, 5200)                   // molten blue pour (filtered noise)
  sub(MASTER.pour, 0.4, 70, 32, 1.2)
  taiko(MASTER.pureStamp, 0.9, 55)                            // 99.1% stamp — biggest hit here,
  impact(MASTER.pureStamp, 0.85, 45)                          // ON the downbeat
  braam(MASTER.pureStamp, [40, 52], 1.6, 0.24, 0.9)
  crash(MASTER.pureStamp, 0.09)
  for (let t = MASTER.cashStack; t < CK_END - 0.05; t += 0.18 + R() * 0.28)
    noiseTick(t, 0.025 + R() * 0.03, 2000 + R() * 2600)       // cash foley, seeded clatter

  // ===================================================================
  // S6 DINER 52-63 (100bpm) — the plastic LOS FLOWOS jingle (original,
  // C major, one bar) cuts DEAD on the pass-through (backRoom 54.4,
  // last note ends 54.34); room tone + vial clink in the back room;
  // low threat drone at hoodRow; tiny oblivious bounce; badge ping.
  // ===================================================================
  crowd(T.diner, MASTER.backRoom, 0.06)                       // front-of-house murmur, cut AT 54.4
  const JING = [60, 64, 67, 72, 76, 72, 67, 64]               // cheesy C-major jingle, 8 eighths
  const J_E = barSec('diner') / 8                             // 0.3 s
  for (let k = 0; k < 8; k++) {
    const jt = T.diner + k * J_E
    pluck(jt, JING[k], 0.06, 5200, 0.24, 'triangle')          // last note ends 54.34 — dead at 54.4
    if (k === 0 || k === 4) bell(jt, hz(JING[k] + 12), 0.035, 0.5)
  }
  hiss(MASTER.backRoom + 0.05, T.saymyname - MASTER.backRoom - 0.2, 0.026) // cold room tone
  bell(MASTER.backRoom + 0.45, 2350, 0.05, 0.5)               // the vial clink
  tick(MASTER.backRoom + 0.45, 0.05, 7000)
  drone(MASTER.hoodRow, T.saymyname - 0.15, [38, 45], 0.045, 380) // low threat under the rows
  pluck(MASTER.hankWatch, 76, 0.045, 3600, 0.2, 'triangle')   // Hank's oblivious bounce
  pluck(MASTER.hankWatch + 0.22, 79, 0.04, 3600, 0.2, 'triangle')
  bell(MASTER.badgeGlint, 3140, 0.06, 0.5, 4.1, 2.4)          // the badge ping
  tick(MASTER.badgeGlint, 0.06, 6800)

  // ===================================================================
  // S7 SAYMYNAME 63-77 (80bpm, D min) — stripped menace: low drone +
  // dry ticks + sub-kicks on bars + heart doubles; DEAD BEAT 71.5
  // drops to ONE sub pulse; THE SLAM (72.0) lands the full stack AT
  // freeze start, tails ride the 0.6 s freeze; drone resumes exactly at
  // slam + d, hollow open-fifth pad resolves to the cut.
  // ===================================================================
  drone(T.saymyname, MASTER.deadBeat, [38], 0.045, 450)       // ends EXACTLY at the dead beat
  for (let k = 0; k < 11; k++)                                // sparse dry ticks, one per beat
    noiseTick(T.saymyname + k * beatSec('saymyname'), k % 4 === 0 ? 0.04 : 0.028, 3400)
  for (let k = 0; k < 3; k++) kick(b('saymyname', k), 0.4)    // sub-kick on bars 0/1/2
  heart(b('saymyname', 0, 2), 0.34)                           // heart doubles under the ask
  heart(b('saymyname', 1, 2), 0.38)
  heart(MASTER.deadBeat - 1.1, 0.42)                          // last dub ends ~70.85, before the drop
  strings(MASTER.closeGus, [50], 1.9, 0.05, 0.7, 0.5, 1200)   // one low string on the close-up
  strings(MASTER.closeWalt, [46], 1.9, 0.055, 0.7, 0.5, 1100) // Bb darkens the answer, ends 71.4
  sub(MASTER.deadBeat, 0.45, 45, 30, 0.45)                    // THE DEAD BEAT: one pulse, ends 71.96
  // --- THE SLAM 72.0 = freeze start; the stack's tails ride the 0.6 s freeze ---
  impact(MASTER.slam, 1.0, 48)                                // anchor hit #2 — the biggest
  braam(MASTER.slam, [38, 50], 2.0, 0.36, 1.0)
  taiko(MASTER.slam, 0.95, 52)
  choir(MASTER.slam, [50, 53, 57], 1.4, 0.12, 'a', 0.02, 0.4)
  crash(MASTER.slam, 0.1)
  sub(MASTER.slam + 0.065, 0.5, 60, 26, 0.6)                  // freeze interior: sub + hiss ONLY
  hiss(MASTER.slam + 0.065, 0.5, 0.07)
  drone(SM_RESUME, SM_RESUME + 2.2, [38], 0.05, 450)          // resume 72.6: low drone only
  taiko(MASTER.kingpinTurn, 0.22, 46)                         // the turn (post-stop EV, warp-corrected)
  pad(MASTER.holdWide - 0.8, [38, 45], 2.5, 0.04, 650, 1.4)   // hollow open fifth -> 76.9
  sub(MASTER.holdWide, 0.28, 48, 30, 1.4)                     // wide hold: one last pulse

  // ===================================================================
  // S8 EMPIRE 77-86 (132bpm) — machine montage: one tight hit per bar-
  // cut (5 cuts), escalating gains, kick on 2-and-4 beneath, no melody
  // (money has no theme), riser into the finale.
  // ===================================================================
  clap(MASTER.cashWalls, 0.42)                                // cut 1: cash walls
  tick(MASTER.cashWalls, 0.09, 3200)
  kick(MASTER.cashWalls, 0.34)
  bell(MASTER.chandelier, 2093, 0.09, 1.0)                    // cut 2: crystal chandelier shimmer
  glass(MASTER.chandelier, 0.12, 0.9)
  tick(MASTER.chandelier, 0.08, 6000)
  clunk(MASTER.barrels, 0.5)                                  // cut 3: barrel field clunk
  impact(MASTER.barrels, 0.65, 48)
  glass(MASTER.teddy, 0.16, 1.1)                              // cut 4: the teddy's pool splash
  sub(MASTER.teddy, 0.38, 68, 30, 1.1)
  impact(MASTER.teddy, 0.75, 42)
  sweepDown(MASTER.skyline, 1.4, 1600, 180, 0.2, 'sine')      // cut 5: dusk sweep down
  taiko(MASTER.skyline, 0.5, 50)
  for (let k = 0; k < 5; k++) {
    kick(b('empire', k, 1), 0.26)                             // 2-and-4 pulses beneath
    kick(b('empire', k, 3), 0.22)
  }
  riser(T.finale - 1.0, T.finale, 0.16)                       // 85 -> 86: into the confession

  // ===================================================================
  // S9 FINALE 86-98 (90bpm) — bare felt piano confession (the BALD cell
  // stated minor across bars 1-2), night wind, warm low strings at the
  // crane pull-up; MODE FLIP to D MAJOR on the end card (94.0): the
  // same cell re-harmonized D-F#-A over star-field strings; final soft
  // impact + bell DRY at 96.9; all tails resolve before DUR (END MATH).
  // ===================================================================
  wind(T.finale, FINAL_HIT - 0.4, 0.04, 300, 850)             // night wind under the confession
  const CONF = [                                              // bare piano, D minor, slow
    [T.finale, 50, 0.09, 2.2],                                // D3 alone
    [b('finale', 0, 2), 57, 0.08, 2.0],                       // A3
    [MASTER.shadesOff, 62, 0.09, 2.2],                        // bar 1: D4 — shades off
    [b('finale', 1, 2), 65, 0.08, 2.0],                       // F4
    [MASTER.pullUp, 64, 0.09, 2.0],                           // bar 2: E4 as the crane rises
    [b('finale', 2, 2), 69, 0.07, 1.6],                       // A4 — the cell hangs minor
  ]
  for (const [t, m, g, d] of CONF) felt(t, m, g, d)
  strings(MASTER.shadesOff, [45], 2.4, 0.04, 1.2, 0.8, 1200)  // soft swell, ends 92.3
  strings(MASTER.pullUp, [38, 50], 2.4, 0.05, 1.0, 0.2, 900)  // low strings rise, end AT the flip
  const MAJ = motif(true)                                     // [62, 66, 69] D-F#-A — the payoff
  felt(MASTER.endCard, MAJ[0], 0.09, 1.4)                     // the same cell, now major
  felt(b('finale', 3, 1), MAJ[1], 0.08, 1.2)                  // F#4
  felt(b('finale', 3, 2), MAJ[2], 0.08, 1.2)                  // A4
  strings(MASTER.endCard, [50, 57, 62, 66], 1.8, 0.07, 0.25, 1.0, 2400) // env ends 96.8 (wet tail 98.0)
  choir(MASTER.endCard, [62, 66, 69], 1.6, 0.05, 'a', 0.5, 0.9)         // env ends 96.5
  pad(MASTER.endCard, [38, 50, 54], 2.2, 0.035, 900, 0.8)               // D-F#-A bloom, ends 96.4
  bell(MASTER.endCard + 0.4, 3136, 0.03, 0.8)                 // star-field sparkles
  bell(MASTER.endCard + 1.2, 3729, 0.025, 0.7)
  softHit(FINAL_HIT, 0.3)                                     // final soft impact — DRY, send 0
  starBell(FINAL_HIT, hz(74), 0.05, 0.5)                      // final bell — last onset, 96.9
}

export default score
