import { mulberry32 } from '../kit/remy'

export const WIDTH = 640
export const HEIGHT = 350
export const GROUND = 330
export const FIXED_DT = 1 / 60
export const FLIGHT_RATE = 4
export const CRATER_RADIUS = 13
export const PLAYER_RADIUS = 28
export const SUN_X = 320
export const SUN_Y = 25
export const SUN_RADIUS = 12

export type Side = 0 | 1
export type Building = { x: number; y: number; width: number; color: number; tower: boolean }
export type Player = { x: number; y: number; alive: boolean; building: number }
export type Shot = {
  x: number; y: number; vx: number; vy: number; time: number; frame: number; active: boolean
}
export type Throw = { angle: number; velocity: number }
export type Cpu = { misses: number; throws: number; rng: () => number }
export type Round = {
  seed: number; buildings: Building[]; pixels: Uint8Array; players: [Player, Player]; wind: number; gravity: number
  sunGasp: boolean; turn: Side; shot: Shot; hit: 'none' | 'building' | 'player' | 'miss'; victim: Side | -1
  impactX: number; impactY: number; cpu: Cpu
}
export type Match = {
  seed: number; roundNumber: number; target: number; gravity: number; scores: [number, number]
  round: Round; phase: 'aim' | 'flight' | 'explosion' | 'dance' | 'over'; winner: Side | -1
  elapsed: number; danceBeat: number; explosionRadius: number
}

export function createRound(seed: number, gravity = 9.8, turn: Side = 0): Round {
  const rng = mulberry32(seed)
  const count = 9 + Math.floor(rng() * 4)
  const widths = new Int16Array(count)
  let remaining = WIDTH - count + 1
  for (let i = 0; i < count; i++) {
    const rest = count - i - 1
    const minimum = Math.max(37, remaining - rest * 90)
    const maximum = Math.min(90, remaining - rest * 37)
    widths[i] = i === count - 1 ? remaining : minimum + Math.floor(rng() * (maximum - minimum + 1))
    remaining -= widths[i]
  }
  const left = 1 + Math.floor(rng() * 2)
  const right = count - 2 - Math.floor(rng() * 2)
  const buildings: Building[] = []
  let x = 0
  for (let i = 0; i < count; i++) {
    buildings.push({ x, y: 110 + Math.floor(rng() * 186), width: widths[i], color: [4, 3, 7][Math.floor(rng() * 3)], tower: false })
    x += widths[i] + 1
  }
  if (rng() < 0.4) {
    const candidates = buildings.filter((b, i) => i !== left && i !== right && b.width >= 47)
    if (candidates.length > 0) {
      const tower = candidates[Math.floor(rng() * candidates.length)]
      tower.tower = true
      tower.color = 5
      tower.y = Math.max(60, Math.min(...buildings.map((b) => b.y)) - 20)
    }
  }
  const pixels = new Uint8Array(WIDTH * HEIGHT)
  pixels.fill(1)
  for (const building of buildings) {
    for (let y = building.y; y < GROUND; y++) pixels.fill(building.color, y * WIDTH + building.x, y * WIDTH + building.x + building.width)
    const columns = Math.ceil((building.width - 12) / 10)
    const c0 = Math.floor((columns - 4) / 2)
    for (let wy = building.y + 8, row = 0; wy + 6 < GROUND; wy += 15, row++) {
      for (let wx = building.x + 6, col = 0; wx + 3 < building.x + building.width - 3; wx += 10, col++) {
        const mark = building.tower && ((row === 0 || row === 4) && col >= c0 && col < c0 + 4 || row > 0 && row < 4 && col === c0)
        const lit = building.tower ? mark : rng() < 0.6
        for (let y = wy; y < wy + 6; y++) pixels.fill(lit ? 14 : 8, y * WIDTH + wx, y * WIDTH + wx + 3)
      }
    }
  }
  const makePlayer = (index: number): Player => {
    const building = buildings[index]
    return { x: Math.floor(building.x + (building.width - 30) / 2), y: building.y - 30, alive: true, building: index }
  }
  const strong = rng() < 0.12
  const wind = Math.floor(rng() * (strong ? 31 : 11)) - (strong ? 15 : 5)
  return {
    seed, buildings, pixels, players: [makePlayer(left), makePlayer(right)], wind, gravity, sunGasp: false, turn,
    shot: { x: 0, y: 0, vx: 0, vy: 0, time: 0, frame: 0, active: false },
    hit: 'none', victim: -1, impactX: 0, impactY: 0, cpu: { misses: 0, throws: 0, rng: mulberry32(seed ^ 0xcaba1d) },
  }
}

export function createMatch(seed: number, target = 3, gravity = 9.8): Match {
  return {
    seed, target, gravity, roundNumber: 1, scores: [0, 0], round: createRound(seed, gravity),
    phase: 'aim', winner: -1, elapsed: 0, danceBeat: 0, explosionRadius: 0,
  }
}

export function validThrow(angle: number, velocity: number): boolean {
  return Number.isFinite(angle) && angle >= 0 && angle <= 360 && Number.isFinite(velocity) && velocity > 0 && velocity <= Number.MAX_SAFE_INTEGER
}

export function launch(round: Round, angle: number, velocity: number): boolean {
  if (round.shot.active || !validThrow(angle, velocity)) return false
  const player = round.players[round.turn]
  const radians = angle * Math.PI / 180
  const shot = round.shot
  shot.x = player.x + (round.turn === 0 ? 23 : 7)
  shot.y = player.y - 2
  shot.vx = Math.cos(radians) * velocity * (round.turn === 0 ? 1 : -1)
  shot.vy = -Math.sin(radians) * velocity
  shot.time = 0
  shot.frame = 0
  shot.active = true
  round.hit = 'none'
  round.victim = -1
  return true
}

export function launchMatch(match: Match, angle: number, velocity: number): boolean {
  if (match.phase !== 'aim' || !launch(match.round, angle, velocity)) return false
  match.phase = 'flight'
  match.elapsed = 0
  return true
}

export function insidePlayer(player: Player, x: number, y: number): boolean {
  // The broad-shouldered original hit box, inset at the feet and crown.
  return player.alive && x >= player.x + 2 && x <= player.x + 28 && y >= player.y + 2 && y <= player.y + 29
}

export function solidAt(round: Round, x: number, y: number): boolean {
  return x >= 0 && x < WIDTH && y >= 0 && y < GROUND && round.pixels[Math.floor(y) * WIDTH + Math.floor(x)] !== 1
}

export function carveCrater(round: Round, x: number, y: number, radius = CRATER_RADIUS): void {
  x = Math.round(x)
  y = Math.round(y)
  for (let dy = -radius; dy <= radius; dy++) {
    const py = y + dy
    if (py < 0 || py >= HEIGHT) continue
    const span = Math.floor(Math.sqrt(radius * radius - dy * dy))
    const left = Math.max(0, x - span)
    const right = Math.min(WIDTH - 1, x + span)
    if (left <= right) round.pixels.fill(1, py * WIDTH + left, py * WIDTH + right + 1)
  }
}

/** An exact constant-acceleration integration, swept at <=1 px to prevent collision tunnelling. No allocations. */
export function stepShot(round: Round, dt = FIXED_DT): void {
  const shot = round.shot
  if (!shot.active) return
  const ax = round.wind / 5
  const ay = round.gravity
  const nextX = shot.x + shot.vx * dt + ax * dt * dt / 2
  const nextY = shot.y + shot.vy * dt + ay * dt * dt / 2
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(nextX - shot.x), Math.abs(nextY - shot.y))))
  const startX = shot.x
  const startY = shot.y
  const dy = nextY - startY
  // Invisible, off-top travel needs no pixel probes, but horizontal escape still ends the throw below.
  const first = dy > 0 && startY < -16 ? Math.max(1, Math.floor((-16 - startY) / dy * steps)) : 1
  const last = dy < 0 && nextY < -16 ? Math.min(steps, Math.ceil((-16 - startY) / dy * steps)) : steps
  for (let i = first; i <= last; i++) {
    const x = startX + (nextX - startX) * i / steps
    const y = startY + (nextY - startY) * i / steps
    if (!round.sunGasp && (x - SUN_X) ** 2 + (y - SUN_Y) ** 2 <= (SUN_RADIUS + 2) ** 2) round.sunGasp = true
    let victim: Side | -1 = -1
    if (insidePlayer(round.players[0], x, y)) victim = 0
    else if (insidePlayer(round.players[1], x, y)) victim = 1
    if (victim !== -1 || solidAt(round, x, y)) {
      round.hit = victim === -1 ? 'building' : 'player'
      round.victim = victim
      round.impactX = shot.x = x
      round.impactY = shot.y = y
      shot.active = false
      return
    }
    if (x < 0 || x >= WIDTH || y > GROUND + 4) {
      round.hit = 'miss'
      round.impactX = shot.x = x
      round.impactY = shot.y = y
      shot.active = false
      return
    }
  }
  if (nextX < 0 || nextX >= WIDTH || nextY > GROUND + 4) {
    round.hit = 'miss'
    round.impactX = shot.x = nextX
    round.impactY = shot.y = nextY
    shot.active = false
    return
  }
  shot.x = nextX
  shot.y = nextY
  shot.vx += ax * dt
  shot.vy += ay * dt
  shot.time += dt
  shot.frame = Math.floor(shot.time * 16) % 4
}

export function finishThrow(match: Match): void {
  const round = match.round
  if (match.phase !== 'flight' || round.shot.active || round.hit === 'none') return
  match.elapsed = 0
  if (round.turn === 1) {
    round.cpu.throws++
    if (round.hit !== 'player' || round.victim !== 0) round.cpu.misses++
  }
  if (round.hit === 'miss') {
    round.turn = (1 - round.turn) as Side
    match.phase = 'aim'
    return
  }
  match.phase = 'explosion'
  match.explosionRadius = round.hit === 'player' ? PLAYER_RADIUS : CRATER_RADIUS
  if (round.hit === 'player' && round.victim !== -1) {
    const winner = (1 - round.victim) as Side
    round.players[round.victim].alive = false
    match.winner = winner
    match.scores[winner]++
  }
}

export function finishExplosion(match: Match): void {
  if (match.phase !== 'explosion') return
  const round = match.round
  carveCrater(round, round.impactX, round.impactY, match.explosionRadius)
  match.elapsed = 0
  if (round.hit === 'player') {
    match.phase = 'dance'
    match.danceBeat = 0
  } else {
    round.turn = (1 - round.turn) as Side
    match.phase = 'aim'
  }
}

export function finishDance(match: Match): void {
  if (match.phase !== 'dance') return
  if (match.scores[0] + match.scores[1] >= match.target) {
    match.phase = 'over'
    match.winner = match.scores[0] === match.scores[1] ? -1 : match.scores[0] > match.scores[1] ? 0 : 1
  } else {
    match.roundNumber++
    match.round = createRound(match.seed + Math.imul(match.roundNumber - 1, 0x9e3779b1), match.gravity, ((match.roundNumber - 1) % 2) as Side)
    match.phase = 'aim'
    match.winner = -1
  }
  match.elapsed = 0
}

export type Simulation = { hit: Round['hit']; victim: Side | -1; distance: number; x: number; y: number }

/** Simulation shares launch, fixed timestep, hitboxes and damaged bitmap with actual play. It never changes the city. */
export function simulateThrow(round: Round, side: Side, angle: number, velocity: number): Simulation {
  const trial: Round = {
    ...round, turn: side, sunGasp: false, hit: 'none', victim: -1,
    shot: { x: 0, y: 0, vx: 0, vy: 0, time: 0, frame: 0, active: false },
  }
  if (!launch(trial, angle, velocity)) return { hit: 'miss', victim: -1, distance: Infinity, x: 0, y: 0 }
  const target = round.players[1 - side]
  let distance = Infinity
  // Bound CPU thinking without clipping ordinary arcs at the top of the screen.
  for (let i = 0; trial.shot.active && i < 120000; i++) {
    stepShot(trial)
    const d = Math.hypot(trial.shot.x - target.x - 15, trial.shot.y - target.y - 15)
    if (d < distance) distance = d
  }
  return { hit: trial.hit, victim: trial.victim, distance, x: trial.shot.x, y: trial.shot.y }
}

/** Try mid arcs first, widening only when no unobstructed lob survives the live collision simulation. */
export function solveCpuThrow(round: Round, side: Side = 1): Throw {
  const source = round.players[side]
  const target = round.players[1 - side]
  const facing = side === 0 ? 1 : -1
  const dx = (target.x + 15 - source.x - (side === 0 ? 23 : 7)) * facing
  const dy = target.y + 15 - source.y + 2
  const wind = round.wind / 5 * facing
  let best: Throw = { angle: 52.5, velocity: 65 }
  let bestDistance = Infinity
  const normalVelocity = Math.max(100, 100 * Math.sqrt(round.gravity / 9.8))
  const error = 2 ** -round.cpu.misses
  const minMissAngle = 23 + 8 * error
  // A nominal hit through a fresh crater can be a one-pixel accident. Probe a small
  // neighbourhood, never larger than the remaining actual novice error.
  const angleMargin = Math.min(0.5, 8 * error)
  const velocityMargin = Math.min(0.01, 0.15 * error)
  // The first search leaves room for all of the novice error inside the usual human range.
  // Steeper arcs and then faster lobs are justified only by a blocked, live skyline.
  // An adjacent tall roof can require the final 81–85° range even at ordinary gravity.
  for (let pass = 0; pass < 4; pass++) {
    const minAngle = pass === 0 ? 23 : pass === 3 ? 81 : 15
    const maxAngle = pass === 0 ? 72 : pass === 3 ? 85 : 80
    let preferred: Throw | null = null
    const maxVelocity = pass === 0 ? normalVelocity / 1.15 : pass === 1 ? normalVelocity : normalVelocity * 2
    for (let i = 0; i <= 150; i++) {
      const angle = 52.5 + (i % 2 === 1 ? 1 : -1) * Math.ceil(i / 2) * 0.5
      if (angle < minAngle || angle > maxAngle) continue
      const radians = angle * Math.PI / 180
      const tangent = Math.tan(radians)
      // Eliminate velocity from the original x/y equations at the target's centre.
      const timeSquared = 2 * (dy + dx * tangent) / (round.gravity + wind * tangent)
      if (!Number.isFinite(timeSquared) || timeSquared <= 0) continue
      const time = Math.sqrt(timeSquared)
      const velocity = (dx / time - wind * time / 2) / Math.cos(radians)
      if (!validThrow(angle, velocity) || velocity > maxVelocity) continue
      if (pass === 1 && angle >= 23 && angle <= 72 && velocity <= normalVelocity / 1.15
        || pass === 2 && velocity <= normalVelocity) continue
      // UI precision is part of aiming: a candidate must hit when actually typed.
      const typedAngle = Math.round(angle * 10) / 10
      const typedVelocity = Math.round(velocity * 10) / 10
      const result = simulateThrow(round, side, typedAngle, typedVelocity)
      if (result.hit === 'player' && result.victim === 1 - side) {
        if (preferred === null) preferred = { angle: typedAngle, velocity: typedVelocity }
        let stable = true
        const angleLimit = typedAngle > 80 ? 89 : 80
        for (let angleDirection = -1; angleDirection <= 1 && stable; angleDirection += 2) {
          const probeAngle = Math.round(Math.max(15, Math.min(angleLimit, typedAngle + angleDirection * angleMargin)) * 10) / 10
          for (let velocityDirection = -1; velocityDirection <= 1; velocityDirection += 2) {
            const probeVelocity = Math.round(typedVelocity * (1 + velocityDirection * velocityMargin) * 10) / 10
            const probe = simulateThrow(round, side, probeAngle, probeVelocity)
            if (probe.hit !== 'player' || probe.victim !== 1 - side) {
              stable = false
              break
            }
          }
        }
        if (stable) {
          return preferred.angle === typedAngle ? preferred : { angle: typedAngle, velocity: typedVelocity }
        }
        continue
      }
      // When even the expanded lobs are blocked, prefer the closest real building impact.
      // Keep a blocked miss above 23° even after its full remaining novice angle error.
      if (angle >= minMissAngle && result.hit === 'building'
        && (result.distance < bestDistance || result.distance === bestDistance && angle > best.angle)) {
        bestDistance = result.distance
        best = { angle: typedAngle, velocity: typedVelocity }
      }
    }
    // Stability must not force a faster or steeper fallback when this range already
    // has a real hit. Full novice errors are still applied independently afterward.
    if (preferred !== null) return preferred
  }
  return best
}

export function chooseCpuThrow(round: Round): Throw {
  const estimate = solveCpuThrow(round)
  const error = 2 ** -round.cpu.misses
  const maxAngle = estimate.angle > 80 ? 89 : 80
  return {
    angle: Math.max(15, Math.min(maxAngle, estimate.angle + (round.cpu.rng() * 2 - 1) * 8 * error)),
    velocity: Math.max(0.001, estimate.velocity * (1 + (round.cpu.rng() * 2 - 1) * 0.15 * error)),
  }
}
