// THE BIG SHEDDING — a Remy noir. 74 s. Every cue in the film lives here:
// shots, captions and the score all import this file, so re-timing is one edit.
// Six acts: street (cold open) → office (client) → trail (investigation) →
// club (the Baron) → fight (the shedding) → dawn (case closed + title).

export const T = {
  // ACT I — STREET (0–10): rain street, neon, wanted poster, slow push-in
  street: 0,
  poster: 2.6, // poster slid into frame under the lamp
  pushEnd: 10,

  // ACT II — OFFICE (10–24): Flow at the desk, client enters 14.5, case file 18.6
  office: 10,
  client: 14.5, // doorway silhouette + lightning
  reveal: 16.2, // framed portrait card of MIDNIGHT lands
  caseFile: 18.6, // dossier slides across the desk
  standUp: 22.2, // Flow rises, hat shadow, cut out

  // ACT III — TRAIL (24–38): walk montage, clue 26.6, witness 29.6, goons 33.4, club sign 36.2
  trail: 24,
  clue: 26.6, // glowing strand close-up
  witness: 29.6, // ORDERLY flash-card
  goons: 33.4, // two silhouettes in a doorway
  signTilt: 36.2, // tilt up to the COMB CLUB marquee

  // ACT IV — CLUB (38–52): interior, Baron in the spot, threats
  club: 38,
  baron: 40.0, // spotlight snaps to the Baron
  razorUp: 44.6, // the straight razor rises
  heroEnter: 47.0, // Flow steps into the doorway light
  stare: 49.6, // hold: two silhouettes, one bulb

  // ACT V — FIGHT (52 → ~60.73): choreography on warped fight time (warp below)
  fight: 52,
  // ACT VI — DAWN is assigned after the warp table is built: its start is the
  // warped length of the fight, so the cut lands exactly on the last event.

  titleSlam: 65.4,
  kicker: 67.6,
  theEnd: 69.8,
  end: 74,
};

// Cast — inspected contact sheets, casting pass of 2026-10-10.
// HERO 42  "Crimson Flow"  red hair + greatsword, clean silhouette.
// BARON   1217 "Pearl Soul" white high-collar gi = crime-lord robe. Bald ✓.
// MIDNIGHT 34 "Midnight Flow" blue-skinned, black hair — the client. Clean sprite.
// GOON A  1652 "Midnight Soul" shades + bat. Bald ✓.
// GOON B  1344 "Copper Soul" mustache + yellow jersey. Bald ✓.
// WITNESS 3408 "Gold Flow" blond scrubs — nervous orderly. Clean sprite.
export const CAST = {
  HERO: 42,
  BARON: 1217,
  MIDNIGHT: 34,
  GOON_A: 1652,
  GOON_B: 1344,
  WITNESS: 3408,
};

// Narration (VO) + dialogue. Speaker tags inline. All holds ≥ 3 s for lint.
export const COPY = {
  v1: "Hair City. Three a.m.\nThe kind of night that frays at the edges.",
  v2: "Somebody was shearing the city bald.\nOne head at a time.",
  d1: "FLOW · The name\u2019s Crimson Flow.\nI keep a full head of questions.",
  d2: "MIDNIGHT · Three barbers gone silent.\nMy brother\u2019s mane \u2014 gone. Find the razor.",
  v3: "The trail smelled of tonic and regret.",
  d4: "BARON · You can\u2019t stop the shine, Flow.\nGloss is destiny.",
  d5: "FLOW · Your trim is long overdue.",
  v5: "Never bring a sword to a razor fight.\nI never liked rules.",
  v6: "Case closed. The city kept its hair.\nI kept the bill.",
  d3: "ORDERLY · Twelve heads from St. Follicle\u2019s.\nOne night. No partings left behind.",
  v4: "Every street led to the one club\nwhere bald men make the rules.",
};

// ── FIGHT choreography (world g in [0, 6.6], mapped through stops + slow-mo) ──
// Events in g-time; stops freeze the world (shake/sparks run on real time).
export const FIGHT = {
  end: 6.6, // world seconds covered before the cut to dawn
  // world-time events
  goonsAdvance: 0.3,
  swingA: 1.55, // goon A bat swing (contact 1.8)
  hitA: 1.8, // parry — goon A knocked back, bat flies
  chargeB: 2.6,
  hitB: 3.1, // sidestep — goon B crashes the bar, bottles burst
  lunge: 4.2, // Baron lunges, razor arcs 4.7
  clash: 4.9, // sword meets razor — long dramatic freeze
  slowmoEnd: 5.9, // 0.45× world rate from clash-resume to here
  split: 5.35, // razor breaks in two
  kneel: 5.5, // Baron drops to knees (still inside the slow-mo window)
  hair: 5.8, // a single hair sprouts (spring)
  lightsOn: 6.2, // house lights flicker up
  stops: [
    { g: 1.8, d: 0.16 },
    { g: 3.1, d: 0.2 },
    { g: 4.9, d: 0.55 },
  ],
  rate: [
    { from: 4.9, to: 5.9, k: 0.45 }, // slow-motion during the razor split
  ],
};

// Build the ts↔g mapping once by integrating over a uniform WORLD-time grid:
// ts advances by Δg / rate(g), plus each stop's freeze duration at its boundary.
// rate < 1 (slow motion) makes ts advance faster than g; stops make ts jump at
// constant g. Rows are monotonic in both directions, so both interpolations are exact.
const TABLE = (() => {
  const rows = [{ ts: 0, g: 0 }]; // uniform g grid, ts accumulated
  let ts = 0;
  const step = 0.005;
  const gMax = FIGHT.end + 3;
  const rate = (g) => {
    let k = 1;
    for (const r of FIGHT.rate) if (g >= r.from && g < r.to) k = r.k;
    return k;
  };
  for (let g = 0; g < gMax; g += step) {
    ts += step / rate(g + step / 2);
    for (const s of FIGHT.stops) if (g < s.g && g + step >= s.g) ts += s.d;
    rows.push({ ts, g: Math.min(g + step, gMax) });
  }
  return rows;
})();

// Real length of the fight act; the dawn act starts exactly here.
export const FIGHT_TS_END = fightTs(FIGHT.end);
T.dawn = +(T.fight + FIGHT_TS_END).toFixed(4); // ≈ 60.73

// shot-local real time → world g (freeze windows return the stop's g).
export function warp(ts) {
  const rows = TABLE;
  if (ts <= 0) return 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].ts >= ts) {
      const a = rows[i - 1];
      const b = rows[i];
      const u = (ts - a.ts) / Math.max(1e-9, b.ts - a.ts);
      return a.g + (b.g - a.g) * u;
    }
  }
  return rows[rows.length - 1].g;
}

// world g → shot-local real time. A stop's freeze starts exactly at its g.
export function fightTs(g) {
  const rows = TABLE;
  if (g <= 0) return 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].g >= g) {
      const a = rows[i - 1];
      const b = rows[i];
      const u = (g - a.g) / Math.max(1e-9, b.g - a.g);
      return a.ts + (b.ts - a.ts) * u;
    }
  }
  return rows[rows.length - 1].ts;
}

// world g → absolute film time
export function fightFilmT(g) {
  return T.fight + fightTs(g);
}

export const SHOTS = [
  ["street", T.street, T.office],
  ["office", T.office, T.trail],
  ["trail", T.trail, T.club],
  ["club", T.club, T.fight],
  ["fight", T.fight, T.dawn],
  ["dawn", T.dawn, T.end],
];

// Hero x across the fight (world g), 1920-space. Analytic, no state.
export function heroX(g) {
  if (g < 0.2) return 240 + g * 60;
  if (g < 1.2) return 276 + ez(g, 1.2, 0.2) * 210; // walking in
  if (g < 1.55) return 486 + ez(g, 1.55, 1.2) * 60;
  if (g < 1.8) return 546 + ez(g, 1.8, 1.55) * 40; // brace for the bat
  if (g < 2.3) return 586 + ez(g, 2.3, 1.8) * 24;
  if (g < 4.2) return 610 + ez(g, 4.2, 2.3) * 150; // stalk toward the Baron
  if (g < 4.6) return 760 + ez(g, 4.6, 4.2) * 190; // dash!
  if (g < 5.4) return 950 + ez(g, 5.4, 4.6) * 40; // through the clash
  if (g < 6.4) return 990 + ez(g, 6.4, 5.4) * 60;
  return 1050;
}
// smoothstep progress of t between a and b (timeline stays import-order pure)
function ez(t, b, a) {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
}
