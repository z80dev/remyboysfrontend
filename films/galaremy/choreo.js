// Choreography: every sprite, bullet and score is a pure function of game time g.
// Game time runs inside the 'game' shot and freezes during hit-stops (warp), so impacts land with weight.
// Kills are authored as data; each bullet's fire time and the ship's path are *derived* from them, so every
// shot really connects and re-timing a kill moves the ship with it.

export const INTRO = 1.5; // title card, film seconds
export const DURATION = 15;
export const LW = 960, LH = 540;
export const PX0 = 220, PX1 = 740, PCX = 480; // vertical playfield inside the 16:9 frame
export const SHIP_Y = 478; // ship centre
export const MUZZLE = 20; // bullets spawn this far above the ship centre
export const BV = 900; // player bullet speed (px/s)
export const DUAL_DX = 44; // the rescued fighter docks this far right of the ship
export const SP = 54; // formation column spacing
export const ROWY = [-4, 96, 138, 180]; // captive row, boss row, goei row, zako row

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (u) => u * u * (3 - 2 * u);

// ---------- hit-stops ----------
export const STOPS = [
  { g: 2.95, d: 0.06, kind: 'capture' },
  { g: 4.6, d: 0.08 },
  { g: 5.05, d: 0.1, kind: 'dock' },
  { g: 5.55, d: 0.05 },
  { g: 8.87, d: 0.035 }, { g: 9.07, d: 0.035 }, { g: 9.27, d: 0.035 }, { g: 9.47, d: 0.035 }, { g: 9.66, d: 0.035 },
  { g: 9.85, d: 0.3, kind: 'final' },
  { g: 10.38, d: 0.1, kind: 'mega' },
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
export const B = {
  shipIn: [0, 0.42],
  stageText: [0, 0.75],
  capDive: 2.32, hover: 2.72, beam0: 2.75, capture: 2.95, rise1: 3.42, beam1: 3.6, capBack: 3.62,
  capText: [3.0, 3.75],
  ship2In: [3.55, 3.85],
  rescueDive: 4.02, release: 4.6, dock: 5.05,
  dualText: [5.05, 5.75],
  chalText: [5.62, 6.22], chal: 5.8, perfect: [7.38, 8.05],
  warn: [8.0, 8.5], bossIn: [8.08, 8.65], jaw: 8.72, final: 9.85, mega: 10.38,
  clear: 10.78, tally: [10.95, 11.05, 11.15, 11.25], shipOut: [11.5, 11.9], end: 11.6,
};

// ---------- splines (Catmull-Rom, arc-length parametrised) ----------
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}
export function spline(pts) {
  const P = [pts[0], ...pts, pts[pts.length - 1]], S = [];
  for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < 32; k++) S.push(catmull(P[i - 1], P[i], P[i + 1], P[i + 2], k / 32));
  S.push(pts[pts.length - 1]);
  const L = [0];
  for (let i = 1; i < S.length; i++) L.push(L[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
  const len = L[L.length - 1];
  return {
    len,
    at(u) {
      const d = clamp01(u) * len;
      let lo = 0, hi = L.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= d) lo = m; else hi = m; }
      const k = L[hi] > L[lo] ? (d - L[lo]) / (L[hi] - L[lo]) : 0;
      return [S[lo][0] + (S[hi][0] - S[lo][0]) * k, S[lo][1] + (S[hi][1] - S[lo][1]) * k];
    },
  };
}
const mirror = (pts) => pts.map((p) => (p === 'S' ? p : [2 * PCX - p[0], p[1]]));

// ---------- formation ----------
export const breath = (g) => 0.07 * Math.sin((g - 2.4) * 4.4) * clamp01((g - 2.1) / 0.5);
export const sway = (g) => 12 * Math.sin(g * 2.2) * (1 - clamp01((g - 2.0) / 0.6)) + 6 * Math.sin(g * 1.3) * clamp01((g - 2.0) / 0.6);
export const slotBase = (e) => [PCX + e.c * SP, ROWY[e.row]];
export const slotAt = (e, g) => [PCX + e.c * SP * (1 + breath(g)) + sway(g), ROWY[e.row] + 2 * Math.sin(g * 3.1 + e.c)];

// ---------- enemies ----------
// type: zako (50) | goei (80) | boss (150, two hits, tractor beam) | chal (challenging stage, 100)
const EN = [];
const enemy = (o) => { const e = { segs: [], hits: [], kill: null, ...o, id: EN.length }; EN.push(e); return e; };
// seg: { t0, t1, path, from: slot?, to: slot?, ease, dx (fixed x offset), hold: [x,y] }
const seg = (e, t0, t1, pts, o = {}) => {
  const base = slotBase(e);
  const P = pts.map((p) => (p === 'S' ? base : p));
  e.segs.push({ t0, t1, path: spline(P), from: pts[0] === 'S', to: pts[pts.length - 1] === 'S', ease: o.ease ?? 'entry', dx: o.dx ?? 0 });
};
const hold = (e, t0, t1, p) => e.segs.push({ t0, t1, hold: p });

// Wave 1 streams: conga lines of 3, each member flying the same waypoints into its own slot.
const S1 = [[372, -30], [380, 70], [410, 190], [462, 300], [440, 372], [372, 384], [332, 322], [350, 250], 'S'];
const S3 = [[200, 440], [290, 412], [372, 346], [392, 262], [348, 214], [298, 246], [304, 300], [352, 300], 'S'];
const ENTRY_DUR = 1.25, GAP = 0.12;
const W1 = {};
[
  ['z0', 'zako', 5, 3, -2.5, S1, 0.3, 0], ['z1', 'zako', 419, 3, -1.5, S1, 0.3, 1], ['z2', 'zako', 0, 3, -0.5, S1, 0.3, 2],
  ['z3', 'zako', 23, 3, 0.5, mirror(S1), 0.3, 2], ['z4', 'zako', 183, 3, 1.5, mirror(S1), 0.3, 1], ['z5', 'zako', 952, 3, 2.5, mirror(S1), 0.3, 0],
  ['b1', 'boss', 98, 1, -0.5, S3, 0.82, 0], ['g0', 'goei', 233, 2, -1.5, S3, 0.82, 1], ['g1', 'goei', 287, 2, -0.5, S3, 0.82, 2],
  ['b2', 'boss', 1034, 1, 0.5, mirror(S3), 0.82, 0], ['g2', 'goei', 482, 2, 0.5, mirror(S3), 0.82, 1], ['g3', 'goei', 1217, 2, 1.5, mirror(S3), 0.82, 2],
].forEach(([name, type, head, row, c, path, t0, k]) => {
  const e = enemy({ name, type, head, row, c, wave: 1 });
  seg(e, t0 + k * GAP, t0 + k * GAP + ENTRY_DUR, path);
  W1[name] = e;
});

// Dive-bombers: peel out of the formation, loop and swoop at the ship.
seg(W1.z1, 1.82, 2.62, ['S', [330, 150], [272, 214], [290, 290], [360, 340], [430, 420], [470, 560]], { ease: 'dive' });
seg(W1.g1, 2.32, 3.1, ['S', [420, 108], [372, 160], [372, 250], [430, 330], [510, 420], [540, 560]], { ease: 'dive' });

// Tractor-beam boss: dives, hovers, beams the ship up, returns with the captive, then dives again and is shot.
export const HOVER = [400, 300];
seg(W1.b1, B.capDive, B.hover, ['S', [420, 66], [370, 92], [350, 170], [380, 250], HOVER], { ease: 'dive' });
hold(W1.b1, B.hover, B.capBack, HOVER);
seg(W1.b1, B.capBack, 3.98, [HOVER, [430, 240], [440, 160], 'S']);
seg(W1.b1, B.rescueDive, 4.9, ['S', [480, 70], [540, 110], [566, 200], [540, 290], [470, 360], [420, 460], [400, 580]], { ease: 'dive' });

// ---------- challenging stage: twin conga lines (pairs side by side, DUAL_DX apart) ----------
const C1 = [[250, -30], [300, 100], [400, 210], [520, 240], [572, 180], [530, 112], [430, 130], [380, 220], [420, 320], [560, 340], [700, 280], [790, 220]];
const CHAL_DUR = 2.0, CGAP = 0.15;
export const CHAL = [];
for (let s = 0; s < 2; s++) {
  const path = s ? C1.map(([x, y]) => [2 * PCX - DUAL_DX - x, y]) : C1;
  for (let k = 0; k < 4; k++) for (let side = 0; side < 2; side++) {
    const e = enemy({ name: `c${s}${k}${side}`, type: 'chal', head: [554, 645, 690, 808, 1033, 1065, 1260, 1462][(s * 4 + k + side * 3) % 8], row: 0, c: 0, wave: 2, pair: s * 4 + k, side });
    const t0 = B.chal + s * 0.62 + k * CGAP;
    seg(e, t0, t0 + CHAL_DUR, path, { ease: 'lin', dx: side * DUAL_DX });
    CHAL.push(e);
  }
}

export const ENEMIES = EN;
export const byName = (n) => EN.find((e) => e.name === n);

const EASE = {
  entry: (u) => u + 0.3 * u * (1 - u),
  dive: (u) => u - 0.35 * u * (1 - u),
  lin: (u) => u,
};

// Position (and heading) of an enemy at game time g, or null when absent.
export function enemyPos(e, g) {
  if (!e.segs.length || g < e.segs[0].t0) return null;
  if (e.kill != null && g >= e.kill) return null;
  for (let i = 0; i < e.segs.length; i++) {
    const s = e.segs[i];
    if (g >= s.t0 && g < s.t1) {
      if (s.hold) return { x: s.hold[0] + 3 * Math.sin(g * 5), y: s.hold[1] + 2 * Math.sin(g * 7), mode: 'hold' };
      const u = (g - s.t0) / (s.t1 - s.t0), [px, py] = s.path.at(EASE[s.ease](u));
      let x = px + s.dx, y = py;
      if (s.from || s.to) {
        const [bx, by] = slotBase(e), [sx, sy] = slotAt(e, g), w = (s.to ? sm(u) : 0) + (s.from ? 1 - sm(u) : 0);
        x += (sx - bx) * w; y += (sy - by) * w;
      }
      return { x, y, mode: s.to ? 'enter' : 'fly', u };
    }
    if (g < s.t0) break;
  }
  // after a segment that ends off-screen (a dive with no return) the enemy is gone; otherwise it sits in its slot
  const prev = [...e.segs].reverse().find((s) => g >= s.t1);
  if (prev && !prev.to) return null;
  const [x, y] = slotAt(e, g);
  return { x, y, mode: 'slot' };
}
// Heading (radians, 0 = facing down / upright) from the path tangent, quantised to 16 directions like the arcade.
export function enemyAngle(e, g) {
  const p = enemyPos(e, g);
  if (!p || p.mode === 'slot' || p.mode === 'hold') return 0;
  const q = enemyPos(e, g - 1 / 120) ?? p;
  const vx = p.x - q.x, vy = p.y - q.y;
  if (Math.hypot(vx, vy) < 0.05) return 0;
  let a = Math.atan2(vy, vx) - Math.PI / 2;
  if (a < -Math.PI) a += 2 * Math.PI;
  if (p.mode === 'enter') a *= 1 - sm(clamp01((p.u - 0.8) / 0.2));
  return Math.round(a / (Math.PI / 8)) * (Math.PI / 8);
}

// ---------- kills (authored) → bullets + ship path (derived) ----------
// Times were picked (offline) so the ship never exceeds ~300 px/s between shots and no bullet crosses another enemy.
const KILLS = [
  // wave 1 entry and dive-bombers, single ship
  { e: 'z5', gk: 0.75 }, { e: 'z0', gk: 0.85 }, { e: 'z4', gk: 0.97 }, { e: 'g2', gk: 1.24 }, { e: 'g3', gk: 1.33 },
  { e: 'z1', gk: 2.29 }, { e: 'g1', gk: 2.57 }, { e: 'g0', gk: 2.72 },
  // ship 2: clear a lane, then double-tap the diving boss to free the captive
  { e: 'z2', gk: 4.22 }, { e: 'b1', gk: 4.47, hit: true }, { e: 'b1', gk: 4.6 }, { e: 'z3', gk: 4.88 },
];
export const SHOTS = []; // { g (fire), x, side, gk, target: enemy | 'boss', kill }
export const HITS = []; // { gk, x, y, target, kill, side }

function addKill(k, sideOverride) {
  const e = byName(k.e);
  if (!k.hit) e.kill = k.gk;
  const p = enemyPos(e, k.gk - 1e-6);
  const side = sideOverride ?? 0;
  const fire = k.gk - (SHIP_Y - MUZZLE - p.y) / BV;
  SHOTS.push({ g: fire, x: p.x - side * DUAL_DX, bx: p.x, side, gk: k.gk, e, kill: !k.hit, y: p.y });
  HITS.push({ gk: k.gk, x: p.x, y: p.y, e, kill: !k.hit, type: e.type });
  if (k.hit) e.hits.push(k.gk);
}
for (const k of KILLS) addKill(k);
// B2: one dual volley, both bullets connect = two hits = kill.
{
  const e = byName('b2'), gk = 5.55, p = enemyPos(e, gk);
  e.kill = gk;
  const fire = gk - (SHIP_Y - MUZZLE - p.y) / BV;
  const x = p.x - DUAL_DX / 2;
  SHOTS.push({ g: fire, x, bx: x, side: 0, gk, e, kill: false, y: p.y }, { g: fire, x, bx: x + DUAL_DX, side: 1, gk, e, kill: true, y: p.y });
  HITS.push({ gk, x: p.x, y: p.y, e, kill: true, type: 'boss', dual: true });
}
// Challenging stage: each pair dies to one dual volley.
const CHAL_KILL = [6.35, 6.46, 6.58, 6.7, 6.93, 7.05, 7.17, 7.29];
for (let pr = 0; pr < 8; pr++) {
  const gk = CHAL_KILL[pr];
  const L = CHAL.find((e) => e.pair === pr && e.side === 0), R = CHAL.find((e) => e.pair === pr && e.side === 1);
  const p = enemyPos(L, gk), q = enemyPos(R, gk);
  L.kill = gk; R.kill = gk;
  const fire = gk - (SHIP_Y - MUZZLE - p.y) / BV;
  SHOTS.push({ g: fire, x: p.x, bx: p.x, side: 0, gk, e: L, kill: true, y: p.y }, { g: fire, x: p.x, bx: q.x, side: 1, gk, e: R, kill: true, y: q.y });
  HITS.push({ gk, x: p.x, y: p.y, e: L, kill: true, type: 'chal' }, { gk, x: q.x, y: q.y, e: R, kill: true, type: 'chal' });
}

// ---------- giant boss: THE GREAT CABALD ----------
export const BOSS_HITS = [8.87, 9.07, 9.27, 9.47, 9.66, 9.85];
export const BOSS_HP = BOSS_HITS.length * 2;
export function bossPos(g) {
  const [a, b] = B.bossIn;
  if (g < a) return null;
  const u = clamp01((g - a) / (b - a));
  const ee = 1 - (1 - u) ** 3;
  let x = PCX + 64 * Math.sin((g - b) * 1.7) * clamp01((g - b) / 0.4), y = -150 + (156 + 150) * ee + 6 * Math.sin(g * 2.3);
  if (g > B.final) { const k = g - B.final; x += 3 * Math.sin(k * 90) * Math.min(1, k * 3); y += k * k * 40; }
  return { x, y };
}
// jaw opening 0..1 (core exposed): opens at B.jaw and chomps while firing
export function jawOpen(g) {
  if (g >= B.final) return 1;
  const o = clamp01((g - B.jaw) / 0.14);
  return o * (0.8 + 0.2 * Math.cos((g - B.jaw) * 9));
}
// geometry (see game.js drawGiant): head 224×216 centred on bossPos, saucer collar from y+96, core in its hatch
export const CORE_DY = 134, SAUCER_DY = 96, POD_DX = 132, POD_DY = 146;
export const coreAt = (g) => { const p = bossPos(g); return p && [p.x, p.y + CORE_DY]; };
for (const gk of BOSS_HITS) {
  const [cx, cy] = coreAt(gk);
  const fire = gk - (SHIP_Y - MUZZLE - cy) / BV;
  const x = cx - DUAL_DX / 2;
  SHOTS.push({ g: fire, x, bx: x, side: 0, gk, e: 'boss', kill: false, y: cy }, { g: fire, x, bx: x + DUAL_DX, side: 1, gk, e: 'boss', kill: gk === B.final, y: cy });
  HITS.push({ gk, x: cx, y: cy, e: 'boss', kill: gk === B.final, type: 'giant' });
}
export const bossHp = (g) => BOSS_HP - 2 * BOSS_HITS.filter((t) => g >= t).length;

SHOTS.sort((a, b) => a.g - b.g);
HITS.sort((a, b) => a.gk - b.gk);

// ---------- ship path: monotone cubic through the firing knots ----------
const KNOTS = [[0, PCX], [0.4, PCX]];
for (const s of SHOTS) if (s.side === 0) KNOTS.push([s.g, s.x]);
// value 0 = hold the previous knot's x
KNOTS.push(
  [2.82, HOVER[0]], [B.capture, HOVER[0]], // drift under the beam on purpose: the dual fighter is the plan
  [3.55, PCX], [3.8, PCX],
  [B.dock, 0],
  [7.6, 458], [8.4, 458],
  [10.2, 0], [10.7, 458], [12.7, 458],
);
KNOTS.sort((a, b) => a[0] - b[0]);
for (let i = 0; i < KNOTS.length; i++) if (KNOTS[i][1] === 0) KNOTS[i][1] = KNOTS[i - 1][1];
// ship 1 (until capture) and ship 2 (from its entrance) are separate pieces
function mono(K) {
  const n = K.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((K[i + 1][1] - K[i][1]) / Math.max(1e-6, K[i + 1][0] - K[i][0]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return (g) => {
    if (g <= K[0][0]) return K[0][1];
    if (g >= K[n - 1][0]) return K[n - 1][1];
    let i = 0;
    while (i < n - 2 && g >= K[i + 1][0]) i++;
    const h = K[i + 1][0] - K[i][0], t = (g - K[i][0]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * K[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * K[i + 1][1] + (t3 - t2) * h * m[i + 1];
  };
}
const K1 = KNOTS.filter(([t]) => t <= B.capture), K2 = KNOTS.filter(([t]) => t >= 3.55);
const X1 = mono(K1), X2 = mono(K2);
export const heroX = (g) => (g < 3.2 ? X1(g) : X2(g));
export const KNOT_LIST = KNOTS;
export const isDual = (g) => g >= B.dock;

// ---------- enemy bullets (pellets) ----------
export const PELLETS = [];
const pellet = (t0, x0, y0, tx, ty, v = 230) => { const d = Math.hypot(tx - x0, ty - y0); PELLETS.push({ t0, x0, y0, vx: ((tx - x0) / d) * v, vy: ((ty - y0) / d) * v }); };
{
  const zp = enemyPos(byName('z1'), 1.98); pellet(1.98, zp.x, zp.y + 10, 300, SHIP_Y);
  const zq = enemyPos(byName('z1'), 2.08); pellet(2.08, zq.x, zq.y + 10, 330, SHIP_Y);
  const gp = enemyPos(byName('g1'), 2.3); pellet(2.3, gp.x, gp.y + 10, 640, SHIP_Y);
}
// boss: 4-way spreads from the jaw, aimed so the dual fighter threads the gap (a near miss each time)
const SPREAD = 128, PV = 250;
for (const t of [8.76, 9.18, 9.52]) {
  const p = bossPos(t), x0 = p.x, y0 = p.y + CORE_DY + 8;
  let c = heroX(t) + DUAL_DX / 2;
  for (let it = 0; it < 4; it++) c = heroX(t + (SHIP_Y - y0) / PV) + DUAL_DX / 2;
  for (let k = -2; k <= 1; k++) pellet(t, x0, y0, c + SPREAD / 2 + k * SPREAD, SHIP_Y, PV);
}
for (const [t, side] of [[8.9, -1], [9.3, 1], [9.7, -1]]) {
  const p = bossPos(t);
  pellet(t, p.x + side * POD_DX, p.y + POD_DY, p.x + side * (POD_DX + 18), SHIP_Y + 40, 300);
}
export const pelletPos = (p, g) => [p.x0 + p.vx * (g - p.t0), p.y0 + p.vy * (g - p.t0)];


// Ship y: fly-in at the start, ship 2 entrance, exit at the end.
export function heroY(g) {
  if (g < B.shipIn[1]) { const u = clamp01(g / B.shipIn[1]); return SHIP_Y + 110 * (1 - u) ** 3 - 10 * Math.sin(u * Math.PI) * (u > 0.6 ? 1 : 0); }
  if (g >= B.ship2In[0] && g < B.ship2In[1]) { const u = clamp01((g - B.ship2In[0]) / (B.ship2In[1] - B.ship2In[0])); return SHIP_Y + 110 * (1 - u) ** 3; }
  if (g >= B.shipOut[0]) { const u = clamp01((g - B.shipOut[0]) / (B.shipOut[1] - B.shipOut[0])); return SHIP_Y + 18 * Math.sin(u * Math.PI) * (u < 0.3 ? 1 : 0) - 640 * u ** 2.2; }
  return SHIP_Y;
}
export const heroVisible = (g) => g < B.capture || g >= B.ship2In[0];

// ---------- captured fighter ----------
// returns { x, y, rot, red } or null
export function captive(g) {
  if (g < B.capture || g >= B.dock) return null;
  if (g < B.rise1) {
    const u = (g - B.capture) / (B.rise1 - B.capture), p = enemyPos(byName('b1'), g);
    const y0 = SHIP_Y, y1 = p.y - 40;
    return { x: HOVER[0] + 2 * Math.sin(u * 20), y: y0 + (y1 - y0) * sm(u), rot: u * Math.PI * 6, red: u > 0.5 };
  }
  if (g < B.release) {
    const p = enemyPos(byName('b1'), g) ?? enemyPos(byName('b1'), B.release - 1e-6);
    return { x: p.x, y: p.y - 40, rot: 0, red: true };
  }
  const p0 = enemyPos(byName('b1'), B.release - 1e-6);
  const u = (g - B.release) / (B.dock - B.release), tx = heroX(B.dock) + DUAL_DX;
  const x = p0.x + (tx - p0.x) * sm(u) + 30 * Math.sin(u * Math.PI) * Math.sin(u * 9);
  const y = p0.y - 40 + (SHIP_Y - (p0.y - 40)) * (u * u * (3 - 2 * u));
  return { x, y, rot: (1 - u) * Math.PI * 8, red: Math.floor(u * 14) % 2 === 0 && u < 0.6 };
}

// ---------- scoring ----------
export const PTS = { zako: 50, goei: 80, boss: 150, chal: 100 };
export const POPS = [];
export const SCORE_EV = [];
for (const h of HITS) {
  if (!h.kill) continue;
  if (h.type === 'giant') continue;
  let pts = PTS[h.type];
  if (h.e.name === 'b1') pts = 1600;
  else if (h.e.name === 'b2') pts = 400;
  else if (h.e.segs.some((s) => s.ease === 'dive' && h.gk >= s.t0 && h.gk < s.t1)) pts *= 2;
  SCORE_EV.push([h.gk, pts]);
  if (pts >= 160 || h.type === 'boss') POPS.push([h.gk, h.x, h.y - 26, String(pts), pts >= 1000 ? '#ffe27a' : '#8ae8ff']);
}
SCORE_EV.push([B.perfect[0] + 0.4, 10000], [B.mega, 50000]);
POPS.push([B.mega, PCX, 200, '50000', '#ffe27a']);
export const TALLY_BONUS = 20000;
export const HISCORE = 30000;
export function hudScore(g) {
  let s = 0;
  for (const [t, p] of SCORE_EV) if (g >= t) s += p;
  const t0 = B.tally[3], t1 = t0 + 0.35;
  if (g >= t0) s += Math.round(TALLY_BONUS * clamp01((g - t0) / (t1 - t0)) / 10) * 10;
  return s;
}
export const shotsFired = (g) => SHOTS.filter((s) => g >= s.g).length;
export const hitsMade = (g) => SHOTS.filter((s) => g >= s.gk).length;
export const kills = (g) => HITS.filter((h) => h.kill && h.type !== 'giant' && g >= h.gk).length;
export function lives(g) {
  if (g < B.capture) return 2;
  if (g < B.ship2In[0]) return 2;
  return 1;
}
