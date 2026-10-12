// THE WIZARD OF FLOZ — There's No Place Like Growth. Cue sheet + choreography:
// the single shared source of truth that picture (film.js/art.js) AND score
// (score.js) both import. 104 s, 1920x1080 @60fps, 2D filmkit full-res painted
// stage (pirates-cabald lineage), letterbox 0.8, first Technicolor golden-age
// musical fantasy in the catalog. All pure functions of time (no Math.random,
// no Date, no state carried between frames).
//
// CLOCK RULE (load-bearing): NO hit-stops in this film — story.md §3 declares
// none (the S2->S3 burst is a HARD CUT, the melt and the heel clicks are
// continuous time), so STOPS is empty and EVERY shot satisfies abs(g) = t0 + g
// exactly. Keep using the per-shot clocks (never hand-add t0 + g anywhere) so
// that if a stop is ever introduced, only the clocks change. makeClock is
// copied verbatim from pirates/goldflow for structural parity; the S2->S3
// boundary at 18.0 is a hard cut and must NEVER get a crossfade, wipe or stop.
//
// Deviations from story.md nominal numbers (screenplay agent owns exact numbers;
// story grants +-0.5 s per shot and names S6/S7 tails as the trim donors):
//   1. RETIME: S4 11.0 -> 11.5 (+0.5), S8 8.0 -> 8.5 (+0.5), S6 11.5 -> 11.0
//      (-0.5 tail), S7 10.5 -> 10.0 (-0.5 tail). Reason: the house hold rule is
//      FULLY-VISIBLE hold, (t1-out)-(t0+in) >= 3.0 — story's bare 3.0 s caption
//      windows cannot fit 3.0 visible with any anim in/out rides. Binding rows:
//      S4-C5 (needs window 3.5, shot ends 41.0) and S8-C10 (kicker needs 3.5
//      after its beat-pinned g4.9 in). DUR stays 104.0 exactly. Shifted
//      absolutes: E11 43.8/45.0 -> 44.3/45.5, E12 50.0 -> 50.5, E13 53.2 ->
//      53.7 (doom), E16 72.2/73.0 -> 71.7/72.5, E17 75.6/76.6 -> 75.1/76.1.
//      The S6 glitch-wink KEEPS its nominal film value 59.3 (t0 gained +0.5,
//      its local g moved 11.3 -> 10.8, still 0.2 s clear of the 59.5 cut).
//      S7 absolutes (60.3/61.5/65.5/68.1) and ALL S10 numbers (clicks, drain,
//      end card) are untouched.
//   2. CAPTION OUT-EXTENSIONS (same visible-hold rule; beat-pinned INS are
//      untouched): T2 6.6->7.4, C1 g7.4->7.9, C2 g6.0->6.6, C3 g11.0->11.3,
//      C4 g3.6->4.1, C5 g10.8->11.3, C6 g8.6->8.9, C7 g4.2->5.0, C8 g9.2->9.7,
//      C9 g6.4->6.7, C10 g7.9->8.4, C11 g7.0->7.3, C15 g11.0->11.3 (C15 rides
//      0.3 s over the slate start — different lane, main y868 vs title y540).
//   3. End card/tease windows end g12.9 (film 103.9) not 13.0: end-inside-the-
//      film lint margin, house precedent (pirates ends its slate at 95.9/96).
//      Declared minHold 1.0 still met by both.
//   4. CHANT OVERRIDE SEMANTICS: story's declared minHold 1.8/1.8/2.2 is the
//      chain WINDOW leg (t1-t0), contiguous out = next in. The mandated
//      escalating anims (fade/line/rise) need in/out rides, so the fully-visible
//      legs are 1.40/1.40/1.80 and the minHold FIELDS carry those delivered
//      visible legs. (Story pins both the chain geometry and the anims; the
//      window-leg reading is the only self-consistent one. Self-check asserts
//      both the window legs and the visible legs.)
//   5. E1 end slate is TWO caption rows (card + credit, pirates house pattern):
//      20 caption data rows vs story's 19 (story's E1 row = both).
//   6. Tail beats: S3 story beats end g11.8 in a 12.0 shot — the trailing 0.2
//      is the 6-frame dip-to-white (EV dip 11.5, cut 12.0). S4's lion-haze
//      point g10.8 rides the +0.5 to cut 11.5. S7 out beat "last strand
//      trembles" 9.5 -> cut 10.0 (tail trimmed per retime). S8 kneel/pennant
//      tail rides the retime (cut g 8.5). S9 bubbleIn g12.4 sets up the S10
//      match-cut (story cut g12.8 -> boundary 13.0).
//   7. No film-wide grid: cuts 0/10/18/30/41.5/48.5/59.5/69.5/78/91/104 are not
//      on one uniform bar — each score section carries its own grid (SCORE).
//      S10 click cues are CLOCK-pinned (MASTER.click1/2/3), not grid notes.

export const DUR = 104

// ---------- shot map (film seconds; contiguous, covers [0, 104) exactly) ----------
// CUTS:  0      10       18       30       41.5      48.5     59.5     69.5     78       91       104
export const T = {
  kansas: 0,      // S1 Baldansas farm (sepia)               0-10    (10.0)
  twister: 10,    // S2 the twister (sepia)                  10-18   (8.0)
  flozburst: 18,  // S3 the Floz burst — HARD CUT in at 18.0 18-30   (12.0)
  brickroad: 30,  // S4 the follicle road                    30-41.5 (11.5)
  poppies: 41.5,  // S5 poppy lullaby                        41.5-48.5 (7.0)
  emerald: 48.5,  // S6 emerald city + throne of FLOZ        48.5-59.5 (11.0)
  monkeys: 59.5,  // S7 bald monkeys + hair hourglass        59.5-69.5 (10.0)
  melt: 69.5,     // S8 the melt                             69.5-78  (8.5)
  curtain: 78,    // S9 the curtain + balloon                78-91    (13.0)
  growth: 91,     // S10 no place like growth (sepia tail)   91-104   (13.0)
}

export const SHOTS = [
  { name: 'kansas',    t0: T.kansas,    t1: T.twister,   desc: 'Sepia farm, wind as a character: hair-weathervane gag, razor-basket bicycle neighbor, funnel forms, chickens fly BACKWARDS, hero scoops Flowto, HOUSE LIFTS at g8.0, roar swallows the mix' },
  { name: 'twister',   t0: T.twister,   t1: T.flozburst, desc: 'Sepia airborne farmhouse in a debris vortex; window-POV flybys (cow, haystack, pedaling neighbor); MID-SWIRL bicycle->broom witch transform at g4.2 (1-frame white flash); house drops g6.2, THUD g7.2, dust-on-black; HARD CUT at exactly 18.0' },
  { name: 'flozburst', t0: T.flozburst, t1: T.brickroad, desc: 'Sepia interior -> door sliver of COLOR at g1.7 -> HARD CUT mid-door at g2.0 = TECHNICOLOR burst (radial wash 0.5 s, settled g3.0); munchkin march domino, Glinda bubble, ruby slippers arc, green witch threat, celebrate, dip-to-white out' },
  { name: 'brickroad', t0: T.brickroad, t1: T.poppies,   desc: 'Yellow brick road scroll: trio joins (scarecrow g2.5, tin man g4.5, lion g6.8), step-chant march from g7.8, lion points at pink haze, hard cut' },
  { name: 'poppies',   t0: T.poppies,   t1: T.emerald,   desc: 'Rainbow poppy field: scent ribbons, Flowto faints first, line drops like soft dominos, Glinda snow at g4.0, wake-ups (lion snow-hat, tin man bolt sneeze), hard cut' },
  { name: 'emerald',   t0: T.emerald,   t1: T.monkeys,   desc: 'Gate gag (BELL OUT OF ORDER — PLEASE KNOCK), horse of a different color hue-cycles 0.8 s/step, throne room GIANT BALD HEAD doom voice, quartet faint domino, tiptoe moonwalk out, 1-2 frame GLITCH-WINK at g10.8, hard cut' },
  { name: 'monkeys',   t0: T.monkeys,   t1: T.melt,      desc: 'Skywriting SURRENDER FLOWTO stroke-by-stroke, flying BALD monkeys dive in a V and snatch hero + Flowto, castle tower, hair hourglass fills, witch line, Flowto grooms the monkey into defecting (latch opens), whip-pan out' },
  { name: 'melt',      t0: T.melt,      t1: T.curtain,   desc: 'Courtyard: Flowto shoulder-checks the bucket g2.2, witch MELTS from g3.0 (continuous time, no stop), mandated melt line, wig floats pristine on the puddle, Winkie guard kneel domino g6.6, pennant gag, hard cut' },
  { name: 'curtain',   t0: T.curtain,   t1: T.growth,    desc: 'Wig presented; head STUTTERS g1.2; Flowto fireman-tugs the rope g2.4; curtain peels to tiny bald projectionist doing the voice; tokens down the chute g7.4; balloon FLOZ AIR LINES slips with only the wizard g10.0; Glinda bubble enters top of frame for the match-cut' },
  { name: 'growth',    t0: T.growth,    t1: DUR,         desc: 'Bubble lands, three heel CLICKS g2.2/3.6/5.0 (chant pills, escalating anims), reverse-twister drain vacuums color g6.6-7.8 to full sepia, bedroom triple-take, ONE red slipper glint g10.8, end card + tease' },
]

// ---------- shot clocks: copied verbatim from films/pirates-cabald/timeline.js ----------
//   stops: [{ g, d }] in shot-local WORLD time; the freeze pins g at s.g while
//   sl counts real seconds into the stop (effects animate off real t).
// An event scheduled AT a stop's g lands at the START of its freeze (intentional).
// floz declares NO stops (see CLOCK RULE) — every clock satisfies abs(g) = t0 + g.
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

// STOPS — intentionally EMPTY. Story §3: "No hit-stops are declared in this
// film... the burst is a cut, the melt and clicks are continuous-time." Kept as
// an export for structural parity with the house template and the builder's
// imports; if one is ever added, name the shot in the CLOCK RULE above.
export const STOPS = []

// One clock per shot, named for its shot. All stop-free: abs(g) = t0 + g.
export const KANSAS    = makeClock(T.kansas)
export const TWISTER   = makeClock(T.twister)
export const FLOZBURST = makeClock(T.flozburst)
export const BRICKROAD = makeClock(T.brickroad)
export const POPPIES   = makeClock(T.poppies)
export const EMERALD   = makeClock(T.emerald)
export const MONKEYS   = makeClock(T.monkeys)
export const MELT      = makeClock(T.melt)
export const CURTAIN   = makeClock(T.curtain)
export const GROWTH    = makeClock(T.growth)

// ---------- per-shot events (g = shot-local WORLD seconds; use CLOCK.abs(g) for film time) ----------
// S1: Baldansas — dread played cozy. Sepia only: zero color pixels.
export const KANSAS_EV = {
  wide: 0.0,         // grey farm wide, wind roars (HOME motif, sepia celesta, half-speed)
  fence: 1.5,        // hero at the fence, Flowto in her basket; hair-weathervane gag
  titleIn: 2.2,      // main title settles in (caption T1 t0; story E1; fully readable 2.9)
  neighbor: 3.0,     // bald neighbor pedals through, razor basket, TAKEN TO BE SHORN, polite beep
  subtitleIn: 3.6,   // motto subtitle settles (caption T2 t0; story E1)
  funnel: 4.5,       // funnel forms on the horizon (story E2)
  chickens: 4.7,     // chickens fly BACKWARDS past it (story E2 note)
  scoop: 6.5,        // hero scoops Flowto under one arm, runs for the house
  lift: 8.0,         // HOUSE LIFTS (story E3), camera whips up, fence posts dangle
  roar: 9.7,         // wind roar swallows the mix
  cut: 10.0,         // mid-roar HARD CUT into the vortex
}

// S2: the twister — sight-comedy at 60 fps. Sepia only. Window mask rides g1.5-4.2.
export const TWISTER_EV = {
  vortex: 0.0,       // piano, fence, cow, one confused haystack orbit the house
  window: 1.5,       // window POV flybys begin
  cow: 1.8,          // cow passes (moo)
  haystack: 2.3,     // haystack passes
  neighbor: 3.0,     // the bald neighbor pedals PAST THE WINDOW, mid-air, waves politely
  transform: 4.2,    // MID-SWIRL bicycle->broom (story E4): 6-frame crossfade + 1-frame white
                     // flash; first statement of the WITCH motif, cackle with doppler
  shudder: 5.5,      // house shudders, funnel tightens
  drop: 6.2,         // HOUSE DROPS (story E5), whip-pan down, motion lines
  thud: 7.2,         // THUD — frame shake + dust ring (continuous time, NO stop)
  dust: 7.6,         // dust on black g7.6-7.9
  cut: 8.0,          // HARD CUT at exactly film 18.0 — no crossfade, ever
}

// S3: the Floz burst — the signature. Sepia until the sliver, full color after.
export const FLOZBURST_EV = {
  interior: 0.0,     // sepia interior, dust motes, hero + Flowto sit up
  rattle: 1.4,       // doorknob rattles — score: TOTAL SILENCE
  sliver: 1.7,       // door cracks: the film's first non-sepia pixels (story E6 note)
  burst: 2.0,        // HARD CUT mid-door to the reverse angle; frame EXPLODES
                     // TECHNICOLOR (story E6); FLOZ fanfare detonates ON this frame
  threshold: 2.8,    // hero steps to the threshold
  settled: 3.0,      // radial wash (g2.0-2.5) + overshoot bloom settled, saturation 1
  march: 3.6,        // MUNCHKIN MARCH — bounce domino from hatches/barrels (story E7)
  glinda: 5.0,       // GLINDA descends in a soap bubble, pops into shards, winks (story E8)
  slippers: 6.2,     // ruby slippers arc onto the hero's feet, sparkle trail (story E8b);
                     // cackle answered by the fanfare here
  witchSmoke: 7.4,   // sky greys, GREEN WITCH arrives in a smoke puff, wig down (story E9)
  threat: 7.8,       // mandated threat begins (caption C3 t0)
  vanish: 10.0,      // smoke ring; witch motif answered by fanfare
  celebrate: 10.2,   // munchkin bounce cascade, confetti lollipop tips
  dip: 11.5,         // 6-frame dip-to-white begins (wave-off)
  cut: 12.0,         // into S4 road
}

// S4: the follicle road — three job interviews, all hired. Munchkin-scale actors
// gate on g >= their enter time and start offscreen (baldzilla feet scar).
export const BRICKROAD_EV = {
  point: 0.0,        // Glinda's bubble offscreen points; road lights brick by brick
  walk: 1.5,         // walking tune; hero + Flowto skip in step (Flowto skips twice/step)
  scarecrow: 2.5,    // SCARECROW joins (story E10a; HOME motif, reed/whistle)
  tinman: 4.5,       // TIN MAN joins (story E10b; oil arc, CONDITIONER CAN placard; metallic glass)
  lion: 6.8,         // COWARDLY LION joins (story E10c; roar deflates; brass growl)
  chant: 7.8,        // caption C5 lands here, leading the step-chant by 0.4 s
  march: 8.2,        // the foursome marches in step-chant rhythm
  haze: 10.8,        // lion points at the pink haze
  cut: 11.5,         // hard cut (story's g10.8 point rides the +0.5 retime)
}

// S5: poppy lullaby — the villain's plan is a nap; the rescue is weather.
export const POPPIES_EV = {
  field: 0.0,        // field wide, gorgeous, WRONG
  ribbons: 1.2,      // scent ribbons drift over the marching line
  flowtoFaints: 1.8, // Flowto faints first; hero catches him, then yawns
  lineDrops: 2.8,    // the whole line drops like soft dominos, snoring (story E11)
  snow: 4.0,         // Glinda's bubble passes — IT SNOWS (story E11b); poppies re-bud
  wake: 5.5,         // lion wakes in a snow-hat he refuses to remove; tin man oiled awake
  sneeze: 6.3,       // tin man sneezes a bolt that ricochets off a poppy — flies at lens
  cut: 7.0,          // hard cut
}

// S6: emerald city — bureaucracy joke, then awe with a tell.
export const EMERALD_EV = {
  gate: 0.0,         // gate wide; painted sign BELL OUT OF ORDER — PLEASE KNOCK
  signGag: 0.3,      // sign gag beat (story E12 note, film 48.8): bell-pull is a giant comb
  knock: 1.0,        // hero knocks with the comb; door opens; guard peeks through eyelid slot
  horse: 2.0,        // HORSE OF A DIFFERENT COLOR passes (story E12), hue-cycling
                     // one palette step per 0.8 s beat; driver's tie lags one beat
  throne: 4.0,       // match-dissolve: GIANT BALD HEAD OF FLOZ in smoke between fire pylons
  doom: 5.2,         // DOOM VOICE (story E13): BRING ME THE WITCH'S WIG! — organ pedal under
  faint: 8.0,        // quartet faints in a domino, lion first (mane-wish shrivels)
  tiptoe: 9.5,       // single-file moonwalk backwards out of the throne room
  wink: 10.8,        // GLITCH-WINK (story E13 note, film 59.3 — nominal value preserved):
                     // one frame of the tiny man in the smoke; 1-2 real frames, never a
                     // branch-boundary effect. The fraud-flag; only we see it.
  cut: 11.0,         // hard cut
}

// S7: bald monkeys — sky peril with HR complications.
export const MONKEYS_EV = {
  forest: 0.0,       // forest march, castle battlements behind
  skywrite: 0.8,     // skywriting SURRENDER FLOWTO, stroke-by-stroke (story E14); wind frays the O's
  dive: 2.0,         // FLYING BALD MONKEYS dive in a V (story E14b)
  snatch: 3.0,       // the lead snatches Flowto's basket AND the hero, one in each foot
  tower: 4.2,        // castle tower: hero locked up
  hourglass: 4.5,    // the HOURGLASS fills with FALLING HAIR (pink strands, growing pile)
  hourglassLine: 6.0,// witch, wig adjusted: THAT'S HOW MUCH TIME... (story E15; caption C8 t0 g6.2)
  defect: 8.6,       // Flowto grooms the monkey's scalp-patch; eyes soften; latch opens (story E15 note)
  lastStrand: 9.5,   // the hourglass's last strand trembles
  cut: 10.0,         // whip-pan to the courtyard (tail trimmed per retime)
}
export const HORSE_STEP = 0.8 // S6 hue-cycle: palette index = floor(g / 0.8) mod 4

// S8: the melt — triumph by accident. Continuous time; NO stop on the melt start.
export const MELT_EV = {
  courtyard: 0.0,    // witch monologues, hourglass behind her shows ONE strand left
  sneak: 1.0,        // hero + Flowto + defecting monkey sneak along the wall
  caught: 1.8,       // witch catches them, broom raised, monologue inhale
  bucket: 2.2,       // Flowto shoulder-checks the bucket: water arc (story E16a)
  melt: 3.0,         // MELT (story E16b) — witch shrinks/slumps, voice rises; WITCH motif
                     // detunes and slides down a semitone cluster; runs to ~g6.4
  meltLine: 3.2,     // mandated melt line begins (caption C9 t0)
  wigFloat: 5.6,     // puddle settles; the WIG floats pristine, Flowto paddles out (story E17)
  kneel: 6.6,        // WINKIE guards kneel left-to-right click-wave (story E17b)
  pennant: 7.5,      // a guard raises the badly-drawn-hero pennant
  cut: 8.5,          // hard cut (tail rides the +0.5 retime)
}
export const KNEEL_STAGGER = 0.12 // S8 domino kneel: per-guard stagger = index * 0.12 s

// S9: the curtain — the farce engine.
export const CURTAIN_EV = {
  present: 0.0,      // wig on a velvet comb-pillow, quartet bows
  stutter: 1.2,      // giant head booms then STUTTERS (story E18 note), smoke puffs syncopate
  tug: 2.4,          // FLOWTO TUGS THE CURTAIN ROPE — bites it, fireman slide (story E18)
  peel: 3.2,         // curtain peels: TINY BALD remy at a lever console, kettle, PROJECTIONIST patch
  line: 3.6,         // mandated line, squeaked live while the head lip-syncs it (wrong-audio gag)
  mime: 5.6,         // sheepish operation mime: steam = kettle, boom = kick pedal, head = card on a stick
  tokens: 7.4,       // TOKENS down the gift chute (story E19): TONIC, golden COMB, MEDAL;
                     // three gift chimes = the first three HOME notes
  balloon: 9.4,      // FLOZ AIR LINES balloon inflates; wizard boards, wig boxed like crown jewels
  slips: 10.0,       // the rope slips — balloon rises WITH ONLY THE WIZARD (story E20)
  signWave: 10.6,    // he waves a sign flipping BALDANSA OR BUST. / smiley (diegetic, no caption)
  waveBack: 11.6,    // quartet + Flowto wave back, smaller and smaller
  bubbleIn: 12.4,    // Glinda's bubble descends INTO frame from top — match-cut setup
  cut: 13.0,         // into S10
}

// S10: no place like growth — the payoff. Color through the click chain; drain
// g6.6-7.8 vacuums saturation top-down to FULL sepia; post-drain the tail's ONLY
// color is the one sanctioned red slipper glint at g10.8. Never spend it twice.
export const GROWTH_EV = {
  land: 0.0,         // Glinda's bubble lands; points at the hero's heels (gesture only)
  click1: 2.2,       // CLICK 1 (story E21a): spark ring; HOME dip fragment (-3 into the root)
  click2: 3.6,       // CLICK 2 (story E21b): rising fragment
  click3: 5.0,       // CLICK 3 (story E21c): full ensemble — the motif RESOLVES to the tonic
  drainStart: 6.6,   // REVERSE-TWISTER DRAIN (story E22): color vacuumed UP, sat 1 -> 0
  drainEnd: 7.8,     // full sepia, inside the farm bedroom (story E22b)
  bedroom: 7.8,      // family gathered around the bed, hero sitting up
  tripleTake: 8.0,   // the TRIPLE-TAKE (story E23): and you were there, and YOU, and YOU!
  flowtoLeap: 8.2,   // Flowto leaps onto the bed; final YOU lands on the tail thump
  redWink: 10.8,     // ruby slippers under the bed flash ONE red glint (story E23 note)
  endCard: 11.0,     // END CARD slate (story E24; caption e1_card t0)
  tease: 11.4,       // sequel tease in (story E24 note; caption e2_tease t0)
  end: 13.0,         // end card holds to black
}

// ---------- MASTER event table (film-absolute seconds; story.md §3 E1-E24) ----------
// All values DERIVED from the clocks above — never recompute by hand.
export const MASTER = {
  titleSettle: KANSAS.abs(KANSAS_EV.titleIn),             // E1 2.2 (caption T1 t0; settled by 2.9)
  subtitleSettle: KANSAS.abs(KANSAS_EV.subtitleIn),       // E1 3.6 (caption T2 t0)
  funnel: KANSAS.abs(KANSAS_EV.funnel),                   // E2 4.5
  chickens: KANSAS.abs(KANSAS_EV.chickens),               // E2b 4.7
  lift: KANSAS.abs(KANSAS_EV.lift),                       // E3 8.0
  flybyStart: TWISTER.abs(TWISTER_EV.window),             // E4 note 11.5 (window flybys 11.5-14.2)
  transform: TWISTER.abs(TWISTER_EV.transform),           // E4 14.2 — bicycle->broom
  drop: TWISTER.abs(TWISTER_EV.drop),                     // E5 16.2
  thud: TWISTER.abs(TWISTER_EV.thud),                     // E5b 17.2
  dustBlack: TWISTER.abs(TWISTER_EV.dust),                // E5 note 17.6
  sliver: FLOZBURST.abs(FLOZBURST_EV.sliver),             // E6 note 19.7 — first color pixels
  burst: FLOZBURST.abs(FLOZBURST_EV.burst),               // E6 20.0 — THE signature cut frame
  burstSettled: FLOZBURST.abs(FLOZBURST_EV.settled),      // E6 note 21.0
  march: FLOZBURST.abs(FLOZBURST_EV.march),               // E7 21.6
  glinda: FLOZBURST.abs(FLOZBURST_EV.glinda),             // E8 23.0
  slippers: FLOZBURST.abs(FLOZBURST_EV.slippers),         // E8b 24.2
  witchSmoke: FLOZBURST.abs(FLOZBURST_EV.witchSmoke),     // E9 25.4
  scarecrow: BRICKROAD.abs(BRICKROAD_EV.scarecrow),       // E10a 32.5
  tinman: BRICKROAD.abs(BRICKROAD_EV.tinman),             // E10b 34.5
  lion: BRICKROAD.abs(BRICKROAD_EV.lion),                 // E10c 36.8
  chantLead: BRICKROAD.abs(BRICKROAD_EV.chant),           // E10 note 37.8 (chant caption in)
  poppyDrop: POPPIES.abs(POPPIES_EV.lineDrops),           // E11 44.3 (nominal 43.8, retime +0.5)
  glindaSnow: POPPIES.abs(POPPIES_EV.snow),               // E11b 45.5 (nominal 45.0, retime +0.5)
  signGag: EMERALD.abs(EMERALD_EV.signGag),               // E12 note 48.8
  horse: EMERALD.abs(EMERALD_EV.horse),                   // E12 50.5 (nominal 50.0, retime +0.5)
  throne: EMERALD.abs(EMERALD_EV.throne),                 // 52.5
  doom: EMERALD.abs(EMERALD_EV.doom),                     // E13 53.7 (nominal 53.2, retime +0.5)
  faint: EMERALD.abs(EMERALD_EV.faint),                   // 56.5
  tiptoe: EMERALD.abs(EMERALD_EV.tiptoe),                 // 58.0
  glitchWink: EMERALD.abs(EMERALD_EV.wink),               // E13 note 59.3 — nominal PRESERVED
  skywriting: MONKEYS.abs(MONKEYS_EV.skywrite),           // E14 60.3
  monkeyDive: MONKEYS.abs(MONKEYS_EV.dive),               // E14b 61.5
  captured: MONKEYS.abs(MONKEYS_EV.tower),                // 63.7
  hourglass: MONKEYS.abs(MONKEYS_EV.hourglass),           // 64.0
  hourglassLine: MONKEYS.abs(MONKEYS_EV.hourglassLine),   // E15 65.5
  monkeyDefects: MONKEYS.abs(MONKEYS_EV.defect),          // E15 note 68.1
  bucket: MELT.abs(MELT_EV.bucket),                       // E16 71.7 (nominal 72.2, retime -0.5)
  melt: MELT.abs(MELT_EV.melt),                           // E16b 72.5 (nominal 73.0, retime -0.5)
  wigFloat: MELT.abs(MELT_EV.wigFloat),                   // E17 75.1 (nominal 75.6, retime -0.5)
  kneel: MELT.abs(MELT_EV.kneel),                         // E17b 76.1 (nominal 76.6, retime -0.5)
  stutter: CURTAIN.abs(CURTAIN_EV.stutter),               // E18 note 79.2
  curtainTug: CURTAIN.abs(CURTAIN_EV.tug),                // E18 80.4
  curtainPeel: CURTAIN.abs(CURTAIN_EV.peel),              // 81.2
  curtainLine: CURTAIN.abs(CURTAIN_EV.line),              // E18b 81.6
  tokens: CURTAIN.abs(CURTAIN_EV.tokens),                 // E19 85.4
  balloon: CURTAIN.abs(CURTAIN_EV.balloon),               // E19b 87.4
  balloonSlips: CURTAIN.abs(CURTAIN_EV.slips),            // E20 88.0
  signWave: CURTAIN.abs(CURTAIN_EV.signWave),             // E20 note 88.6
  click1: GROWTH.abs(GROWTH_EV.click1),                   // E21a 93.2
  click2: GROWTH.abs(GROWTH_EV.click2),                   // E21b 94.6
  click3: GROWTH.abs(GROWTH_EV.click3),                   // E21c 96.0
  drainStart: GROWTH.abs(GROWTH_EV.drainStart),           // E22 97.6
  drainEnd: GROWTH.abs(GROWTH_EV.drainEnd),               // E22b 98.8 — sepia from here
  tripleTake: GROWTH.abs(GROWTH_EV.tripleTake),           // E23 99.0
  redWink: GROWTH.abs(GROWTH_EV.redWink),                 // E23 note 101.8 — the one red accent
  endCard: GROWTH.abs(GROWTH_EV.endCard),                 // E24 102.0
  tease: GROWTH.abs(GROWTH_EV.tease),                     // E24b 102.4
}

// ---------- safe area ----------
// Letterbox 0.8 house value -> visible band rows ~111..969 at 1080p; captions must
// center at y <= 915 (lint letterbox rule with a size-40 line). Never use the core
// y 930 / y 986 style defaults bare. Film.js must ALSO clamp munchkin bounce tops
// and monkey dive bottoms to bandY before blocking (baldzilla feet scar).
export const SAFE = { letterbox: 0.8, bandY: [111, 969], captionYMax: 915 }

// ---------- CAPTIONS ----------
// Styles are the CORE captionStyles (filmkit captions.js): title {anton 132 y540
// anim line in .7 out .5}, sub {30px w500}, caption {grot 40 y930 -> ALWAYS override
// y to 868}, kicker {mono 26 y430 fade track 6}. Per-caption y/in/out/anim/size are
// legal overrides (all live in CAPTION_DEFAULTS). Lane model (derive lane from y):
//   title lane y540 (T1, e1_card) — far apart, no collision
//   sub lane   y660 (T2 motto under T1, e1_credit under the card) — singleton per film half
//   kicker lane y430 (C7, C10) — single use per shot, never overlaps
//   main lane  y868 (C1-C6, C8, C9, C11-C15; two-line pills at y878 size 38) —
//              strictly sequential, >= 0.9 s gaps EXCEPT the declared chant chain
//   tease lane y780 (e2_tease, under the card stack)
// HOLD TABLE: hold = (t1 - out) - (t0 + in); pass >= 3, or >= declared minHold.
// Chant pills: the DECLARED chain legs (t1-t0) are 1.8/1.8/2.2 (story §4 dagger);
// the visible legs below are what the mandated anims leave.
//   t1_title    2.2-6.6   in .7  out .5  hold 3.20 ok (anim line; settles by 2.9)
//   t2_motto    3.6-7.4   in .4  out .4  hold 3.00 ok (out ext 6.6->7.4, see header)
//   c1_upgrade 14.4-17.9  in .3  out .2  hold 3.00 ok (lands on the transform)
//   c2_anymore 21.0-24.6  in .3  out .2  hold 3.10 ok
//   c3_pretty  25.8-29.3  in .3  out .2  hold 3.00 ok (MANDATED, two-line y878)
//   c4_road    30.6-34.1  in .3  out .2  hold 3.00 ok
//   c5_ohmy    37.8-41.3  in .3  out .2  hold 3.00 ok (MANDATED; leads the chant by 0.4)
//   c6_wig     53.9-57.4  in .3  out .2  hold 3.00 ok (MANDATED, doom styling)
//   c7_surrender 60.7-63.5 in .4 out .4  hold 2.00 ok (kicker, echoes the skywriting; ends pre-cut)
//   c8_time    65.7-69.2  in .3  out .2  hold 3.00 ok (two-line y878)
//   c9_melting 72.7-76.2  in .3  out .2  hold 3.00 ok (MANDATED)
//   c10_dingdong 74.4-77.9 in .3 out .2  hold 3.00 ok (kicker; S8 retime +0.5 made room)
//   c11_curtain 81.8-85.3 in .3  out .2  hold 3.00 ok (MANDATED, two-line y878)
//   c12_click1 93.2-95.0  in .25 out .15 hold 1.40 minHold 1.40 (declared chain leg 1.8) anim fade
//   c13_click2 95.0-96.8  in .25 out .15 hold 1.40 minHold 1.40 (declared chain leg 1.8) anim line
//   c14_click3 96.8-99.0  in .25 out .15 hold 1.80 minHold 1.80 (declared chain leg 2.2) anim rise
//   c15_andyou 99.0-102.3 in .2  out .1  hold 3.00 ok (in exactly at C14's out)
//   e1_card   102.0-103.9 in 0    out .4  hold 1.50 minHold 1.0 (anim cut, slate slam)
//   e1_credit 102.05-103.9 in .2  out .3  hold 1.35 minHold 1.0
//   e2_tease  102.15-103.9 in .2  out .15 hold 1.40 minHold 1.0
// Every window ends inside its shot and inside the film; every y <= 915; main-lane
// gaps >= 0.9 (S3 1.2, S4 3.7) except the contiguous declared chant chain.
export const CAPTIONS = [
  // S1 0-10 kansas (sepia — T1/T2 styles stay sepia-warm; no color pixels)
  { id: 't1_title', text: 'THE WIZARD OF FLOZ', t0: 2.2, t1: 6.6, style: 'title', x: 960, y: 540, anim: 'line', in: 0.7, out: 0.5 },
  { id: 't2_motto', text: "THERE'S NO PLACE LIKE GROWTH", t0: 3.6, t1: 7.4, style: 'sub', x: 960, y: 660, anim: 'rise', in: 0.4, out: 0.4 },
  // S2 10-18 twister (sepia) — c1 lands on the transform
  { id: 'c1_upgrade', text: 'BROOM CLASS UPGRADE: COMPLIMENTARY.', t0: 14.4, t1: 17.9, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  // S3 18-30 flozburst
  { id: 'c2_anymore', text: "WE'RE NOT IN BALDANSA ANYMORE.", t0: 21.0, t1: 24.6, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  { id: 'c3_pretty', text: "I'LL GET YOU, MY PRETTY —\nAND YOUR LITTLE HAIR TOO!", t0: 25.8, t1: 29.3, style: 'caption', x: 960, y: 878, size: 38, anim: 'fade', in: 0.3, out: 0.2 },
  // S4 30-41.5 brickroad
  { id: 'c4_road', text: 'FOLLOW THE FOLLICLE ROAD.', t0: 30.6, t1: 34.1, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  { id: 'c5_ohmy', text: 'LIONS AND TIGERS AND BALDS, OH MY!', t0: 37.8, t1: 41.3, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  // S6 48.5-59.5 emerald — doom styling lives in film.js captionStyles
  { id: 'c6_wig', text: "BRING ME THE WITCH'S WIG!", t0: 53.9, t1: 57.4, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  // S7 59.5-69.5 monkeys
  { id: 'c7_surrender', text: 'SURRENDER FLOWTO.', t0: 59.9, t1: 63.5, style: 'kicker', x: 960, y: 430, anim: 'fade', in: 0.3, out: 0.3 }, // starts with the skywriting onset; ends BEFORE the 63.7 forest->tower cut (the old t1 bled onto the dungeon wall)
  { id: 'c8_time', text: "THAT'S HOW MUCH TIME YOU HAVE LEFT,\nMY PRETTY.", t0: 65.7, t1: 69.2, style: 'caption', x: 960, y: 878, size: 38, anim: 'fade', in: 0.3, out: 0.2 },
  // S8 69.5-78 melt
  { id: 'c9_melting', text: "I'M MELTING! WHAT A WORLD, WHAT A WORLD!", t0: 72.7, t1: 76.2, style: 'caption', x: 960, y: 826, anim: 'fade', in: 0.3, out: 0.2 }, // y lifted clear of Flowto's head at ground level
  { id: 'c10_dingdong', text: 'DING DONG, THE WITCH IS SHORN.', t0: 74.4, t1: 77.9, style: 'kicker', x: 960, y: 430, anim: 'fade', in: 0.3, out: 0.2 },
  // S9 78-91 curtain
  { id: 'c11_curtain', text: 'PAY NO ATTENTION TO THE BALD MAN\nBEHIND THE CURTAIN!', t0: 81.8, t1: 85.3, style: 'caption', x: 960, y: 878, size: 38, anim: 'fade', in: 0.3, out: 0.2 },
  // S10 91-104 growth — THE CHANT: three identical verbatim pills, contiguous
  // (out = next in), escalating anims fade -> line -> rise, text never varies
  // (the joke is the repetition; no x2/x3 counters). Third leg extended to 2.2
  // so the line resolves as she lands home.
  { id: 'c12_click1', text: "THERE'S NO PLACE LIKE GROWTH.", t0: 93.2, t1: 95.0, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.25, out: 0.15, minHold: 1.4 },
  { id: 'c13_click2', text: "THERE'S NO PLACE LIKE GROWTH.", t0: 95.0, t1: 96.8, style: 'caption', x: 960, y: 868, anim: 'line', in: 0.25, out: 0.15, minHold: 1.4 },
  { id: 'c14_click3', text: "THERE'S NO PLACE LIKE GROWTH.", t0: 96.8, t1: 99.0, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.25, out: 0.15, minHold: 1.8 },
  { id: 'c15_andyou', text: 'AND YOU WERE THERE. AND YOU. AND YOU.', t0: 99.0, t1: 102.3, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.2, out: 0.1 },
  // end slate (short-hold style declared minHold 1.0; ends g12.9 = lint margin)
  { id: 'e1_card', text: 'THE WIZARD OF FLOZ', t0: 102.0, t1: 103.9, style: 'title', x: 960, y: 540, anim: 'cut', in: 0, out: 0.4, minHold: 1.0 },
  { id: 'e1_credit', text: 'A REMY BOYS PICTURE', t0: 102.05, t1: 103.9, style: 'sub', x: 960, y: 660, anim: 'fade', in: 0.2, out: 0.3, minHold: 1.0 },
  { id: 'e2_tease', text: 'NEXT: RETURN TO FLOZ', t0: 102.15, t1: 103.9, style: 'caption', x: 960, y: 780, anim: 'fade', in: 0.2, out: 0.15, minHold: 1.0 },
]

// ---------- SCORE — shared musical plan (score.js consumes sections + cues; EV supplies the rest) ----------
// Sections are self-contained: each t0 is a downbeat. No film-wide grid (see header).
// S10 click cues are CLOCK-pinned (MASTER.click1/2/3) — not grid notes.
export const SECTIONS = [
  { name: 'kansas',    t0: T.kansas,    t1: T.twister,   bpm: 84,  beats: 3, key: 'F major',  feel: 'sepia celesta lullaby-waltz, half-speed feel; wind the only percussion; HOME motif stated quiet on HOME_ROOT (long-long-short-long-held); the tune sounds older than the farm' },
  { name: 'twister',   t0: T.twister,   t1: T.flozburst, bpm: 126, beats: 6, key: 'D minor',  feel: 'the waltz broken into rotating 6/8 fragments, breathless; kit.wind + riser; FIRST WITCH cackle at MASTER.transform (doppler, banks away); thud pin at MASTER.thud; music dies into the dust-on-black' },
  { name: 'flozburst', t0: T.flozburst, t1: T.brickroad, bpm: 120, beats: 4, key: 'C major',  feel: 'TOTAL SILENCE t0 through the door crack (rattle unscored); FLOZ fanfare detonates EXACTLY on MASTER.burst (the cut frame); munchkin march bounce from MASTER.march; cackle->fanfare answer at MASTER.slippers; HOME blooms major with the chorus' },
  { name: 'brickroad', t0: T.brickroad, t1: T.poppies,   bpm: 116, beats: 4, key: 'G major',  feel: 'stride-and-swing walking tune, oom-pah bass + claps; each join re-orchestrates the tune: reed/whistle (scarecrow 32.5), metallic glass (tinman 34.5), brass growl (lion 36.8); chant rhythm under MASTER.chantLead' },
  { name: 'poppies',   t0: T.poppies,   t1: T.emerald,   bpm: 63,  beats: 3, key: 'F major',  feel: 'HOME drugged, half-speed, splayed; the snow at MASTER.glindaSnow re-inflates the tempo like a held breath released' },
  { name: 'emerald',   t0: T.emerald,   t1: T.monkeys,   bpm: 96,  beats: 4, key: 'Eb major', feel: 'brass splendor at the gate; organ doom (additive hollowBell + sub/impact) takes over at MASTER.doom and NEVER quite resolves — awe with a fake bottom; FLOZ fanfare rides while the cackle sneaks in the bass; one-frame hiccup at MASTER.glitchWink' },
  { name: 'monkeys',   t0: T.monkeys,   t1: T.melt,      bpm: 152, beats: 4, key: 'A minor',  feel: 'the cackle full dominance — monkeys fly to its rhythm; percussive wing-flaps + shrill ostinato; hourglass ticks the ONLY steady pulse from MASTER.hourglass' },
  { name: 'melt',      t0: T.melt,      t1: T.curtain,   bpm: 88,  beats: 4, key: 'C minor',  feel: 'WITCH motif detunes and slides DOWN with MASTER.melt (sweepDown gliss); guards hail = triumph brass-first at MASTER.kneel' },
  { name: 'curtain',   t0: T.curtain,   t1: T.growth,    bpm: 112, beats: 4, key: 'C major',  feel: 'the fanfare as a broken music box — cranked, stuttering at MASTER.stutter, one crank too many; three gift chimes at MASTER.tokens = the first three HOME notes; balloon strings at MASTER.balloon' },
  { name: 'growth',    t0: T.growth,    t1: DUR,         bpm: 84,  beats: 3, key: 'F major',  feel: 'clicks are CLOCK-pinned cues: click1 = HOME dip fragment (-3->root), click2 = rising fragment, click3 = FULL motif in full ensemble resolving to a held tonic under the drain; strips to solo celesta at MASTER.drainEnd; the S1 sepia statement returns as the bedroom lullaby under the end card' },
]

// Bar/beat grid helpers. b(section, bar, beat) -> absolute film seconds of that
// beat (bar 0 beat 0 = the section downbeat). Never hand-add delays to these.
const SECT = {}
for (const s of SECTIONS) SECT[s.name] = s

export const b = (name, bar, beat = 0) => {
  const s = SECT[name]
  return s.t0 + ((bar * s.beats + beat) * 60) / s.bpm
}
export const barSec = (name) => (SECT[name].beats * 60) / SECT[name].bpm
export const beatSec = (name) => 60 / SECT[name].bpm

// ---------- motifs (original; MIDI offsets from a root; quote nothing) ----------
// HOME: rise to the major third, lean back through the second, then the
// fingerprint — a dip BELOW the root (the homesick note) before returning.
// WITCH cackle: a wiggle up, a wiggle down, a flat drop (the "wig fall").
// FLOZ fanfare: a bright triadic rip that answers the cackle every time.
export const HOME_ROOT = 69    // A4 — celesta/lullaby register
export const HOME = [0, 4, 2, -3, 0]
export const WITCH_ROOT = 57   // A3 — cackle register, mid-low menace
export const WITCH = [0, 1, 0, -1, -5]
export const FLOZ_ROOT = 65    // F4 — bright triadic fanfare register
export const FLOZ = [0, 4, 7, 12]
export const motif = (name, root) =>
  (name === 'home' ? HOME : name === 'witch' ? WITCH : FLOZ).map((k) => root + k)

// ---------- named cue anchors (all clock-derived; score.js adds nothing by hand) ----------
export const CUES = {
  kansas: T.kansas,                                 // 0     lullaby-waltz in
  funnel: MASTER.funnel,                            // 4.5   wind rises (E2)
  lift: MASTER.lift,                                // 8.0   roar swallows the mix (E3)
  transform: MASTER.transform,                      // 14.2  first WITCH cackle (E4)
  thud: MASTER.thud,                                // 17.2  impact pin (E5)
  burst: MASTER.burst,                              // 20.0  FLOZ fanfare ON the cut frame (E6)
  march: MASTER.march,                              // 21.6  munchkin march (E7)
  slippers: MASTER.slippers,                        // 24.2  cackle->fanfare answer (E8b)
  witchSmoke: MASTER.witchSmoke,                    // 25.4  smoke puff sting (E9)
  road: T.brickroad,                                // 30    walking tune in
  lion: MASTER.lion,                                // 36.8  last join completes the round (E10c)
  poppyDrop: MASTER.poppyDrop,                      // 44.3  line drops, half-speed (E11)
  snow: MASTER.glindaSnow,                          // 45.5  tempo re-inflates (E11b)
  doom: MASTER.doom,                                // 53.7  organ doom takes over (E13)
  monkeys: MASTER.monkeyDive,                       // 61.5  dive V (E14b)
  hourglass: MASTER.hourglass,                      // 64.0  tick pulse begins
  melt: MASTER.melt,                                // 72.5  WITCH motif slides down (E16b)
  kneel: MASTER.kneel,                              // 76.1  triumph brass (E17b)
  curtainTug: MASTER.curtainTug,                    // 80.4  music box crank (E18)
  tokens: MASTER.tokens,                            // 85.4  three gift chimes = HOME 1-2-3 (E19)
  balloonSlips: MASTER.balloonSlips,                // 88.0  deflating string gag (E20)
  click1: MASTER.click1,                            // 93.2  HOME dip fragment (E21a)
  click2: MASTER.click2,                            // 94.6  rising fragment (E21b)
  click3: MASTER.click3,                            // 96.0  FULL motif resolves (E21c)
  drain: MASTER.drainStart,                         // 97.6  strips to solo celesta (E22)
  tripleTake: MASTER.tripleTake,                    // 99.0  bedroom lullaby (E23)
  endCard: MASTER.endCard,                          // 102.0 button, done (E24)
}

// ---------- CAST (casting.md decision table, pasted verbatim; ids verified, never guessed) ----------
const CAST = {
  // role:            [id,  src,   understudy]
  dot:                [12,   'near', 298],   // mask sliver (38,1)-(74,44) #a3872a
  flowto:             [62,   'far',  135],   // draw 0.35x, brown fur repaint
  glinda:             [2577, 'near', 86],    // pink gown + procedural bubble
  witch:              [1445, 'near', 3363],  // B; green skin, black dress, procedural hat+wig
  wizard:             [1264, 'near', 1856],  // B; mustache native; giant head = procedural (heads cell 928,288)
  scarecrow:          [30,   'near', 120],   // straw repaint, procedural hat
  tinman:             [76,   'near', 84],    // chrome repaint; pill print -> heart-meter
  lion:               [18,   'near', 109],   // fur+mane repaint; muscle torso is a PRINT
  monkey1:            [5,    'far',  834],   // B; procedural wings
  monkey2:            [233,  'far',  834],   // B; bullseye print mirror-safe
  monkey3:            [129,  'far',  834],   // B; black tee, grin
  guard1:             [4187, 'near', 2132],  // B; grey armor + procedural spear
  guard2:             [3140, 'near', 2132],  // B; twin guard
  munchkin1:          [33,   'far',  620],   // flower hat procedural
  munchkin2:          [87,   'far',  620],
  munchkin3:          [96,   'far',  620],
  munchkin4:          [14,   'far',  620],
  eastFeet:           [482,  'near', 1217],  // B; feet crop y90-116, native ruby #d83838
}
export { CAST }
// u = understudy id (casting.md). Hair = heroes (dot/flowto/glinda/trio/munchkins),
// bald = Cabald (witch/wizard/monkeys/guards/eastFeet) — lore rule, verified B flags.

// ---------- repaint ramp tables (ghoul pattern: per-id zones, pairs = [shadow, light]) ----------
// One transform per actor family in prepare(), driven by these tables — never
// hand-author per-actor variants. Every repaint returns { ...R, c, sil } so the
// pose rig survives. DOT additionally masks the sliver bbox then keeps the
// largest connected component.
export const REPAINT = {
  12:   { dress: ['#27499c', '#3b6fd4'], apron: '#f5eee0', hair: '#9c8942', slippers: ['#b83838', '#d83838'], sliverMask: [38, 1, 74, 44], sliverFill: '#a3872a' }, // DOT gingham
  62:   { fur: ['#4a3220', '#6b4a2f'], muzzle: '#c9a37a', nose: '#2a1d16' },                                            // FLOWTO brown fur
  2577: { gown: ['#d987ad', '#f2b8cf'], trim: '#ffcc2e' },                                                              // GLINDA pink ball-gown
  1445: { skin: ['#3f6b36', '#6fae5c'], dress: ['#0c0c10', '#17171c'], sash: '#6b5541', hat: '#0c0c10', buckle: '#c9c9c9' }, // WICKED WITCH of the Shed
  1264: { coat: ['#14161c', '#23262e'], shirtfront: '#f0ece2', beard: '#e8e4da', headCell: [928, 288], headK: [12, 16], ember: '#ff9a3c', glow: ['#ff6a1e', '#ffc23c'] }, // WIZARD + GIANT HEAD spec
  30:   { coat: ['#8a6a38', '#b98e4e'], straw: '#e3c268', hat: '#d9b356', rope: '#a5854e' },                            // SCARECROW burlap
  76:   { chrome: ['#5f6b78', '#cfd6de'], mid: '#9aa6b2', cap: '#b9c2cc', rivets: '#e8edf2', plate: '#d8dee6', heart: '#c23b4a' }, // TIN MAN + heart-meter
  18:   { fur: ['#96662f', '#c98f4e'], mane: '#8a5a28' },                                                               // COWARDLY LION
  5:    { fur: '#8a7a66' },                                                                                             // MONKEY 1 fur tint
  233:  { fur: '#6b5d4c' },                                                                                             // MONKEY 2 fur tint
  129:  { fur: '#55483c' },                                                                                             // MONKEY 3 fur tint
  4187: { armor: ['#59636e', '#8b95a2'] },                                                                              // WINKIE GUARD 1
  3140: { armor: ['#59636e', '#8b95a2'] },                                                                              // WINKIE GUARD 2
  33:   { petal: '#ffcc2e' },                                                                                           // MUNCHKIN 1 flower hat
  87:   { petal: '#f2b8cf' },                                                                                           // MUNCHKIN 2
  96:   { petal: '#8fd460' },                                                                                           // MUNCHKIN 3
  14:   { petal: '#ff8a8a' },                                                                                           // MUNCHKIN 4
  482:  { ruby: ['#b83838', '#d83838'], stockings: ['#4a3b6b', '#c9b45a'] },                                            // EAST feet, native ruby
}
// Shared repaint constants (casting.md). The WIG is a separate procedural prop
// (never baked onto the witch) so it can smolder, float and be chased.
export const REPAINT_SHARED = {
  wig: ['#5a2a18', '#7a3b24'],      // auburn wig mass, light/shadow
  wingMembrane: '#e8e2d4',          // monkey wings are procedural (arms-out ids rejected)
  wingRib: '#b9b2a0',
  spearShaft: '#6b4a2f',
  spearHead: '#cfd6de',
  sparkle: ['#ffe3e3', '#ff9aa2'],  // slipper sparkle ramp
  bubbleRim: '#cfe9ff',             // Glinda bubble rim @ 35%, highlight pure white
  rampOrder: 'pairs are [shadow, light] — ghoul-style mix(dark, light, L)',
}

// ---------- screen flashes: [absoluteT, peak, decay] — peaks <= .24, decay <= .2 ----------
// SEPIA scenes (kansas, twister, growth tail after drainEnd) cap at 0.13 — sepia
// mid-tones grey out above ~0.3, house keeps well under. Big moments read as
// in-scene radial glow; the burst at 20.0 is the one full-frame white hit.
export const FLASHES = [
  [TWISTER.abs(TWISTER_EV.transform), 0.13, 0.08], // sepia — the 1-frame transform flash (gag 5)
  [TWISTER.abs(TWISTER_EV.thud), 0.1, 0.08],       // sepia — thud dust kick
  [FLOZBURST.abs(FLOZBURST_EV.burst), 0.24, 0.18], // THE Technicolor burst
  [FLOZBURST.abs(FLOZBURST_EV.slippers), 0.14, 0.1], // sparkle trail glint
  [EMERALD.abs(EMERALD_EV.doom), 0.18, 0.12],      // fire pylons boom
  [EMERALD.abs(EMERALD_EV.wink), 0.12, 0.06],      // glitch-wink frames
  [GROWTH.abs(GROWTH_EV.click3), 0.2, 0.14],       // the resolve, full ensemble
]
export const flashK = (t) => {
  let k = 0
  for (const f of FLASHES) if (t >= f[0]) k = Math.max(k, f[1] * Math.exp(-(t - f[0]) / f[2]))
  return k
}

// ========================= SELF-CHECK =========================
// The numeric self-check is the commented script block between the markers below.

// BEGIN SELF-CHECK (numeric invariants; pure read-only assertions over the exports)
// import * as TL from 'file:///Users/z80/dev/remyboysfrontend/films/wizard-of-floz/timeline.js'
//
// const fails = []
// const ok = (cond, msg) => { if (!cond) fails.push(msg) }
//
// // 1. shots tile [0, DUR) exactly
// let prev = 0
// for (const s of TL.SHOTS) {
//   ok(s.t0 === prev, 'shots: gap/overlap before ' + s.name + ' (t0 ' + s.t0 + ', expected ' + prev + ')')
//   ok(s.t1 > s.t0, 'shots: ' + s.name + ' non-positive length')
//   prev = s.t1
// }
// ok(prev === TL.DUR, 'shots: last t1 ' + prev + ' != DUR ' + TL.DUR)
// ok(TL.DUR === 104, 'DUR ' + TL.DUR + ' != 104')
// const shotOf = (t) => TL.SHOTS.find((s) => t >= s.t0 && t < s.t1)
//
// // 2. per-shot EV values: finite, inside the shot, non-decreasing
// const EVS = {
//   kansas: TL.KANSAS_EV, twister: TL.TWISTER_EV, flozburst: TL.FLOZBURST_EV,
//   brickroad: TL.BRICKROAD_EV, poppies: TL.POPPIES_EV, emerald: TL.EMERALD_EV,
//   monkeys: TL.MONKEYS_EV, melt: TL.MELT_EV, curtain: TL.CURTAIN_EV, growth: TL.GROWTH_EV,
// }
// for (const [name, ev] of Object.entries(EVS)) {
//   const shot = TL.SHOTS.find((s) => s.name === name)
//   ok(shot, 'EV table ' + name + ' has no matching shot')
//   if (!shot) continue
//   const len = shot.t1 - shot.t0
//   let last = -Infinity
//   for (const [k, v] of Object.entries(ev)) {
//     ok(typeof v === 'number' && Number.isFinite(v), 'EV ' + name + '.' + k + ' not a finite number')
//     ok(v >= 0, 'EV ' + name + '.' + k + '=' + v + ' negative')
//     ok(v <= len, 'EV ' + name + '.' + k + '=' + v + ' past ' + name + ' end (len ' + len + ')')
//     ok(k === 'cut' || k === 'end' || v < len, 'EV ' + name + '.' + k + '=' + v + ' not strictly inside ' + name)
//     ok(v >= last, 'EV ' + name + '.' + k + '=' + v + ' out of order (after ' + last + ')')
//     last = v
//   }
// }
//
// // 3. clocks: no stops anywhere; abs(g) === t0 + g exactly
// const CLKS = {
//   kansas: TL.KANSAS, twister: TL.TWISTER, flozburst: TL.FLOZBURST, brickroad: TL.BRICKROAD,
//   poppies: TL.POPPIES, emerald: TL.EMERALD, monkeys: TL.MONKEYS, melt: TL.MELT,
//   curtain: TL.CURTAIN, growth: TL.GROWTH,
// }
// ok(TL.STOPS.length === 0, 'STOPS must be empty (story declares no hit-stops)')
// for (const [name, C] of Object.entries(CLKS)) {
//   ok(C.stops.length === 0, 'clock ' + name + ' carries stops')
//   ok(C.t0 === TL.T[name], 'clock ' + name + '.t0 != T.' + name)
//   for (const g of [0, 1.7, 4.2, 7.9]) ok(C.abs(g) === C.t0 + g, 'clock ' + name + '.abs(' + g + ') != t0+g')
// }
//
// // 4. MASTER: every value = t0 + one EV of the shot containing it...
// for (const [k, v] of Object.entries(TL.MASTER)) {
//   const s = shotOf(v)
//   ok(s, 'MASTER.' + k + '=' + v + ' outside the film')
//   if (!s) continue
//   const ev = EVS[s.name]
//   ok(Object.values(ev).some((g) => Math.abs(s.t0 + g - v) < 1e-9),
//     'MASTER.' + k + '=' + v + ' is not t0+EV of ' + s.name)
// }
// //    ...plus the exact hand-derived E-table anchors (story nominals + documented retime)
// const E = {
//   titleSettle: 2.2, subtitleSettle: 3.6, funnel: 4.5, chickens: 4.7, lift: 8.0,
//   flybyStart: 11.5, transform: 14.2, drop: 16.2, thud: 17.2, dustBlack: 17.6,
//   sliver: 19.7, burst: 20.0, burstSettled: 21.0, march: 21.6, glinda: 23.0,
//   slippers: 24.2, witchSmoke: 25.4, scarecrow: 32.5, tinman: 34.5, lion: 36.8,
//   chantLead: 37.8, poppyDrop: 44.3, glindaSnow: 45.5, signGag: 48.8, horse: 50.5,
//   throne: 52.5, doom: 53.7, faint: 56.5, tiptoe: 58.0, glitchWink: 59.3,
//   skywriting: 60.3, monkeyDive: 61.5, captured: 63.7, hourglass: 64.0,
//   hourglassLine: 65.5, monkeyDefects: 68.1, bucket: 71.7, melt: 72.5,
//   wigFloat: 75.1, kneel: 76.1, stutter: 79.2, curtainTug: 80.4, curtainPeel: 81.2,
//   curtainLine: 81.6, tokens: 85.4, balloon: 87.4, balloonSlips: 88.0, signWave: 88.6,
//   click1: 93.2, click2: 94.6, click3: 96.0, drainStart: 97.6, drainEnd: 98.8,
//   tripleTake: 99.0, redWink: 101.8, endCard: 102.0, tease: 102.4,
// }
// for (const [k, v] of Object.entries(E)) {
//   ok(TL.MASTER[k] === v, 'MASTER.' + k + ' = ' + TL.MASTER[k] + ', E-table expects ' + v)
// }
//
// // 5. captions: inside their shot, y <= captionYMax, hold arithmetic, no lane collisions
// const laneOf = (y) => (y === 540 ? 'title' : y === 660 ? 'sub' : y === 430 ? 'kicker' : y === 780 ? 'tease' : 'main')
// for (const c of TL.CAPTIONS) {
//   ok(c.id, 'caption missing id')
//   const s = shotOf(c.t0)
//   ok(s, 'caption ' + c.id + ' t0 ' + c.t0 + ' outside the film')
//   if (!s) continue
//   ok(c.t1 <= s.t1 + 1e-9, 'caption ' + c.id + ' t1 ' + c.t1 + ' crosses the ' + s.name + ' cut at ' + s.t1)
//   ok(c.t1 > c.t0, 'caption ' + c.id + ' empty window')
//   ok(c.in >= 0 && c.out >= 0 && c.in + c.out < c.t1 - c.t0, 'caption ' + c.id + ' bad in/out rides')
//   ok(c.y <= TL.SAFE.captionYMax, 'caption ' + c.id + ' y ' + c.y + ' > SAFE.captionYMax')
//   const vis = (c.t1 - c.out) - (c.t0 + c.in)
//   if (c.minHold !== undefined) ok(vis >= c.minHold - 1e-9, 'caption ' + c.id + ' visible hold ' + vis.toFixed(2) + ' < minHold ' + c.minHold)
//   else ok(vis >= 3 - 1e-9, 'caption ' + c.id + ' visible hold ' + vis.toFixed(2) + ' < 3')
// }
// const CHAIN = ['c12_click1', 'c13_click2', 'c14_click3', 'c15_andyou']
// const byLane = {}
// for (const c of TL.CAPTIONS) {
//   const lane = laneOf(c.y)
//   if (!byLane[lane]) byLane[lane] = []
//   byLane[lane].push(c)
// }
// for (const [lane, caps] of Object.entries(byLane)) {
//   caps.sort((a, b) => a.t0 - b.t0)
//   for (let i = 0; i + 1 < caps.length; i++) {
//     const a = caps[i]
//     const nxt = caps[i + 1]
//     ok(a.t1 <= nxt.t0 + 1e-9, 'lane ' + lane + ': ' + a.id + ' overlaps ' + nxt.id)
//     const gap = nxt.t0 - a.t1
//     const chained = CHAIN.indexOf(nxt.id) === CHAIN.indexOf(a.id) + 1 && CHAIN.includes(a.id)
//     if (chained) ok(gap === 0, 'chain: ' + a.id + ' -> ' + nxt.id + ' gap ' + gap + ' != 0 (must touch)')
//     else if (lane === 'main') ok(gap >= 0.9 - 1e-9, 'main lane: gap ' + a.id + ' -> ' + nxt.id + ' = ' + gap.toFixed(2) + ' < 0.9')
//   }
// }
// //    chant pills: verbatim x3, contiguous, declared window legs, escalating anims
// const pills = CHAIN.slice(0, 3).map((id) => TL.CAPTIONS.find((c) => c.id === id))
// const LEGS = [1.8, 1.8, 2.2]
// const ANIMS = ['fade', 'line', 'rise']
// pills.forEach((p, i) => {
//   ok(p, 'missing chant pill ' + CHAIN[i])
//   if (!p) return
//   ok(p.text === "THERE'S NO PLACE LIKE GROWTH.", 'pill ' + p.id + ' text not verbatim')
//   ok(Math.abs(p.t1 - p.t0 - LEGS[i]) < 1e-9, 'pill ' + p.id + ' window leg ' + (p.t1 - p.t0).toFixed(2) + ' != declared ' + LEGS[i])
//   ok(p.anim === ANIMS[i], 'pill ' + p.id + ' anim ' + p.anim + ' != ' + ANIMS[i])
//   ok(p.y === 868, 'pill ' + p.id + ' must sit in the main lane y868')
// })
// ok(pills[0].t1 === pills[1].t0 && pills[1].t1 === pills[2].t0, 'chant chain not contiguous')
// const c15 = TL.CAPTIONS.find((c) => c.id === 'c15_andyou')
// ok(c15.t0 === pills[2].t1, 'C15 must start exactly at C14 out (touching, not overlapping)')
//
// // 6. mandated lines verbatim (straight apostrophes, U+2014 em-dash, exact punctuation)
// const MANDATED = {
//   c3_pretty: "I'LL GET YOU, MY PRETTY —\nAND YOUR LITTLE HAIR TOO!",
//   c5_ohmy: 'LIONS AND TIGERS AND BALDS, OH MY!',
//   c6_wig: "BRING ME THE WITCH'S WIG!",
//   c8_time: "THAT'S HOW MUCH TIME YOU HAVE LEFT,\nMY PRETTY.",
//   c9_melting: "I'M MELTING! WHAT A WORLD, WHAT A WORLD!",
//   c11_curtain: 'PAY NO ATTENTION TO THE BALD MAN\nBEHIND THE CURTAIN!',
// }
// for (const [id, want] of Object.entries(MANDATED)) {
//   const c = TL.CAPTIONS.find((x) => x.id === id)
//   ok(c && c.text === want, id + ' text drifts from the mandated line')
// }
// const t2 = TL.CAPTIONS.find((c) => c.id === 't2_motto')
// ok(t2 && t2.text === "THERE'S NO PLACE LIKE GROWTH", 'T2 must keep the no-period motto styling')
//
// // 7. SECTIONS tile the film, one per shot, in order, with a usable grid
// ok(TL.SECTIONS.length === TL.SHOTS.length, 'SECTIONS count != SHOTS count')
// TL.SECTIONS.forEach((sec, i) => {
//   const s = TL.SHOTS[i]
//   ok(sec.t0 === s.t0 && sec.t1 === s.t1, 'section ' + sec.name + ' does not match shot ' + s.name)
//   ok(sec.bpm > 0 && sec.beats > 0, 'section ' + sec.name + ' bad grid')
// })
// for (const sec of TL.SECTIONS) {
//   ok(TL.barSec(sec.name) > 0 && TL.beatSec(sec.name) > 0, 'grid helpers broken for ' + sec.name)
//   ok(Math.abs(TL.b(sec.name, 1) - (sec.t0 + TL.barSec(sec.name))) < 1e-9, 'b() downbeat math broken for ' + sec.name)
// }
//
// // 8. CUES land inside shots and on t0+EV values
// for (const [k, v] of Object.entries(TL.CUES)) {
//   const s = shotOf(v)
//   ok(s, 'CUE ' + k + '=' + v + ' outside the film')
//   if (!s) continue
//   ok(Object.values(EVS[s.name]).some((g) => Math.abs(s.t0 + g - v) < 1e-9), 'CUE ' + k + '=' + v + ' is not t0+EV of ' + s.name)
// }
//
// // 9. flashes: budget caps; sepia scenes (incl. the growth tail) cap at 0.13
// for (const [t, peak, decay] of TL.FLASHES) {
//   ok(peak <= 0.24 && decay <= 0.2, 'flash at ' + t + ' over budget (peak ' + peak + ', decay ' + decay + ')')
//   const s = shotOf(t)
//   const sepia = s && (s.name === 'kansas' || s.name === 'twister' || (s.name === 'growth' && t >= TL.MASTER.drainEnd))
//   if (sepia) ok(peak <= 0.13, 'flash at ' + t + ' in sepia over 0.13 (peak ' + peak + ')')
// }
// ok(TL.flashK(0) === 0, 'flashK before any flash must be 0')
//
// // 10. determinism + repaint table sanity (code only — strip line comments first)
// const fs = await import('node:fs')
// const raw = fs.readFileSync('/Users/z80/dev/remyboysfrontend/films/wizard-of-floz/timeline.js', 'utf8')
// const src = raw.replace(/\/\/.*$/gm, '')
// ok(!/Math\.random|Date\.now|new Date\(/.test(src), 'source contains nondeterminism')
// ok(TL.CAST.dot[0] === 12 && TL.CAST.witch[0] === 1445 && TL.CAST.eastFeet[0] === 482, 'CAST ids must match casting.md')
// ok(TL.REPAINT[1445].skin[0] === '#3f6b36' && TL.REPAINT_SHARED.wig[1] === '#7a3b24', 'witch repaint hexes drifted')
//
// if (fails.length) {
//   console.error('SELF-CHECK FAILED (' + fails.length + '):')
//   for (const f of fails) console.error('  - ' + f)
//   process.exit(1)
// }
// console.log('SELF-CHECK OK: ' + TL.SHOTS.length + ' shots tile [0, ' + TL.DUR + '], ' +
//   TL.CAPTIONS.length + ' captions, ' + TL.SECTIONS.length + ' sections, ' +
//   Object.keys(TL.MASTER).length + ' master events, ' + TL.FLASHES.length + ' flashes, ' +
//   Object.keys(TL.CUES).length + ' cues')
// END SELF-CHECK
//
// Run it with (from the repo root; the [-] class keeps this doc line from
// re-triggering the marker match):
//
//   awk '/BEGIN SELF[-]CHECK/{f=1;next} /END SELF[-]CHECK/{f=0} f' \
//     films/wizard-of-floz/timeline.js | sed 's|^// ||' > /tmp/floz-check.mjs && node /tmp/floz-check.mjs
