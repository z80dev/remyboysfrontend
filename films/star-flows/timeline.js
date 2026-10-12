// STAR FLOWS — Episode IV: A NEW FLOW
// Single cue sheet: picture AND score import this module. Nothing else owns a time.
// World clock g == film time until the first STOPS entry; after that filmAbs() maps out.
//
// CAST (chosen from output/_contact sheets, Oct 2026):
//   42  auburn sword hero ............ pilot RED-42
//   24  blonde shag, plain knit ...... wingman RED-24
//   28  blue bob, cheeky grin ........ wingman GOLD-28
//   12  longest clean blonde hair .... Princess Flow
//   23  pale bald + dark greatsword .. LORD SHEDDIUS (villain)
//   32  silver hair + blue saber ..... OBI-SHED, the flow-ghost
//   469/125/233 bald fleet extras .... Cabald bridge crew (near sprites only)
//   far rigs ........................ hairport ceremony crowd

export const TITLE = 'STAR FLOWS'
export const HERO = 42

export const seg = (t, a, b) => clamp((t - a) / (b - a))
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
export const E = {
  outQuad: (u) => 1 - (1 - u) * (1 - u),
  outCubic: (u) => 1 - Math.pow(1 - u, 3),
  outExpo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
  inCubic: (u) => u * u * u,
  inOutCubic: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
}
export const lerp = (a, b, u) => a + (b - a) * u
export const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

// ---------------------------------------------------------------- clock ----
export const T = {
  cold: 0,
  logo: 4.5,
  logoLand: 4.62,
  crawl: 10,
  pursuit: 26,
  dog: 38,
  kill1: 42.8,          // razor 0 dies
  kill2: 46.5,          // razor 1 dies (hit-stop)
  flee: 50.5,           // razors 2+3 break off
  trench: 56,
  torpLaunch: 70.6,
  poreHit: 71.4,        // torpedoes enter the pore (seen in trench shot)
  pullUp: 71.6,
  blast: 74,
  detFreeze: 74.55,     // world freezes — the breath before the bang
  cracks: 75.0,
  det: 75.55,           // Bald Star detonation
  novaEnd: 79.6,
  medal: 80,
  pin: 84.35,           // medal stamp (hit-stop)
  escape: 86.5,         // Sheddius' razor slips across the window
  iris0: 88.9,
  iris1: 89.7,
  end: 92.8,
}

export const STOPS = [
  { g: T.kill2, d: 0.18 },   // dogfight kill close-up
  { g: T.detFreeze, d: 0.28 }, // pre-detonation breath
  { g: T.pin, d: 0.12 },     // medal stamp
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

export function filmAbs(g) {
  let acc = 0
  for (const s of STOPS) if (s.g < g) acc += s.d
  return g + acc
}

// film-time shot table (contract: shots must cover [0, duration) in film time)
export const DURATION = +(filmAbs(T.end)).toFixed(2)
export const SHOT_F = {
  cold: [0, filmAbs(T.crawl)],
  crawl: [filmAbs(T.crawl), filmAbs(T.pursuit)],
  pursuit: [filmAbs(T.pursuit), filmAbs(T.dog)],
  dog: [filmAbs(T.dog), filmAbs(T.trench)],
  trench: [filmAbs(T.trench), filmAbs(T.blast)],
  blast: [filmAbs(T.blast), filmAbs(T.medal)],
  medal: [filmAbs(T.medal), DURATION],
}

// ---------------------------------------------------------------- vec -----
export const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const vscl = (a, k) => [a[0] * k, a[1] * k, a[2] * k]
export const vlen = (a) => Math.hypot(a[0], a[1], a[2])
export const vnorm = (a) => {
  const l = vlen(a) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

// ------------------------------------------------------------- dogfight ---
// Paths are pure functions of world time; facing/roll come from finite diffs.
export function heroPos(g) {
  return [150 * Math.sin(g * 0.5 + 0.3), 14 + 30 * Math.sin(g * 0.34 + 1.7), 430 + 95 * Math.sin(g * 0.22 + 0.6)]
}
export function wing1Pos(g) {
  return [-240 + 180 * Math.sin(g * 0.62), -20 + 55 * Math.sin(g * 0.47 + 3), 470 + 70 * Math.sin(g * 0.27 + 1.9)]
}
export function wing2Pos(g) {
  return [250 + 150 * Math.sin(g * 0.55 + 2.4), 90 + 45 * Math.sin(g * 0.41 + 0.8), 500 + 80 * Math.sin(g * 0.24 + 4.1)]
}
// razors chase with a lag; each has its own offset so silhouettes never stack
const ROFF = [[-70, 30, -80], [66, -26, -96], [-96, -8, -60], [104, 44, -70]]
export function razorPos(i, g) {
  const chase = i % 2 === 0 ? heroPos(g - 0.55) : wing1Pos(g - 0.6)
  const o = ROFF[i]
  const wig = [16 * Math.sin(g * 1.3 + i * 2.1), 12 * Math.sin(g * 1.7 + i), 0]
  const p = [chase[0] + o[0] + wig[0], chase[1] + o[1] + wig[1], chase[2] + o[2]]
  if (i >= 2 && g > T.flee) {
    const u = E.outQuad(seg(g, T.flee, T.flee + 3.2))
    p[0] += (i === 2 ? -1 : 1) * 300 * u
    p[1] += 130 * u
    p[2] -= 60 * u
  }
  return p
}
export function facing(fn, g, arg) {
  return vnorm(vsub(fn(g + 0.07, arg), fn(g - 0.07, arg)))
}
export function facingTo(g, from, to) {
  return vnorm(vsub(to, from))
}
export function bankRoll(fn, g, arg) {
  const a = fn(g - 0.09, arg), b = fn(g + 0.09, arg)
  const yaw0 = Math.atan2(a[0], a[2]), yaw1 = Math.atan2(b[0], b[2])
  return clamp((yaw1 - yaw0) * 26, -0.95, 0.95)
}

export const KILLS = [{ g: T.kill1, razor: 0, by: 'hero' }, { g: T.kill2, razor: 1, by: 'hero' }]

// Laser bolts: baked at module load as immutable events (no draw-side state).
// o = origin, d = unit dir, v = speed, life = seconds, col = colour, spark = end burst.
export const BOLTS = (() => {
  const arr = []
  const push = (g, o, d, col, v, life, spark) => arr.push({ g, o, d, col, v, life: life ?? 0.55, spark: spark ?? false })
  const fire = (fn, g0, g1, col, arg) => {
    for (let g = g0; g < g1; g += 0.12) {
      const o = fn(g, arg)
      push(g, o, facing(fn, g, arg), col, 620, 0.5, false)
    }
  }
  // rebel red streams
  fire(heroPos, T.dog + 0.6, T.kill1 - 0.4, '#ff5a4d')
  fire(heroPos, T.kill2 - 0.8, T.kill2 - 0.35, '#ff5a4d')
  fire(wing1Pos, T.dog + 2.0, T.dog + 4.4, '#ff5a4d')
  fire(wing2Pos, T.dog + 3.1, T.dog + 5.2, '#ff5a4d')
  fire(wing2Pos, T.flee - 1.2, T.flee - 0.2, '#ff5a4d')
  // aimed kill shots: leave the muzzle 0.24s before impact and land just after
  // the freeze starts, so the frozen frame shows a streak touching the target
  for (const k of KILLS) {
    const vg = k.g - 0.24
    const from = heroPos(vg)
    const to = razorPos(k.razor, k.g)
    const dist = vlen(vsub(to, from))
    push(vg, from, vnorm(vsub(to, from)), '#ffd23f', dist / 0.26, 0.26, true)
  }
  // razor green fire: 3-bolt volleys bracketing the heroes
  for (let i = 0; i < 4; i++) {
    const aliveUntil = i === 0 ? T.kill1 : i === 1 ? T.kill2 : T.flee
    for (let b = 0; b < 5; b++) {
      const gB = T.dog + 0.8 + b * 2.4 + i * 0.9
      if (gB > aliveUntil - 0.6) break
      for (let s = 0; s < 3; s++) {
        const g0 = gB + s * 0.12
        const o = razorPos(i, g0)
        const tgtFn = i % 2 === 0 ? heroPos : wing1Pos
        const tgt = vadd(tgtFn(g0 + 0.35), [(i % 3 - 1) * 50 + s * 14, 20 + (b % 3) * 24, 0])
        push(g0, o, vnorm(vsub(tgt, o)), '#69f07a', 560, 0.5, false)
      }
    }
  }
  return arr
})()

// ------------------------------------------------------------- pursuit ----
export const PLANET = { p: [420, 60, 1080], r: 320 }
export function cruiserPos(g) {
  const u = seg(g, 26.2, 33.4)
  const ease = E.inOutCubic(u)
  return [lerp(-560, 210, ease), lerp(48, -6, ease) + 8 * Math.sin(g * 1.3), lerp(640, 900, ease)]
}
export const JUMP_G = 33.5
export const BS_START = 29.6 // Bald Star starts rising from below frame
export function baldStarPos(g) {
  const u = E.inOutCubic(seg(g, BS_START, T.dog - 0.2))
  return [lerp(70, 30, u), lerp(-1500, -560, u), lerp(940, 760, u)]
}
export const BS_R = 520
// green bolts from off-screen pursuers bracketing the cruiser
export const PURSUIT_BOLTS = (() => {
  const arr = []
  for (let i = 0; i < 9; i++) {
    const g = 27.3 + i * 0.62
    const y = 20 + (i % 3) * 34 - 20
    arr.push({ g, o: [-900, cruiserPos(g)[1] + y, cruiserPos(g)[2] - 60 - (i % 4) * 40], d: [1, 0.04, 0.02], col: '#69f07a', v: 1400, life: 0.8, len: 120, wmul: 2.2 })
  }
  return arr
})()
export const GRAZE_G = 31.2 // spark off the cruiser hull

// --------------------------------------------------------------- trench ---
export const SPEED = 130
export const shipZ = (g) => (g - T.trench) * SPEED
export const weave = (g) => 16 * Math.sin(g * 1.55) + 9 * Math.sin(g * 0.83 + 2)
// final approach: the weave settles and RED-42 takes the left lane so the
// pore stays clear of the ship silhouette for the launch framing
export const approach = (g) => seg(g, 68, 70.4)
export function shipPos(g) {
  const up = E.outQuad(seg(g, T.pullUp, T.pullUp + 2.0))
  const app = approach(g)
  return [weave(g) * (1 - 0.55 * app) * (1 - up) - 20 * app * (1 - up), 7.5 + 2.2 * Math.sin(g * 2.3) + 170 * up, shipZ(g)]
}
export const TRENCH_HALF = 34
export const WALL_H = 27
export const RIB_GAP = 26
export const PORE_Z = 2100
export const TURRETS = [8, 22, 36, 52, 68].map((k) => ({ z: k * RIB_GAP, side: k % 2 ? 1 : -1 }))
export const TRENCH_BOLTS = (() => {
  const arr = []
  for (const tu of TURRETS) {
    const base = 56 + (tu.z - 130) / SPEED
    for (let j = 0; j < 3; j++) {
      const g = base + j * 0.42
      const pred = shipPos(g + 0.55)
      const miss = [tu.side * -1 * (14 + 12 * ((j * 7 + tu.z) % 3)), 4 + 6 * (j % 2), 0]
      const o = [tu.side * (TRENCH_HALF - 3), 6, tu.z]
      arr.push({ g, o, d: vnorm(vsub(vadd(pred, miss), o)), v: 330, life: 0.85 })
    }
  }
  return arr
})()
export function torpPos(k, g) {
  const t0 = T.torpLaunch
  const start = vadd(shipPos(t0), [k === 0 ? -3.4 : 3.4, -1.5, 8])
  const aim = [0, 4, PORE_Z]
  const dir = vnorm(vsub(aim, start))
  const v = vlen(vsub(aim, start)) / (T.poreHit - t0)
  const u = g - t0
  const converge = 3.4 * Math.max(0, 1 - u / 0.6) * (k === 0 ? -1 : 1)
  return vadd(vadd(start, vscl(dir, v * u)), [converge, 0, 0])
}
export const HUD_OFF = 69.9 // ghost said let go — the flow sight takes over

// ---------------------------------------------------------------- blast ---
export const BS_CAM = { pos: [880, 300, -1450], fov: 42 }

// ---------------------------------------------------------------- medal ---
export const MEDAL = { pin: T.pin, escape: T.escape }
export const CROWD_IDS = [30, 46, 1000, 4, 39, 83, 80, 56]
export const FLEET_IDS = [125, 233, 469]

// ---------------------------------------------------------------- crawl ---
// Screen-space crawl. Lines recede on a hyperbolic plane (far text converges
// and fades, exactly like a real crawl); per-kind z-gaps keep near text airy.
export const CRAWL_LINES = [
  { s: 'EPISODE IV', kind: 'ep' },
  { s: 'A NEW FLOW', kind: 'sub' },
  { s: '' },
  { s: 'IT IS A PERIOD OF CIVIL WAR. REBEL' },
  { s: 'HAIRPORTS HAVE WON THEIR FIRST' },
  { s: 'VICTORY AGAINST THE CABALD EMPIRE.' },
  { s: '' },
  { s: "NOW THE EMPIRE'S ULTIMATE WEAPON," },
  { s: 'THE BALD STAR — A RAZOR-LINED' },
  { s: 'STATION WITH ENOUGH SHINE TO SCALP' },
  { s: 'AN ENTIRE SYSTEM — HUNTS THE LAST' },
  { s: 'FREE HEADS OF THE GALAXY.' },
  { s: '' },
  { s: 'PRINCESS FLOW RACES HOME WITH THE' },
  { s: 'SECRET PLANS. ONE SMALL PORE MAY' },
  { s: 'RESTORE FLOW TO THE PEOPLE….' },
]
export const CRAWL_SPEED = 17.5
export const CRAWL_Z0 = 4
