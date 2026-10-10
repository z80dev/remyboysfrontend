import { ARCS, CIRCLES, EventType, FLIPPERS, LAUNCH, SEGMENTS, SENSORS, TABLE_HEIGHT, TABLE_WIDTH } from './geometry'

export const PHYSICS_STEP = 1 / 480
export const MAX_BALL_SPEED = 2000
export const GRAVITY = 1100
const EPSILON = 0.00001
const TAU = Math.PI * 2
const CONTACT_CAPACITY = 16384

export interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  height: number
  layer: number
  active: boolean
}

/** Reusable swept-collision result. Set time to the sweep duration before collecting candidates. */
export interface Collision {
  time: number
  normalX: number
  normalY: number
  penetration: number
}

export interface Physics {
  ball: Ball
  leftAngle: number
  rightAngle: number
  plunger: number
  time: number
  postRaised: boolean
  tilted: boolean
  /** Bit i removes drop target i from collision until the rules reset the bank. */
  dropTargets: number
  /** Packed [EventType, zero-based index] pairs, valid up to eventCount; reused every call. */
  contacts: Int32Array
  eventCount: number
  accumulator: number
  lastContactTime: number
  capturedBy: number
  releaseAt: number
  rampSince: number
  collision: Collision
  colliderCooldown: Float64Array
  sensorCooldown: Float64Array
  sensorInside: Uint8Array
  hitKind: number
  hitIndex: number
  hitVelocityX: number
  hitVelocityY: number
  leftVelocity: number
  rightVelocity: number
  previousLeftAngle: number
  previousRightAngle: number
}

function normaliseAngle(angle: number) {
  return ((angle % TAU) + TAU) % TAU
}

function onArc(angle: number, start: number, end: number) {
  if (Math.abs(end - start) >= TAU - EPSILON) return true
  return normaliseAngle(angle - start) <= normaliseAngle(end - start) + EPSILON
}

function candidate(out: Collision, time: number, nx: number, ny: number, penetration = 0) {
  if (time < -EPSILON || time > out.time) return
  out.time = Math.max(0, time)
  out.normalX = nx
  out.normalY = ny
  out.penetration = penetration
}

/** Continuous moving point against an expanded circle; velocities are in pixels/second. */
export function sweepCircle(out: Collision, x: number, y: number, vx: number, vy: number, cx: number, cy: number, radius: number) {
  const dx = x - cx
  const dy = y - cy
  const distanceSquared = dx * dx + dy * dy
  const dot = dx * vx + dy * vy
  if (distanceSquared < radius * radius) {
    const distance = Math.sqrt(distanceSquared)
    if (dot < 0 || radius - distance > EPSILON) {
      const speed = Math.hypot(vx, vy)
      candidate(out, 0, distance > EPSILON ? dx / distance : speed > EPSILON ? -vx / speed : 0,
        distance > EPSILON ? dy / distance : speed > EPSILON ? -vy / speed : -1, radius - distance)
    }
    return
  }
  const speedSquared = vx * vx + vy * vy
  if (speedSquared === 0 || dot >= 0) return
  const discriminant = dot * dot - speedSquared * (distanceSquared - radius * radius)
  if (discriminant < 0) return
  const time = (-dot - Math.sqrt(discriminant)) / speedSquared
  if (time < 0 || time > out.time) return
  candidate(out, time, (dx + vx * time) / radius, (dy + vy * time) / radius)
}

/** Swept circle against a segment capsule, including both rounded endpoints. */
export function sweepSegment(out: Collision, x: number, y: number, vx: number, vy: number,
  ax: number, ay: number, bx: number, by: number, radius: number) {
  const dx = bx - ax
  const dy = by - ay
  const length = Math.hypot(dx, dy)
  if (length > EPSILON) {
    const tx = dx / length
    const ty = dy / length
    const nx = -ty
    const ny = tx
    const side = (x - ax) * nx + (y - ay) * ny
    const tangent = (x - ax) * tx + (y - ay) * ty
    const normalSpeed = vx * nx + vy * ny
    if (tangent >= 0 && tangent <= length && Math.abs(side) < radius) {
      const sign = side < 0 ? -1 : side > 0 ? 1 : normalSpeed > 0 ? -1 : 1
      if (normalSpeed * sign < 0 || radius - Math.abs(side) > EPSILON) {
        candidate(out, 0, nx * sign, ny * sign, radius - Math.abs(side))
      }
    } else if (normalSpeed !== 0) {
      const sign = normalSpeed > 0 ? -1 : 1
      const time = (sign * radius - side) / normalSpeed
      const projection = tangent + (vx * tx + vy * ty) * time
      if (projection >= 0 && projection <= length) candidate(out, time, nx * sign, ny * sign)
    }
  }
  sweepCircle(out, x, y, vx, vy, ax, ay, radius)
  sweepCircle(out, x, y, vx, vy, bx, by, radius)
}

/** Circular rail CCD: both sides of the annulus and both end caps, including wrapped arcs. */
export function sweepArc(out: Collision, x: number, y: number, vx: number, vy: number,
  cx: number, cy: number, radius: number, start: number, end: number, ballRadius: number) {
  const dx = x - cx
  const dy = y - cy
  const distance = Math.hypot(dx, dy)
  if (Math.abs(distance - radius) < ballRadius && onArc(Math.atan2(dy, dx), start, end)) {
    const sign = distance < radius ? -1 : 1
    const nx = distance > EPSILON ? dx / distance * sign : 0
    const ny = distance > EPSILON ? dy / distance * sign : -1
    if (vx * nx + vy * ny < 0 || ballRadius - Math.abs(distance - radius) > EPSILON) {
      candidate(out, 0, nx, ny, ballRadius - Math.abs(distance - radius))
    }
  }
  const a = vx * vx + vy * vy
  const dot = dx * vx + dy * vy
  if (a > 0) {
    for (let side = -1; side <= 1; side += 2) {
      const expanded = radius + side * ballRadius
      if (expanded <= 0) continue
      const discriminant = dot * dot - a * (dx * dx + dy * dy - expanded * expanded)
      if (discriminant < 0) continue
      const root = Math.sqrt(discriminant)
      for (let solution = -1; solution <= 1; solution += 2) {
        const time = (-dot + solution * root) / a
        if (time < 0 || time > out.time) continue
        const px = dx + vx * time
        const py = dy + vy * time
        const nx = px / expanded * side
        const ny = py / expanded * side
        if (vx * nx + vy * ny < 0 && onArc(Math.atan2(py, px), start, end)) candidate(out, time, nx, ny)
      }
    }
  }
  sweepCircle(out, x, y, vx, vy, cx + Math.cos(start) * radius, cy + Math.sin(start) * radius, ballRadius)
  sweepCircle(out, x, y, vx, vy, cx + Math.cos(end) * radius, cy + Math.sin(end) * radius, ballRadius)
}

export function createPhysics(): Physics {
  const physics: Physics = {
    ball: { x: LAUNCH.x, y: LAUNCH.y, vx: 0, vy: 0, radius: 7.5, height: 0, layer: 0, active: false },
    leftAngle: FLIPPERS[0].rest, rightAngle: FLIPPERS[1].rest, plunger: 0, time: 0,
    postRaised: false, tilted: false, dropTargets: 0,
    contacts: new Int32Array(CONTACT_CAPACITY * 2), eventCount: 0,
    accumulator: 0, lastContactTime: 0, capturedBy: -1, releaseAt: 0, rampSince: 0,
    collision: { time: 0, normalX: 0, normalY: 0, penetration: 0 },
    colliderCooldown: new Float64Array(SEGMENTS.length + CIRCLES.length + ARCS.length + 2),
    sensorCooldown: new Float64Array(SENSORS.length), sensorInside: new Uint8Array(SENSORS.length),
    hitKind: -1, hitIndex: -1, hitVelocityX: 0, hitVelocityY: 0,
    leftVelocity: 0, rightVelocity: 0, previousLeftAngle: FLIPPERS[0].rest, previousRightAngle: FLIPPERS[1].rest
  }
  return physics
}

/** Prepare the next ball without reallocating pools or changing elapsed table time. */
export function resetBall(p: Physics) {
  const b = p.ball
  b.x = LAUNCH.x
  b.y = LAUNCH.y
  b.vx = 0
  b.vy = 0
  b.height = 0
  b.layer = 0
  b.active = false
  p.plunger = 0
  p.capturedBy = -1
  p.releaseAt = 0
  p.accumulator = 0
  p.lastContactTime = p.time
  p.sensorInside.fill(0)
  p.sensorCooldown.fill(0)
  p.colliderCooldown.fill(0)
}

function emit(p: Physics, event: number, index: number) {
  if (event <= EventType.None) return
  // The pool covers over thirty seconds of sustained contacts in one caller update.
  if (p.eventCount === CONTACT_CAPACITY) throw new RangeError('Pinball contact queue capacity exceeded')
  p.contacts[p.eventCount * 2] = event
  p.contacts[p.eventCount * 2 + 1] = index
  p.eventCount++
}

function capSpeed(b: Ball) {
  const speedSquared = b.vx * b.vx + b.vy * b.vy
  if (speedSquared > MAX_BALL_SPEED * MAX_BALL_SPEED) {
    const factor = MAX_BALL_SPEED / Math.sqrt(speedSquared)
    b.vx *= factor
    b.vy *= factor
  }
}

export function launchBall(p: Physics, strength: number) {
  if (p.ball.active) return
  resetBall(p)
  p.ball.active = true
  p.ball.vy = -(750 + 1250 * Math.max(0, Math.min(1, strength)))
  p.lastContactTime = p.time
}

export function nudgePhysics(p: Physics, dx: number, dy: number) {
  if (!p.ball.active || p.capturedBy >= 0 || p.tilted) return
  p.ball.vx += dx
  p.ball.vy += dy
  capSpeed(p.ball)
}

function matchesLayer(layer: number, ball: Ball) {
  return layer < 0 || layer === ball.layer
}

function enabled(p: Physics, kind: string | undefined, index: number) {
  return kind !== 'post' || p.postRaised ? kind !== 'drop' || !(p.dropTargets & (1 << index)) : false
}

function flipperCollision(p: Physics, index: number, elapsed: number, duration: number) {
  const f = FLIPPERS[index]
  const b = p.ball
  const angular = index === 0 ? p.leftVelocity : p.rightVelocity
  const previous = index === 0 ? p.previousLeftAngle : p.previousRightAngle
  const speedBound = Math.hypot(b.vx, b.vy) + Math.abs(angular) * f.length
  let t = 0
  // Conservative advancement bounds the moving capsule, not merely its final orientation.
  for (let iteration = 0; iteration < 64; iteration++) {
    const angle = previous + angular * (elapsed + t)
    const ux = Math.cos(angle)
    const uy = Math.sin(angle)
    const bx = b.x + b.vx * t
    const by = b.y + b.vy * t
    const projection = Math.max(0, Math.min(f.length, (bx - f.x) * ux + (by - f.y) * uy))
    const qx = f.x + ux * projection
    const qy = f.y + uy * projection
    const dx = bx - qx
    const dy = by - qy
    const distance = Math.hypot(dx, dy)
    const gap = distance - b.radius - f.radius
    const nx = distance > EPSILON ? dx / distance : uy
    const ny = distance > EPSILON ? dy / distance : -ux
    const svx = -angular * (qy - f.y)
    const svy = angular * (qx - f.x)
    if (gap <= EPSILON) {
      if ((b.vx - svx) * nx + (b.vy - svy) * ny < 0 || gap < -EPSILON) {
        candidate(p.collision, t, nx, ny, Math.max(0, -gap))
        if (p.collision.time === t) {
          p.hitKind = 3
          p.hitIndex = index
          p.hitVelocityX = svx
          p.hitVelocityY = svy
        }
      }
      return
    }
    if (speedBound <= EPSILON) return
    t += Math.max(EPSILON / speedBound, gap * 0.9 / speedBound)
    if (t > duration || t > p.collision.time) return
  }
}

function collectCollision(p: Physics, duration: number, elapsed: number) {
  const b = p.ball
  const out = p.collision
  out.time = duration + EPSILON
  out.penetration = 0
  p.hitKind = -1
  p.hitVelocityX = 0
  p.hitVelocityY = 0
  for (let i = 0; i < SEGMENTS.length; i++) {
    const s = SEGMENTS[i]
    if (!matchesLayer(s.layer, b) || !enabled(p, s.kind, s.index)) continue
    const before = out.time
    sweepSegment(out, b.x, b.y, b.vx, b.vy, s.ax, s.ay, s.bx, s.by, b.radius)
    if (out.time !== before) { p.hitKind = 0; p.hitIndex = i }
  }
  for (let i = 0; i < CIRCLES.length; i++) {
    const c = CIRCLES[i]
    if (!matchesLayer(c.layer, b) || !enabled(p, c.kind, c.index)) continue
    const before = out.time
    sweepCircle(out, b.x, b.y, b.vx, b.vy, c.x, c.y, c.radius + b.radius)
    if (out.time !== before) { p.hitKind = 1; p.hitIndex = i }
  }
  for (let i = 0; i < ARCS.length; i++) {
    const a = ARCS[i]
    if (!matchesLayer(a.layer, b) || !enabled(p, a.kind, a.index)) continue
    const before = out.time
    sweepArc(out, b.x, b.y, b.vx, b.vy, a.x, a.y, a.radius, a.start, a.end, b.radius)
    if (out.time !== before) { p.hitKind = 2; p.hitIndex = i }
  }
  if (b.layer === 0) {
    flipperCollision(p, 0, elapsed, duration)
    flipperCollision(p, 1, elapsed, duration)
  }
  return p.hitKind >= 0 && out.time <= duration
}

function drain(p: Physics, index = 0) {
  p.ball.active = false
  p.ball.vx = 0
  p.ball.vy = 0
  p.ball.height = 0
  p.ball.layer = 0
  p.capturedBy = -1
  emit(p, EventType.Drain, index)
}

function sensors(p: Physics, fromX: number, fromY: number, toX: number, toY: number) {
  const b = p.ball
  const dx = toX - fromX
  const dy = toY - fromY
  const lengthSquared = dx * dx + dy * dy
  for (let i = 0; i < SENSORS.length; i++) {
    const s = SENSORS[i]
    if (!matchesLayer(s.layer, b)) { p.sensorInside[i] = 0; continue }
    const radius = s.radius + b.radius
    const endInside = (toX - s.x) ** 2 + (toY - s.y) ** 2 <= radius * radius
    const projection = lengthSquared > 0 ? Math.max(0, Math.min(1, ((s.x - fromX) * dx + (s.y - fromY) * dy) / lengthSquared)) : 0
    const distanceSquared = (fromX + dx * projection - s.x) ** 2 + (fromY + dy * projection - s.y) ** 2
    const trigger = !p.sensorInside[i] && distanceSquared <= radius * radius && p.time >= p.sensorCooldown[i]
    p.sensorInside[i] = endInside ? 1 : 0
    if (!trigger) continue
    p.sensorCooldown[i] = p.time + 0.12
    p.lastContactTime = p.time
    emit(p, s.event, s.index)
    if (s.kind === 'ramp-enter') {
      b.layer = s.toLayer ?? 1
      p.rampSince = p.time
      b.height = 1
    } else if (s.kind === 'ramp-exit') {
      b.layer = s.toLayer ?? 0
      b.height = 0
    } else if (s.kind === 'kicker') {
      p.capturedBy = i
      p.releaseAt = p.time + 0.65
      b.x = s.x
      b.y = s.y
      b.vx = 0
      b.vy = 0
      return false
    } else if (s.kind === 'drain') {
      if (s.event !== EventType.Drain) drain(p, s.index)
      else { b.active = false; b.vx = 0; b.vy = 0 }
      return false
    }
  }
  return true
}

function kickCaptured(p: Physics) {
  const sensor = SENSORS[p.capturedBy]
  p.ball.x = sensor.exitX ?? sensor.x
  p.ball.y = sensor.exitY ?? sensor.y
  p.ball.vx = sensor.kickX ?? 300
  p.ball.vy = sensor.kickY ?? 450
  p.sensorCooldown[p.capturedBy] = p.time + 0.5
  p.sensorInside[p.capturedBy] = 1
  p.capturedBy = -1
  capSpeed(p.ball)
}

function respond(p: Physics) {
  const out = p.collision
  const b = p.ball
  let restitution = 0.72
  let impulse = 0
  let event = EventType.None
  let index = p.hitIndex
  let slot = index
  if (p.hitKind === 0) {
    const c = SEGMENTS[index]
    restitution = c.restitution
    impulse = c.impulse
    event = c.event
    index = c.index
  } else if (p.hitKind === 1) {
    const c = CIRCLES[index]
    restitution = c.restitution
    impulse = c.impulse
    event = c.event
    index = c.index
    slot += SEGMENTS.length
  } else if (p.hitKind === 2) {
    const c = ARCS[index]
    restitution = c.restitution
    impulse = c.impulse
    event = c.event
    index = c.index
    slot += SEGMENTS.length + CIRCLES.length
  } else {
    restitution = 0.68
    slot += SEGMENTS.length + CIRCLES.length + ARCS.length
  }
  const ready = p.time >= p.colliderCooldown[slot]
  const vn = (b.vx - p.hitVelocityX) * out.normalX + (b.vy - p.hitVelocityY) * out.normalY
  if (vn < 0) {
    const change = -(1 + restitution) * vn + (ready ? impulse : 0)
    b.vx += out.normalX * change
    b.vy += out.normalY * change
    // Tiny tangential friction keeps a held flipper useful as a cradle without sticky constraints.
    const tangent = (b.vx - p.hitVelocityX) * -out.normalY + (b.vy - p.hitVelocityY) * out.normalX
    b.vx += out.normalY * tangent * 0.015
    b.vy -= out.normalX * tangent * 0.015
  }
  b.x += out.normalX * (out.penetration + EPSILON * 4)
  b.y += out.normalY * (out.penetration + EPSILON * 4)
  if (ready) {
    emit(p, event, index)
    p.colliderCooldown[slot] = p.time + 0.06
    if (event === EventType.Drop) p.dropTargets |= 1 << index
  }
  p.lastContactTime = p.time
  capSpeed(b)
}

function advanceFlippers(p: Physics, left: boolean, right: boolean) {
  p.previousLeftAngle = p.leftAngle
  p.previousRightAngle = p.rightAngle
  const l = FLIPPERS[0]
  const r = FLIPPERS[1]
  const leftUp = left && !p.tilted
  const rightUp = right && !p.tilted
  const lt = leftUp ? l.raised : l.rest
  const rt = rightUp ? r.raised : r.rest
  p.leftAngle += Math.max(-(leftUp ? 30 : 15) * PHYSICS_STEP, Math.min((leftUp ? 30 : 15) * PHYSICS_STEP, lt - p.leftAngle))
  p.rightAngle += Math.max(-(rightUp ? 30 : 15) * PHYSICS_STEP, Math.min((rightUp ? 30 : 15) * PHYSICS_STEP, rt - p.rightAngle))
  p.leftVelocity = (p.leftAngle - p.previousLeftAngle) / PHYSICS_STEP
  p.rightVelocity = (p.rightAngle - p.previousRightAngle) / PHYSICS_STEP
}

function fixedStep(p: Physics, left: boolean, right: boolean) {
  p.time += PHYSICS_STEP
  advanceFlippers(p, left, right)
  const b = p.ball
  if (!b.active) return
  if (p.time - p.lastContactTime >= 8) {
    if (p.capturedBy >= 0) kickCaptured(p)
    else {
      b.vx += b.x < TABLE_WIDTH / 2 ? 180 : -180
      b.vy = -650
      capSpeed(b)
    }
    p.lastContactTime = p.time
    emit(p, EventType.Search, 0)
  }
  if (p.capturedBy >= 0) {
    if (p.time >= p.releaseAt) kickCaptured(p)
    else return
  }
  b.vy += GRAVITY * PHYSICS_STEP
  b.vx *= 1 - 0.08 * PHYSICS_STEP
  b.vy *= 1 - 0.08 * PHYSICS_STEP
  capSpeed(b)
  if (b.layer > 0) b.height = Math.min(12, b.height + 50 * PHYSICS_STEP)
  let remaining = PHYSICS_STEP
  for (let iteration = 0; iteration < 16 && remaining > EPSILON / MAX_BALL_SPEED; iteration++) {
    const collision = collectCollision(p, remaining, PHYSICS_STEP - remaining)
    const travel = collision ? p.collision.time : remaining
    const x = b.x
    const y = b.y
    b.x += b.vx * travel
    b.y += b.vy * travel
    if (!sensors(p, x, y, b.x, b.y)) return
    remaining -= travel
    if (!collision) break
    respond(p)
  }
  // Do not advance unconsumed time after a pathological contact cluster: that would tunnel.
  if (b.y - b.radius > TABLE_HEIGHT) drain(p)
}

/** dt is seconds. Fixed ticks, pools and the event queue are owned by this instance; no step allocates. */
export function stepPhysics(p: Physics, dt: number, left: boolean, right: boolean) {
  p.eventCount = 0
  if (!(dt > 0) || !Number.isFinite(dt)) return
  p.accumulator += dt
  while (p.accumulator + 1e-12 >= PHYSICS_STEP) {
    p.accumulator -= PHYSICS_STEP
    if (p.accumulator < 0) p.accumulator = 0
    fixedStep(p, left, right)
  }
}
