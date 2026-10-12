import { createLayout, SIZE, Tile, type LevelLayout } from './levels'

export { SIZE, Tile }
export const DX = [0, 1, 1, 1, 0, -1, -1, -1] as const
export const DY = [-1, -1, 0, 1, 1, 1, 0, -1] as const
export const SPEED_MS = [1200, 900, 650, 450, 300] as const
export enum Event { Move = 1, Push = 2, Cheese = 4, Rug = 8, Death = 16, Spawn = 32, Trapped = 64, Clear = 128, Respawn = 256 }
export type Phase = 'playing' | 'dead' | 'clear' | 'over'
export type Score = {
  name: string
  score: number
  at: number
}
export type Game = {
  layout: LevelLayout
  cells: Uint8Array
  cats: Int16Array
  spawns: Int16Array
  sitting: Uint8Array
  sittingSince: Float64Array
  yarn: Int16Array
  yarnDX: Int8Array
  yarnDY: Int8Array
  legal: Int16Array
  catCount: number
  yarnCount: number
  mouse: number
  facing: -1 | 1
  level: number
  speed: number
  pendingSpeed: number
  lives: number
  score: number
  levelBonus: number
  elapsed: number
  catElapsed: number
  yarnElapsed: number
  tick: number
  wave: number
  rugged: number
  respawn: number
  phase: Phase
  events: number
  seed: number
  death: 'cat' | 'trap' | 'yarn'
}
const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < SIZE && y < SIZE
const point = (x: number, y: number) => y * SIZE + x
export function createGame(level = 1, speed = 2, seed = 1): Game {
  const layout = createLayout(level)
  const selectedSpeed = Math.max(0, Math.min(4, Math.floor(speed)))
  const g: Game = {
    layout, cells: layout.cells, cats: new Int16Array(128).fill(-1), spawns: new Int16Array(128).fill(-1), sitting: new Uint8Array(128),
    sittingSince: new Float64Array(128).fill(-Infinity),
    yarn: new Int16Array(32).fill(-1), yarnDX: new Int8Array(32), yarnDY: new Int8Array(32), legal: new Int16Array(8),
    catCount: layout.cats.length, yarnCount: layout.yarn.length, mouse: point(layout.mouse.x, layout.mouse.y), level: layout.number,
    speed: selectedSpeed, pendingSpeed: selectedSpeed,
    lives: 3, score: 0, levelBonus: 0, facing: 1, elapsed: 0, catElapsed: 0, yarnElapsed: 0,
    tick: 0, wave: 0, rugged: 0, respawn: 0, phase: 'playing', events: 0, seed, death: 'cat',
  }
  for (let i = 0; i < g.catCount; i++) g.cats[i] = g.spawns[i] = point(layout.cats[i].x, layout.cats[i].y)
  for (let i = 0; i < g.yarnCount; i++) {
    g.yarn[i] = point(layout.yarn[i].x, layout.yarn[i].y)
    g.yarnDX[i] = ((seed + i) & 1) ? 1 : -1
    g.yarnDY[i] = ((seed + i) & 2) ? 1 : -1
  }
  return g
}
export function catAt(g: Game, at: number): boolean {
  for (let i = 0; i < g.catCount; i++) if (g.cats[i] === at) return true
  return false
}
function yarnAt(g: Game, at: number): boolean {
  for (let i = 0; i < g.yarnCount; i++) if (g.yarn[i] === at) return true
  return false
}
/** Engine/layout boundary: cats walk Empty/Cheese (including the mouse), never Rug/Trap/Block/Fixed or another cat.
 * Diagonal corner cutting is allowed. Push chains terminate only at Empty, cat/yarn-free cells; hazards stop chains.
 * Reference validator and engine use clockwise N-first strict squared-distance ties and the same hashed sidestep at seed 1.
 * Ticks are 1-based; cats update sequentially. Yarn reflects among four diagonal exits; no free diagonal means cheese.
 * Validator witnesses omit real-time hazards and later waves; they establish first-wave trapping, not immunity to every path.
 */
function catFree(g: Game, at: number): boolean {
  return (g.cells[at] === Tile.Empty || g.cells[at] === Tile.Cheese) && !catAt(g, at)
}
export function killMouse(g: Game, cause: Game['death'] = 'cat'): void {
  if (g.phase !== 'playing') return
  g.lives--
  g.death = cause
  g.events |= Event.Death
  g.rugged = 0
  g.respawn = 1500
  g.phase = g.lives ? 'dead' : 'over'
}
export function moveMouse(g: Game, direction: number): boolean {
  if (g.phase !== 'playing' || g.rugged > 0 || direction < 0 || direction > 7) return false
  const dx = DX[direction]
  const dy = DY[direction]
  const x = g.mouse % SIZE + dx
  const y = Math.floor(g.mouse / SIZE) + dy
  if (!inside(x, y)) return false
  const next = point(x, y)
  if (g.cells[next] === Tile.Fixed) return false
  if (g.cells[next] === Tile.Block) {
    let ex = x
    let ey = y
    while (inside(ex, ey) && g.cells[point(ex, ey)] === Tile.Block) {
      ex += dx
      ey += dy
    }
    if (!inside(ex, ey)) return false
    const end = point(ex, ey)
    if (g.cells[end] !== Tile.Empty || catAt(g, end) || yarnAt(g, end)) return false
    g.cells[end] = Tile.Block
    g.cells[next] = Tile.Empty
    g.events |= Event.Push
  }
  g.mouse = next
  if (dx) g.facing = dx < 0 ? -1 : 1
  g.events |= Event.Move
  if (catAt(g, next)) killMouse(g)
  else if (yarnAt(g, next)) killMouse(g, 'yarn')
  else if (g.cells[next] === Tile.Trap) killMouse(g, 'trap')
  else if (g.cells[next] === Tile.Rug) {
    g.rugged = 5000
    g.events |= Event.Rug
  } else if (g.cells[next] === Tile.Cheese) {
    g.cells[next] = Tile.Empty
    g.score += 100 * (g.speed + 1)
    g.events |= Event.Cheese
  }
  resolveTrapped(g)
  return true
}
function hash(tick: number, cat: number, at: number): number {
  let h = Math.imul(tick + 1, 0x9e3779b1) ^ Math.imul(cat + 7, 0x85ebca6b) ^ Math.imul(at + 13, 0xc2b2ae35)
  h ^= h >>> 15
  return h >>> 0
}
export function catTick(g: Game): void {
  if (g.phase !== 'playing') return
  g.tick++
  for (let i = 0; i < g.catCount; i++) {
    const at = g.cats[i]
    if (at < 0) continue
    const x = at % SIZE
    const y = Math.floor(at / SIZE)
    const mx = g.mouse % SIZE
    const my = Math.floor(g.mouse / SIZE)
    let best = -1
    let distance = (x - mx) ** 2 + (y - my) ** 2
    let count = 0
    for (let d = 0; d < 8; d++) {
      const nx = x + DX[d]
      const ny = y + DY[d]
      if (!inside(nx, ny)) continue
      const next = point(nx, ny)
      if (!catFree(g, next)) continue
      g.legal[count++] = next
      const nd = (nx - mx) ** 2 + (ny - my) ** 2
      if (nd < distance) {
        distance = nd
        best = next
      }
    }
    if (best < 0 && count) best = g.legal[hash(g.tick, i, at + g.seed - 1) % count]
    if (best >= 0) g.cats[i] = best
    if (g.cats[i] === g.mouse) {
      killMouse(g)
      break
    }
  }
  resolveTrapped(g)
}
export function resolveTrapped(g: Game): void {
  if (g.phase !== 'playing') return
  let alive = 0
  let trapped = 0
  for (let i = 0; i < g.catCount; i++) {
    const at = g.cats[i]
    if (at < 0) continue
    alive++
    const x = at % SIZE
    const y = Math.floor(at / SIZE)
    let free = false
    for (let d = 0; d < 8; d++) {
      const nx = x + DX[d]
      const ny = y + DY[d]
      if (inside(nx, ny) && catFree(g, point(nx, ny))) {
        free = true
        break
      }
    }
    if (!free && !g.sitting[i]) g.sittingSince[i] = g.elapsed
    g.sitting[i] = free ? 0 : 1
    if (!free) trapped++
  }
  if (alive && trapped === alive) {
    for (let i = 0; i < g.catCount; i++) if (g.cats[i] >= 0) {
      g.cells[g.cats[i]] = Tile.Cheese
      g.cats[i] = -1
    }
    g.events |= Event.Trapped
  }
  if ((!alive || trapped === alive) && g.wave === g.layout.waveTimes.length) {
    g.levelBonus = (Math.floor(Math.max(0, g.layout.duration - g.elapsed / 1000)) * 10 + 1000) * (g.speed + 1)
    g.score += g.levelBonus
    g.phase = 'clear'
    g.events |= Event.Clear
  }
}
export function spawnWave(g: Game): void {
  for (let k = 0; k < g.layout.cats.length; k++) {
    const start = hash(g.wave, k, g.level + g.seed) % (SIZE * SIZE)
    for (let offset = 0; offset < SIZE * SIZE; offset++) {
      const at = (start + offset) % (SIZE * SIZE)
      const x = at % SIZE
      const y = Math.floor(at / SIZE)
      if (x !== 1 && x !== SIZE - 2 && y !== 1 && y !== SIZE - 2) continue
      if (g.cells[at] !== Tile.Empty || catAt(g, at) || yarnAt(g, at)
        || Math.max(Math.abs(x - g.mouse % SIZE), Math.abs(y - Math.floor(g.mouse / SIZE))) <= 2) continue
      if (g.catCount < g.cats.length) {
        g.cats[g.catCount] = g.spawns[g.catCount] = at
        g.sitting[g.catCount++] = 0
        g.events |= Event.Spawn
      }
      break
    }
  }
}
function yarnFree(g: Game, x: number, y: number): boolean {
  return inside(x, y) && (g.cells[point(x, y)] === Tile.Empty || g.cells[point(x, y)] === Tile.Cheese) && !catAt(g, point(x, y))
}
export function yarnTick(g: Game): void {
  for (let i = 0; i < g.yarnCount; i++) {
    const at = g.yarn[i]
    if (at < 0) continue
    const x = at % SIZE
    const y = Math.floor(at / SIZE)
    let open = false
    for (let d = 1; d < 8; d += 2) if (yarnFree(g, x + DX[d], y + DY[d])) open = true
    if (!open) {
      g.cells[at] = Tile.Cheese
      g.yarn[i] = -1
      g.events |= Event.Trapped
      continue
    }
    let dx = g.yarnDX[i]
    let dy = g.yarnDY[i]
    if (!yarnFree(g, x + dx, y)) dx = -dx
    if (!yarnFree(g, x, y + dy)) dy = -dy
    if (!yarnFree(g, x + dx, y + dy)) {
      if (yarnFree(g, x - dx, y + dy)) dx = -dx
      else if (yarnFree(g, x + dx, y - dy)) dy = -dy
      else {
        dx = -dx
        dy = -dy
      }
    }
    g.yarnDX[i] = dx
    g.yarnDY[i] = dy
    g.yarn[i] = point(x + dx, y + dy)
    if (g.yarn[i] === g.mouse) killMouse(g, 'yarn')
  }
}
export function catInterval(g: Game): number { return SPEED_MS[g.speed] / (1 + Math.floor((g.level - 1) / 50) * 0.2) }
/** Nearest means squared grid distance, with row-major ties. Respawning never changes a tile. */
function nearestEmpty(g: Game, origin: number, edge = false): number {
  let best = -1
  let distance = Infinity
  const ox = origin % SIZE, oy = Math.floor(origin / SIZE)
  if ((!edge || ox <= 1 || ox >= SIZE - 2 || oy <= 1 || oy >= SIZE - 2)
    && g.cells[origin] === Tile.Empty && !catAt(g, origin) && !yarnAt(g, origin)) return origin
  for (let at = 0; at < g.cells.length; at++) {
    const x = at % SIZE, y = Math.floor(at / SIZE)
    if (edge && x > 1 && x < SIZE - 2 && y > 1 && y < SIZE - 2) continue
    if (g.cells[at] !== Tile.Empty || catAt(g, at) || yarnAt(g, at)) continue
    const next = (x - ox) ** 2 + (y - oy) ** 2
    if (next < distance) {
      distance = next
      best = at
    }
  }
  return best
}
/** Fixed-step caller supplies milliseconds. All pools/scratch are preallocated; stepping allocates nothing. */
export function step(g: Game, dt: number): void {
  if (g.phase === 'dead') {
    g.respawn -= dt
    if (g.respawn <= 0) {
      for (let i = 0; i < g.catCount; i++) if (g.cats[i] >= 0) {
        const previous = g.cats[i]
        g.cats[i] = -1
        const spawn = g.spawns[i]
        const freeSpawn = g.cells[spawn] === Tile.Empty && !catAt(g, spawn) && !yarnAt(g, spawn)
        const edge = freeSpawn ? spawn : nearestEmpty(g, spawn, true)
        // With the entire edge lane occupied, keep the cat's existing legal cell rather than remove it or overwrite a tile.
        g.cats[i] = edge >= 0 ? edge : previous
        g.sitting[i] = 0
        g.sittingSince[i] = -Infinity
      }
      const mouse = nearestEmpty(g, point(g.layout.mouse.x, g.layout.mouse.y))
      if (mouse >= 0) g.mouse = mouse
      g.catElapsed = 0
      g.phase = 'playing'
      g.events |= Event.Respawn
    }
    return
  }
  if (g.phase !== 'playing') return
  g.elapsed += dt
  g.rugged = Math.max(0, g.rugged - dt)
  while (g.wave < g.layout.waveTimes.length && g.elapsed >= g.layout.waveTimes[g.wave] * 1000) {
    g.wave++
    spawnWave(g)
  }
  g.catElapsed += dt
  g.yarnElapsed += dt
  while (g.catElapsed >= catInterval(g) && g.phase === 'playing') {
    g.catElapsed -= catInterval(g)
    catTick(g)
  }
  while (g.yarnElapsed >= 350 && g.phase === 'playing') {
    g.yarnElapsed -= 350
    yarnTick(g)
  }
  resolveTrapped(g)
}
export function selectSpeed(g: Game, speed: number): void {
  g.pendingSpeed = Math.max(0, Math.min(4, Math.floor(speed)))
}
export function nextLevel(g: Game): Game {
  const next = createGame(g.level + 1, g.pendingSpeed, g.seed)
  next.score = g.score
  next.lives = g.lives
  return next
}
export function scoreTables(scores: readonly Score[], now: number): {
  overall: Score[]
  recent: Score[]
} {
  const sorted = [...scores].sort((a, b) => b.score - a.score || a.at - b.at)
  return { overall: sorted.slice(0, 10), recent: sorted.filter(s => s.at <= now && s.at >= now - 86400000).slice(0, 10) }
}
export function qualifiesScore(scores: readonly Score[], score: number, now: number): boolean {
  if (score <= 0) return false
  const { overall, recent } = scoreTables(scores, now)
  return overall.length < 10 || recent.length < 10 || score > overall[9].score || score > recent[9].score
}
export function parseLevel(param?: string, fallback = 1): number {
  return param && /^(?:[1-9]|[1-4][0-9]|50)$/.test(param) ? Number(param) : fallback
}
