import { MISSION_NAMES, RANKS, missionGoal as goalText, ruleMessage } from './strings'
import type { MissionId } from './strings'

export { RANKS }
export type { MissionId } from './strings'

export type TableEvent =
  | 'ramp' | 'reentry' | 'bumper' | 'drop' | 'spot' | 'hyperspace' | 'leftHazard' | 'rightHazard'
  | 'blackhole' | 'fuel' | 'wormhole' | 'spinner' | 'satellite' | 'lane' | 'outlane' | 'rebound' | 'warp' | 'bonus' | 'engine'

export type Mission = {
  id: MissionId
  stage: number
  progress: number
  target: number
  mask: number
}

export type Player = {
  score: number
  /** Zero-based rank. Cadet needs two completions; every later promotion needs three. */
  rank: number
  /** Normal balls already consumed; extra balls do not advance this counter. */
  ballsPlayed: number
  extraBalls: number
  /** A replay is a free new game credit, not an extra ball in this game. */
  replays: number
  completedMissions: number
  promotionProgress: number
  wraps: number
}

export type Game = {
  players: Player[]
  currentPlayer: number
  readonly player: Player
  readonly ball: number
  phase: 'ready' | 'playing' | 'over'
  /** All rule timestamps are seconds of unpaused game time. */
  time: number
  /** First launch of this ball; a saved redeployment never restarts its ten-second window. */
  launchedAt: number
  ballSaveUsed: boolean
  extraBall: boolean
  tilted: boolean
  /** Sticky for the whole game, including all hotseat players. */
  testMode: boolean
  /** THE CABALD's denial is announced at most once per game. */
  cabaldMessageShown: boolean
  selectedMission: MissionId
  mission: Mission | null
  fuel: number
  multiplier: number
  laneCount: number
  missionCount: number
  lastBonus: number
  bumperLevel: number
  engineLevel: number
  flagLevel: number
  spinnerCount: number
  reentryLights: number
  dropTargets: number
  spotTargets: number
  engineTargets: number
  leftHazards: number
  rightHazards: number
  outlaneSave: number
  pendingSave: boolean
  postRaisedUntil: number
  extraBallLit: boolean
  wormholeColor: number
  hyperspaceCount: number
  lastHyperspaceAt: number
  message: string
  messageId: string
  messageSerial: number
  clockMessageAt: number
  /** Preallocated tilt history; the fourth nudge in an inclusive three-second window tilts. */
  nudgeTimes: Float64Array
  nudgeCount: number
}

export type HighScore = { name: string; score: number; rank: number }

export const MAX_SCORE = 999_999_999
export const BALL_SAVE_SECONDS = 10
export const FUEL_LOW = 20
export const FUEL_PER_SECOND = 1
export const NUDGE_LIMIT = 3
export const NUDGE_WINDOW = 3
export const HYPERSPACE_WINDOW = 10
export const POST_SECONDS = 20
export const FLAG_SPINS = 25

// These rules fill in the table's unspecified timing/bonus units without changing its mission structure.
// Table awards get the field multiplier; completion/promotion awards do not. Ball bonus adds rank as well.
export const POINTS = {
  bumper: 500,
  spot: 1_000,
  drop: 2_500,
  dropBank: 25_000,
  ramp: 5_000,
  wormhole: 10_000,
  mission: 50_000,
  promotion: 100_000,
  laneBonus: 1_000,
  missionBonus: 10_000,
  hyperspace: 10_000,
  blackhole: 20_000,
  fuel: 5_000,
  hazard: 1_000,
  engine: 500,
  spinner: 100,
  satellite: 1_000,
  lane: 1_000,
  rebound: 250,
  warp: 5_000,
  bonus: 1_000
} as const

const CADET: readonly MissionId[] = ['launch', 'bridge', 'gas', 'mint']
const JUNIOR: readonly MissionId[] = ['bug', 'recovery', 'menace', 'secret']
const OFFICER: readonly MissionId[] = ['airdrop', 'spike', 'rug', 'plague']
const SENIOR: readonly MissionId[] = ['ledger', 'recon', 'tower', 'reorg']
const ADMIRAL: readonly MissionId[] = ['plague', 'secret', 'reorg', 'cabald']

export function availableMissions(rank: number): readonly MissionId[] {
  if (rank <= 0) return CADET
  if (rank <= 2) return JUNIOR
  if (rank <= 4) return OFFICER
  if (rank <= 6) return SENIOR
  return ADMIRAL
}

function announce(game: Game, id: Parameters<typeof ruleMessage>[0], detail?: string | number) {
  // A simultaneous bank bonus or promotion must not hide score wraparound.
  if (id !== 'clock' && game.messageId === 'clock' && game.clockMessageAt === game.time) return
  if (id === 'clock') game.clockMessageAt = game.time
  game.messageId = id
  game.message = ruleMessage(id, detail)
  game.messageSerial++
}

function showGoal(game: Game) {
  if (game.messageId === 'clock' && game.clockMessageAt === game.time) return
  game.messageId = 'goal'
  game.message = missionGoal(game)
  game.messageSerial++
}

export function missionName(game: Game): string {
  return MISSION_NAMES[game.mission?.id ?? game.selectedMission]
}

export function missionGoal(game: Game): string {
  const mission = game.mission
  if (!mission) return goalText(game.selectedMission, 0, missionTarget(game.selectedMission, 0))
  return goalText(mission.id, mission.stage, Math.max(0, mission.target - mission.progress))
}

export function createGame(players = 1): Game {
  const count = Number.isFinite(players) ? Math.max(1, Math.min(4, Math.trunc(players))) : 1
  const game: Game = {
    players: Array.from({ length: count }, () => ({
      score: 0, rank: 0, ballsPlayed: 0, extraBalls: 0, replays: 0, completedMissions: 0, promotionProgress: 0, wraps: 0
    })),
    currentPlayer: 0,
    get player() { return this.players[this.currentPlayer] },
    get ball() { return Math.max(1, Math.min(3, this.player.ballsPlayed + (this.extraBall ? 0 : 1))) },
    phase: 'ready',
    time: 0,
    launchedAt: -1,
    ballSaveUsed: false,
    extraBall: false,
    tilted: false,
    testMode: false,
    cabaldMessageShown: false,
    selectedMission: 'launch',
    mission: null,
    fuel: 100,
    multiplier: 1,
    laneCount: 0,
    missionCount: 0,
    lastBonus: 0,
    bumperLevel: 1,
    engineLevel: 1,
    flagLevel: 1,
    spinnerCount: 0,
    reentryLights: 0,
    dropTargets: 0,
    spotTargets: 0,
    engineTargets: 0,
    leftHazards: 0,
    rightHazards: 0,
    outlaneSave: 0,
    pendingSave: false,
    postRaisedUntil: 0,
    extraBallLit: false,
    wormholeColor: 0,
    hyperspaceCount: 0,
    lastHyperspaceAt: -Infinity,
    message: '',
    messageId: '',
    messageSerial: 0,
    clockMessageAt: -Infinity,
    nudgeTimes: new Float64Array(NUDGE_LIMIT + 1),
    nudgeCount: 0
  }
  announce(game, 'awaiting')
  return game
}

export function selectMission(game: Game, index: number): boolean {
  if (game.phase === 'over' || game.mission || !Number.isInteger(index)) return false
  const mission = availableMissions(game.player.rank)[index]
  if (!mission) return false
  game.selectedMission = mission
  announce(game, 'selected', missionName(game))
  return true
}

function missionTarget(id: MissionId, stage: number): number {
  switch (id) {
    case 'launch': case 'bridge': case 'ledger': case 'tower': return 3
    case 'gas': return 8
    case 'mint': return 9
    case 'bug': case 'recon': return 15
    case 'recovery': return stage === 0 ? FLAG_SPINS : 1
    case 'menace': return stage === 0 ? 3 : 8
    case 'secret': return 1
    case 'airdrop': case 'spike': case 'rug': return stage === 0 ? 3 : 1
    case 'plague': return stage === 0 ? 75 : 1
    case 'reorg': return stage === 0 ? 25 : 1
    case 'cabald': return stage < 2 ? 3 : stage === 2 ? 5 : 1
  }
}

function acceptMission(game: Game) {
  // Rank changes can invalidate a previously selected mission before the next ramp.
  const choices = availableMissions(game.player.rank)
  if (!choices.includes(game.selectedMission)) game.selectedMission = choices[0]
  const id = game.selectedMission
  game.mission = { id, stage: 0, progress: id === 'recovery' ? game.spinnerCount : 0, target: missionTarget(id, 0), mask: 0 }
  if (id === 'tower') game.outlaneSave |= 3
  announce(game, 'accepted', missionName(game))
}

function nextStage(game: Game) {
  const mission = game.mission!
  mission.stage++
  mission.progress = 0
  mission.mask = 0
  mission.target = missionTarget(mission.id, mission.stage)
  showGoal(game)
}

function award(game: Game, amount: number, field = true) {
  const player = game.player
  const sum = player.score + amount * (field ? game.multiplier : 1)
  if (sum > MAX_SCORE) {
    player.wraps += Math.floor(sum / (MAX_SCORE + 1))
    player.score = sum % (MAX_SCORE + 1)
    announce(game, 'clock')
  } else player.score = sum
}

function finishMission(game: Game, reorg: -1 | 0 | 1 = 0) {
  const mission = game.mission!
  const player = game.player
  const oldRank = player.rank
  const cabaldFirst = mission.id === 'cabald' && !game.cabaldMessageShown
  award(game, POINTS.mission * (oldRank + 1), false)
  player.completedMissions++
  game.missionCount++
  game.mission = null
  if (mission.id === 'reorg') {
    player.rank = Math.max(0, Math.min(RANKS.length - 1, oldRank + reorg))
    player.promotionProgress = 0
    if (player.rank > oldRank) award(game, POINTS.promotion, false)
    announce(game, 'reorg', RANKS[player.rank])
  } else {
    player.promotionProgress++
    const required = oldRank === 0 ? 2 : 3
    if (player.promotionProgress >= required && oldRank < RANKS.length - 1) {
      player.rank++
      player.promotionProgress = 0
      award(game, POINTS.promotion, false)
      announce(game, 'promotion', RANKS[player.rank])
    } else {
      if (oldRank === RANKS.length - 1) player.promotionProgress = Math.min(player.promotionProgress, required)
      announce(game, mission.id === 'recovery' ? 'recoveryCompleted' : cabaldFirst ? 'cabaldCompleted' : 'completed')
    }
  }
  if (mission.id !== 'reorg' && player.rank > oldRank) {
    if (mission.id === 'recovery') game.message += ` ${ruleMessage('recoveryCompleted')}`
    else if (cabaldFirst) game.message += ` ${ruleMessage('cabaldCompleted')}`
  }
  if (cabaldFirst) game.cabaldMessageShown = true
  const choices = availableMissions(player.rank)
  if (!choices.includes(game.selectedMission)) game.selectedMission = choices[0]
}

function isLane(event: TableEvent): boolean {
  return event === 'reentry' || event === 'lane' || event === 'outlane' || event === 'fuel' || event === 'warp' || event === 'bonus'
}

function countBits(mask: number): number {
  return (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1)
}

function progressMission(game: Game, event: TableEvent, index: number, upgraded: boolean) {
  const mission = game.mission
  if (!mission) return
  let counted = false
  let advance = false
  let complete = false
  let reorg: -1 | 0 | 1 = 0
  switch (mission.id) {
    case 'launch': counted = event === 'ramp' && game.fuel > 0; break
    case 'bridge': counted = event === 'reentry'; break
    case 'gas': counted = event === 'bumper'; break
    case 'mint': counted = event === 'drop'; break
    case 'bug': counted = event === 'drop' || event === 'spot' || event === 'leftHazard' || event === 'rightHazard' || event === 'engine'; break
    case 'ledger': counted = event === 'satellite'; break
    case 'recon': counted = isLane(event); break
    case 'tower': counted = event === 'outlane' && game.pendingSave; break
    case 'recovery':
      if (mission.stage === 0 && event === 'spinner') {
        mission.progress = upgraded ? mission.target : game.spinnerCount
        advance = upgraded
      } else counted = mission.stage === 1 && event === 'hyperspace'
      break
    case 'menace':
      if (mission.stage === 0 && event === 'reentry') {
        mission.mask |= 1 << index
        mission.progress = countBits(mission.mask)
        advance = upgraded
      } else counted = mission.stage === 1 && event === 'bumper'
      break
    case 'secret':
      if (event === 'wormhole' && index === mission.stage) {
        if (mission.stage === 2) complete = true
        else advance = true
      }
      break
    case 'airdrop': case 'spike': case 'rug': {
      const targetEvent = mission.id === 'airdrop' ? 'rightHazard' : mission.id === 'spike' ? 'leftHazard' : 'engine'
      if (mission.stage === 0 && event === targetEvent) {
        mission.mask |= 1 << index
        mission.progress = countBits(mission.mask)
        advance = mission.id === 'rug' ? upgraded : mission.mask === 7
      } else if (mission.stage === 1) {
        counted = mission.id === 'airdrop' ? event === 'hyperspace' : mission.id === 'spike' ? event === 'wormhole' : event === 'blackhole'
      }
      break
    }
    case 'plague':
      counted = mission.stage === 0 ? event === 'spinner' : event === 'warp'
      break
    case 'reorg':
      if (mission.stage === 0) counted = event === 'rebound'
      else if ((event === 'ramp' && game.fuel > 0) || event === 'hyperspace') {
        complete = true
        reorg = event === 'ramp' ? 1 : -1
      }
      break
    case 'cabald':
      if (mission.stage < 2) {
        if (event === (mission.stage === 0 ? 'drop' : 'spot')) {
          mission.mask |= 1 << index
          mission.progress = countBits(mission.mask)
          advance = mission.mask === 7
        }
      } else if (mission.stage === 2) counted = isLane(event)
      else if (mission.stage === 3) counted = event === 'fuel'
      else if (mission.stage === 4) counted = event === 'ramp' && game.fuel > 0
      else if (mission.stage === 5) counted = event === 'spinner'
      else if (mission.stage === 6) counted = event === 'wormhole'
      else counted = event === 'hyperspace'
      break
  }
  if (counted) {
    mission.progress++
    if (mission.progress >= mission.target) {
      if ((mission.id === 'plague' || mission.id === 'reorg') && mission.stage === 0) advance = true
      else if (mission.id === 'cabald' && mission.stage < 7) advance = true
      else complete = true
    }
  }
  if (complete) finishMission(game, reorg)
  else if (advance) nextStage(game)
  else if (counted || (mission.stage === 0 && (event === 'spinner' || event === 'reentry' || event === 'engine' || event === 'leftHazard' || event === 'rightHazard'))) {
    showGoal(game)
  }
  if (game.mission?.id === 'tower' && counted) game.outlaneSave |= 3
}

export function hit(game: Game, event: TableEvent, index = 0): void {
  if (game.phase !== 'playing' || game.tilted) return
  if (!Number.isInteger(index) || index < 0) return
  if ((event === 'reentry' || event === 'drop' || event === 'spot' || event === 'engine' || event === 'leftHazard' || event === 'rightHazard' || event === 'wormhole') && index > 2) return
  if (event === 'outlane' && index > 1) return
  let upgraded = false
  const bit = 1 << index
  switch (event) {
    case 'ramp':
      award(game, POINTS.ramp)
      if (game.fuel <= 0) {
        announce(game, 'noFuel')
        return
      }
      if (!game.mission) {
        acceptMission(game)
        return
      }
      break
    case 'reentry':
      award(game, POINTS.lane)
      game.reentryLights |= bit
      if (game.reentryLights === 7) {
        game.reentryLights = 0
        game.bumperLevel = Math.min(4, game.bumperLevel + 1)
        upgraded = true
        announce(game, 'bumperUpgrade', game.bumperLevel)
      }
      break
    case 'bumper': award(game, POINTS.bumper * game.bumperLevel); break
    case 'drop':
      if (game.dropTargets & bit) return
      game.dropTargets |= bit
      award(game, POINTS.drop)
      if (game.dropTargets === 7) {
        game.dropTargets = 0
        award(game, POINTS.dropBank)
        game.multiplier = Math.min(5, game.multiplier + 1)
        announce(game, 'multiplier', game.multiplier)
      }
      break
    case 'spot':
      game.spotTargets |= bit
      award(game, POINTS.spot)
      if (!game.mission) {
        const choices = availableMissions(game.player.rank)
        selectMission(game, (choices.indexOf(game.selectedMission) + 1) % choices.length)
      }
      break
    case 'hyperspace':
      award(game, POINTS.hyperspace)
      game.hyperspaceCount = game.time - game.lastHyperspaceAt <= HYPERSPACE_WINDOW ? game.hyperspaceCount + 1 : 1
      game.lastHyperspaceAt = game.time
      if (game.hyperspaceCount === 3) {
        game.postRaisedUntil = game.time + POST_SECONDS
        announce(game, 'postRaised')
      } else if (game.hyperspaceCount >= 4) {
        game.hyperspaceCount = 0
        game.extraBallLit = true
        announce(game, 'extraBallLit')
      }
      break
    case 'leftHazard': case 'rightHazard': {
      award(game, POINTS.hazard)
      const left = event === 'leftHazard'
      if (left) game.leftHazards |= bit
      else game.rightHazards |= bit
      if ((left ? game.leftHazards : game.rightHazards) === 7) game.outlaneSave |= left ? 1 : 2
      break
    }
    case 'blackhole': award(game, POINTS.blackhole * game.engineLevel); break
    case 'fuel':
      award(game, POINTS.fuel)
      game.fuel = 100
      announce(game, 'refuel')
      break
    case 'wormhole':
      award(game, POINTS.wormhole)
      if (index === game.wormholeColor) {
        game.player.replays++
        announce(game, 'replay', game.player.replays)
      }
      break
    case 'spinner':
      award(game, POINTS.spinner * game.flagLevel)
      game.spinnerCount++
      if (game.spinnerCount >= FLAG_SPINS) {
        game.spinnerCount = 0
        game.flagLevel = Math.min(4, game.flagLevel + 1)
        upgraded = true
        announce(game, 'flagUpgrade', game.flagLevel)
      }
      break
    case 'satellite': award(game, POINTS.satellite); break
    case 'lane': award(game, POINTS.lane); break
    case 'outlane':
      award(game, POINTS.lane)
      if (game.outlaneSave & bit) {
        game.outlaneSave &= ~bit
        game.pendingSave = true
        if (index === 0) game.leftHazards = 0
        else game.rightHazards = 0
      }
      if (game.extraBallLit) awardExtraBall(game)
      break
    case 'rebound': award(game, POINTS.rebound); break
    case 'warp':
      award(game, POINTS.warp)
      game.wormholeColor = (game.wormholeColor + 1) % 3
      break
    case 'bonus':
      award(game, POINTS.bonus)
      if (game.extraBallLit) awardExtraBall(game)
      break
    case 'engine':
      award(game, POINTS.engine * game.engineLevel)
      game.engineTargets |= bit
      if (game.engineTargets === 7) {
        game.engineTargets = 0
        game.engineLevel = Math.min(4, game.engineLevel + 1)
        upgraded = true
        announce(game, 'engineUpgrade', game.engineLevel)
      }
      break
  }
  if (isLane(event)) game.laneCount++
  progressMission(game, event, index, upgraded)
}

function awardExtraBall(game: Game) {
  game.extraBallLit = false
  game.player.extraBalls++
  announce(game, 'extraBall')
}

export function rotateReentry(game: Game, direction: -1 | 1): void {
  const lights = game.reentryLights
  game.reentryLights = direction === 1 ? ((lights << 1) | (lights >> 2)) & 7 : ((lights >> 1) | (lights << 2)) & 7
}

export function launchRules(game: Game): boolean {
  if (game.phase !== 'ready') return false
  game.phase = 'playing'
  if (game.launchedAt < 0) game.launchedAt = game.time
  announce(game, 'launched')
  return true
}

export function tickRules(game: Game, dt: number): void {
  if (game.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return
  game.time += dt
  if (game.tilted) return
  const previous = game.fuel
  game.fuel = Math.max(0, previous - dt * FUEL_PER_SECOND)
  if (previous > FUEL_LOW && game.fuel <= FUEL_LOW) announce(game, 'lowFuel')
  if (previous > 0 && game.fuel === 0) announce(game, 'noFuel')
}

export function nudgeRules(game: Game, time = game.time): boolean {
  if (game.phase !== 'playing' || game.tilted || !Number.isFinite(time)) return false
  let count = 0
  for (let i = 0; i < game.nudgeCount; i++) {
    const at = game.nudgeTimes[i]
    if (time >= at && time - at <= NUDGE_WINDOW) game.nudgeTimes[count++] = at
  }
  game.nudgeTimes[count++] = time
  game.nudgeCount = count
  if (count > NUDGE_LIMIT) {
    game.tilted = true
    game.pendingSave = false
    game.postRaisedUntil = 0
    announce(game, 'tilt')
    return false
  }
  return true
}

function resetBall(game: Game) {
  game.phase = 'ready'
  game.launchedAt = -1
  game.ballSaveUsed = false
  game.tilted = false
  game.mission = null
  game.fuel = 100
  game.multiplier = 1
  game.laneCount = 0
  game.missionCount = 0
  game.bumperLevel = 1
  game.engineLevel = 1
  game.flagLevel = 1
  game.spinnerCount = 0
  game.reentryLights = 0
  game.dropTargets = 0
  game.spotTargets = 0
  game.engineTargets = 0
  game.leftHazards = 0
  game.rightHazards = 0
  game.outlaneSave = 0
  game.pendingSave = false
  game.postRaisedUntil = 0
  game.extraBallLit = false
  game.wormholeColor = 0
  game.hyperspaceCount = 0
  game.lastHyperspaceAt = -Infinity
  game.nudgeCount = 0
  const choices = availableMissions(game.player.rank)
  if (!choices.includes(game.selectedMission)) game.selectedMission = choices[0]
}

export function drainBall(game: Game): boolean {
  if (game.phase !== 'playing') return false
  const earlySave = !game.ballSaveUsed && game.launchedAt >= 0 && game.time - game.launchedAt <= BALL_SAVE_SECONDS
  if (!game.tilted && (game.pendingSave || earlySave)) {
    if (!game.pendingSave) game.ballSaveUsed = true
    game.pendingSave = false
    game.phase = 'ready'
    announce(game, 'saved')
    return true
  }
  game.lastBonus = game.tilted ? 0 : (game.laneCount * POINTS.laneBonus + game.missionCount * POINTS.missionBonus) * game.multiplier * (game.player.rank + 1)
  if (game.lastBonus) award(game, game.lastBonus, false)
  const player = game.player
  if (!game.extraBall) player.ballsPlayed++
  if (player.extraBalls > 0) {
    player.extraBalls--
    game.extraBall = true
    resetBall(game)
    announce(game, 'extraBall')
    return false
  }
  game.extraBall = false
  let next = game.currentPlayer
  for (let i = 1; i <= game.players.length; i++) {
    const candidate = (game.currentPlayer + i) % game.players.length
    if (game.players[candidate].ballsPlayed < 3) {
      next = candidate
      break
    }
  }
  if (game.players[next].ballsPlayed >= 3) {
    game.phase = 'over'
    game.mission = null
    game.pendingSave = false
    announce(game, 'gameOver')
  } else {
    game.currentPlayer = next
    resetBall(game)
    announce(game, game.players.length > 1 ? 'player' : 'bonus', game.players.length > 1 ? next + 1 : game.lastBonus.toLocaleString('en-US'))
  }
  return false
}

export function enableTestMode(game: Game): void {
  game.testMode = true
  announce(game, 'testMode')
}

export function sanitizeHighScores(value: unknown): HighScore[] {
  if (!Array.isArray(value)) return []
  const scores: HighScore[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Partial<HighScore>
    if (typeof record.name !== 'string' || typeof record.score !== 'number' || !Number.isInteger(record.score) || record.score < 0 || record.score > MAX_SCORE) continue
    if (typeof record.rank !== 'number' || !Number.isInteger(record.rank) || record.rank < 0 || record.rank >= RANKS.length) continue
    scores.push({ name: record.name.trim().slice(0, 32) || ruleMessage('anonymous'), score: record.score, rank: record.rank })
  }
  return scores.sort((a, b) => b.score - a.score).slice(0, 5)
}

export function qualifiesHighScore(scores: readonly HighScore[], score: number, testMode = false): boolean {
  if (testMode || !Number.isInteger(score) || score <= 0 || score > MAX_SCORE) return false
  const table = sanitizeHighScores(scores)
  return table.length < 5 || score > table[table.length - 1].score
}

export function recordHighScore(scores: readonly HighScore[], name: string, score: number, rank = 0, testMode = false): HighScore[] {
  const table = sanitizeHighScores(scores)
  if (!qualifiesHighScore(table, score, testMode) || !Number.isInteger(rank) || rank < 0 || rank >= RANKS.length) return table
  table.push({ name: name.trim().slice(0, 32) || ruleMessage('anonymous'), score, rank })
  return table.sort((a, b) => b.score - a.score).slice(0, 5)
}

export function highScoreCandidates(game: Game): { player: number; score: number; rank: number }[] {
  if (game.phase !== 'over' || game.testMode) return []
  return game.players
    .map((player, index) => ({ player: index, score: player.score, rank: player.rank }))
    .filter(player => player.score > 0)
    .sort((a, b) => b.score - a.score)
}
