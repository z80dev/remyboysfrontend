import { mulberry32 } from '../kit/remy'

export const WIDTH = 640
export const HEIGHT = 350
export const GROUND = 330
export const FIXED_DT = 1 / 60
export const METERS_TO_PIXELS = 2
export const FLIGHT_RATE = 3
export const CRATER_RADIUS = 13
export const PLAYER_RADIUS = 28
export const SUN_X = 320
export const SUN_Y = 25
export const SUN_RADIUS = 12

export type Side = 0 | 1
export type Building = { x: number; y: number; width: number; color: number; tower: boolean }
export type Player = { x: number; y: number; alive: boolean; building: number }
export type Shot = {
  x: number; y: number; vx: number; vy: number; time: number; frame: number; active: boolean; clearedThrower: boolean
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
  let remaining = WIDTH
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
    x += widths[i]
  }
  if (rng() < 0.4) {
    const candidates = buildings.filter((_, i) => i !== left && i !== right)
    const tower = candidates[Math.floor(rng() * candidates.length)]
    tower.tower = true
    tower.color = 5
    tower.y = Math.max(60, Math.min(...buildings.map((b) => b.y)) - 20)
  }
  const pixels = new Uint8Array(WIDTH * HEIGHT)
  pixels.fill(1)
  for (const building of buildings) {
    for (let y = building.y; y < GROUND; y++) pixels.fill(building.color, y * WIDTH + building.x, y * WIDTH + building.x + building.width)
    for (let wy = building.y + 8, row = 0; wy + 6 < GROUND; wy += 15, row++) {
      for (let wx = building.x + 6, col = 0; wx + 3 < building.x + building.width - 3; wx += 10, col++) {
        const mark = building.tower && ((row === 0 || row === 4) && col >= 1 && col <= 3 || row > 0 && row < 4 && col === 1)
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
    shot: { x: 0, y: 0, vx: 0, vy: 0, time: 0, frame: 0, active: false, clearedThrower: false },
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
  return Number.isFinite(angle) && angle >= 0 && angle <= 360 && Number.isFinite(velocity) && velocity > 0 && velocity <= 1000
}

export function launch(round: Round, angle: number, velocity: number): boolean {
  if (round.shot.active || !validThrow(angle, velocity)) return false
  const player = round.players[round.turn]
  const radians = angle * Math.PI / 180
  const shot = round.shot
  shot.x = player.x + (round.turn === 0 ? 23 : 7)
  shot.y = player.y - 2
  shot.vx = Math.cos(radians) * velocity * METERS_TO_PIXELS * (round.turn === 0 ? 1 : -1)
  shot.vy = -Math.sin(radians) * velocity * METERS_TO_PIXELS
  shot.time = 0
  shot.frame = 0
  shot.active = true
  shot.clearedThrower = false
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
  const ax = round.wind * METERS_TO_PIXELS
  const ay = round.gravity * METERS_TO_PIXELS
  const nextX = shot.x + shot.vx * dt + ax * dt * dt / 2
  const nextY = shot.y + shot.vy * dt + ay * dt * dt / 2
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(nextX - shot.x), Math.abs(nextY - shot.y))))
  const startX = shot.x
  const startY = shot.y
  for (let i = 1; i <= steps; i++) {
    const x = startX + (nextX - startX) * i / steps
    const y = startY + (nextY - startY) * i / steps
    if (!round.sunGasp && (x - SUN_X) ** 2 + (y - SUN_Y) ** 2 <= (SUN_RADIUS + 2) ** 2) round.sunGasp = true
    if (!shot.clearedThrower && (x < round.players[round.turn].x - 4 || x > round.players[round.turn].x + 34
      || y < round.players[round.turn].y - 5 || y > round.players[round.turn].y + 34)) shot.clearedThrower = true
    let victim: Side | -1 = -1
    if ((shot.clearedThrower || round.turn !== 0) && insidePlayer(round.players[0], x, y)) victim = 0
    else if ((shot.clearedThrower || round.turn !== 1) && insidePlayer(round.players[1], x, y)) victim = 1
    if (victim !== -1 || solidAt(round, x, y)) {
      round.hit = victim === -1 ? 'building' : 'player'
      round.victim = victim
      round.impactX = shot.x = x
      round.impactY = shot.y = y
      shot.active = false
      return
    }
    if (x < -3 || x > WIDTH + 3 || y > GROUND + 4) {
      round.hit = 'miss'
      round.impactX = shot.x = x
      round.impactY = shot.y = y
      shot.active = false
      return
    }
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
  if (match.scores[0] >= match.target || match.scores[1] >= match.target) match.phase = 'over'
  else {
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
    shot: { x: 0, y: 0, vx: 0, vy: 0, time: 0, frame: 0, active: false, clearedThrower: false },
  }
  if (!launch(trial, angle, velocity)) return { hit: 'miss', victim: -1, distance: Infinity, x: 0, y: 0 }
  const target = round.players[1 - side]
  let distance = Infinity
  // The maximum legal velocity and minimum setup gravity are bounded; high arcs are still allowed to leave the top.
  for (let i = 0; trial.shot.active && i < 120000; i++) {
    stepShot(trial)
    const d = Math.hypot(trial.shot.x - target.x - 15, trial.shot.y - target.y - 15)
    if (d < distance) distance = d
  }
  return { hit: trial.hit, victim: trial.victim, distance, x: trial.shot.x, y: trial.shot.y }
}

/** Refine flight-time estimates with the same collision simulation used by human throws. No trajectory is exposed to the UI. */
export function solveCpuThrow(round: Round, side: Side = 1): Throw {
  const source = round.players[side]
  const target = round.players[1 - side]
  const dx = target.x + 15 - source.x - (side === 0 ? 23 : 7)
  const dy = target.y + 15 - source.y + 2
  const ax = round.wind * METERS_TO_PIXELS
  const ay = round.gravity * METERS_TO_PIXELS
  let best: Throw = { angle: 45, velocity: 65 }
  let bestDistance = Infinity
  // Starting low and increasing the arc is an iterative estimate: obstacles select the needed height.
  for (let t = 1.5; t <= 32; t += 0.25) {
    const vx = dx / t - ax * t / 2
    const vy = dy / t - ay * t / 2
    const angle = (Math.atan2(-vy, vx * (side === 0 ? 1 : -1)) * 180 / Math.PI + 360) % 360
    const velocity = Math.hypot(vx, vy) / METERS_TO_PIXELS
    if (!validThrow(angle, velocity)) continue
    const result = simulateThrow(round, side, angle, velocity)
    if (result.hit === 'player' && result.victim === 1 - side) return { angle, velocity }
    if (result.distance < bestDistance) {
      bestDistance = result.distance
      best = { angle, velocity }
    }
  }
  return best
}

export function chooseCpuThrow(round: Round): Throw {
  const estimate = solveCpuThrow(round)
  const error = 2 ** -round.cpu.misses
  return {
    angle: Math.max(0, Math.min(360, estimate.angle + (round.cpu.rng() * 2 - 1) * 8 * error)),
    velocity: Math.max(0.001, Math.min(1000, estimate.velocity * (1 + (round.cpu.rng() * 2 - 1) * 0.15 * error))),
  }
}
