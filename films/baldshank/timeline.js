// THE BALDSHANK REDEMPTION — timeline.js. Cue sheet + choreography spine: the ONE
// shared source of truth that picture (film.js/art.js), score (score.js) and QA all
// import. 101.0 s, 1920x1080@60, painted 2D stage, letterbox 0.8. Pure functions of
// time; no imports, no Math.random, no Date, no state between frames. Architecture
// copied from raiders-of-the-lost-hair/timeline.js (makeClock pattern credited there
// to pirates-cabald/timeline.js).
//
// SCENE MAP: S1 arrival+intake 0-17.6 | TITLE 17.6-20.8 | S2 yard+comb 20.8-32.4 |
// S3 the aria 32.4-48.9 | S4 years pass 48.9-57.6 | S5 storm escape 57.6-80.96
// (BOTH hit-stops) | S6 morning+beach 80.96-101.
//
// CAST (casting.md final table; ids verified on reviewed contact sheets):
//   42    ANDY FLOWFRESNE  hero       Crimson Flow  (sword -> tiny rock-comb; shirt ->
//                                                 denim; BALD-CAP RIP payoff)
//   324   RED              narrator   Copper Crown  (ELLIS BOYD FLOWDING nameplate;
//                                                 OPTIMISM print -> denim)
//   452   WARDEN BALDTON   Cabald     Midnight Soul (tux; card-fan strip)
//   2529  CAPTAIN HADBALD  Cabald     Midnight Soul (leather collar; runs shave room)
//   246   BROOKS           elderly    Silver Crown  (librarian; PILL print -> cardigan)
//   80/237/252/63/56/192     yard inmates x6         (shirts -> prison denim)
//   3807/1558/2862           Cabald guards x3        (-> gray guard uniforms)
//   Posters: 825 RITA HAIRWORTH | 12 FLOWLYN MONROE | 139 RAQUEL MANE
//
// CLOCK RULE (load-bearing): story.md/punchup.md beat times are GLOBAL seconds in the
// PRE-STOP world domain (g). The film's two hit-stops live inside S5, so film time
// f = filmT(g):
//   f = g                    for g <= 67.2        (pre-stop: S1, TITLE, S2, S3, S4,
//                                                 S5 through the rock throw)
//   f = g + 0.20             for 67.2 < g <= 78.1 (after HIT-STOP 1: tunnel insert,
//                                                 crawl, creek emergence, rip onset)
//   f = g + 0.46             for g > 78.1         (after HIT-STOP 2: crimson cascade,
//                                                 morning, parole, beach)
// An event scheduled AT a stop's g lands at the START of its freeze (house rule).
// Effects (rain/lightning/flash) age on real film t; actors resolve g = warp(t).g.
// Freeze windows in film time: STOP 1 [67.20, 67.40), STOP 2 [78.30, 78.56)
// (filmT(78.1) = 78.30 — stop 1's 0.20 s accumulates into every later film time).
// INVARIANT enforced by the self-check: every exported beat satisfies f === filmT(g).
//
// DEVIATION LOG (empty at birth; all entries are ledger-driven placements):
//   1. HIT-STOP 1 at g67.2, not the briefed "~g62": punchup E0 (roll-call caption)
//      owns g62.0-65.0 and the ledger's explicit NO-CAPTION freeze window is ~67-68.5.
//      A freeze at g62 would sit under a live caption (director ruling forbids it).
//      Rock throw g67.1 -> impact/freeze g67.2 (film 67.20-67.40) -> peel g67.3.
//   2. HIT-STOP 2 at g78.1, not the briefed "~g74": punchup C1 (crawl) holds
//      g72.0-75.0 and G1 is MANDATED to "start on the rip freeze" at g78.1. A freeze
//      at g74 lands mid-crawl under a caption. E1 clears as the rip grabs (film
//      78.10); G1 lands on the freeze onset filmT(78.1) = 78.30 and rides through
//      release (film 78.30-81.76).
//   3. F1's ledger window 94.8-101.0 is FILM-domain (runs to the last frame; mapping
//      its g-endpoints would end at 101.46 > duration). Kept verbatim in film time;
//      every other caption is converted g -> film through filmT.
//   4. Story's S1 bald-cap "quiet reveal" (bolded, 15-18) is squeezed by locked W1
//      (14.4-17.6) + T1 (17.8-20.8): folded into s1d as a cell cutaway, peel g17.05,
//      crimson sliver g17.25, rat audience-wink g17.45. Title untouched.
//   5. S3 zone flexed to g48.9 (story said 32-44): punchup A3 note mandates "burst
//      ~45, screenwriter flex"; guard burst-in g45.0, DRY ROOM punchline to g48.8.
//   6. Y3 (seasons wipe, story S4) plays in s5a: punchup's own gag-list zones put S5
//      at g58-80, and L1's declared spansCut pins the S4/S5 scene cut at g57.6.
//   Captions: punchup strings verbatim; g-windows converted through filmT; six
//   waiver cards (TK1/SUB1/E1/P1/F1/SC1) exactly as the ledger flags them.

export const DURATION = 101.0

// ---------- the shared clock (makeClock pattern, pirates-cabald/timeline.js) ----------
export const STOP1_G = 67.2                        // HIT-STOP 1: rock through the RITA poster, hollow thunk
export const STOP2_G = 78.1                        // HIT-STOP 2: the bald-cap rip at the creek (money shot)
export const STOPS = [
  { g: STOP1_G, d: 0.2 },                          // poster hangs mid-void, bloom through freeze
  { g: STOP2_G, d: 0.26 },                         // torn cap edge mid-tear; nineteen years hang; release = cascade
]
export function makeClock(t0, stops = []) {
  const warp = (ts) => {                           // FILM time -> { g, stop, sl }
    let acc = 0
    for (const s of stops) {
      const rs = s.g + acc
      if (ts < rs) return { g: ts - acc, stop: null, sl: 0 }
      if (ts < rs + s.d) return { g: s.g, stop: s, sl: ts - rs }
      acc += s.d
    }
    return { g: ts - acc, stop: null, sl: 0 }
  }
  const filmT = (g) => {                           // PRE-STOP world g -> FILM time
    let acc = 0
    for (const s of stops) if (s.g < g) acc += s.d
    return g + acc
  }
  return { t0, stops, warp, filmT, abs: (g) => t0 + filmT(g) }
}
export const CLOCK = makeClock(0, STOPS)           // the ONE film clock (t0 = 0)
export const warp = CLOCK.warp                     // warp(filmT) -> { g, stop, sl }
export const filmT = CLOCK.filmT                   // filmT(g) -> film seconds

// ---------- letterbox-safe stage (letterbox 0.8 -> ~110.7 px bars) ----------
export const W = 1920, H = 1080
export const SAFE = { letterbox: 0.8, bandY: [111, 969], captionYMax: 915, xMin: 0, xMax: 1920 }
export const GROUND = 940                          // default feet line (inside the band)
export const GROUNDS = { s1: 940, title: 930, s2: 940, s3: 900, s4: 880, s5: 920, s6: 940 }
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const seg = (t, a, b) => clamp01((t - a) / (b - a))
export const lerp = (a, b, p) => a + (b - a) * p
export const clampBandY = (y) => Math.min(SAFE.bandY[1], Math.max(SAFE.bandY[0], y))
export const clampBlocking = (x, y) => [Math.min(SAFE.xMax, Math.max(SAFE.xMin, x)), clampBandY(y)]
export const ease = {
  outCubic: (p) => 1 - (1 - p) ** 3,
  inQuad: (p) => p * p,
  ioSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
}

// ---------- SHOTS (film seconds; contiguous, cover [0, 101) exactly) ----------
export const SHOTS = [
  { name: 's1a', t0: 0.0, t1: 4.0, desc: 'rain bus over the hills: parallax ridges, gray walls, searchlights; bus L->R, K1' },
  { name: 's1b', t0: 4.0, t1: 9.0, desc: 'gates + yard: new fish line up heads bowed under guard flank; RED VO N1' },
  { name: 's1c', t0: 9.0, t1: 14.4, desc: 'SHAVE ROOM money shot 1 (5.4s): clippers march L->R, hair falls like snow, one guard holds a tiny umbrella; Hadbald loupe squint; HAIR: N/A stamp insert g13.9' },
  { name: 's1d', t0: 14.4, t1: 17.6, desc: 'warden welcome speech, flip-chart TWO THINGS; cutaway cell night: quiet BALD-CAP peel g17.05, crimson sliver, rat audience-wink g17.45' },
  { name: 'title', t0: 17.6, t1: 20.8, desc: 'TITLE: yard at dusk, THE BALDSHANK REDEMPTION line type-on 18.1-18.9 + kicker' },
  { name: 's2a', t0: 20.8, t1: 26.2, desc: 'yard croquet/dominos: hero + RED first trade; bent shed-tuft wicket gag; N5' },
  { name: 's2b', t0: 26.2, t1: 29.5, desc: 'comb deal close-up: rock-comb held to one eye like a jeweler, domino beside it reads BIGGER; hollow-domino shake, handover g28.6' },
  { name: 's2c', t0: 29.5, t1: 32.4, desc: 'RITA HAIRWORTH poster pin-up, mane painted fuller; guard magnifier inspects HER mane, never the wall; shrugs' },
  { name: 's3a', t0: 32.4, t1: 35.6, desc: "warden's office: door locks, needle drop g33.2, aria rises; SUB1 translation flash" },
  { name: 's3b', t0: 35.6, t1: 39.2, desc: 'ARIA YARD HOLD money shot 2 (3.6s): every shaved head tilts up, sprinkler mist rainbow arcs off the PA speaker' },
  { name: 's3c', t0: 39.2, t1: 42.3, desc: 'hero leans back, feet on desk, eyes closed; pigeon returns on the next phrase' },
  { name: 's3d', t0: 42.3, t1: 45.4, desc: 'aria back-half: guard sprints, slips on S1 hair-snow (callback), surfs into the office door; burst-in g45.0, needle skitters' },
  { name: 's3e', t0: 45.4, t1: 48.9, desc: 'THE DRY ROOM: solitary plate, conditioner slot welded shut; A4 punchline' },
  { name: 's4a', t0: 48.9, t1: 52.1, desc: 'library origin: broom closet -> FLOW LIBRARY ghost paint, wet paint drips on Brooks; Jake the crow comb-over in fan draft' },
  { name: 's4b', t0: 52.1, t1: 55.3, desc: 'BROOKS WAS BALD carved beam farewell, gentle not grim; Brooks exits, crow perches' },
  { name: 's4c', t0: 55.3, t1: 57.6, desc: 'ledger close-up CLIP & SHIP: page turns, NO. 42 SHED NONE ON FILE; warden squints, shrugs, pockets sack anyway' },
  { name: 's5a', t0: 57.6, t1: 62.0, desc: 'seasons wipe over cell wall: growth chart climbs FUZZ->FLOW, posters RITA->FLOWLYN->RAQUEL each half-inch higher; thunder gathers' },
  { name: 's5b', t0: 62.0, t1: 65.4, desc: 'morning roll call: one cell EMPTY (reveal g63.0), warden rage builds' },
  { name: 's5c', t0: 65.4, t1: 68.9, desc: 'ROCK THROUGH POSTER money shot 3 (3.5s): rock volley, Bible hollow finger-poke gets stuck, hurl g67.1, HIT-STOP 1 g67.2 hollow thunk, poster peel -> hair-lined tunnel reveal' },
  { name: 's5d', t0: 68.9, t1: 72.1, desc: 'tunnel insert montage: 19 years of nightly comb-digging, one shed-lined inch at a time; DAY 6,839 tally, commuting rat' },
  { name: 's5e', t0: 72.1, t1: 75.3, desc: 'the crawl: 500 yards of shed-river pipe, silhouette crawl L->R, hair walls glisten' },
  { name: 's5f', t0: 75.3, t1: 80.96, desc: 'CREEK + RIP money shot 4 (5.66s): emerge in rain shirt torn, arms up, lightning g76.9, BALD-CAP RIP HIT-STOP 2 g78.1, nineteen years of crimson cascade downwind, settle' },
  { name: 's6a', t0: 80.96, t1: 85.3, desc: 'dawn: FLOW DAILY BUGLE CLIPPINGS-GATE slams on the rack, sirens, pigeon reads rack copy; EXHIBIT A-1 clippers bag' },
  { name: 's6b', t0: 85.3, t1: 87.95, desc: 'parole hearing: ELLIS BOYD FLOWDING nameplate, board question P1' },
  { name: 's6c', t0: 87.95, t1: 91.2, desc: "RED's answer P2, APPROVED-FLOW stamp slam g89.9, comb-shaped ink smudge held to camera" },
  { name: 's6d', t0: 91.2, t1: 93.0, desc: 'beam bookend: RED carves SO WAS RED. under BROOKS WAS BALD; camera holds (A-gag)' },
  { name: 's6e', t0: 93.0, t1: 94.8, desc: 'postcard FLOW HANCOCK: comb on beach fence, pompadour hay bale; RED walks the sandline' },
  { name: 's6f', t0: 94.8, t1: 98.2, desc: 'BEACH REVEAL money shot 5 (3.4s): hero at skiff THE FLOW IS GOOD, full mane catches the wind; F1 begins' },
  { name: 's6g', t0: 98.2, t1: 101.0, desc: 'reunion wide: crimson + silver manes in the wind, slow fade, waves; end sting under F1' },
]

// ---------- scenes (film bounds; g bounds = the pre-stop world domain) ----------
export const SCENES = [
  { name: 's1', f0: 0.0, f1: 17.6, g0: 0.0, g1: 17.6 },
  { name: 'title', f0: 17.6, f1: 20.8, g0: 17.6, g1: 20.8 },
  { name: 's2', f0: 20.8, f1: 32.4, g0: 20.8, g1: 32.4 },
  { name: 's3', f0: 32.4, f1: 48.9, g0: 32.4, g1: 48.9 },
  { name: 's4', f0: 48.9, f1: 57.6, g0: 48.9, g1: 57.6 },
  { name: 's5', f0: 57.6, f1: 80.96, g0: 57.6, g1: 80.5 },
  { name: 's6', f0: 80.96, f1: 101.0, g0: 80.5, g1: 100.54 },
]

// ---------- world layout (builder anchors; all y inside the safe band) ----------
export const YARD = {
  horizonY: 430, wallTopY: 300, wallBaseY: 690, groundY: 940,
  gateX: 240, fence: [120, 1800], speakersX: 1560, searchlights: [420, 1500],
}
export const SHAVE_ROOM = {
  lineY: 910, chairs: [420, 780, 1140, 1500], window: [1650, 1880], signY: 350,
}
export const CELL = {
  bunkX: 340, deskX: 1420, chartX: 900, beamY: 250, floorY: 920,
}
export const POSTER_RECT = { x: 1120, y: 300, w: 300, h: 400 } // RITA HAIRWORTH on the cell wall = the tunnel mouth
export const TUNNEL = { mouthX: 1120, boreMidY: 620, pipeW: 150 }
export const CREEK = { horizonY: 470, waterY: 840, banks: [180, 1740], rainSlant: 0.24 }
export const BEACH = { horizonY: 460, sandlineY: 910, skiffX: 1340, fenceX: 260 }
export const OFFICE = { deskX: 1180, deskY: 700, chairX: 1180, doorX: 300, speakerX: 1560 }
export const BUS_RIDE = { skyY: 320, ridgeY: 560, wallY: 760, roadY: 940 } // s1a parallax bands

// ---------- trajectories (pure in g; builder refines) ----------
const h1 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) } // seeded local hash
export const busX = (g) => lerp(-360, 2260, seg(g, 0.2, 3.7))          // s1a rain bus L->R
export const clipperX = (g) => lerp(360, 1560, seg(g, 9.5, 12.9))      // clippers march down the shave line
export const sprintX = (g) => lerp(1780, 320, seg(g, 43.2, 45.0))      // guard R->L into the office door
export const crawlX = (g) => lerp(-80, 2000, seg(g, 72.35, 74.6))      // silhouette crawl through the pipe
export const redSandX = (g) => lerp(220, 1120, seg(g, 94.6, 97.4))     // RED walks the sandline toward the skiff
export const ANDY_BEACH_X = 1280                                        // hero planted at the skiff

// S1 hair-snow / S5a winter callback: 24 flakes, hash-seeded, deterministic.
export const SNOW = Array.from({ length: 24 }, (_, i) => ({
  x: 80 + 1760 * h1(i + 3),
  drift: 14 + 30 * h1(i + 11),
  fall: 46 + 40 * h1(i + 23),
  ph: 6.283 * h1(i + 31),
  seed: i,
}))
export const snowY = (g, fl) => SAFE.bandY[0] + ((g * fl.fall + fl.ph * 60) % (SAFE.bandY[1] - SAFE.bandY[0]))

// ---------- event grid (E(g) keeps f === filmT(g); arrays are concurrent beats) ----------
const E = (g) => ({ g, f: filmT(g) })
export const EV_S1 = {
  busIn: E(0.4), gates: E(4.2), lineup: E(5.2),
  shaveMarch: E(9.5), shaveStrokes: [E(10.1), E(10.7), E(11.3), E(11.9)], snowPeak: E(12.5),
  loupeSquint: E(13.4), stampThunk: E(13.9), wardenEnter: E(14.6), capPeel: E(17.05),
}
export const EV_TITLE = { titleIn: E(18.1), kicker: E(18.5), titleSet: E(19.1) }
export const EV_S2 = {
  yardIn: E(21.1), firstTrade: E(22.6),
  dealOpen: E(26.5), combReveal: E(27.2), combScale: E(27.9), combHandover: E(28.6),
  posterUp: E(29.9), guardShrug: E(32.15),
}
export const EV_S3 = {
  officeIn: E(32.6), needleDrop: E(33.2), ariaStart: E(33.4),
  yardStop: E(35.6), sprinklerPass: E(36.4), yardHoldRelease: E(39.0), leanBack: E(39.6), ariaEnd: E(41.0),
  burstRun: E(43.2), burstIn: E(45.0), needleSkitter: E(45.15), dryRoom: E(46.2),
}
export const EV_S4 = {
  broomCloset: E(49.2), beamReveal: E(52.5), brooksFarewell: E(53.6),
  ledgerIn: E(55.6), pageTurns: [E(56.0), E(56.45)], noneOnFile: E(56.4), pocketSack: E(57.35),
}
export const EV_S5 = {
  seasonsWipe: E(58.0), posterSwaps: [E(59.8), E(60.6)], thunderGather: E(61.3),
  rollCall: E(62.2), emptyCell: E(63.0),
  rockOnset: E(66.95), rockThrow: E(67.1), stop1: E(STOP1_G),
  posterPeel: E(67.3), tunnelReveal: E(67.7),
  tunnelIn: E(68.95), digStrokes: [E(70.0), E(70.6), E(71.2)], tunnelOut: E(71.85),
  crawlIn: E(72.15), crawlOut: E(74.6),
  creekEmerge: E(75.45), lightningHit: E(76.9),
  capRipOnset: E(77.7), stop2: E(STOP2_G), capRipRecoil: E(78.5), cascadeSettle: E(79.4),
}
export const EV_S6 = {
  dawn: E(81.1), bugleSlam: E(81.6), sirens: E(82.4), paroleDoor: E(85.5),
  stampSlam: E(89.9), inkSmudge: E(90.2), beamBookend: E(91.4),
  postcardIn: E(93.2), sandlineWalk: E(94.2),
  beachReveal: E(95.0), windContact: E(95.9), boatNamePass: E(96.4),
  reunionWide: E(98.4), fadeStart: E(99.6),
}

// ---------- CAPS: declarative overlay captions (FILM time; builder drops into captions[]) ----------
// punchup.md strings VERBATIM; t0/t1 = filmT of the ledger g-window unless noted.
// flags mirror the ledger: short/waiver (hold), lineWaiver (per-line > 40 chars),
// spansCut (card intentionally crosses a cut; lint.info).
export const CAPS = [
  { id: 'K1', text: '1947. BALDSHANK STATE FLOWPENITENTIARY.', t0: 0.4, t1: 3.4, style: 'kicker', x: 960, y: 420, anim: 'fade', in: 0.15, out: 0.15, g: [0.4, 3.4] },
  { id: 'N1', text: 'EVERY MAN OFF THAT BUS GOT SHAVED.\nHIM TOO. ALMOST.', t0: 4.5, t1: 8.5, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [4.5, 8.5] },
  { id: 'N2', text: 'FIRST RITE: THE WELCOME SHAVE.\nHE NEVER FLINCHED. THEY NOTICED.', t0: 9.3, t1: 14.2, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [9.3, 14.2] },
  { id: 'W1', text: 'TWO THINGS: DISCIPLINE. AND THE BALD.', t0: 14.4, t1: 17.6, style: 'caption', x: 960, y: 868, anim: 'cut', in: 0, out: 0, g: [14.4, 17.6], note: 'mandated beat; 3.2 s deadpan hold, cut anim keeps it whole' },
  { id: 'T1', text: 'THE BALDSHANK REDEMPTION', t0: 17.8, t1: 20.8, style: 'title', x: 960, y: 520, anim: 'line', in: 0.7, out: 0.1, color: '#e8b23a', g: [17.8, 20.8], note: 'type-on 18.1-18.9 via EV_TITLE' },
  { id: 'TK1', text: 'A REMY BOYS PICTURE', t0: 18.2, t1: 20.6, style: 'kicker', x: 960, y: 650, anim: 'fade', in: 0.2, out: 0.1, color: '#c9c9c9', short: true, waiver: 'ledger hold 2.4 s; house kicker rides T1', g: [18.2, 20.6] },
  { id: 'N5', text: 'I ONCE KNEW A MAN WHO KEPT HOPE.\nKEPT IT WHERE NO RAZOR REACHED.', t0: 20.9, t1: 25.9, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [20.9, 25.9] },
  { id: 'N6', text: 'A COMB SO SMALL IT NEEDED A WILL.', t0: 26.4, t1: 29.4, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [26.4, 29.4] },
  { id: 'N7', text: 'GUARDS CHECK EVERYTHING. NOT POSTERS.', t0: 29.7, t1: 32.7, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, spansCut: 's2c/s3a', g: [29.7, 32.7], note: 'spans the S2->S3 zone cut per ledger' },
  { id: 'SUB1', text: "(TRANSLATION: IT'S ABOUT HAIR.)", t0: 33.8, t1: 35.4, style: 'caption', x: 960, y: 400, anim: 'cut', in: 0, out: 0, short: true, waiver: 'punchup minHold waiver: 1.6 s flash gag, small italic read', g: [33.8, 35.4] },
  { id: 'A1', text: 'EVERY SHAVED HEAD IN THE YARD TILTED UP.', t0: 35.6, t1: 38.8, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [35.6, 38.8] },
  { id: 'A2', text: 'I LIKE TO THINK IT WAS ABOUT HAIR.', t0: 39.2, t1: 42.2, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [39.2, 42.2], note: 'MANDATED verbatim (story S3)' },
  { id: 'A3', text: 'THE FINEST SHEDDING OF OUR LIVES.', t0: 42.4, t1: 45.4, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [42.4, 45.4], note: 'rides into burst-in g45.0 per ledger flex note' },
  { id: 'A4', text: 'TWO WEEKS IN THE DRY ROOM. WORTH IT.', t0: 45.8, t1: 48.8, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [45.8, 48.8] },
  { id: 'Y1', text: 'BROOKS ASKED FOR BOOKS. GOT A BROOM.', t0: 49.0, t1: 52.0, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [49.0, 52.0] },
  { id: 'Y2', text: "SOME MANES AREN'T MEANT FOR CLIPPERS.", t0: 52.2, t1: 55.2, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [52.2, 55.2] },
  { id: 'L1', text: 'EVERY CLIPPING HAD A PRICE. CASH FLOW.', t0: 55.4, t1: 58.4, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, spansCut: 's4c/s5a', g: [55.4, 58.4], note: 'spans the S4->S5 zone cut per ledger' },
  { id: 'Y3', text: 'THE POSTER AGED BETTER THAN WE DID.', t0: 58.6, t1: 61.6, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [58.6, 61.6] },
  { id: 'E0', text: 'MORNING COUNT CAME UP ONE MANE SHORT.', t0: 62.0, t1: 65.0, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [62.0, 65.0] },
  { id: 'M1', text: 'PRESSURE, TIME, AND ONE TINY COMB.', t0: 69.0, t1: 72.0, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [68.8, 71.8], note: 'film 69.0-72.0 = filmT(g)' },
  { id: 'C1', text: 'FIVE HUNDRED YARDS OF SHED. LITERALLY.', t0: 72.2, t1: 75.2, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [72.0, 75.0] },
  { id: 'E1', text: 'AND HE CAME OUT CLEAN.', t0: 75.5, t1: 78.1, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, short: true, waiver: 'punchup minHold waiver 2.6 s; ends exactly at rip-freeze onset', g: [75.3, 77.9] },
  { id: 'G1', text: 'GET BUSY GROWING. OR GET BUSY BALDING.', t0: filmT(STOP2_G), t1: filmT(81.3), style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, spansCut: 's5f/s6a', g: [78.1, 81.3], note: 'MANDATED verbatim; starts ON the rip freeze (film 78.30), holds through release' },
  { id: 'M2', text: 'MORNING DELIVERY. EXTRA CRUNCHY.', t0: 82.16, t1: 85.16, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [81.7, 84.7] },
  { id: 'P1', text: 'REHABILITATED?', t0: 85.46, t1: 87.86, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.15, out: 0.15, short: true, waiver: 'punchup minHold waiver 2.4 s dramatic beat', g: [85.0, 87.4] },
  { id: 'P2', text: "IT'S JUST A WORD. SO IS FLOW.", t0: 88.06, t1: 91.06, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, g: [87.6, 90.6], note: 'MANDATED verbatim' },
  { id: 'F1', text: 'FLOW IS A GOOD THING, MAYBE THE BEST OF THINGS,\nAND NO GOOD THING EVER DIES.', t0: 94.8, t1: 101.0, style: 'title', x: 960, y: 500, anim: 'line', in: 0.5, out: 0.1, size: 60, lineHeight: 1.25, color: '#e8b23a', lineWaiver: 'line 1 = 47 chars; punchup <=80-char lint waiver (raiders C7 precedent)', waiver: 'film-domain window per punchup (g-mapping would end 101.46 > duration)', spansCut: 's6f/s6g', note: 'LOCKED verbatim, coordinator mandate; over the reunion fade' },
  { id: 'SC1', text: 'NO REMYS WERE SHAVED\nIN THE MAKING OF THIS FILM.', t0: 98.6, t1: 101.0, style: 'kicker', x: 960, y: 680, anim: 'fade', in: 0.2, out: 0.1, color: '#c9c9c9', short: true, waiver: 'end-sting holds 2.4 s under F1 (TK1 precedent); punchup 6 locked string' },
]

// F1 fallback ONLY if the <=80-char waiver is denied (punchup, 3 sequential cards,
// each minHold-waived). Film-domain windows verbatim from the ledger.
export const F1_FALLBACK = [
  { id: 'F1a', text: 'FLOW IS A GOOD THING,', t0: 94.6, t1: 96.6, waiver: 'minHold' },
  { id: 'F1b', text: 'MAYBE THE BEST OF THINGS.', t0: 96.7, t1: 98.7, waiver: 'minHold' },
  { id: 'F1c', text: 'AND NO GOOD THING EVER DIES.', t0: 98.8, t1: 101.0, waiver: 'minHold' },
]

// ---------- DRAWN text (NOT overlay captions; windows exported for score/draw sync) ----------
export const DRAWN = [
  { id: 'B1', text: 'BROOKS WAS BALD', g0: 52.4, g1: 55.2, f0: filmT(52.4), f1: filmT(55.2), how: 'carved beam, s4b; carve-reveal anim; QA as text' },
  { id: 'B2', text: 'SO WAS RED.', g0: 91.6, g1: 92.5, f0: filmT(91.6), f1: filmT(92.5), how: 'bookend carve under B1, s6d; camera holds; QA as text' },
]

// ---------- SIGNAGE / prop text reference (punchup.md section 3, verbatim; drawn, not overlay) ----------
export const SIGNAGE = [
  { id: 'POSTER_RITA', text: 'RITA HAIRWORTH / VOLUME.', where: 'cell wall s2->s5; crimson = hidden-hair promise' },
  { id: 'POSTER_FLOWLYN', text: 'FLOWLYN MONROE / WAVE.', where: 's4 rotation slot 2' },
  { id: 'POSTER_RAQUEL', text: 'RAQUEL MANE / ROOTED.', where: 's4 slot 3; pinned inside tunnel end (s5 gag)' },
  { id: 'LEDGER_HEAD', text: 'CLIP & SHIP', where: 'ledger close-up s4c' },
  { id: 'LEDGER_SUB', text: 'PREMIUM SHED — OFF THE BOOKS', where: 'under heading' },
  { id: 'LEDGER_R1', text: 'YARD BLEND, 40 LBS — SOLD', where: 'row 1' },
  { id: 'LEDGER_R2', text: 'SILVER SURPLUS, 12 LBS — SOLD', where: 'row 2' },
  { id: 'LEDGER_R3', text: 'CELLBLOCK CURL — HELD FOR BUYER', where: 'row 3' },
  { id: 'LEDGER_R4', text: 'NO. 42, SHED: NONE ON FILE', where: 'row 4; A-gag noneOnFile g56.4' },
  { id: 'BUGLE_MAST', text: 'FLOW DAILY BUGLE', where: 's6a front page' },
  { id: 'BUGLE_HEAD', text: "BALDTON'S CLIPPINGS-GATE!", where: 'mandated headline' },
  { id: 'BUGLE_SUB', text: 'WARDEN SOLD PRISON SHED FOR YEARS, AUDIT FINDS', where: 'subhead' },
  { id: 'BUGLE_CAP', text: "SHOWN WITH SOMEONE ELSE'S SHED", where: 'photo caption' },
  { id: 'BEAM', text: 'BROOKS WAS BALD', where: 's4b beam (timed: DRAWN B1)' },
  { id: 'BEAM_REPLY', text: 'SO WAS RED.', where: 's6d bookend (timed: DRAWN B2)' },
  { id: 'POSTCARD', text: 'FLOW HANCOCK / NO RAZORS THIS FAR WEST.', where: 's6e postcard, comb on fence' },
  { id: 'SKIFF', text: 'THE FLOW IS GOOD', where: 'stern lettering, s6f' },
  { id: 'BIBLE', text: 'THE FLOW LIES WITHIN', where: 'inside cover; comb-shaped hollow beneath' },
  { id: 'DRY_ROOM', text: 'THE DRY ROOM / NO CONDITIONER SERVED', where: 's3e solitary door' },
  { id: 'LIBRARY', text: 'FLOW LIBRARY / EST. SHED BY SHED', where: 'ghost paint BROOM CLOSET beneath, s4a' },
  { id: 'CHART', text: 'FLOW GROWTH CHART / FUZZ STUBBLE CROP BOB FLOW / BURN BEFORE COUNT.', where: 'cell wall, s5a wipe' },
  { id: 'YARD_SIGN', text: 'NO FLOW BEYOND THIS POINT', where: 'perimeter fence; hair-snow settles on it (s1c window gag)' },
  { id: 'SHAVE_SIGN', text: 'FIRST SHAVE FREE. ALL SHAVES FREE.', where: 'shave-room wall, cut-first prop' },
  { id: 'INTAKE_STAMP', text: 'HAIR: N/A', where: 'thunked on 42 file, g13.9' },
  { id: 'EVIDENCE', text: 'EXHIBIT A-1: THE REGIME', where: 'Hadbald clippers bag, s6a' },
  { id: 'NAMEPLATE', text: 'ELLIS BOYD FLOWDING', where: 'parole desk plate, s6b' },
  { id: 'PAROLE_STAMP', text: 'APPROVED-FLOW', where: 'slams g89.9 after P2; ink blot shaped like a tiny comb' },
]

// ---------- cast + flashes ----------
export const CAST = {
  andy: { id: 42, role: 'ANDY FLOWFRESNE', epithet: 'Crimson Flow', note: 'sword -> tiny rock-comb; shirt -> prison denim; bald-cap rip payoff' },
  red: { id: 324, role: 'RED', fullName: 'ELLIS BOYD FLOWDING', epithet: 'Copper Crown', note: 'narrator; OPTIMISM print -> denim' },
  warden: { id: 452, role: 'WARDEN BALDTON', epithet: 'Midnight Soul', note: 'tux; card-fan strip' },
  captain: { id: 2529, role: 'CAPTAIN HADBALD', epithet: 'Midnight Soul', note: 'leather collar; runs the shave room' },
  brooks: { id: 246, role: 'BROOKS', epithet: 'Silver Crown', note: 'librarian; PILL print -> cardigan' },
  inmates: { ids: [80, 237, 252, 63, 56, 192], role: 'YARD INMATES x6', note: 'shirts -> prison denim' },
  guards: { ids: [3807, 1558, 2862], role: 'CABALD GUARDS x3', note: '-> gray guard uniforms; 2862 keeps mustache' },
  posters: { RITA_HAIRWORTH: 825, FLOWLYN_MONROE: 12, RAQUEL_MANE: 139 },
}
export const FLASHES = [
  [filmT(76.9), 0.3, 0.14],                          // lightning on the creek, rip onset minus a beat
  [filmT(89.9), 0.16, 0.1],                          // APPROVED-FLOW stamp slam
]

// ========================= SELF-CHECK =========================
// Runs ONLY when executed directly (`node films/baldshank/timeline.js`);
// importing this module (browser, filmkit CLI) never triggers it.
// Validators are pure so the mutation tests can prove they bite.
const checkShots = (shots, duration) => {
  const fails = []
  let prev = 0
  for (const s of shots) {
    if (Math.abs(s.t0 - prev) >= 1e-9) fails.push('shots: gap/overlap before ' + s.name + ' (t0 ' + s.t0 + ', expected ' + prev + ')')
    if (!(s.t1 > s.t0)) fails.push('shots: ' + s.name + ' non-positive length')
    prev = s.t1
  }
  if (Math.abs(prev - duration) >= 1e-9) fails.push('shots: last t1 ' + prev + ' != DURATION')
  return fails
}
const checkStops = (stops, shots, scenes) => {
  const fails = []
  for (let i = 1; i < stops.length; i++) if (!(stops[i].g > stops[i - 1].g)) fails.push('stops not sorted/increasing at index ' + i)
  const s5 = scenes.find((x) => x.name === 's5')
  for (const st of stops) {
    if (!s5 || st.g < s5.g0 - 1e-9 || st.g > s5.g1 + 1e-9) fails.push('stop g' + st.g + ' outside S5 g-bounds')
    const f0 = filmT(st.g)
    const shot = shots.find((x) => f0 >= x.t0 - 1e-9 && f0 < x.t1 - 1e-9)
    if (!shot) fails.push('stop g' + st.g + ' film ' + f0 + ' inside no shot')
    else if (f0 + st.d > shot.t1 + 1e-9) fails.push('stop g' + st.g + ' freeze crosses cut at ' + shot.t1)
  }
  return fails
}
const checkBeat = (e) => {
  if (typeof e.g !== 'number' || !Number.isFinite(e.g)) return ['beat g not a finite number (' + e.g + ')']
  if (e.f !== filmT(e.g)) return ['beat f ' + e.f + ' != filmT(' + e.g + ') = ' + filmT(e.g)]
  return []
}
const checkCaps = (caps, shots, duration) => {
  const fails = []
  const shotOf = (t) => shots.find((x) => t >= x.t0 - 1e-9 && t < x.t1 - 1e-9)
  for (const c of caps) {
    if (!(c.t0 >= 0 && c.t1 <= duration + 1e-9 && c.t1 > c.t0)) fails.push('caption ' + c.id + ' window outside film or empty')
    for (const line of c.text.split('\n')) {
      if (line.length > 40 && !c.lineWaiver) fails.push('caption ' + c.id + ' line too long (' + line.length + '), no lineWaiver')
    }
    if (c.text !== c.text.toUpperCase()) fails.push('caption ' + c.id + ' not ALL-CAPS')
    if (c.y > SAFE.captionYMax) fails.push('caption ' + c.id + ' y ' + c.y + ' > captionYMax (under the bar)')
    const win = c.t1 - c.t0
    if (win < 3 - 1e-9 && !c.short && !c.waiver) fails.push('caption ' + c.id + ' window ' + win.toFixed(2) + 's < 3 and unflagged')
    const host = shotOf(c.t0)
    if (!host) fails.push('caption ' + c.id + ' t0 in no shot')
    else if (c.t1 > host.t1 + 1e-9) {
      const nxt = shots[shots.indexOf(host) + 1]
      const cut = nxt ? host.name + '/' + nxt.name : host.name + '/END'
      if (c.spansCut !== cut) fails.push('caption ' + c.id + ' crosses ' + cut + ' without matching spansCut')
    }
  }
  const lanes = {}
  for (const c of caps) (lanes[c.y] = lanes[c.y] || []).push(c)
  for (const y of Object.keys(lanes)) {
    const arr = lanes[y].slice().sort((a, b) => a.t0 - b.t0)
    for (let i = 0; i + 1 < arr.length; i++) {
      if (arr[i].t1 > arr[i + 1].t0 + 1e-9) fails.push('lane y' + y + ': ' + arr[i].id + ' overlaps ' + arr[i + 1].id)
    }
  }
  return fails
}

const SELF_RUN = (() => {
  try {
    if (typeof process === 'undefined' || !process.argv || !process.argv[1]) return false
    const a = String(process.argv[1])
    // Suffix match survives symlinked cwd components (macOS /tmp -> /private/tmp):
    return import.meta.url.endsWith(a) || a.endsWith('films/baldshank/timeline.js')
  } catch { return false }
})()
if (SELF_RUN) void (async () => {
  const fails = []
  const ok = (cond, msg) => { if (!cond) fails.push(msg) }

  // 1. shots tile [0, DURATION) exactly; scenes tile too
  ok(DURATION === 101.0, 'DURATION ' + DURATION + ' != 101.0')
  ok(W === 1920 && H === 1080, 'stage size drifted')
  const shotFails = checkShots(SHOTS, DURATION)
  for (const f of shotFails) fails.push(f)
  ok(SHOTS.length >= 26 && SHOTS.length <= 32, 'shot count ' + SHOTS.length + ' outside brief 26-32')
  let prevF = 0
  for (const sc of SCENES) {
    ok(Math.abs(sc.f0 - prevF) < 1e-9, 'scenes: gap before ' + sc.name)
    ok(Math.abs(sc.f1 - filmT(sc.g1)) < 1e-9, 'scenes: ' + sc.name + ' f1 != filmT(g1)')
    prevF = sc.f1
  }
  ok(Math.abs(prevF - DURATION) < 1e-9, 'scenes: last f1 ' + prevF + ' != DURATION')

  // 2. stops: sorted, inside S5, durations, freeze windows inside their shots
  for (const f of checkStops(STOPS, SHOTS, SCENES)) fails.push(f)
  ok(STOPS.length === 2 && STOPS[0].d === 0.2 && STOPS[1].d === 0.26, 'STOPS drifted from design (67.2/0.2, 78.1/0.26)')
  ok(Math.abs(filmT(STOP1_G) - 67.2) < 1e-6 && Math.abs(filmT(STOP2_G) - 78.3) < 1e-6, 'stop film onsets drifted')
  const s5f = SHOTS.find((s) => s.name === 's5f')
  const f2 = filmT(STOP2_G)
  ok(f2 >= s5f.t0 && f2 + STOPS[1].d <= s5f.t1 + 1e-9, 'HIT-STOP 2 freeze not fully inside s5f')

  // 3. hit-stop 2 lands during the cap-rip window; hit-stop 1 sits in the no-caption gap
  ok(EV_S5.capRipOnset.g < STOP2_G && STOP2_G < EV_S5.capRipRecoil.g, 'STOP2 not inside the cap-rip onset->recoil window')
  ok(EV_S5.rockOnset.g < STOP1_G && STOP1_G < EV_S5.posterPeel.g, 'STOP1 not between rock throw and poster peel')
  ok(EV_S5.creekEmerge.g < STOP2_G && EV_S5.rockThrow.g > EV_S5.emptyCell.g, 'rock thrown before the empty-cell reveal')
  const noCapZone = [filmT(STOP1_G), filmT(STOP1_G) + STOPS[0].d]
  for (const c of CAPS) {
    const v0 = c.t0 + (c.in || 0), v1 = c.t1 - (c.out || 0)
    ok(!(v0 < noCapZone[1] && noCapZone[0] < v1), 'caption ' + c.id + ' visible over HIT-STOP 1 (ruling: none)')
  }
  const e1 = CAPS.find((c) => c.id === 'E1')
  ok(e1 && Math.abs(e1.t1 - filmT(77.9)) < 1e-6 && e1.t1 < filmT(STOP2_G), 'E1 must clear the screen before the rip freeze')
  const g1 = CAPS.find((c) => c.id === 'G1')
  ok(g1 && Math.abs(g1.t0 - filmT(STOP2_G)) < 1e-9, 'G1 must start ON the rip freeze (mandated)')

  // 4. captions: bounds, caps, per-line length, y, holds, lanes, spansCut, mandated strings
  for (const f of checkCaps(CAPS, SHOTS, DURATION)) fails.push(f)
  let minWin = Infinity, minId = ''
  for (const c of CAPS) {
    const win = c.t1 - c.t0
    if (win < minWin) { minWin = win; minId = c.id }
  }
  const must = [
    ['T1', 'THE BALDSHANK REDEMPTION'], ['W1', 'TWO THINGS: DISCIPLINE. AND THE BALD.'],
    ['A2', 'I LIKE TO THINK IT WAS ABOUT HAIR.'], ['G1', 'GET BUSY GROWING. OR GET BUSY BALDING.'],
    ['P2', "IT'S JUST A WORD. SO IS FLOW."], ['E1', 'AND HE CAME OUT CLEAN.'],
  ]
  for (const [id, text] of must) {
    const c = CAPS.find((x) => x.id === id)
    ok(c && c.text === text, 'caption ' + id + ' drifted from ledger verbatim')
  }
  const f1 = CAPS.find((c) => c.id === 'F1')
  ok(f1 && f1.text.split('\n')[0] === 'FLOW IS A GOOD THING, MAYBE THE BEST OF THINGS,' && f1.t1 === 101.0, 'F1 locked verbatim/film-domain end drifted')
  const waiverCount = CAPS.filter((c) => c.short || c.waiver || c.lineWaiver).length

  // 5. event grid: every g inside its scene, f === filmT(g) exactly
  const EVS = { s1: EV_S1, title: EV_TITLE, s2: EV_S2, s3: EV_S3, s4: EV_S4, s5: EV_S5, s6: EV_S6 }
  let nEv = 0, nKeys = 0
  for (const [scene, ev] of Object.entries(EVS)) {
    const sc = SCENES.find((s) => s.name === scene)
    ok(sc, 'no scene row for ' + scene)
    if (!sc) continue
    for (const [k, v] of Object.entries(ev)) {
      nKeys++
      for (const e of Array.isArray(v) ? v : [v]) {
        nEv++
        for (const f of checkBeat(e)) fails.push('EV ' + scene + '.' + k + ': ' + f)
        ok(e.g >= sc.g0 - 1e-9 && e.g <= sc.g1 + 1e-9, 'EV ' + scene + '.' + k + ' g' + e.g + ' outside ' + scene + ' g[' + sc.g0 + ',' + sc.g1 + ']')
        ok(e.f >= 0 && e.f <= DURATION + 1e-9, 'EV ' + scene + '.' + k + ' f' + e.f + ' outside film')
      }
    }
  }

  // 6. trajectories monotonic where the story says
  const mono = (fn, a, b, dir, step = 0.1) => {
    for (let x = a; x < b - 1e-9; x += step) {
      const d = fn(x + step) - fn(x)
      if (dir === 'up' ? d < -1e-9 : d > 1e-9) return false
    }
    return true
  }
  ok(mono(busX, 0.2, 3.7, 'up'), 'bus moves backward')
  ok(mono(clipperX, 9.5, 12.9, 'up'), 'clippers march backward')
  ok(mono(sprintX, 43.2, 45.0, 'down'), 'sprinting guard moves away from the door')
  ok(mono(crawlX, 72.35, 74.6, 'up'), 'crawl moves backward')
  ok(mono(redSandX, 94.6, 97.4, 'up'), 'RED walks the sandline backward')

  // 7. world layout inside the safe band; snow in-frame
  for (const [k, v] of Object.entries(GROUNDS)) ok(v >= SAFE.bandY[0] && v <= SAFE.bandY[1], 'GROUNDS.' + k + ' outside band')
  const pr = POSTER_RECT
  ok(pr.y >= SAFE.bandY[0] && pr.y + pr.h <= SAFE.bandY[1], 'POSTER_RECT escapes the safe band')
  for (const [nm, o] of [['CREEK', CREEK], ['BEACH', BEACH], ['YARD', YARD]]) {
    if (o.horizonY !== undefined) ok(o.horizonY >= SAFE.bandY[0] && o.horizonY <= SAFE.bandY[1], nm + '.horizonY outside band')
  }
  ok(CREEK.waterY <= SAFE.bandY[1] && BEACH.sandlineY <= SAFE.bandY[1], 'creek/beach lines sink under the bar')
  for (const fl of SNOW) ok(fl.x >= 0 && fl.x <= W, 'snow seed ' + fl.seed + ' x out of frame')

  // 8. drawn windows map through filmT and stay inside their shots
  for (const d of DRAWN) {
    ok(Math.abs(d.f0 - filmT(d.g0)) < 1e-6 && Math.abs(d.f1 - filmT(d.g1)) < 1e-6, 'DRAWN ' + d.id + ' window not filmT-mapped')
    ok(d.f1 > d.f0 && d.f1 <= DURATION, 'DRAWN ' + d.id + ' bad window')
    const host = SHOTS.find((s) => d.f0 >= s.t0 - 1e-9 && d.f0 < s.t1 - 1e-9)
    ok(host && d.f1 <= host.t1 + 1e-9, 'DRAWN ' + d.id + ' escapes its shot')
  }
  const signageMust = ['NO. 42, SHED: NONE ON FILE', "BALDTON'S CLIPPINGS-GATE!", 'ELLIS BOYD FLOWDING', 'APPROVED-FLOW', 'THE FLOW IS GOOD']
  for (const t of signageMust) ok(SIGNAGE.some((s) => s.text === t), 'SIGNAGE missing verbatim: ' + t)

  // 9. cast ids; flashes filmT-consistent; money-shot windows generous
  ok(CAST.andy.id === 42 && CAST.red.id === 324 && CAST.warden.id === 452 && CAST.captain.id === 2529 && CAST.brooks.id === 246, 'hero cast drifted from casting.md')
  ok(CAST.inmates.ids.length === 6 && CAST.guards.ids.length === 3 && CAST.posters.RITA_HAIRWORTH === 825, 'crowd/poster ids drifted')
  ok(Math.abs(FLASHES[0][0] - filmT(76.9)) < 1e-9 && Math.abs(FLASHES[1][0] - filmT(89.9)) < 1e-9, 'FLASHES not on the film clock')
  const shotLen = (n) => { const s = SHOTS.find((x) => x.name === n); return s.t1 - s.t0 }
  ok(shotLen('s1c') >= 5.0 && shotLen('s3b') >= 3.4 && shotLen('s5c') >= 3.4 && shotLen('s5f') >= 5.4 && shotLen('s6f') >= 3.2, 'a money-shot window got squeezed')

  // 10. MUTATION TESTS — the validators must bite
  const mutT1 = SHOTS.map((s) => (s.name === 's3b' ? { ...s, t1: s.t1 + 0.5 } : s))
  ok(checkShots(mutT1, DURATION).length > 0, 'MUTATION: shifted shot t1 NOT caught by contiguity check')
  const mutGap = SHOTS.map((s) => (s.name === 's5d' ? { ...s, t0: s.t0 + 0.3 } : s))
  ok(checkShots(mutGap, DURATION).length > 0, 'MUTATION: gapped shot t0 NOT caught')
  ok(checkBeat({ g: 75.45, f: 75.45 }).length > 0, 'MUTATION: beat moved without filmT NOT caught')
  ok(checkBeat({ g: 95.0, f: filmT(95.0) + 0.1 }).length > 0, 'MUTATION: hand-nudged beat f NOT caught')
  ok(checkStops([{ g: STOP2_G, d: 0.26 }, { g: STOP1_G, d: 0.2 }], SHOTS, SCENES).length > 0, 'MUTATION: unsorted STOPS NOT caught')
  const mutCap = CAPS.map((c) => (c.id === 'N6' ? { ...c, t1: c.t1 + 4 } : c))
  ok(checkCaps(mutCap, SHOTS, DURATION).length > 0, 'MUTATION: caption overrunning its shot NOT caught')

  // 11. determinism: no nondeterminism in source
  try {
    const fs = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const raw = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8')
    ok(!/Math\.random|Date\.now|new Date\(/.test(raw.replace(/\/\/.*$/gm, '')), 'source contains nondeterminism')
  } catch { /* fs unavailable outside node: skip source scan */ }

  if (fails.length) {
    console.error('SELF-CHECK FAILED (' + fails.length + '):')
    for (const f of fails) console.error('  - ' + f)
    process.exit(1)
  }
  const rows = [
    ['duration', DURATION.toFixed(1) + ' s, ' + SHOTS.length + ' shots, 6 scenes + title card'],
    ['shots', SHOTS.length + ' shots tile [0, ' + DURATION + ') exactly, no gaps/overlaps'],
    ['stops', 'g' + STOPS[0].g + ' +' + STOPS[0].d + ' (rock through poster, film 67.20) g' + STOPS[1].g + ' +' + STOPS[1].d + ' (bald-cap rip, film 78.30) — both inside S5'],
    ['money shots', 's1c hair-snow 5.4s | s3b aria hold 3.6s | s5c rock 3.5s | s5f rip 5.66s | s6f beach 3.4s — all onset/contact/recoil exported'],
    ['events', nKeys + ' named exports (' + nEv + ' beats with arrays), every f === filmT(g); 6-entry deviation log'],
    ['captions', CAPS.length + ' overlay + ' + DRAWN.length + ' drawn + ' + SIGNAGE.length + ' signage refs; all-caps, y <= ' + SAFE.captionYMax],
    ['caption holds', 'min window ' + minWin.toFixed(2) + 's (' + minId + '); waivers: ' + waiverCount + ' cards (TK1 SUB1 E1 P1 F1 SC1); F1_FALLBACK x3 exported'],
    ['stop rule', 'no caption visible over HIT-STOP 1; E1 clears pre-freeze; G1 rides the freeze per ruling'],
    ['trajectories', 'bus/clippers/crawl/sandline forward, guard sprint homeward — all monotonic; snow x24 in-frame'],
    ['determinism', 'no nondeterminism in source; hash-seeded snow; mutation tests 6/6 bite'],
    ['cast', '42 / 324 / 452 / 2529 / 246; inmates 80/237/252/63/56/192; guards 3807/1558/2862; posters 825/12/139'],
  ]
  console.log('SELF-CHECK OK — THE BALDSHANK REDEMPTION')
  for (const [k, v] of rows) console.log('  ' + k.padEnd(15) + v)
})()
