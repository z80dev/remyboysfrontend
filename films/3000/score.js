// =====================================================================
// 3000 — SCORE (composer cue sheet)
// =====================================================================
// Original music only. Every cue is scheduled TOP-LEVEL in score(kit)
// (no nested registration — the renderScore flush bug). kit.at() is not
// used at all: every cue is a direct deferred kit-instrument call, so
// registration order == time order by construction.
//
// Single source of truth: ./timeline.js (imported, never edited).
// Key plan: D minor (prologue..phalanx) -> D phrygian dark (xerxes)
// -> E minor (storm keys +2 at 80.0; laststand) -> D MAJOR (plataea
// mode flip at 95.0). SHEARTA D-F-G-A stated by the duduk pluck in the
// wolf shot, restated MAJOR (timeline motif(true) = D-F#-A-B) as the
// end-card fanfare.
//
// SILENCE DISCIPLINE (hit-stops / freezes / snip mute):
//   wolf lunge      16.50-16.85  no cues inside (wind bed continues by design)
//   THE KICK        30.4348-30.9848  ONLY sub thud + hiss inside (30.5);
//                   the kick accent's own envelopes decay across the
//                   freeze, the choir stab is cut exactly at resume
//   wallSlam        49.00-49.30  no cues inside (crash gong-wash decays)
//   kill1 / kill2   53.40-53.65 / 57.80-58.05  mix driven dead: the
//                   combat drive stops >= 0.45 s before each kill so
//                   taiko tails are < 1% at the stop
//   snip mute       83.50-84.00  one bell ping + hiss AT 83.5, clatter
//                   grid and all beds end exactly at 83.5
//   hurl freeze     93.50-95.00  ONLY heartbeat 93.9 + heartbeat 94.4 +
//                   final braam 94.9 ("into the cut")
//
// QA BALANCE TRIMS (motion-QA 30fps draft verdict — optional fix taken):
//   kick + kit.bass gains ×0.71 (≈ −3 dB) ONLY inside [33, 37.5) (march
//   start) and [48.3, 54.5) (phalanx slam/contact). Cue times, counts and
//   coverage unchanged; silence windows untouched; all other gains stock.
//
// END MATH: last scheduled cue = 100.6 (final fanfare note).
// 100.6 + 3.2 s reverb = 103.8 <= 103.9 (cardEnd). With the requested
// reverb: 1.4 the actual last audible tail is ~103.9 as well (last
// strings envelope ends 102.5 + 1.4). Tails resolve before the card.
//
// REQUESTED AUDIO BLOCK for film.js (composer asks, builder wires):
//   audio: { seed: 3000, reverb: 1.4, reverbGain: 0.22 }
// =====================================================================
import {
  T,
  MASTER,
  STOPS,
  motif,
  beatSec,
} from './timeline.js'

export function score(kit) {
  const {
    kick, hat, crash, bass, pluck, pad, bell, impact, riser,
    taiko, strings, choir, piano, sub, swell, wind, clunk, hiss,
    heartbeat, crowd, whoosh, tick, drone, braam, hz, R,
  } = kit

  // ---------- derived constants (all clock/truth-derived, nothing hand-added) ----------
  const KICK = MASTER.kick                                    // 30.4348 = b('emissary',4)
  const KICK_RESUME = KICK + STOPS.emissary[0].d              // 30.9848
  const WALL_RESUME = MASTER.wallSlam + STOPS.phalanx[0].d    // 49.30
  const K1_RESUME = MASTER.kill1 + STOPS.phalanx[1].d         // 53.65
  const K2_RESUME = MASTER.kill2 + STOPS.phalanx[2].d         // 58.05
  const FREEZE_END = MASTER.freeze + STOPS.laststand[0].d     // 95.0 (the cut)
  const SNIP_MUTE_END = MASTER.snip + beatSec('storm')        // 84.0 (one 120bpm beat)
  const EMIS_8 = beatSec('emissary') / 2                      // 0.3261
  const MARCH_Q = beatSec('march')                            // 0.6522
  const PH_Q = beatSec('phalanx')                             // 0.5
  const PH_16 = PH_Q / 4                                      // 0.125
  const ST_Q = beatSec('storm')                               // 0.5
  const ST_16 = ST_Q / 4                                      // 0.125
  const PL_Q = beatSec('plataea')                             // 0.625

  // ---------- QA balance trims (see header): kick/bass −3 dB in two windows ----------
  const TRIM_K = 0.71                                         // ≈ −3 dB
  const TRIM_A = [T.march, 37.5]                              // QA window 1: march start
  const TRIM_B = [48.3, 54.5]                                 // QA window 2: slam/contact
  const duck = (g, t) =>
    (t >= TRIM_A[0] && t < TRIM_A[1]) || (t >= TRIM_B[0] && t < TRIM_B[1])
      ? g * TRIM_K
      : g

  // =====================================================================
  // S1 PROLOGUE 0-10 (96bpm, bar 2.5) — near-black drone, ember crackle,
  // lone taiko heartbeat, braam at the title slam, sub swell out.
  // =====================================================================
  wind(0.0, T.wolf, 0.06, 300, 900)                    // windIn / emberT0 / narratorIn bed
  pad(0.0, [38, 50], 9.6, 0.045, 520, 3.2)             // near-black D drone, slow attack
  for (let t = 0.35; t < 9.4; t += 0.45 + R() * 0.95)  // seeded ember-noise crackle
    tick(t, 0.014 + R() * 0.02, 2200 + R() * 2600)
  pad(MASTER.fadeUp, [45], 8.4, 0.028, 800, 2.6)       // 1.2 fade-up: add the fifth
  braam(MASTER.titleSlam, [38, 50], 2.2, 0.34, 1.0)    // 2.5 TITLE SLAM — the braam
  impact(MASTER.titleSlam, 0.6, 55)                    // dust-hit
  taiko(MASTER.titleSlam, 0.6, 55)
  bell(MASTER.subtitle, hz(69), 0.05, 1.5)             // 3.2 subtitle settles: quiet A hum
  taiko(MASTER.heartbeatOut, 0.5, 55)                  // 5.0 distant lone heartbeat...
  sub(MASTER.heartbeatOut, 0.22, 60, 35, 1.1)
  taiko(MASTER.heartbeatOut + 2.5, 0.42, 55)           // ...again on bar 3 (7.5)
  sub(8.6, 0.28, 55, 30, 1.4)                          // sub swell out toward the cut

  // =====================================================================
  // S2 WOLF 10-20 (75bpm, half-note grid) — blizzard, duduk-ish plucked
  // SHEARTA D-F-G-A, sparse heartbeat, whip + impact at the lunge.
  // =====================================================================
  wind(T.wolf, T.emissary, 0.13, 500, 2200)            // blizzard bed (continues through
                                                       // the hit-stop: "near-silence except wind")
  pad(T.wolf, [50], 6.5, 0.035, 700, 2.0)              // D drone, ends AT the freeze start
  const shTimes = [MASTER.shearta1, MASTER.shearta2, MASTER.shearta3, MASTER.shearta4]
  const shNotes = motif(false)                         // [62, 65, 67, 69] D-F-G-A
  for (let k = 0; k < 4; k++) {
    pluck(shTimes[k], shNotes[k], 0.15, 2400, 1.35, 'square')     // reedy duduk pluck
    pluck(shTimes[k] + 0.02, shNotes[k] + 12, 0.05, 4200, 0.7, 'triangle') // breath shimmer
  }
  heartbeat(MASTER.wolfCircle, 0.4)                    // 13.0 sparse heartbeat while it circles
  heartbeat(15.3, 0.35)                                // tension pickup before the lunge
  swell(MASTER.wolfTheme, MASTER.wolfLunge, 0.12)      // 16.0 theme swell rises into contact
  whoosh(MASTER.wolfLeaps, 0.4, 0.22, 400, 4000)       // 16.1 the whip
  impact(MASTER.wolfLunge, 0.85, 60)                   // 16.5 comb-flash = freeze start
  tick(MASTER.wolfBald, 0.12, 5200)                    // 18.35 the stripe catches light
  pluck(MASTER.wolfBald, 74, 0.06, 5000, 0.4, 'triangle')

  // =====================================================================
  // S3 EMISSARY 20-33 (92bpm) — pulsing bass ostinato builds, score drops
  // at THE BEAT (29.4), riser into THE KICK; freeze = sub+hiss only;
  // resume battery; THIS! / IS! / SHEARTA! word slams; hard cut at 33.
  // =====================================================================
  wind(T.emissary, MASTER.beat, 0.05, 600, 1400)       // dawn breeze, dies at THE BEAT
  pad(T.emissary, [50, 53, 57], 9.0, 0.026, 850, 1.6)  // tense Dm marble pad -> 29.0
  pluck(20.0, 62, 0.1, 3000, 0.3, 'sawtooth')          // banner flick
  pluck(20.0 + EMIS_8, 65, 0.09, 3000, 0.3, 'sawtooth')
  pluck(20.0 + 2 * EMIS_8, 69, 0.08, 3000, 0.3, 'sawtooth')
  const OST = [0, 0, 7, 0, 0, 10, 7, 0]                // D pedal ostinato, 8ths, building
  let oi = 0
  for (let t = T.emissary; t < MASTER.beat - 0.32; t += EMIS_8, oi++) {
    const build = (t - T.emissary) / (MASTER.beat - T.emissary)
    bass(t, 38 + OST[oi % 8], 0.28, 0.16 + 0.15 * build, 'sawtooth', 700 + 250 * build)
  }
  piano(MASTER.emLine2, 62, 0.12, 2.0)                 // 23.45 dark piano under the line
  taiko(MASTER.defiance, 0.55, 58)                     // 26.0 spear plants
  bass(MASTER.defiance, 38, 0.6, 0.3, 'sawtooth', 800)
  piano(MASTER.emLine3, 61, 0.1, 1.6)                  // 26.95 "Madness?" — C# leading-tone tension
  riser(MASTER.beat, MASTER.kick, 0.2)                 // 29.4 THE BEAT: everything else is out
  // --- THE KICK 30.4348 + THIS! (freeze launch accent) ---
  impact(MASTER.kick, 1.0, 50)
  choir(MASTER.kick, [50, 53, 57, 64], 0.5, 0.15, 'a', 0.02, 0.05) // Dm add9 stab, cut AT resume
  taiko(MASTER.kick, 0.9, 58)
  sub(KICK + 0.065, 0.45, 65, 28, 0.5)                 // freeze interior: one sub thud...
  hiss(KICK + 0.065, 0.45, 0.07)                       // ...+ hiss ONLY
  // --- resume 30.9848: landing battery + choir re-stab ---
  impact(KICK_RESUME, 0.8, 55)
  choir(KICK_RESUME, [50, 57, 62], 0.5, 0.12, 'o', 0.02, 0.3)
  taiko(KICK_RESUME, 0.8, 62)
  taiko(KICK + 0.6522, 0.5, 62)                        // next 92bpm quarter (31.087)
  // --- pinwheel 31.55 ---
  whoosh(MASTER.pinwheel, 0.35, 0.18, 600, 300)        // downward pinwheel whip
  clunk(MASTER.pinwheel, 0.4)
  // --- IS! 31.75 ---
  impact(MASTER.kickWordIs, 0.9, 52)
  crash(MASTER.kickWordIs, 0.1)                        // low wash (tails under the march cut)
  taiko(MASTER.kickWordIs, 0.85, 58)
  // --- SHEARTA! 32.45 (biggest) ---
  impact(MASTER.kickWordShearta, 1.0, 48)
  crash(MASTER.kickWordShearta, 0.14)
  taiko(MASTER.kickWordShearta, 0.95, 55)
  braam(MASTER.kickWordShearta, [38, 50], 0.55, 0.3, 0.8) // ends exactly at the 33.0 cut
  choir(MASTER.kickWordShearta, [50, 53, 57, 62], 0.4, 0.14, 'a', 0.02, 0.1)

  // =====================================================================
  // S4 MARCH 33-45 (92bpm) — trudging taiko backbeat, low saw bass riff,
  // boots on the grid; camp halves the groove + whetstone shings;
  // barbershop-pole music-hall wink at 40.8261; dine verse under 41-44.8.
  // =====================================================================
  const MPOS = [38, 38, 45, 36]                        // D D A C bar riff
  let mi = 0
  for (let t = MASTER.marchStep0; t < MASTER.camp - 1e-9; t += MARCH_Q, mi++) {
    const pos = mi % 4
    if (pos === 0 || pos === 2) taiko(t, pos === 0 ? 0.72 : 0.5, 62)
    else kick(t, duck(0.45, t))
    if (pos === 1 || pos === 3) clunk(t, 0.16)         // boots
    hat(t + MARCH_Q / 2, 0.04, 0.04)                   // off-8th brush
    bass(t, MPOS[pos], MARCH_Q * 0.92, duck(0.24, t), 'sawtooth', 620)
  }
  pad(MASTER.seaGag, [38, 45], 3.2, 0.026, 700, 1.4)   // 36.0 Sea-of-Forehead gag hold
  tick(MASTER.camp, 0.13, 6000)                        // 39.5 whetstone shing-shing
  tick(MASTER.camp + 0.42, 0.1, 6600)
  tick(MASTER.camp + 0.88, 0.12, 5800)
  taiko(MASTER.camp, 0.5, 58)                          // groove halves at camp
  const poleWink = [74, 78, 81, 86]                    // D5 F#5 A5 D6 — absurd MAJOR wink
  for (let k = 0; k < 4; k++)
    bell(MASTER.poleReveal + k * 0.25, hz(poleWink[k]), 0.06, 0.5) // 40.8261 one bar, music hall
  piano(MASTER.dine, 38, 0.17, 3.0)                    // 41.0 "dine in Bald" — low grinning D
  pad(MASTER.dine, [50, 53], 3.6, 0.03, 800, 1.2)      // half-density verse bed -> 44.6
  bass(MASTER.poleReveal, 38, 1.3, 0.2, 'sawtooth', 560)
  taiko(43.4348, 0.45, 58)                             // bar 5 downbeat of the march grid
  bass(43.4348, 41, 1.2, 0.2, 'sawtooth', 560)         // ends 44.63, clear of the pass

  // =====================================================================
  // S5 PHALANX 45-62 (120bpm, double-time) — HOLD = pulsing strings,
  // wallSlam gong, 16th taiko drive with kills driven DEAD, wave break,
  // one bored reform grin, then breath before Xerxes.
  // =====================================================================
  taiko(MASTER.phalanxIn, 0.55, 58)                    // 45.0 downbeat
  bass(MASTER.phalanxIn, 38, 1.0, 0.26, 'sawtooth', 600)
  whoosh(MASTER.persiansCharge - 0.1, 0.35, 0.12, 500, 2800) // 45.3 wave crests
  for (let k = 0; k < 4; k++)                          // 45.4 charge roll (accelerating 16ths)
    taiko(MASTER.persiansCharge + k * PH_16, 0.38 - k * 0.05, 62)
  for (let t = MASTER.phalanxHold; t + 0.4 <= MASTER.wallSlam + 1e-9; t += PH_Q)
    strings(t, [62], 0.3, 0.032, 0.04, 0.1, 3300)      // "HOLD... HOLD..." trem pulses
  for (let t = 47.0, k = 0; t < MASTER.wallSlam - 1e-9; t += PH_Q / 2, k++) {
    hat(t, 0.05, 0.04)                                 // pre-slam build (bar 2 of the pass)
    if (k % 2) taiko(t, 0.3, 62)
  }
  // --- WALL SLAM 49.0 (0.3 s freeze; crash = gong wash by design) ---
  impact(MASTER.wallSlam, 1.0, 50)
  taiko(MASTER.wallSlam, 1.0, 50)
  crash(MASTER.wallSlam, 0.12)
  kick(MASTER.wallSlam, duck(0.9, MASTER.wallSlam))
  // --- combat: three drive segments, each ending >= 0.45 s before a kill stop ---
  const driveSegs = [
    [WALL_RESUME, MASTER.kill1 - 0.5],
    [K1_RESUME + 0.1, MASTER.kill2 - 0.5],
    [K2_RESUME + 0.075, MASTER.waveBreaks],
  ]
  const DRIVE_G = [0.5, 0.16, 0.32, 0.16]
  for (const [s0, s1] of driveSegs) {
    let k = 0
    for (let t = s0; t < s1 - 1e-9; t += PH_16, k++) {
      const pos = k % 4
      taiko(t, DRIVE_G[pos], pos === 0 ? 52 : 62)      // 16th machine drive
      hat(t, 0.045, 0.03)
      if (pos === 0) {
        kick(t, duck(0.5, t))
        bass(t, 38, 0.22, duck(0.3, t), 'sawtooth', 650) // brass-style low stabs on the beat
      }
    }
  }
  for (let t = 49.5; t + 0.4 <= MASTER.kill1 - 1e-9; t += PH_Q)   // trem pulses resume/seg1
    strings(t, [62], 0.3, 0.03, 0.04, 0.1, 3300)
  strings(MASTER.contact, [38, 45], 2.8, 0.05, 0.8, 0.0, 1200)    // 50.5 slow-mo smear -> 53.3
  for (let t = 54.0; t + 0.4 <= MASTER.kill2 - 1e-9; t += PH_Q)   // pulses between the kills
    strings(t, [62], 0.3, 0.03, 0.04, 0.1, 3300)
  for (let t = 58.5; t + 0.4 <= MASTER.waveBreaks - 1e-9; t += PH_Q)
    strings(t, [62], 0.3, 0.03, 0.04, 0.1, 3300)
  // --- kills: accent AT the stop start, mix dead inside ---
  impact(MASTER.kill1, 0.85, 48)
  bass(MASTER.kill1, 38, 0.25, duck(0.34, MASTER.kill1), 'sawtooth', 520) // brass stab, ends exactly at resume
  taiko(MASTER.kill1, 0.85, 48)
  impact(MASTER.kill2, 0.85, 48)
  bass(MASTER.kill2, 38, 0.25, duck(0.34, MASTER.kill2), 'sawtooth', 520) // outside trim windows: stock gain
  taiko(MASTER.kill2, 0.85, 48)
  // --- wave breaks 59.8 -> sparse dust ---
  crash(MASTER.waveBreaks, 0.16)
  crowd(MASTER.waveBreaks, MASTER.reform, 0.09)        // fleeing army
  taiko(MASTER.waveBreaks, 0.5, 58)
  taiko(60.1, 0.3, 62)
  taiko(60.55, 0.2, 62)
  taiko(MASTER.reform, 0.42, 55)                       // 61.0 bored grin, then silence
  tick(MASTER.reform, 0.07, 3000)

  // =====================================================================
  // S6 XERXES 62-74 (60bpm half-time, D phrygian) — dread drone, 8-bearer
  // lumber (heavy taiko + sub), Gm->Cm wide dark pad, mocking music-box
  // wig offer, refusal octave stab, riser into the storm.
  // =====================================================================
  drone(MASTER.xerxesShadow, T.storm, [38], 0.045, 420)     // 62.0 shadow bed, ends at 74.0
  taiko(MASTER.xerxesEnter, 0.85, 45)                       // 62.5 gong bloom
  swell(MASTER.xerxesEnter, MASTER.xerxesLine1, 0.14)
  sub(MASTER.xerxesEnter, 0.45, 50, 28, 2.4)
  for (let t = 63.0; t < 73.0 - 1e-9; t += 2.0) {           // lumber: 63..71, every 2 s
    taiko(t, 0.72, 52)
    sub(t, 0.32, 55, 30, 1.8)
    clunk(t + 1.0, 0.2)                                     // bearers' step off-beat
  }
  pad(MASTER.xerxesLine1, [43, 50, 55, 58], 4.0, 0.05, 900, 1.2) // 63.5 Gm -> 67.5
  bell(MASTER.immortals, 3140, 0.045, 0.9, 4.1, 2.6)        // 65.5 chrome-mask glint
  tick(MASTER.immortals, 0.06, 6000)
  const box = [74, 78, 81, 86]                              // music-box mockery: D major tweak
  for (let k = 0; k < 4; k++)
    pluck(MASTER.wigOffer + k * 0.25, box[k], 0.09, 5200, 0.3, 'triangle') // 67.5 the GOLDEN WIG
  pad(MASTER.xerxesLine2, [48, 55, 58, 63], 4.5, 0.05, 860, 1.2) // 68.0 Cm -> 72.5
  heartbeat(MASTER.stepUp, 0.45)                            // 70.5 Leonidhair steps up
  bass(MASTER.stepUp, 38, 2.0, 0.22, 'sawtooth', 420)       // ends at the refusal
  strings(MASTER.refusal, [50, 62], 0.8, 0.12, 0.02, 0.4, 3000) // 72.5 bare octave stab
  taiko(MASTER.refusal, 0.7, 50)
  heartbeat(MASTER.refusal, 0.45)
  riser(73.5, T.storm, 0.13)                                // spear-raise riser into the storm

  // =====================================================================
  // S7 STORM 74-86 (120bpm) — whisper riser, machine-percussion clatter
  // (hat/tick/clunk 16ths, seeded, accelerating), strings tremolo, KEY UP
  // +2 at 80.0, snip mute 83.5-84.0 (one ping), taper to 86.
  // =====================================================================
  riser(T.storm, 78.0, 0.1)                            // whisper riser 74-78
  wind(T.storm, MASTER.snip, 0.06, 2200, 3800)         // sky bed, ends exactly at the snip
  piano(MASTER.arrowsLine, 50, 0.11, 2.0)              // 74.8 dark D under the officer
  for (let t = 78.0; t < MASTER.blacken - 1e-9; t += ST_Q / 2) {  // 8ths: first clatter seeds
    hat(t, 0.05 + R() * 0.04, 0.05)
    if (R() < 0.35) tick(t + ST_16, 0.03 + R() * 0.03, 3800 + R() * 3600)
  }
  taiko(78.0, 0.45, 58)                                // clatter phase downbeat
  tick(MASTER.grin, 0.14, 7000)                        // 78.6 the grin — metal shink
  taiko(MASTER.grin, 0.4, 58)
  strings(MASTER.shadeLine, [74], 4.5, 0.035, 0.4, 0.0, 4200) // 79.0 high D5 trem -> 83.5 exact
  riser(MASTER.blacken, MASTER.stormPeak, 0.17)        // 79.6 sky blackens
  for (let t = MASTER.stormPeak; t < MASTER.snip - 1e-9; t += ST_16) { // full 16th clatter 80-83.5
    hat(t, 0.06 + R() * 0.05, 0.04)
    if (R() < 0.4) tick(t, 0.03 + R() * 0.04, 3600 + R() * 4200)
    if (R() < 0.16) clunk(t, 0.12 + R() * 0.16)
  }
  impact(MASTER.stormPeak, 0.6, 55)                    // 80.0 KEY UP +2 (E minor marker)
  crash(MASTER.stormPeak, 0.14)
  taiko(MASTER.stormPeak, 0.6, 58)
  strings(MASTER.stormPeak, [64, 76], 3.5, 0.045, 0.05, 0.0, 4400) // E4+E5 trem -> 83.5 exact
  clunk(MASTER.roofLock, 0.5)                          // 80.6 shields lock
  clunk(MASTER.roofLock + 0.12, 0.35)
  taiko(MASTER.roofLock, 0.55, 55)
  clunk(MASTER.clatter, 0.3)                           // 81.0 full machine-percussion accent
  hat(MASTER.clatter, 0.12, 0.06)
  tick(MASTER.clatter, 0.08, 5200)
  taiko(82.0, 0.5, 55)                                 // mid-storm pulse
  // --- SNIP 83.5: everything else is already out; ONE ping + hiss ---
  tick(MASTER.snip, 0.22, 5200)
  bell(MASTER.snip, 2400, 0.09, 0.45, 3.5, 2.2)        // the single snipped strand
  hiss(MASTER.snip, 0.35, 0.05)
  for (let t = SNIP_MUTE_END; t < T.laststand - 1e-9; t += ST_16) { // resume 84.0, taper
    const k = 1 - (t - SNIP_MUTE_END) / 2.0
    if (t < 84.5 || R() < 0.7) hat(t, (0.05 + R() * 0.05) * (0.4 + 0.6 * k), 0.04)
    if (R() < 0.2 * k) tick(t, 0.03 * (0.5 + k), 3200 + R() * 3000)
  }
  wind(SNIP_MUTE_END, T.laststand, 0.05, 3200, 700)    // wind tapers 84-86
  strings(MASTER.smile, [62, 66], 1.0, 0.05, 0.15, 0.4, 2400) // 84.5 D-F# warmth (major 3rd wink)
  piano(MASTER.smile, 66, 0.09, 1.2)

  // =====================================================================
  // S8 LASTSTAND 86-95 (90bpm, E minor) — drone + slowing heartbeats,
  // rising sub + reverse swell under the run-up, whoosh at the hurl,
  // thinning held string to 93.5, TOTAL SILENCE, two heartbeats, one braam.
  // =====================================================================
  drone(MASTER.laststandDust, MASTER.freeze, [40, 52], 0.042, 460) // E drone 86 -> 93.5 EXACT
  heartbeat(86.0, 0.4)                                 // heartbeat slowing: 2.3 s then 2.8 s apart
  heartbeat(88.3, 0.35)
  heartbeat(91.1, 0.3)                                 // its "dub" lands on the hurl
  sub(MASTER.runUp, 0.35, 30, 80, 4.33)                // 87.0 rising sub, ends at the hurl
  swell(MASTER.runUp, MASTER.hurl, 0.16)               // reverse swell resolving at 91.3333
  whoosh(MASTER.hurl, 0.5, 0.3, 300, 4500)             // THE HURL
  strings(MASTER.spearFlight, [71], 2.0, 0.038, 0.9, 0.0, 2600) // single held B4 -> 93.5 EXACT
  // MASTER.freeze 93.5 = TOTAL SILENCE — deliberately ZERO calls (the cue IS the silence)
  heartbeat(MASTER.heartbeat1, 0.5)                    // 93.9 lub
  heartbeat(MASTER.heartbeat2, 0.45)                   // 94.4 dub
  braam(94.9, [38, 50], 0.62, 0.3, 0.55)               // the final braam, INTO the cut at 95.0

  // =====================================================================
  // S9 PLATAEA 95-104 (96bpm, D MAJOR — the mode flip) — dawn bloom,
  // Dilios hymn, galloping charge with bass-saw fanfare, end-card
  // SHEARTA-major fanfare; last cue 100.6, tails resolve <= 103.8.
  // =====================================================================
  strings(MASTER.plataeaDawn, [50, 57, 62, 66], 3.0, 0.06, 1.2, 1.0, 2400) // D MAJOR bloom
  choir(MASTER.modeFlip, [62, 66, 69], 3.5, 0.05, 'o', 1.5, 1.2)           // mode flip at 95.0
  pad(95.0, [38, 50, 54], 4.0, 0.04, 850, 2.0)                             // warm D-F# bed
  piano(MASTER.dilios, 62, 0.13, 2.6)                  // 95.5 Dilios
  choir(MASTER.remember, [50, 57], 2.6, 0.055, 'a', 0.6, 0.8) // 95.9 "Remember why they fell."
  strings(MASTER.spearsRise, [62, 66, 69], 0.45, 0.07, 0.04, 0.2, 3200) // 97.0 spears rise
  riser(MASTER.spearsRise, MASTER.charge, 0.12)
  // --- CHARGE 97.5: galloping taiko + bass-saw fanfare + choir ---
  const FANF_CHARGE = [62, 66, 69, 74]                 // D4 F#4 A4 D5 (major, rising)
  for (let k = 0; k < 4; k++) {
    const bt = MASTER.charge + k * PL_Q
    taiko(bt, 0.6, 58)                                 // gallop: da-da-DUM per beat
    taiko(bt + 0.2083, 0.28, 62)
    taiko(bt + 0.4167, 0.42, 62)
    bass(bt, FANF_CHARGE[k], 0.5, 0.3, 'sawtooth', 1100)
    pluck(bt, FANF_CHARGE[k] + 12, 0.07, 5000, 0.3, 'triangle')
  }
  choir(MASTER.charge, [50, 62, 66], 1.8, 0.07, 'a', 0.1, 0.5) // -> 99.8, clear of the card
  // --- END CARD 100.0: full SHEARTA-MAJOR fanfare (timeline motif(true)) ---
  const motifMajor = motif(true)                       // [62, 66, 69, 71] D-F#-A-B
  const FC = [0.0, 0.2, 0.4, 0.6]                      // fanfare spacing; LAST CUE = 100.6
  braam(MASTER.endCard, [38, 50, 62], 2.2, 0.32, 1.0)
  impact(MASTER.endCard, 0.7, 50)
  crash(MASTER.endCard, 0.2)
  sub(MASTER.endCard, 0.4, 60, 30, 2.0)
  strings(MASTER.endCard, [50, 57, 62, 66], 2.0, 0.06, 0.04, 0.5, 2600) // env ends 102.5
  choir(MASTER.endCard, [62, 66, 69], 1.8, 0.05, 'a', 0.15, 0.6)        // env ends 102.4
  const ROLL = [[0.0, 0.6, 58], [0.1, 0.35, 62], [0.2, 0.45, 62], [0.3, 0.35, 62], [0.4, 0.85, 55]]
  for (const [dt, g, f] of ROLL) taiko(MASTER.endCard + dt, g, f)       // timpani-ish roll, last 100.4
  for (let k = 0; k < 4; k++) {
    const t = MASTER.endCard + FC[k]
    pluck(t, motifMajor[k], 0.16, 4800, 0.35, 'sawtooth')
    bass(t, motifMajor[k] - 24, 0.3, 0.3, 'sawtooth', 950)              // brass octave doubles
  }
  // MASTER.cardEnd 103.9 = mix-dead deadline, not a cue. Last scheduled cue 100.6;
  // 100.6 + 3.2 = 103.8 <= 103.9 even under the default reverb. Intentional ending.
}

export default score
