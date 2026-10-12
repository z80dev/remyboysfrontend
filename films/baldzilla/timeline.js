// BALDZILLA — a Remy Boys monster movie. 90 s.
// Shot map, cast and g-domain event clocks (hit-stop + slow-mo) shared by film.js AND score.js.
export const DUR = 90;
export const LW = 960, LH = 540; // pixel world stage, blitted 2× nearest to 1920×1080

export const T = {
  sea: 0, news: 14, rampage: 28, lab: 48, battle: 62, dawn: 78, end: 90,
};

// Cast (chosen from inspected contact sheets, output/_contact/orig-casting-balldzilla.png):
export const CAST = {
  KAIJU: 347,  // the Dome — black tee with red flame hem, heavy scowl. THE monster.
  HERO: 42,    // Crimson — red hair, katana.
  BAND: [42, 30, 46, 1000, 4], // Crimson, Platina, Silver, Cobalt, Moss
  ANCHOR: 6,   // RNN desk — paisley bandana, literally holds a mic in his original render.
};

export const NAMES = {
  42: ['CRIMSON', 'LEAD · KATANA'],
  30: ['PLATINA', 'TONIC CHEMIST'],
  46: ['SILVER', 'BALLISTICS'],
  1000: ['COBALT', 'LOADER'],
  4: ['MOSS', 'TRIGGER'],
};

// ---- act I: the sea -----------------------------------------------------------
export const SEA = {
  ripples: 4.6,   // rings spread from a point off-frame
  breach: 7.2,    // the dome surfaces; water sheets off; flash + thunder
  roar: 8.8,      // silhouette bellow (audio-led; boat lurches)
  flee: 9.4,      // fishing boat runs for harbour (exits right ~11.0)
  title: 11.2,    // BALDZILLA slams over black swells
  kicker: 11.7,   // "A REMY BOYS MONSTER MOVIE"
};

// ---- act II: the news ---------------------------------------------------------
export const NEWS = {
  deskA: 14, footage: 18.5, deskB: 22.5,
  siren: 24.0,    // air-raid siren rises under desk B, carries into the rampage
  ticker: 'SEA LEVEL RISING · HAIR LEVELS CRITICAL · BARBERS EVACUATED · WIG STOCKS SOAR · MAYOR DENIES SHINE RAY · ',
};

// ---- act III: the rampage (g = shot-local world time) --------------------------
// Footfall freezes land at the START of each stop (the-shine convention).
export const RAMP = {
  stops: [{ g: 2.9, d: 0.16 }, { g: 4.3, d: 0.16 }, { g: 13.4, d: 0.12 }],
  rates: [{ from: 13.55, to: 14.85, k: 0.6 }], // building + jet die slowly in the beam sweep
  footA: 2.9, footB: 4.3,        // wide + street-level slams
  tanks: [8.6, 9.4, 10.2],       // volley times (tracers arc to the monster, puffs)
  dustOff: 11.0,                 // monster brushes shells off its shoulder, unimpressed
  charge: 11.5,                  // dome gleam charges (visible for ~1.7 s before the ray)
  beam: 13.2,                    // POLISH RAY fires, sweeps right
  beamHit: 13.4,                 // gleam flash + tower crumbles (stop), slow-mo window after
  jetHit: 14.2,                  // patrol jet caught in the sweep, tumbles down smoking
  sweepEnd: 14.6,
  heroWide: 17.0,                // squad silhouetted on a rooftop edge, embers, resolve
};

// ---- act IV: the plan ---------------------------------------------------------
export const LAB = {
  blueprint: [48.6, 52.0],       // FLOW CANNON MK-I lines draw themselves in
  cards: [52.4, 57.4],           // five member cards pop (stagger 0.5 inside art)
  convoy: 57.4,                  // dusk convoy roll out
  stamp: 60.6,                   // PROJECT REGROWTH stamp
};

// ---- act V: the battle (g = shot-local world time) ----------------------------
export const BATTLE = {
  stops: [{ g: 6.0, d: 0.16 }, { g: 8.6, d: 0.22 }], // katana strike / tonic shell impact
  charge: 0.8,                   // dome gleam charges (eyes glow)
  beam: 2.6,                     // ray rakes the rooftop
  parry: 3.4,                    // Crimson deflects, spark bell
  leap: 5.0,                     // Crimson leaps from the roof edge
  strike: 6.0,                   // katana hits the dome (STOP 1) — gleam cracks
  cannonFire: 7.4,               // FLOW CANNON launches the tonic glob
  shellHit: 8.6,                 // glob bursts on the monster's chest (STOP 2)
  grow: [9.0, 9.8, 10.6],        // the mane erupts in three surges
  stagger: 9.2,                  // ray dies; monster reels back
  bow: 11.4,                     // monster kneels toward the rooftop
};

// ---- act VI: the dawn ---------------------------------------------------------
export const DAWN = {
  nod: 80.0,                     // Crimson nods. It's over.
  turn: 81.5,                    // the monster turns to the open sea
  away: [82.0, 86.4],            // wades out toward the sun, mane on the wind
  endcard: 86.6,
  fade: 88.7,
};

// ---- clocks -------------------------------------------------------------------
// makeClock: piecewise world time g vs shot-local real time lt (the-shine implementation).
//   stops: [{g,d}] freeze world time at g for d real seconds (impact lands at freeze START).
//   rates: [{from,to,k}] world runs at k× real (0.6 = gentle slow-mo) inside [from,to); 1× elsewhere.
//   No stop may sit inside a rate window.
export function makeClock(t0, stops = [], rates = []) {
  const pts = [0];
  for (const r of rates) pts.push(r.from, r.to);
  for (const s of stops) pts.push(s.g);
  pts.sort((a, b) => a - b);
  const G = [...new Set(pts.filter((p) => p >= 0))].filter((p, i, a) => i === 0 || p > a[i - 1]);
  const rateAt = (g) => { for (const r of rates) if (g >= r.from && g < r.to) return r.k; return 1; };
  const stopAt = (g) => { for (const s of stops) if (Math.abs(s.g - g) < 1e-9) return s; return null; };
  const segs = [];
  for (let i = 0; i < G.length; i++) segs.push({ g0: G[i], g1: i + 1 < G.length ? G[i + 1] : Infinity, k: rateAt(G[i]) });
  const warp = (lt) => {
    let rem = lt;
    for (const s of segs) {
      const span = (s.g1 - s.g0) / s.k;
      if (rem < span) return { g: s.g0 + rem * s.k, stop: null, sl: 0 };
      rem -= span;
      const st = stopAt(s.g1);
      if (st) { if (rem < st.d) return { g: s.g1, stop: st, sl: rem }; rem -= st.d; }
    }
    return { g: segs[segs.length - 1].g0 + rem, stop: null, sl: 0 };
  };
  const filmT = (g) => {
    let t = 0;
    for (const s of segs) {
      if (g <= s.g1 + 1e-9) return t + (g - s.g0) / s.k;
      t += (s.g1 - s.g0) / s.k;
      const st = stopAt(s.g1);
      if (st && g > s.g1 + 1e-9) t += st.d;
    }
    return t;
  };
  return { t0, stops, rates, warp, filmT, abs: (g) => t0 + filmT(g) };
}

export const RAMP_CLOCK = makeClock(T.rampage, RAMP.stops, RAMP.rates);
export const BATTLE_CLOCK = makeClock(T.battle, BATTLE.stops, []);

// Camera-shake windows for the picture (abs time): [t0, amp, decay]
export const SHAKES = [
  [T.sea + SEA.breach, 7, 7],
  [T.sea + SEA.roar, 3.5, 6],
  [RAMP_CLOCK.abs(RAMP.footA), 6, 7],
  [RAMP_CLOCK.abs(RAMP.footB), 5.5, 7],
  [RAMP_CLOCK.abs(RAMP.beamHit), 6, 7],
  [BATTLE_CLOCK.abs(BATTLE.beam), 3, 6],
  [BATTLE_CLOCK.abs(BATTLE.strike), 6.5, 7],
  [BATTLE_CLOCK.abs(BATTLE.shellHit), 7, 6],
  [BATTLE_CLOCK.abs(BATTLE.grow[2]), 4, 5],
];

// Lightning/flare table (abs t, peak, decay). Peaks ≤ .34, decay ≤ .2 on dark scenes.
export const FLASHES = [
  [T.sea + SEA.breach + 0.2, 0.24, 0.15],
  [T.sea + SEA.title, 0.14, 0.12],
  [T.rampage + 0.2, 0.0, 0], // placeholder keeps indices stable; zero = no-op
  [RAMP_CLOCK.abs(RAMP.beam), 0.2, 0.14],
  [RAMP_CLOCK.abs(RAMP.beamHit), 0.3, 0.2],
  [BATTLE_CLOCK.abs(BATTLE.strike), 0.3, 0.16],
  [BATTLE_CLOCK.abs(BATTLE.shellHit), 0.28, 0.2],
  [BATTLE_CLOCK.abs(BATTLE.grow[0]), 0.12, 0.16],
  [BATTLE_CLOCK.abs(BATTLE.grow[1]), 0.13, 0.16],
  [BATTLE_CLOCK.abs(BATTLE.grow[2]), 0.16, 0.18],
].filter((f) => f[1] > 0);
