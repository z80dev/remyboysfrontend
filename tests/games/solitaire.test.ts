import { describe, expect, test } from 'bun:test'
import { makeDeck, type Card, type Suit } from '../../src/games/cards/model'
import { autoHome, canMove, canRecycle, cheatWin, deal, DEFAULT_OPTIONS, draw, flip, home, move, pile, tick, undo, winBonus,
  type Options, type State } from '../../src/games/solitaire/engine'
let id = 100
import { CASCADE_SUITS, createCascade, stepCascade } from '../../src/games/solitaire/cascade'
const card = (rank: number, suit: Suit = 'spades', faceUp = true): Card => ({ id: id++, rank, suit, faceUp })
function board(options: Partial<Options> = {}): State {
  return { ...deal(1, { ...DEFAULT_OPTIONS, ...options }), stock: [], waste: [], homes: [[], [], [], []], tableau: [[], [], [], [], [], [], []], score: 200 }
}
describe('Solitaire deterministic deal and legal moves', () => {
  test('seeded 52-card partition with exactly one face-up per tableau', () => {
    const a = deal(123), b = deal(123), c = deal(456)
    expect(a).toEqual(b); expect(a.stock).not.toEqual(c.stock)
    expect(a.stock.length).toBe(24)
    expect(new Set([...a.stock, ...a.tableau.flat()].map(c => c.id)).size).toBe(52)
    a.tableau.forEach((p, i) => { expect(p.length).toBe(i + 1); expect(p.filter(c => c.faceUp).length).toBe(1); expect(p.at(-1)!.faceUp).toBe(true) })
  })
  test('alternating descending runs and only Kings to empty', () => {
    const s = board(); s.tableau[0] = [card(12, 'hearts'), card(11), card(10, 'diamonds')]; s.tableau[1] = [card(13)]
    expect(canMove(s, { pile: 6, depth: 0 }, 7)).toBe(true)
    expect(move(s, { pile: 6, depth: 0 }, 7).tableau[1].length).toBe(4)
    expect(canMove(s, { pile: 6, depth: 0 }, 8)).toBe(false)
    s.tableau[0] = [card(13, 'hearts'), card(12)]
    expect(canMove(s, { pile: 6, depth: 0 }, 8)).toBe(true)
    s.tableau[0][1] = card(12, 'diamonds')
    expect(canMove(s, { pile: 6, depth: 0 }, 8)).toBe(false)
    s.tableau[0] = [card(13, 'hearts'), card(10)]
    expect(canMove(s, { pile: 6, depth: 0 }, 8)).toBe(false)
  })
  test('foundation suit/order/single top and return to tableau', () => {
    const s = board(); s.waste = [card(1, 'hearts')]
    expect(canMove(s, { pile: 1, depth: 0 }, 4)).toBe(true)
    expect(canMove(s, { pile: 1, depth: 0 }, 2)).toBe(false)
    const n = home(s, { pile: 1, depth: 0 }); n.tableau[0] = [card(2)]
    expect(canMove(n, { pile: 4, depth: 0 }, 6)).toBe(true)
    n.waste = [card(3, 'hearts')]
    expect(canMove(n, { pile: 1, depth: 0 }, 4)).toBe(false)
    n.tableau[1] = [card(1, 'clubs'), card(13, 'hearts')]
    expect(canMove(n, { pile: 7, depth: 0 }, 2)).toBe(false)
  })
  test('exposure never auto-flips; click flips top only; undo unflips', () => {
    const s = board(); s.tableau[0] = [card(4, 'clubs', false), card(1, 'hearts')]
    const n = home(s, { pile: 6, depth: 1 })
    expect(n.tableau[0][0].faceUp).toBe(false)
    const f = flip(n, { pile: 6, depth: 0 })
    expect(f.score).toBe(215); expect(f.tableau[0][0].faceUp).toBe(true)
    expect(undo(f).tableau[0][0].faceUp).toBe(false); expect(undo(f).score).toBe(210)
    expect(flip(s, { pile: 6, depth: 0 })).toBe(s)
  })
})
describe('Solitaire exact scoring', () => {
  for (const scoring of ['standard', 'vegas', 'none'] as const) {
    test(`${scoring}: all move and flip deltas`, () => {
      const s = board({ scoring }); s.score = scoring === 'none' ? 0 : 200
      s.waste = [card(12, 'hearts')]; s.tableau[0] = [card(13)]
      const base = s.score
      expect(move(s, { pile: 1, depth: 0 }, 6).score).toBe(base + (scoring === 'standard' ? 5 : 0))
      s.waste = [card(1, 'hearts')]
      expect(home(s, { pile: 1, depth: 0 }).score).toBe(base + (scoring === 'standard' ? 10 : scoring === 'vegas' ? 5 : 0))
      s.tableau[1] = [card(1, 'clubs')]
      expect(home(s, { pile: 7, depth: 0 }).score).toBe(base + (scoring === 'standard' ? 10 : scoring === 'vegas' ? 5 : 0))
      s.homes[2] = [card(1, 'hearts')]; s.tableau[2] = [card(2)]
      expect(move(s, { pile: 4, depth: 0 }, 8).score).toBe(base - (scoring === 'standard' ? 15 : scoring === 'vegas' ? 5 : 0))
      s.tableau[3] = [card(5, 'clubs', false)]
      expect(flip(s, { pile: 9, depth: 0 }).score).toBe(base + (scoring === 'standard' ? 5 : 0))
      s.tableau[4] = [card(12, 'hearts')]
      expect(move(s, { pile: 10, depth: 0 }, 6).score).toBe(base)
    })
  }
  test('recycle penalties 100/20 and standard floor zero', () => {
    for (const count of [1, 3] as const) {
      const s = board({ draw: count }); s.waste = [card(2), card(3)]
      const n = draw(s)
      expect(n.score).toBe(200 - (count === 1 ? 100 : 20)); expect(n.stock.map(c => c.rank)).toEqual([3, 2])
      expect(n.stock.every(c => !c.faceUp)).toBe(true)
      expect(undo(n)).toEqual({ ...s, undo: null })
      s.score = 1; expect(draw(s).score).toBe(0)
    }
    const s = board(); s.score = 1; s.homes[2] = [card(1, 'hearts')]; s.tableau[0] = [card(2)]
    expect(move(s, { pile: 4, depth: 0 }, 6).score).toBe(0)
  })
  test('Vegas deal charge, keep bank opt-in, and None zero', () => {
    expect(deal(1, { ...DEFAULT_OPTIONS, scoring: 'vegas' }).score).toBe(-52)
    expect(deal(1, { ...DEFAULT_OPTIONS, scoring: 'vegas', keep: true }, -100).score).toBe(-152)
    expect(deal(1, { ...DEFAULT_OPTIONS, scoring: 'vegas' }, 999).score).toBe(-52)
    expect(deal(1, { ...DEFAULT_OPTIONS, scoring: 'none' }, 999).score).toBe(0)
  })
  test('decay at exact 10-second boundaries and win bonus threshold/formula', () => {
    const s = board({ timed: true }); s.started = true
    expect(tick(s, 9).score).toBe(200); expect(tick(s, 10).score).toBe(198)
    expect(tick(tick(s, 9), 22).score).toBe(194)
    s.score = 1; expect(tick(s, 20).score).toBe(0)
    expect(winBonus(29)).toBe(0); expect(winBonus(30)).toBe(23333); expect(winBonus(60)).toBe(11666)
    for (const seconds of [29, 30, 60]) {
      const near = board({ timed: true }); near.seconds = seconds
      near.homes = ['clubs', 'diamonds', 'hearts', 'spades'].map(suit => makeDeck().filter(c => c.suit === suit))
      near.waste = [near.homes[3].pop()!]
      const won = home(near, { pile: 1, depth: 0 })
      expect(won.won).toBe(true); expect(won.score).toBe(210 + winBonus(seconds)); expect(tick(won)).toBe(won)
      expect(undo(won).won).toBe(false)
    }
    const untimed = board(); untimed.started = true; expect(tick(untimed, 100).score).toBe(200)
    const idle = board({ timed: true }); expect(tick(idle, 100)).toBe(idle)
  })
})
describe('Solitaire drawing, passes, auto-home and undo', () => {
  test('draw-three top-only, short final draw, modifier draw-one', () => {
    const s = board({ draw: 3 }); s.stock = [card(4), card(3), card(2), card(1)]
    const n = draw(s); expect(n.waste.map(c => c.rank)).toEqual([1, 2, 3]); expect(n.stock.length).toBe(1)
    expect(home(n, { pile: 1, depth: 0 })).toBe(n)
    expect(draw(n).waste.at(-1)!.rank).toBe(4)
    expect(draw(s, true).waste.length).toBe(1)
    expect(undo(n).stock).toEqual(s.stock)
  })
  for (const count of [1, 3] as const) test(`Vegas draw-${count} pass limit`, () => {
    let s = board({ draw: count, scoring: 'vegas' }); s.stock = [card(2)]; s.score = -52
    for (let pass = 1; pass <= count; pass++) {
      s = draw(s); expect(s.passes).toBe(pass); expect(s.score).toBe(-52)
      expect(canRecycle(s)).toBe(pass < count)
      if (pass < count) { s = draw(s); expect(s.passes).toBe(pass + 1); expect(s.score).toBe(-52) }
    }
    expect(draw(s)).toBe(s)
  })
  test('auto-home repeats until stable and undo only last single card', () => {
    const s = board(); s.tableau[0] = [card(2, 'hearts'), card(1, 'hearts')]; s.tableau[1] = [card(1, 'clubs')]
    const n = autoHome(s)
    expect(n.homes[2].length).toBe(2); expect(n.homes[0].length).toBe(1); expect(n.score).toBe(230)
    const u = undo(n); expect(u.homes.flat().length).toBe(2); expect(u.score).toBe(220); expect(undo(u)).toBe(u)
    expect(autoHome(n)).toBe(n)
  })
  test('undo restores elapsed decay, started state, stock pass and exact score', () => {
    const s = board({ timed: true }); s.stock = [card(2)]
    const n = tick(draw(s), 21)
    const u = undo(n); expect(u.seconds).toBe(0); expect(u.started).toBe(false); expect(u.score).toBe(200)
    expect(u.stock).toEqual(s.stock); expect(u.waste).toEqual([])
  })
  test('cheat completes unique full foundations and is undoable', () => {
    const s = deal(12); const n = cheatWin(s)
    expect(n.won).toBe(true); expect(n.homes.every(p => p.length === 13)).toBe(true)
    expect(new Set(n.homes.flat().map(c => c.id)).size).toBe(52)
    expect(n.stock.length + n.waste.length + n.tableau.flat().length).toBe(0)
    expect(undo(n).tableau).toEqual(s.tableau)
    expect(pile(n, 5).at(-1)!.suit).toBe('spades')
  })
})

describe('Solitaire XP cascade physics', () => {
  test('spade King first, cycling K to A and real signed launch velocities', () => {
    expect(CASCADE_SUITS).toEqual([3, 0, 1, 2])
    const negative = createCascade(585, () => 0)
    const positive = createCascade(585, () => .999)
    expect(negative.index).toBe(0)
    expect(negative.vx).toBe(-2)
    expect(positive.vx).toBeGreaterThan(5.9)
    expect(positive.vx).toBeLessThanOrEqual(6)
    const startY = negative.y
    const startVy = negative.vy
    stepCascade(negative, 585, 400, () => .5)
    expect(negative.vy).toBeCloseTo(startVy + .6)
    expect(negative.y).toBeCloseTo(startY + startVy + .6)
  })
  test('bottom restitution with jitter, side-only exits, and all 52 launches', () => {
    const s = createCascade(585, () => .5)
    s.y = 304
    s.vy = 10
    expect(stepCascade(s, 585, 400, () => .5)).toBe(true)
    expect(s.y).toBe(304)
    expect(s.vy).toBeCloseTo(-10.6 * .75 * .775)
    expect(s.index).toBe(0)
    for (let i = 0; i < 52; i++) {
      s.x = 586
      s.vx = 2
      stepCascade(s, 585, 400, () => .5)
      expect(s.index).toBe(i + 1)
    }
    expect(s.done).toBe(true)
    expect(stepCascade(s, 585, 400)).toBe(false)
  })
})
