// SPIDER-REM — "With Great Hair Comes Great Flow" — a Remy Boys comic-book picture. 90 s, 1920x1080.
// This file is the single timing truth imported by film.js (picture + captions) AND score.js.
import { seg } from 'filmkit/lib.js'
//
// -------------------------------------------------------------------------------------------------
// DOMAINS
// -------------------------------------------------------------------------------------------------
// g  = ABSOLUTE WORLD TIMELINE. BITE, CATCH, PUNCH, VOLLEY, WRAP and the swing legs are in g.
//      Hit-stops freeze g (STOPS below). flowSense (66–69) has NO global stop; it runs a
//      shot-local half-speed clock instead — see film.js.
// rt = REAL rendered seconds: cuts, captions, onomatopoeia, shake/flash, score. warp(rt) -> g
//      for drawing; filmT(g) -> rt for SFX. An impact lands at the START of its freeze.
// GRID: BPM 80 — beat 0.75 s, bar 3.00 s, D = 90 = 30 bars exactly. Every cut on a bar,
// every key event on a beat.
//
// WORLD: art.js OVER/AW/AH — the city lives on one oversized world canvas (parallax is drawn
// per-frame from seeded tables, so no layer bake needs extra width). All coordinates below are
// WORLD coordinates (frame coords == world coords at cam 960,540).
// -------------------------------------------------------------------------------------------------

// ---- clock grid ---------------------------------------------------------------------------------
export const BPM = 80
export const BEAT = 0.75
export const BAR = 3
export const D = 90

// ---- cast (see notes/casting.md — ids verified on contact sheets) --------------------------------
export const CAST = {
  HERO: 42,     // SPIDER-REM — auburn 'Crimson Flow'; sword mitigated by strand-over-blade wrap
  VILLAIN: 458, // THE DANDRUFF GOBLIN — angriest brows on the bald sheet, clean silhouette
  CIV: 24,      // rescued gold-haired bystander
}
export const NAMES = { hero: 'SPIDER-REM', vil: 'THE DANDRUFF GOBLIN', civ: 'GOLD FLOW' }

// ---- hit-stops (world g + duration) --------------------------------------------------------------
export const STOPS = [
  { g: 13.5, d: 0.14 }, // the bite
  { g: 48.0, d: 0.16 }, // the catch
  { g: 70.5, d: 0.14 }, // aerial punch
  { g: 76.5, d: 0.30 }, // wrap cinch (the money shot)
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

// ---- shots (every cut on a bar) -------------------------------------------------------------------
export const SHOTS = [
  { name: 'museumExt',  t0: 0,  t1: 6  },
  { name: 'tripPanel',  t0: 6,  t1: 12 },
  { name: 'bite',       t0: 12, t1: 15 },
  { name: 'transform',  t0: 15, t1: 21 },
  { name: 'mirror',     t0: 21, t1: 24 },
  { name: 'suitPanel',  t0: 24, t1: 33 },
  { name: 'firstThwip', t0: 33, t1: 36 },
  { name: 'swing1',     t0: 36, t1: 45 },
  { name: 'rescue24',   t0: 45, t1: 51 },
  { name: 'newsPanel',  t0: 51, t1: 57 },
  { name: 'goblinReveal', t0: 57, t1: 63 },
  { name: 'flakeBombs', t0: 63, t1: 66 },
  { name: 'flowSense',  t0: 66, t1: 69 },
  { name: 'airBattle',  t0: 69, t1: 72 },
  { name: 'wrapBarrage', t0: 72, t1: 78 },
  { name: 'hangSunset', t0: 78, t1: 84 },
  { name: 'stinger',    t0: 84, t1: 90 },
]

// ---- swing physics (pure functions of g; one half-swing per bar) ----------------------------------
// Leg: { t0, t1, ax, ay, L, TH0 }. u = seg(g,t0,t1); theta = TH0*cos(PI*(u-1)) → starts at
// -TH0 (left of anchor), bottoms at mid-bar (whoosh there), ends at +TH0. Hand/rope-end:
// x = ax + sin(theta)*L, y = ay + cos(theta)*L (+ rope-stretch bob at the bottom).
export const SWINGS = {
  A: { t0: 36.0, t1: 39.0, ax: 700,  ay: -90,  L: 700, TH0: 0.62 },
  B: { t0: 39.0, t1: 42.0, ax: 1420, ay: -110, L: 700, TH0: 0.62 },
  C: { t0: 42.0, t1: 45.0, ax: 1990, ay: -90,  L: 700, TH0: 0.46 },
  D: { t0: 48.0, t1: 50.4, ax: 1540, ay: -140, L: 990, TH0: 0.30, damped: 1.1 }, // rescue carry
  E: { t0: 69.15, t1: 70.5, ax: 1730, ay: -90, L: 640, TH0: 0.50, rev: true },   // battle entry, R→L
}
export function swingTheta(leg, g) {
  const u = seg(g, leg.t0, leg.t1)
  let th = leg.TH0 * Math.cos(Math.PI * (u - 1))
  if (leg.rev) th = -th
  if (leg.damped) th *= Math.exp(-leg.damped * Math.max(0, g - leg.t0))
  return th
}
export function swingPos(leg, g) {
  const th = swingTheta(leg, g)
  const u = seg(g, leg.t0, leg.t1)
  const bob = leg.L * (1 + 0.045 * (1 - Math.abs(th) / leg.TH0)) // rope stretch at the bottom
  return { x: leg.ax + Math.sin(th) * bob, y: leg.ay + Math.cos(th) * bob, th }
}
// release flight off leg C: tangent launch at 44.25, rooftop land at (2130, 540) by 44.65
export const LAND_C = { x: 2130, y: 540, release: 44.25, land: 44.65 }
// rescue dive: roof (2130,540) → catch (1540,850) at g 48.0 (accelerating u^1.8 curve)
export const DIVE = { x0: 2130, y0: 540, x1: 1540, y1: 850, t0: 46.3, t1: 48.0 }
// civilian 24: scaffold platform (1640,300) collapses at 44.6–45.4; straight fall from g 45
export const CIV = { x: 1640, yTop: 300, yBot: 850, t0: 45.0, t1: 48.0, balcony: { x: 1320, y: 815 } }
// post-catch: rides leg D; set down on the balcony at 49.9
export const SETDOWN = 49.9

// ---- goblin (all pure in g) ----------------------------------------------------------------------
export const GOBLIN = {
  reveal: { t0: 57, t1: 60, x0: -100, y0: 380, x1: 760, y1: 340 },   // crest the skyline, hover after
  hover: { t0: 60, t1: 63, x: 760, y: 350 },
  strafe: { t0: 63, t1: 66.2, x0: 620, y0: 370, x1: 2260, y1: 340 },
  contact: { t: 70.5, x: 1330, y: 445 },                              // where the punch lands
  approach: { t0: 69.0, t1: 70.5, x0: 2300, y0: 400 },
  recoil: { t0: 70.5, t1: 71.5, x0: 1330, y0: 445, x1: 1750, y1: 590 },
  recover: { x: 1720, y: 560 },
  orbit: { cx: 1290, cy: 500, rx: 200, ry: 70, w0: 1.2, spd: 0.5 },   // wrapBarrage ellipse, decays per pin
  volleyG: [73.5, 74.25, 75.0],                                       // three THWIP pins (g)
  wrapW: { t0: 74.6, t1: 76.5 },                                      // cocoon completeness
  hang: { x: 1290, y: 480, rot: -0.35 },                              // wrapped dangle
  boing: 77.4, heroExit: 77.7,
}
// flake-bombs: lobbed from the strafing glider (g, world pos of glider at drop)
export const BOMBS = [
  { g0: 63.0, x0: 860, y0: 330, vx: 240, vy: 420 },
  { g0: 63.75, x0: 1040, y0: 330, vx: 240, vy: 420 },
]
// flow-sense shot-local staging (lt = local half-speed seconds, lt = (t-66)*0.5 in picture)
export const FS = {
  hero: { x: 860, y: 470 },
  bomb1: { x0: 1440, x1: 221, y0: 560, dy: 260, grazeLt: 0.75 },      // grazes the dangling head at lt5 0.75 (rt 67.5)
  bomb2: { x0: 300, x1: 1200, y0: 300, dy: 340 },                     // opposite side split-S (lt 2.5)
}
// sunset hang (shot 16) + stinger (shot 17). The hero hangs top-left, over the sun; the
// tagline band sits at y≈700, clear below his dangling feet.
export const HANG = { heroX: 500, heroY: 290, cocoonX: 420, cocoonY: 780, sway: 0.06 }
export const LOUSE = { x: 960, y: 690, climbT0: 84.0, climbT1: 85.5, saluteG: 86.25 } // salute real 86.99
export const IRIS = { t0: 89.5, t1: 90.0 }

// ---- onomatopoeia (REAL rt; slam + burst, Anton inked; positions avoid faces) ---------------------
export const ONOS = [
  { w: 'SNAP!', t: 13.5,  x: 1340, y: 270, rot: -0.18, size: 130, kind: 'snap' },
  { w: 'THWIP!', t: 22.5, x: 1400, y: 360, rot: -0.12, size: 110, kind: 'gold' },
  { w: 'SNAP!', t: 26.39, x: 480,  y: 430, rot: -0.2,  size: 72,  kind: 'snap', panel: 1 },
  { w: 'THWIP!', t: 34.5, x: 1160, y: 300, rot: -0.15, size: 120, kind: 'gold' },
  { w: 'WHAM!', t: 48.14, x: 330,  y: 620, rot: -0.18, size: 130, kind: 'wham' },
  { w: 'FLAKE-POW!', t: 67.5, x: 1330, y: 560, rot: 0.14, size: 96, kind: 'flake' },
  { w: 'WHAM!', t: 70.8,  x: 560,  y: 350, rot: -0.15, size: 140, kind: 'wham' },
  { w: 'THWIP!', t: 73.94, x: 640,  y: 270, rot: -0.1, size: 90, kind: 'gold' },
  { w: 'THWIP!', t: 74.69, x: 1560, y: 300, rot: 0.1,  size: 90, kind: 'gold' },
  { w: 'THWIP!', t: 75.44, x: 1240, y: 140, rot: -0.08, size: 90, kind: 'gold' },
  { w: 'SNAP!', t: 76.94, x: 1440, y: 320, rot: -0.2, size: 150, kind: 'gold' },
]

// ---- shake / flash (real rt; shake blooms THROUGH the freezes) ------------------------------------
export const SHAKES = [
  { real: 13.5,  amp: 5, decay: 8 },
  { real: 16.5,  amp: 6, decay: 7 },
  { real: 34.64, amp: 3, decay: 7 },
  { real: 48.14, amp: 6, decay: 7 },
  { real: 52.5,  amp: 4, decay: 9 },
  { real: 70.8,  amp: 7, decay: 8 },
  { real: 76.94, amp: 8, decay: 8 },
]
export const FLASHES = [
  { real: 13.5,  peak: 0.26, decay: 0.12 },
  { real: 16.5,  peak: 0.18, decay: 0.15 },
  { real: 48.14, peak: 0.18, decay: 0.10 },
  { real: 70.8,  peak: 0.20, decay: 0.10 },
  { real: 76.94, peak: 0.30, decay: 0.18 },
]

// ---- captions (hold = t1 - t0 - in - out >= 3 everywhere; windows inside one shot) -----------------
export const CAPTION_STYLES = {
  card: { // comic caption box — film.js paints the paper box behind it on the overlay
    font: 'Anton', weight: '', size: 30, color: '#221436', align: 'left', x: 96, y: 152,
    lineHeight: 1.05, track: 2, anim: 'fade', in: 0.15, out: 0.15,
  },
  title: {
    font: 'Anton', weight: '', size: 150, color: '#ffffff', align: 'center', x: 960, y: 430,
    lineHeight: 1.0, track: 4, anim: 'line', in: 0.35, out: 0.25,
    glow: '#e8cf7e', glowBlur: 22,
  },
  newsHead: { // ink centered in the paper's headline band
    font: 'Anton', weight: '', size: 54, color: '#181420', align: 'center', x: 960, y: 646,
    lineHeight: 1.0, track: 2, anim: 'line', in: 0.6, out: 0.4,
  },
  third: { // villain lower-third on a purple-black chyron bar (film.js draws the bar)
    font: 'Anton', weight: '', size: 40, color: '#f4f1ea', align: 'left', x: 104, y: 952,
    lineHeight: 1.0, track: 2, anim: 'rise', rise: 14, in: 0.3, out: 0.3,
    glow: '#000000', glowBlur: 10,
  },
  thirdSub: {
    font: 'Anton', weight: '', size: 28, color: '#cbb7e8', align: 'left', x: 104, y: 1000,
    lineHeight: 1.0, track: 3, anim: 'rise', rise: 12, in: 0.3, out: 0.3,
    glow: '#000000', glowBlur: 8,
  },
  tagline: {
    font: 'Anton', weight: '', size: 72, color: '#ffffff', align: 'center', x: 960, y: 730,
    lineHeight: 1.0, track: 6, anim: 'rise', rise: 22, in: 0.3, out: 0.3,
    glow: '#e8b06a', glowBlur: 18,
  },
  taglineSub: {
    font: 'Anton', weight: '', size: 40, color: '#e8cf7e', align: 'center', x: 960, y: 812,
    lineHeight: 1.0, track: 8, anim: 'fade', in: 0.3, out: 0.3,
    glow: '#3a1e10', glowBlur: 10,
  },
  sting: {
    font: '"JetBrains Mono"', weight: 500, size: 30, color: '#d8d4cb', align: 'center', x: 960,
    y: 962, lineHeight: 1.0, track: 3, anim: 'fade', in: 0.15, out: 0.15,
    glow: '#000000', glowBlur: 8,
  },
}
export const CAPTIONS = [
  { id: 'openCard',  style: 'card',   text: 'A REMY BOYS PICTURE',                          t0: 0.75, t1: 5.25 },
  { id: 'cityCard',  style: 'card',   text: 'HAIR CITY — MUSEUM OF NATURAL FLOW',           t0: 6.75, t1: 11.25 },
  { id: 'title',     style: 'title',  text: 'SPIDER-REM',                                   t0: 16.5, t1: 20.9 },
  { id: 'newsHead',  style: 'newsHead', text: 'HAIR-LICLE MENACE STALKS CITY',              t0: 52.5, t1: 56.25 },
  { id: 'vilThird',  style: 'third',  text: 'THE DANDRUFF GOBLIN',                          t0: 58.5, t1: 62.25 },
  { id: 'vilSub',    style: 'thirdSub', text: 'BALD. AIRBORNE. FURIOUS.',                   t0: 58.5, t1: 62.25 },
  { id: 'tagline',   style: 'tagline', text: 'WITH GREAT HAIR COMES GREAT FLOW',            t0: 80.0, t1: 83.7 },
  { id: 'tagSub',    style: 'taglineSub', text: '— SPIDER-REM',                             t0: 80.0, t1: 83.7 },
  { id: 'sting',     style: 'sting',  text: 'NO LICE WERE HARMED. ONE WAS BITTEN.',         t0: 86.05, t1: 89.5, in: 0.2, out: 0.2 },
]

// ---- score section map (REAL rt windows; score.js consumes) ---------------------------------------
export const SCORE_MAP = [
  { name: 'museumCurious', t0: 0,   t1: 15  },
  { name: 'transformBraam', t0: 15, t1: 21  },
  { name: 'mirrorWhimsy',  t0: 21,  t1: 24  },
  { name: 'suitFanfare',   t0: 24,  t1: 36  },
  { name: 'swingDrive',    t0: 36,  t1: 51  },
  { name: 'newsSting',     t0: 51,  t1: 57  },
  { name: 'goblinMenace',  t0: 57,  t1: 69  },
  { name: 'skyBattle',     t0: 69,  t1: 78  },
  { name: 'sunsetPayoff',  t0: 78,  t1: 89.5 },
]
// hero motif — "Great Flow Theme", 4 bars @ 80 BPM, D major (MIDI). ORIGINAL.
export const MOTIF = {
  bars: [
    { chord: [50, 57], mel: [[1, 74], [2, 76], [3, 78, 2]] },              // D:  D5 E5 F#5(half)
    { chord: [47, 54], mel: [[1, 83], [2, 81], [3, 78, 2]] },              // Bm: B5 A5 F#5(half)
    { chord: [43, 50], mel: [[1, 76], [2, 78], [3, 79], [4, 81]] },        // G:  stepwise rise
    { chord: [45, 52], mel: [[1, 78, 2], [3, 74], [4, 69]] },              // A:  resolve + pickup
  ],
}
