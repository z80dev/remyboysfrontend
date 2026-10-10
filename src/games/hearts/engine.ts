import { makeDeck, shuffle, type Card, type Suit } from '../cards/model'

export type Seat = 0 | 1 | 2 | 3
export type Play = { seat: Seat; card: Card }
export type ScoreRow = { points: number[]; totals: number[]; moon: Seat | null }
export type HeartsState = {
  seed: number; hand: number; hands: Card[][]; phase: 'pass' | 'received' | 'play' | 'score' | 'over'
  received: number[]; turn: Seat; leader: Seat; trick: Play[]; lastTrick: Play[]; lastWinner: Seat | null
  played: Play[]; broken: boolean; tricks: number; points: number[]; totals: number[]; rows: ScoreRow[]; moon: Seat | null
}
const order: Suit[] = ['clubs', 'diamonds', 'spades', 'hearts']
export const high = (card: Card) => card.rank === 1 ? 14 : card.rank
export const penalty = (card: Card) => card.suit === 'hearts' ? 1 : card.suit === 'spades' && card.rank === 12 ? 13 : 0
export const passDirection = (hand: number) => ['left', 'right', 'across', 'hold'][hand % 4]
export const passTarget = (seat: number, hand: number) => (seat + [1, 3, 2, 0][hand % 4]) % 4
export const sortHand = (cards: Card[]) => cards.sort((a, b) => order.indexOf(a.suit) - order.indexOf(b.suit) || high(a) - high(b))

/** Immutable seeded engine. Seats run South, West, North, East. A completed trick is retained for UI animation;
 * played contains every exposed card, never hidden information. Scores are committed once, after the thirteenth trick. */
export function deal(seed: number, hand = 0, totals = [0, 0, 0, 0], rows: ScoreRow[] = []): HeartsState {
  const deck = shuffle(makeDeck(), seed + hand * 7919)
  const hands = Array.from({ length: 4 }, (_, seat) => sortHand(deck.filter((_, i) => i % 4 === seat)))
  const leader = hands.findIndex(cards => cards.some(c => c.suit === 'clubs' && c.rank === 2)) as Seat
  return { seed, hand, hands, phase: hand % 4 === 3 ? 'play' : 'pass', received: [], turn: leader, leader,
    trick: [], lastTrick: [], lastWinner: null, played: [], broken: false, tricks: 0, points: [0, 0, 0, 0], totals, rows, moon: null }
}
export function aiPass(hand: readonly Card[]): number[] {
  const counts = (suit: Suit) => hand.filter(c => c.suit === suit).length
  return [...hand].sort((a, b) => {
    const value = (c: Card) => (c.suit === 'spades' && high(c) >= 12 && counts('spades') <= 4 ? 100 + high(c) :
      c.suit === 'hearts' ? 50 + high(c) : counts(c.suit) <= 3 && !(c.suit === 'clubs' && c.rank === 2) ? 35 + high(c) : high(c))
    return value(b) - value(a)
  }).slice(0, 3).map(c => c.id)
}
export function passCards(state: HeartsState, selections: readonly number[][]): HeartsState {
  if (state.phase !== 'pass' || selections.length !== 4 || selections.some((ids, seat) =>
    ids.length !== 3 || new Set(ids).size !== 3 || ids.some(id => !state.hands[seat].some(c => c.id === id)))) return state
  const hands = state.hands.map((cards, seat) => cards.filter(c => !selections[seat].includes(c.id)))
  const received: number[] = []
  state.hands.forEach((cards, seat) => {
    const target = passTarget(seat, state.hand)
    const outgoing = cards.filter(c => selections[seat].includes(c.id))
    hands[target].push(...outgoing)
    if (target === 0) received.push(...outgoing.map(c => c.id))
  })
  hands.forEach(sortHand)
  const leader = hands.findIndex(cards => cards.some(c => c.suit === 'clubs' && c.rank === 2)) as Seat
  return { ...state, hands, received, leader, turn: leader, phase: 'received' }
}
export const acknowledge = (state: HeartsState): HeartsState => state.phase === 'received' ? { ...state, phase: 'play', received: [] } : state
export function legalCards(state: HeartsState, seat: Seat = state.turn): Card[] {
  if (state.phase !== 'play' || seat !== state.turn) return []
  let cards = state.hands[seat]
  if (state.tricks === 0 && state.trick.length === 0) return cards.filter(c => c.suit === 'clubs' && c.rank === 2)
  const suit = state.trick[0]?.card.suit
  if (suit && cards.some(c => c.suit === suit)) cards = cards.filter(c => c.suit === suit)
  else if (!suit && !state.broken && cards.some(c => c.suit !== 'hearts')) cards = cards.filter(c => c.suit !== 'hearts')
  if (state.tricks === 0 && cards.some(c => penalty(c) === 0)) cards = cards.filter(c => penalty(c) === 0)
  return cards
}
export function trickWinner(trick: readonly Play[]): Seat {
  const suit = trick[0].card.suit
  return trick.reduce((best, play) => play.card.suit === suit && high(play.card) > high(best.card) ? play : best).seat
}
export function winners(totals: readonly number[]): Seat[] {
  const low = Math.min(...totals)
  return totals.flatMap((score, seat) => score === low ? [seat as Seat] : [])
}
export function scoreHand(points: readonly number[], totals: readonly number[]): ScoreRow {
  const moon = points.findIndex(p => p === 26)
  const adjusted = moon < 0 ? [...points] : points.map((_, seat) => seat === moon ? 0 : 26)
  return { points: adjusted, totals: totals.map((score, seat) => score + adjusted[seat]), moon: moon < 0 ? null : moon as Seat }
}
export function playCard(state: HeartsState, id: number): HeartsState {
  const card = legalCards(state).find(c => c.id === id)
  if (!card) return state
  const play = { seat: state.turn, card }
  const trick = [...state.trick, play]
  const hands = state.hands.map((cards, seat) => seat === state.turn ? cards.filter(c => c.id !== id) : cards)
  const next = { ...state, hands, trick, played: [...state.played, play], broken: state.broken || card.suit === 'hearts' }
  if (trick.length < 4) return { ...next, turn: (state.turn + 1) % 4 as Seat }
  const winner = trickWinner(trick)
  const points = [...state.points]
  points[winner] += trick.reduce((sum, p) => sum + penalty(p.card), 0)
  const completed = { ...next, points, trick: [], lastTrick: trick, lastWinner: winner, leader: winner, turn: winner, tricks: state.tricks + 1 }
  if (completed.tricks !== 13) return completed
  const row = scoreHand(points, state.totals)
  return { ...completed, totals: row.totals, rows: [...state.rows, row], moon: row.moon,
    phase: row.totals.some(p => p >= 100) ? 'over' : 'score' }
}
export const nextHand = (state: HeartsState) => deal(state.seed, state.hand + 1, state.totals, state.rows)

/** Standard AI consults only its hand, the current trick and exposed history. It never bypasses legalCards. */
export function aiPlay(state: HeartsState): Card {
  const legal = legalCards(state)
  const hand = state.hands[state.turn]
  const hearts = hand.filter(c => c.suit === 'hearts')
  const moon = hearts.length >= 9 && hearts.some(c => high(c) === 14) && hand.filter(c => high(c) >= 13).length >= 3
  const visibleShooter = state.points.findIndex((p, seat) => seat !== state.turn && p >= 8 && state.points.every((v, other) => other === seat || v === 0))
  const led = state.trick[0]?.card.suit
  const sorted = [...legal].sort((a, b) => high(a) - high(b))
  if (!led) {
    if (moon) return sorted[sorted.length - 1]
    // Prefer a low card whose higher ranks are still unseen: a safe duck lead, using exposed-card memory.
    return [...sorted].sort((a, b) => {
      const danger = (c: Card) => high(c) + state.played.filter(p => p.card.suit === c.suit && high(p.card) > high(c)).length * 2
      return danger(a) - danger(b)
    })[0]
  }
  if (!legal.some(c => c.suit === led)) {
    return [...legal].sort((a, b) => penalty(b) * 20 + high(b) - penalty(a) * 20 - high(a))[0]
  }
  const top = Math.max(...state.trick.filter(p => p.card.suit === led).map(p => high(p.card)))
  const winning = sorted.filter(c => high(c) > top)
  const hasHeart = state.trick.some(p => p.card.suit === 'hearts')
  if ((moon || (visibleShooter >= 0 && hasHeart)) && winning.length) return winning[winning.length - 1]
  const ducks = sorted.filter(c => high(c) < top)
  if (ducks.length) return ducks[ducks.length - 1]
  return sorted[0]
}
