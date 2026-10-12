// REMY RUN choreography: every position is a pure function of game time g.
// Game time runs inside the 'race' shot and freezes during hit-stops. Key beats are solved backwards from the
// music grid (128 BPM) so bumps, the checkpoint, the nitro, the boss ram and the goal land on bar lines.

export const LW = 640, LH = 360; // native resolution, upscaled 3× nearest
export const HZ = 150; // horizon row
export const FP = 320; // projection factor (px per unit at scale 1), square pixels
export const DEPTH = 0.84; // 1 / tan(fov / 2), ~100° fov
export const CAM_H = 700;
export const SEG = 200;
export const ROADW = 1200; // road half-width, 3 lanes
export const RUMBLE = 4;
export const PZ = 950; // hero car rear, distance in front of the camera
export const DRAW = 240; // segments drawn
export const CARL = 650; // contact distance when rear-ending a car
export const PXW = 3.5; // world units per art pixel (art is 1:1 at the hero car's depth)

// ---------- film timing ----------
export const T_TITLE = 1.3, T_RACE = 2.6;
export const BPM = 128, BEAT = 60 / BPM, BAR = 4 * BEAT;
export const M0 = T_RACE + 0.3; // launch = downbeat of bar 1
export const T_END = M0 + 5 * BAR; // cut to the ending cutscene
export const DURATION = 15;
// radio-select card (film time): the dial visits each station; static between
export const RADIO = [
  { t0: T_TITLE + 0.1, t1: T_TITLE + 0.34, name: 'PERM WAVE', fm: '84.7', pos: 0.16 },
  { t0: T_TITLE + 0.42, t1: T_TITLE + 0.66, name: 'PARTING BREEZE', fm: '91.3', pos: 0.5 },
  { t0: T_TITLE + 0.74, t1: T_RACE, name: 'MAGICAL HAIR SHOWER', fm: '98.6', pos: 0.84 },
];
export const RADIO_OK = T_TITLE + 0.98;

// ---------- beats (game time) ----------
const D = { bump: 0.07, nitro: 0.15, smash: 0.05, boss: 0.3, goal: 0.08 };
export const G = {
  launch: 0.3,
  passA: 1.0,
  passB: 1.55,
  bump: M0 + BAR - T_RACE,
  crest: 2.68,
  fork: 3.25,
  check: M0 + 2 * BAR - T_RACE - D.bump,
  truck: 4.6,
  miss: 5.1,
  nitro: M0 + 3 * BAR - T_RACE - D.bump,
  smashE: 6.3,
  smashF: 6.55,
};
G.boss = M0 + 4 * BAR - T_RACE - (D.bump + D.nitro + 2 * D.smash);
G.goal = M0 + 4.5 * BAR - T_RACE - (D.bump + D.nitro + 2 * D.smash + D.boss);
G.end = T_END - T_RACE - (D.bump + D.nitro + 2 * D.smash + D.boss + D.goal);

export const STOPS = [
  { g: G.bump, d: D.bump, kind: 'bump' },
  { g: G.nitro, d: D.nitro, kind: 'nitro' },
  { g: G.smashE, d: D.smash, kind: 'smash' },
  { g: G.smashF, d: D.smash, kind: 'smash' },
  { g: G.boss, d: D.boss, kind: 'boss' },
  { g: G.goal, d: D.goal, kind: 'goal' },
];
// Shot time → { g, stop, sl }
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
  return T_RACE + g + acc;
}

// ---------- hero speed (world units / s) ----------
const SPEED = [
  [0, 0], [G.launch, 0], [0.45, 2200], [0.7, 4600], [1.0, 6200], [1.4, 7400], [1.9, 8000],
  [G.bump, 8000], [G.bump + 0.01, 6000], [G.bump + 0.5, 7800], [3.0, 8200], [G.nitro, 8400],
  [G.nitro + 0.01, 9800], [G.nitro + 0.35, 12500], [G.smashE, 12500], [G.smashE + 0.01, 11600], [G.smashF, 12400], [G.smashF + 0.01, 11500], [G.smashF + 0.3, 12500],
  [G.boss, 12500], [G.boss + 0.01, 9000], [G.boss + 0.45, 10500], [G.goal, 10200], [G.goal + 0.3, 7400], [G.end, 3000], [G.end + 2, 0],
];
export function speedAt(g) {
  if (g <= 0) return 0;
  for (let i = 0; i < SPEED.length - 1; i++) {
    const [a, va] = SPEED[i], [b, vb] = SPEED[i + 1];
    if (g >= a && g < b) return b > a ? va + (vb - va) * ((g - a) / (b - a)) : vb;
  }
  return SPEED[SPEED.length - 1][1];
}
const DT = 1 / 1200, NT = Math.ceil((G.end + 1) / DT) + 2;
const ZT = new Float64Array(NT);
for (let i = 1; i < NT; i++) ZT[i] = ZT[i - 1] + 0.5 * (speedAt((i - 1) * DT) + speedAt(i * DT)) * DT;
export function camZ(g) {
  const f = Math.max(0, Math.min(NT - 1.001, g / DT)), i = Math.floor(f);
  return ZT[i] + (ZT[i + 1] - ZT[i]) * (f - i);
}
export const heroZ = (g) => camZ(g) + PZ;
export const segAt = (g) => heroZ(g) / SEG;
export const kmh = (g) => { const v = speedAt(g); return Math.round(v <= 8400 ? (v * 293) / 8400 : 293 + (v - 8400) * 0.022); };
// engine revs (0..1): LO gear to 150 km/h, HI above; nitro pins the needle
export function rpm(g) {
  if (g < G.launch) return 0.28 + 0.5 * Math.max(0, Math.sin(g * 30)) * (g > 0.05 ? 1 : 0);
  if (g >= G.nitro && g < G.boss) return 0.97;
  const sp = kmh(g);
  return sp < 150 ? 0.18 + (0.8 * sp) / 150 : Math.min(1, 0.42 + (0.55 * (sp - 150)) / 143);
}

// ---------- hero lateral (road half-widths), smoothstep between keys ----------
const XK = [
  [0, 0], [0.45, 0], [0.75, -0.6], [1.15, -0.6], [1.42, 0.12], [1.8, 0.2], [2.1, 0.22], [G.bump, 0.24], [2.55, -0.05],
  [2.95, -0.32], [3.1, -0.3], [3.5, 0.34], [3.9, 0.2], [4.2, 0.1], [4.42, -0.62], [4.75, -0.6], [5.0, 0.18], [5.25, 0.22],
  [5.6, 0.0], [6.1, -0.06], [G.smashE, -0.08], [6.48, 0.22], [G.smashF, 0.26], [6.9, 0.1], [7.3, 0.02], [G.boss, 0.04],
  [7.9, 0.0], [G.goal, 0.0], [8.6, 0.1], [G.end, 0.22],
];
export function heroX(g) {
  if (g <= XK[0][0]) return XK[0][1];
  for (let i = 0; i < XK.length - 1; i++) {
    const [a, xa] = XK[i], [b, xb] = XK[i + 1];
    if (g >= a && g < b) { const u = (g - a) / (b - a); return xa + (xb - xa) * u * u * (3 - 2 * u); }
  }
  return XK[XK.length - 1][1];
}
export const heroVX = (g) => (heroX(g + 0.01) - heroX(g - 0.01)) / 0.02;

// ---------- track ----------
export const NSEG = Math.ceil((heroZ(G.end + 1) + DRAW * SEG) / SEG) + 4;
const sg = (g) => Math.floor(segAt(g));
// curves: [g0, g1, strength]
const CURVES = [
  [0.9, 1.9, 2.4], [2.25, 3.0, -3.2], [G.fork, 4.0, 3.6], [4.45, 5.0, -3.2], [5.0, 5.7, 3.4], [6.62, 7.35, -2.6], [7.6, 8.3, 1.2],
];
// hills: [g, height]
const HILLS = [[0, 0], [2.15, 0], [2.68, 1500], [3.1, 300], [3.6, 300], [4.0, 600], [5.9, 600], [6.2, -300], [6.55, 400], [7.2, 900], [7.7, 900], [8.4, 600], [G.end + 1, 600]];
export const CURVE = new Float32Array(NSEG);
export const Y = new Float32Array(NSEG + 1);
for (const [g0, g1, c] of CURVES) {
  const a = sg(g0), b = sg(g1);
  for (let i = a; i < b && i < NSEG; i++) {
    const u = (i - a) / (b - a), k = Math.min(1, u / 0.22, (1 - u) / 0.22);
    CURVE[i] += c * k * k * (3 - 2 * k);
  }
}
{
  const keys = HILLS.map(([g, h]) => [g <= 0 ? 0 : Math.max(0, sg(g)), h]);
  for (let i = 0; i <= NSEG; i++) {
    let y = keys[keys.length - 1][1];
    for (let k = 0; k < keys.length - 1; k++) {
      const [a, ha] = keys[k], [b, hb] = keys[k + 1];
      if (i >= a && i < b) { const u = (i - a) / (b - a); y = ha + (hb - ha) * (1 - Math.cos(Math.PI * u)) / 2; break; }
    }
    Y[i] = y;
  }
}
export const roadY = (z) => {
  const f = Math.max(0, Math.min(NSEG - 0.001, z / SEG)), i = Math.floor(f);
  return Y[i] + (Y[i + 1] - Y[i]) * (f - i);
};
export const curveAt = (z) => CURVE[Math.max(0, Math.min(NSEG - 1, Math.floor(z / SEG)))];
// background parallax: accumulated curve × distance
const CUM = new Float32Array(NSEG + 1);
for (let i = 0; i < NSEG; i++) CUM[i + 1] = CUM[i] + CURVE[i];
export const bgX = (z) => {
  const f = Math.max(0, Math.min(NSEG - 0.001, z / SEG)), i = Math.floor(f);
  return CUM[i] + CURVE[i] * (f - i);
};

export const START_SEG = sg(0) + 3;
export const FORK_SEG = sg(G.fork);
export const FORK_LEN = 140;
export const CHECK_SEG = sg(G.check);
export const GOAL_SEG = sg(G.goal);
export const STAGE2_SEG = CHECK_SEG;
// fork: separation (world units) between the hero road (right branch) and the left branch
export const forkSep = (i) => (i < FORK_SEG ? 0 : Math.min(9000, 14 * (i - FORK_SEG) ** 1.5));

// ---------- traffic ----------
// kind: bug | pickup | truck | limo. Positions: z (world), x (road half-widths), y (hop), yaw, roll.
const passCar = (o) => ({ ...o, z: (g) => heroZ(o.g) + o.v * (g - o.g) });
export const CARS = [
  passCar({ id: 'A', kind: 'bug', col: 0, driver: 0, lane: 0.02, v: 4200, g: G.passA }),
  passCar({ id: 'B', kind: 'pickup', col: 1, driver: 5, lane: -0.66, v: 4600, g: G.passB }),
  { id: 'C', kind: 'bug', col: 2, driver: 98, lane: 0.5, v: 5000, g: G.bump, hit: 'spin', dir: 1 },
  passCar({ id: 'T', kind: 'truck', col: 0, driver: 23, lane: 0.0, v: 4200, g: G.truck }),
  passCar({ id: 'D', kind: 'bug', col: 3, driver: 233, lane: 0.66, v: 4800, g: G.miss }),
  { id: 'E', kind: 'bug', col: 4, driver: 287, lane: -0.12, v: 6200, g: G.smashE, hit: 'smash', dir: -1 },
  { id: 'F', kind: 'pickup', col: 2, driver: 419, lane: 0.42, v: 6400, g: G.smashF, hit: 'smash', dir: 1 },
  { id: 'BOSS', kind: 'limo', col: 0, driver: 1217, lane: 0.06, v: 8200, g: G.boss, hit: 'boss', dir: 1 },
];
// A car hit at g0: before, it cruises at v with its rear CARL ahead of the hero's rear; after, it carries an impulse.
export function carAt(c, g) {
  if (!c.hit) return { z: c.z(g), x: c.lane + 0.02 * Math.sin(g * 1.3 + c.v), y: 0, yaw: 0, roll: 0, hitAge: -1 };
  const z0 = heroZ(c.g) + CARL;
  if (g < c.g) {
    let x = c.lane;
    if (c.hit === 'boss') x += 0.12 * Math.sin(g * 2.4); // the boss swerves to block
    return { z: z0 + c.v * (g - c.g), x, y: 0, yaw: c.hit === 'boss' ? 0.05 * Math.sin(g * 2.4 + 1) : 0, roll: 0, hitAge: -1 };
  }
  const a = g - c.g;
  if (c.hit === 'spin') {
    const v1 = speedAt(c.g - 0.01) * 0.92, tau = 0.62;
    return {
      z: z0 + v1 * tau * (1 - Math.exp(-a / tau)),
      x: c.lane + c.dir * 1.5 * (1 - Math.exp(-a / 0.42)),
      y: 140 * Math.max(0, Math.sin(Math.min(1, a / 0.28) * Math.PI)),
      yaw: c.dir * 3.6 * Math.PI * (1 - Math.exp(-a / 0.55)),
      roll: 0, hitAge: a,
    };
  }
  if (c.hit === 'smash') {
    const v1 = speedAt(c.g - 0.01) * 0.98, tau = 1.1, T = 0.65;
    const air = a < T ? 500 * (a / T) * (1 - a / T) * 4 : 80 * Math.max(0, Math.sin(((a - T) / 0.22) * Math.PI)) * Math.exp(-(a - T) * 3);
    return {
      z: z0 + v1 * tau * (1 - Math.exp(-a / tau)),
      x: c.lane + c.dir * 1.6 * (1 - Math.exp(-a / 0.55)),
      y: air,
      yaw: c.dir * 3 * Math.PI * (1 - Math.exp(-a / 0.5)),
      roll: a < T ? c.dir * 2 * Math.PI * (a / T) : 0,
      hitAge: a,
    };
  }
  // boss: launched high, flips, crashes on the right shoulder
  const v1 = speedAt(c.g - 0.01), tau = 1.25, T = 0.62;
  const air = a < T ? 900 * 4 * (a / T) * (1 - a / T) : 100 * Math.max(0, Math.sin(((a - T) / 0.2) * Math.PI)) * Math.exp(-(a - T) * 4);
  return {
    z: z0 + v1 * tau * (1 - Math.exp(-a / tau)),
    x: c.lane + 1.45 * (1 - Math.exp(-a / 0.65)),
    y: air,
    yaw: 1.2 * Math.PI * (1 - Math.exp(-a / 0.6)),
    roll: a < T ? 2 * Math.PI * (a / T) : 2 * Math.PI,
    hitAge: a,
  };
}
export const BOSS_LAND = G.boss + 0.62;

// ---------- HUD ----------
export const TIME0 = 62, TIME_BONUS = 40;
export function hudTime(g) {
  let t = TIME0 - Math.floor(g * 1.9); // arcade seconds run fast
  if (g >= G.check) t += TIME_BONUS;
  if (g >= G.goal) t = TIME0 - Math.floor(G.goal * 1.9) + TIME_BONUS;
  return Math.max(0, t);
}
export const BONUS = [[G.bump, 1000], [G.miss, 500], [G.check, 10000], [G.smashE, 2000], [G.smashF, 4000], [G.boss, 50000], [G.goal, 100000]];
export function hudScore(g) {
  let s = Math.floor((camZ(Math.min(g, G.goal)) / 10)) * 10;
  for (const [t, p] of BONUS) if (g >= t) s += p;
  return s;
}
export const lapTime = (g) => Math.min(g, G.goal) * 1.07 + 0.0; // arcade lap clock (s)

// ---------- particles / screen shake ----------
export const SHAKES = [
  [G.launch, 1.5], [G.bump, 4], [G.crest + 0.18, 2], [G.nitro, 3], [G.smashE, 5], [G.smashF, 5], [G.boss, 9], [BOSS_LAND, 6], [G.goal, 3],
];
