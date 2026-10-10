import { describe, expect, test } from 'bun:test'
import {
  ARCH, BALL_RADIUS, CIRCLES, EventType, FLIPPERS, KICKER_HOLD, LANE_WALL_TOP, LAUNCH, LEFT_WALL,
  RAMP, RIGHT_WALL, SEGMENTS, SENSORS, TABLE_HEIGHT, slotOf
} from '../../src/games/pinball/geometry'
import {
  createPhysics, GRAVITY, launchBall, MAX_BALL_SPEED, nudgePhysics, PHYSICS_STEP,
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
    const x = (sling.ax + sling.bx) / 2 + nx * (BALL_RADIUS + 1)
    const y = (sling.ay + sling.by) / 2 + ny * (BALL_RADIUS + 1)
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
