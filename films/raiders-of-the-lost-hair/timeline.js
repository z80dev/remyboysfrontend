// RAIDERS OF THE LOST HAIR — timeline.js. Cue sheet + choreography spine: the ONE
// shared source of truth that picture (film.js/art.js), score (score.js) and QA all
// import. 101.0 s, 1920x1080@60, painted 2D stage, letterbox 0.8. Pure functions of
// time; no imports, no Math.random, no Date, no state between frames.
//
// SCENE MAP: S1 temple 0-20 | TITLE 20-24 | S2 briefing+map 24-35 | S3 dig+truck
// chase 35-56 (BOTH hit-stops) | S4 the pit 56-66 | S5 the opening 66-87 | S6 top
// hair 87-101.
//
// CAST (casting.md final table; ids verified on reviewed contact sheets):
//   42    DR. REMY FLOW      hero       Crimson  (fedora repaint; sword -> coiled whip)
//   1344  BALDOUQ            rival      Mustache (white suit + Panama; melt keeps silhouette)
//   3870  GOON FOREMAN       goon       Harness  (dig foreman read; blowgun prop added)
//   482   GOON SMUG          goon       Smug
//   2433  GOON BRUISER       goon       Bruiser
//   4449  GOON WEASEL        goon       Weasel
//   4036/1260/1793/4450      choir x4   Clean    (far sprites, white/saffron robe repaint)
//   30    DR. COPPER FLOW    colleague  Emeritus (nameplate gag)
//   24    DR. GOLD FLOW      colleague  Punchy
//   Horse: no sprite exists (casting.md) -> procedural draw confirmed.
//
// CLOCK RULE (load-bearing): story.md beat times are GLOBAL seconds in the PRE-STOP
// world domain (g). The film's two hit-stops live inside S3, so film time f = filmT(g):
//   f = g                    for g <= 44.6        (pre-stop: S1, TITLE, S2, S3A-3C start)
//   f = g + 0.18             for 44.6 < g <= 47.8 (after HIT-STOP 1)
//   f = g + 0.40             for g > 47.8         (after HIT-STOP 2)
// An event scheduled AT a stop's g sounds/lands at the START of its freeze (house rule).
// Effects (shake/flash/dust) age on real film t; actors/blocking resolve g = warp(t).g.
// INVARIANT enforced by the self-check: every exported beat satisfies f === filmT(g).
//
// DEVIATION LOG (only 3 pulls + 1 re-base; everything else is story g through filmT):
//   1. arkPulse g55.6 -> g55.3: raw conversion lands at film 56.00, exactly on the
//      S3/S4 cut (pulse invisible). Pulled 0.3 -> f 55.7, 0.3 s of pulse before the cut.
//   2. ropeHandover g65.6 -> g65.2: raw lands at film 66.00 on the S4/S5 cut, killing
//      the tidy march-out (gag 18). Pulled 0.4 -> f 65.6.
//   3. exitStart g87.4 -> g86.45: ruling re-budgets S5E to 85.0-87.0 (2.0 s); raw lands
//      film 87.8, after the warehouse cut. salute keeps g86.2 (f 86.6) per ruling.
//   4. S6 RE-BASE: ruling fixes 6A-6E film windows (87/90/92.5/95.5/97.5/101). Beats
//      keep their offset-from-shot-start inside those windows (lengths match treatment
//      except 6D/6E which got LONGER), so e.g. nod-wall g89.5-90.5 -> film 88.5-89.5.
//      Raw g+0.4 would push 8 beats across cuts (self-check would fail). g = f - 0.4.
//   Captions: ledger strings verbatim; windows after t=85 adjusted per ruling's
//   "+1.0 s rebudget" clause; C6/C7 ride filmT exactly.

export const DURATION = 101.0

// ---------- the shared clock (makeClock pattern, pirates-cabald/timeline.js) ----------
export const STOP1_G = 44.6                        // HIT-STOP 1: windscreen burst
export const STOP2_G = 47.8                        // HIT-STOP 2: axle grab, under-truck save
export const STOPS = [
  { g: STOP1_G, d: 0.18 },                         // glass shards hang, bloom through freeze
  { g: STOP2_G, d: 0.22 },                         // all freezes except dust motes; the nod
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

// ---------- letterbox-safe stage (letterbox 0.8 -> ~109 px bars) ----------
export const W = 1920, H = 1080
export const SAFE = { letterbox: 0.8, bandY: [111, 969], captionYMax: 915, xMin: 0, xMax: 1920 }
export const GROUND = 940                          // default feet line (inside the band)
export const GROUNDS = { s1: 940, title: 930, s2: 900, s3: 900, s4: 880, s5: 940, s6: 940 }
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
  { name: 's1a', t0: 0.0, t1: 2.0, desc: 'warning wall: cobweb push-in, toupee-X glyph plant, K1' },
  { name: 's1b', t0: 2.0, t1: 6.0, desc: 'stone-head pedestal: idol lift g3.2, sand-wig swap g4.6, pat g5.4' },
  { name: 's1c', t0: 6.0, t1: 7.0, desc: 'ECU the grain: sand trickles from the ear, iris glows g6.6' },
  { name: 's1d', t0: 7.0, t1: 12.0, desc: 'hairball chase down the corridor, dandruff tiles, filament sticks g10.4' },
  { name: 's1e', t0: 12.0, t1: 15.5, desc: 'daylight skid, Cabald fan-out, darts g13.8, umbrella snaps g15.0' },
  { name: 's1f', t0: 15.5, t1: 20.0, desc: 'umbrella-point: idol onto canopy g16.4, hat tips, grin, sprint g18.8' },
  { name: 'title', t0: 20.0, t1: 24.0, desc: 'main title: hairball settles g20.5, red-line type-on, toupee O-drop g21.6' },
  { name: 's2a', t0: 24.0, t1: 28.0, desc: 'lecture hall: sleep wave g24.5, chalk squeak g25.0 (C3 drawn), swooner' },
  { name: 's2b', t0: 28.0, t1: 31.0, desc: 'three bas-relief panels ~1s each, lid thud on P3, C4' },
  { name: 's2c', t0: 31.0, t1: 35.0, desc: 'map montage: plane contrail g31.5, DANDRUFF SEA detour g33.0, C5' },
  { name: 's3a', t0: 35.0, t1: 39.5, desc: 'photo-bomb theft: toothbrush goons, FLASH g38.0, heave g38.6, mustache tip g39.2' },
  { name: 's3b', t0: 39.5, t1: 42.5, desc: 'convoy out (driver reads COMB WEEKLY), horses up, closing gap' },
  { name: 's3c', t0: 42.5, t1: 46.5, desc: 'hood + windscreen: leap g43.0, wrench fight, HIT-STOP 1 g44.6, drop g45.2' },
  { name: 's3d', t0: 46.5, t1: 49.5, desc: 'under-truck drag, HIT-STOP 2 g47.8, upside-down nod, yank up' },
  { name: 's3e', t0: 49.5, t1: 53.0, desc: 'tailgate: three-move fisticuff, heave g52.0, goon lands on horse g52.4' },
  { name: 's3f', t0: 53.0, t1: 56.0, desc: 'the cab: hero drops in g53.5, driver exits g55.0, ark pulse g55.3' },
  { name: 's4a', t0: 56.0, t1: 58.5, desc: 'baskets: goons spring out (not snakes), pile-on cloud, ark rises g57.8' },
  { name: 's4b', t0: 58.5, t1: 63.0, desc: 'the pit: scissors rain, clatter halo g59.4, cape hem snip g60.0, C7' },
  { name: 's4c', t0: 63.0, t1: 66.0, desc: 'out the wall: torch g63.2, parting, pink safety scissors g64.2, rope handover' },
  { name: 's5a', t0: 66.0, t1: 70.0, desc: 'tableau: island night, Baldouq arms raised, choir hum, hero staked eyes shut' },
  { name: 's5b', t0: 70.0, t1: 74.0, desc: 'the lid: off g70.4, flow column, mode-flip g71.0, hum flips major g71.6' },
  { name: 's5c', t0: 74.0, t1: 79.0, desc: 'the melt: seams g74.4, chrome skull g75.8, Panama lands g76.6, wisp domino' },
  { name: 's5d', t0: 79.0, t1: 85.0, desc: 'the combing: ghost-comb descends, 7 strands align g79.8-83.4, knot pop g81.0' },
  { name: 's5e', t0: 85.0, t1: 87.0, desc: 'aftermath (2.0s per ruling): Panama salute g86.2, collect ark, exit' },
  { name: 's6a', t0: 87.0, t1: 90.0, desc: 'the suits: walked through warehouse, nod wave 88.5-89.5, filament pluck 89.4' },
  { name: 's6b', t0: 90.0, t1: 92.5, desc: 'the crate: lid nailed 90.4, stamp D1 91.0, slat glow 91.6, worker tap 92.0' },
  { name: 's6c', t0: 92.5, t1: 95.5, desc: 'forklift recede into crate canyon, slat-glow winks 93.5/94.3/95.1' },
  { name: 's6d', t0: 95.5, t1: 97.5, desc: 'stinger: golden hair leak 95.8, question mark 96.3, compass 96.7, zip back' },
  { name: 's6e', t0: 97.5, t1: 101.0, desc: 'end card: THE FLOW PROVIDES. line-in, 3.5s hold, brass + snare button' },
]

// ---------- scenes (film bounds f0/f1 per ruling; g bounds = f - 0.4 after the stops) ----------
export const SCENES = [
  { name: 's1', f0: 0.0, f1: 20.0, g0: 0.0, g1: 20.0 },
  { name: 'title', f0: 20.0, f1: 24.0, g0: 20.0, g1: 24.0 },
  { name: 's2', f0: 24.0, f1: 35.0, g0: 24.0, g1: 35.0 },
  { name: 's3', f0: 35.0, f1: 56.0, g0: 35.0, g1: 55.6 },
  { name: 's4', f0: 56.0, f1: 66.0, g0: 55.6, g1: 65.6 },
  { name: 's5', f0: 66.0, f1: 87.0, g0: 65.6, g1: 86.6 },
  { name: 's6', f0: 87.0, f1: 101.0, g0: 86.6, g1: 100.6 },
]

// ---------- schedules + trajectories (pure in g unless noted; builder refines) ----------
const h1 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) } // seeded local hash

// S1D corridor sprint: hero L->R, hairball catches up to 40 px behind at the end.
export const SPRINT = { g0: 7.0, g1: 11.8, endGap: 40 }
export const heroCorridorX = (g) => lerp(-120, 2040, clamp01((g - 7.0) / 4.8) ** 1.05)
export const hairballGap = (g) => lerp(430, SPRINT.endGap, seg(g, 7.0, 11.8) ** 0.8)
export const hairballX = (g) => heroCorridorX(g) - hairballGap(g)
export const hairballRot = (g) => 9.0 * (g - 7.0)                       // rad, tumbling forward
export const hairballR = (g) => lerp(120, 210, seg(g, 7.0, 11.8))       // grows down the hall

// S1E daylight skid + S1F sprint-out (x, monotonic).
export const heroSkidX = (g) => lerp(-80, 860, ease.outCubic(seg(g, 12.0, 12.9)))
export const heroExitX = (g) => lerp(700, 2200, seg(g, 18.8, 19.5))

// S3B/C truck chase: closing-gap model, leap arc, drop, drag, climb (y = px above stage).
export const CHASE = { g0: 40.2, leap: 43.0, land: 43.5, dropG: 45.2, roadY: 900 }
export const truckX = (g) => 240 + 640 * (g - 39.5)                     // world x, monotonic
export const chaseGap = (g) => 90 + 1260 * (1 - seg(g, CHASE.g0, CHASE.leap)) ** 1.35
export const heroChaseX = (g) => truckX(g) - chaseGap(g)                // horse, g <= leap
export const heroRideX = (g) => truckX(g) - 90                          // on hood/flatbed after leap
export const heroLeapY = (g) => { const p = clamp01((g - 43.0) / 0.5); return lerp(740, 660, p) - 240 * Math.sin(Math.PI * p) }
export const heroDropY = (g) => lerp(660, CHASE.roadY, ease.inQuad(seg(g, CHASE.dropG, 45.55)))
export const heroDragY = (g) => CHASE.roadY - 22 + 8 * Math.abs(Math.sin(6 * Math.PI * (g - 45.6)))
export const heroDragX = (g) => truckX(g) - 55                          // pinned under the axle
export const heroClimbY = (g) => lerp(878, 560, ease.outCubic(seg(g, 48.4, 49.0))) // up thru slats

// S4B scissors rain: 34 blades, hash-seeded, all landed by the halo beat g59.4.
export const SCISSORS = Array.from({ length: 34 }, (_, i) => ({
  x: 960 + Math.cos((i / 34) * 6.283 + (h1(i) - 0.5) * 0.7) * (240 + 270 * h1(i + 7)),
  y: 700 + Math.sin((i / 34) * 6.283 + (h1(i) - 0.5) * 0.7) * (60 + 110 * h1(i + 17)),
  rot: (h1(i + 29) - 0.5) * 0.5 + (h1(i + 31) > 0.3 ? 0 : Math.PI / 2), // most stick upright
  tLand: 58.7 + 0.6 * h1(i + 13),                                       // g-domain
  seed: i,
}))

// S5B flow column: ghost-comb spiral params (draw while 70.6 <= g <= 74.2).
export const FLOW = { g0: 70.6, g1: 74.2, combs: 7 }
export const spiralComb = (i, g) => {
  const a = g - FLOW.g0, y = 900 - ((a * 150 + i * 95) % 640), k = (900 - y) / 640
  return { x: 960 + Math.sin(a * 1.5 + i * 0.62) * (36 + 130 * k), y, rot: a * 1.2 + i, alpha: seg(a, 0, 0.4) * (1 - seg(y, 240, 380)) }
}

// S5C wisp domino: heads pop leftward across the choir line, ~0.4 s apart.
export const WISP_G = [77.0, 77.4, 77.8, 78.2, 78.6]                    // g-domain
export const WISP_X = [1240, 1060, 880, 700, 520]

// S5D strand-align schedule: 7 crimson strands align one by one over g79.8-83.4.
export const STRANDS = 7
export const strandAlignG = (k) => 79.8 + k * 0.6                       // k 0..6 -> [79.8, 83.4]
export const STRAND_F = Array.from({ length: STRANDS }, (_, k) => strandAlignG(k) + 0.4) // film

// S6C forklift recede (film-domain g-continuity: these g are f - 0.4, re-based zone).
export const forkliftP = (g) => ease.ioSine(seg(g, 92.9, 95.3))
export const crateScale = (g) => lerp(1, 0.16, forkliftP(g))
export const crateX = (g) => lerp(880, 1170, forkliftP(g))
export const crateY = (g) => lerp(940, 966, forkliftP(g))               // clamped into band

// S6D question-mark hair keyframes (film f + matching g = f - 0.4).
export const QMARK = [
  { pose: 'emerge', f: 95.8, g: 95.4 }, { pose: 'question', f: 96.3, g: 95.9 },
  { pose: 'compass', f: 96.7, g: 96.3 }, { pose: 'zip', f: 97.0, g: 96.6 },
  { pose: 'wink', f: 97.1, g: 96.7 },
]

// ---------- event grid (E(g) keeps f === filmT(g); arrays are concurrent beats) ----------
const E = (g) => ({ g, f: filmT(g) })
export const EV_S1 = {
  enter: E(0.4), glyph: E(1.2),
  idolLift: E(3.2), sandWigDown: E(4.6), pat: E(5.4), grin: E(5.8),
  grain: E(6.6), irisRed: E(6.75), subBoom: E(6.9),
  hairballRelease: E(7.0), filamentStick: E(10.4),
  daylight: E(12.0), rivalReveal: E(12.6), darts: [E(13.72), E(13.8), E(13.88)],
  umbrella: E(15.0), idolOnCanopy: E(16.4),
  rivalTip: E(17.6), heroTip: E(17.9), sprintOut: E(18.8), dartPuff: E(19.2),
}
export const EV_TITLE = { silStop: E(20.5), typeOn0: E(20.6), typeOn1: E(21.4), oDrop: E(21.6), credit: E(21.8) }
export const EV_S2 = {
  sleepWave: E(24.5), swooner: E(24.9), chalkSqueak: E(25.0), chalkCircle: E(26.0),
  panels: [E(28.2), E(29.2), E(30.2)], lidThud: E(30.4),
  planeIn: E(31.5), stopTicks: [E(32.2), E(32.9), E(33.6)], dandruffSea: E(33.0),
}
export const EV_S3 = {
  brushing: E(36.0), lineup: E(37.5), flash: E(38.0), heaveDone: E(38.6), mustacheTip: E(39.2),
  convoyOut: E(39.5), whistle: E(40.0), vault: E(40.8), gallop: E(41.0),
  leap: E(43.0), goonOnHood: E(43.7), wrenchMiss: E(44.5),
  stop1: E(STOP1_G), release1: E(44.78), dropToRoad: E(45.2),
  dragUnder: E(46.6), stop2: E(STOP2_G), release2: E(48.2), nodPass: E(48.5),
  yankUp: E(49.0), flatbedLand: E(49.4), riseBehind: E(49.9), heave: E(52.0), horseLand: E(52.4),
  veerOff: E(52.9), cabDrop: E(53.5), wheelTake: E(54.2), driverExit: E(55.0), arkPulse: E(55.3), // pulse pulled -0.3, see log
}
export const EV_S4 = {
  walkIn: E(56.2), baskets: E(56.6), spring: E(56.9), pileOn: E(57.2),
  arkRise: E(57.8), trussed: E(58.3), hatchDrop: E(58.55), clatterHalo: E(59.4), hemSnip: E(60.0),
  deadpan: E(60.5), torch: E(63.2), parting: E(63.5), scissorsFree: E(64.2), pocket: E(64.5),
  rubbleWall: E(65.0), ropeHandover: E(65.2), marchOff: E(65.4), // handover pulled -0.4, see log
}
export const EV_S5 = {
  tableau: E(66.0), lidOff: E(70.4), flowColumn: E(70.6), modeFlip: E(71.0), humMajor: E(71.6),
  seams: E(74.4), waxDrips: E(75.0), chrome: E(75.8), panamaLand: E(76.6),
  wispDomino: WISP_G.map(E), taffyComb: E(77.4),
  combDescend: E(79.6), knotPop: E(81.0), ropesGroomed: E(83.0), windGust: E(83.4),
  salute: E(86.2), exitStart: E(86.45), // exit pulled, S5E re-budgeted to 2.0 s per ruling
}
export const EV_S6 = { // re-based zone: g = f - 0.4 keeps the one clock exact (see log 4)
  suitsIn: E(86.6), nodWall: [E(88.1), E(89.1)], filamentPluck: E(89.0),
  crateLower: E(89.8), lidNail: E(90.0), stamp: E(90.6), glow: E(91.2), tap: E(91.6),
  forkliftLift: E(92.3), recede: [E(92.9), E(95.3)], winks: [E(93.1), E(93.9), E(94.7)],
  leak: E(95.4), qmark: E(95.9), compass: E(96.3), zipBack: E(96.6), slatWink: E(96.7), card: E(97.15),
}

// ---------- CAPS: declarative overlay captions (film time; builder drops into captions[]) ----------
export const CAPS = [
  { id: 'K1', text: '1936. THE TEMPLE OF THE FIRST MANE.', t0: 0.3, t1: 2.0, style: 'kicker', x: 960, y: 420, anim: 'fade', in: 0.1, out: 0.1, short: true },
  { id: 'C2', text: 'IT BELONGS IN A SALON.', t0: 16.2, t1: 18.4, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.2, out: 0.2, pill: true },
  { id: 'T1', text: 'RAIDERS OF THE LOST HAIR', t0: 20.2, t1: 24.0, style: 'title', x: 960, y: 520, anim: 'line', in: 0.7, out: 0.1, color: '#e8b23a', note: 'red-line type-on 20.6-21.4 is DRAWN; toupee O-drop 21.6' },
  { id: 'T2', text: 'A REMY BOYS PICTURE', t0: 21.8, t1: 24.0, style: 'kicker', x: 960, y: 650, anim: 'fade', in: 0.2, out: 0.1, color: '#c9c9c9' },
  { id: 'C4', text: 'ONE COMB GROOMED THE FIRST MANE.', t0: 28.2, t1: 31.0, style: 'kicker', x: 960, y: 420, anim: 'fade', in: 0.2, out: 0.15 },
  { id: 'C5', text: 'MEANWHILE, THE CABALD DUG.', t0: 32.0, t1: 34.5, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.2, out: 0.2, note: 'chapter plate 1/2' },
  { id: 'C6', text: 'MIND THE CARGO.', t0: 44.98, t1: 47.48, style: 'caption', x: 960, y: 868, anim: 'rise', in: 0.25, out: 0.2, spansCut: 's3c/s3d', note: 'filmT(44.8)-filmT(47.3); rides HIT-STOP 1 release, clear of both freezes' },
  { id: 'C7', text: 'WHY DID IT HAVE TO BE BARBERS.', t0: 60.2, t1: 63.2, style: 'caption', x: 960, y: 868, anim: 'cut', in: 0, out: 0, spansCut: 's4b/s4c', note: 'MANDATED verbatim, 3.0 s deadpan hold' },
  { id: 'C8', text: "DO NOT LOOK. (HE DIDN'T.)", t0: 67.4, t1: 70.0, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.2, out: 0.2 },
  { id: 'C9', text: 'STRAND BY STRAND.', t0: 80.4, t1: 83.2, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.2, out: 0.2 },
  { id: 'C10', text: 'TOP HAIR.', t0: 87.9, t1: 89.9, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.15, out: 0.15, short: true, note: 're-based into 6A per ruling' },
  { id: 'E1', text: 'THE FLOW PROVIDES.', t0: 97.5, t1: 101.0, style: 'title', x: 960, y: 540, anim: 'line', in: 0.3, out: 0.1, color: '#e8b23a', note: '3.5 s hold per ruling; no minHold override' },
]

// ---------- DRAWN text (NOT overlay captions; windows exported for score/draw sync) ----------
export const DRAWN = [
  { id: 'C3', text: 'X NEVER MARKS THE SCALP.', g0: 25.0, g1: 28.0, f0: 25.0, f1: 28.0, how: 'chalk on the board, squeak-synced g25.0; QA as text' },
  { id: 'D1', text: 'HAIR-CLASSIFIED — DO NOT COMB', g0: 90.6, g1: 92.1, f0: 91.0, f1: 92.5, how: 'crate stencil, stamp-slam anim at f91.0 (motion.stamp)' },
]

// ---------- cast + flashes ----------
export const CAST = {
  hero: { id: 42, role: 'DR. REMY FLOW', reason: 'Crimson', note: 'fedora; sword -> coiled whip; #893c3b flow FX' },
  rival: { id: 1344, role: 'BALDOUQ', reason: 'Mustache', note: 'white suit + Panama; melt keeps silhouette' },
  foreman: { id: 3870, role: 'GOON FOREMAN', reason: 'Harness' },
  smug: { id: 482, role: 'GOON SMUG', reason: 'Smug' },
  bruiser: { id: 2433, role: 'GOON BRUISER', reason: 'Bruiser' },
  weasel: { id: 4449, role: 'GOON WEASEL', reason: 'Weasel' },
  choir: { ids: [4036, 1260, 1793, 4450], role: 'CEREMONY CHOIR', reason: 'Clean', note: 'white/saffron robe repaint' },
  copper: { id: 30, role: 'DR. COPPER FLOW', reason: 'Emeritus' },
  gold: { id: 24, role: 'DR. GOLD FLOW', reason: 'Punchy' },
}
export const FLASHES = [[38.0, 0.28, 0.12]] // photo-bomb flash; in-scene stop blooms are per-shot fx

// ========================= SELF-CHECK =========================
// Runs ONLY when executed directly (`node films/raiders-of-the-lost-hair/timeline.js`);
// importing this module (browser, filmkit CLI) never triggers it.
const SELF_RUN = (() => {
  try {
    if (typeof process === 'undefined' || !process.argv || !process.argv[1]) return false
    const a = String(process.argv[1])
    // Suffix match survives symlinked cwd components (macOS /tmp -> /private/tmp):
    return import.meta.url.endsWith(a) || a.endsWith('raiders-of-the-lost-hair/timeline.js')
  } catch { return false }
})()
if (SELF_RUN) void (async () => {
  const fails = []
  const ok = (cond, msg) => { if (!cond) fails.push(msg) }

  // 1. shots tile [0, DURATION) exactly
  ok(DURATION === 101.0, 'DURATION ' + DURATION + ' != 101.0')
  let prev = 0
  for (const s of SHOTS) {
    ok(Math.abs(s.t0 - prev) < 1e-9, 'shots: gap/overlap before ' + s.name + ' (t0 ' + s.t0 + ', expected ' + prev + ')')
    ok(s.t1 > s.t0, 'shots: ' + s.name + ' non-positive length')
    prev = s.t1
  }
  ok(Math.abs(prev - DURATION) < 1e-9, 'shots: last t1 ' + prev + ' != DURATION')

  // 2. STOPS inside S3, ruling durations
  const s3 = SCENES.find((s) => s.name === 's3')
  ok(STOPS.length === 2 && STOPS[0].d === 0.18 && STOPS[1].d === 0.22, 'STOPS drifted from ruling (44.6/0.18, 47.8/0.22)')
  for (const s of STOPS) {
    ok(s.g >= s3.g0 && s.g <= s3.g1, 'stop g' + s.g + ' outside S3 g-bounds')
    const f1 = filmT(s.g) + s.d
    ok(f1 <= 56.0 + 1e-9, 'stop at g' + s.g + ' freeze ends ' + f1.toFixed(2) + ', past S3 film end')
  }

  // 3. captions: bounds, caps, length, y, holds, lanes, mandated lines
  let minVis = Infinity, minId = ''
  for (const c of CAPS) {
    ok(c.t0 >= 0 && c.t1 <= DURATION && c.t1 > c.t0, 'caption ' + c.id + ' window outside film or empty')
    ok(c.text.length <= 40, 'caption ' + c.id + ' too long (' + c.text.length + ' chars)')
    ok(c.text === c.text.toUpperCase(), 'caption ' + c.id + ' not ALL-CAPS')
    ok(c.y <= SAFE.captionYMax, 'caption ' + c.id + ' y ' + c.y + ' > captionYMax (under the bar)')
    const vis = (c.t1 - (c.out || 0)) - (c.t0 + (c.in || 0))
    ok(vis >= 1.5 - 1e-9 || c.short, 'caption ' + c.id + ' visible ' + vis.toFixed(2) + 's < 1.5 and not flagged short')
    if (vis < minVis) { minVis = vis; minId = c.id }
  }
  const c7 = CAPS.find((c) => c.id === 'C7')
  ok(c7 && c7.text === 'WHY DID IT HAVE TO BE BARBERS.' && c7.t1 - c7.t0 >= 3 - 1e-9, 'C7 mandated line/3s hold drifted')
  const d1 = DRAWN.find((d) => d.id === 'D1')
  ok(d1 && d1.text === 'HAIR-CLASSIFIED — DO NOT COMB', 'D1 stencil text drifted (em-dash verbatim)')
  const lanes = {}
  for (const c of CAPS) (lanes[c.y] = lanes[c.y] || []).push(c)
  for (const [y, arr] of Object.entries(lanes)) {
    arr.sort((a, b) => a.t0 - b.t0)
    for (let i = 0; i + 1 < arr.length; i++) ok(arr[i].t1 <= arr[i + 1].t0 + 1e-9, 'lane y' + y + ': ' + arr[i].id + ' overlaps ' + arr[i + 1].id)
  }

  // 4. C6 maps through filmT, readable >= 1.5 s, clear of both stop windows
  const c6 = CAPS.find((c) => c.id === 'C6')
  ok(c6 && Math.abs(c6.t0 - filmT(44.8)) < 1e-6 && Math.abs(c6.t1 - filmT(47.3)) < 1e-6, 'C6 window is not filmT of ledger g 44.8-47.3')
  const v6 = (c6.t1 - c6.out) - (c6.t0 + c6.in)
  ok(v6 >= 1.5 - 1e-9, 'C6 readable ' + v6.toFixed(2) + 's < 1.5')
  for (const s of STOPS) {
    const f0 = filmT(s.g)
    ok(!(c6.t0 + c6.in < f0 + s.d && f0 < c6.t1 - c6.out), 'C6 visible window overlaps stop window at g' + s.g)
  }

  // 5. event grid: every g inside its scene, f === filmT(g) exactly
  const EVS = { s1: EV_S1, title: EV_TITLE, s2: EV_S2, s3: EV_S3, s4: EV_S4, s5: EV_S5, s6: EV_S6 }
  let nEv = 0
  for (const [scene, ev] of Object.entries(EVS)) {
    const sc = SCENES.find((s) => s.name === scene)
    ok(sc, 'no scene row for ' + scene)
    if (!sc) continue
    for (const [k, v] of Object.entries(ev)) {
      for (const e of Array.isArray(v) ? v : [v]) {
        nEv++
        ok(typeof e.g === 'number' && Number.isFinite(e.g) && e.f === filmT(e.g), 'EV ' + scene + '.' + k + ' f != filmT(g)')
        ok(e.g >= sc.g0 - 1e-9 && e.g <= sc.g1 + 1e-9, 'EV ' + scene + '.' + k + ' g' + e.g + ' outside ' + scene + ' g[' + sc.g0 + ',' + sc.g1 + ']')
      }
    }
  }

  // 6. trajectories monotonic where the story says
  const mono = (fn, a, b, step = 0.1) => { for (let x = a; x < b - 1e-9; x += step) if (fn(x + step) < fn(x) - 1e-9) return false; return true }
  ok(mono(heroCorridorX, 7.0, 11.8), 'corridor hero moves backward')
  ok(mono(hairballX, 7.0, 11.8), 'hairball moves backward')
  ok(Math.abs(hairballGap(11.8) - 40) < 1e-9, 'hairball end gap != 40px')
  ok(mono(heroSkidX, 12.0, 12.9), 'skid moves backward')
  ok(mono(heroExitX, 18.8, 19.5), 'sprint-out moves backward')
  ok(mono(heroChaseX, 40.2, 43.0), 'chase closing model moves hero backward')
  ok(mono(truckX, 39.5, 55.0), 'truck moves backward')
  for (const s of SCISSORS) ok(s.tLand >= 58.6 && s.tLand <= 59.4 && s.x >= 0 && s.x <= 1920 && s.y >= SAFE.bandY[0] && s.y <= SAFE.bandY[1], 'scissor seed ' + s.seed + ' out of band/time')

  // 7. schedules
  ok(STRAND_F.length === 7, 'strand schedule must have 7 strands')
  ok(Math.abs(strandAlignG(0) - 79.8) < 1e-9 && Math.abs(strandAlignG(6) - 83.4) < 1e-9, 'strand schedule must cover g79.8-83.4')
  for (let k = 1; k < STRANDS; k++) ok(strandAlignG(k) > strandAlignG(k - 1), 'strand schedule not increasing at ' + k)
  ok(WISP_G.length === 5 && Math.abs(WISP_G[0] - 77.0) < 1e-9 && Math.abs(WISP_G[4] - 78.6) < 1e-9, 'wisp domino must span g77.0-78.6')
  for (let i = 1; i < WISP_G.length; i++) ok(Math.abs(WISP_G[i] - WISP_G[i - 1] - 0.4) <= 0.05, 'wisp spacing off at index ' + i)
  ok(crateY(95.3) <= SAFE.bandY[1], 'forklift recede sinks under the letterbox bar')
  for (const q of QMARK) ok(Math.abs(q.f - filmT(q.g)) < 1e-6, 'QMARK ' + q.pose + ' f != filmT(g)')

  // 8. drawn windows map through filmT; cast ids; determinism
  for (const d of DRAWN) {
    ok(Math.abs(d.f0 - filmT(d.g0)) < 1e-6 && Math.abs(d.f1 - filmT(d.g1)) < 1e-6, 'DRAWN ' + d.id + ' window not filmT-mapped')
    ok(d.f1 > d.f0 && d.f1 <= DURATION && d.text.length <= 40, 'DRAWN ' + d.id + ' bad window/length')
  }
  ok(CAST.hero.id === 42 && CAST.rival.id === 1344 && CAST.foreman.id === 3870 && CAST.choir.ids.length === 4, 'cast ids drifted from casting.md')
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
    ['duration', DURATION.toFixed(1) + ' s, 29 shots, 7 scenes + title card'],
    ['shots', SHOTS.length + ' shots tile [0, ' + DURATION + ') exactly, no gaps/overlaps'],
    ['stops', 'g' + STOPS[0].g + ' +' + STOPS[0].d + ' (windscreen), g' + STOPS[1].g + ' +' + STOPS[1].d + ' (axle) — both inside S3'],
    ['events', nEv + ' beats, every f === filmT(g); 3 logged pulls (arkPulse/handover/exit), S6 re-based'],
    ['captions', CAPS.length + ' overlay + ' + DRAWN.length + ' drawn; all <=40 chars, y <= ' + SAFE.captionYMax],
    ['caption holds', 'min visible ' + minVis.toFixed(2) + 's (' + minId + ', flagged); C7 3.00s verbatim; C6 readable ' + v6.toFixed(2) + 's clear of stops'],
    ['strands', '7 aligned g79.8 -> g83.4 (film 80.2 -> 83.8)'],
    ['wisp domino', WISP_G.length + ' pops @ 0.4s across g77.0-78.6 (film +0.4)'],
    ['trajectories', 'corridor/hairball(40px end gap)/skid/sprint/chase/truck monotonic; scissors x34 in-band'],
    ['determinism', 'no nondeterminism in source; hash-seeded scissors/spirals'],
    ['cast', 'hero 42, rival 1344, goons 3870/482/2433/4449, choir x4, colleagues 30/24'],
  ]
  console.log('SELF-CHECK OK — RAIDERS OF THE LOST HAIR')
  for (const [k, v] of rows) console.log('  ' + k.padEnd(15) + v)
})()
