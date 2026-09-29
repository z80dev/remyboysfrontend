/**
 * World art entry point (engine contract). Static map layers are baked once per map; everything animated is drawn per
 * frame for visible tiles only. See `types.ts` for the ground legend and object footprints.
 */
import type { MapObject, Theme } from '../types'
import { OBJ_SIZE, TILE } from '../types'
import { frameState, grassLean } from './actors'
import { ambient } from './ambient'
import { type Light, drawObjectAnim, objectSprite } from './objects'
import { PALS } from './palette'
import { Px, canvas, ctx2d, hash, hex, text } from './px'
import {
  E,
  N,
  NE,
  NW,
  S,
  SE,
  SW,
  T_FIELD,
  T_WATER,
  W,
  WATER_FRAMES,
  bridgeTile,
  bushTile,
  cliffShadowTile,
  cliffTile,
  fenceTile,
  flowerSprite,
  ledgeTile,
  tallBaseTile,
  tallTile,
  terOf,
  terrainTile,
  interiorTile,
  treeSprite,
  shoreTile,
  tallVariant,
  waterTile,
} from './tiles'

export {
  drawActor,
  drawEmote,
  drawGrassRustle,
  drawItemBall,
  drawLedgeDust,
  drawShadow,
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
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) if (grid[y][x] === '~') waterMask[y * w + x] = maskOf(grid, x, y, isWater)
    info = { w, h, waterMask, objs: undefined, animObjs: [] }
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
}

// ---------------------------------------------------------------------------------------------------------------

export function buildMapLayers(grid: string[], objects: MapObject[], theme: Theme): { below: HTMLCanvasElement; above: HTMLCanvasElement } {
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
      const v = Math.floor(hash(x, y, 7) * 8)
      if (c === 'o' || c === 'r' || c === 'W') {
        b.drawImage(interiorTile(c, maskOf(grid, x, y, (ch) => ch === c), (x + y) & 1), px, py)
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
        if (L === T_WATER) {
          b.drawImage(waterTile(theme, mask, x & 1, y & 1, 0), px, py)
          if (mask !== 255) b.drawImage(shoreTile(mask), px, py)
        } else b.drawImage(terrainTile(theme, L, mask, L === T_FIELD ? v : v & 3), px, py)
        first = false
      }
    }

  // --- cliffs, ledges, fences, bridges
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
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = at(x, y)
      const px = x * TILE
      const py = y * TILE
      if (c === '#') {
        const kind = cliffKind(x, y)
        const lip = kind !== 0 && y > 0 && at(x, y - 1) === '#' && cliffKind(x, y - 1) === 0
        const mask = maskOf(grid, x, y, (ch) => ch === '#')
        b.drawImage(cliffTile(theme, mask, kind, lip, Math.floor(hash(x, y, 3) * 4)), px, py)
        if (kind === 1 && y + 1 < h && at(x, y + 1) !== '#') b.drawImage(cliffShadowTile(), px, py + TILE)
      } else if (c === '^') {
        b.drawImage(ledgeTile(theme, maskOf(grid, x, y, (ch) => ch === '^')), px, py)
      } else if (c === 'F') {
        b.drawImage(fenceTile(theme, maskOf(grid, x, y, (ch) => ch === 'F')), px, py)
      } else if (c === 'w') {
        // spans N–S when chained vertically, or when a lone plank has water on both sides
        const chainH = at(x - 1, y) === 'w' || at(x + 1, y) === 'w'
        const chainV = at(x, y - 1) === 'w' || at(x, y + 1) === 'w'
        const vertical = chainH ? false : chainV || (isWater(at(x - 1, y) ?? '') && isWater(at(x + 1, y) ?? ''))
        b.drawImage(bridgeTile(vertical), px, py)
      }
    }

  // --- sprites (trees, bushes, objects) in painter's order; overhangs also go to `above`
  interface Spr {
    y: number
    x: number
    draw: () => void
  }
  const sprites: Spr[] = []
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = at(x, y)
      if (c === 'T') {
        const img = treeSprite(theme, Math.floor(hash(x, y, 11) * 3))
        sprites.push({
          y: y * TILE + TILE,
          x: x * TILE,
          draw: () => {
            b.drawImage(img, x * TILE - 2, y * TILE - 8)
            a.drawImage(img, 0, 0, 20, 8, x * TILE - 2, y * TILE - 8, 20, 8)
          },
        })
      } else if (c === 'b') {
        const img = bushTile(theme, Math.floor(hash(x, y, 13) * 2))
        sprites.push({ y: y * TILE + TILE, x: x * TILE, draw: () => b.drawImage(img, x * TILE, y * TILE) })
      }
    }
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
  for (let ty = ty0; ty <= ty1; ty++) {
    const row = grid[ty]
    for (let tx = tx0; tx <= tx1; tx++) {
      const c = row[tx]
      const sx = tx * TILE - cx
      const sy = ty * TILE - cy
      if (c === '~') {
        ctx.drawImage(waterTile(theme, info.waterMask[ty * info.w + tx], tx & 1, ty & 1, wf), sx, sy)
      } else if (c === ',') {
        for (let i = 0; i < 2; i++) {
          const h1 = hash(tx, ty, 41 + i)
          const h2 = hash(tx, ty, 51 + i)
          const fx = i === 0 ? 1 + Math.floor(h1 * 4) : 8 + Math.floor(h1 * 4)
          const fy = i === 0 ? Math.floor(h2 * 3) : 6 + Math.floor(h2 * 3)
          const col = flowers[Math.floor(hash(tx, ty, 61 + i) * flowers.length)]
          const f = Math.floor(t * 2.2 + h1 * 4 + tx * 0.35) & 3
          ctx.drawImage(flowerSprite(col, f), sx + fx, sy + fy)
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

export function drawAmbient(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  viewW: number,
  viewH: number,
  camX: number,
  camY: number,
  t: number,
): void {
  ambient(ctx, theme, viewW, viewH, camX, camY, t, lights)
}
