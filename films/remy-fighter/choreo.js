// Choreography for REMY FIGHTER II. Every position, pose and HUD value is a pure function of game time g.
// Game time runs inside the 'fight' shot; it freezes on hit-stops (rate 0), crawls in the K.O. slow motion
// (rate 0.3), and filmT() maps game time back to film seconds so the score lands every SFX on its frame.

export const DURATION = 15;
export const LW = 960, LH = 540;
export const GY = 470; // floor line (feet)
export const SW = 1440; // stage width (world px)

// ---------- shots (film seconds) ----------
export const TITLE = 0, SELECT = 1.3, VERSUS = 2.4, FIGHT = 3.2, QUOTE = 13.0;

// ---------- game beats ----------
export const ROUND_G = 0.08, FIGHT_G = 0.95;
export const WALK = [1.15, 1.5];
export const KICK_G = 1.55; // hero high kick, blocked
export const BPUNCH = { t0: 1.75, act: 1.92, t1: 2.12 }; // boss straight, blocked
export const JUMP = { t0: 2.15, ta: 2.42, t1: 2.75, h: 150 };
export const JK_G = 2.6; // jump kick, hit 1
export const PUNCH_G = 2.88; // hit 2
export const SLASH_G = 3.06; // hit 3 (launcher)
export const DK = { t0: 3.22, rel: 3.36, t1: 3.62, v: 480, y: GY - 70 };
export const BALL = { t0: 3.95, rel: 4.15, v: 360, y: GY - 150 };
export const SUPER_G = 4.4, SUPER_D = 0.9;
export const BEAM = { rel: 4.42, v: 2500, y: GY - 72, end: 5.3 };
export const BEAM_HITS = Array.from({ length: 8 }, (_, i) => 4.53 + i * 0.075);
export const KO_G = 5.15, KO_STOP = 0.3, SLOW = { d: 1.3, rate: 0.3 };
export const LAND = [5.7, 5.9]; // boss lands, bounces, lies
export const WIN_G = 5.95, YOUWIN_G = 6.05, PERFECT_G = 6.4;

// ---------- positions (world x) ----------
const smooth = (u) => u * u * (3 - 2 * u);
const keys = (K) => (g) => {
  if (g <= K[0][0]) return K[0][1];
  for (let i = 0; i < K.length - 1; i++) {
    const [a, va, ease] = K[i], [b, vb] = K[i + 1];
    if (g < b) { const u = (g - a) / (b - a); return va + (vb - va) * (K[i + 1][2] === 'lin' ? u : K[i + 1][2] === 'out' ? 1 - (1 - u) * (1 - u) : smooth(u)); }
  }
  return K[K.length - 1][1];
};
export const BOSS_FRONT = 90; // boss half body width at 3×
export const HERO_FRONT = 50; // hero half body width at 2×
export const DK_X0 = 610 + 62;
export const SLASH_X = 920;
export const DK_HIT = DK.rel + (SLASH_X - BOSS_FRONT - DK_X0) / DK.v;
export const BALL_X0 = 990 - 96;
export const ballX = (g) => BALL_X0 - BALL.v * (g - BALL.rel);
export const BEAM_X0 = 610 + 64;
export const BEAM_CLASH = BEAM.rel + (ballX(SUPER_G) - 20 - BEAM_X0) / BEAM.v; // the beam eats the dome ball

export const heroX = keys([
  [0, 520], [WALK[0], 520], [WALK[1], 590], [KICK_G + 0.02, 590], [KICK_G + 0.09, 578, 'out'], [BPUNCH.act, 578], [BPUNCH.act + 0.1, 560, 'out'],
  [JUMP.t0, 560], [JUMP.t1, 600, 'lin'], [PUNCH_G - 0.06, 600], [PUNCH_G, 610, 'out'], [SLASH_G - 0.06, 610], [SLASH_G, 622, 'out'], [SLASH_G + 0.15, 616],
  [DK.rel, 616], [DK.rel + 0.12, 610, 'out'], [BEAM.rel, 610], [BEAM.rel + 0.12, 596, 'out'], [KO_G, 586], [KO_G + 0.2, 584, 'out'],
]);
export const bossX = keys([
  [0, 800], [WALK[0], 800], [WALK[1], 762], [KICK_G + 0.02, 762], [KICK_G + 0.1, 772, 'out'], [BPUNCH.t0, 772], [BPUNCH.act, 752, 'out'],
  [JK_G, 752], [JK_G + 0.12, 762, 'out'], [PUNCH_G, 762], [PUNCH_G + 0.1, 772, 'out'], [SLASH_G, 772], [SLASH_G + 0.34, SLASH_X, 'out'],
  [DK_HIT, SLASH_X], [DK_HIT + 0.35, 990, 'out'], [BEAM_HITS[0], 990], [KO_G, 1030],
]);

// ---------- hit-stops / slow motion ----------
// { g, d: real seconds, rate: game seconds per real second (0 = freeze), kind }
export const STOPS = [
  { g: KICK_G, d: 0.05, rate: 0, kind: 'block' },
  { g: BPUNCH.act, d: 0.06, rate: 0, kind: 'block' },
  { g: JK_G, d: 0.07, rate: 0, kind: 'hit' },
  { g: PUNCH_G, d: 0.05, rate: 0, kind: 'hit' },
  { g: SLASH_G, d: 0.07, rate: 0, kind: 'hit' },
  { g: DK_HIT, d: 0.1, rate: 0, kind: 'hit' },
  { g: SUPER_G, d: SUPER_D, rate: 0, kind: 'super' },
  ...BEAM_HITS.map((g) => ({ g, d: 0.025, rate: 0, kind: 'hit' })),
  { g: KO_G, d: KO_STOP, rate: 0, kind: 'ko' },
  { g: KO_G, d: SLOW.d, rate: SLOW.rate, kind: 'slow' },
];

// Shot time → { g, stop, sl (seconds into the stop) }.
export function warp(ts) {
  let acc = 0; // real − game
  for (const s of STOPS) {
    const rs = s.g + acc;
    if (ts < rs) return { g: ts - acc, stop: null, sl: 0 };
    if (ts < rs + s.d) return { g: s.g + (ts - rs) * s.rate, stop: s, sl: ts - rs };
    acc += s.d * (1 - s.rate);
  }
  return { g: ts - acc, stop: null, sl: 0 };
}
// Game time → shot time. An event at a stop's g lands at the start of that stop.
export function shotT(g) {
  let acc = 0;
  for (const s of STOPS) {
    if (s.g >= g) break;
    const span = s.d * s.rate;
    if (g < s.g + span) return s.g + acc + (g - s.g) / s.rate;
    acc += s.d * (1 - s.rate);
  }
  return g + acc;
}
export const filmT = (g) => FIGHT + shotT(g);
export const G_END = (() => { let g = QUOTE - FIGHT; for (let i = 0; i < 40; i++) g += (QUOTE - filmT(g)); return g; })();

// ---------- hits ----------
// Every contact: game time, kind (hit/block), who is struck, damage, spark position (world), combo id.
export const HITS = [
  { g: KICK_G, kind: 'block', on: 'boss', x: 672, y: GY - 62 },
  { g: BPUNCH.act, kind: 'block', on: 'hero', x: 614, y: GY - 100 },
  { g: JK_G, kind: 'hit', on: 'boss', dmg: 0.08, x: 668, y: GY - 122, combo: 1, pts: 1200 },
  { g: PUNCH_G, kind: 'hit', on: 'boss', dmg: 0.06, x: 680, y: GY - 70, combo: 1, pts: 800 },
  { g: SLASH_G, kind: 'hit', on: 'boss', dmg: 0.1, x: 686, y: GY - 120, combo: 1, pts: 1500, big: true },
  { g: DK_HIT, kind: 'hit', on: 'boss', dmg: 0.14, x: SLASH_X - BOSS_FRONT + 6, y: DK.y, combo: 1, pts: 3000, big: true },
  ...BEAM_HITS.map((g, i) => ({ g, kind: 'hit', on: 'boss', dmg: 0.065, x: bossX(g) - BOSS_FRONT + 10 + (i % 3) * 8, y: BEAM.y - 30 + ((i * 37) % 60), combo: 2, pts: 1000 })),
  { g: KO_G, kind: 'hit', on: 'boss', dmg: 0.1, x: bossX(KO_G) - BOSS_FRONT + 14, y: BEAM.y - 10, combo: 2, pts: 20000, big: true, ko: true },
];
export const lastHitBefore = (g, on = 'boss') => { let h = null; for (const e of HITS) if (e.on === on && e.kind === 'hit' && e.g <= g) h = e; return h; };

// ---------- HUD ----------
export function bossLife(g) {
  let l = 1;
  for (const h of HITS) if (h.dmg && g >= h.g) l -= h.dmg;
  return Math.max(0, l);
}
// The red lag segment holds, then drains to the yellow.
export function bossLag(g) {
  let l = 1;
  for (const h of HITS) if (h.dmg) l -= h.dmg * smooth(Math.min(1, Math.max(0, (g - h.g - 0.22) / 0.35)));
  return Math.max(bossLife(g), l);
}
export const hudTimer = (g) => Math.max(0, 99 - Math.floor(Math.max(0, Math.min(g, KO_G) - FIGHT_G) / 0.9));
export function hudScore(g) {
  let s = 0;
  for (const h of HITS) if (h.pts && g >= h.g) s += h.pts;
  if (g >= PERFECT_G) s += Math.round(Math.min(1, (g - PERFECT_G) / 0.4) * 50000);
  return s;
}
// super gauge 0..1: fills with every hit, empties into the super
export function superGauge(g) {
  if (g >= SUPER_G) return Math.max(0, 1 - (g - SUPER_G) / 0.6);
  let s = 0.12;
  for (const h of HITS) if (g >= h.g) s += h.kind === 'block' ? 0.08 : h.big ? 0.26 : 0.18;
  return Math.min(1, s);
}
// combo counter: { n, t (game time of the latest hit) } while it's showing
export function combo(g) {
  let best = null;
  for (const id of [1, 2]) {
    const hs = HITS.filter((h) => h.combo === id && g >= h.g);
    if (hs.length < 2) continue;
    const last = hs[hs.length - 1];
    const all = HITS.filter((h) => h.combo === id);
    const end = all[all.length - 1].g + (id === 2 ? 0.85 : 0.6);
    if (g < end) best = { n: hs.length, t: last.g, id, end };
  }
  return best;
}

// ---------- camera ----------
export function camX(g) {
  let s = 0;
  const n = 10;
  for (let i = 0; i < n; i++) {
    const gg = Math.max(0, g - (i / n) * 0.3);
    const mid = (heroX(gg) + Math.min(bossX(gg), heroX(gg) + 520)) / 2;
    // after the K.O. frame the hero and the whole sprawled boss
    const ko = gg > KO_G ? (heroX(gg) - 60 + bossX(gg) + koDX(gg) + 180) / 2 : mid;
    const k = Math.min(1, Math.max(0, (gg - KO_G) / 0.4));
    s += mid + (ko - mid) * k * k * (3 - 2 * k);
  }
  return Math.max(0, Math.min(SW - LW, s / n - LW / 2));
}

// ---------- K.O. flight ----------
// Boss flies back from the final hit, slams down, bounces once and lies still.
export function koDX(g) {
  if (g < KO_G) return 0;
  const a = Math.min(g, LAND[0]) - KO_G;
  let dx = 120 * (a / (LAND[0] - KO_G));
  if (g > LAND[0]) dx += 30 * (1 - (1 - Math.min(1, (g - LAND[0]) / 0.3)) ** 2);
  return dx;
}
export function koY(g) {
  if (g < KO_G) return 0;
  if (g < LAND[0]) { const u = (g - KO_G) / (LAND[0] - KO_G); return 150 * 4 * u * (1 - u) + 30 * (1 - u); }
  if (g < LAND[1]) { const u = (g - LAND[0]) / (LAND[1] - LAND[0]); return 36 * 4 * u * (1 - u); }
  return 0;
}
