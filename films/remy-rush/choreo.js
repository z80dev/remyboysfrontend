import { hash } from 'filmkit/lib.js';

// Choreography: the whole act is a pure function of game time g.
// Game time freezes during hit-stops (warp), so impacts land with weight; filmT maps game events to film time
// so the score lands every SFX on its frame. Props are placed from the hero's own path, so re-timing moves them.

export const INTRO = 1.5; // title screen, film seconds
export const DURATION = 15;
export const LW = 960, LH = 540;
export const GY = 452; // ground line (feet)
export const HERO_H = 77, BALL_R = 22;

// ---------- hit-stops ----------
export const B1_G = 1.68, B2_G = 1.92, CRAB_G = 4.95, HURT_G = 6.18;
export const BOSS_HITS = [7.2, 7.85, 8.45];
export const STOPS = [
  { g: B1_G, d: 0.05 }, { g: B2_G, d: 0.06 }, { g: CRAB_G, d: 0.05 },
  { g: HURT_G, d: 0.12, kind: 'hurt' },
  { g: BOSS_HITS[0], d: 0.07 }, { g: BOSS_HITS[1], d: 0.07 }, { g: BOSS_HITS[2], d: 0.3, kind: 'final' },
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
  return INTRO + g + acc;
}
export const G_END = DURATION - INTRO - STOPS.reduce((a, s) => a + s.d, 0);

// ---------- beats (game time) ----------
export const CARD = { in: 0.0, hold: 0.28, out: 0.72, end: 0.98 };
export const REV = { t0: 0.45, t1: 0.95 };
export const BOOST_G = 2.66;
export const LOOP_G = 2.95;
export const SPRING_G = 4.05;
export const LOCK_G = 5.45; // boss arena camera lock
export const SIGN_G = 9.78;
export const STOP_G = 10.22;
export const TALLY = { t0: 10.42, lines: 10.68, count0: 11.08, count1: 11.78, hold: 12.08 };
export const FADE = { t0: G_END - 0.18, t1: G_END - 0.01 };

// ---------- hero track distance: integrated speed ----------
const SPEED = [
  [0, 0], [0.95, 0], [0.97, 820], [BOOST_G, 820], [BOOST_G + 0.01, 1180], [3.62, 1180], [3.85, 880], [SPRING_G, 880],
  [SPRING_G + 0.01, 560], [CRAB_G, 560], [CRAB_G + 0.01, 380], [5.4, 380], [5.42, 640], [5.75, 640], [6.0, 430],
  [HURT_G, 430], [HURT_G + 0.001, -300], [6.6, -300], [6.62, 0], [6.68, 0], [6.72, 360], [6.95, 360],
  [6.96, 420], [BOSS_HITS[0], 420], [BOSS_HITS[0] + 0.001, -230], [7.5, -230], [7.52, 260], [7.6, 260],
  [7.61, 420], [BOSS_HITS[1], 420], [BOSS_HITS[1] + 0.001, -230], [8.15, -230], [8.17, 250], [8.2, 250],
  [8.21, 420], [BOSS_HITS[2], 420], [BOSS_HITS[2] + 0.001, -210], [8.8, -210], [8.83, 0], [9.22, 0], [9.36, 1000],
  [9.8, 1000], [STOP_G, 0], [20, 0],
];
function speedAt(g) {
  for (let i = 0; i < SPEED.length - 1; i++) {
    const [a, va] = SPEED[i], [b, vb] = SPEED[i + 1];
    if (g >= a && g < b) return b > a ? va + (vb - va) * ((g - a) / (b - a)) : vb;
  }
  return SPEED[SPEED.length - 1][1];
}
export const heroSpeed = speedAt;
const X0 = 210, DT = 1 / 1200, NX = Math.ceil(14 / DT) + 2;
const DTAB = new Float64Array(NX);
DTAB[0] = X0;
for (let i = 1; i < NX; i++) DTAB[i] = DTAB[i - 1] + 0.5 * (speedAt((i - 1) * DT) + speedAt(i * DT)) * DT;
export function heroD(g) {
  const f = Math.max(0, Math.min(NX - 1.001, g / DT)), i = Math.floor(f);
  return DTAB[i] + (DTAB[i + 1] - DTAB[i]) * (f - i);
}

// ---------- the loop: a full 360° circle of radius LR (feet) sitting on the ground ----------
export const LR = 116;
export const LOOP_X = heroD(LOOP_G); // bottom of the loop (track distance == world x there)
export const LOOP_LEN = 2 * Math.PI * LR;
export const LOOP = { x: LOOP_X, cy: GY - LR, r: LR };
export function track(d) {
  if (d < LOOP_X) return { x: d, y: GY, rot: 0, loop: false };
  if (d < LOOP_X + LOOP_LEN) {
    const p = (d - LOOP_X) / LR;
    return { x: LOOP_X + LR * Math.sin(p), y: GY - LR + LR * Math.cos(p), rot: -p, loop: true, p };
  }
  return { x: d - LOOP_LEN, y: GY, rot: 0, loop: false };
}
export const heroX = (g) => track(heroD(g)).x;
export const loopEnd = (() => { let g = LOOP_G; while (heroD(g) < LOOP_X + LOOP_LEN) g += 0.001; return g; })();

// ---------- jumps (feet y): up = ease-out, down = ease-in ----------
const yJ = (j, g) => {
  if (g < j.ta) { const u = (g - j.t0) / (j.ta - j.t0); return j.y0 + (j.ya - j.y0) * (1 - (1 - u) * (1 - u)); }
  const u = (g - j.ta) / (j.t1 - j.ta);
  return j.ya + (j.y1 - j.ya) * u * u;
};
const B1_TOP = GY - 44;
const J_BOSS0 = { t0: 6.0, ta: 6.36, t1: 6.72, y0: GY, ya: GY - 220, y1: GY, kind: 'ball' };
const HURT_Y = yJ(J_BOSS0, HURT_G);
const bossJump = (t0, th, tl) => [
  { t0, ta: th, t1: th + 0.001, y0: GY, ya: GY - 226, y1: GY - 226, kind: 'ball' },
  { t0: th, ta: th + 0.07, t1: tl, y0: GY - 226, ya: GY - 246, y1: GY, kind: 'ball' },
];
export const JUMPS = [
  { t0: 1.42, ta: 1.56, t1: B1_G, y0: GY, ya: GY - 120, y1: B1_TOP, kind: 'ball' },
  { t0: B1_G, ta: B2_G, t1: B2_G + 0.001, y0: B1_TOP, ya: GY - 232, y1: GY - 232, kind: 'ball' },
  { t0: B2_G, ta: 2.0, t1: 2.32, y0: GY - 232, ya: GY - 262, y1: GY, kind: 'ball' },
  { t0: SPRING_G, ta: 4.5, t1: CRAB_G, y0: GY - 6, ya: 136, y1: GY - 40, kind: 'spring' },
  { t0: CRAB_G, ta: 5.13, t1: 5.4, y0: GY - 40, ya: GY - 150, y1: GY, kind: 'ball' },
  { ...J_BOSS0, t1: HURT_G },
  { t0: HURT_G, ta: 6.3, t1: 6.6, y0: HURT_Y, ya: HURT_Y - 56, y1: GY, kind: 'hurt' },
  ...bossJump(6.95, BOSS_HITS[0], 7.5),
  ...bossJump(7.6, BOSS_HITS[1], 8.15),
  ...bossJump(8.2, BOSS_HITS[2], 8.8),
  { t0: 10.42, ta: 10.56, t1: 10.72, y0: GY, ya: GY - 54, y1: GY, kind: 'hop' },
];
export const jumpAt = (g) => JUMPS.find((j) => g >= j.t0 && g < j.t1) ?? null;
export const LANDINGS = [2.32, 5.4, 6.6, 7.5, 8.15, 8.8, 10.72];
export const TAKEOFFS = [1.42, SPRING_G, 6.0, 6.95, 7.6, 8.2, 10.42];

// Hero state: feet position, body rotation, mode.
export function hero(g) {
  const t = track(heroD(g)), j = jumpAt(g);
  let y = t.y, mode;
  if (j) { y = yJ(j, g); mode = j.kind === 'spring' ? (g < j.ta + 0.05 ? 'spring' : 'ball') : j.kind; }
  else if (g < REV.t0) mode = 'idle';
  else if (g < REV.t1) mode = 'rev';
  else if (g >= 8.8 && g < 9.22) mode = 'stand';
  else if (g >= STOP_G - 0.12 && !j) mode = 'stand';
  else mode = 'run';
  return { x: t.x, y, rot: j ? 0 : t.rot, loop: !j && t.loop, mode, v: speedAt(g), j };
}
export const heroCenter = (g) => { const h = hero(g); return h.mode === 'ball' ? { x: h.x, y: h.y - BALL_R } : { x: h.x, y: h.y - 38 }; };
export const invincible = (g) => g > 6.6 && g < 8.2;

// ---------- props ----------
export const BOOST_X = heroX(BOOST_G) + 10;
export const SPRING_X = heroX(SPRING_G) + 4;
export const SPIKES = { l: heroX(4.32), r: heroX(4.68) };
export const B1 = { x: heroX(B1_G), kind: 'moto', head: 0 };
export const B2 = { x: heroX(B2_G) + 6, y: GY - 232 - BALL_R, kind: 'buzz', head: 23 };
export const CRAB = { x: heroX(CRAB_G), kind: 'crab', head: 183 };
export const BADNIKS = [
  { ...B1, g: B1_G, pts: '100', vx: -70, animal: 'rabbit' },
  { ...B2, g: B2_G, pts: '200', vx: -50, animal: 'bird' },
  { ...CRAB, g: CRAB_G, pts: '100', vx: -30, animal: 'squirrel' },
];
// badnik world position before it is destroyed (they patrol towards the hero)
export function badnikAt(b, g) {
  const dt = Math.min(g, b.g) - b.g;
  if (b.kind === 'buzz') return { x: b.x + b.vx * dt, y: b.y + 6 * Math.sin(g * 9) };
  return { x: b.x + b.vx * dt, y: GY };
}

// ---------- boss ----------
export const CAM_LOCK = Math.round(heroX(6.0) - 330);
export const CHAIN = 128, BOSS_BALL_R = 24;
const SW_A = 0.78, SW_W = (2 * Math.PI) / 1.7;
const SW_PH = (() => { // phase so that at HURT_G the ball is swinging left through θ = −0.42
  const s = -0.42 / SW_A;
  return Math.PI - Math.asin(s) - SW_W * HURT_G;
})();
export const swing = (g) => SW_A * Math.sin(SW_W * g + SW_PH);
const hc = heroCenter;
const hurtBall = hc(HURT_G);
const POD_HURT = { x: hurtBall.x + 34 - CHAIN * Math.sin(swing(HURT_G)), y: hurtBall.y - 24 - CHAIN * Math.cos(swing(HURT_G)) };
const POD_OFF = { x: 70, y: -2 };
const PK = [
  [LOCK_G, CAM_LOCK + 1080, -160],
  [5.95, POD_HURT.x + 40, POD_HURT.y - 10],
  [HURT_G, POD_HURT.x, POD_HURT.y],
  [6.7, CAM_LOCK + 760, 214],
  ...BOSS_HITS.map((g, i) => [g, hc(g).x + POD_OFF.x, hc(g).y + POD_OFF.y + [0, -6, 4][i]]),
];
PK.splice(5, 0, [7.55, CAM_LOCK + 780, 200]);
PK.splice(7, 0, [8.15, CAM_LOCK + 640, 228]);
export const BOSS_DIE = BOSS_HITS[2], BOSS_FLEE = 9.25;
export function pod(g) {
  let x, y;
  if (g <= PK[0][0]) [x, y] = [PK[0][1], PK[0][2]];
  else if (g >= PK[PK.length - 1][0]) [x, y] = [PK[PK.length - 1][1], PK[PK.length - 1][2]];
  else {
    let i = 0;
    while (g > PK[i + 1][0]) i++;
    const [a, ax, ay] = PK[i], [b, bx, by] = PK[i + 1];
    const u = (g - a) / (b - a), e = u * u * (3 - 2 * u);
    x = ax + (bx - ax) * e; y = ay + (by - ay) * e;
  }
  if (g < BOSS_DIE) y += 5 * Math.sin(g * 6.5);
  // recoil after each hit (0 at the hit, back to rest)
  for (const h of BOSS_HITS) { const d = g - h; if (d > 0 && d < 1) { const k = Math.sin(Math.min(1, d / 0.12) * Math.PI / 2) * Math.exp(-d * 5); x += 34 * k; y -= 16 * k; } }
  let tilt = 0;
  if (g > BOSS_FLEE) { const d = g - BOSS_FLEE; x += 160 * d + 700 * d * d; y -= 70 * d + 120 * d * d; tilt = -0.18; }
  else if (g > BOSS_DIE) { x += 3 * Math.sin(g * 90); y += 2 * Math.cos(g * 77) + 24 * Math.min(1, (g - BOSS_DIE) / 0.5); tilt = 0.12 * Math.sin(g * 40) * 0.3 + 0.1; }
  return { x, y, tilt };
}
export const bossHits = (g) => BOSS_HITS.filter((h) => g >= h).length;
// wrecking ball: pendulum under the pod; the chain snaps at the final hit and the ball drops
const BALL_DROP_Y = GY - BOSS_BALL_R;
export function wreck(g) {
  if (g < BOSS_DIE) {
    const p = pod(g), a = swing(g);
    return { x: p.x + CHAIN * Math.sin(a), y: p.y + 24 + CHAIN * Math.cos(a), a, attached: true };
  }
  const p0 = pod(BOSS_DIE), a = swing(BOSS_DIE), x0 = p0.x + CHAIN * Math.sin(a), y0 = p0.y + 24 + CHAIN * Math.cos(a);
  const d = g - BOSS_DIE, vx = 60;
  const tl = Math.sqrt((2 * (BALL_DROP_Y - y0)) / 1800);
  if (d < tl) return { x: x0 + vx * d, y: y0 + 900 * d * d, a, attached: false };
  const db = d - tl, bounce = Math.max(0, 40 * Math.sin(Math.min(Math.PI, db * 9)) * Math.exp(-db * 3));
  return { x: x0 + vx * tl + 30 * (1 - Math.exp(-db * 4)), y: BALL_DROP_Y - bounce, a, attached: false, landed: true };
}
export const WRECK_LAND = BOSS_DIE + Math.sqrt((2 * (BALL_DROP_Y - wreck(BOSS_DIE - 1e-6).y)) / 1800);

export const BOOMS = Array.from({ length: 11 }, (_, i) => ({ g: BOSS_DIE + 0.02 + i * 0.075, dx: (hash(i + 300) - 0.5) * 120, dy: (hash(i + 310) - 0.6) * 70, pan: hash(i + 320) - 0.5 }));
export const SIGN_X = Math.round(heroX(SIGN_G));
export const SIGN = { t0: SIGN_G, t1: SIGN_G + 0.9, turns: 5 };
export const signAngle = (g) => { const u = Math.max(0, Math.min(1, (g - SIGN.t0) / (SIGN.t1 - SIGN.t0))); return SIGN.turns * Math.PI * (1 - (1 - u) ** 2.2); };
// moments the plate passes edge-on (a flip click each)
export const SIGN_FLIPS = Array.from({ length: SIGN.turns }, (_, k) => { const a = (k + 0.5) * Math.PI / (SIGN.turns * Math.PI); return SIGN.t0 + (SIGN.t1 - SIGN.t0) * (1 - (1 - a) ** (1 / 2.2)); });

// ---------- rings ----------
// Placed on the hero's path, so collecting them is exact: { x, y, g } with g = collection time.
const R = [];
const onPath = (g, dy = 0) => { const c = hc(g); R.push({ x: c.x, y: c.y + dy, g }); };
for (let i = 0; i < 5; i++) onPath(1.04 + i * 0.055);
for (const g of [1.8, 2.08, 2.18]) onPath(g);
for (let i = 0; i < 4; i++) onPath(2.4 + i * 0.05);
for (let i = 0; i < 8; i++) { // inside the loop, on the hero's path
  const d = LOOP_X + LOOP_LEN * (i + 0.5) / 8;
  let g = LOOP_G; while (heroD(g) < d) g += 0.0005;
  const t = track(d), r = LR - 38;
  R.push({ x: LOOP_X + r * Math.sin(t.p), y: GY - LR + r * Math.cos(t.p), g });
}
for (let i = 0; i < 3; i++) onPath(3.72 + i * 0.05);
for (let i = 0; i < 5; i++) onPath(4.2 + i * 0.07);
export const RINGS = R;
export const RINGS_HELD = R.length;

// Ring scatter on the hit: analytic bouncing (precomputed bounce schedule per ring), recollected by the hero.
const GRAV = 1500, BOUNCE = 0.7, LIFE = 2.6, FLOOR = GY - 9;
const sc = hc(HURT_G);
export const SCATTER = Array.from({ length: Math.min(32, RINGS_HELD) }, (_, i) => {
  const k = i % 16, outer = i < 16, side = k % 2 ? 1 : -1, step = Math.floor(k / 2);
  const a = -Math.PI / 2 + side * (0.18 + step * 0.2) + (outer ? 0 : 0.1 * side);
  const s = outer ? 560 : 330;
  const vx = Math.cos(a) * s, vy = Math.sin(a) * s;
  const segs = []; // [t0, y0, vy0]
  let t0 = 0, y0 = sc.y, v0 = vy;
  for (let b = 0; b < 8; b++) {
    const disc = v0 * v0 + 2 * GRAV * (FLOOR - y0);
    const th = (-v0 + Math.sqrt(Math.max(0, disc))) / GRAV;
    segs.push([t0, y0, v0]);
    t0 += th; y0 = FLOOR; v0 = -(v0 + GRAV * th) * BOUNCE;
    if (Math.abs(v0) < 40) { segs.push([t0, FLOOR, 0]); break; }
  }
  return { vx, segs, i };
});
export function scatterAt(r, g) {
  const t = g - HURT_G;
  if (t < 0) return null;
  let s = r.segs[0];
  for (const ss of r.segs) if (t >= ss[0]) s = ss;
  const dt = t - s[0];
  const y = s[2] === 0 && s[1] === FLOOR ? FLOOR : Math.min(FLOOR, s[1] + s[2] * dt + 0.5 * GRAV * dt * dt);
  return { x: sc.x + r.vx * t, y, age: t };
}
for (const r of SCATTER) { // first moment the hero touches it after the grace period
  r.got = null;
  for (let g = HURT_G + 0.42; g < HURT_G + LIFE; g += 1 / 240) {
    const p = scatterAt(r, g), h = hero(g);
    if (Math.abs(p.x - h.x) < 26 && p.y > h.y - 84 && p.y < h.y + 6) { r.got = g; break; }
  }
}
export const SCATTER_LIFE = LIFE;
export const RING_EVENTS = [...R.map((r) => r.g), ...SCATTER.filter((r) => r.got).map((r) => r.got)].sort((a, b) => a - b);
export function hudRings(g) {
  if (g < HURT_G) return R.filter((r) => g >= r.g).length;
  return SCATTER.filter((r) => r.got && g >= r.got).length;
}
export const FINAL_RINGS = SCATTER.filter((r) => r.got).length;

// ---------- score ----------
export const SCORE_EVENTS = [...BADNIKS.map((b) => [b.g, +b.pts]), [BOSS_DIE, 1000]];
export const TIME_BONUS = 50000;
export const ringBonus = () => FINAL_RINGS * 100;
const countU = (g) => Math.max(0, Math.min(1, (g - TALLY.count0) / (TALLY.count1 - TALLY.count0)));
export function tallyBonus(g) {
  const u = countU(g), step = (v) => Math.round((v * (1 - u)) / 100) * 100;
  return { time: step(TIME_BONUS), ring: step(ringBonus()) };
}
export function hudScore(g) {
  let s = 0;
  for (const [t, p] of SCORE_EVENTS) if (g >= t) s += p;
  const b = tallyBonus(g);
  return s + (TIME_BONUS - b.time) + (ringBonus() - b.ring);
}
export const hudTime = (g) => Math.floor(Math.min(g, SIGN_G) + 0.0001);

// ---------- camera ----------
const raw = (g) => {
  let s = 0;
  const n = 10;
  for (let i = 0; i < n; i++) {
    const gg = Math.max(0, g - (i / n) * 0.25);
    const lead = Math.max(-40, Math.min(150, heroSpeed(gg) * 0.13));
    s += heroX(gg) + lead;
  }
  return s / n - 400;
};
const SIGN_CAM = SIGN_X - 420;
export const LOCK_HIT = (() => { let g = 4; while (raw(g) < CAM_LOCK) g += 0.001; return g; })();
export function camX(g) {
  let c = Math.max(0, raw(g));
  if (g >= LOCK_HIT) c = CAM_LOCK;
  if (g >= 9.3) { const u = Math.min(1, (g - 9.3) / 0.9), e = u * u * (3 - 2 * u); c = CAM_LOCK + (SIGN_CAM - CAM_LOCK) * e; }
  return c;
}
export function camY(g) {
  let s = 0;
  for (let i = 0; i < 6; i++) { const y = hero(Math.max(0, g - i * 0.03)).y; s += Math.min(0, (y - 300) * 0.32); }
  return s / 6; // ≤ 0: the view rises with the hero
}
