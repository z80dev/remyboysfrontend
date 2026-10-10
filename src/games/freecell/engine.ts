import { type Card, SUITS, isRed } from '../cards/model'

export type Location = { kind: 'cascade' | 'free' | 'home'; index: number; depth?: number }
export type Board = { cascades: Card[][]; free: (Card | null)[]; home: number[] }
export type Game = Board & { number: number; history: Board[]; cheat: boolean; moves: number }
export const validNumber = (n: number) => Number.isInteger(n) && (n >= 1 && n <= 32000 || n === -1 || n === -2)
const card = (id: number): Card => ({ id, rank: Math.floor(id / 4) + 1, suit: SUITS[id % 4], faceUp: true })

/** Microsoft rank-major C,D,H,S replacement shuffle; Math.imul preserves the 31-bit LCG exactly.
 * Reference: https://rosettacode.org/wiki/Deal_cards_for_FreeCell (#1 and #617 full layouts).
 * Cascades are bottom-to-top; home stores the highest rank, free cells hold at most one card.
 */
export function deal(number: number): Game {
  const deck = Array.from({ length: 52 }, (_, id) => card(id))
  const cascades: Card[][] = Array.from({ length: 8 }, () => [])
  let seed = number
  for (let i = 0; i < 52; i++) {
    seed = (Math.imul(seed, 214013) + 2531011) & 0x7fffffff
    const j = (seed >>> 16) % (52 - i)
    cascades[i % 8].push(deck[j])
    deck[j] = deck[51 - i]
  }
  if (number < 0) {
    // Known-dead Microsoft -2, sourced from Freecell Solver:
    // https://raw.githubusercontent.com/shlomif/fc-solve/master/fc-solve/docs/ms-freecell-game-minus-2.board
    // -1 is its suit-isomorphic C<->S,D<->H construction: distinct, equally unwinnable, all aces buried.
    const suits = number === -2 ? [3, 2, 1, 0] : [0, 1, 2, 3]
    for (let i = 0; i < 4; i++) {
      cascades[i] = [1, 13, 12, 11, 10, 9, 8].map(rank => card((rank - 1) * 4 + suits[i]))
      cascades[i + 4] = [7, 6, 5, 4, 3, 2].map(rank => card((rank - 1) * 4 + suits[i]))
    }
  }
  return { number, cascades, free: [null, null, null, null], home: [0, 0, 0, 0], history: [], cheat: false, moves: 0 }
}
export const snapshot = (b: Board): Board => ({ cascades: b.cascades.map(c => c.slice()), free: b.free.slice(), home: b.home.slice() })
export const cardsLeft = (b: Board) => 52 - b.home.reduce((sum, rank) => sum + rank, 0)
export const won = (b: Board) => b.home.every(rank => rank === 13)
export function at(b: Board, l: Location): Card | null {
  if (l.kind === 'free') return b.free[l.index]
  if (l.kind === 'home') return b.home[l.index] ? card((b.home[l.index] - 1) * 4 + l.index) : null
  return b.cascades[l.index][l.depth ?? b.cascades[l.index].length - 1] ?? null
}
export function run(b: Board, l: Location): Card[] {
  if (l.kind === 'home') return []
  const c = at(b, l)
  return !c ? [] : l.kind === 'free' ? [c] : b.cascades[l.index].slice(l.depth ?? b.cascades[l.index].length - 1)
}
export const orderedRun = (cards: Card[]) => cards.every((c, i) => !i || cards[i - 1].rank === c.rank + 1 && isRed(cards[i - 1]) !== isRed(c))
export function supermoveLimit(b: Board, target: number): number {
  const empty = b.cascades.filter((c, i) => !c.length && i !== target).length
  return (1 + b.free.filter(c => !c).length) * 2 ** empty
}
export const canHome = (b: Board, c: Card) => b.home[SUITS.indexOf(c.suit)] === c.rank - 1
export function safeHome(b: Board, c: Card): boolean {
  return canHome(b, c) && (c.rank <= 2 || SUITS.every((suit, i) => isRed({ ...c, suit }) === isRed(c) || b.home[i] >= c.rank - 1))
}
export function legal(b: Board, from: Location, to: Location): boolean {
  if (from.kind === to.kind && from.index === to.index) return false
  const cards = run(b, from)
  if (!cards.length || !orderedRun(cards)) return false
  const c = cards[0]
  if (to.kind === 'free') return cards.length === 1 && !b.free[to.index]
  if (to.kind === 'home') return cards.length === 1 && SUITS.indexOf(c.suit) === to.index && canHome(b, c)
  const top = b.cascades[to.index].at(-1)
  return cards.length <= supermoveLimit(b, to.index) && (!top || top.rank === c.rank + 1 && isRed(top) !== isRed(c))
}
function transfer(b: Board, from: Location, to: Location) {
  const cards = run(b, from)
  if (from.kind === 'free') b.free[from.index] = null
  else b.cascades[from.index].splice(from.depth ?? b.cascades[from.index].length - 1)
  if (to.kind === 'free') b.free[to.index] = cards[0]
  else if (to.kind === 'home') b.home[to.index]++
  else b.cascades[to.index].push(...cards)
}
/** Safe home moves repeat to a fixed point, inside the initiating move's one undo transaction. */
export function autoHome(b: Board): void {
  let changed = true
  while (changed) {
    changed = false
    for (const from of sources(b)) {
      const c = at(b, from)
      if (c && safeHome(b, c)) {
        transfer(b, from, { kind: 'home', index: SUITS.indexOf(c.suit) })
        changed = true
      }
    }
  }
}
export function sources(b: Board): Location[] {
  return [...b.cascades.map((_, index): Location => ({ kind: 'cascade', index })), ...b.free.map((_, index): Location => ({ kind: 'free', index }))]
}
export function move(g: Game, from: Location, to: Location): Game | null {
  if (!legal(g, from, to)) return null
  const b = snapshot(g)
  transfer(b, from, to)
  autoHome(b)
  if (g.cheat) { b.cascades = b.cascades.map(() => []); b.free.fill(null); b.home.fill(13) }
  return { ...g, ...b, cheat: false, moves: g.moves + 1, history: [...g.history, snapshot(g)] }
}
export function undo(g: Game): Game {
  const previous = g.history.at(-1)
  return previous ? { ...g, ...snapshot(previous), history: g.history.slice(0, -1), moves: Math.max(0, g.moves - 1), cheat: false } : g
}
export function hasLegalMove(b: Board): boolean {
  const targets: Location[] = [...sources(b), ...SUITS.map((_, index): Location => ({ kind: 'home', index }))]
  for (const source of sources(b)) {
    const depths = source.kind === 'cascade' ? b.cascades[source.index].map((_, depth) => depth) : [undefined]
    for (const depth of depths) if (targets.some(target => legal(b, { ...source, depth }, target))) return true
  }
  return false
}
export type Stats = { won: number; lost: number; bestWins: number; bestLosses: number; streak: number }
export const emptyStats = (): Stats => ({ won: 0, lost: 0, bestWins: 0, bestLosses: 0, streak: 0 })
export function record(s: Stats, win: boolean): Stats {
  const streak = win ? Math.max(0, s.streak) + 1 : Math.min(0, s.streak) - 1
  return { won: s.won + +win, lost: s.lost + +!win, streak, bestWins: Math.max(s.bestWins, streak), bestLosses: Math.max(s.bestLosses, -streak) }
}
