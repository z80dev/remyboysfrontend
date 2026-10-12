import { shuffle, type Card, type Suit } from '../cards/model'

export type Difficulty = 1 | 2 | 4
export type Position = { pile: number; depth: number }
export type Move = Position & { to: number }
export type Board = { piles: Card[][]; stock: Card[]; completed: Card[][] }
export type SpiderState = Board & { seed: number; difficulty: Difficulty; score: number; moves: number; history: Board[] }

/** Physical IDs never change. History stores board snapshots only: undo is itself a scored move.
 * Completing any suited King-to-Ace run clears history, creating the XP undo barrier.
 * Difficulty changes only the suit multiplicity, never the 104-card physical identity space.
 */
export function newGame(seed: number, difficulty: Difficulty = 1): SpiderState {
  const suits: Suit[] = difficulty === 1 ? ['spades'] : difficulty === 2 ? ['spades', 'hearts'] : ['spades', 'hearts', 'clubs', 'diamonds']
  const cards = shuffle(Array.from({ length: 104 }, (_, id) => ({ id, rank: id % 13 + 1, suit: suits[Math.floor(id / 13) % suits.length], faceUp: false })), seed)
  const piles: Card[][] = Array.from({ length: 10 }, () => [])
  for (let row = 0; row < 6; row++) for (let p = 0; p < (row === 5 ? 4 : 10); p++) piles[p].push(cards.shift()!)
  for (const pile of piles) pile[pile.length - 1].faceUp = true
  return { seed, difficulty, piles, stock: cards, completed: [], score: 500, moves: 0, history: [] }
}
const copyBoard = (s: Board): Board => ({ piles: s.piles.map(p => p.map(c => ({ ...c }))), stock: s.stock.map(c => ({ ...c })), completed: s.completed.map(p => p.map(c => ({ ...c }))) })
export function movable(s: Board, p: number, depth: number): boolean {
  const pile = s.piles[p]
  if (!pile || depth < 0 || depth >= pile.length || !pile[depth].faceUp) return false
  for (let i = depth + 1; i < pile.length; i++) if (!pile[i].faceUp || pile[i].suit !== pile[i - 1].suit || pile[i].rank !== pile[i - 1].rank - 1) return false
  return true
}
export function canMove(s: Board, move: Move): boolean {
  if (move.pile === move.to || !s.piles[move.to] || !movable(s, move.pile, move.depth)) return false
  const dest = s.piles[move.to][s.piles[move.to].length - 1]
  return !dest || dest.rank === s.piles[move.pile][move.depth].rank + 1
}
export function completeRun(pile: readonly Card[]): boolean {
  if (pile.length < 13) return false
  const run = pile.slice(-13)
  return run.every((c, i) => c.faceUp && c.rank === 13 - i && c.suit === run[0].suit)
}
function finish(s: SpiderState): SpiderState {
  for (const p of s.piles) {
    if (p.length) p[p.length - 1].faceUp = true
    while (completeRun(p)) {
      s.completed.push(p.splice(-13))
      s.score += 100
      s.history = []
      if (p.length) p[p.length - 1].faceUp = true
    }
  }
  return s
}
function next(s: SpiderState): SpiderState {
  return { ...s, ...copyBoard(s), history: [...s.history, copyBoard(s)], moves: s.moves + 1, score: s.score - 1 }
}
export function moveCards(s: SpiderState, m: Move): SpiderState {
  if (!canMove(s, m)) return s
  const n = next(s)
  n.piles[m.to].push(...n.piles[m.pile].splice(m.depth))
  return finish(n)
}
export function canDeal(s: Board): boolean { return s.stock.length >= 10 && s.piles.every(p => p.length > 0) }
export function dealRow(s: SpiderState): SpiderState {
  if (!canDeal(s)) return s
  const n = next(s)
  for (const pile of n.piles) pile.push({ ...n.stock.shift()!, faceUp: true })
  return finish(n)
}
export function undo(s: SpiderState): SpiderState {
  const previous = s.history[s.history.length - 1]
  return previous ? { ...s, ...copyBoard(previous), history: s.history.slice(0, -1), score: s.score - 1, moves: s.moves + 1 } : s
}

export function hasLegalMoves(s: Board): boolean {
  for (let pile = 0; pile < 10; pile++) for (let depth = 0; depth < s.piles[pile].length; depth++) {
    for (let to = 0; to < 10; to++) if (canMove(s, { pile, depth, to })) return true
  }
  return false
}
export function availableMoves(s: Board): Move[] {
  const moves: Move[] = []
  for (let pile = 0; pile < 10; pile++) for (let depth = 0; depth < s.piles[pile].length; depth++) {
    if (!movable(s, pile, depth)) continue
    const source = s.piles[pile][depth]
    const predecessor = s.piles[pile][depth - 1]
    if (predecessor?.faceUp && predecessor.suit === source.suit && predecessor.rank === source.rank + 1) continue
    for (let to = 0; to < 10; to++) {
      if (depth === 0 && !s.piles[to].length) continue
      if (canMove(s, { pile, depth, to })) moves.push({ pile, depth, to })
    }
  }
  return moves.sort((a, b) => {
    const value = (m: Move) => {
      const source = s.piles[m.pile][m.depth]
      const dest = s.piles[m.to][s.piles[m.to].length - 1]
      return (dest?.suit === source.suit ? 2 : 0) + (m.depth > 0 && !s.piles[m.pile][m.depth - 1].faceUp ? 1 : 0)
    }
    return value(b) - value(a)
  })
}
export type Hint = { kind: 'move'; move: Move } | { kind: 'deal' } |
  { kind: 'none'; reason: 'finished' | 'no-useful' | 'no-moves' }
export function hintAt(s: Board, index: number): Hint {
  const moves = availableMoves(s)
  if (index >= 0 && index < moves.length) return { kind: 'move', move: moves[index] }
  if (index === moves.length && canDeal(s)) return { kind: 'deal' }
  return { kind: 'none', reason: moves.length ? 'finished' : hasLegalMoves(s) ? 'no-useful' : 'no-moves' }
}
export type Stats = { high: number; wins: number; losses: number; streak: number; longestWin: number; longestLoss: number }
export const emptyStats = (): Stats => ({ high: 0, wins: 0, losses: 0, streak: 0, longestWin: 0, longestLoss: 0 })
export function recordResult(stats: Stats, won: boolean, score: number): Stats {
  const streak = won ? Math.max(0, stats.streak) + 1 : Math.min(0, stats.streak) - 1
  return { high: Math.max(stats.high, score), wins: stats.wins + Number(won), losses: stats.losses + Number(!won), streak,
    longestWin: Math.max(stats.longestWin, streak), longestLoss: Math.max(stats.longestLoss, -streak) }
}
export type Options = { animation: boolean; prompt: boolean; alwaysSave: boolean; alwaysOpen: boolean }
export type Stored = { options: Options; stats: Record<Difficulty, Stats>; saved: SpiderState | null }
export const defaults = (): Stored => ({ options: { animation: true, prompt: true, alwaysSave: false, alwaysOpen: false },
  stats: { 1: emptyStats(), 2: emptyStats(), 4: emptyStats() }, saved: null })
/** Opening replaces the board, not the abandoned game's per-difficulty result. */
export function openSavedGame(stored: Stored, current: SpiderState, accounted: boolean): Stored | null {
  if (!stored.saved) return null
  if (accounted || current.moves === 0 || current.completed.length === 8) return stored
  return { ...stored, stats: { ...stored.stats,
    [current.difficulty]: recordResult(stored.stats[current.difficulty], false, current.score) } }
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'
function boardGuard(v: unknown, difficulty: Difficulty): v is Board {
  if (!object(v) || !Array.isArray(v.piles) || v.piles.length !== 10 || !Array.isArray(v.stock) || !Array.isArray(v.completed)) return false
  if (v.stock.length > 50 || v.stock.length % 10 || v.completed.length > 8) return false
  const seen = new Set<number>()
  const suits = difficulty === 1 ? ['spades'] : difficulty === 2 ? ['spades', 'hearts'] : ['spades', 'hearts', 'clubs', 'diamonds']
  for (const pile of [...v.piles, v.stock, ...v.completed]) {
    if (!Array.isArray(pile)) return false
    let faceUp = false
    for (const c of pile) {
      if (!object(c) || !Number.isInteger(c.id) || Number(c.id) < 0 || Number(c.id) >= 104 || seen.has(Number(c.id)) ||
        !Number.isInteger(c.rank) || c.rank !== Number(c.id) % 13 + 1 || c.suit !== suits[Math.floor(Number(c.id) / 13) % suits.length] ||
        typeof c.faceUp !== 'boolean') return false
      if (faceUp && !c.faceUp) return false
      faceUp ||= c.faceUp
      seen.add(Number(c.id))
    }
  }
  if (seen.size !== 104 || v.stock.some(c => c.faceUp) || v.piles.some(p => p.length && !p[p.length - 1].faceUp)) return false
  return v.completed.every(p => p.length === 13 && completeRun(p))
}
export function stateGuard(v: unknown): v is SpiderState {
  if (!object(v) || ![1, 2, 4].includes(Number(v.difficulty)) || !Number.isInteger(v.seed) || !Number.isSafeInteger(v.moves) || Number(v.moves) < 0 ||
    !Number.isSafeInteger(v.score) || !Array.isArray(v.history) || v.history.length > Number(v.moves)) return false
  const difficulty = v.difficulty as Difficulty
  const history = v.history
  if (!boardGuard(v, difficulty)) return false
  const count = v.completed.length
  return history.every(b => boardGuard(b, difficulty) && b.completed.length === count)
}
export function storedGuard(v: unknown): v is Stored {
  if (!object(v) || !object(v.options) || !object(v.stats)) return false
  const options = v.options
  const stats = v.stats
  if (!['animation', 'prompt', 'alwaysSave', 'alwaysOpen'].every(k => typeof options[k] === 'boolean')) return false
  if (options.prompt && options.alwaysSave) return false
  for (const d of [1, 2, 4]) {
    const s = stats[d]
    if (!object(s) || !['high', 'wins', 'losses', 'streak', 'longestWin', 'longestLoss'].every(k => Number.isSafeInteger(s[k]))) return false
    if (['high', 'wins', 'losses', 'longestWin', 'longestLoss'].some(k => Number(s[k]) < 0)) return false
  }
  return v.saved === null || stateGuard(v.saved)
}
export function exitAction(options: Options, inProgress: boolean): 'prompt' | 'save' | 'close' {
  return !inProgress ? 'close' : options.alwaysSave ? 'save' : options.prompt ? 'prompt' : 'close'
}
