// THE GREAT FLOW BAKE-OFF — timing truth.
// Pure data + pure functions, no imports; consumed by film.js, art.js, score.js.
// All EV/STOPS times are FILM seconds. Music schedules straight through the
// picture freezes (impacts land ON the freeze onset). Choreography converts
// to world time via warp(t).g inside draw.

export const TITLE = 'THE GREAT FLOW BAKE-OFF'
export const SUBTITLE = 'A REMY BOYS BAKING CHAMPIONSHIP'
export const EPISODE = 'EPISODE 1: CRUST'

export const CAST = {
  hero: { key: 'hero', id: 109, name: 'CRIMSON FLOW', hair: '#893c3b', shirt: '#d6d6d6', accent: '#8b3a39', role: 'BAKER NO. 1' },
  moss: { key: 'moss', id: 4, name: 'MOSS FLOW', hair: '#446e44', shirt: '#9e6664', accent: '#9e6664', role: 'BAKER NO. 2' },
  gold: { key: 'gold', id: 24, name: 'GOLD FLOW', hair: '#acab06', shirt: '#052364', accent: '#b1ad00', role: 'BAKER NO. 3' },
  judge: { key: 'judge', id: 452, name: 'MIDNIGHT SOUL', hair: '#685240', shirt: '#0d0d0f', accent: '#6b5541', role: 'HEAD JUDGE, THE CABALD' },
  host: { key: 'host', id: 30, name: 'COPPER FLOW', hair: '#c1aa95', shirt: '#cdb468', accent: '#cdb468', role: 'PRESENTER' },
}

// 6/8 at dotted-quarter 90 → compound bar = 2.0 s. DUR 84 = 42 bars.
export const BPM = 90
export const BEAT = 60 / BPM // dotted-quarter 0.6667
export const BAR = BEAT * 3 // 2.0 s compound bar
export const DUR = 84

// Shot table — boundaries on bar lines.
export const T = {
  ext: 0, // tent exterior, host arrives
  titles: 8, // title card
  brief: 14, // welcome + judge intro ECU
  montage: 22, // knead/CHOP/roll/pipe/whisk beat cuts
  oven: 36, // collapse, fire, oven SLAM, timelapse
  judge: 46, // tastings DRY/BURNT, cloche reveal
  hand: 60, // DUN, THE HANDSHAKE
  finale: 70, // STAR BAKER banner, trophy, slate
}
export const SHOTS = [
  ['ext', T.ext, T.titles],
  ['titles', T.titles, T.brief],
  ['brief', T.brief, T.montage],
  ['montage', T.montage, T.oven],
  ['oven', T.oven, T.judge],
  ['judge', T.judge, T.hand],
  ['hand', T.hand, T.finale],
  ['finale', T.finale, DUR],
]

// Picture freezes (film-time onsets). Score impacts land exactly on these.
export const STOPS = [
  { g: 28.0, d: 0.14, why: 'butter CHOP' },
  { g: 43.0, d: 0.18, why: 'oven door SLAM' },
  { g: 63.0, d: 0.45, why: 'THE HANDSHAKE' },
]

export function warp(ts) {
  let acc = 0
  for (const s of STOPS) {
    const rs = s.g + acc
    if (ts < rs) return { g: ts - acc, stop: null, sl: 0 }
    if (ts < rs + s.d) return { g: s.g, stop: s, sl: ts - rs }
    acc += s.d
  }
  return { g: ts - acc, stop: null, sl: 0 }
}

export function filmT(g) {
  let acc = 0
  for (const s of STOPS) if (s.g < g) acc += s.d
  return g + acc
}

// Events — film seconds.
export const EV = {
  // titles
  titleSlam: 8.6,
  // brief
  hostCard: 15.2, // host raises cue card
  challenge: 18.0, // stamp TODAY'S SHOWSTOPPER: BREAD
  judgeECU1: 19.3, // judge insert punch-in (window 19.3–21.9)
  judgeECU1End: 21.9,
  clockOn: 22.0,
  // montage (world g == film time before 28)
  punch1: 24.0,
  punch2: 26.0,
  chop: 28.0, // hit-stop; butter cube splits, flour burst
  rollStart: 29.4,
  rollEnd: 31.4,
  pipeStart: 31.6, // gold pipes swirl at own station (camera visits)
  pipeEnd: 34.2,
  whiskStart: 34.2, // moss whisk frenzy
  whiskEnd: 35.8,
  // oven
  ovenOpenMoss: 37.2,
  collapse: 38.4, // moss cake deflates to splat
  fireStart: 40.2, // gold tray ignites
  firePeak: 41.4,
  fireOut: 42.5,
  heroSlide: 42.2, // hero slides loaf in
  ovenSlam: 43.0, // hit-stop
  timelapse: 44.0, // clock spin + dusk (to 46)
  // judging
  taste1: 47.4, // judge at moss plate
  bite1: 48.6,
  dry: 49.8, // stamp DRY.
  taste2: 51.4,
  bite2: 52.6,
  burnt: 53.8, // stamp BURNT.
  smokePuff: 54.6,
  drumroll: 55.5, // to 57.0
  heroCarry: 55.8, // hero carries cloche to tasting table (to 57.0)
  clocheLift: 57.0, // harp gliss, sparkle burst 57.2
  judgeLean: 58.2,
  hardSilence: 59.5, // everything musical cuts
  // handshake
  dun: 60.05,
  judgeECU2: 60.15, // window 60.15–62.7
  judgeECU2End: 62.7,
  grasp: 62.55,
  // 63.32 film = freeze onset (63.0 world + 0.32 accumulated): wash, impact,
  // clasp completion and the freeze all land on the same frame.
  handshake: 63.32,
  handStamp: 63.7,
  hostGasp: 64.6,
  cheer: 65.0, // moss+gold jump
  judgeECU3: 67.2, // the almost-smile, window 67.2–69.2
  judgeECU3End: 69.2,
  // finale
  banner: 70.2, // banner unfurls + confetti rain starts
  trophyLift: 71.6,
  smokeGag: 73.2, // gold still smouldering
  judgeClap: 74.4,
  slate: 76.0, // full-res end slate
  finalDing: 83.0, // oven timer triple-ding under the fade
}

// World-time (g-domain) mirror of EV: GW[k] = warp(EV[k]).g.
// Draw code animates in world g and must compare against GW, never EV,
// so events land at their FILM time after the accumulated freezes.
export const GW = {}
for (const k of Object.keys(EV)) GW[k] = warp(EV[k]).g
// Shot-boundary world times (for choreography that references shot starts).
export const GWT = {}
for (const k of Object.keys(T)) GWT[k] = warp(T[k]).g

// Framed ECU inserts (film-time windows), drawn over the paused stage.
export const INSERTS = [
  { who: 'judge', t0: EV.judgeECU1, t1: EV.judgeECU1End, line: 'dlgJudge', zoom: 1.22 },
  { who: 'judge', t0: EV.judgeECU2, t1: EV.judgeECU2End, zoom: 1.3, sweat: true },
  { who: 'judge', t0: EV.judgeECU3, t1: EV.judgeECU3End, zoom: 1.15, smile: true, line: 'almost' },
]

// Caption strings (film.js binds styles/windows; times live here).
export const COPY = {
  loc: 'THE FLOWSHIRE COUNTY SHOW — TENT ONE',
  welcome: 'WELCOME TO THE TENT, BAKERS.',
  challenge: "TODAY'S SHOWSTOPPER: BREAD",
  judgeLine: 'I JUDGE CRUSTS. NOT DREAMS.',
  chop: 'CHOP!',
  prove: 'PROVE. PUNCH. PROVE.',
  later: '45 MINUTES LATER\u2026',
  dry: 'DRY.',
  burnt: 'BURNT.',
  handshake: 'THE HANDSHAKE',
  almost: 'ALMOST.',
  star: 'STAR BAKER',
  slateNoCabalds: 'NO CABALDS WERE SHAVED IN THE MAKING OF THIS FILM.',
  slateProd: 'A FLOWSHIRE TELEVISION PRODUCTION',
}

// Camera cut/retarget list inside the montage (soft retargets, not hard cuts).
export const CAM = {
  ext: { x: 528, y: 300, z: 1.0, zEnd: 1.12 },
  briefWide: { x: 528, y: 296, z: 1.18 },
  stHero: { x: 480, y: 388, z: 1.75 },
  stGold: { x: 724, y: 388, z: 1.75 },
  stMoss: { x: 236, y: 388, z: 1.75 },
  ovens: { x: 300, y: 360, z: 1.5 },
  judgeTable: { x: 700, y: 360, z: 1.45 },
  reveal: { x: 660, y: 330, z: 1.6 },
  hands: { x: 640, y: 400, z: 1.95 },
  wide: { x: 528, y: 300, z: 1.0 },
}
