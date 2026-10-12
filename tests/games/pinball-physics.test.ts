import { describe, expect, test } from 'bun:test'
import {
  ARCH, ARCS, BALL_RADIUS, CIRCLES, EventType, FLIPPERS, KICKER_HOLD, LANE_WALL_TOP, LAUNCH, LEFT_WALL,
  RAMP, RIGHT_WALL, SEGMENTS, SENSORS, SLINGS, TABLE_HEIGHT, slotOf
} from '../../src/games/pinball/geometry'
import {
  advanceDrag, applyFlipperInput, createPhysics, dragBall, GRAVITY, launchBall, MAX_BALL_SPEED, nudgePhysics, PHYSICS_STEP,
  resetBall, stepPhysics, sweepArc, sweepCircle, sweepSegment,
  type Collision, type Physics
} from '../../src/games/pinball/physics'

function collision(duration = 1): Collision {
  return { time: duration, normalX: 0, normalY: 0, penetration: 0 }
}

function place(p: Physics, x: number, y: number, vx = 0, vy = 0, layer = 0) {
  resetBall(p)
  p.ball.active = true
  p.ball.x = x
  p.ball.y = y
  p.ball.vx = vx
  p.ball.vy = vy
  p.ball.layer = layer
}

function events(p: Physics, event: number, index?: number) {
  let count = 0
  for (let i = 0; i < p.eventCount; i++) {
    if (p.contacts[i * 2] === event && (index === undefined || p.contacts[i * 2 + 1] === index)) count++
  }
  return count
}

function segmentDistance(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - ax - dx * t, y - ay - dy * t)
}

describe('continuous collision primitives', () => {
  test('segment faces stop a 2000 px/s sweep from either side', () => {
    const hit = collision()
    sweepSegment(hit, 0, 50, 2000, 0, 100, 0, 100, 100, BALL_RADIUS)
    expect(hit.time).toBeCloseTo((100 - BALL_RADIUS) / 2000, 12)
    expect(hit.normalX).toBeCloseTo(-1, 12)
    const reverse = collision()
    sweepSegment(reverse, 200, 50, -2000, 0, 100, 0, 100, 100, BALL_RADIUS)
    expect(reverse.time).toBeCloseTo(hit.time, 12)
    expect(reverse.normalX).toBeCloseTo(1, 12)
  })

  test('rounded segment endpoints and degenerate segments are swept', () => {
    const end = collision()
    sweepSegment(end, 0, -5, 2000, 0, 100, 0, 100, 100, BALL_RADIUS)
    expect(end.time).toBeCloseTo((100 - Math.sqrt(BALL_RADIUS ** 2 - 25)) / 2000, 12)
    expect(end.normalY).toBeCloseTo(-5 / BALL_RADIUS, 12)
    const point = collision()
    sweepSegment(point, 0, 0, 2000, 0, 100, 0, 100, 0, BALL_RADIUS)
    expect(point.time).toBeCloseTo((100 - BALL_RADIUS) / 2000, 12)
  })

  test('parallel near misses do not collide and overlap returns separation depth', () => {
    const miss = collision()
    sweepSegment(miss, 50, -8, 2000, 0, 0, 0, 100, 0, BALL_RADIUS)
    expect(miss.time).toBe(1)
    const overlap = collision()
    sweepSegment(overlap, 50, -4, 0, 100, 0, 0, 100, 0, BALL_RADIUS)
    expect(overlap.time).toBe(0)
    expect(overlap.penetration).toBeCloseTo(3.5)
    expect(overlap.normalY).toBe(-1)
  })

  test('zero-time separating and tangential contacts are ignored unless penetration needs correction', () => {
    const separating = collision(PHYSICS_STEP)
    sweepSegment(separating, 50, -BALL_RADIUS, 20, -10, 0, 0, 100, 0, BALL_RADIUS)
    expect(separating.time).toBe(PHYSICS_STEP)
    const tangent = collision(PHYSICS_STEP)
    sweepSegment(tangent, 50, -BALL_RADIUS, 20, 0, 0, 0, 100, 0, BALL_RADIUS)
    expect(tangent.time).toBe(PHYSICS_STEP)
    const overlapping = collision(PHYSICS_STEP)
    sweepSegment(overlapping, 50, -4, 20, -10, 0, 0, 100, 0, BALL_RADIUS)
    expect(overlapping.time).toBe(0)
    expect(overlapping.penetration).toBeCloseTo(3.5)
    const circleTangent = collision(PHYSICS_STEP)
    sweepCircle(circleTangent, -20, 0, 0, 2000, 0, 0, 20)
    expect(circleTangent.time).toBe(PHYSICS_STEP)
  })

  test('circle detects maximum speed contact and ignores motion away', () => {
    const hit = collision()
    sweepCircle(hit, 0, 0, 2000, 0, 100, 0, 20)
    expect(hit.time).toBeCloseTo(0.04, 12)
    expect(hit.normalX).toBe(-1)
    const miss = collision()
    sweepCircle(miss, 0, 0, -2000, 0, 100, 0, 20)
    expect(miss.time).toBe(1)
  })

  test('arc detects inner and outer faces and handles angle wrap', () => {
    const inner = collision()
    sweepArc(inner, 0, 0, 0, -2000, 0, 0, 100, Math.PI, Math.PI * 2, BALL_RADIUS)
    expect(inner.time).toBeCloseTo((100 - BALL_RADIUS) / 2000, 12)
    expect(inner.normalY).toBeCloseTo(1, 12)
    const outer = collision()
    sweepArc(outer, 0, -200, 0, 2000, 0, 0, 100, Math.PI, Math.PI * 2, BALL_RADIUS)
    expect(outer.time).toBeCloseTo((100 - BALL_RADIUS) / 2000, 12)
    expect(outer.normalY).toBeCloseTo(-1, 12)
    const wrapped = collision()
    sweepArc(wrapped, 200, 0, -2000, 0, 0, 0, 100, Math.PI * 1.75, Math.PI * 0.25, BALL_RADIUS)
    expect(wrapped.time).toBeCloseTo((100 - BALL_RADIUS) / 2000, 12)
  })

  test('arc end caps collide but the open angular interval stays open', () => {
    const cap = collision()
    sweepArc(cap, -200, 5, 2000, 0, 0, 0, 100, Math.PI, Math.PI * 1.5, BALL_RADIUS)
    expect(cap.time).toBeCloseTo((100 - Math.sqrt(BALL_RADIUS ** 2 - 25)) / 2000, 12)
    const open = collision()
    sweepArc(open, 0, 200, 0, -2000, 0, 0, 100, 0, Math.PI / 2, BALL_RADIUS)
    // It hits the bottom endpoint, not an invented full-circle wall.
    expect(open.time).toBeCloseTo((100 - BALL_RADIUS) / 2000, 12)
    const absent = collision(0.08)
    sweepArc(absent, -200, -100, 2000, 0, 0, 0, 100, 0, Math.PI / 2, BALL_RADIUS)
    expect(absent.time).toBe(0.08)
  })
})

describe('pooled deterministic table simulation', () => {
  test('new and reset balls wait inactive in the plunger lane', () => {
    const p = createPhysics()
    expect(p.ball.active).toBe(false)
    expect(p.ball.x).toBe(LAUNCH.x)
    expect(p.ball.y).toBe(LAUNCH.y)
    launchBall(p, 1)
    expect(p.ball.vy).toBe(-MAX_BALL_SPEED)
    stepPhysics(p, 0.1, false, false)
    const time = p.time
    const contacts = p.contacts
    const ball = p.ball
    resetBall(p)
    expect(p.ball).toBe(ball)
    expect(p.contacts).toBe(contacts)
    expect(p.time).toBe(time)
    expect(p.ball).toEqual({ x: LAUNCH.x, y: LAUNCH.y, vx: 0, vy: 0, radius: BALL_RADIUS, height: 0, layer: 0, active: false })
  })

  test('launch is proportional, clamped, and cannot teleport an active ball', () => {
    const weak = createPhysics()
    const full = createPhysics()
    launchBall(weak, -1)
    launchBall(full, 2)
    expect(weak.ball.vy).toBe(-750)
    expect(full.ball.vy).toBe(-2000)
    stepPhysics(full, 0.05, false, false)
    const y = full.ball.y
    launchBall(full, 0)
    expect(full.ball.y).toBe(y)
  })

  test('weak plunger shots return to the shooter floor without draining or charging a ball', () => {
    const p = createPhysics()
    launchBall(p, 0.08)
    stepPhysics(p, 3, false, false)
    expect(events(p, EventType.Drain)).toBe(0)
    expect(p.reseated).toBe(true)
    expect(p.ball.active).toBe(false)
    expect(p.ball.x).toBe(LAUNCH.x)
    expect(p.ball.y).toBe(LAUNCH.y)
    launchBall(p, 1)
    expect(p.reseated).toBe(false)
    expect(p.ball.active).toBe(true)
    expect(p.ball.vy).toBe(-MAX_BALL_SPEED)
  })

  test('a tilted ball skips the shooter floor and drains instead of re-seating', () => {
    const p = createPhysics()
    place(p, LAUNCH.x, LAUNCH.y, 0, 300)
    p.tilted = true
    stepPhysics(p, 0.2, false, false)
    expect(p.reseated).toBe(false)
    expect(p.ball.active).toBe(false)
    expect(events(p, EventType.Drain)).toBe(1)
  })

  test('input preview responds immediately without advancing actual angles, ball, clock or pending events', () => {
    const p = createPhysics()
    const ball = { ...p.ball }
    p.contacts[0] = EventType.Spot
    p.contacts[1] = 1
    p.eventCount = 1
    applyFlipperInput(p, true, true)
    expect(p.leftAngle).toBe(FLIPPERS[0].rest)
    expect(p.rightAngle).toBe(FLIPPERS[1].rest)
    expect(p.visualLeftAngle).toBeCloseTo(FLIPPERS[0].rest - 30 * PHYSICS_STEP, 12)
    expect(p.visualRightAngle).toBeCloseTo(FLIPPERS[1].rest + 30 * PHYSICS_STEP, 12)
    expect(p.ball).toEqual(ball)
    expect(p.time).toBe(0)
    expect(events(p, EventType.Spot, 1)).toBe(1)
    const preview = p.visualLeftAngle
    applyFlipperInput(p, true, true)
    expect(p.visualLeftAngle).toBe(preview)
    p.eventCount = 0
    stepPhysics(p, PHYSICS_STEP, true, true)
    expect(p.leftAngle).toBe(preview)
    expect(p.visualLeftAngle).toBe(p.leftAngle)
    expect(p.visualRightAngle).toBe(p.rightAngle)
  })

  test('test drag sweeps every spot, engine and hazard target without wall response', () => {
    for (let index = 0; index < 3; index++) {
      for (const event of [EventType.Spot, EventType.Engine, EventType.LeftHazard, EventType.RightHazard, EventType.Drop]) {
        const p = createPhysics()
        const target = SEGMENTS.find(s => s.event === event && s.index === index)!
        const x = (target.ax + target.bx) / 2
        const y = (target.ay + target.by) / 2
        const length = Math.hypot(target.bx - target.ax, target.by - target.ay)
        const nx = (target.by - target.ay) / length
        const ny = -(target.bx - target.ax) / length
        place(p, x + nx * 25, y + ny * 25, 500, 500)
        dragBall(p, x - nx * 25, y - ny * 25)
        expect(events(p, event, index)).toBe(1)
        expect(p.ball.x).toBeCloseTo(x - nx * 25, 10)
        expect(p.ball.y).toBeCloseTo(y - ny * 25, 10)
        expect(p.ball.vx).toBe(0)
        expect(p.ball.vy).toBe(0)
        expect(p.capturedBy).toBe(-1)
        expect(p.time).toBe(0)
      }
    }
  })

  test('fast target-bank drag emits contacts in travel order and appends across pointer moves', () => {
    for (const down of [true, false]) {
      const p = createPhysics()
      place(p, 42, down ? 150 : 225)
      dragBall(p, 42, down ? 225 : 150)
      const indices: number[] = []
      for (let i = 0; i < p.eventCount; i++) if (p.contacts[i * 2] === EventType.Spot) indices.push(p.contacts[i * 2 + 1])
      expect(indices).toEqual(down ? [0, 1, 2] : [2, 1, 0])
      const count = p.eventCount
      dragBall(p, 70, p.ball.y)
      expect(p.eventCount).toBeGreaterThanOrEqual(count)
      expect(events(p, EventType.Spot)).toBe(3)
    }
  })

  test('dragged bumpers can repeatedly score by leaving and re-entering, without applying impulse', () => {
    const p = createPhysics()
    const c = CIRCLES.find(c => c.event === EventType.Bumper && c.index === 0)!
    place(p, c.x - 30, c.y)
    dragBall(p, c.x, c.y)
    expect(events(p, EventType.Bumper, 0)).toBe(1)
    dragBall(p, c.x + 1, c.y)
    expect(events(p, EventType.Bumper, 0)).toBe(1)
    dragBall(p, c.x - 30, c.y)
    advanceDrag(p, 0.13, false, false)
    dragBall(p, c.x, c.y)
    expect(events(p, EventType.Bumper, 0)).toBe(2)
    for (let hit = 2; hit < 8; hit++) {
      dragBall(p, c.x - 30, c.y)
      advanceDrag(p, 0.13, false, false)
      dragBall(p, c.x, c.y)
    }
    expect(events(p, EventType.Bumper, 0)).toBe(8)
    expect(p.ball.x).toBe(c.x)
    expect(p.ball.y).toBe(c.y)
    expect(p.ball.vx).toBe(0)
    expect(p.ball.vy).toBe(0)
  })

  test('three dragged drop banks count nine targets after each completed bank is reset', () => {
    const p = createPhysics()
    place(p, 140, 270)
    for (let bank = 0; bank < 3; bank++) {
      p.dropTargets = 0
      dragBall(p, 140, 250)
      dragBall(p, 200, 250)
      expect(p.dropTargets).toBe(7)
      dragBall(p, 220, 270)
      dragBall(p, 140, 270)
      advanceDrag(p, 0.13, false, false)
    }
    expect(events(p, EventType.Drop)).toBe(9)
    for (let index = 0; index < 3; index++) expect(events(p, EventType.Drop, index)).toBe(3)
  })

  test('seventy-five held-drag flag passes count seventy-five completed spinner revolutions', () => {
    const p = createPhysics()
    place(p, 325, 220)
    for (let spin = 0; spin < 75; spin++) {
      dragBall(p, 325, 240)
      dragBall(p, 325, 220)
      advanceDrag(p, 0.13, false, false)
    }
    expect(events(p, EventType.Spinner)).toBe(75)
    expect(p.spinnerAngle).toBeCloseTo(75 * Math.PI * 2, 8)
    expect(p.capturedBy).toBe(-1)
    expect(p.ball.vx).toBe(0)
    expect(p.ball.vy).toBe(0)
  })

  test('all kickout and wormhole drag crossings score but never capture or eject the held ball', () => {
    for (const s of SENSORS) {
      if (s.kind !== 'kicker') continue
      const p = createPhysics()
      place(p, Math.max(BALL_RADIUS, s.x - 30), s.y)
      p.capturedBy = SENSORS.indexOf(s)
      p.releaseAt = Infinity
      dragBall(p, s.x + 30, s.y)
      expect(events(p, s.event, s.index)).toBe(1)
      expect(p.capturedBy).toBe(-1)
      expect(p.releaseAt).toBe(0)
      expect(p.ball.x).toBe(s.x + 30)
      expect(p.ball.y).toBe(s.y)
      expect(p.ball.vx).toBe(0)
      expect(p.ball.vy).toBe(0)
    }
  })

  test('dragged ramp mouth, apex and descending exit switch layers in swept travel order', () => {
    const p = createPhysics()
    place(p, RAMP.upX, RAMP.bottom + 20)
    dragBall(p, RAMP.upX, RAMP.turn.y - 20)
    expect(p.ball.layer).toBe(1)
    expect(p.ball.height).toBe(1)
    expect(events(p, EventType.Ramp)).toBe(1)
    p.eventCount = 0
    dragBall(p, RAMP.downX, RAMP.exitY + 20)
    expect(p.ball.layer).toBe(0)
    expect(p.ball.height).toBe(0)
  })

  test('incremental 2, 5, 10 and 40 px pointer drags enter the physical ramp mouth and score its apex', () => {
    for (const increment of [2, 5, 10, 40]) {
      const p = createPhysics()
      place(p, RAMP.upX, 300)
      let y = 300
      while (y > RAMP.turn.y - 20) {
        y = Math.max(RAMP.turn.y - 20, y - increment)
        dragBall(p, RAMP.upX, y)
        expect(p.ball.layer).toBe(y > RAMP.bottom ? 0 : 1)
      }
      expect(p.ball.height).toBe(1)
      expect(events(p, EventType.Ramp, 0)).toBe(1)
    }
  })

  test('leaving the raised ramp during the same drag immediately enables ground target hits', () => {
    const p = createPhysics()
    place(p, RAMP.upX, RAMP.bottom + 20)
    dragBall(p, RAMP.upX, RAMP.bottom - 6)
    expect(p.ball.layer).toBe(1)
    p.eventCount = 0
    dragBall(p, 42, 167)
    expect(p.ball.layer).toBe(0)
    expect(p.ball.height).toBe(0)
    expect(events(p, EventType.Spot, 0)).toBe(1)
    dragBall(p, 70, 189)
    dragBall(p, 42, 189)
    expect(events(p, EventType.Spot, 1)).toBe(1)
  })

  test('proper raised-ramp mouth, curved apex and down-lane remain raised until the exit', () => {
    const p = createPhysics()
    place(p, RAMP.upX, RAMP.bottom + 20)
    dragBall(p, RAMP.upX, RAMP.turn.y)
    expect(p.ball.layer).toBe(1)
    dragBall(p, RAMP.upX, RAMP.turn.y - 20)
    expect(p.ball.layer).toBe(1)
    dragBall(p, RAMP.turn.x, RAMP.turn.y - 20)
    expect(p.ball.layer).toBe(1)
    expect(events(p, EventType.Ramp)).toBe(1)
    dragBall(p, RAMP.downX, RAMP.turn.y)
    expect(p.ball.layer).toBe(1)
    dragBall(p, RAMP.downX, RAMP.exitY + 20)
    expect(p.ball.layer).toBe(0)
    expect(p.ball.height).toBe(0)
  })

  test('test drag clock uses fixed ticks and preserves ball position and the pending event queue', () => {
    const p = createPhysics()
    place(p, 70, 167)
    dragBall(p, 42, 167)
    const ball = { ...p.ball }
    const count = p.eventCount
    const contactPool = p.contacts
    const sweepPool = p.dragTimes
    const insidePool = p.dragInside
    advanceDrag(p, PHYSICS_STEP / 2, true, false)
    expect(p.time).toBe(0)
    advanceDrag(p, PHYSICS_STEP / 2, true, false)
    expect(p.time).toBe(PHYSICS_STEP)
    expect(p.ball).toEqual(ball)
    expect(p.eventCount).toBe(count)
    expect(events(p, EventType.Spot, 0)).toBe(1)
    expect(p.leftAngle).toBeCloseTo(FLIPPERS[0].rest - 30 * PHYSICS_STEP, 12)
    advanceDrag(p, 8, true, false)
    expect(p.ball).toEqual(ball)
    expect(p.searchCount).toBe(0)
    expect(p.eventCount).toBe(count)
    expect(p.contacts).toBe(contactPool)
    expect(p.dragTimes).toBe(sweepPool)
    expect(p.dragInside).toBe(insidePool)
  })

  test('test drag remains radius-bounded and never triggers the decorative drain circle', () => {
    const p = createPhysics()
    place(p, 175, 220)
    dragBall(p, -100, 1000)
    expect(p.ball.x).toBe(BALL_RADIUS)
    expect(p.ball.y).toBe(TABLE_HEIGHT - BALL_RADIUS)
    expect(p.ball.active).toBe(true)
    expect(events(p, EventType.Drain)).toBe(0)
  })

  test('arbitrary caller frame sizes produce the same fixed ticks and ball trajectory', () => {
    const a = createPhysics()
    const b = createPhysics()
    launchBall(a, 1)
    launchBall(b, 1)
    for (let i = 0; i < 120; i++) stepPhysics(a, 1 / 60, true, false)
    for (let i = 0; i < 480; i++) stepPhysics(b, PHYSICS_STEP * 2, true, false)
    expect(a.ball).toEqual(b.ball)
    expect(a.leftAngle).toBe(b.leftAngle)
    expect(a.time).toBe(b.time)
    expect(a.spinnerAngle).toBe(b.spinnerAngle)
    expect(a.dropTargets).toBe(b.dropTargets)
    expect(a.searchCount).toBe(b.searchCount)
  })

  test('fractional dt accumulates, invalid dt is ignored, and idle balls do not fall', () => {
    const p = createPhysics()
    stepPhysics(p, PHYSICS_STEP / 2, true, false)
    expect(p.time).toBe(0)
    stepPhysics(p, PHYSICS_STEP / 2, true, false)
    expect(p.time).toBe(PHYSICS_STEP)
    expect(p.ball.y).toBe(LAUNCH.y)
    const time = p.time
    for (const dt of [0, -1, NaN, Infinity]) stepPhysics(p, dt, false, false)
    expect(p.time).toBe(time)
  })

  test('free rolling uses slope gravity and caps nudges at 2000 px/s', () => {
    const p = createPhysics()
    place(p, 175, 220)
    stepPhysics(p, PHYSICS_STEP, false, false)
    expect(p.ball.vy).toBeCloseTo(GRAVITY * PHYSICS_STEP * (1 - 0.08 * PHYSICS_STEP), 10)
    nudgePhysics(p, 5000, -5000)
    expect(Math.hypot(p.ball.vx, p.ball.vy)).toBeCloseTo(MAX_BALL_SPEED, 10)
    p.tilted = true
    const vx = p.ball.vx
    nudgePhysics(p, 100, 100)
    expect(p.ball.vx).toBe(vx)
  })

  test('segments bounce without tunnelling at maximum speed', () => {
    const p = createPhysics()
    place(p, 24, 220, -MAX_BALL_SPEED, 0)
    stepPhysics(p, 1 / 60, false, false)
    expect(p.ball.x).toBeGreaterThanOrEqual(LEFT_WALL + BALL_RADIUS - 0.001)
    expect(p.ball.vx).toBeGreaterThan(0)
  })

  test('rolling launch guide removes normal impact without damping tangential orbit speed', () => {
    const p = createPhysics()
    const angle = -0.7
    const nx = Math.cos(angle)
    const ny = Math.sin(angle)
    const radius = ARCH.radius - BALL_RADIUS - 0.001
    place(p, ARCH.x + nx * radius, ARCH.y + ny * radius, ny * 1000 + nx * 200, -nx * 1000 + ny * 200)
    stepPhysics(p, PHYSICS_STEP, false, false)
    expect(Math.hypot(p.ball.vx, p.ball.vy)).toBeGreaterThan(995)
    expect(Math.hypot(p.ball.vx, p.ball.vy)).toBeLessThan(1005)
    expect(Math.hypot(p.ball.x - ARCH.x, p.ball.y - ARCH.y)).toBeLessThanOrEqual(ARCH.radius - BALL_RADIUS + 0.001)
  })

  test('bumpers emit indexed contacts and add outward impulse', () => {
    const p = createPhysics()
    const bumper = CIRCLES.find(c => c.event === EventType.Bumper && c.index === 0)!
    place(p, bumper.x - bumper.radius - BALL_RADIUS - 1, bumper.y, 300, 0)
    stepPhysics(p, 1 / 60, false, false)
    expect(events(p, EventType.Bumper, 0)).toBe(1)
    expect(p.ball.vx).toBeLessThan(-450)
    expect(p.hitTime[slotOf(EventType.Bumper, 0)]).toBeGreaterThan(0)
    stepPhysics(p, PHYSICS_STEP, false, false)
    expect(events(p, EventType.Bumper, 0)).toBe(0)
  })

  test('slingshot face produces its impulse and indexed rebound event', () => {
    const p = createPhysics()
    const sling = SEGMENTS.find(s => s.event === EventType.Rebound && s.index === 0)!
    const length = Math.hypot(sling.bx - sling.ax, sling.by - sling.ay)
    const nx = (sling.by - sling.ay) / length
    const ny = -(sling.bx - sling.ax) / length
    // Isolate the sling impulse from the nearby hazard end cap and green kickout hole.
    const x = sling.ax + (sling.bx - sling.ax) * 0.85 + nx * (BALL_RADIUS + 1)
    const y = sling.ay + (sling.by - sling.ay) * 0.85 + ny * (BALL_RADIUS + 1)
    place(p, x, y, -nx * 200, -ny * 200)
    stepPhysics(p, 1 / 60, false, false)
    expect(events(p, EventType.Rebound, 0)).toBe(1)
    expect(p.ball.vx * nx + p.ball.vy * ny).toBeGreaterThan(450)
  })

  test('rollover crossings fire once, not every tick inside the sensor', () => {
    const p = createPhysics()
    place(p, 200, 68)
    stepPhysics(p, PHYSICS_STEP, false, false)
    expect(events(p, EventType.Reentry, 0)).toBe(1)
    stepPhysics(p, PHYSICS_STEP, false, false)
    expect(events(p, EventType.Reentry, 0)).toBe(0)
  })

  test('drop targets disappear individually and can be reset by rules', () => {
    const p = createPhysics()
    place(p, 152, 261, 0, -400)
    stepPhysics(p, 1 / 60, false, false)
    expect(events(p, EventType.Drop, 0)).toBe(1)
    expect(p.dropTargets & 1).toBe(1)
    place(p, 152, 261, 0, -400)
    stepPhysics(p, 1 / 30, false, false)
    expect(events(p, EventType.Drop, 0)).toBe(0)
    expect(p.ball.y).toBeLessThan(250)
    p.dropTargets = 0
    place(p, 152, 261, 0, -400)
    stepPhysics(p, 1 / 60, false, false)
    expect(events(p, EventType.Drop, 0)).toBe(1)
  })

  test('raised centre post and out-lane gates change physical collision', () => {
    const post = createPhysics()
    place(post, 175, 375, 0, 400)
    post.postRaised = true
    stepPhysics(post, 1 / 60, false, false)
    expect(post.ball.vy).toBeLessThan(0)
    const open = createPhysics()
    const closed = createPhysics()
    place(open, 26, 273, 0, 400)
    place(closed, 26, 273, 0, 400)
    closed.gates = 1
    stepPhysics(open, 1 / 30, false, false)
    stepPhysics(closed, 1 / 30, false, false)
    expect(open.ball.y).toBeGreaterThan(closed.ball.y)
    expect(closed.ball.vy).toBeLessThan(0)
  })

  test('flipper angular speeds are 30 up and 15 down and tilt disables them', () => {
    const p = createPhysics()
    stepPhysics(p, PHYSICS_STEP, true, true)
    expect(p.leftAngle).toBeCloseTo(FLIPPERS[0].rest - 30 * PHYSICS_STEP, 12)
    expect(p.rightAngle).toBeCloseTo(FLIPPERS[1].rest + 30 * PHYSICS_STEP, 12)
    stepPhysics(p, PHYSICS_STEP, false, false)
    expect(p.leftAngle).toBeCloseTo(FLIPPERS[0].rest - 15 * PHYSICS_STEP, 12)
    p.tilted = true
    stepPhysics(p, 0.2, true, true)
    expect(p.leftAngle).toBe(FLIPPERS[0].rest)
    expect(p.rightAngle).toBe(FLIPPERS[1].rest)
  })

  test('rising capsule transfers contact-point velocity for a forehand/post-pass', () => {
    const p = createPhysics()
    place(p, 155, 373, 0, 150)
    stepPhysics(p, 4 * PHYSICS_STEP, true, false)
    expect(p.ball.vy).toBeLessThan(-100)
    expect(p.ball.vx).toBeGreaterThan(0)
  })

  test('a late stroke can backhand toward the outside of the table', () => {
    const p = createPhysics()
    place(p, 147, 349, 0, 100)
    p.leftAngle = -0.3
    stepPhysics(p, 4 * PHYSICS_STEP, true, false)
    expect(p.ball.vx).toBeLessThan(0)
    expect(p.ball.vy).toBeLessThan(0)
  })

  test('held flipper supports a ball instead of always shooting it', () => {
    const p = createPhysics()
    const f = FLIPPERS[0]
    p.leftAngle = f.raised
    const qx = f.x + Math.cos(f.raised) * 25
    const qy = f.y + Math.sin(f.raised) * 25
    place(p, qx + Math.sin(f.raised) * (BALL_RADIUS + f.radius), qy - Math.cos(f.raised) * (BALL_RADIUS + f.radius))
    stepPhysics(p, 0.05, true, false)
    expect(p.ball.active).toBe(true)
    expect(Math.hypot(p.ball.vx, p.ball.vy)).toBeLessThan(100)
  })

  test('bumper geometry has no closed three-circle island or sub-diameter Satellite/launch-guide gap', () => {
    const lower = CIRCLES.find(c => c.event === EventType.Bumper && c.index === 2)!
    for (let index = 0; index < 2; index++) {
      const upper = CIRCLES.find(c => c.event === EventType.Bumper && c.index === index)!
      expect(Math.hypot(lower.x - upper.x, lower.y - upper.y) - lower.radius - upper.radius).toBeGreaterThanOrEqual(19)
    }
    const satellite = CIRCLES.find(c => c.event === EventType.Satellite)!
    const guide = ARCS.find(a => a.x === ARCH.x && a.y === ARCH.y && a.radius < ARCH.radius)!
    expect(guide.radius - Math.hypot(satellite.x - guide.x, satellite.y - guide.y) - satellite.radius).toBeGreaterThanOrEqual(19)
  })

  test('held drag inside a solid sling stays put, then release projects to the nearest external face', () => {
    for (const x of [68, 69, 281, 282]) {
      const p = createPhysics()
      place(p, x, 307)
      dragBall(p, x, 307)
      const held = { ...p.ball }
      advanceDrag(p, 0.2, false, false)
      expect(p.ball).toEqual(held)
      stepPhysics(p, PHYSICS_STEP, false, false)
      expect(Math.hypot(p.ball.x - x, p.ball.y - 307)).toBeGreaterThan(14)
      for (const s of SLINGS) {
        const ab = (s.b[0] - s.a[0]) * (p.ball.y - s.a[1]) - (s.b[1] - s.a[1]) * (p.ball.x - s.a[0])
        const bc = (s.c[0] - s.b[0]) * (p.ball.y - s.b[1]) - (s.c[1] - s.b[1]) * (p.ball.x - s.b[0])
        const ca = (s.a[0] - s.c[0]) * (p.ball.y - s.c[1]) - (s.a[1] - s.c[1]) * (p.ball.x - s.c[0])
        expect(ab >= 0 && bc >= 0 && ca >= 0 || ab <= 0 && bc <= 0 && ca <= 0).toBe(false)
      }
    }
  })

  test('reported central, Satellite and plastic birth positions cannot freeze through the final three seconds', () => {
    for (const [x, y] of [[226, 121], [283, 69], [283, 70], [68, 307], [69, 307], [281, 307], [282, 307]]) {
      const p = createPhysics()
      place(p, x, y)
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      for (let tick = 0; tick < 18 * 480 && p.ball.active; tick++) {
        stepPhysics(p, PHYSICS_STEP, false, false)
        if (tick >= 15 * 480 && p.capturedBy < 0) {
          minX = Math.min(minX, p.ball.x)
          maxX = Math.max(maxX, p.ball.x)
          minY = Math.min(minY, p.ball.y)
          maxY = Math.max(maxY, p.ball.y)
        }
      }
      if (p.ball.active && p.capturedBy < 0) expect(Math.hypot(maxX - minX, maxY - minY)).toBeGreaterThan(1)
    }
  }, 30000)

  test('ramp entrance switches collision layer only on an upward shot', () => {
    const p = createPhysics()
    place(p, RAMP.upX, RAMP.bottom - 6, 0, -700)
    stepPhysics(p, PHYSICS_STEP, false, false)
    expect(p.ball.layer).toBe(1)
    expect(p.ball.height).toBe(1)
    const downward = createPhysics()
    place(downward, RAMP.upX, RAMP.bottom - 6, 0, 300)
    stepPhysics(downward, PHYSICS_STEP, false, false)
    expect(downward.ball.layer).toBe(0)
  })

  test('ramp apex scores and descending exit returns to the playfield', () => {
    const p = createPhysics()
    place(p, RAMP.turn.x, RAMP.turn.y - 20, 0, 100, 1)
    stepPhysics(p, PHYSICS_STEP, false, false)
    expect(events(p, EventType.Ramp)).toBe(1)
    place(p, RAMP.downX, RAMP.exitY, 0, 300, 1)
    p.ball.height = 1
    stepPhysics(p, PHYSICS_STEP, false, false)
    expect(p.ball.layer).toBe(0)
    expect(p.ball.height).toBe(0)
    place(p, RAMP.upX, RAMP.bottom + 1, 0, 300, 1)
    stepPhysics(p, PHYSICS_STEP, false, false)
    expect(p.ball.layer).toBe(0)
  })

  test('layer-one rails do not block a ground-layer ball', () => {
    const ground = createPhysics()
    const raised = createPhysics()
    place(ground, 95, 220, -300, 0, 0)
    place(raised, 95, 220, -300, 0, 1)
    stepPhysics(ground, 0.05, false, false)
    stepPhysics(raised, 0.05, false, false)
    expect(ground.ball.x).toBeLessThan(84)
    expect(raised.ball.x).toBeGreaterThanOrEqual(84 + BALL_RADIUS - 0.001)
  })

  test('both complete in-lane channels have at least 19 px raw clearance including end caps', () => {
    // Geometry intentionally preserves these guide/back segment slots.
    for (const [guideIndex, backIndex] of [[5, 13], [9, 15]]) {
      const g = SEGMENTS[guideIndex]
      const b = SEGMENTS[backIndex]
      let clearance = Math.min(
        segmentDistance(g.ax, g.ay, b.ax, b.ay, b.bx, b.by),
        segmentDistance(g.bx, g.by, b.ax, b.ay, b.bx, b.by),
        segmentDistance(b.ax, b.ay, g.ax, g.ay, g.bx, g.by),
        segmentDistance(b.bx, b.by, g.ax, g.ay, g.bx, g.by)
      )
      const gx = g.bx - g.ax
      const gy = g.by - g.ay
      const bx = b.bx - b.ax
      const by = b.by - b.ay
      const determinant = gx * by - gy * bx
      if (determinant !== 0) {
        const t = ((b.ax - g.ax) * by - (b.ay - g.ay) * bx) / determinant
        const u = ((b.ax - g.ax) * gy - (b.ay - g.ay) * gx) / determinant
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) clearance = 0
      }
      expect(clearance).toBeGreaterThanOrEqual(19)
      expect(clearance - 2 * BALL_RADIUS).toBeGreaterThanOrEqual(4)
    }
  })

  test('reported mirrored pivot-notch positions escape during twelve seconds of periodic flips', () => {
    for (const x of [112.8, 237.2]) {
      const p = createPhysics()
      place(p, x, 359.4)
      let furthest = 0
      for (let tick = 0; tick < 12 * 480 && p.ball.active; tick++) {
        const raised = tick % 960 < 160
        stepPhysics(p, PHYSICS_STEP, raised, raised)
        furthest = Math.max(furthest, Math.hypot(p.ball.x - x, p.ball.y - 359.4))
      }
      expect(furthest).toBeGreaterThan(30)
    }
  })

  test('rest drops through both in-lanes reach a flipper within two seconds', () => {
    for (const x of [50, 300]) {
      const p = createPhysics()
      place(p, x, 300)
      let reached = false
      for (let tick = 0; tick < 2 * 480 && p.ball.active; tick++) {
        stepPhysics(p, PHYSICS_STEP, false, false)
        for (let side = 0; side < 2; side++) {
          const f = FLIPPERS[side]
          const angle = side === 0 ? p.leftAngle : p.rightAngle
          const gap = segmentDistance(p.ball.x, p.ball.y, f.x, f.y,
            f.x + Math.cos(angle) * f.length, f.y + Math.sin(angle) * f.length)
          // Sampled contact may have already rebounded by at most one fixed tick.
          if (gap <= f.radius + BALL_RADIUS + MAX_BALL_SPEED * PHYSICS_STEP) reached = true
        }
        if (reached) break
      }
      expect(reached).toBe(true)
    }
  })

  test('a grid of unheld rest drops never remains frozen for more than eight seconds', () => {
    for (const x of [50, 95, 135, 175, 215, 255, 300]) {
      for (const y of [100, 150, 200, 250, 300, 340]) {
        const p = createPhysics()
        place(p, x, y)
        let anchorX = x
        let anchorY = y
        let stationarySince = p.time
        for (let tick = 0; tick < 10 * 480 && p.ball.active; tick++) {
          stepPhysics(p, PHYSICS_STEP, false, false)
          if (p.capturedBy >= 0 || Math.hypot(p.ball.x - anchorX, p.ball.y - anchorY) > 8) {
            anchorX = p.ball.x
            anchorY = p.ball.y
            stationarySince = p.time
          }
          // Allow a few fixed ticks for the eight-second search impulse to physically move the ball.
          if (p.ball.active && p.time - stationarySince > 8.05) {
            throw new Error(`Frozen rest drop (${x},${y}) at (${p.ball.x},${p.ball.y})`)
          }
        }
      }
    }
  }, 30000)

  test('every kicker captures, emits its event, and ejects after its hold', () => {
    for (let index = 0; index < SENSORS.length; index++) {
      const s = SENSORS[index]
      if (s.kind !== 'kicker') continue
      const p = createPhysics()
      place(p, s.x, s.y)
      stepPhysics(p, PHYSICS_STEP, false, false)
      expect(p.capturedBy).toBe(index)
      expect(events(p, s.event, s.index)).toBe(1)
      expect(p.ball.vx).toBe(0)
      expect(p.ball.vy).toBe(0)
      stepPhysics(p, KICKER_HOLD - 2 * PHYSICS_STEP, false, false)
      expect(p.capturedBy).toBe(index)
      stepPhysics(p, 3 * PHYSICS_STEP, false, false)
      expect(p.capturedBy).toBe(-1)
      expect(p.ball.active).toBe(true)
      expect(Math.hypot(p.ball.vx, p.ball.vy)).toBeGreaterThan(100)
    }
  })

  test('spinner emits completed revolutions, not immediate or per-tick flag hits', () => {
    const p = createPhysics()
    place(p, 325, 240, 0, -600)
    stepPhysics(p, PHYSICS_STEP, false, false)
    expect(events(p, EventType.Spinner)).toBe(0)
    expect(p.spinnerVelocity).toBeGreaterThan(0)
    stepPhysics(p, 0.25, false, false)
    expect(events(p, EventType.Spinner)).toBeGreaterThan(0)
    expect(p.spinnerAngle).toBeGreaterThan(Math.PI * 2)
  })

  test('eight seconds without a contact searches and forces a hung kicker to eject', () => {
    const p = createPhysics()
    const index = SENSORS.findIndex(s => s.kind === 'kicker')
    const s = SENSORS[index]
    place(p, s.x, s.y)
    stepPhysics(p, PHYSICS_STEP, false, false)
    p.releaseAt = Infinity
    stepPhysics(p, 8 - PHYSICS_STEP, false, false)
    expect(p.searchCount).toBe(0)
    stepPhysics(p, 2 * PHYSICS_STEP, false, false)
    expect(p.searchCount).toBe(1)
    expect(p.capturedBy).toBe(-1)
    expect(Math.hypot(p.ball.vx, p.ball.vy)).toBeGreaterThan(100)
  })

  test('contactless free ball receives search impulse at eight seconds', () => {
    const p = createPhysics()
    place(p, 175, 220)
    p.time = 8 - PHYSICS_STEP / 2
    p.lastContactTime = 0
    stepPhysics(p, PHYSICS_STEP, false, false)
    expect(p.searchCount).toBe(1)
    expect(p.ball.vy).toBeLessThan(-600)
  })

  test('stationary rest contacts cannot indefinitely postpone the eight-second ball search', () => {
    const p = createPhysics()
    place(p, 175, 172 - BALL_RADIUS)
    stepPhysics(p, 8.1, false, false)
    expect(events(p, EventType.Engine, 1)).toBeGreaterThan(1)
    expect(p.searchCount).toBe(1)
    expect(p.time - p.lastContactTime).toBeLessThan(0.25)
    expect(p.ball.y).toBeLessThan(172 - BALL_RADIUS - 20)
  })

  test('holding a remote flipper does not disable search for a stationary ball elsewhere', () => {
    for (const left of [true, false]) {
      const p = createPhysics()
      place(p, 175, 172 - BALL_RADIUS)
      stepPhysics(p, 8.1, left, !left)
      expect(events(p, EventType.Engine, 1)).toBeGreaterThan(1)
      expect(p.searchCount).toBe(1)
      expect(p.ball.y).toBeLessThan(172 - BALL_RADIUS - 20)
    }
  })

  test('an intentionally held flipper cradle is not interrupted by stationary search', () => {
    const p = createPhysics()
    place(p, 120, 354)
    p.leftAngle = FLIPPERS[0].raised
    stepPhysics(p, 8.2, true, false)
    expect(p.searchCount).toBe(0)
    expect(p.ball.active).toBe(true)
    expect(Math.hypot(p.ball.x - 120, p.ball.y - 354)).toBeLessThan(10)
  })

  test('drain occurs below the playfield, exactly once; middle-table balls remain live', () => {
    const p = createPhysics()
    place(p, 175, 220)
    stepPhysics(p, PHYSICS_STEP, false, false)
    expect(p.ball.active).toBe(true)
    place(p, 175, TABLE_HEIGHT + BALL_RADIUS + 1, 0, 300)
    stepPhysics(p, PHYSICS_STEP, false, false)
    expect(p.ball.active).toBe(false)
    expect(events(p, EventType.Drain)).toBe(1)
    stepPhysics(p, 1, false, false)
    expect(events(p, EventType.Drain)).toBe(0)
  })

  test('step and resets reuse every ball, collision and typed-array pool', () => {
    const p = createPhysics()
    const refs = [p.ball, p.collision, p.contacts, p.hitTime, p.colliderCooldown, p.sensorCooldown, p.sensorInside]
    for (let i = 0; i < 100; i++) {
      resetBall(p)
      launchBall(p, 1)
      stepPhysics(p, 0.1, true, true)
    }
    expect([p.ball, p.collision, p.contacts, p.hitTime, p.colliderCooldown, p.sensorCooldown, p.sensorInside]).toEqual(refs)
    for (let i = 0; i < refs.length; i++) {
      expect([p.ball, p.collision, p.contacts, p.hitTime, p.colliderCooldown, p.sensorCooldown, p.sensorInside][i]).toBe(refs[i])
    }
  })

  test('10,000 seeded max-plunger launches never tunnel through the cabinet or launch rails', () => {
    const p = createPhysics()
    let seed = 0x51cad37
    let launchesExitedLane = 0
    let highestSpeed = 0
    for (let launch = 0; launch < 10000; launch++) {
      resetBall(p)
      launchBall(p, 1)
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      p.ball.x += (seed / 0x100000000 - 0.5) * 5
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      p.ball.vx = (seed / 0x100000000 - 0.5) * 100
      let leftLane = false
      for (let tick = 0; tick < 288; tick++) {
        stepPhysics(p, PHYSICS_STEP, !!(seed & 1), !!(seed & 2))
        const b = p.ball
        const speed = Math.hypot(b.vx, b.vy)
        highestSpeed = Math.max(highestSpeed, speed)
        if (!Number.isFinite(b.x + b.y + speed) || speed > MAX_BALL_SPEED + 0.000001) {
          throw new Error(`Invalid ball on launch ${launch}, tick ${tick}`)
        }
        if (!b.active) break
        if (b.y >= ARCH.y && (b.x < LEFT_WALL + BALL_RADIUS - 0.001 || b.x > RIGHT_WALL - BALL_RADIUS + 0.001)) {
          throw new Error(`Side-wall tunnelling on launch ${launch}, tick ${tick}`)
        }
        if (b.y < ARCH.y && Math.hypot(b.x - ARCH.x, b.y - ARCH.y) > ARCH.radius - BALL_RADIUS + 0.001) {
          throw new Error(`Arch tunnelling on launch ${launch}, tick ${tick}`)
        }
        for (let rail = 2; rail <= 3; rail++) {
          const s = SEGMENTS[rail]
          if (segmentDistance(b.x, b.y, s.ax, s.ay, s.bx, s.by) < BALL_RADIUS - 0.001) {
            throw new Error(`Launch-rail tunnelling on launch ${launch}, tick ${tick}`)
          }
        }
        if (b.x < 330 && b.y < LANE_WALL_TOP) leftLane = true
      }
      if (leftLane) launchesExitedLane++
    }
    expect(launchesExitedLane).toBe(10000)
    expect(highestSpeed).toBeGreaterThan(1900)
    expect(highestSpeed).toBeLessThanOrEqual(MAX_BALL_SPEED + 0.000001)
  }, 180000)
})
