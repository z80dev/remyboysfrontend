// REMY KONG choreography: the whole stage is a pure function of game time g.
// Game time runs inside the 'stage' shot and freezes during hit-stops. The hero's route is laid out first; every
// barrel is then solved backwards from the moment it must meet the hero (a jump, a hammer smash), so re-timing a
// beat re-times the barrel that serves it. `node check.mjs`-style sweeps confirm no unplanned contact.

export const T_TITLE = 1.5; // attract/title card ends (film s)
export const INTRO = 2.7; // "how much hair" card ends, stage starts
export const DURATION = 15;
export const LW = 960, LH = 540;

// ---------- hit-stops (game time, duration, kind) ----------
export const STOPS = []; // filled once the route is known
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

// ---------- girders ----------
// dir: the way barrels roll (downhill). Stepped slopes in 32 px segments. Level KL is Kong's; level PERCH the rescue perch.
export const SEGW = 32;
export const GIRDERS = [
  { xa: 0, xb: 960, yl: 514, yr: 502, flat: 480, dir: -1 },
  { xa: 0, xb: 864, yl: 406, yr: 420, dir: 1 },
  { xa: 96, xb: 960, yl: 314, yr: 300, dir: -1 },
  { xa: 0, xb: 864, yl: 196, yr: 208, flat: 360, dir: 1 },
];
export const KL = GIRDERS.length - 1, PERCH = GIRDERS.length;
export const TOP = { xa: 340, xb: 540, y: 124 };
export function surf(L, x) {
  if (L >= PERCH) return TOP.y;
  const G = GIRDERS[L];
  const s = Math.floor((x - G.xa) / SEGW), cx = Math.max(G.xa, Math.min(G.xb, G.xa + s * SEGW + SEGW / 2));
  const x0 = G.flat ?? G.xa;
  if (cx <= x0) return G.yl;
  return Math.round(G.yl + (G.yr - G.yl) * ((cx - x0) / (G.xb - x0)));
}

// ladders: L = lower level. The hero's route first.
export const LADDERS = [
  { x: 560, L: 0 }, { x: 300, L: 1 }, { x: 640, L: 2 }, { x: 380, L: 3 },
  { x: 840, L: 0 }, { x: 330, L: 0, broken: true }, { x: 760, L: 1 }, { x: 520, L: 1, broken: true },
  { x: 200, L: 2 }, { x: 440, L: 2, broken: true },
];
export const DRUM = { x: 40, w: 34, h: 40 }; // oil drum on L0, centre x
export const KONG = { x: 190, w: 104, h: 158 };
export const STACK_X = 112; // upright barrel stack (right edge just left of Kong)
export const REL_X = 270; // where a thrown barrel starts rolling on Kong's girder
export const FRIEND_X = 500, HERO_END_X = 432;

// ---------- hero route ----------
const V = 300, VCL = 220;
export const JUMP_D = 0.44;
export const ROUTE = [];
const R = { g: 0, x: 220, L: 0 };
const add = (k, d, x1, extra = {}) => { ROUTE.push({ k, t0: R.g, t1: R.g + d, L: R.L, x0: R.x, x1, ...extra }); R.g += d; R.x = x1; };
const walk = (x1, v = V) => add('walk', Math.abs(x1 - R.x) / v, x1);
const climb = () => { const y0 = surf(R.L, R.x), y1 = surf(R.L + 1, R.x); add('climb', (y0 - y1) / VCL, R.x, { y0, y1 }); R.L++; };
const timeAtX = (s, x) => s.t0 + (s.t1 - s.t0) * ((x - s.x0) / (s.x1 - s.x0));
export function routeX(g) {
  for (const s of ROUTE) if (g >= s.t0 && g < s.t1) return s.x0 + (s.x1 - s.x0) * ((g - s.t0) / (s.t1 - s.t0));
  return ROUTE[ROUTE.length - 1].x1;
}

add('idle', 0.5, R.x);
walk(560); climb();
// on L1, walking left: jump for the hammer, land, then fight with it
export const HAMMER = { x: 480 };
const hamWalk = ROUTE.length;
walk(480 - (JUMP_D / 2) * V);
HAMMER.grab = timeAtX(ROUTE[hamWalk], 480);
HAMMER.y = surf(1, 480) - 60;
const HAM_LAND = R.g, HAM_X = R.x;
export const SMASH = [HAM_LAND + 0.28, HAM_LAND + 0.63, HAM_LAND + 0.98]; // barrels from the left; the minion is SMASH[3]
add('hammer', SMASH[2] + 0.05 - R.g, 380);
export const TURN_G = SMASH[2] + 0.1;

// ---------- the fire minion: born when the first barrel hits the drum ----------
export const MINION = { spr: 233, x0: 110, v: 380, ladder: 560 };

// ---------- barrels ----------
export const VB = 330, GRAV = 1700;
export function buildPath(b) {
  const legs = [];
  let t = b.t0, L = KL, x = REL_X, dir = 1, bounce = false;
  for (let guard = 0; guard < 12; guard++) {
    const G = GIRDERS[L];
    const xEnd = L === 0 ? DRUM.x + DRUM.w / 2 + 9 : dir > 0 ? G.xb : G.xa;
    const d = Math.abs(xEnd - x) / VB;
    legs.push({ k: 'roll', t0: t, t1: t + d, L, x0: x, x1: xEnd, bounce });
    t += d; x = xEnd; bounce = false;
    if (L === 0) { legs.push({ k: 'burn', t0: t, t1: Infinity, L, x0: x, x1: x }); break; }
    const x1 = x + dir * 22, y0 = surf(L, x), y1 = surf(L - 1, x1), dd = Math.sqrt((2 * (y1 - y0)) / GRAV);
    legs.push({ k: 'fall', t0: t, t1: t + dd, L, x0: x, x1, y0, y1 });
    t += dd; x = x1; bounce = true;
    L--; dir = GIRDERS[L].dir;
  }
  return legs;
}
function offsetTo(L, x) {
  const r = buildPath({ t0: 0 }).find((l) => l.k === 'roll' && l.L === L && (x - l.x0) * (x - l.x1) <= 0);
  if (!r) throw new Error(`barrel never reaches L${L} x${x}`);
  return r.t0 + (r.t1 - r.t0) * ((x - r.x0) / (r.x1 - r.x0));
}
const meet = (spec, L, x, g) => ({ ...spec, t0: g - offsetTo(L, x) });

export const JUMPS = []; // { apex, h, pts }
export const BARRELS = [];
const J0 = timeAtX(ROUTE[1], 330);
JUMPS.push({ apex: J0, h: 40, pts: 100 }, { apex: HAMMER.grab, h: 34, pts: 0, grab: true });
BARRELS.push(meet({ kind: 'barrel', tag: 'J0' }, 0, 330, J0));
// hammer smashes: barrel centre 50 px in front of the hero
BARRELS.push(meet({ kind: 'barrel', tag: 'S1', smash: SMASH[0] }, 1, routeX(SMASH[0]) - 50, SMASH[0]));
BARRELS.push(meet({ kind: 'barrel', tag: 'S2', smash: SMASH[1] }, 1, routeX(SMASH[1]) - 50, SMASH[1]));
BARRELS.push(meet({ kind: 'head', spr: 0, tag: 'S3', smash: SMASH[2] }, 1, routeX(SMASH[2]) - 50, SMASH[2]));
{
  const legs = buildPath(BARRELS[0]), M = MINION;
  M.born = legs[legs.length - 1].t0 + 0.06;
  M.land = M.born + 0.26;
  M.climb0 = M.land + (M.ladder - M.x0) / M.v;
  M.climb1 = M.climb0 + (surf(0, M.ladder) - surf(1, M.ladder)) / 260;
  M.smash = M.climb1 + (M.ladder - (380 + 50)) / M.v; // reaches the hero's hammer on L1
  SMASH.push(M.smash);
}
add('hammer', SMASH[3] + 0.28 - R.g, 380, { face: 1 });
HAMMER.end = R.g;
walk(300); climb();
walk(640); climb();
walk(380); climb();
export const TOP_G = R.g;
walk(HERO_END_X, 150);
export const ARRIVE = R.g;
add('idle', 99, R.x);
{
  const on = (L) => ROUTE.find((s) => s.k === 'walk' && s.L === L);
  const j1 = timeAtX(on(2), 420), j2 = timeAtX(on(2), 560), j3 = timeAtX(on(KL), 580);
  JUMPS.push({ apex: j1, h: 40, pts: 100 }, { apex: j2, h: 44, pts: 300 }, { apex: j3, h: 40, pts: 100 });
  BARRELS.push(meet({ kind: 'barrel', tag: 'J1' }, 2, 420, j1));
  BARRELS.push(meet({ kind: 'head', spr: 5, tag: 'J2' }, 2, 560, j2));
  BARRELS.push(meet({ kind: 'barrel', tag: 'J3' }, KL, 580, j3));
}
export const FILLERS = [3.5, 4.75, 7.35]; // throw times swept clear of the hero
for (const t0 of FILLERS) BARRELS.push({ kind: 'barrel', t0, tag: 'F' + t0 });
for (const b of BARRELS) b.legs = buildPath(b);
JUMPS.sort((a, b) => a.apex - b.apex);
export const THROWS = BARRELS.filter((b) => b.t0 >= 0).map((b) => b.t0).sort((a, b) => a - b);

// ---------- end beats ----------
export const RIVETS = [];
{
  const pts = [[3, 120], [3, 760], [2, 200], [2, 860], [1, 120], [1, 760]];
  pts.forEach(([L, x], i) => RIVETS.push({ L, x, pop: TOP_G + 0.25 + i * 0.09 }));
}
export const COLLAPSE = RIVETS[RIVETS.length - 1].pop + 0.25;
export const KONG_FALL = { t0: COLLAPSE + 0.05, y0: GIRDERS[KL].yl, y1: surf(0, KONG.x) };
KONG_FALL.t1 = KONG_FALL.t0 + Math.sqrt((2 * (KONG_FALL.y1 - KONG_FALL.y0)) / 2200);
export const HEART_G = KONG_FALL.t1 + 0.3;
export const CLEAR_G = HEART_G + 0.15;
export const TALLY = { t0: HEART_G + 0.4, t1: HEART_G + 1.0 };
export const IRIS = { t0: TALLY.t1 + 0.05, t1: TALLY.t1 + 0.45 };

// Kong's moods: chest-pound windows (throws come from THROWS)
const climbOn = (L) => ROUTE.find((s) => s.k === 'climb' && s.L === L);
export const POUNDS = [[0, 0.42], [SMASH[3] - 0.02, SMASH[3] + 0.36], [climbOn(2).t1 - 0.02, climbOn(2).t1 + 0.66], [TOP_G - 0.1, COLLAPSE - 0.05]];

STOPS.push({ g: HAMMER.grab, d: 0.32, kind: 'power' });
for (const s of SMASH) STOPS.push({ g: s, d: 0.06, kind: 'smash' });
STOPS.push({ g: KONG_FALL.t1, d: 0.2, kind: 'land' });
STOPS.sort((a, b) => a.g - b.g);
export const G_END = DURATION - INTRO - STOPS.reduce((a, s) => a + s.d, 0);

// ---------- hero state ----------
export function heroAt(g) {
  let s = ROUTE[ROUTE.length - 1];
  for (const r of ROUTE) if (g >= r.t0 && g < r.t1) { s = r; break; }
  const u = Math.max(0, Math.min(1, (g - s.t0) / (s.t1 - s.t0)));
  const x = s.x0 + (s.x1 - s.x0) * u;
  let face = s.face ?? (s.x1 !== s.x0 ? Math.sign(s.x1 - s.x0) : 1);
  if (s.k === 'idle' && s.t0 > 1) face = 1;
  let feet = s.k === 'climb' ? s.y0 + (s.y1 - s.y0) * u : surf(s.L, x);
  let jump = null;
  for (const j of JUMPS) {
    const d = g - j.apex;
    if (Math.abs(d) < JUMP_D / 2) { const v = d / (JUMP_D / 2); jump = { j, up: d < 0, off: j.h * (1 - v * v), u: (d + JUMP_D / 2) / JUMP_D }; feet -= jump.off; }
  }
  const hammer = g >= HAMMER.grab && g < HAMMER.end;
  return { x, feet, mode: s.k, face, level: s.L, jump, hammer, seg: s, u };
}
export function minionAt(g) {
  const M = MINION;
  if (g < M.born || g >= M.smash) return null;
  if (g < M.land) { const u = (g - M.born) / (M.land - M.born); return { x: DRUM.x + (M.x0 - DRUM.x) * u, feet: surf(0, M.x0) - 50 * Math.sin(Math.PI * u), mode: 'hop', face: 1 }; }
  if (g < M.climb0) { const x = M.x0 + (g - M.land) * M.v; return { x, feet: surf(0, x), mode: 'run', face: 1 }; }
  if (g < M.climb1) { const u = (g - M.climb0) / (M.climb1 - M.climb0); return { x: M.ladder, feet: surf(0, M.ladder) + (surf(1, M.ladder) - surf(0, M.ladder)) * u, mode: 'climb', face: 1 }; }
  const x = M.ladder - (g - M.climb1) * M.v;
  return { x, feet: surf(1, x), mode: 'run', face: -1 };
}

// ---------- barrel state ----------
export function barrelAt(b, g) {
  if (g < b.t0) return null;
  if (b.smash != null && g >= b.smash) return null;
  const gg = Math.min(g, COLLAPSE);
  let l = b.legs[b.legs.length - 1];
  for (const x of b.legs) if (gg >= x.t0 && gg < x.t1) { l = x; break; }
  if (l.k === 'burn') return null;
  const u = Math.max(0, Math.min(1, (gg - l.t0) / (l.t1 - l.t0)));
  let x = l.x0 + (l.x1 - l.x0) * u, y, side = false, roll = 0;
  if (l.k === 'roll') {
    y = surf(l.L, x);
    if (l.bounce) { const bt = gg - l.t0; if (bt < 0.2) y -= 14 * Math.sin((bt / 0.2) * Math.PI); }
    if (b.kind === 'head') y -= 10 * Math.abs(Math.sin((gg - l.t0) * 9));
    roll = ((gg * VB) / 14) * Math.sign(l.x1 - l.x0);
  } else {
    const dt = gg - l.t0;
    y = l.y0 + 0.5 * GRAV * dt * dt;
    side = true;
  }
  if (g > COLLAPSE) { const dt = g - COLLAPSE; y += 0.5 * GRAV * dt * dt; side = true; }
  return { x, y, L: l.L, side, roll, leg: l };
}
export const burnTimes = () => BARRELS.filter((b) => b.smash == null).map((b) => b.legs[b.legs.length - 1].t0).filter((t) => t < COLLAPSE);

// ---------- scoring / HUD ----------
export const SCORE = [
  ...JUMPS.filter((j) => j.pts).map((j) => [j.apex, j.pts]),
  [SMASH[0], 300], [SMASH[1], 500], [SMASH[2], 800], [SMASH[3], 800],
];
export const HISCORE0 = 6800;
export const BONUS0 = 5000, BONUS_STEP = 0.8;
export function hudBonus(g) {
  const left = BONUS0 - 100 * Math.floor(Math.min(g, TOP_G) / BONUS_STEP);
  if (g < TALLY.t0) return left;
  return Math.max(0, Math.round((left * (1 - Math.min(1, (g - TALLY.t0) / (TALLY.t1 - TALLY.t0)))) / 100) * 100);
}
export function hudScore(g) {
  let s = 0;
  for (const [t, p] of SCORE) if (g >= t) s += p;
  const left = BONUS0 - 100 * Math.floor(TOP_G / BONUS_STEP);
  if (g >= TALLY.t0) s += left - hudBonus(g);
  return s;
}
