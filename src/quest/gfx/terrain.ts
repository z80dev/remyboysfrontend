/**
 * Map-wide ground pass, run once per map bake over the `below` pixels after tiles, cliffs and ledges are drawn. It
 * does what per-tile art can't: large dithered tonal patches, worn path centres, water depth by distance to shore,
 * wet sand at the waterline, dark forest floors, soft dithered canopy/bridge shadows, fallen blossom petals and the
 * stepped mesa terraces that turn the canyon's solid rock into a plateau landscape.
 */
import type { Theme } from '../types'
import { TILE } from '../types'
import { PALS } from './palette'
import { type Col, hash, hex, mix, shade } from './px'
import { dither, waterColors } from './tiles'

export interface GroundInfo {
  /** Map size in tiles. */
  w: number
  h: number
  /** Per tile: 0 = no tree, else min tile distance to open ground (1 = forest edge). */
  forest: Uint8Array
  /** Per tile: 1 = plateau top with rock on all eight sides (safe for terraces), else 0. */
  plateau: Uint8Array
  /** Shadow casters as flat [cx, cy, rx, ry] ellipses in pixels. */
  casters: number[]
  /** Shadow rectangles as flat [x, y, w, h] (bridge decks over water). */
  rects: number[]
  /** Blossom tree ground points [x, y] in pixels (petal fall). */
  petals: number[]
}

/** Terrace heights for canyon plateaus (px distance from the canyon floor where each tier begins). */
const TIERS = [46, 96]
const FACE = 9
/** Cell size of the cracked-slab pattern on rock floors. */
const SLAB = 22

function valueNoise(x: number, y: number, cell: number, seed: number): number {
  const gx = x / cell
  const gy = y / cell
  const x0 = Math.floor(gx)
  const y0 = Math.floor(gy)
  const fx = gx - x0
  const fy = gy - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = hash(x0, y0, seed)
  const b = hash(x0 + 1, y0, seed)
  const c = hash(x0, y0 + 1, seed)
  const d = hash(x0 + 1, y0 + 1, seed)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

/** Chamfer (3-4) distance ×3 to the nearest pixel with `inside` = 0. Pixels beyond the image never seed. */
function chamfer(inside: Uint8Array, w: number, h: number): Uint16Array {
  const d = new Uint16Array(w * h)
  for (let i = 0; i < d.length; i++) d[i] = inside[i] ? 60000 : 0
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      let m = d[i]
      if (!m) continue
      if (x > 0) m = Math.min(m, d[i - 1] + 3)
      if (y > 0) {
        m = Math.min(m, d[i - w] + 3)
        if (x > 0) m = Math.min(m, d[i - w - 1] + 4)
        if (x < w - 1) m = Math.min(m, d[i - w + 1] + 4)
      }
      d[i] = m
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      let m = d[i]
      if (!m) continue
      if (x < w - 1) m = Math.min(m, d[i + 1] + 3)
      if (y < h - 1) {
        m = Math.min(m, d[i + w] + 3)
        if (x < w - 1) m = Math.min(m, d[i + w + 1] + 4)
        if (x > 0) m = Math.min(m, d[i + w - 1] + 4)
      }
      d[i] = m
    }
  return d
}

interface Tone {
  dark: Col
  light: Col
  cell: number
  seed: number
  lo: number
  hi: number
}

/**
 * Runs the pass in place over `px` (ABGR pixels of the whole map). Returns the canyon terrace tier per pixel (0..2)
 * so decorations can avoid straddling a terrace face, or undefined for maps without plateaus.
 */
export function groundPass(px: Uint32Array, grid: string[], theme: Theme, info: GroundInfo): Uint8Array | undefined {
  const pal = PALS[theme]
  const W = info.w * TILE
  const H = info.h * TILE
  const tile = (x: number, y: number) => grid[y >> 4]?.[x >> 4]
  const memo = new Map<number, Col>()
  const mixed = (c: Col, to: Col, k: number, slot: number) => {
    const key = c * 8 + slot
    let r = memo.get(key)
    if (r === undefined) {
      r = mix(c, to, k)
      memo.set(key, r)
    }
    return r
  }

  // --- large-scale tonal patches on flat ramp bases
  const tones = new Map<Col, Tone>()
  const soft = theme === 'city' ? 0.35 : 0.5
  const [, fd, fb, fl] = pal.field
  tones.set(fb, { dark: mix(fb, fd, soft), light: mix(fb, fl, soft * 0.9), cell: 46, seed: 3, lo: 0.37, hi: 0.63 })
  tones.set(pal.sand[2], {
    dark: mix(pal.sand[2], pal.sand[1], 0.4),
    light: mix(pal.sand[2], pal.sand[3], 0.5),
    cell: 30,
    seed: 5,
    lo: 0.34,
    hi: 0.66,
  })
  tones.set(pal.rock[2], {
    dark: mix(pal.rock[2], pal.rock[1], 0.45),
    light: mix(pal.rock[2], pal.rock[3], 0.45),
    cell: 40,
    seed: 7,
    lo: 0.36,
    hi: 0.62,
  })
  tones.set(pal.dirt[2], {
    dark: mix(pal.dirt[2], pal.dirt[1], 0.35),
    light: pal.dirt[2],
    cell: 34,
    seed: 9,
    lo: 0.3,
    hi: 2,
  })
  tones.set(pal.tallBase[1], { dark: pal.tallBase[0], light: pal.tallBase[1], cell: 30, seed: 11, lo: 0.3, hi: 2 })
  const [td, tb, tl] = pal.cliffTop
  tones.set(tb, { dark: mix(tb, td, 0.45), light: mix(tb, tl, 0.45), cell: 38, seed: 13, lo: 0.36, hi: 0.64 })
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const t = tones.get(px[i])
      if (!t) continue
      const n = 0.62 * valueNoise(x, y, t.cell, t.seed) + 0.38 * valueNoise(x, y, t.cell * 0.42, t.seed + 1)
      const v = n + (dither(x, y) - 0.5) * 0.07
      if (v < t.lo) px[i] = t.dark
      else if (v > t.hi) px[i] = t.light
    }

  // --- rock floors break into large sun-cracked slabs (cellular seams, lit on their lower lip, broken in places)
  const rockTone = tones.get(pal.rock[2])
  const rockSet = new Set<Col>([pal.rock[2], rockTone?.dark ?? 0, rockTone?.light ?? 0])
  const crack = new Uint8Array(W * H)
  let hasRock = false
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (tile(x, y) !== 'd' || !rockSet.has(px[i])) continue
      hasRock = true
      const gx = Math.floor(x / SLAB)
      const gy = Math.floor(y / SLAB)
      let d1 = 1e9
      let d2 = 1e9
      for (let j = -1; j <= 1; j++)
        for (let k = -1; k <= 1; k++) {
          const fx = (gx + k + 0.15 + hash(gx + k, gy + j, 81) * 0.7) * SLAB
          const fy = (gy + j + 0.15 + hash(gx + k, gy + j, 82) * 0.7) * SLAB
          const d = (x + 0.5 - fx) ** 2 + ((y + 0.5 - fy) * 1.2) ** 2
          if (d < d1) {
            d2 = d1
            d1 = d
          } else if (d < d2) d2 = d
        }
      if (Math.sqrt(d2) - Math.sqrt(d1) < 1.2 && valueNoise(x, y, 11, 83) > 0.3) crack[i] = 1
    }
  if (hasRock) {
    const seam = mix(pal.rock[0], pal.rock[1], 0.3)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        if (crack[i]) px[i] = seam
        else if (y > 0 && crack[i - W] && rockSet.has(px[i])) px[i] = pal.rock[3]
      }
  }

  // --- worn path centres: the middle of wide dirt runs is trodden lighter
  const fieldTone = tones.get(fb)
  const grassSet = new Set<Col>([...pal.field, ...pal.tuft, fieldTone?.dark ?? 0, fieldTone?.light ?? 0])
  let hasDirt = false
  const dirtIn = new Uint8Array(W * H)
  for (let i = 0; i < dirtIn.length; i++)
    if (tile(i % W, (i / W) | 0) === ':' && !grassSet.has(px[i])) {
      dirtIn[i] = 1
      hasDirt = true
    }
  if (hasDirt) {
    const dd = chamfer(dirtIn, W, H)
    const worn = mix(pal.dirt[2], pal.dirt[3], 0.5)
    const [, , dbase] = pal.dirt
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        if (!dirtIn[i] || px[i] !== dbase) continue
        const thr = 6 + valueNoise(x, y, 22, 17) * 3.5
        if (dd[i] / 3 + (dither(x, y) - 0.5) * 1.6 > thr) px[i] = worn
      }
  }

  // --- water depth + wet margins
  const wcols = waterColors(theme)
  const [wedge, wdeep, wbase, wlight] = pal.water
  const waterIn = new Uint8Array(W * H)
  const landIn = new Uint8Array(W * H)
  let hasWater = false
  for (let i = 0; i < px.length; i++) {
    const c = tile(i % W, (i / W) | 0)
    const isW = (c === '~' || c === 'w') && wcols.has(px[i])
    waterIn[i] = isW && px[i] === wbase ? 1 : 0
    landIn[i] = isW ? 0 : 1
    if (isW) hasWater = true
  }
  if (hasWater) {
    const depth = chamfer(waterIn, W, H)
    const shallow = mix(wbase, wlight, 0.3)
    const mid = mix(wbase, wdeep, 0.55)
    const abyss = mix(wdeep, wedge, 0.35)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        if (!waterIn[i]) continue
        const d = depth[i] / 3 + (dither(x, y) - 0.5) * 2.4 + (valueNoise(x, y, 13, 29) - 0.5) * 5
        px[i] = d < 3 ? shallow : d < 7 ? wbase : d < 12 ? mid : d < 17 ? wdeep : abyss
      }
    const wet = chamfer(landIn, W, H)
    const wetTint = hex('#2a1c3c')
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        if (!landIn[i]) continue
        const d = wet[i] / 3
        if (d > 3.6) continue
        const k = d < 1.5 ? 0.34 : d < 2.6 ? 0.22 : dither(x, y) < 0.5 ? 0.14 : 0
        if (k) px[i] = mixed(px[i], wetTint, k, d < 1.5 ? 1 : d < 2.6 ? 2 : 3)
      }
  }

  // --- forest floor: deep in the woods the ground between trunks is dark loam
  const floor = shade(pal.field[0], -0.42)
  const floor2 = shade(pal.field[0], -0.3)
  for (let ty = 0; ty < info.h; ty++)
    for (let tx = 0; tx < info.w; tx++) {
      const f = info.forest[ty * info.w + tx]
      if (f < 2) continue
      for (let y = ty * TILE; y < ty * TILE + TILE; y++)
        for (let x = tx * TILE; x < tx * TILE + TILE; x++) px[y * W + x] = hash(x, y, 91) < 0.08 ? floor2 : floor
    }

  // --- canyon terraces
  let tier: Uint8Array | undefined
  if (info.plateau.some((v) => v)) {
    const rockIn = new Uint8Array(W * H)
    for (let i = 0; i < rockIn.length; i++) rockIn[i] = tile(i % W, (i / W) | 0) === '#' ? 1 : 0
    const dist = chamfer(rockIn, W, H)
    tier = new Uint8Array(W * H)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        if (!rockIn[i]) continue
        const d = dist[i] / 3 + (valueNoise(x, y, 26, 23) - 0.5) * 18
        tier[i] = d >= TIERS[1] ? 2 : d >= TIERS[0] ? 1 : 0
      }
    const st = pal.strata
    const top = pal.cliffTop
    const lift = [0, 0.1, 0.2]
    const faceCols = [top[3], st[0], st[1], st[2], st[2], st[3], st[3], st[4], st[6]]
    const shadowTint = hex('#1a1030')
    const t = tier
    const tAt = (x: number, y: number) =>
      x < 0 || y < 0 || x >= W || y >= H
        ? t[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))]
        : t[y * W + x]
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!info.plateau[(y >> 4) * info.w + (x >> 4)]) continue
        const i = y * W + x
        const k = t[i]
        let face = 0
        for (let j = 1; j <= FACE + 2; j++)
          if (tAt(x, y - j) > k) {
            face = j
            break
          }
        if (face && face <= FACE) {
          // strata face of the tier above, sagging with a slow wave so terraces don't look ruled
          const wave = Math.round(Math.sin(x * 0.09) * 0.8)
          px[i] = faceCols[Math.min(FACE - 1, Math.max(0, face - 1 + (face > 1 ? wave : 0)))]
          if (face > 1 && face < FACE && hash(x, 0, 41) < 0.07) px[i] = st[5]
          continue
        }
        if (face > FACE) {
          if (face === FACE + 1 || dither(x, y) < 0.5) px[i] = mixed(px[i], shadowTint, 0.28, 4)
          continue
        }
        if (k && lift[k]) px[i] = mixed(px[i], hex('#fff0d0'), lift[k], 4 + k)
        if (tAt(x, y + 1) < k) px[i] = top[3]
        else if (tAt(x, y - 1) < k) px[i] = shade(top[3], 0.2)
        else if (tAt(x + 1, y) < k) px[i] = st[4]
        else if (tAt(x - 1, y) < k) px[i] = top[3]
      }
  }

  // --- blossom petals drifting onto the grass around cherry trees
  const p = info.petals
  for (let k = 0; k < p.length; k += 2) {
    const R = 26
    for (let y = Math.max(0, p[k + 1] - R); y < Math.min(H, p[k + 1] + R); y++)
      for (let x = Math.max(0, p[k] - R); x < Math.min(W, p[k] + R); x++) {
        const i = y * W + x
        if (!grassSet.has(px[i])) continue
        const d = Math.hypot(x - p[k], (y - p[k + 1]) * 1.3) / R
        if (d > 1 || hash(x, y, 57) > 0.05 * (1 - d)) continue
        px[i] = hash(x, y, 58) < 0.5 ? pal.blossom[3] : pal.blossom[4]
      }
  }

  // --- soft dithered shadows (trees, bushes, bridges) falling down-right from the light
  const sh = new Uint8Array(W * H)
  const c = info.casters
  for (let k = 0; k < c.length; k += 4) {
    const [cx, cy, rx, ry] = [c[k], c[k + 1], c[k + 2], c[k + 3]]
    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(H - 1, Math.ceil(cy + ry)); y++)
      for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(W - 1, Math.ceil(cx + rx)); x++) {
        const nx = (x + 0.5 - cx) / rx
        const ny = (y + 0.5 - cy) / ry
        const q = nx * nx + ny * ny
        if (q > 1) continue
        const s = q < 0.6 ? 2 : 1
        const i = y * W + x
        if (s > sh[i]) sh[i] = s
      }
  }
  const r = info.rects
  for (let k = 0; k < r.length; k += 4)
    for (let y = r[k + 1]; y < r[k + 1] + r[k + 3]; y++)
      for (let x = r[k]; x < r[k] + r[k + 2]; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue
        const edge = x === r[k] + r[k + 2] - 1 || y === r[k + 1] + r[k + 3] - 1
        const s = edge ? 1 : 2
        if (s > sh[y * W + x]) sh[y * W + x] = s
      }
  const shadowTint = hex('#1e1440')
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const s = sh[i]
      if (!s || (s === 1 && ((x + y) & 1) === 1)) continue
      px[i] = mixed(px[i], shadowTint, 0.3, 0)
    }
  return tier
}
