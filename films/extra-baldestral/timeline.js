// B.T. THE EXTRA-BALDESTRAL — a Remy Boys picture. 92 s, 1080p via a 960×540 pixel stage (2× nearest).
// The one timing truth: shot map, cast, g-domain event clocks (hit-stop) shared by film.js AND score.js.
export const DURATION = 92;
export const LW = 960, LH = 540; // pixel world stage, blitted 2× nearest to 1920×1080

export const T = {
  streak: 0, shed: 8, bond: 16, title: 32, street: 38, pursuit: 48, flight: 60, ship: 71, slate: 88, end: 92,
};

// Cast chosen from inspected contact sheets (output/_contact/boy-final-big.png, bt-agent-heads.png …):
export const CAST = {
  BOY: 24,   // Gold Flow — chartreuse-gold flow hair, plain navy sweater, jeans. Reads ~11. NOT bald.
  BT: 834,   // Pearl Soul — bald, plain grey long sleeve, heavy-lidded, round head. Repainted grey-green.
  AG_A: 452, // Midnight Soul — bald, black tuxedo + bow tie. Cabald Unit 6, lead goon.
  AG_B: 468, // Midnight Soul — bald, black shades + near-black tee. Cabald Unit 6, flanker.
  MUM: 80,   // Midnight Crown — silhouette in the doorway (curlers painted on).
  T1: 28,    // trick-or-treater silhouettes (pirate / pumpkin / sheet ghost = BT far rig)
};

// Palette rows from media/quest/art.json (drives the alien repaint + prop colours).
export const PAL = {
  BOY: { skin: '#c0aa98', hair: '#acab06', shirt: '#052364' },
  BT:  { skin: '#c0aa98', shirt: '#d5d5d5' },
  AG_A: { skin: '#685240', shirt: '#000000' },
  AG_B: { skin: '#d0bdb2', shirt: '#131111' },
};

// B.T. repaint map (exact-match sprite quantisation): pale grey-green skin, sage sleeve.
export const BT_SKIN = '#a9c2a2';
export const BT_SHIRT = '#7c9a88';
export const GLOW = '#7ff7ff';      // cyan fingertip / chest / ship ramp
export const MOON = '#ffd9a0';      // harvest moon amber
export const PUMPKIN = '#ff9a2e';   // jack-o-lanterns / porch warmth

// Flashes: [abs t, peak, decay]. Peaks ≤ .3, decay ≤ .2 (grey-soup rule on dark scenes).
export const FLASHES = [
  [6.5, 0.26, 0.1],   // UFO thud behind the treeline
  [13.6, 0.18, 0.1],  // B.T.'s eyes catch the beam
  [34.0, 0.16, 0.12], // TITLE slam
  [44.8, 0.14, 0.1],  // Cabald van roof light snaps on
  [58.8, 0.2, 0.1],   // ravine skid
  [60.0, 0.22, 0.12], // launch
  [79.5, 0.16, 0.14], // the hair sprout (warm)
  [84.6, 0.1, 0.14],  // liftoff
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

// SHED (t0 8, 8 s): the boy's flashlight finds the stowaway.
export const SHED_EV = {
  walk: 0.3, walkEnd: 2.4,   // boy crosses to the shed, leans the bike
  pov: 2.5,                  // interior POV begins, cone sweeps the clutter
  coneLock: 4.4,             // cone stops dead on the huddled shape (abs 12.4)
  raise: 5.2, reveal: 5.6,   // B.T. lifts his head; eyes catch the beam — freeze
  drop: 7.2,                 // flashlight hits the floor, beam spins
  iris: 7.6,
};
export const SHED_CLOCK = makeClock(T.shed, [{ g: SHED_EV.reveal, d: 0.12 }]);

// BOND (t0 16, 16 s): bedroom montage — wig, candy, healing, the near-miss.
export const BOND_EV = {
  pat1: 0.5, pat2: 1.3,      // B.T. pats the lamp
  wigCU: 2.4, wigBob: 3.6,   // cut-in: THE HAIR HAT; one slow dignified bob
  candyCU: 5.0, toss: 5.2, catch: 5.9, eat: 6.4, burp: 6.8, eyes: 7.2, // glitter burp, two-moon pupils
  kneeCU: 7.8, touch: 8.6, pop: 9.4, fizzEnd: 10.2,                    // glowing-finger heal, band-aid pops (alias of heal)
  wide2: 10.4, hideHop: 11.2, doorCrack: 11.6, freeze: 12.0, doorClose: 14.0,
  pointFish: 14.4, iris: 15.6,
};
export const BOND_CLOCK = makeClock(T.bond, [{ g: BOND_EV.freeze, d: 0.4 }]);

// TITLE (t0 32, 6 s): moon, miniature wheelie, slam.
export const TITLE_EV = { irisIn: 0.6, miniCross: 1.0, slam: 2.0, sub: 2.8, flicker: 4.4, irisOut: 5.6 };

// STREET (t0 38, 10 s): Halloween rounds; meanwhile, a van.
export const STREET_EV = {
  vanCut: 6.6,         // hard cut to the parked Cabald van (abs 44.6)
  roofSnap: 0.8,       // roof light snaps on (van-local)
  doorSlide: 8.2,      // sliding door, agents step out with cones (abs 46.2)
  dutch: 9.2,          // dutch push-in on the van (abs 47.2)
};

// PURSUIT (t0 48, 12 s): cones in the pines, the ravine.
export const PURSUIT_EV = {
  pov: 2.4,                          // van-POV cones
  cuts: [2.4, 3.5, 4.6, 5.7],        // four bike-vs-cone cross-cuts
  forest: 7.0,                       // low racing pan, 3-layer parallax (abs 55)
  skid: 10.8,                        // BRAKES. RAVINE. — freeze
  wheelSpin: 11.4,                   // wheels keep spinning 3 frames
  hold: 12.0,
};
export const PURSUIT_CLOCK = makeClock(T.pursuit, [{ g: PURSUIT_EV.skid, d: 0.12 }]);

// FLIGHT (t0 60, 11 s): the money shot. Approach fast, LINGER on the moon face, exit fast.
// On-moon-face window: lt 3.8–8.8 (abs 63.8–68.8); trail draws through the middle of it.
export const FLIGHT_EV = {
  fingerLift: 0.2, noseUp: 0.5, rise: 0.6, moonShot: 2.0,
  crossIn: 2.8, faceIn: 3.8, faceOut: 8.8, crossOut: 10.8, exit: 11.0,
  trail: 5.0, trailEnd: 8.4,
};

// SHIP (t0 71, 17 s): the goodbye, the sprout, the hair-comet.
export const SHIP_EV = {
  descendEnd: 3.0, ramp: 4.5,
  touchCU: 6.6,          // cut to the fingertip-touch close-up (abs 77.6)
  touch: 7.2,            // fingertips meet (abs 78.2)
  pushHead: 8.0,         // push-in on B.T.'s head
  sprout: 8.5,           // THE SPROUT (abs 79.5) — freeze
  wide2: 9.6, boards: 10.2, rampStep: 11.2, boardsEnd: 12.2,
  liftoff: 12.4, riseEnd: 13.5, comet: 13.5, cometEnd: 15.7, iris: 16.0,
};
export const SHIP_CLOCK = makeClock(T.ship, [{ g: SHIP_EV.sprout, d: 0.1 }]);

// The TUFT motif (original): two hopeful hops, a leap into the unknown, a half-step landing.
// Statement octaves: low 57 60 57 63 64 · flight 69 72 69 75 76.
export const MOTIF = { low: [57, 60, 57, 63, 64], flight: [69, 72, 69, 75, 76] };
