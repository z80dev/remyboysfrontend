// =====================================================================
// BREAKING BALD — A REMY BOYS CRIME EPIC · cue sheet + choreography
// =====================================================================
// The single shared source of truth that picture (film.js/art.js) AND
// score (score.js) both import. 98.0 s, 1920x1080 @60fps, 2.39:1
// letterbox, amber-dawn / teal-heisenbald / meth-blue. IMPORT-FREE:
// pure constants + small pure helpers — validate() runs under bare
// node. All pure functions of time (no Math.random, no Date, no state
// between frames).
//
// LOGLINE: a meek chemistry teacher with a magnificent red flow learns
// it is terminal — so he shaves it himself, puts on the porkpie, and
// becomes HEISENBALD, the Cabald kingpin of the desert's purest blue.
//
// ---------------------------------------------------------------------
// SHOT MAP (brief durations held; TITLES +1 s to give the title card its
// 3.0 s caption floor, CLASSROOM carries the compensation):
//   COLDOPEN 0-10 · TITLES 10-16 · CLASSROOM 16-27 · DECISION 27-36 ·
//   COOK 36-52 · DINER 52-63 · SAYMYNAME 63-77 · EMPIRE 77-86 ·
//   FINALE 86-98.   DUR = 98.0 exactly.
//
// UNITS (read before consuming anything below):
//   *_EV tables ....... shot-local WORLD seconds (g). An event at a
//                       stop's g lands at the START of its freeze
//                       (template semantics). Map to film time ONLY
//                       via CLOCK.abs(g) — never hand-add t0.
//   CLOCK.warp(lt) .... lt = SHOT-LOCAL film seconds (what draw(ctx, lt, ..)
//                       receives), NOT absolute film time; returns
//                       { g, stop, sl } — sl is a SIBLING of stop (read
//                       w.sl, never w.stop.sl).
//   MASTER + the flat SCREAMING constants .... ABSOLUTE film seconds.
//   CAPTIONS t0/t1 .... film seconds. Fully-visible window =
//                       [t0+in(+typing), t1-out]; house floor 3.0 s
//                       (end card 3.5 s).
//   FLASHES ........... [absT, peak, decay]; peaks <= 0.24, decay <= 0.2.
//   SECTIONS .......... film seconds, t0/t1 == shot boundaries 1:1.
//
// THE END-CARD ELEMENT BOXES (BR·BA) ARE NOT CAPTIONS-ONLY: the builder
// paints the boxes as picture at ENDCARD_BB; the captions carry the text.
// The D.N.R. stamp and the 99.1% stamp are motion.stamp() PICTURE, not
// captions (CAPTIONS carries the surrounding lines).
//
// ---------------------------------------------------------------------
// TEMPO ARITHMETIC (every pinned downbeat shown; checked in validate)
// Sections carry their own grids (no one bpm tiles these cuts). MASTER
// .bpm = 100 is the film's nominal tempo (titles + diner grids).
//
//   CRYSTAL_GLINT  coldopen 76 bpm 4/4 -> bar = 4*60/76  = 3.1579 s
//               bar 2 downbeat      = 0 + 2*3.1579   =  6.3158  (macro glint)
//   TITLE_SLAM    titles  100 bpm 4/4 -> bar = 4*60/100 = 2.4000 s
//               bar 1 downbeat      = 10 + 1*2.4000  = 12.4000
//   DN_STAMP      classroom 84 bpm 4/4 -> bar = 4*60/84 = 2.8571 s
//               bar 2 downbeat      = 16 + 2*2.8571  = 21.7143  (0.3 s hit-stop)
//   GRIM_READ     bar 3 downbeat      = 16 + 3*2.8571  = 24.5714  (post-stop:
//               EV g 8.2714 = 8.5714 - 0.3, the stop duration subtracted)
//   SHADES_DOWN   decision 90 bpm 4/4 -> bar = 4*60/90 = 2.6667 s
//               bar 2 downbeat      = 27 + 2*2.6667  = 32.3333  (key up, teal)
//   POUR          cook 128 bpm 4/4 -> bar = 4*60/128 = 1.8750 s
//               bar 5 downbeat      = 36 + 5*1.8750  = 45.3750  (crystal pour)
//   PURE_STAMP    bar 6 downbeat      = 36 + 6*1.8750  = 47.2500
//   BACK_ROOM     diner 100 bpm 4/4 -> bar = 2.4000 s
//               bar 1 downbeat      = 52 + 1*2.4000  = 54.4000  (music dies)
//   SLAM          saymyname 80 bpm 4/4 -> bar = 4*60/80 = 3.0000 s
//               bar 3 downbeat      = 63 + 3*3.0000  = 72.0000  (0.6 s
//               hit-stop — the film's BIGGEST freeze)
//   HOLD_WIDE     bar 4 downbeat      = 63 + 4*3.0000  = 75.0000 (film;
//               EV g 11.4 = 12.0 - 0.6, the stop duration subtracted)
//   TEDDY         empire 132 bpm 4/4 -> bar = 4*60/132 = 1.8182 s
//               bar 3 downbeat      = 77 + 3*1.8182  = 82.4545  (the splash)
//   SHADES_OFF    finale 90 bpm 4/4 -> bar = 4*60/90 = 2.6667 s
//               bar 1 downbeat      = 86 + 1*2.6667  = 88.6667
//   ENDCARD_BB    bar 3 downbeat      = 86 + 3*2.6667  = 94.0000  (D-major
//               mode flip; bar 2 = 91.3333 is the crane pull-up)
//
// ---------------------------------------------------------------------
// HIT-STOPS (world freezes; shake/flash/score keep real time via sl)
//   classroom g 5.7143 d 0.30  film 21.7143-22.0143  the D.N.R. stamp
//   saymyname g 9.0000 d 0.60  film 72.0000-72.6000  YOU'RE GODDAMN
//             RIGHT — the film's BIGGEST freeze (0.6 s)
// Events AFTER a stop subtract the prior stop duration d from their
// world g (classroom verdictIn/grimRead -0.3; saymyname turn/holdWide
// -0.6) — see the warp contract. The cook/empire stamps and montage
// cuts are pinned on downbeats WITHOUT stops: flash + impact carry them.
//
// ---------------------------------------------------------------------
// SCREENPLAY DECISIONS (all cross-checked against the brief):
//  1. NO shot-boundary shifts vs the map above. TITLES runs 6 s (brief
//     ~5) because 'BREAKING BALD' must hold 3.0 s visible after its
//     bar-1 slam; CLASSROOM pays the second back (11 s, brief 10-12).
//  2. THE DECISION carries TWO captions (the choice / the birth); the
//     baldify reveal itself is picture (hair falls at 30.4, scalp at
//     31.6, porkpie 32.0, shades on the 32.3333 downbeat + teal flip).
//  3. Cook stamps '99.1% PURE FLOW' as picture at PURE_STAMP; caption
//     k2 lands 0.25 s later so the stamp frame stays clean.
//  4. Say-my-name dialogue chains ride the house minimum 0.2/0.15;
//     'YOU'RE GODDAMN RIGHT.' uses in 0 (cut in ON the freeze) and
//     holds 3.65 s visible across the resume.
//  5. Lieutenant 452 stays BENCHED (casting.md scopes him to a dinner-
//     negotiation beat; this cut has none). Henchmen: 129/183 flank the
//     warehouse wide; 458/564/808/892 are the hooded far rows (diner +
//     warehouse), flat #0a0a0f silhouette pass.
//  6. Caption floor 16px-equivalent at 960x540 = 32px at 1080p: every
//     caption row carries an explicit size >= 32 (end card 96, measured
//     safe for its 5 glyphs in Anton).
// =====================================================================

export const DUR = 98.0

// ---------- shot map (film seconds; contiguous, covers [0, 98) exactly) ----------
// CUTS:  0        10        16        27        36        52        63        77        86        98
export const T = {
  coldopen: 0,   // S1 dawn desert, the RV, one blue crystal  0-10  (10.0)
  titles: 10,    // S2 Br + Ba boxes, BREAKING BALD slam     10-16  (6.0)
  classroom: 16, // S3 Mr. Flow, the chalk, the D.N.R. stamp  16-27  (11.0)
  decision: 27,  // S4 the mirror, the clippers, HEISENBALD   27-36  (9.0)
  cook: 36,      // S5 the RV lab, the pour, 99.1% PURE      36-52  (16.0)
  diner: 52,     // S6 Los Flowos, the vial, oblivious Hank  52-63  (11.0)
  saymyname: 63, // S7 the warehouse, SAY MY NAME + THE SLAM 63-77  (14.0)
  empire: 77,    // S8 beat-synced empire montage            77-86  (9.0)
  finale: 86,    // S9 shades off, confession, crystal stars 86-98  (12.0)
}

export const SHOTS = [
  { name: 'coldopen', t0: T.coldopen, t1: T.titles,
    desc: 'Extreme-wide DAWN DESERT, camera in a glacial PUSH-IN (scale 1.0->1.15) over the flats. Amber light, heat-shimmer bands, seeded dust devils. A lone beige RV CHUGS frame-left to the mid-frame flats (world path: far ridge line -> mid-frame, dust tail blooming behind; drive-cycle bounce). At CRYSTAL_GLINT (bar 2) the push lands on a MACRO of one blue crystal half-buried in sand — dawn catches it: one glint ring + soft flash; hold the shimmer. Bloom restrained (bright sky: bloom <= 0.12, thresh >= 0.9). Dread drone states BALD minor (D-F-A) on bars 0/1/2; smash to black at 9.6.' },
  { name: 'titles', t0: T.titles, t1: T.classroom,
    desc: 'Void black; camera DEAD-CENTER HOLD with a 1.02 punch-in on every arrival. Two green periodic-table element boxes ASSEMBLE: Br slams in at g0 (jitter-settle like a lab tile), Ba slams adjacent on beat 3 (g1.2), the boxes CLICK together at g2.0 with a dust puff — TITLE SLAM BREAKING BALD at g2.4 (Anton white, green under-glow, braam + flash 0.2; the Br box sits over BReaking, the Ba over BALd). Faint green scanlines and drifting atom motes behind. Subtitle A REMY BOYS CRIME EPIC settles beneath; card breathes out at g5.9.' },
  { name: 'classroom', t0: T.classroom, t1: T.decision,
    desc: 'Wide CLASSROOM in dusty morning window shafts; rows of empty desks; Mr. Flow (42, UN-baldified, red flow 893c3b) at the chalkboard: chalk lettering HAIR IS CHEMISTRY + a follicle molecule diagram. Camera: slow LATERAL DOLLY left->right along the board (desks parallax in front). World actions: he taps the diagram g1.5 (chalk tap), coughs into a fist g4.2, the chalk SLIPS and bounces on the floor tray g5.2. At panelIn g5.5 a framed DOCTOR PANEL slides over the board: X-ray of a skull thinning at the crown; at g5.7143 (bar 2) the D.N.R. stamp SLAMS the panel — 0.3 s hit-stop, flash, ONE sub inside the freeze. Post-freeze he stares (grimRead, bar 3); grade cools blue. Score dies at panelIn; silence does the diagnosis.' },
  { name: 'decision', t0: T.decision, t1: T.cook,
    desc: 'BATHROOM mirror: cold fluorescent top-light, teal under-glow off the sink porcelain; camera is a locked MIRROR PUSH-IN (scale 1.0->1.3 on the reflection, no parallax — it is a mirror). World actions of 42: stare g0-1.5; clippers snap on g1.5 (dry electric buzz); first pass up the crown g2.0; red hair falls in analytic clumps into the basin g3.4 (seeded particles, no integration); baldify reveal — scalp pale under the bar light g4.6 (films/fade-to-bald baldify pattern, skin d0bdb1); the black porkpie places on the scalp line g5.0; at SHADES_DOWN (bar 2, g5.3333) the shades come down, the goatee lands, and the grade FLIPS WARM->TEAL + the score keys up a step. Hold the HEISENBALD mirror silhouette to the cut.' },
  { name: 'cook', t0: T.cook, t1: T.diner,
    desc: 'RV LAB interior, night: single practical key — burner flame under glassware, flask glow green->blue, dust motes in the beam. Two hazmat-yellow suits (f7d33c) with gas masks: HEISENBALD (42 baldified) left of the rig, JESSE (186, pink crop de9c9c under the hood) right; camera HANDHELD MICRO-DRIFT, then a beat-synced CUT MONTAGE on each bar downbeat (burners / tubing / mask tilt / boil close-up). World actions: first flask glows green g1.875 (bar 1); vapor turns BLUE g3.75 (bar 2, masks tilt in to watch); montage cuts g5.625/g7.5; molten blue POURS into the cast g9.375 (bar 5, riser resolves); stamp 99.1% PURE FLOW slams the label g11.25 (bar 6, flash, no stop); cash starts stacking on the counter g12.75. Driving 128 bpm desert-rock pulse throughout.' },
  { name: 'diner', t0: T.diner, t1: T.saymyname,
    desc: 'LOS FLOWOS HERMANOS. Front of house in warm commercial light: GUS ALT 5 (yellow tee dccc5e, name-tag grin) serves a steaming bucket to a booth; camera CRANE-DOWN from the menu board to counter level. At BACK_ROOM (bar 1, 54.4) a pass-through cut to the cold back room (steel-blue key): GUS 1217 (white gi dad6d3, rimless glasses) inspects a blue vial to the light and turns it cold; the HOODED HENCHMEN ROW (458/564/808/892 far sprites, flat #0a0a0f silhouettes) lines the wall at 56.8 (bar 2). At 59.2 (bar 3) cut to HANK 28 in a corner booth eating chicken, FLOW ENFORCEMENT badge flat on the table — oblivious; at 61.6 (bar 4) the badge GLINTS and through the round porthole window the kingpin watches him eat. Cheerful plucks die on the pass-through; low threat under.' },
  { name: 'saymyname', t0: T.saymyname, t1: T.empire,
    desc: 'WAREHOUSE: god-shafts through roof holes, dust hanging in the beams; camera in a slow WIDE PUSH on the face-off — HEISENBALD (42: porkpie, shades, goatee) frame-left, GUS 1217 frame-right, henchmen 129/183 flanking near. Close-up GUS on bar 1 (66.0, 1.6x lens crop): Say my name. Close-up HEISENBALD on bar 2 (69.0): ...You\'re Heisenbald. — he lets it hang. DEAD BEAT 71.5: wind dies, score drops to a sub pulse. On bar 3 (72.0) THE SLAM: caption YOU\'RE GODDAMN RIGHT. hits ON the downbeat with the film\'s biggest hit-stop (0.6 s; flash 0.24; shake lives in real time via sl). Freeze interior: dust motes hang, Gus does not move. Resume: the kingpin turns and walks out, henchmen falling in behind (73.2); wide hold from bar 4 (75.0) until the cut.' },
  { name: 'empire', t0: T.empire, t1: T.finale,
    desc: 'Beat-synced CUT MONTAGE — one vignette per bar (1.8182 s), hard cuts ON the downbeats, one instrument hit per cut: (1) cash walls, banded stacks to the ceiling, warm practicals, PUSH-IN; (2) a crystal CHANDELIER of blue shards turning, specular sparkle, slow ORBIT-TILT; (3) the BARREL field under tarps at cold dawn haze, LATERAL PAN; (4) the half-burned PINK TEDDY bear face-down in a still pool — splash ring + soft flash on the downbeat, TOP-DOWN HOLD (pink = Jesse de9c9c, the iconic nod); (5) city skyline at dusk, one tower lit blue (#63c5ff), PULL-BACK. No transitions: the cut IS the edit.' },
  { name: 'finale', t0: T.finale, t1: DUR,
    desc: 'Night desert, moonlight + one lantern by the RV; camera starts CLOSE on HEISENBALD alone, then a continuous CRANE PULL-UP from bar 2 (91.3333) — the RV shrinks, the dark sand fills with blue crystals glowing like a star field (#63c5ff pinpoints) by bar 3. World actions: he stands alone g0; removes the SHADES on bar 1 (88.6667 — bare scalp in starlight, eyes up, porkpie stays); the confession plays over bare piano; at ENDCARD_BB (94.0, bar 3) the Br/Ba boxes reassemble as BR·BA + credits, and the mode flips D minor -> D MAJOR. Hold the card to 97.9; all reverb tails resolve before 98.' },
]

// ---------- shot clocks: copied verbatim from films/3000/timeline.js ----------
//   stops: [{ g, d }] in shot-local WORLD time; the freeze pins g at s.g while
//   sl counts real seconds into the stop (effects animate off real t).
// An event scheduled AT a stop's g lands at the START of its freeze (intentional).
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

// ---------- score sections (defined before the clocks: the D.N.R. stamp and
// THE SLAM are grid-derived, so their stop g values come from b()) ----------
// Each section's t0 is a downbeat by construction (b(section, 0, 0) = t0).
// Key plan: home key D minor; DECISION keys up a WHOLE STEP to E minor on
// the SHADES_DOWN reveal (32.3333) and the cook/empire live in E minor;
// SAYMYNAME falls back to D minor; FINALE mode-flips to D MAJOR on the end
// card (94.0) — the dread -> ownership arc of the whole film.
export const SECTIONS = [
  { name: 'coldopen', t0: T.coldopen, t1: T.titles, bpm: 76, beats: 4, key: 'D minor',
    feel: 'dread drone from g0; BALD minor (D-F-A) stated on bars 0/1/2 (BALD_TIMES 0 / 3.1579 / 6.3158); RV engine chug is foley, NOT percussion; one bell tick on CRYSTAL_GLINT (bar 2) into the smash-to-black at 9.6. All tails clear before the titles void.' },
  { name: 'titles', t0: T.titles, t1: T.classroom, bpm: 100, beats: 4, key: 'D minor',
    feel: 'Geiger-counter element clicks: Br on bar 0 (10.0), Ba on bar 0 beat 2 (11.2), boxes click g2.0; BRAAM exactly on the title slam (bar 1, 12.4); subtitle settles under the wash. Hard out into the classroom fluorescent hum.' },
  { name: 'classroom', t0: T.classroom, t1: T.decision, bpm: 84, beats: 4, key: 'D minor',
    feel: 'sparse tick-tock piano (the BB clock motif) under the lesson; SCORE DIES at panelIn (21.5) — chalk clatter only; DN_STAMP = bar 2 (21.7143): one impact into the 0.3 s freeze, ONE sub + hiss inside it, resumes at 22.0143; cold strings re-enter at verdictIn (22.2) and darken to bar 3 (grimRead 24.5714).' },
  { name: 'decision', t0: T.decision, t1: T.cook, bpm: 90, beats: 4, key: 'D minor -> E minor at bar 2',
    feel: 'fluorescent hum + clippers buzz as percussion; first pass 29.0 rides a nervous tic; KEY UP A WHOLE STEP exactly on SHADES_DOWN (bar 2, 32.3333) — one bare E-minor stab under the teal flip; nothing else: the reveal is the music. Drone out.' },
  { name: 'cook', t0: T.cook, t1: T.diner, bpm: 128, beats: 4, key: 'E minor',
    feel: 'driving desert-rock pulse: kick + bass ostinato on every beat, plucks answer on the off-beats; montage cuts 41.625/43.5 get fill accents; POUR = bar 5 (45.375) — riser resolves, groove drops to half for two beats; PURE_STAMP = bar 6 (47.25) impact; cash foley (soft clatter loops) from 48.75; groove rides out under the cut.' },
  { name: 'diner', t0: T.diner, t1: T.saymyname, bpm: 100, beats: 4, key: 'C major politeness -> D minor at bar 1',
    feel: 'cheerful front-of-house plucks (fake commercial jingle, deliberately plastic); music DIES on the pass-through at BACK_ROOM (bar 1, 54.4) — fridge hum only; low threat drone from hoodRow (56.8); the hankWatch booth (59.2) gets a tiny comedic oblivious bounce; badge glint 61.6 = one metallic tick.' },
  { name: 'saymyname', t0: T.saymyname, t1: T.empire, bpm: 80, beats: 4, key: 'D minor',
    feel: 'sparse dry ticks under the wide (one per beat, no melody); close-ups 66.0/69.0 keep the ticks, add one low string each; DEAD BEAT 71.5 — TOTAL drop to a single sub pulse; SLAM = bar 3 (72.0): choir stab + mega impact into the 0.6 s freeze, silence inside except one sub/hiss at +0.065; resume at 72.6 with a low drone only; HOLD_WIDE bar 4 (75.0) fades under.' },
  { name: 'empire', t0: T.empire, t1: T.finale, bpm: 132, beats: 4, key: 'E minor',
    feel: 'machine montage: one percussive hit PER CUT — cash = clap (77.0), chandelier = bell shimmer (78.8182), barrels = clunk (80.6364), teddy = glass + sub splash (82.4545, half-beat of near-silence after), skyline = sweep down (84.2727); kick pulses 2/4 beneath, no melody: money has no theme.' },
  { name: 'finale', t0: T.finale, t1: DUR, bpm: 90, beats: 4, key: 'D minor -> D MAJOR at bar 3',
    feel: 'bare piano + night wind under the confession (shadesOff 88.6667 gets one soft string swell); the crane pull-up (bar 2, 91.3333) adds low strings rising; MODE FLIP to D MAJOR exactly on the end card (bar 3, 94.0): BALD restated major (D-F#-A) over star-field strings, resolved by 97.5 so all tails finish before 98.' },
]

// ---------- bar/beat grid helpers (floz pattern) ----------
// b(section, bar, beat=0) -> absolute film seconds of that beat
// (bar 0 beat 0 = the section downbeat). Never hand-add delays to these.
const SECT = {}
for (const s of SECTIONS) SECT[s.name] = s

export const b = (name, bar, beat = 0) => {
  const s = SECT[name]
  return s.t0 + ((bar * s.beats + beat) * 60) / s.bpm
}
export const barSec = (name) => (SECT[name].beats * 60) / SECT[name].bpm
export const beatSec = (name) => 60 / SECT[name].bpm

// ---------- motifs (original; MIDI offsets from the root; quote nothing) ----------
// BALD: D-F-A, the dread stated by the cold-open drone; restated MAJOR
// (D-F#-A) by the star field at the end card — the mode-flip IS the arc:
// he no longer did it for the family. Times are the three drone statements.
export const BALD_ROOT = 62                    // D4
export const BALD_MINOR = [0, 3, 7]            // D-F-A (cold-open dread)
export const BALD_MAJOR = [0, 4, 7]            // D-F#-A (finale ownership)
export const BALD_TIMES = [b('coldopen', 0), b('coldopen', 1), b('coldopen', 2)] // 0 / 3.1579 / 6.3158
export const motif = (major = false) => (major ? BALD_MAJOR : BALD_MINOR).map((k) => BALD_ROOT + k)

// ---------- hit-stop map, per shot (world-time g; see header table) ----------
export const STOPS = {
  coldopen: [],
  titles: [],
  classroom: [{ g: b('classroom', 2) - T.classroom, d: 0.3 }], // D.N.R. stamp (film 21.7143-22.0143)
  decision: [],
  cook: [],                     // the 99.1% stamp is flash + impact, NOT a freeze
  diner: [],
  saymyname: [{ g: b('saymyname', 3) - T.saymyname, d: 0.6 }], // THE SLAM (film 72.0-72.6) — biggest
  empire: [],
  finale: [],
}

// One clock per shot, named for its shot.
export const COLDOPEN  = makeClock(T.coldopen,  STOPS.coldopen)
export const TITLES    = makeClock(T.titles,    STOPS.titles)
export const CLASSROOM = makeClock(T.classroom, STOPS.classroom)
export const DECISION  = makeClock(T.decision,  STOPS.decision)
export const COOK      = makeClock(T.cook,      STOPS.cook)
export const DINER     = makeClock(T.diner,     STOPS.diner)
export const SAYMYNAME = makeClock(T.saymyname, STOPS.saymyname)
export const EMPIRE    = makeClock(T.empire,    STOPS.empire)
export const FINALE    = makeClock(T.finale,    STOPS.finale)

const CLK = { coldopen: COLDOPEN, titles: TITLES, classroom: CLASSROOM, decision: DECISION, cook: COOK, diner: DINER, saymyname: SAYMYNAME, empire: EMPIRE, finale: FINALE }

// ---------- per-shot events (g = shot-local WORLD seconds; map with CLK[name].abs(g)) ----------
// S1: cold open — the RV, the shimmer, one blue crystal.
export const COLDOPEN_EV = {
  dawn: 0.0,         // extreme-wide dawn desert; heat shimmer bands in
  rvEnter: 0.8,      // the RV crests the far ridge, frame-left (push-in under way)
  rvMid: 4.0,        // RV reaches the mid-frame flats; dust tail full
  glint: 6.31578947368421, // CRYSTAL_GLINT (film 6.3158 = bar 2 downbeat): macro blue
                     // crystal catches dawn — glint ring + soft flash
  glintHold: 7.5,    // macro holds; shimmer breathes over the crystal
  smash: 9.6,        // smash to black lead-in
  cut: 10.0,         // into the titles void
}

// S2: titles — Br + Ba assemble, the slam.
export const TITLES_EV = {
  brBox: 0.0,        // Br element box slams in (film 10.0, bar 0)
  baBox: 1.2,        // Ba element box slams adjacent (film 11.2 = bar 0 beat 2)
  boxesClick: 2.0,   // the boxes snap together; dust puff
  titleSlam: 2.4,    // TITLE SLAM BREAKING BALD (film 12.4 = bar 1 downbeat): braam + flash
  subtitle: 2.6,     // A REMY BOYS CRIME EPIC settles under (film 12.6)
  cardOut: 5.9,      // card breathes out
  cut: 6.0,          // into the classroom
}

// S3: the classroom — the lesson, the chalk, the D.N.R. stamp.
export const CLASSROOM_EV = {
  board: 0.0,        // wide: HAIR IS CHEMISTRY board + follicle diagram; dolly begins
  lessonIn: 0.5,     // caption c1 t0 (film 16.5)
  chalkTap: 1.5,     // he taps the diagram; chalk tap
  cough: 4.2,        // the cough into a fist — the first warning
  chalkDrop: 5.2,    // the chalk slips and bounces on the floor tray
  panelIn: 5.5,      // doctor panel slides in: X-ray skull thinning at the crown (film 21.5);
                     // score dies here
  stamp: 5.714285714285714, // D.N.R. STAMP (film 21.7143 = bar 2 downbeat); 0.3 s
                            // hit-stop; verdict text is motion.stamp picture
  verdictIn: 5.9,    // caption c2 t0 (film 22.2 = 16 + 5.9 + 0.3; stop d subtracted)
  grimRead: 8.27142857142857, // he stares at the stamp (film 24.5714 = bar 3;
                              // = 8.5714 - 0.3, the stop duration subtracted)
  cut: 10.7,         // = worldLen (film 27.0); the 0.3 stop shifts the boundary
}

// S4: the decision — clippers, baldify, the porkpie, the shades.
export const DECISION_EV = {
  mirror: 0.0,       // the stare: red hair's last look in the fluorescent mirror
  choiceIn: 0.2,     // caption d1 t0 (film 27.2)
  clippers: 1.5,     // clippers snap on (28.5)
  firstPass: 2.0,    // first pass up the crown (29.0)
  hairFalls: 3.4,    // red hair falls into the basin in clumps (30.4)
  bald: 4.6,         // baldify reveal: the scalp, pale under the bar light (31.6)
  hat: 5.0,          // the porkpie places on the scalp line (32.0)
  shadesDown: 5.333333333333333, // SHADES DOWN (film 32.3333 = bar 2 downbeat): the
                                 // look completes; grade flips WARM->TEAL; key up a step
  bornIn: 5.5,       // caption d2 t0 (film 32.5)
  silhouette: 6.5,   // hold the HEISENBALD mirror silhouette (33.5)
  cut: 9.0,          // to the RV lab
}

// S5: the cook — green to blue, the pour, the stamp, the cash.
export const COOK_EV = {
  labIn: 0.0,        // RV interior: burners under glassware; two suits at the rig
  cookIn: 0.4,       // caption k1 t0 (film 36.4)
  flaskGlow: 1.875,  // first flask glows GREEN (film 37.875 = bar 1 downbeat)
  vaporBlue: 3.75,   // vapor turns BLUE; masks tilt in (film 39.75 = bar 2)
  montage1: 5.625,   // montage cut 1: tubing + burners (film 41.625 = bar 3)
  montage2: 7.5,     // montage cut 2: masks watch the boil (film 43.5 = bar 4)
  pour: 9.375,       // THE POUR: molten blue into the cast (film 45.375 = bar 5);
                     // riser resolves here
  pureStamp: 11.25,  // stamp 99.1% PURE FLOW slams the label (film 47.25 = bar 6)
  pureIn: 11.5,      // caption k2 t0 (film 47.5; keeps the stamp frame clean)
  cash: 12.75,       // cash starts stacking on the counter (film 48.75)
  cut: 16.0,         // to Los Flowos
}

// S6: Los Flowos Hermanos — the bucket, the vial, oblivious Hank.
export const DINER_EV = {
  front: 0.0,        // front of house: the bucket lands at the booth; crane-down ends
  chickenIn: 0.4,    // caption lo1 t0 (film 52.4)
  backRoom: 2.4,     // pass-through to the back room: the vial to the light
                     // (film 54.4 = bar 1 downbeat); front-of-house music dies
  kingpinIn: 3.9,    // caption lo2 t0 (film 55.9)
  hoodRow: 4.8,      // hooded henchmen row lines the wall (film 56.8 = bar 2)
  hankWatch: 7.2,    // cut to Hank + badge + drumstick (film 59.2 = bar 3)
  hankIn: 7.4,       // caption lo3 t0 (film 59.4)
  badgeGlint: 9.6,   // the badge glints; the kingpin watches through the porthole
                     // (film 61.6 = bar 4)
  cut: 11.0,         // to the warehouse
}

// S7: say my name — the ask, the answer, THE SLAM.
export const SAYMYNAME_EV = {
  warehouse: 0.0,    // wide: the face-off under god-shafts; henchmen flank
  sayName: 0.6,      // caption s1 t0 (film 63.6)
  closeGus: 3.0,     // close-up GUS on the ask (film 66.0 = bar 1 downbeat)
  answerIn: 4.1,     // caption s2 t0 (film 67.1)
  closeWalt: 6.0,    // close-up HEISENBALD on the answer (film 69.0 = bar 2)
  beat: 8.5,         // THE DEAD BEAT: wind dies, score drops to one sub pulse (film 71.5)
  slam: 9.0,         // THE SLAM: YOU'RE GODDAMN RIGHT. (film 72.0 = bar 3 downbeat);
                     // 0.6 s hit-stop — the film's BIGGEST freeze
  turn: 9.6,         // the kingpin turns and walks; henchmen fall in behind
                     // (film 73.2 = 63 + 9.6 + 0.6; stop d subtracted)
  holdWide: 11.4,    // wide hold (film 75.0 = bar 4 downbeat; = 12.0 - 0.6)
  cut: 13.4,         // = worldLen (film 77.0); the 0.6 stop shifts the boundary
}

// S8: the empire — five vignettes, hard cuts on the downbeats.
export const EMPIRE_EV = {
  cashWalls: 0.0,    // cut 1: cash walls (film 77.0 = bar 0 downbeat)
  blueIn: 0.5,       // caption e1 t0 (film 77.5)
  chandelier: 1.8181818181818181, // cut 2: crystal chandelier of blue shards (film 78.8182 = bar 1)
  barrels: 3.6363636363636362,    // cut 3: barrel field under tarps (film 80.6364 = bar 2)
  teddy: 5.454545454545454,       // cut 4: the half-burned pink teddy face-down in the
                                  // pool (film 82.4545 = bar 3); splash ring + soft flash
  falloutIn: 5.5,    // caption e2 t0 (film 82.5)
  skyline: 7.2727272727272725,    // cut 5: city skyline at dusk, one tower lit blue
                                  // (film 84.2727 = bar 4)
  cut: 9.0,          // to the night desert
}

// S9: the finale — shades off, the confession, the crystal stars.
export const FINALE_EV = {
  alone: 0.0,        // night desert: HEISENBALD alone by the RV; lantern light
  shadesOff: 2.6666666666666665, // he removes the SHADES (film 88.6667 = bar 1 downbeat);
                                 // bare scalp in starlight, porkpie stays
  confessionIn: 3.0, // caption f1 t0 (film 89.0)
  pullUp: 5.333333333333333, // the CRANE PULL-UP begins (film 91.3333 = bar 2 downbeat)
  starField: 8.0,    // the dark sand fills with blue crystals glowing like stars
                     // (film 94.0 = bar 3 downbeat)
  endCard: 8.0,      // END CARD: BR·BA boxes reassemble; mode flips to D MAJOR (film 94.0)
  creditIn: 8.0,     // production credit + no-hairs card (film 94.0)
  end: 11.9,         // last caption t1 (film 97.9); tails already resolved
  cut: 12.0,         // to black = film 98.0
}

// ---------- MASTER event table (absolute film seconds; all clock-derived) ----------
// Every value = shot t0 + filmT(some EV of that shot) — never recompute by
// hand. MASTER also carries the musical map (bpm / sections / motifs).
export const MASTER = {
  // --- musical map ---
  bpm: 100,                                 // nominal film tempo (titles + diner grids)
  sections: SECTIONS,                       // name/t0/t1 match SHOTS 1:1 (validated)
  motifs: {
    bald: { root: BALD_ROOT, minor: BALD_MINOR, major: BALD_MAJOR, times: BALD_TIMES,
            instrument: 'sub-drone + plucks (score.js blend)', shot: 'coldopen' },
    modeFlip: { t: FINALE.abs(FINALE_EV.starField), from: 'D minor', to: 'D MAJOR',
                restatement: 'BALD major over star-field strings at the end card (film 94.0)' },
  },

  // --- S1 cold open ---
  coldopenIn: COLDOPEN.abs(COLDOPEN_EV.dawn),  // 0.0 shot start
  rvEnter: COLDOPEN.abs(COLDOPEN_EV.rvEnter),  // 0.8
  rvMid: COLDOPEN.abs(COLDOPEN_EV.rvMid),      // 4.0
  glint: COLDOPEN.abs(COLDOPEN_EV.glint),      // 6.3158 == b('coldopen',2)
  glintHold: COLDOPEN.abs(COLDOPEN_EV.glintHold), // 7.5
  smashIn: COLDOPEN.abs(COLDOPEN_EV.smash),    // 9.6

  // --- S2 titles ---
  titlesIn: TITLES.abs(TITLES_EV.brBox),       // 10.0 shot start
  brBox: TITLES.abs(TITLES_EV.brBox),          // 10.0  Br box
  baBox: TITLES.abs(TITLES_EV.baBox),          // 11.2  Ba box
  boxesClick: TITLES.abs(TITLES_EV.boxesClick), // 12.0
  titleSlam: TITLES.abs(TITLES_EV.titleSlam),  // 12.4 == b('titles',1)
  subtitleIn: TITLES.abs(TITLES_EV.subtitle),  // 12.6
  cardOut: TITLES.abs(TITLES_EV.cardOut),      // 15.9

  // --- S3 classroom + the D.N.R. stamp ---
  classroomIn: CLASSROOM.abs(CLASSROOM_EV.board), // 16.0 shot start
  lessonIn: CLASSROOM.abs(CLASSROOM_EV.lessonIn), // 16.5 (caption c1)
  chalkTap: CLASSROOM.abs(CLASSROOM_EV.chalkTap), // 17.5
  cough: CLASSROOM.abs(CLASSROOM_EV.cough),       // 20.2
  chalkDrop: CLASSROOM.abs(CLASSROOM_EV.chalkDrop), // 21.2
  panelIn: CLASSROOM.abs(CLASSROOM_EV.panelIn),   // 21.5 (score dies)
  dnStamp: CLASSROOM.abs(CLASSROOM_EV.stamp),     // 21.7143 == b('classroom',2) — freeze start
  verdictIn: CLASSROOM.abs(CLASSROOM_EV.verdictIn), // 22.2 (caption c2, post-stop)
  grimRead: CLASSROOM.abs(CLASSROOM_EV.grimRead), // 24.5714 == b('classroom',3)

  // --- S4 the decision ---
  decisionIn: DECISION.abs(DECISION_EV.mirror), // 27.0 shot start
  choiceIn: DECISION.abs(DECISION_EV.choiceIn), // 27.2 (caption d1)
  clippers: DECISION.abs(DECISION_EV.clippers), // 28.5
  firstPass: DECISION.abs(DECISION_EV.firstPass), // 29.0
  hairFalls: DECISION.abs(DECISION_EV.hairFalls), // 30.4
  baldReveal: DECISION.abs(DECISION_EV.bald),   // 31.6
  hatOn: DECISION.abs(DECISION_EV.hat),         // 32.0
  shadesDown: DECISION.abs(DECISION_EV.shadesDown), // 32.3333 == b('decision',2) — teal flip
  bornIn: DECISION.abs(DECISION_EV.bornIn),     // 32.5 (caption d2)
  silhouette: DECISION.abs(DECISION_EV.silhouette), // 33.5

  // --- S5 the cook ---
  cookStart: COOK.abs(COOK_EV.labIn),           // 36.0 shot start
  cookIn: COOK.abs(COOK_EV.cookIn),             // 36.4 (caption k1)
  flaskGlow: COOK.abs(COOK_EV.flaskGlow),       // 37.875 == b('cook',1)
  vaporBlue: COOK.abs(COOK_EV.vaporBlue),       // 39.75 == b('cook',2)
  montage1: COOK.abs(COOK_EV.montage1),         // 41.625 == b('cook',3)
  montage2: COOK.abs(COOK_EV.montage2),         // 43.5 == b('cook',4)
  pour: COOK.abs(COOK_EV.pour),                 // 45.375 == b('cook',5)
  pureStamp: COOK.abs(COOK_EV.pureStamp),       // 47.25 == b('cook',6)
  pureIn: COOK.abs(COOK_EV.pureIn),             // 47.5 (caption k2)
  cashStack: COOK.abs(COOK_EV.cash),            // 48.75

  // --- S6 Los Flowos ---
  dinerIn: DINER.abs(DINER_EV.front),           // 52.0 shot start
  chickenIn: DINER.abs(DINER_EV.chickenIn),     // 52.4 (caption lo1)
  backRoom: DINER.abs(DINER_EV.backRoom),       // 54.4 == b('diner',1) — music dies
  kingpinIn: DINER.abs(DINER_EV.kingpinIn),     // 55.9 (caption lo2)
  hoodRow: DINER.abs(DINER_EV.hoodRow),         // 56.8 == b('diner',2)
  hankWatch: DINER.abs(DINER_EV.hankWatch),     // 59.2 == b('diner',3)
  hankIn: DINER.abs(DINER_EV.hankIn),           // 59.4 (caption lo3)
  badgeGlint: DINER.abs(DINER_EV.badgeGlint),   // 61.6 == b('diner',4)

  // --- S7 say my name + THE SLAM ---
  saymynameIn: SAYMYNAME.abs(SAYMYNAME_EV.warehouse), // 63.0 shot start
  sayName: SAYMYNAME.abs(SAYMYNAME_EV.sayName), // 63.6 (caption s1)
  closeGus: SAYMYNAME.abs(SAYMYNAME_EV.closeGus), // 66.0 == b('saymyname',1)
  answerIn: SAYMYNAME.abs(SAYMYNAME_EV.answerIn), // 67.1 (caption s2)
  closeWalt: SAYMYNAME.abs(SAYMYNAME_EV.closeWalt), // 69.0 == b('saymyname',2)
  deadBeat: SAYMYNAME.abs(SAYMYNAME_EV.beat),   // 71.5 (score drop-out)
  slam: SAYMYNAME.abs(SAYMYNAME_EV.slam),       // 72.0 == b('saymyname',3) — freeze start
  kingpinTurn: SAYMYNAME.abs(SAYMYNAME_EV.turn), // 73.2 (post-stop)
  holdWide: SAYMYNAME.abs(SAYMYNAME_EV.holdWide), // 75.0 == b('saymyname',4)

  // --- S8 the empire ---
  empireIn: EMPIRE.abs(EMPIRE_EV.cashWalls),    // 77.0 == b('empire',0)
  cashWalls: EMPIRE.abs(EMPIRE_EV.cashWalls),   // 77.0
  blueIn: EMPIRE.abs(EMPIRE_EV.blueIn),         // 77.5 (caption e1)
  chandelier: EMPIRE.abs(EMPIRE_EV.chandelier), // 78.8182 == b('empire',1)
  barrels: EMPIRE.abs(EMPIRE_EV.barrels),       // 80.6364 == b('empire',2)
  teddy: EMPIRE.abs(EMPIRE_EV.teddy),           // 82.4545 == b('empire',3)
  falloutIn: EMPIRE.abs(EMPIRE_EV.falloutIn),   // 82.5 (caption e2)
  skyline: EMPIRE.abs(EMPIRE_EV.skyline),       // 84.2727 == b('empire',4)

  // --- S9 the finale ---
  finaleIn: FINALE.abs(FINALE_EV.alone),        // 86.0 shot start
  alone: FINALE.abs(FINALE_EV.alone),           // 86.0
  shadesOff: FINALE.abs(FINALE_EV.shadesOff),   // 88.6667 == b('finale',1)
  confessionIn: FINALE.abs(FINALE_EV.confessionIn), // 89.0 (caption f1)
  pullUp: FINALE.abs(FINALE_EV.pullUp),         // 91.3333 == b('finale',2)
  starField: FINALE.abs(FINALE_EV.starField),   // 94.0 == b('finale',3)
  endCard: FINALE.abs(FINALE_EV.endCard),       // 94.0 (card slam)
  creditIn: FINALE.abs(FINALE_EV.creditIn),     // 94.0
  endOut: FINALE.abs(FINALE_EV.end),            // 97.9 (card out; tails resolved)
}

// ---------- flat load-bearing constants (ABSOLUTE film seconds) ----------
// The names the brief + composer reaching for; every one aliases MASTER.
export const CRYSTAL_GLINT = MASTER.glint           // 6.3158
export const TITLE_SLAM = MASTER.titleSlam          // 12.4
export const DN_STAMP = MASTER.dnStamp              // 21.7143 (freeze start)
export const GRIM_READ = MASTER.grimRead            // 24.5714
export const SHADES_DOWN = MASTER.shadesDown        // 32.3333 (teal flip + key up)
export const HAIR_FALLS = MASTER.hairFalls          // 30.4
export const POUR = MASTER.pour                     // 45.375
export const PURE_STAMP = MASTER.pureStamp          // 47.25
export const BACK_ROOM = MASTER.backRoom            // 54.4 (music dies)
export const HOOD_ROW = MASTER.hoodRow              // 56.8
export const BADGE_GLINT = MASTER.badgeGlint        // 61.6
export const DEAD_BEAT = MASTER.deadBeat            // 71.5 (score drop-out)
export const THE_SLAM = MASTER.slam                 // 72.0 (freeze start, biggest)
export const KINGPIN_TURN = MASTER.kingpinTurn      // 73.2
export const HOLD_WIDE = MASTER.holdWide            // 75.0
export const TEDDY = MASTER.teddy                   // 82.4545
export const SHADES_OFF = MASTER.shadesOff          // 88.6667
export const PULL_UP = MASTER.pullUp                // 91.3333
export const ENDCARD_BB = MASTER.endCard            // 94.0 (D-major flip)
export const CARD_END = MASTER.endOut               // 97.9

// ---------- caption styles film.js must register (captionStyles) ----------
// captions.js core: title (Anton big) · sub · kicker (mono) — core sub/kicker
// sizes are BELOW the 32px floor, so every caption row overrides size
// explicitly. 'speech' is film-local: Space Grotesk = the BB sans; 'slam' is
// the GODDAMN-RIGHT caption style: Anton with a meth-blue glow.
const F_GROT = '"Space Grotesk"'
const F_MONO = '"JetBrains Mono"'
export const STYLES = {
  speech: { font: F_GROT, weight: '600', size: 34, color: '#e8e4da', x: 960, y: 856, align: 'center', lineHeight: 1.3, track: 1, anim: 'fade', in: 0.3, out: 0.25, glow: '#000000', glowBlur: 10 },
  slam:   { font: 'Anton', weight: '700', size: 64, color: '#eef6ff', x: 960, y: 480, align: 'center', lineHeight: 1.2, track: 3, anim: 'cut', in: 0, out: 0.25, glow: '#63c5ff', glowBlur: 18 },
}

// ---------- safe area ----------
// 2.39:1 at 16:9: visible band = 1920/2.39 = 803 px tall -> bars (1080-803)/2
// = 138 -> band y [138, 942]. Captions stay in [180, 900]; letterbox 1.0.
export const SAFE = { letterbox: 1.0, bandY: [138, 942], captionYMin: 180, captionYMax: 900, minSize: 32 }

// ---------- CAPTIONS (film seconds; visible = (t1-out) - (t0+in) >= 3.0) ----------
// HOLD TABLE (visible legs):
//   t1_title    12.40-15.90  in .25 out .1  visible 3.15  (title lane y540; slam = braam frame)
//   t2_subtitle 12.60-15.90  in .15 out .1  visible 3.05  (sub lane y660, under title)
//   c1_lesson   16.50-20.00  in .2  out .15 visible 3.15  (clears before the cough beat)
//   c2_verdict  22.20-26.90  in .25 out .2  visible 4.25  (rides the stamp freeze + grim read)
//   d1_choice   27.20-30.70  in .25 out .2  visible 3.05  (rides the clippers)
//   d2_born     32.50-35.90  in .2  out .15 visible 3.05  (born on the teal flip)
//   k1_cook     36.40-40.00  in .3  out .25 visible 3.05
//   k2_pure     47.50-51.80  in .25 out .2  visible 3.85  (0.25 s after the stamp frame)
//   lo1_chicken 52.40-55.90  in .25 out .2  visible 3.05  (rides the pass-through)
//   lo2_kingpin 55.90-59.30  in .2  out .15 visible 3.05  (chain, touches lo1 out)
//   lo3_hank    59.40-62.90  in .2  out .15 visible 3.15
//   s1_name     63.60-67.10  in .2  out .15 visible 3.15  (dialogue chain)
//   s2_answer   67.10-70.60  in .2  out .15 visible 3.15  (chain, touches s1 out)
//   s3_right    72.00-75.90  in 0   out .25 visible 3.65  (slam lane y480; in 0 ON the freeze)
//   e1_blue     77.50-81.00  in .25 out .2  visible 3.05  (rides cash->chandelier cuts)
//   e2_fallout  82.50-85.90  in .2  out .15 visible 3.05  (0.05 s after the teddy lands)
//   f1_confess  89.00-93.30  in .3  out .35 visible 3.65  (the confession, bare piano)
//   f2_card     94.00-97.90  in 0   out .1  visible 3.80  (>= 3.5 end card; minHold 3.5 declared)
//   f3_credit   94.00-97.90  in .2  out .1  visible 3.60
// Lane map (no same-lane overlap; chains touch exactly): title y540 ·
// sub y660 · slam y480 · speech y856. Every row inside its shot; every
// size >= 32; x centered 960.
export const CAPTIONS = [
  // S2 10-16 titles
  { id: 't1_title', text: 'BREAKING BALD', t0: 12.4, t1: 15.9, style: 'title', x: 960, y: 540, size: 120, anim: 'line', in: 0.25, out: 0.1, track: 4 }, // Anton 120: 13 chars measured-safe
  { id: 't2_subtitle', text: 'A REMY BOYS CRIME EPIC', t0: 12.6, t1: 15.9, style: 'sub', x: 960, y: 660, size: 32, anim: 'rise', in: 0.15, out: 0.1, track: 6 },
  // S3 16-27 classroom
  { id: 'c1_lesson', text: 'Lesson one: hair is chemistry.', t0: 16.5, t1: 20.0, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.2, out: 0.15 },
  { id: 'c2_verdict', text: 'Six months of flow, at most.', t0: 22.2, t1: 26.9, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.25, out: 0.2 },
  // S4 27-36 the decision
  { id: 'd1_choice', text: 'If the flow must fall,\nit falls on my terms.', t0: 27.2, t1: 30.7, style: 'speech', x: 960, y: 856, size: 34, anim: 'rise', in: 0.25, out: 0.2 },
  { id: 'd2_born', text: 'Mr. Flow died in that bathroom.\nHeisenbald walked out.', t0: 32.5, t1: 35.9, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.2, out: 0.15 },
  // S5 36-52 the cook
  { id: 'k1_cook', text: 'The RV became a laboratory.\nThe flow became a product.', t0: 36.4, t1: 40.0, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.3, out: 0.25 },
  { id: 'k2_pure', text: '99.1% pure.\nThe street called it Blue Flow.', t0: 47.5, t1: 51.8, style: 'speech', x: 960, y: 856, size: 34, anim: 'rise', in: 0.25, out: 0.2 },
  // S6 52-63 Los Flowos
  { id: 'lo1_chicken', text: 'The chicken was fine.\nThe flow paid better.', t0: 52.4, t1: 55.9, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.25, out: 0.2 },
  { id: 'lo2_kingpin', text: 'The kingpin never touched the chicken.\nHe touched everything else.', t0: 55.9, t1: 59.3, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.2, out: 0.15 },
  { id: 'lo3_hank', text: 'The one man hunting the blue\nwas eating two seats away.', t0: 59.4, t1: 62.9, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.2, out: 0.15 },
  // S7 63-77 say my name — dialogue chain rides 0.2/0.15
  { id: 's1_name', text: 'Say my name.', t0: 63.6, t1: 67.1, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.2, out: 0.15 },
  { id: 's2_answer', text: '...You\'re Heisenbald.', t0: 67.1, t1: 70.6, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.2, out: 0.15 },
  { id: 's3_right', text: 'YOU\'RE GODDAMN RIGHT.', t0: 72.0, t1: 75.9, style: 'slam', x: 960, y: 480, size: 64, anim: 'cut', in: 0, out: 0.25, color: '#eef6ff' }, // in 0: ON the freeze
  // S8 77-86 the empire
  { id: 'e1_blue', text: 'The blue flowed everywhere.', t0: 77.5, t1: 81.0, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.25, out: 0.2 },
  { id: 'e2_fallout', text: 'Every empire pays in fallout.', t0: 82.5, t1: 85.9, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.2, out: 0.15 },
  // S9 86-98 the finale
  { id: 'f1_confess', text: 'I did it for me.\nI liked it. I was good at it.', t0: 89.0, t1: 93.3, style: 'speech', x: 960, y: 856, size: 34, anim: 'rise', in: 0.3, out: 0.35 },
  { id: 'f2_card', text: 'BR·BA', t0: 94.0, t1: 97.9, style: 'title', x: 960, y: 500, size: 96, anim: 'cut', in: 0, out: 0.1, minHold: 3.5, track: 6 }, // 5 glyphs measured-safe at 96
  { id: 'f3_credit', text: 'A REMY BOYS PRODUCTION\nNO HAIRS WERE HARMED', t0: 94.0, t1: 97.9, style: 'sub', x: 960, y: 660, size: 32, anim: 'fade', in: 0.2, out: 0.1, font: F_MONO, track: 4 },
]

// ---------- screen flashes: [absoluteT, peak, decay] — peaks <= .24, decay <= .2 ----------
// Meth-blue grade: THE SLAM is the one full-frame hit; the stamps get paper-
// sized pops; the finale card stays soft. The dead beat (71.5) gets NO flash.
export const FLASHES = [
  [MASTER.glint, 0.14, 0.1],         // the crystal catches dawn
  [MASTER.titleSlam, 0.2, 0.12],     // title slam
  [MASTER.dnStamp, 0.2, 0.14],       // the D.N.R. stamp
  [MASTER.shadesDown, 0.14, 0.12],   // the teal flip
  [MASTER.pour, 0.12, 0.1],          // molten blue bloom
  [MASTER.pureStamp, 0.2, 0.14],     // the 99.1% stamp
  [MASTER.slam, 0.24, 0.16],         // THE impact (biggest)
  [MASTER.teddy, 0.14, 0.1],         // the splash
  [MASTER.endCard, 0.12, 0.14],      // end card (soft)
]
export const flashK = (t) => {
  let k = 0
  for (const f of FLASHES) if (t >= f[0]) k = Math.max(k, f[1] * Math.exp(-(t - f[0]) / f[2]))
  return k
}

// ---------- named cue anchors (composer quick table; all clock-derived abs) ----------
export const CUES = {
  coldopenIn: MASTER.coldopenIn,   // 0.0     dread drone in (BALD minor, bars 0/1/2)
  glint: MASTER.glint,             // 6.3158  crystal glint — one bell tick
  titlesIn: MASTER.titlesIn,       // 10.0    element clicks (Br 10.0 / Ba 11.2)
  titleSlam: MASTER.titleSlam,     // 12.4    BRAAM + flash
  classroomIn: MASTER.classroomIn, // 16.0    tick-tock piano
  chalkDrop: MASTER.chalkDrop,     // 21.2    chalk clatter; score dies at 21.5
  dnStamp: MASTER.dnStamp,         // 21.7143 STAMP — impact into the 0.3 s freeze
  verdictIn: MASTER.verdictIn,     // 22.2    cold strings re-enter
  decisionIn: MASTER.decisionIn,   // 27.0    fluorescent hum + clippers
  shadesDown: MASTER.shadesDown,   // 32.3333 KEY UP to E minor — the Heisenbald stab
  cookIn: MASTER.cookStart,        // 36.0    driving 128 desert-rock pulse in
  pour: MASTER.pour,               // 45.375  riser resolves on the crystal pour
  pureStamp: MASTER.pureStamp,     // 47.25   stamp impact
  cashStack: MASTER.cashStack,     // 48.75   cash foley rides out
  dinerIn: MASTER.dinerIn,         // 52.0    cheerful plastic jingle
  backRoom: MASTER.backRoom,       // 54.4    MUSIC DIES on the pass-through
  hoodRow: MASTER.hoodRow,         // 56.8    low threat drone
  hankWatch: MASTER.hankWatch,     // 59.2    tiny oblivious bounce
  slam: MASTER.slam,               // 72.0    THE SLAM — braam + mega impact, 0.6 s freeze
  kingpinTurn: MASTER.kingpinTurn, // 73.2    low drone re-entry
  empireIn: MASTER.empireIn,       // 77.0    machine montage: one hit per cut
  teddy: MASTER.teddy,             // 82.4545 glass + sub — the splash
  skyline: MASTER.skyline,         // 84.2727 sweep down into dusk
  finaleIn: MASTER.finaleIn,       // 86.0    bare piano + night wind
  shadesOff: MASTER.shadesOff,     // 88.6667 shades off — one soft string swell
  confessionIn: MASTER.confessionIn, // 89.0  the confession under
  starField: MASTER.starField,     // 94.0    MODE FLIP to D MAJOR — card + star field
  endOut: MASTER.endOut,           // 97.9    tails resolved before 98
}

// ========================= VALIDATE =========================
// node films/breaking-bald/timeline.js   (self-check at the file tail)
// Prints the full table and THROWS on any violation. Import-free: runs
// under bare node with zero dependencies. One merged row per unit (shot,
// stop, caption, cue). CONVENTION: every check is bad(PASS-CONDITION,
// failure-message) — a row fails iff any pass-condition is falsy.
export function validate() {
  const fails = []
  const rows = []
  const say = (group, name, sub, detail) => {
    const msgs = sub.filter((x) => x !== null)
    const ok = msgs.length === 0
    rows.push({ group, name, ok, detail: ok ? detail : msgs.join(' ; ') })
    if (!ok) fails.push(`${group} / ${name}: ${msgs.join(' ; ')}`)
  }
  const eps = 1e-6
  const bad = (passCond, msg) => (passCond ? null : msg)

  // --- A. structure ---
  say('A structure', 'DUR', [bad(DUR === 98.0, `DUR ${DUR} != 98`)], `DUR = ${DUR}`)
  let prev = 0
  for (const s of SHOTS) {
    say('A structure', `shot ${s.name}`,
      [bad(s.t0 === prev, `t0 ${s.t0} != ${prev}`), bad(s.t1 > s.t0, `t1 ${s.t1} <= t0`)],
      `film ${s.t0}-${s.t1} (${(s.t1 - s.t0).toFixed(1)}s)`)
    prev = s.t1
  }
  say('A structure', 'coverage', [bad(prev === DUR, `last t1 ${prev} != DUR`)],
    'cuts ' + SHOTS.map((s) => s.t0).concat(DUR).join('/'))
  say('A structure', 'sections==shots',
    [bad(SECTIONS.length === SHOTS.length, 'count mismatch'),
     bad(SECTIONS.every((sec, i) => sec.t0 === SHOTS[i].t0 && sec.t1 === SHOTS[i].t1 && sec.name === SHOTS[i].name), 'boundary/name drift')],
    `${SECTIONS.length} sections map shots 1:1`)
  say('A structure', 'MASTER.bpm', [bad(MASTER.bpm === 100, `bpm ${MASTER.bpm}`)], '100 (titles + diner grids)')

  // --- B. hit-stops ---
  const worldLen = (s) => (s.t1 - s.t0) - CLK[s.name].stops.reduce((a, st) => a + st.d, 0)
  for (const s of SHOTS) {
    for (const st of CLK[s.name].stops) {
      const start = CLK[s.name].abs(st.g)
      say('B stops', `${s.name} g${st.g.toFixed(2)}+d${st.d}`,
        [bad(st.g >= -eps, 'g < 0'),
         bad(st.g <= worldLen(s) + 0.01, `g past world end ${worldLen(s).toFixed(3)}`),
         bad(start >= s.t0 - eps, 'freeze before shot'),
         bad(start + st.d <= s.t1 + 0.01, `freeze spills past cut ${s.t1}`)],
        `film ${start.toFixed(2)}-${(start + st.d).toFixed(2)} (worldLen ${worldLen(s).toFixed(2)})`)
    }
  }
  // mandated freeze table (times from the tempo arithmetic; 30 ms tolerance)
  const freezeSpec = [
    ['DN_STAMP = b(classroom,2) d0.3', STOPS.classroom[0], CLASSROOM, 21.714285714285715, 0.3, null],
    ['THE SLAM = b(saymyname,3) d0.6 (biggest)', STOPS.saymyname[0], SAYMYNAME, 72.0, 0.6, null],
  ]
  for (const [label, st, clk, wantT, wantD, win] of freezeSpec) {
    const got = clk.abs(st.g)
    say('B stops', label,
      [bad(Math.abs(got - wantT) <= 0.0301, `film ${got.toFixed(4)} vs spec ${wantT}`),
       bad(st.d === wantD, `d ${st.d} != ${wantD}`),
       ...(win ? [bad(got >= win[0] && got <= win[1], `outside window ${win[0]}-${win[1]}`)] : [])],
      `film ${got.toFixed(4)} + ${st.d}`)
  }

  // --- C. per-shot EV tables (world g; one row per shot) ---
  const EVS = { coldopen: COLDOPEN_EV, titles: TITLES_EV, classroom: CLASSROOM_EV, decision: DECISION_EV, cook: COOK_EV, diner: DINER_EV, saymyname: SAYMYNAME_EV, empire: EMPIRE_EV, finale: FINALE_EV }
  for (const [name, ev] of Object.entries(EVS)) {
    const s = SHOTS.find((x) => x.name === name)
    const wl = worldLen(s)
    const sub = []
    let last = -Infinity
    let n = 0
    for (const [k, v] of Object.entries(ev)) {
      n++
      const boundaryOk = k === 'cut' || k === 'end'
      sub.push(bad(typeof v === 'number' && Number.isFinite(v), `${k} not finite`))
      sub.push(bad(v >= 0, `${k} negative`))
      sub.push(bad(v < wl + eps || (boundaryOk && Math.abs(v - wl) < eps), `${k}=${v} past worldLen ${wl.toFixed(3)}`))
      sub.push(bad(v >= last, `${k}=${v} out of order (after ${last})`))
      last = v
    }
    say('C events', `${name}_EV`, sub, `${n} events, worldLen ${wl.toFixed(2)}, inside + ordered`)
  }

  // --- D. MASTER (one row per numeric entry: contained + derived) ---
  const NON_EVENT = ['bpm'] // musical-map scalar, not a picture event
  const shotOf = (t) => SHOTS.find((s) => t >= s.t0 - eps && t < s.t1 - eps)
  for (const [k, v] of Object.entries(MASTER)) {
    if (typeof v !== 'number' || NON_EVENT.includes(k)) continue
    const s = shotOf(v)
    const sub = [bad(s && v >= 0 && v < DUR, `value ${v} outside the film`)]
    let detail = `= ${Number(v.toFixed(4))}`
    if (s) {
      const gs = Object.entries(EVS[s.name]).filter(([, g]) => Math.abs(CLK[s.name].abs(g) - v) < 1e-6)
      sub.push(bad(gs.length > 0, `not t0+filmT(EV) of ${s.name}`))
      if (gs.length) detail += ` (${s.name}.${gs[0][0]})`
    }
    say('D master', `MASTER.${k}`, sub, detail)
  }
  say('D master', 'motifs', [bad(MASTER.motifs.bald.minor.join() === '0,3,7', 'BALD must be [0,3,7] (D-F-A)')],
    `BALD D-F-A from D${BALD_ROOT}; major restatement [${BALD_MAJOR.join(',')}]`)
  say('D master', 'modeFlip', [bad(MASTER.motifs.modeFlip.t === T.finale + 8, `flip at ${MASTER.motifs.modeFlip.t}`)],
    `D minor -> D MAJOR at film ${MASTER.motifs.modeFlip.t}`)

  // --- E. captions (one row per caption; all sub-checks merged) ---
  const linesOf = (c) => (Array.isArray(c.text) ? c.text : String(c.text).split('\n'))
  const wordsOf = (line) => (Array.isArray(line) ? line.map((sp) => sp[0]).join(' ') : line).trim().split(/\s+/).filter(Boolean).length
  const byLane = {}
  for (const c of CAPTIONS) {
    const s = shotOf(c.t0)
    const vis = (c.t1 - c.out) - (c.t0 + c.in)
    const floor = c.id === 'f2_card' ? 3.5 : 3.0
    const threshold = Math.max(floor, c.minHold ?? 0)
    const size = c.size ?? 40
    const words = linesOf(c).map(wordsOf)
    const sub = [
      bad(s, `t0 ${c.t0} outside the film`),
      bad(!s || c.t1 <= s.t1 + eps, `t1 ${c.t1} crosses the cut at ${s ? s.t1 : '?'}`),
      bad(c.in >= 0 && c.out >= 0 && c.in + c.out < c.t1 - c.t0, 'bad in/out rides'),
      bad(vis >= threshold - eps, `visible ${vis.toFixed(2)} < ${threshold}`),
      bad(size >= SAFE.minSize, `size ${size} < ${SAFE.minSize}px (=16px @960x540)`),
      bad(c.y >= SAFE.captionYMin && c.y <= SAFE.captionYMax, `y ${c.y} outside [${SAFE.captionYMin},${SAFE.captionYMax}]`),
      bad(words.every((w) => w <= 9), `line over 9 words (${words.join('/')})`),
      bad(Object.values(MASTER).some((v) => typeof v === 'number' && Math.abs(v - c.t0) < 1e-6), `t0 ${c.t0} has no MASTER anchor`),
    ]
    ;(byLane[`${c.y}`] ||= []).push(c)
    say('E captions', c.id, sub,
      `${c.t0.toFixed(2)}-${c.t1.toFixed(2)} vis ${vis.toFixed(2)} (>=${threshold}) in ${c.in}/out ${c.out} ${size}px y${c.y} words ${words.join('/')}`)
  }
  for (const [lane, caps] of Object.entries(byLane)) {
    caps.sort((a, b2) => a.t0 - b2.t0)
    const sub = []
    for (let i = 0; i + 1 < caps.length; i++) {
      sub.push(bad(caps[i].t1 <= caps[i + 1].t0 + eps, `${caps[i].id} overlaps ${caps[i + 1].id}`))
    }
    say('E captions', `lane y${lane}`, sub, `${caps.length} caption(s), no same-lane overlap`)
  }

  // --- F. musical grid: pinned downbeats within 30 ms ---
  const pins = [
    ['CRYSTAL_GLINT', CRYSTAL_GLINT, 'coldopen', 2, 0],
    ['TITLE_SLAM', TITLE_SLAM, 'titles', 1, 0],
    ['DN_STAMP', DN_STAMP, 'classroom', 2, 0],
    ['GRIM_READ', GRIM_READ, 'classroom', 3, 0],
    ['SHADES_DOWN', SHADES_DOWN, 'decision', 2, 0],
    ['FLASK_GLOW', MASTER.flaskGlow, 'cook', 1, 0],
    ['POUR', POUR, 'cook', 5, 0],
    ['PURE_STAMP', PURE_STAMP, 'cook', 6, 0],
    ['BACK_ROOM', BACK_ROOM, 'diner', 1, 0],
    ['HOOD_ROW', HOOD_ROW, 'diner', 2, 0],
    ['HANK_WATCH', MASTER.hankWatch, 'diner', 3, 0],
    ['BADGE_GLINT', BADGE_GLINT, 'diner', 4, 0],
    ['CLOSE_GUS', MASTER.closeGus, 'saymyname', 1, 0],
    ['CLOSE_WALT', MASTER.closeWalt, 'saymyname', 2, 0],
    ['THE_SLAM', THE_SLAM, 'saymyname', 3, 0],
    ['HOLD_WIDE', HOLD_WIDE, 'saymyname', 4, 0],
    ['CASH_WALLS', MASTER.cashWalls, 'empire', 0, 0],
    ['CHANDELIER', MASTER.chandelier, 'empire', 1, 0],
    ['BARRELS', MASTER.barrels, 'empire', 2, 0],
    ['TEDDY', TEDDY, 'empire', 3, 0],
    ['SKYLINE', MASTER.skyline, 'empire', 4, 0],
    ['SHADES_OFF', SHADES_OFF, 'finale', 1, 0],
    ['PULL_UP', PULL_UP, 'finale', 2, 0],
    ['ENDCARD_BB', ENDCARD_BB, 'finale', 3, 0],
  ]
  for (const [label, val, sect, bar, beat] of pins) {
    const grid = b(sect, bar, beat)
    const drift = Math.abs(val - grid) * 1000
    say('F grid', `${label} = b(${sect},${bar},${beat})`, [bad(drift <= 30, `drift ${drift.toFixed(1)} ms`)],
      `${val.toFixed(4)} vs grid ${grid.toFixed(4)} (drift ${drift.toFixed(1)} ms)`)
  }
  say('F grid', 'barSec/beatSec', [bad(SECTIONS.every((s) => barSec(s.name) > 0 && beatSec(s.name) > 0), 'non-positive grid')],
    SECTIONS.map((s) => `${s.name} ${s.bpm}bpm ${s.beats}/4 bar ${barSec(s.name).toFixed(3)}s`).join(', '))

  // --- G. flashes + cues ---
  for (const [t, peak, decay] of FLASHES) {
    say('G fx', `flash @${t.toFixed(2)}`,
      [bad(peak <= 0.24, `peak ${peak} > 0.24`), bad(decay <= 0.2, `decay ${decay} > 0.2`), bad(t >= 0 && t < DUR, 'outside film')],
      `peak ${peak} decay ${decay}`)
  }
  say('G fx', 'flashK(0)', [bad(flashK(0) === 0, 'must be 0 before any flash')], '0')
  for (const [k, v] of Object.entries(CUES)) {
    say('G cues', `CUES.${k}`,
      [bad(v >= 0 && v < DUR, `value ${v} outside film`),
       bad(Object.values(MASTER).includes(v), `${v} not in MASTER`)],
      `= ${Number(v.toFixed(4))}`)
  }

  // --- table ---
  const groups = [...new Set(rows.map((r) => r.group))]
  let out = `\n== BREAKING BALD timeline validation ${'='.repeat(34)}`
  for (const g of groups) {
    out += `\n [${g}]`
    for (const r of rows.filter((r) => r.group === g)) {
      out += `\n   ${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(40)} ${r.detail}`
    }
  }
  const nPass = rows.filter((r) => r.ok).length
  out += `\n== ${rows.length} checks: ${nPass} pass, ${rows.length - nPass} violations ==\n`
  if (fails.length) throw new Error(`BREAKING BALD timeline: ${fails.length} violation(s)\n  - ` + fails.join('\n  - '))
  return out
}

// ========================= SELF-CHECK =========================
// `node films/breaking-bald/timeline.js` re-runs validate() and prints the
// table (exits non-zero on any violation); importing the module never runs
// it, so film.js/score.js imports stay silent.
const SELF_BASE = import.meta.url.split('/').pop()
const ARG_BASE = typeof process !== 'undefined' && process.argv[1] ? process.argv[1].split('/').pop() : ''
if (SELF_BASE === 'timeline.js' && ARG_BASE === 'timeline.js') {
  try {
    console.log(validate())
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}
