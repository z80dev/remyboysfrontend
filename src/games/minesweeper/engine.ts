import { mulberry32 } from '../kit/remy'

export type Level = 'beginner' | 'intermediate' | 'expert' | 'custom'
export type Config = { rows: number; cols: number; mines: number }
export const LEVELS: Record<Exclude<Level, 'custom'>, Config> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
}
export const HIDDEN = 0
export const REVEALED = 1
export const FLAG = 2
export const QUESTION = 3
export type Game = {
  config: Config
  seed: number
  mines: Uint8Array
  numbers: Uint8Array
  cells: Uint8Array
  status: 'ready' | 'playing' | 'won' | 'lost'
  seconds: number
  exploded: number
}

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, Number.isFinite(value) ? Math.trunc(value) : low))
export function clampCustom(rows: number, cols: number, mines: number): Config {
  const h = clamp(rows, 9, 24)
  const w = clamp(cols, 9, 30)
  return { rows: h, cols: w, mines: clamp(mines, 10, (h - 1) * (w - 1)) }
}

export function neighbors(config: Config, index: number): number[] {
  const out: number[] = []
  const x = index % config.cols
  const y = Math.floor(index / config.cols)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && x + dx >= 0 && x + dx < config.cols && y + dy >= 0 && y + dy < config.rows) {
        out.push((y + dy) * config.cols + x + dx)
      }
    }
  }
  return out
}

export function calculateNumbers(config: Config, mines: Uint8Array): Uint8Array {
  const out = new Uint8Array(mines.length)
  for (let i = 0; i < mines.length; i++) {
    if (mines[i]) for (const n of neighbors(config, i)) out[n]++
  }
  return out
}

export function createGame(config: Config, seed: number): Game {
  const count = config.rows * config.cols
  const mines = new Uint8Array(count)
  const order = Array.from({ length: count }, (_, i) => i)
  const random = mulberry32(seed)
  for (let i = 0; i < config.mines; i++) {
    const j = i + Math.floor(random() * (count - i))
    const pick = order[j]
    order[j] = order[i]
    mines[pick] = 1
  }
  return { config: { ...config }, seed, mines, numbers: calculateNumbers(config, mines), cells: new Uint8Array(count), status: 'ready', seconds: 0, exploded: -1 }
}

export function flagCount(game: Game): number {
  let count = 0
  for (const cell of game.cells) if (cell === FLAG) count++
  return count
}
export function mineCounter(game: Game): number {
  return clamp(game.config.mines - flagCount(game), -99, 999)
}
export function tick(game: Game): Game {
  return game.status === 'playing' && game.seconds < 999 ? { ...game, seconds: game.seconds + 1 } : game
}
export function cycleMark(game: Game, index: number, marks: boolean): Game {
  if (index < 0 || index >= game.cells.length || game.status === 'won' || game.status === 'lost' || game.cells[index] === REVEALED) return game
  const cells = game.cells.slice()
  cells[index] = cells[index] === FLAG ? (marks ? QUESTION : HIDDEN) : cells[index] === QUESTION ? HIDDEN : FLAG
  return { ...game, cells }
}

function finish(game: Game): Game {
  if (game.status === 'lost') return game
  for (let i = 0; i < game.cells.length; i++) if (!game.mines[i] && game.cells[i] !== REVEALED) return game
  game.status = 'won'
  for (let i = 0; i < game.cells.length; i++) if (game.mines[i]) game.cells[i] = FLAG
  return game
}

// A queue, not recursive calls: even an empty maximum-size board has bounded stack use.
function openRegion(game: Game, start: number): void {
  if (game.cells[start] === FLAG || game.cells[start] === REVEALED) return
  if (game.mines[start]) {
    game.status = 'lost'
    game.exploded = start
    game.cells[start] = REVEALED
    return
  }
  const queue = new Int32Array(game.cells.length)
  let read = 0
  let write = 0
  queue[write++] = start
  game.cells[start] = REVEALED
  while (read < write) {
    const i = queue[read++]
    if (game.numbers[i]) continue
    for (const n of neighbors(game.config, i)) {
      if (game.mines[n] || game.cells[n] === FLAG || game.cells[n] === REVEALED) continue
      game.cells[n] = REVEALED
      queue[write++] = n
    }
  }
}

export function reveal(game: Game, index: number): Game {
  if (index < 0 || index >= game.cells.length || game.status === 'won' || game.status === 'lost' || game.cells[index] === FLAG || game.cells[index] === REVEALED) return game
  const next: Game = { ...game, cells: game.cells.slice() }
  if (game.status === 'ready') {
    next.status = 'playing'
    next.seconds = 1
    if (game.mines[index]) {
      const target = game.mines.findIndex((mine) => !mine)
      next.mines = game.mines.slice()
      next.mines[index] = 0
      next.mines[target] = 1
      next.numbers = calculateNumbers(next.config, next.mines)
    }
  }
  openRegion(next, index)
  return finish(next)
}

export function chordPreview(game: Game, index: number): number[] {
  if (index < 0 || index >= game.cells.length || game.status === 'won' || game.status === 'lost') return []
  return neighbors(game.config, index).filter((i) => game.cells[i] !== FLAG && game.cells[i] !== REVEALED)
}
export function chordCell(game: Game, index: number): Game {
  if (index < 0 || index >= game.cells.length || game.status !== 'playing' || game.cells[index] !== REVEALED || !game.numbers[index]) return game
  const around = neighbors(game.config, index)
  if (around.filter((i) => game.cells[i] === FLAG).length !== game.numbers[index]) return game
  const next = { ...game, cells: game.cells.slice() }
  for (const n of around) {
    openRegion(next, n)
    if (next.status === 'lost') break
  }
  return finish(next)
}
