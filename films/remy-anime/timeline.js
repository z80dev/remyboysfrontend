// A CUT ABOVE — the Remy Boys anime opening. One timing truth: shots, action cues,
// captions and the score all import these bar-grid numbers (172 BPM, bar = 240/172 s).
// Lore: hairy Remys are the heroes; the Cabald (bald Remys) are the storm they cut through.

export const BPM = 172
export const B = 240 / BPM // one 4/4 bar = 1.395349 s

export const T = {
  // bars 0–2 · cold open — piano motif, one portrait in the dark
  cold: 0,
  // bars 2–4 · dawn over the city, a silhouette on the antenna
  skyline: 2 * B,
  // bars 4–6 · blade gleam macro, the eye opens
  gleam: 4 * B,
  // bars 6–12 · rooftop run — three name cards, two building jumps
  run: 6 * B,
  card1: 6.6 * B,
  card2: 8.6 * B,
  card3: 10.6 * B,
  // bars 12–16 · the Cabald storm — horde multiplies, DAN looms, lightning
  storm: 12 * B,
  // bars 16–20 · resolve — rain stops, sun cracks through, the trio stands
  resolve: 16 * B,
  // bars 20–23 · ACTION I — the first cut (hit-stop)
  slash: 20 * B,
  // bars 23–26 · ACTION II — whip, spin-kick, goon into the horde (two hit-stops)
  combo: 23 * B,
  // bars 26–30 · the leap into the sun — trio flies at camera
  leap: 26 * B,
  // bars 30–33 · title slam, shine, end card
  title: 30 * B,
  end: 33 * B,
}

export const DURATION = T.end // 46.0465 s

export const SHOTS = [
  ['cold', T.cold, T.skyline],
  ['skyline', T.skyline, T.gleam],
  ['gleam', T.gleam, T.run],
  ['run', T.run, T.storm],
  ['storm', T.storm, T.resolve],
  ['resolve', T.resolve, T.slash],
  ['slash', T.slash, T.combo],
  ['combo', T.combo, T.leap],
  ['leap', T.leap, T.title],
  ['title', T.title, T.end],
]

// Cast — the named Remy Quest faces (same ids as src/games/kit/remy.ts CAST and
// films/still-here), so the OP introduces the crew the games and trailer already use.
// (AMY #60 was replaced by RAY #1000 after sprite QA: #60 carries baked-in meme text.)
export const CAST = {
  HERO: 42, // RIVAL · Crimson Flow — red hair, the sword
  GWEI: 46, // Silver Flow
  RAY: 1000, // Cobalt Flow
  MAXI: 2084, // Aqua Crown — joins at the leap
  BOSS: 1267, // DAN — the traitor who went bald
  GOON_A: 5, // Cabald muscle, gold shirt
  GOON_B: 1217, // Cabald muscle, pearl gi
}

// Bald far-sprite ids for the Cabald horde ranks — contact-sheet QA'd clean (no baked
// meme text / props; 167 and 315 were rejected for "WHAT DOES / DN404 MEAN" overlays).
export const HORDE = [48, 73, 98, 129, 183, 197, 219, 233, 321, 0]

// Hit-stop clocks for the two action shots, in shot-local seconds. warp(ts) maps
// shot time → action time g (world frozen during stops, stop/sl returned for FX);
// filmT(g) maps action time → absolute film time so onsets land at the start of a
// freeze — picture and score sample the same clock (proven choreo pattern).
export function makeClock(shotT0, stops) {
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
    return shotT0 + g + acc
  }
  return { warp, filmT }
}

// ACTION I: dash 0.35 → contact 1.9 (freeze 0.22) → topple → land pose 3.05
export const SLASH = { dash: 0.35, contact: 1.9, land: 3.05 }
export const SLASH_CLOCK = makeClock(T.slash, [{ g: SLASH.contact, d: 0.22 }])

// ACTION II: hair whip 1.15 (freeze 0.16) → spin kick 2.3 (freeze 0.28) → goon flies 2.55
export const COMBO = { whip: 1.15, kick: 2.3, fly: 2.55, land: 3.9 }
export const COMBO_CLOCK = makeClock(T.combo, [
  { g: COMBO.whip, d: 0.16 },
  { g: COMBO.kick, d: 0.28 },
])

// LEAP: jump 0.5 → apex 2.2 → closest camera pass 3.4 → turn to camera 3.95
export const LEAP = { jump: 0.5, apex: 2.2, pass: 3.4, turn: 3.95 }

// TITLE: logo slam 0.3 → subtitle chip 1.05 → shine sweep 1.9 → fade 3.95 (shot is 3 bars)
export const TITLE = { slam: 0.3, sub: 1.05, shine: 1.9, fade: 3.95 }

// RUN cues, shot-local: roof-gap jumps (analytic arcs) and pigeon scatter
export const RUN = { jumps: [1.35 * B, 3.25 * B], cards: [6.6 * B - T.run, 8.6 * B - T.run, 10.6 * B - T.run] }

// STORM cues, shot-local: lightning bolts + the moment DAN's head looms out of the clouds
export const STORM = { bolts: [0.8 * B, 2 * B, 3.2 * B], boss: 2.5 * B, ranks: 12 }

// Pixel-stage shots render on a 960×540 native canvas, upscaled 2× nearest to 1080p.
export const LW = 960
export const LH = 540
