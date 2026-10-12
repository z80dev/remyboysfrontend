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
  const counts = order.map(suit => hand.filter(c => c.suit === suit).length)
  const protection = hand.filter(c => c.suit === 'spades' && high(c) < 12).length
  const alternatives = hand.filter(c => c.suit !== 'hearts' || high(c) > 8)
  const candidates = [...(alternatives.length >= 3 ? alternatives : hand)].sort((a, b) => a.id - b.id)
  const value = (c: Card) => {
    if (c.suit === 'spades' && high(c) >= 12) {
      if (protection < 3) return (c.rank === 12 ? 180 : 140) + high(c)
      return c.rank === 12 ? -80 : high(c)
    }
    if (c.suit === 'hearts') return high(c) >= 11 ? 100 + high(c) : high(c) <= 8 ? -100 + high(c) : high(c)
    return high(c)
  }
  let best: Card[] = []
  let bestValue = -Infinity
  // Score complete three-card passes: a two-card void has value only when both cards leave.
  for (let a = 0; a < candidates.length - 2; a++) {
    for (let b = a + 1; b < candidates.length - 1; b++) {
      for (let c = b + 1; c < candidates.length; c++) {
        const pick = [candidates[a], candidates[b], candidates[c]]
        let score = pick.reduce((sum, card) => sum + value(card), 0)
        for (const suit of ['clubs', 'diamonds'] as const) {
          const count = counts[order.indexOf(suit)]
          if (count >= 1 && count <= 2 && pick.filter(card => card.suit === suit).length === count &&
            !hand.some(card => card.suit === suit && card.rank === 2 && suit === 'clubs')) score += 150
        }
        if (score > bestValue) {
          bestValue = score
          best = pick
        }
      }
    }
  }
  return best.map(c => c.id)
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

/** Only completed public tricks establish a threat; a lone queen is not a moon attempt. */
export function visibleMoonThreat(state: HeartsState, excludingSeat?: Seat): Seat | null {
  if (state.tricks < 6) return null
  const hearts = [0, 0, 0, 0]
  const queens = [false, false, false, false]
  const completedCards = Math.min(state.tricks * 4, state.played.length - state.trick.length)
  for (let i = 0; i + 3 < completedCards; i += 4) {
    const trick = state.played.slice(i, i + 4)
    const winner = trickWinner(trick)
    for (const { card } of trick) {
      if (card.suit === 'hearts') hearts[winner]++
      else if (card.suit === 'spades' && card.rank === 12) queens[winner] = true
    }
  }
  const capturers = hearts.flatMap((count, seat) => count || queens[seat] ? [seat as Seat] : [])
  if (capturers.length !== 1) return null
  const seat = capturers[0]
  return seat !== excludingSeat && hearts[seat] >= (queens[seat] ? 8 : 5) ? seat : null
}

/** Standard AI consults only its hand, the current trick and exposed history. It never bypasses legalCards. */
export function aiPlay(state: HeartsState): Card {
  const legal = legalCards(state)
  const hand = state.hands[state.turn]
  const original = [...hand, ...state.played.filter(p => p.seat === state.turn).map(p => p.card)]
  const hearts = original.filter(c => c.suit === 'hearts')
  const moon = hearts.length >= 9 && hearts.some(c => high(c) === 14) && original.filter(c => high(c) >= 13).length >= 3 &&
    state.points.every((p, seat) => seat === state.turn || p === 0)
  const visibleShooter = visibleMoonThreat(state, state.turn)
  const led = state.trick[0]?.card.suit
  const sorted = [...legal].sort((a, b) => high(a) - high(b) || a.id - b.id)
  if (!led) {
    if (moon) return sorted[sorted.length - 1]
    // Prefer a low card whose higher ranks are still unseen: a safe duck lead, using exposed-card memory.
    return [...sorted].sort((a, b) => {
      const danger = (c: Card) => high(c) + state.played.filter(p => p.card.suit === c.suit && high(p.card) > high(c)).length * 2
      return danger(a) - danger(b)
    })[0]
  }
  if (!legal.some(c => c.suit === led)) {
    if (moon) return [...legal].sort((a, b) => penalty(a) * 20 + high(a) - penalty(b) * 20 - high(b))[0]
    return [...legal].sort((a, b) => penalty(b) * 20 + high(b) - penalty(a) * 20 - high(a))[0]
  }
  const top = Math.max(...state.trick.filter(p => p.card.suit === led).map(p => high(p.card)))
  const winning = sorted.filter(c => high(c) > top)
  const hasHeart = state.trick.some(p => p.card.suit === 'hearts')
  const safeWinners = winning.filter(c => !(c.suit === 'spades' && c.rank === 12))
  const highestWinner = safeWinners[safeWinners.length - 1] ?? winning[winning.length - 1]
  if ((moon || (visibleShooter !== null && hasHeart && trickWinner(state.trick) === visibleShooter)) && winning.length) return highestWinner
  // With the last word on a point-free trick, shed control without introducing our own queen.
  if (state.trick.length === 3 && state.trick.every(p => penalty(p.card) === 0)) {
    const safe = sorted.filter(c => !(c.suit === 'spades' && c.rank === 12))
    if (safe.length) return safe[safe.length - 1]
  }
  const ducks = sorted.filter(c => high(c) < top)
  if (ducks.length) return ducks[ducks.length - 1]
  return highestWinner
}
