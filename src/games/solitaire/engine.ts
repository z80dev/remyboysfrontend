import { makeDeck, shuffle, isRed, SUITS, type Card } from '../cards/model'

export type Options = {
  draw: 1 | 3
  scoring: 'standard' | 'vegas' | 'none'
  timed: boolean
  status: boolean
  outline: boolean
  keep: boolean
}
export const DEFAULT_OPTIONS: Options = { draw: 1, scoring: 'standard', timed: false, status: true, outline: false, keep: false }
export type Snapshot = {
  stock: Card[]
  waste: Card[]
  homes: Card[][]
  tableau: Card[][]
  score: number
  seconds: number
  started: boolean
  passes: number
  won: boolean
}
export type State = Snapshot & { options: Options, undo: Snapshot | null }
export type Source = { pile: number, depth: number }
/** Standard/None retain the Vegas balance; turning off Keep score in Vegas discards it. */
export function vegasBank(state: State, savedBank: number): number {
  if (state.options.scoring !== 'vegas') return savedBank
  return state.options.keep ? state.score : 0
}
/** Piles 0 stock, 1 waste, 2..5 physical homes, 6..12 tableau. Stock top is its last card.
 * No move flips an exposed card. A snapshot stores exactly one prior action, including its clock and score.
 * Vegas banks enter at deal time only when Keep score is selected; UI persists no board or clock. */
export function deal(seed: number, options: Options = DEFAULT_OPTIONS, bank = 0): State {
  const cards = shuffle(makeDeck(), seed)
  const tableau = Array.from({ length: 7 }, (_, p) => cards.splice(0, p + 1).map((card, i) => ({ ...card, faceUp: i === p })))
  return { options: { ...options }, tableau, stock: cards.map(c => ({ ...c, faceUp: false })), waste: [], homes: [[], [], [], []],
    score: options.scoring === 'vegas' ? (options.keep ? bank : 0) - 52 : 0, seconds: 0, started: false, passes: 1, won: false, undo: null }
}
export function pile(state: Snapshot, p: number): Card[] {
  return p === 0 ? state.stock : p === 1 ? state.waste : p < 6 ? state.homes[p - 2] : state.tableau[p - 6]
}
function snapshot(s: State): Snapshot {
  return { stock: s.stock.slice(), waste: s.waste.slice(), homes: s.homes.map(p => p.slice()), tableau: s.tableau.map(p => p.slice()),
    score: s.score, seconds: s.seconds, started: s.started, passes: s.passes, won: s.won }
}
function begin(s: State): State {
  const previous = {
    stock: s.stock, waste: s.waste, homes: s.homes, tableau: s.tableau,
    score: s.score, seconds: s.seconds, started: s.started, passes: s.passes, won: s.won
  }
  return { ...s, ...snapshot(s), undo: previous, started: true }
}
function points(s: State, standard: number, vegas = 0) {
  s.score = s.options.scoring === 'standard' ? Math.max(0, s.score + standard) : s.options.scoring === 'vegas' ? s.score + vegas : 0
}
export function canRecycle(s: State): boolean {
  return !!s.waste.length && (s.options.scoring !== 'vegas' || s.passes < (s.options.draw === 1 ? 1 : 3))
}
export function draw(s: State, cheat = false): State {
  if (s.won || (!s.stock.length && !canRecycle(s))) return s
  const n = begin(s)
  if (n.stock.length) {
    for (let i = 0, count = cheat && n.options.draw === 3 ? 1 : n.options.draw; i < count && n.stock.length; i++) {
      n.waste.push({ ...n.stock.pop()!, faceUp: true })
    }
  } else {
    n.stock = n.waste.reverse().map(c => ({ ...c, faceUp: false }))
    n.waste = []
    n.passes++
    points(n, n.options.draw === 1 ? -100 : -20)
  }
  return n
}
export function flip(s: State, source: Source): State {
  if (s.won || source.pile < 6) return s
  const cards = pile(s, source.pile)
  if (source.depth !== cards.length - 1 || !cards.length || cards[source.depth].faceUp) return s
  const n = begin(s)
  pile(n, source.pile)[source.depth] = { ...cards[source.depth], faceUp: true }
  points(n, 5)
  return n
}
export function canMove(s: State, from: Source, to: number): boolean {
  if (s.won || from.pile === 0 || from.pile === to || to < 2 || to > 12) return false
  const cards = pile(s, from.pile)
  const card = cards[from.depth]
  if (!card?.faceUp || from.depth < 0) return false
  if (from.pile < 6 && from.depth !== cards.length - 1) return false
  for (let i = from.depth + 1; i < cards.length; i++) {
    if (!cards[i].faceUp || cards[i - 1].rank !== cards[i].rank + 1 || isRed(cards[i - 1]) === isRed(cards[i])) return false
  }
  const target = pile(s, to)
  const top = target[target.length - 1]
  if (to < 6) {
    if (from.depth !== cards.length - 1) return false
    if (top) return card.suit === target[0].suit && card.rank === top.rank + 1
    return card.rank === 1 && !s.homes.some((home, index) => index + 2 !== from.pile && home.length && home[0].suit === card.suit)
  }
  return top ? top.faceUp && top.rank === card.rank + 1 && isRed(top) !== isRed(card) : card.rank === 13
}
export function winBonus(seconds: number): number { return seconds >= 30 ? Math.floor(700000 / seconds) : 0 }
export function move(s: State, from: Source, to: number): State {
  if (!canMove(s, from, to)) return s
  const n = begin(s)
  pile(n, to).push(...pile(n, from.pile).splice(from.depth))
  const fromHome = from.pile >= 2 && from.pile < 6
  points(n, to < 6 ? fromHome ? 0 : 10 : fromHome ? -15 : from.pile === 1 ? 5 : 0,
    to < 6 ? fromHome ? 0 : 5 : fromHome ? -5 : 0)
  if (n.homes.every(p => p.length === 13)) {
    n.won = true
    if (n.options.scoring === 'standard' && n.options.timed) points(n, winBonus(n.seconds))
  }
  return n
}
export function undo(s: State): State { return s.undo ? { ...s, ...s.undo, undo: null } : s }
export function tick(s: State, seconds = 1): State {
  if (!s.started || s.won || seconds <= 0) return s
  const n = { ...s, seconds: s.seconds + Math.floor(seconds) }
  if (s.options.timed && s.options.scoring === 'standard') points(n, -2 * (Math.floor(n.seconds / 10) - Math.floor(s.seconds / 10)))
  return n
}
export function home(s: State, from: Source): State {
  const card = pile(s, from.pile)[from.depth]
  if (!card) return s
  const bound = s.homes.findIndex(home => home.length && home[0].suit === card.suit)
  const target = bound >= 0 ? bound : s.homes.findIndex(home => !home.length)
  return target >= 0 ? move(s, from, target + 2) : s
}
/** Auto-home deliberately re-evaluates all exposed tops after each single move; undo remains single-step. */
export function autoHome(s: State): State {
  let current = s
  for (;;) {
    let next = current
    for (const p of [1, 6, 7, 8, 9, 10, 11, 12]) {
      next = home(current, { pile: p, depth: pile(current, p).length - 1 })
      if (next !== current) break
    }
    if (next === current) return current
    current = next
  }
}
export function cheatWin(s: State): State {
  const n = begin(s)
  n.stock = []
  n.waste = []
  n.tableau = [[], [], [], [], [], [], []]
  const cards = makeDeck()
  const remaining = SUITS.filter(suit => !s.homes.some(home => home.length && home[0].suit === suit))
  n.homes = s.homes.map(home => {
    const suit = home.length ? home[0].suit : remaining.shift()!
    return cards.filter(card => card.suit === suit)
  })
  if (n.options.scoring === 'vegas') n.score += (52 - s.homes.reduce((sum, p) => sum + p.length, 0)) * 5
  if (n.options.scoring === 'standard' && n.options.timed) points(n, winBonus(n.seconds))
  n.won = true
  return n
}
