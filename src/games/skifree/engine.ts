import { STRINGS } from './strings'
import type { Course, Direction, GameEvent, Monster, ObstacleKind, SkiCommand, SkiState, WorldObject } from './types'

export type { Course, Direction, GameEvent, Monster, ObstacleKind, SkiCommand, SkiState, WorldObject } from './types'

export const NORMAL_CAP = 100
export const FAST_CAP = 180
export const MONSTER_SPEED = 125
export const WRAP_DISTANCE = 18000
export const FIXED_DT = 1 / 60
export const CHUNK_SIZE = 600
export const CRASH_DURATION = 1.2
export const HOP_DURATION = 0.55
export const RAMP_DURATION = 1.1
export const RAINBOW_DURATION = 2
export const SPIN_DURATION = 0.48
export const FLIP_DURATION = 0.65
export const COURSE_START = 80
export const COURSE_FINISH = 1100
export const GATE_COUNT = 9
export const GATE_WIDTH = 64
export const GATE_PENALTY = 5
export const TRACK_CAPACITY = 2048

const CHUNK_OBJECTS = 18
const CHUNK_COUNT = 25
const CHUNK_PERIOD = WRAP_DISTANCE / CHUNK_SIZE
const VX = [-1, -0.94, -Math.SQRT1_2, 0, Math.SQRT1_2, 0.94, 1]
const VY = [0, 0.342, Math.SQRT1_2, 1, Math.SQRT1_2, 0.342, 0]
const ANGLE_CAP = [0, 0.3, 0.72, 1, 0.72, 0.3, 0]
const KINDS: ObstacleKind[] = [
  'tree', 'big-tree', 'dead-tree', 'stump', 'rock', 'mogul', 'ramp', 'rainbow', 'dog', 'skier', 'snowboarder', 'hydrant',
]
const KIND_WEIGHTS = [30, 42, 48, 54, 61, 73, 78, 80, 83, 86, 89, 90]
const RADII = [8, 14, 8, 7, 9, 9, 13, 18, 8, 7, 8, 0]
const EVENTS_CAPACITY = 32

type Chunk = { cx: number; cy: number; objects: WorldObject[] }
type Runtime = {
  chunks: Chunk[]
  cx: number
  cy: number
  queued: GameEvent[]
  queuedCount: number
  airPoints: number
  firstMonster: boolean
  secondMonster: boolean
  courseOrigin: number
  collisionObject: WorldObject | null
}

// Private bookkeeping is allocated once per game, never attached to the public render contract.
const runtimes = new WeakMap<SkiState, Runtime>()

function wrap(value: number): number {
  return ((value % CHUNK_PERIOD) + CHUNK_PERIOD) % CHUNK_PERIOD
}

// Stateless cell noise lets a recycled chunk be filled without allocating an RNG closure.
function cellNoise(seed: number, cx: number, cy: number, index: number): number {
  let value = (seed ^ Math.imul(cx + 1, 0x9e3779b1) ^ Math.imul(cy + 1, 0x85ebca6b) ^ Math.imul(index + 1, 0xc2b2ae35)) >>> 0
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d)
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296
}

function emptyObject(): WorldObject {
  return { id: 0, kind: 'tree', x: 0, y: 0, radius: 0, variant: 0, active: false }
}

function fillChunk(seed: number, cx: number, cy: number, objects: WorldObject[]): void {
  const wx = wrap(cx)
  const wy = wrap(cy)
  for (let i = 0; i < CHUNK_OBJECTS; i++) {
    const object = objects[i]
    const roll = cellNoise(seed, wx, wy, i * 4) * KIND_WEIGHTS[KIND_WEIGHTS.length - 1]
    let choice = 0
    while (roll >= KIND_WEIGHTS[choice]) choice++
    object.id = (wy * CHUNK_PERIOD + wx) * CHUNK_OBJECTS + i
    object.kind = KINDS[choice]
    object.radius = RADII[choice]
    object.x = cx * CHUNK_SIZE + 24 + cellNoise(seed, wx, wy, i * 4 + 1) * (CHUNK_SIZE - 48)
    object.y = cy * CHUNK_SIZE + 24 + cellNoise(seed, wx, wy, i * 4 + 2) * (CHUNK_SIZE - 48)
    object.variant = Math.floor(cellNoise(seed, wx, wy, i * 4 + 3) * 4)
    object.active = true
    object.text = undefined
    object.side = object.kind === 'dog' || object.kind === 'skier' || object.kind === 'snowboarder'
      ? object.variant % 2 === 0 ? 1 : -1 : undefined
    if (wx === 0 && i >= CHUNK_OBJECTS - 2) {
      object.kind = 'lift'
      object.radius = 0
      object.variant = i === CHUNK_OBJECTS - 2 ? 0 : 1
      object.x = cx * CHUNK_SIZE + (object.variant === 0 ? 300 : 310)
      object.y = cy * CHUNK_SIZE + (object.variant === 0 ? 24 : 200)
      object.side = undefined
    }
    // The same start clearing repeats with the same seeded layout at the wrap seam.
    const layoutX = object.x - cx * CHUNK_SIZE + (wx >= CHUNK_PERIOD / 2 ? wx - CHUNK_PERIOD : wx) * CHUNK_SIZE
    const layoutY = object.y - cy * CHUNK_SIZE + (wy >= CHUNK_PERIOD / 2 ? wy - CHUNK_PERIOD : wy) * CHUNK_SIZE
    if (layoutY > -100 && layoutY < 1200 && Math.abs(layoutX) < 340) object.active = false
  }
}

/** Layout repeats every 18,000m on both axes; returned positions remain in the requested absolute chunk. */
export function generateChunk(seed: number, cx: number, cy: number): WorldObject[] {
  const objects: WorldObject[] = []
  for (let i = 0; i < CHUNK_OBJECTS; i++) objects.push(emptyObject())
  fillChunk(seed, cx, cy, objects)
  return objects
}

function refreshChunks(state: SkiState, runtime: Runtime): void {
  const cx = Math.floor(state.x / CHUNK_SIZE)
  const cy = Math.floor(state.y / CHUNK_SIZE)
  if (cx === runtime.cx && cy === runtime.cy) return
  runtime.cx = cx
  runtime.cy = cy
  for (let y = cy - 2; y <= cy + 2; y++) {
    for (let x = cx - 2; x <= cx + 2; x++) {
      let existing = false
      for (let i = 0; i < runtime.chunks.length; i++) {
        const chunk = runtime.chunks[i]
        if (chunk.cx === x && chunk.cy === y) {
          existing = true
          break
        }
      }
      if (existing) continue
      for (let i = 0; i < runtime.chunks.length; i++) {
        const chunk = runtime.chunks[i]
        if (Math.abs(chunk.cx - cx) <= 2 && Math.abs(chunk.cy - cy) <= 2) continue
        chunk.cx = x
        chunk.cy = y
        fillChunk(state.seed, x, y, chunk.objects)
        break
      }
    }
  }
}

function lane(course: Course): number {
  return course === 'slalom' ? -220 : course === 'freestyle' ? 220 : 0
}

function scenery(state: SkiState): void {
  let id = -1
  const add = (kind: ObstacleKind, x: number, y: number, radius: number, variant: number, text?: string, side?: -1 | 1) => {
    state.objects.push({ id: id--, kind, x, y, radius, variant, text, side, active: true })
  }
  add('sign', 0, -66, 0, 0, STRINGS.signs.mountain)
  add('sign', -220, 0, 0, 0, STRINGS.signs.slalom)
  add('sign', 0, 38, 0, 0, STRINGS.signs.tree)
  add('sign', 220, 0, 0, 0, STRINGS.signs.freestyle)
  add('sign', 0, -28, 0, 0, STRINGS.signs.numpad)
  add('sign', 75, 2000, 0, 0, STRINGS.signs.nothing)
  const courses: Course[] = ['slalom', 'tree', 'freestyle']
  for (let c = 0; c < courses.length; c++) {
    const course = courses[c]
    const x = lane(course)
    add('banner', x, COURSE_START, 85, c + 1, STRINGS.courseNames[course])
    add('banner', x, COURSE_FINISH, 85, c + 4, STRINGS.courseNames[course])
    for (let row = 0; row < GATE_COUNT; row++) {
      const y = 200 + row * 100
      const side = row % 2 === 0 ? -1 : 1
      if (course !== 'freestyle') {
        add('gate', x + side * 38, y, GATE_WIDTH, row, undefined, side)
        if (course === 'tree') {
          add(row % 2 === 0 ? 'tree' : 'big-tree', x - side * 85, y + 28, 9, row % 4)
          add('tree', x + side * 95, y - 32, 8, (row + 1) % 4)
          add(row % 2 === 0 ? 'tree' : 'big-tree', x + side * 12, y + 50, row % 2 === 0 ? 8 : 14, row % 4)
        }
      } else {
        add(row % 3 === 2 ? 'rainbow' : 'ramp', x + (row % 2 === 0 ? -18 : 18), y, row % 3 === 2 ? 18 : 13, row % 4)
      }
    }
  }
}

/** An explicit Free Ski choice starts in the open gap; an unspecified course opens the original starting area. */
export function createGame(seed: number, course?: Course): SkiState {
  const selectedCourse = course ?? 'free'
  const tracks = new Float32Array(TRACK_CAPACITY * 3)
  for (let i = 2; i < tracks.length; i += 3) tracks[i] = -1
  const events = new Array<GameEvent>(EVENTS_CAPACITY)
  events.length = 0
  const state: SkiState = {
    seed: seed >>> 0, x: course === 'free' ? 100 : lane(selectedCourse), y: 0, direction: 6, speed: 0, fast: false, time: 0, distance: 0, style: 0,
    air: 0, airDuration: 0, trick: 'none', trickProgress: 0, completedTricks: 0, crash: 0,
    course: selectedCourse, courseStarted: false, courseFinished: false, courseTime: 0, penalties: 0, gateIndex: 0, gameOver: false,
    objects: [], monsters: [
      { x: 0, y: 0, phase: 'chase', timer: 0, active: false },
      { x: 0, y: 0, phase: 'chase', timer: 0, active: false },
    ], events, tracks, trackIndex: 0, stepCount: 0,
  }
  const runtime: Runtime = {
    chunks: [], cx: Infinity, cy: Infinity, queued: new Array<GameEvent>(EVENTS_CAPACITY), queuedCount: 0,
    airPoints: 0, firstMonster: false, secondMonster: false, courseOrigin: lane(selectedCourse), collisionObject: null,
  }
  for (let i = 0; i < CHUNK_COUNT; i++) {
    const objects: WorldObject[] = []
    for (let j = 0; j < CHUNK_OBJECTS; j++) {
      const object = emptyObject()
      objects.push(object)
      state.objects.push(object)
    }
    runtime.chunks.push({ cx: Infinity, cy: Infinity, objects })
  }
  scenery(state)
  runtimes.set(state, runtime)
  refreshChunks(state, runtime)
  return state
}

function emit(state: SkiState, event: GameEvent): void {
  // One sound of each kind per public step; large catch-up steps cannot flood audio.
  for (let i = 0; i < state.events.length; i++) if (state.events[i] === event) return
  state.events.push(event)
}

function queue(runtime: Runtime, event: GameEvent): void {
  for (let i = 0; i < runtime.queuedCount; i++) if (runtime.queued[i] === event) return
  runtime.queued[runtime.queuedCount++] = event
}

function launch(state: SkiState, runtime: Runtime, duration: number, input = false): void {
  state.air = duration
  state.airDuration = duration
  state.trick = 'none'
  state.trickProgress = 0
  state.completedTricks = 0
  runtime.airPoints = duration === RAINBOW_DURATION ? 50 : duration === RAMP_DURATION ? 25 : duration === HOP_DURATION ? 10 : 0
  if (input) queue(runtime, 'jump')
  else emit(state, 'jump')
}

function turn(state: SkiState, direction: Direction): void {
  state.direction = direction
  if (direction === 0 || direction === 6) state.speed = 0
}

function walk(state: SkiState, runtime: Runtime, dx: number, dy: number): void {
  const x = state.x
  const y = state.y
  state.x += dx
  state.y += dy
  state.distance = Math.max(0, state.distance, state.y)
  collide(state, runtime, x, y, true)
  refreshChunks(state, runtime)
}

export function command(state: SkiState, action: SkiCommand): void {
  if (state.gameOver || beingEaten(state)) return
  const runtime = runtimes.get(state)
  if (!runtime) return
  if (action === 'fast') {
    state.fast = !state.fast
    queue(runtime, 'fast')
    return
  }
  if (state.crash > 0) return
  if (state.air > 0) {
    if (state.trick !== 'none') return
    if (action === 'left' || action === 'right') state.trick = 'spin'
    else if (action === 'up') state.trick = 'front'
    else if (action === 'down') state.trick = 'back'
    state.trickProgress = 0
    return
  }
  switch (action) {
    case 'left':
      if (state.direction === 0) walk(state, runtime, -6, 0)
      else turn(state, (state.direction - 1) as Direction)
      break
    case 'right':
      if (state.direction === 6) walk(state, runtime, 6, 0)
      else turn(state, (state.direction + 1) as Direction)
      break
    case 'up':
      if (state.direction === 0 || state.direction === 6) walk(state, runtime, 0, -4)
      else {
        state.speed *= 0.55
        if (state.direction !== 3) turn(state, (state.direction < 3 ? state.direction - 1 : state.direction + 1) as Direction)
      }
      break
    case 'down': turn(state, 3); break
    case 'diagonal-left': turn(state, 2); break
    case 'diagonal-right': turn(state, 4); break
    case 'horizontal-left': turn(state, 0); break
    case 'horizontal-right': turn(state, 6); break
    case 'jump': launch(state, runtime, HOP_DURATION, true); break
  }
}

export function steer(state: SkiState, dx: number, dy: number): void {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return
  if (state.gameOver || state.crash > 0 || state.air > 0 || beingEaten(state)) return
  const angle = Math.atan2(Math.abs(dx), Math.max(0, dy))
  const offset = angle < Math.PI / 8 ? 0 : angle < Math.PI / 3 ? 1 : angle < Math.PI * 0.46 ? 2 : 3
  turn(state, (3 + (dx < 0 ? -offset : offset)) as Direction)
}

function beingEaten(state: SkiState): boolean {
  for (let i = 0; i < state.monsters.length; i++) {
    const monster = state.monsters[i]
    if (monster.active && monster.phase !== 'chase') return true
  }
  return false
}

function crash(state: SkiState, runtime: Runtime, landing = false, input = false): void {
  state.crash = CRASH_DURATION
  state.speed = 0
  state.air = 0
  state.airDuration = 0
  state.trick = 'none'
  state.trickProgress = 0
  state.completedTricks = 0
  runtime.airPoints = 0
  state.style = Math.max(0, state.style - (landing ? 50 : 25))
  if (input) queue(runtime, 'crash')
  else emit(state, 'crash')
}

function sweptHit(x: number, y: number, nx: number, ny: number, object: WorldObject): boolean {
  const dx = nx - x
  const dy = ny - y
  const length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((object.x - x) * dx + (object.y - y) * dy) / length))
  const ox = object.x - x - t * dx
  const oy = object.y - y - t * dy
  const radius = object.radius + 5
  return ox * ox + oy * oy <= radius * radius
}

function collide(state: SkiState, runtime: Runtime, x: number, y: number, input = false): void {
  if (state.air > 0 || state.crash > 0) return
  if (runtime.collisionObject && !sweptHit(state.x, state.y, state.x, state.y, runtime.collisionObject)) runtime.collisionObject = null
  for (let i = 0; i < state.objects.length; i++) {
    const object = state.objects[i]
    if (!object.active || object.radius <= 0 || object === runtime.collisionObject) continue
    if (object.kind === 'gate' || object.kind === 'banner' || object.kind === 'sign' || object.kind === 'lift' || object.kind === 'hydrant'
      || object.kind === 'yellow-snow' || object.kind === 'mushroom') continue
    if (!sweptHit(x, y, state.x, state.y, object)) continue
    runtime.collisionObject = object
    if (object.kind === 'stump' && state.y < y && object.variant === 0) {
      object.kind = 'mushroom'
      object.radius = 0
      continue
    }
    if (object.kind === 'ramp' || object.kind === 'rainbow') {
      launch(state, runtime, object.kind === 'rainbow' ? RAINBOW_DURATION : RAMP_DURATION, input)
      return
    }
    if (object.kind === 'mogul') {
      state.speed *= 0.65
      if (state.speed > 30) launch(state, runtime, 0.35, input)
      return
    }
    if (object.kind === 'dog') {
      object.kind = 'yellow-snow'
      object.radius = 0
      if (input) queue(runtime, 'dog')
      else emit(state, 'dog')
    }
    crash(state, runtime, false, input)
    return
  }
}

function moveObjects(state: SkiState, dt: number): void {
  for (let i = 0; i < state.objects.length; i++) {
    const object = state.objects[i]
    if (!object.active) continue
    const sign = object.side ?? (object.variant % 2 === 0 ? 1 : -1)
    if (object.kind === 'dog') object.x += sign * 13 * dt
    else if (object.kind === 'skier') {
      object.x += sign * 11 * dt
      object.y += 38 * dt
    } else if (object.kind === 'snowboarder') {
      object.x += sign * 23 * dt
      object.y += 46 * dt
    } else if (object.kind === 'lift' && object.variant !== 0) object.y -= 22 * dt
  }
}

function startCourse(state: SkiState, runtime: Runtime, course: Course): void {
  state.course = course
  state.courseStarted = true
  state.courseFinished = false
  state.courseTime = 0
  state.penalties = 0
  state.gateIndex = 0
  runtime.courseOrigin = lane(course)
  emit(state, 'course-start')
}

function courseRules(state: SkiState, runtime: Runtime, x: number, y: number, dt: number): void {
  let startFraction = 0
  if (!state.courseStarted && y < COURSE_START && state.y >= COURSE_START) {
    const t = (COURSE_START - y) / (state.y - y)
    const crossingX = x + (state.x - x) * t
    const course: Course = Math.abs(crossingX + 220) <= 85 ? 'slalom' : Math.abs(crossingX) <= 85 ? 'tree'
      : Math.abs(crossingX - 220) <= 85 ? 'freestyle' : 'free'
    if (course !== 'free') {
      startCourse(state, runtime, course)
      startFraction = t
    }
  }
  if (!state.courseStarted || state.courseFinished) return
  let finishFraction = 1
  let finished = false
  if (y < COURSE_FINISH && state.y >= COURSE_FINISH) {
    const t = (COURSE_FINISH - y) / (state.y - y)
    const crossingX = x + (state.x - x) * t
    if (Math.abs(crossingX - runtime.courseOrigin) <= 85) {
      finishFraction = t
      finished = true
    }
  }
  state.courseTime += dt * (finishFraction - startFraction)
  if (state.course !== 'freestyle' && state.y > y) {
    while (state.gateIndex < GATE_COUNT) {
      const row = state.gateIndex
      const gateY = 200 + row * 100
      if (state.y < gateY) break
      const t = Math.max(0, Math.min(1, (gateY - y) / (state.y - y)))
      const crossingX = x + (state.x - x) * t
      const side = row % 2 === 0 ? -1 : 1
      const gateX = runtime.courseOrigin + side * 38
      const separation = (crossingX - gateX) * side
      if (separation > 0 && separation <= GATE_WIDTH) emit(state, 'gate-pass')
      else {
        state.penalties += GATE_PENALTY
        emit(state, 'gate-miss')
      }
      state.gateIndex++
    }
  }
  if (finished) {
    state.courseFinished = true
    emit(state, 'course-finish')
  }
}

function spawnMonster(state: SkiState, runtime: Runtime, index: number): void {
  const monster = state.monsters[index]
  monster.x = state.x + (index === 0 ? -80 : state.monsters[0].x <= state.x ? 120 : -120)
  monster.y = state.y + (index === 0 ? -150 : 260)
  monster.active = true
  monster.phase = 'chase'
  monster.timer = 0
  if (index === 0) runtime.firstMonster = true
  else runtime.secondMonster = true
  emit(state, 'roar')
}

function monsters(state: SkiState, runtime: Runtime, dt: number): void {
  const courseRunout = state.courseStarted && state.y >= 1400
  if (!runtime.firstMonster && (state.y >= 2000 || Math.abs(state.x) > 1500 || state.y < -1500 || courseRunout)) spawnMonster(state, runtime, 0)
  if (!runtime.secondMonster && state.y >= 3000) spawnMonster(state, runtime, 1)
  let eater: Monster | null = null
  for (let i = 0; i < state.monsters.length; i++) {
    const monster = state.monsters[i]
    if (monster.active && monster.phase !== 'chase') eater = monster
  }
  for (let i = 0; i < state.monsters.length; i++) {
    const monster = state.monsters[i]
    if (!monster.active) continue
    monster.timer += dt
    if (monster.phase === 'chase') {
      if (eater) continue
      const dx = state.x - monster.x
      const dy = state.y - monster.y
      const distance = Math.hypot(dx, dy)
      const travel = Math.min(distance, MONSTER_SPEED * dt)
      if (distance > 0) {
        monster.x += dx / distance * travel
        monster.y += dy / distance * travel
      }
      if (distance - travel <= 12) {
        monster.phase = 'grab'
        monster.timer = 0
        state.speed = 0
        state.air = 0
        state.trick = 'none'
        runtime.airPoints = 0
        eater = monster
        emit(state, 'gobble')
      }
    } else if (monster.phase === 'grab' && monster.timer >= 0.4) {
      monster.phase = 'chew'
      monster.timer = 0
    } else if (monster.phase === 'chew' && monster.timer >= 1.4) {
      monster.phase = 'burp'
      monster.timer = 0
      emit(state, 'burp')
    } else if (monster.phase === 'burp' && monster.timer >= 0.75) {
      monster.phase = 'away'
      monster.timer = 0
    } else if (monster.phase === 'away') {
      monster.x += 28 * dt
      monster.y -= 18 * dt
      if (monster.timer >= 0.75 && !state.gameOver) {
        state.gameOver = true
        emit(state, 'game-over')
      }
    }
  }
}

function advance(state: SkiState, runtime: Runtime, dt: number): void {
  const x = state.x
  const y = state.y
  state.time += dt
  state.stepCount++
  moveObjects(state, dt)
  if (!beingEaten(state)) {
    if (state.crash > 0) {
      state.crash = Math.max(0, state.crash - dt)
      if (state.crash < 1e-9) {
        state.crash = 0
        turn(state, 6)
      }
    } else {
      const cap = (state.fast ? FAST_CAP : NORMAL_CAP) * ANGLE_CAP[state.direction]
      // Gravity builds speed; turns scrub it faster than straight downhill acceleration.
      if (state.air === 0) {
        if (state.speed < cap) state.speed = Math.min(cap, state.speed + 48 * VY[state.direction] * dt)
        else state.speed = Math.max(cap, state.speed - 110 * dt)
      }
      state.x += VX[state.direction] * state.speed * dt
      state.y += VY[state.direction] * state.speed * dt
      state.distance = Math.max(0, state.distance, state.y)
      if (state.air > 0) {
        const flightStep = Math.min(dt, state.air)
        if (state.trick !== 'none') {
          const duration = state.trick === 'spin' ? SPIN_DURATION : FLIP_DURATION
          state.trickProgress += flightStep / duration
          if (state.trickProgress >= 1 - 1e-9) {
            runtime.airPoints += state.trick === 'spin' ? 100 : state.trick === 'front' ? 150 : 200
            state.completedTricks++
            state.trick = 'none'
            state.trickProgress = 0
            emit(state, 'trick')
          }
        }
        state.air = Math.max(0, state.air - dt)
        if (state.air < 1e-9) {
          state.air = 0
          emit(state, 'land')
          if (state.trick !== 'none') crash(state, runtime, true)
          else {
            const points = runtime.airPoints
            runtime.airPoints = 0
            // Only the landing point collides: airborne paths may safely cross obstacles.
            collide(state, runtime, state.x, state.y)
            if (state.crash === 0) state.style += points
          }
        }
      } else collide(state, runtime, x, y)
    }
  }
  courseRules(state, runtime, x, y, dt)
  monsters(state, runtime, dt)
  if ((state.x !== x || state.y !== y) && state.air === 0 && state.crash === 0 && !beingEaten(state)) {
    const index = state.trackIndex
    state.tracks[index] = state.x
    state.tracks[index + 1] = state.y
    state.tracks[index + 2] = state.time
    state.trackIndex = (index + 3) % state.tracks.length
  }
  refreshChunks(state, runtime)
}

/** Mutates only its own state. Input sounds survive the event reset at the start of a public step. */
export function stepGame(state: SkiState, dt: number): void {
  const runtime = runtimes.get(state)
  if (!runtime) return
  state.events.length = 0
  for (let i = 0; i < runtime.queuedCount; i++) emit(state, runtime.queued[i])
  runtime.queuedCount = 0
  if (state.gameOver || !Number.isFinite(dt) || dt <= 0) return
  let remaining = dt
  while (remaining > 1e-9 && !state.gameOver) {
    const slice = Math.min(FIXED_DT, remaining)
    advance(state, runtime, slice)
    remaining -= slice
  }
}
