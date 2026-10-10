import { mulberry32 } from '../kit/remy'

export const COLS = 38
export const ROWS = 20
export const CELL = 16
export const WIDTH = COLS * CELL
export const HEIGHT = ROWS * CELL
export const CELLS = COLS * ROWS
export const RADIUS = 7
export const WALL_TICK = 40
export const STEP = 4
export type Orientation = 'horizontal' | 'vertical'
export type Phase = 'playing' | 'complete' | 'over'
export type Half = { active: boolean; completed: boolean; direction: number; length: number; target: number; clock: number }
export type Tally = { area: number; lives: number; time: number; total: number }
export type Game = {
  level: number; seed: number; fast: boolean; phase: Phase; lives: number; score: number; remaining: number; elapsed: number; accumulator: number
  cells: Uint8Array; visited: Uint8Array; queue: Int16Array; x: Float64Array; y: Float64Array; vx: Float64Array; vy: Float64Array
  bounceAt: Float64Array; bounceAxis: Uint8Array; atomCount: number; cleared: number; area: number; revision: number
  wallX: number; wallY: number; orientation: Orientation; halves: [Half, Half]; starts: number; completions: number; losses: number
  tally: Tally
}

/** New levels allocate their pools once. Simulation, swept microsteps and flood fill allocate nothing.
 * Grid cells include completed walls in the original 760-cell area denominator. Each half owns its seed-cell
 * half; completion commits the cell, but never cancels its sibling. Floods run only after a half commits.
 * Four-millisecond simulation ticks are accumulated, making frame partitioning deterministic. Motion is further
 * subdivided to at most half a radius, including externally increased test velocities, so thin walls cannot tunnel.
 */
export function createGame(level = 1, seed = 1992, fast = false, score = 0): Game {
  const n = Math.max(1, Math.trunc(level))
  const count = n + 1
  const rand = mulberry32(seed ^ Math.imul(n, 0x9e3779b9))
  const x = new Float64Array(count)
  const y = new Float64Array(count)
  const vx = new Float64Array(count)
  const vy = new Float64Array(count)
  const speed = 96 * (fast ? 1.5 : 1) / Math.SQRT2
  for (let i = 0; i < count; i++) {
    x[i] = RADIUS + rand() * (WIDTH - RADIUS * 2)
    y[i] = RADIUS + rand() * (HEIGHT - RADIUS * 2)
    vx[i] = rand() < 0.5 ? -speed : speed
    vy[i] = rand() < 0.5 ? -speed : speed
  }
  const half = (direction: number): Half => ({ active: false, completed: false, direction, length: 0, target: 0, clock: 0 })
  return {
    level: n, seed, fast, phase: 'playing', lives: count, score, remaining: (20 * count + 40) * 1000, elapsed: 0, accumulator: 0,
    cells: new Uint8Array(CELLS), visited: new Uint8Array(CELLS), queue: new Int16Array(CELLS), x, y, vx, vy,
    bounceAt: new Float64Array(count).fill(-1000), bounceAxis: new Uint8Array(count), atomCount: count, cleared: 0, area: 0, revision: 0,
    wallX: 0, wallY: 0, orientation: 'vertical', halves: [half(-1), half(1)], starts: 0, completions: 0, losses: 0,
    tally: { area: 0, lives: 0, time: 0, total: 0 },
  }
}

export function wallBusy(g: Game): boolean {
  return g.halves[0].active || g.halves[1].active
}

export function startWall(g: Game, x: number, y: number, orientation: Orientation): boolean {
  if (g.phase !== 'playing' || wallBusy(g) || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= COLS || y >= ROWS || g.cells[y * COLS + x]) return false
  g.wallX = x
  g.wallY = y
  g.orientation = orientation
  for (let i = 0; i < 2; i++) {
    const h = g.halves[i]
    h.active = true
    h.completed = false
    h.clock = 0
    h.length = CELL / 2
    let cx = x
    let cy = y
    let distance = CELL / 2
    for (;;) {
      if (orientation === 'horizontal') cx += h.direction
      else cy += h.direction
      if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS || g.cells[cy * COLS + cx]) break
      distance += CELL
    }
    h.target = distance
  }
  g.starts++
  return true
}

function touchesRect(x: number, y: number, left: number, top: number, right: number, bottom: number): boolean {
  const dx = x - Math.max(left, Math.min(right, x))
  const dy = y - Math.max(top, Math.min(bottom, y))
  return dx * dx + dy * dy <= RADIUS * RADIUS
}

function touchesSolid(g: Game, x: number, y: number): boolean {
  if (x < RADIUS || y < RADIUS || x > WIDTH - RADIUS || y > HEIGHT - RADIUS) return true
  const minX = Math.max(0, Math.floor((x - RADIUS) / CELL))
  const maxX = Math.min(COLS - 1, Math.floor((x + RADIUS) / CELL))
  const minY = Math.max(0, Math.floor((y - RADIUS) / CELL))
  const maxY = Math.min(ROWS - 1, Math.floor((y + RADIUS) / CELL))
  for (let cy = minY; cy <= maxY; cy++) for (let cx = minX; cx <= maxX; cx++) {
    if (g.cells[cy * COLS + cx] && touchesRect(x, y, cx * CELL, cy * CELL, (cx + 1) * CELL, (cy + 1) * CELL)) return true
  }
  return false
}

function hitGrowing(g: Game, atom: number): void {
  const cx = g.wallX * CELL + CELL / 2
  const cy = g.wallY * CELL + CELL / 2
  for (let i = 0; i < 2; i++) {
    const h = g.halves[i]
    if (!h.active) continue
    const a = h.direction < 0 ? -h.length : 0
    const b = h.direction > 0 ? h.length : 0
    const hit = g.orientation === 'horizontal'
      ? touchesRect(g.x[atom], g.y[atom], cx + a, cy - CELL / 2, cx + b, cy + CELL / 2)
      : touchesRect(g.x[atom], g.y[atom], cx - CELL / 2, cy + a, cx + CELL / 2, cy + b)
    if (hit) {
      h.active = false
      g.lives--
      g.losses++
      if (g.lives <= 0) {
        g.phase = 'over'
        g.halves[0].active = false
        g.halves[1].active = false
        return
      }
    }
  }
}

/** Multi-source cardinal flood from every atom; all unreachable open cells are sealed.
 * Returns newly cleared cells, including newly committed wall cells since the last flood.
 */
export function fillRegions(g: Game): number {
  g.visited.fill(0)
  let read = 0
  let end = 0
  for (let i = 0; i < g.atomCount; i++) {
    const x = Math.max(0, Math.min(COLS - 1, Math.floor(g.x[i] / CELL)))
    const y = Math.max(0, Math.min(ROWS - 1, Math.floor(g.y[i] / CELL)))
    const p = y * COLS + x
    if (!g.cells[p] && !g.visited[p]) { g.visited[p] = 1; g.queue[end++] = p }
  }
  while (read < end) {
    const p = g.queue[read++]
    const x = p % COLS
    for (let d = 0; d < 4; d++) {
      const q = d === 0 ? p - COLS : d === 1 ? p + COLS : d === 2 ? p - 1 : p + 1
      if (q < 0 || q >= CELLS || (d === 2 && x === 0) || (d === 3 && x === COLS - 1) || g.cells[q] || g.visited[q]) continue
      g.visited[q] = 1
      g.queue[end++] = q
    }
  }
  let cleared = 0
  for (let p = 0; p < CELLS; p++) {
    if (!g.cells[p] && !g.visited[p]) g.cells[p] = 1
    if (g.cells[p]) cleared++
  }
  const gained = cleared - g.cleared
  g.cleared = cleared
  g.area = Math.floor(cleared * 100 / CELLS)
  g.score += gained * g.level * (g.fast ? 2 : 1)
  g.revision++
  if (cleared * 100 >= CELLS * 75 && g.phase === 'playing') {
    const multiplier = g.fast ? 2 : 1
    g.tally.area = g.area >= 80 ? (g.area - 75) * 1000 * g.level * multiplier : 0
    g.tally.lives = g.lives * 500 * g.level * multiplier
    g.tally.time = Math.ceil(g.remaining / 1000) * 20 * g.level * multiplier
    g.tally.total = g.tally.area + g.tally.lives + g.tally.time
    g.score += g.tally.total
    g.phase = 'complete'
    g.halves[0].active = false
    g.halves[1].active = false
  }
  return gained
}

function completeHalf(g: Game, h: Half): void {
  h.active = false
  h.completed = true
  let x = g.wallX
  let y = g.wallY
  const count = Math.round((h.target - CELL / 2) / CELL) + 1
  for (let i = 0; i < count; i++) {
    g.cells[y * COLS + x] = 1
    if (g.orientation === 'horizontal') x += h.direction
    else y += h.direction
  }
  g.completions++
  fillRegions(g)
}

function tick(g: Game, ms: number): void {
  g.remaining = Math.max(0, g.remaining - ms)
  g.elapsed += ms
  if (g.remaining === 0) { g.phase = 'over'; g.halves[0].active = false; g.halves[1].active = false; return }
  // Check growth before it commits: an atom touching the last new cell destroys the half, not the atom.
  for (let i = 0; i < 2; i++) {
    const h = g.halves[i]
    if (!h.active) continue
    h.clock += ms
    if (h.clock >= WALL_TICK) {
      h.clock -= WALL_TICK
      h.length = Math.min(h.target, h.length + CELL)
    }
  }
  for (let i = 0; i < g.atomCount && g.phase === 'playing'; i++) hitGrowing(g, i)
  if (g.phase !== 'playing') return
  for (let i = 0; i < 2; i++) {
    const h = g.halves[i]
    if (h.active && h.length >= h.target) completeHalf(g, h)
    if (g.phase !== 'playing') return
  }
  for (let i = 0; i < g.atomCount && g.phase === 'playing'; i++) {
    const pieces = Math.max(1, Math.ceil(Math.max(Math.abs(g.vx[i]), Math.abs(g.vy[i])) * ms / 1000 / (RADIUS / 2)))
    const dt = ms / 1000 / pieces
    for (let s = 0; s < pieces; s++) {
      const x = g.x[i]
      const y = g.y[i]
      let nx = x + g.vx[i] * dt
      let ny = y + g.vy[i] * dt
      let axis = 0
      const hitX = touchesSolid(g, nx, y)
      const hitY = touchesSolid(g, x, ny)
      if (hitX) { g.vx[i] = -g.vx[i]; nx = x; axis |= 1 }
      if (hitY) { g.vy[i] = -g.vy[i]; ny = y; axis |= 2 }
      if (!hitX && !hitY && touchesSolid(g, nx, ny)) {
        g.vx[i] = -g.vx[i]
        g.vy[i] = -g.vy[i]
        nx = x
        ny = y
        axis = 3
      }
      g.x[i] = nx
      g.y[i] = ny
      if (axis) { g.bounceAt[i] = g.elapsed; g.bounceAxis[i] = axis }
      hitGrowing(g, i)
      if (g.phase !== 'playing') break
    }
  }
}

/** Advance milliseconds. Pausing is implemented by not calling this function. */
export function advance(g: Game, ms: number): void {
  if (g.phase !== 'playing' || !Number.isFinite(ms) || ms <= 0) return
  g.accumulator += ms
  while (g.accumulator + 1e-8 >= STEP && g.phase === 'playing') {
    g.accumulator -= STEP
    tick(g, STEP)
  }
}

export function nextLevel(g: Game): Game {
  return createGame(g.level + 1, g.seed, g.fast, g.score)
}
