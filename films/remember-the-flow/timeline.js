// REMEMBER THE FLOW — a Remy Boys documentary. Timing truth for picture, captions and score.
// 78 s at 80 BPM: bar = 3 s, beat = 0.75 s, half-bar = 1.5 s — every shot boundary sits on the
// half-bar grid (26 bars). Two registers: PRESENT (smooth 1080p) and ARCHIVAL (960×540 stage,
// nearest 2×, time-stepped at 12 fps via step12). One hit-stop clock on the final clash.

export const BPM = 80;
export const B = 60 / BPM;        // 0.75 s beat
export const BAR = B * 4;         // 3.0 s bar
export const HALF = BAR / 2;      // 1.5 s half-bar — the shot-boundary grid
export const DURATION = 78;       // 26 bars exactly

// ---- cast (CASTING.md: contact sheets read + quest-bald.json + art.json epithets verified) ----
export const CAST = {
  HERO: 42,        // "Crimson Flow" — canon protagonist; plays the veteran too (aged styling, dimmer palette)
  HERO_ALT: 109,   // "Crimson Flow" fallback — tight close-ups only, no sword, minimal screen time
  BOSS: 1217,      // "Pearl Soul" — Cabald boss, white gi; the propaganda poster original
  SQUAD: [129, 321, 389, 585], // "Midnight Soul" / "Crimson Soul" / "Pearl Soul" / "Cobalt Soul" — occupation march + clash
                                 // NOTE (casting): 321 must never share a frame with 42/109.
  GA: [30, 2531, 2577], // golden-age portraits: "Copper Flow" the Financier / "Midnight Crown" the Magnate / "Copper Flow" the Poet-Heir
  CUTAWAY: 70,     // "Aqua Flow" — second talking head, katana at shoulder (chest-up framing only)
  VILLAGERS: [2577, 70], // the two hat-brim villagers reuse GA3 + cutaway ids
};

// ---- shot table (t0 on the 1.5 s half-bar grid; 16 shots, 0→78) ----
// Director's edit (integration pass): brand moved 74 → 73.5 so EVERY boundary sits on the
// half-bar grid and lint's grid check passes clean; brandLand/studioMark shift with it.
// No score event sits on the cut (70.5–78 stays one continuous motif-restatement phrase).
export const T = {
  coldopen: 0,     // present — dark interview room, slow push-in on the VETERAN, first bite
  title: 7.5,      // present — film-leader flicker, countdown ghost, main title + sub
  ch1card: 12,     // present — "CHAPTER I — THE AGE OF FLOW"
  ch1a: 15,        // archival — sepia portrait GA[0] in museum mount, Ken Burns push
  ch1b: 19.5,      // archival — regiment photo GA[1] + GA[2] + hero, lateral pan
  ch2card: 24,     // present — "CHAPTER II — THE RAZOR COMES", grade turns colder
  ch2a: 27,        // archival — CABALD propaganda poster (BOSS), camera tilts up
  ch2b: 31.5,      // archival — THE WAR MAP: washes, arrows, refugees (3-act micro-story)
  ch2c: 39,        // archival — occupation reenactment: SQUAD marches a village street
  ch3card: 43.5,   // present — "CHAPTER III — THE REGROWTH"
  ch3a: 46.5,      // archival — muster: greatsword draw, column step-off, banner unfurl
  ch3b: 51,        // archival — the clash: charge, parries, hit-stop, topples, banner drop
  veteran: 55.5,   // present — interview wide→medium, second bite, the almost-smile
  memorial: 63,    // present — dawn wall of tiny heads, hero's head lights at 67.2
  endcard: 70.5,   // present — "IN MEMORY OF EVERY STRAND LOST"
  brand: 73.5,     // present — "THE FLOW REMEMBERS." + studio mark, fade to black
  end: DURATION,
};
export const SHOTS = [
  { name: 'coldopen', t0: T.coldopen, t1: T.title,    register: 'present' },
  { name: 'title',    t0: T.title,    t1: T.ch1card,  register: 'present' },
  { name: 'ch1card',  t0: T.ch1card,  t1: T.ch1a,     register: 'present' },
  { name: 'ch1a',     t0: T.ch1a,     t1: T.ch1b,     register: 'archival' },
  { name: 'ch1b',     t0: T.ch1b,     t1: T.ch2card,  register: 'archival' },
  { name: 'ch2card',  t0: T.ch2card,  t1: T.ch2a,     register: 'present' },
  { name: 'ch2a',     t0: T.ch2a,     t1: T.ch2b,     register: 'archival' },
  { name: 'ch2b',     t0: T.ch2b,     t1: T.ch2c,     register: 'archival' },
  { name: 'ch2c',     t0: T.ch2c,     t1: T.ch3card,  register: 'archival' },
  { name: 'ch3card',  t0: T.ch3card,  t1: T.ch3a,     register: 'present' },
  { name: 'ch3a',     t0: T.ch3a,     t1: T.ch3b,     register: 'archival' },
  { name: 'ch3b',     t0: T.ch3b,     t1: T.veteran,  register: 'archival' },
  { name: 'veteran',  t0: T.veteran,  t1: T.memorial, register: 'present' },
  { name: 'memorial', t0: T.memorial, t1: T.endcard,  register: 'present' },
  { name: 'endcard',  t0: T.endcard,  t1: T.brand,    register: 'present' },
  { name: 'brand',    t0: T.brand,    t1: T.end,      register: 'present' },
];

// ---- archival 12 fps time-stepper: sample world time at floor(t*12)/12 (pure) ----
export function step12(t) {
  return Math.floor(t * 12) / 12;
}

// ---- hit-stop clock for the clash: world freezes 0.22 s on the final clash ----
// warp(lt) maps local time (seconds since t0) → { g, stop, sl }; filmT(g) maps g-domain → film time.
export function makeClock(t0, stops) {
  return {
    t0,
    stops,
    warp(lt) {
      let acc = 0;
      for (const s of stops) {
        const rs = s.g + acc;
        if (lt < rs) return { g: lt - acc, stop: null, sl: 0 };
        if (lt < rs + s.d) return { g: s.g, stop: s, sl: lt - rs };
        acc += s.d;
      }
      return { g: lt - acc, stop: null, sl: 0 };
    },
    filmT(g) {
      let acc = 0;
      for (const s of stops) if (s.g < g) acc += s.d;
      return t0 + g + acc;
    },
  };
}
export const CLASH_CLOCK = makeClock(T.ch3b, [{ g: 2.6, d: 0.22 }]); // final clash at g 2.6 → film 53.60

// ---- map gazetteer (label strings + road-path endpoint keys for REFUGEES) ----
export const PLACES = {
  hairline: 'HAIRLINE',
  gap: 'TONSURA GAP',
  parting: 'MAIN PARTING',
  follicle: 'ST. FOLLICLE',
  coast: 'THE SOUTH COAST',
};

// ---- refugee columns: dispatch when their home is threatened, flee north along roads ----
export const REFUGEES = [
  { from: 'coast',   to: 'hairline', dispatch: 32.9, arrive: 37.4 },
  { from: 'gap',     to: 'hairline', dispatch: 34.5, arrive: 37.9 },
  { from: 'parting', to: 'follicle', dispatch: 36.2, arrive: 38.2 },
];

// ---- every string the film puts on screen lives here (exactly one place) ----
export const COPY = {
  title: { main: 'REMEMBER THE FLOW', sub: 'a Remy Boys documentary' },
  chapters: {
    ch1: 'CHAPTER I — THE AGE OF FLOW',
    ch2: 'CHAPTER II — THE RAZOR COMES',
    ch3: 'CHAPTER III — THE REGROWTH',
  },
  lowerThird: 'SGT. CRIMSON FLOW · 3RD FLOW BRIGADE (RET.)', // veteran lower-third (both shows)
  plateCredits: {
    ch1a: 'PLATE 0142 · THE LONG SUMMER',
    ch2a: 'ARCHIVE 0291 · CAPTURED DOCUMENT',
    ch2b: 'OPERATIONS MAP · GENERAL STAFF, MAIN PARTING',
    ch2c: 'NEWSREEL 0447 · OCCUPATION, HAIRLINE',
    ch3a: 'NEWSREEL 0452 · THE MUSTER',
    ch3b: 'NEWSREEL 0453 · MAIN PARTING',
  },
  plateCaption: 'THE FLOW GENERATION, c. LONG SUMMER', // ch1b mount caption
  poster: { slogan: 'GLOSS IS DESTINY', stamp: 'CABALD MINISTRY OF SHINE' },
  notice: 'SHINE ZONE',                       // ch2c notice board
  banner: 'HAIR RETURNS',                     // ch3b banner drop
  endcard: {
    main: 'IN MEMORY OF EVERY STRAND LOST',
    sub: '4,250 HEADS OF HAIR · THE OTHER 240 ARE DOING FINE',
  },
  brand: {
    line: 'THE FLOW REMEMBERS.',
    studio: 'REMY BOYS DOCUMENTARIES · EST. THE LONG SUMMER',
  },
  // narration (final treatment copy; VETERAN lines keep their quotes — bite style draws them)
  narration: {
    d1: '"You could hear the razors at night.\nWe were young. We were flowing."',
    v0: 'Every spring, the Flow returns.\nBut flow is never free.',
    v1: 'Before the Cabald came up from the south,\nhair grew long and unafraid.',
    v1b: 'Nobody measured it back then.\nThat was the point.',
    v2: 'They promised zero maintenance.\nThey called it the Gloss.',
    v2b: 'In three seasons the razor took the coast,\nthe Gap, and half of Main Parting.',
    v3: "They didn't hate hair.\nThey hated what it meant.",
    v4: 'What the razors never understood:\nyou cannot cut what keeps growing back.',
    v4b: 'Main Parting held.\nThe rest is combing.',
    d2: '"People ask if I miss the war.\nI miss my hairline the way it was."',
    v5: 'The wall honours 4,250 heads of hair.\nThe other 240 are doing fine.',
  },
};

// ---- events (film seconds — picture, captions and score share these) ----
export const EV = {
  // coldopen (0–7.5 present)
  fadeIn: [0, 0.9],
  pushIn: [0.5, 7.5],        // slow push-in on the VETERAN
  lowerThird1: [1.8, 6.6],   // COPY.lowerThird, first show
  bite1: [1.6, 6.9],         // d1 caption window (from treatment)

  // title (7.5–12 present)
  flutter: 7.5,              // projector/flutter texture (score enters here)
  leaderFlicker: [7.5, 8.4], // film-leader flicker window
  count2: 7.7,               // countdown ghost "2"
  count1: 8.0,               // countdown ghost "1"
  titleLand: 8.7,            // "REMEMBER THE FLOW"
  ruleIn: 9.3,               // thin rule draws
  subIn: 9.6,                // "a Remy Boys documentary"
  vo0: [8.05, 11.85],

  // chapter cards (lands + sub-rule)
  ch1Land: 12.4, ch1Rule: 13.2,
  ch2Land: 24.4, ch2Rule: 25.2,
  ch3Land: 43.9, ch3Rule: 44.7,

  // archival damage / gate
  sprocket: [15, 19.5, 24, 27, 31.5, 39, 43.5, 46.5, 51, 55.5], // flutter at every archival cut
  gateHairIn: 24.0,          // the gate hair appears from Chapter II on
  gateHairOut: [55.3, 55.5], // it flutters away as the film restores; gone at the cut

  // ch1a (15–19.5 archival) — sepia portrait, Ken Burns push 1.06→1.18
  kb1a: [15.2, 19.3],
  shutter1: 16.4,            // camera shutter on the plate hold
  credit1a: [15.35, 19.3],
  vo1: [15.6, 19.4],

  // ch1b (19.5–24 archival) — regiment photo, slow lateral pan
  kb1b: [19.7, 23.8],
  shutter2: 20.8,
  plateCaption: [19.85, 23.8], // "THE FLOW GENERATION, c. LONG SUMMER"
  vo1b: [19.9, 23.8],

  // ch2a (27–31.5 archival) — propaganda poster, camera tilts up
  posterTilt: [27.2, 31.3],
  credit2a: [27.35, 31.25],
  vo2: [27.4, 31.3],

  // ch2b (31.5–39 archival) — THE WAR MAP; labels first, washes sweep, arrows, refugees, hold
  kb2b: [31.7, 38.9],
  taikoIn: 31.5,             // score: slow taiko pulse
  labelHairline: 31.9, labelFollicle: 32.05, labelParting: 32.2, labelGap: 32.35, labelCoast: 32.5,
  washCoast: [32.5, 33.9],   // razor wash: The South Coast (onset, done)
  washGap: [34.2, 35.5],     // razor wash: Tonsura Gap
  washParting: [35.9, 36.5], // razor wash: Main Parting — stalls at HALF the city
  frontThrob: [33.9, 39],    // front line throbs once two regions have fallen
  arrowCoast: [33.5, 34.6],  // arrow 1: launch, reach (up the coast road)
  arrowGap: [35.0, 36.1],    // arrow 2: launch, reach (through Tonsura Gap)
  arrowParting: [36.5, 37.2],// arrow 3: launch, reach (onto Main Parting) — last reach 37.2
  refDispatch: REFUGEES.map((r) => r.dispatch), // [32.9, 34.5, 36.2]
  refArrive: REFUGEES.map((r) => r.arrive),     // [37.4, 37.9, 38.2] — all complete by 38.2
  mapHold: [38.2, 39],       // everything settled; let the map breathe
  riser: [37.0, 39.0],       // score riser
  credit2b: [31.85, 35.8],
  vo2b: [32.2, 38.4],

  // ch2c (39–43.5 archival) — occupation march, 12 fps stepped
  windIn: 39.0,              // score: sparse/cold wind
  kb2c: [39.2, 43.3],
  marchIn: 39.3,             // SQUAD enters the street
  passBehind: 41.0,          // squad passes behind the two villagers
  noticeBoard: 42.2,         // beat on the SHINE ZONE notice
  marchOut: 43.2,            // squad exits toward the cut
  credit2c: [39.35, 43.25],
  vo3: [39.6, 43.4],

  // ch3card (43.5–46.5 present)
  snareIn: 45.0,             // score: distant march snare fades in

  // ch3a (46.5–51 archival) — muster
  fifeIn: 46.5,              // score: full fife + snare march
  kb3a: [46.7, 50.9],
  drawAnticipate: 46.8,      // HERO draws the greatsword — anticipation
  swordLift: 47.5,           // raise
  swordHold: [48.3, 49.0],   // held high
  stepOff: 49.0,             // column of 5 steps off toward camera
  bannerUnfurl: 50.0,        // HAIR RETURNS banner unfurls behind the column
  credit3a: [46.85, 50.75],
  vo4: [47.0, 50.8],

  // ch3b (51–55.5 archival) — the clash; after the freeze, film time = CLASH_CLOCK.filmT(g)
  charge: [51.0, 52.2],      // charge start → first contact
  parry1: 52.2,              // parry contact 1
  parry2: 53.0,              // parry contact 2
  finalClash: CLASH_CLOCK.filmT(2.6),        // 53.60 — g-domain event, 0.22 s freeze begins
  clashFlash: [CLASH_CLOCK.filmT(2.6), CLASH_CLOCK.filmT(2.6) + 0.22], // white flash across the freeze
  aberSpike: [CLASH_CLOCK.filmT(2.6), CLASH_CLOCK.filmT(2.6) + 0.18],  // fx.aber ≤ 0.004, brief
  // squad topples in sequence, CAST.SQUAD[i] falls at EV.topple[i] (film time via filmT)
  topple: [2.75, 2.95, 3.15, 3.35].map(CLASH_CLOCK.filmT),   // 53.97 54.17 54.37 54.57
  swordPlant: CLASH_CLOCK.filmT(3.8),        // 55.02 — hero plants the greatsword
  bannerDrop: CLASH_CLOCK.filmT(3.95),       // 55.17 — HAIR RETURNS banner drops
  damageClean: [53.6, 55.5], // archival damage suddenly clean from the clash to the cut (~2 s)
  kb3b: [51.0, 55.5],
  credit3b: [51.25, 55.2],
  vo4b: [51.5, 55.3],

  // veteran (55.5–63 present)
  pianoIn: 55.5,             // score: solo piano, intimate
  interviewPush: [55.7, 61.5], // wide → slow push to medium
  lowerThird2: [56.0, 59.0], // COPY.lowerThird, brief re-show
  bite2: [56.4, 61.8],       // d2 caption window (from treatment)
  quietBeat: [61.9, 63.0],   // held quiet — he almost smiles

  // memorial (63–70.5 present)
  bugle: 63.6,               // score: bugle call + choir pad
  memorialPush: [63.2, 70.3], // slow push along the wall of tiny heads
  wreathSettle: 66.0,        // wreath settles at the base
  heroLight: 67.2,           // the hero's head lights warm amber
  heroPulse: [67.2, 70.5],   // soft pulse holds to the endcard
  bell: 67.2,                // score: soft bell with the light-up
  vo5: [64.4, 69.4],

  // endcard / brand (70.5–78 present)
  motifRestate: 70.5,        // score: FLOW motif restated on piano + strings
  endcardLand: 70.9,
  brandLand: 73.9,           // "THE FLOW REMEMBERS."
  studioMark: 74.9,          // studio mark
  finalChord: 76.5,          // score: final low chord, resolve
  projectorClick: 77.0,      // one projector click
  fade: [77.2, 78],          // fade to black
};

// ---- declarative captions (post overlay; full-visible hold ≥ 3.05 s after in/out on EVERY caption) ----
// Windows live in EV (single source of truth); text lives in COPY. Title/chapter/end cards are
// drawn type and are deliberately NOT captioned.
export const CAPTIONS = [
  { id: 'bite1',    text: COPY.narration.d1,            t0: EV.bite1[0],        t1: EV.bite1[1],        style: 'bite' },
  { id: 'vo0',      text: COPY.narration.v0,            t0: EV.vo0[0],          t1: EV.vo0[1],          style: 'vo' },
  { id: 'credit1a', text: COPY.plateCredits.ch1a,       t0: EV.credit1a[0],     t1: EV.credit1a[1],     style: 'credit' },
  { id: 'vo1',      text: COPY.narration.v1,            t0: EV.vo1[0],          t1: EV.vo1[1],          style: 'vo' },
  { id: 'plate1b',  text: COPY.plateCaption,            t0: EV.plateCaption[0], t1: EV.plateCaption[1], style: 'credit' },
  { id: 'vo1b',     text: COPY.narration.v1b,           t0: EV.vo1b[0],         t1: EV.vo1b[1],         style: 'vo' },
  { id: 'credit2a', text: COPY.plateCredits.ch2a,       t0: EV.credit2a[0],     t1: EV.credit2a[1],     style: 'credit' },
  { id: 'vo2',      text: COPY.narration.v2,            t0: EV.vo2[0],          t1: EV.vo2[1],          style: 'vo' },
  { id: 'credit2b', text: COPY.plateCredits.ch2b,       t0: EV.credit2b[0],     t1: EV.credit2b[1],     style: 'credit' },
  { id: 'vo2b',     text: COPY.narration.v2b,           t0: EV.vo2b[0],         t1: EV.vo2b[1],         style: 'vo' },
  { id: 'credit2c', text: COPY.plateCredits.ch2c,       t0: EV.credit2c[0],     t1: EV.credit2c[1],     style: 'credit' },
  { id: 'vo3',      text: COPY.narration.v3,            t0: EV.vo3[0],          t1: EV.vo3[1],          style: 'vo' },
  { id: 'credit3a', text: COPY.plateCredits.ch3a,       t0: EV.credit3a[0],     t1: EV.credit3a[1],     style: 'credit' },
  { id: 'vo4',      text: COPY.narration.v4,            t0: EV.vo4[0],          t1: EV.vo4[1],          style: 'vo' },
  { id: 'credit3b', text: COPY.plateCredits.ch3b,       t0: EV.credit3b[0],     t1: EV.credit3b[1],     style: 'credit' },
  { id: 'vo4b',     text: COPY.narration.v4b,           t0: EV.vo4b[0],         t1: EV.vo4b[1],         style: 'vo' },
  { id: 'bite2',    text: COPY.narration.d2,            t0: EV.bite2[0],        t1: EV.bite2[1],        style: 'bite' },
  { id: 'vo5',      text: COPY.narration.v5,            t0: EV.vo5[0],          t1: EV.vo5[1],          style: 'vo' },
];

// ---- caption styles (film spreads these over core CAPTION_STYLES; keys used by CAPTIONS only) ----
export const CAPTION_STYLES = {
  vo: {
    font: '"Cormorant Garamond"', size: 36, weight: 600, color: '#efe3c6',
    align: 'center', x: 960, y: 872, lineHeight: 1.18, track: 0.5,
    anim: 'fade', in: 0.35, out: 0.35, shadow: '#100c08', glow: '#0d0a06', glowBlur: 14,
  },
  bite: {
    font: '"Cormorant Garamond"', size: 38, weight: 600, color: '#f3e2b0',
    align: 'center', x: 960, y: 872, lineHeight: 1.18, track: 0.5,
    anim: 'fade', in: 0.35, out: 0.35, shadow: '#100c08', glow: '#141007', glowBlur: 14,
  },
  credit: {
    font: '"JetBrains Mono"', weight: 600, size: 19, color: '#d8c9a6',
    align: 'left', x: 96, y: 986, track: 3,
    anim: 'fade', in: 0.4, out: 0.4, shadow: '#0c0906',
  },
};
