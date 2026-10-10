import { mulberry32 } from '../kit'

export const COLS = 10
export const ROWS = 7
export const CELLS = COLS * ROWS
export type Direction = 0 | 1 | 2 | 3
export type Piece = 'empty' | 'horizontal' | 'vertical' | 'ne' | 'se' | 'sw' | 'nw' | 'cross' | 'source' | 'block' | 'reservoir-h' | 'reservoir-v' | 'valve-n' | 'valve-e' | 'valve-s' | 'valve-w' | 'drain'
export const PIECES: readonly Piece[] = ['horizontal', 'vertical', 'ne', 'se', 'sw', 'nw', 'cross']
export const CONNECTIONS: Record<Piece, readonly Direction[]> = {
  empty: [], horizontal: [1, 3], vertical: [0, 2], ne: [0, 1], se: [1, 2], sw: [2, 3], nw: [0, 3], cross: [0, 1, 2, 3],
  source: [], block: [], 'reservoir-h': [1, 3], 'reservoir-v': [0, 2], 'valve-n': [0, 2], 'valve-e': [1, 3],
  'valve-s': [0, 2], 'valve-w': [1, 3], drain: [0, 1, 2, 3]
}
export type Phase = 'countdown' | 'flow' | 'passed' | 'failed' | 'bonus-end'
export type Event = 'place' | 'replace' | 'slide' | 'section' | 'cross' | 'reservoir' | 'distance' | 'pass' | 'fail' | 'bonus'
export interface Portal { a: number; direction: Direction; b: number }
export interface PipeGame {
  seed: number
  random: number
  level: number
  bonus: boolean
  board: Piece[]
  filled: number[]
  placed: boolean[]
  queue: Piece[]
  portals: Portal[]
  source: number
  outlet: Direction
  head: number
  entry: Direction
  exit: Direction
  axis: number
  phase: Phase
  score: number
  length: number
  crosses: number
  fast: boolean
  clock: number
  started: number
  deadline: number
  duration: number
  replacement: { index: number; piece: Piece; until: number } | null
  gap: number
  events: Event[]
}
export function levelParameters(level: number) {
  return {
    distance: Math.min(40, 14 + 2 * (level - 1)), countdown: Math.max(6000, 20000 - 1000 * (level - 1)),
    section: Math.max(500, 2000 - 100 * level), obstacles: level < 3 ? 0 : 2 + Math.floor(level / 3)
  }
}
export function opposite(direction: Direction): Direction { return ((direction + 2) % 4) as Direction }
export function pipeExit(piece: Piece, entry: Direction): Direction | null {
  const ports = CONNECTIONS[piece]
  if (!ports.includes(entry)) return null
  if (piece === 'drain') return entry
  if (piece === 'cross') return opposite(entry)
  if (piece.startsWith('valve-')) {
    const outlet = ({ 'valve-n': 0, 'valve-e': 1, 'valve-s': 2, 'valve-w': 3 } as Record<string, Direction>)[piece]
    return entry === opposite(outlet) ? outlet : null
  }
  return ports[0] === entry ? ports[1] ?? null : ports[0] ?? null
}
function copy(game: PipeGame): PipeGame {
  return { ...game, events: [] }
}
function random(game: PipeGame): number {
  game.random = (game.random + 0x6d2b79f5) >>> 0
  return mulberry32(game.random)()
}
function nextPiece(game: PipeGame): Piece { return PIECES[Math.floor(random(game) * PIECES.length)] }
export function createGame(seed: number, level = 1, score = 0, bonus = false): PipeGame {
  const params = levelParameters(level)
  const game: PipeGame = {
    seed: seed >>> 0, random: seed >>> 0, level, bonus, board: Array<Piece>(CELLS).fill('empty'), filled: Array(CELLS).fill(0),
    placed: Array(CELLS).fill(false), queue: [], portals: [], source: 31, outlet: 1, head: 31, entry: 3, exit: 1, axis: 1,
    phase: 'countdown', score, length: 0, crosses: 0, fast: false, clock: 0, started: 0,
    deadline: bonus ? 15000 : params.countdown, duration: bonus ? 15000 : params.countdown, replacement: null, gap: -1, events: []
  }
  game.source = 10 + Math.floor(random(game) * 5) * COLS + 1 + Math.floor(random(game) * 3)
  game.head = game.source
  game.board[game.source] = 'source'
  const reserve = new Set([game.source, game.source + 1, game.source + 2, game.source + 3])
  const addFixed = (piece: Piece) => {
    const free = game.board.map((value, index) => value === 'empty' && !reserve.has(index) ? index : -1).filter(index => index >= 0)
    if (free.length) game.board[free[Math.floor(random(game) * free.length)]] = piece
  }
  if (bonus) {
    for (let i = 0; i < CELLS; i++) if (i !== game.source) { game.board[i] = nextPiece(game); game.placed[i] = true }
    game.gap = (game.source + 13) % CELLS
    game.board[game.gap] = 'empty'
    game.placed[game.gap] = false
  } else {
    if (level >= 13) {
      const row = Math.floor(random(game) * ROWS)
      const col = Math.floor(random(game) * COLS)
      game.portals = [{ a: row * COLS + COLS - 1, direction: 1, b: row * COLS }, { a: col, direction: 0, b: (ROWS - 1) * COLS + col }]
      for (const portal of game.portals) { reserve.add(portal.a); reserve.add(portal.b) }
    }
    if (level >= 5) { addFixed('reservoir-h'); addFixed('reservoir-v') }
    if (level >= 7) { addFixed('valve-e'); addFixed('valve-n') }
    if (level >= 9) addFixed('drain')
    for (let i = 0; i < Math.min(CELLS, params.obstacles); i++) addFixed('block')
  }
  for (let i = 0; i < 5; i++) game.queue.push(nextPiece(game))
  return game
}
export function nextCell(game: PipeGame, index: number, direction: Direction): number {
  const x = index % COLS
  const y = Math.floor(index / COLS)
  const outside = direction === 0 ? y === 0 : direction === 1 ? x === COLS - 1 : direction === 2 ? y === ROWS - 1 : x === 0
  if (!outside) return index + [-COLS, 1, COLS, -1][direction]
  for (const portal of game.portals) {
    if (portal.a === index && portal.direction === direction) return portal.b
    if (portal.b === index && opposite(portal.direction) === direction) return portal.a
  }
  return -1
}
function end(game: PipeGame, drain = false) {
  if (!game.bonus) {
    for (let i = 0; i < CELLS; i++) if (game.placed[i] && game.filled[i] === 0) game.score -= 100
    if (drain) game.score += 1000
  }
  game.phase = game.bonus ? 'bonus-end' : drain || game.length >= levelParameters(game.level).distance ? 'passed' : 'failed'
  game.events.push(game.bonus ? 'bonus' : game.phase === 'passed' ? 'pass' : 'fail')
}
function enterNext(game: PipeGame, time: number) {
  const next = nextCell(game, game.head, game.exit)
  if (next < 0) { end(game); return }
  const entry = opposite(game.exit)
  const exit = pipeExit(game.board[next], entry)
  const axis = entry % 2 === 1 ? 1 : 2
  if (exit === null || (game.filled[next] & axis) !== 0 || (game.board[next] !== 'cross' && game.filled[next] !== 0) || game.replacement?.index === next) { end(game); return }
  game.head = next
  game.entry = entry
  game.exit = exit
  game.axis = axis
  game.started = time
  game.duration = levelParameters(game.level).section * (game.board[next].startsWith('reservoir') ? 3 : 1) / (game.fast ? 8 : 1)
  game.deadline = time + game.duration
}
/** Pure event-time simulation: unchanged frames return the original state without allocations. */
export function advanceTo(game: PipeGame, time: number): PipeGame {
  if (time < game.clock || (game.phase !== 'countdown' && game.phase !== 'flow')) return game
  if (time < game.deadline && (!game.replacement || time < game.replacement.until)) return game
  const next = copy(game)
  while ((next.phase === 'countdown' || next.phase === 'flow') && (time >= next.deadline || (next.replacement && time >= next.replacement.until))) {
    if (next.replacement && next.replacement.until <= Math.min(time, next.deadline)) {
      if (next.board === game.board) next.board = [...game.board]
      if (next.placed === game.placed) next.placed = [...game.placed]
      next.board[next.replacement.index] = next.replacement.piece
      next.placed[next.replacement.index] = true
      next.clock = next.replacement.until
      next.replacement = null
      continue
    }
    const at = next.deadline
    next.clock = at
    if (next.filled === game.filled) next.filled = [...game.filled]
    if (next.phase === 'countdown') {
      next.phase = 'flow'
      next.filled[next.source] = 3
      enterNext(next, at)
      continue
    }
    const piece = next.board[next.head]
    const previous = next.filled[next.head]
    next.filled[next.head] |= next.axis
    next.length++
    const distance = levelParameters(next.level).distance
    next.score += next.bonus ? 100 : 50 * (next.fast ? 2 : 1) * (next.length > distance ? 2 : 1)
    next.events.push('section')
    if (!next.bonus && next.length === distance) next.events.push('distance')
    if (!next.bonus && piece === 'cross' && previous !== 0) {
      next.crosses++
      next.score += 500
      if (next.crosses === 5) next.score += 10000
      next.events.push('cross')
    }
    if (!next.bonus && piece.startsWith('reservoir')) { next.score += 200; next.events.push('reservoir') }
    if (piece === 'drain') { end(next, true); break }
    enterNext(next, at)
  }
  return next
}
export function placePiece(game: PipeGame, index: number, time: number): PipeGame {
  const current = advanceTo(game, time)
  if (index < 0 || index >= CELLS || !Number.isInteger(index) || current.replacement || (current.phase !== 'countdown' && current.phase !== 'flow')) return current
  if (current.bonus) return slidePiece(current, index, time)
  if (current.filled[index] || (current.phase === 'flow' && current.head === index)) return current
  if (current.board[index] !== 'empty' && !current.placed[index]) return current
  const next = copy(current)
  next.clock = time
  next.queue = [...current.queue]
  const piece = next.queue.pop()!
  next.queue.unshift(nextPiece(next))
  if (next.board[index] === 'empty') {
    next.board = [...current.board]
    next.placed = [...current.placed]
    next.board[index] = piece
    next.placed[index] = true
    next.events.push('place')
  } else {
    next.score -= 50
    next.replacement = { index, piece, until: time + 250 }
    next.events.push('replace')
  }
  return next
}
export function slidePiece(game: PipeGame, index: number, time: number): PipeGame {
  if (!game.bonus || !Number.isInteger(index) || index < 0 || index >= CELLS || (game.phase !== 'countdown' && game.phase !== 'flow')) return game
  const gap = game.gap
  if (Math.abs(index % COLS - gap % COLS) + Math.abs(Math.floor(index / COLS) - Math.floor(gap / COLS)) !== 1) return game
  if (index === game.source || game.filled[index] || (game.phase === 'flow' && game.head === index)) return game
  const next = copy(game)
  next.clock = time
  next.board = [...game.board]
  next.placed = [...game.placed]
  next.board[gap] = next.board[index]
  next.placed[gap] = true
  next.board[index] = 'empty'
  next.placed[index] = false
  next.gap = index
  next.events.push('slide')
  return next
}
export function fastFlow(game: PipeGame, time: number): PipeGame {
  const current = advanceTo(game, time)
  if (current.fast || current.bonus || (current.phase !== 'countdown' && current.phase !== 'flow')) return current
  const next = copy(current)
  next.clock = time
  next.fast = true
  if (next.phase === 'flow') {
    const progress = Math.max(0, Math.min(1, (time - next.started) / next.duration))
    next.duration /= 8
    next.started = time - progress * next.duration
    next.deadline = next.started + next.duration
  } else next.deadline = time
  return advanceTo(next, time)
}
export function followingLevel(game: PipeGame): PipeGame {
  if (game.phase === 'passed') return createGame(game.seed + game.level * 7919, game.level + (game.level % 4 === 0 ? 0 : 1), game.score, game.level % 4 === 0)
  if (game.phase === 'bonus-end') return createGame(game.seed + 104729, game.level + 1, game.score)
  return game
}
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export function passwordForLevel(level: number): string | null {
  if (level < 5 || level > 10001 || (level - 1) % 4 !== 0 || !Number.isInteger(level)) return null
  const value = ((level - 1) / 4 * 137 + 9137) % (26 ** 3)
  const a = Math.floor(value / 676)
  const b = Math.floor(value / 26) % 26
  const c = value % 26
  return ALPHABET[a] + ALPHABET[b] + ALPHABET[c] + ALPHABET[(a * 3 + b * 5 + c * 7) % 26]
}
export function levelForPassword(password: string): number | null {
  const text = password.trim().toUpperCase()
  if (!/^[A-Z]{4}$/.test(text)) return null
  for (let level = 5; level <= 10001; level += 4) if (passwordForLevel(level) === text) return level
  return null
}
export interface HighScore { name: string; score: number; level: number }
export interface Preferences { grid: boolean; scores: HighScore[]; passwords: string[] }
export const DEFAULT_PREFERENCES: Preferences = { grid: false, scores: [], passwords: [] }
export function validPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== 'object') return false
  const data = value as Preferences
  return typeof data.grid === 'boolean' && Array.isArray(data.scores) && data.scores.length <= 10 && data.scores.every(row =>
    row !== null && typeof row === 'object' && typeof row.name === 'string' && row.name.length <= 32 && Number.isFinite(row.score) && Number.isInteger(row.level) && row.level >= 1
  ) && Array.isArray(data.passwords) && data.passwords.every(word => typeof word === 'string' && levelForPassword(word) !== null)
}
export function addHighScore(scores: HighScore[], name: string, score: number, level: number): HighScore[] {
  return [...scores, { name: name.trim().slice(0, 32), score, level }].sort((a, b) => b.score - a.score).slice(0, 10)
}
