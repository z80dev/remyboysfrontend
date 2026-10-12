// GOLDFLOW — a Remy Boys spy thriller. Cue sheet + choreography: every number the
// picture and the score share lives here. All pure functions of time (no Math.random,
// no Date, no state carried between frames). Action grid 120 BPM (bar = 2 s),
// title song 100 BPM (bar = 2.4 s). 90 s total.

export const DURATION = 90

// ---------- shot map (film seconds) ----------
export const T = {
  barrel: 0,    // gun-barrel opening            0–6
  tower: 6,     // Cabald Tower heist teaser     6–22
  titles: 22,   // animated title sequence       22–48
  brief: 48,    // M/Q briefing                  48–56
  lair: 56,     // Bald Mountain showdown        56–82
  tag: 82,      // rooftop tag + end card        82–90
}

// ---------- cast (contact-sheet verified; near sprites 76×116, foot anchor) ----------
export const CAST = {
  hero: 42,     // Agent 42 — red hair + sword
  villain: 159, // DR. NO-HAIR — Newport robe worn cape-like, stern green eyes
  hench: 1217,  // ODDFOB — white judo gi, black belt
  g1: 458, g2: 3281, g3: 3807, // Cabald guards
  mata: 109,    // MATA HAIRY — red bob, clean cream tee
  m: 647,       // M — grey hair, blue tunic (head atlas only)
  q: 348,       // Q — cobalt hair, gold-arch shades (head atlas only)
}

// ---------- shot clocks: hit-stops freeze world time; shake/flash/score stay real ----------
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

// Barrel: comb the strands straight, turn, slash; gold floods the circle.
export const BARREL_EV = { comb: 2.5, turn: 3.4, shot: 4.0, flood: 4.05, wipe: 5.15 }

// Tower (in-media-res): establish, climb past beams, vault grab, serum-leak glide.
export const TOWER_CLOCK = makeClock(T.tower, [{ g: 10.5, d: 0.12 }])
export const TOWER_EV = {
  climbStart: 3.0, beam1: 5.4, beam2: 6.9, vault: 8.0, grab: 10.5,
  alarm: 11.0, dive: 12.2, chute: 13.1, tuft: 13.8, nearMiss: 14.9,
  plume: 15.35, iris: 15.5,
}
export const BEAMS = [TOWER_EV.beam1, TOWER_EV.beam2]

// Title sequence grammar (local g from T.titles): moon whip → ribbon run → razors
// slice → stubble band shaved → GOLDFLOW slam → credit vignettes → parade → iris.
export const TITLES = {
  bar: 2.4, slam: 9.6,
  moon: 0, ribbon: 2.4, razors: 4.8, stubble: 7.2,
  tagline: 10.6, credits: 11.2, sink: 19.2, parade: 21.6, iris: 25.0,
}
// Credit windows (local g): AGENT 42 / MATA HAIRY / ODDFOB / DR. NO-HAIR — aligned
// to the non-overlapping caption windows so text and tableau swap together.
export const CREDITS = [[11.2, 14.2], [14.3, 17.3], [17.4, 20.4], [20.5, 23.9]]

// Lair fight stops: guard 1, guard 2, hat clang, disarm.
export const LAIR_CLOCK = makeClock(T.lair, [
  { g: 5.2, d: 0.14 }, { g: 6.4, d: 0.1 }, { g: 10.0, d: 0.16 }, { g: 15.5, d: 0.12 },
])
export const LAIR_EV = {
  enter: 0, rush: 4.0, hit1: 5.2, hit2: 6.4, oddfob: 7.4,
  hatThrow: 9.0, clang: 10.0, console: 11.2, catch: 12.0, bow: 12.6,
  duel: 12.5, lunge1: 14.2, disarm: 15.5, lunge2: 17.4, sweep: 18.2,
  flip: 18.5, splash: 19.4, rise: 21.4, statue: 23.0, vial: 23.6, iris: 24.6,
}

// ---------- screen flashes: [absoluteT, peak, decay] — peaks ≤ .3, decay ≤ .2 ----------
export const FLASHES = [
  [T.barrel + BARREL_EV.shot, 0.26, 0.1],
  [TOWER_CLOCK.abs(TOWER_EV.grab), 0.2, 0.1],
  [T.titles + TITLES.slam, 0.16, 0.12],
  [LAIR_CLOCK.abs(LAIR_EV.hit1), 0.18, 0.08],
  [LAIR_CLOCK.abs(LAIR_EV.clang), 0.24, 0.1],
  [LAIR_CLOCK.abs(LAIR_EV.disarm), 0.18, 0.08],
  [LAIR_CLOCK.abs(LAIR_EV.splash), 0.3, 0.15],
]
export const flashK = (t) => {
  let k = 0
  for (const f of FLASHES) if (t >= f[0]) k = Math.max(k, f[1] * Math.exp(-(t - f[0]) / f[2]))
  return k
}

// ---------- pure position math ----------
const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const outC = (u) => 1 - (1 - u) ** 3

// Barrel: hero walks in from the left, stops centre, combs, turns, slashes.
export const barrelHeroX = (g) => 560 + 400 * outC(cl((g - 1.2) / 1.9))

// Tower escape: dive then umbrella glide with a pendulum sway + near-miss dodge.
export function glide(t, g0) {
  const u = cl((t - g0) / 3.8)
  const dodge = t > 14.75 && t < 15.1 ? -0.3 * Math.sin((t - 14.75) / 0.35 * Math.PI) : 0
  return {
    x: 1440 - 850 * u,
    y: 300 + 296 * u * u,
    rot: 0.1 * Math.sin((t - g0) * 2.1) * cl((t - g0) / 0.6) + dodge,
  }
}

// Lair duel: hero and villain x as pure functions of world g.
export function heroLairX(g) {
  if (g < LAIR_EV.rush) return 1660 - 380 * cl(g / 3.4) ** 1.3
  if (g < LAIR_EV.hatThrow) return 1280 + 60 * Math.sin((g - 4) * 1.1)
  if (g < LAIR_EV.duel) return 1280
  if (g < LAIR_EV.disarm) return 1280 - 230 * cl((g - 12.5) / 2.6)
  if (g < LAIR_EV.lunge2) return 1050
  if (g < LAIR_EV.sweep) return 1050 + 26 * Math.sin((g - 17.4) * 4)
  if (g < LAIR_EV.vial) return 1050 - 300 * cl((g - 18.2) / 3.2)
  return 750 - 420 * cl((g - LAIR_EV.vial) / 1.6)
}
export function villainLairX(g) {
  if (g < LAIR_EV.duel) return 560 + 120 * cl((g - 11.4) / 1.6)
  if (g < LAIR_EV.lunge1) return 680 + 200 * cl((g - 12.5) / 1.6)
  if (g < LAIR_EV.disarm) return 880 + 34 * Math.sin((g - 14.2) * 3.2)
  if (g < LAIR_EV.lunge2) return 880
  // desperate lunge, then over the rail
  return 880 + 190 * cl((g - LAIR_EV.lunge2) / 0.8)
}
// Razor-brim hat flight: outbound arc, clang ricochet past two stanchions into the console.
export function hatPath(g) {
  if (g < LAIR_EV.hatThrow || g > LAIR_EV.console + 0.25) return null
  if (g < LAIR_EV.clang) {
    const u = cl((g - LAIR_EV.hatThrow) / (LAIR_EV.clang - LAIR_EV.hatThrow))
    return { x: 820 + 470 * u, y: 690 - 210 * Math.sin(Math.PI * u) - 60 * u, rot: (g - LAIR_EV.hatThrow) * 14 }
  }
  const u = cl((g - LAIR_EV.clang) / (LAIR_EV.console - LAIR_EV.clang))
  return { x: 1290 - 720 * u, y: 480 + 250 * u * u + 40 * u, rot: 20 - (g - LAIR_EV.clang) * 17 }
}
