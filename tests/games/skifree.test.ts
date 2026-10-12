import { describe, expect, test } from 'bun:test'
import {
  CHUNK_SIZE, COURSE_FINISH, COURSE_START, CRASH_DURATION, FAST_CAP, FIXED_DT, FLIP_DURATION, GATE_COUNT, GATE_PENALTY, GATE_WIDTH,
  HOP_DURATION, MONSTER_SPEED, NORMAL_CAP, RAINBOW_DURATION, RAMP_DURATION, SPIN_DURATION, TRACK_CAPACITY, WRAP_DISTANCE,
  command, createGame, generateChunk, steer, stepGame,
} from '../../src/games/skifree/engine'
import { STRINGS } from '../../src/games/skifree/strings'
import type { Course, GameEvent, ObstacleKind, SkiState, WorldObject } from '../../src/games/skifree/types'

function clearSlope(state: SkiState): void {
  for (const object of state.objects) object.active = false
}

function openSlope(course: Course = 'free'): SkiState {
  const state = createGame(1991, course)
  if (course === 'free') state.x = 600
  clearSlope(state)
  return state
}

function advance(state: SkiState, seconds: number, clear = true): GameEvent[] {
  const events: GameEvent[] = []
  let remaining = seconds
  while (remaining > 1e-9) {
    if (clear) clearSlope(state)
    const dt = Math.min(remaining, FIXED_DT)
    stepGame(state, dt)
    events.push(...state.events)
    remaining -= dt
  }
  return events
}

function obstacle(state: SkiState, kind: ObstacleKind, overrides: Partial<WorldObject> = {}): WorldObject {
  const object: WorldObject = { id: -999, kind, x: state.x, y: state.y, radius: 10, variant: 0, active: true, ...overrides }
  state.objects.push(object)
  return object
}

function startRun(course: Course): SkiState {
  const state = openSlope(course)
  state.y = COURSE_START - 0.5
  command(state, 'down')
  state.speed = NORMAL_CAP
  stepGame(state, FIXED_DT)
  expect(state.courseStarted).toBe(true)
  return state
}

function gateCrossing(state: SkiState, crossingX: number, row = state.gateIndex): void {
  clearSlope(state)
  state.x = crossingX
  state.y = 200 + row * 100 - 0.5
  state.direction = 3
  state.speed = NORMAL_CAP
  stepGame(state, FIXED_DT)
}

describe('seeded endless mountain', () => {
  test('same seed and chunk yield exactly the same layout, independent of call order', () => {
    const original = generateChunk(4490, 3, 7)
    generateChunk(7, -40, 9)
    expect(generateChunk(4490, 3, 7)).toEqual(original)
    expect(generateChunk(4491, 3, 7)).not.toEqual(original)
    expect(generateChunk(4490, 4, 7)).not.toEqual(original)
  })

  test('positive and negative chunk positions stay inside their cells', () => {
    for (const cx of [-31, -1, 0, 1, 31]) {
      for (const cy of [-31, -1, 0, 1, 31]) {
        const objects = generateChunk(1991, cx, cy)
        expect(new Set(objects.map(object => object.id)).size).toBe(objects.length)
        for (const object of objects) {
          expect(object.x).toBeGreaterThanOrEqual(cx * CHUNK_SIZE)
          expect(object.x).toBeLessThan((cx + 1) * CHUNK_SIZE)
          expect(object.y).toBeGreaterThanOrEqual(cy * CHUNK_SIZE)
          expect(object.y).toBeLessThan((cy + 1) * CHUNK_SIZE)
        }
      }
    }
  })

  test('weighted terrain is tree-dominated and all classes occur across thousands of seeded objects', () => {
    const weights: Partial<Record<ObstacleKind, number>> = {
      tree: 30, 'big-tree': 12, mogul: 12, rock: 7, 'dead-tree': 6, stump: 6,
      ramp: 5, dog: 3, skier: 3, snowboarder: 3, rainbow: 2, hydrant: 1,
    }
    const counts = new Map<ObstacleKind, number>()
    let total = 0
    for (let cx = 1; cx < WRAP_DISTANCE / CHUNK_SIZE; cx++) {
      for (let cy = 2; cy < 22; cy++) {
        for (const object of generateChunk(4490, cx, cy)) {
          expect(object.kind).not.toBe('lift')
          counts.set(object.kind, (counts.get(object.kind) ?? 0) + 1)
          total++
        }
      }
    }
    expect(total).toBeGreaterThan(10000)
    expect(counts.size).toBe(Object.keys(weights).length)
    for (const [kind, weight] of Object.entries(weights)) {
      const expected = weight / 90
      const tolerance = Math.max(0.006, expected * 0.3)
      const fraction = (counts.get(kind as ObstacleKind) ?? 0) / total
      expect(fraction).toBeGreaterThan(expected - tolerance)
      expect(fraction).toBeLessThan(expected + tolerance)
    }
    const trees = (counts.get('tree') ?? 0) + (counts.get('big-tree') ?? 0) + (counts.get('dead-tree') ?? 0)
    expect(trees / total).toBeGreaterThan(0.45)
    expect(trees / total).toBeLessThan(0.6)
  })

  test('only the wrapped zero column contains the single harmless tower-and-chair lift line', () => {
    const period = WRAP_DISTANCE / CHUNK_SIZE
    for (const cx of [-period, 0, period]) {
      for (const cy of [-3, 2, 7]) {
        const lifts = generateChunk(1991, cx, cy).filter(object => object.kind === 'lift')
        expect(lifts.length).toBe(2)
        const [tower, chair] = lifts
        expect(tower.variant).toBe(0)
        expect(tower.x).toBe(cx * CHUNK_SIZE + 300)
        expect(tower.y).toBe(cy * CHUNK_SIZE + 24)
        expect(chair.variant).toBe(1)
        expect(chair.x).toBe(tower.x + 10)
        expect(chair.y).toBe(cy * CHUNK_SIZE + 200)
        for (const lift of lifts) {
          expect(lift.radius).toBe(0)
          expect(lift.side).toBeUndefined()
          expect(lift.active).toBe(true)
        }
      }
    }
    for (const cx of [-period - 1, -1, 1, period - 1, period + 1]) {
      expect(generateChunk(1991, cx, 7).some(object => object.kind === 'lift')).toBe(false)
    }
  })

  test('weighted terrain and the lift do not intrude into the repeated start and course clearing', () => {
    const period = WRAP_DISTANCE / CHUNK_SIZE
    for (const cx of [-1, 0]) {
      for (const cy of [-1, 0, 1]) {
        const objects = generateChunk(1991, cx, cy)
        const wrapped = generateChunk(1991, cx + period, cy + period)
        for (let i = 0; i < objects.length; i++) {
          const object = objects[i]
          if (object.y > -100 && object.y < 1200 && Math.abs(object.x) < 340) {
            expect(object.active).toBe(false)
            expect(wrapped[i].active).toBe(false)
          }
        }
      }
    }
  })

  test('layout and object identities repeat at the 18,000m seam on both axes', () => {
    const period = WRAP_DISTANCE / CHUNK_SIZE
    const originals = generateChunk(1991, -1, 0)
    const wrapped = generateChunk(1991, period - 1, period)
    for (let i = 0; i < originals.length; i++) {
      expect(wrapped[i].id).toBe(originals[i].id)
      expect(wrapped[i].kind).toBe(originals[i].kind)
      expect(wrapped[i].variant).toBe(originals[i].variant)
      expect(wrapped[i].active).toBe(originals[i].active)
      expect(wrapped[i].x - originals[i].x).toBeCloseTo(WRAP_DISTANCE, 8)
      expect(wrapped[i].y - originals[i].y).toBeCloseTo(WRAP_DISTANCE, 8)
    }
  })

  test('start is stopped facing right and course selections choose the proper lane', () => {
    const free = createGame(1)
    expect(free.x).toBe(0)
    expect(free.y).toBe(0)
    expect(free.direction).toBe(6)
    expect(free.speed).toBe(0)
    expect(free.courseStarted).toBe(false)
    expect(createGame(1, 'slalom').x).toBe(-220)
    expect(createGame(1, 'tree').x).toBe(0)
    expect(createGame(1, 'freestyle').x).toBe(220)
    expect(createGame(1, 'free').x).toBe(100)
  })

  test('all authored signs, course starts, finish banners and course features exist', () => {
    const state = createGame(1)
    for (const text of Object.values(STRINGS.signs)) expect(state.objects.some(object => object.kind === 'sign' && object.text === text)).toBe(true)
    const banners = state.objects.filter(object => object.kind === 'banner')
    expect(banners.length).toBe(6)
    for (const course of ['slalom', 'tree', 'freestyle'] as Course[]) {
      expect(banners.some(object => object.text === STRINGS.courseNames[course] && object.y === COURSE_START)).toBe(true)
      expect(banners.some(object => object.text === STRINGS.courseNames[course] && object.y === COURSE_FINISH)).toBe(true)
    }
    expect(state.objects.filter(object => object.kind === 'gate').length).toBe(GATE_COUNT * 2)
    expect(state.objects.some(object => object.kind === 'rainbow' && object.x > 100 && object.y < COURSE_FINISH)).toBe(true)
    expect(state.objects.some(object => object.kind === 'tree' && Math.abs(object.x) < 100 && object.y > COURSE_START)).toBe(true)
  })

  test('Tree Slalom has varied active racing-line trees between alternating rows with clear flag crossings', () => {
    const state = createGame(1991, 'tree')
    const trees = state.objects.filter(object => object.id < 0 && (object.kind === 'tree' || object.kind === 'big-tree') && Math.abs(object.x) <= 12)
    expect(trees.length).toBe(GATE_COUNT)
    expect(new Set(trees.map(object => object.kind)).size).toBe(2)
    expect(new Set(trees.map(object => object.radius)).size).toBe(2)
    for (let row = 0; row < GATE_COUNT; row++) {
      const gateY = 200 + row * 100
      const tree = trees.find(object => object.y === gateY + 50)
      expect(tree).toBeDefined()
      expect(tree!.active).toBe(true)
      expect(tree!.radius).toBeGreaterThan(0)
      expect(tree!.x).toBe(row % 2 === 0 ? -12 : 12)
      expect(tree!.y - gateY).toBeGreaterThan(tree!.radius + 5)
      expect(gateY + 100 - tree!.y).toBeGreaterThan(tree!.radius + 5)
    }
  })

  test('authored racing-line trees really crash the skier, while left and right detours stay skiable', () => {
    for (let row = 0; row < GATE_COUNT; row++) {
      for (const detour of [0, -1, 1]) {
        const state = createGame(1991, 'tree')
        const tree = state.objects.find(object => object.id < 0 && (object.kind === 'tree' || object.kind === 'big-tree')
          && Math.abs(object.x) <= 12 && object.y === 250 + row * 100)!
        for (const object of state.objects) object.active = object === tree
        state.x = tree.x + detour * (tree.radius + 6)
        state.y = tree.y - 20
        expect(Math.abs(state.x)).toBeLessThan(85)
        command(state, 'down')
        state.speed = NORMAL_CAP
        const events = advance(state, 0.4, false)
        expect(events.includes('crash')).toBe(detour === 0)
        expect(state.crash > 0).toBe(detour === 0)
        if (detour !== 0) expect(state.y).toBeGreaterThan(tree.y)
      }
    }
  })

  test('chunks recycle their existing objects and stationary steps preserve their identity', () => {
    const state = openSlope()
    const objects = state.objects
    const identities = [...objects]
    const tracks = state.tracks
    const events = state.events
    const count = objects.length
    stepGame(state, FIXED_DT)
    state.x = 1300
    clearSlope(state)
    stepGame(state, FIXED_DT)
    expect(state.objects).toBe(objects)
    expect(state.objects.length).toBe(count)
    expect(state.tracks).toBe(tracks)
    expect(state.events).toBe(events)
    for (let i = 0; i < count; i++) expect(state.objects[i]).toBe(identities[i])
  })

  test('crossing the wrap seam keeps absolute coordinates and the deepest downhill high-water mark', () => {
    const state = openSlope()
    state.y = WRAP_DISTANCE - 1
    state.distance = WRAP_DISTANCE + 123
    command(state, 'fast')
    command(state, 'down')
    state.speed = FAST_CAP
    advance(state, FIXED_DT)
    expect(state.y).toBeGreaterThan(WRAP_DISTANCE)
    expect(state.distance).toBe(WRAP_DISTANCE + 123)
    state.y = WRAP_DISTANCE + 122
    advance(state, FIXED_DT)
    expect(state.y).toBeGreaterThan(WRAP_DISTANCE + 123)
    expect(state.distance).toBe(state.y)
  })
})

describe('grounded directions, gravity, walking and input', () => {
  test('left and right rotate through every one of the seven grounded states', () => {
    const state = openSlope()
    for (let direction = 5; direction >= 0; direction--) {
      command(state, 'left')
      expect(state.direction).toBe(direction)
    }
    for (let direction = 1; direction <= 6; direction++) {
      command(state, 'right')
      expect(state.direction).toBe(direction)
    }
    command(state, 'diagonal-left')
    expect(state.direction).toBe(2)
    command(state, 'diagonal-right')
    expect(state.direction).toBe(4)
    command(state, 'down')
    expect(state.direction).toBe(3)
    command(state, 'horizontal-left')
    expect(state.direction).toBe(0)
    command(state, 'horizontal-right')
    expect(state.direction).toBe(6)
  })

  test('pointing horizontally stops immediately; pressing the facing side walks', () => {
    const state = openSlope()
    state.speed = NORMAL_CAP
    command(state, 'horizontal-left')
    expect(state.speed).toBe(0)
    const x = state.x
    command(state, 'left')
    expect(state.x).toBe(x - 6)
    expect(state.y).toBe(0)
    command(state, 'horizontal-right')
    command(state, 'right')
    expect(state.x).toBe(x)
    expect(state.distance).toBe(0)
    advance(state, 1)
    expect(state.speed).toBe(0)
    expect(state.x).toBe(x)
  })

  test('up walks uphill when stopped without earning downhill distance', () => {
    const state = openSlope()
    command(state, 'up')
    expect(state.y).toBe(-4)
    expect(state.distance).toBe(0)
    command(state, 'up')
    expect(state.y).toBe(-8)
    expect(state.distance).toBe(0)
  })

  test('up brakes straight downhill without biasing the heading to either side', () => {
    const state = openSlope()
    command(state, 'down')
    state.speed = 80
    const x = state.x
    for (let press = 1; press <= 3; press++) {
      command(state, 'up')
      expect(state.direction).toBe(3)
      expect(state.speed).toBeCloseTo(80 * 0.55 ** press, 8)
    }
    advance(state, FIXED_DT)
    expect(state.direction).toBe(3)
    expect(state.x).toBe(x)
    expect(state.y).toBeGreaterThan(0)
  })

  test('up still rotates angled skis symmetrically toward a horizontal stop', () => {
    for (const side of [-1, 1]) {
      const state = openSlope()
      command(state, side < 0 ? 'diagonal-left' : 'diagonal-right')
      state.speed = 80
      command(state, 'up')
      expect(state.direction).toBe(3 + side * 2)
      expect(state.speed).toBe(44)
      command(state, 'up')
      expect(state.direction).toBe(3 + side * 3)
      expect(state.speed).toBe(0)
      command(state, 'up')
      expect(state.y).toBe(-4)
      expect(state.distance).toBe(0)
    }
  })

  test('sideways and uphill walking preserve the descent record until new ground is reached', () => {
    const state = openSlope()
    command(state, 'down')
    advance(state, 1)
    const deepest = state.y
    expect(state.distance).toBe(deepest)
    command(state, 'horizontal-right')
    for (let i = 0; i < 18; i++) command(state, 'right')
    for (let i = 0; i < 5; i++) command(state, 'up')
    expect(state.y).toBeCloseTo(deepest - 20, 8)
    expect(state.distance).toBe(deepest)
    command(state, 'down')
    state.speed = NORMAL_CAP
    advance(state, 0.1)
    expect(state.y).toBeLessThan(deepest)
    expect(state.distance).toBe(deepest)
    advance(state, 0.2)
    expect(state.y).toBeGreaterThan(deepest)
    expect(state.distance).toBe(state.y)
  })

  test('gravity accelerates gradually to the downhill cap, and turns scrub excess speed', () => {
    const state = openSlope()
    command(state, 'down')
    advance(state, FIXED_DT)
    expect(state.speed).toBeCloseTo(48 * FIXED_DT, 8)
    advance(state, 3)
    expect(state.speed).toBe(NORMAL_CAP)
    expect(state.y).toBeGreaterThan(0)
    command(state, 'diagonal-right')
    const oldSpeed = state.speed
    advance(state, FIXED_DT)
    expect(state.speed).toBeLessThan(oldSpeed)
    advance(state, 1)
    expect(state.speed).toBeCloseTo(NORMAL_CAP * 0.72, 8)
    command(state, 'right')
    advance(state, 1)
    expect(state.speed).toBeCloseTo(NORMAL_CAP * 0.3, 8)
  })

  test('left and right diagonal movement are symmetric, with distance measured by downhill depth', () => {
    const left = openSlope()
    const right = openSlope()
    command(left, 'diagonal-left')
    command(right, 'diagonal-right')
    advance(left, 1)
    advance(right, 1)
    expect(600 - left.x).toBeCloseTo(right.x - 600, 8)
    expect(left.y).toBeCloseTo(right.y, 8)
    expect(left.distance).toBeCloseTo(right.distance, 8)
    expect(left.distance).toBeCloseTo(left.y, 8)
    expect(left.distance).toBeLessThan(Math.hypot(left.x - 600, left.y))
  })

  test('pointer quantization reaches all grounded headings; invalid and zero vectors do nothing', () => {
    const state = openSlope()
    const vectors = [[-10, 0], [-10, 2], [-10, 10], [0, 10], [10, 10], [10, 2], [10, 0]]
    for (let direction = 0; direction < vectors.length; direction++) {
      steer(state, vectors[direction][0], vectors[direction][1])
      expect(state.direction).toBe(direction)
    }
    steer(state, 0, 0)
    steer(state, Number.NaN, 1)
    steer(state, 1, Infinity)
    expect(state.direction).toBe(6)
  })

  test('fast toggle raises and then lowers the cap without changing the heading', () => {
    expect(FAST_CAP).toBeGreaterThan(MONSTER_SPEED)
    expect(MONSTER_SPEED).toBeGreaterThan(NORMAL_CAP)
    const state = openSlope()
    command(state, 'down')
    command(state, 'fast')
    expect(state.fast).toBe(true)
    advance(state, 4)
    expect(state.speed).toBe(FAST_CAP)
    command(state, 'fast')
    expect(state.fast).toBe(false)
    advance(state, 1)
    expect(state.speed).toBe(NORMAL_CAP)
    expect(state.direction).toBe(3)
  })

  test('one catch-up step follows the same fixed-step physics as many individual steps', () => {
    const single = openSlope()
    const fixed = openSlope()
    command(single, 'down')
    command(fixed, 'down')
    stepGame(single, 2)
    advance(fixed, 2)
    expect(single.x).toBeCloseTo(fixed.x, 8)
    expect(single.y).toBeCloseTo(fixed.y, 8)
    expect(single.speed).toBeCloseTo(fixed.speed, 8)
    expect(single.time).toBeCloseTo(fixed.time, 8)
    expect(single.distance).toBeCloseTo(fixed.distance, 8)
    expect(single.stepCount).toBe(fixed.stepCount)
  })

  test('invalid and zero elapsed times do not advance physics', () => {
    const state = openSlope()
    command(state, 'down')
    for (const dt of [0, -1, Infinity, Number.NaN]) stepGame(state, dt)
    expect(state.time).toBe(0)
    expect(state.y).toBe(0)
    expect(state.speed).toBe(0)
    expect(state.stepCount).toBe(0)
  })
})

describe('obstacles, NPCs and crash recovery', () => {
  for (const kind of ['tree', 'big-tree', 'dead-tree', 'stump', 'rock', 'skier', 'snowboarder'] as ObstacleKind[]) {
    test(`${kind} causes a timed crash and removes speed`, () => {
      const state = openSlope()
      obstacle(state, kind)
      command(state, 'down')
      state.speed = 80
      stepGame(state, FIXED_DT)
      expect(state.crash).toBe(CRASH_DURATION)
      expect(state.speed).toBe(0)
      expect(state.events).toContain('crash')
      expect(state.gameOver).toBe(false)
    })
  }

  test('crashes block motion and steering, recover on time, and leave the skier stopped', () => {
    const state = openSlope()
    obstacle(state, 'rock')
    stepGame(state, FIXED_DT)
    const x = state.x
    const y = state.y
    command(state, 'down')
    steer(state, -10, 10)
    advance(state, CRASH_DURATION - FIXED_DT)
    expect(state.crash).toBeGreaterThan(0)
    expect(state.x).toBe(x)
    expect(state.y).toBe(y)
    advance(state, FIXED_DT)
    expect(state.crash).toBe(0)
    expect(state.direction).toBe(6)
    expect(state.speed).toBe(0)
    command(state, 'down')
    advance(state, FIXED_DT)
    expect(state.speed).toBeGreaterThan(0)
  })

  test('standing on the collision object does not produce an endless recovery-crash loop', () => {
    const state = openSlope()
    obstacle(state, 'rock')
    stepGame(state, FIXED_DT)
    advance(state, CRASH_DURATION + 0.2, false)
    expect(state.crash).toBe(0)
    expect(state.events).not.toContain('crash')
  })

  test('ground collision style penalty cannot underflow zero', () => {
    const state = openSlope()
    state.style = 100
    obstacle(state, 'tree')
    stepGame(state, FIXED_DT)
    expect(state.style).toBe(75)
    const low = openSlope()
    low.style = 10
    obstacle(low, 'tree')
    stepGame(low, FIXED_DT)
    expect(low.style).toBe(0)
  })

  test('dog collision yips, crashes and leaves harmless yellow snow in the same pooled object', () => {
    const state = openSlope()
    const dog = obstacle(state, 'dog')
    stepGame(state, FIXED_DT)
    expect(dog.kind).toBe('yellow-snow')
    expect(dog.radius).toBe(0)
    expect(dog.active).toBe(true)
    expect(state.crash).toBe(CRASH_DURATION)
    expect(state.events).toContain('dog')
    expect(state.events).toContain('crash')
    advance(state, CRASH_DURATION + 0.2, false)
    expect(state.crash).toBe(0)
  })

  test('uphill traversal turns an eligible stump into a mushroom without crashing', () => {
    const state = openSlope()
    const stump = obstacle(state, 'stump', { y: -4, variant: 0 })
    command(state, 'up')
    expect(stump.kind).toBe('mushroom')
    expect(stump.radius).toBe(0)
    expect(state.crash).toBe(0)
    expect(state.y).toBe(-4)
  })

  test('ordinary stumps do not transform uphill and eligible stumps do not transform downhill', () => {
    const uphill = openSlope()
    const ordinary = obstacle(uphill, 'stump', { y: -4, variant: 1 })
    command(uphill, 'up')
    expect(ordinary.kind).toBe('stump')
    expect(uphill.crash).toBe(CRASH_DURATION)
    stepGame(uphill, 0)
    expect(uphill.events).toContain('crash')
    const downhill = openSlope()
    const eligible = obstacle(downhill, 'stump')
    command(downhill, 'down')
    stepGame(downhill, FIXED_DT)
    expect(eligible.kind).toBe('stump')
    expect(downhill.crash).toBe(CRASH_DURATION)
  })

  test('slow moguls slow the skier; fast moguls also create a short hop', () => {
    const slow = openSlope()
    obstacle(slow, 'mogul')
    command(slow, 'down')
    slow.speed = 20
    stepGame(slow, FIXED_DT)
    expect(slow.speed).toBeLessThan(20)
    expect(slow.air).toBe(0)
    expect(slow.crash).toBe(0)
    const fast = openSlope()
    obstacle(fast, 'mogul')
    command(fast, 'down')
    fast.speed = 80
    stepGame(fast, FIXED_DT)
    expect(fast.air).toBeCloseTo(0.35, 8)
    expect(fast.events).toContain('jump')
    expect(fast.crash).toBe(0)
  })

  for (const kind of ['lift', 'hydrant', 'yellow-snow', 'mushroom', 'sign', 'banner', 'gate'] as ObstacleKind[]) {
    test(`${kind} is harmless on contact`, () => {
      const state = openSlope()
      obstacle(state, kind)
      stepGame(state, FIXED_DT)
      expect(state.crash).toBe(0)
      expect(state.air).toBe(0)
    })
  }

  test('inactive pooled obstacles do not collide', () => {
    const state = openSlope()
    obstacle(state, 'rock', { active: false })
    stepGame(state, FIXED_DT)
    expect(state.crash).toBe(0)
  })

  test('dogs wander, skiers and snowboarders descend, lift chairs move and towers remain fixed', () => {
    const state = openSlope()
    const dog = obstacle(state, 'dog', { x: 1000, side: -1 })
    const skier = obstacle(state, 'skier', { x: 1000, side: 1 })
    const boarder = obstacle(state, 'snowboarder', { x: 1000, side: -1 })
    const chair = obstacle(state, 'lift', { x: 1000, variant: 1 })
    const tower = obstacle(state, 'lift', { x: 1000, variant: 0 })
    advance(state, 0.5, false)
    expect(dog.x).toBeCloseTo(993.5, 8)
    expect(skier.x).toBeCloseTo(1005.5, 8)
    expect(skier.y).toBeCloseTo(19, 8)
    expect(boarder.x).toBeCloseTo(988.5, 8)
    expect(boarder.y).toBeCloseTo(23, 8)
    expect(chair.y).toBeCloseTo(-11, 8)
    expect(tower.y).toBe(0)
  })

  test('swept collision catches a narrow obstacle crossed at very high speed', () => {
    const state = openSlope()
    command(state, 'down')
    state.speed = 3000
    obstacle(state, 'rock', { y: 25, radius: 1 })
    stepGame(state, FIXED_DT)
    expect(state.crash).toBe(CRASH_DURATION)
  })
})

describe('airborne state, ramps and style accounting', () => {
  test('jump creates the eighth state, preserves velocity, then lands with base style points', () => {
    const state = openSlope()
    command(state, 'down')
    state.speed = 70
    command(state, 'jump')
    expect(state.air).toBe(HOP_DURATION)
    expect(state.airDuration).toBe(HOP_DURATION)
    const events = advance(state, HOP_DURATION)
    expect(state.air).toBe(0)
    expect(state.crash).toBe(0)
    expect(state.style).toBe(10)
    expect(state.speed).toBe(70)
    expect(state.y).toBeCloseTo(70 * HOP_DURATION, 8)
    expect(events).toContain('jump')
    expect(events).toContain('land')
  })

  test('ramp and rainbow launch different airtimes and clean landing scores', () => {
    for (const [kind, duration, points] of [['ramp', RAMP_DURATION, 25], ['rainbow', RAINBOW_DURATION, 50]] as const) {
      const state = openSlope()
      obstacle(state, kind)
      stepGame(state, FIXED_DT)
      expect(state.air).toBe(duration)
      expect(state.airDuration).toBe(duration)
      advance(state, duration)
      expect(state.air).toBe(0)
      expect(state.style).toBe(points)
      expect(state.crash).toBe(0)
    }
  })

  for (const [action, trick, points] of [['left', 'spin', 100], ['right', 'spin', 100], ['up', 'front', 150], ['down', 'back', 200]] as const) {
    test(`${action} performs ${trick}, but only a clean landing banks its ${points} points`, () => {
      const state = openSlope()
      obstacle(state, 'rainbow')
      stepGame(state, FIXED_DT)
      command(state, action)
      expect(state.trick).toBe(trick)
      const events = advance(state, trick === 'spin' ? SPIN_DURATION : FLIP_DURATION)
      expect(events).toContain('trick')
      expect(state.completedTricks).toBe(1)
      expect(state.trick).toBe('none')
      expect(state.style).toBe(0)
      advance(state, RAINBOW_DURATION - (trick === 'spin' ? SPIN_DURATION : FLIP_DURATION))
      expect(state.style).toBe(50 + points)
      expect(state.crash).toBe(0)
    })
  }

  test('multiple completed tricks in one flight add together once, only at landing', () => {
    const state = openSlope()
    obstacle(state, 'rainbow')
    stepGame(state, FIXED_DT)
    command(state, 'left')
    advance(state, SPIN_DURATION)
    command(state, 'up')
    advance(state, FLIP_DURATION)
    command(state, 'down')
    advance(state, FLIP_DURATION)
    expect(state.completedTricks).toBe(3)
    expect(state.style).toBe(0)
    advance(state, RAINBOW_DURATION - SPIN_DURATION - FLIP_DURATION * 2)
    expect(state.style).toBe(500)
    advance(state, 0.2)
    expect(state.style).toBe(500)
  })

  test('unfinished landing crashes, loses style, and does not bank previous completed tricks', () => {
    const state = openSlope()
    state.style = 200
    obstacle(state, 'ramp')
    stepGame(state, FIXED_DT)
    command(state, 'left')
    advance(state, SPIN_DURATION)
    command(state, 'up')
    const events = advance(state, RAMP_DURATION - SPIN_DURATION)
    expect(state.air).toBe(0)
    expect(state.crash).toBeGreaterThan(0)
    expect(state.style).toBe(150)
    expect(state.completedTricks).toBe(0)
    expect(events).toContain('land')
    expect(events).toContain('crash')
  })

  test('a hop cannot complete a flip and style penalties saturate at zero', () => {
    const state = openSlope()
    command(state, 'jump')
    command(state, 'down')
    advance(state, HOP_DURATION)
    expect(state.crash).toBe(CRASH_DURATION)
    expect(state.style).toBe(0)
  })

  test('airborne steering and repeat trick inputs cannot change heading or restart a trick', () => {
    const state = openSlope()
    command(state, 'down')
    command(state, 'jump')
    command(state, 'left')
    advance(state, 0.1)
    const progress = state.trickProgress
    command(state, 'right')
    command(state, 'jump')
    steer(state, -100, 0)
    expect(state.direction).toBe(3)
    expect(state.trick).toBe('spin')
    expect(state.trickProgress).toBe(progress)
    expect(state.airDuration).toBe(HOP_DURATION)
  })

  test('airborne paths clear obstacles, but a solid landing forfeits jump points', () => {
    const state = openSlope()
    command(state, 'down')
    state.speed = 70
    command(state, 'jump')
    obstacle(state, 'rock', { y: 15, radius: 1 })
    advance(state, HOP_DURATION, false)
    expect(state.crash).toBe(0)
    expect(state.style).toBe(10)
    const landing = openSlope()
    command(landing, 'down')
    landing.speed = 70
    command(landing, 'jump')
    obstacle(landing, 'tree', { y: 70 * HOP_DURATION })
    advance(landing, HOP_DURATION, false)
    expect(landing.crash).toBe(CRASH_DURATION)
    expect(landing.style).toBe(0)
  })
})

describe('course starts, gates, penalties, timing and finishes', () => {
  for (const course of ['slalom', 'tree', 'freestyle'] as Course[]) {
    test(`${course} starts by crossing its banner and emits the start event`, () => {
      const state = startRun(course)
      expect(state.course).toBe(course)
      expect(state.events).toContain('course-start')
      expect(state.courseTime).toBeGreaterThan(0)
      expect(state.courseTime).toBeLessThan(FIXED_DT)
      expect(state.penalties).toBe(0)
    })
  }

  test('explicit Free Ski remains free straight downhill; the default starting area can enter Tree Slalom', () => {
    const free = createGame(1991, 'free')
    command(free, 'down')
    advance(free, 2.2)
    expect(free.y).toBeGreaterThan(COURSE_START)
    expect(free.x).toBe(100)
    expect(free.course).toBe('free')
    expect(free.courseStarted).toBe(false)
    expect(free.courseTime).toBe(0)
    const area = createGame(1991)
    command(area, 'down')
    const events = advance(area, 2.2)
    expect(area.x).toBe(0)
    expect(area.course).toBe('tree')
    expect(area.courseStarted).toBe(true)
    expect(events).toContain('course-start')
  })

  test('a free skier can enter any banner; skiing outside all banners remains free', () => {
    const state = openSlope()
    state.x = -220
    state.y = COURSE_START - 0.5
    command(state, 'down')
    state.speed = NORMAL_CAP
    stepGame(state, FIXED_DT)
    expect(state.course).toBe('slalom')
    expect(state.courseStarted).toBe(true)
    const free = openSlope()
    free.y = COURSE_START - 0.5
    command(free, 'down')
    free.speed = NORMAL_CAP
    stepGame(free, FIXED_DT)
    expect(free.course).toBe('free')
    expect(free.courseStarted).toBe(false)
    expect(free.courseTime).toBe(0)
  })

  test('each start banner includes its exact corridor edges but excludes crossings just outside them', () => {
    for (const [course, origin] of [['slalom', -220], ['tree', 0], ['freestyle', 220]] as const) {
      for (const side of [-1, 1]) {
        for (const separation of [85, 85.01]) {
          const state = openSlope()
          state.x = origin + side * separation
          state.y = COURSE_START - 0.5
          command(state, 'down')
          state.speed = NORMAL_CAP
          stepGame(state, FIXED_DT)
          const started = separation === 85
          expect(state.courseStarted).toBe(started)
          expect(state.events.includes('course-start')).toBe(started)
          expect(state.course).toBe(started ? course : 'free')
          expect(state.courseTime).toBeCloseTo(started ? FIXED_DT - 0.5 / NORMAL_CAP : 0, 8)
        }
      }
    }
  })

  test('blue requires left, red requires right, and consecutive correct gates add no penalty', () => {
    const state = startRun('slalom')
    gateCrossing(state, -220 - 38 - 20)
    expect(state.events).toContain('gate-pass')
    expect(state.events).not.toContain('gate-miss')
    expect(state.gateIndex).toBe(1)
    gateCrossing(state, -220 + 38 + 20)
    expect(state.events).toContain('gate-pass')
    expect(state.penalties).toBe(0)
    expect(state.gateIndex).toBe(2)
  })

  test('the wrong side misses and adds exactly five seconds, separately from elapsed time', () => {
    const state = startRun('tree')
    const before = state.courseTime
    gateCrossing(state, 0)
    expect(state.events).toContain('gate-miss')
    expect(state.penalties).toBe(GATE_PENALTY)
    expect(state.courseTime - before).toBeCloseTo(FIXED_DT, 8)
    expect(state.courseTime + state.penalties).toBeGreaterThan(5)
  })

  test('both colored gate corridors exclude the flag center and include only their exact outer edge', () => {
    for (const [course, origin] of [['slalom', -220], ['tree', 0]] as const) {
      for (const row of [0, 1]) {
        const side = row === 0 ? -1 : 1
        for (const [separation, passes] of [[0, false], [GATE_WIDTH, true], [GATE_WIDTH + 0.01, false]] as const) {
          const state = startRun(course)
          state.gateIndex = row
          gateCrossing(state, origin + side * (38 + separation), row)
          expect(state.events.includes('gate-pass')).toBe(passes)
          expect(state.events.includes('gate-miss')).toBe(!passes)
          expect(state.penalties).toBe(passes ? 0 : GATE_PENALTY)
        }
      }
    }
  })

  test('gates count once, do not retrigger uphill, and airborne crossings still use the correct side', () => {
    const state = startRun('tree')
    gateCrossing(state, -58)
    advance(state, 0.1)
    expect(state.gateIndex).toBe(1)
    command(state, 'horizontal-left')
    for (let i = 0; i < 4; i++) command(state, 'up')
    advance(state, FIXED_DT)
    expect(state.gateIndex).toBe(1)
    state.x = 58
    state.y = 299.5
    command(state, 'down')
    state.speed = NORMAL_CAP
    command(state, 'jump')
    advance(state, FIXED_DT)
    expect(state.events).toContain('gate-pass')
    expect(state.gateIndex).toBe(2)
    expect(state.penalties).toBe(0)
  })

  test('crossing coordinates, not the endpoint, determine the correct gate side', () => {
    const state = startRun('tree')
    clearSlope(state)
    state.x = -38.2
    state.y = 199.5
    state.direction = 4
    state.speed = NORMAL_CAP
    stepGame(state, FIXED_DT)
    expect(state.x).toBeGreaterThan(-38)
    expect(state.events).toContain('gate-miss')
    const pass = startRun('tree')
    clearSlope(pass)
    pass.x = -38.6
    pass.y = 199.5
    pass.direction = 4
    pass.speed = NORMAL_CAP
    stepGame(pass, FIXED_DT)
    expect(pass.x).toBeGreaterThan(-38)
    expect(pass.events).toContain('gate-pass')
  })

  test('skipped gates are all assessed; finish fires once and freezes the course clock', () => {
    const state = startRun('slalom')
    clearSlope(state)
    state.x = -220
    state.y = COURSE_FINISH - 0.5
    state.direction = 3
    state.speed = NORMAL_CAP
    stepGame(state, FIXED_DT)
    expect(state.gateIndex).toBe(GATE_COUNT)
    expect(state.penalties).toBe(GATE_COUNT * GATE_PENALTY)
    expect(state.courseFinished).toBe(true)
    expect(state.events).toContain('course-finish')
    const time = state.courseTime
    const penalties = state.penalties
    advance(state, 0.2)
    expect(state.courseTime).toBe(time)
    expect(state.penalties).toBe(penalties)
    expect(state.events).not.toContain('course-finish')
    expect(state.time).toBeGreaterThan(time)
  })

  test('only the selected finish corridor freezes time, including exact edges but not another banner', () => {
    for (const [course, origin] of [['slalom', -220], ['tree', 0], ['freestyle', 220]] as const) {
      for (const offset of [0, -85, 85, -85.01, 85.01, course === 'freestyle' ? -220 : 220]) {
        const state = startRun(course)
        clearSlope(state)
        state.x = origin + offset
        state.y = COURSE_FINISH - 0.5
        state.direction = 3
        state.speed = NORMAL_CAP
        const before = state.courseTime
        stepGame(state, FIXED_DT)
        const finished = Math.abs(offset) <= 85
        expect(state.course).toBe(course)
        expect(state.courseFinished).toBe(finished)
        expect(state.events.includes('course-finish')).toBe(finished)
        expect(state.courseTime - before).toBeCloseTo(finished ? 0.5 / NORMAL_CAP : FIXED_DT, 8)
        const atCrossing = state.courseTime
        advance(state, 0.2)
        expect(state.courseTime).toBeCloseTo(atCrossing + (finished ? 0 : 0.2), 8)
        expect(state.events).not.toContain('course-finish')
      }
    }
  })

  test('finish eligibility uses interpolated crossing x, not the endpoint on either side', () => {
    for (const side of [-1, 1]) {
      const outward = startRun('tree')
      clearSlope(outward)
      outward.x = side * 84.4
      outward.y = COURSE_FINISH - 0.5
      command(outward, side < 0 ? 'diagonal-left' : 'diagonal-right')
      outward.speed = NORMAL_CAP
      const before = outward.courseTime
      stepGame(outward, FIXED_DT)
      expect(Math.abs(outward.x)).toBeGreaterThan(85)
      expect(outward.courseFinished).toBe(true)
      expect(outward.events).toContain('course-finish')
      expect(outward.courseTime - before).toBeCloseTo(FIXED_DT * 0.5 / (outward.y - COURSE_FINISH + 0.5), 8)
      const inward = startRun('tree')
      clearSlope(inward)
      inward.x = side * 85.6
      inward.y = COURSE_FINISH - 0.5
      command(inward, side < 0 ? 'diagonal-right' : 'diagonal-left')
      inward.speed = NORMAL_CAP
      const missedBefore = inward.courseTime
      stepGame(inward, FIXED_DT)
      expect(Math.abs(inward.x)).toBeLessThan(85)
      expect(inward.courseFinished).toBe(false)
      expect(inward.events).not.toContain('course-finish')
      expect(inward.courseTime - missedBefore).toBeCloseTo(FIXED_DT, 8)
    }
  })

  test('an off-lane miss keeps timing until the skier walks above the finish and recrosses correctly', () => {
    const state = startRun('tree')
    clearSlope(state)
    state.x = 220
    state.y = COURSE_FINISH - 0.5
    state.speed = NORMAL_CAP
    const beforeMiss = state.courseTime
    stepGame(state, FIXED_DT)
    expect(state.courseFinished).toBe(false)
    expect(state.events).not.toContain('course-finish')
    expect(state.courseTime - beforeMiss).toBeCloseTo(FIXED_DT, 8)
    advance(state, 0.2)
    const deepest = state.distance
    command(state, 'horizontal-left')
    for (let i = 0; i < 36; i++) command(state, 'left')
    advance(state, FIXED_DT)
    expect(Math.abs(state.x)).toBeLessThan(85)
    expect(state.y).toBeGreaterThan(COURSE_FINISH)
    expect(state.courseFinished).toBe(false)
    while (state.y >= COURSE_FINISH) command(state, 'up')
    advance(state, FIXED_DT)
    expect(state.courseFinished).toBe(false)
    expect(state.distance).toBe(deepest)
    const beforeFinish = state.courseTime
    const remaining = COURSE_FINISH - state.y
    command(state, 'down')
    state.speed = NORMAL_CAP
    const events = advance(state, 0.05)
    expect(state.courseFinished).toBe(true)
    expect(events.filter(event => event === 'course-finish').length).toBe(1)
    expect(state.courseTime - beforeFinish).toBeCloseTo(remaining / NORMAL_CAP, 8)
    const finishedTime = state.courseTime
    advance(state, 0.1)
    expect(state.courseTime).toBe(finishedTime)
  })

  test('freestyle has no gate penalties and preserves landed style through finishing', () => {
    const state = startRun('freestyle')
    state.style = 450
    clearSlope(state)
    state.y = COURSE_FINISH - 0.5
    state.direction = 3
    state.speed = NORMAL_CAP
    stepGame(state, FIXED_DT)
    expect(state.courseFinished).toBe(true)
    expect(state.penalties).toBe(0)
    expect(state.gateIndex).toBe(0)
    expect(state.style).toBe(450)
  })
})

describe('the Abominable Cabald', () => {
  test('free-ski downhill trigger is inclusive at 2,000m, not just below', () => {
    const state = openSlope()
    state.y = 1999.999
    advance(state, FIXED_DT)
    expect(state.monsters[0].active).toBe(false)
    state.y = 2000
    advance(state, FIXED_DT)
    expect(state.monsters[0].active).toBe(true)
    expect(state.monsters[0].phase).toBe('chase')
    expect(state.events).toContain('roar')
    expect(state.distance).toBe(2000)
    expect(state.monsters[1].active).toBe(false)
    advance(state, FIXED_DT)
    expect(state.events).not.toContain('roar')
  })

  for (const side of [-1, 1]) {
    test(`lateral ${side < 0 ? 'left' : 'right'} trigger is strictly beyond 1,500m`, () => {
      const state = openSlope()
      state.x = side * 1500
      advance(state, FIXED_DT)
      expect(state.monsters[0].active).toBe(false)
      state.x = side * 1500.001
      advance(state, FIXED_DT)
      expect(state.monsters[0].active).toBe(true)
      expect(state.events).toContain('roar')
    })
  }

  test('uphill trigger is strictly above -1,500m', () => {
    const state = openSlope()
    state.y = -1500
    advance(state, FIXED_DT)
    expect(state.monsters[0].active).toBe(false)
    state.y = -1500.001
    advance(state, FIXED_DT)
    expect(state.monsters[0].active).toBe(true)
  })

  test('every started course triggers at 1,400m even if its finish banner was missed', () => {
    for (const course of ['slalom', 'tree', 'freestyle'] as Course[]) {
      for (const finish of [false, true]) {
        const state = startRun(course)
        clearSlope(state)
        if (!finish) state.x = 600
        state.y = COURSE_FINISH - 0.5
        state.speed = NORMAL_CAP
        stepGame(state, FIXED_DT)
        expect(state.courseFinished).toBe(finish)
        command(state, 'horizontal-right')
        state.y = 1399.999
        advance(state, FIXED_DT)
        expect(state.monsters[0].active).toBe(false)
        state.y = 1400
        advance(state, FIXED_DT)
        expect(state.monsters[0].active).toBe(true)
        expect(state.events).toContain('roar')
      }
    }
  })

  test('a selected but unstarted course does not shorten the free-ski monster threshold', () => {
    const state = openSlope('tree')
    state.y = 1400
    advance(state, FIXED_DT)
    expect(state.courseStarted).toBe(false)
    expect(state.monsters[0].active).toBe(false)
  })

  test('the second monster triggers at 3,000m and never replaces the first', () => {
    const state = openSlope()
    state.y = 2999.999
    advance(state, FIXED_DT)
    expect(state.monsters[0].active).toBe(true)
    expect(state.monsters[1].active).toBe(false)
    const first = state.monsters[0]
    state.y = 3000
    advance(state, FIXED_DT)
    expect(state.monsters[1].active).toBe(true)
    expect(state.monsters[0]).toBe(first)
    expect(state.events).toContain('roar')
  })

  test('the first monster retains its original uphill spawn gap', () => {
    const state = openSlope()
    state.y = 2000
    const distance = Math.hypot(80, 150)
    const travel = MONSTER_SPEED * FIXED_DT
    advance(state, FIXED_DT)
    expect(state.monsters[0].x).toBeCloseTo(state.x - 80 + 80 / distance * travel, 8)
    expect(state.monsters[0].y).toBeCloseTo(state.y - 150 + 150 / distance * travel, 8)
  })

  test('the second monster spawns 260m downhill and 120m opposite the first, then charges uphill', () => {
    for (const firstSide of [-1, 1]) {
      const state = openSlope()
      state.y = 2000
      advance(state, FIXED_DT)
      state.y = 3000
      const first = state.monsters[0]
      first.x = state.x + firstSide * 400
      first.y = state.y - 500
      const second = state.monsters[1]
      const offset = -firstSide * 120
      const distance = Math.hypot(offset, 260)
      const travel = MONSTER_SPEED * FIXED_DT
      advance(state, FIXED_DT)
      expect(state.monsters[0]).toBe(first)
      expect(second.active).toBe(true)
      expect(second.phase).toBe('chase')
      expect(second.x).toBeCloseTo(state.x + offset - offset / distance * travel, 8)
      expect(second.y).toBeCloseTo(state.y + 260 - 260 / distance * travel, 8)
      expect(second.y).toBeGreaterThan(state.y)
      const y = second.y
      advance(state, FIXED_DT)
      expect(second.y).toBeLessThan(y)
      expect(state.events).not.toContain('roar')
    }
  })

  test('a pursuing monster moves at the declared speed directly toward the skier', () => {
    const state = openSlope()
    const monster = state.monsters[0]
    monster.active = true
    monster.x = state.x - 300
    monster.y = state.y - 400
    const before = Math.hypot(state.x - monster.x, state.y - monster.y)
    advance(state, FIXED_DT)
    const after = Math.hypot(state.x - monster.x, state.y - monster.y)
    expect(before - after).toBeCloseTo(MONSTER_SPEED * FIXED_DT, 8)
  })

  test('normal top speed is caught through grab, chew, burp, walking away and game over', () => {
    const state = openSlope()
    state.y = 2000
    command(state, 'down')
    state.speed = NORMAL_CAP
    advance(state, FIXED_DT)
    const events: GameEvent[] = []
    const phases = new Set<string>()
    for (let i = 0; i < 1200 && !state.gameOver; i++) {
      phases.add(state.monsters[0].phase)
      events.push(...advance(state, FIXED_DT))
    }
    expect([...phases]).toEqual(['chase', 'grab', 'chew', 'burp', 'away'])
    expect(events.filter(event => event === 'gobble').length).toBe(1)
    expect(events.filter(event => event === 'burp').length).toBe(1)
    expect(events.filter(event => event === 'game-over').length).toBe(1)
    expect(state.gameOver).toBe(true)
    expect(state.speed).toBe(0)
    const x = state.x
    const y = state.y
    const time = state.time
    command(state, 'down')
    command(state, 'fast')
    advance(state, 1)
    expect(state.x).toBe(x)
    expect(state.y).toBe(y)
    expect(state.time).toBe(time)
  })

  test('eating cannot be evaded by steering, jumping, or changing direction', () => {
    const state = openSlope()
    const monster = state.monsters[0]
    monster.active = true
    monster.x = state.x
    monster.y = state.y
    command(state, 'jump')
    advance(state, FIXED_DT)
    expect(monster.phase).toBe('grab')
    expect(state.air).toBe(0)
    const direction = state.direction
    command(state, 'left')
    command(state, 'down')
    command(state, 'jump')
    steer(state, -100, 0)
    expect(state.direction).toBe(direction)
    expect(state.air).toBe(0)
    expect(state.speed).toBe(0)
    const x = state.x
    const y = state.y
    advance(state, 1)
    expect(state.x).toBe(x)
    expect(state.y).toBe(y)
  })

  test('fast skiing opens the first pursuit gap before the downhill ambush', () => {
    const state = openSlope()
    state.y = 2000
    command(state, 'down')
    command(state, 'fast')
    state.speed = FAST_CAP
    advance(state, FIXED_DT)
    const monster = state.monsters[0]
    const initialGap = Math.hypot(state.x - monster.x, state.y - monster.y)
    advance(state, 4)
    const finalGap = Math.hypot(state.x - monster.x, state.y - monster.y)
    expect(finalGap).toBeGreaterThan(initialGap)
    expect(state.monsters[1].active).toBe(false)
    expect(state.monsters[0].phase).toBe('chase')
    expect(state.gameOver).toBe(false)
  })

  test('fast mode does not save a skier who steers head-on into the second monster', () => {
    const state = openSlope()
    state.y = 2000
    command(state, 'down')
    command(state, 'fast')
    state.speed = FAST_CAP
    advance(state, 5.55)
    expect(state.monsters[1].active).toBe(false)
    advance(state, FIXED_DT)
    const monster = state.monsters[1]
    expect(monster.active).toBe(true)
    expect(monster.x).toBeGreaterThan(state.x)
    expect(monster.y).toBeGreaterThan(state.y)
    command(state, 'diagonal-right')
    state.speed = FAST_CAP * 0.72
    const events = advance(state, 3)
    expect(state.fast).toBe(true)
    expect(monster.phase).not.toBe('chase')
    expect(state.monsters[0].phase).toBe('chase')
    expect(events.filter(event => event === 'gobble').length).toBe(1)
    expect(state.speed).toBe(0)
  })

  test('steering away from the downhill second monster lets fast skiing escape the encounter', () => {
    const state = openSlope()
    state.y = 2000
    command(state, 'down')
    command(state, 'fast')
    state.speed = FAST_CAP
    advance(state, 5.55)
    advance(state, FIXED_DT)
    expect(state.monsters[1].active).toBe(true)
    expect(state.monsters[1].x).toBeGreaterThan(state.x)
    command(state, 'diagonal-left')
    const events = advance(state, 3)
    command(state, 'down')
    events.push(...advance(state, 6))
    expect(state.y).toBeGreaterThan(4000)
    expect(state.monsters[1].y).toBeLessThan(state.y)
    expect(state.monsters[0].phase).toBe('chase')
    expect(state.monsters[1].phase).toBe('chase')
    expect(state.speed).toBe(FAST_CAP)
    expect(events).not.toContain('gobble')
    expect(state.gameOver).toBe(false)
  })

  test('consumption freezes position and distance through walk-away and game over, with no second eater takeover', () => {
    const state = openSlope()
    command(state, 'down')
    state.speed = NORMAL_CAP
    for (const monster of state.monsters) {
      monster.active = true
      monster.x = state.x
      monster.y = state.y
    }
    advance(state, FIXED_DT)
    expect(state.monsters[0].phase).toBe('grab')
    expect(state.monsters[1].phase).toBe('chase')
    const x = state.x
    const y = state.y
    const distance = state.distance
    const direction = state.direction
    const events = [...state.events]
    const phases = new Set<string>()
    for (let frame = 0; frame < 300 && !state.gameOver; frame++) {
      phases.add(state.monsters[0].phase)
      command(state, 'down')
      command(state, 'left')
      command(state, 'jump')
      command(state, 'fast')
      steer(state, -100, 0)
      events.push(...advance(state, FIXED_DT))
      expect(state.x).toBe(x)
      expect(state.y).toBe(y)
      expect(state.distance).toBe(distance)
      expect(state.direction).toBe(direction)
      expect(state.speed).toBe(0)
      expect(state.air).toBe(0)
      expect(state.fast).toBe(false)
      expect(state.monsters[1].phase).toBe('chase')
    }
    expect([...phases]).toEqual(['grab', 'chew', 'burp', 'away'])
    expect(state.gameOver).toBe(true)
    expect(events.filter(event => event === 'gobble').length).toBe(1)
    expect(events.filter(event => event === 'burp').length).toBe(1)
    expect(events.filter(event => event === 'game-over').length).toBe(1)
    advance(state, 1)
    expect(state.x).toBe(x)
    expect(state.y).toBe(y)
    expect(state.distance).toBe(distance)
  })

  test('two nearby monsters cannot start overlapping eating sequences', () => {
    const state = openSlope()
    for (const monster of state.monsters) {
      monster.active = true
      monster.x = state.x
      monster.y = state.y
    }
    advance(state, FIXED_DT)
    expect(state.monsters.filter(monster => monster.phase === 'grab').length).toBe(1)
    const events = advance(state, 4)
    expect(events.filter(event => event === 'burp').length).toBe(1)
    expect(events.filter(event => event === 'game-over').length).toBe(1)
  })
})

describe('pooled events, tracks and deterministic replay', () => {
  test('command sounds survive step reset exactly once, and the event array is reused', () => {
    const state = openSlope()
    const events = state.events
    command(state, 'fast')
    command(state, 'jump')
    state.events.push('crash')
    stepGame(state, FIXED_DT)
    expect(state.events).toBe(events)
    expect(state.events).toContain('fast')
    expect(state.events).toContain('jump')
    expect(state.events).not.toContain('crash')
    stepGame(state, FIXED_DT)
    expect(state.events).toBe(events)
    expect(state.events.length).toBe(0)
  })

  test('zero-time event flush publishes queued walking crashes without advancing the simulation', () => {
    const state = openSlope()
    obstacle(state, 'rock', { x: state.x + 6 })
    command(state, 'right')
    expect(state.crash).toBe(CRASH_DURATION)
    stepGame(state, 0)
    expect(state.events).toContain('crash')
    expect(state.time).toBe(0)
    expect(state.crash).toBe(CRASH_DURATION)
    stepGame(state, 0)
    expect(state.events.length).toBe(0)
  })

  test('tracks record packed x,y,time triples only while grounded and moving', () => {
    const state = openSlope()
    const tracks = state.tracks
    expect(tracks.length).toBe(TRACK_CAPACITY * 3)
    expect(tracks[2]).toBe(-1)
    advance(state, FIXED_DT)
    expect(state.trackIndex).toBe(0)
    command(state, 'down')
    advance(state, FIXED_DT)
    expect(state.trackIndex).toBe(3)
    expect(tracks[0]).toBeCloseTo(state.x, 4)
    expect(tracks[1]).toBeCloseTo(state.y, 4)
    expect(tracks[2]).toBeCloseTo(state.time, 6)
    command(state, 'jump')
    advance(state, 0.1)
    expect(state.trackIndex).toBe(3)
    expect(state.tracks).toBe(tracks)
  })

  test('track ring wraps with a fixed typed buffer and never grows', () => {
    const state = openSlope()
    const tracks = state.tracks
    command(state, 'down')
    for (let i = 0; i < TRACK_CAPACITY + 3; i++) {
      state.x = 600
      state.y = 0
      state.speed = NORMAL_CAP
      advance(state, FIXED_DT)
    }
    expect(state.trackIndex).toBe(9)
    expect(state.tracks).toBe(tracks)
    expect(state.tracks.length).toBe(TRACK_CAPACITY * 3)
    expect(state.tracks[8]).toBeCloseTo(state.time, 4)
  })

  test('the same seed and input timeline replay all public state deterministically', () => {
    const a = createGame(4490)
    const b = createGame(4490)
    for (let frame = 0; frame < 900; frame++) {
      if (frame === 0 || frame === 320) { command(a, 'down'); command(b, 'down') }
      if (frame === 40 || frame === 180) { command(a, 'left'); command(b, 'left') }
      if (frame === 80 || frame === 200) { command(a, 'right'); command(b, 'right') }
      if (frame === 100 || frame === 380) { command(a, 'jump'); command(b, 'jump') }
      if (frame === 105 || frame === 385) { command(a, 'left'); command(b, 'left') }
      if (frame === 250) { command(a, 'fast'); command(b, 'fast') }
      stepGame(a, FIXED_DT)
      stepGame(b, FIXED_DT)
    }
    expect(a).toEqual(b)
    expect(a.objects).not.toBe(b.objects)
    expect(a.tracks).not.toBe(b.tracks)
    expect(a.monsters[0]).not.toBe(b.monsters[0])
  })
})
