// THE BALD AND THE BEAUTIFUL — a Remy Boys daytime drama · timing truth
// 84 s · 90 BPM (quarter 0.6667 s) · 6/8 bar = 2.0 s.
// Cast (contact-sheet QA'd, ids verified against scripts/quest-bald.json):
// see CAST below — filled by the casting pass, twins share wardrobe colours.
import { seg } from 'filmkit/lib.js'

export const BPM = 90
export const BEAT = 60 / BPM // 0.6667
export const BAR = BEAT * 3 // 6/8 compound bar = 2.0 s
export const DUR = 84

export const CAST = {
  // Casting pass (contact sheets read, bald flags verified vs scripts/quest-bald.json):
  // twins 394/233 share an EXACT shirt match #b26bea + identical chest print — the gag reads instantly.
  hero: { id: 394, name: 'REMY FLOW', epithet: 'Cobalt Flow', hair: '#133f59' },      // hairy twin
  heroine: { id: 24, name: 'VELVET FLOW', epithet: 'Gold Flow', hair: '#acab06' },    // the wife
  twin: { id: 233, name: 'REMY BALDWIN', epithet: 'Violet Soul', hair: null },        // BALD twin — Cabald
  doctor: { id: 568, name: 'DR. SHEARS', epithet: 'Gold Shades', hair: '#adaa05' },   // the confidant
  butler: { id: 52, name: 'BRISTLE', epithet: 'Copper Flow', hair: '#9c8942' },       // staff, far sprite
}
// Portrait face crop centres in the 600×600 originals (cx, cy) — for zoom punch-ins.
// Heroine's original has a busy HUD background: punch tight (cx shifted right — her
// face sits right-of-centre in the source). Hero's has a mouth-stick: crop close.
export const PCROP = { hero: [320, 240], heroine: [310, 240], twin: [325, 238], doctor: [325, 250] }

// ---- shots (film time, contiguous, cover [0, DUR)) ----------------------
export const S = {
  cold: { t0: 0, t1: 14 },    // "Previously on…" flashback flash-cuts
  titles: { t0: 14, t1: 26 }, // mansion establishing + cast panels + logo
  parlor: { t0: 26, t1: 42 }, // the confession (drawing room, day)
  twin: { t0: 42, t1: 60 },   // Baldwin arrives, DUN×3, the slap
  clinic: { t0: 60, t1: 72 }, // Dr. Shears and the evidence bag
  cliff: { t0: 72, t1: 78 },  // freeze frame → TO BE CONTINUED
  credits: { t0: 78, t1: 84 },// crawl over the night fountain
}

// ---- world clock: one hit-stop on the slap ------------------------------
export const SLAP_G = 55.4
export const STOPS = [{ g: SLAP_G, d: 0.35 }]

export function warp(ft) {
  // ft = shot-local + shot.t0 (film time before stop-adjust) → world time g
  let acc = 0
  for (const s of STOPS) {
    const rs = s.g + acc
    if (ft < rs) return { g: ft - acc, stop: null, sl: 0 }
    if (ft < rs + s.d) return { g: s.g, stop: s, sl: ft - rs }
    acc += s.d
  }
  return { g: ft - acc, stop: null, sl: 0 }
}

export function filmT(g) {
  let acc = 0
  for (const s of STOPS) if (s.g < g) acc += s.d
  return g + acc
}

// ---- crash zooms on the wide stage (the soap signature device) ----------
// focus in 0.16 s, hold ~1.0 s, release 0.8 s. f = (x, y) in 960×540 view.
export const ZOOMS = [
  { t: 35.3, x: 356, y: 374, k: 1.8 }, // hero's face "I have a twin brother."
  { t: 66.4, x: 512, y: 440, k: 1.5 }, // the toupee evidence bag (chart/blinds stay out; head modest)
]
export function zoomAt(t) {
  for (const z of ZOOMS) {
    if (t < z.t) continue
    const a = t - z.t
    if (a < 0.16) { const u = a / 0.16; return { k: 1 + (z.k - 1) * u * (2 - u), z } } // fast in
    if (a < 1.15) return { k: z.k, z }
    if (a < 1.95) { const u = (a - 1.15) / 0.8; return { k: z.k + (1 - z.k) * (u * u * (3 - 2 * u)), z } }
  }
  return { k: 1, z: null }
}

// ---- dramatic close-up INSERTS (full-res portrait punch-ins) ------------
// Hard cuts to a framed original with a fast zoom punch; DUN×3 ping-pong.
export const INSERTS = [
  { t0: 39.2, t1: 41.2, who: 'heroine' }, // gasp — "No… Remy… no…"
  { t0: 48.6, t1: 49.66, who: 'heroine' }, // DUN
  { t0: 49.66, t1: 50.72, who: 'hero' }, // DUN
  { t0: 50.72, t1: 51.78, who: 'twin' }, // DUN (smirk)
  { t0: 68.2, t1: 69.9, who: 'heroine' }, // clinic gasp
]

// ---- events ---------------------------------------------------------------
export const LIGHTNING = [43.0, 43.55]     // through the parlour window
export const FREEZE_T = 74.3               // cliffhanger freeze-frame moment
export const SLAP = {                      // contact geometry derives from the path
  x: 404, y: 378,                          // heroine's hand meets Baldwin's cheek
}

// ---- actor paths (960×540 view, feet y; analytic, no state) --------------
// Parlor, storm night: hero stands centre-left by the sofa; heroine by the window.
export const POS = {
  hero: { x: 350, fy: 470 },
  heroine: { x: 655, fy: 462 },
  twinDoor: { x: 120, fy: 468 },
  twinIn: { x: 262, fy: 470 },   // after the door entrance walk
  twinNear: { x: 390, fy: 470 }, // advances after the DUN×3, into slap range
  slapX: 428,                    // heroine lunges here
  doctor: { x: 560, fy: 474 },
  clinicHero: { x: 250, fy: 470 },
  clinicHeroine: { x: 165, fy: 464 },
  butler: { x: 96, fy: 470 },
}

// Baldwin enters 43.2–45.2 (door → parlour), closes in 50.8–52.6 after the DUNs
export function twinX(g) {
  if (g < 43.2) return POS.twinDoor.x
  if (g < 45.2) { const u = (g - 43.2) / 2; const e = u * u * (3 - 2 * u); return POS.twinDoor.x + (POS.twinIn.x - POS.twinDoor.x) * e }
  if (g < 50.8) return POS.twinIn.x
  if (g < 52.6) { const u = (g - 50.8) / 1.8; const e = u * u * (3 - 2 * u); return POS.twinIn.x + (POS.twinNear.x - POS.twinIn.x) * e }
  return POS.twinNear.x
}
// Heroine: window → slap lunge (53.0–55.4) → recoil back (56.0–57.4)
export function heroineX(g) {
  if (g < 53.0) return POS.heroine.x
  if (g < SLAP_G) { const u = (g - 53.0) / (SLAP_G - 53.0); return POS.heroine.x + (SLAP.x - POS.heroine.x) * (u * u * (3 - 2 * u)) }
  if (g < 57.4) { const u = (g - 56.0) / 1.4; return SLAP.x + (POS.heroine.x - SLAP.x) * (u < 0 ? 0 : u * u * (3 - 2 * u)) }
  return POS.heroine.x
}
// Hero yields left when Baldwin closes in (50.8), steps protectively forward after the slap
export function heroX(g) {
  if (g < 50.8) return POS.hero.x
  if (g < 56.0) { const u = seg(g, 50.8, 52.2); return POS.hero.x - 50 * (u * u * (3 - 2 * u)) }
  return POS.hero.x - 50 + 40 * Math.min(1, (g - 56.0) / 1.2)
}

// ---- dialogue + cards (declared captions live in film.js) ---------------
export const COPY = {
  prev: 'PREVIOUSLY ON THE BALD AND THE BEAUTIFUL',
  w1: 'You were twins.',
  w2: 'One was born… bald.',
  w3: 'And he wants it BACK.',
  d1: 'Velvet… I must confess something.',
  d2: 'You have been strange since Tuesday.',
  d3: 'I have a twin brother.',
  d4: 'No… Remy… no…',
  d5: 'Hello, brother.',
  d6: 'You destroyed my salon, Baldwin!',
  d7: 'I came for what is mine.',
  d8: 'The transplant rejected him.',
  d9: 'That was never hair. It was his toupee.',
  tbc: 'TO BE CONTINUED…',
}

// ---- score cue sheet (absolute film time; composer imports warp/filmT) --
export const CUES = {
  drone: 0.3,            // low drone under the "previously" card
  heartbeat0: 0.8,
  sting: [3.0, 6.4, 10.0], // organ+timpani stings on the flashback beats
  theme: 14.0,           // TITLE THEME (6/8 minor, strings+organ+piano), 12 s
  gliss1: 24.6,          // harp gliss into the parlour scene
  underscoreA: 26.2,     // soft organ/piano parlour bed
  riser1: 34.4,          // 1.0 s riser into the twin-brother zoom
  stingZoom: 35.3,       // big sting on the crash zoom
  gasp1: 39.2,           // choir gasp
  thunder: [43.0, 43.55],
  menace: 44.0,          // low strings bed for the twin scene
  duns: [48.6, 49.6, 50.6], // three descending organ/timpani hits
  slapG: SLAP_G,         // SFX via filmT(SLAP_G) + sting inside the freeze
  cadence1: 58.2,        // menacing half-cadence end of twin scene
  musicbox: 60.4,        // clinic unease
  riser2: 65.6,          // into the toupee reveal
  stingBig: 66.4,        // major reveal sting + harp
  gasp2: 68.4,
  scratch: 74.5,         // record scratch on the freeze
  swellTBC: 75.4,        // "to be continued" organ minor swell
  endTheme: 78.0,        // closing theme reprise
  gong: 83.0,
}
