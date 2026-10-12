import {
  ARCS, BALL_RADIUS, CIRCLES, EventType, FLIPPERS, FLIPPER_DOWN_SPEED, FLIPPER_UP_SPEED, GRAVITY,
  KICKER_HOLD, LANE_WALL, LAUNCH, MAX_SPEED, PLUNGER, RAMP, RIGHT_WALL, SEGMENTS, SENSORS,
  SLINGS, SLOT_COUNT, TABLE_HEIGHT, TABLE_WIDTH, slotOf
} from './geometry'

export const PHYSICS_STEP = 1 / 480
export const MAX_BALL_SPEED = MAX_SPEED
export { GRAVITY } from './geometry'
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
  /** Input-handler preview only; the next fixed tick restores these to actual simulation angles. */
  visualLeftAngle: number
  visualRightAngle: number
  plunger: number
  /** A weak shot returned to the shooter floor; UI returns to ready without charging a ball. */
  reseated: boolean
  time: number
  postRaised: boolean
  /** Bit 0/1 closes the left/right out-lane ball-save gate. */
  gates: number
  tilted: boolean
  /** Bit i removes drop target i from collision until the rules reset the bank. */
  dropTargets: number
  /** Packed [EventType, zero-based index] pairs, valid up to eventCount; reused every call. */
  contacts: Int32Array
  eventCount: number
  hitTime: Float32Array
  spinnerAngle: number
  spinnerVelocity: number
  searchCount: number
  accumulator: number
  lastContactTime: number
  /** Rest contacts do not reset this movement-based search timer; held cradles do. */
  stallSince: number
  stallX: number
  stallY: number
  previousBallX: number
  previousBallY: number
  capturedBy: number
  releaseAt: number
  rampSince: number
  collision: Collision
  colliderCooldown: Float64Array
  sensorCooldown: Float64Array
  sensorInside: Uint8Array
  dragTimes: Float64Array
  dragInside: Uint8Array
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

function candidate(out: Collision, time: number, nx: number, ny: number, normalVelocity: number, penetration = 0) {
  if (time < -EPSILON || Math.max(0, time) >= out.time ||
    time <= EPSILON && normalVelocity >= -EPSILON && penetration <= EPSILON) return
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
      const nx = distance > EPSILON ? dx / distance : speed > EPSILON ? -vx / speed : 0
      const ny = distance > EPSILON ? dy / distance : speed > EPSILON ? -vy / speed : -1
      candidate(out, 0, nx, ny, vx * nx + vy * ny, radius - distance)
    }
    return
  }
  const speedSquared = vx * vx + vy * vy
  if (speedSquared === 0 || dot >= 0) return
  const discriminant = dot * dot - speedSquared * (distanceSquared - radius * radius)
  if (discriminant < 0) return
  const time = (-dot - Math.sqrt(discriminant)) / speedSquared
  if (time < 0 || time > out.time) return
  candidate(out, time, (dx + vx * time) / radius, (dy + vy * time) / radius, (dot + speedSquared * time) / radius)
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
        candidate(out, 0, nx * sign, ny * sign, normalSpeed * sign, radius - Math.abs(side))
      }
    } else if (normalSpeed !== 0) {
      const sign = normalSpeed > 0 ? -1 : 1
      const time = (sign * radius - side) / normalSpeed
      const projection = tangent + (vx * tx + vy * ty) * time
      if (projection >= 0 && projection <= length) candidate(out, time, nx * sign, ny * sign, normalSpeed * sign)
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
      candidate(out, 0, nx, ny, vx * nx + vy * ny, ballRadius - Math.abs(distance - radius))
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
        if (vx * nx + vy * ny < 0 && onArc(Math.atan2(py, px), start, end)) candidate(out, time, nx, ny, vx * nx + vy * ny)
      }
    }
  }
  sweepCircle(out, x, y, vx, vy, cx + Math.cos(start) * radius, cy + Math.sin(start) * radius, ballRadius)
  sweepCircle(out, x, y, vx, vy, cx + Math.cos(end) * radius, cy + Math.sin(end) * radius, ballRadius)
}

export function createPhysics(): Physics {
  const physics: Physics = {
    ball: { x: LAUNCH.x, y: LAUNCH.y, vx: 0, vy: 0, radius: BALL_RADIUS, height: 0, layer: 0, active: false },
    leftAngle: FLIPPERS[0].rest, rightAngle: FLIPPERS[1].rest, plunger: 0, reseated: false, time: 0,
    visualLeftAngle: FLIPPERS[0].rest, visualRightAngle: FLIPPERS[1].rest,
    postRaised: false, gates: 0, tilted: false, dropTargets: 0,
    contacts: new Int32Array(CONTACT_CAPACITY * 2), eventCount: 0,
    hitTime: new Float32Array(SLOT_COUNT).fill(-100), spinnerAngle: 0, spinnerVelocity: 0, searchCount: 0,
    accumulator: 0, lastContactTime: 0, capturedBy: -1, releaseAt: 0, rampSince: 0,
    stallSince: 0, stallX: LAUNCH.x, stallY: LAUNCH.y, previousBallX: LAUNCH.x, previousBallY: LAUNCH.y,
    collision: { time: 0, normalX: 0, normalY: 0, penetration: 0 },
    colliderCooldown: new Float64Array(SEGMENTS.length + CIRCLES.length + ARCS.length + 2),
    sensorCooldown: new Float64Array(SENSORS.length), sensorInside: new Uint8Array(SENSORS.length),
    dragTimes: new Float64Array(SEGMENTS.length + CIRCLES.length + ARCS.length + SENSORS.length),
    dragInside: new Uint8Array(SEGMENTS.length + CIRCLES.length + ARCS.length + SENSORS.length),
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
  p.reseated = false
  p.capturedBy = -1
  p.releaseAt = 0
  p.accumulator = 0
  p.lastContactTime = p.time
  p.stallSince = p.time
  p.stallX = b.x
  p.stallY = b.y
  p.previousBallX = b.x
  p.previousBallY = b.y
  p.sensorInside.fill(0)
  p.sensorCooldown.fill(0)
  p.colliderCooldown.fill(0)
  p.dragInside.fill(0)
  p.visualLeftAngle = p.leftAngle
  p.visualRightAngle = p.rightAngle
}

function emit(p: Physics, event: number, index: number) {
  if (event < 0) return
  // The pool covers over thirty seconds of sustained contacts in one caller update.
  if (p.eventCount === CONTACT_CAPACITY) throw new RangeError('Pinball contact queue capacity exceeded')
  p.contacts[p.eventCount * 2] = event
  p.contacts[p.eventCount * 2 + 1] = index
  p.eventCount++
  p.hitTime[slotOf(event, index)] = p.time
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

/** Filled plastics are solid volumes. Resolve an illegal initial centre by its nearest boundary,
 * just as circle/segment overlap is resolved; held test drags never call this projection.
 */
function depenetratePlastics(p: Physics) {
  const ball = p.ball
  if (ball.layer !== 0 || p.capturedBy >= 0) return
  for (let i = 0; i < SLINGS.length; i++) {
    const s = SLINGS[i]
    const ab = (s.b[0] - s.a[0]) * (ball.y - s.a[1]) - (s.b[1] - s.a[1]) * (ball.x - s.a[0])
    const bc = (s.c[0] - s.b[0]) * (ball.y - s.b[1]) - (s.c[1] - s.b[1]) * (ball.x - s.b[0])
    const ca = (s.a[0] - s.c[0]) * (ball.y - s.c[1]) - (s.a[1] - s.c[1]) * (ball.x - s.c[0])
    if (!(ab >= 0 && bc >= 0 && ca >= 0 || ab <= 0 && bc <= 0 && ca <= 0)) continue
    let distanceSquared = Infinity
    let qx = 0
    let qy = 0
    let edgeX = 0
    let edgeY = 0
    for (let edge = 0; edge < 3; edge++) {
      const a = edge === 0 ? s.a : edge === 1 ? s.b : s.c
      const b = edge === 0 ? s.b : edge === 1 ? s.c : s.a
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const t = Math.max(0, Math.min(1, ((ball.x - a[0]) * dx + (ball.y - a[1]) * dy) / (dx * dx + dy * dy)))
      const x = a[0] + t * dx
      const y = a[1] + t * dy
      const squared = (ball.x - x) ** 2 + (ball.y - y) ** 2
      if (squared < distanceSquared) {
        distanceSquared = squared
        qx = x
        qy = y
        edgeX = dx
        edgeY = dy
      }
    }
    const distance = Math.sqrt(distanceSquared)
    const winding = (s.b[0] - s.a[0]) * (s.c[1] - s.a[1]) - (s.b[1] - s.a[1]) * (s.c[0] - s.a[0])
    const length = distance > EPSILON ? distance : Math.hypot(edgeX, edgeY)
    const nx = distance > EPSILON ? (qx - ball.x) / length : (winding > 0 ? edgeY : -edgeY) / length
    const ny = distance > EPSILON ? (qy - ball.y) / length : (winding > 0 ? -edgeX : edgeX) / length
    ball.x = qx + nx * (ball.radius + EPSILON * 4)
    ball.y = qy + ny * (ball.radius + EPSILON * 4)
  }
}

/** First exit from the connected raised-ramp footprint along a drag; Infinity means the endpoint stays on it. */
function rampExitTime(x: number, y: number, dx: number, dy: number, start: number) {
  const cx = x - RAMP.turn.x
  const cy = y - RAMP.turn.y
  const speedSquared = dx * dx + dy * dy
  const dot = cx * dx + cy * dy
  const outerDiscriminant = dot * dot - speedSquared * (cx * cx + cy * cy - RAMP.turn.outer ** 2)
  const outerExit = speedSquared > 0 && outerDiscriminant >= 0 ? (-dot + Math.sqrt(outerDiscriminant)) / speedSquared : Infinity
  const innerDiscriminant = dot * dot - speedSquared * (cx * cx + cy * cy - RAMP.turn.inner ** 2)
  const innerEntry = speedSquared > 0 && innerDiscriminant > 0 ? (-dot - Math.sqrt(innerDiscriminant)) / speedSquared : Infinity
  let cursor = start
  // Two straight lanes plus the upper annulus contain at most four ray intervals.
  for (let pass = 0; pass < 8; pass++) {
    const px = x + dx * cursor
    const py = y + dy * cursor
    let connectedEnd = cursor
    for (let lane = 0; lane < 2; lane++) {
      const middle = lane === 0 ? RAMP.upX : RAMP.downX
      const bottom = lane === 0 ? RAMP.bottom : RAMP.exitY
      const left = middle - RAMP.laneWidth / 2
      const right = middle + RAMP.laneWidth / 2
      if (px < left - EPSILON || px > right + EPSILON || py < RAMP.turn.y - EPSILON || py > bottom + EPSILON) continue
      let exit = 1
      if (dx > 0) exit = Math.min(exit, (right - x) / dx)
      else if (dx < 0) exit = Math.min(exit, (left - x) / dx)
      if (dy > 0) exit = Math.min(exit, (bottom - y) / dy)
      else if (dy < 0) exit = Math.min(exit, (RAMP.turn.y - y) / dy)
      connectedEnd = Math.max(connectedEnd, exit)
    }
    const radialSquared = (px - RAMP.turn.x) ** 2 + (py - RAMP.turn.y) ** 2
    if (py <= RAMP.turn.y + EPSILON && radialSquared >= RAMP.turn.inner ** 2 - EPSILON &&
      radialSquared <= RAMP.turn.outer ** 2 + EPSILON) {
      let exit = Math.min(1, outerExit)
      if (dy > 0) exit = Math.min(exit, (RAMP.turn.y - y) / dy)
      if (innerEntry >= cursor - EPSILON && dot + speedSquared * innerEntry < 0) exit = Math.min(exit, innerEntry)
      connectedEnd = Math.max(connectedEnd, exit)
    }
    if (connectedEnd >= 1) return Infinity
    if (connectedEnd <= cursor + 1e-12) return cursor
    cursor = connectedEnd
  }
  return cursor
}

/** Test-mode pointer control: append swept events, never run gravity, impulses or kicker capture.
 * The caller must skip stepPhysics while dragging, consume contacts once, then clear eventCount.
 * Entry masks, rather than simulation-clock cooldowns, allow repeated deliberate leave/re-entry.
 */
export function dragBall(p: Physics, x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return
  const b = p.ball
  const toX = Math.max(b.radius, Math.min(TABLE_WIDTH - b.radius, x))
  const toY = Math.max(b.radius, Math.min(TABLE_HEIGHT - b.radius, y))
  const fromX = b.x
  const fromY = b.y
  const dx = toX - fromX
  const dy = toY - fromY
  const circleBase = SEGMENTS.length
  const arcBase = circleBase + CIRCLES.length
  const sensorBase = arcBase + ARCS.length
  const out = p.collision
  p.dragTimes.fill(Infinity)
  for (let i = 0; i < SEGMENTS.length; i++) {
    const s = SEGMENTS[i]
    if (s.event < 0 || p.dragInside[i]) continue
    out.time = 1 + EPSILON
    out.penetration = 0
    sweepSegment(out, fromX, fromY, dx, dy, s.ax, s.ay, s.bx, s.by, b.radius)
    if (out.time <= 1) p.dragTimes[i] = out.time
  }
  for (let i = 0; i < CIRCLES.length; i++) {
    const c = CIRCLES[i]
    const slot = circleBase + i
    if (c.event < 0 || p.dragInside[slot]) continue
    out.time = 1 + EPSILON
    out.penetration = 0
    sweepCircle(out, fromX, fromY, dx, dy, c.x, c.y, c.radius + b.radius)
    if (out.time <= 1) p.dragTimes[slot] = out.time
  }
  for (let i = 0; i < ARCS.length; i++) {
    const a = ARCS[i]
    const slot = arcBase + i
    if (a.event < 0 || p.dragInside[slot]) continue
    out.time = 1 + EPSILON
    out.penetration = 0
    sweepArc(out, fromX, fromY, dx, dy, a.x, a.y, a.radius, a.start, a.end, b.radius)
    if (out.time <= 1) p.dragTimes[slot] = out.time
  }
  for (let i = 0; i < SENSORS.length; i++) {
    const s = SENSORS[i]
    const slot = sensorBase + i
    if (s.kind === 'drain') continue
    if (s.kind === 'ramp-enter') {
      // The mouth is a plane crossing, not a circular entry. Slow pointer moves can already
      // be inside the expanded rollover before they reach this plane.
      if (dy >= 0 || fromY <= RAMP.bottom || toY > RAMP.bottom) continue
      const time = (RAMP.bottom - fromY) / dy
      if (Math.abs(fromX + dx * time - RAMP.upX) > RAMP.laneWidth / 2 - b.radius) continue
      p.dragTimes[slot] = time
      continue
    }
    if (p.dragInside[slot]) continue
    out.time = 1 + EPSILON
    out.penetration = 0
    sweepCircle(out, fromX, fromY, dx, dy, s.x, s.y, s.radius + b.radius)
    if (out.time <= 1) p.dragTimes[slot] = out.time
  }
  // Process in swept-time order, so a ramp entrance enables its later apex and mission sequences stay ordered.
  let leaveRamp = b.layer === 1 ? rampExitTime(fromX, fromY, dx, dy, 0) : Infinity
  if (leaveRamp === 0) { b.layer = 0; b.height = 0; leaveRamp = Infinity }
  for (;;) {
    let first = -1
    let time = Infinity
    for (let i = 0; i < p.dragTimes.length; i++) {
      if (p.dragTimes[i] < time) { first = i; time = p.dragTimes[i] }
    }
    if (first < 0) break
    p.dragTimes[first] = Infinity
    if (b.layer === 1 && time > leaveRamp + 1e-12) {
      b.layer = 0
      b.height = 0
      leaveRamp = Infinity
    }
    if (first < sensorBase) {
      const c = first < circleBase ? SEGMENTS[first] : first < arcBase ? CIRCLES[first - circleBase] : ARCS[first - arcBase]
      if (!matchesLayer(c.layer, b)) continue
      if (first < circleBase && !enabled(p, SEGMENTS[first].kind, c.index)) continue
      emit(p, c.event, c.index)
      p.colliderCooldown[first] = p.time + 0.06
      if (c.event === EventType.Drop) p.dropTargets |= 1 << c.index
    } else {
      const i = first - sensorBase
      const s = SENSORS[i]
      if (!matchesLayer(s.layer, b)) continue
      if (s.kind === 'ramp-enter') {
        if (dy >= 0 || Math.abs(fromX + dx * time - RAMP.upX) > RAMP.laneWidth / 2 - b.radius) continue
        b.layer = s.toLayer ?? 1
        b.height = 1
        p.rampSince = p.time
        leaveRamp = rampExitTime(fromX, fromY, dx, dy, time)
      } else if (s.kind === 'ramp-exit') {
        if (dy <= 0) continue
        b.layer = s.toLayer ?? 0
        b.height = 0
        leaveRamp = Infinity
      }
      emit(p, s.event, s.index)
      p.sensorCooldown[i] = p.time + 0.12
      if (s.kind === 'spinner') {
        p.spinnerAngle += TAU
        p.spinnerVelocity = 0
      }
    }
  }
  if (b.layer === 1 && leaveRamp < 1) { b.layer = 0; b.height = 0 }
  // Update complete endpoint masks only after layer transitions have been applied.
  for (let i = 0; i < SEGMENTS.length; i++) {
    const s = SEGMENTS[i]
    const sx = s.bx - s.ax
    const sy = s.by - s.ay
    const lengthSquared = sx * sx + sy * sy
    const t = lengthSquared > 0 ? Math.max(0, Math.min(1, ((toX - s.ax) * sx + (toY - s.ay) * sy) / lengthSquared)) : 0
    const ex = toX - s.ax - t * sx
    const ey = toY - s.ay - t * sy
    p.dragInside[i] = matchesLayer(s.layer, b) && ex * ex + ey * ey <= b.radius * b.radius ? 1 : 0
  }
  for (let i = 0; i < CIRCLES.length; i++) {
    const c = CIRCLES[i]
    p.dragInside[circleBase + i] = matchesLayer(c.layer, b) && (toX - c.x) ** 2 + (toY - c.y) ** 2 <= (c.radius + b.radius) ** 2 ? 1 : 0
  }
  for (let i = 0; i < ARCS.length; i++) {
    const a = ARCS[i]
    const ex = toX - a.x
    const ey = toY - a.y
    const radial = Math.abs(Math.hypot(ex, ey) - a.radius)
    const endDistance = Math.min(Math.hypot(ex - Math.cos(a.start) * a.radius, ey - Math.sin(a.start) * a.radius),
      Math.hypot(ex - Math.cos(a.end) * a.radius, ey - Math.sin(a.end) * a.radius))
    p.dragInside[arcBase + i] = matchesLayer(a.layer, b) &&
      (radial <= b.radius && onArc(Math.atan2(ey, ex), a.start, a.end) || endDistance <= b.radius) ? 1 : 0
  }
  for (let i = 0; i < SENSORS.length; i++) {
    const s = SENSORS[i]
    const inside = s.kind !== 'drain' && matchesLayer(s.layer, b) &&
      (toX - s.x) ** 2 + (toY - s.y) ** 2 <= (s.radius + b.radius) ** 2
    p.dragInside[sensorBase + i] = inside ? 1 : 0
    p.sensorInside[i] = inside ? 1 : 0
  }
  b.x = toX
  b.y = toY
  b.vx = 0
  b.vy = 0
  b.active = true
  p.reseated = false
  p.capturedBy = -1
  p.releaseAt = 0
  p.lastContactTime = p.time
  p.stallSince = p.time
  p.stallX = toX
  p.stallY = toY
  p.previousBallX = toX
  p.previousBallY = toY
}

function matchesLayer(layer: number, ball: Ball) {
  return layer < 0 || layer === ball.layer
}

function enabled(p: Physics, kind: string | undefined, index: number) {
  if (kind === 'post') return p.postRaised
  if (kind === 'gate') return !!(p.gates & (1 << index))
  if (kind === 'plunger') return !p.tilted
  return kind !== 'drop' || !(p.dropTargets & (1 << index))
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
        const before = p.collision.time
        candidate(p.collision, t, nx, ny, (b.vx - svx) * nx + (b.vy - svy) * ny, Math.max(0, -gap))
        if (p.collision.time < before) {
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
    if (!matchesLayer(a.layer, b)) continue
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
    if (s.kind === 'drain') continue // Horizontal open drain, not the decorative circle's radius.
    if (s.kind === 'ramp-enter' && b.vy >= 0 || s.kind === 'ramp-exit' && b.vy <= 0) continue
    if (s.kind === 'ramp-enter' && Math.abs(toX - RAMP.upX) > RAMP.laneWidth / 2 - b.radius) continue
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
    if (s.kind === 'spinner') {
      p.spinnerVelocity = Math.min(100, p.spinnerVelocity + Math.hypot(b.vx, b.vy) / 12)
    } else emit(p, s.event, s.index)
    if (s.kind === 'ramp-enter') {
      b.layer = s.toLayer ?? 1
      p.rampSince = p.time
      b.height = 1
    } else if (s.kind === 'ramp-exit') {
      b.layer = s.toLayer ?? 0
      b.height = 0
    } else if (s.kind === 'kicker') {
      p.capturedBy = i
      p.releaseAt = p.time + KICKER_HOLD
      b.x = s.x
      b.y = s.y
      b.vx = 0
      b.vy = 0
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
  let event: number = -1
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
  b.x += out.normalX * (out.penetration + EPSILON * 4)
  b.y += out.normalY * (out.penetration + EPSILON * 4)
  // Separating overlaps need only depenetration, not impulses, events or a contact-timer reset.
  if (vn >= -EPSILON) return
  const change = -(1 + restitution) * vn + (ready ? impulse : 0)
  b.vx += out.normalX * change
  b.vy += out.normalY * change
  // Rail rolling friction is applied once per fixed tick, not once per CCD contact.
  // A curved guide may contact on every tick; per-impact damping would stall an orbit shot.
  if (p.hitKind === 3) {
    const tangent = (b.vx - p.hitVelocityX) * -out.normalY + (b.vy - p.hitVelocityY) * out.normalX
    b.vx += out.normalY * tangent * 0.015
    b.vy -= out.normalX * tangent * 0.015
  }
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
  const ls = leftUp ? FLIPPER_UP_SPEED : FLIPPER_DOWN_SPEED
  const rs = rightUp ? FLIPPER_UP_SPEED : FLIPPER_DOWN_SPEED
  p.leftAngle += Math.max(-ls * PHYSICS_STEP, Math.min(ls * PHYSICS_STEP, lt - p.leftAngle))
  p.rightAngle += Math.max(-rs * PHYSICS_STEP, Math.min(rs * PHYSICS_STEP, rt - p.rightAngle))
  p.leftVelocity = (p.leftAngle - p.previousLeftAngle) / PHYSICS_STEP
  p.rightVelocity = (p.rightAngle - p.previousRightAngle) / PHYSICS_STEP
  p.visualLeftAngle = p.leftAngle
  p.visualRightAngle = p.rightAngle
}

/** Immediate input feedback only: preview one fixed tick, without advancing actual physics or contacts. */
export function applyFlipperInput(p: Physics, left: boolean, right: boolean) {
  const leftUp = left && !p.tilted
  const rightUp = right && !p.tilted
  const lt = leftUp ? FLIPPERS[0].raised : FLIPPERS[0].rest
  const rt = rightUp ? FLIPPERS[1].raised : FLIPPERS[1].rest
  const ls = leftUp ? FLIPPER_UP_SPEED : FLIPPER_DOWN_SPEED
  const rs = rightUp ? FLIPPER_UP_SPEED : FLIPPER_DOWN_SPEED
  p.visualLeftAngle = p.leftAngle + Math.max(-ls * PHYSICS_STEP, Math.min(ls * PHYSICS_STEP, lt - p.leftAngle))
  p.visualRightAngle = p.rightAngle + Math.max(-rs * PHYSICS_STEP, Math.min(rs * PHYSICS_STEP, rt - p.rightAngle))
}

/** Held test drag advances the fixed table clock and flippers, never the ball or queued events. */
export function advanceDrag(p: Physics, dt: number, left: boolean, right: boolean) {
  if (!(dt > 0) || !Number.isFinite(dt)) return
  p.accumulator += dt
  while (p.accumulator + 1e-12 >= PHYSICS_STEP) {
    p.accumulator -= PHYSICS_STEP
    if (p.accumulator < 0) p.accumulator = 0
    p.time += PHYSICS_STEP
    advanceFlippers(p, left, right)
  }
  p.lastContactTime = p.time
  p.stallSince = p.time
  p.stallX = p.ball.x
  p.stallY = p.ball.y
  p.previousBallX = p.ball.x
  p.previousBallY = p.ball.y
}

function fixedStep(p: Physics, left: boolean, right: boolean) {
  p.time += PHYSICS_STEP
  advanceFlippers(p, left, right)
  const oldRevolutions = Math.floor(p.spinnerAngle / TAU)
  p.spinnerAngle += p.spinnerVelocity * PHYSICS_STEP
  p.spinnerVelocity *= 1 - 1.8 * PHYSICS_STEP
  if (Math.floor(p.spinnerAngle / TAU) > oldRevolutions) emit(p, EventType.Spinner, 0)
  const b = p.ball
  if (!b.active) return
  depenetratePlastics(p)
  const travelSinceLastTick = Math.hypot(b.x - p.previousBallX, b.y - p.previousBallY)
  let heldCradle = false
  if (!p.tilted && b.layer === 0 && (left || right)) {
    for (let side = 0; side < 2; side++) {
      if (side === 0 ? !left : !right) continue
      const f = FLIPPERS[side]
      const angle = side === 0 ? p.leftAngle : p.rightAngle
      const ux = Math.cos(angle)
      const uy = Math.sin(angle)
      const projection = Math.max(0, Math.min(f.length, (b.x - f.x) * ux + (b.y - f.y) * uy))
      const dx = b.x - f.x - ux * projection
      const dy = b.y - f.y - uy * projection
      const contactRadius = b.radius + f.radius + 1
      if (dx * dx + dy * dy <= contactRadius * contactRadius) {
        heldCradle = true
        break
      }
    }
  }
  if (p.capturedBy >= 0 || heldCradle || Math.hypot(b.x - p.stallX, b.y - p.stallY) > 8) {
    p.stallSince = p.time
    p.stallX = b.x
    p.stallY = b.y
  }
  p.previousBallX = b.x
  p.previousBallY = b.y
  const stalled = p.capturedBy < 0 && !heldCradle && p.time - p.stallSince >= 8 &&
    (Math.hypot(b.vx, b.vy) < 40 || travelSinceLastTick < 0.04)
  if (p.time - p.lastContactTime >= 8 || stalled) {
    if (p.capturedBy >= 0) kickCaptured(p)
    else {
      b.vx += b.x < TABLE_WIDTH / 2 ? 180 : -180
      b.vy = -650
      capSpeed(b)
    }
    p.lastContactTime = p.time
    p.stallSince = p.time
    p.stallX = b.x
    p.stallY = b.y
    p.searchCount++
  }
  if (p.capturedBy >= 0) {
    if (p.time >= p.releaseAt) kickCaptured(p)
    else return
  }
  b.vy += GRAVITY * PHYSICS_STEP
  b.vx *= 1 - 0.08 * PHYSICS_STEP
  b.vy *= 1 - 0.08 * PHYSICS_STEP
  capSpeed(b)
  if (b.layer > 0) b.height = Math.min(1, b.height + 5 * PHYSICS_STEP)
  let remaining = PHYSICS_STEP
  for (let iteration = 0; iteration < 16 && remaining > EPSILON / MAX_BALL_SPEED; iteration++) {
    const collision = collectCollision(p, remaining, PHYSICS_STEP - remaining)
    const travel = collision ? p.collision.time : remaining
    const x = b.x
    const y = b.y
    const layer = b.layer
    b.x += b.vx * travel
    b.y += b.vy * travel
    if (!sensors(p, x, y, b.x, b.y)) return
    remaining -= travel
    if (!collision) break
    if (b.layer !== layer) continue // Recompute against the newly entered ramp layer.
    respond(p)
  }
  // A weak ramp shot may roll back out of its entrance rather than reach the apex.
  if (b.layer === 1 && b.y > RAMP.bottom && b.vy > 0) {
    b.layer = 0
    b.height = 0
  }
  if (!p.tilted && b.layer === 0 && b.x > LANE_WALL + b.radius &&
    b.x < RIGHT_WALL - b.radius + EPSILON && Math.abs(b.y - (PLUNGER.top - b.radius)) < 1 &&
    Math.abs(b.vx) < 20 && Math.abs(b.vy) < 20) {
    b.x = LAUNCH.x
    b.y = LAUNCH.y
    b.vx = 0
    b.vy = 0
    b.height = 0
    b.active = false
    p.reseated = true
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
