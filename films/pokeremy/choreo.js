// POKéREMY cue sheet. Film time t (seconds) for the outer shots; the battle runs on its own game time g that
// freezes during hit-stops (warp/filmT, as in remy-bros), so every impact lands with weight and the score can
// place each SFX on the exact frame.

export const DURATION = 15;
export const LW = 640, LH = 360; // battle / title / evolution native res (×3)
export const OW = 320, OH = 180; // overworld native res (×6)

// ---------- shots (film time) ----------
export const TITLE = { t0: 0, t1: 1.0 };
export const ROUTE = { t0: 1.0, t1: 2.25 };
export const BATTLE0 = ROUTE.t1;

// Overworld beats (route-local seconds)
export const STEP = 0.266; // one 16 px tile
export const STEPS = 3;
export const WALK_END = STEP * STEPS; // 0.8
export const FLASH = { t0: 0.8, t1: 1.0 };
export const SWIRL = { t0: 1.0, t1: 1.25 };

// ---------- battle (game time g, battle-local) ----------
export const B = {
  slide: [0, 0.38],
  foeCry: 0.4,
  foeBox: [0.4, 0.54],
  trainerOut: [1.05, 1.3],
  ball: [1.12, 1.4],
  pop: 1.4,
  grow: [1.4, 1.56],
  heroCry: 1.56,
  heroBox: [1.5, 1.64],
  menu1: 1.66, press1: 1.86,
  moves1: 1.9, press2: 2.1,
  lunge: [2.36, 2.56],
  slashes: [2.42, 2.52, 2.62],
  foeBlink1: [2.7, 2.9],
  foeDrain1: [2.9, 3.2],
  shineHop: [3.62, 3.76],
  glint: [3.62, 3.8],
  shineFlash: [3.78, 3.92],
  heroBlink: [3.92, 4.06],
  heroDrain: [4.02, 4.26],
  moves2: 4.3, steps2: [4.42, 4.52, 4.62], press3: 4.78,
  bottle: [5.08, 5.5],
  stream: [5.14, 5.46],
  foam: [5.38, 5.6],
  impact: 5.6,
  burst: [5.6, 5.95],
  foeBlink2: [5.74, 5.94],
  foeDrain2: [5.95, 6.35],
  faintCry: 7.0,
  faintSlide: [7.04, 7.26],
  foeBoxOut: [7.2, 7.32],
  expFill: [8.1, 8.45],
  lvUp: 8.5,
  end: 9.15,
};
export const STOPS = [
  ...B.slashes.map((g) => ({ g, d: 0.045 })),
  { g: B.impact, d: 0.16, kind: 'impact' },
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
// battle game time → film time
export function filmT(g) {
  let acc = 0;
  for (const s of STOPS) if (s.g < g) acc += s.d;
  return BATTLE0 + g + acc;
}
export const BATTLE1 = filmT(B.end) + STOPS.filter((s) => s.g >= B.end).reduce((a, s) => a + s.d, 0);
export const EVO0 = BATTLE1;

// ---------- text script (battle game time) ----------
export const CPS = 58;
export const MSGS = [
  { g: 0.42, s: 'Wild BALD REMY\nappeared!' },
  { g: 1.05, s: 'Go! REMY!' },
  { g: 2.12, s: 'REMY used\nHAIR WHIP!' },
  { g: 3.24, s: 'BALD REMY used\nHEAD SHINE!' },
  { g: 4.8, s: 'REMY used\nSUPER SHAMPOO!' },
  { g: 6.4, s: "It's super\neffective!" },
  { g: 7.26, s: 'Wild BALD REMY\nfainted!' },
  { g: 7.84, s: 'REMY gained\n1337 EXP. Points!' },
  { g: 8.5, s: 'REMY grew to\nlevel 13!' },
];
export const MENUS = [
  { g0: B.menu1, g1: B.moves1, kind: 'fight' },
  { g0: B.moves1, g1: B.press2 + 0.02, kind: 'moves', cursor: () => 0 },
  { g0: B.moves2, g1: B.press3 + 0.02, kind: 'moves', cursor: (g) => B.steps2.filter((s) => g >= s).length },
];
export const MOVES = [
  { name: 'HAIR WHIP', type: 'HAIR', pp: 15 },
  { name: 'TONIC SPLASH', type: 'WATER', pp: 10 },
  { name: 'COMB OVER', type: 'NORMAL', pp: 20 },
  { name: 'SUPER SHAMPOO', type: 'SUDS', pp: 5 },
];
export const msgEnd = (m) => m.g + m.s.replace('\n', '').length / CPS;

// ---------- HP / EXP ----------
export const HERO_HP = 46, HERO_HP_AFTER = 31;
const ramp = (g, [a, b], v0, v1) => (g <= a ? v0 : g >= b ? v1 : v0 + (v1 - v0) * ((g - a) / (b - a)));
export function foeHp(g) {
  if (g < B.foeDrain2[0]) return ramp(g, B.foeDrain1, 1, 0.46);
  return ramp(g, B.foeDrain2, 0.46, 0);
}
export const heroHp = (g) => ramp(g, B.heroDrain, HERO_HP, HERO_HP_AFTER);
export const heroExp = (g) => (g < B.lvUp ? ramp(g, B.expFill, 0.22, 1) : ramp(g, [B.lvUp + 0.05, B.lvUp + 0.3], 0, 0.08));
export const heroLv = (g) => (g >= B.lvUp ? 13 : 12);

// ---------- evolution + ending (evolution-shot local seconds) ----------
export const EV = {
  msg1: 0.1,
  flick: [0.5, 1.5],
  reveal: 1.5,
  msg2: 1.52,
  end: 2.32, // end card overlay drops in
};
export const EVO_MSGS = [
  { g: EV.msg1, s: 'What? REMY\nis evolving!' },
  { g: EV.msg2, s: 'REMY evolved into\nSABEREMY!' },
];
// flicker: which form shows (0 = REMY, 1 = SABEREMY) with a period that shrinks as it builds.
export function evoForm(e) {
  if (e < EV.flick[0]) return 0;
  if (e >= EV.reveal) return 1;
  const u = (e - EV.flick[0]) / (EV.flick[1] - EV.flick[0]);
  // phase = ∫ freq; freq rises 3 → 22 Hz
  const ph = (EV.flick[1] - EV.flick[0]) * (3 * u + 9.5 * u * u);
  return Math.floor(ph * 2) % 2;
}
export const evoFlips = (() => {
  const out = [];
  let prev = 0;
  for (let e = EV.flick[0]; e < EV.reveal; e += 1 / 240) {
    const f = evoForm(e);
    if (f !== prev) out.push(e);
    prev = f;
  }
  return out;
})();
