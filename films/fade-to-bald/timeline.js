// FADE TO BALD — a Remy Boys film noir. 88 s, 1080p via a 960×540 pixel stage (2× nearest).
// The one timing truth: shot map, cast, g-domain event clocks (hit-stop) shared by film.js AND score.js.
export const DURATION = 88;
export const LW = 960, LH = 540; // pixel world stage, blitted 2× nearest to 1920×1080
export const GROUND = 430;       // actor feet line in stage coords (letterbox band ends y≈471)

export const T = {
  skyline: 0, office: 11, pitch: 24, streets: 36, club: 51, rooftop: 66, coda: 77, end: 86,
};

// Cast chosen from inspected contact sheets (output/_contact/femme-final-orig.png etc.):
export const CAST = {
  DET: 200,    // Gold Visor — visor-hat hairStyle, black tee. The gumshoe. NOT bald.
  FEMME: 109,  // Crimson Flow — long crimson hair, white top, red lips in the orig. NOT bald.
  GOON1: 5,    // Gold Soul — chrome dome, yellow tee. Known-good Cabald muscle.
  GOON2: 892,  // Midnight Soul — bald, plain black tee. Noir mob muscle.
  GOON3: 1217, // Pearl Soul — bald, white gi. The boss's elegant flanker.
  BOSS: 744,   // Aqua Shades — bald + golden shades, teal shirt. The Cabald kingpin.
};

// Palette rows from media/quest/art.json (drives duotone + bald-scalp repaints).
export const PAL = {
  DET:   { skin: '#c0aa98', hair: '#a7ab02', shirt: '#050407' },
  FEMME: { skin: '#c0aa98', hair: '#893c3b', shirt: '#d6d6d6' },
  GOON1: { skin: '#a07e63', hair: '#a07e63', shirt: '#dccc5e' },
  GOON2: { skin: '#a07f64', hair: '#a07f64', shirt: '#1a1a1c' },
  GOON3: { skin: '#a07e63', hair: '#a07e63', shirt: '#c9c5c0' },
  BOSS:  { skin: '#3a2c22', hair: '#3a2c22', shirt: '#236b72' },
};

// Noir hair-duotone hues: each character is tinted by their HAIR colour; the Cabald runs slate (colourless).
export const DUO = {
  DET: '#b0a44a',    // olive gold
  FEMME: '#a4474a',  // crimson
  CABALD: '#76839a', // cold slate — goons, boss, the revealed femme
};

// Flashes: [abs t, peak, decay]. Peaks ≤ .3, decay ≤ .2 (grey-soup rule on dark scenes).
export const FLASHES = [
  [2.2, 0.24, 0.18], [2.48, 0.13, 0.12],  // skyline thunder, double strobe
  [6.9, 0.26, 0.17],
  [12.8, 0.13, 0.12],                      // distant storm over the office
  [62.8, 0.28, 0.16],                      // the wig rip
  [68.4, 0.22, 0.15],                      // rooftop lightning
];

// ---- clocks ------------------------------------------------------------------
// makeClock: piecewise world time g vs shot-local real time lt.
//   stops: [{g, d}] freeze world time at g for d real seconds (impact lands at freeze START).
export function makeClock(t0, stops = []) {
  const warp = (lt) => {
    let acc = 0;
    for (const s of stops) {
      const rs = s.g + acc;
      if (lt < rs) return { g: lt - acc, stop: null, sl: 0 };
      if (lt < rs + s.d) return { g: s.g, stop: s, sl: lt - rs };
      acc += s.d;
    }
    return { g: lt - acc, stop: null, sl: 0 };
  };
  const filmT = (g) => {
    let acc = 0;
    for (const s of stops) if (s.g < g) acc += s.d;
    return g + acc;
  };
  return { t0, stops, warp, filmT, abs: (g) => t0 + filmT(g) };
}

// STREETS (t0 36, 15 s): the hero walks the strip, two goons block the alley, two hit-stop punches.
export const STREETS_EV = {
  walkEnd: 6,            // hero reaches the alley mouth
  block: 7.2,            // goons step out of the shadow
  goonLine: 7.6,
  punch1: 11.5,          // hero's straight right meets goon 1's chin
  swing2: 13.2,          // goon 2 swings; hero slips it
  counter: 14.3,         // counter puts goon 2 down
};
export const STREETS_CLOCK = makeClock(T.streets, [
  { g: STREETS_EV.punch1, d: 0.22 },
  { g: STREETS_EV.counter, d: 0.18 },
]);

// CLUB (t0 51, 15 s): the comb under the lamp, the boss, and the betrayal.
export const CLUB_EV = {
  heroIn: 2.5,   // detective reaches his mark
  bossIn: 2.6,   // boss steps out of the dark
  femmeIn: 6.5,  // she appears in the doorway behind him
  rip: 11.8,     // she tears off the wig — the world freezes
  drain: 13.0,   // her colour has fully run out
  point: 13.6,   // boss: get him
  rush: 14.5,    // goons converge as we cut
};
export const CLUB_CLOCK = makeClock(T.club, [
  { g: CLUB_EV.rip, d: 0.35 },
]);

// ROOFTOP (t0 66, 11 s): the last scrap, the pile-up, the comb aloft.
export const ROOF_EV = {
  swing: 0.6,     // goon 3's umbrella arc begins
  duck: 1.15,     // hero slips under
  upper: 1.9,     // uppercut — freeze
  lunge: 5.2,     // boss commits
  sidestep: 5.8,  // hero gives ground
  pile: 6.4,      // boss skids into the water-tower base — freeze (comedy weight)
  pick: 7.2,      // hero lifts the comb from the fallen crate
  aloft: 8.6,     // the comb goes up — rain quits
};
export const ROOF_CLOCK = makeClock(T.rooftop, [
  { g: ROOF_EV.upper, d: 0.24 },
  { g: ROOF_EV.pile, d: 0.2 },
]);

// Contact positions (stage/world coords) the particle tables and score are derived from.
export const HIT = {
  streets1: { x: 746, y: 334 },   // goon 1 chin at punch1 (hero 706, goon 784)
  streets2: { x: 750, y: 338 },   // goon 2 chin at counter (goon closes to 790)
  rip: { x: 318, y: 316 },        // the wig leaves her head (femme at 300, feet 438)
  roofUpper: { x: 470, y: 330 },  // goon 3 chin (hero dashes 384→440, goon 500)
  roofPile: { x: 700, y: 428 },   // boss meets the tower base
};
