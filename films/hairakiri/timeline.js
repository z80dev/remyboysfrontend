// HAIRAKIRI — Year of the Razor Decade. Cue sheet + choreography: the single
// shared source of truth that picture (art.js/film.js) AND score (score.js)
// both import. 96 s, 1920x1080 @60fps, 2D filmkit full-res painted stage
// (pirates-cabald / wizard-of-floz lineage), letterbox 0.8, first jidaigeki in
// the catalog: sumi-e / ukiyo-e woodblock, rain as a character, diagonal sumi
// brush-stroke wipes between acts, one ENSO iris out. All pure functions of
// time (no Math.random, no Date, no state carried between frames).
//
// CUE-SHEET CONTRACT: picture and score schedule NOTHING by hand. Every beat
// lives in a per-shot EV table in shot-local WORLD seconds; film-absolute time
// is CLOCK.abs(g) only — MASTER below is derived through the clocks, never
// hand-added. score.js consumes SECTIONS (per-act grids), CUES (named
// anchors), the FLOW motif constants, and the MA / WIGSPLIT / EYEBROW / ENSO
// signature specs; film.js consumes T, SHOTS, CAPTIONS, WIPES / HARD_CUTS,
// FLASHES, SAFE and CAST. If a number moves, it moves HERE first and both
// films re-derive. Story source: output/hairakiri/notes/story.md §2-§5; cast
// ids pasted from output/hairakiri/notes/casting.md into CAST.
//
// CLOCK RULE (load-bearing): exactly ONE hit-stop in the film — the S6
// ma-beat strike. STOPS = [{ g: 8.6, d: 0.35 }] on the DUEL clock, g in S6
// LOCAL world time. Consequences: (a) every OTHER shot satisfies
// abs(g) = t0 + g exactly; (b) inside S6, film = 64 + g up to the strike and
// 64.35 + g after it — which is WHY the DUEL clock exists; hand-adding is
// forbidden there, resolve with DUEL.abs(g); (c) an event scheduled AT the
// stop's g lands at the freeze START (filmT uses strict <): the biwa pluck +
// 2-frame white flash land at film 72.60, the freeze runs to 72.95, and any
// RESUMED interval at world g8.6 must add the 0.35 explicitly
// (MASTER.land = DUEL.abs(strike) + STOPS[0].d; SKILL.md:125). S5's three
// paddy impacts are DRAWN freezes (world holds via velocity-0 lerp; spark /
// shake / rain run real time) — the clock is NOT warped there. makeClock is
// copied verbatim from pirates/wizard for structural parity.
//
// Deviations from story.md nominal numbers (screenplay agent owns exact
// numbers; story grants +-0.5 s per shot with the S4/S5 tails as trim donors
// — NO retimes taken: the nominal tiling 10/12/16/11/15/19/13 = 96.0 meets
// every house check, so the donors go unspent. DUR = 96.0 IS the last cut:
// shots tile [0, 96) exactly):
//   1. END SLATE -0.1 s: story holds E2 "to the last frame" (96.0); house
//      lint wants the slate gone >= 0.1 s before DUR (wizard 103.9/104,
//      pirates 95.9/96). The WHOLE E1->E2 chain moves 90.4/93.4/96.0 ->
//      90.3/93.3/95.9 with internal geometry preserved exactly: E1 hold 3.0,
//      E2 leg 2.6 (the declared override), contiguous out = next in,
//      minHold 2.0 met at 2.6 visible.
//   2. T1 OUT g11.8 -> g12.0 (film 33.8 -> 34.0): story's own card
//      declaration wants T1 "padded to keep fully-visible >= 4 s", but its
//      4.6 window with the 0.4/0.4 brush rides leaves 3.8. The out-extension
//      lands visible 4.0 exactly; the title clears exactly as the giant
//      joins at g12.0 (different lanes, no collision).
//   3. S5 WIPE START g12.8 -> g13.8 (film 62.8): the beat sheet starts the
//      1.2 s big stroke at g12.8, which would end at 63.0 and strand a
//      second of "bridge" inside the village-lane shot. Story §4a and its
//      own master E20 pin the stroke COMPLETION at the 64.0 boundary; we
//      honor the invariant (BATTLE_EV.bridgeStroke = 13.8).
//   4. MASTER-TABLE CORRECTIONS: story's master column is marked "nominal"
//      and disagrees with its own §2 beat sheet in four places. EVENTS are
//      clock-derived from the beat sheet (the primary choreography):
//        E10d comic join:  table 37.4 vs beat g15.2  -> 37.2 (beat sheet)
//        E18 banner cut:   table 59.0 vs beat g9.2   -> 58.2 (beat sheet)
//        E19 messenger:    table 62.0 vs beat g12.0  -> 61.0 (beat sheet)
//        E20 bridge reveal 64.0 KEPT (via the g13.8 wipe start, see 3)
//        E34 enso draw "91.0-93.0" vs §4e sweep-to-g12.4 -> draw 91.0-95.4,
//        aperture seals 95.4 (§4e is the signature spec; the §3 dagger's
//        conditional enso shortening is NOT taken — no trim happened).
//   5. S6 OFFERING / PLUCK-4 overlap kept verbatim: story puts the offering
//      at g14.8 but pass 4's pluck at g14.95 (12.4 + 3x0.7 + 0.45). That is
//      story's own arithmetic (§2 vs §4d); the EV table lists offering
//      before pluck4 and film.js stages the lay-down as the last arc lands.
//   6. CAPTION SPEC RECONCILIATIONS: §2/§4e say "E1 in g9.0" but §3's
//      caption table (the binding spec, self-consistent with E2) says
//      7.4-10.4 — we follow §3 and read g9.0 as the circle closing to frame
//      the card. Two-line main-lane pill C2 rides y878 / size 38 (wizard
//      house pattern for two-liners); story's y868 is kept for single-line
//      rows. Both sit at or under SAFE.captionYMax 915.
//   7. INTERTITLES: per story §3's card declaration every row except T1 is
//      anim 'cut' with in 0 / out 0 — window == fully-visible hold, so the
//      >= 3 s rule is checkable at a glance. T1 keeps its brush rides
//      (in 0.4 / out 0.4; the underline draw is picture-side, see
//      TITLE_UNDERLINE). No film-wide grid: the cuts are not on one uniform
//      bar — each score section carries its own grid.

export const DUR = 96

// ---------- shot map (film seconds; contiguous, covers [0, 96) exactly) ----------
// CUTS:  0       10       22       38       49       64       83       96
export const T = {
  province: 0,   // S1 YEAR OF THE RAZOR DECADE (prologue)  0-10    (10.0)
  raid: 10,      // S2 the raid                             10-22   (12.0)
  ronin: 22,     // S3 the ronin (recruitment)              22-38   (16.0)
  training: 38,  // S4 training                             38-49   (11.0)
  battle: 49,    // S5 night battle                         49-64   (15.0)
  duel: 64,      // S6 the duel (ONE hit-stop)              64-83   (19.0 film = 18.65 world + 0.35 stop)
  resolve: 83,   // S7 resolution + ENSO iris               83-96   (13.0)
}

export const SHOTS = [
  { name: 'province', t0: T.province, t1: T.raid,     desc: 'Slow push 1.0->1.08 on the valley, settle low to the mud. g0.0 ink-wash FLOWAGAWA wide, rain in sheets, brush-stroke clouds crawl (farmer 1140 far); g1.0 K1 in; g3.0 TENDER: farmer 1140 ties daughter (child rig 1020) her first topknot, wooden comb held two-fists like a sword; g4.6 CABALD TAX BANNER unrolls down the watchtower (tax captain 1926, procedural pole + crest), whip crack; g5.8 low angle: shaved farmer 1140 kneels in the mud clutching the severed topknot two-fists, one strand escapes on the wind; g7.2 torchlight crests the ridge, riders as ink blots (bandits 4187/23/159 far), taiko enters; g9.4 wipe out. WIPE to S2: ONE diagonal sumi stroke UL->LR, 0.6 s (WIPES s1s2)' },
  { name: 'raid',     t0: T.raid,     t1: T.ronin,    desc: 'Lateral scroll L->R, torch vermillion on indigo rain, one coherent torch per angle. g0.0 wipe-in: riders 4187/23/159 walk horses down the lane, torches hissing; g0.8 C1 in; g4.0 the shear line: villagers kneel (crowd pool 3966/312/83/682 far + heads atlas), hooked razor pass = one snip + 1-frame white glint each; g5.4 SLOW-MO knot falls, drawn 0.4x, NO clock stop, past the torch beams; g6.6 flat puddle splash; g7.0 GAG/TENDER: grandmother 2186 hides the child topknot under the pot lid and sips tea deadpan while bandit 23 pokes the hearth, lid wobbles exactly once; g9.4 child 1020 stares into the dark, rain beading on the shaved head; g10.8 banner pinned to the gate (captain 1926), rain harder; g11.6 thunder builds. OUT: HARD CUT at 22.0 ON the thunderclap, rain direction matches across; never a wipe or crossfade here (HARD_CUTS.s2s3)' },
  { name: 'ronin',    t0: T.ronin,    t1: T.training, desc: 'Locked-wide Kurosawa stillness at the mochi stand (ronin 42 in straw mino, vendor 320 duck-hood), then quick 1.2x push-ins per recruit; recruits gate in offscreen (g >= enter time). g0.0 HARD CUT in on the clap: 42 eating mochi, unimpressed, steam off the plate; g3.6 elder 960 begs hands-to-mud, 42 holds up ONE finger and takes another bite; g4.4 pot lid lifts: child 1020 shaved (procedural bald-cap) — the S2 image returned; g5.8 42 STOPS CHEWING mid-bite, one rice grain falls (smallest sound in the film); g7.0 he STANDS, mino sheds one sheet, FLOW motif first statement koto solo; g7.2 T1 HAIRAKIRI drops, underline draws beneath, out g12.0; g12.0 giant 3627 joins, ducks the torii, laundry-pole naginata; g13.2 twin 2620 joins on her shaved-into-a-stool block; g14.4 veteran 2260 joins by saying nothing, fish-patch scabbard; g15.2 comic 4322 misses the barrel and stands in the hoop (the wipe runs g15.2-16.0 under the gag). WIPE to S4: TWO staggered diagonal sumi strokes UR->LL, stroke B delayed 0.18 s, 0.8 s total (WIPES s3s4)' },
  { name: 'training', t0: T.training, t1: T.battle,   desc: 'Courtyard drizzle, first warm light of the film, cherry petals as analytic particles; lateral walking-track, low angle for the domino. g0.0 wipe-in: recruits drill villagers; g0.6 PRATFALL DOMINO, villagers slip in a staggered L->R squelch wave; g2.4 comb-sweep-as-parry drill, one comb catches veteran 2260 sleeve and he permits it with a slow nod; g4.2 WAX-ON GAG: comic 4322 blocks a falling bucket with the exact lantern-polish motion and stares at his forearm; g6.4 42 taps heads scabbard-metronome, stands on a stool to reach giant 3627 (deadpan); g8.0 TENDER: 42 gives child 1020 the practice sword, two-fists grip, third time in the film; grandmother 2186 beside with the pot lid; g9.6 sunset: the band in silhouette against vermillion, blades up. WIPE to S5: THREE vertical rain-strokes T->B, 0.12 s apart, 0.7 s (WIPES s4s5)' },
  { name: 'battle',   t0: T.battle,   t1: T.duel,     desc: 'High wide over rice-bunds, lanterns doused; NO camera shake during the drawn freezes (effects move, world does not). g0.0 wipe-in: the band waits, rain like rope; g1.0 raiders 4187/23/159 (+backups 3140/3363/1926) hesitate one full beat at a field of wig scarecrows; g3.0 first charge: giant 3627 plants the pole, three riders domino into the paddy overhead, each impact a DRAWN 0.12 s spark-freeze (clock NOT warped); g4.4 twin 2620 slices the collection sacks, TOPKNOTS RAIN BACK onto upturned faces, villagers catch their own mid-air; g6.0 ink-slash 2-frame white strokes over exchanges; g6.8 CLOSE CALL: razor-shuriken shears veteran 2260 sleeve clean off, he ties the other with his teeth; g7.4 comic 4322 trips the basket, flailing scabbard drops three raiders down the well, plink plink plink, bows to it; g9.2 42 cuts the banner down, the raid folds; g10.6 farmer 1140 reties his topknot with shaking hands and it holds; g12.0 one raider sprints for the bridge, 42 does not chase; g13.8 wipe out. WIPE to S6: ONE full-frame L->R stroke, 1.2 s, the biggest in the film, completing exactly at 64.0 (WIPES s5s6)' },
  { name: 'duel',     t0: T.duel,     t1: T.resolve,  desc: 'Bridge at Sanogawa; straight-on wide, ONE push 1.0->1.06, ZERO cuts after C2 clears; warlord 3360 already on the arch, oni mask, razor-no-dachi across the shoulders; one lantern is the only warm pixel. ALL film times via DUEL.abs(g) — the stop shifts every post-strike event. g0.0 big stroke clears; g0.6 C2 in, out g4.2; g4.2 standoff: 42 steps onto the near end; g6.4 FORESHADOW: the warlord hair does not move in the wind plastering everything else; g6.7 mix-out begins; g7.0 MA IN, rain-only to g8.6; g8.6 ONE biwa pluck + 2-frame white flash + HIT-STOP 0.35 s (the ONLY stop: blades crossed mid-exchange, wig mid-slip; flash/spark/rain run REAL time through the freeze); resume world g8.6: the pass-through exchange lands, lantern out g9.6; g10.0 WIG SPLITS, curtain halves +/-90 px and -/+10 deg over 0.45 s, wet scalp lighthouse glint 0.5 s, shogun crest inside the lining 0.4 s; g11.0 mask lifts, a bare almost gentle face scans for witnesses, child 1020 at the bridge foot pot lid and all; g11.8 he pats his own scalp twice, nothing left to shave; g12.2 kneels, small razor from the saya; g12.4-14.5 THE EYEBROW HAIRAKIRI: four 0.7 s-apart passes, plucks at +0.45 each, ONE polite thunder per pass; g14.8 four brows laid on the blade flat; g15.0 THE BOW, 35 deg over 0.4 s held 0.4, child bows back at the deepest point; g15.6 C3 in hard, out g18.65. OUT: HARD CUT at 83.0, clean; the regrowth stroke lives on S7 (HARD_CUTS.s6s7)' },
  { name: 'resolve',  t0: T.resolve,  t1: DUR,        desc: 'Crane-up as the sun breaks; lateral wheat-level track; long-lens stillness for the mist walk. g0.0-0.8 REGROWTH WIPE: one upward stroke B->T gold-tipped like a sprout, drawn on THIS clock (WIPES s6s7); g1.0 sun cracks the clouds, the light source changes hands; g1.4 C4 in, out g4.6; g2.0 comb ritual wave L->R, topknots re-tie in sequence, farmer 1140 hands steady now; g4.8 child 1020 runs the wheat row, pot lid as helmet, sword up; g6.2 42 at the field edge flips one mochi to the child (S3 symmetry), caught two-fists, bow; g7.0 he walks INTO the mist, mino shedding light instead of rain; g7.3 E1 in inside the forming circle, out g10.3; g8.0 ENSO draws, one clockwise stroke, 320 deg by g12.4, 40 deg aperture on the walker; g10.3 E2 in as the stroke closes, out g12.9; g12.4 aperture seals to the tail-lift; FLOW motif held under both cards. OUT: ENSO IRIS, the only iris in the film, to black on the held tonic' },
]

// ---------- shot clocks: copied verbatim from films/pirates-cabald/timeline.js ----------
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

// STOPS — every hit-stop in the film (g = world time the freeze STARTS, in S6
// LOCAL time). The single entry lives on the S6 duel clock and maps inside
// that shot: filmT(8.6) = 8.60 -> film 72.60, shot real length 19.0, world
// length 18.65. World g8.6 resumes at film 72.95 (add d explicitly, see
// MASTER.land).
export const STOPS = [
  { g: 8.6, d: 0.35 }, // HIT-STOP: ma-beat strike — biwa pluck + 2-frame flash, blades crossed, wig mid-slip (story E22)
]

// One clock per shot. Only DUEL carries stops; the rest satisfy abs(g) = t0 + g
// exactly, so score/picture never hand-add t0 + g anywhere.
export const PROVINCE = makeClock(T.province)
export const RAID     = makeClock(T.raid)
export const RONIN    = makeClock(T.ronin)
export const TRAINING = makeClock(T.training)
export const BATTLE   = makeClock(T.battle)
export const DUEL     = makeClock(T.duel, STOPS)
export const RESOLVE  = makeClock(T.resolve)

// ---------- per-shot events (g = shot-local WORLD seconds; use CLOCK.abs(g) for film time) ----------
// S1: prologue — dread played quiet; the province as something worth losing.
export const PROVINCE_EV = {
  wide: 0.0,        // ink-wash valley wide, rain in sheets, brush clouds crawl
  k1In: 1.0,        // K1 card in (story K1 window 1.0-4.6)
  tender: 3.0,      // farmer ties daughter her first topknot; comb two-fists (grip rhyme 1)
  banner: 4.6,      // CABALD TAX BANNER unrolls, whip crack (story E2; K1 out)
  kneel: 5.8,       // shaved farmer kneels, strand escapes (story E3; grip rhyme 2)
  riders: 7.2,      // torchlight crests the ridge; taiko enters under
  wipeToRaid: 9.4,  // diagonal sumi wipe begins (0.6 s, ends at the 10.0 boundary)
  cut: 10.0,        // boundary
}

// S2: the raid — menace with manners. Rider cast: 4187/23/159 (+1926 captain).
export const RAID_EV = {
  ridersIn: 0.0,     // wipe-in reveals riders walking horses down the lane
  c1In: 0.8,         // C1 card in (story C1 window 0.8-4.4)
  shearLine: 4.0,    // shear line begins: snip + 1-frame glint per pass (story E4)
  knotFall: 5.4,     // SLOW-MO topknot falls, drawn 0.4x — NO clock stop (story E5)
  knotSplash: 6.6,   // flat puddle splash ends the drawn slow-mo
  potLid: 7.0,       // grandmother hides topknot under pot lid, tea sip deadpan (story E6)
  childStare: 9.4,   // child stares into the dark, rain beading on the shaved head
  bannerPinned: 10.8,// Cabald banner pinned to the gate; rain turns harder
  thunderBuild: 11.6,// thunder builds under the mix
  cut: 12.0,         // HARD CUT on the thunderclap at exactly 22.0 (story E7)
}

// S3: the ronin — the legend is bored; a child head moves him. Late title drop.
export const RONIN_EV = {
  mochiIn: 0.0,        // HARD CUT in: 42 at the stand, chewing, unimpressed
  elderBegs: 3.6,      // elder begs hands-to-mud; ONE finger; another bite
  childReveal: 4.4,    // pot lid lifts: the shaved child head, S2 returned
  chewStop: 5.8,       // chewing stops mid-bite; one rice grain falls (story E8)
  stands: 7.0,         // 42 STANDS, mino sheds one sheet; FLOW first statement koto solo
  titleIn: 7.2,        // T1 HAIRAKIRI drops (story E9b; brush-in 0.4, underline 0.5)
  titleOut: 12.0,      // T1 out — story g11.8 extended to g12.0 for >= 4 s visible (deviation 2)
  giant: 12.0,         // SPEAR GIANT joins, ducks the torii (story E10a)
  twin: 13.2,          // TWIN-BLADE joins on the shaved stool (story E10b)
  veteran: 14.4,       // GRUMPY VETERAN falls into step, saying nothing (story E10c)
  comic: 15.2,         // COMIC joins by accident, barrel hoop (story E10d; table 37.4 corrected)
  wipeToTraining: 15.2,// two-stroke staggered wipe begins (0.8 s, ends at 38.0)
  cut: 16.0,           // boundary
}

// S4: training — montage comedy with a drill-sergeant heart. Petals arrive.
export const TRAINING_EV = {
  drillsIn: 0.0,     // wipe-in: recruits drill villagers
  domino: 0.6,       // PRATFALL DOMINO, staggered L->R squelch wave (story E11)
  combDrill: 2.4,    // comb-sweep-as-parry; the veteran permits one catch, slow nod
  waxOn: 4.2,        // wax-on gag payoff: bucket blocked with the polish motion (story E12)
  metronome: 6.4,    // scabbard-tap metronome (SETS the grid; FLOW rhythm fragments); stool for the giant
  gift: 8.0,         // TENDER: practice sword to the child, two-fists grip (story E13; rhyme 3)
  sunset: 9.6,       // band silhouetted against vermillion, blades up
  wipeToBattle: 10.3,// three vertical rain-strokes begin (0.7 s, ends at 49.0)
  cut: 11.0,         // boundary
}

// S5: night battle — wins by texture. Drawn freezes only, clock NEVER warped.
export const BATTLE_EV = {
  bandWaits: 0.0,    // wipe-in: the band waits on the lane, rain like rope
  scarecrows: 1.0,   // raiders lose a beat at the wig scarecrows (story E14)
  charge: 3.0,       // spear plant; paddy domino, DRAWN 0.12 s spark freezes (story E15)
  topknotRain: 4.4,  // twin-blade slices the sacks; TOPKNOTS RAIN BACK (story E16)
  inkSlashes: 6.0,   // 2-frame ink-slash strokes over the exchanges
  sleeve: 6.8,       // razor-shuriken shears the veteran SLEEVE; teeth tie (story E17)
  well: 7.4,         // comic trips; three raiders plink into the well; bow to the well
  bannerCut: 9.2,    // 42 cuts the banner down; raid loop folds (story E18 beat sheet)
  retie: 10.6,       // TENDER: farmer reties his topknot; it holds
  messenger: 12.0,   // one raider sprints for the bridge; 42 does not chase (story E19 beat sheet)
  bridgeStroke: 13.8,// THE BIG STROKE begins: L->R full frame, 1.2 s, ends AT 64.0 (story E20; deviation 3)
  cut: 15.0,         // boundary
}

// S6: the duel — the money shot. ALL film times for this shot go through
// DUEL.abs(g). World length is 18.65 (the 0.35 stop lives in real time);
// film = 64 + g up to the strike, 64.35 + g after it.
export const DUEL_EV = {
  strokeClears: 0.0, // the big stroke finishes clearing onto the bridge
  c2In: 0.6,         // C2 card in (story C2 window 0.6-4.2)
  c2Out: 4.2,        // C2 hard out; ZERO cuts from here to the 83.0 cut
  standoff: 4.2,     // 42 steps onto the near end; warlord fills the arch
  foreshadow: 6.4,   // the warlord hair does not move in the wind (wig tell)
  mixOut: 6.7,       // score mix-out begins; rain bed ducked, never out (story §4b)
  maIn: 7.0,         // MA IN: rain-only, 1.6 s — NOTHING else may be scheduled (story E21)
  strike: 8.6,       // ONE biwa pluck + 2-frame white flash + HIT-STOP 0.35 (story E22; freeze START)
  lanternOut: 9.6,   // the lantern goes out mid-exchange (story E23b)
  wigSplit: 10.0,    // WIG SPLITS: curtain halves, lighthouse glint, shogun crest (story E24)
  unmask: 11.0,      // oni mask off; bare gentle face scans; child + pot lid witness (story E25)
  scalpPat: 11.8,    // pats his own scalp twice — nothing left to shave (story E26)
  kneelRitual: 12.2, // kneels, no-dachi across the knees, small razor from the saya
  brow1: 12.4,       // eyebrow pass 1: left brow, outer->inner (story E27a)
  pluck1: 12.85,     // tiny pluck + ONE polite thunder (pass 1 + 0.45)
  brow2: 13.1,       // eyebrow pass 2: left brow, inner->outer (story E27b)
  pluck2: 13.55,     // tiny pluck + thunder (pass 2 + 0.45)
  brow3: 13.8,       // eyebrow pass 3: right brow, outer->inner (story E27c)
  pluck3: 14.25,     // tiny pluck + thunder (pass 3 + 0.45)
  brow4: 14.5,       // eyebrow pass 4: right brow, inner->outer (story E27d)
  offering: 14.8,    // four brows laid on the blade flat (story E28; story puts this before pluck4, deviation 5)
  pluck4: 14.95,     // tiny pluck + thunder (pass 4 + 0.45)
  bow: 15.0,         // THE BOW: 35 deg over 0.4 s, held 0.4, formal, deep (story E29)
  bowDeep: 15.4,     // deepest point; the child bows back, pot lid and all
  c3In: 15.6,        // C3 card in, hard (story C3 window; 0.2 s after the bow lands)
  c3Out: 18.65,      // C3 hard out AT the cut (film 83.0)
  cut: 18.65,        // HARD CUT to S7 at exactly 83.0 (story E30b)
}

// S7: resolution — the payoff is agriculture. Regrowth stroke drawn on THIS clock.
export const RESOLVE_EV = {
  regrowthWipe: 0.0, // upward gold-tipped stroke B->T, 0.0-0.8, drawn on this clock
  sunBreak: 1.0,     // sun cracks the clouds; the light source changes hands (story E31a)
  c4In: 1.4,         // C4 card in (story C4 window 1.4-4.6)
  combWave: 2.0,     // comb ritual wave L->R; farmer hands steady now (story E31b)
  c4Out: 4.6,        // C4 hard out
  wheatRun: 4.8,     // child runs the wheat row, pot lid helmet, sword up (story E32)
  mochiToss: 6.2,    // 42 flips one mochi to the child; S3 symmetry (story E33)
  mistWalk: 7.0,     // he turns and walks INTO the mist (story E34a)
  e1In: 7.3,         // E1 card in (story §3 7.4, chain shifted -0.1, deviation 1)
  ensoIn: 8.0,       // ENSO begins drawing: one clockwise stroke (story E34b)
  e1Out: 10.3,       // E1 hard out
  e2In: 10.3,        // E2 card in, contiguous out = next in
  ensoSeal: 12.4,    // aperture seals to the brush tail-lift (story §4e)
  e2Out: 12.9,       // E2 out at 95.9 = DUR - 0.1 lint margin (deviation 1)
  end: 13.0,         // film 96.0: black under the sealed circle; last frame
}

// ---------- MASTER event table (film-absolute seconds; story.md §2 E-table) ----------
// All values DERIVED from the clocks above — never recompute by hand. S6 rows
// carry the stop: compare against story's film-true column (E22 72.6, E24
// 74.35, ...). Deviations 3/4 apply to E10d/E18/E19/E20/E34 (see header).
export const MASTER = {
  wide: PROVINCE.abs(PROVINCE_EV.wide),                 // 0.0
  k1In: PROVINCE.abs(PROVINCE_EV.k1In),                 // 1.0   (story K1 in)
  tender: PROVINCE.abs(PROVINCE_EV.tender),             // 3.0
  banner: PROVINCE.abs(PROVINCE_EV.banner),             // 4.6   (story E2; K1 out)
  kneel: PROVINCE.abs(PROVINCE_EV.kneel),               // 5.8   (story E3)
  riders: PROVINCE.abs(PROVINCE_EV.riders),             // 7.2   taiko enters
  wipeToRaid: PROVINCE.abs(PROVINCE_EV.wipeToRaid),     // 9.4   diagonal sumi wipe starts
  ridersIn: RAID.abs(RAID_EV.ridersIn),                 // 10.0
  c1In: RAID.abs(RAID_EV.c1In),                         // 10.8  (story C1 in)
  shearLine: RAID.abs(RAID_EV.shearLine),               // 14.0  (story E4)
  knotFall: RAID.abs(RAID_EV.knotFall),                 // 15.4  (story E5)
  knotSplash: RAID.abs(RAID_EV.knotSplash),             // 16.6
  potLid: RAID.abs(RAID_EV.potLid),                     // 17.0  (story E6)
  childStare: RAID.abs(RAID_EV.childStare),             // 19.4
  bannerPinned: RAID.abs(RAID_EV.bannerPinned),         // 20.8
  thunderBuild: RAID.abs(RAID_EV.thunderBuild),         // 21.6
  thunderCut: RAID.abs(RAID_EV.cut),                    // 22.0  (story E7; HARD CUT on the clap)
  mochiIn: RONIN.abs(RONIN_EV.mochiIn),                 // 22.0
  elderBegs: RONIN.abs(RONIN_EV.elderBegs),             // 25.6
  childReveal: RONIN.abs(RONIN_EV.childReveal),         // 26.4
  chewStop: RONIN.abs(RONIN_EV.chewStop),               // 27.8  (story E8)
  stands: RONIN.abs(RONIN_EV.stands),                   // 29.0  (story E9a; FLOW first statement)
  titleIn: RONIN.abs(RONIN_EV.titleIn),                 // 29.2  (story E9b; title drop)
  titleOut: RONIN.abs(RONIN_EV.titleOut),               // 34.0  (deviation 2)
  giant: RONIN.abs(RONIN_EV.giant),                     // 34.0  (story E10a)
  twin: RONIN.abs(RONIN_EV.twin),                       // 35.2  (story E10b)
  veteran: RONIN.abs(RONIN_EV.veteran),                 // 36.4  (story E10c)
  comic: RONIN.abs(RONIN_EV.comic),                     // 37.2  (story E10d; table 37.4 corrected)
  wipeToTraining: RONIN.abs(RONIN_EV.wipeToTraining),   // 37.2  two-stroke staggered wipe starts
  drillsIn: TRAINING.abs(TRAINING_EV.drillsIn),         // 38.0
  domino: TRAINING.abs(TRAINING_EV.domino),             // 38.6  (story E11)
  combDrill: TRAINING.abs(TRAINING_EV.combDrill),       // 40.4
  waxOn: TRAINING.abs(TRAINING_EV.waxOn),               // 42.2  (story E12)
  metronome: TRAINING.abs(TRAINING_EV.metronome),       // 44.4  (grid-setter; FLOW rhythm fragments)
  gift: TRAINING.abs(TRAINING_EV.gift),                 // 46.0  (story E13)
  sunset: TRAINING.abs(TRAINING_EV.sunset),             // 47.6
  wipeToBattle: TRAINING.abs(TRAINING_EV.wipeToBattle), // 48.3  vertical rain-strokes start
  bandWaits: BATTLE.abs(BATTLE_EV.bandWaits),           // 49.0
  scarecrows: BATTLE.abs(BATTLE_EV.scarecrows),         // 50.0  (story E14)
  charge: BATTLE.abs(BATTLE_EV.charge),                 // 52.0  (story E15; drawn freezes)
  topknotRain: BATTLE.abs(BATTLE_EV.topknotRain),       // 53.4  (story E16)
  inkSlashes: BATTLE.abs(BATTLE_EV.inkSlashes),         // 55.0
  sleeve: BATTLE.abs(BATTLE_EV.sleeve),                 // 55.8  (story E17)
  well: BATTLE.abs(BATTLE_EV.well),                     // 56.4
  bannerCut: BATTLE.abs(BATTLE_EV.bannerCut),           // 58.2  (story E18 beat sheet; table 59.0 corrected)
  retie: BATTLE.abs(BATTLE_EV.retie),                   // 59.6
  messenger: BATTLE.abs(BATTLE_EV.messenger),           // 61.0  (story E19 beat sheet; table 62.0 corrected)
  bridgeStroke: BATTLE.abs(BATTLE_EV.bridgeStroke),     // 62.8  big stroke STARTS; completes 64.0 (story E20)
  strokeClears: DUEL.abs(DUEL_EV.strokeClears),         // 64.0
  c2In: DUEL.abs(DUEL_EV.c2In),                         // 64.6  (story C2 in)
  c2Out: DUEL.abs(DUEL_EV.c2Out),                       // 68.2
  standoff: DUEL.abs(DUEL_EV.standoff),                 // 68.2
  foreshadow: DUEL.abs(DUEL_EV.foreshadow),             // 70.4  wig tell
  mixOut: DUEL.abs(DUEL_EV.mixOut),                     // 70.7  (story §4b mix-out begins)
  maIn: DUEL.abs(DUEL_EV.maIn),                         // 71.0  (story E21; rain-only begins)
  pluck: DUEL.abs(DUEL_EV.strike),                      // 72.6  (story E22; freeze START; AT the stop g)
  land: DUEL.abs(DUEL_EV.strike) + STOPS[0].d,          // 72.95 (story E23a; resume adds d explicitly)
  lanternOut: DUEL.abs(DUEL_EV.lanternOut),             // 73.95 (story E23b)
  wigSplit: DUEL.abs(DUEL_EV.wigSplit),                 // 74.35 (story E24)
  unmask: DUEL.abs(DUEL_EV.unmask),                     // 75.35 (story E25)
  scalpPat: DUEL.abs(DUEL_EV.scalpPat),                 // 76.15 (story E26)
  kneelRitual: DUEL.abs(DUEL_EV.kneelRitual),           // 76.55
  brow1: DUEL.abs(DUEL_EV.brow1),                       // 76.75 (story E27a)
  pluck1: DUEL.abs(DUEL_EV.pluck1),                     // 77.2
  brow2: DUEL.abs(DUEL_EV.brow2),                       // 77.45 (story E27b)
  pluck2: DUEL.abs(DUEL_EV.pluck2),                     // 77.9
  brow3: DUEL.abs(DUEL_EV.brow3),                       // 78.15 (story E27c)
  pluck3: DUEL.abs(DUEL_EV.pluck3),                     // 78.6
  brow4: DUEL.abs(DUEL_EV.brow4),                       // 78.85 (story E27d)
  offering: DUEL.abs(DUEL_EV.offering),                 // 79.15 (story E28)
  pluck4: DUEL.abs(DUEL_EV.pluck4),                     // 79.3
  bow: DUEL.abs(DUEL_EV.bow),                           // 79.35 (story E29; quiet FLOW statement under it)
  bowDeep: DUEL.abs(DUEL_EV.bowDeep),                   // 79.75 child bows back
  c3In: DUEL.abs(DUEL_EV.c3In),                         // 79.95 (story E30a; C3 in)
  c3Out: DUEL.abs(DUEL_EV.c3Out),                       // 83.0  C3 hard out AT the cut
  duelCut: DUEL.abs(DUEL_EV.cut),                       // 83.0  (story E30b; HARD CUT)
  regrowthWipe: RESOLVE.abs(RESOLVE_EV.regrowthWipe),   // 83.0  gold stroke starts on S7 clock
  sunBreak: RESOLVE.abs(RESOLVE_EV.sunBreak),           // 84.0  (story E31a)
  c4In: RESOLVE.abs(RESOLVE_EV.c4In),                   // 84.4  (story C4 in)
  combWave: RESOLVE.abs(RESOLVE_EV.combWave),           // 85.0  (story E31b)
  c4Out: RESOLVE.abs(RESOLVE_EV.c4Out),                 // 87.6
  wheatRun: RESOLVE.abs(RESOLVE_EV.wheatRun),           // 87.8  (story E32)
  mochiToss: RESOLVE.abs(RESOLVE_EV.mochiToss),         // 89.2  (story E33)
  mistWalk: RESOLVE.abs(RESOLVE_EV.mistWalk),           // 90.0  (story E34a)
  e1In: RESOLVE.abs(RESOLVE_EV.e1In),                   // 90.3  (story E35a, -0.1 slate shift)
  ensoIn: RESOLVE.abs(RESOLVE_EV.ensoIn),               // 91.0  (story E34b)
  e1Out: RESOLVE.abs(RESOLVE_EV.e1Out),                 // 93.3
  e2In: RESOLVE.abs(RESOLVE_EV.e2In),                   // 93.3  (story E35b, -0.1 slate shift)
  ensoSeal: RESOLVE.abs(RESOLVE_EV.ensoSeal),           // 95.4  aperture seals (story §4e)
  e2Out: RESOLVE.abs(RESOLVE_EV.e2Out),                 // 95.9  = DUR - 0.1
  filmEnd: RESOLVE.abs(RESOLVE_EV.end),                 // 96.0  last frame
}

// ---------- safe area ----------
// Letterbox 0.8 house value -> visible band rows ~111..969 at 1080p; captions
// must center at y <= 915 (lint letterbox rule with a size-40 line). Never use
// the core y 930 / y 986 style defaults bare. Film.js must ALSO clamp the
// giant head, the no-dachi arc and pratfall bounce tops to bandY before
// blocking (baldzilla feet scar).
export const SAFE = { letterbox: 0.8, bandY: [111, 969], captionYMax: 915 }

// ---------- CAPTIONS ----------
// Styles are the CORE captionStyles (filmkit captions.js): title {anton 132
// y540 anim line in .7 out .5}, caption {grot 40 y930 -> ALWAYS override y},
// kicker {mono 26 y430 fade track 6}. Per-caption y/in/out/anim are legal
// overrides. Story §3 card declaration: every row except T1 is an intertitle,
// anim 'cut', in 0 / out 0 — window == fully-visible hold. T1 keeps brush
// rides; its underline is TITLE_UNDERLINE below (picture-side stroke).
// HOLD TABLE: hold = (t1 - out) - (t0 + in); pass >= 3, or >= declared minHold:
//   k1_province  1.0-4.6    cut 0/0     hold 3.60 ok (kicker y430, two-line, em-dash verbatim)
//   c1_tax      10.8-14.4   cut 0/0     hold 3.60 ok
//   t1_hairakiri 29.2-34.0  line .4/.4  visible 4.00 ok (out ext, deviation 2)
//   c2_bridge   64.6-68.2   cut 0/0     hold 3.60 ok (two-line y878/38)
//   c3_never    79.95-83.0  cut 0/0     hold 3.05 ok (hard out AT the 83.0 cut; DUEL.abs-derived)
//   c4_spring   84.4-87.6   cut 0/0     hold 3.20 ok
//   e1_flow     90.3-93.3   cut 0/0     hold 3.00 ok (chain -0.1, deviation 1)
//   e2_honor    93.3-95.9   cut 0/0     leg 2.60 minHold 2.0 (declared end-card override)
// Every window ends inside its shot and inside the film; every y <= 915; main
// lane sequential with >= 0.9 gaps except the declared contiguous E1->E2
// chain; NO caption enters the ma gap (C2 out 68.2 -> C3 in 79.95).
export const CAPTIONS = [
  // S1 0-10 province
  { id: 'k1_province', text: 'FLOWAGAWA PROVINCE —\nYEAR OF THE RAZOR DECADE', t0: 1.0, t1: 4.6, style: 'kicker', x: 960, y: 430, anim: 'cut', in: 0, out: 0 },
  // S2 10-22 raid
  { id: 'c1_tax', text: 'THE TAX WAS TAKEN AT BLADE POINT.', t0: 10.8, t1: 14.4, style: 'caption', x: 960, y: 868, anim: 'cut', in: 0, out: 0 },
  // S3 22-38 ronin — the late title drop; underline draws beneath (TITLE_UNDERLINE)
  { id: 't1_hairakiri', text: 'HAIRAKIRI', t0: 29.2, t1: 34.0, style: 'title', x: 960, y: 540, anim: 'line', in: 0.4, out: 0.4 },
  // S6 64-83 duel — C2 clears 3.0 s before the ma; C3 lands after the bow
  { id: 'c2_bridge', text: 'THE BRIDGE AT SANOGAWA.\nTHE LAST HOUR OF THE RAIN.', t0: 64.6, t1: 68.2, style: 'caption', x: 960, y: 878, size: 38, anim: 'cut', in: 0, out: 0 },
  { id: 'c3_never', text: 'HE NEVER SPOKE OF IT AGAIN.', t0: 79.95, t1: 83.0, style: 'caption', x: 960, y: 868, anim: 'cut', in: 0, out: 0 },
  // S7 83-96 resolve — E1/E2 contiguous chain inside the ensō (declared override on E2)
  { id: 'c4_spring', text: 'SPRING CAME EARLY THAT YEAR.', t0: 84.4, t1: 87.6, style: 'caption', x: 960, y: 868, anim: 'cut', in: 0, out: 0 },
  { id: 'e1_flow', text: 'THE FLOW ENDURES.', t0: 90.3, t1: 93.3, style: 'caption', x: 960, y: 868, anim: 'cut', in: 0, out: 0 },
  { id: 'e2_honor', text: 'HONOR GROWS BACK.', t0: 93.3, t1: 95.9, style: 'caption', x: 960, y: 868, anim: 'cut', in: 0, out: 0, minHold: 2.0 },
]

// ---------- signature beats (a) the sumi brush-stroke wipes ----------
// Every act boundary except the two named hard cuts. Each stroke is a filled
// bezier polygon with dry-brush nubs (hash-of-index bristles) and a 0.1 s
// alpha ramp on the edge only — NEVER a rect, NEVER a crossfade. t0/dur are
// absolute film seconds derived from the clocks; every stroke ENDS on its
// boundary except s6s7, which starts on S7's clock per story §4a.
export const WIPES = [
  { id: 's1s2', t0: PROVINCE.abs(PROVINCE_EV.wipeToRaid), dur: 0.6, strokes: 1, stagger: 0, dir: 'ul-lr', tip: 'sumi' },
  { id: 's3s4', t0: RONIN.abs(RONIN_EV.wipeToTraining), dur: 0.8, strokes: 2, stagger: 0.18, dir: 'ur-ll', tip: 'sumi' },
  { id: 's4s5', t0: TRAINING.abs(TRAINING_EV.wipeToBattle), dur: 0.7, strokes: 3, stagger: 0.12, dir: 'tb', tip: 'rain' },
  { id: 's5s6', t0: BATTLE.abs(BATTLE_EV.bridgeStroke), dur: 1.2, strokes: 1, stagger: 0, dir: 'lr', tip: 'sumi-big' },
  { id: 's6s7', t0: RESOLVE.abs(RESOLVE_EV.regrowthWipe), dur: 0.8, strokes: 1, stagger: 0, dir: 'bt', tip: 'gold' },
]
// The two named hard cuts — no crossfade, no wipe, EVER, on either.
export const HARD_CUTS = { s2s3: RAID.abs(RAID_EV.cut), s6s7: DUEL.abs(DUEL_EV.cut) }
// T1 underline: one short horizontal stroke drawing L->R beneath HAIRAKIRI
// (starts when the title stroke-in completes, 0.5 s draw).
export const TITLE_UNDERLINE = { t0: RONIN.abs(RONIN_EV.titleIn) + 0.4, dur: 0.5 }

// ---------- signature beat (b) THE MA BEAT ----------
// mix-out 0.3 s -> rain-only 1.6 s (>= 1.2 house min) -> ONE biwa pluck ON
// the 2-frame flash AT the freeze START -> everything lands at resume. The
// rain bed continues through the stop (picture freezes, audio does not); no
// cue may start inside [rainOnly, strike]. All S6 cues resolve via DUEL.abs.
export const MA = {
  mixOut: DUEL.abs(DUEL_EV.mixOut),                  // 70.7 all instruments mute over 0.3 s
  rainOnly: DUEL.abs(DUEL_EV.maIn),                  // 71.0 rain-only begins
  strike: DUEL.abs(DUEL_EV.strike),                  // 72.6 pluck + flash + freeze START
  resume: DUEL.abs(DUEL_EV.strike) + STOPS[0].d,     // 72.95 everything lands (d added explicitly)
  rainSpan: 1.6,                                     // rainOnly -> strike; house min 1.2
}

// ---------- signature beat (c) the wig-split geometry gag ----------
// Halves pivot around their top-front point, translate laterally +/-90 px,
// rotate -/+10 deg, sine-eased over 0.45 s with a settle bounce; ONE
// specular glint sweeps front->back over 0.5 s; shogun crest visible 0.4 s.
// No SFX on the split — score gives two dead koto plucks a semitone apart.
export const WIGSPLIT = {
  g: DUEL_EV.wigSplit,
  t: DUEL.abs(DUEL_EV.wigSplit), // 74.35
  travel: 90, rot: 10, dur: 0.45, glintDur: 0.5, crestHold: 0.4,
}

// ---------- signature beat (d) the eyebrow hairakiri ----------
// Four slow deliberate razor passes 0.7 s apart; each a 0.45 s arc ending in
// a tiny pluck at +0.45 with ONE polite rumble of thunder. The bow: 35 deg
// over 0.4 s, held 0.4; the child bows back at the deepest point.
export const EYEBROW = {
  spacing: 0.7, arcDur: 0.45, pluckLag: 0.45,
  g: [DUEL_EV.brow1, DUEL_EV.brow2, DUEL_EV.brow3, DUEL_EV.brow4],
  film: [DUEL_EV.brow1, DUEL_EV.brow2, DUEL_EV.brow3, DUEL_EV.brow4].map((g) => DUEL.abs(g)),
  plucks: [DUEL_EV.pluck1, DUEL_EV.pluck2, DUEL_EV.pluck3, DUEL_EV.pluck4].map((g) => DUEL.abs(g)),
  bow: DUEL.abs(DUEL_EV.bow),
}

// ---------- signature beat (e) the ENSO iris ----------
// One clockwise brush stroke from 8 o'clock sweeping 320 deg; the unpainted
// 40 deg is the iris aperture on the mist walk; mask angle = lerp(ease(t)),
// bristles = hash-of-angle. The film's ONLY iris — never reuse the shape.
export const ENSO = {
  t0: RESOLVE.abs(RESOLVE_EV.ensoIn),       // 91.0 first arc
  seal: RESOLVE.abs(RESOLVE_EV.ensoSeal),   // 95.4 aperture seals to the tail-lift
  sweepDeg: 320, apertureDeg: 40, startDeg: 240, // startDeg measured clockwise from 12 = 8 o'clock
}

// ---------- motifs (original; MIDI offsets from a root; quote nothing) ----------
// FLOW: [0, +7, +8, +12] — the water gathers, lifts, and falls forward.
// Hirajoshi-compatible from A: A E F A'. Rhythm long-long-short-held, mapped
// per section by score.js. Entries: S3 koto solo (stands), S4 rhythm-only
// fragments (metronome), S5 WITHHELD on purpose, S6 minor-tinged under the
// bow, S7 full ensemble with the final note HELD under E1/E2. The return at
// the resolution is brief-binding.
export const FLOW_ROOT = 57 // A3
export const FLOW = [0, 7, 8, 12]
export const FLOW_RHYTHM_BEATS = [3, 3, 1, 6] // long-long-short-held in section-grid beats
export const flowMotif = (root = FLOW_ROOT) => FLOW.map((k) => root + k)

// ---------- SCORE — shared musical plan (score.js consumes sections + cues; EV supplies the rest) ----------
// Sections are self-contained: each t0 is a downbeat. No film-wide grid (see
// header). One main grid 76 BPM; the battle section runs x2 (152). All S6
// cues >= 72.6 resolve through DUEL.abs — never hand-add.
export const SECTIONS = [
  { name: 'province', t0: T.province, t1: T.raid,     bpm: 76,  beats: 4, key: 'A hirajoshi', feel: 'shakuhachi long tones over low strings; koto sparse as falling drops; a tune older than the valley; taiko enters under at MASTER.riders; K1 window quiet' },
  { name: 'raid',     t0: T.raid,     t1: T.ronin,    bpm: 76,  beats: 4, key: 'A hirajoshi', feel: 'taiko heartbeat under the lane walk; biwa stabs mark each shear pass from MASTER.shearLine; the slow-mo knot gets one bar of half-time FEEL at MASTER.knotFall (grid holds, notes stretch); thunder build to the hard cut at MASTER.thunderCut' },
  { name: 'ronin',    t0: T.ronin,    t1: T.training, bpm: 76,  beats: 4, key: 'A hirajoshi', feel: 'mochi stand near-silence (chews + rain); FLOW motif FIRST statement koto solo at MASTER.stands; each recruit join re-orchestrates it: giant = deep taiko at MASTER.giant, twin = fast koto tremolo at MASTER.twin, veteran = low biwa at MASTER.veteran, comic = the motif with ONE note played late at MASTER.comic (his whole personality)' },
  { name: 'training', t0: T.training, t1: T.battle,   bpm: 76,  beats: 4, key: 'A hirajoshi', feel: 'the veteran comb-metronome taps SET the grid from MASTER.metronome (FLOW rhythm, no pitches); pratfall accents on rim shots at MASTER.domino; warm turn from the strings through MASTER.gift' },
  { name: 'battle',   t0: T.battle,   t1: T.duel,     bpm: 152, beats: 4, key: 'A hirajoshi', feel: 'x2 grid, percussion only — taiko deep/rim alternation, biwa strums; one shakuhachi shriek on the sleeve shear at MASTER.sleeve; the FLOW motif is WITHHELD entirely — it only sounds once it is won' },
  { name: 'duel',     t0: T.duel,     t1: T.resolve,  bpm: 76,  beats: 4, key: 'A insen',     feel: 'grid thins to taiko heartbeat through the standoff; mix-out begins MASTER.mixOut, rain-only from MASTER.maIn and NOTHING scheduled in [71.0, 72.6]; ONE biwa pluck AT MASTER.pluck synced to the 2-frame flash (lands at the freeze START); full landing + low-string swell at MASTER.land; wig split = two dead koto plucks a semitone apart at MASTER.wigSplit and nothing else; one quiet minor-tinged FLOW statement under the bow at MASTER.bow; ALL duel cues via DUEL.abs' },
  { name: 'resolve',  t0: T.resolve,  t1: DUR,        bpm: 76,  beats: 4, key: 'A hirajoshi', feel: 'FLOW motif TRIUMPHANT in full ensemble (koto + taiko + flute + strings) from t0, sun-lit; final note HELD under E1/E2 from CUES.flowHold to 95.9; ends on the held tonic with one last shakuhachi breath — intentional to the last frame, no abrupt silence' },
]

// Bar/beat grid helpers. b(section, bar, beat) -> absolute film seconds of
// that beat (bar 0 beat 0 = the section downbeat). Never hand-add delays.
const SECT = {}
for (const s of SECTIONS) SECT[s.name] = s

export const b = (name, bar, beat = 0) => {
  const s = SECT[name]
  return s.t0 + ((bar * s.beats + beat) * 60) / s.bpm
}
export const barSec = (name) => (SECT[name].beats * 60) / SECT[name].bpm
export const beatSec = (name) => 60 / SECT[name].bpm

// ---------- named cue anchors (all clock-derived; score.js adds nothing by hand) ----------
export const CUES = {
  province: T.province,          // 0     shakuhachi over low strings
  banner: MASTER.banner,         // 4.6   whip crack + first dread sting
  taikoEnter: MASTER.riders,     // 7.2   taiko heartbeat in
  shearLine: MASTER.shearLine,   // 14.0  biwa stab per shear pass
  knotFall: MASTER.knotFall,     // 15.4  half-time feel bar
  thunderCut: MASTER.thunderCut, // 22.0  thunderclap; music hard-cuts with the picture
  flowFirst: MASTER.stands,      // 29.0  FLOW first statement, koto solo
  titleDrop: MASTER.titleIn,     // 29.2  the film names itself
  recruitGiant: MASTER.giant,    // 34.0  deep taiko
  recruitTwin: MASTER.twin,      // 35.2  koto tremolo
  recruitVeteran: MASTER.veteran,// 36.4  low biwa
  recruitComic: MASTER.comic,    // 37.2  one note late
  domino: MASTER.domino,         // 38.6  rim-shot accents
  flowDrill: MASTER.metronome,   // 44.4  FLOW rhythm fragments, no pitches
  gift: MASTER.gift,             // 46.0  warm string turn
  battle: T.battle,              // 49.0  percussion only, x2 grid
  topknotRain: MASTER.topknotRain, // 53.4 tender swell under the catch
  sleeve: MASTER.sleeve,         // 55.8  shakuhachi shriek
  bannerCut: MASTER.bannerCut,   // 58.2  raid loop loses heart
  duel: T.duel,                  // 64.0  heartbeat taiko through the standoff
  mixOut: MASTER.mixOut,         // 70.7  instruments mute over 0.3 s
  maIn: MASTER.maIn,             // 71.0  rain-only 1.6 s — NOTHING else in the window
  pluck: MASTER.pluck,           // 72.6  ONE biwa pluck AT the flash (freeze start)
  land: MASTER.land,             // 72.95 full landing + low-string swell
  wigSplit: MASTER.wigSplit,     // 74.35 two dead koto plucks a semitone apart
  flowBow: MASTER.bow,           // 79.35 quiet minor-tinged FLOW under the bow
  resolve: T.resolve,            // 83.0  major reprise in
  flowReprise: T.resolve,        // 83.0  FLOW triumphant, full ensemble (brief-binding return)
  sunBreak: MASTER.sunBreak,     // 84.0  light-source handover
  flowHold: MASTER.e1In,         // 90.3  final note HELD under E1/E2
  endCard: MASTER.e2In,          // 93.3  held tonic under the closed circle
  done: MASTER.e2Out,            // 95.9  one last shakuhachi breath, done
}

// ---------- CAST (casting.md decision table, pasted verbatim; ids verified, never guessed) ----------
export const CAST = {
  ronin:       { id: 42,   role: 'RONIN LEAD — Crimson Flow (FIXED; never mirror; straw mino drawn in S3)', u: 120 },
  warlord:     { id: 3360, role: 'CABALD WARLORD — oni mask + secret shogun wig are procedural overlays', u: 2529 },
  giant:       { id: 3627, role: 'BAND 1 — spear giant (scale ~1.3x + laundry-pole naginata)', u: 312 },
  twin:        { id: 2620, role: 'BAND 2 — fast twin-blade (speed is anim, not sprite)', u: 83 },
  veteran:     { id: 2260, role: 'BAND 3 — grumpy veteran (fish-patch scabbard; sleeve gag S5)', u: 682 },
  comic:       { id: 4322, role: 'BAND 4 — comic relief (pratfall specialist, frog hood)', u: 320 },
  elder:       { id: 960,  role: 'VILLAGE ELDER (cane + hunch drawn)', u: 682 },
  grandmother: { id: 2186, role: 'GRANDMOTHER (pot-lid gag actor)', u: 312 },
  child:       { id: 1020, role: 'CHILD (draw ~0.55x; shaved-reveal bald-cap; pot lid)', u: 500 },
  daughter:    { id: 1020, role: 'FARMER DAUGHTER S1 (child rig, far scale, wooden comb)', u: 500 },
  farmer:      { id: 1140, role: 'FARMER (reads freshly shaved; severed topknot drawn prop)', u: 120 },
  captain:     { id: 1926, role: 'TAX CAPTAIN (banner procedural; never mirror — pom side)', u: 3363 },
  banditA:     { id: 4187, role: 'CABALD BANDIT A (vermillion)', u: 3140 },
  banditB:     { id: 23,   role: 'CABALD BANDIT B (sprite katana IS the sheath gag; no second weapon)', u: 3140 },
  banditC:     { id: 159,  role: 'CABALD BANDIT C — senior robe', u: 3363 },
  vendor:      { id: 320,  role: 'MOCHI VENDOR (duck-hood raincoat)', u: 83 },
}
// u = understudy id (casting.md backups). Heroes/side heroes hairy, Cabald
// bald-listed — colour-lore verified in casting.md. 500 (child u) carries a
// text tee: never show the chest in close-ups.

// ---------- screen flashes: [absoluteT, peak, decay] — peaks <= .24, decay <= .2 ----------
// Night woodblock palette stays restrained; big moments read as in-scene glow.
// The strike flash dies INSIDE the 0.35 s freeze (decay 0.06 -> ~0.001 by +0.35).
export const FLASHES = [
  [PROVINCE.abs(PROVINCE_EV.banner), 0.1, 0.08],   // banner whip crack
  [RAID.abs(RAID_EV.shearLine), 0.08, 0.06],       // first snip glint (per-snip glints are in-scene)
  [RAID.abs(RAID_EV.cut), 0.1, 0.08],              // thunderclap on the hard cut
  [BATTLE.abs(BATTLE_EV.charge), 0.1, 0.08],       // first paddy impact
  [BATTLE.abs(BATTLE_EV.sleeve), 0.12, 0.08],      // shuriken shear
  [DUEL.abs(DUEL_EV.strike), 0.22, 0.06],          // THE 2-frame white flash at the pluck
  [DUEL.abs(DUEL_EV.wigSplit), 0.1, 0.1],          // scalp lighthouse glint kick
  [RESOLVE.abs(RESOLVE_EV.sunBreak), 0.14, 0.18],  // sun through clouds, warm
]
export const flashK = (t) => {
  let k = 0
  for (const f of FLASHES) if (t >= f[0]) k = Math.max(k, f[1] * Math.exp(-(t - f[0]) / f[2]))
  return k
}

// ========================= SELF-CHECK =========================
// The numeric self-check is the commented script block between the markers
// below, shipped standalone at output/hairakiri/notes/timeline-selfcheck.mjs.

// BEGIN SELF-CHECK (numeric invariants; pure read-only assertions over the exports)
// import { readFileSync } from 'node:fs'
// import * as TL from 'file:///Users/z80/dev/remyboysfrontend/films/hairakiri/timeline.js'
//
// const fails = []
// const eps = 1e-9
// const near = (a, b, msg) => { if (Math.abs(a - b) > eps) fails.push(msg + ' (' + a + ' != ' + b + ')') }
// const ok = (cond, msg) => { if (!cond) fails.push(msg) }
// const BOUNDARY = new Set(['cut', 'end', 'c3Out'])
//
// // 1. DUR inside the mandated band and equal to the pinned value
// ok(TL.DUR === 96, 'DUR ' + TL.DUR + ' != 96')
// ok(TL.DUR >= 90 && TL.DUR <= 104, 'DUR outside 90-104')
//
// // 2. shots tile [0, DUR) exactly
// let prev = 0
// for (const s of TL.SHOTS) {
//   ok(s.t0 === prev, 'shots: gap/overlap before ' + s.name + ' (t0 ' + s.t0 + ', expected ' + prev + ')')
//   ok(s.t1 > s.t0, 'shots: ' + s.name + ' non-positive length')
//   prev = s.t1
// }
// ok(prev === TL.DUR, 'shots: last t1 ' + prev + ' != DUR ' + TL.DUR)
// const shotOf = (t) => TL.SHOTS.find((s) => t >= s.t0 && t < s.t1)
//
// // 3. stop shape: exactly ONE hit-stop, on the duel clock, story-pinned values
// ok(TL.STOPS.length === 1, 'STOPS must hold exactly the one ma-beat stop')
// ok(TL.STOPS[0].g === 8.6 && TL.STOPS[0].d === 0.35, 'STOPS[0] must be { g: 8.6, d: 0.35 } in S6 LOCAL time')
// ok(TL.DUEL.stops.length === 1 && TL.DUEL.t0 === TL.T.duel, 'the stop must live on the DUEL clock')
// for (const [name, C] of Object.entries({ province: TL.PROVINCE, raid: TL.RAID, ronin: TL.RONIN, training: TL.TRAINING, battle: TL.BATTLE, resolve: TL.RESOLVE })) {
//   ok(C.stops.length === 0, 'clock ' + name + ' must be stop-free')
//   ok(C.t0 === TL.T[name], 'clock ' + name + '.t0 != T.' + name)
//   for (const g of [0, 1.3, 7.7, 12.4]) near(C.abs(g), C.t0 + g, 'plain clock ' + name + '.abs(' + g + ') drifts')
// }
//
// // 4. stop semantics: filmT/warp round-trip, event AT the stop g lands at freeze start
// near(TL.DUEL.filmT(8.6), 8.6, 'filmT(8.6) must equal 8.6 (event AT the stop g lands at freeze start)')
// near(TL.DUEL.filmT(8.7), 9.05, 'filmT after the stop must add d')
// near(TL.DUEL.filmT(18.65), 19.0, 'world end 18.65 must map to real 19.0')
// for (const g of [0, 4.2, 7.0, 8.59, 8.6, 8.7, 9.6, 10.0, 14.8, 15.6, 18.65]) {
//   const w = TL.DUEL.warp(TL.DUEL.filmT(g))
//   near(w.g, g, 'round-trip warp(abs(' + g + ')).g drifts')
// }
// for (const tau of [64, 70, 72.59, 72.96, 80, 82.99]) {
//   const w = TL.DUEL.warp(tau - TL.DUEL.t0)
//   near(TL.DUEL.filmT(w.g), tau - TL.DUEL.t0, 'inverse filmT(warp(' + tau + ')) drifts')
// }
// const wIn = TL.DUEL.warp(8.6)
// ok(wIn.stop !== null && Math.abs(wIn.sl) < eps, 'warp at the strike must sit at freeze START (sl 0)')
// const wMid = TL.DUEL.warp(8.8)
// ok(wMid.stop !== null && wMid.g === 8.6 && Math.abs(wMid.sl - 0.2) < eps, 'warp mid-freeze must pin g 8.6 with sl 0.2')
// ok(TL.DUEL.warp(8.95).stop === null, 'warp at resume must be stop-free')
//
// // 5. per-shot EV tables: finite, ordered, inside the shot (duel in WORLD time)
// const STOP_D = TL.STOPS[0].d
// const EVS = {
//   province: TL.PROVINCE_EV, raid: TL.RAID_EV, ronin: TL.RONIN_EV, training: TL.TRAINING_EV,
//   battle: TL.BATTLE_EV, duel: TL.DUEL_EV, resolve: TL.RESOLVE_EV,
// }
// const CLKS = { province: TL.PROVINCE, raid: TL.RAID, ronin: TL.RONIN, training: TL.TRAINING, battle: TL.BATTLE, duel: TL.DUEL, resolve: TL.RESOLVE }
// for (const [name, ev] of Object.entries(EVS)) {
//   const shot = TL.SHOTS.find((s) => s.name === name)
//   ok(shot, 'EV table ' + name + ' has no matching shot')
//   if (!shot) continue
//   const worldLen = name === 'duel' ? shot.t1 - shot.t0 - STOP_D : shot.t1 - shot.t0
//   let last = -Infinity
//   for (const [k, v] of Object.entries(ev)) {
//     ok(typeof v === 'number' && Number.isFinite(v) && v >= 0, 'EV ' + name + '.' + k + ' not a finite non-negative number')
//     ok(v <= worldLen + eps, 'EV ' + name + '.' + k + '=' + v + ' past ' + name + ' end (worldLen ' + worldLen + ')')
//     ok(BOUNDARY.has(k) || v < worldLen - eps, 'EV ' + name + '.' + k + '=' + v + ' not strictly inside ' + name)
//     const abs = CLKS[name].abs(v)
//     ok(abs <= shot.t1 + eps, 'EV ' + name + '.' + k + ' abs ' + abs + ' past shot t1 ' + shot.t1)
//     ok(v >= last - eps, 'EV ' + name + '.' + k + '=' + v + ' out of order (after ' + last + ')')
//     last = v
//   }
// }
// near(TL.DUEL.abs(TL.DUEL_EV.c3Out), TL.T.resolve, 'C3 out must land exactly on the 83.0 cut')
// near(TL.DUEL.abs(TL.DUEL_EV.strike), 72.6, 'the strike must land at film 72.6 (freeze start)')
// near(TL.DUEL.abs(TL.DUEL_EV.strike) + STOP_D, 72.95, 'resume must land at film 72.95')
//
// // 6. MASTER: every value is one EV through its clock, and equals the pinned E-table
// for (const [name, ev] of Object.entries(EVS)) {
//   for (const [k, v] of Object.entries(ev)) {
//     if (k === 'cut' || k === 'end' || k === 'strike') continue // strike is MASTER.pluck
//     ok(TL.MASTER[k] !== undefined, 'MASTER is missing EV ' + name + '.' + k)
//     if (TL.MASTER[k] !== undefined) near(TL.MASTER[k], CLKS[name].abs(v), 'MASTER.' + k + ' is not the clock value of ' + name + '.' + k)
//   }
// }
// const E = {
//   wide: 0, k1In: 1, tender: 3, banner: 4.6, kneel: 5.8, riders: 7.2,
//   ridersIn: 10, c1In: 10.8, shearLine: 14, knotFall: 15.4, knotSplash: 16.6, potLid: 17,
//   childStare: 19.4, bannerPinned: 20.8, thunderBuild: 21.6, thunderCut: 22,
//   mochiIn: 22, elderBegs: 25.6, childReveal: 26.4, chewStop: 27.8, stands: 29, titleIn: 29.2,
//   titleOut: 34, giant: 34, twin: 35.2, veteran: 36.4, comic: 37.2,
//   drillsIn: 38, domino: 38.6, combDrill: 40.4, waxOn: 42.2, metronome: 44.4, gift: 46, sunset: 47.6,
//   bandWaits: 49, scarecrows: 50, charge: 52, topknotRain: 53.4, inkSlashes: 55, sleeve: 55.8,
//   well: 56.4, bannerCut: 58.2, retie: 59.6, messenger: 61, bridgeStroke: 62.8,
//   strokeClears: 64, c2In: 64.6, c2Out: 68.2, standoff: 68.2, foreshadow: 70.4, mixOut: 70.7,
//   maIn: 71, pluck: 72.6, land: 72.95, lanternOut: 73.95, wigSplit: 74.35, unmask: 75.35,
//   scalpPat: 76.15, kneelRitual: 76.55, brow1: 76.75, pluck1: 77.2, brow2: 77.45, pluck2: 77.9,
//   brow3: 78.15, pluck3: 78.6, brow4: 78.85, offering: 79.15, pluck4: 79.3, bow: 79.35,
//   bowDeep: 79.75, c3In: 79.95, c3Out: 83, duelCut: 83,
//   regrowthWipe: 83, sunBreak: 84, c4In: 84.4, combWave: 85, c4Out: 87.6, wheatRun: 87.8,
//   mochiToss: 89.2, mistWalk: 90, e1In: 90.3, ensoIn: 91, e1Out: 93.3, e2In: 93.3,
//   ensoSeal: 95.4, e2Out: 95.9, filmEnd: 96,
// }
// for (const [k, v] of Object.entries(E)) {
//   ok(TL.MASTER[k] !== undefined, 'MASTER is missing pinned key ' + k)
//   if (TL.MASTER[k] !== undefined) near(TL.MASTER[k], v, 'MASTER.' + k + ' drifts from the pinned E-table')
// }
// for (const [k, v] of Object.entries(TL.MASTER)) {
//   const s = shotOf(Math.min(v, TL.DUR - eps))
//   ok(s, 'MASTER.' + k + '=' + v + ' outside the film')
//   ok(v < TL.DUR + eps, 'MASTER.' + k + '=' + v + ' not inside the film')
// }
//
// // 7. ma-beat layout: mix-out 0.3, rain-only >= 1.2 with NOTHING inside, pluck AT the flash
// near(TL.MA.rainOnly - TL.MA.mixOut, 0.3, 'mix-out must take 0.3 s')
// ok(TL.MA.strike - TL.MA.rainOnly >= 1.2, 'rain-only span must be >= 1.2 s')
// near(TL.MA.strike - TL.MA.rainOnly, TL.MA.rainSpan, 'MA.rainSpan must equal the rain-only span')
// near(TL.MA.resume, TL.MA.strike + 0.35, 'resume must be strike + 0.35')
// ok(TL.MA.strike === TL.MASTER.pluck, 'the pluck cue must sit at the strike')
// for (const [k, v] of Object.entries(TL.MASTER)) {
//   if (k === 'maIn' || k === 'pluck') continue
//   ok(!(v > TL.MA.rainOnly + eps && v < TL.MA.strike - eps), 'MASTER.' + k + '=' + v + ' invades the rain-only window')
// }
// ok(TL.FLASHES.some((f) => Math.abs(f[0] - TL.MA.strike) < eps && f[1] >= 0.2), 'the 2-frame white flash must sit AT the strike with real peak')
//
// // 8. captions: count, safe band, visible-hold rule, lanes, end slate, no wipe overlap
// ok(TL.CAPTIONS.length <= 14, 'caption count ' + TL.CAPTIONS.length + ' > 14')
// const laneOf = (y) => (y === 540 ? 'title' : y === 430 ? 'kicker' : 'main')
// const byLane = {}
// for (const c of TL.CAPTIONS) {
//   ok(c.id && c.text, 'caption missing id/text')
//   ok(c.t1 > c.t0, 'caption ' + c.id + ' empty window')
//   ok(c.t0 >= 0 && c.t1 <= TL.DUR + eps, 'caption ' + c.id + ' outside the film')
//   const s = shotOf(c.t0)
//   ok(s && c.t1 <= s.t1 + eps, 'caption ' + c.id + ' t1 crosses its shot cut at ' + (s && s.t1))
//   ok(c.in >= 0 && c.out >= 0 && c.in + c.out < c.t1 - c.t0, 'caption ' + c.id + ' bad in/out rides')
//   ok(c.y >= TL.SAFE.bandY[0] && c.y <= TL.SAFE.captionYMax, 'caption ' + c.id + ' y ' + c.y + ' outside the safe band')
//   const vis = (c.t1 - c.out) - (c.t0 + c.in)
//   if (c.minHold !== undefined) ok(vis >= c.minHold - eps, 'caption ' + c.id + ' visible hold ' + vis.toFixed(2) + ' < minHold ' + c.minHold)
//   else ok(vis >= 3 - eps, 'caption ' + c.id + ' visible hold ' + vis.toFixed(2) + ' < 3')
//   if (c.id !== 't1_hairakiri') ok(c.anim === 'cut' && c.in === 0 && c.out === 0, 'intertitle ' + c.id + ' must be hard in/out (anim cut)')
//   const span = TL.WIPES.find((w) => c.t0 < w.t0 + w.dur - eps && c.t1 > w.t0 + eps)
//   ok(!span, 'caption ' + c.id + ' overlaps wipe ' + (span && span.id))
//   ok(!(c.t1 > TL.MA.mixOut + eps && c.t0 < TL.MA.land - eps), 'caption ' + c.id + ' enters the ma gap')
//   const lane = laneOf(c.y)
//   if (!byLane[lane]) byLane[lane] = []
//   byLane[lane].push(c)
// }
// for (const [lane, caps] of Object.entries(byLane)) {
//   caps.sort((a, b) => a.t0 - b.t0)
//   for (let i = 0; i + 1 < caps.length; i++) {
//     const a = caps[i]
//     const nxt = caps[i + 1]
//     ok(a.t1 <= nxt.t0 + eps, 'lane ' + lane + ': ' + a.id + ' overlaps ' + nxt.id)
//     const gap = nxt.t0 - a.t1
//     const chained = a.id === 'e1_flow' && nxt.id === 'e2_honor'
//     if (chained) ok(Math.abs(gap) < eps, 'declared E1->E2 chain must be contiguous (gap ' + gap + ')')
//     else if (lane === 'main') ok(gap >= 0.9 - eps, 'main lane gap ' + a.id + ' -> ' + nxt.id + ' = ' + gap.toFixed(2) + ' < 0.9')
//   }
// }
// const e2 = TL.CAPTIONS.find((c) => c.id === 'e2_honor')
// const e1 = TL.CAPTIONS.find((c) => c.id === 'e1_flow')
// ok(e2 && e2.minHold === 2.0, 'E2 must carry the declared minHold 2.0 end-card override')
// ok(e1 && e2 && e2.t1 <= TL.DUR - 0.1 + eps, 'end slate must end >= 0.1 s before DUR')
// const t1cap = TL.CAPTIONS.find((c) => c.id === 't1_hairakiri')
// ok(t1cap && (t1cap.t1 - t1cap.out) - (t1cap.t0 + t1cap.in) >= 4 - eps, 'T1 fully-visible must be >= 4 s (story card declaration)')
// near(e1.t0, TL.MASTER.e1In, 'E1 window must be clock-derived (MASTER.e1In)')
// near(e2.t0, TL.MASTER.e2In, 'E2 window must be clock-derived (MASTER.e2In)')
// const c2cap = TL.CAPTIONS.find((c) => c.id === 'c2_bridge')
// const c3cap = TL.CAPTIONS.find((c) => c.id === 'c3_never')
// near(c2cap.t0, TL.DUEL.abs(TL.DUEL_EV.c2In), 'C2 t0 must equal DUEL.abs(c2In)')
// near(c3cap.t0, TL.DUEL.abs(TL.DUEL_EV.c3In), 'C3 t0 must equal DUEL.abs(c3In) (stop arithmetic)')
// near(c3cap.t1, TL.DUEL.abs(TL.DUEL_EV.c3Out), 'C3 t1 must equal DUEL.abs(c3Out)')
// const MANDATED = {
//   k1_province: 'FLOWAGAWA PROVINCE —\nYEAR OF THE RAZOR DECADE',
//   c1_tax: 'THE TAX WAS TAKEN AT BLADE POINT.',
//   t1_hairakiri: 'HAIRAKIRI',
//   c2_bridge: 'THE BRIDGE AT SANOGAWA.\nTHE LAST HOUR OF THE RAIN.',
//   c3_never: 'HE NEVER SPOKE OF IT AGAIN.',
//   c4_spring: 'SPRING CAME EARLY THAT YEAR.',
//   e1_flow: 'THE FLOW ENDURES.',
//   e2_honor: 'HONOR GROWS BACK.',
// }
// for (const [id, want] of Object.entries(MANDATED)) {
//   const c = TL.CAPTIONS.find((x) => x.id === id)
//   ok(c && c.text === want, id + ' text drifts from the mandated line')
// }
//
// // 9. wipes: counts/stagger/direction, ends on boundaries, hard cuts clean
// const WSPEC = {
//   s1s2: { end: TL.T.raid, dur: 0.6, strokes: 1, stagger: 0, dir: 'ul-lr', tip: 'sumi' },
//   s3s4: { end: TL.T.training, dur: 0.8, strokes: 2, stagger: 0.18, dir: 'ur-ll', tip: 'sumi' },
//   s4s5: { end: TL.T.battle, dur: 0.7, strokes: 3, stagger: 0.12, dir: 'tb', tip: 'rain' },
//   s5s6: { end: TL.T.duel, dur: 1.2, strokes: 1, stagger: 0, dir: 'lr', tip: 'sumi-big' },
//   s6s7: { start: TL.T.resolve, dur: 0.8, strokes: 1, stagger: 0, dir: 'bt', tip: 'gold' },
// }
// ok(TL.WIPES.length === 5, 'WIPES must hold the five brush boundaries')
// for (const w of TL.WIPES) {
//   const spec = WSPEC[w.id]
//   ok(spec, 'unexpected wipe ' + w.id)
//   if (!spec) continue
//   if (spec.start !== undefined) near(w.t0, spec.start, 'wipe ' + w.id + ' must start on S7 clock')
//   else near(w.t0 + w.dur, spec.end, 'wipe ' + w.id + ' must END on its boundary')
//   near(w.dur, spec.dur, 'wipe ' + w.id + ' dur drift')
//   ok(w.strokes === spec.strokes, 'wipe ' + w.id + ' stroke count drift')
//   near(w.stagger, spec.stagger, 'wipe ' + w.id + ' stagger drift')
//   ok(w.dir === spec.dir && w.tip === spec.tip, 'wipe ' + w.id + ' dir/tip drift')
// }
// near(TL.HARD_CUTS.s2s3, 22, 'HARD_CUTS.s2s3 must be 22.0')
// near(TL.HARD_CUTS.s6s7, 83, 'HARD_CUTS.s6s7 must be 83.0')
// near(TL.TITLE_UNDERLINE.t0, TL.MASTER.titleIn + 0.4, 'underline must start after the title stroke-in')
// near(TL.TITLE_UNDERLINE.dur, 0.5, 'underline draw must be 0.5 s')
//
// // 10. signature constants + score plan
// near(TL.MA.strike, 72.6, 'MA.strike drift')
// near(TL.WIGSPLIT.t, 74.35, 'WIGSPLIT.t drift')
// ok(TL.WIGSPLIT.travel === 90 && TL.WIGSPLIT.rot === 10 && TL.WIGSPLIT.dur === 0.45, 'WIGSPLIT geometry drift')
// const BROW = [76.75, 77.45, 78.15, 78.85]
// const PLK = [77.2, 77.9, 78.6, 79.3]
// TL.EYEBROW.film.forEach((t, i) => near(t, BROW[i], 'EYEBROW pass ' + (i + 1) + ' drift'))
// TL.EYEBROW.plucks.forEach((t, i) => near(t, PLK[i], 'EYEBROW pluck ' + (i + 1) + ' drift'))
// ok(TL.EYEBROW.spacing === 0.7 && TL.EYEBROW.pluckLag === 0.45, 'EYEBROW rhythm drift')
// near(TL.EYEBROW.bow, 79.35, 'EYEBROW.bow drift')
// near(TL.ENSO.t0, 91, 'ENSO.t0 drift')
// near(TL.ENSO.seal, 95.4, 'ENSO.seal drift')
// ok(TL.ENSO.sweepDeg === 320 && TL.ENSO.apertureDeg === 40, 'ENSO geometry drift')
// ok(JSON.stringify(TL.FLOW) === JSON.stringify([0, 7, 8, 12]) && TL.FLOW_ROOT === 57, 'FLOW motif drift')
// const FLOWMAP = { flowFirst: 29, flowDrill: 44.4, flowBow: 79.35, flowReprise: 83, flowHold: 90.3 }
// for (const [k, v] of Object.entries(FLOWMAP)) {
//   ok(TL.CUES[k] !== undefined, 'CUES missing FLOW entry ' + k)
//   if (TL.CUES[k] !== undefined) near(TL.CUES[k], v, 'CUES.' + k + ' drift')
// }
// ok(TL.SECTIONS.length === TL.SHOTS.length, 'SECTIONS count != SHOTS count')
// const BPM = { province: 76, raid: 76, ronin: 76, training: 76, battle: 152, duel: 76, resolve: 76 }
// TL.SECTIONS.forEach((sec, i) => {
//   const s = TL.SHOTS[i]
//   ok(sec.t0 === s.t0 && sec.t1 === s.t1, 'section ' + sec.name + ' does not match its shot')
//   ok(sec.bpm === BPM[sec.name] && sec.beats > 0, 'section ' + sec.name + ' grid drift')
//   ok(TL.barSec(sec.name) > 0 && TL.beatSec(sec.name) > 0, 'grid helpers broken for ' + sec.name)
//   near(TL.b(sec.name, 1), sec.t0 + TL.barSec(sec.name), 'b() downbeat math broken for ' + sec.name)
// })
// for (const [k, v] of Object.entries(TL.CUES)) {
//   ok(v >= 0 && v <= TL.DUR + eps, 'CUE ' + k + '=' + v + ' outside the film')
// }
//
// // 11. flashes: budget caps
// for (const [t, peak, decay] of TL.FLASHES) {
//   ok(peak <= 0.24 && decay <= 0.2, 'flash at ' + t + ' over budget')
//   ok(t >= 0 && t <= TL.DUR, 'flash at ' + t + ' outside the film')
// }
// ok(TL.flashK(0) === 0, 'flashK before any flash must be 0')
//
// // 12. cast ids + determinism
// const IDS = { ronin: 42, warlord: 3360, giant: 3627, twin: 2620, veteran: 2260, comic: 4322, elder: 960, grandmother: 2186, child: 1020, farmer: 1140, captain: 1926, banditA: 4187, banditB: 23, banditC: 159, vendor: 320 }
// for (const [role, id] of Object.entries(IDS)) {
//   ok(TL.CAST[role] && TL.CAST[role].id === id, 'CAST.' + role + ' must be id ' + id + ' (casting.md)')
// }
// const raw = readFileSync('/Users/z80/dev/remyboysfrontend/films/hairakiri/timeline.js', 'utf8')
// const src = raw.replace(/\/\/.*$/gm, '')
// ok(!/Math\.random|Date\.now|new Date\(/.test(src), 'source contains nondeterminism')
//
// if (fails.length) {
//   console.error('SELF-CHECK FAILED (' + fails.length + '):')
//   for (const f of fails) console.error('  - ' + f)
//   process.exit(1)
// }
// console.log('SELF-CHECK OK: ' + TL.SHOTS.length + ' shots tile [0, ' + TL.DUR + '], ' +
//   TL.CAPTIONS.length + ' captions, ' + TL.SECTIONS.length + ' sections, ' +
//   Object.keys(TL.MASTER).length + ' master events, ' + Object.keys(TL.CUES).length +
//   ' cues, 1 hit-stop (DUEL g8.6 +0.35), 5 brush wipes + 2 hard cuts')
// END SELF-CHECK
//
// Run it with (from the repo root; the [-] class keeps this doc line from
// re-triggering the marker match):
//
//   awk '/BEGIN SELF[-]CHECK/{f=1;next} /END SELF[-]CHECK/{f=0} f' \
//     films/hairakiri/timeline.js | sed 's|^// ||' > /tmp/hairakiri-check.mjs && node /tmp/hairakiri-check.mjs
//
// or run the shipped standalone copy:
//
//   node output/hairakiri/notes/timeline-selfcheck.mjs
