// REMY BOYS — "HAIR WE GO" · official music video · timing truth
// 64 s · 120 BPM (beat 0.5 s, 4/4 bar 2 s) · MV camera cut grid 0.5 s.
// One world-clock pause: the razor slice at g = 43.5 freezes 0.12 s.
// Cast (contact-sheet QA'd): heroes 42/30/46/1000/4 (Moss Flow replaced Aqua
// 2084 — his harpoon prop reads as a black artifact), Cabald 1217/5/23/225,
// audience 854,425,636,3632,3686,331,1579,2102,3433,550,793,2401.

export const BPM = 120
export const BEAT = 60 / BPM // 0.5
export const BAR = BEAT * 4 // 2
export const DUR = 64

// Section boundaries in FILM time (shots cut here).
export const T = { intro: 0, verse: 4, chorus: 20, bridge: 36, drop: 44, outro: 62 }

export const BAND = [
  { id: 42, name: 'CRIMSON', role: 'LEAD FLOW · VOCALS', hair: '#c05a50' },
  { id: 30, name: 'BLOND', role: 'THE GOLDEN VOICE', hair: '#e6c690' },
  { id: 46, name: 'SILVER', role: 'THE QUIET ONE · KEYS', hair: '#aeb8b6' },
  { id: 1000, name: 'COBALT', role: 'BARITONE BARS', hair: '#4a6fb4' },
  { id: 4, name: 'MOSS', role: 'WAVE PRODUCER', hair: '#63b463' },
]

// V formation on the 960×540 stage (view coords): [crimson, blond, silver, cobalt, aqua]
export const FORMATION = [
  { x: 480, fy: 472 },
  { x: 264, fy: 424 },
  { x: 368, fy: 448 },
  { x: 592, fy: 448 },
  { x: 696, fy: 424 },
]

export const BARON = 1217
export const GOONS = [5, 23, 225]
export const AUDIENCE = [854, 425, 636, 3632, 3686, 331, 1579, 2102, 3433, 550, 793, 2401]

// ---- world clock (single hit-stop at the slice) -------------------------
export const STOPS = [{ g: 43.5, d: 0.12 }]

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

// ---- camera cuts (film time, 0.5 s grid) --------------------------------
export const CUTS = [
  { t: 0, cam: 'logo' },
  { t: 2, cam: 'reveal' },
  { t: 4, cam: 'wide' },
  { t: 8, cam: 'in0' },
  { t: 9.5, cam: 'in1' },
  { t: 11, cam: 'wide' },
  { t: 14, cam: 'in3' },
  { t: 15.5, cam: 'in2' },
  { t: 17, cam: 'crowd' },
  { t: 18.5, cam: 'wide' },
  { t: 20, cam: 'wide' },
  { t: 24, cam: 'low42' },
  { t: 25, cam: 'jump' },
  { t: 26, cam: 'wide' },
  { t: 30, cam: 'conf' },
  { t: 31.5, cam: 'low1' },
  { t: 33, cam: 'wide' },
  { t: 36, cam: 'wide' },
  { t: 37.5, cam: 'aisle' },
  { t: 39.5, cam: 'baron' },
  { t: 41.5, cam: 'duel' },
  { t: 43, cam: 'slice' },
  { t: 44, cam: 'wide' },
  { t: 45.5, cam: 'lowB' },
  { t: 47, cam: 'wide' },
  { t: 50, cam: 'low42' },
  { t: 51.5, cam: 'wide' },
  { t: 52.5, cam: 'jump' },
  { t: 54, cam: 'crowd' },
  { t: 56, cam: 'in4' },
  { t: 57.5, cam: 'low5' },
  { t: 59, cam: 'jump' },
  { t: 60, cam: 'wide' },
  { t: 61.5, cam: 'slate' },
]

// Camera = view-space centre (x, y) + zoom over the 960×540 stage.
export const CAM = {
  logo: { x: 480, y: 168, z: 1.7 },
  reveal: { x: 480, y: 300, z: 1.0, push: 0.05 },
  wide: { x: 480, y: 318, z: 1.02, drift: 7 },
  in0: { x: 480, y: 405, z: 2.05 },
  in1: { x: 264, y: 392, z: 2.05 },
  in2: { x: 368, y: 392, z: 2.05 },
  in3: { x: 592, y: 392, z: 2.05 },
  in4: { x: 696, y: 392, z: 2.0 },
  low42: { x: 480, y: 442, z: 2.35 },
  low1: { x: 264, y: 432, z: 2.3 },
  low5: { x: 736, y: 430, z: 2.1 },
  lowB: { x: 700, y: 420, z: 2.0 },
  jump: { x: 480, y: 380, z: 1.32 },
  conf: { x: 480, y: 260, z: 1.5 },
  aisle: { x: 180, y: 400, z: 1.75 },
  baron: { x: 310, y: 385, z: 2.2 },
  duel: { x: 410, y: 395, z: 1.85 },
  slice: { x: 405, y: 345, z: 1.95 },
  slate: { x: 480, y: 318, z: 1.02 },
  crowd: { pov: true },
}

// Member intro cards (film time; overlay panels, not lint captions —
// windows tile exactly so only one card is ever on screen).
export const CARDS = [
  { m: 0, t0: 8, t1: 9.5, side: 'L' },
  { m: 1, t0: 9.5, t1: 11, side: 'R' },
  { m: 3, t0: 14, t1: 15.5, side: 'L' },
  { m: 2, t0: 15.5, t1: 17.2, side: 'R' },
  { m: 4, t0: 56, t1: 57.5, side: 'L' },
]

// ---- world-time events (g domain; schedule audio via filmT) --------------
export const SLICE = 43.5 // g: razor contact → hit-stop
export const CONFETTI = [20, 24, 28, 32, 44, 48, 52, 56, 60] // cannons, alternating L/R
export const PYRO = [44, 45, 46, 47, 48, 49, 50, 51, 52, 54, 56, 58, 60]
export const LIGHTS_DOWN = 36
export const LIGHTS_UP = 44

// Wind-machine strength (hair streamers) as a pure function of world time.
export function wind(g) {
  if (g < 19.8) return 0
  if (g < 21) return seg01((g - 19.8) / 1.2)
  if (g < 35.6) return 1
  if (g < 43.9) return 0.22
  if (g < 44) return 0.5
  if (g < 48) return 1.15 + 0.15 * ((g - 44) / 4)
  if (g < 61.6) return 1.3
  return Math.max(0, 1.3 * (1 - (g - 61.6) / 1.4))
}
const seg01 = (u) => Math.max(0, Math.min(1, u))

// Chord map (MIDI) — verse D-A-E-F#m, chorus A-F#m-D-E, finale lift +2.
export const CHORDS = {
  D: [50, 54, 57], A: [57, 61, 64], E: [52, 56, 59], Fsm: [54, 57, 61],
  B: [59, 63, 66], Gsm: [56, 59, 63], Efsm: [54, 58, 61],
}
export const ROOTS = { D: 38, A: 45, E: 40, Fsm: 42, B: 47, Gsm: 44 }
