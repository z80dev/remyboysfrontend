// THE LORD OF THE FLOW — a Remy Boys epic. Single source of timing truth for picture, captions and score.
// 90 s at 80 BPM: bar = 3.0 s, half-bar = 1.5 s — every cut sits on the half-bar grid (30 bars).
//
// UNITS
//   abs  = film seconds, [0, 90). What captions, FLASHES, SHAKES and the score use.
//   g    = shot-local world seconds (what shot art animates in). For 1x shots: abs = T.<shot> + g.
//   Warped shots (hit-stop / slow-mo) map g ↔ lt through BRIDGE_CLOCK / CRATER_CLOCK (below):
//     bridgeStand : lt 0.0–3.0  (clock t0 = 42)          — staff-slam hit-stop
//     theFall     : lt 3.0–6.0  → BRIDGE_CLOCK.warp(lt + 3)   — Grandflo-fall slow-mo
//     theLunge    : lt 0.0–3.0  (clock t0 = 63)          — Golbald-lunge hit-stop + razor-fall slow-mo
//   SCORE_ABS precomputes every warped hit in abs so score.js never re-derives numbers.
//
// CONSUMERS: film.js (T/SHOTS, CAST/PAL, COPY, CAPTIONS, CAPTION_STYLES, FLASHES, SHAKES, GRID, clocks)
//            score.js (BPM/BAR, T, EV, SCORE_ABS, clocks). No imports — pure data + pure functions.

export const BPM = 80;
export const B = 60 / BPM; // 0.75 s beat
export const BAR = B * 4; // 3.0 s bar
export const HALF = BAR / 2; // 1.5 s half-bar — the cut grid
export const DURATION = 90; // 30 bars exactly
export const LW = 960, LH = 540; // pixel world stage, blitted 2× nearest to 1920×1080
export const GRID = { bar: 1.5 }; // film.js `grid`: every cut within half a 60 fps frame of a 1.5 s line

// ---- shot table (t0 on the 1.5 s half-bar grid; 28 shots, 0→90, contiguous) ---------------------
// Bar n spans [3(n-1), 3n). Section rebalances vs the BRIEF bar map (reasoned, every beat kept):
//   · fallPlate grows to 4.5 s (bars 4–5a) so the ring-legend caption gets a ≥3 s full hold;
//     The Shear therefore starts at 13.5 (bar 5b) instead of 12.
//   · rescue grows to 4.5 s (bars 25–26a) for the "THE FLOW IS COMING" hold; the Return then
//     compresses to bars 26b–28 (76.5–84) — both its beats (golden reprise, embrace) keep ≥4.5 s.
export const T = {
  mistTitle: 0, // bars 1–2   — black → drifting mist, gold serif main title settles
  forgePlate: 6, // bar 3a    — plate I: sparks of the forging (silhouette anvil), Ken Burns
  hordePlate: 7.5, // bar 3b  — plate II: the Cabald horde marching, dust, drums
  fallPlate: 9, // bars 4–5a  — plate III: a hairy kingdom's banners falling (long mournful push)
  shearDay: 13.5, // bars 5b–6a — The Shear: golden pastoral, round doors, laundry lines of combs
  shearNight: 16.5, // bars 6b–7 — night cut: GRANDFLO holds the dug-up Razor to the light, glint
  assembly: 21, // bar 8      — the six fellowship sprites spaced in the wind
  ridgeWalk: 24, // bars 9–10a — the sunset ridge walk, six silhouettes on the crest, parallax valley
  wraithRidge: 28.5, // bars 10b–11 — Razorwraith shapes on a dark ridge behind; the fellowship quickens
  minesEnter: 33, // bar 12    — gate of the Mines of Mo-Hair-A, torchlight swallowed
  minesHall: 36, // bar 13     — dark halls, torch flicker holes, giant relic combs in niches, dust
  balrogRise: 39, // bar 14    — chasm glow, ember rise, BALDROG ascends and eclipses the torchlight
  bridgeStand: 42, // bar 15  — GRANDFLO plants the staff: "YOU SHALL NOT BALD!" — slam + hit-stop
  theFall: 45, // bar 16      — the bridge cracks, the Baldrog falls, dragging GRANDFLO into the dark
  escapeGrief: 48, // bar 17a — FLOWDO + SAMFLO at the far end; grief beat, near-silence
  ashlands: 49.5, // bar 17b  — grey desat trudge, drifting ash and embers toward the smoking dome
  golbaldRock: 51, // bars 18–19a — GOLBALD skulks on a rock spur above the path, clutching the toupee
  eyeTower: 55.5, // bar 19b  — cut-in: THE EYE atop the Dark Tower swivels its search-beam
  domeClimb: 57, // bar 20    — the climb: embers, wind, taiko pulse building
  craterEdge: 60, // bar 21   — at the crater FLOWDO hesitates; the blade reflects majestic hair
  theLunge: 63, // bar 22     — GOLBALD lunges (hit-stop); struggle; Razor + Golbald tumble (slow-mo)
  meltErupt: 66, // bar 23    — the Razor melts in the lava; ERUPTION
  towersFall: 69, // bar 24a  — the Dark Tower cracks; THE EYE bursts into drifting hair-confetti
  hairify: 70.5, // bar 24b   — across the land Cabald heads sprout hair (the reverse-baldify wave)
  rescue: 72, // bars 25–26a  — FLOWDO stranded on a spire; the Great Eagle of the Flow swoops, carries him off
  shearReturn: 76.5, // bars 26b–27 — The Shear at golden hour, hair blowing; GRANDFLO returns, white glow
  embrace: 81, // bar 28      — FLOWDO and SAMFLO embrace; pastoral reprise resolves
  endCards: 84, // bars 29–30 — "FLOW RESTORED." + gag card + tiny sequel card; final chord decays to 90.0
  end: DURATION,
};

// Ordered shot list (film.js spreads draw/fx over these; bars kept for the treatment cross-check).
export const SHOTS = [
  { name: 'mistTitle', t0: T.mistTitle, t1: T.forgePlate, bars: '1–2' },
  { name: 'forgePlate', t0: T.forgePlate, t1: T.hordePlate, bars: '3a' },
  { name: 'hordePlate', t0: T.hordePlate, t1: T.fallPlate, bars: '3b' },
  { name: 'fallPlate', t0: T.fallPlate, t1: T.shearDay, bars: '4–5a' },
  { name: 'shearDay', t0: T.shearDay, t1: T.shearNight, bars: '5b–6a' },
  { name: 'shearNight', t0: T.shearNight, t1: T.assembly, bars: '6b–7' },
  { name: 'assembly', t0: T.assembly, t1: T.ridgeWalk, bars: '8' },
  { name: 'ridgeWalk', t0: T.ridgeWalk, t1: T.wraithRidge, bars: '9–10a' },
  { name: 'wraithRidge', t0: T.wraithRidge, t1: T.minesEnter, bars: '10b–11' },
  { name: 'minesEnter', t0: T.minesEnter, t1: T.minesHall, bars: '12' },
  { name: 'minesHall', t0: T.minesHall, t1: T.balrogRise, bars: '13' },
  { name: 'balrogRise', t0: T.balrogRise, t1: T.bridgeStand, bars: '14' },
  { name: 'bridgeStand', t0: T.bridgeStand, t1: T.theFall, bars: '15' },
  { name: 'theFall', t0: T.theFall, t1: T.escapeGrief, bars: '16' },
  { name: 'escapeGrief', t0: T.escapeGrief, t1: T.ashlands, bars: '17a' },
  { name: 'ashlands', t0: T.ashlands, t1: T.golbaldRock, bars: '17b' },
  { name: 'golbaldRock', t0: T.golbaldRock, t1: T.eyeTower, bars: '18–19a' },
  { name: 'eyeTower', t0: T.eyeTower, t1: T.domeClimb, bars: '19b' },
  { name: 'domeClimb', t0: T.domeClimb, t1: T.craterEdge, bars: '20' },
  { name: 'craterEdge', t0: T.craterEdge, t1: T.theLunge, bars: '21' },
  { name: 'theLunge', t0: T.theLunge, t1: T.meltErupt, bars: '22' },
  { name: 'meltErupt', t0: T.meltErupt, t1: T.towersFall, bars: '23' },
  { name: 'towersFall', t0: T.towersFall, t1: T.hairify, bars: '24a' },
  { name: 'hairify', t0: T.hairify, t1: T.rescue, bars: '24b' },
  { name: 'rescue', t0: T.rescue, t1: T.shearReturn, bars: '25–26a' },
  { name: 'shearReturn', t0: T.shearReturn, t1: T.embrace, bars: '26b–27' },
  { name: 'embrace', t0: T.embrace, t1: T.endCards, bars: '28' },
  { name: 'endCards', t0: T.endCards, t1: T.end, bars: '29–30' },
];

// ---- cast (CASTING.md, ids verified on contact sheets) ------------------------------------------
export const CAST = {
  FLOWDO: 42, // the carrier — hero, red hair, sword (the One Razor). LOCKED.
  GRANDFLO: 909, // the wizard — longest grey/white flow, navy suit reads as robe
  SAMFLO: 4, // the loyal friend — green shag, striped tee
  ARCHER: 2577, // lithe, longest blonde flow
  AXE: 90, // stocky axe-dwarf — crimson bob, green clan tunic
  WARRIOR: 2531, // broad, black bowl + moustache, black suit (dark-armor vibe)
  GOLBALD: 73, // wretched creature — bald, ratty copper back-fringe (his "precious")
  CHIEF: 5, // Dark Lord SAUBALD's chief Cabald (heard, never seen whole)
  EYE: 1217, // THE EYE — headIcon(heads, 1217, k) at large k atop the Dark Tower
  EAGLE_HEAD: 2577, // the Great Eagle of the Flow — 2577's golden mane at large scale
  HORDE: [159, 1445, 458, 2529, 564, 321, 1161, 908], // 8 clean Cabald, no slogans/props
};

// Palettes from media/quest/art.json rows [skin, hair, shirt] (CASTING.md). Hair hex drives
// glows / motion trails / tinted effects per character.
export const PAL = {
  FLOWDO: { skin: '#d0bdb1', hair: '#893c3b', shirt: '#2d3d49' }, // crimson flow
  GRANDFLO: { skin: '#a17f64', hair: '#6a7674', shirt: '#213543' }, // silver flow → white glow at return
  SAMFLO: { skin: '#685240', hair: '#446e44', shirt: '#9e6664' }, // moss flow
  ARCHER: { skin: '#d1beb2', hair: '#9d8943', shirt: '#8c8a95' }, // copper-blonde flow
  AXE: { skin: '#c0aa98', hair: '#8a3c3c', shirt: '#1e4c38' }, // crimson bob
  WARRIOR: { skin: '#c4b5ab', hair: '#26221f', shirt: '#000000' }, // midnight bowl
  GOLBALD: { skin: '#685240', hair: '#685240', shirt: '#e1b890' }, // bald + ratty copper fringe
  CHIEF: { skin: '#a07e63', hair: '#a07e63', shirt: '#dccc5e' }, // bald, gold soul
  EYE: { skin: '#a07e63', hair: '#a07e63', shirt: '#dad6d3' }, // bald, white gi — the Eye's rim light
};
export const HORDE_PAL = {
  // id: [skin, shirt] — the Cabald are bald; no hair glow.
  159: ['#685240', '#dadad6'], 1445: ['#685240', '#dadad8'], 458: ['#685240', '#000000'],
  2529: ['#d0bcb1', '#211d1a'], 564: ['#c0aa98', '#050407'], 321: ['#c0aa98', '#6d3231'],
  1161: ['#c0aa98', '#062465'], 908: ['#a07f64', '#8a7057'],
};
// BALDROG is fully procedural (no sprite): silhouette + horns + fire cracks + smoke wings + fire whip.
export const BALDROG_PAL = { head: '#1b1210', horn: '#3a2a1c', fire: '#ff7a29', ember: '#ffb347', smoke: '#241a12', eye: '#ffd27a' };
// World hair-gold used by narration type, mist god-rays and the hairify wave.
export const GOLD = { ink: '#e9d49a', deep: '#3a2606', confetti: ['#893c3b', '#9d8943', '#6a7674', '#446e44', '#8a3c3c', '#26221f'] };

// ---- every string the film puts on screen lives here ---------------------------------------------
export const COPY = {
  title: { main: 'THE LORD OF THE FLOW', sub: 'a Remy Boys epic' }, // drawn type, mistTitle (bars 1–2)
  captions: {
    narrAge: 'In the Second Age of Style, the Cabald forged a Master Razor…',
    legendRazor: 'One Razor to shave them all.',
    decree: 'It must be cast into the fires of Mount Dome.',
    shout: 'YOU SHALL NOT BALD!',
    whisper: 'my preciousss flow…',
    coming: 'THE FLOW IS COMING',
    restored: 'FLOW RESTORED.',
    gag: 'No Remys were shaved in the making of this film.\nOne comb was lost.',
  },
  endCards: { sequel: 'THE TWO TOUPEES — probably never' }, // drawn tiny type under the gag caption
};

// ---- caption styles (serif gold; film.js: captionStyles = TL.CAPTION_STYLES) ----------------------
// Coordinates are 1920×1080 overlay space. letterbox is 1 (2.39:1) → bars cover y < 138 / y > 942;
// every y below keeps the measured box inside the visible frame and the 5% title-safe margin.
// NOTE: renderer composes `${weight} ${size}px ${font}` — whisper's 'italic 500' is a valid canvas
// shorthand and gives true italics for the whispered line.
export const CAPTION_STYLES = {
  narr: { font: '"Cormorant Garamond"', size: 38, weight: 600, color: '#efe3c2', align: 'center', x: 960, y: 806, lineHeight: 1.22, track: 0.6, anim: 'fade', in: 0.5, out: 0.5, glow: '#2a1c08', glowBlur: 16 },
  legend: { font: '"Cormorant Garamond"', size: 46, weight: 600, color: '#e9d49a', align: 'center', x: 960, y: 760, track: 2.5, anim: 'fade', in: 0.4, out: 0.4, glow: '#3a2606', glowBlur: 18 },
  shout: { font: '"Cormorant Garamond"', size: 118, weight: 700, color: '#f4e6bd', align: 'center', x: 960, y: 430, track: 4, anim: 'cut', in: 0.1, out: 0.1, glow: '#4a2c08', glowBlur: 30 },
  // whisper sits at GOLBALD's shoulder (spur upper-left; he stages ~x 640–800 in overlay space)
  // so it reads as his line, not the trudging pair's.
  whisper: { font: '"Cormorant Garamond"', size: 27, weight: 'italic 500', color: '#d9cdb4', align: 'center', x: 1105, y: 545, track: 1.5, anim: 'fade', in: 0.4, out: 0.4, glow: '#141008', glowBlur: 10 },
  title: { font: '"Cormorant Garamond"', size: 96, weight: 700, color: '#f0dfae', align: 'center', x: 960, y: 430, track: 10, anim: 'rise', rise: 22, in: 0.3, out: 0.3, glow: '#3a2606', glowBlur: 26 },
  card: { font: '"Cormorant Garamond"', size: 26, weight: 500, color: '#ecdfbd', align: 'center', x: 960, y: 812, lineHeight: 1.5, track: 1.2, anim: 'fade', in: 0.4, out: 0.4, glow: '#171006', glowBlur: 16 },
};

// ---- declarative captions (8 items per the BRIEF; main title + end marks are drawn type in COPY) --
// Lint measures full hold as min(t1 - out, shot.t1) - (t0 + in) inside the caption's own shot.
export const CAPTIONS = [
  // mistTitle 0–6: full hold 1.3 → 5.1 = 3.8 s
  { id: 'narrAge', text: COPY.captions.narrAge, t0: 0.8, t1: 5.6, style: 'narr' },
  // fallPlate 9–13.5: full hold 9.8 → 12.9 = 3.1 s (the legend plays over the banner plate)
  { id: 'legendRazor', text: COPY.captions.legendRazor, t0: 9.4, t1: 13.3, style: 'legend' },
  // shearNight 16.5–21: full hold 17.2 → 20.3 = 3.1 s (lands with the glint at 17.6)
  { id: 'decree', text: COPY.captions.decree, t0: 16.7, t1: 20.8, style: 'narr' },
  // bridgeStand 42–45: full hold 43.3 → 44.85 = 1.55 s. minHold 1.5 (reasoned): a shouted line
  // synced to the staff slam + hit-stop at 43.5 — it holds the rest of the shouted bar, then the
  // crack and the fall take the frame. Sanctioned by the BRIEF ("can be shorter hold via minHold").
  { id: 'shout', text: COPY.captions.shout, t0: 43.2, t1: 44.95, style: 'shout', minHold: 1.5 },
  // golbaldRock 51–55.5: full hold 51.7 → 54.8 = 3.1 s (small italic whisper)
  { id: 'whisper', text: COPY.captions.whisper, t0: 51.3, t1: 55.2, style: 'whisper' },
  // rescue 72–76.5: full hold 72.7 → 75.85 = 3.15 s (title style; eagle already committed at 73.2)
  { id: 'coming', text: COPY.captions.coming, t0: 72.4, t1: 76.15, style: 'title' },
  // endCards 84–90: full hold 84.8 → 88.9 = 4.1 s (stacked above the gag card)
  { id: 'restored', text: COPY.captions.restored, t0: 84.5, t1: 89.2, style: 'title' },
  // endCards 84–90: full hold 85.4 → 88.6 = 3.2 s (two short serif lines under FLOW RESTORED.)
  { id: 'gag', text: COPY.captions.gag, t0: 85.0, t1: 89.0, style: 'card' },
];

// ---- clocks (makeClock verbatim from films/the-shine/timeline.js L44–76; baldzilla L96–127) -------
//   stops: [{ g, d }] freeze world time at g for d real seconds (impact lands at freeze START).
//   rates: [{ from, to, k }] world runs at k× real inside [from, to); 1× elsewhere.
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

// BRIDGE_CLOCK — mines bridge + fall + grief (film 42 → 49.5 = clock lt 0 → 7.5).
//   hit-stop 0.18 s at the staff slam (g 1.5 → abs 43.5); Grandflo/Baldrog fall in 0.45× slow-mo
//   for 1.2 s real (g 3.02 → 3.56 = abs 45.2 → 46.4, i.e. 0.2 s into theFall).
//   theFall draw: BRIDGE_CLOCK.warp(lt + 3); bridgeStand draw: BRIDGE_CLOCK.warp(lt).
export const BRIDGE_CLOCK = makeClock(T.bridgeStand, [{ g: 1.5, d: 0.18 }], [{ from: 3.02, to: 3.56, k: 0.45 }]);

// CRATER_CLOCK — the lunge (film 63 → 66 = clock lt 0 → 3).
//   hit-stop 0.14 s at the lunge (g 0.9 → abs 63.9); razor + Golbald tumble in 0.5× slow-mo for
//   0.9 s real (g 1.8 → 2.25 = abs 64.94 → 65.84), lava splash at abs 65.84.
export const CRATER_CLOCK = makeClock(T.theLunge, [{ g: 0.9, d: 0.14 }], [{ from: 1.8, to: 2.25, k: 0.5 }]);

// ---- per-shot events (g = shot-local world seconds; warped shots note their clock) ----------------
export const TITLE_EV = {
  mistIn: 0.0, // mist starts drifting (abs 0.0)
  titleSettle: 0.9, // main title begins its slow gold settle (abs 0.9)
  subIn: 2.4, // "a Remy Boys epic" (abs 2.4)
  mistThicken: 4.8, // mist thickens toward the plate cut (abs 4.8)
};

export const FORGE_EV = { hammer: 0.5, sparks: [0.2, 0.55, 0.9, 1.25] }; // g in forgePlate (abs 6.2–7.2)

export const HORDE_EV = { marchIn: 0.0, drumStep: 0.75, dustKick: 1.1 }; // g in hordePlate (abs 7.5–8.6)

export const BANNERS_EV = {
  kb: [0.2, 4.2], // Ken Burns window across the long mournful push (abs 9.2–13.2)
  bannerDrop: 0.5, // first banner slips its pole (abs 9.5)
  bannerFall: [0.5, 3.5], // banners sag and fall in waves (abs 9.5–12.5)
  ashTint: 4.0, // colour starts draining toward the Shear cut (abs 13.0)
};

export const SHEAR_DAY_EV = {
  windIn: 0.2, grassWave: 0.6, laundrySway: 1.2, roundDoors: 2.4, // g in shearDay (abs 13.7–15.9)
};

export const SHEAR_NIGHT_EV = {
  digReveal: 0.4, // the dug-up Razor comes out of the earth (abs 16.9)
  glint: 1.1, // blade catches the light — score solo note (abs 17.6)
  raiseRazor: 1.6, // held up to the sky (abs 18.1)
};

export const ASSEMBLY_EV = { lineup: 0.3, gust: 1.5 }; // g in assembly (abs 21.3 / 22.5)

export const RIDGE_EV = {
  stepOff: 0.4, // the six step off together (abs 24.4) — walk cycle phase-locks from here
  sunsetGlow: [1.0, 4.0], // gold hour light window (abs 25.0–28.0)
  crest: 2.2, // reach the crest line, valley parallax full (abs 26.2)
};

export const WRAITH_EV = {
  shapesIn: 1.0, // Razorwraith silhouettes rise on the dark ridge behind (abs 29.5)
  shapesHold: 2.4, // they hold; the fellowship does not see them (abs 30.9)
  purpose: 3.6, // the six quicken, no combat (abs 32.1)
};

export const MINES_ENTER_EV = { gateDark: 0.1, torchSeeds: [0.3, 1.1, 1.9, 2.5] }; // g in minesEnter (abs 33.1–35.5)

export const MINES_HALL_EV = {
  torchFlicker: [0.2, 0.9, 1.6, 2.3], // darkness punch-hole flicker seeds (the-shine flame pattern)
  relicCombs: 0.6, // giant relic combs revealed in niches (abs 36.6)
  dustMotes: 1.2, // analytic motes through the torchlight (abs 37.2)
  distantRumble: 2.6, // first chasm rumble under the floor (abs 38.6)
};

export const BALROG_EV = {
  chasmGlow: 0.4, // firelight rises out of the chasm (abs 39.4)
  emberRise: 0.6, // ember column starts (abs 39.6)
  rise: 0.9, // BALDROG's bald head begins to eclipse the torchlight (abs 39.9)
  eclipse: 2.4, // torchlight fully swallowed (abs 41.4)
  roar: 2.8, // braam + choir cluster, taiko enters (abs 41.8)
};

// g-domain on BRIDGE_CLOCK (bridgeStand = clock lt 0–3; theFall = clock lt 3–6, warp(lt + 3)).
export const BRIDGE_EV = {
  plant: 0.7, // staff plants on the stone (abs 42.7)
  shout: 1.2, // "YOU SHALL NOT BALD!" — caption lands (abs 43.2)
  slam: 1.5, // STAFF SLAM — hit-stop 0.18 s starts here (abs 43.5)
  crack: 1.5, // bridge cracks as the freeze RELEASES (abs = SCORE_ABS.crack = 43.68 = slam abs +
              // stop.d; in the draw, fire it when warp(lt).stop releases, i.e. stop.sl reaches d)
  collapse: 3.02, // chasm collapse — the span under the Baldrog gives way (abs 45.2)
  fall: [3.02, 3.56], // Baldrog + Grandflo fall in 0.45× slow-mo, 1.2 s real (abs 45.2–46.4)
  dragGrip: 3.1, // the fire whip takes Grandflo's ankle (abs 45.38)
  swallowed: 4.1, // both vanish into the dark (abs 46.94)
};

export const ESCAPE_EV = { griefNote: 0.25, dropToKnees: 0.9 }; // plain 1× in escapeGrief (abs 48.25 / 48.9)

export const ASH_EV = { trudge: 0.0, ashThick: 0.4, emberDrift: [0.0, 1.4] }; // g in ashlands (abs 49.5–50.9)

export const GOLBALD_EV = {
  skulk: 0.0, // on the rock spur above the path (abs 51.0)
  whisper: 0.3, // "my preciousss flow…" — caption lands (abs 51.3)
  peek: 0.9, // leans over the edge, watching the Razor (abs 51.9)
  clutch: 2.0, // clutches the tiny toupee to his scalp (abs 53.0)
  skulkOff: 4.2, // scuttles along the spur, shadowing the pair (abs 55.2)
};

export const EYE_EV = { swivel: 0.2, beam: 0.5, sweepEnd: 1.4 }; // g in eyeTower (abs 55.7–56.9)

export const CLIMB_EV = {
  emberSeeds: [0.3, 1.1, 1.9], gust: 0.8, stepPulse: 1.2, windPeak: 2.4, // g in domeClimb (abs 57.3–59.4)
};

export const CRATER_EV = {
  rimArrive: 0.8, // FLOWDO + SAMFLO reach the crater rim (abs 60.8)
  hesitation: 1.2, // FLOWDO stops; the Razor wavers (abs 61.2)
  reflection: [1.8, 2.7], // temptation beat: blade reflects impossible majestic hair (abs 61.8–62.7)
};

// g-domain on CRATER_CLOCK (theLunge = clock lt 0–3).
export const LUNGE_EV = {
  lunge: 0.9, // GOLBALD lunges — hit-stop 0.14 s starts (abs 63.9)
  struggle: 1.1, // grappling on the rim (abs 64.24)
  grab: 1.8, // Golbald's hands close on the Razor + FLOWDO (abs 64.94)
  tumble: [1.8, 2.25], // razor-fall slow-mo 0.5×, 0.9 s real (abs 64.94–65.84)
  splash: 2.25, // lava splash — both hit the melt (abs 65.84)
};

export const MELT_EV = { melt: 0.4, erupt: 1.5, bursts: [1.5, 2.3], glowPeak: 2.6 }; // plain 1× in meltErupt (abs 66.4–68.6)

export const TOWERS_EV = { crumble: 0.1, eyeBurst: 0.6, confetti: 0.7 }; // plain 1× in towersFall (abs 69.1–69.7)

export const HAIRIFY_EV = {
  wavefront: [0.0, 1.2], // reverse-baldify wave sweeps the land (abs 70.5–71.7)
  bursts: [0.2, 0.6, 1.0], // hair bursts on near-field Cabald heads (abs 70.7 / 71.1 / 71.5)
};

export const RESCUE_EV = {
  strand: 0.2, // FLOWDO stranded on the rock spire, lava around (abs 72.2)
  swoop: 1.2, // the Great Eagle of the Flow commits to the dive (abs 73.2)
  grab: 2.4, // talons close on his shoulders (abs 74.4)
  lift: 3.0, // up and away over the caldera (abs 75.0)
  exit: 4.2, // exits frame toward the Shear (abs 76.2)
};

export const RETURN_EV = {
  goldenHour: 0.0, // The Shear at golden hour, everyone's hair blowing (abs 76.5)
  grandfloReturn: 1.0, // GRANDFLO back, staff raised, white glow — "I fell to a lower shelf." (abs 77.5)
  staffRaise: 2.4, // staff high, white glow peak (abs 78.9)
};

export const EMBRACE_EV = { approach: 0.4, embrace: 1.2, hold: 2.0 }; // g in embrace (abs 81.4–83.0)

export const END_EV = {
  restored: 0.5, gag: 1.0, sequel: 2.0, // card lands (abs 84.5 / 85.0 / 86.0)
  fade: [4.6, 6.0], // fade to black; the final chord decays exactly to 90.0 (abs 88.6–90.0)
};

// ---- score hit table (abs film seconds; warped values derived through the clocks, never re-typed) -
export const SCORE_ABS = {
  choirIn: T.mistTitle + TITLE_EV.mistIn + 0.2, // 0.2  low choir + horn over drone
  titleLand: T.mistTitle + TITLE_EV.titleSettle, // 0.9
  forgeSparks: T.forgePlate + FORGE_EV.sparks[0], // 6.2
  hordeDrums: T.hordePlate + HORDE_EV.marchIn, // 7.5
  bannersFall: T.fallPlate + BANNERS_EV.bannerDrop, // 9.5
  shearTheme: T.shearDay + SHEAR_DAY_EV.windIn, // 13.7 — the FLOW THEME (pastoral), returns at 76.5
  nightSolo: T.shearNight + SHEAR_NIGHT_EV.digReveal, // 16.9
  glint: T.shearNight + SHEAR_NIGHT_EV.glint, // 17.6
  fellowshipHorns: T.assembly + ASSEMBLY_EV.lineup, // 21.3 — horn-call A–B phrase
  marchStep: T.ridgeWalk + RIDGE_EV.stepOff, // 24.4
  wraithSting: T.wraithRidge + WRAITH_EV.shapesIn, // 29.5
  minesDrone: T.minesEnter + MINES_ENTER_EV.gateDark, // 33.1 — sparse drone + heartbeat
  rumble: T.minesHall + MINES_HALL_EV.distantRumble, // 38.6
  braam: T.balrogRise + BALROG_EV.roar, // 41.8 — braam + taiko + choir cluster; riser from here
  slam: BRIDGE_CLOCK.abs(BRIDGE_EV.slam), // 43.5 — the slam lands ON the hit-stop
  crack: BRIDGE_CLOCK.abs(BRIDGE_EV.slam) + BRIDGE_CLOCK.stops[0].d, // 43.68 — staff crack SFX at freeze release
  collapse: BRIDGE_CLOCK.abs(BRIDGE_EV.collapse), // 45.2 — chasm collapse
  fallSlow: BRIDGE_EV.fall.map(BRIDGE_CLOCK.abs), // [45.2, 46.4] — 0.45× window
  grief: T.escapeGrief + ESCAPE_EV.griefNote, // 48.25 — solo string note, near-silence
  ashSub: T.ashlands + ASH_EV.ashThick, // 49.9 — sub drone + wind + whisper texture
  whisperCue: T.golbaldRock + GOLBALD_EV.whisper, // 51.3
  eyeSwivel: T.eyeTower + EYE_EV.swivel, // 55.7
  taikoIn: T.domeClimb + CLIMB_EV.gust, // 57.8 — taiko pulse + low ostinato building
  lunge: CRATER_CLOCK.abs(LUNGE_EV.lunge), // 63.9 — hit-stop 0.14 s
  tumbleSlow: LUNGE_EV.tumble.map(CRATER_CLOCK.abs), // [64.94, 65.84] — 0.5× window
  splash: CRATER_CLOCK.abs(LUNGE_EV.splash), // 65.84 — lava splash SFX
  melt: T.meltErupt + MELT_EV.melt, // 66.4
  erupt: T.meltErupt + MELT_EV.erupt, // 67.5 — full tutti + impact + choir
  crumble: T.towersFall + TOWERS_EV.crumble, // 69.1 — tower crumble SFX
  eyeBurst: T.towersFall + TOWERS_EV.eyeBurst, // 69.6
  hairifyIn: T.hairify + HAIRIFY_EV.wavefront[0], // 70.5
  rescueTheme: T.rescue, // 72.0 — the FLOW THEME erupts major and warm
  swoop: T.rescue + RESCUE_EV.swoop, // 73.2
  grab: T.rescue + RESCUE_EV.grab, // 74.4
  returnTheme: T.shearReturn, // 76.5 — pastoral reprise, resolved
  grandfloGlow: T.shearReturn + RETURN_EV.grandfloReturn, // 77.5
  embrace: T.embrace + EMBRACE_EV.embrace, // 82.2
  finalChord: T.endCards, // 84.0 — resolve; decays exactly to 90.0
};

// ---- flashes: [abs t, peak, decay] — peaks ≤ .3, decay ≤ .2 (grey-soup rule on dark scenes) --------
export const FLASHES = [
  [SCORE_ABS.slam, 0.22, 0.16], // staff slam crack
  [SCORE_ABS.collapse, 0.14, 0.2], // chasm collapse glow
  [SCORE_ABS.splash, 0.2, 0.16], // lava splash
  [SCORE_ABS.erupt, 0.3, 0.2], // the eruption
  [SCORE_ABS.eyeBurst, 0.26, 0.18], // the Eye bursts
  [SCORE_ABS.grab, 0.12, 0.12], // rescue grab sparkle
  [SCORE_ABS.grandfloGlow, 0.1, 0.2], // soft white lift on the return
];

// ---- camera-shake windows: [abs t, amp, decay] (overscan-safe: repaint beyond stage edges) ---------
export const SHAKES = [
  [SCORE_ABS.slam, 7, 7], // staff slam
  [SCORE_ABS.collapse, 6, 7], // bridge span gives way
  [SCORE_ABS.lunge, 5, 6], // the lunge
  [SCORE_ABS.splash, 5, 6], // lava splash
  [SCORE_ABS.erupt, 8, 7], // eruption
  [SCORE_ABS.crumble, 5, 6], // the Dark Tower cracks
  [SCORE_ABS.eyeBurst, 6, 6], // the Eye bursts
  [SCORE_ABS.grab, 3, 5], // eagle talons
];
