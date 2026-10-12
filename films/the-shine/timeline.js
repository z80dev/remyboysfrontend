// THE SHINE — a Remy Boys horror story. 77 s.
// Shot map, cast, g-domain event clocks (hit-stop + slow-mo) shared by film.js AND score.js.
export const DURATION = 77;
export const LW = 960, LH = 540; // pixel world stage, blitted 2× nearest to 1920×1080

export const T = {
  storm: 0, hall: 10, barber: 21, stalk: 32, match: 43, chase: 50, mirror: 62, title: 72, end: 77,
};

// Cast chosen from inspected contact sheets (output/_contact/cast-*.png):
export const CAST = {
  HERO: 42,   // Crimson Flow — red hair, slate tee. NOT bald (hero).
  LEAD: 468,  // Midnight Soul — pale skin d0bdb2, black wraparound shades, black tee. The face in the dark.
  TWIN_A: 690, // Copper Soul — pale, mustard tee (left twin)
  TWIN_B: 704, // Copper Soul — identical silhouette (right twin)
  CHASE_A: 347, // Midnight Soul — dark skin, black flame-hem tee
  CHASE_B: 159, // Pearl Soul — white/gold cassock silhouette
};
// Palette rows from media/quest/art.json (used by the bald-reflection repaint):
export const HERO_PAL = { skin: '#d0bdb1', hair: '#893c3b', shirt: '#2d3d49' };

// Corridor wall portraits (hairy ancestors, 600×600 originals).
export const PORTRAITS = [30, 46, 1000];

// Lightning / flares: [abs t, peak, decay]. Peaks ≤ .3, decay ≤ .2 (grey-soup rule on dark scenes).
export const FLASHES = [
  [2.2, 0.26, 0.2], [2.42, 0.16, 0.12], // double strobe
  [4.6, 0.24, 0.15], [4.8, 0.14, 0.1],
  [6.9, 0.28, 0.17],
  [19.1, 0.22, 0.14], // corridor silhouette
  [31.0, 0.26, 0.16], [31.22, 0.15, 0.11], // barber ghost-mirror
  [46.5, 0.22, 0.2],  // match strike flare
  [50.4, 0.2, 0.14], [51.2, 0.18, 0.14], [52.6, 0.2, 0.14], // chase strobes (storm inside now)
  [54.0, 0.18, 0.14], [55.5, 0.22, 0.14], [58.0, 0.2, 0.14], [59.3, 0.24, 0.14],
  [67.5, 0.28, 0.17], // mirror flash 1
  [69.4, 0.26, 0.16], // mirror flash 2
];

// ---- clocks ------------------------------------------------------------------
// makeClock: piecewise world time g vs shot-local real time lt.
//   stops: [{g, d}] freeze world time at g for d real seconds (impact lands at freeze START).
//   rates: [{from, to, k}] world runs at k× real (0.5 = slow-mo) inside [from,to); 1× elsewhere.
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
  const filmT = (g) => { // g → shot-local real lt
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

// ---- per-shot events (g = shot-local world time) ------------------------------
export const HALL = {
  enter: 0, pause: 6.4, resume: 7.6, figure: 8.6, figureGone: 9.3, // figure: lightning silhouette at corridor end
};

export const BARBER = {
  doorShut: 0.6, walkIn: 0.2, stopX: 6.4, gram: 3.0, etch: [5.4, 7.0], touch: 7.6, ghost: [9.6, 10.6],
};

export const STALK = {
  twins: [2.0, 3.5],      // standing ahead of the hero (fixed corridor x below), gone after a flicker
  twinX: [1510, 1640],    // fixed at window open: heroX(2.0)=1890, camera 1470 → twins land on screen
  snuff: [5.0, 5.8, 6.6, 7.4, 8.2], // sconces die right→left, darkness walks toward hero
  whisper: 9.0,
};

export const MATCH = {
  gust: 0.5,              // candle blown out
  rattle: [1.6, 2.1, 2.6, 3.0], // matchbox shakes (spark flashes)
  strike: 3.5,            // flare + reveal + freeze
  bolt: 5.2,              // hero bolts left
};
export const MATCH_CLOCK = makeClock(T.match, [{ g: MATCH.strike, d: 0.3 }]);

// Chase runs LEFT (hero flees toward the corridor's left-end door).
// g math: 0→5.6 at 1×; 5.6→6.6 slide at 0.5× (2.0 real); 6.6→8.8 at 1×; freeze .22 at 8.8; tail → real 12.
// Spawns tuned so chasers loom ~20–40 px behind the hero and just catch him at the door.
export const CHASE_EV = {
  burstA: 1.9,        // door 1800 bursts, 347 out (90 px behind hero, 8 px/s faster)
  burstB: 3.6,        // door 1180 bursts, 159 steps out; chases from 4.35 at 244 px/s
  chaseB: 4.35,
  twins: 5.0,         // twins visible ahead
  slide0: 5.6, slide1: 6.6, // low slide through the twin gap (slow-mo window)
  razor: 6.5,         // razor leaves 347's hand, whistles over the slide
  stick: 7.0,         // razor buries into the wall ahead
  doorHit: 8.6,       // shoulder hits the left-end door, bursts through
  slam: 8.8,          // door SLAMS (freeze)
  thunk: [9.6, 10.05, 10.5], // razors punch through the door beside hero's head
};
export const CHASE_CLOCK = makeClock(
  T.chase,
  [{ g: CHASE_EV.slam, d: 0.22 }],
  [{ from: CHASE_EV.slide0, to: CHASE_EV.slide1, k: 0.5 }],
);

export const MIRROR_EV = {
  look: 2.0, approach: 3.2, touch: 4.5, relief: 5.2,
  flash1: 5.5, recoil: 5.9, back: 6.5,
  flash2: 7.4, matchDie: 7.8, grin0: 8.2, grin1: 9.6, smash: 9.6, black: 9.7,
};

export const TITLE_EV = {
  crackle: 0.6, titleIn: 0.8, subIn: 2.2, dateIn: 3.0,
  portrait: 3.3, swap: 4.1, fade: [4.9, 5.0],
};
