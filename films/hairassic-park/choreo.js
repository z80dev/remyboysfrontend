// Cue sheet + choreography. Every number the picture and the score share lives here.
// Everything is a pure function of time: no Math.random, no Date, no state carried between frames.

export const DURATION = 6;
export const VS = 1.6;            // film seconds: VS card → duel cut
export const LW = 960, LH = 540;  // native low-res stage (upscaled 2× nearest to 1920×1080)
export const GY = 456;            // ground line (feet y)

export const HERO = 42;           // red hair + sword (has hair)
export const FOE = 5;             // listed in scripts/quest-bald.json → Cabald

// ---------- hit-stops: the world freezes, shake/flash/score keep real time ----------
export const HIT_G = 1.2;         // game time of the impact
export const STOPS = [{ g: HIT_G, d: 0.12 }];

// Shot time → { g, stop, sl }.
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
// Game time → film time (an event at a stop's g sounds at the start of the freeze).
export function filmT(g) {
  let acc = 0;
  for (const s of STOPS) if (s.g < g) acc += s.d;
  return VS + g + acc;
}

// ---------- positions (pure in g) ----------
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const MEET = 480;
export const heroX = (g) => 120 + (MEET - 40 - 120) * clamp01(g / HIT_G) ** 1.4;
export const foeX = (g) => (g < HIT_G ? 840 - (840 - MEET - 30) * clamp01(g / HIT_G) : MEET + 30 + 900 * (g - HIT_G));
export const foeY = (g) => (g < HIT_G ? GY : GY - 520 * (g - HIT_G) + 600 * (g - HIT_G) ** 2);
export const foeRot = (g) => (g < HIT_G ? 0 : (g - HIT_G) * 14);
export const BANNER_G = HIT_G + 0.35;          // "CABALD DOWN!"
export const IRIS_OUT = { g0: 3.55, g1: 4.1 }; // closes before DURATION
