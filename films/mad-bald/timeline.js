// MAD BALD: FURY FLOW — Where the Flow Ran Dry. Cue sheet + choreography: the
// single shared source of truth that picture (film.js/art.js) AND score
// (score.js) both import. 102 s, 1920x1080 @60fps, 2D filmkit full-res painted
// stage (pirates-cabald / wizard-of-floz lineage), letterbox 0.8. First
// post-apocalyptic wasteland chase film in the catalog. All pure functions of
// time (no Math.random, no Date, no state carried between frames).
//
// CLOCK RULE (load-bearing): this is an action film and DECLARES 4 hit-stops
// (total frozen film time 0.78 s), story.md §3:
//   S2 shear    STOPS = [{ g: 4.2, d: 0.22 }]  the clippers SLAM  (E7)
//   S4 chase    STOPS = [{ g: 6.8, d: 0.14 }]  the ram domino      (E19)
//   S9 return   STOPS = [{ g: 7.0, d: 0.30 }]  THE WIG RIP         (E44)
//   S10 flow    STOPS = [{ g: 2.0, d: 0.12 }]  the valve slam       (E47)
// S1/S3/S5/S6/S7/S8 are stop-free: abs(g) = t0 + g exactly. Stopped-shot WORLD
// lengths: S2 9.28, S4 12.86, S9 11.70, S10 10.88. Events AT a stop's g land at
// the freeze START. During a freeze world time is pinned (dust, wheels, flames
// freeze with the picture); only shake, spark rings and caption fades run on
// real stop time. Score: no cue starts inside [freeze-0.5, freeze+0.4] except
// the four pins at E7/E19/E44/E47. makeClock is copied verbatim from
// pirates-cabald/wizard-of-floz for structural parity.
//
// Deviations from story.md nominals (story.md's MASTER E-table is the declared
// self-check anchor; two EV g-columns drifted from it — fixed here to preserve
// every E-value exactly, floz header precedent):
//   1. S9 EV converge  g 0.0 -> 1.0 and doofback  g 1.4 -> 2.4. The story's
//      EV rows printed abs 80.00/81.40 (E-table) but g 0.0/1.4 from t0 79
//      (would give 79.0/80.4). E41/E42 anchor values 80.00/81.40 are preserved;
//      poles g3.0 -> 82.00 already agreed.
//   2. S7 EV mud  g 1.8 -> 1.3 and vuv  g 3.4 -> 2.9. Story rows printed abs
//      62.30/63.90 (E-table) but g from t0 61 gave 62.8/64.4. E33 62.30 and
//      E34 63.90 preserved; downstream events (gone 6.0 -> 67.00 etc.) already
//      agreed. Dawn -> mud gap tightens to 1.3 s; the rake-marks gag loses
//      nothing (c7k_mud window 62.8-66.4 still lands after mud, before gone).
//   No caption, stop or section number changed anywhere. DUR stays 102.0.
//
// Palette law (story §2): saturated ORANGE day / deep BLUE night; TWO licensed
// accents only — Remy's RED (S1 + the S10 regrow, never between) and the doof's
// flame. S6 NIGHT RULE: zero screen-flash rows (any future S6 flash caps at
// 0.12); lightning is in-scene radial light only.

export const DUR = 102

// ---------- shot map (film seconds; contiguous, covers [0, 102) exactly) ----------
// CUTS:  0     8.5    18     30     43     52.5   61     71.5   79     91     102
export const T = {
  wasteland: 0,   // S1 the dune sea (orange day)          0-8.5   (8.5)
  shear: 8.5,     // S2 the grooming hall (amber interior) 8.5-18  (9.5, STOP 0.22)
  citadel: 18,    // S3 the Citadel + the steal            18-30   (12.0)
  chase: 30,      // S4 the chase (max orange)             30-43   (13.0, STOP 0.14)
  defect: 43,     // S5 Nux's conversion                    43-52.5 (9.5)
  storm: 52.5,    // S6 the storm (DEEP BLUE night)        52.5-61 (8.5)
  greenplace: 61, // S7 the mud flats (grey dawn)          61-71.5 (10.5)
  turn: 71.5,     // S8 the turn (D major decision)        71.5-79 (7.5)
  return: 79,     // S9 head-on run + THE WIG RIP          79-91   (12.0, STOP 0.30)
  flow: 91,       // S10 the FLOW rains (golden hour)     91-102  (11.0, STOP 0.12)
}

export const SHOTS = [
  { name: 'wasteland', t0: T.wasteland, t1: T.shear, desc: 'Dune-sea glide: interceptor ticking, two-headed lizard gag (both heads squeak), war boys crest in a V, chain-net capture at sprint (CONTACT.netBag), bag over head with crude eye-holes, upside-down POV, bag cinches' },
  { name: 'shear', t0: T.shear, t1: T.citadel, desc: 'Grooming hall: buckle gag, salon patter to a customer who cannot answer, warning snips, CLIPPERS SLAM at g4.2 (STOP 1) with red-strand spark ring frozen mid-air, full-pass shave (red hair rains — the wound), iron MUZZLE with comb rivet, chained to NUX as blood bag, salute cut' },
  { name: 'citadel', t0: T.citadel, t1: T.chase, desc: 'Citadel glory: towers, terraces, scalps and cups up, the FLOW arcs gold (upside-down cup gag), opera-glasses sneer, vault kick with WE ARE NOT WIGS / WHO SHAVED THE WORLD graffiti, mech-arm steal, wives pile into hatches, rig roars out in a dust wall, mask inhale = doom brass' },
  { name: 'chase', t0: T.chase, t1: T.defect, desc: 'Full chase grammar: Remy splayed on Nux hood as blood-bag ornament, DOOF speaker wall + flame guitar ignites and LEAKS into the score, Nux silver-sprays the mandated line, rig SHOULDER-CHECKS a pursuer into a 3-car barrel-roll domino (STOP 2), harpoon lasso, the chained boarding SWING, through the rear window, wives applaud politely' },
  { name: 'defect', t0: T.defect, t1: T.storm, desc: 'Nux face-plants aboard; mech arm UNMASKS Remy (shorn reveal); wife presses ONE SEED into Nux palm and closes his fingers — the DOOF CHUG STOPS DEAD; WITNESS ME on the tanker top (sting, deadpan chest-taps); Nux takes the nav seat and wipes the white paint off; dusk arrives fast' },
  { name: 'storm', t0: T.storm, t1: T.greenplace, desc: 'NIGHT: orange dies to indigo in two beats, rig lights on, the storm wall with lightning living inside it, pursuers peel away, plunge IN (TUMBLEWIG past the windshield), the eye = blue calm with wheels dutifully spinning, Green Place tale at the wheel, SHINY AND GROWN, dawn cracks behind' },
  { name: 'greenplace', t0: T.greenplace, t1: T.turn, desc: 'Grey dawn: bald mud flats with comb RAKE-MARKS (the saddest gag), half-buried GREEN PLACE -> sign, vuvalini grannies rise from the mud blind (cork + knitting-needle shotguns), the arm sweep THE GREEN PLACE IS GONE, bald crows lift, last follicle seeds, Flowiosa despair beat on the hood — no gags' },
  { name: 'turn', t0: T.turn, t1: T.return, desc: 'Remy stands; the pause; WE\'RE GOING BACK. HE HAS A WIG. WE HAVE WIND. (the whole plan + the wig-rip setup, FLOW THEME first full major); synchronized U-TURN except the grannies\' three-point turn; full send at lens, dust wall' },
  { name: 'return', t0: T.return, t1: T.flow, desc: 'Head-on convergence, GREAT WIG visible a mile off; doof reprise at full fire now AGAINST the war party (doppler); pole-cats vault with boing squash (sidecar knitting gag); Remy one-hands a boarder to the grannies; podium car alongside, bellows inhale; THE WIG RIP at g7.0 (STOP 3, the money freeze, white-strand spark ring); BALD reveal snap zoom, the wig tumbleweeds away; the army wavers, doof detunes' },
  { name: 'flow', t0: T.flow, t1: DUR, desc: 'War boys open the gates themselves; mech arm SLAMS the master valve (STOP 4), THE FLOW RAINS gold; Nux plants the S5 seed, first terrace sprout; REGROW LADDER front/crown/sides/mane (the only saturated-red wide since S1); Flowiosa crowd-surfed, Immortan handed a mop; Remy walks out alone, ONE hair sprouts, plucked, studied, the wind takes it; end card + tease' },
]

// ---------- shot clocks (verbatim house makeClock; stops pin world g) ----------
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

// STOPS — the 4 declared hit-stops (story §3 CLOCK RULE). Named per shot.
export const STOPS = {
  shear: [{ g: 4.2, d: 0.22 }],
  chase: [{ g: 6.8, d: 0.14 }],
  return: [{ g: 7.0, d: 0.30 }],
  flow: [{ g: 2.0, d: 0.12 }],
}
export const STOP_FREE = ['wasteland', 'citadel', 'defect', 'storm', 'greenplace', 'turn']

export const WASTELAND = makeClock(T.wasteland)
export const SHEAR = makeClock(T.shear, STOPS.shear)
export const CITADEL = makeClock(T.citadel)
export const CHASE = makeClock(T.chase, STOPS.chase)
export const DEFECT = makeClock(T.defect)
export const STORM = makeClock(T.storm)
export const GREENPLACE = makeClock(T.greenplace)
export const TURN = makeClock(T.turn)
export const RETURN = makeClock(T.return, STOPS.return)
export const FLOWC = makeClock(T.flow, STOPS.flow) // FLOWC, not FLOW: FLOW is the motif (story §8)

// ---------- per-shot events (g = shot-local WORLD seconds; use CLOCK.abs(g)) ----------
// S1: wasteland — dread played cozy, heat played straight.
export const WASTELAND_EV = {
  glide: 0.0,      // dune-sea wide, lonesome drone, heat shimmer
  lizard: 1.8,     // two-headed lizard gag; both heads squeak (E2)
  crest: 3.0,      // war boys crest the dune in a V; far war drums (E3)
  netBag: 5.0,     // CONTACT.netBag: chain-net capture at full sprint (E4)
  sacked: 6.4,     // bag over head; upside-down eye-hole POV gag (E5)
  cut: 8.3,        // bag cinches; hard cut
}

// S2: shear — the wound. STOP 1 at g4.2 (freeze abs 12.70-12.92).
export const SHEAR_EV = {
  chair: 0.5,      // engine-block barber chair, buckle gag (E6); cape snap g1.4
  snip: 2.6,       // warning snips; Remy's eyes above the cape; dread beat
  clippers: 4.2,   // SLAM + STOP 1 (freeze 12.70-12.92): red-strand spark ring; CONTACT.clippers (E7)
  shave: 5.0,      // full pass, red hair rains; SHEAR motif (E8)
  muzzle: 6.8,     // iron grill mask + comb rivet; the barber's proud pat (E9)
  bloodbag: 7.8,   // chained to NUX; IV tube; Nux's salute (E10)
  cut: 9.2,        // hard cut on the salute (abs 17.92; world length 9.28)
}

// S3: citadel — the tyrant's economy. Stop-free: abs = 18 + g.
export const CITADEL_EV = {
  gate: 0.0,       // citadel wide: towers, pipes, terraces, masses
  spray: 1.8,      // the FLOW arcs gold; cups and scalps up; upside-down cup gag (E11)
  sneer: 3.4,      // opera glasses sweep; MEDIOCRE FOLLICLES (caption leads 0.2) (E12)
  vault: 5.0,      // vault door kicked; graffiti wall; wives + seed pouch (E13)
  steal: 6.6,      // mech arm to the cab rail; wives pile into hatches (E14)
  roar: 8.2,       // rig roars out in a dust wall; mask inhale = doom brass in (E15)
  cut: 11.5,       // hard cut chasing the dust (abs 29.5)
}

// S4: chase — the doof is the score. STOP 2 at g6.8 (freeze abs 36.80-36.94).
export const CHASE_EV = {
  party: 0.0,      // war party crests; Remy splayed on Nux's hood (E16)
  doof: 1.4,       // DOOF CHUG ignites; flame licks synced; speaker wall reads (E17)
  sprayDay: 4.4,   // Nux silver mouth-spray; the mandated lovely-day line (E18)
  ramDomino: 6.8,  // COLLIDE.ramDomino + STOP 2: rig checks pursuer into 3-car domino (E19)
  resume: 7.2,     // domino completes; pinwheels; catapult gags (abs 37.34)
  lasso: 9.0,      // CONTACT.lasso: chain bites the tailgate; sag->taut over 6 frames (E20)
  swing: 10.2,     // the boarding swing: one ballistic arc, car -> rig window (E21)
  aboard: 11.4,    // CONTACT.swingCatch lands: through the rear window, glass; wives applaud (E22)
  cut: 12.6,       // hard cut (abs 42.74; world length 12.86)
}

// S5: defect — the conversion. Stop-free: abs = 43 + g.
export const DEFECT_EV = {
  tumble: 0.0,     // CONTACT.tumbleNux: face-plant aboard; chain swings (E23)
  unmuzzle: 1.6,   // mech arm un-masks Remy; the shorn reveal; muzzle springs away (E24)
  seed: 3.2,       // CONTACT.seedPress: one seed into the palm; DOOF STOPS DEAD (E25)
  witness: 5.2,    // WITNESS ME. silver spray on the tanker top; sting; chest-taps (E26)
  defect: 7.0,     // Nux takes the nav seat; wipes the white paint off (E27)
  cut: 9.1,        // hard cut on dusk (abs 52.1)
}

// S6: storm — the deep blue night. Stop-free: abs = 52.5 + g. ZERO screen flashes.
export const STORM_EV = {
  dusk: 0.0,       // orange -> indigo in two beats; rig lights on (E28)
  stormwall: 1.6,  // the storm wall; pursuers' lights peel away (E29)
  into: 3.0,       // plunge; lightning silhouettes; TUMBLEWIG past the windshield (E30)
  calm: 4.6,       // the eye: blue calm, drifting rig, wheels still spinning (E31)
  tale: 5.3,       // Green Place tale at the wheel; SHINY AND GROWN (E32)
  cut: 8.1,        // hard cut on dawn behind (abs 60.6)
}

// S7: greenplace — hope's corpse. Stop-free: abs = 61 + g.
export const GREENPLACE_EV = {
  dawn: 0.0,       // storm cracking into grey light
  mud: 1.3,        // bald mud flats, rake-marks; buried GREEN PLACE -> sign (E33) [see header fix 2]
  vuv: 2.9,        // grannies rise from the mud blind; cork + knitting needle (E34) [header fix 2]
  gone: 6.0,       // the arm sweep: THE GREEN PLACE IS GONE; bald crows lift (E35)
  seeds: 7.5,      // pouch open: the last follicle seeds; "we dig."
  despair: 8.5,    // Flowiosa on the hood; the despair beat; no gags (E36)
  cut: 10.1,       // hard cut (abs 71.1)
}

// S8: turn — nine words. Stop-free: abs = 71.5 + g.
export const TURN_EV = {
  fewwords: 0.0,   // Remy stands; the pause; heartbeat only (E37)
  plan: 1.3,       // the mandated line + one-liner; FLOW THEME full major (E38)
  uturn: 3.1,      // synchronized skid U-turn; grannies' three-point-turn gag (E39)
  fullsend: 5.1,   // head-on run begins; dust wall; acceleration at lens (E40)
  cut: 7.1,        // hard cut at speed (abs 78.6)
}

// S9: return — the rip. STOP 3 at g7.0 (freeze abs 86.00-86.30, the money freeze).
export const RETURN_EV = {
  converge: 1.0,   // head-on convergence; the wig visible at distance (E41) [header fix 1]
  doofback: 2.4,   // doof reprise at full flame, now against the war party; doppler (E42)
  poles: 3.0,      // pole-cats vault; tanker boings; sidecar knitting gag (E43)
  poleCatch: 4.8,  // CONTACT.poleCatch: Remy one-hands a boarder to the grannies (abs 83.80)
  alongside: 6.0,  // podium car pulls level; bellows inhale; the sneer mouthed (abs 85.00)
  wigRip: 7.0,     // CONTACT.wigRip + STOP 3 (freeze 86.00-86.30): white-strand spark ring (E44)
  bald: 7.8,       // BALD reveal, snap zoom; the wig tumbleweeds into the wind (E45)
  waver: 9.4,      // the army wavers: goggles up, harpoons droop; doof falters (E46)
  cut: 11.2,       // hard cut on the citadel horizon (abs 90.5; world length 11.7)
}

// S10: flow — the payoff. STOP 4 at g2.0 (freeze abs 93.00-93.12).
export const FLOW_EV = {
  gates: 0.0,      // war boys open the gates themselves; the waver reached home
  valve: 2.0,      // CONTACT.valveSlam + STOP 4 (freeze 93.00-93.12): master valve (E47)
  rain: 3.0,       // THE FLOW RAINS gold; cups, scalps, faces (E48)
  crowdSprout: 3.8, // NUX plants his S5 seed on a terrace; first sprout pops (abs 94.92)
  regrow: 4.0,     // REGROW LADDER tick 1 of 4 (front) — see REGROW_LADDER (E49)
  lifted: 6.4,     // CONTACT.crowdSurf: Flowiosa lifted; Immortan + mop demotion gag (E50)
  walk: 7.2,       // Remy walks out the far gate, alone (E51)
  sprout1: 7.8,    // one single hair sprouts (E52)
  pluck: 8.3,      // CONTACT.pluck: the pluck, comic twang, studied against the sun (E53)
  windTake: 8.8,   // the wind takes it; kicker echo lands (E54)
  card: 9.2,       // end card slate over the darkening gold (E55)
  end: 9.5,        // card holds; grade darkens to black (abs 100.62; world length 10.88)
}

// REGROW LADDER (story §8): four CLOCK-PINNED ticks + resolve — grid notes NEVER.
export const REGROW_LADDER = [
  { zone: 'front', g: 4.0, midi: 62 },
  { zone: 'crown', g: 4.5, midi: 64 },
  { zone: 'sides', g: 5.0, midi: 66 },
  { zone: 'mane', g: 5.5, midi: 69 },
].map((tk) => ({ ...tk, abs: FLOWC.abs(tk.g) })) // 95.12 / 95.62 / 96.12 / 96.62
export const REGROW_RESOLVE = { abs: FLOWC.abs(6.0), midi: 74 } // 97.12 — SHEAR inverted, full circle
export const REGROW_LERP = 1.2 // s, scalp -> native crimson per zone (casting REPAINT_SHARED.regrowLerp)

// ---------- MASTER event table (film-absolute; story §3 E1-E55, stop-shifted ★) ----------
// All values DERIVED from the clocks above — never recompute by hand.
export const MASTER = {
  glide: WASTELAND.abs(WASTELAND_EV.glide),                 // E1   0.00
  lizard: WASTELAND.abs(WASTELAND_EV.lizard),               // E2   1.80
  crest: WASTELAND.abs(WASTELAND_EV.crest),                 // E3   3.00
  netBag: WASTELAND.abs(WASTELAND_EV.netBag),               // E4   5.00
  sacked: WASTELAND.abs(WASTELAND_EV.sacked),               // E5   6.40
  chair: SHEAR.abs(SHEAR_EV.chair),                         // E6   9.00
  clippers: SHEAR.abs(SHEAR_EV.clippers),                   // E7 ★ 12.70 freeze START
  shave: SHEAR.abs(SHEAR_EV.shave),                         // E8 ★ 13.72
  muzzle: SHEAR.abs(SHEAR_EV.muzzle),                       // E9 ★ 15.52
  bloodbag: SHEAR.abs(SHEAR_EV.bloodbag),                   // E10 ★ 16.52
  spray: CITADEL.abs(CITADEL_EV.spray),                     // E11  19.80
  sneer: CITADEL.abs(CITADEL_EV.sneer),                     // E12  21.40
  vault: CITADEL.abs(CITADEL_EV.vault),                     // E13  23.00
  steal: CITADEL.abs(CITADEL_EV.steal),                     // E14  24.60
  roar: CITADEL.abs(CITADEL_EV.roar),                       // E15  26.20
  party: CHASE.abs(CHASE_EV.party),                         // E16  30.00
  doof: CHASE.abs(CHASE_EV.doof),                           // E17  31.40
  sprayDay: CHASE.abs(CHASE_EV.sprayDay),                   // E18  34.40
  ramDomino: CHASE.abs(CHASE_EV.ramDomino),                 // E19 ★ 36.80 freeze START
  lasso: CHASE.abs(CHASE_EV.lasso),                         // E20 ★ 39.14
  swing: CHASE.abs(CHASE_EV.swing),                         // E21 ★ 40.34
  aboard: CHASE.abs(CHASE_EV.aboard),                       // E22 ★ 41.54
  tumble: DEFECT.abs(DEFECT_EV.tumble),                     // E23  43.00
  unmuzzle: DEFECT.abs(DEFECT_EV.unmuzzle),                 // E24  44.60
  seed: DEFECT.abs(DEFECT_EV.seed),                         // E25  46.20 — score hard-out
  witness: DEFECT.abs(DEFECT_EV.witness),                   // E26  48.20
  defect: DEFECT.abs(DEFECT_EV.defect),                     // E27  50.00
  dusk: STORM.abs(STORM_EV.dusk),                           // E28  52.50
  stormwall: STORM.abs(STORM_EV.stormwall),                 // E29  54.10
  into: STORM.abs(STORM_EV.into),                           // E30  55.50
  calm: STORM.abs(STORM_EV.calm),                           // E31  57.10
  tale: STORM.abs(STORM_EV.tale),                           // E32  57.80
  mud: GREENPLACE.abs(GREENPLACE_EV.mud),                   // E33  62.30 [header fix 2]
  vuv: GREENPLACE.abs(GREENPLACE_EV.vuv),                   // E34  63.90 [header fix 2]
  gone: GREENPLACE.abs(GREENPLACE_EV.gone),                 // E35  67.00
  despair: GREENPLACE.abs(GREENPLACE_EV.despair),           // E36  69.50
  fewwords: TURN.abs(TURN_EV.fewwords),                     // E37  71.50
  plan: TURN.abs(TURN_EV.plan),                             // E38  72.80
  uturn: TURN.abs(TURN_EV.uturn),                           // E39  74.60
  fullsend: TURN.abs(TURN_EV.fullsend),                     // E40  76.60
  converge: RETURN.abs(RETURN_EV.converge),                 // E41  80.00 [header fix 1]
  doofback: RETURN.abs(RETURN_EV.doofback),                 // E42  81.40 [header fix 1]
  poles: RETURN.abs(RETURN_EV.poles),                       // E43  82.00
  wigRip: RETURN.abs(RETURN_EV.wigRip),                     // E44 ★ 86.00 freeze START (money)
  bald: RETURN.abs(RETURN_EV.bald),                         // E45 ★ 87.10
  waver: RETURN.abs(RETURN_EV.waver),                       // E46 ★ 88.70
  valve: FLOWC.abs(FLOW_EV.valve),                          // E47 ★ 93.00 freeze START
  rain: FLOWC.abs(FLOW_EV.rain),                            // E48 ★ 94.12
  regrow: FLOWC.abs(FLOW_EV.regrow),                        // E49 ★ 95.12 (ladder tick 1)
  lifted: FLOWC.abs(FLOW_EV.lifted),                        // E50 ★ 97.52
  walk: FLOWC.abs(FLOW_EV.walk),                            // E51 ★ 98.32
  sprout1: FLOWC.abs(FLOW_EV.sprout1),                      // E52 ★ 98.92
  pluck: FLOWC.abs(FLOW_EV.pluck),                          // E53 ★ 99.42
  windTake: FLOWC.abs(FLOW_EV.windTake),                    // E54 ★ 99.92
  card: FLOWC.abs(FLOW_EV.card),                            // E55 ★ 100.32
}

// Freeze windows (abs), for picture + score discipline checks. NOTE: story.md
// printed the wigRip window as [86.00, 86.90] — a typo against its own d:0.30
// and its own 0.78 s stop total; the real window is [86.00, 86.30] (clock math
// was always d-derived and is unaffected; nothing lands in 86.30-86.90).
export const FREEZES = [
  { name: 'clippers', t0: 12.70, t1: 12.92 },
  { name: 'ramDomino', t0: 36.80, t1: 36.94 },
  { name: 'wigRip', t0: 86.00, t1: 86.30 },
  { name: 'valve', t0: 93.00, t1: 93.12 },
]

// ---------- collision registry (story §7; all clock-derived) ----------
export const CONTACT = {
  netBag: MASTER.netBag,
  clippers: MASTER.clippers,
  ramDomino: MASTER.ramDomino,
  lasso: MASTER.lasso,
  swingCatch: MASTER.swing,
  tumbleNux: MASTER.tumble,
  seedPress: MASTER.seed,
  poleSwat: MASTER.poles,
  poleCatch: RETURN.abs(RETURN_EV.poleCatch),
  wigRip: MASTER.wigRip,
  valveSlam: MASTER.valve,
  crowdSurf: MASTER.lifted,
  pluck: MASTER.pluck,
}

// ---------- chase physics constants (story §7; film.js owns the s(g) lookups) ----------
export const SPEED = {
  rig: { s4: [[0, 0], [6.8, 620], [7.2, 640], [12.86, 640]], s6: 300, s9: 1180, s10: [[0, 400], [2.0, 80], [3.0, 0]] },
  nuxCar: 'rig-relative x = 340 + 90 sin(0.9g + phi_id), phi from hash(id) — rubber-band pursuit',
  podium: 'closes x_rel 1400 -> 260 eased 0.85, arriving alongside exactly at g6.0',
  rule: 'precompute integrated s(g) lookups in prepare(); draw interpolated; NEVER per-frame integration',
}
export const PARALLAX = { sky: 0.05, farDunes: 0.18, midDunes: 0.45, ground: 1.0, scrub: 1.55, stormStreak: 1.2 }
export const WHEEL_R = 26 // px at 3.0x; theta = s/r; 8 spokes; eye keeps a spin floor
export const DUST = { every: 0.22, life: 0.9 } // immutable {g,x,y,seed} events; freeze with world time
export const WAVES = { witnessStagger: 0.12 } // S9 waver: goggles-up chest-tap wave, left-to-right

// ---------- safe area ----------
export const SAFE = { letterbox: 0.8, bandY: [111, 969], captionYMax: 915 }

// ---------- CAPTIONS ----------
// Styles are the CORE captionStyles: title {anton 132 y540 anim line}, sub {30px
// w500}, caption {grot 40 y930 -> ALWAYS override y}, kicker {mono 26 y430 track 6}.
// Lane model: title y540 (t1_title, e1_card) / sub y660 (t2_sub, e1_credit) /
// kicker y430 (c2k, c3k, c7k, c10k — never overlapping within the lane) /
// main y868 (two-line pills y878 size 38; strictly sequential, gaps >= 0.9,
// minimum exactly 0.90 c3_med -> c3_notwigs) / tease y780 (e2_tease).
// c4_day may lift to y826 if the hood actor collides (floz c9 precedent).
// HOLD TABLE: hold = (t1 - out) - (t0 + in); pass >= 3, or >= declared minHold.
//   t1_title   1.8-6.2    in .7  out .5  hold 3.20
//   t2_sub     3.4-7.3    in .5  out .4  hold 3.00
//   c1_hero    4.6-8.1    in .3  out .2  hold 3.00
//   c2k_house  9.9-13.5   in .3  out .3  hold 3.00
//   c2_trim    13.9-17.4  in .3  out .2  hold 3.00
//   c3_med     21.0-24.5  in .3  out .2  hold 3.00  MANDATED
//   c3k_who    22.6-26.2  in .3  out .3  hold 3.00  MANDATED
//   c3_notwigs 25.4-28.9  in .3  out .2  hold 3.00  MANDATED (gap from c3_med exactly 0.90)
//   c4_day     34.2-38.2  in .3  out .2  hold 3.50  MANDATED two-line y878
//   c4_tickets 39.4-42.9  in .3  out .2  hold 3.00
//   c5_witness 47.9-51.4  in .3  out .2  hold 3.00  MANDATED
//   c6_shiny   57.4-60.95 in .3  out .2  hold 3.05  MANDATED
//   c7k_mud    62.8-66.4  in .3  out .3  hold 3.00
//   c7_gone    66.6-70.1  in .3  out .2  hold 3.00  MANDATED
//   c8_back    72.5-76.6  in .3  out .2  hold 3.60  MANDATED x2 one pill y878
//   c9_witnessthat 86.2-89.7 in .3 out .2 hold 3.00 MANDATED (t0 inside the wig freeze, sanctioned)
//   c10_mane   95.0-98.5  in .3  out .2  hold 3.00  MANDATED
//   c10k_day   99.6-101.9 in .3  out .3  hold 1.70 minHold 1.70 (last line, rides into the slate)
//   e1_card    100.3-101.9 in 0  out .4 hold 1.20 minHold 1.0
//   e1_credit  100.4-101.9 in .15 out .25 hold 1.10 minHold 1.0
//   e2_tease   100.5-101.9 in .2  out .1  hold 1.10 minHold 1.0
export const CAPTIONS = [
  // S1 0-8.5 wasteland
  { id: 't1_title', text: 'MAD BALD: FURY FLOW', t0: 1.8, t1: 6.2, style: 'title', x: 960, y: 540, anim: 'line', in: 0.7, out: 0.5 },
  { id: 't2_sub', text: 'WHERE THE FLOW RAN DRY', t0: 3.4, t1: 7.3, style: 'sub', x: 960, y: 660, anim: 'rise', in: 0.5, out: 0.4 },
  { id: 'c1_hero', text: 'HERO #42. RED. UNAUTHORIZED.', t0: 4.6, t1: 8.1, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  // S2 8.5-18 shear
  { id: 'c2k_house', text: 'HOUSE RULE: HAIR IS POWER.', t0: 9.9, t1: 13.5, style: 'kicker', x: 960, y: 430, anim: 'fade', in: 0.3, out: 0.3 },
  { id: 'c2_trim', text: 'HE CAME IN FOR A TRIM.', t0: 13.9, t1: 17.4, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  // S3 18-30 citadel
  { id: 'c3_med', text: 'MEDIOCRE FOLLICLES.', t0: 21.0, t1: 24.5, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  { id: 'c3k_who', text: 'WHO SHAVED THE WORLD?', t0: 22.6, t1: 26.2, style: 'kicker', x: 960, y: 430, anim: 'fade', in: 0.3, out: 0.3 },
  { id: 'c3_notwigs', text: 'WE ARE NOT WIGS.', t0: 25.4, t1: 28.9, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  // S4 30-43 chase
  { id: 'c4_day', text: 'OH WHAT A DAY.\nWHAT A LOVELY BALD DAY.', t0: 34.2, t1: 38.2, style: 'caption', x: 960, y: 878, size: 38, anim: 'fade', in: 0.3, out: 0.2 },
  { id: 'c4_tickets', text: 'TICKETS, PLEASE.', t0: 39.4, t1: 42.9, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  // S5 43-52.5 defect
  { id: 'c5_witness', text: 'WITNESS ME.', t0: 47.9, t1: 51.4, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  // S6 52.5-61 storm
  { id: 'c6_shiny', text: 'SHINY AND GROWN.', t0: 57.4, t1: 60.95, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  // S7 61-71.5 greenplace
  { id: 'c7k_mud', text: 'YES. THE MUD IS ALSO BALD.', t0: 62.8, t1: 66.4, style: 'kicker', x: 960, y: 430, anim: 'fade', in: 0.3, out: 0.3 },
  { id: 'c7_gone', text: 'THE GREEN PLACE IS GONE.', t0: 66.6, t1: 70.1, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  // S8 71.5-79 turn
  { id: 'c8_back', text: "WE'RE GOING BACK.\nHE HAS A WIG. WE HAVE WIND.", t0: 72.5, t1: 76.6, style: 'caption', x: 960, y: 878, size: 38, anim: 'fade', in: 0.3, out: 0.2 },
  // S9 79-91 return — c9 t0 sits INSIDE the wig freeze (86.00-86.30), pirates C7 pattern
  { id: 'c9_witnessthat', text: 'WITNESS THAT.', t0: 86.2, t1: 89.7, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  // S10 91-102 flow
  { id: 'c10_mane', text: 'THE MANE EVENT.', t0: 95.0, t1: 98.5, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.2 },
  { id: 'c10k_day', text: 'WHAT A LOVELY DAY.', t0: 99.6, t1: 101.9, style: 'kicker', x: 960, y: 430, anim: 'fade', in: 0.3, out: 0.3, minHold: 1.7 },
  { id: 'e1_card', text: 'MAD BALD: FURY FLOW', t0: 100.3, t1: 101.9, style: 'title', x: 960, y: 540, anim: 'cut', in: 0, out: 0.4, minHold: 1.0 },
  { id: 'e1_credit', text: 'A REMY BOYS PICTURE', t0: 100.4, t1: 101.9, style: 'sub', x: 960, y: 660, anim: 'fade', in: 0.15, out: 0.25, minHold: 1.0 },
  { id: 'e2_tease', text: 'NEXT: THE TUMBLEWIG.', t0: 100.5, t1: 101.9, style: 'caption', x: 960, y: 780, anim: 'fade', in: 0.2, out: 0.1, minHold: 1.0 },
]

// ---------- SCORE — shared musical plan (score.js consumes sections + cues) ----------
// Sections are self-contained: each t0 is a downbeat. No film-wide grid (house
// precedent). The four pins (clippers/ramDomino/wigRip/valve) are CLOCK-derived;
// no cue starts inside [freeze-0.5, freeze+0.4] except those four.
export const SECTIONS = [
  { name: 'wasteland', t0: T.wasteland, t1: T.shear, bpm: 84, beats: 4, key: 'D minor', feel: 'lone drone (osc+noise, didgeridoo-ish) + heat whistle; FLOW THEME half-speed, unresolved (hope is scarce); far war drums enter at crest' },
  { name: 'shear', t0: T.shear, t1: T.citadel, bpm: 96, beats: 4, key: 'D minor', feel: 'taut heartbeat kick + scissor-snap percussion; SHEAR motif under shave; clippers buzz PIN at E7 12.70 — stops WITH picture' },
  { name: 'citadel', t0: T.citadel, t1: T.chase, bpm: 108, beats: 4, key: 'D harm. minor -> F major', feel: 'IMMORTAN DOOM at spray 19.80 (0.25 Hz bellows LFO = the mask breath); cult choir under sneer; vault 23.00 pivots to music-box FLOW THEME MAJOR (the wives carry hope); v8-roar percussion from steal' },
  { name: 'chase', t0: T.chase, t1: T.defect, bpm: 140, beats: 4, key: 'E minor', feel: 'THE DOOF CHUG: diegetic distorted dropped-E ostinato, 8th-note chug + flame-lick fills, LEAKS into the score — the score IS the doof; ram PIN at 36.80' },
  { name: 'defect', t0: T.defect, t1: T.storm, bpm: 140, beats: 4, key: 'E minor (halts)', feel: 'chug continues 3.2 s then TRUE SILENCE from seed 46.20 for ~1.4 s (the conversion); WITNESS STING at 48.20; music-box FLOW THEME solo from defect 50.00' },
  { name: 'storm', t0: T.storm, t1: T.greenplace, bpm: 60, beats: 4, key: 'B minor', feel: 'deep blue pad, wind the only percussion; DOOM inverted/sleeping, filtered; FLOW THEME minor fragment at tale; loudness a step down — the quiet IS the palette' },
  { name: 'greenplace', t0: T.greenplace, t1: T.turn, bpm: 66, beats: 3, key: 'D minor', feel: 'grey lament, solo cello; floor drops to sub-only at gone 67.00; despair cello FLOW THEME minor at 69.50' },
  { name: 'turn', t0: T.turn, t1: T.return, bpm: 96, beats: 4, key: 'D major', feel: 'heartbeat only into plan; FLOW THEME FIRST FULL MAJOR ENSEMBLE at 72.80 (the decision resolves the hope-note); reverse riser under uturn; tightens toward fullsend' },
  { name: 'return', t0: T.return, t1: T.flow, bpm: 140, beats: 4, key: 'E minor', feel: 'DOOF CHUG reprise with doppler — the war party music turns on them; wig-rip PIN 86.00; bald 87.10 = WITNESS STING + chug detunes a quarter-tone, drops one voice per 0.5 s through waver 88.70; unresolved into the cut' },
  { name: 'flow', t0: T.flow, t1: DUR, bpm: 108, beats: 4, key: 'D major', feel: 'valve PIN 93.00; harp gliss at rain 94.12; REGROW LADDER clock pins 95.12/95.62/96.12/96.62 resolving 97.12 (SHEAR inverted); crowd choir at lifted 97.52; solo celesta from walk 98.32; comic pluck twang 99.42; one soft button at card 100.32' },
]

// Bar/beat grid helpers. b(section, bar, beat) -> absolute film seconds.
const SECT = {}
for (const s of SECTIONS) SECT[s.name] = s
export const b = (name, bar, beat = 0) => {
  const s = SECT[name]
  return s.t0 + ((bar * s.beats + beat) * 60) / s.bpm
}
export const barSec = (name) => (SECT[name].beats * 60) / SECT[name].bpm
export const beatSec = (name) => 60 / SECT[name].bpm

// ---------- motifs (original; MIDI offsets from a root; quote nothing) ----------
export const FLOW_ROOT = 62 // D4 — the hope motif register
export const FLOW = [0, 4, 7, 14] // rise and hang on the 9th; the 14 NEVER resolves until told to
export const FLOW_FULL = [0, 4, 7, 12] // resolution form (the plan; the regrow)
export const SHEAR_ROOT = 55 // G3 — the wound register
export const SHEAR_M = [0, -1, -2, -4] // fast descending shred; the regrow answers inverted.
// (SHEAR_M, not SHEAR: SHEAR is the S2 clock — same collision FLOW/FLOWC avoids.)
export const DOOM_ROOT = 38 // D2 — bellows brass
export const DOOM = [0, 3, 7] // cluster; gain LFO at 0.25 Hz = the mask breath rate
export const DOOM_LFO = 0.25
export const WITNESS_ROOT = 86 // silver shimmer register
export const motif = (name, root) =>
  (name === 'flow' ? FLOW : name === 'flowFull' ? FLOW_FULL : name === 'shear' ? SHEAR_M : DOOM).map((k) => root + k)

// ---------- named cue anchors (all clock-derived; score.js adds nothing by hand) ----------
export const CUES = {
  wasteland: T.wasteland,                                 // 0.00  drone in
  crest: MASTER.crest,                                    // 3.00  far war drums (E3)
  chair: MASTER.chair,                                    // 9.00  heartbeat in (E6)
  clippers: MASTER.clippers,                              // 12.70 PIN — buzz stops WITH picture (E7)
  bloodbag: MASTER.bloodbag,                              // 16.52 salute (E10)
  spray: MASTER.spray,                                    // 19.80 DOOM enters (E11)
  vault: MASTER.vault,                                    // 23.00 music-box major pivot (E13)
  roar: MASTER.roar,                                      // 26.20 v8 percussion (E15)
  doof: MASTER.doof,                                      // 31.40 THE CHUG ignites (E17)
  ram: MASTER.ramDomino,                                  // 36.80 PIN (E19)
  swing: MASTER.swing,                                    // 40.34 boarding swing (E21)
  glass: MASTER.aboard,                                   // 41.54 glass + applause (E22)
  seed: MASTER.seed,                                      // 46.20 HARD OUT — true silence (E25)
  witness: MASTER.witness,                                // 48.20 WITNESS STING (E26)
  defect: MASTER.defect,                                  // 50.00 music-box solo (E27)
  stormwall: MASTER.stormwall,                            // 54.10 wind only (E29)
  calm: MASTER.calm,                                      // 57.10 the eye (E31)
  tale: MASTER.tale,                                      // 57.80 FLOW minor fragment (E32)
  mud: MASTER.mud,                                        // 62.30 grey lament (E33)
  gone: MASTER.gone,                                      // 67.00 sub-only floor (E35)
  despair: MASTER.despair,                                // 69.50 despair cello (E36)
  plan: MASTER.plan,                                      // 72.80 FLOW FULL MAJOR (E38)
  uturn: MASTER.uturn,                                    // 74.60 reverse riser (E39)
  fullsend: MASTER.fullsend,                              // 76.60 tighten (E40)
  converge: MASTER.converge,                              // 80.00 chug reprise, doppler (E41)
  wigrip: MASTER.wigRip,                                  // 86.00 PIN — the money freeze (E44)
  bald: MASTER.bald,                                      // 87.10 sting + detune (E45)
  waver: MASTER.waver,                                    // 88.70 voices drop (E46)
  valve: MASTER.valve,                                    // 93.00 PIN (E47)
  rain: MASTER.rain,                                      // 94.12 harp gliss (E48)
  regrow1: REGROW_LADDER[0].abs,                          // 95.12 CLOCK PIN (E49)
  regrow2: REGROW_LADDER[1].abs,                          // 95.62 CLOCK PIN
  regrow3: REGROW_LADDER[2].abs,                          // 96.12 CLOCK PIN
  regrow4: REGROW_LADDER[3].abs,                          // 96.62 CLOCK PIN
  resolve: REGROW_RESOLVE.abs,                            // 97.12 CLOCK PIN — SHEAR inverted
  lifted: MASTER.lifted,                                  // 97.52 crowd choir (E50)
  walk: MASTER.walk,                                      // 98.32 solo celesta (E51)
  pluck: MASTER.pluck,                                    // 99.42 comic twang (E53)
  card: MASTER.card,                                      // 100.32 soft button (E55)
}

// ---------- CAST (casting.md decision table, pasted verbatim; ids verified, never guessed) ----------
const CAST = {
  // role:          [id,   src,    understudy]
  madRemy:          [42,   'near', 90],    // crimson bob + GREATSWORD slung viewer-left (yellow pommel); "Crimson Flow" hair 8a3c3b. Shorn S2, REGROW S10.
  flowiosa:         [13,   'near', 80],    // B; blue bob, red lips (female read), navy tee w/ "CAT CIGS" chest print — print dies under harness strap.
  immortan:         [471,  'near', 452],   // B; pale dome, WHITE jacket with strung chest gear that reads as a breathing rig; small PINK crown tuft (see hazards).
  nux:              [808,  'near', 892],   // B; pale, GREEN side tufts + blond back patch, black pill-print tee, bright red GRIN — the young fanatic.
  wifeSeed:         [12,   'near', 80],    // long blonde mane + plain blue dress; carries the SEED POUCH. (The Splendid One.)
  wifeVeil:         [24,   'near', 84],    // yellow mane + blue sparkle dress, no props.
  wifeToes:         [70,   'near', 80],    // cyan mane, camo top, smiling — the cheerful one.
  doof:             [840,  'near', 347],   // B; open white shirt over bare chest; PURPLE aviators die under the procedural blindfold.
  vuvalini1:        [46,   'far',  83],    // silver mane, white tee w/ small red-black print (illegible at far cut).
  vuvalini2:        [83,   'far',  46],    // silver mane, blue sweater w/ small chest print. Cross-understudies documented.
  warboy1:          [5,    'far',  834],   // B; yellow tee, tiny glyph print (abstract, mirror-safe).
  warboy2:          [834,  'far',  389],   // B; cream hoodie, blue side tufts, near-plain.
  warboy3:          [585,  'far',  389],   // B; blue tee, white bird-circle print (near-symmetric, mirror-safe).
  warboy4:          [882,  'far',  389],   // B; black tee, pill-circle print (horizontally symmetric, mirror-safe).
  warboy5:          [458,  'far',  389],   // B; plain black tee — the clean spare.
  citadel1:         [233,  'near', 1217],  // B; purple sweater, white SPIRAL badge (symmetric, mirror-safe).
  citadel2:         [1217, 'near', 233],   // B; white karate gi + black belt — repaints to tattered rags.
  citadel3:         [908,  'far',  685],   // B; tiger camo — noise pattern, tint into crowd.
  citadel4:         [685,  'far',  908],   // B; teal shirt + tiny yellow hand prop — far-only, NO-FLIP.
}
export { CAST }

// ---------- repaint ramp tables (ghoul pattern: per-id zones, pairs = [shadow, light]) ----------
// One zone-classified zoneRepaint(R, refs, ramps) per actor family in prepare().
// Repaints recolour only — never alpha-erase (foot anchors + stride split survive).
export const REPAINT = {
  // MAD REMY 42 — staged haircut (S2 shear -> S10 regrow), 3 states the film lerps:
  //   s < 1/3 sides+burners; 1/3..2/3 crown+bangs; >= 2/3 full dome + stubble.
  42: {
    hairSide: ['#5c2e22', '#7a4030'],
    hairCrown: ['#4a2418', '#5c2e22'],
    scalp: ['#241d18', '#3a2f26'],
    stubbleDots: '#17110d',
    shirt: ['#1f2f38', '#31434e'],
    jeans: ['#232b38', '#364254'],
  },
  // IMPERATOR FLOWIOSA 13 — chose the shave: flat dark scalp + stubble from day one.
  13: {
    scalp: ['#241d18', '#3a2f26'],
    stubbleDots: '#17110d',
    grease: '#14100c',
    top: ['#181a1c', '#26282c'],
    strap: '#3a2f26',
    buckle: '#cfd6de',
  },
  // IMMORTAN FLOW 471 — pallid tyrant; bib/mask/tubes/WIG procedural, not baked.
  471: {
    skin: ['#cfc4bd', '#e8ded6'],
    domeShade: ['#b0a49c', '#cfc4bd'],
    bib: ['#1c1e22', '#2e3238'],
    harness: ['#5f6b78', '#9aa6b2'],
    pants: ['#22242a', '#34383f'],
  },
  // NUX 808 — white war paint + scars; the grin stays native (lips zone skip).
  808: {
    torsoPaint: ['#c9c5b8', '#e8e4da'],
    tufts: ['#241d18', '#3a2f26'],
    scars: '#5a4a42',
    grinKeep: true,
  },
  // MANE WIVES — manes stay NATIVE (the hair IS the glory); only gowns go pale rag.
  12: { gown: ['#ddd5c4', '#f2ece0'], hem: '#b8ac8e' },
  24: { gown: ['#ddd5c4', '#f2ece0'], hem: '#b8ac8e' },
  70: { gown: ['#d5ccba', '#ece5d4'], hem: '#b0a488' },
  // VUVALINI — grey/white manes, dust-tan wraps.
  46: { mane: ['#b9c0c4', '#e2e6ea'], rags: ['#a89a80', '#cbbfa4'] },
  83: { mane: ['#c4cad0', '#eceff2'], rags: ['#a0937a', '#c2b498'] },
  // WAR BOY HORDE + CITADEL EXTRAS — 3 tint variants, round-robin.
  5:   { tint: ['#b0aca0', '#d4d0c4'] },
  834: { tint: ['#6b5a48', '#8a7460'] },
  585: { tint: ['#26282e', '#3a3e46'] },
  882: { tint: ['#b0aca0', '#d4d0c4'] },
  458: { tint: ['#6b5a48', '#8a7460'] },
  389: { tint: ['#26282e', '#3a3e46'] },
  233:  { tint: ['#b0aca0', '#d4d0c4'] },
  1217: { tint: ['#26282e', '#3a3e46'] },
  908:  { tint: ['#6b5a48', '#8a7460'] },
  685:  { tint: ['#26282e', '#3a3e46'] },
}
export const REPAINT_SHARED = {
  rampOrder: 'pairs are [shadow, light] — ghoul-style mix(dark, light, L)',
  greatWig: ['#c9cdd4', '#f4f6fa'],      // GREAT WIG mass; PROP, never baked (must rip + tumble)
  wigInk: '#6a7078',
  fire: ['#7a1e0e', '#e86a1e', '#ffc23c', '#fff2b0'], // flame-guitar / jet ramp, L stops 0/.45/.75/1
  tonic: { shadow: '#0e6b58', mid: '#2fd6a8', light: '#8ffce0', glow: '#3fe8c0' }, // THE FLOW liquid
  warPaintWhite: ['#c9c5b8', '#e8e4da'],
  dustDay: ['#b8823e', '#d9a55e', '#f2cf94'],
  dustNight: ['#3c4658', '#556179', '#7a8ba3'],
  seed: { pouch: ['#9a7a4a', '#c9a86b'], seeds: ['#5a7a26', '#7a9a3a', '#a8c45a'] },
  chrome: ['#5f6b78', '#9aa6b2', '#cfd6de', '#e8edf2'],
  scalpStubble: ['#241d18', '#3a2f26', '#5a463a'],
  mud: ['#3a2c20', '#54432e', '#6e5a3c'],
  regrowLerp: 1.2, // s, scalp -> native crimson per zone
}

// ---------- screen flashes: [absoluteT, peak, decay] — peaks <= .24, decay <= .2 ----------
// SIX rows total (story §9 cap). ZERO rows inside S6 (night rule). The two S9
// rows are 1.1 s apart on purpose: the rip is the freeze, the snap zoom is the hit.
export const FLASHES = [
  [MASTER.clippers, 0.18, 0.12], // S2 the SLAM flash — the shot's only bloom
  [MASTER.ramDomino, 0.16, 0.1], // S4 the ram domino impact
  [MASTER.wigRip, 0.24, 0.18],   // S9 THE WIG RIP — the money freeze
  [MASTER.bald, 0.18, 0.12],     // S9 the BALD reveal snap zoom
  [MASTER.valve, 0.16, 0.1],     // S10 the valve slam
  [REGROW_RESOLVE.abs, 0.2, 0.14], // S10 the ladder resolves
]
export const flashK = (t) => {
  let k = 0
  for (const f of FLASHES) if (t >= f[0]) k = Math.max(k, f[1] * Math.exp(-(t - f[0]) / f[2]))
  return k
}

// ========================= SELF-CHECK =========================
// The numeric self-check is the commented script block between the markers below.

// BEGIN SELF-CHECK (numeric invariants; pure read-only assertions over the exports)
// import * as TL from 'file:///Users/z80/dev/remyboysfrontend/films/mad-bald/timeline.js'
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
// ok(TL.DUR === 102, 'DUR ' + TL.DUR + ' != 102')
// const shotOf = (t) => TL.SHOTS.find((s) => t >= s.t0 && t < s.t1)
//
// // 2. per-shot EV values: finite, inside the shot's WORLD length, non-decreasing
// const EVS = {
//   wasteland: TL.WASTELAND_EV, shear: TL.SHEAR_EV, citadel: TL.CITADEL_EV,
//   chase: TL.CHASE_EV, defect: TL.DEFECT_EV, storm: TL.STORM_EV,
//   greenplace: TL.GREENPLACE_EV, turn: TL.TURN_EV, return: TL.RETURN_EV, flow: TL.FLOW_EV,
// }
// const worldLen = {}
// for (const s of TL.SHOTS) {
//   const stops = TL.STOPS[s.name] || []
//   worldLen[s.name] = (s.t1 - s.t0) - stops.reduce((a, x) => a + x.d, 0)
// }
// for (const [name, ev] of Object.entries(EVS)) {
//   const shot = TL.SHOTS.find((s) => s.name === name)
//   ok(shot, 'EV table ' + name + ' has no matching shot')
//   if (!shot) continue
//   const len = worldLen[name]
//   let last = -Infinity
//   for (const [k, v] of Object.entries(ev)) {
//     ok(typeof v === 'number' && Number.isFinite(v), 'EV ' + name + '.' + k + ' not a finite number')
//     ok(v >= 0, 'EV ' + name + '.' + k + '=' + v + ' negative')
//     ok(v <= len, 'EV ' + name + '.' + k + '=' + v + ' past world end (len ' + len + ')')
//     ok(k === 'cut' || k === 'end' || v < len, 'EV ' + name + '.' + k + '=' + v + ' not strictly inside ' + name)
//     ok(v >= last, 'EV ' + name + '.' + k + '=' + v + ' out of order (after ' + last + ')')
//     last = v
//   }
// }
//
// // 3. clocks: stop-free shots satisfy abs(g) = t0 + g exactly; stopped shots match
// const CLKS = {
//   wasteland: TL.WASTELAND, shear: TL.SHEAR, citadel: TL.CITADEL, chase: TL.CHASE,
//   defect: TL.DEFECT, storm: TL.STORM, greenplace: TL.GREENPLACE, turn: TL.TURN,
//   return: TL.RETURN, flow: TL.FLOWC,
// }
// for (const n of TL.STOP_FREE) ok(CLKS[n].stops.length === 0, 'clock ' + n + ' declared stop-free but carries stops')
// for (const [n, C] of Object.entries(CLKS)) ok(C.t0 === TL.T[n], 'clock ' + n + '.t0 != T.' + n)
// ok(TL.WASTELAND.stops.length === 0, 'S1 must be stop-free')
// ok(JSON.stringify(TL.STOPS.shear) === JSON.stringify([{ g: 4.2, d: 0.22 }]), 'S2 stops drifted')
// ok(JSON.stringify(TL.STOPS.chase) === JSON.stringify([{ g: 6.8, d: 0.14 }]), 'S4 stops drifted')
// ok(JSON.stringify(TL.STOPS.return) === JSON.stringify([{ g: 7.0, d: 0.30 }]), 'S9 stops drifted')
// ok(JSON.stringify(TL.STOPS.flow) === JSON.stringify([{ g: 2.0, d: 0.12 }]), 'S10 stops drifted')
// for (const [n, C] of Object.entries(CLKS)) {
//   for (const g of [0, 1.3, 4.2, 7.9, 11.2]) ok(C.abs(g) >= C.t0, 'clock ' + n + '.abs(' + g + ') < t0')
// }
// for (const n of TL.STOP_FREE) {
//   for (const g of [0, 1.7, 4.2, 7.9]) ok(CLKS[n].abs(g) === CLKS[n].t0 + g, 'clock ' + n + '.abs(' + g + ') != t0+g')
// }
// // freeze windows: pins land at the freeze START, windows exact
// const FZ = { shear: [12.70, 12.92], chase: [36.80, 36.94], return: [86.00, 86.30], flow: [93.00, 93.12] }
// for (const [k, v] of Object.entries(TL.MASTER)) {
//   for (const fz of TL.FREEZES) ok(!(v > fz.t0 && v < fz.t1) || (v === fz.t0), 'MASTER.' + k + '=' + v + ' lands strictly inside a freeze window')
// }
// ok(TL.MASTER.clippers === 12.7 && TL.MASTER.ramDomino === 36.8 && TL.MASTER.wigRip === 86 && TL.MASTER.valve === 93, 'a pin moved off its freeze start')
//
// // 4. MASTER: every value = clock-derived t0+EV of the shot containing it...
// for (const [k, v] of Object.entries(TL.MASTER)) {
//   const s = shotOf(v)
//   ok(s, 'MASTER.' + k + '=' + v + ' outside the film')
//   if (!s) continue
//   const ev = EVS[s.name]
//   ok(Object.values(ev).some((g) => Math.abs(CLKS[s.name].abs(g) - v) < 1e-9),
//     'MASTER.' + k + '=' + v + ' is not clock.abs(EV) of ' + s.name)
// }
// //    ...plus the exact story.md E-table anchors (including documented fixes)
// const E = {
//   glide: 0, lizard: 1.8, crest: 3, netBag: 5, sacked: 6.4, chair: 9,
//   clippers: 12.7, shave: 13.72, muzzle: 15.52, bloodbag: 16.52, spray: 19.8,
//   sneer: 21.4, vault: 23, steal: 24.6, roar: 26.2, party: 30, doof: 31.4,
//   sprayDay: 34.4, ramDomino: 36.8, lasso: 39.14, swing: 40.34, aboard: 41.54,
//   tumble: 43, unmuzzle: 44.6, seed: 46.2, witness: 48.2, defect: 50,
//   dusk: 52.5, stormwall: 54.1, into: 55.5, calm: 57.1, tale: 57.8,
//   mud: 62.3, vuv: 63.9, gone: 67, despair: 69.5, fewwords: 71.5, plan: 72.8,
//   uturn: 74.6, fullsend: 76.6, converge: 80, doofback: 81.4, poles: 82,
//   wigRip: 86, bald: 87.1, waver: 88.7, valve: 93, rain: 94.12, regrow: 95.12,
//   lifted: 97.52, walk: 98.32, sprout1: 98.92, pluck: 99.42, windTake: 99.92,
//   card: 100.32,
// }
// for (const [k, v] of Object.entries(E)) ok(Math.abs(TL.MASTER[k] - v) < 1e-9, 'MASTER.' + k + ' = ' + TL.MASTER[k] + ', E-table expects ' + v)
//
// // 5. captions: inside their shot, y <= captionYMax, hold arithmetic, lane rules
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
// const byLane = {}
// for (const c of TL.CAPTIONS) {
//   const lane = laneOf(c.y)
//   if (!byLane[lane]) byLane[lane] = []
//   byLane[lane].push(c)
// }
// for (const [lane, caps] of Object.entries(byLane)) {
//   caps.sort((a, b) => a.t0 - b.t0)
//   for (let i = 0; i + 1 < caps.length; i++) {
//     const a = caps[i], nxt = caps[i + 1]
//     const gap = nxt.t0 - a.t1
//     ok(a.t1 <= nxt.t0 + 1e-9, 'lane ' + lane + ': ' + a.id + ' overlaps ' + nxt.id)
//     if (lane === 'main') ok(gap >= 0.9 - 1e-9, 'main lane: gap ' + a.id + ' -> ' + nxt.id + ' = ' + gap.toFixed(2) + ' < 0.9')
//   }
// }
// ok(TL.CAPTIONS.length === 21, 'caption count ' + TL.CAPTIONS.length + ' != 21')
// // mandated lines verbatim (story §4)
// const MANDATED = {
//   t1_title: 'MAD BALD: FURY FLOW',
//   c3_med: 'MEDIOCRE FOLLICLES.',
//   c3k_who: 'WHO SHAVED THE WORLD?',
//   c3_notwigs: 'WE ARE NOT WIGS.',
//   c4_day: 'OH WHAT A DAY.\nWHAT A LOVELY BALD DAY.',
//   c5_witness: 'WITNESS ME.',
//   c6_shiny: 'SHINY AND GROWN.',
//   c7_gone: 'THE GREEN PLACE IS GONE.',
//   c8_back: "WE'RE GOING BACK.\nHE HAS A WIG. WE HAVE WIND.",
//   c9_witnessthat: 'WITNESS THAT.',
//   c10_mane: 'THE MANE EVENT.',
//   e1_card: 'MAD BALD: FURY FLOW',
//   e1_credit: 'A REMY BOYS PICTURE',
//   e2_tease: 'NEXT: THE TUMBLEWIG.',
// }
// for (const [id, want] of Object.entries(MANDATED)) {
//   const c = TL.CAPTIONS.find((x) => x.id === id)
//   ok(c && c.text === want, id + ' text drifts from the mandated line')
// }
//
// // 6. REGROW LADDER: 4 clock-pinned ticks + resolve; derived, never t0+g raw
// ok(TL.REGROW_LADDER.length === 4, 'ladder must have 4 ticks')
// TL.REGROW_LADDER.forEach((tk, i) => {
//   ok(tk.abs === TL.FLOWC.abs(4.0 + 0.5 * i), 'ladder tick ' + i + ' abs ' + tk.abs + ' != FLOWC.abs(' + (4.0 + 0.5 * i) + ')')
// })
// ok(TL.REGROW_LADDER[0].abs === 95.12 && TL.REGROW_LADDER[3].abs === 96.62, 'ladder pins drifted')
// ok(TL.REGROW_RESOLVE.abs === 97.12 && TL.REGROW_RESOLVE.midi === 74, 'resolve pin drifted')
// ok(TL.CUES.regrow1 === 95.12 && TL.CUES.regrow4 === 96.62 && TL.CUES.resolve === 97.12, 'ladder cues drifted')
//
// // 7. flashes: budget caps, count cap, ZERO rows inside S6, flashK(0) = 0
// ok(TL.FLASHES.length <= 6, 'flash count ' + TL.FLASHES.length + ' > 6')
// for (const [t, peak, decay] of TL.FLASHES) {
//   ok(peak <= 0.24 && decay <= 0.2, 'flash at ' + t + ' over budget (peak ' + peak + ')')
//   const s = shotOf(t)
//   ok(s && s.name !== 'storm', 'flash at ' + t + ' inside the NIGHT shot S6 (zero-row rule)')
// }
// ok(TL.flashK(0) === 0, 'flashK before any flash must be 0')
// ok(TL.flashK(12.75) > 0, 'flashK must be live just after the clippers pin')
//
// // 8. determinism + repaint/cast sanity (code only — strip line comments first)
// const fs = await import('node:fs')
// const raw = fs.readFileSync('/Users/z80/dev/remyboysfrontend/films/mad-bald/timeline.js', 'utf8')
// const src = raw.replace(/\/\/.*$/gm, '')
// ok(!/Math\.random|Date\.now|new Date\(/.test(src), 'source contains nondeterminism')
// ok(TL.CAST.madRemy[0] === 42 && TL.CAST.flowiosa[0] === 13 && TL.CAST.immortan[0] === 471, 'CAST ids must match casting.md')
// ok(TL.REPAINT_SHARED.tonic.mid === '#2fd6a8' && TL.REPAINT_SHARED.greatWig[1] === '#f4f6fa', 'shared repaint hexes drifted')
// ok(TL.REPAINT[42].scalp[0] === '#241d18' && TL.REPAINT[13].top[0] === '#181a1c', 'hero repaint hexes drifted')
//
// // 9. sections/cues: 10 sections tiling the film, one per shot; cues land on clock values
// ok(TL.SECTIONS.length === TL.SHOTS.length, 'SECTIONS count != SHOTS count')
// TL.SECTIONS.forEach((sec, i) => {
//   const s = TL.SHOTS[i]
//   ok(sec.t0 === s.t0 && sec.t1 === s.t1, 'section ' + sec.name + ' does not match shot ' + s.name)
//   ok(sec.bpm > 0 && sec.beats > 0, 'section ' + sec.name + ' bad grid')
// })
// for (const [k, v] of Object.entries(TL.CUES)) {
//   const s = shotOf(v)
//   ok(s, 'CUE ' + k + '=' + v + ' outside the film')
//   if (!s) continue
//   const onClock = Object.values(EVS[s.name]).some((g) => Math.abs(CLKS[s.name].abs(g) - v) < 1e-9) ||
//     TL.REGROW_LADDER.some((tk) => tk.abs === v) || TL.REGROW_RESOLVE.abs === v
//   ok(onClock, 'CUE ' + k + '=' + v + ' is not clock.abs(EV) of ' + s.name)
// }
//
// // 10. lanes occupancy (story §9)
// ok(byLane.title && byLane.title.length === 2, 'title lane must carry t1_title + e1_card')
// ok(byLane.sub && byLane.sub.length === 2, 'sub lane must carry t2_sub + e1_credit')
// ok(byLane.kicker && byLane.kicker.length === 4, 'kicker lane must carry 4 rows')
// ok(byLane.tease && byLane.tease.length === 1, 'tease lane must carry e2_tease')
// ok(byLane.main.length === 12, 'main lane must carry 12 rows')
//
// if (fails.length) {
//   console.error('SELF-CHECK FAILED (' + fails.length + '):')
//   for (const f of fails) console.error('  - ' + f)
//   process.exit(1)
// }
// console.log('SELF-CHECK OK: ' + TL.SHOTS.length + ' shots tile [0, ' + TL.DUR + '], ' +
//   TL.CAPTIONS.length + ' captions, ' + TL.SECTIONS.length + ' sections, ' +
//   Object.keys(TL.MASTER).length + ' master events, ' + TL.FLASHES.length + ' flashes, ' +
//   Object.keys(TL.CUES).length + ' cues, 4 stops')
// END SELF-CHECK
//
// Run it with (from the repo root; the [-] class keeps this doc line from
// re-triggering the marker match):
//
//   awk '/BEGIN SELF[-]CHECK/{f=1;next} /END SELF[-]CHECK/{f=0} f' \
//     films/mad-bald/timeline.js | sed 's|^// ||' > /tmp/mad-bald-check.mjs && node /tmp/mad-bald-check.mjs
