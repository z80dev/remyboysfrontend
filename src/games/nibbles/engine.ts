import { mulberry32 } from '../kit/remy'

export const COLS = 80
export const ROWS = 50
export const CELLS = COLS * ROWS
export const UP = 0
export const RIGHT = 1
export const DOWN = 2
export const LEFT = 3
export type Direction = 0 | 1 | 2 | 3
export type Phase = 'ready' | 'playing' | 'paused' | 'over'
export type Options = { players: 1 | 2; skill: number; increaseSpeed: boolean; monochrome: boolean }
export type Start = { row: number; col: number; direction: Direction }
export type Snake = {
  cells: Uint16Array
  head: number
  size: number
  length: number
  direction: Direction
  turns: Uint8Array
  queued: number
  score: number
  lives: number
}
export type Game = {
  options: Options
  level: number
  phase: Phase
  snakes: Snake[]
  walls: Uint8Array
  occupied: Uint8Array
  next: Int16Array
  numberCell: number
  number: number
  eaten: number
  eater: number
  deaths: number
  random: () => number
}
export const EAT = 1
export const LEVEL = 2
export const DEATH = 4
export const GAME_OVER = 8
const DR = [-1, 0, 1, 0] as const
const DC = [0, 1, 0, -1] as const

export function cell(row: number, col: number): number {
  return (row - 1) * COLS + col - 1
}

export function layoutLevel(level: number): number {
  return level <= 13 ? Math.max(1, level) : 10 + (level - 10) % 4
}

/** The bible's coordinates are 1-based half-block rows, not 25-row text coordinates. */
export function buildWalls(level: number, walls = new Uint8Array(CELLS)): Uint8Array {
  walls.fill(0)
  const horizontal = (row: number, first: number, last: number) => {
    for (let col = first; col <= last; col++) walls[cell(row, col)] = 1
  }
  const vertical = (col: number, first: number, last: number) => {
    for (let row = first; row <= last; row++) walls[cell(row, col)] = 1
  }
  horizontal(3, 1, 80)
  horizontal(50, 1, 80)
  vertical(1, 3, 50)
  vertical(80, 3, 50)
  switch (layoutLevel(level)) {
    case 2:
      horizontal(25, 20, 60)
      break
    case 3:
      vertical(20, 10, 40)
      vertical(60, 10, 40)
      break
    case 4:
      vertical(20, 4, 30)
      vertical(60, 23, 49)
      horizontal(38, 2, 40)
      horizontal(15, 41, 79)
      break
    case 5:
      vertical(21, 13, 39)
      vertical(59, 13, 39)
      horizontal(11, 23, 57)
      horizontal(41, 23, 57)
      break
    case 6:
      for (let col = 10; col <= 70; col += 10) {
        vertical(col, 4, 22)
        vertical(col, 31, 49)
      }
      break
    case 7:
      for (let row = 4; row <= 49; row += 2) walls[cell(row, 40)] = 1
      break
    case 8:
      for (let col = 10; col <= 70; col += 20) vertical(col, 4, 40)
      for (let col = 20; col <= 60; col += 20) vertical(col, 13, 49)
      break
    case 9:
      for (let i = 6; i <= 47; i++) {
        walls[cell(i, i)] = 1
        walls[cell(i, i + 28)] = 1
      }
      break
    case 10:
      for (let col = 10; col <= 70; col += 10) {
        for (let row = col % 20 === 10 ? 4 : 5; row <= 49; row += 2) walls[cell(row, col)] = 1
      }
      break
    case 11:
      horizontal(12, 22, 38)
      horizontal(38, 22, 38)
      vertical(22, 12, 38)
      vertical(38, 26, 38)
      horizontal(26, 30, 38)
      vertical(44, 12, 38)
      vertical(62, 12, 38)
      for (let k = 0; k <= 8; k++) {
        walls[cell(12 + k, 45 + k)] = 1
        walls[cell(12 + k, 61 - k)] = 1
      }
      break
    case 12:
      vertical(20, 6, 46)
      for (const row of [10, 23, 36]) horizontal(row, 20, 60)
      vertical(40, 10, 36)
      vertical(60, 10, 36)
      for (let col = 49; col <= 52; col++) walls[cell(10, col)] = 0
      for (let col = 29; col <= 32; col++) walls[cell(36, col)] = 0
      for (const col of [30, 31, 50, 51]) walls[cell(23, col)] = 0
      for (const row of [16, 17, 29, 30]) walls[cell(row, 40)] = 0
      break
    case 13:
      horizontal(9, 32, 48)
      for (let k = 1; k <= 5; k++) {
        walls[cell(9 + k, 32 - k)] = 1
        walls[cell(9 + k, 48 + k)] = 1
      }
      vertical(27, 14, 34)
      vertical(53, 14, 34)
      for (let k = 1; k <= 4; k++) {
        walls[cell(34 + k, 27 + k)] = 1
        walls[cell(34 + k, 53 - k)] = 1
      }
      vertical(25, 21, 27)
      vertical(55, 21, 27)
      horizontal(17, 36, 46)
      vertical(35, 18, 30)
      horizontal(31, 36, 46)
      break
  }
  return walls
}

export function startPosition(level: number, player: number): Start {
  const jake = player === 1
  switch (layoutLevel(level)) {
    case 1: return { row: 25, col: jake ? 30 : 50, direction: jake ? LEFT : RIGHT }
    case 2:
    case 4: return { row: jake ? 43 : 7, col: jake ? 20 : 60, direction: jake ? RIGHT : LEFT }
    case 3:
    case 5: return { row: 25, col: jake ? 30 : 50, direction: jake ? DOWN : UP }
    case 9: return { row: jake ? 15 : 40, col: jake ? 5 : 75, direction: jake ? DOWN : UP }
    default: return { row: jake ? 43 : 7, col: jake ? 15 : 65, direction: jake ? UP : DOWN }
  }
}

export function stepInterval(skill: number, level = 1, progressive = false): number {
  const base = 10 + (100 - Math.min(100, Math.max(1, skill))) * 1.6
  return progressive ? Math.max(10, base * 0.92 ** Math.max(0, level - 1)) : base
}

export function bodyCell(snake: Snake, depth: number): number {
  return snake.cells[(snake.head + depth) % CELLS]
}

function makeSnake(): Snake {
  return { cells: new Uint16Array(CELLS), head: 0, size: 2, length: 2, direction: RIGHT,
    turns: new Uint8Array(2), queued: 0, score: 0, lives: 5 }
}

export function createGame(seed: number, options: Options): Game {
  const game: Game = {
    options: { ...options, skill: Math.min(100, Math.max(1, Math.round(options.skill))) },
    level: 1, phase: 'ready', snakes: options.players === 2 ? [makeSnake(), makeSnake()] : [makeSnake()],
    walls: new Uint8Array(CELLS), occupied: new Uint8Array(CELLS), next: new Int16Array(2),
    numberCell: -1, number: 1, eaten: 0, eater: -1, deaths: 0, random: mulberry32(seed),
  }
  resetRound(game)
  return game
}

/** Choose uniformly from free two-half-cell number slots. A digit never hides a wall or snake. */
export function placeNumber(game: Game): void {
  let free = 0
  for (let row = 4; row <= 48; row++) {
    for (let col = 2; col <= 79; col++) {
      const at = cell(row, col)
      if (!game.walls[at] && !game.walls[at + COLS] && !game.occupied[at] && !game.occupied[at + COLS]) free++
    }
  }
  let choice = Math.floor(game.random() * free)
  game.numberCell = -1
  for (let row = 4; row <= 48; row++) {
    for (let col = 2; col <= 79; col++) {
      const at = cell(row, col)
      if (!game.walls[at] && !game.walls[at + COLS] && !game.occupied[at] && !game.occupied[at + COLS] && choice-- === 0) {
        game.numberCell = at
        return
      }
    }
  }
}

/** Reset positions/length/number sequence, preserving scores and remaining lives. */
export function resetRound(game: Game): void {
  buildWalls(game.level, game.walls)
  game.occupied.fill(0)
  game.number = 1
  game.phase = 'ready'
  for (let player = 0; player < game.snakes.length; player++) {
    const snake = game.snakes[player]
    const start = startPosition(game.level, player)
    snake.head = 0
    snake.size = 2
    snake.length = 2
    snake.direction = start.direction
    snake.queued = 0
    snake.cells[0] = cell(start.row, start.col)
    snake.cells[1] = cell(start.row - DR[start.direction], start.col - DC[start.direction])
    game.occupied[snake.cells[0]] = player + 1
    game.occupied[snake.cells[1]] = player + 1
  }
  placeNumber(game)
}

/** Two intentional turns can be buffered, one consumed per simulation step. Repeats/reversals cannot fill the queue. */
export function queueTurn(game: Game, player: number, direction: Direction): boolean {
  if (game.phase !== 'playing') return false
  const snake = game.snakes[player]
  if (!snake || snake.queued === 2) return false
  const previous = snake.queued ? snake.turns[snake.queued - 1] : snake.direction
  if (direction === previous || direction === (previous + 2) % 4) return false
  snake.turns[snake.queued++] = direction
  return true
}

export function pauseGame(game: Game): boolean {
  if (game.phase !== 'playing') return false
  game.phase = 'paused'
  for (const snake of game.snakes) snake.queued = 0
  return true
}

export function continueGame(game: Game): boolean {
  if (game.phase !== 'ready' && game.phase !== 'paused') return false
  game.phase = 'playing'
  game.deaths = 0
  return true
}

/** Fixed-step mutation with reusable scratch buffers: collision resolution is simultaneous and allocates nothing. */
export function stepGame(game: Game): number {
  if (game.phase !== 'playing') return 0
  let dead = 0
  game.eaten = 0
  game.eater = -1
  for (let player = 0; player < game.snakes.length; player++) {
    const snake = game.snakes[player]
    if (snake.queued) {
      snake.direction = snake.turns[0] as Direction
      snake.turns[0] = snake.turns[1]
      snake.queued--
    }
    const old = bodyCell(snake, 0)
    const row = Math.floor(old / COLS) + 1 + DR[snake.direction]
    const col = old % COLS + 1 + DC[snake.direction]
    const next = cell(row, col)
    game.next[player] = next
    if (row < 3 || row > 50 || col < 1 || col > 80 || game.walls[next] || game.occupied[next]) dead |= 1 << player
  }
  if (game.snakes.length === 2 && game.next[0] === game.next[1]) dead = 3
  if (dead) {
    game.deaths = dead
    let over = false
    for (let player = 0; player < game.snakes.length; player++) {
      if (!(dead & (1 << player))) continue
      const snake = game.snakes[player]
      snake.score -= 10
      snake.lives--
      if (snake.lives === 0) over = true
    }
    if (over) {
      game.phase = 'over'
      return DEATH | GAME_OVER
    }
    resetRound(game)
    return DEATH
  }
  for (let player = 0; player < game.snakes.length; player++) {
    const snake = game.snakes[player]
    const next = game.next[player]
    if (next === game.numberCell || next === game.numberCell + COLS) {
      snake.score += game.number
      snake.length += 4 * game.number
      game.eaten = game.number
      game.eater = player
    }
    if (snake.size < snake.length) snake.size++
    else game.occupied[bodyCell(snake, snake.size - 1)] = 0
    snake.head = (snake.head + CELLS - 1) % CELLS
    snake.cells[snake.head] = next
    game.occupied[next] = player + 1
  }
  if (!game.eaten) return 0
  if (game.number === 9) {
    game.level++
    game.deaths = 0
    resetRound(game)
    return EAT | LEVEL
  }
  game.number++
  placeNumber(game)
  return EAT
}

export function formatScore(score: number): string {
  const digits = String(Math.abs(score) * 100).padStart(7, '0')
  return (score < 0 ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
