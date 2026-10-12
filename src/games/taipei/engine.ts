import { mulberry32 } from '../kit/remy'
import { strings } from './strings'

export type LayoutId = 'standard' | 'bridge' | 'castle' | 'rug-tower' | 'pyramid' | 'spiral' | 'flag'
export type Position = { x: number; y: number; z: number }
export type Pair = readonly [number, number]
export type Deal = { number: number; layout: LayoutId; positions: readonly Position[]; faces: readonly number[]; solution: readonly Pair[] }
export type Game = { deal: Deal; removed: readonly boolean[]; history: readonly Pair[]; selected: number | null }
export const LAYOUT_IDS: readonly LayoutId[] = ['standard', 'bridge', 'castle', 'rug-tower', 'pyramid', 'spiral', 'flag']
export const TILE_COUNT = 144
export const FACE_COUNT = 42

export function clockRuns(started: boolean, hidden: boolean, modal: boolean, tilesLeft: number): boolean {
  return started && !hidden && !modal && tilesLeft > 0
}
export function clockSeconds(milliseconds: number, since: number | null, now: number): number {
  return Math.floor((milliseconds + (since === null ? 0 : now - since)) / 1000)
}

function rectangle(out: Position[], x: number, y: number, w: number, h: number, z: number) {
  for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) out.push({ x: x + col, y: y + row, z })
}

function makeLayout(id: LayoutId): readonly Position[] {
  const p: Position[] = []
  if (id === 'standard') {
    const widths = [12, 8, 10, 12, 12, 10, 8, 12]
    widths.forEach((w, y) => rectangle(p, (12 - w) / 2 + 1, y, w, 1, 0))
    rectangle(p, 0, 3.5, 1, 1, 0)
    rectangle(p, 13, 3.5, 2, 1, 0)
    rectangle(p, 4, 1, 6, 6, 1)
    rectangle(p, 5, 2, 4, 4, 2)
    rectangle(p, 6, 3, 2, 2, 3)
    rectangle(p, 6.5, 3.5, 1, 1, 4)
  } else if (id === 'bridge') {
    for (const x of [0, 10]) {
      rectangle(p, x, 0, 4, 8, 0)
      rectangle(p, x, 2, 4, 4, 1)
      rectangle(p, x + 1, 2, 2, 4, 2)
    }
    rectangle(p, 4, 2, 6, 4, 0)
    rectangle(p, 5, 3, 4, 2, 1)
  } else if (id === 'castle') {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) {
      if (y !== 7 || x !== 5 && x !== 6) p.push({ x, y, z: 0 })
    }
    rectangle(p, 5, -1, 2, 1, 0)
    for (const x of [0, 9]) for (const y of [0, 6]) {
      rectangle(p, x, y, 3, 2, 1)
      for (let z = 2; z < 5; z++) rectangle(p, x + 0.5, y + 0.5, 2, 1, z)
    }
  } else if (id === 'rug-tower') {
    rectangle(p, 0, 0, 12, 6, 0)
    rectangle(p, 3, 0, 6, 6, 1)
    rectangle(p, 4, 1, 4, 4, 2)
    rectangle(p, 4, 1.5, 4, 3, 3)
    rectangle(p, 5, 1.5, 2, 3, 4)
    rectangle(p, 5, 2.5, 2, 1, 5)
  } else if (id === 'pyramid') {
    rectangle(p, 0, 0, 10, 8, 0)
    rectangle(p, 1, 1.5, 8, 5, 1)
    rectangle(p, 3, 2, 4, 4, 2)
    rectangle(p, 4, 2.5, 2, 3, 3)
    rectangle(p, 4, 3.5, 2, 1, 4)
  } else if (id === 'spiral') {
    const path: Position[] = []
    rectangle(path, 0, 0, 12, 1, 0)
    rectangle(path, 11, 1, 1, 11, 0)
    rectangle(path, 0, 11, 11, 1, 0)
    rectangle(path, 0, 2, 1, 9, 0)
    rectangle(path, 1, 2, 9, 1, 0)
    rectangle(path, 9, 3, 1, 7, 0)
    rectangle(path, 2, 9, 7, 1, 0)
    rectangle(path, 2, 4, 1, 5, 0)
    rectangle(path, 3, 4, 1, 1, 0)
    p.push(...path, ...path.slice(12).map((tile) => ({ ...tile, z: 1 })), ...path.slice(60).map((tile) => ({ ...tile, z: 2 })))
  } else {
    for (const x of [0, 7]) for (const y of [0, 6]) {
      for (let col = 0; col < 6; col++) {
        const wave = [0, 0.25, 0.5, 0.5, 0.25, 0][col]
        rectangle(p, x + col, y + wave, 1, 4, 0)
        rectangle(p, x + col, y + wave + 1.5, 1, 1, 1)
        rectangle(p, x + col, y + wave + 1.5, 1, 1, 2)
      }
    }
  }
  return Object.freeze(p.map((tile) => Object.freeze(tile)))
}

export const LAYOUTS = Object.fromEntries(LAYOUT_IDS.map((id) => [id, makeLayout(id)])) as Record<LayoutId, readonly Position[]>
const geometry = new WeakMap<readonly Position[], { covers: number[][]; left: number[][]; right: number[][] }>()
function blockers(positions: readonly Position[]) {
  const cached = geometry.get(positions)
  if (cached) return cached
  const result = { covers: positions.map(() => [] as number[]), left: positions.map(() => [] as number[]), right: positions.map(() => [] as number[]) }
  positions.forEach((a, i) => positions.forEach((b, j) => {
    if (i === j) return
    const dy = Math.abs(a.y - b.y)
    if (b.z > a.z && Math.abs(a.x - b.x) < 1 && dy < 1) result.covers[i].push(j)
    if (b.z === a.z && dy < 1) {
      if (Math.abs(b.x - a.x + 1) < 0.0001) result.left[i].push(j)
      if (Math.abs(b.x - a.x - 1) < 0.0001) result.right[i].push(j)
    }
  }))
  geometry.set(positions, result)
  return result
}

export function isFree(positions: readonly Position[], removed: readonly boolean[], index: number): boolean {
  if (!positions[index] || removed[index]) return false
  const b = blockers(positions)
  return b.covers[index].every((i) => removed[i]) && (b.left[index].every((i) => removed[i]) || b.right[index].every((i) => removed[i]))
}
export function freeTiles(positions: readonly Position[], removed: readonly boolean[]): number[] {
  return positions.flatMap((_, i) => isFree(positions, removed, i) ? [i] : [])
}
export function matches(a: number, b: number): boolean {
  return a === b || (a >= 34 && a < 38 && b >= 34 && b < 38) || (a >= 38 && a < 42 && b >= 38 && b < 42)
}
export function availablePairs(game: Pick<Game, 'deal' | 'removed'>): Pair[] {
  const free = freeTiles(game.deal.positions, game.removed)
  const pairs: Pair[] = []
  free.forEach((a, i) => free.slice(i + 1).forEach((b) => { if (matches(game.deal.faces[a], game.deal.faces[b])) pairs.push([a, b]) }))
  return pairs
}

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const value = result[i]
    result[i] = result[j]
    result[j] = value
  }
  return result
}

// Remove empty geometry first, then place matching faces in the reverse order.
// Backtracking avoids the vertical last-pair trap; no deal is silently replaced.
function removalOrder(positions: readonly Position[], random: () => number): Pair[] {
  const removed = positions.map(() => false)
  const path: Pair[] = []
  const failed = new Set<string>()
  function visit(): boolean {
    if (path.length * 2 === positions.length) return true
    const key = removed.map((v) => v ? '1' : '0').join('')
    if (failed.has(key)) return false
    const free = shuffled(freeTiles(positions, removed), random)
    const candidates: { pair: Pair; rank: number }[] = []
    free.forEach((a, i) => free.slice(i + 1).forEach((b) => candidates.push({ pair: [a, b], rank: positions[a].z + positions[b].z })))
    candidates.sort((a, b) => b.rank - a.rank)
    for (const { pair: [a, b] } of candidates) {
      removed[a] = removed[b] = true
      path.push([a, b])
      if (visit()) return true
      path.pop()
      removed[a] = removed[b] = false
    }
    failed.add(key)
    return false
  }
  if (!visit()) throw new Error(strings.geometryError)
  return path
}

export function parseGameNumber(param?: string): number | null {
  if (!param || !/^[0-9]{1,5}$/.test(param)) return null
  const n = Number(param)
  return n >= 1 && n <= 99999 ? n : null
}
export function createDeal(number: number, layout: LayoutId = 'standard', solvable = true): Deal {
  const positions = LAYOUTS[layout]
  const random = mulberry32(number)
  const faces = Array.from({ length: 34 }, (_, face) => [face, face, face, face]).flat().concat([34, 35, 36, 37, 38, 39, 40, 41])
  if (!solvable) return { number, layout, positions, faces: shuffled(faces, random), solution: [] }
  const solution = removalOrder(positions, random)
  const pairFaces: Pair[] = Array.from({ length: 34 }, (_, face) => [[face, face] as Pair, [face, face] as Pair]).flat()
  pairFaces.push([34, 35], [36, 37], [38, 39], [40, 41])
  const shuffledPairs = shuffled(pairFaces, random)
  for (let i = solution.length - 1; i >= 0; i--) {
    const [a, b] = solution[i]
    faces[a] = shuffledPairs[i][0]
    faces[b] = shuffledPairs[i][1]
  }
  return { number, layout, positions, faces, solution }
}
export function startGame(deal: Deal): Game {
  return { deal, removed: deal.faces.map(() => false), history: [], selected: null }
}
export function removePair(game: Game, a: number, b: number): Game {
  if (a === b || !isFree(game.deal.positions, game.removed, a) || !isFree(game.deal.positions, game.removed, b) || !matches(game.deal.faces[a], game.deal.faces[b])) return game
  const removed = [...game.removed]
  removed[a] = removed[b] = true
  return { ...game, removed, selected: null, history: [...game.history, [a, b] as Pair] }
}
export function selectTile(game: Game, index: number): Game {
  if (!isFree(game.deal.positions, game.removed, index)) return game
  if (game.selected === index) return { ...game, selected: null }
  if (game.selected !== null && matches(game.deal.faces[game.selected], game.deal.faces[index])) return removePair(game, game.selected, index)
  return { ...game, selected: index }
}
export function backup(game: Game): Game {
  const pair = game.history[game.history.length - 1]
  if (!pair) return game
  const removed = [...game.removed]
  removed[pair[0]] = removed[pair[1]] = false
  return { ...game, removed, selected: null, history: game.history.slice(0, -1) }
}
export function remaining(game: Game): number { return game.removed.filter((v) => !v).length }
export function noMoves(game: Game): boolean { return remaining(game) > 0 && availablePairs(game).length === 0 }
export function nearestFree(game: Game, current: number | null, dx = 0, dy = 0): number | null {
  const free = freeTiles(game.deal.positions, game.removed)
  if (current === null || !game.deal.positions[current]) return free[0] ?? null
  const origin = game.deal.positions[current]
  let best: number | null = null
  let distance = Infinity
  for (const index of free) {
    const p = game.deal.positions[index]
    const x = (p.x - origin.x) * 40 - (p.z - origin.z) * 4
    const y = (p.y - origin.y) * 52 - (p.z - origin.z) * 4
    const forward = x * dx + y * dy
    if ((dx !== 0 || dy !== 0) && forward <= 0) continue
    const score = Math.hypot(x, y) + Math.abs(x * dy - y * dx) * 2
    if (score < distance) { distance = score; best = index }
  }
  return best ?? (free.includes(current) ? current : null)
}

// A complete rule-based solver. A generated witness is only a move-ordering hint:
// every candidate still passes the same cover, side and matching rules, and any
// off-witness player position falls back to exhaustive search with memoization.
export function solveDeal(deal: Deal, initialRemoved: readonly boolean[] = deal.faces.map(() => false)): Pair[] | null {
  const removed = [...initialRemoved]
  const path: Pair[] = []
  const failed = new Set<string>()
  function visit(): boolean {
    if (removed.every(Boolean)) return true
    const key = removed.map((v) => v ? '1' : '0').join('')
    if (failed.has(key)) return false
    const pairs = availablePairs({ deal, removed })
    const preferred = deal.solution.find(([a, b]) => !removed[a] && !removed[b] && isFree(deal.positions, removed, a) && isFree(deal.positions, removed, b))
    if (preferred) {
      const at = pairs.findIndex(([a, b]) => a === preferred[0] && b === preferred[1] || a === preferred[1] && b === preferred[0])
      if (at > 0) pairs.unshift(...pairs.splice(at, 1))
    }
    for (const [a, b] of pairs) {
      removed[a] = removed[b] = true
      path.push([a, b])
      if (visit()) return true
      path.pop()
      removed[a] = removed[b] = false
    }
    failed.add(key)
    return false
  }
  return visit() ? path : null
}
