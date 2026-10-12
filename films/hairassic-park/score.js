// =====================================================================
// HAIRASSIC PARK — SCORE (composer cue sheet)
// =====================================================================
// Original music only. No copyrighted melodies; the "awe" motif below is
// an ORIGINAL rising 5-note figure stated three ways:
//   THEME_DM  [62,65,69,72,74]  D-F-A-C-D  — wistful minor statement (isle,
//                             banner re-entry "in minor")
//   THEME_D   [62,66,69,71,74]  D-F#-A-B-D — the major "awe" fanfare
//                             (title slam, dawn piano return)
// Every cue is scheduled TOP-LEVEL in score(kit) (3000 pattern: no nested
// registration, no kit.at) — registration order == time order by design.
//
// Single source of truth: ./timeline.js (imported, never edited).
//   grid times via b(section, bar, beat); the big impact pins come from
//   the timeline constants and from the SHOT CLOCKS (stopAbs below), so
//   audio lands exactly on the hit-stop freezes: an event at a stop's g
//   sounds at the START of the freeze, and nothing is scheduled strictly
//   INSIDE a freeze — the impact envelopes decay across it (the 3000
//   house rule), so the freeze reads as a mix hold, not a double-hit.
//
// SILENCE / FREEZE DISCIPLINE:
//   FENCE SMASH  48.00-48.35  onsets AT 48.0 only (freeze start)
//   JEEP FLIP    56.00-56.35  onsets AT 56.0 only; wreck landing 56.5
//   BANNER FALL  86.00-86.30  onsets AT 86.0 only; theme re-enters 86.0+
//   FINAL ROAR   98.00-98.35  onsets AT 98.0 only; wind bed 98.5+
//   kitchen 67.3-68.5 and 76.9-77.4 are INTENTIONAL held-breath gaps
//   (< 2 s); no other gap exceeds 2 s — beds (rain 39-64, drone 64-77,
//   wind 98.5-103.9) carry the seams.
//   BEATS 103.333 ("score resolves, tails clear by 103.9") is satisfied
//   by the 99.5 settle itself — deliberately NO new onset there, so the
//   tail + film reverb (1.2 s) clear before the card end at 103.9.
//
// KEY PLAN (matches SECTIONS): Dm fog at the gates -> D major over A
// (valley awe) -> F major hatchery whimsy -> Dm sabotage -> E minor with
// Bb tritone stabs (attack) -> Cm kitchen -> Dm showdown (theme in
// minor) -> MODE FLIP home to D MAJOR at the regrow dawn.
//
// MIX: impacts <= 0.8, braams <= 0.32, taiko <= 0.9; accompaniment gains
// sit under every melody statement (the 3000 lesson: low end masked by
// leads reads as mud — bass g <= 0.2 wherever the theme plays).
// END MATH: last onsets 102.0/102.35 (bird blips, env ends ~102.6);
// with the film's reverb 1.2 the tail clears ~103.8 <= 103.9 (card end).
// Reverb comes from film.js audio config — set NOTHING here; seeding is
// via kit.R only (deterministic).
// =====================================================================
import {
  T,
  b,
  BEATS,
  TITLE_SLAM,
  REGROW_BURST,
  STOPS_BY_SHOT,
  CLOCKS,
} from './timeline.js'

// the four hit-stop anchors, read through the shot clocks — an event at
// a stop's g lands at the START of its freeze (never hand-add delays).
const stopAbs = (shot) => {
  const stops = STOPS_BY_SHOT[shot] || []
  return stops.length ? CLOCKS[shot].abs(stops[0].g) : NaN
}
const FENCE_SMASH = stopAbs('rex-breakout') // 48.0  hit-stop #1
const JEEP_FLIP = stopAbs('rex-jeep')       // 56.0  hit-stop #2
const BANNER_FALL = stopAbs('showdown')     // 86.0  hit-stop #3
const FINAL_ROAR = stopAbs('dawn-payoff')   // 98.0  hit-stop #4

export function score(kit) {
  const {
    bass, pluck, pad, bell, impact, riser, sweepDown, tick, blip, glitch,
    drone, braam, taiko, strings, choir, piano, sub, swell,
    rain, thunder, wind, glass, clunk, hiss, heartbeat, whoosh, flutter,
    crash, hz, R,
  } = kit

  // ---------- shared motifs + grids (all derived, nothing hand-added) ----------
  const THEME_DM = [62, 65, 69, 72, 74] // D-F-A-C-D  minor "awe" (isle/banner)
  const THEME_D = [62, 66, 69, 71, 74]  // D-F#-A-B-D major "awe" (title/dawn)
  const Q90 = 2 / 3                     // valley/attack/dawn quarter @90bpm
  const RA = 'B-Rex Attack'
  const KS = 'Kitchen Suspense'
  const SD = 'Showdown'
  const RD = 'Regrow Dawn'

  // =====================================================================
  // S1 ISLE APPROACH 0-9 (72bpm rubato) — storm fog, torch crackle, the
  // main theme whispered by a solo piano in D minor, gates groan open.
  // =====================================================================
  wind(0.0, T.valley, 0.05, 180, 650)                   // sea/storm bed, dark band
  pad(0.0, [38, 50], 9.2, 0.045, 480, 3.0)              // D drone fog, slow bloom
  strings(0.8, [50, 53, 57], 7.6, 0.028, 2.6, 2.6, 900) // foggy Dm pad chord
  for (let k = 0; k < 5; k++)                           // THEME (minor), rubato
    piano([1.2, 2.0, 2.9, 3.9, 5.0][k], THEME_DM[k], 0.13, 3.0)
  for (let t = 0.55; t < 8.3; t += 0.5 + R() * 1.15)    // gate torch crackle (seeded)
    tick(t, 0.012 + R() * 0.018, 1900 + R() * 2500)
  thunder(2.0, 0.22, 5.0)                               // BEAT: distant roll
  thunder(5.0, 0.28, 4.5)                               // BEAT: closer, flick on the gates
  swell(5.2, 7.0, 0.08, 700)                            // brass-coloured rise
  braam(7.0, [38, 45, 50], 2.0, 0.2, 0.7)               // BEAT: gates emerge, low brass
  whoosh(8.5, 1.0, 0.12, 260, 850)                      // BEAT: gates groan open
  clunk(8.5, 0.32)                                      // iron clunk on the latch
  sub(8.3, 0.18, 46, 60, 1.4)                           // rising sub into the valley cut

  // =====================================================================
  // S2 THE VALLEY 9-22 (90bpm, bar 2.667) — A-major bloom under the
  // THEME in D major (strings), piano arpeggios, brachiosaurus footfall,
  // TITLE_SLAM 17.0 = full-forte orchestral hit + crash + fanfare.
  // =====================================================================
  strings(9.0, [45, 57, 61, 64], 7.0, 0.05, 1.2, 2.0, 2400) // A major bloom
  choir(9.5, [57, 64, 69], 6.0, 0.042, 'a', 1.8, 2.4)       // choir swell under the theme
  pad(9.0, [33, 45, 57], 8.0, 0.04, 700, 2.2)               // low A pedal bed
  const ARP = [57, 61, 64, 69]                              // A-major piano arpeggio 8ths
  for (let t = 9.0, i = 0; t < 16.9 - 1e-9; t += Q90 / 2, i++)
    piano(t, ARP[i % 4], 0.055, 1.4)
  for (let k = 0; k < 5; k++) {                             // THEME (major) in quarters
    const qt = 10.0 + k * Q90
    strings(qt, [THEME_D[k]], 1.9, 0.065, 0.04, 0.7, 3100)
    piano(qt, THEME_D[k], 0.09, 1.6)
  }
  taiko(b('Tour Whimsy', 1), 0.4, 50)                       // BEAT 11.667 brachio rises
  sub(b('Tour Whimsy', 1), 0.28, 48, 26, 2.4)               // soft deep footfall
  bell(b('Tour Whimsy', 1, 1), hz(81), 0.045, 1.8, 5.1, 2.2) // BEAT mane shimmer
  choir(b('Tour Whimsy', 1, 3), [50, 57], 2.6, 0.085, 'o', 0.5, 1.6) // BEAT huge soft call
  sub(b('Tour Whimsy', 1, 3), 0.3, 55, 28, 2.6)
  pluck(b('Tour Whimsy', 2), 69, 0.08, 3600, 0.35, 'triangle') // BEAT cane lift
  bell(b('Tour Whimsy', 2), hz(76), 0.04, 1.2, 4.1, 2.4)    // amber glint
  // --- TITLE_SLAM 17.0 (valley bar 3): the big one ---
  impact(TITLE_SLAM, 0.8, 46)
  crash(TITLE_SLAM, 0.2)                                    // cymbal-ish wash
  taiko(TITLE_SLAM, 0.9, 50)
  braam(TITLE_SLAM, [38, 50], 2.4, 0.3, 1.0)
  sub(TITLE_SLAM, 0.4, 58, 28, 2.2)
  choir(TITLE_SLAM, [50, 62, 66], 3.6, 0.05, 'a', 0.12, 1.6)
  for (let k = 0; k < 5; k++) {                             // THEME fanfare, rings out
    const ft = TITLE_SLAM + k * Q90
    strings(ft, [THEME_D[k]], 1.9, 0.06, 0.03, 0.6, 3200)
    piano(ft, THEME_D[k], 0.1, 1.8)
  }
  strings(18.8, [45, 57, 64], 2.8, 0.04, 0.8, 1.4, 2000)    // warm hold under the card

  // =====================================================================
  // S3 LAB / HATCHERY 22-31 (90bpm) — F major whimsy: music-box bells,
  // curious pizzicato, tiny heartbeat at the crack, comedic staccato
  // under "Hair, uh, finds a way."
  // =====================================================================
  pad(22.0, [41, 53, 57], 5.0, 0.03, 900, 1.2)              // warm amber bed
  const BOX = [65, 69, 72, 77, 72, 69]                      // music-box F-major up/down
  for (let t = 22.0, i = 0; t < 25.9 - 1e-9; t += Q90 / 2, i++)
    bell(t, hz(BOX[i % 6]), 0.038, 1.1, 4.1, 2.6)
  tick(b('Hatchery Wonder', 0, 1), 0.05, 6000)              // BEAT amber glint
  bell(b('Hatchery Wonder', 0, 1), hz(81), 0.035, 0.9, 5.1, 2.0)
  clunk(b('Hatchery Wonder', 0, 3), 0.14)                   // BEAT egg wobble
  clunk(b('Hatchery Wonder', 1), 0.26)                      // BEAT egg CRACKS
  tick(b('Hatchery Wonder', 1), 0.09, 2600)
  heartbeat(b('Hatchery Wonder', 1), 0.16)                  // tiny held breath
  blip(26.0, 740, 0.09, 0.1, 'square')                      // BEAT hatchling POPS
  glass(26.0, 0.1, 1.9)                                     // shell shards
  strings(26.0, [53, 60, 65], 0.45, 0.06, 0.01, 0.22, 3000) // mischievous F stab
  blip(b('Hatchery Wonder', 0, 6) + Q90 / 2, 1245, 0.05, 0.07, 'sine') // chirp 1
  blip(b('Hatchery Wonder', 0, 7), 1568, 0.05, 0.07, 'sine')           // chirp 2
  piano(b('Hatchery Wonder', 2), 53, 0.1, 2.2)              // BEAT Mal-Comb, sly low F
  pluck(b('Hatchery Wonder', 2), 69, 0.07, 3200, 0.25, 'triangle')
  const PIZZ = [57, 60, 65, 60, 57, 53, 57, 60]             // comedic staccato plucks
  for (let k = 0; k < 8; k++)
    pluck(27.667 + k * Q90 / 2, PIZZ[k], 0.06, 2800, 0.18, 'triangle')
  swell(30.3, 31.0, 0.055, 2400)                            // darkening hand-off

  // =====================================================================
  // S4 SABOTAGE 31-40 (80bpm, bar 3.0) — Dm tension: minor-9th drone,
  // pulsing 8th-note bass, minor-2nd strings, clock ticks, the voltage
  // death at 37.0, thunder rolls, riser into the attack.
  // =====================================================================
  drone(31.0, 40.0, [38, 49], 0.04, 420)                    // D2+C#3 minor-9th grind
  for (let t = 31.0, i = 0; t < 37.0 - 1e-9; t += 0.375, i++) { // pulse bass 8ths
    const build = i / 16
    bass(t, 38, 0.3, 0.09 + 0.06 * build, 'sawtooth', 460 + 220 * build)
  }
  strings(32.0, [62, 63], 4.5, 0.026, 1.6, 1.4, 1500)       // D4+Eb4 dissonance
  for (let t = 31.0; t < 36.9 - 1e-9; t += 0.75) tick(t, 0.04, 2750) // clock ticks
  tick(32.5, 0.09, 3800)                                    // BEAT console typing
  clunk(33.25, 0.3)                                         // BEAT can pries open
  tick(34.0, 0.1, 5000)                                     // BEAT vial 1 clicks
  tick(34.75, 0.1, 5200)                                    // BEAT vial 2 clicks
  hiss(35.5, 0.7, 0.06)                                     // BEAT can re-pressurizes
  thunder(36.0, 0.16, 5.0)                                  // roll 1
  thunder(38.5, 0.3, 3.5)                                   // BEAT crack overhead
  sweepDown(37.0, 1.1, 2100, 55, 0.11, 'square')            // BEAT voltage DIES
  glitch(37.0, 0.5, 0.06)                                   // screens darken
  sub(37.0, 0.2, 60, 30, 1.6)
  glitch(38.5, 0.3, 0.045)                                  // echo glitch on the crack
  riser(38.5, 40.0, 0.13)                                   // riser into 40
  swell(39.0, 40.0, 0.075, 4200)
  rain(39.0, 64.0, 0.1)                                     // rain bed starts (BEAT) -> 64

  // =====================================================================
  // S5-S8 B-REX ATTACK 40-64 (90bpm, bar 2.667, half-bar = one footfall)
  // — E minor dread, Bb tritone stabs, the tread as the kick drum,
  // FENCE_SMASH 48.0 and JEEP_FLIP 56.0 pinned to freeze starts,
  // syncopated flare chase decrescendoing into darkness.
  // =====================================================================
  drone(40.0, 54.0, [40, 52], 0.035, 480)                   // E drone dread
  heartbeat(40.2, 0.22)                                     // heartbeats rise on the
  heartbeat(41.1, 0.25)                                     //   quiet approach
  heartbeat(42.0, 0.28)
  heartbeat(42.9, 0.32)
  for (let t = 40.0, i = 0; t < 47.4 - 1e-9; t += Q90 / 2, i++) { // low pulse 8ths
    const build = i / 22
    bass(t, 40, 0.26, 0.07 + 0.07 * build, 'sawtooth', 400 + 180 * build)
  }
  thunder(b(RA, 0, 1), 0.2, 3.6)                            // BEAT close thunder
  thunder(b(RA, 0, 5), 0.24, 3.2)                           // BEAT the storm lands
  strings(b(RA, 0, 5), [52, 58], 1.4, 0.045, 0.3, 0.9, 2600) // E+Bb tritone pre-monster
  const tread = BEATS.filter(                               // the tread IS the beat grid
    (x) => x.kind === 'boom' && x.t >= 44.0 - 1e-9 && x.t < T.flareEscape,
  )
  for (let k = 0; k < tread.length; k++) {                  // 44..57.333 footfalls
    const approach = k < 3                                  // 44/45.333/46.667 cup ripples
    taiko(tread[k].t, approach ? 0.55 + 0.1 * k : 0.8, approach ? 50 : 46)
    sub(tread[k].t, approach ? 0.3 : 0.38, 55, 26, 1.6)
  }
  strings(b(RA, 0, 11), [64, 65], 0.9, 0.06, 0.02, 0.4, 3300) // BEAT headlights: E-F screech
  tick(b(RA, 0, 11), 0.08, 5200)                            // headlight relay snap
  // --- FENCE_SMASH 48.0 (freeze 48.00-48.35: onsets AT the start only) ---
  impact(FENCE_SMASH, 0.8, 44)
  taiko(FENCE_SMASH, 0.9, 44)
  braam(FENCE_SMASH, [40, 52], 2.0, 0.3, 0.9)
  glass(FENCE_SMASH, 0.22, 1.7)                             // fence cables snap
  clunk(FENCE_SMASH, 0.4)
  crash(FENCE_SMASH, 0.14)
  braam(b(RA, 4), [40, 46], 0.9, 0.17, 0.55)                // BEAT 50.667 snarl growl
  hiss(b(RA, 4), 0.7, 0.05)                                 // breath on the glass
  // --- rex-jeep 54-58: dissonant runs, slam, THE FLIP ---
  strings(54.0, [64, 65, 70], 0.75, 0.05, 0.02, 0.3, 3500)  // cluster run into the slam
  impact(b(RA, 5, 2), 0.7, 48)                              // BEAT 54.667 jeep SLAM
  glass(b(RA, 5, 2), 0.2, 1.5)
  taiko(b(RA, 5, 2), 0.75, 50)
  clunk(b(RA, 5, 3), 0.35)                                  // BEAT 55.333 the shove
  // --- JEEP_FLIP 56.0 (freeze 56.00-56.35): onsets AT the start only,
  //     computed through the clock so audio is never double-delayed ---
  impact(JEEP_FLIP, 0.8, 42)
  taiko(JEEP_FLIP, 0.9, 42)
  braam(JEEP_FLIP, [40, 52], 2.2, 0.32, 1.0)
  sub(JEEP_FLIP, 0.45, 68, 24, 2.4)                         // sub sweep down
  glass(JEEP_FLIP, 0.28, 1.9)
  crash(JEEP_FLIP, 0.16)
  sub(JEEP_FLIP + 0.5, 0.28, 46, 24, 1.3)                   // wreck lands after resume
  clunk(JEEP_FLIP + 0.5, 0.28)
  // --- flare-escape 58-64: pop, wheel, syncopated chase, decrescendo ---
  whoosh(58.0, 0.5, 0.18, 400, 3200)                        // BEAT flare pops
  hiss(58.0, 0.6, 0.07)
  swell(58.0, 59.0, 0.06, 6500)                             // flare bloom
  braam(b(RA, 7), [40, 46], 0.8, 0.19, 0.7)                 // BEAT rex wheels to the light
  taiko(b(RA, 7), 0.6, 48)
  const CH_OFF = [0, Q90, 1.1111, 1.7778, 2.2222, 2.6667, 3.1111, 3.5556, 4.0]
  const CH_G = [0.5, 0.32, 0.42, 0.3, 0.38, 0.26, 0.32, 0.22, 0.26] // decrescendo
  for (let k = 0; k < 9; k++)                               // syncopated chase from 59.333
    taiko(b(RA, 7, 1) + CH_OFF[k], CH_G[k], 55 + (k % 3))
  sub(b(RA, 7, 1), 0.26, 50, 26, 1.4)                       // BEAT boom 10 weight
  clunk(60.0, 0.35)                                         // BEAT kids scramble out
  tick(60.03, 0.06, 3000)
  strings(b(RA, 8), [52, 64, 70], 1.5, 0.05, 0.04, 0.8, 3100) // BEAT kids DASH (E-Bb surge)
  clunk(62.0, 0.4)                                          // BEAT jaws snap the flare
  tick(62.0, 0.11, 4400)
  hiss(b(RA, 8, 2), 1.1, 0.045)                             // BEAT flare fizzles red
  strings(63.0, [40], 1.0, 0.028, 0.3, 0.7, 750)            // decrescendo into darkness
  taiko(b(RA, 8, 2) + Q90 / 2, 0.26, 58)                    // BEAT 63.333 pickup
  tick(b(RA, 8, 2) + Q90 / 2, 0.05, 2000)

  // =====================================================================
  // S9 KITCHEN 64-73 (80bpm, bar 3.0) — near-silence: C room drone,
  // glassy ticks, sparse piano, SPOON CLANG 67.0, held breath, bolt.
  // =====================================================================
  drone(64.0, 77.0, [36, 48], 0.026, 260)                   // room drone, very low
  tick(64.75, 0.028, 5200)                                  // glassy ticks
  tick(65.5, 0.028, 5600)
  bell(b(KS, 0, 2), hz(83), 0.03, 1.2, 5.1, 2.0)            // BEAT snout reflections glide
  tick(66.5, 0.035, 4700)                                   // BEAT spoon trembles
  tick(66.6, 0.03, 5000)
  piano(65.0, 72, 0.055, 2.6)                               // sparse C-minor piano notes
  piano(68.5, 63, 0.05, 2.6)
  piano(71.5, 67, 0.045, 2.4)
  glass(67.0, 0.26, 2.2)                                    // BEAT SPOON CLANG
  clunk(67.0, 0.45)
  bell(67.0, 3150, 0.085, 2.4, 2.0, 1.3)                    // ringing metal partial
  // (67.3-68.5 held-breath gap is intentional — the clang IS the event)
  taiko(b(KS, 1, 2), 0.4, 54)                               // BEAT raptor steps toward it
  clunk(b(KS, 1, 2), 0.18)                                  // talons on tile
  hiss(b(KS, 1, 3), 0.9, 0.04)                              // BEAT breath fogs the steel
  strings(69.5, [60, 63], 2.9, 0.02, 1.5, 1.2, 750)         // held-breath pad
  heartbeat(b(KS, 2), 0.26)                                 // BEAT mint strand — heartbeat
  hiss(70.0, 0.55, 0.035)                                   // door hiss
  clunk(b(KS, 2, 1), 0.3)                                   // BEAT far-door latch
  strings(b(KS, 2, 3), [75, 76], 0.7, 0.06, 0.01, 0.3, 4300) // BEAT screech + bolt
  whoosh(b(KS, 2, 3), 0.5, 0.13, 900, 4200)

  // =====================================================================
  // S10 CLEVER GIRL 73-77 (kitchen grid) — dark exterior, the line owns
  // the space, POUNCE 76.0 = short braam + impact, then CUT TO SILENCE.
  // =====================================================================
  rain(73.0, 77.0, 0.055)                                   // exterior night rain bed
  piano(b(KS, 3, 1), 48, 0.11, 3.0)                         // BEAT Mulldoon alone — dark C
  pad(b(KS, 3, 1), [36, 48, 51], 3.0, 0.028, 520, 1.2)
  tick(b(KS, 3, 1), 0.04, 4200)                             // fan-light buzz
  braam(b(KS, 4), [36, 48], 0.55, 0.26, 0.8)                // BEAT 76.0 POUNCE
  impact(b(KS, 4), 0.7, 44)
  taiko(b(KS, 4), 0.7, 44)
  clunk(b(KS, 4), 0.3)                                      // mud impact
  sub(76.75, 0.13, 40, 30, 0.9)                             // BEAT darkness takes the frame
  // (76.9-77.4 silence is the intentional "cut to black" of the mix)

  // =====================================================================
  // S11 SHOWDOWN 77-90 (80bpm, bar 3.0) — raptor stalk pulse, hisses,
  // wall crash 83.0, seize 84.5, BANNER_FALL 86.0 = full orchestra
  // re-entry with the theme IN MINOR, escape momentum into 90.
  // =====================================================================
  for (let t = 77.5; t < 82.9 - 1e-9; t += 0.75)            // raptor stalk pulse
    bass(t, 38, 0.6, 0.11, 'sawtooth', 380)
  hiss(b(SD, 0, 2), 0.5, 0.055)                             // BEAT hiss 1
  tick(b(SD, 0, 2), 0.05, 5000)
  hiss(b(SD, 0, 3), 0.5, 0.065)                             // BEAT hiss 2
  clunk(80.0, 0.3)                                          // BEAT talons click in
  taiko(80.0, 0.45, 56)
  taiko(80.75, 0.5, 54)                                     // BEAT closer
  clunk(80.75, 0.24)
  braam(b(SD, 1, 2), [38, 44], 1.5, 0.13, 0.5)              // BEAT growl under the banner
  swell(b(SD, 1, 2), 83.0, 0.09, 5200)
  clunk(83.0, 0.5)                                          // BEAT 83.0 WALL CRASH
  impact(83.0, 0.8, 46)
  taiko(83.0, 0.85, 46)
  glass(83.0, 0.18, 1.6)                                    // masonry crunch
  sub(83.0, 0.35, 55, 26, 1.8)
  crash(83.0, 0.13)
  whoosh(84.5, 0.3, 0.2, 600, 3200)                         // BEAT 84.5 the SEIZE
  impact(84.5, 0.6, 48)
  taiko(84.5, 0.6, 50)
  tick(84.55, 0.1, 3900)                                    // teeth
  strings(b(SD, 2, 3), [62, 63], 0.6, 0.055, 0.01, 0.25, 3400) // BEAT thrash
  taiko(b(SD, 2, 3), 0.4, 58)
  // --- BANNER_FALL 86.0 (freeze 86.00-86.30: onsets AT the start only) ---
  whoosh(BANNER_FALL, 0.4, 0.16, 950, 320)                  // cloth, downward
  impact(BANNER_FALL, 0.8, 44)
  taiko(BANNER_FALL, 0.85, 46)
  crash(BANNER_FALL, 0.15)
  braam(BANNER_FALL, [38, 50], 2.0, 0.28, 0.85)
  choir(BANNER_FALL, [50, 62, 65], 2.8, 0.045, 'a', 0.1, 1.2) // D minor re-entry
  sub(BANNER_FALL, 0.32, 55, 27, 2.0)
  for (let k = 0; k < 5; k++)                               // THEME in MINOR, quarters
    strings(BANNER_FALL + k * 0.75, [THEME_DM[k]], 1.3, 0.055, 0.03, 0.4, 3000)
  bell(BANNER_FALL + 0.5, hz(74), 0.04, 1.6, 4.1, 2.2)      // BEAT banner drapes, wistful
  strings(BANNER_FALL + 0.5, [57, 65], 2.0, 0.035, 0.3, 1.0, 2100)
  braam(b(SD, 3, 2), [38, 45, 50], 1.2, 0.2, 0.8)           // BEAT victory roar
  choir(b(SD, 3, 2), [50, 62], 1.8, 0.055, 'o', 0.2, 0.8)
  taiko(b(SD, 3, 2), 0.5, 48)
  clunk(b(SD, 3, 3), 0.28)                                  // BEAT heroes slip out
  hiss(b(SD, 3, 3), 0.4, 0.035)
  strings(88.0, [50, 62, 65], 2.0, 0.04, 0.1, 1.0, 2600)    // escape momentum
  taiko(88.0, 0.45, 56)                                     // accel roll into the cut
  taiko(88.75, 0.4, 56)
  taiko(89.25, 0.36, 58)
  taiko(89.625, 0.32, 58)
  taiko(89.8125, 0.28, 58)
  flutter(89.0, 94.5, 0.06)                                 // BEAT rotors, distant

  // =====================================================================
  // S12 DAWN PAYOFF 90-104 (90bpm, bar 2.667) — D MAJOR mode flip home:
  // sunrise bloom, THEME returns on solo piano, REGROW_BURST 95.333
  // blossoms (bells + plucks + choir), FINAL_ROAR 98.0 with the wind
  // fader, then a soft clean settle under the end caption.
  // =====================================================================
  pad(90.0, [38, 50, 57], 5.4, 0.04, 880, 2.0)              // warm D bed
  strings(90.0, [50, 57, 62, 66], 5.2, 0.045, 1.6, 2.0, 2300) // D MAJOR bloom
  choir(90.5, [50, 62, 66], 4.5, 0.04, 'o', 1.6, 2.0)
  for (let k = 0; k < 5; k++)                               // THEME return, solo piano
    piano(91.0 + k, THEME_D[k], 0.12, 2.8)
  strings(b(RD, 1), [57, 64], 2.4, 0.03, 0.8, 1.2, 2000)    // BEAT alone on the helipad
  bell(94.0, hz(86), 0.04, 1.6, 5.1, 2.0)                   // BEAT crown shimmers
  tick(94.0, 0.035, 7200)
  // --- REGROW_BURST 95.333: magical, not violent ---
  bell(REGROW_BURST, hz(74), 0.075, 2.6, 3.5, 2.6)
  const BLOOM = [62, 66, 69, 74, 78, 81, 86, 90]            // harp-ish blossom up 2 octaves
  for (let k = 0; k < 8; k++)
    pluck(REGROW_BURST + k * 0.0833, BLOOM[k], 0.085, 5200, 0.4, 'triangle')
  choir(REGROW_BURST, [50, 62, 66, 69], 3.6, 0.048, 'a', 0.8, 1.6)
  strings(REGROW_BURST, [50, 57, 62, 66, 69], 4.2, 0.05, 0.4, 1.8, 2800)
  pad(REGROW_BURST, [38, 45, 54], 4.4, 0.04, 860, 1.0)
  swell(REGROW_BURST, REGROW_BURST + 1.2, 0.055, 9500)
  bell(b(RD, 2, 2), hz(90), 0.032, 2.0, 5.1, 1.8)           // BEAT mane crests, full
  swell(b(RD, 2, 3), 98.0, 0.09, 3200)                      // BEAT the inhale
  heartbeat(97.5, 0.3)
  // --- FINAL_ROAR 98.0 (freeze 98.00-98.35: onsets AT the start only) ---
  braam(FINAL_ROAR, [38, 50, 62], 2.4, 0.3, 1.0)
  taiko(FINAL_ROAR, 0.9, 44)
  impact(FINAL_ROAR, 0.8, 44)
  choir(FINAL_ROAR, [50, 57, 62], 2.6, 0.065, 'a', 0.05, 1.6)
  wind(98.5, 103.9, 0.085, 320, 1350)                       // BEAT mane-blowing wind bed
  // --- settle 99.5-103.9: soft resolution under the end caption ---
  piano(99.5, 50, 0.09, 3.8)                                // final soft D major chord
  piano(99.5, 62, 0.07, 3.8)
  piano(99.5, 66, 0.055, 3.8)
  piano(99.5, 69, 0.045, 3.8)
  choir(99.5, [50, 62], 3.4, 0.03, 'u', 1.4, 1.8)
  pad(99.5, [38, 50, 57], 3.6, 0.032, 800, 1.4)
  swell(99.5, 100.6, 0.035, 6500)
  blip(102.0, 2093, 0.035, 0.28, 'sine')                    // distant bird-flute blip
  blip(102.35, 2637, 0.03, 0.22, 'sine')                    // last cue; tail clears ~103.8
}

export default score
