// =====================================================================
// HAIRASSIC PARK — A REMY BOYS BLOCKBUSTER · cue sheet + choreography
// =====================================================================
// Single shared source of truth for picture (film.js/art.js) and score
// (score.js). 104.0 s, 1920x1080 @60fps, 2.39:1 letterbox — content
// band y [138, 942], BAR = 138. IMPORT-FREE: pure constants + tiny pure
// helpers; validate() runs under bare node. Every value is a pure
// function of time (no Math.random, no Date, no frame state).
//
// LOGLINE: Hambald's bald-dino paradise loses power in a storm, and the
// B-REX — bald as a cue ball — proves the tagline: HAIR FINDS A WAY.
//
// CAST (fixed ids): HAMBALD id5 (white suit, amber-scissors cane) ·
// DENNIS BALDRY id48 · DR. IAN MAL-COMB id681 (cobalt flow, gold
// shades) · DR. ALAN GROWGRANT id42 (red hair, hat) · MULLDOON id151
// (visor cap warden) · KID TIM id44 · KID LEXI id1 · rangers 16/49.
// Procedural dinos: MANED BRACHIOSAUR · two MULLETRAPTORS (+ a third,
// biggest-mullet one for the ambush) · the B-REX (giant BALD T-Rex that
// regrows a magnificent mane at the end).
//
// ---------------------------------------------------------------------
// SHOT MAP (film seconds; contiguous, covers [0, 104) exactly):
//   ISLE 0-9 · VALLEY 9-22 · LAB 22-31 · SABOTAGE 31-40 ·
//   REX-APPROACH 40-47.5 · REX-BREAKOUT 47.5-54 · REX-JEEP 54-58 ·
//   FLARE-ESCAPE 58-64 · KITCHEN 64-73 · CLEVER-GIRL 73-77 ·
//   SHOWDOWN 77-90 · DAWN 90-104.   DURATION = 104.0 exactly.
//
// DEVIATIONS FROM THE STORY SKETCH (all in service of the beat grid):
//  1. The centerpiece attack 40-64 is CUT INTO FOUR SHOTS (approach /
//     breakout / jeep / flare-escape) so each phase gets its own cut and
//     the two mandated impacts pin on WHOLE SECONDS: FENCE SMASH 48.0 =
//     bar 3 downbeat and JEEP FLIP 56.0 = bar 6 downbeat of the attack
//     grid (90 BPM 4/4, bar 2.6667s — 9 bars exactly fill 40-64).
//  2. The kitchen block is split 64-73 (kitchen) + 73-77 (clever-girl)
//     so Mulldoon's ambush gets its own dark exterior beat; the pounce
//     pins on 76.0 = bar 4 downbeat of the 80 BPM kitchen grid.
//  3. Footstep booms ride the HALF-BAR grid of the attack section:
//     44.0, 45.333, 46.667, 48.0(smash), 49.333, 50.667, 52.0, 53.333,
//     54.667(slam), 55.333, 56.0(flip), 57.333, 59.333 — the composer
//     can literally orchestrate the tread as half notes at 90 BPM.
//  4. BIG IMPACT PINS (whole seconds, section-grid downbeats):
//     FENCE_SMASH 48.0 · JEEP_FLIP 56.0 · BANNER_FALL 86.0 (bar 3 of
//     showdown @80) · FINAL_ROAR 98.0 (bar 3 of dawn @90). TITLE_SLAM
//     17.0 (bar 3 of valley @90). REGROW_BURST 95.333 (bar 2 of dawn).
//  5. Caption floors: every reading caption fully visible >= 3.0 s
//     INCLUDING fades. Four SHORT dialogue lines (<= 4 words) ride
//     per-caption minHold 1.6-2.0 — each documented inline (why field
//     + comment). TITLE CARD holds 4.45 (>= 4); finale line holds 3.9
//     (>= 3.5, brief-mandated).
//
// UNITS:
//   SHOTS/SECTIONS/BEATS/CAPTIONS t0,t1 ... ABSOLUTE film seconds.
//   STOPS[].g .......................... SHOT-LOCAL world seconds (the
//     template warp pattern); an event at a stop's g lands at the START
//     of its freeze. film start = t0 + filmT(g) via makeClock.
//   CAPTIONS in/out .................... fade rides; fully visible =
//     (t1 - out) - (t0 + in), the number lint measures.
// =====================================================================

// ---------- letterbox: 2.39:1 at 16:9 -> band y [138, 942] ----------
export const BAR = 138
export const SAFE = { bandY: [BAR, 1080 - BAR], captionYMin: 180, captionYMax: 900 }

export const DURATION = 104.0

// ---------- shot map ----------
export const T = {
  isle: 0,        // S1  isle-approach   0-9      (9.0)
  valley: 9,      // S2  the-valley      9-22     (13.0)  TITLE CARD
  lab: 22,        // S3  lab-hatchery    22-31    (9.0)
  sabotage: 31,   // S4  sabotage        31-40    (9.0)
  rexApproach: 40,   // S5  rex-approach   40-47.5 (7.5)  cup ripples
  rexBreakout: 47.5, // S6  rex-breakout  47.5-54 (6.5)  FENCE SMASH 48.0
  rexJeep: 54,       // S7  rex-jeep      54-58   (4.0)  JEEP FLIP 56.0
  flareEscape: 58,   // S8  flare-escape  58-64   (6.0)
  kitchen: 64,    // S9  kitchen         64-73    (9.0)  SPOON CLANG 67.0
  cleverGirl: 73, // S10 clever-girl     73-77    (4.0)  POUNCE 76.0
  showdown: 77,   // S11 showdown        77-90    (13.0) BANNER FALL 86.0
  dawn: 90,       // S12 dawn-payoff     90-104   (14.0) FINAL ROAR 98.0
}

export const SHOTS = [
  { name: 'isle-approach', t0: T.isle, t1: T.valley,
    cam: 'slow aerial push-in with lateral drift; the gates scale up out of the mist, then hold',
    action: 'storm-light over a jungle island; boat wake below; torch-lit wooden gates reading HAIRASSIC PARK emerge from the mist and swing open',
    vfx: 'fog banks, lightning flicker, torch glow, sea spray, light rain haze' },
  { name: 'the-valley', t0: T.valley, t1: T.lab,
    cam: 'wide vista; slow crane up as the brachiosaur rises; push-in to Hambald for the line; pull wide for the title',
    action: 'heroes on a hill (Hambald id5 white suit + amber-scissors cane, Growgrant id42 hat, Mal-Comb id681 cobalt flow + gold shades, kids id44/id1); the MANED BRACHIOSAUR rises on hind legs by the waterfall, mane flowing; Hambald lifts his cane: "Welcome... to Hairassic Park."',
    vfx: 'sun shafts, waterfall spray, flowing mane strands, drifting pollen, title dust burst' },
  { name: 'lab-hatchery', t0: T.lab, t1: T.sabotage,
    cam: 'macro on the amber cane; rack focus to the hatchery rack; slow orbit of the egg; snap-in on the pop',
    action: 'amber cane close-up (scissors frozen inside); a hatchery egg wobbles and cracks; the hatchling POPS out wearing a tiny MOHAWK and chirps; Mal-Comb leans in: "Hair, uh, finds a way."',
    vfx: 'amber refraction glow, lab neon, shell shards, mohawk wiggle, dust motes' },
  { name: 'sabotage', t0: T.sabotage, t1: T.rexApproach,
    cam: 'low angle on Baldry; inserts on can / vials / console; whip to the voltage map as it dies',
    action: 'Baldry (id48, scruffy) stuffs hair-DNA vials into a SHAVING CREAM can; the fence voltage map flatlines to zero; he pockets the can and strolls out',
    vfx: 'rising storm clouds past the window, screen flicker, thunder flash, first rain on glass' },
  { name: 'rex-approach', t0: T.rexApproach, t1: T.rexBreakout,
    cam: 'interior jeep two-shot; macro on the water cup; headlights snap on and hold the fence line',
    action: 'kids (id44, id1) and Growgrant (id42) sit in the jeep in rising rain; the water cup rings in sync with distant footfalls; Growgrant clicks the headlights on; a colossal bald silhouette fills the beams',
    vfx: 'rain on windshield, concentric cup ripples synced to booms, headlight volumetrics, breath fog' },
  { name: 'rex-breakout', t0: T.rexBreakout, t1: T.rexJeep,
    cam: 'low wide on the fence; whip up as the B-REX rises through the wires; handheld circle around the jeep',
    action: 'the BALD B-REX smashes through the dead fence and steps into the paddock; it lowers its bald crown to the jeep windows and snarls',
    vfx: 'fence cables snap + spark, mud splash, rain sheets, headlight strobe, hit-stop shake' },
  { name: 'rex-jeep', t0: T.rexJeep, t1: T.flareEscape,
    cam: 'side profile; impact framing for the flip; low angle under the airborne jeep',
    action: 'the B-REX slams the jeep, shoves it, and FLIPS it; the wreck lands roof-down in the mud',
    vfx: 'glass shatter, mud burst, swinging headlight beams, hit-stop shake' },
  { name: 'flare-escape', t0: T.flareEscape, t1: T.kitchen,
    cam: 'close on the flare; whip-pan rex-vs-flare; high wide as the kids scatter into the dark',
    action: 'Growgrant (id42) pops a flare — "HEY!"; the B-REX wheels to the light; the kids scramble from the wreck and dash into the dark',
    vfx: 'flare bloom + red particles, smoke trail, rain, rex breath mist' },
  { name: 'kitchen', t0: T.kitchen, t1: T.cleverGirl,
    cam: 'stainless-steel reflections; extreme macro on the spoon and on the mint strand; rack focus between kids and snout',
    action: 'MULLETRAPTORS hunt the kids between steel counters; a spoon slips and CLANGS; a snout turns; Lexi\'s (id1) mint hair strand inches from the nostril; the kids slip out the far door',
    vfx: 'steel reflections, freezer steam, flashlight beams, dust in light shafts' },
  { name: 'clever-girl', t0: T.cleverGirl, t1: T.showdown,
    cam: 'static night exterior; slow push on Mulldoon; the pounce enters frame-left, oversized',
    action: 'MULLDOON (id151, visor cap) outside at the sheds: "CLEVER GIRL." — the third, BIGGEST-MULLET mulletraptor is already beside him; it pounces',
    vfx: 'rain, lightning flash on the mullet silhouette reveal, mud impact' },
  { name: 'showdown', t0: T.showdown, t1: T.dawn,
    cam: 'wide under the banner; crash-zoom as the wall bursts; low hero angle on the B-REX',
    action: 'mulletraptors corner the heroes under a banner; the B-REX crashes through the wall and seizes a mulletraptor; the banner tears loose and falls reading WHEN HAIR RULED THE EARTH',
    vfx: 'masonry burst + dust, falling debris, banner cloth sim, moonlight shafts' },
  { name: 'dawn-payoff', t0: T.dawn, t1: DURATION,
    cam: 'aerial pull-away with the helicopter; settle on the helipad; slow push for the regrow; hold on the roar',
    action: 'helicopter away over the sunrise sea; the B-REX alone on the helipad — crown shimmers to stubble, then a MAGNIFICENT MANE bursts forth in timelapse; it ROARS into the sunrise wind',
    vfx: 'godrays, shimmer particles, timelapse hair growth, mane wind sim, lens flare' },
]

// ---------- score sections (each t0 is its own bar 0 downbeat) ----------
// Key plan: D major awe at the gates -> A major wonder -> F major hatchery
// whimsy -> D minor sabotage -> E minor with Bb TRITONE stabs for the
// attack -> C minor kitchen suspense -> D minor showdown -> mode-flip home
// to D MAJOR for the regrow dawn. All motifs original.
export const SECTIONS = [
  { name: 'Overture Awe', t0: T.isle, t1: T.valley, bpm: 72, beats: 4,
    mood: 'rubato awe: wide drone, distant thunder, torch warmth as the gates emerge',
    tempo: '72 bpm 4/4, rubato (free time; the four isle beats are cues, not grid)',
    key: 'D major' },
  { name: 'Tour Whimsy', t0: T.valley, t1: T.lab, bpm: 90, beats: 4,
    mood: 'jaw-dropped wonder: sparkling celesta over warm horns as the brachiosaur rises',
    tempo: '90 bpm 4/4 (bar 2.667s); title slam = bar 3',
    key: 'A major' },
  { name: 'Hatchery Wonder', t0: T.lab, t1: T.sabotage, bpm: 90, beats: 4,
    mood: 'ticking curiosity: music-box chirps, amber warmth, one mischievous stab on the pop',
    tempo: '90 bpm 4/4',
    key: 'F major' },
  { name: 'Sabotage Tension', t0: T.sabotage, t1: T.rexApproach, bpm: 80, beats: 4,
    mood: 'creeping unease: pulsing low strings, clicks and hisses, storm swallowing the light',
    tempo: '80 bpm 4/4 (bar 3.0s); power-die = bar 2',
    key: 'D minor' },
  { name: 'B-Rex Attack', t0: T.rexApproach, t1: T.kitchen, bpm: 90, beats: 4,
    mood: 'full panic: percussion wall, screeching strings, tritone menace — the tread is the kick drum',
    tempo: '90 bpm 4/4 (bar 2.667s, half-bar 1.333s = one footfall); 9 bars fill 40-64 exactly; fence smash = bar 3, jeep flip = bar 6',
    key: 'E minor with Bb tritone stabs' },
  { name: 'Kitchen Suspense', t0: T.kitchen, t1: T.showdown, bpm: 80, beats: 4,
    mood: 'held-breath suspense: near-silence, metallic clicks, one loud CLANG, screech and chase',
    tempo: '80 bpm 4/4 (bar 3.0s); spoon clang = bar 1, pounce = bar 4',
    key: 'C minor' },
  { name: 'Showdown', t0: T.showdown, t1: T.dawn, bpm: 80, beats: 4,
    mood: 'cornered dread flipping to awe: hisses in the dark, wall-burst wonder, banner-drop gravity',
    tempo: '80 bpm 4/4 (bar 3.0s); wall crash = bar 2, banner fall = bar 3',
    key: 'D minor' },
  { name: 'Regrow Dawn', t0: T.dawn, t1: DURATION, bpm: 90, beats: 4,
    mood: 'sunrise warmth: the mode flips home, timelapse shimmer, one triumphant roar, resolve',
    tempo: '90 bpm 4/4 (bar 2.667s); regrow burst = bar 2, final roar = bar 3',
    key: 'D major (mode flip home)' },
]

// ---------- bar/beat grid helpers (3000 pattern) ----------
const SECT = {}
for (const s of SECTIONS) SECT[s.name] = s
// b(sectionName, bar, beat=0) -> absolute film seconds of that grid beat
// (bar 0 beat 0 = the section downbeat). Exact for the pinned whole seconds.
export const b = (name, bar, beat = 0) => {
  const s = SECT[name]
  return s.t0 + ((bar * s.beats + beat) * 60) / s.bpm
}

// ---------- named cue anchors (whole seconds; composer takes these literally) ----------
export const TITLE_SLAM = b('Tour Whimsy', 3)      // 17.0  BIG TITLE CARD
export const FENCE_SMASH = b('B-Rex Attack', 3)    // 48.0  hit-stop #1
export const JEEP_FLIP = b('B-Rex Attack', 6)      // 56.0  hit-stop #2
export const BANNER_FALL = b('Showdown', 3)        // 86.0  hit-stop #3
export const REGROW_BURST = b('Regrow Dawn', 2)    // 95.3333
export const FINAL_ROAR = b('Regrow Dawn', 3)      // 98.0  hit-stop #4

// ---------- hit-stops: world-time freezes for THE biggest impacts only ----------
// Template STOPS pattern (choreo.js): g is SHOT-LOCAL world seconds; the
// freeze pins world g at s.g while shake/flash/score keep real time. An
// event at a stop's g lands at the START of its freeze. All d <= 0.35.
// Film starts: fence 48.00, flip 56.00, banner 86.00, roar 98.00.
export const STOPS = [
  { shot: 'rex-breakout', g: FENCE_SMASH - T.rexBreakout, d: 0.35 },  // FENCE SMASH, film 48.00-48.35
  { shot: 'rex-jeep', g: JEEP_FLIP - T.rexJeep, d: 0.35 },            // JEEP FLIP,   film 56.00-56.35
  { shot: 'showdown', g: BANNER_FALL - T.showdown, d: 0.3 },          // BANNER FALL, film 86.00-86.30
  { shot: 'dawn-payoff', g: FINAL_ROAR - T.dawn, d: 0.35 },           // FINAL ROAR,  film 98.00-98.35
]

// Per-shot stop lists for the builder's clocks.
export const STOPS_BY_SHOT = {}
for (const st of STOPS) (STOPS_BY_SHOT[st.shot] ||= []).push(st)

// ---------- shot clocks: the template warp pattern ----------
// warp(ts): ts = SHOT-LOCAL film seconds (what draw(ctx, lt) receives);
// returns { g, stop, sl } — sl is a SIBLING of stop (read w.sl, never
// w.stop.sl). filmT(g): world g -> shot-local film seconds. abs(g): film.
export function makeClock(t0, stops = []) {
  const warp = (ts) => {
    let acc = 0
    for (const s of stops) {
      const rs = s.g + acc
      if (ts < rs) return { g: ts - acc, stop: null, sl: 0 }
      if (ts < rs + s.d) return { g: s.g, stop: s, sl: ts - rs }
      acc += s.d
    }
    return { g: ts - acc, stop: null, sl: 0 }
  }
  const filmT = (g) => {
    let acc = 0
    for (const s of stops) if (s.g < g) acc += s.d
    return g + acc
  }
  return { t0, stops, warp, filmT, abs: (g) => t0 + filmT(g) }
}
export const CLOCKS = Object.fromEntries(
  SHOTS.map((s) => [s.name, makeClock(s.t0, STOPS_BY_SHOT[s.name] || [])]),
)

// ---------- BEATS (absolute film seconds; every impact/sting/footfall/
// door/clang/roar/flare/regrow the composer or builder needs) ----------
// Grid-pinned values come from b() so they cannot drift; the four big
// impacts sit on whole-second bar downbeats (see header, deviation 4).
export const BEATS = [
  // S1 isle-approach 0-9 (rubato overture — cues, not grid)
  { t: 2.0, kind: 'thunder', note: 'distant thunder roll across the sea (rubato overture)' },
  { t: 5.0, kind: 'thunder', note: 'second roll, closer — lightning flick on the gates' },
  { t: 7.0, kind: 'sting', note: 'torch-lit gates reading HAIRASSIC PARK fully emerge — low brass swell' },
  { t: 8.5, kind: 'door', note: 'wooden gates groan open (creak + iron clunk)' },
  // S2 the-valley 9-22 @90
  { t: b('Tour Whimsy', 1), kind: 'sting', note: 'MANED BRACHIOSAUR rises on hind legs by the waterfall (~11.667, bar 1)' },
  { t: b('Tour Whimsy', 1, 1), kind: 'sting', note: 'mane crest shimmers over the spray (~12.333)' },
  { t: b('Tour Whimsy', 1, 3), kind: 'roar', note: 'brachiosaur calls, soft and huge; mane tosses (~13.667)' },
  { t: b('Tour Whimsy', 2), kind: 'sting', note: 'Hambald lifts the amber cane (~14.333, bar 2)' },
  { t: TITLE_SLAM, kind: 'sting', note: 'BIG TITLE CARD "HAIRASSIC PARK" slams — braam + dust burst (17.0, bar 3)' },
  // S3 lab-hatchery 22-31 @90
  { t: b('Hatchery Wonder', 0, 1), kind: 'sting', note: 'amber cane close-up catches fire-light; scissors glint inside (~22.667)' },
  { t: b('Hatchery Wonder', 0, 3), kind: 'sting', note: 'the egg wobbles once (24.0)' },
  { t: b('Hatchery Wonder', 1), kind: 'impact', note: 'egg CRACKS — first fracture line (~24.667, bar 1)' },
  { t: b('Hatchery Wonder', 0, 6), kind: 'impact', note: 'HATCHLING POPS OUT wearing a tiny MOHAWK (26.0)' },
  { t: 26.333333333333332, kind: 'chirp', note: 'hatchling chirp 1 (offbeat pickup)' },
  { t: b('Hatchery Wonder', 0, 7), kind: 'chirp', note: 'hatchling chirp 2, mohawk wiggle (~26.667)' },
  { t: b('Hatchery Wonder', 2), kind: 'sting', note: 'Mal-Comb steps in, lowers his gold shades (~27.333, bar 2)' },
  // S4 sabotage 31-40 @80
  { t: b('Sabotage Tension', 0, 2), kind: 'click', note: 'Baldry types — console key clicks (~32.5)' },
  { t: b('Sabotage Tension', 0, 3), kind: 'clunk', note: 'shaving-cream can pries open (~33.25)' },
  { t: b('Sabotage Tension', 1), kind: 'click', note: 'hair-DNA vial 1 clicks into the can (34.0, bar 1)' },
  { t: b('Sabotage Tension', 1, 1), kind: 'click', note: 'vial 2 clicks in (~34.75)' },
  { t: b('Sabotage Tension', 1, 2), kind: 'hiss', note: 'can re-pressurizes with a hiss (~35.5)' },
  { t: b('Sabotage Tension', 2), kind: 'powerdown', note: 'fence voltage map DIES — 10,000 V to zero, screens darken (37.0, bar 2)' },
  { t: b('Sabotage Tension', 2, 2), kind: 'thunder', note: 'thunder CRACK directly overhead (~38.5)' },
  { t: 39.0, kind: 'rain', note: 'rain bed starts on the windows (bed, not a hit)' },
  // S5 rex-approach 40-47.5 @90 — the tread begins
  { t: b('B-Rex Attack', 0, 1), kind: 'thunder', note: 'close thunder over the jeep (~40.667)' },
  { t: b('B-Rex Attack', 0, 5), kind: 'thunder', note: 'second crack — the storm lands (~43.333)' },
  { t: b('B-Rex Attack', 1, 2), kind: 'boom', note: 'BOOM 1 — first footfall; water-cup ripple ring 1 (44.0)' },
  { t: b('B-Rex Attack', 2), kind: 'boom', note: 'BOOM 2 — cup ripple 2, rings multiply (~45.333)' },
  { t: b('B-Rex Attack', 2, 2), kind: 'boom', note: 'BOOM 3 — the cup brims and breaks (~46.667)' },
  { t: b('B-Rex Attack', 0, 11), kind: 'sting', note: 'headlights snap on — a bald crown fills the beams (~47.333)' },
  // S6 rex-breakout 47.5-54 @90
  { t: FENCE_SMASH, kind: 'impact', note: 'FENCE SMASH — the B-REX bursts through the dead fence ON the tread; HIT-STOP #1 d0.35 (48.0, bar 3)' },
  { t: b('B-Rex Attack', 3, 2), kind: 'boom', note: 'BOOM 4 — through the wires, mud underfoot (~49.333)' },
  { t: b('B-Rex Attack', 4), kind: 'boom', note: 'BOOM 5 — snout drops to the jeep windows, snarl (~50.667, bar 4)' },
  { t: b('B-Rex Attack', 4, 2), kind: 'boom', note: 'BOOM 6 — it circles the jeep (52.0)' },
  { t: b('B-Rex Attack', 5), kind: 'boom', note: 'BOOM 7 — wind-up beside the jeep (~53.333, bar 5)' },
  // S7 rex-jeep 54-58 @90
  { t: b('B-Rex Attack', 5, 2), kind: 'impact', note: 'jeep SLAM — roof dents, glass cracks (~54.667)' },
  { t: b('B-Rex Attack', 5, 3), kind: 'boom', note: 'BOOM 8 — the shove (~55.333)' },
  { t: JEEP_FLIP, kind: 'impact', note: 'JEEP FLIP — the B-REX overturns the jeep; HIT-STOP #2 d0.35 (56.0, bar 6)' },
  { t: b('B-Rex Attack', 6, 2), kind: 'boom', note: 'BOOM 9 — it steps over the wreck (~57.333)' },
  // S8 flare-escape 58-64 @90
  { t: b('B-Rex Attack', 6, 3), kind: 'flare', note: 'Growgrant pops the FLARE — "HEY!" (58.0)' },
  { t: b('B-Rex Attack', 7), kind: 'sting', note: 'the B-REX wheels toward the light (~58.667, bar 7)' },
  { t: b('B-Rex Attack', 7, 1), kind: 'boom', note: 'BOOM 10 — stalking the flare (~59.333)' },
  { t: b('B-Rex Attack', 7, 2), kind: 'door', note: 'jeep door clanks — the kids scramble out (60.0)' },
  { t: b('B-Rex Attack', 8), kind: 'sting', note: 'the kids DASH into the dark — strings surge (~61.333, bar 8)' },
  { t: b('B-Rex Attack', 8, 1), kind: 'snap', note: 'jaws snap the flare out of the air (62.0)' },
  { t: b('B-Rex Attack', 8, 2), kind: 'sting', note: 'flare fizzles red in the grass (~62.667)' },
  { t: 63.33333333333333, kind: 'sting', note: 'half-beat pickup into the kitchen cut' },
  // S9 kitchen 64-73 @80
  { t: b('Kitchen Suspense', 0, 2), kind: 'sting', note: 'raptor snout reflections glide across the steel (~65.5)' },
  { t: 66.5, kind: 'sting', note: 'the spoon trembles in Lexi\'s grip (offbeat hitch)' },
  { t: b('Kitchen Suspense', 1), kind: 'clang', note: 'SPOON CLANG on the steel floor (67.0, bar 1)' },
  { t: b('Kitchen Suspense', 1, 2), kind: 'boom', note: 'raptor steps toward the sound, talons on tile (~68.5)' },
  { t: b('Kitchen Suspense', 1, 3), kind: 'sting', note: 'the snout turns — breath fogs the steel (~69.25)' },
  { t: b('Kitchen Suspense', 2), kind: 'sting', note: 'Lexi\'s MINT HAIR STRAND inches from the nostril — held breath (70.0, bar 2)' },
  { t: b('Kitchen Suspense', 2, 1), kind: 'door', note: 'far-door latch — the kids slip out (~70.75)' },
  { t: b('Kitchen Suspense', 2, 3), kind: 'screech', note: 'mulletraptors SCREECH and bolt after them (~72.25)' },
  // S10 clever-girl 73-77 (kitchen grid @80)
  { t: b('Kitchen Suspense', 3, 1), kind: 'sting', note: 'Mulldoon steps into the fan-light, alone (~73.75)' },
  { t: b('Kitchen Suspense', 4), kind: 'impact', note: 'the third, BIGGEST-MULLET mulletraptor POUNCES — Mulldoon down (76.0, bar 4)' },
  { t: b('Kitchen Suspense', 4, 1), kind: 'sting', note: 'the mullet settles; darkness takes the frame (~76.75)' },
  // S11 showdown 77-90 @80
  { t: b('Showdown', 0, 2), kind: 'sting', note: 'mulletraptor hiss 1, moonlit steel (~78.5)' },
  { t: b('Showdown', 0, 3), kind: 'sting', note: 'hiss 2 — the heroes back to the wall (~79.25)' },
  { t: b('Showdown', 1), kind: 'boom', note: 'talons click in — the corner tightens (80.0, bar 1)' },
  { t: b('Showdown', 1, 1), kind: 'boom', note: 'closer (~80.75)' },
  { t: b('Showdown', 1, 2), kind: 'sting', note: 'low braamy growl builds under the banner (~81.5)' },
  { t: b('Showdown', 2), kind: 'impact', note: 'the B-REX CRASHES THROUGH THE WALL — masonry burst (83.0, bar 2)' },
  { t: b('Showdown', 2, 2), kind: 'impact', note: 'it SEIZES a mulletraptor mid-lunge (~84.5)' },
  { t: b('Showdown', 2, 3), kind: 'sting', note: 'thrash — the raptor flails (~85.25)' },
  { t: BANNER_FALL, kind: 'impact', note: 'the BANNER TEARS LOOSE AND FALLS reading WHEN HAIR RULED THE EARTH; HIT-STOP #3 d0.30 (86.0, bar 3)' },
  { t: b('Showdown', 3, 1), kind: 'sting', note: 'the banner drapes over the B-REX like a cape (~86.5)' },
  { t: b('Showdown', 3, 2), kind: 'roar', note: 'victory ROAR under the fallen banner (~87.5)' },
  { t: b('Showdown', 3, 3), kind: 'door', note: 'side door — the heroes slip out (~88.25)' },
  { t: b('Showdown', 4), kind: 'rotor', note: 'helicopter rotors, distant, arriving (89.0, bar 4)' },
  // S12 dawn-payoff 90-104 @90
  { t: b('Regrow Dawn', 0), kind: 'rotor', note: 'helicopter lifts away over the sunrise sea (90.0)' },
  { t: b('Regrow Dawn', 1), kind: 'sting', note: 'the B-REX alone on the helipad — small against the sunrise (~92.667, bar 1)' },
  { t: b('Regrow Dawn', 0, 6), kind: 'sting', note: 'the crown SHIMMERS — bald to stubble sparkle (94.0)' },
  { t: REGROW_BURST, kind: 'regrow', note: 'REGROW BURST — the mane erupts in timelapse + shimmer particles (~95.333, bar 2)' },
  { t: b('Regrow Dawn', 2, 2), kind: 'sting', note: 'mane crests — full magnificence (~96.667)' },
  { t: b('Regrow Dawn', 2, 3), kind: 'sting', note: 'the inhale — chest expands (~97.333)' },
  { t: FINAL_ROAR, kind: 'roar', note: 'THE FINAL ROAR into the sunrise wind; HIT-STOP #4 d0.35 (98.0, bar 3)' },
  { t: 98.5, kind: 'wind', note: 'sunrise wind gust through the fresh mane (diegetic bed)' },
  { t: b('Regrow Dawn', 5), kind: 'sting', note: 'score resolves — D major home; tails clear by 103.9 (~103.333)' },
]

// ---------- CAPTIONS (film seconds; style hints: title/line/whisper/banner) ----------
// Fully visible = (t1 - out) - (t0 + in); floors in the header. y is in
// 1920x1080 coords inside the letterbox band [138, 942], kept clear of the
// bars and of each shot's action hotspot (noted per row).
export const CAPTIONS = [
  // Hambald's welcome — low lane y820 (hillside grass behind, heroes mid-frame).
  // 4 words -> short-dialogue minHold 2.0 (fully visible 2.32s).
  { id: 'c_welcome', text: 'Welcome... to Hairassic Park.', t0: b('Tour Whimsy', 2), t1: 17.0, style: 'line', y: 820, in: 0.2, out: 0.15, minHold: 2.0, why: 'dialogue, 4 words (<=4) — short-line exception' },
  // BIG TITLE CARD — center lane; slam on the braam at 17.0. Holds 4.45s >= 4.
  { id: 'c_title', text: 'HAIRASSIC PARK', t0: TITLE_SLAM, t1: 21.95, style: 'title', y: 540, in: 0.3, out: 0.2, minHold: 4.0, why: 'title card, brief mandates >=4s fully visible' },
  // Mal-Comb's plant — low lane y830 (bench is left, Mal-Comb right).
  // 5 words -> full 3.0s floor (fully visible 3.12s).
  { id: 'c_hairfinds', text: 'Hair, uh, finds a way.', t0: b('Hatchery Wonder', 2), t1: 30.8, style: 'line', y: 830, in: 0.2, out: 0.15 },
  // Sabotage whisper — top lane y260 (console glow is bottom-right).
  // 4 words -> short-dialogue minHold 2.0 (fully visible 2.30s).
  { id: 'c_volts', text: 'Ten thousand volts... gone.', t0: 37.3, t1: 39.8, style: 'whisper', y: 260, in: 0.1, out: 0.1, minHold: 2.0, why: 'dialogue, 4 words (<=4) — short-line exception' },
  // Growgrant's flare shout — low lane y815 (rex head + flare arc above).
  // 1 word -> short-dialogue minHold 1.8 (fully visible 1.80s).
  { id: 'c_hey', text: 'HEY!', t0: 58.05, t1: 60.0, style: 'line', y: 815, in: 0.05, out: 0.1, minHold: 1.8, why: 'dialogue, 1 word (<=4) — short-line exception' },
  // Mulldoon's mutter — top lane y260 (he stands center-low, pounce enters left).
  // 2 words -> short-dialogue minHold 1.9 (fully visible 1.90s).
  { id: 'c_clever', text: 'CLEVER GIRL.', t0: 73.5, t1: 75.6, style: 'line', y: 260, in: 0.1, out: 0.1, minHold: 1.9, why: 'dialogue, 2 words (<=4) — short-line exception' },
  // The falling banner — upper-center y480 (text resolves after the wall
  // burst, rides the 86.0 fall, drapes to 88.3). 5 words -> full 3.0s floor.
  { id: 'c_banner', text: 'WHEN HAIR RULED THE EARTH', t0: 83.5, t1: 88.3, style: 'banner', y: 480, in: 0.3, out: 0.4 },
  // THE payoff line — closing card, center y560. Brief mandates >=3.5
  // fully visible (holds 3.90s).
  { id: 'c_findsway', text: 'HAIR FINDS A WAY.', t0: 99.5, t1: 103.9, style: 'title', y: 560, in: 0.3, out: 0.2, minHold: 3.5, why: 'finale card, brief mandates >=3.5s fully visible' },
  // Small end line under the payoff — y672, clear of y560 and of the rex.
  { id: 'c_endline', text: 'A REMY BOYS BLOCKBUSTER', t0: 100.2, t1: 103.9, style: 'line', y: 672, in: 0.2, out: 0.2 },
]

// ========================= VALIDATE =========================
// node -e "import('./films/hairassic-park/timeline.js').then(m=>m.validate())"
// Prints the summary table and THROWS on any violation. Import-free.
export function validate() {
  const eps = 1e-6
  const fails = []
  const rows = []
  const bad = (passCond, msg) => (passCond ? null : msg)
  const say = (group, name, checks, detail) => {
    const msgs = checks.filter((x) => x !== null)
    const ok = msgs.length === 0
    rows.push({ group, name, ok, detail: ok ? detail : msgs.join(' ; ') })
    if (!ok) fails.push(`${group} / ${name}: ${msgs.join(' ; ')}`)
  }
  const shotOf = (t) => SHOTS.find((s) => t >= s.t0 - eps && t < s.t1 - eps)
  const wordsOf = (text) => String(text).trim().split(/\s+/).filter(Boolean).length

  // --- A. structure ---
  say('A structure', 'DURATION',
    [bad(DURATION >= 100 && DURATION <= 106, `DURATION ${DURATION} outside 100-106`)],
    `DURATION = ${DURATION.toFixed(1)}s`)
  let prev = 0
  for (const s of SHOTS) {
    say('A structure', `shot ${s.name}`,
      [bad(s.t0 === prev, `t0 ${s.t0} != ${prev} (gap/overlap)`),
       bad(s.t1 > s.t0, `t1 ${s.t1} <= t0`),
       bad(s.t1 - s.t0 >= 3, `length ${(s.t1 - s.t0).toFixed(1)}s < 3s`),
       bad(typeof s.cam === 'string' && s.cam.length > 0, 'missing cam'),
       bad(typeof s.action === 'string' && s.action.length > 0, 'missing action'),
       bad(typeof s.vfx === 'string' && s.vfx.length > 0, 'missing vfx')],
      `film ${s.t0.toFixed(2)}-${s.t1.toFixed(2)} (${(s.t1 - s.t0).toFixed(1)}s)`)
    prev = s.t1
  }
  say('A structure', 'coverage',
    [bad(prev === DURATION, `last t1 ${prev} != DURATION ${DURATION}`)],
    'cuts ' + SHOTS.map((s) => s.t0).concat(DURATION).join(' / '))

  // --- B. hit-stops ---
  const stopFilmStart = (st) => {
    const clk = CLOCKS[st.shot]
    return clk ? clk.abs(st.g) : NaN
  }
  let lastStart = -Infinity
  for (const st of STOPS) {
    const shot = SHOTS.find((s) => s.name === st.shot)
    const start = stopFilmStart(st)
    say('B stops', `${st.shot} g${Number(st.g.toFixed(3))} d${st.d}`,
      [bad(shot, `unknown shot ${st.shot}`),
       bad(st.g >= 0, 'g < 0'),
       bad(st.d > 0 && st.d <= 0.35 + eps, `d ${st.d} outside (0, 0.35]`),
       bad(shot && start >= shot.t0 - eps, 'freeze before shot start'),
       bad(shot && start + st.d <= shot.t1 + eps, `freeze spills past cut ${shot ? shot.t1 : '?'}`),
       bad(start >= lastStart, 'STOPS not sorted by film time')],
      `film ${start.toFixed(2)}-${(start + st.d).toFixed(2)}`)
    lastStart = start
  }
  const mandated = [
    ['fence smash', FENCE_SMASH, 48.0, 0.35, 'rex-breakout'],
    ['jeep flip', JEEP_FLIP, 56.0, 0.35, 'rex-jeep'],
    ['banner fall', BANNER_FALL, 86.0, 0.3, 'showdown'],
    ['final roar', FINAL_ROAR, 98.0, 0.35, 'dawn-payoff'],
  ]
  for (const [label, anchor, wantT, wantD, wantShot] of mandated) {
    const st = STOPS.find((s) => Math.abs(stopFilmStart(s) - wantT) < 0.03)
    say('B stops', `${label} @${wantT}`,
      [bad(Math.abs(anchor - wantT) <= 1e-6, `anchor ${anchor} != ${wantT} (not a whole second)`),
       bad(!!st, 'no stop at this film time'),
       ...(st ? [bad(st.shot === wantShot, `stop in ${st.shot}, expected ${wantShot}`),
                 bad(st.d === wantD, `d ${st.d} != ${wantD}`)] : [])],
      st ? `pinned, film ${stopFilmStart(st).toFixed(2)} + ${st.d}` : 'MISSING')
  }

  // --- C. captions ---
  const lanes = {}
  for (const c of CAPTIONS) {
    const shot = shotOf(c.t0)
    const vis = c.t1 - (c.out ?? 0) - (c.t0 + (c.in ?? 0))
    const floor = c.minHold ?? 3.0
    const words = wordsOf(c.text)
    // Short-dialogue exception: a minHold < 3.0 is legal ONLY when the line
    // is <= 4 words, minHold sits in 1.6-2.0, and a why is documented.
    const shortRule = c.minHold == null || c.minHold >= 3.0 ||
      (typeof c.why === 'string' && c.why.length > 8 && words <= 4 && c.minHold >= 1.6 && c.minHold <= 2.0)
    const sub = [
      bad(c.t0 >= 0 && c.t1 <= DURATION, 'outside the film'),
      bad(shot, `t0 ${c.t0} not inside any shot`),
      bad(!shot || c.t1 <= shot.t1 + eps, `t1 ${c.t1} crosses the cut at ${shot ? shot.t1 : '?'}`),
      bad((c.in ?? 0) >= 0 && (c.out ?? 0) >= 0 && (c.in ?? 0) + (c.out ?? 0) < c.t1 - c.t0, 'bad in/out rides'),
      bad(vis >= floor - eps, `fully visible ${vis.toFixed(2)}s < floor ${floor}`),
      bad(shortRule, 'minHold < 3.0 must be a documented short-dialogue line (why + <=4 words + minHold 1.6-2.0)'),
      bad(words <= 9, `${words} words on one caption (> 9)`),
      bad(c.y >= SAFE.bandY[0] && c.y <= SAFE.bandY[1], `y ${c.y} outside band [${SAFE.bandY[0]}, ${SAFE.bandY[1]}]`),
      bad(['title', 'line', 'whisper', 'banner'].includes(c.style), `unknown style ${c.style}`),
    ]
    ;(lanes[c.y] ||= []).push(c)
    say('C captions', c.id, sub,
      `${c.t0.toFixed(2)}-${c.t1.toFixed(2)} | raw ${(c.t1 - c.t0).toFixed(2)}s | fully visible ${vis.toFixed(2)}s >= ${floor} | ${c.style} y${c.y} | ${words}w`)
  }

  for (const [y, laneCaps] of Object.entries(lanes)) {
    const sub = []
    for (let i = 0; i + 1 < laneCaps.length; i++) {
      for (let j = i + 1; j < laneCaps.length; j++) {
        sub.push(bad(laneCaps[i].t1 <= laneCaps[j].t0 + eps || laneCaps[j].t1 <= laneCaps[i].t0 + eps,
          `${laneCaps[i].id} overlaps ${laneCaps[j].id}`))
      }
    }
    say('C captions', `lane y${y}`, sub, `${laneCaps.length} caption(s), no same-lane overlap`)
  }

  // --- D. beats ---
  let lastT = -Infinity
  for (const bt of BEATS) {
    const shot = shotOf(bt.t)
    say('D beats', `t${Number(bt.t.toFixed(3))} ${bt.kind}`,
      [bad(Number.isFinite(bt.t), 't not finite'),
       bad(bt.t >= 0 && bt.t < DURATION, 'outside the film'),
       bad(!!shot, `t ${bt.t} not inside any shot`),
       bad(bt.t >= lastT - eps, 'BEATS not sorted'),
       bad(typeof bt.kind === 'string' && bt.kind.length > 0, 'missing kind'),
       bad(typeof bt.note === 'string' && bt.note.length > 0, 'missing note')],
      `in ${shot ? shot.name : '?'} — ${bt.note}`)
    lastT = bt.t
  }
  for (const [label, anchor, kind] of [['FENCE_SMASH', FENCE_SMASH, 'impact'], ['JEEP_FLIP', JEEP_FLIP, 'impact'], ['BANNER_FALL', BANNER_FALL, 'impact'], ['FINAL_ROAR', FINAL_ROAR, 'roar'], ['TITLE_SLAM', TITLE_SLAM, 'sting'], ['REGROW_BURST', REGROW_BURST, 'regrow']]) {
    const hit = BEATS.filter((bt) => Math.abs(bt.t - anchor) < 1e-6)
    say('D beats', `pin ${label} @${Number(anchor.toFixed(4))}`,
      [bad(hit.length === 1, `${hit.length} beats at this t (need exactly 1)`),
       ...(hit.length ? [bad(hit[0].kind === kind, `kind ${hit[0].kind} != ${kind}`)] : [])],
      hit.length ? `${kind}: ${hit[0].note.slice(0, 60)}...` : 'MISSING')
  }

  // --- E. sections ---
  let sp = 0
  for (const sec of SECTIONS) {
    const startShot = SHOTS.find((s) => s.t0 === sec.t0)
    const endShot = SHOTS.find((s) => s.t1 === sec.t1)
    say('E sections', sec.name,
      [bad(sec.t0 === sp, `t0 ${sec.t0} != ${sp} (gap/overlap)`),
       bad(sec.t1 > sec.t0, 't1 <= t0'),
       bad(!!startShot, `t0 ${sec.t0} is not a shot boundary`),
       bad(!!endShot, `t1 ${sec.t1} is not a shot boundary`),
       bad(typeof sec.mood === 'string' && sec.mood.length > 0, 'missing mood'),
       bad(typeof sec.tempo === 'string' && sec.tempo.length > 0, 'missing tempo'),
       bad(typeof sec.key === 'string' && sec.key.length > 0, 'missing key'),
       bad(sec.bpm >= 40 && sec.bpm <= 200, `bpm ${sec.bpm} implausible`)],
      `film ${sec.t0}-${sec.t1} | ${sec.bpm} bpm ${sec.beats}/4 (bar ${((sec.beats * 60) / sec.bpm).toFixed(3)}s) | ${sec.key}`)
    sp = sec.t1
  }
  say('E sections', 'coverage', [bad(sp === DURATION, `last t1 ${sp} != DURATION`)],
    `${SECTIONS.length} sections cover [0, ${DURATION}) on shot boundaries`)

  // --- F. musical grid: the four big pins are whole seconds AND bar downbeats ---
  const pins = [
    ['TITLE_SLAM = b(Tour Whimsy,3)', TITLE_SLAM, 'Tour Whimsy', 3, 0, 17.0],
    ['FENCE_SMASH = b(B-Rex Attack,3)', FENCE_SMASH, 'B-Rex Attack', 3, 0, 48.0],
    ['JEEP_FLIP = b(B-Rex Attack,6)', JEEP_FLIP, 'B-Rex Attack', 6, 0, 56.0],
    ['BANNER_FALL = b(Showdown,3)', BANNER_FALL, 'Showdown', 3, 0, 86.0],
    ['REGROW_BURST = b(Regrow Dawn,2)', REGROW_BURST, 'Regrow Dawn', 2, 0, 95.3333],
    ['FINAL_ROAR = b(Regrow Dawn,3)', FINAL_ROAR, 'Regrow Dawn', 3, 0, 98.0],
  ]
  for (const [label, val, sect, bar, beat, want] of pins) {
    const grid = b(sect, bar, beat)
    const drift = Math.abs(val - grid) * 1000
    say('F grid', label,
      [bad(drift <= 30, `grid drift ${drift.toFixed(1)}ms`),
       bad(Math.abs(val - want) <= 30, `off the intended ${want}s mark`)],
      `${val.toFixed(4)}s (grid ${grid.toFixed(4)}, drift ${drift.toFixed(2)}ms)`)
  }

  // --- summary table ---
  const beatCount = {}
  for (const bt of BEATS) shotOf(bt.t) && (beatCount[shotOf(bt.t).name] = (beatCount[shotOf(bt.t).name] || 0) + 1)
  let out = `\n== HAIRASSIC PARK timeline validation ${'='.repeat(28)}`
  out += `\n [shots] film window          dur   stops  beats  cam/action/vfx`
  for (const s of SHOTS) {
    const ns = (STOPS_BY_SHOT[s.name] || []).length
    out += `\n   ${s.name.padEnd(16)} ${s.t0.toFixed(1).padStart(5)}-${String(s.t1.toFixed(1)).padStart(6)} ${String((s.t1 - s.t0).toFixed(1)).padStart(5)}s  ${String(ns).padStart(3)}   ${String(beatCount[s.name] || 0).padStart(4)}`
  }
  out += `\n [captions] window          raw    fully-visible (floor)  style    y    text`
  for (const c of CAPTIONS) {
    const vis = c.t1 - (c.out ?? 0) - (c.t0 + (c.in ?? 0))
    out += `\n   ${c.id.padEnd(11)} ${c.t0.toFixed(2).padStart(6)}-${c.t1.toFixed(2).padStart(6)} ${String((c.t1 - c.t0).toFixed(2)).padStart(6)}s  ${vis.toFixed(2).padStart(6)}s (>= ${(c.minHold ?? 3).toFixed(1)})  ${c.style.padEnd(8)} ${String(c.y).padStart(4)}  ${String(c.text).split('\n')[0].slice(0, 34)}`
  }
  out += `\n [stops] ${STOPS.map((st) => `${st.shot}@${stopFilmStart(st).toFixed(2)}+${st.d}`).join('  ')}`
  out += `\n [sections] ${SECTIONS.map((s) => `${s.name} ${s.t0}-${s.t1} ${s.bpm}bpm ${s.key}`).join(' | ')}`
  out += `\n== ${SHOTS.length} shots, ${CAPTIONS.length} captions, ${BEATS.length} beats, ${STOPS.length} stops, ${SECTIONS.length} sections over ${DURATION.toFixed(1)}s ==`

  const nPass = rows.filter((r) => r.ok).length
  out += `\n== ${rows.length} checks: ${nPass} pass, ${rows.length - nPass} violations ==\n`
  console.log(out)
  if (fails.length) throw new Error(`hairassic-park timeline: ${fails.length} violation(s)\n  - ` + fails.join('\n  - '))
  return out
}
