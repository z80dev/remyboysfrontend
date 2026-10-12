// THE HAIRTRIX — Remy Boys film #36. 92 s, 1080p via a 960×540 pixel stage (2× nearest).
// The one timing truth: shot map, grade bands, g-domain event tables, the hit-stop warp clock,
// captions and camera keys — shared by film.js AND score.js. No imports; later agents build
// from these numbers.
//
// EVENT CONVENTION (hairpera-style, one convention, documented once):
//   • EVENTS + the *_EV tables + STOPS live in WORLD seconds g — EXCEPT the keys listed in
//     EV_FILM_KEYS, which are FILM seconds (camera / real-time choreography that plays while
//     the world is frozen: the orbit sweep, agent head-tracks, the bullet pluck, resume beats).
//   • Hit-stops freeze world time, so film time runs ahead: absolute film second = filmT(g).
//     The composer schedules ONLY via filmT(g) / beatT / barStart — never a hand-added delay.
//     Draw code positions actors by warp(t).g (t = draw()'s absolute film time, 4th arg) and
//     runs impact FX on film time inside the freeze window: shake, flash, debris-on-rt and
//     slow agent head-turns ride REAL film time; the world itself does not move.
//   • An event scheduled AT a freeze's g (e.g. bulletsDrop = volleyFreeze g) happens at the
//     RESUME, film0 + d — use FREEZES.*.film1, not filmT(g). See FREEZES below.
//   • FILM seconds are used by: DURATION, T, SHOTS, SECTION/BPM/BAR/BEAT, CAPTIONS, CAM,
//     SILENCES, FLASHES, ORBIT (the orbit camera is pure film-time choreography).
//
// MUSIC GRID: every cut is an integer film second and lands on a bar line of its own grid
// (filmkit grid.bar = 1). Terminal is 80 BPM 4/4 (3 s bars); every later section is 120 BPM
// 4/4 (2 s bars) — composer varies feel (half-time / double-time), not the grid.
export const DURATION = 92;
export const DUR = DURATION;          // alias
export const LW = 960, LH = 540;      // pixel stage, blitted 2× nearest to 1920×1080
export const GROUND = 430;            // actor feet line in stage coords
export const SAFE_Y = 470;            // letterbox safe band: keep foot action y ≤ 470
export const GRID = { bar: 1, offset: 0 };

// ---- grade bands (brief rule: green Matrix, harsh white Construct, cold blue real world) ----
export const GRADE = {
  matrix:    { tint: '#0d2f1a', bloom: 0.10, note: 'green-phosphor darkness — contact, dojo, jump, roof, bullettime, lobby, subway, payoff' },
  construct: { tint: '#f4f7f2', bloom: 0.14, note: 'harsh white void — construct 20.0–28.0 only' },
  real:      { tint: '#0a1c30', bloom: 0.08, note: 'cold blue pod farm — construct 28.0–34.0' },
  phosphor:  { tint: '#03170a', bloom: 0.12, note: 'black + green CRT — terminal' },
};
export const PHOS = '#54ff8e';        // phosphor green accent (CRT text, tracers, trims)
// FLOW's hair stays readable through every grade: keep base hair ≥ #9a8c1a luminance; never
// crush it under the green tint (paint the hair highlight pass AFTER grade in spirit — i.e.
// keep a dedicated bright rim on the flow in all Matrix scenes).

// ---- cast: ROLE TOKENS ONLY — casting agent binds exact ids in CASTING.md -------------------
// Draw code must not hardcode sprite ids; it imports ROLES and looks up the bound id.
export const ROLES = {
  FLOW: 'FLOW',             // lead, long distinctive flow; clean shirt (construct/dojo) → leather trench (lobby/subway/payoff)
  MOUSSE_PHEUS: 'MOUSSE-PHEUS', // mentor, majestic big hair, tiny round shades
  TRIMNITY: 'TRIMNITY',     // sleek agile hero, dark hair (lobby)
  AGENT_SMIRK: 'AGENT-SMIRK',   // lead Cabald: bald, black suit + shades + earpiece
  SWARM: 'CABALD-SWARM',    // 4 additional bald ids, identical suits (roof 4, lobby 5 clones, payoff 4)
  SWARM_N: 4,
};

// ---- shot map (contiguous, covers [0, 92)) --------------------------------------------------
export const T = {
  terminal: 0, contact: 12, construct: 20, dojo: 34, jumpprog: 44,
  roof: 48, bullettime: 54, lobby: 64, subway: 74, payoff: 84, end: 92,
};

export const SHOTS = [
  { name: 'terminal',  t0: 0,  t1: 12, intent: 'Phosphor CRT wakes FLOW: glyph rain of hair-strands, WAKE UP, title slam.' },
  { name: 'contact',   t0: 12, t1: 20, intent: 'Cubicle glitch whisper (TRIMNITY on glass); underpass first contact; THE HAIRTRIX HAS YOU.' },
  { name: 'construct', t0: 20, t1: 34, intent: 'White void: two pills offered, red taken; mirror bursts; wake in the cold-blue pod farm.' },
  { name: 'dojo',      t0: 34, t1: 44, intent: 'Spar vs MOUSSE-PHEUS; palm-strike hit-stop; the comb bends — THERE IS NO FOLLICLE.' },
  { name: 'jumpprog',  t0: 44, t1: 48, intent: 'Rooftop jump program: run, apex hang between towers, hard landing on the far ledge.' },
  { name: 'rooftense', t0: 48, t1: 54, intent: 'Five bald suits wall FLOW in; SMIRK fronts the line; the tracer wave is fired.' },
  { name: 'bullettime',t0: 54, t1: 64, intent: 'World freezes on the volley; 320° parametric orbit around hanging bullets + hair-part trails; resume whip.' },
  { name: 'lobby',     t0: 64, t1: 74, intent: 'Trench-coat entry; pillar shootout; cartwheel to cover; shells and stone dust rain.' },
  { name: 'subway',    t0: 74, t1: 84, intent: 'Platform standoff; the thousand-clippers line; the express clips SMIRK; re-skinned passenger.' },
  { name: 'payoff',    t0: 84, t1: 92, intent: 'Hand rises, volley freezes and drops dead; FLOW lifts off hair-first; FREE YOUR HAIR.' },
];

// ---- music grid -------------------------------------------------------------------------------
export const SECTION = { terminal: 0, contact: 12, construct: 20, dojo: 34, jumpprog: 44,
                         roof: 48, bullettime: 54, lobby: 64, subway: 74, payoff: 84 };
export const BPM  = { terminal: 80, contact: 120, construct: 120, dojo: 120, jumpprog: 120,
                      roof: 120, bullettime: 120, lobby: 120, subway: 120, payoff: 120 };
export const METER = Object.fromEntries(Object.keys(SECTION).map(k => [k, [4, 4]]));
// bar length in film seconds — terminal 3, everything else 2 (all clean decimals)
export const BAR  = Object.fromEntries(Object.keys(SECTION).map(k => [k, k === 'terminal' ? 3 : 2]));
export const BEAT = Object.fromEntries(Object.keys(SECTION).map(k => [k, BAR[k] / 4]));

export function sectionAt(t) {
  let cur = 'terminal';
  for (const n of Object.keys(SECTION)) if (t >= SECTION[n]) cur = n;
  return cur;
}
export const barStart = (sec, i = 0) => SECTION[sec] + i * BAR[sec];          // i 0-indexed
export const beatT    = (sec, bar, beat) => barStart(sec, bar - 1) + (beat - 1) * BEAT[sec];

// ---- hit-stop warp clock (exactly the proven choreo pattern) ----------------------------------
// Impact lands at freeze START; effects run on real film time inside the freeze; shake/flash
// always on film time. Composer schedules via filmT(g) only.
export const G_DOJO   = 40.0;   // palm strike (film 40.0 — dojo bar 4 downbeat)
export const G_FREEZE = 54.82;  // bullet-time entry (film 55.0 — bullettime bar 1 beat 3)
export const G_CART   = 60.42;  // cartwheel landing (film 68.6)
export const G_PILLAR2= 61.68;  // center pillar chewed (film 70.0 — lobby bar 4 downbeat)
export const G_TRAIN  = 71.48;  // express clips SMIRK (film 80.0 — subway bar 4 downbeat)
export const G_VOLLEY = 76.13;  // payoff volley freezes (film 85.0 — payoff bar 1 beat 3)

export const STOPS = [
  { g: G_DOJO,    d: 0.18 },   // palm strike sends FLOW across the mats
  { g: G_FREEZE,  d: 8.0  },   // BULLET TIME — the world hangs for 8 s while the camera orbits
  { g: G_CART,    d: 0.14 },   // cartwheel plants behind the marble pillar
  { g: G_PILLAR2, d: 0.2  },   // pillar chunks + shells rain
  { g: G_TRAIN,   d: 0.35 },   // train front slams through frame, headlight white-out
  { g: G_VOLLEY,  d: 1.1  },   // the payoff volley hangs while FLOW walks through it
];
export const G_END = 82.03;     // last world second; filmT(G_END) = 92.0

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

// The two long freezes as first-class objects (resume beats use film1):
export const FREEZES = {
  bullet: { g: G_FREEZE, d: 8.0, film0: 55.0, film1: 63.0, note: 'bullet-time orbit' },
  volley: { g: G_VOLLEY, d: 1.1, film0: 85.0, film1: 86.1, note: 'payoff hand-raise freeze' },
};

// ---- event tables (WORLD seconds g unless listed in EV_FILM_KEYS; film = filmT(g)) ------------
// TERMINAL (film 0–12): black + phosphor CRT; glyph rain of hair-strand characters.
export const TERMINAL_EV = {
  crtOn:      0.6,   // film 0.6  — scanlines wake, columns of glyphs begin to fall
  wakeUp:     1.4,   // film 1.4  — "WAKE UP, FLOW…" types onto the screen
  hareLine:   5.6,   // film 5.6  — "FOLLOW THE WHITE HARE." types; rain brightens
  rainStorm:  7.0,   // film 7.0  — glyph rain doubles + accelerates
  titleSlam:  9.2,   // film 9.2  — THE HAIRTRIX slams on the braam
  glitchOut: 11.2,   // film 11.2 — CRT tears, columns smear upward
  cutOut:    11.9,   // film 11.9 — one white scanline collapses the screen to black
};

// CONTACT (film 12–20): cubicle glitch whisper; the underpass; first contact.
export const CONTACT_EV = {
  deskGlitch:   12.6,  // film 12.6 — FLOW's monitor hiccups green
  screenWhisper:13.6,  // film 13.6 — TRIMNITY's words crawl across the glass
  boothBlack:   16.2,  // film 16.2 — screen dies to black; power-down whoosh
  underpassIn:  16.8,  // film 16.8 — hard cut: sodium-lit underpass, car idling
  mousseIn:     17.0,  // film 17.0 — MOUSSE-PHEUS steps out beside the car
  hasYou:       17.4,  // film 17.4 — "THE HAIRTRIX HAS YOU." lands on the sting
  carDoor:      19.2,  // film 19.2 — rear door opens, white interior glow
  cutWhite:     19.9,  // film 19.9 — screen-flood to white (Construct)
};

// CONSTRUCT (film 20–34): white void → pills → mirror → pod farm.
export const CONSTRUCT_EV = {
  whiteIn:      20.3,  // film 20.3 — the white void resolves: two chairs, one table
  pillsOffered: 22.0,  // film 22.0 — MOUSSE-PHEUS opens his palm: red + blue
  choiceReach:  23.4,  // film 23.4 — push-in; FLOW's hand enters frame
  redTaken:     24.6,  // film 24.6 — the red (growth serum) leaves his palm
  blueFade:     25.2,  // film 25.2 — the blue dissolves mid-air, world ripples
  mirrorLiquid: 26.2,  // film 26.2 — the standing mirror's surface goes liquid
  mirrorBreak:  27.4,  // film 27.4 — liquid bursts THROUGH the frame (white flash)
  podFall:      28.0,  // film 28.0 — falling through dark water; grade flips to cold blue
  podWake:      29.0,  // film 29.0 — eyes open inside the pod, fluid drains
  podsWide:     30.2,  // film 30.2 — wide: infinite bald farm pods receding
  hoverIn:      31.2,  // film 31.2 — hovercraft floodlight cones down from above
  welcomeSay:   31.8,  // film 31.8 — "WELCOME TO THE REAL WORLD."
  whiteOutEv:   33.8,  // film 33.8 — floodlight blows out to white (cut to dojo)
};

// TRAINING (film 34–44): dojo spar, the comb bend.
export const TRAINING_EV = {
  dojoIn:    34.6,   // film 34.6  — dojo; both bow
  sparStart: 36.4,   // film 36.4  — circling, first exchanges
  combo1:    37.8,   // film 37.8  — FLOW's flurry; MOUSSE-PHEUS doesn't move his feet
  dojoHit:   G_DOJO, // film 40.0  — STOP 0.18: palm strike, FLOW skids across the mats
  recoil:    40.3,   // film 40.48 — FLOW slides to rest, mat dust
  combRaise: 41.4,   // film 41.58 — MOUSSE-PHEUS raises the comb
  combBend:  42.0,   // film 42.18 — the comb's tines curl like soft plastic
  cutRoof:   47.8,   // film 47.98 — (shared tail key) cut to the roof
};

// JUMPPROG (film 44–48): the jump program.
export const JUMPPROG_EV = {
  jumpCut:  44.2,   // film 44.38 — two tower roofs, one impossible gap
  runUp:    44.6,   // film 44.78 — FLOW sprints the near roof
  jumpApex: 46.2,   // film 46.38 — apex hang between towers, coat flare
  jumpLand: 47.4,   // film 47.58 — hard landing on the far ledge, skid
};

// ROOFTENSE (film 48–54): five balds wall him in; the wave is fired.
export const ROOFTOP_EV = {
  roofIn:     48.3,  // film 48.48 — night rooftop, city grid behind
  wallIn:     49.2,  // film 49.38 — four clones step out of the stairwell glow
  smirkFront: 50.0,  // film 50.18 — SMIRK walks to the front of the line
  waveAim:    51.0,  // film 51.18 — five pistols level at FLOW
  waveFire:   51.8,  // film 51.98 — muzzle flashes; the tracer wave crawls across
};

// BULLETTIME (film 54–64): THE signature shot. Freeze = STOPS[1] (film 55.0–63.0).
// orbitStart/orbitEnd are FILM seconds — the camera is choreography, not world time.
export const BULLETTIME_EV = {
  bulletFreezeStart: G_FREEZE, // film 55.0 — world hangs: bullets, rain, smoke all suspended
  smirkTrack: 55.6,   // FILM — agent heads begin slowly tracking the camera (rt-driven)
  orbitStart: 55.6,   // FILM — the 320° sweep begins
  orbitEnd:   62.6,   // FILM — sweep settles behind FLOW's shoulder
  bulletFreezeEnd: 63.0, // FILM — resume: world snaps back to 1:1
  whipPast:   54.95,  // film 63.13 — tracers scream past FLOW's ear (world motion)
  snapUp:     54.9,   // film 63.08 — FLOW snaps upright out of the back-bend
  dodgeSettle:55.5,   // film 63.68 — he settles, coat cracks
  parapetChew:55.6,   // film 63.78 — rounds chew the parapet behind him, sparks
};

// LOBBY (film 64–74): pillar shootout.
export const LOBBY_EV = {
  lobbyEntry:    56.32,  // film 64.5  — glass doors burst; FLOW + TRIMNITY in trench coats
  deskLine:      57.22,  // film 65.4  — clone line rises behind the desk and columns
  pillarHit1:    57.82,  // film 66.0  — first pillar chews, dust
  crossFire:     58.82,  // film 67.0  — trading fire across the hall
  cartwheel:     59.72,  // film 67.9  — FLOW cartwheels behind the center pillar
  cartwheelLand: G_CART, // film 68.6  — STOP 0.14: the landing plants
  pillarHit2:    G_PILLAR2, // film 70.0 — STOP 0.2: center pillar gutted, chunks + shells rain
  pillarHit3:    62.98,  // film 71.5  — third pillar chews
  stairSprint:   64.28,  // film 72.8  — both sprint the hall for the stairwell
  lobbyExitCut:  65.28,  // film 73.8  — smash cut on the sprint
};

// SUBWAY (film 74–84): standoff, the clippers line, the train clip, the re-skin.
export const SUBWAY_EV = {
  subwayArrival:   66.08, // film 74.6  — express roars through WITHOUT stopping; wind + papers
  platformStandoff:67.08, // film 75.6  — FLOW vs SMIRK across the tiles
  clippersSay:     67.68, // film 76.2  — "YOU HEAR THAT, MR. FLOW? …"
  shadesOff:       68.08, // film 76.6  — SMIRK removes his shades: disrespect
  duelDash:        70.6,  // film 79.12 — FLOW dashes; they grapple mid-platform
  grapple:         70.98, // film 79.5  — locked, feet skidding toward the edge
  trainClip:       G_TRAIN, // film 80.0 — STOP 0.35: next express slams through frame, clips SMIRK
  expressClear:    72.13, // film 81.0  — metal wall gone; FLOW alone in the wind
  localStops:      72.73, // film 81.6  — the local glides in and halts
  doorsOpen:       73.23, // film 82.1  — doors chime and part
  reskinReveal:    73.63, // film 82.5  — passengers file out; one BALD head turns — him again
  narrowEyes:      74.53, // film 83.4  — FLOW's eyes narrow; cut
};

// PAYOFF (film 84–92): hand raise, bullets drop, liftoff, end card.
export const PAYOFF_EV = {
  swarmIn:       75.33,  // film 84.2 — fresh Cabald swarm fans onto the roof
  swarmFire:     75.53,  // film 84.4 — the volley cracks
  handRaise:     75.83,  // film 84.7 — FLOW turns, raises one hand
  volleyFreeze:  G_VOLLEY, // film 85.0 — STOP 1.1: the volley hangs mid-air
  bulletsDrop:   86.1,   // FILM — resume: every hanging bullet drops dead to the roof
  brassClatter:  76.73,  // film 86.7 — brass rains and settles
  crouch:        76.93,  // film 86.9 — FLOW crouches
  liftoff:       77.43,  // film 87.4 — he rockets upward, hair streaming
  skyStreak:     78.63,  // film 88.6 — a rising streak + green contrail
  endcard:       78.63,  // film 88.6 — FREE YOUR HAIR fades up over the sky
  fadeOut:       81.03,  // film 91.0 — picture fades to black
};

// Flat registry (keys unique across tables) + the film-domain key list.
export const EV_FILM_KEYS = ['smirkTrack', 'orbitStart', 'orbitEnd', 'bulletFreezeEnd',
                             'bulletsDrop', 'pluckBullet'];
const REG = {};
for (const table of [TERMINAL_EV, CONTACT_EV, CONSTRUCT_EV, TRAINING_EV, JUMPPROG_EV,
                     ROOFTOP_EV, BULLETTIME_EV, LOBBY_EV, SUBWAY_EV, PAYOFF_EV])
  for (const [k, v] of Object.entries(table)) REG[k] = v;
export const EVENTS = REG;   // name → world g (or FILM seconds for EV_FILM_KEYS)
export const pluckBullet = 85.8;                  // FILM — FLOW plucks one hanging bullet (rt)
EVENTS.pluckBullet = pluckBullet;
export const evFilm = (name) =>
  EV_FILM_KEYS.includes(name) ? EVENTS[name] : filmT(EVENTS[name]);

// ---- bullet waves (world-g driven, analytic; positions derived from EVENTS) -------------------
// x(g) = muzzle + (hang − muzzle) · seg(g, fireG, freezeG); after resume the same velocity
// carries each round past FLOW into the parapet (roof) / drops them straight down (payoff).
export const WAVE = {   // rooftop bullet-time volley (film 51.98 fire → 55.0 freeze)
  muzzleX: [712, 758, 804, 850, 892], muzzleY: [286, 280, 290, 278, 284],
  hangX:   [398, 416, 386, 430, 408], hangY:   [336, 344, 330, 348, 340],
  vPx: 139, fireG: 51.8, freezeG: G_FREEZE, resumeFilm: 63.0,
  chewTarget: { x: 300, y: 400 },   // parapet lip behind FLOW — sparks begin film ≈ 63.8
};
export const VOLLEY = { // payoff volley (film 84.4 fire → 85.0 freeze → 86.1 drop)
  muzzleX: [640, 690, 740, 800, 862], muzzleY: [276, 268, 280, 270, 274],
  hangX:   [500, 468, 442, 508, 476], hangY:   [318, 326, 308, 330, 320],
  vPx: 500, fireG: 75.53, freezeG: G_VOLLEY, resumeFilm: 86.1,
  dropG: 900, floorY: 430,          // after resume: pure gravity onto the roof
};

// ---- the orbit (FILM-time parametric camera; overrides CAM between 55.0 and 63.0) -------------
// u = seg(t, cam0, cam1); θ(t) = theta0Deg + sweepDeg·smoothstep(u); r(u) = radius0 − dip·sin(πu);
// h(u) = height + arc·sin(πu); look-at fixed. Tableau: FLOW x330 back-bent, volley hanging
// x386–430 y330–348, agent line x700–895. Parallax factors while orbiting (screen px at θ):
export const ORBIT = {
  film0: 55.0, film1: 63.0,        // world frozen (STOPS[1])
  cam0: 55.6, cam1: 62.6,          // camera sweep window (film s)
  theta0Deg: -140, sweepDeg: 320,  // starts front-left of FLOW, ends behind his shoulder
  radius0: 235, radiusDip: 25,     // slow mid-orbit push
  height: 262, heightArc: 14,      // rises through the middle, looks slightly down on the volley
  lookAt: [415, 284],              // centroid of chest + hanging rounds
  rollDeg: 2,                      // entry whip roll, eases to 0 by cam1
  parallax: { skyline: 0.4, agents: 0.75, flow: 1.0, bullets: 1.0, rain: 1.15 },
};

// ---- contact coords (960×540 stage coords; times are law, art may refine positions) -----------
export const HIT = {
  dojo:          { x: 402, y: 376 },  // palm meets FLOW's chest
  mirrorBreak:   { x: 250, y: 300 },  // liquid bursts through the mirror frame
  freezeCentroid:{ x: 415, y: 284 },  // orbit look-at (see ORBIT)
  cartwheelLand: { x: 505, y: 432 },  // feet plant behind the center pillar
  pillar2:       { x: 500, y: 270 },  // chunk/spark origin, center pillar
  trainClip:     { x: 700, y: 300 },  // train front meets SMIRK at the edge
  pluck:         { x: 452, y: 318 },  // FLOW's fingers close on one hanging round
  volleyCentroid:{ x: 478, y: 320 },  // payoff hanging-volley centroid
};

// ---- camera keys (FILM seconds; 960×540 stage coords; k = zoom ≥ 1) ---------------------------
// Builder interpolates adjacent keys with CLAMPED smoothstep on film time. ORBIT governs
// bullettime 55.0–63.0; the two bullettime keys only bracket it (entry whip / exit settle).
export const CAM = {
  terminal:   [{ t: 0.4, x: 480, y: 270, k: 1.0 }, { t: 11.5, x: 480, y: 270, k: 1.07 }],
  contact:    [{ t: 12.4, x: 430, y: 300, k: 1.16 }, { t: 16.4, x: 430, y: 296, k: 1.2 },
               { t: 17.0, x: 480, y: 280, k: 1.0 }, { t: 19.4, x: 600, y: 286, k: 1.14 }],
  construct:  [{ t: 20.5, x: 480, y: 296, k: 1.0 }, { t: 23.4, x: 478, y: 316, k: 1.3 },
               { t: 27.2, x: 300, y: 300, k: 1.45 }, { t: 27.8, x: 480, y: 300, k: 1.12 },
               { t: 30.4, x: 480, y: 270, k: 1.0 }, { t: 33.5, x: 480, y: 280, k: 1.06 }],
  dojo:       [{ t: 34.8, x: 480, y: 290, k: 1.04 }, { t: 39.8, x: 420, y: 312, k: 1.3 },
               { t: 40.5, x: 430, y: 300, k: 1.12 }, { t: 43.6, x: 480, y: 286, k: 1.05 }],
  jumpprog:   [{ t: 44.4, x: 400, y: 310, k: 1.0 }, { t: 46.2, x: 470, y: 296, k: 1.18 },
               { t: 47.6, x: 560, y: 300, k: 1.1 }],
  rooftense:  [{ t: 48.4, x: 480, y: 284, k: 1.0 }, { t: 50.2, x: 560, y: 286, k: 1.1 },
               { t: 51.9, x: 520, y: 296, k: 1.2 }],
  bullettime: [{ t: 54.2, x: 430, y: 288, k: 1.14 }, { t: 55.0, x: 415, y: 284, k: 1.18 },
               { t: 63.0, x: 415, y: 284, k: 1.18 }, { t: 63.8, x: 480, y: 282, k: 1.0 }],
  lobby:      [{ t: 64.4, x: 220, y: 296, k: 1.12 }, { t: 65.6, x: 480, y: 290, k: 1.0 },
               { t: 68.3, x: 500, y: 320, k: 1.26 }, { t: 69.9, x: 560, y: 280, k: 1.3 },
               { t: 71.4, x: 420, y: 286, k: 1.12 }, { t: 72.9, x: 600, y: 290, k: 1.06 }],
  subway:     [{ t: 74.7, x: 520, y: 280, k: 1.04 }, { t: 76.3, x: 520, y: 292, k: 1.16 },
               { t: 79.2, x: 560, y: 300, k: 1.3 }, { t: 80.0, x: 620, y: 300, k: 1.3 },
               { t: 81.4, x: 480, y: 288, k: 1.0 }, { t: 82.5, x: 500, y: 296, k: 1.2 }],
  payoff:     [{ t: 84.4, x: 500, y: 296, k: 1.14 }, { t: 85.1, x: 478, y: 312, k: 1.3 },
               { t: 86.2, x: 478, y: 300, k: 1.12 }, { t: 87.4, x: 480, y: 250, k: 1.0 },
               { t: 89.0, x: 480, y: 200, k: 1.0 }, { t: 91.5, x: 480, y: 230, k: 1.0 }],
}; // payoff: focus climbs (y↓) as FLOW lifts — the frame empties below him

// ---- scored hard silences (FILM seconds; everything cuts into these) --------------------------
export const SILENCES = [
  { from: 39.55, to: 40.0 },   // 0.45 s — one held breath before the palm strike
  { from: 79.55, to: 80.0 },   // 0.45 s — the platform holds… then the train
  { from: 84.55, to: 85.0 },   // 0.45 s — volley cracks, dead air, the hand rises
];

// ---- flashes [film t, peak, decay] — peaks ≤ .3, decay ≤ .2 (grey-soup rule) ------------------
export const FLASHES = [
  [9.2, 0.22, 0.15],    // title slam
  [19.95, 0.2, 0.16],   // white flood into the Construct
  [27.4, 0.26, 0.16],   // mirror burst
  [40.0, 0.18, 0.12],   // palm strike
  [55.0, 0.12, 0.18],   // time-freeze bloom (subtle — the world goes glassy)
  [70.0, 0.16, 0.12],   // pillar2 chunk burst
  [80.0, 0.24, 0.18],   // train headlight wash
  [85.0, 0.14, 0.18],   // volley freeze
  [87.4, 0.1, 0.12],    // liftoff glow
];

// ---- captions (FILM seconds; drawn by the runtime on overlay, AFTER bloom/grade) --------------
// Every default-hold caption has visible window ≥ 3 s (lint default); the four short cards carry
// a reasoned per-caption minHold. Reading text sits y 872–900 (1080p overlay = 436–450 stage,
// clears the letterbox band which ends y≈471 stage); titles/cards centre 500–540.
// All style sizes ≥ 32 px at 1080p = ≥ 16 px at the 960×540 stage. Lines pre-split ≤ 42 chars.
export const CAPTIONS = [
  { id: 'wakeUp',    text: 'WAKE UP, FLOW…', t0: 1.4,  t1: 5.2,  style: 'term', y: 500 },
  { id: 'hareLine',  text: 'FOLLOW THE WHITE HARE.', t0: 5.6,  t1: 9.2,  style: 'term', y: 500 },
  { id: 'titleCard', text: 'THE HAIRTRIX', t0: 9.2,  t1: 12.0, style: 'title', y: 540, minHold: 2.6 },
  // minHold reason: slam card lands on the braam, bounded by the hard cut at 12.0; 96 px serif reads at a glance.
  { id: 'whisper',   text: 'THE HARE IS WHITE, FLOW. FOLLOW IT.', t0: 13.6, t1: 16.6, style: 'whisper', y: 880 },
  { id: 'hasYou',    text: 'THE HAIRTRIX HAS YOU.', t0: 17.4, t1: 19.8, style: 'slam', y: 540, minHold: 2.2 },
  // minHold reason: tag line lands on the contact sting, bounded by the white flood at 19.95.
  { id: 'pillsLine', text: 'RED: THE GROWTH. BLUE: THE SHINE.', t0: 22.0, t1: 24.6, style: 'dlg', y: 878, minHold: 2.4 },
  // minHold reason: two-beat choice label over the held palm; the push-in and prop labels carry the rest.
  { id: 'welcomeLine', text: 'WELCOME TO THE REAL WORLD.', t0: 30.8, t1: 33.9, style: 'dlg', y: 878 },
  { id: 'noFollicle', text: 'THERE IS NO FOLLICLE.', t0: 42.0, t1: 45.2, style: 'slam', y: 520 },
  { id: 'believe',   text: 'THE COMB-ONE BEGINS TO BELIEVE.', t0: 58.8, t1: 62.0, style: 'whisper', y: 880 },
  { id: 'lobbyNarr', text: 'TWIN TRENCH COATS. ONE MARBLE HALL.', t0: 64.6, t1: 67.8, style: 'narr', y: 878 },
  { id: 'clippersLine', text: 'YOU HEAR THAT, MR. FLOW?\nTHAT IS THE SOUND OF A THOUSAND CLIPPERS.', t0: 76.2, t1: 79.9, style: 'dlg', y: 872 },
  { id: 'endCard',   text: 'FREE YOUR HAIR', t0: 88.6, t1: 91.8, style: 'title', y: 540 },
  { id: 'slate',     text: 'A REMY BOYS PICTURE', t0: 89.8, t1: 91.8, style: 'endSlate', y: 620, minHold: 1.8 },
  // minHold reason: credit sub-line under the end card; secondary type, fades with the picture.
];
export const CAPS = CAPTIONS;  // alias

// Recommended captionStyles for film.js (literal strings; coords are 1080p overlay; glow/shadow
// live ONLY here — per-caption glow is silently ignored by filmkit):
export const CAP_STYLES = {
  term:   { font: '"Press Start 2P"', weight: 400, size: 32, color: '#54ff8e', align: 'center',
            x: 960, track: 2, anim: 'fade', in: 0.25, out: 0.35, shadow: '#03170a',
            glow: '#0b3a1c', glowBlur: 14 },
  title:  { font: 'Anton', weight: 400, size: 96, color: '#c8ffdb', align: 'center', x: 960,
            track: 10, anim: 'rise', rise: 20, in: 0.5, out: 0.4,
            glow: '#03170a', glowBlur: 30 },
  slam:   { font: 'Anton', weight: 400, size: 100, color: '#eef8ee', align: 'center', x: 960,
            track: 4, anim: 'cut', in: 0, out: 0.25, glow: '#03170a', glowBlur: 30 },
  dlg:    { font: '"Pixelify Sans"', weight: 600, size: 40, color: '#dcf6e2', align: 'center',
            x: 960, lineHeight: 1.2, track: 0.5, anim: 'fade', in: 0.25, out: 0.25,
            shadow: '#04140a' },
  narr:   { font: '"Pixelify Sans"', weight: 400, size: 34, color: '#a9d9b6', align: 'center',
            x: 960, lineHeight: 1.2, track: 0.5, anim: 'rise', in: 0.35, out: 0.35,
            shadow: '#04140a' },
  whisper:{ font: '"Pixelify Sans"', weight: 400, size: 34, color: '#8fd2a2', align: 'center',
            x: 960, track: 1, anim: 'fade', in: 0.5, out: 0.5, shadow: '#04140a',
            glow: '#0b3a1c', glowBlur: 12 },
  endSlate: { font: '"Pixelify Sans"', weight: 400, size: 32, color: '#9fc0aa', align: 'center',
            x: 960, track: 4, anim: 'fade', in: 0.3, out: 0.4, shadow: '#04140a' },
};

// ---- NOTES: convention + score guidance + auto-derived event→film/bar:beat map ----------------
const REG2 = {};
for (const [k, v] of Object.entries(EVENTS)) REG2[k] = v;
export const NOTES = {
  convention: 'EVENTS + *_EV + STOPS are WORLD seconds unless the key is in EV_FILM_KEYS '
    + '(film seconds: ' + EV_FILM_KEYS.join(', ') + '). film = filmT(g); resume of a freeze at g '
    + 'is FREEZES.*.film1, not filmT(g). Grid, CAPTIONS, CAM, SILENCES, FLASHES, ORBIT are FILM seconds. '
    + 'Composer schedules only via filmT(g)/beatT/barStart + FREEZES.',
  silences: SILENCES,
  freezes: FREEZES,
  orbit: ORBIT,
  events: Object.entries(REG2).map(([name, g]) => {
    const film = EV_FILM_KEYS.includes(name) ? g : filmT(g);
    const s = sectionAt(film), rel = film - SECTION[s];
    const bar = Math.floor(rel / BAR[s]);
    const beat = (rel - bar * BAR[s]) / BEAT[s] + 1;
    return { name, g, film, section: s, bar: bar + 1, beat: Math.round(beat * 1000) / 1000,
             domain: EV_FILM_KEYS.includes(name) ? 'film' : 'world' };
  }),
  sections: {
    terminal:  '80 BPM 4/4 (3 s bars): sub drone + CRT tick grid; title braam at 9.2; glitch tear 11.2; one white scanline out at 11.9.',
    contact:   '120 BPM begins 12.0: muted pulse; whisper shimmer 13.6; power-down whoosh 16.2; walking bass under the underpass; sting on hasYou 17.4.',
    construct: 'weightless — no drums; heartbeat at redTaken 24.6; detuned shimmer at mirrorLiquid 26.2; boom at mirrorBreak 27.4; cold choir pads under the pod farm; warm root at welcomeSay 31.8.',
    dojo:      'percussive spar groove; HARD SILENCE 39.55–40.0; palm impact 40.0 rings through the 0.18 s freeze; sparse bell under the comb bend; riser toward the jump cut.',
    jumpprog:  'riser 44.4 → apex 46.2 (all suspended), heavy landing 47.58, one bar of near-quiet.',
    roof:      'tight ostinato + ticking hats; gun cocks 51.18; five cracks 51.98; a time-stretch effect INTO the freeze.',
    bullettime:'55.0–63.0 drums suspend: weightless pad + slow siren sweep synced to the orbit (half-sweep ≈ film 59.1 = motif peak); resume 63.0 slams the full band back on the drop.',
    lobby:     'industrial double-time feel; shell sprinkles under fire; pillar2 slam on the 70.0 downbeat; sprint riser into the smash cut.',
    subway:    'dark bluesy riff; clippers buzz UNDER clippersSay 76.2–79.9; HARD SILENCE 79.55–80.0; train impact 80.0 (0.35 s freeze) with metal scream; hollow after expressClear 81.0; one dry footstep on reskinReveal 82.5.',
    payoff:    'volley cracks 84.4; HARD SILENCE 84.55–85.0; sub-bed under the 1.1 s freeze; a thousand brass drops 86.1–86.9 (granular clatter grid); riser → liftoff whoosh 87.4; endcard braam 88.6; pad fades from 91.0.',
  },
};
