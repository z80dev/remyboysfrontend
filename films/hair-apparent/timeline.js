// THE HAIR APPARENT — cue sheet + choreography. Every number the picture and the score share
// lives here. Everything is a pure function of time: no Math.random, no Date, no cross-frame state.
//
// A 1922-style silent melodrama in nine shots, presented in Academy ratio (1440×1080 stage
// pillarboxed inside the 1920×1080 frame). World motion is quantized to 16 fps (hand crank);
// projector flicker, gate weave, scratches and grain run at full rate.

export const DURATION = 79.2;
export const SW = 1440,
  SH = 1080; // Academy-ratio stage (1.33:1), blitted at OX
export const OX = 240; // pillarbox offset in the 1920×1080 output

// ---- cast (QA'd contact sheets Oct 2026; ids with printed slogans noted) ----
export const HERO = 42; // Remy Fairhair — red hair + sword. NEVER mirrored ("My Second Rodeo" tee)
export const HEROINE = 46; // Miss Tresses — long silver hair, mirror-safe
export const VILLAIN = 452; // Lord Baldwin — the one tuxedo in the whole Cabald, mirror-safe
export const GOON1 = 5; // yellow tee, hand-sign glyphs (pictorial, mirror-safe)
export const GOON2 = 834; // white long sleeves, mouse line-art, mirror-safe

// ---- shot table (absolute film seconds) ----
export const T = {
  title: 0, // studio + title card w/ sunburst
  parlour: 7.6, // the Tonsorial Parlour, courtship, heart iris, goons peek
  snatch: 19.6, // comb stolen, motorcar kidnapping, mustache-twirl insert
  cardPeril: 30.2, // "TIED TO THE TRACKS!"
  tracks: 34.8, // rail cut: heroine tied, watch swings, train appears, hero runs
  cardHero: 46.4, // "NEVER FEAR!"
  rescue: 50.8, // duel w/ hit-stop, hat flight, ropes, train foreground pass, comb restored
  finale: 64.4, // sunset stroll, heart iris closes
  finis: 72.4, // FINIS card, iris out
  end: DURATION,
};

// ---- parlour beats (local lt) ----
export const PARLOUR = {
  heroIn: [0.8, 4.6], // walks in from stage left, faces right (never mirrored)
  bow: [5.0, 6.4], // sword-bow to Miss Tresses
  heart: [5.9, 6.7, 7.9, 8.6], // heart iris: opens, holds, closes
  goons: 8.8, // two flat caps peek from the frame edge
  combStroke: 1.4, // her comb cycle (s)
};

// ---- snatch beats (local lt) ----
export const SNATCH = {
  sneak: [0, 3.4], // goons tiptoe from stage left to the vanity
  grab: [3.4, 4.4], // comb snatched, heroine seized
  carIn: [4.2, 5.4], // motorcar rolls in from the left, stops
  boss: [5.6, 6.2], // Lord Baldwin steps out
  twirl: [6.6, 8.0], // oval portrait insert: hat, monocle, twirl
  load: [8.0, 9.2], // heroine bundled into the back seat
  carOut: [9.2, 10.5], // getaway, accelerating
  heroIn: [8.8, 10.6], // Fairhair arrives too late, shakes his sword at it
};

// ---- tracks beats (local lt) ----
export const TRACKS = {
  watch: [0.8, 3.2], // villain swings his pocket watch
  trainAppear: 1.2, // smoke column on the left horizon
  heroIn: [4.9, 11.6], // foreground run (3× scale) shrinking into the distance
  whistleFar: 7.5, // distant whistle (score)
};

// ---- rescue beats (world g; shot has ONE hit-stop at the final clash) ----
export const STOPS = [{ g: 4.4, d: 0.22 }]; // the steel clash freezes the world
export const RESCUE = {
  land: [0, 1.0], // hero leaps in; goon1 startles and flings the comb
  combDrop: 0.4,
  strut: [1.2, 2.2], // villain struts over, goons flank
  standoff: [2.2, 2.8], // held pose — the audience hisses
  duel: [2.8, 4.4], // three exchanges, sparks at 3.0 and 3.9
  clashA: 3.0,
  clashB: 3.9,
  clash: 4.4,
  hatFly: 4.5, // top hat pops off, ballistic arc, lands + rolls
  fall: 4.7, // villain falls like a felled tree (rotates around his feet)
  monocle: 5.2, // monocle pops off
  drag: [4.8, 7.2], // goons drag the boss right, set him on his feet
  ropes: [5.4, 5.9, 6.3], // saw strokes; snaps at 5.9 and 6.6
  snap: [5.9, 6.6],
  rise: [6.6, 7.4], // heroine rotates up to standing
  trainPass: [7.0, 9.4], // foreground locomotive crossing, left → right (fully clear by the cut)
  board: [8.0, 8.4], // villains meet the slipstream instead
  fists: [8.3, 8.8], // goon2 shakes a fist mid-tumble
  combPick: [9.8, 10.9], // the heroine reclaims her heirloom herself
  combUp: 11.3, // holds it aloft
  ring: 11.5,
  stroke: 11.8,
  hearts: [12.0, 13.4], // floating hearts
  bows: 12.6, // pair bow to the camera
};

// ---- finale beats (local lt) ----
export const FINALE = {
  walk: [0, 5.2], // arm in arm, screen right, into the low sun
  heart: [5.2, 5.9, 6.7, 7.5], // heart iris: opens, holds, closes to black
  stroke: 6.3, // one last comb stroke, glint — inside the heart
};

export const FINIS = { irisOut: [5.9, 6.6] };

// ---- rescue clock: world time freezes at the clash; shake/flash stay on real time ----
export function warp(ts) {
  let acc = 0;
  for (const s of STOPS) {
    const rs = s.g + acc;
    if (ts < rs) return { g: ts - acc, stop: null, sl: 0 };
    if (ts < rs + s.d) return { g: s.g, stop: s, sl: ts - rs };
    acc += s.d;
  }
  return { g: ts - acc, stop: null, sl: 0 };
}
// world g → absolute film time (score + flashes must use this, never hand-added delays)
export function filmT(g) {
  let acc = 0;
  for (const s of STOPS) if (s.g < g) acc += s.d;
  return T.rescue + g + acc;
}

// ---- hand crank: world time quantized to 16 fps (actors, vehicles, props) ----
export const crank = (lt) => Math.floor(lt * 16) / 16;

// ---- gate weave: per-crank-frame stage offset ----
export function weave(fq, seed) {
  return { x: (hash01(fq * 7 + seed) - 0.5) * 2.4, y: (hash01(fq * 13 + seed + 40) - 0.5) * 1.8 };
}
const hash01 = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---- foreground train pass (rescue g): x on a slight accelerate-in / steady-out curve ----
export function trainX(g) {
  const u = Math.min(1, Math.max(0, (g - RESCUE.trainPass[0]) / (RESCUE.trainPass[1] - RESCUE.trainPass[0])));
  const e = u < 0.3 ? (u / 0.3) ** 1.6 * 0.3 : 0.3 + ((u - 0.3) / 0.7) * 0.7; // slow-in, then steady
  return -1050 + 4550 * e;
}
