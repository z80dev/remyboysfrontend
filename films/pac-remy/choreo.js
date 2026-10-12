// Choreography: the maze round is a pure function of game time g.
// Game time freezes during hit-stops (power-up, each ghost eaten, fruit), so every hit lands with weight.
// Ghost catches are not hand-timed: they are solved from the hero's and the ghosts' tracks, and every
// downstream beat (score, freezes, eyes flying home, SFX) derives from those solved times.

// ---------- film timing ----------
export const INTRO = 1.6; // attract / title card (film seconds); the round, intermission and high-score card follow
export const DURATION = 15;
export const LW = 960, LH = 540;

// ---------- the maze ----------
// # wall  . pellet  o hair tonic (power)  - ghost door  H ghost house  ' ' open, no pellet
export const MAZE = [
  '############################',
  '#o...........##...........o#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.#####.##.#####.######',
  '######.......  .......######',
  '######.##.###--###.##.######',
  '      .  .#HHHHHH#.  .      ',
  '######.##.#HHHHHH#.##.######',
  '######.##.########.##.######',
  '######.##....  ....##.######',
  '######.##.########.##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......  .......##..o#',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];
export const COLS = 28, ROWS = MAZE.length, TILE = 22, TUNNEL_ROW = 10;
export const MX = Math.round((LW - COLS * TILE) / 2), MY = Math.round((LH - ROWS * TILE) / 2);
export const cell = (c, r) => (r < 0 || r >= ROWS ? '#' : c < 0 || c >= COLS ? (r === TUNNEL_ROW ? ' ' : '#') : MAZE[r][c]);
export const isWall = (c, r) => cell(c, r) === '#';
export const px = (c) => MX + c * TILE + TILE / 2;
export const py = (r) => MY + r * TILE + TILE / 2;

// A track is a list of keyframes [c, r, g]; consecutive keys share a row or a column (straight corridor legs).
class Track {
  constructor(c, r, g) { this.k = [[c, r, g]]; }
  get end() { return this.k[this.k.length - 1]; }
  to(c, r, v) { const [c0, r0, g0] = this.end; this.k.push([c, r, g0 + (Math.abs(c - c0) + Math.abs(r - r0)) / v]); return this; }
  until(c, r, g) { this.k.push([c, r, g]); return this; }
  wait(d) { const [c, r, g] = this.end; this.k.push([c, r, g + d]); return this; }
  // truncate at g (a frightened ghost reverses mid-corridor); returns the corner it came from
  cut(g) {
    const p = this.at(g), k = this.k;
    let i = k.findIndex((q) => q[2] > g);
    if (i < 0) i = k.length;
    const from = k[i - 1];
    k.length = i;
    k.push([p.c, p.r, g]);
    return [from[0], from[1]];
  }
  at(g) {
    const k = this.k;
    if (g <= k[0][2]) return { c: k[0][0], r: k[0][1], dc: 0, dr: 0, moving: false };
    for (let i = 1; i < k.length; i++) {
      const [c1, r1, g1] = k[i];
      if (g < g1) {
        const [c0, r0, g0] = k[i - 1], u = (g - g0) / (g1 - g0);
        return { c: c0 + (c1 - c0) * u, r: r0 + (r1 - r0) * u, dc: Math.sign(c1 - c0), dr: Math.sign(r1 - r0), moving: c1 !== c0 || r1 !== r0 };
      }
    }
    const [c, r] = this.end;
    return { c, r, dc: 0, dr: 0, moving: false };
  }
  // last non-zero heading at or before g
  heading(g) {
    const k = this.k;
    let dc = -1, dr = 0;
    for (let i = 1; i < k.length; i++) {
      if (k[i - 1][2] > g) break;
      const ddc = Math.sign(k[i][0] - k[i - 1][0]), ddr = Math.sign(k[i][1] - k[i - 1][1]);
      if (ddc || ddr) { dc = ddc; dr = ddr; }
    }
    return { dc, dr };
  }
}
const track = (c, r, g) => new Track(c, r, g);

// ---------- speeds (tiles / s) ----------
const V_HERO = 8.5, V_HERO_P = 10, V_RED = 10.2, V_FRIGHT = 4.2, V_EYES = 17, V_HOUSE = 4;

// ---------- beats (game time) ----------
export const GO = 1.2; // READY! ends
export const DOOR = [13.5, 8], HOUSE_Y = 10.5;

// Hero: under the house → left → up the left lane onto the tonic at the tunnel crossing (6,10),
// where the bald heads close in from above and below.
export const HERO = track(13.5, 17, 0).wait(GO)
  .to(12, 17, V_HERO).to(12, 15, V_HERO).to(6, 15, V_HERO).to(6, 10, V_HERO);
export const TONIC_G = HERO.end[2];
export const TONIC = [6, 10];
// After the tonic: up, then right along the top of the house (orange, cyan, pink in a row), down the
// right side and back left under the house (bonus comb, then CHROMEY himself for 1600).
HERO.to(6, 8, V_HERO_P).to(18, 8, V_HERO_P).to(18, 13, V_HERO_P).to(9, 13, V_HERO_P);

// Ghosts: 0 CHROMEY (red, shadow), 1 BUFFY (pink, ambush), 2 DOMEY (cyan, flank), 3 CUEBALL (orange, wander).
export const GHOSTS = [
  { name: 'CHROMEY', char: 'GLARE', col: '#ff2a3a', glow: '#ff5060', spr: 1694 },
  { name: 'BUFFY', char: 'WAXY', col: '#ff8ad8', glow: '#ffb0e8', spr: 952 },
  { name: 'DOMEY', char: 'BALDFUL', col: '#2af0ff', glow: '#80f8ff', spr: 419 },
  { name: 'CUEBALL', char: 'SMOOTH', col: '#ffa83a', glow: '#ffc070', spr: 980 },
];
const TG = TONIC_G;
// Before the tonic each ghost runs its own "AI": red shadows the hero's exact path, orange cuts over the
// top to drop on him from above, cyan trails orange, pink swings wide right (ambushing the wrong side).
// At the tonic they reverse and flee at frightened speed.
const red = track(13.5, 8, 0).wait(GO).to(9, 8, V_RED).to(9, 15, V_RED).to(6, 15, V_RED).to(6, 10, V_RED);
red.cut(TG);
red.to(6, 15, 3.6).to(9, 15, 3.6).to(9, 13, 3.6).to(18, 13, 3.6); // CHROMEY is too vain to run fast

const PINK_Y = 11.6;
const pink = track(13.5, HOUSE_Y, 0).wait(GO).to(13.5, 8, 6);
pink.to(21, 8, (7.5 + PINK_Y - 8) / (TG - pink.end[2])).to(21, 15, 8);
pink.cut(TG);
pink.to(21, 8, V_FRIGHT).to(6, 8, V_FRIGHT);

const ORANGE_X = 6.9, CYAN_X = 8.8;
const orange = track(15.5, HOUSE_Y, 0).wait(GO).to(13.5, HOUSE_Y, 5).to(13.5, 8, 6);
orange.to(6, 8, (13.5 - ORANGE_X) / (TG - orange.end[2])).to(6, 15, 9);
orange.cut(TG);
orange.to(21, 8, V_FRIGHT);

const cyan = track(11.5, HOUSE_Y, 0).wait(GO + 0.42).to(13.5, HOUSE_Y, 5).to(13.5, 8, 6);
cyan.to(6, 8, (13.5 - CYAN_X) / (TG - cyan.end[2])).to(6, 15, 9);
cyan.cut(TG);
cyan.to(21, 8, V_FRIGHT);

const PRE = [red, pink, cyan, orange];

// ---------- solve the catches ----------
const dist = (a, b) => Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
export const CATCH_D = 0.55;
function solveCatch(tr, from) {
  for (let g = from; g < from + 6; g += 1 / 2400) if (dist(HERO.at(g), tr.at(g)) < CATCH_D) return g;
  throw new Error('ghost never caught');
}
const PTS = [200, 400, 800, 1600];
export const EATS = PRE.map((tr, i) => ({ i, g: solveCatch(tr, TG + 0.05) }))
  .sort((a, b) => a.g - b.g)
  .map((e, n) => ({ ...e, n, pts: PTS[n], ...HERO.at(e.g) }));
const eatOf = (i) => EATS.find((e) => e.i === i);

// ---------- eyes fly home (BFS over the tile graph to the door, then down into the house) ----------
function bfsPath(from, goal) {
  const key = (c, r) => r * 64 + c + 8;
  const prev = new Map([[key(...from), null]]), q = [from];
  while (q.length) {
    const [c, r] = q.shift();
    if (c === goal[0] && r === goal[1]) break;
    for (const [dc, dr] of [[0, -1], [-1, 0], [0, 1], [1, 0]]) {
      const n = [c + dc, r + dr];
      if (n[0] < 0 || n[0] >= COLS || isWall(...n) || cell(...n) === 'H' || cell(...n) === '-' || prev.has(key(...n))) continue;
      prev.set(key(...n), [c, r]);
      q.push(n);
    }
  }
  const out = [];
  for (let p = goal; p; p = prev.get(key(...p))) out.unshift(p);
  return out;
}
const HOME_X = [13.5, 13.5, 11.5, 15.5]; // house slot each ghost revives in
export const TRACKS = PRE.map((tr, i) => {
  const e = eatOf(i), p = tr.at(e.g);
  const t = track(p.c, p.r, e.g);
  // snap to the tile the ghost is on, then walk the BFS corners
  const sc = Math.round(p.c), sr = Math.round(p.r);
  t.to(sc, sr, V_EYES);
  const path = bfsPath([sc, sr], [13, 8]);
  for (let k = 1; k < path.length; k++) {
    const [c, r] = path[k], nx = path[k + 1];
    if (nx && (nx[0] - c === c - path[k - 1][0]) && (nx[1] - r === r - path[k - 1][1])) continue; // straight: skip
    t.to(c, r, V_EYES);
  }
  t.to(DOOR[0], DOOR[1], V_EYES).to(13.5, HOUSE_Y, V_EYES * 0.6);
  if (HOME_X[i] !== 13.5) t.to(HOME_X[i], HOUSE_Y, V_HOUSE);
  return { pre: tr, eyes: t, home: t.end[2] };
});

// Ghost state at g: mode 'house' | 'out' | 'fright' | 'eyes' | 'revived', position, heading.
export function ghostAt(i, g) {
  const T = TRACKS[i], e = eatOf(i);
  if (g < e.g) {
    const p = T.pre.at(g);
    const inHouse = p.r > 8.6 && p.c > 10.5 && p.c < 16.5 && !(p.c === 13.5 && p.r <= 8);
    const mode = g >= TG ? 'fright' : inHouse && !p.moving ? 'house' : 'out';
    return { ...p, ...(p.moving ? {} : T.pre.heading(g)), mode };
  }
  const p = T.eyes.at(g);
  return { ...p, ...(p.moving ? {} : T.eyes.heading(g)), mode: g < T.home ? 'eyes' : 'revived' };
}

// ---------- hit-stops (game time, duration, kind) ----------
export const FRUIT = { c: 13.5, r: 13, show: 2.2 };
FRUIT.g = (() => { for (let g = TG; g < TG + 6; g += 1 / 2400) { const p = HERO.at(g); if (Math.abs(p.c - FRUIT.c) + Math.abs(p.r - FRUIT.r) < 0.3) return g; } throw new Error('fruit missed'); })();
export const STOPS = [
  { g: TG, d: 0.3, kind: 'power' },
  ...EATS.map((e) => ({ g: e.g, d: e.n === 3 ? 0.5 : 0.3, kind: 'eat', e })),
  { g: FRUIT.g, d: 0.06, kind: 'fruit' },
].sort((a, b) => a.g - b.g);

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

// ---------- finale: MANE MAGNET vortex, then the maze-clear flash ----------
export const LAST_EAT = EATS[3].g;
export const VORTEX = { g0: LAST_EAT + 0.1, g1: LAST_EAT + 0.92 };
HERO.cut(VORTEX.g0); // the hero plants his feet for the MANE MAGNET
HERO.wait(10);
export const HERO_STOP = VORTEX.g0;
export const CLEAR = { g0: VORTEX.g1 + 0.1 };
CLEAR.g1 = CLEAR.g0 + 0.96;
export const G_END = CLEAR.g1 + 0.24;
export const FADE = { g0: CLEAR.g1 - 0.04, g1: G_END };
export const MAZE_END = filmT(G_END) + STOPS.filter((s) => s.g >= G_END).reduce((a, s) => a + s.d, 0);
export const INTER_END = MAZE_END + 2.1;

// ---------- pellets ----------
export const PELLETS = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const ch = MAZE[r][c];
  if (ch === '.' || ch === 'o') PELLETS.push({ c, r, power: ch === 'o' || (c === TONIC[0] && r === TONIC[1]), g: Infinity, vortex: false });
}
// the tonic sits at the tunnel crossing (an extra power-up spot of this maze)
if (!PELLETS.some((p) => p.c === TONIC[0] && p.r === TONIC[1])) throw new Error('tonic tile has no pellet');
for (let g = GO; g < HERO_STOP + 0.01; g += 1 / 1200) {
  const h = HERO.at(g);
  for (const p of PELLETS) if (p.g === Infinity && Math.abs(h.c - p.c) + Math.abs(h.r - p.r) < 0.45) p.g = g;
}
// the rest fly into the hero during the vortex, nearest first
const HERO_V = HERO.at(VORTEX.g0);
const left = PELLETS.filter((p) => p.g > VORTEX.g0);
const dmax = Math.max(...left.map((p) => Math.hypot(p.c - HERO_V.c, p.r - HERO_V.r)));
for (const p of left) {
  const d = Math.hypot(p.c - HERO_V.c, p.r - HERO_V.r) / dmax;
  p.vortex = true;
  p.lift = VORTEX.g0 + 0.5 * d; // starts flying
  p.g = p.lift + 0.18 + 0.2 * d; // arrives
}
export const VORTEX_HERO = HERO_V;

// ---------- score ----------
export const SCORE_EV = [
  ...PELLETS.map((p) => [p.g, p.power ? 50 : 10]),
  ...EATS.map((e) => [e.g, e.pts]),
  [FRUIT.g, 500],
].sort((a, b) => a[0] - b[0]);
export const HI0 = 4200;
export function hudScore(g) {
  let s = 0;
  for (const [t, p] of SCORE_EV) if (g >= t) s += p; else break;
  return s;
}
export const FINAL_SCORE = SCORE_EV.reduce((a, [, p]) => a + p, 0);
