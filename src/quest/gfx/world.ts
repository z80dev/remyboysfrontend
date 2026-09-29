/**
 * World art entry point (engine contract). Static map layers are baked once per map; everything animated is drawn per
 * frame for visible tiles only. See `types.ts` for the ground legend and object footprints.
 */
import type { MapObject, Theme } from '../types'
import { OBJ_SIZE, TILE } from '../types'
import { frameState, grassLean } from './actors'
import { ambient } from './ambient'
import { sky } from './daylight'
import { type Light, drawObjectAnim, objectSprite } from './objects'
import { PALS } from './palette'
import { Px, canvas, ctx2d, hash, hex, text } from './px'
import { groundPass } from './terrain'
import {
  E,
  FIELD_VARIANTS,
  N,
  NE,
  NW,
  S,
  SE,
  SW,
  type Species,
  T_FIELD,
  T_WATER,
  TREE_W,
  W,
  WATER_FRAMES,
  bridgeTile,
  bushTile,
  cliffShadowTile,
  cliffTile,
  decoSprite,
  fenceTile,
  flowerLeaves,
  flowerSprite,
  flowerSpot,
  interiorTile,
  ledgeTile,
  reedSprite,
  tallBaseTile,
  tallTile,
  tallVariant,
  terOf,
  terrainTile,
  treeSprite,
  waterBaseTile,
  waterDeco,
  waterStar,
  waterTile,
} from './tiles'

export {
  drawActor,
  drawEmote,
  drawFootprint,
  drawGrassRustle,
  drawItemBall,
  drawLedgeDust,
  drawShadow,
  drawStepDust,
  drawTallGrassFront,
} from './actors'

const DIRS: [number, number, number][] = [
  [0, -1, N],
  [1, 0, E],
  [0, 1, S],
  [-1, 0, W],
  [1, -1, NE],
  [1, 1, SE],
  [-1, 1, SW],
  [-1, -1, NW],
]

/** Neighbour bitmask of tiles satisfying `same` (out-of-bounds counts as same so map edges never draw seams). */
function maskOf(grid: string[], x: number, y: number, same: (c: string) => boolean): number {
  let m = 0
  for (const [dx, dy, bit] of DIRS) {
    const row = grid[y + dy]
    const c = row?.[x + dx]
    if (c === undefined || same(c)) m |= bit
  }
  return m
}

const isWater = (c: string) => c === '~' || c === 'w'

interface MapInfo {
  w: number
  h: number
  /** Water neighbour mask per tile (only meaningful on '~'). */
  waterMask: Uint8Array
  /** Water tiles carrying a lily pad / rock: surface glints stay off them. */
  calm: Uint8Array
  /** Objects with per-frame animation, derived from `objs` (recomputed only when the array changes). */
  objs: MapObject[] | undefined
  animObjs: MapObject[]
}

const infoCache = new WeakMap<string[], MapInfo>()
function mapInfo(grid: string[], objects: MapObject[]): MapInfo {
  let info = infoCache.get(grid)
  if (!info) {
    const h = grid.length
    const w = grid.reduce((m, r) => Math.max(m, r.length), 0)
    const waterMask = new Uint8Array(w * h)
    const calm = new Uint8Array(w * h)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (grid[y][x] === '~') {
          waterMask[y * w + x] = maskOf(grid, x, y, isWater)
          calm[y * w + x] = waterDecoAt(grid, x, y) >= 0 ? 1 : 0
        }
    info = { w, h, waterMask, calm, objs: undefined, animObjs: [] }
    infoCache.set(grid, info)
  }
  if (info.objs !== objects) {
    info.objs = objects
    info.animObjs = objects.filter((o) => ANIMATED[o.kind])
  }
  return info
}

const ANIMATED: Partial<Record<MapObject['kind'], true>> = {
  lamp: true,
  crystal: true,
  server: true,
  atm: true,
  exchange: true,
  tower: true,
  fountain: true,
  candle_green: true,
  candle_red: true,
  statue: true,
  center: true,
  mart: true,
  house: true,
  lab: true,
  frame: true,
  billboard: true,
  pedestal: true,
  terminal: true,
  departure_board: true,
  bridge_gate: true,
  bag_scanner: true,
  vending: true,
  sconce: true,
  cafe: true,
}

// ---------------------------------------------------------------------------------------------------------------

interface Spr {
  y: number
  x: number
  draw: () => void
}

/** Lily pad / rock variant on an open-water tile, or -1. Deterministic so the surface overlay can stay calm there. */
function waterDecoAt(grid: string[], x: number, y: number): number {
  if (grid[y]?.[x] !== '~' || maskOf(grid, x, y, (c) => c === '~') !== 255) return -1
  const h = hash(x, y, 23)
  return h < 0.3 ? Math.floor(hash(x, y, 24) * 4) : h > 0.94 ? 4 : -1
}

/** Per-theme species mix: groves of conifers/broadleaves in the woods, showpiece trees standing alone. */
function speciesAt(theme: Theme, x: number, y: number, lone: boolean): Species {
  const h = hash(x, y, 19)
  if (theme === 'canyon') return h < 0.4 ? 'dead' : h < 0.75 ? 'saguaro' : 'spire'
  if (lone) {
    if (theme === 'city') return 'round'
    return h < 0.35 ? 'blossom' : h < 0.6 ? 'fruit' : theme === 'meadow' && h < 0.8 ? 'birch' : 'oak'
  }
  // groves: skewed 4×4 tile cells so species clump without a grid showing
  const grove = hash((x + (y >> 1)) >> 2, (y + (x >> 2)) >> 2, 20)
  const flip = h < 0.14
  if (theme === 'meadow' && grove > 0.78 !== flip) return 'birch'
  return grove < (theme === 'city' ? 0.55 : 0.42) !== flip ? 'pine' : 'oak'
}

/** Canyon plateau tops: hoodoos, saguaros and snags as y-sorted sprites, small scrub/cacti/bones/boulders baked flat. */
function plateauDressing(
  objects: MapObject[],
  theme: Theme,
  plateau: Uint8Array,
  tier: Uint8Array,
  w: number,
  h: number,
  b: CanvasRenderingContext2D,
  sprites: Spr[],
): void {
  const PW = w * TILE
  // keep clear of object art that overhangs onto the rock (tower spires, crystals)
  const clear = new Uint8Array(w * h)
  for (const o of objects) {
    const s = OBJ_SIZE[o.kind]
    for (let y = o.y - 3; y < o.y + s.h; y++)
      for (let x = o.x - 1; x <= o.x + s.w; x++) if (x >= 0 && y >= 0 && x < w && y < h) clear[y * w + x] = 1
  }
  const tierAt = (x: number, y: number) => tier[Math.max(0, y) * PW + x]
  const big: number[] = []
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!plateau[y * w + x] || clear[y * w + x] || (y + 1 < h && !plateau[(y + 1) * w + x])) continue
      const px = x * TILE
      const py = y * TILE
      const base = tierAt(px + 8, py + 14)
      const flat =
        tierAt(px + 2, py + 2) === base && tierAt(px + 14, py + 2) === base && tierAt(px + 8, py + 4) === base
      if (!flat) continue
      const hv = hash(x, y, 71)
      if (hv < 0.16) {
        if (
          tierAt(px + 8, py - 12) !== base ||
          big.some((k) => Math.abs((k % w) - x) < 3 && Math.abs(((k / w) | 0) - y) < 3)
        )
          continue
        big.push(y * w + x)
        const img = treeSprite(
          theme,
          hv < 0.06 ? 'spire' : hv < 0.11 ? 'saguaro' : 'dead',
          Math.floor(hash(x, y, 72) * 4),
          0,
          0,
        )
        sprites.push({ y: py + TILE, x: px, draw: () => b.drawImage(img, px - 4, py - TILE) })
      } else if (hv < 0.36) {
        const img = decoSprite(theme, Math.floor(hash(x, y, 73) * 4), hash(x, y, 75) < 0.5)
        b.drawImage(img, px + Math.floor(hash(x, y, 74) * 5) - 2, py + Math.floor(hash(x, y, 76) * 3) - 1)
      }
    }
}

export function buildMapLayers(
  grid: string[],
  objects: MapObject[],
  theme: Theme,
): { below: HTMLCanvasElement; above: HTMLCanvasElement } {
  const h = grid.length
  const w = grid.reduce((m, r) => Math.max(m, r.length), 0)
  const below = canvas(w * TILE, h * TILE)
  const above = canvas(w * TILE, h * TILE)
  const b = ctx2d(below)
  const a = ctx2d(above)
  const at = (x: number, y: number): string | undefined => grid[y]?.[x]
  const terAt = (x: number, y: number, self: number) => {
    const c = at(x, y)
    return c === undefined ? self : terOf(c)
  }

  // --- ground: terrain layers with autotiled edges
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = at(x, y) ?? '.'
      const px = x * TILE
      const py = y * TILE
      const v = Math.floor(hash(x, y, 7) * FIELD_VARIANTS)
      if (c === 'o' || c === 'r' || c === 'W') {
        const same = maskOf(grid, x, y, (ch) => ch === c)
        const wall = c === 'W' ? 0 : maskOf(grid, x, y, (ch) => ch === 'W')
        b.drawImage(interiorTile(c, same, wall, x, y), px, py)
        continue
      }
      if (c === '"') {
        b.drawImage(tallBaseTile(theme, v & 3), px, py)
        continue
      }
      const k = terOf(c)
      let layers = 1 << k
      for (const [dx, dy] of DIRS) {
        const n = terAt(x + dx, y + dy, k)
        if (n < k) layers |= 1 << n
      }
      let first = true
      for (let L = 0; L <= k; L++) {
        if (!(layers & (1 << L))) continue
        let mask = 255
        if (!first) {
          mask = 0
          for (const [dx, dy, bit] of DIRS) if (terAt(x + dx, y + dy, k) >= L) mask |= bit
        }
        if (L === T_WATER) b.drawImage(waterBaseTile(theme, mask), px, py)
        else b.drawImage(terrainTile(theme, L, mask, L === T_FIELD ? v : v & 3), px, py)
        first = false
      }
    }

  // --- cliffs, ledges, fences
  const isCliff = (x: number, y: number) => {
    const c = at(x, y)
    return c === undefined || c === '#'
  }
  const cliffKind = (x: number, y: number): number => {
    let d = 0
    while (isCliff(x, y + d) && y + d < h) d++
    if (y + d >= h) return 0
    if (d === 1) return 1
    let up = 0
    while (y - up - 1 >= 0 && isCliff(x, y - up - 1)) up++
    return d === 2 && d + up >= 3 ? 2 : 0
  }
  const plateau = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = at(x, y)
      const px = x * TILE
      const py = y * TILE
      if (c === '#') {
        const kind = cliffKind(x, y)
        const lip = kind !== 0 && y > 0 && at(x, y - 1) === '#' && cliffKind(x, y - 1) === 0
        const mask = maskOf(grid, x, y, (ch) => ch === '#')
        const v = theme === 'canyon' ? x & 3 : Math.floor(hash(x, y, 3) * 4)
        b.drawImage(cliffTile(theme, mask, kind, lip, v), px, py)
        if (kind === 1 && y + 1 < h && at(x, y + 1) !== '#') b.drawImage(cliffShadowTile(), px, py + TILE)
        if (kind === 0 && mask === 255) plateau[y * w + x] = 1
      } else if (c === '^') {
        b.drawImage(
          ledgeTile(
            theme,
            maskOf(grid, x, y, (ch) => ch === '^'),
          ),
          px,
          py,
        )
      } else if (c === 'F') {
        b.drawImage(
          fenceTile(
            theme,
            maskOf(grid, x, y, (ch) => ch === 'F'),
          ),
          px,
          py,
        )
      }
    }

  // --- trees: forest depth (8-way tile distance to open ground; the map edge continues the woods)
  const forest = new Uint8Array(w * h)
  const queue: number[] = []
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(x, y) !== 'T') queue.push(y * w + x)
  const seen = new Uint8Array(w * h)
  for (const i of queue) seen[i] = 1
  for (let qi = 0; qi < queue.length; qi++) {
    const i = queue[qi]
    const x = i % w
    const y = (i / w) | 0
    for (const [dx, dy] of DIRS) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const j = ny * w + nx
      if (seen[j]) continue
      seen[j] = 1
      forest[j] = forest[i] + 1
      queue.push(j)
    }
  }
  interface Tree {
    x: number
    y: number
    img: HTMLCanvasElement
    dx: number
  }
  const trees: Tree[] = []
  const casters: number[] = []
  const petals: number[] = []
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = at(x, y)
      if (c === 'b') casters.push(x * TILE + 9, y * TILE + 14, 7.5, 3.4)
      if (c !== 'T') continue
      const f = forest[y * w + x] || 4
      const lone = at(x - 1, y) !== 'T' && at(x + 1, y) !== 'T' && at(x, y - 1) !== 'T' && at(x, y + 1) !== 'T'
      const species = speciesAt(theme, x, y, lone)
      const hr = hash(x, y, 29)
      const hue = hr < 0.25 ? -1 : hr > 0.75 ? 1 : 0
      const jx = Math.floor(hash(x, y, 31) * 3) - 1
      const img = treeSprite(theme, species, Math.floor(hash(x, y, 11) * 4), Math.min(2, f - 1), hue)
      trees.push({ x, y, img, dx: x * TILE - 4 + jx })
      if (f < 3) casters.push(x * TILE + 10 + jx, y * TILE + 14, 10.5, 5.5)
      if (species === 'blossom') petals.push(x * TILE + 9, y * TILE + 18)
    }

  // --- bridges cast a shadow on the water beside/below the deck
  const bridges: { x: number; y: number; img: HTMLCanvasElement }[] = []
  const rects: number[] = []
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (at(x, y) !== 'w') continue
      // spans N–S when chained vertically, or when a lone plank has water on both sides
      const chainH = at(x - 1, y) === 'w' || at(x + 1, y) === 'w'
      const chainV = at(x, y - 1) === 'w' || at(x, y + 1) === 'w'
      const vertical =
        chainH && !chainV ? false : chainV || (isWater(at(x - 1, y) ?? '') && isWater(at(x + 1, y) ?? ''))
      const [a0, a1, e0, e1] = vertical
        ? [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)]
        : [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)]
      const railB = a1 !== 'w'
      bridges.push({
        x,
        y,
        img: bridgeTile(
          vertical,
          a0 !== 'w',
          railB,
          e0 !== 'w' && !isWater(e0 ?? ''),
          e1 !== 'w' && !isWater(e1 ?? ''),
        ),
      })
      if (railB) {
        if (vertical) rects.push((x + 1) * TILE, y * TILE + 2, 4, TILE)
        else rects.push(x * TILE + 2, (y + 1) * TILE, TILE, 4)
      }
    }

  // --- map-wide pixel pass: tonal patches, water depth, wet shores, forest floor, terraces, shadows, petals
  const img = b.getImageData(0, 0, w * TILE, h * TILE)
  const tier = groundPass(new Uint32Array(img.data.buffer), grid, theme, {
    w,
    h,
    forest,
    plateau,
    casters,
    rects,
    petals,
  })
  b.putImageData(img, 0, 0)

  for (const br of bridges) b.drawImage(br.img, br.x * TILE, br.y * TILE)

  // --- baked dressing: lily pads and rocks, shore reeds, flower leaves
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = at(x, y)
      if (c === '~') {
        const d = waterDecoAt(grid, x, y)
        if (d >= 0) b.drawImage(waterDeco(theme, d), x * TILE + 3, y * TILE + 4)
      } else if (c === ',') {
        for (let i = 0; i < 3; i++) {
          const s = flowerSpot(x, y, i)
          b.drawImage(flowerLeaves(theme, s), x * TILE + (s & 15), y * TILE + ((s >> 4) & 15) + 5)
        }
      } else if ((c === 's' || c === '.' || c === ':') && hash(x, y, 43) < 0.35) {
        const v = Math.floor(hash(x, y, 44) * 4)
        if (at(x, y + 1) === '~') b.drawImage(reedSprite(theme, v), x * TILE + 2 + v * 2, y * TILE + 6)
        else if (at(x + 1, y) === '~') b.drawImage(reedSprite(theme, v), x * TILE + 8, y * TILE + 2 + v)
        else if (at(x - 1, y) === '~') b.drawImage(reedSprite(theme, v), x * TILE - 1, y * TILE + 2 + v)
      }
    }

  // --- sprites (trees, bushes, plateau dressing, objects) in painter's order; overhangs also go to `above`
  const sprites: Spr[] = []
  for (const t of trees) {
    const dy = t.y * TILE - TILE
    sprites.push({
      y: t.y * TILE + TILE,
      x: t.x * TILE,
      draw: () => {
        b.drawImage(t.img, t.dx, dy)
        a.drawImage(t.img, 0, 0, TREE_W, TILE, t.dx, dy, TREE_W, TILE)
      },
    })
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (at(x, y) === 'b') {
        const img = bushTile(theme, Math.floor(hash(x, y, 13) * 4))
        sprites.push({ y: y * TILE + TILE, x: x * TILE, draw: () => b.drawImage(img, x * TILE, y * TILE) })
      }
    }
  if (tier && theme === 'canyon') plateauDressing(objects, theme, plateau, tier, w, h, b, sprites)
  for (const o of objects) {
    const size = OBJ_SIZE[o.kind]
    const s = objectSprite(o, theme)
    const dx = o.x * TILE + s.ox
    const dy = o.y * TILE + s.oy
    sprites.push({
      y: (o.y + size.h) * TILE,
      x: o.x * TILE,
      draw: () => {
        b.drawImage(s.img, dx, dy)
        if (s.oy < 0) a.drawImage(s.img, 0, 0, s.img.width, -s.oy, dx, dy, s.img.width, -s.oy)
      },
    })
  }
  sprites.sort((p, q) => p.y - q.y || p.x - q.x)
  for (const s of sprites) s.draw()
  if (theme === 'gallery') {
    const mat = new Px(32, 14)
    text(mat, 'EXIT', 8, 2, hex('#ffdf9a'))
    mat.hl(13, 9, 6, hex('#ffdf9a'))
    mat.hl(14, 10, 4, hex('#ffdf9a'))
    mat.hl(15, 11, 2, hex('#ffdf9a'))
    b.drawImage(mat.toCanvas(), 10 * TILE, (h - 1) * TILE)
  }
  return { below, above }
}

// ---------------------------------------------------------------------------------------------------------------

/** Light sources seen by the last `drawAnimated` call (same frame), consumed by `drawAmbient` for glows. */
const lights: Light[] = []

export function drawAnimated(
  ctx: CanvasRenderingContext2D,
  grid: string[],
  objects: MapObject[],
  theme: Theme,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  t: number,
): void {
  const info = mapInfo(grid, objects)
  const cx = Math.floor(camX)
  const cy = Math.floor(camY)
  frameState.camX = cx
  frameState.camY = cy
  frameState.theme = theme
  lights.length = 0
  const tx0 = Math.max(0, Math.floor(cx / TILE))
  const ty0 = Math.max(0, Math.floor(cy / TILE))
  const tx1 = Math.min(info.w - 1, Math.floor((cx + viewW - 1) / TILE))
  const ty1 = Math.min(info.h - 1, Math.floor((cy + viewH - 1) / TILE))
  const wf = Math.floor(t * 5) % WATER_FRAMES
  const flowers = PALS[theme].flowers
  const stars = sky.night > 0.3
  for (let ty = ty0; ty <= ty1; ty++) {
    const row = grid[ty]
    for (let tx = tx0; tx <= tx1; tx++) {
      const c = row[tx]
      const sx = tx * TILE - cx
      const sy = ty * TILE - cy
      if (c === '~') {
        const i = ty * info.w + tx
        const mask = info.waterMask[i]
        ctx.drawImage(waterTile(theme, mask, tx & 1, ty & 1, wf, info.calm[i] === 1), sx, sy)
        // night: the odd star twinkling in open water
        if (stars && mask === 255 && !info.calm[i]) {
          const h = hash(tx, ty, 47)
          if (h < 0.6)
            ctx.drawImage(
              waterStar(Math.floor(t * 2.5 + h * 9) & 3),
              sx + 2 + Math.floor(h * 18),
              sy + 2 + Math.floor(hash(tx, ty, 48) * 10),
            )
        }
      } else if (c === ',') {
        for (let i = 0; i < 3; i++) {
          const s = flowerSpot(tx, ty, i)
          const f = Math.floor(t * 2.2 + (s & 15) * 0.3 + tx * 0.35 + i) & 3
          ctx.drawImage(
            flowerSprite(flowers[(s >> 12) % flowers.length], (s >> 8) & 15, f),
            sx + (s & 15),
            sy + ((s >> 4) & 15),
          )
        }
      } else if (c === '"') {
        ctx.drawImage(tallTile(theme, grassLean(tx, ty, t), tallVariant(tx, ty)), sx, sy)
      }
    }
  }
  for (const o of info.animObjs) {
    const size = OBJ_SIZE[o.kind]
    const sx = o.x * TILE - cx
    const sy = o.y * TILE - cy
    if (sx > viewW + 16 || sy - 40 > viewH || sx + size.w * TILE < -16 || sy + size.h * TILE < -16) continue
    drawObjectAnim(ctx, o, theme, sx, sy, t, lights)
  }
}

/** `extra` = runtime-owned lights for this frame (e.g. the hero's night halo), added after the map's own. */
export function drawAmbient(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  viewW: number,
  viewH: number,
  camX: number,
  camY: number,
  t: number,
  extra: readonly Light[],
): void {
  for (const l of extra) lights.push(l)
  ambient(ctx, theme, viewW, viewH, camX, camY, t, lights)
}
