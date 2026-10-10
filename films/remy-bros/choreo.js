// Choreography: the whole level is a pure function of game time g.
// Game time runs inside the 'level' shot and freezes during hit-stops, so every impact lands with weight.
// Level geometry is derived from the hero's path (blocks, enemies, pits sit where the hero will be),
// so re-timing a beat moves its props with it.

export const INTRO = 1.5; // title card, film seconds
export const DURATION = 15;
export const LW = 960, LH = 540, TILE = 24;
export const GY = 468; // ground line (feet)
export const SMALL_H = 77, BIG_H = 114, EH = 77; // hero small / big height, enemy height (feet → crown)

// ---------- hit-stops (game time, duration, kind) ----------
export const STOPS = [
  { g: 2.0, d: 0.06 }, { g: 2.5, d: 0.06 },
  { g: 3.95, d: 0.55, kind: 'power' },
  { g: 4.57, d: 0.04 }, { g: 4.82, d: 0.04 }, { g: 5.07, d: 0.04 },
  { g: 5.72, d: 0.04 },
  { g: 7.2, d: 0.06 }, { g: 7.66, d: 0.03 },
  { g: 7.78, d: 0.03 }, { g: 7.86, d: 0.03 }, { g: 7.94, d: 0.03 }, { g: 8.02, d: 0.05 },
  { g: 10.2, d: 0.1, kind: 'grab' },
];

// Shot time → { g, stop (active stop or null), sl (seconds into it) }.
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
  return INTRO + g + acc;
}
export const G_END = DURATION - INTRO - STOPS.reduce((a, s) => a + s.d, 0);

// ---------- hero x: integrated speed profile ----------
const SPEED = [
  [0, 0], [0.45, 0], [0.46, 260], [0.8, 260], [1.05, 330],
  [4.1, 330], [4.3, 380], [6.85, 380], [6.95, 200], [7.66, 200], [7.75, 380],
  [8.5, 380], [8.65, 205], [9.6, 205], [9.65, 420], [10.19, 420], [10.2, 0],
  [10.84, 0], [10.85, 170], [11.15, 170], [11.2, 140], [13, 140],
];
const X0 = 140, DT = 1 / 1200, NX = Math.ceil(13 / DT) + 2;
const XT = new Float64Array(NX);
function speedAt(g) {
  for (let i = 0; i < SPEED.length - 1; i++) {
    const [a, va] = SPEED[i], [b, vb] = SPEED[i + 1];
    if (g >= a && g < b) return b > a ? va + (vb - va) * ((g - a) / (b - a)) : vb;
  }
  return SPEED[SPEED.length - 1][1];
}
XT[0] = X0;
for (let i = 1; i < NX; i++) XT[i] = XT[i - 1] + 0.5 * (speedAt((i - 1) * DT) + speedAt(i * DT)) * DT;
const POLE_FLIP = 10.78, FLIP_DX = 52;
export function heroX(g) {
  const f = Math.max(0, Math.min(NX - 1.001, g / DT)), i = Math.floor(f);
  return XT[i] + (XT[i + 1] - XT[i]) * (f - i) + (g >= POLE_FLIP ? FLIP_DX : 0);
}
export const heroSpeed = (g) => speedAt(g);

// ---------- hero y: jumps (feet y), up = ease-out, down = ease-in ----------
const PARA_FEET = GY - 70, PARA_HEAD = PARA_FEET - EH;
export const JUMPS = [
  { t0: 0.45, ta: 0.6, t1: 0.8, y0: 420, ya: 372, y1: GY },
  { t0: 1.0, ta: 1.22, t1: 1.52, y0: GY, ya: GY - 89, y1: GY, bonk: 'q1' },
  { t0: 1.68, ta: 1.86, t1: 2.0, y0: GY, ya: GY - 150, y1: GY - EH },
  { t0: 2.0, ta: 2.2, t1: 2.5, y0: GY - EH, ya: GY - EH - 110, y1: GY - EH },
  { t0: 2.5, ta: 2.68, t1: 2.98, y0: GY - EH, ya: GY - EH - 120, y1: GY },
  { t0: 3.2, ta: 3.42, t1: 3.72, y0: GY, ya: GY - 89, y1: GY, bonk: 'q2' },
  { t0: 5.55, ta: 5.72, t1: 5.98, y0: GY, ya: GY - 76, y1: GY, bonk: 'bricks' },
  { t0: 6.2, ta: 6.48, t1: 6.8, y0: GY, ya: GY - 170, y1: GY },
  { t0: 6.95, ta: 7.08, t1: 7.2, y0: GY, ya: PARA_HEAD - 25, y1: PARA_HEAD },
  { t0: 7.2, ta: 7.36, t1: 7.58, y0: PARA_HEAD, ya: PARA_HEAD - 60, y1: GY },
  { t0: 8.75, ta: 8.9, t1: 9.05, y0: GY, ya: GY - 122, y1: GY - 72 },
  { t0: 9.1, ta: 9.25, t1: 9.4, y0: GY - 72, ya: GY - 189, y1: GY - 144 },
  { t0: 9.62, ta: 9.95, t1: 10.2, y0: GY - 144, ya: 178, y1: 236 },
  { t0: 10.85, ta: 10.97, t1: 11.15, y0: GY - 24, ya: GY - 64, y1: GY },
];
export const SLIDE = { t0: 10.2, t1: 10.75, y0: 236, y1: GY - 24 };
export function heroY(g) {
  if (g < 0.45) { const u = Math.min(1, g / 0.45); return 420 + 84 * (1 - u) * (1 - u); }
  for (const j of JUMPS) {
    if (g >= j.t0 && g < j.t1) {
      if (g < j.ta) { const u = (g - j.t0) / (j.ta - j.t0); return j.y0 + (j.ya - j.y0) * (1 - (1 - u) * (1 - u)); }
      const u = (g - j.ta) / (j.t1 - j.ta);
      return j.ya + (j.y1 - j.ya) * u * u;
    }
  }
  if (g >= SLIDE.t0 && g < SLIDE.t1) { const u = (g - SLIDE.t0) / (SLIDE.t1 - SLIDE.t0); return SLIDE.y0 + (SLIDE.y1 - SLIDE.y0) * u * u * (3 - 2 * u); }
  if (g >= SLIDE.t1 && g < 10.85) return SLIDE.y1;
  let y = 420;
  for (const j of JUMPS) if (g >= j.t1) y = j.y1;
  return y;
}
export const jumpAt = (g) => JUMPS.find((j) => g >= j.t0 && g < j.t1) ?? null;
export const POWER_G = 3.95;
export const isBig = (g) => g >= POWER_G;
export const heroH = (g) => (isBig(g) ? BIG_H : SMALL_H);
export const POLE_FLIP_G = POLE_FLIP;

// ---------- level geometry ----------
const snap = (x) => Math.round((x - 12) / TILE) * TILE + 12; // tile centre
export const PIPE = { x: X0, top: 420 };
export const Q1 = { x: snap(heroX(1.22)), bottom: GY - 89 - SMALL_H, hit: 1.22, item: 'coin' };
export const Q2 = { x: snap(heroX(3.42)), bottom: GY - 89 - SMALL_H, hit: 3.42, item: 'tonic' };
export const BRICK_G = 5.72;
const bx = snap(heroX(BRICK_G));
export const BRICKS = [-2, -1, 0, 1, 2].map((k) => {
  const x = bx + k * TILE, hx = heroX(BRICK_G);
  return { x, bottom: GY - 76 - BIG_H, smash: x + 12 > hx - 16 && x - 12 < hx + 16 };
});
export const PIT = { l: Math.ceil(heroX(6.32) / TILE) * TILE, r: Math.floor(heroX(6.68) / TILE) * TILE };
export const STAIR_X = heroX(9.05) - 60; // left edge; columns 0..7, heights 1..6,6,6 tiles
export const STAIR_COLS = [1, 2, 3, 4, 5, 6, 6, 6];
export const POLE = { x: heroX(10.2) + 26, top: 104, base: GY - 24 };
export const DOOR_X = heroX(11.6);
export const CASTLE = { x: DOOR_X - 84, w: 168 };
export const CAM_MAX = DOOR_X - 600;

// ---------- enemies ----------
// kind: walk | para. death: stomp | fire | shell. x(g) walks left from hitX until gh.
const FB_V = 600, FB_T = 0.32;
export const FIRE_T = [4.25, 4.5, 4.75];
export const fireball = (i, g) => {
  const tf = FIRE_T[i], dt = g - tf, x0 = heroX(tf) + 30;
  const hand = GY - 52;
  const y = dt < 0.1 ? hand + (GY - 8 - hand) * (dt / 0.1) ** 2 : GY - 8 - 30 * Math.abs(Math.sin((Math.PI * (dt - 0.1)) / 0.16));
  return { x: x0 + FB_V * dt, y, live: dt >= 0 && dt < FB_T };
};
export const KICK_G = 7.66, SHELL_V = 760;
export const SHELL_REST = heroX(KICK_G) + 36;
export const SHELL_HITS = [7.78, 7.86, 7.94, 8.02];
export const SHELL_CRASH = KICK_G + (STAIR_X - 14 - SHELL_REST) / SHELL_V;
export function shell(g) {
  const sx = heroX(7.2);
  if (g < 7.2) return null;
  if (g < 7.42) { const u = (g - 7.2) / 0.22; return { x: sx + (SHELL_REST - sx) * u, y: PARA_FEET + (GY - PARA_FEET) * u * u - 40 * Math.sin(Math.PI * u) * (1 - u), spin: 0, live: true }; }
  if (g < KICK_G) return { x: SHELL_REST, y: GY, spin: 0, live: true };
  if (g < SHELL_CRASH) return { x: SHELL_REST + SHELL_V * (g - KICK_G), y: GY, spin: (g - KICK_G) * 26, live: true };
  return null;
}

export const ENEMIES = [
  { spr: 5, death: 'stomp', gh: 2.0, x: heroX(2.0), pts: '100' },
  { spr: 0, death: 'stomp', gh: 2.5, x: heroX(2.5), pts: '200' },
  ...FIRE_T.map((tf, i) => ({ spr: [233, 419, 1034][i], death: 'fire', gh: tf + FB_T, x: heroX(tf) + 30 + FB_V * FB_T, pts: '200' })),
  { spr: 482, death: 'stomp', gh: 7.2, x: heroX(7.2), kind: 'para', pts: '400' },
  ...SHELL_HITS.map((gh, i) => ({ spr: [98, 287, 952, 183][i], death: 'shell', gh, x: SHELL_REST + SHELL_V * (gh - KICK_G), pts: ['500', '800', '1000', '1UP'][i] })),
];
export function enemyAt(e, g) {
  const v = e.kind === 'para' ? -60 : -42;
  const x = e.x + v * (g - Math.min(g, e.gh));
  const feet = e.kind === 'para' ? PARA_FEET + 10 * Math.sin(2 * Math.PI * 1.6 * (g - 7.2)) : GY;
  return { x, feet };
}

// ---------- pickups ----------
export const PIT_COINS = [6.3, 6.4, 6.5, 6.6].map((g) => ({ g, x: heroX(g), y: heroY(g) - BIG_H / 2 }));

// ---------- scoring / HUD ----------
export const SCORE = [
  [1.22, 200], [2.0, 100], [2.5, 200], [3.95, 1000],
  ...FIRE_T.map((t) => [t + FB_T, 200]), [5.72, 100],
  ...PIT_COINS.map((c) => [c.g, 200]), [7.2, 400], ...SHELL_HITS.map((g, i) => [g, [500, 800, 1000, 2000][i]]), [10.2, 5000],
];
export const COINS = [1.22, ...PIT_COINS.map((c) => c.g)];
export const TALLY = { t0: 10.9, t1: 11.9 };
export const TIME0 = 400;
export function hudTime(g) {
  const left = TIME0 - Math.floor(Math.min(g, 10.2) / 0.4);
  if (g < TALLY.t0) return left;
  return Math.max(0, Math.round(left * (1 - Math.min(1, (g - TALLY.t0) / (TALLY.t1 - TALLY.t0)))));
}
export function hudScore(g) {
  let s = 0;
  for (const [t, p] of SCORE) if (g >= t) s += p;
  const left = TIME0 - Math.floor(10.2 / 0.4);
  if (g >= TALLY.t0) s += (left - hudTime(g)) * 50;
  return s;
}
export const hudCoins = (g) => COINS.filter((t) => g >= t).length;
export const hudKills = (g) => ENEMIES.filter((e) => g >= e.gh).length;

// ---------- camera ----------
export function camX(g) {
  let s = 0;
  const n = 12;
  for (let i = 0; i < n; i++) s += heroX(Math.max(0, g - (i / n) * 0.3));
  return Math.max(0, Math.min(CAM_MAX, s / n - 330));
}

// ---------- end beats ----------
export const FLAG_RISE = { t0: 11.62, t1: 11.9 };
export const FIREWORKS = [11.3, 11.5, 11.7];
export const IRIS_OUT = { t0: 12.04, t1: 12.32 };
