// Choreography: the whole adventure is a pure function of game time g.
// Game time freezes during hit-stops so every sword hit lands with weight; filmT() maps game time back to film time
// so the score puts each SFX on its frame.

export const INTRO = 1.5; // title card, film seconds
export const DURATION = 15;
export const LW = 960, LH = 540, HUD = 100, PH = 440; // native canvas, HUD band, playfield height
export const GAME_SPEED = 1.16; // leave a readable three-second item celebration in the 15-second film

// ---------- hit-stops ----------
export const STOPS = [
  { g: 0.68, d: 0.07 },                 // E1
  { g: 1.56, d: 0.07 },                 // E2
  { g: 3.55, d: 0.08, kind: 'hurt' },   // hero hit by the Octobald's rock
  { g: 4.6, d: 0.12, kind: 'spin' },    // spin attack ×3
  { g: 9.45, d: 0.07 },                 // boss hit 1
  { g: 9.69, d: 0.07 },                 // boss hit 2
  { g: 10.1, d: 0.18, kind: 'crit' },   // boss hit 3 (leaping strike)
  { g: 10.7, d: 0.1, kind: 'boom' },    // boss final burst
];
export function warp(ts) {
  ts *= GAME_SPEED;
  let acc = 0;
  for (const s of STOPS) {
    const rs = s.g + acc;
    if (ts < rs) return { g: ts - acc, stop: null, sl: 0 };
    if (ts < rs + s.d) return { g: s.g, stop: s, sl: ts - rs };
    acc += s.d;
  }
  return { g: ts - acc, stop: null, sl: 0 };
}
export function filmT(g) {
  let acc = 0;
  for (const s of STOPS) if (s.g < g) acc += s.d;
  return INTRO + (g + acc) / GAME_SPEED;
}
export const G_END = (DURATION - INTRO) * GAME_SPEED - STOPS.reduce((a, s) => a + s.d, 0);

// ---------- areas & camera ----------
// Overworld: screen A x 0..960, screen B x 960..1920. Dungeon: room 1 y 440..880, boss room y 0..440.
export const SCROLL_AB = { t0: 2.62, t1: 3.07 };
export const FADE_DUN = { t0: 5.95, t1: 6.3 }; // walk into the cliff door → black → dungeon
export const SCROLL_UP = { t0: 8.0, t1: 8.4 };
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
export function area(g) { return g < (FADE_DUN.t0 + FADE_DUN.t1) / 2 ? 'over' : 'dun'; }
export function cam(g) {
  if (area(g) === 'over') return { x: 960 * ease((g - SCROLL_AB.t0) / (SCROLL_AB.t1 - SCROLL_AB.t0)), y: 0 };
  return { x: 0, y: 440 * (1 - ease((g - SCROLL_UP.t0) / (SCROLL_UP.t1 - SCROLL_UP.t0))) };
}

// ---------- hero track: [g, x, y] (feet, world coords of the current area) ----------
export const HERO = [
  [0, 330, 255], [0.62, 516, 255],             // walk right
  [0.76, 516, 255],                            // slash E1
  [1.1, 616, 255],                             // pick green gem
  [1.24, 616, 255],                            // slash the tall grass
  [1.42, 668, 255],                            // pick blue gem
  [1.64, 668, 255],                            // slash E2
  [SCROLL_AB.t0, 940, 255],                    // walk to the edge (pick E2's gem)
  [SCROLL_AB.t1, 1000, 255],                   // pushed onto screen B during the scroll
  [3.4, 1095, 255], [3.55, 1095, 255],         // spot the Octobald … rock hits
  [3.71, 1055, 255], [4.72, 1055, 255],        // knockback, charge, spin
  [5.0, 1060, 180],                            // grab the heart
  [5.65, 1260, 180], [FADE_DUN.t0, 1260, 118], // into the cliff door
  [FADE_DUN.t0 + 0.2, 1260, 100],
  // dungeon (room 1 is y 440..880)
  [FADE_DUN.t1, 480, 870], [6.6, 480, 770], [6.85, 525, 690], // enter, walk to the block
  [7.1, 525, 690], [7.38, 485, 690],           // push the block left
  [7.45, 485, 690], [8.0, 480, 495],           // up to the opened shutter
  [SCROLL_UP.t1, 480, 410], [8.6, 480, 335],   // into the boss room
  [9.0, 480, 335], [9.12, 555, 335],           // sidestep the spear
  [9.95, 555, 335], [10.1, 530, 300],          // leaping strike
  [10.8, 530, 300], [10.95, 530, 268],         // walk to the tonic
];
export function heroXY(g) {
  const K = HERO;
  if (g <= K[0][0]) return { x: K[0][1], y: K[0][2], vx: 0, vy: 0 };
  for (let i = 0; i < K.length - 1; i++) {
    const [a, xa, ya] = K[i], [b, xb, yb] = K[i + 1];
    if (g >= a && g < b) {
      const u = (g - a) / (b - a);
      return { x: xa + (xb - xa) * u, y: ya + (yb - ya) * u, vx: (xb - xa) / (b - a), vy: (yb - ya) / (b - a) };
    }
  }
  const L = K[K.length - 1];
  return { x: L[1], y: L[2], vx: 0, vy: 0 };
}

// ---------- hero actions ----------
// slash: { g (start), d, dir } — the blade sweeps 0.14 s; hit (if any) lands at g + 0.06.
export const SLASHES = [
  { g: 0.62, dir: 'right' },
  { g: 1.1, dir: 'right' },
  { g: 1.5, dir: 'right' },
  { g: 9.38, dir: 'up' },
  { g: 9.62, dir: 'up' },
];
export const SLASH_D = 0.14;
export const SPIN = { c0: 3.8, full: 4.3, g0: 4.5, g1: 4.74, hit: 4.6 };
export const HURT = { g: 3.55, t1: 4.35 };
export const PUSH = { t0: 6.85, t1: 7.38, b0: 7.08, b1: 7.38 }; // strain, block slides b0..b1
export const LEAP = { g0: 9.95, hit: 10.1, g1: 10.18 };
export const HOLD = 10.95; // item held overhead
export const DASH = { g0: 9.0, g1: 9.12 };

// facing from the track unless an action overrides it
export function heroFace(g) {
  if (g >= HOLD) return 'down';
  if (g >= PUSH.t0 && g < PUSH.t1) return 'left';
  if (g >= 9.3 && g < LEAP.g0) return 'up';
  if (g >= LEAP.g0 && g < 10.8) return 'up';
  for (const s of SLASHES) if (g >= s.g && g < s.g + SLASH_D + 0.04) return s.dir;
  if (g >= HURT.g && g < SPIN.g1) return 'right';
  const { vx, vy } = heroXY(g + 0.001);
  if (Math.abs(vx) < 1 && Math.abs(vy) < 1) {
    if (g > SCROLL_UP.t1 - 0.01 && g < 9.3) return 'up';
    if (area(g) === 'dun' && g < PUSH.t0) return 'up';
    return 'right';
  }
  if (Math.abs(vy) > Math.abs(vx) * 1.2) return vy < 0 ? 'up' : 'down';
  return vx < 0 ? 'left' : 'right';
}

// ---------- tall grass (screen A) ----------
export const GRASS = [
  ...[215, 255, 295].map((y) => ({ x: 670, y, cut: 1.16 })),
  { x: 630, y: 210 }, { x: 710, y: 212 }, { x: 750, y: 206 }, { x: 628, y: 302 }, { x: 712, y: 300 }, { x: 752, y: 306 }, { x: 790, y: 300 },
  { x: 594, y: 306 }, { x: 790, y: 210 },
];

// ---------- enemies ----------
// path: [g, x, y] keyframes (alive); hit: g; kb: knockback vector; spawn: puff-in time; drop: pickup kind
export const ENEMIES = [
  { id: 'e1', spr: 5, spawn: -1, path: [[0, 700, 205], [0.25, 700, 255], [0.68, 572, 255]], hit: 0.68, kb: [1, 0], drop: 'gem' },
  { id: 'e2', spr: 233, spawn: -1, path: [[0, 760, 140], [0.9, 760, 255], [1.56, 728, 255]], hit: 1.56, kb: [1, 0], drop: 'gem' },
  { id: 'e3', spr: 744, spawn: 3.1, path: [[3.1, 1400, 255], [3.42, 1400, 255], [4.6, 1122, 255]], hit: 4.6, kb: [1, 0], drop: 'gem5', spit: 3.25 },
  { id: 'e4', spr: 419, spawn: 3.16, path: [[3.16, 1110, 140], [3.6, 1110, 140], [4.6, 1062, 178]], hit: 4.6, kb: [0, -1], drop: 'heart' },
  { id: 'e5', spr: 952, spawn: 3.22, path: [[3.22, 1190, 400], [3.5, 1190, 400], [4.6, 1050, 330]], hit: 4.6, kb: [0, 1], drop: null },
];
export const KB_D = 0.16, KB_DIST = 52, DIE_G = 0.2; // knockback time / distance, poof after hit
export function enemyAt(e, g) {
  const P = e.path;
  if (g < e.hit) {
    if (g <= P[0][0]) return { x: P[0][1], y: P[0][2], vx: 0, vy: 0, state: 'walk' };
    for (let i = 0; i < P.length - 1; i++) {
      const [a, xa, ya] = P[i], [b, xb, yb] = P[i + 1];
      if (g < b) { const u = (g - a) / (b - a); return { x: xa + (xb - xa) * u, y: ya + (yb - ya) * u, vx: (xb - xa) / (b - a), vy: (yb - ya) / (b - a), state: 'walk' }; }
    }
  }
  const L = P[P.length - 1], d = Math.min(1, (g - e.hit) / KB_D), k = 1 - (1 - d) * (1 - d);
  return { x: L[1] + e.kb[0] * KB_DIST * k, y: L[2] + e.kb[1] * KB_DIST * k, vx: 0, vy: 0, state: g < e.hit + DIE_G ? 'hit' : 'dead' };
}
export const enemyEnd = (e) => enemyAt(e, e.hit + 1);

// Octobald rock: spat at e3.spit from its mouth toward the hero, hits at HURT.g
export function rock(g) {
  const e = ENEMIES[2], t0 = e.spit + 0.05, t1 = HURT.g;
  if (g < t0 || g >= t1) return null;
  const u = (g - t0) / (t1 - t0), x0 = 1372, x1 = 1112;
  return { x: x0 + (x1 - x0) * u, y: 222, z: 8 * Math.sin(u * Math.PI) };
}

// ---------- pickups ----------
// value: gems; heart: +hp. g = collected.
export const PICKUPS = [
  { kind: 'gem', x: enemyEnd(ENEMIES[0]).x, y: 258, g0: 0.68 + DIE_G, g: 1.07, v: 1 },
  { kind: 'gem5', x: 670, y: 256, g0: 1.16, g: 1.4, v: 5 },
  { kind: 'gem', x: enemyEnd(ENEMIES[1]).x, y: 258, g0: 1.56 + DIE_G, g: 2.02, v: 1 },
  { kind: 'gem5', x: enemyEnd(ENEMIES[2]).x, y: 258, g0: 4.6 + DIE_G, g: 99, v: 5 },
  { kind: 'heart', x: enemyEnd(ENEMIES[3]).x, y: enemyEnd(ENEMIES[3]).y + 2, g0: 4.6 + DIE_G, g: 4.98, v: 1 },
];
export const GEM0 = 47;
export const hudGems = (g) => GEM0 + PICKUPS.filter((p) => p.kind !== 'heart' && g >= p.g).reduce((a, p) => a + p.v, 0);
// hearts: 5 containers, start 3, rock hit −2, heart +1, tonic refill to 5
export const REFILL = { t0: 11.15, t1: 11.65 };
export function hudLife(g) {
  let hp = 3;
  if (g >= HURT.g) hp -= 2;
  if (g >= 4.98) hp += 1;
  if (g >= REFILL.t0) hp = Math.min(5, hp + Math.floor((g - REFILL.t0) / ((REFILL.t1 - REFILL.t0) / 3)) + 0);
  return Math.min(5, hp);
}

// ---------- dungeon ----------
export const BLOCK = { x0: 480, x1: 440, y: 690 }; // centre x, feet y (world)
export const CHIME = 7.4; // secret found
export const SHUTTER_OPEN = { t0: 7.45, t1: 7.7 };
export const SHUTTER_CLOSE = { t0: 8.5, t1: 8.6 }; // boss room door behind the hero
export const BOSS = { spr: 1217, x: 480, y: 190 };
export const ROAR = { t0: 8.62, t1: 8.98 };
export const SPEAR = { wind: 8.9, g0: 9.0, g1: 9.24 }; // thrown straight down, sticks in the south wall
export const CHARGE = { t0: 9.22, t1: 9.4 };
export const BOSS_HITS = [9.45, 9.69, 10.1];
export const BOSS_DIE = { t0: 10.1, t1: 10.7 };
export function bossAt(g) {
  let x = BOSS.x, y = BOSS.y;
  if (g >= CHARGE.t0) { const u = ease((g - CHARGE.t0) / (CHARGE.t1 - CHARGE.t0)); x += 50 * u; y += 62 * u; }
  for (const [i, h] of BOSS_HITS.entries()) {
    if (g >= h) { const u = Math.min(1, (g - h) / 0.14); y -= (i === 2 ? 34 : 22) * (1 - (1 - u) * (1 - u)); }
  }
  if (g >= 9.8 && g < LEAP.hit) { const u = ease((g - 9.8) / 0.25); y += 26 * u; }
  if (g >= LEAP.hit) y += 26;
  return { x, y };
}
export const TONIC = { g0: 10.76, x: 530, y: 222 };
export const TEXT = { t0: HOLD + 0.1, cps: 100, l1: 'You got the HAIR TONIC!', l2: 'Your hair is LEGENDARY.' };
export const IRIS_OUT = { t0: G_END - 0.18, t1: G_END };
