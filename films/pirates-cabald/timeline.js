// PIRATES OF THE CABALD — The Curse of the Black Flow. Cue sheet + choreography:
// the single shared source of truth that picture (film.js/art.js) AND score
// (score.js) both import. 96 s, 1920x1080 @60fps, 2D filmkit full-res painted
// stage (goldflow/hairtanic lineage), letterbox 0.8. All pure functions of time
// (no Math.random, no Date, no state carried between frames).
//
// CLOCK RULE (load-bearing): S5 carries the film's two hit-stops, so for ANY event
// in S5 score and picture MUST resolve film time with DUEL.abs(g). NEVER hand-add
// T.duel + g in that shot — each stop shifts every later event in the shot. Plain
// shots still get a clock (abs = t0 + g exactly) so nobody ever hand-adds.
// An event scheduled AT a stop's g lands at the START of its freeze (intentional).
//
// Deviations from story.md nominal numbers (screenplay agent owns exact numbers;
// story grants +-0.5 s per shot and S3/S6 as trim donors):
//   1. S3 8.0 -> 7.5 s (donor; its own beat sheet ends "g7.5 cut", so nothing
//      inside it moves), S5 12.0 -> 12.5 s. Reason: S5 freezes 0.38 s of film
//      time; without the extra half second the post-freeze quip C7 cannot hold
//      3 s before the cut. DUR stays 96.0 exactly.
//   2. S1 wave-scatter 9.2 -> 10.0. Reason: the subtitle settles at 6.8 and must
//      hold >= 3 s (lint captionHold), so the letters cannot scatter before 9.8.
//   3. Caption C9 "THE FLOW. IT IS GONE." DROPPED per story's own collision rule:
//      it overlaps C10 in the same lane; only the verbatim mandated line C10
//      stays, on C9's start (g4.6).
//   4. Story §3's "Film s (nominal)" column did NOT compensate the S5 stops
//      (E8 47.6 = 39+8.6 raw). Our MASTER values are filmT-true: E8 = DUEL.abs(8.6)
//      = 47.26 (shift -0.5, stop1 +0.16), E9 = 49.18. Story's E7/E9 names kept.
// No film-wide grid: cuts 0/11/19/26.5/38.5/51/59/76/87/96 are not on one uniform
// bar — each score section carries its own grid (see SCORE).

export const DUR = 96

// ---------- shot map (film seconds; contiguous, covers [0, 96) exactly) ----------
// CUTS:  0     11      19      26.5      38.5      51      59      76      87      96
export const T = {
  overture: 0,    // S1 moonlit overture + main title        0-11    (11.0)
  heist: 11,      // S2 the paperwork heist                  11-19   (8.0)
  pursuit: 19,    // S3 black sails on the horizon           19-26.5 (7.5)
  reveal: 26.5,   // S4 the moonlight reveal                 26.5-38.5 (12.0)
  duel: 38.5,     // S5 cutlasses and coin (2 hit-stops)     38.5-51 (12.5)
  flashback: 51,  // S6 882 coins flashback tableau          51-59   (8.0)
  chest: 59,      // S7 the chest on Skullshoal (regrow)     59-76   (17.0)
  sunrise: 76,    // S8 sunrise parole                       76-87   (11.0)
  tag: 87,        // S9 the kraken tag + end card            87-96   (9.0)
}

export const SHOTS = [
  { name: 'overture',   t0: T.overture,  t1: T.heist,     desc: 'Moon-glint sea, Black Flow crosses the moon in silhouette, gold title rises as a reflection, wave scatters it to glitter' },
  { name: 'heist',      t0: T.heist,     t1: T.pursuit,   desc: 'East Baldia wharf: clipboard permit, coin-stamp gag, sail drops, ship leaves with the pier rope, officer double-take, scalp heliograph' },
  { name: 'pursuit',    t0: T.pursuit,   t1: T.reveal,    desc: 'Spyglass finds the Razors Edge in fog, chase intercut, bow-chaser near-miss, grapples fly, cut on first hook biting the rail' },
  { name: 'reveal',     t0: T.reveal,    t1: T.duel,      desc: 'Cabald board as bald silhouettes, moon breaks, one hard moonbeam sweeps port->starboard: 7-tick ghoul domino, then the curse-danced minuet circle' },
  { name: 'duel',       t0: T.duel,      t1: T.flashback, desc: 'Baldbarossa duels Jack under the mainmast: HIT-STOP 1 blade lock (STOPS[0]), halyard crane swing, HIT-STOP 2 earring slice (STOPS[1]), coin ricochets off 3 bells, parrot snatch, reef grind' },
  { name: 'flashback',  t0: T.flashback, t1: T.chest,     desc: 'Gold-vignette tableau: young HAIRY Cabald hoist the Flowtec chest, 4 tablecloth baldify ticks, freeze on Baldbarossa holding his own ponytail, lid slam' },
  { name: 'chest',      t0: T.chest,     t1: T.sunrise,   desc: 'Sea-cave moonshaft: parrot delivery, last coin placed, comedy silence, red strand pluck, lid shuts, beam widens and sweeps starboard->port: 8-tick REGROW money shot, pompadour gag, comb salute' },
  { name: 'sunrise',    t0: T.sunrise,   t1: T.tag,       desc: 'Dawn two-ship sail-out, comb-cannon salute, parrot in a tiny tricorn, rowing officer still waving the stamped permit at horizon scale' },
  { name: 'tag',        t0: T.tag,       t1: DUR,         desc: 'Twin wakes, tilt under: tentacle rises with a tiny comb, tests it on a barnacle, dinner-plate eye opens, HARD CUT to end card + sequel tease' },
]

// ---------- shot clocks: hit-stops freeze world time; shake/flash/score stay real ----------
// Copied verbatim from films/goldflow/timeline.js (the two-stop duel variant).
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

// STOPS — every hit-stop in the film (g = world time the freeze STARTS, shot-local).
// Both live on the S5 duel clock; both map inside that shot:
//   filmT(5.2) = 5.20 -> film 43.70, filmT(8.6) = 8.76 -> film 47.26 (shot len 12.5).
export const STOPS = [
  { g: 5.2, d: 0.16 }, // HIT-STOP 1: blades lock overhead, spark ring (story E7)
  { g: 8.6, d: 0.22 }, // HIT-STOP 2: final parry slices the earring-coin free (story E8)
]

// One clock per shot. Only DUEL carries stops; the rest satisfy abs(g) = t0 + g
// exactly, so score/picture never hand-add t0 + g anywhere.
export const OVERTURE  = makeClock(T.overture)
export const HEIST     = makeClock(T.heist)
export const PURSUIT   = makeClock(T.pursuit)
export const REVEAL    = makeClock(T.reveal)
export const DUEL      = makeClock(T.duel, STOPS)
export const FLASHBACK = makeClock(T.flashback)
export const CHEST     = makeClock(T.chest)
export const DAWN      = makeClock(T.sunrise)
export const KRAKEN    = makeClock(T.tag)

// ---------- per-shot events (g = shot-local WORLD seconds; use CLOCK.abs(g) for film time) ----------
// S1: title forms as a moonbeam reflection; wave scatters the letters to glitter.
export const OVERTURE_EV = {
  glint: 0.0,        // water glint under the moon disc
  silhouette: 2.0,   // Black Flow crosses the moon (curse motif, quiet, celesta)
  titleForm: 4.5,    // MAIN TITLE begins rising off the water (caption T1 t0)
  subtitle: 6.8,     // subtitle settles beneath (caption T2 fully visible here)
  scatter: 10.0,     // wave passes, letters scatter to gold glitter (both captions fade 10.0-10.5)
  cut: 10.5,         // wipe out begins; shot ends 11.0
}

// S2: harbor comedy.
export const HEIST_EV = {
  papers: 0.5,       // permit presented
  stamp: 2.2,        // gold coin used as stamp pad (comic pop + coin seal)
  sail: 3.5,         // sail quietly drops behind them
  depart: 5.0,       // ship departs, pier rope slips the bollard
  hat: 5.0,          // officer's tricorn blows off
  doubleTake: 6.5,   // realization + scalp heliograph gag; music hard-cuts at depart
  cut: 7.5,
}

// S3: night pursuit (7.5 s — story's own beats end at its g7.5 cut).
export const PURSUIT_EV = {
  spyglass: 0.0,     // spyglass POV find begins
  chase: 2.0,        // wide chase intercut, black sails out of the fog
  cannon: 5.2,       // bow-chaser fires
  splash: 5.45,      // near-miss splash
  grapples: 6.5,     // grapples fly
  cut: 7.5,          // first hook bites the rail = the cut
}

// S4: moonlight reveal — the ghoul domino. Ladder = 7 ticks 0.7 apart (REVEAL_LADDER
// below); each tick states the CURSE MOTIF a semitone higher.
export const REVEAL_EV = {
  grapples: 0.0,     // shapes over the rail (bald silhouettes, scalp glints only)
  moonBreaks: 2.5,   // clouds part, beams harden
  beamStart: 3.0,    // moonbeam sweep starts, port -> starboard (L->R)
  beamEnd: 8.0,      // sweep ends (straggler caught by the tail at 7.9)
  minuet: 8.5,       // ghoul minuet circle (the curse dances them)
  cut: 11.0,
}

// Per-crew-member moonbeam sweep (S4). Order = boarding line, port -> starboard;
// Baldbarossa leads at the prow (S3). at = transform tick, end = at + 0.7.
export const REVEAL_TICK_DUR = 0.7
export const REVEAL_LADDER = [
  { id: 347, at: 3.0, end: 3.7 }, // Baldbarossa first over the rail
  { id: 48,  at: 3.7, end: 4.4 },
  { id: 382, at: 4.4, end: 5.1 },
  { id: 233, at: 5.1, end: 5.8 },
  { id: 5,   at: 5.8, end: 6.5 },
  { id: 834, at: 6.5, end: 7.2 },
  { id: 129, at: 7.2, end: 7.9 },
]
// 8th ghoul was behind the mast during the sweep — caught by the beam's tail as it
// dies, off the 7-note musical ladder; he joins the crew minuet and regrows 7th.
export const REVEAL_STRAGGLER = { id: 1217, at: 7.9, end: 8.6 }

// S5: the duel. ALL film times for this shot go through DUEL.abs(g).
// Score discipline (hairtanic rule): no cue STARTS inside [freeze-0.5, freeze+0.4]
// except the pins AT the freeze (DUEL.abs(lock), DUEL.abs(slice)).
export const DUEL_EV = {
  begin: 0.5,        // duel begins (abs 39.00)
  lock: 5.2,         // HIT-STOP 1 pin — abs 43.70, freeze to 43.86 (story E7)
  swing: 5.5,        // halyard hop + crane arc (abs 44.16-46.16)
  swingEnd: 7.5,
  slice: 8.6,        // HIT-STOP 2 pin — abs 47.26, freeze to 47.48 (story E8)
  ricochet: 8.9,     // coin rings 3 rigging bells (curse motif notes) — abs 47.78
  ricochetEnd: 9.4,  // abs 48.28
  catch: 9.6,        // parrot snatches the 882nd coin mid-air — abs 48.48
  reef: 10.3,        // reef shoal grind, both ships lurch, camera shake — abs 49.18
  cut: 11.5,         // abs 50.38; shot ends 51.0
}

// S6: flashback tableau (all living + HAIRY until the baldify ticks).
export const FLASHBACK_EV = {
  tableauIn: 0.5,
  ticks: [1.5, 2.5, 3.5, 4.5], // 4 tablecloth baldify ticks across the crew
  freeze: 5.0,       // final freeze: young Baldbarossa holds his own ponytail, aghast
  lid: 5.5,          // chest lid slams (low piano cluster + felt thud; story E10, abs 56.5)
}

// S7: the chest on Skullshoal — the money shot. Regrow = 8 ticks 0.8 apart,
// beam direction REVERSED (starboard -> port) to rhyme with S4.
export const CHEST_EV = {
  delivery: 0.5,     // parrot flies the earring-coin up through the moonshaft and drops it
  placed: 2.2,       // Baldbarossa catches + places THE LAST COIN
  crab: 3.0,         // hermit crab re-homes into the coin pile
  silence: 4.0,      // comedy beat — MUSIC STOPS DEAD (abs 63.0)
  pluck: 5.0,        // Jack plucks ONE red hair strand (comic twang)
  strandIn: 6.2,     // strand drifts down onto the coin (story E11, abs 65.2)
  lid: 7.2,          // lid eases shut, cave echo
  regrowStart: 7.8,  // moonshaft widens, sweep rolls starboard -> port (abs 66.8)
  regrowEnd: 14.5,   // abs 73.5 (story E12 window, exact)
  cheer: 15.0,       // crews erupt, pompadour gag, comb salute
  cut: 16.5,
}

// Per-crew-member regrow sweep (S7): reverse of S4's order, so Baldbarossa — first
// revealed — is LAST regrown: the blessing ladder's 8th note = the +12 resolution.
export const REGROW_TICK_DUR = 0.8
export const REGROW_LADDER = [
  { id: 129, at: 7.8,  end: 8.6 },
  { id: 834, at: 8.6,  end: 9.4 },
  { id: 5,   at: 9.4,  end: 10.2 }, // the runt — pompadour gag fires at cheer
  { id: 233, at: 10.2, end: 11.0 },
  { id: 382, at: 11.0, end: 11.8 },
  { id: 48,  at: 11.8, end: 12.6 },
  { id: 1217, at: 12.6, end: 13.4 }, // the S4 straggler
  { id: 347, at: 13.4, end: 14.2 }, // Baldbarossa's mane, most glorious, last
]

// S8: sunrise parole.
export const DAWN_EV = {
  sunrise: 0.5,      // sails catch dawn light
  combCannon: 2.5,   // comb-cannon salute (confetti combs; story E13, abs 78.5)
  rower: 5.0,        // rowing officer background callback + S2 pizzicato quote
  craneUp: 7.0,      // crane into the sun crest
  cut: 10.5,
}

// S9: kraken tag.
export const KRAKEN_EV = {
  wake: 0.5,
  tentacle: 2.0,     // kraken rise — tentacle tip with a tiny comb
  combTest: 3.5,     // tests it on a barnacle, delighted
  eye: 5.5,          // dinner-plate eye opens (story E14, abs 92.5)
  hardCut: 6.5,      // HARD CUT to the end card (abs 93.5)
  card: 6.8,         // end card fully up by here (abs 93.8; caption E1 t0)
  stinger: 7.2,      // sequel tease (abs 94.2; caption E2 t0)
}

// ---------- MASTER event table (film-absolute seconds; story.md §3 E1-E14) ----------
// All values DERIVED from the clocks above — never recompute by hand.
export const MASTER = {
  titleSettle: OVERTURE.abs(OVERTURE_EV.titleForm),   // E1 4.5
  scatter: OVERTURE.abs(OVERTURE_EV.scatter),         // E1b 10.0 (was 9.2, see header)
  stamp: HEIST.abs(HEIST_EV.stamp),                   // E2 13.2
  depart: HEIST.abs(HEIST_EV.depart),                 // E3 16.0
  hatGag: HEIST.abs(HEIST_EV.doubleTake),             // E3b 17.5
  cannon: PURSUIT.abs(PURSUIT_EV.cannon),             // E4 24.2
  grapples: PURSUIT.abs(PURSUIT_EV.grapples),         // E4b 25.5
  moonBreaks: REVEAL.abs(REVEAL_EV.moonBreaks),       // E5 29.0 (nominal 29.5)
  ladderStart: REVEAL.abs(REVEAL_EV.beamStart),       // E6 29.5 (nominal 30.0)
  ladderEnd: REVEAL.abs(7.2),                         // E6 last tick 33.7
  hitStop1: DUEL.abs(DUEL_EV.lock),                   // E7 43.70 — freeze START (nominal 44.2)
  hitStop2: DUEL.abs(DUEL_EV.slice),                  // E8 47.26 — freeze START (nominal 47.6)
  reef: DUEL.abs(DUEL_EV.reef),                       // E9 49.18 (nominal 49.3)
  lidSlam: FLASHBACK.abs(FLASHBACK_EV.lid),           // E10 56.5
  silence: CHEST.abs(CHEST_EV.silence),               // E11a 63.0
  strandIn: CHEST.abs(CHEST_EV.strandIn),             // E11 65.2
  regrowStart: CHEST.abs(CHEST_EV.regrowStart),       // E12 66.8
  regrowEnd: CHEST.abs(CHEST_EV.regrowEnd),           // E12 73.5
  combCannon: DAWN.abs(DAWN_EV.combCannon),           // E13 78.5
  krakenEye: KRAKEN.abs(KRAKEN_EV.eye),               // E14 92.5
  hardCut: KRAKEN.abs(KRAKEN_EV.hardCut),             // E14b 93.5
  endCard: KRAKEN.abs(KRAKEN_EV.card),                // 93.8
}

// ---------- safe area ----------
// Letterbox 0.8 house value -> visible band rows ~111..969 at 1080p; captions must
// center at y <= 915 (lint letterbox rule with a size-40 line). Never use the core
// y 930 / y 986 style defaults bare.
export const SAFE = { letterbox: 0.8, bandY: [111, 969], captionYMax: 915 }

// ---------- CAPTIONS ----------
// Styles are the CORE captionStyles (filmkit captions.js): title {anton 132 y540
// anim line in .7 out .5}, sub {30px w500}, caption {grot 40 y930 -> ALWAYS override
// y to 868}, kicker {mono 26 y430 fade track 6}. Per-caption y/in/out are legal
// overrides (all live in CAPTION_DEFAULTS). Lane model:
//   title lane y540 (T1, E1 card) — far apart, no collision
//   sub lane   y660-664 (T2 under T1, E1 credit under card)
//   kicker lane y430 (C1, C8) — sequential, never overlaps
//   main lane  y868 — strictly sequential with >= 0.95 s gaps (no double-print)
//   tease lane y780 (E2 stinger, under the card stack)
// HOLD TABLE: hold = (t1 - out) - (t0 + in); pass >= 3, or >= declared minHold
// (end-card trio only — story sanctions a short-hold slate, goldflow's 1.0 s):
//   t1_title   4.5-10.5  in .7  out .5  hold 4.80 ok
//   t2_sub     6.3-10.5  in .5  out .5  hold 3.20 ok (rises 6.3-6.8, settles on EV.subtitle)
//   c1_kicker 11.0-14.9  in .3  out .4  hold 3.20 ok (two lines)
//   c2_parody 12.0-15.6  in .25 out .2  hold 3.15 ok
//   c3_tag    20.5-24.5  in .3  out .2  hold 3.50 ok
//   c4_tag    30.0-34.0  in .3  out .2  hold 3.50 ok
//   c5_parody 35.0-38.4  in .25 out .1  hold 3.05 ok (over the minuet)
//   c6_parody 39.4-43.0  in .3  out .2  hold 3.10 ok
//   c7_quip   47.4-50.8  in .2  out .1  hold 3.10 ok (fades in ON the hit-stop-2 freeze)
//   c8_kicker 51.5-55.4  in .3  out .3  hold 3.30 ok
//   c10_gag   55.5-58.95 in .2  out .15 hold 3.10 ok (verbatim mandated line; C9 dropped)
//   c11_mech  61.3-64.9  in .25 out .2  hold 3.15 ok (spans the silence joke)
//   c12_money 68.2-72.2  in .3  out .2  hold 3.50 ok (over the regrow sweep)
//   c13_parody 79.0-83.0 in .3  out .2  hold 3.50 ok
//   e1_card   93.8-95.9  in 0   out .4  hold 1.70 minHold 1.0 (anim cut, hard-cut slam)
//   e1_credit 93.9-95.9  in .3  out .4  hold 1.30 minHold 1.0
//   e2_tease  94.2-95.9  in .2  out .15 hold 1.35 minHold 1.0
// Every window ends inside its shot and inside the film; every y <= 915.
export const CAPTIONS = [
  // S1 0-11 overture
  { id: 't1_title', text: 'PIRATES OF THE CABALD', t0: 4.5, t1: 10.5, style: 'title', x: 960, y: 540, anim: 'line', in: 0.7, out: 0.5 },
  { id: 't2_sub', text: 'THE CURSE OF THE BLACK FLOW', t0: 6.3, t1: 10.5, style: 'sub', x: 960, y: 664, anim: 'rise', in: 0.5, out: 0.5 },
  // S2 11-19 paperwork heist
  { id: 'c1_kicker', text: 'EAST BALDIA —\nKEEP SMILING, KEEP STAMPING.', t0: 11.0, t1: 14.9, style: 'kicker', x: 960, y: 430, in: 0.3, out: 0.4 },
  { id: 'c2_parody', text: 'TAKE WHAT YOU CAN. COMB NOTHING BACK.', t0: 12.0, t1: 15.6, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.25, out: 0.2 },
  // S3 19-26.5 pursuit
  { id: 'c3_tag', text: 'BLACK SAILS. BALD DECKS. BAD INTENTIONS.', t0: 20.5, t1: 24.5, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  // S4 26.5-38.5 reveal
  { id: 'c4_tag', text: 'MOONLIGHT. THE HONEST SPOTLIGHT.', t0: 30.0, t1: 34.0, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  { id: 'c5_parody', text: 'SHIVER ME SPLIT ENDS.', t0: 35.0, t1: 38.4, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.25, out: 0.1 },
  // S5 38.5-51 duel — C7 t0 sits inside the HIT-STOP 2 freeze (47.26-47.48);
  // the quip lands on the frozen earring-slice frame while effects bloom through.
  { id: 'c6_parody', text: 'NO PREY, NO PAY. NO HAIR, NO PARLEY.', t0: 39.4, t1: 43.0, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  { id: 'c7_quip', text: 'THAT WAS HIS FAVORITE EAR.', t0: 47.4, t1: 50.8, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.2, out: 0.1 },
  // S6 51-59 flashback — C9 'THE FLOW. IT IS GONE.' DROPPED: it collided with C10
  // in this lane; story rule keeps only the verbatim line on C9's start.
  { id: 'c8_kicker', text: '882 COINS. ONE VERY BAD IDEA.', t0: 51.5, t1: 55.4, style: 'kicker', x: 960, y: 430, in: 0.3, out: 0.3 },
  { id: 'c10_gag', text: 'WHY IS THE FLOW GONE?', t0: 55.5, t1: 58.95, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.2, out: 0.15 },
  // S7 59-76 chest + regrow
  { id: 'c11_mech', text: 'ONE COIN SHORT. ONE HAIR LONG.', t0: 61.3, t1: 64.9, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.25, out: 0.2 },
  { id: 'c12_money', text: 'THE FLOW WAS NEVER GONE.', t0: 68.2, t1: 72.2, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  // S8 76-87 sunrise
  { id: 'c13_parody', text: 'YO HO HO AND A BOTTLE OF TONIC.', t0: 79.0, t1: 83.0, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  // S9 87-96 end card (short-hold slate per story; lint-clean, numeric in/out)
  { id: 'e1_card', text: 'PIRATES OF THE CABALD', t0: 93.8, t1: 95.9, style: 'title', x: 960, y: 540, anim: 'cut', in: 0, out: 0.4, minHold: 1.0 },
  { id: 'e1_credit', text: 'A REMY BOYS PICTURE', t0: 93.9, t1: 95.9, style: 'sub', x: 960, y: 660, anim: 'fade', in: 0.3, out: 0.4, minHold: 1.0 },
  { id: 'e2_tease', text: 'NEXT: DEAD COMBS TELL NO TALES.', t0: 94.2, t1: 95.9, style: 'caption', x: 960, y: 780, anim: 'fade', in: 0.2, out: 0.15, minHold: 1.0 },
]

// ---------- SCORE — shared musical plan (score.js consumes sections + cues; EV supplies the rest) ----------
// Sections are self-contained: each t0 is a downbeat. No film-wide grid (see header).
// 'beats' = beats per bar for b(): 6 on the 6/8 pursuit means an EIGHTH-note pulse.
// S5 duel cues must be scheduled via DUEL.abs(g) — the two freezes shift everything
// after g 5.2 by +0.16 and after g 8.6 by +0.38; the hit pins themselves are the
// ONLY cues allowed inside [freeze-0.5, freeze+0.4].
export const SECTIONS = [
  { name: 'overture',  t0: T.overture, t1: T.heist,   bpm: 96,  beats: 4, key: 'A minor',  feel: 'sea-shanty stomp: low brass + reed + stomps/claps; curse motif quiet on celesta at OVERTURE_EV.silhouette; no drum kit, rigging foley bed' },
  { name: 'heist',     t0: T.heist,    t1: T.pursuit, bpm: 132, beats: 4, key: 'D minor',  feel: 'sneaky pizzicato + woodblock ticks; rim shot + duck at HEIST_EV.stamp; ALL MUSIC HARD-CUTS at HEIST_EV.depart' },
  { name: 'pursuit',   t0: T.pursuit,  t1: T.reveal,  bpm: 144, beats: 6, key: 'A minor',  feel: 'dread 6/8 string ostinato (eighth pulse), chromatic under-glide; curse motif low cellos at +0.3; orchestral hit at PURSUIT_EV.cannon; 7.5 s = exactly 3 bars, cut lands bar-perfect' },
  { name: 'reveal',    t0: T.reveal,   t1: T.duel,    bpm: 110, beats: 3, key: 'A minor',  feel: 'ghostly 3/4 waltz + wordless choir; each REVEAL_LADDER tick states the CURSE MOTIF a semitone higher (7-note ladder); original lilt — quote no existing waltz' },
  { name: 'duel',      t0: T.duel,     t1: T.flashback, bpm: 160, beats: 4, key: 'A minor', feel: 'taiko toms + anvil + cutlass ring; pins AT DUEL.abs(lock)/DUEL.abs(slice) freeze WITH picture; bell notes at DUEL.abs(ricochet..catch); triangle ding at DUEL.abs(catch)' },
  { name: 'flashback', t0: T.flashback, t1: T.chest,  bpm: 72,  beats: 3, key: 'A minor',  feel: 'elegiac solo piano + music box, CURSE MOTIF inverted (descending) soft; cluster + felt thud at FLASHBACK_EV.lid; ends unresolved' },
  { name: 'chest',     t0: T.chest,    t1: MASTER.silence, bpm: 60, beats: 4, key: 'A minor', feel: 'piano tail dies; TRUE SILENCE from MASTER.silence to MASTER.strandIn + cheer gap — the joke IS the silence' },
  { name: 'regrow',    t0: MASTER.strandIn, t1: T.sunrise, bpm: 108, beats: 4, key: 'A major', feel: 'harp gliss at strandIn; REGROW FANFARE downbeat EXACTLY at MASTER.regrowStart: BLESSING MOTIF horns + full choir, ascending bell arpeggio per REGROW_LADDER tick (8 notes, resolves the 7-note curse); held major chord under the cheer' },
  { name: 'sunrise',   t0: T.sunrise,  t1: T.tag,     bpm: 100, beats: 4, key: 'A major', feel: 'warm strings + shanty reprise IN MAJOR; chime cascade at DAWN_EV.combCannon; two bars of quiet S2 pizzicato at DAWN_EV.rower' },
  { name: 'kraken',    t0: T.tag,      t1: DUR,       bpm: 96,  beats: 4, key: 'D minor', feel: 'everything drops out; growl + sub under the tilt; the kraken HUMS the blessing motif at half tempo a fifth down (KRAKEN_ROOT/KRAKEN_RATE); one-stomp button at MASTER.hardCut' },
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

// ---------- motifs (original; MIDI offsets from a root; the dip to +6/+9 is the fingerprint) ----------
export const CURSE_ROOT = 57    // A3
export const CURSE = [0, 3, 7, 6, 3, 0]     // rising minor-third swell, half-step dip below the fifth, unresolved
export const BLESSING_ROOT = 57 // same root, mode-flipped answer
export const BLESSING = [0, 4, 7, 9, 7, 12] // major third + sixth, resolves to the octave
export const KRAKEN_ROOT = 50   // a fifth down: the kraken hums the blessing
export const KRAKEN_RATE = 0.5  // at half tempo
export const motif = (name, root) =>
  (name === 'curse' ? CURSE : BLESSING).map((k) => root + k)

// ---------- named cue anchors (all clock-derived; score.js adds nothing by hand) ----------
export const CUES = {
  overture: T.overture,                        // 0     shanty stomp in
  heist: T.heist,                              // 11    pizzicato in
  pursuit: T.pursuit,                          // 19    dread ostinato in
  reveal: T.reveal,                            // 26.5  waltz in
  duel: T.duel,                                // 38.5  percussion in (cues via DUEL.abs)
  flashback: T.flashback,                      // 51    piano in
  silence: MASTER.silence,                     // 63.0  MUSIC STOPS DEAD
  regrow: MASTER.regrowStart,                  // 66.8  fanfare downbeat (regrow section)
  sunrise: T.sunrise,                          // 76    major reprise in
  krakenSting: KRAKEN.abs(KRAKEN_EV.tentacle), // 89.0  growl + sub thump under the rise
  button: MASTER.hardCut,                      // 93.5  final stomp, done
}

// ---------- CAST (casting.md decision table; ids verified, never guessed) ----------
export const CAST = {
  jack:     { id: 42,  role: 'CAPTAIN JACK FLOW',            u: 25 },
  boss:     { id: 347, role: 'CAPTAIN BALDBAROSSA',          u: 1217 },
  liz:      { id: 12,  role: 'ELIZABETH FLOW',               u: 56 },
  duellist: { id: 48,  role: 'CABALD CREW 1 — THE DUELLIST', u: 834 },
  strand:   { id: 382, role: 'CABALD CREW 2 — THE LAST STRAND', u: 129 },
  violet:   { id: 233, role: 'CABALD CREW 3',                u: 5 },
  runt:     { id: 5,   role: 'CABALD CREW 4 — THE RUNT',     u: 834 },
  gibbs:    { id: 18,  role: 'HERO CREW — STOCKY COMIC',     u: 25 },
  vain:     { id: 30,  role: 'HERO CREW — LANKY, THE VAIN ONE', u: 22 },
  officer:  { id: 1161, role: 'EAST BALDIA OFFICER',         u: 1249 },
}
// u = understudy id (casting.md). 1217 doubles as the S4 straggler ghoul body;
// 834/129 double as extra Cabald rank bodies (REVEAL_LADDER / REGROW_LADDER).

// ---------- ghoul duotone (casting.md moonlight repaint, precomputed pairs) ----------
// skin/dome zone -> bone ramp pair, clothes zone -> cloth ramp pair, accent -> cold mid.
export const GHOUL = {
  347:  { bone: ['#c0bca9', '#a9a693'], cloth: ['#2f374b', '#2d3448'], accent: '#373f54' }, // flame hem stays THE warm accent #c2521e @ 40%
  48:   { bone: ['#aeab98', '#a09c8a'], cloth: ['#8696b4', '#5d6982'], accent: '#424c62' }, // blade cold #9fb4cf, pommel stays gold
  382:  { bone: ['#d0ccb9', '#b2af9c'], cloth: ['#8797b4', '#5d6982'], accent: '#556179' }, // side-tufts bleach to bone #efead8
  233:  { bone: ['#d7d3c0', '#b6b2a0'], cloth: ['#5e6a83', '#475067'], accent: '#394156' },
  5:    { bone: ['#c0bca9', '#a9a693'], cloth: ['#7988a4', '#556179'], accent: '#75849f' },
  1161: { bone: ['#d0ccb9', '#b2af9c'], cloth: ['#2e364a', '#2a3145'], accent: '#6d7a92' }, // if officer appears in a moonlit beat
  1249: { bone: ['#aeaa98', '#a09c89'], cloth: ['#66738d', '#4b566d'], accent: '#5a667f' },
  834:  { bone: ['#d0ccb9', '#b2af9c'], cloth: ['#7e8eaa', '#58647d'], accent: '#535e76' },
  129:  { bone: ['#aeab98', '#a09c8a'], cloth: ['#2a3145', '#2a3145'], accent: '#8798b5' }, // black tee floors at ramp low end
  1217: { bone: ['#c0bca9', '#a9a693'], cloth: ['#7f8eab', '#59647d'], accent: '#5f6b85' },
}
// Shared ghoul constants (casting.md): build ONE transform function driven by
// REVEAL_LADDER / REGROW_LADDER staggered times — never hand-author per-actor variants.
export const GHOUL_SHARED = {
  eyeGlow: '#bfe9ff',   // replace pupils, 1-2 px dots at 2.4x
  socket: '#141b2b',
  boneDeep: '#8e8b78',
  rampBone: ['#8e8b78', '#efead8'],
  rampCloth: ['#2a3145', '#8fa0be'],
  domeRim: '#e6f2ff',   // moon rim-light on domes at 25%
  regrowLerp: 1.2,      // reverse-lerp seconds, bone->skin / cloth->cloth (hair grows from row[1])
}

// ---------- screen flashes: [absoluteT, peak, decay] — peaks <= .3, decay <= .2 ----------
// Night scenes stay restrained; big impacts read as in-scene radial glow instead.
export const FLASHES = [
  [REVEAL.abs(REVEAL_EV.moonBreaks), 0.22, 0.16],
  [DUEL.abs(DUEL_EV.lock), 0.18, 0.08],
  [DUEL.abs(DUEL_EV.slice), 0.24, 0.1],
  [CHEST.abs(CHEST_EV.strandIn), 0.12, 0.1],
  [CHEST.abs(CHEST_EV.regrowStart), 0.16, 0.14],
  [KRAKEN.abs(KRAKEN_EV.eye), 0.14, 0.1],
]
export const flashK = (t) => {
  let k = 0
  for (const f of FLASHES) if (t >= f[0]) k = Math.max(k, f[1] * Math.exp(-(t - f[0]) / f[2]))
  return k
}
