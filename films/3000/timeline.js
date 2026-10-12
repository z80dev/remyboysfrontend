// =====================================================================
// 3000 — A REMY BOYS EPIC · cue sheet + choreography (screenplay truth)
// =====================================================================
// The single shared source of truth that picture (film.js/art.js) AND
// score (score.js) both import. 104.0 s, 1920x1080 @60fps, 2.39:1
// letterbox, bronze/sepia/ash. IMPORT-FREE: pure constants + small pure
// helpers — validate() runs under bare node. All pure functions of time
// (no Math.random, no Date, no state between frames).
//
// LOGLINE: when the shaved god-king Xerxes demands the hair world kneel,
// King Leonidhair and the last 3,000 strands hold the Widows' Peak.
//
// ---------------------------------------------------------------------
// SHOT MAP — EXACTLY as briefed, NO BOUNDARY SHIFTS (±1 s not needed):
//   PROLOGUE 0-10 · WOLF 10-20 · EMISSARY 20-33 · MARCH 33-45 ·
//   PHALANX 45-62 · XERXES 62-74 · STORM 74-86 · LASTSTAND 86-95 ·
//   PLATAEA 95-104.   DUR = 104.0 exactly.
// Pinned beats hold: KICK_G = 30.4348 (inside the mandated ~30.2-30.5),
// FREEZE_G = 93.5 exact. Full arithmetic in the TEMPO ARITHMETIC block.
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
// THE KICK WORDS ARE NOT CAPTIONS: THIS! / IS! / SHEARTA! are slammed
// by the builder as picture (one word per impact, KICK_WORD_* events).
// They appear nowhere in CAPTIONS.
//
// ---------------------------------------------------------------------
// TEMPO ARITHMETIC (every pinned downbeat shown; checked in validate)
// Sections carry their own grids (no one bpm tiles these cuts; floz
// precedent). MASTER.bpm = 92 is the film's nominal tempo and IS the
// grid of the two sections that carry dialogue (emissary, march).
//
//   TITLE_SLAM  prologue 96 bpm 4/4 -> bar = 4*60/96  = 2.500 s
//               bar 1 downbeat      = 0 + 1*2.500    =  2.5000  == 2.5      (brief target)
//   KICK_G      emissary 92 bpm 4/4 -> bar = 4*60/92  = 2.6087 s
//               bar 4 downbeat      = 20 + 4*2.6087  = 30.4348  (mandated window 30.2-30.5)
//   WALL_SLAM   phalanx 120 bpm 4/4 -> bar = 4*60/120 = 2.000 s
//               bar 2 downbeat      = 45 + 2*2.000   = 49.0000  (brief ~49)
//   STORM_PEAK  storm   120 bpm 4/4 -> bar = 2.000 s
//               bar 3 downbeat      = 74 + 3*2.000   = 80.0000  (brief "key up at ~80")
//   HURL        laststand 90 bpm 4/4 -> bar = 4*60/90 = 2.6667 s
//               bar 2 downbeat      = 86 + 2*2.6667  = 91.3333  (freeze follows at 93.5)
//   PLATAEA     plataea  96 bpm 4/4 -> section t0 IS bar 0 = 95.0000
//               (charge = bar 1 = 97.5, end card slam = bar 2 = 100.0)
// Grid-adjacent bonuses (exact by construction): POLE_REVEAL = bar 3 of
// march = 40.8261; SNIP = bar 4 beat 3 of storm = 83.5; SMILE = bar 5
// beat 1 of storm = 84.5.
// Declared grid collisions: laststand bar 3 (94.0) lands INSIDE the
// freeze — that downbeat is UNSCORED (silence + heartbeats only). Wolf
// bar 3 (16.4) lands 0.1 s before the lunge — a pickup; the impact
// itself is CLOCK-pinned (MASTER.wolfLunge), not grid-pinned.
//
// ---------------------------------------------------------------------
// HIT-STOPS (world freezes; shake/flash/score keep real time via sl)
//   wolf      g 6.50  d 0.35  film 16.50-16.85  lunge / comb-flash
//   emissary  g 10.4348 d 0.55 film 30.4348-30.9848  THE KICK — the
//             film's BIGGEST freeze (0.55 s)
//   phalanx   g 4.00  d 0.30  film 49.00-49.30  shield-wall SLAM
//   phalanx   g 8.10  d 0.25  film 53.40-53.65  thrust kill 1
//   phalanx   g 12.25 d 0.25  film 57.80-58.05  thrust kill 2
//             (kill g values are 53.4-45-0.3 and 57.8-45-0.55: the
//             wallSlam stop shifts film time, so the naive locals
//             8.4/12.8 would land at 53.7/58.35 — wrong)
//   laststand g 7.50  d 1.50  film 93.50-95.00  THE SPEAR-HURL FREEZE
//             MODELING DECISION: modeled as a STOP with d = 1.5 (not a
//             dedicated frozen-tail flag). World g runs 0 -> 7.5, then
//             stays pinned for the rest of the shot; warp() reports
//             sl 0..1.5 inside the freeze and the cut at film 95.0
//             fires out of the frozen tail. World time never resumes.
// Slow-mo that is NOT a freeze (phalanx contact 50.5, laststand run-up)
// is choreographed in g (actor paths crawl) — the clock only bends at
// hard stops.
//
// ---------------------------------------------------------------------
// SCREENPLAY DEVIATIONS (screenplay agent owns exact numbers; all
// cross-checked against the brief's hard rules):
//  1. NO shot-boundary shifts. KICK_G 30.4348 and FREEZE_G 93.5 hold.
//  2. Emissary dialogue = THREE captions, not four: the brief's four
//     lines cannot each hold 3.0 s visible before the pinned 30.4348
//     kick (needs >= 13.0 s of window; only 10.4348 exists). "This is
//     madness!" + "Madness?" share ONE stacked caption (26.95-30.43);
//     the beat between them is played in picture (the emissary gulps
//     while the second line sits crimson = Leonidhair). Dialogue chain
//     rides are 0.2/0.15 — house minimum, floz chant-pill precedent.
//  3. Leonidhair's Xerxes-scene speech (17 words in the brief) is
//     condensed to two <= 9-word lines: "The world will know free men
//     stood / against a razor — and 3,000 strands held."
//  4. HEARTBEAT_1/2 exist only in MASTER (absolute film seconds,
//     93.9/94.4): world g is pinned during the freeze, so sl-time
//     events cannot live in an EV table. validate() whitelists them
//     from the EV-derivation check.
//  5. Caption floor 16px-equivalent at 960x540 = 32px at 1080p: every
//     caption row carries an explicit size >= 32 (end card 84, measured
//     safe for its 26 chars in Anton).
// =====================================================================

export const DUR = 104.0

// ---------- shot map (film seconds; contiguous, covers [0, 104) exactly) ----------
// CUTS:  0        10        20         33        45        62       74       86        95       104
export const T = {
  prologue: 0,   // S1 black + ember + title slam         0-10   (10.0)
  wolf: 10,      // S2 the boy and the razor-wolf         10-20  (10.0)
  emissary: 20,  // S3 the emissary + THE KICK            20-33  (13.0)
  march: 33,     // S4 march + dine in Bald               33-45  (12.0)
  phalanx: 45,   // S5 the pass, first wave               45-62  (17.0)
  xerxes: 62,    // S6 the god-king + the golden wig      62-74  (12.0)
  storm: 74,     // S7 arrow storm, comb in the shade     74-86  (12.0)
  laststand: 86, // S8 the hurl + THE FREEZE              86-95  (9.0)
  plataea: 95,   // S9 Plataea, the legend                95-104 (9.0)
}

export const SHOTS = [
  { name: 'prologue', t0: T.prologue, t1: T.wolf,
    desc: 'Black; ONE ember drifts (EMBER_PERIOD 2.0); wind. Narrator (serif, top-safe): "The old men say: a man\'s flow is his country." Fade up night battlefield g1.2, ash falling. TITLE SLAM 3000 at g2.5 (chiseled bronze, dust burst, hit-stop optional; braam + flash). Subtitle "A REMY BOYS EPIC" under. Low drone -> braam at slam -> taiko heartbeat out (g5.0+).' },
  { name: 'wolf', t0: T.wolf, t1: T.emissary,
    desc: 'Blizzard white-out. Young Leonidhair, bare-chested, faces the razor-wolf (procedural beast, spines like straight razors). Duduk states SHEARTA (D-F-G-A) across the circling. It LUNGES g6.1 — sidestep + COMB-FLASH contact g6.5 = 0.35 s hit-stop. It slinks off BALD where the comb touched (seed of the whole war), fully bald g8.0. Theme caption rides 16.0-19.85.' },
  { name: 'emissary', t0: T.emissary, t1: T.march,
    desc: 'Dawn, gates of Shearta, red banners. Bald emissary + guards offer mercy; Leonidhair (beard, cape, spear) answers; "This is madness!" / "Madness?" stacked caption. THE KICK g10.4348 (film 30.4348): foot to chest, 0.55 s hit-stop — the film\'s biggest freeze. Emissary pinwheels into the black pit; builder slams THIS! (at kick) IS! (pit-rim bounce 31.75) SHEARTA! (vanish 32.45) as picture. Protect this moment.' },
  { name: 'march', t0: T.march, t1: T.phalanx,
    desc: 'Night torch-march down the coastline — the Sea of Forehead, waterline = receded hairline (g3.0 gag hold). Camp g6.5: Spartans sharpen combs on whetstones; behind them a glowing red-white-blue BARBERSHOP POLE in the dark (reveal on bar 3, g7.826); one Spartan eyes it, then his spear. Caption "Tonight... we dine in Bald." Taiko + low brass ostinato, steps on 92 bpm quarters.' },
  { name: 'phalanx', t0: T.phalanx, t1: T.xerxes,
    desc: 'Dawn at the pass: sea one side, cliff the other — the hairline\'s last defensible point. Persian slave wave charges g0.4; "HOLD... HOLD..." kicker caption; shield wall SET g3.4 then SLAMS g4.0 (0.3 s hit-stop), spears level, red capes snap. Slow-mo CONTACT g5.2 (film 50.5, crawl in g, no stop): shove, thrust kills at g8.1 / g12.25 (0.25 s hit-stops each), wave breaks g14.0 and flees. Dust settles; Spartans reform, bored g15.2. Double-time percussion.' },
  { name: 'xerxes', t0: T.xerxes, t1: T.storm,
    desc: 'A shadow slides over the pass g0. XERXES enters g0.5: colossal (2.5x), bald, gold bands, throne-platform borne by a dozen slaves; Immortals behind, chrome masks catching light g3.5. "Unlike the cruel Leonidhair... I am generous." A cushion rises: the GOLDEN WIG g5.5. Leonidhair steps up g8.5 and answers; spear raise = THE REFUSAL g10.5. Half-time gong-heavy score (60 bpm).' },
  { name: 'storm', t0: T.storm, t1: T.laststand,
    desc: 'Officer: "Our arrows will blot out the sun." Spartan grin g4.6: "Then we will comb in the shade." Sky BLACKENS g5.6 — thousands of falling scissors/straight-razors (seeded analytic particles); full density at STORM_PEAK g6.0 (film 80.0: key up a whole step, downbeat). Spartans lock shields into a roof g6.6; metallic clatter storm g7.0 (machine percussion). One razor SNIPS one strand g9.5 (film 83.5) — beat of silence inside the roof (score mute, no stop); faces lit by slits; Leonidhair smiles g10.5.' },
  { name: 'laststand', t0: T.laststand, t1: T.plataea,
    desc: 'Dust and bodies. Leonidhair alone: cape torn, mane thinned but standing. Slow-mo run-up from g1.0 (cape floats; crawl in g). He HURLS the spear at Xerxes g5.333 (film 91.3333, bar 2 downbeat); the world crawls — spear floating, embers hanging (g5.5-7.5) — and FREEZES mid-frame at g7.5 (film 93.5): stop d 1.5, frozen through the cut at 95. Silence; ONE heartbeat pair (93.9/94.4, film time). Cut to black.' },
  { name: 'plataea', t0: T.plataea, t1: DUR,
    desc: 'Dawn a year later: mist, Dilios before a NEW host of hairy Remys, manes in the wind. "Remember why they fell." Spears rise as one g2.0; the regrown host CHARGES g2.5 (bar 1 downbeat). Mode flips to D major at the cut (95.0). End card slams g5.0 (film 100.0, bar 2 downbeat): "3000 — THE FLOW REMEMBERS." + credit, holds to 103.9. All reverb tails resolve before 104 (taiko shared-reverb lesson).' },
]

// ---------- shot clocks: copied verbatim from films/wizard-of-floz/timeline.js ----------
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

// ---------- score sections (defined before the clocks: the KICK and the
// HURL are grid-derived, so their stop g values come from b()) ----------
// Each section's t0 is a downbeat by construction (b(section, 0, 0) = t0).
// Key plan: home key D minor; storm keys up a WHOLE STEP to E minor at
// STORM_PEAK (80.0); plataea mode-flips to D MAJOR (the pirates
// CURSE->BLESSING move). See TEMPO ARITHMETIC in the header.
export const SECTIONS = [
  { name: 'prologue', t0: T.prologue, t1: T.wolf, bpm: 96, beats: 4, key: 'D minor',
    feel: 'low drone from g0; BRAAM exactly on the title slam (bar 1, 2.5); taiko heartbeat pulses out from bar 2 (heartbeatOut 5.0); wind only otherwise. All tails clear before the wolf white-out.' },
  { name: 'wolf', t0: T.wolf, t1: T.emissary, bpm: 75, beats: 4, key: 'D dorian',
    feel: 'DUDUK states SHEARTA (D-F-G-A) on half-notes: b(wolf,0,0)=10.0, b(wolf,0,2)=11.6, b(wolf,1,0)=13.2, b(wolf,1,2)=14.8 (SHEARTA_TIMES). Bar 3 (16.4) is a pickup 0.1 s before the lunge; the comb-flash impact itself is CLOCK-pinned (MASTER.wolfLunge 16.5) — freeze eats 0.35 s of grid. Blizzard wind bed throughout.' },
  { name: 'emissary', t0: T.emissary, t1: T.march, bpm: 92, beats: 4, key: 'D minor',
    feel: 'bright banner fanfare over tense marble groove; score DROPS OUT for the "beat" before the kick (EV beat g9.4); THE KICK = bar 4 downbeat (30.4348): choir stab + mega impact into the 0.55 s freeze; THIS!/IS!/SHEARTA! slams at MASTER.kickWordThis/Is/Shearta; music crashes back on SHEARTA! and hard-stops into the march cut.' },
  { name: 'march', t0: T.march, t1: T.phalanx, bpm: 92, beats: 4, key: 'D minor',
    feel: 'taiko + low brass ostinato; every quarter is a footstep (MARCH_STEP = 60/92 = 0.6522 s, steps from bar 0 until camp g6.5); whetstone shings syncopate at camp; the barbershop pole hums a warm major third from POLE_REVEAL (bar 3, 40.8261); "dine in Bald" lands low and grinning under the caption.' },
  { name: 'phalanx', t0: T.phalanx, t1: T.xerxes, bpm: 120, beats: 4, key: 'D minor',
    feel: 'DOUBLE-TIME percussion (the tempo doubles vs the march — same D minor). WALL_SLAM = bar 2 (49.0): taiko wall + impact; kills are CLOCK-pinned (53.4 / 57.8); contact crawl 50.5 is scored as a smeared sustain, not a stop; wave breaks 59.8 to scattered kit; bored reform 61.0 = percussion grins once and cuts.' },
  { name: 'xerxes', t0: T.xerxes, t1: T.storm, bpm: 60, beats: 4, key: 'D phrygian',
    feel: 'HALF-TIME gong-heavy: bars at 62/66/70/74. Enter 62.5 with a gong bloom; the wig offer 67.5 gets a silky false-gracious chord; Leonidhair\'s answer 68.0-72.3 builds under the speech; REFUSAL (spear raise) 72.5 = bare octave stab, then silence into the storm.' },
  { name: 'storm', t0: T.storm, t1: T.laststand, bpm: 120, beats: 4, key: 'D minor -> E minor at bar 3',
    feel: 'machine-percussion clatter storm (metallic, seeded density, follows the falling-razor particles). KEY UP A WHOLE STEP exactly on bar 3 = STORM_PEAK (80.0). SNIP at bar 4 beat 3 (83.5): EVERYTHING mutes for ~1 s (the beat of silence inside the roof) — one glass tick only; SMILE on bar 5 beat 1 (84.5) re-enters warm and small.' },
  { name: 'laststand', t0: T.laststand, t1: T.plataea, bpm: 90, beats: 4, key: 'E minor',
    feel: 'slow-mo dread strings under the run-up; HURL = bar 2 (91.3333) — one huge riser resolves and the world crawls; spear flight 91.5-93.5 thins to a single held note; FREEZE at 93.5 = TOTAL SILENCE. Bar 3 (94.0) falls inside the freeze and is DELIBERATELY UNSCORED — only HEARTBEAT_1/2 (93.9/94.4, film time). No reverb tails may cross 95.' },
  { name: 'plataea', t0: T.plataea, t1: DUR, bpm: 96, beats: 4, key: 'D MAJOR (mode flip)',
    feel: 'MODE-FLIP at the cut (95.0): SHEARTA restated major (D-F#-A-B) as a hymn over dawn strings; CHARGE = bar 1 (97.5) full host percussion + choir; END CARD = bar 2 (100.0) fanfare slam; everything resolves by 103.5 so all reverb tails finish before 104 (taiko shared-reverb lesson).' },
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
// SHEARTA: D-F-G-A, the land-and-line cry. Stated minor by the duduk in
// the wolf shot; restated MAJOR (D-F#-A-B) by the host at Plataea — the
// mode-flip is the whole eulogy->engine arc.
export const SHEARTA_ROOT = 62                 // D4
export const SHEARTA = [0, 3, 5, 7]            // D-F-G-A (brief-verbatim)
export const SHEARTA_MAJOR = [0, 4, 7, 9]      // D-F#-A-B (plataea restatement)
export const SHEARTA_TIMES = [b('wolf', 0, 0), b('wolf', 0, 2), b('wolf', 1, 0), b('wolf', 1, 2)] // 10 / 11.6 / 13.2 / 14.8
export const motif = (major = false) => (major ? SHEARTA_MAJOR : SHEARTA).map((k) => SHEARTA_ROOT + k)

// ---------- hit-stop map, per shot (world-time g; see header table) ----------
export const STOPS = {
  prologue: [],
  wolf: [{ g: 6.5, d: 0.35 }],                                   // lunge / comb-flash (film 16.50-16.85)
  emissary: [{ g: b('emissary', 4) - T.emissary, d: 0.55 }],     // THE KICK (film 30.4348-30.9848) — biggest
  march: [],
  phalanx: [
    { g: b('phalanx', 2) - T.phalanx, d: 0.3 },                  // shield-wall SLAM (film 49.00-49.30)
    { g: 8.1, d: 0.25 },                                         // thrust kill 1   (film 53.40-53.65)
    { g: 12.25, d: 0.25 },                                       // thrust kill 2   (film 57.80-58.05)
  ],
  xerxes: [],
  storm: [],                    // the snip "beat of silence" is a SCORE MUTE, not a stop
  laststand: [{ g: 7.5, d: 1.5 }],                               // THE HURL FREEZE — frozen tail: world pins
                                                                 // at g 7.5 (film 93.5) through the cut at 95.0
  plataea: [],
}

// One clock per shot, named for its shot.
export const PROLOGUE  = makeClock(T.prologue,  STOPS.prologue)
export const WOLF      = makeClock(T.wolf,      STOPS.wolf)
export const EMISSARY  = makeClock(T.emissary,  STOPS.emissary)
export const MARCH     = makeClock(T.march,     STOPS.march)
export const PHALANX   = makeClock(T.phalanx,   STOPS.phalanx)
export const XERXES    = makeClock(T.xerxes,    STOPS.xerxes)
export const STORM     = makeClock(T.storm,     STOPS.storm)
export const LASTSTAND = makeClock(T.laststand, STOPS.laststand)
export const PLATAEA   = makeClock(T.plataea,   STOPS.plataea)

const CLK = { prologue: PROLOGUE, wolf: WOLF, emissary: EMISSARY, march: MARCH, phalanx: PHALANX, xerxes: XERXES, storm: STORM, laststand: LASTSTAND, plataea: PLATAEA }

// ---------- per-shot events (g = shot-local WORLD seconds; map with CLK[name].abs(g)) ----------
// S1: prologue — black, one ember, the slam.
export const PROLOGUE_EV = {
  ember0: 0.0,       // first ember of the EMBER cycle (EMBER_PERIOD 2.0, analytic)
  wind: 0.0,         // wind bed in
  narrator: 0.0,     // caption p1 t0 (film 0.0) — narrator over black
  fadeUp: 1.2,       // black -> night battlefield fade-up; ash begins
  titleSlam: 2.5,    // TITLE SLAM 3000 (film 2.5 = bar 1 downbeat): braam + dust burst
  subtitle: 3.2,     // "A REMY BOYS EPIC" settles under the title
  heartbeatOut: 5.0, // taiko heartbeat pulses out from bar 2 (film 5.0)
  cut: 10.0,         // into the blizzard
}

// S2: the wolf — circling, lunge, comb-flash, the bald seed.
export const WOLF_EV = {
  whiteout: 0.0,     // blizzard white-out
  motif1: 0.0,       // SHEARTA note 1: D (film 10.0)
  motif2: 1.6,       // SHEARTA note 2: F (film 11.6 = b('wolf',0,2))
  circle: 3.0,       // the wolf circles; breath plumes; boy plants his feet
  motif3: 3.2,       // SHEARTA note 3: G (film 13.2 = b('wolf',1,0))
  motif4: 4.8,       // SHEARTA note 4: A (film 14.8 = b('wolf',1,2))
  theme: 6.0,        // caption w1 t0 (film 16.0) — theme line as they square up
  lunge: 6.1,        // the wolf leaves the ground (anticipation -> contact)
  contact: 6.5,      // CONTACT + COMB-FLASH = hit-stop START (film 16.5, 0.35 s)
  slink: 7.0,        // recoil; it slinks away wrong
  bald: 8.0,         // WOLF_BALD: the razor-clean stripe catches light (film 18.35)
  cut: 9.65,         // = worldLen (film 20.0); the 0.35 stop shifts the boundary
}

// S3: the emissary + THE KICK — protect this moment.
export const EMISSARY_EV = {
  gates: 0.0,        // dawn, gates of Shearta, red banners snap
  line1: 0.0,        // caption em1 t0 (film 20.0) — the mercy offer
  line2: 3.45,       // caption em2 t0 (film 23.45) — "Shearta asks one thing..."
  defiance: 6.0,     // Leonidhair steps forward, spear plants (film 26.0)
  line3: 6.95,       // caption em3 t0 (film 26.95) — madness exchange (stacked)
  beat: 9.4,         // THE BEAT: wind stops, score drops out (film 29.4)
  kick: 10.434782608695652, // THE KICK (film 30.4348 = bar 4 downbeat); 0.55 s
                            // hit-stop; KICK_WORD_THIS slams at the freeze start
  pinwheel: 11.0,    // freeze ends; emissary pinwheels back over the pit (film 31.55)
  wordIs: 11.2,      // builder slams IS! on the pit-rim bounce (film 31.75)
  wordShearta: 11.9, // builder slams SHEARTA! as he vanishes into the black (film 32.45)
  cut: 12.45,        // = worldLen (film 33.0)
}

// S4: the march — geography gag, camp, the pole, the line.
export const MARCH_EV = {
  coast: 0.0,        // torch-march down the coastline (Sea of Forehead)
  steps: 0.0,        // first footstep = bar 0; cadence MARCH_STEP until camp
  seaGag: 3.0,       // hold the gag: the waterline IS the receded hairline
  camp: 6.5,         // camp: combs on whetstones, shing-shing
  poleReveal: 7.826086956521739, // BARBERSHOP POLE glows in the dark (bar 3, film 40.8261);
                                 // one Spartan eyes it, then his spear
  dine: 8.0,         // caption m1 t0 (film 41.0) — "Tonight... we dine in Bald."
  cut: 12.0,         // to the pass at dawn
}

// S5: the phalanx — hold, slam, shove, kills, break.
export const PHALANX_EV = {
  dawn: 0.0,         // the pass at dawn: sea left, cliff right
  persiansCharge: 0.4, // the slave wave crests the rise (film 45.4)
  hold: 0.6,         // caption ph1 t0 (film 45.6) — "HOLD... HOLD..."
  wallSet: 3.4,      // shields lock, braces dig (film 48.4)
  wallSlam: 4.0,     // SHIELD-WALL SLAM (film 49.0 = bar 2 downbeat); 0.3 s hit-stop
  contact: 5.2,      // CONTACT: slow-mo shove begins (film 50.5; crawl in g, no stop)
  kill1: 8.1,        // thrust kill 1 (film 53.4); 0.25 s hit-stop
  kill2: 12.25,      // thrust kill 2 (film 57.8); 0.25 s hit-stop
  waveBreaks: 14.0,  // the wave breaks and flees (film 59.8)
  reform: 15.2,      // dust settles; Spartans reform, bored (film 61.0)
  cut: 16.2,         // = worldLen (film 62.0); stops ate 0.8 s
}

// S6: Xerxes — gold, gongs, the golden wig, the refusal.
export const XERXES_EV = {
  shadow: 0.0,       // a shadow slides over the pass
  enter: 0.5,        // XERXES_ENTER: throne-platform crests the rise (film 62.5)
  line1: 1.5,        // caption x1 t0 (film 63.5) — "Unlike the cruel Leonidhair..."
  immortals: 3.5,    // chrome masks catch the light behind him (film 65.5)
  wigOffer: 5.5,     // WIG_OFFER: cushion rises, GOLDEN WIG (film 67.5)
  line2: 6.0,        // caption x2 t0 (film 68.0) — Leonidhair's answer
  stepUp: 8.5,       // Leonidhair steps onto the platform edge (film 70.5)
  refusal: 10.5,     // THE REFUSAL: spear raise (film 72.5)
  cut: 12.0,         // to the arrow storm
}

// S7: the arrow storm — density, the roof, the snip, the smile.
export const STORM_EV = {
  stormIn: 0.0,      // shot start anchor (film 74.0)
  officer: 0.8,      // caption s1 t0 (film 74.8) — "Our arrows will blot out the sun."
  grin: 4.6,         // the Spartan grin (film 78.6)
  shadeLine: 5.0,    // caption s2 t0 (film 79.0) — "Then we will comb in the shade."
  blacken: 5.6,      // sky BLACKENS; falling razors begin (film 79.6)
  stormPeak: 6.0,    // STORM_PEAK (film 80.0 = bar 3 downbeat): full density, key +2
  roofLock: 6.6,     // shields lock into the roof (film 80.6)
  clatter: 7.0,      // metallic clatter storm at full machine-percussion (film 81.0)
  snip: 9.5,         // SNIP: one razor cuts ONE strand (film 83.5 = bar 4 beat 3);
                     // beat of silence inside the roof (score mute, NO stop)
  smile: 10.5,       // Leonidhair smiles in the slit-light (film 84.5 = bar 5 beat 1)
  cut: 12.0,         // to the last stand
}

// S8: the last stand — run-up, hurl, the world stops.
export const LASTSTAND_EV = {
  dust: 0.0,         // dust and bodies; cape torn, mane thinned but standing
  runUp: 1.0,        // slow-mo run begins (film 87.0); cape floats; crawl in g
  hurl: 5.333333333333333, // THE HURL (film 91.3333 = bar 2 downbeat); spear leaves hand
  flight: 5.5,       // world crawls: spear floats, embers hang (film 91.5 -> 93.5)
  freeze: 7.5,       // FREEZE_G (film 93.5): the world pins; heartbeats live in
                     // MASTER as film time (world g cannot advance past 7.5)
  cut: 7.5,          // the cut fires from the frozen tail (film 95.0, sl 1.5)
}

// S9: Plataea — dawn, the host, the charge, the card.
export const PLATAEA_EV = {
  dawn: 0.0,         // PLATAEA_DAWN (film 95.0): mist, a year later
  modeFlip: 0.0,     // MODE FLIP to D major ON the cut (fanfare root moves)
  dilios: 0.5,       // Dilios before the new host, manes in the wind (film 95.5)
  remember: 0.9,     // caption pl1 t0 (film 95.9) — "Remember why they fell."
  spearsRise: 2.0,   // spears rise as one (film 97.0)
  charge: 2.5,       // the host CHARGES (film 97.5 = bar 1 downbeat)
  endCard: 5.0,      // END CARD slams (film 100.0 = bar 2 downbeat)
  end: 8.9,          // last caption t1 (film 103.9); everything already resolved
  cut: 9.0,          // to black = film 104.0
}

// ---------- MASTER event table (absolute film seconds; all clock-derived) ----------
// Every value = shot t0 + filmT(some EV of that shot) — never recompute by
// hand. EXCEPTIONS (whitelisted in validate): heartbeat1/2 are sl-clock
// events inside the laststand freeze; world g is pinned, so they exist only
// in film time. MASTER also carries the musical map (bpm / sections / motifs).
export const MASTER = {
  // --- musical map ---
  bpm: 92,                                  // nominal film tempo (emissary + march grids)
  sections: SECTIONS,                       // name/t0/t1 match SHOTS 1:1 (validated)
  motifs: {
    shearta: { root: SHEARTA_ROOT, minor: SHEARTA, major: SHEARTA_MAJOR, times: SHEARTA_TIMES,
               instrument: 'duduk (score.js: choir/pluck blend)', shot: 'wolf' },
    modeFlip: { t: PLATAEA.abs(PLATAEA_EV.modeFlip), from: 'D minor', to: 'D major',
                restatement: 'SHEARTA major over dawn strings at plataea t0' },
  },

  // --- S1 prologue ---
  emberT0: PROLOGUE.abs(PROLOGUE_EV.ember0),       // 0.0 (cycles every EMBER_PERIOD)
  windIn: PROLOGUE.abs(PROLOGUE_EV.wind),          // 0.0
  narratorIn: PROLOGUE.abs(PROLOGUE_EV.narrator),  // 0.0 (caption p1)
  fadeUp: PROLOGUE.abs(PROLOGUE_EV.fadeUp),        // 1.2
  titleSlam: PROLOGUE.abs(PROLOGUE_EV.titleSlam),  // 2.5  == b('prologue',1)
  subtitle: PROLOGUE.abs(PROLOGUE_EV.subtitle),    // 3.2
  heartbeatOut: PROLOGUE.abs(PROLOGUE_EV.heartbeatOut), // 5.0

  // --- S2 wolf ---
  wolfIn: WOLF.abs(WOLF_EV.whiteout),              // 10.0 shot start
  shearta1: WOLF.abs(WOLF_EV.motif1),              // 10.0  SHEARTA D
  shearta2: WOLF.abs(WOLF_EV.motif2),              // 11.6  SHEARTA F
  shearta3: WOLF.abs(WOLF_EV.motif3),              // 13.2  SHEARTA G
  shearta4: WOLF.abs(WOLF_EV.motif4),              // 14.8  SHEARTA A
  wolfCircle: WOLF.abs(WOLF_EV.circle),            // 13.0
  wolfTheme: WOLF.abs(WOLF_EV.theme),              // 16.0 (caption w1)
  wolfLeaps: WOLF.abs(WOLF_EV.lunge),              // 16.1 (anticipation)
  wolfLunge: WOLF.abs(WOLF_EV.contact),            // 16.5 comb-flash impact = freeze start
  wolfBald: WOLF.abs(WOLF_EV.bald),                // 18.35

  // --- S3 emissary + THE KICK ---
  emissaryIn: EMISSARY.abs(EMISSARY_EV.gates),     // 20.0 shot start
  emLine1: EMISSARY.abs(EMISSARY_EV.line1),        // 20.0  (caption em1)
  emLine2: EMISSARY.abs(EMISSARY_EV.line2),        // 23.45 (caption em2)
  emLine3: EMISSARY.abs(EMISSARY_EV.line3),        // 26.95 (caption em3, stacked)
  defiance: EMISSARY.abs(EMISSARY_EV.defiance),    // 26.0
  beat: EMISSARY.abs(EMISSARY_EV.beat),            // 29.4 (score drop-out)
  kick: EMISSARY.abs(EMISSARY_EV.kick),            // 30.4348 == b('emissary',4)
  kickWordThis: EMISSARY.abs(EMISSARY_EV.kick),    // 30.4348 (at freeze start, builder slam)
  pinwheel: EMISSARY.abs(EMISSARY_EV.pinwheel),    // 31.55
  kickWordIs: EMISSARY.abs(EMISSARY_EV.wordIs),    // 31.75 (pit-rim bounce)
  kickWordShearta: EMISSARY.abs(EMISSARY_EV.wordShearta), // 32.45 (vanish)

  // --- S4 march + dine ---
  marchStep0: MARCH.abs(MARCH_EV.steps),           // 33.0 (steps every MARCH_STEP)
  seaGag: MARCH.abs(MARCH_EV.seaGag),              // 36.0
  camp: MARCH.abs(MARCH_EV.camp),                  // 39.5
  poleReveal: MARCH.abs(MARCH_EV.poleReveal),      // 40.8261 == b('march',3)
  dine: MARCH.abs(MARCH_EV.dine),                  // 41.0 (caption m1)

  // --- S5 phalanx ---
  phalanxIn: PHALANX.abs(PHALANX_EV.dawn),          // 45.0 shot start
  persiansCharge: PHALANX.abs(PHALANX_EV.persiansCharge), // 45.4
  phalanxHold: PHALANX.abs(PHALANX_EV.hold),       // 45.6 (caption ph1)
  wallSlam: PHALANX.abs(PHALANX_EV.wallSlam),      // 49.0 == b('phalanx',2)
  contact: PHALANX.abs(PHALANX_EV.contact),        // 50.5
  kill1: PHALANX.abs(PHALANX_EV.kill1),            // 53.4
  kill2: PHALANX.abs(PHALANX_EV.kill2),            // 57.8
  waveBreaks: PHALANX.abs(PHALANX_EV.waveBreaks),  // 59.8
  reform: PHALANX.abs(PHALANX_EV.reform),          // 61.0

  // --- S6 xerxes ---
  xerxesShadow: XERXES.abs(XERXES_EV.shadow),      // 62.0
  xerxesEnter: XERXES.abs(XERXES_EV.enter),        // 62.5
  xerxesLine1: XERXES.abs(XERXES_EV.line1),        // 63.5 (caption x1)
  immortals: XERXES.abs(XERXES_EV.immortals),      // 65.5
  wigOffer: XERXES.abs(XERXES_EV.wigOffer),        // 67.5
  xerxesLine2: XERXES.abs(XERXES_EV.line2),        // 68.0 (caption x2)
  stepUp: XERXES.abs(XERXES_EV.stepUp),            // 70.5
  refusal: XERXES.abs(XERXES_EV.refusal),          // 72.5

  // --- S7 storm ---
  stormIn: STORM.abs(STORM_EV.stormIn),            // 74.0 shot start
  arrowsLine: STORM.abs(STORM_EV.officer),         // 74.8 (caption s1)
  grin: STORM.abs(STORM_EV.grin),                  // 78.6
  shadeLine: STORM.abs(STORM_EV.shadeLine),        // 79.0 (caption s2)
  blacken: STORM.abs(STORM_EV.blacken),            // 79.6
  stormPeak: STORM.abs(STORM_EV.stormPeak),        // 80.0 == b('storm',3) — key +2
  roofLock: STORM.abs(STORM_EV.roofLock),          // 80.6
  clatter: STORM.abs(STORM_EV.clatter),            // 81.0
  snip: STORM.abs(STORM_EV.snip),                  // 83.5 == b('storm',4,3) — score mutes
  smile: STORM.abs(STORM_EV.smile),                // 84.5 == b('storm',5,1)

  // --- S8 last stand ---
  laststandDust: LASTSTAND.abs(LASTSTAND_EV.dust), // 86.0
  runUp: LASTSTAND.abs(LASTSTAND_EV.runUp),        // 87.0
  hurl: LASTSTAND.abs(LASTSTAND_EV.hurl),          // 91.3333 == b('laststand',2)
  spearFlight: LASTSTAND.abs(LASTSTAND_EV.flight), // 91.5
  freeze: LASTSTAND.abs(LASTSTAND_EV.freeze),      // 93.5 — world pins; silence
  heartbeat1: 93.9,                                // sl-clock (whitelist): lub
  heartbeat2: 94.4,                                // sl-clock (whitelist): dub

  // --- S9 plataea ---
  plataeaDawn: PLATAEA.abs(PLATAEA_EV.dawn),       // 95.0 == b('plataea',0)
  modeFlip: PLATAEA.abs(PLATAEA_EV.modeFlip),      // 95.0 — D major from here
  dilios: PLATAEA.abs(PLATAEA_EV.dilios),          // 95.5
  remember: PLATAEA.abs(PLATAEA_EV.remember),      // 95.9 (caption pl1)
  spearsRise: PLATAEA.abs(PLATAEA_EV.spearsRise),  // 97.0
  charge: PLATAEA.abs(PLATAEA_EV.charge),          // 97.5 == b('plataea',1)
  endCard: PLATAEA.abs(PLATAEA_EV.endCard),        // 100.0 == b('plataea',2)
  cardEnd: PLATAEA.abs(PLATAEA_EV.end),            // 103.9 (card out; tails resolved)
}

// ---------- flat load-bearing constants (ABSOLUTE film seconds) ----------
// The names the brief + composer reaching for; every one aliases MASTER.
export const TITLE_SLAM = MASTER.titleSlam                 // 2.5
export const EMBER_PERIOD = 2.0                            // s/cycle; ember k at emberT0 + k*P
export const EMBER_T0 = MASTER.emberT0                     // 0.0
export const WOLF_LUNGE = MASTER.wolfLunge                 // 16.5 (freeze start)
export const WOLF_BALD = MASTER.wolfBald                   // 18.35
export const EMISSARY_LINES = { mercy: MASTER.emLine1, oneThing: MASTER.emLine2, madness: MASTER.emLine3 }
export const KICK_G = MASTER.kick                          // 30.4348 (window 30.2-30.5)
export const KICK_WORD_THIS = MASTER.kickWordThis          // 30.4348
export const KICK_WORD_IS = MASTER.kickWordIs              // 31.75
export const KICK_WORD_SHEARTA = MASTER.kickWordShearta    // 32.45
export const MARCH_STEP = beatSec('march')                 // 0.6522 s/step (92 bpm quarter)
export const MARCH_STEP0 = MASTER.marchStep0               // 33.0 (first step; steps until camp 39.5)
export const POLE_REVEAL = MASTER.poleReveal               // 40.8261
export const DINE_CAPTION = MASTER.dine                    // 41.0
export const WALL_SLAM = MASTER.wallSlam                   // 49.0
export const CONTACT = MASTER.contact                      // 50.5
export const KILL_1 = MASTER.kill1                         // 53.4
export const KILL_2 = MASTER.kill2                         // 57.8
export const WAVE_BREAKS = MASTER.waveBreaks               // 59.8
export const XERXES_ENTER = MASTER.xerxesEnter             // 62.5
export const WIG_OFFER = MASTER.wigOffer                   // 67.5
export const REFUSAL = MASTER.refusal                      // 72.5
export const SHADE_LINE = MASTER.shadeLine                 // 79.0
export const STORM_PEAK = MASTER.stormPeak                 // 80.0
export const SNIP = MASTER.snip                            // 83.5
export const HURL = MASTER.hurl                            // 91.3333
export const FREEZE_G = MASTER.freeze                      // 93.5
export const HEARTBEAT_1 = MASTER.heartbeat1               // 93.9 (film time; world frozen)
export const HEARTBEAT_2 = MASTER.heartbeat2               // 94.4 (film time; world frozen)
export const PLATAEA_DAWN = MASTER.plataeaDawn             // 95.0
export const CHARGE = MASTER.charge                        // 97.5
export const ENDCARD = MASTER.endCard                      // 100.0

// ---------- caption styles film.js must register (captionStyles) ----------
// captions.js has core: title (Anton 132 y540 line) · sub (30px y986) ·
// kicker (mono 26 y430) — core sub/kicker sizes are BELOW the 32px floor,
// so every row overrides size explicitly. 'narrator'/'speech' are film-local:
// serif, parchment, glow shadow for the bronze grade. Italic: captions.js has
// no italic key — weight is injected verbatim into the canvas font string
// (`${weight} ${size}px ${font}`), so 'italic 600' yields true italics; if a
// filmkit build orders that differently, drop to '600' (roman fallback).
const F_SERIF = '"Cormorant Garamond"'
const F_MONO = '"JetBrains Mono"'
export const STYLES = {
  narrator: { font: F_SERIF, weight: 'italic 600', size: 32, color: '#e8d5ae', x: 960, y: 200, align: 'center', lineHeight: 1.3, track: 1, anim: 'fade', in: 0.4, out: 0.4, glow: '#000000', glowBlur: 10 },
  speech:   { font: F_SERIF, weight: 'italic 600', size: 34, color: '#f2e8d0', x: 960, y: 856, align: 'center', lineHeight: 1.3, track: 1, anim: 'rise', in: 0.3, out: 0.25, glow: '#000000', glowBlur: 10 },
}

// ---------- safe area ----------
// 2.39:1 at 16:9: visible band = 1920/2.39 = 803 px tall -> bars (1080-803)/2
// = 138 -> band y [138, 942]. Captions stay in [180, 900]; letterbox 1.0.
export const SAFE = { letterbox: 1.0, bandY: [138, 942], captionYMin: 180, captionYMax: 900, minSize: 32 }

// ---------- CAPTIONS (film seconds; visible = (t1-out) - (t0+in) >= 3.0) ----------
// The three KICK WORDS are NOT here (builder slams them as picture).
// HOLD TABLE (visible legs):
//   p1_narrator   0.00- 3.80  in .4  out .4  visible 3.00  (narrator, top-safe y200)
//   p2_title      2.50- 6.40  in .4  out .5  visible 3.00  (title lane y540; slam = braam frame)
//   p3_subtitle   3.20- 6.90  in .3  out .3  visible 3.10  (sub lane y660, under title)
//   w1_theme     16.00-19.85  in .3  out .25 visible 3.30  (rides lunge freeze + bald reveal)
//   em1_mercy    20.00-23.45  in .2  out .15 visible 3.10  (chain, rides 0.2/0.15 — deviation 2)
//   em2_onething 23.45-26.95  in .2  out .2  visible 3.10  (chain, touches em1 out)
//   em3_madness  26.95-30.43  in .2  out .15 visible 3.13  (stacked exchange; clears 4.8ms pre-kick)
//   m1_dine      41.00-44.80  in .3  out .3  visible 3.20
//   ph1_hold     45.60-49.00  in .25 out .15 visible 3.00  (gone exactly at the wall slam)
//   x1_generous  63.50-67.40  in .3  out .3  visible 3.30
//   x2_world     68.00-72.30  in .3  out .3  visible 3.70
//   s1_arrows    74.80-78.60  in .3  out .25 visible 3.25
//   s2_shade     79.00-82.70  in .25 out .2  visible 3.25  (rides across the 80.0 key-change peak)
//   pl1_remember 95.90-99.60  in .3  out .3  visible 3.10
//   e1_card     100.00-103.90 in 0   out .1  visible 3.80  (>= 3.5 end card; minHold 3.5 declared)
//   e2_credit   100.00-103.90 in .2  out .1  visible 3.60
// Lane map (no same-lane overlap; chains touch exactly): narrator y200 ·
// title y540 · sub y660 · kicker y430 · speech y856. Every row inside its
// shot; every size >= 32; x centered 960.
export const CAPTIONS = [
  // S1 0-10 prologue
  { id: 'p1_narrator', text: "The old men say:\na man's flow is his country.", t0: 0.0, t1: 3.8, style: 'narrator', x: 960, y: 200, size: 32, anim: 'fade', in: 0.4, out: 0.4 },
  { id: 'p2_title', text: '3000', t0: 2.5, t1: 6.4, style: 'title', x: 960, y: 540, size: 132, anim: 'line', in: 0.4, out: 0.5 }, // Anton 132 (core title size, explicit for the lint)
  { id: 'p3_subtitle', text: 'A REMY BOYS EPIC', t0: 3.2, t1: 6.9, style: 'sub', x: 960, y: 660, size: 32, anim: 'rise', in: 0.3, out: 0.3, track: 6 },
  // S2 10-20 wolf
  { id: 'w1_theme', text: 'The flow either holds the line —\nor the scalp falls.', t0: 16.0, t1: 19.85, style: 'speech', x: 960, y: 856, size: 32, anim: 'rise', in: 0.3, out: 0.25 },
  // S3 20-33 emissary — dialogue chain (rides 0.2/0.15, see deviation 2)
  { id: 'em1_mercy', text: 'Xerxes, King of Kings, offers mercy:\nkneel, and keep your respectable rim.', t0: 20.0, t1: 23.45, style: 'speech', x: 960, y: 856, size: 32, anim: 'fade', in: 0.2, out: 0.15 },
  { id: 'em2_onething', text: 'Shearta asks one thing of her enemies.', t0: 23.45, t1: 26.95, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.2, out: 0.2 },
  { id: 'em3_madness', text: ['This is madness!', ['Madness?', '#e05038']], t0: 26.95, t1: 30.43, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.2, out: 0.15 }, // line 2 crimson = Leonidhair
  // S4 33-45 march
  { id: 'm1_dine', text: 'Tonight... we dine in Bald.', t0: 41.0, t1: 44.8, style: 'speech', x: 960, y: 856, size: 34, anim: 'rise', in: 0.3, out: 0.3 },
  // S5 45-62 phalanx
  { id: 'ph1_hold', text: 'HOLD... HOLD...', t0: 45.6, t1: 49.0, style: 'kicker', x: 960, y: 430, size: 32, anim: 'fade', in: 0.25, out: 0.15, font: F_MONO, color: '#f0d9a8', track: 6 }, // out lands exactly on the slam
  // S6 62-74 xerxes
  { id: 'x1_generous', text: 'Unlike the cruel Leonidhair,\nI am generous.', t0: 63.5, t1: 67.4, style: 'speech', x: 960, y: 856, size: 32, anim: 'fade', in: 0.3, out: 0.3 },
  { id: 'x2_world', text: 'The world will know free men stood\nagainst a razor — and 3,000 strands held.', t0: 68.0, t1: 72.3, style: 'speech', x: 960, y: 856, size: 32, anim: 'rise', in: 0.3, out: 0.3 },
  // S7 74-86 storm
  { id: 's1_arrows', text: 'Our arrows will blot out the sun.', t0: 74.8, t1: 78.6, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.3, out: 0.25 },
  { id: 's2_shade', text: 'Then we will comb in the shade.', t0: 79.0, t1: 82.7, style: 'speech', x: 960, y: 856, size: 34, anim: 'fade', in: 0.25, out: 0.2 },
  // S9 95-104 plataea
  { id: 'pl1_remember', text: 'Remember why they fell.', t0: 95.9, t1: 99.6, style: 'speech', x: 960, y: 856, size: 34, anim: 'rise', in: 0.3, out: 0.3 },
  { id: 'e1_card', text: '3000 — THE FLOW REMEMBERS.', t0: 100.0, t1: 103.9, style: 'title', x: 960, y: 540, size: 84, anim: 'cut', in: 0, out: 0.1, minHold: 3.5, track: 2 }, // 26 chars measured-safe at 84
  { id: 'e2_credit', text: 'A REMY BOYS PICTURE', t0: 100.0, t1: 103.9, style: 'sub', x: 960, y: 660, size: 32, anim: 'fade', in: 0.2, out: 0.1, track: 6 },
]

// ---------- screen flashes: [absoluteT, peak, decay] — peaks <= .24, decay <= .2 ----------
// Bronze grade: the kick is the one full-frame hit; everything else reads as
// in-scene glints. The freeze (93.5) gets NO flash — silence is the effect.
export const FLASHES = [
  [MASTER.titleSlam, 0.2, 0.14],     // title slam dust burst
  [MASTER.wolfLunge, 0.16, 0.1],     // comb-flash glint
  [MASTER.kick, 0.24, 0.16],         // THE impact (biggest)
  [MASTER.kickWordIs, 0.14, 0.1],    // pit-rim bounce
  [MASTER.kickWordShearta, 0.16, 0.12], // vanish into the black
  [MASTER.wallSlam, 0.2, 0.12],      // shield-wall slam
  [MASTER.kill1, 0.14, 0.09],        // thrust kill 1
  [MASTER.kill2, 0.14, 0.09],        // thrust kill 2
  [MASTER.endCard, 0.12, 0.14],      // end card slam (soft)
]
export const flashK = (t) => {
  let k = 0
  for (const f of FLASHES) if (t >= f[0]) k = Math.max(k, f[1] * Math.exp(-(t - f[0]) / f[2]))
  return k
}

// ---------- named cue anchors (composer quick table; all clock-derived abs) ----------
export const CUES = {
  prologueIn: MASTER.windIn,           // 0.0     drone + wind in
  titleSlam: MASTER.titleSlam,         // 2.5     braam (E1)
  heartbeatOut: MASTER.heartbeatOut,   // 5.0     taiko heartbeat tail
  wolfIn: T.wolf,                      // 10.0    white-out, duduk in
  shearta1: SHEARTA_TIMES[0],          // 10.0    SHEARTA D
  shearta2: SHEARTA_TIMES[1],          // 11.6    F
  shearta3: SHEARTA_TIMES[2],          // 13.2    G
  shearta4: SHEARTA_TIMES[3],          // 14.8    A
  wolfLunge: MASTER.wolfLunge,         // 16.5    comb-flash impact (freeze)
  wolfBald: MASTER.wolfBald,           // 18.35   the seed of the war
  emissaryIn: T.emissary,              // 20.0    banners
  beat: MASTER.beat,                   // 29.4    SCORE DROPS OUT
  kick: MASTER.kick,                   // 30.4348 choir stab + mega impact (freeze)
  kickWordThis: MASTER.kickWordThis,   // 30.4348 THIS!
  kickWordIs: MASTER.kickWordIs,       // 31.75   IS!
  kickWordShearta: MASTER.kickWordShearta, // 32.45  SHEARTA!
  marchIn: T.march,                    // 33.0    taiko march groove
  poleReveal: MASTER.poleReveal,       // 40.8261 barbershop pole hum
  dine: MASTER.dine,                   // 41.0    "dine in Bald" low and grinning
  phalanxIn: T.phalanx,                // 45.0    double-time in
  wallSlam: MASTER.wallSlam,           // 49.0    taiko wall + impact
  contact: MASTER.contact,             // 50.5    smeared sustain (crawl)
  kill1: MASTER.kill1,                 // 53.4    impact (freeze)
  kill2: MASTER.kill2,                 // 57.8    impact (freeze)
  waveBreaks: MASTER.waveBreaks,       // 59.8    scatter
  xerxesIn: T.xerxes,                  // 62.0    gong bloom begins
  wigOffer: MASTER.wigOffer,           // 67.5    silky false-gracious chord
  refusal: MASTER.refusal,             // 72.5    bare octave stab
  stormIn: T.storm,                    // 74.0    machine percussion
  stormPeak: MASTER.stormPeak,         // 80.0    KEY UP whole step (bar 3)
  snip: MASTER.snip,                   // 83.5    FULL MUTE ~1 s (one glass tick)
  smile: MASTER.smile,                 // 84.5    warm small re-entry
  laststandIn: T.laststand,            // 86.0    dread strings
  hurl: MASTER.hurl,                   // 91.3333 riser resolves, world crawls
  freeze: MASTER.freeze,               // 93.5    TOTAL SILENCE
  heartbeat1: MASTER.heartbeat1,       // 93.9    lub (film time)
  heartbeat2: MASTER.heartbeat2,       // 94.4    dub
  plataeaIn: T.plataea,                // 95.0    MODE FLIP to D major
  charge: MASTER.charge,               // 97.5    full host + choir
  endCard: MASTER.endCard,             // 100.0   fanfare slam, resolve by 103.5
}

// ========================= VALIDATE =========================
// node --input-type=module -e 'import("./films/3000/timeline.js").then(m=>console.log(m.validate()))'
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
  say('A structure', 'DUR', [bad(DUR === 104.0, `DUR ${DUR} != 104`)], `DUR = ${DUR}`)
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
  say('A structure', 'MASTER.bpm', [bad(MASTER.bpm === 92, `bpm ${MASTER.bpm}`)], '92 (emissary + march grids)')

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
  // mandated freeze table (times from the brief; 30 ms tolerance)
  const freezeSpec = [
    ['wolf lunge/comb-flash ~16.5 d0.35', STOPS.wolf[0], WOLF, 16.5, 0.35, null],
    ['THE KICK in 30.2-30.5 d0.55 (biggest)', STOPS.emissary[0], EMISSARY, 30.4348, 0.55, [30.2, 30.5]],
    ['wall SLAM ~49 d0.3', STOPS.phalanx[0], PHALANX, 49.0, 0.3, null],
    ['kill1 ~53.4 d0.25', STOPS.phalanx[1], PHALANX, 53.4, 0.25, null],
    ['kill2 ~57.8 d0.25', STOPS.phalanx[2], PHALANX, 57.8, 0.25, null],
    ['hurl FREEZE ~93.5 d1.5 (tail to 95)', STOPS.laststand[0], LASTSTAND, 93.5, 1.5, null],
  ]
  for (const [label, st, clk, wantT, wantD, win] of freezeSpec) {
    const got = clk.abs(st.g)
    say('B stops', label,
      [bad(Math.abs(got - wantT) <= 0.0301, `film ${got.toFixed(4)} vs spec ${wantT}`),
       bad(st.d === wantD, `d ${st.d} != ${wantD}`),
       ...(win ? [bad(got >= win[0] && got <= win[1], `outside window ${win[0]}-${win[1]}`)] : []),
       bad(st.d !== 1.5 || Math.abs(got + st.d - 95.0) <= 0.011, 'frozen tail must end at the 95.0 cut')],
      `film ${got.toFixed(4)} + ${st.d}`)
  }
  say('B stops', 'KICK_G window', [bad(KICK_G >= 30.2 && KICK_G <= 30.5, `KICK_G ${KICK_G}`)], `KICK_G = ${KICK_G.toFixed(4)}`)
  say('B stops', 'FREEZE_G window', [bad(Math.abs(FREEZE_G - 93.5) <= 0.031, `FREEZE_G ${FREEZE_G}`)], `FREEZE_G = ${FREEZE_G.toFixed(4)}`)

  // --- C. per-shot EV tables (world g; one row per shot) ---
  const EVS = { prologue: PROLOGUE_EV, wolf: WOLF_EV, emissary: EMISSARY_EV, march: MARCH_EV, phalanx: PHALANX_EV, xerxes: XERXES_EV, storm: STORM_EV, laststand: LASTSTAND_EV, plataea: PLATAEA_EV }
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
  const SL_EXCEPTIONS = ['heartbeat1', 'heartbeat2'] // sl-clock inside the freeze (header deviation 4)
  const NON_EVENT = ['bpm']                          // musical-map scalar, not a picture event
  const shotOf = (t) => SHOTS.find((s) => t >= s.t0 - eps && t < s.t1 - eps)
  for (const [k, v] of Object.entries(MASTER)) {
    if (typeof v !== 'number' || NON_EVENT.includes(k)) continue
    const s = shotOf(v)
    const sub = [bad(s && v >= 0 && v < DUR, `value ${v} outside the film`)]
    let detail = `= ${Number(v.toFixed(4))}`
    if (s && !SL_EXCEPTIONS.includes(k)) {
      const gs = Object.entries(EVS[s.name]).filter(([, g]) => Math.abs(CLK[s.name].abs(g) - v) < 1e-6)
      sub.push(bad(gs.length > 0, `not t0+filmT(EV) of ${s.name}`))
      if (gs.length) detail += ` (${s.name}.${gs[0][0]})`
    } else if (s && SL_EXCEPTIONS.includes(k)) {
      detail += ` (${s.name} sl-clock, whitelisted)`
    }
    say('D master', `MASTER.${k}`, sub, detail)
  }
  say('D master', 'motifs', [bad(MASTER.motifs.shearta.minor.join() === '0,3,5,7', 'SHEARTA must be [0,3,5,7] (D-F-G-A)')],
    `SHEARTA D-F-G-A from D${SHEARTA_ROOT}; major restatement [${SHEARTA_MAJOR.join(',')}]`)
  say('D master', 'modeFlip', [bad(MASTER.motifs.modeFlip.t === T.plataea, `flip at ${MASTER.motifs.modeFlip.t}`)],
    `D minor -> D MAJOR at film ${MASTER.motifs.modeFlip.t}`)

  // --- E. captions (one row per caption; all sub-checks merged) ---
  const linesOf = (c) => (Array.isArray(c.text) ? c.text : String(c.text).split('\n'))
  const wordsOf = (line) => (Array.isArray(line) ? line.map((sp) => sp[0]).join(' ') : line).trim().split(/\s+/).filter(Boolean).length
  const byLane = {}
  for (const c of CAPTIONS) {
    const s = shotOf(c.t0)
    const vis = (c.t1 - c.out) - (c.t0 + c.in)
    const floor = c.id === 'e1_card' ? 3.5 : 3.0
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
    ['TITLE_SLAM', TITLE_SLAM, 'prologue', 1, 0],
    ['KICK_G', KICK_G, 'emissary', 4, 0],
    ['WALL_SLAM', WALL_SLAM, 'phalanx', 2, 0],
    ['STORM_PEAK', STORM_PEAK, 'storm', 3, 0],
    ['HURL', HURL, 'laststand', 2, 0],
    ['PLATAEA_DAWN', PLATAEA_DAWN, 'plataea', 0, 0],
    ['CHARGE', CHARGE, 'plataea', 1, 0],
    ['ENDCARD', ENDCARD, 'plataea', 2, 0],
    ['SNIP', SNIP, 'storm', 4, 3],
    ['POLE_REVEAL', POLE_REVEAL, 'march', 3, 0],
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
  let out = `\n== 3000 timeline validation ${'='.repeat(40)}`
  for (const g of groups) {
    out += `\n [${g}]`
    for (const r of rows.filter((r) => r.group === g)) {
      out += `\n   ${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(40)} ${r.detail}`
    }
  }
  const nPass = rows.filter((r) => r.ok).length
  out += `\n== ${rows.length} checks: ${nPass} pass, ${rows.length - nPass} violations ==\n`
  if (fails.length) throw new Error(`3000 timeline: ${fails.length} violation(s)\n  - ` + fails.join('\n  - '))
  return out
}
