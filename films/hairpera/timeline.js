// THE PHANTOM OF THE HAIRPERA — Remy Boys film #34. 96 s, 1080p via a 960×540 pixel stage (2× nearest).
// The one timing truth: shot map, music grid, g-domain event tables and the hit-stop warp clock
// shared by film.js AND score.js. No imports — later agents build from these numbers.
//
// EVENT CONVENTION (one convention, documented here):
//   • *_EV tables + named hits + STOPS are in WORLD seconds g. Hit-stops freeze world time, so
//     film time runs ahead: absolute film second = filmT(g). The composer schedules ONLY via
//     filmT(g) — never a hand-added delay. Draw code positions actors by warp(t).g (t = the
//     draw() absolute film time, 4th arg), and runs impact FX on rt = g + stop.sl.
//   • FILM seconds are used by: DUR, SHOTS, the music grid (SECTION/BPM/BAR/BEAT), CAPS, CAM,
//     SILENCES, FLASHES. The runtime composites captions and camera keys on film time; the grid
//     itself is composed in film time and already accounts for the stops.
//
// MUSIC GRID: every section boundary lands ON a bar line of its own grid, and every cut is an
// integer second (filmkit grid.bar = 1). 80 BPM 4/4 = 3 s bars (acts I); masquerade is 3/4 at
// 180 BPM (Viennese, 1 s bars); duel 160 BPM 4/4 (1.5 s bars); chandelier 120 BPM 4/4 (2 s bars).
export const DURATION = 96;
export const DUR = DURATION;         // alias
export const LW = 960, LH = 540;     // pixel stage, blitted 2× nearest to 1920×1080
export const GROUND = 430;           // actor feet line in stage coords
export const GRID = { bar: 1, offset: 0 }; // all shot cuts are integer seconds → on grid bars

// ---- shot map (contiguous, covers [0, DUR)) -----------------------------------
// frame: 'proscenium' = society/on-stage (red velvet + gold arch, audience heads, chandelier);
//        'full' = the Phantom's world / fourth wall removed (backstage, lair, rooftop, ruin).
export const SHOTS = [
  { name: 'overture',   t0: 0,  t1: 12, frame: 'proscenium' }, // candle → title → house reveal
  { name: 'rehearsal',  t0: 12, t1: 24, frame: 'proscenium' }, // Carlotta; backdrop crash
  { name: 'mirror',     t0: 24, t1: 36, frame: 'full' },       // dressing room; face in glass
  { name: 'lair',       t0: 36, t1: 54, frame: 'full' },       // underground lake; the organ
  { name: 'masquerade', t0: 54, t1: 68, frame: 'proscenium' }, // waltz; Red Death freeze
  { name: 'rooftop',    t0: 68, t1: 80, frame: 'full' },       // duel; the unmasking
  { name: 'chandelier', t0: 80, t1: 90, frame: 'proscenium' }, // cut cable; the plunge
  { name: 'coda',       t0: 90, t1: 96, frame: 'full' },       // ruined stage; the mask remains
];

// ---- cast (ids verified in output/hairpera/notes/casting.md) -------------------
export const CAST = {
  PHANTOM: 452,   // Midnight Soul — canon bald, black tailcoat repaint; white half-mask + procedural cape
  CHRISTINE: 24,  // Gold Flow soprano — bust crop only for portraits (full 600×600 has a meme bg)
  RAOUL: 42,      // Crimson Flow hero, greatsword
  CARLOTTA: 59,   // Gold Visor diva
  GIRY: 1161,     // Cobalt Soul conductor (canon bald — the Cabald maestro wink)
  CHORUS: [30, 616, 728, 4, 665, 1173, 3689, 817], // masquerade waltz rows (far sprites)
  BOX_A: [129, 2061], BOX_B: [1558, 98],            // audience-box silhouettes
};

// ---- music grid ----------------------------------------------------------------
// Section keys deliberately EQUAL the shot names (film.js iterates shots; score.js iterates these).
export const SECTION = { overture: 0, rehearsal: 12, mirror: 24, lair: 36,
                         masquerade: 54, rooftop: 68, chandelier: 80, coda: 90 };
export const BPM   = { overture: 80, rehearsal: 80, mirror: 80, lair: 80,
                       masquerade: 180, rooftop: 160, chandelier: 120, coda: 80 };
export const METER = { overture: [4,4], rehearsal: [4,4], mirror: [4,4], lair: [4,4],
                       masquerade: [3,4], rooftop: [4,4], chandelier: [4,4], coda: [4,4] };
// bar length in film seconds (beats × 60/BPM) — all clean decimals
export const BAR   = { overture: 3, rehearsal: 3, mirror: 3, lair: 3,
                       masquerade: 1, rooftop: 1.5, chandelier: 2, coda: 3 };
export const BEAT  = { overture: 0.75, rehearsal: 0.75, mirror: 0.75, lair: 0.75,
                       masquerade: 1 / 3, rooftop: 0.375, chandelier: 0.5, coda: 0.75 };

export const barStart = (sec, i = 0) => SECTION[sec] + i * BAR[sec];     // i 0-indexed
export const beatT    = (sec, bar, beat) =>                               // bar,beat 1-indexed
  barStart(sec, bar - 1) + (beat - 1) * BEAT[sec];
export function sectionAt(t) {
  let cur = 'overture';
  for (const n of Object.keys(SECTION)) if (t >= SECTION[n]) cur = n;
  return cur;
}
export function barBeat(t) {                        // film t → {section, bar, beat} (1-indexed)
  const s = sectionAt(t), rel = t - SECTION[s];
  const bar = Math.floor(rel / BAR[s]);
  const beat = (rel - bar * BAR[s]) / BEAT[s] + 1;
  return { section: s, bar: bar + 1, beat: Math.round(beat * 1000) / 1000 };
}

// ---- hit-stop warp clock --------------------------------------------------------
// Impact lands at freeze START; effects run on rt = g + stop.sl; shake runs on real film time.
export const BACKDROP_CRASH   = 18.0;   // world g → film 18.0  (rehearsal bar 3 downbeat)
export const CLASH_1          = 72.25;  // world g → film 72.5  (duel bar 4 downbeat)
export const CLASH_2          = 75.1;   // world g → film 75.5  (duel bar 6 downbeat)
export const CABLE_SNAP       = 81.45;  // world g → film 82.0  (chandelier bar 2 downbeat)
export const CHANDELIER_CRASH = 85.25;  // world g → film 86.0  (chandelier bar 4 downbeat)

export const STOPS = [
  { g: BACKDROP_CRASH,   d: 0.25 },   // backdrop hits the deck
  { g: CLASH_1,          d: 0.15 },   // sword clash 1
  { g: CLASH_2,          d: 0.15 },   // sword clash 2
  { g: CABLE_SNAP,       d: 0.2  },   // the pluck/snap
  { g: CHANDELIER_CRASH, d: 0.35 },   // impact + white-out
];

export function warp(t) {           // absolute FILM t → { g, stop, sl } (world time)
  let acc = 0;
  for (const s of STOPS) {
    const rs = s.g + acc;           // film time where this freeze begins
    if (t < rs) return { g: t - acc, stop: null, sl: 0 };
    if (t < rs + s.d) return { g: s.g, stop: s, sl: t - rs };
    acc += s.d;
  }
  return { g: t - acc, stop: null, sl: 0 };
}
export function filmT(g) {          // world g → absolute film seconds (score schedules with this)
  let acc = 0;
  for (const s of STOPS) if (s.g < g) acc += s.d;
  return g + acc;
}
export const STOP_FILM = STOPS.map(s => ({ g: s.g, d: s.d, film: filmT(s.g) }));

// ---- event tables (WORLD seconds g; film time = filmT(g)) -----------------------
// OVERTURE (film 0–12): match → title → bloom → house reveal.
export const OVERTURE_EV = {
  matchStrike: 1.5,    // film 1.5   — overture bar 1 beat 3, the candle catches
  titleIn:     3.0,    // film 3.0   — bar 2 downbeat, gold serif title
  bloom:       6.0,    // film 6.0   — bar 3 downbeat, candle light blooms, house revealed
  placeCard:   7.5,    // film 7.5   — bar 3 beat 3, place-card caption anchor
};

// REHEARSAL (film 12–24): Carlotta's scale, stagehand bustle, THE CRASH, the whisper.
export const REHEARSAL_EV = {
  carlottaScale: 12.75,       // film 12.75  — bar 1 beat 2, the diva's arpeggio flourish begins
  bustle:        14.25,       // film 14.25  — bar 1 beat 4, stagehand Remys hustle
  preCrash:      17.625,      // film 17.625 — bar 2 "and of 4": backdrop sways, dust trickles
  backdropCrash: BACKDROP_CRASH,  // film 18.0  — STOP 0.25; dust plume runs on rt
  gasp:          18.5,        // film 18.75  — bar 3 beat 2, chorus gasps as world resumes
  whisper:       19.25,       // film 19.5   — bar 3 beat 3, "the Phantom is here…" anchor
};

// MIRROR (film 24–36): soft song, leaning flames, the face in the glass.
export const MIRROR_EV = {
  christineIn: 24.5,    // film 24.75 — bar 1 beat 2, Christine at the mirror
  softSong:    25.25,   // film 25.5  — bar 2 beat 3, her gentle motif begins
  flamesLean:  28.25,   // film 28.5  — bar 2 beat 3, candle flames lean: the Phantom is near
  glassGlow:   29.75,   // film 30.0  — bar 3 downbeat, the glass starts to glow
  faceFade:    31.25,   // film 31.5  — bar 3 beat 3, half-masked face fades INTO the glass
  handExtend:  32.75,   // film 33.0  — bar 4 downbeat, his hand extends through the frame
  sheSteps:    33.5,    // film 33.75 — bar 4 beat 2, she steps toward the glass
  mirrorTouch: 34.25,   // film 34.5  — bar 4 beat 3, MIRROR_TOUCH: palms meet (music suspends)
  irisClose:   35.0,    // film 35.25 — bar 4 beat 4, iris wipe closes on the mirror
};

// LAIR_BEATS (film 36–54): the centerpiece. Candelabras rise on flame-ignition beats.
export const LAIR_BEATS = {
  gondolaIn: 37.25,            // film 37.5  — bar 1 beat 3, gondola glides out of the fog
  candleRise: [38.75, 39.5, 40.25, 41.0], // film 39.0/39.75/40.5/41.25 — lair bar 2 beats 1-4:
                               // each candelabra ignites out of the water ON its beat
  organSwell: 41.75,           // film 42.0  — bar 3 downbeat, the Phantom hits the organ; the
                               // original "anthem of the bald" runs bars 3–6
  entranced:  43.25,           // film 43.5  — bar 3 beat 3, Christine sways entranced
  organPeak:  47.75,           // film 48.0  — bar 5 downbeat, full statement + pipe shimmer
  descent:    50.75,           // film 51.0  — bar 6 downbeat, wind-down toward the masquerade
};

// MASQUERADE (film 54–68): 14 waltz bars; the freeze is CHOREOGRAPHY (pose hold), not a warp
// stop — the orchestra keeps snapping pizzicato under it. Only the PHANTOM moves while frozen.
export const MASQ_FREEZE = 60.75;      // world g → film 61.0 — waltz bar 8 downbeat
export const MASQ_EV = {
  waltzIn:        53.75,  // film 54.0 — waltz bar 1, chorus rows kick on downbeats (1 s bars)
  confetti:       54.5,   // film 54.75 — continuous effect (off-grid by design)
  masqBreak:      59.75,  // film 60.0 — waltz bar 7, orchestra cuts to snap/pizzicato
  masqFreeze:     MASQ_FREEZE,    // film 61.0 — waltz bar 8, EVERYONE freezes mid-kick
  chandelierSway: MASQ_FREEZE,    // film 61.0 — the house chandelier sways through the hold
  phantomDescend: 62.75,  // film 63.0 — waltz bar 10, RED DEATH descends the stairs (alone moving)
  waltzRelease:   64.75,  // film 65.0 — waltz bar 12, the waltz resumes, terrified
};

// ROOFTOP DUEL (film 68–80): 160 BPM. Mask off on the bar 7 downbeat — the reveal.
export const MASK_OFF = 76.45;         // world g → film 77.0 — duel bar 7 downbeat
export const DUEL_EV = {
  circle:      68.5,    // film 68.75  — bar 1 beat 3, circling on the moonlit ridgeline
  swordsDraw:  70.75,   // film 71.0   — bar 3 downbeat, greatsword vs cane
  clash1:      CLASH_1, // film 72.5   — bar 4 downbeat, STOP 0.15; sparks on rt
  parry:       73.225,  // film 73.625 — bar 4 beat 4, blade scrape, boots slide
  clash2:      CLASH_2, // film 75.5   — bar 6 downbeat, STOP 0.15
  caneKnock:   76.075,  // film 76.625 — bar 6 beat 4, the cane spins away
  maskOff:     MASK_OFF,// film 77.0   — bar 7 downbeat, MASK_OFF: BALD REVEAL in moonlight
  choirGasp:   MASK_OFF,// film 77.0   — same instant, choir gasp (score side)
  vanishSwirl: 77.2,    // film 77.75  — bar 7 beat 3, cape swirl + bat-fog covers his head
  vanishDone:  78.7,    // film 79.25  — bar 8 beat 3, gone; only the cape settles
};

// CHANDELIER (film 80–90): snap on bar 2, plunge on bar 3, crash on bar 4 — 2 s of fall.
export const CHANDELIER_EV = {
  phantomAbove:   79.95, // film 80.5  — bar 1 beat 2, his silhouette at the cable, saw glinting
  cableSnap:      CABLE_SNAP,   // film 82.0 — bar 2 downbeat, STOP 0.2 on the pluck
  swingPeak:      82.75, // film 83.5  — bar 2 beat 4, the chandelier swings to its widest
  plunge:         83.25, // film 84.0  — bar 3 downbeat, it LETS FALL toward the audience POV
  chandelierCrash: CHANDELIER_CRASH, // film 86.0 — bar 4 downbeat, STOP 0.35; white-out
  whiteOut:       CHANDELIER_CRASH,  // film 86.0 — same instant, flash + glass shards on rt
  dustSettle:     86.9,  // film 88.0  — bar 5 downbeat, glass dust settles in the footlights
};
// audienceDuck is RT-driven, not a world event: silhouettes duck through the crash freeze
// (visible from rt ≈ filmT(CHANDELIER_CRASH) + 0.5); foley crowd panic at the same anchor.

// CODA (film 90–96): smoke, throne, the mask, one candle.
export const CODA_EV = {
  smokeClear:   89.65,  // film 90.75 — coda bar 1 beat 2, smoke parts on the ruined stage
  throneReveal: 90.4,   // film 91.5  — bar 1 beat 3, throne + white half-mask + one candle
  candleGutter: 93.4,   // film 94.5  — bar 2 beat 3, the candle gutters…
  irisBlack:    94.15,  // film 95.25 — bar 2 beat 4, iris to black on the end slate
};

// ---- camera keys (FILM seconds; focus in 960×540 stage coords; k = zoom ≥ 1) ----
// Builder interpolates between adjacent keys with CLAMPED smoothstep on film time. Keys advance
// through freezes on film time — the punch-ins riding a hit-stop read as impact weight.
export const CAM = {
  overture:   [{ t: 0.5, x: 480, y: 300, k: 1.35 }, { t: 6, x: 480, y: 272, k: 1.12 },
               { t: 11.5, x: 480, y: 270, k: 1.0 }],
  rehearsal:  [{ t: 12.5, x: 480, y: 280, k: 1.06 }, { t: 17, x: 505, y: 272, k: 1.1 },
               { t: 17.625, x: 505, y: 272, k: 1.12 }, { t: 18, x: 480, y: 278, k: 1.22 },
               { t: 19, x: 480, y: 276, k: 1.05 }, { t: 23.5, x: 480, y: 270, k: 1.0 }],
  mirror:     [{ t: 24.5, x: 430, y: 282, k: 1.0 }, { t: 34, x: 468, y: 266, k: 1.18 },
               { t: 35.9, x: 478, y: 262, k: 1.26 }],       // creep into the glass as iris closes
  lair:       [{ t: 36.5, x: 480, y: 300, k: 1.05 }, { t: 42, x: 560, y: 272, k: 1.12 },
               { t: 48, x: 520, y: 264, k: 1.16 }, { t: 53.5, x: 480, y: 270, k: 1.02 }],
  masquerade: [{ t: 54.3, x: 480, y: 282, k: 1.0 }, { t: 60.5, x: 555, y: 252, k: 1.05 },
               { t: 61, x: 610, y: 226, k: 1.35 }, { t: 64, x: 608, y: 230, k: 1.28 },
               { t: 65, x: 480, y: 276, k: 1.0 }],          // snap-zoom rides the freeze
  rooftop:    [{ t: 68.3, x: 480, y: 286, k: 1.0 }, { t: 72.3, x: 500, y: 272, k: 1.15 },
               { t: 72.65, x: 480, y: 276, k: 1.05 }, { t: 75.35, x: 505, y: 270, k: 1.18 },
               { t: 75.7, x: 480, y: 274, k: 1.06 }, { t: 77, x: 455, y: 258, k: 1.3 },
               { t: 79.5, x: 480, y: 270, k: 1.1 }],        // punch on clashes; push on reveal
  chandelier: [{ t: 80.3, x: 480, y: 300, k: 1.05 }, { t: 82, x: 480, y: 240, k: 1.1 },
               { t: 84, x: 480, y: 180, k: 1.3 }, { t: 86, x: 480, y: 120, k: 1.6 },
               { t: 86.4, x: 480, y: 270, k: 1.05 }, { t: 89.5, x: 480, y: 275, k: 1.0 }],
  coda:       [{ t: 90.5, x: 480, y: 270, k: 1.25 }, { t: 95.5, x: 480, y: 272, k: 1.0 }],
}; // chandelier: focus climbs (y↓) + k↑ as it falls TOWARD us; flash covers the snap-back

// ---- scored hard silences (FILM seconds; everything cuts into these) -------------
// Exemplar lesson: silence JUST before each impact; the hit itself lands at freeze start
// (filmT of the stop's g) and the sting rings inside the freeze.
export const SILENCES = [
  { from: 17.25,  to: 18.0 },  // 0.75 s — one beat of dread before the backdrop
  { from: 72.125, to: 72.5 },  // 0.375 s before CLASH_1
  { from: 75.125, to: 75.5 },  // 0.375 s before CLASH_2
  { from: 81.5,   to: 82.0 },  // 0.5 s before CABLE_SNAP
  { from: 85.5,   to: 86.0 },  // 0.5 s before CHANDELIER_CRASH
];

// ---- flashes [film t, peak, decay] — peaks ≤ .3, decay ≤ .2 ----------------------
export const FLASHES = [
  [1.5, 0.2, 0.15],   // match strike
  [18.0, 0.2, 0.15],  // backdrop impact dust puff
  [77.0, 0.14, 0.1],  // moonlit glint as the mask leaves
  [82.0, 0.12, 0.1],  // cable snap glint
  [86.0, 0.3, 0.2],   // chandelier white-out
];

// ---- captions (FILM seconds; drawn by the runtime on overlay) --------------------
// Every default-hold caption has visible window ≥ 3 s (lint default). Slam cards use
// anim:'cut', in:0 and per-caption minHold 2.2 — reason: punch cards land exactly on musical
// hits, and their window is bounded by the next scored event. Reading text sits y 878–900
// (fade-to-bald band, clears the letterbox); titles/cards centre 520–606. Lines pre-split ≤ 40 chars.
export const CAPS = [
  { id: 'titleCard',  text: 'THE PHANTOM OF THE HAIRPERA', t0: 3.0,  t1: 7.5,  style: 'title' },
  { id: 'placeCard',  text: 'OPÉRA REMY POPULAIRE — PARIS, 1881', t0: 7.5, t1: 11.6, style: 'place' },
  { id: 'whisper',    text: 'the Phantom is here…', t0: 19.5, t1: 23.6, style: 'whisper' },
  { id: 'mirrorNarr', text: 'She sang to the glass.\nThe glass sang back.', t0: 25.0, t1: 29.5, style: 'narr' },
  { id: 'phantomLine', text: '“Come. Your crowning moment\nawaits below.”', t0: 30.8, t1: 34.4, style: 'dlg' },
  { id: 'lairNarr',   text: 'Twelve chandeliers below.\nHe needed none. He had shine.', t0: 37.5, t1: 42.0, style: 'narr' },
  { id: 'lairLine',   text: '“SING, MY ANGEL OF HAIR.”', t0: 42.5, t1: 46.5, style: 'dlg' },
  { id: 'waltzNarr',  text: 'Six hundred wigs swayed\nin three-quarter time.', t0: 55.5, t1: 59.5, style: 'narr' },
  { id: 'freezeCard', text: 'BALD-QUERADE!', t0: 61.0, t1: 63.7, style: 'slam', minHold: 2.2 },
  { id: 'roofNarr',   text: 'Moonlit rooftops.\nTwo swords. One bald grudge.', t0: 68.4, t1: 72.2, style: 'narr' },
  { id: 'unmaskCard', text: 'MY FLOW… IT’S GONE.', t0: 77.0, t1: 79.6, style: 'slam', minHold: 2.2 },
  { id: 'cableCard',  text: 'HE CUTS THE CABLE.', t0: 82.0, t1: 84.5, style: 'slam', minHold: 2.2 },
  { id: 'remainsCard', text: 'THE PHANTOM REMAINS', t0: 90.75, t1: 94.8, style: 'cardGold' },
  { id: 'endSlate',   text: 'REMY BOYS PICTURES', t0: 92.25, t1: 95.1, style: 'endSlate', minHold: 2.2 },
];
// Recommended captionStyles for film.js (literal strings = F.serif; glow/shadow live ONLY here —
// per-caption glow is silently ignored by filmkit):
export const CAP_STYLES = {
  narr:  { font: '"Cormorant Garamond"', weight: 'italic 600', size: 36, color: '#ded7c4',
           align: 'center', x: 960, y: 878, lineHeight: 1.2, track: 0.5, anim: 'rise',
           in: 0.35, out: 0.35, shadow: '#0a0c10', glow: '#0a0c10', glowBlur: 12 },
  whisper: { font: '"Cormorant Garamond"', weight: 'italic 500', size: 34, color: '#b9c4d6',
           align: 'center', x: 960, y: 900, lineHeight: 1.2, track: 1, anim: 'fade',
           in: 0.5, out: 0.5, shadow: '#0a0c10', glow: '#0a0c10', glowBlur: 14 },
  dlg:   { font: '"Cormorant Garamond"', weight: 'italic 600', size: 38, color: '#f0e9d4',
           align: 'center', x: 960, y: 878, lineHeight: 1.2, track: 0.5, anim: 'fade',
           in: 0.25, out: 0.25, shadow: '#0a0c10', glow: '#0a0c10', glowBlur: 14 },
  place: { font: '"Cormorant Garamond"', weight: 'italic 500', size: 40, color: '#ded7c4',
           align: 'center', x: 960, y: 900, lineHeight: 1.2, track: 4, anim: 'fade',
           in: 0.35, out: 0.35, shadow: '#12060a', glow: '#12060a', glowBlur: 16 },
  title: { font: '"Cormorant Garamond"', weight: 600, size: 90, color: '#e6c766',
           align: 'center', x: 960, y: 540, lineHeight: 1.1, track: 6, anim: 'rise', rise: 20,
           in: 0.7, out: 0.6, glow: '#1a0b0e', glowBlur: 30 },   // dedicated gold title style
  slam:  { font: 'Anton', weight: 400, size: 120, color: '#f3e6c2', align: 'center', x: 960,
           y: 520, track: 4, anim: 'cut', in: 0, out: 0.25, glow: '#2a0d12', glowBlur: 34 },
  cardGold: { font: '"Cormorant Garamond"', weight: 600, size: 72, color: '#e6c766',
           align: 'center', x: 960, y: 520, track: 10, anim: 'fade', in: 0.4, out: 0.4,
           glow: '#1a0b0e', glowBlur: 24 },
  endSlate: { font: '"Cormorant Garamond"', weight: 'italic 500', size: 28, color: '#b7b1a2',
           align: 'center', x: 960, y: 606, track: 4, anim: 'fade', in: 0.2, out: 0.4,
           shadow: '#0a0c10' },
};

// ---- contact coords (960×540 stage coords; times are law, art may refine positions) ----
export const HIT = {
  backdrop:        { x: 480, y: 300 },  // backdrop bottom edge meets the stage floor
  mirrorTouch:     { x: 430, y: 260 },  // palms meet in the glass
  clash1:          { x: 500, y: 268 },  // blades meet, rooftop
  clash2:          { x: 520, y: 262 },
  maskOff:         { x: 470, y: 240 },  // the Phantom's head at the reveal
  cableAnchor:     { x: 480, y: 36 },   // chandelier chain at the ceiling
  chandelierCrash: { x: 480, y: 420 },  // impact in the audience POV
};

// ---- NOTES: event→bar:beat map (auto-derived — cannot drift from the tables) -----
const REG = {};
for (const [shot, table] of Object.entries({ OVERTURE_EV, REHEARSAL_EV, MIRROR_EV,
    LAIR_BEATS, MASQ_EV, DUEL_EV, CHANDELIER_EV, CODA_EV }))
  for (const [k, v] of Object.entries(table)) {
    if (Array.isArray(v)) v.forEach((g, i) => REG[`${shot}.${k}[${i}]`] = g);
    else REG[`${shot}.${k}`] = v;
  }

export const NOTES = {
  convention: 'EV tables + STOPS are WORLD seconds; film time = filmT(g). Grid, CAPS, CAM, SILENCES, FLASHES are FILM seconds. Composer schedules only via filmT(g)/beatT/barStart.',
  silences: SILENCES,
  waltz: { t0: 54, bar: 1, beat: 1 / 3, bars: 14, freezeBar: 8, releaseBar: 12 }, // choreo grid
  events: Object.entries(REG).map(([name, g]) => {
    const film = filmT(g), bb = barBeat(film);
    return { name, g, film, section: bb.section, bar: bb.bar, beat: bb.beat };
  }),
  sections: {
    overture:   '80 BPM 4/4 (3 s bars), D minor → organ + choir swell; hard silence 17.25–18.0 then backdrop crash on rehearsal bar 3.',
    rehearsal:  '80 BPM 4/4; diva scale = rising arpeggio per bar; crash sting at film 18 rings through the 0.25 s freeze; low organ pulse under the whisper.',
    mirror:     '80 BPM 4/4, half-feel duet motif (strings + choir u); suspend all sound at MIRROR_TOUCH film 34.5, one harp gliss into the iris.',
    lair:       '80 BPM 4/4, the centerpiece: custom additive organ (sine partials 1/2/3/4 + chiff), ascending phrygian motif w/ tritone resolution (NO descending chromatic riff), bars 3–6, peak bar 5.',
    masquerade: '180 BPM 3/4 (1 s bars): oom-pah-pah waltz, kick on downbeats; bar 7 cut to pizz/snap; bar 8–11 freeze tableau with solo pizz + chandelier creak; bar 12 waltz resumes.',
    rooftop:    '160 BPM 4/4 (1.5 s bars), strings ostinato + taiko; clashes on bar 4 and bar 6 downbeats (each preceded by a 0.375 s hard silence); choir gasp at 77.0; lone low root after the vanish.',
    chandelier: '120 BPM 4/4 (2 s bars): tam-tam swell bars 1–2, silence 81.5–82.0, snap on bar 2, full orchestra + organ + tam-tam on the bar 4 crash (0.35 s freeze), dust strings bar 5.',
    coda:       '80 BPM 4/4: solo piano + held tonic under the card; candle gutter at 94.5 = last sound before the iris; final low root under the end slate.',
  },
};
