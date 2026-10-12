// Choreography: the whole floor is a pure function of game time g.
// Game time runs inside the 'game' shot and freezes during hit-stops; filmT maps game events to film seconds
// so the score lands every shot, door and scream on its frame.

export const TITLE = 1.4; // title card (film seconds)
export const DURATION = 15;
export const LW = 640, LH = 360; // native resolution, upscaled 3× nearest
export const VW = 640, VH = 288; // 3D view; status bar below
export const BAR_H = LH - VH;

// ---------- hit-stops (game time, duration, kind) ----------
export const STOPS = [
  { g: 1.12, d: 0.06 },
  { g: 3.3, d: 0.06 },
  { g: 3.78, d: 0.06 },
  { g: 4.35, d: 0.34, kind: 'grin' },
  { g: 5.05, d: 0.14, kind: 'reveal' },
  { g: 7.5, d: 0.36, kind: 'boss' },
  { g: 9.2, d: 0.08 },
];
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
export function filmT(g) {
  let acc = 0;
  for (const s of STOPS) if (s.g < g) acc += s.d;
  return TITLE + g + acc;
}
export const G_END = 9.5;
export const GAME_END = filmT(G_END) + 0.0001; // film time the game shot ends (tally starts)
export const TALLY0 = Math.round(GAME_END * 60) / 60;

// ---------- map ----------
// Carved from solid rock. Wall theme comes from the room the face looks into (corridor stone, office wood,
// hall red brick, elevator steel); 'X' marks a decorated wall (banner / portrait / seal), 'D' a sliding door,
// 'O' a pillar, 'L' the elevator switch.
export const MW = 31, MH = 19;
export const MAP = (() => {
  const m = Array.from({ length: MH }, () => Array(MW).fill('#'));
  const carve = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m[y][x] = '.'; };
  carve(1, 10, 9, 12); // corridor
  carve(11, 6, 18, 16); // office
  carve(20, 7, 26, 15); // hall
  carve(27, 10, 28, 12); // elevator alcove
  m[11][10] = 'D'; m[11][19] = 'D'; m[11][29] = 'L';
  for (const [x, y] of [[22, 8], [22, 14], [25, 8], [25, 14]]) m[y][x] = 'O';
  const X = [[2, 9], [5, 9], [8, 9], [2, 13], [5, 13], [8, 13], // banners
    [10, 7], [10, 15], [19, 7], [19, 15], [12, 5], [15, 5], [17, 5], [12, 17], [15, 17], [17, 17], // portraits
    [21, 6], [24, 6], [21, 16], [24, 16], [27, 8], [27, 14]]; // seals
  for (const [x, y] of X) m[y][x] = 'X';
  return m.map((r) => r.join(''));
})();
export const DOORS = [
  { x: 10, y: 11, open: [1.72, 2.12] },
  { x: 19, y: 11, open: [4.42, 4.82] },
];
export const SWITCH = { x: 29, y: 11 };
export const SWITCH_G = 9.2;
// Region (theme) per tile: 0 corridor, 1 office, 2 hall, 3 elevator.
export const region = (x) => (x < 10 ? 0 : x < 19 ? 1 : x < 27 ? 2 : 3);

// ---------- hero path: keyed (g, x, y, angle), cubic Hermite ----------
const K = [
  [0.0, 1.6, 11.5, 0.0],
  [0.3, 1.6, 11.5, 0.0],
  [0.95, 3.25, 11.42, -0.06],
  [1.2, 3.65, 11.42, -0.06],
  [1.9, 6.4, 11.5, 0.0],
  [2.45, 8.7, 11.5, 0.0],
  [2.78, 10.2, 11.5, -0.2],
  [3.04, 11.25, 11.6, -0.6],
  [3.3, 11.6, 11.6, -0.58],
  [3.56, 11.8, 11.55, 0.52],
  [3.8, 12.1, 11.6, 0.52],
  [4.08, 13.6, 12.05, 0.2],
  [4.35, 15.05, 11.6, 0.0],
  [4.6, 16.55, 11.4, 0.0],
  [4.85, 17.95, 11.55, 0.0],
  [5.05, 19.25, 11.5, 0.0],
  [5.45, 20.2, 11.5, 0.0],
  [6.1, 20.85, 10.8, 0.0],
  [6.85, 21.6, 12.2, 0.0],
  [7.5, 22.0, 11.6, 0.0],
  [7.8, 22.25, 11.8, 0.1],
  [8.15, 23.3, 12.45, 0.08],
  [8.5, 25.1, 12.6, -0.06],
  [8.85, 26.9, 11.75, -0.03],
  [9.2, 28.25, 11.5, 0.0],
  [9.5, 28.3, 11.5, 0.0],
];
function herm(i, g, c) {
  const a = K[i], b = K[i + 1];
  const t0 = a[0], t1 = b[0], h = t1 - t0, s = (g - t0) / h;
  const slope = (j) => {
    const p = K[Math.max(0, j - 1)], n = K[Math.min(K.length - 1, j + 1)];
    if (j === 0 || j === K.length - 1) return 0;
    // zero tangent at held keys (no overshoot when standing still)
    if (K[j][c] === p[c] || K[j][c] === n[c]) return 0;
    const d0 = (K[j][c] - p[c]) / (K[j][0] - p[0]), d1 = (n[c] - K[j][c]) / (n[0] - K[j][0]);
    if (d0 * d1 <= 0) return 0;
    return (2 * d0 * d1) / (d0 + d1);
  };
  const m0 = slope(i) * h, m1 = slope(i + 1) * h;
  const s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * a[c] + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * b[c] + (s3 - s2) * m1;
}
function keyed(g, c) {
  if (g <= K[0][0]) return K[0][c];
  for (let i = 0; i < K.length - 1; i++) if (g < K[i + 1][0]) return herm(i, g, c);
  return K[K.length - 1][c];
}

// ---------- boss ----------
export const BOSS = { x0: 26.1, x1: 24.6, y: 11.5, walk: [5.3, 7.5], death: 7.5, roar: 5.05, hp: 22 };
export const bossX = (g) => {
  const [a, b] = BOSS.walk;
  if (g <= a) return BOSS.x0;
  if (g >= b) return BOSS.x1;
  // stomping gait: advance in steps
  const n = 5, u = ((g - a) / (b - a)) * n, k = Math.floor(u), f = u - k;
  const step = k + (f < 0.55 ? 0.5 - 0.5 * Math.cos((f / 0.55) * Math.PI) : 1);
  return BOSS.x0 + (BOSS.x1 - BOSS.x0) * Math.min(1, step / n);
};
export const BOSS_STOMPS = Array.from({ length: 5 }, (_, k) => BOSS.walk[0] + ((k + 0.55) / 5) * (BOSS.walk[1] - BOSS.walk[0]));
export const BOSS_BURSTS = [[5.62, 5.98], [6.62, 7.0]];
export const BOSS_SHOTS = BOSS_BURSTS.flatMap(([a, b]) => { const r = []; for (let t = a; t < b - 1e-6; t += 0.06) r.push(+t.toFixed(3)); return r; });

export function heroPos(g) {
  const x = keyed(g, 1), y = keyed(g, 2);
  let a = keyed(g, 3);
  // boss fight: track the boss (auto-aim), blended in and out
  const w = Math.min(1, Math.max(0, (g - 5.15) / 0.3)) * Math.min(1, Math.max(0, (7.75 - g) / 0.25));
  if (w > 0) {
    const aim = Math.atan2(BOSS.y - y, bossX(g) - x) + 0.025 * Math.sin(g * 23);
    a = a + (aim - a) * w * w * (3 - 2 * w);
  }
  return { x, y, a };
}
export function heroSpeed(g) {
  const e = 0.01, p = heroPos(g - e), q = heroPos(g + e);
  return Math.hypot(q.x - p.x, q.y - p.y) / (2 * e);
}
// head bob phase: integrated distance
const DT = 1 / 600, NB = Math.ceil(10 / DT) + 2, DIST = new Float64Array(NB);
for (let i = 1; i < NB; i++) DIST[i] = DIST[i - 1] + heroSpeed(i * DT) * DT;
export const heroDist = (g) => {
  const u = Math.max(0, g) / DT, i = Math.min(NB - 2, Math.floor(u));
  return DIST[i] + (DIST[i + 1] - DIST[i]) * (u - i);
};

// ---------- enemies ----------
// shots: hero shots that hit (last = death). fire: times the guard shoots back.
export const GUARDS = [
  { id: 'g1', spr: 5, x: 8.45, y: 11.15, alert: 0.55, hits: [0.84, 1.12], fire: [], pts: 100, bubble: 'HALT!', drop: { kind: 'clip', x: 8.05, y: 11.35 } },
  { id: 'g2', spr: 1217, x: 16.3, y: 8.3, alert: 2.55, hits: [3.08, 3.3], fire: [], pts: 400, bubble: 'ACHTUNG!' },
  { id: 'g3', spr: 233, x: 16.6, y: 14.3, alert: 2.95, hits: [3.58, 3.78], fire: [3.36], pts: 100 },
];
export const guardDeath = (e) => e.hits[e.hits.length - 1];

// ---------- hero weapon ----------
export const CHAINGUN_G = 4.35;
export const PISTOL_SHOTS = GUARDS.flatMap((e) => e.hits).sort((a, b) => a - b);
export const CG_FIRE = [5.42, 7.5];
export const CG_SHOTS = (() => { const r = []; for (let t = CG_FIRE[0]; t < CG_FIRE[1] - 1e-6; t += 0.0909) r.push(+t.toFixed(4)); return r; })();
export const BOSS_HITS = CG_SHOTS.filter((t) => t >= 5.5);
export const lastShot = (g) => {
  let s = null;
  for (const t of PISTOL_SHOTS) if (t <= g) s = t;
  for (const t of CG_SHOTS) if (t <= g) s = t;
  return s;
};
export const weaponAt = (g) => (g < CHAINGUN_G ? 'pistol' : 'chaingun');

// ---------- pickups ----------
export const PICKUPS = [
  { kind: 'clip', x: 8.05, y: 11.35, g: 2.36, appear: 1.12 },
  { kind: 'tonic', x: 13.55, y: 12.15, g: 4.06 },
  { kind: 'chaingun', x: 15.1, y: 11.6, g: CHAINGUN_G },
  { kind: 'crown', x: 16.6, y: 11.05, g: 4.6 },
  { kind: 'comb', x: 17.75, y: 12.05, g: 4.84 },
  { kind: 'key', x: 23.25, y: 12.4, g: 8.13, appear: 7.85 },
];
// decorations (static billboards)
export const DECOR = [
  { kind: 'lamp', x: 3.5, y: 11.5 }, { kind: 'lamp', x: 7.5, y: 11.5 },
  { kind: 'barrel', x: 1.45, y: 10.4 }, { kind: 'barrel', x: 5.6, y: 12.6 }, { kind: 'plant', x: 9.45, y: 12.55 }, { kind: 'plant', x: 9.45, y: 10.45 },
  { kind: 'lamp', x: 13.5, y: 8.5 }, { kind: 'lamp', x: 13.5, y: 14.5 }, { kind: 'lamp', x: 17.5, y: 11.5 },
  { kind: 'plant', x: 11.5, y: 6.5 }, { kind: 'plant', x: 18.5, y: 16.5 }, { kind: 'armor', x: 18.5, y: 6.6 }, { kind: 'armor', x: 11.5, y: 16.4 },
  { kind: 'table', x: 14.0, y: 8.0 },
  { kind: 'lampR', x: 21.5, y: 9.5 }, { kind: 'lampR', x: 21.5, y: 13.5 }, { kind: 'lampR', x: 24.0, y: 11.5 }, { kind: 'lampE', x: 28.0, y: 11.5 },
  { kind: 'flag', x: 20.5, y: 7.5 }, { kind: 'flag', x: 20.5, y: 15.5 }, { kind: 'flag', x: 26.5, y: 7.5 }, { kind: 'flag', x: 26.5, y: 15.5 },
];
// static lights for the light map: x, y, intensity, radius, colour
export const LAMPS = [
  [3.5, 11.5, 0.75, 3.2, [1, 0.95, 0.8]], [7.5, 11.5, 0.75, 3.2, [1, 0.95, 0.8]],
  [13.5, 8.5, 0.7, 3.4, [1, 0.85, 0.6]], [13.5, 14.5, 0.7, 3.4, [1, 0.85, 0.6]], [17.5, 11.5, 0.8, 3.6, [1, 0.85, 0.6]],
  [21.5, 9.5, 0.7, 3.4, [1, 0.5, 0.4]], [21.5, 13.5, 0.7, 3.4, [1, 0.5, 0.4]], [24.0, 11.5, 0.8, 3.6, [1, 0.6, 0.45]],
  [28.0, 11.5, 0.8, 2.4, [0.7, 0.9, 1]],
];
export const AMBIENT = [[0.42, 0.43, 0.5], [0.48, 0.42, 0.36], [0.36, 0.26, 0.3], [0.45, 0.5, 0.6]];

// ---------- hero stats ----------
export const DAMAGE = [[3.4, 14], [5.82, 16], [6.84, 22]];
const HEALS = [[4.06, 14]];
export function health(g) {
  let h = 100;
  const ev = [...DAMAGE.map(([t, d]) => [t, -d]), ...HEALS].sort((a, b) => a[0] - b[0]);
  for (const [t, d] of ev) if (g >= t) h = Math.min(100, h + d);
  return h;
}
export function ammo(g) {
  let a = 16;
  a -= PISTOL_SHOTS.filter((t) => t <= g).length;
  a -= CG_SHOTS.filter((t) => t <= g).length;
  if (g >= PICKUPS[0].g) a += 8;
  if (g >= CHAINGUN_G) a += 20;
  return Math.max(0, a);
}
export const SCORE = [
  ...GUARDS.map((e) => [guardDeath(e), e.pts]),
  [4.6, 500], [4.84, 100], [BOSS.death, 5000],
];
export function score(g) {
  let s = 0;
  for (const [t, p] of SCORE) if (g >= t) s += p;
  return s;
}
export const KILLS = [...GUARDS.map(guardDeath), BOSS.death];

// ---------- shake (game time, amplitude px) ----------
export const SHAKES = [
  ...PISTOL_SHOTS.map((t) => [t, 1.5]),
  ...GUARDS.map((e) => [guardDeath(e), 3]),
  ...DAMAGE.map(([t]) => [t, 5]),
  ...BOSS_STOMPS.map((t) => [t, 3]),
  [BOSS.roar, 4], [BOSS.death, 9], [7.68, 6], [7.86, 6], [8.05, 7], [SWITCH_G, 3],
  ...DOORS.map((d) => [d.open[1], 1.5]),
];
export const BOOMS = [7.5, 7.62, 7.74, 7.86, 8.05];

// ---------- tally (film seconds) ----------
export const TALLY = {
  fizzle: [TALLY0, TALLY0 + 0.42],
  lines: TALLY0 + 0.35,
  kill: [TALLY0 + 0.48, TALLY0 + 0.8],
  secret: [TALLY0 + 0.83, TALLY0 + 1.0],
  treasure: [TALLY0 + 1.03, TALLY0 + 1.2],
  perfect: TALLY0 + 1.35,
  end: TALLY0 + 1.55,
};
